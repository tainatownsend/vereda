export const candidateScore = (candidate) => candidate?.pair_score ?? Number.NEGATIVE_INFINITY

export const maximumScoreCandidates = (candidates) => {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return []
  }
  const maximumScore = Math.max(...candidates.map(candidateScore))
  return candidates.filter((candidate) => candidateScore(candidate) === maximumScore)
}

export const selectedCandidateIndex = (candidates, selectedPair) => {
  if (!Array.isArray(candidates)) {
    return null
  }
  const matches = candidates
    .map((candidate, index) => [candidate, index])
    .filter(([candidate]) => JSON.stringify(candidate) === JSON.stringify(selectedPair))
  return matches.length === 1 ? matches[0][1] : null
}

export const canResolveConfirmSuccessorStart = (item) => {
  const candidates = item?.pair_candidates || []
  const topCandidates = maximumScoreCandidates(candidates)
  const selectedIndex = selectedCandidateIndex(candidates, item?.selected_pair)
  const selected = Number.isInteger(selectedIndex) ? candidates[selectedIndex] : null
  const hasUniqueTopCandidate = topCandidates.length === 1
  const selectedIsUniqueTop = hasUniqueTopCandidate && JSON.stringify(topCandidates[0]) === JSON.stringify(item?.selected_pair)

  return {
    canResolve: Boolean(
      selected &&
      selectedIsUniqueTop &&
      selected.current_precedes_successor === true &&
      item?.pair_ambiguous === false
    ),
    selectedIndex,
    topCandidates,
  }
}

export const deriveDecisionTotals = (decisions) => {
  const totals = {
    eligible_item_count: decisions.length,
    decision_count: decisions.length,
    resolved_count: 0,
    unresolved_count: 0,
    confirm_successor_start_count: 0,
    adjust_successor_start_count: 0,
    merge_with_successor_count: 0,
    candidate_override_count: 0,
    manual_review_completed_count: decisions.length,
    cumulative_progress_change_count: 0,
    boundary_approved_count: 0,
    database_change_count: 0,
  }

  for (const decision of decisions) {
    if (decision.review_status === 'reviewed') {
      totals.resolved_count += 1
    }
    if (decision.review_status === 'unresolved') {
      totals.unresolved_count += 1
    }
    if (decision.selected_outcome === 'confirm-successor-start') {
      totals.confirm_successor_start_count += 1
    }
    if (decision.selected_outcome === 'adjust-successor-start') {
      totals.adjust_successor_start_count += 1
    }
    if (decision.selected_outcome === 'merge-with-successor') {
      totals.merge_with_successor_count += 1
    }
    if (decision.candidate_override === true) {
      totals.candidate_override_count += 1
    }
  }

  return totals
}
