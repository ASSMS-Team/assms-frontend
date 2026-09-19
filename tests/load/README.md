# ASSMS Sprint 2 - Apache JMeter Load & Concurrency Testing Suite

Industrial-grade automated load and concurrency testing for the ASSMS microservices platform using **Apache JMeter 5.6.3**.

---

## 📋 Overview

This suite utilizes Apache JMeter in non-GUI (headless CLI) mode to simulate concurrent traffic against all critical microservice endpoints:

- **Customer & Asset Service** (`http://localhost:5037/api/health`)
- **Job Service** (`http://localhost:5252/api/health`)
- **Reporting Service** (`http://localhost:5238/api/health`)
- **Dispatch Service** (`http://localhost:5055/api/health`)
- **MySQL Database Persistence** (`http://localhost:5055/api/health/db`)
- **JWT Staff Authentication** (`http://localhost:5055/api/auth/login`)
- **Reporting CQRS Projections** (`http://localhost:5238/api/reports/jobs-by-status`)

### Key Performance Metrics & Scores:
- **Apdex (Application Performance Index)**: Performance rating against SLA satisfaction threshold ($T=500\text{ms}$).
- **Throughput**: Requests handled per second.
- **Percentiles**: 90th and 95th percentile response times.
- **Official JMeter HTML Dashboard**: Interactive report with response time over time charts, active threads graphs, and error distribution.

---

## 🚀 How to Run in Terminal

To run the automated JMeter load test and capture a terminal screenshot with scores:

### Option 1: Run directly from `tests/load` directory (Recommended)

```powershell
cd "d:\ASSET 360'\tests\load"
python run_jmeter_load_tests.py
```
*(Or with full Python path: `C:\Python313\python.exe run_jmeter_load_tests.py`)*

### Option 2: Run from workspace root

```powershell
python tests/load/run_jmeter_load_tests.py
```

---

## 🖥️ How to Open Test Plan in JMeter GUI (Optional for Lecturer Demo)

If your lecturer wants to view the test plan visually in the JMeter GUI:

1. Navigate to the JMeter bin folder:
   ```powershell
   cd "d:\ASSET 360'\tests\load\tools\apache-jmeter-5.6.3\bin"
   .\jmeter.bat
   ```
2. In the JMeter application window:
   - Click **File > Open**
   - Select `tests/load/assms_load_test.jmx`
3. You will see the **Thread Groups**, **HTTP Samplers**, **JSON Header Managers**, and **Response Assertions** configured in the tree view.

---

## 📁 Artifacts & Reports

- **JMeter Test Plan**: `tests/load/assms_load_test.jmx`
- **Official JMeter HTML Dashboard**: `tests/load/reports/dashboard/index.html`
- **Execution Log**: `tests/load/results.jtl`
- **Screenshot Proofs**: `tests/load/screenshots/JMETER_dashboard_proof_*.png`
