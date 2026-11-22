-- Reels: anyone signed in can share a Twitch clip or YouTube Short link. It waits for a site admin;
-- once approved it shows in Reels with "Shared by @handle". Twitch/YouTube host the video (and
-- moderate it); Smashy stores only the link and its details, like channel-collected clips.

create table public.reel_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('twitch', 'youtube')),
  clip_id text not null,
  game text not null check (game in ('melee', 'ultimate', 'pplus', 'smash64', 'brawl', 'smash4')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  -- Details from Twitch/YouTube at the time it was shared (the title is word-filtered).
  title text not null default '',
  title_flagged boolean not null default false,
  channel_login text not null,   -- Twitch login, or YouTube channel id
  channel_name text,
  thumbnail_url text,
  view_count int not null default 0,
  duration real,
  video_id text,
  vod_offset int,
  clip_created_at timestamptz not null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
-- One open or approved submission per clip (a rejected clip can be shared again later).
create unique index reel_submissions_clip_idx on public.reel_submissions (clip_id) where status <> 'rejected';
create index reel_submissions_user_idx on public.reel_submissions (user_id, created_at desc);
create index reel_submissions_pending_idx on public.reel_submissions (created_at) where status = 'pending';

-- People see their own submissions; everything else goes through the server.
alter table public.reel_submissions enable row level security;
revoke all on public.reel_submissions from anon, authenticated;
grant select on public.reel_submissions to authenticated;
create policy "Users see their own clip submissions" on public.reel_submissions for select to authenticated
  using (user_id = (select auth.uid()));

-- Approved clips in Reels: who shared it and when it was added.
alter table public.reels
  add column submitted_by uuid references public.profiles (id) on delete set null,
  add column submitted_at timestamptz;

-- Channels of shared clips are recorded (so they can be blocked) but not approved for collecting.
alter table public.reel_channels drop constraint reel_channels_source_check;
alter table public.reel_channels add constraint reel_channels_source_check check (source in ('admin', 'auto', 'submitted'));

-- A shared clip is visible even if its channel isn't approved for collecting; a blocked channel
-- still hides everything.
drop policy "Visible reels are public" on public.reels;
create policy "Visible reels are public" on public.reels for select to anon, authenticated
  using (
    not hidden
    and exists (
      select 1 from public.reel_channels c
      where c.login = channel_login and not c.blocked and (c.approved or submitted_at is not null)
    )
  );

create or replace function private.check_reel_post() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare clip text := coalesce(new.reel_clip_id, new.quote_reel_id);
begin
  if clip is not null and not exists (
    select 1 from public.reels r join public.reel_channels c on c.login = r.channel_login
    where r.clip_id = clip and not r.hidden and not c.blocked and (c.approved or r.submitted_at is not null)
  ) then
    raise exception 'This clip isn''t available.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Ranking: a shared clip counts as new from when it was added (it may be an older clip).
create or replace function public.reels_page(p_games text[], p_limit int default 15, p_offset int default 0, p_seen text[] default '{}')
returns setof public.reels
  language sql stable
  security invoker
  set search_path = ''
as $$
  with recent as (
    select r.*, coalesce(r.submitted_at, r.created_at) as listed
    from public.reels r
    where r.game = any (p_games)
      and coalesce(r.submitted_at, r.created_at) > now() - interval '30 days'
  ),
  typical as (
    select platform, greatest(avg(view_count), 1)::float8 as views
    from recent
    group by platform
  )
  select r.clip_id, r.channel_login, r.channel_name, r.title, r.game, r.view_count, r.duration, r.thumbnail_url,
    r.video_id, r.vod_offset, r.created_at, r.hidden, r.fetched_at, r.title_flagged, r.platform, r.submitted_by, r.submitted_at
  from recent r
  join typical t on t.platform = r.platform
  order by r.clip_id = any (coalesce(p_seen, '{}')),
    (r.view_count / t.views + 0.2) / power(extract(epoch from (now() - r.listed)) / 86400.0 + 2, 1.3) desc,
    r.clip_id
  limit greatest(1, least(p_limit, 50))
  offset greatest(0, p_offset)
$$;

-- Notifications: "Your clip was added to Reels" / "wasn't added".
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'follow', 'follow_request', 'follow_accepted', 'like', 'reply', 'repost', 'quote', 'vote',
  'scene_approved', 'scene_rejected', 'admin_approved', 'admin_rejected', 'major_live', 'reaction',
  'clip_approved', 'clip_rejected'
));
alter table public.notifications add column reel_submission_id uuid references public.reel_submissions (id) on delete cascade;
