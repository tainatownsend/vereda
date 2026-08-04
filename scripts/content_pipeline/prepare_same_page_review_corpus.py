#!/usr/bin/env python3

from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import re
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from hash_utils import sha256_legacy_crlf

from pypdf import PdfReader

ROOT = Path.cwd()

PATHS = {
    "policy": ROOT
    / "content/migration/reading-segment-same-page-review-corpus-policy.json",
    "manifest": ROOT
    / "content/sources/manifest.json",
    "worklist": ROOT
    / "content/migration/reading-segment-source-review-worklist.json",
    "inspection_packets": ROOT
    / "content/migration/reading-segment-source-inspection-packets.json",
    "audit": ROOT
    / "content/migration/reading-segment-pending-source-review-audit.json",
    "progress": ROOT
    / "content/migration/reading-segment-source-review-progress.json",
    "corpus": ROOT
    / "content/migration/reading-segment-same-page-review-corpus.json",
    "report": ROOT
    / "content/migration/reports/reading-segment-same-page-review-corpus-summary.md",
    "private": ROOT
    / ".vereda-private/source-review/pr-0039-same-page-review-corpus/private-evidence.local.json",
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(
        path.read_text(
            encoding="utf-8"
        )
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


def resolve_pdf(
    downloads: Path,
    work: dict[str, Any],
) -> Path:
    exact = (
        downloads
        / work["source_file"]
    )
    candidates = (
        [exact]
        if exact.is_file()
        else []
    ) + [
        path
        for path in downloads.glob(
            "*.pdf"
        )
        if path != exact
    ]

    for candidate in candidates:
        if (
            sha256(candidate)
            == work["source_sha256"]
        ):
            return candidate

    raise RuntimeError(
        "Canonical source not found: "
        + work["source_file"]
    )


def extract_pages(
    pdf_path: Path,
    expected_count: int,
) -> list[dict[str, Any]]:
    reader = PdfReader(
        str(pdf_path)
    )

    if len(reader.pages) != expected_count:
        raise RuntimeError(
            f"{pdf_path.name}: expected "
            f"{expected_count} pages, "
            f"found {len(reader.pages)}."
        )

    pages = []

    for index, page in enumerate(
        reader.pages,
        start=1,
    ):
        text = (
            page.extract_text() or ""
        )
        lines = [
            " ".join(
                line.split()
            )
            for line in text.splitlines()
            if " ".join(
                line.split()
            )
        ]
        pages.append(
            {
                "source_pdf_page":
                    index,
                "page_text":
                    text,
                "lines":
                    lines,
                "normalized_page":
                    normalize(text),
            }
        )

    return pages


def token_coverage(
    expected: str,
    actual: str,
) -> float:
    expected_tokens = (
        normalize(expected).split()
    )
    actual_tokens = set(
        normalize(actual).split()
    )

    if not expected_tokens:
        return 0.0

    matched = sum(
        token in actual_tokens
        for token in expected_tokens
    )
    return matched / len(
        expected_tokens
    )


def sequence_ratio(
    expected: str,
    actual: str,
) -> float:
    return difflib.SequenceMatcher(
        None,
        normalize(expected),
        normalize(actual),
    ).ratio()


def find_heading_matches(
    lines: list[str],
    title: str,
    *,
    maximum_lines: int,
    minimum_token_coverage: float,
    minimum_sequence_ratio: float,
) -> list[dict[str, Any]]:
    target = normalize(title)
    matches = []

    for start in range(
        len(lines)
    ):
        for size in range(
            1,
            maximum_lines + 1,
        ):
            end = start + size

            if end > len(lines):
                break

            window = lines[start:end]
            joined = " ".join(window)
            normalized_joined = normalize(
                joined
            )

            if not normalized_joined:
                continue

            exact = (
                normalized_joined
                == target
            )
            coverage = token_coverage(
                title,
                joined,
            )
            ratio = sequence_ratio(
                title,
                joined,
            )

            if (
                not exact
                and coverage
                < minimum_token_coverage
                and ratio
                < minimum_sequence_ratio
            ):
                continue

            method = (
                "normalized-exact"
                if exact
                else (
                    "token-window"
                    if coverage
                    >= minimum_token_coverage
                    else "sequence-window"
                )
            )
            score = (
                (4.0 if exact else 0.0)
                + coverage * 2.0
                + ratio
                - (size - 1) * 0.04
            )

            matches.append(
                {
                    "start_line":
                        start,
                    "end_line":
                        end,
                    "window_line_count":
                        size,
                    "match_method":
                        method,
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
                    "match_score":
                        round(
                            score,
                            6,
                        ),
                    "matched_lines":
                        window,
                }
            )

    best_by_start: dict[
        int,
        dict[str, Any],
    ] = {}

    for match in matches:
        current = best_by_start.get(
            match["start_line"]
        )

        if (
            current is None
            or match["match_score"]
            > current["match_score"]
        ):
            best_by_start[
                match["start_line"]
            ] = match

    return sorted(
        best_by_start.values(),
        key=lambda item: (
            -item["match_score"],
            item["start_line"],
        ),
    )


def printed_page_hint(
    inspection: dict[str, Any],
) -> int | None:
    reference = (
        inspection.get(
            "source_reference"
        )
        or {}
    )
    current = (
        reference.get("current")
        or {}
    )
    successor = (
        reference.get("successor")
        or {}
    )

    values = [
        value
        for value in [
            current.get(
                "printed_page"
            ),
            successor.get(
                "printed_page"
            ),
        ]
        if isinstance(value, int)
    ]

    if not values:
        return None

    return min(values)


def page_distance(
    source_pdf_page: int,
    printed_hint: int | None,
) -> int | None:
    if printed_hint is None:
        return None

    return abs(
        source_pdf_page
        - printed_hint
    )


def build_pair_candidates(
    pages: list[dict[str, Any]],
    current_title: str,
    successor_title: str,
    printed_hint: int | None,
    rules: dict[str, Any],
) -> list[dict[str, Any]]:
    candidates = []

    for page in pages:
        distance = page_distance(
            page[
                "source_pdf_page"
            ],
            printed_hint,
        )

        if (
            distance is not None
            and distance
            > rules[
                "maximum_printed_page_distance"
            ]
        ):
            continue

        current_matches = (
            find_heading_matches(
                page["lines"],
                current_title,
                maximum_lines=rules[
                    "maximum_heading_window_lines"
                ],
                minimum_token_coverage=rules[
                    "minimum_token_coverage"
                ],
                minimum_sequence_ratio=rules[
                    "minimum_sequence_ratio"
                ],
            )
        )
        successor_matches = (
            find_heading_matches(
                page["lines"],
                successor_title,
                maximum_lines=rules[
                    "maximum_heading_window_lines"
                ],
                minimum_token_coverage=rules[
                    "minimum_token_coverage"
                ],
                minimum_sequence_ratio=rules[
                    "minimum_sequence_ratio"
                ],
            )
        )

        for current in current_matches:
            for successor in successor_matches:
                if (
                    successor[
                        "start_line"
                    ]
                    < current[
                        "end_line"
                    ]
                ):
                    continue

                line_gap = (
                    successor[
                        "start_line"
                    ]
                    - current[
                        "end_line"
                    ]
                )
                proximity_bonus = (
                    1.0
                    if distance is None
                    else max(
                        0.0,
                        1.0
                        - distance / 24.0,
                    )
                )
                front_matter_penalty = (
                    1.5
                    if (
                        rules[
                            "front_matter_occurrences_penalized"
                        ]
                        and page[
                            "source_pdf_page"
                        ] <= 12
                        and (
                            printed_hint
                            is None
                            or printed_hint
                            > 20
                        )
                    )
                    else 0.0
                )
                score = (
                    current[
                        "match_score"
                    ]
                    + successor[
                        "match_score"
                    ]
                    + proximity_bonus
                    - line_gap * 0.015
                    - front_matter_penalty
                )

                intervening = (
                    page["lines"][
                        current[
                            "end_line"
                        ]:
                        successor[
                            "start_line"
                        ]
                    ]
                )

                candidates.append(
                    {
                        "source_pdf_page":
                            page[
                                "source_pdf_page"
                            ],
                        "printed_page_hint":
                            printed_hint,
                        "page_distance_from_printed_hint":
                            distance,
                        "current":
                            current,
                        "successor":
                            successor,
                        "current_precedes_successor":
                            True,
                        "intervening_line_count":
                            len(
                                intervening
                            ),
                        "pair_score":
                            round(
                                score,
                                6,
                            ),
                        "intervening_lines":
                            intervening,
                        "candidate_page_text":
                            page[
                                "page_text"
                            ],
                    }
                )

    unique: dict[
        tuple[int, int, int],
        dict[str, Any],
    ] = {}

    for item in candidates:
        key = (
            item[
                "source_pdf_page"
            ],
            item["current"][
                "start_line"
            ],
            item["successor"][
                "start_line"
            ],
        )
        current = unique.get(key)

        if (
            current is None
            or item["pair_score"]
            > current["pair_score"]
        ):
            unique[key] = item

    return sorted(
        unique.values(),
        key=lambda item: (
            -item["pair_score"],
            (
                item[
                    "page_distance_from_printed_hint"
                ]
                if item[
                    "page_distance_from_printed_hint"
                ]
                is not None
                else 999
            ),
            item[
                "source_pdf_page"
            ],
        ),
    )


def public_match(
    value: dict[str, Any],
) -> dict[str, Any]:
    return {
        "window_line_count":
            value[
                "window_line_count"
            ],
        "match_method":
            value[
                "match_method"
            ],
        "token_coverage":
            value[
                "token_coverage"
            ],
        "sequence_ratio":
            value[
                "sequence_ratio"
            ],
        "match_score":
            value[
                "match_score"
            ],
    }


def public_pair(
    value: dict[str, Any],
) -> dict[str, Any]:
    return {
        "source_pdf_page":
            value[
                "source_pdf_page"
            ],
        "printed_page_hint":
            value[
                "printed_page_hint"
            ],
        "page_distance_from_printed_hint":
            value[
                "page_distance_from_printed_hint"
            ],
        "current":
            public_match(
                value["current"]
            ),
        "successor":
            public_match(
                value["successor"]
            ),
        "current_precedes_successor":
            value[
                "current_precedes_successor"
            ],
        "intervening_line_count":
            value[
                "intervening_line_count"
            ],
        "pair_score":
            value[
                "pair_score"
            ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--downloads",
        required=True,
        type=Path,
    )
    parser.add_argument(
        "--private-output",
        required=True,
        type=Path,
    )
    args = parser.parse_args()

    downloads = (
        args.downloads
        .expanduser()
        .resolve()
    )
    private_output = (
        args.private_output
        .expanduser()
        .resolve()
    )

    policy = read_json(
        PATHS["policy"]
    )
    manifest = read_json(
        PATHS["manifest"]
    )
    worklist = read_json(
        PATHS["worklist"]
    )
    inspection_packets = read_json(
        PATHS[
            "inspection_packets"
        ]
    )
    audit = read_json(
        PATHS["audit"]
    )
    progress = read_json(
        PATHS["progress"]
    )

    target_packet_ids = set(
        policy["target"][
            "packet_ids"
        ]
    )
    target_worklist = [
        item
        for item in worklist[
            "items"
        ]
        if item["packet_id"]
        in target_packet_ids
    ]
    target_packets = [
        packet
        for packet in inspection_packets[
            "packets"
        ]
        if packet["packet_id"]
        in target_packet_ids
    ]
    inspection_by_id = {
        item["inspection_id"]:
            item
        for packet in target_packets
        for item in packet["items"]
    }

    if (
        len(target_worklist) != 38
        or len(inspection_by_id) != 38
    ):
        raise RuntimeError(
            "Same-page target corpus "
            "does not contain 38 items."
        )

    works = {
        item["book_id"]: item
        for item in manifest["works"]
        if item["book_id"]
        in {1, 4, 5}
    }
    pages_by_book = {}
    source_paths = {}

    for book_id in (1, 4, 5):
        work = works[book_id]
        pdf_path = resolve_pdf(
            downloads,
            work,
        )
        pages_by_book[
            book_id
        ] = extract_pages(
            pdf_path,
            work[
                "pdf_page_count"
            ],
        )
        source_paths[
            str(book_id)
        ] = str(
            pdf_path
        )

    public_items = []
    private_items = []
    status_counts = Counter()
    book_counts = Counter()
    packet_counts = Counter()
    candidate_counts = []

    rules = policy[
        "matching_rules"
    ]

    for baseline in sorted(
        target_worklist,
        key=lambda item: (
            item["book_id"],
            item["segment_order"],
        ),
    ):
        inspection = (
            inspection_by_id.get(
                baseline[
                    "inspection_id"
                ]
            )
        )

        if inspection is None:
            raise RuntimeError(
                baseline[
                    "inspection_id"
                ]
                + ": inspection item "
                "not found."
            )

        successor = (
            inspection.get(
                "context",
            ).get(
                "successor",
            )
        )

        if (
            not successor
            or not isinstance(
                successor.get(
                    "display_title"
                ),
                str,
            )
            or not successor[
                "display_title"
            ].strip()
        ):
            raise RuntimeError(
                baseline[
                    "segment_key"
                ]
                + ": canonical successor "
                "title is missing."
            )

        current_title = baseline[
            "display_title"
        ]
        successor_title = (
            successor[
                "display_title"
            ]
        )
        printed_hint = (
            printed_page_hint(
                inspection
            )
        )
        candidates = (
            build_pair_candidates(
                pages_by_book[
                    baseline[
                        "book_id"
                    ]
                ],
                current_title,
                successor_title,
                printed_hint,
                rules,
            )
        )
        top_candidates = (
            candidates[
                :rules[
                    "maximum_public_pair_candidates"
                ]
            ]
        )
        selected = (
            candidates[0]
            if candidates
            else None
        )
        score_gap = (
            round(
                candidates[0][
                    "pair_score"
                ]
                - candidates[1][
                    "pair_score"
                ],
                6,
            )
            if len(candidates) > 1
            else None
        )
        ambiguous = (
            len(candidates) > 1
            and score_gap is not None
            and score_gap
            < rules[
                "ambiguous_pair_score_gap"
            ]
            and (
                candidates[0][
                    "source_pdf_page"
                ]
                != candidates[1][
                    "source_pdf_page"
                ]
                or candidates[0][
                    "current"
                ][
                    "start_line"
                ]
                != candidates[1][
                    "current"
                ][
                    "start_line"
                ]
            )
        )

        if selected is None:
            corpus_status = (
                "evidence-incomplete-not-reviewed"
            )
        elif ambiguous:
            corpus_status = (
                "evidence-ambiguous-not-reviewed"
            )
        else:
            corpus_status = (
                "evidence-prepared-not-reviewed"
            )

        corpus_item_id = (
            hashlib.sha256(
                (
                    policy[
                        "policy_version"
                    ]
                    + "|"
                    + baseline[
                        "decision_id"
                    ]
                ).encode(
                    "utf-8"
                )
            ).hexdigest()[:24]
        )

        public_item = {
            "corpus_item_id":
                corpus_item_id,
            "decision_id":
                baseline[
                    "decision_id"
                ],
            "inspection_id":
                baseline[
                    "inspection_id"
                ],
            "packet_id":
                baseline[
                    "packet_id"
                ],
            "run_id":
                baseline[
                    "run_id"
                ],
            "book_id":
                baseline[
                    "book_id"
                ],
            "book_slug":
                baseline[
                    "book_slug"
                ],
            "segment_key":
                baseline[
                    "segment_key"
                ],
            "segment_order":
                baseline[
                    "segment_order"
                ],
            "current_title":
                current_title,
            "successor_segment_key":
                successor[
                    "segment_key"
                ],
            "successor_title":
                successor_title,
            "inspection_lane":
                baseline[
                    "inspection_lane"
                ],
            "corpus_status":
                corpus_status,
            "pair_candidate_count":
                len(candidates),
            "public_pair_candidate_count":
                len(top_candidates),
            "pair_score_gap":
                score_gap,
            "pair_ambiguous":
                ambiguous,
            "selected_pair":
                (
                    public_pair(
                        selected
                    )
                    if selected
                    else None
                ),
            "pair_candidates": [
                public_pair(
                    item
                )
                for item in top_candidates
            ],
            "review_questions":
                policy[
                    "review_questions"
                ],
            "manual_review_required":
                True,
            "manual_review_completed":
                False,
            "selected_decision":
                None,
            "reviewer_confidence":
                None,
            "source_text_included":
                False,
            "source_excerpt_included":
                False,
            "boundary_decision_recorded":
                False,
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

        private_item = {
            "corpus_item_id":
                corpus_item_id,
            "decision_id":
                baseline[
                    "decision_id"
                ],
            "inspection_id":
                baseline[
                    "inspection_id"
                ],
            "packet_id":
                baseline[
                    "packet_id"
                ],
            "book_id":
                baseline[
                    "book_id"
                ],
            "segment_key":
                baseline[
                    "segment_key"
                ],
            "current_title":
                current_title,
            "successor_title":
                successor_title,
            "printed_page_hint":
                printed_hint,
            "corpus_status":
                corpus_status,
            "pair_score_gap":
                score_gap,
            "pair_ambiguous":
                ambiguous,
            "pair_candidates":
                candidates[
                    :rules[
                        "maximum_public_pair_candidates"
                    ]
                ],
        }

        public_items.append(
            public_item
        )
        private_items.append(
            private_item
        )
        status_counts[
            corpus_status
        ] += 1
        book_counts[
            str(
                baseline[
                    "book_id"
                ]
            )
        ] += 1
        packet_counts[
            baseline[
                "packet_id"
            ]
        ] += 1
        candidate_counts.append(
            len(candidates)
        )

    generated_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace(
            "+00:00",
            "Z",
        )
    )

    input_hashes = {
        "worklist_sha256":
            sha256(
                PATHS["worklist"]
            ),
        "inspection_packets_sha256":
            sha256(
                PATHS[
                    "inspection_packets"
                ]
            ),
        "pending_audit_sha256":
            sha256(
                PATHS["audit"]
            ),
        "progress_sha256":
            sha256(
                PATHS["progress"]
            ),
    }

    corpus = {
        "schema_version": 1,
        "status":
            "same-page-review-corpus-prepared-not-reviewed",
        "policy_version":
            policy[
                "policy_version"
            ],
        "run_id":
            worklist["run_id"],
        "rights_status":
            "blocked",
        "contains_full_text":
            False,
        "contains_source_excerpt":
            False,
        "generated_at":
            generated_at,
        "input_hashes":
            input_hashes,
        "totals": {
            "packet_count": 4,
            "item_count": 38,
            "evidence_prepared_count":
                status_counts[
                    "evidence-prepared-not-reviewed"
                ],
            "evidence_ambiguous_count":
                status_counts[
                    "evidence-ambiguous-not-reviewed"
                ],
            "evidence_incomplete_count":
                status_counts[
                    "evidence-incomplete-not-reviewed"
                ],
            "items_with_pair_candidates_count":
                sum(
                    count > 0
                    for count
                    in candidate_counts
                ),
            "items_without_pair_candidates_count":
                sum(
                    count == 0
                    for count
                    in candidate_counts
                ),
            "manual_review_completed_count":
                0,
            "review_decision_count":
                0,
            "boundary_approved_count":
                0,
            "database_change_count":
                0,
        },
        "counts_by_book":
            dict(
                sorted(
                    book_counts.items(),
                    key=lambda item:
                        int(item[0]),
                )
            ),
        "counts_by_packet":
            dict(
                sorted(
                    packet_counts.items()
                )
            ),
        "sources": [
            {
                "book_id":
                    book_id,
                "book_slug":
                    works[
                        book_id
                    ]["slug"],
                "source_file":
                    works[
                        book_id
                    ][
                        "source_file"
                    ],
                "source_sha256":
                    works[
                        book_id
                    ][
                        "source_sha256"
                    ],
                "pdf_page_count":
                    works[
                        book_id
                    ][
                        "pdf_page_count"
                    ],
            }
            for book_id in (
                1,
                4,
                5,
            )
        ],
        "items":
            public_items,
        "preparation_boundary":
            policy[
                "preparation_boundary"
            ],
    }

    private = {
        "schema_version": 1,
        "status":
            "private-same-page-review-corpus-evidence",
        "warning":
            "Gitignored private evidence. "
            "Do not commit or redistribute.",
        "generated_at":
            generated_at,
        "source_paths":
            source_paths,
        "input_hashes":
            input_hashes,
        "items":
            private_items,
    }

    report_lines = [
        "# Same-Page Review Corpus",
        "",
        (
            "- Status: "
            "`same-page-review-corpus-prepared-not-reviewed`"
        ),
        (
            "- Policy version: "
            f"`{policy['policy_version']}`"
        ),
        (
            "- Migration run ID: "
            f"`{worklist['run_id']}`"
        ),
        "- Target packets: `4`",
        "- Target items: `38`",
        (
            "- Evidence prepared: "
            f"`{corpus['totals']['evidence_prepared_count']}`"
        ),
        (
            "- Evidence ambiguous: "
            f"`{corpus['totals']['evidence_ambiguous_count']}`"
        ),
        (
            "- Evidence incomplete: "
            f"`{corpus['totals']['evidence_incomplete_count']}`"
        ),
        (
            "- Items with pair candidates: "
            f"`{corpus['totals']['items_with_pair_candidates_count']}`"
        ),
        (
            "- Items without pair candidates: "
            f"`{corpus['totals']['items_without_pair_candidates_count']}`"
        ),
        "- Manual reviews completed: `0`",
        "- Review decisions recorded: `0`",
        "- Boundary approvals: `0`",
        "- Database changes: `0`",
        "- Source text committed: `false`",
        "- Cutover enabled: `false`",
        "",
        "## Counts by book",
        "",
        "| Book ID | Items |",
        "| ---: | ---: |",
        *[
            f"| {book_id} | {count} |"
            for book_id, count
            in sorted(
                book_counts.items(),
                key=lambda item:
                    int(item[0]),
            )
        ],
        "",
        "## Counts by packet",
        "",
        "| Packet | Items |",
        "| --- | ---: |",
        *[
            f"| {packet_id} | {count} |"
            for packet_id, count
            in sorted(
                packet_counts.items()
            )
        ],
        "",
        "## Public evidence",
        "",
        (
            "The public corpus contains only "
            "source references, match metadata, "
            "candidate counts, and review questions."
        ),
        "",
        (
            "Matched lines and page text remain "
            "in ignored private evidence."
        ),
        "",
        "## Workflow boundary",
        "",
        (
            "This PR prepares evidence only. "
            "It does not record decisions or "
            "modify cumulative progress."
        ),
        "",
    ]

    private_lines = [
        "VEREDA — PRIVATE SAME-PAGE REVIEW CORPUS",
        "",
        "PRIVATE REVIEW MATERIAL",
        "Do not commit or redistribute this file.",
        "",
        f"Generated at: {generated_at}",
        (
            "Target items: "
            f"{len(private_items)}"
        ),
        "",
    ]

    for index, item in enumerate(
        private_items,
        start=1,
    ):
        private_lines.extend(
            [
                "=" * 72,
                (
                    f"CASE {index}: "
                    f"{item['current_title']}"
                ),
                "=" * 72,
                (
                    "Book ID: "
                    + str(
                        item["book_id"]
                    )
                ),
                (
                    "Packet: "
                    + item[
                        "packet_id"
                    ]
                ),
                (
                    "Segment key: "
                    + item[
                        "segment_key"
                    ]
                ),
                (
                    "Expected successor: "
                    + item[
                        "successor_title"
                    ]
                ),
                (
                    "Status: "
                    + item[
                        "corpus_status"
                    ]
                ),
                (
                    "Printed-page hint: "
                    + str(
                        item[
                            "printed_page_hint"
                        ]
                    )
                ),
                (
                    "Candidate pairs: "
                    + str(
                        len(
                            item[
                                "pair_candidates"
                            ]
                        )
                    )
                ),
                (
                    "Ambiguous: "
                    + str(
                        item[
                            "pair_ambiguous"
                        ]
                    )
                ),
                "",
            ]
        )

        for candidate_index, candidate in enumerate(
            item[
                "pair_candidates"
            ],
            start=1,
        ):
            private_lines.extend(
                [
                    "-" * 72,
                    (
                        "PAIR CANDIDATE "
                        + str(
                            candidate_index
                        )
                    ),
                    "-" * 72,
                    (
                        "Source PDF page: "
                        + str(
                            candidate[
                                "source_pdf_page"
                            ]
                        )
                    ),
                    (
                        "Pair score: "
                        + str(
                            candidate[
                                "pair_score"
                            ]
                        )
                    ),
                    (
                        "Current matched lines:"
                    ),
                    *[
                        "  "
                        + line
                        for line
                        in candidate[
                            "current"
                        ][
                            "matched_lines"
                        ]
                    ],
                    (
                        "Intervening lines:"
                    ),
                    *[
                        "  "
                        + line
                        for line
                        in candidate[
                            "intervening_lines"
                        ]
                    ],
                    (
                        "Successor matched lines:"
                    ),
                    *[
                        "  "
                        + line
                        for line
                        in candidate[
                            "successor"
                        ][
                            "matched_lines"
                        ]
                    ],
                    "",
                    "PAGE TEXT",
                    candidate[
                        "candidate_page_text"
                    ],
                    "",
                ]
            )

    write_json(
        PATHS["corpus"],
        corpus,
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
        "\n".join(
            report_lines
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )
    private_output.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    private_output.write_text(
        "\n".join(
            private_lines
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )

    print(
        "Prepared the 38-item "
        "same-page review corpus."
    )
    print(
        "Evidence prepared: "
        + str(
            corpus["totals"][
                "evidence_prepared_count"
            ]
        )
        + "."
    )
    print(
        "Evidence ambiguous: "
        + str(
            corpus["totals"][
                "evidence_ambiguous_count"
            ]
        )
        + "."
    )
    print(
        "Evidence incomplete: "
        + str(
            corpus["totals"][
                "evidence_incomplete_count"
            ]
        )
        + "."
    )
    print(
        "Manual decisions: 0."
    )
    print(
        "Cumulative progress changes: 0."
    )
    print(
        "Database changes: 0."
    )


if __name__ == "__main__":
    main()
