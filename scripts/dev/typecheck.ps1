param(
  [switch]$Watch
)

$project = "tsconfig.typecheck.json"

Write-Host "🔎 Running TypeScript typecheck ($project)..." -ForegroundColor Cyan

if ($Watch) {
  pnpm exec tsc -p $project --noEmit -w
} else {
  pnpm exec tsc -p $project --noEmit
}

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Typecheck passed" -ForegroundColor Green
} else {
  Write-Host "❌ Typecheck failed with exit code $LASTEXITCODE" -ForegroundColor Red
  exit $LASTEXITCODE
}
