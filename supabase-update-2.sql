-- =============================================================
--  Wiwang Law – Update 2: Großes Aktensystem
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: supabase.sql wurde schon
--  ausgeführt. Kann gefahrlos mehrfach ausgeführt werden.
--
--  Neu: Mandantenkartei, Beteiligte, Beweismittel, Termine,
--  Aufgaben, Rechnungen, Gebührenkatalog, Gesetzbuch, Profile,
--  Kanzlei-Einstellungen und ein automatisches Änderungsprotokoll.
-- =============================================================


-- ---------- Admin (falls die Nutzerverwaltung noch fehlt) ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;

insert into public.admins (user_id)
select id from auth.users
 where not exists (select 1 from public.admins)
 order by created_at
 limit 1;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;


-- ---------- Hilfsfunktion: "zuletzt geändert" automatisch setzen ----------
create or replace function public.setze_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;


-- =============================================================
--  Profile (Anzeigename, Titel, Telefon jedes Mitglieds)
-- =============================================================
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       text,
  anzeigename text,
  titel       text,
  telefon     text,
  created_at  timestamptz not null default now()
);

-- Die E-Mail im Profil kommt immer aus dem Login (kann nicht gefälscht werden)
create or replace function public.profil_email()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.email := (select u.email from auth.users u where u.id = new.user_id);
  return new;
end $$;

drop trigger if exists profil_email on public.profiles;
create trigger profil_email
  before insert or update on public.profiles
  for each row execute function public.profil_email();

-- Für jeden neuen Login automatisch ein Profil anlegen
create or replace function public.neuer_nutzer_profil()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists neuer_nutzer_profil on auth.users;
create trigger neuer_nutzer_profil
  after insert on auth.users
  for each row execute function public.neuer_nutzer_profil();

-- Profile für alle bestehenden Nutzer
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
drop policy if exists "Profile lesen" on public.profiles;
create policy "Profile lesen" on public.profiles
  for select to authenticated using (true);
drop policy if exists "Eigenes Profil anlegen" on public.profiles;
create policy "Eigenes Profil anlegen" on public.profiles
  for insert to authenticated with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "Eigenes Profil ändern" on public.profiles;
create policy "Eigenes Profil ändern" on public.profiles
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());


-- =============================================================
--  Mandantenkartei
-- =============================================================
create table if not exists public.mandanten (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  telefon      text,
  discord      text,
  geburtsdatum text,
  adresse      text,
  markierungen jsonb not null default '[]'::jsonb,
  notizen      text,
  created_at   timestamptz not null default now(),
  created_by   text default (auth.jwt() ->> 'email'),
  updated_at   timestamptz not null default now()
);


-- =============================================================
--  Akten: neue Felder
-- =============================================================
alter table public.akten add column if not exists mandant_id       uuid references public.mandanten(id) on delete set null;
alter table public.akten add column if not exists typ              text;
alter table public.akten add column if not exists prioritaet       text not null default 'Normal';
alter table public.akten add column if not exists zustaendig_id    uuid references auth.users(id) on delete set null;
alter table public.akten add column if not exists az_extern        text;
alter table public.akten add column if not exists vorwuerfe        jsonb not null default '[]'::jsonb;
alter table public.akten add column if not exists in_haft          boolean not null default false;
alter table public.akten add column if not exists haft_bis         timestamptz;
alter table public.akten add column if not exists ergebnis         text;
alter table public.akten add column if not exists ergebnis_details text;
alter table public.akten add column if not exists ergebnis_datum   date;
alter table public.akten add column if not exists updated_at       timestamptz not null default now();

-- Bestehende Akten: Mandanten automatisch in die Kartei übernehmen
insert into public.mandanten (name, created_at, created_by)
select distinct on (lower(trim(a.client))) trim(a.client), a.created_at, a.created_by
  from public.akten a
 where a.mandant_id is null
   and coalesce(trim(a.client), '') <> ''
   and not exists (select 1 from public.mandanten m where lower(trim(m.name)) = lower(trim(a.client)))
 order by lower(trim(a.client)),
          (trim(a.client) = lower(trim(a.client))),  -- Schreibweise mit Großbuchstaben bevorzugen
          a.created_at;

update public.akten a
   set mandant_id = m.id
  from public.mandanten m
 where a.mandant_id is null
   and lower(trim(m.name)) = lower(trim(a.client));

-- Verlaufseinträge: Art (Notiz, Telefonat, ...) und "wichtig"
alter table public.eintraege add column if not exists art     text not null default 'Notiz';
alter table public.eintraege add column if not exists wichtig boolean not null default false;


-- =============================================================
--  Beteiligte, Beweismittel, Termine, Aufgaben
-- =============================================================
create table if not exists public.beteiligte (
  id         uuid primary key default gen_random_uuid(),
  akte_id    uuid not null references public.akten(id) on delete cascade,
  rolle      text not null default 'Zeuge',
  name       text not null,
  kontakt    text,
  notiz      text,
  created_at timestamptz not null default now(),
  created_by text default (auth.jwt() ->> 'email')
);

