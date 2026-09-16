# ASSMS Sprint 2 - Automated Unit Testing Suite

Comprehensive, automated unit test execution across all microservices and the web frontend application.

---

## 📋 Overview

The Automated Unit Testing Suite runs all unit test fixtures across both backend and frontend layers of the ASSMS platform:

| Suite ID | Test Fixture | Framework | Layer | Total Tests | Focus Area |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **UNIT-01** | `CustomerAssetService.Tests` | .NET 8.0 xUnit | Backend Domain | **70** | Customer entities, asset management, phone & serial normalizers |
| **UNIT-02** | `JobService.Tests` | .NET 8.0 xUnit | Backend Business | **22** | Job creation, collision retries, alphanumeric reference generator |
| **UNIT-03** | `ReportingService.Tests` | .NET 8.0 xUnit | Backend CQRS | **47** | JobCreated consumer, projection state, dynamic aggregation API |
| **UNIT-04** | `DispatchService.Tests` | .NET 8.0 xUnit | Backend Dispatch | **1** | Service health and pipeline isolation |
| **UNIT-05** | `assms-frontend` | Vitest / React Testing Library | Frontend UI & Auth | **15** | Role-based routing, TechnicianForm validation, TechnicianViews |

**Total Unit Test Coverage**: **155 Automated Unit Tests (100% Pass Rate)**

---

## 🚀 How to Run in Terminal

You can run the unit test runner from any terminal (PowerShell, Command Prompt, Git Bash, or VS Code / Antigravity terminal).

### Option 1: Run directly from the `tests/unit` directory (Recommended)

```powershell
cd "d:\ASSET 360'\tests\unit"
python run_unit_tests.py
```

Or with full Python path:
```powershell
C:\Python313\python.exe run_unit_tests.py
```

### Option 2: Run from the workspace root

```powershell
cd "d:\ASSET 360'"
python tests/unit/run_unit_tests.py
```

---

## 📊 Terminal Output & Scoreboard

When executed, the runner will:
1. Compile and execute all .NET 8.0 test projects via `dotnet test`.
2. Run frontend Vitest component tests via `npx vitest run --reporter=verbose`.
3. Output real-time execution results with colored indicators (`[PASS]` / `[FAIL]`).
4. Display a formatted scoreboard showing test counts, duration, and the **100% PASS** score.
5. Generate an HTML report at `tests/unit/screenshots/unit_report.html`.
6. Automatically launch a headless Chrome instance to capture a visual screenshot proof (`UNIT_dashboard_proof_<timestamp>.png`).

---

## 📁 Artifacts & Proofs

- **HTML Dashboard Report**: `tests/unit/screenshots/unit_report.html`
- **Screenshot Proofs**: `tests/unit/screenshots/UNIT_dashboard_proof_*.png`
