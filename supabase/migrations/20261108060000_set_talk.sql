-- Sets you can talk about: comment on any bracket set, or quote it in a feed post.
-- `set_refs` keeps a snapshot of each set people talk about (players, score, round) so posts can
-- show it without asking start.gg / parry.gg again. Only the server writes it, after loading the
-- set from the bracket site, so a snapshot can't be faked.

create table public.set_refs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('startgg', 'parrygg')),
  external_id text not null check (char_length(external_id) between 1 and 80),
  tournament_name text,
  event_name text,
  game text,
  round_label text,
  p1_name text,
  p2_name text,
  p1_score int,
  p2_score int,
  winner smallint check (winner in (1, 2)),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);
alter table public.set_refs enable row level security;
revoke all on public.set_refs from anon, authenticated;
grant select on public.set_refs to anon, authenticated;
create policy "Set snapshots are public" on public.set_refs for select to anon, authenticated using (true);

-- A post can be a comment on a set (shown on the set's page, not the feed) or quote a set (feed post).
alter table public.posts
  add column set_ref_id uuid references public.set_refs (id) on delete cascade,
  add column quote_set_id uuid references public.set_refs (id) on delete set null;
grant insert (set_ref_id, quote_set_id) on public.posts to authenticated;
create index posts_set_ref_idx on public.posts (set_ref_id, created_at desc) where set_ref_id is not null;

-- Feed views: expose set_ref_id so the feed can leave set comments out (like ruleset discussions).
create or replace view public.feed_items with (security_invoker = true) as
  select 'post'::text as kind, p.id as post_id, p.author_id as actor_id, p.created_at as at, p.game, p.ruleset_id, p.set_ref_id
  from public.posts p
  where p.parent_id is null
  union all
  select 'repost'::text, r.post_id, r.user_id, r.created_at, p.game, p.ruleset_id, p.set_ref_id
  from public.reposts r
  join public.posts p on p.id = r.post_id;

create or replace view public.following_feed_items with (security_invoker = true) as
  select fi.*
  from public.feed_items fi
  where fi.actor_id = (select auth.uid())
     or fi.actor_id in (
       select f.followee_id from public.follows f
       where f.follower_id = (select auth.uid()) and f.status = 'active'
     );

-- For You: same ranking as before, minus set comments.
create or replace function public.for_you_feed(p_game text default null, p_limit int default 20, p_offset int default 0)
returns table (post_id uuid, score double precision, reason text, reason_detail text)
  language sql stable
  security invoker
  set search_path = ''
as $$
  with
  me as (select auth.uid() as uid),
  viewer as (
    select lower(btrim(p.home_city)) as city, p.games
    from public.profiles p join me on p.id = me.uid
  ),
  cand as (
    select p.id, p.author_id, p.game, p.character, p.created_at, p.tournament_slug, p.tournament_name,
           a.home_city as author_city
    from public.posts p
    join public.profiles a on a.id = p.author_id
    where p.parent_id is null
      and p.ruleset_id is null
      and p.set_ref_id is null
      and p.removed_at is null
      and p.created_at > now() - interval '30 days'
      and (p_game is null or p.game = p_game)
      and not exists (
        select 1 from public.post_dismissals d join me on d.user_id = me.uid where d.post_id = p.id
      )
  ),
  eng as (
    select c.id,
      (select count(*) from public.post_likes l where l.post_id = c.id) as likes,
      (select count(*) from public.posts r where r.parent_id = c.id) as replies,
      (select count(*) from public.reposts rp where rp.post_id = c.id) as reposts,
      (select count(*) from public.posts q where q.quote_of = c.id) as quotes
    from cand c
  ),
  -- How often the viewer liked, replied to, or reposted each author in the last 30 days.
  affinity as (
    select author_id, count(*) as n from (
      select p.author_id from public.post_likes l join public.posts p on p.id = l.post_id join me on l.user_id = me.uid
        where l.created_at > now() - interval '30 days'
      union all
      select p.author_id from public.posts r join public.posts p on p.id = r.parent_id join me on r.author_id = me.uid
        where r.created_at > now() - interval '30 days'
      union all
      select p.author_id from public.reposts rp join public.posts p on p.id = rp.post_id join me on rp.user_id = me.uid
        where rp.created_at > now() - interval '30 days'
    ) x
    where author_id <> (select uid from me)
    group by author_id
  ),
  -- Characters the viewer posts about or likes (their "mains", worked out from what they do).
  my_chars as (
    select distinct p.game, p.character from public.posts p join me on p.author_id = me.uid
      where p.character is not null and p.created_at > now() - interval '90 days'
    union
    select distinct p.game, p.character from public.post_likes l join public.posts p on p.id = l.post_id join me on l.user_id = me.uid
      where p.character is not null and l.created_at > now() - interval '90 days'
  ),
  -- Tournaments the viewer posted a result or sign-up card for.
  my_tourneys as (
    select distinct p.tournament_slug from public.posts p join me on p.author_id = me.uid
    where p.tournament_slug is not null and p.created_at > now() - interval '60 days'
  ),
  my_follows as (
    select f.followee_id from public.follows f join me on f.follower_id = me.uid where f.status = 'active'
  ),
  -- People whose posts the viewer recently marked "Not interested".
  muted_ish as (
    select distinct p.author_id from public.post_dismissals d join public.posts p on p.id = d.post_id join me on d.user_id = me.uid
    where d.created_at > now() - interval '30 days'
  ),
  flags as (
    select c.*,
      e.likes + e.replies + e.reposts + e.quotes as total_eng,
      (1 + e.likes + 3 * e.replies + 2 * e.reposts + 2 * e.quotes)::double precision
        / power(extract(epoch from (now() - c.created_at)) / 3600.0 + 2, 1.2) as base,
      c.author_id = (select uid from me) as is_mine,
      c.author_id in (select followee_id from my_follows) as followed,
      (v.city is not null and v.city <> '' and lower(btrim(c.author_city)) = v.city) as same_city,
      private.is_texas(c.author_city) as texas,
      (c.character is not null and exists (select 1 from my_chars m where m.game = c.game and m.character = c.character)) as my_char,
      (c.tournament_slug is not null and c.tournament_slug in (select tournament_slug from my_tourneys)
         and c.author_id <> coalesce((select uid from me), '00000000-0000-0000-0000-000000000000'::uuid)) as same_tourney,
      coalesce((select a.n from affinity a where a.author_id = c.author_id), 0) as interactions,
      c.author_id in (select author_id from muted_ish) as dismissed_author,
      case
        when v.games is null or cardinality(v.games) = 0 or c.game = 'general' then 1.0
        when c.game = any (v.games) then 1.3
        else 0.5
      end as game_boost
    from cand c
    join eng e on e.id = c.id
    left join viewer v on true
  ),
  scored as (
    select f.*,
      f.base
        * f.game_boost
        * case when f.same_city then 2.0 else 1.0 end
        * case when f.texas then 1.5 else 1.0 end
        * case when f.my_char then 1.6 else 1.0 end
        * (1 + least(f.interactions, 10) * 0.1)
        * case when f.followed then 1.4 else 1.0 end
        * case when f.same_tourney then 2.0 else 1.0 end
        * case when f.dismissed_author then 0.3 else 1.0 end
        as s
    from flags f
  ),
  spread as (
    -- Each extra post by the same person counts a bit less, so one person can't fill the feed.
    select sc.*, sc.s * power(0.7, row_number() over (partition by sc.author_id order by sc.s desc) - 1) as final
    from scored sc
  )
  select sp.id,
    sp.final,
    case
      when sp.is_mine or sp.followed then null
      when sp.same_tourney then 'tournament'
      when sp.my_char then 'character'
      when sp.same_city and sp.total_eng >= 1 then 'city'
      when sp.interactions >= 3 then 'interacts'
      when sp.texas and sp.total_eng >= 3 then 'texas'
      when sp.total_eng >= 5 then 'popular'
      else null
    end,
    case
      when sp.is_mine or sp.followed then null
      when sp.same_tourney then sp.tournament_name
      when sp.my_char then sp.game || ':' || sp.character
      when sp.same_city and sp.total_eng >= 1 then btrim(sp.author_city)
      else null
    end
  from spread sp
  order by sp.final desc, sp.created_at desc
  limit greatest(1, least(p_limit, 50))
  offset greatest(0, p_offset)
$$;

