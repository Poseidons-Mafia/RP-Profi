// =============================================================
//  Postet eine Änderung der Website als übersichtliche Karte in den
//  Discord-Kanal #changelog. Wird vom Workflow "Changelog auf Discord"
//  nach jedem gemergten Pull Request aufgerufen.
//
//  Eingabe (Umgebungsvariablen): DISCORD_BOT_TOKEN, DISCORD_SERVER_ID,
//  PR_TITEL, PR_TEXT, PR_URL, PR_NUMMER.
//  Fehlt der Kanal oder das Token, wird nur gewarnt – der Workflow
//  schlägt dann nicht fehl.
// =============================================================
import { readFileSync } from "node:fs";

const { DISCORD_BOT_TOKEN: TOKEN, DISCORD_SERVER_ID: SERVER } = process.env;
const titel = (process.env.PR_TITEL || "Änderung").trim();
const text = process.env.PR_TEXT || "";
const url = process.env.PR_URL || "";
const nummer = process.env.PR_NUMMER || "";
const KANAL = process.env.CHANGELOG_KANAL || "changelog";
const API = "https://discord.com/api/v10";

if (!TOKEN || !SERVER) {
  console.log("::warning::DISCORD_BOT_TOKEN oder DISCORD_SERVER_ID fehlt – kein Changelog gepostet.");
  process.exit(0);
}

let version = "";
try { version = JSON.parse(readFileSync("version.json", "utf8")).version; } catch {}

// Beschreibung aufräumen: Fußzeilen der Werkzeuge entfernen, Überschriften zu fetten Zeilen
let beschr = text
  .replace(/\r/g, "")
  .split("\n")
  .filter((z) => !/Generated with|claude\.ai\/code|claude\.com\/claude-code/i.test(z))
  .map((z) => z.replace(/^#{1,6}\s+(.*)$/, "**$1**"))
  .join("\n")
  .replace(/\n{3,}/g, "\n\n")
  .trim();
if (beschr.length > 3500) beschr = beschr.slice(0, 3500).replace(/\s+\S*$/, "") + "\n… *(gekürzt – Details im Pull Request)*";
if (!beschr) beschr = "*Keine Beschreibung hinterlegt.*";

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
    return await res.json();
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
  await discord("POST", `/channels/${kanal.id}/messages`, {
    allowed_mentions: { parse: [] },
    embeds: [{
      title: `🆕 ${titel}`.slice(0, 256),
      url: url || undefined,
      description: beschr,
      color: 0xc9a227,
      fields: [
        ...(version ? [{ name: "Version", value: `v${version}`, inline: true }] : []),
        ...(nummer ? [{ name: "Pull Request", value: `#${nummer}`, inline: true }] : []),
      ],
      footer: { text: "Wiwang Law – Aktensystem" },
      timestamp: new Date().toISOString(),
    }],
  });
  console.log(`Changelog in #${kanal.name} gepostet.`);
} catch (e) {
  console.log(`::error::${e.message}`);
  process.exit(1);
}
