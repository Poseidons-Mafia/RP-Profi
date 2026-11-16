-- =============================================================
--  Wiwang Law – Update 4: Personalverwaltung, Ränge & Berechtigungen
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 und 3 sind ausgeführt.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  Der Admin (Inhaber, Tabelle "admins") hat immer alle Rechte.
--  Alle anderen bekommen ihre Rechte über ihren Rang.
-- =============================================================


-- ---------- Ränge ----------
create table if not exists public.raenge (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  sortierung     int not null default 100,
  berechtigungen jsonb not null default '[]'::jsonb,
  ist_sonstiges  boolean not null default false,  -- Mitglied benennt seinen Rang selbst
  created_at     timestamptz not null default now()
);

insert into public.raenge (name, sortierung, berechtigungen, ist_sonstiges) values
  ('Chairman',     10, '["akten_loeschen","rechnungen","buchhaltung_sehen","buchhaltung_buchen","gesetzbuch","personal_sehen","personal_verwalten","einstellungen"]', false),
  ('Partner',      20, '["akten_loeschen","rechnungen","buchhaltung_sehen","buchhaltung_buchen","gesetzbuch","personal_sehen"]', false),
  ('Rechtsanwalt', 30, '["rechnungen","gesetzbuch"]', false),
  ('Referendar',   40, '[]', false),
  ('Praktikant',   50, '[]', false),
  ('Sekretariat',  60, '["rechnungen"]', false),
  ('Sonstiges',    90, '[]', true)
on conflict (name) do nothing;


-- ---------- Profile: Personaldaten ----------
alter table public.profiles add column if not exists rang_id       uuid references public.raenge(id) on delete set null;
alter table public.profiles add column if not exists rang_eigen    text;   -- eigener Name beim Rang "Sonstiges"
alter table public.profiles add column if not exists status        text not null default 'Aktiv';
alter table public.profiles add column if not exists eintritt      date;
alter table public.profiles add column if not exists personalnummer text;
alter table public.profiles add column if not exists discord       text;

-- Bestehende Mitglieder einmalig einordnen (nur wer noch keinen Rang hat):
-- Admin → Chairman, passender Titel → gleichnamiger Rang,
-- sonstiger Titel → "Sonstiges" mit diesem Namen, ohne Titel → Rechtsanwalt.
update public.profiles p set rang_id = (select id from public.raenge where name = 'Chairman')
 where p.rang_id is null and exists (select 1 from public.admins a where a.user_id = p.user_id);
update public.profiles p set rang_id = r.id
  from public.raenge r
 where p.rang_id is null and p.titel is not null and lower(trim(p.titel)) = lower(r.name);
update public.profiles p set rang_id = (select id from public.raenge where name = 'Sonstiges'), rang_eigen = trim(p.titel)
 where p.rang_id is null and coalesce(trim(p.titel), '') <> '';
update public.profiles p set rang_id = (select id from public.raenge where name = 'Rechtsanwalt')
 where p.rang_id is null;
update public.profiles p set eintritt = (select u.created_at::date from auth.users u where u.id = p.user_id)
 where p.eintritt is null;


-- ---------- Rechte prüfen ----------
create or replace function public.hat_recht(p_recht text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.profiles pr join public.raenge r on r.id = pr.rang_id
     where pr.user_id = auth.uid()
       and pr.status <> 'Ausgeschieden'
       and r.berechtigungen ? p_recht);
$$;
revoke execute on function public.hat_recht(text) from public, anon;
grant  execute on function public.hat_recht(text) to authenticated;

-- Schutz: Rang, Status, Eintritt und Personalnummer darf nur ändern, wer Personal
-- verwaltet – nie bei sich selbst, nie beim Admin, und nur Ränge vergeben, deren
-- Rechte man selbst hat. (Im SQL Editor gibt es keine Anmeldung → keine Prüfung.)
create or replace function public.profil_schutz()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  rechte jsonb;
begin
  if coalesce(current_setting('request.jwt.claims', true), '') = '' or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if not public.hat_recht('personal_verwalten') then
      new.rang_id := null; new.status := 'Aktiv'; new.eintritt := current_date; new.personalnummer := null;
      return new;
    end if;
  elsif new.rang_id is not distinct from old.rang_id and new.status is not distinct from old.status
        and new.eintritt is not distinct from old.eintritt and new.personalnummer is not distinct from old.personalnummer then
    return new;
  end if;

  if not public.hat_recht('personal_verwalten') then
    raise exception 'Keine Berechtigung, Rang oder Status zu ändern';
  end if;
  if new.user_id = auth.uid() then
    raise exception 'Den eigenen Rang oder Status kann nur der Admin ändern';
  end if;
  if exists (select 1 from public.admins a where a.user_id = new.user_id) then
    raise exception 'Beim Admin kann das nur der Admin selbst ändern';
  end if;
  if new.rang_id is not null and (tg_op = 'INSERT' or new.rang_id is distinct from old.rang_id) then
    select berechtigungen into rechte from public.raenge where id = new.rang_id;
    if exists (select 1 from jsonb_array_elements_text(coalesce(rechte, '[]'::jsonb)) e(recht) where not public.hat_recht(e.recht)) then
      raise exception 'Du kannst keinen Rang vergeben, der mehr Rechte hat als du selbst';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profil_schutz on public.profiles;
