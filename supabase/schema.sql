-- ديوان — هيكلة Supabase
-- الصقه في SQL Editor ثم نفّذه مرة واحدة.
-- بعدها انسخ Project URL و anon key إلى ملف .env
--
-- Authentication → Providers → Email:
-- للتجربة عطّل Confirm email حتى يدخل الطرفين مباشرة.
-- أنشئ حسابين: واحد بدور entry (مدخل البيانات) وواحد بدور viewer (المشاهد).

create table if not exists public.offices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices (id) on delete cascade,
  title text not null,
  image_url text not null,
  storage_path text,
  upload_date date not null default ((now() at time zone 'Asia/Baghdad')::date),
  status text not null default 'new' check (status in ('new', 'edited', 'accepted', 'rejected')),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists documents_office_id_idx on public.documents (office_id);
create index if not exists documents_status_idx on public.documents (status);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null check (role in ('entry', 'viewer'))
);

alter table public.offices enable row level security;
alter table public.documents enable row level security;
alter table public.profiles enable row level security;

grant select, insert, update, delete on public.offices to authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select on public.profiles to authenticated;

drop policy if exists "auth read offices" on public.offices;
create policy "auth read offices"
  on public.offices for select
  to authenticated
  using (true);

drop policy if exists "entry insert offices" on public.offices;
create policy "entry insert offices"
  on public.offices for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'entry'
    )
  );

drop policy if exists "entry update offices" on public.offices;
create policy "entry update offices"
  on public.offices for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'entry'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'entry'
    )
  );

drop policy if exists "entry delete offices" on public.offices;
create policy "entry delete offices"
  on public.offices for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'entry'
    )
  );

drop policy if exists "auth read documents" on public.documents;
create policy "auth read documents"
  on public.documents for select
  to authenticated
  using (true);

drop policy if exists "entry insert documents" on public.documents;
create policy "entry insert documents"
  on public.documents for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'entry'
    )
  );

drop policy if exists "entry update documents" on public.documents;
create policy "entry update documents"
  on public.documents for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'entry'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'entry'
    )
  );

drop policy if exists "viewer update documents" on public.documents;
create policy "viewer update documents"
  on public.documents for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'viewer'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'viewer'
    )
  );

drop policy if exists "entry delete documents" on public.documents;
create policy "entry delete documents"
  on public.documents for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'entry'
    )
  );

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case
      when new.raw_user_meta_data->>'role' in ('entry', 'viewer') then new.raw_user_meta_data->>'role'
      else 'entry'
    end
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        role = excluded.role;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public read document images" on storage.objects;
create policy "public read document images"
  on storage.objects for select
  to public
  using (bucket_id = 'documents');

drop policy if exists "entry upload document images" on storage.objects;
create policy "entry upload document images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'entry'
    )
  );

drop policy if exists "entry update document images" on storage.objects;
create policy "entry update document images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'entry'
    )
  );

drop policy if exists "entry delete document images" on storage.objects;
create policy "entry delete document images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'entry'
    )
  );

alter table public.offices replica identity full;
alter table public.documents replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.offices;
  exception
    when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.documents;
  exception
    when duplicate_object then null;
  end;
end $$;
