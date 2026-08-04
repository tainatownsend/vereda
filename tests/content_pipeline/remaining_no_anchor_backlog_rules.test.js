import { describe, expect, it } from 'vitest'
import { canResolveConfirmSuccessorStart } from '../../scripts/content_pipeline/remaining_no_anchor_backlog_rules.mjs'

const pair = (score, extra = {}) => ({
  pair_score: score,
  current_precedes_successor: true,
  same_source_pdf_page: true,
  source_pdf_page_gap: 0,
  ...extra,
})

const item = (candidates, selectedPair = candidates[0], pairAmbiguous = false) => ({
  pair_candidates: candidates,
  selected_pair: selectedPair,
  pair_ambiguous: pairAmbiguous,
})

describe('remaining no-anchor backlog candidate resolution rules', () => {
  it('resolves when the selected pair is the unique highest-score candidate', () => {
    const selected = pair(10)
    const result = canResolveConfirmSuccessorStart(item([selected, pair(7)]))

    expect(result.canResolve).toBe(true)
    expect(result.selectedIndex).toBe(0)
    expect(result.topCandidates).toHaveLength(1)
  })

  it('does not resolve two candidates tied for the highest score', () => {
    const selected = pair(10)
    const result = canResolveConfirmSuccessorStart(item([selected, pair(10, { source_pdf_page_gap: 1 })]))

    expect(result.canResolve).toBe(false)
    expect(result.topCandidates).toHaveLength(2)
  })

  it('does not resolve when the selected candidate is weaker than another candidate', () => {
    const selected = pair(8)
    const result = canResolveConfirmSuccessorStart(item([selected, pair(10)]))

    expect(result.canResolve).toBe(false)
    expect(result.selectedIndex).toBe(0)
    expect(result.topCandidates).toHaveLength(1)
  })

  it('does not resolve when the selected candidate is missing from candidates', () => {
    const result = canResolveConfirmSuccessorStart(item([pair(10), pair(8)], pair(9)))

    expect(result.canResolve).toBe(false)
    expect(result.selectedIndex).toBeNull()
  })
})
