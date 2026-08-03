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
    / "triage_reading_segment_reviews.py"
)

SPEC = importlib.util.spec_from_file_location(
    "triage_reading_segment_reviews",
    MODULE_PATH,
)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class ReadingSegmentReviewTriageTests(
    unittest.TestCase
):
    def test_metadata_only_is_deferred(
        self,
    ) -> None:
        self.assertEqual(
            MODULE.disposition_for(
                {
                    "no-legacy-word-count-estimate"
                }
            ),
            "defer-metadata-only",
        )

    def test_structural_reason_has_precedence(
        self,
    ) -> None:
        self.assertEqual(
            MODULE.disposition_for(
                {
                    "same-page-successor-boundary",
                    "manual-reconstruction-review",
                }
            ),
            "manual-structural-review",
        )

    def test_boundary_reason_is_manual(
        self,
    ) -> None:
        self.assertEqual(
            MODULE.disposition_for(
                {
                    "container-intro-boundary"
                }
            ),
            "manual-boundary-review",
        )

    def test_size_reason_is_manual(
        self,
    ) -> None:
        self.assertEqual(
            MODULE.disposition_for(
                {
                    "legacy-word-count-oversized"
                }
            ),
            "manual-size-review",
        )

    def test_batches_are_capped_and_stable(
        self,
    ) -> None:
        items = [
            {
                "priority": "P2",
                "book_id": 1,
                "segment_order": index,
                "segment_key": (
                    f"{index:024x}"[-24:]
                ),
            }
            for index in range(1, 53)
        ]

        batches = MODULE.build_batches(
            items,
            25,
        )

        self.assertEqual(
            [batch["item_count"] for batch in batches],
            [25, 25, 2],
        )
        self.assertEqual(
            batches[0]["batch_id"],
            "p2-book-1-batch-01",
        )


if __name__ == "__main__":
    unittest.main()
