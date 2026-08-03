from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]

POLICY_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-review-policy.json"
)
DESIGN_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-design-manifest.json"
)
QUEUE_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-review-queue.json"
)
APPLICATION_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-application-evidence.json"
)

TRIAGE_MANIFEST_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-review-triage.json"
)
ACTIVE_QUEUE_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-active-review-queue.json"
)
DEFERRED_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-deferred-metadata.json"
)
BATCHES_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-review-batches.json"
)
REPORT_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reports"
    / "reading-segment-review-triage-summary.md"
)

PRIORITY_ORDER = {
    "P0": 0,
    "P1": 1,
    "P2": 2,
    "P3": 3,
    "P4": 4,
}

STRUCTURAL_REASONS = {
    "split-required-by-reconstruction-plan",
    "manual-reconstruction-review",
}

BOUNDARY_REASONS = {
    "missing-start-locator",
    "same-page-successor-boundary",
    "container-intro-boundary",
}

SIZE_REASONS = {
    "legacy-word-count-oversized",
}

METADATA_ONLY_REASONS = {
    "no-legacy-word-count-estimate",
}


def read_json(path: Path) -> Any:
    return json.loads(
        path.read_text(encoding="utf-8")
    )


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as source:
        for chunk in iter(
            lambda: source.read(1024 * 1024),
            b"",
        ):
            digest.update(chunk)

    return digest.hexdigest()


def highest_priority(
    reasons: set[str],
    policy: dict[str, Any],
) -> str:
    priorities = [
        policy["reason_classification"][reason][
            "priority"
        ]
        for reason in reasons
    ]

    return min(
        priorities,
        key=lambda priority: PRIORITY_ORDER[priority],
    )


def disposition_for(
    reasons: set[str],
) -> str:
    if reasons and reasons <= METADATA_ONLY_REASONS:
        return "defer-metadata-only"

    if reasons & STRUCTURAL_REASONS:
        return "manual-structural-review"

    if reasons & BOUNDARY_REASONS:
        return "manual-boundary-review"

    if reasons & SIZE_REASONS:
        return "manual-size-review"

    raise ValueError(
        "Unable to determine review disposition."
    )


def primary_reason(
    reasons: set[str],
    policy: dict[str, Any],
) -> str:
    return sorted(
        reasons,
        key=lambda reason: (
            PRIORITY_ORDER[
                policy["reason_classification"][reason][
                    "priority"
                ]
            ],
            reason,
        ),
    )[0]


def triage_item(
    proposal: dict[str, Any],
    policy: dict[str, Any],
) -> dict[str, Any]:
    reasons = set(proposal.get("review_reasons", []))

    if not reasons:
        raise ValueError(
            f"{proposal['segment_key']}: review item has no reasons."
        )

    unknown = reasons - set(
        policy["reason_classification"]
    )

    if unknown:
        raise ValueError(
            f"{proposal['segment_key']}: unknown reasons: "
            + ", ".join(sorted(unknown))
        )

    disposition = disposition_for(reasons)
    priority = highest_priority(
        reasons,
        policy,
    )
    automated = (
        disposition == "defer-metadata-only"
    )

    return {
        "run_id": proposal["run_id"],
        "book_id": proposal["book_id"],
        "book_slug": proposal["book_slug"],
        "segment_key": proposal["segment_key"],
        "source_key": proposal["source_key"],
        "source_node_id": proposal[
            "source_node_id"
        ],
        "node_type": proposal["node_type"],
        "segment_order": proposal[
            "segment_order"
        ],
        "display_title": proposal[
            "display_title"
        ],
        "proposal_kind": proposal[
            "proposal_kind"
        ],
        "estimated_size_band": proposal[
            "estimated_size_band"
        ],
        "legacy_word_count_estimate": proposal[
            "legacy_word_count_estimate"
        ],
        "review_reasons": sorted(reasons),
        "primary_reason": primary_reason(
            reasons,
            policy,
        ),
        "priority": priority,
        "disposition": disposition,
        "active_boundary_review": not automated,
        "metadata_deferred": automated,
        "boundary_approved": False,
        "content_approved": False,
        "database_change_applied": False,
    }


def build_batches(
    active_items: list[dict[str, Any]],
    maximum_size: int,
) -> list[dict[str, Any]]:
    grouped: dict[
        tuple[str, int],
        list[dict[str, Any]],
    ] = defaultdict(list)

    for item in active_items:
        grouped[
            (item["priority"], item["book_id"])
        ].append(item)

    batches: list[dict[str, Any]] = []

    for priority, book_id in sorted(
        grouped,
        key=lambda key: (
            PRIORITY_ORDER[key[0]],
            key[1],
        ),
    ):
        items = sorted(
            grouped[(priority, book_id)],
            key=lambda item: (
                item["segment_order"],
                item["segment_key"],
            ),
        )

        for offset in range(
            0,
            len(items),
            maximum_size,
        ):
            members = items[
                offset : offset + maximum_size
            ]
            batch_number = (
                offset // maximum_size
            ) + 1
            batch_id = (
                f"{priority.lower()}-book-"
                f"{book_id}-batch-{batch_number:02d}"
            )

            batches.append(
                {
                    "batch_id": batch_id,
                    "priority": priority,
                    "book_id": book_id,
                    "batch_number": batch_number,
                    "item_count": len(members),
                    "segment_keys": [
                        item["segment_key"]
                        for item in members
                    ],
                    "items": members,
                }
            )

    return batches


