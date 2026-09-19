# ASSMS Sprint 2 - Automated Smoke Testing Suite

Rapid verification of system liveness, health endpoints, database connectivity, event brokers, and authentication boundaries across all microservices and frontend.

---

## 📋 Overview

The Smoke Testing Suite verifies in under 5 seconds that all core infrastructural components and services are online, responsive, and communicating properly:
- **SMOKE-01**: Frontend Web Application (Vite SPA on port `5173`)
- **SMOKE-02**: Customer & Asset Service Health Probe (port `5037`)
- **SMOKE-03**: Dispatch Service Health Probe (port `5055`)
- **SMOKE-04**: Job Service Health Probe (port `5252`)
- **SMOKE-05**: Reporting Service Health Probe (port `5238`)
- **SMOKE-06**: MySQL 8.0 Persistence & Entity Framework Database Connectivity (port `3307`)
- **SMOKE-07**: Staff JWT Authentication & Token Issuance (`/api/auth/login`)
- **SMOKE-08**: Dispatch Protected API Route with JWT Bearer Token validation (`/api/technicians`)
- **SMOKE-09**: Reporting Read-Model Projections Store (`/api/reports/jobs-by-status`)
- **SMOKE-10**: Apache Kafka Event Bus TCP Handshake (port `9092`)

---

## 🚀 How to Run in Terminal

### Prerequisites
- Python 3.8+ installed.
- Selenium installed (`pip install selenium`).
- Chrome browser installed.
- All microservices, MySQL Docker, Kafka Docker, and Vite frontend running.

### Execution Command
Run from the repository root:
```powershell
python tests/smoke/run_smoke_tests.py
```
Or run directly from inside the smoke test folder:
```powershell
cd tests/smoke
python run_smoke_tests.py
```

---

## 📊 Terminal Output & Scoreboard
When executed, the suite prints real-time probe statuses, followed by a color-coded scorecard:
```
=====================================================================================
          ASSMS SPRINT 2 - AUTOMATED SMOKE TESTING SUITE
          Execution Time: YYYY-MM-DD HH:MM:SS
=====================================================================================

[SMOKE-01] Probing: Frontend Web Application ... [PASS] (2.4ms)
[SMOKE-02] Probing: Customer & Asset Service Liveness ... [PASS] (3.8ms)
[SMOKE-03] Probing: Dispatch Service Liveness ... [PASS] (4.1ms)
[SMOKE-04] Probing: Job Service Liveness ... [PASS] (4.0ms)
[SMOKE-05] Probing: Reporting Service Liveness ... [PASS] (3.9ms)
[SMOKE-06] Probing: MySQL Persistence Connectivity ... [PASS] (5.2ms)
[SMOKE-07] Probing: Staff JWT Authentication Endpoint ... [PASS] (38.5ms)
[SMOKE-08] Probing: Dispatch Protected Route (Bearer Auth) ... [PASS] (12.4ms)
[SMOKE-09] Probing: Reporting Read-Model Projection Store ... [PASS] (6.1ms)
[SMOKE-10] Probing: Kafka Event Bus Broker Liveness ... [PASS] (1.2ms)

=====================================================================================
                         SMOKE TEST RESULTS SCOREBOARD
=====================================================================================
Test ID    | Component / Health Probe               | Status | Latency
-------------------------------------------------------------------------------------
SMOKE-01   | Frontend Web Application               | PASS   | 2.4 ms
SMOKE-02   | Customer & Asset Service Liveness      | PASS   | 3.8 ms
SMOKE-03   | Dispatch Service Liveness              | PASS   | 4.1 ms
SMOKE-04   | Job Service Liveness                   | PASS   | 4.0 ms
SMOKE-05   | Reporting Service Liveness             | PASS   | 3.9 ms
SMOKE-06   | MySQL Persistence Connectivity         | PASS   | 5.2 ms
SMOKE-07   | Staff JWT Authentication Endpoint      | PASS   | 38.5 ms
SMOKE-08   | Dispatch Protected Route (Bearer Auth) | PASS   | 12.4 ms
SMOKE-09   | Reporting Read-Model Projection Store  | PASS   | 6.1 ms
SMOKE-10   | Kafka Event Bus Broker Liveness        | PASS   | 1.2 ms
=====================================================================================
  FINAL SCORE: 10/10 HEALTHY (100.0%) | TOTAL LATENCY: 81.6 ms
  SMOKE STATUS: SYSTEM HEALTHY
=====================================================================================
```

---

## 📸 Automated Screenshot Proof
Each execution compiles a rich visual HTML dashboard and automatically captures a high-resolution screenshot stored in:
- `tests/smoke/screenshots/SMOKE_dashboard_proof_<timestamp>.png`
