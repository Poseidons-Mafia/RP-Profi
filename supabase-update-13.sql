-- =============================================================
--  Wiwang Law – Update 13: KI-Budget in US-Dollar pro Monat
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 bis 12.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  Neu:
--  - Statt "Anfragen pro Tag" bekommt jedes Mitglied ein Budget in
--    US-Dollar pro Kalendermonat: Grundwert je Rang
--    (raenge.ki_budget_monat) plus Abweichung je Mitglied
--    (profiles.ki_budget_offset). Ändern darf nur der Admin.
--  - Kanzlei-Deckel: höchstens so viel geben alle zusammen im Monat aus
--    (einstellungen.ki_budget_monat, Standard 10 $). Ändern darf nur der Admin.
--  - ki_budget_status(): eigenes Budget, eigener Verbrauch, Deckel und
--    Verbrauch der ganzen Kanzlei im laufenden Monat (UTC).
--
--  Entfernt (Reste des alten Anfragen-Tageslimits aus der Gemini-Zeit):
--  raenge.ki_tageslimit (Standard 100), profiles.ki_limit_offset,
--  ki_nutzung.gewicht, ki_tageslimit(), ki_heute_genutzt(), ki_kosten_heute()
--  und die Gewichtung der Modi in den Kanzlei-Vorgaben.
-- =============================================================

-- ---------- Budget je Rang und Abweichung je Mitglied ----------
alter table public.raenge   add column if not exists ki_budget_monat  numeric(10, 2) not null default 2.50;
alter table public.profiles add column if not exists ki_budget_offset numeric(10, 2) not null default 0;

do $$ begin
  alter table public.raenge add constraint raenge_ki_budget_monat_check check (ki_budget_monat between 0 and 1000);
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table public.profiles add constraint profiles_ki_budget_offset_check check (ki_budget_offset between -1000 and 1000);
exception when duplicate_object then null;
end $$;

-- ---------- Kanzlei-Deckel pro Monat ----------
alter table public.einstellungen add column if not exists ki_budget_monat numeric(10, 2) not null default 10.00;
do $$ begin
  alter table public.einstellungen add constraint einstellungen_ki_budget_monat_check check (ki_budget_monat between 0 and 10000);
exception when duplicate_object then null;
end $$;

-- Nur der Admin darf den Deckel ändern (die übrigen Einstellungen weiterhin, wer sie bearbeiten darf)
create or replace function public.einstellungen_ki_budget_schutz()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(current_setting('request.jwt.claims', true), '') = '' or public.is_admin() then
    return new;
  end if;
  if new.ki_budget_monat is distinct from old.ki_budget_monat then
    raise exception 'Das KI-Budget der Kanzlei kann nur der Admin ändern';
  end if;
  return new;
end $$;
drop trigger if exists einstellungen_ki_budget_schutz on public.einstellungen;
create trigger einstellungen_ki_budget_schutz before update on public.einstellungen
  for each row execute function public.einstellungen_ki_budget_schutz();

-- Nur der Admin darf die Abweichung eines Mitglieds ändern (auch nicht am eigenen Profil)
drop trigger if exists profil_ki_limit_schutz on public.profiles;
create or replace function public.profil_ki_limit_schutz()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(current_setting('request.jwt.claims', true), '') = '' or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.ki_budget_offset := 0;
  elsif new.ki_budget_offset is distinct from old.ki_budget_offset then
    raise exception 'Das KI-Budget eines Mitglieds kann nur der Admin ändern';
  end if;
  return new;
end $$;
create trigger profil_ki_limit_schutz before insert or update on public.profiles
  for each row execute function public.profil_ki_limit_schutz();

-- ---------- Kosten dürfen nie negativ eingetragen werden (sonst ließe sich das Budget "zurückdrehen") ----------
do $$ begin
  alter table public.ki_nutzung add constraint ki_nutzung_kosten_check check (kosten is null or kosten >= 0);
exception when duplicate_object then null;
end $$;

-- ---------- Budget-Status des angemeldeten Mitglieds (Monat in UTC) ----------
-- Budget ohne Rang: 0 (der Admin kann per Abweichung trotzdem eines vergeben)
create or replace function public.ki_budget_status()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with monat as (select date_trunc('month', now() at time zone 'utc') at time zone 'utc' as beginn)
  select jsonb_build_object(
    'budget', greatest(0, coalesce((select r.ki_budget_monat from public.raenge r where r.id = pr.rang_id), 0) + coalesce(pr.ki_budget_offset, 0)),
    'genutzt', (select coalesce(sum(n.kosten), 0) from public.ki_nutzung n, monat
                 where n.user_id = auth.uid() and n.zeit >= monat.beginn),
    'kanzlei_budget', (select e.ki_budget_monat from public.einstellungen e where e.id = 1),
    'kanzlei_genutzt', (select coalesce(sum(n.kosten), 0) from public.ki_nutzung n, monat where n.zeit >= monat.beginn),
    'monat_beginn', (select beginn from monat)
  )
  from (select auth.uid() as uid) me
  left join public.profiles pr on pr.user_id = me.uid
  where public.hat_recht('ki_assistent') or public.is_admin();
$$;
revoke execute on function public.ki_budget_status() from public, anon;
grant  execute on function public.ki_budget_status() to authenticated;

-- ---------- Alte Reste entfernen ----------
drop function if exists public.ki_tageslimit();
drop function if exists public.ki_heute_genutzt();
drop function if exists public.ki_kosten_heute();
alter table public.raenge     drop column if exists ki_tageslimit;
alter table public.profiles   drop column if exists ki_limit_offset;
alter table public.ki_nutzung drop column if exists gewicht;
update public.einstellungen
   set daten = jsonb_set(daten, '{nigel}', (daten -> 'nigel') - 'gewichte')
 where id = 1 and daten -> 'nigel' ? 'gewichte';

-- Zur Kontrolle: Budget je Rang und Deckel
select name as rang, ki_budget_monat, berechtigungen ? 'ki_assistent' as ki_recht from public.raenge order by sortierung;
select ki_budget_monat as kanzlei_deckel from public.einstellungen where id = 1;
