# ASSMS microservice load and performance testing

This is the automated **Load & Performance Testing** layer for ASSMS. It uses the bundled Apache JMeter 5.6.3 engine in non-GUI mode. Read workloads are the default; one separate, capped transactional profile can create a small number of labelled jobs against dedicated staging test records.

## What is tested

The JMeter plan has two concurrent workloads:

| Workload | Key endpoints | What it measures |
| --- | --- | --- |
| Authentication burst | `POST /api/auth/login` | JWT/password-verification behaviour under concurrent sign-ins. |
| Authenticated business reads | `GET /api/auth/me`, `/api/customers`, `/api/jobs`, `/api/technicians`, `/api/reports/jobs-by-status` | Customer/Asset, Job, Dispatch, and CQRS Reporting performance under the same authenticated sessions. |
| Controlled transactional workflow | `POST /api/jobs` then `GET /api/jobs/{id}` and `GET /api/jobs` | Job-service write latency, MySQL contention, cross-service customer/asset validation, and immediate read-back. |

Every request has an HTTP-status assertion. The sign-in response must contain an `accessToken`; the reporting response must contain `statuses` and `total`. Health endpoints are used only as pre-flight checks and are not included as workload measurements.

The transactional workflow is **off by default**. It uses the supplied test customer and asset and creates at most five jobs per invocation, each marked `PERF-TEST <UUID>`. It never runs in `smoke`, `demo`, `load`, or `stress` profiles.

## Setup

Start the local ASSMS services and their dependencies first. The runner expects these local ports by default:

| Service | Base URL |
| --- | --- |
| Customer & Asset | `http://127.0.0.1:5037` |
| Job | `http://127.0.0.1:5252` |
| Dispatch | `http://127.0.0.1:5055` |
| Reporting | `http://127.0.0.1:5238` |

Copy the credentials template, then replace the password with a non-production test account:

```powershell
Copy-Item load-test.properties.example load-test.properties
```

Or use environment variables—preferred for CI:

```powershell
$env:ASSMS_LOAD_LOGIN_IDENTIFIER = "your-test-manager"
$env:ASSMS_LOAD_LOGIN_PASSWORD = "your-password"
```

Optional endpoint overrides are `ASSMS_CUSTOMER_API_URL`, `ASSMS_JOB_API_URL`, `ASSMS_DISPATCH_API_URL`, and `ASSMS_REPORTING_API_URL`.

### APIM gateway target

The same workflow can also be measured through Azure API Management. This is a separate, read-only target: it keeps the service workload identical while including gateway routing, policies, and authentication handling in the measured path.

```powershell
$env:ASSMS_APIM_BASE_URL = "https://apim-assms-staging-d6a9031026.azure-api.net"
python run_performance_tests.py --target apim --profile smoke
python run_performance_tests.py --target apim --profile load
```

APIM runs use `/customer`, `/jobs`, `/dispatch`, and `/reports` gateway routes. The guarded `transactional` profile remains direct-service only so it cannot create jobs through the gateway.

### Azure staging target

The runner supports HTTPS. To test the deployed staging services, set these local-only values before running:

```powershell
$env:ASSMS_CUSTOMER_API_URL = "https://assms-customer-staging-d6a9031026.japaneast.cloudapp.azure.com"
$env:ASSMS_JOB_API_URL = "https://assms-job-staging-d6a9031026.japaneast.cloudapp.azure.com"
$env:ASSMS_DISPATCH_API_URL = "https://assms-dispatch-staging-d6a9031026.centralindia.cloudapp.azure.com"
$env:ASSMS_REPORTING_API_URL = "https://assms-reporting-staging-d6a9031026.centralindia.cloudapp.azure.com"
```

Use only the dedicated staging account in `ASSMS_LOAD_LOGIN_IDENTIFIER` and `ASSMS_LOAD_LOGIN_PASSWORD`. Do not run the stress profile against any production environment.

## Run profiles

