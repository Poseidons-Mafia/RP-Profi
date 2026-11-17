-- =============================================================
--  Wiwang Law – Update 6: Strafrahmen (von – bis) und StGB
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 bis 5.
--  Kann gefahrlos mehrfach ausgeführt werden: Vorhandene Paragraphen
--  (gleicher Paragraph und gleiches Delikt) werden nicht doppelt angelegt.
--
--  Strafrahmen im Gesetzbuch:
--    haft_min / haft             Freiheitsstrafe von / bis (HE)
--    geldstrafe_min / geldstrafe Geldstrafe von / bis ($)
--    - nur "bis" gefüllt        -> "bis zu …"
--    - nur "von" gefüllt        -> "nicht unter …" (oben nur durch § 3 StGB begrenzt)
--    - von = bis                 -> feste Strafe
--    - Haft und Geldstrafe       -> Haft ODER Geldstrafe (alternativ)
--  Ist die Geldstrafe im Gesetz nicht beziffert, ist sie nach § 13 Abs. 2
--  StGB mit höchstens 3.000 $ je HE eingetragen.
--  gesamt_erhoeht: Gesamtstrafe bis 180 statt 120 HE (§ 3 Abs. 2 StGB).
-- =============================================================

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'gesetze' and column_name = 'haft_min') then
    alter table public.gesetze add column haft_min       numeric;
    alter table public.gesetze add column geldstrafe_min numeric;
    -- Bisherige Einträge hatten einen festen Wert: von = bis setzen (nur beim ersten Lauf)
    update public.gesetze set haft_min = haft, geldstrafe_min = geldstrafe;
  end if;
end $$;
alter table public.gesetze add column if not exists deliktsart     text;
alter table public.gesetze add column if not exists gesamt_erhoeht boolean not null default false;


