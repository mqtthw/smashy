-- Hosted events, phase 4 (additive): promotion and results.

-- A post can carry a hosted event's card (sign-ups while open, results when finished).
alter table public.posts add column hosted_event_id uuid references public.hosted_events (id) on delete set null;
create index posts_hosted_event_idx on public.posts (hosted_event_id) where hosted_event_id is not null;
grant insert (hosted_event_id) on public.posts to authenticated;

-- Final placements, saved when the bracket finishes (for profiles and result notifications).
alter table public.hosted_entrants add column placement int check (placement is null or placement between 1 and 512);

-- Weeklies: each new edition points at the first one, so editions link to each other.
alter table public.hosted_events add column series_id uuid references public.hosted_events (id) on delete set null;
grant insert (series_id) on public.hosted_events to authenticated;
create index hosted_events_series_idx on public.hosted_events (series_id, starts_at) where series_id is not null;

-- "You placed 3rd at …" when an event finishes (with a push).
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'follow', 'follow_request', 'follow_accepted', 'like', 'reply', 'repost', 'quote', 'vote',
  'scene_approved', 'scene_rejected', 'admin_approved', 'admin_rejected', 'major_live', 'reaction',
  'clip_approved', 'clip_rejected', 'mention', 'message_request', 'event_reminder', 'weekly_digest', 'set_ready', 'event_result'
));
create or replace function private.push_notification() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if new.type in ('reply', 'mention', 'quote', 'follow', 'follow_request', 'follow_accepted', 'message_request', 'major_live', 'event_reminder', 'set_ready', 'event_result') then
    perform private.request_push('notification', new.id);
  end if;
  return null;
end;
$$;
