-- Player stats on profiles: show_stats = null means "default" (adults shown, teens hidden);
-- true/false is the player's own choice.
alter table public.profiles add column show_stats boolean;
grant update (show_stats) on public.profiles to authenticated;
