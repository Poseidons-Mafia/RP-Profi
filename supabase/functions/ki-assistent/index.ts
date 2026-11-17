// =============================================================
//  Wiwang Law – KI-Assistent (Supabase Edge Function)
//
//  Der Browser schickt den Chatverlauf und optional eine Akte.
//  Diese Funktion
//    1. prüft die Anmeldung und das Recht "ki_assistent",
//    2. liest die Daten MIT DEM LOGIN DES MITGLIEDS (es gelten also
//       dieselben Leserechte wie im Aktensystem),
//    3. fragt Google Gemini und gibt die Antwort zurück.
//
//  Secrets (Supabase → Edge Functions → Secrets):
//    GEMINI_API_KEY   Schlüssel aus Google AI Studio (Pflicht)
//    GEMINI_MODELL    optional, Standard "gemini-3.5-flash-lite"
//    KI_TAGESLIMIT    optional, Anfragen je Mitglied und Tag, Standard 100
// =============================================================

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";

const MODELL = Deno.env.get("GEMINI_MODELL") || "gemini-3.5-flash-lite";
const TAGESLIMIT = Number(Deno.env.get("KI_TAGESLIMIT") || 100);
const MAX_NACHRICHTEN = 20;
const MAX_ZEICHEN = 8000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function antwort(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
const fehler = (text: string, status = 400) => antwort({ fehler: text }, status);

type Nachricht = { rolle: "nutzer" | "ki"; text: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fehler("Nur POST", 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return fehler("Der KI-Schlüssel fehlt noch (Secret GEMINI_API_KEY in Supabase).", 500);

  // ---------- Anmeldung ----------
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return fehler("Nicht angemeldet", 401);
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const db = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await db.auth.getUser(token);
  if (userError || !userData?.user) return fehler("Anmeldung abgelaufen. Bitte neu anmelden.", 401);
  const userId = userData.user.id;

  const { data: darf } = await db.rpc("hat_recht", { p_recht: "ki_assistent" });
  if (darf !== true) return fehler("Dein Rang darf den KI-Assistenten nicht nutzen.", 403);

  // ---------- Eingabe ----------
  let body: { nachrichten?: Nachricht[]; akte_id?: string | null };
  try { body = await req.json(); } catch { return fehler("Ungültige Anfrage"); }
  const nachrichten = (Array.isArray(body.nachrichten) ? body.nachrichten : [])
    .filter((n) => n && (n.rolle === "nutzer" || n.rolle === "ki") && typeof n.text === "string" && n.text.trim())
    .slice(-MAX_NACHRICHTEN)
    .map((n) => ({ rolle: n.rolle, text: n.text.slice(0, MAX_ZEICHEN) }));
  if (!nachrichten.length || nachrichten[nachrichten.length - 1].rolle !== "nutzer") return fehler("Keine Frage gestellt");
  const akteId = typeof body.akte_id === "string" && /^[0-9a-f-]{36}$/i.test(body.akte_id) ? body.akte_id : null;

  // ---------- Tageslimit ----------
  const tagesbeginn = new Date();
  tagesbeginn.setUTCHours(0, 0, 0, 0);
  const { count: heute } = await db.from("ki_nutzung").select("id", { count: "exact", head: true })
    .eq("user_id", userId).gte("zeit", tagesbeginn.toISOString());
  if ((heute ?? 0) >= TAGESLIMIT) return fehler(`Tageslimit erreicht (${TAGESLIMIT} Anfragen). Morgen geht es weiter.`, 429);

  // ---------- Kontext aus der Datenbank ----------
  let kontext: string;
  try {
    kontext = await kontextBauen(db, akteId);
  } catch (e) {
    console.error(e);
    return fehler("Die Daten für die KI konnten nicht geladen werden.", 500);
  }

  // ---------- Gemini fragen ----------
  const anfrage = {
    systemInstruction: { parts: [{ text: SYSTEM + "\n\n" + kontext }] },
    contents: nachrichten.map((n) => ({ role: n.rolle === "ki" ? "model" : "user", parts: [{ text: n.text }] })),
  };
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODELL)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(anfrage),
    });
  } catch (e) {
    console.error(e);
    return fehler("Google ist gerade nicht erreichbar.", 502);
  }
  const daten = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Gemini", res.status, JSON.stringify(daten).slice(0, 2000));
    if (res.status === 429) return fehler("Das Gratis-Kontingent von Google ist gerade ausgeschöpft. Bitte in einer Minute (oder morgen) erneut versuchen.", 429);
    if (res.status === 400 || res.status === 403) return fehler("Google hat die Anfrage abgelehnt (Schlüssel oder Modell prüfen).", 502);
    return fehler("Die KI hat einen Fehler gemeldet. Bitte erneut versuchen.", 502);
  }
  const kandidat = daten?.candidates?.[0];
  const text = (kandidat?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("").trim();
  if (!text) {
    const grund = kandidat?.finishReason || daten?.promptFeedback?.blockReason || "unbekannt";
    return fehler(`Die KI hat keine Antwort geliefert (Grund: ${grund}).`, 502);
  }

  const tokensEin = daten?.usageMetadata?.promptTokenCount ?? null;
  const tokensAus = daten?.usageMetadata?.candidatesTokenCount ?? null;
  await db.from("ki_nutzung").insert({ user_id: userId, akte_id: akteId, tokens_ein: tokensEin, tokens_aus: tokensAus });

  return antwort({ antwort: text, modell: MODELL, heute: (heute ?? 0) + 1, limit: TAGESLIMIT });
});


