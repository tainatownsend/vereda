#!/usr/bin/env python3

from __future__ import annotations

import copy
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from hash_utils import canonical_json_sha256

ROOT = Path.cwd()

PATHS = {
    "policy": ROOT
    / "content/migration/reading-segment-no-anchor-ambiguous-progress-integration-policy.json",
    "decisions": ROOT
    / "content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json",
    "plan": ROOT
    / "content/migration/reading-segment-no-anchor-ambiguous-integration-plan.json",
    "corpus": ROOT
    / "content/migration/reading-segment-no-anchor-discovery-corpus.json",
    "historical_progress": ROOT
    / "content/migration/reading-segment-source-review-progress.json",
    "current_progress": ROOT
    / "content/migration/reading-segment-source-review-progress-current.json",
    "evidence": ROOT
    / "content/migration/reading-segment-no-anchor-ambiguous-progress-integration-evidence.json",
    "report": ROOT
    / "content/migration/reports/reading-segment-no-anchor-ambiguous-progress-integration-summary.md",
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            value,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )


def selected_state(
    progress: dict[str, Any],
    expected: dict[str, int],
) -> dict[str, int]:
    return {
        field: progress["totals"][field]
        for field in expected
    }


def main() -> None:
    policy = read_json(PATHS["policy"])
    decisions = read_json(PATHS["decisions"])
    plan = read_json(PATHS["plan"])
    corpus = read_json(PATHS["corpus"])
    historical = read_json(
        PATHS["historical_progress"]
    )

    baseline = policy["target"][
        "historical_baseline"
    ]
    current_target = policy["target"][
        "current_state"
    ]

    if selected_state(
        historical,
        baseline,
    ) != baseline:
        raise RuntimeError(
            "Historical progress differs from the immutable PR-0041 baseline."
        )

    if (
        historical["status"]
        != "same-page-review-integrated-not-applied"
    ):
        raise RuntimeError(
            "Historical progress status differs."
        )

    if (
        decisions["status"]
        != "no-anchor-ambiguous-adjudication-recorded-not-integrated"
        or decisions["totals"]["item_count"] != 25
        or decisions["totals"]["resolved_count"] != 16
        or decisions["totals"]["unresolved_count"] != 9
        or decisions["totals"][
            "review_decision_count"
        ]
        != 25
    ):
        raise RuntimeError(
            "The PR-0044 adjudication artifact differs."
        )

    if (
        plan["current_state"] != baseline
        or plan["projected_state"]
        != current_target
        or plan["planned_delta"][
            "reviewed_count"
        ]
        != 16
        or plan["planned_delta"][
            "unresolved_count"
        ]
        != 9
        or plan["planned_delta"][
            "pending_count"
        ]
        != -25
    ):
        raise RuntimeError(
            "The PR-0044 integration plan differs."
        )

    if (
        corpus["totals"][
            "evidence_prepared_count"
        ]
        != 63
        or corpus["totals"][
            "evidence_ambiguous_count"
        ]
        != 25
        or corpus["totals"][
            "evidence_incomplete_count"
        ]
        != 0
    ):
        raise RuntimeError(
            "The PR-0042 discovery corpus differs."
        )

    current = copy.deepcopy(historical)
    current["status"] = (
        "no-anchor-ambiguous-progress-integrated-not-applied"
    )
    current["policy_version"] = policy[
        "policy_version"
    ]

    for field, value in current_target.items():
        current["totals"][field] = value

    current["totals"].update(
        {
            "no_anchor_ambiguous_item_count": 25,
            "no_anchor_ambiguous_reviewed_count": 16,
            "no_anchor_ambiguous_unresolved_count": 9,
            "no_anchor_ambiguous_confirm_successor_start_count": 10,
            "no_anchor_ambiguous_adjust_successor_start_count": 6,
            "no_anchor_ambiguous_merge_with_successor_count": 0,
            "no_anchor_ambiguous_candidate_override_count": 8,
            "no_anchor_prepared_pending_count": 63,
        }
    )

    packet_deltas: dict[
        str,
        Counter[str],
    ] = {}
    decision_ids = set()
    segment_keys = set()

    for decision in decisions["decisions"]:
        decision_id = decision["decision_id"]
        segment_key = decision["segment_key"]
        packet_id = decision["packet_id"]

        if decision_id in decision_ids:
            raise RuntimeError(
                f"Duplicate decision ID: {decision_id}"
            )

        if segment_key in segment_keys:
            raise RuntimeError(
                f"Duplicate segment key: {segment_key}"
            )

        decision_ids.add(decision_id)
        segment_keys.add(segment_key)

        delta = packet_deltas.setdefault(
            packet_id,
            Counter(),
        )
        delta["item_count"] += 1

        if (
            decision["selected_outcome"]
            == "unresolved"
        ):
            delta["unresolved_count"] += 1
        else:
            delta["reviewed_count"] += 1

    expected_affected = set(
        policy["target"][
            "affected_packet_ids"
        ]
    )

    if (
        len(decision_ids) != 25
        or len(segment_keys) != 25
        or set(packet_deltas)
        != expected_affected
    ):
        raise RuntimeError(
            "Decision coverage or affected packets differ."
        )

    packet_updates = []

    for packet in current["packets"]:
        delta = packet_deltas.get(
            packet["packet_id"]
        )

        if delta is None:
            continue

        before = {
            "pending_count": packet[
                "pending_count"
            ],
            "reviewed_count": packet[
                "reviewed_count"
            ],
            "unresolved_count": packet[
                "unresolved_count"
            ],
            "status": packet["status"],
        }

        packet["pending_count"] -= delta[
            "item_count"
        ]
        packet["reviewed_count"] += delta[
            "reviewed_count"
        ]
        packet["unresolved_count"] += delta[
            "unresolved_count"
        ]
        packet["in_review_count"] = 0
        packet["status"] = (
            "review-in-progress-not-applied"
        )

        if (
            packet["pending_count"]
            + packet["reviewed_count"]
            + packet["unresolved_count"]
            != packet["item_count"]
        ):
            raise RuntimeError(
                f"{packet['packet_id']}: packet totals do not balance."
            )

        packet_updates.append(
            {
                "packet_id": packet[
                    "packet_id"
                ],
                "book_id": packet[
                    "book_id"
                ],
                "before": before,
                "applied_delta": {
                    "pending_count": -delta[
                        "item_count"
                    ],
                    "reviewed_count": delta[
                        "reviewed_count"
                    ],
                    "unresolved_count": delta[
                        "unresolved_count"
                    ],
                },
                "after": {
                    "pending_count": packet[
                        "pending_count"
                    ],
                    "reviewed_count": packet[
                        "reviewed_count"
                    ],
                    "unresolved_count": packet[
                        "unresolved_count"
                    ],
                    "status": packet[
                        "status"
                    ],
                },
            }
        )

    no_anchor_ids = set(
        policy["target"][
            "no_anchor_packet_ids"
        ]
    )
    no_anchor_packets = [
        packet
        for packet in current["packets"]
        if packet["packet_id"]
        in no_anchor_ids
    ]

    if (
        len(packet_updates) != 6
        or len(no_anchor_packets) != 8
        or sum(
            packet["item_count"]
            for packet in no_anchor_packets
        )
        != 88
        or sum(
            packet["pending_count"]
            for packet in no_anchor_packets
        )
        != 63
        or sum(
            packet["reviewed_count"]
            for packet in no_anchor_packets
        )
        != 16
        or sum(
            packet["unresolved_count"]
            for packet in no_anchor_packets
        )
        != 9
    ):
        raise RuntimeError(
            "Integrated no-anchor packet totals differ."
        )

    if (
        current["totals"]["pending_count"]
        + current["totals"]["reviewed_count"]
        + current["totals"][
            "unresolved_count"
        ]
        != current["totals"]["item_count"]
        or current["totals"][
            "public_decision_count"
        ]
        != current["totals"][
            "reviewed_count"
        ]
        + current["totals"][
            "unresolved_count"
        ]
    ):
        raise RuntimeError(
            "Current progress totals do not balance."
        )

    write_json(
        PATHS["current_progress"],
        current,
    )

    generated_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )

    evidence = {
        "schema_version": 2,
        "status": "no-anchor-ambiguous-progress-integrated-not-applied",
        "policy_version": policy[
            "policy_version"
        ],
        "run_id": decisions["run_id"],
        "rights_status": policy[
            "rights_status"
        ],
        "contains_full_text": False,
        "contains_source_excerpt": False,
        "generated_at": generated_at,
        "progress_model": policy[
            "progress_model"
        ],
        "input_hashes": {
            "hash_algorithm": "sha256-canonical-json-v1",
            "canonicalization": "parse JSON; recursively sort object keys; preserve array order; serialize compact UTF-8 JSON without insignificant whitespace; normalize integer-valued JSON numbers without a fractional suffix; hash UTF-8 bytes with SHA-256",
            "decision_artifact_sha256": canonical_json_sha256(
                PATHS["decisions"]
            ),
            "integration_plan_sha256": canonical_json_sha256(
                PATHS["plan"]
            ),
            "discovery_corpus_sha256": canonical_json_sha256(
                PATHS["corpus"]
            ),
            "historical_progress_sha256": canonical_json_sha256(
                PATHS[
                    "historical_progress"
                ]
            ),
        },
        "current_progress_sha256": canonical_json_sha256(
            PATHS["current_progress"]
        ),
        "historical_baseline": baseline,
        "applied_delta": plan[
            "planned_delta"
        ],
        "current_state": current_target,
        "decision_totals": {
            "item_count": 25,
            "resolved_count": 16,
            "unresolved_count": 9,
            "confirm_successor_start_count": 10,
            "adjust_successor_start_count": 6,
            "merge_with_successor_count": 0,
            "candidate_override_count": 8,
        },
        "packet_updates": sorted(
            packet_updates,
            key=lambda item: item[
                "packet_id"
            ],
        ),
        "preserved_prepared_lane": {
            "status": "anchor-evidence-prepared-not-reviewed",
            "item_count": 63,
            "packet_count": 8,
        },
        "integration_boundary": policy[
            "integration_boundary"
        ],
    }

    write_json(
        PATHS["evidence"],
        evidence,
    )

    report = [
        "# No-Anchor Ambiguous Progress Integration",
        "",
        "- Status: `no-anchor-ambiguous-progress-integrated-not-applied`",
        f"- Policy version: `{policy['policy_version']}`",
        "- Progress model: immutable historical baseline plus current snapshot",
        "- Integrated decisions: `25`",
        "- Resolved outcomes: `16`",
        "- Unresolved outcomes: `9`",
        "- Updated packets: `6`",
        "- Prepared items preserved: `63`",
        "- Current reviewed: `70`",
        "- Current unresolved: `11`",
        "- Current pending: `63`",
        "- Current public decisions: `81`",
        "- Historical progress modified: `false`",
        "- Historical validators modified: `false`",
        "- Historical tests modified: `false`",
        "- Database changes: `0`",
        "- Cutover enabled: `false`",
        "",
        "## Progress files",
        "",
        "Historical baseline:",
        "",
        "`content/migration/reading-segment-source-review-progress.json`",
        "",
        "Current cumulative state:",
        "",
        "`content/migration/reading-segment-source-review-progress-current.json`",
        "",
        "Later source-review PRs must read the current cumulative state file.",
        "",
    ]

    PATHS["report"].parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    PATHS["report"].write_text(
        "\n".join(report),
        encoding="utf-8",
        newline="\n",
    )

    print(
        "Created current progress snapshot: 70 reviewed, 11 unresolved, and 63 pending."
    )
    print(
        "Preserved the immutable historical progress file."
    )
    print(
        "Updated six no-anchor packet states and preserved 63 prepared items."
    )


if __name__ == "__main__":
    main()
