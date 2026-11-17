alter table public.books
  add column if not exists review text,
  add column if not exists rating integer
    check (rating is null or (rating >= 1 and rating <= 5)),
  add column if not exists finished_at date;

create index if not exists books_rating_idx on public.books (rating)
  where rating is not null;
