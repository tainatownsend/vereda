#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pypdf import PdfReader

ROOT = Path.cwd()

POLICY_PATH = ROOT / (
    "content/migration/"
    "reading-segment-source-review-pilot-policy.json"
)
WORKLIST_PATH = ROOT / (
    "content/migration/"
    "reading-segment-source-review-worklist.json"
)
REGISTER_PATH = ROOT / (
    "content/migration/"
    "reading-segment-source-review-packet-register.json"
)
APPLICATION_EVIDENCE_PATH = ROOT / (
    "content/migration/"
    "reading-segment-mechanical-application-evidence.json"
)
DECISIONS_PATH = ROOT / (
    "content/migration/"
    "reading-segment-source-review-pilot-decisions.json"
)
PROGRESS_PATH = ROOT / (
    "content/migration/"
    "reading-segment-source-review-progress.json"
)
REPORT_PATH = ROOT / (
    "content/migration/reports/"
    "reading-segment-source-review-pilot-summary.md"
)
PRIVATE_ROOT = ROOT / (
    ".vereda-private/source-review/pr-0028-pilot"
)
PRIVATE_EVIDENCE_PATH = PRIVATE_ROOT / (
    "source-review-evidence.local.json"
)


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
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


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as handle:
        for chunk in iter(
            lambda: handle.read(1024 * 1024),
            b"",
        ):
            digest.update(chunk)

    return digest.hexdigest()


def normalize(value: str) -> str:
    decomposed = unicodedata.normalize(
        "NFKD",
        value,
    )
    without_marks = "".join(
        character
        for character in decomposed
        if not unicodedata.combining(
            character,
        )
    )
    return re.sub(
        r"[^a-z0-9]+",
        " ",
        without_marks.lower(),
    ).strip()


def nonempty_lines(text: str) -> list[str]:
    return [
        line.strip()
        for line in text.replace(
            "\r",
            "\n",
        ).split("\n")
        if line.strip()
    ]


def toc_signal_count(text: str) -> int:
    lines = nonempty_lines(text)
    dotted = len(
        re.findall(
            r"\.{3,}",
            text,
        )
    )
    numbered_entries = sum(
        1
        for line in lines
        if re.search(
            r"\bcap[ií]tulo\b",
            line,
            flags=re.IGNORECASE,
        )
        and re.search(
            r"\d+\s*$",
            line,
        )
    )
    explicit_summary = sum(
        1
        for line in lines
        if normalize(line) == "sumario"
    )
    return (
        dotted
        + numbered_entries
        + explicit_summary * 20
    )


def prose_signal_count(text: str) -> int:
    signals = 0

    for line in nonempty_lines(text):
        words = re.findall(
            r"\b[\wÀ-ÿ'-]+\b",
            line,
        )

        if (
            len(words) >= 12
            and re.search(
                r"[.!?;:]\s*$",
                line,
            )
        ):
            signals += 1

    return signals


def title_tokens(title: str) -> list[str]:
    ignored = {
        "parte",
    }
    return [
        token
        for token in normalize(title).split()
        if token not in ignored
    ]


def page_contains_title(
    page_text: str,
    title: str,
) -> bool:
    normalized_page = normalize(page_text)
    return all(
        re.search(
            rf"\b{re.escape(token)}\b",
            normalized_page,
        )
        is not None
        for token in title_tokens(title)
    )


def candidate_record(
    *,
    page_number: int,
    page_text: str,
    title: str,
    expected_successor_printed_page: int | None,
) -> dict[str, Any]:
    toc_signals = toc_signal_count(
        page_text,
    )
    prose_signals = prose_signal_count(
        page_text,
    )
    distance = (
        abs(
            page_number
            - expected_successor_printed_page
        )
        if expected_successor_printed_page
        is not None
        else 10**9
    )

    return {
        "source_pdf_page": page_number,
        "title": title,
        "toc_signal_count": toc_signals,
        "prose_signal_count": prose_signals,
        "structural_line_count": len(
            nonempty_lines(page_text),
        ),
        "distance_from_successor_printed_page":
            distance,
        "page_text": page_text,
    }


