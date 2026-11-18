-- Szenario-Test für supabase-update-11.sql (nur lokal, siehe run.sh)
\set ON_ERROR_STOP 1
\set QUIET 1
-- Helfer (als postgres)
create schema if not exists t;
grant usage on schema t to authenticated;
create or replace function t.als(p uuid) returns void language sql security definer as $$ select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated', 'email', (select email from auth.users where id = p))::text, false) $$;
grant execute on function t.als(uuid) to authenticated;
create or replace function t.ok(b boolean, txt text) returns void language plpgsql as $$ begin if b is not true then raise exception 'FEHLGESCHLAGEN: %', txt; end if; raise notice 'ok  %', txt; end $$;
grant execute on function t.ok(boolean, text) to authenticated;
create or replace function t.fehler(sql text, erwartet text) returns void language plpgsql as $$
begin execute sql; raise exception 'FEHLGESCHLAGEN (kein Fehler): %', sql;
exception when others then
  if sqlerrm like 'FEHLGESCHLAGEN%' then raise; end if;
  if sqlerrm not ilike '%' || erwartet || '%' then raise exception 'FEHLGESCHLAGEN falscher Fehler: % -> %', sql, sqlerrm; end if;
  raise notice 'ok  Fehler wie erwartet: %', sqlerrm; end $$;