-- ---------- Strafgesetzbuch (StGB) ----------
insert into public.gesetze (paragraph, titel, kategorie, deliktsart, haft_min, haft, geldstrafe_min, geldstrafe, gesamt_erhoeht, bemerkung)
select v.paragraph, v.titel, v.kategorie, v.deliktsart, v.haft_min, v.haft, v.geldstrafe_min, v.geldstrafe, v.gesamt_erhoeht, v.bemerkung
from (values
  -- II. Straftaten gegen das Leben
  ('§ 18 StGB', 'Mord', 'Straftaten gegen das Leben', 'Verbrechen', 45, null, null, null, true, 'Freiheitsstrafe nicht unter 45 HE'),
  ('§ 19 StGB', 'Totschlag', 'Straftaten gegen das Leben', 'Verbrechen', 20, null, null, null, true, 'Freiheitsstrafe nicht unter 20 HE'),
  ('§ 20 StGB', 'Fahrlässige Tötung', 'Straftaten gegen das Leben', 'Vergehen', null, 20, null, 60000, true, null),

  -- III. Straftaten gegen die körperliche Unversehrtheit
  ('§ 21 StGB', 'Körperverletzung', 'Straftaten gegen die körperliche Unversehrtheit', 'Vergehen', null, 20, null, 60000, true, 'Versuch strafbar'),
  ('§ 22 StGB', 'Fahrlässige Körperverletzung', 'Straftaten gegen die körperliche Unversehrtheit', 'Vergehen', null, 10, null, 30000, true, null),
  ('§ 23 StGB', 'Gefährliche Körperverletzung', 'Straftaten gegen die körperliche Unversehrtheit', 'Vergehen', null, 25, null, 75000, true, 'Mit Waffe oder gefährlichem Werkzeug; Versuch strafbar'),
  ('§ 24 StGB', 'Schwere Körperverletzung', 'Straftaten gegen die körperliche Unversehrtheit', 'Vergehen', null, 30, null, null, true, 'Dauerhafte Verstümmelung oder bleibende Gesundheitsschädigung; Versuch strafbar'),

  -- IV. Straftaten gegen die persönliche Freiheit
  ('§ 25 Abs. 1 StGB', 'Freiheitsberaubung', 'Straftaten gegen die persönliche Freiheit', 'Vergehen', null, 20, null, 60000, false, 'Versuch strafbar'),
  ('§ 25 Abs. 3 StGB', 'Freiheitsberaubung mit schwerer Gesundheitsschädigung', 'Straftaten gegen die persönliche Freiheit', 'Vergehen', null, 25, null, null, false, null),
  ('§ 26 StGB', 'Geiselnahme', 'Straftaten gegen die persönliche Freiheit', 'Verbrechen', 30, null, null, null, false, 'Freiheitsstrafe nicht unter 30 HE'),
  ('§ 27 Abs. 1 StGB', 'Menschenhandel', 'Straftaten gegen die persönliche Freiheit', 'Vergehen', null, 30, null, null, false, 'Versuch strafbar'),
  ('§ 27 Abs. 2 StGB', 'Menschenhandel mit Gewalt, Drohung, List oder Entführung', 'Straftaten gegen die persönliche Freiheit', 'Verbrechen', 25, 40, null, null, false, 'Versuch strafbar'),
  ('§ 28 StGB', 'Nötigung', 'Straftaten gegen die persönliche Freiheit', 'Vergehen', null, 15, null, 45000, false, null),
  ('§ 29 Abs. 1 StGB', 'Bedrohung', 'Straftaten gegen die persönliche Freiheit', 'Vergehen', null, 15, null, 45000, false, null),
  ('§ 29 Abs. 2 StGB', 'Bedrohung mit einem Verbrechen', 'Straftaten gegen die persönliche Freiheit', 'Vergehen', null, 20, null, null, false, 'Ebenso: Vortäuschen eines bevorstehenden Verbrechens (Abs. 3)'),
  ('§ 29 Abs. 4 StGB', 'Öffentliche Bedrohung', 'Straftaten gegen die persönliche Freiheit', 'Vergehen', null, 25, null, null, false, 'Öffentlich, in einer Versammlung oder durch Verbreitung von Inhalten'),

  -- V. Straftaten gegen die Ehre und die Selbstbestimmung
  ('§ 30 Abs. 1 StGB', 'Beleidigung, üble Nachrede, Verleumdung', 'Straftaten gegen die Ehre und die Selbstbestimmung', 'Vergehen', null, 5, null, 15000, false, 'Antragsdelikt'),
  ('§ 30 Abs. 2 StGB', 'Öffentliche Beleidigung, üble Nachrede, Verleumdung', 'Straftaten gegen die Ehre und die Selbstbestimmung', 'Vergehen', null, 10, null, 30000, false, 'Antragsdelikt; öffentlich, in einer Versammlung oder durch Verbreitung von Inhalten'),
  ('§ 31 Abs. 1 StGB', 'Sexuelle Belästigung', 'Straftaten gegen die Ehre und die Selbstbestimmung', 'Vergehen', null, 15, null, 45000, false, 'Antragsdelikt (Ausnahme: besonderes öffentliches Interesse); Höhe der Geldstrafe setzt das Gericht fest'),
  ('§ 31 Abs. 2 StGB', 'Sexuelle Belästigung, besonders schwerer Fall', 'Straftaten gegen die Ehre und die Selbstbestimmung', 'Vergehen', 15, 30, null, null, false, 'In der Regel bei gemeinschaftlicher Begehung'),
  ('§ 32 Abs. 1 StGB', 'Verbale sexuelle Belästigung', 'Straftaten gegen die Ehre und die Selbstbestimmung', 'Vergehen', null, 10, null, 30000, false, 'Antragsdelikt (Ausnahme: besonderes öffentliches Interesse); Höhe der Geldstrafe setzt das Gericht fest'),
  ('§ 32 Abs. 2 StGB', 'Verbale sexuelle Belästigung, besonders schwerer Fall', 'Straftaten gegen die Ehre und die Selbstbestimmung', 'Vergehen', 10, 20, null, null, false, 'In der Regel bei wiederholter/beharrlicher Tat, öffentlicher Herabwürdigung oder gemeinschaftlicher Begehung'),

  -- VI. Straftaten gegen das Vermögen
  ('§ 33 StGB', 'Diebstahl', 'Straftaten gegen das Vermögen', 'Vergehen', null, 15, null, 45000, false, 'Versuch strafbar'),
  ('§ 34 StGB', 'Diebstahl, besonders schwerer Fall', 'Straftaten gegen das Vermögen', 'Vergehen', 15, 30, null, null, false, 'In der Regel bei Einbruch, gesicherter Sache oder gewerbsmäßigem Stehlen'),
  ('§ 35 StGB', 'Wohnungseinbruchdiebstahl', 'Straftaten gegen das Vermögen', 'Verbrechen', 15, null, null, null, false, 'Freiheitsstrafe nicht unter 15 HE'),
  ('§ 36 StGB', 'Unterschlagung', 'Straftaten gegen das Vermögen', 'Vergehen', null, 10, null, 30000, false, 'Subsidiär zu schwereren Vorschriften'),
  ('§ 37 StGB', 'Raub', 'Straftaten gegen das Vermögen', 'Verbrechen', 15, null, null, null, false, 'Freiheitsstrafe nicht unter 15 HE'),
  ('§ 38 StGB', 'Schwerer Raub', 'Straftaten gegen das Vermögen', 'Verbrechen', 25, null, null, null, false, 'Freiheitsstrafe nicht unter 25 HE; Körperverletzung durch dieselbe Gewalthandlung wird nicht gesondert gezählt'),
  ('§ 39 StGB', 'Betrug', 'Straftaten gegen das Vermögen', 'Vergehen', null, 15, null, 45000, false, 'Versuch strafbar'),
  ('§ 40 StGB', 'Sachbeschädigung', 'Straftaten gegen das Vermögen', 'Vergehen', null, 15, null, 45000, false, 'Auch erhebliche Veränderung des Erscheinungsbilds; Versuch strafbar'),
  ('§ 41 StGB', 'Unbefugter Gebrauch eines Fahrzeugs', 'Straftaten gegen das Vermögen', 'Vergehen', null, 10, null, 30000, false, 'Antragsdelikt'),
  ('§ 42 StGB', 'Hausfriedensbruch', 'Straftaten gegen das Vermögen', 'Vergehen', null, 10, null, 30000, false, 'Antragsdelikt'),

  -- VII. Gemeingefährliche Straftaten
  ('§ 43 Abs. 1 StGB', 'Brandstiftung', 'Gemeingefährliche Straftaten', 'Verbrechen', 30, 45, null, null, false, null),
  ('§ 43 Abs. 2 StGB', 'Brandstiftung, minder schwerer Fall', 'Gemeingefährliche Straftaten', 'Verbrechen', 15, 30, null, null, false, null),
  ('§ 44 Abs. 1 StGB', 'Herbeiführen einer Sprengstoffexplosion', 'Gemeingefährliche Straftaten', 'Verbrechen', 15, null, null, null, false, 'Freiheitsstrafe nicht unter 15 HE'),
  ('§ 44 Abs. 2 StGB', 'Sprengstoffexplosion mit schwerer Gesundheitsschädigung vieler Menschen', 'Gemeingefährliche Straftaten', 'Verbrechen', 20, null, null, null, false, 'Freiheitsstrafe nicht unter 20 HE'),
  ('§ 44 Abs. 3 StGB', 'Sprengstoffexplosion mit Todesfolge', 'Gemeingefährliche Straftaten', 'Verbrechen', 30, null, null, null, false, 'Freiheitsstrafe nicht unter 30 HE'),
  ('§ 44 Abs. 4 StGB', 'Fahrlässige Sprengstoffexplosion', 'Gemeingefährliche Straftaten', 'Vergehen', null, 10, null, null, false, null),
  ('§ 45 StGB', 'Gefährlicher Eingriff in den Straßenverkehr', 'Gemeingefährliche Straftaten', 'Vergehen', null, 15, null, 45000, false, 'Versuch strafbar; Fahrverbot/Entzug möglich (§ 16)'),
  ('§ 46 StGB', 'Umgang mit radioaktiven Stoffen', 'Gemeingefährliche Straftaten', 'Vergehen', null, 10, null, 30000, false, 'Ausgenommen: Behörden in hoheitlicher Aufgabe'),

  -- VIII. Straftaten im Straßen-, Luft- und Wasserverkehr
  ('§ 47 StGB', 'Gefährdung des Straßenverkehrs', 'Straftaten im Straßen-, Luft- und Wasserverkehr', 'Vergehen', null, 20, null, null, false, 'Fahrverbot bis 4 Wochen oder Entzug der Fahrerlaubnis möglich (§ 16)'),
  ('§ 48 StGB', 'Verbotenes Kraftfahrzeugrennen', 'Straftaten im Straßen-, Luft- und Wasserverkehr', 'Vergehen', null, 15, null, null, false, 'Sowie nach Ermessen Führerscheinentzug; auch Nutzung von NOS; Versuch strafbar'),
  ('§ 49 StGB', 'Unerlaubtes Entfernen vom Unfallort', 'Straftaten im Straßen-, Luft- und Wasserverkehr', 'Vergehen', null, 15, null, 45000, false, null),
  ('§ 50 StGB', 'Fahren ohne Fahrerlaubnis', 'Straftaten im Straßen-, Luft- und Wasserverkehr', 'Vergehen', null, 10, 20000, 20000, false, 'Auch trotz gerichtlichen Fahrverbots'),
  ('§ 51 StGB', 'Fliegen ohne Fluglizenz', 'Straftaten im Straßen-, Luft- und Wasserverkehr', 'Vergehen', null, 10, 50000, 50000, false, 'Auch trotz gerichtlichen Flugverbots'),
  ('§ 52 StGB', 'Führen eines Wasserfahrzeugs ohne Lizenz', 'Straftaten im Straßen-, Luft- und Wasserverkehr', 'Vergehen', null, 10, 30000, 30000, false, 'Auch trotz gerichtlichen Verbots'),

  -- IX. Straftaten gegen die öffentliche Ordnung
  ('§ 53 StGB', 'Unterlassene Hilfeleistung', 'Straftaten gegen die öffentliche Ordnung', 'Vergehen', null, 10, null, 30000, false, null),
  ('§ 54 Abs. 1 StGB', 'Missbrauch von Notrufen', 'Straftaten gegen die öffentliche Ordnung', 'Vergehen', null, 5, null, 15000, false, null),
  ('§ 54 Abs. 2 StGB', 'Mehrfacher Missbrauch von Notrufen', 'Straftaten gegen die öffentliche Ordnung', 'Vergehen', null, 20, null, null, false, null),
  ('§ 55 Abs. 1 StGB', 'Erregung öffentlichen Ärgernisses', 'Straftaten gegen die öffentliche Ordnung', 'Vergehen', null, null, 10000, 10000, false, null),
  ('§ 55 Abs. 2 StGB', 'Störung von Strafverfolgung, Gericht oder Parlament', 'Straftaten gegen die öffentliche Ordnung', 'Vergehen', null, 10, null, null, false, null),
  ('§ 56 StGB', 'Bildung krimineller Vereinigungen', 'Straftaten gegen die öffentliche Ordnung', 'Vergehen', null, 15, null, 45000, false, 'In der Regel ab vier gemeinschaftlich handelnden Personen'),
  ('§ 57 StGB', 'Landfriedensbruch', 'Straftaten gegen die öffentliche Ordnung', 'Vergehen', null, 20, null, 60000, false, null),
  ('§ 58 StGB', 'Landfriedensbruch, besonders schwerer Fall', 'Straftaten gegen die öffentliche Ordnung', 'Vergehen', 30, 50, null, null, false, 'In der Regel mit Schusswaffe, Waffe/Werkzeug, Lebensgefahr, Plünderung oder bedeutendem Schaden'),
  ('§ 59 StGB', 'Verstoß gegen das Vermummungsverbot', 'Straftaten gegen die öffentliche Ordnung', 'Vergehen', null, null, null, 10000, false, 'Ausgenommen: Polizei, Nationalgarde, StA; Helme für Go-Kart/Kraftrad'),
  ('§ 60 StGB', 'Vermummung, besonders schwerer Fall', 'Straftaten gegen die öffentliche Ordnung', 'Vergehen', 5, 15, null, null, false, 'Vermummung bei/zur Verschleierung anderer Straftaten'),
  ('§ 61 Abs. 4 S. 1 StGB', 'Betreten einer Sperrzone', 'Straftaten gegen die öffentliche Ordnung', 'Vergehen', null, null, null, 90000, false, 'Bußgeld'),
  ('§ 61 Abs. 4 S. 2 StGB', 'Wiederholtes Eindringen in eine Sperrzone / Behinderung der Beamten', 'Straftaten gegen die öffentliche Ordnung', 'Verbrechen', 15, 30, null, null, false, null),
  ('§ 62 Abs. 4 S. 1 StGB', 'Betreten einer militärischen Sperrzone', 'Straftaten gegen die öffentliche Ordnung', 'Vergehen', null, null, null, 120000, false, 'Bußgeld; gilt auch für militärische Sperrgebiete (§ 63)'),
  ('§ 62 Abs. 4 S. 2 StGB', 'Wiederholtes Eindringen in eine militärische Sperrzone / Behinderung', 'Straftaten gegen die öffentliche Ordnung', 'Vergehen', null, 60, null, null, false, 'Gilt auch für militärische Sperrgebiete (§ 63)'),
  ('§ 64 Abs. 6 S. 1 StGB', 'Betreten eines staatlichen Sperrgebiets', 'Straftaten gegen die öffentliche Ordnung', 'Vergehen', null, null, null, 90000, false, 'Bußgeld; Parlament, Staatsgefängnis, nicht öffentliche LSPD-Bereiche'),
  ('§ 64 Abs. 6 S. 2 StGB', 'Wiederholtes Eindringen in ein staatliches Sperrgebiet / Behinderung', 'Straftaten gegen die öffentliche Ordnung', 'Vergehen', null, 30, null, null, false, null),
  ('§ 65 StGB', 'Störung des öffentlichen Friedens durch Androhung von Straftaten', 'Straftaten gegen die öffentliche Ordnung', 'Vergehen', null, 20, null, 60000, false, 'Auch Vortäuschen einer bevorstehenden Tat'),

  -- X. Straftaten gegen die Staatsgewalt und Rechtspflege
  ('§ 66 Abs. 1 StGB', 'Widerstand gegen Vollstreckungsbeamte', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen', null, 20, null, null, false, 'Nicht strafbar bei rechtswidriger Diensthandlung (Abs. 2)'),
  ('§ 66 Abs. 3 StGB', 'Widerstand gegen Vollstreckungsbeamte, besonders schwerer Fall', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen', null, 25, null, null, false, 'In der Regel bei bewaffnetem Widerstand'),
  ('§ 67 Abs. 1 StGB', 'Tätlicher Angriff auf Vollstreckungsbeamte', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Verbrechen', 15, 25, null, null, false, 'Versuch strafbar'),
  ('§ 67 Abs. 3 StGB', 'Tätlicher Angriff mit schweren Verletzungen oder Lebensgefahr', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Verbrechen', 25, 35, null, null, false, 'Versuch strafbar'),
  ('§ 68 StGB', 'Amtsanmaßung', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen', null, 20, null, 60000, false, 'Auch unbefugte Ausübung geschützter Tätigkeiten (Abs. 2)'),
  ('§ 69 StGB', 'Strafvereitelung', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen', null, 20, null, 60000, false, 'Auch Vollstreckungsvereitelung; Versuch strafbar'),
  ('§ 70 StGB', 'Falsche uneidliche Aussage', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen', 5, 10, null, null, false, null),
  ('§ 71 Abs. 1 StGB', 'Meineid', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen', 10, null, null, null, false, 'Freiheitsstrafe nicht unter 10 HE'),
  ('§ 71 Abs. 2 StGB', 'Meineid, minder schwerer Fall', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen', 5, 10, null, null, false, null),
  ('§ 72 Abs. 1 StGB', 'Falsche Verdächtigung', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen', null, 20, null, 60000, false, null),
  ('§ 72 Abs. 2 S. 1 StGB', 'Falsche Verdächtigung zur eigenen Strafmilderung', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Verbrechen', 20, 30, null, null, false, null),
  ('§ 72 Abs. 2 S. 2 StGB', 'Falsche Verdächtigung zur Strafmilderung, minder schwerer Fall', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Verbrechen', 15, 25, null, null, false, null),
  ('§ 73 StGB', 'Vortäuschen einer Straftat', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen', null, 20, null, 60000, false, 'Subsidiär zu §§ 69, 72'),
  ('§ 74 Abs. 1 StGB', 'Beweismittelfälschung', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen', 10, 10, null, null, false, 'Feste Strafe'),
  ('§ 74 Abs. 2 StGB', 'Beweismittelfälschung durch Anwalt', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Verbrechen', 20, 20, null, null, false, 'Feste Strafe; Entzug der Anwaltslizenz und Sperre bis 30 Tage'),
  ('§ 75 StGB', 'Umgehung der Haftzeit / Fluchthilfe', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen', null, 25, null, 75000, false, 'Versuch strafbar'),
  ('§ 76 StGB', 'Besitz von polizeilichen Mitteln', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen', null, 15, null, 45000, false, 'Besitz, Nutzung oder Handel; Versuch strafbar'),
  ('§ 77 StGB', 'Besitz von illegalen Gegenständen', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen', null, 15, null, null, false, 'Anlage 1: Jailbreak-Handy, Sprengladung, Fußfesseln; Versuch strafbar'),
  ('§ 78 Abs. 2 StGB', 'Dokumentenfälschung', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen', null, 25, null, 75000, false, 'Auch Ausstellen falscher Titelurkunden (Abs. 5); Versuch strafbar'),
  ('§ 78 Abs. 4 StGB', 'Dokumentenfälschung, schwerer oder wiederholter Fall', 'Straftaten gegen die Staatsgewalt und Rechtspflege', 'Vergehen', null, 45, null, 135000, false, null),

  -- XI. Amtsdelikte und Korruption
  ('§ 79 Abs. 1 StGB', 'Vorteilsgewährung', 'Amtsdelikte und Korruption', 'Vergehen', null, 20, null, 60000, false, null),
  ('§ 79 Abs. 2 StGB', 'Vorteilsgewährung gegenüber einem Richter', 'Amtsdelikte und Korruption', 'Vergehen', null, 35, null, null, false, null),
  ('§ 80 StGB', 'Vorteilsannahme', 'Amtsdelikte und Korruption', 'Vergehen', null, 35, null, 105000, false, 'Auch Richter/Schiedsrichter (Abs. 2, Versuch strafbar); straflos bei Genehmigung (Abs. 3)'),
  ('§ 81 StGB', 'Missbrauch der Amtsgewalt', 'Amtsdelikte und Korruption', 'Verbrechen', 35, 50, null, null, false, 'Auch bei Schaden über 30.000 $ oder unberechtigter Titelvergabe'),
  ('§ 82 StGB', 'Strafvereitelung im Amt', 'Amtsdelikte und Korruption', 'Verbrechen', 20, null, null, null, false, 'Freiheitsstrafe nicht unter 20 HE'),
  ('§ 83 StGB', 'Rechtsbeugung', 'Amtsdelikte und Korruption', 'Verbrechen', 45, null, null, null, false, 'Freiheitsstrafe nicht unter 45 HE'),

  -- XII. Straftaten gegen den Staat und die Sicherheit
  ('§ 84 StGB', 'Verbotene Mitteilungen über Gerichtsverhandlungen', 'Straftaten gegen den Staat und die Sicherheit', 'Vergehen', null, 20, null, 60000, false, null),
  ('§ 85 StGB', 'Weitergabe geheimer Informationen', 'Straftaten gegen den Staat und die Sicherheit', 'Verbrechen', 45, null, null, null, false, 'Freiheitsstrafe nicht unter 45 HE'),
  ('§ 86 Abs. 1 StGB', 'Verletzung von Sicherheitsfreigaben', 'Straftaten gegen den Staat und die Sicherheit', 'Verbrechen', 25, 45, null, null, false, 'Sicherheitsfreigaben 3 bis 5'),
  ('§ 86 Abs. 2 StGB', 'Verletzung von Sicherheitsfreigaben, besonders schwerer Fall', 'Straftaten gegen den Staat und die Sicherheit', 'Verbrechen', 45, 65, null, null, false, 'Gewerbsmäßig, gegen Bezahlung oder gegen die Sicherheit des Staates'),
  ('§ 87 StGB', 'Hochverrat', 'Straftaten gegen den Staat und die Sicherheit', 'Verbrechen', 35, null, null, null, true, 'Freiheitsstrafe nicht unter 35 HE'),
  ('§ 88 StGB', 'Terrorstraftat', 'Straftaten gegen den Staat und die Sicherheit', 'Verbrechen', 45, 180, null, null, true, 'Versuch und Vorbereitung strafbar; Terrorstatus möglich; ggf. Sicherungsverwahrung'),

  -- XIII. Straftaten im Umgang mit Betäubungsmitteln und Waffen
  ('§ 89 Abs. 1 StGB', 'Unerlaubter Umgang mit Betäubungsmitteln', 'Straftaten im Umgang mit Betäubungsmitteln und Waffen', 'Vergehen', null, 20, null, 250000, false, 'Freimenge Cannabis: 3 Joints oder 15 Einheiten; Versuch strafbar'),
  ('§ 89 Abs. 4 StGB', 'Fahrlässiger Umgang mit Betäubungsmitteln', 'Straftaten im Umgang mit Betäubungsmitteln und Waffen', 'Vergehen', null, 10, null, 250000, false, 'Milder als bei Vorsatz'),
  ('§ 90 StGB', 'Cannabiskonsum in der Nähe staatlicher Behörden', 'Straftaten im Umgang mit Betäubungsmitteln und Waffen', 'Vergehen', null, null, 15000, 15000, false, null),
  ('§ 91 StGB', 'Unerlaubter Umgang mit Waffen und Waffenteilen', 'Straftaten im Umgang mit Betäubungsmitteln und Waffen', 'Vergehen', null, 20, 60000, 60000, false, 'Geldstrafe nur beim Erstverstoß (Abs. 3); Entzug waffenrechtlicher Berechtigungen möglich (§ 16)'),
  ('§ 92 StGB', 'Schussbereites Führen einer Schusswaffe auf öffentlichem Grund', 'Straftaten im Umgang mit Betäubungsmitteln und Waffen', 'Vergehen', null, 20, null, null, false, 'Schussbereit nur, wenn die Waffe gehalten wird'),
  ('§ 93 StGB', 'Gefährdende Schussabgabe im öffentlichen Raum', 'Straftaten im Umgang mit Betäubungsmitteln und Waffen', 'Vergehen', null, 20, null, null, false, null),

  -- XIV. Straftaten im Wirtschafts- und Gewerbeverkehr
  ('§ 94 StGB', 'Verheimlichung registrierungspflichtigen Vermögens', 'Straftaten im Wirtschafts- und Gewerbeverkehr', 'Vergehen', null, 10, null, null, false, null),
  ('§ 95 StGB', 'Strafgeldhinterziehung', 'Straftaten im Wirtschafts- und Gewerbeverkehr', 'Vergehen', 10, 120, 50000, 50000, false, 'Statt Geldstrafe Ersatzhaft: 1 HE je 3.000 $ offenen Strafgelds (Abs. 2, 4)'),
  ('§ 96 StGB', 'Besitz von Schwarzgeld', 'Straftaten im Wirtschafts- und Gewerbeverkehr', 'Vergehen', null, 15, null, null, false, null),
  ('§ 97 StGB', 'Besitz von Phantomgeld', 'Straftaten im Wirtschafts- und Gewerbeverkehr', 'Vergehen', null, 15, null, null, false, null),
  ('§ 98 StGB', 'Diebstahl von Schwarzgeld', 'Straftaten im Wirtschafts- und Gewerbeverkehr', 'Vergehen', null, 15, null, null, false, 'Tritt an die Stelle von § 33 Abs. 1'),
  ('§ 99 StGB', 'Diebstahl von Phantomgeld', 'Straftaten im Wirtschafts- und Gewerbeverkehr', 'Vergehen', null, 15, null, null, false, 'Tritt an die Stelle von § 33 Abs. 1'),
  ('§ 100 StGB', 'Handel mit illegalen Währungen', 'Straftaten im Wirtschafts- und Gewerbeverkehr', 'Vergehen', null, 15, null, null, false, 'Schwarz- oder Phantomgeld; Versuch strafbar'),
  ('§ 101 StGB', 'Geldwäsche', 'Straftaten im Wirtschafts- und Gewerbeverkehr', 'Vergehen', null, 25, null, null, false, 'Versuch strafbar'),
  ('§ 102 StGB', 'Vertragsbruch', 'Straftaten im Wirtschafts- und Gewerbeverkehr', 'Vergehen', null, 20, null, null, false, null),
  ('§ 103 StGB', 'Schwerer oder wiederholter unerlaubter Umgang mit Rohstoffen', 'Straftaten im Wirtschafts- und Gewerbeverkehr', 'Vergehen', null, 20, null, 250000, false, 'Freimenge ohne Lizenz: 200 kg pro Person und Rohstoffart am Tag'),
  ('§ 103a StGB', 'Unerlaubte Durchführung einer Veranstaltung', 'Straftaten im Wirtschafts- und Gewerbeverkehr', 'Vergehen', null, 20, null, 60000, false, null),

  -- XV. Weitere Straftaten im Luftverkehr
  ('§ 104 StGB', 'Überfliegen einer Flugverbotszone', 'Weitere Straftaten im Luftverkehr', 'Vergehen', 5, 15, null, null, false, null),
  ('§ 105 StGB', 'Unterschreitung der Mindestflughöhe', 'Weitere Straftaten im Luftverkehr', 'Vergehen', 5, 20, null, null, false, 'Flugzeug 2.000 m, Helikopter 500 m'),
  ('§ 106 StGB', 'Unzulässige Landung', 'Weitere Straftaten im Luftverkehr', 'Vergehen', null, null, null, 15000, false, null),
  ('§ 107 StGB', 'Verletzung der Flugfunkpflichten', 'Weitere Straftaten im Luftverkehr', 'Vergehen', null, null, null, 5000, false, null),
  ('§ 108 StGB', 'Fehlender Fallschirm an Bord', 'Weitere Straftaten im Luftverkehr', 'Vergehen', null, null, null, 12500, false, null),

  -- XVI. Weitere Straftaten gegen die Rechtspflege und geschützte Titel
  ('§ 109 StGB', 'Unberechtigtes Führen eines akademischen Titels', 'Weitere Straftaten gegen die Rechtspflege und geschützte Titel', 'Vergehen', null, 10, 100000, 100000, false, 'Geht § 68 Abs. 2 vor')
) as v(paragraph, titel, kategorie, deliktsart, haft_min, haft, geldstrafe_min, geldstrafe, gesamt_erhoeht, bemerkung)
where not exists (
  select 1 from public.gesetze g where g.paragraph = v.paragraph and g.titel = v.titel
);

-- Supabase die neuen Spalten sofort bekannt machen
notify pgrst, 'reload schema';
