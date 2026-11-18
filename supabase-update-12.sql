-- =============================================================
--  Wiwang Law – Update 12: Mandantenportal
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 bis 11.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  Idee:
--  • Mandanten registrieren sich wie Mitarbeiter mit Discord – ihr
--    Charakter ist aber ein MANDANTEN-Charakter (charaktere.art = 'mandant').
--  • Ein Mandanten-Charakter hat KEIN Profil, keinen Rang und keine
--    Rechte. Über die normalen Tabellen sieht er nichts (alle Regeln
--    verlangen ein Profil bzw. ein Recht). Alles, was er sehen darf,
--    liefert allein die Funktion portal_daten() – handverlesen:
--      – Akten, in denen er Mandant ist oder für die er freigeschaltet wurde
--        (Mitmandant, Vertreter …: Tabelle akten_mandanten)
--      – je Akte: Eckdaten, Tatvorwürfe, Termine (ohne interne Fristen
--        und Wiedervorlagen), nur die für ihn freigegebenen
--        Verlaufseinträge und Beweise
--      – seine Rechnungen und seine Kontaktdaten aus der Kartei
--  • Freigegeben und mit der Mandantenkartei verknüpft wird ein Mandant
--    von allen, die "Mandanten bearbeiten" dürfen. Discord-Server-
--    Mitgliedschaft ist für Mandanten NICHT nötig.
--  • Der Mandant kann der Kanzlei zu einer Akte schreiben (landet im
--    Verlauf und benachrichtigt die/den Zuständige/n) und seine
--    Telefonnummer/Adresse aktualisieren. Er wird benachrichtigt, wenn
--    die Kanzlei ihm etwas freigibt, einen Termin anlegt, eine Rechnung
--    stellt oder sich der Status seiner Akte ändert.
-- =============================================================

-- ---------- Tabellen ----------
alter table public.charaktere add column if not exists art text not null default 'mitarbeiter';
alter table public.charaktere add column if not exists mandant_id uuid references public.mandanten(id) on delete set null;
alter table public.charaktere add column if not exists notiz text;              -- Angaben beim Antrag (z. B. Aktenzeichen)
alter table public.charaktere add column if not exists portal_gesehen timestamptz;
do $$ begin
  alter table public.charaktere add constraint charaktere_art_check check (art in ('mitarbeiter', 'mandant'));
exception when duplicate_object then null; end $$;
create index if not exists charaktere_mandant on public.charaktere (mandant_id);

-- Verlauf und Beweise: für den Mandanten sichtbar?
alter table public.eintraege add column if not exists fuer_mandant boolean not null default false;
-- Eintrag stammt vom Mandanten selbst (Nachricht über das Portal)
alter table public.eintraege add column if not exists mandant_id uuid references public.mandanten(id) on delete set null;
alter table public.beweise   add column if not exists fuer_mandant boolean not null default false;

-- Weitere Mandanten mit Einblick in eine Akte (Mitmandant, Vertreter, Firma …)
create table if not exists public.akten_mandanten (
  id          uuid primary key default gen_random_uuid(),
  akte_id     uuid not null references public.akten(id) on delete cascade,
  mandant_id  uuid not null references public.mandanten(id) on delete cascade,
  rolle       text not null default 'Mitmandant',
  created_at  timestamptz not null default now(),
  created_by  text default (auth.jwt() ->> 'email'),
  unique (akte_id, mandant_id)
);
create index if not exists akten_mandanten_mandant on public.akten_mandanten (mandant_id);
alter table public.akten_mandanten enable row level security;
drop policy if exists "Lesen" on public.akten_mandanten;
create policy "Lesen" on public.akten_mandanten for select to authenticated using (public.hat_recht('akten_lesen'));
drop policy if exists "Anlegen" on public.akten_mandanten;
create policy "Anlegen" on public.akten_mandanten for insert to authenticated with check (public.hat_recht('akten_schreiben'));
drop policy if exists "Ändern" on public.akten_mandanten;
create policy "Ändern" on public.akten_mandanten for update to authenticated
  using (public.hat_recht('akten_schreiben')) with check (public.hat_recht('akten_schreiben'));
drop policy if exists "Löschen" on public.akten_mandanten;
create policy "Löschen" on public.akten_mandanten for delete to authenticated using (public.hat_recht('akten_schreiben'));
do $$ begin
  alter publication supabase_realtime add table public.akten_mandanten;
exception when duplicate_object then null; end $$;


