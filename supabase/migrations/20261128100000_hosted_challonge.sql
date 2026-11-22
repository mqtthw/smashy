-- A finished hosted bracket can be copied to Challonge (so Braacket and other ranking sites can
-- import it). The link is kept on the event: shown to everyone, and it stops a second copy.
alter table public.hosted_events add column challonge_url text
  check (challonge_url is null or challonge_url ~ '^https://challonge\.com/[A-Za-z0-9_]+$');
-- Written by the server only (not in the host's update grant); readable like the rest of the event (table-wide select grant).
