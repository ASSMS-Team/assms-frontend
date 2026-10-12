$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
docker info --format '{{.OSType}}'
if ($LASTEXITCODE -ne 0) { throw 'Start Docker Desktop using Linux containers.' }
$pythonPath = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) {
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.10+ is required.' }
    & $pythonPath -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'QA dependency installation failed.' }
}
& $pythonPath setup_local_config.py
if ($LASTEXITCODE -ne 0) { throw 'Local configuration setup failed.' }
docker compose --env-file local/.env -f local/compose.yaml up -d --build
if ($LASTEXITCODE -ne 0) { throw 'Docker startup failed; inspect Compose logs.' }
$deadline = (Get-Date).AddMinutes(3)
$ready = $false
while ((Get-Date) -lt $deadline) {
    try {
        $response = Invoke-WebRequest -Uri 'http://localhost:8081/login' -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
}
if (-not $ready) { throw 'Frontend did not become ready; inspect frontend logs.' }
& $pythonPath run_smoke.py
if ($LASTEXITCODE -ne 0) { throw 'Smoke checks failed; review artifacts before running dependent suites.' }
Write-Host 'Smoke passed. Open http://localhost:8081/login. Next: .\.venv\Scripts\python.exe prepare_fixtures.py'
