from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = (
    ROOT
    / "scripts"
    / "content_pipeline"
    / "compare_structures.py"
)

SPEC = importlib.util.spec_from_file_location(
    "compare_structures",
    MODULE_PATH,
)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class StructureComparisonTests(unittest.TestCase):
    def test_normalizes_accents_and_labels(self) -> None:
        self.assertEqual(
            MODULE.normalize_text(
                "CAPÍTULO IV — Da Criação"
            ),
            "iv da criacao",
        )

    def test_exact_title_similarity(self) -> None:
        self.assertEqual(
            MODULE.title_similarity(
                "A vida futura",
                "A vida futura",
            ),
            1.0,
        )

    def test_accepts_small_title_variation(self) -> None:
        self.assertGreaterEqual(
            MODULE.title_similarity(
                "Da criação",
                "Da criacao",
            ),
            MODULE.FUZZY_MATCH_THRESHOLD,
        )

    def test_rejects_unrelated_titles(self) -> None:
        self.assertLess(
            MODULE.title_similarity(
                "Da criação",
                "Da lei de liberdade",
            ),
            MODULE.FUZZY_MATCH_THRESHOLD,
        )


if __name__ == "__main__":
    unittest.main()
