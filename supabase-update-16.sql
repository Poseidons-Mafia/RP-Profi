-- =============================================================
--  Wiwang Law – Update 16: Akten ohne Mandant
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 bis 15.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  Neu: Eine Akte braucht keinen Mandanten mehr (z. B. interne Akten,
--  Gutachten, Recherchen). Das Feld "Mandant" darf leer bleiben;
--  die Verknüpfung zur Kartei (mandant_id) war schon vorher optional.
-- =============================================================

alter table public.akten alter column client drop not null;

-- Leere Namen einheitlich als "kein Mandant" speichern
update public.akten set client = null where client is not null and trim(client) = '' and mandant_id is null;
