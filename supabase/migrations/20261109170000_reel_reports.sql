-- Report a clip in Reels. Clip ids are text (Twitch slugs, YouTube ids), so report targets become
-- text too (existing chat/lobby/highlight ids are uuids, which convert as-is).
alter table public.live_reports alter column target_id type text using target_id::text;
alter table public.live_reports drop constraint live_reports_kind_check;
alter table public.live_reports add constraint live_reports_kind_check check (kind in ('chat', 'lobby', 'highlight', 'reel'));

alter table public.moderation_actions drop constraint moderation_actions_action_check;
alter table public.moderation_actions add constraint moderation_actions_action_check
  check (action in ('remove_post', 'restore_post', 'dismiss_reports', 'remove_chat', 'close_lobby', 'dismiss_live', 'remove_highlight', 'hide_reel'));
