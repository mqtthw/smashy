-- Round 518: one start.gg allowance for the whole site. start.gg allows 80 requests a minute per key,
-- but each Vercel server counted only its own (70 a minute each), and smashy.gg runs on servers in
-- more than one region, so together they could go over and every page got "Rate limit exceeded".
-- Each server now asks here before calling start.gg.

create table private.startgg_calls (at timestamptz not null default clock_timestamp());
create index startgg_calls_at on private.startgg_calls (at);

-- Takes a slot if fewer than `per_minute` start.gg requests went out in the last minute (returns 0),
-- else returns how many milliseconds until one frees up (nothing is taken). One caller at a time.
create or replace function private.take_startgg_slot(per_minute int) returns int
  language plpgsql security definer set search_path = ''
as $$
declare
  used int;
  oldest timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('startgg_calls'));
  delete from private.startgg_calls where at <= clock_timestamp() - interval '60 seconds';
  select count(*) into used from private.startgg_calls;
  if used < per_minute then
    insert into private.startgg_calls default values;
    return 0;
  end if;
  -- The request that has to turn a minute old before there's room again.
  select at into oldest from private.startgg_calls order by at desc offset per_minute - 1 limit 1;
  return greatest(1, ceil(extract(epoch from (oldest + interval '60 seconds' - clock_timestamp())) * 1000)::int + 25);
end;
$$;

-- Callable only with the server's secret key.
create or replace function public.take_startgg_slot(per_minute int) returns int
  language sql security definer set search_path = ''
as $$ select private.take_startgg_slot(per_minute) $$;
revoke all on function public.take_startgg_slot(int) from public, anon, authenticated;
grant execute on function public.take_startgg_slot(int) to service_role;
