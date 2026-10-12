# ASSMS Sprint 4 QA automation

Branch: `Sprint4_QA_Test_Automation`, created from frontend `dev` revision `3d8bdd5` on 12 October 2026. Baseline reference: [Sprint2_QA_Test_Automation](https://github.com/ASSMS-Team/assms-frontend/tree/Sprint2_QA_Test_Automation), commit `c55309b`. Existing Sprint 2 tests and JMeter files remain available in their original directories. These new runners adapt its health/login checks and Selenium explicit-wait/screenshot structure for Sprint 4; historical Sprint 2 screenshots/results are not Sprint 4 evidence.

The five code revisions and all migration filenames are recorded in `local/SOURCE_REVISIONS.json`. Applications must be siblings: assms-frontend, assms-customer-asset-service, assms-job-service, assms-dispatch-service, assms-reporting-service. Use the exact documented revisions for a reproducible run, or record any update before testing. Original working folders have not been switched/reset.

## Requirements

- Docker Desktop running Linux containers, with working registry/network access.
- Python 3.10+ and Chrome. Selenium Manager obtains the compatible driver on first run.
- The pinned Python QA libraries in requirements.txt, installed in the isolated .venv.
- For JMeter, Java 17+ and the existing JMeter 5.6.3 tools under tests/load/tools, or a team-approved container runner. JMeter is a separate phase; do not infer a load pass from smoke latency.

No Azure credentials, host MySQL/.NET/Node installation or live cloud changes are required. Development secrets are generated into ignored local/.env; never publish that file or use those values in Azure. Default bind addresses are loopback only.

## Run

From this directory in PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-QA.ps1
.\.venv\Scripts\python.exe prepare_fixtures.py
.\.venv\Scripts\python.exe run_selenium.py
powershell -NoProfile -ExecutionPolicy Bypass -File .\Run-Unit-And-Mocks.ps1
```

Frontend: http://localhost:8081/login. APIs: Customer 5037, Job 5252, Dispatch 5055, Reporting 8082. QA MySQL 13306, Kafka 19092. The existing MySQL 3306 and Kafka 9092 stack is not stopped, modified or used by this project.

For manual Compose commands always include `--env-file tests/sprint4/local/.env` when running from the frontend root.

Current migrations: Customer V01â€“V05, Job V01â€“V06, Dispatch V01â€“V05, Reporting V01â€“V03, total 19. Compose creates all databases/users, initializes the three Kafka topics and applies ordered migrations with per-database migration tracking before starting APIs. Database health requires a TCP connection and the initialized reporting database; it must not accept the temporary MySQL init server as ready.

Stop preserving data:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Stop-QA.ps1
```

## Dedicated local identities and fixtures

| Role | Login | Local-only password | Fixture |
| --- | --- | --- | --- |
| Manager | manager.local | See local/.env | Report and permitted management checks |
| Agent | agent.local | See local/.env | Customer/asset/job intake |
| Dispatcher | dispatcher.local | See local/.env | Dispatch technician provisioning |
| Technician A | qa.tech.a | See local/.env | QA-S4-TECH-A, WESTERN, AC |
| Technician B | qa.tech.b | See local/.env | QA-S4-TECH-B, CENTRAL, AC |

Technician logins are created by authenticated Customer API provisioning after Dispatch records exist. Their immutable Dispatch IDs differ from staff-account IDs. Fixture preparation reuses existing dedicated technician accounts, creates synthetic intake/job data, waits for Dispatch and Job projections, and writes fixture IDs without tokens/passwords to artifacts/fixtures.json. Each successful rerun creates a new synthetic customer/asset/job; it does not delete previous fixtures. A failed fixture run is preserved in evidence and may leave partial synthetic records, which should be diagnosed rather than misreported as success.

Regions differ so the WESTERN repair job has only Technician A as an eligible local fixture. Final full cross-technician isolation tests must also use same-region technicians where relevant; this initial data is not comprehensive acceptance coverage.

## What these new runners currently verify

- `run_smoke.py`: eleven checks covering SPA route, four service liveness/database checks, three role logins, anonymous protected-route denial, Manager reporting and Kafka listener reachability. The listener check is TCP reachability only.
- `prepare_fixtures.py`: real service-owned provisioning, immutable links, intake and asynchronous assignment. It performs no direct cross-service database writes.
- `run_selenium.py`: six actual Chrome UI assertions: invalid login, Manager navigation, linked Technician My Jobs, own details, denied management route and Manager completion-report navigation. Screenshots are actual app screens, not a rendering of a fabricated scorecard.
- Existing backend xUnit consumer/repository fakes support the lecturer's mocking requirement. Run real broker integration separately: a mocked consumer passing is not proof of broker health/recovery.

Remaining work: full AC/bug-negative matrix, technician lifecycle actions, older-event replay/idempotency, offboarding/staff stories as implemented, security scans/SQL-injection checks, expanded regression, JMeter and Azure smoke. A passing starter suite is not final Sprint 4 QA approval.

`assms_sprint4_baseline.jmx` adapts the load-plan structure for current ports and the Customer login endpoint. It covers four health endpoints, Manager login/JWT extraction and a protected reporting read with HTTP 200 assertions. This starter JMeter plan is generated/structurally checked but has not been executed. It is a read-only baseline, not complete lifecycle load testing. Once Java/JMeter are available, generate ignored local/jmeter.properties with the local Manager login and use `-q tests/sprint4/local/jmeter.properties`; this file must not be committed. Then, from the frontend repo root:

```powershell
New-Item -ItemType Directory -Force tests/sprint4/artifacts/jmeter-baseline | Out-Null
.\tests\load\tools\apache-jmeter-5.6.3\bin\jmeter.bat -n -t tests/sprint4/assms_sprint4_baseline.jmx -q tests/sprint4/local/jmeter.properties -Jusers=1 -Jramp=5 -Jduration=60 -l tests/sprint4/artifacts/jmeter-baseline/results.jtl -e -o tests/sprint4/artifacts/jmeter-baseline/dashboard
```

Use a new output directory on each run. Agree performance limits before declaring a performance pass. Keep request/response body and authorization-header recording disabled so JTL files cannot expose passwords or JWTs.

## Evidence

Each runner produces artifacts/RUN-ID/manifest.json, results.json, redacted api responses where applicable, report.html and screenshots for Selenium. Nonzero exit status means at least one assertion failed. Source revisions and browser version accompany evidence. Never commit live tokens, passwords/hashes or real customer records. Runtime artifacts and the virtual environment are ignored by Git.

The broader acceptance register and current QA guide are under the parent workspace qa-files/sprint-4. Preserve local vs mocked vs deployed results separately. File fresh confirmed defects against Sprint 4 after checking duplicates, including exact builds, reproduction, expected/actual and redacted evidence; do not modify old bug statuses merely because a PR merged.
