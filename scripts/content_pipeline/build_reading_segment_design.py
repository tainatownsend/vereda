from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
CONTRACT_PATH = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-design-contract.json"
)
NODE_MANIFEST_PATH = (
    ROOT
    / "content"
    / "migration"
    / "editorial-node-load-manifest.json"
)
NODE_EVIDENCE_PATH = (
    ROOT
    / "content"
    / "migration"
    / "editorial-node-load-evidence.json"
)
SOURCE_MAP_DIR = (
    ROOT / "content" / "structure" / "source-maps"
)
PLAN_DIR = (
    ROOT / "content" / "reconstruction" / "plans"
)
OUTPUT_MANIFEST = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-design-manifest.json"
)
OUTPUT_QUEUE = (
    ROOT
    / "content"
    / "migration"
    / "reading-segment-review-queue.json"
)
OUTPUT_REPORT = (
    ROOT
    / "content"
    / "migration"
    / "reports"
    / "reading-segment-design-summary.md"
)
OUTPUT_LOAD_SQL = (
    ROOT
    / "supabase"
    / "staging"
    / "20260803060000_load_reading_segment_design_v1.sql"
)
OUTPUT_VERIFY_SQL = (
    ROOT
    / "supabase"
    / "audits"
    / "reading_segment_design_verification.sql"
)

BOOK_SLUGS = [
    "o-livro-dos-espiritos",
    "o-livro-dos-mediuns",
    "o-evangelho-segundo-o-espiritismo",
    "o-ceu-e-o-inferno",
    "a-genese",
]

FORBIDDEN_PAYLOAD_KEYS = {
    "content",
    "raw_text",
    "full_text",
    "excerpt",
    "normalized_content_sha256",
}

DIRECT_INTRO_KINDS = {
    "chapter_intro",
    "part_intro",
}


def read_json(path: Path) -> Any:
    return json.loads(
        path.read_text(encoding="utf-8")
    )


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as source:
        for chunk in iter(
            lambda: source.read(1024 * 1024),
            b"",
        ):
            digest.update(chunk)

    return digest.hexdigest()


def segment_key(
    run_id: str,
    book_id: int,
    source_key: str,
    proposal_kind: str,
    boundary_version: int = 1,
) -> str:
    value = (
        f"{run_id}:{book_id}:{source_key}:"
        f"{proposal_kind}:v{boundary_version}"
    )
    return hashlib.sha256(
        value.encode("utf-8")
    ).hexdigest()[:24]


def size_band(
    estimated_word_count: int | None,
) -> str:
    if estimated_word_count is None:
        return "unknown"
    if estimated_word_count <= 0:
        return "unknown"
    if estimated_word_count <= 450:
        return "brief"
    if estimated_word_count <= 1200:
        return "standard"
    if estimated_word_count <= 2500:
        return "long"
    return "oversized"


def node_has_direct_intro_signal(
    decisions: list[dict[str, Any]],
) -> bool:
    return any(
        decision.get("current_kind")
        in DIRECT_INTRO_KINDS
        for decision in decisions
    )


def should_create_proposal(
    node: dict[str, Any],
    child_count: int,
    decisions: list[dict[str, Any]],
) -> tuple[bool, str | None]:
    if child_count == 0:
        return True, "leaf-node"

    if node_has_direct_intro_signal(decisions):
        return True, "container-intro-review"

    return False, None


def locator_page(
    locator: dict[str, Any] | None,
) -> int | None:
    if not locator:
        return None

    printed_page = locator.get("printed_page")

    if isinstance(printed_page, int):
        return printed_page

    nested = locator.get("locator")

    if (
        isinstance(nested, dict)
        and nested.get("type")
        in {"printed_page", "pdf_page"}
        and isinstance(nested.get("value"), int)
    ):
        return nested["value"]

    source_pdf_page = locator.get(
        "source_pdf_page"
    )

    if isinstance(source_pdf_page, int):
        return source_pdf_page

    return None


