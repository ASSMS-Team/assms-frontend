import json
import base64
import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = "http://localhost:5173"
ARTIFACT_DIR = Path(r"C:\Users\HP\.gemini\antigravity-ide\brain\955317fa-4684-4a82-9064-658590dbc5da")
SCREENSHOT_DIR = Path(__file__).parent / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

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
    print("[*] Starting Headless Chrome at 768x1100 (Tablet Viewport)...")
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--window-size=768,1100")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")

    driver = webdriver.Chrome(options=opts)
    try:
        driver.get(f"{BASE_URL}/login")
        token = make_token("Manager", "kasun.manager")
        driver.execute_script(f"""
            sessionStorage.setItem('assms.staff.access-token', '{token}');
            window.dispatchEvent(new Event('assms-auth-changed'));
        """)
        time.sleep(0.5)

        print("[*] Navigating to /staff-accounts...")
        driver.get(f"{BASE_URL}/staff-accounts")
        wait = WebDriverWait(driver, 10)
        
        # Wait for table or empty state
        table = wait.until(EC.presence_of_element_located((By.ID, "staff-accounts-table")))
        time.sleep(1)

        # Measure table scrollWidth vs container clientWidth
        metrics = driver.execute_script("""
            const table = document.getElementById('staff-accounts-table');
            const container = table.closest('.table-responsive') || table.parentElement;
            const card = table.closest('.app-card') || container;
            return {
                windowInnerWidth: window.innerWidth,
                tableScrollWidth: table.scrollWidth,
                tableOffsetWidth: table.offsetWidth,
                containerClientWidth: container.clientWidth,
                containerScrollWidth: container.scrollWidth,
                cardClientWidth: card.clientWidth,
                hasHorizontalScroll: container.scrollWidth > container.clientWidth
            };
        """)

        print(f"[*] Tablet Layout Metrics: {json.dumps(metrics, indent=2)}")

        # Also filter to linked technician account as specified in reproduction steps
        print("[*] Filtering to linked technician account...")
        driver.get(f"{BASE_URL}/staff-accounts?q=amal")
        time.sleep(1)

        tech_metrics = driver.execute_script("""
            const table = document.getElementById('staff-accounts-table');
            const container = table.closest('.table-responsive') || table.parentElement;
            return {
                tableScrollWidth: table.scrollWidth,
                containerClientWidth: container.clientWidth,
                hasHorizontalScroll: container.scrollWidth > container.clientWidth
            };
        """)

        print(f"[*] Filtered Technician Account Metrics: {json.dumps(tech_metrics, indent=2)}")

        tech_screenshot_path = ARTIFACT_DIR / "qa_staff_accounts_tablet_linked_tech.png"
        driver.save_screenshot(str(tech_screenshot_path))
        driver.save_screenshot(str(SCREENSHOT_DIR / "qa_staff_accounts_tablet_linked_tech.png"))
        print(f"[+] Filtered screenshot captured at {tech_screenshot_path}")

        assert not tech_metrics['hasHorizontalScroll'], "Filtered technician row has horizontal scroll!"
        assert tech_metrics['tableScrollWidth'] <= tech_metrics['containerClientWidth'], "Filtered table exceeds container width!"
        print("[+] SUCCESS: Linked technician account fits perfectly without horizontal scrolling!")

    finally:
        driver.quit()

if __name__ == "__main__":
    main()
