-- Round 7 (additive / backward compatible).

-- 1. Majors remember the venue's time zone, so dates like "Nov 14–16" are the venue's days
--    (a Sunday-night finish in Texas is already Monday in UTC). Filled in by the next majors refresh.
alter table public.majors add column timezone text;

-- 2. Play lobbies: the connect code can't be a phone number either (the app already checks this;
--    this is the database backstop). Switch friend codes (SW-1234-5678-9012) are allowed.
--    "not valid" = checks new lobbies only; existing ones close within a day anyway.
alter table public.lobbies add constraint lobbies_connect_info_no_contact check (
  connect_info ~* '^SW[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}$' or not private.has_contact_info(connect_info)
) not valid;
