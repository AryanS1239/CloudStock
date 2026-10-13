# Security

## Secrets handling
- The browser bundle contains only `VITE_SUPABASE_URL` and the **publishable** key. Both are designed to be public.
- No `service_role` key, database password or JWT secret is stored in the repository, the browser bundle or Vercel.
- `.env`, `.env.*` are git-ignored; `.env.example` contains placeholders only.

## Defence in depth
1. **Row Level Security** is enabled on every table. Policies: authenticated read; admin-only write for products and
   categories; no client write policy at all on `stock_transactions`.
2. **Column-level grants** limit writable columns (`products.quantity` is not writable by clients; a profile owner may only
   update `full_name`).
3. **SECURITY DEFINER functions** (`record_stock_movement`, `set_user_role`) run with `search_path = ''`, check
   `auth.uid()` and the caller's role, and validate inputs. `EXECUTE` is revoked from `anon` and `public`.
4. **Anonymous role** has no table privileges: unauthenticated requests are rejected by PostgreSQL.
5. **Input validation** exists in the UI (friendly messages) *and* in the database (CHECK constraints, function checks).
6. **Privilege-escalation guard**: users cannot edit their own role; the last administrator cannot be demoted.

## Known limitations / accepted advisor notices
- Supabase's security advisor reports `authenticated_security_definer_function_executable` (WARN) for `is_admin`,
  `record_stock_movement` and `set_user_role`. This is intentional: they are RPCs that must be callable by signed-in
  users and each performs its own authorization check.
- Supabase Auth defaults apply (email confirmation, rate limits). Configure the Site URL / redirect URLs and
  consider enabling leaked-password protection in the Supabase dashboard (not settable through the connector used here).
- Any signed-in user can read all profiles (name, email, role) so history can show who acted; acceptable for an internal tool.
