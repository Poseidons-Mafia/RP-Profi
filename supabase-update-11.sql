-- =============================================================
--  Wiwang Law – Update 11: Discord-Login & mehrere Charaktere
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 bis 10.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  Idee:
--  • Eine PERSON meldet sich mit Discord an (eigenes Login-Konto, ohne
--    Profil – sie sieht selbst keine Kanzleidaten).
--  • Jeder CHARAKTER ist ein eigenes Konto mit Profil, Rang und Rechten –
--    genau wie die bisherigen Mitglieder. Bestehende Konten sind damit
--    automatisch Charaktere; alle bisherigen Regeln gelten unverändert.
--  • Eine Person kann mehrere Charaktere haben und zwischen ihnen wechseln.
--    Beim Wechsel prüft die Datenbank, dass der Charakter zur Person gehört
--    und freigegeben ist, und gibt einen Einmal-Zugang aus.
--  • Registrierung und jeder weitere Charakter müssen von einem Admin
--    freigegeben werden. Admin-Rechte hängen an der Person.
--  • Bestehende Mitglieder übernehmen ihren Charakter einmalig mit den
--    alten Zugangsdaten (gilt als freigegeben).
--
--  Zusätzlich nötig (siehe README, Abschnitt "Discord-Login einrichten"):
--  Discord-Anbieter, Hook "Before User Created" → public.registrierung_pruefen,
--  Registrierung erlauben, Edge Function "discord-pruefung".
-- =============================================================

-- ---------- Tabellen ----------
create table if not exists public.personen (
  user_id             uuid primary key references auth.users(id) on delete cascade, -- Discord-Login-Konto
  discord_id          text unique,
  discord_name        text,          -- Anzeigename in Discord
  discord_benutzer    text,          -- Benutzername (@name)
  avatar_url          text,
  status              text not null default 'wartet'
                      check (status in ('wartet', 'frei', 'abgelehnt', 'gesperrt')),
  ist_admin           boolean not null default false,
  server_mitglied     boolean not null default false,
  server_geprueft_am  timestamptz,
  fehlversuche        integer not null default 0,  -- Übernahme alter Zugangsdaten
  fehlversuch_am      timestamptz,
  created_at          timestamptz not null default now(),
  freigegeben_am      timestamptz,
  freigegeben_von     uuid
);

create table if not exists public.charaktere (
  id               uuid primary key default gen_random_uuid(),
  person_id        uuid not null references public.personen(user_id) on delete cascade,
  user_id          uuid unique references auth.users(id) on delete cascade, -- Konto (erst ab Freigabe)
  name             text not null,
  status           text not null default 'wartet'
                   check (status in ('wartet', 'frei', 'abgelehnt', 'gesperrt')),
  uebernommen      boolean not null default false,  -- bestehendes Konto übernommen
  created_at       timestamptz not null default now(),
  freigegeben_am   timestamptz,
  freigegeben_von  uuid,
  zuletzt_aktiv    timestamptz
);
create index if not exists charaktere_person on public.charaktere (person_id);

-- Nur über die Funktionen unten erreichbar (die Edge Function nutzt den Service-Schlüssel)
alter table public.personen   enable row level security;
alter table public.charaktere enable row level security;
revoke all on public.personen, public.charaktere from anon, authenticated;

-- ---------- Admin: gilt für die Person ----------
-- Admin ist ein Konto, wenn es in "admins" steht oder ein freigegebener
-- Charakter einer Person mit Admin-Rechten ist.
create or replace function public.ist_admin_konto(p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = p_user)
      or exists (select 1 from public.charaktere c join public.personen p on p.user_id = c.person_id
                  where c.user_id = p_user and c.status = 'frei' and p.status = 'frei' and p.ist_admin);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.ist_admin_konto(auth.uid());
$$;

