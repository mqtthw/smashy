-- Review fix: clip titles are written by whoever clipped the moment on Twitch. The server now cleans
-- them (swearing masked; slurs, sexual content and links hidden). Hidden ones are flagged here so a
-- site admin can look at the clip.
alter table public.reels add column title_flagged boolean not null default false;
