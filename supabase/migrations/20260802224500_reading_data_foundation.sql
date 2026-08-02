begin;

-- ============================================================
-- VEREDA — Reading Data Foundation
-- ============================================================

-- 1. Reading sessions represent real sessions, not merely
--    "a section has been read once".
alter table public.reading_sessions
  drop constraint if exists reading_sessions_user_id_section_id_key;

alter table public.reading_sessions
  add column if not exists created_at timestamptz not null default now();

alter table public.reading_sessions
  add constraint reading_sessions_duration_nonnegative
  check (duration_s is null or duration_s >= 0);

create index if not exists idx_sessions_user_book_date
  on public.reading_sessions (user_id, book_id, read_at desc);

create index if not exists idx_sessions_user_section
  on public.reading_sessions (user_id, section_id);

-- Prevent duplicate positions inside the same book.
create unique index if not exists sections_book_position_key
  on public.sections (book_id, sec_position);

-- 2. Explicit local-date minutes query.
create or replace function public.get_minutes_read_on_date(
  p_user_id uuid,
  p_read_date date
)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(round(sum(rs.duration_s) / 60.0, 1), 0)
  from public.reading_sessions rs
  where rs.user_id = p_user_id
    and rs.read_at = p_read_date;
$$;

-- Backward-compatible function. New clients should pass the
-- user's local date to get_minutes_read_on_date.
create or replace function public.get_minutes_read_today(
  p_user_id uuid
)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select public.get_minutes_read_on_date(p_user_id, current_date);
$$;

