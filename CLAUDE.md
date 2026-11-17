# Arbeitsweise für Claude

## Standard-Ablauf: Alles fertig machen, Freigabe erfolgt in GitHub

Jede Aufgabe wird so weit erledigt, dass der Nutzer sie nur noch in GitHub genehmigen (mergen) muss:

1. Änderungen auf dem eigenen Arbeits-Branch umsetzen (nie direkt auf `main`).
2. Committen und den Branch pushen.
3. **Ohne Nachfrage** einen Pull Request gegen `main` erstellen, mit verständlicher deutscher Beschreibung (was wurde geändert, warum, worauf beim Prüfen achten).
4. Dem Nutzer den Link zum Pull Request geben.

Nicht selbst mergen und nichts direkt live schalten.

## Ausnahme: Sofort live

Nur wenn der Nutzer ausdrücklich sagt, dass etwas sofort / ohne Genehmigung live gehen soll, darf direkt gemergt bzw. live geschaltet werden.

## Datenbank (Supabase)

SQL-Änderungen an der Live-Datenbank wirken sofort und laufen nicht über GitHub. Deshalb:
- Neue SQL-Skripte als Datei im Pull Request mitliefern.
- Erst nach Freigabe des Nutzers (oder wenn er sagt „sofort live") gegen die Live-Datenbank ausführen.
