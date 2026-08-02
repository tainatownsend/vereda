-- Run after applying the migration.

-- 1. Confirm the old unique constraint is gone.
select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.reading_sessions'::regclass
order by conname;

-- 2. Confirm expected indexes.
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('reading_sessions', 'sections')
order by tablename, indexname;

-- 3. Confirm new functions.
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'complete_reading_section',
    'get_reader_state',
    'get_minutes_read_on_date',
    'get_minutes_read_today',
    'get_todays_sections',
    'get_book_completion_estimate'
  )
order by p.proname;

-- 4. Confirm existing rows were preserved.
select
  count(*) as reading_session_count,
  coalesce(sum(duration_s), 0) as total_duration_seconds
from public.reading_sessions;

select
  count(*) as progress_row_count
from public.user_progress;

-- 5. Confirm no duplicate section positions exist.
select book_id, sec_position, count(*) as duplicate_count
from public.sections
group by book_id, sec_position
having count(*) > 1;