-- 3. Reader sections are independent from the daily goal.
--    The frontend/controller decides when the daily moment ends.
create or replace function public.get_todays_sections(
  p_user_id uuid,
  p_book_id integer
)
returns table(
  section_id integer,
  sec_position integer,
  title text,
  content text,
  word_count integer,
  kind text,
  part_title text,
  chapter_label text,
  chapter_title text,
  section_title text
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_current integer;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Unauthorized reader request';
  end if;

  select up.current_section
    into v_current
  from public.user_progress up
  where up.user_id = p_user_id
    and up.book_id = p_book_id;

  if v_current is null then
    return;
  end if;

  return query
  select
    s.id,
    s.sec_position,
    s.title,
    s.content,
    s.word_count,
    s.kind,
    s.part_title,
    s.chapter_label,
    s.chapter_title,
    s.section_title
  from public.sections s
  where s.book_id = p_book_id
    and s.sec_position >= v_current
  order by s.sec_position
  limit 15;
end;
$$;

-- 4. One atomic operation records a completed section,
--    advances progress, marks book completion, and returns
--    the resulting reader state.
create or replace function public.complete_reading_section(
  p_user_id uuid,
  p_book_id integer,
  p_section_id integer,
  p_duration_s integer,
  p_read_date date
)
returns table(
  next_position integer,
  book_completed boolean,
  minutes_read_on_date numeric
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_section_position integer;
  v_next_position integer;
  v_has_next boolean;
  v_completed boolean;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Unauthorized reading update';
  end if;

  if p_duration_s is not null and p_duration_s < 0 then
    raise exception 'duration_s must be nonnegative';
  end if;

  select s.sec_position
    into v_section_position
  from public.sections s
  where s.id = p_section_id
    and s.book_id = p_book_id;

  if v_section_position is null then
    raise exception 'Section does not belong to the requested book';
  end if;

  if not exists (
    select 1
    from public.user_progress up
    where up.user_id = p_user_id
      and up.book_id = p_book_id
  ) then
    raise exception 'Reader progress does not exist for this book';
  end if;

  insert into public.reading_sessions (
    user_id,
    book_id,
    section_id,
    read_at,
    duration_s
  )
  values (
    p_user_id,
    p_book_id,
    p_section_id,
    p_read_date,
    nullif(p_duration_s, 0)
  );

  select exists (
    select 1
    from public.sections s
    where s.book_id = p_book_id
      and s.sec_position > v_section_position
  )
  into v_has_next;

  v_next_position := v_section_position + 1;
  v_completed := not v_has_next;

  update public.user_progress up
  set
    current_section = greatest(up.current_section, v_next_position),
    last_read_at = now(),
    completed_at = case
      when v_completed then coalesce(up.completed_at, now())
      else up.completed_at
    end
  where up.user_id = p_user_id
    and up.book_id = p_book_id
  returning up.current_section into v_next_position;

  return query
  select
    v_next_position,
    v_completed,
    public.get_minutes_read_on_date(p_user_id, p_read_date);
end;
$$;

-- 5. A single read model for initializing the Reader.
create or replace function public.get_reader_state(
  p_user_id uuid,
  p_book_id integer,
  p_read_date date
)
returns table(
  current_section integer,
  pace_mode text,
  pace_minutes integer,
  pace_deadline date,
  minutes_read_on_date numeric,
  daily_goal_reached boolean,
  book_completed boolean
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'Unauthorized reader state request';
  end if;

  return query
  select
    up.current_section,
    up.pace_mode,
    up.pace_minutes,
    up.pace_deadline,
    public.get_minutes_read_on_date(p_user_id, p_read_date),
    case
      when up.pace_mode = 'minutes' and up.pace_minutes is not null
      then public.get_minutes_read_on_date(p_user_id, p_read_date) >= up.pace_minutes
      else false
    end,
    up.completed_at is not null
  from public.user_progress up
  where up.user_id = p_user_id
    and up.book_id = p_book_id;
end;
$$;

-- 6. Completion estimate derives progress from the persisted
--    current position, while reading time remains session-based.
create or replace function public.get_book_completion_estimate(
  p_user_id uuid,
  p_book_id integer
)
returns table(
  words_remaining integer,
  avg_words_per_day numeric,
  estimated_days integer,
  estimated_date date,
  minutes_remaining integer
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_current_position integer;
  v_total_words integer;
  v_words_remaining integer;
  v_words_per_day numeric;
  v_avg_wpm numeric := 200;
begin
  select up.current_section
    into v_current_position
  from public.user_progress up
  where up.user_id = p_user_id
    and up.book_id = p_book_id;

  select coalesce(sum(s.word_count), 0)
    into v_total_words
  from public.sections s
  where s.book_id = p_book_id;

  select coalesce(sum(s.word_count), 0)
    into v_words_remaining
  from public.sections s
  where s.book_id = p_book_id
    and s.sec_position >= coalesce(v_current_position, 1);

  select
    coalesce(sum(d.words_read), 0) / nullif(count(*), 0)
    into v_words_per_day
  from (
    select
      rs.read_at,
      sum(distinct_section.word_count) as words_read
    from public.reading_sessions rs
    join (
      select distinct
        rs2.user_id,
        rs2.book_id,
        rs2.read_at,
        rs2.section_id,
        s.word_count
      from public.reading_sessions rs2
      join public.sections s on s.id = rs2.section_id
      where rs2.user_id = p_user_id
        and rs2.book_id = p_book_id
        and rs2.read_at >= current_date - interval '7 days'
    ) distinct_section
      on distinct_section.user_id = rs.user_id
     and distinct_section.book_id = rs.book_id
     and distinct_section.read_at = rs.read_at
     and distinct_section.section_id = rs.section_id
    where rs.user_id = p_user_id
      and rs.book_id = p_book_id
      and rs.read_at >= current_date - interval '7 days'
    group by rs.read_at
  ) d;

  words_remaining := greatest(0, coalesce(v_words_remaining, v_total_words));
  avg_words_per_day := coalesce(v_words_per_day, v_avg_wpm * 10);
  estimated_days := ceil(words_remaining / nullif(avg_words_per_day, 0))::integer;
  estimated_date := current_date + estimated_days;
  minutes_remaining := ceil(words_remaining / v_avg_wpm)::integer;

  return next;
end;
$$;

-- 7. Function permissions.
grant execute on function public.get_minutes_read_on_date(uuid, date)
  to authenticated;
grant execute on function public.get_minutes_read_today(uuid)
  to authenticated;
grant execute on function public.get_todays_sections(uuid, integer)
  to authenticated;
grant execute on function public.complete_reading_section(uuid, integer, integer, integer, date)
  to authenticated;
grant execute on function public.get_reader_state(uuid, integer, date)
  to authenticated;
grant execute on function public.get_book_completion_estimate(uuid, integer)
  to authenticated;

comment on function public.complete_reading_section(uuid, integer, integer, integer, date)
  is 'Atomically records one reading session, advances progress, and marks true book completion.';

comment on function public.get_reader_state(uuid, integer, date)
  is 'Returns the canonical persisted state used to initialize a Vereda reading session.';

commit;
