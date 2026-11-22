-- Fix: Supabase grants table-wide INSERT/UPDATE to API roles by default, which overrode
-- the column-only grants in the feed migration. Remove the defaults, then re-grant only
-- the columns users may write. Event cards and report status stay server-only.

revoke insert, update on public.posts from anon, authenticated;
grant insert (author_id, parent_id, game, body) on public.posts to authenticated;

revoke insert, update, delete on public.post_reports from anon, authenticated;
grant insert (post_id, reporter_id, reason, details) on public.post_reports to authenticated;

revoke update on public.post_likes from anon, authenticated;
revoke insert, update, delete on public.post_likes from anon;
