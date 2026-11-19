-- Szenario-Test für supabase-update-20.sql (Mandantenportal 2.0: Anliegen, Zahlung melden, Bewertung)
-- Läuft nach 20-mandantenportal.sql in derselben Test-Datenbank – nur lokal, siehe run.sh
\set ON_ERROR_STOP 1
\set QUIET 1
reset role;
create temp table m1 as select id as cid, user_id from public.charaktere where name = 'Tony Montana' and art = 'mandant';
create temp table m2 as select id as cid, user_id from public.charaktere where name = 'Manny Ribera' and art = 'mandant';
grant select on m1, m2 to authenticated;
delete from public.benachrichtigungen;
set role authenticated;

\echo '--- Anliegen: Mandant sendet'
select t.als((select user_id from m1));
select t.fehler($$select public.portal_anliegen_senden('quatsch', 'x')$$, 'Unbekannte Art');
select t.fehler($$select public.portal_anliegen_senden('mandat', ' ')$$, 'beschreiben');
select t.fehler($$select public.portal_anliegen_senden('rueckruf', 'Bitte anrufen', 'eeeeeeee-0000-0000-0000-00000000000b')$$, 'nicht gefunden');
select t.ok(public.portal_anliegen_senden('notruf', '', null, 'Mission Row PD') is not null, 'Notruf ohne Text geht');
select t.ok(public.portal_anliegen_senden('notruf', 'Nochmal', null, null) is not null, 'zweiter Notruf geht');
select t.fehler($$select public.portal_anliegen_senden('notruf', 'Dritter')$$, 'bereits eingegangen');
select t.ok(public.portal_anliegen_senden('rueckruf', 'Bitte um Rückruf', 'eeeeeeee-0000-0000-0000-00000000000a', 'ab 20 Uhr') is not null, 'Rückrufbitte zur Akte');
select t.ok(public.portal_anliegen_senden('mandat', 'Mein Auto wurde abgeschleppt') is not null, 'neues Mandat angefragt');
select t.ok(jsonb_array_length(public.portal_daten()->'anliegen') = 4, 'Portal zeigt 4 eigene Anliegen');
select t.ok(public.portal_daten()->'anliegen'->3->>'text' like 'Ich wurde festgenommen%', 'Notruf-Standardtext');
select t.ok((select count(*) from public.portal_anliegen) = 0, 'Mandant liest die Tabelle nicht direkt');
select t.fehler($$insert into public.portal_anliegen (charakter_id, art, text) values ((select cid from m1), 'notruf', 'x')$$, 'row-level security');
select t.fehler($$select public.portal_anliegen_bearbeiten((select id from public.portal_anliegen limit 1), 'erledigt')$$, 'Keine Berechtigung');

\echo '--- Anliegen: andere Mandanten sehen sie nicht'
select t.als((select user_id from m2));
select t.ok(jsonb_array_length(public.portal_daten()->'anliegen') = 0, 'M2 sieht Anliegen von M1 nicht');

\echo '--- Anliegen: Kanzlei'
select t.als('bbbbbbbb-0000-0000-0000-000000000002');
select t.ok((select count(*) from public.portal_anliegen) = 4, 'Palermo sieht alle Anliegen');
select t.ok((select count(*) from public.benachrichtigungen where text like '🚨 NOTRUF von Tony Montana – Mission Row PD%') = 1, 'Palermo per Notruf alarmiert');
select t.ok((select count(*) from public.benachrichtigungen where text like 'Tony Montana bittet um Rückruf (%' and art = 'mandant') = 1, 'Zuständiger bekommt die Rückrufbitte');
select t.ok((select count(*) from public.benachrichtigungen where text like '%neues Mandat%') = 1, 'Mandantenpflege bekommt Mandatsanfrage');
create temp table nr as select id from public.portal_anliegen where art = 'notruf' order by created_at limit 1;
select public.portal_anliegen_bearbeiten((select id from nr), 'angenommen');
select t.ok((select status from public.portal_anliegen where id = (select id from nr)) = 'angenommen'
        and (select bearbeiter from public.portal_anliegen where id = (select id from nr)) = 'bbbbbbbb-0000-0000-0000-000000000002', 'angenommen mit Bearbeiter');
select public.portal_anliegen_bearbeiten((select id from nr), 'erledigt', 'Bin unterwegs zum PD.');
select t.fehler($$select public.portal_anliegen_bearbeiten((select id from nr), 'weg')$$, 'Unbekannter Status');

