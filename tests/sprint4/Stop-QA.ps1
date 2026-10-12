$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
docker compose --env-file local/.env -f local/compose.yaml down
if ($LASTEXITCODE -ne 0) { throw 'Could not stop the QA containers.' }
Write-Host 'QA stopped. MySQL and Kafka data volumes are preserved.'
