// =============================================================
//  Wiwang Law – Daten
//  Lädt alles aus Supabase, hält es per Live-Updates aktuell und
//  bietet Speichern/Löschen sowie Nachschlage-Funktionen.
// =============================================================

// ---------- Auswahllisten ----------
const OPTIONEN = {
  status: ["Offen", "In Bearbeitung", "Geschlossen"],
  prioritaet: ["Normal", "Hoch", "Dringend"],
  rechtsgebiet: ["Strafrecht", "Zivilrecht", "Verkehrsrecht", "Arbeitsrecht", "Vertragsrecht", "Verwaltungsrecht", "Sonstiges"],
  mandatsart: ["Verteidigung", "Vertretung Kläger/in", "Vertretung Beklagte/r", "Nebenklage", "Haftprüfung", "Beratung", "Vertragsprüfung", "Sonstiges"],
  ergebnis: ["Freispruch", "Einstellung", "Strafmilderung / Deal", "Verurteilung", "Vergleich", "Klage gewonnen", "Klage verloren", "Zurückgezogen", "Mandat beendet"],
  eintragArt: ["Notiz", "Telefonat", "Gespräch", "Gericht", "Polizei / StA", "Schriftverkehr", "Intern"],
  rolle: ["Zeuge", "Beamter", "Staatsanwalt", "Richter", "Gegenpartei", "Gegenanwalt", "Mitbeschuldigter", "Geschädigter", "Sachverständiger", "Sonstige"],
  beweisArt: ["Foto", "Video", "Bodycam", "Dokument", "Zeugenaussage", "Chatverlauf", "Sonstiges"],
  terminArt: ["Verhandlung", "Haftprüfung", "Mandantengespräch", "Vernehmung", "Frist", "Wiedervorlage", "Termin"],
  rechnungStatus: ["Offen", "Bezahlt", "Storniert"],
  markierung: ["Stammkunde", "VIP", "Zahlt schlecht", "Vorsicht", "Kein Mandat mehr"],
};
const ERFOLGE = ["Freispruch", "Einstellung", "Strafmilderung / Deal", "Klage gewonnen", "Vergleich"];
const GEGNER_ROLLEN = ["Gegenpartei", "Mitbeschuldigter", "Geschädigter"];

const DEFAULT_SETTINGS = {
  kanzlei: "Wiwang Law",
  ort: "Los Santos",
  adresse: "Decker Street 8083",
  telefon: "",
  waehrung: "$",
  haft_einheit: "HE",
  zahlungsziel_tage: 7,
  rechnung_einleitung: "für die von uns geleisteten Dienste stellen wir Ihnen, wie in §2 Ihres Mandatsvertrags festgelegt, folgende Kostenpunkte in Rechnung:",
  rechnung_hinweis: "Bitte begleichen Sie den Betrag innerhalb von 7 Tagen.",
  liegezeit_tage: 7,
};

// ---------- Zustand ----------
const TABLES = ["profiles", "mandanten", "akten", "eintraege", "beteiligte", "beweise", "termine",
                "aufgaben", "rechnungen", "gebuehren", "gesetze", "einstellungen", "konten", "buchungen",
                "raenge", "personalakte", "personal_vermerke",
                "benachrichtigungen", "pinnwand", "pinnwand_gelesen", "ablaeufe",
                "gesetzbuecher", "paragraphen", "akten_mandanten", "portal_anliegen", "portal_bewertungen"];
const PK = { profiles: "user_id", personalakte: "user_id" };
const AKTE_KINDER = ["eintraege", "beteiligte", "beweise", "termine", "aufgaben"];
const PROTOKOLL_LIMIT = 500;
const BENACHRICHTIGUNG_LIMIT = 200;

// Tabellen, die nicht komplett geladen werden (nur die neuesten Zeilen)
const LADER = {
  // Mandantenportal (Update 12): fehlt die Tabelle noch, läuft der Rest trotzdem
  akten_mandanten: async () => {
    const { data, error } = await db.from("akten_mandanten").select("*");
    if (error) { if (isMissingSchema(error)) return []; throw error; }
    return data;
  },
  // Mandantenportal 2.0 (Update 20): Anliegen und Bewertungen aus dem Portal
  portal_anliegen: async () => {
    const { data, error } = await db.from("portal_anliegen").select("*")
      .order("created_at", { ascending: false }).limit(300);
    if (error) { if (isMissingSchema(error)) return []; throw error; }
    return data;
  },
  portal_bewertungen: async () => {
    const { data, error } = await db.from("portal_bewertungen").select("*").order("updated_at", { ascending: false });
    if (error) { if (isMissingSchema(error)) return []; throw error; }
    return data;
  },
  benachrichtigungen: async () => {
    const { data, error } = await db.from("benachrichtigungen").select("*")
      .order("zeit", { ascending: false }).limit(BENACHRICHTIGUNG_LIMIT);
    if (error) throw error;
    return data;
  },
};

