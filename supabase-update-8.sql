-- =============================================================
--  Wiwang Law – Update 8: Gesetzestexte & KI-Limits
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 bis 7.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  Neu:
--  - Gesetzbücher (z. B. StGB, StVO, Waffengesetz) mit ihren
--    Paragraphen im Volltext. Auf der Website als Kacheln unter
--    "Gesetze". Lesen/Bearbeiten: dieselben Rechte wie das
--    Gesetzbuch (gesetzbuch_lesen / gesetzbuch_schreiben).
--  - Suchfunktionen, die der KI-Assistent als Werkzeuge nutzt:
--      gesetzbuecher_suchen(...)  – Gesetzbücher finden
--      paragraphen_suchen(...)    – einzelne Paragraphen finden
--    Beide laufen mit den Rechten des fragenden Mitglieds.
--  - KI-Tageslimit: Grundwert je Rang (raenge.ki_tageslimit) plus
--    Abweichung je Mitglied (profiles.ki_limit_offset). Ändern darf
--    beides nur der Admin (Personal → Ränge & Berechtigungen).
-- =============================================================


-- ---------- Gesetzbücher ----------
create table if not exists public.gesetzbuecher (
  id           uuid primary key default gen_random_uuid(),
  kuerzel      text not null,
  titel        text not null,
  beschreibung text,
  farbe        text,
  sortierung   int not null default 100,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists gesetzbuecher_kuerzel_idx on public.gesetzbuecher (lower(kuerzel));

drop trigger if exists gesetzbuecher_updated_at on public.gesetzbuecher;
create trigger gesetzbuecher_updated_at before update on public.gesetzbuecher
  for each row execute function public.setze_updated_at();


-- ---------- Paragraphen ----------
create table if not exists public.paragraphen (
  id            uuid primary key default gen_random_uuid(),
  gesetzbuch_id uuid not null references public.gesetzbuecher(id) on delete cascade,
  nummer        text not null,              -- z. B. "§ 12" oder "Art. 3"
  titel         text,                       -- Überschrift, z. B. "Körperverletzung"
  abschnitt     text,                       -- z. B. "Zweiter Abschnitt – Straftaten gegen das Leben"
  text          text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists paragraphen_buch_idx on public.paragraphen (gesetzbuch_id);
create index if not exists paragraphen_volltext_idx on public.paragraphen
  using gin (to_tsvector('german', coalesce(nummer, '') || ' ' || coalesce(titel, '') || ' ' || coalesce(abschnitt, '') || ' ' || coalesce(text, '')));

drop trigger if exists paragraphen_updated_at on public.paragraphen;
create trigger paragraphen_updated_at before update on public.paragraphen
  for each row execute function public.setze_updated_at();


-- ---------- Rechte (wie das bestehende Gesetzbuch) ----------
alter table public.gesetzbuecher enable row level security;
alter table public.paragraphen   enable row level security;

drop policy if exists "Lesen" on public.gesetzbuecher;
create policy "Lesen" on public.gesetzbuecher for select to authenticated using (public.hat_recht('gesetzbuch_lesen'));
drop policy if exists "Anlegen" on public.gesetzbuecher;
create policy "Anlegen" on public.gesetzbuecher for insert to authenticated with check (public.hat_recht('gesetzbuch_schreiben'));
drop policy if exists "Ändern" on public.gesetzbuecher;
create policy "Ändern" on public.gesetzbuecher for update to authenticated
  using (public.hat_recht('gesetzbuch_schreiben')) with check (public.hat_recht('gesetzbuch_schreiben'));
drop policy if exists "Löschen" on public.gesetzbuecher;
create policy "Löschen" on public.gesetzbuecher for delete to authenticated using (public.hat_recht('gesetzbuch_schreiben'));

drop policy if exists "Lesen" on public.paragraphen;
create policy "Lesen" on public.paragraphen for select to authenticated using (public.hat_recht('gesetzbuch_lesen'));
drop policy if exists "Anlegen" on public.paragraphen;
create policy "Anlegen" on public.paragraphen for insert to authenticated with check (public.hat_recht('gesetzbuch_schreiben'));
drop policy if exists "Ändern" on public.paragraphen;
create policy "Ändern" on public.paragraphen for update to authenticated
  using (public.hat_recht('gesetzbuch_schreiben')) with check (public.hat_recht('gesetzbuch_schreiben'));
drop policy if exists "Löschen" on public.paragraphen;
create policy "Löschen" on public.paragraphen for delete to authenticated using (public.hat_recht('gesetzbuch_schreiben'));


-- =============================================================
--  Werkzeuge für den KI-Assistenten
--  (security invoker: es gelten die Leserechte des Mitglieds)
-- =============================================================

-- "§ 12a", "12 a", "Art. 3", "§ 5 Abs. 2" → "12a" / "3" / "5" (zum Vergleichen von Paragraphennummern)
create or replace function public.paragraph_norm(p text)
returns text
language sql immutable set search_path = ''
as $$
  select lower(regexp_replace(
           regexp_replace(
             regexp_replace(coalesce(p, ''), '^\s*(§+|art\.?|artikel|paragraph|para\.?)\s*', '', 'i'),
             '\s*(,|\(|abs\.?|absatz|satz|s\.|nr\.?|ziff).*$', '', 'i'),
           '[^0-9a-zA-Z]', '', 'g'));
$$;

-- Freitext → ODER-Suche ("Raub mit Waffe" findet auch Texte, die nur "Waffe" enthalten; Treffer mit mehr Wörtern zuerst)
create or replace function public.such_anfrage(p text)
returns tsquery
language sql immutable set search_path = ''
as $$
  select nullif(replace(plainto_tsquery('german', coalesce(p, ''))::text, ' & ', ' | '), '')::tsquery;
$$;

-- Gesetzbücher finden (leerer Suchbegriff = alle)
create or replace function public.gesetzbuecher_suchen(p_suche text default null)
returns table (kuerzel text, titel text, beschreibung text, paragraphen bigint)
language sql stable security invoker set search_path = ''
as $$
  select g.kuerzel, g.titel, g.beschreibung,
         (select count(*) from public.paragraphen p where p.gesetzbuch_id = g.id)
    from public.gesetzbuecher g
   where coalesce(trim(p_suche), '') = ''
      or g.kuerzel ilike '%' || trim(p_suche) || '%'
      or g.titel ilike '%' || trim(p_suche) || '%'
      or coalesce(g.beschreibung, '') ilike '%' || trim(p_suche) || '%'
      or exists (select 1 from public.paragraphen p
                  where p.gesetzbuch_id = g.id
                    and to_tsvector('german', coalesce(p.nummer, '') || ' ' || coalesce(p.titel, '') || ' ' || coalesce(p.abschnitt, '') || ' ' || coalesce(p.text, '')) @@ public.such_anfrage(p_suche))
   order by g.sortierung, g.kuerzel;
$$;

-- Paragraphen finden: nach Gesetzbuch (Kürzel oder Titel), Paragraphennummer und/oder Suchbegriff
create or replace function public.paragraphen_suchen(
  p_suche      text default null,
  p_gesetzbuch text default null,
  p_nummer     text default null,
  p_limit      int  default 8
)
returns table (gesetzbuch text, gesetzbuch_titel text, nummer text, titel text, abschnitt text, text text, relevanz real)
language sql stable security invoker set search_path = ''
as $$
  with q as (
    select public.such_anfrage(p_suche) as tsq,
           nullif(trim(coalesce(p_suche, '')), '') as roh,
           nullif(public.paragraph_norm(p_nummer), '') as nr,
           nullif(trim(coalesce(p_gesetzbuch, '')), '') as buch
  ), treffer as (
    select g.kuerzel, g.titel as buch_titel, p.nummer, p.titel, p.abschnitt, p.text,
           (case when q.tsq is null then 0
                 else ts_rank(to_tsvector('german', coalesce(p.nummer, '') || ' ' || coalesce(p.titel, '') || ' ' || coalesce(p.abschnitt, '') || ' ' || coalesce(p.text, '')), q.tsq) end
            + case when q.roh is not null and p.titel ilike '%' || q.roh || '%' then 1 else 0 end)::real as rang
      from public.paragraphen p
      join public.gesetzbuecher g on g.id = p.gesetzbuch_id
      cross join q
     where (q.buch is null or g.kuerzel ilike q.buch or g.titel ilike '%' || q.buch || '%')
       and (q.nr is null or public.paragraph_norm(p.nummer) = q.nr)
       and (q.roh is null
            or to_tsvector('german', coalesce(p.nummer, '') || ' ' || coalesce(p.titel, '') || ' ' || coalesce(p.abschnitt, '') || ' ' || coalesce(p.text, '')) @@ q.tsq
            or p.titel ilike '%' || q.roh || '%'
            or p.text ilike '%' || q.roh || '%')
  )
  select kuerzel, buch_titel, nummer, titel, abschnitt, text, rang
    from treffer
   order by rang desc, kuerzel, length(public.paragraph_norm(nummer)), public.paragraph_norm(nummer)
   limit least(greatest(coalesce(p_limit, 8), 1), 20);
$$;

grant execute on function public.paragraph_norm(text) to authenticated;
grant execute on function public.such_anfrage(text) to authenticated;
grant execute on function public.gesetzbuecher_suchen(text) to authenticated;
grant execute on function public.paragraphen_suchen(text, text, text, int) to authenticated;


-- =============================================================
--  KI-Tageslimit: Grundwert je Rang + Abweichung je Mitglied
-- =============================================================
alter table public.raenge   add column if not exists ki_tageslimit   int not null default 100;
alter table public.profiles add column if not exists ki_limit_offset int not null default 0;

do $$
begin
  alter table public.raenge add constraint raenge_ki_tageslimit_check check (ki_tageslimit between 0 and 100000);
exception when duplicate_object then null;
end $$;
do $$
begin
  alter table public.profiles add constraint profiles_ki_limit_offset_check check (ki_limit_offset between -100000 and 100000);
exception when duplicate_object then null;
end $$;

-- Nur der Admin darf die Abweichung ändern (auch nicht am eigenen Profil)
create or replace function public.profil_ki_limit_schutz()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(current_setting('request.jwt.claims', true), '') = '' or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.ki_limit_offset := 0;
  elsif new.ki_limit_offset is distinct from old.ki_limit_offset then
    raise exception 'Das KI-Limit eines Mitglieds kann nur der Admin ändern';
  end if;
  return new;
end $$;

drop trigger if exists profil_ki_limit_schutz on public.profiles;
create trigger profil_ki_limit_schutz before insert or update on public.profiles
  for each row execute function public.profil_ki_limit_schutz();

-- Wirksames Tageslimit des angemeldeten Mitglieds:
-- Grundwert des Rangs (ohne Rang: 100) + persönliche Abweichung, mindestens 0
create or replace function public.ki_tageslimit()
returns int
language sql stable security definer set search_path = ''
as $$
  select greatest(0, coalesce((select r.ki_tageslimit from public.raenge r where r.id = pr.rang_id), 100) + coalesce(pr.ki_limit_offset, 0))
    from (select auth.uid() as uid) me
    left join public.profiles pr on pr.user_id = me.uid;
$$;
grant execute on function public.ki_tageslimit() to authenticated;


-- ---------- Live-Updates ----------
do $$
declare t text;
begin
  foreach t in array array['gesetzbuecher', 'paragraphen'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;


-- Zur Kontrolle
select name as rang, ki_tageslimit from public.raenge order by sortierung;
