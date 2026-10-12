# Sprint 4 QA: manual walkthrough from the normal project folders

Updated 12 October 2026. Use the existing repositories in **F:\Projects\ASSMS**. No additional source checkout or qa-workspace directory is needed.

This guide separates manual browser/API checks from manually launching an automated tool. Clicking through a page is manual UI testing; it is not a Selenium execution. Reading test code does not count as passing a unit or mocked test.

## 1. Open the correct workspace and start Docker manually

Open Docker Desktop and wait for its Linux engine to run. Open PowerShell:

```powershell
Set-Location 'F:\Projects\ASSMS'
$qaDockerArgs = @('--env-file', '.\assms-frontend\tests\sprint4\local\.env', '-f', '.\assms-frontend\tests\sprint4\local\compose.yaml')
docker compose @qaDockerArgs up -d --build
docker compose @qaDockerArgs ps -a
```

Keep this PowerShell window open: the following Docker examples use $qaDockerArgs. Define it again if you open another PowerShell window.

Expected: customer, job, dispatch, reporting, frontend, mysql and kafka run. MySQL and Kafka show healthy. migrations and topic-init exit with code 0; they are one-time initialization jobs, so this is correct.

If a service is still starting:

```powershell
docker compose @qaDockerArgs logs --tail 50 frontend customer job dispatch reporting
```

Wait for Vite ready and API startup before recording smoke results. The QA MySQL port is 13306 and Kafka port is 19092. Existing local MySQL 3306 and Kafka 9092 are separate from these test volumes.

On this machine the private local/.env has already been preserved. A future fresh setup must generate its own config before Compose:

```powershell
python .\assms-frontend\tests\sprint4\setup_local_config.py
```

Never overwrite the .env belonging to an existing database volume with new database passwords. Stop/start preserves data. The frontend uses Sprint4_QA_Test_Automation; backend folders use current dev. Record application revisions from local/SOURCE_REVISIONS.json in your result sheet.

## 2. Find your accounts, fixture and evidence location

Open assms-frontend/tests/sprint4/local/.env privately. Use this mapping; passwords are not stored in this shareable guide:

| Role | Username | Password key in private .env |
| --- | --- | --- |
| Manager | manager.local | MANAGER_PASSWORD |
| Agent | agent.local | AGENT_PASSWORD |
| Dispatcher | dispatcher.local | DISPATCHER_PASSWORD |
| Technician A | qa.tech.a | TECHNICIAN_A_PASSWORD |
| Technician B | qa.tech.b | TECHNICIAN_B_PASSWORD |

Open assms-frontend/tests/sprint4/artifacts/fixtures.json. It records staff IDs, technician IDs, customer/asset/job IDs and the job reference. Current saved fixture reference is JOB-5E1N98, with job ID 0c3ac4ad-fe2e-40a0-90cc-bbc05e3bb660. Check its live state before testing: earlier manual runs may have changed it.

Technician A's Dispatch reference is QA-S4-TECH-A, region WESTERN; B is QA-S4-TECH-B, region CENTRAL. A staff UUID and its linked technician UUID must be different IDs. The login's technicianId must match the assignee's Dispatch UUID.

For a repeatable lifecycle run, use a new test job each time. Existing completed jobs cannot be started again. Create it manually as described below, or deliberately run prepare_fixtures.py once to prepare another synthetic fixture; that is automated data setup, not manual test execution.

Create a result/evidence folder:

```powershell
$manualRunPath = '.\qa-files\sprint-4\runs\manual-run-01'
New-Item -ItemType Directory -Path "$manualRunPath\screenshots" -Force | Out-Null
```

Copy the summary template from qa-files/sprint-4/templates/summary.md into that folder. Record case ID, Jira key/AC, role, data IDs, build, steps, expected, actual, result and evidence path. Start each case Not Run; use Pass, Fail or Blocked only from actual execution.

## 3. Manual smoke testing

1. Open http://localhost:8081/login. Confirm the login form renders.
2. Open each URL in Chrome. Both liveness and DB checks should return HTTP 200 and JSON status Healthy:

| Service | Liveness | Database |
| --- | --- | --- |
| Customer | http://localhost:5037/api/health | http://localhost:5037/api/health/db |
| Job | http://localhost:5252/api/health | http://localhost:5252/api/health/db |
| Dispatch | http://localhost:5055/api/health | http://localhost:5055/api/health/db |
| Reporting | http://localhost:8082/api/health | http://localhost:8082/api/health/db |

