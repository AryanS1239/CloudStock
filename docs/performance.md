# Performance measurement methodology

No performance numbers are claimed in this repository. Use the methods below and record your own results.

## Metrics
| Metric | Tool | Target (suggested) |
|---|---|---|
| Page load (LCP, TTI) | Chrome DevTools Lighthouse (mobile + desktop), WebPageTest | LCP < 2.5 s |
| API latency (p50 / p95) | Chrome Network tab, or a k6 / autocannon script against the Supabase REST endpoint | p95 < 500 ms |
| Stock movement round trip | Time the `record_stock_movement` RPC (Network tab, "Waiting for server response") | < 300 ms |
| Concurrency correctness | Fire N parallel stock-outs for the same product with a script | Final quantity never negative; ledger matches |
| Database query cost | `EXPLAIN (ANALYZE, BUFFERS)` on dashboard and list queries; Supabase performance advisor | Index scans on large tables |

## Procedure
1. Use the production URL, a fresh incognito window and a cold cache for first-load tests; repeat 5 times and report median.
2. Run Lighthouse 3 times per device profile and report the median.
3. For API latency, send 100 sequential and 100 concurrent (10 at a time) requests; record p50, p95 and error rate.
4. For concurrency correctness, seed a product with 100 units, then run 150 parallel `record_stock_movement(..., 'out', 1)` calls
   with a valid user JWT. Expect exactly 100 successes, 50 "Insufficient stock" errors and final quantity 0.
5. Seed 10k+ products/transactions in a branch or test project and repeat the list and dashboard timings to see scaling behaviour.
6. Record environment: region, device, network, date, commit SHA.

## Results table (template)
| Test | Run | p50 | p95 | Errors | Notes |
|---|---|---|---|---|---|
| Lighthouse mobile | | | | | |
| List products API | | | | | |
| Stock movement RPC | | | | | |
| 150 concurrent stock-outs | | | | | |
