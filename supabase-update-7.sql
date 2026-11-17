-- =============================================================
--  Wiwang Law – Update 7: Zusammenarbeit & Arbeitsabläufe
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 bis 6.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  Neu:
--  - Benachrichtigungen (Glocke): Zuweisungen, @-Erwähnungen,
--    neue Einträge in der eigenen Akte, erledigte Aufgaben, Pinnwand.
--    Sie entstehen nur in der Datenbank selbst (Trigger) und nur
--    für Mitglieder, die den Bereich lesen dürfen.
--  - Pinnwand mit Lesebestätigung
--  - Abläufe: Checklisten-Vorlagen, die auf eine Akte angewendet
--    Aufgaben und Termine anlegen (verwalten: Recht
--    "Kanzlei-Einstellungen bearbeiten")
--  - Arbeit übergeben (Urlaub, Krankheit, Ausscheiden) in einem Schritt
-- =============================================================


-- ---------- Hilfsfunktionen ----------
-- Hat ein (anderes) Mitglied ein Recht? Für Benachrichtigungen.
create or replace function public.nutzer_hat_recht(p_user uuid, p_recht text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = p_user) or exists (
    select 1 from public.profiles pr join public.raenge r on r.id = pr.rang_id
     where pr.user_id = p_user
       and pr.status <> 'Ausgeschieden'
       and (r.berechtigungen ? p_recht
            or (p_recht like '%\_lesen' and r.berechtigungen ? (left(p_recht, length(p_recht) - 6) || '_schreiben'))));
$$;
revoke execute on function public.nutzer_hat_recht(uuid, text) from public, anon, authenticated;

-- Bin ich aktives Mitglied der Kanzlei?
create or replace function public.ist_mitglied()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.profiles where user_id = auth.uid() and status <> 'Ausgeschieden');
$$;
revoke execute on function public.ist_mitglied() from public, anon;
grant  execute on function public.ist_mitglied() to authenticated;

