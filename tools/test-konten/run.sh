#!/bin/bash
# =============================================================
#  Wiwang Law – Test für Update 11 (Discord-Login & Charaktere)
#  und Update 12 (Mandantenportal)
#  Baut in einer LOKALEN Postgres-Datenbank die Supabase-Umgebung
#  nach, spielt alle supabase-*.sql ein und prüft die Abläufe
#  (Registrierung, Freigabe, Wechsel, Übernahme, Sperren, Rechte).
#  Berührt NIE die Live-Datenbank.
#
#  Aufruf: PGHOST=… PGPORT=… PGUSER=postgres ./tools/test-konten/run.sh
# =============================================================
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=wiwang_test
psql -qc "drop database if exists $DB" -c "create database $DB" >/dev/null
psql -d $DB -q -f tools/test-konten/00-supabase-nachbau.sql 2>/dev/null
for f in supabase.sql supabase-nutzerverwaltung.sql supabase-update-{2,3,4,5,6,7,8,9,10,11,12}.sql; do
  psql -d $DB -q -v ON_ERROR_STOP=1 -f "$f" >/dev/null 2>&1 || { echo "FEHLER beim Einspielen von $f"; exit 1; }
done
for n in 11 12; do
  psql -d $DB -q -v ON_ERROR_STOP=1 -f supabase-update-$n.sql >/dev/null 2>&1 || { echo "Update $n nicht mehrfach ausführbar"; exit 1; }
done
for f in tools/test-konten/10-szenario.sql tools/test-konten/20-mandantenportal.sql; do
  echo "=== $f"
  psql -d $DB -f "$f" 2>&1 | grep -E "NOTICE:  ok|ERROR|ALLE TESTS" | sed 's/^.*NOTICE:  //'
done
