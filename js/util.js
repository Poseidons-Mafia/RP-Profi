// =============================================================
//  Wiwang Law – Hilfsfunktionen
//  HTML-Bausteine mit automatischem Schutz vor Code-Einschleusung,
//  Datums- und Geldformate, Meldungen.
// =============================================================

const $ = (id) => document.getElementById(id);

// ---------- HTML sicher zusammenbauen ----------
// html`<b>${text}</b>` maskiert ${text} automatisch. Verschachtelte html`…`
// und Arrays davon werden unverändert eingefügt.
class SafeHtml {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function toHtml(v) {
  if (v === null || v === undefined || v === false || v === true) return "";
  if (v instanceof SafeHtml) return v.s;
  if (Array.isArray(v)) return v.map(toHtml).join("");
  return esc(v);
}

function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += toHtml(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

// Text mit Zeilenumbrüchen sicher als HTML
function multiline(text) {
  return new SafeHtml(esc(text).replace(/\n/g, "<br>"));
}

// ---------- Text-Hilfen ----------
function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Alle Suchwörter müssen irgendwo vorkommen
function matches(query, ...fields) {
  const q = norm(query);
  if (!q) return true;
  const hay = norm(fields.flat().filter((f) => f !== null && f !== undefined).join(" "));
  return q.split(" ").every((word) => hay.includes(word));
}

function truncate(text, n) {
  const s = String(text ?? "");
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "";
}

// "Günther Freitag" → "G. Freitag" (für die Unterschrift)
function signatureName(name) {
  const parts = String(name || "").trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || "";
  return parts[0][0] + ". " + parts.slice(1).join(" ");
}

// ---------- Datum & Zeit ----------
const pad2 = (n) => String(n).padStart(2, "0");

// "2026-11-16" (Datum ohne Uhrzeit) als lokales Datum lesen
function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(value);
  return isNaN(d) ? null : d;
}

function ymd(date) {
  const d = parseDate(date);
  return d ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` : "";
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function sameDay(a, b) {
  return ymd(a) === ymd(b);
}

// Wert für <input type="datetime-local">
function toLocalInput(iso) {
  const d = parseDate(iso);
  if (!d) return "";
  return `${ymd(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function fromLocalInput(value) {
  return value ? new Date(value).toISOString() : null;
}

const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

const fmt = {
  datum(value) {
    const d = parseDate(value);
    return d ? d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "–";
  },
  datumZeit(value) {
    const d = parseDate(value);
    return d ? d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "–";
  },
  zeit(value) {
    const d = parseDate(value);
    return d ? d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "";
  },
  // "Heute", "Morgen", "Mi., 18.11."
  tag(value) {
    const d = parseDate(value);
    if (!d) return "–";
    const today = startOfDay();
    const diff = Math.round((startOfDay(d) - today) / 86400000);
    if (diff === 0) return "Heute";
    if (diff === 1) return "Morgen";
    if (diff === -1) return "Gestern";
    return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
  },
  tagLang(value) {
    const d = parseDate(value);
    if (!d) return "–";
    const label = fmt.tag(d);
    const lang = d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
    return ["Heute", "Morgen", "Gestern"].includes(label) ? `${label}, ${lang}` : lang;
  },
  relativ(value) {
    const d = parseDate(value);
    if (!d) return "–";
    const sec = Math.round((Date.now() - d) / 1000);
    if (sec < 60) return "gerade eben";
    if (sec < 3600) return `vor ${Math.floor(sec / 60)} Min.`;
    if (sec < 86400 && sameDay(d, new Date())) return `heute, ${fmt.zeit(d)}`;
    if (sameDay(d, addDays(new Date(), -1))) return `gestern, ${fmt.zeit(d)}`;
    if (sec < 7 * 86400) return `vor ${Math.max(2, Math.floor(sec / 86400))} Tagen`;
    return fmt.datum(d);
  },
  // Zeitraum bis zu einem Zeitpunkt: "noch 2 Std.", "seit 3 Tagen überfällig"
  bis(value) {
    const d = parseDate(value);
    if (!d) return "";
    const min = Math.round((d - Date.now()) / 60000);
    const abs = Math.abs(min);
    const tage = Math.round(abs / 1440);
    const text = abs < 60 ? `${abs} Min.` : abs < 1440 ? `${Math.round(abs / 60)} Std.` : tage === 1 ? "1 Tag" : `${tage} Tagen`;
    return min >= 0 ? `in ${text}` : `seit ${text}`;
  },
  zahl(n) {
    const v = Number(n);
    return isFinite(v) ? v.toLocaleString("de-DE", { maximumFractionDigits: 2 }) : "–";
  },
  geld(n) {
    const v = Number(n) || 0;
    const w = (typeof state !== "undefined" && state.settings && state.settings.waehrung) || "$";
    const s = Math.abs(v).toLocaleString("de-DE", { maximumFractionDigits: 2 });
    return (v < 0 ? "-" : "") + w + s;
  },
  haft(n) {
    const e = (typeof state !== "undefined" && state.settings && state.settings.haft_einheit) || "HE";
    return `${fmt.zahl(n || 0)} ${e}`;
  },
  // Strafrahmen: "bis 20 HE", "ab 45 HE", "15–30 HE", "10 HE"
  haftSpanne(min, max) {
    const e = (typeof state !== "undefined" && state.settings && state.settings.haft_einheit) || "HE";
    if (!min && !max) return "–";
    if (!min) return `bis ${fmt.zahl(max)} ${e}`;
    if (!max) return `ab ${fmt.zahl(min)} ${e}`;
    if (min === max) return `${fmt.zahl(min)} ${e}`;
    return `${fmt.zahl(min)}–${fmt.zahl(max)} ${e}`;
  },
  // "bis $60.000", "$10.000", "$10.000–$20.000"
  geldSpanne(min, max) {
    if (!min && !max) return "–";
    if (!min) return `bis ${fmt.geld(max)}`;
    if (!max || min === max) return fmt.geld(min);
    return `${fmt.geld(min)}–${fmt.geld(max)}`;
  },
};

// Strafrahmen aus Text lesen: "15-30", "15 – 30", "bis 20", "ab 45", "nicht unter 45", "10"
// Ergebnis [von, bis]; eine einzelne Zahl gilt als feste Strafe.
function parseSpanne(value) {
  const s = String(value ?? "").trim();
  if (!s || /^[-–]$/.test(s)) return [null, null];
  const zahl = (t) => { const n = parseNumber(t); return n && n > 0 ? n : null; };
  let m = s.match(/^(.*\d.*?)\s*(?:-|–|—|bis)\s*(.*\d.*)$/i);
  if (m && !/^(bis|max)/i.test(s)) return [zahl(m[1]), zahl(m[2])];
  if (/^(bis|max|höchstens|<=?|≤)/i.test(s)) return [null, zahl(s)];
  if (/^(ab|mind|nicht unter|>=?|≥)/i.test(s) || /\+$/.test(s)) return [zahl(s), null];
  const n = zahl(s);
  return [n, n];
}

// Zahl aus Eingaben wie "$50.000", "50,5" oder "1.250,00" lesen
function parseNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return isFinite(value) ? value : null;
  let s = String(value).replace(/[^\d,.\-]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return isFinite(n) ? n : null;
}

// ---------- Meldungen ----------
function toast(message, type = "ok") {
  const box = $("toasts");
  if (!box) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  box.append(el);
  setTimeout(() => el.classList.add("hide"), type === "error" ? 6000 : 2800);
  setTimeout(() => el.remove(), type === "error" ? 6500 : 3300);
}

// Fehler aus der Datenbank verständlich machen
function errorText(error) {
  const msg = (error && (error.message || error.error_description)) || String(error);
  if (/JWT|session|token/i.test(msg) && /expired|invalid/i.test(msg)) return "Deine Anmeldung ist abgelaufen. Bitte neu anmelden.";
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return "Keine Verbindung zur Datenbank. Bitte Internet prüfen.";
  if (/row-level security|permission denied/i.test(msg)) return "Dafür fehlt dir die Berechtigung.";
  return msg;
}

// Führt eine Datenbank-Aktion aus und zeigt Fehler als Meldung.
// Ergebnis: bei Erfolg der Rückgabewert (oder true), bei Fehler undefined.
async function attempt(fn, okMessage) {
  try {
    const result = await fn();
    if (okMessage) toast(okMessage);
    return result === undefined ? true : result;
  } catch (e) {
    console.error(e);
    toast(errorText(e), "error");
    return undefined;
  }
}

// ---------- Dateien ----------
function downloadFile(filename, content, type = "application/octet-stream") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback für ältere Browser
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

function isImageUrl(url) {
  return /^https?:\/\/\S+\.(png|jpe?g|gif|webp)(\?\S*)?$/i.test(url || "");
}

function safeUrl(url) {
  return /^https?:\/\//i.test(url || "") ? url : null;
}
