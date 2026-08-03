from __future__ import annotations

import csv
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
CURRENT_CSV = (
    ROOT
    / "content"
    / "structure"
    / "current"
    / "current-section-structure.csv"
)
MAP_DIR = (
    ROOT
    / "content"
    / "structure"
    / "source-maps"
)
OUTPUT_DIR = (
    ROOT
    / "content"
    / "structure"
    / "comparisons"
)
SUMMARY_JSON = OUTPUT_DIR / "comparison-summary.json"
SUMMARY_MD = OUTPUT_DIR / "comparison-summary.md"
MAPPING_CSV = (
    OUTPUT_DIR
    / "progress-mapping-candidates.csv"
)

BOOK_SLUGS = {
    1: "o-livro-dos-espiritos",
    2: "o-livro-dos-mediuns",
    3: "o-evangelho-segundo-o-espiritismo",
    4: "o-ceu-e-o-inferno",
    5: "a-genese",
}

OVERSIZED_WORD_THRESHOLD = 1200
FUZZY_MATCH_THRESHOLD = 0.82
CHAPTER_MATCH_THRESHOLD = 0.58


def normalize_text(value: str | None) -> str:
    if not value:
        return ""

    normalized = unicodedata.normalize(
        "NFKD",
        value,
    )
    normalized = (
        normalized.encode("ascii", "ignore")
        .decode("ascii")
        .casefold()
    )
    normalized = re.sub(
        r"\b(capitulo|parte)\b",
        " ",
        normalized,
    )
    normalized = re.sub(
        r"[^a-z0-9]+",
        " ",
        normalized,
    )
    return " ".join(normalized.split())


def title_similarity(
    left: str | None,
    right: str | None,
) -> float:
    left_normalized = normalize_text(left)
    right_normalized = normalize_text(right)

    if not left_normalized or not right_normalized:
        return 0.0

    if left_normalized == right_normalized:
        return 1.0

    left_tokens = set(left_normalized.split())
    right_tokens = set(right_normalized.split())
    union = left_tokens | right_tokens
    jaccard = (
        len(left_tokens & right_tokens) / len(union)
        if union
        else 0.0
    )
    sequence = SequenceMatcher(
        None,
        left_normalized,
        right_normalized,
    ).ratio()

    return max(sequence, jaccard)


def parse_int(value: str | None) -> int:
    try:
        return int(value or 0)
    except ValueError:
        return 0


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as source:
        for chunk in iter(
            lambda: source.read(1024 * 1024),
            b"",
        ):
            digest.update(chunk)

    return digest.hexdigest()


def read_json(path: Path) -> Any:
    return json.loads(
        path.read_text(encoding="utf-8")
    )


def load_current_rows() -> list[dict[str, Any]]:
    with CURRENT_CSV.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as source:
        rows = list(csv.DictReader(source))

    converted = []

    for row in rows:
        converted.append(
            {
                **row,
                "book_id": parse_int(row["book_id"]),
                "section_id": parse_int(
                    row["section_id"]
                ),
                "sec_position": parse_int(
                    row["sec_position"]
                ),
                "stored_word_count": parse_int(
                    row["stored_word_count"]
                ),
                "calculated_word_count": parse_int(
                    row["calculated_word_count"]
                ),
                "content_character_count": parse_int(
                    row["content_character_count"]
                ),
                "paragraph_block_count": parse_int(
                    row["paragraph_block_count"]
                ),
            }
        )

    return converted


def build_node_indexes(
    structure_map: dict[str, Any],
) -> dict[str, Any]:
    nodes = structure_map["nodes"]
    by_id = {
        node["id"]: node
        for node in nodes
    }
    children: dict[str | None, list[dict[str, Any]]] = (
        defaultdict(list)
    )

    for node in nodes:
        children[node.get("parent_id")].append(node)

    divisions = [
        node
        for node in nodes
        if node["type"] == "division"
    ]
    chapters = [
        node
        for node in nodes
        if node["type"] == "chapter"
    ]
    front_matter = [
        node
        for node in nodes
        if node["type"] == "front_matter"
    ]
    back_matter = [
        node
        for node in nodes
        if node["type"] == "back_matter"
    ]

    def descendants(
        node_id: str,
    ) -> list[dict[str, Any]]:
        result = []
        stack = list(children.get(node_id, []))

        while stack:
            current = stack.pop(0)
            result.append(current)
            stack[0:0] = children.get(
                current["id"],
                [],
            )

        return result

    chapter_descendants = {
        chapter["id"]: [
            node
            for node in descendants(chapter["id"])
            if node["type"] in {"group", "section"}
        ]
        for chapter in chapters
    }

    return {
        "nodes": nodes,
        "by_id": by_id,
        "children": children,
        "divisions": divisions,
        "chapters": chapters,
        "front_matter": front_matter,
        "back_matter": back_matter,
        "chapter_descendants": chapter_descendants,
    }


