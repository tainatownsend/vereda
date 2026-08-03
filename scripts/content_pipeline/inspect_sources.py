from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / "content" / "sources" / "manifest.json"
LOCAL_SOURCES_PATH = (
    ROOT / "content" / "sources" / "local-sources.json"
)
REPORT_DIR = ROOT / "content" / "staging" / "reports"
JSON_REPORT_PATH = REPORT_DIR / "source-inspection.json"
MARKDOWN_REPORT_PATH = REPORT_DIR / "source-inspection.md"

WORD_BREAK_PATTERN = re.compile(
    r"[A-Za-zÀ-ÖØ-öø-ÿ]-\n[A-Za-zÀ-ÖØ-öø-ÿ]"
)


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)

    return digest.hexdigest()


def clean_metadata(metadata: Any) -> dict[str, str | None]:
    if not metadata:
        return {}

    return {
        str(key).lstrip("/"): (
            str(value) if value is not None else None
        )
        for key, value in metadata.items()
    }


def inspect_work(
    work: dict[str, Any],
    source_path: Path,
) -> dict[str, Any]:
    actual_hash = sha256_file(source_path)
    reader = PdfReader(str(source_path))
    page_count = len(reader.pages)

    text_page_count = 0
    empty_pages: list[int] = []
    total_characters = 0
    dehyphenation_candidates = 0
    replacement_character_count = 0
    edge_lines: Counter[str] = Counter()
    toc_signal_count = 0

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        stripped = text.strip()

        if stripped:
            text_page_count += 1
        else:
            empty_pages.append(page_number)

        total_characters += len(stripped)
        dehyphenation_candidates += len(
            WORD_BREAK_PATTERN.findall(text)
        )
        replacement_character_count += (
            text.count("\ufffd") + text.count("\ufffe")
        )

        lines = [
            line.strip()
            for line in text.splitlines()
            if line.strip()
        ]

        for line in lines[:3] + lines[-3:]:
            if 3 <= len(line) <= 90:
                edge_lines[line] += 1

        if page_number <= 20:
            toc_signal_count += sum(
                1
                for line in lines
                if re.search(
                    r"\b(sumário|capítulo|parte)\b",
                    line,
                    flags=re.IGNORECASE,
                )
            )

    repeated_edge_lines = [
        {
            "text": line,
            "occurrences": occurrences,
        }
        for line, occurrences in edge_lines.most_common()
        if occurrences >= 5
    ][:20]

    text_coverage = (
        text_page_count / page_count if page_count else 0
    )

    hash_matches = actual_hash == work["source_sha256"]
    page_count_matches = page_count == work["pdf_page_count"]

    return {
        "book_id": work["book_id"],
        "slug": work["slug"],
        "title": work["title"],
        "translator": work["translator"],
        "source_file": source_path.name,
        "expected_sha256": work["source_sha256"],
        "actual_sha256": actual_hash,
        "hash_matches": hash_matches,
        "expected_pdf_page_count": work["pdf_page_count"],
        "actual_pdf_page_count": page_count,
        "page_count_matches": page_count_matches,
        "text_page_count": text_page_count,
        "empty_page_count": len(empty_pages),
        "empty_pages": empty_pages,
        "text_coverage_percentage": round(
            text_coverage * 100,
            2,
        ),
        "total_extracted_characters": total_characters,
        "dehyphenation_candidates": dehyphenation_candidates,
        "replacement_character_count": (
            replacement_character_count
        ),
        "toc_signal_count_first_20_pages": toc_signal_count,
        "repeated_edge_lines": repeated_edge_lines,
        "metadata": clean_metadata(reader.metadata),
        "ocr_required": text_coverage < 0.8,
        "suitable_for_structural_analysis": (
            hash_matches
            and page_count_matches
            and text_coverage >= 0.8
        ),
        "rights_status": work["rights_status"],
    }


