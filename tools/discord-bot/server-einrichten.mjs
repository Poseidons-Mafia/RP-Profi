// =============================================================
//  Wiwang Law – Discord-Server einrichten
//
//  Legt Rollen, Kategorien und Kanäle für die Kanzlei an.
//  Die Rollen entsprechen den Rängen der Website (Personal → Ränge).
//
//  Sicherheit:
//  - Kanäle und Kategorien werden NIE gelöscht, umbenannt oder verschoben.
//  - Bestehende Rechte werden nicht verändert; fehlende Rollen werden nur
//    ergänzt.
//  - Gelöscht werden ausschließlich Rollen aus der Liste VERALTET, und nur
//    wenn niemand sie trägt.
//  - Die eigene Rolle des Bots bekommt in nicht-öffentlichen Kategorien
//    Lesen/Schreiben, damit Nigel (Orga-Modus) z. B. in #kanzlei-chat
//    Kollegen Bescheid geben kann.
//  - Standard ist die Vorschau (nichts wird geändert).
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
// Rollen = Ränge der Website, von oben nach unten (Tabelle public.raenge).
// "Mandant" ist kein Rang, sondern der Zugang zum Mandantenportal.
// Ändern sich die Ränge auf der Website, hier nachziehen.
const ROLLEN = [
  { name: "Chairman",            farbe: 0xc9a227, sichtbar: true },
  { name: "Vice Chairman",       farbe: 0xdcb43c, sichtbar: true },
  { name: "Partner",             farbe: 0xb8860b, sichtbar: true },
  { name: "Rechtsanwalt",        farbe: 0x2e5aa8, sichtbar: true },
  { name: "Fraktionsverwaltung", farbe: 0x8a5a9e, sichtbar: true },
  { name: "Sonstiges",           farbe: 0x8a8f98, sichtbar: true },
  { name: "Mandant",             farbe: 0x4a9d6e, sichtbar: false },
];
// Frühere Rollen, die es auf der Website nicht gibt (nur löschen, wenn niemand sie trägt)
const VERALTET = ["Referendar", "Praktikant", "Sekretariat"];

const KANZLEI = ["Chairman", "Vice Chairman", "Partner", "Rechtsanwalt", "Fraktionsverwaltung", "Sonstiges"];
const LEITUNG = ["Chairman", "Vice Chairman", "Partner"];

