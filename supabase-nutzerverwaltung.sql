-- =============================================================
--  Wiwang Law – Nutzerverwaltung
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen
--  und auf "Run" klicken. Nur einmal nötig.
--
--  Admin wird der Account, der als ERSTES angelegt wurde.
--  Unten in der Ausgabe steht, welcher Account Admin ist.
-- =============================================================

-- Wer darf Nutzer verwalten?
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
-- (keine Policy: niemand kann die Tabelle direkt lesen oder ändern,
--  nur die Funktionen unten)

insert into public.admins (user_id)
select id from auth.users order by created_at limit 1
on conflict do nothing;

-- Bin ich Admin?
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Alle Nutzer auflisten (nur Admin)
create or replace function public.admin_list_users()
returns table (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, is_admin boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Keine Berechtigung';
  end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at,
           exists (select 1 from public.admins a where a.user_id = u.id)
      from auth.users u
     order by u.created_at;
end $$;

-- Neuen Nutzer anlegen (nur Admin)
create or replace function public.admin_create_user(p_email text, p_password text)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
begin
  if not public.is_admin() then
    raise exception 'Keine Berechtigung';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ungültige E-Mail-Adresse';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'Passwort muss mindestens 6 Zeichen haben';
  end if;
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Diese E-Mail-Adresse gibt es schon';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  return v_id;
end $$;

-- Passwort eines Nutzers neu setzen (nur Admin)
create or replace function public.admin_set_password(p_user_id uuid, p_password text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Keine Berechtigung';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'Passwort muss mindestens 6 Zeichen haben';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = p_user_id;
end $$;

-- Nutzer löschen (nur Admin, nicht sich selbst)
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Keine Berechtigung';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Du kannst dich nicht selbst löschen';
  end if;
  delete from auth.users where id = p_user_id;
end $$;

-- Nur angemeldete Nutzer dürfen die Funktionen aufrufen
-- (die Admin-Prüfung passiert in den Funktionen selbst)
revoke execute on function public.is_admin()                       from public, anon;
revoke execute on function public.admin_list_users()               from public, anon;
revoke execute on function public.admin_create_user(text, text)    from public, anon;
revoke execute on function public.admin_set_password(uuid, text)   from public, anon;
revoke execute on function public.admin_delete_user(uuid)          from public, anon;
grant  execute on function public.is_admin()                       to authenticated;
grant  execute on function public.admin_list_users()               to authenticated;
grant  execute on function public.admin_create_user(text, text)    to authenticated;
grant  execute on function public.admin_set_password(uuid, text)   to authenticated;
grant  execute on function public.admin_delete_user(uuid)          to authenticated;

-- Zur Kontrolle: Wer ist Admin?
select u.email as admin from public.admins a join auth.users u on u.id = a.user_id;
