-- =============================================================
--  Wiwang Law – Update 10: Kostenlimit pro KI-Anfrage
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 bis 9.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  Neu: Die Kosten jeder Anfrage an Nigel (in US-Dollar, wie OpenRouter
--  sie meldet) werden mitgeschrieben – je Anfrage (ki_nutzung) und je
--  Antwort im Arbeitsbereich (ki_nachrichten). Das Limit selbst stellt
--  man in Nigels Arbeitsbereich unter Einstellungen → Kanzlei-Vorgaben ein
--  ("Max. Kosten pro Anfrage"); es liegt in einstellungen.daten.nigel.kosten_max.
-- =============================================================

alter table public.ki_nutzung     add column if not exists kosten numeric(12, 6);
alter table public.ki_nachrichten add column if not exists kosten numeric(12, 6);

-- Heutige Kosten des angemeldeten Mitglieds (Tag in UTC)
create or replace function public.ki_kosten_heute()
returns numeric
language sql stable security invoker set search_path = ''
as $$
  select coalesce(sum(kosten), 0)
    from public.ki_nutzung
   where user_id = auth.uid()
     and zeit >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
$$;
grant execute on function public.ki_kosten_heute() to authenticated;

-- Zur Kontrolle
select count(*) as anfragen_heute, coalesce(sum(kosten), 0) as kosten_heute
  from public.ki_nutzung where zeit >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
