-- Round 730: "Interested" next to "I'm going" on tournaments and weeklies (Paper King's suggestion,
-- Matthew's yes). An RSVP gets a status; everything saved so far is "going". Can be run again.
--
-- Counts stay separate: "going" is the number organizers and friends care about, "interested" is a
-- softer signal. The friends list shows friends who are going, as before. Reminders go to both.

alter table public.event_rsvps add column if not exists status text not null default 'going';
alter table public.event_rsvps drop constraint if exists event_rsvps_status_check;
alter table public.event_rsvps add constraint event_rsvps_status_check check (status in ('going', 'interested'));

-- Saying which one when you RSVP, and switching between them later (your own row, that column only).
grant insert (event_kind, event_ref, event_name, starts_at, status) on public.event_rsvps to authenticated;
grant update (status) on public.event_rsvps to authenticated;
drop policy if exists "Change your own RSVP" on public.event_rsvps;
create policy "Change your own RSVP" on public.event_rsvps for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- The counts for an event page. A function's answer can't gain a column in place, so it's dropped and
-- made again (same name and arguments; the app's older code reads only `total` and `friends`).
drop function if exists public.event_going(text, text);
create function public.event_going(kind text, ref text)
  returns table (total bigint, friends jsonb, interested bigint)
  language sql stable security definer set search_path = ''
as $$
  select
    (select count(*) from public.event_rsvps r where r.event_kind = kind and r.event_ref = ref and r.status = 'going'),
    coalesce((
      select jsonb_agg(jsonb_build_object('tag', p.tag, 'handle', p.handle, 'avatar_path', p.avatar_path))
      from (
        select p.* from public.event_rsvps r
        join public.profiles p on p.id = r.user_id
        where r.event_kind = kind and r.event_ref = ref and r.status = 'going' and auth.uid() is not null and r.user_id <> auth.uid()
          and exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = r.user_id and f.status = 'active')
          and exists (select 1 from public.follows f where f.follower_id = r.user_id and f.followee_id = auth.uid() and f.status = 'active')
          and private.is_minor(r.user_id) = private.is_minor(auth.uid())
          and not private.is_blocked(r.user_id, auth.uid())
        order by r.created_at desc
        limit 5
      ) p
    ), '[]'::jsonb),
    (select count(*) from public.event_rsvps r where r.event_kind = kind and r.event_ref = ref and r.status = 'interested')
$$;
revoke all on function public.event_going(text, text) from public;
grant execute on function public.event_going(text, text) to anon, authenticated;
