-- Clip likes, poll votes and RSVPs: say exactly which columns people may fill in (including user_id,
-- which the app sends), instead of relying on Supabase's broad default grants. Nobody edits these rows,
-- so table-wide UPDATE goes too. Row-level security still decides whose rows they are.
revoke insert, update on public.reel_likes, public.poll_votes, public.event_rsvps from anon, authenticated;
grant insert (user_id, clip_id) on public.reel_likes to authenticated;
grant insert (post_id, user_id, choice) on public.poll_votes to authenticated;
grant insert (user_id, event_kind, event_ref, event_name, starts_at) on public.event_rsvps to authenticated;
