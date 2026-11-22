-- Moderators can hide a reported hosted event; the moderation log gets a "hide_event" entry.
alter table public.moderation_actions drop constraint moderation_actions_action_check;
alter table public.moderation_actions add constraint moderation_actions_action_check
  check (action in ('remove_post', 'restore_post', 'dismiss_reports', 'remove_chat', 'close_lobby', 'dismiss_live', 'remove_highlight', 'hide_reel', 'remove_message', 'clear_profile', 'hide_event'));
