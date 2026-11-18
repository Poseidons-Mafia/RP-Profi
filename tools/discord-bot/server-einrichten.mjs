// =============================================================
//  Wiwang Law – Discord-Server einrichten
//
//  Legt Rollen, Kategorien und Kanäle für die Kanzlei an.
//  - Löscht, benennt oder ändert NIE etwas Bestehendes um.
//  - Was es schon gibt (gleicher Name), wird übersprungen –
//    das Skript kann gefahrlos mehrfach laufen.
//  - Standard ist die Vorschau (nichts wird angelegt).
//
//  Aufruf (über GitHub → Actions → "Discord-Server einrichten"):
//    DISCORD_BOT_TOKEN=… DISCORD_SERVER_ID=… node server-einrichten.mjs [--ausfuehren]
//
//  Der Bot braucht auf dem Server die Rechte "Rollen verwalten",
//  "Kanäle verwalten", "Kanäle ansehen", "Nachrichten senden" und
//  "Nachrichtenverlauf anzeigen" (siehe README).
// =============================================================

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const SERVER = process.env.DISCORD_SERVER_ID;
const AUSFUEHREN = process.argv.includes("--ausfuehren");
const API = "https://discord.com/api/v10";

if (!TOKEN || !SERVER) {
  console.error("DISCORD_BOT_TOKEN und DISCORD_SERVER_ID fehlen.");
  process.exit(1);
}

// Berechtigungs-Bits
const ANSEHEN = 1n << 10n;   // Kanal ansehen
const SENDEN = 1n << 11n;    // Nachrichten senden
const VERLAUF = 1n << 16n;   // Nachrichtenverlauf lesen

// ---------- Plan ----------
// Rollen entsprechen den Rängen auf der Website (Personal → Ränge).
const ROLLEN = [
  { name: "Chairman",     farbe: 0xc9a227, sichtbar: true },
  { name: "Partner",      farbe: 0xb8860b, sichtbar: true },
  { name: "Rechtsanwalt", farbe: 0x2e5aa8, sichtbar: true },
  { name: "Referendar",   farbe: 0x3a7ca5, sichtbar: true },
  { name: "Praktikant",   farbe: 0x6b8fa8, sichtbar: true },
  { name: "Sekretariat",  farbe: 0x7a5fa0, sichtbar: true },
  { name: "Mandant",      farbe: 0x4a9d6e, sichtbar: false },
];
const KANZLEI = ["Chairman", "Partner", "Rechtsanwalt", "Referendar", "Praktikant", "Sekretariat"];
const LEITUNG = ["Chairman", "Partner"];

// zugang: "lesen" = alle sehen, nur Team schreibt | "alle" = alle sehen und schreiben | Liste = nur diese Rollen
const KATEGORIEN = [
  {
    name: "📢 INFORMATIONEN", zugang: "lesen",
    kanaele: [
      ["willkommen", "Willkommen bei Wiwang Law – hier findest du den Einstieg."],
      ["regeln", "Die Regeln unseres Servers."],
      ["ankuendigungen", "Neuigkeiten der Kanzlei."],
    ],
  },
  {
    name: "🏛️ KANZLEI", zugang: KANZLEI,
    kanaele: [
      ["kanzlei-chat", "Austausch im Team."],
      ["aktenbesprechung", "Fälle und Akten besprechen."],
      ["termine-und-fristen", "Anstehende Termine und Fristen."],
      ["besprechungsraum", null, "voice"],
    ],
  },
  {
    name: "👔 LEITUNG", zugang: LEITUNG,
    kanaele: [
      ["leitung", "Nur für Chairman und Partner."],
      ["personal", "Personalfragen."],
      ["finanzen", "Buchhaltung und Rechnungen."],
    ],
  },
  {
    name: "🤝 MANDANTEN", zugang: [...KANZLEI, "Mandant"],
    kanaele: [
      ["mandanten-lounge", "Treffpunkt für Mandanten und Kanzlei."],
      ["anfragen", "Neue Anfragen und Terminwünsche."],
    ],
  },
  {
    name: "🤖 WEBSITE & BOT", zugang: [...KANZLEI, "Mandant"],
    kanaele: [
      ["bot-befehle", "Hier kannst du /konto und /termine nutzen."],
    ],
  },
  {
    name: "💬 ALLGEMEIN", zugang: "alle",
    kanaele: [
      ["smalltalk", "Alles, was nicht zur Arbeit gehört."],
      ["lounge", null, "voice"],
    ],
  },
];

