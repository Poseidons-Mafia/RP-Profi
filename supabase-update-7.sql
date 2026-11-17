-- =============================================================
--  Wiwang Law – Update 7: Chronik, Lagebild, Phasen
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 bis 5.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  - Verlaufseinträge werden zu Chronik-Ereignissen mit Typ,
--    Zeitpunkt des Geschehens, Kurztitel, typabhängigen Angaben,
--    Bezügen (Personen, Beweise, Termin) und Strängen.
--  - Akten bekommen Phase, Lagebild (Stand + nächster Schritt)
--    und verbundene Akten.
--  - Das Änderungsprotokoll speichert Listen (z. B. Tatvorwürfe)
--    vollständig, damit die Chronik sie lesbar anzeigen kann.
-- =============================================================


-- ---------- Chronik-Ereignisse ----------
alter table public.eintraege add column if not exists typ       text not null default 'notiz';
alter table public.eintraege add column if not exists titel     text;
alter table public.eintraege add column if not exists zeitpunkt timestamptz;
alter table public.eintraege add column if not exists daten     jsonb not null default '{}'::jsonb;
alter table public.eintraege add column if not exists bezug     jsonb not null default '{}'::jsonb;
alter table public.eintraege add column if not exists eltern_id uuid references public.eintraege(id) on delete cascade;
alter table public.eintraege alter column text drop not null;

update public.eintraege set zeitpunkt = created_at where zeitpunkt is null;
alter table public.eintraege alter column zeitpunkt set default now();
alter table public.eintraege alter column zeitpunkt set not null;

-- Bisherige "Art" in den passenden Ereignistyp übersetzen
update public.eintraege set typ = case art
    when 'Telefonat'      then 'telefonat'
    when 'Gespräch'       then 'gespraech'
    when 'Gericht'        then 'gericht'
    when 'Polizei / StA'  then 'kontakt_behoerde'
    when 'Schriftverkehr' then 'schriftverkehr'
    when 'Intern'         then 'intern'
    else 'notiz' end
 where typ = 'notiz' and coalesce(art, 'Notiz') <> 'Notiz';

create index if not exists eintraege_akte_zeit_idx on public.eintraege (akte_id, zeitpunkt desc);
create index if not exists eintraege_eltern_idx    on public.eintraege (eltern_id);


-- ---------- Akten: Phase, Lagebild, verbundene Akten ----------
alter table public.akten add column if not exists phase             text;
alter table public.akten add column if not exists stand             text;
alter table public.akten add column if not exists stand_am          timestamptz;
alter table public.akten add column if not exists naechster_schritt text;
alter table public.akten add column if not exists verbunden         jsonb not null default '[]'::jsonb;


-- ---------- Änderungsprotokoll: Listen vollständig speichern ----------
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
        if jsonb_typeof(j -> k) in ('array', 'object') or jsonb_typeof(o -> k) in ('array', 'object') then
          -- Listen/Objekte (Tatvorwürfe, Angaben …) ganz speichern, solange sie nicht riesig sind
          if length(coalesce((o -> k)::text, '')) + length(coalesce((j -> k)::text, '')) <= 16000 then
            diff := diff || jsonb_build_object(k, jsonb_build_array(o -> k, j -> k));
          else
            diff := diff || jsonb_build_object(k, jsonb_build_array(left(o ->> k, 160), left(j ->> k, 160)));
          end if;
        else
          diff := diff || jsonb_build_object(k, jsonb_build_array(left(o ->> k, 160), left(j ->> k, 160)));
        end if;
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
    when 'eintraege'  then coalesce(nullif(j ->> 'titel', ''), nullif(j ->> 'text', ''), j ->> 'typ')
    else coalesce(j ->> 'titel', j ->> 'name', j ->> 'text')
  end, 160);

  insert into public.protokoll (tabelle, aktion, datensatz, akte_id, info, aenderungen)
  values (tg_table_name, tg_op, (j ->> 'id')::uuid, akte, info,
          case when tg_op = 'UPDATE' then diff end);
  return null;
end $$;


-- Zur Kontrolle
select column_name, data_type from information_schema.columns
 where table_schema = 'public' and table_name in ('eintraege', 'akten')
   and column_name in ('typ', 'titel', 'zeitpunkt', 'daten', 'bezug', 'eltern_id',
                       'phase', 'stand', 'stand_am', 'naechster_schritt', 'verbunden')
 order by table_name, column_name;
