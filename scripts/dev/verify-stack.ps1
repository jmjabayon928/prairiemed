Write-Host "=== Docker containers (key services) ===" -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | findstr /I "postgres redis redpanda mailpit mongo billing audit invoice"

Write-Host "`n=== Redpanda topics ===" -ForegroundColor Cyan
$rpk = (Get-Command rpk -ErrorAction SilentlyContinue)
if ($null -eq $rpk) {
  Write-Warning "rpk not found. Install Redpanda CLI to inspect topics/groups."
} else {
  rpk topic list
  Write-Host "`n=== Redpanda consumer groups ===" -ForegroundColor Cyan
  rpk group list
}

Write-Host "`n=== Billing health ===" -ForegroundColor Cyan
try {
  $health = iwr http://localhost:8081/actuator/health -UseBasicParsing -TimeoutSec 5
  Write-Host $health.Content
} catch {
  Write-Warning "Billing /actuator/health unreachable."
}

Write-Host "`n=== GraphQL ping ===" -ForegroundColor Cyan
try {
  $body = (@{ query = "{ __typename }" } | ConvertTo-Json)
  $ping = iwr http://localhost:4000/graphql -UseBasicParsing -TimeoutSec 5 -Method POST -ContentType "application/json" -Body $body -Headers @{ Authorization = "Bearer dev-admin" }
  Write-Host "GraphQL OK"
} catch {
  Write-Warning "GraphQL endpoint unreachable."
}

Write-Host "`n=== Mailpit UI ===" -ForegroundColor Cyan
Write-Host "Open http://localhost:8025 to view emails."
