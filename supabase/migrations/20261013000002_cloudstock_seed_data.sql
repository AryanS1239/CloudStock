-- Sample data (safe to re-run: skipped if products already exist)
do $$
begin
  if exists (select 1 from public.products) then
    return;
  end if;

  insert into public.categories (name) values
    ('Electronics'), ('Office Supplies'), ('Furniture'), ('Packaging'), ('Safety')
  on conflict (name) do nothing;

  with seed(sku, name, description, cat, price, qty, thr, outq, ord) as (values
    ('ELEC-001','Wireless Mouse','2.4 GHz optical wireless mouse','Electronics',799,45,10,5,1),
    ('ELEC-002','Mechanical Keyboard','Tenkeyless mechanical keyboard, blue switches','Electronics',3499,8,10,7,2),
    ('ELEC-003','USB-C Hub 7-in-1','HDMI, USB 3.0, SD and PD pass-through','Electronics',1899,22,8,3,3),
    ('ELEC-004','27-inch Monitor','27" IPS Full HD monitor','Electronics',14999,4,5,2,4),
    ('OFF-001','A4 Paper Ream (500 sheets)','80 GSM copier paper','Office Supplies',349,120,40,30,5),
    ('OFF-002','Ballpoint Pens (Box of 50)','Blue ink, 0.7 mm','Office Supplies',250,60,20,15,6),
    ('OFF-003','Heavy Duty Stapler','Staples up to 100 sheets','Office Supplies',450,0,5,10,7),
    ('FURN-001','Ergonomic Office Chair','Adjustable lumbar support, mesh back','Furniture',8999,12,4,3,8),
    ('FURN-002','Standing Desk','Electric height-adjustable desk','Furniture',18999,3,4,2,9),
    ('PACK-001','Cardboard Box - Medium (Pack of 25)','Corrugated shipping boxes','Packaging',600,85,30,10,10),
    ('PACK-002','Packing Tape Roll','48 mm x 100 m clear tape','Packaging',120,18,25,12,11),
    ('SAFE-001','First Aid Kit','Workplace first aid kit, 100 pieces','Safety',950,9,5,1,12)
  ),
  ins as (
    insert into public.products (sku, name, description, category_id, unit_price, quantity, low_stock_threshold)
    select s.sku, s.name, s.description, c.id, s.price, s.qty, s.thr
    from seed s join public.categories c on c.name = s.cat
    returning id, sku
  )
  insert into public.stock_transactions
    (product_id, type, quantity, quantity_before, quantity_after, note, created_at)
  select i.id, 'in', s.qty + s.outq, 0, s.qty + s.outq, 'Initial stock received',
         now() - interval '12 days' + (s.ord || ' hours')::interval
  from ins i join seed s on s.sku = i.sku
  union all
  select i.id, 'out', s.outq, s.qty + s.outq, s.qty, 'Order fulfilment',
         now() - ((s.ord % 6) + 1 || ' days')::interval - (s.ord || ' hours')::interval
  from ins i join seed s on s.sku = i.sku;
end $$;
