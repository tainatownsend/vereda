-- ============================================================
-- VEREDA — Production content-migration preflight
-- PR-0014
--
-- READ-ONLY.
-- Returns aggregate structural and dependency diagnostics.
-- Does not export user identifiers or full book content.
-- ============================================================

with
section_totals as (
  select
    count(*)::bigint as total_sections,
    count(distinct book_id)::bigint as represented_books
  from public.sections
),
duplicate_positions as (
  select count(*)::bigint as duplicate_group_count
  from (
    select book_id, sec_position
    from public.sections
    group by book_id, sec_position
    having count(*) > 1
  ) duplicates
),
orphan_sessions as (
  select count(*)::bigint as orphan_count
  from public.reading_sessions rs
  left join public.sections s
    on s.id = rs.section_id
  where s.id is null
),
session_book_mismatches as (
  select count(*)::bigint as mismatch_count
  from public.reading_sessions rs
  join public.sections s
    on s.id = rs.section_id
  where rs.book_id <> s.book_id
),
progress_out_of_range as (
  select count(*)::bigint as invalid_count
  from public.user_progress up
  left join lateral (
    select max(s.sec_position) as max_position
    from public.sections s
    where s.book_id = up.book_id
  ) limits on true
  where up.current_section < 1
     or up.current_section > coalesce(limits.max_position, 0) + 1
),
dependency_totals as (
  select
    (select count(*) from public.user_progress)::bigint
      as progress_row_count,
    (select count(*) from public.reading_sessions)::bigint
      as reading_session_count,
    (
      select count(distinct rs.user_id)
      from public.reading_sessions rs
    )::bigint as users_with_sessions
)
select
  'section-total' as check_key,
  'info' as severity,
  true as passed,
  st.total_sections::text as actual_value,
  jsonb_build_object(
    'represented_books',
    st.represented_books
  ) as details
from section_totals st

union all

select
  'duplicate-section-positions',
  'blocking',
  dp.duplicate_group_count = 0,
  dp.duplicate_group_count::text,
  '{}'::jsonb
from duplicate_positions dp

union all

select
  'orphan-reading-sessions',
  'blocking',
  os.orphan_count = 0,
  os.orphan_count::text,
  '{}'::jsonb
from orphan_sessions os

union all

select
  'reading-session-book-mismatches',
  'blocking',
  sbm.mismatch_count = 0,
  sbm.mismatch_count::text,
  '{}'::jsonb
from session_book_mismatches sbm

union all

select
  'progress-position-out-of-range',
  'blocking',
  por.invalid_count = 0,
  por.invalid_count::text,
  '{}'::jsonb
from progress_out_of_range por

union all

select
  'aggregate-dependencies',
  'info',
  true,
  dt.progress_row_count::text,
  jsonb_build_object(
    'progress_rows',
    dt.progress_row_count,
    'reading_sessions',
    dt.reading_session_count,
    'users_with_sessions',
    dt.users_with_sessions,
    'contains_user_identifiers',
    false
  )
from dependency_totals dt

order by
  case severity
    when 'blocking' then 1
    when 'warning' then 2
    else 3
  end,
  check_key;
