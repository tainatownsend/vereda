from __future__ import annotations

import csv
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
COMPARISON_DIR = (
    ROOT / "content" / "structure" / "comparisons"
)
CANONICAL_DIR = (
    ROOT / "content" / "structure" / "source-maps"
)
OUTPUT_DIR = (
    ROOT / "content" / "reconstruction" / "plans"
)
REPORT_DIR = (
    ROOT / "content" / "reconstruction" / "reports"
)

SUMMARY_JSON = REPORT_DIR / "reconstruction-plan-summary.json"
SUMMARY_MD = REPORT_DIR / "reconstruction-plan-summary.md"
DECISIONS_CSV = REPORT_DIR / "current-section-decisions.csv"
COVERAGE_CSV = REPORT_DIR / "canonical-node-coverage.csv"
REVIEW_QUEUE_CSV = REPORT_DIR / "manual-review-queue.csv"

BOOKS = [
    (1, "o-livro-dos-espiritos"),
    (2, "o-livro-dos-mediuns"),
    (3, "o-evangelho-segundo-o-espiritismo"),
    (4, "o-ceu-e-o-inferno"),
    (5, "a-genese"),
]

ACTION_REASONS = {
    "keep": (
        "The current record is structurally aligned with a "
        "canonical editorial node."
    ),
    "relabel-review": (
        "The current record likely matches a canonical node, "
        "but its title requires manual confirmation."
    ),
    "reclassify": (
        "The record likely represents front matter, back matter, "
        "or a major division stored as regular content."
    ),
    "split": (
        "The current record appears to aggregate a larger "
        "editorial unit and requires approved successor boundaries."
    ),
    "review": (
        "No sufficiently reliable canonical relationship was found."
    ),
}

PROGRESS_STRATEGIES = {
    "keep": "retain-current-section-until-cutover",
    "relabel-review": (
        "retain-current-section-id-if-boundary-unchanged"
    ),
    "reclassify": (
        "retain-current-section-id-if-boundary-unchanged"
    ),
    "split": "map-current-progress-to-first-unread-successor",
    "review": "block-migration",
}


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


def provisional_segment_key(
    book_slug: str,
    canonical_source_key: str | None,
) -> str | None:
    if not canonical_source_key:
        return None

    payload = (
        f"{book_slug}|{canonical_source_key}|"
        "segment|1|boundary-version-1"
    )
    return hashlib.sha256(
        payload.encode("utf-8")
    ).hexdigest()[:20]


def manual_review_required(
    action: str,
    confidence: str,
) -> bool:
    return not (
        action == "keep"
        and confidence in {"exact", "chapter"}
    )


def select_strategy(
    *,
    split_count: int,
    review_count: int,
    canonical_only_count: int,
) -> str:
    if (
        split_count >= 25
        or review_count >= 10
        or canonical_only_count >= 20
    ):
        return "full-staging-reconstruction"

    if (
        split_count
        or review_count
        or canonical_only_count
    ):
        return "targeted-staging-reconstruction"

    return "metadata-alignment"


def build_decision(
    book_slug: str,
    mapping: dict[str, Any],
) -> dict[str, Any]:
    action = mapping["recommended_action"]
    confidence = mapping["confidence"]
    requires_review = manual_review_required(
        action,
        confidence,
    )

    direct_key_allowed = (
        action in {
            "keep",
            "relabel-review",
            "reclassify",
        }
        and mapping.get("canonical_source_key")
        is not None
    )

    return {
        "decision_id": (
            f"{book_slug}:current:"
            f"{mapping['current_section_id']}"
        ),
        "current_section_id": mapping[
            "current_section_id"
        ],
        "current_sec_position": mapping[
            "current_sec_position"
        ],
        "current_kind": mapping["current_kind"],
        "current_part_title": mapping.get(
            "current_part_title"
        ),
        "current_chapter_label": mapping.get(
            "current_chapter_label"
        ),
        "current_chapter_title": mapping.get(
            "current_chapter_title"
        ),
        "current_section_title": mapping.get(
            "current_section_title"
        ),
        "stored_word_count": mapping[
            "stored_word_count"
        ],
        "canonical_node_id": mapping.get(
            "canonical_node_id"
        ),
        "canonical_source_key": mapping.get(
            "canonical_source_key"
        ),
        "canonical_node_type": mapping.get(
            "canonical_node_type"
        ),
        "canonical_title": mapping.get(
            "canonical_title"
        ),
        "confidence": confidence,
        "score": mapping["score"],
        "action": action,
        "manual_review_required": requires_review,
        "progress_strategy": PROGRESS_STRATEGIES[
            action
        ],
        "provisional_segment_key": (
            provisional_segment_key(
                book_slug,
                mapping.get(
                    "canonical_source_key"
                ),
            )
            if direct_key_allowed
            else None
        ),
        "segment_key_status": (
            "proposed-not-production"
            if direct_key_allowed
            else "blocked-pending-boundaries"
        ),
        "reason": ACTION_REASONS[action],
    }