@dataclass(frozen=True)
class ChapterGroup:
    key: tuple[str, str, str]
    part_title: str
    chapter_label: str
    chapter_title: str
    rows: tuple[dict[str, Any], ...]


def group_current_chapters(
    rows: list[dict[str, Any]],
) -> list[ChapterGroup]:
    grouped: dict[
        tuple[str, str, str],
        list[dict[str, Any]],
    ] = defaultdict(list)

    for row in rows:
        if not (
            row.get("chapter_label")
            or row.get("chapter_title")
        ):
            continue

        key = (
            normalize_text(row.get("part_title")),
            normalize_text(row.get("chapter_label")),
            normalize_text(row.get("chapter_title")),
        )
        grouped[key].append(row)

    return [
        ChapterGroup(
            key=key,
            part_title=items[0].get("part_title") or "",
            chapter_label=(
                items[0].get("chapter_label") or ""
            ),
            chapter_title=(
                items[0].get("chapter_title") or ""
            ),
            rows=tuple(
                sorted(
                    items,
                    key=lambda item: item[
                        "sec_position"
                    ],
                )
            ),
        )
        for key, items in grouped.items()
    ]


def canonical_division_title(
    chapter: dict[str, Any],
    indexes: dict[str, Any],
) -> str:
    parent_id = chapter.get("parent_id")

    if not parent_id:
        return ""

    parent = indexes["by_id"].get(parent_id)

    if parent and parent["type"] == "division":
        return parent["title"]

    return ""


def match_chapters(
    groups: list[ChapterGroup],
    indexes: dict[str, Any],
) -> tuple[
    dict[tuple[str, str, str], dict[str, Any]],
    list[dict[str, Any]],
]:
    candidates = []
    used_group_keys = set()
    used_chapter_ids = set()

    for group in groups:
        for chapter in indexes["chapters"]:
            title_score = title_similarity(
                group.chapter_title,
                chapter["title"],
            )
            label_score = title_similarity(
                group.chapter_label,
                chapter.get("label"),
            )

            current_part = group.part_title
            canonical_part = canonical_division_title(
                chapter,
                indexes,
            )

            if not current_part and not canonical_part:
                division_score = 1.0
            else:
                division_score = title_similarity(
                    current_part,
                    canonical_part,
                )

            score = (
                title_score * 0.72
                + label_score * 0.18
                + division_score * 0.10
            )

            candidates.append(
                (
                    score,
                    title_score,
                    label_score,
                    group,
                    chapter,
                )
            )

    candidates.sort(
        key=lambda item: (
            item[0],
            item[1],
            item[2],
        ),
        reverse=True,
    )

    matches = {}
    diagnostics = []

    for (
        score,
        title_score,
        label_score,
        group,
        chapter,
    ) in candidates:
        if score < CHAPTER_MATCH_THRESHOLD:
            continue

        if group.key in used_group_keys:
            continue

        if chapter["id"] in used_chapter_ids:
            continue

        used_group_keys.add(group.key)
        used_chapter_ids.add(chapter["id"])
        matches[group.key] = chapter
        diagnostics.append(
            {
                "current_part_title": (
                    group.part_title or None
                ),
                "current_chapter_label": (
                    group.chapter_label or None
                ),
                "current_chapter_title": (
                    group.chapter_title or None
                ),
                "canonical_chapter_id": chapter[
                    "id"
                ],
                "canonical_chapter_title": chapter[
                    "title"
                ],
                "score": round(score, 4),
            }
        )

    return matches, diagnostics


