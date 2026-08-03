from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
PLAN_DIR = (
    ROOT / "content" / "reconstruction" / "plans"
)
SNAPSHOT_METADATA = (
    ROOT
    / "content"
    / "structure"
    / "current"
    / "snapshot-metadata.json"
)
MIGRATION_SQL = (
    ROOT
    / "supabase"
    / "migrations"
    / "20260803033000_content_staging_foundation.sql"
)
PREFLIGHT_SQL = (
    ROOT
    / "supabase"
    / "audits"
    / "content_migration_preflight.sql"
)
LANGUAGE_CONTRACT = (
    ROOT
    / "content"
    / "migration"
    / "reader-language-contract.json"
)
OUTPUT_JSON = (
    ROOT
    / "content"
    / "migration"
    / "staging-foundation-manifest.json"
)
OUTPUT_MD = (
    ROOT
    / "content"
    / "migration"
    / "reports"
    / "staging-foundation-summary.md"
)

BOOK_SLUGS = [
    "o-livro-dos-espiritos",
    "o-livro-dos-mediuns",
    "o-evangelho-segundo-o-espiritismo",
    "o-ceu-e-o-inferno",
    "a-genese",
]


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as source:
        for chunk in iter(
            lambda: source.read(1024 * 1024),
            b"",
        ):
            digest.update(chunk)

    return digest.hexdigest()


def build_manifest() -> dict[str, Any]:
    snapshot = read_json(SNAPSHOT_METADATA)
    plans = []

    total_decisions = 0
    total_manual_review = 0
    total_blocked_progress = 0
    strategies: Counter[str] = Counter()

    for slug in BOOK_SLUGS:
        plan_path = PLAN_DIR / f"{slug}.json"
        plan = read_json(plan_path)
        summary = plan["summary"]

        decisions = summary["current_section_count"]
        manual_review = summary["manual_review_count"]
        blocked_progress = summary[
            "blocked_progress_mapping_count"
        ]

        total_decisions += decisions
        total_manual_review += manual_review
        total_blocked_progress += blocked_progress
        strategies[plan["strategy"]] += 1

        plans.append(
            {
                "book": plan["book"],
                "strategy": plan["strategy"],
                "plan_sha256": sha256_file(plan_path),
                "decision_count": decisions,
                "manual_review_count": manual_review,
                "blocked_progress_mapping_count": (
                    blocked_progress
                ),
                "migration_blocker_count": len(
                    plan["migration_blockers"]
                ),
            }
        )

    return {
        "schema_version": 1,
        "status": "blocked-not-applied",
        "database_scope": "private-content-staging",
        "production_mutation_allowed": False,
        "cutover_allowed": False,
        "source_snapshot": {
            "row_count": snapshot["row_count"],
            "sha256": snapshot["sha256"],
            "contains_full_text": snapshot[
                "contains_full_text"
            ],
            "contains_user_data": snapshot[
                "contains_user_data"
            ],
        },
        "artifacts": {
            "migration_sql_sha256": sha256_file(
                MIGRATION_SQL
            ),
            "preflight_sql_sha256": sha256_file(
                PREFLIGHT_SQL
            ),
            "reader_language_contract_sha256": (
                sha256_file(LANGUAGE_CONTRACT)
            ),
        },
        "terminology": {
            "legacy_database_unit": "section",
            "canonical_source_unit": "editorial_node",
            "future_reader_unit": "reading_segment",
            "user_facing_unit_when_required": "trecho",
            "primary_navigation_action": "Continuar",
        },
        "totals": {
            "book_count": len(plans),
            "current_section_decision_count": (
                total_decisions
            ),
            "manual_review_count": (
                total_manual_review
            ),
            "blocked_progress_mapping_count": (
                total_blocked_progress
            ),
            "strategy_counts": dict(
                sorted(strategies.items())
            ),
        },
        "plans": plans,
        "required_before_application": [
            "review migration SQL",
            "run read-only production preflight",
            "confirm staging schema isolation",
            "confirm aggregate dependency policy",
        ],
        "required_before_cutover": [
            "redistribution rights resolved",
            "reading-segment boundaries approved",
            "content checksums verified",
            "all mapping reviews approved",
            "dependency snapshot captured",
            "dry run passes with zero blocking failures",
            "rollback transaction rehearsed",
        ],
    }


def build_markdown(
    manifest: dict[str, Any],
) -> str:
    totals = manifest["totals"]

    lines = [
        "# Content Staging Foundation",
        "",
        "PR-0014 defines a private, non-production database workspace.",
        "",
        f"- Status: `{manifest['status']}`",
        f"- Production mutation allowed: `{manifest['production_mutation_allowed']}`",
        f"- Cutover allowed: `{manifest['cutover_allowed']}`",
        f"- Current structural snapshot rows: `{manifest['source_snapshot']['row_count']}`",
        f"- Section decisions represented: `{totals['current_section_decision_count']}`",
        f"- Manual-review decisions: `{totals['manual_review_count']}`",
        f"- Blocked progress mappings: `{totals['blocked_progress_mapping_count']}`",
        "",
        "## Per-work staging strategy",
        "",
        "| Work | Strategy | Decisions | Manual review | Blocked progress |",
        "| --- | --- | ---: | ---: | ---: |",
    ]

    for plan in manifest["plans"]:
        lines.append(
            "| "
            + " | ".join(
                [
                    plan["book"]["title"],
                    plan["strategy"],
                    str(plan["decision_count"]),
                    str(plan["manual_review_count"]),
                    str(
                        plan[
                            "blocked_progress_mapping_count"
                        ]
                    ),
                ]
            )
            + " |"
        )

    lines.extend(
        [
            "",
            "## Reader terminology decision",
            "",
            "- `section`: legacy database record during migration.",
            "- `editorial_node`: canonical source structure.",
            "- `reading_segment`: future technical Reader unit.",
            "- `trecho`: user-facing noun only when a noun is necessary.",
            "- Primary visible navigation action: `Continuar`.",
            "",
            "## Safety boundary",
            "",
            "- The generated migration creates only `content_staging` objects.",
            "- Application roles receive no staging access.",
            "- Production content tables are referenced but not modified.",
            "- Dependency snapshots store aggregate counts only.",
            "- No cutover function is included.",
            "- No destructive rollback command is included.",
            "",
        ]
    )

    return "\n".join(lines)


def main() -> None:
    manifest = build_manifest()

    OUTPUT_JSON.write_text(
        json.dumps(
            manifest,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    OUTPUT_MD.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    OUTPUT_MD.write_text(
        build_markdown(manifest) + "\n",
        encoding="utf-8",
    )

    print(f"Manifest: {OUTPUT_JSON}")
    print(f"Summary: {OUTPUT_MD}")
    print()
    print(
        "Staging foundation prepared. "
        "No Supabase migration was applied."
    )


if __name__ == "__main__":
    main()