def build_report(
    manifest: dict[str, Any],
) -> str:
    totals = manifest["totals"]

    lines = [
        "# Reading Segment Review Triage",
        "",
        f"- Status: `{manifest['status']}`",
        f"- Policy version: `{manifest['policy_version']}`",
        f"- Migration run ID: `{manifest['run_id']}`",
        f"- Original review queue: `{totals['original_review_count']}`",
        f"- Active manual review queue: `{totals['active_manual_review_count']}`",
        f"- Metadata-only items deferred: `{totals['deferred_metadata_count']}`",
        f"- Review batches: `{totals['batch_count']}`",
        f"- Boundary approvals: `0`",
        f"- Content approvals: `0`",
        f"- Database changes: `0`",
        f"- Production changes: `0`",
        f"- Cutover enabled: `false`",
        "",
        "## Dispositions",
        "",
        "| Disposition | Items |",
        "| --- | ---: |",
    ]

    for disposition, count in manifest[
        "disposition_counts"
    ].items():
        lines.append(
            f"| {disposition} | {count} |"
        )

    lines.extend(
        [
            "",
            "## Priorities",
            "",
            "| Priority | Items |",
            "| --- | ---: |",
        ]
    )

    for priority, count in manifest[
        "priority_counts"
    ].items():
        lines.append(
            f"| {priority} | {count} |"
        )

    lines.extend(
        [
            "",
            "## Active queue by work",
            "",
            "| Work | Active reviews | Deferred metadata |",
            "| --- | ---: | ---: |",
        ]
    )

    for book in manifest["books"]:
        lines.append(
            f"| {book['title']} "
            f"| {book['active_manual_review_count']} "
            f"| {book['deferred_metadata_count']} |"
        )

    lines.extend(
        [
            "",
            "## Decision",
            "",
            "Metadata-only missing-size diagnostics may leave the active boundary-review workload because they do not independently invalidate canonical start or end boundaries.",
            "",
            "All structural, same-page, container-introduction, missing-locator, split, and oversized-unit concerns remain in explicit manual review.",
            "",
            "No staged database row is updated by PR-0020. All 812 rows remain in `boundary-review` until a later controlled application gate.",
            "",
        ]
    )

    return "\n".join(lines)


