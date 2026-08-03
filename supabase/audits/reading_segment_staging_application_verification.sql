-- ============================================================
-- VEREDA — PR-0019 reading-segment staging verification
--
-- READ-ONLY.
-- Export the complete result as CSV.
-- Does not return content or user identifiers.
-- ============================================================

select
  checks.check_key,
  checks.severity,
  checks.passed,
  checks.actual_value,
  checks.details
from (
select
  'migration-run-status'::text as check_key,
  'blocking'::text as severity,
  (coalesce((
    select status
    from content_staging.migration_runs
    where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
  ), '') = 'reviewing') as passed,
  (select status
    from content_staging.migration_runs
    where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid)::text as actual_value,
  jsonb_build_object('expected', 'reviewing') as details

union all

select
  'rights-status'::text as check_key,
  'blocking'::text as severity,
  (coalesce((
    select rights_status
    from content_staging.migration_runs
    where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
  ), '') = 'blocked') as passed,
  (select rights_status
    from content_staging.migration_runs
    where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid)::text as actual_value,
  jsonb_build_object('expected', 'blocked') as details

union all

select
  'reading-segment-total'::text as check_key,
  'blocking'::text as severity,
  ((select count(*)
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
  ) = 812) as passed,
  (select count(*)
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid)::text as actual_value,
  jsonb_build_object(
    'expected',
    812
  ) as details

union all

select
  'book-1-segment-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*)
      from content_staging.reading_segments
      where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
        and book_id = 1
    ) = 200) as passed,
  (select count(*)
      from content_staging.reading_segments
      where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
        and book_id = 1)::text as actual_value,
  jsonb_build_object(
      'expected',
      200
    ) as details

union all

select
  'book-2-segment-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*)
      from content_staging.reading_segments
      where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
        and book_id = 2
    ) = 135) as passed,
  (select count(*)
      from content_staging.reading_segments
      where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
        and book_id = 2)::text as actual_value,
  jsonb_build_object(
      'expected',
      135
    ) as details

union all

select
  'book-3-segment-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*)
      from content_staging.reading_segments
      where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
        and book_id = 3
    ) = 230) as passed,
  (select count(*)
      from content_staging.reading_segments
      where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
        and book_id = 3)::text as actual_value,
  jsonb_build_object(
      'expected',
      230
    ) as details

union all

select
  'book-4-segment-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*)
      from content_staging.reading_segments
      where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
        and book_id = 4
    ) = 110) as passed,
  (select count(*)
      from content_staging.reading_segments
      where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
        and book_id = 4)::text as actual_value,
  jsonb_build_object(
      'expected',
      110
    ) as details

union all

select
  'book-5-segment-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*)
      from content_staging.reading_segments
      where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
        and book_id = 5
    ) = 137) as passed,
  (select count(*)
      from content_staging.reading_segments
      where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
        and book_id = 5)::text as actual_value,
  jsonb_build_object(
      'expected',
      137
    ) as details

union all

select
  'boundary-review-only'::text as check_key,
  'blocking'::text as severity,
  (not exists (
    select 1
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and approval_status <> 'boundary-review'
  )) as passed,
  (select count(*)
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and approval_status <> 'boundary-review')::text as actual_value,
  jsonb_build_object('expected', 0) as details

union all

select
  'content-remains-null'::text as check_key,
  'blocking'::text as severity,
  (not exists (
    select 1
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and (
        content is not null
        or word_count is not null
        or normalized_content_sha256 is not null
      )
  )) as passed,
  (select count(*)
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and (
        content is not null
        or word_count is not null
        or normalized_content_sha256 is not null
      ))::text as actual_value,
  jsonb_build_object('expected', 0) as details

union all

select
  'editorial-node-references-valid'::text as check_key,
  'blocking'::text as severity,
  (not exists (
    select 1
    from content_staging.reading_segments segment
    left join content_staging.editorial_nodes node
      on node.run_id = segment.run_id
     and node.book_id = segment.book_id
     and node.source_key = segment.source_key
    where segment.run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and node.source_key is null
  )) as passed,
  (select count(*)
    from content_staging.reading_segments segment
    left join content_staging.editorial_nodes node
      on node.run_id = segment.run_id
     and node.book_id = segment.book_id
     and node.source_key = segment.source_key
    where segment.run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and node.source_key is null)::text as actual_value,
  jsonb_build_object('expected', 0) as details

