import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { buildArtifacts, deriveLocatorAdjustmentContract, paths } from '../../scripts/content_pipeline/build_source_review_successor_locator_adjustment_contract.mjs'
import { validateArtifacts } from '../../scripts/content_pipeline/validate_source_review_successor_locator_adjustment_contract.mjs'
import { canonicalJsonSha256FromValue } from '../../scripts/content_pipeline/hash_utils.mjs'
const clone = (v) => JSON.parse(JSON.stringify(v))
const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'))

describe('PR-0050 successor locator adjustment contract', () => {
  it('derives exactly six adjust-successor-start decisions and excludes all other outcomes', async () => {
    const d = await deriveLocatorAdjustmentContract()
    expect(d.records.map((r) => r.decision_id)).toEqual(['e473600ca608d57db6a3ea23','e5017ea69081bdcd0c70da11','df9c53a270eea25a6c52bab4','aae34d255521a908694e178e','1961a13f1508773d5a7a233c','06af1c2475d97f65669d306a'])
    expect(d.incomplete).toHaveLength(6)
    expect(d.complete).toHaveLength(0)
  })
  it('validates generated artifacts and exact set equality', async () => {
    await buildArtifacts()
    const args = { contract: await readJson(paths.contract), plan: await readJson(paths.plan), evidence: await readJson(paths.evidence), missing: await readJson(paths.missingAuthority), summary: await readFile(paths.summary, 'utf8'), docs: await readFile(paths.docs, 'utf8') }
    await expect(validateArtifacts(args)).resolves.toMatchObject({ decision_count: 6, approved: false, exact_set_equality: true, incomplete: 6 })
  })
  it('rejects duplicates, invalid ordering, partial approval, invented locators, target columns, mutating SQL, and stale hashes', async () => {
    const args = { contract: await readJson(paths.contract), plan: await readJson(paths.plan), evidence: await readJson(paths.evidence), missing: await readJson(paths.missingAuthority), summary: await readFile(paths.summary, 'utf8'), docs: await readFile(paths.docs, 'utf8') }
    const cases = [
      (a) => { a.plan.records[1].decision_id = a.plan.records[0].decision_id },
      (a) => { a.plan.records[0].successor_segment_order = a.plan.records[0].current_segment_order },
      (a) => { a.plan.locator_mutation_contract_approved = true },
      (a) => { a.plan.records[0].expected_current_locator = { source_pdf_page: 1, char_start: 1, char_end: 2 } },
      (a) => { a.plan.records[0].approved_replacement_locator = { source_pdf_page: 1, char_start: 1, char_end: 2 } },
      (a) => { a.plan.records[0].target.target_column = 'start_locator' },
      (a) => { a.summary += '\nupdate reading_segments set start_locator = null;' },
      (a) => { a.evidence.artifact_hashes.contract_sha256 = '0'.repeat(64) },
    ]
    for (const mutate of cases) {
      const bad = clone(args); mutate(bad)
      await expect(validateArtifacts(bad)).rejects.toThrow()
    }
  })
  it('canonical hashes change on semantic JSON changes but not formatting-only rewrites', async () => {
    const plan = await readJson(paths.plan)
    expect(canonicalJsonSha256FromValue(plan)).toEqual(canonicalJsonSha256FromValue(JSON.parse(JSON.stringify(plan, null, 8))))
    const changed = clone(plan); changed.records[0].packet_id = 'changed'
    expect(canonicalJsonSha256FromValue(changed)).not.toEqual(canonicalJsonSha256FromValue(plan))
  })
})
