-- =============================================================
--  Wiwang Law – Datenbank einrichten
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen
--  und auf "Run" klicken. Nur einmal nötig.
-- =============================================================

-- Tabelle für die Akten
create table if not exists public.akten (
  id          uuid primary key default gen_random_uuid(),
  number      text unique,
  title       text not null,
  client      text not null,
  opponent    text,
  area        text,
  status      text not null default 'Offen',
  lawyer      text,
  summary     text,
  created_at  timestamptz not null default now(),
  created_by  text default (auth.jwt() ->> 'email')
);

-- Tabelle für die Verlaufseinträge einer Akte
create table if not exists public.eintraege (
  id          uuid primary key default gen_random_uuid(),
  akte_id     uuid not null references public.akten(id) on delete cascade,
  text        text not null,
  created_at  timestamptz not null default now(),
  author      text default (auth.jwt() ->> 'email')
);

-- Aktenzeichen automatisch vergeben (WL-2026-001, WL-2026-002, ...)
create or replace function public.set_aktenzeichen()
returns trigger language plpgsql as $$
declare
  prefix text := 'WL-' || to_char(now(), 'YYYY') || '-';
  n int;
begin
  if new.number is not null and new.number <> '' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('wiwang_aktenzeichen'));
  select coalesce(max(substring(number from length(prefix) + 1)::int), 0) + 1
    into n
    from public.akten
   where number ~ ('^' || prefix || '[0-9]+$');
  new.number := prefix || lpad(n::text, 3, '0');
  return new;
end $$;

drop trigger if exists akten_aktenzeichen on public.akten;
create trigger akten_aktenzeichen
  before insert on public.akten
  for each row execute function public.set_aktenzeichen();

-- Zugriff: nur eingeloggte Kanzlei-Mitglieder dürfen lesen und schreiben
alter table public.akten     enable row level security;
alter table public.eintraege enable row level security;

drop policy if exists "Kanzlei darf alles" on public.akten;
create policy "Kanzlei darf alles" on public.akten
  for all to authenticated using (true) with check (true);

drop policy if exists "Kanzlei darf alles" on public.eintraege;
create policy "Kanzlei darf alles" on public.eintraege
  for all to authenticated using (true) with check (true);

-- Live-Aktualisierung: Änderungen erscheinen sofort bei allen
do $$
begin
  alter publication supabase_realtime add table public.akten;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.eintraege;
exception when duplicate_object then null;
end $$;
