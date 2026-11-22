-- Official Smashy events (round 457): a site admin hosts an event "as Smashy". The admin stays the
-- event's real host (every host power keeps working, and co-TOs work as usual); the event shows as
-- hosted by @smashyhq, and the Smashy Discord bot lists it. Only site admins can turn it on or off.

alter table public.hosted_events add column official boolean not null default false;

grant insert (official), update (official) on public.hosted_events to authenticated;

create function private.guard_official_event() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  -- The server's own key (no signed-in user) may set it; a member only if they're a site admin.
  if new.official is distinct from (case when tg_op = 'INSERT' then false else old.official end)
     and auth.uid() is not null
     and not private.is_site_admin(auth.uid()) then
    raise exception 'Only Smashy admins can host official events.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_official_event() from public;

create trigger hosted_events_official_guard
  before insert or update of official on public.hosted_events
  for each row execute function private.guard_official_event();

create index hosted_events_official_idx on public.hosted_events (starts_at desc) where official;
