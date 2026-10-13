# IaaS, PaaS and SaaS in CloudStock

| Model | You manage | Provider manages | In this project |
|---|---|---|---|
| **IaaS** | OS, runtime, apps, data | Virtual machines, storage, networking hardware | Not used directly. Underneath, Vercel and Supabase run on hyperscaler infrastructure (e.g. AWS). A self-managed alternative would be an EC2 VM running Node and PostgreSQL. |
| **PaaS** | Application code and data | Runtime, scaling, patching, OS, hosting | **Vercel** (build + hosting of the React app) and **Supabase** (managed PostgreSQL, Auth, REST API) |
| **SaaS** | Only configuration and data | Everything, delivered as a finished app | **GitHub** (source hosting) and **CloudStock itself**, which end users consume through a browser |

## Cloud networking

- All traffic is HTTPS/TLS. The browser fetches static assets from Vercel's CDN edge, and calls
  `https://<project-ref>.supabase.co` for data and auth.
- Supabase exposes the database only through its API gateway; the Postgres port is not used by the app.
- Cross-origin calls from the Vercel domain to Supabase are permitted by Supabase's CORS configuration.
- Latency note: the database is in ap-south-1 (Mumbai) while Vercel's default function region is iad1; since the app
  is static and calls Supabase from the browser, this region does not sit in the data path.

## Cloud storage

- **Relational storage**: Supabase PostgreSQL (managed volumes, automated platform backups on paid tiers; the free tier
  has no point-in-time recovery, so export data periodically).
- **Static asset storage**: Vercel stores build output and serves it via CDN.
- **Browser storage**: the Supabase client keeps the session (JWT + refresh token) in `localStorage`.
- Supabase Storage (object storage) is not used because the app has no file uploads.

## Authentication

- Supabase Auth (GoTrue): email + password, bcrypt-hashed server-side, JWT access tokens with refresh tokens.
- A trigger creates a `profiles` row for each new `auth.users` row and assigns the role.
- The frontend only decides what to *show*; PostgreSQL decides what is *allowed*.
