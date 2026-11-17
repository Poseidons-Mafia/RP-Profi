-- =============================================================
--  Wiwang Law – Update 9: Nigels Arbeitsbereich
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 bis 8.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  Neu:
--  - Gespeicherte Chats mit Nigel (ki_chats, ki_nachrichten).
--    Jeder sieht nur seine eigenen Chats. Ein Chat hat einen
--    Arbeitsmodus, mehrere Akten und angeheftete Paragraphen als
--    Kontext, eigene Notizen zum Sachverhalt und einen Entwurf.
--  - Persönliche Einstellungen für Nigel (ki_profil): Anrede,
--    Ton, Antwortlänge, Gründlichkeit, Standardmodus.
--  - Vorlagen (ki_vorlagen): eigene und kanzleiweite Aufträge.
--    Kanzleiweite pflegt, wer die Kanzlei-Einstellungen bearbeiten darf.
--  - Gewichtete Nutzung: aufwendige Modi (z. B. Gutachten) können
--    beim Tageslimit mehrfach zählen (ki_nutzung.gewicht).
--  Die Kanzlei-Vorgaben für Nigel (Hausregeln, erlaubte Modi,
--  Gewichte) liegen in den Kanzlei-Einstellungen (einstellungen.daten.nigel).
-- =============================================================


