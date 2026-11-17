-- =============================================================
--  Wiwang Law – Gesetzestexte: BGB, LPolG, BtMG, GewO, LuftVO
--
--  Erzeugt mit tools/gesetze-sql.py aus dem Ordner gesetze/.
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Update 8.
--  Kann gefahrlos mehrfach ausgeführt werden: Die Gesetzbücher
--  werden angelegt bzw. aktualisiert, ihre Paragraphen ersetzt.
-- =============================================================

begin;

-- ---------- BGB – Bürgerliches Gesetzbuch (29 Paragraphen) ----------
insert into public.gesetzbuecher (kuerzel, titel, beschreibung, farbe, sortierung)
select 'BGB', 'Bürgerliches Gesetzbuch', 'Rechtsfähigkeit, Verträge, Eigentum, Selbsthilfe und Schadensersatz, Zivilklage, Ausweispflicht und Familienrecht.', 'blau', 20
where not exists (select 1 from public.gesetzbuecher where lower(kuerzel) = lower('BGB'));
update public.gesetzbuecher set titel = 'Bürgerliches Gesetzbuch', beschreibung = 'Rechtsfähigkeit, Verträge, Eigentum, Selbsthilfe und Schadensersatz, Zivilklage, Ausweispflicht und Familienrecht.'
  where lower(kuerzel) = lower('BGB');