def best_node_match(
    title: str | None,
    nodes: list[dict[str, Any]],
) -> tuple[dict[str, Any] | None, float]:
    best_node = None
    best_score = 0.0

    for node in nodes:
        score = title_similarity(
            title,
            node["title"],
        )

        if score > best_score:
            best_node = node
            best_score = score

    return best_node, best_score


def row_chapter_key(
    row: dict[str, Any],
) -> tuple[str, str, str]:
    return (
        normalize_text(row.get("part_title")),
        normalize_text(row.get("chapter_label")),
        normalize_text(row.get("chapter_title")),
    )


def build_mapping(
    row: dict[str, Any],
    *,
    indexes: dict[str, Any],
    chapter_matches: dict[
        tuple[str, str, str],
        dict[str, Any],
    ],
) -> dict[str, Any]:
    kind = row.get("kind") or "content"
    canonical_node = None
    confidence = "unmatched"
    score = 0.0
    action = "review"

    if kind == "part_intro":
        candidate, candidate_score = best_node_match(
            row.get("part_title")
            or row.get("record_title"),
            indexes["divisions"],
        )

        if candidate_score >= FUZZY_MATCH_THRESHOLD:
            canonical_node = candidate
            score = candidate_score
            confidence = (
                "exact"
                if candidate_score == 1.0
                else "fuzzy"
            )
            action = "keep"

    chapter = chapter_matches.get(
        row_chapter_key(row)
    )

    if canonical_node is None and kind == "chapter_intro":
        if chapter:
            canonical_node = chapter
            score = 1.0
            confidence = "chapter"
            action = "keep"

    if canonical_node is None and kind == "content":
        section_title = (
            row.get("section_title")
            or row.get("record_title")
        )

        if chapter and section_title:
            descendants = indexes[
                "chapter_descendants"
            ].get(chapter["id"], [])
            candidate, candidate_score = (
                best_node_match(
                    section_title,
                    descendants,
                )
            )

            if (
                candidate
                and candidate_score
                >= FUZZY_MATCH_THRESHOLD
            ):
                canonical_node = candidate
                score = candidate_score
                confidence = (
                    "exact"
                    if candidate_score == 1.0
                    else "fuzzy"
                )
                action = (
                    "keep"
                    if candidate_score == 1.0
                    else "relabel-review"
                )

        if canonical_node is None and chapter:
            canonical_node = chapter
            score = 0.6
            confidence = "chapter-aggregate"
            canonical_children = indexes[
                "chapter_descendants"
            ].get(chapter["id"], [])
            action = (
                "split"
                if canonical_children
                or row["stored_word_count"]
                > OVERSIZED_WORD_THRESHOLD
                else "review"
            )

        if canonical_node is None and not chapter:
            standalone_nodes = (
                indexes["front_matter"]
                + indexes["back_matter"]
                + indexes["divisions"]
            )
            candidate, candidate_score = (
                best_node_match(
                    section_title,
                    standalone_nodes,
                )
            )

            if (
                candidate
                and candidate_score
                >= FUZZY_MATCH_THRESHOLD
            ):
                canonical_node = candidate
                score = candidate_score
                confidence = (
                    "exact"
                    if candidate_score == 1.0
                    else "fuzzy"
                )
                action = "reclassify"

    if (
        canonical_node is not None
        and row["stored_word_count"]
        > OVERSIZED_WORD_THRESHOLD
        and canonical_node["type"] in {
            "chapter",
            "division",
        }
    ):
        action = "split"

    return {
        "current_section_id": row["section_id"],
        "current_sec_position": row["sec_position"],
        "current_kind": kind,
        "current_part_title": (
            row.get("part_title") or None
        ),
        "current_chapter_label": (
            row.get("chapter_label") or None
        ),
        "current_chapter_title": (
            row.get("chapter_title") or None
        ),
        "current_section_title": (
            row.get("section_title")
            or row.get("record_title")
            or None
        ),
        "stored_word_count": row[
            "stored_word_count"
        ],
        "calculated_word_count": row[
            "calculated_word_count"
        ],
        "paragraph_block_count": row[
            "paragraph_block_count"
        ],
        "normalized_content_md5": row[
            "normalized_content_md5"
        ],
        "canonical_node_id": (
            canonical_node["id"]
            if canonical_node
            else None
        ),
        "canonical_source_key": (
            canonical_node["source_key"]
            if canonical_node
            else None
        ),
        "canonical_node_type": (
            canonical_node["type"]
            if canonical_node
            else None
        ),
        "canonical_title": (
            canonical_node["title"]
            if canonical_node
            else None
        ),
        "confidence": confidence,
        "score": round(score, 4),
        "recommended_action": action,
    }


