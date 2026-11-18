-- Szenario-Test für supabase-update-12.sql (Mandantenportal) – nur lokal, siehe run.sh
-- Läuft nach 10-szenario.sql in derselben Test-Datenbank (nutzt deren Helfer t.*).
\set ON_ERROR_STOP 1
\set QUIET 1
reset role;

-- Ausgangslage: Kanzlei-Daten (als Datenbank-Eigentümer, ohne Anmeldung)
select set_config('request.jwt.claims', '{}', false);
insert into public.mandanten (id, name, telefon, notizen) values
  ('dddddddd-0000-0000-0000-00000000000a', 'Tony Montana', '555-1', 'zahlt bar, INTERN'),
  ('dddddddd-0000-0000-0000-00000000000b', 'Fremder Mandant', '555-2', null),
  ('dddddddd-0000-0000-0000-00000000000c', 'Manny Ribera', '555-3', null);
insert into public.akten (id, title, client, mandant_id, status, zustaendig_id, summary, vorwuerfe) values
  ('eeeeeeee-0000-0000-0000-00000000000a', 'Montana wg. Betrug', 'Tony Montana', 'dddddddd-0000-0000-0000-00000000000a', 'Offen',
   'bbbbbbbb-0000-0000-0000-000000000002', 'INTERNE STRATEGIE', '[{"paragraph":"§ 1","titel":"Betrug","anzahl":2,"geldstrafe":100,"haft":5,"gesetz_id":"x"}]'),
  ('eeeeeeee-0000-0000-0000-00000000000b', 'Fremde Akte', 'Fremder Mandant', 'dddddddd-0000-0000-0000-00000000000b', 'Offen', null, null, '[]'),
  ('eeeeeeee-0000-0000-0000-00000000000c', 'Ribera Zivilsache', 'Manny Ribera', 'dddddddd-0000-0000-0000-00000000000c', 'Offen', null, null, '[]');
insert into public.eintraege (akte_id, text, art, author, fuer_mandant) values
  ('eeeeeeee-0000-0000-0000-00000000000a', 'Interne Notiz', 'Intern', 'palermo@wiwang.de', false),
  ('eeeeeeee-0000-0000-0000-00000000000a', 'Hallo Herr Montana', 'Schriftverkehr', 'palermo@wiwang.de', true),
  ('eeeeeeee-0000-0000-0000-00000000000b', 'Fremd sichtbar', 'Notiz', 'palermo@wiwang.de', true);
insert into public.beweise (akte_id, titel, fuer_mandant) values
  ('eeeeeeee-0000-0000-0000-00000000000a', 'Internes Foto', false),
  ('eeeeeeee-0000-0000-0000-00000000000a', 'Anklageschrift', true);
insert into public.termine (akte_id, titel, art, beginn) values
  ('eeeeeeee-0000-0000-0000-00000000000a', 'Hauptverhandlung', 'Verhandlung', now() + interval '2 days'),
  ('eeeeeeee-0000-0000-0000-00000000000a', 'Frist Berufung', 'Frist', now() + interval '3 days'),
  ('eeeeeeee-0000-0000-0000-00000000000a', 'WV', 'Wiedervorlage', now() + interval '4 days');
insert into public.aufgaben (akte_id, text) values ('eeeeeeee-0000-0000-0000-00000000000a', 'Geheime Aufgabe');
insert into public.rechnungen (mandant_id, akte_id, empfaenger, summe, status) values
  ('dddddddd-0000-0000-0000-00000000000a', 'eeeeeeee-0000-0000-0000-00000000000a', 'Tony Montana', 500, 'Offen'),
  ('dddddddd-0000-0000-0000-00000000000a', null, 'Tony Montana', 50, 'Storniert'),
  ('dddddddd-0000-0000-0000-00000000000b', 'eeeeeeee-0000-0000-0000-00000000000b', 'Fremder Mandant', 900, 'Offen');

-- Discord-Personen: M1 nicht auf dem Server (wird Mandant), M2 Server-Mitglied
select t.discord('55555555-0000-0000-0000-000000000005', 'm1@mail.de', '105', false);
select t.discord('66666666-0000-0000-0000-000000000006', 'm2@mail.de', '106', true);

