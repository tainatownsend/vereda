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
    / "reading-segment-resolution-policy.json"
)
DESIGN_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-design-manifest.json"
)
ACTIVE_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-active-review-queue.json"
)
TRIAGE_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-review-triage.json"
)
APPLICATION_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-application-evidence.json"
)

ANALYSIS_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-resolution-analysis.json"
)
MECHANICAL_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-mechanical-candidates.json"
)
SOURCE_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-source-inspection-queue.json"
)
STRUCTURAL_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-structural-review-queue.json"
)
SIZE_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-size-review-queue.json"
)
BATCHES_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-resolution-batches.json"
)
REPORT_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reports"
    / "reading-segment-resolution-analysis-summary.md"
)

PAGE_KEYS = {
    "page",
    "page_number",
    "pdf_page",
    "printed_page",
    "source_pdf_page",
}

GENERIC_KEYS = {
    "basis",
    "boundary_role",
    "exclusive",
    "source_node_id",
    "next_segment_key",
    "next_source_key",
}

PAGE_LOCATOR_TYPES = {
    "page",
    "pdf_page",
    "printed_page",
}

STRUCTURAL_REASONS = {
    "split-required-by-reconstruction-plan",
    "manual-reconstruction-review",
}

SOURCE_INSPECTION_REASONS = {
    "missing-start-locator",
    "container-intro-boundary",
}

SAME_PAGE_REASON = (
    "same-page-successor-boundary"
)

SIZE_REASON = "legacy-word-count-oversized"