3. Sign in as Manager, verify the role shown in the page header, then sign out. Repeat as Agent and Dispatcher.
4. Open Dispatch Swagger without authorizing, execute GET /api/technicians: expect 401.
5. As Manager, open the jobs-by-status report. Confirm it loads, including a valid empty result if no jobs match.
6. Verify Kafka topics using section 8; a running container/TCP port alone does not prove event delivery.

Evidence: container status, one screenshot per health/DB result, role navigation and the unauthenticated 401. Browser DevTools Network shows the HTTP status; save redacted responses as well as screenshots.

## 4. Manual frontend workflow and regression

### Prepare a new job through the UI

1. Sign in as Agent. Open Customers and use the create/new action.
2. Create a synthetic customer, e.g. QA MANUAL 01, with a unique valid phone number, an address and customer type INDIVIDUAL.
3. Create an AIR_CONDITIONER asset for that customer with a unique serial, model, installation date and location.
4. Open /jobs/new. Select that customer and asset, service category REPAIR, priority HIGH, region WESTERN, and problem description QA manual cooling fault.
5. Submit and record the generated job ID/reference from the response/detail page.
6. Allow automatic Dispatch matching and Kafka propagation. With the dedicated current fixtures, A is the WESTERN AC technician and B is CENTRAL. If other eligible technicians have been added, verify which technician actually received the job instead of assuming A.

### Test the assigned technician's lifecycle

1. Sign out. Log in as qa.tech.a, provided A is the assignee.
2. Open My jobs. Verify your new job's reference, priority, region/summary and status. A must not see another technician's current assignments.
3. Click the job reference. Verify details, assignment, Job Status History and Service Work Records load.
4. Before starting, verify that work-record actions are unavailable or refused according to the job state.
5. Click Start Job. Expect IN_PROGRESS and a new ASSIGNED → IN_PROGRESS history entry.
6. Before adding a record, try completion via Swagger (section 5). Expect 400 because at least one record is required. If the UI disables the button, capture that rule too.
7. Enter Diagnosed cooling fault and replaced capacitor in Record Work Performed; click Add Work Record. Verify text, technician and recorded time.
8. Click Edit, change the content to Replaced capacitor and verified cooling, and save. Refresh to confirm persistence.
9. Add a second record labelled Temporary QA record; delete this second record. Accept confirmation if shown. Ensure the first record remains.
10. Complete the job using the completion action. Expect COMPLETED and a completion history entry. Attempts to repeat the transition should be refused; completed records should not offer ordinary editing.
11. Refresh My jobs after consumers catch up. The completed job must not remain an open ASSIGNED job; distinguish current assignments from retained history.
12. Sign out and log in as Manager. Open http://localhost:8081/reports/job-completions.
13. Filter WESTERN and a date/time range containing the completion. Confirm your job appears with correct technician/time and total. Test a range with no matching jobs.
14. Try a reversed date range; expect clear validation rather than a server crash. API filters use UTC, inclusive from and exclusive to; take local Colombo/UTC conversion into account.

### Check isolation and six basic UI checks

- Invalid login: wrong password produces the generic invalid-credentials message.
- Manager login: Customers page and Manager role render.
- Technician A: My jobs contains only A's assignments.
- Assigned job detail: A can read own details/history/records.
- Technician B: navigating to /technicians/new redirects to /forbidden.
- Manager: completion report loads.

Also use B's token to request A's job via API; there must be no unauthorized data exposure. Do not infer server authorization from a hidden UI button.

Evidence screenshots: My Jobs; assigned details; started status/history; added record; updated record; deleted temporary record; completed state; Manager completion report; denied access. Name them e.g. S4-MAN-START__local__IN_PROGRESS.png.

## 5. Backend API testing manually in Swagger

Open Swagger for the relevant service:

- Customer: http://localhost:5037/swagger
- Job: http://localhost:5252/swagger
- Dispatch: http://localhost:5055/swagger
- Reporting: http://localhost:8082/swagger

### Obtain and apply a token

1. In Customer Swagger open POST /api/auth/login → Try it out.
2. Enter {"identifier":"qa.tech.a","password":"YOUR_PRIVATE_LOCAL_PASSWORD"} and Execute.
3. Expect 200, staff.role Technician and staff.technicianId equal to A's linked Dispatch UUID.
4. Copy accessToken privately. In Job Swagger click Authorize, paste the token into the HTTP bearer field, Authorize and close. This bearer UI adds the Bearer prefix itself.
5. Repeat authorization independently in each service's Swagger when needed. Log out of the Swagger authorization before switching identities; changing the frontend login does not change Swagger's token.

