# Scalability and free-tier cost analysis

> Free-tier limits change. The figures below are approximate and must be re-checked on the
> [Supabase](https://supabase.com/pricing) and [Vercel](https://vercel.com/pricing) pricing pages before submission.

## Free-tier usage (approximate)
| Service | Plan | Relevant limits (verify) | CloudStock footprint |
|---|---|---|---|
| Supabase | Free | ~500 MB database, ~50k monthly active users, limited egress, inactive projects may be paused | A few KB per product/transaction; far below limits at demo scale |
| Vercel | Hobby | Bandwidth and build-minute quotas; intended for non-commercial use | Static bundle (~150 KB gzipped JS); negligible |
| GitHub | Free | Unlimited public/private repositories | One repository |

Total monthly cost for this project: **$0** (no paid features enabled; Supabase reported a $0/month cost for project creation).
Free-tier caveats: Supabase pauses projects after a period of inactivity; free projects have no point-in-time recovery; Vercel Hobby is not for commercial use.

## Scalability analysis
- **Frontend**: static files on a CDN scale horizontally with no server to manage.
- **API**: Supabase's PostgREST layer is stateless; capacity is bounded by the plan's compute and connection limits.
- **Database**: the main constraint. Indexes cover foreign keys and common filters. The ledger table grows without bound and is the
  first candidate for partitioning (by month) or archiving.
- **Concurrency**: `SELECT ... FOR UPDATE` serializes writers per product (not globally), so different products update in parallel.
- **Current client-side limits**: product list loads up to 1000 rows and filters/sorts in the browser; beyond that move to server-side
  pagination (`range()`), `ilike`/full-text search and a trigram index.
- **Dashboard**: aggregates are computed in SQL on each load; at larger scale use a materialized view or cached counters.
- **Scaling path**: upgrade Supabase compute, add a read replica, connection pooling (Supavisor), and move heavy reports to scheduled jobs.

## Trade-offs and risks
- Direct browser-to-database access removes a server tier but makes RLS correctness critical (tested in `tests/sql/`).
- No custom backend means business rules live in SQL functions; this is reliable but less portable.
- A single region (Mumbai) is simple and low-latency for India but gives no regional failover.
