import { writeFile } from 'node:fs/promises'

const manifest = JSON.parse(
  await BunlessRead(
    'content/migration/reading-segment-design-manifest.json',
  ),
)

async function BunlessRead(filePath) {
  const { readFile } = await import('node:fs/promises')
  return readFile(filePath, 'utf8')
}

const runId = manifest.run_id
const expectedTotal =
  manifest.totals.segment_proposal_count
const expectedBooks = manifest.books.map(
  (book) => ({
    bookId: book.book_id,
    count: book.proposal_count,
  }),
)

const sqlLiteral = (value) =>
  `'${String(value).replaceAll("'", "''")}'`

const checks = []

function addCheck({
  key,
  passed,
  actual,
  details = "'{}'::jsonb",
}) {
  checks.push(`select
  ${sqlLiteral(key)}::text as check_key,
  'blocking'::text as severity,
  (${passed}) as passed,
  (${actual})::text as actual_value,
  ${details} as details`)
}

const runWhere =
  `id = ${sqlLiteral(runId)}::uuid`

addCheck({
  key: 'migration-run-status',
  passed: `coalesce((
    select status
    from content_staging.migration_runs
    where ${runWhere}
  ), '') = 'reviewing'`,
  actual: `select status
    from content_staging.migration_runs
    where ${runWhere}`,
  details:
    "jsonb_build_object('expected', 'reviewing')",
})

addCheck({
  key: 'rights-status',
  passed: `coalesce((
    select rights_status
    from content_staging.migration_runs
    where ${runWhere}
  ), '') = 'blocked'`,
  actual: `select rights_status
    from content_staging.migration_runs
    where ${runWhere}`,
  details:
    "jsonb_build_object('expected', 'blocked')",
})

addCheck({
  key: 'reading-segment-total',
  passed: `(select count(*)
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
  ) = ${expectedTotal}`,
  actual: `select count(*)
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid`,
  details: `jsonb_build_object(
    'expected',
    ${expectedTotal}
  )`,
})

for (const book of expectedBooks) {
  addCheck({
    key: `book-${book.bookId}-segment-count`,
    passed: `(select count(*)
      from content_staging.reading_segments
      where run_id = ${sqlLiteral(runId)}::uuid
        and book_id = ${book.bookId}
    ) = ${book.count}`,
    actual: `select count(*)
      from content_staging.reading_segments
      where run_id = ${sqlLiteral(runId)}::uuid
        and book_id = ${book.bookId}`,
    details: `jsonb_build_object(
      'expected',
      ${book.count}
    )`,
  })
}

addCheck({
  key: 'boundary-review-only',
  passed: `not exists (
    select 1
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
      and approval_status <> 'boundary-review'
  )`,
  actual: `select count(*)
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
      and approval_status <> 'boundary-review'`,
  details: "jsonb_build_object('expected', 0)",
})

addCheck({
  key: 'content-remains-null',
  passed: `not exists (
    select 1
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
      and (
        content is not null
        or word_count is not null
        or normalized_content_sha256 is not null
      )
  )`,
  actual: `select count(*)
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
      and (
        content is not null
        or word_count is not null
        or normalized_content_sha256 is not null
      )`,
  details: "jsonb_build_object('expected', 0)",
})

addCheck({
  key: 'editorial-node-references-valid',
  passed: `not exists (
    select 1
    from content_staging.reading_segments segment
    left join content_staging.editorial_nodes node
      on node.run_id = segment.run_id
     and node.book_id = segment.book_id
     and node.source_key = segment.source_key
    where segment.run_id = ${sqlLiteral(runId)}::uuid
      and node.source_key is null
  )`,
  actual: `select count(*)
    from content_staging.reading_segments segment
    left join content_staging.editorial_nodes node
      on node.run_id = segment.run_id
     and node.book_id = segment.book_id
     and node.source_key = segment.source_key
    where segment.run_id = ${sqlLiteral(runId)}::uuid
      and node.source_key is null`,
  details: "jsonb_build_object('expected', 0)",
})

