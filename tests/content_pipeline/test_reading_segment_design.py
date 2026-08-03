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
    / "build_reading_segment_design.py"
)

SPEC = importlib.util.spec_from_file_location(
    "build_reading_segment_design",
    MODULE_PATH,
)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class ReadingSegmentDesignTests(
    unittest.TestCase
):
    def test_segment_key_is_deterministic(
        self,
    ) -> None:
        first = MODULE.segment_key(
            "adcff561-8f92-545c-a219-615818a454f4",
            1,
            "89c605b46f3c6ab9",
            "leaf-node",
        )
        second = MODULE.segment_key(
            "adcff561-8f92-545c-a219-615818a454f4",
            1,
            "89c605b46f3c6ab9",
            "leaf-node",
        )

        self.assertEqual(first, second)
        self.assertEqual(len(first), 24)

    def test_size_bands(
        self,
    ) -> None:
        self.assertEqual(
            MODULE.size_band(None),
            "unknown",
        )
        self.assertEqual(
            MODULE.size_band(450),
            "brief",
        )
        self.assertEqual(
            MODULE.size_band(451),
            "standard",
        )
        self.assertEqual(
            MODULE.size_band(1201),
            "long",
        )
        self.assertEqual(
            MODULE.size_band(2501),
            "oversized",
        )

    def test_leaf_node_creates_proposal(
        self,
    ) -> None:
        create, kind = (
            MODULE.should_create_proposal(
                {"type": "section"},
                0,
                [],
            )
        )

        self.assertTrue(create)
        self.assertEqual(
            kind,
            "leaf-node",
        )

    def test_container_requires_intro_signal(
        self,
    ) -> None:
        create, kind = (
            MODULE.should_create_proposal(
                {"type": "chapter"},
                3,
                [
                    {
                        "current_kind": (
                            "chapter_intro"
                        )
                    }
                ],
            )
        )

        self.assertTrue(create)
        self.assertEqual(
            kind,
            "container-intro-review",
        )

        create_without_signal, _ = (
            MODULE.should_create_proposal(
                {"type": "chapter"},
                3,
                [],
            )
        )

        self.assertFalse(
            create_without_signal
        )


if __name__ == "__main__":
    unittest.main()