// Zusätzliche Reaktionen auf Live-Änderungen je Tabelle (von den Seiten befüllt)
const LIVE_HOOKS = {};

const state = {
  session: null,
  me: null,          // { id, email }
  isAdmin: false,
  loaded: false,
  settings: { ...DEFAULT_SETTINGS },
  protokoll: [],
};
for (const t of TABLES) state[t] = [];

let db = null;
let liveChannel = null;

// ---------- Laden ----------
async function fetchAll(table) {
  const key = PK[table] || "id";
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select("*").order(key, { ascending: true }).range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

async function loadAll() {
  // Alle Tabellen und das Protokoll gleichzeitig laden (nicht nacheinander)
  const protokoll = db.from("protokoll").select("*")
    .order("id", { ascending: false }).limit(PROTOKOLL_LIMIT);
  const [results, { data, error }] = await Promise.all([
    Promise.all(TABLES.map((t) => (LADER[t] || fetchAll)(t))),
    protokoll,
  ]);
  if (error) throw error;
  TABLES.forEach((t, i) => (state[t] = results[i]));
  aktivCache = null;
  state.protokoll = data;
  applySettings();
  state.loaded = true;
  state.rechteSig = RECHTE.map((r) => (darf(r.key) ? 1 : 0)).join("");
}

// Einzelne Tabellen frisch laden (z. B. nach einer Übergabe, die viele Zeilen ändert)
async function neuLaden(tables) {
  const results = await Promise.all(tables.map((t) => (LADER[t] || fetchAll)(t)));
  tables.forEach((t, i) => (state[t] = results[i]));
  aktivCache = null;
  scheduleRender();
}

// Fehlt eine Tabelle/Spalte, wurde ein supabase-update-*.sql noch nicht ausgeführt
function isMissingSchema(error) {
  const text = `${error && error.code} ${error && error.message}`;
  return /PGRST20[0-9]|42P01|42703|schema cache|does not exist/i.test(text);
}

function applySettings() {
  const row = state.einstellungen[0];
  state.settings = { ...DEFAULT_SETTINGS, ...((row && row.daten) || {}) };
}

// ---------- Live-Updates ----------
function startLive() {
  stopLive();
  liveChannel = db.channel("wiwang-live");
  for (const table of [...TABLES, "protokoll"]) {
    liveChannel.on("postgres_changes", { event: "*", schema: "public", table }, (p) => applyChange(table, p));
  }
  liveChannel.subscribe();
  if (typeof startZusammenarbeit === "function") startZusammenarbeit();
}

function stopLive() {
  if (liveChannel && db) db.removeChannel(liveChannel);
  liveChannel = null;
  if (typeof stopZusammenarbeit === "function") stopZusammenarbeit();
}

function applyChange(table, payload) {
  const key = PK[table] || "id";
  if (table === "protokoll") {
    if (payload.eventType === "INSERT" && !state.protokoll.some((p) => p.id === payload.new.id)) {
      state.protokoll.unshift(payload.new);
      if (state.protokoll.length > PROTOKOLL_LIMIT) state.protokoll.length = PROTOKOLL_LIMIT;
      if (payload.new.akte_id && ui.historie[payload.new.akte_id]) ui.historie[payload.new.akte_id].unshift(payload.new);
    }
  } else if (payload.eventType === "DELETE") {
    removeLocal(table, payload.old && payload.old[key]);
  } else if (payload.new) {
    upsertLocal(table, payload.new);
  }
  if (table === "einstellungen") applySettings();
  // Haben sich meine Rechte geändert (Rang, Status, Rang-Rechte)? Dann alles neu laden,
  // damit z. B. die Buchhaltung sofort sichtbar wird.
  if (table === "raenge" || (table === "profiles" && payload.new && state.me && payload.new.user_id === state.me.id)) {
    const sig = RECHTE.map((r) => (darf(r.key) ? 1 : 0)).join("");
    if (state.rechteSig !== undefined && sig !== state.rechteSig) {
      clearTimeout(state.reloadTimer);
      state.reloadTimer = setTimeout(async () => {
        try { await loadAll(); toast("Deine Berechtigungen wurden geändert."); } catch (e) { console.warn(e); }
        scheduleRender();
      }, 300);
    }
    state.rechteSig = sig;
  }
  if (LIVE_HOOKS[table]) LIVE_HOOKS[table](payload);
  if (payload.eventType !== "DELETE" && payload.new && payload.new[key] != null) liveMarkieren(table, payload.new[key]);
  scheduleRender();
}

// ---------- Live-Sync sichtbar machen ----------
// Frisch eingetroffene oder geänderte Zeilen leuchten nach dem Neuzeichnen kurz golden auf
// (Klasse .is-live-updated an Elementen mit data-live="tabelle:id").
const LIVE_DAUER = 1400;
const liveFrisch = new Map(); // "tabelle:id" → Zeitpunkt
function liveMarkieren(table, id) {
  liveFrisch.set(`${table}:${id}`, Date.now());
}
function liveHervorheben() {
  if (!liveFrisch.size) return;
  const jetzt = Date.now();
  for (const [k, t] of liveFrisch) {
    const alter = jetzt - t;
    if (alter >= LIVE_DAUER) { liveFrisch.delete(k); continue; }
    document.querySelectorAll(`[data-live="${CSS.escape(k)}"]`).forEach((el) => {
      if (el.classList.contains("is-live-updated")) return;
      // Beim Neuzeichnen läuft die Animation dort weiter, wo sie war
      el.style.animationDelay = `-${alter}ms`;
      el.classList.add("is-live-updated");
      el.addEventListener("animationend", () => { el.classList.remove("is-live-updated"); el.style.animationDelay = ""; }, { once: true });
    });
  }
}

function upsertLocal(table, row) {
  aktivCache = null;
  indexVergessen(table);
  const key = PK[table] || "id";
  const list = state[table];
  const i = list.findIndex((r) => r[key] === row[key]);
  if (i >= 0) list[i] = row;
  else list.push(row);
}

function removeLocal(table, id) {
  if (!id) return;
  aktivCache = null;
  const key = PK[table] || "id";
  state[table] = state[table].filter((r) => r[key] !== id);
  if (table === "akten") {
    for (const t of AKTE_KINDER) state[t] = state[t].filter((r) => r.akte_id !== id);
  }
}

// Nach längerer Abwesenheit (z. B. Handy gesperrt) alles frisch laden,
// falls Live-Updates verpasst wurden
let hiddenSince = null;
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "hidden") { hiddenSince = Date.now(); return; }
  if (state.loaded && hiddenSince && Date.now() - hiddenSince > 120000) {
    try { await loadAll(); scheduleRender(); } catch (e) { console.warn(e); }
  }
  hiddenSince = null;
});

