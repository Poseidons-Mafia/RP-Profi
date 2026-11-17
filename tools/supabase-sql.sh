#!/bin/bash
# =============================================================
#  Wiwang Law – SQL in der Supabase-Datenbank ausführen
#  Nutzt die Supabase-Verwaltungsschnittstelle (api.supabase.com).
#  Der Zugangsschlüssel wird von der Claude-Umgebung automatisch
#  mitgeschickt und steht nirgends im Code.
#
#  Aufruf:  ./tools/supabase-sql.sh datei.sql
#           ./tools/supabase-sql.sh "select 1"
# =============================================================
set -euo pipefail
REF="btpgnraeumxortphkpgz"   # Projekt "Wiwang Law Akten"
if [ $# -ne 1 ]; then echo "Aufruf: $0 <datei.sql | \"SQL\">" >&2; exit 1; fi
if [ -f "$1" ]; then SQL=$(cat "$1"); else SQL="$1"; fi
BODY=$(python3 -c 'import json,sys; print(json.dumps({"query": sys.stdin.read()}))' <<< "$SQL")
curl -sS -m 180 --fail-with-body -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer proxy-injected" -H "Content-Type: application/json" \
  --data-binary "$BODY"
echo
