#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Uso:"
  echo "  bash scripts/content_pipeline/run_staging_preflight.sh <csv-path>"
  exit 1
fi

CSV_PATH="$1"
OUTPUT="$HOME/Downloads/vereda_pr_0016_staging_preflight.txt"

npm run content:staging:preflight:import -- "$CSV_PATH"
npm run content:staging:preflight:validate
npm run test:run
npm run lint
npm run build

{
  echo "VEREDA — PR-0016 STAGING APPLICATION PREFLIGHT"
  echo "Generated at: $(date)"
  echo "Branch: $(git branch --show-current)"
  echo "Commit base: $(git rev-parse HEAD)"
  echo
  cat content/migration/reports/staging-preflight-summary.md
  echo
  echo "============================================================"
  echo "STAGING MIGRATION STATUS"
  echo "============================================================"
  echo "Migration applied by this workflow: NO"
  echo "Production content modified: NO"
  echo "Cutover enabled: NO"
  echo
  echo "============================================================"
  echo "GIT STATUS"
  echo "============================================================"
  git status --short
} > "$OUTPUT"

echo
echo "Relatório criado:"
echo "  $OUTPUT"
echo
echo "A migration continua não aplicada."
echo "Ainda não faça commit."
