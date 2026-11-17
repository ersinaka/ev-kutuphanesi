-- Auth, profiles, public read books/comments and permanent book metadata cache.

-- 1. Books become user-owned. Existing rows are claimed by the first user.
alter table public.books
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.books
  set user_id = (select id from auth.users order by created_at asc limit 1)
  where user_id is null;

alter table public.books alter column user_id set default auth.uid();

-- ISBNs are unique per user, not globally (two users can own the same book).
drop index if exists public.books_isbn_unique;
drop index if exists public.books_isbn13_unique;
create unique index books_user_isbn_unique
  on public.books (user_id, isbn)
  where isbn is not null and isbn <> '';
create unique index books_user_isbn13_unique
  on public.books (user_id, isbn13)
  where isbn13 is not null and isbn13 <> '';
create index if not exists books_user_id_idx on public.books (user_id);

-- 2. Public profiles (only non-sensitive fields).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default '',
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "Profiles are public"
  on public.profiles for select to anon, authenticated using (true);
create policy "Users insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.make_username(raw text, user_id uuid)
returns text language plpgsql set search_path = public as $$
declare
  base text;
  candidate text;
  suffix integer := 0;
begin
  base := lower(coalesce(raw, ''));
  base := regexp_replace(base, '[^a-z0-9_]', '', 'g');
  if char_length(base) < 3 then
    base := 'user' || substr(user_id::text, 1, 8);
  end if;
  base := left(base, 15);
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := base || suffix::text;
  end loop;
  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    public.make_username(
      coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
      new.id
    ),
    coalesce(
      nullif(btrim(coalesce(new.raw_user_meta_data->>'display_name', '')), ''),
      split_part(new.email, '@', 1)
    ),
    nullif(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;

  -- Books created before auth belonged to the whole household.
  update public.books set user_id = new.id where user_id is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Replace the old anon CRUD policies with owner-only RLS.
drop policy if exists "Allow anon read books" on public.books;
drop policy if exists "Allow anon insert books" on public.books;
drop policy if exists "Allow anon update books" on public.books;
drop policy if exists "Allow anon delete books" on public.books;

create policy "Books: owner selects"
  on public.books for select to authenticated
  using (user_id = auth.uid());
create policy "Books: owner inserts"
  on public.books for insert to authenticated
  with check (user_id = auth.uid());
create policy "Books: owner updates"
  on public.books for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Books: owner deletes"
  on public.books for delete to authenticated
  using (user_id = auth.uid());

-- 4. Comments on books the user finished. Public to read, owner-only to write.
create table if not exists public.book_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  title text not null,
  authors text[] not null default '{}',
  cover_url text,
  isbn text,
  isbn13 text,
  rating integer check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 2000),
  finished_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id)
);

create trigger book_comments_set_updated_at
  before update on public.book_comments
  for each row execute function public.set_updated_at();

create or replace function public.sync_book_comment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is null then
    return new;
  end if;

  if new.reading_status = 'read'
     and (coalesce(btrim(coalesce(new.review, '')), '') <> '' or new.rating is not null) then
    insert into public.book_comments
      (user_id, book_id, title, authors, cover_url, isbn, isbn13, rating, body, finished_at)
    values
      (new.user_id, new.id, new.title, coalesce(new.authors, '{}'), new.cover_url,
       new.isbn, new.isbn13, new.rating, coalesce(new.review, ''), new.finished_at)
    on conflict (user_id, book_id) do update set
      title = excluded.title,
      authors = excluded.authors,
      cover_url = excluded.cover_url,
      isbn = excluded.isbn,
      isbn13 = excluded.isbn13,
      rating = excluded.rating,
      body = excluded.body,
      finished_at = excluded.finished_at,
      updated_at = now();
  else
    delete from public.book_comments where book_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists books_sync_comment on public.books;
create trigger books_sync_comment
  after insert or update on public.books
  for each row execute function public.sync_book_comment();

alter table public.book_comments enable row level security;

create policy "Comments are public"
  on public.book_comments for select to anon, authenticated using (true);
create policy "Users insert own comments"
  on public.book_comments for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users update own comments"
  on public.book_comments for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own comments"
  on public.book_comments for delete to authenticated
  using (auth.uid() = user_id);

-- Public, minimal view of another user's finished books (no notes/loans).
create or replace function public.profile_read_books(p_user_id uuid)
returns table (
  id uuid,
  title text,
  authors text[],
  cover_url text,
  isbn13 text,
  rating integer,
  finished_at date,
  review text,
  sort_at date
)
language sql stable security definer set search_path = public as $$
  select b.id, b.title, b.authors, b.cover_url, b.isbn13, b.rating,
         b.finished_at, b.review,
         coalesce(b.finished_at, b.created_at::date) as sort_at
  from public.books b
  where b.user_id = p_user_id and b.reading_status = 'read'
  order by sort_at desc, b.created_at desc;
$$;
revoke all on function public.profile_read_books(uuid) from public;
grant execute on function public.profile_read_books(uuid) to anon, authenticated;

-- Cache writes now happen from authenticated server routes only.
drop policy if exists "Allow anon insert catalog_cache" on public.catalog_cache;
drop policy if exists "Allow anon update catalog_cache" on public.catalog_cache;
drop policy if exists "Allow anon delete catalog_cache" on public.catalog_cache;
create policy "Authenticated insert catalog_cache"
  on public.catalog_cache for insert to authenticated with check (true);
create policy "Authenticated update catalog_cache"
  on public.catalog_cache for update to authenticated
  using (true) with check (true);
create policy "Authenticated delete catalog_cache"
  on public.catalog_cache for delete to authenticated using (true);

-- 5. Permanent per-book metadata cache: fetch each book from providers once.
create table if not exists public.book_metadata (
  cache_key text primary key,
  book jsonb not null,
  source text,
  hit_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger book_metadata_set_updated_at
  before update on public.book_metadata
  for each row execute function public.set_updated_at();

alter table public.book_metadata enable row level security;

create policy "Book metadata readable"
  on public.book_metadata for select to anon, authenticated using (true);
create policy "Book metadata insertable"
  on public.book_metadata for insert to authenticated with check (true);
create policy "Book metadata updatable"
  on public.book_metadata for update to authenticated
  using (true) with check (true);
