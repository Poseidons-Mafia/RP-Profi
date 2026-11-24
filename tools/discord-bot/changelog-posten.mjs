// =============================================================
//  Postet eine Änderung der Website als kurze, verständliche Karte in
//  den Discord-Kanal #changelog – gedacht für Kanzlei-Mitglieder und
//  Mandanten, nicht für Technik.
//
//  Gepostet wird NUR der Abschnitt "## Changelog" aus der Beschreibung
//  des Pull Requests (bis zur nächsten Überschrift). Fehlt er, wird
//  nichts gepostet (reine Technik-Änderung).
//
//  Gibt es für denselben Pull Request schon eine Karte, wird sie
//  bearbeitet statt neu gepostet (so lassen sich Texte korrigieren).
//
//  Eingabe: DISCORD_BOT_TOKEN, DISCORD_SERVER_ID, PR_NUMMER,
//  GITHUB_TOKEN, GITHUB_REPOSITORY (setzt GitHub Actions).
// =============================================================
import { readFileSync } from "node:fs";

const { DISCORD_BOT_TOKEN: TOKEN, DISCORD_SERVER_ID: SERVER, PR_NUMMER: NR, GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
const KANAL = process.env.CHANGELOG_KANAL || "changelog";
const API = "https://discord.com/api/v10";
const FUSS = (nr) => `Wiwang Law · Änderung Nr. ${nr}`;

if (!TOKEN || !SERVER || !NR) {
  console.log("::warning::DISCORD_BOT_TOKEN, DISCORD_SERVER_ID oder PR_NUMMER fehlt – kein Changelog gepostet.");
  process.exit(0);
}

// Pull Request frisch von GitHub holen (so wirken nachträgliche Korrekturen der Beschreibung)
const prRes = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/pulls/${NR}`, {
  headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
});
if (!prRes.ok) { console.log(`::error::Pull Request #${NR} nicht lesbar: ${prRes.status}`); process.exit(1); }
const pr = await prRes.json();

// Abschnitt "## Changelog" herausschneiden
const zeilen = (pr.body || "").replace(/\r/g, "").split("\n");
const start = zeilen.findIndex((z) => /^#{1,6}\s*.*changelog/i.test(z));
if (start < 0) {
  console.log(`PR #${NR} hat keinen Abschnitt "## Changelog" – nichts gepostet.`);
  process.exit(0);
}
const ebene = zeilen[start].match(/^#+/)[0].length;
const abschnitt = [];
for (const z of zeilen.slice(start + 1)) {
  const h = z.match(/^(#{1,6})\s/);
  if ((h && h[1].length <= ebene) || /^\s*(---|\*\*\*|___)\s*$/.test(z)) break;
  abschnitt.push(z.replace(/^#{1,6}\s+(.*)$/, "**$1**"));
}
let text = abschnitt.join("\n").replace(/\n{3,}/g, "\n\n").trim();
if (!text) { console.log("Abschnitt Changelog ist leer – nichts gepostet."); process.exit(0); }
if (text.length > 3800) text = text.slice(0, 3800).replace(/\s+\S*$/, "") + " …";

// Überschrift der Karte: erste fette Zeile im Abschnitt ("**Titel**") oder Titel des PR
let titel = pr.title;
const fett = text.match(/^\*\*(.+?)\*\*\s*\n/);
if (fett) { titel = fett[1]; text = text.slice(fett[0].length).trim(); }

let version = "";
try { version = JSON.parse(readFileSync("version.json", "utf8")).version; } catch {}

async function discord(methode, pfad, body) {
  for (let i = 0; i < 5; i++) {
    const res = await fetch(API + pfad, {
      method: methode,
      headers: { Authorization: `Bot ${TOKEN}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      const w = (await res.json().catch(() => ({}))).retry_after ?? 2;
      await new Promise((r) => setTimeout(r, Math.ceil(w * 1000) + 100));
      continue;
    }
    if (!res.ok) throw new Error(`${methode} ${pfad} → ${res.status} ${await res.text()}`);
    return res.status === 204 ? null : await res.json();
  }
  throw new Error("Zu viele Rate-Limits");
}

try {
  const kanaele = await discord("GET", `/guilds/${SERVER}/channels`);
  const kanal = kanaele.find((c) => c.type === 0 && c.name.toLowerCase() === KANAL);
  if (!kanal) {
    console.log(`::warning::Kanal #${KANAL} nicht gefunden – erst "Discord-Server einrichten" ausführen.`);
    process.exit(0);
  }
  const karte = {
    allowed_mentions: { parse: [] },
    content: "",
    embeds: [{
      title: `✨ ${titel}`.slice(0, 256),
      description: text,
      color: 0xc9a227,
      footer: { text: FUSS(NR) + (version ? ` · Version ${version}` : "") },
      timestamp: pr.merged_at || new Date().toISOString(),
    }],
  };

  // Schon eine Karte zu diesem PR? Dann bearbeiten (auch ältere Karten mit "#NR" im Feld)
  const ich = await discord("GET", "/users/@me");
  const letzte = await discord("GET", `/channels/${kanal.id}/messages?limit=100`);
  const alt = letzte.find((m) => m.author?.id === ich.id && (m.embeds || []).some((e) =>
    (e.footer?.text || "").startsWith(FUSS(NR) + " ") || (e.footer?.text || "") === FUSS(NR) ||
    (e.fields || []).some((f) => f.name === "Pull Request" && f.value === `#${NR}`)));

  if (alt) {
    await discord("PATCH", `/channels/${kanal.id}/messages/${alt.id}`, karte);
    console.log(`Karte zu Änderung ${NR} in #${kanal.name} aktualisiert.`);
  } else {
    await discord("POST", `/channels/${kanal.id}/messages`, karte);
    console.log(`Karte zu Änderung ${NR} in #${kanal.name} gepostet.`);
  }
} catch (e) {
  console.log(`::error::${e.message}`);
  process.exit(1);
}
