#!/usr/bin/env bash
# Stellt die Edge Function "ki-assistent" (Nigel) in Supabase neu bereit.
# Nutzung: tools/deploy-ki-assistent.sh   (Zugang läuft über den Proxy bzw. SUPABASE_ACCESS_TOKEN)
set -euo pipefail
cd "$(dirname "$0")/.."
REF="btpgnraeumxortphkpgz"
AUTH=()
[ -n "${SUPABASE_ACCESS_TOKEN:-}" ] && AUTH=(-H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN")
curl -sS --fail-with-body -X POST "https://api.supabase.com/v1/projects/$REF/functions/deploy?slug=ki-assistent" \
  "${AUTH[@]}" \
  -F 'metadata={"name":"ki-assistent","entrypoint_path":"index.ts","verify_jwt":false}' \
  -F "file=@supabase/functions/ki-assistent/index.ts;filename=index.ts"
echo
