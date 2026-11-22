-- Review fix: rate limits on likes, reposts, upvotes and reports (posts and follows already had some).
-- Attempts are logged (not just saved rows), so like/unlike/like loops that spam notifications count too.
-- The log is private (not reachable through the API) and trimmed daily.

create table private.rate_events (
  user_id uuid not null,
  action text not null,
  at timestamptz not null default now()
);
create index rate_events_lookup_idx on private.rate_events (user_id, action, at desc);

-- Raises "doing that too fast" if the signed-in user did `action` max_n times within `win`.
-- Server jobs (no signed-in user) aren't limited.
create or replace function private.rate_limit(action text, max_n int, win interval) returns void
  language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  if (select count(*) from private.rate_events e where e.user_id = uid and e.action = rate_limit.action and e.at > now() - win) >= max_n then
    raise exception 'You''re doing that too fast. Wait a few minutes and try again.' using errcode = 'P0429';
  end if;
  insert into private.rate_events (user_id, action) values (uid, rate_limit.action);
end;
$$;

create or replace function private.limit_likes() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform private.rate_limit('like', 60, interval '5 minutes'); return new; end; $$;
create or replace function private.limit_reposts() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform private.rate_limit('repost', 30, interval '10 minutes'); return new; end; $$;
create or replace function private.limit_votes() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform private.rate_limit('vote', 60, interval '5 minutes'); return new; end; $$;
create or replace function private.limit_reports() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform private.rate_limit('report', 10, interval '1 hour'); return new; end; $$;

create trigger post_likes_rate before insert on public.post_likes for each row execute function private.limit_likes();
create trigger reposts_rate before insert on public.reposts for each row execute function private.limit_reposts();
create trigger highlight_votes_rate before insert on public.highlight_votes for each row execute function private.limit_votes();
create trigger post_reports_rate before insert on public.post_reports for each row execute function private.limit_reports();
create trigger live_reports_rate before insert on public.live_reports for each row execute function private.limit_reports();

-- Keep the log small: drop entries older than a day, every night.
select cron.schedule('trim-rate-events', '17 4 * * *', $$delete from private.rate_events where at < now() - interval '1 day'$$);
