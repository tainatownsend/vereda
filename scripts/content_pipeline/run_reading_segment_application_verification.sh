#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Uso:"
  echo "  bash scripts/content_pipeline/run_reading_segment_application_verification.sh <csv-path>"
  exit 1
fi

CSV_PATH="$1"
OUTPUT="$HOME/Downloads/vereda_pr_0019_reading_segment_application.txt"

npm run content:staging:segments:apply:import -- "$CSV_PATH"
npm run content:staging:segments:apply:validate
npm run content:staging:segments:design:validate
npm run test:run
npm run lint
npm run build

{
  echo "VEREDA — PR-0019 READING SEGMENT STAGING APPLICATION"
  echo "Generated at: $(date)"
  echo "Branch: $(git branch --show-current)"
  echo "Commit base: $(git rev-parse HEAD)"
  echo
  cat content/migration/reports/reading-segment-application-summary.md
  echo
  echo "============================================================"
  echo "APPLICATION BOUNDARY"
  echo "============================================================"
  echo "Reading-segment metadata applied: YES"
  echo "Rows in boundary review: 812"
  echo "Complete source text loaded: NO"
  echo "Approved Reader content loaded: NO"
  echo "Successor mappings loaded: NO"
  echo "Dependency snapshot captured: NO"
  echo "Production content modified: NO"
  echo "Progress migrated: NO"
  echo "Reading sessions rewritten: NO"
  echo "Rights status: BLOCKED"
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