create table if not exists public.beweise (
  id           uuid primary key default gen_random_uuid(),
  akte_id      uuid not null references public.akten(id) on delete cascade,
  art          text not null default 'Foto',
  titel        text not null,
  link         text,
  beschreibung text,
  created_at   timestamptz not null default now(),
  created_by   text default (auth.jwt() ->> 'email')
);

create table if not exists public.termine (
  id             uuid primary key default gen_random_uuid(),
  akte_id        uuid references public.akten(id) on delete cascade,
  titel          text not null,
  art            text not null default 'Termin',
  beginn         timestamptz not null,
  ort            text,
  notiz          text,
  verantwortlich uuid references auth.users(id) on delete set null,
  erledigt       boolean not null default false,
  created_at     timestamptz not null default now(),
  created_by     text default (auth.jwt() ->> 'email')
);

create table if not exists public.aufgaben (
  id          uuid primary key default gen_random_uuid(),
  akte_id     uuid references public.akten(id) on delete cascade,
  text        text not null,
  zustaendig  uuid references auth.users(id) on delete set null,
  faellig     date,
  erledigt    boolean not null default false,
  erledigt_am timestamptz,
  created_at  timestamptz not null default now(),
  created_by  text default (auth.jwt() ->> 'email')
);


-- =============================================================
--  Rechnungen und Gebührenkatalog
-- =============================================================
create table if not exists public.rechnungen (
  id            uuid primary key default gen_random_uuid(),
  nummer        text unique,
  akte_id       uuid references public.akten(id) on delete set null,
  mandant_id    uuid references public.mandanten(id) on delete set null,
  empfaenger    text not null,
  betreff       text,
  datum         date not null default current_date,
  positionen    jsonb not null default '[]'::jsonb,
  summe         numeric not null default 0,
  status        text not null default 'Offen',
  bezahlt_am    date,
  unterzeichner uuid references auth.users(id) on delete set null,
  notiz         text,
  created_at    timestamptz not null default now(),
  created_by    text default (auth.jwt() ->> 'email'),
  updated_at    timestamptz not null default now()
);

-- Rechnungsnummer automatisch vergeben (R-2026-001, R-2026-002, ...)
create or replace function public.set_rechnungsnummer()
returns trigger language plpgsql as $$
declare
  prefix text := 'R-' || to_char(now(), 'YYYY') || '-';
  n int;
begin
  if new.nummer is not null and new.nummer <> '' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('wiwang_rechnungsnummer'));
  select coalesce(max(substring(nummer from length(prefix) + 1)::int), 0) + 1
    into n
    from public.rechnungen
   where nummer ~ ('^' || prefix || '[0-9]+$');
  new.nummer := prefix || lpad(n::text, 3, '0');
  return new;
end $$;

drop trigger if exists rechnungen_nummer on public.rechnungen;
create trigger rechnungen_nummer
  before insert on public.rechnungen
  for each row execute function public.set_rechnungsnummer();

create table if not exists public.gebuehren (
  id          uuid primary key default gen_random_uuid(),
  bezeichnung text not null,
  preis       numeric not null default 0,
  created_at  timestamptz not null default now()
);


-- =============================================================
--  Gesetzbuch (für Tatvorwürfe und Strafrechner)
-- =============================================================
create table if not exists public.gesetze (
  id         uuid primary key default gen_random_uuid(),
  paragraph  text,
  titel      text not null,
  kategorie  text,
  geldstrafe numeric,
  haft       numeric,
  bemerkung  text,
  created_at timestamptz not null default now(),
  created_by text default (auth.jwt() ->> 'email')
);