create or replace function public.nutzer_hat_recht(p_user uuid, p_recht text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.ist_admin_konto(p_user) or exists (
    select 1 from public.profiles pr join public.raenge r on r.id = pr.rang_id
     where pr.user_id = p_user
       and pr.status <> 'Ausgeschieden'
       and (r.berechtigungen ? p_recht
            or (p_recht like '%\_lesen' and r.berechtigungen ? (left(p_recht, length(p_recht) - 6) || '_schreiben'))));
$$;

create or replace function public.admin_list_users()
returns table(id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, is_admin boolean, gesperrt boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.hat_recht('personal_verwalten') then raise exception 'Keine Berechtigung'; end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at,
           public.ist_admin_konto(u.id),
           coalesce(u.banned_until > now(), false)
      from auth.users u order by u.created_at;
end $$;

create or replace function public.admin_set_password(p_user_id uuid, p_password text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.hat_recht('personal_verwalten') then raise exception 'Keine Berechtigung'; end if;
  if not public.is_admin() and public.ist_admin_konto(p_user_id) then
    raise exception 'Das Passwort des Admins kann nur der Admin ändern';
  end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'Passwort muss mindestens 6 Zeichen haben'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
   where id = p_user_id;
end $$;

create or replace function public.personal_sperren(p_user_id uuid, p_gesperrt boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.hat_recht('personal_verwalten') then raise exception 'Keine Berechtigung'; end if;
  if p_user_id = auth.uid() then raise exception 'Du kannst dich nicht selbst sperren'; end if;
  if public.ist_admin_konto(p_user_id) then raise exception 'Der Admin kann nicht gesperrt werden'; end if;
  update auth.users set banned_until = case when p_gesperrt then 'infinity'::timestamptz else null end, updated_at = now()
   where id = p_user_id;
end $$;

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
  if public.ist_admin_konto(new.user_id) then
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

-- ---------- Nur echte Mitglieder bekommen ein Profil ----------
-- Bisher bekam JEDES neue Login-Konto automatisch ein Profil (= Mitglied).
-- Mit offener Discord-Registrierung wäre das eine Lücke. Jetzt nur noch
-- Konten, die das Aktensystem selbst anlegt (Mitglied einstellen, Charakter).
create or replace function public.neuer_nutzer_profil()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'wiwang', '') in ('mitglied', 'charakter') then
    insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

create or replace function public.admin_create_user(p_email text, p_password text)
returns uuid language plpgsql security definer set search_path = ''
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
    '{"provider":"email","providers":["email"],"wiwang":"mitglied"}'::jsonb, '{}'::jsonb, now(), now(),
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

-- Wer kein Mitglied ist (z. B. eine Person, die gerade erst mit Discord
-- registriert ist), sieht auch Pinnwand, Personal, Ränge usw. nicht mehr.
alter policy "Lesen" on public.ablaeufe          using (public.ist_mitglied());
alter policy "Lesen" on public.einstellungen     using (public.ist_mitglied());
alter policy "Lesen" on public.pinnwand          using (public.ist_mitglied());
alter policy "Lesen" on public.pinnwand_gelesen  using (public.ist_mitglied());
alter policy "Profile lesen" on public.profiles  using (public.ist_mitglied());
alter policy "Ränge lesen" on public.raenge      using (public.ist_mitglied());
-- Profile legt nur noch die Datenbank bzw. die Personalverwaltung an
alter policy "Eigenes Profil anlegen" on public.profiles with check (public.hat_recht('personal_verwalten'));

-- ---------- Hook "Before User Created": nur Discord darf sich registrieren ----------
-- In Supabase unter Authentication → Hooks → "Before User Created" diese
-- Funktion auswählen. Dann kann sich niemand per E-Mail selbst registrieren,
-- auch wenn "Allow new users to sign up" für Discord eingeschaltet ist.
-- (Konten, die das Aktensystem selbst anlegt, laufen nicht über diesen Hook.)
create or replace function public.registrierung_pruefen(event jsonb)
returns jsonb language plpgsql stable set search_path = ''
as $$
begin
  if coalesce(event -> 'user' -> 'app_metadata' ->> 'provider', '') = 'discord' then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403, 'message', 'Registrierung ist nur mit Discord möglich.'));
end $$;
grant usage on schema public to supabase_auth_admin;
revoke execute on function public.registrierung_pruefen(jsonb) from public, anon, authenticated;
grant execute on function public.registrierung_pruefen(jsonb) to supabase_auth_admin;

-- ---------- Hilfsfunktionen ----------
-- Zu welcher Person gehört das angemeldete Konto (Person selbst oder einer ihrer Charaktere)?
create or replace function public.meine_person()
returns uuid language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select user_id from public.personen where user_id = auth.uid()),
    (select person_id from public.charaktere where user_id = auth.uid()));
