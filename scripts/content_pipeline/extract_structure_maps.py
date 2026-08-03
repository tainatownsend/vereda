from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / "content" / "sources" / "manifest.json"
LOCAL_SOURCES_PATH = (
    ROOT / "content" / "sources" / "local-sources.json"
)
CONFIG_PATH = ROOT / "scripts" / "content_pipeline" / "toc_config.json"
OUTPUT_DIR = ROOT / "content" / "structure" / "source-maps"
REPORT_PATH = (
    ROOT
    / "content"
    / "structure"
    / "reports"
    / "source-map-summary.md"
)

BACK_MATTER_TITLES = {
    "conclusão",
    "nota explicativa",
    "índice geral",
}

PART_LABEL_PATTERN = re.compile(
    r"^(?:"
    r"PARTE\s+(?:PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA)"
    r"|"
    r"(?:PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA)\s+PARTE"
    r")$",
    flags=re.IGNORECASE,
)

CHAPTER_PREFIX_PATTERN = re.compile(
    r"^Capítulo\s+",
    flags=re.IGNORECASE,
)

CHAPTER_PATTERN = re.compile(
    r"^Capítulo\s+([IVXLCDM]+)\s*[–—-]\s*(.+?)\s+(\d{1,4})$",
    flags=re.IGNORECASE,
)


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def fold_text(value: str) -> str:
    return (
        unicodedata.normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .casefold()
    )


def normalize_line(value: str) -> str:
    value = " ".join(value.replace("\u00ad", "").split())
    value = re.sub(
        r"\bT\s+(?=[a-záéíóúâêôãõç])",
        "T",
        value,
    )
    value = re.sub(
        r"\bFu\s+ne\s+rais\b",
        "Funerais",
        value,
    )
    value = re.sub(r"\s*-\s+-\s*", "-", value)
    value = re.sub(r"\s+([,.;:!?])", r"\1", value)
    return value.strip()


def parse_dotted_entry(
    value: str,
) -> tuple[str, int] | None:
    if not re.search(r"\.{2,}", value):
        return None

    cleaned = " ".join(
        re.sub(r"\.{2,}", " ", value).split()
    )
    match = re.match(
        r"^(.*)\s+(\d{1,4})\.?$",
        cleaned,
    )

    if not match:
        return None

    title = match.group(1).strip(" .")
    return title, int(match.group(2))


def parse_chapter_entry(
    value: str,
) -> tuple[str, str, int] | None:
    cleaned = " ".join(
        re.sub(r"\.{1,}", " ", value).split()
    ).rstrip(".")

    match = CHAPTER_PATTERN.match(cleaned)

    if not match:
        return None

    return (
        match.group(1).upper(),
        match.group(2).strip(),
        int(match.group(3)),
    )


def split_detail_segments(
    value: str,
    separator: str,
) -> list[str]:
    if separator == "semicolon":
        parts = re.split(r";\s*", value)
    else:
        parts = re.split(
            r"\s*\.\s*[–—]\s*|\s+[–—]\s+",
            value,
        )

    return [
        part.strip(" .–—")
        for part in parts
        if part.strip(" .–—")
    ]


def parse_detail_locator(
    value: str,
    locator_type: str,
) -> tuple[str, dict[str, Any] | None]:
    if locator_type == "none":
        return value, None

    if locator_type == "page":
        pattern = r"^(.*):\s*(\d{1,4})$"
        locator_name = "printed_page"
    else:
        pattern = (
            r"^(.*):\s*"
            r"(\d+(?:\s*(?:a|e)\s*\d+)?)$"
        )
        locator_name = "paragraph_range"

    match = re.match(
        pattern,
        value,
        flags=re.IGNORECASE,
    )

    if not match:
        return value, None

    locator_value: int | str = match.group(2)

    if locator_type == "page":
        locator_value = int(locator_value)

    return (
        match.group(1).strip(),
        {
            "type": locator_name,
            "value": locator_value,
        },
    )


