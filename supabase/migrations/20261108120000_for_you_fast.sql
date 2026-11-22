-- Review fix: For You counted every post's likes/replies/reposts/quotes on each page load
-- (7+ seconds at 3,000 posts). Now each post keeps running totals, updated by triggers, and the
-- ranking reads them. Pages are also pinned to a moment (p_as_of) so paging doesn't repeat or skip.
-- This file is the one current definition of for_you_feed.

-- ---------- Running totals on posts (not writable by players: no column grants) ----------
alter table public.posts
  add column like_count int not null default 0,
  add column reply_count int not null default 0,
  add column repost_count int not null default 0,
  add column quote_count int not null default 0;

update public.posts p set
  like_count = (select count(*) from public.post_likes l where l.post_id = p.id),
  reply_count = (select count(*) from public.posts r where r.parent_id = p.id),
  repost_count = (select count(*) from public.reposts rp where rp.post_id = p.id),
  quote_count = (select count(*) from public.posts q where q.quote_of = p.id);

create or replace function private.count_likes() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then update public.posts set like_count = like_count + 1 where id = new.post_id;
  else update public.posts set like_count = greatest(0, like_count - 1) where id = old.post_id; end if;
  return null;
end;
$$;
create trigger post_likes_count after insert or delete on public.post_likes for each row execute function private.count_likes();

create or replace function private.count_reposts() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then update public.posts set repost_count = repost_count + 1 where id = new.post_id;
  else update public.posts set repost_count = greatest(0, repost_count - 1) where id = old.post_id; end if;
  return null;
end;
$$;
create trigger reposts_count after insert or delete on public.reposts for each row execute function private.count_reposts();

create or replace function private.count_replies_quotes() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.parent_id is not null then update public.posts set reply_count = reply_count + 1 where id = new.parent_id; end if;
    if new.quote_of is not null then update public.posts set quote_count = quote_count + 1 where id = new.quote_of; end if;
  else
    if old.parent_id is not null then update public.posts set reply_count = greatest(0, reply_count - 1) where id = old.parent_id; end if;
    if old.quote_of is not null then update public.posts set quote_count = greatest(0, quote_count - 1) where id = old.quote_of; end if;
  end if;
  return null;
end;
$$;
create trigger posts_count_replies_quotes after insert or delete on public.posts for each row execute function private.count_replies_quotes();

-- ---------- The ranked feed ----------
-- Score = engagement / (hours old + 2)^1.2, times boosts for the viewer:
--   same city x2, Texas x1.5, your games x1.3 (other games x0.5), a character you post about or like
--   x1.6, people you interact with up to x2, people you follow x1.4, a tournament you posted about x2;
--   people whose posts you marked "Not interested" lately x0.3; each extra post by one person x0.7.
-- Posts you marked "Not interested" are gone. Runs as the viewer, so privacy rules still apply.
drop function if exists public.for_you_feed(text, int, int);

create function public.for_you_feed(p_game text default null, p_limit int default 20, p_offset int default 0, p_as_of timestamptz default null)
returns table (post_id uuid, score double precision, reason text, reason_detail text)
  language sql stable
  security invoker
  set search_path = ''
as $$
  with
  t as (select least(coalesce(p_as_of, now()), now()) as now_, auth.uid() as uid),
  viewer as (
    select lower(btrim(p.home_city)) as city, p.games from public.profiles p join t on p.id = t.uid
  ),
  -- How often the viewer liked, replied to, or reposted each author in the last 30 days.
  affinity as (
    select author_id, count(*) as n from (
      select p.author_id from public.post_likes l join public.posts p on p.id = l.post_id join t on l.user_id = t.uid
        where l.created_at > t.now_ - interval '30 days'
      union all
      select p.author_id from public.posts r join public.posts p on p.id = r.parent_id join t on r.author_id = t.uid
        where r.created_at > t.now_ - interval '30 days'
      union all
      select p.author_id from public.reposts rp join public.posts p on p.id = rp.post_id join t on rp.user_id = t.uid
        where rp.created_at > t.now_ - interval '30 days'
    ) x
    group by author_id
  ),
  -- Characters the viewer posts about or likes (their "mains", worked out from what they do).
  my_chars as (
    select distinct p.game, p.character from public.posts p join t on p.author_id = t.uid
      where p.character is not null and p.created_at > t.now_ - interval '90 days'
    union
    select distinct p.game, p.character from public.post_likes l join public.posts p on p.id = l.post_id join t on l.user_id = t.uid
      where p.character is not null and l.created_at > t.now_ - interval '90 days'
  ),
  my_tourneys as (
    select distinct p.tournament_slug from public.posts p join t on p.author_id = t.uid
    where p.tournament_slug is not null and p.created_at > t.now_ - interval '60 days'
  ),
  my_follows as (
    select f.followee_id from public.follows f join t on f.follower_id = t.uid where f.status = 'active'
  ),
  my_dismissed as (
    select d.post_id, p.author_id, d.created_at from public.post_dismissals d join public.posts p on p.id = d.post_id join t on d.user_id = t.uid
  ),
  cand as (
    select p.id, p.author_id, p.game, p.character, p.created_at, p.tournament_slug, p.tournament_name,
           a.home_city as author_city,
           p.like_count + p.reply_count + p.repost_count + p.quote_count as total_eng,
           (1 + p.like_count + 3 * p.reply_count + 2 * p.repost_count + 2 * p.quote_count)::double precision
             / power(extract(epoch from (t.now_ - p.created_at)) / 3600.0 + 2, 1.2) as base
    from public.posts p
    join public.profiles a on a.id = p.author_id
    cross join t
    where p.parent_id is null
      and p.ruleset_id is null
      and p.set_ref_id is null
      and p.reel_clip_id is null
      and p.removed_at is null
      and p.created_at > t.now_ - interval '30 days'
      and p.created_at <= t.now_
      and (p_game is null or p.game = p_game)
      and not exists (select 1 from my_dismissed d where d.post_id = p.id)
  ),
  flags as (
    select c.*,
      c.author_id = t.uid as is_mine,
      (mf.followee_id is not null) as followed,
      (v.city is not null and v.city <> '' and lower(btrim(c.author_city)) = v.city) as same_city,
      private.is_texas(c.author_city) as texas,
      (mc.character is not null) as my_char,
      (mt.tournament_slug is not null and c.author_id is distinct from t.uid) as same_tourney,
      coalesce(af.n, 0) as interactions,
      exists (select 1 from my_dismissed d where d.author_id = c.author_id and d.created_at > t.now_ - interval '30 days') as dismissed_author,
      case
        when v.games is null or cardinality(v.games) = 0 or c.game = 'general' then 1.0
        when c.game = any (v.games) then 1.3
        else 0.5
      end as game_boost
    from cand c
    cross join t
    left join viewer v on true
    left join my_follows mf on mf.followee_id = c.author_id
    left join my_chars mc on mc.game = c.game and mc.character = c.character
    left join my_tourneys mt on mt.tournament_slug = c.tournament_slug
    left join affinity af on af.author_id = c.author_id
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
  order by sp.final desc, sp.created_at desc, sp.id
  limit greatest(1, least(p_limit, 50))
  offset greatest(0, p_offset)
$$;

grant execute on function public.for_you_feed(text, int, int, timestamptz) to anon, authenticated;
