-- Launch prep (additive / backward compatible: the live site keeps working unchanged).

-- Scene links (the scene's Discord, start.gg pages, socials), edited by its admins through the server.
alter table public.scenes add column links jsonb not null default '[]'::jsonb
  check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 6 and pg_column_size(links) < 4000);

-- Weekly digest notifications ("This week: 3 Smash events in San Antonio"), sent by the scheduled job.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'follow', 'follow_request', 'follow_accepted', 'like', 'reply', 'repost', 'quote', 'vote',
  'scene_approved', 'scene_rejected', 'admin_approved', 'admin_rejected', 'major_live', 'reaction',
  'clip_approved', 'clip_rejected', 'mention', 'message_request', 'event_reminder', 'weekly_digest'
));
-- ...and people can switch those (and event reminders) off like other types.
alter table public.profiles drop constraint profiles_notification_mutes_check;
alter table public.profiles add constraint profiles_notification_mutes_check
  check (notification_mutes <@ array['like', 'reaction', 'repost', 'quote', 'follow', 'mention', 'reply', 'vote', 'event_reminder', 'weekly_digest']::text[]);

-- Error log: problems on the live site, recorded by the server and shown to site admins in Admin.
-- Server-only (no access through the public API). Repeats of the same error are counted on one row.
create table public.error_reports (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique check (char_length(fingerprint) <= 200),
  source text not null check (source in ('server', 'browser')),
  message text not null check (char_length(message) <= 1000),
  path text check (path is null or char_length(path) <= 300),
  digest text check (digest is null or char_length(digest) <= 100),
  count int not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  resolved_at timestamptz
);
create index error_reports_recent_idx on public.error_reports (last_seen desc);
alter table public.error_reports enable row level security;
revoke all on public.error_reports from anon, authenticated;

-- Record one error (or count a repeat). Called by the server with the secret key only.
create function public.log_error(p_fingerprint text, p_source text, p_message text, p_path text, p_digest text) returns void
  language sql security definer set search_path = ''
as $$
  insert into public.error_reports (fingerprint, source, message, path, digest)
  values (left(p_fingerprint, 200), p_source, left(p_message, 1000), left(p_path, 300), left(p_digest, 100))
  on conflict (fingerprint) do update
    set count = public.error_reports.count + 1, last_seen = now(), resolved_at = null,
        path = excluded.path, digest = excluded.digest;
$$;
revoke all on function public.log_error(text, text, text, text, text) from public, anon, authenticated;

-- Usage check for Admin: database size and file storage per bucket (free-plan limits are 500 MB / 1 GB).
create function public.admin_usage() returns jsonb
  language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'database_bytes', pg_database_size(current_database()),
    'buckets', coalesce((
      select jsonb_object_agg(bucket_id, jsonb_build_object('files', files, 'bytes', bytes))
      from (
        select bucket_id, count(*) as files, coalesce(sum((metadata ->> 'size')::bigint), 0) as bytes
        from storage.objects group by bucket_id
      ) b
    ), '{}'::jsonb)
  )
$$;
revoke all on function public.admin_usage() from public, anon, authenticated;
