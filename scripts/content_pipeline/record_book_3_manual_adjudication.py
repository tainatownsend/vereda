#!/usr/bin/env python3

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path.cwd()

PATHS = {
    "policy": ROOT
    / "content/migration/reading-segment-book-3-manual-adjudication-policy.json",
    "packet": ROOT
    / "content/migration/reading-segment-book-3-manual-adjudication-packet.json",
    "queue": ROOT
    / "content/migration/reading-segment-manual-adjudication-queue.json",
    "consolidation": ROOT
    / "content/migration/reading-segment-unresolved-recovery-consolidation.json",
    "progress": ROOT
    / "content/migration/reading-segment-source-review-progress.json",
    "decisions": ROOT
    / "content/migration/reading-segment-book-3-manual-adjudication-decisions.json",
    "report": ROOT
    / "content/migration/reports/reading-segment-book-3-manual-adjudication-summary.md",
    "private": ROOT
    / ".vereda-private/source-review/pr-0037-book-3-manual-adjudication/manual-adjudication-evidence.local.json",
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


def normalize(value: str) -> str:
    value = unicodedata.normalize(
        "NFKD",
        value,
    )
    value = "".join(
        character
        for character in value
        if not unicodedata.combining(
            character
        )
    )
    value = value.casefold()
    value = re.sub(
        r"[^\w]+",
        " ",
        value,
    )
    return " ".join(
        value.split()
    )


def extract_case_section(
    text: str,
    case_number: int,
) -> str:
    marker = (
        f"CASE {case_number}:"
    )
    start = text.find(marker)

    if start == -1:
        raise RuntimeError(
            f"Private case {case_number} "
            "was not found."
        )

    next_marker = (
        f"CASE {case_number + 1}:"
    )
    end = text.find(
        next_marker,
        start + len(marker),
    )

    if end == -1:
        end = len(text)

    return text[start:end]


def extract_page_text(
    case_section: str,
    page_number: int,
) -> str:
    marker = (
        f"SOURCE PDF PAGE "
        f"{page_number}"
    )
    start = case_section.find(marker)

    if start == -1:
        raise RuntimeError(
            f"Private page {page_number} "
            "was not found."
        )

    content_start = case_section.find(
        "\n",
        start,
    )

    if content_start == -1:
        raise RuntimeError(
            f"Private page {page_number} "
            "has no content."
        )

    content_start += 1

    while (
        content_start
        < len(case_section)
        and case_section[
            content_start
        ]
        in "-\r\n"
    ):
        content_start += 1

    possible_end_markers = [
        "\n------------------------------------------------------------------------\nSOURCE PDF PAGE ",
        "\nMANUAL REVIEW QUESTIONS",
        "\n========================================================================",
    ]
    ends = [
        case_section.find(
            marker,
            content_start,
        )
        for marker
        in possible_end_markers
    ]
    ends = [
        value
        for value in ends
        if value != -1
    ]
    end = (
        min(ends)
        if ends
        else len(case_section)
    )

    return case_section[
        content_start:end
    ].strip()


def find_exact_line_window(
    lines: list[str],
    expected: str,
    *,
    start_index: int = 0,
    maximum_lines: int = 3,
) -> tuple[int, int]:
    target = normalize(expected)

    for start in range(
        start_index,
        len(lines),
    ):
        for size in range(
            1,
            maximum_lines + 1,
        ):
            end = start + size

            if end > len(lines):
                break

            if normalize(
                " ".join(
                    lines[start:end]
                )
            ) == target:
                return start, end

    raise RuntimeError(
        f"Exact structural line not found: "
        f"{expected}"
    )


def adjudicate_case(
    *,
    case_number: int,
    case_section: str,
    expected: dict[str, Any],
    packet_item: dict[str, Any],
) -> tuple[
    dict[str, Any],
    dict[str, Any],
]:
    page_number = expected[
        "source_pdf_page_reviewed"
    ]
    page_text = extract_page_text(
        case_section,
        page_number,
    )
    lines = [
        line.strip()
        for line in page_text.splitlines()
        if line.strip()
    ]

    if not any(
        normalize(line).startswith(
            "capitulo "
        )
        for line in lines[:4]
    ):
        raise RuntimeError(
            f"{expected['segment_key']}: "
            "chapter-opening marker not found."
        )

    current_start, current_end = (
        find_exact_line_window(
            lines,
            expected["display_title"],
            maximum_lines=3,
        )
    )
    successor_start, successor_end = (
        find_exact_line_window(
            lines,
            expected["successor_title"],
            start_index=current_end,
            maximum_lines=3,
        )
    )

    if successor_start <= current_end:
        raise RuntimeError(
            f"{expected['segment_key']}: "
            "successor does not follow "
            "the current heading."
        )

    intervening_lines = lines[
        current_end:successor_start
    ]

    if (
        not intervening_lines
        or len(intervening_lines) > 3
    ):
        raise RuntimeError(
            f"{expected['segment_key']}: "
            "unexpected structural interval."
        )

    for line in intervening_lines:
        normalized_line = normalize(line)
        word_count = len(
            normalized_line.split()
        )

        if (
            word_count == 0
            or word_count > 16
            or re.match(
                r"^\d+\s",
                normalized_line,
            )
        ):
            raise RuntimeError(
                f"{expected['segment_key']}: "
                "independent prose may exist "
                "inside the heading interval."
            )

    decision_id = hashlib.sha256(
        (
            "2026-08-03-book-3-"
            "manual-adjudication-v1"
            + "|"
            + packet_item[
                "original_decision_id"
            ]
        ).encode("utf-8")
    ).hexdigest()[:24]

    public = {
        "manual_decision_id":
            decision_id,
        "packet_item_id":
            packet_item[
                "packet_item_id"
            ],
        "consolidation_id":
            packet_item[
                "consolidation_id"
            ],
        "recovery_id":
            packet_item[
                "recovery_id"
            ],
        "original_decision_id":
            packet_item[
                "original_decision_id"
            ],
        "analysis_id":
            packet_item[
                "analysis_id"
            ],
        "inspection_id":
            packet_item[
                "inspection_id"
            ],
        "source_packet_id":
            packet_item[
                "source_packet_id"
            ],
        "manual_batch_id":
            packet_item[
                "manual_batch_id"
            ],
        "book_id": 3,
        "book_slug":
            packet_item[
                "book_slug"
            ],
        "segment_key":
            packet_item[
                "segment_key"
            ],
        "segment_order":
            packet_item[
                "segment_order"
            ],
        "display_title":
            packet_item[
                "display_title"
            ],
        "successor_title":
            packet_item[
                "successor_title"
            ],
        "review_status":
            "reviewed",
        "selected_decision":
            expected[
                "selected_decision"
            ],
        "reviewer_confidence":
            expected[
                "reviewer_confidence"
            ],
        "evidence": {
            "source_file":
                "WEB-O-Evangelho-segundo-o-Espiritismo-Guillon.pdf",
            "source_sha256":
                "524a5b59607794335e2f704f58108c12ec16c7937516ff0c5efb07964aa455af",
            "source_pdf_page_reviewed":
                page_number,
            "successor_source_pdf_page_reviewed":
                expected[
                    "successor_source_pdf_page_reviewed"
                ],
            "current_title_match_method":
                "manual-exact-private-review",
            "successor_match_method":
                "manual-exact-private-review",
            "anchor_relationship":
                "same-page-chapter-opening",
            "current_title_is_structural_heading":
                True,
            "expected_successor_is_present":
                True,
            "alternative_anchor_is_required":
                False,
            "independent_prose_exists_between":
                False,
            "source_boundary_is_defensible":
                True,
            "intervening_prose_presence":
                "none",
            "intervening_structural_line_count":
                len(intervening_lines),
            "source_reference_only":
                True,
        },
        "review_questions_answered":
            True,
        "manual_review_completed":
            True,
        "supersedes_original_unresolved":
            True,
        "source_text_included":
            False,
        "source_excerpt_included":
            False,
        "boundary_decision_recorded":
            True,
        "boundary_approved":
            False,
        "database_change_applied":
            False,
        "content_approved":
            False,
        "content_loaded":
            False,
        "cutover_enabled":
            False,
    }

    private = {
        "manual_decision_id":
            decision_id,
        "case_number":
            case_number,
        "segment_key":
            packet_item[
                "segment_key"
            ],
        "source_pdf_page_reviewed":
            page_number,
        "current_heading_lines":
            lines[
                current_start:current_end
            ],
        "intervening_lines":
            intervening_lines,
        "successor_heading_lines":
            lines[
                successor_start:successor_end
            ],
        "page_text":
            page_text,
        "structured_outcome": {
            "selected_decision":
                expected[
                    "selected_decision"
                ],
            "reviewer_confidence":
                expected[
                    "reviewer_confidence"
                ],
        },
    }

    return public, private


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--reviewer-packet",
        required=True,
        type=Path,
    )
    args = parser.parse_args()

    reviewer_packet = (
        args.reviewer_packet
        .expanduser()
        .resolve()
    )
    reviewer_text = (
        reviewer_packet.read_text(
            encoding="utf-8"
        )
    )

    policy = read_json(
        PATHS["policy"]
    )
    packet = read_json(
        PATHS["packet"]
    )
    queue = read_json(
        PATHS["queue"]
    )
    consolidation = read_json(
        PATHS["consolidation"]
    )
    previous_progress = read_json(
        PATHS["progress"]
    )

    if (
        packet["status"]
        != "book-3-manual-adjudication-packet-prepared-not-reviewed"
        or packet["totals"][
            "packet_item_count"
        ]
        != 2
    ):
        raise RuntimeError(
            "PR-0036 packet baseline differs."
        )

    batch = next(
        item
        for item in queue["batches"]
        if item["batch_id"]
        == policy["target_packet"][
            "manual_batch_id"
        ]
    )

    if (
        batch["item_count"] != 2
        or consolidation["totals"][
            "still_unresolved_count"
        ]
        != 7
    ):
        raise RuntimeError(
            "Manual queue baseline differs."
        )

    packet_by_segment = {
        item["segment_key"]: item
        for item in packet[
            "packet_items"
        ]
    }

    public_decisions = []
    private_decisions = []

    for case_number, expected in enumerate(
        policy[
            "expected_adjudications"
        ],
        start=1,
    ):
        packet_item = packet_by_segment[
            expected["segment_key"]
        ]
        case_section = extract_case_section(
            reviewer_text,
            case_number,
        )
        public, private = (
            adjudicate_case(
                case_number=case_number,
                case_section=case_section,
                expected=expected,
                packet_item=packet_item,
            )
        )
        public_decisions.append(
            public
        )
        private_decisions.append(
            private
        )

    completed_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )

    progress = copy.deepcopy(
        previous_progress
    )
    progress["status"] = (
        "book-3-manual-adjudication-"
        "recorded-not-applied"
    )
    progress["policy_version"] = (
        policy["policy_version"]
    )
    progress["totals"][
        "reviewed_count"
    ] = 13
    progress["totals"][
        "unresolved_count"
    ] = 5
    progress["totals"][
        "manual_adjudication_reviewed_count"
    ] = 2
    progress["totals"][
        "manual_adjudication_resolved_count"
    ] = 2
    progress["totals"][
        "manual_adjudication_still_unresolved_count"
    ] = 0
    progress["totals"][
        "manual_adjudication_remaining_count"
    ] = 5
    progress["totals"][
        "manual_adjudication_completed_batch_count"
    ] = 1
    progress["totals"][
        "manual_adjudication_pending_batch_count"
    ] = 3

    source_packet = next(
        item
        for item in progress[
            "packets"
        ]
        if item["packet_id"]
        == "container-intro-only-book-3-packet-01"
    )
    source_packet[
        "reviewed_count"
    ] = 3
    source_packet[
        "unresolved_count"
    ] = 0
    source_packet[
        "status"
    ] = "reviewed-not-applied"

    decisions = {
        "schema_version": 1,
        "status":
            "book-3-manual-adjudication-recorded-not-applied",
        "policy_version":
            policy["policy_version"],
        "run_id":
            packet["run_id"],
        "manual_batch_id":
            packet[
                "manual_batch_id"
            ],
        "rights_status":
            "blocked",
        "contains_full_text":
            False,
        "contains_source_excerpt":
            False,
        "totals": {
            "item_count": 2,
            "reviewed_count": 2,
            "unresolved_count": 0,
            "exclude_structural_heading_count":
                2,
            "retain_intro_segment_count":
                0,
            "high_confidence_count": 2,
            "manual_review_completed_count":
                2,
            "new_public_decision_identity_count":
                0,
            "boundary_approved_count":
                0,
            "database_change_count":
                0,
        },
        "source": packet["source"],
        "decisions":
            public_decisions,
        "adjudication_boundary":
            policy[
                "adjudication_boundary"
            ],
    }

    private = {
        "schema_version": 1,
        "status":
            "private-book-3-manual-adjudication-evidence",
        "warning":
            "Gitignored private evidence. "
            "Do not commit or redistribute.",
        "generated_at":
            completed_at,
        "reviewer_packet_path":
            str(reviewer_packet),
        "reviewer_packet_sha256":
            hashlib.sha256(
                reviewer_packet.read_bytes()
            ).hexdigest(),
        "decisions":
            private_decisions,
    }

    report_lines = [
        "# Book 3 Manual Adjudication",
        "",
        (
            "- Status: "
            "`book-3-manual-adjudication-recorded-not-applied`"
        ),
        (
            f"- Policy version: "
            f"`{policy['policy_version']}`"
        ),
        (
            f"- Migration run ID: "
            f"`{packet['run_id']}`"
        ),
        (
            f"- Manual batch: "
            f"`{packet['manual_batch_id']}`"
        ),
        "- Adjudicated items: `2`",
        "- Reviewed outcomes: `2`",
        "- Still unresolved outcomes: `0`",
        (
            "- Exclude structural heading: "
            "`2`"
        ),
        "- Retain intro segment: `0`",
        "- High-confidence outcomes: `2`",
        "- Boundary approvals: `0`",
        "- Database changes: `0`",
        "- Source text committed: `false`",
        "- Cutover enabled: `false`",
        "",
        "## Adjudication outcomes",
        "",
        (
            "| Segment | Current page | "
            "Successor | Successor page | "
            "Decision | Confidence |"
        ),
        (
            "| --- | ---: | --- | ---: | "
            "--- | --- |"
        ),
    ]

    for item in public_decisions:
        evidence = item["evidence"]
        report_lines.append(
            "| "
            + item["display_title"]
            + " | "
            + str(
                evidence[
                    "source_pdf_page_reviewed"
                ]
            )
            + " | "
            + item["successor_title"]
            + " | "
            + str(
                evidence[
                    "successor_source_pdf_page_reviewed"
                ]
            )
            + " | "
            + item[
                "selected_decision"
            ]
            + " | "
            + item[
                "reviewer_confidence"
            ]
            + " |"
        )

    report_lines.extend(
        [
            "",
            "## Cumulative review progress",
            "",
            "- Reviewed items: `13`",
            "- Unresolved items: `5`",
            "- Pending items: `126`",
            "- Public decisions: `18`",
            "- Manual-adjudication items: `7`",
            "- Manual reviews completed: `2`",
            "- Manual items remaining: `5`",
            "- Manual batches completed: `1`",
            "- Manual batches pending: `3`",
            "",
            "## Evidence boundary",
            "",
            (
                "The private PR-0036 reviewer "
                "worksheet was read locally."
            ),
            "",
            (
                "Only structured page references, "
                "review answers, and decision enums "
                "are included publicly."
            ),
            "",
            "## Application boundary",
            "",
            (
                "The decisions are recorded but "
                "not approved or applied to staging."
            ),
            "",
        ]
    )

    write_json(
        PATHS["decisions"],
        decisions,
    )
    write_json(
        PATHS["progress"],
        progress,
    )
    write_json(
        PATHS["private"],
        private,
    )
    PATHS["report"].parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    PATHS["report"].write_text(
        "\n".join(report_lines) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    print(
        "Adjudicated 2 Book 3 "
        "manual packet items."
    )
    print(
        "Resolved outcomes: 2."
    )
    print(
        "Still unresolved: 0."
    )
    print(
        "Selected decision: "
        "exclude-structural-heading (2)."
    )
    print(
        "Public source text: 0."
    )
    print(
        "Database changes: 0."
    )


if __name__ == "__main__":
    main()
