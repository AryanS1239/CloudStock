# CloudStock: Cloud-Based Inventory Management System

React + Vite + Tailwind frontend, Supabase (PostgreSQL + Auth) backend, hosted on Vercel. Free-tier services only.

**Live app:** https://cloudstock-inventory.vercel.app (see "Deployment notes" below)

## Features
- Dashboard: products, units in stock, inventory value, low-stock count, category distribution, recent transactions
- Products: create, read, update, delete, search, sort, filter (category and stock status)
- Stock in / out with confirmation, full history and accurate quantities (atomic database function)
- Per-product low-stock thresholds with visual alerts
- Registration, login, logout; **administrator** and **employee** roles
- Authorization enforced by Supabase Row Level Security, column grants and SECURITY DEFINER functions
- Responsive UI with loading states, error handling, input validation and confirmation dialogs

## Project layout
```
src/            React app (pages, components, auth context, lib/)
supabase/migrations/   SQL: schema + RLS, seed data, policy tweak
tests/sql/      Database permission tests (rolled back after running)
docs/           Architecture, cloud concepts, security, testing, performance, scalability, viva
.env.example    Placeholders only
```

## Setup (local)
1. `npm install`
2. Create a Supabase project (free). In the SQL editor, run the files in `supabase/migrations/` in order.
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
   (Project Settings > API). **Use only the publishable/anon key. Never use the service_role key in this app.**
4. `npm run dev`, then register: the **first** account becomes the administrator.
5. Supabase dashboard > Authentication > URL Configuration: add your local and Vercel URLs (Site URL and redirect URLs).
   For quick testing you can turn off "Confirm email"; keep it on for real use.

## Deployment (Vercel + GitHub)
1. Push this repository to GitHub (`cloudstock-inventory`).
2. In Vercel: Add New Project, import the repository (framework preset: Vite).
3. Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (Production, Preview, Development).
4. Deploy. Every push to `main` redeploys automatically. `vercel.json` rewrites all routes to `index.html` for client-side routing.

## Deployment notes for this build
- Supabase project `cloudstock-inventory` (region ap-south-1) was created with the migrations applied and seed data loaded.
- The Vercel project was deployed from source files via the Vercel API (not from a Git push), and Vercel Authentication was disabled so the
  URL is publicly reachable. Connect the project to your GitHub repository to enable push-to-deploy.

## Scripts
`npm run dev` · `npm run build` · `npm run preview` · `npm test`

## Documentation
- [Architecture and database design](docs/architecture.md)
- [IaaS / PaaS / SaaS, networking, storage, authentication](docs/cloud-concepts.md)
- [Security](docs/security.md)
- [Testing and results template](docs/testing.md)
- [Performance methodology](docs/performance.md)
- [Scalability and free-tier cost](docs/scalability-and-cost.md)
- [Viva Q&A mapped to the rubric](docs/viva.md)
