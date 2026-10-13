"""
UI Refinement & Consistency Verification Screenshot Capture
Captures desktop and tablet screenshots across all refined role views:
- Login page
- Customers list
- Jobs queue
- Technicians list
- Jobs by status dynamic report
- Tablet responsive layout (768px width)
"""

import time
import base64
import json
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

ARTIFACT_DIR = Path(r"C:\Users\HP\.gemini\antigravity-ide\brain\955317fa-4684-4a82-9064-658590dbc5da")
SCREENSHOT_DIR = Path(__file__).parent / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = "http://localhost:5173"

def make_token(role="Manager", username="kasun.manager"):
    header = base64.b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode()
    payload = base64.b64encode(json.dumps({
        "sub": "00000000-0000-0000-0000-000000000001",
        "unique_name": username,
        "role": role,
        "exp": int(time.time()) + 86400
    }).encode()).decode()
    return f"{header}.{payload}.mocksignature"

def main():
    print("[*] Starting Headless Chrome for UI Refinement capture...")
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--window-size=1440,900")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")

    driver = webdriver.Chrome(options=opts)
    try:
        # 1. Login Page
        print("[*] Capturing Login Page...")
        driver.get(f"{BASE_URL}/login")
        time.sleep(1.5)
        login_ss = ARTIFACT_DIR / "qa_refinement_login_page.png"
        driver.save_screenshot(str(login_ss))
        driver.save_screenshot(str(SCREENSHOT_DIR / "qa_refinement_login_page.png"))

        # Inject Manager authentication token into sessionStorage
        token = make_token("Manager", "kasun.manager")
        driver.execute_script(f"""
            sessionStorage.setItem('assms.staff.access-token', '{token}');
            window.dispatchEvent(new Event('assms-auth-changed'));
        """)
        time.sleep(0.5)

        # 2. Customers List
        print("[*] Capturing Customers List...")
        driver.get(f"{BASE_URL}/customers")
        time.sleep(1.5)
        cust_ss = ARTIFACT_DIR / "qa_refinement_customers_list.png"
        driver.save_screenshot(str(cust_ss))
        driver.save_screenshot(str(SCREENSHOT_DIR / "qa_refinement_customers_list.png"))

        # 3. Jobs List
        print("[*] Capturing Jobs List...")
        driver.get(f"{BASE_URL}/jobs")
        time.sleep(1.5)
        jobs_ss = ARTIFACT_DIR / "qa_refinement_jobs_list.png"
        driver.save_screenshot(str(jobs_ss))
        driver.save_screenshot(str(SCREENSHOT_DIR / "qa_refinement_jobs_list.png"))

        # 4. Technicians List
        print("[*] Capturing Technicians List...")
        driver.get(f"{BASE_URL}/technicians")
        time.sleep(1.5)
        tech_ss = ARTIFACT_DIR / "qa_refinement_technicians_list.png"
        driver.save_screenshot(str(tech_ss))
        driver.save_screenshot(str(SCREENSHOT_DIR / "qa_refinement_technicians_list.png"))

        # 5. Reports: Jobs by status
        print("[*] Capturing Jobs by Status Report...")
        driver.get(f"{BASE_URL}/reports/jobs-by-status")
        time.sleep(1.5)
        rep_ss = ARTIFACT_DIR / "qa_refinement_reports_status.png"
        driver.save_screenshot(str(rep_ss))
        driver.save_screenshot(str(SCREENSHOT_DIR / "qa_refinement_reports_status.png"))

        # 6. Tablet Responsive Layout (768px width)
        print("[*] Capturing Tablet Responsive Layout (768x1024)...")
        driver.set_window_size(768, 1024)
        driver.get(f"{BASE_URL}/jobs")
        time.sleep(1.5)
        tab_ss = ARTIFACT_DIR / "qa_refinement_tablet_layout.png"
        driver.save_screenshot(str(tab_ss))
        driver.save_screenshot(str(SCREENSHOT_DIR / "qa_refinement_tablet_layout.png"))

        print("[+] All verification screenshots captured successfully!")
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
