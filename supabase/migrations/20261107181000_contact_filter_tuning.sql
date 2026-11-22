-- Tune the contact-info backstop so normal smash talk isn't blocked:
-- phone numbers need 10+ digits (set scores like "3-2 2-1" are fine), and common phrases
-- like "ig" or "add me to bracket" are no longer blocked here (the app checks specific phrasing).
create or replace function private.has_contact_info(t text) returns boolean
  language sql immutable
  set search_path = ''
as $$
  select t ~* '(https?://|www\.|\m[a-z0-9-]+\.(com|net|org|gg|io|me|tv|co|ly|app|link|xyz)\M)'
      or t ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
      or t ~ '(\d[\s().-]?){9}\d'
      or t ~* '(^|\s)@[a-z0-9_.]{2,}'
      or t ~* '\m(snap ?chat|instagram|insta|tiktok|whats ?app|telegram|kik)\M';
$$;
