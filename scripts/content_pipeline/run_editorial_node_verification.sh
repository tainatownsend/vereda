#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Uso:"
  echo "  bash scripts/content_pipeline/run_editorial_node_verification.sh <csv-path>"
  exit 1
fi

CSV_PATH="$1"
OUTPUT="$HOME/Downloads/vereda_pr_0017_editorial_node_load.txt"

npm run content:staging:nodes:verify:import -- "$CSV_PATH"
npm run content:staging:nodes:verify:validate
npm run content:staging:nodes:validate
npm run test:run
npm run lint
npm run build

{
  echo "VEREDA — PR-0017 EDITORIAL NODE STAGING LOAD"
  echo "Generated at: $(date)"
  echo "Branch: $(git branch --show-current)"
  echo "Commit base: $(git rev-parse HEAD)"
  echo
  cat content/migration/reports/editorial-node-load-verification.md
  echo
  echo "============================================================"
  echo "APPLICATION BOUNDARY"
  echo "============================================================"
  echo "Migration run created: YES"
  echo "Canonical editorial nodes loaded: YES"
  echo "Full book text loaded: NO"
  echo "Reading segments loaded: NO"
  echo "Successor mappings loaded: NO"
  echo "Dependency snapshot captured: NO"
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
