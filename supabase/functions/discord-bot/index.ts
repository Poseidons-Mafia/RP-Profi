// =============================================================
//  Wiwang Law – Edge Function "discord-bot"
//
//  Schnittstelle zwischen dem Discord-Server und der Website.
//  Discord schickt jeden Slash-Befehl per HTTP hierher ("Interactions
//  Endpoint URL"); die Funktion liest die Daten aus Supabase und antwortet.
//  Es läuft kein eigener Bot-Prozess – nur diese Funktion.
//
//  Befehle (Antworten sieht nur die Person, die den Befehl nutzt):
//    /ping     – ist der Bot erreichbar?
//    /konto    – eigenes Konto und eigene Charaktere mit Status
//    /termine  – eigene offene Termine und Aufgaben (alle freigegebenen Charaktere)
//
//  Die Person wird über ihre Discord-ID erkannt (public.personen.discord_id,
//  gespeichert bei der Anmeldung mit Discord auf der Website).
//
//  Einrichtung: siehe README, Abschnitt "Discord-Bot einrichten".
//  Edge Function "discord-bot" mit "Verify JWT" AUS (Discord schickt kein
//  Supabase-Login; die Funktion prüft stattdessen die Discord-Signatur).
//  Secret: DISCORD_PUBLIC_KEY (Public Key der Discord-Anwendung).
// =============================================================

import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY") || "";
const WEBSITE = "https://wiwang.de";

// Discord-Konstanten
const PING = 1;
const BEFEHL = 2;
const ANTWORT_PONG = 1;
const ANTWORT_NACHRICHT = 4;
const NUR_FUER_MICH = 64; // "ephemeral": nur die aufrufende Person sieht die Antwort

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function nachricht(text: string) {
  if (text.length > 1900) text = text.slice(0, 1900) + "\n…";
  return json({ type: ANTWORT_NACHRICHT, data: { content: text, flags: NUR_FUER_MICH, allowed_mentions: { parse: [] } } });
}

// ---------- Discord-Signatur prüfen (Ed25519) ----------
function hexZuBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

let schluessel: CryptoKey | null = null;
async function signaturGueltig(signatur: string, zeitstempel: string, body: string) {
  if (!PUBLIC_KEY || !/^[0-9a-f]{128}$/i.test(signatur)) return false;
  // Alte Anfragen nicht annehmen (Schutz gegen Wiederholung)
  const alter = Math.abs(Date.now() / 1000 - Number(zeitstempel));
  if (!Number.isFinite(alter) || alter > 300) return false;
  schluessel ??= await crypto.subtle.importKey("raw", hexZuBytes(PUBLIC_KEY), { name: "Ed25519" }, false, ["verify"]);
  return await crypto.subtle.verify("Ed25519", schluessel, hexZuBytes(signatur), new TextEncoder().encode(zeitstempel + body));
}

// ---------- Daten ----------
type Person = { user_id: string; status: string; server_mitglied: boolean };
type Charakter = { id: string; user_id: string | null; name: string; status: string };

const STATUS_TEXT: Record<string, string> = {
  wartet: "⏳ wartet auf Freigabe",
  frei: "✅ freigegeben",
  abgelehnt: "❌ abgelehnt",
  gesperrt: "⛔ gesperrt",
};

async function personLaden(discordId: string) {
  const { data: person, error } = await admin.from("personen")
    .select("user_id, status, server_mitglied").eq("discord_id", discordId).maybeSingle<Person>();
  if (error) throw error;
  if (!person) return { person: null, charaktere: [] as Charakter[] };
  const { data: charaktere, error: fehler } = await admin.from("charaktere")
    .select("id, user_id, name, status").eq("person_id", person.user_id).order("created_at");
  if (fehler) throw fehler;
  return { person, charaktere: (charaktere || []) as Charakter[] };
}

const zeit = (iso: string) => `<t:${Math.floor(new Date(iso).getTime() / 1000)}:f>`; // Discord zeigt Ortszeit an

const NICHT_VERKNUEPFT =
  `Zu deinem Discord-Konto gibt es noch kein Konto auf der Website.\nMelde dich einmal auf ${WEBSITE} mit Discord an.`;

async function befehlKonto(discordId: string) {
  const { person, charaktere } = await personLaden(discordId);
  if (!person) return nachricht(NICHT_VERKNUEPFT);
  const zeilen = [`**Dein Konto:** ${STATUS_TEXT[person.status] || person.status}`];
  if (!charaktere.length) zeilen.push(`Noch keine Charaktere – beantragen auf ${WEBSITE}`);
  else {
    zeilen.push("", "**Charaktere:**");
    for (const c of charaktere) zeilen.push(`• ${c.name} – ${STATUS_TEXT[c.status] || c.status}`);
  }
  return nachricht(zeilen.join("\n"));
}

