# Arbeitsweise für Claude

## Standard-Ablauf: Alles fertig machen, Freigabe erfolgt in GitHub

Jede Aufgabe wird so weit erledigt, dass der Nutzer sie nur noch in GitHub genehmigen (mergen) muss:

1. Änderungen auf dem eigenen Arbeits-Branch umsetzen (nie direkt auf `main`).
2. Committen und den Branch pushen.
3. **Ohne Nachfrage** einen Pull Request gegen `main` erstellen, mit verständlicher deutscher Beschreibung (was wurde geändert, warum, worauf beim Prüfen achten).
4. Dem Nutzer den Link zum Pull Request geben.

## Changelog-Abschnitt in jedem Pull Request

Jede PR-Beschreibung beginnt mit einem Abschnitt `## Changelog`. Er wird nach dem Merge automatisch in den
Discord-Kanal #changelog gepostet und von **Kanzlei-Mitgliedern und Mandanten** gelesen. Deshalb:
- Erste Zeile fett als kurze Überschrift, z. B. `**Termine lassen sich jetzt in den Kalender übernehmen**`.
- Danach 1–4 kurze Stichpunkte: was ist neu oder besser, und wo findet man es auf der Website.
- Einfache Sprache, keine Technik: keine Dateinamen, Workflows, Datenbank, Code, Secrets, PR-Nummern.
- Betrifft eine Änderung nur die Technik (nichts, was Nutzer merken), den Abschnitt weglassen – dann wird nichts gepostet.
- Die technischen Details (was geändert, worauf beim Prüfen achten) stehen darunter in eigenen Abschnitten.

Nicht selbst mergen und nichts direkt live schalten.

## Ausnahme: Sofort live

Nur wenn der Nutzer ausdrücklich sagt, dass etwas sofort / ohne Genehmigung live gehen soll, darf direkt gemergt bzw. live geschaltet werden.

## Datenbank (Supabase)

SQL-Änderungen an der Live-Datenbank wirken sofort und laufen nicht über GitHub. Deshalb:
- Neue SQL-Skripte als Datei im Pull Request mitliefern.
- Erst nach Freigabe des Nutzers (oder wenn er sagt „sofort live") gegen die Live-Datenbank ausführen.

## Nigel-Funktion `ki-assistent` immer selbst bereitstellen

Der Nutzer kann die Edge Function nicht selbst neu bereitstellen. Deshalb gilt: Ändert sich etwas unter
`supabase/functions/ki-assistent/` (oder eine Änderung verlangt „Funktion neu bereitstellen“), stellt Claude sie **selbst** bereit:
- Mit `tools/deploy-ki-assistent.sh` (nutzt die Supabase-Management-API über den Proxy, Projekt aus `config.js`).
- Nach der Bereitstellung kurz prüfen, dass die Version hochgezählt wurde, und dem Nutzer das Ergebnis nennen.
- Den Nutzer nie auffordern, die Funktion von Hand neu bereitzustellen.