// =============================================================
//  Anweisungen und Kontext
// =============================================================
const SYSTEM = `Du bist der KI-Assistent der Anwaltskanzlei in einem GTA-Roleplay-Server (fiktive Welt, fiktive Gesetze).
Du unterstützt die Kanzlei-Mitglieder bei ihrer Arbeit: Akten zusammenfassen, Verteidigungsstrategien und nächste
Schritte vorschlagen, passende Paragraphen aus dem Gesetzbuch des Servers finden, Strafrahmen ausrechnen und
Schriftsätze entwerfen.

Regeln:
- Antworte auf Deutsch, sachlich und knapp. Nutze kurze Absätze oder Stichpunkte.
- Es gilt NUR das unten stehende Gesetzbuch des Servers, nicht das echte deutsche Recht. Nenne nur Paragraphen,
  die dort stehen. Steht etwas nicht drin, sag das offen.
- Erfinde keine Fakten über Akten, Personen oder Termine. Nutze nur die Daten unten und das, was im Chat steht.
- Schriftsätze kennzeichnest du als Entwurf und lässt Platzhalter wie [Datum] stehen, wenn Angaben fehlen.
- Geldbeträge in der Währung der Kanzlei, Haft in der Hafteinheit der Kanzlei.`;

function zeile(...teile: unknown[]) {
  return teile.filter((t) => t !== null && t !== undefined && t !== "").join(" · ");
}

// deno-lint-ignore no-explicit-any
type Zeile = Record<string, any>;

async function kontextBauen(db: SupabaseClient, akteId: string | null): Promise<string> {
  const [einst, gesetze, akten, mandanten, profile] = await Promise.all([
    db.from("einstellungen").select("daten").eq("id", 1).maybeSingle(),
    db.from("gesetze").select("paragraph,titel,kategorie,deliktsart,geldstrafe_min,geldstrafe,haft_min,haft,gesamt_erhoeht,bemerkung").order("paragraph"),
    db.from("akten").select("id,number,title,status,typ,area,mandant_id,client,zustaendig_id,prioritaet,in_haft,updated_at")
      .neq("status", "Geschlossen").order("updated_at", { ascending: false }).limit(100),
    db.from("mandanten").select("id,name"),
    db.from("profiles").select("user_id,anzeigename,email"),
  ]);
  const s: Zeile = { kanzlei: "Kanzlei", ort: "Los Santos", waehrung: "$", haft_einheit: "HE", ...(einst.data?.daten || {}) };
  const mandant = new Map((mandanten.data || []).map((m: Zeile) => [m.id, m.name]));
  const person = new Map((profile.data || []).map((p: Zeile) => [p.user_id, p.anzeigename || p.email]));

  const teile: string[] = [];
  teile.push(`## Kanzlei\n${zeile(s.kanzlei, s.ort, `Währung ${s.waehrung}`, `Hafteinheit ${s.haft_einheit}`)}\nHeute: ${new Date().toISOString().slice(0, 10)}`);

  if (gesetze.data?.length) {
    teile.push("## Gesetzbuch des Servers\n" + gesetze.data.map((g: Zeile) => {
      const geld = g.geldstrafe ? `Geldstrafe ${g.geldstrafe_min ? g.geldstrafe_min + "–" : ""}${g.geldstrafe} ${s.waehrung}` : "";
      const haft = g.haft ? `Haft ${g.haft_min ? g.haft_min + "–" : ""}${g.haft} ${s.haft_einheit}` : "";
      return "- " + zeile(g.paragraph, g.titel, g.deliktsart, geld, haft, g.gesamt_erhoeht ? "Gesamtstrafe erhöht" : "", g.bemerkung, `[${g.kategorie || "ohne Kategorie"}]`);
    }).join("\n"));
  } else {
    teile.push("## Gesetzbuch des Servers\n(nicht verfügbar – fehlendes Leserecht oder leer)");
  }

  if (akten.data?.length) {
    teile.push("## Offene Akten (Übersicht)\n" + akten.data.map((a: Zeile) =>
      "- " + zeile(a.number, a.title, a.status, a.typ || a.area, mandant.get(a.mandant_id) || a.client,
        a.prioritaet && a.prioritaet !== "Normal" ? a.prioritaet : "", a.in_haft ? "Mandant in Haft" : "",
        a.zustaendig_id ? `zuständig: ${person.get(a.zustaendig_id) || "?"}` : "")).join("\n"));
  }

  if (akteId) teile.push(await akteDetail(db, akteId, s, mandant, person));
  return teile.join("\n\n");
}

