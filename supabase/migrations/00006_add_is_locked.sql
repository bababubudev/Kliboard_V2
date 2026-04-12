alter table public.spaces
  add column is_locked boolean not null default true;

drop policy "Public spaces are updatable by everyone" on public.spaces;
drop policy "Owners can update their spaces" on public.spaces;

create policy "Logged-in users can update unlocked spaces"
  on public.spaces for update
  using (is_locked = false and auth.uid() is not null);

create policy "Owners can update their own spaces"
  on public.spaces for update
  using (auth.uid() = owner_id);

drop policy "Anyone can add files to accessible spaces" on public.files;

create policy "Logged-in users can add files to unlocked spaces"
  on public.files for insert
  with check (
    exists (
      select 1 from public.spaces
      where spaces.id = files.space_id
      and spaces.is_locked = false
      and auth.uid() is not null
    )
  );

create policy "Owners can add files to their spaces"
  on public.files for insert
  with check (
    exists (
      select 1 from public.spaces
      where spaces.id = files.space_id
      and spaces.owner_id = auth.uid()
    )
  );

drop policy "Anyone can delete files in public spaces" on public.files;

create policy "Logged-in users can delete files in unlocked spaces"
  on public.files for delete
  using (
    exists (
      select 1 from public.spaces
      where spaces.id = files.space_id
      and spaces.is_locked = false
      and auth.uid() is not null
    )
  );