-- ---------- Admin gilt nur für Mitarbeiter-Charaktere ----------
-- Sonst wäre der Mandanten-Charakter eines Admins selbst Admin und sähe alles.
create or replace function public.ist_admin_konto(p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = p_user)
      or exists (select 1 from public.charaktere c join public.personen p on p.user_id = c.person_id
                  where c.user_id = p_user and c.art = 'mitarbeiter' and c.status = 'frei' and p.status = 'frei' and p.ist_admin);
$$;

create or replace function public._admins_benachrichtigen(p_text text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v uuid;
begin
  for v in
    select a.user_id from public.admins a
    union
    select c.user_id from public.charaktere c join public.personen p on p.user_id = c.person_id
     where p.ist_admin and p.status = 'frei' and c.status = 'frei' and c.art = 'mitarbeiter' and c.user_id is not null
  loop
    perform public.benachrichtige(v, 'freigabe', p_text, '#/team/konten', null, null);
  end loop;
end $$;
revoke execute on function public._admins_benachrichtigen(text) from public, anon, authenticated;

-- Alle, die Mandanten bearbeiten dürfen, benachrichtigen (neuer Portal-Antrag)
create or replace function public._mandantenpflege_benachrichtigen(p_text text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v uuid;
begin
  for v in select pr.user_id from public.profiles pr where pr.status <> 'Ausgeschieden'
                                                     and public.nutzer_hat_recht(pr.user_id, 'mandanten_schreiben') loop
    perform public.benachrichtige(v, 'freigabe', p_text, '#/mandanten/portal', null, null);
  end loop;
end $$;
revoke execute on function public._mandantenpflege_benachrichtigen(text) from public, anon, authenticated;


-- ---------- Ist das angemeldete Konto ein freigeschalteter Mandant? ----------
create or replace function public.mein_mandant()
returns uuid language sql stable security definer set search_path = ''
as $$
  select c.mandant_id from public.charaktere c join public.personen p on p.user_id = c.person_id
   where c.user_id = auth.uid() and c.art = 'mandant' and c.status = 'frei' and p.status = 'frei';
$$;
revoke execute on function public.mein_mandant() from public, anon;
grant  execute on function public.mein_mandant() to authenticated;

-- Welche Akten darf ein Mandant sehen? (als Mandant der Akte oder freigeschaltet)
create or replace function public._portal_akten(p_mandant uuid)
returns table (akte_id uuid, rolle text)
language sql stable security definer set search_path = ''
as $$
  select a.id, 'Mandant'::text from public.akten a where p_mandant is not null and a.mandant_id = p_mandant
  union
  select am.akte_id, am.rolle from public.akten_mandanten am
   where p_mandant is not null and am.mandant_id = p_mandant
     and not exists (select 1 from public.akten a2 where a2.id = am.akte_id and a2.mandant_id = p_mandant);
$$;
revoke execute on function public._portal_akten(uuid) from public, anon, authenticated;

-- Interne Termine (Fristen, Wiedervorlagen) sieht der Mandant nicht
create or replace function public._portal_termin_sichtbar(p_art text)
returns boolean language sql immutable set search_path = ''
as $$ select coalesce(p_art, '') not in ('Frist', 'Wiedervorlage'); $$;


-- ---------- Mein Konto: Art des Charakters mitliefern ----------
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
    select person_id, case when art = 'mandant' then 'mandant' else 'charakter' end
      into v_person, v_art from public.charaktere where user_id = v_uid;
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
               'art', c.art,
               'name', coalesce(nullif(trim(pr.anzeigename), ''), c.name),
               'status', c.status,
               'aktiv', c.user_id is not distinct from v_uid,
               'zuletzt_aktiv', c.zuletzt_aktiv,
               'created_at', c.created_at,
               'rang', case when c.art = 'mandant' then 'Mandant'
                            when r.ist_sonstiges then coalesce(nullif(pr.rang_eigen, ''), r.name) else r.name end,
               'profil_status', pr.status)
             order by c.created_at)
        from public.charaktere c
        left join public.profiles pr on pr.user_id = c.user_id
        left join public.raenge r on r.id = pr.rang_id
       where c.person_id = v_person), '[]'::jsonb));
end $$;
grant execute on function public.mein_konto() to authenticated;


