-- Reels upgrade (additive / backward compatible: the live site keeps working unchanged).

-- Channels found through Twitch's top Smash clips (all of Twitch, past week). They're approved for
-- showing those clips, but Smashy doesn't collect everything else they stream (that's 'admin'/'auto').
alter table public.reel_channels drop constraint reel_channels_source_check;
alter table public.reel_channels add constraint reel_channels_source_check check (source in ('admin', 'auto', 'submitted', 'top'));

-- Likes on clips (public counts; who liked what is private) and a flag for junk clips.
alter table public.reels
  add column like_count int not null default 0,
  add column low_quality boolean not null default false;

-- Junk already collected: barely watched (and not shared by someone), no real title, or a stream sponsor ad.
update public.reels set low_quality = true
where submitted_at is null
  and (
    view_count < 5
    or char_length(regexp_replace(title, '[^[:alnum:]]', '', 'g')) < 3
    or lower(btrim(title)) in ('test', 'clip', 'clipped', 'untitled')
    or title ~* '\m(zenni|sponsor(ed)?|promo code|use code|giveaway)\M'
  );

create table public.reel_likes (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  clip_id text not null references public.reels (clip_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, clip_id)
);
create index reel_likes_clip_idx on public.reel_likes (clip_id);
alter table public.reel_likes enable row level security;
create policy "See your own clip likes" on public.reel_likes for select to authenticated using (user_id = (select auth.uid()));
create policy "Like visible clips as yourself" on public.reel_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.reels r where r.clip_id = reel_likes.clip_id));
create policy "Unlike your own" on public.reel_likes for delete to authenticated using (user_id = (select auth.uid()));
grant select, delete on public.reel_likes to authenticated;
grant insert (clip_id) on public.reel_likes to authenticated;

-- Keep reels.like_count in step (people can't edit counts themselves).
create function private.reel_like_count() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.reels set like_count = like_count + 1 where clip_id = new.clip_id;
  else
    update public.reels set like_count = greatest(0, like_count - 1) where clip_id = old.clip_id;
  end if;
  return null;
end;
$$;
create trigger reel_likes_count after insert or delete on public.reel_likes
  for each row execute function private.reel_like_count();

-- Ranking: popularity for its platform plus likes, fading with age; junk left out; watched clips last.
create or replace function public.reels_page(p_games text[], p_limit int default 15, p_offset int default 0, p_seen text[] default '{}')
returns setof public.reels
  language sql stable
  security invoker
  set search_path = ''
as $$
  with typical as (
    select platform, greatest(avg(view_count), 1)::float8 as views
    from public.reels
    where game = any (p_games) and not low_quality and coalesce(submitted_at, created_at) > now() - interval '30 days'
    group by platform
  )
  select r.*
  from public.reels r
  join typical t on t.platform = r.platform
  where r.game = any (p_games)
    and not r.low_quality
    and coalesce(r.submitted_at, r.created_at) > now() - interval '30 days'
  order by r.clip_id = any (coalesce(p_seen, '{}')),
    (r.view_count / t.views + r.like_count * 0.5 + 0.2)
      / power(extract(epoch from (now() - coalesce(r.submitted_at, r.created_at))) / 86400.0 + 2, 1.3) desc,
    r.clip_id
  limit greatest(1, least(p_limit, 50))
  offset greatest(0, p_offset)
$$;
