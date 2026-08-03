import { createHash } from 'node:crypto'
import {
  readFile,
  writeFile,
} from 'node:fs/promises'

const paths = {
  policy:
    'content/migration/reading-segment-mechanical-application-policy.json',
  decisions:
    'content/migration/reading-segment-mechanical-review-decisions.json',
  accepted:
    'content/migration/reading-segment-mechanical-review-accepted.json',
  proposals:
    'content/migration/reading-segment-mechanical-resolution-proposals.json',
  application:
    'content/migration/reading-segment-application-evidence.json',
  plan:
    'content/migration/reading-segment-mechanical-application-plan.json',
  report:
    'content/migration/reports/reading-segment-mechanical-application-plan-summary.md',
  preflight:
    'supabase/audits/mechanical_boundary_application_preflight.sql',
  applicationSql:
    'supabase/staging/20260803110000_apply_mechanical_boundary_decisions_v1.sql',
  verification:
    'supabase/audits/mechanical_boundary_application_verification.sql',
}

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, 'utf8'))

const normalizeNewlines = (value) =>
  value.replace(/\r\n?/g, '\n')

const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex')

const sha256File = async (filePath) =>
  sha256(await readFile(filePath))

const sqlLiteral = (value) =>
  `'${String(value).replaceAll("'", "''")}'`

const [
  policy,
  decisions,
  accepted,
  proposals,
  application,
] = await Promise.all([
  readJson(paths.policy),
  readJson(paths.decisions),
  readJson(paths.accepted),
  readJson(paths.proposals),
  readJson(paths.application),
])

if (
  policy.status !==
  'accepted-for-application-planning'
) {
  throw new Error(
    'Mechanical application policy is not accepted.',
  )
}

if (
  accepted.item_count !== 166 ||
  accepted.items?.length !== 166
) {
  throw new Error(
    'Expected 166 accepted decisions.',
  )
}

const proposalByResolutionId = new Map(
  proposals.proposals.map((proposal) => [
    proposal.resolution_id,
    proposal,
  ]),
)

const targets = accepted.items.map(
  (decision) => {
    const proposal =
      proposalByResolutionId.get(
        decision.resolution_id,
      )

    if (!proposal) {
      throw new Error(
        `${decision.resolution_id}: matching proposal is missing.`,
      )
    }

    const falseFlags = [
      decision.database_application_authorized,
      decision.database_change_applied,
      decision.content_approved,
      decision.content_loaded,
      decision.successor_mapping_created,
      decision.cutover_enabled,
    ].every((value) => value === false)

    if (
      decision.decision !==
        'accepted-for-future-application' ||
      decision.decision_status !==
        'recorded-not-applied' ||
      !falseFlags
    ) {
      throw new Error(
        `${decision.resolution_id}: decision is not safely unapplied.`,
      )
    }

    if (
      proposal.book_id !== 3 ||
      decision.book_id !== 3 ||
      proposal.segment_key !==
        decision.segment_key
    ) {
      throw new Error(
        `${decision.resolution_id}: target identity differs.`,
      )
    }

    return {
      run_id: decision.run_id,
      book_id: decision.book_id,
      segment_key:
        decision.segment_key,
      segment_order:
        decision.segment_order,
      decision_id:
        decision.decision_id,
      resolution_id:
        decision.resolution_id,
      expected_start_locator:
        decision.independently_rederived
          .current_start_locator,
      expected_end_next_start_locator:
        decision.independently_rederived
          .successor_start_locator,
      expected_successor_segment_key:
        decision.successor_segment_key,
      expected_successor_segment_order:
        decision.successor_segment_order,
    }
  },
)

targets.sort(
  (left, right) =>
    left.book_id - right.book_id ||
    left.segment_order -
      right.segment_order ||
    left.segment_key.localeCompare(
      right.segment_key,
    ),
)

const targetKeys = new Set(
  targets.map((target) => target.segment_key),
)
const decisionIds = new Set(
  targets.map((target) => target.decision_id),
)
const resolutionIds = new Set(
  targets.map(
    (target) => target.resolution_id,
  ),
)

