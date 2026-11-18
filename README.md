# Wiwang Law – Aktensystem

Gemeinsames Aktensystem für die RP-Kanzlei Wiwang Law.
Anmeldung mit **Discord**; jede Person kann **mehrere RP-Charaktere** haben und über das Logo zwischen ihnen wechseln.
Nur HTML, CSS und JavaScript, ohne Build-Schritt. Die Daten liegen in einer kostenlosen
**Supabase**-Datenbank: Jedes Kanzlei-Mitglied meldet sich an, alle sehen dieselben Daten,
und Änderungen erscheinen bei allen sofort.

## Was das System kann

- **Anmeldung mit Discord & mehrere Charaktere:** Wer auf dem Wiwang-Discord-Server ist, registriert sich mit Discord
  und legt seinen RP-Charakter an; ein Admin gibt die Registrierung frei (Personal → **Accounts**). Danach meldet man sich
  mit Discord an und landet direkt im zuletzt gespielten Charakter. Weitere Charaktere lassen sich beantragen (ebenfalls mit
  Freigabe) und per Klick aufs **Logo** wechseln. Jeder Charakter hat eigenen Rang, eigene Rechte, Aufgaben,
  Benachrichtigungen und Nigel-Chats – man sieht immer nur, was der aktive Charakter sehen darf. Optional ein eigenes
  Passwort für die Anmeldung ohne Discord. Bestehende Mitglieder übernehmen ihren Charakter einmalig mit den alten
  Zugangsdaten. Admin-Rechte gelten für die Person (alle ihre Charaktere). Der Admin sieht unter **Accounts** alle
  Discord-Konten mit ihren Charakteren, gibt frei, lehnt ab, sperrt und ernennt Admins.
- **Mandantenportal:** Auch **Mandanten** registrieren sich mit Discord („Ich bin Mandant“ – ohne Pflicht, auf dem
  Discord-Server zu sein). Wer Mandanten bearbeiten darf, gibt den Zugang unter **Mandanten → Mandantenportal** frei und
  ordnet ihn dabei einem Eintrag der Kartei zu (gleichnamige Einträge werden vorgeschlagen). Der Mandant sieht danach
  ausschließlich sein eigenes Portal:
  - **seine Akten** (als Mandant oder weil er für eine Akte freigeschaltet wurde – Mitmandant, Vertreter, Firma …;
    in der Akte unter **Beteiligte → Mandantenportal**) mit Status, Ansprechpartner, Haft, Tatvorwürfen samt Strafrahmen
    und Ergebnis,
  - **Termine** der Akte (ohne interne Fristen und Wiedervorlagen),
  - **Mitteilungen und Dokumente**, die die Kanzlei im Verlauf bzw. bei den Beweisen ausdrücklich
    **„für Mandant sichtbar“** macht (Häkchen beim Eintragen oder das Auge am Eintrag),
  - **seine Rechnungen** (Ansicht im Briefkopf, Drucken/PDF) und seine Kontaktdaten (Telefon/Adresse selbst änderbar).

  Interne Notizen, Sachverhalt, Aufgaben, Historie, Beteiligte und alles andere sieht er nie – ein Mandanten-Charakter hat
  kein Profil und keine Rechte; die Datenbank gibt ihm nur über `portal_daten()` genau diese Auswahl heraus. Er kann der
  Kanzlei zu jeder Akte **schreiben** (steht im Verlauf als „Nachricht vom Mandanten“, die/der Zuständige wird benachrichtigt)
  und wird selbst benachrichtigt, wenn etwas für ihn freigegeben wird, ein Termin dazukommt, eine Rechnung kommt oder sich
  Status bzw. Ergebnis der Akte ändern. Mitarbeiter können zusätzlich einen Mandanten-Charakter haben und über das Logo wechseln.
- **Übersicht:** Kennzahlen, Termine der nächsten 7 Tage, überfällige Fristen, eigene Aufgaben,
  Mandanten in Haft, dringende Akten, **liegen gebliebene Akten** (offen, seit X Tagen ohne Eintrag, Aufgabe
  oder Termin – mit „Wiedervorlage“ per Klick), **Pinnwand** und **Team heute** (beides direkt auf der Übersicht,
  keine eigene Seite mehr), letzte Aktivitäten im Team, Statistik (Erfolgsquote, Umsatz) und eine **Suche über alles**
  (Taste `/`). Die Übersicht zeigt nur, was der Rang lesen darf.
- **Benachrichtigungen** (Glocke oben rechts, Taste `B`): wenn dir jemand eine Akte, Aufgabe oder einen Termin
  gibt, einen Termin verschiebt, deine Aufgabe erledigt, in deiner Akte etwas einträgt, dich mit **@Name**
  erwähnt oder etwas an die Pinnwand hängt. Live, mit Meldung und auf Wunsch als Desktop-Hinweis, wenn der
  Tab im Hintergrund ist. Die Datenbank schreibt sie selbst und nur an Mitglieder, die den Bereich lesen dürfen.
- **@-Erwähnungen im Verlauf:** `@` tippen, Kollegen aus der Liste wählen – sie werden benachrichtigt.
- **Wer ist online?** Avatare oben in der Kopfzeile; in einer Akte steht, wer sie gerade auch geöffnet hat
  (damit niemand gleichzeitig dasselbe ändert).
- **Pinnwand** (auf der Übersicht): Ankündigungen und Dienstanweisungen für alle, anheften, als „Wichtig“ markieren, mit Ablaufdatum
  und **Lesebestätigung** („3 von 5 bestätigt“, wer fehlt noch). Angeheftete und noch zu bestätigende Beiträge stehen
  immer oben, ältere lassen sich aufklappen, abgelaufene liegen im Archiv. Daneben **Team heute**: wer ist online, wer im
  Urlaub, wie viele Akten, Aufgaben (überfällige) und Termine jede/r heute hat.