delete from public.paragraphen where gesetzbuch_id = (select id from public.gesetzbuecher where lower(kuerzel) = lower('BGB'));
insert into public.paragraphen (gesetzbuch_id, nummer, titel, abschnitt, text)
select g.id, v.nummer, v.titel, v.abschnitt, v.text from public.gesetzbuecher g, (values
  ('§ 1', 'Umstand des Gesetzes', 'Kapitel 1 – Allgemeine Vorschriften', '(1) Dieses Gesetz regelt den Umgang zwischen rechtsfähigen Personen.

(2) Rechtsfähige Personen im Sinne dieses Gesetzes sind

1. natürliche Personen, das heißt alle Menschen, die mindestens das 14. Lebensjahr vollendet haben und ihren Willen frei äußern können, sowie
2. juristische Personen, das heißt rechtlich anerkannte Zusammenschlüsse und Organisationen, insbesondere eingetragene Unternehmen, die als Träger von Rechten und Pflichten am Rechtsverkehr teilnehmen.

(3) Juristische Personen handeln durch ihre vertretungsberechtigten Organe.'),
  ('§ 2', 'Vertragsfreiheit', 'Kapitel 1 – Allgemeine Vorschriften', '(1) Jeder juristischen oder natürlichen Person ist es gestattet, mit einer anderen juristischen oder natürlichen Person Verträge abzuschließen.

(2) Die Vertragspartner verständigen sich hierbei auf einen Vertragsgegenstand und verpflichten sich zu dessen Einhaltung.

(3) Wird ein Vertrag konkreter definiert, so gelten dessen Einschränkungen.'),
  ('§ 3', 'Rechtswidriges Rechtsgeschäft', 'Kapitel 1 – Allgemeine Vorschriften', '(1) Ein Rechtsgeschäft, das gegen ein gesetzliches Verbot verstößt, ist nichtig, wenn sich aus dem Gesetz nichts anderes ergibt.

(2) Das Eigentum an einer Sache aus einem rechtswidrigen Rechtsgeschäft geht in das Eigentum des Staates über.'),
  ('§ 4', 'Kaufvertrag', 'Kapitel 2 – Schuldverhältnisse und Verträge', '(1) Durch den Kaufvertrag verpflichten sich Käufer und Verkäufer zur Übergabe des vereinbarten Kaufgegenstands.

(2) Der Käufer verpflichtet sich zur Übergabe des vereinbarten Kaufpreises, der Verkäufer zu dessen Annahme.

(3) Der Kaufvertrag muss den Gegenstand des Kaufs und den Kaufpreis enthalten. Er ist erst mit wechselseitiger Signatur gültig.

(4) Ein Kaufvertrag ist auch mündlich gültig, sofern er einen Wert von $250.000 nicht überschreitet.'),
  ('§ 5', 'Darlehensvertrag', 'Kapitel 2 – Schuldverhältnisse und Verträge', '(1) Durch einen Darlehensvertrag verpflichtet sich der Darlehensgeber, dem Darlehensnehmer einen vereinbarten Geldbetrag zur Verfügung zu stellen.

(2) Der Darlehensnehmer verpflichtet sich zur rechtzeitigen Rückzahlung des zur Verfügung gestellten Geldbetrags. Hierzu können Zinsen vereinbart werden.

(3) Der Darlehensvertrag muss Darlehensbetrag, Rückzahlungszeitraum und Rückzahlungsraten enthalten. Er ist erst mit wechselseitiger Signatur gültig.'),
  ('§ 6', 'Schenkungsvertrag', 'Kapitel 2 – Schuldverhältnisse und Verträge', '(1) Eine Zuwendung, durch die jemand aus seinem Vermögen einen anderen bereichert, ist eine Schenkung, wenn beide Teile darüber einig sind, dass die Zuwendung unentgeltlich erfolgt.

(2) Einer juristischen oder natürlichen Person ist die Schenkung an eine andere juristische oder natürliche Person gestattet.'),
  ('§ 7', 'Mietvertrag', 'Kapitel 2 – Schuldverhältnisse und Verträge', '(1) Durch einen Mietvertrag verpflichtet sich der Vermieter, dem Mieter eine Wohnung zur Verfügung zu stellen.

(2) Der Mieter verpflichtet sich, dem Vermieter in vereinbarten Zeitabständen eine vereinbarte Miete zu zahlen.

(3) Die Miete kann angepasst werden, darf jedoch den Höchstbetrag von $300 je Mietzahlung nicht übersteigen.

(4) Der Mietvertrag muss Anschrift, Mietzeitraum, Mietkosten und den zeitlichen Abstand der Mietzahlungen enthalten. Er ist erst mit wechselseitiger Signatur gültig.'),
  ('§ 8', 'Räumung', 'Kapitel 2 – Schuldverhältnisse und Verträge', '(1) Das Gericht kann bei einem Verstoß gegen einen Mietvertrag die Räumung der Wohnung anordnen.

(2) Der Beschluss ist dem Mieter schriftlich bekannt zu geben.

(3) Das Gericht kann für die Räumung unmittelbaren Zwang anordnen.'),
  ('§ 9', 'Eigentum und Besitz', 'Kapitel 3 – Sachenrecht', '(1) Eigentümer einer Sache ist, wem die Sache rechtlich zusteht. Der Eigentümer kann mit der Sache nach Belieben verfahren und andere von jeder Einwirkung ausschließen, soweit nicht das Gesetz oder Rechte Dritter entgegenstehen.

(2) Besitzer einer Sache ist, wer die tatsächliche Gewalt über die Sache ausübt. Besitz und Eigentum können auseinanderfallen.'),
  ('§ 10', 'Übertragung des Eigentums', 'Kapitel 3 – Sachenrecht', '(1) Zur Übertragung des Eigentums an einer Sache sind die Einigung des Eigentümers und des Erwerbers über den Eigentumsübergang sowie die Übergabe der Sache erforderlich.

(2) Sind sich beide über den Eigentumsübergang einig und besitzt der Erwerber die Sache bereits, so genügt die Einigung.

(3) Das Eigentum an einer Sache aus einem rechtswidrigen Rechtsgeschäft geht nicht über; es gilt § 3 Abs. 2.'),
  ('§ 11', 'Eigentumsvermutung', 'Kapitel 3 – Sachenrecht', '(1) Zugunsten des Besitzers einer beweglichen Sache wird vermutet, dass er ihr Eigentümer ist.

(2) Die Vermutung gilt nicht gegenüber einem früheren Besitzer, dem die Sache gestohlen wurde, verloren gegangen oder sonst abhandengekommen ist.'),
  ('§ 12', 'Fund', 'Kapitel 3 – Sachenrecht', '(1) Wer eine verlorene Sache findet und an sich nimmt, ist verpflichtet, dies unverzüglich einer zuständigen Behörde anzuzeigen, sofern der Empfangsberechtigte nicht bekannt ist.

(2) Der Finder erwirbt das Eigentum an der Sache, wenn sich innerhalb einer angemessenen Frist kein Empfangsberechtigter ermitteln lässt.

(3) Eine herrenlose Sache, an der niemand Eigentum beansprucht, kann durch Inbesitznahme zu Eigentum erworben werden, soweit nicht das Gesetz den Erwerb verbietet oder die Sache dem Staat zusteht.'),
  ('§ 13', 'Grundstücke', 'Kapitel 3 – Sachenrecht', '(1) Grundstücke sind unbewegliche Sachen. Für die Übertragung des Eigentums an einem Grundstück gelten die §§ 10 und 11 entsprechend, soweit nachfolgend nichts anderes bestimmt ist.

(2) Die Verwaltung freier und staatlicher Grundstücke obliegt dem Staat. Der Staat (vertreten durchs Bauamt; OOC die Mapper oder das Highteam) kann freie Grundstücke vergeben sowie einzelne Grundstücke als nicht frei verfügbar bestimmen. Ein als nicht frei verfügbar bestimmtes Grundstück darf nicht erworben, bebaut oder in Besitz genommen werden.

(3) Die Eintragung eines Gewerbes auf einem Grundstück begründet weder Eigentum noch Besitz an diesem Grundstück. Wer ein Gewerbe auf einem Grundstück einträgt, das ihm nicht gehört, erlangt dadurch keine Rechte an dem Grundstück.

(4) Ein entgegen Absatz 2 begründeter Besitz oder Erwerb ist unwirksam.'),
  ('§ 14', 'Selbsthilfe', 'Kapitel 4 – Selbsthilfe und Schadensersatz', '(1) Jeder juristischen oder natürlichen Person ist es gestattet, zum Zwecke der Selbsthilfe fremde Sachen wegzunehmen, zu verwahren oder zu versetzen.

(2) Die Selbsthilfe ist erlaubt, wenn

1. sich fremde Gegenstände auf dem eigenen befriedeten Besitztum befinden,
2. bei Zahlungsunfähigkeit aus einem Vertrag ein Pfand genommen wird oder
3. dies notwendig ist, um Zufahrten zum eigenen Grundstück freizuhalten.

(3) Ein nach Absatz 2 Nummer 2 genommenes Pfand darf verwertet werden, wenn

1. dem Schuldner zuvor eine angemessene Frist zur Zahlung gesetzt und diese erfolglos verstrichen ist und
2. die Verwertung schriftlich angekündigt wurde.

Die Verwertung ist nur bis zur Höhe der offenen Forderung zulässig. Ein den Forderungsbetrag übersteigender Erlös ist unverzüglich an den Schuldner herauszugeben.

(4) In den übrigen Fällen des Absatzes 2 ist die Verwertung der erlangten Gegenstände nicht erlaubt.

(5) Die Selbsthilfe darf nicht weiter gehen, als zur Abwendung der Gefahr oder zur Sicherung der Forderung erforderlich ist.'),
  ('§ 15', 'Schadensersatzpflicht', 'Kapitel 4 – Selbsthilfe und Schadensersatz', '(1) Wer zum Schadensersatz verpflichtet ist, hat den Zustand wiederherzustellen, der bestehen würde, wenn der zum Ersatz verpflichtende Umstand nicht eingetreten wäre.

(2) Schadensersatzpflichtig ist jede natürliche oder juristische Person, die das Eintreten eines Schadens an Gesundheit oder Eigentum zu verantworten hat. Ferner ist schadensersatzpflichtig, wer eine Vereinbarung im Sinne dieses Gesetzes gebrochen oder die Selbsthilfe notwendig gemacht hat.

(3) Eine Schadensersatzforderung ist dem Schadensersatzpflichtigen schriftlich zuzustellen.

(4) Sofern sich Schadensersatzforderer und Schadensersatzpflichtiger nicht selbstständig einigen können, kann der Schadensersatz gerichtlich eingefordert werden.'),
  ('§ 16', 'Zivilklage', 'Kapitel 5 – Gerichtliche Durchsetzung', '(1) Die Zivilklage kann nur durch das Gericht eröffnet werden. Hierzu bedarf es eines schriftlichen Antrags.

(2) Die Eröffnung ist zulässig, sobald eine Schadensersatzpflicht geltend gemacht wird. Der Streitwert wird vom Antragsteller festgelegt und vom Gericht angenommen oder abgelehnt.

(3) Das Gericht hat zunächst auf eine Selbstklärung hinzuwirken.

(4) Können sich beide Parteien nicht einigen, ist ein Zivilprozess zu eröffnen. In diesem werden der Schadensersatzanspruch und der Streitwert geprüft.

(5) Bei Feststellung einer Schadensersatzpflicht verpflichtet das Gericht den Schadensersatzpflichtigen zur Zahlung eines Geldbetrags. Sind keine Geldwerte vorhanden, so kann der Eigentumsübergang von Sachwerten angeordnet werden.

(6) Der Ausgang der Zivilklage ist schriftlich bekanntzugeben.

(7) Der Schadensersatzpflichtige ist zur Übergabe des festgelegten Schadensersatzes verpflichtet. Bei Weigerung ist das Gericht befugt, die Durchsuchung und Beschlagnahme mit anschließender Einziehung anzuordnen. Ferner kann es gegen den Schadensersatzpflichtigen eine Beugehaft verhängen, bis der Schadensersatzanspruch erfüllt ist.'),
  ('§ 17', 'Adhäsionsverfahren', 'Kapitel 5 – Gerichtliche Durchsetzung', '(1) Der Verletzte oder sein Erbe kann einen aus einer Straftat erwachsenen Schadensersatzanspruch bereits im Strafverfahren gegen den Beschuldigten geltend machen (Adhäsionsverfahren).

(2) Der Anspruch richtet sich nach den Vorschriften dieses Gesetzes über die Schadensersatzpflicht. Der Antrag ist bis zum Beginn der Schlussvorträge bei dem mit der Strafsache befassten Gericht schriftlich oder mündlich zu stellen.

(3) Das Gericht gibt dem Antrag in dem Urteil statt, mit dem der Angeklagte schuldig gesprochen wird, soweit der Anspruch wegen der Tat begründet ist. Die Entscheidung kann sich auf den Grund oder einen Teil des Anspruchs beschränken.

(4) Das Gericht sieht von einer Entscheidung über den Antrag ab, wenn dieser unzulässig ist oder sich zur Erledigung im Strafverfahren nicht eignet. In diesem Fall kann der Anspruch im Wege der Zivilklage (§ 16) weiterverfolgt werden.

(5) Soweit dem Antrag stattgegeben wird, steht die Entscheidung einem im Zivilprozess ergangenen Urteil gleich; § 16 Abs. 7 gilt entsprechend.

(6) Wird derselbe Anspruch bereits im Adhäsionsverfahren geltend gemacht, so ist eine Zivilklage insoweit unzulässig. Wird der Angeklagte freigesprochen oder das Strafverfahren eingestellt, ohne dass über den Anspruch entschieden wurde, so bleibt die Zivilklage unberührt.'),
  ('§ 18', 'Einstweilige Verfügung bezüglich des Streitgegenstands', 'Kapitel 5 – Gerichtliche Durchsetzung', '(1) Einstweilige Verfügungen in Bezug auf den Streitgegenstand sind zulässig, wenn zu besorgen ist, dass durch eine Veränderung des bestehenden Zustandes die Verwirklichung des Rechts einer Partei vereitelt oder wesentlich erschwert werden könnte.

(2) Einstweilige Verfügungen sind auch zur Regelung eines einstweiligen Zustandes in Bezug auf ein streitiges Rechtsverhältnis zulässig, sofern dies, insbesondere bei dauernden Rechtsverhältnissen, zur Abwendung wesentlicher Nachteile oder zur Verhinderung drohender Gewalt oder aus anderen Gründen nötig erscheint.

(3) Das Gericht bestimmt nach freiem Ermessen, welche Anordnungen zur Erreichung des Zweckes erforderlich sind.

(4) Die einstweilige Verfügung kann auch darin bestehen, dass dem Gegner eine Handlung geboten oder verboten wird, insbesondere die Veräußerung, Belastung oder Verpfändung eines Grundstücks untersagt wird.'),
  ('§ 19', 'Augenschein und Sachverständige', 'Kapitel 5 – Gerichtliche Durchsetzung', '(1) Das Gericht kann die Einnahme des Augenscheins sowie die Hinzuziehung von Sachverständigen anordnen. Es kann zu diesem Zweck einer Partei oder einem Dritten die Vorlegung eines in ihrem oder seinem Besitz befindlichen Gegenstandes aufgeben und hierfür eine Frist setzen. Es kann auch die Duldung der Maßnahme aufgeben, sofern nicht eine Wohnung betroffen ist.

(2) Dritte sind zur Vorlegung oder Duldung nicht verpflichtet, soweit sie zur Zeugnisverweigerung berechtigt sind.

(3) Die Auswahl der zuzuziehenden Sachverständigen und die Bestimmung ihrer Anzahl erfolgt durch das Gericht. Es kann sich auf einen einzigen Sachverständigen beschränken und an Stelle der zuerst ernannten andere ernennen.

(4) Vor der Ernennung können die Parteien zur Person des Sachverständigen gehört werden.'),
  ('§ 20', 'Ausweispflicht', 'Kapitel 6 – Ausweispflicht', '(1) Personen, die sich in den Vereinigten Staaten, namentlich in San Andreas, aufhalten, haben einen gültigen Ausweis zu besitzen. Sie müssen ihn auf Verlangen einer zur Feststellung der Identität berechtigten Behörde vorlegen und es ihr ermöglichen, ihr Gesicht mit dem Lichtbild des Ausweises abzugleichen.

(2) Vom Ausweisinhaber darf nicht verlangt werden, den Ausweis zu hinterlegen oder in sonstiger Weise den Gewahrsam daran aufzugeben. Dies gilt nicht gegenüber den zur Identitätsfeststellung berechtigten Behörden sowie in den Fällen der Einziehung und Sicherstellung.

(3) Zur Identitätsfeststellung berechtigte Behörden sind die Polizeibehörden und die Staatsanwaltschaft.'),
  ('§ 21', 'Voraussetzungen der Ehefähigkeit', 'Kapitel 7 – Familienrecht', '(1) Eine Ehe darf zwischen zwei rechtsfähigen Personen geschlossen werden. Minderjährige bedürfen zusätzlich der Genehmigung des zuständigen Gerichts sowie der Zustimmung beider Elternteile.

(2) Eine Person kann mehrere Ehen gleichzeitig führen. Die Zahl der Ehen einer Person ist nicht beschränkt.'),
  ('§ 22', 'Freiwilligkeit der Eheschließung', 'Kapitel 7 – Familienrecht', 'Die Ehe darf nur auf Grundlage freier und unbeeinflusster Willenserklärungen beider Partner geschlossen werden. Eine unter Zwang, Drohung oder Täuschung geschlossene Ehe ist nichtig.'),
  ('§ 23', 'Anmeldung der Eheschließung', 'Kapitel 7 – Familienrecht', '(1) Die Eheschließung ist beim zuständigen Standesbeamten schriftlich oder elektronisch anzumelden. Die Partner müssen gültige Ausweisdokumente und Geburtsurkunden vorlegen.

(2) Geburtsurkunden sind nur nach Beglaubigung durch den San Andreas Medical Service als vollwertig und staatlich anerkannt.

(3) Standesbeamte werden durch die Richterschaft bestimmt.'),
  ('§ 24', 'Form der Eheschließung', 'Kapitel 7 – Familienrecht', '(1) Die Ehe wird durch die gleichzeitige Erklärung beider Partner vor einem Standesbeamten geschlossen. Dabei müssen beide bestätigen, die Ehe eingehen zu wollen.

(2) Für die Schließung der Ehe kann durch den Standesbeamten eine Gebühr erhoben werden.'),
  ('§ 25', 'Öffentliche Beurkundung', 'Kapitel 7 – Familienrecht', 'Die Eheschließung wird unmittelbar nach der Erklärung im Eheregister eingetragen und mit einer Eheurkunde beurkundet, auf der auch ein Wunsch auf Nachnamensänderung beider Partner berücksichtigt wird. Auf Wunsch kann eine öffentliche Zeremonie im Rahmen der standesamtlichen Trauung stattfinden.'),
  ('§ 26', 'Beendigung des Eheverhältnisses; Scheidung', 'Kapitel 7 – Familienrecht', '(1) Eine Ehe kann nur durch Beschluss des zuständigen Gerichts geschieden werden. Voraussetzung ist ein Antrag eines oder beider Ehepartner.

(2) Vor der Scheidung findet eine Anhörung vor dem zuständigen Richter statt. Dabei prüft das Gericht die Gründe für das Scheitern der Ehe und stellt fest, ob die Ehe als dauerhaft zerrüttet gilt.

(3) Im Rahmen der Scheidung entscheidet das Gericht auch über die Aufteilung des gemeinsamen Vermögens und Eigentums, soweit die Ehepartner keine eigene Regelung getroffen haben.

(4) Für die Scheidung kann durch das Gericht eine Gebühr erhoben werden.'),
  ('§ 27', 'Ausstellung und Beglaubigung von Geburtsurkunden', 'Kapitel 7 – Familienrecht', '(1) Der Standesbeamte ist zuständig für die Ausstellung amtlicher Geburtsurkunden. Diese enthalten Vor- und Nachnamen, Geburtsdatum, Geburtsort sowie Angaben zu den rechtlichen Eltern, sofern diese festgestellt wurden.

(2) Bestehen begründete Zweifel an einer oder mehreren der in Absatz 1 genannten Angaben, so stellt der Standesbeamte eine vorläufige, nicht beglaubigte Geburtsurkunde aus. Diese kann durch den San Andreas Medical Service beglaubigt werden.

(3) Die Weiterleitung an den San Andreas Medical Service führt zu einer Minderung der Gebühren sowohl für die Ausstellung der Geburtsurkunde als auch für die durch den San Andreas Medical Service erhobenen Kosten zur Feststellung der Angaben.'),
  ('§ 28', 'Zuständigkeit bei Adoptionen', 'Kapitel 7 – Familienrecht', '(1) Der Standesbeamte führt ein zentrales Adoptionsregister und ist zuständig für die Beurkundung und Dokumentation rechtskräftiger Adoptionen sowie der daraus folgenden Namensänderungen.

(2) Über die Adoption selbst entscheidet das zuständige Gericht. Nach Vorlage eines rechtskräftigen Adoptionsbeschlusses wird die Namens- und Abstammungszugehörigkeit des Kindes im Adoptionsregister entsprechend geändert; die neue Geburtsurkunde wird auf Antrag den Adoptiveltern ausgestellt.

(3) Eine Person darf höchstens zwei Kinder adoptieren.

(4) Ohne Vorlage eines gültigen Adoptionsbeschlusses darf keine Eintragung im Adoptionsregister und keine Namensänderung erfolgen. Der Standesbeamte ist berechtigt, die Unterlagen auf Echtheit und Vollständigkeit zu prüfen.'),
  ('§ 29', 'Verwandtschafts- und Schwägerschaftsgrade', 'Kapitel 7 – Familienrecht', '(1) Verwandtschaft im Sinne dieses Gesetzes besteht zwischen Personen, die voneinander in gerader Linie abstammen oder von einem gemeinsamen Vorfahren in der Seitenlinie abstammen.

(2) Verwandtschaft in gerader Linie liegt vor, wenn eine Person unmittelbar von der anderen abstammt. Hierzu gehören insbesondere:

1. Eltern und Kinder,
2. Großeltern und Enkel,
3. Urgroßeltern und Urenkel.

(3) Verwandtschaft in der Seitenlinie liegt vor, wenn zwei Personen von einem gemeinsamen Vorfahren abstammen, jedoch nicht unmittelbar voneinander. Hierzu zählen insbesondere:

1. Geschwister,
2. Onkel und Tanten sowie Neffen und Nichten,
3. Cousinen und Cousins.

(4) Der Grad der Verwandtschaft bestimmt sich nach der Zahl der vermittelnden Geburten:

1. Eltern und Kinder sind in gerader Linie ersten Grades verwandt,
2. Geschwister sind in der Seitenlinie zweiten Grades verwandt,
3. Onkel oder Tante und Neffe oder Nichte sind in der Seitenlinie dritten Grades verwandt,
4. Cousinen und Cousins sind in der Seitenlinie vierten Grades verwandt.

(5) Schwägerschaft besteht zwischen einem Ehegatten und den Verwandten des anderen Ehegatten. Der Grad der Schwägerschaft entspricht dem Grad der Verwandtschaft zwischen dem Ehegatten und der dritten Person.

(6) Personen, die weder miteinander verwandt noch verschwägert sind, gelten im Sinne dieses Gesetzes als nicht verwandt, auch wenn tatsächlich eine persönliche oder familiäre Nähebeziehung besteht.')
) as v(nummer, titel, abschnitt, text) where lower(g.kuerzel) = lower('BGB');

-- ---------- LPolG – Landespolizeigesetz (27 Paragraphen) ----------
insert into public.gesetzbuecher (kuerzel, titel, beschreibung, farbe, sortierung)
select 'LPolG', 'Landespolizeigesetz', 'Aufgaben und Befugnisse der Polizeibehörden: Gefahrenabwehr, Identitätsfeststellung, Gewahrsam, Durchsuchung, Sicherstellung und Zwang.', 'schwarz', 30
where not exists (select 1 from public.gesetzbuecher where lower(kuerzel) = lower('LPolG'));
update public.gesetzbuecher set titel = 'Landespolizeigesetz', beschreibung = 'Aufgaben und Befugnisse der Polizeibehörden: Gefahrenabwehr, Identitätsfeststellung, Gewahrsam, Durchsuchung, Sicherstellung und Zwang.'
  where lower(kuerzel) = lower('LPolG');
delete from public.paragraphen where gesetzbuch_id = (select id from public.gesetzbuecher where lower(kuerzel) = lower('LPolG'));
insert into public.paragraphen (gesetzbuch_id, nummer, titel, abschnitt, text)
select g.id, v.nummer, v.titel, v.abschnitt, v.text from public.gesetzbuecher g, (values
  ('§ 1', 'Umstand dieses Gesetzes', 'Kapitel 1 – Allgemeine Vorschriften', 'Im Rahmen dieses Gesetzes wird zur Vereinfachung auf alle Polizeibehörden Bezug genommen, sofern diese nicht gesondert benannt werden.'),
  ('§ 2', 'Begriffsbestimmung', 'Kapitel 1 – Allgemeine Vorschriften', '(1) Polizeibehörden im Sinne dieses Gesetzes sind alle im Vollzugsdienst tätigen Exekutivbeamten des Staates San Andreas. Dies beschränkt sich auf

1. das Los Santos Police Department einschließlich seiner untergeordneten Departments,
2. das National Office of Security Enforcement und
3. die Parliamentary Agents,
4. Besonders ernannte Ermittlungspersonen der Staatsanwaltschaft.

(2) Militärische Polizeibehörden im Sinne dieses Gesetzes sind alle im Vollzugsdienst tätigen Exekutivbeamten des Military Police Corps als Abordnung der National Guard.

(3) Besonders ernannte Ermittlungspersonen der Staatsanwaltschaft sind im Sinne dieses Gesetzes alle Exekutivbeamten der Special Investigations Division sowie des Department of Commercial Licensing and Investigations im Rahmen der ihnen übertragenen Aufgaben.'),
  ('§ 3', 'Aufgaben der Polizeibehörden', 'Kapitel 1 – Allgemeine Vorschriften', '(1) Die Polizeibehörden haben die Aufgabe, die allgemein oder im Einzelfall bestehenden Gefahren für die öffentliche Sicherheit oder Ordnung abzuwehren.

(2) Im Rahmen ihrer Aufgabe nach Absatz 1 obliegt der Polizeibehörde der Schutz privater Rechte nur dann, wenn

1. gerichtlicher Schutz nicht rechtzeitig zu erlangen ist und
2. ohne hoheitliche Hilfe die Verwirklichung des Rechts vereitelt oder wesentlich erschwert würde.

(3) Die Polizeibehörde leistet anderen Behörden und den Gerichten Vollzugshilfe.

(4) Die Polizeibehörde erfüllt ferner die Aufgaben, die ihr durch andere Rechtsvorschriften übertragen sind.'),
  ('§ 4', 'Verhältnis zur Strafprozessordnung', 'Kapitel 1 – Allgemeine Vorschriften', '(1) Maßnahmen, die der Abwehr einer gegenwärtigen oder drohenden Gefahr dienen, richten sich nach diesem Gesetz.

(2) Maßnahmen, die der Verfolgung einer Straftat oder der Sicherung von Beweisen dienen, richten sich nach der Strafprozessordnung.

(3) Wird eine nach diesem Gesetz begonnene Maßnahme der Gefahrenabwehr zum Zweck der Strafverfolgung fortgeführt, so gelten ab diesem Zeitpunkt die Vorschriften der Strafprozessordnung.

(4) Bei Zweifeln über die Anwendbarkeit ist auf den überwiegenden Zweck der Maßnahme abzustellen.'),
  ('§ 5', 'Grundsatz der Verhältnismäßigkeit', 'Kapitel 1 – Allgemeine Vorschriften', '(1) Von mehreren möglichen und geeigneten Maßnahmen hat die Polizeibehörde diejenige zu treffen, die den Einzelnen und die Allgemeinheit am wenigsten beeinträchtigt.

(2) Die Polizeibehörde trifft ihre Maßnahmen nach pflichtgemäßem Ermessen. Kommen zur Abwehr einer Gefahr mehrere Mittel in Betracht, so genügt es, wenn eines davon bestimmt wird. Dem Betroffenen ist auf Antrag zu gestatten, ein anderes ebenso wirksames Mittel anzuwenden, sofern die Allgemeinheit dadurch nicht stärker beeinträchtigt wird.

(3) Eine Maßnahme ist nur so lange zulässig, bis ihr Zweck erreicht ist oder sich zeigt, dass er nicht erreicht werden kann.

(4) Die Verwendung von Schusswaffen gegen Insassen des Staatsgefängnis, stellt die Verwendung von Gummigeschossen dar und ist dabei bei Ungehorsam, Ausbruchsversuche, Angriffen auf andere und ähnliches Fehlverhalten gerechtfertigt.'),
  ('§ 6', 'Verantwortlichkeit für das Verhalten von Personen', 'Kapitel 2 – Verantwortlichkeit', '(1) Verursacht eine Person eine Gefahr, so sind die Maßnahmen gegen sie zu richten.

(2) Wurde eine Person zu einer Tat angestiftet, deren Ausführung eine Gefahr für andere bedeutet, so können Maßnahmen auch gegen den Anstifter gerichtet werden.'),
  ('§ 7', 'Verantwortlichkeit für den Zustand von Sachen', 'Kapitel 2 – Verantwortlichkeit', '(1) Geht von einer Sache eine Gefahr aus, so sind die Maßnahmen gegen den Inhaber der tatsächlichen Gewalt zu richten.

(2) Maßnahmen können auch gegen den Eigentümer oder einen anderen Berechtigten gerichtet werden. Dies gilt nicht, wenn der Inhaber der tatsächlichen Gewalt diese ohne den Willen des Eigentümers oder Berechtigten ausübt.

(3) Geht die Gefahr von einer herrenlosen Sache aus, so können Maßnahmen gegen denjenigen gerichtet werden, der das Eigentum an der Sache aufgegeben hat.

(4) Für Fahrzeuge gilt die Halterhaftung. Wird durch ein Fahrzeug oder mit dessen Unterstützung ein Gesetzesverstoß begangen und kann kein Insasse ermittelt werden, so haftet der Halter des Fahrzeugs. Dies gilt nicht, wenn der Halter eindeutig belegen kann, dass er zum Tatzeitpunkt keinen Zugriff auf sein Fahrzeug hatte, oder die Person benennen kann, die zum Tatzeitpunkt das Fahrzeug geführt hat.'),
  ('§ 8', 'Pflichten von Exekutivbeamten', 'Kapitel 3 – Befugnisse und Standardmaßnahmen', '(1) Auf Verlangen muss sich ein Exekutivbeamter mittels Dienstausweis ausweisen oder die Dienstnummer nennen, sofern die fordernde Person ein berechtigtes Interesse daran hat. Ein berechtigtes Interesse liegt in der Regel vor, wenn die Person

1. unmittelbar von einer polizeilichen Maßnahme betroffen ist,
2. Inhaber eines befriedeten Besitztums ist, das der Exekutivbeamte im Zuge einer dienstlichen Handlung betritt, oder
3. durch eine vom Exekutivbeamten begangene Straftat unmittelbar geschädigt ist,

soweit der Zweck der Maßnahme dadurch nicht unverhältnismäßig beeinträchtigt wird. Die Verweigerung der Ausweispflicht wird disziplinarrechtlich geahndet.

(2) Angehörige von Spezialeinheiten des Los Santos Police Department müssen nach Absatz 1 stets nur ihre Dienstnummer nennen, sofern sie eindeutig als Angehörige dieser Einheiten zu erkennen sind. Agenten des National Office of Security Enforcement müssen ihre Identität aufgrund ihrer nachrichtendienstlichen Tätigkeit nicht preisgeben.

(3) Exekutivbeamte sind verpflichtet, Straftaten zu verfolgen. Liegt eine Straftat außerhalb der eigenen Zuständigkeit, so ist sicherzustellen, dass sie an einen zuständigen Beamten weitergegeben wird.'),
  ('§ 9', 'Allgemeine Befugnisse', 'Kapitel 3 – Befugnisse und Standardmaßnahmen', '(1) Die Polizeibehörden können die notwendigen Maßnahmen treffen, um eine im einzelnen Fall bestehende Gefahr für die öffentliche Sicherheit oder Ordnung abzuwehren.

(2) Eine Maßnahme im Sinne des Absatzes 1 kann die Polizeibehörde insbesondere dann treffen, wenn sie notwendig ist, um

1. Straftaten, Ordnungswidrigkeiten oder verfassungsfeindliche Handlungen zu verhüten oder zu unterbinden,
2. durch solche Handlungen verursachte Zustände zu beseitigen oder
3. Gefahren abzuwehren oder Zustände zu beseitigen, die Leben, Gesundheit oder die Freiheit einer Person oder Sachen, deren Erhaltung im öffentlichen Interesse geboten erscheint, bedrohen oder verletzen.

(3) Die Polizeibehörde kann unabhängig von den Absätzen 1 und 2 die notwendigen Maßnahmen treffen, um den Sachverhalt aufzuklären und die Entstehung einer Gefahr für ein bedeutendes Rechtsgut zu verhindern, wenn im Einzelfall

1. das individuelle Verhalten einer Person die konkrete Wahrscheinlichkeit begründet oder
2. Vorbereitungshandlungen für sich oder zusammen mit weiteren bestimmten Tatsachen den Schluss auf ein seiner Art nach konkretisiertes Geschehen zulassen,

wonach in absehbarer Zeit Angriffe von erheblicher Intensität oder Auswirkung zu erwarten sind (drohende Gefahr).

(4) Bedeutende Rechtsgüter sind:

1. der Bestand oder die Sicherheit des Staates,
2. Leben, Gesundheit oder Freiheit einer Person,
3. erhebliche Eigentumspositionen oder
4. Sachen, deren Erhalt im besonderen öffentlichen Interesse liegt.'),
  ('§ 10', 'Auskunftspflicht und Identitätsfeststellung', 'Kapitel 3 – Befugnisse und Standardmaßnahmen', '(1) Auf Befragen durch die Polizeibehörde ist eine Person verpflichtet, Name, Vorname, Geburtsdatum und Wohnanschrift anzugeben, wenn anzunehmen ist, dass sie sachdienliche Angaben machen kann, die zur Erfüllung einer bestimmten hoheitlichen Aufgabe erforderlich sind. Ein amtlicher Lichtbildausweis ist zu zeigen. Zu weiteren Auskünften ist die Person nur verpflichtet, soweit für sie gesetzliche Handlungspflichten bestehen.

(2) Für die Dauer einer Befragung nach Absatz 1 kann die Person festgehalten werden.

(3) Die Polizeibehörde kann jederzeit die Identität einer Person feststellen.

(4) Die Polizeibehörde kann zur Feststellung der Identität die erforderlichen Maßnahmen treffen. Auf Aufforderung sind Ausweispapiere zur Prüfung auszuhändigen sowie Kleidungsstücke und Gegenstände, die eine Identitätsfeststellung verhindern oder erschweren, abzulegen.

(5) Der Betroffene kann festgehalten werden, wenn die Identität auf andere Weise nicht oder nur unter erheblichen Schwierigkeiten festgestellt werden kann. Unter den Voraussetzungen des Absatzes 4 kann der Betroffene durchsucht werden.

(6) Zum Zwecke der Identitätsfeststellung in den Fällen des Absatzes 4 können erkennungsdienstliche Maßnahmen ergriffen werden. Erkennungsdienstliche Maßnahmen sind insbesondere

1. die Aufnahme von Lichtbildern und
2. die Feststellung äußerlicher körperlicher Merkmale.'),
  ('§ 11', 'Platzverweis und Aufenthaltsanordnungen', 'Kapitel 3 – Befugnisse und Standardmaßnahmen', '(1) Die Polizeibehörden können zur Abwehr einer Gefahr oder einer drohenden Gefahr für ein bedeutendes Rechtsgut eine Person vorübergehend von einem Ort verweisen oder ihr vorübergehend das Betreten eines Ortes verbieten. Ein Platzverweis kann ferner gegen Personen angeordnet werden, die den Einsatz von Hilfs- oder Rettungsdiensten behindern. Der Platzverweis darf die Dauer von 24 Stunden nicht überschreiten.

(2) Die Polizeibehörde kann zur Abwehr einer Gefahr oder einer drohenden Gefahr für ein bedeutendes Rechtsgut mit richterlicher Erlaubnis einer Person verbieten,

1. zu bestimmten Personen oder zu Personen einer bestimmten Gruppe Kontakt zu suchen oder aufzunehmen oder
2. sich, wenn die Begehung von Straftaten droht, an bestimmte Orte oder in ein bestimmtes Gebiet zu begeben.

Die Anordnungen dürfen die Dauer von drei Tagen nicht überschreiten und können um jeweils längstens drei Tage verlängert werden.

(3) Die Polizeibehörde kann eine Versammlung nur dann und unter Angabe des Grundes auflösen, wenn

1. der Veranstalter mit der Durchführung eine durch das Gericht für verfassungswidrig erklärte Organisation fördern will,
2. der Veranstalter mit der Durchführung eine durch das Gericht für kriminell erklärte oder verbotene Organisation fördern will,
3. die Versammlung einen gewalttätigen oder aufrührerischen Verlauf nimmt oder unmittelbare Gefahr für Leben und Gesundheit der Teilnehmer besteht,
4. der Leiter Teilnehmer, die Waffen mit sich führen, nicht sofort ausschließt und für die Durchführung des Ausschlusses sorgt, oder
5. durch den Verlauf der Versammlung gegen Gesetze verstoßen wird oder in der Versammlung zu Straftaten aufgefordert oder angestiftet wird und der Leiter dies nicht unverzüglich unterbindet.

In den Fällen der Nummern 3 bis 5 ist die Auflösung nur zulässig, wenn andere hoheitliche Maßnahmen, insbesondere eine Unterbrechung, nicht ausreichen oder als nicht ausreichend erachtet werden.

(4) Sobald eine Versammlung für aufgelöst erklärt ist, haben alle Teilnehmer sich sofort zu entfernen. Notwendigenfalls kann die Auflösung durch die Polizeibehörden durchgesetzt werden.'),
  ('§ 12', 'Gewahrsam', 'Kapitel 4 – Freiheitsentziehung', '(1) Die Polizeibehörde kann eine Person in Gewahrsam nehmen, wenn

1. dies zum Schutz der Person gegen eine Gefahr für Leib oder Leben erforderlich ist oder
2. dies unerlässlich ist, um die unmittelbar bevorstehende Begehung oder Fortsetzung einer Straftat zu verhindern.

(2) Die Annahme, dass eine Person eine Straftat begehen oder zu ihrer Begehung beitragen wird, kann sich insbesondere darauf stützen, dass

1. die Person die Begehung der Tat angekündigt oder dazu aufgefordert hat,
2. bei der Person oder ihrer Begleitperson Waffen, Werkzeuge oder sonstige Gegenstände aufgefunden werden, die ersichtlich zur Tatbegehung bestimmt sind oder erfahrungsgemäß bei derartigen Taten verwendet werden, und sie den Umständen nach hiervon Kenntnis haben musste, oder
3. die Person bereits in der Vergangenheit mehrfach aus vergleichbarem Anlass als Störer bei der Begehung von Straftaten betroffen worden ist und nach den Umständen eine Wiederholung zu erwarten ist.

(3) Die Polizeibehörde kann eine Person, die aus dem Vollzug von Untersuchungshaft, Freiheitsstrafen oder freiheitsentziehenden Maßregeln der Besserung und Sicherung entwichen ist oder sich sonst ohne Erlaubnis außerhalb der Vollzugsanstalt aufhält, in Gewahrsam nehmen und in die Anstalt zurückbringen.'),
  ('§ 13', 'Behandlung festgehaltener Personen', 'Kapitel 4 – Freiheitsentziehung', 'Wird eine Person aufgrund des § 12 festgehalten, so ist ihr unverzüglich der Grund bekanntzugeben und sie über ihre Rechte nach der Strafprozessordnung zu belehren. Sind der Person ihre Rechte bekannt und tut sie dies eindeutig kund, so ist eine Belehrung nicht zwingend erforderlich.'),
  ('§ 14', 'Dauer der Freiheitsentziehung', 'Kapitel 4 – Freiheitsentziehung', 'Die festgehaltene Person ist zu entlassen,

1. sobald der Grund für die Maßnahme weggefallen ist,
2. sobald die Fortdauer der Freiheitsentziehung durch richterliche Entscheidung für unzulässig erklärt wird oder
3. sobald die Dauer von 24 Stunden überschritten ist.'),
  ('§ 15', 'Durchsuchung von Personen', 'Kapitel 5 – Durchsuchung und Sicherstellung', '(1) Die Polizeibehörde kann eine Person durchsuchen, wenn

1. Tatsachen die Annahme rechtfertigen, dass sie Sachen mit sich führt, die sichergestellt werden dürfen,
2. sie sich erkennbar in einem die freie Willensbestimmung ausschließenden Zustand oder sonst in hilfloser Lage befindet,
3. eine drohende Gefahr für ein bedeutendes Rechtsgut vorliegt,
4. sie sich an einem Ort aufhält, von dem aufgrund tatsächlicher Anhaltspunkte anzunehmen ist, dass dort Personen Straftaten verabreden, vorbereiten oder verüben oder sich Straftäter verbergen, oder
5. sie sich in einer Verkehrs- oder Versorgungsanlage, einem öffentlichen Verkehrsmittel, einem staatlichen Dienstgebäude oder einem anderen besonders gefährdeten Objekt oder in unmittelbarer Nähe hiervon aufhält und Tatsachen die Annahme rechtfertigen, dass an Objekten dieser Art Straftaten begangen werden sollen, durch die dort befindliche Personen oder die Objekte selbst unmittelbar gefährdet sind.

(2) Die Polizeibehörde kann eine Person, deren Identität festgestellt werden soll oder die nach anderen Rechtsvorschriften festgehalten werden soll, nach Waffen, anderen gefährlichen Werkzeugen und Sprengmitteln durchsuchen, wenn dies zum Schutz des Exekutivbeamten oder eines Dritten erforderlich ist.

(3) Die Vorschriften der Strafprozessordnung bleiben unberührt.'),
  ('§ 16', 'Durchsuchung von Sachen', 'Kapitel 5 – Durchsuchung und Sicherstellung', 'Die Polizeibehörde kann eine Sache durchsuchen, wenn

1. sie von einer Person mitgeführt wird, die nach § 15 durchsucht werden darf,
2. Tatsachen die Annahme rechtfertigen, dass sich in ihr eine Person befindet, die
    a) in Gewahrsam genommen werden soll,
    b) widerrechtlich festgehalten wird oder
    c) hilflos ist, oder
3. ein schriftlicher Durchsuchungsbeschluss vorliegt.'),
  ('§ 17', 'Betreten und Durchsuchung von Wohnungen', 'Kapitel 5 – Durchsuchung und Sicherstellung', '(1) Die Durchsuchung eines Gebäudes oder eines Teiles davon bedarf eines richterlichen Beschlusses.

(2) Eine Ausnahme besteht, sofern bei einer späteren Durchsuchung die Beweise nicht mehr gesichert werden könnten. Der bloße Verdacht der Verschleierung reicht hierfür nicht aus. Ein nachträglicher Durchsuchungsbeschluss ist gemäß § 4 Abs. 4 der Strafprozessordnung zu beantragen.

(3) Soweit die freiwillige Einwilligung des Berechtigten schriftlich vorliegt, bedarf es keines zusätzlichen Durchsuchungsbeschlusses.'),
  ('§ 18', 'Sicherstellung', 'Kapitel 5 – Durchsuchung und Sicherstellung', '(1) Die Polizeibehörde kann eine Sache sicherstellen,

1. wenn eine Rechtsvorschrift den Besitz der Sache verbietet,
2. zur Abwehr einer gegenwärtigen oder unmittelbar drohenden Gefahr für Leib und Leben,
3. um den Eigentümer vor Verlust oder Beschädigung der Sache zu schützen oder
4. wenn sie von einer festgehaltenen Person mitgeführt wird und dazu verwendet werden kann, um
    a) sich oder andere zu verletzen,
    b) fremde Sachen zu beschädigen oder
    c) sich oder anderen die Flucht zu ermöglichen oder zu erleichtern.

(2) Die Polizeibehörde kann ein Fahrzeug in der Polizeiverwahrstelle sicherstellen, wenn dieses

1. im Zusammenhang mit einer strafbaren Handlung vorgefunden wird oder
2. ein Richter die Sicherstellung anordnet.'),
  ('§ 19', 'Verwahrung sichergestellter Sachen', 'Kapitel 5 – Durchsuchung und Sicherstellung', '(1) Sichergestellte Sachen sind in Verwahrung zu nehmen. Lässt die Beschaffenheit der Sachen dies nicht zu oder erscheint die Verwahrung bei der Polizeibehörde unzweckmäßig, so sind die Sachen auf andere geeignete Weise aufzubewahren oder zu sichern. In diesem Fall kann die Verwahrung auch einer anderen staatlichen Behörde übertragen werden.

(2) Die verwahrten Sachen sind zu verzeichnen. Bei unrechtmäßigem Verlust haftet die zuständige Behörde.'),
  ('§ 20', 'Beendigung der Sicherstellung', 'Kapitel 5 – Durchsuchung und Sicherstellung', '(1) Sachen sind an denjenigen herauszugeben, bei dem sie sichergestellt wurden. Die Herausgabe ist ausgeschlossen, wenn dadurch erneut die Voraussetzungen für eine Sicherstellung einträten.

(2) Rechtmäßig sichergestellte Sachen oder Fahrzeuge dürfen bei der Herausgabe von Beamten durchsucht werden. Ausgenommen ist die Durchsuchung bei Verkehrsvergehen; hierzu wird ein richterlicher Beschluss benötigt. Fahrzeuge, die gezielt zur Durchsuchung abgeschleppt werden, benötigen ebenfalls einen richterlichen Beschluss.

(3) Vor der Herausgabe von Fahrzeugen ist die Straßentauglichkeit sicherzustellen. Andernfalls kann das Fahrzeug nur ausgegeben werden, wenn ein geeignetes Abschleppunternehmen es unverzüglich auf Privatbesitz außerhalb des öffentlich zugänglichen Bereichs verbringt oder der Besitzer das Fahrzeug straßenverkehrstauglich macht.

(4) Für Fahrzeuge, die aufgrund einer Straftat, rechtswidrigen Parkens oder Haltens sichergestellt wurden, ist vor der Herausgabe eine Freigabegebühr in Höhe von $4.000 durch den Auslösenden zu entrichten. Bei anderen Straftaten fällt eine Freigabegebühr in Höhe von $6.000 an.'),
  ('§ 21', 'Datenerhebung durch den offenen Einsatz optisch-technischer Mittel', 'Kapitel 6 – Datenerhebung und Fahndung', '(1) Zur Verhütung von Straftaten können die Polizeibehörden öffentlich zugängliche Orte beobachten und fotografisch festhalten, wenn

1. an diesem Ort wiederholt Straftaten begangen wurden,
2. die Beschaffenheit des Ortes die Begehung von Straftaten begünstigt und Tatsachen die Annahme rechtfertigen, dass dort weitere Straftaten begangen werden, und
3. jeweils ein unverzügliches Eingreifen durch die Polizeibehörden möglich ist.

(2) Die Bestimmung eines solchen Ortes erfolgt durch richterlichen Beschluss auf Antrag der Staatsanwaltschaft. Der Beschluss hat eine maximale Gültigkeit von zwei Wochen.'),
  ('§ 22', 'Ausschreibung zur Fahndung', 'Kapitel 6 – Datenerhebung und Fahndung', '(1) Die Polizeibehörde kann personenbezogene Daten, insbesondere die Personalien einer Person sowie das Kennzeichen eines von ihr benutzten Fahrzeugs, zur Fahndung ausschreiben, wenn

1. die Gesamtwürdigung der Person einschließlich ihrer bisher begangenen Straftaten erwarten lässt, dass von ihr auch künftig eine Gefahr für bedeutende Rechtsgüter ausgeht,
2. sie für eine drohende Gefahr für bedeutende Rechtsgüter verantwortlich ist,
3. tatsächliche Anhaltspunkte die Annahme rechtfertigen, dass es sich um eine mutmaßlich mit der Gefahrenlage in Zusammenhang stehende Kontaktperson einer Person nach Nummer 1 oder Nummer 2 handelt,
4. die Person sich aktiv einer Strafverfolgungsmaßnahme entzieht oder entzogen hat oder
5. die Person sich aus einem polizeilichen Gewahrsam oder Strafvollzugsgewahrsam entzieht.

(2) Wird eine Person im Sinne des Absatzes 1 Nummer 1 bis 3 oder das Fahrzeug angetroffen, so können Erkenntnisse über das Antreffen sowie über mutmaßlich mit der Gefahrenlage in Zusammenhang stehende Begleitpersonen, Fahrzeugführer und mitgeführte Sachen festgestellt werden.

(3) Liegen die Voraussetzungen für die Anordnung nicht mehr vor, ist der Zweck der Maßnahme erreicht oder zeigt sich, dass er nicht erreicht werden kann, so ist die Ausschreibung zur Fahndung unverzüglich zu löschen.'),
  ('§ 23', 'Benachrichtigungspflicht', 'Kapitel 6 – Datenerhebung und Fahndung', 'Ist wegen desselben Sachverhalts ein strafrechtliches Ermittlungsverfahren gegen den Betroffenen eingeleitet worden, so ist die Unterrichtung des Betroffenen nachzuholen, sobald der Stand des Ermittlungsverfahrens dies zulässt.'),
  ('§ 24', 'Vollzugshilfe', 'Kapitel 7 – Vollzug und Zwang', '(1) Die Polizeibehörden leisten anderen Behörden auf Ersuchen Vollzugshilfe, wenn unmittelbarer Zwang anzuwenden ist und die anderen Behörden nicht über die hierzu erforderlichen Dienstkräfte verfügen oder ihre Maßnahmen nicht auf andere Weise selbst durchsetzen können.

(2) Soweit der Gerichtsdiener des Los Santos Police Department nicht oder nicht ausreichend zur Verfügung steht, haben die anderen Polizeibehörden dem Gericht bei der Aufrechterhaltung der Ordnung in der Sitzung und bei seinen hoheitlichen Pflichten Hilfe zu leisten.'),
  ('§ 25', 'Nutzung hoheitlicher Mittel', 'Kapitel 7 – Vollzug und Zwang', '(1) Die Polizeibehörde kann nach Abwägung der Verhältnismäßigkeit geeignete Mittel einsetzen, um eine Strafverfolgung einzuleiten oder Unbeteiligte von der Hinderung einer Strafverfolgung abzuhalten. Dies gilt sowohl gegenüber Einzelpersonen als auch gegenüber Gruppen.

(2) Geeignete Mittel im Sinne des Absatzes 1 sind:

1. die Erteilung eines Platzverbots,
2. die Abnahme von Gegenständen für die Dauer der Maßnahme,
3. die Festsetzung einer Person für die Dauer der Maßnahme,
4. die Einleitung eines Verfahrens aufgrund der Behinderung einer Polizeibehörde und
5. die Festnahme einer Person aufgrund der Behinderung einer Polizeibehörde.

(3) Soweit andere Mittel nicht in Betracht kommen, kann unmittelbarer Zwang nach entsprechender Ankündigung eingesetzt werden. Der unmittelbare Zwang muss stets zweckmäßig und erfolgversprechend sein.

(4) Exekutivbeamte sind neben ihrer eigenen Einschätzung verpflichtet, unmittelbaren Zwang auf Anweisung eines Weisungsberechtigten anzuwenden, sofern diese Anweisung nicht gegen ein Gesetz verstößt.

(5) Personen, die vor oder nach dem Einsatz von Zwangsmitteln verletzt sind, steht eine adäquate medizinische Versorgung zu.'),
  ('§ 26', 'Fesselung von Personen', 'Kapitel 7 – Vollzug und Zwang', '(1) Eine Person, die nach diesem Gesetz oder nach anderen Rechtsvorschriften festgehalten wird, darf gefesselt werden, wenn Tatsachen die Annahme rechtfertigen, dass sie

1. Exekutivbeamte oder Dritte angreifen, Widerstand leisten oder Sachen beschädigen wird,
2. fliehen wird oder befreit werden soll oder
3. sich töten oder selbst verletzen wird.

(2) Stört der Festgehaltene die Arbeit der Beamten durch verbale Äußerungen oder sonstiges verbales Verhalten, so kann er durch Nutzung eines Knebels oder eines vergleichbaren Mittels ruhiggestellt werden.'),
  ('§ 27', 'Regelungen zum Waffeneinsatz von Exekutivbeamten', 'Kapitel 7 – Vollzug und Zwang', '(1) Der Einsatz von Gewalt gegenüber Dritten bedarf grundsätzlich der Einhaltung einer objektiven Verhältnismäßigkeit.

(2) Der Einsatz von Waffengewalt bedarf der vorherigen Androhung, sofern keine unmittelbare Bedrohung vorliegt. Wer sich nach einer Androhung von Waffengewalt freiwillig im Gefahrenbereich aufhält, gilt nicht weiter als Unbeteiligter.

(3) Eine Waffe ist immer so einzusetzen, dass unbeteiligte Dritte nicht fahrlässig gefährdet werden.

(4) Langwaffen dürfen nur eingesetzt werden, wenn andere Waffen bereits gescheitert sind oder eine unmittelbare Gefahr für Leib und Leben vorliegt.')
) as v(nummer, titel, abschnitt, text) where lower(g.kuerzel) = lower('LPolG');

-- ---------- BtMG – Betäubungsmittelgesetz (8 Paragraphen) ----------
insert into public.gesetzbuecher (kuerzel, titel, beschreibung, farbe, sortierung)
select 'BtMG', 'Betäubungsmittelgesetz', 'Erlaubnispflicht für Betäubungsmittel, Eigenkonsum von Cannabis, medizinische und behördliche Ausnahmen.', 'gruen', 40
where not exists (select 1 from public.gesetzbuecher where lower(kuerzel) = lower('BtMG'));
update public.gesetzbuecher set titel = 'Betäubungsmittelgesetz', beschreibung = 'Erlaubnispflicht für Betäubungsmittel, Eigenkonsum von Cannabis, medizinische und behördliche Ausnahmen.'
  where lower(kuerzel) = lower('BtMG');
delete from public.paragraphen where gesetzbuch_id = (select id from public.gesetzbuecher where lower(kuerzel) = lower('BtMG'));
insert into public.paragraphen (gesetzbuch_id, nummer, titel, abschnitt, text)
select g.id, v.nummer, v.titel, v.abschnitt, v.text from public.gesetzbuecher g, (values
  ('§ 1', 'Betäubungsmittel', 'Kapitel 1 – Allgemeine Bestimmungen', 'Betäubungsmittel im Sinne dieses Gesetzes sind die in Anlage 1 genannten Stoffe und Substanzen sowie die zu deren Herstellung benötigten Vorprodukte.'),
  ('§ 2', 'Erlaubnis', 'Kapitel 1 – Allgemeine Bestimmungen', '(1) Der Erlaubnis der Staatsanwaltschaft bedarf, wer mit Betäubungsmitteln Handel treibt oder sie, ohne mit ihnen Handel zu treiben, einführt, ausführt, abgibt, veräußert oder sonst in den Verkehr bringt.

(2) Die Staatsanwaltschaft kann andere Behörden ermächtigen, die in Absatz 1 genannten Erlaubnisse zu erteilen.'),
  ('§ 3', 'Straftaten', 'Kapitel 2 – Straftaten', '(1) Die Strafbarkeit des unerlaubten Umgangs mit Betäubungsmitteln richtet sich ausschließlich nach § 89 des Strafgesetzbuches. Die Begriffsbestimmungen, Erlaubnisse, Freimengen und Ausnahmen dieses Gesetzes bleiben nach Maßgabe jener Vorschrift anwendbar.

(2) Die Strafbarkeit des Versuchs richtet sich nach § 89 Absatz 3 des Strafgesetzbuches.

(3) Die Strafbarkeit fahrlässiger Begehung richtet sich nach § 89 Absatz 4 des Strafgesetzbuches.

(4) Treffen Straftaten nach den §§ 89 und 90 des Strafgesetzbuches untereinander oder mit anderen Straftaten zusammen, so richtet sich die Gesamtstrafe nach § 3 des Strafgesetzbuches.'),
  ('§ 4', 'Eigenkonsum von Cannabis', 'Kapitel 3 – Ausnahmen', '(1) Dieses Gesetz findet keine Anwendung auf Bürger, die Cannabis in einer geringen Menge zum Eigenkonsum besitzen.

(2) Als geringe Menge gelten bis zu drei Konsumeinheiten in Form von Joints oder eine entsprechende Menge getrockneten Cannabis von bis zu 15 Einheiten zur Herstellung derselben.

(3) Ein Besitz, der über die Freimenge nach Absatz 2 hinausgeht, unterliegt den Bestimmungen dieses Gesetzes. Die Strafbarkeit richtet sich nach § 89 des Strafgesetzbuches. Die über die Freimenge hinausgehenden Cannabiseinheiten sind sicherzustellen.

(4) Der Eigenkonsum nach Absatz 1 ist in unmittelbarer Nähe der Gebäude staatlicher Behörden nicht gestattet.

(5) Die strafrechtliche Ahndung eines Verstoßes gegen Absatz 4 richtet sich ausschließlich nach § 90 des Strafgesetzbuches.'),
  ('§ 5', 'Medizinische Ausnahme', 'Kapitel 3 – Ausnahmen', '(1) Kann die betroffene Person ein gültiges ärztliches Attest oder eine ärztliche Verordnung vorlegen, aus dem hervorgeht, dass Besitz oder Gebrauch des Betäubungsmittels aus medizinischen Gründen erforderlich ist, so findet dieses Gesetz insoweit keine Anwendung. Das Attest ist auf Verlangen der Exekutivbehörden vorzulegen.

(2) In diesem Fall darf die mitgeführte Menge zehn Konsumeinheiten in Form von Joints oder eine entsprechende Menge getrockneten Cannabis von bis zu 50 Einheiten nicht überschreiten.'),
  ('§ 6', 'Ausnahme für staatliche Behörden', 'Kapitel 3 – Ausnahmen', 'Dieses Gesetz ist, soweit es nicht ausdrücklich etwas anderes bestimmt, nicht anzuwenden auf

1. die Polizeibehörden und
2. die Staatsanwaltschaft,

soweit dies zur Durchführung ihrer Arbeit zwingend erforderlich ist.'),
  ('§ 7', 'Inkrafttreten', 'Kapitel 4 – Schlussbestimmungen', 'Dieses Gesetz tritt mit seiner Verkündung in Kraft und ist für alle natürlichen und juristischen Personen sowie Amtsträger im Geltungsbereich verbindlich.'),
  ('Anlage 1', 'Betäubungsmittel', 'Anlagen', 'Die nachfolgend aufgeführten Stoffe und Substanzen sind Betäubungsmittel im Sinne des § 1.

• Lysergid (Halluzinogen)
• Bufotenin (Halluzinogen)
• Kokain (Stimulans)
• Methamphetamin (Stimulans)
• Opium (Opiat)
• Cannabis über der in § 4 genannten Freimenge (Cannabinoid)')
) as v(nummer, titel, abschnitt, text) where lower(g.kuerzel) = lower('BtMG');

-- ---------- GewO – Gewerbeordnung (23 Paragraphen) ----------
insert into public.gesetzbuecher (kuerzel, titel, beschreibung, farbe, sortierung)
select 'GewO', 'Gewerbeordnung', 'Gewerbelizenz und -eintragung, besondere Gewerbe, Veranstaltungslizenzen, Arbeitnehmerschutz, Rohstofflizenz und Bußgelder.', 'gold', 50
where not exists (select 1 from public.gesetzbuecher where lower(kuerzel) = lower('GewO'));
update public.gesetzbuecher set titel = 'Gewerbeordnung', beschreibung = 'Gewerbelizenz und -eintragung, besondere Gewerbe, Veranstaltungslizenzen, Arbeitnehmerschutz, Rohstofflizenz und Bußgelder.'
  where lower(kuerzel) = lower('GewO');
delete from public.paragraphen where gesetzbuch_id = (select id from public.gesetzbuecher where lower(kuerzel) = lower('GewO'));
insert into public.paragraphen (gesetzbuch_id, nummer, titel, abschnitt, text)
select g.id, v.nummer, v.titel, v.abschnitt, v.text from public.gesetzbuecher g, (values
  ('§ 1', 'Begriff des Gewerbes', 'Kapitel 1 – Allgemeine Vorschriften', 'Ein Gewerbe ist jede wirtschaftliche Tätigkeit, die auf eigene Rechnung, in eigener Verantwortung und über einen gewissen Zeitraum mit Gewinnerzielungsabsicht betrieben wird.'),
  ('§ 2', 'Anmeldung und Genehmigung', 'Kapitel 1 – Allgemeine Vorschriften', '(1) Ein Gewerbe jeder Art bedarf der Genehmigung durch die Staatsanwaltschaft. Hierzu wird eine Gewerbelizenz erteilt.

(2) Ein Gewerbe, dessen Ausübung gegen geltendes Recht verstoßen würde, ist abzulehnen.

(3) Die Staatsanwaltschaft kann Verstöße durch Gewerbe verfolgen und erteilte Lizenzen entziehen.

(4) Das Gericht kann den Entzug einer Lizenz überprüfen. Es kann den Entzug anordnen sowie eine zu Unrecht entzogene Lizenz wiederherstellen; erweist sich der Entzug durch die Staatsanwaltschaft als rechtswidrig, so ist die Lizenz auf gerichtliche Anordnung zurückzugeben.'),
  ('§ 3', 'Gewerbeeintragung', 'Kapitel 1 – Allgemeine Vorschriften', '(1) Wer ein Gewerbe ausübt, hat dieses bei der Staatsanwaltschaft in das Gewerberegister eintragen zu lassen. Voraussetzung der Eintragung ist eine gültige Gewerbelizenz nach § 2.

(2) Mit der Eintragung wird das Gewerbe eine juristische Person im Sinne des § 1 des Bürgerlichen Gesetzbuches und nimmt als Trägerin von Rechten und Pflichten am Rechtsverkehr teil.

(3) Die Eintragung eines Gewerbes begründet für sich genommen keine Rechte an einem Grundstück. Es gelten die Vorschriften des Bürgerlichen Gesetzbuches über Grundstücke.

(4) Erlischt die Lizenz oder wird sie entzogen, so wird die Eintragung gegenstandslos; das Gewerbe ist aus dem Register zu löschen.'),
  ('§ 4', 'Verantwortlicher', 'Kapitel 1 – Allgemeine Vorschriften', 'Ein Gewerbe muss mindestens einen Verantwortlichen bestimmen, der für straf- und zivilrechtliche Angelegenheiten haftbar gemacht werden kann.'),
  ('§ 4a', 'Pflichten von Gewerbetreibenden', 'Kapitel 1 – Allgemeine Vorschriften', 'Gewerbetreibende sind verpflichtet, eine Liste über die Namen und die Anzahl ihrer Mitarbeiter zu führen, diese stets zu aktualisieren und der Staatsanwaltschaft auf Verlangen vorzulegen.'),
  ('§ 4b', 'Gewerbeprüfungen', 'Kapitel 1 – Allgemeine Vorschriften', '(1) Die Staatsanwaltschaft ist berechtigt, Gewerbeprüfungen durchzuführen.

(2) Gewerbetreibende sind verpflichtet, der Staatsanwaltschaft im Rahmen einer Gewerbeprüfung alle hierfür erforderlichen Unterlagen, insbesondere die Mitarbeiterliste nach § 4a, vollständig vorzulegen.'),
  ('§ 5', 'Gewerbe des Glücksspiels', 'Kapitel 2 – Besondere Gewerbe', 'Wird Glücksspiel oder eine andere Gewinnmöglichkeit im Gegenzug für eine finanzielle Leistung angeboten, so muss der Verantwortliche garantieren können, dass das Angebot nicht manipuliert ist.'),
  ('§ 6', 'Gewerbe in der Gastronomie', 'Kapitel 2 – Besondere Gewerbe', '(1) Der Gastronom hat sicherzustellen, dass der Ort der Speisenzubereitung stets den hygienischen Anforderungen an gewerbliche Küchen entspricht.

(2) Der Gastronom ist verpflichtet, im Speiselokal Sanitäreinrichtungen sowie Sitzmöglichkeiten zur Verfügung zu stellen.

(3) Ausgenommen von Absatz 2 sind Foodtrucks und Imbissstände.'),
  ('§ 7', 'Dienstleistungsgewerbe', 'Kapitel 2 – Besondere Gewerbe', 'Unternehmen, die Dienstleistungen anbieten, sind bei Erbringung der Dienstleistung verpflichtet, einen Beleg auszustellen.'),
  ('§ 7a', 'Veranstaltungslizenzen', 'Kapitel 2 – Besondere Gewerbe', '(1) Das Department of Justice kann auf Antrag und in Abstimmung mit dem Parlament beziehungsweise dem Bundesrat Veranstaltungslizenzen erteilen. Ausnahmen von gesetzlichen Verboten dürfen nur zugelassen werden, soweit die jeweils betroffene Rechtsvorschrift dies ausdrücklich gestattet. Die Lizenz muss die zugelassenen Ausnahmen und deren Rechtsgrundlagen benennen.

(2) Veranstaltungslizenzen können insbesondere für folgende Vorhaben erteilt werden:

1. Motorsport- und Kraftfahrzeugrennen,
2. Spreng- und Pyrotechnikvorführungen,
3. Kampf- und Wettkampfveranstaltungen sowie
4. andere genehmigungspflichtige Hochrisiko-Aktivitäten.

(3) Die Lizenz gilt ausschließlich für den im Antrag angegebenen und genehmigten Zeitraum, Ort und Rahmen der Veranstaltung. Jede Abweichung bedarf der vorherigen Genehmigung durch das Department of Justice.

(4) Das Department of Justice kann die Erteilung einer Veranstaltungslizenz von folgenden Auflagen abhängig machen:

1. Vorlage eines detaillierten Sicherheitskonzepts,
2. Nachweis einer ausreichenden Versicherung,
3. Gewährleistung medizinischer Versorgung vor Ort,
4. Einhaltung besonderer Verkehrs- und Sicherheitsbestimmungen sowie
5. Anwesenheit von durch das Department of Justice beauftragten Sicherheitskräften.

(5) Eine Veranstaltungslizenz begründet keine allgemeine Befreiung von strafrechtlicher Verantwortung. Eine Ausnahme greift nur im Umfang der nach Absatz 1 ausdrücklich zulässigen und in der Lizenz benannten Genehmigung. Handlungen außerhalb dieses Umfangs unterliegen uneingeschränkt den Strafgesetzen.

(6) Die strafrechtliche Ahndung der Durchführung einer genehmigungspflichtigen Veranstaltung ohne gültige Lizenz richtet sich nach § 103a des Strafgesetzbuches.

(7) Das Department of Justice kann die Veranstaltungslizenz widerrufen, wenn Auflagen nicht eingehalten werden oder die öffentliche Sicherheit gefährdet ist.'),
  ('§ 8', 'Vergütung und Nachweis des Arbeitsverhältnisses', 'Kapitel 3 – Arbeitnehmerschutz', '(1) Gewerbe, die Arbeitnehmer beschäftigen, sind verpflichtet, für die geleistete Arbeit eine angemessene Vergütung zu zahlen.

(2) Der Arbeitgeber muss dafür sorgen, dass das Arbeitsverhältnis zum Arbeitnehmer nachvollziehbar und überprüfbar ist.'),
  ('§ 9', 'Kündigung durch den Arbeitgeber', 'Kapitel 3 – Arbeitnehmerschutz', '(1) Beendet der Arbeitgeber das Arbeitsverhältnis, so ist eine Kündigungsfrist von 48 Stunden einzuhalten.

(2) Ist nicht erwünscht, dass der Arbeitnehmer während dieser Frist weiterhin im Betrieb beschäftigt ist, so hat der Arbeitgeber 75 Prozent des üblichen Gehalts für diesen Zeitraum zu zahlen.

(3) Bei einer fristlosen Kündigung entfallen Frist und Zahlungspflicht. Eine fristlose Kündigung ist nur bei geschäftsschädigenden Handlungen des Arbeitnehmers zulässig.'),
  ('§ 10', 'Kündigung durch den Arbeitnehmer', 'Kapitel 3 – Arbeitnehmerschutz', 'Beendet der Arbeitnehmer das Arbeitsverhältnis, so ist keine Frist einzuhalten. Der Arbeitnehmer verpflichtet sich, keine Betriebsgeheimnisse oder sonstigen unter Verschluss gehaltenen Informationen zu veröffentlichen.'),
  ('§ 11', 'Probezeit', 'Kapitel 3 – Arbeitnehmerschutz', 'Bei Neueinstellungen besteht eine Probezeit von drei Tagen. Während der Probezeit können Arbeitnehmer und Arbeitgeber das Arbeitsverhältnis ohne Einhaltung von Fristen und ohne finanzielle Entschädigung beenden.'),
  ('§ 12', 'Arbeitnehmer auf Zeit', 'Kapitel 3 – Arbeitnehmerschutz', '(1) Gewerbe sind befugt, Arbeitnehmer auf Zeit einzustellen.

(2) Ein Arbeitnehmer auf Zeit darf nicht länger als drei Tage in Folge im Betrieb tätig sein. Nach Ablauf dieser drei Tage darf er für die folgenden fünf Tage nicht erneut im selben Betrieb tätig sein.

(3) Für Arbeitnehmer auf Zeit bestehen keine Kündigungsfristen und keine finanziellen Entschädigungsansprüche.

(4) Auch für Arbeitnehmer auf Zeit ist eine angemessene Vergütung zu zahlen, und das Arbeitsverhältnis ist nachweisbar zu führen.'),
  ('§ 13', 'Rohstofflizenz', 'Kapitel 4 – Rohstofflizenz', '(1) Der gewerbliche Abbau, Transport, Handel und die Verarbeitung von Rohstoffen bedürfen einer Rohstofflizenz.

(2) Die Rohstofflizenz wird durch die Staatsanwaltschaft ausgestellt. Hierbei kann eine Gebühr erhoben werden.

(3) Die Rohstofflizenz gestattet den unbegrenzten Abbau, Transport, Handel und die Verarbeitung aller legalen Rohstoffe.'),
  ('§ 14', 'Freimenge', 'Kapitel 4 – Rohstofflizenz', '(1) Ohne Rohstofflizenz beträgt die täglich höchstens förderbare Rohstoffmenge 200 Kilogramm pro Person je Rohstoffart.

(2) Das Abbauen, Verarbeiten und Handeln von Weintrauben, Wein und Meeresfrüchten wie Muscheln sowie deren Verarbeitungsprodukten ist von dieser Ordnung ausgenommen und bedarf keiner Rohstofflizenz.'),
  ('§ 15', 'Kontrolle und Auskunftspflicht', 'Kapitel 4 – Rohstofflizenz', '(1) Führer von Fahrzeugen mit einer maximalen Beladungskapazität von 200 Kilogramm oder mehr sind gegenüber den Behörden verpflichtet, bei Kontrollen die Rohstofflizenz vorzulegen und Auskunft über die Beladung zu erteilen. Hierzu darf die Ladefläche durchsucht werden.

(2) Ausgenommen von der Vorlage- und Auskunftspflicht nach Absatz 1 sind Personen, die im Besitz einer gültigen Rohstofflizenz sind.'),
  ('§ 16', 'Entzug bei Missbrauch', 'Kapitel 4 – Rohstofflizenz', 'Wird die Rohstofflizenz ausgenutzt, um illegale Geschäfte zu betreiben oder Straftaten zu begehen oder zu fördern, so kann die Staatsanwaltschaft die Lizenz unverzüglich entziehen.'),
  ('§ 17', 'Illegale Gewerbeausübung', 'Kapitel 5 – Verstöße und Sanktionen', '(1) Wer ein Gewerbe ohne die erforderliche Gewerbelizenz oder ohne Eintragung ausübt, begeht eine illegale Gewerbeausübung.

(2) Die illegale Gewerbeausübung wird mit einem Bußgeld in Höhe von 25.000 Dollar geahndet. Die überschüssig erlangten Vermögenswerte können eingezogen werden.'),
  ('§ 18', 'Verstöße im Umgang mit Rohstoffen', 'Kapitel 5 – Verstöße und Sanktionen', '(1) Wer ohne gültige Rohstofflizenz oder außerhalb der Freimenge mit Rohstoffen umgeht, kann mit einem Bußgeld in Höhe von 15.000 Dollar belegt werden. Rohstoffe, die außerhalb der Freimenge liegen, dürfen beschlagnahmt und eingezogen werden.

(2) Die strafrechtliche Ahndung schwerer oder wiederholter Fälle des unerlaubten Umgangs mit Rohstoffen richtet sich ausschließlich nach § 103 des Strafgesetzbuches. Für die Beschlagnahme, Einziehung und den Ausschluss einer zusätzlichen Geldbuße für dieselbe strafrechtlich geahndete Tat gilt § 103 Absatz 4 des Strafgesetzbuches.'),
  ('§ 19', 'Sonstige Verstöße', 'Kapitel 5 – Verstöße und Sanktionen', '(1) Verstöße gegen die Bestimmungen dieser Gewerbeordnung können den Entzug der Gewerbelizenz oder der Rohstofflizenz sowie ein Bußgeld bis zu 250.000 Dollar nach sich ziehen.

(2) Bei Verstößen im Zusammenhang mit Waffen ist ein Urteil eines Gerichts erforderlich.'),
  ('§ 20', 'Inkrafttreten', 'Kapitel 6 – Schlussbestimmungen', '(1) Diese Gewerbeordnung tritt mit ihrer Verkündung in Kraft und ist für alle natürlichen und juristischen Personen sowie Amtsträger im Geltungsbereich verbindlich.

(2) Mit dem Inkrafttreten gelten alle bisherigen Regelungen, die den Bestimmungen dieser Gewerbeordnung widersprechen, als aufgehoben, soweit sie nicht ausdrücklich weitergeführt werden.')
) as v(nummer, titel, abschnitt, text) where lower(g.kuerzel) = lower('GewO');

-- ---------- LuftVO – Luftverkehrsordnung (8 Paragraphen) ----------
insert into public.gesetzbuecher (kuerzel, titel, beschreibung, farbe, sortierung)
select 'LuftVO', 'Luftverkehrsordnung', 'Fluglizenz, Flugverbotszonen, Mindestflughöhe, Landung, Flugfunk und Fallschirmpflicht.', 'rot', 60
where not exists (select 1 from public.gesetzbuecher where lower(kuerzel) = lower('LuftVO'));
update public.gesetzbuecher set titel = 'Luftverkehrsordnung', beschreibung = 'Fluglizenz, Flugverbotszonen, Mindestflughöhe, Landung, Flugfunk und Fallschirmpflicht.'
  where lower(kuerzel) = lower('LuftVO');
delete from public.paragraphen where gesetzbuch_id = (select id from public.gesetzbuecher where lower(kuerzel) = lower('LuftVO'));
insert into public.paragraphen (gesetzbuch_id, nummer, titel, abschnitt, text)
select g.id, v.nummer, v.titel, v.abschnitt, v.text from public.gesetzbuecher g, (values
  ('§ 1', 'Registrierung von Flugobjekten', null, '(1) Jedes Flugobjekt wird mit dem Erwerb automatisch registriert und seinem Halter zugeordnet.

(2) Der Besitz und das Führen eines Flugobjekts setzen eine gültige Fluglizenz voraus.'),
  ('§ 2', 'Flugverbotszonen', null, '(1) Flächen, für die eine Flugverbotszone besteht, dürfen nicht überflogen werden.

(2) Der Luftraum über den Fraktionsgebäuden des Los Santos Police Department, der Staatsanwaltschaft, des San Andreas Medical Service, des National Office of Security Enforcement sowie über militärischen Einrichtungen bildet dauerhafte Flugverbotszonen.

(3) Die Flugverbotszone setzt sich aus der Grundstücksfläche und einem zusätzlichen Radius von 500 Metern zusammen.

(4) Durch die Ausrufung einer Sperrzone durch das Los Santos Police Department, das National Office of Security Enforcement, die Staatsanwaltschaft oder die National Guard entsteht für das gesamte Sperrzonengebiet eine temporäre Flugverbotszone, solange die Sperrzone besteht.

(5) Die strafrechtliche Ahndung eines Verstoßes gegen Absatz 1 richtet sich ausschließlich nach § 104 des Strafgesetzbuches.'),
  ('§ 3', 'Mindestflughöhe und Landung', null, '(1) Flugzeuge haben über ganz San Andreas eine Mindestflughöhe von 2.000 Metern einzuhalten.

(2) Ausgenommen hiervon sind Start und Landung. Der Landeanflug darf erst 1.000 Meter vor der Landebahn eingeleitet werden.

(3) Helikopter haben eine Mindestflughöhe von 500 Metern einzuhalten.

(4) Helikopter dürfen nur auf dafür ausgewiesenen Helikopterlandeplätzen landen.

(5) Das Landen auf Straßen sowie auf ungekennzeichneten Landestrecken und -flächen ist verboten.

(6) Die strafrechtliche Ahndung von Verstößen gegen die Mindestflughöhe nach den Absätzen 1 und 3 richtet sich ausschließlich nach § 105 des Strafgesetzbuches. Die strafrechtliche Ahndung nicht ordnungsgemäßer Landungen nach den Absätzen 4 und 5 richtet sich ausschließlich nach § 106 des Strafgesetzbuches.'),
  ('§ 4', 'Flugfunk', null, '(1) Vor dem Betreten des Luftraums mit einem Flugobjekt ist eine Anmeldung im staatlichen Flugfunk 555 unter Nennung der Kennungsnummer des Flugobjekts vorzunehmen. Start- und Landeanflüge sind dort durchzugeben.

(2) Während des gesamten Aufenthalts im Luftraum sowie unmittelbar vor dem Start und nach der Landung muss der Führer des Flugobjekts oder eine andere Person der Flugbesatzung über den Flugfunk erreichbar sein.

(3) Versuchen staatliche Einrichtungen, über den Funk Kontakt aufzunehmen, so ist deren Anweisungen und Fragen Folge zu leisten. Der Staat San Andreas ist befugt, unbekannte Flugobjekte nach erfolglosen Kontaktversuchen gewaltsam aus dem Luftraum zu entfernen, sofern eine Gefahr für die Allgemeinheit besteht.

(4) Die strafrechtliche Ahndung von Verstößen gegen die Flugfunkpflichten dieses Paragraphen richtet sich ausschließlich nach § 107 des Strafgesetzbuches.'),
  ('§ 5', 'Mitführpflicht von Fallschirmen', null, '(1) Personen, die sich mit Flugobjekten im Luftraum bewegen, sind verpflichtet, einen Fallschirm für sich an Bord mitzuführen.

(2) Die strafrechtliche Ahndung von Verstößen gegen die Mitführpflicht nach Absatz 1 richtet sich ausschließlich nach § 108 des Strafgesetzbuches.'),
  ('§ 6', 'Ausnahmeregelung für Flugobjekte staatlicher Einrichtungen', null, '(1) Flugobjekte des Los Santos Police Department, des San Andreas Medical Service, der Staatsanwaltschaft, des National Office of Security Enforcement, der National Guard sowie des Parlaments sind von den Vorschriften dieser Verordnung ausgenommen.

(2) Dasselbe gilt, wenn andere Flugobjekte im Namen der in Absatz 1 genannten Behörden genutzt werden.'),
  ('§ 7', 'Zusammentreffen mehrerer Straftaten', null, 'Treffen Straftaten nach den §§ 104 bis 108 des Strafgesetzbuches untereinander oder mit anderen Straftaten zusammen, so richtet sich die Gesamtstrafe nach § 3 des Strafgesetzbuches.'),
  ('§ 8', 'Inkrafttreten', null, 'Diese Verordnung tritt mit ihrer Verkündung in Kraft und ist für alle natürlichen und juristischen Personen sowie Amtsträger im Geltungsbereich verbindlich.')
) as v(nummer, titel, abschnitt, text) where lower(g.kuerzel) = lower('LuftVO');

commit;
