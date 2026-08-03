-- ============================================================
-- VEREDA — PR-0017 editorial-node staging verification
--
-- READ-ONLY.
-- Export the result as CSV.
-- ============================================================

select
  checks.check_key,
  checks.severity,
  checks.passed,
  checks.actual_value,
  checks.details
from (
select
  'migration-run-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*) from content_staging.migration_runs) = 1) as passed,
  (select count(*) from content_staging.migration_runs)::text as actual_value,
  jsonb_build_object('expected', 1) as details

union all

select
  'migration-run-id'::text as check_key,
  'blocking'::text as severity,
  (coalesce((select id::text from content_staging.migration_runs where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid), '') = 'adcff561-8f92-545c-a219-615818a454f4') as passed,
  (select id::text from content_staging.migration_runs where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid)::text as actual_value,
  jsonb_build_object('expected', 'adcff561-8f92-545c-a219-615818a454f4') as details

union all

select
  'migration-version'::text as check_key,
  'blocking'::text as severity,
  (coalesce((select migration_version from content_staging.migration_runs where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid), '') = '2026-08-03-editorial-structure-v1') as passed,
  (select migration_version from content_staging.migration_runs where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid)::text as actual_value,
  jsonb_build_object('expected', '2026-08-03-editorial-structure-v1') as details

union all

select
  'migration-run-status'::text as check_key,
  'blocking'::text as severity,
  (coalesce((select status from content_staging.migration_runs where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid), '') = 'loaded') as passed,
  (select status from content_staging.migration_runs where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid)::text as actual_value,
  jsonb_build_object('expected', 'loaded') as details

union all

select
  'rights-status'::text as check_key,
  'blocking'::text as severity,
  (coalesce((select rights_status from content_staging.migration_runs where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid), '') = 'blocked') as passed,
  (select rights_status from content_staging.migration_runs where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid)::text as actual_value,
  jsonb_build_object('expected', 'blocked') as details

union all

select
  'reconstruction-plan-checksum'::text as check_key,
  'blocking'::text as severity,
  (coalesce((select reconstruction_plan_sha256 from content_staging.migration_runs where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid), '') = '659c8691129a7fb1739994a9969228e268440cb025178d1636542fae333bc215') as passed,
  (select reconstruction_plan_sha256 from content_staging.migration_runs where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid)::text as actual_value,
  jsonb_build_object('expected', '659c8691129a7fb1739994a9969228e268440cb025178d1636542fae333bc215') as details

union all

select
  'source-map-checksums'::text as check_key,
  'blocking'::text as severity,
  (coalesce((select source_map_checksums from content_staging.migration_runs where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid), '{}'::jsonb) = '{"a-genese":"b98a04efdda049015dac10e3c2d6b0ab5ab7b5b9487867c19478ed3c48151de6","o-ceu-e-o-inferno":"a11cb7e2872a7915d412b951fbec6ee2017fd5b6fae5f6434081f36a3e0e3c1b","o-evangelho-segundo-o-espiritismo":"a2c35f092ec351caefa9860837f77619453e8669c3732fd857fe78b6a94f2f6e","o-livro-dos-espiritos":"0e8735ac7581eb21af09842c2a96f0774622868fae329bb76e0f70a079e0e839","o-livro-dos-mediuns":"569d70fe853607cd8f9408578312b376554b1397454ccf9b1e4d8fdeba214a29"}'::jsonb) as passed,
  (select source_map_checksums::text from content_staging.migration_runs where id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid)::text as actual_value,
  jsonb_build_object('expected_book_count', 5) as details

union all

select
  'editorial-node-total'::text as check_key,
  'blocking'::text as severity,
  ((select count(*) from content_staging.editorial_nodes where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid) = 826) as passed,
  (select count(*) from content_staging.editorial_nodes where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid)::text as actual_value,
  jsonb_build_object('expected', 826) as details

union all

select
  'book-1-node-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*) from content_staging.editorial_nodes where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid and book_id = 1) = 200) as passed,
  (select count(*) from content_staging.editorial_nodes where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid and book_id = 1)::text as actual_value,
  jsonb_build_object('expected', 200, 'slug', 'o-livro-dos-espiritos') as details

union all

select
  'book-2-node-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*) from content_staging.editorial_nodes where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid and book_id = 2) = 135) as passed,
  (select count(*) from content_staging.editorial_nodes where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid and book_id = 2)::text as actual_value,
  jsonb_build_object('expected', 135, 'slug', 'o-livro-dos-mediuns') as details

union all

select
  'book-3-node-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*) from content_staging.editorial_nodes where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid and book_id = 3) = 235) as passed,
  (select count(*) from content_staging.editorial_nodes where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid and book_id = 3)::text as actual_value,
  jsonb_build_object('expected', 235, 'slug', 'o-evangelho-segundo-o-espiritismo') as details

union all

select
  'book-4-node-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*) from content_staging.editorial_nodes where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid and book_id = 4) = 110) as passed,
  (select count(*) from content_staging.editorial_nodes where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid and book_id = 4)::text as actual_value,
  jsonb_build_object('expected', 110, 'slug', 'o-ceu-e-o-inferno') as details

union all

select
  'book-5-node-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*) from content_staging.editorial_nodes where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid and book_id = 5) = 146) as passed,
  (select count(*) from content_staging.editorial_nodes where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid and book_id = 5)::text as actual_value,
  jsonb_build_object('expected', 146, 'slug', 'a-genese') as details

union all

select
  'editorial-parent-orphans'::text as check_key,
  'blocking'::text as severity,
  ((select count(*)
from content_staging.editorial_nodes child
left join content_staging.editorial_nodes parent
  on parent.run_id = child.run_id
 and parent.book_id = child.book_id
 and parent.source_key = child.parent_source_key
where child.run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
  and child.parent_source_key is not null
  and parent.source_key is null) = 0) as passed,
  (select count(*)
from content_staging.editorial_nodes child
left join content_staging.editorial_nodes parent
  on parent.run_id = child.run_id
 and parent.book_id = child.book_id
 and parent.source_key = child.parent_source_key
where child.run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid
  and child.parent_source_key is not null
  and parent.source_key is null)::text as actual_value,
  jsonb_build_object('expected', 0) as details

union all

select
  'forbidden-locator-keys'::text as check_key,
  'blocking'::text as severity,
  ((select count(*) from content_staging.editorial_nodes where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid and source_locator ?| array['content','raw_text','full_text','excerpt']) = 0) as passed,
  (select count(*) from content_staging.editorial_nodes where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid and source_locator ?| array['content','raw_text','full_text','excerpt'])::text as actual_value,
  jsonb_build_object('expected', 0) as details

union all

select
  'reading-segment-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*) from content_staging.reading_segments) = 0) as passed,
  (select count(*) from content_staging.reading_segments)::text as actual_value,
  jsonb_build_object('expected', 0) as details

union all

select
  'successor-mapping-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*) from content_staging.current_successor_mappings) = 0) as passed,
  (select count(*) from content_staging.current_successor_mappings)::text as actual_value,
  jsonb_build_object('expected', 0) as details

union all

select
  'dependency-snapshot-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*) from content_staging.dependency_snapshots) = 0) as passed,
  (select count(*) from content_staging.dependency_snapshots)::text as actual_value,
  jsonb_build_object('expected', 0) as details

union all

select
  'dry-run-result-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*) from content_staging.dry_run_results) = 0) as passed,
  (select count(*) from content_staging.dry_run_results)::text as actual_value,
  jsonb_build_object('expected', 0) as details

union all

select
  'audit-event-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*) from content_staging.migration_audit_events where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid and event_type = 'editorial-nodes-loaded') = 1) as passed,
  (select count(*) from content_staging.migration_audit_events where run_id = 'adcff561-8f92-545c-a219-615818a454f4'::uuid and event_type = 'editorial-nodes-loaded')::text as actual_value,
  jsonb_build_object('expected', 1) as details

union all

select
  'production-section-count'::text as check_key,
  'blocking'::text as severity,
  ((select count(*) from public.sections) = 908) as passed,
  (select count(*) from public.sections)::text as actual_value,
  jsonb_build_object('expected', 908, 'contains_user_identifiers', false) as details

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
