from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

SHA256_LEGACY_CRLF_V1 = "sha256-legacy-crlf-v1"
SHA256_CANONICAL_JSON_V1 = "sha256-canonical-json-v1"


def sha256_raw(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as handle:
        for chunk in iter(
            lambda: handle.read(1024 * 1024),
            b"",
        ):
            digest.update(chunk)

    return digest.hexdigest()


def normalize_legacy_crlf_text(text: str) -> str:
    return (
        text.replace("\r\n", "\n")
        .replace("\r", "\n")
        .replace("\n", "\r\n")
    )


# Immutable PR-0041 through PR-0044 evidence was recorded from
# CRLF-normalized working-tree bytes. Keep this compatibility helper scoped to
# those historical evidence fields instead of rewriting substantive artifacts.
def sha256_legacy_crlf(path: Path) -> str:
    return hashlib.sha256(
        normalize_legacy_crlf_text(
            path.read_text(encoding="utf-8")
        ).encode("utf-8")
    ).hexdigest()


def normalize_json_number(value: Any) -> Any:
    if isinstance(value, float) and value.is_integer():
        return int(value)

    return value


def canonicalize_json(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: canonicalize_json(value[key])
            for key in sorted(value)
        }

    if isinstance(value, list):
        return [
            canonicalize_json(item)
            for item in value
        ]

    return normalize_json_number(value)


def canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(
        canonicalize_json(value),
        ensure_ascii=False,
        separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")


def canonical_json_sha256(path: Path) -> str:
    return hashlib.sha256(
        canonical_json_bytes(
            json.loads(
                path.read_text(encoding="utf-8")
            )
        )
    ).hexdigest()