def build_start_locator(
    node: dict[str, Any],
) -> dict[str, Any]:
    return {
        "basis": "canonical-source-map",
        "source_node_id": node["id"],
        "source_pdf_page": node.get(
            "source_pdf_page"
        ),
        "printed_page": node.get(
            "printed_page"
        ),
        "locator": node.get("locator"),
        "boundary_role": "start",
    }


def build_end_locator(
    next_proposal: dict[str, Any] | None,
) -> dict[str, Any]:
    if next_proposal is None:
        return {
            "basis": "end-of-work",
            "exclusive": True,
            "boundary_role": "end",
        }

    return {
        "basis": "next-segment-start",
        "exclusive": True,
        "boundary_role": "end",
        "next_segment_key": next_proposal[
            "segment_key"
        ],
        "next_source_key": next_proposal[
            "source_key"
        ],
        "next_start_locator": next_proposal[
            "start_locator"
        ],
    }


def find_forbidden_keys(
    value: Any,
    path: str = "$",
) -> list[str]:
    found: list[str] = []

    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"

            if key in FORBIDDEN_PAYLOAD_KEYS:
                found.append(child_path)

            found.extend(
                find_forbidden_keys(
                    child,
                    child_path,
                )
            )

    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(
                find_forbidden_keys(
                    child,
                    f"{path}[{index}]",
                )
            )

    return found


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def decisions_by_source_key(
    plan: dict[str, Any],
) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[
        str,
        list[dict[str, Any]],
    ] = defaultdict(list)

    for decision in plan.get(
        "current_section_decisions",
        [],
    ):
        source_key = decision.get(
            "canonical_source_key"
        )

        if source_key:
            grouped[source_key].append(decision)

    return grouped


def legacy_estimate(
    decisions: list[dict[str, Any]],
) -> int | None:
    values = [
        decision.get("stored_word_count")
        for decision in decisions
        if isinstance(
            decision.get("stored_word_count"),
            int,
        )
        and decision["stored_word_count"] >= 0
    ]

    if not values:
        return None

    return sum(values)


def review_reasons(
    proposal: dict[str, Any],
    next_proposal: dict[str, Any] | None,
) -> list[str]:
    reasons: list[str] = []

    if (
        proposal["proposal_kind"]
        == "container-intro-review"
    ):
        reasons.append(
            "container-intro-boundary"
        )

    if locator_page(
        proposal["start_locator"]
    ) is None:
        reasons.append("missing-start-locator")

    if next_proposal is not None:
        current_page = locator_page(
            proposal["start_locator"]
        )
        next_page = locator_page(
            next_proposal["start_locator"]
        )

        if (
            current_page is not None
            and next_page is not None
            and current_page == next_page
        ):
            reasons.append(
                "same-page-successor-boundary"
            )

    actions = set(proposal["legacy_actions"])

    if "split" in actions:
        reasons.append(
            "split-required-by-reconstruction-plan"
        )

    if proposal[
        "legacy_manual_review_required"
    ]:
        reasons.append(
            "manual-reconstruction-review"
        )

    if (
        proposal["estimated_size_band"]
        == "oversized"
    ):
        reasons.append(
            "legacy-word-count-oversized"
        )

    if (
        proposal["legacy_word_count_estimate"]
        is None
    ):
        reasons.append(
            "no-legacy-word-count-estimate"
        )

    return sorted(set(reasons))


def load_inputs() -> dict[str, Any]:
    contract = read_json(CONTRACT_PATH)
    node_manifest = read_json(
        NODE_MANIFEST_PATH
    )
    node_evidence = read_json(
        NODE_EVIDENCE_PATH
    )

    if (
        node_evidence.get("status")
        != "editorial-nodes-verified"
    ):
        raise SystemExit(
            "Editorial-node evidence is not verified."
        )

    if (
        node_manifest.get("run_id")
        != node_evidence.get("run_id")
    ):
        raise SystemExit(
            "Editorial-node manifest/evidence run mismatch."
        )

    return {
        "contract": contract,
        "node_manifest": node_manifest,
        "node_evidence": node_evidence,
    }


