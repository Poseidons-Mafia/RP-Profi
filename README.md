# Wiwang Law – Aktensystem

Gemeinsames Aktensystem für die RP-Kanzlei Wiwang Law.
Nur HTML, CSS und JavaScript, ohne Build-Schritt. Die Daten liegen in einer kostenlosen
**Supabase**-Datenbank: Jedes Kanzlei-Mitglied meldet sich an, alle sehen dieselben Daten,
und Änderungen erscheinen bei allen sofort.

## Was das System kann

- **Übersicht:** Kennzahlen, Termine der nächsten 7 Tage, überfällige Fristen, eigene Aufgaben,
  Mandanten in Haft, dringende Akten, letzte Aktivitäten im Team, Statistik (Erfolgsquote, Umsatz)
  und eine **Suche über alles** (Taste `/`).
- **Akten** mit Tabs:
  - **Kopf:** Phasenleiste (Mandat → Ermittlungen → Anklage → Hauptverhandlung → Urteil → Abgeschlossen;
    im Zivilrecht Außergerichtlich, Klage, Verhandlung, Urteil/Vergleich), per Klick umschaltbar
  - **Überblick:** zuerst das **Lagebild** (Stand der Dinge, nächster Schritt, nächster Termin, offene Vorgänge
    wie unbeantwortete Deal-Angebote, laufende Anträge und Fristen), dann angeheftete und zuletzt passierte Ereignisse,
    **Tatvorwürfe mit Stand** (erhoben, fallengelassen, eingestellt, freigesprochen, verurteilt – der Strafrahmen zählt
    nur offene/verurteilte), Termine, Aufgaben, Sachverhalt, Stammdaten und **verbundene Akten**
  - **Chronik:** alles, was im Fall passiert, als eine Zeitachse – siehe unten
  - **Beteiligte:** Zeugen, Beamte, Richter, Staatsanwaltschaft, Gegenseite
  - **Beweise:** Links zu Screenshots und Clips, mit Bildvorschau
  - **Termine, Aufgaben, Rechnungen** zur Akte
- **Chronik einer Akte:**
  - rund 35 **Ereignistypen** in 10 Bereichen (Mandat, Haft, Ermittlungen, Kommunikation, Anträge & Schriftsätze,
    Deal & Vergleich, Gericht, Fristen, Beweise, Intern), jeweils mit passenden Angaben – z. B. Festnahme (durch, Ort,
    Haft bis), Antrag (worauf, bei wem, Stand), Angebot (von wem, Geldstrafe, Haft, Bedingungen), Urteil (Ergebnis, Strafmaß)
  - **Zeitpunkt des Geschehens** getrennt vom Zeitpunkt der Erfassung (nachträglich Dokumentiertes steht an der richtigen Stelle)
  - eine Zeile pro Ereignis, Details per Klick; gruppiert nach **Phasen**, ältere Phasen eingeklappt
  - **Stränge:** Angebot → Gegenangebot → angenommen erscheint als *ein* Eintrag mit Antworten
  - **Bezüge** zu Beteiligten, Beweismitteln und Terminen; Einträge **anheften** (erscheinen im Überblick)
  - **gleich miterledigen:** Festnahme vermerkt die Haft, Anklage/Verhandlung/Urteil schalten die Phase weiter,
    eine Frist landet im Kalender, ein Urteil oder angenommener Deal trägt das Ergebnis ein (alles abschaltbar)
  - wird ein Verhandlungs-, Haftprüfungs- oder Vernehmungstermin abgehakt, fragt das System nach dem Ergebnis
  - **Systemzeilen** aus dem Änderungsprotokoll (Status, Phase, Haft, Tatvorwürfe, Termine, Rechnungen …);
    Filter nach Bereich, Suche, Ansicht „Nur Einträge“ oder „Alles inkl. Protokoll“
- **Interessenkonflikt-Prüfung:** Warnung, wenn die Gegenseite anderswo euer Mandant ist oder umgekehrt.
- **Mandantenkartei:** Kontaktdaten, Markierungen (Stammkunde, VIP, zahlt schlecht …), alle Akten,
  frühere Ergebnisse, offene Rechnungen.
- **Kalender & Aufgaben:** Liste und Monatsansicht, Fristen-Warnung, Export in den Handy-Kalender (`.ics`).
- **Rechnungen** im Stil der Kanzlei-Vorlage mit Gebührenkatalog, Zahlungsstatus, Zahlungserinnerung.
- **Buchhaltung** (doppelte Buchführung): Kontenrahmen, Grundbuch mit unveränderbaren Buchungen
  (Korrektur nur per Storno), Hauptbuch mit T-Konten, Summen- und Saldenliste, Bilanz und GuV.
  Rechnungen und Zahlungseingänge werden automatisch gebucht. Buchen darf nur der Admin.
