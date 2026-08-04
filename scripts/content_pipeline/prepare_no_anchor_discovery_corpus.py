#!/usr/bin/env python3

from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import math
import re
import statistics
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from hash_utils import sha256_legacy_crlf

from pypdf import PdfReader

ROOT = Path.cwd()

PATHS = {
    "policy": ROOT
    / "content/migration/reading-segment-no-anchor-discovery-policy.json",
    "manifest": ROOT
    / "content/sources/manifest.json",
    "worklist": ROOT
    / "content/migration/reading-segment-source-review-worklist.json",
    "inspection_packets": ROOT
    / "content/migration/reading-segment-source-inspection-packets.json",
    "audit": ROOT
    / "content/migration/reading-segment-pending-source-review-audit.json",
    "progress": ROOT
    / "content/migration/reading-segment-source-review-progress.json",
    "integration": ROOT
    / "content/migration/reading-segment-same-page-progress-integration-evidence.json",
    "corpus": ROOT
    / "content/migration/reading-segment-no-anchor-discovery-corpus.json",
    "report": ROOT
    / "content/migration/reports/reading-segment-no-anchor-discovery-summary.md",
    "private": ROOT
    / ".vereda-private/source-review/pr-0042-no-anchor-discovery/private-evidence.local.json",
}

STOPWORDS = {
    "a", "ao", "aos", "as", "com", "como", "da", "das", "de",
    "do", "dos", "e", "em", "entre", "na", "nas", "no", "nos",
    "o", "os", "ou", "para", "pela", "pelas", "pelo", "pelos",
    "por", "que", "se", "sem", "sua", "suas", "seu", "seus",
    "um", "uma", "uns", "umas", "à", "às", "é", "são", "ser",
    "sobre", "sob", "daquele", "daquela", "deste", "desta", "isso",
    "isto", "ele", "ela", "eles", "elas", "lhe", "lhes", "mais",
    "menos", "muito", "muita", "muitos", "muitas", "não", "sim",
}

NUMBERED_ANCHOR = re.compile(
    r"^\s*(?P<number>\d{1,4}[a-zA-Z]?)\s*[.)\-–—]\s+"
)
STANDALONE_NUMBER = re.compile(r"^\d{1,4}$")
DOT_LEADER = re.compile(r"\.{4,}")


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def sha256(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)

    return digest.hexdigest()


def clean_text(value: str) -> str:
    value = re.sub(r"(?<=\w)-\s*\n\s*(?=\w)", "", value)
    value = re.sub(
        r"\b([A-ZÁÉÍÓÚÂÊÔÃÕÇ])\s+([a-záéíóúâêôãõç]{3,})\b",
        r"\1\2",
        value,
    )
    return value


def normalize(value: str) -> str:
    value = clean_text(value)
    value = unicodedata.normalize("NFKD", value)
    value = "".join(
        character
        for character in value
        if not unicodedata.combining(character)
    )
    value = value.casefold()
    value = re.sub(r"(?<=[a-z])\d+\b", "", value)
    value = re.sub(r"[^\w]+", " ", value)
    return " ".join(value.split())


def significant_tokens(value: str) -> list[str]:
    return [
        token
        for token in normalize(value).split()
        if token not in STOPWORDS
        and len(token) >= 3
        and not token.isdigit()
    ]


def token_coverage(expected: str, actual: str) -> float:
    expected_tokens = significant_tokens(expected)
    actual_tokens = set(significant_tokens(actual))

    if not expected_tokens:
        expected_tokens = normalize(expected).split()
        actual_tokens = set(normalize(actual).split())

    if not expected_tokens:
        return 0.0

    return sum(
        token in actual_tokens
        for token in expected_tokens
    ) / len(expected_tokens)


def ordered_token_ratio(expected: str, actual: str) -> float:
    expected_tokens = significant_tokens(expected)
    actual_tokens = significant_tokens(actual)

    if not expected_tokens or not actual_tokens:
        return 0.0

    return difflib.SequenceMatcher(
        None,
        expected_tokens,
        actual_tokens,
    ).ratio()


def sequence_ratio(expected: str, actual: str) -> float:
    expected_normalized = normalize(expected)
    actual_normalized = normalize(actual)

    if not expected_normalized or not actual_normalized:
        return 0.0

    return difflib.SequenceMatcher(
        None,
        expected_normalized,
        actual_normalized[: max(500, len(expected_normalized) * 5)],
    ).ratio()