if (
  targets.length !== 166 ||
  targetKeys.size !== 166 ||
  decisionIds.size !== 166 ||
  resolutionIds.size !== 166
) {
  throw new Error(
    'Application targets must contain 166 unique decisions, resolutions, and segments.',
  )
}

for (
  let index = 1;
  index < targets.length;
  index += 1
) {
  if (
    targets[index].segment_order <=
    targets[index - 1].segment_order
  ) {
    throw new Error(
      'Application target ordering must be strictly increasing.',
    )
  }
}

const runId = decisions.run_id
const targetCount = targets.length
const totalCount =
  application.summary.reading_segment_count
const unaffectedCount =
  totalCount - targetCount
const payloadJson = JSON.stringify(
  targets,
)
const delimiter =
  '$vereda_mechanical_boundary_targets$'

if (payloadJson.includes(delimiter)) {
  throw new Error(
    'Unexpected SQL delimiter collision.',
  )
}

const targetCte = `targets as (
  select *
  from jsonb_to_recordset(
    ${delimiter}${payloadJson}${delimiter}::jsonb
  ) as target (
    run_id uuid,
    book_id integer,
    segment_key text,
    segment_order integer,
    decision_id text,
    resolution_id text,
    expected_start_locator jsonb,
    expected_end_next_start_locator jsonb,
    expected_successor_segment_key text,
    expected_successor_segment_order integer
  )
)`

const roleDeniedExpression = `not has_schema_privilege(
    'anon',
    'content_staging',
    'usage'
  )
  and not has_schema_privilege(
    'authenticated',
    'content_staging',
    'usage'
  )`