- **Gesetzbuch & Strafrechner:** Paragraphen eures Servers, Massenimport aus Google Sheets/Excel.
- **Dokumente:** Vollmacht, Mandatsvertrag, Antrag auf Haftprüfung, Akteneinsicht,
  Dienstaufsichtsbeschwerde, freier Schriftsatz, Aktenblatt. Die Vorschau lässt sich direkt bearbeiten,
  dann drucken oder als PDF speichern.
- **Personal:** Ränge mit Rechte-Matrix – je Bereich getrennt **Lesen** und **Bearbeiten** (z. B. alles sehen,
  nichts ändern), Rang „Sonstiges“ mit
  selbst gewähltem Namen, Status (Aktiv, Urlaub, Krank, Ausgeschieden), Eintritt, Personalnummer,
  vertrauliche Personalakte (Gehalt, Notizen, Vermerke wie Lob oder Abmahnung), Zugang sperren,
  Kanzlei-Einstellungen, Komplettsicherung. Die Datenbank prüft jedes Recht selbst.

## Update von einer älteren Version

In Supabase den **SQL Editor** öffnen, den kompletten Inhalt von
[`supabase-update-2.sql`](supabase-update-2.sql) einfügen und **Run** klicken, danach genauso
[`supabase-update-3.sql`](supabase-update-3.sql) (Buchhaltung) , [`supabase-update-4.sql`](supabase-update-4.sql) (Personal & Rechte), [`supabase-update-5.sql`](supabase-update-5.sql) (Lese-/Schreibrechte) und [`supabase-update-7.sql`](supabase-update-7.sql) (Chronik, Lagebild, Phasen). Bestehende Daten bleiben erhalten:
Mandanten werden in die Kartei übernommen, bestehende Rechnungen automatisch nachgebucht.

## Neueinrichtung (ca. 10 Minuten)

1. Auf <https://supabase.com> ein kostenloses Projekt anlegen (Region Frankfurt).
2. Im **SQL Editor** nacheinander ausführen:
   [`supabase.sql`](supabase.sql), [`supabase-nutzerverwaltung.sql`](supabase-nutzerverwaltung.sql),
   [`supabase-update-2.sql`](supabase-update-2.sql), [`supabase-update-3.sql`](supabase-update-3.sql), [`supabase-update-4.sql`](supabase-update-4.sql), [`supabase-update-5.sql`](supabase-update-5.sql), [`supabase-update-7.sql`](supabase-update-7.sql).
3. Unter **Authentication → Sign In / Providers** den Schalter „Allow new users to sign up“ ausschalten.
4. Unter **Authentication → Users → Add user** den ersten Account anlegen (Haken bei „Auto Confirm User“).
   Dieser erste Account ist Admin. Weitere Mitglieder legt der Admin danach direkt im Aktensystem unter **Personal** an.
5. **Project URL** und **anon/publishable Key** (Project Settings → API) in [`config.js`](config.js) eintragen.
   Den **service_role/secret Key niemals** eintragen.

## Gut zu wissen

- Im kostenlosen Supabase-Tarif wird ein Projekt nach einer Woche ohne Nutzung pausiert.
  Im Supabase-Dashboard lässt es sich mit „Restore“ wieder starten, die Daten bleiben erhalten.
- Ab und zu unter **Team → Komplettsicherung herunterladen** eine Sicherung ziehen.
- Neue Versionen der Website lädt der Browser automatisch (siehe `update-check.js`).
  Bei Änderungen die Versionsnummer in `version.json`, `<meta name="app-version">` und
  bei den `?v=` in `index.html` erhöhen.
- Tastenkürzel: `/` Suche, `N` neue Akte, `Esc` Dialog schließen.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html`, `style.css` | Grundgerüst und Design |
| `js/util.js` | Hilfsfunktionen (sicheres HTML, Datum, Geld) |
| `js/data.js` | Laden, Live-Updates, Speichern |
| `js/forms.js` | Formulare und Dialoge |
| `js/app.js` | Anmeldung, Seitenwechsel, Tastenkürzel |
| `js/akten.js`, `js/mandanten.js`, `js/kalender.js`, `js/rechnungen.js`, `js/gesetzbuch.js`, `js/team.js`, `js/uebersicht.js` | die einzelnen Seiten |
| `js/chronik.js` | Chronik einer Akte: Ereignistypen, Phasen, Lagebild, Stränge, Systemzeilen |
| `js/buchhaltung.js` | Buchhaltung: Grundbuch, Hauptbuch, Bilanz, GuV |
| `js/dokumente.js` | Vorlagen, Rechnung, Aktenblatt, Druck |
| `assets/fonts/` | Schreibschrift „Great Vibes“ für Unterschriften (SIL Open Font License) |
