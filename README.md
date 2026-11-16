# Wiwang Law – Aktensystem

Gemeinsames Aktensystem für die RP-Kanzlei Wiwang Law.
Nur HTML, CSS und JavaScript, ohne Build-Schritt. Die Akten liegen in einer kostenlosen
**Supabase**-Datenbank: Jedes Kanzlei-Mitglied meldet sich an und alle sehen dieselben Akten.
Änderungen erscheinen bei allen sofort.

## Einrichtung (einmalig, ca. 10 Minuten)

### 1. Supabase-Projekt anlegen
1. Auf <https://supabase.com> kostenlos registrieren.
2. **New project** anlegen: Name z. B. `wiwang-law`, ein Datenbank-Passwort ausdenken
   (gut aufheben), Region **Frankfurt** (oder eine andere in Europa).
3. Warten, bis das Projekt fertig ist (1–2 Minuten).

### 2. Datenbank einrichten
1. Links auf **SQL Editor** klicken.
2. Den kompletten Inhalt der Datei [`supabase.sql`](supabase.sql) hineinkopieren.
3. Auf **Run** klicken. Es sollte „Success“ erscheinen.

### 3. Fremde Anmeldungen verbieten
Unter **Authentication → Sign In / Providers** (bei manchen Versionen: *Settings*)
den Schalter **„Allow new users to sign up“** ausschalten und speichern.
So kann sich niemand selbst ein Konto anlegen. Nur du lädst Mitglieder ein.

### 4. Kanzlei-Mitglieder anlegen
Unter **Authentication → Users → Add user → Create new user**:
- E-Mail eintragen. Das darf auch eine RP-Adresse wie `max@wiwang.law` sein,
  es wird keine Mail verschickt.
- Passwort festlegen.
- Haken bei **Auto Confirm User** setzen.

Die E-Mail und das Passwort gibst du dem jeweiligen Mitglied. Der Teil vor dem `@`
wird im System als Name angezeigt (z. B. `max`).

### 5. Website mit der Datenbank verbinden
1. In Supabase unter **Project Settings → API** (bzw. **Data API** und **API Keys**) findest du:
   - die **Project URL** (`https://….supabase.co`)
   - den **anon public** Key (oder **publishable** Key)
2. Auf GitHub die Datei [`config.js`](config.js) öffnen, auf den **Stift** (Bearbeiten) klicken,
   beide Werte zwischen die Anführungszeichen einfügen und **Commit changes** klicken.

> Der anon/publishable Key darf öffentlich sein, die Daten sind durch den Login geschützt.
> Den **service_role** bzw. **secret** Key dagegen **niemals** eintragen!

Danach die Website neu laden. Es erscheint die Anmeldung.

### 6. Nutzerverwaltung in der Website (optional)
Damit du Mitglieder direkt im Aktensystem anlegen kannst statt in Supabase:
1. In Supabase den **SQL Editor** öffnen.
2. Den kompletten Inhalt von [`supabase-nutzerverwaltung.sql`](supabase-nutzerverwaltung.sql) einfügen und **Run** klicken.
3. Unten erscheint die E-Mail des Admins. Das ist der Account, der **als erstes** angelegt wurde.

Danach sieht der Admin oben den Knopf **„Nutzer“**. Dort kann er Nutzer anlegen, Passwörter
ändern und Nutzer löschen. Alle anderen sehen den Knopf nicht. Die Datenbank prüft bei jedem
Aufruf selbst, ob jemand Admin ist.

## Bedienung
- **+ Neue Akte**: Aktenzeichen werden automatisch vergeben (`WL-2026-001` …).
- **Verlauf**: Einträge mit Datum und Name des Verfassers.
- **Suche & Filter** nach Status.
- **Export**: Sicherungskopie aller Akten als Datei.
- **Import**: Akten aus einer Datei *hinzufügen*, z. B. die Akten aus der ersten
  Version, die nur im Browser gespeichert waren.

## Gut zu wissen
- Im kostenlosen Supabase-Tarif wird ein Projekt **pausiert, wenn es eine Woche
  nicht benutzt wurde**. Du kannst es im Supabase-Dashboard mit einem Klick wieder starten.
- Ab und zu **Export** klicken, dann hast du immer eine Sicherungskopie.
