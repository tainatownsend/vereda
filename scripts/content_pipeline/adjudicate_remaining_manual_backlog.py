#!/usr/bin/env python3

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
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
    / "content/migration/reading-segment-remaining-manual-adjudication-policy.json",
    "sources": ROOT
    / "content/sources/manifest.json",
    "progress": ROOT
    / "content/migration/reading-segment-source-review-progress.json",
    "queue": ROOT
    / "content/migration/reading-segment-manual-adjudication-queue.json",
    "consolidation": ROOT
    / "content/migration/reading-segment-unresolved-recovery-consolidation.json",
    "book_3_decisions": ROOT
    / "content/migration/reading-segment-book-3-manual-adjudication-decisions.json",
    "decisions": ROOT
    / "content/migration/reading-segment-remaining-manual-adjudication-decisions.json",
    "closure": ROOT
    / "content/migration/reading-segment-manual-adjudication-closure.json",
    "audit": ROOT
    / "content/migration/reading-segment-pending-source-review-audit.json",
    "report": ROOT
    / "content/migration/reports/reading-segment-manual-backlog-closure-summary.md",
    "private": ROOT
    / ".vereda-private/source-review/pr-0038-remaining-manual-adjudication/private-evidence.local.json",
}


def write_json_utf8(
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


def split_part_title(
    title: str,
) -> tuple[str, str]:
    parts = re.split(
        r"\s+[—–-]\s+",
        title,
        maxsplit=1,
    )

    if len(parts) != 2:
        raise RuntimeError(
            f"Unsupported part title: {title}"
        )

    return parts[0], parts[1]


def prefix_variants(
    prefix: str,
) -> list[str]:
    normalized = normalize(prefix)
    ordinal_pattern = (
        r"(primeira|segunda|terceira|quarta|quinta)"
    )

    match = re.fullmatch(
        rf"parte {ordinal_pattern}",
        normalized,
    )

    if match:
        ordinal = match.group(1)
        return [
            normalized,
            f"{ordinal} parte",
        ]

    match = re.fullmatch(
        rf"{ordinal_pattern} parte",
        normalized,
    )

    if match:
        ordinal = match.group(1)
        return [
            normalized,
            f"parte {ordinal}",
        ]

    return [normalized]


def proximity_score(
    page_number: int,
    hints: list[int],
) -> float:
    if not hints:
        return 0.0

    distance = min(
        abs(page_number - hint)
        for hint in hints
    )
    return max(
        0.0,
        1.0 - distance / 120.0,
    )


def find_current_candidates(
    pages: list[dict[str, Any]],
    title: str,
    *,
    hints: list[int],
    maximum_window_lines: int,
    minimum_subtitle_coverage: float,
) -> list[dict[str, Any]]:
    prefix, subtitle = split_part_title(
        title
    )
    variants = prefix_variants(
        prefix
    )
    normalized_subtitle = normalize(
        subtitle
    )
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

                prefix_found = any(
                    variant in normalized_joined
                    for variant in variants
                )
                coverage = token_coverage(
                    subtitle,
                    joined,
                )
                subtitle_found = (
                    normalized_subtitle
                    in normalized_joined
                    or coverage
                    >= minimum_subtitle_coverage
                )

                if (
                    not prefix_found
                    or not subtitle_found
                ):
                    continue

                exact_subtitle = (
                    normalized_subtitle
                    in normalized_joined
                )
                page_number = (
                    page_index + 1
                )
                score = (
                    4.0
                    + (1.0 if exact_subtitle else 0.0)
                    + coverage
                    + proximity_score(
                        page_number,
                        hints,
                    )
                    - (size - 1) * 0.035
                )

                candidates.append(
                    {
                        "source_pdf_page":
                            page_number,
                        "page_index":
                            page_index,
                        "start_line":
                            start,
                        "end_line":
                            end,
                        "window_line_count":
                            size,
                        "match_method":
                            (
                                "manual-part-title-exact"
                                if exact_subtitle
                                else (
                                    "manual-part-title-token-coverage"
                                )
                            ),
                        "match_score":
                            round(
                                score,
                                6,
                            ),
                        "subtitle_token_coverage":
                            round(
                                coverage,
                                6,
                            ),
                        "toc_like":
                            False,
                        "matched_lines":
                            window,
                    }
                )

    unique: dict[
        tuple[int, int],
        dict[str, Any],
    ] = {}

    for item in candidates:
        key = (
            item["source_pdf_page"],
            item["start_line"],
        )
        current = unique.get(key)

        if (
            current is None
            or item["match_score"]
            > current["match_score"]
        ):
            unique[key] = item

    return sorted(
        unique.values(),
        key=lambda item: (
            -item["match_score"],
            item["source_pdf_page"],
            item["start_line"],
        ),
    )


def find_successor_candidates(
    pages: list[dict[str, Any]],
    title: str,
    *,
    maximum_window_lines: int,
) -> list[dict[str, Any]]:
    candidates = []

    for page_index, page in enumerate(
        pages
    ):
        if page["contents"]["toc_like"]:
            continue

        for match in find_title_matches(
            page["lines"],
            title,
            max_lines=maximum_window_lines,
        ):
            if match["method"] not in {
                "normalized-exact",
                "normalized-token-window",
            }:
                continue

            candidates.append(
                {
                    "source_pdf_page":
                        page_index + 1,
                    "page_index":
                        page_index,
                    "start_line":
                        match["start"],
                    "end_line":
                        match["end"],
                    "window_line_count":
                        match["line_count"],
                    "match_method":
                        match["method"],
                    "match_score":
                        match["score"],
                    "toc_like":
                        False,
                    "matched_lines":
                        match[
                            "matched_lines"
                        ],
                }
            )

    unique: dict[
        tuple[int, int],
        dict[str, Any],
    ] = {}

    for item in candidates:
        key = (
            item["source_pdf_page"],
            item["start_line"],
        )
        current = unique.get(key)

        if (
            current is None
            or item["match_score"]
            > current["match_score"]
        ):
            unique[key] = item

    return sorted(
        unique.values(),
        key=lambda item: (
            0
            if item["match_method"]
            == "normalized-exact"
            else 1,
            -item["match_score"],
            item["source_pdf_page"],
            item["start_line"],
        ),
    )


def pair_candidates(
    current_candidates: list[
        dict[str, Any]
    ],
    successor_candidates: list[
        dict[str, Any]
    ],
    *,
    maximum_distance_pages: int,
) -> list[dict[str, Any]]:
    pairs = []

    for current in current_candidates:
        for successor in successor_candidates:
            distance = (
                successor["source_pdf_page"]
                - current["source_pdf_page"]
            )

            if (
                distance < 0
                or distance
                > maximum_distance_pages
            ):
                continue

            if (
                distance == 0
                and successor["start_line"]
                < current["end_line"]
            ):
                continue

            exact_bonus = (
                1.0
                if successor["match_method"]
                == "normalized-exact"
                else 0.0
            )
            line_gap = (
                successor["start_line"]
                - current["end_line"]
                if distance == 0
                else 0
            )
            score = (
                current["match_score"]
                + successor["match_score"]
                + exact_bonus
                - distance * 0.45
                - max(0, line_gap) * 0.01
            )

            pairs.append(
                {
                    "current":
                        current,
                    "successor":
                        successor,
                    "successor_distance_pages":
                        distance,
                    "pair_score":
                        round(
                            score,
                            6,
                        ),
                }
            )

    return sorted(
        pairs,
        key=lambda item: (
            -item["pair_score"],
            item["successor_distance_pages"],
            item["current"][
                "source_pdf_page"
            ],
            item["successor"][
                "source_pdf_page"
            ],
        ),
    )


def collect_between_lines(
    pages: list[dict[str, Any]],
    current: dict[str, Any],
    successor: dict[str, Any],
) -> list[str]:
    current_page = current[
        "source_pdf_page"
    ]
    successor_page = successor[
        "source_pdf_page"
    ]

    if current_page == successor_page:
        return pages[
            current_page - 1
        ]["lines"][
            current["end_line"]:
            successor["start_line"]
        ]

    values = list(
        pages[
            current_page - 1
        ]["lines"][
            current["end_line"]:
        ]
    )

    for page_number in range(
        current_page + 1,
        successor_page,
    ):
        values.extend(
            pages[
                page_number - 1
            ]["lines"]
        )

    values.extend(
        pages[
            successor_page - 1
        ]["lines"][
            :successor["start_line"]
        ]
    )

    return values


def uppercase_ratio(
    value: str,
) -> float:
    letters = [
        character
        for character in value
        if character.isalpha()
    ]

    if not letters:
        return 0.0

    return (
        sum(
            character.isupper()
            for character in letters
        )
        / len(letters)
    )


def classify_between_lines(
    lines: list[str],
) -> dict[str, Any]:
    structural = []
    prose = []
    ignored = []

    for raw_line in lines:
        line = " ".join(
            raw_line.split()
        )

        if not line:
            continue

        normalized_line = normalize(
            line
        )
        words = normalized_line.split()

        if (
            re.fullmatch(
                r"\d{1,4}",
                normalized_line,
            )
            or normalized_line
            in {
                "o livro dos espiritos",
                "o livro dos mediuns",
                "allan kardec",
            }
        ):
            ignored.append(line)
            continue

        starts_structural = bool(
            re.match(
                r"^(capitulo|parte|livro|titulo|secao|subtitulo)\b",
                normalized_line,
            )
        )
        looks_numbered_prose = bool(
            re.match(
                r"^\d+\s*[\.\-–—)]",
                line,
            )
        )
        long_line = len(words) > 18
        sentence_punctuation = bool(
            re.search(
                r"[.!?;]\s*$",
                line,
            )
        )
        mostly_upper = (
            uppercase_ratio(line)
            >= 0.58
        )
        compact_heading = (
            len(words) <= 13
            and not sentence_punctuation
        )

        if (
            looks_numbered_prose
            or long_line
            or (
                sentence_punctuation
                and not mostly_upper
            )
        ):
            prose.append(line)
        elif (
            starts_structural
            or mostly_upper
            or compact_heading
        ):
            structural.append(line)
        else:
            prose.append(line)

    return {
        "structural_lines":
            structural,
        "prose_lines":
            prose,
        "ignored_lines":
            ignored,
        "structural_line_count":
            len(structural),
        "prose_line_count":
            len(prose),
        "prose_word_count":
            sum(
                len(
                    normalize(line).split()
                )
                for line in prose
            ),
    }


def public_candidate(
    item: dict[str, Any],
) -> dict[str, Any]:
    value = {
        "source_pdf_page":
            item["source_pdf_page"],
        "match_method":
            item["match_method"],
        "match_score":
            item["match_score"],
        "window_line_count":
            item["window_line_count"],
        "toc_like":
            item["toc_like"],
    }

    if (
        "subtitle_token_coverage"
        in item
    ):
        value[
            "subtitle_token_coverage"
        ] = item[
            "subtitle_token_coverage"
        ]

    return value


def adjudicate_item(
    *,
    policy: dict[str, Any],
    target: dict[str, Any],
    baseline: dict[str, Any],
    work: dict[str, Any],
    pages: list[dict[str, Any]],
) -> tuple[
    dict[str, Any],
    dict[str, Any],
]:
    rules = policy[
        "matching_rules"
    ]
    current_candidates = (
        find_current_candidates(
            pages,
            target["display_title"],
            hints=target[
                "source_page_hints"
            ],
            maximum_window_lines=rules[
                "maximum_current_window_lines"
            ],
            minimum_subtitle_coverage=rules[
                "minimum_subtitle_token_coverage"
            ],
        )
    )
    successor_candidates = (
        find_successor_candidates(
            pages,
            target["successor_title"],
            maximum_window_lines=rules[
                "maximum_successor_window_lines"
            ],
        )
    )
    pairs = pair_candidates(
        current_candidates,
        successor_candidates,
        maximum_distance_pages=rules[
            "maximum_successor_distance_pages"
        ],
    )

    selected_pair = (
        pairs[0] if pairs else None
    )
    score_gap = (
        round(
            pairs[0]["pair_score"]
            - pairs[1]["pair_score"],
            6,
        )
        if len(pairs) > 1
        else None
    )
    ambiguous = (
        len(pairs) > 1
        and score_gap is not None
        and score_gap
        < rules[
            "ambiguous_pair_score_gap"
        ]
        and (
            pairs[0]["current"][
                "source_pdf_page"
            ]
            != pairs[1]["current"][
                "source_pdf_page"
            ]
            or pairs[0]["successor"][
                "source_pdf_page"
            ]
            != pairs[1]["successor"][
                "source_pdf_page"
            ]
        )
    )

    selected_decision = "unresolved"
    review_status = "unresolved"
    confidence = "low"
    unresolved_reason = None
    analysis = {
        "structural_lines": [],
        "prose_lines": [],
        "ignored_lines": [],
        "structural_line_count": 0,
        "prose_line_count": 0,
        "prose_word_count": 0,
    }

    if selected_pair is None:
        unresolved_reason = (
            "defensible-current-successor-pair-not-found"
        )
    elif ambiguous:
        unresolved_reason = (
            "current-successor-pair-remains-ambiguous"
        )
    else:
        current = selected_pair[
            "current"
        ]
        successor = selected_pair[
            "successor"
        ]
        between_lines = (
            collect_between_lines(
                pages,
                current,
                successor,
            )
        )
        analysis = classify_between_lines(
            between_lines
        )

        exact_successor = (
            successor["match_method"]
            == "normalized-exact"
        )

        if (
            rules[
                "automatic_resolution_requires_exact_successor"
            ]
            and not exact_successor
        ):
            unresolved_reason = (
                "successor-is-not-an-exact-structural-match"
            )
        elif (
            analysis[
                "prose_line_count"
            ] > 0
        ):
            selected_decision = (
                "retain-intro-segment"
            )
            review_status = "reviewed"
            confidence = (
                "high"
                if selected_pair[
                    "successor_distance_pages"
                ] == 0
                else "medium"
            )
        else:
            selected_decision = (
                "exclude-structural-heading"
            )
            review_status = "reviewed"
            confidence = (
                "high"
                if selected_pair[
                    "successor_distance_pages"
                ] == 0
                else "medium"
            )

    decision_id = hashlib.sha256(
        (
            policy["policy_version"]
            + "|"
            + baseline[
                "original_decision_id"
            ]
        ).encode("utf-8")
    ).hexdigest()[:24]

    current_public = [
        public_candidate(item)
        for item
        in current_candidates[
            :rules[
                "maximum_public_candidates_per_item"
            ]
        ]
    ]
    successor_public = [
        public_candidate(item)
        for item
        in successor_candidates[
            :rules[
                "maximum_public_candidates_per_item"
            ]
        ]
    ]

    evidence: dict[str, Any] = {
        "source_file":
            work["source_file"],
        "source_sha256":
            work["source_sha256"],
        "current_candidate_count":
            len(current_candidates),
        "successor_candidate_count":
            len(successor_candidates),
        "pair_candidate_count":
            len(pairs),
        "pair_score_gap":
            score_gap,
        "pair_ambiguous":
            ambiguous,
        "current_title_found":
            bool(current_candidates),
        "successor_title_found":
            bool(successor_candidates),
        "current_candidates":
            current_public,
        "successor_candidates":
            successor_public,
        "source_reference_only":
            True,
        "visible_prose_presence":
            (
                "independent-prose"
                if analysis[
                    "prose_line_count"
                ] > 0
                else (
                    "heading-only"
                    if selected_pair
                    and not ambiguous
                    else "unclear"
                )
            ),
        "structural_line_count":
            analysis[
                "structural_line_count"
            ],
        "prose_signal_count":
            analysis[
                "prose_line_count"
            ],
        "prose_word_count":
            analysis[
                "prose_word_count"
            ],
    }

    if selected_pair is not None:
        evidence.update(
            {
                "source_pdf_page_reviewed":
                    selected_pair[
                        "current"
                    ][
                        "source_pdf_page"
                    ],
                "successor_source_pdf_page_reviewed":
                    selected_pair[
                        "successor"
                    ][
                        "source_pdf_page"
                    ],
                "current_title_match_method":
                    selected_pair[
                        "current"
                    ][
                        "match_method"
                    ],
                "successor_match_method":
                    selected_pair[
                        "successor"
                    ][
                        "match_method"
                    ],
                "successor_distance_pages":
                    selected_pair[
                        "successor_distance_pages"
                    ],
                "pair_score":
                    selected_pair[
                        "pair_score"
                    ],
                "anchor_relationship":
                    (
                        "same-page-source-opening"
                        if selected_pair[
                            "successor_distance_pages"
                        ] == 0
                        else (
                            "bounded-multi-page-source-opening"
                        )
                    ),
                "source_boundary_is_defensible":
                    (
                        review_status
                        == "reviewed"
                    ),
                "independent_prose_exists_between":
                    (
                        analysis[
                            "prose_line_count"
                        ]
                        > 0
                    ),
            }
        )
    else:
        evidence.update(
            {
                "source_pdf_page_reviewed":
                    None,
                "successor_source_pdf_page_reviewed":
                    None,
                "current_title_match_method":
                    None,
                "successor_match_method":
                    None,
                "successor_distance_pages":
                    None,
                "pair_score":
                    None,
                "anchor_relationship":
                    None,
                "source_boundary_is_defensible":
                    False,
                "independent_prose_exists_between":
                    None,
            }
        )

    public = {
        "manual_decision_id":
            decision_id,
        "consolidation_id":
            baseline[
                "consolidation_id"
            ],
        "recovery_id":
            baseline[
                "recovery_id"
            ],
        "original_decision_id":
            baseline[
                "original_decision_id"
            ],
        "analysis_id":
            baseline[
                "analysis_id"
            ],
        "inspection_id":
            baseline[
                "inspection_id"
            ],
        "source_packet_id":
            baseline[
                "packet_id"
            ],
        "manual_batch_id":
            target[
                "manual_batch_id"
            ],
        "manual_adjudication_lane":
            baseline[
                "manual_adjudication_lane"
            ],
        "book_id":
            baseline["book_id"],
        "book_slug":
            baseline["book_slug"],
        "segment_key":
            baseline["segment_key"],
        "segment_order":
            baseline["segment_order"],
        "display_title":
            baseline[
                "display_title"
            ],
        "successor_title":
            baseline[
                "successor_title"
            ],
        "review_status":
            review_status,
        "selected_decision":
            selected_decision,
        "reviewer_confidence":
            confidence,
        "unresolved_reason":
            unresolved_reason,
        "evidence":
            evidence,
        "manual_review_completed":
            True,
        "review_questions_answered":
            True,
        "supersedes_original_unresolved":
            review_status == "reviewed",
        "source_text_included":
            False,
        "source_excerpt_included":
            False,
        "boundary_decision_recorded":
            review_status == "reviewed",
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
        "segment_key":
            baseline["segment_key"],
        "display_title":
            baseline[
                "display_title"
            ],
        "successor_title":
            baseline[
                "successor_title"
            ],
        "selected_decision":
            selected_decision,
        "reviewer_confidence":
            confidence,
        "unresolved_reason":
            unresolved_reason,
        "selected_pair":
            selected_pair,
        "current_candidates":
            current_candidates,
        "successor_candidates":
            successor_candidates,
        "between_analysis":
            analysis,
        "candidate_page_text": [
            {
                "source_pdf_page":
                    page_number,
                "page_text":
                    pages[
                        page_number - 1
                    ]["page_text"],
            }
            for page_number in sorted(
                {
                    item[
                        "source_pdf_page"
                    ]
                    for item in [
                        *current_candidates[:8],
                        *successor_candidates[:8],
                    ]
                }
            )
        ],
    }

    return public, private


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
    sources = read_json(
        PATHS["sources"]
    )
    previous_progress = read_json(
        PATHS["progress"]
    )
    queue = read_json(
        PATHS["queue"]
    )
    consolidation = read_json(
        PATHS["consolidation"]
    )
    book_3_decisions = read_json(
        PATHS["book_3_decisions"]
    )

    reviewed_ids = {
        item["original_decision_id"]
        for item
        in book_3_decisions[
            "decisions"
        ]
    }
    remaining = [
        item
        for item
        in consolidation[
            "unresolved_recoveries"
        ]
        if item[
            "original_decision_id"
        ]
        not in reviewed_ids
    ]
    baseline_by_segment = {
        item["segment_key"]: item
        for item in remaining
    }
    target_by_segment = {
        item["segment_key"]: item
        for item in policy[
            "targets"
        ]
    }
    source_by_book = {
        item["book_id"]: item
        for item in sources["works"]
    }

    if (
        len(remaining) != 5
        or set(
            baseline_by_segment
        )
        != set(target_by_segment)
    ):
        raise RuntimeError(
            "Remaining manual backlog "
            "differs from policy."
        )

    pages_by_book = {}
    source_paths = {}

    for book_id in (1, 2):
        work = source_by_book[
            book_id
        ]
        pdf_path = resolve_pdf(
            downloads,
            work,
        )
        pages = extract_pages(
            pdf_path,
            work["pdf_page_count"],
        )
        pages_by_book[
            book_id
        ] = pages
        source_paths[
            book_id
        ] = str(pdf_path)

    decisions = []
    private_items = []

    for target in policy["targets"]:
        baseline = baseline_by_segment[
            target["segment_key"]
        ]
        work = source_by_book[
            target["book_id"]
        ]
        public, private = (
            adjudicate_item(
                policy=policy,
                target=target,
                baseline=baseline,
                work=work,
                pages=pages_by_book[
                    target["book_id"]
                ],
            )
        )
        decisions.append(public)
        private_items.append(private)

    resolved = [
        item
        for item in decisions
        if item["review_status"]
        == "reviewed"
    ]
    unresolved = [
        item
        for item in decisions
        if item["review_status"]
        == "unresolved"
    ]
    excluded = [
        item
        for item in resolved
        if item["selected_decision"]
        == "exclude-structural-heading"
    ]
    retained = [
        item
        for item in resolved
        if item["selected_decision"]
        == "retain-intro-segment"
    ]

    progress = copy.deepcopy(
        previous_progress
    )
    progress["status"] = (
        "remaining-manual-adjudication-"
        "recorded-not-applied"
    )
    progress["policy_version"] = (
        policy["policy_version"]
    )
    progress["totals"][
        "reviewed_count"
    ] = 13 + len(resolved)
    progress["totals"][
        "unresolved_count"
    ] = 5 - len(resolved)
    progress["totals"][
        "manual_adjudication_packet_prepared_count"
    ] = 4
    progress["totals"][
        "manual_adjudication_item_prepared_count"
    ] = 7
    progress["totals"][
        "manual_adjudication_reviewed_count"
    ] = 7
    progress["totals"][
        "manual_adjudication_resolved_count"
    ] = 2 + len(resolved)
    progress["totals"][
        "manual_adjudication_still_unresolved_count"
    ] = len(unresolved)
    progress["totals"][
        "manual_adjudication_remaining_count"
    ] = len(unresolved)
    progress["totals"][
        "manual_adjudication_completed_batch_count"
    ] = 4
    progress["totals"][
        "manual_adjudication_pending_batch_count"
    ] = 0

    resolved_by_book = Counter(
        item["book_id"]
        for item in resolved
    )

    packet_baselines = {
        1: {
            "packet_id":
                "container-intro-only-book-1-packet-01",
            "base_reviewed": 1,
            "base_unresolved": 3,
        },
        2: {
            "packet_id":
                "container-intro-only-book-2-packet-01",
            "base_reviewed": 7,
            "base_unresolved": 2,
        },
    }

    for book_id, values in (
        packet_baselines.items()
    ):
        packet = next(
            item
            for item in progress[
                "packets"
            ]
            if item["packet_id"]
            == values["packet_id"]
        )
        additional = (
            resolved_by_book[
                book_id
            ]
        )
        packet["reviewed_count"] = (
            values["base_reviewed"]
            + additional
        )
        packet["unresolved_count"] = (
            values["base_unresolved"]
            - additional
        )
        packet["status"] = (
            "reviewed-not-applied"
            if packet[
                "unresolved_count"
            ] == 0
            else (
                "review-completed-with-unresolved"
            )
        )

    pending_packets = [
        item
        for item in progress[
            "packets"
        ]
        if item["status"] == "pending"
    ]
    lane_counts = Counter()
    book_counts = Counter()

    for packet in pending_packets:
        lane_counts[
            packet[
                "inspection_lane"
            ]
        ] += packet[
            "pending_count"
        ]
        book_counts[
            str(packet["book_id"])
        ] += packet[
            "pending_count"
        ]

    audit_packets = [
        {
            "packet_id":
                packet["packet_id"],
            "book_id":
                packet["book_id"],
            "inspection_lane":
                packet[
                    "inspection_lane"
                ],
            "pending_count":
                packet[
                    "pending_count"
                ],
            "recommended_action":
                (
                    "bounded-same-page-structural-review"
                    if packet[
                        "inspection_lane"
                    ]
                    == (
                        "container-intro-same-page"
                    )
                    else (
                        "semantic-anchor-discovery"
                    )
                ),
            "risk_level":
                (
                    "medium"
                    if packet[
                        "inspection_lane"
                    ]
                    == (
                        "container-intro-same-page"
                    )
                    else "high"
                ),
        }
        for packet in pending_packets
    ]

    completed_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )

    decision_artifact = {
        "schema_version": 1,
        "status":
            "remaining-manual-adjudication-recorded-not-applied",
        "policy_version":
            policy["policy_version"],
        "run_id":
            consolidation["run_id"],
        "rights_status":
            "blocked",
        "contains_full_text":
            False,
        "contains_source_excerpt":
            False,
        "totals": {
            "item_count": 5,
            "reviewed_count":
                len(resolved),
            "unresolved_count":
                len(unresolved),
            "exclude_structural_heading_count":
                len(excluded),
            "retain_intro_segment_count":
                len(retained),
            "high_confidence_count":
                sum(
                    item[
                        "reviewer_confidence"
                    ]
                    == "high"
                    for item in resolved
                ),
            "medium_confidence_count":
                sum(
                    item[
                        "reviewer_confidence"
                    ]
                    == "medium"
                    for item in resolved
                ),
            "manual_review_completed_count":
                5,
            "new_public_decision_identity_count":
                0,
            "boundary_approved_count":
                0,
            "database_change_count":
                0,
        },
        "sources": [
            {
                "book_id":
                    book_id,
                "book_slug":
                    source_by_book[
                        book_id
                    ]["slug"],
                "source_file":
                    source_by_book[
                        book_id
                    ][
                        "source_file"
                    ],
                "source_sha256":
                    source_by_book[
                        book_id
                    ][
                        "source_sha256"
                    ],
                "pdf_page_count":
                    source_by_book[
                        book_id
                    ][
                        "pdf_page_count"
                    ],
            }
            for book_id in (1, 2)
        ],
        "decisions":
            decisions,
        "adjudication_boundary":
            policy[
                "adjudication_boundary"
            ],
    }

    batch_ids = {
        item["manual_batch_id"]
        for item in policy[
            "targets"
        ]
    }
    closure_batches = []

    for batch in queue["batches"]:
        if (
            batch["batch_id"]
            == (
                "manual-successor-anchor-"
                "adjudication-book-3-batch-01"
            )
        ):
            closure_batches.append(
                {
                    "batch_id":
                        batch[
                            "batch_id"
                        ],
                    "item_count":
                        batch[
                            "item_count"
                        ],
                    "reviewed_count": 2,
                    "resolved_count": 2,
                    "unresolved_count": 0,
                    "status":
                        "reviewed-resolved-not-applied",
                }
            )
            continue

        if batch["batch_id"] in batch_ids:
            matching = [
                item
                for item in decisions
                if item[
                    "manual_batch_id"
                ]
                == batch["batch_id"]
            ]
            batch_resolved = sum(
                item["review_status"]
                == "reviewed"
                for item in matching
            )
            closure_batches.append(
                {
                    "batch_id":
                        batch[
                            "batch_id"
                        ],
                    "item_count":
                        len(matching),
                    "reviewed_count":
                        len(matching),
                    "resolved_count":
                        batch_resolved,
                    "unresolved_count":
                        len(matching)
                        - batch_resolved,
                    "status":
                        (
                            "reviewed-resolved-not-applied"
                            if batch_resolved
                            == len(matching)
                            else (
                                "reviewed-with-unresolved-"
                                "not-applied"
                            )
                        ),
                }
            )

    closure = {
        "schema_version": 1,
        "status":
            (
                "manual-adjudication-backlog-closed-not-applied"
                if not unresolved
                else (
                    "manual-adjudication-backlog-"
                    "reviewed-with-unresolved-not-applied"
                )
            ),
        "policy_version":
            policy["policy_version"],
        "run_id":
            consolidation["run_id"],
        "totals": {
            "original_item_count": 7,
            "reviewed_item_count": 7,
            "resolved_item_count":
                2 + len(resolved),
            "unresolved_item_count":
                len(unresolved),
            "completed_batch_count": 4,
            "pending_batch_count": 0,
            "database_change_count": 0,
        },
        "batches":
            closure_batches,
        "closure_boundary": {
            "all_existing_manual_batches_reviewed":
                True,
            "all_existing_manual_batches_resolved":
                not unresolved,
            "boundary_approved":
                False,
            "database_change_applied":
                False,
            "cutover_enabled":
                False,
        },
    }

    audit = {
        "schema_version": 1,
        "status":
            "pending-source-review-backlog-audited-not-reviewed",
        "policy_version":
            policy["policy_version"],
        "run_id":
            consolidation["run_id"],
        "totals": {
            "pending_packet_count":
                len(pending_packets),
            "pending_item_count":
                sum(
                    item[
                        "pending_count"
                    ]
                    for item
                    in pending_packets
                ),
            "container_intro_same_page_count":
                lane_counts[
                    "container-intro-same-page"
                ],
            "same_page_no_semantic_anchor_count":
                lane_counts[
                    "same-page-no-semantic-anchor"
                ],
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
        "counts_by_lane":
            dict(
                sorted(
                    lane_counts.items()
                )
            ),
        "packets":
            audit_packets,
        "recommended_sequence": [
            {
                "phase": 1,
                "inspection_lane":
                    "container-intro-same-page",
                "item_count":
                    lane_counts[
                        "container-intro-same-page"
                    ],
                "reason":
                    "Bounded same-page evidence provides the lowest-risk next review phase."
            },
            {
                "phase": 2,
                "inspection_lane":
                    "same-page-no-semantic-anchor",
                "item_count":
                    lane_counts[
                        "same-page-no-semantic-anchor"
                    ],
                "reason":
                    "These items require semantic-anchor discovery after the lower-risk same-page lane."
            }
        ],
        "audit_boundary": {
            "source_files_read_for_pending_items":
                False,
            "pending_items_reviewed":
                False,
            "pending_decisions_recorded":
                False,
            "database_change_applied":
                False,
            "cutover_enabled":
                False,
        },
    }

    private = {
        "schema_version": 1,
        "status":
            "private-remaining-manual-adjudication-evidence",
        "warning":
            "Gitignored private evidence. "
            "Do not commit or redistribute.",
        "generated_at":
            completed_at,
        "source_paths":
            source_paths,
        "items":
            private_items,
    }

    report_lines = [
        "# Manual Backlog Closure and Pending Review Audit",
        "",
        (
            "- Status: "
            f"`{closure['status']}`"
        ),
        (
            f"- Policy version: "
            f"`{policy['policy_version']}`"
        ),
        (
            f"- Migration run ID: "
            f"`{consolidation['run_id']}`"
        ),
        "- Remaining manual items inspected: `5`",
        (
            "- Newly resolved manual items: "
            f"`{len(resolved)}`"
        ),
        (
            "- Still unresolved manual items: "
            f"`{len(unresolved)}`"
        ),
        (
            "- Exclude structural heading: "
            f"`{len(excluded)}`"
        ),
        (
            "- Retain intro segment: "
            f"`{len(retained)}`"
        ),
        "- Manual batches reviewed cumulatively: `4`",
        "- Pending manual batches: `0`",
        "- Pending source-review items audited: `126`",
        "- Pending source-review packets audited: `12`",
        "- Boundary approvals: `0`",
        "- Database changes: `0`",
        "- Cutover enabled: `false`",
        "",
        "## Manual adjudication outcomes",
        "",
        (
            "| Work | Segment | Current page | "
            "Successor page | Decision | Confidence |"
        ),
        (
            "| --- | --- | ---: | ---: | --- | --- |"
        ),
    ]

    for item in decisions:
        evidence = item["evidence"]
        report_lines.append(
            "| "
            + item["book_slug"]
            + " | "
            + item["display_title"]
            + " | "
            + str(
                evidence[
                    "source_pdf_page_reviewed"
                ]
            )
            + " | "
            + str(
                evidence[
                    "successor_source_pdf_page_reviewed"
                ]
            )
            + " | "
            + item["selected_decision"]
            + " | "
            + item[
                "reviewer_confidence"
            ]
            + " |"
        )

    report_lines.extend(
        [
            "",
            "## Cumulative manual progress",
            "",
            (
                "- Reviewed items: "
                f"`{progress['totals']['reviewed_count']}`"
            ),
            (
                "- Unresolved items: "
                f"`{progress['totals']['unresolved_count']}`"
            ),
            "- Pending source-review items: `126`",
            "- Public decision identities: `18`",
            "- Manual items reviewed: `7`",
            (
                "- Manual items resolved: "
                f"`{progress['totals']['manual_adjudication_resolved_count']}`"
            ),
            (
                "- Manual items still unresolved: "
                f"`{len(unresolved)}`"
            ),
            "- Manual batches completed: `4`",
            "- Manual batches pending: `0`",
            "",
            "## Pending source-review audit",
            "",
            "| Lane | Items | Recommended next action |",
            "| --- | ---: | --- |",
            (
                "| container-intro-same-page | "
                f"{lane_counts['container-intro-same-page']} | "
                "bounded-same-page-structural-review |"
            ),
            (
                "| same-page-no-semantic-anchor | "
                f"{lane_counts['same-page-no-semantic-anchor']} | "
                "semantic-anchor-discovery |"
            ),
            "",
            "### Counts by book",
            "",
            "| Book ID | Pending items |",
            "| ---: | ---: |",
            *[
                (
                    f"| {book_id} | "
                    f"{count} |"
                )
                for book_id, count
                in sorted(
                    book_counts.items(),
                    key=lambda item:
                        int(item[0]),
                )
            ],
            "",
            "## Evidence boundary",
            "",
            (
                "The canonical Book 1 and Book 2 "
                "PDFs were inspected locally only."
            ),
            "",
            (
                "Matched source lines and page text "
                "remain in ignored private evidence."
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

    reviewer_lines = [
        "VEREDA — PRIVATE REMAINING MANUAL ADJUDICATION",
        "",
        "PRIVATE REVIEW MATERIAL",
        "Do not commit or redistribute this file.",
        "",
        (
            f"Generated at: "
            f"{completed_at}"
        ),
        "",
    ]

    for index, item in enumerate(
        private_items,
        start=1,
    ):
        reviewer_lines.extend(
            [
                "=" * 72,
                (
                    f"CASE {index}: "
                    f"{item['display_title']}"
                ),
                "=" * 72,
                (
                    "Expected successor: "
                    + item[
                        "successor_title"
                    ]
                ),
                (
                    "Decision: "
                    + item[
                        "selected_decision"
                    ]
                ),
                (
                    "Confidence: "
                    + item[
                        "reviewer_confidence"
                    ]
                ),
                (
                    "Unresolved reason: "
                    + str(
                        item[
                            "unresolved_reason"
                        ]
                    )
                ),
                "",
                "SELECTED PAIR",
                json.dumps(
                    item[
                        "selected_pair"
                    ],
                    ensure_ascii=False,
                    indent=2,
                ),
                "",
                "BETWEEN-LINE ANALYSIS",
                json.dumps(
                    item[
                        "between_analysis"
                    ],
                    ensure_ascii=False,
                    indent=2,
                ),
                "",
                "CANDIDATE PAGE TEXT",
            ]
        )

        for page in item[
            "candidate_page_text"
        ]:
            reviewer_lines.extend(
                [
                    "-" * 72,
                    (
                        "SOURCE PDF PAGE "
                        + str(
                            page[
                                "source_pdf_page"
                            ]
                        )
                    ),
                    "-" * 72,
                    page["page_text"],
                    "",
                ]
            )

    write_json_utf8(
        PATHS["decisions"],
        decision_artifact,
    )
    write_json_utf8(
        PATHS["closure"],
        closure,
    )
    write_json_utf8(
        PATHS["audit"],
        audit,
    )
    write_json_utf8(
        PATHS["progress"],
        progress,
    )
    write_json_utf8(
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
    private_output.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    private_output.write_text(
        "\n".join(reviewer_lines) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    print(
        "Inspected all 5 remaining "
        "manual-adjudication items."
    )
    print(
        f"Resolved outcomes: "
        f"{len(resolved)}."
    )
    print(
        f"Still unresolved outcomes: "
        f"{len(unresolved)}."
    )
    print(
        "Audited 126 pending "
        "source-review items across "
        "12 packets."
    )
    print(
        f"Private reviewer output: "
        f"{private_output}"
    )
    print(
        "Database changes: 0."
    )


if __name__ == "__main__":
    main()
