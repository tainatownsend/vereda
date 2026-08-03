-- ============================================================
-- VEREDA — Current section structure export
-- PR-0012
--
-- READ-ONLY.
-- This query exports structural metadata only.
-- It does not export complete book text or user data.
--
-- In Supabase SQL Editor:
-- 1. Run this query.
-- 2. Download the result as CSV.
-- 3. Save it as:
--    vereda_current_section_structure.csv
-- ============================================================

select
  b.id as book_id,
  b.title as book_title,
  s.id as section_id,
  s.sec_position,
  coalesce(s.kind, 'content') as kind,
  s.part_title,
  s.chapter_label,
  s.chapter_title,
  s.section_title,
  s.title as record_title,
  coalesce(s.word_count, 0) as stored_word_count,
  case
    when nullif(trim(coalesce(s.content, '')), '') is null then 0
    else array_length(
      regexp_split_to_array(
        trim(s.content),
        '\s+'
      ),
      1
    )
  end as calculated_word_count,
  length(coalesce(s.content, '')) as content_character_count,
  case
    when nullif(trim(coalesce(s.content, '')), '') is null then 0
    else greatest(
      1,
      array_length(
        regexp_split_to_array(
          s.content,
          E'\n\n+'
        ),
        1
      )
    )
  end as paragraph_block_count,
  md5(
    lower(
      regexp_replace(
        trim(coalesce(s.content, '')),
        '\s+',
        ' ',
        'g'
      )
    )
  ) as normalized_content_md5
from public.sections s
join public.books b
  on b.id = s.book_id
order by
  b.id,
  s.sec_position;
