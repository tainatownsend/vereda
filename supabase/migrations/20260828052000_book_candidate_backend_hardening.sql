begin;

-- Follow-up from staging database advisors after the community book voting
-- migration. Keep the security-definer RPC boundary intentional while making
-- row policies cheaper at scale and covering the submitter foreign key.

create index if not exists idx_book_candidates_submitted_by
  on public.book_candidates (submitted_by);

drop policy if exists "authenticated users can submit book candidates"
  on public.book_candidates;
create policy "authenticated users can submit book candidates"
on public.book_candidates
for insert
to authenticated
with check (
  submitted_by = (select auth.uid())
  and status = 'candidate'
);

drop policy if exists "users can read their own candidate votes"
  on public.book_candidate_votes;
create policy "users can read their own candidate votes"
on public.book_candidate_votes
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "users can add their own candidate vote"
  on public.book_candidate_votes;
create policy "users can add their own candidate vote"
on public.book_candidate_votes
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "users can remove their own candidate vote"
  on public.book_candidate_votes;
create policy "users can remove their own candidate vote"
on public.book_candidate_votes
for delete
to authenticated
using (user_id = (select auth.uid()));

commit;
