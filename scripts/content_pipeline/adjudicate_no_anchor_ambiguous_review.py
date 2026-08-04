#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from hash_utils import sha256_legacy_crlf

ROOT = Path.cwd()

PATHS = {
    "policy": ROOT
    / "content/migration/reading-segment-no-anchor-ambiguous-adjudication-policy.json",
    "packet": ROOT
    / "content/migration/reading-segment-no-anchor-ambiguous-review-packet.json",
    "corpus": ROOT
    / "content/migration/reading-segment-no-anchor-discovery-corpus.json",
    "progress": ROOT
    / "content/migration/reading-segment-source-review-progress.json",
    "decisions": ROOT
    / "content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json",
    "integration_plan": ROOT
    / "content/migration/reading-segment-no-anchor-ambiguous-integration-plan.json",
    "report": ROOT
    / "content/migration/reports/reading-segment-no-anchor-ambiguous-adjudication-summary.md",
    "private_audit": ROOT
    / ".vereda-private/source-review/pr-0044-no-anchor-ambiguous-adjudication/private-adjudication.local.json",
}

ADJUDICATIONS: dict[str, dict[str, Any]] = {
    "ca34fe5d192f446074599420": {
        "candidate_index": 0,
        "outcome": "adjust-successor-start",
        "confidence": "high",
        "rationale_code": "first-successor-content-after-current-heading"
    },
    "0ece331adf907f3b0f84a68f": {
        "candidate_index": 0,
        "outcome": "confirm-successor-start",
        "confidence": "high",
        "rationale_code": "numbered-transition-matches-successor-opening"
    },
    "461505522a3a1448a4c87e9e": {
        "candidate_index": None,
        "outcome": "unresolved",
        "confidence": "low",
        "rationale_code": "no-candidate-identifies-canonical-successor-opening"
    },
    "ae3f5201e9fa12cf865ec958": {
        "candidate_index": 3,
        "outcome": "adjust-successor-start",
        "confidence": "medium",
        "rationale_code": "alternate-pair-captures-negative-to-affirmative-transition"
    },
    "27e685beed7bd675f1d459b5": {
        "candidate_index": 1,
        "outcome": "adjust-successor-start",
        "confidence": "medium",
        "rationale_code": "alternate-pair-captures-transition-to-second-part"
    },
    "2b6a174a8df71951cf035e6a": {
        "candidate_index": 0,
        "outcome": "confirm-successor-start",
        "confidence": "medium",
        "rationale_code": "chapter-opening-to-first-successor-paragraph"
    },
    "49c1115582d8b34a99cc5d3d": {
        "candidate_index": 3,
        "outcome": "adjust-successor-start",
        "confidence": "medium",
        "rationale_code": "alternate-successor-paragraph-matches-object-throwing-start"
    },
    "cc6899ab5fff646f9f3623ce": {
        "candidate_index": 1,
        "outcome": "confirm-successor-start",
        "confidence": "high",
        "rationale_code": "globular-spirit-paragraph-precedes-hallucination-heading"
    },
    "f86f5f660d02e8dcdec363dd": {
        "candidate_index": 0,
        "outcome": "confirm-successor-start",
        "confidence": "high",
        "rationale_code": "vespasian-paragraph-precedes-transfiguration-opening"
    },
    "29dbc2af252b7975bfdfc9d2": {
        "candidate_index": None,
        "outcome": "unresolved",
        "confidence": "low",
        "rationale_code": "candidate-current-anchors-belong-to-prior-material"
    },
    "5506be25c8edfc428b3445fa": {
        "candidate_index": None,
        "outcome": "unresolved",
        "confidence": "low",
        "rationale_code": "candidate-pair-does-not-isolate-target-sections"
    },
    "ab77c3f8a7c7a5a6f7dc2526": {
        "candidate_index": None,
        "outcome": "unresolved",
        "confidence": "low",
        "rationale_code": "chapter-list-candidate-does-not-identify-subsection-boundary"
    },
    "d453a364c1a20d0b21c85c6a": {
        "candidate_index": None,
        "outcome": "unresolved",
        "confidence": "low",
        "rationale_code": "candidate-current-anchor-precedes-target-chapter"
    },
    "c172855c2ef75f24e632a536": {
        "candidate_index": None,
        "outcome": "unresolved",
        "confidence": "low",
        "rationale_code": "candidate-current-anchor-does-not-identify-inert-mediums-section"
    },
    "a1c1f52d63a279303f045a01": {
        "candidate_index": 3,
        "outcome": "confirm-successor-start",
        "confidence": "high",
        "rationale_code": "subjugation-paragraph-precedes-causes-opening"
    },
    "d5f756c19934aa57901c3a54": {
        "candidate_index": 1,
        "outcome": "confirm-successor-start",
        "confidence": "high",
        "rationale_code": "causes-paragraph-precedes-combat-means-opening"
    },
    "1636f3697c5b061474bea0ff": {
        "candidate_index": 1,
        "outcome": "adjust-successor-start",
        "confidence": "medium",
        "rationale_code": "alternate-pair-captures-transition-to-private-evocations"
    },
    "a7e6f2445c2d4384b6cd3166": {
        "candidate_index": 0,
        "outcome": "confirm-successor-start",
        "confidence": "high",
        "rationale_code": "question-series-precedes-animal-evocations-opening"
    },
    "1ea97f6309ed08451096e49b": {
        "candidate_index": None,
        "outcome": "unresolved",
        "confidence": "low",
        "rationale_code": "successor-candidates-identify-chapter-not-subsection"
    },
    "c7c12401bf19ceaa875ec409": {
        "candidate_index": None,
        "outcome": "unresolved",
        "confidence": "low",
        "rationale_code": "successor-candidates-identify-chapter-not-spirit-fate-section"
    },
    "cfa234d24f2f65c708a90a72": {
        "candidate_index": None,
        "outcome": "unresolved",
        "confidence": "low",
        "rationale_code": "candidate-pairs-belong-to-unrelated-meetings-chapter"
    },
    "78292d40f0ef490a23250c30": {
        "candidate_index": 1,
        "outcome": "confirm-successor-start",
        "confidence": "medium",
        "rationale_code": "society-paragraph-precedes-apocryphal-communications-heading"
    },
    "41256a94961280b0ec185b2a": {
        "candidate_index": 0,
        "outcome": "adjust-successor-start",
        "confidence": "high",
        "rationale_code": "final-dream-paragraph-precedes-magi-heading"
    },
    "967bb923009521831a90dedd": {
        "candidate_index": 0,
        "outcome": "confirm-successor-start",
        "confidence": "high",
        "rationale_code": "bethsaida-heading-precedes-paralytic-opening"
    },
    "5614b07b464989d7e8bc9a4b": {
        "candidate_index": 0,
        "outcome": "confirm-successor-start",
        "confidence": "high",
        "rationale_code": "curved-woman-heading-precedes-pool-paralytic-opening"
    }
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def sha256(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)

    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--private-packet",
        type=Path,
        default=ROOT
        / ".vereda-private/source-review/pr-0043-no-anchor-ambiguous-review/private-review-packet.local.json",
    )
    parser.add_argument(
        "--private-output",
        type=Path,
        required=True,
    )
    args = parser.parse_args()

    private_packet_path = args.private_packet.expanduser().resolve()
    private_output = args.private_output.expanduser().resolve()

    if not private_packet_path.is_file():
        raise RuntimeError(
            "Private PR-0043 review packet not found: "
            + str(private_packet_path)
        )

    policy = read_json(PATHS["policy"])
    packet = read_json(PATHS["packet"])
    corpus = read_json(PATHS["corpus"])
    progress = read_json(PATHS["progress"])
    private_packet = read_json(private_packet_path)

    packet_items = packet.get("items") or []
    by_segment = {
        item["segment_key"]: item
        for item in packet_items
    }

    if len(packet_items) != 25 or len(by_segment) != 25:
        raise RuntimeError(
            "The public packet must contain exactly 25 unique items."
        )

    if set(by_segment) != set(ADJUDICATIONS):
        missing = sorted(set(by_segment) - set(ADJUDICATIONS))
        unexpected = sorted(set(ADJUDICATIONS) - set(by_segment))
        raise RuntimeError(
            "Adjudication coverage differs. "
            f"Missing={missing}; unexpected={unexpected}"
        )

    private_items = private_packet.get("items")

    if isinstance(private_items, list) and len(private_items) != 25:
        raise RuntimeError(
            "The private packet item count differs from 25."
        )

    generated_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )
    outcome_counts: Counter[str] = Counter()
    confidence_counts: Counter[str] = Counter()
    book_counts: Counter[str] = Counter()
    packet_counts: Counter[str] = Counter()
    decisions = []
    private_audit_items = []
    candidate_override_count = 0

    for item in sorted(
        packet_items,
        key=lambda value: (
            value["book_id"],
            value["segment_order"],
        ),
    ):
        specification = ADJUDICATIONS[item["segment_key"]]
        candidate_index = specification["candidate_index"]
        outcome = specification["outcome"]
        confidence = specification["confidence"]
        rationale_code = specification["rationale_code"]
        selected_candidate = None

        if outcome == "unresolved":
            if candidate_index is not None or confidence != "low":
                raise RuntimeError(
                    item["segment_key"]
                    + ": unresolved decisions require null candidate and low confidence."
                )
            review_status = "unresolved"
        else:
            candidates = item.get("candidates") or []
            selected_candidate = next(
                (
                    candidate
                    for candidate in candidates
                    if candidate.get("candidate_index")
                    == candidate_index
                ),
                None,
            )

            if selected_candidate is None:
                raise RuntimeError(
                    item["segment_key"]
                    + f": candidate index {candidate_index} is unavailable."
                )

            if selected_candidate.get("current_precedes_successor") is not True:
                raise RuntimeError(
                    item["segment_key"]
                    + ": selected pair does not preserve canonical order."
                )

            review_status = "reviewed"

            if candidate_index != 0:
                candidate_override_count += 1

        adjudication_id = hashlib.sha256(
            (
                policy["policy_version"]
                + "|"
                + item["review_packet_item_id"]
            ).encode("utf-8")
        ).hexdigest()[:24]

        decision = {
            "adjudication_id": adjudication_id,
            "review_packet_item_id": item["review_packet_item_id"],
            "discovery_item_id": item["discovery_item_id"],
            "decision_id": item["decision_id"],
            "inspection_id": item["inspection_id"],
            "packet_id": item["packet_id"],
            "run_id": item["run_id"],
            "book_id": item["book_id"],
            "book_slug": item["book_slug"],
            "segment_key": item["segment_key"],
            "segment_order": item["segment_order"],
            "current_title": item["current_title"],
            "successor_segment_key": item["successor_segment_key"],
            "successor_title": item["successor_title"],
            "review_status": review_status,
            "selected_candidate_index": candidate_index,
            "selected_outcome": outcome,
            "reviewer_confidence": confidence,
            "rationale_code": rationale_code,
            "selected_pair": selected_candidate,
            "manual_review_required": True,
            "manual_review_completed": True,
            "review_questions_answered": True,
            "boundary_decision_recorded": True,
            "boundary_approved": False,
            "source_text_included": False,
            "source_excerpt_included": False,
            "database_change_applied": False,
            "content_approved": False,
            "content_loaded": False,
            "cutover_enabled": False,
        }
        decisions.append(decision)
        private_audit_items.append(
            {
                "adjudication_id": adjudication_id,
                "review_packet_item_id": item["review_packet_item_id"],
                "segment_key": item["segment_key"],
                "current_title": item["current_title"],
                "successor_title": item["successor_title"],
                "selected_candidate_index": candidate_index,
                "selected_outcome": outcome,
                "reviewer_confidence": confidence,
                "rationale_code": rationale_code,
                "private_review_packet_read": True,
            }
        )
        outcome_counts[outcome] += 1
        confidence_counts[confidence] += 1
        book_counts[str(item["book_id"])] += 1
        packet_counts[item["packet_id"]] += 1

    resolved_count = sum(
        decision["review_status"] == "reviewed"
        for decision in decisions
    )
    unresolved_count = sum(
        decision["review_status"] == "unresolved"
        for decision in decisions
    )
    expected = policy["expected_totals"]

    actual = {
        "item_count": len(decisions),
        "resolved_count": resolved_count,
        "unresolved_count": unresolved_count,
        "confirm_successor_start_count":
            outcome_counts["confirm-successor-start"],
        "adjust_successor_start_count":
            outcome_counts["adjust-successor-start"],
        "merge_with_successor_count":
            outcome_counts["merge-with-successor"],
        "candidate_override_count": candidate_override_count,
        "high_confidence_count": confidence_counts["high"],
        "medium_confidence_count": confidence_counts["medium"],
        "low_confidence_count": confidence_counts["low"],
    }

    if actual != expected:
        raise RuntimeError(
            "Adjudication totals differ. "
            f"Expected={expected}; actual={actual}"
        )

    input_hashes = {
        "review_packet_sha256": sha256(PATHS["packet"]),
        "discovery_corpus_sha256": sha256(PATHS["corpus"]),
        "progress_sha256": sha256(PATHS["progress"]),
        "private_review_packet_sha256": sha256(private_packet_path),
    }
    artifact = {
        "schema_version": 1,
        "status": "no-anchor-ambiguous-adjudication-recorded-not-integrated",
        "policy_version": policy["policy_version"],
        "run_id": packet["run_id"],
        "rights_status": "blocked",
        "contains_full_text": False,
        "contains_source_excerpt": False,
        "generated_at": generated_at,
        "input_hashes": input_hashes,
        "totals": {
            **actual,
            "manual_review_completed_count": 25,
            "review_decision_count": 25,
            "prepared_lane_preserved_count": 63,
            "cumulative_progress_change_count": 0,
            "boundary_approved_count": 0,
            "database_change_count": 0,
        },
        "counts_by_book": dict(
            sorted(
                book_counts.items(),
                key=lambda value: int(value[0]),
            )
        ),
        "counts_by_packet": dict(sorted(packet_counts.items())),
        "counts_by_outcome": {
            "confirm-successor-start":
                outcome_counts["confirm-successor-start"],
            "adjust-successor-start":
                outcome_counts["adjust-successor-start"],
            "merge-with-successor":
                outcome_counts["merge-with-successor"],
            "unresolved": outcome_counts["unresolved"],
        },
        "counts_by_confidence": {
            "high": confidence_counts["high"],
            "medium": confidence_counts["medium"],
            "low": confidence_counts["low"],
        },
        "decisions": decisions,
        "adjudication_boundary": policy["adjudication_boundary"],
    }
    current_state = {
        "reviewed_count": progress["totals"]["reviewed_count"],
        "unresolved_count": progress["totals"]["unresolved_count"],
        "pending_count": progress["totals"]["pending_count"],
        "public_decision_count":
            progress["totals"]["public_decision_count"],
        "completed_packet_count":
            progress["totals"]["completed_packet_count"],
        "pending_packet_count":
            progress["totals"]["pending_packet_count"],
    }
    delta = {
        "reviewed_count": resolved_count,
        "unresolved_count": unresolved_count,
        "pending_count": -25,
        "public_decision_count": 25,
        "completed_packet_count": 0,
        "pending_packet_count": 0,
    }
    projected = {
        key: current_state[key] + delta[key]
        for key in current_state
    }
    integration_plan = {
        "schema_version": 1,
        "status": "no-anchor-ambiguous-integration-planned-not-applied",
        "policy_version": policy["policy_version"],
        "run_id": packet["run_id"],
        "source_decision_status":
            "no-anchor-ambiguous-adjudication-recorded-not-integrated",
        "current_state": current_state,
        "planned_delta": delta,
        "projected_state": projected,
        "preserved_prepared_lane": {
            "item_count": 63,
            "status": "anchor-evidence-prepared-not-reviewed",
        },
        "packet_completion_delta": {
            "completed_packet_count": 0,
            "reason":
                "Every affected packet still contains prepared items awaiting adjudication."
        },
        "integration_boundary": {
            "decisions_validated": True,
            "progress_update_planned": True,
            "progress_update_applied": False,
            "historical_validators_modified": False,
            "database_change_applied": False,
            "cutover_enabled": False,
        },
    }
    private_audit = {
        "schema_version": 1,
        "status": "private-no-anchor-ambiguous-adjudication-audit",
        "warning": "Gitignored private review audit. Do not commit or redistribute.",
        "generated_at": generated_at,
        "private_review_packet_path": str(private_packet_path),
        "input_hashes": input_hashes,
        "items": private_audit_items,
    }

    write_json(PATHS["decisions"], artifact)
    write_json(PATHS["integration_plan"], integration_plan)
    write_json(PATHS["private_audit"], private_audit)

    report_lines = [
        "# No-Anchor Ambiguous Adjudication",
        "",
        "- Status: `no-anchor-ambiguous-adjudication-recorded-not-integrated`",
        f"- Policy version: `{policy['policy_version']}`",
        f"- Migration run ID: `{packet['run_id']}`",
        "- Target items: `25`",
        f"- Resolved outcomes: `{resolved_count}`",
        f"- Unresolved outcomes: `{unresolved_count}`",
        "- Confirm successor start: "
        f"`{outcome_counts['confirm-successor-start']}`",
        "- Adjust successor start: "
        f"`{outcome_counts['adjust-successor-start']}`",
        "- Merge with successor: "
        f"`{outcome_counts['merge-with-successor']}`",
        f"- Candidate overrides: `{candidate_override_count}`",
        f"- High confidence: `{confidence_counts['high']}`",
        f"- Medium confidence: `{confidence_counts['medium']}`",
        f"- Low confidence: `{confidence_counts['low']}`",
        "- Preserved prepared items: `63`",
        "- Manual reviews completed: `25`",
        "- Review decisions recorded: `25`",
        "- Cumulative progress changes: `0`",
        "- Boundary approvals: `0`",
        "- Database changes: `0`",
        "- Source text committed: `false`",
        "- Cutover enabled: `false`",
        "",
        "## Counts by book",
        "",
        "| Book ID | Items |",
        "| ---: | ---: |",
    ]

    for book_id, count in sorted(
        book_counts.items(),
        key=lambda value: int(value[0]),
    ):
        report_lines.append(
            f"| {book_id} | {count} |"
        )

    report_lines.extend(
        [
            "",
            "## Projected integration state",
            "",
            "| Metric | Current | Projected |",
            "| --- | ---: | ---: |",
            f"| Reviewed | {current_state['reviewed_count']} | {projected['reviewed_count']} |",
            f"| Unresolved | {current_state['unresolved_count']} | {projected['unresolved_count']} |",
            f"| Pending | {current_state['pending_count']} | {projected['pending_count']} |",
            f"| Public decisions | {current_state['public_decision_count']} | {projected['public_decision_count']} |",
            f"| Completed packets | {current_state['completed_packet_count']} | {projected['completed_packet_count']} |",
            f"| Pending packets | {current_state['pending_packet_count']} | {projected['pending_packet_count']} |",
            "",
            "## Workflow boundary",
            "",
            "This PR records structured adjudication decisions only.",
            "",
            "It does not integrate cumulative progress or approve or apply editorial boundaries.",
            "",
        ]
    )
    PATHS["report"].parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    PATHS["report"].write_text(
        "\n".join(report_lines),
        encoding="utf-8",
        newline="\n",
    )

    private_lines = [
        "VEREDA — PRIVATE NO-ANCHOR AMBIGUOUS ADJUDICATION",
        "",
        "PRIVATE REVIEW MATERIAL",
        "Do not commit or redistribute this file.",
        "",
        f"Generated at: {generated_at}",
        "Target items: 25",
        f"Resolved outcomes: {resolved_count}",
        f"Unresolved outcomes: {unresolved_count}",
        "",
    ]

    for index, item in enumerate(
        private_audit_items,
        start=1,
    ):
        private_lines.extend(
            [
                "=" * 72,
                f"CASE {index}: {item['current_title']}",
                "=" * 72,
                f"Segment key: {item['segment_key']}",
                f"Expected successor: {item['successor_title']}",
                "Selected candidate index: "
                + str(item["selected_candidate_index"]),
                f"Selected outcome: {item['selected_outcome']}",
                f"Reviewer confidence: {item['reviewer_confidence']}",
                f"Rationale code: {item['rationale_code']}",
                "",
            ]
        )

    private_output.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    private_output.write_text(
        "\n".join(private_lines),
        encoding="utf-8",
        newline="\n",
    )

    print(
        "Adjudicated all 25 ambiguous no-anchor items."
    )
    print(
        f"Resolved: {resolved_count}; unresolved: {unresolved_count}."
    )
    print(
        "Recorded 10 confirmations, 6 adjustments, and 0 merges."
    )
    print(
        "Projected state after later integration: "
        "70 reviewed, 11 unresolved, and 63 pending."
    )
    print(
        "No cumulative progress, database, production, or cutover change was introduced."
    )


if __name__ == "__main__":
    main()