// ---------- Speichern & Löschen ----------
async function insertRow(table, values) {
  const { data, error } = await db.from(table).insert(values).select().single();
  if (error) throw error;
  upsertLocal(table, data);
  scheduleRender();
  return data;
}

async function insertRows(table, rows) {
  if (!rows.length) return [];
  const { data, error } = await db.from(table).insert(rows).select();
  if (error) throw error;
  data.forEach((r) => upsertLocal(table, r));
  scheduleRender();
  return data;
}

async function updateRow(table, id, values) {
  const key = PK[table] || "id";
  const { data, error } = await db.from(table).update(values).eq(key, id).select().single();
  if (error) throw error;
  upsertLocal(table, data);
  if (table === "einstellungen") applySettings();
  scheduleRender();
  return data;
}

async function deleteRow(table, id) {
  const key = PK[table] || "id";
  const { error } = await db.from(table).delete().eq(key, id);
  if (error) throw error;
  removeLocal(table, id);
  scheduleRender();
}

// ---------- Nachschlagen ----------
// Nachschlage-Verzeichnisse (Map) je Tabelle und Spalte – statt bei jedem Aufruf die ganze
// Liste zu durchsuchen. Sie werden beim ersten Bedarf gebaut und verfallen automatisch,
// sobald die Tabelle ersetzt (state[t] = …) oder per upsertLocal geändert wird.
const INDEX = {};
function indexVergessen(table) {
  for (const k of Object.keys(INDEX)) if (k.startsWith(table + ".")) delete INDEX[k];
}
// Eindeutige Spalte → Zeile (bei Doppelten gewinnt die erste, wie bei Array.find)
function index(table, feld, wert = (r) => r[feld]) {
  const k = `${table}.${feld}`;
  const list = state[table];
  let c = INDEX[k];
  if (!c || c.list !== list || c.len !== list.length) {
    const map = new Map();
    for (const r of list) { const v = wert(r); if (v != null && !map.has(v)) map.set(v, r); }
    c = INDEX[k] = { list, len: list.length, map };
  }
  return c.map;
}
// Spalte → alle passenden Zeilen
function gruppen(table, feld) {
  const k = `${table}.${feld}[]`;
  const list = state[table];
  let c = INDEX[k];
  if (!c || c.list !== list || c.len !== list.length) {
    const map = new Map();
    for (const r of list) {
      const v = r[feld];
      if (v == null) continue;
      const g = map.get(v);
      if (g) g.push(r); else map.set(v, [r]);
    }
    c = INDEX[k] = { list, len: list.length, map };
  }
  return c.map;
}

const byId = (table, id) => (id ? index(table, "id").get(id) : undefined);

function profileOf(idOrEmail) {
  if (!idOrEmail) return undefined;
  if (String(idOrEmail).includes("@")) {
    return index("profiles", "email~", (p) => (p.email || "").toLowerCase()).get(String(idOrEmail).toLowerCase());
  }
  return index("profiles", "user_id").get(idOrEmail);
}

