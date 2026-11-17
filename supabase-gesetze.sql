-- =============================================================
--  Wiwang Law – Gesetzestexte: Verf, StGB, StPO, BGB, LPolG, StVO, WaffG, BtMG, GewO, LuftVO
--
--  Erzeugt mit tools/gesetze-sql.py aus dem Ordner gesetze/.
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Update 8.
--  Kann gefahrlos mehrfach ausgeführt werden: Die Gesetzbücher
--  werden angelegt bzw. aktualisiert, ihre Paragraphen ersetzt.
-- =============================================================

begin;

-- ---------- Verf – Verfassung des Staates San Andreas (49 Einträge) ----------
insert into public.gesetzbuecher (kuerzel, titel, beschreibung, farbe, sortierung)
select 'Verf', 'Verfassung des Staates San Andreas', 'Staatsform, Grundrechte, Parlament und Gesetzgebung, Exekutive, Gerichte, Constitutional Court und National Guard.', 'gold', 5
where not exists (select 1 from public.gesetzbuecher where lower(kuerzel) = lower('Verf'));
update public.gesetzbuecher set titel = 'Verfassung des Staates San Andreas', beschreibung = 'Staatsform, Grundrechte, Parlament und Gesetzgebung, Exekutive, Gerichte, Constitutional Court und National Guard.'
  where lower(kuerzel) = lower('Verf');
