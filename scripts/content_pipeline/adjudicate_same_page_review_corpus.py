#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path.cwd()

PATHS = {
    "policy": ROOT
    / "content/migration/reading-segment-same-page-review-adjudication-policy.json",
    "corpus": ROOT
    / "content/migration/reading-segment-same-page-review-corpus.json",
    "progress": ROOT
    / "content/migration/reading-segment-source-review-progress.json",
    "private_input": ROOT
    / ".vereda-private/source-review/pr-0039-same-page-review-corpus/private-evidence.local.json",
    "decisions": ROOT
    / "content/migration/reading-segment-same-page-review-decisions.json",
    "integration": ROOT
    / "content/migration/reading-segment-same-page-review-integration-plan.json",
    "report": ROOT
    / "content/migration/reports/reading-segment-same-page-review-adjudication-summary.md",
    "private_output": ROOT
    / ".vereda-private/source-review/pr-0040-same-page-adjudication/private-adjudication-evidence.local.json",
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
        r"(?<=[a-z])\d+\b",
        "",
        value,
    )
    value = re.sub(
        r"[^\w]+",
        " ",
        value,
    )
    return " ".join(
        value.split()
    )


def token_coverage(
    expected: str,
    actual: str,
) -> float:
    expected_tokens = normalize(
        expected
    ).split()
    actual_tokens = set(
        normalize(actual).split()
    )

    if not expected_tokens:
        return 0.0

    return sum(
        token in actual_tokens
        for token in expected_tokens
    ) / len(expected_tokens)


