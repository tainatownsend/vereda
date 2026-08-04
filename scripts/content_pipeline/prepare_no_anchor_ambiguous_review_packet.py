#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from hash_utils import sha256_legacy_crlf

ROOT = Path.cwd()

PATHS = {
    "policy": ROOT
    / "content/migration/reading-segment-no-anchor-ambiguous-review-policy.json",
    "corpus": ROOT
    / "content/migration/reading-segment-no-anchor-discovery-corpus.json",
    "progress": ROOT
    / "content/migration/reading-segment-source-review-progress.json",
    "packet": ROOT
    / "content/migration/reading-segment-no-anchor-ambiguous-review-packet.json",
    "report": ROOT
    / "content/migration/reports/reading-segment-no-anchor-ambiguous-review-packet-summary.md",
    "private_output": ROOT
    / ".vereda-private/source-review/pr-0043-no-anchor-ambiguous-review/private-review-packet.local.json",
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


def public_candidate(
    candidate: dict[str, Any],
    index: int,
    top_score: float,
) -> dict[str, Any]:
    return {
        "candidate_index": index,
        "candidate_number": index + 1,
        "pair_score":
            candidate["pair_score"],
        "score_delta_from_top":
            round(
                top_score
                - candidate[
                    "pair_score"
                ],
                6,
            ),
        "current":
            candidate["current"],
        "successor":
            candidate["successor"],
        "current_precedes_successor":
            candidate[
                "current_precedes_successor"
            ],
        "same_source_pdf_page":
            candidate[
                "same_source_pdf_page"
            ],
        "source_pdf_page_gap":
            candidate[
                "source_pdf_page_gap"
            ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--private-input",
        required=True,
        type=Path,
    )
    parser.add_argument(
        "--private-output",
        required=True,
        type=Path,
    )
    args = parser.parse_args()

    private_input_path = (
        args.private_input
        .expanduser()
        .resolve()
    )
    external_private_output = (
        args.private_output
        .expanduser()
        .resolve()
    )

    policy = read_json(PATHS["policy"])
    corpus = read_json(PATHS["corpus"])
    progress = read_json(
        PATHS["progress"]
    )
    private_input = read_json(
        private_input_path
    )

    ambiguous = [
        item
        for item in corpus["items"]
        if item["corpus_status"]
        == policy["target"][
            "source_status"
        ]
    ]
    prepared = [
        item
        for item in corpus["items"]
        if item["corpus_status"]
        == policy["preserved_lane"][
            "source_status"
        ]
    ]

    if (
        len(corpus["items"]) != 88
        or len(ambiguous) != 25
        or len(prepared) != 63
    ):
        raise RuntimeError(
            "The PR-0042 corpus does not "
            "contain 63 prepared and "
            "25 ambiguous items."
        )

    if (
        progress["totals"][
            "reviewed_count"
        ]
        != 54
        or progress["totals"][
            "unresolved_count"
        ]
        != 2
        or progress["totals"][
            "pending_count"
        ]
        != 88
        or progress["totals"][
            "public_decision_count"
        ]
        != 56
    ):
        raise RuntimeError(
            "Cumulative progress changed "
            "before PR-0043."
        )

    private_by_id = {
        item["discovery_item_id"]:
            item
        for item in private_input[
            "items"
        ]
    }

    public_items = []
    private_items = []
    book_counts = Counter()
    packet_counts = Counter()
    candidate_counts = Counter()
    batch_items: dict[
        str,
        list[str],
    ] = {}

    for item in sorted(
        ambiguous,
        key=lambda value: (
            value["book_id"],
            value["packet_id"],
            value["segment_order"],
        ),
    ):
        private_item = private_by_id.get(
            item["discovery_item_id"]
        )

        if private_item is None:
            raise RuntimeError(
                item["discovery_item_id"]
                + ": private discovery "
                "evidence is missing."
            )

        public_pairs = item[
            "pair_candidates"
        ]
        private_pairs = private_item[
            "pair_candidates"
        ]

        if (
            len(public_pairs) < policy[
                "candidate_rules"
            ][
                "minimum_public_pair_candidates"
            ]
            or len(public_pairs)
            > policy[
                "candidate_rules"
            ][
                "maximum_public_pair_candidates"
            ]
            or len(private_pairs)
            < len(public_pairs)
        ):
            raise RuntimeError(
                item["segment_key"]
                + ": candidate coverage "
                "differs."
            )

        top_score = public_pairs[0][
            "pair_score"
        ]
        candidates = [
            public_candidate(
                candidate,
                index,
                top_score,
            )
            for index, candidate
            in enumerate(public_pairs)
        ]

        packet_item_id = (
            hashlib.sha256(
                (
                    policy[
                        "policy_version"
                    ]
                    + "|"
                    + item[
                        "discovery_item_id"
                    ]
                ).encode(
                    "utf-8"
                )
            ).hexdigest()[:24]
        )

        public_item = {
            "review_packet_item_id":
                packet_item_id,
            "discovery_item_id":
                item[
                    "discovery_item_id"
                ],
            "decision_id":
                item["decision_id"],
            "inspection_id":
                item["inspection_id"],
            "packet_id":
                item["packet_id"],
            "run_id":
                item["run_id"],
            "book_id":
                item["book_id"],
            "book_slug":
                item["book_slug"],
            "segment_key":
                item["segment_key"],
            "segment_order":
                item["segment_order"],
            "current_title":
                item["current_title"],
            "successor_segment_key":
                item[
                    "successor_segment_key"
                ],
            "successor_title":
                item[
                    "successor_title"
                ],
            "source_corpus_status":
                item["corpus_status"],
            "pair_score_gap":
                item["pair_score_gap"],
            "pair_ambiguous":
                item["pair_ambiguous"],
            "candidate_count":
                len(candidates),
            "candidates":
                candidates,
            "allowed_review_outcomes":
                policy[
                    "review_outcomes"
                ],
            "review_questions":
                policy[
                    "review_questions"
                ],
            "review_status":
                "packet-prepared-not-reviewed",
            "selected_candidate_index":
                None,
            "selected_outcome":
                None,
            "reviewer_confidence":
                None,
            "manual_review_required":
                True,
            "manual_review_completed":
                False,
            "review_questions_answered":
                False,
            "boundary_decision_recorded":
                False,
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

        private_item_output = {
            "review_packet_item_id":
                packet_item_id,
            "discovery_item_id":
                item[
                    "discovery_item_id"
                ],
            "decision_id":
                item["decision_id"],
            "packet_id":
                item["packet_id"],
            "book_id":
                item["book_id"],
            "segment_key":
                item["segment_key"],
            "current_title":
                item["current_title"],
            "successor_title":
                item[
                    "successor_title"
                ],
            "pair_score_gap":
                item["pair_score_gap"],
            "pair_ambiguous":
                True,
            "private_pair_candidates":
                [
                    {
                        "candidate_index":
                            index,
                        "candidate_number":
                            index + 1,
                        "pair_score":
                            pair[
                                "pair_score"
                            ],
                        "selected_pair":
                            pair,
                    }
                    for index, pair
                    in enumerate(
                        private_pairs[
                            :len(
                                candidates
                            )
                        ]
                    )
                ],
            "review_questions":
                policy[
                    "review_questions"
                ],
            "allowed_review_outcomes":
                policy[
                    "review_outcomes"
                ],
        }

        public_items.append(
            public_item
        )
        private_items.append(
            private_item_output
        )
        book_counts[
            str(item["book_id"])
        ] += 1
        packet_counts[
            item["packet_id"]
        ] += 1
        candidate_counts[
            str(len(candidates))
        ] += 1
        batch_items.setdefault(
            item["packet_id"],
            [],
        ).append(packet_item_id)

    batches = [
        {
            "review_batch_id":
                hashlib.sha256(
                    (
                        policy[
                            "policy_version"
                        ]
                        + "|"
                        + packet_id
                    ).encode(
                        "utf-8"
                    )
                ).hexdigest()[:24],
            "packet_id":
                packet_id,
            "book_id":
                next(
                    item["book_id"]
                    for item
                    in public_items
                    if item[
                        "packet_id"
                    ]
                    == packet_id
                ),
            "item_count":
                len(item_ids),
            "review_packet_item_ids":
                item_ids,
            "status":
                "packet-prepared-not-reviewed",
            "manual_review_completed_count":
                0,
            "review_decision_count":
                0,
        }
        for packet_id, item_ids
        in sorted(
            batch_items.items()
        )
    ]

    generated_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )

    packet = {
        "schema_version": 1,
        "status":
            "no-anchor-ambiguous-review-packet-prepared-not-reviewed",
        "policy_version":
            policy["policy_version"],
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
        "input_hashes": {
            "discovery_corpus_sha256":
                sha256(
                    PATHS["corpus"]
                ),
            "progress_sha256":
                sha256(
                    PATHS["progress"]
                ),
        },
        "private_input_evidence": {
            "private_json_sha256":
                sha256(
                    private_input_path
                ),
            "private_sources_committed":
                False,
        },
        "totals": {
            "item_count": 25,
            "batch_count":
                len(batches),
            "candidate_count":
                sum(
                    item[
                        "candidate_count"
                    ]
                    for item
                    in public_items
                ),
            "minimum_candidates_per_item":
                min(
                    item[
                        "candidate_count"
                    ]
                    for item
                    in public_items
                ),
            "maximum_candidates_per_item":
                max(
                    item[
                        "candidate_count"
                    ]
                    for item
                    in public_items
                ),
            "manual_review_required_count":
                25,
            "manual_review_completed_count":
                0,
            "review_decision_count":
                0,
            "prepared_lane_preserved_count":
                63,
            "cumulative_progress_change_count":
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
                    key=lambda value:
                        int(value[0]),
                )
            ),
        "counts_by_packet":
            dict(
                sorted(
                    packet_counts.items()
                )
            ),
        "counts_by_candidate_count":
            dict(
                sorted(
                    candidate_counts.items(),
                    key=lambda value:
                        int(value[0]),
                )
            ),
        "review_batches":
            batches,
        "items":
            public_items,
        "preparation_boundary":
            policy[
                "preparation_boundary"
            ],
    }

    private_packet = {
        "schema_version": 1,
        "status":
            "private-no-anchor-ambiguous-review-packet",
        "warning":
            "Gitignored private review "
            "material. Do not commit or "
            "redistribute.",
        "generated_at":
            generated_at,
        "source_corpus_sha256":
            sha256(PATHS["corpus"]),
        "private_discovery_sha256":
            sha256(
                private_input_path
            ),
        "item_count": 25,
        "items":
            private_items,
    }

    report_lines = [
        (
            "# No-Anchor Ambiguous "
            "Review Packet"
        ),
        "",
        (
            "- Status: "
            "`no-anchor-ambiguous-review-packet-prepared-not-reviewed`"
        ),
        (
            "- Policy version: "
            f"`{policy['policy_version']}`"
        ),
        (
            "- Migration run ID: "
            f"`{corpus['run_id']}`"
        ),
        "- Target items: `25`",
        (
            "- Review batches: "
            f"`{len(batches)}`"
        ),
        (
            "- Public candidate pairs: "
            f"`{packet['totals']['candidate_count']}`"
        ),
        (
            "- Candidates per item: "
            f"`{packet['totals']['minimum_candidates_per_item']}`"
            " to "
            f"`{packet['totals']['maximum_candidates_per_item']}`"
        ),
        "- Preserved prepared items: `63`",
        "- Manual reviews completed: `0`",
        "- Review decisions recorded: `0`",
        "- Cumulative progress changes: `0`",
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
                key=lambda value:
                    int(value[0]),
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
        "## Review boundary",
        "",
        (
            "This PR prepares the "
            "25 ambiguous cases for "
            "manual candidate selection."
        ),
        "",
        (
            "It records no editorial "
            "decision and leaves cumulative "
            "progress at 54 reviewed, "
            "2 unresolved, and 88 pending."
        ),
        "",
    ]

    private_lines = [
        (
            "VEREDA — PRIVATE NO-ANCHOR "
            "AMBIGUOUS REVIEW PACKET"
        ),
        "",
        "PRIVATE REVIEW MATERIAL",
        (
            "Do not commit or redistribute "
            "this file."
        ),
        "",
        f"Generated at: {generated_at}",
        "Target items: 25",
        "",
    ]

    for case_index, item in enumerate(
        private_items,
        start=1,
    ):
        private_lines.extend(
            [
                "=" * 72,
                (
                    f"CASE {case_index}: "
                    f"{item['current_title']}"
                ),
                "=" * 72,
                (
                    "Review packet item: "
                    + item[
                        "review_packet_item_id"
                    ]
                ),
                (
                    "Discovery item: "
                    + item[
                        "discovery_item_id"
                    ]
                ),
                (
                    "Book ID: "
                    + str(
                        item["book_id"]
                    )
                ),
                (
                    "Packet: "
                    + item["packet_id"]
                ),
                (
                    "Segment key: "
                    + item["segment_key"]
                ),
                (
                    "Expected successor: "
                    + item[
                        "successor_title"
                    ]
                ),
                (
                    "Pair score gap: "
                    + str(
                        item[
                            "pair_score_gap"
                        ]
                    )
                ),
                "",
            ]
        )

        for candidate in item[
            "private_pair_candidates"
        ]:
            pair = candidate[
                "selected_pair"
            ]
            current = pair["current"]
            successor = pair[
                "successor"
            ]

            private_lines.extend(
                [
                    "-" * 72,
                    (
                        "PAIR CANDIDATE "
                        + str(
                            candidate[
                                "candidate_number"
                            ]
                        )
                    ),
                    "-" * 72,
                    (
                        "Candidate index: "
                        + str(
                            candidate[
                                "candidate_index"
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
                        "Same source page: "
                        + str(
                            pair[
                                "same_source_pdf_page"
                            ]
                        )
                    ),
                    (
                        "PDF page gap: "
                        + str(
                            pair[
                                "source_pdf_page_gap"
                            ]
                        )
                    ),
                    "",
                    "CURRENT ANCHOR",
                    (
                        "PDF page: "
                        + str(
                            current[
                                "source_pdf_page"
                            ]
                        )
                    ),
                    (
                        "Printed page: "
                        + str(
                            current[
                                "printed_page"
                            ]
                        )
                    ),
                    (
                        "Anchor type: "
                        + str(
                            current[
                                "anchor_type"
                            ]
                        )
                    ),
                    (
                        "Paragraph number: "
                        + str(
                            current[
                                "paragraph_number"
                            ]
                        )
                    ),
                    (
                        "Anchor score: "
                        + str(
                            current[
                                "anchor_score"
                            ]
                        )
                    ),
                    *[
                        "  " + line
                        for line
                        in current[
                            "block_lines"
                        ]
                    ],
                    "",
                    "SUCCESSOR ANCHOR",
                    (
                        "PDF page: "
                        + str(
                            successor[
                                "source_pdf_page"
                            ]
                        )
                    ),
                    (
                        "Printed page: "
                        + str(
                            successor[
                                "printed_page"
                            ]
                        )
                    ),
                    (
                        "Anchor type: "
                        + str(
                            successor[
                                "anchor_type"
                            ]
                        )
                    ),
                    (
                        "Paragraph number: "
                        + str(
                            successor[
                                "paragraph_number"
                            ]
                        )
                    ),
                    (
                        "Anchor score: "
                        + str(
                            successor[
                                "anchor_score"
                            ]
                        )
                    ),
                    *[
                        "  " + line
                        for line
                        in successor[
                            "block_lines"
                        ]
                    ],
                    "",
                ]
            )

        private_lines.extend(
            [
                "REVIEW QUESTIONS",
                *[
                    (
                        f"{index}. "
                        + question
                    )
                    for index, question
                    in enumerate(
                        item[
                            "review_questions"
                        ],
                        start=1,
                    )
                ],
                "",
                (
                    "ALLOWED OUTCOMES: "
                    + ", ".join(
                        item[
                            "allowed_review_outcomes"
                        ]
                    )
                ),
                "",
            ]
        )

    write_json(
        PATHS["packet"],
        packet,
    )
    write_json(
        PATHS["private_output"],
        private_packet,
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
        "Prepared 25 ambiguous "
        "no-anchor review items."
    )
    print(
        "Preserved 63 prepared "
        "discovery items."
    )
    print(
        "Manual review decisions: 0."
    )
    print(
        "Cumulative progress changes: 0."
    )


if __name__ == "__main__":
    main()