-- =============================================================
--  Kanzlei-Einstellungen (nur der Admin darf sie ändern)
-- =============================================================
create table if not exists public.einstellungen (
  id         int primary key default 1 check (id = 1),
  daten      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.einstellungen (id) values (1) on conflict (id) do nothing;

alter table public.einstellungen enable row level security;
drop policy if exists "Einstellungen lesen" on public.einstellungen;
create policy "Einstellungen lesen" on public.einstellungen
  for select to authenticated using (true);
drop policy if exists "Einstellungen ändern (Admin)" on public.einstellungen;
create policy "Einstellungen ändern (Admin)" on public.einstellungen
  for update to authenticated using (public.is_admin()) with check (public.is_admin());


-- =============================================================
--  "Zuletzt geändert" automatisch pflegen
-- =============================================================
drop trigger if exists akten_updated_at on public.akten;
create trigger akten_updated_at before update on public.akten
  for each row execute function public.setze_updated_at();
drop trigger if exists mandanten_updated_at on public.mandanten;
create trigger mandanten_updated_at before update on public.mandanten
  for each row execute function public.setze_updated_at();
drop trigger if exists rechnungen_updated_at on public.rechnungen;
create trigger rechnungen_updated_at before update on public.rechnungen
  for each row execute function public.setze_updated_at();
drop trigger if exists einstellungen_updated_at on public.einstellungen;
create trigger einstellungen_updated_at before update on public.einstellungen
  for each row execute function public.setze_updated_at();


-- =============================================================
--  Zugriff: alle angemeldeten Kanzlei-Mitglieder
-- =============================================================
do $$
declare t text;
begin
  foreach t in array array['mandanten', 'beteiligte', 'beweise', 'termine', 'aufgaben',
                           'rechnungen', 'gebuehren', 'gesetze']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Kanzlei darf alles" on public.%I', t);
    execute format('create policy "Kanzlei darf alles" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

create index if not exists akten_mandant_idx      on public.akten (mandant_id);
create index if not exists eintraege_akte_idx     on public.eintraege (akte_id);
create index if not exists beteiligte_akte_idx    on public.beteiligte (akte_id);
create index if not exists beweise_akte_idx       on public.beweise (akte_id);
create index if not exists termine_akte_idx       on public.termine (akte_id);
create index if not exists termine_beginn_idx     on public.termine (beginn);
create index if not exists aufgaben_akte_idx      on public.aufgaben (akte_id);
create index if not exists rechnungen_akte_idx    on public.rechnungen (akte_id);
create index if not exists rechnungen_mandant_idx on public.rechnungen (mandant_id);


-- =============================================================
--  Änderungsprotokoll: Wer hat wann was geändert?
--  Wird automatisch von der Datenbank geschrieben, niemand kann
--  Einträge fälschen oder löschen.
-- =============================================================
create table if not exists public.protokoll (
  id          bigserial primary key,
  zeit        timestamptz not null default now(),
  benutzer    text default (auth.jwt() ->> 'email'),
  tabelle     text not null,
  aktion      text not null,
  datensatz   uuid,
  akte_id     uuid,
  info        text,
  aenderungen jsonb
);
create index if not exists protokoll_akte_idx on public.protokoll (akte_id, zeit desc);
create index if not exists protokoll_zeit_idx on public.protokoll (zeit desc);

alter table public.protokoll enable row level security;
drop policy if exists "Protokoll lesen" on public.protokoll;
create policy "Protokoll lesen" on public.protokoll
  for select to authenticated using (true);

create or replace function public.protokolliere()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  j     jsonb;
  o     jsonb;
  diff  jsonb := '{}'::jsonb;
  k     text;
  akte  uuid;
  info  text;
begin
  if tg_op = 'DELETE' then j := to_jsonb(old); else j := to_jsonb(new); end if;

  if tg_op = 'UPDATE' then
    o := to_jsonb(old);
    for k in select jsonb_object_keys(j) loop
      if k <> 'updated_at' and (j -> k) is distinct from (o -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_array(left(o ->> k, 160), left(j ->> k, 160)));
      end if;
    end loop;
    if diff = '{}'::jsonb then
      return null;
    end if;
  end if;

  if tg_table_name = 'akten' then
    akte := (j ->> 'id')::uuid;
  else
    akte := nullif(j ->> 'akte_id', '')::uuid;
  end if;

  info := left(case tg_table_name
    when 'akten'      then concat_ws(' – ', j ->> 'number', j ->> 'title')
    when 'rechnungen' then concat_ws(' – ', j ->> 'nummer', j ->> 'empfaenger')
    when 'beteiligte' then concat_ws(': ', j ->> 'rolle', j ->> 'name')
    else coalesce(j ->> 'titel', j ->> 'name', j ->> 'text')
  end, 160);

  insert into public.protokoll (tabelle, aktion, datensatz, akte_id, info, aenderungen)
  values (tg_table_name, tg_op, (j ->> 'id')::uuid, akte, info,
          case when tg_op = 'UPDATE' then diff end);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['akten', 'eintraege', 'mandanten', 'beteiligte', 'beweise',
                           'termine', 'aufgaben', 'rechnungen']
  loop
    execute format('drop trigger if exists protokoll on public.%I', t);
    execute format('create trigger protokoll after insert or update or delete on public.%I
                    for each row execute function public.protokolliere()', t);
  end loop;
end $$;


-- =============================================================
--  Live-Aktualisierung für alle neuen Tabellen
-- =============================================================
do $$
declare t text;
begin
  foreach t in array array['profiles', 'mandanten', 'beteiligte', 'beweise', 'termine', 'aufgaben',
                           'rechnungen', 'gebuehren', 'gesetze', 'einstellungen', 'protokoll',
                           'akten', 'eintraege']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;


-- Zur Kontrolle: Wie viele Mandanten wurden aus bestehenden Akten übernommen?
select (select count(*) from public.mandanten) as mandanten,
       (select count(*) from public.akten)     as akten,
       (select count(*) from public.profiles)  as profile;
