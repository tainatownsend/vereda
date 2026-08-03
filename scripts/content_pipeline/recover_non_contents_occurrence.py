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
    / "content/migration/reading-segment-non-contents-recovery-policy.json",
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
    "title_recovery": ROOT
    / "content/migration/reading-segment-title-window-recovery-decisions.json",
    "application": ROOT
    / "content/migration/reading-segment-mechanical-application-evidence.json",
    "recovery": ROOT
    / "content/migration/reading-segment-non-contents-recovery-decision.json",
    "report": ROOT
    / "content/migration/reports/reading-segment-non-contents-recovery-summary.md",
    "private": ROOT
    / ".vereda-private/source-review/pr-0032-non-contents-recovery/source-recovery-evidence.local.json",
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

    return " ".join(
        replacements.get(token, token)
        for token in normalized.split()
    )


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
    variants = {title}
    upper = title.upper()

    replacements = [
        (
            "PARTE PRIMEIRA",
            [
                "PRIMEIRA PARTE",
                "PARTE I",
                "I PARTE",
                "1ª PARTE",
                "1A PARTE",
            ],
        ),
        (
            "PARTE SEGUNDA",
            [
                "SEGUNDA PARTE",
                "PARTE II",
                "II PARTE",
                "2ª PARTE",
                "2A PARTE",
            ],
        ),
        (
            "PARTE TERCEIRA",
            [
                "TERCEIRA PARTE",
                "PARTE III",
                "III PARTE",
                "3ª PARTE",
                "3A PARTE",
            ],
        ),
        (
            "PARTE QUARTA",
            [
                "QUARTA PARTE",
                "PARTE IV",
                "IV PARTE",
                "4ª PARTE",
                "4A PARTE",
            ],
        ),
    ]

    for source, targets in replacements:
        if source in upper:
            for target in targets:
                variants.add(
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
            for variant in variants
            if normalize(variant)
        },
        key=lambda value: (
            -len(value.split()),
            value,
        ),
    )