Do not capture the login password, accessToken or Authorization header in shareable screenshots. Show status and non-sensitive staff/response details only.

### Test calls in a safe order

Replace {jobId} with a test job assigned to A. Use different disposable jobs to repeat state-changing sequences.

| Operation | Caller/state | Expected |
| --- | --- | --- |
| GET /api/jobs/{jobId} | A, own assigned job | 200 |
| GET /api/jobs/{jobId}/history | A, own job | 200 |
| GET /api/jobs/{jobId}/work-records | A, own job | 200 |
| Same reads | B, A's job | Access denied, no A data |
| POST /api/jobs/{jobId}/start | No token | 401 |
| Start | Agent/Dispatcher/Manager | 403 |
| Start | B, A's job | 403 |
| Start | A, ASSIGNED | 200, IN_PROGRESS |
| Start again | A, IN_PROGRESS | 409 |
| POST /api/jobs/{jobId}/complete | A, IN_PROGRESS, no records | 400 |
| POST /api/jobs/{jobId}/work-records | A, IN_PROGRESS, valid content | 201 |
| Add with empty content | A, IN_PROGRESS | 400 |
| PUT /api/jobs/{jobId}/work-records/{recordId} | A, IN_PROGRESS | 200 |
| DELETE /api/jobs/{jobId}/work-records/{recordId} | A, permitted record | 204 |
| Complete with a retained record | A, IN_PROGRESS | 200, COMPLETED |
| GET /api/reports/job-completions | Manager | 200, correct results |
| Completion report | Technician | 403 |

Current start and complete calls have **no technicianId request body**. Identity is obtained from the token. Work-record create/update use only:

```json
{"content":"Replaced capacitor and verified cooling"}
```

Use a second valid record to test deletion so completion can still be tested. For write authorization, repeat create/update/delete/complete with no token and the wrong technician; none may mutate data. Also test blank content and content longer than 2000 characters, invalid GUID/not-found resources, duplicate requests and wrong lifecycle states.

## 6. Verify migrations and persistence manually

In the root PowerShell window:

```powershell
docker compose @qaDockerArgs logs migrations
docker compose @qaDockerArgs exec mysql bash
```

Inside that container's shell:

```bash
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -u root
```

At the mysql> prompt:

```sql
SHOW DATABASES;
SELECT 'customerdb' AS db, COUNT(*) AS migrations FROM customerdb.schema_migrations
UNION ALL SELECT 'jobdb', COUNT(*) FROM jobdb.schema_migrations
UNION ALL SELECT 'dispatchdb', COUNT(*) FROM dispatchdb.schema_migrations
UNION ALL SELECT 'reportingdb', COUNT(*) FROM reportingdb.schema_migrations;
SELECT id, username, role, technician_id FROM customerdb.staff_accounts
WHERE username IN ('qa.tech.a', 'qa.tech.b');
```

Expected migration counts: customer 5, job 6, dispatch 5, reporting 3. Inspect filenames if counts differ; the count alone is not proof of every expected migration.

For your test job, replace TEST_JOB_ID in these read-only diagnostics:

```sql
SELECT id, job_reference, status FROM jobdb.jobs WHERE id = 'TEST_JOB_ID';
SELECT job_id, technician_id, job_status, released_at FROM dispatchdb.technician_assignments WHERE job_id = 'TEST_JOB_ID';
SELECT job_id, status FROM reportingdb.job_projection WHERE job_id = 'TEST_JOB_ID';
SELECT job_id, completed_at FROM reportingdb.job_completion_projection WHERE job_id = 'TEST_JOB_ID';
```

Compare database state to API/UI after event propagation. Do not change SQL rows to force a passing result. Enter exit at mysql>, then exit again to return from bash to PowerShell. Do not include staff password/hash columns in evidence.

## 7. Acceptance criteria and the eight original bugs

Read the numbered parent Jira AC, choose concrete data, record expected behavior, execute and attach actual evidence. Include successful, denied and boundary cases. Do not treat a merged PR as a pass.

Use this checklist while executing the sections above:

