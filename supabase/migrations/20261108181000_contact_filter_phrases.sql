-- The database's contact-info filter was missing the phrase rules the app has ("add me on…",
-- "my discord…", "discord tag…"). Chat was covered because the app checks first, but posts rely on
-- the database. Now both match src/lib/guardrails.ts.
create or replace function private.has_contact_info(t text) returns boolean
  language sql immutable
  set search_path = ''
as $$
  select t ~* '(https?://|www\.|\m[a-z0-9-]+\.(com|net|org|gg|io|me|tv|co|ly|app|link|xyz)\M)'
      or t ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
      or t ~ '(\d[\s().-]?){9}\d'
      or t ~* '(^|\s)@[a-z0-9_.]{2,}'
      or t ~* '\m(snap ?chat|instagram|insta|tiktok|whats ?app|telegram|kik)\M'
      or t ~* '\m(add|dm|message|hmu|hit me up|text|call) me (on|at|in)\M'
      or t ~* '\mmy (discord|snap|insta|number|phone|socials?)\M'
      or t ~* '\mdiscord (id|tag|name|user(name)?)\M';
$$;
