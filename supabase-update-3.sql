-- =============================================================
--  Wiwang Law – Update 3: Buchhaltung (doppelte Buchführung)
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: supabase-update-2.sql wurde
--  schon ausgeführt. Kann gefahrlos mehrfach ausgeführt werden.
--
--  Kontenrahmen, Grundbuch (Journal) mit unveränderbaren Buchungen,
--  automatische Buchung von Rechnungen und Zahlungseingängen.
-- =============================================================


-- ---------- Kontenrahmen ----------
create table if not exists public.konten (
  id         uuid primary key default gen_random_uuid(),
  nummer     text not null unique,
  name       text not null,
  typ        text not null check (typ in ('Aktiv', 'Passiv', 'Aufwand', 'Ertrag')),
  created_at timestamptz not null default now()
);

-- Startkonten (angelehnt an SKR 03, für eine RP-Kanzlei vereinfacht).
-- Konten mit 2xxx gelten als Eigenkapital.
insert into public.konten (nummer, name, typ) values
  ('0200', 'Büroausstattung',                  'Aktiv'),
  ('0320', 'Fahrzeuge',                        'Aktiv'),
  ('1000', 'Kasse',                            'Aktiv'),
  ('1200', 'Bank',                             'Aktiv'),
  ('1400', 'Forderungen aus Mandaten',         'Aktiv'),
  ('2000', 'Eigenkapital',                     'Passiv'),
  ('2100', 'Privatentnahmen',                  'Passiv'),
  ('2200', 'Privateinlagen',                   'Passiv'),
  ('3000', 'Verbindlichkeiten',                'Passiv'),
  ('3100', 'Darlehen',                         'Passiv'),
  ('4000', 'Gehälter',                         'Aufwand'),
  ('4100', 'Miete Kanzleiräume',               'Aufwand'),
  ('4200', 'Fahrzeugkosten',                   'Aufwand'),
  ('4300', 'Bürobedarf',                       'Aufwand'),
  ('4400', 'Bewirtung & Repräsentation',       'Aufwand'),
  ('4500', 'Gebühren & Strafen',               'Aufwand'),
  ('4900', 'Sonstiger Aufwand',                'Aufwand'),
  ('8000', 'Honorarerlöse',                    'Ertrag'),
  ('8100', 'Sonstige Erlöse',                  'Ertrag')
on conflict (nummer) do nothing;


-- ---------- Grundbuch (Journal) ----------
create table if not exists public.buchungen (
  id          uuid primary key default gen_random_uuid(),
  nummer      text unique,
  datum       date not null default current_date,
  beleg       text,
  text        text not null,
  soll        uuid not null references public.konten(id),
  haben       uuid not null references public.konten(id),
  betrag      numeric(14, 2) not null check (betrag > 0),
  rechnung_id uuid references public.rechnungen(id) on delete set null,
  storno_von  uuid references public.buchungen(id),
  created_at  timestamptz not null default now(),
  created_by  text default (auth.jwt() ->> 'email'),
  check (soll <> haben)
);
create index if not exists buchungen_datum_idx    on public.buchungen (datum);
create index if not exists buchungen_rechnung_idx on public.buchungen (rechnung_id);
create unique index if not exists buchungen_ein_storno on public.buchungen (storno_von) where storno_von is not null;

-- Buchungsnummer automatisch (B-2026-0001, …) nach Jahr des Buchungsdatums
create or replace function public.set_buchungsnummer()
returns trigger language plpgsql as $$
declare
  prefix text := 'B-' || to_char(coalesce(new.datum, current_date), 'YYYY') || '-';
  n int;
begin
  if new.nummer is not null and new.nummer <> '' then return new; end if;
  perform pg_advisory_xact_lock(hashtext('wiwang_buchungsnummer'));
  select coalesce(max(substring(nummer from length(prefix) + 1)::int), 0) + 1
    into n from public.buchungen where nummer ~ ('^' || prefix || '[0-9]+$');
  new.nummer := prefix || lpad(n::text, 4, '0');
  return new;
end $$;

drop trigger if exists buchungen_nummer on public.buchungen;
create trigger buchungen_nummer before insert on public.buchungen
  for each row execute function public.set_buchungsnummer();


-- ---------- Zugriff ----------
-- Lesen: alle Mitglieder. Buchen und Konten anlegen: nur der Admin.
-- Buchungen können von NIEMANDEM geändert oder gelöscht werden (GoB) –
-- Korrekturen nur per Storno-Buchung.
alter table public.konten    enable row level security;
alter table public.buchungen enable row level security;

drop policy if exists "Konten lesen" on public.konten;
create policy "Konten lesen" on public.konten for select to authenticated using (true);
drop policy if exists "Konten anlegen (Admin)" on public.konten;
create policy "Konten anlegen (Admin)" on public.konten for insert to authenticated with check (public.is_admin());
drop policy if exists "Konten umbenennen (Admin)" on public.konten;
create policy "Konten umbenennen (Admin)" on public.konten for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Buchungen lesen" on public.buchungen;
create policy "Buchungen lesen" on public.buchungen for select to authenticated using (true);
drop policy if exists "Buchen (Admin)" on public.buchungen;
create policy "Buchen (Admin)" on public.buchungen for insert to authenticated with check (public.is_admin());


