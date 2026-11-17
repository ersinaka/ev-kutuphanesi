create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  authors text[] not null default '{}',
  isbn text,
  isbn13 text,
  cover_url text,
  publisher text,
  published_date text,
  page_count integer,
  description text,
  location text,
  notes text,
  source text not null default 'manual' check (source in ('open_library', 'google_books', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index books_isbn_unique on public.books (isbn) where isbn is not null and isbn <> '';
create unique index books_isbn13_unique on public.books (isbn13) where isbn13 is not null and isbn13 <> '';
create index books_title_idx on public.books using gin (to_tsvector('simple', coalesce(title, '')));
create index books_authors_idx on public.books using gin (authors);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger books_set_updated_at
before update on public.books
for each row
execute function public.set_updated_at();

alter table public.books enable row level security;

create policy "Allow anon read books"
  on public.books for select
  to anon, authenticated
  using (true);

create policy "Allow anon insert books"
  on public.books for insert
  to anon, authenticated
  with check (true);

create policy "Allow anon update books"
  on public.books for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Allow anon delete books"
  on public.books for delete
  to anon, authenticated
  using (true);
