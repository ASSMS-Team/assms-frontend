# assms-frontend

## Product design

The interactive [Sprint 2 wireframe prototype](docs/wireframes/sprint-2/index.html)
and its [acceptance-criteria mapping](docs/wireframes/sprint-2/README.md) are the
implementation reference for ASSMS-28. Open the prototype directly in a browser;
it uses sample data and does not call the ASSMS APIs.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

The ASSMS web client: a React 19 + Vite 8 single-page application, and the only user
interface in the system. It holds no data of its own — every screen is a view onto one of
the backing services, each of which owns its own database and is reached over HTTP.

```
                    ┌─→ Customer & Asset Service  :5037   customers, assets
assms-frontend  ────┼─→ Job Service               :5252   jobs
                    └─→ Reporting Service         :5238   reports (read-only)
```

One axios instance per **backing service**, not per resource — which is why
`assetService.ts` shares the customer instance while `jobService.ts` and
`reportService.ts` each have their own. Two processes mean two base URLs.

## Features

| Area | Screens |
|---|---|
| Customers | List, detail, create, edit, deactivate |
| Assets | Detail, create, edit, deactivate; listed under their customer |
| Jobs | Create — cascading customer → asset selection, validated by the Job Service |
| Reports | Jobs by status, with optional date bounds |

Deactivation is a status change, not a delete: a deactivated record still renders, greyed
by `StatusBadge`.

## Technology

| | |
|---|---|
| Framework | React 19, TypeScript 6 |
| Build | Vite 8 |
| Routing | React Router 7, `BrowserRouter` |
| HTTP | axios 1.19 |
| Styling | Bootstrap 5.3, plus `src/styles/app.css` for the app's own chrome |
| Linting | ESLint 10 with `typescript-eslint` and `eslint-plugin-react-hooks` |

No state-management library. Page-level `useState` has been enough so far; nothing is
shared widely enough to need a store.

## Project Structure

```
src/
  components/
    common/       StatusBadge.tsx
    forms/        CustomerForm.tsx, AssetForm.tsx, JobForm.tsx
    layout/       AppLayout.tsx          shared chrome: top bar + content column
  constants/      customer.ts, asset.ts, job.ts    as const arrays + label records
  pages/
    customers/    list, detail, create, edit
    assets/       detail, create, edit
    jobs/         CreateJobPage.tsx
    reports/      JobsByStatusPage.tsx
  routes/         AppRoutes.tsx          the route table
  services/       customerService.ts, assetService.ts, jobService.ts, reportService.ts
  types/          customer.ts, asset.ts, job.ts, report.ts
  utils/          formatDateTime.ts
  styles/         app.css
  vite-env.d.ts   typed VITE_* environment variables
```

`src/context/`, `src/hooks/`, `src/pages/auth/`, `src/pages/dispatch/`,
`src/pages/technicians/`, `src/pages/staff-accounts/`, `src/pages/work-records/` and
`tests/` exist as scaffolding and are empty.

Unions are derived from `as const` arrays with `(typeof X)[number]`, so the select options
and the type cannot drift apart. Each array is paired with a `_LABELS` record, because
`WARRANTY_CLAIM` is what the API sees and not what a person should read.

## Local Development

**Prerequisites:** Node 20+, and whichever backing services the screens you are working on
need. Each service repository has its own local-development instructions; all three depend
on the MySQL and Kafka containers owned by `assms-platform-infrastructure`.

```bash
npm ci
cp .env.example .env      # then fill in any blank values
npm run dev               # http://localhost:5173
```

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | `tsc -b` then `vite build` — type errors fail the build |
| `npm run lint` | ESLint over the repository |
| `npm run preview` | Serve the built `dist/` locally |

The app runs against whichever services are up. A service that is not running produces the
error state on the screens that need it rather than a blank page, so you can work on the
customer screens without the job or reporting services.

## Environment Variables

Vite exposes only variables prefixed `VITE_`, and they are **baked in at build time** — a
production build has to be rebuilt to point somewhere else, not reconfigured.

Every key is declared in `src/vite-env.d.ts` as a required `string`. That is deliberate:
typing them as optional would mean a null check at every call site, and a fallback URL
would quietly mask a missing `.env` by sending requests somewhere unexpected.

