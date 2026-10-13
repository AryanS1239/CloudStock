-- CloudStock database permission tests.
-- Run in the Supabase SQL editor (or via the MCP execute_sql tool) as the postgres role.
-- Everything runs inside one DO block and is ROLLED BACK at the end: the block raises an
-- exception carrying the results, so no test users or data are persisted.
-- Expect every line to start with PASS.
do $$
declare
  u1 uuid := gen_random_uuid();  -- first profile in an empty DB becomes admin
  u2 uuid := gen_random_uuid();
  pid uuid;
  log text := '';
  q int;
begin
  -- NOTE: the first-user-is-admin rule needs an empty profiles table. If real users exist,
  -- promote u1 manually: update public.profiles set role='admin' where id = u1;
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (u1, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','t-admin@test.local','{"full_name":"T Admin"}', now(), now()),
         (u2, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','t-emp@test.local','{"full_name":"T Emp"}', now(), now());
  update public.profiles set role = 'admin' where id = u1;
  update public.profiles set role = 'employee' where id = u2;

  select id, quantity into pid, q from public.products order by sku limit 1;

  -- employee
  perform set_config('request.jwt.claims', json_build_object('sub',u2,'role','authenticated')::text, true);
  set local role authenticated;

  begin insert into public.products(sku,name) values ('X-1','x'); log := log || E'FAIL emp insert product allowed\n';
  exception when others then log := log || 'PASS emp insert product blocked: ' || sqlerrm || E'\n'; end;

  begin perform public.record_stock_movement(pid,'out',q+1000,'t'); log := log || E'FAIL oversell allowed\n';
  exception when others then log := log || 'PASS oversell blocked: ' || sqlerrm || E'\n'; end;

  begin perform public.record_stock_movement(pid,'in',5,'t'); perform public.record_stock_movement(pid,'out',2,'t');
    log := log || (case when (select quantity from public.products where id=pid) = q+3 then 'PASS ' else 'FAIL ' end) || E'stock in/out arithmetic\n';
  exception when others then log := log || 'FAIL emp stock ops: ' || sqlerrm || E'\n'; end;

  begin perform public.record_stock_movement(pid,'in',0,'t'); log := log || E'FAIL zero qty allowed\n';
  exception when others then log := log || 'PASS zero qty blocked: ' || sqlerrm || E'\n'; end;

  begin update public.products set quantity = 999 where id = pid; log := log || E'FAIL direct quantity update allowed\n';
  exception when others then log := log || 'PASS direct quantity update blocked: ' || sqlerrm || E'\n'; end;

  begin insert into public.stock_transactions(product_id,type,quantity,quantity_before,quantity_after) values (pid,'in',1,0,1); log := log || E'FAIL direct tx insert allowed\n';
  exception when others then log := log || 'PASS direct tx insert blocked: ' || sqlerrm || E'\n'; end;

  begin update public.profiles set role='admin' where id=u2; log := log || E'FAIL self role escalation allowed\n';
  exception when others then log := log || 'PASS self role escalation blocked: ' || sqlerrm || E'\n'; end;

  begin perform public.set_user_role(u2,'admin'); log := log || E'FAIL set_user_role by employee\n';
  exception when others then log := log || 'PASS set_user_role by employee blocked: ' || sqlerrm || E'\n'; end;

  begin delete from public.products where id=pid; get diagnostics q = row_count;
    log := log || (case when q=0 then 'PASS ' else 'FAIL ' end) || E'emp delete product affects 0 rows\n';
  exception when others then log := log || 'PASS emp delete blocked: ' || sqlerrm || E'\n'; end;
  reset role;

  -- admin
  perform set_config('request.jwt.claims', json_build_object('sub',u1,'role','authenticated')::text, true);
  set local role authenticated;
  begin insert into public.products(sku,name,unit_price,low_stock_threshold) values ('TEST-1','Test item',10,1); log := log || E'PASS admin insert product\n';
  exception when others then log := log || 'FAIL admin insert: ' || sqlerrm || E'\n'; end;
  begin delete from public.products where sku='TEST-1'; log := log || E'PASS admin delete product\n';
  exception when others then log := log || 'FAIL admin delete: ' || sqlerrm || E'\n'; end;
  begin perform public.set_user_role(u2,'admin'); perform public.set_user_role(u2,'employee'); log := log || E'PASS admin promote/demote\n';
  exception when others then log := log || 'FAIL admin role change: ' || sqlerrm || E'\n'; end;
  reset role;

  -- anonymous
  set local role anon;
  begin perform 1 from public.products limit 1; log := log || E'FAIL anon read products\n';
  exception when others then log := log || 'PASS anon read blocked: ' || sqlerrm || E'\n'; end;
  reset role;

  raise exception E'TEST RESULTS (rolled back)\n%', log;
end $$;
