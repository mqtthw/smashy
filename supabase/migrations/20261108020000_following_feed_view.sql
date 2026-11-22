-- Fix: the Following feed sent every followed account id in the request URL
-- (`actor_id=in.(...)`). Around 1,000+ follows the URL got too long and the request failed
-- ("Bad Request"), so the Following tab broke for heavy followers.
-- This view does the filtering inside the database instead, for the signed-in viewer.
-- security_invoker = true: the viewer's own privacy rules still apply (teen/removed posts).
create view public.following_feed_items with (security_invoker = true) as
  select fi.*
  from public.feed_items fi
  where fi.actor_id = (select auth.uid())
     or fi.actor_id in (
       select f.followee_id from public.follows f
       where f.follower_id = (select auth.uid()) and f.status = 'active'
     );

grant select on public.following_feed_items to authenticated;
revoke all on public.following_feed_items from anon;

-- Speeds up "who do I follow?" lookups used by the view.
create index if not exists follows_follower_active_idx on public.follows (follower_id) where status = 'active';
