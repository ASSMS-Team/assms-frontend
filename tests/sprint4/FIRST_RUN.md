# Local QA setup verification — 12 October 2026

Environment: isolated `assms-sprint4-qa` Docker stack, current fetched dev revisions in `local/SOURCE_REVISIONS.json`. Frontend remains running at http://localhost:8081/login.

| Check | Actual result | Evidence directory under artifacts/ |
| --- | --- | --- |
| Database migrations | All 19 applied | local/SOURCE_REVISIONS.json lists files; migration/container logs retained in setup evidence |
| Smoke suite | 11 Pass, 0 Fail | 20261012T123646-smoke |
| Synthetic identity/assignment fixtures | 1 setup scenario Pass | 20261012T123902-fixtures |
| Selenium navigation assertions | 6 Pass, 0 Fail, 6 actual screenshots | 20261012T123918-selenium |
| Customer xUnit suite | 114 Pass, 0 Fail | unit-mocks-20261012T124202/assms-customer-asset-service |
| Job xUnit suite | 161 Pass, 0 Fail | unit-mocks-20261012T124202/assms-job-service |
| Dispatch xUnit suite | 116 Pass, 0 Fail, 11 Skipped | unit-mocks-20261012T124202/assms-dispatch-service |
| Reporting xUnit suite | 96 Pass, 0 Fail | unit-mocks-20261012T124202/assms-reporting-service |

Backend total: 487 passed, 0 failed, 11 skipped. Skipped Dispatch tests require a configured integration-test database; they are not passes. Existing fake repositories/Kafka consumers were exercised by the relevant unit suites. TRX and Cobertura reports are retained; no percentage target or release readiness is inferred from them.

Kafka verification found job-created (1 partition), job-assigned (1 partition), job-status-changed (3 partitions), and six registered consumer groups including Dispatch and Reporting status-change consumers. The fixture job reached Dispatch and Job projections. This is initial delivery/setup evidence; duplicate replay, outages, status completion and lag under load are separate tests still to run.

The first fixture attempt read the Job API immediately after Dispatch assignment and returned 403 while JobAssigned propagation was pending. A later diagnostic confirmed the same linked token read its own job with 200. The fixture runner now waits for both projections with a timeout. The first attempt is retained as historical evidence, not silently changed to Pass and not classified as a confirmed product defect without further investigation.

Build startup initially failed because of an unavailable Windows system proxy. After connectivity was restored, a MySQL readiness race was fixed in the QA setup: health now verifies TCP access to an initialized database and the migration script waits for readiness. Application code was not modified for these setup fixes.

Frontend npm installation reported three high-severity dependency findings. These are scanner observations pending detailed advisory/reachability review, not three confirmed exploitable defects. Do not run npm audit fix automatically on the QA baseline or file duplicate product bugs without triage.

JMeter plan is prepared but not executed. Full acceptance/negative/security/Kafka-replay/regression/load testing and Azure smoke remain outstanding. No Jira issues or statuses were changed during this setup run. Old Sprint 2 evidence is not reused as Sprint 4 proof.