union all

select
  'segment-key-uniqueness'::text as check_key,
  'blocking'::text as severity,
  ((select count(*)
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
  ) = (
    select count(distinct (book_id, segment_key))
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
  )) as passed,
  (select count(*) - count(distinct (book_id, segment_key))
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid)::text as actual_value,
  jsonb_build_object('expected_duplicates', 0) as details

union all

select
  'segment-order-contiguous'::text as check_key,
  'blocking'::text as severity,
  (not exists (
    select 1
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
    group by book_id
    having min(segment_order) <> 1
       or max(segment_order) <> count(*)
       or count(distinct segment_order) <> count(*)
  )) as passed,
  (select count(*)
    from (
      select book_id
      from content_staging.reading_segments
      where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      group by book_id
      having min(segment_order) <> 1
         or max(segment_order) <> count(*)
         or count(distinct segment_order) <> count(*)
    ) invalid_books)::text as actual_value,
  jsonb_build_object('expected_invalid_books', 0) as details

union all

select
  'start-locators-present'::text as check_key,
  'blocking'::text as severity,
  (not exists (
    select 1
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and start_locator is null
  )) as passed,
  (select count(*)
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and start_locator is null)::text as actual_value,
  jsonb_build_object('expected', 0) as details

union all

select
  'end-locators-present'::text as check_key,
  'blocking'::text as severity,
  (not exists (
    select 1
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and end_locator is null
  )) as passed,
  (select count(*)
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and end_locator is null)::text as actual_value,
  jsonb_build_object('expected', 0) as details

union all

select
  'boundary-version-one'::text as check_key,
  'blocking'::text as severity,
  (not exists (
    select 1
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and boundary_version <> 1
  )) as passed,
  (select count(*)
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and boundary_version <> 1)::text as actual_value,
  jsonb_build_object('expected', 0) as details

union all

select
  'segment-index-count-one'::text as check_key,
  'blocking'::text as severity,
  (not exists (
    select 1
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and (
        segment_index <> 1
        or segment_count <> 1
      )
  )) as passed,
  (select count(*)
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and (
        segment_index <> 1
        or segment_count <> 1
      ))::text as actual_value,
  jsonb_build_object('expected', 0) as details

union all

select
  'successor-mapping-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*)
      from content_staging.current_successor_mappings
    ) = 0) as passed,
  (select count(*)
      from content_staging.current_successor_mappings)::text as actual_value,
  jsonb_build_object('expected', 0) as details

union all

select
  'dependency-snapshot-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*)
      from content_staging.dependency_snapshots
    ) = 0) as passed,
  (select count(*)
      from content_staging.dependency_snapshots)::text as actual_value,
  jsonb_build_object('expected', 0) as details

union all

select
  'dry-run-result-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*)
      from content_staging.dry_run_results
    ) = 0) as passed,
  (select count(*)
      from content_staging.dry_run_results)::text as actual_value,
  jsonb_build_object('expected', 0) as details

union all

select
  'audit-event-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*)
    from content_staging.migration_audit_events
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and event_type = 'reading-segment-design-loaded'
  ) = 1) as passed,
  (select count(*)
    from content_staging.migration_audit_events
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and event_type = 'reading-segment-design-loaded')::text as actual_value,
  jsonb_build_object('expected', 1) as details

union all

select
  'production-section-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*)
    from public.sections
  ) = 908) as passed,
  (select count(*)
    from public.sections)::text as actual_value,
  jsonb_build_object(
    'expected',
    908,
    'contains_user_identifiers',
    false
  ) as details

union all

select
  'application-roles-denied'::text as check_key,
  'blocking'::text as severity,
  (not (
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
)) as passed,
  ((
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
))::text as actual_value,
  jsonb_build_object('expected_any_access', false) as details
) checks
order by checks.check_key;
