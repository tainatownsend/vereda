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

PATHS = {
    "policy": ROOT
    / (
        "content/migration/"
        "reading-segment-source-review-"
        "container-intro-policy.json"
    ),
    "sources": ROOT
    / "content/sources/manifest.json",
    "inspection": ROOT
    / (
        "content/migration/"
        "reading-segment-source-inspection-"
        "manifest.json"
    ),
    "worklist": ROOT
    / (
        "content/migration/"
        "reading-segment-source-review-"
        "worklist.json"
    ),
    "register": ROOT
    / (
        "content/migration/"
        "reading-segment-source-review-"
        "packet-register.json"
    ),
    "pilot": ROOT
    / (
        "content/migration/"
        "reading-segment-source-review-"
        "pilot-decisions.json"
    ),
    "previous_progress": ROOT
    / (
        "content/migration/"
        "reading-segment-source-review-"
        "progress.json"
    ),
    "application": ROOT
    / (
        "content/migration/"
        "reading-segment-mechanical-"
        "application-evidence.json"
    ),
    "decisions": ROOT
    / (
        "content/migration/"
        "reading-segment-source-review-"
        "container-intro-decisions.json"
    ),
    "progress": ROOT
    / (
        "content/migration/"
        "reading-segment-source-review-"
        "progress.json"
    ),
    "report": ROOT
    / (
        "content/migration/reports/"
        "reading-segment-source-review-"
        "container-intro-summary.md"
    ),
    "private": ROOT
    / (
        ".vereda-private/source-review/"
        "pr-0029-container-intro/"
        "source-review-evidence.local.json"
    ),
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
    result = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(
            lambda: handle.read(
                1024 * 1024
            ),
            b"",
        ):
            result.update(chunk)
    return result.hexdigest()


def normalize(value: str) -> str:
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
    return re.sub(
        r"[^a-z0-9]+",
        " ",
        without_marks.lower(),
    ).strip()


def lines_for(text: str) -> list[str]:
    return [
        line.strip()
        for line in text.replace(
            "\r",
            "\n",
        ).split("\n")
        if line.strip()
    ]


def title_tokens(title: str) -> list[str]:
    ignored = {
        "a",
        "as",
        "da",
        "das",
        "de",
        "do",
        "dos",
        "e",
        "o",
        "os",
        "parte",
    }
    tokens = [
        token
        for token in normalize(
            title
        ).split()
        if token not in ignored
    ]
    return tokens or normalize(
        title
    ).split()


def title_match(
    lines: list[str],
    title: str,
    *,
    start_index: int = 0,
) -> dict[str, int] | None:
    normalized_title = normalize(title)
    tokens = title_tokens(title)

    for window_size in (1, 2, 3, 4):
        for index in range(
            start_index,
            len(lines),
        ):
            window = lines[
                index : index
                + window_size
            ]
            if not window:
                continue
            joined = normalize(
                " ".join(window)
            )
            if (
                normalized_title
                and normalized_title
                in joined
            ):
                return {
                    "start": index,
                    "end": index
                    + len(window),
                    "strength": (
                        0
                        if joined
                        == normalized_title
                        else 1
                    ),
                }
            if all(
                re.search(
                    rf"\b{re.escape(token)}\b",
                    joined,
                )
                for token in tokens
            ):
                return {
                    "start": index,
                    "end": index
                    + len(window),
                    "strength": 2,
                }
    return None


def page_has_title(
    text: str,
    title: str,
) -> bool:
    normalized_page = normalize(text)
    normalized_title = normalize(title)
    if (
        normalized_title
        and normalized_title
        in normalized_page
    ):
        return True
    return all(
        re.search(
            rf"\b{re.escape(token)}\b",
            normalized_page,
        )
        for token in title_tokens(title)
    )


def toc_signals(text: str) -> int:
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
        and len(
            re.findall(
                r"\b[\wÀ-ÿ'-]+\b",
                line,
            )
        )
        >= 2
    )
    explicit = sum(
        1
        for line in lines
        if normalize(line)
        in {
            "sumario",
            "indice",
        }
    )
    return (
        dotted
        + trailing_page
        + explicit * 20
    )


