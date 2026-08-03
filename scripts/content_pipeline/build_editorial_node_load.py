from __future__ import annotations

import hashlib
import json
import uuid
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
SOURCE_MAP_DIR = (
    ROOT / "content" / "structure" / "source-maps"
)
PLAN_DIR = (
    ROOT / "content" / "reconstruction" / "plans"
)
SNAPSHOT_PATH = (
    ROOT
    / "content"
    / "structure"
    / "current"
    / "snapshot-metadata.json"
)
OUTPUT_MANIFEST = (
    ROOT
    / "content"
    / "migration"
    / "editorial-node-load-manifest.json"
)
OUTPUT_REPORT = (
    ROOT
    / "content"
    / "migration"
    / "reports"
    / "editorial-node-load-preparation.md"
)
OUTPUT_LOAD_SQL = (
    ROOT
    / "supabase"
    / "staging"
    / "20260803050000_load_editorial_nodes_v1.sql"
)
OUTPUT_VERIFY_SQL = (
    ROOT
    / "supabase"
    / "audits"
    / "editorial_node_staging_verification.sql"
)

MIGRATION_VERSION = (
    "2026-08-03-editorial-structure-v1"
)
RUN_NAMESPACE = (
    "https://vereda.app/content-migrations/"
    + MIGRATION_VERSION
)
RUN_ID = str(
    uuid.uuid5(
        uuid.NAMESPACE_URL,
        RUN_NAMESPACE,
    )
)

BOOK_SLUGS = [
    "o-livro-dos-espiritos",
    "o-livro-dos-mediuns",
    "o-evangelho-segundo-o-espiritismo",
    "o-ceu-e-o-inferno",
    "a-genese",
]

