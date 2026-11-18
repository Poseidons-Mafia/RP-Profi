-- =============================================================
--  Wiwang Law – Update 15: Anrede im eigenen Profil (pro Charakter)
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 bis 14.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  Neu: Wie Nigel jemanden anspricht, steht jetzt im eigenen Profil
--  ("Mein Profil") statt in Nigels Einstellungen. Jeder RP-Charakter hat
--  ein eigenes Profil und damit eine eigene Anrede:
--  Im Profil wählt man Herr / Frau / Keine Anrede (gespeichert als):
--    'sir'     – Herr → Nigel sagt „Sir“ (Standard)
--    'madam'   – Frau → Nigel sagt „Madam“
--    'neutral' – Keine Anrede → Nigel lässt die Anrede weg
--  Nigel nutzt sie überall – auch bei der Berechtigung „Nigel sehen“.
--  Bisher in Nigels Einstellungen gewählte Anreden werden übernommen.
-- =============================================================

alter table public.profiles add column if not exists anrede text not null default 'sir';

do $$ begin
  alter table public.profiles add constraint profiles_anrede_check check (anrede in ('sir', 'madam', 'neutral'));
exception when duplicate_object then null;
end $$;

-- Bisherige Wahl aus Nigels Einstellungen übernehmen (nur einmal: solange das Profil noch den Standard hat)
update public.profiles pr
   set anrede = k.einstellungen ->> 'anrede'
  from public.ki_profil k
 where k.user_id = pr.user_id
   and pr.anrede = 'sir'
   and k.einstellungen ->> 'anrede' in ('madam', 'neutral');

-- Zur Kontrolle
select anrede, count(*) as profile from public.profiles group by anrede order by anrede;
