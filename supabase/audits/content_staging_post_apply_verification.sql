-- ============================================================
-- VEREDA — Private content-staging post-application verification
-- PR-0016
--
-- READ-ONLY.
-- Run only after the PR-0014 staging migration is applied.
-- This query does not modify production or staging data.
-- ============================================================

with
expected_tables(name) as (
  values
    ('migration_runs'),
    ('editorial_nodes'),
    ('reading_segments'),
    ('current_successor_mappings'),
    ('dependency_snapshots'),
    ('dry_run_results'),
    ('migration_audit_events')
),
table_check as (
  select
    count(*)::integer as actual_count,
    count(*) = 7 as passed
  from expected_tables expected
  join information_schema.tables tables
    on tables.table_schema = 'content_staging'
   and tables.table_name = expected.name
),
expected_functions(name) as (
  values
    ('capture_dependency_snapshot'),
    ('evaluate_dry_run')
),
function_check as (
  select
    count(*)::integer as actual_count,
    count(*) = 2 as passed
  from expected_functions expected
  join information_schema.routines routines
    on routines.routine_schema = 'content_staging'
   and routines.routine_name = expected.name
),
view_check as (
  select
    count(*)::integer as actual_count,
    count(*) = 1 as passed
  from information_schema.views
  where table_schema = 'content_staging'
    and table_name = 'dry_run_status'
),
application_role_access as (
  select
    (
      has_schema_privilege(
        'anon',
        'content_staging',
        'USAGE'
      )
      or has_schema_privilege(
        'authenticated',
        'content_staging',
        'USAGE'
      )
      or has_schema_privilege(
        'public',
        'content_staging',
        'USAGE'
      )
    ) as any_access
),
service_role_access as (
  select has_schema_privilege(
    'service_role',
    'content_staging',
    'USAGE'
  ) as has_access
),
staging_row_counts as (
  select
    (
      select count(*)
      from content_staging.migration_runs
    )::bigint as migration_runs,
    (
      select count(*)
      from content_staging.editorial_nodes
    )::bigint as editorial_nodes,
    (
      select count(*)
      from content_staging.reading_segments
    )::bigint as reading_segments,
    (
      select count(*)
      from content_staging.current_successor_mappings
    )::bigint as mappings,
    (
      select count(*)
      from content_staging.dependency_snapshots
    )::bigint as dependency_snapshots,
    (
      select count(*)
      from content_staging.dry_run_results
    )::bigint as dry_run_results,
    (
      select count(*)
      from content_staging.migration_audit_events
    )::bigint as audit_events
),
production_counts as (
  select
    (
      select count(*)
      from public.sections
    )::bigint as sections,
    (
      select count(*)
      from public.books
    )::bigint as books,
    (
      select count(*)
      from public.user_progress
    )::bigint as progress_rows,
    (
      select count(*)
      from public.reading_sessions
    )::bigint as reading_sessions
)
select
  checks.check_key,
  checks.severity,
  checks.passed,
  checks.actual_value,
  checks.details
from (
select
  'staging-schema-exists' as check_key,
  'blocking' as severity,
  to_regnamespace('content_staging') is not null as passed,
  case
    when to_regnamespace('content_staging') is not null
    then 'present'
    else 'missing'
  end as actual_value,
  '{}'::jsonb as details

union all

select
  'staging-table-count',
  'blocking',
  tc.passed,
  tc.actual_count::text,
  jsonb_build_object('expected', 7)
from table_check tc

union all

select
  'staging-function-count',
  'blocking',
  fc.passed,
  fc.actual_count::text,
  jsonb_build_object('expected', 2)
from function_check fc

union all

select
  'staging-view-count',
  'blocking',
  vc.passed,
  vc.actual_count::text,
  jsonb_build_object('expected', 1)
from view_check vc

union all

select
  'application-roles-denied',
  'blocking',
  not ara.any_access,
  ara.any_access::text,
  jsonb_build_object(
    'expected_any_access',
    false
  )
from application_role_access ara

union all

select
  'service-role-has-usage',
  'blocking',
  sra.has_access,
  sra.has_access::text,
  jsonb_build_object(
    'expected',
    true
  )
from service_role_access sra

union all

select
  'staging-is-empty',
  'blocking',
  (
    src.migration_runs = 0
    and src.editorial_nodes = 0
    and src.reading_segments = 0
    and src.mappings = 0
    and src.dependency_snapshots = 0
    and src.dry_run_results = 0
    and src.audit_events = 0
  ),
  (
    src.migration_runs
    + src.editorial_nodes
    + src.reading_segments
    + src.mappings
    + src.dependency_snapshots
    + src.dry_run_results
    + src.audit_events
  )::text,
  to_jsonb(src)
from staging_row_counts src

union all

select
  'production-section-count',
  'blocking',
  pc.sections = 908,
  pc.sections::text,
  jsonb_build_object(
    'expected',
    908,
    'books',
    pc.books,
    'progress_rows',
    pc.progress_rows,
    'reading_sessions',
    pc.reading_sessions,
    'contains_user_identifiers',
    false
  )
from production_counts pc
) checks
order by
  case checks.severity
    when 'blocking' then 1
    when 'warning' then 2
    else 3
  end,
  checks.check_key;
