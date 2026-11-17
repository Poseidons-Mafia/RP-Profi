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
- **KI-Assistent** (Google Gemini 3.5 Flash-Lite, Gratis-Kontingent): Akte zusammenfassen, nächste Schritte,
  Strafrahmen, Schriftsatz-Entwürfe, passende Paragraphen aus eurem Gesetzbuch. Eigenes Recht „KI-Assistent“
  (anfangs nur Chairman). Der Assistent ist ein Smartphone, das unten rechts aus der Ecke schaut: antippen
  (oder Taste `K`) holt es heraus, `Esc` steckt es wieder ein. Ist eine Akte geöffnet, nimmt es diese als Kontext.
  Die KI sieht nur, was das Mitglied selbst lesen darf. Antworten lassen sich in den Verlauf der Akte übernehmen.

## Update von einer älteren Version

In Supabase den **SQL Editor** öffnen, den kompletten Inhalt von
[`supabase-update-2.sql`](supabase-update-2.sql) einfügen und **Run** klicken, danach genauso
[`supabase-update-3.sql`](supabase-update-3.sql) (Buchhaltung) , [`supabase-update-4.sql`](supabase-update-4.sql) (Personal & Rechte), [`supabase-update-5.sql`](supabase-update-5.sql) (Lese-/Schreibrechte) und [`supabase-update-6.sql`](supabase-update-6.sql) (KI-Assistent). Bestehende Daten bleiben erhalten:
Mandanten werden in die Kartei übernommen, bestehende Rechnungen automatisch nachgebucht.

## Neueinrichtung (ca. 10 Minuten)

1. Auf <https://supabase.com> ein kostenloses Projekt anlegen (Region Frankfurt).
2. Im **SQL Editor** nacheinander ausführen:
   [`supabase.sql`](supabase.sql), [`supabase-nutzerverwaltung.sql`](supabase-nutzerverwaltung.sql),
   [`supabase-update-2.sql`](supabase-update-2.sql), [`supabase-update-3.sql`](supabase-update-3.sql), [`supabase-update-4.sql`](supabase-update-4.sql), [`supabase-update-5.sql`](supabase-update-5.sql), [`supabase-update-6.sql`](supabase-update-6.sql).
3. Unter **Authentication → Sign In / Providers** den Schalter „Allow new users to sign up“ ausschalten.
4. Unter **Authentication → Users → Add user** den ersten Account anlegen (Haken bei „Auto Confirm User“).
   Dieser erste Account ist Admin. Weitere Mitglieder legt der Admin danach direkt im Aktensystem unter **Personal** an.
5. **Project URL** und **anon/publishable Key** (Project Settings → API) in [`config.js`](config.js) eintragen.
   Den **service_role/secret Key niemals** eintragen.

## KI-Assistent einrichten

1. Auf <https://aistudio.google.com> mit einem Google-Konto anmelden → **Get API key** → **Create API key**.
2. Edge Function [`supabase/functions/ki-assistent`](supabase/functions/ki-assistent/index.ts) in Supabase anlegen
   (Dashboard → **Edge Functions** → Name `ki-assistent`, Inhalt von `index.ts` einfügen, **Verify JWT aus** –
   die Funktion prüft die Anmeldung selbst).
3. Unter **Edge Functions → Secrets** das Secret `GEMINI_API_KEY` mit dem Schlüssel anlegen.
   Optional: `GEMINI_MODELL` (Standard `gemini-3.5-flash-lite`) und `KI_TAGESLIMIT` (Anfragen je Mitglied und Tag, Standard 100).
4. Weitere Ränge schaltet der Admin unter **Personal → Ränge & Berechtigungen → KI-Assistent** frei.

Hinweise: Im Gratis-Tarif begrenzt Google die Anfragen (ca. 10–15 pro Minute, ca. 500 pro Tag für das ganze Projekt)
und darf die Eingaben zum Verbessern seiner Modelle nutzen. Akteninhalte der gewählten Akte, die offenen Akten
und das Gesetzbuch werden dafür an Google geschickt.

## Gut zu wissen

- Im kostenlosen Supabase-Tarif wird ein Projekt nach einer Woche ohne Nutzung pausiert.
  Im Supabase-Dashboard lässt es sich mit „Restore“ wieder starten, die Daten bleiben erhalten.
- Ab und zu unter **Team → Komplettsicherung herunterladen** eine Sicherung ziehen.
- Neue Versionen der Website lädt der Browser automatisch (siehe `update-check.js`).
  Bei Änderungen die Versionsnummer in `version.json`, `<meta name="app-version">` und
  bei den `?v=` in `index.html` erhöhen.
- Tastenkürzel: `/` Suche, `N` neue Akte, `K` KI-Assistent, `Esc` Dialog bzw. KI-Assistent schließen.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html`, `style.css` | Grundgerüst und Design |
| `js/util.js` | Hilfsfunktionen (sicheres HTML, Datum, Geld) |
| `js/data.js` | Laden, Live-Updates, Speichern |
| `js/forms.js` | Formulare und Dialoge |
| `js/app.js` | Anmeldung, Seitenwechsel, Tastenkürzel |
| `js/akten.js`, `js/mandanten.js`, `js/kalender.js`, `js/rechnungen.js`, `js/gesetzbuch.js`, `js/team.js`, `js/uebersicht.js` | die einzelnen Seiten |
| `js/buchhaltung.js` | Buchhaltung: Grundbuch, Hauptbuch, Bilanz, GuV |
| `js/dokumente.js` | Vorlagen, Rechnung, Aktenblatt, Druck |
| `js/assistent.js` | KI-Assistent (Smartphone mit Chat) |
| `supabase/functions/ki-assistent/` | Edge Function: Anmeldung, Rechte, Kontext, Anfrage an Gemini |
| `assets/fonts/` | Schreibschrift „Great Vibes“ für Unterschriften (SIL Open Font License) |