def main() -> None:
    policy = read_json(POLICY_PATH)
    design = read_json(DESIGN_PATH)
    queue = read_json(QUEUE_PATH)
    application = read_json(APPLICATION_PATH)

    if (
        policy.get("status")
        != "accepted-for-triage"
    ):
        raise SystemExit(
            "Review policy is not accepted for triage."
        )

    if (
        queue.get("proposal_count")
        != len(queue.get("proposals", []))
    ):
        raise SystemExit(
            "Review queue count does not match proposals."
        )

    triaged = [
        triage_item(proposal, policy)
        for proposal in queue["proposals"]
    ]

    segment_keys = [
        item["segment_key"]
        for item in triaged
    ]

    if len(segment_keys) != len(
        set(segment_keys)
    ):
        raise SystemExit(
            "Duplicate segment keys in triage input."
        )

    active = [
        item
        for item in triaged
        if item["active_boundary_review"]
    ]
    deferred = [
        item
        for item in triaged
        if item["metadata_deferred"]
    ]

    if len(active) + len(deferred) != len(
        triaged
    ):
        raise SystemExit(
            "Triage did not account for every item."
        )

    maximum_batch_size = policy[
        "batching"
    ]["maximum_items_per_batch"]
    batches = build_batches(
        active,
        maximum_batch_size,
    )

    active_batched_keys = [
        segment_key
        for batch in batches
        for segment_key in batch["segment_keys"]
    ]

    if sorted(active_batched_keys) != sorted(
        item["segment_key"]
        for item in active
    ):
        raise SystemExit(
            "Review batches do not cover the active queue exactly once."
        )

    disposition_counts = Counter(
        item["disposition"]
        for item in triaged
    )
    priority_counts = Counter(
        item["priority"]
        for item in active
    )
    reason_counts = Counter(
        reason
        for item in triaged
        for reason in item["review_reasons"]
    )

    design_books = {
        book["book_id"]: book
        for book in design["books"]
    }
    book_summaries = []

    for book_id in sorted(design_books):
        book = design_books[book_id]
        book_active = [
            item
            for item in active
            if item["book_id"] == book_id
        ]
        book_deferred = [
            item
            for item in deferred
            if item["book_id"] == book_id
        ]

        book_summaries.append(
            {
                "book_id": book_id,
                "slug": book["slug"],
                "title": book["title"],
                "original_review_count": sum(
                    1
                    for item in triaged
                    if item["book_id"] == book_id
                ),
                "active_manual_review_count": len(
                    book_active
                ),
                "deferred_metadata_count": len(
                    book_deferred
                ),
                "batch_count": sum(
                    1
                    for batch in batches
                    if batch["book_id"] == book_id
                ),
            }
        )

    manifest = {
        "schema_version": 1,
        "status": "triaged-not-applied",
        "policy_version": policy[
            "policy_version"
        ],
        "run_id": design["run_id"],
        "design_version": design[
            "design_version"
        ],
        "inputs": {
            "review_policy_sha256": sha256_file(
                POLICY_PATH
            ),
            "design_manifest_sha256": sha256_file(
                DESIGN_PATH
            ),
            "review_queue_sha256": sha256_file(
                QUEUE_PATH
            ),
            "application_evidence_sha256": (
                sha256_file(
                    APPLICATION_PATH
                )
            ),
        },
        "totals": {
            "staged_segment_count": application[
                "summary"
            ]["reading_segment_count"],
            "original_review_count": len(
                triaged
            ),
            "active_manual_review_count": len(
                active
            ),
            "deferred_metadata_count": len(
                deferred
            ),
            "batch_count": len(batches),
            "boundary_approval_count": 0,
            "content_approval_count": 0,
            "database_change_count": 0,
            "successor_mapping_count": 0,
            "dependency_snapshot_count": 0,
        },
        "disposition_counts": dict(
            sorted(
                disposition_counts.items()
            )
        ),
        "priority_counts": {
            priority: priority_counts.get(
                priority,
                0,
            )
            for priority in [
                "P0",
                "P1",
                "P2",
                "P3",
            ]
        },
        "reason_counts": dict(
            sorted(reason_counts.items())
        ),
        "books": book_summaries,
        "triage_items": triaged,
        "application_boundary": {
            "database_update_generated": False,
            "database_update_applied": False,
            "staged_status_changed": False,
            "boundaries_approved": False,
            "content_approved": False,
            "successor_mappings_created": False,
            "dependency_snapshot_captured": False,
            "production_modified": False,
            "progress_migrated": False,
            "reading_sessions_rewritten": False,
            "cutover_enabled": False,
        },
    }

    active_document = {
        "schema_version": 1,
        "status": "active-manual-review",
        "policy_version": policy[
            "policy_version"
        ],
        "run_id": design["run_id"],
        "item_count": len(active),
        "items": active,
    }

    deferred_document = {
        "schema_version": 1,
        "status": "metadata-deferred-not-applied",
        "policy_version": policy[
            "policy_version"
        ],
        "run_id": design["run_id"],
        "item_count": len(deferred),
        "deferment_reason": (
            "Missing legacy word-count metadata alone "
            "does not invalidate canonical boundaries."
        ),
        "items": deferred,
        "application_boundary": {
            "database_update_applied": False,
            "boundary_approved": False,
            "content_approved": False,
        },
    }

    batches_document = {
        "schema_version": 1,
        "status": "review-batches-prepared",
        "policy_version": policy[
            "policy_version"
        ],
        "run_id": design["run_id"],
        "maximum_batch_size": maximum_batch_size,
        "batch_count": len(batches),
        "active_item_count": len(active),
        "batches": batches,
    }

    TRIAGE_MANIFEST_PATH.write_text(
        json.dumps(
            manifest,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )
    ACTIVE_QUEUE_PATH.write_text(
        json.dumps(
            active_document,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )
    DEFERRED_PATH.write_text(
        json.dumps(
            deferred_document,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )
    BATCHES_PATH.write_text(
        json.dumps(
            batches_document,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )
    REPORT_PATH.write_text(
        build_report(manifest) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    print(f"Triage manifest: {TRIAGE_MANIFEST_PATH}")
    print(f"Active queue: {ACTIVE_QUEUE_PATH}")
    print(f"Deferred metadata: {DEFERRED_PATH}")
    print(f"Review batches: {BATCHES_PATH}")
    print(f"Report: {REPORT_PATH}")
    print()
    print(
        f"Original queue: {len(triaged)}"
    )
    print(
        f"Active manual review: {len(active)}"
    )
    print(
        f"Metadata-only deferred: {len(deferred)}"
    )
    print(
        f"Review batches: {len(batches)}"
    )
    print(
        "No database operation was executed."
    )


if __name__ == "__main__":
    main()
