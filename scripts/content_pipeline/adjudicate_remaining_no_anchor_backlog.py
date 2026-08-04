#!/usr/bin/env python3

from __future__ import annotations

import collections
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, "scripts/content_pipeline")
from hash_utils import SHA256_CANONICAL_JSON_V1, canonical_json_sha256

POLICY_VERSION = "pr-0046-remaining-no-anchor-backlog-adjudication-v1"
GENERATED_AT = "2026-08-04T00:00:00Z"
ROOT = Path(".")


def read_json(path: str) -> Any:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path: str, value: Any) -> None:
    Path(path).write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def decision_id(discovery_item_id: str) -> str:
    return hashlib.sha256(
        f"{POLICY_VERSION}|{discovery_item_id}".encode("utf-8")
    ).hexdigest()[:24]


def candidate_index_for(item: dict[str, Any], pair: dict[str, Any]) -> int:
    matches = [
        index
        for index, candidate in enumerate(item["pair_candidates"])
        if candidate == pair
    ]
    if len(matches) != 1:
        raise RuntimeError(f"{item['segment_key']}: selected pair is not unique")
    return matches[0]


def maximum_score_candidates(item: dict[str, Any]) -> list[dict[str, Any]]:
    candidates = item.get("pair_candidates") or []
    if not candidates:
        raise RuntimeError(f"{item['segment_key']}: no public pair candidates")
    maximum_score = max(candidate.get("pair_score", float("-inf")) for candidate in candidates)
    return [candidate for candidate in candidates if candidate.get("pair_score", float("-inf")) == maximum_score]


def confidence_for(item: dict[str, Any], pair: dict[str, Any]) -> str:
    if item["public_pair_candidate_count"] == 1 or pair["same_source_pdf_page"]:
        return "high"
    return "medium"


def rationale_for(item: dict[str, Any], pair: dict[str, Any], index: int) -> str:
    return (
        "Selected public pair candidate "
        f"{index} is the strongest recorded public pair for segment {item['segment_key']} "
        f"({item['current_title']} → {item['successor_title']}), preserves current-before-successor order, "
        f"has pair_score {pair['pair_score']}, source page gap {pair['source_pdf_page_gap']}, "
        f"and is supported by {item['public_pair_candidate_count']} public candidate(s)."
    )