| Variable | Local value | Purpose |
|---|---|---|
| `VITE_CUSTOMER_API_URL` | `http://localhost:5037` | Customer & Asset Service |
| `VITE_JOB_API_URL` | `http://localhost:5252` | Job Service |
| `VITE_REPORTING_API_URL` | `http://localhost:5238` | Reporting Service |
| `VITE_DISPATCH_API_URL` | *(blank)* | Dispatch Service — not yet consumed |

Each port comes from that service's `launchSettings.json`. `.env` is gitignored;
`.env.example` is the tracked template.

Every service allows this app's origin explicitly through a named CORS policy reading
`Cors:AllowedOrigins`, which is set to `http://localhost:5173` in each service's
`appsettings.Development.json`. A new service needs that entry before the browser will talk
to it — `curl` will work when the browser does not.

## Routes

| Path | Page |
|---|---|
| `/` | Redirects to `/customers` |
| `/customers` | Customer list |
| `/customers/new` | Create customer |
| `/customers/:id` | Customer detail, with their assets |
| `/customers/:id/edit` | Edit customer |
| `/assets/new` | Create asset |
| `/assets/:id` | Asset detail |
| `/assets/:id/edit` | Edit asset |
| `/jobs/new` | Create job |
| `/reports/jobs-by-status` | Jobs by status report |

New pages get an entry in `src/routes/AppRoutes.tsx` rather than being reached from inside
another component. Every route renders inside `AppLayout` via its `Outlet`.

Because this is a client-side SPA on `BrowserRouter`, any host serving it must rewrite
unknown paths to `index.html`, or a refresh on `/reports/jobs-by-status` 404s.

## Testing

**There is no automated test suite yet.** `package.json` defines no `test` script and
`tests/unit` and `tests/e2e` are empty, which is why CI reports frontend tests and coverage
as pending.

What stands in for it today: `npm run build` type-checks the whole project through
`tsc -b`, and `npm run lint` enforces the React Hooks rules — `react-hooks/set-state-in-effect`
in particular has caught real cascading-render bugs in this codebase more than once. Both
are mandatory in CI.

Manual verification steps for each story live in that story's document under
[Documentation](#documentation), in its handover section.

## Deployment

Staging runs on an Azure Linux App Service (F1) provisioned by the Terraform in
`terraform/`, which owns only the frontend's App Service plan and Web App and reads the
shared resource group from the platform remote state.

Unlike the service repositories, this one **does** deploy from CI: `Frontend CI` calls the
reusable `staging-cd.yml` after Terraform validation and the build both pass on a `dev`
push, passing its exact `github.sha` so CI and CD stay on one commit. Authentication is
Azure OIDC; the workflow needs no application secret.

- [Staging infrastructure](docs/deployment/staging-infrastructure.md)
- [Staging CD](docs/deployment/staging-cd.md) — including the GitHub Actions variables it
  requires

Remember that `VITE_*` values are compiled in, so the staging build must be produced with
the staging API URLs.

## Documentation

Per-story notes live in `docs/`, and carry the reasoning behind a screen rather than
restating what the code does.

| Story | Document |
|---|---|
| US-03 — Create Job | [docs/api-integration/US-03-create-job.md](docs/api-integration/US-03-create-job.md) |
| Jobs by status report | [docs/api-integration/jobs-by-status-report.md](docs/api-integration/jobs-by-status-report.md) |
| Deployment | [staging infrastructure](docs/deployment/staging-infrastructure.md) · [staging CD](docs/deployment/staging-cd.md) |

Each has a **Decisions worth carrying forward** section; those are the conventions this app
is built on, and the short version is:

- One axios instance per backing service.
- Derive unions from `as const` arrays, and pair every array with a labels record.
- An optional query parameter is either present with a value or absent from the URL —
  never an empty string.
- Reset dependent state in the event that invalidates it, not in an effect.
- Guard every dependent fetch with a cancelled flag.
- Send the value and let the server validate, rather than duplicating the rule in the form.
- Distinguish "the server refused" from "the server is not there" in what the user is told.
- An empty result is a state, not an error.

The service-side counterparts are in each service repository, and the cross-repository
event contract is in `assms-platform-infrastructure/docs/kafka/event-contracts.md`.

## Continuous Integration

GitHub Actions runs on pull requests targeting `dev` or `main` and pushes to `dev` or `main`. CI validates Terraform formatting and both environment roots, installs locked npm dependencies, runs the configured lint script, and builds the React/Vite application. Mandatory failures fail CI, and no deployment occurs from this workflow. Frontend tests and coverage remain pending because the current `package.json` does not define a test script.
