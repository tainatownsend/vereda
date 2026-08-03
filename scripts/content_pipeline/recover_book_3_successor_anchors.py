#!/usr/bin/env python3

from __future__ import annotations

import argparse
import copy
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from recover_non_contents_occurrence import (
    classify_between,
    collect_between,
    extract_pages,
    find_title_matches,
    read_json,
    resolve_pdf,
    write_json,
)

ROOT = Path.cwd()

PATHS = {
    "policy": ROOT
    / "content/migration/reading-segment-book-3-successor-anchor-recovery-policy.json",
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
    "non_contents_recovery": ROOT
    / "content/migration/reading-segment-non-contents-recovery-decision.json",
    "application": ROOT
    / "content/migration/reading-segment-mechanical-application-evidence.json",
    "recovery": ROOT
    / "content/migration/reading-segment-book-3-successor-anchor-recovery-decisions.json",
    "report": ROOT
    / "content/migration/reports/reading-segment-book-3-successor-anchor-recovery-summary.md",
    "private": ROOT
    / ".vereda-private/source-review/pr-0033-book-3-successor-anchors/source-recovery-evidence.local.json",
}


def select_current_candidates(
    pages: list[dict[str, Any]],
    title: str,
    original_page: int,
    radius: int,
    max_lines: int,
) -> list[dict[str, Any]]:
    candidates = []

    for page_number in range(
        max(1, original_page - radius),
        min(
            len(pages),
            original_page + radius,
        )
        + 1,
    ):
        page = pages[page_number - 1]

        if page["contents"]["toc_like"]:
            continue

        for match in find_title_matches(
            page["lines"],
            title,
            max_lines=max_lines,
        ):
            candidates.append(
                {
                    "page_index": page_number - 1,
                    "page_number": page_number,
                    "match": match,
                    "contents": page["contents"],
                    "distance_from_original":
                        abs(page_number - original_page),
                }
            )

    candidates.sort(
        key=lambda item: (
            item["distance_from_original"],
            -item["match"]["score"],
            item["match"]["line_count"],
            item["match"]["start"],
        )
    )
    return candidates


