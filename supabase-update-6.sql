-- =============================================================
--  Wiwang Law – Update 6: KI-Assistent
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 bis 5.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  Neues Recht "ki_assistent" (KI-Assistent nutzen). Es wird einmalig
--  nur dem Rang "Chairman" gegeben; weitere Ränge kann der Admin unter
--  Personal → Ränge & Berechtigungen freischalten.
--  Die KI selbst läuft in der Edge Function "ki-assistent"
--  (supabase/functions/ki-assistent), der Google-Schlüssel liegt dort
--  als Secret GEMINI_API_KEY – nie im Browser.
-- =============================================================


-- ---------- Recht einmalig dem Chairman geben ----------
do $$
begin
  if coalesce((select daten ->> 'ki_recht_vergeben' from public.einstellungen where id = 1), '') <> 'ja' then
    update public.raenge
       set berechtigungen = berechtigungen || '["ki_assistent"]'::jsonb
     where name = 'Chairman' and not berechtigungen ? 'ki_assistent';
    update public.einstellungen set daten = daten || '{"ki_recht_vergeben":"ja"}'::jsonb where id = 1;
  end if;
end $$;


-- ---------- Nutzung der KI (für das Tageslimit je Mitglied) ----------
create table if not exists public.ki_nutzung (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  zeit       timestamptz not null default now(),
  akte_id    uuid references public.akten(id) on delete set null,
  tokens_ein int,
  tokens_aus int
);
create index if not exists ki_nutzung_user_zeit_idx on public.ki_nutzung (user_id, zeit desc);

alter table public.ki_nutzung enable row level security;
drop policy if exists "Lesen" on public.ki_nutzung;
create policy "Lesen" on public.ki_nutzung for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Anlegen" on public.ki_nutzung;
create policy "Anlegen" on public.ki_nutzung for insert to authenticated
  with check (user_id = auth.uid() and public.hat_recht('ki_assistent'));
-- Ändern/Löschen: niemand (außer im SQL Editor)


-- Zur Kontrolle: Wer darf den KI-Assistenten nutzen?
select name as rang from public.raenge where berechtigungen ? 'ki_assistent' order by sortierung;