$$;

-- Zufälliges Passwort, das niemand kennt (Konto nur noch per Charakter-Wechsel erreichbar)
create or replace function public._zufallspasswort_setzen(p_user uuid)
returns void language sql security definer set search_path = ''
as $$
  update auth.users
     set encrypted_password = extensions.crypt(encode(extensions.gen_random_bytes(24), 'hex'), extensions.gen_salt('bf')),
         updated_at = now()
   where id = p_user;
$$;
revoke execute on function public._zufallspasswort_setzen(uuid) from public, anon, authenticated;

-- Alle Admin-Konten benachrichtigen (z. B. neue Registrierung)
create or replace function public._admins_benachrichtigen(p_text text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v uuid;
begin
  for v in
    select a.user_id from public.admins a
    union
    select c.user_id from public.charaktere c join public.personen p on p.user_id = c.person_id
     where p.ist_admin and p.status = 'frei' and c.status = 'frei' and c.user_id is not null
  loop
    perform public.benachrichtige(v, 'freigabe', p_text, '#/team/konten', null, null);
  end loop;
end $$;
revoke execute on function public._admins_benachrichtigen(text) from public, anon, authenticated;

-- ---------- Mein Konto (für die Anmeldung und den Charakter-Wechsler) ----------
-- art: person | charakter | mitglied (altes Konto ohne Discord) | neu (Discord, noch nicht geprüft) | unbekannt
create or replace function public.mein_konto()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_person uuid;
  v_art text;
  p public.personen;
  u auth.users;
begin
  if v_uid is null then return jsonb_build_object('art', 'abgemeldet'); end if;
  if exists (select 1 from public.personen where user_id = v_uid) then
    v_art := 'person'; v_person := v_uid;
  elsif exists (select 1 from public.charaktere where user_id = v_uid) then
    v_art := 'charakter'; select person_id into v_person from public.charaktere where user_id = v_uid;
  elsif exists (select 1 from auth.identities where user_id = v_uid and provider = 'discord') then
    v_art := 'neu';
  elsif exists (select 1 from public.profiles where user_id = v_uid) then
    v_art := 'mitglied';
  else
    v_art := 'unbekannt';
  end if;
  if v_person is null then return jsonb_build_object('art', v_art); end if;

  select * into p from public.personen where user_id = v_person;
  select * into u from auth.users where id = v_person;
  return jsonb_build_object(
    'art', v_art,
    'person', jsonb_build_object(
      'status', p.status, 'ist_admin', p.ist_admin,
      'discord_name', p.discord_name, 'discord_benutzer', p.discord_benutzer, 'avatar_url', p.avatar_url,
      'server_mitglied', p.server_mitglied, 'server_geprueft_am', p.server_geprueft_am,
      'email', u.email, 'hat_passwort', coalesce(u.encrypted_password, '') <> ''),
    'charaktere', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id,
               'name', coalesce(nullif(trim(pr.anzeigename), ''), c.name),
               'status', c.status,
               'aktiv', c.user_id is not distinct from v_uid,
               'zuletzt_aktiv', c.zuletzt_aktiv,
               'created_at', c.created_at,
               'rang', case when r.ist_sonstiges then coalesce(nullif(pr.rang_eigen, ''), r.name) else r.name end,
               'profil_status', pr.status)
             order by c.created_at)
        from public.charaktere c
        left join public.profiles pr on pr.user_id = c.user_id
        left join public.raenge r on r.id = pr.rang_id
       where c.person_id = v_person), '[]'::jsonb));
end $$;
grant execute on function public.mein_konto() to authenticated;

