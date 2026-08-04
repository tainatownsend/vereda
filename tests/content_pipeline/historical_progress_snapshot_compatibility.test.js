import { describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { canonicalJsonSha256FromValue } from '../../scripts/content_pipeline/hash_utils.mjs'
import { validate as validatePr0045Progress, PR0045_CURRENT_PROGRESS_SNAPSHOT } from '../../scripts/content_pipeline/validate_no_anchor_ambiguous_progress_integration.mjs'
import { validateRemainingNoAnchorBacklogAdjudication, PR0046_CURRENT_PROGRESS_SNAPSHOT } from '../../scripts/content_pipeline/validate_remaining_no_anchor_backlog_adjudication.mjs'
import { validateProgressIntegration } from '../../scripts/content_pipeline/validate_remaining_no_anchor_backlog_progress_integration.mjs'

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))

describe('historical progress snapshot compatibility', () => {
  it('PR-0045 validator passes against its immutable archived snapshot after PR-0047 advances current', async () => {
    await expect(validatePr0045Progress()).resolves.toMatchObject({ decisionCount: 25, resolved: 16, unresolved: 9 })
  })

  it('PR-0046 validator passes against the immutable archived snapshot after PR-0047 advances current', async () => {
    await expect(validateRemainingNoAnchorBacklogAdjudication()).resolves.toMatchObject({ decisionCount: 63, uniqueHighestCount: 63, tiedHighestCount: 0 })
  })

  it('semantic mutation of the archived snapshot fails historical validation', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr0045-snapshot-'))
    try {
      const snapshot = await readJson(PR0045_CURRENT_PROGRESS_SNAPSHOT)
      snapshot.totals.pending_count = 64
      const path = join(dir, 'mutated.json')
      await writeFile(path, JSON.stringify(snapshot), 'utf8')
      await expect(validatePr0045Progress({ currentProgressPath: path })).rejects.toThrow(/current state differs|integration hashes differ|progress model differs/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('line endings and insignificant formatting do not change canonical snapshot hash', async () => {
    const snapshot = await readJson(PR0045_CURRENT_PROGRESS_SNAPSHOT)
    const prettyCrlf = `${JSON.stringify(snapshot, null, 4)}\r\n`
    expect(canonicalJsonSha256FromValue(JSON.parse(prettyCrlf))).toBe('564882a99baddc793739eb32183c5cdeed25f9668619f4a835f6da00b6a0938a')
  })

  it('PR-0047 validator continues to require the post-integration current snapshot', async () => {
    await expect(validateProgressIntegration()).resolves.toMatchObject({ state: { reviewed_count: 133, unresolved_count: 11, pending_count: 0 } })
    await expect(validateProgressIntegration({ currentPath: PR0046_CURRENT_PROGRESS_SNAPSHOT })).rejects.toThrow(/wrong post-integration state|wrong packet completion|post current hash mismatch/)
  })

  it('archived historical snapshot and mutable current snapshot cannot be swapped accidentally', async () => {
    await expect(validatePr0045Progress({ currentProgressPath: 'content/migration/reading-segment-source-review-progress-current.json' })).rejects.toThrow(/current state differs|progress model differs|integration hashes differ/)
    await expect(validateRemainingNoAnchorBacklogAdjudication({ currentProgressPath: 'content/migration/reading-segment-source-review-progress-current.json' })).rejects.toThrow(/current progress changed unexpectedly|historical PR-0046 validator/)
  })

  it('duplicate PR-0047 integration remains rejected', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr0047-dupe-'))
    try {
      const current = await readJson('content/migration/reading-segment-source-review-progress-current.json')
      current.totals.reviewed_count += 63
      current.totals.public_decision_count += 63
      const path = join(dir, 'duplicated.json')
      await writeFile(path, JSON.stringify(current), 'utf8')
      await expect(validateProgressIntegration({ currentPath: path })).rejects.toThrow(/wrong post-integration state|incorrect public decision count|post current hash mismatch/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