create trigger profil_schutz before insert or update on public.profiles
  for each row execute function public.profil_schutz();

drop policy if exists "Eigenes Profil anlegen" on public.profiles;
create policy "Eigenes Profil anlegen" on public.profiles
  for insert to authenticated with check (user_id = auth.uid() or public.hat_recht('personal_verwalten'));
drop policy if exists "Eigenes Profil ändern" on public.profiles;
create policy "Eigenes Profil ändern" on public.profiles
  for update to authenticated
  using (user_id = auth.uid() or public.hat_recht('personal_verwalten'))
  with check (user_id = auth.uid() or public.hat_recht('personal_verwalten'));


-- ---------- Ränge: lesen alle, ändern nur der Admin ----------
alter table public.raenge enable row level security;
drop policy if exists "Ränge lesen" on public.raenge;
create policy "Ränge lesen" on public.raenge for select to authenticated using (true);
drop policy if exists "Ränge verwalten (Admin)" on public.raenge;
create policy "Ränge verwalten (Admin)" on public.raenge for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- ---------- Personalakte & Vermerke (vertraulich) ----------
create table if not exists public.personalakte (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  gehalt     numeric,
  notizen    text,
  updated_at timestamptz not null default now()
);

create table if not exists public.personal_vermerke (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  art        text not null default 'Notiz',
  datum      date not null default current_date,
  text       text not null,
  created_at timestamptz not null default now(),
  created_by text default (auth.jwt() ->> 'email')
);
create index if not exists personal_vermerke_user_idx on public.personal_vermerke (user_id);

drop trigger if exists personalakte_updated_at on public.personalakte;
create trigger personalakte_updated_at before update on public.personalakte
  for each row execute function public.setze_updated_at();