// zugang: "lesen" = alle sehen, nur Team schreibt | "alle" = alle sehen und schreiben | Liste = nur diese Rollen
const KATEGORIEN = [
  {
    name: "📢 INFORMATIONEN", zugang: "lesen",
    kanaele: [
      ["willkommen", "Willkommen bei Wiwang Law – hier findest du den Einstieg."],
      ["regeln", "Die Regeln unseres Servers."],
      ["ankuendigungen", "Neuigkeiten der Kanzlei."],
      ["gesetzesaenderungen", "Änderungen an Gesetzen und Verordnungen."],
      ["changelog", "Alle Änderungen an der Website – automatisch dokumentiert."],
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
      ["leitung", "Nur für Chairman, Vice Chairman und Partner."],
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
console.log(AUSFUEHREN ? "AUSFÜHREN – Änderungen werden vorgenommen.\n" : "VORSCHAU – es wird nichts geändert.\n");

const server = await discord("GET", `/guilds/${SERVER}`);
console.log(`Server: ${server.name}\n`);
let rollen = await discord("GET", `/guilds/${SERVER}/roles`);
const kanaele = await discord("GET", `/guilds/${SERVER}/channels`);
// Die Rolle, die Discord dem Bot beim Einladen gibt (für Nigels Nachrichten in den Kanzlei-Kanälen)
const botNutzer = await discord("GET", "/users/@me");
const botRolle = rollen.find((r) => r.tags && r.tags.bot_id === botNutzer.id);
if (!botRolle) console.log("Hinweis: Rolle des Bots nicht gefunden – Nigel kann ggf. nicht in geschlossenen Kanälen schreiben.\n");

let neu = 0, vorhanden = 0, ergaenzt = 0, geloescht = 0;

// ----- Rollen anlegen -----
console.log("Rollen:");
const rolleId = new Map(); // Name (klein) → ID
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
const echt = (id) => id && !id.startsWith("(neu:");

// ----- Kategorien und Kanäle -----
for (const k of KATEGORIEN) {
  console.log(`\n${k.name}`);
  const alle = SERVER; // die Rolle @everyone hat die ID des Servers
  const team = (n) => ({ id: idVon(n), type: 0, allow: bits(ANSEHEN, SENDEN, VERLAUF), deny: "0" });
  let rechte;
  if (k.zugang === "alle") rechte = [];
  else if (k.zugang === "lesen") {
    rechte = [{ id: alle, type: 0, allow: bits(ANSEHEN, VERLAUF), deny: bits(SENDEN) }];
    for (const n of KANZLEI) if (idVon(n)) rechte.push(team(n));
  } else {
    rechte = [{ id: alle, type: 0, allow: "0", deny: bits(ANSEHEN) }];
    for (const n of k.zugang) if (idVon(n)) rechte.push(team(n));
  }
  if (rechte.length && botRolle) rechte.push({ id: botRolle.id, type: 0, allow: bits(ANSEHEN, SENDEN, VERLAUF), deny: "0" });

  let kategorie = kanaele.find((c) => c.type === 4 && gleich(c.name, k.name));
  if (kategorie) {
    vorhanden++;
    // Nur fehlende Rollen ergänzen – bestehende Rechte bleiben unverändert
    const fehlend = rechte.filter((o) => o.id !== alle && !(kategorie.permission_overwrites || []).some((x) => x.id === o.id));
    if (!fehlend.length) console.log("  = Kategorie gibt es schon (Rechte vollständig)");
    for (const o of fehlend) {
      const name = rollen.find((r) => r.id === o.id)?.name || [...rolleId].find(([, id]) => id === o.id)?.[0] || o.id;
      console.log(`  ~ Rechte ergänzen für ${name}`); ergaenzt++;
      if (AUSFUEHREN && echt(o.id)) await discord("PUT", `/channels/${kategorie.id}/permissions/${o.id}`, { type: 0, allow: o.allow, deny: o.deny });
    }
  } else {
    neu++;
    console.log(`  + Kategorie (${k.zugang === "alle" ? "für alle" : k.zugang === "lesen" ? "alle lesen, Team schreibt" : "nur " + k.zugang.join(", ")})`);
    if (AUSFUEHREN) kategorie = await discord("POST", `/guilds/${SERVER}/channels`, { name: k.name, type: 4, permission_overwrites: rechte.filter((o) => echt(o.id) || o.id === alle) });
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

// ----- Veraltete Rollen entfernen (nur wenn leer) -----
console.log("\nVeraltete Rollen (gibt es auf der Website nicht):");
let anzahl = {};
try { anzahl = await discord("GET", `/guilds/${SERVER}/roles/member-counts`); } catch { anzahl = null; }
for (const name of VERALTET) {
  const r = rollen.find((x) => gleich(x.name, name));
  if (!r) { console.log(`  = ${name} (gibt es nicht)`); continue; }
  if (anzahl === null) { console.log(`  ! ${name} bleibt – Mitgliederzahl nicht abfragbar, bitte von Hand prüfen`); continue; }
  const n = anzahl[r.id] ?? 0;
  if (n > 0) { console.log(`  ! ${name} bleibt – wird von ${n} Person(en) getragen`); continue; }
  console.log(`  - ${name} (leer, wird gelöscht)`); geloescht++;
  if (AUSFUEHREN) await discord("DELETE", `/guilds/${SERVER}/roles/${r.id}`);
}

// ----- Reihenfolge der Rollen: wie auf der Website -----
// Die Rollen tauschen nur untereinander die Plätze, die sie schon belegen.
if (AUSFUEHREN) {
  rollen = await discord("GET", `/guilds/${SERVER}/roles`);
  const unsere = ROLLEN.map((r) => rollen.find((x) => gleich(x.name, r.name))).filter(Boolean);
  const plaetze = unsere.map((r) => r.position).sort((a, b) => b - a);
  const gewuenscht = unsere.map((r, i) => ({ id: r.id, position: plaetze[i] }));
  if (gewuenscht.some((g, i) => unsere[i].position !== g.position)) {
    await discord("PATCH", `/guilds/${SERVER}/roles`, gewuenscht);
    console.log("\nReihenfolge der Rollen angepasst (Chairman oben).");
  }
}

console.log(`\n${AUSFUEHREN ? "Angelegt" : "Würde anlegen"}: ${neu} · Rechte ergänzt: ${ergaenzt} · ${AUSFUEHREN ? "Gelöscht" : "Würde löschen"}: ${geloescht} · Schon vorhanden: ${vorhanden}`);
if (!AUSFUEHREN) console.log("Nichts verändert. Zum Anwenden den Workflow mit \"ausfuehren\" starten.");
