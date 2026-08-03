-- ============================================================
-- VEREDA — Book Content Structure Audit
-- Read-only. This script does not modify database records.
-- Run the complete script in Supabase SQL Editor.
-- Export or copy all result tables into one text file.
-- ============================================================

-- 1. Work inventory and structural completeness.
select
  b.id as book_id,
  b.title,
  count(s.id) as section_count,
  min(s.sec_position) as first_position,
  max(s.sec_position) as last_position,
  count(distinct s.part_title) filter (where s.part_title is not null) as part_count,
  count(distinct concat_ws(' | ', s.part_title, s.chapter_label, s.chapter_title))
    filter (where s.chapter_label is not null or s.chapter_title is not null)
    as chapter_count,
  count(*) filter (where s.kind = 'part_intro') as part_intro_count,
  count(*) filter (where s.kind = 'chapter_intro') as chapter_intro_count,
  count(*) filter (where coalesce(s.kind, 'content') = 'content') as content_count,
  count(*) filter (where nullif(trim(s.content), '') is null) as empty_content_count,
  sum(coalesce(s.word_count, 0)) as stored_word_count,
  sum(
    case
      when nullif(trim(s.content), '') is null then 0
      else array_length(
        regexp_split_to_array(trim(s.content), '\s+'),
        1
      )
    end
  ) as calculated_word_count
from public.books b
left join public.sections s on s.book_id = b.id
group by b.id, b.title
order by b.id;

-- 2. Duplicate positions.
select
  s.book_id,
  b.title,
  s.sec_position,
  count(*) as duplicate_count,
  array_agg(s.id order by s.id) as section_ids
from public.sections s
join public.books b on b.id = s.book_id
group by s.book_id, b.title, s.sec_position
having count(*) > 1
order by s.book_id, s.sec_position;

-- 3. Position gaps.
with ordered as (
  select
    s.book_id,
    b.title,
    s.sec_position,
    lag(s.sec_position) over (
      partition by s.book_id
      order by s.sec_position
    ) as previous_position
  from public.sections s
  join public.books b on b.id = s.book_id
)
select
  book_id,
  title,
  previous_position,
  sec_position as next_position,
  sec_position - previous_position - 1 as missing_position_count
from ordered
where previous_position is not null
  and sec_position - previous_position > 1
order by book_id, sec_position;

-- 4. Section-size distribution by work.
select
  s.book_id,
  b.title,
  count(*) as section_count,
  min(coalesce(s.word_count, 0)) as minimum_words,
  percentile_cont(0.25) within group (order by coalesce(s.word_count, 0)) as p25_words,
  percentile_cont(0.50) within group (order by coalesce(s.word_count, 0)) as median_words,
  percentile_cont(0.75) within group (order by coalesce(s.word_count, 0)) as p75_words,
  max(coalesce(s.word_count, 0)) as maximum_words,
  round(avg(coalesce(s.word_count, 0)), 1) as average_words,
  round(stddev_pop(coalesce(s.word_count, 0)), 1) as word_count_stddev
from public.sections s
join public.books b on b.id = s.book_id
group by s.book_id, b.title
order by s.book_id;

-- 5. Suspiciously common section sizes.
select
  s.book_id,
  b.title,
  s.word_count,
  count(*) as occurrence_count,
  round(
    100.0 * count(*) /
    sum(count(*)) over (partition by s.book_id),
    1
  ) as percentage_of_work
from public.sections s
join public.books b on b.id = s.book_id
where s.word_count is not null
group by s.book_id, b.title, s.word_count
having count(*) >= 5
order by s.book_id, occurrence_count desc, s.word_count;

-- 6. Very short or very long content sections.
select
  s.book_id,
  b.title,
  s.id as section_id,
  s.sec_position,
  s.kind,
  s.part_title,
  s.chapter_label,
  s.chapter_title,
  s.section_title,
  s.word_count,
  left(regexp_replace(coalesce(s.content, ''), '\s+', ' ', 'g'), 180) as preview
from public.sections s
join public.books b on b.id = s.book_id
where coalesce(s.kind, 'content') = 'content'
  and (
    coalesce(s.word_count, 0) < 25
    or coalesce(s.word_count, 0) > 1200
  )
order by s.book_id, s.sec_position;

-- 7. Missing or weak structural metadata.
select
  s.book_id,
  b.title,
  s.id as section_id,
  s.sec_position,
  s.kind,
  s.part_title,
  s.chapter_label,
  s.chapter_title,
  s.section_title,
  s.word_count,
  case
    when s.kind is null then 'missing kind'
    when s.kind = 'part_intro' and nullif(trim(s.part_title), '') is null
      then 'part intro without part_title'
    when s.kind = 'chapter_intro'
      and nullif(trim(s.chapter_label), '') is null
      and nullif(trim(s.chapter_title), '') is null
      then 'chapter intro without chapter metadata'
    when coalesce(s.kind, 'content') = 'content'
      and nullif(trim(s.section_title), '') is null
      then 'content without section_title'
    else 'review'
  end as issue
from public.sections s
join public.books b on b.id = s.book_id
where
  s.kind is null
  or (
    s.kind = 'part_intro'
    and nullif(trim(s.part_title), '') is null
  )
  or (
    s.kind = 'chapter_intro'
    and nullif(trim(s.chapter_label), '') is null
    and nullif(trim(s.chapter_title), '') is null
  )
  or (
    coalesce(s.kind, 'content') = 'content'
    and nullif(trim(s.section_title), '') is null
  )
order by s.book_id, s.sec_position;

