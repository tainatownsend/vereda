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
    / "build_reconstruction_plan.py"
)

SPEC = importlib.util.spec_from_file_location(
    "build_reconstruction_plan",
    MODULE_PATH,
)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class ReconstructionPlanTests(unittest.TestCase):
    def test_selects_full_reconstruction_for_many_splits(
        self,
    ) -> None:
        self.assertEqual(
            MODULE.select_strategy(
                split_count=25,
                review_count=0,
                canonical_only_count=0,
            ),
            "full-staging-reconstruction",
        )

    def test_selects_targeted_reconstruction(
        self,
    ) -> None:
        self.assertEqual(
            MODULE.select_strategy(
                split_count=3,
                review_count=0,
                canonical_only_count=1,
            ),
            "targeted-staging-reconstruction",
        )

    def test_review_blocks_progress_migration(
        self,
    ) -> None:
        decision = MODULE.build_decision(
            "book",
            {
                "current_section_id": 10,
                "current_sec_position": 2,
                "current_kind": "content",
                "current_part_title": None,
                "current_chapter_label": None,
                "current_chapter_title": None,
                "current_section_title": "Unknown",
                "stored_word_count": 100,
                "canonical_node_id": None,
                "canonical_source_key": None,
                "canonical_node_type": None,
                "canonical_title": None,
                "confidence": "unmatched",
                "score": 0.0,
                "recommended_action": "review",
            },
        )

        self.assertEqual(
            decision["progress_strategy"],
            "block-migration",
        )
        self.assertTrue(
            decision["manual_review_required"]
        )
        self.assertIsNone(
            decision["provisional_segment_key"]
        )

    def test_provisional_key_is_deterministic(
        self,
    ) -> None:
        first = MODULE.provisional_segment_key(
            "book",
            "source-key",
        )
        second = MODULE.provisional_segment_key(
            "book",
            "source-key",
        )

        self.assertEqual(first, second)
        self.assertEqual(len(first), 20)


if __name__ == "__main__":
    unittest.main()
