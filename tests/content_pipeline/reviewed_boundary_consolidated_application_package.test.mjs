import { describe, it, expect } from 'vitest'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { paths, forbiddenColumns } from '../../scripts/content_pipeline/reviewed_boundary_consolidated_constants.mjs'
import { deriveDecisionAuthority, reconstructReadingSegmentSchemaFromMigrations, validateArtifacts, validateHypotheticalApplicationSqlSafety } from '../../scripts/content_pipeline/validate_reviewed_boundary_consolidated_application_package.mjs'

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))
const ids = (records) => records.map((record) => record.decision_id).sort()
const baseSql = `create schema if not exists content_staging;
create table if not exists content_staging.reading_segments (
  run_id uuid not null,
  book_id integer not null,
  segment_key text not null check (segment_key ~ '^[a-f0-9]{20,64}$'),
  source_key text not null,
  segment_order integer not null check (segment_order > 0),
  segment_index integer not null default 1 check (segment_index > 0),
  segment_count integer not null default 1 check (segment_count > 0),
  boundary_version integer not null default 1 check (boundary_version > 0),
  start_locator jsonb,
  end_locator jsonb,
  display_title text,
  content text,
  word_count integer check (word_count is null or word_count >= 0),
  normalized_content_sha256 text,
  approval_status text not null default 'draft' check (approval_status in ('draft','boundary-review','content-review','approved','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (run_id, book_id, segment_key),
  unique (run_id, book_id, segment_order)
);
comment on table content_staging.reading_segments is 'test';`
const withMigrations = async (files) => {
  const dir = await mkdtemp(join(tmpdir(), 'pr0053-migrations-'))
  for (const [name, sql] of Object.entries(files)) await writeFile(join(dir, name), sql)
  return { dir }
}