FORBIDDEN_FULL_TEXT_KEYS = {
    "content",
    "raw_text",
    "full_text",
    "excerpt",
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


def canonical_bundle_sha256(
    entries: list[dict[str, str]],
) -> str:
    payload = json.dumps(
        sorted(
            entries,
            key=lambda entry: entry["path"],
        ),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")

    return sha256_bytes(payload)


def find_forbidden_keys(
    value: Any,
    path: str = "$",
) -> list[str]:
    matches: list[str] = []

    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"

            if key in FORBIDDEN_FULL_TEXT_KEYS:
                matches.append(child_path)

            matches.extend(
                find_forbidden_keys(
                    child,
                    child_path,
                )
            )

    elif isinstance(value, list):
        for index, child in enumerate(value):
            matches.extend(
                find_forbidden_keys(
                    child,
                    f"{path}[{index}]",
                )
            )

    return matches


def build_source_locator(
    node: dict[str, Any],
) -> dict[str, Any]:
    return {
        "source_node_id": node["id"],
        "source_pdf_page": node[
            "source_pdf_page"
        ],
        "printed_page": node.get(
            "printed_page"
        ),
        "locator": node.get("locator"),
        "depth": node["depth"],
    }


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def load_inputs() -> dict[str, Any]:
    snapshot = read_json(SNAPSHOT_PATH)
    maps: list[dict[str, Any]] = []
    plans: list[dict[str, Any]] = []
    payload: list[dict[str, Any]] = []
    map_checksums: dict[str, str] = {}
    plan_entries: list[dict[str, str]] = []
    book_counts: list[dict[str, Any]] = []

    for slug in BOOK_SLUGS:
        map_path = SOURCE_MAP_DIR / f"{slug}.json"
        plan_path = PLAN_DIR / f"{slug}.json"
        structure_map = read_json(map_path)
        plan = read_json(plan_path)

        if structure_map.get(
            "schema_version"
        ) != 1:
            raise SystemExit(
                f"{slug}: unsupported source-map schema."
            )

        if structure_map.get(
            "review_flags"
        ):
            raise SystemExit(
                f"{slug}: unresolved source-map review flags."
            )

        forbidden = find_forbidden_keys(
            structure_map
        )

        if forbidden:
            raise SystemExit(
                f"{slug}: forbidden full-text keys: "
                + ", ".join(forbidden)
            )

        nodes = structure_map.get("nodes", [])
        total_nodes = structure_map.get(
            "counts",
            {},
        ).get("total_nodes")

        if total_nodes != len(nodes):
            raise SystemExit(
                f"{slug}: total_nodes does not match nodes."
            )

        ids = {
            node["id"]: node
            for node in nodes
        }
        source_keys = {
            node["source_key"]
            for node in nodes
        }

        if len(ids) != len(nodes):
            raise SystemExit(
                f"{slug}: duplicate node IDs."
            )

        if len(source_keys) != len(nodes):
            raise SystemExit(
                f"{slug}: duplicate source keys."
            )

        expected_orders = list(
            range(1, len(nodes) + 1)
        )
        actual_orders = [
            node["order"]
            for node in nodes
        ]

        if actual_orders != expected_orders:
            raise SystemExit(
                f"{slug}: non-contiguous node order."
            )

        id_to_source_key = {
            node["id"]: node["source_key"]
            for node in nodes
        }

        for node in nodes:
            parent_id = node.get("parent_id")

            if (
                parent_id is not None
                and parent_id not in ids
            ):
                raise SystemExit(
                    f"{slug}: missing parent {parent_id}."
                )

        map_checksum = sha256_file(map_path)
        plan_checksum = sha256_file(plan_path)
        map_checksums[slug] = map_checksum
        plan_entries.append(
            {
                "path": str(
                    plan_path.relative_to(ROOT)
                ).replace("\\", "/"),
                "sha256": plan_checksum,
            }
        )

        book = structure_map["book"]

        if plan["book"]["book_id"] != book["book_id"]:
            raise SystemExit(
                f"{slug}: plan and map book IDs differ."
            )

        for node in nodes:
            parent_id = node.get("parent_id")
            payload.append(
                {
                    "book_id": book["book_id"],
                    "source_key": node[
                        "source_key"
                    ],
                    "parent_source_key": (
                        id_to_source_key[parent_id]
                        if parent_id
                        else None
                    ),
                    "node_type": node["type"],
                    "canonical_order": node[
                        "order"
                    ],
                    "label": node.get("label"),
                    "title": node["title"],
                    "source_locator": (
                        build_source_locator(node)
                    ),
                    "source_map_sha256": (
                        map_checksum
                    ),
                }
            )

        book_counts.append(
            {
                "book_id": book["book_id"],
                "slug": slug,
                "title": book["title"],
                "editorial_node_count": len(nodes),
                "source_map_sha256": map_checksum,
                "reconstruction_plan_sha256": (
                    plan_checksum
                ),
            }
        )
        maps.append(structure_map)
        plans.append(plan)

    return {
        "snapshot": snapshot,
        "maps": maps,
        "plans": plans,
        "payload": payload,
        "map_checksums": map_checksums,
        "plan_entries": plan_entries,
        "book_counts": book_counts,
        "plan_bundle_sha256": (
            canonical_bundle_sha256(
                plan_entries
            )
        ),
    }


def build_load_sql(inputs: dict[str, Any]) -> str:
    snapshot = inputs["snapshot"]
    payload = inputs["payload"]
    map_checksums = inputs[
        "map_checksums"
    ]
    plan_bundle_sha256 = inputs[
        "plan_bundle_sha256"
    ]

    payload_json = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
    )
    checksums_json = json.dumps(
        map_checksums,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )

    delimiter = "$vereda_editorial_nodes$"

    if delimiter in payload_json:
        raise SystemExit(
            "Unexpected SQL dollar delimiter collision."
        )

    total_nodes = len(payload)

    return f"""begin;

-- ============================================================
-- VEREDA — PR-0017 canonical editorial-node staging load
--
-- STRUCTURAL METADATA ONLY.
-- No book text is loaded.
-- No reading segments are created.
-- No current-to-successor mappings are created.
-- No dependency snapshot is captured.
-- No production table is modified.
-- No cutover is enabled.
-- ============================================================

do $vereda_preconditions$
begin
  if to_regnamespace('content_staging') is null then
    raise exception 'content_staging schema is missing';
  end if;

  if exists (
    select 1
    from content_staging.migration_runs
  ) then
    raise exception 'PR-0017 requires empty migration_runs';
  end if;

  if exists (
    select 1
    from content_staging.editorial_nodes
  ) or exists (
    select 1
    from content_staging.reading_segments
  ) or exists (
    select 1
    from content_staging.current_successor_mappings
  ) or exists (
    select 1
    from content_staging.dependency_snapshots
  ) or exists (
    select 1
    from content_staging.dry_run_results
  ) or exists (
    select 1
    from content_staging.migration_audit_events
  ) then
    raise exception 'PR-0017 requires completely empty staging tables';
  end if;

  if (
    select count(*)
    from public.sections
  ) <> {snapshot["row_count"]} then
    raise exception 'Production section count changed';
  end if;

  if (
    select count(*)
    from public.books
    where id in (1, 2, 3, 4, 5)
  ) <> 5 then
    raise exception 'Expected five production books';
  end if;
end;
$vereda_preconditions$;

insert into content_staging.migration_runs (
  id,
  migration_version,
  status,
  input_snapshot_sha256,
  reconstruction_plan_sha256,
  source_map_checksums,
  rights_status,
  notes
)
values (
  {sql_literal(RUN_ID)}::uuid,
  {sql_literal(MIGRATION_VERSION)},
  'draft',
  {sql_literal(snapshot["sha256"])},
  {sql_literal(plan_bundle_sha256)},
  {sql_literal(checksums_json)}::jsonb,
  'blocked',
  'Structural metadata only. No full text, reading segments, mappings, progress migration, or cutover.'
);

insert into content_staging.editorial_nodes (
  run_id,
  book_id,
  source_key,
  parent_source_key,
  node_type,
  canonical_order,
  label,
  title,
  source_locator,
  source_map_sha256
)
select
  {sql_literal(RUN_ID)}::uuid,
  payload.book_id,
  payload.source_key,
  payload.parent_source_key,
  payload.node_type,
  payload.canonical_order,
  payload.label,
  payload.title,
  payload.source_locator,
  payload.source_map_sha256
from jsonb_to_recordset(
  {delimiter}{payload_json}{delimiter}::jsonb
) as payload (
  book_id integer,
  source_key text,
  parent_source_key text,
  node_type text,
  canonical_order integer,
  label text,
  title text,
  source_locator jsonb,
  source_map_sha256 text
)
order by
  payload.book_id,
  payload.canonical_order;

do $vereda_postconditions$
declare
  v_node_count bigint;
  v_orphan_count bigint;
begin
  select count(*)
  into v_node_count
  from content_staging.editorial_nodes
  where run_id = {sql_literal(RUN_ID)}::uuid;

  if v_node_count <> {total_nodes} then
    raise exception
      'Expected {total_nodes} editorial nodes, inserted %',
      v_node_count;
  end if;

  select count(*)
  into v_orphan_count
  from content_staging.editorial_nodes child
  left join content_staging.editorial_nodes parent
    on parent.run_id = child.run_id
   and parent.book_id = child.book_id
   and parent.source_key = child.parent_source_key
  where child.run_id = {sql_literal(RUN_ID)}::uuid
    and child.parent_source_key is not null
    and parent.source_key is null;

  if v_orphan_count <> 0 then
    raise exception
      'Editorial hierarchy contains % orphan nodes',
      v_orphan_count;
  end if;

  if exists (
    select 1
    from content_staging.reading_segments
  ) or exists (
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
      'PR-0017 cannot populate downstream staging entities';
  end if;
end;
$vereda_postconditions$;

insert into content_staging.migration_audit_events (
  run_id,
  event_type,
  details
)
values (
  {sql_literal(RUN_ID)}::uuid,
  'editorial-nodes-loaded',
  jsonb_build_object(
    'editorial_node_count',
    {total_nodes},
    'book_count',
    5,
    'contains_full_text',
    false,
    'reading_segment_count',
    0,
    'mapping_count',
    0,
    'cutover_enabled',
    false
  )
);

update content_staging.migration_runs
set
  status = 'loaded',
  updated_at = now()
where id = {sql_literal(RUN_ID)}::uuid;

commit;
"""


def build_verification_sql(
    inputs: dict[str, Any],
) -> tuple[str, list[str], dict[str, str]]:
    total_nodes = len(inputs["payload"])
    snapshot = inputs["snapshot"]
    map_checksums_json = json.dumps(
        inputs["map_checksums"],
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    plan_bundle = inputs[
        "plan_bundle_sha256"
    ]

    checks: list[str] = []
    expected_actual: dict[str, str] = {}
    selects: list[str] = []

    def add_check(
        key: str,
        passed_sql: str,
        actual_sql: str,
        details_sql: str = "'{}'::jsonb",
        expected: str | None = None,
    ) -> None:
        checks.append(key)
        if expected is not None:
            expected_actual[key] = expected

        selects.append(
            f"""select
  {sql_literal(key)}::text as check_key,
  'blocking'::text as severity,
  ({passed_sql}) as passed,
  ({actual_sql})::text as actual_value,
  {details_sql} as details"""
        )

    run_filter = (
        f"id = {sql_literal(RUN_ID)}::uuid"
    )

    add_check(
        "migration-run-count",
        (
            "(select count(*) "
            "from content_staging.migration_runs) = 1"
        ),
        (
            "select count(*) "
            "from content_staging.migration_runs"
        ),
        "jsonb_build_object('expected', 1)",
        "1",
    )
    add_check(
        "migration-run-id",
        (
            "coalesce((select id::text "
            "from content_staging.migration_runs "
            f"where {run_filter}), '') = "
            f"{sql_literal(RUN_ID)}"
        ),
        (
            "select id::text "
            "from content_staging.migration_runs "
            f"where {run_filter}"
        ),
        (
            "jsonb_build_object("
            f"'expected', {sql_literal(RUN_ID)})"
        ),
        RUN_ID,
    )
    add_check(
        "migration-version",
        (
            "coalesce((select migration_version "
            "from content_staging.migration_runs "
            f"where {run_filter}), '') = "
            f"{sql_literal(MIGRATION_VERSION)}"
        ),
        (
            "select migration_version "
            "from content_staging.migration_runs "
            f"where {run_filter}"
        ),
        (
            "jsonb_build_object("
            f"'expected', {sql_literal(MIGRATION_VERSION)})"
        ),
        MIGRATION_VERSION,
    )
    add_check(
        "migration-run-status",
        (
            "coalesce((select status "
            "from content_staging.migration_runs "
            f"where {run_filter}), '') = 'loaded'"
        ),
        (
            "select status "
            "from content_staging.migration_runs "
            f"where {run_filter}"
        ),
        "jsonb_build_object('expected', 'loaded')",
        "loaded",
    )
    add_check(
        "rights-status",
        (
            "coalesce((select rights_status "
            "from content_staging.migration_runs "
            f"where {run_filter}), '') = 'blocked'"
        ),
        (
            "select rights_status "
            "from content_staging.migration_runs "
            f"where {run_filter}"
        ),
        "jsonb_build_object('expected', 'blocked')",
        "blocked",
    )
    add_check(
        "reconstruction-plan-checksum",
        (
            "coalesce((select reconstruction_plan_sha256 "
            "from content_staging.migration_runs "
            f"where {run_filter}), '') = "
            f"{sql_literal(plan_bundle)}"
        ),
        (
            "select reconstruction_plan_sha256 "
            "from content_staging.migration_runs "
            f"where {run_filter}"
        ),
        (
            "jsonb_build_object("
            f"'expected', {sql_literal(plan_bundle)})"
        ),
        plan_bundle,
    )
    add_check(
        "source-map-checksums",
        (
            "coalesce((select source_map_checksums "
            "from content_staging.migration_runs "
            f"where {run_filter}), '{{}}'::jsonb) = "
            f"{sql_literal(map_checksums_json)}::jsonb"
        ),
        (
            "select source_map_checksums::text "
            "from content_staging.migration_runs "
            f"where {run_filter}"
        ),
        (
            "jsonb_build_object("
            "'expected_book_count', 5)"
        ),
    )
    add_check(
        "editorial-node-total",
        (
            "(select count(*) "
            "from content_staging.editorial_nodes "
            f"where run_id = {sql_literal(RUN_ID)}::uuid"
            f") = {total_nodes}"
        ),
        (
            "select count(*) "
            "from content_staging.editorial_nodes "
            f"where run_id = {sql_literal(RUN_ID)}::uuid"
        ),
        (
            "jsonb_build_object("
            f"'expected', {total_nodes})"
        ),
        str(total_nodes),
    )

    for book in inputs["book_counts"]:
        key = (
            f"book-{book['book_id']}-node-count"
        )
        count = book[
            "editorial_node_count"
        ]
        add_check(
            key,
            (
                "(select count(*) "
                "from content_staging.editorial_nodes "
                f"where run_id = {sql_literal(RUN_ID)}::uuid "
                f"and book_id = {book['book_id']}) = {count}"
            ),
            (
                "select count(*) "
                "from content_staging.editorial_nodes "
                f"where run_id = {sql_literal(RUN_ID)}::uuid "
                f"and book_id = {book['book_id']}"
            ),
            (
                "jsonb_build_object("
                f"'expected', {count}, "
                f"'slug', {sql_literal(book['slug'])})"
            ),
            str(count),
        )

    orphan_sql = f"""select count(*)
from content_staging.editorial_nodes child
left join content_staging.editorial_nodes parent
  on parent.run_id = child.run_id
 and parent.book_id = child.book_id
 and parent.source_key = child.parent_source_key
where child.run_id = {sql_literal(RUN_ID)}::uuid
  and child.parent_source_key is not null
  and parent.source_key is null"""

    add_check(
        "editorial-parent-orphans",
        f"({orphan_sql}) = 0",
        orphan_sql,
        "jsonb_build_object('expected', 0)",
        "0",
    )
    add_check(
        "forbidden-locator-keys",
        (
            "(select count(*) "
            "from content_staging.editorial_nodes "
            f"where run_id = {sql_literal(RUN_ID)}::uuid "
            "and source_locator ?| "
            "array['content','raw_text','full_text','excerpt']) = 0"
        ),
        (
            "select count(*) "
            "from content_staging.editorial_nodes "
            f"where run_id = {sql_literal(RUN_ID)}::uuid "
            "and source_locator ?| "
            "array['content','raw_text','full_text','excerpt']"
        ),
        "jsonb_build_object('expected', 0)",
        "0",
    )

    for key, table in [
        (
            "reading-segment-count",
            "reading_segments",
        ),
        (
            "successor-mapping-count",
            "current_successor_mappings",
        ),
        (
            "dependency-snapshot-count",
            "dependency_snapshots",
        ),
        (
            "dry-run-result-count",
            "dry_run_results",
        ),
    ]:
        add_check(
            key,
            (
                f"(select count(*) from content_staging.{table}) = 0"
            ),
            (
                f"select count(*) from content_staging.{table}"
            ),
            "jsonb_build_object('expected', 0)",
            "0",
        )

    add_check(
        "audit-event-count",
        (
            "(select count(*) "
            "from content_staging.migration_audit_events "
            f"where run_id = {sql_literal(RUN_ID)}::uuid "
            "and event_type = 'editorial-nodes-loaded') = 1"
        ),
        (
            "select count(*) "
            "from content_staging.migration_audit_events "
            f"where run_id = {sql_literal(RUN_ID)}::uuid "
            "and event_type = 'editorial-nodes-loaded'"
        ),
        "jsonb_build_object('expected', 1)",
        "1",
    )
    add_check(
        "production-section-count",
        (
            "(select count(*) "
            f"from public.sections) = {snapshot['row_count']}"
        ),
        "select count(*) from public.sections",
        (
            "jsonb_build_object("
            f"'expected', {snapshot['row_count']}, "
            "'contains_user_identifiers', false)"
        ),
        str(snapshot["row_count"]),
    )

    role_access = """(
  has_schema_privilege(
    'anon',
    'content_staging',
    'USAGE'
  )
  or has_schema_privilege(
    'authenticated',
    'content_staging',
    'USAGE'
  )
  or has_schema_privilege(
    'public',
    'content_staging',
    'USAGE'
  )
)"""

    add_check(
        "application-roles-denied",
        f"not {role_access}",
        role_access,
        (
            "jsonb_build_object("
            "'expected_any_access', false)"
        ),
        "false",
    )

    sql = """-- ============================================================
-- VEREDA — PR-0017 editorial-node staging verification
--
-- READ-ONLY.
-- Export the result as CSV.
-- ============================================================

select
  checks.check_key,
  checks.severity,
  checks.passed,
  checks.actual_value,
  checks.details
from (
""" + "\n\nunion all\n\n".join(selects) + """
) checks
order by checks.check_key;
"""

    return sql, checks, expected_actual


def build_report(
    manifest: dict[str, Any],
) -> str:
    lines = [
        "# Editorial Node Staging Load Preparation",
        "",
        f"- Status: `{manifest['status']}`",
        f"- Migration version: `{manifest['migration_version']}`",
        f"- Run ID: `{manifest['run_id']}`",
        f"- Production snapshot rows: `{manifest['production_snapshot']['row_count']}`",
        f"- Editorial nodes prepared: `{manifest['totals']['editorial_node_count']}`",
        f"- Works represented: `{manifest['totals']['book_count']}`",
        "- Full book text included: `false`",
        "- Reading segments prepared: `0`",
        "- Successor mappings prepared: `0`",
        "- Dependency snapshots prepared: `0`",
        "- Production mutation allowed: `false`",
        "- Cutover allowed: `false`",
        "",
        "| Work | Editorial nodes | Source-map SHA-256 |",
        "| --- | ---: | --- |",
    ]

    for book in manifest["books"]:
        lines.append(
            f"| {book['title']} "
            f"| {book['editorial_node_count']} "
            f"| `{book['source_map_sha256']}` |"
        )

    lines.extend(
        [
            "",
            "## Application boundary",
            "",
            "The generated SQL may insert only:",
            "",
            "- one `content_staging.migration_runs` row;",
            "- canonical metadata into `content_staging.editorial_nodes`;",
            "- one staging audit event.",
            "",
            "It must keep the following empty:",
            "",
            "- `content_staging.reading_segments`;",
            "- `content_staging.current_successor_mappings`;",
            "- `content_staging.dependency_snapshots`;",
            "- `content_staging.dry_run_results`.",
            "",
            "Production content, progress, reading sessions, and Reader behavior remain unchanged.",
            "",
        ]
    )

    return "\n".join(lines)


def main() -> None:
    inputs = load_inputs()
    load_sql = build_load_sql(inputs)
    (
        verification_sql,
        required_checks,
        expected_actual,
    ) = build_verification_sql(inputs)

    OUTPUT_LOAD_SQL.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    OUTPUT_VERIFY_SQL.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    OUTPUT_REPORT.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    OUTPUT_LOAD_SQL.write_text(
        load_sql,
        encoding="utf-8",
        newline="\n",
    )
    OUTPUT_VERIFY_SQL.write_text(
        verification_sql,
        encoding="utf-8",
        newline="\n",
    )

    manifest = {
        "schema_version": 1,
        "status": "prepared-not-applied",
        "migration_version": MIGRATION_VERSION,
        "run_id": RUN_ID,
        "rights_status": "blocked",
        "contains_full_text": False,
        "production_mutation_allowed": False,
        "cutover_allowed": False,
        "production_snapshot": {
            "row_count": inputs[
                "snapshot"
            ]["row_count"],
            "sha256": inputs[
                "snapshot"
            ]["sha256"],
        },
        "reconstruction_plan_bundle": {
            "sha256": inputs[
                "plan_bundle_sha256"
            ],
            "files": inputs[
                "plan_entries"
            ],
        },
        "source_map_checksums": inputs[
            "map_checksums"
        ],
        "totals": {
            "book_count": len(
                inputs["book_counts"]
            ),
            "editorial_node_count": len(
                inputs["payload"]
            ),
            "reading_segment_count": 0,
            "successor_mapping_count": 0,
            "dependency_snapshot_count": 0,
        },
        "books": inputs["book_counts"],
        "artifacts": {
            "load_sql": str(
                OUTPUT_LOAD_SQL.relative_to(
                    ROOT
                )
            ).replace("\\", "/"),
            "load_sql_sha256": sha256_bytes(
                load_sql.encode("utf-8")
            ),
            "verification_sql": str(
                OUTPUT_VERIFY_SQL.relative_to(
                    ROOT
                )
            ).replace("\\", "/"),
            "verification_sql_sha256": (
                sha256_bytes(
                    verification_sql.encode(
                        "utf-8"
                    )
                )
            ),
        },
        "verification": {
            "required_check_keys": (
                required_checks
            ),
            "expected_actual_values": (
                expected_actual
            ),
        },
        "application_boundary": {
            "migration_run_rows": 1,
            "editorial_nodes_only": True,
            "reading_segments_loaded": False,
            "successor_mappings_loaded": False,
            "dependency_snapshot_captured": False,
            "dry_run_executed": False,
            "production_tables_modified": False,
            "cutover_enabled": False,
        },
    }

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
    OUTPUT_REPORT.write_text(
        build_report(manifest) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    print(f"Manifest: {OUTPUT_MANIFEST}")
    print(f"Load SQL: {OUTPUT_LOAD_SQL}")
    print(f"Verification SQL: {OUTPUT_VERIFY_SQL}")
    print(f"Report: {OUTPUT_REPORT}")
    print()
    print(
        f"Prepared {len(inputs['payload'])} "
        "canonical editorial nodes."
    )
    print(
        "No database operation was executed."
    )


if __name__ == "__main__":
    main()