// Anzeigename einer Person (über User-ID oder E-Mail)
function personName(idOrEmail, fallback = "–") {
  if (!idOrEmail) return fallback;
  const p = profileOf(idOrEmail);
  if (p && p.anzeigename) return p.anzeigename;
  const email = p ? p.email : String(idOrEmail).includes("@") ? idOrEmail : null;
  return email ? email.split("@")[0] : fallback;
}

function myName() {
  return personName(state.me && state.me.id, state.me ? state.me.email.split("@")[0] : "");
}

function myProfile() {
  return state.me ? profileOf(state.me.id) : undefined;
}

function team() {
  return [...state.profiles].sort((a, b) => personName(a.user_id).localeCompare(personName(b.user_id), "de"));
}

function teamOptions() {
  return team().filter((p) => p.status !== "Ausgeschieden")
    .map((p) => ({ value: p.user_id, label: personName(p.user_id) + (rangName(p) ? ` (${rangName(p)})` : "") }));
}

// ---------- Ränge & Berechtigungen ----------
// Bereiche mit gestuften Rechten: Lesen → Bearbeiten (→ Löschen). Jede Stufe schließt die vorherigen ein.
// Die Gruppen ordnen die Rechte-Tabelle (Personal → Ränge & Berechtigungen).
const BEREICHE = [
  { key: "akten", gruppe: "Fallarbeit", label: "Akten",
    extra: [{ key: "akten_loeschen", label: "Löschen", lang: "Akten löschen" }],
    text: "Lesen = Akten mit Verlauf, Beteiligten, Beweisen und Tatvorwürfen ansehen. Bearbeiten = anlegen, ändern, Einträge für den Mandanten freigeben. Löschen = Akten endgültig entfernen (nicht rückgängig zu machen)" },
  { key: "mandanten", gruppe: "Fallarbeit", label: "Mandanten",
    text: "Lesen = Mandantenkartei ansehen. Bearbeiten = Mandanten pflegen und Zugänge zum Mandantenportal freigeben" },
  { key: "termine", gruppe: "Fallarbeit", label: "Termine & Aufgaben",
    text: "Lesen = Kalender und Aufgaben ansehen. Bearbeiten = anlegen, verschieben, erledigen, Abläufe in Akten starten" },
  { key: "rechnungen", gruppe: "Finanzen", label: "Rechnungen",
    text: "Lesen = Rechnungen und Gebührenkatalog ansehen. Bearbeiten = Rechnungen erstellen, ändern, als bezahlt markieren" },
  { key: "buchhaltung", gruppe: "Finanzen", label: "Buchhaltung",
    text: "Lesen = Bilanz, GuV, Grundbuch und Hauptbuch ansehen. Bearbeiten = buchen, stornieren, Konten anlegen" },
  { key: "gesetzbuch", gruppe: "Recht & KI", label: "Gesetze & Strafkatalog",
    text: "Lesen = Gesetzestexte und Strafkatalog ansehen. Bearbeiten = Gesetzbücher, Paragraphen und Delikte pflegen" },
  // Nigel hat eigene Namen: "ki_assistent" (= Verwenden) gab es schon vor "ki_sehen" und wird in der Datenbank geprüft
  { key: "ki", gruppe: "Recht & KI", label: "Nigel (KI-Butler)", lesen: "ki_sehen", schreiben: "ki_assistent", lesenLabel: "Sehen", schreibenLabel: "Verwenden",
    text: "Sehen = das iFruit-Handy herausholen (nur Sperrbildschirm) und den Arbeitsbereich ansehen – Inhalte bleiben zensiert. Verwenden = Nigel Aufträge geben" },
  { key: "personal", gruppe: "Verwaltung", label: "Personalakten",
    text: "Lesen = Personalakten aller ansehen (Gehalt, Vermerke). Bearbeiten = Personal verwalten: Mitglieder einstellen, Rang und Status ändern, Zugang sperren" },
  { key: "einstellungen", gruppe: "Verwaltung", label: "Kanzlei-Einstellungen", nurSchreiben: true,
    text: "Lesen dürfen immer alle. Bearbeiten = Kanzleidaten, Gebührenkatalog, Abläufe (Checklisten), Nigels Kanzlei-Vorgaben und -Vorlagen ändern und die Pinnwand moderieren" },
];
// Schlüssel und Bezeichnung der Stufen eines Bereichs
const rechtLesen = (b) => b.lesen || `${b.key}_lesen`;
const rechtSchreiben = (b) => b.schreiben || `${b.key}_schreiben`;
const stufeLesen = (b) => b.lesenLabel || "Lesen";
const stufeSchreiben = (b) => b.schreibenLabel || "Bearbeiten";
// Alle Stufen eines Bereichs in Reihenfolge – jede schließt die vorherigen ein
const rechtStufen = (b) => [
  ...(b.nurSchreiben ? [] : [{ key: rechtLesen(b), label: stufeLesen(b) }]),
  { key: rechtSchreiben(b), label: stufeSchreiben(b) },
  ...(b.extra || []),
];
// Alle einzelnen Rechte (für Vergleiche)
const RECHTE = BEREICHE.flatMap((b) => rechtStufen(b).map((x) => ({ key: x.key, label: x.lang || `${b.label} ${x.label.toLowerCase()}` })));
// Lese-Recht → Schreib-Recht, das es einschließt (z. B. ki_sehen → ki_assistent)
const SCHLIESST_EIN = Object.fromEntries(BEREICHE.filter((b) => !b.nurSchreiben).map((b) => [rechtLesen(b), rechtSchreiben(b)]));
// Alte Rechtenamen (vor Update 5)
const ALTE_RECHTE = {
  personal_verwalten: "personal_schreiben", personal_sehen: "personal_lesen", rechnungen: "rechnungen_schreiben",
  buchhaltung_sehen: "buchhaltung_lesen", buchhaltung_buchen: "buchhaltung_schreiben",
  gesetzbuch: "gesetzbuch_schreiben", einstellungen: "einstellungen_schreiben",
};
const PERSONAL_STATUS = ["Aktiv", "Urlaub", "Krank", "Beurlaubt", "Ausgeschieden"];