set role authenticated;

\echo '--- M1: Mandanten-Registrierung ohne Discord-Server'
select t.als('55555555-0000-0000-0000-000000000005');
select t.fehler($$select public.charakter_beantragen('Tony Montana')$$, 'nicht Mitglied');
select t.ok(public.charakter_beantragen('Tony  Montana', 'mandant', 'Az. WL-2026-001') is not null, 'M1 beantragt Mandanten-Zugang');
select t.ok(public.mein_konto()->'charaktere'->0->>'art' = 'mandant', 'mein_konto liefert Art mandant');
select t.ok(public.mein_konto()->'charaktere'->0->>'rang' = 'Mandant', 'Rang-Anzeige "Mandant"');
select t.fehler($$select public.charakter_zugang((public.mein_konto()->'charaktere'->0->>'id')::uuid)$$, 'wartet noch');
select t.fehler($$select public.portal_daten()$$, 'Kein freigeschalteter');
select t.fehler($$select public.charakter_beantragen('Andere', 'chef')$$, 'Unbekannte Art');
select t.fehler($$select public.charakter_beantragen('Andere', 'mandant')$$, 'wartet noch auf Freigabe');

\echo '--- Kanzlei: Antrag sehen und freigeben'
-- Palermo (Partner) darf Mandanten bearbeiten
select t.als('bbbbbbbb-0000-0000-0000-000000000002');
select t.ok(public.hat_recht('mandanten_schreiben'), 'Palermo darf Mandanten bearbeiten');
select t.ok((select count(*) from public.benachrichtigungen where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'
               and text like '%Mandantenportal%') = 1, 'Palermo über Portal-Antrag benachrichtigt');
create temp table mz as select (z->>'id')::uuid as cid, (z->>'vorschlag')::uuid as vorschlag
  from jsonb_array_elements(public.portal_zugaenge()) z where z->>'name' = 'Tony Montana';
select t.ok((select vorschlag from mz) = 'dddddddd-0000-0000-0000-00000000000a', 'Vorschlag: Kartei-Eintrag mit gleichem Namen');
select t.fehler($$select public.mandant_zugang((select cid from mz), 'verknuepfen', null)$$, 'aus der Kartei');
select public.mandant_zugang((select cid from mz), 'freigeben', 'dddddddd-0000-0000-0000-00000000000a');
reset role;
create temp table m1c as select user_id from public.charaktere where id = (select cid from mz);
grant select on mz, m1c to authenticated;
select t.ok((select user_id from m1c) is not null, 'Konto für Mandanten-Charakter angelegt');
select t.ok(not exists (select 1 from public.profiles where user_id = (select user_id from m1c)), 'Mandant bekommt KEIN Profil');
select t.ok((select email from auth.users where id = (select user_id from m1c)) like 'mandant-%@wiwang.de', 'Mandanten-E-Mail');
select t.ok((select status from public.personen where user_id = '55555555-0000-0000-0000-000000000005') = 'frei', 'Person freigegeben');
select t.ok((select discord from public.mandanten where id = 'dddddddd-0000-0000-0000-00000000000a') = 'user105', 'Discord in die Kartei übernommen');
set role authenticated;

\echo '--- M1: Wechsel ins Portal'
select t.als('55555555-0000-0000-0000-000000000005');
select t.ok((public.charakter_zugang((select cid from mz))->>'passwort') is not null, 'Wechsel ohne Server-Mitgliedschaft erlaubt');
select t.fehler($$select public.charakter_beantragen('Mitarbeiter Typ')$$, 'nicht Mitglied');
select t.fehler($$select public.charakter_beantragen('Zweiter Mandant', 'mandant')$$, 'schon einen Mandanten-Zugang');