def build_design(
    inputs: dict[str, Any],
) -> dict[str, Any]:
    run_id = inputs["node_manifest"]["run_id"]
    proposals: list[dict[str, Any]] = []
    exclusions: list[dict[str, Any]] = []
    book_summaries: list[dict[str, Any]] = []
    source_files: list[dict[str, str]] = []

    for slug in BOOK_SLUGS:
        map_path = SOURCE_MAP_DIR / f"{slug}.json"
        plan_path = PLAN_DIR / f"{slug}.json"
        structure_map = read_json(map_path)
        plan = read_json(plan_path)

        source_files.extend(
            [
                {
                    "path": str(
                        map_path.relative_to(ROOT)
                    ).replace("\\", "/"),
                    "sha256": sha256_file(
                        map_path
                    ),
                },
                {
                    "path": str(
                        plan_path.relative_to(ROOT)
                    ).replace("\\", "/"),
                    "sha256": sha256_file(
                        plan_path
                    ),
                },
            ]
        )

        nodes = sorted(
            structure_map["nodes"],
            key=lambda node: node["order"],
        )
        node_by_id = {
            node["id"]: node
            for node in nodes
        }
        child_counts = Counter(
            node.get("parent_id")
            for node in nodes
            if node.get("parent_id")
        )
        mapped = decisions_by_source_key(
            plan
        )
        book_id = structure_map["book"][
            "book_id"
        ]
        book_proposals: list[
            dict[str, Any]
        ] = []
        book_exclusions = 0

        for node in nodes:
            node_decisions = mapped.get(
                node["source_key"],
                [],
            )
            create, proposal_kind = (
                should_create_proposal(
                    node,
                    child_counts.get(
                        node["id"],
                        0,
                    ),
                    node_decisions,
                )
            )

            if not create:
                exclusions.append(
                    {
                        "book_id": book_id,
                        "book_slug": slug,
                        "source_key": node[
                            "source_key"
                        ],
                        "node_type": node["type"],
                        "canonical_order": node[
                            "order"
                        ],
                        "title": node["title"],
                        "reason": (
                            "structural-container-without-direct-intro-signal"
                        ),
                    }
                )
                book_exclusions += 1
                continue

            estimated_words = legacy_estimate(
                node_decisions
            )
            actions = sorted(
                {
                    decision.get("action")
                    for decision in node_decisions
                    if decision.get("action")
                }
            )
            confidences = sorted(
                {
                    decision.get("confidence")
                    for decision in node_decisions
                    if decision.get("confidence")
                }
            )

            book_proposals.append(
                {
                    "run_id": run_id,
                    "book_id": book_id,
                    "book_slug": slug,
                    "source_key": node[
                        "source_key"
                    ],
                    "source_node_id": node[
                        "id"
                    ],
                    "node_type": node["type"],
                    "canonical_order": node[
                        "order"
                    ],
                    "proposal_kind": proposal_kind,
                    "segment_key": segment_key(
                        run_id,
                        book_id,
                        node["source_key"],
                        proposal_kind,
                    ),
                    "segment_index": 1,
                    "segment_count": 1,
                    "boundary_version": 1,
                    "display_title": node[
                        "title"
                    ],
                    "start_locator": (
                        build_start_locator(node)
                    ),
                    "end_locator": None,
                    "approval_status": (
                        "boundary-review"
                    ),
                    "content_included": False,
                    "legacy_record_count": len(
                        node_decisions
                    ),
                    "legacy_word_count_estimate": (
                        estimated_words
                    ),
                    "estimated_size_band": (
                        size_band(
                            estimated_words
                        )
                    ),
                    "legacy_actions": actions,
                    "legacy_confidences": (
                        confidences
                    ),
                    "legacy_manual_review_required": (
                        any(
                            bool(
                                decision.get(
                                    "manual_review_required"
                                )
                            )
                            for decision in node_decisions
                        )
                    ),
                    "review_reasons": [],
                }
            )

        for index, proposal in enumerate(
            book_proposals,
            start=1,
        ):
            proposal["segment_order"] = index

        for index, proposal in enumerate(
            book_proposals
        ):
            next_proposal = (
                book_proposals[index + 1]
                if index + 1
                < len(book_proposals)
                else None
            )
            proposal["end_locator"] = (
                build_end_locator(
                    next_proposal
                )
            )
            proposal["review_reasons"] = (
                review_reasons(
                    proposal,
                    next_proposal,
                )
            )
            proposal[
                "requires_manual_review"
            ] = bool(
                proposal["review_reasons"]
            )

        proposals.extend(book_proposals)

        size_counts = Counter(
            proposal["estimated_size_band"]
            for proposal in book_proposals
        )
        kind_counts = Counter(
            proposal["proposal_kind"]
            for proposal in book_proposals
        )

        book_summaries.append(
            {
                "book_id": book_id,
                "slug": slug,
                "title": structure_map[
                    "book"
                ]["title"],
                "editorial_node_count": len(
                    nodes
                ),
                "proposal_count": len(
                    book_proposals
                ),
                "structural_container_exclusion_count": (
                    book_exclusions
                ),
                "manual_review_count": sum(
                    1
                    for proposal in book_proposals
                    if proposal[
                        "requires_manual_review"
                    ]
                ),
                "proposal_kind_counts": dict(
                    sorted(
                        kind_counts.items()
                    )
                ),
                "estimated_size_band_counts": (
                    dict(
                        sorted(
                            size_counts.items()
                        )
                    )
                ),
            }
        )

    if len(
        {
            proposal["segment_key"]
            for proposal in proposals
        }
    ) != len(proposals):
        raise SystemExit(
            "Generated duplicate segment keys."
        )

    forbidden = find_forbidden_keys(
        proposals
    )

    if forbidden:
        raise SystemExit(
            "Forbidden payload keys detected: "
            + ", ".join(forbidden)
        )

    return {
        "proposals": proposals,
        "exclusions": exclusions,
        "books": book_summaries,
        "source_files": source_files,
    }


