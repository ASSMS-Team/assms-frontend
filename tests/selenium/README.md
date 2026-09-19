# ASSMS Sprint 2 - Selenium Automated UI Regression Suite

## Overview
This directory contains the automated Selenium WebDriver regression test suite for the ASSMS Frontend application. It tests all key user flows, authentication boundaries, form validations, lifecycle updates, and reporting filters.

---

## Directory Structure
```
tests/selenium/
├── run_selenium_suite.py     # Automated Selenium regression runner script
├── README.md                 # Setup and execution instructions
└── screenshots/              # Timestamped proof screenshots captured at each assertion
```

---

## Test Cases Covered

| Test ID | Test Name | Target Route | Assertion / Objective | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **UI-01** | Invalid Login | `/login` | Submit incorrect credentials | Rejection with alert `Invalid username/email or password.` |
| **UI-02** | Manager Login | `/login` | Authenticate with bootstrap Manager | Redirection to workspace, Manager role pill rendered |
| **UI-03** | RBAC Protection | `/technicians/new` | Attempt manager route as Technician | Blocked, redirected to `/forbidden` (Access Denied) |
| **UI-04** | Technician List | `/technicians` | Open technician table as Manager | Table loads with active technicians, skills, regions |
| **UI-05** | Form Validation | `/technicians/new` | Submit empty technician form | Field-level `.invalid-feedback` validation errors |
| **UI-06** | Create Technician | `/technicians/new` | Submit valid technician data | Success confirmation banner & record persistence |
| **UI-07** | Technician Details | `/technicians/:id` | Open technician detail profile | Details view renders name, reference, and active status |
| **UI-08** | Update Technician | `/technicians/:id/edit` | Modify name/skills and save | Updated metadata confirmed on profile |
| **UI-09** | Deactivate Technician| `/technicians/:id` | Trigger deactivation & accept alert | Status badge transitions to `INACTIVE` |
| **UI-10** | Job Management | `/jobs/new` | Open service job request flow | Form renders with priority, asset, and region inputs |
| **UI-11** | Dynamic Reports | `/reports/jobs-by-status`| Apply date and status filters | Real-time aggregation table updates dynamically |

---

## Execution Instructions

### Prerequisites
1. Python 3.10+ installed.
2. Selenium package installed:
   ```bash
   pip install selenium
   ```
3. Backend microservices (`5037`, `5055`, `5252`, `5238`) and Frontend dev server (`http://localhost:5173`) running.

### Running the Suite
Execute the runner from the workspace root:
```bash
python tests/selenium/run_selenium_suite.py
```
*(Or navigate to `tests/selenium` and run `python run_selenium_suite.py`)*

### Test Output & Proofs
- **Terminal output:** Displays real-time progress, pass/fail status badges, execution times per test, and a final scoreboard summary.
- **Proof Screenshots:** Automatically saved into `tests/selenium/screenshots/` with format `<TEST-ID>_<description>_<timestamp>.png`.