-- ---------- Rechnungen automatisch buchen ----------
-- Soll-Zustand je Rechnung: Erlös gebucht (Offen/Bezahlt) und Zahlung gebucht (Bezahlt).
-- Bei jeder Änderung wird nur die Differenz gebucht – so bleibt alles nachvollziehbar.
create or replace function public.buche_rechnung()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  ford  uuid := (select id from public.konten where nummer = '1400');
  erl   uuid := (select id from public.konten where nummer = '8000');
  bank  uuid := (select id from public.konten where nummer = '1200');
  r_alt numeric := 0; p_alt numeric := 0; r_neu numeric := 0; p_neu numeric := 0;
  d numeric;
  rec   public.rechnungen;
  rid   uuid;
  tag   text;
begin
  if ford is null or erl is null or bank is null then return null; end if;

  if tg_op in ('UPDATE', 'DELETE') then
    r_alt := case when old.status in ('Offen', 'Bezahlt') then old.summe else 0 end;
    p_alt := case when old.status = 'Bezahlt' then old.summe else 0 end;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    r_neu := case when new.status in ('Offen', 'Bezahlt') then new.summe else 0 end;
    p_neu := case when new.status = 'Bezahlt' then new.summe else 0 end;
    rec := new;
    rid := new.id;
  else
    rec := old;
    rid := null;  -- Rechnung ist gelöscht
  end if;
  tag := rec.nummer || ' – ' || rec.empfaenger;

  d := r_neu - r_alt;
  if d > 0 then
    insert into public.buchungen (datum, beleg, text, soll, haben, betrag, rechnung_id)
    values (case when tg_op = 'INSERT' then rec.datum else current_date end, rec.nummer,
            case when tg_op = 'INSERT' then 'Rechnung ' else 'Rechnung erhöht ' end || tag, ford, erl, d, rid);
  elsif d < 0 then
    insert into public.buchungen (datum, beleg, text, soll, haben, betrag, rechnung_id)
    values (current_date, rec.nummer,
            case when tg_op = 'DELETE' then 'Rechnung gelöscht ' when rec.status = 'Storniert' then 'Storno Rechnung ' else 'Rechnung gemindert ' end || tag,
            erl, ford, -d, rid);
  end if;

  d := p_neu - p_alt;
  if d > 0 then
    insert into public.buchungen (datum, beleg, text, soll, haben, betrag, rechnung_id)
    values (coalesce(rec.bezahlt_am, current_date), rec.nummer, 'Zahlungseingang ' || tag, bank, ford, d, rid);
  elsif d < 0 then
    insert into public.buchungen (datum, beleg, text, soll, haben, betrag, rechnung_id)
    values (current_date, rec.nummer, 'Zahlung zurückgenommen ' || tag, ford, bank, -d, rid);
  end if;
  return null;
end $$;

drop trigger if exists rechnungen_buchen on public.rechnungen;
create trigger rechnungen_buchen after insert or update or delete on public.rechnungen
  for each row execute function public.buche_rechnung();

-- Bestehende Rechnungen einmalig nachbuchen (nur solche ohne Buchungen)
insert into public.buchungen (datum, beleg, text, soll, haben, betrag, rechnung_id, created_by)
select r.datum, r.nummer, 'Rechnung ' || r.nummer || ' – ' || r.empfaenger,
       (select id from public.konten where nummer = '1400'), (select id from public.konten where nummer = '8000'),
       r.summe, r.id, r.created_by
  from public.rechnungen r
 where r.status in ('Offen', 'Bezahlt') and r.summe > 0
   and not exists (select 1 from public.buchungen b where b.rechnung_id = r.id)
 order by r.datum, r.nummer;

insert into public.buchungen (datum, beleg, text, soll, haben, betrag, rechnung_id, created_by)
select coalesce(r.bezahlt_am, r.datum), r.nummer, 'Zahlungseingang ' || r.nummer || ' – ' || r.empfaenger,
       (select id from public.konten where nummer = '1200'), (select id from public.konten where nummer = '1400'),
       r.summe, r.id, r.created_by
  from public.rechnungen r
 where r.status = 'Bezahlt' and r.summe > 0
   and not exists (select 1 from public.buchungen b
                    where b.rechnung_id = r.id and b.soll = (select id from public.konten where nummer = '1200'))
 order by coalesce(r.bezahlt_am, r.datum), r.nummer;


-- ---------- Änderungsprotokoll & Live-Updates ----------
drop trigger if exists protokoll on public.buchungen;
create trigger protokoll after insert or update or delete on public.buchungen
  for each row execute function public.protokolliere();

do $$
declare t text;
begin
  foreach t in array array['konten', 'buchungen'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Zur Kontrolle
select (select count(*) from public.konten) as konten,
       (select count(*) from public.buchungen) as buchungen;
