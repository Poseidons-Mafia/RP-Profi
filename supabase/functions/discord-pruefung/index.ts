// =============================================================
//  Wiwang Law – Edge Function "discord-pruefung"
//
//  Wird direkt nach jeder Anmeldung mit Discord aufgerufen.
//  Prüft bei Discord, ob die Person Mitglied des Discord-Servers ist,
//  und speichert das Ergebnis (und Name/Avatar) in public.personen.
//  Nur Server-Mitglieder können sich registrieren, Charaktere beantragen
//  oder zwischen Charakteren wechseln – das prüft die Datenbank selbst.
//
//  Eingabe (POST, angemeldet mit Discord): { "provider_token": "…" }
//  Ausgabe: { "mitglied": true|false, "name": "…" }
//
//  Einrichtung: Edge Function "discord-pruefung" mit "Verify JWT" AUS
//  (die Funktion prüft die Anmeldung selbst). Optionales Secret:
//  DISCORD_SERVER_ID (sonst der Wiwang-Server unten).
// =============================================================

import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const SERVER_ID = Deno.env.get("DISCORD_SERVER_ID") || "1572531594227355739";
const DISCORD_API = "https://discord.com/api/v10";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function antwort(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
const fehler = (text: string, status = 400) => antwort({ fehler: text }, status);

async function discord(pfad: string, token: string) {
  const res = await fetch(DISCORD_API + pfad, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error("Discord-Anmeldung abgelaufen. Bitte erneut mit Discord anmelden.");
  if (!res.ok) throw new Error(`Discord antwortet nicht (${res.status}). Bitte später erneut versuchen.`);
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fehler("Nur POST", 405);

  // ---------- Anmeldung prüfen ----------
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return fehler("Nicht angemeldet", 401);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return fehler("Anmeldung abgelaufen. Bitte neu anmelden.", 401);

  const identitaet = (user.identities || []).find((i) => i.provider === "discord");
  if (!identitaet) return fehler("Dieses Konto ist nicht mit Discord angemeldet.", 400);
  const discordIds = new Set(
    [identitaet.id, identitaet.identity_data?.provider_id, identitaet.identity_data?.sub]
      .filter(Boolean).map(String),
  );

  let body: { provider_token?: string };
  try { body = await req.json(); } catch { return fehler("Ungültige Anfrage"); }
  const providerToken = String(body.provider_token || "");
  if (!providerToken) return fehler("Discord-Anmeldung fehlt. Bitte erneut mit Discord anmelden.", 400);

  // ---------- Bei Discord nachfragen ----------
  let ich: { id: string; username: string; global_name?: string | null; avatar?: string | null };
  let mitglied = false;
  try {
    ich = await discord("/users/@me", providerToken);
    // Das Token muss zum angemeldeten Discord-Konto gehören
    if (!discordIds.has(String(ich.id))) return fehler("Discord-Konto passt nicht zur Anmeldung.", 403);
    // Server des Nutzers (max. 200 je Seite)
    let nach = "";
    for (let seite = 0; seite < 5 && !mitglied; seite++) {
      const server: { id: string }[] = await discord(`/users/@me/guilds?limit=200${nach ? `&after=${nach}` : ""}`, providerToken);
      mitglied = server.some((g) => String(g.id) === SERVER_ID);
      if (server.length < 200) break;
      nach = server[server.length - 1].id;
    }
  } catch (e) {
    return fehler((e as Error).message, 502);
  }

  // ---------- Speichern (Status/Freigabe bleiben unverändert) ----------
  const avatar = ich.avatar ? `https://cdn.discordapp.com/avatars/${ich.id}/${ich.avatar}.png?size=128` : null;
  const name = ich.global_name || ich.username;
  const { error } = await admin.from("personen").upsert({
    user_id: user.id,
    discord_id: String(ich.id),
    discord_name: name,
    discord_benutzer: ich.username,
    avatar_url: avatar,
    server_mitglied: mitglied,
    server_geprueft_am: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return fehler("Speichern fehlgeschlagen: " + error.message, 500);

  return antwort({ mitglied, name });
});
