-- Create a public bucket for token images
insert into storage.buckets (id, name, public)
values ('token-images','token-images', true)
on conflict (id) do nothing;

-- Allow public read access to token images
create policy if not exists "Public read for token-images"
  on storage.objects for select
  using (bucket_id = 'token-images');

-- Allow anonymous uploads to the token-images bucket (no updates/deletes)
create policy if not exists "Public insert for token-images"
  on storage.objects for insert
  with check (bucket_id = 'token-images');