select t.als((select user_id from m1c));
select t.ok(public.mein_konto()->>'art' = 'mandant', 'als Mandant angemeldet');
select t.ok(not public.ist_mitglied() and not public.is_admin(), 'Mandant ist kein Mitglied, kein Admin');
select t.ok(not public.hat_recht('akten_lesen') and not public.hat_recht('mandanten_lesen'), 'Mandant hat keine Rechte');
select t.ok((select count(*) from public.akten) = 0, 'sieht direkt keine Akten');
select t.ok((select count(*) from public.mandanten) = 0, 'sieht direkt keine Kartei');
select t.ok((select count(*) from public.eintraege) = 0 and (select count(*) from public.beweise) = 0, 'sieht direkt keinen Verlauf/Beweise');
select t.ok((select count(*) from public.termine) = 0 and (select count(*) from public.aufgaben) = 0, 'sieht direkt keine Termine/Aufgaben');
select t.ok((select count(*) from public.rechnungen) = 0 and (select count(*) from public.profiles) = 0, 'sieht direkt keine Rechnungen/Profile');
select t.ok((select count(*) from public.akten_mandanten) = 0 and (select count(*) from public.protokoll) = 0, 'sieht keine Freigaben/Historie');
select t.fehler($$insert into public.eintraege (akte_id, text) values ('eeeeeeee-0000-0000-0000-00000000000a', 'x')$$, 'row-level security');
select t.fehler($$select public.portal_zugaenge()$$, 'Keine Berechtigung');
select t.fehler($$select public.mandant_zugang((select cid from mz), 'sperren')$$, 'Keine Berechtigung');

create temp table pd as select public.portal_daten() as j;
select t.ok((select jsonb_array_length(j->'akten') from pd) = 1, 'Portal: genau eine Akte');
select t.ok((select j->'akten'->0->>'title' from pd) = 'Montana wg. Betrug', 'Portal: die eigene Akte');
select t.ok((select j->'akten'->0->>'rolle' from pd) = 'Mandant', 'Portal: Rolle Mandant');
select t.ok((select j->'akten'->0->>'zustaendig' from pd) = 'Niklas Palermo', 'Portal: Zuständiger mit Namen');
select t.ok((select j::text from pd) not like '%INTERNE STRATEGIE%', 'Portal: kein Sachverhalt');
select t.ok((select j::text from pd) not like '%Interne Notiz%' and (select j::text from pd) not like '%Fremd sichtbar%', 'Portal: keine internen/fremden Einträge');
select t.ok((select jsonb_array_length(j->'akten'->0->'verlauf') from pd) = 1, 'Portal: ein freigegebener Eintrag');
select t.ok((select j->'akten'->0->'verlauf'->0->>'von' from pd) = 'Niklas Palermo', 'Portal: Absender des Eintrags');
select t.ok((select jsonb_array_length(j->'akten'->0->'beweise') from pd) = 1, 'Portal: ein freigegebener Beweis');
select t.ok((select jsonb_array_length(j->'akten'->0->'termine') from pd) = 1, 'Portal: nur Verhandlung, keine Frist/Wiedervorlage');
select t.ok((select j::text from pd) not like '%Geheime Aufgabe%', 'Portal: keine Aufgaben');
select t.ok((select j->'akten'->0->'vorwuerfe'->0 ? 'gesetz_id' from pd) = false
         and (select j->'akten'->0->'vorwuerfe'->0->>'titel' from pd) = 'Betrug', 'Portal: Tatvorwürfe ohne interne IDs');
select t.ok((select jsonb_array_length(j->'rechnungen') from pd) = 1, 'Portal: nur eigene, nicht stornierte Rechnung');
select t.ok((select (j->'rechnungen'->0->>'summe')::numeric from pd) = 500, 'Portal: Rechnungsbetrag');
select t.ok((select j->'mandant'->>'telefon' from pd) = '555-1' and (select j::text from pd) not like '%zahlt bar%', 'Portal: Kontaktdaten ohne interne Notizen');

\echo '--- M1: Nachricht schreiben'
select t.fehler($$select public.portal_nachricht('eeeeeeee-0000-0000-0000-00000000000b', 'Hallo')$$, 'nicht gefunden');
select t.fehler($$select public.portal_nachricht('eeeeeeee-0000-0000-0000-00000000000a', ' ')$$, 'Nachricht eingeben');
select t.ok(public.portal_nachricht('eeeeeeee-0000-0000-0000-00000000000a', 'Wann ist die Verhandlung?') is not null, 'Nachricht gesendet');
select t.ok((select jsonb_array_length(public.portal_daten()->'akten'->0->'verlauf')) = 2, 'Nachricht erscheint im Portal-Verlauf');
select t.ok((public.portal_daten()->'akten'->0->'verlauf'->1->>'eigene')::boolean, 'als eigene Nachricht markiert');
select public.portal_kontakt('555-999', 'Vinewood 1');
select t.ok(public.portal_daten()->'mandant'->>'telefon' = '555-999', 'Telefon aktualisiert');
select t.ok(public.portal_gesehen() is null and public.portal_gesehen() is not null, 'zuletzt gesehen wird gemerkt');

