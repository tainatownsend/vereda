import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { derivePackage, authoritativeSchema, paths } from '../../scripts/content_pipeline/build_reviewed_boundary_consolidated_application_package.mjs'
import { deriveAuthoritativeSchemaFromMigrations, validateArtifacts, validateHypotheticalApplicationSqlSafety } from '../../scripts/content_pipeline/validate_reviewed_boundary_consolidated_application_package.mjs'

const decisionIds = (records) => records.map((record) => record.decision_id).sort()
const realColumns = authoritativeSchema.columns.map((column) => column.name)
const inventedColumns = ['source_locator', 'source_title', 'source_path', 'section_id', 'subsection_id', 'source_paragraph_index', 'source_hash']
const assertNoUnknownSqlColumns = (sql) => {
  for (const invented of inventedColumns) expect(sql).not.toMatch(new RegExp(`\\b${invented}\\b`))
}

describe('PR-0053 consolidated reviewed-boundary application package', () => {
  it('derives exact public, authorized, and excluded decision counts and distributions', async () => {
    const pkg = await derivePackage()
    expect(pkg.all).toHaveLength(144)
    expect(pkg.authorized).toHaveLength(74)
    expect(pkg.excluded).toHaveLength(70)
    expect(pkg.outcomeDistribution).toEqual({ 'confirm-successor-start': 73, 'retain-intro-segment': 1 })
    expect(pkg.exclusionDistribution).toEqual({ 'adjust-successor-start': 6, 'exclude-structural-heading': 53, unresolved: 11 })
  })

  it('proves disjoint union equality between authorized and excluded records', async () => {
    const pkg = await derivePackage()
    expect(decisionIds([...pkg.authorized, ...pkg.excluded])).toEqual(decisionIds(pkg.all))
    expect(new Set(decisionIds(pkg.authorized)).size).toBe(74)
    expect(new Set(decisionIds(pkg.excluded)).size).toBe(70)
    expect(decisionIds(pkg.authorized).filter((id) => decisionIds(pkg.excluded).includes(id))).toEqual([])
  })

  it('records exact status-only target semantics and blocks executable SQL', async () => {
    const pkg = await derivePackage()
    for (const record of pkg.authorized) {
      expect(record.target_table).toBe('content_staging.reading_segments')
      expect(record.expected_current_approval_status).toBe('boundary-review')
      expect(record.authorized_replacement_approval_status).toBe('content-review')
      expect(record.changed_columns).toEqual(['approval_status'])
      expect(record.unchanged_columns).toEqual(expect.arrayContaining(['run_id', 'book_id', 'segment_key', 'source_key', 'segment_order', 'segment_index', 'segment_count', 'boundary_version', 'start_locator', 'end_locator', 'display_title', 'content', 'word_count', 'normalized_content_sha256', 'created_at', 'updated_at']))
    }
    expect(pkg.packageApproved).toBe(false)
    expect(pkg.missing.map((entry) => entry.authority)).toEqual(expect.arrayContaining(['audit inserts', 'executable idempotency', 'rollback SQL', 'content hash preconditions']))
  })

  it('reconstructs exact reading_segments schema, constraints, trigger, and updated_at behavior', async () => {
    const schema = await deriveAuthoritativeSchemaFromMigrations()
    expect(schema.table).toBe('content_staging.reading_segments')
    expect(realColumns).toEqual(['run_id', 'book_id', 'segment_key', 'source_key', 'segment_order', 'segment_index', 'segment_count', 'boundary_version', 'start_locator', 'end_locator', 'display_title', 'content', 'word_count', 'normalized_content_sha256', 'approval_status', 'created_at', 'updated_at'])
    expect(schema.primary_key).toEqual(['run_id', 'book_id', 'segment_key'])
    expect(schema.unique_constraints).toContainEqual(['run_id', 'book_id', 'segment_order'])
    expect(schema.triggers).toEqual([])
    expect(schema.columns.find((column) => column.name === 'updated_at')?.default).toBe('now()')
    expect(schema.updated_at_behavior).toContain('INSERT only')
    expect(schema.updated_at_behavior).not.toMatch(/automatically changes|automatically updates|database-managed/)
  })

  it('regresses schema classification omissions and invented columns', () => {
    const classification = {
      explicitly_changed: ['approval_status'],
      explicitly_preserved: realColumns.filter((column) => column !== 'approval_status'),
      database_managed: [],
      unavailable_for_comparison: [],
      blocking_authority_missing: [],
    }
    const union = Object.values(classification).flat().sort()
    expect(union).toEqual([...realColumns].sort())
    for (const required of ['source_key', 'segment_index', 'segment_count', 'boundary_version', 'display_title', 'word_count', 'normalized_content_sha256', 'updated_at']) expect(union).toContain(required)
    for (const invented of inventedColumns) expect(union).not.toContain(invented)
    expect(classification.database_managed).toEqual([])
    expect(classification.explicitly_preserved).toContain('updated_at')
    expect(classification.explicitly_changed).not.toContain('updated_at')
  })

  it('rejects unknown columns injected into preflight or postflight SQL', async () => {
    const preflight = await readFile(paths.preflightSql, 'utf8')
    const postflight = await readFile(paths.postflightSql, 'utf8')
    assertNoUnknownSqlColumns(preflight)
    assertNoUnknownSqlColumns(postflight)
    for (const invented of inventedColumns) {
      expect(() => validateHypotheticalApplicationSqlSafety(`${preflight}\nselect rs.${invented} from content_staging.reading_segments rs;`)).toThrow(invented)
      expect(() => validateHypotheticalApplicationSqlSafety(`${postflight}\nselect rs.${invented} from content_staging.reading_segments rs;`)).toThrow(invented)
    }
  })

  it('rejects updated_at mutation or false trigger/database-managed claims', async () => {
    const schema = await deriveAuthoritativeSchemaFromMigrations()
    expect(() => validateHypotheticalApplicationSqlSafety("update content_staging.reading_segments set updated_at = now() where run_id = 'adcff561-8f92-545c-a219-615818a454f4';")).toThrow('updated_at')
    expect(() => validateHypotheticalApplicationSqlSafety("update content_staging.reading_segments set approval_status = 'content-review', updated_at = now();")).toThrow('updated_at')
    expect(schema.triggers).toEqual([])
    expect({ database_managed: [] }.database_managed).toEqual([])
  })

  it('validates generated artifacts independently', async () => {
    await expect(validateArtifacts()).resolves.toMatchObject({ authorized_decisions: 74, excluded_decisions: 70, executable_application_sql_generated: false, schema_columns: 17 })
  })

  it('semantic equality is order independent while missing, extra, duplicate, and overlap mutations fail set checks', async () => {
    const pkg = await derivePackage()
    const authorized = [...pkg.authorized].reverse()
    expect(decisionIds(authorized)).toEqual(decisionIds(pkg.authorized))
    expect(decisionIds(authorized.slice(1))).not.toEqual(decisionIds(pkg.authorized))
    expect(new Set(decisionIds([...authorized, pkg.excluded[0]])).size).toBe(75)
    expect(new Set(decisionIds([...authorized, authorized[0]])).size).toBe(74)
    expect(decisionIds([...pkg.excluded, pkg.authorized[0]])).toContain(pkg.authorized[0].decision_id)
  })
})
