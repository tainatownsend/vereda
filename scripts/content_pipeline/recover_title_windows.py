#!/usr/bin/env python3

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import unicodedata
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from pypdf import PdfReader

ROOT = Path.cwd()

PATHS = {
    "policy": ROOT
    / "content/migration/reading-segment-title-window-recovery-policy.json",
    "sources": ROOT
    / "content/sources/manifest.json",
    "inspection": ROOT
    / "content/migration/reading-segment-source-inspection-manifest.json",
    "worklist": ROOT
    / "content/migration/reading-segment-source-review-worklist.json",
    "original_decisions": ROOT
    / "content/migration/reading-segment-source-review-container-intro-decisions.json",
    "progress": ROOT
    / "content/migration/reading-segment-source-review-progress.json",
    "analysis": ROOT
    / "content/migration/reading-segment-container-intro-unresolved-analysis.json",
    "queue": ROOT
    / "content/migration/reading-segment-container-intro-resolution-queue.json",
    "application": ROOT
    / "content/migration/reading-segment-mechanical-application-evidence.json",
    "recoveries": ROOT
    / "content/migration/reading-segment-title-window-recovery-decisions.json",
    "report": ROOT
    / "content/migration/reports/reading-segment-title-window-recovery-summary.md",
    "private": ROOT
    / ".vereda-private/source-review/pr-0031-title-window-recovery/source-recovery-evidence.local.json",
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(
        path.read_text(encoding="utf-8")
    )


def write_json(
    path: Path,
    value: Any,
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
    value = (
        value.replace("ª", "a")
        .replace("º", "o")
        .replace("—", " ")
        .replace("–", " ")
    )
    decomposed = unicodedata.normalize(
        "NFKD",
        value,
    )
    without_marks = "".join(
        character
        for character in decomposed
        if not unicodedata.combining(
            character
        )
    )
    normalized = re.sub(
        r"[^a-z0-9]+",
        " ",
        without_marks.lower(),
    ).strip()

    replacements = {
        "primeira": "1",
        "primeiro": "1",
        "segunda": "2",
        "segundo": "2",
        "terceira": "3",
        "terceiro": "3",
        "quarta": "4",
        "quarto": "4",
    }
    tokens = [
        replacements.get(token, token)
        for token in normalized.split()
    ]
    return " ".join(tokens)


def lines_for(text: str) -> list[str]:
    return [
        line.strip()
        for line in text.replace(
            "\r",
            "\n",
        ).split("\n")
        if line.strip()
    ]


def word_count(value: str) -> int:
    return len(
        re.findall(
            r"\b[\wÀ-ÿ'-]+\b",
            value,
        )
    )


def canonical_variants(
    title: str,
) -> list[str]:
    raw_variants = {title}
    replacements = [
        (
            "PARTE PRIMEIRA",
            [
                "PRIMEIRA PARTE",
                "PARTE I",
                "I PARTE",
                "1A PARTE",
                "1 PARTE",
            ],
        ),
        (
            "PARTE SEGUNDA",
            [
                "SEGUNDA PARTE",
                "PARTE II",
                "II PARTE",
                "2A PARTE",
                "2 PARTE",
            ],
        ),
    ]

    upper = title.upper()
    for source, targets in replacements:
        if source in upper:
            for target in targets:
                raw_variants.add(
                    re.sub(
                        source,
                        target,
                        title,
                        flags=re.IGNORECASE,
                    )
                )

    return sorted(
        {
            normalize(variant)
            for variant in raw_variants
            if normalize(variant)
        },
        key=lambda value: (
            -len(value.split()),
            value,
        ),
    )


def ordered_token_coverage(
    expected: list[str],
    actual: list[str],
) -> float:
    if not expected:
        return 0.0

    cursor = 0
    matched = 0
    for token in expected:
        while (
            cursor < len(actual)
            and actual[cursor] != token
        ):
            cursor += 1
        if cursor < len(actual):
            matched += 1
            cursor += 1

    return matched / len(expected)


def match_title(
    lines: list[str],
    title: str,
    *,
    start_index: int = 0,
    max_lines: int = 8,
    short_structural: bool = False,
) -> dict[str, Any] | None:
    variants = canonical_variants(title)
    candidates = []

    for start in range(
        start_index,
        len(lines),
    ):
        for size in range(
            1,
            max_lines + 1,
        ):
            window = lines[
                start : start + size
            ]
            if not window:
                continue

            joined = normalize(
                " ".join(window)
            )
            actual_tokens = joined.split()

            if (
                not joined
                or len(actual_tokens) > 32
            ):
                continue

            for variant in variants:
                expected_tokens = (
                    variant.split()
                )
                exact = (
                    variant == joined
                    or variant in joined
                )
                coverage = (
                    ordered_token_coverage(
                        expected_tokens,
                        actual_tokens,
                    )
                )
                token_set_coverage = (
                    len(
                        set(expected_tokens)
                        & set(actual_tokens)
                    )
                    / len(set(expected_tokens))
                )
                ratio = SequenceMatcher(
                    None,
                    variant,
                    joined,
                ).ratio()
                surplus = max(
                    0,
                    len(actual_tokens)
                    - len(expected_tokens),
                )

                if short_structural:
                    accepted = (
                        exact
                        and surplus <= 5
                        and len(actual_tokens)
                        <= len(expected_tokens)
                        + 5
                    )
                else:
                    accepted = (
                        exact
                        or (
                            coverage >= 0.8
                            and token_set_coverage
                            >= 0.8
                            and ratio >= 0.62
                            and surplus <= 8
                        )
                    )

                if not accepted:
                    continue

                score = (
                    (1.0 if exact else 0.0)
                    + coverage
                    + token_set_coverage
                    + ratio
                    - surplus * 0.03
                    - (size - 1) * 0.01
                )
                candidates.append(
                    {
                        "start": start,
                        "end": start
                        + len(window),
                        "line_count":
                            len(window),
                        "method": (
                            "normalized-exact"
                            if exact
                            else (
                                "normalized-token-"
                                "window"
                            )
                        ),
                        "score": round(
                            score,
                            6,
                        ),
                        "variant":
                            variant,
                        "matched_lines":
                            window,
                    }
                )

    if not candidates:
        return None

    return sorted(
        candidates,
        key=lambda item: (
            -item["score"],
            item["line_count"],
            item["start"],
        ),
    )[0]


def toc_signal_count(text: str) -> int:
    lines = lines_for(text)
    dotted = len(
        re.findall(
            r"\.{3,}",
            text,
        )
    )
    trailing_page = sum(
        1
        for line in lines
        if re.search(
            r"\d+\s*$",
            line,
        )
        and word_count(line) >= 2
    )
    explicit = sum(
        1
        for line in lines
        if normalize(line)
        in {"sumario", "indice"}
    )
    return (
        dotted
        + trailing_page
        + explicit * 20
    )


def line_is_ignorable(
    line: str,
    *,
    book_title: str,
    current_title: str,
    successor_title: str,
) -> bool:
    normalized = normalize(line)

    if (
        not normalized
        or normalized.isdigit()
    ):
        return True

    known = {
        normalize(book_title),
        normalize(current_title),
        normalize(successor_title),
        "allan kardec",
        "federacao espirita brasileira",
    }

    if normalized in known:
        return True

    if re.fullmatch(
        r"(capitulo|parte)\s+[ivx0-9]+",
        normalized,
    ):
        return True

    return False


def classify_between(
    lines: list[str],
    *,
    book_title: str,
    current_title: str,
    successor_title: str,
) -> dict[str, Any]:
    filtered = [
        line
        for line in lines
        if not line_is_ignorable(
            line,
            book_title=book_title,
            current_title=current_title,
            successor_title=successor_title,
        )
    ]

    prose_lines = []
    structural_lines = []

    for line in filtered:
        words = word_count(line)
        has_sentence_end = (
            re.search(
                r"[.!?;:]\s*$",
                line,
            )
            is not None
        )
        letters = [
            character
            for character in line
            if character.isalpha()
        ]
        uppercase_ratio = (
            sum(
                character.isupper()
                for character in letters
            )
            / len(letters)
            if letters
            else 0.0
        )

        is_prose = (
            words >= 12
            or (
                words >= 7
                and has_sentence_end
                and uppercase_ratio < 0.8
            )
        )

        if is_prose:
            prose_lines.append(line)
        else:
            structural_lines.append(
                line
            )

    prose_words = sum(
        word_count(line)
        for line in prose_lines
    )

    return {
        "prose_signal_count":
            len(prose_lines),
        "prose_word_count":
            prose_words,
        "structural_line_count":
            len(structural_lines),
        "visible_prose_presence": (
            "independent-prose"
            if prose_lines
            else "heading-only"
        ),
        "prose_lines":
            prose_lines,
        "structural_lines":
            structural_lines,
        "all_filtered_lines":
            filtered,
    }


def resolve_pdf(
    downloads: Path,
    work: dict[str, Any],
) -> Path:
    exact = downloads / work[
        "source_file"
    ]
    candidates = (
        [exact] if exact.is_file() else []
    )
    candidates.extend(
        path
        for path in downloads.glob(
            "*.pdf"
        )
        if path != exact
    )

    for candidate in candidates:
        if (
            sha256_file(candidate)
            == work["source_sha256"]
        ):
            return candidate

    raise RuntimeError(
        f"Canonical PDF not found for "
        f"{work['title']}."
    )


def extract_pages(
    pdf_path: Path,
    expected_count: int,
) -> list[dict[str, Any]]:
    reader = PdfReader(str(pdf_path))

    if len(reader.pages) != expected_count:
        raise RuntimeError(
            f"{pdf_path.name}: page count "
            "differs from the manifest."
        )

    pages = []
    for index, page in enumerate(
        reader.pages
    ):
        text = page.extract_text() or ""
        pages.append(
            {
                "source_pdf_page":
                    index + 1,
                "page_text": text,
                "lines": lines_for(text),
            }
        )
    return pages


def collect_between(
    pages: list[dict[str, Any]],
    *,
    current_page_index: int,
    current_match: dict[str, Any],
    successor_page_index: int,
    successor_match: dict[str, Any],
) -> list[str]:
    collected = []

    for page_index in range(
        current_page_index,
        successor_page_index + 1,
    ):
        page_lines = pages[
            page_index
        ]["lines"]
        start = (
            current_match["end"]
            if page_index
            == current_page_index
            else 0
        )
        end = (
            successor_match["start"]
            if page_index
            == successor_page_index
            else len(page_lines)
        )
        collected.extend(
            page_lines[start:end]
        )

    return collected


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--downloads",
        required=True,
        type=Path,
    )
    args = parser.parse_args()
    downloads = (
        args.downloads
        .expanduser()
        .resolve()
    )

    policy = read_json(PATHS["policy"])
    source_manifest = read_json(
        PATHS["sources"]
    )
    inspection_manifest = read_json(
        PATHS["inspection"]
    )
    worklist = read_json(
        PATHS["worklist"]
    )
    original_decisions = read_json(
        PATHS["original_decisions"]
    )
    previous_progress = read_json(
        PATHS["progress"]
    )
    analysis = read_json(
        PATHS["analysis"]
    )
    queue = read_json(PATHS["queue"])
    application = read_json(
        PATHS["application"]
    )

    target_items = [
        item
        for item in analysis["items"]
        if item["resolution_lane"]
        == policy["resolution_lane"]
    ]

    if len(target_items) != 3:
        raise RuntimeError(
            "Expected three title-window "
            "recovery items."
        )

    target_decision_ids = {
        item["decision_id"]
        for item in target_items
    }
    original_by_id = {
        decision["decision_id"]:
            decision
        for decision in original_decisions[
            "decisions"
        ]
    }
    inspection_by_id = {
        item["inspection_id"]: item
        for item in inspection_manifest[
            "items"
        ]
    }
    worklist_by_id = {
        item["decision_id"]: item
        for item in worklist["items"]
    }
    works = {
        work["book_id"]: work
        for work in source_manifest[
            "works"
        ]
        if work["book_id"] in {1, 2}
    }

    sources = {}
    private_sources = []

    for book_id, work in works.items():
        pdf_path = resolve_pdf(
            downloads,
            work,
        )
        pages = extract_pages(
            pdf_path,
            work["pdf_page_count"],
        )
        sources[book_id] = {
            "work": work,
            "pdf_path": pdf_path,
            "pages": pages,
        }
        private_sources.append(
            {
                "book_id": book_id,
                "source_file":
                    str(pdf_path),
                "source_sha256":
                    work[
                        "source_sha256"
                    ],
                "pdf_page_count":
                    len(pages),
            }
        )

    completed_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )

    recoveries = []
    private_items = []

    for item in target_items:
        original = original_by_id.get(
            item["decision_id"]
        )
        inspection = inspection_by_id.get(
            item["inspection_id"]
        )
        baseline = worklist_by_id.get(
            item["decision_id"]
        )

        if (
            not original
            or not inspection
            or not baseline
            or original["review_status"]
            != "unresolved"
            or original["selected_decision"]
            != "unresolved"
        ):
            raise RuntimeError(
                f"{item['segment_key']}: "
                "recovery baseline differs."
            )

        source = sources[item["book_id"]]
        work = source["work"]
        pages = source["pages"]
        current_title = item[
            "display_title"
        ]
        successor_title = (
            inspection.get(
                "context",
                {},
            )
            .get("successor", {})
            .get("display_title")
        )

        if not successor_title:
            raise RuntimeError(
                f"{item['segment_key']}: "
                "successor title is missing."
            )

        original_page = int(
            item["evidence_snapshot"][
                "source_pdf_page_reviewed"
            ]
        )
        radius = int(
            policy["matching_rules"][
                "selected_page_may_expand_by"
            ]
        )
        page_numbers = range(
            max(1, original_page - radius),
            min(
                len(pages),
                original_page + radius,
            )
            + 1,
        )

        current_candidates = []

        for page_number in page_numbers:
            page = pages[
                page_number - 1
            ]
            match = match_title(
                page["lines"],
                current_title,
                max_lines=int(
                    policy[
                        "matching_rules"
                    ][
                        "maximum_title_window_lines"
                    ]
                ),
            )
            if match:
                current_candidates.append(
                    {
                        "page_number":
                            page_number,
                        "page":
                            page,
                        "match":
                            match,
                        "toc_signal_count":
                            toc_signal_count(
                                page[
                                    "page_text"
                                ]
                            ),
                        "distance":
                            abs(
                                page_number
                                - original_page
                            ),
                    }
                )

        current_candidates.sort(
            key=lambda candidate: (
                0
                if candidate[
                    "toc_signal_count"
                ]
                == 0
                else 1,
                candidate[
                    "toc_signal_count"
                ],
                -candidate["match"][
                    "score"
                ],
                candidate["distance"],
            )
        )
        current = (
            current_candidates[0]
            if current_candidates
            else None
        )

        successor_result = None
        between_lines = []
        classification = None
        pages_inspected = 0
        unresolved_reason = None

        if current is None:
            unresolved_reason = (
                "current-title-window-"
                "still-not-found"
            )
        elif (
            current[
                "toc_signal_count"
            ]
            != 0
        ):
            unresolved_reason = (
                "current-title-match-"
                "has-contents-signals"
            )
        else:
            current_page_index = (
                current["page_number"]
                - 1
            )
            max_search = int(
                policy[
                    "matching_rules"
                ][
                    "maximum_successor_search_pages"
                ]
            )

            for offset in range(
                max_search + 1
            ):
                page_index = (
                    current_page_index
                    + offset
                )
                if page_index >= len(pages):
                    break

                page = pages[page_index]
                start_index = (
                    current["match"]["end"]
                    if offset == 0
                    else 0
                )
                successor_match = (
                    match_title(
                        page["lines"],
                        successor_title,
                        start_index=start_index,
                        max_lines=5,
                        short_structural=(
                            word_count(
                                successor_title
                            )
                            <= 4
                        ),
                    )
                )
                pages_inspected += 1

                if successor_match:
                    successor_result = {
                        "page_index":
                            page_index,
                        "page_number":
                            page_index + 1,
                        "match":
                            successor_match,
                    }
                    break

            if successor_result is None:
                unresolved_reason = (
                    "successor-title-not-found-"
                    "after-title-recovery"
                )
            else:
                between_lines = (
                    collect_between(
                        pages,
                        current_page_index=(
                            current_page_index
                        ),
                        current_match=(
                            current["match"]
                        ),
                        successor_page_index=(
                            successor_result[
                                "page_index"
                            ]
                        ),
                        successor_match=(
                            successor_result[
                                "match"
                            ]
                        ),
                    )
                )
                classification = (
                    classify_between(
                        between_lines,
                        book_title=work[
                            "title"
                        ],
                        current_title=(
                            current_title
                        ),
                        successor_title=(
                            successor_title
                        ),
                    )
                )

        if (
            current is not None
            and successor_result is not None
            and classification is not None
        ):
            visible = classification[
                "visible_prose_presence"
            ]
            selected_decision = (
                "exclude-structural-heading"
                if visible
                == "heading-only"
                else "retain-intro-segment"
            )

            if (
                selected_decision
                in baseline[
                    "decision_options"
                ]
            ):
                recovery_status = (
                    "resolved"
                )
                confidence = (
                    "high"
                    if (
                        current["match"][
                            "method"
                        ]
                        == "normalized-exact"
                        and successor_result[
                            "match"
                        ][
                            "method"
                        ]
                        == "normalized-exact"
                        and current[
                            "toc_signal_count"
                        ]
                        == 0
                    )
                    else "medium"
                )
                unresolved_reason = None
            else:
                recovery_status = (
                    "still-unresolved"
                )
                selected_decision = (
                    "unresolved"
                )
                confidence = "low"
                unresolved_reason = (
                    "derived-decision-"
                    "not-allowed"
                )
        else:
            recovery_status = (
                "still-unresolved"
            )
            selected_decision = (
                "unresolved"
            )
            confidence = "low"
            visible = "unclear"

        recovery_id = hashlib.sha256(
            (
                policy["policy_version"]
                + "|"
                + item["decision_id"]
            ).encode("utf-8")
        ).hexdigest()[:24]

        evidence = {
            "source_file":
                work["source_file"],
            "source_sha256":
                work["source_sha256"],
            "source_pdf_page_reviewed":
                (
                    current["page_number"]
                    if current
                    else original_page
                ),
            "successor_source_pdf_page_reviewed":
                (
                    successor_result[
                        "page_number"
                    ]
                    if successor_result
                    else None
                ),
            "current_title_match_method":
                (
                    current["match"][
                        "method"
                    ]
                    if current
                    else None
                ),
            "current_title_match_score":
                (
                    current["match"][
                        "score"
                    ]
                    if current
                    else None
                ),
            "current_title_window_line_count":
                (
                    current["match"][
                        "line_count"
                    ]
                    if current
                    else 0
                ),
            "successor_title_found":
                successor_result
                is not None,
            "successor_match_method":
                (
                    successor_result[
                        "match"
                    ][
                        "method"
                    ]
                    if successor_result
                    else None
                ),
            "pages_inspected":
                pages_inspected,
            "toc_signal_count":
                (
                    current[
                        "toc_signal_count"
                    ]
                    if current
                    else 0
                ),
            "prose_signal_count":
                (
                    classification[
                        "prose_signal_count"
                    ]
                    if classification
                    else 0
                ),
            "prose_word_count":
                (
                    classification[
                        "prose_word_count"
                    ]
                    if classification
                    else 0
                ),
            "structural_line_count":
                (
                    classification[
                        "structural_line_count"
                    ]
                    if classification
                    else 0
                ),
            "visible_prose_presence":
                visible,
        }

        recovery = {
            "recovery_id":
                recovery_id,
            "analysis_id":
                item["analysis_id"],
            "original_decision_id":
                item["decision_id"],
            "inspection_id":
                item["inspection_id"],
            "packet_id":
                item["packet_id"],
            "run_id":
                item["run_id"],
            "policy_version":
                policy[
                    "policy_version"
                ],
            "book_id":
                item["book_id"],
            "book_slug":
                item["book_slug"],
            "segment_key":
                item["segment_key"],
            "segment_order":
                item["segment_order"],
            "display_title":
                current_title,
            "successor_title":
                successor_title,
            "recovery_status":
                recovery_status,
            "selected_decision":
                selected_decision,
            "evidence": evidence,
            "reviewer_confidence":
                confidence,
            "unresolved_reason":
                unresolved_reason,
            "recovery_completed_at":
                completed_at,
            "supersedes_original_unresolved":
                recovery_status
                == "resolved",
            "source_text_included":
                False,
            "source_excerpt_included":
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
        recoveries.append(recovery)

        private_items.append(
            {
                "recovery_id":
                    recovery_id,
                "analysis_id":
                    item["analysis_id"],
                "original_decision_id":
                    item["decision_id"],
                "display_title":
                    current_title,
                "successor_title":
                    successor_title,
                "current_candidates":
                    [
                        {
                            "source_pdf_page":
                                candidate[
                                    "page_number"
                                ],
                            "toc_signal_count":
                                candidate[
                                    "toc_signal_count"
                                ],
                            "match":
                                candidate[
                                    "match"
                                ],
                            "page_text":
                                candidate[
                                    "page"
                                ][
                                    "page_text"
                                ],
                        }
                        for candidate
                        in current_candidates
                    ],
                "selected_current":
                    (
                        {
                            "source_pdf_page":
                                current[
                                    "page_number"
                                ],
                            "match":
                                current[
                                    "match"
                                ],
                            "page_text":
                                current[
                                    "page"
                                ][
                                    "page_text"
                                ],
                        }
                        if current
                        else None
                    ),
                "selected_successor":
                    (
                        {
                            "source_pdf_page":
                                successor_result[
                                    "page_number"
                                ],
                            "match":
                                successor_result[
                                    "match"
                                ],
                            "page_text":
                                pages[
                                    successor_result[
                                        "page_index"
                                    ]
                                ][
                                    "page_text"
                                ],
                        }
                        if successor_result
                        else None
                    ),
                "between_lines":
                    between_lines,
                "classification":
                    classification,
                "public_outcome": {
                    "recovery_status":
                        recovery_status,
                    "selected_decision":
                        selected_decision,
                    "unresolved_reason":
                        unresolved_reason,
                },
            }
        )

    recoveries.sort(
        key=lambda recovery: (
            recovery["book_id"],
            recovery["segment_order"],
            recovery["segment_key"],
        )
    )

    resolved_count = sum(
        recovery["recovery_status"]
        == "resolved"
        for recovery in recoveries
    )
    unresolved_count = (
        len(recoveries)
        - resolved_count
    )
    exclude_count = sum(
        recovery[
            "selected_decision"
        ]
        == "exclude-structural-heading"
        for recovery in recoveries
    )
    retain_count = sum(
        recovery[
            "selected_decision"
        ]
        == "retain-intro-segment"
        for recovery in recoveries
    )

    progress = copy.deepcopy(
        previous_progress
    )
    progress["status"] = (
        "title-window-recovery-"
        "completed-not-applied"
    )
    progress["policy_version"] = (
        policy["policy_version"]
    )
    progress["totals"][
        "reviewed_count"
    ] += resolved_count
    progress["totals"][
        "unresolved_count"
    ] -= resolved_count
    progress["totals"][
        "title_window_recovered_count"
    ] = resolved_count
    progress["totals"][
        "title_window_still_unresolved_count"
    ] = unresolved_count

    packet_by_id = {
        packet["packet_id"]:
            packet
        for packet in progress["packets"]
    }

    for recovery in recoveries:
        if (
            recovery["recovery_status"]
            != "resolved"
        ):
            continue
        packet = packet_by_id[
            recovery["packet_id"]
        ]
        packet["reviewed_count"] += 1
        packet["unresolved_count"] -= 1
        packet["status"] = (
            "reviewed-not-applied"
            if packet[
                "unresolved_count"
            ]
            == 0
            else (
                "review-completed-"
                "with-unresolved"
            )
        )

    public = {
        "schema_version": 1,
        "status":
            "title-window-recovery-recorded-not-applied",
        "policy_version":
            policy["policy_version"],
        "run_id":
            analysis["run_id"],
        "resolution_lane":
            policy["resolution_lane"],
        "rights_status": "blocked",
        "contains_full_text": False,
        "contains_source_excerpt":
            False,
        "totals": {
            "target_item_count": 3,
            "resolved_count":
                resolved_count,
            "still_unresolved_count":
                unresolved_count,
            "exclude_structural_heading_count":
                exclude_count,
            "retain_intro_segment_count":
                retain_count,
            "public_decision_count_preserved":
                progress["totals"][
                    "public_decision_count"
                ],
            "pending_count_preserved":
                progress["totals"][
                    "pending_count"
                ],
            "boundary_approved_count":
                0,
            "database_change_count":
                0,
        },
        "sources": [
            {
                "book_id":
                    source["work"][
                        "book_id"
                    ],
                "book_slug":
                    source["work"][
                        "slug"
                    ],
                "source_file":
                    source["work"][
                        "source_file"
                    ],
                "source_sha256":
                    source["work"][
                        "source_sha256"
                    ],
                "pdf_page_count":
                    len(source["pages"]),
            }
            for source in sources.values()
        ],
        "recoveries": recoveries,
        "recovery_boundary":
            policy[
                "recovery_boundary"
            ],
    }

    private = {
        "schema_version": 1,
        "status":
            "private-title-window-recovery-evidence",
        "warning":
            "Gitignored private evidence. "
            "Do not commit or redistribute.",
        "completed_at":
            completed_at,
        "sources":
            private_sources,
        "items":
            private_items,
    }

    report_lines = [
        "# Current-Title Window Recovery",
        "",
        (
            "- Status: "
            "`title-window-recovery-recorded-not-applied`"
        ),
        (
            f"- Policy version: "
            f"`{policy['policy_version']}`"
        ),
        (
            f"- Migration run ID: "
            f"`{analysis['run_id']}`"
        ),
        "- Target items: `3`",
        (
            f"- Resolved outcomes: "
            f"`{resolved_count}`"
        ),
        (
            f"- Still unresolved: "
            f"`{unresolved_count}`"
        ),
        (
            "- Exclude structural heading: "
            f"`{exclude_count}`"
        ),
        (
            "- Retain intro segment: "
            f"`{retain_count}`"
        ),
        "- Boundary approvals: `0`",
        "- Database changes: `0`",
        "- Source text committed: `false`",
        "- Cutover enabled: `false`",
        "",
        "## Recovery outcomes",
        "",
        "| Work | Segment | Current page | Successor page | Outcome | Decision | Confidence |",
        "| --- | --- | ---: | ---: | --- | --- | --- |",
    ]

    work_titles = {
        work["book_id"]:
            work["title"]
        for work in source_manifest[
            "works"
        ]
    }

    for recovery in recoveries:
        report_lines.append(
            "| "
            + work_titles[
                recovery["book_id"]
            ]
            + " | "
            + recovery[
                "display_title"
            ]
            + " | "
            + str(
                recovery["evidence"][
                    "source_pdf_page_reviewed"
                ]
            )
            + " | "
            + (
                str(
                    recovery["evidence"][
                        "successor_source_pdf_page_reviewed"
                    ]
                )
                if recovery["evidence"][
                    "successor_source_pdf_page_reviewed"
                ]
                is not None
                else "—"
            )
            + " | "
            + recovery[
                "recovery_status"
            ]
            + " | "
            + recovery[
                "selected_decision"
            ]
            + " | "
            + recovery[
                "reviewer_confidence"
            ]
            + " |"
        )

    report_lines.extend(
        [
            "",
            "## Cumulative review progress",
            "",
            (
                "- Reviewed items: "
                f"`{progress['totals']['reviewed_count']}`"
            ),
            (
                "- Unresolved items: "
                f"`{progress['totals']['unresolved_count']}`"
            ),
            "- Pending items: `126`",
            "- Public decisions: `18`",
            "- Completed packets: `4`",
            "- Pending packets: `12`",
            "",
            "## Evidence boundary",
            "",
            (
                "The two canonical PDFs were "
                "verified by SHA-256 and inspected "
                "locally."
            ),
            "",
            (
                "Extracted source text and matched "
                "lines remain only in the Git-ignored "
                "private workspace."
            ),
            "",
            "## Application boundary",
            "",
            (
                "Recovered decisions supersede their "
                "original unresolved status only in "
                "the cumulative review state."
            ),
            "",
            (
                "No boundary is approved or applied "
                "to staging."
            ),
            "",
        ]
    )

    write_json(
        PATHS["recoveries"],
        public,
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
        "Processed 3 current-title-window "
        "recovery cases."
    )
    print(
        f"Resolved outcomes: "
        f"{resolved_count}."
    )
    print(
        f"Still unresolved: "
        f"{unresolved_count}."
    )
    print(
        "Source text committed: 0."
    )
    print(
        "Database changes: 0."
    )


if __name__ == "__main__":
    main()
