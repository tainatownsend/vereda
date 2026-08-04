#!/usr/bin/env python3

from __future__ import annotations

import argparse
import copy
import hashlib
import json
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from recover_non_contents_occurrence import (
    extract_pages,
    find_title_matches,
    normalize,
    read_json,
    resolve_pdf,
    write_json,
)

ROOT = Path.cwd()

PATHS = {
    "policy": ROOT
    / "content/migration/reading-segment-book-3-manual-adjudication-packet-policy.json",
    "sources": ROOT
    / "content/sources/manifest.json",
    "queue": ROOT
    / "content/migration/reading-segment-manual-adjudication-queue.json",
    "consolidation": ROOT
    / "content/migration/reading-segment-unresolved-recovery-consolidation.json",
    "book_3_recovery": ROOT
    / "content/migration/reading-segment-book-3-successor-anchor-recovery-decisions.json",
    "progress": ROOT
    / "content/migration/reading-segment-source-review-progress.json",
    "packet": ROOT
    / "content/migration/reading-segment-book-3-manual-adjudication-packet.json",
    "report": ROOT
    / "content/migration/reports/reading-segment-book-3-manual-adjudication-packet-summary.md",
    "private": ROOT
    / ".vereda-private/source-review/pr-0036-book-3-manual-adjudication/private-reviewer-evidence.local.json",
}


def token_coverage(
    expected: str,
    actual: str,
) -> float:
    expected_tokens = set(
        normalize(expected).split()
    )
    actual_tokens = set(
        normalize(actual).split()
    )

    if not expected_tokens:
        return 0.0

    return (
        len(
            expected_tokens
            & actual_tokens
        )
        / len(expected_tokens)
    )


def fuzzy_successor_candidates(
    pages: list[dict[str, Any]],
    title: str,
    *,
    maximum_window_lines: int,
    minimum_token_coverage: float,
    minimum_sequence_ratio: float,
    candidate_limit: int,
) -> list[dict[str, Any]]:
    normalized_title = normalize(title)
    candidates: list[
        dict[str, Any]
    ] = []

    for page_index, page in enumerate(
        pages
    ):
        if page["contents"]["toc_like"]:
            continue

        lines = page["lines"]

        for start in range(len(lines)):
            for size in range(
                1,
                maximum_window_lines + 1,
            ):
                window = lines[
                    start : start + size
                ]

                if not window:
                    continue

                joined = " ".join(window)
                normalized_joined = normalize(
                    joined
                )
                word_total = len(
                    normalized_joined.split()
                )

                if (
                    not normalized_joined
                    or word_total > 32
                ):
                    continue

                coverage = token_coverage(
                    title,
                    joined,
                )
                ratio = SequenceMatcher(
                    None,
                    normalized_title,
                    normalized_joined,
                ).ratio()

                exact = (
                    normalized_joined
                    == normalized_title
                    or normalized_title
                    in normalized_joined
                )

                if not exact and (
                    coverage
                    < minimum_token_coverage
                    or ratio
                    < minimum_sequence_ratio
                ):
                    continue

                surplus = max(
                    0,
                    word_total
                    - len(
                        normalized_title.split()
                    ),
                )
                score = (
                    (2.0 if exact else 0.0)
                    + coverage
                    + ratio
                    - surplus * 0.025
                    - (size - 1) * 0.01
                )

                candidates.append(
                    {
                        "source_pdf_page":
                            page_index + 1,
                        "page_index":
                            page_index,
                        "start_line":
                            start,
                        "end_line":
                            start + size,
                        "window_line_count":
                            size,
                        "match_method":
                            (
                                "normalized-exact"
                                if exact
                                else (
                                    "manual-fuzzy-candidate"
                                )
                            ),
                        "score":
                            round(
                                score,
                                6,
                            ),
                        "token_coverage":
                            round(
                                coverage,
                                6,
                            ),
                        "sequence_ratio":
                            round(
                                ratio,
                                6,
                            ),
                        "toc_like":
                            False,
                        "matched_lines":
                            window,
                    }
                )

    unique: dict[
        tuple[int, int, int],
        dict[str, Any],
    ] = {}

    for item in candidates:
        key = (
            item["source_pdf_page"],
            item["start_line"],
            item["end_line"],
        )
        current = unique.get(key)

        if (
            current is None
            or item["score"]
            > current["score"]
        ):
            unique[key] = item

    ordered = sorted(
        unique.values(),
        key=lambda item: (
            0
            if item["match_method"]
            == "normalized-exact"
            else 1,
            -item["score"],
            -item["token_coverage"],
            -item["sequence_ratio"],
            item["source_pdf_page"],
            item["start_line"],
        ),
    )

    return ordered[:candidate_limit]


