-- Staff can see colleagues' names/roles so transaction history shows who acted.
-- Writes remain restricted (column grant: full_name only, own row; roles via set_user_role).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