def ordered_coverage(
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


def find_title_matches(
    lines: list[str],
    title: str,
    *,
    start_index: int = 0,
    max_lines: int = 8,
) -> list[dict[str, Any]]:
    variants = canonical_variants(title)
    matches = []

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
                or len(actual_tokens) > 36
            ):
                continue

            for variant in variants:
                expected_tokens = (
                    variant.split()
                )
                exact = (
                    joined == variant
                    or variant in joined
                )
                sequence_coverage = (
                    ordered_coverage(
                        expected_tokens,
                        actual_tokens,
                    )
                )
                set_coverage = (
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

                accepted = (
                    exact
                    or (
                        sequence_coverage >= 0.9
                        and set_coverage >= 0.9
                        and ratio >= 0.7
                        and surplus <= 6
                    )
                )

                if not accepted:
                    continue

                score = (
                    (2.0 if exact else 0.0)
                    + sequence_coverage
                    + set_coverage
                    + ratio
                    - surplus * 0.04
                    - (size - 1) * 0.01
                )

                matches.append(
                    {
                        "start": start,
                        "end": start + size,
                        "line_count": size,
                        "method": (
                            "normalized-exact"
                            if exact
                            else (
                                "normalized-token-window"
                            )
                        ),
                        "score": round(
                            score,
                            6,
                        ),
                        "variant": variant,
                        "matched_lines": window,
                    }
                )

    unique = {}
    for match in matches:
        key = (
            match["start"],
            match["end"],
        )
        current = unique.get(key)
        if (
            current is None
            or match["score"]
            > current["score"]
        ):
            unique[key] = match

    return sorted(
        unique.values(),
        key=lambda item: (
            -item["score"],
            item["line_count"],
            item["start"],
        ),
    )


def contents_signals(
    text: str,
) -> dict[str, Any]:
    lines = lines_for(text)
    dotted = len(
        re.findall(
            r"\.{3,}",
            text,
        )
    )
    trailing_number_lines = sum(
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
    dense_entries = sum(
        1
        for line in lines
        if (
            word_count(line) >= 3
            and re.search(
                r"\s\d{1,4}\s*$",
                line,
            )
        )
    )
    score = (
        dotted
        + max(
            0,
            trailing_number_lines - 2,
        )
        + max(
            0,
            dense_entries - 2,
        )
        + explicit * 20
    )
    toc_like = (
        explicit > 0
        or dotted >= 2
        or dense_entries >= 5
        or trailing_number_lines >= 7
    )

    return {
        "toc_signal_count": score,
        "toc_like": toc_like,
        "dotted_leader_count": dotted,
        "trailing_number_line_count":
            trailing_number_lines,
        "dense_entry_count":
            dense_entries,
        "explicit_contents_heading_count":
            explicit,
    }


def page_contains_printed_hint(
    lines: list[str],
    printed_page: int,
) -> bool:
    target = str(printed_page)
    return any(
        normalize(line) == target
        for line in lines
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

    if (
        len(normalized.split()) <= 8
        and line.upper() == line
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
        sentence_end = (
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
            words >= 14
            or (
                words >= 8
                and sentence_end
                and uppercase_ratio < 0.75
            )
        )

        if is_prose:
            prose_lines.append(line)
        else:
            structural_lines.append(line)

    return {
        "prose_signal_count":
            len(prose_lines),
        "prose_word_count":
            sum(
                word_count(line)
                for line in prose_lines
            ),
        "structural_line_count":
            len(structural_lines),
        "visible_prose_presence": (
            "independent-prose"
            if prose_lines
            else "heading-only"
        ),
        "prose_lines": prose_lines,
        "structural_lines":
            structural_lines,
        "all_filtered_lines": filtered,
    }


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
                "contents":
                    contents_signals(text),
            }
        )

    return pages


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
    title_recovery = read_json(
        PATHS["title_recovery"]
    )
    application = read_json(
        PATHS["application"]
    )

    target = policy["target"]

    analysis_item = next(
        (
            item
            for item in analysis["items"]
            if item["analysis_id"]
            == target["analysis_id"]
        ),
        None,
    )
    inspection = next(
        (
            item
            for item in inspection_manifest[
                "items"
            ]
            if item["inspection_id"]
            == target["inspection_id"]
        ),
        None,
    )
    original = next(
        (
            item
            for item in original_decisions[
                "decisions"
            ]
            if item["decision_id"]
            == target[
                "original_decision_id"
            ]
        ),
        None,
    )
    baseline = next(
        (
            item
            for item in worklist["items"]
            if item["decision_id"]
            == target[
                "original_decision_id"
            ]
        ),
        None,
    )
    batch = next(
        (
            item
            for item in queue["batches"]
            if item["batch_id"]
            == target["batch_id"]
        ),
        None,
    )

    if (
        not analysis_item
        or not inspection
        or not original
        or not baseline
        or not batch
        or original["review_status"]
        != "unresolved"
        or original["selected_decision"]
        != "unresolved"
        or original["evidence"][
            "unresolved_reason"
        ]
        != "selected-page-has-contents-signals"
        or title_recovery["totals"][
            "resolved_count"
        ]
        != 0
    ):
        raise RuntimeError(
            "Non-contents recovery baseline "
            "differs from the approved gate."
        )

    work = next(
        item
        for item in source_manifest[
            "works"
        ]
        if item["book_id"]
        == target["book_id"]
    )
    pdf_path = resolve_pdf(
        downloads,
        work,
    )
    pages = extract_pages(
        pdf_path,
        work["pdf_page_count"],
    )

    current_title = (
        inspection["context"]["current"][
            "display_title"
        ]
    )
    successor_title = (
        inspection["context"][
            "successor"
        ]["display_title"]
    )

    if (
        current_title
        != target["display_title"]
        or successor_title
        != target["successor_title"]
    ):
        raise RuntimeError(
            "Canonical current or successor "
            "title differs."
        )

    minimum_page = policy[
        "matching_rules"
    ]["minimum_source_pdf_page"]
    max_distance = policy[
        "matching_rules"
    ][
        "maximum_successor_distance_pages"
    ]
    max_lines = policy[
        "matching_rules"
    ]["maximum_title_window_lines"]
    printed_hint = target[
        "successor_printed_page_hint"
    ]

    current_candidates = []
    successor_candidates = []

    for page_index, page in enumerate(
        pages
    ):
        page_number = page_index + 1

        if page_number < minimum_page:
            continue

        for match in find_title_matches(
            page["lines"],
            current_title,
            max_lines=max_lines,
        ):
            current_candidates.append(
                {
                    "page_index": page_index,
                    "page_number": page_number,
                    "match": match,
                    "contents":
                        page["contents"],
                    "printed_hint_present":
                        page_contains_printed_hint(
                            page["lines"],
                            printed_hint,
                        ),
                }
            )

        for match in find_title_matches(
            page["lines"],
            successor_title,
            max_lines=6,
        ):
            successor_candidates.append(
                {
                    "page_index": page_index,
                    "page_number": page_number,
                    "match": match,
                    "contents":
                        page["contents"],
                    "printed_hint_present":
                        page_contains_printed_hint(
                            page["lines"],
                            printed_hint,
                        ),
                }
            )

    pairs = []

    for current in current_candidates:
        if current["contents"]["toc_like"]:
            continue

        for successor in successor_candidates:
            if successor["contents"][
                "toc_like"
            ]:
                continue

            distance = (
                successor["page_index"]
                - current["page_index"]
            )

            if (
                distance < 0
                or distance > max_distance
            ):
                continue

            if (
                distance == 0
                and successor["match"][
                    "start"
                ]
                <= current["match"][
                    "end"
                ]
            ):
                continue

            hint_bonus = (
                0.5
                if (
                    current[
                        "printed_hint_present"
                    ]
                    or successor[
                        "printed_hint_present"
                    ]
                )
                else 0.0
            )
            score = (
                current["match"]["score"]
                + successor["match"][
                    "score"
                ]
                + hint_bonus
                - distance * 0.05
            )

            pairs.append(
                {
                    "current": current,
                    "successor":
                        successor,
                    "distance": distance,
                    "score": round(
                        score,
                        6,
                    ),
                }
            )

    pairs.sort(
        key=lambda item: (
            -item["score"],
            item["distance"],
            item["current"][
                "page_number"
            ],
        )
    )
    selected_pair = (
        pairs[0] if pairs else None
    )

    between_lines = []
    classification = None
    unresolved_reason = None

    if selected_pair is None:
        non_contents_current = [
            item
            for item in current_candidates
            if not item["contents"][
                "toc_like"
            ]
        ]

        if not non_contents_current:
            unresolved_reason = (
                "non-contents-current-"
                "occurrence-not-found"
            )
        elif not successor_candidates:
            unresolved_reason = (
                "successor-occurrence-"
                "not-found"
            )
        else:
            unresolved_reason = (
                "defensible-current-successor-"
                "pair-not-found"
            )

        recovery_status = (
            "still-unresolved"
        )
        selected_decision = (
            "unresolved"
        )
        confidence = "low"
        current = (
            sorted(
                non_contents_current,
                key=lambda item: (
                    -item["match"][
                        "score"
                    ],
                    item[
                        "page_number"
                    ],
                ),
            )[0]
            if non_contents_current
            else None
        )
        successor = None
        visible = "unclear"
    else:
        current = selected_pair[
            "current"
        ]
        successor = selected_pair[
            "successor"
        ]
        between_lines = collect_between(
            pages,
            current_page_index=current[
                "page_index"
            ],
            current_match=current[
                "match"
            ],
            successor_page_index=successor[
                "page_index"
            ],
            successor_match=successor[
                "match"
            ],
        )
        classification = classify_between(
            between_lines,
            book_title=work["title"],
            current_title=current_title,
            successor_title=successor_title,
        )
        visible = classification[
            "visible_prose_presence"
        ]
        candidate_decision = (
            "exclude-structural-heading"
            if visible == "heading-only"
            else "retain-intro-segment"
        )

        if candidate_decision in baseline[
            "decision_options"
        ]:
            recovery_status = "resolved"
            selected_decision = (
                candidate_decision
            )
            confidence = (
                "high"
                if (
                    current["match"][
                        "method"
                    ]
                    == "normalized-exact"
                    and successor[
                        "match"
                    ][
                        "method"
                    ]
                    == "normalized-exact"
                    and selected_pair[
                        "distance"
                    ]
                    <= 3
                )
                else "medium"
            )
        else:
            recovery_status = (
                "still-unresolved"
            )
            selected_decision = (
                "unresolved"
            )
            confidence = "low"
            unresolved_reason = (
                "derived-decision-not-allowed"
            )

    completed_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )
    recovery_id = hashlib.sha256(
        (
            policy["policy_version"]
            + "|"
            + target[
                "original_decision_id"
            ]
        ).encode("utf-8")
    ).hexdigest()[:24]

    evidence = {
        "source_file":
            work["source_file"],
        "source_sha256":
            work["source_sha256"],
        "original_contents_page":
            target[
                "original_source_pdf_page"
            ],
        "source_pdf_page_reviewed":
            (
                current["page_number"]
                if current
                else None
            ),
        "successor_source_pdf_page_reviewed":
            (
                successor["page_number"]
                if successor
                else None
            ),
        "printed_page_hint":
            printed_hint,
        "current_candidate_count":
            len(current_candidates),
        "successor_candidate_count":
            len(successor_candidates),
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
            successor is not None,
        "successor_match_method":
            (
                successor["match"][
                    "method"
                ]
                if successor
                else None
            ),
        "successor_distance_pages":
            (
                selected_pair[
                    "distance"
                ]
                if selected_pair
                else None
            ),
        "pages_inspected":
            len(pages)
            - minimum_page
            + 1,
        "toc_signal_count":
            (
                current["contents"][
                    "toc_signal_count"
                ]
                if current
                else 0
            ),
        "toc_like":
            (
                current["contents"][
                    "toc_like"
                ]
                if current
                else False
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

    public_recovery = {
        "recovery_id": recovery_id,
        "analysis_id":
            target["analysis_id"],
        "original_decision_id":
            target[
                "original_decision_id"
            ],
        "inspection_id":
            target["inspection_id"],
        "packet_id":
            target["packet_id"],
        "run_id": analysis["run_id"],
        "policy_version":
            policy["policy_version"],
        "book_id": target["book_id"],
        "book_slug":
            work["slug"],
        "segment_key":
            target["segment_key"],
        "segment_order":
            analysis_item[
                "segment_order"
            ],
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
            recovery_status == "resolved",
        "source_text_included":
            False,
        "source_excerpt_included":
            False,
        "boundary_approved": False,
        "database_change_applied":
            False,
        "content_approved": False,
        "content_loaded": False,
        "cutover_enabled": False,
    }

    resolved_count = int(
        recovery_status == "resolved"
    )
    still_unresolved_count = (
        1 - resolved_count
    )

    progress = copy.deepcopy(
        previous_progress
    )
    progress["status"] = (
        "non-contents-recovery-"
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
        "non_contents_recovered_count"
    ] = resolved_count
    progress["totals"][
        "non_contents_still_unresolved_count"
    ] = still_unresolved_count

    if resolved_count:
        packet = next(
            item
            for item in progress[
                "packets"
            ]
            if item["packet_id"]
            == target["packet_id"]
        )
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
            "non-contents-recovery-recorded-not-applied",
        "policy_version":
            policy["policy_version"],
        "run_id": analysis["run_id"],
        "resolution_lane":
            policy["resolution_lane"],
        "rights_status": "blocked",
        "contains_full_text": False,
        "contains_source_excerpt":
            False,
        "totals": {
            "target_item_count": 1,
            "resolved_count":
                resolved_count,
            "still_unresolved_count":
                still_unresolved_count,
            "exclude_structural_heading_count":
                int(
                    selected_decision
                    == "exclude-structural-heading"
                ),
            "retain_intro_segment_count":
                int(
                    selected_decision
                    == "retain-intro-segment"
                ),
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
        "source": {
            "book_id": work["book_id"],
            "book_slug": work["slug"],
            "source_file":
                work["source_file"],
            "source_sha256":
                work["source_sha256"],
            "pdf_page_count":
                len(pages),
        },
        "recovery":
            public_recovery,
        "recovery_boundary":
            policy[
                "recovery_boundary"
            ],
    }

    private = {
        "schema_version": 1,
        "status":
            "private-non-contents-recovery-evidence",
        "warning":
            "Gitignored private evidence. "
            "Do not commit or redistribute.",
        "completed_at": completed_at,
        "source": {
            "path": str(pdf_path),
            "sha256":
                work["source_sha256"],
            "pdf_page_count":
                len(pages),
        },
        "current_title":
            current_title,
        "successor_title":
            successor_title,
        "current_candidates": [
            {
                "source_pdf_page":
                    item["page_number"],
                "match": item["match"],
                "contents":
                    item["contents"],
                "printed_hint_present":
                    item[
                        "printed_hint_present"
                    ],
                "candidate_page_text":
                    pages[
                        item["page_index"]
                    ]["page_text"],
            }
            for item
            in current_candidates
        ],
        "successor_candidates": [
            {
                "source_pdf_page":
                    item["page_number"],
                "match": item["match"],
                "contents":
                    item["contents"],
                "printed_hint_present":
                    item[
                        "printed_hint_present"
                    ],
                "candidate_page_text":
                    pages[
                        item["page_index"]
                    ]["page_text"],
            }
            for item
            in successor_candidates
        ],
        "selected_pair": (
            {
                "current_source_pdf_page":
                    current["page_number"],
                "successor_source_pdf_page":
                    successor[
                        "page_number"
                    ],
                "distance":
                    selected_pair[
                        "distance"
                    ],
                "score":
                    selected_pair[
                        "score"
                    ],
                "between_lines":
                    between_lines,
                "classification":
                    classification,
            }
            if selected_pair
            else None
        ),
        "public_outcome": {
            "recovery_status":
                recovery_status,
            "selected_decision":
                selected_decision,
            "unresolved_reason":
                unresolved_reason,
        },
    }

    report_lines = [
        "# Non-Contents Occurrence Recovery",
        "",
        (
            "- Status: "
            "`non-contents-recovery-recorded-not-applied`"
        ),
        (
            f"- Policy version: "
            f"`{policy['policy_version']}`"
        ),
        (
            f"- Migration run ID: "
            f"`{analysis['run_id']}`"
        ),
        "- Target items: `1`",
        (
            f"- Resolved outcomes: "
            f"`{resolved_count}`"
        ),
        (
            f"- Still unresolved: "
            f"`{still_unresolved_count}`"
        ),
        (
            "- Exclude structural heading: "
            f"`{public['totals']['exclude_structural_heading_count']}`"
        ),
        (
            "- Retain intro segment: "
            f"`{public['totals']['retain_intro_segment_count']}`"
        ),
        "- Boundary approvals: `0`",
        "- Database changes: `0`",
        "- Source text committed: `false`",
        "- Cutover enabled: `false`",
        "",
        "## Recovery outcome",
        "",
        "| Work | Segment | Original contents page | Recovered page | Successor page | Outcome | Decision | Confidence |",
        "| --- | --- | ---: | ---: | ---: | --- | --- | --- |",
        (
            f"| {work['title']} | "
            f"{current_title} | "
            f"{target['original_source_pdf_page']} | "
            f"{evidence['source_pdf_page_reviewed'] if evidence['source_pdf_page_reviewed'] is not None else '—'} | "
            f"{evidence['successor_source_pdf_page_reviewed'] if evidence['successor_source_pdf_page_reviewed'] is not None else '—'} | "
            f"{recovery_status} | "
            f"{selected_decision} | "
            f"{confidence} |"
        ),
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
            "The canonical PDF was verified "
            "by SHA-256 and inspected locally."
        ),
        "",
        (
            "Extracted source text, candidate "
            "pages, matches, and structural "
            "intervals remain only in the "
            "Git-ignored private workspace."
        ),
        "",
        "## Application boundary",
        "",
        (
            "No boundary is approved or "
            "applied to staging."
        ),
        "",
    ]

    write_json(
        PATHS["recovery"],
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
        "Processed 1 non-contents "
        "occurrence recovery case."
    )
    print(
        f"Resolved outcomes: "
        f"{resolved_count}."
    )
    print(
        f"Still unresolved: "
        f"{still_unresolved_count}."
    )
    print(
        "Source text committed: 0."
    )
    print(
        "Database changes: 0."
    )


if __name__ == "__main__":
    main()