async function akteDetail(db: SupabaseClient, id: string, s: Zeile, mandant: Map<string, string>, person: Map<string, string>) {
  const { data: a } = await db.from("akten").select("*").eq("id", id).maybeSingle();
  if (!a) return "## Ausgewählte Akte\n(nicht gefunden oder kein Leserecht)";
  const [eintraege, beteiligte, beweise, termine, aufgaben, m] = await Promise.all([
    db.from("eintraege").select("art,titel,text,wichtig,author,created_at,zeitpunkt").eq("akte_id", id).order("created_at").limit(200),
    db.from("beteiligte").select("rolle,name,kontakt,notiz").eq("akte_id", id),
    db.from("beweise").select("art,titel,beschreibung,link").eq("akte_id", id),
    db.from("termine").select("titel,art,beginn,ort,notiz,erledigt").eq("akte_id", id).order("beginn"),
    db.from("aufgaben").select("text,faellig,erledigt").eq("akte_id", id),
    a.mandant_id ? db.from("mandanten").select("name,telefon,discord,geburtsdatum,markierungen,notizen").eq("id", a.mandant_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const out: string[] = [`## Ausgewählte Akte: ${a.number || ""} ${a.title || ""}`];
  out.push(zeile(`Status ${a.status}`, a.phase ? `Phase ${a.phase}` : "", a.typ || a.area, a.mandatsart, a.prioritaet ? `Priorität ${a.prioritaet}` : "",
    a.zustaendig_id ? `Zuständig: ${person.get(a.zustaendig_id) || "?"}` : a.lawyer ? `Zuständig: ${a.lawyer}` : ""));
  out.push(`Mandant: ${m.data ? zeile(m.data.name, m.data.geburtsdatum ? `geb. ${m.data.geburtsdatum}` : "", (m.data.markierungen || []).join(", "), m.data.notizen) : mandant.get(a.mandant_id) || a.client || "–"}`);
  if (a.opponent) out.push(`Gegenpartei: ${a.opponent}`);
  if (a.az_extern) out.push(`Externe Aktenzeichen: ${typeof a.az_extern === "string" ? a.az_extern : JSON.stringify(a.az_extern)}`);
  if (a.in_haft) out.push(`Mandant in Haft${a.haft_bis ? ` bis ${a.haft_bis}` : ""}`);
  if (a.summary) out.push(`Sachverhalt: ${a.summary}`);
  if (a.stand) out.push(`Aktueller Stand${a.stand_am ? ` (${a.stand_am})` : ""}: ${a.stand}`);
  if (a.naechster_schritt) out.push(`Nächster Schritt: ${a.naechster_schritt}`);
  if ((a.vorwuerfe || []).length) {
    out.push("Tatvorwürfe:\n" + a.vorwuerfe.map((v: Zeile) => `- ${v.anzahl > 1 ? v.anzahl + "× " : ""}${zeile(v.paragraph, v.titel)}`).join("\n"));
  }
  if (a.ergebnis) out.push(`Ergebnis: ${zeile(a.ergebnis, a.ergebnis_datum, a.ergebnis_details)}`);
  if (beteiligte.data?.length) out.push("Beteiligte:\n" + beteiligte.data.map((b: Zeile) => "- " + zeile(b.rolle, b.name, b.kontakt, b.notiz)).join("\n"));
  if (beweise.data?.length) out.push("Beweise:\n" + beweise.data.map((b: Zeile) => "- " + zeile(b.art, b.titel, b.beschreibung)).join("\n"));
  if (termine.data?.length) out.push("Termine:\n" + termine.data.map((t: Zeile) => "- " + zeile(t.beginn, t.art, t.titel, t.ort, t.notiz, t.erledigt ? "erledigt" : "")).join("\n"));
  if (aufgaben.data?.length) out.push("Aufgaben:\n" + aufgaben.data.map((t: Zeile) => "- " + zeile(t.text, t.faellig ? `fällig ${t.faellig}` : "", t.erledigt ? "erledigt" : "offen")).join("\n"));
  if (eintraege.data?.length) {
    out.push("Verlauf:\n" + eintraege.data.map((e: Zeile) =>
      `- ${(e.zeitpunkt || e.created_at || "").slice(0, 16).replace("T", " ")} ${e.art || ""}${e.wichtig ? " (wichtig)" : ""}${e.author ? ` – ${e.author}` : ""}: ${zeile(e.titel, e.text)}`).join("\n"));
  }
  return out.join("\n");
}