def current_candidates(
    pages: list[dict[str, Any]],
    title: str,
    *,
    original_page: int,
    page_radius: int,
    maximum_window_lines: int,
) -> list[dict[str, Any]]:
    candidates = []

    for page_number in range(
        max(
            1,
            original_page - page_radius,
        ),
        min(
            len(pages),
            original_page + page_radius,
        )
        + 1,
    ):
        page = pages[
            page_number - 1
        ]

        if page["contents"]["toc_like"]:
            continue

        for match in find_title_matches(
            page["lines"],
            title,
            max_lines=maximum_window_lines,
        ):
            candidates.append(
                {
                    "source_pdf_page":
                        page_number,
                    "page_index":
                        page_number - 1,
                    "page_distance_from_original":
                        abs(
                            page_number
                            - original_page
                        ),
                    "match_method":
                        match["method"],
                    "score":
                        match["score"],
                    "window_line_count":
                        match["line_count"],
                    "start_line":
                        match["start"],
                    "end_line":
                        match["end"],
                    "toc_like":
                        False,
                    "matched_lines":
                        match[
                            "matched_lines"
                        ],
                }
            )

    candidates.sort(
        key=lambda item: (
            item[
                "page_distance_from_original"
            ],
            0
            if item["match_method"]
            == "normalized-exact"
            else 1,
            -item["score"],
            item["source_pdf_page"],
        )
    )

    return candidates[:8]


def private_page_record(
    pages: list[dict[str, Any]],
    page_number: int,
) -> dict[str, Any]:
    page = pages[
        page_number - 1
    ]

    return {
        "source_pdf_page":
            page_number,
        "contents_signals":
            page["contents"],
        "page_text":
            page["page_text"],
    }


