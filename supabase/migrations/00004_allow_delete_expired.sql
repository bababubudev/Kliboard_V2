create policy "Anyone can delete expired spaces"
  on public.spaces for delete
  using (expires_at < now());