-- ---------- Charakter beantragen (Registrierung = erster Charakter) ----------
create or replace function public.charakter_beantragen(p_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_person uuid := public.meine_person();
  v_name text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
  p public.personen;
  v_id uuid;
  v_erster boolean;
begin
  if v_person is null then raise exception 'Bitte zuerst mit Discord anmelden'; end if;
  select * into p from public.personen where user_id = v_person for update;
  if not p.server_mitglied then raise exception 'Du bist nicht Mitglied des Discord-Servers'; end if;
  if p.status in ('gesperrt', 'abgelehnt') then raise exception 'Dein Zugang ist gesperrt'; end if;
  if length(v_name) < 3 or length(v_name) > 60 then raise exception 'Der Name muss 3 bis 60 Zeichen haben'; end if;
  v_erster := not exists (select 1 from public.charaktere where person_id = v_person);
  if p.status = 'wartet' and not v_erster then
    raise exception 'Deine Registrierung wartet noch auf Freigabe';
  end if;
  if (select count(*) from public.charaktere where person_id = v_person and status = 'wartet') >= 2 then
    raise exception 'Es warten schon zwei Charaktere auf Freigabe';
  end if;
  if exists (select 1 from public.profiles where lower(trim(anzeigename)) = lower(v_name))
     or exists (select 1 from public.charaktere where lower(name) = lower(v_name) and status in ('wartet', 'frei')) then
    raise exception 'Diesen Namen gibt es schon';
  end if;

  insert into public.charaktere (person_id, name) values (v_person, v_name) returning id into v_id;
  perform public._admins_benachrichtigen(
    case when v_erster
      then 'Neue Registrierung: „' || v_name || '“ (Discord: ' || coalesce(p.discord_benutzer, p.discord_name, '?') || ') wartet auf Freigabe'
      else 'Neuer Charakter „' || v_name || '“ von ' || coalesce(p.discord_benutzer, p.discord_name, '?') || ' wartet auf Freigabe' end);
  return v_id;
end $$;
grant execute on function public.charakter_beantragen(text) to authenticated;

-- Eigenen, noch nicht freigegebenen Antrag zurückziehen
create or replace function public.charakter_antrag_zurueckziehen(p_charakter uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.charaktere
   where id = p_charakter and person_id = public.meine_person() and status = 'wartet' and user_id is null;
  if not found then raise exception 'Antrag nicht gefunden'; end if;
end $$;
grant execute on function public.charakter_antrag_zurueckziehen(uuid) to authenticated;

-- ---------- Bestehenden Charakter mit alten Zugangsdaten übernehmen ----------
-- Gibt {ok, fehler} zurück statt Fehler zu werfen, damit Fehlversuche gezählt werden.
create or replace function public.charakter_uebernehmen(p_email text, p_passwort text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_person uuid := public.meine_person();
  p public.personen;
  u auth.users;
  v_name text;
begin
  if v_person is null then return jsonb_build_object('ok', false, 'fehler', 'Bitte zuerst mit Discord anmelden'); end if;
  select * into p from public.personen where user_id = v_person for update;
  if not p.server_mitglied then return jsonb_build_object('ok', false, 'fehler', 'Du bist nicht Mitglied des Discord-Servers'); end if;
  if p.status in ('gesperrt', 'abgelehnt') then return jsonb_build_object('ok', false, 'fehler', 'Dein Zugang ist gesperrt'); end if;
  if p.fehlversuche >= 5 and p.fehlversuch_am > now() - interval '15 minutes' then
    return jsonb_build_object('ok', false, 'fehler', 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.');
  end if;

  select * into u from auth.users
   where email = lower(trim(coalesce(p_email, '')))
     and coalesce(encrypted_password, '') <> ''
     and encrypted_password = extensions.crypt(coalesce(p_passwort, ''), encrypted_password);
  if u.id is null then
    update public.personen
       set fehlversuche = case when fehlversuch_am > now() - interval '15 minutes' then fehlversuche + 1 else 1 end,
           fehlversuch_am = now()
     where user_id = v_person;
    return jsonb_build_object('ok', false, 'fehler', 'E-Mail oder Passwort falsch');
  end if;

  if exists (select 1 from public.personen where user_id = u.id) then
    return jsonb_build_object('ok', false, 'fehler', 'Das ist ein Discord-Konto, kein Charakter');
  end if;
  if exists (select 1 from public.charaktere where user_id = u.id) then
    return jsonb_build_object('ok', false, 'fehler', 'Dieser Charakter ist schon mit einem Discord-Konto verknüpft');
  end if;
  if coalesce(u.banned_until > now(), false) then
    return jsonb_build_object('ok', false, 'fehler', 'Dieser Zugang ist gesperrt');
  end if;
  select coalesce(nullif(trim(anzeigename), ''), split_part(email, '@', 1)) into v_name
    from public.profiles where user_id = u.id;
  if v_name is null then return jsonb_build_object('ok', false, 'fehler', 'Zu diesem Konto gibt es kein Mitglied'); end if;

  insert into public.charaktere (person_id, user_id, name, status, uebernommen, freigegeben_am)
  values (v_person, u.id, v_name, 'frei', true, now());
  update public.personen
     set status = case when status = 'wartet' then 'frei' else status end,
         freigegeben_am = coalesce(freigegeben_am, now()),
         ist_admin = ist_admin or exists (select 1 from public.admins where user_id = u.id),
         fehlversuche = 0
   where user_id = v_person;
  -- Die alten Zugangsdaten gelten ab jetzt nicht mehr – Anmeldung über Discord
  perform public._zufallspasswort_setzen(u.id);
  update public.profiles set discord = coalesce(nullif(discord, ''), p.discord_benutzer) where user_id = u.id;
  return jsonb_build_object('ok', true, 'name', v_name);
end $$;
grant execute on function public.charakter_uebernehmen(text, text) to authenticated;

-- ---------- Charakter wechseln ----------
-- Prüft alles und setzt auf dem Charakter-Konto ein Einmal-Passwort, mit dem
-- sich der Browser sofort anmeldet. Danach macht zugang_abschliessen() es ungültig.
create or replace function public.charakter_zugang(p_charakter uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_person uuid := public.meine_person();
  p public.personen;
  c public.charaktere;
  u auth.users;
  v_pw text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if v_person is null then raise exception 'Kein Discord-Konto verknüpft'; end if;
  select * into p from public.personen where user_id = v_person;
  if p.status = 'wartet' then raise exception 'Deine Registrierung wartet noch auf Freigabe'; end if;
  if p.status <> 'frei' then raise exception 'Dein Zugang ist gesperrt'; end if;
  if not p.server_mitglied then raise exception 'Du bist nicht (mehr) Mitglied des Discord-Servers'; end if;
  select * into c from public.charaktere where id = p_charakter and person_id = v_person;
  if c.id is null then raise exception 'Charakter nicht gefunden'; end if;
  if c.status = 'wartet' then raise exception 'Dieser Charakter wartet noch auf Freigabe'; end if;
  if c.status <> 'frei' or c.user_id is null then raise exception 'Dieser Charakter ist gesperrt'; end if;
  select * into u from auth.users where id = c.user_id;
  if coalesce(u.banned_until > now(), false) then raise exception 'Dieser Charakter ist gesperrt'; end if;
  if exists (select 1 from public.profiles where user_id = c.user_id and status = 'Ausgeschieden') then
    raise exception 'Dieser Charakter ist ausgeschieden';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(v_pw, extensions.gen_salt('bf')), updated_at = now()
   where id = c.user_id;
  return jsonb_build_object('email', u.email, 'passwort', v_pw);
end $$;
grant execute on function public.charakter_zugang(uuid) to authenticated;

create or replace function public.zugang_abschliessen()
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.charaktere where user_id = auth.uid()) then return; end if;
  perform public._zufallspasswort_setzen(auth.uid());
  update public.charaktere set zuletzt_aktiv = now() where user_id = auth.uid();
end $$;
grant execute on function public.zugang_abschliessen() to authenticated;

-- ---------- Eigenes Passwort für die Anmeldung ohne Discord ----------
create or replace function public.person_passwort_setzen(p_passwort text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_person uuid := public.meine_person();
  v_email text;
begin
  if v_person is null then raise exception 'Kein Discord-Konto verknüpft'; end if;
  if (select status from public.personen where user_id = v_person) <> 'frei' then
    raise exception 'Erst nach der Freigabe möglich';
  end if;
  if length(coalesce(p_passwort, '')) < 8 then raise exception 'Das Passwort muss mindestens 8 Zeichen haben'; end if;
  select email into v_email from auth.users where id = v_person;
  if coalesce(v_email, '') = '' then raise exception 'Dein Discord-Konto hat keine E-Mail-Adresse'; end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_passwort, extensions.gen_salt('bf')),
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         updated_at = now()
   where id = v_person;
  return v_email;
end $$;
grant execute on function public.person_passwort_setzen(text) to authenticated;

-- ---------- Admin: Übersicht über alle Konten ----------
create or replace function public.admin_konten()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Nur für Admins'; end if;
  return jsonb_build_object(
    'personen', coalesce((
      select jsonb_agg(jsonb_build_object(
               'user_id', p.user_id, 'status', p.status, 'ist_admin', p.ist_admin,
               'discord_name', p.discord_name, 'discord_benutzer', p.discord_benutzer, 'discord_id', p.discord_id,
               'avatar_url', p.avatar_url, 'server_mitglied', p.server_mitglied, 'server_geprueft_am', p.server_geprueft_am,
               'email', u.email, 'created_at', p.created_at, 'freigegeben_am', p.freigegeben_am,
               'letzte_anmeldung', greatest(u.last_sign_in_at, (select max(c2.zuletzt_aktiv) from public.charaktere c2 where c2.person_id = p.user_id)),
               'ich', p.user_id = public.meine_person(),
               'charaktere', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'id', c.id, 'user_id', c.user_id, 'status', c.status, 'uebernommen', c.uebernommen,
                          'name', coalesce(nullif(trim(pr.anzeigename), ''), c.name),
                          'created_at', c.created_at, 'freigegeben_am', c.freigegeben_am, 'zuletzt_aktiv', c.zuletzt_aktiv,
                          'rang', case when r.ist_sonstiges then coalesce(nullif(pr.rang_eigen, ''), r.name) else r.name end,
                          'profil_status', pr.status)
                        order by c.created_at)
                   from public.charaktere c
                   left join public.profiles pr on pr.user_id = c.user_id
                   left join public.raenge r on r.id = pr.rang_id
                  where c.person_id = p.user_id), '[]'::jsonb))
             order by (p.status = 'wartet') desc, p.created_at desc)
        from public.personen p join auth.users u on u.id = p.user_id), '[]'::jsonb),
    'ohne_discord', coalesce((
      select jsonb_agg(jsonb_build_object(
               'user_id', pr.user_id, 'name', coalesce(nullif(trim(pr.anzeigename), ''), split_part(u.email, '@', 1)),
               'email', u.email, 'letzte_anmeldung', u.last_sign_in_at, 'profil_status', pr.status,
               'gesperrt', coalesce(u.banned_until > now(), false),
               'ist_admin', exists (select 1 from public.admins a where a.user_id = pr.user_id))
             order by pr.anzeigename)
        from public.profiles pr join auth.users u on u.id = pr.user_id
       where not exists (select 1 from public.charaktere c where c.user_id = pr.user_id)), '[]'::jsonb));