def compare_book(
    *,
    book_id: int,
    rows: list[dict[str, Any]],
    structure_map: dict[str, Any],
) -> dict[str, Any]:
    indexes = build_node_indexes(
        structure_map
    )
    groups = group_current_chapters(rows)
    chapter_matches, chapter_diagnostics = (
        match_chapters(groups, indexes)
    )

    mappings = [
        build_mapping(
            row,
            indexes=indexes,
            chapter_matches=chapter_matches,
        )
        for row in rows
    ]

    mapped_node_ids = {
        mapping["canonical_node_id"]
        for mapping in mappings
        if mapping["canonical_node_id"]
    }
    canonical_only_nodes = [
        {
            "id": node["id"],
            "source_key": node["source_key"],
            "type": node["type"],
            "label": node.get("label"),
            "title": node["title"],
            "parent_id": node.get("parent_id"),
        }
        for node in indexes["nodes"]
        if node["id"] not in mapped_node_ids
        and node["type"] in {
            "chapter",
            "group",
            "section",
        }
    ]
    database_only_sections = [
        mapping
        for mapping in mappings
        if not mapping["canonical_node_id"]
    ]

    confidence_counts = Counter(
        mapping["confidence"]
        for mapping in mappings
    )
    action_counts = Counter(
        mapping["recommended_action"]
        for mapping in mappings
    )

    oversized_sections = [
        mapping
        for mapping in mappings
        if mapping["stored_word_count"]
        > OVERSIZED_WORD_THRESHOLD
    ]
    missing_section_titles = [
        mapping
        for mapping in mappings
        if (
            mapping["current_kind"] == "content"
            and not mapping[
                "current_section_title"
            ]
        )
    ]

    summary = {
        "current_record_count": len(rows),
        "current_chapter_group_count": len(
            groups
        ),
        "canonical_node_count": len(
            indexes["nodes"]
        ),
        "canonical_chapter_count": len(
            indexes["chapters"]
        ),
        "matched_chapter_count": len(
            chapter_matches
        ),
        "canonical_only_node_count": len(
            canonical_only_nodes
        ),
        "database_only_section_count": len(
            database_only_sections
        ),
        "oversized_section_count": len(
            oversized_sections
        ),
        "missing_section_title_count": len(
            missing_section_titles
        ),
        "confidence_counts": dict(
            sorted(confidence_counts.items())
        ),
        "action_counts": dict(
            sorted(action_counts.items())
        ),
    }

    return {
        "schema_version": 1,
        "book": structure_map["book"],
        "current_snapshot_sha256": file_sha256(
            CURRENT_CSV
        ),
        "canonical_map_sha256": file_sha256(
            MAP_DIR
            / f"{BOOK_SLUGS[book_id]}.json"
        ),
        "summary": summary,
        "chapter_matches": chapter_diagnostics,
        "mappings": mappings,
        "canonical_only_nodes": (
            canonical_only_nodes
        ),
        "database_only_sections": (
            database_only_sections
        ),
    }


