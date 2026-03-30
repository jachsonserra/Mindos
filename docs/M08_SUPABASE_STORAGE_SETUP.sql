-- M08 - Supabase Storage setup (executar no SQL Editor do Supabase)
-- Objetivo: permitir upload persistente de imagens por usuário

-- Buckets (públicos, com RLS por owner)
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('visions', 'visions', true),
  ('memories', 'memories', true)
on conflict (id) do nothing;

-- Permissões de leitura (somente objetos do próprio usuário)
create policy if not exists avatars_owner_read
on storage.objects for select
using (bucket_id = 'avatars' and owner = auth.uid());

create policy if not exists visions_owner_read
on storage.objects for select
using (bucket_id = 'visions' and owner = auth.uid());

create policy if not exists memories_owner_read
on storage.objects for select
using (bucket_id = 'memories' and owner = auth.uid());

-- Permissões de upload (somente no próprio diretório)
create policy if not exists avatars_owner_insert
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy if not exists visions_owner_insert
on storage.objects for insert
with check (
  bucket_id = 'visions'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy if not exists memories_owner_insert
on storage.objects for insert
with check (
  bucket_id = 'memories'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Permissões de update/delete (somente objetos do próprio usuário)
create policy if not exists avatars_owner_update
on storage.objects for update
using (bucket_id = 'avatars' and owner = auth.uid())
with check (bucket_id = 'avatars' and owner = auth.uid());

create policy if not exists visions_owner_update
on storage.objects for update
using (bucket_id = 'visions' and owner = auth.uid())
with check (bucket_id = 'visions' and owner = auth.uid());

create policy if not exists memories_owner_update
on storage.objects for update
using (bucket_id = 'memories' and owner = auth.uid())
with check (bucket_id = 'memories' and owner = auth.uid());

create policy if not exists avatars_owner_delete
on storage.objects for delete
using (bucket_id = 'avatars' and owner = auth.uid());

create policy if not exists visions_owner_delete
on storage.objects for delete
using (bucket_id = 'visions' and owner = auth.uid());

create policy if not exists memories_owner_delete
on storage.objects for delete
using (bucket_id = 'memories' and owner = auth.uid());
