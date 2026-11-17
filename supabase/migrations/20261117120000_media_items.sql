-- Movie/TV support alongside books, with a shared library view.

-- 1. Existing books stay books. No row rewrites: the default covers them.
alter table public.books
  add column if not exists content_type text not null default 'book';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'books_content_type_check'
  ) then
    alter table public.books
      add constraint books_content_type_check
      check (content_type = 'book');
  end if;
end $$;

-- 2. Movies and TV shows searched/added through TMDB.
create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('movie', 'tv')),
  tmdb_id bigint not null check (tmdb_id > 0),
  title text not null,
  original_title text,
  release_date date,
  overview text,
  poster_path text,
  backdrop_path text,
  original_language text,
  vote_average numeric(3,1),
  genre_ids integer[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  watch_status text not null default 'planned'
    check (watch_status in ('planned', 'watching', 'watched')),
  rating integer check (rating between 1 and 5),
  review text check (review is null or char_length(review) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_items_user_type_tmdb_unique unique (user_id, content_type, tmdb_id)
);

create trigger media_items_set_updated_at
  before update on public.media_items
  for each row execute function public.set_updated_at();

create index if not exists media_items_user_id_idx on public.media_items (user_id);
create index if not exists media_items_user_type_idx
  on public.media_items (user_id, content_type);
create index if not exists media_items_created_at_idx
  on public.media_items (created_at desc);

alter table public.media_items enable row level security;

create policy "Media: owner selects"
  on public.media_items for select to authenticated
  using (user_id = auth.uid());
create policy "Media: owner inserts"
  on public.media_items for insert to authenticated
  with check (user_id = auth.uid());
create policy "Media: owner updates"
  on public.media_items for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Media: owner deletes"
  on public.media_items for delete to authenticated
  using (user_id = auth.uid());

-- 3. One collection view for future status/stats/recommendation features.
-- security_invoker keeps the owner-only RLS of the underlying tables.
create or replace view public.library_items
with (security_invoker = true) as
  select
    b.id,
    b.user_id,
    b.content_type,
    b.title,
    array_to_string(b.authors, ', ') as subtitle,
    b.cover_url as poster_url,
    b.description as overview,
    b.published_date as date_label,
    b.reading_status as status,
    b.rating,
    b.review,
    b.created_at,
    b.updated_at
  from public.books b
  union all
  select
    m.id,
    m.user_id,
    m.content_type,
    m.title,
    coalesce(m.original_title, '') as subtitle,
    case
      when m.poster_path is not null and m.poster_path <> ''
        then 'https://image.tmdb.org/t/p/w500' || m.poster_path
      else null
    end as poster_url,
    m.overview,
    m.release_date::text as date_label,
    m.watch_status as status,
    m.rating,
    m.review,
    m.created_at,
    m.updated_at
  from public.media_items m;

revoke all on public.library_items from public;
grant select on public.library_items to authenticated;