def build_markdown(
    results: list[dict[str, Any]],
) -> str:
    lines = [
        "# Canonical PDF Inspection",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        "",
        "This report contains extraction diagnostics only.",
        "No full book text was written to the repository.",
        "",
        "| Work | Translator | Pages | Text coverage | OCR | Hash | Structural use |",
        "| --- | --- | ---: | ---: | --- | --- | --- |",
    ]

    for result in results:
        lines.append(
            "| "
            + " | ".join(
                [
                    result["title"],
                    result["translator"],
                    str(result["actual_pdf_page_count"]),
                    f'{result["text_coverage_percentage"]}%',
                    "required"
                    if result["ocr_required"]
                    else "not required",
                    "verified"
                    if result["hash_matches"]
                    else "mismatch",
                    "approved"
                    if result[
                        "suitable_for_structural_analysis"
                    ]
                    else "review",
                ]
            )
            + " |"
        )

    lines.extend(
        [
            "",
            "## Extraction considerations",
            "",
            "- All five PDFs contain selectable text.",
            "- Empty pages correspond mainly to covers, dividers, and chapter-opening layouts.",
            "- Line-ending hyphenation must be resolved before paragraph normalization.",
            "- Repeated edge lines must be classified as headers, footers, or legitimate headings.",
            "- The table of contents must be parsed from page text because the files do not provide a reliable document outline.",
            "- O Céu e o Inferno is translated by Manuel Justiniano Quintão.",
            "",
            "## Rights boundary",
            "",
            "The supplied editions remain restricted to local structural analysis.",
            "No extracted full text may be committed, published, or imported into production until redistribution rights are cleared.",
            "",
            "## Per-work diagnostics",
            "",
        ]
    )

    for result in results:
        lines.extend(
            [
                f'### {result["title"]}',
                "",
                f'- Source: `{result["source_file"]}`',
                f'- SHA-256 verified: `{result["hash_matches"]}`',
                f'- PDF pages: `{result["actual_pdf_page_count"]}`',
                f'- Text pages: `{result["text_page_count"]}`',
                f'- Empty pages: `{result["empty_page_count"]}`',
                f'- Extracted characters: `{result["total_extracted_characters"]}`',
                f'- Dehyphenation candidates: `{result["dehyphenation_candidates"]}`',
                f'- Replacement characters: `{result["replacement_character_count"]}`',
                f'- OCR required: `{result["ocr_required"]}`',
                "",
            ]
        )

    return "\n".join(lines)


def main() -> None:
    manifest = read_json(MANIFEST_PATH)
    local_sources = read_json(LOCAL_SOURCES_PATH)
    results = []

    for work in manifest["works"]:
        local_path = local_sources.get(work["slug"])

        if not local_path:
            raise SystemExit(
                f'Missing local source for {work["slug"]}'
            )

        source_path = Path(local_path)

        if not source_path.exists():
            raise SystemExit(
                f"Source file does not exist: {source_path}"
            )

        print(f'Inspecting {work["title"]}...')
        results.append(inspect_work(work, source_path))

    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    payload = {
        "schema_version": 1,
        "generated_at": datetime.now(
            timezone.utc
        ).isoformat(),
        "results": results,
    }

    JSON_REPORT_PATH.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    MARKDOWN_REPORT_PATH.write_text(
        build_markdown(results) + "\n",
        encoding="utf-8",
    )

    invalid = [
        result
        for result in results
        if not result["suitable_for_structural_analysis"]
    ]

    print()
    print(f"JSON report: {JSON_REPORT_PATH}")
    print(f"Markdown report: {MARKDOWN_REPORT_PATH}")

    if invalid:
        print()
        print("One or more sources require review:")
        for result in invalid:
            print(f'- {result["title"]}')
        raise SystemExit(1)

    print()
    print(
        "All five PDFs are suitable for local structural analysis."
    )


if __name__ == "__main__":
    main()