alter table public.personalakte      enable row level security;
alter table public.personal_vermerke enable row level security;
do $$
declare t text;
begin
  foreach t in array array['personalakte', 'personal_vermerke'] loop
    execute format('drop policy if exists "Lesen: eigene oder Personal" on public.%I', t);
    execute format('create policy "Lesen: eigene oder Personal" on public.%I for select to authenticated
                    using (user_id = auth.uid() or public.hat_recht(''personal_sehen'') or public.hat_recht(''personal_verwalten''))', t);
    execute format('drop policy if exists "Schreiben: Personal verwalten" on public.%I', t);
    execute format('create policy "Schreiben: Personal verwalten" on public.%I for all to authenticated
                    using (public.hat_recht(''personal_verwalten'') and (user_id <> auth.uid() or public.is_admin()))
                    with check (public.hat_recht(''personal_verwalten'') and (user_id <> auth.uid() or public.is_admin()))', t);
  end loop;
end $$;
-- (Der "for all"-Schreibzugriff schließt Lesen ein – Lesen regelt die erste Regel zusätzlich.)


-- ---------- Bestehende Bereiche an die Rechte binden ----------
-- Akten: lesen/anlegen/ändern alle, löschen nur mit Recht
drop policy if exists "Kanzlei darf alles" on public.akten;
drop policy if exists "Akten lesen" on public.akten;
drop policy if exists "Akten anlegen" on public.akten;
drop policy if exists "Akten ändern" on public.akten;
drop policy if exists "Akten löschen" on public.akten;
create policy "Akten lesen"   on public.akten for select to authenticated using (true);
create policy "Akten anlegen" on public.akten for insert to authenticated with check (true);
create policy "Akten ändern"  on public.akten for update to authenticated using (true) with check (true);
create policy "Akten löschen" on public.akten for delete to authenticated using (public.hat_recht('akten_loeschen'));

-- Rechnungen, Gesetzbuch, Gebührenkatalog: lesen alle, schreiben mit Recht
do $$
declare t text; recht text;
begin
  foreach t in array array['rechnungen', 'gesetze', 'gebuehren'] loop
    recht := case when t = 'rechnungen' then 'rechnungen' else 'gesetzbuch' end;
    execute format('drop policy if exists "Kanzlei darf alles" on public.%I', t);
    execute format('drop policy if exists "Lesen" on public.%I', t);
    execute format('drop policy if exists "Schreiben mit Recht" on public.%I', t);
    execute format('create policy "Lesen" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "Schreiben mit Recht" on public.%I for all to authenticated using (public.hat_recht(%L)) with check (public.hat_recht(%L))', t, recht, recht);
  end loop;
end $$;

-- Kanzlei-Einstellungen
drop policy if exists "Einstellungen ändern (Admin)" on public.einstellungen;
drop policy if exists "Einstellungen ändern" on public.einstellungen;
create policy "Einstellungen ändern" on public.einstellungen
  for update to authenticated using (public.hat_recht('einstellungen')) with check (public.hat_recht('einstellungen'));

-- Buchhaltung
drop policy if exists "Buchungen lesen" on public.buchungen;
create policy "Buchungen lesen" on public.buchungen for select to authenticated using (public.hat_recht('buchhaltung_sehen'));
drop policy if exists "Buchen (Admin)" on public.buchungen;
drop policy if exists "Buchen" on public.buchungen;
create policy "Buchen" on public.buchungen for insert to authenticated with check (public.hat_recht('buchhaltung_buchen'));
drop policy if exists "Konten anlegen (Admin)" on public.konten;
drop policy if exists "Konten anlegen" on public.konten;
create policy "Konten anlegen" on public.konten for insert to authenticated with check (public.hat_recht('buchhaltung_buchen'));
drop policy if exists "Konten umbenennen (Admin)" on public.konten;
drop policy if exists "Konten umbenennen" on public.konten;
create policy "Konten umbenennen" on public.konten for update to authenticated
  using (public.hat_recht('buchhaltung_buchen')) with check (public.hat_recht('buchhaltung_buchen'));


-- ---------- Nutzerverwaltung: mit Recht "Personal verwalten" ----------
drop function if exists public.admin_list_users();
create function public.admin_list_users()
returns table (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, is_admin boolean, gesperrt boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.hat_recht('personal_verwalten') then raise exception 'Keine Berechtigung'; end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at,
           exists (select 1 from public.admins a where a.user_id = u.id),
           coalesce(u.banned_until > now(), false)
      from auth.users u order by u.created_at;
end $$;

create or replace function public.admin_create_user(p_email text, p_password text)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
begin
  if not public.hat_recht('personal_verwalten') then raise exception 'Keine Berechtigung'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Ungültige E-Mail-Adresse'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'Passwort muss mindestens 6 Zeichen haben'; end if;
  if exists (select 1 from auth.users where email = v_email) then raise exception 'Diese E-Mail-Adresse gibt es schon'; end if;

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

create or replace function public.admin_set_password(p_user_id uuid, p_password text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not public.hat_recht('personal_verwalten') then raise exception 'Keine Berechtigung'; end if;
  if not public.is_admin() and exists (select 1 from public.admins where user_id = p_user_id) then
    raise exception 'Das Passwort des Admins kann nur der Admin ändern';
  end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'Passwort muss mindestens 6 Zeichen haben'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
   where id = p_user_id;
end $$;

-- Zugang sperren / entsperren (z. B. bei Ausscheiden)
create or replace function public.personal_sperren(p_user_id uuid, p_gesperrt boolean)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not public.hat_recht('personal_verwalten') then raise exception 'Keine Berechtigung'; end if;
  if p_user_id = auth.uid() then raise exception 'Du kannst dich nicht selbst sperren'; end if;
  if exists (select 1 from public.admins where user_id = p_user_id) then raise exception 'Der Admin kann nicht gesperrt werden'; end if;
  update auth.users set banned_until = case when p_gesperrt then 'infinity'::timestamptz else null end, updated_at = now()
   where id = p_user_id;
end $$;

revoke execute on function public.admin_list_users()             from public, anon;
revoke execute on function public.admin_create_user(text, text)  from public, anon;
revoke execute on function public.admin_set_password(uuid, text) from public, anon;
revoke execute on function public.personal_sperren(uuid, boolean) from public, anon;
grant  execute on function public.admin_list_users()             to authenticated;
grant  execute on function public.admin_create_user(text, text)  to authenticated;
grant  execute on function public.admin_set_password(uuid, text) to authenticated;
grant  execute on function public.personal_sperren(uuid, boolean) to authenticated;
-- admin_delete_user bleibt nur für den Admin (siehe supabase-nutzerverwaltung.sql)


-- ---------- Live-Updates ----------
do $$
declare t text;
begin
  foreach t in array array['raenge', 'personalakte', 'personal_vermerke'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Zur Kontrolle: Wer hat welchen Rang?
select coalesce(p.anzeigename, p.email) as mitglied, r.name as rang, p.rang_eigen as eigener_name
  from public.profiles p left join public.raenge r on r.id = p.rang_id
 order by r.sortierung, mitglied;
