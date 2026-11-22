-- Round 560: servers take start.gg slots a few at a time. Round 518 asked the database once per
-- start.gg request (take_startgg_slot). During a busy stretch on 2026-11-19 (22:05 to 22:12 UTC) that
-- was the most frequent database request (205 in 7 minutes); the calls queued on one lock, averaged
-- 107 ms (up to 1.6 s), and some passed the servers' 2-second limit.
--
-- take_startgg_slots(want, per_minute): takes up to `want` slots if the whole site sent fewer than
-- `per_minute` start.gg requests in the last minute. Returns how many were taken, and, when none were,
-- how many milliseconds until one frees up. The old one-slot function stays for servers still running
-- the previous version during a deploy.

create or replace function private.take_startgg_slots(want int, per_minute int, out granted int, out wait_ms int)
  language plpgsql security definer set search_path = ''
as $$
declare
  used int;
  oldest timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('startgg_calls'));
  delete from private.startgg_calls where at <= clock_timestamp() - interval '60 seconds';
  select count(*) into used from private.startgg_calls;
  granted := least(greatest(want, 1), greatest(per_minute - used, 0));
  wait_ms := 0;
  if granted > 0 then
    insert into private.startgg_calls (at) select clock_timestamp() from generate_series(1, granted);
    return;
  end if;
  -- The request that has to turn a minute old before there's room again.
  select at into oldest from private.startgg_calls order by at desc offset per_minute - 1 limit 1;
  wait_ms := greatest(1, ceil(extract(epoch from (oldest + interval '60 seconds' - clock_timestamp())) * 1000)::int + 25);
end;
$$;

-- Callable only with the server's secret key.
create or replace function public.take_startgg_slots(want int, per_minute int, out granted int, out wait_ms int)
  language sql security definer set search_path = ''
as $$ select * from private.take_startgg_slots(want, per_minute) $$;
revoke all on function public.take_startgg_slots(int, int) from public, anon, authenticated;
grant execute on function public.take_startgg_slots(int, int) to service_role;