-- 8. Paragraph-break diagnostics.
select
  s.book_id,
  b.title,
  count(*) as section_count,
  count(*) filter (where position(E'\n\n' in coalesce(s.content, '')) > 0)
    as sections_with_double_break,
  count(*) filter (
    where position(E'\n\n' in coalesce(s.content, '')) = 0
      and coalesce(s.word_count, 0) >= 250
  ) as long_sections_without_double_break,
  count(*) filter (
    where coalesce(s.content, '') ~ E'[^\\n]\\n[^\\n]'
  ) as sections_with_single_breaks,
  round(
    avg(
      greatest(
        1,
        array_length(
          regexp_split_to_array(coalesce(s.content, ''), E'\n\n+'),
          1
        )
      )
    ),
    1
  ) as average_paragraph_blocks
from public.sections s
join public.books b on b.id = s.book_id
group by s.book_id, b.title
order by s.book_id;

-- 9. Long blocks likely flattened into continuous text.
select
  s.book_id,
  b.title,
  s.id as section_id,
  s.sec_position,
  s.kind,
  s.part_title,
  s.chapter_label,
  s.chapter_title,
  s.section_title,
  s.word_count,
  length(coalesce(s.content, '')) as character_count,
  left(regexp_replace(coalesce(s.content, ''), '\s+', ' ', 'g'), 240) as preview
from public.sections s
join public.books b on b.id = s.book_id
where coalesce(s.word_count, 0) >= 250
  and position(E'\n\n' in coalesce(s.content, '')) = 0
order by s.book_id, s.sec_position;

-- 10. Exact duplicate normalized content.
with normalized as (
  select
    s.*,
    md5(
      lower(
        regexp_replace(
          trim(coalesce(s.content, '')),
          '\s+',
          ' ',
          'g'
        )
      )
    ) as content_hash
  from public.sections s
  where nullif(trim(s.content), '') is not null
)
select
  n.book_id,
  b.title,
  n.content_hash,
  count(*) as duplicate_count,
  array_agg(n.sec_position order by n.sec_position) as positions,
  array_agg(n.id order by n.sec_position) as section_ids,
  left(
    regexp_replace(min(n.content), '\s+', ' ', 'g'),
    200
  ) as preview
from normalized n
join public.books b on b.id = n.book_id
group by n.book_id, b.title, n.content_hash
having count(*) > 1
order by n.book_id, duplicate_count desc;

-- 11. Repeated beginnings that may indicate overlap.
with snippets as (
  select
    s.book_id,
    b.title,
    s.id,
    s.sec_position,
    left(
      lower(regexp_replace(trim(coalesce(s.content, '')), '\s+', ' ', 'g')),
      120
    ) as beginning
  from public.sections s
  join public.books b on b.id = s.book_id
  where length(trim(coalesce(s.content, ''))) >= 120
)
select
  book_id,
  title,
  beginning,
  count(*) as occurrence_count,
  array_agg(sec_position order by sec_position) as positions
from snippets
group by book_id, title, beginning
having count(*) > 1
order by book_id, occurrence_count desc;

-- 12. Part and chapter map currently represented in the database.
select
  s.book_id,
  b.title,
  coalesce(s.part_title, '[sem parte]') as part_title,
  coalesce(s.chapter_label, '[sem rótulo]') as chapter_label,
  coalesce(s.chapter_title, '[sem título]') as chapter_title,
  min(s.sec_position) as first_position,
  max(s.sec_position) as last_position,
  count(*) as record_count,
  count(*) filter (where s.kind = 'chapter_intro') as chapter_intro_count,
  count(*) filter (where coalesce(s.kind, 'content') = 'content') as content_count,
  sum(coalesce(s.word_count, 0)) as word_count
from public.sections s
join public.books b on b.id = s.book_id
group by
  s.book_id,
  b.title,
  s.part_title,
  s.chapter_label,
  s.chapter_title
order by s.book_id, first_position;

-- 13. Detailed ordered index for source comparison.
select
  s.book_id,
  b.title,
  s.sec_position,
  s.id as section_id,
  s.kind,
  s.part_title,
  s.chapter_label,
  s.chapter_title,
  s.section_title,
  s.word_count,
  left(regexp_replace(coalesce(s.content, ''), '\s+', ' ', 'g'), 160) as preview
from public.sections s
join public.books b on b.id = s.book_id
order by s.book_id, s.sec_position;

-- 14. User-progress dependencies.
select
  up.book_id,
  b.title,
  count(*) as progress_row_count,
  min(up.current_section) as minimum_current_position,
  max(up.current_section) as maximum_current_position,
  count(*) filter (where up.completed_at is not null) as completed_user_count
from public.user_progress up
join public.books b on b.id = up.book_id
group by up.book_id, b.title
order by up.book_id;

-- 15. Reading-session dependencies.
select
  rs.book_id,
  b.title,
  count(*) as session_count,
  count(distinct rs.user_id) as user_count,
  count(distinct rs.section_id) as referenced_section_count,
  min(rs.read_at) as first_read_date,
  max(rs.read_at) as last_read_date
from public.reading_sessions rs
join public.books b on b.id = rs.book_id
group by rs.book_id, b.title
order by rs.book_id;

-- 16. Orphaned references, expected to return no rows.
select
  'reading_session_without_section' as issue,
  rs.id::text as record_id,
  rs.book_id
from public.reading_sessions rs
left join public.sections s on s.id = rs.section_id
where s.id is null

union all

select
  'section_without_book' as issue,
  s.id::text as record_id,
  s.book_id
from public.sections s
left join public.books b on b.id = s.book_id
where b.id is null;