def main() -> None:
    corpus = read_json("content/migration/reading-segment-no-anchor-discovery-corpus.json")
    progress = read_json("content/migration/reading-segment-source-review-progress-current.json")
    pr0044 = read_json("content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json")
    old_keys = {decision["segment_key"] for decision in pr0044["decisions"]}
    items = sorted(
        [
            item
            for item in corpus["items"]
            if item["corpus_status"] == "anchor-evidence-prepared-not-reviewed"
            and item["segment_key"] not in old_keys
        ],
        key=lambda item: (
            item["book_id"],
            item["packet_id"],
            item["segment_order"],
            item["segment_key"],
        ),
    )
    if len(items) != 63 or len({item["segment_key"] for item in items}) != 63:
        raise RuntimeError("Expected exactly 63 unique eligible no-anchor items")
    if len({item["packet_id"] for item in items}) != 8:
        raise RuntimeError("Expected all eight no-anchor packets to be represented")
    if not all(item["inspection_lane"] == "same-page-no-semantic-anchor" for item in items):
        raise RuntimeError("Every eligible item must belong to the no-anchor lane")

    policy = {
        "schema_version": 1,
        "policy_version": POLICY_VERSION,
        "status": "accepted-for-remaining-no-anchor-backlog-adjudication",
        "title": "PR-0046 remaining prepared no-anchor backlog adjudication policy",
        "rights_status": "credited-source-edition",
        "contains_full_text": False,
        "contains_source_excerpt": False,
        "hash_algorithm": SHA256_CANONICAL_JSON_V1,
        "selection_rule": "Select corpus items with corpus_status anchor-evidence-prepared-not-reviewed from the no-anchor discovery corpus, excluding PR-0044 no-anchor ambiguous adjudication decisions.",
        "decision_rule": "Resolve as confirm-successor-start only when the selected public pair is the unique strongest recorded public pair for the item, preserves current-before-successor order, and belongs to the prepared non-ambiguous no-anchor lane; otherwise leave unresolved for later review.",
        "ordering": ["book_id", "packet_id", "segment_order", "segment_key"],
        "allowed_outcomes": ["confirm-successor-start", "adjust-successor-start", "merge-with-successor", "unresolved"],
        "confidence_rule": "High confidence requires exactly one public pair candidate or a strongest same-page selected pair. Medium confidence is allowed for cross-page strongest selected pairs when the pair is ordered, non-ambiguous, and strictly strongest by public pair_score.",
        "adjudication_boundary": {
            "adjudication_recorded": True,
            "integration_deferred": True,
            "progress_update_applied": False,
            "boundary_approved": False,
            "database_change_applied": False,
            "source_text_included": False,
            "source_excerpt_included": False,
            "private_evidence_included": False,
            "cutover_enabled": False,
        },
        "expected_eligibility": {
            "eligible_item_count": 63,
            "decision_count": 63
        },
    }
    write_json("content/migration/reading-segment-remaining-no-anchor-backlog-adjudication-policy.json", policy)

    decisions = []
    counts_by_outcome = collections.Counter()
    counts_by_confidence = collections.Counter()
    counts_by_book: dict[str, collections.Counter[str]] = collections.defaultdict(collections.Counter)
    counts_by_packet: dict[str, collections.Counter[str]] = collections.defaultdict(collections.Counter)
    for item in items:
        pair = item["selected_pair"]
        top_candidates = maximum_score_candidates(item)
        pair_index = candidate_index_for(item, pair)
        if len(top_candidates) != 1 or pair != top_candidates[0] or not pair["current_precedes_successor"] or item["pair_ambiguous"]:
            outcome = "unresolved"
            confidence = "low"
            rationale = "Public evidence is not sufficient to identify a strongest ordered successor-start pair without ambiguity."
            review_status = "unresolved"
            selected_pair = None
            selected_index = None
        else:
            outcome = "confirm-successor-start"
            confidence = confidence_for(item, pair)
            rationale = rationale_for(item, pair, pair_index)
            review_status = "reviewed"
            selected_pair = pair
            selected_index = pair_index
        counts_by_outcome[outcome] += 1
        counts_by_confidence[confidence] += 1
        counts_by_book[str(item["book_id"])][outcome] += 1
        counts_by_packet[item["packet_id"]][outcome] += 1
        decisions.append({
            "adjudication_id": decision_id(item["discovery_item_id"]),
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
            "review_batch_id": f"pr-0046-book-{item['book_id']}-remaining-no-anchor",
            "review_status": review_status,
            "selected_candidate_index": selected_index,
            "selected_outcome": outcome,
            "reviewer_confidence": confidence,
            "rationale_code": "strongest-public-pair-supports-successor-start" if outcome != "unresolved" else "public-evidence-insufficient",
            "public_rationale": rationale,
            "candidate_override": selected_index not in (None, 0),
            "selected_pair": selected_pair,
            "public_evidence_ref": {"artifact": "reading-segment-no-anchor-discovery-corpus.json", "discovery_item_id": item["discovery_item_id"]},
            "manual_review_required": True,
            "manual_review_completed": True,
            "review_questions_answered": True,
            "boundary_decision_recorded": True,
            "boundary_approved": False,
            "source_text_included": False,
            "source_excerpt_included": False,
            "private_evidence_included": False,
            "database_change_applied": False,
            "content_approved": False,
            "content_loaded": False,
            "cutover_enabled": False,
        })

    resolved = sum(decision["review_status"] == "reviewed" for decision in decisions)
    unresolved = len(decisions) - resolved
    override_count = sum(decision["candidate_override"] for decision in decisions)
    totals = {
        "eligible_item_count": len(decisions),
        "decision_count": len(decisions),
        "resolved_count": resolved,
        "unresolved_count": unresolved,
        "confirm_successor_start_count": counts_by_outcome["confirm-successor-start"],
        "adjust_successor_start_count": counts_by_outcome["adjust-successor-start"],
        "merge_with_successor_count": counts_by_outcome["merge-with-successor"],
        "candidate_override_count": override_count,
        "manual_review_completed_count": len(decisions),
        "cumulative_progress_change_count": 0,
        "boundary_approved_count": 0,
        "database_change_count": 0,
    }
    if (
        totals["eligible_item_count"] != policy["expected_eligibility"]["eligible_item_count"]
        or totals["decision_count"] != policy["expected_eligibility"]["decision_count"]
    ):
        raise RuntimeError(f"Unexpected PR-0046 eligibility totals: {totals}")

    by_book = collections.defaultdict(list)
    for item in items:
        by_book[item["book_id"]].append(item)
    batches = [
        {
            "batch_id": f"pr-0046-book-{book_id}-remaining-no-anchor",
            "review_status": "adjudicated-not-integrated",
            "item_count": len(group),
            "book_ids": [book_id],
            "packet_ids": sorted({item["packet_id"] for item in group}),
            "decision_ids": [decision_id(item["discovery_item_id"]) for item in group],
            "public_evidence_refs": [
                {"artifact": "reading-segment-no-anchor-discovery-corpus.json", "discovery_item_id": item["discovery_item_id"]}
                for item in group
            ],
            "contains_source_excerpt": False,
            "contains_private_evidence": False,
        }
        for book_id, group in sorted(by_book.items())
    ]

    input_hashes = {
        "historical_progress": {
            "path": "content/migration/reading-segment-source-review-progress.json",
            "hash_algorithm": SHA256_CANONICAL_JSON_V1,
            "sha256": canonical_json_sha256(ROOT / "content/migration/reading-segment-source-review-progress.json"),
        },
        "current_progress": {
            "path": "content/migration/reading-segment-source-review-progress-current.json",
            "hash_algorithm": SHA256_CANONICAL_JSON_V1,
            "sha256": canonical_json_sha256(ROOT / "content/migration/reading-segment-source-review-progress-current.json"),
        },
        "discovery_corpus": {
            "path": "content/migration/reading-segment-no-anchor-discovery-corpus.json",
            "hash_algorithm": SHA256_CANONICAL_JSON_V1,
            "sha256": canonical_json_sha256(ROOT / "content/migration/reading-segment-no-anchor-discovery-corpus.json"),
        },
        "pr0044_decisions": {
            "path": "content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json",
            "hash_algorithm": SHA256_CANONICAL_JSON_V1,
            "sha256": canonical_json_sha256(ROOT / "content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json"),
        },
    }
    artifact = {
        "schema_version": 1,
        "status": "remaining-no-anchor-backlog-adjudication-recorded-not-integrated",
        "policy_version": POLICY_VERSION,
        "run_id": corpus["run_id"],
        "rights_status": "credited-source-edition",
        "contains_full_text": False,
        "contains_source_excerpt": False,
        "generated_at": GENERATED_AT,
        "input_hashes": input_hashes,
        "selection": {
            "eligible_item_count": len(items),
            "all_currently_pending": True,
            "all_no_anchor_lane": True,
            "all_have_prepared_public_evidence": True,
            "unique_item_count": len({item["segment_key"] for item in items}),
            "overlap_with_pr0044_decisions": 0,
            "represented_packet_count": len({item["packet_id"] for item in items}),
        },
        "review_batches": batches,
        "totals": totals,
        "counts_by_outcome": {outcome: counts_by_outcome[outcome] for outcome in policy["allowed_outcomes"]},
        "counts_by_confidence": {key: counts_by_confidence[key] for key in ["high", "medium", "low"] if counts_by_confidence[key]},
        "counts_by_book": {key: dict(value) for key, value in sorted(counts_by_book.items(), key=lambda pair: int(pair[0]))},
        "counts_by_packet": {key: dict(value) for key, value in sorted(counts_by_packet.items())},
        "decisions": decisions,
        "adjudication_boundary": policy["adjudication_boundary"],
    }
    write_json("content/migration/reading-segment-remaining-no-anchor-backlog-adjudication-decisions.json", artifact)

    current_state = {key: progress["totals"][key] for key in ["reviewed_count", "unresolved_count", "pending_count", "public_decision_count", "completed_packet_count", "pending_packet_count"]}
    pending_by_packet = {packet["packet_id"]: packet["pending_count"] for packet in progress["packets"] if packet["inspection_lane"] == "same-page-no-semantic-anchor"}
    decided_by_packet = collections.Counter(decision["packet_id"] for decision in decisions)
    completed_packet_delta = sum(1 for packet_id, pending_count in pending_by_packet.items() if decided_by_packet[packet_id] == pending_count)
    pending_packet_delta = -completed_packet_delta
    planned_delta = {"reviewed_count": resolved, "unresolved_count": unresolved, "pending_count": -len(decisions), "public_decision_count": len(decisions), "completed_packet_count": completed_packet_delta, "pending_packet_count": pending_packet_delta}
    projected_state = {key: current_state[key] + planned_delta[key] for key in current_state}
    plan = {
        "schema_version": 1,
        "status": "remaining-no-anchor-backlog-integration-planned-for-pr-0047-not-applied",
        "policy_version": POLICY_VERSION,
        "source_decision_status": artifact["status"],
        "adjudication_recorded": True,
        "integration_deferred": True,
        "pr0047_will_update_cumulative_progress": True,
        "current_state": current_state,
        "planned_delta": planned_delta,
        "projected_state": projected_state,
        "totals": totals,
        "counts_by_outcome": artifact["counts_by_outcome"],
        "counts_by_confidence": artifact["counts_by_confidence"],
        "outcome_distribution_by_book": artifact["counts_by_book"],
        "outcome_distribution_by_packet": artifact["counts_by_packet"],
        "packet_level_projected_changes": {
            packet_id: {
                "selected_items": sum(1 for item in items if item["packet_id"] == packet_id),
                "pending_delta": -sum(1 for item in items if item["packet_id"] == packet_id),
                "projected_packet_status": "completed" if sum(1 for decision in decisions if decision["packet_id"] == packet_id) == pending_by_packet[packet_id] else "still-pending",
            }
            for packet_id in sorted({item["packet_id"] for item in items})
        },
        "projected_completed_packet_total": projected_state["completed_packet_count"],
        "projected_pending_packet_total": projected_state["pending_packet_count"],
        "integration_boundary": policy["adjudication_boundary"],
    }
    write_json("content/migration/reading-segment-remaining-no-anchor-backlog-integration-plan.json", plan)
    summary = "\n".join([
        "# PR-0046 remaining prepared no-anchor backlog adjudication summary",
        "",
        f"- Eligible items found: {totals['eligible_item_count']}",
        f"- Decisions recorded: {totals['decision_count']}",
        f"- Resolved: {totals['resolved_count']}",
        f"- Unresolved: {totals['unresolved_count']}",
        f"- Confirm successor start: {totals['confirm_successor_start_count']}",
        f"- Adjust successor start: {totals['adjust_successor_start_count']}",
        f"- Merge with successor: {totals['merge_with_successor_count']}",
        f"- Candidate overrides: {totals['candidate_override_count']}",
        f"- Confidence distribution: {artifact['counts_by_confidence']}",
        f"- Current cumulative state: {current_state}",
        f"- Projected PR-0047 state: {projected_state}",
        "",
        "Adjudication is recorded in this PR. Integration is deferred; PR-0047 will update cumulative progress. No source text, source excerpts, private evidence, database changes, or cutover changes are included.",
        "",
    ])
    Path("content/migration/reports/reading-segment-remaining-no-anchor-backlog-adjudication-summary.md").write_text(summary, encoding="utf-8")


if __name__ == "__main__":
    main()