- **Abläufe (Checklisten):** Vorlagen wie „Strafverteidigung“, „Haftprüfung“, „Zivilklage“, „Mandat abschließen“.
  In der Akte „Ablauf starten“ (oder direkt beim Anlegen) legt alle Aufgaben mit Fälligkeit und Termine
  (z. B. Wiedervorlage, Frist) auf einmal an; einzelne Schritte lassen sich abwählen. Fortschritt
  („3/7 Aufgaben“) steht in der Aktenliste. Vorlagen pflegt, wer die Kanzlei-Einstellungen bearbeiten darf.
- **Arbeit übergeben:** Bei Urlaub, Krankheit oder Ausscheiden gehen aktive Akten, offene Aufgaben und Termine
  in einem Schritt an eine Vertretung – mit Vermerk im Verlauf jeder Akte und einer Benachrichtigung.
  Wird ein Mitglied auf „Urlaub“/„Krank“ gesetzt, bietet das System die Übergabe direkt an.
- **Akten** mit Tabs:
  - **Überblick:** Mandant, Gegenpartei, Mandatsart, Priorität, Zuständige/r, Aktenzeichen von Polizei/StA/Gericht,
    Haft-Status, **Tatvorwürfe mit Strafrechner** (Geldstrafe und Haft werden summiert), Ergebnis
  - **Verlauf:** Einträge nach Art (Telefonat, Gericht, Polizei …), als „wichtig“ markierbar
  - **Beteiligte:** Zeugen, Beamte, Richter, Staatsanwaltschaft, Gegenseite
  - **Beweise:** Links zu Screenshots und Clips, mit Bildvorschau
  - **Termine, Aufgaben, Rechnungen** zur Akte
  - **Historie:** automatisches Änderungsprotokoll (wer hat wann was geändert)
- **Interessenkonflikt-Prüfung:** Warnung, wenn die Gegenseite anderswo euer Mandant ist oder umgekehrt.
- **Mandantenkartei:** Kontaktdaten, Markierungen (Stammkunde, VIP, zahlt schlecht …), alle Akten,
  frühere Ergebnisse, offene Rechnungen.
- **Kalender & Aufgaben:** Liste und Monatsansicht, Fristen-Warnung, Export in den Handy-Kalender (`.ics`).
- **Finanzen** (ein Menüpunkt für Rechnungen und Buchhaltung): oben die wichtigsten Zahlen (offene und überfällige
  Rechnungen, Zahlungseingang im Monat, Bank & Kasse, Gewinn), darunter Reiter in zwei Gruppen – jede nur mit dem
  passenden Leserecht:
  - **Rechnungen** im Stil der Kanzlei-Vorlage mit Zahlungsstatus und Zahlungserinnerung, dazu der **Gebührenkatalog**
    (lesen mit „Rechnungen lesen“, pflegen mit „Kanzlei-Einstellungen bearbeiten“).
  - **Buchhaltung** (doppelte Buchführung): Bilanz und GuV, Grundbuch mit unveränderbaren Buchungen
    (Korrektur nur per Storno), Hauptbuch mit T-Konten, Summen- und Saldenliste, Kontenplan.
    Rechnungen und Zahlungseingänge werden automatisch gebucht.