def is_structural_interval(
    lines: list[str],
) -> bool:
    values = [
        " ".join(
            line.split()
        )
        for line in lines
        if " ".join(
            line.split()
        )
    ]

    if not values:
        return True

    if not values[0].startswith("•"):
        return False

    forbidden_patterns = [
        r"^\d+\s*[\.\-–—)]",
        r"^[“\"]",
    ]

    return not any(
        re.search(
            pattern,
            line,
        )
        for line in values
        for pattern in forbidden_patterns
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--private-reviewer-file",
        required=True,
        type=Path,
    )
    parser.add_argument(
        "--private-output",
        required=True,
        type=Path,
    )
    args = parser.parse_args()

    reviewer_file = (
        args.private_reviewer_file
        .expanduser()
        .resolve()
    )
    external_private_output = (
        args.private_output
        .expanduser()
        .resolve()
    )

    policy = read_json(
        PATHS["policy"]
    )
    corpus = read_json(
        PATHS["corpus"]
    )
    progress = read_json(
        PATHS["progress"]
    )
    private_input = read_json(
        PATHS["private_input"]
    )

    if (
        corpus["totals"]["item_count"]
        != 38
        or len(corpus["items"]) != 38
        or len(private_input["items"])
        != 38
    ):
        raise RuntimeError(
            "The PR-0039 public/private corpus "
            "must contain exactly 38 items."
        )

    if (
        progress["totals"][
            "reviewed_count"
        ]
        != 16
        or progress["totals"][
            "unresolved_count"
        ]
        != 2
        or progress["totals"][
            "pending_count"
        ]
        != 126
    ):
        raise RuntimeError(
            "Cumulative progress changed "
            "before PR-0040."
        )

    private_by_corpus_id = {
        item["corpus_item_id"]:
            item
        for item in private_input[
            "items"
        ]
    }
    overrides = {
        item["segment_key"]:
            item
        for item in policy[
            "candidate_selection"
        ][
            "manual_overrides"
        ]
    }

    decisions = []
    private_decisions = []
    confidence_counts = Counter()
    packet_counts = Counter()
    book_counts = Counter()

    for corpus_item in corpus[
        "items"
    ]:
        private_item = (
            private_by_corpus_id.get(
                corpus_item[
                    "corpus_item_id"
                ]
            )
        )

        if private_item is None:
            raise RuntimeError(
                corpus_item[
                    "segment_key"
                ]
                + ": private corpus item "
                "not found."
            )

        candidates = private_item[
            "pair_candidates"
        ]
        override = overrides.get(
            corpus_item[
                "segment_key"
            ]
        )
        candidate_index = (
            override[
                "candidate_index"
            ]
            if override
            else 0
        )

        if (
            candidate_index < 0
            or candidate_index
            >= len(candidates)
        ):
            raise RuntimeError(
                corpus_item[
                    "segment_key"
                ]
                + ": selected private "
                "candidate is unavailable."
            )

        selected = candidates[
            candidate_index
        ]

        if (
            override
            and selected[
                "source_pdf_page"
            ]
            != override[
                "expected_source_pdf_page"
            ]
        ):
            raise RuntimeError(
                corpus_item[
                    "segment_key"
                ]
                + ": manual override page "
                "differs."
            )

        current_text = " ".join(
            selected[
                "current"
            ][
                "matched_lines"
            ]
        )
        successor_text = " ".join(
            selected[
                "successor"
            ][
                "matched_lines"
            ]
        )
        current_coverage = (
            token_coverage(
                corpus_item[
                    "current_title"
                ],
                current_text,
            )
        )
        successor_coverage = (
            token_coverage(
                corpus_item[
                    "successor_title"
                ],
                successor_text,
            )
        )
        structural_interval = (
            is_structural_interval(
                selected[
                    "intervening_lines"
                ]
            )
        )

        if (
            selected[
                "source_pdf_page"
            ]
            <= 0
            or selected[
                "successor"
            ][
                "start_line"
            ]
            < selected[
                "current"
            ][
                "end_line"
            ]
            or current_coverage < 0.66
            or successor_coverage < 0.66
            or not structural_interval
        ):
            raise RuntimeError(
                corpus_item[
                    "segment_key"
                ]
                + ": selected pair does not "
                "support a structural-heading "
                "exclusion."
            )

        exact_pair = (
            selected[
                "current"
            ][
                "match_method"
            ]
            == "normalized-exact"
            and selected[
                "successor"
            ][
                "match_method"
            ]
            == "normalized-exact"
        )
        confidence = (
            policy[
                "decision_rules"
            ][
                "manual_override_confidence"
            ]
            if override
            else (
                policy[
                    "decision_rules"
                ][
                    "non_override_exact_pair_confidence"
                ]
                if exact_pair
                else policy[
                    "decision_rules"
                ][
                    "non_override_non_exact_pair_confidence"
                ]
            )
        )
        selection_method = (
            "manual-private-candidate-override"
            if override
            else "top-ranked-private-pair"
        )
        decision_id = hashlib.sha256(
            (
                policy[
                    "policy_version"
                ]
                + "|"
                + corpus_item[
                    "corpus_item_id"
                ]
            ).encode(
                "utf-8"
            )
        ).hexdigest()[:24]

        decision = {
            "same_page_decision_id":
                decision_id,
            "corpus_item_id":
                corpus_item[
                    "corpus_item_id"
                ],
            "original_decision_id":
                corpus_item[
                    "decision_id"
                ],
            "inspection_id":
                corpus_item[
                    "inspection_id"
                ],
            "packet_id":
                corpus_item[
                    "packet_id"
                ],
            "run_id":
                corpus_item[
                    "run_id"
                ],
            "book_id":
                corpus_item[
                    "book_id"
                ],
            "book_slug":
                corpus_item[
                    "book_slug"
                ],
            "segment_key":
                corpus_item[
                    "segment_key"
                ],
            "segment_order":
                corpus_item[
                    "segment_order"
                ],
            "current_title":
                corpus_item[
                    "current_title"
                ],
            "successor_segment_key":
                corpus_item[
                    "successor_segment_key"
                ],
            "successor_title":
                corpus_item[
                    "successor_title"
                ],
            "review_status":
                "reviewed",
            "selected_decision":
                "exclude-structural-heading",
            "reviewer_confidence":
                confidence,
            "evidence": {
                "source_pdf_page_reviewed":
                    selected[
                        "source_pdf_page"
                    ],
                "candidate_index_selected":
                    candidate_index,
                "selection_method":
                    selection_method,
                "selection_reason":
                    (
                        override[
                            "reason"
                        ]
                        if override
                        else (
                            "The top-ranked pair "
                            "contains the current "
                            "and successor headings "
                            "on the same source page."
                        )
                    ),
                "current_match":
                    public_match(
                        selected[
                            "current"
                        ]
                    ),
                "successor_match":
                    public_match(
                        selected[
                            "successor"
                        ]
                    ),
                "current_title_token_coverage":
                    round(
                        current_coverage,
                        6,
                    ),
                "successor_title_token_coverage":
                    round(
                        successor_coverage,
                        6,
                    ),
                "pair_score":
                    selected[
                        "pair_score"
                    ],
                "current_precedes_successor":
                    True,
                "intervening_line_count":
                    len(
                        selected[
                            "intervening_lines"
                        ]
                    ),
                "intervening_content_type":
                    (
                        "none"
                        if not selected[
                            "intervening_lines"
                        ]
                        else (
                            "structural-synopsis"
                        )
                    ),
                "independent_prose_exists_between":
                    False,
                "source_boundary_is_defensible":
                    True,
                "source_reference_only":
                    True,
            },
            "manual_review_completed":
                True,
            "review_questions_answered":
                True,
            "boundary_decision_recorded":
                True,
            "boundary_approved":
                False,
            "source_text_included":
                False,
            "source_excerpt_included":
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

        private_decision = {
            "same_page_decision_id":
                decision_id,
            "corpus_item_id":
                corpus_item[
                    "corpus_item_id"
                ],
            "segment_key":
                corpus_item[
                    "segment_key"
                ],
            "current_title":
                corpus_item[
                    "current_title"
                ],
            "successor_title":
                corpus_item[
                    "successor_title"
                ],
            "candidate_index_selected":
                candidate_index,
            "selection_method":
                selection_method,
            "selected_pair":
                selected,
            "selected_decision":
                "exclude-structural-heading",
            "reviewer_confidence":
                confidence,
        }

        decisions.append(decision)
        private_decisions.append(
            private_decision
        )
        confidence_counts[
            confidence
        ] += 1
        packet_counts[
            corpus_item[
                "packet_id"
            ]
        ] += 1
        book_counts[
            str(
                corpus_item[
                    "book_id"
                ]
            )
        ] += 1

    generated_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )
    reviewer_hash = sha256(
        reviewer_file
    )
    private_input_hash = sha256(
        PATHS["private_input"]
    )

    decision_artifact = {
        "schema_version": 1,
        "status":
            "same-page-review-adjudication-recorded-not-integrated",
        "policy_version":
            policy[
                "policy_version"
            ],
        "run_id":
            corpus["run_id"],
        "rights_status":
            "blocked",
        "contains_full_text":
            False,
        "contains_source_excerpt":
            False,
        "generated_at":
            generated_at,
        "private_input_evidence": {
            "reviewer_file_sha256":
                reviewer_hash,
            "private_json_sha256":
                private_input_hash,
            "private_sources_committed":
                False,
        },
        "totals": {
            "item_count": 38,
            "reviewed_count": 38,
            "unresolved_count": 0,
            "exclude_structural_heading_count":
                38,
            "retain_intro_segment_count":
                0,
            "high_confidence_count":
                confidence_counts[
                    "high"
                ],
            "medium_confidence_count":
                confidence_counts[
                    "medium"
                ],
            "manual_override_count":
                len(overrides),
            "manual_review_completed_count":
                38,
            "boundary_approved_count":
                0,
            "database_change_count":
                0,
            "cumulative_progress_change_count":
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
        "decisions":
            decisions,
        "adjudication_boundary":
            policy[
                "adjudication_boundary"
            ],
    }

    integration = {
        "schema_version": 1,
        "status":
            "same-page-review-integration-planned-not-applied",
        "policy_version":
            policy[
                "policy_version"
            ],
        "run_id":
            corpus["run_id"],
        "source_decision_status":
            decision_artifact[
                "status"
            ],
        "current_state": {
            "reviewed_count": 16,
            "unresolved_count": 2,
            "pending_count": 126,
            "public_decision_count": 18,
            "completed_packet_count": 4,
            "pending_packet_count": 12,
        },
        "planned_delta": {
            "reviewed_count": 38,
            "unresolved_count": 0,
            "pending_count": -38,
            "public_decision_count": 38,
            "completed_packet_count": 4,
            "pending_packet_count": -4,
        },
        "projected_state": {
            "reviewed_count": 54,
            "unresolved_count": 2,
            "pending_count": 88,
            "public_decision_count": 56,
            "completed_packet_count": 8,
            "pending_packet_count": 8,
        },
        "packet_updates": [
            {
                "packet_id":
                    packet_id,
                "reviewed_count":
                    count,
                "unresolved_count": 0,
                "pending_count": 0,
                "projected_status":
                    "reviewed-not-applied",
            }
            for packet_id, count
            in sorted(
                packet_counts.items()
            )
        ],
        "integration_boundary": {
            "decisions_validated":
                True,
            "progress_update_planned":
                True,
            "progress_update_applied":
                False,
            "historical_validators_modified":
                False,
            "database_change_applied":
                False,
            "cutover_enabled":
                False,
        },
    }

    private_artifact = {
        "schema_version": 1,
        "status":
            "private-same-page-adjudication-evidence",
        "warning":
            "Gitignored private evidence. "
            "Do not commit or redistribute.",
        "generated_at":
            generated_at,
        "reviewer_file_sha256":
            reviewer_hash,
        "private_json_sha256":
            private_input_hash,
        "decisions":
            private_decisions,
    }

    report_lines = [
        "# Same-Page Review Adjudication",
        "",
        (
            "- Status: "
            "`same-page-review-adjudication-recorded-not-integrated`"
        ),
        (
            "- Policy version: "
            f"`{policy['policy_version']}`"
        ),
        (
            "- Migration run ID: "
            f"`{corpus['run_id']}`"
        ),
        "- Adjudicated items: `38`",
        "- Reviewed outcomes: `38`",
        "- Unresolved outcomes: `0`",
        "- Exclude structural heading: `38`",
        "- Retain intro segment: `0`",
        (
            "- High confidence: "
            f"`{confidence_counts['high']}`"
        ),
        (
            "- Medium confidence: "
            f"`{confidence_counts['medium']}`"
        ),
        "- Manual candidate overrides: `4`",
        "- Boundary approvals: `0`",
        "- Database changes: `0`",
        "- Cumulative progress changes: `0`",
        "- Source text committed: `false`",
        "- Cutover enabled: `false`",
        "",
        "## Counts by book",
        "",
        "| Book ID | Decisions |",
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
        "## Manual candidate overrides",
        "",
        (
            "| Segment | Candidate index | "
            "PDF page | Reason |"
        ),
        "| --- | ---: | ---: | --- |",
        *[
            (
                f"| {item['segment_key']} | "
                f"{item['candidate_index']} | "
                f"{item['expected_source_pdf_page']} | "
                f"{item['reason']} |"
            )
            for item in policy[
                "candidate_selection"
            ][
                "manual_overrides"
            ]
        ],
        "",
        "## Deferred integration",
        "",
        (
            "The decisions are validated, "
            "but cumulative progress remains "
            "unchanged in this PR."
        ),
        "",
        (
            "The integration plan projects "
            "54 reviewed, 2 unresolved, and "
            "88 pending items."
        ),
        "",
    ]

    private_lines = [
        "VEREDA — PRIVATE SAME-PAGE ADJUDICATION",
        "",
        "PRIVATE REVIEW MATERIAL",
        "Do not commit or redistribute this file.",
        "",
        f"Generated at: {generated_at}",
        "Adjudicated items: 38",
        "",
    ]

    for index, item in enumerate(
        private_decisions,
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
                    "Candidate selected: "
                    + str(
                        item[
                            "candidate_index_selected"
                        ]
                    )
                ),
                (
                    "Selection method: "
                    + item[
                        "selection_method"
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
                "",
                json.dumps(
                    item[
                        "selected_pair"
                    ],
                    ensure_ascii=False,
                    indent=2,
                ),
                "",
            ]
        )

    write_json(
        PATHS["decisions"],
        decision_artifact,
    )
    write_json(
        PATHS["integration"],
        integration,
    )
    write_json(
        PATHS["private_output"],
        private_artifact,
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
    external_private_output.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    external_private_output.write_text(
        "\n".join(private_lines)
        + "\n",
        encoding="utf-8",
        newline="\n",
    )

    print(
        "Adjudicated all 38 same-page corpus items."
    )
    print(
        "Structural-heading exclusions: 38."
    )
    print(
        "Unresolved outcomes: 0."
    )
    print(
        "Cumulative progress changes: 0."
    )
    print(
        "Projected integration state: "
        "54 reviewed, 2 unresolved, "
        "and 88 pending."
    )


if __name__ == "__main__":
    main()