function rangVon(p) {
  return p ? byId("raenge", p.rang_id) : undefined;
}

// Angezeigter Rang; bei "Sonstiges" der selbst gewählte Name
function rangName(p) {
  const r = rangVon(p);
  if (!r) return p && p.titel ? p.titel : "";
  return r.ist_sonstiges ? (p.rang_eigen || r.name) : r.name;
}

// Darf ich das? (Die Datenbank prüft es zusätzlich selbst.)
function darf(recht) {
  if (state.isAdmin) return true;
  const p = myProfile();
  const r = rangVon(p);
  if (!r || p.status === "Ausgeschieden") return false;
  const k = ALTE_RECHTE[recht] || recht;
  const hat = (x) => (r.berechtigungen || []).some((b) => b === x || ALTE_RECHTE[b] === x);
  return hat(k) || (!!SCHLIESST_EIN[k] && hat(SCHLIESST_EIN[k])) || (k.endsWith("_lesen") && hat(k.replace(/_lesen$/, "_schreiben")));
}

// Anrede des aktiven Charakters (Mein Profil) – so spricht Nigel ihn an
// Im Profil wählt man Herr / Frau / Keine Anrede – Nigel sagt dann „Sir“ / „Madam“ / nichts (Werte: sir, madam, neutral)
const ANREDEN = [{ value: "sir", label: "Herr" }, { value: "madam", label: "Frau" }, { value: "neutral", label: "Keine Anrede" }];
function meineAnrede() {
  const a = (myProfile() || {}).anrede;
  return a === "madam" ? "Madam" : a === "neutral" ? "" : "Sir";
}
// „, Sir“ / „, Madam“ / „“ – zum Anhängen: `Guten Tag${anredeKomma()}.`
const anredeKomma = () => (meineAnrede() ? `, ${meineAnrede()}` : "");

// Nigel nur ansehen (Sehen ohne Verwenden): Sperrbildschirm am Handy, zensierter Arbeitsbereich
const nigelNurAnsehen = () => darf("ki_sehen") && !darf("ki_assistent");

function isMe(idOrEmail) {
  if (!state.me || !idOrEmail) return false;
  return idOrEmail === state.me.id || String(idOrEmail).toLowerCase() === state.me.email.toLowerCase();
}

function mandantName(akte) {
  const m = byId("mandanten", akte.mandant_id);
  return m ? m.name : akte.client || "–";
}

function findMandantByName(name) {
  const n = norm(name);
  return n ? state.mandanten.find((m) => norm(m.name) === n) : undefined;
}

function akteLabel(a) {
  return a ? `${a.number || "—"} · ${a.title}` : "–";
}

function akteOptions() {
  return [...state.akten]
    .sort((a, b) => (b.number || "").localeCompare(a.number || ""))
    .map((a) => ({ value: a.id, label: `${a.number} · ${truncate(a.title, 40)} (${truncate(mandantName(a), 24)})` }));
}

function kinder(table, akteId) {
  // Kopie zurückgeben – Aufrufer sortieren das Ergebnis teils direkt
  return (gruppen(table, "akte_id").get(akteId) || []).slice();
}

// Letzte Aktivität je Akte (neuester Eintrag, Termin, Aufgabe … ) – einmal für alle
// berechnet und bis zur nächsten Datenänderung gemerkt
let aktivCache = null;
function zuletztAktiv(akte) {
  if (!aktivCache) {
    aktivCache = new Map();
    for (const table of AKTE_KINDER) {
      for (const r of state[table]) {
        const t = new Date(r.created_at).getTime();
        if (r.akte_id && !(aktivCache.get(r.akte_id) >= t)) aktivCache.set(r.akte_id, t);
      }
    }
  }
  const eigen = Math.max(new Date(akte.updated_at || akte.created_at).getTime(), new Date(akte.created_at).getTime());
  return new Date(Math.max(eigen, aktivCache.get(akte.id) || 0));
}