end $$;
grant execute on function public.admin_konten() to authenticated;

-- Charakter-Konto anlegen bzw. wieder freischalten (intern)
create or replace function public._charakter_freischalten(p_charakter uuid, p_rang uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  c public.charaktere;
  v_id uuid;
  v_email text;
begin
  select * into c from public.charaktere where id = p_charakter for update;
  if c.user_id is null then
    v_id := gen_random_uuid();
    v_email := 'charakter-' || left(replace(c.id::text, '-', ''), 12) || '@wiwang.de';
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_email, extensions.crypt(encode(extensions.gen_random_bytes(24), 'hex'), extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"],"wiwang":"charakter"}'::jsonb, '{}'::jsonb, now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now()
    );
    -- Das Profil hat der Trigger neuer_nutzer_profil angelegt – Daten ergänzen
    update public.profiles
       set anzeigename = c.name, rang_id = p_rang, status = 'Aktiv', eintritt = current_date,
           discord = (select discord_benutzer from public.personen where user_id = c.person_id)
     where user_id = v_id;
    update public.charaktere set user_id = v_id where id = c.id;
  else
    update auth.users set banned_until = null, updated_at = now() where id = c.user_id;
    if p_rang is not null then update public.profiles set rang_id = p_rang where user_id = c.user_id; end if;
  end if;
  update public.charaktere
     set status = 'frei', freigegeben_am = coalesce(freigegeben_am, now()), freigegeben_von = coalesce(freigegeben_von, auth.uid())
   where id = c.id;
end $$;
revoke execute on function public._charakter_freischalten(uuid, uuid) from public, anon, authenticated;

-- Person: freigeben | ablehnen | sperren | entsperren | admin | kein_admin
create or replace function public.admin_person(p_person uuid, p_aktion text, p_rang uuid default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  p public.personen;
  c record;
begin
  if not public.is_admin() then raise exception 'Nur für Admins'; end if;
  select * into p from public.personen where user_id = p_person for update;
  if p.user_id is null then raise exception 'Person nicht gefunden'; end if;
  if p_person = public.meine_person() and p_aktion in ('ablehnen', 'sperren', 'kein_admin') then
    raise exception 'Das kannst du bei dir selbst nicht tun';
  end if;

  if p_aktion = 'freigeben' then
    update public.personen set status = 'frei', freigegeben_am = coalesce(freigegeben_am, now()),
           freigegeben_von = coalesce(freigegeben_von, auth.uid())
     where user_id = p_person;
    update auth.users set banned_until = null, updated_at = now() where id = p_person;
    for c in select id from public.charaktere where person_id = p_person and status = 'wartet' loop
      perform public._charakter_freischalten(c.id, p_rang);
    end loop;
  elsif p_aktion = 'ablehnen' then
    update public.personen set status = 'abgelehnt' where user_id = p_person;
    update public.charaktere set status = 'abgelehnt' where person_id = p_person and status = 'wartet';
  elsif p_aktion = 'sperren' then
    update public.personen set status = 'gesperrt' where user_id = p_person;
    update auth.users set banned_until = 'infinity', updated_at = now()
     where id = p_person or id in (select user_id from public.charaktere where person_id = p_person);
  elsif p_aktion = 'entsperren' then
    update public.personen set status = 'frei', freigegeben_am = coalesce(freigegeben_am, now()) where user_id = p_person;
    update auth.users set banned_until = null, updated_at = now()
     where id = p_person or id in (select user_id from public.charaktere where person_id = p_person and status = 'frei');
  elsif p_aktion in ('admin', 'kein_admin') then
    update public.personen set ist_admin = (p_aktion = 'admin') where user_id = p_person;
  else
    raise exception 'Unbekannte Aktion';
  end if;
end $$;
grant execute on function public.admin_person(uuid, text, uuid) to authenticated;

-- Charakter: freigeben | ablehnen | sperren | entsperren
create or replace function public.admin_charakter(p_charakter uuid, p_aktion text, p_rang uuid default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  c public.charaktere;
begin
  if not public.is_admin() then raise exception 'Nur für Admins'; end if;
  select * into c from public.charaktere where id = p_charakter;
  if c.id is null then raise exception 'Charakter nicht gefunden'; end if;
  if c.user_id = auth.uid() and p_aktion in ('ablehnen', 'sperren') then
    raise exception 'Du kannst deinen aktiven Charakter nicht sperren';
  end if;

  if p_aktion in ('freigeben', 'entsperren') then
    -- Wer einen Charakter freigibt, gibt damit auch die Registrierung frei
    update public.personen set status = 'frei', freigegeben_am = coalesce(freigegeben_am, now()),
           freigegeben_von = coalesce(freigegeben_von, auth.uid())
     where user_id = c.person_id and status in ('wartet', 'abgelehnt');
    perform public._charakter_freischalten(c.id, p_rang);
  elsif p_aktion = 'ablehnen' then
    if c.status <> 'wartet' then raise exception 'Nur wartende Charaktere können abgelehnt werden'; end if;
    update public.charaktere set status = 'abgelehnt' where id = c.id;
  elsif p_aktion = 'sperren' then
    update public.charaktere set status = 'gesperrt' where id = c.id;
    if c.user_id is not null then
      update auth.users set banned_until = 'infinity', updated_at = now() where id = c.user_id;
    end if;
  else
    raise exception 'Unbekannte Aktion';
  end if;
end $$;
grant execute on function public.admin_charakter(uuid, text, uuid) to authenticated;

-- Zur Kontrolle
select (select count(*) from public.personen) as personen,
       (select count(*) from public.charaktere) as charaktere,
       (select count(*) from public.profiles) as profile;