def resolve_pdf(downloads: Path, work: dict[str, Any]) -> Path:
    exact = downloads / work["source_file"]
    candidates = ([exact] if exact.is_file() else []) + [
        path
        for path in downloads.glob("*.pdf")
        if path != exact
    ]

    for candidate in candidates:
        if sha256(candidate) == work["source_sha256"]:
            return candidate

    raise RuntimeError(
        "Canonical source not found: " + work["source_file"]
    )


def normalize_line(line: str) -> str:
    return " ".join(clean_text(line).split())


def detect_printed_page(lines: list[str]) -> int | None:
    candidates = []

    for index in list(range(min(8, len(lines)))) + list(
        range(max(0, len(lines) - 8), len(lines))
    ):
        value = lines[index].strip()

        if STANDALONE_NUMBER.fullmatch(value):
            number = int(value)

            if 1 <= number <= 999:
                candidates.append((index, number))

    if not candidates:
        return None

    candidates.sort(
        key=lambda item: (
            min(item[0], abs(len(lines) - 1 - item[0])),
            item[0],
        )
    )
    return candidates[0][1]


def is_front_matter_page(page: dict[str, Any], rules: dict[str, Any]) -> bool:
    if page["source_pdf_page"] > rules["front_matter_page_limit"]:
        return False

    normalized = page["normalized_page"]
    dot_leaders = sum(
        bool(DOT_LEADER.search(line))
        for line in page["lines"]
    )

    return (
        "sumario" in normalized
        or "indice" in normalized
        or dot_leaders >= 3
    )


