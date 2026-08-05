import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { canonicalJsonSha256, canonicalJsonSha256FromValue } from '../../scripts/content_pipeline/hash_utils.mjs'
import { buildArtifacts, deriveStatusOnlyContract, paths } from '../../scripts/content_pipeline/build_source_review_status_only_contract.mjs'
import { validateStatusOnlyContract } from '../../scripts/content_pipeline/validate_source_review_status_only_contract.mjs'

describe('PR-0049 source-review status-only application contract', () => {
  it('selects exactly the 74 stable status-only candidates', async () => {
    const { eligible, excluded, outcomeDistribution } = await deriveStatusOnlyContract()
    expect(eligible).toHaveLength(74)
    expect(outcomeDistribution).toEqual({ 'confirm-successor-start': 73, 'retain-intro-segment': 1 })
    expect(new Set(eligible.map((r) => `${r.book_id}:${r.segment_key}:${r.segment_order}`)).size).toBe(74)
    expect(eligible.every((r) => r.segment_key && Number.isInteger(r.segment_order))).toBe(true)
    expect(excluded.filter((r) => r.final_outcome === 'adjust-successor-start')).toHaveLength(6)
    expect(excluded.filter((r) => r.final_outcome === 'exclude-structural-heading')).toHaveLength(53)
    expect(excluded.filter((r) => r.final_outcome === 'unresolved')).toHaveLength(11)
  })

  it('authorizes only status advancement and locator/identity preservation', async () => {
    const { contract, plan } = await buildArtifacts()
    expect(contract.status_only_contract_approved).toBe(true)
    expect(contract.authorized_mutation.approval_status).toEqual({ from: 'boundary-review', to: 'content-review' })
    for (const field of ['segment_key', 'segment_order', 'start_locator', 'end_locator', 'user progress', 'reader sessions']) expect(contract.preserved_fields).toContain(field)
    expect(plan.authorized_decisions.every((d) => d.preserve_start_locator && d.preserve_end_locator && d.preserve_segment_identity && d.preserve_segment_order)).toBe(true)
    expect(plan.authorized_decisions.every((d) => d.application_ready === true)).toBe(true)
  })

  it('rejects unknown, duplicate, conflicting, and unsupported claims by independent derivation rules', async () => {
    const { eligible } = await deriveStatusOnlyContract()
    const ids = new Set(eligible.map((r) => r.decision_id))
    expect(ids.has('unknown-outcome')).toBe(false)
    expect(ids.size).toBe(eligible.length)
    expect(eligible.some((r) => ['adjust-successor-start', 'exclude-structural-heading', 'unresolved'].includes(r.final_outcome))).toBe(false)
  })

  it('emits no SQL or database/Supabase connection and validates independently', async () => {
    const result = await validateStatusOnlyContract()
    expect(result.eligible).toBe(74)
    const combined = [paths.contract, paths.plan, paths.evidence, paths.summary, paths.docs].map(async (path) => readFile(path, 'utf8'))
    const text = (await Promise.all(combined)).join('\n')
    expect(text).not.toMatch(/\b(update\s+\w|insert\s+into|delete\s+from|merge\s+into|truncate|alter\s+table|drop\s+table|create\s+function|do\s+\$|psql|createClient|supabase\.co|service_role|postgres:)\b/i)
    expect(text).toContain('No executable SQL was generated or executed')
  })

  it('is deterministic, semantic-hash sensitive, line-ending tolerant, and preserves progress snapshots', async () => {
    const first = await buildArtifacts()
    const firstHash = canonicalJsonSha256FromValue(first.plan)
    const second = await buildArtifacts()
    expect(canonicalJsonSha256FromValue(second.plan)).toBe(firstHash)
    expect(canonicalJsonSha256FromValue({ ...second.plan, application_ready_decision_count: 73 })).not.toBe(firstHash)
    const summary = await readFile(paths.summary, 'utf8')
    const lfHash = await readFile(paths.evidence, 'utf8').then(JSON.parse).then((e) => e.artifact_hashes.eligibility_plan_sha256)
    expect(lfHash).toBe(canonicalJsonSha256FromValue(second.plan))
    expect(summary.replace(/\n/g, '\r\n').replace(/\r\n/g, '\n')).toBe(summary)
    expect(first.evidence.input_hashes.immutable_historical_progress_sha256).toBe(await canonicalJsonSha256(paths.historicalProgress))
    expect(first.evidence.input_hashes.current_cumulative_progress_sha256).toBe(await canonicalJsonSha256(paths.progress))
  })
})