def prose_signals(
    lines: list[str],
) -> int:
    count = 0
    for line in lines:
        words = re.findall(
            r"\b[\wÀ-ÿ'-]+\b",
            line,
        )
        if (
            len(words) >= 10
            and re.search(
                r"[.!?;:]\s*$",
                line,
            )
        ):
            count += 1
        elif len(words) >= 16:
            count += 1
    return count


def structural_line_count(
    lines: list[str],
) -> int:
    return sum(
        1
        for line in lines
        if len(
            re.findall(
                r"\b[\wÀ-ÿ'-]+\b",
                line,
            )
        )
        <= 9
    )


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
        "Canonical PDF not found for "
        f"{work['title']}."
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
            f"{pdf_path.name}: PDF page "
            "count differs."
        )
    return [
        {
            "source_pdf_page":
                index + 1,
            "page_text":
                page.extract_text()
                or "",
            "lines":
                lines_for(
                    page.extract_text()
                    or ""
                ),
        }
        for index, page in enumerate(
            reader.pages
        )
    ]


def candidate_pages(
    pages: list[dict[str, Any]],
    title: str,
    expected_page: int | None,
) -> list[dict[str, Any]]:
    values = []
    for page in pages:
        if not page_has_title(
            page["page_text"],
            title,
        ):
            continue
        match = title_match(
            page["lines"],
            title,
        )
        values.append(
            {
                "source_pdf_page":
                    page[
                        "source_pdf_page"
                    ],
                "toc_signal_count":
                    toc_signals(
                        page["page_text"]
                    ),
                "title_match_strength":
                    (
                        match["strength"]
                        if match
                        else 3
                    ),
                "distance_hint":
                    (
                        abs(
                            page[
                                "source_pdf_page"
                            ]
                            - expected_page
                        )
                        if expected_page
                        is not None
                        else 10**9
                    ),
                "match": match,
                "page": page,
            }
        )
    return values


def select_candidate(
    candidates: list[
        dict[str, Any]
    ],
) -> dict[str, Any] | None:
    if not candidates:
        return None
    return sorted(
        candidates,
        key=lambda value: (
            0
            if value[
                "toc_signal_count"
            ]
            == 0
            else 1,
            value[
                "toc_signal_count"
            ],
            value[
                "title_match_strength"
            ],
            value["distance_hint"],
            -value[
                "source_pdf_page"
            ],
        ),
    )[0]


def inspect_between(
    pages: list[dict[str, Any]],
    selected: dict[str, Any],
    current_title: str,
    successor_title: str | None,
    maximum_pages: int,
) -> dict[str, Any]:
    current_page_index = (
        selected[
            "source_pdf_page"
        ]
        - 1
    )
    current_match = (
        selected["match"]
        or title_match(
            pages[
                current_page_index
            ]["lines"],
            current_title,
        )
    )
    if current_match is None:
        return {
            "successor_found": False,
            "successor_page": None,
            "between_lines": [],
            "pages_inspected": 1,
            "reason":
                "current-title-window-not-found",
        }

    if not successor_title:
        return {
            "successor_found": False,
            "successor_page": None,
            "between_lines": [],
            "pages_inspected": 1,
            "reason":
                "successor-title-unavailable",
        }

    collected: list[str] = []
    pages_inspected = 0

    for offset in range(
        maximum_pages + 1
    ):
        page_index = (
            current_page_index
            + offset
        )
        if page_index >= len(pages):
            break

        page = pages[page_index]
        pages_inspected += 1
        start = (
            current_match["end"]
            if offset == 0
            else 0
        )
        successor_match = title_match(
            page["lines"],
            successor_title,
            start_index=start,
        )

        if successor_match:
            collected.extend(
                page["lines"][
                    start :
                    successor_match[
                        "start"
                    ]
                ]
            )
            return {
                "successor_found":
                    True,
                "successor_page":
                    page[
                        "source_pdf_page"
                    ],
                "between_lines":
                    collected,
                "pages_inspected":
                    pages_inspected,
                "reason": None,
            }

        collected.extend(
            page["lines"][start:]
        )

    return {
        "successor_found": False,
        "successor_page": None,
        "between_lines": collected,
        "pages_inspected":
            pages_inspected,
        "reason":
            "successor-title-not-found",
    }


