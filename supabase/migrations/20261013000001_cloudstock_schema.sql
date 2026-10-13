-- CloudStock core schema ----------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'employee' check (role in ('admin','employee')),
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique check (char_length(btrim(sku)) between 1 and 40),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  category_id uuid references public.categories(id) on delete set null,
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  type text not null check (type in ('in','out')),
  quantity integer not null check (quantity > 0),
  quantity_before integer not null check (quantity_before >= 0),
  quantity_after integer not null check (quantity_after >= 0),
  note text check (note is null or char_length(note) <= 500),
  performed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (type = 'in'  and quantity_after = quantity_before + quantity) or
    (type = 'out' and quantity_after = quantity_before - quantity)
  )
);

-- Indexes (foreign keys + common query paths)
create index products_category_idx on public.products(category_id);
create index products_name_idx on public.products(lower(name));
create index products_low_stock_idx on public.products(quantity, low_stock_threshold);
create index stock_tx_product_idx on public.stock_transactions(product_id, created_at desc);
create index stock_tx_created_idx on public.stock_transactions(created_at desc);
create index stock_tx_user_idx on public.stock_transactions(performed_by);

-- Helper: role check (SECURITY DEFINER avoids RLS recursion on profiles) -----
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

-- updated_at trigger ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

-- Auto-create profile on signup; the very first user becomes admin ------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  assigned_role text;
begin
  if exists (select 1 from public.profiles) then
    assigned_role := 'employee';
  else
    assigned_role := 'admin';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data->>'full_name','')), ''),
    assigned_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Safe stock movement: row lock + validation + audit row in one transaction ---
create or replace function public.record_stock_movement(
  p_product_id uuid,
  p_type text,
  p_quantity integer,
  p_note text default null
)
returns public.stock_transactions
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_before integer;
  v_after integer;
  v_tx public.stock_transactions;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_type not in ('in','out') then
    raise exception 'Invalid movement type: %', p_type using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be a positive integer' using errcode = '22023';
  end if;

  select quantity into v_before
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;

  if p_type = 'out' then
    if p_quantity > v_before then
      raise exception 'Insufficient stock: requested %, available %', p_quantity, v_before
        using errcode = '23514';
    end if;
    v_after := v_before - p_quantity;
  else
    v_after := v_before + p_quantity;
  end if;

  update public.products set quantity = v_after where id = p_product_id;

  insert into public.stock_transactions
    (product_id, type, quantity, quantity_before, quantity_after, note, performed_by)
  values
    (p_product_id, p_type, p_quantity, v_before, v_after, nullif(btrim(p_note), ''), v_uid)
  returning * into v_tx;

  return v_tx;
end;
$$;

-- Admin-only role management (cannot remove the last admin) -------------------
create or replace function public.set_user_role(p_user_id uuid, p_role text)
returns public.profiles
language plpgsql security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change roles' using errcode = '42501';
  end if;
  if p_role not in ('admin','employee') then
    raise exception 'Invalid role' using errcode = '22023';
  end if;
  if p_role = 'employee'
     and (select role from public.profiles where id = p_user_id) = 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'Cannot demote the last administrator' using errcode = '23514';
  end if;

  update public.profiles set role = p_role where id = p_user_id returning * into v_profile;
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
  return v_profile;
end;
$$;

-- Dashboard aggregates (SECURITY INVOKER: RLS still applies) ------------------
create or replace function public.get_dashboard_summary()
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'total_products', (select count(*) from public.products),
    'total_units', (select coalesce(sum(quantity),0) from public.products),
    'inventory_value', (select coalesce(sum(quantity * unit_price),0) from public.products),
    'low_stock_count', (select count(*) from public.products where quantity <= low_stock_threshold),
    'category_distribution', (
      select coalesce(jsonb_agg(row_to_json(c)), '[]'::jsonb) from (
        select coalesce(cat.name,'Uncategorized') as category,
               count(p.id)::int as products,
               coalesce(sum(p.quantity),0)::int as units
        from public.products p
        left join public.categories cat on cat.id = p.category_id
        group by cat.name
        order by units desc
      ) c
    )
  );
$$;

-- Row Level Security ----------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.stock_transactions enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- categories
create policy categories_select on public.categories for select to authenticated using (true);
create policy categories_insert on public.categories for insert to authenticated with check (public.is_admin());
create policy categories_update on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy categories_delete on public.categories for delete to authenticated using (public.is_admin());

-- products (read: any signed-in user; write: admin only; quantity only via RPC)
create policy products_select on public.products for select to authenticated using (true);
create policy products_insert on public.products for insert to authenticated with check (public.is_admin());
create policy products_update on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy products_delete on public.products for delete to authenticated using (public.is_admin());

-- stock_transactions (read-only for clients; rows created by record_stock_movement)
create policy stock_tx_select on public.stock_transactions for select to authenticated using (true);

-- Privileges: lock everything down, then grant the minimum -------------------
revoke all on public.profiles, public.categories, public.products, public.stock_transactions from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

grant select on public.categories to authenticated;
grant insert (name), update (name), delete on public.categories to authenticated;

grant select on public.products to authenticated;
grant insert (sku, name, description, category_id, unit_price, low_stock_threshold, created_by) on public.products to authenticated;
grant update (sku, name, description, category_id, unit_price, low_stock_threshold) on public.products to authenticated;
grant delete on public.products to authenticated;

grant select on public.stock_transactions to authenticated;

-- Functions: no anonymous execution
revoke all on function public.is_admin() from public, anon;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.record_stock_movement(uuid, text, integer, text) from public, anon;
revoke all on function public.set_user_role(uuid, text) from public, anon;
revoke all on function public.get_dashboard_summary() from public, anon;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.record_stock_movement(uuid, text, integer, text) to authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;
grant execute on function public.get_dashboard_summary() to authenticated;