// ---------- Discord-Zugriff (mit Wartezeit bei Rate-Limit) ----------
async function discord(methode, pfad, body) {
  for (let versuch = 0; versuch < 5; versuch++) {
    const res = await fetch(API + pfad, {
      method: methode,
      headers: { Authorization: `Bot ${TOKEN}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      const warte = (await res.json().catch(() => ({}))).retry_after ?? 2;
      await new Promise((r) => setTimeout(r, Math.ceil(warte * 1000) + 100));
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      const hinweis = res.status === 403
        ? "\n→ Dem Bot fehlen Rechte (Rollen verwalten / Kanäle verwalten) oder seine Rolle steht zu niedrig."
        : "";
      throw new Error(`${methode} ${pfad} → ${res.status} ${text}${hinweis}`);
    }
    return res.status === 204 ? null : await res.json();
  }
  throw new Error(`${methode} ${pfad}: zu viele Rate-Limits`);
}

const gleich = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const bits = (...werte) => werte.reduce((s, w) => s | w, 0n).toString();

// ---------- Ablauf ----------
console.log(AUSFUEHREN ? "AUSFÜHREN – Änderungen werden vorgenommen.\n" : "VORSCHAU – es wird nichts angelegt.\n");

const server = await discord("GET", `/guilds/${SERVER}`);
console.log(`Server: ${server.name}\n`);
const rollen = await discord("GET", `/guilds/${SERVER}/roles`);
const kanaele = await discord("GET", `/guilds/${SERVER}/channels`);

let neu = 0, vorhanden = 0;

// Rollen
console.log("Rollen:");
const rolleId = new Map(); // Name → ID (bestehende und neue)
for (const r of rollen) rolleId.set(r.name.toLowerCase(), r.id);
for (const r of ROLLEN) {
  const bestehend = rollen.find((x) => gleich(x.name, r.name));
  if (bestehend) { console.log(`  = ${r.name} (gibt es schon)`); vorhanden++; continue; }
  console.log(`  + ${r.name}`); neu++;
  if (AUSFUEHREN) {
    const angelegt = await discord("POST", `/guilds/${SERVER}/roles`, {
      name: r.name, color: r.farbe, hoist: r.sichtbar, mentionable: false, permissions: "0",
    });
    rolleId.set(r.name.toLowerCase(), angelegt.id);
  } else rolleId.set(r.name.toLowerCase(), `(neu:${r.name})`);
}
const idVon = (name) => rolleId.get(name.toLowerCase());

// Kategorien und Kanäle
for (const k of KATEGORIEN) {
  console.log(`\n${k.name}`);
  let kategorie = kanaele.find((c) => c.type === 4 && gleich(c.name, k.name));
  if (kategorie) { console.log("  = Kategorie gibt es schon (Rechte bleiben unverändert)"); vorhanden++; }
  else {
    neu++;
    const alle = SERVER; // die Rolle @everyone hat die ID des Servers
    let rechte;
    if (k.zugang === "alle") rechte = [];
    else if (k.zugang === "lesen") {
      rechte = [{ id: alle, type: 0, allow: bits(ANSEHEN, VERLAUF), deny: bits(SENDEN) }];
      for (const n of KANZLEI) if (idVon(n)) rechte.push({ id: idVon(n), type: 0, allow: bits(ANSEHEN, SENDEN, VERLAUF), deny: "0" });
    } else {
      rechte = [{ id: alle, type: 0, allow: "0", deny: bits(ANSEHEN) }];
      for (const n of k.zugang) if (idVon(n)) rechte.push({ id: idVon(n), type: 0, allow: bits(ANSEHEN, SENDEN, VERLAUF), deny: "0" });
    }
    console.log(`  + Kategorie (${k.zugang === "alle" ? "für alle" : k.zugang === "lesen" ? "alle lesen, Team schreibt" : "nur " + k.zugang.join(", ")})`);
    if (AUSFUEHREN) kategorie = await discord("POST", `/guilds/${SERVER}/channels`, { name: k.name, type: 4, permission_overwrites: rechte });
  }

  for (const [name, thema, art] of k.kanaele) {
    const typ = art === "voice" ? 2 : 0;
    const bestehend = kanaele.find((c) => c.type === typ && gleich(c.name, name));
    if (bestehend) { console.log(`  = #${name} (gibt es schon, bleibt wo es ist)`); vorhanden++; continue; }
    console.log(`  + ${typ === 2 ? "🔊" : "#"}${name}`); neu++;
    if (AUSFUEHREN) {
      // Ohne eigene Rechte übernimmt der Kanal die der Kategorie
      await discord("POST", `/guilds/${SERVER}/channels`, {
        name, type: typ, parent_id: kategorie.id, ...(thema ? { topic: thema } : {}),
      });
    }
  }
}

console.log(`\n${AUSFUEHREN ? "Angelegt" : "Würde anlegen"}: ${neu} · Schon vorhanden: ${vorhanden}`);
if (!AUSFUEHREN) console.log("Nichts verändert. Zum Anlegen den Workflow mit \"ausfuehren\" starten.");
