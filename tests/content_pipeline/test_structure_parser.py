from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = (
    ROOT
    / "scripts"
    / "content_pipeline"
    / "extract_structure_maps.py"
)

SPEC = importlib.util.spec_from_file_location(
    "extract_structure_maps",
    MODULE_PATH,
)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class StructureParserTests(unittest.TestCase):
    def test_parses_wrapped_chapter_heading(self) -> None:
        value = (
            "Capítulo XIX – Do papel dos médiuns "
            "nas comunicações espíritas . 227"
        )

        self.assertEqual(
            MODULE.parse_chapter_entry(value),
            (
                "XIX",
                "Do papel dos médiuns nas comunicações espíritas",
                227,
            ),
        )

    def test_parses_printed_page_detail(self) -> None:
        title, locator = MODULE.parse_detail_locator(
            "Deus e o infinito: 55",
            "page",
        )

        self.assertEqual(title, "Deus e o infinito")
        self.assertEqual(
            locator,
            {
                "type": "printed_page",
                "value": 55,
            },
        )

    def test_parses_paragraph_range(self) -> None:
        title, locator = MODULE.parse_detail_locator(
            "A vida futura: 1 a 3",
            "paragraph",
        )

        self.assertEqual(title, "A vida futura")
        self.assertEqual(
            locator,
            {
                "type": "paragraph_range",
                "value": "1 a 3",
            },
        )

    def test_repairs_known_pdf_spacing(self) -> None:
        self.assertEqual(
            MODULE.normalize_line(
                "T erceira ordem – Espíritos"
            ),
            "Terceira ordem – Espíritos",
        )


if __name__ == "__main__":
    unittest.main()