async function befehlTermine(discordId: string) {
  const { person, charaktere } = await personLaden(discordId);
  if (!person) return nachricht(NICHT_VERKNUEPFT);
  if (person.status !== "frei") return nachricht(`Dein Konto ist ${STATUS_TEXT[person.status] || person.status}.`);
  if (!person.server_mitglied) return nachricht(`Bitte melde dich einmal neu auf ${WEBSITE} an, damit die Server-Mitgliedschaft geprüft wird.`);

  // Nur freigegebene Charaktere, die nicht ausgeschieden sind
  const kandidaten = charaktere.filter((c) => c.status === "frei" && c.user_id);
  const ids = kandidaten.map((c) => c.user_id!);
  if (!ids.length) return nachricht("Du hast noch keinen freigegebenen Charakter.");
  const { data: profile, error: pFehler } = await admin.from("profiles").select("user_id, status").in("user_id", ids);
  if (pFehler) throw pFehler;
  const ausgeschieden = new Set((profile || []).filter((p) => p.status === "Ausgeschieden").map((p) => p.user_id));
  const aktiv = kandidaten.filter((c) => !ausgeschieden.has(c.user_id!));
  if (!aktiv.length) return nachricht("Du hast keinen aktiven Charakter.");
  const nameVon = new Map(aktiv.map((c) => [c.user_id!, c.name]));
  const aktivIds = [...nameVon.keys()];
  const mitName = aktiv.length > 1; // Charaktername nur anzeigen, wenn es mehrere gibt

  const seit = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // laufende Termine (letzte Stunde) mitnehmen
  const [termine, aufgaben] = await Promise.all([
    admin.from("termine").select("titel, art, beginn, ort, verantwortlich")
      .in("verantwortlich", aktivIds).eq("erledigt", false).gte("beginn", seit).order("beginn").limit(10),
    admin.from("aufgaben").select("text, faellig, zustaendig")
      .in("zustaendig", aktivIds).eq("erledigt", false).order("faellig", { nullsFirst: false }).limit(10),
  ]);
  if (termine.error) throw termine.error;
  if (aufgaben.error) throw aufgaben.error;

  const zeilen: string[] = ["**Deine nächsten Termine:**"];
  if (!termine.data?.length) zeilen.push("Keine offenen Termine.");
  for (const t of termine.data || []) {
    const wer = mitName ? ` _(${nameVon.get(t.verantwortlich)})_` : "";
    zeilen.push(`• ${zeit(t.beginn)} – **${t.titel}**${t.art && t.art !== "Termin" ? ` (${t.art})` : ""}${t.ort ? `, ${t.ort}` : ""}${wer}`);
  }
  zeilen.push("", "**Deine offenen Aufgaben:**");
  if (!aufgaben.data?.length) zeilen.push("Keine offenen Aufgaben.");
  for (const a of aufgaben.data || []) {
    const wer = mitName ? ` _(${nameVon.get(a.zustaendig)})_` : "";
    const faellig = a.faellig ? ` – fällig ${a.faellig.split("-").reverse().join(".")}` : "";
    zeilen.push(`• ${a.text}${faellig}${wer}`);
  }
  zeilen.push("", `Alles Weitere auf ${WEBSITE}`);
  return nachricht(zeilen.join("\n"));
}

// ---------- Eingang ----------
Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ fehler: "Nur POST" }, 405);

  const body = await req.text();
  const gueltig = await signaturGueltig(
    req.headers.get("X-Signature-Ed25519") || "",
    req.headers.get("X-Signature-Timestamp") || "",
    body,
  ).catch(() => false);
  if (!gueltig) return json({ fehler: "Ungültige Signatur" }, 401);

  let interaktion: { type: number; data?: { name?: string }; member?: { user?: { id: string } }; user?: { id: string } };
  try { interaktion = JSON.parse(body); } catch { return json({ fehler: "Ungültige Anfrage" }, 400); }

  if (interaktion.type === PING) return json({ type: ANTWORT_PONG });
  if (interaktion.type !== BEFEHL) return json({ fehler: "Nicht unterstützt" }, 400);

  const discordId = interaktion.member?.user?.id || interaktion.user?.id;
  if (!discordId) return nachricht("Discord-Konto nicht erkannt.");

  try {
    switch (interaktion.data?.name) {
      case "ping": return nachricht("🏓 Der Wiwang-Bot ist erreichbar.");
      case "konto": return await befehlKonto(String(discordId));
      case "termine": return await befehlTermine(String(discordId));
      default: return nachricht("Diesen Befehl kenne ich nicht.");
    }
  } catch (e) {
    console.error(e);
    return nachricht("Da ist etwas schiefgelaufen. Bitte später erneut versuchen.");
  }
});
