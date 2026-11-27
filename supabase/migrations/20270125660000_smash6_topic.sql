-- Smash 6 speculation (round 1006, Matthew: "I want smashy to be a site where people can also share smash 6
-- speculation"; he picked a Smash 6 board in Discuss).
--
-- A "Smash 6" topic (flair) for Discuss threads: rumors, roster wishlists, mechanics people want. Its threads are
-- General posts with this topic, shown on Discuss's own Smash 6 tab. The list of allowed flairs gains 'smash6';
-- nothing else about posts changes, and nothing here changes or deletes existing rows. Safe to run again.

alter table public.posts drop constraint if exists posts_flair_check;
alter table public.posts add constraint posts_flair_check
  check (flair is null or flair in ('question', 'discussion', 'analysis', 'news', 'meme', 'art', 'help', 'newplayer', 'smash6'));