PATH_ORDER = {
    "mechanical-anchor-candidate": 0,
    "source-inspection-required": 1,
    "structural-review-required": 2,
    "delivery-size-review-required": 3,
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


def normalize_scalar(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"

    if value is None:
        return "null"

    return str(value).strip()


def collect_anchor_tokens(
    value: Any,
    path: str = "",
) -> list[str]:
    tokens: list[str] = []

    if isinstance(value, dict):
        locator_type = value.get("type")

        if (
            isinstance(locator_type, str)
            and locator_type in PAGE_LOCATOR_TYPES
        ):
            return []

        for key in sorted(value):
            if (
                key in PAGE_KEYS
                or key in GENERIC_KEYS
            ):
                continue

            child = value[key]
            child_path = (
                f"{path}.{key}"
                if path
                else key
            )

            if (
                key == "value"
                and isinstance(locator_type, str)
                and locator_type
                not in PAGE_LOCATOR_TYPES
            ):
                token = normalize_scalar(child)

                if token:
                    tokens.append(
                        f"{path or 'locator'}.type="
                        f"{locator_type}"
                    )
                    tokens.append(
                        f"{child_path}={token}"
                    )

                continue

            tokens.extend(
                collect_anchor_tokens(
                    child,
                    child_path,
                )
            )

    elif isinstance(value, list):
        for index, child in enumerate(value):
            tokens.extend(
                collect_anchor_tokens(
                    child,
                    f"{path}[{index}]",
                )
            )

    else:
        token = normalize_scalar(value)

        if token and token != "null":
            tokens.append(
                f"{path}={token}"
            )

    return sorted(set(tokens))


def anchor_evidence(
    locator: dict[str, Any] | None,
) -> dict[str, Any]:
    if not locator:
        return {
            "available": False,
            "tokens": [],
            "signature": None,
        }

    nested_locator = locator.get("locator")
    tokens = collect_anchor_tokens(
        nested_locator
    )

    if not tokens:
        return {
            "available": False,
            "tokens": [],
            "signature": None,
        }

    serialized = json.dumps(
        tokens,
        ensure_ascii=False,
        separators=(",", ":"),
    )
    signature = hashlib.sha256(
        serialized.encode("utf-8")
    ).hexdigest()[:24]

    return {
        "available": True,
        "tokens": tokens,
        "signature": signature,
    }


def mechanical_candidate(
    reasons: set[str],
    current_anchor: dict[str, Any],
    successor_anchor: dict[str, Any],
) -> bool:
    forbidden = (
        STRUCTURAL_REASONS
        | SOURCE_INSPECTION_REASONS
        | {SIZE_REASON}
    )

    return (
        SAME_PAGE_REASON in reasons
        and not bool(reasons & forbidden)
        and current_anchor["available"]
        and successor_anchor["available"]
        and current_anchor["signature"]
        != successor_anchor["signature"]
    )


def resolution_path(
    reasons: set[str],
    current_anchor: dict[str, Any],
    successor_anchor: dict[str, Any],
) -> tuple[str, str]:
    if reasons & STRUCTURAL_REASONS:
        return (
            "structural-review-required",
            "structural-reconstruction-decision",
        )

    if reasons & SOURCE_INSPECTION_REASONS:
        return (
            "source-inspection-required",
            "explicit-source-evidence-required",
        )

    if SAME_PAGE_REASON in reasons:
        if mechanical_candidate(
            reasons,
            current_anchor,
            successor_anchor,
        ):
            return (
                "mechanical-anchor-candidate",
                "distinct-non-page-canonical-anchors",
            )

        return (
            "source-inspection-required",
            "same-page-boundary-without-distinct-anchor-evidence",
        )

    if SIZE_REASON in reasons:
        return (
            "delivery-size-review-required",
            "oversized-reader-unit-estimate",
        )

    return (
        "source-inspection-required",
        "unclassified-active-review-evidence",
    )


def build_batches(
    items: list[dict[str, Any]],
    maximum_size: int,
) -> list[dict[str, Any]]:
    grouped: dict[
        tuple[str, int],
        list[dict[str, Any]],
    ] = defaultdict(list)

    for item in items:
        grouped[
            (
                item["resolution_path"],
                item["book_id"],
            )
        ].append(item)

    batches: list[dict[str, Any]] = []

    for resolution, book_id in sorted(
        grouped,
        key=lambda key: (
            PATH_ORDER[key[0]],
            key[1],
        ),
    ):
        members = sorted(
            grouped[(resolution, book_id)],
            key=lambda item: (
                item["segment_order"],
                item["segment_key"],
            ),
        )

        for offset in range(
            0,
            len(members),
            maximum_size,
        ):
            batch_members = members[
                offset : offset + maximum_size
            ]
            batch_number = (
                offset // maximum_size
            ) + 1
            prefix = {
                "mechanical-anchor-candidate": (
                    "mechanical"
                ),
                "source-inspection-required": (
                    "source"
                ),
                "structural-review-required": (
                    "structural"
                ),
                "delivery-size-review-required": (
                    "size"
                ),
            }[resolution]

            batches.append(
                {
                    "batch_id": (
                        f"{prefix}-book-{book_id}-"
                        f"batch-{batch_number:02d}"
                    ),
                    "resolution_path": resolution,
                    "book_id": book_id,
                    "batch_number": batch_number,
                    "item_count": len(
                        batch_members
                    ),
                    "segment_keys": [
                        item["segment_key"]
                        for item in batch_members
                    ],
                    "items": batch_members,
                }
            )

    return batches


def queue_document(
    *,
    status: str,
    policy_version: str,
    run_id: str,
    items: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "status": status,
        "policy_version": policy_version,
        "run_id": run_id,
        "item_count": len(items),
        "items": items,
        "application_boundary": {
            "boundary_approved": False,
            "content_approved": False,
            "database_change_applied": False,
            "production_modified": False,
            "cutover_enabled": False,
        },
    }


def build_report(
    analysis: dict[str, Any],
) -> str:
    totals = analysis["totals"]

    lines = [
        "# Reading Segment Resolution Analysis",
        "",
        f"- Status: `{analysis['status']}`",
        f"- Policy version: `{analysis['policy_version']}`",
        f"- Migration run ID: `{analysis['run_id']}`",
        f"- Active items analyzed: `{totals['active_item_count']}`",
        f"- Mechanical anchor candidates: `{totals['mechanical_candidate_count']}`",
        f"- Source inspection required: `{totals['source_inspection_count']}`",
        f"- Structural review required: `{totals['structural_review_count']}`",
        f"- Delivery-size review required: `{totals['size_review_count']}`",
        f"- Resolution batches: `{totals['batch_count']}`",
        "- Boundaries approved: `0`",
        "- Content approved or loaded: `0`",
        "- Database changes: `0`",
        "- Production changes: `0`",
        "- Cutover enabled: `false`",
        "",
        "## Resolution paths",
        "",
        "| Resolution path | Items |",
        "| --- | ---: |",
    ]

    for path, count in analysis[
        "resolution_path_counts"
    ].items():
        lines.append(
            f"| {path} | {count} |"
        )

    lines.extend(
        [
            "",
            "## Analysis by work",
            "",
            "| Work | Mechanical | Source inspection | Structural | Size |",
            "| --- | ---: | ---: | ---: | ---: |",
        ]
    )

    for book in analysis["books"]:
        lines.append(
            f"| {book['title']} "
            f"| {book['mechanical_candidate_count']} "
            f"| {book['source_inspection_count']} "
            f"| {book['structural_review_count']} "
            f"| {book['size_review_count']} |"
        )

    lines.extend(
        [
            "",
            "## Decision",
            "",
            "Mechanical candidates have distinct non-page canonical locator anchors for the current and successor proposals. They are candidates for a future deterministic resolution, not approved boundaries.",
            "",
            "Cases without sufficient structural anchor evidence remain in source inspection. Split and reconstruction cases remain in structural review. Oversized-only cases remain in delivery-size review.",
            "",
            "PR-0021 does not update any of the 812 staged rows. Every row remains in `boundary-review`.",
            "",
        ]
    )

    return "\n".join(lines)


def main() -> None:
    policy = read_json(POLICY_PATH)
    design = read_json(DESIGN_PATH)
    active = read_json(ACTIVE_PATH)
    triage = read_json(TRIAGE_PATH)
    application = read_json(
        APPLICATION_PATH
    )

    if (
        policy.get("status")
        != "accepted-for-analysis"
    ):
        raise SystemExit(
            "Resolution policy is not accepted."
        )

    design_by_key = {
        proposal["segment_key"]: proposal
        for proposal in design["proposals"]
    }

    if len(design_by_key) != len(
        design["proposals"]
    ):
        raise SystemExit(
            "Duplicate segment keys in design manifest."
        )

    analyzed: list[dict[str, Any]] = []

    for item in active["items"]:
        proposal = design_by_key.get(
            item["segment_key"]
        )

        if proposal is None:
            raise SystemExit(
                f"Missing design proposal for "
                f"{item['segment_key']}."
            )

        current_anchor = anchor_evidence(
            proposal.get("start_locator")
        )
        end_locator = proposal.get(
            "end_locator"
        ) or {}
        successor_locator = end_locator.get(
            "next_start_locator"
        )
        successor_anchor = anchor_evidence(
            successor_locator
        )
        reasons = set(
            item.get("review_reasons", [])
        )
        path, rationale = resolution_path(
            reasons,
            current_anchor,
            successor_anchor,
        )

        analyzed.append(
            {
                **item,
                "resolution_path": path,
                "resolution_rationale": rationale,
                "current_anchor_evidence": (
                    current_anchor
                ),
                "successor_anchor_evidence": (
                    successor_anchor
                ),
                "proposed_resolution": (
                    "Use the distinct canonical "
                    "anchor transition as a future "
                    "deterministic boundary candidate."
                    if path
                    == "mechanical-anchor-candidate"
                    else None
                ),
                "boundary_approved": False,
                "content_approved": False,
                "database_change_applied": False,
            }
        )

    if len(analyzed) != 405:
        raise SystemExit(
            f"Expected 405 analyzed items; "
            f"received {len(analyzed)}."
        )

    analyzed_keys = [
        item["segment_key"]
        for item in analyzed
    ]

    if len(analyzed_keys) != len(
        set(analyzed_keys)
    ):
        raise SystemExit(
            "Duplicate segment keys in resolution analysis."
        )

    by_path = {
        path: [
            item
            for item in analyzed
            if item["resolution_path"] == path
        ]
        for path in PATH_ORDER
    }

    if sum(
        len(items)
        for items in by_path.values()
    ) != len(analyzed):
        raise SystemExit(
            "Resolution paths do not partition the active queue."
        )

    maximum_batch_size = policy[
        "batching"
    ]["maximum_items_per_batch"]
    batches = build_batches(
        analyzed,
        maximum_batch_size,
    )

    batch_keys = [
        segment_key
        for batch in batches
        for segment_key in batch["segment_keys"]
    ]

    if sorted(batch_keys) != sorted(
        analyzed_keys
    ):
        raise SystemExit(
            "Resolution batches do not cover the analysis exactly once."
        )

    path_counts = Counter(
        item["resolution_path"]
        for item in analyzed
    )
    rationale_counts = Counter(
        item["resolution_rationale"]
        for item in analyzed
    )

    design_books = {
        book["book_id"]: book
        for book in design["books"]
    }
    book_summaries = []

    for book_id in sorted(design_books):
        book = design_books[book_id]
        book_items = [
            item
            for item in analyzed
            if item["book_id"] == book_id
        ]

        book_summaries.append(
            {
                "book_id": book_id,
                "slug": book["slug"],
                "title": book["title"],
                "active_item_count": len(
                    book_items
                ),
                "mechanical_candidate_count": sum(
                    item["resolution_path"]
                    == "mechanical-anchor-candidate"
                    for item in book_items
                ),
                "source_inspection_count": sum(
                    item["resolution_path"]
                    == "source-inspection-required"
                    for item in book_items
                ),
                "structural_review_count": sum(
                    item["resolution_path"]
                    == "structural-review-required"
                    for item in book_items
                ),
                "size_review_count": sum(
                    item["resolution_path"]
                    == "delivery-size-review-required"
                    for item in book_items
                ),
            }
        )

    analysis = {
        "schema_version": 1,
        "status": "analyzed-not-applied",
        "policy_version": policy[
            "policy_version"
        ],
        "run_id": design["run_id"],
        "design_version": design[
            "design_version"
        ],
        "inputs": {
            "policy_sha256": sha256_file(
                POLICY_PATH
            ),
            "design_manifest_sha256": (
                sha256_file(DESIGN_PATH)
            ),
            "active_queue_sha256": sha256_file(
                ACTIVE_PATH
            ),
            "triage_manifest_sha256": (
                sha256_file(TRIAGE_PATH)
            ),
            "application_evidence_sha256": (
                sha256_file(
                    APPLICATION_PATH
                )
            ),
        },
        "totals": {
            "staged_segment_count": (
                application["summary"][
                    "reading_segment_count"
                ]
            ),
            "active_item_count": len(
                analyzed
            ),
            "mechanical_candidate_count": len(
                by_path[
                    "mechanical-anchor-candidate"
                ]
            ),
            "source_inspection_count": len(
                by_path[
                    "source-inspection-required"
                ]
            ),
            "structural_review_count": len(
                by_path[
                    "structural-review-required"
                ]
            ),
            "size_review_count": len(
                by_path[
                    "delivery-size-review-required"
                ]
            ),
            "batch_count": len(batches),
            "boundary_approval_count": 0,
            "content_approval_count": 0,
            "database_change_count": 0,
        },
        "resolution_path_counts": {
            path: path_counts.get(path, 0)
            for path in PATH_ORDER
        },
        "rationale_counts": dict(
            sorted(rationale_counts.items())
        ),
        "books": book_summaries,
        "items": analyzed,
        "application_boundary": dict(
            policy["application_boundary"]
        ),
    }

    documents = [
        (
            ANALYSIS_PATH,
            analysis,
        ),
        (
            MECHANICAL_PATH,
            queue_document(
                status=(
                    "mechanical-candidates-not-approved"
                ),
                policy_version=policy[
                    "policy_version"
                ],
                run_id=design["run_id"],
                items=by_path[
                    "mechanical-anchor-candidate"
                ],
            ),
        ),
        (
            SOURCE_PATH,
            queue_document(
                status=(
                    "source-inspection-required"
                ),
                policy_version=policy[
                    "policy_version"
                ],
                run_id=design["run_id"],
                items=by_path[
                    "source-inspection-required"
                ],
            ),
        ),
        (
            STRUCTURAL_PATH,
            queue_document(
                status=(
                    "structural-review-required"
                ),
                policy_version=policy[
                    "policy_version"
                ],
                run_id=design["run_id"],
                items=by_path[
                    "structural-review-required"
                ],
            ),
        ),
        (
            SIZE_PATH,
            queue_document(
                status=(
                    "delivery-size-review-required"
                ),
                policy_version=policy[
                    "policy_version"
                ],
                run_id=design["run_id"],
                items=by_path[
                    "delivery-size-review-required"
                ],
            ),
        ),
        (
            BATCHES_PATH,
            {
                "schema_version": 1,
                "status": (
                    "resolution-batches-prepared"
                ),
                "policy_version": policy[
                    "policy_version"
                ],
                "run_id": design["run_id"],
                "maximum_batch_size": (
                    maximum_batch_size
                ),
                "batch_count": len(batches),
                "item_count": len(analyzed),
                "batches": batches,
                "application_boundary": {
                    "database_change_applied": (
                        False
                    ),
                    "boundary_approved": False,
                    "content_approved": False,
                    "cutover_enabled": False,
                },
            },
        ),
    ]

    for path, document in documents:
        path.write_text(
            json.dumps(
                document,
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
            newline="\n",
        )

    REPORT_PATH.write_text(
        build_report(analysis) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    print(f"Analysis: {ANALYSIS_PATH}")
    print(
        f"Mechanical candidates: {MECHANICAL_PATH}"
    )
    print(
        f"Source inspection: {SOURCE_PATH}"
    )
    print(
        f"Structural review: {STRUCTURAL_PATH}"
    )
    print(f"Size review: {SIZE_PATH}")
    print(f"Batches: {BATCHES_PATH}")
    print(f"Report: {REPORT_PATH}")
    print()
    print(
        f"Active items analyzed: {len(analyzed)}"
    )
    print(
        "Mechanical candidates: "
        f"{len(by_path['mechanical-anchor-candidate'])}"
    )
    print(
        "Source inspection required: "
        f"{len(by_path['source-inspection-required'])}"
    )
    print(
        "Structural review required: "
        f"{len(by_path['structural-review-required'])}"
    )
    print(
        "Delivery-size review required: "
        f"{len(by_path['delivery-size-review-required'])}"
    )
    print(
        "No database operation was executed."
    )


if __name__ == "__main__":
    main()
