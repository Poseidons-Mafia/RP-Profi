-- =============================================================
--  Wiwang Law – Update 20: Mandantenportal 2.0
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 bis 19.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  Neu für Mandanten:
--  • Anliegen an die Kanzlei (Tabelle portal_anliegen)
--      – 🚨 Notruf („Ich wurde festgenommen“): alarmiert alle, die Akten
--        bearbeiten dürfen
--      – Neue Angelegenheit (Mandat anfragen): an alle, die Mandanten
--        bearbeiten dürfen
--      – Rückruf / Gesprächstermin (optional zu einer Akte): an die/den
--        Zuständige/n der Akte, sonst an die Mandantenpflege
--    Die Kanzlei nimmt das Anliegen an, erledigt es und kann eine Antwort
--    schreiben – der Mandant sieht Status und Antwort im Portal und wird
--    benachrichtigt.
--  • Zahlung melden: „Ich habe bezahlt“ an einer offenen Rechnung
--    (rechnungen.zahlung_gemeldet_am). Wer Rechnungen bearbeiten darf,
--    wird benachrichtigt. Wird die Rechnung als bezahlt markiert, erfährt
--    der Mandant das.
--  • Bewertung abgeschlossener Akten (Tabelle portal_bewertungen,
--    1–5 Sterne + Kommentar). Die/der Zuständige wird benachrichtigt.
--  • portal_daten() liefert zusätzlich: Anliegen, Bewertung je Akte,
--    gemeldete Zahlungen.
-- =============================================================