const preflightChecks = [
  {
    key: 'migration-run-status',
    passed: `(select status
      from content_staging.migration_runs
      where id = ${sqlLiteral(runId)}::uuid
    ) = 'reviewing'`,
    actual: `select status
      from content_staging.migration_runs
      where id = ${sqlLiteral(runId)}::uuid`,
    details:
      `jsonb_build_object('expected', 'reviewing')`,
  },
  {
    key: 'rights-status',
    passed: `(select rights_status
      from content_staging.migration_runs
      where id = ${sqlLiteral(runId)}::uuid
    ) = 'blocked'`,
    actual: `select rights_status
      from content_staging.migration_runs
      where id = ${sqlLiteral(runId)}::uuid`,
    details:
      `jsonb_build_object('expected', 'blocked')`,
  },
  {
    key: 'reading-segment-total',
    passed: `(select count(*)
      from content_staging.reading_segments
      where run_id = ${sqlLiteral(runId)}::uuid
    ) = ${totalCount}`,
    actual: `select count(*)
      from content_staging.reading_segments
      where run_id = ${sqlLiteral(runId)}::uuid`,
    details:
      `jsonb_build_object('expected', ${totalCount})`,
  },
  {
    key: 'target-manifest-count',
    passed: `(select count(*) from targets) = ${targetCount}`,
    actual: `select count(*) from targets`,
    details:
      `jsonb_build_object('expected', ${targetCount})`,
  },
  {
    key: 'target-key-uniqueness',
    passed: `(select count(*) from targets) =
      (select count(distinct segment_key) from targets)`,
    actual: `select count(*) - count(distinct segment_key)
      from targets`,
    details:
      `jsonb_build_object('expected_duplicates', 0)`,
  },
  {
    key: 'target-rows-present',
    passed: `(select count(*)
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
    ) = ${targetCount}`,
    actual: `select count(*)
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key`,
    details:
      `jsonb_build_object('expected', ${targetCount})`,
  },
  {
    key: 'target-boundary-review-count',
    passed: `(select count(*)
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.approval_status = 'boundary-review'
    ) = ${targetCount}`,
    actual: `select count(*)
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.approval_status = 'boundary-review'`,
    details:
      `jsonb_build_object('expected', ${targetCount})`,
  },
  {
    key: 'content-review-before-application',
    passed: `(select count(*)
      from content_staging.reading_segments
      where run_id = ${sqlLiteral(runId)}::uuid
        and approval_status = 'content-review'
    ) = 0`,
    actual: `select count(*)
      from content_staging.reading_segments
      where run_id = ${sqlLiteral(runId)}::uuid
        and approval_status = 'content-review'`,
    details:
      `jsonb_build_object('expected', 0)`,
  },
  {
    key: 'target-content-remains-null',
    passed: `not exists (
      select 1
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.content is not null
         or segment.word_count is not null
         or segment.normalized_content_sha256 is not null
    )`,
    actual: `select count(*)
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.content is not null
         or segment.word_count is not null
         or segment.normalized_content_sha256 is not null`,
    details:
      `jsonb_build_object('expected', 0)`,
  },
  {
    key: 'target-start-locator-match',
    passed: `not exists (
      select 1
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.start_locator is distinct from
        target.expected_start_locator
    )`,
    actual: `select count(*)
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.start_locator is distinct from
        target.expected_start_locator`,
    details:
      `jsonb_build_object('expected_mismatches', 0)`,
  },
  {
    key: 'target-end-successor-locator-match',
    passed: `not exists (
      select 1
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.end_locator -> 'next_start_locator'
        is distinct from
        target.expected_end_next_start_locator
    )`,
    actual: `select count(*)
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.end_locator -> 'next_start_locator'
        is distinct from
        target.expected_end_next_start_locator`,
    details:
      `jsonb_build_object('expected_mismatches', 0)`,
  },
  {
    key: 'target-successor-key-match',
    passed: `not exists (
      select 1
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.end_locator ->> 'next_segment_key'
        is distinct from
        target.expected_successor_segment_key
    )`,
    actual: `select count(*)
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.end_locator ->> 'next_segment_key'
        is distinct from
        target.expected_successor_segment_key`,
    details:
      `jsonb_build_object('expected_mismatches', 0)`,
  },
  {
    key: 'unaffected-segment-count',
    passed: `(select count(*)
      from content_staging.reading_segments segment
      where segment.run_id = ${sqlLiteral(runId)}::uuid
        and not exists (
          select 1
          from targets target
          where target.run_id = segment.run_id
            and target.book_id = segment.book_id
            and target.segment_key = segment.segment_key
        )
    ) = ${unaffectedCount}`,
    actual: `select count(*)
      from content_staging.reading_segments segment
      where segment.run_id = ${sqlLiteral(runId)}::uuid
        and not exists (
          select 1
          from targets target
          where target.run_id = segment.run_id
            and target.book_id = segment.book_id
            and target.segment_key = segment.segment_key
        )`,
    details:
      `jsonb_build_object('expected', ${unaffectedCount})`,
  },
  {
    key: 'successor-mapping-count',
    passed: `(select count(*)
      from content_staging.current_successor_mappings
    ) = 0`,
    actual: `select count(*)
      from content_staging.current_successor_mappings`,
    details:
      `jsonb_build_object('expected', 0)`,
  },
  {
    key: 'dependency-snapshot-count',
    passed: `(select count(*)
      from content_staging.dependency_snapshots
    ) = 0`,
    actual: `select count(*)
      from content_staging.dependency_snapshots`,
    details:
      `jsonb_build_object('expected', 0)`,
  },
  {
    key: 'dry-run-result-count',
    passed: `(select count(*)
      from content_staging.dry_run_results
    ) = 0`,
    actual: `select count(*)
      from content_staging.dry_run_results`,
    details:
      `jsonb_build_object('expected', 0)`,
  },
  {
    key: 'prior-application-audit-event-count',
    passed: `(select count(*)
      from content_staging.migration_audit_events
      where run_id = ${sqlLiteral(runId)}::uuid
        and event_type =
          'mechanical-boundary-decisions-applied'
    ) = 0`,
    actual: `select count(*)
      from content_staging.migration_audit_events
      where run_id = ${sqlLiteral(runId)}::uuid
        and event_type =
          'mechanical-boundary-decisions-applied'`,
    details:
      `jsonb_build_object('expected', 0)`,
  },
  {
    key: 'production-section-count',
    passed: `(select count(*) from public.sections) = 908`,
    actual: `select count(*) from public.sections`,
    details:
      `jsonb_build_object('expected', 908)`,
  },
  {
    key: 'application-roles-denied',
    passed: roleDeniedExpression,
    actual: `select (
      has_schema_privilege(
        'anon',
        'content_staging',
        'usage'
      )
      or has_schema_privilege(
        'authenticated',
        'content_staging',
        'usage'
      )
    )`,
    details:
      `jsonb_build_object('expected_any_access', false)`,
  },
]