-- Anzeigename eines Mitglieds
create or replace function public.mitglied_name(p_user uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce(nullif(trim(p.anzeigename), ''), split_part(p.email, '@', 1), 'Unbekannt')
    from public.profiles p where p.user_id = p_user;
$$;
revoke execute on function public.mitglied_name(uuid) from public, anon, authenticated;


-- =============================================================
--  Benachrichtigungen
-- =============================================================
create table if not exists public.benachrichtigungen (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,  -- Empfänger
  zeit    timestamptz not null default now(),
  art     text not null,         -- akte, aufgabe, termin, erwaehnung, eintrag, erledigt, pinnwand, uebergabe
  text    text not null,         -- beginnt mit einem Verb: "<Name> hat dir …"
  link    text,                  -- z. B. #/akten/<id>/verlauf
  akte_id uuid references public.akten(id) on delete cascade,
  von     uuid references auth.users(id) on delete set null,
  gelesen boolean not null default false
);
create index if not exists benachrichtigungen_user_idx on public.benachrichtigungen (user_id, zeit desc);

alter table public.benachrichtigungen enable row level security;
drop policy if exists "Lesen" on public.benachrichtigungen;
create policy "Lesen" on public.benachrichtigungen for select to authenticated using (user_id = auth.uid());
drop policy if exists "Ändern" on public.benachrichtigungen;
create policy "Ändern" on public.benachrichtigungen for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Löschen" on public.benachrichtigungen;
create policy "Löschen" on public.benachrichtigungen for delete to authenticated using (user_id = auth.uid());
-- Anlegen: nur die Datenbank selbst (Trigger unten)

-- Eine Benachrichtigung verschicken – nie an sich selbst, nie an Ausgeschiedene,
-- nur wenn der Empfänger den Bereich lesen darf. Während einer Übergabe stumm.
create or replace function public.benachrichtige(p_user uuid, p_art text, p_text text, p_link text, p_akte uuid, p_recht text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if p_user is null or p_user is not distinct from auth.uid() then return; end if;
  if coalesce(current_setting('wiwang.stumm', true), '') = '1' then return; end if;
  if not exists (select 1 from public.profiles where user_id = p_user and status <> 'Ausgeschieden') then return; end if;
  if p_recht is not null and not public.nutzer_hat_recht(p_user, p_recht) then return; end if;
  insert into public.benachrichtigungen (user_id, art, text, link, akte_id, von)
  values (p_user, p_art, left(p_text, 400), p_link, p_akte, auth.uid());
end $$;
revoke execute on function public.benachrichtige(uuid, text, text, text, uuid, text) from public, anon, authenticated;

-- Kurzer Textauszug für Benachrichtigungen
create or replace function public.auszug(p_text text, p_n int default 140)
returns text
language sql immutable set search_path = ''
as $$
  select case when length(t) > p_n then left(t, p_n - 1) || '…' else t end
    from (select trim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g')) as t) x;
$$;


-- ---------- Akte zugewiesen ----------
create or replace function public.benachrichtigung_akte()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.zustaendig_id is not null and (tg_op = 'INSERT' or new.zustaendig_id is distinct from old.zustaendig_id) then
    perform public.benachrichtige(new.zustaendig_id, 'akte',
      'hat dir die Akte ' || coalesce(new.number, '') || ' · ' || public.auszug(new.title, 80) || ' zugewiesen',
      '#/akten/' || new.id, new.id, 'akten_lesen');
  end if;
  return null;
end $$;

drop trigger if exists benachrichtigung on public.akten;
create trigger benachrichtigung after insert or update of zustaendig_id on public.akten
  for each row execute function public.benachrichtigung_akte();


-- ---------- Aufgabe zugewiesen / erledigt ----------
create or replace function public.benachrichtigung_aufgabe()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_link text := case when new.akte_id is not null then '#/akten/' || new.akte_id || '/aufgaben' else '#/kalender' end;
  v_ersteller uuid;
begin
  if new.zustaendig is not null and not new.erledigt
     and (tg_op = 'INSERT' or new.zustaendig is distinct from old.zustaendig) then
    perform public.benachrichtige(new.zustaendig, 'aufgabe',
      'hat dir eine Aufgabe gegeben: ' || public.auszug(new.text)
        || case when new.faellig is not null then ' (fällig ' || to_char(new.faellig, 'DD.MM.') || ')' else '' end,
      v_link, new.akte_id, 'termine_lesen');
  end if;
  if tg_op = 'UPDATE' and new.erledigt and not old.erledigt and new.created_by is not null then
    select u.id into v_ersteller from auth.users u where lower(u.email) = lower(new.created_by);
    perform public.benachrichtige(v_ersteller, 'erledigt',
      'hat deine Aufgabe erledigt: ' || public.auszug(new.text), v_link, new.akte_id, 'termine_lesen');
  end if;
  return null;
end $$;

drop trigger if exists benachrichtigung on public.aufgaben;
create trigger benachrichtigung after insert or update on public.aufgaben
  for each row execute function public.benachrichtigung_aufgabe();


-- ---------- Termin zugewiesen / verschoben ----------
create or replace function public.benachrichtigung_termin()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_link text := case when new.akte_id is not null then '#/akten/' || new.akte_id || '/termine' else '#/kalender' end;
  v_wann text := to_char(new.beginn at time zone 'Europe/Berlin', 'DD.MM.YYYY, HH24:MI') || ' Uhr';
begin
  if new.verantwortlich is null or new.erledigt then return null; end if;
  if tg_op = 'INSERT' or new.verantwortlich is distinct from old.verantwortlich then
    perform public.benachrichtige(new.verantwortlich, 'termin',
      'hat dich für einen Termin eingetragen: ' || public.auszug(new.titel, 80) || ' (' || new.art || ') – ' || v_wann,
      v_link, new.akte_id, 'termine_lesen');
  elsif new.beginn is distinct from old.beginn then
    perform public.benachrichtige(new.verantwortlich, 'termin',
      'hat deinen Termin verschoben: ' || public.auszug(new.titel, 80) || ' – jetzt ' || v_wann,
      v_link, new.akte_id, 'termine_lesen');
  end if;
  return null;
end $$;

drop trigger if exists benachrichtigung on public.termine;
create trigger benachrichtigung after insert or update on public.termine
  for each row execute function public.benachrichtigung_termin();


-- ---------- Verlauf: @-Erwähnungen und Einträge in der eigenen Akte ----------
alter table public.eintraege add column if not exists erwaehnt uuid[] not null default '{}';

create or replace function public.benachrichtigung_eintrag()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_akte public.akten%rowtype;
  v_neu  uuid[];
  v_user uuid;
  v_link text := '#/akten/' || new.akte_id || '/verlauf';
begin
  select * into v_akte from public.akten where id = new.akte_id;
  v_neu := array(select distinct x from unnest(new.erwaehnt) as x
                  where tg_op = 'INSERT' or not (x = any (old.erwaehnt)));
  foreach v_user in array v_neu loop
    perform public.benachrichtige(v_user, 'erwaehnung',
      'hat dich in ' || coalesce(v_akte.number, 'einer Akte') || ' erwähnt: „' || public.auszug(new.text) || '“',
      v_link, new.akte_id, 'akten_lesen');
  end loop;
  if tg_op = 'INSERT' and v_akte.zustaendig_id is not null and not (v_akte.zustaendig_id = any (v_neu)) then
    perform public.benachrichtige(v_akte.zustaendig_id, 'eintrag',
      'hat in deiner Akte ' || coalesce(v_akte.number, '') || ' eingetragen (' || coalesce(new.art, 'Notiz') || '): „'
        || public.auszug(new.text) || '“',
      v_link, new.akte_id, 'akten_lesen');
  end if;
  return null;
end $$;

drop trigger if exists benachrichtigung on public.eintraege;
create trigger benachrichtigung after insert or update of erwaehnt on public.eintraege
  for each row execute function public.benachrichtigung_eintrag();


-- =============================================================
--  Pinnwand
-- =============================================================
create table if not exists public.pinnwand (
  id          uuid primary key default gen_random_uuid(),
  titel       text not null,
  text        text,
  wichtig     boolean not null default false,
  angeheftet  boolean not null default false,
  bestaetigen boolean not null default false,  -- Lesebestätigung erbeten
  bis         date,                            -- danach nur noch im Archiv
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

create table if not exists public.pinnwand_gelesen (
  id         uuid primary key default gen_random_uuid(),
  beitrag_id uuid not null references public.pinnwand(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  zeit       timestamptz not null default now(),
  unique (beitrag_id, user_id)
);

drop trigger if exists pinnwand_updated_at on public.pinnwand;
create trigger pinnwand_updated_at before update on public.pinnwand
  for each row execute function public.setze_updated_at();

alter table public.pinnwand         enable row level security;
alter table public.pinnwand_gelesen enable row level security;

drop policy if exists "Lesen" on public.pinnwand;
create policy "Lesen" on public.pinnwand for select to authenticated using (true);
drop policy if exists "Anlegen" on public.pinnwand;
create policy "Anlegen" on public.pinnwand for insert to authenticated
  with check (created_by = auth.uid() and public.ist_mitglied());
drop policy if exists "Ändern" on public.pinnwand;
create policy "Ändern" on public.pinnwand for update to authenticated
  using (created_by = auth.uid() or public.hat_recht('einstellungen_schreiben'))
  with check (created_by = auth.uid() or public.hat_recht('einstellungen_schreiben'));
drop policy if exists "Löschen" on public.pinnwand;
create policy "Löschen" on public.pinnwand for delete to authenticated
  using (created_by = auth.uid() or public.hat_recht('einstellungen_schreiben'));

drop policy if exists "Lesen" on public.pinnwand_gelesen;
create policy "Lesen" on public.pinnwand_gelesen for select to authenticated using (true);
drop policy if exists "Bestätigen" on public.pinnwand_gelesen;
create policy "Bestätigen" on public.pinnwand_gelesen for insert to authenticated
  with check (user_id = auth.uid() and public.ist_mitglied());
drop policy if exists "Zurücknehmen" on public.pinnwand_gelesen;
create policy "Zurücknehmen" on public.pinnwand_gelesen for delete to authenticated using (user_id = auth.uid());

-- Neuer Beitrag → alle aktiven Mitglieder benachrichtigen
create or replace function public.benachrichtigung_pinnwand()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
begin
  for v_user in select user_id from public.profiles where status <> 'Ausgeschieden' loop
    perform public.benachrichtige(v_user, 'pinnwand',
      'hat an die Pinnwand gehängt: ' || case when new.wichtig then 'Wichtig – ' else '' end || public.auszug(new.titel, 100)
        || case when new.bestaetigen then ' (bitte bestätigen)' else '' end,
      '#/pinnwand', null, null);
  end loop;
  return null;
end $$;

drop trigger if exists benachrichtigung on public.pinnwand;
create trigger benachrichtigung after insert on public.pinnwand
  for each row execute function public.benachrichtigung_pinnwand();


-- =============================================================
--  Abläufe (Checklisten-Vorlagen)
--  schritte: [{ "text": "...", "tage": 1, "termin": "Frist" | null }]
--  Ohne "termin" wird eine Aufgabe angelegt (fällig nach "tage"),
--  mit "termin" ein Termin dieser Art (um 10 Uhr nach "tage").
-- =============================================================
create table if not exists public.ablaeufe (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  beschreibung text,
  rechtsgebiet text,
  mandatsart   text,
  schritte     jsonb not null default '[]'::jsonb,
  sortierung   int not null default 100,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists ablaeufe_updated_at on public.ablaeufe;
create trigger ablaeufe_updated_at before update on public.ablaeufe
  for each row execute function public.setze_updated_at();

alter table public.ablaeufe enable row level security;
drop policy if exists "Lesen" on public.ablaeufe;
create policy "Lesen" on public.ablaeufe for select to authenticated using (true);
drop policy if exists "Anlegen" on public.ablaeufe;
create policy "Anlegen" on public.ablaeufe for insert to authenticated with check (public.hat_recht('einstellungen_schreiben'));
drop policy if exists "Ändern" on public.ablaeufe;
create policy "Ändern" on public.ablaeufe for update to authenticated
  using (public.hat_recht('einstellungen_schreiben')) with check (public.hat_recht('einstellungen_schreiben'));
drop policy if exists "Löschen" on public.ablaeufe;
create policy "Löschen" on public.ablaeufe for delete to authenticated using (public.hat_recht('einstellungen_schreiben'));

-- Beispiel-Abläufe (nur einmal; danach frei änderbar oder löschbar)
do $$
begin
  if coalesce((select daten ->> 'ablaeufe_vorlagen' from public.einstellungen where id = 1), '') <> 'ja' then
    insert into public.ablaeufe (name, beschreibung, rechtsgebiet, mandatsart, sortierung, schritte) values
    ('Strafverteidigung', 'Die ersten Schritte einer neuen Verteidigung.', 'Strafrecht', 'Verteidigung', 10, '[
      {"text": "Mandantengespräch führen und Sachverhalt aufnehmen", "tage": 0},
      {"text": "Vollmacht und Mandatsvertrag unterschreiben lassen", "tage": 0},
      {"text": "Akteneinsicht bei der Staatsanwaltschaft beantragen", "tage": 1},
      {"text": "Beweise sichern: Bodycam, Dashcam, Zeugen", "tage": 1},
      {"text": "Tatvorwürfe und Strafrahmen prüfen", "tage": 3},
      {"text": "Verteidigungsstrategie mit dem Mandanten abstimmen", "tage": 5},
      {"text": "Stand der Akte prüfen", "tage": 7, "termin": "Wiedervorlage"}]'::jsonb),
    ('Haftprüfung', 'Mandant sitzt in (Untersuchungs-)Haft.', 'Strafrecht', 'Haftprüfung', 20, '[
      {"text": "Mandanten in der Haft aufsuchen", "tage": 0},
      {"text": "Antrag auf Haftprüfung stellen", "tage": 0},
      {"text": "Entlastendes sammeln: Wohnsitz, Arbeit, Familie, Vorstrafen", "tage": 0},
      {"text": "Haftprüfungstermin", "tage": 1, "termin": "Haftprüfung"}]'::jsonb),
    ('Zivilklage', 'Ansprüche für den Mandanten durchsetzen.', 'Zivilrecht', 'Vertretung Kläger/in', 30, '[
      {"text": "Sachverhalt und Ansprüche aufnehmen", "tage": 0},
      {"text": "Belege und Beweise sammeln", "tage": 1},
      {"text": "Gegenseite außergerichtlich anschreiben (Frist setzen)", "tage": 2},
      {"text": "Antwort der Gegenseite", "tage": 9, "termin": "Frist"},
      {"text": "Klageschrift vorbereiten", "tage": 10}]'::jsonb),
    ('Mandat abschließen', 'Wenn der Fall entschieden ist.', null, null, 90, '[
      {"text": "Ergebnis in der Akte eintragen", "tage": 0},
      {"text": "Mandanten über das Ergebnis informieren", "tage": 0},
      {"text": "Schlussrechnung stellen", "tage": 1},
      {"text": "Zahlungseingang prüfen", "tage": 8}]'::jsonb);
    update public.einstellungen set daten = daten || '{"ablaeufe_vorlagen":"ja"}'::jsonb where id = 1;
  end if;
end $$;


-- Ablauf auf eine Akte anwenden: legt die gewählten Schritte als Aufgaben bzw.
-- Termine an, vermerkt das im Verlauf und schickt EINE Benachrichtigung.
create or replace function public.ablauf_starten(p_akte uuid, p_name text, p_schritte jsonb, p_zustaendig uuid, p_start date)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_akte public.akten%rowtype;
  n_aufgaben int := 0; n_termine int := 0;
  v_name text := public.auszug(coalesce(nullif(trim(p_name), ''), 'Ablauf'), 80);
  v_start date := coalesce(p_start, current_date);
  v_teile text[] := '{}';
begin
  if not public.hat_recht('termine_schreiben') then
    raise exception 'Dir fehlt das Recht, Termine & Aufgaben anzulegen';
  end if;
  select * into v_akte from public.akten where id = p_akte;
  if not found or not public.hat_recht('akten_lesen') then raise exception 'Akte nicht gefunden'; end if;
  if jsonb_typeof(p_schritte) <> 'array' or jsonb_array_length(p_schritte) = 0 then
    raise exception 'Keine Schritte ausgewählt';
  end if;
  if jsonb_array_length(p_schritte) > 60 then raise exception 'Höchstens 60 Schritte auf einmal'; end if;

  perform set_config('wiwang.stumm', '1', true);

  with s as (
    select left(trim(e ->> 'text'), 500) as text,
           nullif(trim(e ->> 'termin'), '') as termin,
           least(greatest(coalesce(nullif(regexp_replace(e ->> 'tage', '[^0-9]', '', 'g'), '')::int, 0), 0), 365) as tage
      from jsonb_array_elements(p_schritte) as e
     where coalesce(trim(e ->> 'text'), '') <> ''
  ), a as (
    insert into public.aufgaben (akte_id, text, zustaendig, faellig)
    select p_akte, s.text, p_zustaendig, v_start + s.tage from s where s.termin is null
    returning 1
  ), t as (
    insert into public.termine (akte_id, titel, art, beginn, verantwortlich, notiz)
    select p_akte, s.text, s.termin, ((v_start + s.tage) + time '10:00') at time zone 'Europe/Berlin', p_zustaendig,
           'Aus dem Ablauf „' || v_name || '“'
      from s where s.termin is not null
    returning 1
  )
  select (select count(*) from a), (select count(*) from t) into n_aufgaben, n_termine;

  if n_aufgaben > 0 then v_teile := v_teile || (n_aufgaben || case when n_aufgaben = 1 then ' Aufgabe' else ' Aufgaben' end); end if;
  if n_termine > 0 then v_teile := v_teile || (n_termine || case when n_termine = 1 then ' Termin' else ' Termine' end); end if;

  if public.hat_recht('akten_schreiben') then
    insert into public.eintraege (akte_id, art, text)
    values (p_akte, 'Intern', 'Ablauf „' || v_name || '“ gestartet: ' || array_to_string(v_teile, ', ')
                               || coalesce(' für ' || public.mitglied_name(p_zustaendig), ''));
  end if;

  perform set_config('wiwang.stumm', '0', true);
  perform public.benachrichtige(p_zustaendig, 'aufgabe',
    'hat in ' || coalesce(v_akte.number, 'einer Akte') || ' den Ablauf „' || v_name || '“ für dich gestartet: '
      || array_to_string(v_teile, ', '),
    '#/akten/' || p_akte || '/aufgaben', p_akte, 'termine_lesen');

  return jsonb_build_object('aufgaben', n_aufgaben, 'termine', n_termine);
end $$;
revoke execute on function public.ablauf_starten(uuid, text, jsonb, uuid, date) from public, anon;
grant  execute on function public.ablauf_starten(uuid, text, jsonb, uuid, date) to authenticated;


-- =============================================================
--  Arbeit übergeben (z. B. bei Urlaub, Krankheit, Ausscheiden)
--  Verschiebt aktive Akten, offene Aufgaben und offene Termine von
--  einem Mitglied zum anderen, vermerkt die Übergabe im Verlauf
--  jeder Akte und schickt eine zusammenfassende Benachrichtigung.
-- =============================================================
create or replace function public.arbeit_uebergeben(p_von uuid, p_an uuid, p_akten boolean, p_aufgaben boolean,
                                                    p_termine boolean, p_notiz text default null)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  n_akten int := 0; n_aufgaben int := 0; n_termine int := 0;
  v_von text := public.mitglied_name(p_von);
  v_an  text := public.mitglied_name(p_an);
  v_teile text[] := '{}';
begin
  if p_von is null or p_an is null or p_von = p_an then
    raise exception 'Bitte zwei verschiedene Mitglieder wählen';
  end if;
  if not exists (select 1 from public.profiles where user_id = p_an and status <> 'Ausgeschieden') then
    raise exception '% ist nicht aktiv und kann nichts übernehmen', v_an;
  end if;
  if p_akten and not public.hat_recht('akten_schreiben') then
    raise exception 'Dir fehlt das Recht, Akten zu bearbeiten';
  end if;
  if (p_aufgaben or p_termine) and not public.hat_recht('termine_schreiben') then
    raise exception 'Dir fehlt das Recht, Termine & Aufgaben zu bearbeiten';
  end if;

  perform set_config('wiwang.stumm', '1', true);  -- keine Einzel-Benachrichtigungen

  if p_akten then
    with x as (
      update public.akten set zustaendig_id = p_an
       where zustaendig_id = p_von and status <> 'Geschlossen'
      returning id)
    insert into public.eintraege (akte_id, art, text)
    select id, 'Intern', 'Übergabe: ' || v_von || ' → ' || v_an
                         || coalesce(E'\n' || nullif(trim(p_notiz), ''), '')
      from x;
    get diagnostics n_akten = row_count;
  end if;
  if p_aufgaben then
    update public.aufgaben set zustaendig = p_an where zustaendig = p_von and not erledigt;
    get diagnostics n_aufgaben = row_count;
  end if;
  if p_termine then
    update public.termine set verantwortlich = p_an where verantwortlich = p_von and not erledigt;
    get diagnostics n_termine = row_count;
  end if;

  perform set_config('wiwang.stumm', '0', true);

  if n_akten > 0 then v_teile := v_teile || (n_akten || case when n_akten = 1 then ' Akte' else ' Akten' end); end if;
  if n_aufgaben > 0 then v_teile := v_teile || (n_aufgaben || case when n_aufgaben = 1 then ' Aufgabe' else ' Aufgaben' end); end if;
  if n_termine > 0 then v_teile := v_teile || (n_termine || case when n_termine = 1 then ' Termin' else ' Termine' end); end if;

  if cardinality(v_teile) > 0 then
    perform public.benachrichtige(p_an, 'uebergabe',
      'hat dir die Arbeit von ' || v_von || ' übergeben: ' || array_to_string(v_teile, ', ')
        || coalesce(' – „' || public.auszug(nullif(trim(p_notiz), ''), 160) || '“', ''),
      '#/', null, null);
    perform public.benachrichtige(p_von, 'uebergabe',
      'hat deine Arbeit an ' || v_an || ' übergeben: ' || array_to_string(v_teile, ', '),
      '#/team/' || p_an, null, null);
  end if;

  return jsonb_build_object('akten', n_akten, 'aufgaben', n_aufgaben, 'termine', n_termine);
end $$;
revoke execute on function public.arbeit_uebergeben(uuid, uuid, boolean, boolean, boolean, text) from public, anon;
grant  execute on function public.arbeit_uebergeben(uuid, uuid, boolean, boolean, boolean, text) to authenticated;


-- ---------- Schneller suchen ----------
create index if not exists aufgaben_zustaendig_idx     on public.aufgaben (zustaendig) where not erledigt;
create index if not exists termine_verantwortlich_idx  on public.termine (verantwortlich) where not erledigt;
create index if not exists akten_zustaendig_idx        on public.akten (zustaendig_id);
create index if not exists pinnwand_gelesen_beitrag_idx on public.pinnwand_gelesen (beitrag_id);


-- ---------- Live-Updates ----------
do $$
declare t text;
begin
  foreach t in array array['benachrichtigungen', 'pinnwand', 'pinnwand_gelesen', 'ablaeufe'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;


-- Zur Kontrolle
select (select count(*) from public.ablaeufe) as ablaeufe,
       (select count(*) from public.pinnwand) as pinnwand_beitraege,
       (select count(*) from public.benachrichtigungen) as benachrichtigungen;
