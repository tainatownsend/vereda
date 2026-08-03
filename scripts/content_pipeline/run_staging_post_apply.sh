#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Uso:"
  echo "  bash scripts/content_pipeline/run_staging_post_apply.sh <csv-path>"
  exit 1
fi

CSV_PATH="$1"
OUTPUT="$HOME/Downloads/vereda_pr_0016_staging_post_apply.txt"

npm run content:staging:post-apply:import -- "$CSV_PATH"
npm run content:staging:post-apply:validate
npm run test:run
npm run lint
npm run build

{
  echo "VEREDA — PR-0016 STAGING POST-APPLICATION EVIDENCE"
  echo "Generated at: $(date)"
  echo "Branch: $(git branch --show-current)"
  echo "Commit base: $(git rev-parse HEAD)"
  echo
  cat content/migration/reports/staging-post-apply-summary.md
  echo
  echo "============================================================"
  echo "APPLICATION BOUNDARY"
  echo "============================================================"
  echo "Private staging foundation applied: YES"
  echo "Staging content loaded: NO"
  echo "Production content modified: NO"
  echo "Progress migrated: NO"
  echo "Reading sessions rewritten: NO"
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
echo "Ainda não faça commit."