def select_candidate(
    candidates: list[dict[str, Any]],
) -> dict[str, Any]:
    if not candidates:
        raise RuntimeError(
            "No source page matched the expected title."
        )

    ordered = sorted(
        candidates,
        key=lambda candidate: (
            candidate[
                "toc_signal_count"
            ],
            candidate[
                "prose_signal_count"
            ],
            candidate[
                "distance_from_successor_printed_page"
            ],
            -candidate[
                "source_pdf_page"
            ],
        ),
    )
    selected = ordered[0]

    if (
        selected["toc_signal_count"]
        != 0
    ):
        raise RuntimeError(
            "Selected candidate still contains "
            "table-of-contents signals."
        )

    if (
        selected["prose_signal_count"]
        != 0
    ):
        raise RuntimeError(
            "Selected candidate contains prose "
            "signals and cannot be classified "
            "mechanically."
        )

    return selected


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--pdf",
        required=True,
        type=Path,
    )
    arguments = parser.parse_args()

    pdf_path = arguments.pdf.expanduser().resolve()

    if not pdf_path.is_file():
        raise FileNotFoundError(
            f"Source PDF not found: {pdf_path}"
        )

    policy = read_json(POLICY_PATH)
    worklist = read_json(WORKLIST_PATH)
    register = read_json(REGISTER_PATH)
    application_evidence = read_json(
        APPLICATION_EVIDENCE_PATH
    )

    actual_sha = sha256_file(pdf_path)
    expected_sha = policy["source"][
        "source_sha256"
    ]

    if actual_sha != expected_sha:
        raise RuntimeError(
            "Source PDF SHA-256 differs from "
            "the registered canonical edition."
        )

    reader = PdfReader(str(pdf_path))

    if len(reader.pages) != policy[
        "source"
    ]["expected_pdf_page_count"]:
        raise RuntimeError(
            "Source PDF page count differs from "
            "the registered canonical edition."
        )

    packet_id = policy["packet"][
        "packet_id"
    ]
    packet = next(
        (
            candidate
            for candidate in register[
                "packets"
            ]
            if candidate[
                "packet_id"
            ]
            == packet_id
        ),
        None,
    )

    if packet is None:
        raise RuntimeError(
            "Pilot packet is missing."
        )

    items = [
        item
        for item in worklist["items"]
        if item["packet_id"]
        == packet_id
    ]

    if len(items) != 2:
        raise RuntimeError(
            "Pilot packet must contain two items."
        )

    extracted_pages: list[
        dict[str, Any]
    ] = []

    for index, page in enumerate(
        reader.pages
    ):
        extracted_pages.append(
            {
                "source_pdf_page": index + 1,
                "page_text":
                    page.extract_text()
                    or "",
            }
        )

    decisions = []
    private_items = []
    selected_pages = set()
    completed_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )

    for item in items:
        title = item["display_title"]
        expected_successor_page = item[
            "source_reference"
        ][
            "successor_printed_page"
        ]

        candidates = [
            candidate_record(
                page_number=page[
                    "source_pdf_page"
                ],
                page_text=page[
                    "page_text"
                ],
                title=title,
                expected_successor_printed_page=(
                    expected_successor_page
                ),
            )
            for page in extracted_pages
            if page_contains_title(
                page["page_text"],
                title,
            )
        ]

        selected = select_candidate(
            candidates
        )

        if (
            selected[
                "source_pdf_page"
            ]
            in selected_pages
        ):
            raise RuntimeError(
                "Pilot decisions selected the "
                "same source page."
            )

        selected_pages.add(
            selected[
                "source_pdf_page"
            ]
        )

        if (
            "exclude-structural-heading"
            not in item[
                "decision_options"
            ]
        ):
            raise RuntimeError(
                f"{item['segment_key']}: "
                "required decision option is "
                "not allowed."
            )

        decisions.append(
            {
                "decision_id":
                    item["decision_id"],
                "inspection_id":
                    item["inspection_id"],
                "packet_id":
                    packet_id,
                "run_id":
                    item["run_id"],
                "policy_version":
                    policy["policy_version"],
                "book_id":
                    item["book_id"],
                "book_slug":
                    item["book_slug"],
                "segment_key":
                    item["segment_key"],
                "segment_order":
                    item["segment_order"],
                "display_title":
                    title,
                "inspection_lane":
                    item[
                        "inspection_lane"
                    ],
                "review_status":
                    "reviewed",
                "selected_decision":
                    "exclude-structural-heading",
                "evidence": {
                    "source_file":
                        policy["source"][
                            "source_file"
                        ],
                    "source_sha256":
                        actual_sha,
                    "source_pdf_page_reviewed":
                        selected[
                            "source_pdf_page"
                        ],
                    "printed_page_reviewed":
                        None,
                    "visible_prose_presence":
                        "heading-only",
                    "successor_anchor_type":
                        "heading",
                    "locator_type":
                        "structural-heading",
                    "locator_value":
                        title,
                    "source_reference_only":
                        True,
                    "candidate_page_count":
                        len(candidates),
                    "toc_signal_count":
                        selected[
                            "toc_signal_count"
                        ],
                    "prose_signal_count":
                        selected[
                            "prose_signal_count"
                        ],
                    "structural_line_count":
                        selected[
                            "structural_line_count"
                        ],
                },
                "reviewer_confidence":
                    "high",
                "review_completed_at":
                    completed_at,
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
        )

        private_items.append(
            {
                "decision_id":
                    item["decision_id"],
                "segment_key":
                    item["segment_key"],
                "display_title":
                    title,
                "selected_source_pdf_page":
                    selected[
                        "source_pdf_page"
                    ],
                "selected_page_text":
                    selected[
                        "page_text"
                    ],
                "candidates":
                    candidates,
            }
        )

    decisions.sort(
        key=lambda decision: (
            decision["segment_order"],
            decision["segment_key"],
        )
    )

    public_decisions = {
        "schema_version": 1,
        "status":
            "pilot-source-review-recorded-not-applied",
        "policy_version":
            policy["policy_version"],
        "run_id":
            worklist["run_id"],
        "packet_id":
            packet_id,
        "book_id": 4,
        "book_slug":
            "o-ceu-e-o-inferno",
        "rights_status":
            "permission-required-for-production",
        "contains_full_text": False,
        "contains_source_excerpt": False,
        "totals": {
            "packet_item_count": 2,
            "reviewed_count": 2,
            "unresolved_count": 0,
            "excluded_structural_heading_count":
                2,
            "boundary_approved_count": 0,
            "database_change_count": 0,
        },
        "source": {
            "source_file":
                policy["source"][
                    "source_file"
                ],
            "source_sha256":
                actual_sha,
            "pdf_page_count":
                len(reader.pages),
            "private_evidence_path":
                ".vereda-private/source-review/"
                "pr-0028-pilot/"
                "source-review-evidence.local.json",
        },
        "decisions": decisions,
        "review_boundary":
            policy["review_boundary"],
    }

    progress_packets = []

    for source_packet in register[
        "packets"
    ]:
        reviewed = (
            2
            if source_packet[
                "packet_id"
            ]
            == packet_id
            else 0
        )
        pending = (
            source_packet[
                "item_count"
            ]
            - reviewed
        )

        progress_packets.append(
            {
                "packet_id":
                    source_packet[
                        "packet_id"
                    ],
                "book_id":
                    source_packet[
                        "book_id"
                    ],
                "inspection_lane":
                    source_packet[
                        "inspection_lane"
                    ],
                "item_count":
                    source_packet[
                        "item_count"
                    ],
                "pending_count":
                    pending,
                "in_review_count":
                    0,
                "reviewed_count":
                    reviewed,
                "unresolved_count":
                    0,
                "status":
                    (
                        "reviewed-not-applied"
                        if reviewed
                        == source_packet[
                            "item_count"
                        ]
                        else "pending"
                    ),
            }
        )

    progress = {
        "schema_version": 1,
        "status":
            "pilot-packet-reviewed-not-applied",
        "policy_version":
            policy["policy_version"],
        "run_id":
            worklist["run_id"],
        "totals": {
            "item_count": 144,
            "packet_count": 16,
            "pending_count": 142,
            "in_review_count": 0,
            "reviewed_count": 2,
            "unresolved_count": 0,
            "public_decision_count": 2,
            "completed_packet_count": 1,
            "pending_packet_count": 15,
            "completed_mechanical_count":
                application_evidence[
                    "totals"
                ][
                    "target_content_review_count"
                ],
            "remaining_boundary_review_count":
                application_evidence[
                    "totals"
                ][
                    "unaffected_boundary_review_count"
                ],
            "database_change_count": 0,
        },
        "packets":
            progress_packets,
        "application_boundary": {
            "structured_decisions_recorded":
                True,
            "boundary_approved":
                False,
            "database_change_applied":
                False,
            "content_approved":
                False,
            "content_loaded":
                False,
            "successor_mapping_created":
                False,
            "dependency_snapshot_captured":
                False,
            "production_modified":
                False,
            "progress_migrated":
                False,
            "reading_sessions_rewritten":
                False,
            "cutover_enabled":
                False,
        },
    }

    private_evidence = {
        "schema_version": 1,
        "status":
            "private-source-review-evidence",
        "warning":
            "Gitignored private evidence. "
            "Do not commit or redistribute.",
        "source_file":
            str(pdf_path),
        "source_sha256":
            actual_sha,
        "review_completed_at":
            completed_at,
        "items":
            private_items,
    }

    report_lines = [
        "# Pilot Source Review",
        "",
        (
            "- Status: "
            "`pilot-source-review-recorded-not-applied`"
        ),
        (
            f"- Policy version: "
            f"`{policy['policy_version']}`"
        ),
        (
            f"- Migration run ID: "
            f"`{worklist['run_id']}`"
        ),
        f"- Packet: `{packet_id}`",
        "- Work: `O Céu e o Inferno`",
        "- Packet items: `2`",
        "- Reviewed decisions: `2`",
        "- Pending source-review items after pilot: `142`",
        "- Completed review packets: `1`",
        "- Pending review packets: `15`",
        "- Boundary approvals: `0`",
        "- Database changes: `0`",
        "- Source text committed: `false`",
        "- Cutover enabled: `false`",
        "",
        "## Decisions",
        "",
        "| Segment | Source PDF page | Visible content | Decision | Confidence |",
        "| --- | ---: | --- | --- | --- |",
    ]

    for decision in decisions:
        report_lines.append(
            "| "
            + decision[
                "display_title"
            ]
            + " | "
            + str(
                decision["evidence"][
                    "source_pdf_page_reviewed"
                ]
            )
            + " | "
            + decision["evidence"][
                "visible_prose_presence"
            ]
            + " | "
            + decision[
                "selected_decision"
            ]
            + " | "
            + decision[
                "reviewer_confidence"
            ]
            + " |"
        )

    report_lines.extend(
        [
            "",
            "## Evidence boundary",
            "",
            (
                "The verified local PDF was inspected. "
                "Only page numbers, structural signals, "
                "decision enums, and source checksums "
                "were written to public artifacts."
            ),
            "",
            (
                "Extracted page text remains only in the "
                "Git-ignored private workspace."
            ),
            "",
            "## Application boundary",
            "",
            (
                "The two decisions are recorded but not "
                "approved or applied to private staging."
            ),
            "",
            (
                "The 166 completed mechanical rows and "
                "646 remaining boundary-review rows are "
                "unchanged."
            ),
            "",
        ]
    )

    write_json(
        DECISIONS_PATH,
        public_decisions,
    )
    write_json(
        PROGRESS_PATH,
        progress,
    )
    write_json(
        PRIVATE_EVIDENCE_PATH,
        private_evidence,
    )
    REPORT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    REPORT_PATH.write_text(
        "\n".join(report_lines) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    print(
        "Reviewed 2 pilot packet items."
    )
    print(
        "Recorded 2 exclude-structural-heading "
        "decisions."
    )
    print(
        "Pending source-review items: 142."
    )
    print(
        "Source text committed: 0."
    )
    print(
        "Database changes: 0."
    )


if __name__ == "__main__":
    main()
