import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { canonicalJsonSha256, canonicalJsonSha256FromValue } from '../../scripts/content_pipeline/hash_utils.mjs'
import { buildArtifacts, deriveStatusOnlyContract, paths } from '../../scripts/content_pipeline/build_source_review_status_only_contract.mjs'
import { inputHashFieldToPath, validateStatusOnlyContract, validateStatusOnlyContractArtifacts } from '../../scripts/content_pipeline/validate_source_review_status_only_contract.mjs'

const clone = (value) => JSON.parse(JSON.stringify(value))
const baseArtifacts = async () => {
  const derived = await deriveStatusOnlyContract()
  const built = await buildArtifacts()
  return {
    derived,
    contract: clone(built.contract),
    plan: clone(built.plan),
    evidence: clone(built.evidence),
    summary: await readFile(paths.summary, 'utf8'),
    docs: await readFile(paths.docs, 'utf8'),
  }
}
const refreshArtifactHashes = (artifacts) => {
  artifacts.evidence.artifact_hashes.contract_sha256 = canonicalJsonSha256FromValue(artifacts.contract)
  artifacts.evidence.artifact_hashes.eligibility_plan_sha256 = canonicalJsonSha256FromValue(artifacts.plan)
}
const expectRejected = async (mutate, expectedMessage) => {
  const artifacts = await baseArtifacts()
  mutate(artifacts)
  refreshArtifactHashes(artifacts)
  await expect(validateStatusOnlyContractArtifacts(artifacts)).rejects.toThrow(expectedMessage)
}

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

  it('rejects replacement, duplicate ID, and per-record mismatches in the eligibility plan', async () => {
    await expectRejected((artifacts) => {
      artifacts.plan.authorized_decisions[73] = clone(artifacts.plan.authorized_decisions[0])
    }, 'missing eligible decision IDs')
    await expectRejected((artifacts) => {
      artifacts.plan.authorized_decisions[1].decision_id = artifacts.plan.authorized_decisions[0].decision_id
    }, 'duplicate plan decision IDs')
    await expectRejected((artifacts) => {
      artifacts.plan.authorized_decisions[0].segment_key = 'wrong-segment-key'
    }, 'segment_key mismatch')
    await expectRejected((artifacts) => {
      artifacts.plan.authorized_decisions[0].segment_order += 1
    }, 'segment_order mismatch')
    await expectRejected((artifacts) => {
      artifacts.plan.authorized_decisions[0].final_outcome = 'adjust-successor-start'
    }, 'final_outcome mismatch')
    await expectRejected((artifacts) => {
      artifacts.plan.authorized_decisions[0].preserve_start_locator = false
    }, 'preserve_start_locator mismatch')
    await expectRejected((artifacts) => {
      artifacts.plan.authorized_decisions[0].status_transition = 'boundary-review -> boundary-review'
    }, 'status_transition mismatch')
  })

  it('validates exact input hash key mapping and recomputes every recorded input hash', async () => {
    const artifacts = await baseArtifacts()
    expect(Object.keys(inputHashFieldToPath).sort()).toEqual(Object.keys(artifacts.evidence.input_hashes).sort())
    for (const [field, path] of Object.entries(inputHashFieldToPath)) expect(artifacts.evidence.input_hashes[field]).toBe(await canonicalJsonSha256(path))
    await expectRejected((mutated) => {
      delete mutated.evidence.input_hashes.archived_pr0045_pr0046_progress_snapshot_sha256
    }, 'input hash key set mismatch')
    await expectRejected((mutated) => {
      mutated.evidence.input_hashes.unexpected_extra_hash_sha256 = '0'.repeat(64)
    }, 'input hash key set mismatch')
    for (const field of [
      'archived_pr0045_pr0046_progress_snapshot_sha256',
      'pr0048_readiness_policy_sha256',
      'mechanical_application_policy_sha256',
      'mechanical_application_plan_sha256',
      'mechanical_application_evidence_sha256',
      'reading_segment_source_review_pilot_decisions_sha256',
    ]) {
      await expectRejected((mutated) => {
        mutated.evidence.input_hashes[field] = '0'.repeat(64)
      }, `${field}: stale or wrong-artifact hash`)
    }
  })

  it('rejects stale totals, excluded counts, approval scope, rights status, and safety assertions', async () => {
    await expectRejected((artifacts) => { artifacts.evidence.totals.public_decision_count = 143 }, 'evidence totals do not match expected derived totals')
    await expectRejected((artifacts) => { artifacts.contract.excluded_scope['adjust-successor-start'] = 5 }, 'contract excluded counts do not match independently derived records')
    await expectRejected((artifacts) => { artifacts.plan.excluded_counts.unresolved = 10 }, 'plan excluded counts do not match independently derived records')
    await expectRejected((artifacts) => { artifacts.contract.approved_scope.outcome_distribution['confirm-successor-start'] = 72 }, 'contract approved scope does not match independently derived distribution')
    await expectRejected((artifacts) => { artifacts.contract.rights_status = 'blocked' }, 'contract rights_status must be credited-source-edition')
    await expectRejected((artifacts) => { artifacts.evidence.assertions.database_modified = true }, 'database_modified: safety assertion must be false')
    await expectRejected((artifacts) => { delete artifacts.evidence.assertions.cutover_enabled }, 'safety assertion key set mismatch')
  })
})
