-- Hosted events fixes (additive / backward compatible).

-- 1. A version number on each event's bracket: every change says "I'm changing version N", so two results
--    saved at the same moment can't overwrite each other (the second one reloads and tries again).
alter table public.hosted_events add column bracket_version int not null default 0;

-- 2. Only the host of a weekly series can add editions to it.
create or replace function private.before_hosted_event() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.rate_limit('host_event', 5, interval '1 day');
    if new.starts_at < now() + interval '10 minutes' then
      raise exception 'Pick a start time at least 10 minutes from now.' using errcode = 'P0001';
    end if;
  end if;
  if new.starts_at > now() + interval '1 year' then
    raise exception 'Events can be up to a year ahead.' using errcode = 'P0001';
  end if;
  if new.series_id is not null and (tg_op = 'INSERT' or new.series_id is distinct from old.series_id)
     and (select e.host_id from public.hosted_events e where e.id = new.series_id) is distinct from new.host_id then
    raise exception 'You can only add editions to your own series.' using errcode = 'P0001';
  end if;
  if private.is_minor(new.host_id) and (private.has_contact_info(new.name) or private.has_contact_info(coalesce(new.description, '')) or private.has_contact_info(coalesce(new.location, ''))) then
    raise exception 'Event details can''t include phone numbers, emails or social handles.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- 3. Connect codes: only your own is readable directly; the server shows a code to your opponent and the host.
revoke select on public.hosted_entrants from authenticated;
grant select (event_id, user_id, seed, checked_in_at, created_at, placement) on public.hosted_entrants to authenticated;
grant select (event_id, user_id, seed, checked_in_at, created_at, placement) on public.hosted_entrants to anon;

-- 4. Hosts can check a player in themselves (someone who's there but missed the button).
create function public.host_check_in(ev uuid, person uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.hosted_events where id = ev and host_id = auth.uid() and status in ('open', 'closed')) then
    raise exception 'Only the host can check people in, before the bracket starts.' using errcode = 'P0001';
  end if;
  update public.hosted_entrants set checked_in_at = coalesce(checked_in_at, now()) where event_id = ev and user_id = person;
end;
$$;
revoke all on function public.host_check_in(uuid, uuid) from public, anon;
grant execute on function public.host_check_in(uuid, uuid) to authenticated;

-- 5. "Canceled" / "new time" notices for people signed up.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'follow', 'follow_request', 'follow_accepted', 'like', 'reply', 'repost', 'quote', 'vote',
  'scene_approved', 'scene_rejected', 'admin_approved', 'admin_rejected', 'major_live', 'reaction',
  'clip_approved', 'clip_rejected', 'mention', 'message_request', 'event_reminder', 'weekly_digest', 'set_ready', 'event_result',
  'event_update'
));
create or replace function private.push_notification() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if new.type in ('reply', 'mention', 'quote', 'follow', 'follow_request', 'follow_accepted', 'message_request', 'major_live', 'event_reminder', 'set_ready', 'event_result', 'event_update') then
    perform private.request_push('notification', new.id);
  end if;
  return null;
end;
$$;

-- 6. Indexes Supabase's advisor suggests for busy lookups and deletes.
create index if not exists hosted_sets_p2_idx on public.hosted_sets (p2_id);
create index if not exists hosted_sets_winner_to_idx on public.hosted_sets (winner_to);
create index if not exists hosted_sets_loser_to_idx on public.hosted_sets (loser_to);
create index if not exists notifications_post_idx on public.notifications (post_id);
create index if not exists notifications_actor_idx on public.notifications (actor_id);
create index if not exists bookmarks_post_idx on public.bookmarks (post_id);
create index if not exists mutes_muted_idx on public.mutes (muted_id);
create index if not exists chat_messages_author_idx on public.chat_messages (author_id);