const renderChecks = (checks) =>
  checks
    .map(
      ({ key, passed, actual, details }) => `select
  ${sqlLiteral(key)}::text as check_key,
  'blocking'::text as severity,
  ${passed} as passed,
  (${actual})::text as actual_value,
  ${details} as details`,
    )
    .join('\nunion all\n')

const preflightSql = `-- ============================================================
-- VEREDA — PR-0024 mechanical-boundary application preflight
--
-- READ ONLY.
-- Run before the application SQL.
-- Expected result: ${preflightChecks.length} rows, all passed = true.
-- ============================================================
with
${targetCte}
select
  checks.check_key,
  checks.severity,
  checks.passed,
  checks.actual_value,
  checks.details
from (
${renderChecks(preflightChecks)}
) checks
order by checks.check_key;
`

const acceptedHash =
  await sha256File(paths.accepted)
const decisionsHash =
  await sha256File(paths.decisions)

const applicationSql = `begin;

-- ============================================================
-- VEREDA — PR-0024 planned mechanical-boundary application
--
-- PREPARED FOR REVIEW; NOT APPLIED IN PR-0024.
--
-- Changes exactly ${targetCount} private staging rows:
--   boundary-review -> content-review
--
-- Content remains null.
-- Start/end locators remain unchanged.
-- No successor mappings.
-- No dependency snapshot.
-- No production mutation.
-- No cutover.
-- ============================================================

do $vereda_mechanical_boundary_preconditions$
declare
  v_target_count bigint;
  v_matching_count bigint;
begin
  if (
    select count(*)
    from content_staging.migration_runs
    where id = ${sqlLiteral(runId)}::uuid
      and status = 'reviewing'
      and rights_status = 'blocked'
  ) <> 1 then
    raise exception
      'Expected one reviewing migration run with blocked rights';
  end if;

  if (
    select count(*)
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
  ) <> ${totalCount} then
    raise exception
      'Expected ${totalCount} staged reading segments';
  end if;

  with
  ${targetCte}
  select count(*)
  into v_target_count
  from targets;

  if v_target_count <> ${targetCount} then
    raise exception
      'Expected ${targetCount} accepted mechanical decisions';
  end if;

  with
  ${targetCte}
  select count(*)
  into v_matching_count
  from targets target
  join content_staging.reading_segments segment
    on segment.run_id = target.run_id
   and segment.book_id = target.book_id
   and segment.segment_key = target.segment_key
  where segment.approval_status = 'boundary-review'
    and segment.content is null
    and segment.word_count is null
    and segment.normalized_content_sha256 is null
    and segment.start_locator =
      target.expected_start_locator
    and segment.end_locator -> 'next_start_locator' =
      target.expected_end_next_start_locator
    and segment.end_locator ->> 'next_segment_key' =
      target.expected_successor_segment_key
    and segment.segment_order =
      target.segment_order;

  if v_matching_count <> ${targetCount} then
    raise exception
      'Accepted targets do not match current staging state';
  end if;

  if exists (
    select 1
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
      and approval_status = 'content-review'
  ) then
    raise exception
      'Content-review rows already exist; application must be one-time';
  end if;

  if exists (
    select 1
    from content_staging.current_successor_mappings
  ) or exists (
    select 1
    from content_staging.dependency_snapshots
  ) or exists (
    select 1
    from content_staging.dry_run_results
  ) then
    raise exception
      'Downstream migration entities must remain empty';
  end if;

  if exists (
    select 1
    from content_staging.migration_audit_events
    where run_id = ${sqlLiteral(runId)}::uuid
      and event_type =
        'mechanical-boundary-decisions-applied'
  ) then
    raise exception
      'Mechanical boundary decisions were already applied';
  end if;

  if (
    select count(*)
    from public.sections
  ) <> 908 then
    raise exception
      'Production section count changed';
  end if;
end;
$vereda_mechanical_boundary_preconditions$;

with
${targetCte}
update content_staging.reading_segments segment
set
  approval_status = 'content-review',
  updated_at = now()
from targets target
where segment.run_id = target.run_id
  and segment.book_id = target.book_id
  and segment.segment_key = target.segment_key
  and segment.approval_status = 'boundary-review';

do $vereda_mechanical_boundary_postconditions$
begin
  if (
    select count(*)
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
      and approval_status = 'content-review'
  ) <> ${targetCount} then
    raise exception
      'Expected ${targetCount} content-review rows';
  end if;

  if (
    select count(*)
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
      and approval_status = 'boundary-review'
  ) <> ${unaffectedCount} then
    raise exception
      'Expected ${unaffectedCount} unaffected boundary-review rows';
  end if;

  if exists (
    select 1
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
      and approval_status not in (
        'boundary-review',
        'content-review'
      )
  ) then
    raise exception
      'Unexpected reading-segment approval status';
  end if;

  if exists (
    select 1
    from content_staging.reading_segments
    where run_id = ${sqlLiteral(runId)}::uuid
      and (
        content is not null
        or word_count is not null
        or normalized_content_sha256 is not null
      )
  ) then
    raise exception
      'Mechanical boundary application cannot load content';
  end if;

  if exists (
    select 1
    from content_staging.current_successor_mappings
  ) or exists (
    select 1
    from content_staging.dependency_snapshots
  ) or exists (
    select 1
    from content_staging.dry_run_results
  ) then
    raise exception
      'Mechanical boundary application cannot populate downstream entities';
  end if;
end;
$vereda_mechanical_boundary_postconditions$;

insert into content_staging.migration_audit_events (
  run_id,
  event_type,
  details
)
values (
  ${sqlLiteral(runId)}::uuid,
  'mechanical-boundary-decisions-applied',
  jsonb_build_object(
    'decision_count',
    ${targetCount},
    'book_id',
    3,
    'from_status',
    'boundary-review',
    'to_status',
    'content-review',
    'review_policy_version',
    ${sqlLiteral(decisions.policy_version)},
    'application_policy_version',
    ${sqlLiteral(policy.policy_version)},
    'accepted_decisions_sha256',
    ${sqlLiteral(acceptedHash)},
    'review_decisions_sha256',
    ${sqlLiteral(decisionsHash)},
    'contains_full_text',
    false,
    'content_approved',
    false,
    'successor_mapping_count',
    0,
    'dependency_snapshot_count',
    0,
    'production_modified',
    false,
    'cutover_enabled',
    false
  )
);

update content_staging.migration_runs
set updated_at = now()
where id = ${sqlLiteral(runId)}::uuid
  and status = 'reviewing'
  and rights_status = 'blocked';

commit;
`

