import {
  pathToFileURL,
} from 'node:url'

import {
  readFile,
} from 'node:fs/promises'
import {
  HASH_ALGORITHMS,
  canonicalJsonSha256,
} from './hash_utils.mjs'

export const PR0045_CURRENT_PROGRESS_SNAPSHOT =
  'content/migration/reading-segment-source-review-progress-pr0045-current.json'

const readJson = async (path) =>
  JSON.parse(
    await readFile(path, 'utf8'),
  )

export const validate = async ({
  currentProgressPath =
    PR0045_CURRENT_PROGRESS_SNAPSHOT,
} = {}) => {
  const [
    policy,
    decisions,
    plan,
    corpus,
    historical,
    current,
    evidence,
    application,
  ] = await Promise.all([
    readJson(
      'content/migration/reading-segment-no-anchor-ambiguous-progress-integration-policy.json',
    ),
    readJson(
      'content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json',
    ),
    readJson(
      'content/migration/reading-segment-no-anchor-ambiguous-integration-plan.json',
    ),
    readJson(
      'content/migration/reading-segment-no-anchor-discovery-corpus.json',
    ),
    readJson(
      'content/migration/reading-segment-source-review-progress.json',
    ),
    readJson(
      currentProgressPath,
    ),
    readJson(
      'content/migration/reading-segment-no-anchor-ambiguous-progress-integration-evidence.json',
    ),
    readJson(
      'content/migration/reading-segment-mechanical-application-evidence.json',
    ),
  ])

  const errors = []
  const baseline =
    policy.target.historical_baseline
  const target =
    policy.target.current_state

  if (
    evidence.input_hashes?.hash_algorithm !==
      HASH_ALGORITHMS.canonicalJsonSha256 ||
    policy.schema_version !== 2 ||
    evidence.schema_version !== 2 ||
    policy.status !==
      'accepted-for-no-anchor-ambiguous-progress-integration' ||
    evidence.status !==
      'no-anchor-ambiguous-progress-integrated-not-applied' ||
    current.status !==
      'no-anchor-ambiguous-progress-integrated-not-applied' ||
    historical.status !==
      'same-page-review-integrated-not-applied' ||
    evidence.policy_version !==
      policy.policy_version ||
    current.policy_version !==
      policy.policy_version ||
    evidence.run_id !==
      current.run_id ||
    decisions.run_id !==
      current.run_id
  ) {
    errors.push(
      'policy, evidence, progress, or migration identity differs',
    )
  }

  for (const [
    field,
    expected,
  ] of Object.entries(baseline)) {
    if (
      historical.totals?.[field] !==
        expected ||
      evidence.historical_baseline?.[field] !==
        expected
    ) {
      errors.push(
        `${field}: historical baseline differs`,
      )
    }
  }

  for (const [
    field,
    expected,
  ] of Object.entries(target)) {
    if (
      current.totals?.[field] !==
        expected ||
      evidence.current_state?.[field] !==
        expected ||
      plan.projected_state?.[field] !==
        expected
    ) {
      errors.push(
        `${field}: current state differs`,
      )
    }
  }

  if (
    decisions.totals?.item_count !== 25 ||
    decisions.totals?.resolved_count !== 16 ||
    decisions.totals?.unresolved_count !== 9 ||
    decisions.totals
      ?.confirm_successor_start_count !== 10 ||
    decisions.totals
      ?.adjust_successor_start_count !== 6 ||
    decisions.totals
      ?.merge_with_successor_count !== 0 ||
    decisions.totals
      ?.candidate_override_count !== 8
  ) {
    errors.push(
      'decision totals differ',
    )
  }

  if (
    corpus.totals
      ?.evidence_prepared_count !== 63 ||
    corpus.totals
      ?.evidence_ambiguous_count !== 25 ||
    evidence.preserved_prepared_lane
      ?.item_count !== 63 ||
    evidence.packet_updates?.length !== 6
  ) {
    errors.push(
      'corpus, prepared lane, or packet update totals differ',
    )
  }

  const noAnchorIds = new Set(
    policy.target.no_anchor_packet_ids,
  )
  const affectedIds = new Set(
    policy.target.affected_packet_ids,
  )
  const noAnchorPackets =
    current.packets.filter(
      (packet) =>
        noAnchorIds.has(
          packet.packet_id,
        ),
    )

  if (
    noAnchorPackets.length !== 8 ||
    noAnchorPackets.reduce(
      (sum, packet) =>
        sum + packet.item_count,
      0,
    ) !== 88 ||
    noAnchorPackets.reduce(
      (sum, packet) =>
        sum + packet.pending_count,
      0,
    ) !== 63 ||
    noAnchorPackets.reduce(
      (sum, packet) =>
        sum + packet.reviewed_count,
      0,
    ) !== 16 ||
    noAnchorPackets.reduce(
      (sum, packet) =>
        sum + packet.unresolved_count,
      0,
    ) !== 9
  ) {
    errors.push(
      'current no-anchor packet totals differ',
    )
  }

  for (const packet of noAnchorPackets) {
    if (
      packet.pending_count +
        packet.reviewed_count +
        packet.unresolved_count !==
        packet.item_count ||
      packet.in_review_count !== 0
    ) {
      errors.push(
        `${packet.packet_id}: packet totals do not balance`,
      )
    }

    if (
      affectedIds.has(
        packet.packet_id,
      ) &&
      packet.status !==
        'review-in-progress-not-applied'
    ) {
      errors.push(
        `${packet.packet_id}: affected packet status differs`,
      )
    }
  }

  if (
    current.totals.pending_count +
      current.totals.reviewed_count +
      current.totals.unresolved_count !==
      current.totals.item_count ||
    current.totals
      .public_decision_count !==
      current.totals.reviewed_count +
        current.totals.unresolved_count
  ) {
    errors.push(
      'current cumulative totals do not balance',
    )
  }

  if (
    evidence.input_hashes
      ?.decision_artifact_sha256 !==
      await canonicalJsonSha256(
        'content/migration/reading-segment-no-anchor-ambiguous-adjudication-decisions.json',
      ) ||
    evidence.input_hashes
      ?.integration_plan_sha256 !==
      await canonicalJsonSha256(
        'content/migration/reading-segment-no-anchor-ambiguous-integration-plan.json',
      ) ||
    evidence.input_hashes
      ?.discovery_corpus_sha256 !==
      await canonicalJsonSha256(
        'content/migration/reading-segment-no-anchor-discovery-corpus.json',
      ) ||
    evidence.input_hashes
      ?.historical_progress_sha256 !==
      await canonicalJsonSha256(
        'content/migration/reading-segment-source-review-progress.json',
      ) ||
    evidence.current_progress_sha256 !==
      await canonicalJsonSha256(
        currentProgressPath,
      )
  ) {
    errors.push(
      'integration hashes differ',
    )
  }

  if (
    policy.progress_model
      ?.historical_progress_is_immutable !==
      true ||
    policy.progress_model
      ?.later_prs_must_read_current_progress !==
      true ||
    evidence.progress_model
      ?.current_progress_file !==
      'content/migration/reading-segment-source-review-progress-current.json' ||
    currentProgressPath !==
      PR0045_CURRENT_PROGRESS_SNAPSHOT
  ) {
    errors.push(
      'progress model differs',
    )
  }

  for (const [
    field,
    value,
  ] of Object.entries(
    evidence.integration_boundary || {},
  )) {
    if (
      [
        'validated_decisions_integrated',
        'current_progress_snapshot_created',
      ].includes(field)
    ) {
      if (value !== true) {
        errors.push(
          `${field} must be true`,
        )
      }
    } else if (value !== false) {
      errors.push(
        `${field} must remain false`,
      )
    }
  }

  if (
    application.totals
      ?.target_content_review_count !== 166 ||
    application.totals
      ?.unaffected_boundary_review_count !==
      646 ||
    application.totals
      ?.content_row_count !== 0 ||
    application.totals
      ?.successor_mapping_count !== 0 ||
    application.totals
      ?.dependency_snapshot_count !== 0 ||
    application.totals
      ?.production_section_count !== 908 ||
    application.application_boundary
      ?.cutover_enabled !== false
  ) {
    errors.push(
      'verified database state changed unexpectedly',
    )
  }

  if (errors.length) {
    const error = new Error(
      errors.join('\n'),
    )
    error.errors = errors
    throw error
  }

  return {
    decisionCount: 25,
    resolved: 16,
    unresolved: 9,
    currentState: target,
  }
}

if (
  import.meta.url ===
  pathToFileURL(process.argv[1]).href
) {
  try {
    await validate()
    console.log(
      'Validated immutable historical progress and the archived PR-0045 current snapshot.',
    )
    console.log(
      'Validated 25 integrated decisions: 16 reviewed and 9 unresolved.',
    )
    console.log(
      'Validated current state: 70 reviewed, 11 unresolved, and 63 pending.',
    )
    console.log(
      'No historical validator, historical test, database, production, or cutover change was introduced.',
    )
  } catch (error) {
    console.error(
      'No-anchor ambiguous progress integration validation failed:',
    )

    for (const message of error.errors || [error.message]) {
      console.error(`- ${message}`)
    }

    process.exit(1)
  }
}
