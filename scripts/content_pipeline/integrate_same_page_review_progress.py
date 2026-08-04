#!/usr/bin/env python3

from __future__ import annotations

import copy
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from hash_utils import sha256_legacy_crlf

ROOT = Path.cwd()

PATHS = {
    "policy": ROOT
    / "content/migration/reading-segment-same-page-progress-integration-policy.json",
    "decisions": ROOT
    / "content/migration/reading-segment-same-page-review-decisions.json",
    "plan": ROOT
    / "content/migration/reading-segment-same-page-review-integration-plan.json",
    "progress": ROOT
    / "content/migration/reading-segment-source-review-progress.json",
    "evidence": ROOT
    / "content/migration/reading-segment-same-page-progress-integration-evidence.json",
    "report": ROOT
    / "content/migration/reports/reading-segment-same-page-progress-integration-summary.md",
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(
        path.read_text(encoding="utf-8")
    )


def write_json(
    path: Path,
    value: dict[str, Any],
) -> None:
    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
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


def sha256(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as handle:
        for chunk in iter(
            lambda: handle.read(
                1024 * 1024
            ),
            b"",
        ):
            digest.update(chunk)

    return digest.hexdigest()


def main() -> None:
    policy = read_json(PATHS["policy"])
    decisions = read_json(
        PATHS["decisions"]
    )
    plan = read_json(PATHS["plan"])
    previous = read_json(
        PATHS["progress"]
    )

    expected_current = policy[
        "target"
    ]["current_state"]
    expected_integrated = policy[
        "target"
    ]["integrated_state"]
    target_packet_ids = set(
        policy["target"]["packet_ids"]
    )

    actual_current = {
        field: previous["totals"][field]
        for field in expected_current
    }

    if actual_current != expected_current:
        raise RuntimeError(
            "Current progress differs from "
            "the integration policy gate."
        )

    if (
        decisions["totals"][
            "item_count"
        ]
        != 38
        or decisions["totals"][
            "reviewed_count"
        ]
        != 38
        or decisions["totals"][
            "unresolved_count"
        ]
        != 0
        or decisions["totals"][
            "exclude_structural_heading_count"
        ]
        != 38
    ):
        raise RuntimeError(
            "The decision artifact does not "
            "contain 38 validated exclusions."
        )

    if (
        plan["current_state"]
        != expected_current
        or plan["projected_state"]
        != expected_integrated
    ):
        raise RuntimeError(
            "The PR-0040 integration plan "
            "differs from policy."
        )

    progress = copy.deepcopy(previous)
    progress["status"] = (
        "same-page-review-integrated-not-applied"
    )
    progress["policy_version"] = (
        policy["policy_version"]
    )

    for field, value in (
        expected_integrated.items()
    ):
        progress["totals"][field] = value

    progress["totals"].update(
        {
            "same_page_review_item_count":
                38,
            "same_page_review_reviewed_count":
                38,
            "same_page_review_unresolved_count":
                0,
            "same_page_review_excluded_count":
                38,
            "same_page_review_completed_packet_count":
                4,
        }
    )

    updated_packets = []

    for packet in progress["packets"]:
        if (
            packet["packet_id"]
            not in target_packet_ids
        ):
            continue

        packet["pending_count"] = 0
        packet["in_review_count"] = 0
        packet["reviewed_count"] = (
            packet["item_count"]
        )
        packet["unresolved_count"] = 0
        packet["status"] = (
            "reviewed-not-applied"
        )
        updated_packets.append(
            packet["packet_id"]
        )

    if set(updated_packets) != target_packet_ids:
        raise RuntimeError(
            "Not all four target packets "
            "were updated."
        )

    pending_packets = [
        packet
        for packet in progress["packets"]
        if packet["status"] == "pending"
    ]
    pending_same_page_no_anchor = [
        packet
        for packet in pending_packets
        if packet["inspection_lane"]
        == "same-page-no-semantic-anchor"
    ]

    if (
        len(pending_packets) != 8
        or len(
            pending_same_page_no_anchor
        )
        != 8
        or sum(
            packet["pending_count"]
            for packet
            in pending_same_page_no_anchor
        )
        != 88
    ):
        raise RuntimeError(
            "The preserved 88-item pending "
            "lane differs."
        )

    if (
        progress["totals"][
            "pending_count"
        ]
        + progress["totals"][
            "reviewed_count"
        ]
        + progress["totals"][
            "unresolved_count"
        ]
        != progress["totals"][
            "item_count"
        ]
    ):
        raise RuntimeError(
            "Integrated item totals do not balance."
        )

    if (
        progress["totals"][
            "public_decision_count"
        ]
        != progress["totals"][
            "reviewed_count"
        ]
        + progress["totals"][
            "unresolved_count"
        ]
    ):
        raise RuntimeError(
            "Public decision totals do not balance."
        )

    if (
        progress["totals"][
            "completed_packet_count"
        ]
        + progress["totals"][
            "pending_packet_count"
        ]
        != progress["totals"][
            "packet_count"
        ]
    ):
        raise RuntimeError(
            "Packet totals do not balance."
        )

    generated_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )

    evidence = {
        "schema_version": 1,
        "status":
            "same-page-review-progress-integrated-not-applied",
        "policy_version":
            policy["policy_version"],
        "run_id":
            progress["run_id"],
        "generated_at":
            generated_at,
        "input_hashes": {
            "decision_artifact_sha256":
                sha256(
                    PATHS["decisions"]
                ),
            "integration_plan_sha256":
                sha256(PATHS["plan"]),
            "progress_before_sha256":
                sha256(
                    PATHS["progress"]
                ),
        },
        "current_state":
            expected_current,
        "applied_delta":
            plan["planned_delta"],
        "integrated_state":
            expected_integrated,
        "updated_packet_ids":
            sorted(updated_packets),
        "preserved_pending_lane": {
            "inspection_lane":
                "same-page-no-semantic-anchor",
            "packet_count": 8,
            "item_count": 88,
        },
        "preserved_manual_state": {
            "unresolved_count": 2,
            "manual_adjudication_reviewed_count":
                progress["totals"][
                    "manual_adjudication_reviewed_count"
                ],
            "manual_adjudication_resolved_count":
                progress["totals"][
                    "manual_adjudication_resolved_count"
                ],
            "manual_adjudication_still_unresolved_count":
                progress["totals"][
                    "manual_adjudication_still_unresolved_count"
                ],
        },
        "integration_boundary":
            policy[
                "integration_boundary"
            ],
    }

    report_lines = [
        "# Same-Page Progress Integration",
        "",
        (
            "- Status: "
            "`same-page-review-progress-integrated-not-applied`"
        ),
        (
            "- Policy version: "
            f"`{policy['policy_version']}`"
        ),
        (
            "- Migration run ID: "
            f"`{progress['run_id']}`"
        ),
        "- Integrated decisions: `38`",
        "- Updated packets: `4`",
        "- Reviewed before: `16`",
        "- Reviewed after: `54`",
        "- Unresolved before: `2`",
        "- Unresolved after: `2`",
        "- Pending before: `126`",
        "- Pending after: `88`",
        "- Public decisions before: `18`",
        "- Public decisions after: `56`",
        "- Completed packets before: `4`",
        "- Completed packets after: `8`",
        "- Pending packets before: `12`",
        "- Pending packets after: `8`",
        "- Boundary approvals: `0`",
        "- Database changes: `0`",
        "- Source text read: `false`",
        "- Source text committed: `false`",
        "- Cutover enabled: `false`",
        "",
        "## Updated packets",
        "",
        *[
            f"- `{packet_id}`"
            for packet_id
            in sorted(updated_packets)
        ],
        "",
        "## Preserved pending lane",
        "",
        (
            "`same-page-no-semantic-anchor` "
            "remains pending with 88 items "
            "across 8 packets."
        ),
        "",
        "## Application boundary",
        "",
        (
            "The validated review decisions "
            "are reflected in cumulative "
            "progress only."
        ),
        "",
        (
            "No editorial boundary is approved "
            "or applied to staging or production."
        ),
        "",
    ]

    write_json(
        PATHS["progress"],
        progress,
    )
    write_json(
        PATHS["evidence"],
        evidence,
    )
    PATHS["report"].parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    PATHS["report"].write_text(
        "\n".join(report_lines)
        + "\n",
        encoding="utf-8",
        newline="\n",
    )

    print(
        "Integrated 38 validated "
        "same-page decisions."
    )
    print(
        "Cumulative state: "
        "54 reviewed, 2 unresolved, "
        "and 88 pending."
    )
    print(
        "Completed packets: 8; "
        "pending packets: 8."
    )
    print(
        "Database changes: 0."
    )


if __name__ == "__main__":
    main()