select t.als((select user_id from m1));
select t.ok(exists (select 1 from public.benachrichtigungen where text like '%hat Ihren Notruf angenommen%'), 'Mandant: Notruf angenommen');
select t.ok(exists (select 1 from public.benachrichtigungen where text like '%geantwortet: „Bin unterwegs%' and link = '#/anliegen'), 'Mandant: Antwort');
select t.ok((select x->>'antwort' from jsonb_array_elements(public.portal_daten()->'anliegen') x where x->>'status' = 'erledigt') = 'Bin unterwegs zum PD.', 'Antwort im Portal');
select t.ok((select x->>'bearbeiter' from jsonb_array_elements(public.portal_daten()->'anliegen') x where x->>'status' = 'erledigt') = 'Niklas Palermo', 'Bearbeiter mit Namen');

\echo '--- Zahlung melden'
create temp table re as select (r->>'id')::uuid as id from jsonb_array_elements(public.portal_daten()->'rechnungen') r where (r->>'summe')::numeric = 500;
select t.fehler($$select public.portal_zahlung_melden((select id from public.rechnungen limit 1))$$, 'nicht gefunden');
select public.portal_zahlung_melden((select id from re), 'Bar übergeben');
select t.ok((select r->>'zahlung_gemeldet_am' from jsonb_array_elements(public.portal_daten()->'rechnungen') r where (r->>'id')::uuid = (select id from re)) is not null, 'Zahlung gemeldet');
select t.fehler($$select public.portal_zahlung_melden((select id from re))$$, 'bereits gemeldet');
select t.als((select user_id from m2));
select t.fehler($$select public.portal_zahlung_melden((select id from re))$$, 'nicht gefunden');
select t.als('bbbbbbbb-0000-0000-0000-000000000002');
select t.ok(exists (select 1 from public.benachrichtigungen where text like 'Tony Montana meldet: Rechnung % ($500) bezahlt – „Bar übergeben“'), 'Rechnungen-Team benachrichtigt');
update public.rechnungen set status = 'Bezahlt', bezahlt_am = current_date where id = (select id from re);
select t.als((select user_id from m1));
select t.ok(exists (select 1 from public.benachrichtigungen where text like 'Zahlung eingegangen%'), 'Mandant: Zahlung eingegangen');
select t.fehler($$select public.portal_zahlung_melden((select id from re))$$, 'nicht mehr offen');

\echo '--- Bewertung'
select t.fehler($$select public.portal_bewerten('eeeeeeee-0000-0000-0000-00000000000a', 5)$$, 'abgeschlossen');
select t.als('bbbbbbbb-0000-0000-0000-000000000002');
update public.akten set status = 'Geschlossen', ergebnis = 'Freispruch' where id = 'eeeeeeee-0000-0000-0000-00000000000a';
select t.als((select user_id from m1));
select t.fehler($$select public.portal_bewerten('eeeeeeee-0000-0000-0000-00000000000a', 6)$$, '1 bis 5');
select t.fehler($$select public.portal_bewerten('eeeeeeee-0000-0000-0000-00000000000b', 5)$$, 'nicht gefunden');
select public.portal_bewerten('eeeeeeee-0000-0000-0000-00000000000a', 4, 'Top Verteidigung');
select public.portal_bewerten('eeeeeeee-0000-0000-0000-00000000000a', 5, 'Doch volle Punktzahl');
select t.ok((public.portal_daten()->'akten'->0->'bewertung'->>'sterne')::int = 5, 'Bewertung geändert');
select t.als((select user_id from m2));
select public.portal_bewerten('eeeeeeee-0000-0000-0000-00000000000a', 3);
select t.ok((select a->'bewertung'->>'sterne' from jsonb_array_elements(public.portal_daten()->'akten') a where a->>'title' = 'Montana wg. Betrug') = '3', 'Mitmandant bewertet getrennt');
select t.als('bbbbbbbb-0000-0000-0000-000000000002');
select t.ok((select count(*) from public.portal_bewertungen) = 2, 'Kanzlei sieht beide Bewertungen');
select t.ok((select count(*) from public.benachrichtigungen where text like 'Tony Montana hat % mit ★★★★☆ bewertet: „Top Verteidigung“') = 1, 'Zuständiger nur einmal benachrichtigt');
reset role;
\echo 'ALLE TESTS BESTANDEN'