addCheck({
  key: 'segment-key-uniqueness',
  passed: `(select count(*)
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
  ) = (
    select count(distinct (book_id, segment_key))
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
  )`,
  actual: `select count(*) - count(distinct (book_id, segment_key))
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid`,
  details: "jsonb_build_object('expected_duplicates', 0)",
})

addCheck({
  key: 'segment-order-contiguous',
  passed: `not exists (
    select 1
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
    group by book_id
    having min(segment_order) <> 1
       or max(segment_order) <> count(*)
       or count(distinct segment_order) <> count(*)
  )`,
  actual: `select count(*)
    from (
      select book_id
      from content_staging.reading_segments
      where run_id = ${sqlLiteral(runId)}::uuid
      group by book_id
      having min(segment_order) <> 1
         or max(segment_order) <> count(*)
         or count(distinct segment_order) <> count(*)
    ) invalid_books`,
  details: "jsonb_build_object('expected_invalid_books', 0)",
})

addCheck({
  key: 'start-locators-present',
  passed: `not exists (
    select 1
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
      and start_locator is null
  )`,
  actual: `select count(*)
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
      and start_locator is null`,
  details: "jsonb_build_object('expected', 0)",
})

addCheck({
  key: 'end-locators-present',
  passed: `not exists (
    select 1
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
      and end_locator is null
  )`,
  actual: `select count(*)
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
      and end_locator is null`,
  details: "jsonb_build_object('expected', 0)",
})

addCheck({
  key: 'boundary-version-one',
  passed: `not exists (
    select 1
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
      and boundary_version <> 1
  )`,
  actual: `select count(*)
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
      and boundary_version <> 1`,
  details: "jsonb_build_object('expected', 0)",
})

addCheck({
  key: 'segment-index-count-one',
  passed: `not exists (
    select 1
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
      and (
        segment_index <> 1
        or segment_count <> 1
      )
  )`,
  actual: `select count(*)
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
      and (
        segment_index <> 1
        or segment_count <> 1
      )`,
  details: "jsonb_build_object('expected', 0)",
})

for (const [key, table] of [
  [
    'successor-mapping-count',
    'current_successor_mappings',
  ],
  [
    'dependency-snapshot-count',
    'dependency_snapshots',
  ],
  [
    'dry-run-result-count',
    'dry_run_results',
  ],
]) {
  addCheck({
    key,
    passed: `(select count(*)
      from content_staging.${table}
    ) = 0`,
    actual: `select count(*)
      from content_staging.${table}`,
    details: "jsonb_build_object('expected', 0)",
  })
}

addCheck({
  key: 'audit-event-count',
  passed: `(select count(*)
    from content_staging.migration_audit_events
    where run_id = ${sqlLiteral(runId)}::uuid
      and event_type = 'reading-segment-design-loaded'
  ) = 1`,
  actual: `select count(*)
    from content_staging.migration_audit_events
    where run_id = ${sqlLiteral(runId)}::uuid
      and event_type = 'reading-segment-design-loaded'`,
  details: "jsonb_build_object('expected', 1)",
})

addCheck({
  key: 'production-section-count',
  passed: `(select count(*)
    from public.sections
  ) = 908`,
  actual: `select count(*)
    from public.sections`,
  details: `jsonb_build_object(
    'expected',
    908,
    'contains_user_identifiers',
    false
  )`,
})

const accessExpression = `(
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
)`

addCheck({
  key: 'application-roles-denied',
  passed: `not ${accessExpression}`,
  actual: accessExpression,
  details:
    "jsonb_build_object('expected_any_access', false)",
})

const sql = `-- ============================================================
-- VEREDA — PR-0019 reading-segment staging verification
--
-- READ-ONLY.
-- Export the complete result as CSV.
-- Does not return content or user identifiers.
-- ============================================================

select
  checks.check_key,
  checks.severity,
  checks.passed,
  checks.actual_value,
  checks.details
from (
${checks.join('\n\nunion all\n\n')}
) checks
order by checks.check_key;
`

await writeFile(
  'supabase/audits/reading_segment_staging_application_verification.sql',
  sql,
  'utf8',
)

console.log(
  `Generated ${checks.length} application verification checks.`,
)