-- ---------- Charakter beantragen: Mitarbeiter oder Mandant ----------
drop function if exists public.charakter_beantragen(text);
create or replace function public.charakter_beantragen(p_name text, p_art text default 'mitarbeiter', p_notiz text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_person uuid := public.meine_person();
  v_name text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_art text := coalesce(nullif(trim(p_art), ''), 'mitarbeiter');
  v_notiz text := nullif(left(trim(coalesce(p_notiz, '')), 500), '');
  p public.personen;
  v_id uuid;
  v_erster boolean;
  v_wer text;
begin
  if v_person is null then raise exception 'Bitte zuerst mit Discord anmelden'; end if;
  if v_art not in ('mitarbeiter', 'mandant') then raise exception 'Unbekannte Art'; end if;
  select * into p from public.personen where user_id = v_person for update;
  -- Mitarbeiter müssen auf dem Discord-Server sein, Mandanten nicht
  if v_art = 'mitarbeiter' and not p.server_mitglied then raise exception 'Du bist nicht Mitglied des Discord-Servers'; end if;
  if p.status in ('gesperrt', 'abgelehnt') then raise exception 'Dein Zugang ist gesperrt'; end if;
  if length(v_name) < 3 or length(v_name) > 60 then raise exception 'Der Name muss 3 bis 60 Zeichen haben'; end if;
  v_erster := not exists (select 1 from public.charaktere where person_id = v_person);
  if p.status = 'wartet' and not v_erster then
    raise exception 'Deine Registrierung wartet noch auf Freigabe';
  end if;
  if (select count(*) from public.charaktere where person_id = v_person and status = 'wartet') >= 2 then
    raise exception 'Es warten schon zwei Charaktere auf Freigabe';
  end if;
  if v_art = 'mitarbeiter' then
    if exists (select 1 from public.profiles where lower(trim(anzeigename)) = lower(v_name))
       or exists (select 1 from public.charaktere where art = 'mitarbeiter' and lower(name) = lower(v_name) and status in ('wartet', 'frei')) then
      raise exception 'Diesen Namen gibt es schon';
    end if;
  else
    if exists (select 1 from public.charaktere where person_id = v_person and art = 'mandant' and status in ('wartet', 'frei')) then
      raise exception 'Du hast schon einen Mandanten-Zugang';
    end if;
    if exists (select 1 from public.charaktere where art = 'mandant' and lower(name) = lower(v_name) and status in ('wartet', 'frei')) then
      raise exception 'Für diesen Namen gibt es schon einen Mandanten-Zugang';
    end if;
  end if;

  insert into public.charaktere (person_id, name, art, notiz) values (v_person, v_name, v_art, v_notiz) returning id into v_id;
  v_wer := coalesce(p.discord_benutzer, p.discord_name, '?');
  if v_art = 'mandant' then
    perform public._mandantenpflege_benachrichtigen(
      'Mandant „' || v_name || '“ (Discord: ' || v_wer || ') möchte Zugang zum Mandantenportal');
  else
    perform public._admins_benachrichtigen(
      case when v_erster
        then 'Neue Registrierung: „' || v_name || '“ (Discord: ' || v_wer || ') wartet auf Freigabe'
        else 'Neuer Charakter „' || v_name || '“ von ' || v_wer || ' wartet auf Freigabe' end);
  end if;
  return v_id;
end $$;
revoke execute on function public.charakter_beantragen(text, text, text) from public, anon;
grant execute on function public.charakter_beantragen(text, text, text) to authenticated;


-- ---------- Charakter wechseln: Mandanten ohne Server-Pflicht ----------
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
  select * into c from public.charaktere where id = p_charakter and person_id = v_person;
  if c.id is null then raise exception 'Charakter nicht gefunden'; end if;
  if c.art = 'mitarbeiter' and not p.server_mitglied then raise exception 'Du bist nicht (mehr) Mitglied des Discord-Servers'; end if;
  if c.status = 'wartet' then raise exception 'Dieser Charakter wartet noch auf Freigabe'; end if;
  if c.status <> 'frei' or c.user_id is null then raise exception 'Dieser Charakter ist gesperrt'; end if;
  select * into u from auth.users where id = c.user_id;
  if coalesce(u.banned_until > now(), false) then raise exception 'Dieser Charakter ist gesperrt'; end if;
  if c.art = 'mitarbeiter' and exists (select 1 from public.profiles where user_id = c.user_id and status = 'Ausgeschieden') then
    raise exception 'Dieser Charakter ist ausgeschieden';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(v_pw, extensions.gen_salt('bf')), updated_at = now()
   where id = c.user_id;
  return jsonb_build_object('email', u.email, 'passwort', v_pw);
end $$;
grant execute on function public.charakter_zugang(uuid) to authenticated;


-- ---------- Charakter-Konto anlegen: Mandanten ohne Profil ----------
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
    v_email := case when c.art = 'mandant' then 'mandant-' else 'charakter-' end
               || left(replace(c.id::text, '-', ''), 12) || '@wiwang.de';
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_email, extensions.crypt(encode(extensions.gen_random_bytes(24), 'hex'), extensions.gen_salt('bf')), now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'),
                         'wiwang', case when c.art = 'mandant' then 'mandant' else 'charakter' end),
      '{}'::jsonb, now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now()
    );
    if c.art = 'mitarbeiter' then
      -- Das Profil hat der Trigger neuer_nutzer_profil angelegt – Daten ergänzen
      update public.profiles
         set anzeigename = c.name, rang_id = p_rang, status = 'Aktiv', eintritt = current_date,
             discord = (select discord_benutzer from public.personen where user_id = c.person_id)
       where user_id = v_id;
    end if;
    update public.charaktere set user_id = v_id where id = c.id;
  else
    update auth.users set banned_until = null, updated_at = now() where id = c.user_id;
    if p_rang is not null and c.art = 'mitarbeiter' then update public.profiles set rang_id = p_rang where user_id = c.user_id; end if;
  end if;
  update public.charaktere
     set status = 'frei', freigegeben_am = coalesce(freigegeben_am, now()), freigegeben_von = coalesce(freigegeben_von, auth.uid())
   where id = c.id;
