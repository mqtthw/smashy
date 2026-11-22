-- Resource hub: upvotes on highlights, and character tags on posts.

-- ---------- Upvotes ----------
alter table public.highlights add column vote_count int not null default 0;
create index highlights_rank_idx on public.highlights (game, character, vote_count desc, created_at desc) where removed_at is null;

create table public.highlight_votes (
  highlight_id uuid not null references public.highlights (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (highlight_id, user_id)
);
create index highlight_votes_user_idx on public.highlight_votes (user_id);

alter table public.highlight_votes enable row level security;
revoke all on public.highlight_votes from anon, authenticated;
grant select on public.highlight_votes to authenticated;
grant insert (highlight_id, user_id) on public.highlight_votes to authenticated;
grant delete on public.highlight_votes to authenticated;

-- Only your own votes are readable (to show "you upvoted"); totals come from vote_count.
create policy "Users see their own votes"
  on public.highlight_votes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users vote as themselves on live highlights (not their own)"
  on public.highlight_votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.highlights h where h.id = highlight_id and h.removed_at is null and h.author_id <> (select auth.uid()))
  );

create policy "Users remove their own votes"
  on public.highlight_votes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Keep highlights.vote_count in sync (users can't edit it directly).
create function private.sync_vote_count() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.highlights set vote_count = vote_count + 1 where id = new.highlight_id;
  else
    update public.highlights set vote_count = greatest(vote_count - 1, 0) where id = old.highlight_id;
  end if;
  return null;
end;
$$;
create trigger highlight_votes_count after insert or delete on public.highlight_votes
  for each row execute function private.sync_vote_count();

-- ---------- Character tags on posts ----------
alter table public.posts add column character text check (character is null or character ~ '^[a-z0-9-]{2,40}$');
create index posts_character_idx on public.posts (game, character, created_at desc) where character is not null and removed_at is null;

revoke insert on public.posts from authenticated;
grant insert (author_id, parent_id, game, body, ruleset_id, quote_of, character) on public.posts to authenticated;
