insert into storage.buckets (id, name, public)
values ('space-files', 'space-files', true)
on conflict (id) do update set public = true;

create policy "Anyone can upload files"
  on storage.objects for insert
  with check (bucket_id = 'space-files');

create policy "Authenticated users can delete their uploads"
  on storage.objects for delete
  using (bucket_id = 'space-files' and auth.uid() is not null);
