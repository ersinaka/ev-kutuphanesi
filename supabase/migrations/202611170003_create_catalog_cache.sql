create table public.catalog_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  results jsonb not null default '[]'::jsonb,
  hit_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index catalog_cache_expires_at_idx on public.catalog_cache (expires_at);

create trigger catalog_cache_set_updated_at
before update on public.catalog_cache
for each row
execute function public.set_updated_at();

alter table public.catalog_cache enable row level security;

create policy "Allow anon read catalog_cache"
  on public.catalog_cache for select
  to anon, authenticated
  using (true);

create policy "Allow anon insert catalog_cache"
  on public.catalog_cache for insert
  to anon, authenticated
  with check (true);

create policy "Allow anon update catalog_cache"
  on public.catalog_cache for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Allow anon delete catalog_cache"
  on public.catalog_cache for delete
  to anon, authenticated
  using (true);
