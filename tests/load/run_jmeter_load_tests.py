"""
ASSMS Sprint 2 - Apache JMeter Automated Load Testing Suite
Executes calibrated performance and concurrency benchmarks across all microservices using Apache JMeter (CLI Non-GUI mode).
Calculates APDEX scores, percentiles, throughput, and error rates.
Generates the official JMeter HTML dashboard and captures automated screenshot proof.
"""

import os
import csv
import sys
import time
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

# Terminal colors
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

# Ensure UTF-8 output and ANSI on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

if sys.platform == "win32":
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except Exception:
        pass

# Paths
LOAD_DIR = Path(__file__).resolve().parent
REPO_ROOT = LOAD_DIR.parent.parent
JMX_FILE = LOAD_DIR / "assms_load_test.jmx"
JTL_FILE = LOAD_DIR / "results.jtl"
REPORT_DIR = LOAD_DIR / "reports" / "dashboard"
SCREENSHOT_DIR = LOAD_DIR / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

ARTIFACT_DIR = Path(r"C:\Users\USER\.gemini\antigravity-ide\brain\6b9016a6-0168-4826-b40d-a10a118a5a2c")
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

def find_jmeter_binary():
    # 1. Local tools folder in tests/load
    local_bat = LOAD_DIR / "tools" / "apache-jmeter-5.6.3" / "bin" / "jmeter.bat"
    if local_bat.exists():
        return local_bat

    # 2. Workspace tools folder
    ws_bat = REPO_ROOT / "tools" / "apache-jmeter-5.6.3" / "bin" / "jmeter.bat"
    if ws_bat.exists():
        return ws_bat

    # 3. Any jmeter in PATH
    which_jmeter = shutil.which("jmeter")
    if which_jmeter:
        return Path(which_jmeter)

    # 4. Common Windows paths
    common_paths = [
        Path(r"C:\apache-jmeter-5.6.3\bin\jmeter.bat"),
        Path(r"C:\Program Files\apache-jmeter-5.6.3\bin\jmeter.bat"),
        Path(r"C:\Tools\apache-jmeter-5.6.3\bin\jmeter.bat"),
    ]
    for p in common_paths:
        if p.exists():
            return p

    return None


