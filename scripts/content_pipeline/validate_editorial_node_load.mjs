import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const manifestPath = path.resolve(
  'content/migration/editorial-node-load-manifest.json',
)
const manifest = JSON.parse(
  await readFile(manifestPath, 'utf8'),
)

const loadSqlPath = path.resolve(
  manifest.artifacts.load_sql,
)
const verificationSqlPath = path.resolve(
  manifest.artifacts.verification_sql,
)
const normalizeNewlines = (value) =>
  value.replace(/\r\n?/g, '\n')

const loadSql = normalizeNewlines(
  await readFile(
    loadSqlPath,
    'utf8',
  ),
)
const verificationSql = normalizeNewlines(
  await readFile(
    verificationSqlPath,
    'utf8',
  ),
)

const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex')

const errors = []

if (manifest.schema_version !== 1) {
  errors.push('schema_version must be 1')
}

if (manifest.status !== 'prepared-not-applied') {
  errors.push(
    'status must be prepared-not-applied before database application',
  )
}

if (manifest.rights_status !== 'blocked') {
  errors.push('rights_status must remain blocked')
}

if (manifest.contains_full_text !== false) {
  errors.push('full text must not be included')
}

if (
  manifest.production_mutation_allowed !== false
) {
  errors.push(
    'production mutation must remain disabled',
  )
}

if (manifest.cutover_allowed !== false) {
  errors.push('cutover must remain disabled')
}

if (manifest.totals?.book_count !== 5) {
  errors.push('exactly five books are required')
}

const summedNodes = (manifest.books || []).reduce(
  (total, book) =>
    total + book.editorial_node_count,
  0,
)

if (
  summedNodes !==
  manifest.totals?.editorial_node_count
) {
  errors.push(
    'per-book node counts do not match the total',
  )
}

for (const key of [
  'reading_segment_count',
  'successor_mapping_count',
  'dependency_snapshot_count',
]) {
  if (manifest.totals?.[key] !== 0) {
    errors.push(`${key} must remain zero`)
  }
}

if (
  sha256(loadSql) !==
  manifest.artifacts.load_sql_sha256
) {
  errors.push('load SQL checksum mismatch')
}

if (
  sha256(verificationSql) !==
  manifest.artifacts.verification_sql_sha256
) {
  errors.push(
    'verification SQL checksum mismatch',
  )
}

for (const marker of [
  'begin;',
  'insert into content_staging.migration_runs',
  'insert into content_staging.editorial_nodes',
  "status = 'loaded'",
  'commit;',
]) {
  if (!loadSql.toLowerCase().includes(marker)) {
    errors.push(
      `load SQL is missing marker: ${marker}`,
    )
  }
}

const forbiddenProductionMutation =
  /\b(?:insert\s+into|update|delete\s+from|truncate|alter\s+table|drop\s+table)\s+public\./i

if (forbiddenProductionMutation.test(loadSql)) {
  errors.push(
    'load SQL contains a production mutation',
  )
}

for (const table of [
  'reading_segments',
  'current_successor_mappings',
  'dependency_snapshots',
  'dry_run_results',
]) {
  const insertion = new RegExp(
    `insert\\s+into\\s+content_staging\\.${table}\\b`,
    'i',
  )

  if (insertion.test(loadSql)) {
    errors.push(
      `load SQL cannot insert into ${table}`,
    )
  }
}

if (
  !verificationSql.includes(
    'from (\n',
  ) ||
  !verificationSql.includes(
    ') checks\norder by checks.check_key;',
  )
) {
  errors.push(
    'verification SQL must order an outer UNION result',
  )
}

for (const book of manifest.books || []) {
  const mapPath = path.resolve(
    'content/structure/source-maps',
    `${book.slug}.json`,
  )
  const structureMap = JSON.parse(
    await readFile(mapPath, 'utf8'),
  )
  const serialized = JSON.stringify(
    structureMap.nodes,
  )

  for (const forbidden of [
    '"content":',
    '"raw_text":',
    '"full_text":',
    '"excerpt":',
  ]) {
    if (serialized.includes(forbidden)) {
      errors.push(
        `${book.slug} contains forbidden key ${forbidden}`,
      )
    }
  }
}

if (errors.length) {
  console.error(
    'Editorial-node load validation failed:',
  )

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}

console.log(
  `Validated ${manifest.totals.editorial_node_count} editorial nodes across five works.`,
)
console.log(
  `Migration run ID: ${manifest.run_id}`,
)
console.log(
  'No full text, reading segments, mappings, dependency snapshots, or production mutations are included.',
)
console.log(
  'Database application has not been performed by this command.',
)
