"""Run the ASSMS JMeter performance suite without storing secrets in source control.

Read-only workloads are the default.  A separately opt-in transactional profile can
create a small number of clearly labelled jobs against dedicated staging test data.
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import math
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse


LOAD_DIR = Path(__file__).resolve().parent
PLAN_FILE = LOAD_DIR / "assms_load_test.jmx"
RESULTS_DIR = LOAD_DIR / "results"
LOCAL_PROPERTIES = LOAD_DIR / "load-test.properties"


@dataclass(frozen=True)
class Profile:
    users: int
    ramp_up: int
    loops: int
    auth_loops: int
    min_success_rate: float
    max_p95_ms: float


PROFILES: dict[str, Profile] = {
    # Fast enough for pull-request automation.
    "smoke": Profile(5, 5, 2, 2, 99.0, 2_000.0),
    # Demonstrates expected concurrent usage in a local/staging environment.
    "load": Profile(25, 30, 12, 4, 99.0, 1_200.0),
    # Increase this only after the load profile has established a baseline.
    "stress": Profile(50, 45, 20, 8, 98.0, 2_000.0),
    # Fits comfortably into a live two-minute assessment demonstration.
    "demo": Profile(15, 10, 5, 3, 99.0, 1_500.0),
    # Five controlled writes demonstrate transaction and dependency behaviour without
    # flooding shared staging with test jobs. Requires --include-writes.
    "transactional": Profile(5, 5, 1, 2, 99.0, 2_500.0),
}

STAGING_TRANSACTIONAL_CUSTOMER_ID = "1c7f62cb-65f0-4cf1-b703-e0228b855000"
STAGING_TRANSACTIONAL_ASSET_ID = "387991bf-db14-4bbe-a595-b566f12e2495"


def read_properties(path: Path) -> dict[str, str]:
    """Read a simple KEY=VALUE file without treating it as executable code."""
    if not path.exists():
        return {}
    values: dict[str, str] = {}
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            raise ValueError(f"{path.name}:{number} must use KEY=VALUE format")
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def setting(name: str, local: dict[str, str], default: str | None = None) -> str | None:
    return os.environ.get(name) or local.get(name) or default


def find_jmeter(explicit_path: str | None) -> Path:
    candidates: list[Path] = []
    if explicit_path:
        candidates.append(Path(explicit_path))
    candidates.extend(
        [
            LOAD_DIR / "tools" / "apache-jmeter-5.6.3" / "bin" / "jmeter.bat",
            LOAD_DIR / "tools" / "apache-jmeter-5.6.3" / "bin" / "jmeter",
        ]
    )
    path_binary = shutil.which("jmeter")
    if path_binary:
        candidates.append(Path(path_binary))
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(
        "Apache JMeter was not found. Use --jmeter or restore tests/load/tools/apache-jmeter-5.6.3."
    )


def check_health(url: str) -> tuple[bool, str]:
    request = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            return response.status == 200, f"HTTP {response.status}"
    except urllib.error.HTTPError as error:
        return False, f"HTTP {error.code}"
    except urllib.error.URLError as error:
        return False, str(error.reason)


def require_api_url(name: str, value: str) -> tuple[str, str, int]:
    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.path not in ("", "/"):
        raise ValueError(f"{name} must be an HTTP(S) base URL, e.g. https://staging.example.com")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    return parsed.scheme, parsed.hostname, port


def percentile(samples: list[float], percentile_value: float) -> float:
    if not samples:
        return 0.0
    ordered = sorted(samples)
    return ordered[max(0, math.ceil(len(ordered) * percentile_value) - 1)]


def parse_results(path: Path) -> dict[str, object]:
    latencies: list[float] = []
    timestamps: list[int] = []
    failed = 0
    by_label: dict[str, dict[str, object]] = {}
    with path.open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            label = row.get("label", "unknown")
            elapsed = float(row.get("elapsed") or 0)
            timestamps.append(int(row.get("timeStamp") or 0))
            successful = (row.get("success") or "false").lower() == "true"
            latencies.append(elapsed)
            if not successful:
                failed += 1
            item = by_label.setdefault(label, {"samples": 0, "failed": 0, "latencies": []})
            item["samples"] = int(item["samples"]) + 1
            item["failed"] = int(item["failed"]) + (0 if successful else 1)
            item["latencies"].append(elapsed)  # type: ignore[index]

    sample_count = len(latencies)
    successful_count = sample_count - failed
    duration_seconds = (max(timestamps) - min(timestamps)) / 1_000 if len(timestamps) > 1 else 0.0
    labels = {
        label: {
            "samples": item["samples"],
            "failed": item["failed"],
            "success_rate": round(
                ((int(item["samples"]) - int(item["failed"])) / int(item["samples"]) * 100)
                if item["samples"]
                else 0.0,
                2,
            ),
            "p50_ms": round(percentile(item["latencies"], 0.50), 2),  # type: ignore[arg-type]
            "p95_ms": round(percentile(item["latencies"], 0.95), 2),  # type: ignore[arg-type]
            "p99_ms": round(percentile(item["latencies"], 0.99), 2),  # type: ignore[arg-type]
        }
        for label, item in by_label.items()
    }
    return {
        "samples": sample_count,
        "failed": failed,
        "success_rate": round((successful_count / sample_count * 100) if sample_count else 0.0, 2),
        "p50_ms": round(percentile(latencies, 0.50), 2),
        "p95_ms": round(percentile(latencies, 0.95), 2),
        "p99_ms": round(percentile(latencies, 0.99), 2),
        "throughput_rps": round(sample_count / duration_seconds, 2) if duration_seconds > 0 else 0.0,
        "labels": labels,
    }


def write_assessment_dashboard(path: Path, summary: dict[str, object]) -> None:
    """Keep the historic summary URL useful while the polished dashboard is canonical."""
    path.write_text(
        "<!doctype html><meta http-equiv=\"refresh\" content=\"0; url=dashboard/index.html\"><title>ASSMS performance dashboard</title><p>Opening <a href=\"dashboard/index.html\">the performance dashboard</a>…</p>",
        encoding="utf-8",
    )


PRESENTATION_CSS = """
:root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; color: #152d25; background: #eef5f1; }
* { box-sizing: border-box; } body { margin: 0; min-height: 100vh; background: radial-gradient(circle at 76% 0%, #ccefd9 0, transparent 28rem), radial-gradient(circle at 15% 100%, #e8f5d8 0, transparent 26rem), #f5f8f6; }
.app { display: grid; grid-template-columns: 250px 1fr; min-height: 100vh; } aside { color: #ecfff3; padding: 30px 18px; background: linear-gradient(165deg, #074a32, #062d24); }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 20px; margin: 0 10px 34px; }.mark { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(145deg, #63f49c, #24bd6c); color: #063b28; box-shadow: 0 8px 22px #15d77a55; }
.eyebrow { margin: 0 10px 10px; color: #8bc8a6; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; } nav { display: grid; gap: 6px; } nav a { padding: 12px 13px; border-radius: 10px; color: #c7e8d3; text-decoration: none; font-size: 14px; font-weight: 650; } nav a:hover, nav a.active { background: #eafff0; color: #075238; } .foot { position: fixed; bottom: 24px; width: 208px; color: #9ac9ad; font-size: 12px; line-height: 1.55; }
main { max-width: 1200px; width: 100%; margin: 0 auto; padding: 42px 38px 60px; } header { display: flex; align-items: start; justify-content: space-between; gap: 22px; margin-bottom: 28px; } h1 { margin: 0 0 7px; font-size: clamp(28px, 4vw, 39px); letter-spacing: -.04em; } h2 { margin: 34px 0 14px; font-size: 19px; } p { color: #5a766b; line-height: 1.55; } .badge { white-space: nowrap; padding: 9px 15px; border-radius: 99px; font-size: 13px; font-weight: 800; letter-spacing: .06em; }.pass { color: #056334; background: #d8f8e4; }.fail { color: #9c1c1c; background: #ffe4e4; }
.cards { display: grid; grid-template-columns: repeat(4, minmax(145px, 1fr)); gap: 14px; }.card, .panel { border: 1px solid #dae8e0; border-radius: 18px; background: rgba(255,255,255,.88); box-shadow: 0 12px 28px #073d2912; }.card { min-height: 116px; padding: 18px; overflow: hidden; position: relative; }.card:after { content: ''; position: absolute; width: 78px; height: 78px; border-radius: 50%; right: -23px; bottom: -34px; background: #c8f0d7; }.card:nth-child(2):after { background: #cde9f8; }.card:nth-child(3):after { background: #f9e3b9; }.card:nth-child(4):after { background: #e7d8fa; }.card small { display: block; color: #6f8a80; margin-bottom: 8px; font-size: 12px; font-weight: 700; }.card strong { display: block; font-size: 28px; letter-spacing: -.04em; position: relative; z-index: 1; }.panel { padding: 21px; }.muted { color: #668076; }.stats { display: flex; gap: 24px 42px; flex-wrap: wrap; }.stats b { color: #17382b; }
.table-wrap { overflow-x: auto; } table { border-collapse: collapse; width: 100%; min-width: 680px; font-size: 14px; } th, td { padding: 13px 12px; text-align: left; border-bottom: 1px solid #e7efeb; } tbody tr:hover { background: #f3faf5; } th { color: #5d786c; background: #f5f9f6; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; } td:first-child { font-weight: 700; } .ok { color: #087443; font-weight: 750; }.bad { color: #a52727; font-weight: 750; }
.bar-row { display: grid; grid-template-columns: minmax(180px, .9fr) minmax(230px, 2fr) 90px; gap: 16px; align-items: center; margin: 14px 0; font-size: 14px; }.track { height: 11px; overflow: hidden; border-radius: 99px; background: #e7f0eb; }.bar { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #19a766, #087a48); }.bar-label { text-align: right; font-weight: 800; }.chart { width: 100%; height: auto; display: block; }.chart text { fill: #688176; font: 12px Inter, sans-serif; }.legend { display: flex; gap: 18px; color: #607b70; font-size: 13px; }.dot { display: inline-block; width: 9px; height: 9px; border-radius: 99px; margin-right: 6px; background: #0e9a59; }.dot.amber { background: #e3a321; }.callout { border-left: 4px solid #10a75c; padding-left: 15px; }
a { color: #087b49; font-weight: 700; } @media (max-width: 800px) { .app { grid-template-columns: 1fr; } aside { padding: 16px; }.brand { margin-bottom: 15px; }.eyebrow { display:none; } nav { grid-template-columns: repeat(4, 1fr); } nav a { padding: 9px 6px; text-align: center; font-size: 11px; }.foot { display: none; } main { padding: 28px 16px 46px; }.cards { grid-template-columns: repeat(2, 1fr); } header { display: block; }.badge { display: inline-block; margin-top: 12px; }.bar-row { grid-template-columns: 1fr; gap: 7px; }.bar-label { text-align: left; } }
"""


def read_timeline(path: Path) -> list[dict[str, float]]:
    buckets: dict[int, list[float]] = {}
    failed: dict[int, int] = {}
    with path.open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            bucket = int(int(row.get("timeStamp") or 0) / 1_000)
            buckets.setdefault(bucket, []).append(float(row.get("elapsed") or 0))
            failed[bucket] = failed.get(bucket, 0) + (0 if (row.get("success") or "false").lower() == "true" else 1)
    return [
        {"samples": float(len(values)), "failed": float(failed.get(bucket, 0)), "p95": percentile(values, 0.95)}
        for bucket, values in sorted(buckets.items())
    ]


def line_chart(values: list[float], color: str, unit: str) -> str:
    width, height, padding = 900, 260, 42
    maximum = max(values, default=1.0) or 1.0
    if len(values) == 1:
        points = f"{padding},{height - padding} {width - padding},{height - padding}"
    else:
        points = " ".join(
            f"{padding + index * (width - 2 * padding) / (len(values) - 1):.1f},{height - padding - value / maximum * (height - 2 * padding):.1f}"
            for index, value in enumerate(values)
        )
    return f'''<svg class="chart" viewBox="0 0 {width} {height}" role="img" aria-label="Performance chart">
      <line x1="{padding}" y1="{height - padding}" x2="{width - padding}" y2="{height - padding}" stroke="#d9e7df" />
      <line x1="{padding}" y1="{padding}" x2="{padding}" y2="{height - padding}" stroke="#d9e7df" />
      <polyline fill="none" stroke="{color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="{points}" />
      <text x="{padding}" y="24">Peak: {maximum:.0f} {unit}</text><text x="{padding}" y="{height - 10}">0s</text><text x="{width - padding - 32}" y="{height - 10}">{max(len(values) - 1, 0)}s</text><text x="{width / 2 - 48}" y="{height - 10}">elapsed time</text>
    </svg>'''


def report_page(title: str, active: str, summary: dict[str, object], content: str) -> str:
    result = str(summary["result"])
    result_class = "pass" if result == "PASS" else "fail"
    links = [("Overview", "index.html"), ("Response times", "response-times.html"), ("Throughput", "throughput.html"), ("Timeline", "timeline.html")]
    navigation = "".join(f'<a class="{"active" if name == active else ""}" href="{target}">{name}</a>' for name, target in links)
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{html.escape(title)} · ASSMS performance</title><style>{PRESENTATION_CSS}</style></head><body><div class="app"><aside><div class="brand"><span class="mark">A</span> ASSMS</div><p class="eyebrow">Performance evidence</p><nav>{navigation}</nav><div class="foot">Profile: <b>{html.escape(str(summary['profile']))}</b><br>Started: {html.escape(str(summary['started_utc']))} UTC</div></aside><main><header><div><h1>{html.escape(title)}</h1><p>Staging performance test · {summary['samples']} total requests</p></div><div class="badge {result_class}">{result}</div></header>{content}</main></div></body></html>'''


def write_presentation_dashboard(directory: Path, summary: dict[str, object], jtl_path: Path) -> None:
    """Write a self-contained, presentation-friendly set of result pages."""
    directory.mkdir(parents=True, exist_ok=True)
    labels = {label: values for label, values in summary["labels"].items() if isinstance(values, dict)}
    rows = "".join(f"<tr><td>{html.escape(str(label))}</td><td>{values['samples']}</td><td class=\"{'ok' if values['failed'] == 0 else 'bad'}\">{values['success_rate']}%</td><td>{values['p50_ms']} ms</td><td>{values['p95_ms']} ms</td><td>{values['p99_ms']} ms</td></tr>" for label, values in labels.items())
    cards = f'''<section class="cards"><div class="card"><small>Success rate</small><strong>{summary['success_rate']}%</strong></div><div class="card"><small>Overall p95</small><strong>{summary['p95_ms']} ms</strong></div><div class="card"><small>Overall p99</small><strong>{summary['p99_ms']} ms</strong></div><div class="card"><small>Throughput</small><strong>{summary['throughput_rps']} rps</strong></div></section>'''
    table = f'<section class="panel table-wrap"><table><thead><tr><th>Endpoint / workflow step</th><th>Requests</th><th>Success</th><th>p50</th><th>p95</th><th>p99</th></tr></thead><tbody>{rows}</tbody></table></section>'
    overview = cards + f'''<h2>Run summary</h2><section class="panel"><div class="stats"><div><b>{summary['failed']}</b> failed requests</div><div>Required success rate: <b>{summary['thresholds']['min_success_rate']}%</b></div><div>p95 target: <b>{summary['thresholds']['max_p95_ms']} ms</b></div></div></section><h2>Endpoint breakdown</h2>{table}'''
    max_p95 = max((float(values['p95_ms']) for values in labels.values()), default=1.0) or 1.0
    bars = "".join(f'''<div class="bar-row"><b>{html.escape(str(label))}</b><div class="track"><div class="bar" style="width:{float(values['p95_ms']) / max_p95 * 100:.1f}%"></div></div><span class="bar-label">{values['p95_ms']} ms</span></div>''' for label, values in labels.items())
    response = cards + f'<h2>p95 response time by endpoint</h2><section class="panel">{bars}</section><h2>Full latency table</h2>{table}'
    timeline = read_timeline(jtl_path)
    requests = [point['samples'] for point in timeline]
    p95_values = [point['p95'] for point in timeline]
    throughput = cards + f'<h2>Requests completed over time</h2><section class="panel"><div class="legend"><span><i class="dot"></i>Requests per second</span></div>{line_chart(requests, "#0e9a59", "requests")}</section>'
    over_time = cards + f'<h2>p95 latency over time</h2><section class="panel"><div class="legend"><span><i class="dot amber"></i>p95 latency per second</span></div>{line_chart(p95_values, "#e3a321", "ms")}</section><h2>Endpoint detail</h2>{table}'
    pages = {"index.html": ("Performance overview", "Overview", overview), "response-times.html": ("Response times", "Response times", response), "throughput.html": ("Throughput", "Throughput", throughput), "timeline.html": ("Latency timeline", "Timeline", over_time)}
    for filename, (title, active, content) in pages.items():
        (directory / filename).write_text(report_page(title, active, summary, content), encoding="utf-8")


def properties_for_urls(local: dict[str, str]) -> tuple[dict[str, str], dict[str, str]]:
    endpoints = {
        "customer": setting("ASSMS_CUSTOMER_API_URL", local, "http://127.0.0.1:5037"),
        "job": setting("ASSMS_JOB_API_URL", local, "http://127.0.0.1:5252"),
        "dispatch": setting("ASSMS_DISPATCH_API_URL", local, "http://127.0.0.1:5055"),
        "reporting": setting("ASSMS_REPORTING_API_URL", local, "http://127.0.0.1:5238"),
    }
    jmeter: dict[str, str] = {}
    health: dict[str, str] = {}
    protocols: set[str] = set()
    for name, endpoint in endpoints.items():
        assert endpoint is not None
        protocol, host, port = require_api_url(f"ASSMS_{name.upper()}_API_URL", endpoint)
        protocols.add(protocol)
        jmeter[f"{name}_host"] = host
        jmeter[f"{name}_port"] = str(port)
        health[name] = f"{protocol}://{host}:{port}/api/health"
    if len(protocols) != 1:
        raise ValueError("All service base URLs must use the same protocol (all HTTP or all HTTPS) for this test plan.")
    jmeter["protocol"] = protocols.pop()
    return jmeter, health


def run(args: argparse.Namespace) -> int:
    profile = PROFILES[args.profile]
    local = read_properties(LOCAL_PROPERTIES)
    if args.include_writes and args.profile != "transactional":
        print("--include-writes may only be used with the controlled transactional profile.", file=sys.stderr)
        return 2
    if args.profile == "transactional" and not args.include_writes:
        print("The transactional profile creates staging jobs. Re-run with --include-writes after confirming the dedicated test data.", file=sys.stderr)
        return 2
    if args.include_writes and (args.users or profile.users) > 5:
        print("The transactional profile is capped at five virtual users to limit created staging jobs.", file=sys.stderr)
        return 2
    if args.include_writes and (args.loops or profile.loops) != 1:
        print("The transactional profile must use exactly one business loop per user.", file=sys.stderr)
        return 2
    identifier = args.identifier or setting("ASSMS_LOAD_LOGIN_IDENTIFIER", local)
    password = setting("ASSMS_LOAD_LOGIN_PASSWORD", local)
    if not identifier or not password or password == "replace-with-a-local-test-password":
        print("Set ASSMS_LOAD_LOGIN_IDENTIFIER and ASSMS_LOAD_LOGIN_PASSWORD in your environment or load-test.properties.", file=sys.stderr)
        return 2

    try:
        jmeter_path = find_jmeter(args.jmeter)
        url_properties, health_urls = properties_for_urls(local)
    except (FileNotFoundError, ValueError) as error:
        print(error, file=sys.stderr)
        return 2

    if not args.skip_preflight:
        print("Pre-flight health checks")
        unhealthy = []
        for name, url in health_urls.items():
            ok, detail = check_health(url)
            print(f"  {'PASS' if ok else 'FAIL'}  {name:<10} {detail}")
            if not ok:
                unhealthy.append(name)
        if unhealthy:
            print("Start the failed services before running the performance suite.", file=sys.stderr)
            return 2

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = RESULTS_DIR / f"{args.profile}-{timestamp}"
    report_dir = run_dir / "dashboard"
    native_report_dir = run_dir / "jmeter-dashboard"
    jtl_path = run_dir / "results.jtl"
    run_dir.mkdir(parents=True, exist_ok=False)

    properties = {
        **url_properties,
        "users": str(args.users or profile.users),
        "ramp_up": str(args.ramp_up or profile.ramp_up),
        "loops": str(args.loops or profile.loops),
        "auth_users": str(args.users or profile.users),
        "auth_loops": str(profile.auth_loops),
        "login_identifier": identifier,
        "login_password": password,
        "enable_job_create": str(args.include_writes).lower(),
        "test_customer_id": setting("ASSMS_LOAD_TEST_CUSTOMER_ID", local, STAGING_TRANSACTIONAL_CUSTOMER_ID) or "",
        "test_asset_id": setting("ASSMS_LOAD_TEST_ASSET_ID", local, STAGING_TRANSACTIONAL_ASSET_ID) or "",
    }
    command = [str(jmeter_path), "-n", "-t", str(PLAN_FILE), "-l", str(jtl_path), "-e", "-o", str(native_report_dir)]
    command.extend(f"-J{key}={value}" for key, value in properties.items())

    print(f"Running {args.profile} profile: {properties['users']} users, {properties['loops']} business loops, {properties['ramp_up']}s ramp-up")
    completed = subprocess.run(command, cwd=LOAD_DIR, check=False)
    if completed.returncode != 0 or not jtl_path.exists():
        print(f"JMeter did not complete successfully. See {run_dir}", file=sys.stderr)
        return completed.returncode or 1

    summary = parse_results(jtl_path)
    summary.update(
        {
            "profile": args.profile,
            "started_utc": timestamp,
            "thresholds": {"min_success_rate": profile.min_success_rate, "max_p95_ms": profile.max_p95_ms},
        }
    )
    passed = summary["samples"] > 0 and summary["success_rate"] >= profile.min_success_rate and summary["p95_ms"] <= profile.max_p95_ms
    summary["result"] = "PASS" if passed else "FAIL"
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    assessment_dashboard = run_dir / "performance-summary.html"
    write_assessment_dashboard(assessment_dashboard, summary)
    write_presentation_dashboard(report_dir, summary, jtl_path)
    print("\nPerformance summary")
    print(f"  Samples:      {summary['samples']}")
    print(f"  Success rate: {summary['success_rate']}% (minimum {profile.min_success_rate}%)")
    print(f"  p50 / p95 / p99: {summary['p50_ms']} / {summary['p95_ms']} / {summary['p99_ms']} ms")
    print(f"  Throughput:   {summary['throughput_rps']} requests/second")
    print(f"  Summary:      {assessment_dashboard}")
    print(f"  Dashboard:    {report_dir / 'index.html'}")
    print(f"  JMeter detail:{native_report_dir / 'index.html'}")
    print(f"  Result:       {'PASS' if passed else 'FAIL'}")
    return 0 if passed else 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run ASSMS JMeter performance tests.")
    parser.add_argument("--profile", choices=PROFILES, default="smoke")
    parser.add_argument("--identifier", help="Overrides ASSMS_LOAD_LOGIN_IDENTIFIER; prefer the environment variable in shared terminals.")
    parser.add_argument("--users", type=int, help="Overrides the profile's virtual-user count.")
    parser.add_argument("--ramp-up", type=int, help="Overrides the profile's ramp-up seconds.")
    parser.add_argument("--loops", type=int, help="Overrides the profile's business-workload loops per user.")
    parser.add_argument("--jmeter", help="Path to jmeter or jmeter.bat.")
    parser.add_argument("--skip-preflight", action="store_true", help="Skip HTTP health checks when running against a remote test environment.")
    parser.add_argument(
        "--include-writes",
        action="store_true",
        help="Enable the capped transactional profile to create jobs against dedicated staging test customer/asset IDs.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    sys.exit(run(parse_args()))
