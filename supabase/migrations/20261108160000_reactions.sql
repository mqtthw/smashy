-- Emoji reactions, scene membership, and scene emojis (SPEC roadmap F).
--   * Reactions sit next to the heart. Allowed: a curated emoji list (copied from src/lib/reactions.ts)
--     or "scene:<id>" for an approved scene emoji, which only that scene's members can use.
--   * Up to 5 different reactions per person per post; 60 reactions per 5 minutes.
--   * Teen reactions are hidden from guests (like teen reposts). Reactions count toward For You.

-- ---------- Scene membership ----------
create table public.scene_members (
  scene_id uuid not null references public.scenes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (scene_id, user_id)
);
create index scene_members_user_idx on public.scene_members (user_id);
alter table public.scene_members enable row level security;
revoke all on public.scene_members from anon, authenticated;
grant select on public.scene_members to anon, authenticated;
grant insert (scene_id, user_id), delete on public.scene_members to authenticated;
create policy "Members are visible; teen members need sign-in" on public.scene_members for select to anon, authenticated
  using ((select auth.uid()) is not null or not private.is_minor(user_id));
create policy "Join active scenes as yourself" on public.scene_members for insert to authenticated
  with check ((select auth.uid()) = user_id and private.scene_is_active(scene_id));
create policy "Leave scenes yourself" on public.scene_members for delete to authenticated
  using ((select auth.uid()) = user_id);

create function private.is_scene_member(sid uuid, uid uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.scene_members m where m.scene_id = sid and m.user_id = uid) $$;
grant execute on function private.is_scene_member(uuid, uuid) to anon, authenticated;

-- ---------- Scene emojis (uploaded by scene admins, approved by site admins) ----------
create table public.scene_emojis (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.scenes (id) on delete cascade,
  name text not null check (name ~ '^[a-z0-9_]{2,32}$'),
  image_path text not null,             -- path in the "scene-emojis" storage bucket
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (scene_id, name)
);
alter table public.scene_emojis enable row level security;
revoke all on public.scene_emojis from anon, authenticated;
grant select on public.scene_emojis to anon, authenticated;
create policy "Approved emojis are public; scene admins see their pending ones" on public.scene_emojis for select to anon, authenticated
  using (status = 'approved' or private.is_scene_admin(scene_id, (select auth.uid())));
-- Writes go through the server (upload + image checks), after checking the scene admin / site admin.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scene-emojis', 'scene-emojis', true, 262144, array['image/png', 'image/gif', 'image/webp'])
on conflict (id) do nothing;

-- ---------- Reactions ----------
create function private.is_reaction_emoji(e text) returns boolean
  language sql immutable set search_path = ''
as $$ select e = any (array['🔥', '😂', '😮', '💀', '👏', '🐐', '😭', '🤯', '😳', '😤', '😎', '🤣', '😢', '😡', '🤔', '🙃', '🥲', '🫠', '😬', '🤡', '🥶', '🫡', '👀', '🙏', '🤝', '💯', '🧠', '🎯', '⚡', '🌊', '🧊', '🏆', '🥇', '👑', '💎', '🚀', '🌟', '🎮', '🕹️', '🐢', '🦊', '🐸', '🍿', '🧂', '📈', '📉', '✅', '❌', '🎉', '⚔️', '🛡️', '💪']) $$;

create table public.post_reactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 60),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);
create index post_reactions_user_idx on public.post_reactions (user_id);
alter table public.post_reactions enable row level security;
revoke all on public.post_reactions from anon, authenticated;
grant select on public.post_reactions to anon, authenticated;
grant insert (post_id, user_id, emoji), delete on public.post_reactions to authenticated;
create policy "Reactions follow post visibility; teen reactions need sign-in" on public.post_reactions for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id) and ((select auth.uid()) is not null or not private.is_minor(user_id)));
create policy "React as yourself to posts you can see" on public.post_reactions for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (select 1 from public.posts p where p.id = post_id and p.removed_at is null));
create policy "Remove your own reactions" on public.post_reactions for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function private.check_reaction() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare sid uuid;
begin
  if new.emoji like 'scene:%' then
    select e.scene_id into sid from public.scene_emojis e
      where e.id::text = substr(new.emoji, 7) and e.status = 'approved';
    if sid is null then raise exception 'That emoji isn''t available.' using errcode = 'P0001'; end if;
    if not private.is_scene_member(sid, new.user_id) then
      raise exception 'Join that scene to use its emojis.' using errcode = 'P0001';
    end if;
  elsif not private.is_reaction_emoji(new.emoji) then
    raise exception 'That emoji isn''t available.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.post_reactions r where r.post_id = new.post_id and r.user_id = new.user_id) >= 5 then
    raise exception 'You can add up to 5 reactions to a post.' using errcode = 'P0001';
  end if;
  perform private.rate_limit('react', 60, interval '5 minutes');
  return new;
end;
$$;
create trigger post_reactions_check before insert on public.post_reactions for each row execute function private.check_reaction();

-- Running total for For You.
alter table public.posts add column reaction_count int not null default 0;
create or replace function private.count_reactions() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then update public.posts set reaction_count = reaction_count + 1 where id = new.post_id;
  else update public.posts set reaction_count = greatest(0, reaction_count - 1) where id = old.post_id; end if;
  return null;
end;
$$;
create trigger post_reactions_count after insert or delete on public.post_reactions for each row execute function private.count_reactions();

-- Notifications: "Bjorn and 5 others reacted 🔥" (grouped in the app).
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'follow', 'follow_request', 'follow_accepted', 'like', 'reply', 'repost', 'quote', 'vote',
  'scene_approved', 'scene_rejected', 'admin_approved', 'admin_rejected', 'major_live', 'reaction'
));
alter table public.notifications add column emoji text;

create or replace function private.notify_reaction() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare author uuid;
begin
  if tg_op = 'INSERT' then
    select p.author_id into author from public.posts p where p.id = new.post_id;
    if author is not null and author is distinct from new.user_id then
      insert into public.notifications (user_id, actor_id, type, post_id, emoji) values (author, new.user_id, 'reaction', new.post_id, new.emoji);
    end if;
  else
    delete from public.notifications where actor_id = old.user_id and post_id = old.post_id and type = 'reaction' and emoji = old.emoji;
  end if;
  return null;
end;
$$;
create trigger post_reactions_notify after insert or delete on public.post_reactions for each row execute function private.notify_reaction();

-- ---------- For You: count reactions as engagement (same as a like) ----------
create or replace function public.for_you_feed(p_game text default null, p_limit int default 20, p_offset int default 0, p_as_of timestamptz default null)
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
           p.like_count + p.reply_count + p.repost_count + p.quote_count + p.reaction_count as total_eng,
           (1 + p.like_count + p.reaction_count + 3 * p.reply_count + 2 * p.repost_count + 2 * p.quote_count)::double precision
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


