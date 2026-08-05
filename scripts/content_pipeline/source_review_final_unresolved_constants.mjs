import { paths as readinessPaths } from './classify_reviewed_boundary_application_readiness.mjs'

export const paths = {
  policy: 'content/migration/reading-segment-source-review-final-unresolved-adjudication-policy.json',
  plan: 'content/migration/reading-segment-source-review-final-unresolved-adjudication-plan.json',
  decisions: 'content/migration/reading-segment-source-review-final-unresolved-adjudication-decisions.json',
  evidence: 'content/migration/reading-segment-source-review-final-unresolved-adjudication-evidence.json',
  reasons: 'content/migration/reading-segment-source-review-final-unresolved-reasons.json',
  impact: 'content/migration/reading-segment-source-review-final-unresolved-contract-impact.json',
  summary: 'content/migration/reports/reading-segment-source-review-final-unresolved-adjudication-summary.md',
  docs: 'docs/content-pipeline/source-review-final-unresolved-adjudication.md',
}

export const allowedOutcomes = ['confirm-successor-start', 'adjust-successor-start', 'exclude-structural-heading', 'retain-intro-segment', 'unresolved']
export const allowedReasons = ['no-selected-candidate', 'successor-identity-unavailable', 'insufficient-public-authority-to-distinguish-outcomes']

export const candidateSourcePathByKey = {
  no_anchor_discovery_corpus: 'content/migration/reading-segment-no-anchor-discovery-corpus.json',
  no_anchor_ambiguous_review_packet: 'content/migration/reading-segment-no-anchor-ambiguous-review-packet.json',
  same_page_review_corpus: 'content/migration/reading-segment-same-page-review-corpus.json',
  remaining_no_anchor_backlog_adjudication: 'content/migration/reading-segment-remaining-no-anchor-backlog-adjudication-decisions.json',
  no_anchor_ambiguous_adjudication: 'content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json',
  book_2_successor_anchor_recovery: 'content/migration/reading-segment-book-2-successor-anchor-recovery-decisions.json',
  book_3_successor_anchor_recovery: 'content/migration/reading-segment-book-3-successor-anchor-recovery-decisions.json',
  book_3_manual_adjudication_packet: 'content/migration/reading-segment-book-3-manual-adjudication-packet.json',
  container_intro_unresolved_analysis: 'content/migration/reading-segment-container-intro-unresolved-analysis.json',
}
export const candidateSources = Object.values(candidateSourcePathByKey)

export const decisionInputPathByKey = {
  source_review_container_intro_decisions: 'content/migration/reading-segment-source-review-container-intro-decisions.json',
  source_review_pilot_decisions: 'content/migration/reading-segment-source-review-pilot-decisions.json',
  same_page_review_decisions: 'content/migration/reading-segment-same-page-review-decisions.json',
}

export const historicalIntegrityPathByKey = {
  immutable_historical_progress: readinessPaths.historicalProgress,
  archived_progress_pr0045_current: readinessPaths.pr0045Current,
  current_cumulative_progress_input: readinessPaths.progress,
  pr0048_readiness_policy: readinessPaths.policy,
  pr0048_readiness_plan: readinessPaths.plan,
  pr0048_readiness_evidence: readinessPaths.evidence,
  pr0049_status_only_contract: 'content/migration/reading-segment-source-review-status-only-contract.json',
  pr0049_status_only_plan: 'content/migration/reading-segment-source-review-status-only-eligibility-plan.json',
  pr0049_status_only_evidence: 'content/migration/reading-segment-source-review-status-only-contract-evidence.json',
  pr0050_locator_contract: 'content/migration/reading-segment-source-review-successor-locator-adjustment-contract.json',
  pr0050_locator_plan: 'content/migration/reading-segment-source-review-successor-locator-adjustment-plan.json',
  pr0050_locator_evidence: 'content/migration/reading-segment-source-review-successor-locator-adjustment-evidence.json',
  pr0050_locator_missing_authority: 'content/migration/reading-segment-source-review-successor-locator-adjustment-missing-authority.json',
  pr0051_structural_heading_contract: 'content/migration/reading-segment-source-review-structural-heading-merge-contract.json',
  pr0051_structural_heading_plan: 'content/migration/reading-segment-source-review-structural-heading-merge-plan.json',
  pr0051_structural_heading_evidence: 'content/migration/reading-segment-source-review-structural-heading-merge-evidence.json',
  pr0051_structural_heading_missing_authority: 'content/migration/reading-segment-source-review-structural-heading-merge-missing-authority.json',
  pr0051_structural_heading_operation_models: 'content/migration/reading-segment-source-review-structural-heading-operation-models.json',
}

export const pr0052PathByHashKey = {
  pr0052_policy: paths.policy,
  pr0052_plan: paths.plan,
  pr0052_decisions: paths.decisions,
  pr0052_reasons: paths.reasons,
  pr0052_impact: paths.impact,
}

export const requiredSafetyAssertions = {
  executable_sql_generated: false,
  sql_executed: false,
  database_modified: false,
  supabase_modified: false,
  production_modified: false,
  ui_modified: false,
  source_text_modified: false,
  user_progress_modified: false,
  reader_sessions_modified: false,
  bookmarks_modified: false,
  notes_modified: false,
  highlights_modified: false,
  cutover_enabled: false,
}