Run from this directory:

```powershell
python run_performance_tests.py --profile smoke
```

From the frontend repository root, the unified smoke command is also available:

```powershell
npm run test:load
```

| Profile | Virtual users | Ramp-up | Business loops per user | Intended use |
| --- | ---: | ---: | ---: | --- |
| `smoke` | 5 | 5 seconds | 2 | Fast CI or environment check. |
| `demo` | 15 | 10 seconds | 5 | Reliable two-minute live demonstration. |
| `load` | 25 | 30 seconds | 12 | Expected concurrent-load benchmark. |
| `stress` | 50 | 45 seconds | 20 | Controlled capacity test after a successful load baseline. |
| `transactional` | 5 | 5 seconds | 1 | Five controlled writes against the dedicated staging customer/asset. |

Override a profile only when documenting the changed parameters:

```powershell
python run_performance_tests.py --profile load --users 40 --loops 15
```

### Controlled job creation in staging

Only run this after confirming the dedicated test customer and asset are active. The checked-in properties template contains the staging IDs; local overrides are available as `ASSMS_LOAD_TEST_CUSTOMER_ID` and `ASSMS_LOAD_TEST_ASSET_ID`.

```powershell
python run_performance_tests.py --profile transactional --include-writes
```

The runner rejects write attempts unless all of these safeguards hold: the profile is `transactional`, `--include-writes` is present, virtual users are no more than five, and there is exactly one business loop. Do not use real customer or asset records.

The command exits `0` only when its success-rate and p95 thresholds pass. It exits non-zero for a failed pre-flight, JMeter failure, assertion failure, or threshold breach—making it suitable for CI. Each run creates an ignored timestamped folder under `results/` containing:

- `dashboard/index.html` — self-contained, presentation-friendly dashboard with Overview, Response Times, Throughput, Timeline, and a direct-versus-APIM Comparison page when both matching runs exist
- `performance-summary.html` — compact PASS/FAIL overview with metric cards and per-endpoint p50/p95/p99 table
- `results.jtl` — raw JMeter samples
- `jmeter-dashboard/index.html` — native JMeter HTML report for low-level drill-down
- `summary.json` — compact p50/p95/p99, throughput, failure count, and per-endpoint summary

## Interpreting results

Report p95 and p99 alongside the average: averages can hide slow requests experienced by a minority of users. Establish the single-user baseline first, run `load`, then increase the stress profile carefully. Record the first concurrency level where the p95 target or error-rate target is breached as the current capacity boundary; do not invent results or a bottleneck before measuring them.

The default thresholds are intentionally tolerant of local-development machines. After the team has a stable staging baseline, tune the thresholds and record the reason in the presentation/README. The suite targets a dedicated local or staging environment, never production.

## CI use

Run the `smoke` profile on a disposable test environment in CI and upload `tests/load/results/**` as a workflow artifact. Keep `load` and `stress` manual or scheduled: they require all four APIs, databases, Kafka-dependent reporting data, and a controlled environment to make results comparable.

The repository includes a manual GitHub Actions workflow at `.github/workflows/staging-performance.yml`. It offers the read-only `smoke` and `load` profiles against either direct microservices or APIM, and uploads the dashboard, raw JTL, and JSON summary as a 30-day workflow artifact. After each deployment to `dev`, CI runs both safe smoke baselines automatically. Before using it, configure these GitHub repository secrets:

- `ASSMS_LOAD_LOGIN_IDENTIFIER`
- `ASSMS_LOAD_LOGIN_PASSWORD`

It uses the verified staging service root URLs directly. The workflow intentionally excludes `stress` and the job-creating `transactional` profile to protect shared staging.

## Two-minute demo

1. Show that pre-flight checks pass.
2. Run `python run_performance_tests.py --profile demo`.
3. Open the generated dashboard and state the measured success rate, p95, p99, and throughput.
4. Compare it with the saved `stress` run and identify the measured capacity boundary.