const verificationChecks = [
  {
    key: 'migration-run-status',
    passed: `(select status
      from content_staging.migration_runs
      where id = ${sqlLiteral(runId)}::uuid
    ) = 'reviewing'`,
    actual: `select status
      from content_staging.migration_runs
      where id = ${sqlLiteral(runId)}::uuid`,
    details:
      `jsonb_build_object('expected', 'reviewing')`,
  },
  {
    key: 'rights-status',
    passed: `(select rights_status
      from content_staging.migration_runs
      where id = ${sqlLiteral(runId)}::uuid
    ) = 'blocked'`,
    actual: `select rights_status
      from content_staging.migration_runs
      where id = ${sqlLiteral(runId)}::uuid`,
    details:
      `jsonb_build_object('expected', 'blocked')`,
  },
  {
    key: 'reading-segment-total',
    passed: `(select count(*)
      from content_staging.reading_segments
      where run_id = ${sqlLiteral(runId)}::uuid
    ) = ${totalCount}`,
    actual: `select count(*)
      from content_staging.reading_segments
      where run_id = ${sqlLiteral(runId)}::uuid`,
    details:
      `jsonb_build_object('expected', ${totalCount})`,
  },
  {
    key: 'target-content-review-count',
    passed: `(select count(*)
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.approval_status = 'content-review'
    ) = ${targetCount}`,
    actual: `select count(*)
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.approval_status = 'content-review'`,
    details:
      `jsonb_build_object('expected', ${targetCount})`,
  },
  {
    key: 'target-boundary-review-count',
    passed: `(select count(*)
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.approval_status = 'boundary-review'
    ) = 0`,
    actual: `select count(*)
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.approval_status = 'boundary-review'`,
    details:
      `jsonb_build_object('expected', 0)`,
  },
  {
    key: 'non-target-boundary-review-count',
    passed: `(select count(*)
      from content_staging.reading_segments segment
      where segment.run_id = ${sqlLiteral(runId)}::uuid
        and segment.approval_status = 'boundary-review'
        and not exists (
          select 1
          from targets target
          where target.run_id = segment.run_id
            and target.book_id = segment.book_id
            and target.segment_key = segment.segment_key
        )
    ) = ${unaffectedCount}`,
    actual: `select count(*)
      from content_staging.reading_segments segment
      where segment.run_id = ${sqlLiteral(runId)}::uuid
        and segment.approval_status = 'boundary-review'
        and not exists (
          select 1
          from targets target
          where target.run_id = segment.run_id
            and target.book_id = segment.book_id
            and target.segment_key = segment.segment_key
        )`,
    details:
      `jsonb_build_object('expected', ${unaffectedCount})`,
  },
  {
    key: 'non-target-content-review-count',
    passed: `(select count(*)
      from content_staging.reading_segments segment
      where segment.run_id = ${sqlLiteral(runId)}::uuid
        and segment.approval_status = 'content-review'
        and not exists (
          select 1
          from targets target
          where target.run_id = segment.run_id
            and target.book_id = segment.book_id
            and target.segment_key = segment.segment_key
        )
    ) = 0`,
    actual: `select count(*)
      from content_staging.reading_segments segment
      where segment.run_id = ${sqlLiteral(runId)}::uuid
        and segment.approval_status = 'content-review'
        and not exists (
          select 1
          from targets target
          where target.run_id = segment.run_id
            and target.book_id = segment.book_id
            and target.segment_key = segment.segment_key
        )`,
    details:
      `jsonb_build_object('expected', 0)`,
  },
  {
    key: 'unexpected-approval-status-count',
    passed: `(select count(*)
      from content_staging.reading_segments
      where run_id = ${sqlLiteral(runId)}::uuid
        and approval_status not in (
          'boundary-review',
          'content-review'
        )
    ) = 0`,
    actual: `select count(*)
      from content_staging.reading_segments
      where run_id = ${sqlLiteral(runId)}::uuid
        and approval_status not in (
          'boundary-review',
          'content-review'
        )`,
    details:
      `jsonb_build_object('expected', 0)`,
  },
  {
    key: 'content-remains-null',
    passed: `not exists (
      select 1
      from content_staging.reading_segments
      where run_id = ${sqlLiteral(runId)}::uuid
        and (
          content is not null
          or word_count is not null
          or normalized_content_sha256 is not null
        )
    )`,
    actual: `select count(*)
      from content_staging.reading_segments
      where run_id = ${sqlLiteral(runId)}::uuid
        and (
          content is not null
          or word_count is not null
          or normalized_content_sha256 is not null
        )`,
    details:
      `jsonb_build_object('expected', 0)`,
  },
  {
    key: 'target-start-locator-unchanged',
    passed: `not exists (
      select 1
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.start_locator is distinct from
        target.expected_start_locator
    )`,
    actual: `select count(*)
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.start_locator is distinct from
        target.expected_start_locator`,
    details:
      `jsonb_build_object('expected_mismatches', 0)`,
  },
  {
    key: 'target-end-locator-unchanged',
    passed: `not exists (
      select 1
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.end_locator -> 'next_start_locator'
        is distinct from
        target.expected_end_next_start_locator
         or segment.end_locator ->> 'next_segment_key'
        is distinct from
        target.expected_successor_segment_key
    )`,
    actual: `select count(*)
      from targets target
      join content_staging.reading_segments segment
        on segment.run_id = target.run_id
       and segment.book_id = target.book_id
       and segment.segment_key = target.segment_key
      where segment.end_locator -> 'next_start_locator'
        is distinct from
        target.expected_end_next_start_locator
         or segment.end_locator ->> 'next_segment_key'
        is distinct from
        target.expected_successor_segment_key`,
    details:
      `jsonb_build_object('expected_mismatches', 0)`,
  },
  {
    key: 'segment-key-uniqueness',
    passed: `(select count(*)
      from content_staging.reading_segments
      where run_id = ${sqlLiteral(runId)}::uuid
    ) = (
      select count(distinct (book_id, segment_key))
      from content_staging.reading_segments
      where run_id = ${sqlLiteral(runId)}::uuid
    )`,
    actual: `select count(*) - count(distinct (book_id, segment_key))
      from content_staging.reading_segments
      where run_id = ${sqlLiteral(runId)}::uuid`,
    details:
      `jsonb_build_object('expected_duplicates', 0)`,
  },
  {
    key: 'segment-order-contiguous',
    passed: `not exists (
      select 1
      from content_staging.reading_segments
      where run_id = ${sqlLiteral(runId)}::uuid
      group by book_id
      having min(segment_order) <> 1
         or max(segment_order) <> count(*)
         or count(distinct segment_order) <> count(*)
    )`,
    actual: `select count(*)
      from (
        select book_id
        from content_staging.reading_segments
        where run_id = ${sqlLiteral(runId)}::uuid
        group by book_id
        having min(segment_order) <> 1
           or max(segment_order) <> count(*)
           or count(distinct segment_order) <> count(*)
      ) invalid_books`,
    details:
      `jsonb_build_object('expected_invalid_books', 0)`,
  },
  {
    key: 'application-audit-event-count',
    passed: `(select count(*)
      from content_staging.migration_audit_events
      where run_id = ${sqlLiteral(runId)}::uuid
        and event_type =
          'mechanical-boundary-decisions-applied'
    ) = 1`,
    actual: `select count(*)
      from content_staging.migration_audit_events
      where run_id = ${sqlLiteral(runId)}::uuid
        and event_type =
          'mechanical-boundary-decisions-applied'`,
    details:
      `jsonb_build_object('expected', 1)`,
  },
  {
    key: 'application-audit-decision-count',
    passed: `(select details ->> 'decision_count'
      from content_staging.migration_audit_events
      where run_id = ${sqlLiteral(runId)}::uuid
        and event_type =
          'mechanical-boundary-decisions-applied'
      order by created_at desc
      limit 1
    ) = ${sqlLiteral(String(targetCount))}`,
    actual: `select details ->> 'decision_count'
      from content_staging.migration_audit_events
      where run_id = ${sqlLiteral(runId)}::uuid
        and event_type =
          'mechanical-boundary-decisions-applied'
      order by created_at desc
      limit 1`,
    details:
      `jsonb_build_object('expected', ${targetCount})`,
  },
  {
    key: 'successor-mapping-count',
    passed: `(select count(*)
      from content_staging.current_successor_mappings
    ) = 0`,
    actual: `select count(*)
      from content_staging.current_successor_mappings`,
    details:
      `jsonb_build_object('expected', 0)`,
  },
  {
    key: 'dependency-snapshot-count',
    passed: `(select count(*)
      from content_staging.dependency_snapshots
    ) = 0`,
    actual: `select count(*)
      from content_staging.dependency_snapshots`,
    details:
      `jsonb_build_object('expected', 0)`,
  },
  {
    key: 'dry-run-result-count',
    passed: `(select count(*)
      from content_staging.dry_run_results
    ) = 0`,
    actual: `select count(*)
      from content_staging.dry_run_results`,
    details:
      `jsonb_build_object('expected', 0)`,
  },
  {
    key: 'production-section-count',
    passed: `(select count(*) from public.sections) = 908`,
    actual: `select count(*) from public.sections`,
    details:
      `jsonb_build_object('expected', 908)`,
  },
  {
    key: 'application-roles-denied',
    passed: roleDeniedExpression,
    actual: `select (
      has_schema_privilege(
        'anon',
        'content_staging',
        'usage'
      )
      or has_schema_privilege(
        'authenticated',
        'content_staging',
        'usage'
      )
    )`,
    details:
      `jsonb_build_object('expected_any_access', false)`,
  },
]

