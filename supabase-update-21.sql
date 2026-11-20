-- =============================================================
--  Wiwang Law – Update 21: Strafkatalog überarbeitet
--
--  Beliebig oft ausführbar (ändert nichts doppelt).
--
--  1. Spalten für Mindestmaß, Art und erhöhte Gesamtstrafe festschreiben
--     (gab es in der Live-Datenbank schon, standen aber in keinem Skript).
--     So rechnet die Website mit Spannen:
--       haft_min + haft      Spanne („15 bis 30 HE“); gleiche Werte = feste Strafe
--       nur haft             „bis zu“  → Mindestmaß gilt als 1 Hafteinheit
--       nur haft_min         „nicht unter“ → nach oben OFFEN (kein Höchstmaß)
--       Haft + Geldstrafe    „Freiheitsstrafe … oder Geldstrafe“ (Alternativen)
--       deliktsart           Verbrechen · Vergehen · Ordnungswidrigkeit
--       gesamt_erhoeht       Tat gegen Leben, körperliche Unversehrtheit oder
--                            verfassungsmäßige Ordnung → Gesamtstrafe bis 180 HE
--                            statt 120 HE (§ 3 Abs. 2 StGB)
--  2. Gesamtstrafe: vier weitere Delikte gegen Leib und Leben markiert.
--  3. Bemerkungen bereinigt, die nur das Mindestmaß wiederholten
--     („Freiheitsstrafe nicht unter 45 HE“ – steht jetzt in der Spalte).
--  4. Fehlende Delikte ergänzt:
--       · Bußgeldkatalog der StVO (§ 24 bis § 26, Geschwindigkeitsstufen)
--       · Bußgelder der Gewerbeordnung (§ 17 bis § 19)
--       · Absatz-Varianten des StGB, die bisher nur in Bemerkungen standen
--         (§ 29 Abs. 3, § 65 Abs. 2, § 68 Abs. 2, § 69 Abs. 2, § 73 Abs. 2,
--          § 78 Abs. 5, § 80 Abs. 2, § 81 Abs. 2 und 3)
-- =============================================================
begin;

-- ---------- 1. Spalten ----------
alter table public.gesetze add column if not exists haft_min        numeric;
alter table public.gesetze add column if not exists geldstrafe_min  numeric;
alter table public.gesetze add column if not exists deliktsart      text;
alter table public.gesetze add column if not exists gesamt_erhoeht boolean not null default false;


-- ---------- 2. Erhöhte Gesamtstrafe (bis 180 HE) ----------
update public.gesetze set gesamt_erhoeht = true
 where paragraph in ('§ 25 Abs. 3 StGB',   -- Freiheitsberaubung mit schwerer Gesundheitsschädigung
                     '§ 44 Abs. 2 StGB',   -- Sprengstoffexplosion, schwere Gesundheitsschädigung vieler
                     '§ 44 Abs. 3 StGB',   -- Sprengstoffexplosion mit Todesfolge
                     '§ 67 Abs. 3 StGB')   -- Angriff auf Beamte mit schweren Verletzungen / Lebensgefahr
   and not gesamt_erhoeht;


-- ---------- 3. Bemerkungen bereinigen ----------
update public.gesetze set bemerkung = null
 where bemerkung ~ '^Freiheitsstrafe nicht unter [0-9]+ HE$';
update public.gesetze
   set bemerkung = 'Körperverletzung durch dieselbe Gewalthandlung wird nicht gesondert gezählt (Abs. 2)'
 where paragraph = '§ 38 StGB' and bemerkung like 'Freiheitsstrafe nicht unter 25 HE;%';

-- Absatz-Varianten bekommen eigene Zeilen (siehe unten) – Hinweise darauf entfallen
update public.gesetze set bemerkung = 'Straflos bei Genehmigung (Abs. 3)'
 where paragraph = '§ 80 StGB' and bemerkung like 'Auch Richter/Schiedsrichter%';