def build_summary_markdown(
    comparisons: list[dict[str, Any]],
) -> str:
    lines = [
        "# Canonical and Current Structure Comparison",
        "",
        "This report compares structural metadata only.",
        "No complete book text or user data is included.",
        "",
        "| Work | Current records | Matched chapters | Canonical-only units | Database-only rows | Split candidates | Review rows |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]

    for comparison in comparisons:
        summary = comparison["summary"]
        actions = summary["action_counts"]
        lines.append(
            "| "
            + " | ".join(
                [
                    comparison["book"]["title"],
                    str(
                        summary[
                            "current_record_count"
                        ]
                    ),
                    (
                        f"{summary['matched_chapter_count']}"
                        f"/{summary['canonical_chapter_count']}"
                    ),
                    str(
                        summary[
                            "canonical_only_node_count"
                        ]
                    ),
                    str(
                        summary[
                            "database_only_section_count"
                        ]
                    ),
                    str(actions.get("split", 0)),
                    str(actions.get("review", 0)),
                ]
            )
            + " |"
        )

    lines.extend(
        [
            "",
            "## Interpretation",
            "",
            "- `keep`: structurally aligned with a canonical node.",
            "- `relabel-review`: likely match with title normalization differences.",
            "- `reclassify`: likely front matter, back matter, or division stored as content.",
            "- `split`: one current record appears to represent a larger editorial unit.",
            "- `review`: no reliable structural match was found.",
            "",
            "## Safety boundary",
            "",
            "- Supabase was queried in read-only mode.",
            "- No user-progress rows or reading sessions were exported.",
            "- No full book text was exported.",
            "- No database table was modified.",
            "- Candidate mappings are diagnostic and must not be used as a production migration without manual review.",
            "",
        ]
    )

    return "\n".join(lines)


def write_mapping_csv(
    comparisons: list[dict[str, Any]],
) -> None:
    fields = [
        "book_id",
        "book_title",
        "current_section_id",
        "current_sec_position",
        "current_kind",
        "current_part_title",
        "current_chapter_label",
        "current_chapter_title",
        "current_section_title",
        "stored_word_count",
        "canonical_node_id",
        "canonical_source_key",
        "canonical_node_type",
        "canonical_title",
        "confidence",
        "score",
        "recommended_action",
    ]

    with MAPPING_CSV.open(
        "w",
        encoding="utf-8",
        newline="",
    ) as destination:
        writer = csv.DictWriter(
            destination,
            fieldnames=fields,
        )
        writer.writeheader()

        for comparison in comparisons:
            for mapping in comparison["mappings"]:
                writer.writerow(
                    {
                        "book_id": comparison[
                            "book"
                        ]["book_id"],
                        "book_title": comparison[
                            "book"
                        ]["title"],
                        **{
                            field: mapping.get(field)
                            for field in fields
                            if field
                            not in {
                                "book_id",
                                "book_title",
                            }
                        },
                    }
                )


def main() -> None:
    if not CURRENT_CSV.exists():
        raise SystemExit(
            "Current structure CSV not found. "
            "Run content:comparison:import first."
        )

    rows = load_current_rows()
    rows_by_book: dict[
        int,
        list[dict[str, Any]],
    ] = defaultdict(list)

    for row in rows:
        rows_by_book[row["book_id"]].append(
            row
        )

    missing_books = [
        book_id
        for book_id in BOOK_SLUGS
        if not rows_by_book.get(book_id)
    ]

    if missing_books:
        raise SystemExit(
            "Missing book IDs in current snapshot: "
            + ", ".join(
                str(book_id)
                for book_id in missing_books
            )
        )

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )
    comparisons = []

    for book_id, slug in BOOK_SLUGS.items():
        structure_map = read_json(
            MAP_DIR / f"{slug}.json"
        )
        book_rows = sorted(
            rows_by_book[book_id],
            key=lambda row: row[
                "sec_position"
            ],
        )

        print(
            f"Comparing "
            f"{structure_map['book']['title']}..."
        )

        comparison = compare_book(
            book_id=book_id,
            rows=book_rows,
            structure_map=structure_map,
        )
        comparisons.append(comparison)

        output_path = (
            OUTPUT_DIR / f"{slug}.json"
        )
        output_path.write_text(
            json.dumps(
                comparison,
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

    summary_payload = {
        "schema_version": 1,
        "current_snapshot_sha256": (
            file_sha256(CURRENT_CSV)
        ),
        "book_count": len(comparisons),
        "books": [
            {
                "book": comparison["book"],
                "summary": comparison["summary"],
            }
            for comparison in comparisons
        ],
    }

    SUMMARY_JSON.write_text(
        json.dumps(
            summary_payload,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    SUMMARY_MD.write_text(
        build_summary_markdown(comparisons)
        + "\n",
        encoding="utf-8",
    )
    write_mapping_csv(comparisons)

    print()
    print(f"Summary: {SUMMARY_MD}")
    print(f"Candidates: {MAPPING_CSV}")
    print()
    print(
        "Comparison completed without "
        "modifying Supabase."
    )


if __name__ == "__main__":
    main()