def build_coverage(
    canonical_map: dict[str, Any],
    decisions: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    by_node: dict[
        str,
        list[dict[str, Any]],
    ] = defaultdict(list)

    for decision in decisions:
        node_id = decision.get(
            "canonical_node_id"
        )

        if node_id:
            by_node[node_id].append(decision)

    coverage = []

    for node in canonical_map["nodes"]:
        linked = by_node.get(node["id"], [])
        actions = Counter(
            decision["action"]
            for decision in linked
        )

        if not linked:
            status = "missing-current-unit"
        elif len(linked) > 1:
            status = "multiple-current-records"
        elif actions.get("split"):
            status = "aggregate-needs-split"
        elif actions.get("review"):
            status = "relationship-blocked"
        elif actions.get("relabel-review"):
            status = "covered-title-review"
        elif actions.get("reclassify"):
            status = "covered-role-review"
        else:
            status = "covered"

        coverage.append(
            {
                "canonical_node_id": node["id"],
                "canonical_source_key": node[
                    "source_key"
                ],
                "canonical_node_type": node["type"],
                "canonical_title": node["title"],
                "canonical_parent_id": node.get(
                    "parent_id"
                ),
                "canonical_order": node["order"],
                "coverage_status": status,
                "linked_current_section_ids": [
                    decision["current_section_id"]
                    for decision in linked
                ],
                "linked_current_count": len(
                    linked
                ),
                "linked_actions": dict(
                    sorted(actions.items())
                ),
            }
        )

    return coverage


def build_blockers(
    decisions: list[dict[str, Any]],
    coverage: list[dict[str, Any]],
) -> list[str]:
    blockers = []

    if any(
        decision["action"] == "review"
        for decision in decisions
    ):
        blockers.append(
            "Unmatched current records require manual "
            "source comparison."
        )

    if any(
        decision["action"] == "split"
        for decision in decisions
    ):
        blockers.append(
            "Split candidates do not yet have verified "
            "successor content boundaries."
        )

    if any(
        item["coverage_status"]
        == "missing-current-unit"
        for item in coverage
    ):
        blockers.append(
            "Canonical units without direct current coverage "
            "require staging reconstruction."
        )

    if any(
        item["coverage_status"]
        == "multiple-current-records"
        for item in coverage
    ):
        blockers.append(
            "Many-to-one relationships require explicit merge "
            "and completion rules."
        )

    blockers.extend(
        [
            "Production redistribution rights remain unresolved.",
            "Content-level checksums have not been compared.",
            "Active progress and session dependency counts have "
            "not been joined to the candidate mappings.",
            "Rollback tables and cutover transactions have not "
            "been designed or executed.",
        ]
    )

    return blockers


def build_plan(
    comparison_path: Path,
    canonical_path: Path,
) -> dict[str, Any]:
    comparison = read_json(comparison_path)
    canonical_map = read_json(canonical_path)
    book = comparison["book"]
    slug = book["slug"]

    decisions = [
        build_decision(slug, mapping)
        for mapping in comparison["mappings"]
    ]
    coverage = build_coverage(
        canonical_map,
        decisions,
    )

    action_counts = Counter(
        decision["action"]
        for decision in decisions
    )
    coverage_counts = Counter(
        item["coverage_status"]
        for item in coverage
    )

    manual_review_count = sum(
        1
        for decision in decisions
        if decision["manual_review_required"]
    )
    direct_provisional_count = sum(
        1
        for decision in decisions
        if decision["provisional_segment_key"]
    )
    blocked_progress_count = sum(
        1
        for decision in decisions
        if decision["progress_strategy"]
        == "block-migration"
    )

    strategy = select_strategy(
        split_count=action_counts.get(
            "split",
            0,
        ),
        review_count=action_counts.get(
            "review",
            0,
        ),
        canonical_only_count=coverage_counts.get(
            "missing-current-unit",
            0,
        ),
    )

    summary = {
        "current_section_count": len(decisions),
        "canonical_node_count": len(coverage),
        "action_counts": dict(
            sorted(action_counts.items())
        ),
        "coverage_counts": dict(
            sorted(coverage_counts.items())
        ),
        "manual_review_count": (
            manual_review_count
        ),
        "direct_provisional_mapping_count": (
            direct_provisional_count
        ),
        "blocked_progress_mapping_count": (
            blocked_progress_count
        ),
    }

    return {
        "schema_version": 1,
        "status": "diagnostic-plan",
        "book": book,
        "inputs": {
            "comparison_sha256": sha256_file(
                comparison_path
            ),
            "canonical_map_sha256": (
                sha256_file(canonical_path)
            ),
        },
        "strategy": strategy,
        "summary": summary,
        "current_section_decisions": decisions,
        "canonical_coverage": coverage,
        "migration_blockers": build_blockers(
            decisions,
            coverage,
        ),
    }


def write_decisions_csv(
    plans: list[dict[str, Any]],
) -> None:
    fields = [
        "book_id",
        "book_title",
        "strategy",
        "decision_id",
        "current_section_id",
        "current_sec_position",
        "current_kind",
        "current_part_title",
        "current_chapter_label",
        "current_chapter_title",
        "current_section_title",
        "stored_word_count",
        "canonical_node_id",
        "canonical_source_key",
        "canonical_node_type",
        "canonical_title",
        "confidence",
        "score",
        "action",
        "manual_review_required",
        "progress_strategy",
        "provisional_segment_key",
        "segment_key_status",
        "reason",
    ]

    with DECISIONS_CSV.open(
        "w",
        encoding="utf-8",
        newline="",
    ) as destination:
        writer = csv.DictWriter(
            destination,
            fieldnames=fields,
        )
        writer.writeheader()

        for plan in plans:
            for decision in plan[
                "current_section_decisions"
            ]:
                writer.writerow(
                    {
                        "book_id": plan["book"][
                            "book_id"
                        ],
                        "book_title": plan["book"][
                            "title"
                        ],
                        "strategy": plan["strategy"],
                        **decision,
                    }
                )


def write_coverage_csv(
    plans: list[dict[str, Any]],
) -> None:
    fields = [
        "book_id",
        "book_title",
        "strategy",
        "canonical_node_id",
        "canonical_source_key",
        "canonical_node_type",
        "canonical_title",
        "canonical_parent_id",
        "canonical_order",
        "coverage_status",
        "linked_current_section_ids",
        "linked_current_count",
        "linked_actions",
    ]

    with COVERAGE_CSV.open(
        "w",
        encoding="utf-8",
        newline="",
    ) as destination:
        writer = csv.DictWriter(
            destination,
            fieldnames=fields,
        )
        writer.writeheader()

        for plan in plans:
            for item in plan[
                "canonical_coverage"
            ]:
                writer.writerow(
                    {
                        "book_id": plan["book"][
                            "book_id"
                        ],
                        "book_title": plan["book"][
                            "title"
                        ],
                        "strategy": plan["strategy"],
                        **item,
                        "linked_current_section_ids": (
                            json.dumps(
                                item[
                                    "linked_current_section_ids"
                                ],
                                ensure_ascii=False,
                            )
                        ),
                        "linked_actions": json.dumps(
                            item["linked_actions"],
                            ensure_ascii=False,
                            sort_keys=True,
                        ),
                    }
                )


def write_review_queue(
    plans: list[dict[str, Any]],
) -> None:
    fields = [
        "priority",
        "book_id",
        "book_title",
        "strategy",
        "current_section_id",
        "current_sec_position",
        "action",
        "confidence",
        "current_section_title",
        "canonical_title",
        "stored_word_count",
        "progress_strategy",
        "reason",
    ]

    priority_order = {
        "review": 1,
        "split": 2,
        "reclassify": 3,
        "relabel-review": 4,
    }

    rows = []

    for plan in plans:
        for decision in plan[
            "current_section_decisions"
        ]:
            if not decision[
                "manual_review_required"
            ]:
                continue

            action = decision["action"]
            rows.append(
                {
                    "priority": priority_order.get(
                        action,
                        5,
                    ),
                    "book_id": plan["book"][
                        "book_id"
                    ],
                    "book_title": plan["book"][
                        "title"
                    ],
                    "strategy": plan["strategy"],
                    "current_section_id": decision[
                        "current_section_id"
                    ],
                    "current_sec_position": decision[
                        "current_sec_position"
                    ],
                    "action": action,
                    "confidence": decision[
                        "confidence"
                    ],
                    "current_section_title": (
                        decision.get(
                            "current_section_title"
                        )
                    ),
                    "canonical_title": (
                        decision.get(
                            "canonical_title"
                        )
                    ),
                    "stored_word_count": decision[
                        "stored_word_count"
                    ],
                    "progress_strategy": decision[
                        "progress_strategy"
                    ],
                    "reason": decision["reason"],
                }
            )

    rows.sort(
        key=lambda row: (
            row["priority"],
            row["book_id"],
            row["current_sec_position"],
        )
    )

    with REVIEW_QUEUE_CSV.open(
        "w",
        encoding="utf-8",
        newline="",
    ) as destination:
        writer = csv.DictWriter(
            destination,
            fieldnames=fields,
        )
        writer.writeheader()
        writer.writerows(rows)


def build_summary_markdown(
    plans: list[dict[str, Any]],
) -> str:
    lines = [
        "# Book Reconstruction Plan",
        "",
        "This plan is diagnostic and does not modify production data.",
        "",
        "| Work | Strategy | Current sections | Manual review | Split | Review | Missing canonical units | Provisional direct mappings |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]

    for plan in plans:
        summary = plan["summary"]
        actions = summary["action_counts"]
        coverage = summary["coverage_counts"]

        lines.append(
            "| "
            + " | ".join(
                [
                    plan["book"]["title"],
                    plan["strategy"],
                    str(
                        summary[
                            "current_section_count"
                        ]
                    ),
                    str(
                        summary[
                            "manual_review_count"
                        ]
                    ),
                    str(actions.get("split", 0)),
                    str(actions.get("review", 0)),
                    str(
                        coverage.get(
                            "missing-current-unit",
                            0,
                        )
                    ),
                    str(
                        summary[
                            "direct_provisional_mapping_count"
                        ]
                    ),
                ]
            )
            + " |"
        )

    lines.extend(
        [
            "",
            "## Strategy meanings",
            "",
            "- `metadata-alignment`: boundaries appear aligned; metadata review remains.",
            "- `targeted-staging-reconstruction`: selected units require reconstruction.",
            "- `full-staging-reconstruction`: the work should be rebuilt in staging and compared as a complete ordered set.",
            "",
            "## Progress-preservation position",
            "",
            "- Current production section IDs remain authoritative until cutover.",
            "- Canonical source keys identify editorial units, not final reading segments.",
            "- Provisional segment keys are not production identifiers.",
            "- Split and unmatched records block automatic migration.",
            "- Historical reading sessions remain immutable.",
            "- Every migration requires a reversible current-to-successor mapping.",
            "",
            "## Production blockers",
            "",
            "- source redistribution rights;",
            "- verified content boundaries;",
            "- content-level checksums;",
            "- active progress dependency joins;",
            "- approved split and merge rules;",
            "- rollback and cutover transactions.",
            "",
        ]
    )

    return "\n".join(lines)


def main() -> None:
    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )
    REPORT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    plans = []

    for _, slug in BOOKS:
        comparison_path = (
            COMPARISON_DIR / f"{slug}.json"
        )
        canonical_path = (
            CANONICAL_DIR / f"{slug}.json"
        )

        if not comparison_path.exists():
            raise SystemExit(
                f"Missing comparison: {comparison_path}"
            )

        if not canonical_path.exists():
            raise SystemExit(
                f"Missing canonical map: {canonical_path}"
            )

        plan = build_plan(
            comparison_path,
            canonical_path,
        )
        plans.append(plan)

        output_path = OUTPUT_DIR / f"{slug}.json"
        output_path.write_text(
            json.dumps(
                plan,
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

        print(
            f"Planned {plan['book']['title']}: "
            f"{plan['strategy']}."
        )

    summary_payload = {
        "schema_version": 1,
        "status": "diagnostic-plan",
        "book_count": len(plans),
        "books": [
            {
                "book": plan["book"],
                "strategy": plan["strategy"],
                "summary": plan["summary"],
                "migration_blockers": plan[
                    "migration_blockers"
                ],
            }
            for plan in plans
        ],
    }

    SUMMARY_JSON.write_text(
        json.dumps(
            summary_payload,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    SUMMARY_MD.write_text(
        build_summary_markdown(plans) + "\n",
        encoding="utf-8",
    )

    write_decisions_csv(plans)
    write_coverage_csv(plans)
    write_review_queue(plans)

    print()
    print(f"Summary: {SUMMARY_MD}")
    print(f"Decisions: {DECISIONS_CSV}")
    print(f"Coverage: {COVERAGE_CSV}")
    print(f"Review queue: {REVIEW_QUEUE_CSV}")
    print()
    print(
        "Reconstruction plan generated without "
        "modifying Supabase."
    )


if __name__ == "__main__":
    main()
