-- ============================================================
-- VEREDA — Reading-segment design verification
--
-- READ-ONLY.
-- This SQL is generated for the future application gate.
-- It is not executed in PR-0018.
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
  (
    select status
    from content_staging.migration_runs
    where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
  ) = 'reviewing' as passed,
  (
    select status
    from content_staging.migration_runs
    where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
  ) as actual_value,
  jsonb_build_object(
    'expected',
    'reviewing'
  ) as details

union all

select
  'reading-segment-total'::text as check_key,
  'blocking'::text as severity,
  (
    select count(*)
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
  ) = 812 as passed,
  (
    select count(*)::text
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
  ) as actual_value,
  jsonb_build_object(
    'expected',
    812
  ) as details

union all

select
  'boundary-review-only'::text as check_key,
  'blocking'::text as severity,
  not exists (
    select 1
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and approval_status <> 'boundary-review'
  ) as passed,
  (
    select count(*)::text
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and approval_status <> 'boundary-review'
  ) as actual_value,
  jsonb_build_object(
    'expected',
    0
  ) as details

union all

select
  'content-remains-null'::text as check_key,
  'blocking'::text as severity,
  not exists (
    select 1
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and (
        content is not null
        or word_count is not null
        or normalized_content_sha256 is not null
      )
  ) as passed,
  (
    select count(*)::text
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and (
        content is not null
        or word_count is not null
        or normalized_content_sha256 is not null
      )
  ) as actual_value,
  jsonb_build_object(
    'expected',
    0
  ) as details

union all

select
  'editorial-node-references-valid'::text as check_key,
  'blocking'::text as severity,
  not exists (
    select 1
    from content_staging.reading_segments segment
    left join content_staging.editorial_nodes node
      on node.run_id = segment.run_id
     and node.book_id = segment.book_id
     and node.source_key = segment.source_key
    where segment.run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and node.source_key is null
  ) as passed,
  (
    select count(*)::text
    from content_staging.reading_segments segment
    left join content_staging.editorial_nodes node
      on node.run_id = segment.run_id
     and node.book_id = segment.book_id
     and node.source_key = segment.source_key
    where segment.run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and node.source_key is null
  ) as actual_value,
  jsonb_build_object(
    'expected',
    0
  ) as details

union all

select
  'successor-mapping-count'::text as check_key,
  'blocking'::text as severity,
  (
    select count(*)
    from content_staging.current_successor_mappings
  ) = 0 as passed,
  (
    select count(*)::text
    from content_staging.current_successor_mappings
  ) as actual_value,
  jsonb_build_object(
    'expected',
    0
  ) as details

union all

select
  'dependency-snapshot-count'::text as check_key,
  'blocking'::text as severity,
  (
    select count(*)
    from content_staging.dependency_snapshots
  ) = 0 as passed,
  (
    select count(*)::text
    from content_staging.dependency_snapshots
  ) as actual_value,
  jsonb_build_object(
    'expected',
    0
  ) as details

union all

select
  'dry-run-result-count'::text as check_key,
  'blocking'::text as severity,
  (
    select count(*)
    from content_staging.dry_run_results
  ) = 0 as passed,
  (
    select count(*)::text
    from content_staging.dry_run_results
  ) as actual_value,
  jsonb_build_object(
    'expected',
    0
  ) as details

union all

select
  'production-section-count'::text as check_key,
  'blocking'::text as severity,
  (
    select count(*)
    from public.sections
  ) = 908 as passed,
  (
    select count(*)::text
    from public.sections
  ) as actual_value,
  jsonb_build_object(
    'expected',
    908,
    'contains_user_identifiers',
    false
  ) as details

union all

select
  'book-1-segment-count'::text as check_key,
  'blocking'::text as severity,
  (
    select count(*)
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and book_id = 1
  ) = 200 as passed,
  (
    select count(*)::text
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and book_id = 1
  ) as actual_value,
  jsonb_build_object(
    'expected',
    200
  ) as details

union all

select
  'book-2-segment-count'::text as check_key,
  'blocking'::text as severity,
  (
    select count(*)
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and book_id = 2
  ) = 135 as passed,
  (
    select count(*)::text
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and book_id = 2
  ) as actual_value,
  jsonb_build_object(
    'expected',
    135
  ) as details

union all

select
  'book-3-segment-count'::text as check_key,
  'blocking'::text as severity,
  (
    select count(*)
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and book_id = 3
  ) = 230 as passed,
  (
    select count(*)::text
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and book_id = 3
  ) as actual_value,
  jsonb_build_object(
    'expected',
    230
  ) as details

union all

select
  'book-4-segment-count'::text as check_key,
  'blocking'::text as severity,
  (
    select count(*)
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and book_id = 4
  ) = 110 as passed,
  (
    select count(*)::text
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and book_id = 4
  ) as actual_value,
  jsonb_build_object(
    'expected',
    110
  ) as details

union all

select
  'book-5-segment-count'::text as check_key,
  'blocking'::text as severity,
  (
    select count(*)
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and book_id = 5
  ) = 137 as passed,
  (
    select count(*)::text
    from content_staging.reading_segments
    where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
      and book_id = 5
  ) as actual_value,
  jsonb_build_object(
    'expected',
    137
  ) as details
) checks
order by checks.check_key;