-- ---------- Chats ----------
create table if not exists public.ki_chats (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titel         text not null default 'Neue Aufgabe',
  modus         text not null default 'frage',
  akte_ids      uuid[] not null default '{}',
  paragraph_ids uuid[] not null default '{}',
  notiz         text not null default '',
  entwurf       text not null default '',
  angeheftet    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists ki_chats_user_idx on public.ki_chats (user_id, updated_at desc);

drop trigger if exists ki_chats_updated_at on public.ki_chats;
create trigger ki_chats_updated_at before update on public.ki_chats
  for each row execute function public.setze_updated_at();

do $$
begin
  alter table public.ki_chats add constraint ki_chats_groesse_check
    check (length(titel) <= 200 and length(notiz) <= 20000 and length(entwurf) <= 60000
           and cardinality(akte_ids) <= 5 and cardinality(paragraph_ids) <= 20);
exception when duplicate_object then null;
end $$;


-- ---------- Nachrichten ----------
create table if not exists public.ki_nachrichten (
  id          uuid primary key default gen_random_uuid(),
  chat_id     uuid not null references public.ki_chats(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rolle       text not null check (rolle in ('nutzer', 'ki')),
  text        text not null default '',
  modus       text,
  quellen     jsonb not null default '[]',
  schritte    jsonb not null default '[]',
  vorschlag   boolean not null default false,   -- Antwort ist ein überarbeiteter Entwurf
  gekuerzt    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists ki_nachrichten_chat_idx on public.ki_nachrichten (chat_id, created_at);


-- ---------- Persönliche Einstellungen ----------
create table if not exists public.ki_profil (
  user_id       uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  einstellungen jsonb not null default '{}',
  updated_at    timestamptz not null default now()
);
drop trigger if exists ki_profil_updated_at on public.ki_profil;
create trigger ki_profil_updated_at before update on public.ki_profil
  for each row execute function public.setze_updated_at();


-- ---------- Vorlagen (user_id leer = kanzleiweit) ----------
create table if not exists public.ki_vorlagen (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  titel       text not null,
  text        text not null,
  modus       text not null default 'frage',
  sortierung  int not null default 100,
  created_at  timestamptz not null default now()
);


-- ---------- Rechte: jeder nur das Eigene ----------
alter table public.ki_chats       enable row level security;
alter table public.ki_nachrichten enable row level security;
alter table public.ki_profil      enable row level security;
alter table public.ki_vorlagen    enable row level security;

drop policy if exists "Eigene" on public.ki_chats;
create policy "Eigene" on public.ki_chats for all to authenticated
  using (user_id = auth.uid() and public.hat_recht('ki_assistent'))
  with check (user_id = auth.uid() and public.hat_recht('ki_assistent'));

drop policy if exists "Eigene" on public.ki_nachrichten;
create policy "Eigene" on public.ki_nachrichten for all to authenticated
  using (user_id = auth.uid() and public.hat_recht('ki_assistent'))
  with check (user_id = auth.uid() and public.hat_recht('ki_assistent')
              and exists (select 1 from public.ki_chats c where c.id = chat_id and c.user_id = auth.uid()));

drop policy if exists "Eigene" on public.ki_profil;
create policy "Eigene" on public.ki_profil for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Lesen" on public.ki_vorlagen;
create policy "Lesen" on public.ki_vorlagen for select to authenticated
  using (public.hat_recht('ki_assistent') and (user_id is null or user_id = auth.uid()));
drop policy if exists "Anlegen" on public.ki_vorlagen;
create policy "Anlegen" on public.ki_vorlagen for insert to authenticated
  with check (public.hat_recht('ki_assistent') and (user_id = auth.uid() or (user_id is null and public.hat_recht('einstellungen_schreiben'))));
drop policy if exists "Ändern" on public.ki_vorlagen;
create policy "Ändern" on public.ki_vorlagen for update to authenticated
  using (user_id = auth.uid() or (user_id is null and public.hat_recht('einstellungen_schreiben')))
  with check (user_id = auth.uid() or (user_id is null and public.hat_recht('einstellungen_schreiben')));
drop policy if exists "Löschen" on public.ki_vorlagen;
create policy "Löschen" on public.ki_vorlagen for delete to authenticated
  using (user_id = auth.uid() or (user_id is null and public.hat_recht('einstellungen_schreiben')));


-- =============================================================
--  Gewichtete Nutzung (Tageslimit)
-- =============================================================
alter table public.ki_nutzung add column if not exists gewicht int not null default 1;
alter table public.ki_nutzung add column if not exists modus   text;

-- Heute verbrauchte Anfragen des angemeldeten Mitglieds (Summe der Gewichte, Tag in UTC)
create or replace function public.ki_heute_genutzt()
returns int
language sql stable security invoker set search_path = ''
as $$
  select coalesce(sum(gewicht), 0)::int
    from public.ki_nutzung
   where user_id = auth.uid()
     and zeit >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
$$;
grant execute on function public.ki_heute_genutzt() to authenticated;


-- ---------- Ein paar kanzleiweite Vorlagen zum Start (nur einmal) ----------
do $$
begin
  if coalesce((select daten ->> 'ki_vorlagen_angelegt' from public.einstellungen where id = 1), '') <> 'ja' then
    insert into public.ki_vorlagen (user_id, titel, text, modus, sortierung) values
      (null, 'Haftprüfung vorbereiten', 'Bereite eine Haftprüfung für den Mandanten vor: Ist die Haft rechtmäßig, welche Paragraphen sind einschlägig, welche Argumente sprechen für eine Entlassung, und welche Unterlagen brauchen wir?', 'strategie', 10),
      (null, 'Akteneinsicht begründen', 'Entwirf einen Antrag auf Akteneinsicht an die Staatsanwaltschaft mit rechtlicher Begründung.', 'schriftsatz', 20),
      (null, 'Tatvorwürfe im Gutachtenstil', 'Prüfe jeden Tatvorwurf dieser Akte im Gutachtenstil (Obersatz, Definition, Subsumtion, Ergebnis) am Wortlaut der Paragraphen.', 'gutachten', 30),
      (null, 'Fragen an den Mandanten', 'Welche Fragen sollten wir dem Mandanten zum Sachverhalt noch stellen, um die Verteidigung vorzubereiten? Sortiere nach Wichtigkeit.', 'strategie', 40),
      (null, 'Frühere Fälle vergleichen', 'Suche in unseren Akten nach vergleichbaren Fällen (gleiche Tatvorwürfe) und fasse zusammen, wie sie ausgegangen sind und was wir daraus lernen können.', 'strategie', 50);
    update public.einstellungen set daten = daten || '{"ki_vorlagen_angelegt":"ja"}'::jsonb where id = 1;
  end if;
end $$;


-- Zur Kontrolle
select (select count(*) from public.ki_chats) as chats, (select count(*) from public.ki_vorlagen) as vorlagen;
