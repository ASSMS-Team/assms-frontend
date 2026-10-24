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
                    ├─→ Dispatch Service          :5055   technicians, assignments
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
| Technicians | Create — Dispatcher-owned records with skills and coverage region |
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
| `npm run test` | Run Vitest unit & component test suite |
| `npm run test:coverage` | Run Vitest with V8 code coverage |
| `npm run test:load` | Run automated JMeter smoke performance test suite |
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
| `VITE_DISPATCH_API_URL` | `http://localhost:5055` | Dispatch Service |

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
| `/technicians/new` | Create technician; Dispatcher and Manager only |
| `/reports/jobs-by-status` | Jobs by status report |

New pages get an entry in `src/routes/AppRoutes.tsx` rather than being reached from inside
another component. Every route renders inside `AppLayout` via its `Outlet`.

Because this is a client-side SPA on `BrowserRouter`, any host serving it must rewrite
unknown paths to `index.html`, or a refresh on `/reports/jobs-by-status` 404s.

## Testing

Automated testing is divided into two distinct layers:

1. **Unit & Component Tests**: React component tests and route authorization tests powered by **Vitest** and **React Testing Library** (`npm run test`, `npm run test:coverage`). These validate role-based access control, navigation guards, and form validation states.
2. **Build & Lint Verification**: `npm run build` runs `tsc -b` for strict type checking across all screens, and `npm run lint` enforces ESLint rules (including `react-hooks/set-state-in-effect`).
3. **Load & Performance Testing**: Automated JMeter and Python performance test suite (`npm run test:load`), detailed below.

Manual verification steps for each story live in that story's document under [Documentation](#documentation).

## Load & Performance Testing

> **Implemented by:** **Kapurubandara S.K.** (Student ID: **IT24103571**)  
> Full technical setup and configuration options: [tests/load/README.md](tests/load/README.md).

Load and performance testing checks how fast and reliable the ASSMS backend APIs are when many users access the system at the same time. It tests both local environments and the deployed Azure Staging environment.

### Tools & Architecture

The testing suite runs automatically in the background without needing a user interface:
- **Testing Engine**: **Apache JMeter 5.6.3** (bundled and run in non-GUI mode).
- **Python Test Runner**: [`tests/load/run_performance_tests.py`](tests/load/run_performance_tests.py) manages settings, checks service health, executes JMeter, verifies pass/fail thresholds, and generates the HTML results dashboard.
- **JMeter Test Plan**: [`tests/load/assms_load_test.jmx`](tests/load/assms_load_test.jmx) simulates real user traffic and handles dynamic JWT authentication tokens.
- **Two Test Targets**:
  - **Direct Microservices (`direct`)**: Tests the backend APIs directly: Customer & Asset (`:5037`), Job (`:5252`), Dispatch (`:5055`), and Reporting (`:5238`).
  - **Azure API Management (`apim`)**: Tests the same endpoints through the Azure APIM gateway (`/customer`, `/jobs`, `/dispatch`, `/reports`) to measure gateway latency and routing overhead.

### Workload Scenarios (What is Tested)

The suite runs three realistic user scenarios:

| Workload | Endpoints Tested | What It Measures |
|---|---|---|
| **Authentication Burst** | `POST /api/auth/login` | Multiple users signing in simultaneously; tests token issuance, password checking, and sign-in speed under high concurrency. |
| **Authenticated Business Reads** | `GET /api/auth/me`, `/api/customers`, `/api/jobs`, `/api/technicians`, `/api/reports/jobs-by-status` | Logged-in users reading customer lists, jobs, technicians, and CQRS reports at the same time; measures multi-service database read speeds. |
| **Controlled Transactional Workflow** | `POST /api/jobs`, `GET /api/jobs/{id}`, `GET /api/jobs` | Creating new jobs and immediately reading them back; measures database write speed and cross-service validation. **Strict safeguards**: capped at 5 test jobs, uses dedicated staging test records, tags each job as `PERF-TEST <UUID>`, and requires the `--include-writes` flag. |

Before every test, a quick **pre-flight health check** (`/api/Health`) confirms that all services are online. Pre-flight checks ensure everything is running and are not included in latency measurements.

### Test Profiles