def public_candidate(
    item: dict[str, Any],
    *,
    include_distance: bool,
) -> dict[str, Any]:
    value = {
        "source_pdf_page":
            item["source_pdf_page"],
        "match_method":
            item["match_method"],
        "score":
            item["score"],
        "window_line_count":
            item[
                "window_line_count"
            ],
        "toc_like":
            item["toc_like"],
    }

    if include_distance:
        value[
            "page_distance_from_original"
        ] = item[
            "page_distance_from_original"
        ]
    else:
        value[
            "token_coverage"
        ] = item[
            "token_coverage"
        ]
        value[
            "sequence_ratio"
        ] = item[
            "sequence_ratio"
        ]

    return value


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--downloads",
        required=True,
        type=Path,
    )
    parser.add_argument(
        "--reviewer-output",
        required=True,
        type=Path,
    )
    args = parser.parse_args()

    downloads = (
        args.downloads
        .expanduser()
        .resolve()
    )
    reviewer_output = (
        args.reviewer_output
        .expanduser()
        .resolve()
    )

    policy = read_json(
        PATHS["policy"]
    )
    source_manifest = read_json(
        PATHS["sources"]
    )
    queue = read_json(
        PATHS["queue"]
    )
    consolidation = read_json(
        PATHS["consolidation"]
    )
    book_3_recovery = read_json(
        PATHS["book_3_recovery"]
    )
    previous_progress = read_json(
        PATHS["progress"]
    )

    batch = next(
        item
        for item in queue["batches"]
        if item["batch_id"]
        == policy["target_batch"][
            "batch_id"
        ]
    )
    unresolved = [
        item
        for item in consolidation[
            "unresolved_recoveries"
        ]
        if item["consolidation_id"]
        in set(
            policy[
                "target_batch"
            ]["consolidation_ids"]
        )
    ]
    recovery_by_id = {
        item["recovery_id"]: item
        for item in book_3_recovery[
            "recoveries"
        ]
    }
    expected_by_segment = {
        item["segment_key"]: item
        for item in policy[
            "expected_pairs"
        ]
    }

    if (
        batch["item_count"] != 2
        or len(unresolved) != 2
    ):
        raise RuntimeError(
            "Book 3 manual packet "
            "baseline differs."
        )

    work = next(
        item
        for item in source_manifest[
            "works"
        ]
        if item["book_id"] == 3
    )
    pdf_path = resolve_pdf(
        downloads,
        work,
    )
    pages = extract_pages(
        pdf_path,
        work["pdf_page_count"],
    )

    completed_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )

    packet_items = []
    private_items = []

    for item in sorted(
        unresolved,
        key=lambda value: (
            value["segment_order"],
            value["segment_key"],
        ),
    ):
        expected = expected_by_segment[
            item["segment_key"]
        ]
        recovery = recovery_by_id[
            item["recovery_id"]
        ]

        if (
            item["display_title"]
            != expected["display_title"]
            or item["successor_title"]
            != expected["successor_title"]
            or recovery[
                "recovery_status"
            ]
            != "still-unresolved"
            or recovery[
                "selected_decision"
            ]
            != "unresolved"
        ):
            raise RuntimeError(
                f"{item['segment_key']}: "
                "manual packet identity differs."
            )

        current = current_candidates(
            pages,
            item["display_title"],
            original_page=expected[
                "original_source_pdf_page"
            ],
            page_radius=policy[
                "packet_rules"
            ][
                "current_title_page_radius"
            ],
            maximum_window_lines=policy[
                "packet_rules"
            ][
                "current_title_maximum_window_lines"
            ],
        )
        successors = (
            fuzzy_successor_candidates(
                pages,
                item["successor_title"],
                maximum_window_lines=policy[
                    "packet_rules"
                ][
                    "successor_candidate_maximum_window_lines"
                ],
                minimum_token_coverage=policy[
                    "packet_rules"
                ][
                    "successor_fuzzy_minimum_token_coverage"
                ],
                minimum_sequence_ratio=policy[
                    "packet_rules"
                ][
                    "successor_fuzzy_minimum_sequence_ratio"
                ],
                candidate_limit=policy[
                    "packet_rules"
                ][
                    "successor_candidate_limit"
                ],
            )
        )

        packet_id = hashlib.sha256(
            (
                policy[
                    "policy_version"
                ]
                + "|"
                + item[
                    "original_decision_id"
                ]
            ).encode("utf-8")
        ).hexdigest()[:24]

        public_item = {
            "packet_item_id":
                packet_id,
            "consolidation_id":
                item[
                    "consolidation_id"
                ],
            "recovery_id":
                item["recovery_id"],
            "original_decision_id":
                item[
                    "original_decision_id"
                ],
            "analysis_id":
                item["analysis_id"],
            "inspection_id":
                item["inspection_id"],
            "source_packet_id":
                item["packet_id"],
            "manual_batch_id":
                batch["batch_id"],
            "book_id": 3,
            "book_slug":
                work["slug"],
            "segment_key":
                item["segment_key"],
            "segment_order":
                item["segment_order"],
            "display_title":
                item["display_title"],
            "successor_title":
                item["successor_title"],
            "original_source_pdf_page":
                expected[
                    "original_source_pdf_page"
                ],
            "current_title_candidate_count":
                len(current),
            "successor_candidate_count":
                len(successors),
            "exact_successor_candidate_count":
                sum(
                    candidate[
                        "match_method"
                    ]
                    == "normalized-exact"
                    for candidate
                    in successors
                ),
            "fuzzy_successor_candidate_count":
                sum(
                    candidate[
                        "match_method"
                    ]
                    == "manual-fuzzy-candidate"
                    for candidate
                    in successors
                ),
            "current_title_candidates": [
                public_candidate(
                    candidate,
                    include_distance=True,
                )
                for candidate in current
            ],
            "successor_candidates": [
                public_candidate(
                    candidate,
                    include_distance=False,
                )
                for candidate
                in successors
            ],
            "review_questions":
                policy[
                    "review_questions"
                ],
            "packet_status":
                "packet-prepared-not-reviewed",
            "selected_decision":
                "unresolved",
            "manual_review_required":
                True,
            "automated_recovery_exhausted":
                True,
            "source_text_included":
                False,
            "source_excerpt_included":
                False,
            "manual_review_completed":
                False,
            "boundary_approved":
                False,
            "database_change_applied":
                False,
            "cutover_enabled":
                False,
        }
        packet_items.append(
            public_item
        )

        page_numbers = sorted(
            {
                candidate[
                    "source_pdf_page"
                ]
                for candidate in [
                    *current,
                    *successors,
                ]
            }
        )

        private_items.append(
            {
                "packet_item_id":
                    packet_id,
                "display_title":
                    item[
                        "display_title"
                    ],
                "successor_title":
                    item[
                        "successor_title"
                    ],
                "original_source_pdf_page":
                    expected[
                        "original_source_pdf_page"
                    ],
                "current_title_candidates":
                    current,
                "successor_candidates":
                    successors,
                "candidate_pages": [
                    private_page_record(
                        pages,
                        page_number,
                    )
                    for page_number
                    in page_numbers
                ],
            }
        )

    progress = copy.deepcopy(
        previous_progress
    )
    progress["status"] = (
        "book-3-manual-adjudication-"
        "packet-prepared-not-reviewed"
    )
    progress["policy_version"] = (
        policy["policy_version"]
    )
    progress["totals"][
        "manual_adjudication_packet_prepared_count"
    ] = 1
    progress["totals"][
        "manual_adjudication_item_prepared_count"
    ] = 2
    progress["totals"][
        "manual_adjudication_reviewed_count"
    ] = 0

    packet = {
        "schema_version": 1,
        "status":
            "book-3-manual-adjudication-packet-prepared-not-reviewed",
        "policy_version":
            policy["policy_version"],
        "run_id":
            consolidation["run_id"],
        "manual_batch_id":
            batch["batch_id"],
        "manual_adjudication_lane":
            batch[
                "manual_adjudication_lane"
            ],
        "rights_status":
            "blocked",
        "contains_full_text":
            False,
        "contains_source_excerpt":
            False,
        "totals": {
            "packet_item_count":
                len(packet_items),
            "current_title_candidate_count":
                sum(
                    item[
                        "current_title_candidate_count"
                    ]
                    for item
                    in packet_items
                ),
            "successor_candidate_count":
                sum(
                    item[
                        "successor_candidate_count"
                    ]
                    for item
                    in packet_items
                ),
            "exact_successor_candidate_count":
                sum(
                    item[
                        "exact_successor_candidate_count"
                    ]
                    for item
                    in packet_items
                ),
            "fuzzy_successor_candidate_count":
                sum(
                    item[
                        "fuzzy_successor_candidate_count"
                    ]
                    for item
                    in packet_items
                ),
            "manual_review_completed_count":
                0,
            "new_review_decision_count":
                0,
            "boundary_approved_count":
                0,
            "database_change_count":
                0,
        },
        "source": {
            "book_id": 3,
            "book_slug":
                work["slug"],
            "source_file":
                work["source_file"],
            "source_sha256":
                work["source_sha256"],
            "pdf_page_count":
                len(pages),
        },
        "packet_items":
            packet_items,
        "packet_boundary":
            policy[
                "packet_boundary"
            ],
    }

    private = {
        "schema_version": 1,
        "status":
            "private-book-3-manual-adjudication-packet",
        "warning":
            "Gitignored private evidence. "
            "Do not commit or redistribute.",
        "generated_at":
            completed_at,
        "source": {
            "path": str(pdf_path),
            "sha256":
                work["source_sha256"],
            "pdf_page_count":
                len(pages),
        },
        "items":
            private_items,
    }

    report_lines = [
        "# Book 3 Manual Adjudication Packet",
        "",
        (
            "- Status: "
            "`book-3-manual-adjudication-packet-prepared-not-reviewed`"
        ),
        (
            f"- Policy version: "
            f"`{policy['policy_version']}`"
        ),
        (
            f"- Migration run ID: "
            f"`{consolidation['run_id']}`"
        ),
        (
            f"- Manual batch: "
            f"`{batch['batch_id']}`"
        ),
        "- Packet items: `2`",
        (
            "- Current-title candidates: "
            f"`{packet['totals']['current_title_candidate_count']}`"
        ),
        (
            "- Successor candidates: "
            f"`{packet['totals']['successor_candidate_count']}`"
        ),
        (
            "- Exact successor candidates: "
            f"`{packet['totals']['exact_successor_candidate_count']}`"
        ),
        (
            "- Fuzzy successor candidates: "
            f"`{packet['totals']['fuzzy_successor_candidate_count']}`"
        ),
        "- Manual reviews completed: `0`",
        "- New review decisions: `0`",
        "- Boundary approvals: `0`",
        "- Database changes: `0`",
        "- Source text committed: `false`",
        "- Cutover enabled: `false`",
        "",
        "## Packet items",
        "",
        (
            "| Segment | Current candidates | "
            "Successor candidates | "
            "Exact successor candidates | Status |"
        ),
        (
            "| --- | ---: | ---: | ---: | --- |"
        ),
    ]

    for item in packet_items:
        report_lines.append(
            "| "
            + item["display_title"]
            + " | "
            + str(
                item[
                    "current_title_candidate_count"
                ]
            )
            + " | "
            + str(
                item[
                    "successor_candidate_count"
                ]
            )
            + " | "
            + str(
                item[
                    "exact_successor_candidate_count"
                ]
            )
            + " | "
            + item[
                "packet_status"
            ]
            + " |"
        )

    report_lines.extend(
        [
            "",
            "## Cumulative review progress",
            "",
            "- Reviewed items: `11`",
            "- Unresolved items: `7`",
            "- Pending items: `126`",
            "- Public decisions: `18`",
            "- Manual-adjudication items: `7`",
            "- Manual-adjudication batches: `4`",
            "- Prepared manual packets: `1`",
            "- Prepared manual items: `2`",
            "- Completed manual reviews: `0`",
            "",
            "## Private reviewer material",
            "",
            (
                "The private reviewer worksheet "
                "was generated outside the "
                "repository in the user's "
                "Downloads directory."
            ),
            "",
            (
                "Extracted page text and matched "
                "lines also remain in the "
                "Git-ignored private workspace."
            ),
            "",
            "## Application boundary",
            "",
            (
                "No review decision, boundary "
                "approval, staging change, or "
                "production change was made."
            ),
            "",
        ]
    )

    reviewer_lines = [
        "VEREDA — PRIVATE BOOK 3 MANUAL ADJUDICATION PACKET",
        "",
        "PRIVATE REVIEW MATERIAL",
        "Do not commit or redistribute this file.",
        "",
        (
            f"Generated at: "
            f"{completed_at}"
        ),
        (
            f"Source: "
            f"{work['source_file']}"
        ),
        (
            f"Source SHA-256: "
            f"{work['source_sha256']}"
        ),
        "",
    ]

    page_lookup = {
        page["source_pdf_page"]:
            page
        for private_item
        in private_items
        for page
        in private_item[
            "candidate_pages"
        ]
    }

    for index, private_item in enumerate(
        private_items,
        start=1,
    ):
        reviewer_lines.extend(
            [
                "=" * 72,
                (
                    f"CASE {index}: "
                    f"{private_item['display_title']}"
                ),
                "=" * 72,
                "",
                (
                    "Expected successor: "
                    + private_item[
                        "successor_title"
                    ]
                ),
                (
                    "Original source PDF page: "
                    + str(
                        private_item[
                            "original_source_pdf_page"
                        ]
                    )
                ),
                "",
                "CURRENT-TITLE CANDIDATES",
                "",
            ]
        )

        current_items = (
            private_item[
                "current_title_candidates"
            ]
        )

        if not current_items:
            reviewer_lines.append(
                "No current-title candidate "
                "was found in the bounded radius."
            )
        else:
            for candidate_index, candidate in enumerate(
                current_items,
                start=1,
            ):
                reviewer_lines.extend(
                    [
                        (
                            f"Current candidate "
                            f"{candidate_index}"
                        ),
                        (
                            "Page: "
                            + str(
                                candidate[
                                    "source_pdf_page"
                                ]
                            )
                        ),
                        (
                            "Method: "
                            + candidate[
                                "match_method"
                            ]
                        ),
                        (
                            "Score: "
                            + str(
                                candidate[
                                    "score"
                                ]
                            )
                        ),
                        (
                            "Matched lines:"
                        ),
                        *[
                            f"  {line}"
                            for line
                            in candidate[
                                "matched_lines"
                            ]
                        ],
                        "",
                    ]
                )

        reviewer_lines.extend(
            [
                "SUCCESSOR CANDIDATES",
                "",
            ]
        )

        successor_items = (
            private_item[
                "successor_candidates"
            ]
        )

        if not successor_items:
            reviewer_lines.append(
                "No exact or fuzzy successor "
                "candidate met the packet threshold."
            )
        else:
            for candidate_index, candidate in enumerate(
                successor_items,
                start=1,
            ):
                reviewer_lines.extend(
                    [
                        (
                            f"Successor candidate "
                            f"{candidate_index}"
                        ),
                        (
                            "Page: "
                            + str(
                                candidate[
                                    "source_pdf_page"
                                ]
                            )
                        ),
                        (
                            "Method: "
                            + candidate[
                                "match_method"
                            ]
                        ),
                        (
                            "Score: "
                            + str(
                                candidate[
                                    "score"
                                ]
                            )
                        ),
                        (
                            "Token coverage: "
                            + str(
                                candidate[
                                    "token_coverage"
                                ]
                            )
                        ),
                        (
                            "Sequence ratio: "
                            + str(
                                candidate[
                                    "sequence_ratio"
                                ]
                            )
                        ),
                        "Matched lines:",
                        *[
                            f"  {line}"
                            for line
                            in candidate[
                                "matched_lines"
                            ]
                        ],
                        "",
                    ]
                )

        candidate_pages = sorted(
            {
                candidate[
                    "source_pdf_page"
                ]
                for candidate in [
                    *current_items,
                    *successor_items,
                ]
            }
        )

        reviewer_lines.extend(
            [
                "CANDIDATE PAGE TEXT",
                "",
            ]
        )

        for page_number in candidate_pages:
            page = page_lookup[
                page_number
            ]
            reviewer_lines.extend(
                [
                    "-" * 72,
                    (
                        f"SOURCE PDF PAGE "
                        f"{page_number}"
                    ),
                    "-" * 72,
                    page["page_text"],
                    "",
                ]
            )

        reviewer_lines.extend(
            [
                "MANUAL REVIEW QUESTIONS",
                "",
                *[
                    f"- {question}"
                    for question
                    in policy[
                        "review_questions"
                    ]
                ],
                "",
                (
                    "Do not record a final "
                    "decision in this packet."
                ),
                "",
            ]
        )

    write_json(
        PATHS["packet"],
        packet,
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
    reviewer_output.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    reviewer_output.write_text(
        "\n".join(reviewer_lines) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    print(
        "Prepared 2 Book 3 manual "
        "adjudication packet items."
    )
    print(
        "Manual review decisions: 0."
    )
    print(
        "Public source text: 0."
    )
    print(
        f"Private reviewer worksheet: "
        f"{reviewer_output}"
    )
    print(
        "Database changes: 0."
    )


if __name__ == "__main__":
    main()