def build_load_sql(
    manifest: dict[str, Any],
) -> str:
    run_id = manifest["run_id"]
    proposals = manifest["proposals"]
    total = len(proposals)
    payload = [
        {
            "book_id": proposal["book_id"],
            "segment_key": proposal[
                "segment_key"
            ],
            "source_key": proposal[
                "source_key"
            ],
            "segment_order": proposal[
                "segment_order"
            ],
            "segment_index": 1,
            "segment_count": 1,
            "boundary_version": 1,
            "start_locator": proposal[
                "start_locator"
            ],
            "end_locator": proposal[
                "end_locator"
            ],
            "display_title": proposal[
                "display_title"
            ],
            "approval_status": (
                "boundary-review"
            ),
        }
        for proposal in proposals
    ]
    payload_json = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
    )
    delimiter = "$vereda_segment_design$"

    if delimiter in payload_json:
        raise SystemExit(
            "Unexpected SQL delimiter collision."
        )

    return f"""begin;

-- ============================================================
-- VEREDA — PR-0018 generated reading-segment design load
--
-- PREPARED FOR REVIEW; NOT APPLIED IN PR-0018.
-- Boundary metadata only.
-- No complete source text.
-- No approved segments.
-- No successor mappings.
-- No dependency snapshot.
-- No production mutation.
-- No cutover.
-- ============================================================

do $vereda_preconditions$
begin
  if (
    select count(*)
    from content_staging.migration_runs
    where id = {sql_literal(run_id)}::uuid
      and status = 'loaded'
      and rights_status = 'blocked'
  ) <> 1 then
    raise exception
      'Verified PR-0017 migration run is unavailable';
  end if;

  if (
    select count(*)
    from content_staging.editorial_nodes
    where run_id = {sql_literal(run_id)}::uuid
  ) <> 826 then
    raise exception
      'Expected 826 verified editorial nodes';
  end if;

  if exists (
    select 1
    from content_staging.reading_segments
  ) then
    raise exception
      'Reading segments must be empty before design load';
  end if;

  if exists (
    select 1
    from content_staging.current_successor_mappings
  ) or exists (
    select 1
    from content_staging.dependency_snapshots
  ) or exists (
    select 1
    from content_staging.dry_run_results
  ) then
    raise exception
      'Downstream migration entities must remain empty';
  end if;

  if (
    select count(*)
    from public.sections
  ) <> 908 then
    raise exception
      'Production section count changed';
  end if;
end;
$vereda_preconditions$;

insert into content_staging.reading_segments (
  run_id,
  book_id,
  segment_key,
  source_key,
  segment_order,
  segment_index,
  segment_count,
  boundary_version,
  start_locator,
  end_locator,
  display_title,
  content,
  word_count,
  normalized_content_sha256,
  approval_status
)
select
  {sql_literal(run_id)}::uuid,
  payload.book_id,
  payload.segment_key,
  payload.source_key,
  payload.segment_order,
  payload.segment_index,
  payload.segment_count,
  payload.boundary_version,
  payload.start_locator,
  payload.end_locator,
  payload.display_title,
  null,
  null,
  null,
  payload.approval_status
from jsonb_to_recordset(
  {delimiter}{payload_json}{delimiter}::jsonb
) as payload (
  book_id integer,
  segment_key text,
  source_key text,
  segment_order integer,
  segment_index integer,
  segment_count integer,
  boundary_version integer,
  start_locator jsonb,
  end_locator jsonb,
  display_title text,
  approval_status text
)
order by
  payload.book_id,
  payload.segment_order;

do $vereda_postconditions$
declare
  v_segment_count bigint;
begin
  select count(*)
  into v_segment_count
  from content_staging.reading_segments
  where run_id = {sql_literal(run_id)}::uuid;

  if v_segment_count <> {total} then
    raise exception
      'Expected {total} segment proposals, inserted %',
      v_segment_count;
  end if;

  if exists (
    select 1
    from content_staging.reading_segments
    where run_id = {sql_literal(run_id)}::uuid
      and (
        approval_status <> 'boundary-review'
        or content is not null
        or word_count is not null
        or normalized_content_sha256 is not null
      )
  ) then
    raise exception
      'PR-0018 design rows must remain content-free and unapproved';
  end if;

  if exists (
    select 1
    from content_staging.current_successor_mappings
  ) or exists (
    select 1
    from content_staging.dependency_snapshots
  ) or exists (
    select 1
    from content_staging.dry_run_results
  ) then
    raise exception
      'PR-0018 cannot populate downstream migration entities';
  end if;
end;
$vereda_postconditions$;

insert into content_staging.migration_audit_events (
  run_id,
  event_type,
  details
)
values (
  {sql_literal(run_id)}::uuid,
  'reading-segment-design-loaded',
  jsonb_build_object(
    'segment_proposal_count',
    {total},
    'boundary_version',
    1,
    'approval_status',
    'boundary-review',
    'contains_full_text',
    false,
    'successor_mapping_count',
    0,
    'dependency_snapshot_count',
    0,
    'cutover_enabled',
    false
  )
);

update content_staging.migration_runs
set
  status = 'reviewing',
  updated_at = now()
where id = {sql_literal(run_id)}::uuid;

commit;
"""


