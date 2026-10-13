# Viva questions and answers

Marks: **Design 2 · Implementation 4 · Evaluation 2 · Viva 2**. Questions are grouped by the rubric area they support.

## Design (2 marks)
**Q1. Why Supabase + Vercel instead of one server on a VM?**
Both are PaaS: no OS patching, built-in HTTPS/CDN, managed Postgres and auth, and a free tier. The trade-off is less control and vendor coupling.

**Q2. Draw the architecture and explain the request flow.**
Browser loads static React files from Vercel's CDN, then calls Supabase's REST API (PostgREST) over HTTPS with a JWT. PostgreSQL applies RLS and returns data. See `docs/architecture.md`.

**Q3. Why is the schema normalized?**
Categories are separate from products to avoid repeated text and update anomalies; transactions reference products and users by foreign key.

**Q4. Why store `quantity_before` and `quantity_after` on every transaction?**
It makes the ledger auditable and lets us verify `products.quantity` against history. A CHECK constraint enforces the arithmetic.

**Q5. Which cloud service model is each component?**
Vercel and Supabase are PaaS; GitHub and the finished web app are SaaS; the underlying hyperscaler hardware is IaaS that we do not manage.

## Implementation (4 marks)
**Q6. How do you stop two users overselling the last unit?**
`record_stock_movement` runs in one transaction and locks the row with `SELECT ... FOR UPDATE`. The second request waits, sees the updated quantity and fails with "Insufficient stock". The `quantity >= 0` CHECK is a second safety net.

**Q7. Why can't the client update `quantity` directly?**
Column-level privileges allow updating only descriptive columns, and there is no INSERT policy on `stock_transactions`. All stock changes go through the audited function.

**Q8. How are administrator and employee roles enforced?**
The role lives in `profiles`. RLS policies call `is_admin()`; write operations on products/categories require it. The UI hides buttons, but the database is the real gatekeeper.

**Q9. Why is `is_admin()` SECURITY DEFINER?**
Policies on `profiles` that query `profiles` would recurse. A definer function with `search_path = ''` reads the table safely without triggering recursion.

**Q10. How does a new user get a profile and role?**
A trigger on `auth.users` inserts a `profiles` row; the first user becomes admin, the rest employees.

**Q11. What validation exists and where?**
UI validation for friendly feedback, plus database CHECK constraints, unique SKU and function-level checks so invalid data cannot get in through any client.

**Q12. How does the dashboard get its numbers?**
`get_dashboard_summary()` aggregates in SQL (SECURITY INVOKER so RLS still applies); the low-stock list and recent transactions use normal queries.

## Evaluation (2 marks)
**Q13. How did you test?**
Unit tests for validation/logic, a production build, SQL permission tests covering employee/admin/anonymous scenarios, and a manual UI checklist (`docs/testing.md`).

**Q14. What would a concurrency test look like?**
150 parallel stock-outs of 1 unit on a product with 100 units: expect exactly 100 successes and final quantity 0 (see `docs/performance.md`).

**Q15. What are the performance and scaling limits?**
The product list is loaded client-side up to 1000 rows; move to server-side pagination and search beyond that. The ledger grows indefinitely and would need partitioning/archiving.

**Q16. What does it cost?**
$0 on free tiers; limits and caveats (project pausing, no PITR, Hobby non-commercial) are in `docs/scalability-and-cost.md`.

## Viva (2 marks): general cloud questions
**Q17. What is RLS?** Row Level Security: PostgreSQL filters rows per policy based on the authenticated user, so security does not depend on application code.
**Q18. Why is the publishable key safe in the browser?** It only identifies the project and maps to the `anon` role; what it can do is limited by grants and RLS. The service-role key bypasses RLS and must never be exposed.
**Q19. What is a CDN and why does it help?** A network of edge servers caching static assets near users, reducing latency and origin load.
**Q20. What is JWT authentication?** The server issues a signed token containing the user id and role; each API call presents it and the server verifies the signature.
**Q21. Vertical vs horizontal scaling?** Vertical = bigger machine; horizontal = more machines. Static hosting scales horizontally; the database scales vertically first, then with replicas.
**Q22. What is vendor lock-in and how is it reduced here?** Dependence on a provider's proprietary features. Mitigated by using standard PostgreSQL and SQL migrations that can run on any Postgres host.
**Q23. How would you add backups/DR?** Scheduled `pg_dump` exports, paid-tier backups/PITR, and a documented restore test.