delete from public.paragraphen where gesetzbuch_id = (select id from public.gesetzbuecher where lower(kuerzel) = lower('Verf'));
insert into public.paragraphen (gesetzbuch_id, nummer, titel, abschnitt, text)
select g.id, v.nummer, v.titel, v.abschnitt, v.text from public.gesetzbuecher g, (values
  ('Präambel', null, null, '“Wir, das Volk des Staates San Andreas, von der Absicht geleitet, unseren Bund zu vervollkommnen, die Gerechtigkeit zu verwirklichen, die Ruhe im Innern zu sichern, für die Landesverteidigung zu sorgen, das allgemeine Wohl zu fördern und das Glück der Freiheit uns selbst und unseren Nachkommen zu bewahren, setzen und begründen diese Verfassung für den Staat San Andreas.”'),
  ('Art. 1', 'Verfassung und Serverleitung (OOC)', 'Abschnitt I – Grundlagen und Staatsform', '(1) Diese Verfassung ist eine Ergänzung des Regelwerks. Sie legt die wesentlichen Abläufe der Rechtsschaffung und der Rechtsfindung fest. Ein Verstoß gegen die Abläufe dieser Verfassung kann einen Regelbruch (FailRP) darstellen.

(2) Die verfassungsmäßige Gewalt liegt bei der Serverleitung. Die in dieser Verfassung festgehaltenen Grundsätze sind in deren Namen formuliert.

(3) Ausnahmen von dieser Verfassung können, ebenso wie vom Hauptregelwerk selbst, von hierzu ermächtigten Administratoren (Teamleitung+) ausgesprochen werden.'),
  ('Art. 2', 'Staatsform und Staatsgewalt', 'Abschnitt I – Grundlagen und Staatsform', '(1) Der Staat San Andreas ist ein demokratischer und sozialer Bundesstaat.

(2) Alle Staatsgewalt geht vom Volke aus. Sie wird vom Volke in Wahlen sowie durch besondere Organe der Gesetzgebung, der vollziehenden Gewalt und der Rechtsprechung ausgeübt.

(3) Die Gesetzgebung ist an die verfassungsmäßige Ordnung, die vollziehende Gewalt und die Rechtsprechung sind an Gesetz und Recht gebunden.'),
  ('Art. 3', 'Vorrang der Verfassung', 'Abschnitt I – Grundlagen und Staatsform', '(1) Diese Verfassung ist das oberste Gesetz des Staates. Alle Staatsgewalt und alle Gerichte sind ungeachtet entgegenstehender Bestimmungen in Gesetzen an sie gebunden.

(2) Gesetze und sonstiges Recht dürfen dieser Verfassung nicht widersprechen. Ein Widerspruch wird nach den Vorschriften über das Constitutional Court (Abschnitt VIII) aufgelöst.'),
  ('Art. 4', 'Amtseid', 'Abschnitt I – Grundlagen und Staatsform', '(1) Die Verwaltungs- und Justizbeamten des Staates San Andreas verpflichten sich durch Eid oder Gelöbnis zur Wahrung dieser Verfassung.

(2) Ein religiöser Bekenntnisakt darf niemals zur Bedingung für den Antritt eines Amtes oder einer öffentlichen Vertrauensstellung gemacht werden.'),
  ('Art. 5', 'Grundrechte', 'Abschnitt II – Grundrechte', '(1) Jeder hat das Recht auf:

• Meinungsfreiheit; das Recht, seine Meinung in Wort, Schrift und Bild frei zu äußern und zu verbreiten.
• Informationsfreiheit; das Recht, sich aus allgemein zugänglichen Quellen ungehindert zu informieren.
• Pressefreiheit; die Freiheit der Presse sowie die Freiheit der Berichterstattung.
• Versammlungsfreiheit; das Recht, sich friedlich und ohne Waffen zu versammeln.
• Berufsfreiheit; das Recht, Beruf, Arbeitsplatz und Ausbildung frei zu wählen.
• Eigentumsfreiheit; das Recht, Eigentum zu erwerben, zu besitzen, zu nutzen und darüber zu verfügen.
• Unverletzlichkeit der Wohnung; das Recht auf Schutz der eigenen Wohnung und private Räume.
• Gleichheit vor dem Gesetz; das Recht auf Gleichbehandlung und Schutz vor ungerechtfertigter Benachteiligung.
• Recht auf Leben und körperliche Unversehrtheit; das Recht, vor rechtswidrigen Eingriffen in das Leben und körperliche Unversehrtheit geschützt zu werden.
• Schutz der Menschenwürde; das Recht auf Achtung und Schutz der persönlichen Würde.
• Recht auf effektiven Rechtsschutz; das Recht, staatliche Entscheidungen und Maßnahmen durch unabhängige Gerichte überprüfen zu lassen.
• Recht auf ein faires Verfahren; das Recht auf ein unabhängiges und unparteiisches Gerichtsverfahren sowie auf rechtliches Gehör.
• Unschuldsvermutung; jeder gilt bis zum rechtskräftigen Nachweis seiner Schuld als unschuldig.
• Schutz der Privatsphäre; das Recht auf Achtung des persönlichen und privaten Lebensbereichs.
• Wahlfreiheit und politische Mitwirkung; das Recht, an demokratischen Wahlen und politischen Willensbildungsprozessen nach Maßgabe der Verfassung teilzunehmen.

(2) Die Ausübung dieser Rechte darf nur aufgrund eines Gesetzes und nur insoweit eingeschränkt werden, wie dies zum Schutz der Rechte anderer, der öffentlichen Sicherheit oder anderer in dieser Verfassung anerkannter Rechtsgüter erforderlich ist.

(3) Jede staatliche Gewalt ist verpflichtet, die in dieser Verfassung garantierten Grundrechte zu achten, zu schützen und zu gewährleisten.'),
  ('Art. 6', 'Schutz vor willkürlicher Durchsuchung und Beschlagnahme', 'Abschnitt II – Grundrechte', 'Das Recht des Volkes auf Sicherheit der Person, der Wohnung, der Urkunden und des Eigentums vor willkürlicher Durchsuchung, Verhaftung und Beschlagnahme darf nicht verletzt werden. Haussuchungs- und Haftbefehle dürfen nur bei Vorliegen eines eidlich oder eidesstattlich erhärteten Rechtsgrundes ausgestellt werden und müssen die zu durchsuchende Örtlichkeit sowie die in Gewahrsam zu nehmenden Personen oder Gegenstände genau bezeichnen, soweit durch Gesetz nichts anderes geregelt ist.'),
  ('Art. 7', 'Anklageprinzip', 'Abschnitt II – Grundrechte', 'Niemand darf wegen eines Kapitalverbrechens oder eines sonstigen schweren Verbrechens zur Verantwortung gezogen werden, es sei denn auf Grund einer Anklage oder eines Strafbefehls des Office of the San Andreas Attorney General oder eines auf ihren Antrag ergangenen gerichtlichen Beschlusses.'),
  ('Art. 8', 'Rechte im Strafverfahren', 'Abschnitt II – Grundrechte', '(1) In allen Strafverfahren hat der Angeklagte Anspruch auf einen unverzüglichen und öffentlichen Prozess vor einem unparteiischen Gericht, sofern ein Richter verfügbar ist und gesetzlich nichts anderes bestimmt ist.

(2) Der Angeklagte hat ferner Anspruch darauf,

1. über die Art und die Gründe der Anklage unterrichtet zu werden,
2. den anwesenden Belastungszeugen gegenübergestellt zu werden,
3. sich selbst nicht zu belasten,
3. nicht doppelt für eine Tat bestraft zu werden,
4. die Zwangsvorladung von Entlastungszeugen zu verlangen und
5. einen Rechtsbeistand zu seiner Verteidigung zu erhalten, sofern einer verfügbar ist.'),
  ('Art. 9', 'Staatsbürgerschaft, Gleichbehandlung und rechtliches Gehör', 'Abschnitt II – Grundrechte', '(1) Alle Personen, die im Staat San Andreas geboren oder eingebürgert sind und seiner Gesetzeshoheit unterstehen, sind vollwertige Bürger des Staates San Andreas.

(2) Es dürfen keine Gesetze erlassen oder durchgeführt werden, ohne verfassungsrechtliche Rechtfertigung im Sinne des Artikels 5 Absatz 2  beschränken.

(3) Niemandem darf innerhalb des Hoheitsbereichs des Staates der gleiche Schutz durch das Gesetz versagt werden, sofern diese Verfassung nicht ausdrücklich etwas anderes bestimmt.'),
  ('Art. 10', 'Das Parliament of San Andreas', 'Abschnitt III – Die Legislative', '(1) Das Parliament of San Andreas ist die gesetzgebende Gewalt des Staates San Andreas. Es besteht aus zwei Kammern:

1. dem San Andreas Parliament als gesetzgebende Kammer,
2. dem San Andreas Council als Wächterkammer.

(2) Das San Andreas Parliament beschließt Gesetze. Der San Andreas Council wirkt ausschließlich nach Maßgabe dieser Verfassung am Gesetzgebungsverfahren mit.

(3) Beide Kammern handeln im Rahmen ihrer verfassungsmäßigen Zuständigkeiten unabhängig voneinander und sind ausschließlich an diese Verfassung gebunden.

(4) Das Parliament wird durch die Parlamentsordnung reguliert, welche durch diese erlassen wird.'),
  ('Art. 11', 'Zusammensetzung des San Andreas Parliament', 'Abschnitt III – Die Legislative', '(1) Das San Andreas Parliament besteht aus 50 gewählten und entsandten Members of Parliament.

(2) Je zwei Sitze entsenden als Staatsfraktion:

• das Los Santos Police Department,
• die San Andreas Medical Services.

(3) Je einen Sitz entsenden als Staatsfraktion:

• das National Office of Security Enforcement,
• das Office of the San Andreas Attorney General,
• die Judicial Branch,
• die National Guard,
• das San Andreas Printing Office.

(4) Die übrigen Sitze stehen den demokratisch gewählten Parteien zu.'),
  ('Art. 12', 'Wahl und Amtszeit', 'Abschnitt III – Die Legislative', '(1) Die Wahlen zum San Andreas Parliament finden alle drei Monate statt. Mit jeder Wahl werden auch die entsandten Member of Parliament der Staatsfraktionen bestätigt oder ausgetauscht.

(2) Zur Wahl darf sich nur aufstellen, wem die Wählbarkeit nicht durch ein Gesetz aberkannt wurde.

(3) Pro Legislaturperiode darf ein Member of Parliament nur einen Sitz wahrnehmen.

(4) Gibt ein Member of Parliament seinen Sitz freiwillig auf oder sollte dies Kraft Gesetzes, durch Tod oder dauerhafte Abwesenheit geschehen, so darf dieser von einem Parteiangehörigen oder der jeweiligen Staatsfraktion einmalig neu besetzt werden. Ein nachträglicher Austausch von Membern of Parliament ist darüber hinaus nicht möglich; das ausgeschiedene Member darf nicht erneut ins San Andreas Parliament einziehen.

(5) Wird eine Partei aufgelöst, so werden ihre Sitze auf die bestehenden Parteien aufgeteilt und können neu besetzt werden. Die Aufteilung übernimmt hierbei der Chairman of the San Andreas Council.'),
  ('Art. 13', 'Der Speaker of Parliament', 'Abschnitt III – Die Legislative', '(1) Der Speaker of Parliament wird von allen anwesenden Members of Parliament in der ersten Sitzung mit einfacher Mehrheit gewählt.

(2) Der Speaker of Parliament plant und leitet die Sitzungen, verschriftlicht, unterzeichnet und verkündet die Beschlüsse und übernimmt die allgemeinen Verwaltungsaufgaben des San Andreas Parliament.

(3) Das San Andreas Parliament kann den Speaker abwählen und eine Neuwahl beantragen. Hierzu sind mindestens 66 Prozent der gesamten Stimmen erforderlich.'),
  ('Art. 14', 'Rechte und Immunität der Member of Parliament', 'Abschnitt III – Die Legislative', '(1) Gegen einen im Dienst befindlichen Member of Parliament darf kein Straf- oder Disziplinarverfahren eröffnet werden. Die Eröffnung eines solchen Verfahrens ist beim Speaker of Parliament oder beim Chairman of the San Andreas Council zu beantragen.

(2) Gegen den Speaker of Parliament und den Chairman of the San Andreas Council ist die Eröffnung eines Strafverfahrens nicht möglich.

(3) Auf Antrag beim Speaker of Parliament oder beim Chairman of the San Andreas Council kann einem Member of Parliament ein Parliamentary Agent als Personenschutz zugewiesen werden. Dieser darf seine Tätigkeit nur wahrnehmen, wenn er sein Member of Parliament begleitet oder das San Andreas Parlamentsgebäude schützt.'),
  ('Art. 15', 'Der San Andreas Council als Wächterkammer', 'Abschnitt III – Die Legislative', '(1) Der San Andreas Council verkörpert die verfassungs- und regelwahrende Kontrolle der Serverleitung. Seine Aufgabe ist ausschließlich die Kontrolle der Verfassungsmäßigkeit und der serverseitigen Interessen im Gesetzgebungsverfahren.

(2) Der San Andreas Council greift nicht in die laufende San Andreas Parlamentarische Arbeit ein. Er besitzt kein Stimmrecht.

(3) Der San Andreas Council darf jederzeit an den Sitzungen des San Andreas Parliaments teilnehmen. Ihm stehen ein Rede- und ein Empfehlungsrecht zu.

(4) Die Zusammensetzung und die Ernennung der Mitglieder des San Andreas Council erfolgen ausschließlich durch dessen Chairman. Der Chairman wird durch die Serverleitung bestimmt.

(5) Der Chairman of the San Andreas Council ist zugleich Staatsoberhaupt des Staates San Andreas und die höchste Instanz des Parliaments. Er ist befugt, Gesetze zu erlassen, sofern diese mit dieser Verfassung vereinbar sind.

(6) Der Chairman of the San Andreas Council ist berechtigt, Entscheidungen in Haushaltsangelegenheiten, die er für bedenklich oder nicht vertretbar hält, durch Einlegung eines Vetos zu blockieren.'),
  ('Art. 16', 'Aufgaben des San Andreas Parliaments', 'Abschnitt III – Die Legislative', '(1) Das San Andreas Parliament übernimmt seine Aufgaben durch Beschlüsse, die es in öffentlich angekündigten Sitzungen fasst. Das Fassen eines Beschlusses kann nur bei Anwesenheit eines Drittels des Parliaments geschehen.

(2) Es beschließt insbesondere über:

1. die Gesetzgebung: das Ändern, Hinzufügen oder Entfernen von Gesetzen; erfordert mindestens 51 Prozent der anwesenden Stimmen,
2. den Bundeshaushalt: das Zuteilen von Geldern aus Fraktionskassen für staatliche Zwecke; der Kontostand einer Fraktion darf dabei 5 Millionen Dollar nicht unterschreiten; erfordert mindestens 66 Prozent der anwesenden Stimmen,
3. Übungsanfragen: das Genehmigen von Übungen der Staatsfraktionen; erfordert mindestens 33 Prozent der anwesenden Stimmen,
4. das Ausrufen der National Guard: beim Vorliegen der Voraussetzungen des Artikels 41; erfordert mindestens 33 Prozent der anwesenden Stimmen.

(3) Die San Andreas Parliament greift nicht in die Staatsfraktionen ein und ist deren Überwachungsbehörde. Die Member of Parliament sind im Dienst jedoch befugt, das Office of the San Andreas Attorney General und ihre Ermittlungspersonen zur Durchführung eines Strafverfahrens zu ersuchen.

(4) Auf Antrag beim Speaker of Parliament oder beim Chairman of the San Andreas Council kann einem Member of Parliament die Erlaubnis erteilt werden,

• sämtliche oder durch den Speaker of Parliament oder dem Chairman of the San Andreas Council bestimmte Staatsgebäude zu betreten und bei sämtlichen Vorgängen zuzuschauen oder
• die National Guard sofort auszurufen.'),
  ('Art. 17', 'Der National Security Council', 'Abschnitt III – Die Legislative', '(1) Der National Security Council ist ein parlamentarisch angebundenes Gremium.

(2) Die nähere Organisation, Leitung, Zusammensetzung, die Abberufung von Mitgliedern sowie die Arbeitsweise des National Security Councils werden durch die San Andreas Parlamentsordnung geregelt.

(3) Die Aufsicht über den National Security Council obliegt dem Präsidium des San Andreas Parliament im Rahmen der San Andreas Parlamentsordnung.'),
  ('Art. 18', 'Beschluss und Verkündung', 'Abschnitt IV – Gesetzgebungsverfahren', '(1) Gesetze werden ausschließlich durch das San Andreas Parliament beschlossen. Mit dem Beschluss gelten sie als angenommen.

(2) Der Speaker of Parliament oder Chairman of the San Andreas Council verkündet das Gesetz.

(3) Gesetze treten grundsätzlich mit ihrer Verkündung in Kraft, soweit sie keinen abweichenden Zeitpunkt bestimmen.'),
  ('Art. 19', 'Verfassungsrechtliche Bedenken des San Andreas Councils', 'Abschnitt IV – Gesetzgebungsverfahren', '(1) Der San Andreas Council kann innerhalb von sieben Tagen nach der Verkündung eines Gesetzes verfassungsrechtliche Bedenken erheben.

(2) Zur Klärung seiner Bedenken kann der San Andreas Council das Constitutional Court anrufen.

(3) Die Einleitung eines Prüfungsverfahrens setzt das Gesetz grundsätzlich nicht außer Kraft.'),
  ('Art. 20', 'Entscheidung des Constitutional Courts', 'Abschnitt IV – Gesetzgebungsverfahren', '(1) Für Verfahren und Entscheidungen gilt Abschnitt VIII.'),
  ('Art. 21', 'Einsetzung', 'Abschnitt V – Select Committee', '(1) Das San Andreas Parliament hat das Recht, das Select Committee einzusetzen. Die Einsetzung erfolgt durch Beschluss mit 33 Prozent der anwesenden Stimmen.

(2) Der Einsetzungsbeschluss bestimmt den Untersuchungsgegenstand. Dieser darf nachträglich nur durch das San Andreas Parliament erweitert oder geändert werden.'),
  ('Art. 22', 'Aufgabe und Kontrollfunktion', 'Abschnitt V – Select Committee', '(1) Das Select Committee dient der San Andreas Parlamentarischen Kontrolle. Er klärt Sachverhalte auf, an deren Aufklärung ein öffentliches Interesse besteht, insbesondere mögliche Missstände im Handeln staatlicher Organe und Behörden.

(2) Das Select Committee übt kein richterliches Amt aus. Die Feststellung strafrechtlicher Schuld bleibt den Gerichten vorbehalten.'),
  ('Art. 23', 'Befugnisse', 'Abschnitt V – Select Committee', '(1) Das Select Committee kann die zur Aufklärung des Untersuchungsgegenstands erforderlichen Beweise erheben. Er kann insbesondere

1. Zeugen laden und befragen,
2. Auskünfte einholen und
3. Einsicht in Akten und Unterlagen verlangen.

(2) Zeugen sind zur Aussage verpflichtet. Ein Zeugnisverweigerungsrecht besteht in den durch die Strafprozessordnung bestimmten Fällen entsprechend.

(3) Die Akteneinsicht und die Zeugenladung finden ihre Grenze in den gesetzlich geschützten Geheimhaltungsinteressen, insbesondere in den Sicherheitsfreigaben der Sicherheitsbehörden.'),
  ('Art. 24', 'Mitwirkungspflicht der Behörden', 'Abschnitt V – Select Committee', '(1) Alle staatlichen Behörden sind verpflichtet, dem Select Committee die erforderlichen Auskünfte zu erteilen, Akten vorzulegen und die Aufklärung zu unterstützen.

(2) Die Mitwirkung darf nur verweigert werden, soweit überwiegende Geheimhaltungsinteressen der nationalen Sicherheit entgegenstehen. Die Verweigerung ist gegenüber dem Ausschuss zu begründen.

(3) (Entfallen)'),
  ('Art. 25', 'Ergebnis und Veröffentlichung', 'Abschnitt V – Select Committee', '(1) Der Select Committee fasst das Ergebnis seiner Untersuchung in einem schriftlichen Abschlussbericht zusammen.

(2) Der Abschlussbericht wird dem San Andreas Parliament vorgelegt und veröffentlicht.

(3) Von der Veröffentlichung ausgenommen sind Inhalte, deren Bekanntwerden geschützte Geheimhaltungsinteressen oder die nationale Sicherheit gefährden würde.'),
  ('Art. 26', 'Das Office of the San Andreas Attorney General', 'Abschnitt VI – Die Exekutive', '(1) Das Office of the San Andreas Attorney General ist eine Exekutivbehörde und die rechtliche Vertretung des Staates. Sie ist als Einzige befugt, Strafen im Sinne des Strafgesetzbuches für Bürger zu fordern. Sie ist ein unabhängiges Organ und nur innerhalb des Office of the San Andreas Attorney General weisungsgebunden.

(2) Das Office of the San Andreas Attorney General ist Herrin des Ermittlungsverfahrens und nach der Strafprozessordnung für jegliche Strafverfolgung zuständig. Sie entscheidet über die Fortführung und die Beendigung sämtlicher Maßnahmen der Strafverfolgungsbehörden, soweit die Strafprozessordnung nichts anderes bestimmt.'),
  ('Art. 27', 'Die Strafverfolgungsbehörden', 'Abschnitt VI – Die Exekutive', '(1) Das Office of the San Andreas Attorney General (OotSAAG), das National Office of Security Enforcement (NOOSE) und das Los Santos Police Department (LSPD) sind für die Wahrung der Ordnung und Sicherheit im Staat San Andreas verantwortlich. Ihre Zuständigkeiten können durch einen Zuständigkeitskatalog eingeschränkt werden.

(2) Die Parliamentary Agents sind für den Schutz der San Andreas Parlamentsgebäude und des ihnen zugewiesenen Member of Parliament zuständig und übernehmen in diesem Rahmen Rechte der Strafverfolgungsbehörden. Sie dürfen ihre Rechte nur in Begleitung ihres Member of Parliament oder beim Schutz des San Andreas Parlamentsgebäude wahrnehmen.

(3) Für diese Aufgaben stellt der Staat den Strafverfolgungsbehörden Gesetze und Ausrüstung zur Verfügung.

(4) Verantwortlich für die Einhaltung dieser Verfassung und die geltenden Gesetze bei der Strafverfolgung ist die Leitung der jeweiligen Behörde, deren Ausbleiben das Office of the San Andreas Attorney General gemäß ihrem Eid.'),
  ('Art. 28', 'Selbstverwaltung der Staatsfraktionen', 'Abschnitt VI – Die Exekutive', '(Entfallen)'),
  ('Art. 29', 'Das National Office of Security Enforcement', 'Abschnitt VI – Die Exekutive', '(1) Das National Office of Security Enforcement (NOOSE) ist eine Sicherheitsbehörde des Staates San Andreas. Es dient dem Schutz der nationalen Sicherheit, der verfassungsmäßigen Ordnung sowie der inneren Stabilität des Staates.

(2) Das NOOSE ist eine Exekutivbehörde mit besonderen sicherheitsbehördlichen und nachrichtendienstlichen Befugnissen. Seine Zuständigkeit umfasst insbesondere Maßnahmen des Heimatschutzes, der Gefahrenabwehr gegen staatsgefährdende Bestrebungen sowie die Bekämpfung schwerer organisierter Kriminalität, sofern diese die nationale Sicherheit, staatliche Einrichtungen oder die verfassungsmäßige Ordnung beeinträchtigt.

(3) Zur Wahrnehmung seiner Aufgaben ist das NOOSE befugt, nachrichtendienstliche Erkenntnisse zu erheben, auszuwerten und zu verarbeiten, soweit diese dem Schutz der nationalen Sicherheit oder der Abwehr schwerer Gefahren für den Staat dienen. In diesem Zusammenhang ist das NOOSE berechtigt, eigene Sicherheits- und Gefährdungsstufen festzulegen und eigenständig zu bestimmen, welche Personen Zugriff auf entsprechende Informationen erhalten. Ausgenommen hiervon ist der Chairman of the San Andreas Council.

(4) Das NOOSE kann behördenübergreifende Ermittlungen koordinieren, gemeinsame Taskforces bilden und sicherheitsrelevante Einsatzlagen leiten, sofern diese einen Bezug zur nationalen Sicherheit oder zu staatlichen Institutionen aufweisen.

(5) Bei Gefahren für die nationale Sicherheit, bei terroristischen Bedrohungslagen, bei Angriffen auf staatliche Einrichtungen oder bei vergleichbaren sicherheitsrelevanten Einsatzlagen besitzt das NOOSE ein Koordinationsrecht gegenüber sämtlichen staatlichen Behörden und Einrichtungen des Staates San Andreas, ausgenommen das Parliament of San Andreas, die Gerichte, das Constitutional Court und das Office of the San Andreas Attorney General. Sollte die National Guard ausgerufen werden, so greift Artikel 40, Abs. 3.

(6) Sämtliche Behörden mit Ausnahme des Parliament of San Andreas, der Gerichte und des Constitutional Courts und das Office of the San Andreas Attorney General sind verpflichtet, mit dem NOOSE zusammenzuarbeiten, angeforderte Informationen bereitzustellen sowie abgestimmte Maßnahmen im Rahmen ihrer gesetzlichen Zuständigkeit umzusetzen, soweit dem keine rechtlichen Hindernisse entgegenstehen.

(7) Die operative Einsatzleitung kann in Fällen, in denen die nationale Sicherheit unmittelbar betroffen ist, durch das NOOSE übernommen werden.

(8) Das NOOSE ist darüber hinaus zuständig für

1. den Schutz staatlicher Institutionen und sensibler Einrichtungen,
2. die Aufklärung und Abwehr von Inlandsterrorismus,
3. Maßnahmen des Verfassungsschutzes,
4. sicherheitsrelevante Lage- und Risikoanalysen,
5. die Unterstützung anderer Behörden bei außergewöhnlichen Gefahrenlagen.'),
  ('Art. 30', 'Gebühren', 'Abschnitt VI – Die Exekutive', '(1) Alle Gebühren, die von staatlichen Institutionen im Rahmen der Ausstellung von Berechtigungen, amtlichen Dokumenten oder bei der Erbringung von Dienstleistungen erhoben werden, unterliegen einer gesetzlichen Deckelung.

(2) Die maximale Höhe einzelner Gebühren wird durch die jeweilige Behörde im Einvernehmen mit dem San Andreas Parliament festgelegt.

(3) Staatliche Institutionen sind verpflichtet, für die Einführung neuer gebührenpflichtiger Berechtigungen, amtlicher Dokumente oder Dienstleistungen sowie für jede Anpassung bestehender Gebühren einen Antrag beim San Andreas Parliament einzureichen. Die Gebührenobergrenzen werden durch das San Andreas Parliament festgelegt.'),
  ('Art. 31', 'Richterliche Gewalt und Unabhängigkeit', 'Abschnitt VII – Die Judikative', '(1) Die richterliche Gewalt des Staates San Andreas wird durch die Gerichte ausgeübt. Die Richter sind unabhängig und nur dem Gesetz unterworfen.

(2) Die richterliche Gewalt erstreckt sich auf alle Fälle, die sich aus dieser Verfassung und den Gesetzen des Staates San Andreas ergeben.'),
  ('Art. 32', 'Instanzenzug', 'Abschnitt VII – Die Judikative', '(1) Die ordentliche Gerichtsbarkeit gliedert sich in drei Instanzen:

1. den District Court als Eingangsinstanz,
2. den Court of Appeals als Berufungsinstanz,
3. den Supreme Court als höchste Instanz.

(2) Der District Court ist für die Verhandlung und Entscheidung sämtlicher erstinstanzlicher Verfahren in Zivil- und Strafsachen zuständig. Er kann in Fachbereiche, insbesondere Zivil- und Strafkammern, gegliedert werden.

(3) Der Court of Appeals überprüft Entscheidungen des District Court über Neuverhandlung. Im Mittelpunkt seiner Tätigkeit steht die Überprüfung der angefochtenen Entscheidung. Er kann in Fällen mit höherem Streitwert oder besonderer Bedeutung als Erstinstanz tätig werden, näheres regelt die Gerichtsordnung.

(4) Der Supreme Court ist das höchste Gericht des Staates und die letzte Instanz. Er entscheidet über Verfahren von grundsätzlicher Bedeutung und sichert die einheitliche Rechtsprechung. Er wählt die Fälle aus, die er zur Entscheidung annimmt.

(5) An der Spitze des Supreme Court steht der Chief Justice. Er repräsentiert die Gerichtsbarkeit nach außen und trägt die Gesamtverantwortung für die einheitliche Rechtsprechung. Das Nähere zu Aufbau, Rängen, Besetzung, sowie weiteren Aufgaben und Spruchkörpern der Gerichte regelt die Gerichtsordnung.'),
  ('Art. 33', 'Anerkennung, Rechtsmittel und Bindungswirkung', 'Abschnitt VII – Die Judikative', '(1) Gesetze und richterliche Entscheidungen genießen volle Würdigung und Anerkennung.

(2) Ein Widerspruch gegen eine geltende richterliche Entscheidung kann nur bei der nächsthöheren richterlichen Instanz erhoben werden.

(3) Die Urteile des Supreme Court sind endgültig und für alle nachgeordneten Gerichte bindend.

(4) Die Prüfung von Gesetzen auf ihre Vereinbarkeit mit dieser Verfassung obliegt nicht den Gerichten der ordentlichen Gerichtsbarkeit, sondern ausschließlich dem Constitutional Court (Abschnitt  VIII).'),
  ('Art. 34', 'US Special Judicial Authority', 'Abschnitt VII – Die Judikative', '(1) Das US Special Judicial Authority (USSJA) ist ein Sondergericht außerhalb der regulären, öffentlich einsehbaren Gerichtsbarkeit. Es besitzt die Befugnis, gesetzliche Ausnahmeregelungen für Bürger und Behörden bei berechtigtem Interesse zu prüfen und zu genehmigen.

(2) Das USSJA entscheidet über Anträge auf Abweichung von der geltenden Gesetzeslage, wenn ein berechtigtes Interesse vorliegt, das eine solche Ausnahme rechtfertigt. Es prüft die Rechtmäßigkeit und Angemessenheit des Antrags.

(3) Das USSJA verfügt über keine gesondert ernannte Judicial Branch. Sein Spruchkörper besteht kraft seines Amtes aus den Mitgliedern des Supreme Court sowie den Leitungen des District Court und des Court of Appeals; einer gesonderten Erwähnung bedarf es nicht.

(4) Beschlüsse des USSJA werden mit absoluter Mehrheit der Mitglieder des Spruchkörpers gefasst und mit dieser Mehrheit rechtswirksam.

(5) (OOC) Bei jedem Antrag wird die Teamleitung informiert. Die Teamleitung besitzt ein Vetorecht. Legt sie ihr Veto ein, so ist der Antrag abgelehnt; eine zustimmende Abstimmung der Teamleitung ist für die Genehmigung hingegen nicht erforderlich.

(6) Gegen Entscheidungen des USSJA ist kein Rechtsmittel vorgesehen. Das USSJA behält sich das Recht vor, eigene Beschlüsse zu prüfen und gegebenenfalls aufzuheben.

(7) Ausnahmen von Abschnitt II sowie von dieser Verfassung selbst sind unzulässig. Genehmigungen sind zu befristet, schriftlich zu begründen und dem Constitutional Court zur Kenntnis zu geben. Die Verfassungsbeschwerde nach Artikel 39 bleibt unberührt'),
  ('Art. 35', 'Stellung und Zusammensetzung', 'Abschnitt VIII – Das Constitutional Court', '(1) Das Constitutional Court ist das oberste Organ zur Wahrung dieser Verfassung. Es steht insoweit über die ordentliche Gerichtsbarkeit.

(2) Das Constitutional Court besteht aus

1. einem der Chairman of the San Andreas Council als Hauptrichter und
2. dem Chief Justice sowie dem Deputy Chief Justice des Supreme Court als Nebenrichter.

(3) Den Vorsitz im Constitutional Court führt der Hauptrichter.

(4) Der Hauptrichter kann ein Verfahren allein entscheiden oder es einem oder beiden Nebenrichtern zur Bearbeitung und Entscheidung übertragen. Entscheidet das Gericht in voller Besetzung, so gibt bei Stimmengleichheit die Stimme des Hauptrichters den Ausschlag.

(5) Das Constitutional Court greift nicht in den laufenden Betrieb der ordentlichen Gerichtsbarkeit ein. Es nimmt ausschließlich die ihm         in dieser Verfassung zugewiesenen Aufgaben wahr.

(6) Ist der Chairman of the San Andreas Council Beteiligter des Verfahrens, so führt der Chief Justice den Vorsitz; der Hauptrichter wirkt an der Entscheidung nicht mit.'),
  ('Art. 36', 'Zuständigkeiten', 'Abschnitt VIII – Das Constitutional Court', 'Das Constitutional Court entscheidet

1. über die Vereinbarkeit von Gesetzen mit dieser Verfassung (Normenkontrolle),
2. über Streitigkeiten zwischen den obersten Staatsorganen über ihre verfassungsmäßigen Rechte und Pflichten (Organstreitigkeiten),
3. über Verfassungsbeschwerden (Artikel 39) und
4. über die weiteren ihm durch diese Verfassung zugewiesenen Verfahren.'),
  ('Art. 37', 'Antragsberechtigte und Verfahren', 'Abschnitt VIII – Das Constitutional Court', '(1) Antragsberechtigt sind

1. der San Andreas Council,
2. das San Andreas Parliament,
3. der Speaker of Parliament,
4. jede unmittelbar betroffene Staatsfraktion sowie
5. im Verfahren der Verfassungsbeschwerde jede beschwerdeberechtigte Person (Artikel 39).

(2) Der Antrag ist schriftlich zu stellen und zu begründen. Das Constitutional Court klärt den Sachverhalt von Amts wegen auf und gibt den Beteiligten Gelegenheit zur Stellungnahme.

(3) Das Constitutional Court entscheidet durch begründeten Beschluss, soweit diese Verfassung nichts anderes bestimmt.'),
  ('Art. 38', 'Entscheidungswirkung und einstweilige Anordnung', 'Abschnitt VIII – Das Constitutional Court', '(1) Das Constitutional Court kann ein Gesetz ganz oder teilweise für nichtig erklären. Ein für nichtig erklärtes Gesetz ist von der Verkündung der Entscheidung an nicht mehr anzuwenden.

(2) Das Constitutional Court kann bis zur endgültigen Entscheidung eine einstweilige Anordnung erlassen, insbesondere die Anwendung eines Gesetzes ganz oder teilweise vorläufig aussetzen, wenn dies zur Abwehr schwerer Nachteile dringend geboten ist.

(3) Der Constitutional Court kann im Rahmen einer Verfassungsbeschwerde (Artikel 39) Entscheidungen und Akte jeglicher staatlichen Behörden und Gerichte für nicht vereinbar mit der Verfassung erklären. Damit sind diese nicht länger bindend und aufgehoben.

(4) Die Entscheidungen des Constitutional Courts sind für alle Staatsorgane, Behörden und Gerichte bindend.'),
  ('Art. 39', 'Verfassungsbeschwerde', 'Abschnitt VIII – Das Constitutional Court', '(1) Jede Person kann mit der Behauptung, durch die öffentliche Gewalt in einem ihrer Grundrechte (Abschnitt  II) verletzt zu sein, Verfassungsbeschwerde zum Constitutional Court erheben.

(2) Die Verfassungsbeschwerde ist nur zulässig, wenn

1. der ordentliche Rechtsweg zuvor erschöpft wurde und
2. ein schwerwiegender Eingriff in ein Grundrecht geltend gemacht wird.

(3) Das Constitutional Court kann offensichtlich unzulässige oder unbegründete Beschwerden ohne weitere Begründung zurückweisen.'),
  ('Art. 40', 'Die San Andreas National Guard', 'Abschnitt IX – Die San Andreas National Guard', '(1) Die San Andreas National Guard dient der Landesverteidigung und der Sicherheit des Staates San Andreas.

(2) Die San Andreas National Guard ist stets Herr über den Luftraum, sowie die Gewässer des Staates San Andreas und hat dessen Sicherheit zu jeder Zeit zu gewährleisten.

(3) Wird die San Andreas National Guard zu einem laufenden Einsatz hinzugerufen, so übernimmt die ranghöchste anwesende Person der San Andreas National Guard die Einsatzleitung und damit die Verantwortung für das Handeln.'),
  ('Art. 41', 'Ausrufung und Mobilisierung', 'Abschnitt IX – Die San Andreas National Guard', '(1) Die San Andreas National Guard kann ausgerufen werden durch

1. die Berechtigten des San Andreas Parliaments oder
2. in Abwesenheit eines Berechtigten durch einen Angehörigen der San Andreas National Guard im Rang eines Majors oder höher, oder
3. den Leitungen der Staatsbehörden in Abwesenheit von obigen Personen.

(2) Ein Mobilisierungsbefehl kann nicht auf eine andere Person übertragen werden. Er muss stets von der amtierenden, hierzu befugten Person ausgerufen werden.

(3) Die Parlamentarische Ausrufung richtet sich nach Artikel 16 Absatz 2 Nummer 4.'),
  ('Art. 42', 'Die Militärpolizei', 'Abschnitt IX – Die San Andreas National Guard', '(1) Die Militärpolizei übernimmt innerhalb der San Andreas National Guard die Strafverfolgung. Im Dienst befindliche Angehörige der San Andreas National Guard dürfen ausschließlich in Zusammenarbeit mit der Militärpolizei abgehandelt werden.

(2) Die Militärpolizei dient dem Schutz sämtlicher militärischer Einrichtungen.

(3) Außerhalb des militärischen Geländes oder militärischer Einsätze nimmt die Militärpolizei keine Rechte der Strafverfolgung gegenüber Zivilisten wahr.

(4) Das LSPD und das NOOSE sind berechtigt, Militärfahrzeuge anzuhalten und nach dem Militärausweis zu kontrollieren. Sie müssen die Militärpolizei hierüber in Kenntnis setzen und alle erhobenen Informationen gegenüber der Militärpolizei offenlegen.

(5) Der National Security Council kann in Zusammenarbeit mit dem Office of the San Andreas Attorney General die Ermittlungsbehörden in Einzelfällen von der Pflicht zur Verfolgung eines Vergehens befreien.'),
  ('Art. 43', 'Militärische Gerichtsbarkeit', 'Abschnitt IX – Die San Andreas National Guard', '(1) Straftaten, die ein Angehöriger der San Andreas National Guard im Dienst begeht, unterliegen der militärischen Gerichtsbarkeit. Diese wird durch eine Militärkammer des District Court ausgeübt.

(2) Straftaten, die ein Angehöriger der San Andreas National Guard außerhalb des Dienstes begeht, sowie Straftaten ohne militärischen Bezug unterliegen der allgemeinen Gerichtsbarkeit.

(3) In Zweifelsfällen über die Zuständigkeit ist auf den überwiegenden Bezug der Tat zum Dienst abzustellen.'),
  ('Art. 44', 'Verfahren und Zuständigkeit', 'Abschnitt IX – Die San Andreas National Guard', '(1) Die Ermittlungen gegen einen im Dienst befindlichen Angehörigen der San Andreas National Guard führt das Office of the San Andreas Attorney General. Die Militärpolizei ist bei jedem Verfahren gegen einen solchen Angehörigen einzubeziehen.

(2) Die Anklage vertritt das Office of the San Andreas Attorney General.

(3) Gegen Entscheidungen der Militärkammer stehen die allgemeinen Rechtsmittel offen. Berufung und Revision richten sich nach dem Instanzenzug des Artikels 32; über sie entscheiden der Court of Appeals und der Supreme Court.'),
  ('Art. 45', 'Militärische Dienstvergehen', 'Abschnitt IX – Die San Andreas National Guard', '(1) Militärische Dienstvergehen, die keinen Straftatbestand erfüllen, werden innerhalb der San Andreas National Guard disziplinarisch geahndet. Für sie ist die militärische Gerichtsbarkeit nicht zuständig.

(2) Disziplinarmaßnahmen der San Andreas National Guard und die strafrechtliche Verfolgung derselben Tat schließen einander nicht aus.

(3) Führt eine Straftat nach Artikel 43 zugleich zu dienstrechtlichen Folgen, so richten sich diese nach den für die San Andreas National Guard geltenden Vorschriften.'),
  ('Art. 46', 'Änderung der Verfassung', 'Abschnitt X – Übergangs- und Schlussbestimmungen', '(1) Eine Änderung dieser Verfassung bedarf eines Beschlusses des San Andreas Parliaments mit mindestens 66 Prozent der Stimmen (absolute Mehrheit).

(2) Der San Andreas Council kann gegen eine Verfassungsänderung innerhalb von sieben Tagen verfassungsrechtliche oder das Regelwerk betreffende Bedenken erheben und das Constitutional Court oder die Teamleitung anrufen.

(3) Die verfassungsmäßige Gewalt der Serverleitung nach Artikel 1 bleibt unberührt. Die Serverleitung kann diese Verfassung sowie einzelne ihrer Bestimmungen jederzeit ändern, ergänzen oder außer Kraft setzen.'),
  ('Art. 47', 'Vorrang und Fortgeltung des Rechts', 'Abschnitt X – Übergangs- und Schlussbestimmungen', '(1) Diese Verfassung tritt mit ihrer Verkündung in Kraft und ersetzt die bisherige Verfassung des Staates San Andreas.

(2) Die auf Grundlage der bisherigen Verfassung erlassenen Gesetze bleiben in Kraft, soweit sie dieser Verfassung nicht widersprechen.

(3) Soweit Gesetze auf Vorschriften der bisherigen Verfassung verweisen, gelten die entsprechenden Vorschriften dieser Verfassung.'),
  ('Art. 48', 'Salvatorische Klausel', 'Abschnitt X – Übergangs- und Schlussbestimmungen', 'Ist eine Bestimmung dieser Verfassung ganz oder teilweise unwirksam oder undurchführbar, so bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. An die Stelle der unwirksamen Bestimmung tritt eine Regelung, die dem verfolgten Zweck möglichst nahekommt. In unklaren Fällen entscheidet der Chairman of the San Andreas Council.')
) as v(nummer, titel, abschnitt, text) where lower(g.kuerzel) = lower('Verf');

-- ---------- StGB – Strafgesetzbuch (112 Einträge) ----------
insert into public.gesetzbuecher (kuerzel, titel, beschreibung, farbe, sortierung)
select 'StGB', 'Strafgesetzbuch', 'Allgemeiner Teil (Gesamtstrafe, Versuch, Notwehr, Strafen) und alle Straftatbestände mit Strafrahmen in Hafteinheiten.', 'rot', 10
where not exists (select 1 from public.gesetzbuecher where lower(kuerzel) = lower('StGB'));
update public.gesetzbuecher set titel = 'Strafgesetzbuch', beschreibung = 'Allgemeiner Teil (Gesamtstrafe, Versuch, Notwehr, Strafen) und alle Straftatbestände mit Strafrahmen in Hafteinheiten.'
  where lower(kuerzel) = lower('StGB');
delete from public.paragraphen where gesetzbuch_id = (select id from public.gesetzbuecher where lower(kuerzel) = lower('StGB'));
insert into public.paragraphen (gesetzbuch_id, nummer, titel, abschnitt, text)
select g.id, v.nummer, v.titel, v.abschnitt, v.text from public.gesetzbuecher g, (values
  ('§ 1', 'Keine Strafe ohne Gesetz', 'I. – Allgemeiner Teil', 'Eine Tat kann nur bestraft werden, wenn die Strafbarkeit gesetzlich bestimmt war, bevor die Tat begangen wurde.'),
  ('§ 2', 'Verbot der Doppelbestrafung', 'I. – Allgemeiner Teil', 'Niemand darf wegen derselben Straftat mehrmals bestraft werden.'),
  ('§ 3', 'Zusammentreffen mehrerer Straftaten (Gesamtstrafe)', 'I. – Allgemeiner Teil', '(1) Verletzt dieselbe Handlung oder verletzen mehrere Handlungen desselben Lebenssachverhalts mehr als ein Strafgesetz, so wird eine Gesamtstrafe gebildet.

(2) Die Gesamtstrafe darf 120 Hafteinheiten nicht übersteigen. In besonders schweren Fällen sowie bei Terrorstraftaten darf sie bis zu 180 Hafteinheiten betragen. Besonders schwere Fälle liegen vor, wenn sich eine Straftat gegen:

• das Recht auf Leben und körperliche Unversehrtheit richtet.
• die Verfassungsmäßige Ordnung richtet.

(3) Treffen mehrere Geldstrafen zusammen, so werden sie addiert.'),
  ('§ 4', 'Zeitlicher Geltungsbereich', 'I. – Allgemeiner Teil', '(1) Die Strafe und ihre Nebenfolgen bestimmen sich nach dem Gesetz, das zur Zeit der Tat gilt.

(2) Wird die Strafdrohung während der Begehung der Tat geändert, so ist das Gesetz anzuwenden, das bei Beendigung der Tat gilt.

(3) Wird das Gesetz vor der Entscheidung geändert, so ist das mildeste Gesetz anzuwenden.'),
  ('§ 5', 'Verbrechen und Vergehen', 'I. – Allgemeiner Teil', '(1) Verbrechen sind rechtswidrige Taten, die im Mindestmaß mit Freiheitsstrafe von nicht unter 15 Hafteinheiten bedroht sind.

(2) Vergehen sind rechtswidrige Taten, die im Mindestmaß mit einer geringeren Freiheitsstrafe oder mit Geldstrafe bedroht sind.

(3) Schärfungen oder Milderungen für besonders schwere oder minder schwere Fälle bleiben für die Einteilung außer Betracht.'),
  ('§ 6', 'Begehen durch Unterlassen', 'I. – Allgemeiner Teil', 'Wer es unterlässt, einen Erfolg abzuwenden, der zum Tatbestand eines Strafgesetzes gehört, ist nur dann strafbar, wenn er rechtlich dafür einzustehen hat, dass der Erfolg nicht eintritt.'),
  ('§ 7', 'Vorsätzliches und fahrlässiges Handeln', 'I. – Allgemeiner Teil', 'Strafbar ist nur vorsätzliches Handeln, wenn nicht das Gesetz fahrlässiges Handeln ausdrücklich mit Strafe bedroht.'),
  ('§ 8', 'Verminderte Schuldfähigkeit', 'I. – Allgemeiner Teil', 'Ist die Fähigkeit des Täters, das Unrecht der Tat einzusehen oder nach dieser Einsicht zu handeln, infolge des Alkohol- oder Drogenkonsums oder einer Erkrankung erheblich vermindert, so kann die Strafe gemildert werden.'),
  ('§ 9', 'Strafbarkeit des Versuchs und der Vortäuschung', 'I. – Allgemeiner Teil', '(1) Der Versuch eines Verbrechens ist stets strafbar, der Versuch eines Vergehens nur dann, wenn das Gesetz es ausdrücklich bestimmt.

(2) Der Versuch kann milder bestraft werden als die vollendete Tat.

(3) Das vorsätzliche Vortäuschen einer Straftat wird bestraft wie die Straftat selbst, soweit nicht eine besondere Vorschrift dieses Gesetzes vorgeht.'),
  ('§ 10', 'Täterschaft, Anstiftung und Beihilfe', 'I. – Allgemeiner Teil', '(1) Als Täter wird bestraft, wer die Straftat selbst oder durch einen anderen begeht.

(2) Begehen mehrere die Straftat gemeinschaftlich, so wird jeder als Täter bestraft (Mittäter).

(3) Als Anstifter wird gleich einem Täter bestraft, wer vorsätzlich einen anderen zu einer rechtswidrigen Tat bestimmt hat.

(4) Als Gehilfe wird bestraft, wer vorsätzlich einem anderen zu dessen vorsätzlich begangener rechtswidriger Tat Hilfe geleistet hat; die Strafe kann gemildert werden.

(5) Gleich einem Täter wird bestraft, wer eine unter staatlicher Verfolgung stehende Person bewusst

1. mit Dienstleistungen beschäftigt oder unterstützt oder
2. durch Zurverfügungstellen eigener Mittel schützt.'),
  ('§ 11', 'Notwehr und Nothilfe', 'I. – Allgemeiner Teil', '(1) Wer eine Tat begeht, die durch Notwehr geboten ist, handelt nicht rechtswidrig.

(2) Notwehr ist die Verteidigung, die erforderlich ist, um einen gegenwärtigen rechtswidrigen Angriff von sich oder einem anderen abzuwenden.

(3) Überschreitet der Täter die Grenzen der Notwehr aus Verwirrung, Furcht oder Schrecken, so wird er nicht bestraft.

(4) Überschreitet er sie ohne einen solchen Umstand, so ist dies strafbar.'),
  ('§ 12', 'Rechtfertigender Notstand', 'I. – Allgemeiner Teil', 'Wer in einer gegenwärtigen, nicht anders abwendbaren Gefahr für ein Rechtsgut eine Tat begeht, um die Gefahr von sich oder einem anderen abzuwenden, handelt nicht rechtswidrig, wenn das geschützte Interesse das beeinträchtigte wesentlich überwiegt und die Tat ein angemessenes Mittel ist, die Gefahr abzuwenden.'),
  ('§ 13', 'Strafen', 'I. – Allgemeiner Teil', '(1) Wird jemand durch eine rechtswidrige Tat verurteilt, so können folgende Strafen und Maßnahmen verhängt werden:

1. Freiheitsstrafen,
2. Geldstrafen und Bußgelder,
3. Maßnahmen der Besserung und Sicherung,
4. die Anordnung gemeinnütziger Leistungen.

(2) Ist die Höhe einer Geldstrafe oder eines Bußgeldes nicht gesetzlich festgelegt, darf diese höchstens 3.000 $ je Hafteinheit betragen.'),
  ('§ 14', 'Verlust der Wählbarkeit', 'I. – Allgemeiner Teil', '(1) Wer wegen eines Verbrechens zu Freiheitsstrafe von mindestens 45 Hafteinheiten verurteilt wird, verliert für die Dauer von zwei Wochen die Fähigkeit, Rechte aus öffentlichen Wahlen zu erlangen.

(2) Mit dem Verlust dieser Fähigkeit verliert der Verurteilte zugleich die entsprechenden Rechtsstellungen und Rechte.

(3) Der Verlust wird mit der Rechtskraft des Urteils wirksam.'),
  ('§ 15', 'Verlust der Amtsfähigkeit', 'I. – Allgemeiner Teil', '(1) Wer wegen eines Verbrechens zu Freiheitsstrafe von mindestens 45 Hafteinheiten verurteilt wird, verliert für die Dauer von zwei Wochen das Recht, öffentliche Ämter zu bekleiden.

(2) Mit dem Verlust der Amtsfähigkeit verliert der Verurteilte zugleich die entsprechenden Rechtsstellungen und Rechte.

(3) Der Verlust wird mit der Rechtskraft des Urteils wirksam.'),
  ('§ 16', 'Entzug von Berechtigungsscheinen', 'I. – Allgemeiner Teil', '(1) Wird jemand wegen einer Tat im Zusammenhang mit einem Kraftfahrzeug verurteilt, so kann ein Fahrverbot mit einer maximalen Laufzeit von 4 Wochen angeordnet oder die Fahrerlaubnis entzogen werden.

(2) Wird jemand wegen einer Tat im Zusammenhang mit dem Gebrauch einer Schusswaffe verurteilt, so kann der Entzug waffenrechtlicher Berechtigungen angeordnet werden.

(3) Nach rechtskräftigem Entzug kann eine Verbotsfrist mit maximaler Laufzeit von 12 Wochen angeordnet werden.'),
  ('§ 17', 'Gerichtliche Immunität', 'I. – Allgemeiner Teil', '(1) Richter sind für Handlungen in Ausübung ihres Amtes keiner Gerichtsbarkeit unterworfen; dies gilt auch nach Ende ihrer Amtstätigkeit. Hierzu zählen

1. das Fällen von Gerichtsurteilen,
2. die Ausstellung gerichtlicher oder sonstiger amtlicher Dokumente und Beschlüsse,
3. die Anordnung der Vollstreckung rechtskräftiger richterlicher Entscheidungen.

(2) Die §§ 79, 80 und 83 bleiben hiervon unberührt.'),
  ('§ 18', 'Mord', 'II. – Straftaten gegen das Leben', '(1) Der Mörder wird mit Freiheitsstrafe von nicht unter 45 Hafteinheiten bestraft.

(2) Mörder ist, wer aus Mordlust, zur Befriedigung des Geschlechtstriebs, aus Habgier oder sonst aus niedrigen Beweggründen, heimtückisch, grausam oder mit gemeingefährlichen Mitteln oder um eine andere Straftat zu ermöglichen oder zu verdecken einen Menschen tötet.'),
  ('§ 19', 'Totschlag', 'II. – Straftaten gegen das Leben', 'Wer einen Menschen tötet, ohne Mörder zu sein, wird als Totschläger mit Freiheitsstrafe nicht unter 20 Hafteinheiten bestraft.'),
  ('§ 20', 'Fahrlässige Tötung', 'II. – Straftaten gegen das Leben', 'Wer durch Fahrlässigkeit den Tod eines Menschen verursacht, wird mit Freiheitsstrafe bis zu 20 Hafteinheiten oder mit einer Geldstrafe bestraft.'),
  ('§ 21', 'Körperverletzung', 'III. – Straftaten gegen die körperliche Unversehrtheit', '(1) Wer eine andere Person körperlich misshandelt oder an der Gesundheit schädigt, wird mit Freiheitsstrafe bis zu 20 Hafteinheiten oder mit einer Geldstrafe bestraft.

(2) Der Versuch ist strafbar.'),
  ('§ 22', 'Fahrlässige Körperverletzung', 'III. – Straftaten gegen die körperliche Unversehrtheit', 'Wer durch Fahrlässigkeit eine andere Person an der Gesundheit schädigt, wird mit Freiheitsstrafe bis zu 10 Hafteinheiten oder mit einer Geldstrafe bestraft.'),
  ('§ 23', 'Gefährliche Körperverletzung', 'III. – Straftaten gegen die körperliche Unversehrtheit', '(1) Wer die Körperverletzung unter Nutzung einer Waffe oder eines anderen gefährlichen Werkzeugs begeht, wird mit Freiheitsstrafe bis zu 25 Hafteinheiten oder mit einer Geldstrafe bestraft.

(2) Der Versuch ist strafbar.'),
  ('§ 24', 'Schwere Körperverletzung', 'III. – Straftaten gegen die körperliche Unversehrtheit', '(1) Wer durch eine Körperverletzung eine dauerhafte Verstümmelung oder eine schwere, bleibende Gesundheitsschädigung einer Person hervorruft, wird mit Freiheitsstrafe bis zu 30 Hafteinheiten bestraft.

(2) Der Versuch ist strafbar.'),
  ('§ 25', 'Freiheitsberaubung', 'IV. – Straftaten gegen die persönliche Freiheit', '(1) Wer einen Menschen einsperrt oder auf andere Weise der Freiheit beraubt, wird mit Freiheitsstrafe bis zu 20 Hafteinheiten oder mit Geldstrafe bestraft.

(2) Der Versuch ist strafbar.

(3) Verursacht die Tat eine schwere Gesundheitsschädigung des Opfers, so ist auf Freiheitsstrafe bis zu 25 Hafteinheiten zu erkennen.'),
  ('§ 26', 'Geiselnahme', 'IV. – Straftaten gegen die persönliche Freiheit', 'Wer einen Menschen entführt oder sich seiner bemächtigt, um ihn oder einen Dritten zu einer Handlung, Duldung oder Unterlassung zu nötigen, oder wer die durch eine solche Tat geschaffene Lage zu einer solchen Nötigung ausnutzt, wird mit Freiheitsstrafe von nicht unter 30 Hafteinheiten bestraft.'),
  ('§ 27', 'Menschenhandel', 'IV. – Straftaten gegen die persönliche Freiheit', '(1) Mit Freiheitsstrafe bis zu 30 Hafteinheiten wird bestraft, wer eine andere Person unter Ausnutzung ihrer persönlichen oder wirtschaftlichen Zwangslage oder ihrer Hilflosigkeit anwirbt, befördert, weitergibt, beherbergt oder aufnimmt, wenn diese Person

1. ausgebeutet werden soll durch eine Beschäftigung, bei der Ausübung der Bettelei oder bei der Begehung mit Strafe bedrohter Handlungen oder
2. in Sklaverei, Leibeigenschaft, Schuldknechtschaft oder einem entsprechenden Verhältnis gehalten werden soll.

Ausbeutung durch Beschäftigung liegt vor, wenn diese aus rücksichtslosem Gewinnstreben zu Arbeitsbedingungen erfolgt, die in einem auffälligen Missverhältnis zu denen vergleichbarer Arbeitnehmer stehen.

(2) Mit Freiheitsstrafe von 25 bis 40 Hafteinheiten wird bestraft, wer eine Person, die nach Absatz 1 ausgebeutet werden soll,

1. mit Gewalt, durch Drohung mit einem empfindlichen Übel oder durch List anwirbt oder
2. entführt, sich ihrer bemächtigt oder ihrer Bemächtigung durch einen Dritten Vorschub leistet.

(3) Der Versuch ist strafbar.'),
  ('§ 28', 'Nötigung', 'IV. – Straftaten gegen die persönliche Freiheit', 'Wer einen Menschen rechtswidrig mit Gewalt oder durch Drohung mit einem empfindlichen Übel zu einer Handlung, Duldung oder Unterlassung nötigt, wird mit Freiheitsstrafe bis zu 15 Hafteinheiten oder mit einer Geldstrafe bestraft.'),
  ('§ 29', 'Bedrohung', 'IV. – Straftaten gegen die persönliche Freiheit', '(1) Wer eine andere oder eine ihr nahestehende Person mit der Begehung einer rechtswidrigen Tat gegen die sexuelle Selbstbestimmung, die körperliche Unversehrtheit, die persönliche Freiheit oder gegen eine Sache von bedeutendem Wert bedroht, wird mit Freiheitsstrafe bis zu 15 Hafteinheiten oder mit Geldstrafe bestraft.

(2) Wer einen Menschen mit der Begehung eines gegen ihn oder einer ihm nahestehenden Person gerichteten Verbrechens bedroht, wird mit Freiheitsstrafe bis zu 20 Hafteinheiten bestraft.

(3) Ebenso wird bestraft, wer wider besseres Wissen vortäuscht, die Verwirklichung eines solchen Verbrechens stehe bevor.

(4) Wird die Tat öffentlich, in einer Versammlung oder durch Verbreitung von Inhalten begangen, so ist die Strafe Freiheitsstrafe bis zu 25 Hafteinheiten.

(5) Die für die angedrohte Tat geltenden Vorschriften über den Strafantrag sind entsprechend anzuwenden.'),
  ('§ 30', 'Beleidigung, üble Nachrede und Verleumdung', 'V. – Straftaten gegen die Ehre und die Selbstbestimmung', '(1) Mit Freiheitsstrafe bis zu 5 Hafteinheiten oder mit Geldstrafe wird bestraft, wer

1. eine andere Person oder Personengruppe beleidigt,
2. in Beziehung auf eine andere Person oder Personengruppe eine Tatsache behauptet oder verbreitet, die geeignet ist, sie verächtlich zu machen, in der öffentlichen Meinung herabzuwürdigen oder ihren Kredit zu gefährden,
3. wider besseres Wissen in Beziehung auf eine andere Person oder Personengruppe eine unwahre Tatsache der in Nummer 2 bezeichneten Art behauptet oder verbreitet.

(2) Wird die Tat nach Absatz 1 öffentlich, in einer Versammlung oder durch Verbreitung von Inhalten in Bild-, Schrift- oder Tonform begangen, so ist die Strafe Freiheitsstrafe bis zu 10 Hafteinheiten oder Geldstrafe.

(3) Die Tat wird nur auf Antrag verfolgt.

(4) Ausgenommen hiervon sind Presseberichte, welche ein berechtigtes Interesse an der Verfolgung der Wahrheit haben.'),
  ('§ 31', 'Sexuelle Belästigung', 'V. – Straftaten gegen die Ehre und die Selbstbestimmung', '(1) Wer eine andere Person in sexuell bestimmter Weise körperlich berührt und dadurch belästigt, wird mit Freiheitsstrafe bis zu 15 Hafteinheiten oder mit Geldstrafe bestraft, wenn die Tat nicht in anderen Vorschriften mit schwererer Strafe bedroht ist.

(2) In besonders schweren Fällen ist auf Freiheitsstrafe von 15 bis 30 Hafteinheiten zu erkennen. Ein besonders schwerer Fall liegt in der Regel vor, wenn die Tat von mehreren gemeinschaftlich begangen wird.

(3) Die Tat wird nur auf Antrag verfolgt. Ausgenommen ist der Fall, dass die Strafverfolgungsbehörde wegen eines besonders gewichtigen öffentlichen Interesses ein Einschreiten von Amts wegen für erforderlich hält; die Staatsanwaltschaft ist hiervon in Kenntnis zu setzen.

(4) Die Höhe der Geldstrafe setzt das Gericht fest. Dabei sind das Ausmaß der Tat, die Folgen für die betroffene Person sowie die wirtschaftlichen und persönlichen Verhältnisse des Täters zu berücksichtigen.'),
  ('§ 32', 'Verbale sexuelle Belästigung', 'V. – Straftaten gegen die Ehre und die Selbstbestimmung', '(1) Wer eine andere Person durch Äußerungen sexuellen Inhalts belästigt und dadurch ihre Würde verletzt, wird mit Freiheitsstrafe bis zu 10 Hafteinheiten oder mit Geldstrafe bestraft, sofern die Tat nicht in anderen Vorschriften mit schwererer Strafe bedroht ist.

(2) In besonders schweren Fällen ist eine Freiheitsstrafe von 10 bis 20 Hafteinheiten zu erkennen. Ein besonders schwerer Fall liegt in der Regel vor, wenn

1. die Tat wiederholt und beharrlich begangen wird,
2. die betroffene Person in einer Weise herabgewürdigt wird, die geeignet ist, ihr Ansehen öffentlich zu schädigen, oder
3. die Tat von mehreren gemeinschaftlich begangen wird.

(3) Die Tat wird nur auf Antrag verfolgt. Die Strafverfolgungsbehörde ist ermächtigt, die Tat bei besonders gewichtigen öffentlichen Interesse von Amts wegen zu verfolgen.

(4) § 31 Absatz 4 gilt entsprechend.'),
  ('§ 33', 'Diebstahl', 'VI. – Straftaten gegen das Vermögen', '(1) Wer eine fremde bewegliche Sache einem anderen in der Absicht wegnimmt, sie sich oder einem Dritten rechtswidrig zuzueignen, wird mit Freiheitsstrafe bis zu 15 Hafteinheiten oder mit Geldstrafe bestraft.

(2) Der Versuch ist strafbar.'),
  ('§ 34', 'Besonders schwerer Fall des Diebstahls', 'VI. – Straftaten gegen das Vermögen', 'In besonders schweren Fällen wird der Diebstahl mit Freiheitsstrafe von 15 bis 30 Hafteinheiten bestraft. Ein besonders schwerer Fall liegt in der Regel vor, wenn der Täter

1. zur Ausführung der Tat in ein Gebäude, einen Dienst- oder Geschäftsraum oder einen anderen umschlossenen Raum einbricht, einsteigt, mit einem falschen Schlüssel oder einem anderen nicht zur ordnungsmäßigen Öffnung bestimmten Werkzeug eindringt oder sich darin verborgen hält,
2. eine Sache stiehlt, die durch ein verschlossenes Behältnis oder eine andere Schutzvorrichtung besonders gesichert ist, oder
3. gewerbsmäßig stiehlt.'),
  ('§ 35', 'Wohnungseinbruchdiebstahl', 'VI. – Straftaten gegen das Vermögen', 'Wer einen Diebstahl begeht, bei dem er zur Ausführung der Tat in eine Wohnung einbricht, einsteigt, mit einem falschen Schlüssel oder einem anderen nicht zur ordnungsmäßigen Öffnung bestimmten Werkzeug eindringt oder sich darin verborgen hält, wird mit Freiheitsstrafe nicht unter 15 Hafteinheiten bestraft.'),
  ('§ 36', 'Unterschlagung', 'VI. – Straftaten gegen das Vermögen', 'Wer eine fremde bewegliche Sache sich oder einem Dritten rechtswidrig zugeeignet, wird mit Freiheitsstrafe bis zu 10 Hafteinheiten oder mit Geldstrafe bestraft, wenn die Tat nicht in anderen Vorschriften mit schwererer Strafe bedroht ist.'),
  ('§ 37', 'Raub', 'VI. – Straftaten gegen das Vermögen', 'Wer mit Gewalt gegen eine Person oder unter Anwendung von Drohungen mit gegenwärtiger Gefahr für Leib oder Leben eine fremde bewegliche Sache einem anderen in der Absicht wegnimmt, sie sich oder einem Dritten rechtswidrig zuzueignen, wird mit Freiheitsstrafe nicht unter 15 Hafteinheiten bestraft.'),
  ('§ 38', 'Schwerer Raub', 'VI. – Straftaten gegen das Vermögen', '(1) Auf Freiheitsstrafe nicht unter 25 Hafteinheiten ist zu erkennen, wenn der Täter oder ein anderer am Raub Beteiligter

1. eine Waffe oder ein anderes gefährliches Werkzeug verwendet,
2. die Person körperlich schwer misshandelt oder
3. die Person in Lebensgefahr bringt.

(2) Eine Körperverletzung, die durch dieselbe Gewalthandlung verwirklicht wird, die den schweren Raub begründet, wird nicht gesondert gezählt. Eine darüber hinausgehende, eigenständige Körperverletzung bleibt gesondert strafbar.'),
  ('§ 39', 'Betrug', 'VI. – Straftaten gegen das Vermögen', '(1) Wer in der Absicht, sich oder einem Dritten einen rechtswidrigen Vermögensvorteil zu verschaffen, das Vermögen eines anderen dadurch beschädigt, dass er durch Vorspiegelung falscher oder durch Entstellung oder Unterdrückung wahrer Tatsachen einen Irrtum erregt oder unterhält, wird mit Freiheitsstrafe bis zu 15 Hafteinheiten oder mit Geldstrafe bestraft.

(2) Der Versuch ist strafbar.'),
  ('§ 40', 'Sachbeschädigung', 'VI. – Straftaten gegen das Vermögen', '(1) Wer rechtswidrig eine fremde Sache beschädigt oder zerstört, wird mit Freiheitsstrafe bis zu 15 Hafteinheiten oder mit einer Geldstrafe bestraft.

(2) Ebenso wird bestraft, wer unbefugt das Erscheinungsbild einer fremden Sache nicht nur unerheblich und nicht nur vorübergehend verändert.

(3) Der Versuch ist strafbar.'),
  ('§ 41', 'Unbefugter Gebrauch eines Fahrzeugs', 'VI. – Straftaten gegen das Vermögen', '(1) Wer ein Fahrzeug gegen den Willen des Berechtigten in Gebrauch nimmt, wird mit Freiheitsstrafe bis zu 10 Hafteinheiten oder mit einer Geldstrafe bestraft.

(2) Die Tat wird nur auf Antrag verfolgt.'),
  ('§ 42', 'Hausfriedensbruch', 'VI. – Straftaten gegen das Vermögen', '(1) Wer widerrechtlich in die Wohnung, die Geschäftsräume oder das befriedete Besitztum eines anderen oder in abgeschlossene Räume, die dem öffentlichen Dienst oder Verkehr dienen, eindringt oder sich dort ohne Befugnis aufhält und auf Aufforderung des Berechtigten nicht entfernt, wird mit Freiheitsstrafe bis zu 10 Hafteinheiten oder mit Geldstrafe bestraft.

(2) Die Tat wird nur auf Antrag verfolgt.

(3) Besteht der Verdacht des Hausfriedensbruchs, ist der Berechtigte des Grundstücks jedoch längere Zeit nicht erreichbar, so ist der Betroffene verpflichtet, eine schriftliche Genehmigung zum Betreten vorzulegen.'),
  ('§ 43', 'Brandstiftung', 'VII. – Gemeingefährliche Straftaten', '(1) Wer fremde

1. Gebäude oder Hütten,
2. Betriebsstätten oder technische Einrichtungen, namentlich Maschinen, Warenlager oder -vorräte,
3. Kraftfahrzeuge, Schienen-, Luft- oder Wasserfahrzeuge,
4. Wälder, Heiden oder Moore oder
5. land-, ernährungs- oder forstwirtschaftliche Anlagen oder Erzeugnisse

in Brand setzt oder durch eine Brandlegung ganz oder teilweise zerstört, wird mit einer Freiheitsstrafe von 30 bis 45 Hafteinheiten bestraft.

(2) In minder schweren Fällen ist die Strafe Freiheitsstrafe von 15 bis 30 Hafteinheiten.'),
  ('§ 44', 'Herbeiführen einer Sprengstoffexplosion', 'VII. – Gemeingefährliche Straftaten', '(1) Wer eine Explosion durch Sprengstoff oder auf andere geeignete Weise herbeiführt und dadurch Leib oder Leben eines anderen Menschen oder fremde Sachen von bedeutendem Wert gefährdet, wird mit Freiheitsstrafe nicht unter 15 Hafteinheiten bestraft.

(2) Verursacht der Täter durch die Tat eine schwere Gesundheitsschädigung einer großen Zahl von Menschen, so ist auf Freiheitsstrafe nicht unter 20 Hafteinheiten zu erkennen.

(3) Verursacht der Täter durch die Tat wenigstens leichtfertig den Tod eines anderen Menschen, so ist auf Freiheitsstrafe nicht unter 30 Hafteinheiten zu erkennen.

(4) Wer in den Fällen des Absatzes 1 fahrlässig handelt und die Gefahr fahrlässig verursacht, wird mit Freiheitsstrafe bis zu 10 Hafteinheiten bestraft.'),
  ('§ 45', 'Gefährlicher Eingriff in den Straßenverkehr', 'VII. – Gemeingefährliche Straftaten', '(1) Wer die Sicherheit des Straßenverkehrs dadurch beeinträchtigt, dass er

1. Anlagen oder Fahrzeuge zerstört, beschädigt oder beseitigt,
2. Hindernisse bereitet oder
3. auf vergleichbar gefährliche Weise in den Verkehr eingreift,

und dadurch Leib oder Leben eines anderen Menschen oder fremde Sachen von bedeutendem Wert gefährdet, wird mit Freiheitsstrafe bis zu 15 Hafteinheiten oder mit Geldstrafe bestraft.

(2) Der Versuch ist strafbar.'),
  ('§ 46', 'Umgang mit radioaktiven Stoffen', 'VII. – Gemeingefährliche Straftaten', '(1) Der Umgang mit radioaktiven Stoffen ist verboten.

(2) Mit radioaktiven Stoffen geht um, wer diese besitzt, erwirbt, verarbeitet oder mit ihnen Handel treibt.

(3) Der Umgang mit radioaktiven Stoffen wird mit Freiheitsstrafe bis zu 10 Hafteinheiten oder mit Geldstrafe bestraft.

(4) Ausgenommen hiervon sind Behörden, welche im Sinne ihrer hoheitlichen Aufgaben handeln.'),
  ('§ 47', 'Gefährdung des Straßenverkehrs', 'VIII. – Straftaten im Straßen-, Luft- und Wasserverkehr', '(1) Wer ein Kraftfahrzeug führt und dabei nicht in der Lage ist, das Fahrzeug sicher zu führen, insbesondere infolge

1. Alkoholeinflusses,
2. berauschender Mittel oder
3. geistiger oder körperlicher Mängel,

und dadurch Leib oder Leben eines anderen oder fremde Sachen von bedeutendem Wert gefährdet, wird mit Freiheitsstrafe bis zu 20 Hafteinheiten bestraft.

(2) Ebenso wird bestraft, wer grob verkehrswidrig und rücksichtslos handelt, insbesondere durch

1. Missachtung der Vorfahrt,
2. falsches Überholen,
3. zu schnelles Fahren an unübersichtlichen Stellen, an Straßenkreuzungen, Straßeneinmündungen oder Bahnübergängen,
4. Missachtung der Fahrbahnseite,
5. Wenden auf Autobahnen oder Kraftfahrstraßen, Fahren entgegen der Fahrtrichtung oder im Rückwärtsgang oder den Versuch hierzu,
6. fehlende Absicherung liegengebliebener Fahrzeuge,

und dadurch Leib oder Leben eines anderen oder fremde Sachen von bedeutendem Wert gefährdet.'),
  ('§ 48', 'Verbotenes Kraftfahrzeugrennen', 'VIII. – Straftaten im Straßen-, Luft- und Wasserverkehr', '(1) Wer im Straßenverkehr

1. ein nicht erlaubtes Kraftfahrzeugrennen ausrichtet oder durchführt,
2. als Kraftfahrzeugführer an einem nicht erlaubten Kraftfahrzeugrennen teilnimmt,
3. sich als Kraftfahrzeugführer mit nicht angepasster Geschwindigkeit grob verkehrswidrig und rücksichtslos fortbewegt, um eine höchstmögliche Geschwindigkeit zu erreichen, oder
4. Distickstoffmonoxid („NOS“ / „Nitro“) verwendet,

wird mit Freiheitsstrafe bis zu 15 Hafteinheiten sowie nach Ermessen mit Führerscheinentzug bestraft.

(2) Der Versuch ist strafbar.

(3) Von Absatz 1 Nummer 4 ausgenommen sind die Speed Unit Fahrzeuge sowie die Behördenleitung des Los Santos Police Departments, sofern es für die Ausübung ihrer hoheitlichen Tätigkeit zwingend erforderlich ist.'),
  ('§ 49', 'Unerlaubtes Entfernen vom Unfallort', 'VIII. – Straftaten im Straßen-, Luft- und Wasserverkehr', 'Ein Unfallbeteiligter, der sich nach einem Unfall im Straßenverkehr vom Unfallort entfernt, bevor er

1. zugunsten der anderen Unfallbeteiligten seine Beteiligung angegeben hat oder
2. eine nach den Umständen angemessene Zeit gewartet hat, ohne dass jemand bereit war, die Feststellungen zu treffen,

wird mit Freiheitsstrafe bis zu 15 Hafteinheiten oder mit Geldstrafe bestraft.'),
  ('§ 50', 'Fahren ohne Fahrerlaubnis', 'VIII. – Straftaten im Straßen-, Luft- und Wasserverkehr', 'Mit Freiheitsstrafe bis zu 10 Hafteinheiten oder mit Geldstrafe in Höhe von $20.000 wird bestraft, wer

1. ein Kraftfahrzeug führt, obwohl er die dazu erforderliche Fahrerlaubnis nicht hat, oder
2. ein Kraftfahrzeug führt, obwohl ihm das Führen eines Kraftfahrzeugs durch rechtskräftiges Urteil verboten wurde.'),
  ('§ 51', 'Fliegen ohne Fluglizenz', 'VIII. – Straftaten im Straßen-, Luft- und Wasserverkehr', 'Mit Freiheitsstrafe bis zu 10 Hafteinheiten oder mit Geldstrafe in Höhe von $50.000 wird bestraft, wer

1. ein Luftfahrzeug führt, obwohl er die dazu erforderliche Lizenz nicht hat, oder
2. ein Luftfahrzeug führt, obwohl ihm das Führen eines Luftfahrzeugs durch rechtskräftiges Urteil verboten wurde.'),
  ('§ 52', 'Führen eines Wasserfahrzeugs ohne Lizenz', 'VIII. – Straftaten im Straßen-, Luft- und Wasserverkehr', 'Mit Freiheitsstrafe bis zu 10 Hafteinheiten oder mit Geldstrafe in Höhe von $30.000 wird bestraft, wer

1.   ein Wasserfahrzeug führt, obwohl er die dazu erforderliche Lizenz nicht hat, oder
2. ein Wasserfahrzeug führt, obwohl ihm das Führen eines Wasserfahrzeugs durch rechtskräftiges Urteil verboten wurde.'),
  ('§ 53', 'Unterlassene Hilfeleistung', 'IX. – Straftaten gegen die öffentliche Ordnung', 'Wer bei Unglücksfällen, gemeiner Gefahr oder Not nicht Hilfe leistet, obwohl dies erforderlich und ihm den Umständen nach zuzumuten ist, insbesondere ohne erhebliche eigene Gefahr und ohne Verletzung anderer wichtiger Pflichten möglich ist, wird mit Freiheitsstrafe bis zu 10 Hafteinheiten oder mit Geldstrafe bestraft.'),
  ('§ 54', 'Missbrauch von Notrufen', 'IX. – Straftaten gegen die öffentliche Ordnung', '(1) Wer absichtlich oder wissentlich

1. Notrufe oder Notrufzeichen missbraucht,
2. eine Notlage vortäuscht oder
3. unbegründet übermäßig viele Notrufe absetzt,

wird mit Freiheitsstrafe bis zu 5 Hafteinheiten oder mit Geldstrafe bestraft.

(2) Bei mehrfachem Missbrauch nach Absatz 1 ist die Strafe Freiheitsstrafe bis zu 20 Hafteinheiten.'),
  ('§ 55', 'Erregung öffentlichen Ärgernisses', 'IX. – Straftaten gegen die öffentliche Ordnung', '(1) Wer öffentliche Handlungen vornimmt oder in einer Weise auftritt, die geeignet ist, den öffentlichen Frieden zu stören, und dadurch absichtlich oder wissentlich ein Ärgernis erregt, wird mit Geldstrafe von $10.000 bestraft.

(2) Mit Freiheitsstrafe bis zu 10 Hafteinheiten wird bestraft, wer gegenüber Angehörigen

1. der Strafverfolgungsbehörden,
2. des Gerichts oder
3. des Parlaments

öffentlich Handlungen vornimmt oder in einer Weise auftritt, die geeignet ist, deren Arbeit zu stören oder zu behindern.'),
  ('§ 56', 'Bildung krimineller Vereinigungen', 'IX. – Straftaten gegen die öffentliche Ordnung', '(1) Wer eine Organisation gründet, deren Ziel die Begehung von Straftaten ist, oder sich an ihr beteiligt, wird mit Freiheitsstrafe bis zu 15 Hafteinheiten oder mit Geldstrafe bestraft.

(2) Eine kriminelle Vereinigung liegt in der Regel vor, wenn eine Straftat von vier oder mehr Personen gemeinschaftlich begangen wird.'),
  ('§ 57', 'Landfriedensbruch', 'IX. – Straftaten gegen die öffentliche Ordnung', 'Wer sich an

1. Gewalttätigkeiten gegen Menschen oder Sachen oder
2. Bedrohungen von Menschen mit einer Gewalttätigkeit,

die aus einer Menschenmenge in einer die öffentliche Sicherheit gefährdenden Weise mit vereinten Kräften begangen werden, als Täter oder Teilnehmer beteiligt oder wer auf die Menschenmenge einwirkt, um ihre Bereitschaft zu solchen Handlungen zu fördern, wird mit Freiheitsstrafe bis zu 20 Hafteinheiten oder mit Geldstrafe bestraft.'),
  ('§ 58', 'Besonders schwerer Fall des Landfriedensbruchs', 'IX. – Straftaten gegen die öffentliche Ordnung', 'In besonders schweren Fällen des § 57 ist die Strafe Freiheitsstrafe von 30 bis 50 Hafteinheiten. Ein besonders schwerer Fall liegt in der Regel vor, wenn der Täter

1. eine Schusswaffe bei sich führt,
2. eine andere Waffe oder ein anderes gefährliches Werkzeug bei sich führt,
3. durch eine Gewalttätigkeit einen anderen in Todesgefahr oder in die Gefahr einer schweren Gesundheitsschädigung bringt oder
4. plündert oder bedeutenden Schaden an fremden Sachen anrichtet.'),
  ('§ 59', 'Allgemeines Vermummungsverbot', 'IX. – Straftaten gegen die öffentliche Ordnung', '(1) Wer sich im öffentlichen Raum, in einem Kraftfahrzeug oder in behördlichen Institutionen bewegt, darf sein Gesicht nicht in einer Weise verhüllen, die die Feststellung der Identität erschwert oder verhindert.

(2) Wer entgegen Absatz 1 handelt, wird mit Geldstrafe bis zu $10.000 bestraft.

(3) Ausgenommen sind die Polizeibehörden, die Nationalgarde sowie die Staatsanwaltschaft. Ebenso ausgenommen ist das Tragen von Schutzhelmen, die zum Führen eines Go-Karts oder eines Kraftrads verwendet werden.'),
  ('§ 60', 'Besonders schwerer Fall des Vermummungsverbots', 'IX. – Straftaten gegen die öffentliche Ordnung', 'In besonders schweren Fällen wird der Verstoß gegen das Vermummungsverbot mit Freiheitsstrafe von 5 bis 15 Hafteinheiten bestraft. Ein besonders schwerer Fall liegt in der Regel vor, wenn der Täter entgegen § 59 Absatz 1 handelt und dabei andere Straftaten begeht, zu verschleiern versucht oder anderweitig begünstigt.'),
  ('§ 61', 'Sperrzonen', 'IX. – Straftaten gegen die öffentliche Ordnung', '(1) Das Betreten, Durchfahren oder Durchfliegen von Sperrzonen, die Exekutivbehörden ausrufen, ist verboten. Wer sich bei Ausrufung bereits in der Sperrzone befindet, hat sie unverzüglich auf direktem Weg zu verlassen.

(2) Ausnahmen können durch autorisierte Beamte gewährt werden. Medizinisches Personal darf seine Tätigkeit grundsätzlich ausüben.

(3) Bei Missachtung mehrfacher Aufforderung dürfen Exekutivbehörden Zwang anwenden.

(4) Der Verstoß gegen Absatz 1 wird mit Bußgeld bis zu $90.000 bestraft. Bei wiederholtem Eindringen oder Behinderung der Beamten ist die Strafe Freiheitsstrafe von 15 bis 30 Hafteinheiten.'),
  ('§ 62', 'Militärische Sperrzonen', 'IX. – Straftaten gegen die öffentliche Ordnung', '(1) Das Betreten, Verweilen oder Durchqueren militärischer Sperrzonen der National Guard ist verboten. Wer sich bei Ausrufung bereits darin befindet, hat sie unverzüglich zu verlassen.

(2) Ausnahmen können durch Mitglieder der National Guard gestattet werden.

(3) Bei wiederholtem Eindringen darf Zwang bis hin zum Einsatz von Waffen angewendet werden.

(4) Der Verstoß gegen Absatz 1 wird mit Bußgeld bis zu $120.000 geahndet. Wiederholtes Eindringen oder die Behinderung dienstlicher Maßnahmen befugter Kräfte wird mit Freiheitsstrafe bis zu 60 Hafteinheiten bestraft.

(5) Ausgenommen sind staatliche Behörden, sofern das Betreten zur Erfüllung hoheitlicher Aufgaben zwingend erforderlich ist.'),
  ('§ 63', 'Militärisches Sperrgebiet', 'IX. – Straftaten gegen die öffentliche Ordnung', '(1) Militärische Sperrgebiete gelten als militärische Sperrzonen im Sinne des § 62.

(2) Als militärisches Sperrgebiet gelten insbesondere

1. Militärbasen,
2. Flugzeugträger der National Guard und
3. Gelände und Einrichtungen des National Office of Security Enforcement (N.O.O.S.E.).

(3) Für Aufenthalt und Eindringen gelten die Vorschriften des § 62 entsprechend.'),
  ('§ 64', 'Staatliches Sperrgebiet', 'IX. – Straftaten gegen die öffentliche Ordnung', '(1) Das Betreten, Durchfahren oder Durchfliegen staatlicher Sperrgebiete ist verboten.

(2) Soweit nicht anders angeordnet, ist es medizinischem Personal stets erlaubt, seine beruflichen Pflichten auch in staatlichen Sperrgebieten auszuüben. Eine Verweigerung ist zu begründen.

(3) Staatliche Sperrgebiete sind

1. das Parlamentsgebäude,
2. das Staatsgefängnis und
3. die nicht öffentlich zugänglichen Bereiche der Liegenschaften des Los Santos Police Department, insbesondere Mitarbeiterparkplätze, Ausbildungs- und Übungsgelände, Diensträume und Gewahrsamsbereiche.

(4) Nicht als Sperrgebiet nach Absatz 3 Nummer 3 gelten die der Öffentlichkeit zugewiesenen Bereiche, namentlich Empfangs- und Wartebereiche, Vorplätze und Zugänge, sowie Bereiche, die im Einzelfall auf ausdrückliche Einladung eines befugten Beamten betreten werden.

(5) Ausgenommen von Absatz 1 sind alle staatlichen Behörden, soweit sie ihren hoheitlichen Pflichten nachgehen.

(6) Der Verstoß gegen Absatz 1 wird mit Bußgeld bis zu $90.000 bestraft. Bei wiederholtem Eindringen oder Behinderung der Beamten ist die Strafe Freiheitsstrafe bis zu 30 Hafteinheiten.'),
  ('§ 65', 'Störung des öffentlichen Friedens durch Androhung von Straftaten', 'IX. – Straftaten gegen die öffentliche Ordnung', '(1) Wer in einer Weise, die geeignet ist, den öffentlichen Frieden zu stören,

1. einen besonders schweren Fall des Landfriedensbruchs (§ 58),
2. einen Mord (§ 18) oder einen Totschlag (§ 19),
3. eine gefährliche Körperverletzung (§ 23) oder eine schwere Körperverletzung (§ 24),
4. einen Raub (§ 37, § 38) oder
5. eine Brandstiftung (§ 43)

androht, wird mit Freiheitsstrafe bis zu 20 Hafteinheiten oder mit Geldstrafe bestraft.

(2) Ebenso wird bestraft, wer wider besseres Wissen vortäuscht, die Verwirklichung einer der in Absatz 1 genannten Taten stehe bevor.'),
  ('§ 66', 'Widerstand gegen Vollstreckungsbeamte', 'X. – Straftaten gegen die Staatsgewalt und Rechtspflege', '(1) Mit Freiheitsstrafe bis zu 20 Hafteinheiten wird bestraft, wer einem Amtsträger, einem Mitglied der Polizeibehörden oder der Staatsanwaltschaft, der zur Vollstreckung von Gesetzen, Rechtsverordnungen, Urteilen, Gerichtsbeschlüssen oder Verfügungen berufen ist, bei der Vornahme einer solchen Diensthandlung mit Gewalt oder durch Drohung mit Gewalt Widerstand leistet.

(2) Die Tat ist nicht nach dieser Vorschrift strafbar, wenn die Diensthandlung nicht rechtmäßig ist. Dies gilt auch dann, wenn der Täter irrtümlich annimmt, die Diensthandlung sei rechtmäßig.

(3) In besonders schweren Fällen ist die Strafe Freiheitsstrafe bis zu 25 Hafteinheiten. Ein besonders schwerer Fall liegt in der Regel vor, wenn der Täter bewaffneten Widerstand leistet.'),
  ('§ 67', 'Tätlicher Angriff auf Vollstreckungsbeamte', 'X. – Straftaten gegen die Staatsgewalt und Rechtspflege', '(1) Wer einen Vollstreckungsbeamten bei Ausübung seines Dienstes tätlich angreift, wird mit Freiheitsstrafe von 15 bis 25 Hafteinheiten bestraft.

(2) Als tätlicher Angriff gilt jede körperliche Gewaltanwendung, die geeignet ist, den Beamten an der Diensthandlung zu hindern oder ihn zu verletzen.

(3) Führt der tätliche Angriff zu schweren Verletzungen oder gefährdet er das Leben des Beamten, so erhöht sich die Strafe auf Freiheitsstrafe von 25 bis 35 Hafteinheiten.

(4) Der Versuch ist strafbar.'),
  ('§ 68', 'Amtsanmaßung', 'X. – Straftaten gegen die Staatsgewalt und Rechtspflege', '(1) Wer unbefugt ein öffentliches Amt ausübt, sich als Amtsträger ausgibt oder Handlungen vornimmt, die Amtsträgern vorbehalten sind, wird mit Freiheitsstrafe bis zu 20 Hafteinheiten oder mit Geldstrafe bestraft.

(2) Ebenso wird bestraft, wer sich mit der Ausübung einer durch andere Vorschriften geschützten Tätigkeit befasst.'),
  ('§ 69', 'Strafvereitelung', 'X. – Straftaten gegen die Staatsgewalt und Rechtspflege', '(1) Wer absichtlich oder wissentlich ganz oder zum Teil vereitelt, dass ein anderer dem Strafgesetz gemäß wegen einer rechtswidrigen Tat bestraft oder einer Maßnahme unterworfen wird, wird mit Freiheitsstrafe bis zu 20 Hafteinheiten oder mit Geldstrafe bestraft.

(2) Ebenso wird bestraft, wer absichtlich oder wissentlich die Vollstreckung einer gegen einen anderen verhängten Strafe oder Maßnahme ganz oder zum Teil vereitelt.

(3) Der Versuch ist strafbar.'),
  ('§ 70', 'Falsche uneidliche Aussage', 'X. – Straftaten gegen die Staatsgewalt und Rechtspflege', 'Wer als Zeuge oder Sachverständiger vor Gericht oder vor einer zur eidlichen Vernehmung befugten Stelle uneidlich falsch aussagt, wird mit Freiheitsstrafe von 5 bis 10 Hafteinheiten bestraft.'),
  ('§ 71', 'Meineid', 'X. – Straftaten gegen die Staatsgewalt und Rechtspflege', '(1) Wer vor einer zur Abnahme von Eiden befugten Stelle falsch schwört, wird mit Freiheitsstrafe nicht unter 10 Hafteinheiten bestraft.

(2) In minder schweren Fällen ist die Strafe Freiheitsstrafe von 5 bis 10 Hafteinheiten.'),
  ('§ 72', 'Falsche Verdächtigung', 'X. – Straftaten gegen die Staatsgewalt und Rechtspflege', '(1) Wer wissentlich eine falsche Verdächtigung äußert, wird mit Freiheitsstrafe bis zu 20 Hafteinheiten oder mit Geldstrafe bestraft.

(2) Mit Freiheitsstrafe von 20 bis 30 Hafteinheiten wird bestraft, wer die falsche Verdächtigung in der Absicht begeht, eine Strafmilderung für sich zu erlangen. In minder schweren Fällen ist die Strafe Freiheitsstrafe von 15 bis 25 Hafteinheiten.'),
  ('§ 73', 'Vortäuschen einer Straftat', 'X. – Straftaten gegen die Staatsgewalt und Rechtspflege', '(1) Wer wider besseres Wissen einer Behörde oder einer zur Entgegennahme von Anzeigen zuständigen Stelle vortäuscht,

1. dass eine rechtswidrige Tat begangen worden sei, oder
2. dass die Verwirklichung einer der in § 65 Absatz 1 genannten rechtswidrigen Taten bevorstehe,

wird mit Freiheitsstrafe bis zu 20 Hafteinheiten oder mit Geldstrafe bestraft, wenn die Tat nicht in § 72 oder § 69 mit Strafe bedroht ist.

(2) Ebenso wird bestraft, wer wider besseres Wissen eine der in Absatz 1 bezeichneten Stellen über den Beteiligten

1. an einer rechtswidrigen Tat oder
2. an einer bevorstehenden, in § 65 Absatz 1 genannten rechtswidrigen Tat

zu täuschen sucht.'),
  ('§ 74', 'Beweismittelfälschung', 'X. – Straftaten gegen die Staatsgewalt und Rechtspflege', '(1) Wer Beweismittel fälscht oder manipuliert, die Bestandteil eines Strafverfahrens sind oder mit einem solchen im Zusammenhang stehen, wird mit Freiheitsstrafe von 10 Hafteinheiten bestraft.

(2) Hat der Täter zum Zeitpunkt der Tat eine Anwaltslizenz, so erhöht sich die Strafe auf 20 Hafteinheiten; die Lizenz ist zu entziehen und eine Sperre zur Wiedererlangung von bis zu 30 Tagen wird verhängt.'),
  ('§ 75', 'Umgehung der Haftzeit', 'X. – Straftaten gegen die Staatsgewalt und Rechtspflege', '(1) Wer eine ihm auferlegte Haftzeit umgeht oder einem anderen Fluchthilfe leistet, wird mit Freiheitsstrafe bis zu 25 Hafteinheiten oder mit Geldstrafe bestraft.

(2) Der Versuch ist strafbar.'),
  ('§ 76', 'Besitz von polizeilichen Mitteln', 'X. – Straftaten gegen die Staatsgewalt und Rechtspflege', '(1) Besitz, Nutzung oder Handel mit exklusiven Polizeigegenständen wird mit Freiheitsstrafe bis zu 15 Hafteinheiten oder mit Geldstrafe bestraft.

(2) Polizeigegenstände im Sinne dieses Gesetzes beschreiben alle, welche als diese gekennzeichnet sind.

(3) Der Versuch ist strafbar.'),
  ('§ 77', 'Besitz von illegalen Gegenständen', 'X. – Straftaten gegen die Staatsgewalt und Rechtspflege', '(1) Besitz oder Handel mit verbotenen Gegenständen gemäß Anlage 1 wird mit Freiheitsstrafe bis zu 15 Hafteinheiten bestraft.

(2) Der Versuch ist strafbar.'),
  ('§ 78', 'Dokumentenfälschung', 'X. – Straftaten gegen die Staatsgewalt und Rechtspflege', '(1) Dokumente sind Urkunden, amtliche Schriftstücke, Beweisstücke, Zeugnisse sowie alle rechtlich relevanten Schriftstücke.

(2) Wer zur Täuschung im Rechtsverkehr ein unechtes Dokument herstellt, ein echtes verfälscht oder ein gefälschtes Dokument gebraucht, wird mit Freiheitsstrafe bis zu 25 Hafteinheiten oder mit Geldstrafe bis zu $75.000 bestraft.

(3) Der Versuch ist strafbar.

(4) In schweren oder wiederholten Fällen ist die Strafe Freiheitsstrafe bis zu 45 Hafteinheiten oder Geldstrafe bis zu $135.000.

(5) Nach den Absätzen 2 und 4 wird auch bestraft, wer wissentlich eine Urkunde über einen akademischen Titel ausstellt, obwohl die nach der Promotions- und Titelführungsordnung erforderliche wissenschaftliche Arbeit nicht erbracht wurde.'),
  ('§ 79', 'Vorteilsgewährung', 'XI. – Amtsdelikte und Korruption', '(1) Wer einem Amtsträger oder einem Dritten einen Vorteil anbietet, verspricht oder gewährt, um eine pflichtwidrige Handlung zu erreichen, wird mit Freiheitsstrafe bis zu 20 Hafteinheiten oder mit Geldstrafe bestraft.

(2) Wird einem Richter ein Vorteil angeboten, versprochen oder gewährt, um eine richterliche Handlung zu beeinflussen, so ist die Strafe Freiheitsstrafe bis zu 35 Hafteinheiten.'),
  ('§ 80', 'Vorteilsannahme', 'XI. – Amtsdelikte und Korruption', '(1) Ein Amtsträger, der für die Dienstausübung einen Vorteil für sich oder einen Dritten fordert, sich versprechen lässt oder annimmt, wird mit Freiheitsstrafe bis zu 35 Hafteinheiten oder mit Geldstrafe bestraft.

(2) Ein Richter oder Schiedsrichter, der einen Vorteil im Zusammenhang mit einer richterlichen Handlung fordert, sich versprechen lässt oder annimmt, wird ebenso bestraft. Der Versuch ist strafbar.

(3) Absatz 1 gilt nicht, wenn der Vorteil ohne vorherige Forderung gewährt wurde und

1. die Annahme zuvor von der zuständigen Behörde genehmigt wurde oder
2. der Täter die Behörde umgehend informiert und die Genehmigung nachträglich erteilt wird.'),
  ('§ 81', 'Missbrauch der Amtsgewalt', 'XI. – Amtsdelikte und Korruption', '(1) Ein Beamter, der mit dem Vorsatz, dadurch einen anderen an seinen Rechten zu schädigen, seine Befugnis zur Vornahme von Amtsgeschäften in Vollziehung der Gesetze wissentlich missbraucht, wird mit Freiheitsstrafe von 35 bis 50 Hafteinheiten bestraft.

(2) Ebenso wird bestraft, wer durch die Tat einen 30.000 Dollar übersteigenden Schaden herbeiführt.

(3) Ebenso wird bestraft, wer als Amtsträger entgegen der Promotions- und Titelführungsordnung einen akademischen Titel vergibt oder verleiht, obwohl die dafür erforderliche Urkunde nicht ausgestellt wurde.'),
  ('§ 82', 'Strafvereitelung im Amt', 'XI. – Amtsdelikte und Korruption', 'Wer eine Strafvereitelung (§ 69) als Amtsträger begeht, wird mit Freiheitsstrafe nicht unter 20 Hafteinheiten bestraft.'),
  ('§ 83', 'Rechtsbeugung', 'XI. – Amtsdelikte und Korruption', 'Ein Richter oder ein anderer Amtsträger, der sich bei der Leitung oder Entscheidung einer Rechtssache zugunsten oder zum Nachteil einer Partei einer Beugung des Rechts schuldig macht, wird mit Freiheitsstrafe nicht unter 45 Hafteinheiten bestraft.'),
  ('§ 84', 'Verbotene Mitteilungen über Gerichtsverhandlungen', 'XII. – Straftaten gegen den Staat und die Sicherheit', 'Wer öffentlich über nichtöffentliche Gerichtsverhandlungen oder vertrauliche amtliche Dokumente berichtet, wird mit Freiheitsstrafe bis zu 20 Hafteinheiten oder mit Geldstrafe bestraft.'),
  ('§ 85', 'Weitergabe geheimer Informationen', 'XII. – Straftaten gegen den Staat und die Sicherheit', 'Wer streng vertrauliche Informationen aus Sicherheits- oder Justizbehörden weitergibt, wird mit Freiheitsstrafe nicht unter 45 Hafteinheiten bestraft.'),
  ('§ 86', 'Verletzung von Sicherheitsfreigaben', 'XII. – Straftaten gegen den Staat und die Sicherheit', '(1) Wer vorsätzlich entgegen den Bestimmungen des § 24 Landesbeamtengesetz handelt und gegen die Schutzpflichten der Sicherheitsfreigaben 3 bis 5 verstößt, indem er Informationen dieser Sicherheitsstufen offenbart, zugänglich macht oder Sicherheitsmaßnahmen unterläuft, wird mit Freiheitsstrafe von 25 bis 45 Hafteinheiten bestraft.

(2) In besonders schweren Fällen, insbesondere wenn der Täter gewerbsmäßig, gegen Bezahlung oder in der Absicht handelt, die innere oder äußere Sicherheit des Staates erheblich zu beeinträchtigen, ist die Strafe Freiheitsstrafe von 45 bis 65 Hafteinheiten.'),
  ('§ 87', 'Hochverrat', 'XII. – Straftaten gegen den Staat und die Sicherheit', 'Wer es unternimmt, mit Gewalt oder durch Drohung mit Gewalt

1. den Bestand des Staates San Andreas zu beeinträchtigen oder
2. die auf der Verfassung des Staates San Andreas beruhende verfassungsmäßige Ordnung zu ändern,

wird mit Freiheitsstrafe nicht unter 35 Hafteinheiten bestraft.'),
  ('§ 88', 'Terrorstraftaten und Terrorstatus', 'XII. – Straftaten gegen den Staat und die Sicherheit', '(1) Eine Terrorstraftat liegt vor, wenn eine Handlung mit dem Ziel begangen wird, die Bevölkerung einzuschüchtern, staatliche Organe oder internationale Organisationen zu nötigen oder die politischen, verfassungsmäßigen, wirtschaftlichen oder sozialen Grundstrukturen erheblich zu destabilisieren oder zu zerstören.

(2) Als Terrorstraftaten gelten insbesondere

1. die Geiselnahme mit politischem oder ideologischem Ziel,
2. der Einsatz von Sprengstoff, Brand oder Waffen gegen zivile oder staatliche Einrichtungen oder Fahrzeuge,
3. Angriffe auf kritische Infrastruktur, die geeignet sind, erhebliche Personen- oder Sachschäden zu verursachen,
4. die Finanzierung, Unterstützung oder Bewerbung terroristischer Vereinigungen und
5. die Planung, Vorbereitung oder Anstiftung zu den in den Nummern 1 bis 4 genannten Handlungen.

(3) Gegen Personen, bei denen aufgrund von Tatsachen der begründete Verdacht besteht, dass sie eine Terrorstraftat begehen, vorbereitet haben oder maßgeblich daran beteiligt waren, kann der Terrorstatus verhängt werden. Zuständigkeit und Verfahren richten sich nach der Strafprozessordnung.

(4) Wer eine Terrorstraftat begeht, wird mit Freiheitsstrafe von mindestens 45 und bis zu 180 Hafteinheiten bestraft. In besonders schweren Fällen kann zusätzlich die Sicherungsverwahrung angeordnet werden.

(5) Versuch und Vorbereitung einer Terrorstraftat sind strafbar.'),
  ('§ 89', 'Unerlaubter Umgang mit Betäubungsmitteln', 'XIII. – Straftaten im Umgang mit Betäubungsmitteln und Waffen', '(1) Mit Freiheitsstrafe bis zu 20 Hafteinheiten oder mit Geldstrafe bis zu $250.000 wird bestraft, wer ohne die erforderliche Erlaubnis

1. Betäubungsmittel anbaut, herstellt, mit ihnen Handel treibt, sie einführt, ausführt, veräußert, abgibt oder sonst in den Verkehr bringt, erwirbt oder sich in sonstiger Weise verschafft oder
2. Betäubungsmittel besitzt.

(2) Betäubungsmittel im Sinne dieser Vorschrift sind die in § 1 in Verbindung mit Anlage 1 des Betäubungsmittelgesetzes bezeichneten Stoffe und Substanzen einschließlich der zu ihrer Herstellung benötigten Vorprodukte. Die erforderlichen Erlaubnisse richten sich nach § 2 des Betäubungsmittelgesetzes.

(3) Der Versuch ist strafbar.

(4) Handelt der Täter fahrlässig, so ist die Strafe milder als bei vorsätzlicher Begehung. Die Freiheitsstrafe darf 10 Hafteinheiten nicht überschreiten; eine Geldstrafe bleibt zulässig.

(5) Nicht nach dieser Vorschrift strafbar ist der Besitz von Cannabis zum Eigenkonsum innerhalb der Freimenge nach § 4 Absatz 1 und 2 des Betäubungsmittelgesetzes. Diese beträgt bis zu drei Konsumeinheiten in Form von Joints oder bis zu 15 Einheiten getrockneten Cannabis zur Herstellung derselben. Bei Überschreitung der Freimenge gilt Absatz 1; die über die Freimenge hinausgehenden Cannabiseinheiten sind sicherzustellen.

(6) Die medizinische Ausnahme nach § 5 des Betäubungsmittelgesetzes bleibt anwendbar. Erforderlich ist ein gültiges ärztliches Attest oder eine ärztliche Verordnung, das oder die auf Verlangen der Exekutivbehörden vorzulegen ist. Die mitgeführte Menge darf zehn Konsumeinheiten in Form von Joints oder 50 Einheiten getrockneten Cannabis nicht überschreiten.

(7) Die Polizeibehörden und die Staatsanwaltschaft sind nach Maßgabe des § 6 des Betäubungsmittelgesetzes ausgenommen, soweit dies zur Durchführung ihrer Arbeit zwingend erforderlich ist.'),
  ('§ 90', 'Cannabiskonsum in der Nähe staatlicher Behörden', 'XIII. – Straftaten im Umgang mit Betäubungsmitteln und Waffen', '(1) Wer entgegen § 4 Absatz 4 des Betäubungsmittelgesetzes Cannabis in unmittelbarer Nähe der Gebäude staatlicher Behörden zum Eigenkonsum konsumiert, wird mit Geldstrafe in Höhe von 15.000 Dollar bestraft.

(2) Die Ausnahmen nach den §§ 5 und 6 des Betäubungsmittelgesetzes bleiben anwendbar. Der erlaubte Besitz einer Freimenge allein befreit nicht vom Konsumverbot nach Absatz 1.'),
  ('§ 91', 'Unerlaubter Umgang mit Waffen und Waffenteilen', 'XIII. – Straftaten im Umgang mit Betäubungsmitteln und Waffen', '(1) Mit Freiheitsstrafe bis zu 20 Hafteinheiten wird bestraft, wer entgegen § 9 des Waffengesetzes

1. ohne die erforderliche Erlaubnis mit einer dort erlaubnispflichtigen Waffe umgeht,
2. mit einer dort verbotenen Waffe umgeht oder
3. mit wesentlichen Waffenteilen umgeht, die zur Herstellung von Waffen dienen.

(2) Der Begriff der Waffe und die Formen des Umgangs bestimmen sich nach § 2 des Waffengesetzes. Die Einordnung erlaubnisfähiger und verbotener Waffen richtet sich nach § 9 in Verbindung mit Anlage 1 des Waffengesetzes.

(3) Ein Erstverstoß kann anstelle einer Freiheitsstrafe mit Geldstrafe in Höhe von 60.000 Dollar geahndet werden.

(4) Die Ausnahmen und Berechtigungen nach § 6, § 8 Absatz 3 sowie den §§ 10 bis 13 des Waffengesetzes gelten im Umfang ihres jeweiligen Anwendungsbereichs fort. Hierzu gehören insbesondere die behördlichen Ausnahmen, die Berechtigung des San Andreas Medical Service zum Führen eines Tasers, beruflich erforderliche Hieb-, Stich- und Stoßwaffen sowie gültige Sonderwaffenscheine.'),
  ('§ 92', 'Schussbereites Führen einer Schusswaffe auf öffentlichem Grund', 'XIII. – Straftaten im Umgang mit Betäubungsmitteln und Waffen', '(1) Wer eine Schusswaffe auf öffentlichem Grund schussbereit führt, wird mit Freiheitsstrafe bis zu 20 Hafteinheiten bestraft. Eine Schusswaffe gilt im Sinne dieser Vorschrift nur dann als schussbereit, wenn sie gehalten wird.

(2) Die Ausnahmen nach § 6 des Waffengesetzes sowie die Berechtigungen zum Einsatz von Signalmitteln nach § 12 des Waffengesetzes bleiben anwendbar.'),
  ('§ 93', 'Gefährdende Schussabgabe im öffentlichen Raum', 'XIII. – Straftaten im Umgang mit Betäubungsmitteln und Waffen', '(1) Wer außerhalb dafür vorgesehener Räumlichkeiten oder Plätze eine Schusswaffe in einer Weise abfeuert, die eine Gefahr für den öffentlichen Raum darstellen kann, wird mit Freiheitsstrafe bis zu 20 Hafteinheiten bestraft.

(2) Die Ausnahmen nach § 6 des Waffengesetzes sowie die Berechtigungen zum Einsatz von Signalmitteln nach § 12 des Waffengesetzes bleiben anwendbar.'),
  ('§ 94', 'Verheimlichung registrierungspflichtigen Vermögens', 'XIV. – Straftaten im Wirtschafts- und Gewerbeverkehr', 'Wer ein privates Vermögen, das dem Staat gegenüber registrierungspflichtig ist, verheimlicht, um sich möglichen Sanktionen zu entziehen und sich eine unrechtmäßige Absicherung zu verschaffen, wird mit Freiheitsstrafe bis zu 10 Hafteinheiten bestraft.'),
  ('§ 95', 'Strafgeldhinterziehung', 'XIV. – Straftaten im Wirtschafts- und Gewerbeverkehr', '(1) Wer durch die exekutiven oder judikativen Behörden verhängte Strafgelder bewusst missachtet oder in der auferlegten Zahlungsfrist von 14 Tagen vorsätzlich nicht bezahlt, wird mit Geldstrafe in Höhe von 50.000 Dollar bestraft.

(2) Anstelle der Geldstrafe nach Absatz 1 kann je 3.000 Dollar offenen Strafgeldes eine Freiheitsstrafe von einer Hafteinheit verhängt werden, wenn

1. das Strafgeld nicht beglichen werden kann oder,
2. aufgrund mehrfach nicht bezahlter Strafgelder in der Vergangenheit davon auszugehen ist, dass auch dieses nicht gezahlt wird.

(3) Bei Ersatzhaft nach Absatz 2, müssen verfallene Strafgelder gelöscht werden.

(4) Die Freiheitsstrafe nach Absatz 2 beträgt mindestens 10 und höchstens 120 Hafteinheiten.

(5) Eine wegen desselben offenen Strafgeldbetrags nach § 94 Absatz 2 der Strafprozessordnung vollstreckte Ersatzfreiheitsstrafe ist auf die Freiheitsstrafe nach Absatz 2 anzurechnen; umgekehrt gilt dies entsprechend. Eine doppelte Vollstreckung von Haft wegen desselben offenen Betrags ist ausgeschlossen. § 2 bleibt unberührt.'),
  ('§ 96', 'Besitz von Schwarzgeld', 'XIV. – Straftaten im Wirtschafts- und Gewerbeverkehr', '(1) Wer Schwarzgeld besitzt, wird mit Freiheitsstrafe bis zu 15 Hafteinheiten bestraft.

(2) Schwarzgeld ist nach § 6 Absatz 1 des Wirtschaftsgesetzes Geld, das aus rechtswidrigen Handlungen stammt oder dem Staat gegenüber pflichtwidrig nicht offengelegt wurde.'),
  ('§ 97', 'Besitz von Phantomgeld', 'XIV. – Straftaten im Wirtschafts- und Gewerbeverkehr', '(1) Wer Phantomgeld besitzt, wird mit Freiheitsstrafe bis zu 15 Hafteinheiten bestraft.

(2) Phantomgeld ist nach § 6 Absatz 2 des Wirtschaftsgesetzes nachgemachtes oder unbefugt vervielfältigtes Geld, das den Anschein einer gültigen Währung erweckt, ohne von der zuständigen staatlichen Stelle ausgegeben worden zu sein.'),
  ('§ 98', 'Diebstahl von Schwarzgeld', 'XIV. – Straftaten im Wirtschafts- und Gewerbeverkehr', 'Wer bei oder kurz nach dem Diebstahl von Schwarzgeld nachweislich festgenommen wird, wird mit Freiheitsstrafe bis zu 15 Hafteinheiten bestraft. Der Begriff des Diebstahls richtet sich nach § 33 Absatz 1, der Begriff des Schwarzgeldes nach § 96 Absatz 2. Für denselben einfachen Diebstahl tritt diese Vorschrift an die Stelle des § 33 Absatz 1.'),
  ('§ 99', 'Diebstahl von Phantomgeld', 'XIV. – Straftaten im Wirtschafts- und Gewerbeverkehr', 'Wer beim oder kurz nach dem Diebstahl von Phantomgeld nachweislich festgenommen wird, wird mit Freiheitsstrafe bis zu 15 Hafteinheiten bestraft. Der Begriff des Diebstahls richtet sich nach § 33 Absatz 1, der Begriff des Phantomgeldes nach § 97 Absatz 2. Für denselben einfachen Diebstahl tritt diese Vorschrift an die Stelle des § 33 Absatz 1.'),
  ('§ 100', 'Handel mit illegalen Währungen', 'XIV. – Straftaten im Wirtschafts- und Gewerbeverkehr', '(1) Wer im Staat San Andreas einen Handel abschließt und dabei Schwarzgeld im Sinne des § 96 Absatz 2 verwendet, wird mit Freiheitsstrafe bis zu 15 Hafteinheiten bestraft.

(2) Wer im Staat San Andreas einen Handel abschließt und dabei Phantomgeld im Sinne des § 97 Absatz 2 verwendet, wird mit Freiheitsstrafe bis zu 15 Hafteinheiten bestraft.

(3) Der Versuch ist strafbar.'),
  ('§ 101', 'Geldwäsche', 'XIV. – Straftaten im Wirtschafts- und Gewerbeverkehr', '(1) Wer mit Schwarzgeld im Sinne des § 96 Absatz 2 durch den Gebrauch von Maschinen eine Nachbildung der gültigen Währung herstellt, wird mit Freiheitsstrafe bis zu 25 Hafteinheiten bestraft.

(2) Der Versuch ist strafbar.'),
  ('§ 102', 'Vertragsbruch', 'XIV. – Straftaten im Wirtschafts- und Gewerbeverkehr', 'Wer vorsätzlich gegen die Bedingungen eines Vertrages verstößt, der nach dem Gesetz zulässig ist und von allen Parteien eines Handels akzeptiert wurde, wird mit Freiheitsstrafe bis zu 20 Hafteinheiten bestraft. Die Wirksamkeit des Vertrages und die zivilrechtlichen Ansprüche richten sich nach dem Bürgerlichen Gesetzbuch und dem Wirtschaftsgesetz.'),
  ('§ 103', 'Schwerer oder wiederholter unerlaubter Umgang mit Rohstoffen', 'XIV. – Straftaten im Wirtschafts- und Gewerbeverkehr', '(1) Wer in einem schweren oder wiederholten Fall entgegen den §§ 13 und 14 der Gewerbeordnung ohne die erforderliche gültige Rohstofflizenz außerhalb der erlaubten Freimenge mit Rohstoffen umgeht, kann mit Geldstrafe bis zu $250.000 oder Freiheitsstrafe bis zu 20 Hafteinheiten bestraft werden.

(2) Der erlaubnispflichtige Umgang umfasst den gewerblichen Abbau, Transport, Handel und die Verarbeitung von Rohstoffen. Eine gültige Rohstofflizenz gestattet den unbegrenzten Umgang mit legalen Rohstoffen im Umfang des § 13 Absatz 3 der Gewerbeordnung.

(3) Ohne Rohstofflizenz beträgt die täglich höchstens förderbare Freimenge 200 Kilogramm pro Person je Rohstoffart. Die Ausnahmen für Weintrauben, Wein, Meeresfrüchte und deren Verarbeitungsprodukte nach § 14 Absatz 2 der Gewerbeordnung bleiben anwendbar.

(4) Rohstoffe außerhalb der erlaubten Freimenge dürfen nach Maßgabe des § 18 Absatz 1 Satz 2 der Gewerbeordnung beschlagnahmt und eingezogen werden. Eine zusätzliche Geldbuße nach § 18 Absatz 1 Satz 1 der Gewerbeordnung für dieselbe nach Absatz 1 strafrechtlich geahndete Tat wird nicht verhängt.'),
  ('§ 103a', 'Unerlaubte Durchführung einer Veranstaltung', 'XIV. – Straftaten im Wirtschafts- und Gewerbeverkehr', 'Wer als Veranstalter eine gesetzlich genehmigungspflichtige Veranstaltung ohne die erforderliche gültige Veranstaltungslizenz nach § 7a der Gewerbeordnung durchführt, wird mit Freiheitsstrafe bis zu 20 Hafteinheiten oder mit Geldstrafe bestraft.'),
  ('§ 104', 'Überfliegen einer Flugverbotszone', 'XV. – Weitere Straftaten im Luftverkehr', '(1) Wer eine Flugverbotszone entgegen § 2 Absatz 1 der Luftfahrtverordnung überfliegt, wird mit Freiheitsstrafe von 5 bis 15 Hafteinheiten bestraft.

(2) Dauerhafte Flugverbotszonen bestehen nach § 2 Absatz 2 und 3 der Luftfahrtverordnung über den Fraktionsgebäuden des Los Santos Police Department, der Staatsanwaltschaft, des San Andreas Medical Service, des National Office of Security Enforcement sowie über militärischen Einrichtungen. Sie umfassen die Grundstücksfläche und einen zusätzlichen Radius von 500 Metern.

(3) Eine durch das Los Santos Police Department, das National Office of Security Enforcement, die Staatsanwaltschaft oder die National Guard ausgerufene Sperrzone begründet für ihre Dauer eine temporäre Flugverbotszone über dem gesamten Sperrzonengebiet.

(4) Die Ausnahmen nach § 6 der Luftfahrtverordnung gelten für die §§ 104 bis 108 dieses Gesetzes. Ausgenommen sind Flugobjekte des Los Santos Police Department, des San Andreas Medical Service, der Staatsanwaltschaft, des National Office of Security Enforcement, der National Guard und des Parlaments sowie andere Flugobjekte, die im Namen dieser Behörden, im Rahmen ihrer hoheitlichen Aufgaben genutzt werden.

(5) Soweit derselbe Überflug zugleich gegen die §§ 61 bis 64 verstößt, richtet sich die Berücksichtigung der Tat nach § 3. Die bloße Aufnahme derselben Handlung in mehrere Vorschriften begründet keine mehrfache Bestrafung nach § 2.'),
  ('§ 105', 'Unterschreitung der Mindestflughöhe', 'XV. – Weitere Straftaten im Luftverkehr', '(1) Wer mit einem Flugzeug die vorgeschriebene Mindestflughöhe von 2.000 Metern oder mit einem Helikopter die vorgeschriebene Mindestflughöhe von 500 Metern unterschreitet, wird mit Freiheitsstrafe von 5 bis 20 Hafteinheiten bestraft.

(2) Die Ausnahme für Start und Landung nach § 3 Absatz 2 der Luftfahrtverordnung bleibt anwendbar. Der Landeanflug darf erst 1.000 Meter vor der Landebahn eingeleitet werden.

(3) § 104 Absatz 4 gilt entsprechend.'),
  ('§ 106', 'Unzulässige Landung', 'XV. – Weitere Straftaten im Luftverkehr', '(1) Mit Geldstrafe bis zu 15.000 Dollar kann bestraft werden, wer entgegen § 3 Absatz 4 oder 5 der Luftfahrtverordnung

1. einen Helikopter außerhalb eines dafür ausgewiesenen Helikopterlandeplatzes landet oder
2. auf einer Straße oder einer ungekennzeichneten Landestrecke oder Landefläche landet.

(2) § 104 Absatz 4 gilt entsprechend.'),
  ('§ 107', 'Verletzung der Flugfunkpflichten', 'XV. – Weitere Straftaten im Luftverkehr', '(1) Mit Geldstrafe bis zu 5.000 Dollar kann bestraft werden, wer entgegen § 4 der Luftfahrtverordnung

1. vor dem Betreten des Luftraums mit einem Flugobjekt die Anmeldung im staatlichen Flugfunk 555 unter Nennung der Kennungsnummer unterlässt,
2. einen Start- oder Landeanflug nicht im Flugfunk durchgibt,
3. als Führer des Flugobjekts nicht sicherstellt, dass er selbst oder eine andere Person der Flugbesatzung während des gesamten Aufenthalts im Luftraum sowie unmittelbar vor dem Start und nach der Landung über den Flugfunk erreichbar ist, oder
4. einer über den Flugfunk erteilten rechtmäßigen Anweisung einer staatlichen Einrichtung nicht folgt oder deren Fragen nicht beantwortet.

(2) § 104 Absatz 4 gilt entsprechend.'),
  ('§ 108', 'Fehlender Fallschirm an Bord', 'XV. – Weitere Straftaten im Luftverkehr', '(1) Wer sich mit einem Flugobjekt im Luftraum bewegt und entgegen § 5 Absatz 1 der Luftfahrtverordnung keinen Fallschirm für sich an Bord mitführt, kann mit Geldstrafe bis zu 12.500 Dollar bestraft werden.

(2) § 104 Absatz 4 gilt entsprechend.'),
  ('§ 109', 'Unberechtigtes Führen eines akademischen Titels', 'XVI. – Weitere Straftaten gegen die Rechtspflege und geschützte Titel', '(1) Wer einen akademischen Titel im Sinne der Promotions- und Titelführungsordnung trägt, ohne dazu berechtigt zu sein, wird mit Freiheitsstrafe bis zu 10 Hafteinheiten oder mit Geldstrafe in Höhe von 100.000 Dollar bestraft.

(2) Die Berechtigung zum Führen des Titels richtet sich nach der Promotions- und Titelführungsordnung. Für das bloße unberechtigte Führen des Titels geht diese Vorschrift § 68 Absatz 2 vor.'),
  ('§ 110', 'Zusammenführung der Strafvorschriften', 'XVII. – Verhältnis zu den übrigen Gesetzen', '(1) Für die nachfolgend bezeichneten Handlungen treten die Strafvorschriften dieses Gesetzes an die Stelle der entsprechenden Strafvorschriften der Fachgesetze:

1. §§ 89 und 90 an die Stelle von § 3 und § 4 Absatz 5 des Betäubungsmittelgesetzes,
2. §§ 91 bis 93 an die Stelle von § 14 des Waffengesetzes,
3. §§ 94 bis 102 an die Stelle der §§ 10 bis 18 des Wirtschaftsgesetzes,
4. § 103 an die Stelle von § 18 Absatz 2 der Gewerbeordnung,
5. §§ 104 bis 108 an die Stelle von § 2 Absatz 5, § 3 Absatz 6, § 4 Absatz 4 und § 5 Absatz 2 der Luftfahrtverordnung und,
6. § 78 Absatz 5, § 81 Absatz 3 und § 109 an die Stelle von § 15 Absatz 2 bis 4 der Promotions- und Titelführungsordnung.

(2) Verweisungen in den Fachgesetzen auf die in Absatz 1 bezeichneten Strafvorschriften beziehen sich auf die dort jeweils zugeordnete Vorschrift dieses Gesetzes. Eine zusätzliche Bestrafung aufgrund der ersetzten Strafvorschrift findet nicht statt. Im Übrigen gelten die §§ 2 und 3.

(3) Begriffsbestimmungen, Erlaubnisse, Freimengen, Ausnahmen und sonstige sachliche Voraussetzungen der Fachgesetze bleiben anwendbar, soweit dieses Gesetz nichts Abweichendes bestimmt. Die allgemeinen Vorschriften dieses Gesetzes über Vorsatz, Fahrlässigkeit, Versuch, Täterschaft, Teilnahme und Rechtfertigung gelten auch für die übernommenen Straftaten.

(4) Reine Ordnungswidrigkeiten, Ordnungsgelder, Disziplinarmaßnahmen, Gebühren, zivilrechtliche Ansprüche und verfahrensrechtliche Zwangsmittel werden durch die Zusammenführung nicht zu Straftaten. Ihre gesetzlichen Grundlagen bleiben bestehen.'),
  ('Anlage 1', 'Verbotene Gegenstände', 'Anlagen', '• Jailbreak-Handy (Manipulierte Geräte)
• Sprengladung (Explosive Stoffe)
• Fußfesseln (Überwachungsgeräte)')
) as v(nummer, titel, abschnitt, text) where lower(g.kuerzel) = lower('StGB');

-- ---------- StPO – Strafprozessordnung (115 Einträge) ----------
insert into public.gesetzbuecher (kuerzel, titel, beschreibung, farbe, sortierung)
select 'StPO', 'Strafprozessordnung', 'Ermittlungsverfahren, Beweismittel, Festnahme und Untersuchungshaft, Anklage, Hauptverhandlung, Rechtsmittel, Vollstreckung und Verjährung.', 'schwarz', 15
where not exists (select 1 from public.gesetzbuecher where lower(kuerzel) = lower('StPO'));
update public.gesetzbuecher set titel = 'Strafprozessordnung', beschreibung = 'Ermittlungsverfahren, Beweismittel, Festnahme und Untersuchungshaft, Anklage, Hauptverhandlung, Rechtsmittel, Vollstreckung und Verjährung.'
  where lower(kuerzel) = lower('StPO');
delete from public.paragraphen where gesetzbuch_id = (select id from public.gesetzbuecher where lower(kuerzel) = lower('StPO'));
insert into public.paragraphen (gesetzbuch_id, nummer, titel, abschnitt, text)
select g.id, v.nummer, v.titel, v.abschnitt, v.text from public.gesetzbuecher g, (values
  ('§ 1', 'Anwendungsbereich und Zweck', 'Abschnitt 1 – Allgemeine Vorschriften', '(1) Diese Verordnung regelt das Verfahren zur Verfolgung von Straftaten im Staat San Andreas, von der Ermittlung bis zur Vollstreckung.

(2) Das Verfahren dient der Erforschung der Wahrheit, der Durchsetzung des staatlichen Strafanspruchs und der Wahrung der Rechte des Beschuldigten in gleichem Maße.'),
  ('§ 2', 'Verhältnis zu anderen Gesetzen', 'Abschnitt 1 – Allgemeine Vorschriften', '(1) Maßnahmen, die der Verfolgung einer Straftat oder der Sicherung von Beweisen dienen, richten sich ausschließlich nach dieser Verordnung.

(2) Maßnahmen, die allein der Abwehr einer gegenwärtigen oder drohenden Gefahr dienen, richten sich nach dem Polizeigesetz. Wird eine polizeiliche Maßnahme der Gefahrenabwehr zum Zweck der Strafverfolgung fortgeführt, gelten ab diesem Zeitpunkt die Vorschriften dieser Verordnung.

(3) Bei Zweifeln über die Anwendbarkeit ist auf den überwiegenden Zweck der Maßnahme abzustellen.

(4) Das Gericht kann auf Antrag einer Polizeibehörde die in Abschnitt 16 geregelten befristeten Anordnungen treffen; diese richten sich nach dieser Verordnung.'),
  ('§ 3', 'Stellung der Staatsanwaltschaft', 'Abschnitt 1 – Allgemeine Vorschriften', '(1) Die Staatsanwaltschaft ist Herrin des Ermittlungsverfahrens. Sie leitet die Ermittlungen und entscheidet über deren Fortführung und Beendigung.

(2) Die Staatsanwaltschaft ordnet die ihr nach dieser Verordnung zugewiesenen Maßnahmen aus eigener Befugnis an. Ihre Befugnis besteht unabhängig davon, ob ein Gericht erreichbar oder anwesend ist, soweit die Maßnahme nicht nach § 4 einem Richter vorbehalten ist.

(3) Zur Erforschung des Sachverhalts ist die Staatsanwaltschaft befugt, von allen Behörden Auskunft zu verlangen und Ermittlungen jeder Art entweder selbst vorzunehmen oder durch die Behörden und Beamten des Polizeidienstes vornehmen zu lassen, soweit nicht andere gesetzliche Vorschriften ihre Befugnisse besonders regeln. Die Behörden und Beamten des Polizeidienstes sind verpflichtet, dem Ersuchen oder Auftrag der Staatsanwaltschaft zu genügen, und in diesem Fall befugt, von allen Behörden Auskunft zu verlangen.'),
  ('§ 4', 'Anordnungsbefugnisse und Richtervorbehalt', 'Abschnitt 1 – Allgemeine Vorschriften', '(1) Dem Gericht vorbehalten, bei Gefahr im Verzug auch durch die Staatsanwaltschaft anzuordnen, sind:

1. die Durchsuchung von Wohnungen,
2. die Durchsuchung von Fahrzeugen und sonstigen Räumen sowie von abgelegten Sachen,
3. die Beschlagnahme von Gegenständen,
4. die Überwachung des Inhalts der Telekommunikation,
5. die längerfristige Observation (§ 17),
6. der Einsatz eines verdeckten Ermittlers gegen eine bestimmte Person oder zum Betreten einer nicht allgemein zugänglichen Wohnung (§ 18),
7. die Einrichtung von Kontrollstellen (§ 19),
8. die Zulässigkeit und Fortdauer von Freiheitsentziehungen.

(2) Die Staatsanwaltschaft und ihre Ermittlungspersonen sind aus eigener Befugnis, ohne dass es einer richterlichen Anordnung bedarf, zuständig für:

1. die Feststellung der Identität und erkennungsdienstliche Maßnahmen,
2. die Durchsuchung von Personen und am Körper geführten Sachen (§ 14),
3. die vorläufige Festnahme (§ 40),
4. die Sicherstellung von Gegenständen, deren Besitz verboten ist oder die freiwillig herausgegeben werden (§ 13),
5. das Herstellen von Bildaufnahmen außerhalb von Wohnraum (§ 15),
6. die Ermittlung des Standorts eines mobilen Endgeräts (§ 16),
7. die Ausschreibung zur Festnahme oder Aufenthaltsermittlung auf Grundlage eines bestehenden Haft- oder Strafbefehls (§ 47).

(3) Ordnet die Staatsanwaltschaft eine Maßnahme nach Absatz 1 bei Gefahr im Verzug an, so bedarf es der gerichtlichen Bestätigung nur, wenn der Beschuldigte die Tat nicht gesteht. Das Geständnis lässt die Bestätigungspflicht auch bei späterem Widerruf entfallen; in diesem Fall ist die Bestätigung unverzüglich nachzuholen. Wird die Bestätigung verweigert, ist die Maßnahme zu beenden; bereits erlangte Erkenntnisse dürfen nicht verwertet werden.'),
  ('§ 5', 'Gefahr im Verzug', 'Abschnitt 1 – Allgemeine Vorschriften', 'Gefahr im Verzug liegt vor, wenn der mit der Einholung einer richterlichen Entscheidung verbundene Zeitverlust den Erfolg der Maßnahme gefährden würde, insbesondere durch drohenden Verlust von Beweismitteln oder die Flucht des Beschuldigten.'),
  ('§ 6', 'Verhältnismäßigkeit', 'Abschnitt 1 – Allgemeine Vorschriften', '(1) Von mehreren geeigneten Maßnahmen ist diejenige zu wählen, die den Betroffenen am wenigsten beeinträchtigt.

(2) Eine Maßnahme ist nur zulässig, solange ihr Zweck es erfordert, und unverzüglich zu beenden, sobald ihr Zweck erreicht ist oder nicht mehr erreicht werden kann.

(3) Eine Maßnahme darf nicht außer Verhältnis zur Bedeutung der Sache und zur zu erwartenden Strafe stehen.'),
  ('§ 7', 'Begriffsbestimmungen', 'Abschnitt 1 – Allgemeine Vorschriften', 'Im Sinne dieser Verordnung ist oder sind

1. Beschuldigter: die Person, gegen die ein Ermittlungsverfahren geführt wird;
2. Angeklagter: der Beschuldigte, gegen den die Eröffnung des Hauptverfahrens beschlossen ist;
3. Polizeibehörden: alle Strafverfolgungsbehörden, die Militärpolizei sowie die besonders ernannten Ermittlungspersonen der Staatsanwaltschaft;
4. Straftat von erheblicher Bedeutung: jedes Verbrechen im Sinne des § 5 Strafgesetzbuch sowie jede Straftat, die den unerlaubten Umgang mit Betäubungsmitteln oder Waffen, den Staatsschutz oder die nationale Sicherheit, Leib, Leben oder die persönliche Freiheit eines Menschen oder das gewerbs-, gewohnheits- oder bandenmäßige oder in sonstiger Weise organisierte Begehen von Straftaten betrifft;
5. öffentlicher Raum: jede nicht umfriedete Fläche, die dem öffentlichen Gebrauch dient, sowie Flächen und Räumlichkeiten in Privatbesitz, die der Öffentlichkeit gewollt zugänglich gemacht werden.'),
  ('§ 8', 'Missachtung des Gerichts', 'Abschnitt 2 – Das Gericht', 'Das Gericht und dessen Sitzungspolizei ist befugt, die Missachtung der Autorität des Gerichts nach eigenem Ermessen mit Geld- oder Freiheitsstrafe oder beidem zu ahnden, wenn

• Fehlverhalten, einer Person in seiner Gegenwart oder einer außenstehenden Person, die die rechtspflege behindert,
• Fehlverhalten eines Bediensteten in Ausübung seiner Amtstätigkeit vor bei Gericht oder
• Ungehorsam oder Widerstand gegen ein rechtmäßiges Schriftstück, einen Prozess, einen Befehl oder eine Anordnung
• vorliegt.'),
  ('§ 9', 'Ausschließung des Richters', 'Abschnitt 2 – Das Gericht', '(1) Ein Richter ist von der Ausübung seines Amtes kraft Gesetzes ausgeschlossen, wenn er

1. selbst durch die Straftat verletzt ist,
2. Ehegatte, Lebenspartner, Vormund oder Betreuer des Beschuldigten oder des Verletzten ist oder war,
3. mit dem Beschuldigten oder dem Verletzten in gerader Linie verwandt oder verschwägert oder in der Seitenlinie bis zum dritten Grad verwandt oder bis zum zweiten Grad verschwägert ist oder war,
4. in der Sache als Zeuge oder Sachverständiger vernommen worden ist.

(2) Der Verwandtschafts- und Schwägerschaftsgrad bestimmt sich nach dem Bürgerlichen Gesetzbuch.'),
  ('§ 10', 'Rechtliches Gehör', 'Abschnitt 2 – Das Gericht', '(1) Eine Entscheidung, die in der Hauptverhandlung ergeht, wird nach Anhörung der Beteiligten erlassen.

(2) Eine Entscheidung außerhalb der Hauptverhandlung wird nach Erklärung der Staatsanwaltschaft erlassen. Ein anderer Beteiligter ist zu hören, bevor zu seinem Nachteil Tatsachen oder Beweisergebnisse verwertet werden, zu denen er noch nicht gehört wurde.

(3) Absatz 2 Satz 2 gilt nicht bei der Anordnung der Untersuchungshaft, der Beschlagnahme oder anderer Maßnahmen, wenn die vorherige Anhörung deren Zweck gefährden würde.'),
  ('§ 11', 'Bekanntmachung von Entscheidungen', 'Abschnitt 2 – Das Gericht', '(1) Entscheidungen, die in Anwesenheit des Betroffenen ergehen, werden durch Verkündung bekanntgemacht; andere durch Zustellung.

(2) Wird durch die Bekanntmachung eine Frist in Lauf gesetzt oder kann die Entscheidung mit einem befristeten Rechtsmittel angefochten werden, ist der Betroffene über Form und Frist der Anfechtung zu belehren.

(3) Einer nicht auf freiem Fuß befindlichen Person ist das zugestellte Schriftstück auf Verlangen vorzulesen.'),
  ('§ 12', 'Elektronische Aktenführung', 'Abschnitt 2 – Das Gericht', '(1) Die Akten können elektronisch geführt werden.

(2) Eine elektronisch geführte Akte ist auch dann beweiskräftig, wenn ihr Inhalt stichpunktartig aufgeführt ist. Tathergang und Beweismittel müssen nachvollziehbar, müssen jedoch nicht begründet sein.

(3) Angewandte Zwangsmittel sind nur zu protokollieren, soweit dies dem Tathergang dienlich ist; einer Begründung bedarf es nicht.'),
  ('§ 13', 'Sicherstellung und Beschlagnahme', 'Abschnitt 3 – Ermittlungsmaßnahmen und Beweismittel', '(1) Gegenstände, die als Beweismittel von Bedeutung sein können oder der Einziehung unterliegen, sind sicherzustellen.

(2) Werden sie nicht freiwillig herausgegeben, bedarf es der Beschlagnahme. Diese ordnet das Gericht an, bei Gefahr im Verzug die Staatsanwaltschaft und ihre Ermittlungspersonen.

(3) Wer einen solchen Gegenstand in Gewahrsam hat, ist verpflichtet, ihn auf Verlangen vorzulegen und herauszugeben. Kommt er dem nicht nach, so können gegen ihn ein Ordnungsgeld und zur Erzwingung der Herausgabe Zwangsmittel festgesetzt werden; die Anordnung von Haft bleibt dem Gericht vorbehalten und darf die Beendigung des Verfahrens nicht überdauern.

(4) Die Vorlage amtlich verwahrter Schriftstücke darf nicht gefordert werden, wenn deren oberste Dienstbehörde erklärt, dass ihr Bekanntwerden dem Wohl des Staates San Andreas Nachteile bereiten würde. Die Staatsanwaltschaft kann die Sperre dem San Andreas Supreme Court zur Überprüfung vorlegen; dieser entscheidet unanfechtbar, ob die Sperrerklärung aufrechterhalten bleibt.

(5) Werden bei einer Durchsuchung Gegenstände gefunden, die auf eine andere Straftat hindeuten, sind sie einstweilen sicherzustellen; die Staatsanwaltschaft ist hiervon in Kenntnis zu setzen.'),
  ('§ 14', 'Durchsuchung', 'Abschnitt 3 – Ermittlungsmaßnahmen und Beweismittel', '(1) Bei einem Beschuldigten ist die Durchsuchung seiner Person, seiner Räume, seines Fahrzeugs und der ihm gehörenden Sachen zulässig, wenn sie seiner Ergreifung dient oder zu vermuten ist, dass sie zur Auffindung von Beweismitteln führt.

(2) Bei anderen Personen ist die Durchsuchung nur zur Ergreifung des Beschuldigten, zur Verfolgung von Spuren oder zur Beschlagnahme bestimmter Gegenstände und nur dann zulässig, wenn Tatsachen den Schluss rechtfertigen, dass sich die gesuchte Person, Spur oder Sache in den zu durchsuchenden Räumen befindet.

(3) Die Durchsuchung von Wohnungen, sonstigen Räumen, Fahrzeugen und abgelegten Sachen ordnet das Gericht an, bei Gefahr im Verzug die Staatsanwaltschaft und ihre Ermittlungspersonen. Die Durchsuchung einer Person und der von ihr am Körper geführten Sachen bedarf keiner richterlichen Anordnung.

(4) Dem Betroffenen ist auf Verlangen nach Beendigung eine schriftliche Mitteilung über Grund und Ergebnis der Durchsuchung auszustellen.'),
  ('§ 15', 'Bildaufnahmen und technische Observationsmittel außerhalb von Wohnraum', 'Abschnitt 3 – Ermittlungsmaßnahmen und Beweismittel', '(1) Außerhalb von Wohnungen dürfen ohne Wissen der betroffenen Person Bildaufnahmen hergestellt und sonstige für Observationszwecke bestimmte technische Mittel eingesetzt werden, wenn die Erforschung des Sachverhalts oder die Ermittlung des Aufenthaltsorts eines Beschuldigten auf andere Weise weniger erfolgversprechend oder erschwert wäre.

(2) Der Einsatz technischer Mittel nach Absatz 1 ist nur bei einer Straftat von erheblicher Bedeutung zulässig.

(3) Die Maßnahme darf sich gegen andere Personen als den Beschuldigten nur richten, wenn anzunehmen ist, dass sie mit ihm in Verbindung stehen und die Maßnahme sonst aussichtslos wäre. Dritte dürfen unvermeidbar mitbetroffen werden.'),
  ('§ 16', 'Standortermittlung mobiler Endgeräte', 'Abschnitt 3 – Ermittlungsmaßnahmen und Beweismittel', 'Begründen bestimmte Tatsachen den Verdacht, dass jemand eine Straftat von erheblicher Bedeutung begangen hat, so darf der Standort seines mobilen Endgeräts durch technische Mittel ermittelt werden, soweit dies für die Erforschung des Sachverhalts oder die Ermittlung seines Aufenthaltsorts erforderlich ist. Daten Dritter dürfen dabei nur erhoben werden, soweit dies technisch unvermeidbar ist.'),
  ('§ 17', 'Längerfristige Observation', 'Abschnitt 3 – Ermittlungsmaßnahmen und Beweismittel', '(1) Liegen zureichende tatsächliche Anhaltspunkte dafür vor, dass eine Straftat von erheblicher Bedeutung begangen worden ist, so darf eine planmäßige Beobachtung des Beschuldigten angeordnet werden, die durchgehend länger als zwölf Stunden dauern oder an mehr als zwei Tagen stattfinden soll.

(2) Die Maßnahme darf nur angeordnet werden, wenn die Ermittlung auf andere Weise erheblich weniger erfolgversprechend oder wesentlich erschwert wäre. Gegen andere Personen ist sie unter den Voraussetzungen des § 15 Abs. 3 zulässig.

(3) Die Anordnung trifft das Gericht, bei Gefahr im Verzug die Staatsanwaltschaft und ihre Ermittlungspersonen.'),
  ('§ 18', 'Verdeckter Ermittler', 'Abschnitt 3 – Ermittlungsmaßnahmen und Beweismittel', '(1) Verdeckte Ermittler sind Beamte des Polizeidienstes, die unter einer ihnen verliehenen, auf Dauer angelegten veränderten Identität (Legende) ermitteln. Sie dürfen unter der Legende am Rechtsverkehr teilnehmen und, soweit für die Legende unerlässlich, entsprechende Urkunden herstellen und gebrauchen.

(2) Ihr Einsatz ist zulässig zur Aufklärung einer Straftat von erheblicher Bedeutung, wenn die Aufklärung auf andere Weise aussichtslos oder wesentlich erschwert wäre.

(3) Der Einsatz bedarf der Zustimmung der Staatsanwaltschaft. Richtet er sich gegen eine bestimmte Person oder ist mit dem Betreten einer nicht allgemein zugänglichen Wohnung verbunden, bedarf er der Zustimmung des Gerichts, bei Gefahr im Verzug der Staatsanwaltschaft.

(4) Ein verdeckter Ermittler darf eine Wohnung mit Einverständnis des Berechtigten betreten; das Einverständnis darf nicht durch ein über die Nutzung der Legende hinausgehendes Vortäuschen eines Zutrittsrechts herbeigeführt werden.

(5) Die Identität des verdeckten Ermittlers kann auch nach Beendigung des Einsatzes geheim gehalten werden.'),
  ('§ 19', 'Kontrollstellen und Großkontrollen', 'Abschnitt 3 – Ermittlungsmaßnahmen und Beweismittel', 'Kontrollstellen und Großkontrollen dienen der Ergreifung von Tätern und der Sicherstellung von Beweismitteln. Ihre Voraussetzungen, ihre Anordnung und ihre Befristung richten sich nach Abschnitt 16.'),
  ('§ 20', 'Sicherung der Einziehung', 'Abschnitt 3 – Ermittlungsmaßnahmen und Beweismittel', 'Ist die Annahme begründet, dass ein Gegenstand der Einziehung unterliegt, so kann er zur Sicherung der Vollstreckung beschlagnahmt werden. § 13 gilt entsprechend.'),
  ('§ 21', 'Zeugenpflicht', 'Abschnitt 4 – Zeugen und Sachverständige', '(1) Zeugen sind verpflichtet, zu dem zu ihrer Vernehmung bestimmten Termin zu erscheinen und zur Sache auszusagen, wenn keine gesetzliche Ausnahme vorliegt.

(2) Zur Ladung von Zeugen berechtigt sind das Gericht, die Staatsanwaltschaft sowie deren Ermittlungspersonen, wenn der Ladung ein Auftrag der Staatsanwaltschaft zugrunde liegt.

(3) Die eidliche Vernehmung bleibt dem Gericht vorbehalten.'),
  ('§ 22', 'Zeugnis- und Auskunftsverweigerungsrecht', 'Abschnitt 4 – Zeugen und Sachverständige', '(1) Ein Zeuge kann die Auskunft auf Fragen verweigern, deren Beantwortung ihn selbst oder einen Angehörigen der Gefahr aussetzen würde, wegen einer Straftat verfolgt zu werden.

(2) Zur Verweigerung des gesamten Zeugnisses berechtigt sind der Verlobte und der Ehegatte des Beschuldigten.

(3) Der Zeuge ist vor der Vernehmung über sein Verweigerungsrecht zu belehren. Er kann den Verzicht auf dieses Recht jederzeit widerrufen.'),
  ('§ 23', 'Belehrung und Wahrheitspflicht', 'Abschnitt 4 – Zeugen und Sachverständige', 'Vor der Vernehmung wird der Zeuge zur Wahrheit ermahnt und über die strafrechtlichen Folgen einer falschen Aussage belehrt. Auf die Möglichkeit der Vereidigung wird er hingewiesen.'),
  ('§ 24', 'Vernehmung', 'Abschnitt 4 – Zeugen und Sachverständige', '(1) Die Zeugen werden einzeln und in Abwesenheit der später zu hörenden Zeugen vernommen.

(2) Hat ein Zeuge die Aussage eines zuvor vernommenen Zeugen mitangehört, so entscheidet das Gericht nach Würdigung des Einzelfalls über seine Zulassung.

(3) Der Zeuge wird zunächst zu seiner Person, sodann zur Sache vernommen. Er ist zu veranlassen, sein Wissen im Zusammenhang anzugeben.

(4) Die Vernehmung kann in Bild und Ton aufgezeichnet werden. Die Aufzeichnung ist nur für Zwecke der Strafverfolgung zu verwenden.'),
  ('§ 25', 'Zeugenschutz', 'Abschnitt 4 – Zeugen und Sachverständige', '(1) Besteht begründeter Anlass zur Besorgnis, dass durch die Offenbarung der Identität oder des Aufenthaltsorts eines Zeugen Leben, Leib oder Freiheit einer Person gefährdet wird, so kann ihm gestattet werden, keine oder nur Angaben über eine frühere Identität zu machen.

(2) Unter den Voraussetzungen des Absatzes 1 darf der Zeuge sein Gesicht ganz oder teilweise verhüllen; auf diese Befugnis ist er vor der Hauptverhandlung hinzuweisen.

(3) Die Absätze 1 und 2 gelten auch nach Abschluss der Vernehmung. Bei Auskünften aus und Einsicht in Akten ist sicherzustellen, dass geschützte Daten nicht bekannt werden.'),
  ('§ 26', 'Schriftliche Zeugenaussage', 'Abschnitt 4 – Zeugen und Sachverständige', '(1) Liegt eine schriftliche Zeugenaussage vor, kann das Gericht den geladenen Zeugen auf Antrag von der Pflicht zum persönlichen Erscheinen in der Hauptverhandlung entbinden.

(2) Die Gegenpartei kann beim Gericht einen begründeten Antrag auf persönliche Ladung des Zeugen stellen, sofern sie darlegt, dass dessen persönliche Vernehmung zur Sachverhaltsaufklärung erforderlich ist. Über den Antrag entscheidet das Gericht.

(3) Die schriftliche Aussage ist dem Gericht vor Beginn der Hauptverhandlung vorzulegen und der Zeuge zu benennen. Über ihre Zulassung entscheidet das Gericht unter Würdigung aller Umstände.

(4) Die Belehrung des Zeugen obliegt dem Gericht und kann mündlich oder schriftlich erfolgen.'),
  ('§ 27', 'Vernehmung des Vorsitzenden des Bundesrats', 'Abschnitt 4 – Zeugen und Sachverständige', 'Der Vorsitzende des Bundesrats wird an einem Ort seiner Wahl vernommen. Zur Hauptverhandlung wird er nicht geladen; das Protokoll über seine Vernehmung ist in der Hauptverhandlung zu verlesen.'),
  ('§ 28', 'Vereidigung', 'Abschnitt 4 – Zeugen und Sachverständige', '(1) Zeugen werden nur vereidigt, wenn das Gericht dies wegen der ausschlaggebenden Bedeutung der Aussage oder zur Herbeiführung einer wahren Aussage für erforderlich hält.

(2) Die Vereidigung erfolgt einzeln nach der Vernehmung. Der Eid kann mit oder ohne religiöse Beteuerung geleistet werden.

(3) Gibt ein Zeuge an, aus Glaubens- oder Gewissensgründen keinen Eid leisten zu wollen, so tritt an dessen Stelle die eidesgleiche Bekräftigung der Wahrheit. Sie steht dem Eid gleich.

(4) Wird ein bereits vereidigter Zeuge im selben Verfahren erneut vernommen, kann das Gericht ihn die Richtigkeit seiner Aussage unter Berufung auf den früheren Eid versichern lassen.'),
  ('§ 29', 'Folgen unberechtigter Verweigerung', 'Abschnitt 4 – Zeugen und Sachverständige', '(1) Verweigert ein Zeuge ohne gesetzlichen Grund das Zeugnis oder die Eidesleistung, werden ihm die dadurch verursachten Kosten auferlegt und ein Ordnungsgeld festgesetzt.

(2) Zur Erzwingung des Zeugnisses kann Haft angeordnet werden, nicht jedoch über die Beendigung des Verfahrens und nicht über 120 Hafteinheiten hinaus. Die Anordnung der Haft steht dem Gericht zu.'),
  ('§ 30', 'Sachverständige', 'Abschnitt 4 – Zeugen und Sachverständige', '(1) Für Sachverständige gelten die Vorschriften über Zeugen entsprechend, soweit nachfolgend nichts anderes bestimmt ist.

(2) Die Auswahl der Sachverständigen und die Bestimmung ihrer Anzahl erfolgt durch das Gericht oder, im Ermittlungsverfahren, durch die Staatsanwaltschaft.

(3) Verlesen werden können die ein Gutachten enthaltenden Erklärungen öffentlicher Behörden, ärztliche Atteste über Körperverletzungen sowie Berichte über die Entnahme von Blutproben.'),
  ('§ 31', 'Ladung und Vorführung', 'Abschnitt 5 – Der Beschuldigte: Vernehmung und Verteidigung', '(1) Der Beschuldigte ist zur Vernehmung schriftlich oder mündlich zu laden. Die Ladung kann unter der Androhung erfolgen, dass bei Ausbleiben die Vorführung angeordnet wird.

(2) Die Vorführung des Beschuldigten kann verfügt werden, wenn Gründe vorliegen, die den Erlass eines Haftbefehls rechtfertigen würden. Im Vorführungsbefehl sind der Beschuldigte, die ihm zur Last gelegte Tat und der Grund der Vorführung zu bezeichnen.'),
  ('§ 32', 'Vernehmung zur Sache', 'Abschnitt 5 – Der Beschuldigte: Vernehmung und Verteidigung', '(1) Zu Beginn der Vernehmung ist dem Beschuldigten zu eröffnen, welche Tat ihm zur Last gelegt wird und welche Strafvorschriften in Betracht kommen.

(2) Er ist darauf hinzuweisen, dass es ihm freisteht,

1. sich zur Beschuldigung zu äußern oder nicht zur Sache auszusagen,
2. jederzeit, auch schon vor der Vernehmung, einen Verteidiger seiner Wahl zu befragen, und
3. zu seiner Entlastung einzelne Beweiserhebungen zu beantragen.

(3) Die Vernehmung soll dem Beschuldigten Gelegenheit geben, die Verdachtsgründe zu beseitigen und die zu seinen Gunsten sprechenden Tatsachen geltend zu machen.'),
  ('§ 33', 'Verbotene Vernehmungsmethoden', 'Abschnitt 5 – Der Beschuldigte: Vernehmung und Verteidigung', '(1) Die Freiheit der Willensentschließung und Willensbetätigung des Beschuldigten darf nicht beeinträchtigt werden durch Misshandlung, Ermüdung, körperlichen Eingriff, Verabreichung von Mitteln, Quälerei, Täuschung oder Hypnose. Zwang ist nur zulässig, soweit das Verfahrensrecht ihn gestattet.

(2) Die Drohung mit einer unzulässigen Maßnahme und das Versprechen eines gesetzlich nicht vorgesehenen Vorteils sind verboten.

(3) Das Verbot gilt ohne Rücksicht auf die Einwilligung des Beschuldigten. Aussagen, die unter Verletzung dieses Verbots zustande gekommen sind, dürfen auch mit seiner Zustimmung nicht verwertet werden.'),
  ('§ 34', 'Belehrung des festgenommenen Beschuldigten', 'Abschnitt 5 – Der Beschuldigte: Vernehmung und Verteidigung', '(1) Der festgenommene Beschuldigte ist unverzüglich in einer für ihn verständlichen Sprache über seine Rechte zu belehren. Verweigert er die Bestätigung der Belehrung, ist dies zu dokumentieren.

(2) Er ist darauf hinzuweisen, dass er

1. das Recht hat, sich zu äußern oder zu schweigen,
2. jederzeit einen Verteidiger seiner Wahl befragen kann,
3. zu seiner Entlastung Beweiserhebungen beantragen kann,
4. eine ärztliche Untersuchung verlangen kann,
5. einen Angehörigen oder eine Vertrauensperson benachrichtigen kann, soweit der Untersuchungszweck nicht erheblich gefährdet wird, und
6. bei Aufrechterhaltung der Untersuchungshaft eine Haftprüfung beantragen kann.'),
  ('§ 35', 'Recht auf Verteidigung', 'Abschnitt 5 – Der Beschuldigte: Vernehmung und Verteidigung', '(1) Der Beschuldigte kann sich in jeder Lage des Verfahrens des Beistands eines Verteidigers bedienen.

(2) Zu Verteidigern können Rechtsanwälte gewählt werden. Andere Personen bedürfen der Genehmigung des Gerichts.

(3) Das Recht auf Verteidigung schränkt die Gerichtsordnung nicht ein.'),
  ('§ 36', 'Ausschließung des Verteidigers', 'Abschnitt 5 – Der Beschuldigte: Vernehmung und Verteidigung', '(1) Ein Verteidiger ist von der Mitwirkung auszuschließen, wenn er dringend verdächtig ist, dass er

1. an der Tat beteiligt ist,
2. den Verkehr mit dem nicht auf freiem Fuß befindlichen Beschuldigten dazu missbraucht, Straftaten zu begehen oder die Sicherheit einer Vollzugsanstalt erheblich zu gefährden, oder
3. eine Handlung begangen hat, die im Falle der Verurteilung des Beschuldigten Begünstigung, Strafvereitelung oder Hehlerei wäre.

(2) Über die Ausschließung wird nach mündlicher Verhandlung entschieden. Der Verteidiger ist zu laden; die Verhandlung kann bei ordnungsgemäßer Ladung auch in seiner Abwesenheit durchgeführt werden.

(3) Gegen die ausschließende Entscheidung ist die Beschwerde zulässig; eine die Ausschließung ablehnende Entscheidung ist nicht anfechtbar.'),
  ('§ 37', 'Verkehr mit dem Verteidiger', 'Abschnitt 5 – Der Beschuldigte: Vernehmung und Verteidigung', '(1) Dem Beschuldigten ist, auch wenn er sich nicht auf freiem Fuß befindet, schriftlicher und mündlicher Verkehr mit dem Verteidiger gestattet.

(2) Der Verkehr kann versagt werden, wenn ein dringender Grund zur Annahme besteht, dass er die Aufklärung des Sachverhalts erheblich erschwert. Die Versagung ist schriftlich zu begründen.'),
  ('§ 38', 'Akteneinsicht', 'Abschnitt 5 – Der Beschuldigte: Vernehmung und Verteidigung', '(1) Der Verteidiger ist befugt, die Akten einzusehen und amtlich verwahrte Beweisstücke zu besichtigen.

(2) Vor Abschluss der Ermittlungen kann die Einsicht versagt werden, soweit sie den Untersuchungszweck gefährden würde. Befindet sich der Beschuldigte in Untersuchungshaft, sind ihm die für die Beurteilung der Rechtmäßigkeit der Freiheitsentziehung wesentlichen Informationen zugänglich zu machen.

(3) Die Einsicht in Protokolle über die Vernehmung des Beschuldigten und über richterliche Untersuchungshandlungen, bei denen der Verteidiger anwesend sein durfte, darf nicht versagt werden.

(4) Ein Beschuldigter ohne Verteidiger ist in gleichem Umfang zur Akteneinsicht befugt, soweit der Untersuchungszweck nicht gefährdet und überwiegende schutzwürdige Interessen Dritter nicht entgegenstehen.

(5) Über die Akteneinsicht entscheidet im Ermittlungsverfahren die Staatsanwaltschaft, im Übrigen das Gericht.'),
  ('§ 39', 'Kronzeuge', 'Abschnitt 5 – Der Beschuldigte: Vernehmung und Verteidigung', '(1) Eine an der Tat beteiligte Person kann als Kronzeuge in Betracht kommen, wenn sie durch ihre Aussage oder die Offenlegung wesentlicher Informationen dazu beiträgt, andere Beteiligte zu überführen oder erhebliche Straftaten aufzuklären.

(2) Den Status als Kronzeuge gewährt das Gericht auf Antrag der Staatsanwaltschaft. Der Antrag hat Art und Bedeutung der geleisteten Hilfe sowie die Schwere der eigenen Tat darzulegen.

(3) Wird der Status gewährt, kann das Gericht die Strafe mildern oder in besonders schwer aufklärbaren Fällen von Strafe absehen.

(4) Die Regelung entfällt, wenn der Kronzeuge falsche oder irreführende Informationen offenlegt oder wesentliche Tatsachen verschweigt; in diesem Fall wird ein reguläres Verfahren durchgeführt.'),
  ('§ 40', 'Vorläufige Festnahme', 'Abschnitt 6 – Festnahme und Untersuchungshaft', '(1) Wird jemand auf frischer Tat betroffen oder verfolgt, so ist jedermann befugt, ihn ohne richterliche Anordnung vorläufig festzunehmen, wenn er der Flucht verdächtig ist oder seine Identität nicht sofort festgestellt werden kann.

(2) Die Staatsanwaltschaft und die Beamten des Polizeidienstes sind zur vorläufigen Festnahme auch dann befugt, wenn die Voraussetzungen eines Haftbefehls vorliegen und Gefahr im Verzug ist.

(3) Ist eine Straftat nur auf Antrag verfolgbar, so ist die vorläufige Festnahme auch vor Stellung des Antrags zulässig.

(4) Zeiten der vorläufigen Festnahme und Untersuchungshaft sind bei einer späteren Freiheitsstrafe nach Maßgabe des § 46 anzurechnen.'),
  ('§ 41', 'Voraussetzungen der Untersuchungshaft', 'Abschnitt 6 – Festnahme und Untersuchungshaft', '(1) Die Untersuchungshaft darf nur durch das Gericht und nur angeordnet werden, wenn der Beschuldigte der Tat dringend verdächtig ist und ein Haftgrund besteht.

(2) Ein Haftgrund besteht, wenn

1. der Beschuldigte flüchtig ist oder sich verborgen hält,
2. bei Würdigung der Umstände die Gefahr besteht, dass er sich dem Verfahren entzieht (Fluchtgefahr), oder
3. sein Verhalten den dringenden Verdacht begründet, er werde Beweismittel beeinträchtigen oder auf Zeugen oder Mitbeschuldigte einwirken (Verdunkelungsgefahr).

(3) Gegen einen Beschuldigten, der einer Straftat dringend verdächtig ist, durch die Leib oder Leben eines anderen gefährdet wurde, darf die Untersuchungshaft auch ohne Haftgrund nach Absatz 2 angeordnet werden.

(4) Die Untersuchungshaft darf nicht angeordnet werden, wenn sie zur Bedeutung der Sache und der zu erwartenden Strafe außer Verhältnis steht. Bei Taten, die nur mit Freiheitsstrafe bis zu 15 Hafteinheiten oder Geldstrafe bedroht sind, darf sie wegen Verdunkelungsgefahr nicht angeordnet werden.'),
  ('§ 42', 'Straf- und Haftbefehl', 'Abschnitt 6 – Festnahme und Untersuchungshaft', '(1) Die Staatsanwaltschaft kann gegen den Beschuldigten einen Strafbefehl erlassen, wenn ihm nachweisbare Straftaten zur Last gelegt werden. Die weiteren Voraussetzungen und Grenzen richten sich nach dem vereinfachten Verfahren (§ 60 ff.).

(2) Das Gericht kann einen Haftbefehl schriftlich anordnen, wenn ein Haftgrund vorliegt.

(3) Im Straf- und Haftbefehl sind anzuführen:

1. der Beschuldigte,
2. die Tat, deren er dringend verdächtig ist, sowie Zeit und Ort ihrer Begehung,
3. die anzuwendenden Strafvorschriften,
4. der Haftgrund und
5. die Tatsachen, aus denen sich der dringende Tatverdacht und der Haftgrund ergeben.

(4) Dem Beschuldigten ist der Straf- oder Haftbefehl bei seiner Festnahme bekanntzugeben. Ein Haftbefehl wird unabhängig von seiner Zustimmung nach Maßgabe der §§ 41 bis 45 vollzogen. Bei einem Strafbefehl richten sich das weitere Verfahren, die Vollstreckung und der Einspruch nach den §§ 60 bis 65. Die Ablehnung eines Strafbefehls begründet für sich allein keine Untersuchungshaft.

(5) Die Dauer der angeordneten Untersuchungshaft darf die zu erwartende Strafe nicht überschreiten.'),
  ('§ 43', 'Vorführung vor das Gericht', 'Abschnitt 6 – Festnahme und Untersuchungshaft', '(1) Wird der Beschuldigte aufgrund eines Haftbefehls ergriffen, so ist er unverzüglich, sobald es die Umstände zulassen, dem Gericht vorzuführen und über den Gegenstand der Beschuldigung zu vernehmen. Die Vorführung darf nur so lange aufgeschoben werden, wie die Umstände es zwingend erfordern.

(2) Bei der Vernehmung ist ihm Gelegenheit zu geben, die Verdachts- und Haftgründe zu entkräften und die zu seinen Gunsten sprechenden Tatsachen geltend zu machen.'),
  ('§ 44', 'Haftprüfung', 'Abschnitt 6 – Festnahme und Untersuchungshaft', '(1) Solange der Beschuldigte in Untersuchungshaft ist, kann er jederzeit die gerichtliche Prüfung beantragen, ob der Haftbefehl aufzuheben oder dessen Vollzug auszusetzen ist.

(2) Über die Haftprüfung wird nach mündlicher Verhandlung entschieden. Sie findet am Ort der Untersuchungshaft statt.

(3) Ein Anspruch auf eine weitere mündliche Verhandlung besteht nur, wenn die Untersuchungshaft seit der letzten Verhandlung mindestens zwölf Stunden gedauert hat.'),
  ('§ 45', 'Aufhebung des Haftbefehls', 'Abschnitt 6 – Festnahme und Untersuchungshaft', '(1) Der Haftbefehl ist aufzuheben, sobald die Voraussetzungen der Untersuchungshaft nicht mehr vorliegen, insbesondere wenn der Beschuldigte freigesprochen oder das Verfahren eingestellt wird.

(2) Der Haftbefehl ist auch aufzuheben, wenn die Staatsanwaltschaft es vor Erhebung der öffentlichen Klage beantragt.

(3) Die Einlegung eines Rechtsmittels hält die Freilassung nicht auf.'),
  ('§ 46', 'Anrechnung der Untersuchungshaft', 'Abschnitt 6 – Festnahme und Untersuchungshaft', '(1) Die in Untersuchungshaft verbrachte Zeit wird vollständig auf die zu erwartende Freiheitsstrafe angerechnet.

(2) Die Anrechnung entfällt vollständig, wenn der Beschuldigte das Verfahren schuldhaft behindert oder sich diesem zeitweise entzieht. Schweigen, die Verweigerung eines Geständnisses oder die zulässige Wahrnehmung eigener Verfahrensrechte gelten nicht als Verfahrensbehinderung.

(3) Nicht angerechnet werden:

• der Fahrweg zur Untersuchungshaft, zum Gericht oder zum Gefängnis,
• der Aufenthalt im San Andreas Medical Service,
• Gerichtsprozesse und Rechtsanwaltsgespräche,
• Zeit, während der der Beschuldigte für das Verfahren nicht zur Verfügung stand.

(4) Übersteigt die vollständig anzurechnende Untersuchungshaft die zu erwartende Haftzeit, gilt die Strafe ohne Schadensansprüche als abgesessen. In diesem Fall ist der Beschuldigte unverzüglich aus der Untersuchungshaft zu entlassen. Das höchste zu erwartende Strafmaß nach dem FiveNet-Ergebnis und die insgesamt anrechenbare Haftzeit sind zu dokumentieren.'),
  ('§ 47', 'Ausschreibung zur Festnahme und Aufenthaltsermittlung', 'Abschnitt 6 – Festnahme und Untersuchungshaft', '(1) Auf Grundlage eines Haftbefehls, eines Strafbefehls oder einer im vereinfachten Verfahren festgesetzten, noch nicht vollstreckten Freiheitsstrafe können das Gericht, die Staatsanwaltschaft und, bei Gefahr im Verzug, ihre Ermittlungspersonen die Ausschreibung zur Festnahme veranlassen.

(2) Ist der Aufenthalt eines Beschuldigten oder Zeugen unbekannt, kann seine Ausschreibung zur Aufenthaltsermittlung angeordnet werden. Bei der Ausschreibung eines Zeugen ist kenntlich zu machen, dass er nicht Beschuldigter ist.

(3) Bei einer Straftat von erheblicher Bedeutung kann zusätzlich eine Öffentlichkeitsfahndung veranlasst werden, wenn andere Formen der Aufenthaltsermittlung erheblich weniger erfolgversprechend wären.'),
  ('§ 48', 'Festnahme von Störern', 'Abschnitt 6 – Festnahme und Untersuchungshaft', 'Bei Amtshandlungen an Ort und Stelle kann der leitende Beamte Personen, die seine Tätigkeit vorsätzlich stören oder sich seinen Anordnungen widersetzen, festnehmen und bis zur Beendigung der Amtshandlung, längstens jedoch bis zum folgenden Tag, festhalten.'),
  ('§ 49', 'Anklagegrundsatz und Legalitätsprinzip', 'Abschnitt 7 – Öffentliche Klage und Einstellung des Verfahrens', '(1) Die Eröffnung einer gerichtlichen Untersuchung setzt die Erhebung einer Klage voraus. Zur Erhebung der öffentlichen Klage ist nur die Staatsanwaltschaft berufen.

(2) Die Staatsanwaltschaft ist verpflichtet, wegen aller verfolgbaren Straftaten einzuschreiten, sofern zureichende tatsächliche Anhaltspunkte vorliegen und dieses Gesetz nichts anderes bestimmt.'),
  ('§ 50', 'Pflicht zur Sachverhaltsaufklärung', 'Abschnitt 7 – Öffentliche Klage und Einstellung des Verfahrens', '(1) Erlangt die Staatsanwaltschaft Kenntnis vom Verdacht einer Straftat, so hat sie den Sachverhalt zu erforschen, um über die Erhebung der öffentlichen Klage zu entscheiden.

(2) Sie hat die belastenden wie die entlastenden Umstände zu ermitteln.'),
  ('§ 51', 'Entscheidung über die Anklageerhebung', 'Abschnitt 7 – Öffentliche Klage und Einstellung des Verfahrens', '(1) Bieten die Ermittlungen genügenden Anlass, erhebt die Staatsanwaltschaft die öffentliche Klage durch Einreichung einer Anklageschrift bei dem zuständigen Gericht.

(2) Andernfalls stellt sie das Verfahren ein und setzt den Beschuldigten hiervon in Kenntnis, wenn er als solcher vernommen wurde, ein Haftbefehl gegen ihn bestand oder er um einen Bescheid gebeten hat.'),
  ('§ 52', 'Inhalt der Anklageschrift', 'Abschnitt 7 – Öffentliche Klage und Einstellung des Verfahrens', '(1) Die Anklageschrift bezeichnet den Beschuldigten, die ihm zur Last gelegte Tat, Zeit und Ort ihrer Begehung sowie die anzuwendenden Strafvorschriften.

(2) In der Anklageschrift werden die wesentlichen Ermittlungsergebnisse dargestellt.'),
  ('§ 53', 'Absehen von der Verfolgung bei Geringfügigkeit', 'Abschnitt 7 – Öffentliche Klage und Einstellung des Verfahrens', '(1) Hat das Verfahren ein Vergehen zum Gegenstand und ist die Schuld des Täters gering, so kann die Staatsanwaltschaft mit Zustimmung des Gerichts von der Verfolgung absehen.

(2) Der Zustimmung des Gerichts bedarf es nicht bei einem Vergehen, das nicht mit einer im Mindestmaß erhöhten Strafe bedroht ist und dessen Folgen gering sind.'),
  ('§ 54', 'Absehen von der Verfolgung unter Auflagen', 'Abschnitt 7 – Öffentliche Klage und Einstellung des Verfahrens', 'Mit Zustimmung des Gerichts und des Beschuldigten kann die Staatsanwaltschaft vorläufig von der Klage absehen und dem Beschuldigten Auflagen erteilen, wenn diese geeignet sind, das öffentliche Interesse an der Strafverfolgung zu beseitigen, und die Schwere der Schuld nicht entgegensteht. Als Auflagen kommen insbesondere in Betracht:

1. Wiedergutmachung des durch die Tat verursachten Schadens,
2. Zahlung eines Geldbetrags zugunsten der Staatskasse,
3. Erbringung sonstiger Leistungen,
4. Bemühen um einen Ausgleich mit dem Verletzten.'),
  ('§ 55', 'Absehen von der Verfolgung gegen Geldzahlung', 'Abschnitt 7 – Öffentliche Klage und Einstellung des Verfahrens', '(1) Bei einer zu erwartenden Haftzeit bis zu 60 Hafteinheiten kann die Staatsanwaltschaft von der Erhebung der öffentlichen Klage absehen, wenn der Beschuldigte eine Geldzahlung leistet.

(2) Die Höhe der Zahlung setzt die Staatsanwaltschaft fest. Maßnahme und Höhe sind zu dokumentieren.'),
  ('§ 56', 'Einstellung mangels hinreichenden Tatverdachts', 'Abschnitt 7 – Öffentliche Klage und Einstellung des Verfahrens', '(1) Die Staatsanwaltschaft kann ein Verfahren einstellen, wenn eine Verurteilung nicht zu erwarten ist, insbesondere wenn

1. nicht genügend geeignete Zeugen für die Aufklärung der Tat vorhanden sind,
2. Zeugen aufgrund Zeitablaufs keine verwertbare Aussage mehr machen können oder
3. keine oder zu wenige physische Beweise für eine Aufklärung vorliegen.

(2) Ist die öffentliche Klage bereits erhoben, bedarf die Einstellung der Zustimmung des Gerichts.

(3) Eine Einstellung nach dieser Vorschrift kann nur durch die Staatsanwaltschaft oder das Gericht zurückgenommen werden; dies bedarf einer Begründung.'),
  ('§ 57', 'Teileinstellung bei mehreren Taten', 'Abschnitt 7 – Öffentliche Klage und Einstellung des Verfahrens', 'Fällt eine von mehreren Taten für die zu erwartende Strafe nicht beträchtlich ins Gewicht, so kann die Staatsanwaltschaft von ihrer Verfolgung absehen. Ist die Klage bereits erhoben, kann das Gericht das Verfahren insoweit auf Antrag der Staatsanwaltschaft einstellen.'),
  ('§ 58', 'Rücknahme der Klage', 'Abschnitt 7 – Öffentliche Klage und Einstellung des Verfahrens', 'Die öffentliche Klage kann bis zur Eröffnung des Hauptverfahrens zurückgenommen werden, danach nicht mehr.'),
  ('§ 59', 'Täter-Opfer-Ausgleich', 'Abschnitt 7 – Öffentliche Klage und Einstellung des Verfahrens', 'Staatsanwaltschaft und Gericht sollen in jedem Stadium des Verfahrens prüfen, ob ein Ausgleich zwischen Beschuldigtem und Verletztem erreicht werden kann. Gegen den ausdrücklichen Willen des Verletzten darf die Eignung nicht angenommen werden.'),
  ('§ 60', 'Zweck und Anwendungsbereich', 'Abschnitt 8 – Vereinfachtes Verfahren', '(1) Das vereinfachte Verfahren dient der unmittelbaren Festsetzung einer Strafe ohne Hauptverhandlung.

(2) Es ist zulässig, wenn

1. der Beschuldigte die Tat gesteht oder
2. der Sachverhalt nach § 62 durch Beweise belegt ist,

und die zu erwartende Strafe eine Geldstrafe oder eine Freiheitsstrafe ist, die 180 Hafteinheiten nicht übersteigt. Innerhalb dieser Grenze bestimmt sich die Befugnis der einzelnen Stellen nach § 61.'),
  ('§ 61', 'Zuständigkeit', 'Abschnitt 8 – Vereinfachtes Verfahren', '(1) Zur Durchführung des vereinfachten Verfahrens sind befugt:

1. das Gericht bis zu 180 Hafteinheiten oder Geldstrafe,
2. die Staatsanwaltschaft bis zu 120 Hafteinheiten oder Geldstrafe,
3. der sachbearbeitende Beamte einer Polizeibehörde bis zu 120 Hafteinheiten oder Geldstrafe, sofern der Beschuldigte die Tat gesteht. Bis einschließlich 39 Hafteinheiten ist keine vorherige Kontaktaufnahme mit dem Gericht oder der Staatsanwaltschaft erforderlich. Übersteigt die zu erwartende Gesamtfreiheitsstrafe 39 Hafteinheiten, ist die Durchführung nur zulässig, wenn das Gericht und die Staatsanwaltschaft nach Absatz 5 als abwesend gelten.

(2) Führt der sachbearbeitende Beamte einer Polizeibehörde das Verfahren, so ist es nur bei einem Geständnis des Beschuldigten zulässig. Die Festsetzung einer Strafe allein auf Grundlage der Beweise nach § 62, ohne Geständnis, bleibt dem Gericht und der Staatsanwaltschaft vorbehalten.

(3) Liegt kein Geständnis vor, darf die Polizeibehörde im vereinfachten Verfahren keine Strafe festsetzen. Sie hat die Staatsanwaltschaft schriftlich unter Übermittlung des Tatvorwurfs und der vorhandenen Beweismittel in Kenntnis zu setzen. Eine vorläufige Festnahme richtet sich nach § 40. Untersuchungshaft darf nur unter den Voraussetzungen des § 41 durch das Gericht angeordnet oder aufrechterhalten werden. Das fehlende Geständnis und die Abwesenheit des Gerichts oder der Staatsanwaltschaft rechtfertigen für sich allein keine Freiheitsentziehung. Liegt keine Rechtsgrundlage für deren Fortdauer vor, ist der Beschuldigte unverzüglich freizulassen.

(4) Übersteigt die zu erwartende Gesamtfreiheitsstrafe 39 Hafteinheiten und ist ein Richter anwesend oder innerhalb der Frist nach Absatz 5 erreichbar, so führt dieser das vereinfachte Verfahren durch. Ist kein Richter erreichbar, ist die Staatsanwaltschaft zuständig. Die Polizeibehörde darf das Verfahren durchführen, wenn beide Stellen die Übernahme ablehnen oder die Frist nach Absatz 5 ohne Rückmeldung verstrichen ist. Die Kontaktaufnahme und eine etwaige Ablehnung sind zu dokumentieren.

(5) Bei einer zu erwartenden Gesamtfreiheitsstrafe von mehr als 39 Hafteinheiten gelten Gericht beziehungsweise Staatsanwaltschaft jeweils als abwesend, wenn innerhalb von fünfzehn Minuten nach ihrer nachweisbaren Inkenntnissetzung über die Festnahme kein Tätigwerden erfolgt. Zeitpunkt und Art der Kontaktaufnahme sowie eine etwaige Rückmeldung sind zu dokumentieren. Die Wartefrist begründet keine eigenständige Befugnis zur Freiheitsentziehung.'),
  ('§ 62', 'Beweisgrundlage', 'Abschnitt 8 – Vereinfachtes Verfahren', '(1) Ohne Geständnis darf eine Strafe nur festgesetzt werden, wenn der Sachverhalt durch mindestens zwei der folgenden Beweise belegt ist:

1. Bild- oder Tonaufnahmen,
2. die dienstliche Wahrnehmung von mindestens zwei vereidigten Beamten oder Ermittlungspersonen der Staatsanwaltschaft,
3. sichergestellte physische Beweismittel,
4. die übereinstimmende Aussage von mindestens zwei Zeugen, die den Beschuldigten zweifelsfrei identifizieren.

(2) Die Beweise müssen sich auf das der Tat zugrunde liegende Geschehen beziehen. Ist das Kerngeschehen nach Absatz 1 belegt, so dürfen die aus demselben Lebenssachverhalt stammenden weiteren Vorwürfe mit abgeurteilt werden, ohne dass für jeden einzelnen Vorwurf ein gesonderter Beweis vorliegen muss.

(3) Nicht erfasst sind Vorwürfe, die einer eigenständigen, vom Kerngeschehen unabhängigen Tat entstammen.'),
  ('§ 63', 'Verfahren und Belehrung', 'Abschnitt 8 – Vereinfachtes Verfahren', '(1) Dem Beschuldigten ist zu eröffnen:

1. welche Taten ihm zur Last gelegt werden,
2. dass ein vereinfachtes Verfahren durchgeführt wird,
3. dass er das Recht hat, die Aussage zu verweigern, und
4. dass er nach § 65 nachträglich Einspruch einlegen kann.

(2) Ihm ist Gelegenheit zur Äußerung zum Sachverhalt zu geben.'),
  ('§ 64', 'Dokumentation', 'Abschnitt 8 – Vereinfachtes Verfahren', '(1) Das Verfahren ist schriftlich zu dokumentieren. Die Dokumentation enthält mindestens:

1. Namen des Beschuldigten,
2. den Tatvorwurf,
3. die erhobenen Beweismittel,
4. Namen etwaiger Zeugen und
5. das festgesetzte Strafmaß.'),
  ('§ 65', 'Vollstreckung und Einspruch', 'Abschnitt 8 – Vereinfachtes Verfahren', '(1) Die festgesetzte Strafe wird nach Abschluss des Verfahrens vollstreckt.

(2) Der Beschuldigte kann innerhalb von 5 Tagen nach Durchführung des vereinfachten Verfahrens schriftlich Berufung beim Court of Appeals einlegen. Für die Berufung gelten die Vorschriften des Abschnitts 10 über die reguläre Berufung, soweit dieser Paragraph nichts Abweichendes bestimmt.

(3) Der Einspruch hemmt die Vollstreckung nicht. Eine verhängte Freiheitsstrafe wird auch bei eingelegtem Einspruch vollzogen, eine Geldstrafe eingezogen.

(4) Über die Berufung entscheidet der Court of Appeals in einer Hauptverhandlung. Gegen dessen Urteil stehen die weiteren Rechtsmittel nach Abschnitt 10 offen.

(5) Ist die Berufung verspätet eingelegt oder sonst unzulässig, so wird sie ohne Hauptverhandlung durch Beschluss des Court of Appeals verworfen.

(6) Wird der Beschuldigte in der auf die Berufung folgenden Hauptverhandlung ganz oder teilweise freigesprochen, ist er nach § 84 zu entschädigen.'),
  ('§ 66', 'Eröffnung des Hauptverfahrens', 'Abschnitt 9 – Hauptverhandlung', '(1) Die Hauptverhandlung wird durch Vorlage der Anklageschrift beantragt. Das Gericht entscheidet über die Eröffnung des Hauptverfahrens.

(2) Beschließt das Gericht, das Hauptverfahren nicht zu eröffnen, so muss aus dem Beschluss hervorgehen, ob er auf tatsächlichen oder rechtlichen Gründen beruht. Der Beschluss ist dem Beschuldigten bekanntzumachen.

(3) Die Untersuchung und Entscheidung erstreckt sich nur auf die in der Klage bezeichnete Tat und die beschuldigten Personen. Innerhalb dieser Grenzen ist das Gericht an die gestellten Anträge nicht gebunden.'),
  ('§ 67', 'Ununterbrochene Gegenwart', 'Abschnitt 9 – Hauptverhandlung', 'Die Hauptverhandlung erfolgt in ununterbrochener Gegenwart der zur Urteilsfindung berufenen Personen sowie der Staatsanwaltschaft.'),
  ('§ 68', 'Anwesenheit des Angeklagten', 'Abschnitt 9 – Hauptverhandlung', '(1) Der erschienene Angeklagte darf sich aus der Verhandlung nicht entfernen. Der vorsitzende Richter kann geeignete Maßnahmen treffen, um die Entfernung zu verhindern.

(2) Entfernt der Angeklagte sich dennoch oder bleibt er der Fortsetzung fern, so kann die Verhandlung in seiner Abwesenheit zu Ende geführt werden, wenn er zur Anklage bereits vernommen war und das Gericht seine weitere Anwesenheit nicht für erforderlich hält.

(3) Ist der Angeklagte schuld daran, dass eine Hauptverhandlung binnen sieben Tagen nicht stattfinden kann, so kann sie auch ohne seine Anwesenheit durchgeführt werden. Auf Antrag kann er eine schriftliche Äußerung zum Sachverhalt abgeben, die zu würdigen ist.

(4) Gegen einen ausgebliebenen Angeklagten findet im Übrigen keine Hauptverhandlung statt. Ist sein Ausbleiben nicht hinreichend entschuldigt, ist die Vorführung anzuordnen oder ein Haftbefehl zu erlassen, soweit dies zur Durchführung zwingend erforderlich ist.'),
  ('§ 69', 'Gang der Hauptverhandlung', 'Abschnitt 9 – Hauptverhandlung', '(1) Die Hauptverhandlung beginnt mit dem Aufruf der Sache. Der vorsitzende Richter stellt die Anwesenheit fest und vernimmt den Angeklagten zu seinen persönlichen Verhältnissen.

(2) Sodann verliest die Staatsanwaltschaft den Anklagesatz.

(3) Der Angeklagte wird darauf hingewiesen, dass es ihm freisteht, sich zur Anklage zu äußern oder nicht zur Sache auszusagen. Ist er zur Äußerung bereit, wird er zur Sache vernommen.

(4) Es folgt die Beweisaufnahme.'),
  ('§ 70', 'Leitung und Beweisaufnahme', 'Abschnitt 9 – Hauptverhandlung', '(1) Die Leitung der Verhandlung, die Vernehmung des Angeklagten und die Aufnahme der Beweise erfolgt durch den vorsitzenden Richter.

(2) Wird eine auf die Sachleitung bezügliche Anordnung des Vorsitzenden als unzulässig beanstandet, entscheidet das Gericht.

(3) Auf übereinstimmenden Antrag der Staatsanwaltschaft und des Verteidigers überlässt der vorsitzende Richter diesen die Vernehmung der von ihnen benannten Zeugen und Sachverständigen. Der Vorsitzende hat auch danach die zur Aufklärung erforderlichen Fragen zu stellen.'),
  ('§ 71', 'Fragerecht', 'Abschnitt 9 – Hauptverhandlung', '(1) Der vorsitzende Richter gestattet der Staatsanwaltschaft, dem Angeklagten und dem Verteidiger, Fragen an den Angeklagten, die Zeugen und die Sachverständigen zu stellen. Die unmittelbare Befragung eines Angeklagten durch einen Mitangeklagten ist unzulässig.

(2) Über Zweifel an der Zulässigkeit einer Frage entscheidet auf Einspruch das Gericht.'),
  ('§ 72', 'Schlussvorträge und letztes Wort', 'Abschnitt 9 – Hauptverhandlung', '(1) Nach Schluss der Beweisaufnahme erhalten die Staatsanwaltschaft und sodann der Angeklagte das Wort zu ihren Ausführungen und Anträgen.

(2) Der Staatsanwaltschaft steht das Recht der Erwiderung zu; dem Angeklagten gebührt das letzte Wort.'),
  ('§ 73', 'Freie Beweiswürdigung', 'Abschnitt 9 – Hauptverhandlung', 'Über das Ergebnis der Beweisaufnahme entscheidet das Gericht nach seiner freien, aus dem Inbegriff der Verhandlung geschöpften Überzeugung.'),
  ('§ 74', 'Urteil', 'Abschnitt 9 – Hauptverhandlung', '(1) Die Hauptverhandlung schließt mit der auf die Beratung folgenden Verkündung des Urteils. Das Urteil ergeht im Namen des Volkes.

(2) Das Urteil wird durch Verlesung der Urteilsformel und Eröffnung der Urteilsgründe verkündet. Während der Urteilsverkündung haben sich alle Anwesenden zu erheben.

(3) Die Urteilsformel gibt die rechtliche Bezeichnung der Tat an, deren der Angeklagte schuldig gesprochen wird, sowie die verhängte Strafe. Anschließend werden die angewendeten Vorschriften aufgeführt.'),
  ('§ 75', 'Urteilsgründe', 'Abschnitt 9 – Hauptverhandlung', '(1) Wird der Angeklagte verurteilt, so geben die Urteilsgründe die für erwiesen erachteten Tatsachen an, in denen die gesetzlichen Merkmale der Straftat gefunden werden, sowie die für die Strafzumessung bestimmenden Umstände.

(2) Wird der Angeklagte freigesprochen, so müssen die Urteilsgründe ergeben, ob er für nicht überführt oder ob die Tat für nicht strafbar erachtet wurde.'),
  ('§ 76', 'Rechtsmittelberechtigte', 'Abschnitt 10 – Rechtsmittel', '(1) Die zulässigen Rechtsmittel stehen der Staatsanwaltschaft und dem Beschuldigten zu. Die Staatsanwaltschaft kann sie auch zugunsten des Beschuldigten einlegen.

(2) Für den Beschuldigten kann der Verteidiger Rechtsmittel einlegen, jedoch nicht gegen dessen ausdrücklichen Willen.'),
  ('§ 77', 'Beschwerde', 'Abschnitt 10 – Rechtsmittel', '(1) Die Beschwerde ist gegen Beschlüsse der Gerichte und gegen Verfügungen des Vorsitzenden zulässig, soweit das Gesetz sie nicht ausdrücklich ausschließt.

(2) Entscheidungen der erkennenden Gerichte, die dem Urteil vorausgehen, unterliegen nicht der Beschwerde. Ausgenommen sind Entscheidungen über Verhaftungen, die einstweilige Unterbringung, Beschlagnahmen, die vorläufige Entziehung der Fahrerlaubnis sowie die Festsetzung von Ordnungs- und Zwangsmitteln.

(3) Auch Zeugen, Sachverständige und andere betroffene Personen können gegen sie betreffende Beschlüsse Beschwerde erheben.

(4) Über die Beschwerde entscheidet das nächsthöhere Gericht. Gegen Beschlüsse und Verfügungen des Supreme Court ist keine Beschwerde zulässig.

(5) Die Beschwerde hemmt den Vollzug der angefochtenen Entscheidung nicht.'),
  ('§ 78', 'Entscheidung über die Beschwerde', 'Abschnitt 10 – Rechtsmittel', '(1) Die Entscheidung über die Beschwerde ergeht ohne mündliche Verhandlung, in geeigneten Fällen nach Anhörung der Staatsanwaltschaft.

(2) Wird die Beschwerde für begründet erachtet, so erlässt das entscheidende Gericht zugleich die in der Sache erforderliche Entscheidung.'),
  ('§ 79', 'Berufung', 'Abschnitt 10 – Rechtsmittel', '(1) Gegen ein Urteil des District Court ist die Berufung zulässig. Über sie entscheidet der Court of Appeals.

(2) Die Berufung prüft das Urteil in tatsächlicher und rechtlicher Hinsicht.

(3) Die Berufung ist bei dem Court of Appeals binnen fünf Tagen nach Verkündung des Urteils schriftlich einzulegen. Sie kann auf bestimmte Beschwerdepunkte beschränkt werden; andernfalls gilt das Urteil in vollem Umfang als angefochten.

(4) Ist die Berufung verspätet eingelegt, so verwirft der Court of Appeals sie als unzulässig.'),
  ('§ 80', 'Gang der Berufungsverhandlung', 'Abschnitt 10 – Rechtsmittel', '(1) Nach Beginn der Hauptverhandlung trägt ein Berichterstatter die Ergebnisse des bisherigen Verfahrens vor. Das Urteil des District Court wird verlesen, soweit es für die Berufung von Bedeutung ist.

(2) Sodann erfolgen die Vernehmung des Angeklagten und die Beweisaufnahme. Die Vorschriften über die Hauptverhandlung gelten entsprechend.

(3) Nach Schluss der Beweisaufnahme werden die Beteiligten gehört; der Beschwerdeführer zuerst. Dem Angeklagten gebührt das letzte Wort.

(4) Soweit die Berufung für begründet befunden wird, hebt der Court of Appeals das Urteil auf und entscheidet in der Sache selbst.'),
  ('§ 81', 'Revision', 'Abschnitt 10 – Rechtsmittel', '(1) Gegen ein Urteil des Court of Appeals ist die Revision zulässig. Über sie entscheidet der Supreme Court.

(2) Die Revision kann nur darauf gestützt werden, dass das Urteil auf einer Verletzung des Gesetzes beruht. Das Gesetz ist verletzt, wenn eine Rechtsnorm nicht oder nicht richtig angewendet worden ist.

(3) Die Revision ist bei dem Supreme Court binnen fünf Tagen nach Verkündung des Urteils schriftlich einzulegen und zu begründen. Aus der Begründung muss hervorgehen, ob das Urteil wegen Verletzung einer Verfahrensnorm oder einer anderen Rechtsnorm angefochten wird.

(4) Der Prüfung des Supreme Court unterliegen nur die gestellten Revisionsanträge sowie, bei Verfahrensrügen, die bezeichneten Tatsachen.

(5) Soweit die Revision für begründet erachtet wird, hebt der Supreme Court das Urteil und die davon betroffenen Feststellungen auf.'),
  ('§ 82', 'Sprungrevision', 'Abschnitt 10 – Rechtsmittel', '(1) Der Supreme Court kann ein Verfahren, gegen dessen Urteil des District Court die Berufung zulässig wäre, auf Antrag der Staatsanwaltschaft oder des Beschuldigten zur unmittelbaren Entscheidung an sich ziehen, wenn die Sache ausschließlich Rechtsfragen aufwirft oder von grundsätzlicher Bedeutung ist.

(2) Nimmt der Supreme Court die Sache an, so entscheidet er nach den Vorschriften über die Revision; eine Berufung zum Court of Appeals findet nicht statt.

(3) Lehnt der Supreme Court die Annahme ab, so bleibt die Berufung nach § 79 unberührt; die dort bestimmte Frist läuft ab der Bekanntmachung der Ablehnung erneut.'),
  ('§ 83', 'Hemmung der Rechtskraft', 'Abschnitt 10 – Rechtsmittel', '(1) Durch rechtzeitige Einlegung der Berufung oder der Revision wird die Rechtskraft des Urteils, soweit es angefochten ist, nicht gehemmt.

(2) Dem Beschwerdeführer, dem das Urteil mit Gründen noch nicht zugestellt war, ist es nach Einlegung des Rechtsmittels zuzustellen.'),
  ('§ 84', 'Kompensation bei Aufhebung des Urteils', 'Abschnitt 10 – Rechtsmittel', '(1) Wird ein Angeklagter im Berufungs- oder Revisionsverfahren oder in der auf einen Einspruch folgenden Hauptverhandlung freigesprochen, nachdem zuvor auf Freiheits- oder Geldstrafe erkannt worden war, so steht ihm eine Entschädigung zu.

(2) Die Entschädigung einer erbrachten Geldstrafe richtet sich nach deren Höhe.

(3) Für verbüßte Freiheitsstrafe ist auf 3.000 Dollar pro Hafteinheit zu erkennen.

(4) Beschlagnahmte, nicht verwertete Gegenstände sind herauszugeben. Angeordnete Fahrverbote werden mit der Aufhebung des Urteils nichtig.'),
  ('§ 85', 'Nebenklageberechtigung', 'Abschnitt 11 – Beteiligung des Verletzten', '(1) Wer durch eine Straftat gegen Leib oder Leben, gegen die persönliche Freiheit oder gegen die sexuelle Selbstbestimmung verletzt worden ist, kann sich der erhobenen öffentlichen Klage als Nebenkläger anschließen.

(2) Ist der Verletzte durch die Tat getötet worden, so steht das Recht zum Anschluss seinem Ehegatten sowie seinen Verwandten in gerader Linie zu.

(3) Bei anderen als den in Absatz 1 genannten Straftaten ist der Anschluss nur zulässig, wenn er aus besonderen Gründen, insbesondere wegen der schweren Folgen der Tat, zur Wahrnehmung der Interessen des Verletzten geboten erscheint.'),
  ('§ 86', 'Anschluss als Nebenkläger', 'Abschnitt 11 – Beteiligung des Verletzten', '(1) Der Anschluss erfolgt durch schriftliche Erklärung gegenüber dem Gericht. Er ist in jeder Lage des Verfahrens nach Erhebung der öffentlichen Klage bis zum rechtskräftigen Abschluss zulässig.

(2) Über die Berechtigung zum Anschluss entscheidet das Gericht. Die Entscheidung ergeht nach Anhörung der Staatsanwaltschaft.

(3) Der Nebenkläger kann sich eines Rechtsanwalts als Beistand bedienen oder sich durch ihn vertreten lassen.'),
  ('§ 87', 'Befugnisse des Nebenklägers', 'Abschnitt 11 – Beteiligung des Verletzten', '(1) Der Nebenkläger ist zur Anwesenheit in der Hauptverhandlung berechtigt, auch wenn er als Zeuge vernommen werden soll.

(2) Ihm stehen das Recht zu, Fragen zu stellen, Beweisanträge zu stellen, Erklärungen abzugeben und einen eigenen Schlussvortrag zu halten.

(3) Der Nebenkläger kann gegen das Urteil die zulässigen Rechtsmittel einlegen, soweit es die Tat betrifft, durch die er verletzt ist. Er kann das Urteil nicht allein mit dem Ziel einer anderen Rechtsfolge der Tat anfechten.

(4) Ladungen, Termine und Entscheidungen sind dem Nebenkläger bekanntzugeben.'),
  ('§ 88', 'Wiederaufnahme zugunsten des Verurteilten', 'Abschnitt 12 – Wiederaufnahme des Verfahrens', '(1) Das durch rechtskräftiges Urteil abgeschlossene Verfahren kann zugunsten des Verurteilten wiederaufgenommen werden, wenn

1. ein zu seinen Ungunsten verwertetes Beweismittel unecht oder verfälscht war,
2. ein Zeuge oder Sachverständiger sich bei der Aussage einer vorsätzlich oder fahrlässig falschen Aussage schuldig gemacht hat,
3. ein an dem Urteil mitwirkender Richter oder Beamter eine strafbare Verletzung seiner Amtspflichten begangen hat oder
4. neue Tatsachen oder Beweismittel beigebracht werden, die allein oder in Verbindung mit den früher erhobenen Beweisen geeignet sind, den Freispruch des Verurteilten oder eine wesentlich mildere Bestrafung zu begründen.

(2) Die Wiederaufnahme ist auch nach vollständiger Vollstreckung der Strafe und nach dem Tod des Verurteilten zulässig.'),
  ('§ 89', '(weggefallen)', 'Abschnitt 12 – Wiederaufnahme des Verfahrens', '(weggefallen)'),
  ('§ 90', 'Verfahren der Wiederaufnahme', 'Abschnitt 12 – Wiederaufnahme des Verfahrens', '(1) Der Antrag auf Wiederaufnahme ist schriftlich und unter Angabe der Gründe sowie der Beweismittel zu stellen. Antragsberechtigt sind die Staatsanwaltschaft und der Verurteilte; nach dessen Tod die in § 85 Abs. 2 genannten Angehörigen.

(2) Über den Antrag entscheidet ein anderer Spruchkörper desselben Gerichts oder, wenn ein solcher nicht besteht, das nächsthöhere Gericht.

(3) Wird der Antrag für begründet erachtet, so ordnet das Gericht die Erneuerung der Hauptverhandlung an. Bis zur neuen Entscheidung kann die Vollstreckung ausgesetzt werden.

(4) In der erneuten Hauptverhandlung ist entweder das frühere Urteil aufrechtzuerhalten oder unter seiner Aufhebung neu zu entscheiden. Wird zugunsten des Verurteilten entschieden, findet § 84 auf bereits vollstreckte Strafteile entsprechende Anwendung.'),
  ('§ 91', 'Vollstreckungsbehörde', 'Abschnitt 13 – Strafvollstreckung, Bewährung und Kosten', '(1) Vollstreckungsbehörde ist die Staatsanwaltschaft. Sie vollstreckt die rechtskräftig verhängten Strafen.

(2) Die Staatsanwaltschaft kann sich zur Durchführung der Vollstreckung der Polizeibehörden bedienen.'),
  ('§ 92', 'Beginn und Durchführung der Vollstreckung', 'Abschnitt 13 – Strafvollstreckung, Bewährung und Kosten', '(1) Die Vollstreckung darf erst beginnen, wenn das Urteil rechtskräftig ist. Rechtskräftig ist ein Urteil, durch ihre Verkündung.

(2) Ist das Urteil rechtskräftig, so leitet die Staatsanwaltschaft die Vollstreckung unverzüglich ein.

(3) Bestehen Zweifel über die Auslegung eines Urteils oder über die Berechnung der zu vollstreckenden Strafe, so entscheidet das Gericht, das im ersten Rechtszug erkannt hat.'),
  ('§ 93', 'Vollstreckung der Freiheitsstrafe', 'Abschnitt 13 – Strafvollstreckung, Bewährung und Kosten', '(1) Zur Vollstreckung einer Freiheitsstrafe wird der Verurteilte geladen oder, wenn er sich nicht auf freiem Fuß befindet, unmittelbar zugeführt.

(2) Erscheint der geladene Verurteilte nicht und ist sein Ausbleiben nicht hinreichend entschuldigt, so ordnet die Staatsanwaltschaft die Vorführung an; unter den Voraussetzungen eines Haftgrundes kann das Gericht einen Haftbefehl zur Vollstreckung erlassen.

(3) Die nach § 46 anzurechnende Untersuchungshaft wird auf die zu vollstreckende Strafe angerechnet.'),
  ('§ 94', 'Vollstreckung der Geldstrafe', 'Abschnitt 13 – Strafvollstreckung, Bewährung und Kosten', '(1) Die Geldstrafe ist mit Rechtskraft des Urteils fällig. Die Zahlungsfrist stellt hierbei 14 Tage dar.

(2) Wird die Geldstrafe nicht beigetrieben, so tritt an ihre Stelle eine Ersatzfreiheitsstrafe. Je 3.000 Dollar uneinbringlicher Geldstrafe entspricht einer Hafteinheit. Die Anrechnung und der Ausschluss einer doppelten Vollstreckung wegen desselben offenen Strafgeldbetrags richten sich nach § 95 Absatz 4 des Strafgesetzbuches.

(3) Die Ersatzfreiheitsstrafe entfällt, soweit die Geldstrafe nachträglich entrichtet wird.'),
  ('§ 95', 'Strafaussetzung zur Bewährung', 'Abschnitt 13 – Strafvollstreckung, Bewährung und Kosten', '(1) Das Gericht kann die Vollstreckung einer Freiheitsstrafe von bis zu 60 Hafteinheiten zur Bewährung aussetzen, wenn zu erwarten ist, dass sich der Verurteilte schon die Verurteilung zur Warnung dienen lässt und künftig auch ohne die Vollstreckung keine Straftaten mehr begehen wird.

(2) Bei der Entscheidung sind insbesondere die Persönlichkeit des Verurteilten, sein Vorleben, die Umstände der Tat und sein Verhalten nach der Tat zu berücksichtigen.

(3) Das Gericht bestimmt eine Bewährungszeit. Sie darf die Dauer der ausgesetzten Strafe nicht unterschreiten und das Doppelte nicht überschreiten.'),
  ('§ 96', 'Bewährungsauflagen und Widerruf', 'Abschnitt 13 – Strafvollstreckung, Bewährung und Kosten', '(1) Das Gericht kann dem Verurteilten für die Dauer der Bewährungszeit Auflagen und Weisungen erteilen, insbesondere den Schaden wiedergutzumachen, einen Geldbetrag zugunsten der Staatskasse zu zahlen oder bestimmte Personen oder Orte zu meiden.

(2) Das Gericht widerruft die Aussetzung, wenn der Verurteilte

1. während der Bewährungszeit eine Straftat begeht und dadurch zeigt, dass die Erwartung, die der Aussetzung zugrunde lag, sich nicht erfüllt hat, oder
2. gegen Auflagen oder Weisungen gröblich oder beharrlich verstößt.

(3) Wird die Aussetzung widerrufen, so wird die ursprüngliche Strafe vollstreckt. Leistungen, die der Verurteilte zur Erfüllung von Auflagen erbracht hat, werden nicht erstattet.

(4) Widerruft das Gericht die Aussetzung nicht, so erlässt es die Strafe nach Ablauf der Bewährungszeit.'),
  ('§ 97', 'Kosten des Verfahrens', 'Abschnitt 13 – Strafvollstreckung, Bewährung und Kosten', '(1) Die Kosten des Verfahrens trägt, wer verurteilt wird. Zu den Kosten gehören die Auslagen des Verfahrens und die notwendigen Auslagen der Beteiligten.

(2) Wird der Angeklagte freigesprochen oder das Verfahren eingestellt, so trägt die Staatskasse die Kosten des Verfahrens sowie die notwendigen Auslagen des Angeklagten.

(3) Soweit ein Nebenkläger unterliegt, können ihm die durch seinen Anschluss verursachten Kosten auferlegt werden.

(4) Es gilt eine Beschränkung von 120.000 Dollar, alle weitere Ausgaben welche diesen Betrag übersteigen, tragen die Beteiligten selbst. Das Gericht kann in besonders schweren Verfahren die Beschränkung auf 200.000 Dollar anheben.'),
  ('§ 98', 'Verfolgungsverjährung', 'Abschnitt 14 – Verjährung', '(1) Die Verjährung schließt die Verfolgung einer Straftat aus. Ist die Verjährung eingetreten, so ist ein Verfahren einzustellen; eine begonnene Verfolgung ist zu beenden.

(2) Die Verjährung beginnt, sobald die Tat beendet ist.'),
  ('§ 99', 'Verjährungsfristen', 'Abschnitt 14 – Verjährung', 'Die Verfolgung einer Straftat verjährt in vier Wochen, soweit § 101 nichts anderes bestimmt.'),
  ('§ 100', 'Ruhen und Unterbrechung', 'Abschnitt 14 – Verjährung', '(1) Die Verjährung ruht, solange die Verfolgung aus rechtlichen Gründen nicht begonnen oder nicht fortgesetzt werden kann.

(2) Die Verjährung wird unterbrochen durch

1. die erste Vernehmung des Beschuldigten oder deren Anordnung,
2. den Erlass eines Straf- oder Haftbefehls,
3. die Erhebung der öffentlichen Klage sowie
4. die Eröffnung des Hauptverfahrens.

(3) Nach jeder Unterbrechung beginnt die Verjährung von Neuem.'),
  ('§ 101', 'Unverjährbarkeit', 'Abschnitt 14 – Verjährung', 'Die Verfolgung von Mord (§ 18 Strafgesetzbuch), von Terrorstraftaten (§ 88 Strafgesetzbuch) sowie von Hochverrat (§ 87 Strafgesetzbuch) verjährt nicht.'),
  ('§ 102', 'Besondere Verfahrensregeln bei Terrorstatus', 'Abschnitt 15 – Besondere Verfahrensarten', '(1) Der Terrorstatus nach § 88 Strafgesetzbuch wird in der Regel durch den Court of Appeals zuerkannt. Dieser prüft die Voraussetzungen und die Notwendigkeit der Maßnahme in eigener Zuständigkeit. Der zuerkannte Terrorstatus ist für die Strafverfolgungsbehörden schriftlich zugänglich zu machen.

(2) Wurde der Terrorstatus zuerkannt, so kann die Staatsanwaltschaft besondere Ermittlungsmaßnahmen anordnen, soweit dies zur Abwehr weiterer Gefahren oder zur Aufklärung der Tat erforderlich ist. Als solche kommen in Betracht:

1. eine verlängerte Untersuchungshaft vor Anklageerhebung, sofern der Court of Appeals sie alle drei Tage bestätigt,
2. der Einsatz verdeckter Ermittler,
3. die Überwachung der Telekommunikation ohne vorherige Benachrichtigung des Betroffenen,
4. die Observation an öffentlichen und privaten Orten unter Einsatz technischer Mittel und
5. Durchsuchungen zu jeder Tages- und Nachtzeit bei Gefahr im Verzug.

(3) Der Court of Appeals kann anordnen, dass bestimmte Verfahrensrechte des Beschuldigten vorübergehend eingeschränkt werden, soweit dies für die Sicherheit des Verfahrens oder den Schutz von Zeugen erforderlich ist. Hierzu zählen die Beschränkung der Akteneinsicht, die Anonymisierung von Belastungszeugen und die Zurückhaltung bestimmter Beweismittel bis zur Hauptverhandlung.

(4) Personen mit Terrorstatus sind in gesicherter Form vorzuführen. Die Verhandlung kann in besonderen Sicherheitsgebäuden oder unter Ausschluss der Öffentlichkeit stattfinden.

(5) Gegen die Zuerkennung des Terrorstatus sowie gegen Anordnungen nach Absatz 3 ist die Revision zum Supreme Court zulässig. Sie hemmt den Vollzug der Maßnahmen nicht.

(6) Der Court of Appeals überprüft den Terrorstatus alle sieben Tage. Entfallen die Voraussetzungen, sind alle mit dem Status verbundenen Beschränkungen unverzüglich aufzuheben.

(7) Im Falle eines Freispruchs sind sämtliche mit dem Terrorstatus verbundenen Daten aus den behördlichen Registern zu löschen, soweit kein anderer gesetzlicher Grund für ihre Speicherung besteht.'),
  ('§ 103', 'Sammelakten und Sammelverfahren', 'Abschnitt 15 – Besondere Verfahrensarten', '(1) Bei besonderen Einsatzlagen können mehrere Beschuldigte in einer gemeinsamen Sammelakte erfasst werden. Eine besondere Einsatzlage liegt vor bei Überfällen auf Banken, Geschäfte oder öffentliche Einrichtungen sowie bei sonstigen Ereignissen, bei denen mindestens vier Beschuldigte gemeinschaftlich eine oder mehrere Straftaten begehen.

(2) Allen in der Sammelakte erfassten Beschuldigten werden dieselben Straftaten vorgeworfen; jeder gilt als Mittäter oder Anstifter.

(3) Sammelakten sind prozessfähig.'),
  ('§ 104', 'Allgemeine Vorschriften', 'Abschnitt 16 – Befristete Anordnungen auf Antrag der Polizeibehörden', '(1) Auf Antrag einer Polizeibehörde kann das Gericht die in diesem Abschnitt geregelten Anordnungen treffen, um die Verfolgung, Aufklärung oder Unterbindung von Straftaten zu unterstützen. Die Anordnungen verschaffen den Polizeibehörden für ihre Geltungsdauer die jeweils bestimmten erweiterten Befugnisse.

(2) Der Antrag hat die tatsächlichen Umstände, den verfolgten Zweck, den räumlichen und zeitlichen Umfang sowie, soweit einschlägig, die betroffenen Personen zu bezeichnen.

(3) Jede Anordnung ist zu befristen. Die Frist ist so kurz zu bemessen, wie es der Zweck erfordert, und darf sieben Tage nicht überschreiten; sie kann auf erneuten Antrag durch das Gericht verlängert werden, wenn ihre Voraussetzungen fortbestehen.

(4) Räumlich begrenzte Anordnungen gelten nur für das in der Anordnung bezeichnete Gebiet. Personenbezogene Anordnungen benennen die betroffene Person.

(5) Bei Gefahr im Verzug kann die Staatsanwaltschaft die Anordnungen nach den §§ 105, 106, 111 und 112 vorläufig treffen; sie sind dem Gericht unverzüglich zur Bestätigung vorzulegen und ohne Bestätigung binnen 24 Stunden aufzuheben. Die übrigen Anordnungen dieses Abschnitts bleiben dem Gericht vorbehalten.

(6) Das Gericht hebt die Anordnung auf, sobald ihre Voraussetzungen entfallen. Gegen die Anordnung und gegen ihre Ablehnung ist die Beschwerde zulässig; sie hemmt den Vollzug nicht.

(7) Jede Anordnung muss zur Bedeutung der Sache und zum verfolgten Zweck verhältnismäßig sein. Grundrechtseingriffe sind auf das unerlässliche Maß zu beschränken.'),
  ('§ 105', 'Kontrollstellenanordnung', 'Abschnitt 16 – Befristete Anordnungen auf Antrag der Polizeibehörden', '(1) Das Gericht kann die Einrichtung einer Kontrollstelle an einem öffentlich zugänglichen Ort anordnen, wenn Tatsachen die Annahme rechtfertigen, dass dies zur Ergreifung eines Täters oder zur Sicherstellung von Beweismitteln führt.

(2) An einer Kontrollstelle ist jede Person verpflichtet, ihre Identität feststellen und sich sowie mitgeführte Sachen durchsuchen zu lassen.'),
  ('§ 106', 'Großkontrollanordnung', 'Abschnitt 16 – Befristete Anordnungen auf Antrag der Polizeibehörden', '(1) Ist die Maßnahme zur Ergreifung eines Täters oder zur Sicherstellung von Beweismitteln in einem größeren Bereich erforderlich, so kann das Gericht innerhalb eines räumlich festgelegten Gebiets mehrere Kontrollstellen zugleich anordnen (Großkontrolle).

(2) Innerhalb des festgelegten Gebiets gelten an jeder eingerichteten Kontrollstelle die Befugnisse nach § 105 Absatz 2.'),
  ('§ 107', 'Aufenthaltsverbot', 'Abschnitt 16 – Befristete Anordnungen auf Antrag der Polizeibehörden', '(1) Das Gericht kann einer Person, die einer Straftat verdächtig ist oder bei der Tatsachen die Annahme rechtfertigen, dass sie in einem bestimmten Gebiet Straftaten begehen wird, das Betreten oder den Aufenthalt in einem bestimmten Gebiet verbieten, soweit dies zur Verhinderung weiterer Straftaten oder zur Sicherung der Ermittlungen erforderlich ist.

(2) Ausgenommen sind Orte, an denen die betroffene Person wohnt oder einer erlaubten Erwerbstätigkeit nachgeht, sowie Orte, deren Aufsuchen zur Wahrnehmung berechtigter Interessen unerlässlich ist.'),
  ('§ 108', 'Kontaktverbot', 'Abschnitt 16 – Befristete Anordnungen auf Antrag der Polizeibehörden', 'Das Gericht kann einer Person untersagen, zu bestimmten anderen Personen Kontakt aufzunehmen, wenn dies zur Sicherung der Ermittlungen, insbesondere zum Schutz von Zeugen oder Mitbeschuldigten vor Einwirkung, oder zur Verhinderung weiterer Straftaten erforderlich ist.'),
  ('§ 109', 'Näherungsverbot', 'Abschnitt 16 – Befristete Anordnungen auf Antrag der Polizeibehörden', 'Das Gericht kann einer Person untersagen, sich bestimmten Personen oder bestimmten Orten bis auf einen festgelegten Abstand zu nähern, insbesondere zum Schutz von Verletzten und Zeugen.'),
  ('§ 110', 'Gefährdereinstufung', 'Abschnitt 16 – Befristete Anordnungen auf Antrag der Polizeibehörden', '(1) Das Gericht kann eine Person, bei der aufgrund bestimmter Tatsachen anzunehmen ist, dass sie eine Straftat von erheblicher Bedeutung begehen wird, für die Dauer der Anordnung als Gefährder einstufen.

(2) Für die Dauer der Einstufung dürfen die Identität und die mitgeführten Sachen der eingestuften Person auch ohne besonderen Anlass kontrolliert werden.

(3) Mit der Einstufung können ein Aufenthaltsverbot (§ 107), ein Kontaktverbot (§ 108) oder ein Näherungsverbot (§ 109) verbunden werden.'),
  ('§ 111', 'Waffenverbotszone', 'Abschnitt 16 – Befristete Anordnungen auf Antrag der Polizeibehörden', '(1) Das Gericht kann für ein bestimmtes Gebiet anordnen, dass das Mitführen von Waffen und gefährlichen Gegenständen verboten ist.

(2) Innerhalb der Zone sind die Polizeibehörden befugt, Personen und mitgeführte Sachen auch ohne besonderen Anlass auf Waffen und gefährliche Gegenstände zu durchsuchen. § 105 Absatz 2 gilt entsprechend.

(3) Der Begriff der Waffe bestimmt sich nach dem Waffengesetz.'),
  ('§ 112', 'Kriminalitätsschwerpunkt', 'Abschnitt 16 – Befristete Anordnungen auf Antrag der Polizeibehörden', '(1) Das Gericht kann ein Gebiet, in dem wiederholt Straftaten von erheblicher Bedeutung begangen werden, für die Dauer der Anordnung als Kriminalitätsschwerpunkt ausweisen.

(2) Innerhalb des Gebiets dürfen die Polizeibehörden die Identität von Personen feststellen und mitgeführte Sachen durchsuchen, ohne dass ein besonderer Anlass vorliegen muss.'),
  ('§ 113', 'Demonstrationsauflagen', 'Abschnitt 16 – Befristete Anordnungen auf Antrag der Polizeibehörden', 'Das Gericht kann für eine Versammlung unter freiem Himmel Auflagen festlegen, insbesondere zu Ort, Zeit, Streckenführung, Dauer und Teilnehmerzahl, wenn dies zur Abwehr von Gefahren für die öffentliche Sicherheit erforderlich ist. Das Recht, sich zu versammeln, darf nur so weit eingeschränkt werden, wie es der Zweck der Auflage zwingend erfordert.'),
  ('§ 114', 'Demonstrationsverbot', 'Abschnitt 16 – Befristete Anordnungen auf Antrag der Polizeibehörden', 'Das Gericht kann eine bestimmte Versammlung unter freiem Himmel verbieten, wenn nach den erkennbaren Umständen eine unmittelbare Gefahr für Leib, Leben oder bedeutende Sachwerte besteht und mildere Mittel, insbesondere Auflagen nach § 113, nicht ausreichen. Das Verbot ist zu begründen.'),
  ('§ 115', 'Versammlungsverbot', 'Abschnitt 16 – Befristete Anordnungen auf Antrag der Polizeibehörden', 'Das Gericht kann für ein bestimmtes Gebiet und einen bestimmten Zeitraum Versammlungen verbieten, wenn dies zur Abwehr einer unmittelbaren, auf andere Weise nicht abwendbaren Gefahr für die öffentliche Sicherheit unerlässlich ist. Das Verbot ist räumlich und zeitlich eng zu begrenzen.')
) as v(nummer, titel, abschnitt, text) where lower(g.kuerzel) = lower('StPO');

-- ---------- BGB – Bürgerliches Gesetzbuch (29 Einträge) ----------
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

-- ---------- LPolG – Landespolizeigesetz (27 Einträge) ----------
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

-- ---------- StVO – Straßenverkehrsordnung (27 Einträge) ----------
insert into public.gesetzbuecher (kuerzel, titel, beschreibung, farbe, sortierung)
select 'StVO', 'Straßenverkehrsordnung', 'Verkehrsregeln, Höchstgeschwindigkeiten, Sonderrechte, Ordnungswidrigkeiten, Verkehrspunkte und Bußgeldkatalog.', 'blau', 35
where not exists (select 1 from public.gesetzbuecher where lower(kuerzel) = lower('StVO'));
update public.gesetzbuecher set titel = 'Straßenverkehrsordnung', beschreibung = 'Verkehrsregeln, Höchstgeschwindigkeiten, Sonderrechte, Ordnungswidrigkeiten, Verkehrspunkte und Bußgeldkatalog.'
  where lower(kuerzel) = lower('StVO');
delete from public.paragraphen where gesetzbuch_id = (select id from public.gesetzbuecher where lower(kuerzel) = lower('StVO'));
insert into public.paragraphen (gesetzbuch_id, nummer, titel, abschnitt, text)
select g.id, v.nummer, v.titel, v.abschnitt, v.text from public.gesetzbuecher g, (values
  ('§ 1', 'Begriffsbestimmungen', 'Kapitel 1 – Begriffsbestimmungen', '(1) Polizeibehörden im Sinne dieser Verordnung sind alle Strafverfolgungsbehörden, die Militärpolizei sowie besonders ernannte Ermittlungspersonen der Staatsanwaltschaft.

(2) Polizeibeamte im Sinne dieser Verordnung sind Mitarbeiter und Beamte von Strafverfolgungsbehörden, der Militärpolizei sowie besonders ernannte Ermittlungspersonen der Staatsanwaltschaft.

(3) Ein Kraftfahrzeug ist ein Landfahrzeug, welches durch Maschinenkraft bewegt werden kann und nicht an die Bahngleise gebunden ist.

(4) Ein Personenkraftwagen, kurz PKW, ist ein Kraftfahrzeug, das zur Beförderung von Personen und deren Gepäck bestimmt ist. Es verfügt über maximal 8 Sitzplätze außer dem Fahrersitz - dementsprechend insgesamt 9 Sitzplätze.

(5) Ein Lastkraftwagen, kurz LKW, ist ein Kraftfahrzeug, das zur Beförderung von Gütern bestimmt ist. Der Fokus bei diesen Fahrzeugen liegt auf dem Transport von Waren und Gütern, weshalb der Fahrgastraum im Verhältnis zur Ladefläche stark begrenzt ist.

(6) Wird ein Personenkraftwagen durch technische Veränderungen erheblich höhergelegt oder baulich verändert, bleibt die Einstufung als Personenkraftwagen erhalten, sofern eine schriftliche Einzelabnahme durch eine Werkstatt mit mindestens einem Kfz-Meister erfolgt ist und keine Gefahr für den Straßenverkehr oder Personen besteht.'),
  ('§ 2', 'Grundregeln', 'Kapitel 2 – Allgemeine Verkehrsregeln', '(1) Die Teilnahme am Straßenverkehr erfordert ständige Vorsicht und gegenseitige Rücksicht.

(2) Wer am Verkehr teilnimmt, hat sich so zu verhalten, dass kein Anderer geschädigt, gefährdet oder mehr, als nach den Umständen unvermeidbar, behindert oder belästigt wird.'),
  ('§ 3', 'Straßenbenutzung durch Fahrzeuge', 'Kapitel 2 – Allgemeine Verkehrsregeln', '(1) Fahrzeuge müssen die Fahrbahnen benutzen. Seitenstreifen sind nicht Bestandteil der Fahrbahn.

(2) Wer ein Fahrzeug mit gefährlichen Gütern führt, muss stets jede Gefährdung Anderer ausschließen.

(3) Mit Fahr- und Krafträdern darf nebeneinander gefahren werden, wenn dadurch der Verkehr nicht behindert wird; andernfalls muss einzeln hintereinander gefahren werden.'),
  ('§ 4', 'Geschwindigkeit', 'Kapitel 2 – Allgemeine Verkehrsregeln', '(1) Wer ein Fahrzeug führt, darf nur so schnell fahren, dass das Fahrzeug ständig beherrscht wird. Die Geschwindigkeit ist insbesondere den Straßen-, Verkehrs-, Sicht- und Wetterverhältnissen sowie den persönlichen Fähigkeiten und den Eigenschaften von Fahrzeug und Ladung anzupassen. Es darf nur so schnell gefahren werden, dass innerhalb der übersehbaren Strecke gehalten werden kann. Auf Fahrbahnen, die so schmal sind, dass dort entgegenkommende Fahrzeuge gefährdet werden könnten, muss so langsam gefahren werden, dass mindestens innerhalb der Hälfte der übersehbaren Strecke gehalten werden kann.

(2) Die zulässige Höchstgeschwindigkeit beträgt auch unter günstigsten Umständen

1. innerhalb geschlossener Ortschaften für alle Kraftfahrzeuge 120 km/h,
2. außerhalb geschlossener Ortschaften für Lastkraftwagen, Wohnwagen und Kraftomnibusse 140 km/h,
3. außerhalb geschlossener Ortschaften für Personenkraftwagen und Krafträder 160 km/h.

(3) Die Geschwindigkeitsbeschränkung nach Absatz 2 gilt nicht auf Highways und Freeways sowie auf anderen Straßen mit durch bauliche Einrichtungen getrennten Fahrbahnen für eine Richtung.'),
  ('§ 5', 'Überholen', 'Kapitel 2 – Allgemeine Verkehrsregeln', '(1) Es ist links zu überholen.

(2) Überholen darf nur, wer übersehen kann, dass während des ganzen Überholvorgangs jede Behinderung des Gegenverkehrs ausgeschlossen ist. Überholen darf ferner nur, wer mit wesentlich höherer Geschwindigkeit als der zu Überholende fährt.

(3) Das Überholen ist bei unklarer Verkehrslage unzulässig.'),
  ('§ 6', 'Vorfahrt', 'Kapitel 2 – Allgemeine Verkehrsregeln', '(1) An Kreuzungen und Einmündungen hat die Vorfahrt, wer von rechts kommt. Das gilt nicht für Fahrzeuge, die aus einem Feld- oder Waldweg auf eine Straße kommen.

(2) Wer die Vorfahrt zu beachten hat, muss rechtzeitig durch sein Fahrverhalten, insbesondere durch mäßige Geschwindigkeit, erkennen lassen, dass gewartet wird. Es darf nur weitergefahren werden, wenn übersehen werden kann, dass der Vorfahrtberechtigte weder gefährdet noch wesentlich behindert wird. Ist die Straßenstelle unübersichtlich, so darf sich vorsichtig in die Kreuzung oder Einmündung hineingetastet werden, bis die Übersicht gegeben ist. Wer die Vorfahrt hat, darf auch beim Abbiegen nicht wesentlich durch den Wartepflichtigen behindert werden.'),
  ('§ 7', 'Abbiegen, Wenden und Rückwärtsfahren', 'Kapitel 2 – Allgemeine Verkehrsregeln', '(1) Wer abbiegen will, muss entgegenkommende Fahrzeuge durchfahren lassen. Auf zu Fuß Gehende ist besondere Rücksicht zu nehmen; wenn nötig, ist zu warten.

(2) Wer nach links abbiegen will, muss entgegenkommende Fahrzeuge, die ihrerseits nach rechts abbiegen wollen, durchfahren lassen. Einander entgegenkommende Fahrzeuge, die jeweils nach links abbiegen wollen, müssen voreinander abbiegen, es sei denn, die Verkehrslage oder die Gestaltung der Kreuzung erfordert, erst dann abzubiegen, wenn die Fahrzeuge aneinander vorbeigefahren sind.

(3) Wer ein Fahrzeug führt, muss sich beim Abbiegen in ein Grundstück, beim Wenden und beim Rückwärtsfahren so verhalten, dass eine Gefährdung anderer Verkehrsteilnehmer ausgeschlossen ist.'),
  ('§ 8', 'Halten und Parken', 'Kapitel 2 – Allgemeine Verkehrsregeln', '(1) Das Halten ist unzulässig

1. an engen und unübersichtlichen Straßenstellen,
2. im Bereich von scharfen Kurven,
3. auf Ein- und Ausfädelungsstreifen sowie
4. vor und in gekennzeichneten Ein- und Ausfahrten von Kliniken und Polizeibehörden.

(2) Wer sein Fahrzeug verlässt oder länger als drei Minuten hält, der parkt.

(3) Das Parken ist unzulässig

1. vor und hinter Kreuzungen und Einmündungen bis zu je 5 m von den Schnittpunkten der Fahrbahnkanten,
2. wenn es die Benutzung gekennzeichneter Parkflächen verhindert, sowie
3. vor Grundstücksein- und -ausfahrten, auf schmalen Fahrbahnen auch ihnen gegenüber.

(4) Es ist platzsparend zu parken; das gilt in der Regel auch für das Halten.'),
  ('§ 9', 'Sorgfaltspflichten beim Ein- und Aussteigen', 'Kapitel 2 – Allgemeine Verkehrsregeln', '(1) Wer ein- oder aussteigt, muss sich so verhalten, dass eine Gefährdung anderer Verkehrsteilnehmer ausgeschlossen ist.

(2) Wer ein Fahrzeug führt, muss die nötigen Maßnahmen treffen, um Unfälle oder Verkehrsstörungen zu vermeiden, wenn das Fahrzeug verlassen wird. Kraftfahrzeuge sind auch gegen unbefugte Benutzung zu sichern.'),
  ('§ 10', 'Beleuchtung', 'Kapitel 2 – Allgemeine Verkehrsregeln', '(1) Während der Dämmerung, bei Dunkelheit oder wenn die Sichtverhältnisse es sonst erfordern, sind die vorgeschriebenen Beleuchtungseinrichtungen zu benutzen. Diese dürfen nicht verdeckt, beschädigt oder verschmutzt sein.

(2) Suchscheinwerfer dürfen nur kurz und nicht zum Beleuchten der Fahrbahn benutzt werden.'),
  ('§ 11', 'Highways und Freeways', 'Kapitel 2 – Allgemeine Verkehrsregeln', '(1) Highways und Freeways dürfen nur mit Kraftfahrzeugen benutzt werden, deren bauartbestimmte Höchstgeschwindigkeit mehr als 100 km/h beträgt.

(2) Auf Highways und Freeways darf nur an gekennzeichneten oder direkt angeschlossenen Anschlussstellen, Kreuzungen oder Einmündungen aufgefahren werden.

(3) Der Verkehr auf der durchgehenden Fahrbahn hat die Vorfahrt.

(4) Für die Geschwindigkeit gilt § 4 Absatz 3 entsprechend.

(5) Wenden und Rückwärtsfahren sind verboten.

(6) Das Halten und Parken außerhalb eines Notfalls oder der Erfüllung hoheitlicher Aufgaben, auch auf dem Seitenstreifen, ist verboten.

(7) Zu Fuß Gehende dürfen Highways und Freeways nicht betreten.'),
  ('§ 12', 'Sonstige Pflichten von Fahrzeugführenden', 'Kapitel 2 – Allgemeine Verkehrsregeln', '(1) Wer ein Fahrzeug führt, ist dafür verantwortlich, dass Sicht und Gehör nicht durch die Besetzung, Geräte oder den Zustand des Fahrzeugs beeinträchtigt werden. Er hat zudem dafür zu sorgen, dass Fahrzeug, Gespann und Ladung vorschriftsmäßig sind und dass die Verkehrssicherheit durch die Ladung oder die Besetzung nicht leidet.

(2) Wer ein Fahrzeug führt, muss das Fahrzeug oder das Gespann auf dem kürzesten Weg aus dem Verkehr ziehen, falls unterwegs auftretende Mängel, welche die Verkehrssicherheit wesentlich beeinträchtigen, nicht alsbald beseitigt werden.'),
  ('§ 13', 'Fußgänger', 'Kapitel 2 – Allgemeine Verkehrsregeln', 'Wer zu Fuß geht, muss die Gehwege benutzen. Auf der Fahrbahn darf nur gegangen werden, wenn die Straße weder einen Gehweg noch einen Seitenstreifen hat. Fahrbahnen sind unter Beachtung des Fahrzeugverkehrs zügig auf dem kürzesten Weg quer zur Fahrtrichtung zu überschreiten.'),
  ('§ 14', 'Verbände', 'Kapitel 2 – Allgemeine Verkehrsregeln', '(1) Für geschlossene Verbände gelten die für den gesamten Fahrverkehr einheitlich bestehenden Verkehrsregeln und Anordnungen sinngemäß.

(2) Geschlossen ist ein Verband, wenn er für andere Verkehrsteilnehmer als solcher deutlich erkennbar ist. Dazu muss jedes einzelne Fahrzeug als zum Verband gehörig gekennzeichnet sein.

(3) Wer einen Verband führt, hat dafür zu sorgen, dass die für geschlossene Verbände geltenden Vorschriften befolgt werden.

(4) Veranstaltungen, für die die Straßen mehr als verkehrsüblich in Anspruch genommen werden, insbesondere Kraftfahrzeugrennen, bedürfen der Erlaubnis des Gerichts. Eine solche Inanspruchnahme liegt vor, wenn die Benutzung der Straße für den Verkehr aufgrund der Anzahl oder des Verhaltens der Teilnehmenden oder der Fahrweise der Beteiligten eingeschränkt wird; Kraftfahrzeuge in geschlossenem Verband nehmen die Straße stets mehr als verkehrsüblich in Anspruch.'),
  ('§ 15', 'Verkehrshindernisse', 'Kapitel 2 – Allgemeine Verkehrsregeln', 'Es ist verboten, die Straße zu beschmutzen oder zu benetzen oder Gegenstände auf Straßen zu bringen oder dort liegen zu lassen, wenn dadurch der Verkehr gefährdet oder erschwert werden kann. Wer für solche verkehrswidrigen Zustände verantwortlich ist, hat diese unverzüglich zu beseitigen und bis dahin ausreichend kenntlich zu machen. Verkehrshindernisse sind, wenn nötig, mit eigener Lichtquelle zu beleuchten oder durch andere zugelassene lichttechnische Einrichtungen kenntlich zu machen.'),
  ('§ 16', 'Unfall', 'Kapitel 2 – Allgemeine Verkehrsregeln', '(1) Nach einem Verkehrsunfall hat, wer daran beteiligt ist,

1. unverzüglich zu halten,
2. den Verkehr zu sichern und bei geringfügigem Schaden unverzüglich beiseitezufahren,
3. sich über die Unfallfolgen zu vergewissern und
4. Verletzten zu helfen (§ 53 des Strafgesetzbuches).

(2) Beteiligt an einem Verkehrsunfall ist jede Person, deren Verhalten nach den Umständen zum Unfall beigetragen haben kann.

(3) Unfallspuren dürfen nicht beseitigt werden, bevor die notwendigen Feststellungen durch Polizeibehörden getroffen worden sind.'),
  ('§ 17', 'Sonderrechte', 'Kapitel 2 – Allgemeine Verkehrsregeln', '(1) Von den Vorschriften dieser Verordnung sind die Polizeibehörden, die Nationalgarde sowie die Staatsanwaltschaft befreit, soweit dies zur Erfüllung hoheitlicher Aufgaben dringend geboten ist.

(2) Fahrzeuge des Rettungsdienstes sind von den Vorschriften dieser Verordnung befreit, wenn höchste Eile geboten ist, um Menschenleben zu retten oder schwere gesundheitliche Schäden abzuwenden.

(3) Fahrzeuge, die dem Bau, der Unterhaltung oder Reinigung der Straßen und Anlagen im Straßenraum oder der Müllabfuhr dienen, dürfen auf allen Straßen und Straßenteilen und auf jeder Straßenseite in jeder Richtung zu allen Zeiten fahren und halten, soweit ihr Einsatz dies erfordert.

(4) Die Sonderrechte dürfen nur unter gebührender Berücksichtigung der öffentlichen Sicherheit und Ordnung ausgeübt werden.'),
  ('§ 18', 'Zeichen und Weisungen von Polizeibeamten', 'Kapitel 3 – Verkehrszeichen und sonstige Einrichtungen', '(1) Die Zeichen und Weisungen von Polizeibeamten sind zu befolgen. Sie gehen allen anderen Anordnungen und sonstigen Regeln vor, entbinden den Verkehrsteilnehmer jedoch nicht von seiner Sorgfaltspflicht.

(2) Polizeibeamte dürfen Verkehrsteilnehmer zur Verkehrskontrolle einschließlich der Kontrolle der Verkehrstüchtigkeit und zu Verkehrserhebungen anhalten. Das Zeichen zum Anhalten kann auch durch geeignete technische Einrichtungen am Einsatzfahrzeug gegeben werden. Mit diesem Zeichen kann auch ein vorausfahrender Verkehrsteilnehmer angehalten werden. Die Verkehrsteilnehmer haben die Anweisungen der Polizeibeamten zu befolgen.'),
  ('§ 19', 'Blaues, rotes und gelbes Blinklicht', 'Kapitel 3 – Verkehrszeichen und sonstige Einrichtungen', '(1) Blaues oder rotes Blinklicht zusammen mit einer Sirene darf nur verwendet werden, wenn höchste Eile geboten ist, um Menschenleben zu retten, schwere gesundheitliche Schäden abzuwenden, eine Gefahr für die öffentliche Sicherheit oder Ordnung abzuwenden, flüchtige Personen zu verfolgen oder bedeutende Sachwerte zu erhalten. Es ordnet an: „Alle übrigen Verkehrsteilnehmer haben sofort freie Bahn zu schaffen.“

(2) Blaues oder rotes Blinklicht allein darf nur von den damit ausgerüsteten Fahrzeugen und nur zur Warnung an Unfall- oder sonstigen Einsatzstellen, bei Einsatzfahrten oder bei der Begleitung von Fahrzeugen oder geschlossenen Verbänden verwendet werden.

(3) Gelbes Blinklicht warnt vor Gefahren. Es kann ortsfest oder von Fahrzeugen aus verwendet werden. Die Verwendung von Fahrzeugen aus ist nur zulässig, um vor Arbeits- oder Unfallstellen, vor ungewöhnlich langsam fahrenden Fahrzeugen oder vor Fahrzeugen mit ungewöhnlicher Breite, Länge oder Ladung zu warnen.'),
  ('§ 20', 'Verkehrseinrichtungen', 'Kapitel 3 – Verkehrszeichen und sonstige Einrichtungen', '(1) Verkehrseinrichtungen sind Schranken, Sperrpfosten, Absperrgeräte sowie Leiteinrichtungen. Die durch Verkehrseinrichtungen gekennzeichneten oder abgegrenzten Straßenflächen darf der Verkehrsteilnehmer nicht befahren.

(2) Regelungen durch Verkehrseinrichtungen gehen den allgemeinen Verkehrsregeln vor.'),
  ('§ 21', 'Sonstige Befugnisse', 'Kapitel 3 – Verkehrszeichen und sonstige Einrichtungen', 'Die Polizeibehörden können die Benutzung bestimmter Straßen oder Straßenstrecken aus Gründen der Sicherheit oder Ordnung des Verkehrs beschränken oder verbieten und den Verkehr umleiten. Das gleiche Recht haben sie

1. zur Durchführung von Arbeiten im Straßenraum,
2. zur Verhütung außerordentlicher Schäden an der Straße,
3. hinsichtlich der zur Erhaltung der öffentlichen Sicherheit erforderlichen Maßnahmen,
4. zur Erforschung des Unfallgeschehens oder von Straftaten, des Verkehrsverhaltens und der Verkehrsabläufe sowie zur Erprobung geplanter verkehrssichernder oder verkehrsregelnder Maßnahmen und
5. zur Errichtung temporärer Kontrollstellen, die dem Zweck dienen, die Fahrtauglichkeit von Kraftfahrzeugführern, ihre Fahrerlaubnis und sonstige den Straßenverkehr betreffende Lizenzen sowie ihre Kraftfahrzeuge auf Schäden und Funktion zu überprüfen.'),
  ('§ 22', 'Ordnungswidrigkeiten', 'Kapitel 4 – Ordnungswidrigkeiten', '(1) Ordnungswidrig im Sinne dieser Verordnung handelt, wer vorsätzlich oder fahrlässig gegen eine Vorschrift über

1. das allgemeine Verhalten im Straßenverkehr nach § 2,
2. die Straßenbenutzung durch Fahrzeuge nach § 3,
3. die Geschwindigkeit nach § 4,
4. das Überholen nach § 5,
5. die Vorfahrt nach § 6,
6. das Abbiegen, Wenden oder Rückwärtsfahren nach § 7,
7. das Halten oder Parken nach § 8,
8. die Sorgfaltspflicht beim Ein- oder Aussteigen nach § 9,
9. die Beleuchtung nach § 10,
10. die Benutzung von Highways und Freeways nach § 11,
11. sonstige Pflichten des Fahrzeugführers nach § 12,
12. das Verhalten als zu Fuß Gehender nach § 13,
13. das Bereiten, Beseitigen und Kenntlichmachen von verkehrswidrigen Zuständen nach § 15 oder
14. das Verhalten bei einem Verkehrsunfall nach § 16

verstößt.

(2) Ordnungswidrig handelt auch, wer vorsätzlich oder fahrlässig

1. ein Zeichen oder eine Weisung eines Polizeibeamten nicht befolgt (§ 18),
2. widerrechtlich blaues, rotes oder gelbes Blinklicht verwendet oder nicht sofort freie Bahn schafft (§ 19),
3. eine abgesperrte Straßenfläche befährt (§ 20 Absatz 1) oder
4. einer den Verkehr verbietenden oder beschränkenden Anordnung, die bekannt gegeben worden ist, zuwiderhandelt (§ 21).'),
  ('§ 23', 'Verkehrspunkte und Entzug der Fahrerlaubnis', 'Kapitel 4 – Ordnungswidrigkeiten', '(1) Ordnungswidrigkeiten werden nach Maßgabe des Bußgeldkatalogs (Kapitel 5) mit Verkehrspunkten bewertet.

(2) Bei Erreichen oder Überschreiten von zehn Verkehrspunkten wird die Fahrerlaubnis durch die Polizeibehörden entzogen.

(3) Der Entzug der Fahrerlaubnis kann durch das Gericht überprüft werden. Erweist sich der Entzug als rechtswidrig, so ist die Fahrerlaubnis auf gerichtliche Anordnung wiederherzustellen.

(4) Das Nähere zur Fahrerlaubnis regelt die Fahrerlaubnisverordnung.'),
  ('§ 24', 'Bußgeld bei allgemeinen Ordnungswidrigkeiten', 'Kapitel 5 – Bußgeldkatalog', '(1) Bei Ordnungswidrigkeiten nach § 22 Absatz 1 Nummer 1, 2 und 4 bis 14 kann das Bußgeld im Ermessen des sachbearbeitenden Beamten verhängt werden. Hierbei ist die Verhältnismäßigkeit zur begangenen Tat zu wahren. Das einzelne Bußgeld darf 25.000 Dollar nicht überschreiten.

(2) Bei Ordnungswidrigkeiten nach § 22 Absatz 2 Nummer 1 bis 4 kann das Bußgeld im Ermessen des sachbearbeitenden Beamten verhängt werden. Hierbei ist die Verhältnismäßigkeit zur begangenen Tat zu wahren. Das einzelne Bußgeld darf 25.000 Dollar nicht überschreiten.

(3) Ausnahmen von den Höchstbeträgen nach Absatz 1 und Absatz 2 müssen durch ein Gericht genehmigt und bestätigt werden.'),
  ('§ 25', 'Bußgeld bei Geschwindigkeitsüberschreitungen innerhalb geschlossener Ortschaften', 'Kapitel 5 – Bußgeldkatalog', '(1) Die Höhe des Bußgeldes und die Anzahl der Verkehrspunkte bei Geschwindigkeitsüberschreitungen innerhalb geschlossener Ortschaften richten sich nach folgender Tabelle:

• bis 20 km/h: $5.000, 0 Punkte
• ab 21 bis 30 km/h: $10.000, 1 Punkt
• ab 31 bis 40 km/h: $15.000, 2 Punkte
• ab 41 bis 50 km/h: $22.000, 3 Punkte
• ab 51 bis 60 km/h: $30.000, 4 Punkte
• ab 61 bis 100 km/h: $45.000, 5 Punkte
• über 101 km/h: $75.000, Führerscheinentzug

(2) Bei Geschwindigkeitsüberschreitungen, die durch automatische Geschwindigkeitsmessanlagen erfasst werden, werden das Bußgeld und die Verkehrspunkte nach Absatz 1 jeweils halbiert.'),
  ('§ 26', 'Bußgeld bei Geschwindigkeitsüberschreitungen außerhalb geschlossener Ortschaften', 'Kapitel 5 – Bußgeldkatalog', 'Die Höhe des Bußgeldes und die Anzahl der Verkehrspunkte bei Geschwindigkeitsüberschreitungen außerhalb geschlossener Ortschaften richten sich nach folgender Tabelle:

• bis 20 km/h: $3.000, 0 Punkte
• ab 21 bis 30 km/h: $7.500, 0 Punkte
• ab 31 bis 40 km/h: $12.000, 1 Punkt
• ab 41 bis 50 km/h: $18.000, 2 Punkte
• ab 51 bis 60 km/h: $25.000, 4 Punkte
• ab 61 bis 100 km/h: $40.000, 5 Punkte
• über 101 km/h: $75.000, Führerscheinentzug'),
  ('§ 27', 'Verteilung von Bußgeldeinnahmen', 'Kapitel 5 – Bußgeldkatalog', '(1) Von jedem rechtskräftig verhängten Bußgeld werden 25 Prozent an den sachbearbeitenden Beamten ausgezahlt.

(2) Die verbleibenden 75 Prozent fließen in die Staatskasse der jeweils ausstellenden Polizeibehörde.

(3) Wird ein Bußgeld durch ein Gericht aufgehoben oder nachträglich für rechtswidrig erklärt, so entfällt der Anspruch auf die Auszahlung vollständig.')
) as v(nummer, titel, abschnitt, text) where lower(g.kuerzel) = lower('StVO');

-- ---------- WaffG – Waffengesetz (16 Einträge) ----------
insert into public.gesetzbuecher (kuerzel, titel, beschreibung, farbe, sortierung)
select 'WaffG', 'Waffengesetz', 'Waffenschein und Sonderwaffenschein, Erlaubnisvoraussetzungen, Waffenhandel und zugelassene Waffen.', 'gruen', 38
where not exists (select 1 from public.gesetzbuecher where lower(kuerzel) = lower('WaffG'));
update public.gesetzbuecher set titel = 'Waffengesetz', beschreibung = 'Waffenschein und Sonderwaffenschein, Erlaubnisvoraussetzungen, Waffenhandel und zugelassene Waffen.'
  where lower(kuerzel) = lower('WaffG');
delete from public.paragraphen where gesetzbuch_id = (select id from public.gesetzbuecher where lower(kuerzel) = lower('WaffG'));
insert into public.paragraphen (gesetzbuch_id, nummer, titel, abschnitt, text)
select g.id, v.nummer, v.titel, v.abschnitt, v.text from public.gesetzbuecher g, (values
  ('§ 1', 'Gegenstand und Zweck', 'Kapitel 1 – Allgemeine Bestimmungen', 'Dieses Gesetz regelt den Umgang mit Waffen und Munition unter Berücksichtigung der Belange der öffentlichen Sicherheit und Ordnung.'),
  ('§ 2', 'Begriff der Waffe', 'Kapitel 1 – Allgemeine Bestimmungen', '(1) Waffen im Sinne dieses Gesetzes sind

1. Schusswaffen oder ihnen gleichgestellte Gegenstände sowie
2. tragbare Gegenstände, die
    a) ihrem Wesen nach dazu bestimmt sind, die Angriffs- oder Abwehrfähigkeit von Menschen zu beseitigen oder herabzusetzen, insbesondere Hieb- und Stoßwaffen, oder
    b) ohne dazu bestimmt zu sein, insbesondere wegen ihrer Beschaffenheit, Handhabung oder Wirkungsweise geeignet sind, die Angriffs- oder Abwehrfähigkeit von Menschen zu beseitigen oder herabzusetzen.

(2) Den Umgang mit einer Waffe übt aus, wer diese erwirbt, besitzt, überlässt, führt, verbringt, mitnimmt, mit ihr schießt, sie herstellt, bearbeitet, instand setzt oder mit ihr Handel treibt.'),
  ('§ 3', 'Polizeibehörden', 'Kapitel 1 – Allgemeine Bestimmungen', 'Polizeibehörden im Sinne dieses Gesetzes sind alle Strafverfolgungsbehörden, die Militärpolizei sowie die besonders ernannten Ermittlungspersonen der Staatsanwaltschaft.'),
  ('§ 4', 'Ausstellung und Entzug von Waffenscheinen', 'Kapitel 2 – Zuständige Behörden', '(1) Das Los Santos Police Department ist die für Waffenscheine zuständige Behörde. Es stellt Berechtigungsscheine zum Besitz und Führen von Waffen (Waffenscheine) aus. Für die Ausstellung kann eine Gebühr erhoben werden.

(2) Das Los Santos Police Department entzieht einen Waffenschein, wenn eine oder mehrere Erlaubnisvoraussetzungen wegfallen.

(3) Ergeht ein rechtskräftiges Urteil oder eine richterliche Anordnung, so ist der Waffenschein zu entziehen. Den Entzug führt das Los Santos Police Department durch.'),
  ('§ 5', 'Erlaubnis für den Waffenhandel', 'Kapitel 2 – Zuständige Behörden', '(1) Die Staatsanwaltschaft ist die für den Waffenhandel zuständige Behörde. Sie erteilt die Erlaubnis für den Handel mit Waffen an eingetragene, dafür geeignete Gewerbe und entzieht sie, wenn eine oder mehrere Erlaubnisvoraussetzungen wegfallen.

(2) Die Handelserlaubnis setzt eine gültige Waffenlizenz nach der Gewerbeordnung voraus.'),
  ('§ 6', 'Ausnahmen für Behörden', 'Kapitel 2 – Zuständige Behörden', '(1) Dieses Gesetz ist nicht anzuwenden auf

1. die Polizeibehörden,
2. die Staatsanwaltschaft,
3. die National Guard und
4. das Parlament,

soweit dies zur Erfüllung ihrer hoheitlichen Aufgaben zwingend erforderlich ist.

(2) Angehörige des San Andreas Medical Service sind zum Führen eines Elektroimpulsgerätes (Taser) berechtigt.'),
  ('§ 7', 'Persönliche Eignung', 'Kapitel 3 – Erlaubnisvoraussetzungen', '(1) Die erforderliche persönliche Eignung besitzen Personen nicht, wenn Tatsachen die Annahme rechtfertigen, dass sie

1. von Alkohol oder anderen berauschenden Mitteln abhängig oder psychisch krank sind oder in ihrer geistigen Leistungsfähigkeit erheblich eingeschränkt sind oder
2. aufgrund in ihrer Person liegender Umstände mit Waffen oder Munition nicht vorsichtig oder sachgemäß umgehen oder dass die konkrete Gefahr einer Fremd- oder Selbstgefährdung besteht.

(2) Sind Tatsachen bekannt, die Bedenken gegen die persönliche Eignung nach Absatz 1 begründen, oder bestehen begründete Zweifel an den vom Antragsteller beigebrachten Bescheinigungen, so kann die zuständige Behörde der betroffenen Person auf deren Kosten die Vorlage eines amts- oder fachärztlichen oder fachpsychologischen Zeugnisses über die geistige oder körperliche Eignung aufgeben.

(3) Bei der Beantragung eines Sonderwaffenscheins (§ 11) sowie bei jeder erneuten Beantragung nach Ablauf seiner befristeten Gültigkeit ist die Vorlage eines aktuellen medizinisch-psychologischen Gutachtens verpflichtend. Das Gutachten muss von einer nach dem Medizinrecht qualifizierten Person erstellt worden sein und darf zum Zeitpunkt des Antrags nicht älter als vier Wochen sein.'),
  ('§ 8', 'Bedürfnis', 'Kapitel 3 – Erlaubnisvoraussetzungen', '(1) Der Nachweis eines Bedürfnisses ist erbracht, wenn gegenüber den Belangen der öffentlichen Sicherheit oder Ordnung

1. besonders anzuerkennende persönliche oder wirtschaftliche Interessen, insbesondere als Sportschütze oder als Gründer oder Mitarbeiter einer Sicherheitsfirma, und
2. die Geeignetheit und Erforderlichkeit der Waffen oder Munition für den beantragten Zweck

glaubhaft gemacht sind.

(2) Die zuständige Behörde ist berechtigt, dem Antragsteller auf dessen Kosten die Vorlage amtlich beglaubigter Dokumente aufzugeben.

(3) Einer Erlaubnis für den Umgang mit Hieb-, Stich- und Stoßwaffen, die keiner behördlichen Sondererlaubnis unterliegen, bedarf es nicht, wenn der zuständigen Behörde gegenüber glaubhaft gemacht werden kann, dass der Umgang mit diesen Gegenständen für die Ausübung der beruflichen Tätigkeit erforderlich ist.'),
  ('§ 9', 'Besitz und Führen von Waffen', 'Kapitel 4 – Waffenscheine und Sonderwaffenscheine', '(1) Der Umgang mit Hieb-, Stich- sowie Faustfeuerwaffen nach Anlage 1 bedarf der Erlaubnis.

(2) Der Umgang mit allen anderen Waffen, die nicht in Anlage 1 aufgeführt sind, ist verboten.

(3) Der Umgang mit wesentlichen Waffenteilen, die zur Herstellung von Waffen dienen, ist verboten.'),
  ('§ 10', 'Waffenschein', 'Kapitel 4 – Waffenscheine und Sonderwaffenscheine', '(1) Der Waffenschein berechtigt zum Besitz und Führen der in ihm bezeichneten Waffen.

(2) Er wird ausgestellt, wenn der Antragsteller die persönliche Eignung (§ 7) und ein Bedürfnis (§ 8) nachweist.

(3) Personen, die einen Waffenschein besitzen, sind verpflichtet, diesen auf Verlangen einer Polizeibehörde vorzulegen.'),
  ('§ 11', 'Sonderwaffenschein', 'Kapitel 4 – Waffenscheine und Sonderwaffenscheine', '(1) Das Los Santos Police Department kann aus beruflichen Gründen befristete Sonderwaffenscheine ausstellen. Die Befristung darf drei Wochen nicht überschreiten. Durch den Sonderwaffenschein können bestimmte Maschinenpistolen, Langwaffen sowie Elektroimpulsgeräte (Taser) erlaubt werden.

(2) Die Ausstellung setzt voraus, dass der Antragsteller seine persönliche, psychologische und körperliche Eignung nachweist. Hierzu ist mindestens ein aktuelles medizinisch-psychologisches Gutachten vorzulegen. Der Ausstellungsbehörde steht es frei, weitere Nachweise zu verlangen oder Eignungstests durchzuführen.

(3) Das Gutachten hat insbesondere die körperliche Eignung zum sicheren Führen der im Sonderwaffenschein bezeichneten Waffen zu prüfen. Es umfasst mindestens eine Überprüfung der Reaktions- und Sehfähigkeit sowie sonstiger für die Ausstellung relevanter Einschränkungen.

(4) Wird die Eignung nach den Absätzen 2 bis 3 nicht nachgewiesen, so ist die Ausstellung eines Sonderwaffenscheins zu verweigern.'),
  ('§ 12', 'Signalmittel', 'Kapitel 4 – Waffenscheine und Sonderwaffenscheine', '(1) Signalmittel im Sinne dieses Gesetzes sind Signalpistolen und Leuchtfackeln.

(2) Angehörige des San Andreas Medical Service dürfen Signalmittel in Notfällen verwenden und entscheiden selbst, wann und wie sie diese mitführen und einsetzen.

(3) Bei Missbrauch kann die Staatsanwaltschaft zusätzliche Auflagen verhängen.

(4) In schweren Fällen ist ein Verbot der Nutzung und des Mitführens durch einen Gerichtsbeschluss möglich.'),
  ('§ 13', 'Handelserlaubnis', 'Kapitel 5 – Handel mit Waffen', '(1) Die Erlaubnis für den Handel mit Waffen wird auf Antrag durch die Staatsanwaltschaft (§ 5) an eingetragene, dafür geeignete Gewerbe erteilt. Sie kann auf bestimmte Waffen- und Munitionsarten beschränkt werden.

(2) Die Handelserlaubnis ist befristet. Ihre Höchstdauer beträgt sechs Monate; zu ihrem Fortbestand ist sie durch den Antragsteller bei der Staatsanwaltschaft zu erneuern.

(3) Die Staatsanwaltschaft protokolliert die erteilten Handelserlaubnisse mit ihren Einschränkungen und ihrem Ablauf und übergibt dem Antragsteller eine schriftliche Ausfertigung.

(4) Bei einer Überprüfung durch die zuständigen Behörden ist die betroffene Person verpflichtet, die ihr ausgestellte Handelserlaubnis auf Verlangen vorzulegen.

(5) Personen, die eine Handelserlaubnis für Waffen erworben haben, dürfen Waffen nur nach Vorlage eines gültigen Waffenscheins des Käufers verkaufen.'),
  ('§ 14', 'Straftaten', 'Kapitel 6 – Straftaten und Schlussbestimmungen', '(1) Die Strafbarkeit des unerlaubten Umgangs mit Waffen und Waffenteilen entgegen § 9 richtet sich ausschließlich nach § 91 des Strafgesetzbuches.

(2) Die Strafbarkeit des schussbereiten Führens einer Schusswaffe auf öffentlichem Grund richtet sich ausschließlich nach § 92 des Strafgesetzbuches.

(3) Die Strafbarkeit einer gefährdenden Schussabgabe außerhalb dafür vorgesehener Räumlichkeiten oder Plätze richtet sich ausschließlich nach § 93 des Strafgesetzbuches.

(4) Die Begriffsbestimmungen, Erlaubnisse und Ausnahmen dieses Gesetzes bleiben nach Maßgabe der §§ 91 bis 93 des Strafgesetzbuches anwendbar.

(5) Treffen Straftaten nach den §§ 91 bis 93 des Strafgesetzbuches untereinander oder mit anderen Straftaten zusammen, so richtet sich die Gesamtstrafe nach § 3 des Strafgesetzbuches.'),
  ('§ 15', 'Inkrafttreten', 'Kapitel 6 – Straftaten und Schlussbestimmungen', 'Dieses Gesetz tritt mit seiner Verkündung in Kraft und ist für alle natürlichen und juristischen Personen sowie Amtsträger im Geltungsbereich verbindlich.'),
  ('Anlage 1', 'Zugelassene Waffen', 'Anlagen', 'Die nachfolgend aufgeführten Waffen sind nach § 9 erlaubnisfähig. Die mit einem Stern (*) gekennzeichneten Waffen sind ausschließlich den in § 6 genannten Behörden vorbehalten; ihr Besitz oder ihre Nutzung durch andere Behörden oder Zivilpersonen ist nach § 9 verboten.

Zivil zugelassen

Schusswaffen:
• Schwere Pistole
• Pistole
• Klassische Pistole
• SNS Pistole

Stich-, Wurf-, Hieb- und Schlagwaffen:
• Messer
• Axt

Nur den Behörden nach § 6 vorbehalten (*)

Schusswaffen*:
• (Schweres) Scharfschützengewehr
• Spezialkarabiner
• Erweitertes Gewehr
• Karabinergewehr
• Militärgewehr
• Bullpup-Gewehr
• Dienstgewehr
• Pumpgun
• Einsatz-PDW
• Sturm-MP
• SMG
• Gefechtspistole
• Keramik Pistole
• Leuchtpistole
• Elektroimpulswaffe

Stich-, Wurf-, Hieb- und Schlagwaffen*:
• Schlagstock
• Signalfackel
• BZ-Gasgranaten')
) as v(nummer, titel, abschnitt, text) where lower(g.kuerzel) = lower('WaffG');

-- ---------- BtMG – Betäubungsmittelgesetz (8 Einträge) ----------
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

-- ---------- GewO – Gewerbeordnung (23 Einträge) ----------
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

-- ---------- LuftVO – Luftverkehrsordnung (8 Einträge) ----------
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
