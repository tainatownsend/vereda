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
    / "build_editorial_node_load.py"
)

SPEC = importlib.util.spec_from_file_location(
    "build_editorial_node_load",
    MODULE_PATH,
)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class EditorialNodeLoadTests(unittest.TestCase):
    def test_run_id_is_deterministic(self) -> None:
        self.assertEqual(
            MODULE.RUN_ID,
            MODULE.RUN_ID,
        )
        self.assertEqual(
            len(MODULE.RUN_ID),
            36,
        )

    def test_bundle_checksum_is_order_independent(
        self,
    ) -> None:
        entries = [
            {
                "path": "b.json",
                "sha256": "b" * 64,
            },
            {
                "path": "a.json",
                "sha256": "a" * 64,
            },
        ]

        self.assertEqual(
            MODULE.canonical_bundle_sha256(
                entries
            ),
            MODULE.canonical_bundle_sha256(
                list(reversed(entries))
            ),
        )

    def test_source_locator_has_no_full_text(
        self,
    ) -> None:
        locator = MODULE.build_source_locator(
            {
                "id": "book:chapter:key",
                "source_pdf_page": 6,
                "printed_page": 10,
                "locator": {
                    "type": "printed_page",
                    "value": 10,
                },
                "depth": 1,
            }
        )

        self.assertEqual(
            MODULE.find_forbidden_keys(
                locator
            ),
            [],
        )


if __name__ == "__main__":
    unittest.main()