// Aufgaben-Fortschritt einer Akte
function aufgabenStand(akteId) {
  const list = kinder("aufgaben", akteId);
  return { erledigt: list.filter((t) => t.erledigt).length, gesamt: list.length };
}

// Seit wie vielen Tagen ist in der Akte nichts passiert?
function liegtSeitTagen(akte) {
  return Math.floor((Date.now() - zuletztAktiv(akte)) / 86400000);
}

// Offene Akte ohne Bewegung seit X Tagen (Einstellung) und ohne anstehenden Termin
function liegenGeblieben(akte) {
  if (akte.status === "Geschlossen") return false;
  const tage = Number(state.settings.liegezeit_tage) || 7;
  return liegtSeitTagen(akte) >= tage && !naechsterTermin(akte.id);
}

function naechsterTermin(akteId) {
  const now = startOfDay();
  return kinder("termine", akteId)
    .filter((t) => !t.erledigt && new Date(t.beginn) >= now)
    .sort((a, b) => new Date(a.beginn) - new Date(b.beginn))[0];
}

// ---------- Strafrahmen ----------
// Ein Delikt kennt je Strafart (Haft / Geldstrafe) ein Mindest- und ein Höchstmaß:
//   haft_min + haft   → Spanne („15 bis 30 HE“); gleiche Werte → feste Strafe
//   nur haft          → „bis zu“: Mindestmaß ist 1 Hafteinheit (bei Geldstrafe: 1 $)
//   nur haft_min      → „nicht unter“: nach oben OFFEN, es gibt kein Höchstmaß
//   Haft und Geldstrafe zusammen → wahlweise („Freiheitsstrafe … oder Geldstrafe“)
// Gesamtstrafe (§ 3 StGB): Bei mehreren Straftaten darf die Haft 120 HE nicht übersteigen,
// bei besonders schweren Fällen (Delikt mit gesamt_erhoeht) 180 HE. Geldstrafen werden addiert.
const GESAMTSTRAFE_MAX = 120;
const GESAMTSTRAFE_MAX_SCHWER = 180;
const MIN_HAFT_IMPLIZIT = 1;   // wo nur ein Höchstmaß genannt ist: eine Hafteinheit
const MIN_GELD_IMPLIZIT = 1;   // … bzw. der kleinstmögliche Geldbetrag

const zahlOderNull = (x) => (x === null || x === undefined || x === "" || !isFinite(Number(x)) ? null : Number(x));

// Strafrahmen EINES Delikts (Katalogzeile oder Vorwurf aus einer Akte)
function deliktRahmen(d) {
  const hMax = zahlOderNull(d.haft), hMin = zahlOderNull(d.haft_min);
  const gMax = zahlOderNull(d.geldstrafe), gMin = zahlOderNull(d.geldstrafe_min);
  const haft = hMax || hMin ? {
    min: hMin ?? Math.min(MIN_HAFT_IMPLIZIT, hMax),
    max: hMax ?? Infinity,
    offen: hMax === null, fest: hMax !== null && hMin === hMax,
  } : null;
  const geld = gMax || gMin ? {
    min: gMin ?? Math.min(MIN_GELD_IMPLIZIT, gMax),
    max: gMax ?? Infinity,
    offen: gMax === null, fest: gMax !== null && gMin === gMax,
  } : null;
  const art = d.deliktsart || "";
  return {
    haft, geld, art,
    wahlweise: !!(haft && geld),
    ordnungswidrigkeit: art === "Ordnungswidrigkeit",
    schwer: !!d.gesamt_erhoeht,
  };
}

// Katalogzeile → Momentaufnahme für den Tatvorwurf einer Akte
function vorwurfAusKatalog(g) {
  return {
    gesetz_id: g.id, paragraph: g.paragraph, titel: g.titel,
    geldstrafe: g.geldstrafe, haft: g.haft,
    geldstrafe_min: g.geldstrafe_min ?? null, haft_min: g.haft_min ?? null,
    deliktsart: g.deliktsart ?? null, gesamt_erhoeht: !!g.gesamt_erhoeht,
  };
}

// Vorwürfe, die vor der Spannen-Rechnung angelegt wurden, kennen nur das Höchstmaß –
// Mindestmaß und Art werden dann (soweit möglich) aus dem Katalog nachgeschlagen
function vorwurfRahmen(v) {
  let d = v;
  if (!("deliktsart" in v) && v.gesetz_id && state.gesetze && state.gesetze.length) {
    const k = byId("gesetze", v.gesetz_id);
    if (k) d = { ...v, ...vorwurfAusKatalog(k) };
  }
  return deliktRahmen(d);
}