| Original defect reference | Manual verification |
| --- | --- |
| 221 | Anonymous, wrong-role and wrong-technician writes fail without changes |
| 222 | Assigned technician reads own details/history/records |
| 223 | Different staff/technician UUIDs still allow only the linked assignee to act |
| 224 | My Jobs shows required summary/priority/current status |
| 225 | Start/completion reach Dispatch and close open assignments |
| 226 | Actual status event UTC timestamps are accepted by Reporting |
| 227 | Manager report returns real completed data instead of 500 |
| 228 | Duplicate/older replay does not inflate totals or revert COMPLETED |

Current Sprint 4 product scope also includes staff creation/view/deactivation and UI refinement. Use their current Jira ACs as implemented. If a feature is unavailable, record Blocked/Not implemented rather than passing it. Do not add removed warranty/search/reassignment/performance-report stories back into the sprint through this guide.

For a confirmed new defect, search Jira for duplicates first. Record exact build, role, job ID, steps, expected/actual, severity and redacted screenshot/log evidence. Follow the agreed plan to create a new Sprint 4 bug when appropriate, linking the original defect if it is a regression. This guide does not change Jira statuses.

## 8. Kafka verification manually

From the root PowerShell window:

```powershell
docker compose @qaDockerArgs exec -T kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:29092 --list
docker compose @qaDockerArgs exec -T kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:29092 --describe --topic job-status-changed
docker compose @qaDockerArgs exec -T kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka:29092 --list
docker compose @qaDockerArgs exec -T kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka:29092 --describe --group assms-reporting-job-status-changed
docker compose @qaDockerArgs exec -T kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka:29092 --describe --group assms-dispatch-job-status-changed
```

Expect job-created and job-assigned with 1 partition each, job-status-changed with 3. Check consumer registration and record offsets/lag before and after actual transitions. Lag should settle after consumers catch up; a single snapshot is not proof of recovery.

Read status events:

```powershell
docker compose @qaDockerArgs exec -T kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server kafka:29092 --topic job-status-changed --from-beginning --timeout-ms 10000 --property print.key=true
```

Perform start/completion on a dedicated job and locate its events by job ID. Compare oldStatus/newStatus, event ID, producer and contract timestamps. Confirm UTC Z timestamps and corresponding Dispatch/Reporting states. A timeout after the consumer has exhausted available messages is not automatically a broker defect.

### Duplicate and older-event replay (isolated local test job only)

1. Capture the actual start and completion event JSON values for a dedicated test job into separate files. Preserve original timestamps/eventId and copy the JSON value, not the console's prefixed key.
2. Confirm the job is COMPLETED and the Manager report counts it once.
3. Send the exact completion event again, keeping the original job key:

```powershell
$event = Get-Content '.\qa-files\sprint-4\runs\manual-run-01\completion-event.json' -Raw | ConvertFrom-Json
$replayLine = $event.payload.jobId + '|' + ($event | ConvertTo-Json -Depth 20 -Compress)
$replayLine | docker compose @qaDockerArgs exec -T kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server kafka:29092 --topic job-status-changed --property parse.key=true --property 'key.separator=|'
```

4. After processing, check the count is unchanged.
5. Repeat using the earlier start event file. Final reporting state should stay COMPLETED rather than reverting to IN_PROGRESS.
6. Keep event IDs, consumer logs and report/database results as evidence. This is deliberate diagnostic replay, not proof that the normal producer emitted a new event.

For a separate outage test, stop/start only this local broker with docker compose @qaDockerArgs stop kafka / start kafka. Use disposable jobs and agree expected publish/retry behavior before assigning Pass. Observe API behavior, recovery and lag; a fake-consumer unit test does not prove real broker recovery. Do not perform disruptive replay/outage tests against shared Azure staging.

## 9. SQL-injection-oriented checks manually

Use only local synthetic data. In the login username field enter a benign test input such as ' OR '1'='1 with an incorrect password. Expect generic authentication rejection, never a successful session.

As Agent, create a test customer with an apostrophe-containing name, e.g. QA O'Brien. It should be stored literally or receive an appropriate business-validation response, without SQL errors or unintended records. Repeat benign SQL-looking strings in supported text/search inputs. Distinguish literal acceptance from unsafe execution.

Check the relevant repository uses SQL parameters, inspect the response for SQL/internal-error leakage, and compare record counts/known data before and after. One rejected payload is not proof of complete SQL-injection protection. Save inputs, redacted responses and read-only persistence observations. Do not use destructive SQL payloads.

## 10. Mocking and unit tests: what you can do manually

Open assms-reporting-service/tests/ReportingService.Tests/UnitTests/JobStatusChangedConsumerTests.cs. Inspect FakeKafkaConsumer/FakeJobProjectionRepository and cases for valid delivery, malformed events and repository failure. A fake dependency supplies controlled behavior; the assertions check commit/retry/projection behavior.

