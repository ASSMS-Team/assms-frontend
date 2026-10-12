$ErrorActionPreference = 'Stop'
$workspacePath = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$runId = 'unit-mocks-' + (Get-Date -Format 'yyyyMMddTHHmmss')
$resultsPath = Join-Path $PSScriptRoot ('artifacts/' + $runId)
New-Item -ItemType Directory -Path $resultsPath -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'local/SOURCE_REVISIONS.json') -Destination (Join-Path $resultsPath 'SOURCE_REVISIONS.json')
$projects = @{
    'assms-customer-asset-service' = 'CustomerAssetService.Tests'
    'assms-job-service' = 'JobService.Tests'
    'assms-dispatch-service' = 'DispatchService.Tests'
    'assms-reporting-service' = 'ReportingService.Tests'
}
$summary = @()
foreach ($repository in $projects.Keys) {
    $sourcePath = Join-Path $workspacePath $repository
    $suitePath = Join-Path $resultsPath $repository
    New-Item -ItemType Directory -Path $suitePath -Force | Out-Null
    $projectName = $projects[$repository]
    $testPath = "tests/$projectName/$projectName.csproj"
    docker run --rm --mount "type=bind,source=$sourcePath,target=/workspace" --mount "type=bind,source=$suitePath,target=/results" -w /workspace mcr.microsoft.com/dotnet/sdk:8.0 dotnet test $testPath --logger 'trx;LogFileName=results.trx' --results-directory /results --collect 'XPlat Code Coverage' 2>&1 | Tee-Object -FilePath (Join-Path $suitePath 'runner.log')
    $code = $LASTEXITCODE
    $passed = 0; $failed = 0; $skipped = 0
    $trxPath = Join-Path $suitePath 'results.trx'
    if (Test-Path -LiteralPath $trxPath) {
        [xml]$trx = Get-Content -Raw -LiteralPath $trxPath
        $counters = $trx.SelectSingleNode("//*[local-name()='Counters']")
        $passed = [int]$counters.passed; $failed = [int]$counters.failed
        $skipped = $trx.SelectNodes("//*[local-name()='UnitTestResult' and @outcome='NotExecuted']").Count
    }
    $summary += [pscustomobject]@{repository=$repository; exitCode=$code; passed=$passed; failed=$failed; skipped=$skipped; status=$(if ($code -eq 0) {'Pass'} else {'Fail'})}
}
$summary | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $resultsPath 'results.json')
$summary | Format-Table
Write-Host "Unit/mocked evidence: $resultsPath"
if ($summary.Where({$_.exitCode -ne 0}).Count -gt 0) { exit 1 }
