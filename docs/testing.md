# Testing

## How to run
| Test | Command | What it covers |
|---|---|---|
| Unit tests | `npm test` | Validation rules, stock-status logic, error mapping, currency formatting |
| Production build | `npm run build` | Compiles and bundles; fails on syntax/import errors |
| Database permission tests | Run `tests/sql/permissions_test.sql` in the Supabase SQL editor | RLS, column privileges, stock RPC, role escalation, anon access. Rolls back; expect all `PASS` |
| Manual UI checklist | Below | End-to-end behaviour in the deployed app |

## Manual UI checklist
1. Register the first account: it should become **Administrator** (sidebar shows "Administrator", Users page visible).
2. Register a second account (private window): it should be an **Employee** (no Users page; no Add/Edit/Delete on Products).
3. Admin: create a product with opening stock; edit it; search, sort and filter; delete it (confirmation appears).
4. Stock movements: stock-in 5 units; stock-out 2 units; confirm quantity and history update.
5. Stock-out more than available: the form blocks it, and a direct API/RPC call is rejected by the database.
6. Set a product's low-stock threshold above its quantity: dashboard "Needs restocking" and the status badge update.
7. As employee, open `/users` directly: "Administrators only" message.
8. Sign out and open `/products`: redirected to `/login`.

## Results recorded during the build (what was actually verified)
| Check | Result |
|---|---|
| `npm test` (10 unit tests) | Passed |
| `npm run build` (local and Vercel cloud build) | Passed; Vercel deployment reached READY |
| DB permission tests (employee/admin/anon scenarios, 15 assertions) | All passed on the live Supabase project; transaction rolled back, no test data persisted |
| Seed data ledger reconciliation | 12 products, 24 transactions, 0 mismatches between `quantity` and the transaction ledger |

Not verified in this build: browser end-to-end flows against the deployed URL, email confirmation delivery, concurrency under load.

## Results template (fill in for your submission)
| ID | Test case | Steps | Expected | Actual | Pass/Fail | Date | Tester |
|---|---|---|---|---|---|---|---|
| T1 | First user is admin | Register first account | Role = admin | | | | |
| T2 | Employee cannot write products | Employee tries Add product | Control hidden; API rejects | | | | |
| T3 | Create product | Admin adds product | Appears in list | | | | |
| T4 | Stock-in | +5 units | Quantity +5, ledger row | | | | |
| T5 | Stock-out | -2 units | Quantity -2, ledger row | | | | |
| T6 | Insufficient stock | Stock-out > available | Rejected, quantity unchanged | | | | |
| T7 | Low-stock alert | Raise threshold | Badge and dashboard update | | | | |
| T8 | Unauthenticated access | Open `/products` signed out | Redirect to login | | | | |