def build_pairs(
    pages: list[dict[str, Any]],
    current_candidates: list[dict[str, Any]],
    successor_title: str,
    maximum_search_pages: int,
    maximum_successor_lines: int,
) -> list[dict[str, Any]]:
    pairs = []

    for current in current_candidates:
        for offset in range(
            maximum_search_pages + 1
        ):
            page_index = (
                current["page_index"]
                + offset
            )

            if page_index >= len(pages):
                break

            page = pages[page_index]

            if page["contents"]["toc_like"]:
                continue

            start_index = (
                current["match"]["end"]
                if offset == 0
                else 0
            )

            for successor_match in find_title_matches(
                page["lines"],
                successor_title,
                start_index=start_index,
                max_lines=maximum_successor_lines,
            ):
                pair_score = (
                    current["match"]["score"]
                    + successor_match["score"]
                    - offset * 0.03
                    - current[
                        "distance_from_original"
                    ]
                    * 0.05
                )
                pairs.append(
                    {
                        "current": current,
                        "successor": {
                            "page_index":
                                page_index,
                            "page_number":
                                page_index + 1,
                            "match":
                                successor_match,
                            "contents":
                                page["contents"],
                        },
                        "distance_pages":
                            offset,
                        "score":
                            round(
                                pair_score,
                                6,
                            ),
                    }
                )

    pairs.sort(
        key=lambda item: (
            -item["score"],
            item["distance_pages"],
            item["current"][
                "distance_from_original"
            ],
            item["successor"][
                "page_number"
            ],
        )
    )
    return pairs


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
    non_contents_recovery = read_json(
        PATHS["non_contents_recovery"]
    )
    application = read_json(
        PATHS["application"]
    )

    batch = next(
        item
        for item in queue["batches"]
        if item["batch_id"]
        == policy["target_batch"][
            "batch_id"
        ]
    )
    target_decision_ids = set(
        policy["target_batch"][
            "original_decision_ids"
        ]
    )
    target_items = [
        item
        for item in analysis["items"]
        if item["decision_id"]
        in target_decision_ids
    ]

    if (
        batch["item_count"] != 3
        or len(target_items) != 3
        or title_recovery["totals"][
            "resolved_count"
        ]
        != 0
        or non_contents_recovery[
            "totals"
        ]["resolved_count"]
        != 0
    ):
        raise RuntimeError(
            "Book 3 successor-anchor "
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

    inspection_by_id = {
        item["inspection_id"]: item
        for item in inspection_manifest[
            "items"
        ]
    }
    original_by_id = {
        item["decision_id"]: item
        for item in original_decisions[
            "decisions"
        ]
    }
    worklist_by_id = {
        item["decision_id"]: item
        for item in worklist["items"]
    }
    expected_by_segment = {
        item["segment_key"]: item
        for item in policy[
            "expected_pairs"
        ]
    }

    completed_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )

    recoveries = []
    private_items = []

    for analysis_item in sorted(
        target_items,
        key=lambda item: (
            item["segment_order"],
            item["segment_key"],
        ),
    ):
        original = original_by_id[
            analysis_item["decision_id"]
        ]
        inspection = inspection_by_id[
            analysis_item["inspection_id"]
        ]
        baseline = worklist_by_id[
            analysis_item["decision_id"]
        ]
        expected = expected_by_segment[
            analysis_item["segment_key"]
        ]

        current_title = (
            inspection["context"][
                "current"
            ]["display_title"]
        )
        successor_title = (
            inspection["context"][
                "successor"
            ]["display_title"]
        )
        original_page = (
            analysis_item[
                "evidence_snapshot"
            ][
                "source_pdf_page_reviewed"
            ]
        )

        if (
            original["review_status"]
            != "unresolved"
            or original[
                "selected_decision"
            ]
            != "unresolved"
            or original["evidence"][
                "unresolved_reason"
            ]
            != "successor-title-not-found"
            or current_title
            != expected["display_title"]
            or successor_title
            != expected[
                "successor_title"
            ]
            or original_page
            != expected[
                "original_source_pdf_page"
            ]
        ):
            raise RuntimeError(
                f"{analysis_item['segment_key']}: "
                "canonical recovery identity "
                "differs."
            )

        current_candidates = (
            select_current_candidates(
                pages,
                current_title,
                original_page,
                policy["matching_rules"][
                    "current_page_radius"
                ],
                policy["matching_rules"][
                    "maximum_current_title_window_lines"
                ],
            )
        )
        pairs = build_pairs(
            pages,
            current_candidates,
            successor_title,
            policy["matching_rules"][
                "maximum_successor_search_pages"
            ],
            policy["matching_rules"][
                "maximum_successor_title_window_lines"
            ],
        )

        selected_pair = (
            pairs[0] if pairs else None
        )
        ambiguous = False

        if (
            len(pairs) > 1
            and selected_pair is not None
        ):
            second = pairs[1]
            ambiguous = (
                abs(
                    selected_pair["score"]
                    - second["score"]
                )
                < 0.05
                and (
                    selected_pair[
                        "successor"
                    ]["page_number"]
                    != second["successor"][
                        "page_number"
                    ]
                    or selected_pair[
                        "current"
                    ]["page_number"]
                    != second["current"][
                        "page_number"
                    ]
                )
            )

        classification = None
        between_lines = []
        unresolved_reason = None

        if not current_candidates:
            recovery_status = (
                "still-unresolved"
            )
            selected_decision = (
                "unresolved"
            )
            confidence = "low"
            unresolved_reason = (
                "current-title-not-confirmed"
            )
            current = None
            successor = None
            visible = "unclear"
        elif selected_pair is None:
            recovery_status = (
                "still-unresolved"
            )
            selected_decision = (
                "unresolved"
            )
            confidence = "low"
            unresolved_reason = (
                "successor-anchor-not-found-"
                "within-expanded-window"
            )
            current = current_candidates[0]
            successor = None
            visible = "unclear"
        elif ambiguous:
            recovery_status = (
                "still-unresolved"
            )
            selected_decision = (
                "unresolved"
            )
            confidence = "low"
            unresolved_reason = (
                "successor-anchor-pair-"
                "ambiguous"
            )
            current = selected_pair[
                "current"
            ]
            successor = selected_pair[
                "successor"
            ]
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
            classification = (
                classify_between(
                    between_lines,
                    book_title=work["title"],
                    current_title=current_title,
                    successor_title=(
                        successor_title
                    ),
                )
            )
            visible = classification[
                "visible_prose_presence"
            ]
            candidate_decision = (
                "exclude-structural-heading"
                if visible
                == "heading-only"
                else "retain-intro-segment"
            )

            if (
                candidate_decision
                in baseline[
                    "decision_options"
                ]
            ):
                recovery_status = (
                    "resolved"
                )
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
                            "distance_pages"
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
                    "derived-decision-"
                    "not-allowed"
                )

        recovery_id = hashlib.sha256(
            (
                policy[
                    "policy_version"
                ]
                + "|"
                + analysis_item[
                    "decision_id"
                ]
            ).encode("utf-8")
        ).hexdigest()[:24]

        evidence = {
            "source_file":
                work["source_file"],
            "source_sha256":
                work["source_sha256"],
            "original_source_pdf_page":
                original_page,
            "source_pdf_page_reviewed":
                (
                    current["page_number"]
                    if current
                    else None
                ),
            "successor_source_pdf_page_reviewed":
                (
                    successor[
                        "page_number"
                    ]
                    if successor
                    else None
                ),
            "current_candidate_count":
                len(current_candidates),
            "successor_pair_candidate_count":
                len(pairs),
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
            "successor_match_score":
                (
                    successor["match"][
                        "score"
                    ]
                    if successor
                    else None
                ),
            "successor_title_window_line_count":
                (
                    successor["match"][
                        "line_count"
                    ]
                    if successor
                    else 0
                ),
            "successor_distance_pages":
                (
                    selected_pair[
                        "distance_pages"
                    ]
                    if selected_pair
                    else None
                ),
            "pair_score":
                (
                    selected_pair[
                        "score"
                    ]
                    if selected_pair
                    else None
                ),
            "pair_ambiguous":
                ambiguous,
            "pages_inspected":
                policy[
                    "matching_rules"
                ][
                    "maximum_successor_search_pages"
                ]
                + 1,
            "toc_signal_count":
                (
                    current[
                        "contents"
                    ][
                        "toc_signal_count"
                    ]
                    if current
                    else 0
                ),
            "toc_like":
                (
                    current[
                        "contents"
                    ]["toc_like"]
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

        public_item = {
            "recovery_id":
                recovery_id,
            "analysis_id":
                analysis_item[
                    "analysis_id"
                ],
            "original_decision_id":
                analysis_item[
                    "decision_id"
                ],
            "inspection_id":
                analysis_item[
                    "inspection_id"
                ],
            "packet_id":
                analysis_item[
                    "packet_id"
                ],
            "run_id":
                analysis["run_id"],
            "policy_version":
                policy[
                    "policy_version"
                ],
            "book_id": 3,
            "book_slug":
                work["slug"],
            "segment_key":
                analysis_item[
                    "segment_key"
                ],
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
        recoveries.append(
            public_item
        )

        private_items.append(
            {
                "recovery_id":
                    recovery_id,
                "display_title":
                    current_title,
                "successor_title":
                    successor_title,
                "current_candidates": [
                    {
                        "source_pdf_page":
                            item[
                                "page_number"
                            ],
                        "match":
                            item["match"],
                        "contents":
                            item[
                                "contents"
                            ],
                        "candidate_page_text":
                            pages[
                                item[
                                    "page_index"
                                ]
                            ]["page_text"],
                    }
                    for item
                    in current_candidates
                ],
                "pair_candidates": [
                    {
                        "current_source_pdf_page":
                            item[
                                "current"
                            ]["page_number"],
                        "successor_source_pdf_page":
                            item[
                                "successor"
                            ]["page_number"],
                        "distance_pages":
                            item[
                                "distance_pages"
                            ],
                        "score":
                            item["score"],
                        "current_match":
                            item[
                                "current"
                            ]["match"],
                        "successor_match":
                            item[
                                "successor"
                            ]["match"],
                    }
                    for item in pairs
                ],
                "selected_pair": (
                    {
                        "current_source_pdf_page":
                            current[
                                "page_number"
                            ],
                        "successor_source_pdf_page":
                            successor[
                                "page_number"
                            ],
                        "between_lines":
                            between_lines,
                        "classification":
                            classification,
                    }
                    if selected_pair
                    and current
                    and successor
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
        )

    resolved_count = sum(
        item["recovery_status"]
        == "resolved"
        for item in recoveries
    )
    still_unresolved_count = (
        len(recoveries)
        - resolved_count
    )
    exclude_count = sum(
        item["selected_decision"]
        == "exclude-structural-heading"
        for item in recoveries
    )
    retain_count = sum(
        item["selected_decision"]
        == "retain-intro-segment"
        for item in recoveries
    )

    progress = copy.deepcopy(
        previous_progress
    )
    progress["status"] = (
        "book-3-successor-anchor-"
        "recovery-completed-not-applied"
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
        "book_3_successor_anchor_recovered_count"
    ] = resolved_count
    progress["totals"][
        "book_3_successor_anchor_still_unresolved_count"
    ] = still_unresolved_count

    packet = next(
        item
        for item in progress[
            "packets"
        ]
        if item["packet_id"]
        == "container-intro-only-book-3-packet-01"
    )
    packet["reviewed_count"] += (
        resolved_count
    )
    packet["unresolved_count"] -= (
        resolved_count
    )
    packet["status"] = (
        "reviewed-not-applied"
        if packet["unresolved_count"]
        == 0
        else (
            "review-completed-"
            "with-unresolved"
        )
    )

    public = {
        "schema_version": 1,
        "status":
            "book-3-successor-anchor-recovery-recorded-not-applied",
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
                still_unresolved_count,
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
        "recoveries":
            recoveries,
        "recovery_boundary":
            policy[
                "recovery_boundary"
            ],
    }

    private = {
        "schema_version": 1,
        "status":
            "private-book-3-successor-anchor-recovery-evidence",
        "warning":
            "Gitignored private evidence. "
            "Do not commit or redistribute.",
        "completed_at":
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
        "# Book 3 Successor-Anchor Recovery",
        "",
        (
            "- Status: "
            "`book-3-successor-anchor-recovery-recorded-not-applied`"
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
            f"`{still_unresolved_count}`"
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
        "| Segment | Current page | Successor | Successor page | Outcome | Decision | Confidence |",
        "| --- | ---: | --- | ---: | --- | --- | --- |",
    ]

    for item in recoveries:
        evidence = item["evidence"]
        report_lines.append(
            "| "
            + item["display_title"]
            + " | "
            + (
                str(
                    evidence[
                        "source_pdf_page_reviewed"
                    ]
                )
                if evidence[
                    "source_pdf_page_reviewed"
                ]
                is not None
                else "—"
            )
            + " | "
            + item[
                "successor_title"
            ]
            + " | "
            + (
                str(
                    evidence[
                        "successor_source_pdf_page_reviewed"
                    ]
                )
                if evidence[
                    "successor_source_pdf_page_reviewed"
                ]
                is not None
                else "—"
            )
            + " | "
            + item[
                "recovery_status"
            ]
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
    )

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
        "Processed 3 Book 3 "
        "successor-anchor recovery cases."
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
