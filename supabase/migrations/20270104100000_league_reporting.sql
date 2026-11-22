-- Leagues, step L3 (docs/leagues-plan.md): players report their weekly set. One player reports
-- ("reported", which counts in the standings). If the other reports the same score it's
-- "confirmed"; a different score makes it "disputed", which doesn't count until the organizer fixes
-- it. Organizer fixes, no-shows and double losses go through the server (organizer checked there).

create function public.report_league_set(s uuid, mine int, theirs int) returns text
  language plpgsql security definer set search_path = ''
as $$
declare
  x record; l record; uid uuid := auth.uid();
  p1s int; p2s int; win uuid; need int;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  select * into x from public.league_sets where id = s for update;
  if x is null or uid not in (x.p1_id, x.p2_id) then raise exception 'That isn''t your set.' using errcode = 'P0001'; end if;
  select * into l from public.leagues where id = x.league_id;
  if l.status <> 'running' or l.removed_at is not null then raise exception 'This league isn''t taking scores right now.' using errcode = 'P0001'; end if;
  if x.state in ('confirmed', 'no_show', 'double_loss') then raise exception 'This set is settled. Ask the organizer to change it.' using errcode = 'P0001'; end if;
  need := l.best_of / 2 + 1;
  if mine is null or theirs is null or mine < 0 or theirs < 0 or mine = theirs or greatest(mine, theirs) <> need then
    raise exception 'Report a finished set: the winner has % game(s).', need using errcode = 'P0001';
  end if;
  if uid = x.p1_id then p1s := mine; p2s := theirs; else p1s := theirs; p2s := mine; end if;
  win := case when p1s > p2s then x.p1_id else x.p2_id end;

  if x.state = 'reported' and x.reported_by is distinct from uid then
    -- The other player answers: the same score confirms it, a different one is a dispute.
    if x.p1_score = p1s and x.p2_score = p2s then
      update public.league_sets set state = 'confirmed' where id = s;
      return 'confirmed';
    end if;
    update public.league_sets set state = 'disputed' where id = s;
    return 'disputed';
  end if;
  if x.state = 'disputed' then raise exception 'This set is disputed: the organizer will settle it.' using errcode = 'P0001'; end if;

  perform private.rate_limit('league_report', 30, interval '1 hour');
  update public.league_sets
    set state = 'reported', p1_score = p1s, p2_score = p2s, winner_id = win, reported_by = uid, reported_at = now()
    where id = s;
  return 'reported';
end;
$$;

revoke all on function public.report_league_set(uuid, int, int) from public, anon;
grant execute on function public.report_league_set(uuid, int, int) to authenticated;