def reviewed_decision(
    *,
    item: dict[str, Any],
    policy: dict[str, Any],
    source: dict[str, Any],
    selected_page: int,
    successor_page: int,
    candidate_count: int,
    title_match_strength: int,
    toc_signal_count: int,
    prose_count: int,
    structural_count: int,
    pages_inspected: int,
    completed_at: str,
) -> dict[str, Any]:
    if prose_count == 0:
        selected_decision = (
            "exclude-structural-heading"
        )
        visible = "heading-only"
    else:
        selected_decision = (
            "retain-intro-segment"
        )
        visible = "independent-prose"

    if (
        selected_decision
        not in item["decision_options"]
    ):
        return unresolved_decision(
            item=item,
            policy=policy,
            source=source,
            selected_page=selected_page,
            candidate_count=candidate_count,
            title_match_strength=(
                title_match_strength
            ),
            toc_signal_count=(
                toc_signal_count
            ),
            prose_count=prose_count,
            structural_count=(
                structural_count
            ),
            pages_inspected=(
                pages_inspected
            ),
            completed_at=completed_at,
            reason=(
                "derived-decision-not-allowed"
            ),
        )

    confidence = (
        "high"
        if (
            toc_signal_count == 0
            and title_match_strength
            <= 1
            and pages_inspected <= 2
        )
        else "medium"
    )

    return {
        "decision_id":
            item["decision_id"],
        "inspection_id":
            item["inspection_id"],
        "packet_id":
            item["packet_id"],
        "run_id": item["run_id"],
        "policy_version":
            policy["policy_version"],
        "book_id": item["book_id"],
        "book_slug":
            item["book_slug"],
        "segment_key":
            item["segment_key"],
        "segment_order":
            item["segment_order"],
        "display_title":
            item["display_title"],
        "inspection_lane":
            item["inspection_lane"],
        "review_status": "reviewed",
        "selected_decision":
            selected_decision,
        "evidence": {
            "source_file":
                source["source_file"],
            "source_sha256":
                source[
                    "source_sha256"
                ],
            "source_pdf_page_reviewed":
                selected_page,
            "successor_source_pdf_page_reviewed":
                successor_page,
            "printed_page_reviewed":
                None,
            "visible_prose_presence":
                visible,
            "successor_anchor_type":
                "heading",
            "locator_type":
                "structural-heading",
            "locator_value":
                item["display_title"],
            "source_reference_only":
                True,
            "candidate_page_count":
                candidate_count,
            "title_match_strength":
                title_match_strength,
            "toc_signal_count":
                toc_signal_count,
            "prose_signal_count":
                prose_count,
            "structural_line_count":
                structural_count,
            "successor_title_found":
                True,
            "pages_inspected":
                pages_inspected,
        },
        "reviewer_confidence":
            confidence,
        "review_completed_at":
            completed_at,
        "source_text_included": False,
        "source_excerpt_included":
            False,
        "boundary_decision_recorded":
            True,
        "boundary_approved": False,
        "database_change_applied":
            False,
        "content_approved": False,
        "content_loaded": False,
        "cutover_enabled": False,
    }