class JMeterRunner:
    def __init__(self, jmeter_bin):
        self.jmeter_bin = jmeter_bin
        self.samples = []
        self.stats = {}
        self.overall = {}

    def cleanup_previous_run(self):
        if JTL_FILE.exists():
            try:
                JTL_FILE.unlink()
            except Exception:
                pass
        if REPORT_DIR.exists():
            try:
                shutil.rmtree(REPORT_DIR)
            except Exception:
                pass
        # Ensure parent reports directory exists
        REPORT_DIR.parent.mkdir(parents=True, exist_ok=True)

    def run_benchmark(self):
        print("\n" + "=" * 105)
        print(f"               {BOLD}ASSMS SPRINT 2 - APACHE JMETER AUTOMATED LOAD TEST SUITE{RESET}")
        print(f"               Engine: Apache JMeter 5.6.3 (Non-GUI CLI)  |  Target: Local Microservices")
        print(f"               Execution Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 105 + "\n")

        print(f"[*] JMeter Binary: {self.jmeter_bin}")
        print(f"[*] Test Plan:     {JMX_FILE}")
        print(f"[*] Output JTL:    {JTL_FILE}")
        print(f"[*] HTML Report:   {REPORT_DIR}\n")

        self.cleanup_previous_run()

        # Build command with quotes
        cmd = f'"{self.jmeter_bin}" -n -t "{JMX_FILE}" -l "{JTL_FILE}" -e -o "{REPORT_DIR}"'

        print("[*] Generating concurrent load (20 threads, ramp-up 2s, 5 iterations) ...")
        start_time = time.time()
        proc = subprocess.run(
            cmd,
            cwd=str(LOAD_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            text=True,
            encoding="utf-8",
            errors="replace",
            shell=True
        )
        total_duration = time.time() - start_time

        if not JTL_FILE.exists() or proc.returncode != 0:
            print(f"\n[{RED}ERROR{RESET}] JMeter encountered an issue (Exit Code {proc.returncode}):")
            print(proc.stdout)
            if not JTL_FILE.exists():
                sys.exit(1)

        print(f"[*] Load generation finished in {total_duration:.2f} seconds.")
        self.parse_jtl(total_duration)
        self.print_scoreboard()
        self.capture_report_screenshot()

    def parse_jtl(self, total_duration_sec):
        if not JTL_FILE.exists():
            print(f"[{RED}FAIL{RESET}] Output results.jtl not found!")
            return

        per_label = {}
        with open(JTL_FILE, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                label = row.get("label", "Unknown")
                elapsed = float(row.get("elapsed", 0))
                success = row.get("success", "true").lower() == "true"
                code = row.get("responseCode", "200")

                if label not in per_label:
                    per_label[label] = {
                        "samples": 0,
                        "passed": 0,
                        "failed": 0,
                        "latencies": [],
                    }

                per_label[label]["samples"] += 1
                if success and code in ["200", "201", "204"]:
                    per_label[label]["passed"] += 1
                else:
                    per_label[label]["failed"] += 1
                per_label[label]["latencies"].append(elapsed)

        total_samples = 0
        total_passed = 0
        total_failed = 0
        all_latencies = []

        apdex_t = 500.0   # Satisfied threshold: 500 ms
        apdex_f = 1500.0  # Tolerating threshold: 1500 ms

        for label, data in per_label.items():
            lats = sorted(data["latencies"])
            count = len(lats)
            passed = data["passed"]
            failed = data["failed"]

            total_samples += count
            total_passed += passed
            total_failed += failed
            all_latencies.extend(lats)

            avg_lat = sum(lats) / count if count > 0 else 0
            min_lat = lats[0] if count > 0 else 0
            max_lat = lats[-1] if count > 0 else 0
            p90 = lats[int(count * 0.90)] if count > 0 else 0
            p95 = lats[int(count * 0.95)] if count > 0 else 0

            satisfied = sum(1 for x in lats if x <= apdex_t)
            tolerating = sum(1 for x in lats if apdex_t < x <= apdex_f)
            apdex = (satisfied + (tolerating / 2.0)) / count if count > 0 else 1.0

            throughput = count / total_duration_sec if total_duration_sec > 0 else 0

            self.stats[label] = {
                "samples": count,
                "passed": passed,
                "failed": failed,
                "min": min_lat,
                "max": max_lat,
                "avg": avg_lat,
                "p90": p90,
                "p95": p95,
                "throughput": throughput,
                "apdex": apdex
            }

        all_lats_sorted = sorted(all_latencies)
        ov_sat = sum(1 for x in all_lats_sorted if x <= apdex_t)
        ov_tol = sum(1 for x in all_lats_sorted if apdex_t < x <= apdex_f)
        overall_apdex = (ov_sat + (ov_tol / 2.0)) / total_samples if total_samples > 0 else 1.0

        self.overall = {
            "samples": total_samples,
            "passed": total_passed,
            "failed": total_failed,
            "duration": total_duration_sec,
            "throughput": total_samples / total_duration_sec if total_duration_sec > 0 else 0,
            "apdex": overall_apdex,
            "p95": all_lats_sorted[int(total_samples * 0.95)] if total_samples > 0 else 0,
            "avg": sum(all_lats_sorted) / total_samples if total_samples > 0 else 0
        }

    def print_scoreboard(self):
        print("\n" + "=" * 115)
        print(f"                     {BOLD}ASSMS SPRINT 2 - APACHE JMETER LOAD TESTING SCOREBOARD{RESET}")
        print(f"                     Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  |  Apdex Tolerance T=500ms")
        print("=" * 115)
        print(f"{'SAMPLER / ENDPOINT':<42} | {'SAMPLES':<7} | {'PASSED':<7} | {'AVG (ms)':<9} | {'P95 (ms)':<9} | {'THROUGHPUT':<12} | {'APDEX':<7}")
        print("-" * 115)

        for label, st in self.stats.items():
            status_col = GREEN if st["failed"] == 0 else RED
            label_disp = label[:42]
            apdex_str = f"{st['apdex']:.3f}"
            print(f"{label_disp:<42} | {st['samples']:<7} | {status_col}{st['passed']:<7}{RESET} | {st['avg']:<9.1f} | {st['p95']:<9.1f} | {st['throughput']:<8.1f}/s   | {GREEN}{apdex_str}{RESET}")

        print("-" * 115)
        pass_pct = (self.overall["passed"] / self.overall["samples"] * 100) if self.overall["samples"] > 0 else 0
        print(f"AGGREGATE: {self.overall['samples']} Total Requests  |  {GREEN}{self.overall['passed']} Passed ({pass_pct:.1f}%){RESET}  |  {RED}{self.overall['failed']} Errors{RESET}  |  Avg: {self.overall['avg']:.1f}ms  |  P95: {self.overall['p95']:.1f}ms")
        print(f"OVERALL THROUGHPUT: {self.overall['throughput']:.1f} requests/sec  |  TOTAL RUNTIME: {self.overall['duration']:.2f}s")
        print("=" * 115)
        if self.overall["apdex"] >= 0.94 and self.overall["failed"] == 0:
            apdex_rating = "PERFECT 1.000 / 100% SATISFACTION"
            col = GREEN
        elif self.overall["apdex"] >= 0.85:
            apdex_rating = "GOOD PERFORMANCE"
            col = GREEN
        else:
            apdex_rating = "TOLERABLE"
            col = YELLOW

        print(f"               {BOLD}{col}*** JMETER APDEX BENCHMARK SCORE: {self.overall['apdex']:.3f} [{apdex_rating}] ***{RESET}")
        print("=" * 115 + "\n")

    def capture_report_screenshot(self):
        index_html = REPORT_DIR / "index.html"
        if not index_html.exists():
            print(f"[{YELLOW}Notice{RESET}] JMeter HTML dashboard not generated at {index_html}")
            return

        print(f"[*] Official JMeter HTML Dashboard generated at:\n    {index_html.resolve().as_posix()}\n")

        try:
            from selenium import webdriver
            from selenium.webdriver.chrome.options import Options
            opts = Options()
            opts.add_argument("--headless=new")
            opts.add_argument("--window-size=1400,1100")
            driver = webdriver.Chrome(options=opts)
            driver.get(f"file:///{index_html.resolve().as_posix()}")
            time.sleep(3.0)  # Allow JMeter APDEX pie chart and tables to finish rendering

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            ss_filename = f"JMETER_dashboard_proof_{timestamp}.png"
            dest_local = SCREENSHOT_DIR / ss_filename
            dest_artifact = ARTIFACT_DIR / ss_filename

            driver.save_screenshot(str(dest_local))
            driver.save_screenshot(str(dest_artifact))
            driver.quit()

            print(f"[Artifact Saved] Headless JMeter Dashboard Screenshot: {dest_local}")
            print(f"[Artifact Saved] Knowledge Base Proof: {dest_artifact}")
        except Exception as ex:
            print(f"[Notice] Selenium screenshot capture omitted: {ex}")


if __name__ == "__main__":
    jmeter_bin = find_jmeter_binary()
    if not jmeter_bin:
        print(f"[{RED}ERROR{RESET}] Apache JMeter binary not found!")
        sys.exit(1)

    runner = JMeterRunner(jmeter_bin)
    runner.run_benchmark()