end $$;
revoke execute on function public._charakter_freischalten(uuid, uuid) from public, anon, authenticated;


-- ---------- Admin: Person freigeben schaltet nur Mitarbeiter-Charaktere frei ----------
-- (Mandanten brauchen die Verknüpfung mit der Kartei – siehe mandant_zugang)
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
    for c in select id from public.charaktere where person_id = p_person and status = 'wartet' and art = 'mitarbeiter' loop
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

create or replace function public.admin_charakter(p_charakter uuid, p_aktion text, p_rang uuid default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  c public.charaktere;
begin
  if not public.is_admin() then raise exception 'Nur für Admins'; end if;
  select * into c from public.charaktere where id = p_charakter;
  if c.id is null then raise exception 'Charakter nicht gefunden'; end if;
  if c.art = 'mandant' then
    perform public.mandant_zugang(p_charakter, p_aktion, null);
    return;
  end if;
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

-- Admin-Übersicht: Art und verknüpfter Mandant je Charakter
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
                          'art', c.art, 'mandant_id', c.mandant_id, 'mandant_name', m.name, 'notiz', c.notiz,
                          'name', coalesce(nullif(trim(pr.anzeigename), ''), c.name),
                          'created_at', c.created_at, 'freigegeben_am', c.freigegeben_am, 'zuletzt_aktiv', c.zuletzt_aktiv,
                          'rang', case when c.art = 'mandant' then 'Mandant'
                                       when r.ist_sonstiges then coalesce(nullif(pr.rang_eigen, ''), r.name) else r.name end,
                          'profil_status', pr.status)
                        order by c.created_at)
                   from public.charaktere c
                   left join public.profiles pr on pr.user_id = c.user_id
                   left join public.raenge r on r.id = pr.rang_id
                   left join public.mandanten m on m.id = c.mandant_id
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


-- =============================================================
--  Kanzlei-Seite: Portal-Zugänge verwalten (Recht "Mandanten bearbeiten")
-- =============================================================

-- Alle Mandanten-Zugänge (lesen: Mandanten lesen)
create or replace function public.portal_zugaenge()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.hat_recht('mandanten_lesen') then raise exception 'Keine Berechtigung'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', c.id, 'name', c.name, 'status', c.status, 'notiz', c.notiz,
             'mandant_id', c.mandant_id, 'created_at', c.created_at, 'freigegeben_am', c.freigegeben_am,
             'zuletzt_aktiv', greatest(c.zuletzt_aktiv, c.portal_gesehen),
             'person_status', p.status,
             'discord_name', p.discord_name, 'discord_benutzer', p.discord_benutzer, 'avatar_url', p.avatar_url,
             -- Vorschlag: Mandant mit gleichem Namen in der Kartei
             'vorschlag', (select m.id from public.mandanten m where lower(trim(m.name)) = lower(trim(c.name)) limit 1))
           order by (c.status = 'wartet') desc, c.created_at desc)
      from public.charaktere c join public.personen p on p.user_id = c.person_id
     where c.art = 'mandant'), '[]'::jsonb);
end $$;
revoke execute on function public.portal_zugaenge() from public, anon;
grant  execute on function public.portal_zugaenge() to authenticated;

