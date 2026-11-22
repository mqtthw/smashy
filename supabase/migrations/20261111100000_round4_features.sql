-- Round 4 features (additive / backward compatible: the live site keeps working unchanged).

-- ---------- Polls on posts ----------
-- 2-4 options, open 1 hour to 7 days. Votes are private: people see totals, never who voted for what.
create table public.polls (
  post_id uuid primary key references public.posts (id) on delete cascade,
  options text[] not null check (cardinality(options) between 2 and 4),
  closes_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.polls enable row level security;
create policy "Polls follow post visibility" on public.polls for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy "Authors add a poll to their new top-level post" on public.polls for insert to authenticated
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = (select auth.uid()) and p.parent_id is null
        and p.created_at > now() - interval '5 minutes'
    )
    and closes_at between now() + interval '55 minutes' and now() + interval '7 days 5 minutes'
    and (select bool_and(char_length(btrim(o)) between 1 and 40) from unnest(options) as o)
  );
grant select on public.polls to anon, authenticated;
grant insert (post_id, options, closes_at) on public.polls to authenticated;

create table public.poll_votes (
  post_id uuid not null references public.polls (post_id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  choice smallint not null check (choice between 0 and 3),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index poll_votes_user_idx on public.poll_votes (user_id);
alter table public.poll_votes enable row level security;
create policy "See your own poll votes" on public.poll_votes for select to authenticated
  using (user_id = (select auth.uid()));
-- One vote, on an open poll you can see (blocked people's posts aren't visible), for an option that exists.
create policy "Vote once on open polls" on public.poll_votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.polls pl
      where pl.post_id = poll_votes.post_id and pl.closes_at > now() and poll_votes.choice < cardinality(pl.options)
    )
  );
grant select on public.poll_votes to authenticated;
grant insert (post_id, choice) on public.poll_votes to authenticated;

-- Totals per option, only for polls the caller can see (the polls table's own rules decide).
create function private.poll_counts(post uuid) returns table (choice smallint, votes bigint)
  language sql stable security definer set search_path = ''
as $$ select v.choice, count(*) from public.poll_votes v where v.post_id = post group by v.choice $$;
grant execute on function private.poll_counts(uuid) to anon, authenticated;

create function public.poll_results(posts uuid[]) returns table (post_id uuid, choice smallint, votes bigint)
  language sql stable security invoker set search_path = ''
as $$
  select pl.post_id, c.choice, c.votes
  from public.polls pl cross join lateral private.poll_counts(pl.post_id) c
  where pl.post_id = any (posts)
$$;
grant execute on function public.poll_results(uuid[]) to anon, authenticated;

-- ---------- "I'm going" to tournaments and weeklies ----------
-- Private rows; others only see a total and which of their mutuals (same age group) are going.
create table public.event_rsvps (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  event_kind text not null check (event_kind in ('tournament', 'weekly')),
  event_ref text not null check (char_length(event_ref) between 1 and 200),
  event_name text not null check (char_length(event_name) between 1 and 200),
  starts_at timestamptz not null,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, event_kind, event_ref)
);
create index event_rsvps_event_idx on public.event_rsvps (event_kind, event_ref);
create index event_rsvps_remind_idx on public.event_rsvps (starts_at) where reminded_at is null;
alter table public.event_rsvps enable row level security;
create policy "See your own RSVPs" on public.event_rsvps for select to authenticated using (user_id = (select auth.uid()));
create policy "RSVP for yourself" on public.event_rsvps for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Cancel your own RSVP" on public.event_rsvps for delete to authenticated using (user_id = (select auth.uid()));
grant select, delete on public.event_rsvps to authenticated;
grant insert (event_kind, event_ref, event_name, starts_at) on public.event_rsvps to authenticated;

create function public.event_going(kind text, ref text)
  returns table (total bigint, friends jsonb)
  language sql stable security definer set search_path = ''
as $$
  select
    (select count(*) from public.event_rsvps r where r.event_kind = kind and r.event_ref = ref),
    coalesce((
      select jsonb_agg(jsonb_build_object('tag', p.tag, 'handle', p.handle, 'avatar_path', p.avatar_path))
      from (
        select p.* from public.event_rsvps r
        join public.profiles p on p.id = r.user_id
        where r.event_kind = kind and r.event_ref = ref and auth.uid() is not null and r.user_id <> auth.uid()
          and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = r.user_id and f.status = 'active')
          and exists (select 1 from public.follows f where f.follower_id = r.user_id and f.followee_id = auth.uid() and f.status = 'active')
          and private.is_minor(r.user_id) = private.is_minor(auth.uid())
          and not private.is_blocked(r.user_id, auth.uid())
        order by r.created_at desc
        limit 5
      ) p
    ), '[]'::jsonb)
$$;
grant execute on function public.event_going(text, text) to anon, authenticated;

-- Day-before reminders (sent by the scheduled job) are a new notification type.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'follow', 'follow_request', 'follow_accepted', 'like', 'reply', 'repost', 'quote', 'vote',
  'scene_approved', 'scene_rejected', 'admin_approved', 'admin_rejected', 'major_live', 'reaction',
  'clip_approved', 'clip_rejected', 'mention', 'message_request', 'event_reminder'
));
alter table public.notifications add column event_name text, add column event_href text;

-- ---------- Profiles: crew / college and "looking for a doubles partner" ----------
alter table public.profiles
  add column crew text check (crew is null or char_length(crew) between 1 and 40),
  add column lfg_doubles boolean not null default false;
grant update (crew, lfg_doubles) on public.profiles to authenticated;

-- ---------- Muted words (private) ----------
create table public.muted_words (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  words text[] not null default '{}' check (cardinality(words) <= 50),
  updated_at timestamptz not null default now()
);
alter table public.muted_words enable row level security;
create policy "Your own muted words" on public.muted_words for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.muted_words to authenticated;

-- ---------- Saved clips (private, like bookmarks) ----------
create table public.saved_clips (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  clip_id text not null references public.reels (clip_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, clip_id)
);
alter table public.saved_clips enable row level security;
create policy "Your own saved clips" on public.saved_clips for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, delete on public.saved_clips to authenticated;
