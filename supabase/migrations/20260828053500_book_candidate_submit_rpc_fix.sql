begin;

-- The RETURNS TABLE output column `candidate_id` is a PL/pgSQL variable.
-- Naming the vote primary-key columns directly inside ON CONFLICT makes
-- `candidate_id` ambiguous at runtime. Target the named constraint instead.
create or replace function public.submit_book_candidate(
  p_title text,
  p_author text default null
)
returns table (
  candidate_id bigint,
  created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_title text := trim(coalesce(p_title, ''));
  v_author text := nullif(trim(coalesce(p_author, '')), '');
  v_normalized text;
  v_candidate_id bigint;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if length(v_title) < 2 or length(v_title) > 160 then
    raise exception 'Candidate title must have between 2 and 160 characters';
  end if;

  if v_author is not null and length(v_author) > 160 then
    raise exception 'Candidate author must have at most 160 characters';
  end if;

  v_normalized := public.normalize_book_candidate_title(v_title);

  select bc.id
    into v_candidate_id
  from public.book_candidates bc
  where bc.normalized_title = v_normalized
  limit 1;

  if v_candidate_id is not null then
    return query select v_candidate_id, false;
    return;
  end if;

  begin
    insert into public.book_candidates (
      title,
      normalized_title,
      author,
      submitted_by,
      status
    )
    values (
      v_title,
      v_normalized,
      v_author,
      v_user_id,
      'candidate'
    )
    returning id into v_candidate_id;
  exception
    when unique_violation then
      select bc.id
        into v_candidate_id
      from public.book_candidates bc
      where bc.normalized_title = v_normalized
      limit 1;

      return query select v_candidate_id, false;
      return;
  end;

  insert into public.book_candidate_votes (candidate_id, user_id)
  values (v_candidate_id, v_user_id)
  on conflict on constraint book_candidate_votes_pkey do nothing;

  return query select v_candidate_id, true;
end;
$$;

revoke all on function public.submit_book_candidate(text, text) from public;
revoke all on function public.submit_book_candidate(text, text) from anon;
grant execute on function public.submit_book_candidate(text, text) to authenticated;

commit;
