-- =============================================================
--  Wiwang Law – Update 19: Sicherheits-Härtung
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 bis 18.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  Ändert nichts an Daten, Tabellen oder Rechten eingeloggter Mitglieder.
--
--  1. Datenbank-Funktionen nur noch für Angemeldete
--     Supabase erlaubt neuen Funktionen standardmäßig, auch ohne Login
--     (Rolle "anon") aufgerufen zu werden. Bisher waren 28 Funktionen mit
--     erhöhten Rechten (SECURITY DEFINER) so erreichbar, z. B. admin_konten
--     oder charakter_uebernehmen. Jede prüft zwar selbst, wer angemeldet
--     ist – trotzdem soll ohne Login gar nichts davon aufrufbar sein.
--     Die Website ruft Funktionen ohnehin erst nach der Anmeldung auf.
--     Auch künftige Funktionen sind ohne Login nicht mehr aufrufbar.
--
--  2. Feste Suchpfade für die Nummern-Trigger
--     set_aktenzeichen, set_buchungsnummer, set_rechnungsnummer und
--     setze_updated_at bekommen search_path = '' (wie alle übrigen
--     Funktionen). Sie nutzen bereits nur public.… – keine Verhaltensänderung.
-- =============================================================

-- ---------- 1. Funktionen: kein Aufruf ohne Login ----------
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
       and has_function_privilege('anon', p.oid, 'execute')
  loop
    -- Angemeldete behalten den Zugriff (falls er bisher nur über PUBLIC bestand)
    if has_function_privilege('authenticated', f.sig, 'execute') then
      execute format('grant execute on function %s to authenticated, service_role', f.sig);
    end if;
    execute format('revoke execute on function %s from public, anon', f.sig);
  end loop;
end $$;

-- Künftige Funktionen (angelegt im SQL Editor) ebenfalls nicht für "anon".
-- Angemeldete und die Edge Functions (service_role) erhalten sie weiterhin.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon;

-- ---------- 2. Feste Suchpfade ----------
alter function public.set_aktenzeichen()    set search_path = '';
alter function public.set_buchungsnummer()  set search_path = '';
alter function public.set_rechnungsnummer() set search_path = '';
alter function public.setze_updated_at()    set search_path = '';