def make_source_key(
    *,
    node_type: str,
    parent_id: str | None,
    label: str | None,
    title: str,
    printed_page: int | None,
    locator: dict[str, Any] | None,
) -> str:
    payload = json.dumps(
        {
            "type": node_type,
            "parent_id": parent_id,
            "label": label,
            "title": title,
            "printed_page": printed_page,
            "locator": locator,
        },
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )

    return hashlib.sha256(
        payload.encode("utf-8")
    ).hexdigest()[:16]


def finalize_nodes(
    book_slug: str,
    temporary_nodes: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    finalized: list[dict[str, Any]] = []

    for order, temporary in enumerate(
        temporary_nodes,
        start=1,
    ):
        parent_index = temporary.pop("parent_index")
        parent = (
            finalized[parent_index]
            if parent_index is not None
            else None
        )
        parent_id = parent["id"] if parent else None
        depth = parent["depth"] + 1 if parent else 0

        source_key = make_source_key(
            node_type=temporary["type"],
            parent_id=parent_id,
            label=temporary["label"],
            title=temporary["title"],
            printed_page=temporary["printed_page"],
            locator=temporary["locator"],
        )

        finalized.append(
            {
                "id": (
                    f"{book_slug}:"
                    f"{temporary['type']}:"
                    f"{source_key}"
                ),
                "source_key": source_key,
                "parent_id": parent_id,
                "order": order,
                "depth": depth,
                **temporary,
            }
        )

    return finalized


def extract_toc_lines(
    reader: PdfReader,
    pdf_pages: list[int],
) -> list[tuple[int, str]]:
    lines: list[tuple[int, str]] = []

    for pdf_page in pdf_pages:
        page_text = (
            reader.pages[pdf_page - 1].extract_text()
            or ""
        )

        for raw_line in page_text.splitlines():
            line = normalize_line(raw_line)

            if line:
                lines.append((pdf_page, line))

    return lines


def parse_work(
    work: dict[str, Any],
    config: dict[str, Any],
    source_path: Path,
) -> dict[str, Any]:
    reader = PdfReader(str(source_path))
    lines = extract_toc_lines(
        reader,
        config["toc_pdf_pages"],
    )
    toc_text = "\n".join(
        f"{pdf_page}:{line}"
        for pdf_page, line in lines
    )
    toc_text_sha256 = hashlib.sha256(
        toc_text.encode("utf-8")
    ).hexdigest()

    nodes: list[dict[str, Any]] = []
    review_flags: list[str] = []
    detail_buffer: list[tuple[int, str]] = []

    current_division: int | None = None
    current_chapter: int | None = None
    current_group: int | None = None

    configured_divisions = {
        fold_text(title)
        for title in config["division_titles"]
    }
    folded_back_matter = {
        fold_text(title)
        for title in BACK_MATTER_TITLES
    }

    def add_node(
        *,
        node_type: str,
        title: str,
        source_pdf_page: int,
        parent_index: int | None = None,
        label: str | None = None,
        printed_page: int | None = None,
        locator: dict[str, Any] | None = None,
    ) -> int:
        nodes.append(
            {
                "parent_index": parent_index,
                "type": node_type,
                "label": label,
                "title": title,
                "source_pdf_page": source_pdf_page,
                "printed_page": printed_page,
                "locator": locator,
            }
        )
        return len(nodes) - 1

    def flush_detail_buffer() -> None:
        nonlocal detail_buffer

        if not detail_buffer:
            return

        if current_chapter is None:
            detail_buffer = []
            return

        source_pdf_page = detail_buffer[0][0]
        combined = " ".join(
            line
            for _, line in detail_buffer
        )

        segments = split_detail_segments(
            combined,
            config["detail_separator"],
        )

        for segment in segments:
            title, locator = parse_detail_locator(
                segment,
                config["detail_locator"],
            )

            if not title:
                continue

            if (
                config["detail_locator"] != "none"
                and locator is None
            ):
                review_flags.append(
                    "Missing expected locator: "
                    f"{title}"
                )

            add_node(
                node_type="section",
                title=title,
                source_pdf_page=source_pdf_page,
                parent_index=(
                    current_group
                    if current_group is not None
                    else current_chapter
                ),
                locator=locator,
            )

        detail_buffer = []

    line_index = 0

    while line_index < len(lines):
        source_pdf_page, line = lines[line_index]
        folded_line = fold_text(line)

        if folded_line == "sumario":
            line_index += 1
            continue

        if folded_line in configured_divisions:
            flush_detail_buffer()
            current_group = None
            current_division = add_node(
                node_type="division",
                title=line,
                source_pdf_page=source_pdf_page,
            )
            current_chapter = None
            line_index += 1
            continue

        if PART_LABEL_PATTERN.match(line):
            flush_detail_buffer()
            current_group = None
            division_title = line

            if line_index + 1 < len(lines):
                _, next_line = lines[line_index + 1]

                if (
                    not CHAPTER_PREFIX_PATTERN.match(
                        next_line
                    )
                    and parse_dotted_entry(
                        next_line
                    )
                    is None
                ):
                    division_title = (
                        f"{line} — {next_line}"
                    )
                    line_index += 1

            current_division = add_node(
                node_type="division",
                title=division_title,
                source_pdf_page=source_pdf_page,
            )
            current_chapter = None
            line_index += 1
            continue

        if CHAPTER_PREFIX_PATTERN.match(line):
            flush_detail_buffer()
            current_group = None
            combined = line
            lookahead = line_index
            chapter = parse_chapter_entry(combined)

            while (
                chapter is None
                and lookahead + 1 < len(lines)
                and lookahead - line_index < 3
            ):
                lookahead += 1
                combined = (
                    f"{combined} "
                    f"{lines[lookahead][1]}"
                )
                chapter = parse_chapter_entry(
                    combined
                )

            if chapter is None:
                review_flags.append(
                    "Unparsed chapter heading on "
                    f"PDF page {source_pdf_page}: "
                    f"{line}"
                )
                line_index += 1
                continue

            numeral, title, printed_page = chapter
            current_chapter = add_node(
                node_type="chapter",
                label=f"Capítulo {numeral}",
                title=title,
                source_pdf_page=source_pdf_page,
                parent_index=current_division,
                printed_page=printed_page,
            )
            line_index = lookahead + 1
            continue

        dotted_entry = parse_dotted_entry(line)

        if dotted_entry:
            title, printed_page = dotted_entry

            if fold_text(title) in folded_back_matter:
                flush_detail_buffer()
                current_group = None
                current_chapter = None
                add_node(
                    node_type="back_matter",
                    title=title,
                    source_pdf_page=source_pdf_page,
                    printed_page=printed_page,
                )
                line_index += 1
                continue

            if current_chapter is None:
                add_node(
                    node_type="front_matter",
                    title=title,
                    source_pdf_page=source_pdf_page,
                    printed_page=printed_page,
                )
                line_index += 1
                continue

            flush_detail_buffer()

            next_line = (
                lines[line_index + 1][1]
                if line_index + 1 < len(lines)
                else ""
            )

            has_children = bool(
                next_line
                and not CHAPTER_PREFIX_PATTERN.match(
                    next_line
                )
                and parse_dotted_entry(next_line)
                is None
                and not PART_LABEL_PATTERN.match(
                    next_line
                )
                and fold_text(next_line)
                not in configured_divisions
                and fold_text(next_line)
                not in folded_back_matter
            )

            node_type = (
                "group"
                if (
                    has_children
                    or re.match(
                        r"^[IVXLCDM]+\s*[.–—-]",
                        title,
                    )
                )
                else "section"
            )

            added_index = add_node(
                node_type=node_type,
                title=title,
                source_pdf_page=source_pdf_page,
                parent_index=current_chapter,
                printed_page=printed_page,
            )

            current_group = (
                added_index
                if node_type == "group"
                else None
            )
            line_index += 1
            continue

        if current_chapter is not None:
            detail_buffer.append(
                (source_pdf_page, line)
            )

        line_index += 1

    flush_detail_buffer()

    finalized_nodes = finalize_nodes(
        work["slug"],
        nodes,
    )
    node_counts = Counter(
        node["type"]
        for node in finalized_nodes
    )

    counts = {
        "front_matter": node_counts[
            "front_matter"
        ],
        "divisions": node_counts["division"],
        "chapters": node_counts["chapter"],
        "groups": node_counts["group"],
        "sections": node_counts["section"],
        "back_matter": node_counts[
            "back_matter"
        ],
        "total_nodes": len(finalized_nodes),
    }

    if (
        counts["divisions"]
        != config["expected_divisions"]
    ):
        review_flags.append(
            "Expected "
            f"{config['expected_divisions']} "
            "divisions, extracted "
            f"{counts['divisions']}."
        )

    if (
        counts["chapters"]
        != config["expected_chapters"]
    ):
        review_flags.append(
            "Expected "
            f"{config['expected_chapters']} "
            "chapters, extracted "
            f"{counts['chapters']}."
        )

    return {
        "schema_version": 1,
        "book": {
            "book_id": work["book_id"],
            "slug": work["slug"],
            "title": work["title"],
        },
        "source": {
            "source_file": work["source_file"],
            "source_sha256": work[
                "source_sha256"
            ],
            "toc_pdf_pages": config[
                "toc_pdf_pages"
            ],
            "toc_text_sha256": (
                toc_text_sha256
            ),
            "rights_status": work[
                "rights_status"
            ],
        },
        "counts": counts,
        "nodes": finalized_nodes,
        "review_flags": review_flags,
    }


def build_summary(
    structure_maps: list[dict[str, Any]],
) -> str:
    lines = [
        "# Canonical Source Structure Maps",
        "",
        "These maps contain table-of-contents metadata only.",
        "They do not contain the full text of the works.",
        "",
        "| Work | Divisions | Chapters | Groups | Sections | Review flags |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ]

    for structure_map in structure_maps:
        counts = structure_map["counts"]
        lines.append(
            "| "
            + " | ".join(
                [
                    structure_map["book"]["title"],
                    str(counts["divisions"]),
                    str(counts["chapters"]),
                    str(counts["groups"]),
                    str(counts["sections"]),
                    str(
                        len(
                            structure_map[
                                "review_flags"
                            ]
                        )
                    ),
                ]
            )
            + " |"
        )

    lines.extend(
        [
            "",
            "## Validation boundary",
            "",
            "- Chapter and division counts are validated against each printed table of contents.",
            "- Stable source keys are derived from the editorial path and locator metadata.",
            "- These maps are a structural reference, not a production-content import.",
            "- Current Supabase sections remain unchanged.",
            "- Progress migration remains outside this Pull Request.",
            "",
        ]
    )

    return "\n".join(lines)


def main() -> None:
    manifest = read_json(MANIFEST_PATH)
    local_sources = read_json(
        LOCAL_SOURCES_PATH
    )
    config = read_json(CONFIG_PATH)

    manifest_by_id = {
        work["book_id"]: work
        for work in manifest["works"]
    }
    structure_maps = []

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )
    REPORT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    for work_config in config["works"]:
        work = manifest_by_id[
            work_config["book_id"]
        ]
        local_path = local_sources.get(
            work["slug"]
        )

        if not local_path:
            raise SystemExit(
                "Missing local PDF registration for "
                f"{work['slug']}."
            )

        source_path = Path(local_path)

        if not source_path.exists():
            raise SystemExit(
                f"Source PDF not found: {source_path}"
            )

        print(
            f"Extracting structure: "
            f"{work['title']}..."
        )

        structure_map = parse_work(
            work,
            work_config,
            source_path,
        )
        structure_maps.append(
            structure_map
        )

        output_path = (
            OUTPUT_DIR
            / f"{work['slug']}.json"
        )
        output_path.write_text(
            json.dumps(
                structure_map,
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

        if structure_map["review_flags"]:
            print(
                "  Review flags: "
                f"{len(structure_map['review_flags'])}"
            )
        else:
            print("  Structure validated.")

    REPORT_PATH.write_text(
        build_summary(structure_maps) + "\n",
        encoding="utf-8",
    )

    flagged = [
        structure_map
        for structure_map in structure_maps
        if structure_map["review_flags"]
    ]

    print()
    print(f"Summary: {REPORT_PATH}")

    if flagged:
        print()
        print(
            "One or more structure maps "
            "require review."
        )
        raise SystemExit(1)

    print()
    print(
        "All five canonical structure maps "
        "were generated successfully."
    )


if __name__ == "__main__":
    main()