-- freigeben | verknuepfen | ablehnen | sperren | entsperren
-- p_mandant: Eintrag der Kartei; bei "freigeben" ohne Angabe der gleichnamige Eintrag
-- (falls es genau einen gibt), sonst wird ein neuer angelegt.
create or replace function public.mandant_zugang(p_charakter uuid, p_aktion text, p_mandant uuid default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  c public.charaktere;
  p public.personen;
  v_mandant uuid := p_mandant;
begin
  if not public.hat_recht('mandanten_schreiben') then raise exception 'Keine Berechtigung'; end if;
  select * into c from public.charaktere where id = p_charakter and art = 'mandant' for update;
  if c.id is null then raise exception 'Mandanten-Zugang nicht gefunden'; end if;
  select * into p from public.personen where user_id = c.person_id;
  if c.user_id is not null and c.user_id = auth.uid() then raise exception 'Das kannst du bei dir selbst nicht tun'; end if;
  if v_mandant is not null and not exists (select 1 from public.mandanten where id = v_mandant) then
    raise exception 'Mandant nicht in der Kartei';
  end if;

  if p_aktion in ('freigeben', 'entsperren') then
    if p.status in ('gesperrt') then raise exception 'Die Person ist gesperrt (nur ein Admin kann sie entsperren)'; end if;
    if v_mandant is null then v_mandant := c.mandant_id; end if;
    if v_mandant is null and (select count(*) from public.mandanten where lower(trim(name)) = lower(trim(c.name))) = 1 then
      -- genau ein Eintrag mit gleichem Namen in der Kartei → den nehmen
      select id into v_mandant from public.mandanten where lower(trim(name)) = lower(trim(c.name));
    end if;
    if v_mandant is null then
      -- Neuer Eintrag in der Kartei
      insert into public.mandanten (name, discord) values (c.name, p.discord_benutzer) returning id into v_mandant;
    end if;
    update public.charaktere set mandant_id = v_mandant where id = c.id;
    update public.personen set status = 'frei', freigegeben_am = coalesce(freigegeben_am, now()),
           freigegeben_von = coalesce(freigegeben_von, auth.uid())
     where user_id = c.person_id and status in ('wartet', 'abgelehnt');
    perform public._charakter_freischalten(c.id, null);
    update public.mandanten set discord = coalesce(nullif(discord, ''), p.discord_benutzer) where id = v_mandant;
  elsif p_aktion = 'verknuepfen' then
    if v_mandant is null then raise exception 'Bitte einen Mandanten aus der Kartei wählen'; end if;
    update public.charaktere set mandant_id = v_mandant where id = c.id;
  elsif p_aktion = 'ablehnen' then
    if c.status <> 'wartet' then raise exception 'Nur wartende Anträge können abgelehnt werden'; end if;
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
revoke execute on function public.mandant_zugang(uuid, text, uuid) from public, anon;
grant  execute on function public.mandant_zugang(uuid, text, uuid) to authenticated;


-- =============================================================
--  Portal (nur für freigeschaltete Mandanten)
-- =============================================================

-- Alles, was der Mandant sehen darf – in einem Stück
create or replace function public.portal_daten()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  c public.charaktere;
  m public.mandanten;
  e jsonb;
begin
  select ch.* into c from public.charaktere ch join public.personen p on p.user_id = ch.person_id
   where ch.user_id = auth.uid() and ch.art = 'mandant' and ch.status = 'frei' and p.status = 'frei';
  if c.id is null then raise exception 'Kein freigeschalteter Mandanten-Zugang'; end if;
  select * into m from public.mandanten where id = c.mandant_id;
  select daten into e from public.einstellungen where id = 1;
  e := coalesce(e, '{}'::jsonb);

  return jsonb_build_object(
    'name', c.name,
    'gesehen', c.portal_gesehen,
    'kanzlei', jsonb_build_object(
      'kanzlei', coalesce(e ->> 'kanzlei', 'Wiwang Law'), 'ort', e ->> 'ort', 'telefon', e ->> 'telefon',
      'waehrung', e ->> 'waehrung', 'haft_einheit', e ->> 'haft_einheit', 'zahlungsziel_tage', e -> 'zahlungsziel_tage',
      'rechnung_einleitung', e ->> 'rechnung_einleitung', 'rechnung_hinweis', e ->> 'rechnung_hinweis'),
    'mandant', case when m.id is null then null else jsonb_build_object(
      'id', m.id, 'name', m.name, 'telefon', m.telefon, 'discord', m.discord, 'adresse', m.adresse) end,
    'akten', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'number', a.number, 'title', a.title, 'status', a.status, 'rolle', pa.rolle,
               'area', a.area, 'typ', a.typ, 'opponent', a.opponent, 'az_extern', a.az_extern,
               'mandant', coalesce(hm.name, a.client),
               'in_haft', a.in_haft, 'haft_bis', a.haft_bis,
               'ergebnis', a.ergebnis, 'ergebnis_details', a.ergebnis_details, 'ergebnis_datum', a.ergebnis_datum,
               'created_at', a.created_at, 'updated_at', a.updated_at,
               'zustaendig', case when zp.user_id is null then a.lawyer else
                 coalesce(nullif(trim(zp.anzeigename), ''), split_part(zp.email, '@', 1)) end,
               'zustaendig_telefon', zp.telefon,
               'vorwuerfe', coalesce((
                 select jsonb_agg(jsonb_build_object('paragraph', v ->> 'paragraph', 'titel', v ->> 'titel',
                          'anzahl', v -> 'anzahl', 'geldstrafe', v -> 'geldstrafe', 'haft', v -> 'haft'))
                   from jsonb_array_elements(case when jsonb_typeof(a.vorwuerfe) = 'array' then a.vorwuerfe else '[]'::jsonb end) v), '[]'::jsonb),
               'termine', coalesce((
                 select jsonb_agg(jsonb_build_object('id', t.id, 'titel', t.titel, 'art', t.art, 'beginn', t.beginn,
                          'ort', t.ort, 'erledigt', t.erledigt, 'created_at', t.created_at) order by t.beginn)
                   from public.termine t where t.akte_id = a.id and public._portal_termin_sichtbar(t.art)), '[]'::jsonb),
               'verlauf', coalesce((
                 select jsonb_agg(jsonb_build_object('id', ei.id, 'art', ei.art, 'text', ei.text, 'created_at', ei.created_at,
                          'vom_mandanten', ei.mandant_id is not null,
                          'eigene', ei.mandant_id is not distinct from c.mandant_id and ei.mandant_id is not null,
                          'von', case when ei.mandant_id is not null then em.name
                                      else coalesce(nullif(trim(ep.anzeigename), ''), 'Kanzlei') end)
                          order by ei.created_at)
                   from public.eintraege ei
                   left join public.mandanten em on em.id = ei.mandant_id
                   left join public.profiles ep on lower(ep.email) = lower(ei.author)
                  where ei.akte_id = a.id and ei.fuer_mandant), '[]'::jsonb),
               'beweise', coalesce((
                 select jsonb_agg(jsonb_build_object('id', b.id, 'art', b.art, 'titel', b.titel, 'link', b.link,
                          'beschreibung', b.beschreibung, 'created_at', b.created_at) order by b.created_at desc)
                   from public.beweise b where b.akte_id = a.id and b.fuer_mandant), '[]'::jsonb))
             order by (a.status = 'Geschlossen'), a.created_at desc)
        from public._portal_akten(c.mandant_id) pa
        join public.akten a on a.id = pa.akte_id
        left join public.mandanten hm on hm.id = a.mandant_id
        left join public.profiles zp on zp.user_id = a.zustaendig_id), '[]'::jsonb),
    'rechnungen', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'nummer', r.nummer, 'datum', r.datum, 'betreff', r.betreff, 'empfaenger', r.empfaenger,
               'positionen', r.positionen, 'summe', r.summe, 'status', r.status, 'bezahlt_am', r.bezahlt_am,
               'akte_id', r.akte_id, 'akte_number', ra.number,
               'unterzeichner', coalesce(nullif(trim(up.anzeigename), ''), 'Wiwang Law'),
               'unterzeichner_titel', case when ur.id is null then up.titel
                                           when ur.ist_sonstiges then coalesce(nullif(up.rang_eigen, ''), ur.name) else ur.name end)
             order by r.datum desc, r.nummer desc)
        from public.rechnungen r
        left join public.akten ra on ra.id = r.akte_id
        left join public.profiles up on up.user_id = r.unterzeichner
        left join public.raenge ur on ur.id = up.rang_id
       where c.mandant_id is not null and r.mandant_id = c.mandant_id and r.status <> 'Storniert'), '[]'::jsonb));
