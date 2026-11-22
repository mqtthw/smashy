-- Search: full-text indexes so searching stays fast as content grows.
-- 'english' handles word forms (e.g. "waveshining" matches "waveshine").
-- Privacy rules still apply to every search, since results come through the same tables.

alter table public.posts
  add column search_vec tsvector generated always as (to_tsvector('english', coalesce(body, ''))) stored;
create index posts_search_idx on public.posts using gin (search_vec);

alter table public.highlights
  add column search_vec tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(guide_body, '')), 'C')
  ) stored;
create index highlights_search_idx on public.highlights using gin (search_vec);

-- People search matches tags and handles anywhere in the name.
create extension if not exists pg_trgm;
create index profiles_tag_trgm_idx on public.profiles using gin (lower(tag) gin_trgm_ops);
create index profiles_handle_trgm_idx on public.profiles using gin (handle gin_trgm_ops);
