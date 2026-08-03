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
    / "analyze_reading_segment_resolutions.py"
)

SPEC = importlib.util.spec_from_file_location(
    "analyze_reading_segment_resolutions",
    MODULE_PATH,
)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class ReadingSegmentResolutionTests(
    unittest.TestCase
):
    def test_page_only_locator_has_no_anchor(
        self,
    ) -> None:
        evidence = MODULE.anchor_evidence(
            {
                "locator": {
                    "type": "printed_page",
                    "value": 10,
                }
            }
        )

        self.assertFalse(
            evidence["available"]
        )

    def test_semantic_locator_has_anchor(
        self,
    ) -> None:
        evidence = MODULE.anchor_evidence(
            {
                "locator": {
                    "type": "question",
                    "value": 42,
                }
            }
        )

        self.assertTrue(
            evidence["available"]
        )
        self.assertGreater(
            len(evidence["tokens"]),
            0,
        )

    def test_distinct_anchors_form_candidate(
        self,
    ) -> None:
        current = {
            "available": True,
            "signature": "a",
        }
        successor = {
            "available": True,
            "signature": "b",
        }

        self.assertTrue(
            MODULE.mechanical_candidate(
                {
                    "same-page-successor-boundary"
                },
                current,
                successor,
            )
        )

    def test_structural_reason_blocks_candidate(
        self,
    ) -> None:
        current = {
            "available": True,
            "signature": "a",
        }
        successor = {
            "available": True,
            "signature": "b",
        }

        self.assertFalse(
            MODULE.mechanical_candidate(
                {
                    "same-page-successor-boundary",
                    "manual-reconstruction-review",
                },
                current,
                successor,
            )
        )

    def test_structural_path_has_precedence(
        self,
    ) -> None:
        path, _ = MODULE.resolution_path(
            {
                "same-page-successor-boundary",
                "split-required-by-reconstruction-plan",
            },
            {
                "available": True,
                "signature": "a",
            },
            {
                "available": True,
                "signature": "b",
            },
        )

        self.assertEqual(
            path,
            "structural-review-required",
        )


if __name__ == "__main__":
    unittest.main()