const verificationSql = `-- ============================================================
-- VEREDA — mechanical-boundary application verification
--
-- READ ONLY.
-- Run after the planned application SQL.
-- Expected result: ${verificationChecks.length} rows,
-- all passed = true.
-- ============================================================
with
${targetCte}
select
  checks.check_key,
  checks.severity,
  checks.passed,
  checks.actual_value,
  checks.details
from (
${renderChecks(verificationChecks)}
) checks
order by checks.check_key;
`

await Promise.all([
  writeFile(
    paths.preflight,
    normalizeNewlines(preflightSql),
    'utf8',
  ),
  writeFile(
    paths.applicationSql,
    normalizeNewlines(applicationSql),
    'utf8',
  ),
  writeFile(
    paths.verification,
    normalizeNewlines(verificationSql),
    'utf8',
  ),
])

const generated = {
  preflight_sql_sha256:
    sha256(normalizeNewlines(preflightSql)),
  application_sql_sha256:
    sha256(normalizeNewlines(applicationSql)),
  verification_sql_sha256:
    sha256(normalizeNewlines(verificationSql)),
}

const books = [
  {
    book_id: 3,
    slug:
      'o-evangelho-segundo-o-espiritismo',
    title:
      'O Evangelho Segundo o Espiritismo',
    target_count: targetCount,
  },
]