\echo '--- Kanzlei: Nachricht kommt an, Freigaben lösen Hinweise aus'
select t.als('bbbbbbbb-0000-0000-0000-000000000002');
select t.ok((select count(*) from public.benachrichtigungen where user_id = 'bbbbbbbb-0000-0000-0000-000000000002' and art = 'mandant') = 1, 'Zuständiger über Nachricht benachrichtigt');
select t.ok((select count(*) from public.benachrichtigungen where user_id = 'bbbbbbbb-0000-0000-0000-000000000002' and art = 'eintrag' and text like '%Wann ist%') = 0, 'keine doppelte Benachrichtigung');
select t.ok((select art from public.eintraege where mandant_id is not null) = 'Mandant', 'Nachricht steht als "Mandant" im Verlauf');
insert into public.eintraege (akte_id, text, fuer_mandant) values ('eeeeeeee-0000-0000-0000-00000000000a', 'Verhandlung am Montag', true);
insert into public.eintraege (akte_id, text, fuer_mandant) values ('eeeeeeee-0000-0000-0000-00000000000a', 'Nur intern', false);
update public.akten set status = 'In Bearbeitung' where id = 'eeeeeeee-0000-0000-0000-00000000000a';
insert into public.termine (akte_id, titel, art, beginn) values ('eeeeeeee-0000-0000-0000-00000000000a', 'Neue WV', 'Wiedervorlage', now());
insert into public.rechnungen (mandant_id, empfaenger, summe) values ('dddddddd-0000-0000-0000-00000000000a', 'Tony Montana', 10);
-- Mitmandant: Ribera bekommt Einblick in Montanas Akte (für später)
insert into public.akten_mandanten (akte_id, mandant_id) values ('eeeeeeee-0000-0000-0000-00000000000a', 'dddddddd-0000-0000-0000-00000000000c');

select t.als((select user_id from m1c));
select t.ok((select count(*) from public.benachrichtigungen) = 3, 'Mandant: 3 Hinweise (Mitteilung, Status, Rechnung)');
select t.ok(exists (select 1 from public.benachrichtigungen where text like 'Neue Mitteilung%Verhandlung am Montag%'), 'Hinweis: neue Mitteilung');
select t.ok(not exists (select 1 from public.benachrichtigungen where text like '%Nur intern%' or text like '%WV%'), 'kein Hinweis auf Internes');

\echo '--- M2: Mitmandant'
select t.als('66666666-0000-0000-0000-000000000006');
select t.ok(public.charakter_beantragen('Manny Ribera', 'mandant') is not null, 'M2 beantragt Mandanten-Zugang');
select t.als('aaaaaaaa-0000-0000-0000-000000000001');  -- Admin über die Accounts-Seite
select public.admin_charakter((select (c->>'id')::uuid from jsonb_array_elements(public.admin_konten()->'personen') p,
                                 jsonb_array_elements(p->'charaktere') c where c->>'name' = 'Manny Ribera'), 'freigeben');
select t.ok((select (c->>'mandant_id')::uuid from jsonb_array_elements(public.admin_konten()->'personen') p,
               jsonb_array_elements(p->'charaktere') c where c->>'name' = 'Manny Ribera') = 'dddddddd-0000-0000-0000-00000000000c',
         'Admin-Freigabe verknüpft gleichnamigen Kartei-Eintrag');
