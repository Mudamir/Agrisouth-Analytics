# Agrisouth Analytics

Internal analytics and operations console for **shipping and pack-level data** (bananas, pineapples). The app surfaces dashboards, tabular views, P&L tooling, document generation (including invoices), and **role- and user-scoped permissions** backed by Supabase.

---

## What you get

| Area | Description |
|------|-------------|
| **Dashboard** | KPIs, pack stats, supplier views, filters by year/week/destination/POL, etc. |
| **Analysis & data** | Deeper views over the same dataset with export-oriented workflows where applicable. |
| **P&L** | Purchase, sales, cartons, profit sections and price management aligned to business rules in-app. |
| **Generate** | Hub for document generation; **invoice generation** with PDF output (`@react-pdf/renderer`). |
| **Admin** | User management, configuration, and data logs for operators with the right permissions. |
| **Auth** | Supabase Auth with protected routes; permissions resolved via RPC (e.g. `user_has_permission`). |

Routes: `/` (app shell), `/login`, `/generate`. The main app uses a sidebar-driven “page” state inside `Index` (dashboard, analysis, data, pnl, admin sections, invoice flow).

---

## Stack

- **UI:** React 18, TypeScript, Vite 5, Tailwind CSS, shadcn/ui (Radix), Recharts  
- **Data:** TanStack Query, Supabase JS client  
- **Routing:** React Router v6  
- **Hosting (typical):** Vercel — see `vercel.json` (SPA rewrites, security headers, asset caching)

---

## Prerequisites

- **Node.js** 18+ or 20+ (LTS recommended)  
- **npm** (lockfile: `package-lock.json`)  
- A **Supabase** project with the schema, RLS policies, and RPCs this app expects (migrations and notes live under `scripts/migrations/`).

---

## Quick start

```bash
git clone <repository-url>
cd Agrisouth-Analytics
npm install
```

Create **`.env.local`** in the project root (gitignored):

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Start the dev server (default in `vite.config.ts`: **port 8080**, all interfaces):

```bash
npm run dev
```

Open the URL Vite prints (typically `http://localhost:8080`).

---

## Environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `VITE_SUPABASE_URL` | Yes in production | Must be a valid `http(s)://` URL; validated in `src/lib/env.ts`. |
| `VITE_SUPABASE_ANON_KEY` | Yes in production | Public anon key; **never** put service-role keys in Vite-prefixed client env vars. |

Production builds **fail fast** if these are missing (`env.ts`). In development, the Supabase client may be `null` with a console warning so you can work on non-API UI with care.

Configure the same variables in **Vercel** (or your host) for preview/production deployments.

---

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run build:dev` | Build with Vite `development` mode |
| `npm run preview` | Serve production build locally |
| `npm run lint` | ESLint |

**Data / ops helpers** (Node scripts; many expect `.env` / Supabase credentials and local CSV or DB state — read each script before running):

`import:csv`, `import:csv:2024`, `import:csv:2025`, `merge:invoice`, `upsert:invoice`, `upsert:invoice:optimized`, `verify:invoice`, `test:rls`, `fix:pineapples`, `init:prices`, `analyze:containers` (+ `:export`, `:json`), `validate:loadcount` (+ `:export`, `:json`), `check:console`.

Production builds use Terser with **`console.log` stripping**; see `vite.config.ts` and `prebuild` note in `package.json`.

---

## Repository layout (high level)

```
src/
  components/     # UI primitives, dashboard, admin, invoice
  contexts/       # Auth provider
  hooks/          # Data and domain hooks
  lib/            # Supabase client, env, permissions, utilities
  pages/          # Route-level pages
docs/             # Product and workflow guides
scripts/
  migrations/     # SQL migrations (run via Supabase SQL editor or CLI)
  queries/        # Saved / documented SQL
```

---

## Documentation

- [Invoice generator guide](docs/INVOICE-GENERATOR-GUIDE.md) — invoice workflow and behavior.  
- [Container locking guide](docs/CONTAINER-LOCKING-GUIDE.md) — two-step data entry (lock container → pack lines) for accuracy.  
- [Database migrations](scripts/migrations/README.md) — applying SQL changes safely.  
- [Queries folder](scripts/queries/README.md) — query documentation conventions.

---

## Deployment (Vercel)

- **Build:** `npm run build`  
- **Output:** `dist`  
- **SPA:** `vercel.json` rewrites all paths to `index.html`.  
- Set `VITE_SUPABASE_*` in the project’s Environment Variables for each environment.

---

## Security notes

- Treat the **anon key** as public; enforce access with **RLS** and Supabase Auth.  
- Restrict admin and sensitive pages using the permission system (`src/lib/permissions.ts` and DB RPCs).  
- Do not commit `.env`, `.env.local`, or service-role keys.

---

## Troubleshooting

| Symptom | Things to check |
|---------|-------------------|
| Blank / errors after deploy | `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set on the host; URL includes `https://`. |
| Auth or data always empty locally | `.env.local` present and dev server restarted after edits. |
| Permission denied in UI | User role, `user_permissions` / role permissions, and migrations for `page.*` keys (see `scripts/migrations/README.md`). |

---

## License

No `LICENSE` file is included in this repository; treat usage and distribution according to your organization’s policy.
