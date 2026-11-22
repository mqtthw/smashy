-- Review fixes for Reels.
-- 1) A Short that YouTube no longer has was hidden with the admin "hidden" flag, so an admin's "Show"
--    could bring back an empty entry. It now gets its own flag, which never shows to anyone.
-- 2) reels_page listed every column by hand to match "setof reels", so adding a column to reels
--    would have broken Reels. It now returns r.* (the ranking date is computed inline).

alter table public.reels add column unavailable boolean not null default false;
update public.reels set unavailable = true, hidden = false where platform = 'youtube' and hidden and title = '' and thumbnail_url is null;

drop policy "Visible reels are public" on public.reels;
create policy "Visible reels are public" on public.reels for select to anon, authenticated
  using (
    not hidden
    and not unavailable
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
    where r.clip_id = clip and not r.hidden and not r.unavailable and not c.blocked and (c.approved or r.submitted_at is not null)
  ) then
    raise exception 'This clip isn''t available.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.reels_page(p_games text[], p_limit int default 15, p_offset int default 0, p_seen text[] default '{}')
returns setof public.reels
  language sql stable
  security invoker
  set search_path = ''
as $$
  with typical as (
    select platform, greatest(avg(view_count), 1)::float8 as views
    from public.reels
    where game = any (p_games) and coalesce(submitted_at, created_at) > now() - interval '30 days'
    group by platform
  )
  select r.*
  from public.reels r
  join typical t on t.platform = r.platform
  where r.game = any (p_games)
    and coalesce(r.submitted_at, r.created_at) > now() - interval '30 days'
  order by r.clip_id = any (coalesce(p_seen, '{}')),
    (r.view_count / t.views + 0.2)
      / power(extract(epoch from (now() - coalesce(r.submitted_at, r.created_at))) / 86400.0 + 2, 1.3) desc,
    r.clip_id
  limit greatest(1, least(p_limit, 50))
  offset greatest(0, p_offset)
$$;