-- ---------- Tabellen ----------
create table if not exists public.portal_anliegen (
  id            uuid primary key default gen_random_uuid(),
  charakter_id  uuid not null references public.charaktere(id) on delete cascade,
  mandant_id    uuid references public.mandanten(id) on delete set null,
  akte_id       uuid references public.akten(id) on delete set null,
  art           text not null,                 -- notruf | mandat | rueckruf
  text          text not null,
  erreichbar    text,                          -- wo/wann erreichbar (z. B. "Mission Row PD", "ab 20 Uhr")
  status        text not null default 'offen', -- offen | angenommen | erledigt
  bearbeiter    uuid references auth.users(id) on delete set null,
  antwort       text,
  bearbeitet_am timestamptz,
  created_at    timestamptz not null default now()
);
do $$ begin
  alter table public.portal_anliegen add constraint portal_anliegen_art_check check (art in ('notruf', 'mandat', 'rueckruf'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.portal_anliegen add constraint portal_anliegen_status_check check (status in ('offen', 'angenommen', 'erledigt'));
exception when duplicate_object then null; end $$;
create index if not exists portal_anliegen_charakter on public.portal_anliegen (charakter_id, created_at desc);
create index if not exists portal_anliegen_offen on public.portal_anliegen (status) where status <> 'erledigt';

alter table public.portal_anliegen enable row level security;
-- Lesen: wer Mandanten oder Akten lesen darf. Schreiben nur über die Funktionen unten.
drop policy if exists "Lesen" on public.portal_anliegen;
create policy "Lesen" on public.portal_anliegen for select to authenticated
  using (public.hat_recht('mandanten_lesen') or public.hat_recht('akten_lesen'));
do $$ begin
  alter publication supabase_realtime add table public.portal_anliegen;
exception when duplicate_object then null; when undefined_object then null; end $$;

create table if not exists public.portal_bewertungen (
  id          uuid primary key default gen_random_uuid(),
  akte_id     uuid not null references public.akten(id) on delete cascade,
  mandant_id  uuid not null references public.mandanten(id) on delete cascade,
  sterne      int not null,
  text        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (akte_id, mandant_id)
);
do $$ begin
  alter table public.portal_bewertungen add constraint portal_bewertungen_sterne_check check (sterne between 1 and 5);
exception when duplicate_object then null; end $$;
alter table public.portal_bewertungen enable row level security;
drop policy if exists "Lesen" on public.portal_bewertungen;
create policy "Lesen" on public.portal_bewertungen for select to authenticated
  using (public.hat_recht('mandanten_lesen') or public.hat_recht('akten_lesen'));
do $$ begin
  alter publication supabase_realtime add table public.portal_bewertungen;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- Rechnungen: Mandant meldet "bezahlt"
alter table public.rechnungen add column if not exists zahlung_gemeldet_am timestamptz;
alter table public.rechnungen add column if not exists zahlung_hinweis text;


-- ---------- Hilfen ----------
-- Der angemeldete, freigeschaltete Mandanten-Charakter (oder null)
create or replace function public._portal_charakter()
returns public.charaktere language sql stable security definer set search_path = ''
as $$
  select ch.* from public.charaktere ch join public.personen p on p.user_id = ch.person_id
   where ch.user_id = auth.uid() and ch.art = 'mandant' and ch.status = 'frei' and p.status = 'frei';
$$;
revoke execute on function public._portal_charakter() from public, anon, authenticated;

-- Alle aktiven Mitarbeiter mit einem Recht benachrichtigen
create or replace function public._team_benachrichtigen(p_recht text, p_text text, p_link text, p_akte uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v uuid;
begin
  for v in select pr.user_id from public.profiles pr where pr.status <> 'Ausgeschieden'
                                                     and public.nutzer_hat_recht(pr.user_id, p_recht) loop
    perform public.benachrichtige(v, 'mandant', p_text, p_link, p_akte, null);
  end loop;
end $$;
revoke execute on function public._team_benachrichtigen(text, text, text, uuid) from public, anon, authenticated;


-- =============================================================
--  Anliegen
-- =============================================================
create or replace function public.portal_anliegen_senden(p_art text, p_text text, p_akte uuid default null, p_erreichbar text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  c public.charaktere := public._portal_charakter();
  v_text text := trim(coalesce(p_text, ''));
  v_erreichbar text := nullif(left(trim(coalesce(p_erreichbar, '')), 200), '');
  v_id uuid;
  a public.akten;
  v_name text;
  v_kopf text;
begin
  if c.id is null then raise exception 'Kein freigeschalteter Mandanten-Zugang'; end if;
  if p_art not in ('notruf', 'mandat', 'rueckruf') then raise exception 'Unbekannte Art des Anliegens'; end if;
  if p_art = 'notruf' and v_text = '' then v_text := 'Ich wurde festgenommen und brauche einen Anwalt.'; end if;
  if length(v_text) < 2 then raise exception 'Bitte beschreiben Sie Ihr Anliegen'; end if;
  if length(v_text) > 2000 then raise exception 'Der Text ist zu lang (höchstens 2000 Zeichen)'; end if;
  if p_akte is not null and (c.mandant_id is null
       or not exists (select 1 from public._portal_akten(c.mandant_id) where akte_id = p_akte)) then
    raise exception 'Akte nicht gefunden';
  end if;
  if p_art = 'notruf' and (select count(*) from public.portal_anliegen
                             where charakter_id = c.id and art = 'notruf' and created_at > now() - interval '30 minutes') >= 2 then
    raise exception 'Ihr Notruf ist bereits eingegangen – die Kanzlei meldet sich so schnell wie möglich';
  end if;
  if (select count(*) from public.portal_anliegen where charakter_id = c.id and created_at > now() - interval '1 hour') >= 6 then
    raise exception 'Zu viele Anliegen – bitte später erneut versuchen';
  end if;

  insert into public.portal_anliegen (charakter_id, mandant_id, akte_id, art, text, erreichbar)
  values (c.id, c.mandant_id, p_akte, p_art, v_text, v_erreichbar) returning id into v_id;

  v_name := coalesce((select name from public.mandanten where id = c.mandant_id), c.name);
  if p_akte is not null then select * into a from public.akten where id = p_akte; end if;

  if p_art = 'notruf' then
    v_kopf := '🚨 NOTRUF von ' || v_name || coalesce(' (' || a.number || ')', '') || coalesce(' – ' || v_erreichbar, '')
              || ': „' || public.auszug(v_text) || '“';
    perform public._team_benachrichtigen('akten_schreiben', v_kopf, '#/mandanten/portal', p_akte);
  elsif p_art = 'mandat' then
    perform public._team_benachrichtigen('mandanten_schreiben',
      v_name || ' fragt ein neues Mandat an: „' || public.auszug(v_text) || '“', '#/mandanten/portal', null);
  else
    v_kopf := v_name || ' bittet um Rückruf' || coalesce(' (' || a.number || ')', '') || coalesce(' – ' || v_erreichbar, '')
              || ': „' || public.auszug(v_text) || '“';
    if a.zustaendig_id is not null and exists (select 1 from public.profiles where user_id = a.zustaendig_id and status <> 'Ausgeschieden') then
      perform public.benachrichtige(a.zustaendig_id, 'mandant', v_kopf, '#/mandanten/portal', a.id, null);
    else
      perform public._team_benachrichtigen('mandanten_schreiben', v_kopf, '#/mandanten/portal', p_akte);
    end if;
  end if;
  return v_id;
end $$;
revoke execute on function public.portal_anliegen_senden(text, text, uuid, text) from public, anon;
grant  execute on function public.portal_anliegen_senden(text, text, uuid, text) to authenticated;

-- Kanzlei: annehmen | erledigen | wieder öffnen, optional mit Antwort an den Mandanten
create or replace function public.portal_anliegen_bearbeiten(p_id uuid, p_status text, p_antwort text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  x public.portal_anliegen;
  v_user uuid;
  v_antwort text := nullif(left(trim(coalesce(p_antwort, '')), 2000), '');
  v_wer text;
  v_text text;
begin
  if not (public.hat_recht('mandanten_schreiben') or public.hat_recht('akten_schreiben')) then
    raise exception 'Keine Berechtigung';
  end if;
  if p_status not in ('offen', 'angenommen', 'erledigt') then raise exception 'Unbekannter Status'; end if;
  select * into x from public.portal_anliegen where id = p_id for update;
  if x.id is null then raise exception 'Anliegen nicht gefunden'; end if;

  update public.portal_anliegen
     set status = p_status,
         antwort = coalesce(v_antwort, antwort),
         bearbeiter = case when p_status = 'offen' then null else auth.uid() end,
         bearbeitet_am = case when p_status = 'offen' then null else now() end
   where id = p_id;

  -- Mandanten benachrichtigen
  select user_id into v_user from public.charaktere where id = x.charakter_id and status = 'frei';
  if v_user is null or p_status = 'offen' then return; end if;
  select coalesce(nullif(trim(anzeigename), ''), 'Die Kanzlei') into v_wer from public.profiles where user_id = auth.uid();
  v_wer := coalesce(v_wer, 'Die Kanzlei');
  v_text := case
    when v_antwort is not null then v_wer || ' hat auf Ihr Anliegen geantwortet: „' || public.auszug(v_antwort) || '“'
    when p_status = 'angenommen' and x.art = 'notruf' then v_wer || ' hat Ihren Notruf angenommen und kümmert sich.'
    when p_status = 'angenommen' then v_wer || ' kümmert sich um Ihr Anliegen.'
    else 'Ihr Anliegen wurde erledigt.' end;
  insert into public.benachrichtigungen (user_id, art, text, link, akte_id, von)
  values (v_user, 'portal', left(v_text, 400), '#/anliegen', x.akte_id, null);
end $$;
revoke execute on function public.portal_anliegen_bearbeiten(uuid, text, text) from public, anon;
grant  execute on function public.portal_anliegen_bearbeiten(uuid, text, text) to authenticated;


-- =============================================================
--  Zahlung melden
-- =============================================================
create or replace function public.portal_zahlung_melden(p_rechnung uuid, p_hinweis text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  c public.charaktere := public._portal_charakter();
  r public.rechnungen;
  v_hinweis text := nullif(left(trim(coalesce(p_hinweis, '')), 300), '');
begin
  if c.id is null or c.mandant_id is null then raise exception 'Kein freigeschalteter Mandanten-Zugang'; end if;
  select * into r from public.rechnungen where id = p_rechnung and mandant_id = c.mandant_id for update;
  if r.id is null then raise exception 'Rechnung nicht gefunden'; end if;
  if r.status <> 'Offen' then raise exception 'Diese Rechnung ist nicht mehr offen'; end if;
  if r.zahlung_gemeldet_am is not null and r.zahlung_gemeldet_am > now() - interval '1 hour' then
    raise exception 'Ihre Zahlung wurde bereits gemeldet';
  end if;
  update public.rechnungen set zahlung_gemeldet_am = now(), zahlung_hinweis = v_hinweis where id = r.id;
  perform public._team_benachrichtigen('rechnungen_schreiben',
    coalesce(r.empfaenger, 'Ein Mandant') || ' meldet: Rechnung ' || coalesce(r.nummer, '') || ' (' ||
    coalesce((select daten ->> 'waehrung' from public.einstellungen where id = 1), '$') || trim_scale(r.summe)::text || ') bezahlt' || coalesce(' – „' || public.auszug(v_hinweis, 120) || '“', ''),
    '#/finanzen/rechnungen', r.akte_id);
end $$;
revoke execute on function public.portal_zahlung_melden(uuid, text) from public, anon;
grant  execute on function public.portal_zahlung_melden(uuid, text) to authenticated;

-- Rechnung als bezahlt markiert → Mandant erfährt es
create or replace function public.portal_hinweis_bezahlt()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.mandant_id is not null and new.status = 'Bezahlt' and old.status is distinct from 'Bezahlt' then
    perform public._portal_benachrichtigen(null, new.mandant_id, 'portal',
      'Zahlung eingegangen: Rechnung ' || coalesce(new.nummer, '') || ' ist bezahlt. Vielen Dank!', '#/rechnungen');
  end if;
  return null;
end $$;
drop trigger if exists portal_hinweis_bezahlt on public.rechnungen;
create trigger portal_hinweis_bezahlt after update of status on public.rechnungen
  for each row execute function public.portal_hinweis_bezahlt();


-- =============================================================
--  Bewertung abgeschlossener Akten
-- =============================================================
create or replace function public.portal_bewerten(p_akte uuid, p_sterne int, p_text text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  c public.charaktere := public._portal_charakter();
  a public.akten;
  v_text text := nullif(left(trim(coalesce(p_text, '')), 1000), '');
  v_neu boolean;
begin
  if c.id is null or c.mandant_id is null then raise exception 'Kein freigeschalteter Mandanten-Zugang'; end if;
  if not exists (select 1 from public._portal_akten(c.mandant_id) where akte_id = p_akte) then raise exception 'Akte nicht gefunden'; end if;
  if p_sterne is null or p_sterne < 1 or p_sterne > 5 then raise exception 'Bitte 1 bis 5 Sterne vergeben'; end if;
  select * into a from public.akten where id = p_akte;
  if a.status <> 'Geschlossen' then raise exception 'Bewerten können Sie, sobald die Akte abgeschlossen ist'; end if;

  v_neu := not exists (select 1 from public.portal_bewertungen where akte_id = p_akte and mandant_id = c.mandant_id);
  insert into public.portal_bewertungen (akte_id, mandant_id, sterne, text)
  values (p_akte, c.mandant_id, p_sterne, v_text)
  on conflict (akte_id, mandant_id) do update set sterne = excluded.sterne, text = excluded.text, updated_at = now();

  if v_neu and a.zustaendig_id is not null then
    perform public.benachrichtige(a.zustaendig_id, 'mandant',
      coalesce((select name from public.mandanten where id = c.mandant_id), 'Ein Mandant') || ' hat ' || coalesce(a.number, 'eine Akte')
        || ' mit ' || repeat('★', p_sterne) || repeat('☆', 5 - p_sterne) || ' bewertet'
        || coalesce(': „' || public.auszug(v_text) || '“', ''),
      '#/mandanten/portal', a.id, null);
  end if;
end $$;
revoke execute on function public.portal_bewerten(uuid, int, text) from public, anon;
grant  execute on function public.portal_bewerten(uuid, int, text) to authenticated;


-- =============================================================
--  portal_daten(): wie Update 12, zusätzlich Anliegen, Bewertung,
--  gemeldete Zahlungen
-- =============================================================
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
               'bewertung', (select jsonb_build_object('sterne', bw.sterne, 'text', bw.text, 'am', bw.updated_at)
                               from public.portal_bewertungen bw where bw.akte_id = a.id and bw.mandant_id = c.mandant_id),
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
               'zahlung_gemeldet_am', r.zahlung_gemeldet_am,
               'akte_id', r.akte_id, 'akte_number', ra.number,
               'unterzeichner', coalesce(nullif(trim(up.anzeigename), ''), 'Wiwang Law'),
               'unterzeichner_titel', case when ur.id is null then up.titel
                                           when ur.ist_sonstiges then coalesce(nullif(up.rang_eigen, ''), ur.name) else ur.name end)
             order by r.datum desc, r.nummer desc)
        from public.rechnungen r
        left join public.akten ra on ra.id = r.akte_id
        left join public.profiles up on up.user_id = r.unterzeichner
        left join public.raenge ur on ur.id = up.rang_id
       where c.mandant_id is not null and r.mandant_id = c.mandant_id and r.status <> 'Storniert'), '[]'::jsonb),
    'anliegen', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', x.id, 'art', x.art, 'text', x.text, 'erreichbar', x.erreichbar, 'status', x.status,
               'akte_id', x.akte_id, 'antwort', x.antwort, 'bearbeitet_am', x.bearbeitet_am, 'created_at', x.created_at,
               'bearbeiter', case when bp.user_id is null then null
                                  else coalesce(nullif(trim(bp.anzeigename), ''), 'Kanzlei') end)
             order by x.created_at desc)
        from public.portal_anliegen x
        left join public.profiles bp on bp.user_id = x.bearbeiter
       where x.charakter_id = c.id and x.created_at > now() - interval '90 days'), '[]'::jsonb));
end $$;
revoke execute on function public.portal_daten() from public, anon;
grant  execute on function public.portal_daten() to authenticated;


-- Zur Kontrolle
select (select count(*) from public.portal_anliegen) as anliegen,
       (select count(*) from public.portal_bewertungen) as bewertungen,
       (select count(*) from information_schema.columns
         where table_schema = 'public' and table_name = 'rechnungen' and column_name = 'zahlung_gemeldet_am') as spalte_zahlung;