end $$;
revoke execute on function public.portal_daten() from public, anon;
grant  execute on function public.portal_daten() to authenticated;

-- "Zuletzt gesehen" merken (für die Markierung "neu"); liefert den vorigen Zeitpunkt
create or replace function public.portal_gesehen()
returns timestamptz language plpgsql security definer set search_path = ''
as $$
declare v_vorher timestamptz;
begin
  select portal_gesehen into v_vorher from public.charaktere where user_id = auth.uid() and art = 'mandant';
  update public.charaktere set portal_gesehen = now() where user_id = auth.uid() and art = 'mandant';
  return v_vorher;
end $$;
revoke execute on function public.portal_gesehen() from public, anon;
grant  execute on function public.portal_gesehen() to authenticated;

-- Nachricht des Mandanten an die Kanzlei (landet im Verlauf der Akte)
create or replace function public.portal_nachricht(p_akte uuid, p_text text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_mandant uuid := public.mein_mandant();
  v_text text := trim(coalesce(p_text, ''));
  v_id uuid;
  a public.akten;
  v_name text;
begin
  if v_mandant is null then raise exception 'Kein freigeschalteter Mandanten-Zugang'; end if;
  if not exists (select 1 from public._portal_akten(v_mandant) where akte_id = p_akte) then
    raise exception 'Akte nicht gefunden';
  end if;
  if length(v_text) < 2 then raise exception 'Bitte eine Nachricht eingeben'; end if;
  if length(v_text) > 2000 then raise exception 'Die Nachricht ist zu lang (höchstens 2000 Zeichen)'; end if;
  if (select count(*) from public.eintraege where mandant_id = v_mandant and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Zu viele Nachrichten – bitte später erneut versuchen';
  end if;
  select * into a from public.akten where id = p_akte;
  select name into v_name from public.mandanten where id = v_mandant;

  -- Die allgemeine Benachrichtigung ("hat eingetragen") unterdrücken – wir schicken eine eigene
  perform set_config('wiwang.stumm', '1', true);
  insert into public.eintraege (akte_id, text, art, fuer_mandant, mandant_id)
  values (p_akte, v_text, 'Mandant', true, v_mandant) returning id into v_id;
  perform set_config('wiwang.stumm', '', true);

  if a.zustaendig_id is not null and exists (select 1 from public.profiles where user_id = a.zustaendig_id and status <> 'Ausgeschieden') then
    insert into public.benachrichtigungen (user_id, art, text, link, akte_id, von)
    values (a.zustaendig_id, 'mandant',
            coalesce(v_name, 'Mandant') || ' hat in ' || coalesce(a.number, 'einer Akte') || ' geschrieben: „' || public.auszug(v_text) || '“',
            '#/akten/' || a.id || '/verlauf', a.id, null);
  end if;
  return v_id;
end $$;
revoke execute on function public.portal_nachricht(uuid, text) from public, anon;
grant  execute on function public.portal_nachricht(uuid, text) to authenticated;

-- Eigene Kontaktdaten aktualisieren (Telefon, Adresse)
create or replace function public.portal_kontakt(p_telefon text, p_adresse text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_mandant uuid := public.mein_mandant();
begin
  if v_mandant is null then raise exception 'Kein freigeschalteter Mandanten-Zugang'; end if;
  update public.mandanten
     set telefon = nullif(left(trim(coalesce(p_telefon, '')), 60), ''),
         adresse = nullif(left(trim(coalesce(p_adresse, '')), 200), '')
   where id = v_mandant;
end $$;
revoke execute on function public.portal_kontakt(text, text) from public, anon;
grant  execute on function public.portal_kontakt(text, text) to authenticated;


-- =============================================================
--  Benachrichtigungen an Mandanten
-- =============================================================
-- An alle freigeschalteten Mandanten-Zugänge einer Akte (Mandant + freigeschaltete)
-- bzw. eines Mandanten. Nie an sich selbst; während einer Übergabe stumm.
create or replace function public._portal_benachrichtigen(p_akte uuid, p_mandant uuid, p_art text, p_text text, p_link text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v uuid;
begin
  if coalesce(current_setting('wiwang.stumm', true), '') = '1' then return; end if;
  for v in
    select distinct c.user_id from public.charaktere c join public.personen p on p.user_id = c.person_id
     where c.art = 'mandant' and c.status = 'frei' and p.status = 'frei' and c.user_id is not null
       and c.user_id is distinct from auth.uid()
       and (c.mandant_id = p_mandant
            or (p_akte is not null and c.mandant_id in (
                  select mandant_id from public.akten where id = p_akte
                  union select mandant_id from public.akten_mandanten where akte_id = p_akte)))
  loop
    insert into public.benachrichtigungen (user_id, art, text, link, akte_id, von)
    values (v, p_art, left(p_text, 400), p_link, p_akte, null);
  end loop;
end $$;
revoke execute on function public._portal_benachrichtigen(uuid, uuid, text, text, text) from public, anon, authenticated;

-- Verlauf: Eintrag für den Mandanten freigegeben
create or replace function public.portal_hinweis_eintrag()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_nr text;
begin
  if new.fuer_mandant and new.mandant_id is null and (tg_op = 'INSERT' or not old.fuer_mandant) then
    select number into v_nr from public.akten where id = new.akte_id;
    perform public._portal_benachrichtigen(new.akte_id, null, 'portal',
      'Neue Mitteilung der Kanzlei in Ihrer Akte ' || coalesce(v_nr, '') || ': „' || public.auszug(new.text) || '“',
      '#/akte/' || new.akte_id);
  end if;
  return null;
end $$;
drop trigger if exists portal_hinweis on public.eintraege;
create trigger portal_hinweis after insert or update of fuer_mandant on public.eintraege
  for each row execute function public.portal_hinweis_eintrag();

-- Beweise: für den Mandanten freigegeben
create or replace function public.portal_hinweis_beweis()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_nr text;
begin
  if new.fuer_mandant and (tg_op = 'INSERT' or not old.fuer_mandant) then
    select number into v_nr from public.akten where id = new.akte_id;
    perform public._portal_benachrichtigen(new.akte_id, null, 'portal',
      'Neues Dokument in Ihrer Akte ' || coalesce(v_nr, '') || ': ' || public.auszug(new.titel, 80),
      '#/akte/' || new.akte_id);
  end if;
  return null;
end $$;
drop trigger if exists portal_hinweis on public.beweise;
create trigger portal_hinweis after insert or update of fuer_mandant on public.beweise
  for each row execute function public.portal_hinweis_beweis();

-- Termine: neu oder verschoben
create or replace function public.portal_hinweis_termin()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_nr text;
  v_wann text := to_char(new.beginn at time zone 'Europe/Berlin', 'DD.MM.YYYY, HH24:MI') || ' Uhr';
begin
  if new.akte_id is null or new.erledigt or not public._portal_termin_sichtbar(new.art) then return null; end if;
  select number into v_nr from public.akten where id = new.akte_id;
  if tg_op = 'INSERT' then
    perform public._portal_benachrichtigen(new.akte_id, null, 'portal',
      'Neuer Termin in Ihrer Akte ' || coalesce(v_nr, '') || ': ' || public.auszug(new.titel, 80) || ' – ' || v_wann,
      '#/akte/' || new.akte_id);
  elsif new.beginn is distinct from old.beginn then
    perform public._portal_benachrichtigen(new.akte_id, null, 'portal',
      'Termin verschoben (' || coalesce(v_nr, '') || '): ' || public.auszug(new.titel, 80) || ' – jetzt ' || v_wann,
      '#/akte/' || new.akte_id);
  end if;
  return null;
end $$;
drop trigger if exists portal_hinweis on public.termine;
create trigger portal_hinweis after insert or update of beginn on public.termine
  for each row execute function public.portal_hinweis_termin();

-- Rechnungen: neue Rechnung an den Mandanten
create or replace function public.portal_hinweis_rechnung()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.mandant_id is not null and new.status = 'Offen' then
    perform public._portal_benachrichtigen(null, new.mandant_id, 'portal',
      'Neue Rechnung ' || coalesce(new.nummer, '') || coalesce(' – ' || public.auszug(new.betreff, 60), ''),
      '#/rechnungen');
  end if;
  return null;
end $$;
drop trigger if exists portal_hinweis on public.rechnungen;
create trigger portal_hinweis after insert on public.rechnungen
  for each row execute function public.portal_hinweis_rechnung();

-- Akte: Status, Haft oder Ergebnis geändert
create or replace function public.portal_hinweis_akte()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_text text;
begin
  if new.ergebnis is not null and new.ergebnis is distinct from old.ergebnis then
    v_text := 'Ergebnis in Ihrer Akte ' || coalesce(new.number, '') || ': ' || new.ergebnis;
  elsif new.status is distinct from old.status then
    v_text := 'Ihre Akte ' || coalesce(new.number, '') || ' ist jetzt „' || new.status || '“';
  elsif new.in_haft is distinct from old.in_haft and not new.in_haft then
    v_text := 'Akte ' || coalesce(new.number, '') || ': Haft beendet';
  end if;
  if v_text is not null then
    perform public._portal_benachrichtigen(new.id, null, 'portal', v_text, '#/akte/' || new.id);
  end if;
  return null;
end $$;
drop trigger if exists portal_hinweis on public.akten;
create trigger portal_hinweis after update of status, ergebnis, in_haft on public.akten
  for each row execute function public.portal_hinweis_akte();


-- Zur Kontrolle
select (select count(*) from public.charaktere where art = 'mandant') as mandanten_zugaenge,
       (select count(*) from public.akten_mandanten) as freigeschaltete_akten;
