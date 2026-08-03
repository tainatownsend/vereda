begin;

-- ============================================================
-- VEREDA — Non-production content staging foundation
-- PR-0014
--
-- This migration creates an isolated staging schema.
-- It does not alter, replace, or delete production book content.
-- It does not migrate user progress.
-- It does not rewrite reading-session history.
-- ============================================================

create schema if not exists content_staging;

comment on schema content_staging is
  'Private, non-production workspace for Vereda content reconstruction and migration dry runs.';

revoke all on schema content_staging from public;
revoke all on schema content_staging from anon;
revoke all on schema content_staging from authenticated;

create table if not exists content_staging.migration_runs (
  id uuid primary key default gen_random_uuid(),
  migration_version text not null unique,
  status text not null default 'draft'
    check (
      status in (
        'draft',
        'loaded',
        'reviewing',
        'dry-run-ready',
        'dry-run-passed',
        'blocked',
        'approved',
        'applied',
        'rolled-back'
      )
    ),
  input_snapshot_sha256 text not null
    check (input_snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  reconstruction_plan_sha256 text not null
    check (reconstruction_plan_sha256 ~ '^[a-f0-9]{64}$'),
  source_map_checksums jsonb not null default '{}'::jsonb
    check (jsonb_typeof(source_map_checksums) = 'object'),
  rights_status text not null default 'blocked'
    check (
      rights_status in (
        'blocked',
        'permission-pending',
        'approved'
      )
    ),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table content_staging.migration_runs is
  'One traceable, reversible content-reconstruction attempt.';

create table if not exists content_staging.editorial_nodes (
  run_id uuid not null
    references content_staging.migration_runs(id)
    on delete cascade,
  book_id integer not null
    references public.books(id)
    on delete restrict,
  source_key text not null
    check (source_key ~ '^[a-f0-9]{16}$'),
  parent_source_key text,
  node_type text not null
    check (
      node_type in (
        'front_matter',
        'division',
        'chapter',
        'group',
        'section',
        'back_matter'
      )
    ),
  canonical_order integer not null
    check (canonical_order > 0),
  label text,
  title text not null
    check (length(trim(title)) > 0),
  source_locator jsonb,
  source_map_sha256 text not null
    check (source_map_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  primary key (run_id, book_id, source_key),
  unique (run_id, book_id, canonical_order),
  foreign key (
    run_id,
    book_id,
    parent_source_key
  )
    references content_staging.editorial_nodes (
      run_id,
      book_id,
      source_key
    )
    deferrable initially deferred
);

comment on table content_staging.editorial_nodes is
  'Canonical source hierarchy. Editorial nodes are not automatically Reader screens.';

create table if not exists content_staging.reading_segments (
  run_id uuid not null
    references content_staging.migration_runs(id)
    on delete cascade,
  book_id integer not null
    references public.books(id)
    on delete restrict,
  segment_key text not null
    check (segment_key ~ '^[a-f0-9]{20,64}$'),
  source_key text not null,
  segment_order integer not null
    check (segment_order > 0),
  segment_index integer not null default 1
    check (segment_index > 0),
  segment_count integer not null default 1
    check (segment_count > 0),
  boundary_version integer not null default 1
    check (boundary_version > 0),
  start_locator jsonb,
  end_locator jsonb,
  display_title text,
  content text,
  word_count integer
    check (word_count is null or word_count >= 0),
  normalized_content_sha256 text
    check (
      normalized_content_sha256 is null
      or normalized_content_sha256 ~ '^[a-f0-9]{64}$'
    ),
  approval_status text not null default 'draft'
    check (
      approval_status in (
        'draft',
        'boundary-review',
        'content-review',
        'approved',
        'blocked'
      )
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (run_id, book_id, segment_key),
  unique (run_id, book_id, segment_order),
  foreign key (
    run_id,
    book_id,
    source_key
  )
    references content_staging.editorial_nodes (
      run_id,
      book_id,
      source_key
    )
    on delete restrict,
  check (segment_index <= segment_count),
  check (
    approval_status <> 'approved'
    or (
      content is not null
      and normalized_content_sha256 is not null
      and word_count is not null
    )
  )
);

comment on table content_staging.reading_segments is
  'Future Reader delivery units. A segment can be smaller than, equal to, or grouped from editorial nodes.';

create table if not exists content_staging.current_successor_mappings (
  run_id uuid not null
    references content_staging.migration_runs(id)
    on delete cascade,
  current_section_id integer not null
    references public.sections(id)
    on delete restrict,
  book_id integer not null
    references public.books(id)
    on delete restrict,
  successor_segment_key text,
  relationship_type text not null
    check (
      relationship_type in (
        'one-to-one',
        'one-to-many',
        'many-to-one',
        'unmatched-current'
      )
    ),
  successor_order integer not null default 1
    check (successor_order > 0),
  confidence text not null
    check (
      confidence in (
        'exact',
        'reviewed',
        'provisional',
        'blocked'
      )
    ),
  review_status text not null default 'pending'
    check (
      review_status in (
        'pending',
        'approved',
        'rejected',
        'blocked'
      )
    ),
  progress_strategy text not null
    check (
      progress_strategy in (
        'retain-current-section-until-cutover',
        'retain-current-section-id-if-boundary-unchanged',
        'map-current-progress-to-first-unread-successor',
        'merge-only-when-all-contributors-complete',
        'block-migration'
      )
    ),
  rollback_current_section_id integer not null
    references public.sections(id)
    on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  primary key (
    run_id,
    current_section_id,
    successor_order
  ),
  foreign key (
    run_id,
    book_id,
    successor_segment_key
  )
    references content_staging.reading_segments (
      run_id,
      book_id,
      segment_key
    )
    deferrable initially deferred,
  check (
    relationship_type = 'unmatched-current'
    or successor_segment_key is not null
  )
);

comment on table content_staging.current_successor_mappings is
  'Reversible links from legacy public.sections records to future reading segments.';

create table if not exists content_staging.dependency_snapshots (
  run_id uuid not null
    references content_staging.migration_runs(id)
    on delete cascade,
  current_section_id integer not null
    references public.sections(id)
    on delete restrict,
  book_id integer not null
    references public.books(id)
    on delete restrict,
  sec_position integer not null,
  progress_at_position_count bigint not null default 0
    check (progress_at_position_count >= 0),
  completed_book_progress_count bigint not null default 0
    check (completed_book_progress_count >= 0),
  reading_session_count bigint not null default 0
    check (reading_session_count >= 0),
  distinct_session_user_count bigint not null default 0
    check (distinct_session_user_count >= 0),
  captured_at timestamptz not null default now(),
  primary key (run_id, current_section_id)
);

comment on table content_staging.dependency_snapshots is
  'Aggregate dependency counts only. No user identifiers are persisted.';

create table if not exists content_staging.dry_run_results (
  run_id uuid not null
    references content_staging.migration_runs(id)
    on delete cascade,
  check_key text not null,
  severity text not null
    check (severity in ('info', 'warning', 'blocking')),
  passed boolean not null,
  expected_value text,
  actual_value text,
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object'),
  evaluated_at timestamptz not null default now(),
  primary key (run_id, check_key)
);

create table if not exists content_staging.migration_audit_events (
  id bigint generated always as identity primary key,
  run_id uuid not null
    references content_staging.migration_runs(id)
    on delete cascade,
  event_type text not null,
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists idx_staging_nodes_book_order
  on content_staging.editorial_nodes (
    run_id,
    book_id,
    canonical_order
  );

create index if not exists idx_staging_segments_book_order
  on content_staging.reading_segments (
    run_id,
    book_id,
    segment_order
  );

create index if not exists idx_staging_mappings_successor
  on content_staging.current_successor_mappings (
    run_id,
    book_id,
    successor_segment_key
  );

create index if not exists idx_staging_dependencies_book
  on content_staging.dependency_snapshots (
    run_id,
    book_id,
    sec_position
  );

create or replace function content_staging.capture_dependency_snapshot(
  p_run_id uuid
)
returns integer
language plpgsql
security definer
set search_path = content_staging, public, pg_temp
as $$
declare
  v_inserted integer;
begin
  if not exists (
    select 1
    from content_staging.migration_runs mr
    where mr.id = p_run_id
  ) then
    raise exception 'Unknown content-staging migration run';
  end if;

  delete from content_staging.dependency_snapshots ds
  where ds.run_id = p_run_id;

  insert into content_staging.dependency_snapshots (
    run_id,
    current_section_id,
    book_id,
    sec_position,
    progress_at_position_count,
    completed_book_progress_count,
    reading_session_count,
    distinct_session_user_count
  )
  select
    p_run_id,
    s.id,
    s.book_id,
    s.sec_position,
    (
      select count(*)
      from public.user_progress up
      where up.book_id = s.book_id
        and up.current_section = s.sec_position
    ),
    (
      select count(*)
      from public.user_progress up
      where up.book_id = s.book_id
        and up.completed_at is not null
    ),
    (
      select count(*)
      from public.reading_sessions rs
      where rs.section_id = s.id
    ),
    (
      select count(distinct rs.user_id)
      from public.reading_sessions rs
      where rs.section_id = s.id
    )
  from public.sections s;

  get diagnostics v_inserted = row_count;

  insert into content_staging.migration_audit_events (
    run_id,
    event_type,
    details
  )
  values (
    p_run_id,
    'dependency-snapshot-captured',
    jsonb_build_object(
      'section_count',
      v_inserted,
      'contains_user_identifiers',
      false
    )
  );

  return v_inserted;
end;
$$;

comment on function content_staging.capture_dependency_snapshot(uuid) is
  'Captures aggregate progress and reading-session dependencies without storing user identifiers.';

create or replace function content_staging.evaluate_dry_run(
  p_run_id uuid
)
returns table (
  check_key text,
  severity text,
  passed boolean,
  expected_value text,
  actual_value text
)
language plpgsql
security definer
set search_path = content_staging, public, pg_temp
as $$
declare
  v_duplicate_positions bigint;
  v_orphan_sessions bigint;
  v_session_book_mismatches bigint;
  v_progress_out_of_range bigint;
  v_pending_mapping_reviews bigint;
  v_split_without_successors bigint;
  v_approved_segments_without_dependencies bigint;
begin
  if not exists (
    select 1
    from content_staging.migration_runs mr
    where mr.id = p_run_id
  ) then
    raise exception 'Unknown content-staging migration run';
  end if;

  delete from content_staging.dry_run_results dr
  where dr.run_id = p_run_id;

  select count(*)
  into v_duplicate_positions
  from (
    select s.book_id, s.sec_position
    from public.sections s
    group by s.book_id, s.sec_position
    having count(*) > 1
  ) duplicates;

  select count(*)
  into v_orphan_sessions
  from public.reading_sessions rs
  left join public.sections s
    on s.id = rs.section_id
  where s.id is null;

  select count(*)
  into v_session_book_mismatches
  from public.reading_sessions rs
  join public.sections s
    on s.id = rs.section_id
  where rs.book_id <> s.book_id;

  select count(*)
  into v_progress_out_of_range
  from public.user_progress up
  left join lateral (
    select max(s.sec_position) as max_position
    from public.sections s
    where s.book_id = up.book_id
  ) limits on true
  where up.current_section < 1
     or up.current_section > coalesce(limits.max_position, 0) + 1;

  select count(*)
  into v_pending_mapping_reviews
  from content_staging.current_successor_mappings csm
  where csm.run_id = p_run_id
    and csm.review_status <> 'approved';

  select count(*)
  into v_split_without_successors
  from (
    select csm.current_section_id
    from content_staging.current_successor_mappings csm
    where csm.run_id = p_run_id
      and csm.relationship_type = 'one-to-many'
    group by csm.current_section_id
    having count(csm.successor_segment_key) < 2
  ) invalid_splits;

  select count(*)
  into v_approved_segments_without_dependencies
  from content_staging.reading_segments rs
  left join content_staging.dependency_snapshots ds
    on ds.run_id = rs.run_id
   and ds.book_id = rs.book_id
  where rs.run_id = p_run_id
    and rs.approval_status = 'approved'
    and ds.run_id is null;

  insert into content_staging.dry_run_results (
    run_id,
    check_key,
    severity,
    passed,
    expected_value,
    actual_value
  )
  values
    (
      p_run_id,
      'production-duplicate-section-positions',
      'blocking',
      v_duplicate_positions = 0,
      '0',
      v_duplicate_positions::text
    ),
    (
      p_run_id,
      'production-orphan-reading-sessions',
      'blocking',
      v_orphan_sessions = 0,
      '0',
      v_orphan_sessions::text
    ),
    (
      p_run_id,
      'production-session-book-mismatches',
      'blocking',
      v_session_book_mismatches = 0,
      '0',
      v_session_book_mismatches::text
    ),
    (
      p_run_id,
      'production-progress-out-of-range',
      'blocking',
      v_progress_out_of_range = 0,
      '0',
      v_progress_out_of_range::text
    ),
    (
      p_run_id,
      'staging-pending-mapping-reviews',
      'blocking',
      v_pending_mapping_reviews = 0,
      '0',
      v_pending_mapping_reviews::text
    ),
    (
      p_run_id,
      'staging-splits-without-successors',
      'blocking',
      v_split_without_successors = 0,
      '0',
      v_split_without_successors::text
    ),
    (
      p_run_id,
      'approved-segments-without-dependency-snapshot',
      'blocking',
      v_approved_segments_without_dependencies = 0,
      '0',
      v_approved_segments_without_dependencies::text
    );

  return query
  select
    dr.check_key,
    dr.severity,
    dr.passed,
    dr.expected_value,
    dr.actual_value
  from content_staging.dry_run_results dr
  where dr.run_id = p_run_id
  order by
    case dr.severity
      when 'blocking' then 1
      when 'warning' then 2
      else 3
    end,
    dr.check_key;
end;
$$;

comment on function content_staging.evaluate_dry_run(uuid) is
  'Evaluates production integrity and staging readiness without performing a cutover.';

create or replace view content_staging.dry_run_status as
select
  mr.id as run_id,
  mr.migration_version,
  mr.status,
  count(dr.check_key) as evaluated_check_count,
  count(*) filter (
    where dr.severity = 'blocking'
      and not dr.passed
  ) as blocking_failure_count,
  case
    when count(dr.check_key) = 0 then false
    else bool_and(
      case
        when dr.severity = 'blocking'
        then dr.passed
        else true
      end
    )
  end as blocking_checks_passed,
  max(dr.evaluated_at) as last_evaluated_at
from content_staging.migration_runs mr
left join content_staging.dry_run_results dr
  on dr.run_id = mr.id
group by
  mr.id,
  mr.migration_version,
  mr.status;

revoke all on all tables in schema content_staging
  from public, anon, authenticated;

revoke all on all sequences in schema content_staging
  from public, anon, authenticated;

revoke all on all functions in schema content_staging
  from public, anon, authenticated;

alter default privileges in schema content_staging
  revoke all on tables
  from public, anon, authenticated;

alter default privileges in schema content_staging
  revoke all on sequences
  from public, anon, authenticated;

alter default privileges in schema content_staging
  revoke all on functions
  from public, anon, authenticated;

grant usage on schema content_staging to service_role;

grant select, insert, update, delete
  on all tables in schema content_staging
  to service_role;

grant usage, select
  on all sequences in schema content_staging
  to service_role;

grant execute
  on all functions in schema content_staging
  to service_role;

commit;