// Strafrahmen mehrerer Delikte zusammen. posten: [{ rahmen, anzahl }]
function strafrahmen(posten, opt = {}) {
  let hMin = 0, hMax = 0, gMin = 0, gMax = 0, hOffen = false, gOffen = false;
  let straftaten = 0, wahlweise = 0, schwer = false, mitHaft = 0, mitGeld = 0, ows = 0;
  for (const { rahmen: r, anzahl } of posten) {
    const n = Number(anzahl) || 1;
    if (r.ordnungswidrigkeit) ows += n; else straftaten += n;
    if (r.schwer) schwer = true;
    if (r.haft) {
      mitHaft += n;
      hMin += r.haft.min * n;
      if (r.haft.offen) hOffen = true; else hMax += r.haft.max * n;
    }
    if (r.geld) {
      mitGeld += n;
      // Bei „Haft oder Geldstrafe“ ist die Geldstrafe nur Alternative: Mindestmaß zählt bei der Haft
      if (!r.haft) gMin += r.geld.min * n;
      if (r.geld.offen) gOffen = true; else gMax += r.geld.max * n;
    }
    if (r.wahlweise) wahlweise += n;
  }
  // Gesamtstrafe nach § 3 StGB: ab zwei Straftaten, Ordnungswidrigkeiten zählen nicht mit
  const gesamtstrafe = straftaten >= 2 && mitHaft > 0;
  const schwerFall = schwer || !!opt.schwer;
  const deckel = gesamtstrafe ? (schwerFall ? GESAMTSTRAFE_MAX_SCHWER : GESAMTSTRAFE_MAX) : null;
  const ohneDeckel = hOffen ? Infinity : hMax;
  const haftMax = deckel === null ? ohneDeckel : Math.min(ohneDeckel, deckel);
  const haft = mitHaft ? {
    min: deckel === null ? hMin : Math.min(hMin, deckel),
    max: haftMax,
    ohneDeckel,
    deckelGreift: deckel !== null && ohneDeckel > deckel,
  } : null;
  const geld = mitGeld ? { min: gMin, max: gOffen ? Infinity : gMax, offen: gOffen } : null;
  return {
    haft, geld, deckel, gesamtstrafe, schwerFall, wahlweise,
    straftaten, ows, anzahl: straftaten + ows,
    haftOffen: hOffen,
  };
}

// Strafrahmen einer Liste von Tatvorwürfen (Akte)
function vorwurfStrafrahmen(vorwuerfe) {
  return strafrahmen((vorwuerfe || []).map((v) => ({ rahmen: vorwurfRahmen(v), anzahl: v.anzahl })));
}

// --- Darstellung ---
// „15 – 30 HE“ bzw. „$5.000 – $20.000“ (die Einheit steht nur einmal hinten)
function minMaxText(min, max, einheit) {
  return einheit === "geld" ? `${fmt.geld(min)} – ${fmt.geld(max)}` : `${fmt.zahl(min)} – ${fmt.haft(max)}`;
}

function strafeText(w, einheit) {
  // w = { min, max }  →  „15 – 30 HE“ · „ab 45 HE (nach oben offen)“ · „10 HE (fest)“
  if (!w) return "–";
  const f = einheit === "geld" ? fmt.geld : fmt.haft;
  if (w.max === Infinity) return `ab ${f(w.min)} (nach oben offen)`;
  if (w.min === w.max) return `${f(w.max)} (fest)`;
  return minMaxText(w.min, w.max, einheit);
}

// Delikt im Strafkatalog: so steht es im Gesetz („bis zu 20 HE“, „von 15 bis 30 HE“, „nicht unter 45 HE“)
function deliktStrafeText(r, einheit) {
  const w = einheit === "geld" ? r.geld : r.haft;
  if (!w) return "–";
  const f = einheit === "geld" ? fmt.geld : fmt.haft;
  const implizit = einheit === "geld" ? MIN_GELD_IMPLIZIT : MIN_HAFT_IMPLIZIT;
  if (w.max === Infinity) return `nicht unter ${f(w.min)}`;
  if (w.min === w.max) return `${f(w.max)} (fest)`;
  if (w.min <= implizit) return `bis ${f(w.max)}`;
  return minMaxText(w.min, w.max, einheit);
}

// Ein Vorwurf mit Anzahl (Zeile in der Akte): „bis 20 HE“, bei mehrfacher Tat die vervielfachte Spanne
function vorwurfZeileText(r, anzahl, einheit) {
  const w = einheit === "geld" ? r.geld : r.haft;
  const n = Number(anzahl) || 1;
  if (!w) return "–";
  if (n === 1) return deliktStrafeText(r, einheit);
  const f = einheit === "geld" ? fmt.geld : fmt.haft;
  const implizit = einheit === "geld" ? MIN_GELD_IMPLIZIT : MIN_HAFT_IMPLIZIT;
  if (w.max === Infinity) return `nicht unter ${f(w.min * n)}`;
  if (w.min === w.max) return `${f(w.max * n)} (fest)`;
  if (w.min <= implizit) return `bis ${f(w.max * n)}`;
  return minMaxText(w.min * n, w.max * n, einheit);
}

