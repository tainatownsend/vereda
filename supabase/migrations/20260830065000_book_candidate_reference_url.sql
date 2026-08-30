begin;

-- Optional source/reference URL for community book suggestions.
-- The URL is display metadata only; it does not imply editorial approval.
alter table public.book_candidates
  add column if not exists reference_url text;

alter table public.book_candidates
  drop constraint if exists book_candidates_reference_url_check;

alter table public.book_candidates
  add constraint book_candidates_reference_url_check
  check (
    reference_url is null
    or (
      length(reference_url) <= 2048
      and reference_url ~* '^https://[^[:space:]]+$'
    )
  );

comment on column public.book_candidates.reference_url is
  'Optional HTTPS publisher, bookseller, or catalog reference supplied with a community suggestion.';

create or replace function public.set_book_candidate_normalized_title()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.title := trim(new.title);
  new.author := nullif(trim(coalesce(new.author, '')), '');
  new.reference_url := nullif(trim(coalesce(new.reference_url, '')), '');
  new.normalized_title := public.normalize_book_candidate_title(new.title);
  new.updated_at := now();

  if length(new.normalized_title) < 2 then
    raise exception 'Candidate title is too short after normalization';
  end if;

  return new;
end;
$$;

drop trigger if exists set_book_candidate_normalized_title on public.book_candidates;
create trigger set_book_candidate_normalized_title
before insert or update of title, author, reference_url on public.book_candidates
for each row execute function public.set_book_candidate_normalized_title();

-- Return only safe candidate display fields. Recreate because the result shape
-- changes by adding reference_url.
drop function if exists public.get_book_candidates();

create function public.get_book_candidates()
returns table (
  id bigint,
  title text,
  author text,
  reference_url text,
  status text,
  created_at timestamptz,
  vote_count bigint,
  user_has_voted boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return query
  select
    bc.id,
    bc.title,
    bc.author,
    bc.reference_url,
    bc.status,
    bc.created_at,
    count(bcv.user_id)::bigint as vote_count,
    coalesce(bool_or(bcv.user_id = auth.uid()), false) as user_has_voted
  from public.book_candidates bc
  left join public.book_candidate_votes bcv
    on bcv.candidate_id = bc.id
  where bc.status in ('candidate', 'under_review', 'planned')
  group by bc.id
  order by count(bcv.user_id) desc, bc.created_at asc, bc.id asc;
end;
$$;

-- Replace the two-argument RPC with a backwards-compatible third argument
-- that has a default, so existing clients can continue submitting title/author.
drop function if exists public.submit_book_candidate(text, text);

create function public.submit_book_candidate(
  p_title text,
  p_author text default null,
  p_reference_url text default null
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
  v_reference_url text := nullif(trim(coalesce(p_reference_url, '')), '');
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

  if v_reference_url is not null and (
    length(v_reference_url) > 2048
    or v_reference_url !~* '^https://[^[:space:]]+$'
  ) then
    raise exception 'Candidate reference URL must be a valid HTTPS URL';
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
      reference_url,
      submitted_by,
      status
    )
    values (
      v_title,
      v_normalized,
      v_author,
      v_reference_url,
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

revoke all on function public.get_book_candidates() from public;
revoke all on function public.get_book_candidates() from anon;
grant execute on function public.get_book_candidates() to authenticated;

revoke all on function public.submit_book_candidate(text, text, text) from public;
revoke all on function public.submit_book_candidate(text, text, text) from anon;
grant execute on function public.submit_book_candidate(text, text, text) to authenticated;

commit;