| Profile | Virtual Users | Ramp-up Time | Loops / User | Purpose & Pass Criteria |
|---|---:|---:|---:|---|
| `smoke` | 5 | 5 seconds | 2 | Quick sanity check for CI builds (Pass: success ≥ 99%, p95 ≤ 2,000 ms) |
| `demo` | 15 | 10 seconds | 5 | 2-minute live presentation run (Pass: success ≥ 99%, p95 ≤ 1,500 ms) |
| `load` | 25 | 30 seconds | 12 | Expected production traffic benchmark (Pass: success ≥ 99%, p95 ≤ 1,200 ms) |
| `stress` | 50 | 45 seconds | 20 | Controlled capacity test to find limits (Pass: success ≥ 98%, p95 ≤ 2,000 ms) |
| `transactional` | 5 | 5 seconds | 1 | Controlled write test that safely creates 5 test jobs |

### CI/CD Workflow & Automation

Performance tests run automatically in GitHub Actions using [`.github/workflows/staging-performance.yml`](.github/workflows/staging-performance.yml):

1. **Automatic Smoke Tests After Deployment**:
   - In [`.github/workflows/ci.yml`](.github/workflows/ci.yml), every push to `dev` deploys the frontend to Azure Staging via `staging-cd.yml`.
   - Right after deployment succeeds, CI automatically runs two performance smoke test jobs:
     - `performance-smoke`: Checks the direct backend microservices.
     - `apim-performance-smoke`: Checks routes through the Azure API Management gateway.
2. **On-Demand Manual Runs (`workflow_dispatch`)**:
   - Team members can manually trigger a performance run from GitHub Actions.
   - You can choose the test `profile` (`smoke` or `load`) and the `target` (`direct` or `apim`).
3. **Automated Quality Pass/Fail Gates**:
   - The test runner checks the overall success rate and **p95 latency** (the time within which 95% of all requests completed).
   - If the success rate drops below 99% or p95 latency exceeds 1,200 ms, the test exits with a non-zero code, automatically failing the CI step to catch performance regressions.
4. **Rich Artifact Reports (Saved for 30 Days)**:
   - Each workflow run publishes a downloadable results package with:
     - `dashboard/index.html`: Interactive web dashboard with response time distributions, throughput charts, and direct-vs-APIM comparison views.
     - `performance-summary.html`: One-page summary card showing the PASS/FAIL badge and response times.
     - `summary.json`: Compact JSON file with key summary statistics (p50, p95, p99, throughput).
     - `results.jtl` & `jmeter-dashboard/`: Raw JMeter test samples and native Apache JMeter HTML analytics.

### Measured Staging Baseline Results

Results recorded from the official direct-services load baseline test (25 concurrent users per group):

| Metric | Measured Value | Target Gate | Result & Meaning |
|---|---|---|---|
| **Total Requests** | `1,625` | — | All simulated requests completed |
| **Success Rate** | `100.0%` (0 failed) | ≥ 99.0% | **PASS** — Zero errors under load |
| **Median Response Time (p50)** | `327 ms` | — | 50% of requests finished within 327 ms |
| **95% Response Time (p95)** | `802 ms` | ≤ 1,200 ms | **PASS** — 95% finished within 802 ms |
| **99% Response Time (p99)** | `1,220 ms` | — | 99% finished within 1.22 seconds |
| **Throughput** | `34.06 req/s` | — | Consistent request rate achieved |

### How to Run Performance Tests Locally

```powershell
# 1. Run a quick smoke test from npm
npm run test:load

# 2. Run specific profiles using Python
python tests/load/run_performance_tests.py --profile smoke
python tests/load/run_performance_tests.py --profile demo
python tests/load/run_performance_tests.py --profile load

# 3. Run against Azure API Management (APIM)
$env:ASSMS_APIM_BASE_URL = "https://apim-assms-staging-d6a9031026.azure-api.net"
python tests/load/run_performance_tests.py --target apim --profile smoke
```


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
| Load & Performance Testing | [tests/load/README.md](tests/load/README.md) |

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

GitHub Actions runs on pull requests targeting `dev` or `main` and pushes to `dev` or `main` via [.github/workflows/ci.yml](.github/workflows/ci.yml). The pipeline executes:

1. **Terraform Validation**: Validates syntax and formatting (`terraform fmt`) across staging and production environment roots.
2. **Frontend Build & Test**: Installs locked dependencies (`npm ci`), runs ESLint (`npm run lint`), executes Vitest unit and route authorization tests (`npm run test`), and builds the production bundle (`npm run build`).
3. **Staging Deployment (`dev` pushes)**: Dispatches `staging-cd.yml` via Azure OIDC authentication.
4. **Automated Performance Smoke Gate**: Triggers [.github/workflows/staging-performance.yml](.github/workflows/staging-performance.yml) to execute automated smoke tests against both direct microservices (`performance-smoke`) and the Azure API Management gateway (`apim-performance-smoke`), publishing HTML dashboards and raw metrics as workflow artifacts.