update public.gesetze set bemerkung = null
 where paragraph = '§ 81 StGB' and bemerkung like 'Auch bei Schaden über 30.000%';
update public.gesetze set bemerkung = null
 where paragraph = '§ 29 Abs. 2 StGB' and bemerkung like 'Ebenso: Vortäuschen%';
update public.gesetze set bemerkung = 'Versuch strafbar (Abs. 3)'
 where paragraph = '§ 78 Abs. 2 StGB' and bemerkung like 'Auch Ausstellen falscher Titelurkunden%';
update public.gesetze set bemerkung = null
 where paragraph = '§ 68 StGB' and bemerkung like 'Auch unbefugte Ausübung%';
update public.gesetze set bemerkung = 'Auch Vollstreckungsvereitelung (Abs. 2); Versuch strafbar'
 where paragraph = '§ 69 StGB' and bemerkung like 'Auch Vollstreckungsvereitelung%';


-- ---------- 4. Fehlende Delikte ergänzen ----------
-- Spalten: paragraph, titel, kategorie, deliktsart, haft_min, haft, geldstrafe_min, geldstrafe, gesamt_erhoeht, bemerkung
with neu (paragraph, titel, kategorie, deliktsart, haft_min, haft, geldstrafe_min, geldstrafe, gesamt_erhoeht, bemerkung) as (values

  -- StGB: Absatz-Varianten
  ('§ 29 Abs. 3 StGB', 'Vortäuschen eines bevorstehenden Verbrechens', 'Straftaten gegen die persönliche Freiheit', 'Vergehen',
     null::numeric, 20::numeric, null::numeric, null::numeric, false, 'Wider besseres Wissen; Strafe wie bei § 29 Abs. 2'),
  ('§ 65 Abs. 2 StGB', 'Vortäuschen einer bevorstehenden Tat (Störung des öffentlichen Friedens)', 'Straftaten gegen die öffentliche Ordnung', 'Vergehen',
     null, 20, null, 60000, false, 'Wider besseres Wissen; Taten nach § 65 Abs. 1'),
  ('§ 68 Abs. 2 StGB', 'Ausübung einer geschützten Tätigkeit ohne Berechtigung', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen',
     null, 20, null, 60000, false, 'Tätigkeit, die durch andere Vorschriften geschützt ist'),
  ('§ 69 Abs. 2 StGB', 'Vollstreckungsvereitelung', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen',
     null, 20, null, 60000, false, 'Vereitelung der Vollstreckung einer Strafe oder Maßnahme; Versuch strafbar'),
  ('§ 73 Abs. 2 StGB', 'Täuschung über Beteiligte an einer Straftat', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen',
     null, 20, null, 60000, false, 'Subsidiär zu §§ 69, 72'),
  ('§ 78 Abs. 5 StGB', 'Ausstellen einer Titelurkunde ohne wissenschaftliche Arbeit', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen',
     null, 25, null, 75000, false, 'Akademischer Titel; in schweren oder wiederholten Fällen Strafrahmen des Abs. 4 (bis 45 HE / $135.000)'),
  ('§ 80 Abs. 2 StGB', 'Vorteilsannahme durch Richter oder Schiedsrichter', 'Amtsdelikte und Korruption', 'Vergehen',
     null, 35, null, 105000, false, 'Vorteil im Zusammenhang mit einer richterlichen Handlung; Versuch strafbar'),
  ('§ 81 Abs. 2 StGB', 'Missbrauch der Amtsgewalt, Schaden über 30.000 $', 'Amtsdelikte und Korruption', 'Verbrechen',
     35, 50, null, null, false, 'Strafrahmen wie Abs. 1'),
  ('§ 81 Abs. 3 StGB', 'Unberechtigte Vergabe eines akademischen Titels durch Amtsträger', 'Amtsdelikte und Korruption', 'Verbrechen',
     35, 50, null, null, false, 'Titel vergeben, obwohl die erforderliche Urkunde nicht ausgestellt wurde; Strafrahmen wie Abs. 1'),

  -- StVO: Ordnungswidrigkeiten (Bußgeldkatalog)
  ('§ 24 Abs. 1 StVO', 'Allgemeine Verkehrsordnungswidrigkeit', 'Ordnungswidrigkeiten im Straßenverkehr (StVO)', 'Ordnungswidrigkeit',
     null, null, null, 25000, false, 'Verstoß gegen §§ 2, 3, 5 bis 16 StVO; Bußgeld nach Ermessen des Beamten, verhältnismäßig; höhere Beträge nur mit Genehmigung des Gerichts (Abs. 3)'),
  ('§ 24 Abs. 2 StVO', 'Missachtung von Polizeizeichen, Blinklicht, Absperrung oder Verkehrsanordnung', 'Ordnungswidrigkeiten im Straßenverkehr (StVO)', 'Ordnungswidrigkeit',
     null, null, null, 25000, false, '§ 22 Abs. 2 StVO; Bußgeld nach Ermessen des Beamten, verhältnismäßig; höhere Beträge nur mit Genehmigung des Gerichts (Abs. 3)'),

  ('§ 25 Abs. 1 StVO', 'Zu schnell innerorts: bis 20 km/h', 'Ordnungswidrigkeiten im Straßenverkehr (StVO)', 'Ordnungswidrigkeit',
     null, null, 5000, 5000, false, '0 Verkehrspunkte; automatische Messanlage: Bußgeld und Punkte halbiert (Abs. 2)'),
  ('§ 25 Abs. 1 StVO', 'Zu schnell innerorts: 21 bis 30 km/h', 'Ordnungswidrigkeiten im Straßenverkehr (StVO)', 'Ordnungswidrigkeit',
     null, null, 10000, 10000, false, '1 Verkehrspunkt; automatische Messanlage: halbiert (Abs. 2)'),
  ('§ 25 Abs. 1 StVO', 'Zu schnell innerorts: 31 bis 40 km/h', 'Ordnungswidrigkeiten im Straßenverkehr (StVO)', 'Ordnungswidrigkeit',
     null, null, 15000, 15000, false, '2 Verkehrspunkte; automatische Messanlage: halbiert (Abs. 2)'),
  ('§ 25 Abs. 1 StVO', 'Zu schnell innerorts: 41 bis 50 km/h', 'Ordnungswidrigkeiten im Straßenverkehr (StVO)', 'Ordnungswidrigkeit',
     null, null, 22000, 22000, false, '3 Verkehrspunkte; automatische Messanlage: halbiert (Abs. 2)'),
  ('§ 25 Abs. 1 StVO', 'Zu schnell innerorts: 51 bis 60 km/h', 'Ordnungswidrigkeiten im Straßenverkehr (StVO)', 'Ordnungswidrigkeit',
     null, null, 30000, 30000, false, '4 Verkehrspunkte; automatische Messanlage: halbiert (Abs. 2)'),
  ('§ 25 Abs. 1 StVO', 'Zu schnell innerorts: 61 bis 100 km/h', 'Ordnungswidrigkeiten im Straßenverkehr (StVO)', 'Ordnungswidrigkeit',
     null, null, 45000, 45000, false, '5 Verkehrspunkte; automatische Messanlage: halbiert (Abs. 2)'),
  ('§ 25 Abs. 1 StVO', 'Zu schnell innerorts: über 101 km/h', 'Ordnungswidrigkeiten im Straßenverkehr (StVO)', 'Ordnungswidrigkeit',
     null, null, 75000, 75000, false, 'Führerscheinentzug; automatische Messanlage: halbiert (Abs. 2)'),

  ('§ 26 StVO', 'Zu schnell außerorts: bis 20 km/h', 'Ordnungswidrigkeiten im Straßenverkehr (StVO)', 'Ordnungswidrigkeit',
     null, null, 3000, 3000, false, '0 Verkehrspunkte'),
  ('§ 26 StVO', 'Zu schnell außerorts: 21 bis 30 km/h', 'Ordnungswidrigkeiten im Straßenverkehr (StVO)', 'Ordnungswidrigkeit',
     null, null, 7500, 7500, false, '0 Verkehrspunkte'),
  ('§ 26 StVO', 'Zu schnell außerorts: 31 bis 40 km/h', 'Ordnungswidrigkeiten im Straßenverkehr (StVO)', 'Ordnungswidrigkeit',
     null, null, 12000, 12000, false, '1 Verkehrspunkt'),
  ('§ 26 StVO', 'Zu schnell außerorts: 41 bis 50 km/h', 'Ordnungswidrigkeiten im Straßenverkehr (StVO)', 'Ordnungswidrigkeit',
     null, null, 18000, 18000, false, '2 Verkehrspunkte'),
  ('§ 26 StVO', 'Zu schnell außerorts: 51 bis 60 km/h', 'Ordnungswidrigkeiten im Straßenverkehr (StVO)', 'Ordnungswidrigkeit',
     null, null, 25000, 25000, false, '4 Verkehrspunkte'),
  ('§ 26 StVO', 'Zu schnell außerorts: 61 bis 100 km/h', 'Ordnungswidrigkeiten im Straßenverkehr (StVO)', 'Ordnungswidrigkeit',
     null, null, 40000, 40000, false, '5 Verkehrspunkte'),
  ('§ 26 StVO', 'Zu schnell außerorts: über 101 km/h', 'Ordnungswidrigkeiten im Straßenverkehr (StVO)', 'Ordnungswidrigkeit',
     null, null, 75000, 75000, false, 'Führerscheinentzug'),

  -- GewO: Bußgelder
  ('§ 17 Abs. 2 GewO', 'Illegale Gewerbeausübung', 'Ordnungswidrigkeiten im Gewerbe (GewO)', 'Ordnungswidrigkeit',
     null, null, 25000, 25000, false, 'Gewerbe ohne Gewerbelizenz oder Eintragung; überschüssig erlangte Vermögenswerte können eingezogen werden'),
  ('§ 18 Abs. 1 GewO', 'Umgang mit Rohstoffen ohne Lizenz oder außerhalb der Freimenge', 'Ordnungswidrigkeiten im Gewerbe (GewO)', 'Ordnungswidrigkeit',
     null, null, 15000, 15000, false, 'Rohstoffe außerhalb der Freimenge können beschlagnahmt und eingezogen werden; schwere oder wiederholte Fälle: § 103 StGB (dann keine zusätzliche Geldbuße)'),
  ('§ 19 Abs. 1 GewO', 'Sonstiger Verstoß gegen die Gewerbeordnung', 'Ordnungswidrigkeiten im Gewerbe (GewO)', 'Ordnungswidrigkeit',
     null, null, null, 250000, false, 'Zusätzlich Entzug der Gewerbe- oder Rohstofflizenz möglich; bei Verstößen im Zusammenhang mit Waffen ist ein Gerichtsurteil erforderlich (Abs. 2)')
)
insert into public.gesetze (paragraph, titel, kategorie, deliktsart, haft_min, haft, geldstrafe_min, geldstrafe, gesamt_erhoeht, bemerkung)
select n.paragraph, n.titel, n.kategorie, n.deliktsart, n.haft_min, n.haft, n.geldstrafe_min, n.geldstrafe, n.gesamt_erhoeht, n.bemerkung
  from neu n
 where not exists (select 1 from public.gesetze g where g.paragraph = n.paragraph and g.titel = n.titel);


-- ---------- Zur Kontrolle ----------
select count(*)                                              as delikte,
       count(*) filter (where deliktsart = 'Ordnungswidrigkeit') as ordnungswidrigkeiten,
       count(*) filter (where haft_min is not null and haft is null) as nach_oben_offen,
       count(*) filter (where gesamt_erhoeht)                as erhoehte_gesamtstrafe
  from public.gesetze;

commit;
