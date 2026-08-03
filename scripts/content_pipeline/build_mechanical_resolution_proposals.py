from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "content" / "migration"

POLICY_PATH = (
    MIGRATION
    / "reading-segment-mechanical-resolution-policy.json"
)
DESIGN_PATH = (
    MIGRATION
    / "reading-segment-design-manifest.json"
)
CANDIDATES_PATH = (
    MIGRATION
    / "reading-segment-mechanical-candidates.json"
)
ANALYSIS_PATH = (
    MIGRATION
    / "reading-segment-resolution-analysis.json"
)
APPLICATION_PATH = (
    MIGRATION
    / "reading-segment-application-evidence.json"
)
PROPOSALS_PATH = (
    MIGRATION
    / "reading-segment-mechanical-resolution-proposals.json"
)
BATCHES_PATH = (
    MIGRATION
    / "reading-segment-mechanical-resolution-review-batches.json"
)
REPORT_PATH = (
    MIGRATION
    / "reports"
    / "reading-segment-mechanical-resolution-proposals-summary.md"
)


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stable_json(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


def resolution_id(
    run_id: str,
    current_key: str,
    successor_key: str,
    policy_version: str,
) -> str:
    payload = "|".join(
        [
            run_id,
            current_key,
            successor_key,
            policy_version,
        ]
    )
    return hashlib.sha256(
        payload.encode("utf-8")
    ).hexdigest()[:24]


def shared_pages(
    current: dict[str, Any],
    successor: dict[str, Any],
) -> list[dict[str, Any]]:
    matches = []

    for field in (
        "source_pdf_page",
        "printed_page",
    ):
        value = current.get(field)

        if (
            value is not None
            and value == successor.get(field)
        ):
            matches.append(
                {
                    "field": field,
                    "value": value,
                }
            )

    return matches


def build_batches(
    proposals: list[dict[str, Any]],
    maximum_size: int,
) -> list[dict[str, Any]]:
    batches = []

    for offset in range(
        0,
        len(proposals),
        maximum_size,
    ):
        members = proposals[
            offset : offset + maximum_size
        ]
        number = offset // maximum_size + 1
        batches.append(
            {
                "batch_id": (
                    f"mechanical-review-batch-{number:02d}"
                ),
                "batch_number": number,
                "item_count": len(members),
                "resolution_ids": [
                    item["resolution_id"]
                    for item in members
                ],
                "segment_keys": [
                    item["segment_key"]
                    for item in members
                ],
                "items": members,
            }
        )

    return batches


def main() -> None:
    policy = read_json(POLICY_PATH)
    design = read_json(DESIGN_PATH)
    candidates = read_json(CANDIDATES_PATH)
    analysis = read_json(ANALYSIS_PATH)
    application = read_json(APPLICATION_PATH)

    design_by_key = {
        item["segment_key"]: item
        for item in design["proposals"]
    }

    if len(design_by_key) != len(
        design["proposals"]
    ):
        raise SystemExit(
            "Duplicate segment keys in design manifest."
        )

    proposals = []
    locator_types: Counter[str] = Counter()

    for candidate in candidates["items"]:
        if (
            candidate["resolution_path"]
            != "mechanical-anchor-candidate"
        ):
            raise SystemExit(
                f"{candidate['segment_key']}: invalid path."
            )

        current = design_by_key.get(
            candidate["segment_key"]
        )

        if current is None:
            raise SystemExit(
                f"{candidate['segment_key']}: design proposal missing."
            )

        end_locator = current.get("end_locator") or {}
        successor_key = end_locator.get(
            "next_segment_key"
        )
        successor = design_by_key.get(
            successor_key
        )

        if successor is None:
            raise SystemExit(
                f"{candidate['segment_key']}: successor missing."
            )

        current_start = current.get(
            "start_locator"
        )
        recorded_next = end_locator.get(
            "next_start_locator"
        )
        successor_start = successor.get(
            "start_locator"
        )

        if not all(
            isinstance(value, dict)
            for value in (
                current_start,
                recorded_next,
                successor_start,
            )
        ):
            raise SystemExit(
                f"{candidate['segment_key']}: locator missing."
            )

        page_matches = shared_pages(
            current_start,
            successor_start,
        )
        current_anchor = candidate[
            "current_anchor_evidence"
        ]
        successor_anchor = candidate[
            "successor_anchor_evidence"
        ]

        invariants = {
            "same_book": (
                current["book_id"]
                == successor["book_id"]
            ),
            "adjacent_segment_order": (
                successor["segment_order"]
                == current["segment_order"] + 1
            ),
            "design_successor_link": (
                end_locator.get(
                    "next_source_key"
                )
                == successor["source_key"]
            ),
            "exact_successor_locator_match": (
                stable_json(recorded_next)
                == stable_json(successor_start)
            ),
            "shared_page_evidence": bool(
                page_matches
            ),
            "distinct_anchor_signatures": (
                current_anchor.get("available")
                is True
                and successor_anchor.get(
                    "available"
                )
                is True
                and current_anchor.get(
                    "signature"
                )
                != successor_anchor.get(
                    "signature"
                )
            ),
        }

        failed = [
            name
            for name, passed in invariants.items()
            if not passed
        ]

        if failed:
            raise SystemExit(
                f"{candidate['segment_key']}: "
                + ", ".join(failed)
            )

        current_type = (
            current_start.get("locator") or {}
        ).get("type", "unknown")
        successor_type = (
            successor_start.get("locator") or {}
        ).get("type", "unknown")
        locator_types.update(
            [
                current_type,
                successor_type,
            ]
        )

        proposals.append(
            {
                "resolution_id": resolution_id(
                    design["run_id"],
                    current["segment_key"],
                    successor["segment_key"],
                    policy["policy_version"],
                ),
                "proposal_status": (
                    "proposed-not-approved"
                ),
                "resolution_method": (
                    "canonical-successor-start-anchor"
                ),
                "run_id": design["run_id"],
                "policy_version": policy[
                    "policy_version"
                ],
                "book_id": current["book_id"],
                "book_slug": current["book_slug"],
                "segment_key": current["segment_key"],
                "segment_order": current[
                    "segment_order"
                ],
                "display_title": current[
                    "display_title"
                ],
                "successor_segment_key": (
                    successor["segment_key"]
                ),
                "successor_segment_order": (
                    successor["segment_order"]
                ),
                "successor_display_title": (
                    successor["display_title"]
                ),
                "current_start_locator": (
                    current_start
                ),
                "proposed_exclusive_end_locator": (
                    successor_start
                ),
                "current_anchor_evidence": (
                    current_anchor
                ),
                "successor_anchor_evidence": (
                    successor_anchor
                ),
                "shared_page_evidence": {
                    "available": True,
                    "matches": page_matches,
                },
                "continuity_evidence": invariants,
                "boundary_approved": False,
                "content_approved": False,
                "database_change_applied": False,
                "successor_mapping_created": False,
                "cutover_enabled": False,
            }
        )

    proposals.sort(
        key=lambda item: (
            item["book_id"],
            item["segment_order"],
            item["segment_key"],
        )
    )

    if len(proposals) != 166:
        raise SystemExit(
            f"Expected 166 proposals; got {len(proposals)}."
        )

    ids = [
        item["resolution_id"]
        for item in proposals
    ]
    keys = [
        item["segment_key"]
        for item in proposals
    ]

    if len(ids) != len(set(ids)):
        raise SystemExit(
            "Duplicate resolution IDs."
        )

    if len(keys) != len(set(keys)):
        raise SystemExit(
            "Duplicate segment keys."
        )

    batches = build_batches(
        proposals,
        policy["maximum_review_batch_size"],
    )
    batch_ids = [
        item
        for batch in batches
        for item in batch["resolution_ids"]
    ]

    if sorted(batch_ids) != sorted(ids):
        raise SystemExit(
            "Review batches do not cover all proposals."
        )

    manifest = {
        "schema_version": 1,
        "status": "proposed-not-applied",
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
            "mechanical_candidates_sha256": (
                sha256_file(CANDIDATES_PATH)
            ),
            "resolution_analysis_sha256": (
                sha256_file(ANALYSIS_PATH)
            ),
            "application_evidence_sha256": (
                sha256_file(APPLICATION_PATH)
            ),
        },
        "totals": {
            "staged_segment_count": (
                application["summary"][
                    "reading_segment_count"
                ]
            ),
            "candidate_count": (
                candidates["item_count"]
            ),
            "proposal_count": len(proposals),
            "continuity_invariants_passed": (
                len(proposals)
            ),
            "batch_count": len(batches),
            "boundary_approval_count": 0,
            "content_approval_count": 0,
            "database_change_count": 0,
        },
        "locator_type_counts": dict(
            sorted(locator_types.items())
        ),
        "proposals": proposals,
        "application_boundary": policy[
            "application_boundary"
        ],
    }

    batch_manifest = {
        "schema_version": 1,
        "status": (
            "mechanical-resolution-review-batches"
        ),
        "policy_version": policy[
            "policy_version"
        ],
        "run_id": design["run_id"],
        "proposal_count": len(proposals),
        "batch_count": len(batches),
        "maximum_batch_size": policy[
            "maximum_review_batch_size"
        ],
        "batches": batches,
        "application_boundary": {
            "boundary_approved": False,
            "content_approved": False,
            "database_change_applied": False,
            "cutover_enabled": False,
        },
    }

    PROPOSALS_PATH.write_text(
        json.dumps(
            manifest,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )
    BATCHES_PATH.write_text(
        json.dumps(
            batch_manifest,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )

    report = f"""# Mechanical Resolution Proposals

- Status: `proposed-not-applied`
- Policy version: `{policy["policy_version"]}`
- Migration run ID: `{design["run_id"]}`
- Candidates analyzed: `166`
- Resolution proposals: `166`
- Continuity invariants passed: `166`
- Review batches: `{len(batches)}`
- Boundaries approved: `0`
- Content approved or loaded: `0`
- Database changes: `0`
- Production changes: `0`
- Cutover enabled: `false`

## Method

Each proposal uses the verified canonical start locator of the immediately following segment as the proposed exclusive end locator of the current segment.

## Evidence

Every proposal confirms:

- same work;
- adjacent segment order;
- valid design successor link;
- exact successor-locator equality;
- shared-page evidence;
- distinct non-page anchor signatures.

## Decision

The 166 records are review proposals only. No boundary is approved and no staged row is updated.
"""

    REPORT_PATH.write_text(
        report,
        encoding="utf-8",
        newline="\n",
    )

    print(
        f"Generated {len(proposals)} proposals."
    )
    print(
        f"Generated {len(batches)} review batches."
    )
    print(
        "No database operation was executed."
    )


if __name__ == "__main__":
    main()