def unresolved_decision(
    *,
    item: dict[str, Any],
    policy: dict[str, Any],
    source: dict[str, Any],
    selected_page: int,
    candidate_count: int,
    title_match_strength: int,
    toc_signal_count: int,
    prose_count: int,
    structural_count: int,
    pages_inspected: int,
    completed_at: str,
    reason: str,
) -> dict[str, Any]:
    return {
        "decision_id":
            item["decision_id"],
        "inspection_id":
            item["inspection_id"],
        "packet_id":
            item["packet_id"],
        "run_id": item["run_id"],
        "policy_version":
            policy["policy_version"],
        "book_id": item["book_id"],
        "book_slug":
            item["book_slug"],
        "segment_key":
            item["segment_key"],
        "segment_order":
            item["segment_order"],
        "display_title":
            item["display_title"],
        "inspection_lane":
            item["inspection_lane"],
        "review_status":
            "unresolved",
        "selected_decision":
            "unresolved",
        "evidence": {
            "source_file":
                source["source_file"],
            "source_sha256":
                source[
                    "source_sha256"
                ],
            "source_pdf_page_reviewed":
                selected_page,
            "successor_source_pdf_page_reviewed":
                None,
            "printed_page_reviewed":
                None,
            "visible_prose_presence":
                "unclear",
            "successor_anchor_type":
                "unclear",
            "locator_type":
                "structural-heading",
            "locator_value":
                item["display_title"],
            "source_reference_only":
                True,
            "candidate_page_count":
                candidate_count,
            "title_match_strength":
                title_match_strength,
            "toc_signal_count":
                toc_signal_count,
            "prose_signal_count":
                prose_count,
            "structural_line_count":
                structural_count,
            "successor_title_found":
                False,
            "pages_inspected":
                pages_inspected,
            "unresolved_reason":
                reason,
        },
        "reviewer_confidence":
            "low",
        "review_completed_at":
            completed_at,
        "source_text_included": False,
        "source_excerpt_included":
            False,
        "boundary_decision_recorded":
            True,
        "boundary_approved": False,
        "database_change_applied":
            False,
        "content_approved": False,
        "content_loaded": False,
        "cutover_enabled": False,
    }


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

    policy = read_json(
        PATHS["policy"]
    )
    source_manifest = read_json(
        PATHS["sources"]
    )
    inspection_manifest = read_json(
        PATHS["inspection"]
    )
    worklist = read_json(
        PATHS["worklist"]
    )
    register = read_json(
        PATHS["register"]
    )
    pilot = read_json(
        PATHS["pilot"]
    )
    previous_progress = read_json(
        PATHS["previous_progress"]
    )
    application = read_json(
        PATHS["application"]
    )

    target_packet_ids = set(
        policy[
            "target_packet_ids"
        ]
    )
    target_items = [
        item
        for item in worklist["items"]
        if item["packet_id"]
        in target_packet_ids
    ]

    if len(target_items) != 16:
        raise RuntimeError(
            "Expected 16 target items."
        )

    inspection_by_id = {
        item["inspection_id"]: item
        for item in inspection_manifest[
            "items"
        ]
    }
    works = {
        work["book_id"]: work
        for work in source_manifest[
            "works"
        ]
        if work["book_id"]
        in policy["source_book_ids"]
    }

    sources: dict[
        int,
        dict[str, Any],
    ] = {}
    private_sources = []

    for book_id, work in works.items():
        pdf_path = resolve_pdf(
            downloads,
            work,
        )
        pages = extract_pages(
            pdf_path,
            work[
                "pdf_page_count"
            ],
        )
        sources[book_id] = {
            "work": work,
            "pdf_path": pdf_path,
            "pages": pages,
        }
        private_sources.append(
            {
                "book_id": book_id,
                "title": work["title"],
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

    decisions = []
    private_items = []

    for item in target_items:
        source = sources[
            item["book_id"]
        ]
        work = source["work"]
        pages = source["pages"]
        inspection = inspection_by_id[
            item["inspection_id"]
        ]
        successor_title = (
            inspection.get(
                "context",
                {},
            )
            .get("successor", {})
            .get("display_title")
        )
        expected_page = (
            item.get(
                "source_reference",
                {},
            ).get(
                "successor_printed_page"
            )
        )

        candidates = candidate_pages(
            pages,
            item["display_title"],
            expected_page,
        )
        selected = select_candidate(
            candidates
        )

        fallback_page = (
            int(expected_page)
            if isinstance(
                expected_page,
                int,
            )
            and 1
            <= expected_page
            <= len(pages)
            else 1
        )

        if selected is None:
            decision = (
                unresolved_decision(
                    item=item,
                    policy=policy,
                    source=work,
                    selected_page=(
                        fallback_page
                    ),
                    candidate_count=0,
                    title_match_strength=3,
                    toc_signal_count=0,
                    prose_count=0,
                    structural_count=0,
                    pages_inspected=1,
                    completed_at=(
                        completed_at
                    ),
                    reason=(
                        "current-title-"
                        "candidate-not-found"
                    ),
                )
            )
            decisions.append(decision)
            private_items.append(
                {
                    "decision_id":
                        item[
                            "decision_id"
                        ],
                    "segment_key":
                        item[
                            "segment_key"
                        ],
                    "display_title":
                        item[
                            "display_title"
                        ],
                    "successor_title":
                        successor_title,
                    "classification":
                        "unresolved",
                    "reason":
                        "current-title-"
                        "candidate-not-found",
                    "fallback_page":
                        fallback_page,
                }
            )
            continue

        between = inspect_between(
            pages,
            selected,
            item["display_title"],
            successor_title,
            policy["page_selection"][
                "maximum_successor_search_pages"
            ],
        )
        between_lines = between[
            "between_lines"
        ]
        prose_count = prose_signals(
            between_lines
        )
        structural_count = (
            structural_line_count(
                between_lines
            )
        )
        current_page = selected[
            "source_pdf_page"
        ]

        if (
            selected[
                "toc_signal_count"
            ]
            != 0
            or not between[
                "successor_found"
            ]
        ):
            reason = (
                "selected-page-has-"
                "contents-signals"
                if selected[
                    "toc_signal_count"
                ]
                != 0
                else between["reason"]
            )
            decision = (
                unresolved_decision(
                    item=item,
                    policy=policy,
                    source=work,
                    selected_page=(
                        current_page
                    ),
                    candidate_count=(
                        len(candidates)
                    ),
                    title_match_strength=(
                        selected[
                            "title_match_strength"
                        ]
                    ),
                    toc_signal_count=(
                        selected[
                            "toc_signal_count"
                        ]
                    ),
                    prose_count=(
                        prose_count
                    ),
                    structural_count=(
                        structural_count
                    ),
                    pages_inspected=(
                        between[
                            "pages_inspected"
                        ]
                    ),
                    completed_at=(
                        completed_at
                    ),
                    reason=reason,
                )
            )
        else:
            decision = reviewed_decision(
                item=item,
                policy=policy,
                source=work,
                selected_page=(
                    current_page
                ),
                successor_page=(
                    between[
                        "successor_page"
                    ]
                ),
                candidate_count=(
                    len(candidates)
                ),
                title_match_strength=(
                    selected[
                        "title_match_strength"
                    ]
                ),
                toc_signal_count=(
                    selected[
                        "toc_signal_count"
                    ]
                ),
                prose_count=prose_count,
                structural_count=(
                    structural_count
                ),
                pages_inspected=(
                    between[
                        "pages_inspected"
                    ]
                ),
                completed_at=(
                    completed_at
                ),
            )

        decisions.append(decision)
        private_items.append(
            {
                "decision_id":
                    item["decision_id"],
                "inspection_id":
                    item[
                        "inspection_id"
                    ],
                "segment_key":
                    item["segment_key"],
                "display_title":
                    item["display_title"],
                "successor_title":
                    successor_title,
                "source_pdf_page":
                    current_page,
                "selected_page_text":
                    selected["page"][
                        "page_text"
                    ],
                "between_lines":
                    between_lines,
                "candidate_pages": [
                    {
                        "source_pdf_page":
                            candidate[
                                "source_pdf_page"
                            ],
                        "toc_signal_count":
                            candidate[
                                "toc_signal_count"
                            ],
                        "title_match_strength":
                            candidate[
                                "title_match_strength"
                            ],
                        "distance_hint":
                            candidate[
                                "distance_hint"
                            ],
                        "page_text":
                            candidate[
                                "page"
                            ][
                                "page_text"
                            ],
                    }
                    for candidate in candidates
                ],
                "public_outcome": {
                    "review_status":
                        decision[
                            "review_status"
                        ],
                    "selected_decision":
                        decision[
                            "selected_decision"
                        ],
                },
            }
        )

    decisions.sort(
        key=lambda decision: (
            decision["book_id"],
            decision["segment_order"],
            decision["segment_key"],
        )
    )

    reviewed_count = sum(
        decision["review_status"]
        == "reviewed"
        for decision in decisions
    )
    unresolved_count = sum(
        decision["review_status"]
        == "unresolved"
        for decision in decisions
    )
    exclude_count = sum(
        decision[
            "selected_decision"
        ]
        == "exclude-structural-heading"
        for decision in decisions
    )
    retain_count = sum(
        decision[
            "selected_decision"
        ]
        == "retain-intro-segment"
        for decision in decisions
    )

    if (
        reviewed_count
        + unresolved_count
        != 16
    ):
        raise RuntimeError(
            "Every target item must receive "
            "a reviewed or unresolved outcome."
        )

    packet_results = []
    for packet_id in policy[
        "target_packet_ids"
    ]:
        packet = next(
            packet
            for packet in register[
                "packets"
            ]
            if packet[
                "packet_id"
            ]
            == packet_id
        )
        packet_decisions = [
            decision
            for decision in decisions
            if decision["packet_id"]
            == packet_id
        ]
        packet_results.append(
            {
                "packet_id":
                    packet_id,
                "book_id":
                    packet["book_id"],
                "item_count":
                    packet[
                        "item_count"
                    ],
                "reviewed_count":
                    sum(
                        item[
                            "review_status"
                        ]
                        == "reviewed"
                        for item in (
                            packet_decisions
                        )
                    ),
                "unresolved_count":
                    sum(
                        item[
                            "review_status"
                        ]
                        == "unresolved"
                        for item in (
                            packet_decisions
                        )
                    ),
                "pending_count": 0,
                "status":
                    (
                        "reviewed-not-applied"
                        if all(
                            item[
                                "review_status"
                            ]
                            == "reviewed"
                            for item in (
                                packet_decisions
                            )
                        )
                        else (
                            "review-completed-"
                            "with-unresolved"
                        )
                    ),
            }
        )

    public_decisions = {
        "schema_version": 1,
        "status":
            "container-intro-review-recorded-not-applied",
        "policy_version":
            policy["policy_version"],
        "run_id":
            worklist["run_id"],
        "rights_status": "blocked",
        "contains_full_text": False,
        "contains_source_excerpt":
            False,
        "totals": {
            "packet_count": 3,
            "item_count": 16,
            "reviewed_count":
                reviewed_count,
            "unresolved_count":
                unresolved_count,
            "exclude_structural_heading_count":
                exclude_count,
            "retain_intro_segment_count":
                retain_count,
            "boundary_approved_count":
                0,
            "database_change_count":
                0,
        },
        "sources": [
            {
                "book_id":
                    source[
                        "work"
                    ][
                        "book_id"
                    ],
                "book_slug":
                    source[
                        "work"
                    ][
                        "slug"
                    ],
                "source_file":
                    source[
                        "work"
                    ][
                        "source_file"
                    ],
                "source_sha256":
                    source[
                        "work"
                    ][
                        "source_sha256"
                    ],
                "pdf_page_count":
                    len(
                        source["pages"]
                    ),
            }
            for source in sources.values()
        ],
        "packet_results":
            packet_results,
        "decisions": decisions,
        "review_boundary":
            policy["review_boundary"],
    }

    target_result_by_id = {
        item["packet_id"]: item
        for item in packet_results
    }
    updated_packets = []

    for packet in previous_progress[
        "packets"
    ]:
        if (
            packet["packet_id"]
            in target_result_by_id
        ):
            result = (
                target_result_by_id[
                    packet[
                        "packet_id"
                    ]
                ]
            )
            updated_packets.append(
                {
                    **packet,
                    "pending_count": 0,
                    "in_review_count": 0,
                    "reviewed_count":
                        result[
                            "reviewed_count"
                        ],
                    "unresolved_count":
                        result[
                            "unresolved_count"
                        ],
                    "status":
                        result["status"],
                }
            )
        else:
            updated_packets.append(
                packet
            )

    cumulative_reviewed = (
        pilot["totals"][
            "reviewed_count"
        ]
        + reviewed_count
    )
    cumulative_unresolved = (
        unresolved_count
    )

    progress = {
        "schema_version": 1,
        "status":
            "container-intro-review-completed-not-applied",
        "policy_version":
            policy["policy_version"],
        "run_id":
            worklist["run_id"],
        "totals": {
            "item_count": 144,
            "packet_count": 16,
            "pending_count": 126,
            "in_review_count": 0,
            "reviewed_count":
                cumulative_reviewed,
            "unresolved_count":
                cumulative_unresolved,
            "public_decision_count":
                18,
            "completed_packet_count":
                4,
            "pending_packet_count":
                12,
            "completed_mechanical_count":
                application[
                    "totals"
                ][
                    "target_content_review_count"
                ],
            "remaining_boundary_review_count":
                application[
                    "totals"
                ][
                    "unaffected_boundary_review_count"
                ],
            "database_change_count":
                0,
        },
        "packets": updated_packets,
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
            "private-container-intro-review-evidence",
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

    source_titles = {
        work["book_id"]:
            work["title"]
        for work in source_manifest[
            "works"
        ]
    }
    report_lines = [
        "# Remaining Container-Intro Source Review",
        "",
        (
            "- Status: "
            "`container-intro-review-recorded-not-applied`"
        ),
        (
            f"- Policy version: "
            f"`{policy['policy_version']}`"
        ),
        (
            f"- Migration run ID: "
            f"`{worklist['run_id']}`"
        ),
        "- Target packets: `3`",
        "- Target items: `16`",
        (
            f"- Reviewed outcomes: "
            f"`{reviewed_count}`"
        ),
        (
            f"- Unresolved outcomes: "
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
        "## Packet results",
        "",
        "| Packet | Work | Items | Reviewed | Unresolved | Status |",
        "| --- | --- | ---: | ---: | ---: | --- |",
    ]

    for result in packet_results:
        report_lines.append(
            "| "
            + result["packet_id"]
            + " | "
            + source_titles[
                result["book_id"]
            ]
            + " | "
            + str(
                result["item_count"]
            )
            + " | "
            + str(
                result[
                    "reviewed_count"
                ]
            )
            + " | "
            + str(
                result[
                    "unresolved_count"
                ]
            )
            + " | "
            + result["status"]
            + " |"
        )

    report_lines.extend(
        [
            "",
            "## Cumulative review progress",
            "",
            (
                f"- Reviewed items: "
                f"`{cumulative_reviewed}`"
            ),
            (
                f"- Unresolved items: "
                f"`{cumulative_unresolved}`"
            ),
            "- Pending items: `126`",
            "- Completed packets: `4`",
            "- Pending packets: `12`",
            "",
            "## Evidence boundary",
            "",
            (
                "The three canonical PDFs were "
                "verified by SHA-256 and inspected "
                "locally."
            ),
            "",
            (
                "Only page references, structural "
                "signals, decision enums, confidence, "
                "and source checksums were written "
                "to public artifacts."
            ),
            "",
            (
                "Extracted page text remains only in "
                "the Git-ignored private workspace."
            ),
            "",
            "## Application boundary",
            "",
            (
                "The decisions are recorded but not "
                "approved or applied to staging."
            ),
            "",
            (
                "The 166 content-review rows and 646 "
                "boundary-review rows remain unchanged."
            ),
            "",
        ]
    )

    write_json(
        PATHS["decisions"],
        public_decisions,
    )
    write_json(
        PATHS["progress"],
        progress,
    )
    write_json(
        PATHS["private"],
        private_evidence,
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

    print(
        "Reviewed 16 remaining "
        "container-intro-only cases."
    )
    print(
        f"Reviewed outcomes: "
        f"{reviewed_count}."
    )
    print(
        f"Unresolved outcomes: "
        f"{unresolved_count}."
    )
    print(
        "Pending source-review items: 126."
    )
    print(
        "Source text committed: 0."
    )
    print(
        "Database changes: 0."
    )


if __name__ == "__main__":
    main()
