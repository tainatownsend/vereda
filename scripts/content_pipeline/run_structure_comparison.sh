#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Uso:"
  echo "  bash scripts/content_pipeline/run_structure_comparison.sh <csv-path>"
  exit 1
fi

CSV_PATH="$1"

npm run content:comparison:import -- "$CSV_PATH"
npm run content:comparison:run
npm run content:comparison:validate
npm run content:comparison:test
npm run test:run
npm run lint
npm run build

OUTPUT="$HOME/Downloads/vereda_pr_0012_structure_comparison.txt"

{
  echo "VEREDA — PR-0012 STRUCTURE COMPARISON"
  echo "Generated at: $(date)"
  echo "Branch: $(git branch --show-current)"
  echo "Commit base: $(git rev-parse HEAD)"
  echo
  cat content/structure/comparisons/comparison-summary.md
  echo
  echo "============================================================"
  echo "CURRENT SNAPSHOT METADATA"
  echo "============================================================"
  cat content/structure/current/snapshot-metadata.json
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
