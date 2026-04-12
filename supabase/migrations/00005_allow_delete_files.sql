create policy "Owners can delete files in their spaces"
  on public.files for delete
  using (
    exists (
      select 1 from public.spaces
      where spaces.id = files.space_id
      and spaces.owner_id = auth.uid()
    )
  );

create policy "Anyone can delete files in public spaces"
  on public.files for delete
  using (
    exists (
      select 1 from public.spaces
      where spaces.id = files.space_id
      and spaces.is_private = false
    )
  );