def is_heading_like(line: str) -> bool:
    stripped = line.strip()

    if not stripped or len(stripped) > 180:
        return False

    words = stripped.split()

    if len(words) < 2 or len(words) > 24:
        return False

    if NUMBERED_ANCHOR.match(stripped):
        return True

    if stripped.endswith((".", ";", ",", ":")):
        return False

    letters = [character for character in stripped if character.isalpha()]

    if not letters:
        return False

    uppercase_ratio = sum(
        character.isupper()
        for character in letters
    ) / len(letters)

    title_like = sum(
        word[:1].isupper()
        for word in words
        if word[:1].isalpha()
    ) >= max(1, len(words) // 2)

    return uppercase_ratio >= 0.45 or title_like


def build_blocks(page: dict[str, Any], rules: dict[str, Any]) -> list[dict[str, Any]]:
    lines = page["lines"]

    if not lines:
        return []

    starts = {0}

    for index, line in enumerate(lines):
        if NUMBERED_ANCHOR.match(line) or is_heading_like(line):
            starts.add(index)

    starts = sorted(starts)
    blocks = []

    for start in starts:
        line = lines[start]
        numbered_match = NUMBERED_ANCHOR.match(line)
        anchor_type = (
            "numbered-paragraph"
            if numbered_match
            else (
                "heading-like"
                if is_heading_like(line)
                else "page-opening"
            )
        )
        paragraph_number = (
            numbered_match.group("number")
            if numbered_match
            else None
        )
        end = min(len(lines), start + rules["maximum_block_lines"])

        for next_start in starts:
            if next_start > start:
                end = min(end, next_start)
                break

        block_lines = lines[start:end]
        block_text = " ".join(block_lines)

        if not normalize(block_text):
            continue

        blocks.append(
            {
                "source_pdf_page": page["source_pdf_page"],
                "printed_page": page["printed_page"],
                "start_line": start,
                "end_line": end,
                "anchor_type": anchor_type,
                "paragraph_number": paragraph_number,
                "block_line_count": len(block_lines),
                "block_text": block_text,
                "block_lines": block_lines,
                "page_text": page["page_text"],
                "front_matter_like": page["front_matter_like"],
            }
        )

    return blocks


def extract_book(pdf_path: Path, expected_count: int, rules: dict[str, Any]) -> dict[str, Any]:
    reader = PdfReader(str(pdf_path))

    if len(reader.pages) != expected_count:
        raise RuntimeError(
            f"{pdf_path.name}: expected {expected_count} pages, "
            f"found {len(reader.pages)}."
        )

    pages = []

    for index, page in enumerate(reader.pages, start=1):
        raw_text = page.extract_text() or ""
        cleaned = clean_text(raw_text)
        lines = [
            normalize_line(line)
            for line in cleaned.splitlines()
            if normalize_line(line)
        ]
        page_record = {
            "source_pdf_page": index,
            "page_text": raw_text,
            "lines": lines,
            "normalized_page": normalize(cleaned),
            "printed_page": detect_printed_page(lines),
        }
        page_record["front_matter_like"] = is_front_matter_page(
            page_record,
            rules,
        )
        pages.append(page_record)

    printed_map: dict[int, list[int]] = {}

    for page in pages:
        printed = page["printed_page"]

        if isinstance(printed, int):
            printed_map.setdefault(printed, []).append(
                page["source_pdf_page"]
            )

    offsets = [
        pdf_page - printed
        for printed, pdf_pages in printed_map.items()
        for pdf_page in pdf_pages
        if printed > 10 and pdf_page > 10
    ]
    median_offset = (
        int(round(statistics.median(offsets)))
        if offsets
        else None
    )
    blocks = [
        block
        for page in pages
        for block in build_blocks(page, rules)
    ]

    return {
        "pages": pages,
        "blocks": blocks,
        "printed_map": printed_map,
        "median_offset": median_offset,
    }


def locator_printed_page(node: dict[str, Any] | None) -> int | None:
    if not isinstance(node, dict):
        return None

    start = node.get("start_locator") or {}
    direct = start.get("printed_page")

    if isinstance(direct, int):
        return direct

    locator = start.get("locator") or {}

    if locator.get("type") == "printed_page" and isinstance(
        locator.get("value"),
        int,
    ):
        return locator["value"]

    return None


def item_printed_hints(inspection: dict[str, Any]) -> dict[str, int | None]:
    reference = inspection.get("source_reference") or {}
    context = inspection.get("context") or {}

    def resolve(role: str) -> int | None:
        referenced = (reference.get(role) or {}).get("printed_page")

        if isinstance(referenced, int):
            return referenced

        return locator_printed_page(context.get(role))

    return {
        "previous": resolve("previous"),
        "current": resolve("current"),
        "successor": resolve("successor"),
    }


def printed_to_pdf(book: dict[str, Any], printed: int | None) -> int | None:
    if printed is None:
        return None

    direct = book["printed_map"].get(printed) or []

    if direct:
        non_front = [page for page in direct if page > 15]
        return (non_front or direct)[0]

    offset = book["median_offset"]

    if offset is None:
        return None

    candidate = printed + offset

    if 1 <= candidate <= len(book["pages"]):
        return candidate

    return None


def packet_pdf_bounds(
    packet: dict[str, Any],
    book: dict[str, Any],
    rules: dict[str, Any],
) -> tuple[int, int, list[int]]:
    printed_hints = []

    for inspection in packet["items"]:
        for value in item_printed_hints(inspection).values():
            if isinstance(value, int):
                printed_hints.append(value)

    mapped = sorted(
        {
            pdf_page
            for value in printed_hints
            if (pdf_page := printed_to_pdf(book, value)) is not None
        }
    )
    page_count = len(book["pages"])

    if len(mapped) >= 2:
        lower = max(1, min(mapped) - rules["packet_page_padding"])
        upper = min(page_count, max(mapped) + rules["packet_page_padding"])
    elif len(mapped) == 1:
        radius = rules["single_hint_page_radius"]
        lower = max(1, mapped[0] - radius)
        upper = min(page_count, mapped[0] + radius)
    else:
        lower = min(page_count, rules["front_matter_page_limit"] + 1)
        upper = page_count

    return lower, upper, sorted(set(printed_hints))


def score_anchor(
    title: str,
    block: dict[str, Any],
    hint_pages: list[int],
    rules: dict[str, Any],
) -> dict[str, Any] | None:
    block_text = block["block_text"]
    normalized_title = normalize(title)
    normalized_block = normalize(block_text)
    coverage = token_coverage(title, block_text)
    ordered = ordered_token_ratio(title, block_text)
    sequence = sequence_ratio(title, block_text)
    exact_contains = bool(normalized_title) and normalized_title in normalized_block
    distinctive = [token for token in significant_tokens(title) if len(token) >= 6]
    block_tokens = set(significant_tokens(block_text))
    distinctive_coverage = (
        sum(token in block_tokens for token in distinctive) / len(distinctive)
        if distinctive
        else coverage
    )

    if (
        not exact_contains
        and coverage < rules["minimum_significant_token_coverage"]
        and sequence < rules["minimum_sequence_ratio"]
    ):
        return None

    anchor_bonus = 0.0

    if block["anchor_type"] == "numbered-paragraph":
        anchor_bonus += rules["numbered_anchor_bonus"]
    elif block["anchor_type"] == "heading-like":
        anchor_bonus += rules["heading_anchor_bonus"]

    page_distance = (
        min(abs(block["source_pdf_page"] - page) for page in hint_pages)
        if hint_pages
        else None
    )
    proximity_bonus = (
        max(0.0, rules["page_hint_proximity_bonus"] - page_distance / 30.0)
        if page_distance is not None
        else 0.0
    )
    front_penalty = (
        rules["front_matter_penalty"]
        if block["front_matter_like"]
        else 0.0
    )
    score = (
        (8.0 if exact_contains else 0.0)
        + coverage * 5.0
        + distinctive_coverage * 2.0
        + ordered * 1.5
        + sequence
        + anchor_bonus
        + proximity_bonus
        - front_penalty
        - max(0, block["block_line_count"] - 8) * 0.03
    )

    if score < rules["minimum_anchor_score"]:
        return None

    return {
        **block,
        "exact_title_contained": exact_contains,
        "significant_token_coverage": round(coverage, 6),
        "distinctive_token_coverage": round(distinctive_coverage, 6),
        "ordered_token_ratio": round(ordered, 6),
        "sequence_ratio": round(sequence, 6),
        "page_distance_from_hint": page_distance,
        "anchor_score": round(score, 6),
    }


def discover_anchors(
    title: str,
    book: dict[str, Any],
    lower_page: int,
    upper_page: int,
    hint_pages: list[int],
    rules: dict[str, Any],
) -> list[dict[str, Any]]:
    scored = []

    for block in book["blocks"]:
        page = block["source_pdf_page"]

        if page < lower_page or page > upper_page:
            continue

        candidate = score_anchor(title, block, hint_pages, rules)

        if candidate is not None:
            scored.append(candidate)

    unique: dict[tuple[int, int, str | None], dict[str, Any]] = {}

    for candidate in scored:
        key = (
            candidate["source_pdf_page"],
            candidate["start_line"],
            candidate["paragraph_number"],
        )
        current = unique.get(key)

        if current is None or candidate["anchor_score"] > current["anchor_score"]:
            unique[key] = candidate

    return sorted(
        unique.values(),
        key=lambda item: (
            -item["anchor_score"],
            item["page_distance_from_hint"]
            if item["page_distance_from_hint"] is not None
            else math.inf,
            item["source_pdf_page"],
            item["start_line"],
        ),
    )[: rules["maximum_candidate_blocks_per_title"]]


def build_pairs(
    current_candidates: list[dict[str, Any]],
    successor_candidates: list[dict[str, Any]],
    rules: dict[str, Any],
) -> list[dict[str, Any]]:
    pairs = []

    for current in current_candidates:
        current_position = current["source_pdf_page"] * 10000 + current["start_line"]

        for successor in successor_candidates:
            successor_position = (
                successor["source_pdf_page"] * 10000
                + successor["start_line"]
            )

            if successor_position <= current_position:
                continue

            page_gap = successor["source_pdf_page"] - current["source_pdf_page"]

            if page_gap > rules["maximum_pair_page_gap"]:
                continue

            pair_bonus = 0.0

            if page_gap == 0:
                pair_bonus += rules["same_page_pair_bonus"]
            elif page_gap == 1:
                pair_bonus += rules["adjacent_page_pair_bonus"]

            distance_penalty = max(0.0, page_gap - 1) * 0.025
            score = (
                current["anchor_score"]
                + successor["anchor_score"]
                + pair_bonus
                - distance_penalty
            )

            if score < rules["minimum_pair_score"]:
                continue

            pairs.append(
                {
                    "current": current,
                    "successor": successor,
                    "current_precedes_successor": True,
                    "same_source_pdf_page": page_gap == 0,
                    "source_pdf_page_gap": page_gap,
                    "pair_score": round(score, 6),
                }
            )

    unique: dict[tuple[int, int, int, int], dict[str, Any]] = {}

    for pair in pairs:
        key = (
            pair["current"]["source_pdf_page"],
            pair["current"]["start_line"],
            pair["successor"]["source_pdf_page"],
            pair["successor"]["start_line"],
        )
        current = unique.get(key)

        if current is None or pair["pair_score"] > current["pair_score"]:
            unique[key] = pair

    return sorted(
        unique.values(),
        key=lambda item: (
            -item["pair_score"],
            item["source_pdf_page_gap"],
            item["current"]["source_pdf_page"],
            item["current"]["start_line"],
        ),
    )


def public_anchor(anchor: dict[str, Any]) -> dict[str, Any]:
    return {
        "source_pdf_page": anchor["source_pdf_page"],
        "printed_page": anchor["printed_page"],
        "start_line": anchor["start_line"],
        "end_line": anchor["end_line"],
        "anchor_type": anchor["anchor_type"],
        "paragraph_number": anchor["paragraph_number"],
        "block_line_count": anchor["block_line_count"],
        "front_matter_like": anchor["front_matter_like"],
        "exact_title_contained": anchor["exact_title_contained"],
        "significant_token_coverage": anchor["significant_token_coverage"],
        "distinctive_token_coverage": anchor["distinctive_token_coverage"],
        "ordered_token_ratio": anchor["ordered_token_ratio"],
        "sequence_ratio": anchor["sequence_ratio"],
        "page_distance_from_hint": anchor["page_distance_from_hint"],
        "anchor_score": anchor["anchor_score"],
    }


def public_pair(pair: dict[str, Any]) -> dict[str, Any]:
    return {
        "current": public_anchor(pair["current"]),
        "successor": public_anchor(pair["successor"]),
        "current_precedes_successor": pair["current_precedes_successor"],
        "same_source_pdf_page": pair["same_source_pdf_page"],
        "source_pdf_page_gap": pair["source_pdf_page_gap"],
        "pair_score": pair["pair_score"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--downloads", required=True, type=Path)
    parser.add_argument("--private-output", required=True, type=Path)
    args = parser.parse_args()

    downloads = args.downloads.expanduser().resolve()
    private_output = args.private_output.expanduser().resolve()

    policy = read_json(PATHS["policy"])
    manifest = read_json(PATHS["manifest"])
    worklist = read_json(PATHS["worklist"])
    inspection_packets = read_json(PATHS["inspection_packets"])
    audit = read_json(PATHS["audit"])
    progress = read_json(PATHS["progress"])
    integration = read_json(PATHS["integration"])
    rules = policy["discovery_rules"]

    target_packet_ids = set(policy["target"]["packet_ids"])
    target_packets = [
        packet
        for packet in inspection_packets["packets"]
        if packet["packet_id"] in target_packet_ids
    ]
    target_worklist = [
        item
        for item in worklist["items"]
        if item["packet_id"] in target_packet_ids
    ]
    inspection_by_id = {
        item["inspection_id"]: item
        for packet in target_packets
        for item in packet["items"]
    }
    packet_by_id = {
        packet["packet_id"]: packet
        for packet in target_packets
    }

    if len(target_worklist) != 88 or len(inspection_by_id) != 88:
        raise RuntimeError(
            "The no-anchor target corpus must contain exactly 88 items."
        )

    works = {
        work["book_id"]: work
        for work in manifest["works"]
        if work["book_id"] in {1, 2, 3, 4, 5}
    }
    books: dict[int, dict[str, Any]] = {}
    source_paths = {}

    for book_id in (1, 2, 3, 4, 5):
        work = works[book_id]
        pdf_path = resolve_pdf(downloads, work)
        books[book_id] = extract_book(
            pdf_path,
            work["pdf_page_count"],
            rules,
        )
        source_paths[str(book_id)] = str(pdf_path)

    packet_bounds: dict[str, dict[str, Any]] = {}

    for packet in target_packets:
        lower, upper, printed_hints = packet_pdf_bounds(
            packet,
            books[packet["book_id"]],
            rules,
        )
        packet_bounds[packet["packet_id"]] = {
            "lower_pdf_page": lower,
            "upper_pdf_page": upper,
            "printed_page_hints": printed_hints,
        }

    public_items = []
    private_items = []
    status_counts = Counter()
    book_counts = Counter()
    packet_counts = Counter()
    current_candidate_counts = []
    successor_candidate_counts = []
    pair_candidate_counts = []

    for baseline in sorted(
        target_worklist,
        key=lambda item: (
            item["book_id"],
            item["segment_order"],
        ),
    ):
        inspection = inspection_by_id.get(baseline["inspection_id"])

        if inspection is None:
            raise RuntimeError(
                baseline["inspection_id"] + ": inspection item not found."
            )

        successor = (inspection.get("context") or {}).get("successor")

        if not isinstance(successor, dict) or not isinstance(
            successor.get("display_title"),
            str,
        ):
            raise RuntimeError(
                baseline["segment_key"] + ": canonical successor is missing."
            )

        book = books[baseline["book_id"]]
        bounds = packet_bounds[baseline["packet_id"]]
        hints = item_printed_hints(inspection)
        current_hint_pages = sorted(
            {
                page
                for value in [hints["previous"], hints["current"]]
                if (page := printed_to_pdf(book, value)) is not None
            }
        )
        successor_hint_pages = sorted(
            {
                page
                for value in [hints["current"], hints["successor"]]
                if (page := printed_to_pdf(book, value)) is not None
            }
        )
        current_title = baseline["display_title"]
        successor_title = successor["display_title"]
        current_candidates = discover_anchors(
            current_title,
            book,
            bounds["lower_pdf_page"],
            bounds["upper_pdf_page"],
            current_hint_pages,
            rules,
        )
        successor_candidates = discover_anchors(
            successor_title,
            book,
            bounds["lower_pdf_page"],
            bounds["upper_pdf_page"],
            successor_hint_pages,
            rules,
        )
        pairs = build_pairs(
            current_candidates,
            successor_candidates,
            rules,
        )
        public_pairs = pairs[: rules["maximum_public_pair_candidates"]]
        selected = pairs[0] if pairs else None
        score_gap = (
            round(pairs[0]["pair_score"] - pairs[1]["pair_score"], 6)
            if len(pairs) > 1
            else None
        )
        ambiguous = (
            len(pairs) > 1
            and score_gap is not None
            and score_gap < rules["ambiguous_pair_score_gap"]
            and (
                pairs[0]["current"]["source_pdf_page"],
                pairs[0]["current"]["start_line"],
                pairs[0]["successor"]["source_pdf_page"],
                pairs[0]["successor"]["start_line"],
            )
            != (
                pairs[1]["current"]["source_pdf_page"],
                pairs[1]["current"]["start_line"],
                pairs[1]["successor"]["source_pdf_page"],
                pairs[1]["successor"]["start_line"],
            )
        )

        if selected is None:
            corpus_status = "anchor-evidence-incomplete-not-reviewed"
        elif ambiguous:
            corpus_status = "anchor-evidence-ambiguous-not-reviewed"
        else:
            corpus_status = "anchor-evidence-prepared-not-reviewed"

        corpus_item_id = hashlib.sha256(
            (
                policy["policy_version"]
                + "|"
                + baseline["decision_id"]
            ).encode("utf-8")
        ).hexdigest()[:24]

        public_item = {
            "discovery_item_id": corpus_item_id,
            "decision_id": baseline["decision_id"],
            "inspection_id": baseline["inspection_id"],
            "packet_id": baseline["packet_id"],
            "run_id": baseline["run_id"],
            "book_id": baseline["book_id"],
            "book_slug": baseline["book_slug"],
            "segment_key": baseline["segment_key"],
            "segment_order": baseline["segment_order"],
            "current_title": current_title,
            "successor_segment_key": successor["segment_key"],
            "successor_title": successor_title,
            "inspection_lane": baseline["inspection_lane"],
            "packet_search_bounds": bounds,
            "printed_page_hints": hints,
            "corpus_status": corpus_status,
            "current_anchor_candidate_count": len(current_candidates),
            "successor_anchor_candidate_count": len(successor_candidates),
            "pair_candidate_count": len(pairs),
            "public_pair_candidate_count": len(public_pairs),
            "pair_score_gap": score_gap,
            "pair_ambiguous": ambiguous,
            "selected_pair": public_pair(selected) if selected else None,
            "pair_candidates": [public_pair(pair) for pair in public_pairs],
            "review_questions": policy["review_questions"],
            "manual_review_required": True,
            "manual_review_completed": False,
            "selected_decision": None,
            "reviewer_confidence": None,
            "boundary_decision_recorded": False,
            "boundary_approved": False,
            "source_text_included": False,
            "source_excerpt_included": False,
            "database_change_applied": False,
            "content_approved": False,
            "content_loaded": False,
            "cutover_enabled": False,
        }

        private_item = {
            "discovery_item_id": corpus_item_id,
            "decision_id": baseline["decision_id"],
            "inspection_id": baseline["inspection_id"],
            "packet_id": baseline["packet_id"],
            "book_id": baseline["book_id"],
            "segment_key": baseline["segment_key"],
            "current_title": current_title,
            "successor_title": successor_title,
            "packet_search_bounds": bounds,
            "printed_page_hints": hints,
            "corpus_status": corpus_status,
            "pair_score_gap": score_gap,
            "pair_ambiguous": ambiguous,
            "current_anchor_candidates": current_candidates,
            "successor_anchor_candidates": successor_candidates,
            "pair_candidates": public_pairs and pairs[: rules["maximum_public_pair_candidates"]] or [],
        }

        public_items.append(public_item)
        private_items.append(private_item)
        status_counts[corpus_status] += 1
        book_counts[str(baseline["book_id"])] += 1
        packet_counts[baseline["packet_id"]] += 1
        current_candidate_counts.append(len(current_candidates))
        successor_candidate_counts.append(len(successor_candidates))
        pair_candidate_counts.append(len(pairs))

    generated_at = (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )
    input_hashes = {
        "worklist_sha256": sha256(PATHS["worklist"]),
        "inspection_packets_sha256": sha256(PATHS["inspection_packets"]),
        "pending_audit_sha256": sha256(PATHS["audit"]),
        "progress_sha256": sha256(PATHS["progress"]),
        "pr0041_integration_sha256": sha256(PATHS["integration"]),
    }
    corpus = {
        "schema_version": 1,
        "status": "no-anchor-discovery-corpus-prepared-not-reviewed",
        "policy_version": policy["policy_version"],
        "run_id": worklist["run_id"],
        "rights_status": "blocked",
        "contains_full_text": False,
        "contains_source_excerpt": False,
        "generated_at": generated_at,
        "input_hashes": input_hashes,
        "totals": {
            "packet_count": 8,
            "item_count": 88,
            "evidence_prepared_count": status_counts[
                "anchor-evidence-prepared-not-reviewed"
            ],
            "evidence_ambiguous_count": status_counts[
                "anchor-evidence-ambiguous-not-reviewed"
            ],
            "evidence_incomplete_count": status_counts[
                "anchor-evidence-incomplete-not-reviewed"
            ],
            "items_with_current_anchor_candidates": sum(
                count > 0 for count in current_candidate_counts
            ),
            "items_with_successor_anchor_candidates": sum(
                count > 0 for count in successor_candidate_counts
            ),
            "items_with_pair_candidates": sum(
                count > 0 for count in pair_candidate_counts
            ),
            "items_without_pair_candidates": sum(
                count == 0 for count in pair_candidate_counts
            ),
            "manual_review_completed_count": 0,
            "review_decision_count": 0,
            "cumulative_progress_change_count": 0,
            "boundary_approved_count": 0,
            "database_change_count": 0,
        },
        "counts_by_book": dict(
            sorted(book_counts.items(), key=lambda item: int(item[0]))
        ),
        "counts_by_packet": dict(sorted(packet_counts.items())),
        "sources": [
            {
                "book_id": book_id,
                "book_slug": works[book_id]["slug"],
                "source_file": works[book_id]["source_file"],
                "source_sha256": works[book_id]["source_sha256"],
                "pdf_page_count": works[book_id]["pdf_page_count"],
                "detected_printed_page_offset": books[book_id]["median_offset"],
            }
            for book_id in (1, 2, 3, 4, 5)
        ],
        "items": public_items,
        "preparation_boundary": policy["preparation_boundary"],
    }
    private = {
        "schema_version": 1,
        "status": "private-no-anchor-discovery-evidence",
        "warning": "Gitignored private evidence. Do not commit or redistribute.",
        "generated_at": generated_at,
        "source_paths": source_paths,
        "input_hashes": input_hashes,
        "items": private_items,
    }

    report_lines = [
        "# No-Anchor Discovery Corpus",
        "",
        "- Status: `no-anchor-discovery-corpus-prepared-not-reviewed`",
        f"- Policy version: `{policy['policy_version']}`",
        f"- Migration run ID: `{worklist['run_id']}`",
        "- Target packets: `8`",
        "- Target items: `88`",
        f"- Evidence prepared: `{corpus['totals']['evidence_prepared_count']}`",
        f"- Evidence ambiguous: `{corpus['totals']['evidence_ambiguous_count']}`",
        f"- Evidence incomplete: `{corpus['totals']['evidence_incomplete_count']}`",
        f"- Items with current-anchor candidates: `{corpus['totals']['items_with_current_anchor_candidates']}`",
        f"- Items with successor-anchor candidates: `{corpus['totals']['items_with_successor_anchor_candidates']}`",
        f"- Items with pair candidates: `{corpus['totals']['items_with_pair_candidates']}`",
        f"- Items without pair candidates: `{corpus['totals']['items_without_pair_candidates']}`",
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
            for book_id, count in sorted(
                book_counts.items(),
                key=lambda item: int(item[0]),
            )
        ],
        "",
        "## Counts by packet",
        "",
        "| Packet | Items |",
        "| --- | ---: |",
        *[
            f"| {packet_id} | {count} |"
            for packet_id, count in sorted(packet_counts.items())
        ],
        "",
        "## Discovery method",
        "",
        "The corpus ranks semantic anchor blocks from canonical local PDFs using title-token coverage, ordered-token similarity, paragraph numbering, heading signals, printed-page proximity, and front-matter penalties.",
        "",
        "Matched source text remains only in ignored private evidence.",
        "",
        "## Workflow boundary",
        "",
        "This PR prepares evidence only. It records no editorial decision and leaves cumulative progress at 54 reviewed, 2 unresolved, and 88 pending.",
        "",
    ]
    private_lines = [
        "VEREDA — PRIVATE NO-ANCHOR DISCOVERY CORPUS",
        "",
        "PRIVATE REVIEW MATERIAL",
        "Do not commit or redistribute this file.",
        "",
        f"Generated at: {generated_at}",
        f"Target items: {len(private_items)}",
        "",
    ]

    for index, item in enumerate(private_items, start=1):
        private_lines.extend(
            [
                "=" * 72,
                f"CASE {index}: {item['current_title']}",
                "=" * 72,
                f"Book ID: {item['book_id']}",
                f"Packet: {item['packet_id']}",
                f"Segment key: {item['segment_key']}",
                f"Expected successor: {item['successor_title']}",
                f"Status: {item['corpus_status']}",
                f"Printed-page hints: {item['printed_page_hints']}",
                f"Search bounds: {item['packet_search_bounds']}",
                f"Current candidates: {len(item['current_anchor_candidates'])}",
                f"Successor candidates: {len(item['successor_anchor_candidates'])}",
                f"Pair candidates: {len(item['pair_candidates'])}",
                f"Ambiguous: {item['pair_ambiguous']}",
                "",
            ]
        )

        for candidate_index, pair in enumerate(item["pair_candidates"], start=1):
            private_lines.extend(
                [
                    "-" * 72,
                    f"PAIR CANDIDATE {candidate_index}",
                    "-" * 72,
                    f"Pair score: {pair['pair_score']}",
                    f"Page gap: {pair['source_pdf_page_gap']}",
                    "CURRENT ANCHOR",
                    f"PDF page: {pair['current']['source_pdf_page']}",
                    f"Printed page: {pair['current']['printed_page']}",
                    f"Anchor type: {pair['current']['anchor_type']}",
                    f"Paragraph number: {pair['current']['paragraph_number']}",
                    f"Anchor score: {pair['current']['anchor_score']}",
                    *["  " + line for line in pair["current"]["block_lines"]],
                    "",
                    "SUCCESSOR ANCHOR",
                    f"PDF page: {pair['successor']['source_pdf_page']}",
                    f"Printed page: {pair['successor']['printed_page']}",
                    f"Anchor type: {pair['successor']['anchor_type']}",
                    f"Paragraph number: {pair['successor']['paragraph_number']}",
                    f"Anchor score: {pair['successor']['anchor_score']}",
                    *["  " + line for line in pair["successor"]["block_lines"]],
                    "",
                ]
            )

        if not item["pair_candidates"]:
            private_lines.extend(
                [
                    "TOP CURRENT ANCHORS",
                    *[
                        json.dumps(
                            candidate,
                            ensure_ascii=False,
                            indent=2,
                        )
                        for candidate in item["current_anchor_candidates"][:3]
                    ],
                    "",
                    "TOP SUCCESSOR ANCHORS",
                    *[
                        json.dumps(
                            candidate,
                            ensure_ascii=False,
                            indent=2,
                        )
                        for candidate in item["successor_anchor_candidates"][:3]
                    ],
                    "",
                ]
            )

    write_json(PATHS["corpus"], corpus)
    write_json(PATHS["private"], private)
    PATHS["report"].parent.mkdir(parents=True, exist_ok=True)
    PATHS["report"].write_text(
        "\n".join(report_lines) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    private_output.parent.mkdir(parents=True, exist_ok=True)
    private_output.write_text(
        "\n".join(private_lines) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    print("Prepared the 88-item no-anchor discovery corpus.")
    print(
        "Evidence prepared: "
        + str(corpus["totals"]["evidence_prepared_count"])
        + "."
    )
    print(
        "Evidence ambiguous: "
        + str(corpus["totals"]["evidence_ambiguous_count"])
        + "."
    )
    print(
        "Evidence incomplete: "
        + str(corpus["totals"]["evidence_incomplete_count"])
        + "."
    )
    print("Manual decisions: 0.")
    print("Cumulative progress changes: 0.")
    print("Database changes: 0.")


if __name__ == "__main__":
    main()