reset role;
create temp table m2c as select id as cid, user_id from public.charaktere where name = 'Manny Ribera';
grant select on m2c to authenticated;
set role authenticated;
-- Verknüpfung ändern und zurück
select t.als('bbbbbbbb-0000-0000-0000-000000000002');
select public.mandant_zugang((select cid from m2c), 'verknuepfen', 'dddddddd-0000-0000-0000-00000000000b');
select public.mandant_zugang((select cid from m2c), 'verknuepfen', 'dddddddd-0000-0000-0000-00000000000c');
select t.als((select user_id from m2c));
select t.ok(public.mein_konto()->>'art' = 'mandant', 'M2 ist Mandant');
create temp table pd2 as select public.portal_daten() as j;
select t.ok((select jsonb_array_length(j->'akten') from pd2) = 2, 'M2 sieht eigene Akte + freigeschaltete Akte');
select t.ok((select a->>'rolle' from pd2, jsonb_array_elements(j->'akten') a where a->>'title' = 'Montana wg. Betrug') = 'Mitmandant', 'Rolle Mitmandant');
select t.ok((select jsonb_array_length(j->'rechnungen') from pd2) = 0, 'M2 sieht Montanas Rechnungen NICHT');
select t.ok((select a->'verlauf'->1->>'eigene' from pd2, jsonb_array_elements(j->'akten') a where a->>'title' = 'Montana wg. Betrug') = 'false', 'fremde Mandanten-Nachricht nicht als eigene');

\echo '--- Admin-Person: Mandanten-Charakter des Admins ist KEIN Admin'
reset role;
select t.discord('77777777-0000-0000-0000-000000000007', 'boss@mail.de', '107', true);
update public.personen set status = 'frei', ist_admin = true where user_id = '77777777-0000-0000-0000-000000000007';
set role authenticated;
select t.als('77777777-0000-0000-0000-000000000007');
select t.ok(public.charakter_beantragen('Boss Privat', 'mandant') is not null, 'Admin beantragt Mandanten-Zugang');
select t.als('aaaaaaaa-0000-0000-0000-000000000001');
select public.mandant_zugang((select (z->>'id')::uuid from jsonb_array_elements(public.portal_zugaenge()) z where z->>'name' = 'Boss Privat'), 'freigeben');
reset role;
create temp table m3c as select user_id from public.charaktere where name = 'Boss Privat';
grant select on m3c to authenticated;
set role authenticated;
select t.als((select user_id from m3c));
select t.ok(not public.is_admin() and not public.ist_mitglied(), 'Mandanten-Charakter des Admins hat keine Admin-Rechte');
select t.ok((select count(*) from public.akten) = 0, 'und sieht keine Akten');

\echo '--- Sperren'
select t.als('bbbbbbbb-0000-0000-0000-000000000002');
select public.mandant_zugang((select cid from mz), 'sperren');
select t.als('55555555-0000-0000-0000-000000000005');
select t.fehler($$select public.charakter_zugang((select cid from mz))$$, 'gesperrt');
select t.als((select user_id from m1c));
select t.fehler($$select public.portal_daten()$$, 'Kein freigeschalteter');
select t.fehler($$select public.portal_nachricht('eeeeeeee-0000-0000-0000-00000000000a', 'noch da?')$$, 'Kein freigeschalteter');
select t.als('bbbbbbbb-0000-0000-0000-000000000002');
select public.mandant_zugang((select cid from mz), 'entsperren');
select t.als((select user_id from m1c));
select t.ok(jsonb_array_length(public.portal_daten()->'akten') = 1, 'nach Entsperren wieder Zugang');

\echo '--- Ablehnen'
reset role;
select t.discord('88888888-0000-0000-0000-000000000008', 'troll@mail.de', '108', false);
set role authenticated;
select t.als('88888888-0000-0000-0000-000000000008');
select t.ok(public.charakter_beantragen('Troll Mandant', 'mandant') is not null, 'Troll beantragt');
select t.als('bbbbbbbb-0000-0000-0000-000000000002');
select public.mandant_zugang((select (z->>'id')::uuid from jsonb_array_elements(public.portal_zugaenge()) z where z->>'name' = 'Troll Mandant'), 'ablehnen');
select t.als('88888888-0000-0000-0000-000000000008');
select t.fehler($$select public.charakter_zugang((public.mein_konto()->'charaktere'->0->>'id')::uuid)$$, 'wartet noch');
reset role;
\echo 'ALLE TESTS BESTANDEN'
