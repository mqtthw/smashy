-- Review fix: background refreshes (majors scan, Reels clips) used to record themselves as done
-- *before* running, so a failed or cut-off run meant no retry for hours. Now:
--   last_run       = when the last run finished successfully
--   running_since  = set while a run is in progress (a run older than 10 minutes counts as dead)
alter table public.majors_sync add column running_since timestamptz;
alter table public.reels_sync add column running_since timestamptz;

-- Claims the job if it's due and nobody else is running it. Returns true if this caller should run it.
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
  else
    raise exception 'unknown job %', job;
  end if;
  get diagnostics claimed = row_count;
  return claimed = 1;
end;
$$;

-- Marks the job finished (ok = true records the success time; ok = false just releases it for a retry).
create or replace function private.finish_refresh(job text, ok boolean) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if job = 'majors' then
    update public.majors_sync set running_since = null, last_run = case when ok then now() else last_run end where id = 1;
  elsif job = 'reels' then
    update public.reels_sync set running_since = null, last_run = case when ok then now() else last_run end where id = 1;
  end if;
end;
$$;

-- Callable only with the server's secret key (via public wrappers that check the role).
create or replace function public.claim_refresh(job text, every_minutes int) returns boolean
  language sql security definer set search_path = ''
as $$ select private.claim_refresh(job, make_interval(mins => every_minutes)) $$;
create or replace function public.finish_refresh(job text, ok boolean) returns void
  language sql security definer set search_path = ''
as $$ select private.finish_refresh(job, ok) $$;
revoke all on function public.claim_refresh(text, int) from public, anon, authenticated;
revoke all on function public.finish_refresh(text, boolean) from public, anon, authenticated;
grant execute on function public.claim_refresh(text, int) to service_role;
grant execute on function public.finish_refresh(text, boolean) to service_role;