def build_verification_sql(
    manifest: dict[str, Any],
) -> str:
    run_id = manifest["run_id"]
    total = manifest["totals"][
        "segment_proposal_count"
    ]
    book_checks = []

    for book in manifest["books"]:
        book_checks.append(
            f"""select
  'book-{book['book_id']}-segment-count'::text as check_key,
  'blocking'::text as severity,
  (
    select count(*)
    from content_staging.reading_segments
    where run_id = {sql_literal(run_id)}::uuid
      and book_id = {book['book_id']}
  ) = {book['proposal_count']} as passed,
  (
    select count(*)::text
    from content_staging.reading_segments
    where run_id = {sql_literal(run_id)}::uuid
      and book_id = {book['book_id']}
  ) as actual_value,
  jsonb_build_object(
    'expected',
    {book['proposal_count']}
  ) as details"""
        )

    fixed_checks = [
        f"""select
  'migration-run-status'::text as check_key,
  'blocking'::text as severity,
  (
    select status
    from content_staging.migration_runs
    where id = {sql_literal(run_id)}::uuid
  ) = 'reviewing' as passed,
  (
    select status
    from content_staging.migration_runs
    where id = {sql_literal(run_id)}::uuid
  ) as actual_value,
  jsonb_build_object(
    'expected',
    'reviewing'
  ) as details""",
        f"""select
  'reading-segment-total'::text as check_key,
  'blocking'::text as severity,
  (
    select count(*)
    from content_staging.reading_segments
    where run_id = {sql_literal(run_id)}::uuid
  ) = {total} as passed,
  (
    select count(*)::text
    from content_staging.reading_segments
    where run_id = {sql_literal(run_id)}::uuid
  ) as actual_value,
  jsonb_build_object(
    'expected',
    {total}
  ) as details""",
        f"""select
  'boundary-review-only'::text as check_key,
  'blocking'::text as severity,
  not exists (
    select 1
    from content_staging.reading_segments
    where run_id = {sql_literal(run_id)}::uuid
      and approval_status <> 'boundary-review'
  ) as passed,
  (
    select count(*)::text
    from content_staging.reading_segments
    where run_id = {sql_literal(run_id)}::uuid
      and approval_status <> 'boundary-review'
  ) as actual_value,
  jsonb_build_object(
    'expected',
    0
  ) as details""",
        f"""select
  'content-remains-null'::text as check_key,
  'blocking'::text as severity,
  not exists (
    select 1
    from content_staging.reading_segments
    where run_id = {sql_literal(run_id)}::uuid
      and (
        content is not null
        or word_count is not null
        or normalized_content_sha256 is not null
      )
  ) as passed,
  (
    select count(*)::text
    from content_staging.reading_segments
    where run_id = {sql_literal(run_id)}::uuid
      and (
        content is not null
        or word_count is not null
        or normalized_content_sha256 is not null
      )
  ) as actual_value,
  jsonb_build_object(
    'expected',
    0
  ) as details""",
        f"""select
  'editorial-node-references-valid'::text as check_key,
  'blocking'::text as severity,
  not exists (
    select 1
    from content_staging.reading_segments segment
    left join content_staging.editorial_nodes node
      on node.run_id = segment.run_id
     and node.book_id = segment.book_id
     and node.source_key = segment.source_key
    where segment.run_id = {sql_literal(run_id)}::uuid
      and node.source_key is null
  ) as passed,
  (
    select count(*)::text
    from content_staging.reading_segments segment
    left join content_staging.editorial_nodes node
      on node.run_id = segment.run_id
     and node.book_id = segment.book_id
     and node.source_key = segment.source_key
    where segment.run_id = {sql_literal(run_id)}::uuid
      and node.source_key is null
  ) as actual_value,
  jsonb_build_object(
    'expected',
    0
  ) as details""",
        """select
  'successor-mapping-count'::text as check_key,
  'blocking'::text as severity,
  (
    select count(*)
    from content_staging.current_successor_mappings
  ) = 0 as passed,
  (
    select count(*)::text
    from content_staging.current_successor_mappings
  ) as actual_value,
  jsonb_build_object(
    'expected',
    0
  ) as details""",
        """select
  'dependency-snapshot-count'::text as check_key,
  'blocking'::text as severity,
  (
    select count(*)
    from content_staging.dependency_snapshots
  ) = 0 as passed,
  (
    select count(*)::text
    from content_staging.dependency_snapshots
  ) as actual_value,
  jsonb_build_object(
    'expected',
    0
  ) as details""",
        """select
  'dry-run-result-count'::text as check_key,
  'blocking'::text as severity,
  (
    select count(*)
    from content_staging.dry_run_results
  ) = 0 as passed,
  (
    select count(*)::text
    from content_staging.dry_run_results
  ) as actual_value,
  jsonb_build_object(
    'expected',
    0
  ) as details""",
        """select
  'production-section-count'::text as check_key,
  'blocking'::text as severity,
  (
    select count(*)
    from public.sections
  ) = 908 as passed,
  (
    select count(*)::text
    from public.sections
  ) as actual_value,
  jsonb_build_object(
    'expected',
    908,
    'contains_user_identifiers',
    false
  ) as details""",
    ]

    checks = fixed_checks + book_checks

    return """-- ============================================================
-- VEREDA — Reading-segment design verification
--
-- READ-ONLY.
-- This SQL is generated for the future application gate.
-- It is not executed in PR-0018.
-- ============================================================

select
  checks.check_key,
  checks.severity,
  checks.passed,
  checks.actual_value,
  checks.details
from (
""" + "\n\nunion all\n\n".join(checks) + """
) checks
order by checks.check_key;
"""