describe('PR-0053 consolidated reviewed-boundary application package', () => {
  it('independently derives exact public, authorized, excluded, and distribution authority', async () => {
    const authority = await deriveDecisionAuthority()
    expect(authority.publicRecords).toHaveLength(144)
    expect(authority.authorized).toHaveLength(74)
    expect(authority.excluded).toHaveLength(70)
    expect(authority.outcomeDistribution).toEqual({ 'confirm-successor-start': 73, 'retain-intro-segment': 1 })
    expect(authority.exclusionDistribution).toEqual({ 'adjust-successor-start': 6, 'exclude-structural-heading': 53, unresolved: 11 })
    expect(ids([...authority.authorized, ...authority.excluded])).toEqual(ids(authority.publicRecords))
  })

  it('independently reconstructs exact schema and updated_at preservation semantics', async () => {
    const schema = await reconstructReadingSegmentSchemaFromMigrations()
    expect(schema.columns.map((column) => column.name)).toEqual(['run_id', 'book_id', 'segment_key', 'source_key', 'segment_order', 'segment_index', 'segment_count', 'boundary_version', 'start_locator', 'end_locator', 'display_title', 'content', 'word_count', 'normalized_content_sha256', 'approval_status', 'created_at', 'updated_at'])
    expect(schema.primary_key).toEqual(['run_id', 'book_id', 'segment_key'])
    expect(schema.unique_constraints).toContainEqual(['run_id', 'book_id', 'segment_order'])
    expect(schema.triggers).toEqual([])
    expect(schema.columns.find((column) => column.name === 'updated_at')?.default).toBe('now()')
    expect(schema.updated_at_behavior).toContain('INSERT only')
  })

  it('validates generated artifacts independently', async () => {
    await expect(validateArtifacts()).resolves.toMatchObject({ authorized_decisions: 74, excluded_decisions: 70, executable_application_sql_generated: false, schema_columns: 17 })
  })

  it('rejects simulated builder defects while historical authority is unchanged', async () => {
    const plan = await readJson(paths.plan)
    const exclusions = await readJson(paths.exclusions)
    const schemaModel = await readJson(paths.schemaModel)
    const policy = await readJson(paths.policy)
    await expect(validateArtifacts({ plan: { ...plan, application_records: plan.application_records.slice(1) } })).rejects.toThrow()
    await expect(validateArtifacts({ plan: { ...plan, application_records: [...plan.application_records, { ...plan.application_records[0], decision_id: exclusions.exclusions[0].decision_id }] } })).rejects.toThrow()
    await expect(validateArtifacts({ plan: { ...plan, application_records: plan.application_records.map((r, i) => i ? r : { ...r, segment_key: '000000000000000000000000' }) } })).rejects.toThrow()
    await expect(validateArtifacts({ plan: { ...plan, application_records: plan.application_records.map((r, i) => i ? r : { ...r, expected_run_id: '00000000-0000-0000-0000-000000000000' }) } })).rejects.toThrow()
    await expect(validateArtifacts({ exclusions: { ...exclusions, exclusions: exclusions.exclusions.map((r, i) => i ? r : { ...r, exclusion_lane: 'unresolved/ineligible' }) } })).rejects.toThrow()
    await expect(validateArtifacts({ evidence: { ...(await readJson(paths.evidence)), authorized_outcome_distribution: { 'confirm-successor-start': 72, 'retain-intro-segment': 2 } } })).rejects.toThrow()
    await expect(validateArtifacts({ policy: { ...policy, column_classification: { ...policy.column_classification, explicitly_preserved: policy.column_classification.explicitly_preserved.filter((column) => column !== 'updated_at') } } })).rejects.toThrow()
    await expect(validateArtifacts({ schemaModel: { ...schemaModel, columns: schemaModel.columns.slice(1) } })).rejects.toThrow()
    await expect(validateArtifacts({ schemaModel: { ...schemaModel, triggers: [{ name: 'fake_updated_at_trigger' }] } })).rejects.toThrow()
    await expect(validateArtifacts({ schemaModel: { ...schemaModel, migrations_scanned: schemaModel.migrations_scanned.slice(0, 1) } })).rejects.toThrow()
  })

  it('rejects unknown columns injected into preflight or postflight SQL and updated_at mutation', async () => {
    const preflight = await readFile(paths.preflightSql, 'utf8')
    const postflight = await readFile(paths.postflightSql, 'utf8')
    for (const invented of forbiddenColumns) {
      expect(() => validateHypotheticalApplicationSqlSafety(`${preflight}\nselect rs.${invented} from content_staging.reading_segments rs;`)).toThrow(invented)
      expect(() => validateHypotheticalApplicationSqlSafety(`${postflight}\nselect rs.${invented} from content_staging.reading_segments rs;`)).toThrow(invented)
    }
    expect(() => validateHypotheticalApplicationSqlSafety("update content_staging.reading_segments set updated_at = now();")).toThrow('updated_at')
    expect(() => validateHypotheticalApplicationSqlSafety("update content_staging.reading_segments set approval_status = 'content-review', updated_at = now();")).toThrow('updated_at')
  })

  it('discovers later migration operations and fails closed on unsupported schema changes', async () => {
    await expect(reconstructReadingSegmentSchemaFromMigrations(await withMigrations({ '001.sql': baseSql, '002.sql': 'alter table content_staging.reading_segments add column extra text;' }))).rejects.toThrow('ALTER TABLE')
    await expect(reconstructReadingSegmentSchemaFromMigrations(await withMigrations({ '001.sql': baseSql, '002.sql': 'alter table content_staging.reading_segments drop column content;' }))).rejects.toThrow('ALTER TABLE')
    await expect(reconstructReadingSegmentSchemaFromMigrations(await withMigrations({ '001.sql': baseSql, '002.sql': 'alter table content_staging.reading_segments alter column updated_at set default clock_timestamp();' }))).rejects.toThrow('ALTER TABLE')
    await expect(reconstructReadingSegmentSchemaFromMigrations(await withMigrations({ '001.sql': baseSql, '002.sql': 'alter table content_staging.reading_segments add constraint c check (word_count >= 0);' }))).rejects.toThrow('ALTER TABLE')
    await expect(reconstructReadingSegmentSchemaFromMigrations(await withMigrations({ '001.sql': baseSql, '002.sql': 'create trigger t before update on content_staging.reading_segments execute function f();' }))).rejects.toThrow('trigger')
    await expect(reconstructReadingSegmentSchemaFromMigrations(await withMigrations({ '001.sql': 'create table unrelated(id integer);' }))).rejects.toThrow('create-table')
    await expect(reconstructReadingSegmentSchemaFromMigrations(await withMigrations({ '001.sql': baseSql, '002.sql': baseSql }))).rejects.toThrow('create-table')
    await expect(reconstructReadingSegmentSchemaFromMigrations(await withMigrations({ '002.sql': 'create table unrelated(id integer);', '001.sql': baseSql }))).resolves.toMatchObject({ migrations_scanned: expect.arrayContaining([expect.stringMatching(/001\.sql$/), expect.stringMatching(/002\.sql$/)]) })
  })
})