- **Gesetze:** alle Gesetzbücher eures Servers (StGB, StVO, Waffengesetz …) im Wortlaut, auf der Übersicht als
  **Kacheln** – ein Gesetzbuch je Kachel. Darin die Paragraphen nach Abschnitten mit Inhaltsverzeichnis, Suche
  (auch über alle Gesetze), Link je Paragraph und „KI fragen“. Gesetzestext lässt sich per **Massenimport** einfach
  einfügen (jede Zeile mit `§ …`/`Art. …` beginnt einen Paragraphen, „Erster Abschnitt …“/„# …“ setzt den Abschnitt).
  Bereits eingepflegt: **Verf** (Verfassung des Staates San Andreas), **StGB**, **StPO**, **BGB**, **ZPO** (Zivilprozessordnung), **LPolG**
  (Landespolizeigesetz), **StVO**, **WaffG**, **BtMG**, **GewO** und **LuftVO** (Luftverkehrsordnung). Die Texte liegen im
  Ordner [`gesetze/`](gesetze); `python3 tools/gesetze-sql.py` erzeugt daraus [`supabase-gesetze.sql`](supabase-gesetze.sql),
  die die Gesetzbücher anlegt bzw. ihre Paragraphen vollständig ersetzt (beliebig oft ausführbar).
- **Strafkatalog & Strafrechner:** Delikte eures Servers mit Geldstrafe und Haft, Massenimport aus Google Sheets/Excel.
- **Dokumente:** Vollmacht, Mandatsvertrag, Antrag auf Haftprüfung, Akteneinsicht,
  Dienstaufsichtsbeschwerde, freier Schriftsatz, Aktenblatt. Die Vorschau lässt sich direkt bearbeiten,
  dann drucken oder als PDF speichern.
- **Personal:** Ränge mit Rechte-Matrix, gruppiert nach Fallarbeit, Finanzen, Recht & KI und Verwaltung – je Bereich
  gestuft **Lesen** → **Bearbeiten** (bei Akten zusätzlich → **Löschen**, bei Nigel **Sehen** → **Verwenden**); jede Stufe
  schließt die vorherigen ein (z. B. alles sehen, nichts ändern). Rang „Sonstiges“ mit
  selbst gewähltem Namen, Status (Aktiv, Urlaub, Krank, Ausgeschieden), Eintritt, Personalnummer,
  vertrauliche Personalakte (Gehalt, Notizen, Vermerke wie Lob oder Abmahnung), Zugang sperren,
  Kanzlei-Einstellungen, Komplettsicherung. Die Datenbank prüft jedes Recht selbst.
- **KI-Assistent „Nigel“** – ein britischer Butler und Jurist, der jeden mit „Sir“ anspricht (genau **ein** Modell über
  **OpenRouter**, derzeit DeepSeek V4.1 Flash, keine Ausweich-Modelle): beantwortet
  **ausschließlich Rechtsfragen** zu den Gesetzen des Servers (auch zu einer gewählten Akte: Rechtslage, Tatbestände,
  Strafrahmen) und lehnt alles andere ab – außer Büroarbeit für die Kanzlei im Modus *Organisatorisch* (Arbeitsbereich). Dafür hat die KI zwei **Werkzeuge**: `gesetze_finden` (Gesetzbücher finden)
  und `paragraphen_finden` (einzelne Paragraphen im Wortlaut per Stichwort/Nummer finden); den Strafkatalog kennt sie direkt.
  Die KI antwortet in **Markdown**, das im Browser mit Showdown in HTML umgewandelt (und mit DOMPurify bereinigt) wird.
  Antworten sind auf **4000 Zeichen** begrenzt – das interne Nachdenken (Reasoning) zählt nicht mit. Unter jeder Antwort
  stehen die nachgeschlagenen Paragraphen (anklickbar). Rechte je Rang in zwei Stufen (wie Lesen/Bearbeiten):
  **Nigel sehen** – das iFruit Duo lässt sich herausholen, zeigt aber nur einen Sperrbildschirm („Berechtigung fehlt“);
  der Arbeitsbereich ist als Vorschau offen (Modi, Beispiele, Reiter), alle Inhalte liegen zensiert unter Milchglas.
  **Nigel verwenden** – volle Nutzung wie bisher (schließt Sehen ein).
  **Anrede:** Im **Mein Profil** wählt jeder Herr, Frau oder Keine Anrede – Nigel sagt dann „Sir“, „Madam“ bzw. nichts –
  pro Charakter, und auch bei „Nigel sehen“.
  **KI-Budget:** US-Dollar pro Kalendermonat – Grundwert je Rang plus Abweichung je Mitglied (+/−), darüber ein
  **Kanzlei-Deckel** (Standard 10 $), alles unter **Personal → Ränge & Berechtigungen → KI-Budget pro Monat** einstellbar.
  Die Dollar-Beträge sieht nur der Admin; alle anderen sehen ihr Kontingent in Prozent.
  Die Übersicht zeigt, was im schlimmsten Fall ausgegeben wird („Wenn alle ausschöpfen“), den bisherigen Verbrauch mit
  Hochrechnung und was eine Anfrage im Schnitt kostet. Der Assistent ist ein faltbares Smartphone der fiktiven Marke „iFruit“, das zugeklappt
  unten rechts aus der Ecke schaut: antippen (oder Taste `K`) holt es heraus. Herausgeholt lässt es sich mit dem
  Klapp-Knopf (oder Doppelklick aufs Scharnier) auf- und zuklappen: zugeklappt ein kompakter Chat auf dem
  Außendisplay, aufgeklappt links Akte und Schnellaktionen, rechts der Chat. `Esc` steckt es wieder ein. Ist eine Akte geöffnet, nimmt es diese als Kontext.
  Die KI sieht nur, was das Mitglied selbst lesen darf. Antworten lassen sich in den Verlauf der Akte übernehmen.
- **Nigels Arbeitsbereich** (Menüpunkt „Nigel“, `#/nigel`) für komplexe juristische Arbeit – das Handy bleibt das schnelle
  Nachschlage-Werkzeug:
  - **Gespeicherte Chats** (links): Suche, Anheften, nach Datum gruppiert, umbenennen, als Markdown exportieren, löschen.
    Jeder sieht nur seine eigenen Chats. Ein Handy-Chat lässt sich mit einem Klick übernehmen („Im Arbeitsbereich fortsetzen“).
  - **Arbeitsmodi:** *Rechtsfrage* (kurz, wie auf dem Handy), *Gutachten* (Gutachtenstil mit Strafrahmen), *Schriftsatz*
    (Anträge, Stellungnahmen, Schreiben – landet direkt im Entwurf) und *Fallanalyse* (Stärken, Risiken, Beweislage, Strategie,
    nächste Schritte, Fragen an den Mandanten). Lange Modi dürfen deutlich längere Antworten schreiben (bis 14 000 Zeichen).
  - **Modus *Organisatorisch*:** Nigel erledigt Büroarbeit selbst – mit den Rechten des Mitglieds (was man von Hand nicht darf,
    darf Nigel auch nicht): **in den Verlauf einer Akte notieren**, **Termine** und **Aufgaben** anlegen (auch für Kollegen),
    anstehende Termine/Aufgaben ansehen, **an die Pinnwand hängen** und **Kollegen auf Discord Bescheid geben**. Beispiel:
    „Gib bitte Niklas Palermo Bescheid, dass ich mich um zehn Minuten verspäte“ → Nigel erwähnt sie im Kanal `#kanzlei-chat`
    mit @ und schreibt ihr im Butler-Ton, darunter klein „im Auftrag von …“. Zeitangaben wie „morgen um 15 Uhr“ rechnet er in
    der Ortszeit des Browsers um. Bei unklaren Namen, Akten oder Zeiten fragt er nach. Unter der Antwort steht, was erledigt
    wurde (mit Link). Alles, was Nigel anlegt, steht auf der Website unter **„Nigel · im Auftrag von …“** (mit seinem Bild) –
    im Akten-Verlauf, an der Pinnwand, bei Terminen, Aufgaben und Benachrichtigungen – und ist aus seiner Sicht geschrieben
    („Im Auftrag von Mr. Miller darf ich mitteilen …“). Als Ersteller bleibt der Auftraggeber gespeichert (Rechte, Protokoll). Grenzen: höchstens 8 Aktionen und 3 Discord-Nachrichten pro Auftrag, Empfänger nur aktive Mitglieder
    (ohne verknüpftes Discord findet Nigel sie über den Namen auf dem Server), keine @everyone-/Rollen-Pings. Einrichtung siehe **Nigel schreibt auf Discord**.
  - **Live-Arbeitsschritte:** Während Nigel arbeitet, sieht man, welche Paragraphen und Akten er gerade nachschlägt (mit Laufzeit
    und „Abbrechen“); unter jeder Antwort bleiben die Schritte aufklappbar.
  - **Kontext** (rechts): bis zu 5 Akten gleichzeitig, bis zu 20 angeheftete Paragraphen im Wortlaut und eigene Notizen zum Sachverhalt.
    Zusätzlich kann Nigel selbst **Akten der Kanzlei durchsuchen und lesen** (z. B. vergleichbare frühere Fälle) – nur mit Leserecht.
  - **Entwurf:** bearbeitbarer Schriftsatz je Chat (Markdown, Vorschau, [Platzhalter] gelb), Antworten „In Entwurf“ übernehmen,
    **von Nigel überarbeiten lassen** (Schnellbefehle wie „Formeller formulieren“ oder eigene Anweisung, mit Rückgängig),
    **mit Briefkopf drucken / als PDF**, kopieren, als `.md` laden oder in den Verlauf der Akte übernehmen.
  - **Aus Antworten handeln:** in den Akten-Verlauf übernehmen, Checklisten („- [ ]“) direkt als **Aufgaben** anlegen,
    Antwort neu erzeugen, frühere Frage ändern und neu stellen.
  - **Quellen:** alle nachgeschlagenen Paragraphen des Chats mit Wortlaut, zum Anheften oder Öffnen.
  - **Vorlagen:** Standard-, Kanzlei- und eigene Vorlagen (Auftrag + Modus). Kanzlei-Vorlagen pflegt, wer die Kanzlei-Einstellungen bearbeiten darf.
  - **Persönliche Einstellungen** (gelten auch fürs Handy): Antwortlänge, Gründlichkeit, Paragraphen-Wortlaut zitieren,
    Standardmodus, Senden mit Enter oder Strg+Enter, Kosten-Anzeige (Prozent/Dollar). Der Ton ist immer der Butler;
    die Anrede kommt aus „Mein Profil“ (Herr → Sir, Frau → Madam, Keine Anrede).
  - **Kanzlei-Vorgaben** (Recht „Kanzlei-Einstellungen bearbeiten“): freigegebene Modi (auch *Organisatorisch*), Discord-Nachrichten an/aus und Kanal, höchste Gründlichkeit (Kostenbremse), Akten-Suche an/aus, **Hausregeln** für alle Antworten und
    **maximale Kosten pro Anfrage** (US-Dollar, gilt auch fürs Handy). Nigel rechnet vor jedem Schritt mit den Preisen des Modells:
    Wird es knapp, schlägt er weniger nach, denkt kürzer und begrenzt die Antwortlänge; reicht das Budget gar nicht, lehnt er ab,
    bevor Geld ausgegeben wird. Dieselbe Bremse greift, wenn das restliche Monatsbudget (eigenes oder das der Kanzlei) kleiner ist.
    Die tatsächlichen Kosten stehen an jeder Antwort, unter „Einstellungen“ (Monat) und für den Admin je Mitglied unter Personal → Ränge & Berechtigungen.
  - In jeder Akte führt „Mit Nigel bearbeiten“ direkt in eine neue Aufgabe mit dieser Akte als Kontext.
- **iPhone & iPad:** Alle Seiten passen sich an Handy und Tablet an (große Tippflächen, kein Hineinzoomen in Eingabefelder,
  wischbare Navigation, Rücksicht auf Notch und Home-Leiste). Tipp: In Safari über **Teilen → „Zum Home-Bildschirm“**
  ablegen – dann startet das Aktensystem wie eine App ohne Browserleisten (einmalig neu anmelden).

## Update von einer älteren Version

In Supabase den **SQL Editor** öffnen, den kompletten Inhalt von
[`supabase-update-2.sql`](supabase-update-2.sql) einfügen und **Run** klicken, danach genauso
[`supabase-update-3.sql`](supabase-update-3.sql) (Buchhaltung) , [`supabase-update-4.sql`](supabase-update-4.sql) (Personal & Rechte), [`supabase-update-5.sql`](supabase-update-5.sql) (Lese-/Schreibrechte), [`supabase-update-6.sql`](supabase-update-6.sql) (KI-Assistent), [`supabase-update-7.sql`](supabase-update-7.sql) (Benachrichtigungen, Pinnwand, Abläufe, Übergabe) [`supabase-update-8.sql`](supabase-update-8.sql) (Gesetzestexte, KI-Werkzeuge, KI-Limits) [`supabase-update-9.sql`](supabase-update-9.sql) (Nigels Arbeitsbereich: Chats, Entwürfe, Vorlagen, persönliche Einstellungen, gewichtete Nutzung), [`supabase-update-10.sql`](supabase-update-10.sql) (Kosten je Anfrage) und [`supabase-update-11.sql`](supabase-update-11.sql) (Discord-Login & mehrere Charaktere – danach den Abschnitt **Discord-Login einrichten** befolgen) [`supabase-update-12.sql`](supabase-update-12.sql) (Mandantenportal) und [`supabase-update-13.sql`](supabase-update-13.sql) (KI-Budget in US-Dollar pro Monat statt Anfragen pro Tag – danach die Edge Function `ki-assistent` neu bereitstellen), [`supabase-update-14.sql`](supabase-update-14.sql) (Nigel „Sehen“ und „Verwenden“ je Rang – danach die Edge Function `ki-assistent` neu bereitstellen) [`supabase-update-15.sql`](supabase-update-15.sql) (Anrede im eigenen Profil, pro Charakter – danach die Edge Function `ki-assistent` neu bereitstellen) [`supabase-update-16.sql`](supabase-update-16.sql) (Akten ohne Mandant) und [`supabase-update-17.sql`](supabase-update-17.sql) (Gebührenkatalog gehört zu den Finanzen) und [`supabase-update-18.sql`](supabase-update-18.sql) (was Nigel im Modus „Organisatorisch“ anlegt, steht unter „Nigel · im Auftrag von …“ – danach die Edge Function `ki-assistent` neu bereitstellen) und [`supabase-update-19.sql`](supabase-update-19.sql) (Sicherheits-Härtung: Datenbank-Funktionen nur noch für Angemeldete).
Nach Update 9 die Edge Function `ki-assistent` mit dem neuen Code **neu bereitstellen**. Bestehende Daten bleiben erhalten:
Mandanten werden in die Kartei übernommen, bestehende Rechnungen automatisch nachgebucht.

## Neueinrichtung (ca. 10 Minuten)

1. Auf <https://supabase.com> ein kostenloses Projekt anlegen (Region Frankfurt).
2. Im **SQL Editor** nacheinander ausführen:
   [`supabase.sql`](supabase.sql), [`supabase-nutzerverwaltung.sql`](supabase-nutzerverwaltung.sql),
   [`supabase-update-2.sql`](supabase-update-2.sql), [`supabase-update-3.sql`](supabase-update-3.sql), [`supabase-update-4.sql`](supabase-update-4.sql), [`supabase-update-5.sql`](supabase-update-5.sql), [`supabase-update-6.sql`](supabase-update-6.sql), [`supabase-update-7.sql`](supabase-update-7.sql), [`supabase-update-8.sql`](supabase-update-8.sql), [`supabase-update-9.sql`](supabase-update-9.sql), [`supabase-update-10.sql`](supabase-update-10.sql), [`supabase-update-11.sql`](supabase-update-11.sql), [`supabase-update-12.sql`](supabase-update-12.sql), [`supabase-update-13.sql`](supabase-update-13.sql), [`supabase-update-14.sql`](supabase-update-14.sql), [`supabase-update-15.sql`](supabase-update-15.sql), [`supabase-update-16.sql`](supabase-update-16.sql), [`supabase-update-17.sql`](supabase-update-17.sql), [`supabase-update-18.sql`](supabase-update-18.sql), [`supabase-update-19.sql`](supabase-update-19.sql).
3. Unter **Authentication → Sign In / Providers** den Schalter „Allow new users to sign up“ ausschalten
   (für den Discord-Login wird er später eingeschaltet – erst nachdem der Hook aus „Discord-Login einrichten“ aktiv ist).
4. Unter **Authentication → Users → Add user** den ersten Account anlegen (Haken bei „Auto Confirm User“).
   Dieser erste Account ist Admin. Weitere Mitglieder legt der Admin danach direkt im Aktensystem unter **Personal** an.
5. **Project URL** und **anon/publishable Key** (Project Settings → API) in [`config.js`](config.js) eintragen.
   Den **service_role/secret Key niemals** eintragen.

## Discord-Login einrichten

1. **Discord-Anwendung:** <https://discord.com/developers/applications> → **New Application** (z. B. „Wiwang Law“) →
   **OAuth2** → unter **Redirects** eintragen: `https://<projekt>.supabase.co/auth/v1/callback`
   (bei uns `https://btpgnraeumxortphkpgz.supabase.co/auth/v1/callback`). **Client ID** und **Client Secret** kopieren.
2. **Supabase → Authentication → Sign In / Providers → Discord:** einschalten, Client ID und Client Secret eintragen.
3. **Supabase → Authentication → Hooks → „Before User Created“:** Postgres-Funktion `public.registrierung_pruefen` wählen.
   Damit kann sich niemand per E-Mail selbst registrieren – nur mit Discord.
4. Erst danach unter **Authentication → Sign In / Providers** „**Allow new users to sign up**“ einschalten
   (nötig, damit neue Discord-Konten angelegt werden).
5. **Authentication → URL Configuration:** Site URL `https://wiwang.de`, Redirect URLs `https://wiwang.de/**`.
6. **Edge Function** [`supabase/functions/discord-pruefung`](supabase/functions/discord-pruefung/index.ts) als
   `discord-pruefung` anlegen (**Verify JWT aus**). Sie prüft bei jeder Discord-Anmeldung, ob die Person auf dem
   Discord-Server ist (Server-ID im Code; abweichend per Secret `DISCORD_SERVER_ID`).

So funktioniert es: Eine **Person** meldet sich mit Discord an (eigenes Login-Konto ohne Profil – es sieht keine
Kanzleidaten). Jeder **Charakter** ist ein eigenes Konto mit Profil, Rang und Rechten, genau wie die bisherigen
Mitglieder. Beim Wechsel prüft die Datenbank (`charakter_zugang`), dass der Charakter zur Person gehört, freigegeben ist
und die Person auf dem Server ist, und gibt einen Einmal-Zugang aus, der direkt nach der Anmeldung wieder ungültig wird.
Die Server-Mitgliedschaft wird bei jeder Discord-Anmeldung neu geprüft; wer den Server verlässt, behält den Zugang bis
zur nächsten Discord-Anmeldung – oder bis ein Admin ihn sperrt. Mitglieder lassen sich weiterhin auch ohne Discord unter
**Personal → Mitglied einstellen** anlegen.

Test (nur lokal, nie gegen die Live-Datenbank): `PGHOST=… ./tools/test-konten/run.sh` spielt alle SQL-Dateien in eine
lokale Postgres-Datenbank ein und prüft Registrierung, Freigabe, Wechsel, Übernahme, Sperren und Rechte – und fürs
Mandantenportal, dass ein Mandant wirklich nur seine eigenen, freigegebenen Daten sieht.

## Discord-Bot einrichten

Der Bot ist die Schnittstelle zwischen Discord-Server und Website. Es läuft **kein eigener Bot-Prozess**: Discord schickt
jeden Slash-Befehl an die Edge Function [`supabase/functions/discord-bot`](supabase/functions/discord-bot/index.ts),
die die Daten aus Supabase liest und antwortet. Die Antworten sieht nur die Person, die den Befehl nutzt.

| Befehl | Zeigt |
|---|---|
| `/ping` | ob der Bot erreichbar ist |
| `/konto` | eigenes Website-Konto und eigene Charaktere mit Status |
| `/termine` | eigene nächste Termine und offene Aufgaben (alle freigegebenen, aktiven Charaktere) |

Die Person wird über ihre Discord-ID erkannt, die beim Login mit Discord gespeichert wird. Wer sich noch nie auf der
Website mit Discord angemeldet hat, bekommt einen Hinweis darauf. Keine Datenbank-Änderung nötig.

1. **Discord-Anwendung** (dieselbe wie für den Login): <https://discord.com/developers/applications>
   - **General Information:** **Application ID** und **Public Key** kopieren.
   - **Bot:** **Reset Token** → **Bot-Token** kopieren (nur einmal sichtbar, geheim halten). Keine Privileged Intents nötig.
   - **OAuth2 → URL Generator:** Scopes `bot` und `applications.commands`, keine Bot-Rechte → Link öffnen und den Bot
     auf den Wiwang-Server einladen.
2. **Supabase → Edge Functions:** Funktion `discord-bot` mit dem Code aus
   [`supabase/functions/discord-bot/index.ts`](supabase/functions/discord-bot/index.ts) anlegen, **Verify JWT aus**
   (Discord schickt kein Supabase-Login, die Funktion prüft die Discord-Signatur).
   **Edge Functions → Secrets:** `DISCORD_PUBLIC_KEY` = Public Key aus Schritt 1.
3. **Discord → General Information → Interactions Endpoint URL:**
   `https://btpgnraeumxortphkpgz.supabase.co/functions/v1/discord-bot` eintragen und speichern. Discord prüft die
   Adresse sofort; klappt das Speichern, stimmen Funktion und Public Key.
4. **GitHub → Settings → Secrets and variables → Actions:** Secrets `DISCORD_APP_ID` (Application ID) und
   `DISCORD_BOT_TOKEN` (Bot-Token) anlegen. Dann **Actions → „Discord-Befehle anmelden“ → Run workflow**. Der Workflow
   meldet die Befehle aus [`tools/discord-bot/befehle.json`](tools/discord-bot/befehle.json) beim Server an; nach
   Änderungen an der Datei erneut ausführen.

Danach in Discord `/ping` eingeben. Bot-Token und Public Key gehören **nie** in `config.js` oder anderen Website-Code.

### Nigel schreibt auf Discord (Modus „Organisatorisch“)

Damit Nigel Kollegen auf Discord Bescheid geben kann:

1. **Supabase → Edge Functions → Secrets:** `DISCORD_BOT_TOKEN` = derselbe Bot-Token wie im GitHub-Secret.
   (Optional `DISCORD_SERVER_ID`, falls es nicht der Wiwang-Server ist.)
2. Die Edge Function **`ki-assistent` neu bereitstellen** (Code aus [`supabase/functions/ki-assistent`](supabase/functions/ki-assistent/index.ts)).
3. Der Bot muss im Kanal schreiben dürfen. **GitHub → Actions → „Discord-Server einrichten“ → ausfuehren** gibt der Rolle des Bots
   Lesen/Schreiben in den geschlossenen Kategorien (u. a. 🏛️ Kanzlei). Alternativ von Hand in den Kanal-Einstellungen.
4. Unter **Nigel → Einstellungen → Kanzlei-Vorgaben** lassen sich der Modus, Discord-Nachrichten und der Kanal (Standard
   `kanzlei-chat`) ein- und ausschalten bzw. ändern. Keine Datenbank-Änderung nötig.
5. Für Mitglieder **ohne verknüpftes Discord-Konto**: im [Discord Developer Portal](https://discord.com/developers/applications)
   → Anwendung → **Bot** → **Server Members Intent** einschalten. Dann darf der Bot die Mitgliederliste des Servers lesen und
   findet z. B. „[WL] Niklas Palermo“ auch mit Präfix im Spitznamen.

So läuft es: Nigel findet den Empfänger in der Mitgliederliste (Charaktername), sucht über Charakter → Person die Discord-ID
(gespeichert beim Login mit Discord) und schreibt in den Kanal: `@Empfänger` und darunter eine **Karte** in Kanzlei-Gold mit
Nigels Bild ([`assets/nigel.png`](assets/nigel.png), muss unter wiwang.de erreichbar sein), Betreff, einem kleinen Butler-Brief
(Anrede, Mitteilung mit dem Wichtigsten fett, Schlussformel) und „Im Auftrag von …“.
Erwähnt (gepingt) werden nur die genannten Empfänger. Darf der Bot im Kanal nicht schreiben, stellt er die Nachricht als
Direktnachricht zu; auf Wunsch („schreib ihr privat“) schickt er gleich eine Direktnachricht.

Hat jemand sein Discord-Konto **nicht verknüpft** (nie mit Discord auf der Website angemeldet), sucht Nigel die Person auf dem
Discord-Server: zuerst über das Feld **„Discord“ im Profil** (Benutzername wie `niklas.palermo` oder direkt die Discord-ID),
sonst über den Charakternamen im Server-Spitznamen, Anzeigenamen oder Benutzernamen. Angepingt wird nur bei **genau einem**
Treffer. Passen mehrere oder keiner, sagt Nigel das und bittet, im Profil den Discord-Namen bzw. die ID einzutragen.

### Discord-Server einrichten lassen

Der Workflow **Discord-Server einrichten** legt Rollen, Kategorien und Kanäle an (Skript
[`tools/discord-bot/server-einrichten.mjs`](tools/discord-bot/server-einrichten.mjs)). Kanäle und Kategorien werden **nie**
gelöscht, umbenannt oder verschoben, und bestehende Rechte bleiben unverändert (fehlende Rollen werden nur ergänzt).

- **Rollen = Ränge der Website** (Personal → Ränge): Chairman, Vice Chairman, Partner, Rechtsanwalt, Fraktionsverwaltung,
  Sonstiges – in dieser Reihenfolge – plus **Mandant** (Mandantenportal), alle ohne Sonderrechte. Ändern sich die Ränge auf
  der Website, die Liste `ROLLEN` im Skript nachziehen. Frühere Rollen, die es auf der Website nicht gibt (Referendar,
  Praktikant, Sekretariat), werden nur gelöscht, wenn **niemand** sie trägt; sonst bleiben sie stehen und werden gemeldet.
- **Kategorien und Kanäle:** 📢 Informationen (alle lesen, nur das Team schreibt), 🏛️ Kanzlei (nur Team), 👔 Leitung (Chairman,
  Vice Chairman, Partner), 🤝 Mandanten (Team und Mandanten), 🤖 Website & Bot, 💬 Allgemein (alle). „Team“ sind alle Ränge
  der Website.

Voraussetzung: Der Bot braucht die Rechte **Rollen verwalten, Kanäle verwalten, Kanäle ansehen, Nachrichten senden,
Nachrichtenverlauf anzeigen**. Im Discord-Portal unter **OAuth2 → URL Generator** Scopes `bot` und `applications.commands`
anhaken, diese Rechte wählen und den Link öffnen (der Bot ist schon auf dem Server, die Rechte werden dabei erweitert).
In den Servereinstellungen die **Bot-Rolle ganz nach oben** ziehen (über die neuen Rollen).

Ablauf: **GitHub → Actions → „Discord-Server einrichten“ → Run workflow**. Erst **vorschau** (ändert nichts, zeigt den
Plan im Protokoll), dann **ausfuehren**. Rollen werden nicht automatisch an Personen vergeben.

## KI-Assistent einrichten

Die Edge Function [`supabase/functions/ki-assistent`](supabase/functions/ki-assistent/index.ts) wird in Supabase unter
**Edge Functions** als `ki-assistent` angelegt (**Verify JWT aus** – die Funktion prüft die Anmeldung selbst).
Es antwortet **genau ein Modell** über OpenRouter – ohne Ausweich-Modelle und ohne andere KI. Antwortet trotzdem ein
anderes Modell, wird die Antwort verworfen. Ist das Modell nicht erreichbar oder das Guthaben leer, bekommt das Mitglied
eine Fehlermeldung. **Secrets** (Supabase → Edge Functions → Secrets):

| Secret | Bedeutung |
|---|---|
| `OPENROUTER_API_KEY` | Pflicht: Schlüssel von <https://openrouter.ai> (**Keys → Create Key**, am besten mit Credit-Limit) |
| `OPENROUTER_MODELL` | Modell-ID von <https://openrouter.ai/models> (Filter „Tools“ – das Modell muss Werkzeuge können), z. B. `deepseek/deepseek-v4.1-flash-1017`. **Modell wechseln = nur dieses Secret ändern**, kein Code nötig. |
| `KI_KOSTEN_MAX` | optional: Höchstkosten pro Anfrage in US-Dollar (z. B. `0.05`), falls in Nigels Kanzlei-Vorgaben nichts eingestellt ist |
| `KI_REASONING` | optional: `low`, `medium` (Standard) oder `high` – wie gründlich das Modell nachdenkt, solange das Mitglied in Nigels Einstellungen nichts anderes wählt (höchstens bis zur Kanzlei-Vorgabe) |
| `DISCORD_BOT_TOKEN` | optional: Bot-Token, damit Nigel im Modus *Organisatorisch* Discord-Nachrichten schreiben kann (siehe **Nigel schreibt auf Discord**) |

Weitere Ränge schaltet der Admin unter **Personal → Ränge & Berechtigungen → Nigel (Sehen / Verwenden)** frei. Dort legt er
das **KI-Budget pro Monat** fest: den **Kanzlei-Deckel** (Standard 10 $), je Rang einen Grundwert in US-Dollar (Standard 2,50 $)
und je Mitglied eine **Abweichung** (z. B. −1,00 oder +2,50; ein Budget von 0 sperrt die KI für dieses Mitglied). „Deckel gleichmäßig
verteilen“ teilt den Deckel auf alle Mitglieder mit KI-Recht auf. Gespeichert wird der Deckel in `einstellungen.ki_budget_monat`,
der Grundwert in `raenge.ki_budget_monat`, die Abweichung in `profiles.ki_budget_offset`. Unter **Gesetze** die Gesetzbücher anlegen
und die Paragraphen per Massenimport einfügen – nur was dort steht, kann die KI nachschlagen.

Hinweise: OpenRouter rechnet pro Token ab; die Preise je Modell stehen auf der Modellseite. Vom Budget abgezogen wird, was eine Frage
tatsächlich gekostet hat (inklusive aller Nachschlage-Schritte) – aufwendige Modi verbrauchen also automatisch mehr. Nigel prüft vor jeder
Anfrage das Restbudget und plant die Antwort so, dass es nicht überschritten wird. Laufen mehrere Anfragen genau gleichzeitig, kann der Deckel
um wenige Cent überschritten werden – als zweite Sicherung dem OpenRouter-Schlüssel ein eigenes Limit geben. Die Ausgaben stehen bei
OpenRouter unter **Activity**. Unter **OpenRouter → Settings → Privacy** Anbieter ausschließen, die mit Eingaben
trainieren. An den KI-Anbieter gehen die gewählten Akten,
der Strafkatalog, die nachgeschlagenen und angehefteten Paragraphen, Notizen und ggf. der Entwurf – im Modus *Organisatorisch*
stattdessen Namen, Ränge und Anrede der aktiven Mitglieder, die gewählten Akten (Aktenzeichen und Titel) und die gelesenen Termine.
Lange Aufträge sind auf rund 105 Sekunden Arbeitszeit begrenzt (danach antwortet Nigel mit dem, was er hat), weil
Edge Functions im kostenlosen Supabase-Tarif nach 150 Sekunden abbrechen.

## Gut zu wissen

- Im kostenlosen Supabase-Tarif wird ein Projekt nach einer Woche ohne Nutzung pausiert.
  Im Supabase-Dashboard lässt es sich mit „Restore“ wieder starten, die Daten bleiben erhalten.
- Ab und zu unter **Team → Komplettsicherung herunterladen** eine Sicherung ziehen.
- Neue Versionen der Website lädt der Browser automatisch (siehe `update-check.js`).
  Bei Änderungen die Versionsnummer in `version.json`, `<meta name="app-version">` und
  bei den `?v=` in `index.html` erhöhen.
- Tastenkürzel: `/` Suche, `N` neue Akte, `B` Benachrichtigungen, `K` KI-Assistent (im Arbeitsbereich: ins Eingabefeld), `Esc` Dialog bzw. KI-Assistent schließen.
- Ab wann eine Akte als „liegen geblieben“ gilt (Standard 7 Tage), steht unter **Personal → Kanzlei & Daten**.

## Sicherheit

- **Wer sieht was?** Ohne Anmeldung liefert die Datenbank nichts: Jede Tabelle hat Row Level Security,
  alle Regeln gelten nur für Angemeldete mit dem passenden Recht ihres Rangs. Neue Discord-Konten sehen
  erst nach der Freigabe etwas. Seit Update 19 sind auch die Datenbank-Funktionen ohne Login nicht aufrufbar.
- Der Schlüssel in `config.js` ist der öffentliche „publishable“ Key – er darf im Code stehen.
  Der `service_role`-/Secret-Key gehört **nie** ins Repository (nur in die Secrets der Edge Functions).
- **Neue Funktionen in SQL-Updates** brauchen kein eigenes `revoke` mehr (Update 19 hat die Standardrechte
  angepasst). Funktionen mit `security definer` müssen trotzdem selbst prüfen, wer angemeldet ist
  (`auth.uid()`, `hat_recht(…)`, `is_admin()`), und `set search_path = ''` haben.
- **Fremde Skripte** (supabase-js, Showdown, DOMPurify) werden in `index.html` mit Prüfsumme (`integrity`)
  geladen. Beim Wechsel auf eine neue Version die Prüfsumme neu berechnen, sonst lädt die Seite nicht:
  `curl -sL <URL> | openssl dgst -sha384 -binary | openssl base64 -A` und als `sha384-…` eintragen.
- Empfohlene Einstellungen außerhalb des Codes:
  - GitHub → **Settings → Branches**: Regel für `main` mit „Require a pull request before merging“
    (ohne Pflicht-Reviews, sonst kann man allein nicht mergen).
  - Supabase → **Authentication → Providers → Email**: Mindestlänge 8 Zeichen; „Prevent use of leaked
    passwords“ einschalten, falls der Tarif es anbietet (nur in bezahlten Tarifen).
  - Den Rang-Rechten `personal_schreiben` (Personal verwalten) nur vertrauten Rängen geben – wer es hat,
    kann Konten anlegen und Passwörter von Nicht-Admins setzen.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html`, `style.css` | Grundgerüst und Design |
| `js/util.js` | Hilfsfunktionen (sicheres HTML, Datum, Geld) |
| `js/data.js` | Laden, Live-Updates, Speichern |
| `js/forms.js` | Formulare und Dialoge |
| `js/app.js` | Anmeldung, Seitenwechsel, Tastenkürzel |
| `js/konto.js` | Discord-Anmeldung, Registrierung (Mitarbeiter oder Mandant), Charaktere beantragen/übernehmen, Charakter-Wechsel (Logo) |
| `js/portal.js` | Mandantenportal (was ein angemeldeter Mandant sieht: Akten, Termine, Nachrichten, Rechnungen, Kontaktdaten) |
| `js/portal-verwaltung.js` | Mandantenportal aus Sicht der Kanzlei: Zugänge freigeben/zuordnen/sperren, Mitmandanten je Akte, „für Mandant sichtbar“ |
| `js/akten.js`, `js/mandanten.js`, `js/kalender.js`, `js/rechnungen.js`, `js/gesetzbuch.js`, `js/team.js`, `js/uebersicht.js` | die einzelnen Seiten |
| `js/gesetze.js` | Gesetze: Kachel-Übersicht, Gesetzbuch mit Paragraphen, Massenimport |
| `js/buchhaltung.js` | Buchhaltung: Grundbuch, Hauptbuch, Bilanz, GuV |
| `js/dokumente.js` | Vorlagen, Rechnung, Aktenblatt, Druck |
| `js/assistent.js` | KI-Assistent „Nigel“ (faltbares iFruit-Smartphone mit Chat, 3D-Faltanimation) |
| `js/nigel.js` | Nigels Arbeitsbereich: gespeicherte Chats, Modi, Kontext, Entwurf, Quellen, Vorlagen, Einstellungen |
| `assets/nigel.svg` | Avatar von Nigel (eigene Zeichnung) |
| `js/zusammenarbeit.js` | Wer ist online, Benachrichtigungen (Glocke), @-Erwähnungen |
| `js/pinnwand.js` | Pinnwand mit Lesebestätigung, „Team heute“ |
| `js/ablaeufe.js` | Abläufe (Checklisten), Wiedervorlage, Arbeit übergeben |
| `supabase/functions/discord-pruefung/` | Edge Function: prüft nach der Discord-Anmeldung die Mitgliedschaft im Discord-Server |
| `tools/test-konten/` | lokaler Test für Update 11 und 12 (Nachbau der Supabase-Umgebung + Szenarien) |
| `supabase/functions/ki-assistent/` | Edge Function: Anmeldung, Rechte, KI-Budget, Arbeitsmodi, Kontext, Werkzeuge (Gesetze/Paragraphen/Akten finden), Anfrage an das eingestellte Modell (OpenRouter), Live-Fortschritt als Stream |
| `assets/fonts/` | Schreibschrift „Great Vibes“ für Unterschriften (SIL Open Font License) |
