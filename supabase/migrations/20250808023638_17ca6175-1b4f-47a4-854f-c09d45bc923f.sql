-- Create tokens table to store created pools and metadata
create table if not exists public.tokens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  symbol text not null,
  description text,
  image_url text,
  initial_supply bigint,
  website text,
  twitter text,
  telegram text,
  pool_address text not null unique,
  config text,
  creator text,
  base_mint text not null unique,
  pool_type smallint,
  activation_point bigint,
  tx_signature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.tokens enable row level security;

-- Public read access
create policy "Tokens are viewable by everyone" on public.tokens
for select using (true);

-- Allow inserts from anyone (no Supabase auth in app yet)
create policy "Anyone can insert tokens" on public.tokens
for insert with check (true);

-- Optionally, disallow updates/deletes by default (no policies created)

-- Trigger function to update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger
create trigger set_tokens_updated_at
before update on public.tokens
for each row execute function public.set_updated_at();

-- Helpful indexes
create index if not exists idx_tokens_created_at on public.tokens (created_at desc);