def build_report(
    manifest: dict[str, Any],
) -> str:
    totals = manifest["totals"]
    lines = [
        "# Reading Segment Design Summary",
        "",
        f"- Status: `{manifest['status']}`",
        f"- Design version: `{manifest['design_version']}`",
        f"- Migration run ID: `{manifest['run_id']}`",
        f"- Editorial nodes reviewed: `{totals['editorial_node_count']}`",
        f"- Segment proposals: `{totals['segment_proposal_count']}`",
        f"- Leaf-node proposals: `{totals['leaf_node_proposal_count']}`",
        f"- Container-intro proposals: `{totals['container_intro_proposal_count']}`",
        f"- Structural containers excluded: `{totals['structural_container_exclusion_count']}`",
        f"- Manual-review proposals: `{totals['manual_review_count']}`",
        "- Full source text included: `false`",
        "- SQL applied: `false`",
        "- Reading segments loaded: `false`",
        "- Successor mappings loaded: `false`",
        "- Dependency snapshots captured: `false`",
        "- Production modified: `false`",
        "- Cutover enabled: `false`",
        "",
        "## Per-work design",
        "",
        "| Work | Editorial nodes | Proposals | Leaf | Intro review | Excluded containers | Manual review |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]

    for book in manifest["books"]:
        kinds = book[
            "proposal_kind_counts"
        ]
        lines.append(
            f"| {book['title']} "
            f"| {book['editorial_node_count']} "
            f"| {book['proposal_count']} "
            f"| {kinds.get('leaf-node', 0)} "
            f"| {kinds.get('container-intro-review', 0)} "
            f"| {book['structural_container_exclusion_count']} "
            f"| {book['manual_review_count']} |"
        )

    lines.extend(
        [
            "",
            "## Estimated size bands",
            "",
            "| Size band | Proposals |",
            "| --- | ---: |",
        ]
    )

    for band, count in manifest[
        "estimated_size_band_counts"
    ].items():
        lines.append(
            f"| {band} | {count} |"
        )

    lines.extend(
        [
            "",
            "## Review reasons",
            "",
            "| Reason | Proposals |",
            "| --- | ---: |",
        ]
    )

    for reason, count in manifest[
        "review_reason_counts"
    ].items():
        lines.append(
            f"| {reason} | {count} |"
        )

    lines.extend(
        [
            "",
            "## Decision",
            "",
            "PR-0018 prepares deterministic boundary proposals and a review backlog.",
            "",
            "The generated SQL remains unapplied. No complete source text, approved Reader segment, legacy successor mapping, dependency snapshot, progress migration, or production cutover is included.",
            "",
        ]
    )

    return "\n".join(lines)


def main() -> None:
    inputs = load_inputs()
    design = build_design(inputs)
    contract = inputs["contract"]
    node_manifest = inputs[
        "node_manifest"
    ]
    proposals = design["proposals"]

    kind_counts = Counter(
        proposal["proposal_kind"]
        for proposal in proposals
    )
    size_counts = Counter(
        proposal["estimated_size_band"]
        for proposal in proposals
    )
    reason_counts = Counter(
        reason
        for proposal in proposals
        for reason in proposal[
            "review_reasons"
        ]
    )
    review_queue = [
        proposal
        for proposal in proposals
        if proposal[
            "requires_manual_review"
        ]
    ]

    manifest: dict[str, Any] = {
        "schema_version": 1,
        "status": "designed-not-applied",
        "design_version": contract[
            "design_version"
        ],
        "run_id": node_manifest["run_id"],
        "rights_status": "blocked",
        "contains_full_text": False,
        "sql_applied": False,
        "production_mutation_allowed": False,
        "cutover_allowed": False,
        "inputs": {
            "contract_path": str(
                CONTRACT_PATH.relative_to(ROOT)
            ).replace("\\", "/"),
            "contract_sha256": sha256_file(
                CONTRACT_PATH
            ),
            "editorial_node_manifest_sha256": (
                sha256_file(
                    NODE_MANIFEST_PATH
                )
            ),
            "editorial_node_evidence_sha256": (
                sha256_file(
                    NODE_EVIDENCE_PATH
                )
            ),
            "source_files": sorted(
                design["source_files"],
                key=lambda entry: entry["path"],
            ),
        },
        "totals": {
            "book_count": 5,
            "editorial_node_count": (
                node_manifest["totals"][
                    "editorial_node_count"
                ]
            ),
            "segment_proposal_count": len(
                proposals
            ),
            "leaf_node_proposal_count": (
                kind_counts.get(
                    "leaf-node",
                    0,
                )
            ),
            "container_intro_proposal_count": (
                kind_counts.get(
                    "container-intro-review",
                    0,
                )
            ),
            "structural_container_exclusion_count": (
                len(design["exclusions"])
            ),
            "manual_review_count": len(
                review_queue
            ),
            "reading_segment_rows_loaded": 0,
            "successor_mapping_count": 0,
            "dependency_snapshot_count": 0,
        },
        "estimated_size_band_counts": dict(
            sorted(size_counts.items())
        ),
        "review_reason_counts": dict(
            sorted(reason_counts.items())
        ),
        "books": design["books"],
        "proposals": proposals,
        "structural_exclusions": design[
            "exclusions"
        ],
        "application_boundary": {
            "generated_sql_only": True,
            "reading_segments_loaded": False,
            "successor_mappings_loaded": False,
            "dependency_snapshot_captured": False,
            "production_tables_modified": False,
            "progress_migrated": False,
            "reading_sessions_rewritten": False,
            "cutover_enabled": False,
        },
    }

    load_sql = build_load_sql(
        manifest
    )
    verify_sql = build_verification_sql(
        manifest
    )

    OUTPUT_LOAD_SQL.write_text(
        load_sql,
        encoding="utf-8",
        newline="\n",
    )
    OUTPUT_VERIFY_SQL.write_text(
        verify_sql,
        encoding="utf-8",
        newline="\n",
    )

    manifest["artifacts"] = {
        "draft_load_sql": str(
            OUTPUT_LOAD_SQL.relative_to(ROOT)
        ).replace("\\", "/"),
        "draft_load_sql_sha256": (
            sha256_bytes(
                load_sql.encode("utf-8")
            )
        ),
        "future_verification_sql": str(
            OUTPUT_VERIFY_SQL.relative_to(
                ROOT
            )
        ).replace("\\", "/"),
        "future_verification_sql_sha256": (
            sha256_bytes(
                verify_sql.encode("utf-8")
            )
        ),
        "review_queue": str(
            OUTPUT_QUEUE.relative_to(ROOT)
        ).replace("\\", "/"),
    }

    queue_document = {
        "schema_version": 1,
        "status": "review-required",
        "design_version": manifest[
            "design_version"
        ],
        "run_id": manifest["run_id"],
        "proposal_count": len(
            review_queue
        ),
        "proposals": review_queue,
    }

    forbidden = find_forbidden_keys(
        {
            "manifest": manifest,
            "review_queue": queue_document,
        }
    )

    if forbidden:
        raise SystemExit(
            "Forbidden keys detected in generated artifacts: "
            + ", ".join(forbidden)
        )

    OUTPUT_MANIFEST.write_text(
        json.dumps(
            manifest,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )
    OUTPUT_QUEUE.write_text(
        json.dumps(
            queue_document,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )
    OUTPUT_REPORT.write_text(
        build_report(manifest) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    print(f"Manifest: {OUTPUT_MANIFEST}")
    print(f"Review queue: {OUTPUT_QUEUE}")
    print(f"Report: {OUTPUT_REPORT}")
    print(f"Draft load SQL: {OUTPUT_LOAD_SQL}")
    print(
        f"Future verification SQL: {OUTPUT_VERIFY_SQL}"
    )
    print()
    print(
        f"Designed {len(proposals)} segment proposals."
    )
    print(
        f"Manual review queue: {len(review_queue)} proposals."
    )
    print(
        "No database operation was executed."
    )


if __name__ == "__main__":
    main()