// Gesamt-Spanne mehrerer Delikte (nur das Ergebnis, ohne Gesetzes-Wortlaut)
function spanneText(w, einheit) {
  if (!w) return "–";
  const f = einheit === "geld" ? fmt.geld : fmt.haft;
  if (w.max === Infinity) return `ab ${f(w.min)} · unbegrenzt`;
  if (w.min === w.max) return f(w.max);
  if (w.min === 0) return `bis ${f(w.max)}`;
  return minMaxText(w.min, w.max, einheit);
}

// Hinweise, die zur Spanne gehören (Deckel, offene Strafen, Wahlstrafen)
function strafrahmenHinweise(r) {
  const out = [];
  const he = (n) => fmt.haft(n);
  if (r.haft && r.haft.deckelGreift) {
    out.push(`Gesamtstrafe nach § 3 StGB: Die Haft ist auf höchstens ${he(r.deckel)} begrenzt`
      + `${r.schwerFall ? " (besonders schwerer Fall)" : ` (bei besonders schweren Fällen ${he(GESAMTSTRAFE_MAX_SCHWER)})`}.`
      + ` Ohne diese Begrenzung wäre die Haft ${r.haft.ohneDeckel === Infinity ? "nach oben unbegrenzt" : `bis ${he(r.haft.ohneDeckel)} möglich`}.`);
  } else if (r.haft && r.haft.max === Infinity) {
    out.push("Mindestens ein Vorwurf kennt nur ein Mindestmaß („nicht unter …“): Die Haft ist nach oben unbegrenzt, solange keine Gesamtstrafe (ab zwei Straftaten) gebildet wird.");
  }
  if (r.geld && r.geld.max === Infinity) out.push("Mindestens ein Vorwurf kennt nur ein Mindestmaß bei der Geldstrafe: Die Geldstrafe ist nach oben unbegrenzt.");
  if (r.wahlweise) {
    out.push(`${r.wahlweise === 1 ? "Ein Vorwurf" : `${r.wahlweise} Vorwürfe`} mit „Haft oder Geldstrafe“: Das Gericht kann statt der Haft eine Geldstrafe verhängen – Haft und Geldstrafe sind dort Alternativen, keine Summe.`);
  }
  if (r.gesamtstrafe && r.haft && !r.haft.deckelGreift) out.push(`Gesamtstrafe nach § 3 StGB: Haft höchstens ${he(r.deckel)}.`);
  out.push("Wo das Gesetz nur ein Höchstmaß nennt („bis zu“), gilt als Mindestmaß 1 Hafteinheit bzw. die kleinste Geldstrafe.");
  return out;
}

// Eine Strafart der Spanne als Block („Haft · 3 – 120 HE“)
function spanneBlock(label, w, einheit) {
  return html`<span class="sum-wert"><small>${label}</small><strong>${spanneText(w, einheit)}</strong></span>`;
}

function gegnerNamen(akte) {
  return [akte.opponent, ...kinder("beteiligte", akte.id).filter((b) => GEGNER_ROLLEN.includes(b.rolle)).map((b) => b.name)]
    .map(norm).filter(Boolean);
}

// Interessenkonflikte: Gegner hier ist anderswo unser Mandant – oder umgekehrt
function konflikte(akte) {
  const result = [];
  const mandant = akte.mandant_id || akte.client ? norm(mandantName(akte)) : "";
  const gegner = new Set(gegnerNamen(akte));
  for (const other of state.akten) {
    if (other.id === akte.id) continue;
    const otherMandant = other.mandant_id || other.client ? norm(mandantName(other)) : "";
    if (otherMandant && gegner.has(otherMandant)) {
      result.push({ akte: other, grund: `${mandantName(other)} ist dort unser Mandant` });
    } else if (mandant && gegnerNamen(other).includes(mandant)) {
      result.push({ akte: other, grund: `${mandantName(akte)} ist dort Gegenseite` });
    }
  }
  return result;
}

function offeneRechnungSumme(list) {
  return list.filter((r) => r.status === "Offen").reduce((s, r) => s + (Number(r.summe) || 0), 0);
}

function rechnungUeberfaellig(r) {
  if (r.status !== "Offen") return false;
  const tage = Number(state.settings.zahlungsziel_tage) || 7;
  return addDays(parseDate(r.datum), tage) < startOfDay();
}

function terminUeberfaellig(t) {
  return !t.erledigt && ["Frist", "Wiedervorlage"].includes(t.art) && new Date(t.beginn) < new Date();
}

function aufgabeUeberfaellig(a) {
  return !a.erledigt && a.faellig && parseDate(a.faellig) < startOfDay();
}