grant execute on function t.fehler(text, text) to authenticated;
create or replace function t.pw_ok(p uuid, pw text) returns boolean language sql security definer as $$ select encrypted_password = extensions.crypt(pw, encrypted_password) from auth.users where id = p $$;
grant execute on function t.pw_ok(uuid, text) to authenticated;
create or replace function t.legacy(p_id uuid, p_email text, p_pw text, p_name text, p_rang text) returns void language plpgsql as $$
begin
  insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values ('00000000-0000-0000-0000-000000000000',p_id,'authenticated','authenticated',p_email,extensions.crypt(p_pw,extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now());
  insert into public.profiles (user_id, anzeigename, rang_id) values (p_id, p_name, (select id from public.raenge where name = p_rang));
end $$;
create or replace function t.discord(p_id uuid, p_email text, p_did text, p_mitglied boolean) returns void language plpgsql as $$
begin
  insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values ('00000000-0000-0000-0000-000000000000',p_id,'authenticated','authenticated',p_email,'',now(),'{"provider":"discord","providers":["discord"]}','{}',now(),now());
  insert into auth.identities (provider_id,user_id,identity_data,provider) values (p_did,p_id,jsonb_build_object('sub',p_did,'email',p_email),'discord');
  -- so wie die Edge Function (Service-Schlüssel)
  insert into public.personen (user_id, discord_id, discord_name, discord_benutzer, server_mitglied, server_geprueft_am)
  values (p_id, p_did, 'Disc ' || p_did, 'user' || p_did, p_mitglied, now());
end $$;

-- Ausgangslage wie live: Admin A und Mitglied B (alte Konten)
select t.legacy('aaaaaaaa-0000-0000-0000-000000000001', 'abadi@wiwang.de', 'alt-abadi', 'Al Abadi', 'Chairman');
insert into public.admins values ('aaaaaaaa-0000-0000-0000-000000000001');
select t.legacy('bbbbbbbb-0000-0000-0000-000000000002', 'palermo@wiwang.de', 'alt-palermo', 'Niklas Palermo', 'Partner');
insert into public.pinnwand (titel, text) select 'Test', 'Hallo' where exists (select 1 from information_schema.columns where table_name='pinnwand' and column_name='titel');

-- Discord-Personen: P1 neu (Mitglied), P2 kein Server-Mitglied, P3 = Abadi, P4 = Palermo
select t.discord('11111111-0000-0000-0000-000000000001', 'p1@mail.de', '101', true);
select t.discord('22222222-0000-0000-0000-000000000002', 'p2@mail.de', '102', false);
select t.discord('33333333-0000-0000-0000-000000000003', 'p3@mail.de', '103', true);
select t.discord('44444444-0000-0000-0000-000000000004', 'p4@mail.de', '104', true);
select t.ok(not exists (select 1 from public.profiles where user_id = '11111111-0000-0000-0000-000000000001'), 'Discord-Konto bekommt KEIN Profil');

\echo '--- P1: Registrierung'
set role authenticated;
select t.als('11111111-0000-0000-0000-000000000001');
select t.ok(public.mein_konto()->>'art' = 'person' and public.mein_konto()->'person'->>'status' = 'wartet', 'P1 ist Person, wartet');
select t.ok((select count(*) from public.profiles) = 0, 'P1 sieht keine Profile');
select t.ok((select count(*) from public.raenge) = 0, 'P1 sieht keine Ränge');
select t.ok((select count(*) from public.einstellungen) = 0, 'P1 sieht keine Einstellungen');
select t.ok((select count(*) from public.pinnwand) = 0, 'P1 sieht keine Pinnwand');
select t.ok((select count(*) from public.akten) = 0 and (select count(*) from public.mandanten) = 0, 'P1 sieht keine Akten/Mandanten');
select t.ok(not public.ist_mitglied() and not public.is_admin(), 'P1 kein Mitglied, kein Admin');
select t.fehler($$insert into public.profiles (user_id) values ('11111111-0000-0000-0000-000000000001')$$, 'row-level security');
select t.fehler($$select * from public.personen$$, 'permission denied');
select t.fehler($$select public.admin_konten()$$, 'Nur für Admins');
select t.fehler($$select public.charakter_beantragen('Al Abadi')$$, 'gibt es schon');
select t.fehler($$select public.charakter_beantragen('X')$$, '3 bis 60');
select t.ok(public.charakter_beantragen('  Max   Power ') is not null, 'P1 beantragt Max Power');
select t.fehler($$select public.charakter_beantragen('Zweiter Char')$$, 'wartet noch auf Freigabe');
select t.fehler($$select public.charakter_zugang((select (public.mein_konto()->'charaktere'->0->>'id')::uuid))$$, 'wartet noch auf Freigabe');
select t.ok(public.mein_konto()->'charaktere'->0->>'name' = 'Max Power', 'Name normalisiert');

\echo '--- P2: kein Server-Mitglied'
select t.als('22222222-0000-0000-0000-000000000002');
select t.fehler($$select public.charakter_beantragen('Fremder Typ')$$, 'nicht Mitglied');
select t.ok((public.charakter_uebernehmen('palermo@wiwang.de', 'alt-palermo')->>'ok')::boolean = false, 'P2 kann nichts übernehmen');

\echo '--- A (altes Admin-Konto): Übersicht und Freigabe'
select t.als('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok(public.mein_konto()->>'art' = 'mitglied', 'A ist altes Mitglied');
select t.ok(public.is_admin(), 'A ist Admin');
select t.ok(jsonb_array_length(public.admin_konten()->'personen') = 4, 'Übersicht: 4 Personen');
select t.ok(jsonb_array_length(public.admin_konten()->'ohne_discord') = 2, 'Übersicht: 2 Konten ohne Discord');
select t.ok((select count(*) from public.benachrichtigungen where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and art = 'freigabe') = 1, 'A wurde über Registrierung benachrichtigt');
select public.admin_person('11111111-0000-0000-0000-000000000001', 'freigeben', (select id from public.raenge where name = 'Referendar'));
select t.ok((select status from public.profiles where anzeigename = 'Max Power') = 'Aktiv', 'Profil Max Power angelegt');
select t.ok((select r.name from public.profiles p join public.raenge r on r.id = p.rang_id where anzeigename = 'Max Power') = 'Referendar', 'Rang Referendar vergeben');
select t.ok((select discord from public.profiles where anzeigename = 'Max Power') = 'user101', 'Discord im Profil');

\echo '--- P1: Wechsel in Max Power'
select t.als('11111111-0000-0000-0000-000000000001');
create temp table z as select (public.mein_konto()->'charaktere'->0->>'id')::uuid as cid;
create temp table zg as select public.charakter_zugang((select cid from z)) as j;
reset role;
create temp table c1 as select user_id from public.charaktere where id = (select cid from z);
grant select on z, zg, c1 to authenticated;
set role authenticated;
select t.ok(t.pw_ok((select user_id from c1), (select j->>'passwort' from zg)), 'Einmal-Passwort passt zum Charakter-Konto');
select t.ok((select j->>'email' from zg) like 'charakter-%@wiwang.de', 'Charakter-E-Mail');
select t.als((select user_id from c1));
select t.ok(public.mein_konto()->>'art' = 'charakter', 'jetzt als Charakter');
select t.ok((public.mein_konto()->'charaktere'->0->>'aktiv')::boolean, 'Charakter als aktiv markiert');
select t.ok(public.ist_mitglied() and not public.is_admin(), 'Max ist Mitglied, kein Admin');
select t.ok(public.hat_recht('akten_lesen') and not public.hat_recht('personal_schreiben'), 'Rechte aus Rang Referendar');
select t.ok((select count(*) from public.profiles) = 3, 'Max sieht Profile');
select public.zugang_abschliessen();
select t.ok(not t.pw_ok((select user_id from c1), (select j->>'passwort' from zg)), 'Einmal-Passwort danach ungültig');

\echo '--- Weiterer Charakter'
select t.ok(public.charakter_beantragen('Lisa Lustig') is not null, 'Max beantragt Lisa');
select t.fehler($$select public.charakter_zugang((select (c->>'id')::uuid from jsonb_array_elements(public.mein_konto()->'charaktere') c where c->>'name' = 'Lisa Lustig'))$$, 'wartet noch auf Freigabe');
select t.fehler($$select public.admin_charakter((select (c->>'id')::uuid from jsonb_array_elements(public.mein_konto()->'charaktere') c where c->>'name' = 'Lisa Lustig'), 'freigeben')$$, 'Nur für Admins');
select t.als('aaaaaaaa-0000-0000-0000-000000000001');
select public.admin_charakter((select (c->>'id')::uuid from jsonb_array_elements(public.admin_konten()->'personen') p, jsonb_array_elements(p->'charaktere') c where c->>'name' = 'Lisa Lustig'), 'freigeben');
select t.als((select user_id from c1));
select t.ok((public.charakter_zugang((select (c->>'id')::uuid from jsonb_array_elements(public.mein_konto()->'charaktere') c where c->>'name' = 'Lisa Lustig'))->>'passwort') is not null, 'Wechsel Max -> Lisa erlaubt');
select t.ok((select r.name from public.profiles p left join public.raenge r on r.id = p.rang_id where anzeigename = 'Lisa Lustig') is null, 'Lisa ohne Rang (Admin vergibt später)');

\echo '--- Fremder Charakter'
select t.als('33333333-0000-0000-0000-000000000003');
select t.fehler($$select public.charakter_zugang((select cid from z))$$, 'wartet noch');

\echo '--- P3 übernimmt Abadi (Admin), Fehlversuche'
select t.ok((public.charakter_uebernehmen('abadi@wiwang.de', 'falsch')->>'fehler') = 'E-Mail oder Passwort falsch', 'falsches Passwort');
select t.ok((public.charakter_uebernehmen('ABADI@wiwang.de ', 'alt-abadi')->>'ok')::boolean, 'Übernahme mit alten Daten');
select t.ok(public.mein_konto()->'person'->>'status' = 'frei' and (public.mein_konto()->'person'->>'ist_admin')::boolean, 'P3 frei und Admin');
select t.ok(not t.pw_ok('aaaaaaaa-0000-0000-0000-000000000001', 'alt-abadi'), 'altes Passwort von Abadi ungültig');
select t.fehler($$select public.charakter_zugang((select cid from z))$$, 'nicht gefunden');
select t.ok(public.charakter_beantragen('Zweit Abadi') is not null, 'P3 beantragt 2. Charakter');
select t.fehler($$select public.admin_konten()$$, 'Nur für Admins');

\echo '--- P4 versucht Abadi zu übernehmen, Sperre nach 5 Fehlversuchen'
select t.als('44444444-0000-0000-0000-000000000004');
select t.ok((public.charakter_uebernehmen('abadi@wiwang.de', 'x')->>'ok')::boolean = false, 'Abadi gehört schon P3');
select public.charakter_uebernehmen('palermo@wiwang.de', 'x' || g) from generate_series(1,5) g;
select t.ok((public.charakter_uebernehmen('palermo@wiwang.de', 'alt-palermo')->>'fehler') like 'Zu viele%', 'nach 5 Fehlversuchen gesperrt');
reset role;
update public.personen set fehlversuch_am = now() - interval '16 minutes' where user_id = '44444444-0000-0000-0000-000000000004';
set role authenticated;
select t.ok((public.charakter_uebernehmen('palermo@wiwang.de', 'alt-palermo')->>'ok')::boolean, 'nach 15 Min. klappt es');
select t.ok(not (public.mein_konto()->'person'->>'ist_admin')::boolean, 'P4 kein Admin');

\echo '--- P3 als Abadi-Charakter: Admin-Freigabe, Admin gilt für die Person'
select t.als('33333333-0000-0000-0000-000000000003');
select t.ok(not public.is_admin(), 'Person-Konto selbst ist kein Admin');
select t.als('aaaaaaaa-0000-0000-0000-000000000001');
select public.admin_charakter((select (c->>'id')::uuid from jsonb_array_elements(public.mein_konto()->'charaktere') c where c->>'name' = 'Zweit Abadi'), 'freigeben');
reset role;
create temp table c3b as select user_id from public.charaktere where name = 'Zweit Abadi';
grant select on c3b to authenticated;
delete from public.admins;  -- Admin nur noch über die Person
set role authenticated;
select t.als((select user_id from c3b));
select t.ok(public.is_admin(), 'Zweitcharakter des Admins ist Admin');
select t.ok(public.ist_mitglied(), 'Zweitcharakter Mitglied');
select t.als('aaaaaaaa-0000-0000-0000-000000000001');
select t.ok(public.is_admin(), 'Abadi weiter Admin (über Person)');

\echo '--- Passwort für Login ohne Discord'
select t.ok(public.person_passwort_setzen('geheim123') = 'p3@mail.de', 'Person-Passwort gesetzt');
select t.ok(t.pw_ok('33333333-0000-0000-0000-000000000003', 'geheim123'), 'Passwort liegt auf dem Discord-Konto');
select t.fehler($$select public.person_passwort_setzen('kurz')$$, 'mindestens 8');

\echo '--- Sperren'
select t.fehler($$select public.admin_person('33333333-0000-0000-0000-000000000003', 'sperren')$$, 'selbst');
select public.admin_person('11111111-0000-0000-0000-000000000001', 'sperren');
reset role;
select t.ok((select count(*) from auth.users where banned_until = 'infinity' and id in ('11111111-0000-0000-0000-000000000001', (select user_id from c1))) = 2, 'Person und Charaktere gesperrt');
set role authenticated;
select t.als((select user_id from c1));
select t.fehler($$select public.charakter_zugang((select cid from z))$$, 'gesperrt');
select t.als('aaaaaaaa-0000-0000-0000-000000000001');
select public.admin_person('11111111-0000-0000-0000-000000000001', 'entsperren');
select t.als('11111111-0000-0000-0000-000000000001');
select t.ok((public.charakter_zugang((select cid from z))->>'passwort') is not null, 'nach Entsperren wieder Zugang');

\echo '--- Ablehnen'
select t.als('22222222-0000-0000-0000-000000000002');
reset role; update public.personen set server_mitglied = true where user_id = '22222222-0000-0000-0000-000000000002'; set role authenticated;
select t.ok(public.charakter_beantragen('Troll Typ') is not null, 'P2 beantragt');
select t.als('aaaaaaaa-0000-0000-0000-000000000001');
select public.admin_person('22222222-0000-0000-0000-000000000002', 'ablehnen');
select t.als('22222222-0000-0000-0000-000000000002');
select t.fehler($$select public.charakter_beantragen('Troll Zwei')$$, 'gesperrt');

\echo '--- Mitglied einstellen (alter Weg) legt weiter ein Profil an'
select t.als('aaaaaaaa-0000-0000-0000-000000000001');
create temp table nu as select public.admin_create_user('neu@wiwang.de', 'pw1234') as id;
select t.ok((select count(*) from public.profiles p join nu on nu.id = p.user_id) = 1, 'admin_create_user -> Profil');
reset role;

\echo '--- Hook'
select t.ok(public.registrierung_pruefen('{"user":{"app_metadata":{"provider":"discord"}}}') = '{}'::jsonb, 'Hook: Discord erlaubt');
select t.ok(public.registrierung_pruefen('{"user":{"app_metadata":{"provider":"email"}}}') ? 'error', 'Hook: E-Mail abgelehnt');
-- Selbst-Registrierung per E-Mail (falls Hook fehlt) bekommt kein Profil
insert into auth.users (id, email, raw_app_meta_data) values ('99999999-0000-0000-0000-000000000009', 'x@y.de', '{"provider":"email"}');
select t.ok(not exists (select 1 from public.profiles where user_id = '99999999-0000-0000-0000-000000000009'), 'Selbst-Registrierung: kein Profil');
\echo 'ALLE TESTS BESTANDEN'
