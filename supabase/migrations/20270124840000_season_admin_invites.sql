-- Round 639 (Matthew, 2026-11-20: "Yes, ask them first"). A season's co-admin is now invited and becomes
-- one only after accepting. Until then the row is a pending invite (accepted_at null): it gives no say over
-- the season, and the season doesn't list them as running it.
--
-- Everyone who is a co-admin today stays one (marked accepted when they were added).
-- Only the server reads and writes this table (row-level security on, no policies), so no new rules.

alter table public.season_admins add column if not exists accepted_at timestamptz;
update public.season_admins set accepted_at = created_at where accepted_at is null;
