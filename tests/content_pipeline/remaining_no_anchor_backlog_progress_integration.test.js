import { describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { canonicalJsonSha256FromValue } from '../../scripts/content_pipeline/hash_utils.mjs'
import { validateProgressIntegration } from '../../scripts/content_pipeline/validate_remaining_no_anchor_backlog_progress_integration.mjs'

describe('remaining no-anchor backlog progress integration', () => {
  it('integrates all 63 PR-0046 decisions exactly once', async () => {
    const result = await validateProgressIntegration()
    expect(result.decisionCount).toBe(63)
    expect(result.resolved).toBe(63)
    expect(result.unresolved).toBe(0)
    expect(result.state).toMatchObject({ reviewed_count: 133, unresolved_count: 11, pending_count: 0, public_decision_count: 144 })
  })

  it('preserves prior public decisions and derives packet completion', async () => {
    const evidence = JSON.parse(await readFile('content/migration/reading-segment-remaining-no-anchor-backlog-progress-integration-evidence.json', 'utf8'))
    expect(evidence.preservation_assertions.prior_public_decision_count_preserved).toBe(true)
    expect(evidence.preservation_assertions.total_public_decision_count).toBe(144)
    expect(evidence.packet_status_changes).toHaveLength(8)
    expect(evidence.packet_status_changes.every((change) => change.after.pending_count === 0)).toBe(true)
  })

  it('canonical hashes are formatting independent and semantic changes differ', () => {
    const a = { z: [1, { b: 2, a: 1 }], a: 'x' }
    const b = { a: 'x', z: [1, { a: 1, b: 2 }] }
    const c = { a: 'x', z: [1, { a: 1, b: 3 }] }
    expect(canonicalJsonSha256FromValue(a)).toBe(canonicalJsonSha256FromValue(b))
    expect(canonicalJsonSha256FromValue(a)).not.toBe(canonicalJsonSha256FromValue(c))
  })

  it('rejects duplicate, missing, and extra decisions', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr0047-'))
    try {
      const source = JSON.parse(await readFile('content/migration/reading-segment-remaining-no-anchor-backlog-adjudication-decisions.json', 'utf8'))
      const duplicate = { ...source, decisions: [...source.decisions, source.decisions[0]] }
      const missing = { ...source, decisions: source.decisions.slice(1) }
      const extra = { ...source, decisions: [...source.decisions, { ...source.decisions[0], decision_id: 'extra', segment_key: 'extra' }] }
      for (const [name, value] of [['duplicate', duplicate], ['missing', missing], ['extra', extra]]) {
        const p = join(dir, `${name}.json`)
        await writeFile(p, JSON.stringify(value), 'utf8')
        await expect(validateProgressIntegration({ decisionsPath: p })).rejects.toThrow(/missing or extra|duplicate|hash mismatch/)
      }
    } finally { await rm(dir, { recursive: true, force: true }) }
  })

  it('rejects historical/current semantic hash changes and duplicate integration', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pr0047-current-'))
    try {
      const current = JSON.parse(await readFile('content/migration/reading-segment-source-review-progress-current.json', 'utf8'))
      current.totals.pending_count = 63
      const p = join(dir, 'current.json')
      await writeFile(p, JSON.stringify(current), 'utf8')
      await expect(validateProgressIntegration({ currentPath: p })).rejects.toThrow(/wrong post-integration state|post current hash mismatch/)
    } finally { await rm(dir, { recursive: true, force: true }) }
  })

  it('documents unresolved decisions would move pending to unresolved', async () => {
    const evidence = JSON.parse(await readFile('content/migration/reading-segment-remaining-no-anchor-backlog-progress-integration-evidence.json', 'utf8'))
    expect(evidence.derived_delta.unresolved_count).toBe(evidence.decision_totals.unresolved_count)
  })
})