const plan = {
  schema_version: 1,
  status: 'planned-not-applied',
  policy_version:
    policy.policy_version,
  run_id: runId,
  design_version:
    decisions.design_version,
  input_checksums: {
    application_policy_sha256:
      await sha256File(paths.policy),
    review_decisions_sha256:
      decisionsHash,
    accepted_decisions_sha256:
      acceptedHash,
    resolution_proposals_sha256:
      await sha256File(paths.proposals),
    staging_application_evidence_sha256:
      await sha256File(paths.application),
  },
  totals: {
    staged_segment_count: totalCount,
    accepted_decision_count:
      targetCount,
    target_segment_count:
      targetCount,
    unaffected_segment_count:
      unaffectedCount,
    preflight_check_count:
      preflightChecks.length,
    verification_check_count:
      verificationChecks.length,
    content_row_count: 0,
    successor_mapping_count: 0,
    dependency_snapshot_count: 0,
    database_change_count: 0,
  },
  planned_status_transition: {
    from: 'boundary-review',
    to: 'content-review',
    target_count: targetCount,
    content_approval: false,
  },
  books,
  targets,
  artifacts: {
    ...policy.planned_artifacts,
    ...generated,
  },
  application_boundary:
    policy.application_boundary,
}

const report = `# Mechanical Boundary Application Plan

- Status: \`${plan.status}\`
- Policy version: \`${plan.policy_version}\`
- Migration run ID: \`${plan.run_id}\`
- Staged reading segments: \`${totalCount}\`
- Accepted decisions: \`${targetCount}\`
- Planned target rows: \`${targetCount}\`
- Unaffected rows: \`${unaffectedCount}\`
- Preflight checks: \`${preflightChecks.length}\`
- Post-application checks: \`${verificationChecks.length}\`
- SQL applied: \`false\`
- Content approved or loaded: \`false\`
- Production modified: \`false\`
- Cutover enabled: \`false\`

## Planned transition

\`\`\`text
boundary-review -> content-review
\`\`\`

This transition records that the 166 canonical boundaries passed independent review and may proceed to content review.

It is not final content approval.

## Planned targets by work

| Work | Target rows |
| --- | ---: |
| O Evangelho Segundo o Espiritismo | ${targetCount} |

## Generated SQL

- read-only preflight;
- transactional one-time application;
- read-only post-application verification.

The application changes only \`approval_status\` and \`updated_at\` on the 166 private staging rows.

It does not change segment keys, order, source keys, start locators, end locators, display titles, content fields, production records, mappings, dependency snapshots, progress, sessions, or cutover.

## Decision

PR-0024 prepares the application package but does not execute it.

The SQL may be considered for manual execution only after this Pull Request is merged and the preflight returns all checks as passing.
`

await Promise.all([
  writeFile(
    paths.plan,
    `${JSON.stringify(
      plan,
      null,
      2,
    )}\n`,
    'utf8',
  ),
  writeFile(
    paths.report,
    `${report}\n`,
    'utf8',
  ),
])

console.log(
  `Application targets: ${targetCount}`,
)
console.log(
  `Unaffected segments: ${unaffectedCount}`,
)
console.log(
  `Preflight checks: ${preflightChecks.length}`,
)
console.log(
  `Verification checks: ${verificationChecks.length}`,
)
console.log(
  'SQL generated but not applied.',
)
