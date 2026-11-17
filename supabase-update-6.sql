-- =============================================================
--  Update 6: Neuer Rang "Vice Chairman" (zwischen Chairman und Partner)
--  Rechte wie Chairman, aber ohne Einstellungen.
--  Niklas Palermo erhält diesen Rang.
-- =============================================================

insert into public.raenge (name, sortierung, berechtigungen, ist_sonstiges) values
  ('Vice Chairman', 15, '["akten_lesen","akten_loeschen","akten_schreiben","buchhaltung_lesen","buchhaltung_schreiben","gesetzbuch_lesen","gesetzbuch_schreiben","mandanten_lesen","mandanten_schreiben","personal_lesen","personal_schreiben","rechnungen_lesen","rechnungen_schreiben","termine_lesen","termine_schreiben"]', false)
on conflict (name) do nothing;

update public.profiles
   set rang_id = (select id from public.raenge where name = 'Vice Chairman'),
       rang_eigen = null
 where anzeigename = 'Niklas Palermo';

-- Zur Kontrolle
select p.anzeigename, r.name as rang
  from public.profiles p join public.raenge r on r.id = p.rang_id
 where p.anzeigename = 'Niklas Palermo';
