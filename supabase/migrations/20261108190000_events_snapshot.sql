-- Instant Events: the Texas tournaments list (two slow start.gg searches, ~7 s) is saved here by
-- the scheduled job, and the Events page reads this saved copy instead of waiting on start.gg.
-- Same lock pattern as majors and Reels (claim_refresh / finish_refresh).
-- Server-only: no access for guests or signed-in users (the page reads it with the secret key).
create table public.events_sync (
  id int primary key default 1 check (id = 1),
  last_run timestamptz not null default 'epoch',
  running_since timestamptz,
  -- { "tournaments": [...], "recent": [...] } in the app's SmashyTournament shape
  data jsonb,
  saved_at timestamptz
);
insert into public.events_sync default values;
alter table public.events_sync enable row level security;
revoke all on public.events_sync from anon, authenticated;

create or replace function private.claim_refresh(job text, every interval) returns boolean
  language plpgsql security definer set search_path = ''
as $$
declare claimed int;
begin
  if job = 'majors' then
    update public.majors_sync set running_since = now()
    where id = 1 and last_run < now() - every
      and (running_since is null or running_since < now() - interval '10 minutes');
  elsif job = 'reels' then
    update public.reels_sync set running_since = now()
    where id = 1 and last_run < now() - every
      and (running_since is null or running_since < now() - interval '10 minutes');
  elsif job = 'events' then
    update public.events_sync set running_since = now()
    where id = 1 and last_run < now() - every
      and (running_since is null or running_since < now() - interval '10 minutes');
  else
    raise exception 'unknown job %', job;
  end if;
  get diagnostics claimed = row_count;
  return claimed = 1;
end;
$$;

create or replace function private.finish_refresh(job text, ok boolean) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if job = 'majors' then
    update public.majors_sync set running_since = null, last_run = case when ok then now() else last_run end where id = 1;
  elsif job = 'reels' then
    update public.reels_sync set running_since = null, last_run = case when ok then now() else last_run end where id = 1;
  elsif job = 'events' then
    update public.events_sync set running_since = null, last_run = case when ok then now() else last_run end where id = 1;
  end if;
end;
$$;
