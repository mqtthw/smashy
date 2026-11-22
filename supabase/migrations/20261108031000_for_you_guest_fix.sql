-- Fix: For You failed for guests ("permission denied for table post_dismissals") because the ranking
-- checks that table. Guests can read it, but no policy covers them, so they always see zero rows.
grant select on public.post_dismissals to anon;
