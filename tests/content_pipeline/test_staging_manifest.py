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
    / "build_staging_manifest.py"
)

SPEC = importlib.util.spec_from_file_location(
    "build_staging_manifest",
    MODULE_PATH,
)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class StagingManifestTests(unittest.TestCase):
    def test_manifest_remains_blocked(self) -> None:
        manifest = MODULE.build_manifest()

        self.assertEqual(
            manifest["status"],
            "blocked-not-applied",
        )
        self.assertFalse(
            manifest["production_mutation_allowed"]
        )
        self.assertFalse(
            manifest["cutover_allowed"]
        )

    def test_manifest_contains_five_books(self) -> None:
        manifest = MODULE.build_manifest()

        self.assertEqual(
            manifest["totals"]["book_count"],
            5,
        )

    def test_reader_terminology_is_separated(
        self,
    ) -> None:
        terminology = MODULE.build_manifest()[
            "terminology"
        ]

        self.assertEqual(
            terminology["legacy_database_unit"],
            "section",
        )
        self.assertEqual(
            terminology["canonical_source_unit"],
            "editorial_node",
        )
        self.assertEqual(
            terminology["future_reader_unit"],
            "reading_segment",
        )
        self.assertEqual(
            terminology[
                "primary_navigation_action"
            ],
            "Continuar",
        )


if __name__ == "__main__":
    unittest.main()
