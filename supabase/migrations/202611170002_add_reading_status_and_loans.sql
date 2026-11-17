alter table public.books
  add column if not exists reading_status text not null default 'unread'
    check (reading_status in ('unread', 'reading', 'read')),
  add column if not exists loaned_to text,
  add column if not exists loaned_at date,
  add column if not exists due_at date;

create index if not exists books_reading_status_idx on public.books (reading_status);
create index if not exists books_location_idx on public.books (location);
create index if not exists books_loaned_to_idx on public.books (loaned_to) where loaned_to is not null;
