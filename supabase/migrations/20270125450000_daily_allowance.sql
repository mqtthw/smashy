-- Round 735: a daily allowance counted in one place (review 2026-11-22, item 1.2).
--
-- Reels search asks YouTube live for Shorts, and each new search costs 100 of YouTube's 10,000 free
-- daily units. The cap on that was counted in each server's memory, so every extra server and every
-- deploy started again from zero, and about 100 made-up searches could use up the whole allowance
-- (which also stops the normal Shorts collection until YouTube resets). This counts in the database:
-- take_daily_allowance('youtube_search', 30) says yes at most 30 times a UTC day, across all servers.
--
-- Server-only (the secret key). Nothing existing changes; the file can be run again.

create table if not exists private.daily_allowance (
  what text not null,
  day date not null,
  used int not null default 0,
  primary key (what, day)
);

create or replace function private.take_daily_allowance(p_what text, p_max int) returns boolean
  language plpgsql security definer set search_path = ''
as $$
declare today date := (now() at time zone 'utc')::date; taken int;
begin
  if p_what is null or char_length(p_what) not between 1 and 60 or p_max is null or p_max < 1 then return false; end if;
  -- Yesterday's rows aren't needed again.
  delete from private.daily_allowance where day < today - 7;
  insert into private.daily_allowance as a (what, day, used) values (p_what, today, 1)
    on conflict (what, day) do update set used = a.used + 1 where a.used < p_max
    returning used into taken;
  return taken is not null; -- no row came back: today's allowance is used up
end;
$$;

create or replace function public.take_daily_allowance(p_what text, p_max int) returns boolean
  language sql security definer set search_path = ''
as $$ select private.take_daily_allowance(p_what, p_max) $$;
revoke all on function public.take_daily_allowance(text, int) from public, anon, authenticated;
grant execute on function public.take_daily_allowance(text, int) to service_role;
