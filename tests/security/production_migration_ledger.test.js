import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const ledger = JSON.parse(readFileSync('supabase/production-migration-ledger.json', 'utf8'))
const migrationFiles = readdirSync('supabase/migrations')

function filenameVersion(path) {
  const name = path.split('/').pop() || ''
  return name.match(/^(\d{14})_/)?.[1] || null
}

describe('production migration reconciliation ledger', () => {
  it('uses one explicit production execution policy', () => {
    expect(ledger.schema_version).toBe(1)
    expect(ledger.canonical_execution_path).toBe('supabase_management_migration')
    expect(ledger.policy.replay_rule).toContain('Reapplying')
  })

  it('maps every applied production version to a committed source artifact', () => {
    const versions = ledger.entries.map((entry) => entry.production_version)
    expect(new Set(versions).size).toBe(versions.length)

    for (const entry of ledger.entries) {
      expect(entry.status).toBe('applied')
      expect(entry.replay).toBe('forbidden')
      expect(entry.production_version).toMatch(/^\d{14}$/)
      expect(entry.source_blob_sha).toMatch(/^[0-9a-f]{40}$/)
      expect(existsSync(entry.repository_source)).toBe(true)
    }
  })

  it('does not mistake repository filename versions for missing production work', () => {
    const appliedVersions = new Set(ledger.entries.map((entry) => entry.production_version))

    for (const entry of ledger.entries.filter((item) => item.repository_source.startsWith('supabase/migrations/'))) {
      const sourceVersion = filenameVersion(entry.repository_source)
      expect(sourceVersion).not.toBeNull()
      expect(sourceVersion).not.toBe(entry.production_version)
      expect(appliedVersions.has(sourceVersion)).toBe(false)
      expect(migrationFiles).toContain(entry.repository_source.split('/').pop())
    }
  })

  it('records all study-journal application-time versions in the applied operational SQL', () => {
    const appliedSql = readFileSync('supabase/staging/study_journal_foundation.applied.sql', 'utf8')
    const journalEntries = ledger.entries.filter((entry) => entry.name.startsWith('study_journal_'))

    expect(journalEntries).toHaveLength(3)
    for (const entry of journalEntries) {
      expect(appliedSql).toContain(entry.production_version)
      expect(entry.repository_source).toBe('supabase/staging/study_journal_foundation.applied.sql')
    }
  })
})