To execute the real existing unit/fake assertions yourself:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File 'F:\Projects\ASSMS\assms-frontend\tests\sprint4\Run-Unit-And-Mocks.ps1'
```

Read the console summary, TRX and coverage files. Our previous baseline was 487 Pass, 11 Skipped; your new run must use its own measured totals. Skipped Dispatch integration tests need a configured integration database and are not passes. Save the actual test output and a screenshot of the chosen mocked test/code/runner outcome for the lecturer.

Chrome DevTools Offline can manually simulate a network outage for UI error handling, but it is not equivalent to an injected mocked repository/Kafka unit test. Record it as network-failure UI testing.

## 11. Selenium vs manual browser checks

Section 4 is the manual equivalent of the six starter Selenium cases. If the lecturer also requires actual Selenium evidence, manually launch the runner:

```powershell
Set-Location 'F:\Projects\ASSMS\assms-frontend\tests\sprint4'
.\.venv\Scripts\python.exe run_selenium.py
```

Use that run's results and screenshots, not screenshots from your unrelated manual session. Failed screenshots are also evidence; do not relabel failures as passes.

## 12. JMeter: configure/debug in GUI, execute real load in CLI

Check java -version. If Java is unavailable, install a current Temurin JDK 17 Windows x64 MSI, enable PATH/JAVA_HOME installer options and reopen PowerShell. Follow the [Adoptium Windows installation guide](https://adoptium.net/installation/windows/). Existing JMeter tools are under assms-frontend/tests/load/tools/apache-jmeter-5.6.3; no need to commit another copy.

From the normal frontend folder, initialize private properties and open the GUI:

```powershell
Set-Location 'F:\Projects\ASSMS\assms-frontend'
python .\tests\sprint4\setup_local_config.py
.\tests\load\tools\apache-jmeter-5.6.3\bin\jmeter.bat -q .\tests\sprint4\local\jmeter.properties
```

In JMeter: File → Open → tests/sprint4/assms_sprint4_baseline.jmx. Inspect Thread Group, four health samplers, Customer Manager login, JWT extractor and protected reporting request. The local login properties are private; do not screenshot or commit them.

Use a one-user short GUI debug/validation run if needed. The current plan is a health/login/report-read baseline, not full lifecycle load coverage. Apache recommends GUI for plan preparation/debugging and CLI for the actual load test. See the [JMeter getting-started guide](https://jmeter.apache.org/usermanual/get-started.html).

Run the baseline yourself from PowerShell:

```powershell
$loadRunPath = '.\tests\sprint4\artifacts\jmeter-manual-01'
New-Item -ItemType Directory -Path $loadRunPath -Force | Out-Null
.\tests\load\tools\apache-jmeter-5.6.3\bin\jmeter.bat -n -t .\tests\sprint4\assms_sprint4_baseline.jmx -q .\tests\sprint4\local\jmeter.properties -Jusers=1 -Jramp=5 -Jduration=60 -l "$loadRunPath\results.jtl" -e -o "$loadRunPath\dashboard"
```

Use a NEW output folder for each run. Open dashboard/index.html. Record total requests, errors, throughput, p95 and Docker CPU/RAM. After agreeing targets/workload with the team, repeat proposed 5/10/20-user stages with appropriate ramp-up. These user counts are proposals, not pass thresholds. Keep request/response body and authorization-header recording disabled. Store JMX, JTL, HTML dashboard and resource observations, not only a screenshot.

## 13. Finish the manual run

Check earlier customer/asset create/view/update, technician create/view/update, candidate matching/assignment, job list/filters, role restrictions and reports. Use synthetic records and write expected values before running. Retain screenshots and notes even if a case is blocked or fails.

Summarize executed/Pass/Fail/Blocked/Skipped/Not Run separately. Do not count unit tests, UI cases, screenshots and JMeter samples as one combined acceptance-case total. Full QA approval also requires the agreed remaining scope and deployed Azure smoke evidence.

Stop only the QA stack when finished, preserving volumes:

```powershell
Set-Location 'F:\Projects\ASSMS'
$qaDockerArgs = @('--env-file', '.\assms-frontend\tests\sprint4\local\.env', '-f', '.\assms-frontend\tests\sprint4\local\compose.yaml')
docker compose @qaDockerArgs down
```

Do not add -v unless you intentionally want to erase this local QA data.
