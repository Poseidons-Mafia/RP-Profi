// =============================================================
//  Wiwang Law – Nigels Arbeitsbereich (#/nigel, #/nigel/<chat>)
//
//  Für komplexe juristische Arbeit mit Nigel. Das iFruit-Handy bleibt
//  das schnelle Nachschlage-Werkzeug; hier ist Platz für alles andere:
//    links   – gespeicherte Chats (Suche, angeheftet, nach Datum)
//    Mitte   – Chat mit Arbeitsmodus (Rechtsfrage, Gutachten, Schriftsatz,
//              Fallanalyse), Live-Arbeitsschritten und Aktionen je Antwort
//    rechts  – Arbeitsfläche: Kontext (mehrere Akten, angeheftete
//              Paragraphen, Notizen), Entwurf (bearbeiten, von Nigel
//              überarbeiten lassen, drucken), Quellen, Vorlagen, Einstellungen
//  Die Seite ist "dauerhaft" (siehe render() in app.js): Sie wird beim
//  Betreten einmal aufgebaut und danach nur in Teilen erneuert, damit
//  Eingaben, Entwurf und Scrollpositionen erhalten bleiben.
//  Daten: ki_chats, ki_nachrichten, ki_profil, ki_vorlagen (Update 9).
// =============================================================

const NW_MODI = [
  { key: "frage", label: "Rechtsfrage", text: "Schnelle, präzise Antwort mit Paragraphen – wie auf dem Handy." },
  { key: "gutachten", label: "Gutachten", text: "Tatbestände im Gutachtenstil prüfen, mit Strafrahmen und Ergebnis." },
  { key: "schriftsatz", label: "Schriftsatz", text: "Anträge, Stellungnahmen, Schreiben – landen direkt im Entwurf." },
  { key: "strategie", label: "Fallanalyse", text: "Stärken, Risiken, Beweislage, Strategie und nächste Schritte." },
];
const NW_MODUS_NAME = { frage: "Rechtsfrage", gutachten: "Gutachten", schriftsatz: "Schriftsatz", strategie: "Fallanalyse", ueberarbeiten: "Überarbeitung" };
const NW_MAX = { frage: 4000, gutachten: 14000, schriftsatz: 14000, strategie: 10000, ueberarbeiten: 16000 };

const NW_STANDARD = { anrede: "sir", ton: "butler", laenge: "normal", gruendlichkeit: "", wortlaut: true, modus: "frage", senden: "enter" };

const NW_VORLAGEN_STANDARD = [
  { titel: "Rechtslage der Akte", modus: "frage", akte: true, text: "Wie ist die Rechtslage in dieser Akte? Welche Paragraphen sind einschlägig, und welche rechtlichen Einwände gibt es?" },
  { titel: "Alle Vorwürfe prüfen", modus: "gutachten", akte: true, text: "Prüfe alle Tatvorwürfe dieser Akte im Gutachtenstil am Wortlaut der Paragraphen und berechne den drohenden Strafrahmen." },
  { titel: "Verteidigungsstrategie", modus: "strategie", akte: true, text: "Entwickle eine Verteidigungsstrategie für diese Akte." },
  { titel: "Antrag auf Haftprüfung", modus: "schriftsatz", akte: true, text: "Entwirf einen Antrag auf Haftprüfung für den Mandanten dieser Akte." },
  { titel: "Einstellung beantragen", modus: "schriftsatz", akte: true, text: "Entwirf einen Antrag auf Einstellung des Verfahrens mit rechtlicher Begründung." },
  { titel: "Vernehmung vorbereiten", modus: "strategie", akte: true, text: "Bereite den Mandanten auf seine Vernehmung vor: Rechte, Risiken, was er sagen sollte und was besser nicht." },
  { titel: "Paragraphen zum Sachverhalt", modus: "frage", text: "Welche Paragraphen passen auf folgenden Sachverhalt?\n" },
  { titel: "Paragraph erklären", modus: "frage", text: "Erkläre mir " },
];

const NW_UEBERARBEITEN = ["Formeller formulieren", "Kürzen und straffen", "Rechtliche Begründung stärken", "Platzhalter aus der Akte füllen", "Rechtschreibung und Stil prüfen"];

const NW_ICON = {
  neu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l-1 6 4 4H6l4-4zM12 14v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  stift: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  laden: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  muell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  panel: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 4v16" stroke="currentColor" stroke-width="1.8"/></svg>',
  liste: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  zurueck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  nochmal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  entwurf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  aufgabe: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m8 12 3 3 5-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  stopp: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
};

ui.nigel = {
  userId: null, geladen: false, laedt: false, fehlt: false, fehler: "",
  chats: [], nachrichten: {}, laedtNachrichten: {},
  neu: null, angezeigt: undefined,
  q: "", paraQ: "", tab: "kontext", ansicht: "chat", panel: window.innerWidth > 1250,
  entwurfAnsicht: "bearbeiten", entwurfVorher: {}, mitEntwurf: {},
  laeuft: {}, profil: { ...NW_STANDARD }, vorlagen: [], info: null, nutzungAlle: null,
};
const nwFormat = new Map();   // formatiertes Markdown je Nachricht
const nwGesetzt = new WeakMap();

const nwEl = (name) => document.querySelector(`#main [data-nw="${name}"]`);
const nwFeld = (id) => document.getElementById(id);

// Nur geänderte Bereiche neu schreiben
function nwSetzen(el, inhalt) {
  if (!el) return false;
  const h = String(inhalt);
  if (nwGesetzt.get(el) === h) return false;
  el.innerHTML = h;
  nwGesetzt.set(el, h);
  return true;
}

// ---------- Kanzlei-Vorgaben (Personal → Kanzlei & Daten bzw. hier unter Einstellungen) ----------
function nwVorgaben() {
  const v = (state.settings && state.settings.nigel) || {};
  const alle = ["gutachten", "schriftsatz", "strategie"];
  return {
    anweisungen: typeof v.anweisungen === "string" ? v.anweisungen : "",
    modi: Array.isArray(v.modi) ? alle.filter((m) => v.modi.includes(m)) : alle,
    reasoning_max: ["low", "medium", "high"].includes(v.reasoning_max) ? v.reasoning_max : "high",
    gewichte: v.gewichte && typeof v.gewichte === "object" ? v.gewichte : {},
    akten_werkzeuge: v.akten_werkzeuge !== false,
    kosten_max: Math.max(0, Number(v.kosten_max) || 0),
  };
}
// Dollarbeträge: kleine Summen mit mehr Nachkommastellen
const nwDollar = (n) => (n === null || n === undefined || !isFinite(n)) ? "–" : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: n < 0.01 ? 4 : n < 1 ? 3 : 2, maximumFractionDigits: n < 0.01 ? 4 : n < 1 ? 3 : 2 });
const nwModusErlaubt = (m) => m === "frage" || nwVorgaben().modi.includes(m === "ueberarbeiten" ? "schriftsatz" : m);
const nwGewicht = (m) => (m === "frage" ? 1 : Math.max(1, Math.min(10, Number(nwVorgaben().gewichte[m === "ueberarbeiten" ? "schriftsatz" : m]) || 1)));
const nwAnrede = () => ({ madam: "Madam", neutral: "" }[ui.nigel.profil.anrede] ?? "Sir");

// ---------- Laden ----------
async function nwLaden() {
  const n = ui.nigel;
  if (n.laedt) return;
  n.laedt = true;
  n.fehler = "";
  try {
    const [chats, profil, vorlagen] = await Promise.all([
      db.from("ki_chats").select("*").order("updated_at", { ascending: false }).limit(1000),
      db.from("ki_profil").select("einstellungen").eq("user_id", state.me.id).maybeSingle(),
      db.from("ki_vorlagen").select("*").order("sortierung").order("titel"),
    ]);
    for (const r of [chats, profil, vorlagen]) if (r.error) throw r.error;
    n.chats = chats.data;
    n.profil = { ...NW_STANDARD, ...((profil.data && profil.data.einstellungen) || {}) };
    n.vorlagen = vorlagen.data;
    n.geladen = true;
    n.fehlt = false;
  } catch (e) {
    console.error(e);
    if (isMissingSchema(e)) n.fehlt = true;
    else n.fehler = errorText(e);
  } finally {
    n.laedt = false;
  }
  nwInfoLaden();
  scheduleRender();
}

// Heutige Nutzung und Tageslimit (gewichtete Summe; ohne Update 9 Anzahl)
async function nwInfoLaden() {
  try {
    const [limit, heute] = await Promise.all([db.rpc("ki_tageslimit"), db.rpc("ki_heute_genutzt")]);
    if (limit.error) return;
    let genutzt = heute.data;
    if (heute.error) {
      const tagesbeginn = new Date();
      tagesbeginn.setUTCHours(0, 0, 0, 0);
      const r = await db.from("ki_nutzung").select("id", { count: "exact", head: true }).eq("user_id", state.me.id).gte("zeit", tagesbeginn.toISOString());
      genutzt = r.count || 0;
    }
    const kosten = await db.rpc("ki_kosten_heute");
    ui.nigel.info = { heute: genutzt || 0, limit: limit.data, kosten: kosten.error ? null : Number(kosten.data) || 0 };
    ui.assistent.info = { ...(ui.assistent.info || {}), heute: genutzt || 0, limit: limit.data };
    scheduleRender();
  } catch (e) {
    console.warn(e);
  }
}

async function nwNachrichtenLaden(chatId) {
  const n = ui.nigel;
  if (n.nachrichten[chatId] || n.laedtNachrichten[chatId]) return;
  n.laedtNachrichten[chatId] = true;
  const { data, error } = await db.from("ki_nachrichten").select("*").eq("chat_id", chatId).order("created_at").limit(2000);
  n.laedtNachrichten[chatId] = false;
  if (error) { toast(errorText(error), "error"); return; }
  n.nachrichten[chatId] = data;
  scheduleRender();
}

// ---------- Chats ----------
function nwNeuerChat(werte = {}) {
  return { id: null, titel: "Neue Aufgabe", modus: nwModusErlaubt(ui.nigel.profil.modus) ? ui.nigel.profil.modus : "frage", akte_ids: [], paragraph_ids: [], notiz: "", entwurf: "", angeheftet: false, ...werte };
}

function nwAktiverChat(route = parseRoute()) {
  const n = ui.nigel;
  if (!route.id) return n.neu || (n.neu = nwNeuerChat());
  return n.chats.find((c) => c.id === route.id) || null;
}

const nwSchluessel = (chat) => (chat && chat.id) || "neu";
const nwVerlauf = (chat) => (chat && chat.id ? ui.nigel.nachrichten[chat.id] || [] : []);

function nwChatTitel(text) {
  const t = String(text || "").replace(/[#*>`_]/g, "").replace(/\s+/g, " ").trim();
  return truncate(t || "Neue Aufgabe", 70);
}

// Chat speichern; ein neuer (noch ungespeicherter) Chat wird dabei angelegt
async function nwSpeichern(chat, felder = {}) {
  Object.assign(chat, felder);
  if (chat.id) {
    const { data, error } = await db.from("ki_chats").update(felder).eq("id", chat.id).select().single();
    if (error) throw error;
    Object.assign(chat, { updated_at: data.updated_at });
    return chat;
  }
  const { data, error } = await db.from("ki_chats").insert({
    titel: chat.titel, modus: chat.modus, akte_ids: chat.akte_ids, paragraph_ids: chat.paragraph_ids,
    notiz: chat.notiz, entwurf: chat.entwurf, angeheftet: chat.angeheftet,
  }).select().single();
  if (error) throw error;
  Object.assign(chat, data);
  ui.nigel.chats.unshift(chat);
  ui.nigel.nachrichten[chat.id] = ui.nigel.nachrichten[chat.id] || [];
  if (ui.nigel.neu === chat) ui.nigel.neu = null;
  if (ui.nigel.mitEntwurf.neu !== undefined) ui.nigel.mitEntwurf[chat.id] = ui.nigel.mitEntwurf.neu;
  // Adresse ohne Seitenwechsel anpassen (kein hashchange → nichts wird neu aufgebaut)
  if (parseRoute().page === "nigel" && !parseRoute().id) {
    history.replaceState(null, "", "#/nigel/" + chat.id);
    ui.nigel.angezeigt = chat.id;
  }
  return chat;
}

async function nwSpeichernLeise(chat, felder) {
  try { await nwSpeichern(chat, felder); } catch (e) { console.error(e); toast(errorText(e), "error"); }
  scheduleRender();
}

// Entwurf und Notizen beim Tippen verzögert speichern
const nwTimer = {};
function nwSpaeter(chat, feld, wert) {
  chat[feld] = wert;
  const key = nwSchluessel(chat) + feld;
  clearTimeout(nwTimer[key]);
  nwTimer[key] = setTimeout(() => {
    if (!chat.id && !String(wert).trim()) return;
    nwSpeichernLeise(chat, { [feld]: wert });
  }, 900);
}

// =============================================================
//  Anfrage an Nigel (Stream: Arbeitsschritte live, dann die Antwort)
// =============================================================
async function nwSenden(text, { modus } = {}) {
  const chat = nwAktiverChat();
  text = String(text || "").trim();
  if (!chat || !text) return;
  if (ui.nigel.laeuft[nwSchluessel(chat)]) return toast("Nigel arbeitet in diesem Chat noch.", "error");
  modus = modus || chat.modus || "frage";
  if (!nwModusErlaubt(modus)) return toast(`Der Modus „${NW_MODUS_NAME[modus]}“ ist in der Kanzlei nicht freigegeben.`, "error");

  const feld = nwFeld("nw-text");
  if (feld && feld.value.trim() === text) { feld.value = ""; nwTextHoehe(); }
  try {
    if (!chat.id) await nwSpeichern(chat, { titel: nwChatTitel(text) });
    else if (chat.titel === "Neue Aufgabe") nwSpeichernLeise(chat, { titel: nwChatTitel(text) });
    const { data, error } = await db.from("ki_nachrichten").insert({ chat_id: chat.id, rolle: "nutzer", text, modus }).select().single();
    if (error) throw error;
    (ui.nigel.nachrichten[chat.id] = ui.nigel.nachrichten[chat.id] || []).push(data);
  } catch (e) {
    console.error(e);
    toast(errorText(e), "error");
    if (feld && !feld.value) { feld.value = text; nwTextHoehe(); }
    return;
  }
  nwAnfrage(chat, modus, text);
}

async function nwAnfrage(chat, modus, frageText) {
  const n = ui.nigel;
  const lauf = { schritte: [], start: Date.now(), runde: 0, schreibt: false, modus, abbruch: new AbortController() };
  n.laeuft[chat.id] = lauf;
  nwAmEnde = true;
  scheduleRender();

  const verlauf = n.nachrichten[chat.id] || [];
  const mitEntwurf = modus === "ueberarbeiten" || nwMitEntwurf(chat);
  const body = {
    stream: true, modus,
    nachrichten: verlauf.map((m) => ({ rolle: m.rolle, text: m.text })),
    akte_ids: chat.akte_ids.filter((id) => byId("akten", id)),
    paragraph_ids: chat.paragraph_ids,
    notiz: chat.notiz || "",
    entwurf: mitEntwurf ? chat.entwurf || "" : "",
    entwurf_mitsenden: mitEntwurf,
  };

  let ergebnis = null;
  try {
    ergebnis = await nwStream(body, lauf);
    const zeile = {
      chat_id: chat.id, rolle: "ki", text: ergebnis.antwort, modus,
      quellen: { paragraphen: ergebnis.nachgeschlagen || [], akten: ergebnis.akten || [] },
      schritte: ergebnis.schritte || [], vorschlag: !!ergebnis.vorschlag, gekuerzt: !!ergebnis.gekuerzt,
    };
    let { data, error } = await db.from("ki_nachrichten").insert({ ...zeile, kosten: ergebnis.kosten ?? null }).select().single();
    if (error && isMissingSchema(error)) ({ data, error } = await db.from("ki_nachrichten").insert(zeile).select().single()); // ohne Update 10
    if (error) throw error;
    (n.nachrichten[chat.id] = n.nachrichten[chat.id] || []).push(data);
    nwSpeichernLeise(chat, { modus: chat.modus }); // nach oben in der Liste
    n.info = { heute: ergebnis.heute, limit: ergebnis.limit, kosten: n.info && n.info.kosten !== null && n.info.kosten !== undefined ? n.info.kosten + (Number(ergebnis.kosten) || 0) : null };
    ui.assistent.info = { ...(ui.assistent.info || {}), heute: ergebnis.heute, limit: ergebnis.limit, modell: ergebnis.modell };
    if (ergebnis.vorschlag && modus === "schriftsatz" && !String(chat.entwurf || "").trim()) {
      // Erster Schriftsatz landet direkt im (leeren) Entwurf
      nwEntwurfSetzen(chat, nwTeile(ergebnis.antwort).find((t) => t.entwurf).md, "Schriftsatz in den Entwurf übernommen");
    }
    if (document.hidden && "Notification" in window && Notification.permission === "granted") {
      try { new Notification("Nigel ist fertig", { body: chat.titel, icon: "assets/nigel.svg" }); } catch {}
    }
  } catch (e) {
    const abgebrochen = e.name === "AbortError";
    if (!abgebrochen) console.error(e);
    // Frage zurücknehmen und ins Eingabefeld legen, damit nichts verloren geht
    const liste = n.nachrichten[chat.id] || [];
    const letzte = liste[liste.length - 1];
    if (!ergebnis && frageText && letzte && letzte.rolle === "nutzer" && letzte.text === frageText) {
      liste.pop();
      db.from("ki_nachrichten").delete().eq("id", letzte.id).then(() => {}, () => {});
      const feld = nwFeld("nw-text");
      if (feld && !feld.value && nwAktiverChat() === chat) { feld.value = frageText; nwTextHoehe(); }
    }
    toast(abgebrochen ? "Abgebrochen." : /Failed to fetch|NetworkError|Load failed/i.test(e.message) ? "Verzeihung – Nigel ist gerade nicht erreichbar." : e.message, abgebrochen ? "ok" : "error");
  } finally {
    delete n.laeuft[chat.id];
    scheduleRender();
  }
}

// Anfrage als Stream lesen (Server-Sent Events); gibt das Ergebnis zurück
async function nwStream(body, lauf) {
  const config = window.WIWANG_CONFIG || {};
  const { data } = await db.auth.getSession();
  const token = data && data.session && data.session.access_token;
  if (!token) throw new Error("Anmeldung abgelaufen. Bitte neu anmelden.");
  const res = await fetch(`${config.supabaseUrl.replace(/\/$/, "")}/functions/v1/ki-assistent`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, apikey: config.supabaseKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: lauf.abbruch.signal,
  });
  const typ = res.headers.get("Content-Type") || "";
  if (!res.ok || !typ.includes("text/event-stream")) {
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.antwort) return j;
    throw new Error(j.fehler || j.message || `Fehler ${res.status}`);
  }
  const leser = res.body.getReader();
  const dec = new TextDecoder();
  let puffer = "";
  for (;;) {
    const { value, done } = await leser.read();
    if (done) break;
    puffer += dec.decode(value, { stream: true });
    let i;
    while ((i = puffer.indexOf("\n\n")) >= 0) {
      const block = puffer.slice(0, i);
      puffer = puffer.slice(i + 2);
      const zeile = block.split("\n").filter((z) => z.startsWith("data:")).map((z) => z.slice(5).trim()).join("");
      if (!zeile) continue;
      let e;
      try { e = JSON.parse(zeile); } catch { continue; }
      if (e.typ === "schritt") lauf.schritte.push(e);
      else if (e.typ === "runde") { lauf.runde = e.runde; lauf.schreibt = !!e.schreibt; }
      else if (e.typ === "fertig") return e;
      else if (e.typ === "fehler") throw new Error(e.text);
      nwLaufendZeichnen();
    }
  }
  throw new Error("Die Verbindung zu Nigel wurde unterbrochen. Bitte erneut versuchen.");
}

function nwMitEntwurf(chat) {
  if (!String(chat.entwurf || "").trim()) return false;
  const k = nwSchluessel(chat);
  return ui.nigel.mitEntwurf[k] !== undefined ? ui.nigel.mitEntwurf[k] : chat.modus === "schriftsatz";
}

// ---------- Antwort in Teile zerlegen: normaler Text und Entwurfsblöcke (:::entwurf … :::) ----------
function nwTeile(text) {
  const teile = [];
  let aktuell = { entwurf: false, zeilen: [] };
  for (const zeile of String(text || "").split("\n")) {
    if (!aktuell.entwurf && /^:::entwurf\s*$/.test(zeile)) {
      teile.push(aktuell);
      aktuell = { entwurf: true, zeilen: [] };
    } else if (aktuell.entwurf && /^:::\s*$/.test(zeile)) {
      teile.push(aktuell);
      aktuell = { entwurf: false, zeilen: [] };
    } else aktuell.zeilen.push(zeile);
  }
  teile.push(aktuell);
  return teile.map((t) => ({ entwurf: t.entwurf, md: t.zeilen.join("\n").trim() })).filter((t) => t.md);
}

function nwFormatiert(key, text) {
  const k = key + "|" + text.length;
  if (!nwFormat.has(k)) {
    if (nwFormat.size > 600) nwFormat.clear();
    // Checklisten ("- [ ] …") als Kästchen, nicht als Platzhalter
    const md = text.replace(/^(\s*[-*]\s+)\[ \]\s+/gm, "$1☐ ").replace(/^(\s*[-*]\s+)\[x\]\s+/gim, "$1☑ ");
    nwFormat.set(k, nwPlatzhalter(kiFormat(md)));
  }
  return nwFormat.get(k);
}

// [Platzhalter] gelb markieren (nur im Text, nicht in Tags)
function nwPlatzhalter(htmlText) {
  return htmlText.replace(/(>[^<]*)/g, (teil) => teil.replace(/\[([^\]\n<>]{0,79}[^\]\n<>\s][^\]\n<>]{0,79})\]/g, '<mark class="nw-platzhalter">[$1]</mark>'));
}

// Checklisten-Punkte ("- [ ] …") einer Antwort
function nwCheckliste(text) {
  return String(text || "").split("\n").map((z) => z.match(/^\s*[-*]\s+\[ \]\s+(.+)$/)).filter(Boolean)
    .map((m) => m[1].replace(/\*\*/g, "").trim()).filter(Boolean).slice(0, 30);
}

// Paragraph aus "§ 12 StGB" finden
function nwParagraphAusZitat(zitat) {
  const q = norm(zitat);
  const buch = [...state.gesetzbuecher].sort((a, b) => b.kuerzel.length - a.kuerzel.length).find((b) => q.endsWith(" " + norm(b.kuerzel)));
  if (!buch) return null;
  const nr = paragraphNorm(q.slice(0, q.length - norm(buch.kuerzel).length));
  return state.paragraphen.find((x) => x.gesetzbuch_id === buch.id && paragraphNorm(x.nummer) === nr) || null;
}

const nwBuch = (p) => byId("gesetzbuecher", p.gesetzbuch_id) || {};
const nwZitat = (p) => `${p.nummer} ${nwBuch(p).kuerzel || ""}`.trim();

// =============================================================
//  Seite
// =============================================================
VIEWS.nigel = () => html`
  <div class="nw" data-nw="wurzel">
    <aside class="nw-liste" aria-label="Chats mit Nigel">
      <div class="nw-liste-kopf">
        <div class="nw-marke"><img src="assets/nigel.svg" alt=""><div><strong>Nigel</strong><span>Arbeitsbereich</span></div></div>
        <button type="button" class="btn primary full" data-action="nw-neu">${new SafeHtml(NW_ICON.neu)} Neue Aufgabe</button>
        <div class="search"><input type="search" id="nw-suche" data-input="nw-suche" data-search placeholder="Chats durchsuchen … ( / )" autocomplete="off"></div>
      </div>
      <div class="nw-liste-inhalt" data-nw="liste"></div>
      <div class="nw-liste-fuss" data-nw="nutzung"></div>
    </aside>

    <section class="nw-haupt">
      <header class="nw-kopf" data-nw="kopf"></header>
      <div class="nw-verlauf" data-nw="scroll">
        <div class="nw-verlauf-innen">
          <div data-nw="verlauf"></div>
          <div data-nw="laufend"></div>
        </div>
      </div>
      <form class="nw-eingabe" data-submit="nw-senden">
        <div class="nw-eingabe-leiste" data-nw="leiste"></div>
        <div class="nw-eingabe-feld">
          <textarea id="nw-text" name="text" rows="2" data-input="nw-text" placeholder="Ihr Auftrag an Nigel …" aria-label="Auftrag an Nigel"></textarea>
          <button type="submit" class="nw-senden" data-nw-senden aria-label="Senden">${new SafeHtml(KI_ICON.senden)}</button>
        </div>
      </form>
    </section>

    <aside class="nw-panel" aria-label="Arbeitsfläche">
      <nav class="nw-tabs" data-nw="tabs"></nav>
      <div class="nw-panel-inhalt" data-nw="panel-scroll">
        <div class="nw-tab" data-tab="kontext">
          <div data-nw="k-akten"></div>
          <section class="nw-block">
            <h3>Angeheftete Paragraphen</h3>
            <div data-nw="k-paras"></div>
            <input type="search" id="nw-para-suche" data-input="nw-para-suche" placeholder="Paragraph anheften: z. B. „§ 223 StGB“ oder „Diebstahl“" autocomplete="off">
            <div data-nw="k-treffer"></div>
          </section>
          <section class="nw-block">
            <h3>Notizen zum Sachverhalt</h3>
            <textarea id="nw-notiz" data-input="nw-notiz" rows="6" placeholder="Was Nigel zusätzlich wissen soll: Aussagen, Ablauf, Absprachen, Fragen …"></textarea>
            <p class="nw-hilfe">Wird bei jeder Frage in diesem Chat mitgeschickt und automatisch gespeichert.</p>
          </section>
          <div data-nw="k-info"></div>
        </div>

        <div class="nw-tab" data-tab="entwurf">
          <div data-nw="e-kopf"></div>
          <textarea id="nw-entwurf" class="nw-entwurf-feld" data-input="nw-entwurf" spellcheck="true" placeholder="Hier entsteht Ihr Schriftsatz. Schreiben Sie selbst, übernehmen Sie eine Antwort von Nigel („In Entwurf“) oder lassen Sie ihn im Modus „Schriftsatz“ einen Entwurf erstellen. Markdown wird unterstützt."></textarea>
          <div class="nw-entwurf-vorschau ki-md" data-nw="e-vorschau"></div>
          <form class="nw-block nw-ueberarbeiten" data-submit="nw-ueberarbeiten">
            <h3>Von Nigel überarbeiten lassen</h3>
            <div class="nw-chips" data-nw="e-chips"></div>
            <div class="nw-zeile">
              <input type="text" id="nw-anweisung" name="anweisung" placeholder="Eigene Anweisung, z. B. „Absatz 2 schärfer formulieren“" autocomplete="off">
              <button type="submit" class="btn gold">Überarbeiten</button>
            </div>
          </form>
        </div>

        <div class="nw-tab" data-tab="quellen" data-nw="quellen"></div>
        <div class="nw-tab" data-tab="vorlagen" data-nw="vorlagen"></div>
        <div class="nw-tab" data-tab="einstellungen" data-nw="einstellungen"></div>
      </div>
    </aside>
  </div>`;
VIEWS.nigel.dauerhaft = true;

// Wird bei jedem Neuzeichnen aufgerufen (nur geänderte Teile werden erneuert)
VIEWS.nigel.aktualisieren = (route) => {
  const n = ui.nigel;
  const wurzel = nwEl("wurzel");
  if (!wurzel) return;
  if (n.userId !== state.me.id) {
    Object.assign(n, { userId: state.me.id, geladen: false, fehlt: false, chats: [], nachrichten: {}, neu: null, angezeigt: undefined, laeuft: {} });
  }
  if (!n.geladen && !n.laedt && !n.fehlt && !n.fehler) nwLaden();
  nwHoehe();

  if (n.fehlt || n.fehler || !n.geladen) {
    wurzel.classList.add("nw-hinweis-modus");
    nwSetzen(nwEl("verlauf"), n.fehlt ? html`
      <div class="card nw-hinweis">
        <h2>Datenbank-Update 9 nötig</h2>
        <p>Für Nigels Arbeitsbereich (gespeicherte Chats, Entwürfe, Vorlagen) muss der Admin einmal
        <code>supabase-update-9.sql</code> im Supabase SQL Editor ausführen und die Edge Function <code>ki-assistent</code> neu bereitstellen.</p>
        <p class="muted">Bis dahin steht Nigel wie gewohnt auf dem iFruit-Handy zur Verfügung (Taste <kbd>K</kbd>).</p>
      </div>` : n.fehler ? html`<div class="card nw-hinweis"><h2>Konnte nicht laden</h2><p>${n.fehler}</p>
        <button class="btn" data-action="nw-erneut">Erneut versuchen</button></div>`
      : html`<div class="nw-laden"><span class="spinner"></span> Nigel legt die Unterlagen bereit …</div>`);
    return;
  }
  wurzel.classList.remove("nw-hinweis-modus");

  const chat = nwAktiverChat(route);
  if (!chat) {
    if (route.id) { toast("Dieser Chat existiert nicht mehr.", "error"); go("nigel"); }
    return;
  }
  if (chat.id) nwNachrichtenLaden(chat.id);
  // Akten, die es nicht mehr gibt (oder ohne Leserecht), im Kontext ignorieren
  const neuerChat = n.angezeigt !== nwSchluessel(chat);
  if (neuerChat) {
    n.angezeigt = nwSchluessel(chat);
    nwFeld("nw-notiz").value = chat.notiz || "";
    nwFeld("nw-entwurf").value = chat.entwurf || "";
    nwFeld("nw-para-suche").value = n.paraQ = "";
    nwAmEnde = true;
    if (window.innerWidth <= 900) n.ansicht = "chat";
    if (n.uebergabe != null) {
      const feld = nwFeld("nw-text");
      if (n.uebergabe || !feld.value.trim()) feld.value = n.uebergabe;
      n.uebergabe = null;
      requestAnimationFrame(nwTextHoehe);
      setTimeout(() => { feld.focus({ preventScroll: true }); feld.setSelectionRange(feld.value.length, feld.value.length); }, 40);
    }
  }

  wurzel.dataset.ansicht = n.ansicht;
  wurzel.classList.toggle("panel-auf", n.panel);
  document.body.classList.add("nw-seite");

  nwListeZeichnen(chat);
  nwKopfZeichnen(chat);
  nwVerlaufZeichnen(chat, neuerChat);
  nwLaufendZeichnen();
  nwLeisteZeichnen(chat);
  nwPanelZeichnen(chat);
  if (neuerChat && route.id && window.innerWidth > 900) setTimeout(() => nwFeld("nw-text") && nwFeld("nw-text").focus({ preventScroll: true }), 30);
};

// Seite füllt den Bildschirm unter Kopfzeile und Navigation
function nwHoehe() {
  const w = nwEl("wurzel");
  if (!w) return;
  const oben = Math.max(0, $("main").getBoundingClientRect().top + window.scrollY);
  w.style.setProperty("--nw-oben", oben + "px");
}
window.addEventListener("resize", () => { if (parseRoute().page === "nigel") nwHoehe(); });
RENDER_HOOKS.push((route) => { if (route.page !== "nigel") document.body.classList.remove("nw-seite"); });

// ---------- Linke Spalte: Chats ----------
function nwListeZeichnen(aktiv) {
  const n = ui.nigel;
  const liste = [...n.chats].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))).filter((c) => matches(n.q, c.titel, c.akte_ids.map((id) => (byId("akten", id) || {}).number), NW_MODUS_NAME[c.modus]));
  const heute = startOfDay();
  const woche = addDays(heute, -7);
  const gruppen = [
    ["Angeheftet", liste.filter((c) => c.angeheftet)],
    ["Heute", liste.filter((c) => !c.angeheftet && new Date(c.updated_at) >= heute)],
    ["Letzte 7 Tage", liste.filter((c) => !c.angeheftet && new Date(c.updated_at) < heute && new Date(c.updated_at) >= woche)],
    ["Älter", liste.filter((c) => !c.angeheftet && new Date(c.updated_at) < woche)],
  ].filter(([, l]) => l.length);
  const handy = ui.assistent.verlauf.length;
  nwSetzen(nwEl("liste"), html`
    ${handy ? html`<button type="button" class="nw-handy" data-action="nw-vom-handy">
      <span class="nw-handy-icon">${new SafeHtml(KI_ICON.ifruit)}</span>
      <span><strong>Handy-Chat übernehmen</strong><small>${anzahl(handy, "Nachricht", "Nachrichten")} vom iFruit</small></span></button>` : ""}
    ${!aktiv.id ? html`<a class="nw-chat-item active" href="#/nigel"><span class="t">Neue Aufgabe</span><span class="m">noch nicht gespeichert</span></a>` : ""}
    ${gruppen.map(([titel, l]) => html`
      <p class="nw-gruppe">${titel}</p>
      ${l.map((c) => {
        const akte = c.akte_ids.map((id) => byId("akten", id)).find(Boolean);
        return html`<a class="nw-chat-item ${c.id === aktiv.id ? "active" : ""} ${n.laeuft[c.id] ? "laeuft" : ""}" href="#/nigel/${c.id}">
          <span class="t">${c.angeheftet ? html`<span class="nw-pin">${new SafeHtml(NW_ICON.pin)}</span>` : ""}${c.titel}</span>
          <span class="m"><span class="nw-modus-punkt m-${c.modus}"></span>${NW_MODUS_NAME[c.modus] || ""}${akte ? ` · ${akte.number}` : ""} · ${fmt.relativ(c.updated_at)}</span>
        </a>`;
      })}`)}
    ${!liste.length && n.q ? html`<p class="nw-leer-hinweis">Keine Chats zu „${n.q}“.</p>` : ""}
    ${!n.chats.length && !n.q ? html`<p class="nw-leer-hinweis">Ihre Chats mit Nigel erscheinen hier – gespeichert und jederzeit fortsetzbar.</p>` : ""}`);

  const info = n.info;
  const prozent = info && info.limit ? Math.min(100, Math.round((info.heute / info.limit) * 100)) : info ? 100 : 0;
  nwSetzen(nwEl("nutzung"), html`
    <div class="ki-nutzung"><span>Heute genutzt</span><strong>${info ? `${info.heute} / ${info.limit}` : "–"}</strong></div>
    <div class="ki-balken"><span style="width:${prozent}%"></span></div>`);
}

// ---------- Kopf: Titel, Modus, Aktionen ----------
function nwKopfZeichnen(chat) {
  const n = ui.nigel;
  const akten = chat.akte_ids.map((id) => byId("akten", id)).filter(Boolean);
  const teile = [
    akten.length ? anzahl(akten.length, "Akte", "Akten") : "ohne Akte",
    chat.paragraph_ids.length ? anzahl(chat.paragraph_ids.length, "Paragraph", "Paragraphen") : "",
    String(chat.entwurf || "").trim() ? "Entwurf" : "",
    String(chat.notiz || "").trim() ? "Notizen" : "",
  ].filter(Boolean);
  nwSetzen(nwEl("kopf"), html`
    <div class="nw-kopf-zeile">
      <button type="button" class="nw-icon nw-nur-mobil" data-action="nw-ansicht" data-ansicht="liste" title="Chats" aria-label="Chats">${new SafeHtml(NW_ICON.liste)}</button>
      <div class="nw-titel">
        <h1>${chat.titel}</h1>
        <span class="nw-titel-meta">${teile.join(" · ")}</span>
      </div>
      <div class="nw-kopf-aktionen">
        ${chat.id ? html`
          <button type="button" class="nw-icon" data-action="nw-umbenennen" title="Umbenennen" aria-label="Umbenennen">${new SafeHtml(NW_ICON.stift)}</button>
          <button type="button" class="nw-icon ${chat.angeheftet ? "an" : ""}" data-action="nw-anheften" title="${chat.angeheftet ? "Nicht mehr anheften" : "Oben anheften"}" aria-label="Anheften">${new SafeHtml(NW_ICON.pin)}</button>
          <button type="button" class="nw-icon" data-action="nw-export" title="Chat als Markdown herunterladen" aria-label="Exportieren">${new SafeHtml(NW_ICON.laden)}</button>
          <button type="button" class="nw-icon gefahr" data-action="nw-loeschen" title="Chat löschen" aria-label="Löschen">${new SafeHtml(NW_ICON.muell)}</button>` : ""}
        <button type="button" class="nw-icon nw-panel-knopf ${n.panel ? "an" : ""}" data-action="nw-panel" title="Arbeitsfläche ein-/ausblenden" aria-label="Arbeitsfläche">${new SafeHtml(NW_ICON.panel)}</button>
      </div>
    </div>
    <div class="nw-modi" role="radiogroup" aria-label="Arbeitsmodus">
      ${NW_MODI.map((m) => {
        const erlaubt = nwModusErlaubt(m.key);
        const g = nwGewicht(m.key);
        return html`<button type="button" role="radio" aria-checked="${chat.modus === m.key}" class="nw-modus m-${m.key} ${chat.modus === m.key ? "aktiv" : ""}"
          data-action="nw-modus" data-modus="${m.key}" ${erlaubt ? "" : "disabled"} title="${erlaubt ? m.text + (g > 1 ? ` (zählt ${g}× beim Tageslimit)` : "") : "In der Kanzlei nicht freigegeben"}">
          ${m.label}${g > 1 ? html`<small>${g}×</small>` : ""}</button>`;
      })}
    </div>`);
}

// ---------- Mitte: Nachrichten ----------
let nwAmEnde = true;

function nwVerlaufZeichnen(chat, neuerChat) {
  const scroll = nwEl("scroll");
  const vorher = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 60;
  const verlauf = nwVerlauf(chat);
  const laedt = chat.id && !ui.nigel.nachrichten[chat.id];
  const letzteKi = [...verlauf].reverse().find((m) => m.rolle === "ki");
  const geaendert = nwSetzen(nwEl("verlauf"), laedt
    ? html`<div class="nw-laden"><span class="spinner"></span> Chat wird geladen …</div>`
    : verlauf.length ? html`${verlauf.map((m, i) => nwNachricht(chat, m, i, m === letzteKi && i === verlauf.length - 1))}`
    : nwStart(chat));
  if (!verlauf.length && !laedt) { if (neuerChat) scroll.scrollTop = 0; } // Startbildschirm von oben
  else if (neuerChat || ((geaendert || ui.nigel.laeuft[chat.id]) && (vorher || nwAmEnde))) scroll.scrollTop = scroll.scrollHeight;
  nwAmEnde = false;
}

function nwStart(chat) {
  const n = ui.nigel;
  const anrede = nwAnrede();
  const akte = chat.akte_ids.map((id) => byId("akten", id)).find(Boolean);
  const vorlagen = nwAlleVorlagen().filter((v) => nwModusErlaubt(v.modus) && (!v.akte || akte));
  const passend = [...vorlagen.filter((v) => v.modus === chat.modus), ...vorlagen.filter((v) => v.modus !== chat.modus)].slice(0, 6);
  return html`<div class="nw-start">
    <img class="nw-start-bild" src="assets/nigel.svg" alt="Nigel">
    <h2 class="nw-gruss">${kiTagesgruss()}${anrede ? `, ${anrede}` : ""}.</h2>
    <p class="muted">Woran arbeiten wir heute? Wählen Sie die Art der Aufgabe und ergänzen Sie rechts den Kontext – Akten, Paragraphen, Notizen.</p>
    <div class="nw-modus-karten">
      ${NW_MODI.map((m) => html`<button type="button" class="nw-modus-karte m-${m.key} ${chat.modus === m.key ? "aktiv" : ""}" data-action="nw-modus" data-modus="${m.key}" ${nwModusErlaubt(m.key) ? "" : "disabled"}>
        <strong>${m.label}</strong><span>${nwModusErlaubt(m.key) ? m.text : "In der Kanzlei nicht freigegeben."}</span></button>`)}
    </div>
    ${akte ? "" : html`<p class="nw-start-tipp">Tipp: Unter <button type="button" class="link-btn" data-action="nw-tab" data-tab="kontext">Kontext</button> eine oder mehrere Akten wählen – Nigel kennt dann Sachverhalt, Vorwürfe, Beteiligte, Beweise und Verlauf.</p>`}
    ${passend.length ? html`<div class="nw-start-vorlagen">
      <p class="nw-gruppe">Vorlagen</p>
      <div class="nw-chips">${passend.map((v) => html`<button type="button" class="ki-chip m-${v.modus}" data-action="nw-vorlage" data-key="${v.key}">${v.titel}</button>`)}</div>
    </div>` : ""}
  </div>`;
}

function nwNachricht(chat, m, i, letzte) {
  const zeit = fmt.datumZeit(m.created_at);
  if (m.rolle === "nutzer") {
    return html`<div class="nw-msg ich">
      <div class="nw-bubble">${multiline(m.text)}</div>
      <div class="nw-msg-fuss">
        ${m.modus && m.modus !== "frage" ? html`<span class="nw-modus-badge m-${m.modus}">${NW_MODUS_NAME[m.modus]}</span>` : ""}
        <time>${zeit}</time>
        <button type="button" data-action="nw-bearbeiten" data-i="${i}" title="Frage ändern und neu stellen">${new SafeHtml(NW_ICON.stift)}Ändern</button>
      </div>
    </div>`;
  }
  const teile = nwTeile(m.text);
  const quellen = (m.quellen && m.quellen.paragraphen) || [];
  const akten = (m.quellen && m.quellen.akten) || [];
  const schritte = Array.isArray(m.schritte) ? m.schritte : [];
  const checkliste = nwCheckliste(m.text);
  const hatEntwurf = teile.some((t) => t.entwurf);
  return html`<article class="nw-msg ki">
    <img class="nw-msg-avatar" src="assets/nigel.svg" alt="">
    <div class="nw-msg-inhalt">
      <div class="nw-msg-meta"><strong>Nigel</strong>
        ${m.modus ? html`<span class="nw-modus-badge m-${m.modus}">${NW_MODUS_NAME[m.modus] || m.modus}</span>` : ""}
        <time>${zeit}</time>
        ${m.gekuerzt ? html`<span class="badge" title="Die Antwort hat das Längenlimit erreicht">gekürzt</span>` : ""}
        ${m.kosten !== null && m.kosten !== undefined ? html`<span class="nw-kosten" title="Kosten dieser Anfrage bei OpenRouter">${nwDollar(Number(m.kosten))}</span>` : ""}
      </div>
      ${schritte.length ? html`<details class="nw-schritte"><summary>${anzahl(schritte.length, "Arbeitsschritt", "Arbeitsschritte")}${quellen.length ? ` · ${anzahl(quellen.length, "Paragraph", "Paragraphen")}` : ""}${akten.length ? ` · ${anzahl(akten.length, "Akte", "Akten")}` : ""}</summary>
        <ol>${schritte.map((s) => nwSchrittZeile(s))}</ol></details>` : ""}
      <div class="nw-antwort">
        ${teile.map((t, j) => t.entwurf ? html`
          <div class="nw-dokument">
            <div class="nw-dokument-kopf"><span>${new SafeHtml(NW_ICON.entwurf)} ${m.vorschlag && m.modus === "ueberarbeiten" ? "Überarbeiteter Entwurf" : "Entwurf"}</span>
              <button type="button" class="btn small gold" data-action="nw-in-entwurf" data-id="${m.id}" data-teil="${j}">${m.modus === "ueberarbeiten" ? "Als Entwurf übernehmen" : "In Entwurf"}</button></div>
            <div class="ki-md nw-dokument-text">${new SafeHtml(nwFormatiert(m.id + "/" + j, t.md))}</div>
          </div>` : html`<div class="ki-md nw-text">${new SafeHtml(nwFormatiert(m.id + "/" + j, t.md))}</div>`)}
      </div>
      ${quellen.length || akten.length ? html`<div class="ki-quellen"><span>Nachgeschlagen:</span>
        ${quellen.map((q) => html`<button type="button" class="ki-quelle" data-action="nw-quelle" data-q="${q}">${q}</button>`)}
        ${akten.map((a) => html`<a class="ki-quelle nw-akte-quelle" href="#/akten/${a.id}">${a.number}</a>`)}</div>` : ""}
      <div class="nw-msg-aktionen">
        <button type="button" data-action="nw-kopieren" data-id="${m.id}">${new SafeHtml(KI_ICON.kopieren)}Kopieren</button>
        ${hatEntwurf ? "" : html`<button type="button" data-action="nw-in-entwurf" data-id="${m.id}">${new SafeHtml(NW_ICON.entwurf)}In Entwurf</button>`}
        <button type="button" data-action="nw-in-akte" data-id="${m.id}">${new SafeHtml(KI_ICON.akte)}In Akte</button>
        ${checkliste.length ? html`<button type="button" data-action="nw-aufgaben" data-id="${m.id}">${new SafeHtml(NW_ICON.aufgabe)}${anzahl(checkliste.length, "Aufgabe", "Aufgaben")} anlegen</button>` : ""}
        ${letzte && !ui.nigel.laeuft[chat.id] ? html`<button type="button" data-action="nw-nochmal" title="Antwort neu erzeugen">${new SafeHtml(NW_ICON.nochmal)}Neu</button>` : ""}
      </div>
    </div>
  </article>`;
}

const NW_WERKZEUG = { gesetze_finden: ["GB", "Gesetzbücher"], paragraphen_finden: ["§", "Paragraphen"], akten_suchen: ["A", "Akten durchsucht"], akte_lesen: ["A", "Akte gelesen"] };
function nwSchrittZeile(s) {
  const [zeichen, name] = NW_WERKZEUG[s.werkzeug] || ["•", s.werkzeug];
  return html`<li><span class="nw-schritt-zeichen">${zeichen}</span><span class="nw-schritt-text"><strong>${name}</strong> ${s.text || ""}</span>
    ${s.treffer !== undefined ? html`<span class="nw-schritt-treffer ${s.treffer ? "" : "null"}">${s.treffer ? anzahl(s.treffer, "Treffer", "Treffer") : "nichts gefunden"}</span>` : ""}</li>`;
}

// Laufende Anfrage: Arbeitsschritte live, mit Zeit und Abbrechen
function nwLaufendZeichnen() {
  const el = nwEl("laufend");
  if (!el) return;
  const chat = nwAktiverChat();
  const lauf = chat && chat.id ? ui.nigel.laeuft[chat.id] : null;
  const scroll = nwEl("scroll");
  const amEnde = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 80;
  if (!lauf) { nwSetzen(el, ""); return; }
  const sek = Math.floor((Date.now() - lauf.start) / 1000);
  const status = lauf.schreibt || (lauf.runde > 1 && !lauf.schritte.length) ? "schreibt die Antwort"
    : lauf.schritte.length ? "schlägt nach" : lauf.runde ? "denkt nach" : "nimmt den Auftrag entgegen";
  const geaendert = nwSetzen(el, html`<article class="nw-msg ki nw-laeuft">
    <img class="nw-msg-avatar" src="assets/nigel.svg" alt="">
    <div class="nw-msg-inhalt">
      <div class="nw-msg-meta"><strong>Nigel</strong><span class="nw-modus-badge m-${lauf.modus}">${NW_MODUS_NAME[lauf.modus]}</span>
        <span class="nw-status">${status} …</span><span class="nw-uhr">${Math.floor(sek / 60)}:${pad2(sek % 60)}</span>
        <button type="button" class="nw-abbrechen" data-action="nw-abbrechen">${new SafeHtml(NW_ICON.stopp)} Abbrechen</button></div>
      ${lauf.schritte.length ? html`<ol class="nw-schritte-live">${lauf.schritte.map((s) => nwSchrittZeile(s))}</ol>` : ""}
      <div class="ki-tippt"><span></span><span></span><span></span></div>
    </div>
  </article>`);
  if (geaendert && amEnde) scroll.scrollTop = scroll.scrollHeight;
}
setInterval(() => {
  if (Object.keys(ui.nigel.laeuft).length && parseRoute().page === "nigel" && !document.hidden) nwLaufendZeichnen();
}, 1000);

// Leiste über dem Eingabefeld: Kontext, Entwurf mitsenden, Tastenhinweis
function nwLeisteZeichnen(chat) {
  const akten = chat.akte_ids.map((id) => byId("akten", id)).filter(Boolean);
  const hatEntwurf = !!String(chat.entwurf || "").trim();
  const g = nwGewicht(chat.modus);
  const strg = ui.nigel.profil.senden === "strg";
  nwSetzen(nwEl("leiste"), html`
    <span class="nw-leiste-modus m-${chat.modus}">${NW_MODUS_NAME[chat.modus]}${g > 1 ? ` · zählt ${g}×` : ""}</span>
    ${akten.map((a) => html`<span class="nw-kontext-chip" title="${a.title}">${new SafeHtml(KI_ICON.akte)}${a.number}<button type="button" data-action="nw-akte-weg" data-id="${a.id}" aria-label="Akte ${a.number} entfernen">×</button></span>`)}
    <button type="button" class="nw-kontext-plus" data-action="nw-tab" data-tab="kontext">${akten.length ? "+ Kontext" : "+ Akte / Kontext"}</button>
    ${hatEntwurf ? html`<label class="nw-schalter" title="Den aktuellen Entwurf bei der nächsten Frage mitschicken"><input type="checkbox" data-change="nw-mit-entwurf" ${nwMitEntwurf(chat) ? "checked" : ""}> Entwurf mitsenden</label>` : ""}
    <span class="nw-leiste-tipp">${strg ? "Strg+Enter senden" : "Enter senden · Shift+Enter neue Zeile"}</span>`);
  const senden = document.querySelector("#main [data-nw-senden]");
  if (senden) senden.disabled = !!(chat.id && ui.nigel.laeuft[chat.id]);
  const feld = nwFeld("nw-text");
  if (feld) {
    const ph = { frage: "Ihre Rechtsfrage an Nigel …", gutachten: "Was soll Nigel begutachten? (z. B. „alle Vorwürfe der Akte“)", schriftsatz: "Welchen Schriftsatz soll Nigel entwerfen?", strategie: "Welchen Fall soll Nigel analysieren?" }[chat.modus];
    if (feld.placeholder !== ph) feld.placeholder = ph;
  }
}

function nwTextHoehe() {
  const feld = nwFeld("nw-text");
  if (!feld) return;
  feld.style.height = "auto";
  feld.style.height = Math.min(feld.scrollHeight + 2, Math.round(window.innerHeight * 0.4)) + "px";
}

// =============================================================
//  Rechte Spalte: Arbeitsfläche
// =============================================================
const NW_TABS = [["kontext", "Kontext"], ["entwurf", "Entwurf"], ["quellen", "Quellen"], ["vorlagen", "Vorlagen"], ["einstellungen", "Einstellungen"]];

function nwPanelZeichnen(chat) {
  const n = ui.nigel;
  const zaehler = {
    kontext: chat.akte_ids.filter((id) => byId("akten", id)).length + chat.paragraph_ids.length,
    entwurf: String(chat.entwurf || "").trim() ? "●" : "",
    quellen: nwQuellen(chat).paragraphen.length,
  };
  nwSetzen(nwEl("tabs"), html`
    <button type="button" class="nw-icon nw-nur-mobil" data-action="nw-ansicht" data-ansicht="chat" aria-label="Zurück zum Chat">${new SafeHtml(NW_ICON.zurueck)}</button>
    ${NW_TABS.map(([k, label]) => html`<button type="button" class="${n.tab === k ? "aktiv" : ""}" data-action="nw-tab" data-tab="${k}">${label}${zaehler[k] ? html`<span class="nw-zahl">${zaehler[k]}</span>` : ""}</button>`)}`);
  document.querySelectorAll("#main .nw-tab").forEach((el) => { el.hidden = el.dataset.tab !== n.tab; });
  if (n.tab === "kontext") nwKontextZeichnen(chat);
  if (n.tab === "entwurf") nwEntwurfZeichnen(chat);
  if (n.tab === "quellen") nwQuellenZeichnen(chat);
  if (n.tab === "vorlagen") nwVorlagenZeichnen(chat);
  if (n.tab === "einstellungen") nwEinstellungenZeichnen();
}

// ---------- Kontext ----------
function nwKontextZeichnen(chat) {
  const akten = chat.akte_ids.map((id) => byId("akten", id)).filter(Boolean);
  const auswahl = kiOffeneAkten().filter((a) => !chat.akte_ids.includes(a.id));
  nwSetzen(nwEl("k-akten"), html`<section class="nw-block">
    <h3>Akten <span class="nw-zahl-leise">${akten.length}/5</span></h3>
    ${akten.length ? html`<div class="nw-akten">${akten.map((a) => {
      const v = a.vorwuerfe || [];
      return html`<div class="nw-akte-karte">
        <div class="nw-akte-kopf"><span class="ki-badge">${a.number}</span>
          <span class="ki-status s-${norm(a.status || "").replace(/\s+/g, "-")}">${a.status || "–"}</span>
          <button type="button" class="nw-x" data-action="nw-akte-weg" data-id="${a.id}" aria-label="Entfernen" title="Aus dem Kontext entfernen">×</button></div>
        <strong>${a.title}</strong>
        <span class="nw-akte-meta">${mandantName(a)}${a.in_haft ? " · in Haft" : ""}${v.length ? ` · ${anzahl(v.length, "Vorwurf", "Vorwürfe")}` : ""}</span>
        ${v.length ? html`<span class="nw-akte-vorwuerfe">${v.slice(0, 4).map((x) => html`<span>${x.paragraph || "§"}${x.titel ? ` ${truncate(x.titel, 24)}` : ""}</span>`)}${v.length > 4 ? html`<span>+${v.length - 4}</span>` : ""}</span>` : ""}
        <a class="nw-akte-link" href="#/akten/${a.id}">Akte öffnen →</a>
      </div>`;
    })}</div>` : html`<p class="nw-hilfe">Noch keine Akte. Mit Akte kennt Nigel Sachverhalt, Tatvorwürfe, Beteiligte, Beweise und Verlauf.</p>`}
    ${akten.length < 5 ? html`<select data-change="nw-akte-hinzu" aria-label="Akte hinzufügen">
      <option value="">+ Akte hinzufügen …</option>
      ${auswahl.map((a) => html`<option value="${a.id}">${a.number} · ${truncate(a.title, 46)}${a.status === "Geschlossen" ? " (geschl.)" : ""}</option>`)}
    </select>` : ""}
  </section>`);

  const paras = chat.paragraph_ids.map((id) => byId("paragraphen", id)).filter(Boolean);
  nwSetzen(nwEl("k-paras"), paras.length ? html`<div class="nw-paras">${paras.map((p) => html`
    <details class="nw-para"><summary><span class="nw-para-nr">${nwZitat(p)}</span><span class="nw-para-titel">${p.titel || ""}</span>
      <button type="button" class="nw-x" data-action="nw-para-weg" data-id="${p.id}" aria-label="Lösen" title="Nicht mehr anheften">×</button></summary>
      <div class="gb-wortlaut">${p.text}</div></details>`)}</div>`
    : html`<p class="nw-hilfe">Angeheftete Paragraphen bekommt Nigel immer im vollen Wortlaut – zusätzlich zu dem, was er selbst nachschlägt.</p>`);

  const q = ui.nigel.paraQ;
  let treffer = [];
  if (q.trim().length >= 2) {
    const zitat = nwParagraphAusZitat(q);
    treffer = zitat ? [zitat] : [];
    for (const p of state.paragraphen) {
      if (treffer.length >= 8) break;
      if (p !== zitat && matches(q, p.nummer, p.titel, nwBuch(p).kuerzel, nwBuch(p).titel, p.text.slice(0, 600))) treffer.push(p);
    }
  }
  nwSetzen(nwEl("k-treffer"), q.trim().length >= 2 ? (treffer.length ? html`<div class="nw-treffer">${treffer.map((p) => {
    const dabei = chat.paragraph_ids.includes(p.id);
    return html`<button type="button" data-action="nw-para-hinzu" data-id="${p.id}" ${dabei || chat.paragraph_ids.length >= 20 ? "disabled" : ""}>
      <span class="nw-para-nr">${nwZitat(p)}</span><span class="nw-para-titel">${p.titel || truncate(p.text, 60)}</span>${dabei ? html`<small>angeheftet</small>` : ""}</button>`;
  })}</div>` : html`<p class="nw-hilfe">Kein Paragraph gefunden.</p>`) : "");

  const v = nwVorgaben();
  nwSetzen(nwEl("k-info"), html`<section class="nw-block nw-info">
    <h3>Das schlägt Nigel selbst nach</h3>
    <ul>
      <li>Gesetzbücher und Paragraphen im Wortlaut</li>
      <li>den Strafkatalog mit Geldstrafen und Haft</li>
      ${v.akten_werkzeuge && darf("akten_lesen") ? html`<li>Akten der Kanzlei, z. B. vergleichbare frühere Fälle</li>` : ""}
    </ul>
    <p class="nw-hilfe">Nigel sieht nur, was Sie selbst lesen dürfen. Inhalte gehen dafür an den KI-Anbieter.</p>
  </section>`);
}

// ---------- Entwurf ----------
function nwEntwurfZeichnen(chat) {
  const n = ui.nigel;
  const text = String(chat.entwurf || "");
  const vorschau = n.entwurfAnsicht === "vorschau";
  const vorher = n.entwurfVorher[nwSchluessel(chat)];
  const verlauf = nwVerlauf(chat);
  const letzte = [...verlauf].reverse().find((m) => m.rolle === "ki");
  const vorschlagTeil = letzte && letzte.vorschlag ? nwTeile(letzte.text).find((t) => t.entwurf) : null;
  const offenerVorschlag = vorschlagTeil && vorschlagTeil.md.trim() !== text.trim() && letzte.modus === "ueberarbeiten" ? letzte : null;
  const woerter = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lauf = chat.id && n.laeuft[chat.id];
  nwSetzen(nwEl("e-kopf"), html`
    ${offenerVorschlag ? html`<div class="nw-vorschlag">
      <span><strong>Nigel hat den Entwurf überarbeitet.</strong> Vorschlag ansehen und übernehmen?</span>
      <span class="nw-zeile"><button type="button" class="btn small gold" data-action="nw-in-entwurf" data-id="${offenerVorschlag.id}">Übernehmen</button>
      <button type="button" class="btn small" data-action="nw-zur-nachricht" data-id="${offenerVorschlag.id}">Ansehen</button></span>
    </div>` : ""}
    ${lauf && lauf.modus === "ueberarbeiten" ? html`<div class="nw-vorschlag leise"><span class="spinner"></span> Nigel überarbeitet den Entwurf …</div>` : ""}
    <div class="nw-entwurf-leiste">
      <div class="nw-segment">
        <button type="button" class="${vorschau ? "" : "aktiv"}" data-action="nw-entwurf-ansicht" data-ansicht="bearbeiten">Bearbeiten</button>
        <button type="button" class="${vorschau ? "aktiv" : ""}" data-action="nw-entwurf-ansicht" data-ansicht="vorschau">Vorschau</button>
      </div>
      <span class="nw-hilfe">${anzahl(woerter, "Wort", "Wörter")}</span>
      <span class="spacer"></span>
      ${vorher !== undefined ? html`<button type="button" class="btn small" data-action="nw-entwurf-zurueck" title="Letzte Übernahme rückgängig machen">Rückgängig</button>` : ""}
    </div>
    ${text.trim() ? html`<div class="nw-entwurf-export">
      <button type="button" class="btn small primary" data-action="nw-entwurf-drucken">Mit Briefkopf drucken / PDF</button>
      <button type="button" class="btn small" data-action="nw-entwurf-kopieren">Kopieren</button>
      <button type="button" class="btn small" data-action="nw-entwurf-laden">.md</button>
      <button type="button" class="btn small" data-action="nw-entwurf-in-akte">In Akte</button>
      <button type="button" class="btn small danger" data-action="nw-entwurf-leeren">Leeren</button>
    </div>` : ""}`);
  const feld = nwFeld("nw-entwurf");
  feld.hidden = vorschau;
  if (document.activeElement !== feld && feld.value !== text) feld.value = text;
  const vor = nwEl("e-vorschau");
  vor.hidden = !vorschau;
  if (vorschau) nwSetzen(vor, text.trim() ? new SafeHtml(nwPlatzhalter(kiFormat(text))) : html`<p class="muted">Noch leer.</p>`);
  nwSetzen(nwEl("e-chips"), html`${NW_UEBERARBEITEN.map((t) => html`<button type="button" class="ki-chip" data-action="nw-ueberarbeiten-chip" data-text="${t}" ${text.trim() && !lauf ? "" : "disabled"}>${t}</button>`)}`);
  const form = document.querySelector("#main .nw-ueberarbeiten");
  if (form) form.classList.toggle("gesperrt", !text.trim() || !nwModusErlaubt("ueberarbeiten"));
}

function nwEntwurfSetzen(chat, text, meldung) {
  const k = nwSchluessel(chat);
  ui.nigel.entwurfVorher[k] = chat.entwurf || "";
  chat.entwurf = text;
  const feld = nwFeld("nw-entwurf");
  if (feld && nwAktiverChat() === chat) feld.value = text;
  nwSpeichernLeise(chat, { entwurf: text });
  ui.nigel.tab = "entwurf";
  if (window.innerWidth > 900 && window.innerWidth <= 1250) ui.nigel.panel = true;
  if (meldung) toast(meldung);
  scheduleRender();
}

// ---------- Quellen ----------
function nwQuellen(chat) {
  const paragraphen = [], akten = [];
  for (const m of nwVerlauf(chat)) {
    if (m.rolle !== "ki" || !m.quellen) continue;
    for (const q of m.quellen.paragraphen || []) if (!paragraphen.includes(q)) paragraphen.push(q);
    for (const a of m.quellen.akten || []) if (!akten.some((x) => x.id === a.id)) akten.push(a);
  }
  return { paragraphen, akten };
}

function nwQuellenZeichnen(chat) {
  const { paragraphen, akten } = nwQuellen(chat);
  nwSetzen(nwEl("quellen"), html`
    <section class="nw-block">
      <h3>Nachgeschlagene Paragraphen <span class="nw-zahl-leise">${paragraphen.length}</span></h3>
      ${paragraphen.length ? html`<div class="nw-paras">${paragraphen.map((q) => {
        const p = nwParagraphAusZitat(q);
        if (!p) return html`<div class="nw-para leer"><span class="nw-para-nr">${q}</span></div>`;
        const dabei = chat.paragraph_ids.includes(p.id);
        return html`<details class="nw-para"><summary><span class="nw-para-nr">${q}</span><span class="nw-para-titel">${p.titel || ""}</span></summary>
          <div class="gb-wortlaut">${p.text}</div>
          <div class="nw-zeile">
            <button type="button" class="btn small" data-action="nw-para-hinzu" data-id="${p.id}" ${dabei ? "disabled" : ""}>${dabei ? "Angeheftet" : "Anheften"}</button>
            <a class="btn small" href="#/gesetze/${p.gesetzbuch_id}/${p.id}">In Gesetzen öffnen</a>
            <button type="button" class="btn small" data-action="nw-zitat-einfuegen" data-q="${q}">In Frage einfügen</button>
          </div></details>`;
      })}</div>` : html`<p class="nw-hilfe">Sobald Nigel Paragraphen nachschlägt, stehen sie hier – mit Wortlaut, zum Anheften.</p>`}
    </section>
    ${akten.length ? html`<section class="nw-block"><h3>Gelesene Akten</h3>
      <div class="nw-treffer">${akten.map((a) => html`<a href="#/akten/${a.id}"><span class="nw-para-nr">${a.number}</span><span class="nw-para-titel">${a.title || ""}</span></a>`)}</div></section>` : ""}`);
}

// ---------- Vorlagen ----------
function nwAlleVorlagen() {
  return [
    ...NW_VORLAGEN_STANDARD.map((v, i) => ({ ...v, key: "s" + i, art: "standard" })),
    ...ui.nigel.vorlagen.map((v) => ({ ...v, key: v.id, art: v.user_id ? "eigene" : "kanzlei", akte: /dieser Akte|der Akte|diese Akte/i.test(v.text) })),
  ];
}

function nwVorlagenZeichnen(chat) {
  const alle = nwAlleVorlagen();
  const kanzleiDarf = darf("einstellungen_schreiben");
  const gruppe = (titel, art, liste, knopf) => html`<section class="nw-block">
    <div class="nw-block-kopf"><h3>${titel}</h3>${knopf || ""}</div>
    ${liste.length ? html`<div class="nw-vorlagen">${liste.map((v) => html`
      <div class="nw-vorlage ${nwModusErlaubt(v.modus) ? "" : "gesperrt"}">
        <button type="button" class="nw-vorlage-haupt" data-action="nw-vorlage" data-key="${v.key}">
          <span class="nw-modus-badge m-${v.modus}">${NW_MODUS_NAME[v.modus] || v.modus}</span>
          <strong>${v.titel}</strong><span>${truncate(v.text, 110)}</span></button>
        ${art === "eigene" || (art === "kanzlei" && kanzleiDarf) ? html`<button type="button" class="nw-icon" data-action="nw-vorlage-bearbeiten" data-id="${v.id}" aria-label="Bearbeiten">${new SafeHtml(NW_ICON.stift)}</button>` : ""}
      </div>`)}</div>` : html`<p class="nw-hilfe">${art === "eigene" ? "Speichern Sie Aufträge, die Sie öfter brauchen." : "Noch keine."}</p>`}
  </section>`;
  nwSetzen(nwEl("vorlagen"), html`
    <p class="nw-hilfe" style="margin-top:0">Ein Klick setzt Auftrag und Modus ins Eingabefeld – vor dem Senden können Sie ihn noch anpassen.</p>
    ${gruppe("Eigene Vorlagen", "eigene", alle.filter((v) => v.art === "eigene"),
      html`<button type="button" class="btn small" data-action="nw-vorlage-neu" data-art="eigene">+ Neu</button>`)}
    ${gruppe("Vorlagen der Kanzlei", "kanzlei", alle.filter((v) => v.art === "kanzlei"),
      kanzleiDarf ? html`<button type="button" class="btn small" data-action="nw-vorlage-neu" data-art="kanzlei">+ Neu</button>` : "")}
    ${gruppe("Standard", "standard", alle.filter((v) => v.art === "standard"))}`);
}

// ---------- Einstellungen ----------
function nwEinstellungenZeichnen() {
  const p = ui.nigel.profil;
  const v = nwVorgaben();
  const auswahl = (key, optionen) => html`<div class="nw-segment breit">${optionen.map(([wert, label]) => html`
    <button type="button" class="${String(p[key]) === String(wert) ? "aktiv" : ""}" data-action="nw-einstellung" data-key="${key}" data-wert="${wert}">${label}</button>`)}</div>`;
  const stufen = { low: "Schnell", medium: "Gründlich", high: "Sehr gründlich" };
  const info = ui.nigel.info;
  nwSetzen(nwEl("einstellungen"), html`
    <section class="nw-block">
      <h3>Wie Nigel Sie anspricht</h3>
      ${auswahl("anrede", [["sir", "Sir"], ["madam", "Madam"], ["neutral", "Ohne Anrede"]])}
      <h3>Ton</h3>
      ${auswahl("ton", [["butler", "Butler"], ["dezent", "Dezent"], ["sachlich", "Sachlich"]])}
      <p class="nw-hilfe">Butler: die volle Persona. Dezent: höflich, kaum Floskeln. Sachlich: nüchtern und direkt.</p>
      <h3>Antwortlänge</h3>
      ${auswahl("laenge", [["knapp", "Knapp"], ["normal", "Normal"], ["ausfuehrlich", "Ausführlich"]])}
      <h3>Gründlichkeit</h3>
      ${auswahl("gruendlichkeit", [["", "Standard"], ...["low", "medium", "high"].filter((s) => ["low", "medium", "high"].indexOf(s) <= ["low", "medium", "high"].indexOf(v.reasoning_max)).map((s) => [s, stufen[s]])])}
      <p class="nw-hilfe">Wie lange Nigel nachdenkt. Gründlicher = bessere Prüfung, aber langsamer.${v.reasoning_max !== "high" ? ` Die Kanzlei erlaubt höchstens „${stufen[v.reasoning_max]}“.` : ""}</p>
      <label class="check nw-check"><input type="checkbox" data-change="nw-einstellung-check" data-key="wortlaut" ${p.wortlaut !== false ? "checked" : ""}> Wortlaut der Paragraphen zitieren</label>
      <h3>Standardmodus für neue Aufgaben</h3>
      ${auswahl("modus", NW_MODI.filter((m) => nwModusErlaubt(m.key)).map((m) => [m.key, m.label]))}
      <h3>Senden mit</h3>
      ${auswahl("senden", [["enter", "Enter"], ["strg", "Strg + Enter"]])}
      <p class="nw-hilfe">Anrede, Ton, Länge und Gründlichkeit gelten auch für das iFruit-Handy.</p>
    </section>
    <section class="nw-block">
      <h3>Nutzung heute</h3>
      <div class="ki-nutzung"><span>Anfragen</span><strong>${info ? `${info.heute} / ${info.limit}` : "–"}</strong></div>
      <div class="ki-balken"><span style="width:${info && info.limit ? Math.min(100, Math.round((info.heute / info.limit) * 100)) : 0}%"></span></div>
      ${info && info.kosten !== null && info.kosten !== undefined ? html`<div class="ki-nutzung"><span>Kosten heute</span><strong>${nwDollar(info.kosten)}</strong></div>` : ""}
      ${v.kosten_max ? html`<p class="nw-hilfe">Eine Anfrage darf höchstens <strong>${nwDollar(v.kosten_max)}</strong> kosten. Reicht das nicht, schlägt Nigel weniger nach und antwortet kürzer.</p>` : ""}
      <p class="nw-hilfe">${NW_MODI.filter((m) => m.key !== "frage" && nwModusErlaubt(m.key)).map((m) => `${m.label} zählt ${nwGewicht(m.key)}×`).join(" · ")}. Das Tageslimit legt der Admin unter Personal → Ränge & Berechtigungen fest.</p>
    </section>
    ${darf("einstellungen_schreiben") ? html`<section class="nw-block">
      <div class="nw-block-kopf"><h3>Kanzlei-Vorgaben für Nigel</h3><button type="button" class="btn small" data-action="nw-vorgaben">Bearbeiten</button></div>
      <dl class="nw-dl">
        <dt>Freigegebene Modi</dt><dd>${["Rechtsfrage", ...NW_MODI.filter((m) => m.key !== "frage" && v.modi.includes(m.key)).map((m) => m.label)].join(", ")}</dd>
        <dt>Max. Kosten pro Anfrage</dt><dd>${v.kosten_max ? nwDollar(v.kosten_max) : "kein Limit"}</dd>
        <dt>Höchste Gründlichkeit</dt><dd>${stufen[v.reasoning_max]}</dd>
        <dt>Akten durchsuchen</dt><dd>${v.akten_werkzeuge ? "erlaubt" : "aus"}</dd>
        <dt>Hausregeln</dt><dd>${v.anweisungen ? truncate(v.anweisungen, 140) : "keine"}</dd>
      </dl>
    </section>` : ""}`);
}

// =============================================================
//  Aktionen
// =============================================================
function nwNachrichtVon(id) {
  const chat = nwAktiverChat();
  return { chat, m: nwVerlauf(chat).find((x) => x.id === id) };
}

async function nwInAkte(text, titel) {
  const chat = nwAktiverChat();
  const eigene = chat.akte_ids.map((id) => byId("akten", id)).filter(Boolean);
  const speichern = (akteId) => attempt(() => insertRow("eintraege", { akte_id: akteId, art: "Intern", text: `Nigel (KI-Butler) – ${titel}:\n${text}` }), "Im Verlauf der Akte gespeichert");
  if (eigene.length === 1) return speichern(eigene[0].id);
  openForm({
    title: "In den Verlauf einer Akte",
    fields: [{ name: "akte", label: "Akte", type: "select", required: true, options: eigene.length ? eigene.map((a) => ({ value: a.id, label: akteLabel(a) })) : akteOptions() }],
    submitLabel: "Speichern",
    onSubmit: async (v) => { if (!(await speichern(v.akte))) throw new Error("Speichern fehlgeschlagen"); },
  });
}

function nwVorlageFormular(v, art) {
  const kanzlei = art === "kanzlei" || (v && !v.user_id);
  openForm({
    title: v ? "Vorlage bearbeiten" : kanzlei ? "Neue Vorlage für die Kanzlei" : "Neue eigene Vorlage",
    intro: kanzlei ? "Kanzlei-Vorlagen sehen alle Mitglieder, die Nigel nutzen dürfen." : "Eigene Vorlagen sehen nur Sie.",
    fields: [
      { name: "titel", label: "Titel", required: true },
      { name: "modus", label: "Modus", type: "select", required: true, options: NW_MODI.map((m) => ({ value: m.key, label: m.label })) },
      { name: "text", label: "Auftrag an Nigel", type: "textarea", rows: 6, required: true, help: "Bezieht sich der Auftrag auf eine Akte, schreiben Sie „dieser Akte“." },
    ],
    values: v || { modus: nwAktiverChat()?.modus || "frage", text: nwFeld("nw-text")?.value || "" },
    onSubmit: async (w) => {
      if (v) {
        const { data, error } = await db.from("ki_vorlagen").update(w).eq("id", v.id).select().single();
        if (error) throw error;
        Object.assign(v, data);
      } else {
        const { data, error } = await db.from("ki_vorlagen").insert({ ...w, user_id: kanzlei ? null : state.me.id, sortierung: 100 }).select().single();
        if (error) throw error;
        ui.nigel.vorlagen.push(data);
      }
      toast("Vorlage gespeichert");
      scheduleRender();
    },
    onDelete: v ? async () => {
      if (!confirm(`Vorlage „${v.titel}“ löschen?`)) return false;
      const { error } = await db.from("ki_vorlagen").delete().eq("id", v.id);
      if (error) throw error;
      ui.nigel.vorlagen = ui.nigel.vorlagen.filter((x) => x.id !== v.id);
      scheduleRender();
    } : undefined,
  });
}

// Vom iFruit-Handy in den Arbeitsbereich wechseln: Chat, Akte und das, was gerade im
// Eingabefeld steht, kommen mit – man arbeitet nahtlos weiter.
async function nwVomHandy() {
  const s = ui.assistent;
  if (s.laedt) return toast("Einen Moment, Sir – Nigel antwortet noch auf dem Handy.", "error");
  if (ui.nigel.fehlt) return toast("Dafür fehlt noch das Datenbank-Update 9.", "error");
  const eingabe = kiTextarea.value;
  if (!s.verlauf.length) {
    // Noch kein Chat: neue Aufgabe mit Akte und Eingabe
    kiTextarea.value = "";
    kiTextareaHoehe();
    ui.nigel.uebergabe = eingabe;
    if (s.offen) kiSchliessen();
    nwNeueAufgabe({ akte_ids: s.akteId ? [s.akteId] : [] });
    return;
  }
  try {
    const chat = { titel: nwChatTitel((s.verlauf.find((m) => m.rolle === "nutzer") || {}).text), modus: "frage", akte_ids: s.akteId ? [s.akteId] : [], paragraph_ids: [], notiz: "", entwurf: "", angeheftet: false };
    const { data, error } = await db.from("ki_chats").insert(chat).select().single();
    if (error) throw error;
    const { data: msgs, error: e2 } = await db.from("ki_nachrichten").insert(s.verlauf.map((m, i) => ({
      chat_id: data.id, rolle: m.rolle, text: m.text, modus: "frage",
      quellen: { paragraphen: m.quellen || [], akten: [] },
      created_at: new Date(new Date(m.zeit || Date.now()).getTime() + i).toISOString(),
    }))).select();
    if (e2) throw e2;
    ui.nigel.chats.unshift(data);
    ui.nigel.nachrichten[data.id] = msgs.sort((a, b) => a.created_at.localeCompare(b.created_at));
    s.verlauf = [];
    kiSpeichern();
    if (kiTextarea.value === eingabe) { kiTextarea.value = ""; kiTextareaHoehe(); }
    ui.nigel.uebergabe = eingabe;
    ui.nigel.angezeigt = undefined;
    if (s.offen) kiSchliessen();
    toast("Handy-Chat übernommen");
    go("nigel/" + data.id);
  } catch (e) {
    console.error(e);
    toast(errorText(e), "error");
  }
}

// Neue Aufgabe (optional mit Akte und Modus), z. B. aus einer Akte heraus
function nwNeueAufgabe(werte = {}) {
  ui.nigel.neu = nwNeuerChat(werte);
  ui.nigel.angezeigt = undefined;
  ui.nigel.ansicht = "chat";
  go("nigel");
}

Object.assign(ACTIONS, {
  "nw-erneut": () => { ui.nigel.fehler = ""; nwLaden(); },
  "nw-neu": () => nwNeueAufgabe(),
  "nw-mit-akte": (d) => nwNeueAufgabe({ akte_ids: [d.id] }),
  "nw-vom-handy": () => nwVomHandy(),
  "ki-arbeitsbereich": () => nwVomHandy(),
  "nw-ansicht": (d) => { ui.nigel.ansicht = d.ansicht; scheduleRender(); },
  "nw-panel": () => {
    if (window.innerWidth <= 900) ui.nigel.ansicht = ui.nigel.ansicht === "panel" ? "chat" : "panel";
    else ui.nigel.panel = !ui.nigel.panel;
    scheduleRender();
  },
  "nw-tab": (d) => {
    ui.nigel.tab = d.tab;
    if (window.innerWidth <= 900) ui.nigel.ansicht = "panel";
    else ui.nigel.panel = true;
    scheduleRender();
    if (d.tab === "kontext") setTimeout(() => { const s = document.querySelector('#main [data-change="nw-akte-hinzu"]'); if (s && !nwAktiverChat().akte_ids.length) s.focus(); }, 30);
  },
  "nw-modus": (d) => {
    const chat = nwAktiverChat();
    if (!nwModusErlaubt(d.modus) || chat.modus === d.modus) return;
    chat.modus = d.modus;
    if (chat.id) nwSpeichernLeise(chat, { modus: d.modus });
    scheduleRender();
    nwFeld("nw-text").focus({ preventScroll: true });
  },
  "nw-umbenennen": () => {
    const chat = nwAktiverChat();
    openForm({ title: "Chat umbenennen", fields: [{ name: "titel", label: "Titel", required: true }], values: { titel: chat.titel },
      onSubmit: async (v) => { await nwSpeichern(chat, { titel: truncate(v.titel, 120) }); scheduleRender(); } });
  },
  "nw-anheften": () => { const chat = nwAktiverChat(); nwSpeichernLeise(chat, { angeheftet: !chat.angeheftet }); },
  "nw-loeschen": async () => {
    const chat = nwAktiverChat();
    if (!chat.id || !confirm(`Chat „${chat.titel}“ mit allen Nachrichten und dem Entwurf löschen?`)) return;
    const { error } = await db.from("ki_chats").delete().eq("id", chat.id);
    if (error) return toast(errorText(error), "error");
    ui.nigel.chats = ui.nigel.chats.filter((c) => c.id !== chat.id);
    delete ui.nigel.nachrichten[chat.id];
    toast("Chat gelöscht");
    nwNeueAufgabe();
  },
  "nw-export": () => {
    const chat = nwAktiverChat();
    const akten = chat.akte_ids.map((id) => byId("akten", id)).filter(Boolean);
    const teile = [`# ${chat.titel}`, `*${NW_MODUS_NAME[chat.modus]} · ${fmt.datumZeit(chat.created_at)}${akten.length ? ` · Akten: ${akten.map((a) => a.number).join(", ")}` : ""}*`];
    for (const m of nwVerlauf(chat)) {
      teile.push(`## ${m.rolle === "ki" ? "Nigel" : myName()} – ${fmt.datumZeit(m.created_at)}`, m.text.replace(/^:::entwurf\s*$/gm, "---").replace(/^:::\s*$/gm, "---"));
    }
    if (String(chat.entwurf || "").trim()) teile.push("## Entwurf", chat.entwurf);
    downloadFile(`Nigel – ${chat.titel.replace(/[\\/:*?"<>|]/g, "")}.md`, teile.join("\n\n"), "text/markdown;charset=utf-8");
  },
  "nw-abbrechen": () => {
    const chat = nwAktiverChat();
    const lauf = chat && chat.id && ui.nigel.laeuft[chat.id];
    if (lauf) lauf.abbruch.abort();
  },
  "nw-kopieren": async (d) => {
    const { m } = nwNachrichtVon(d.id);
    if (m && await copyText(m.text.replace(/^:::(entwurf)?\s*$/gm, "").trim())) toast("Kopiert");
  },
  "nw-in-entwurf": (d) => {
    const { chat, m } = nwNachrichtVon(d.id);
    if (!m) return;
    const teile = nwTeile(m.text);
    const teil = d.teil !== undefined ? teile[Number(d.teil)] : teile.find((t) => t.entwurf);
    const text = teil ? teil.md : m.text;
    const bisher = String(chat.entwurf || "").trim();
    // Überarbeitungen ersetzen den Entwurf, alles andere wird angehängt
    if (!bisher || m.modus === "ueberarbeiten") nwEntwurfSetzen(chat, text, "In den Entwurf übernommen");
    else nwEntwurfSetzen(chat, bisher + "\n\n---\n\n" + text, "An den Entwurf angehängt");
  },
  "nw-zur-nachricht": (d) => {
    const el = document.querySelector(`#main [data-action="nw-kopieren"][data-id="${CSS.escape(d.id)}"]`);
    if (window.innerWidth <= 900) { ui.nigel.ansicht = "chat"; scheduleRender(); }
    if (el) setTimeout(() => el.closest(".nw-msg").scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  },
  "nw-in-akte": (d) => {
    const { m } = nwNachrichtVon(d.id);
    if (m) nwInAkte(m.text.replace(/^:::(entwurf)?\s*$/gm, "").trim(), NW_MODUS_NAME[m.modus] || "Antwort");
  },
  "nw-aufgaben": (d) => {
    const { chat, m } = nwNachrichtVon(d.id);
    const punkte = m ? nwCheckliste(m.text) : [];
    if (!punkte.length) return;
    const akten = chat.akte_ids.map((id) => byId("akten", id)).filter(Boolean);
    openForm({
      title: "Aufgaben aus Nigels Checkliste",
      intro: "Gewählte Punkte werden als Aufgaben angelegt.",
      fields: [
        { name: "punkte", label: "Aufgaben", type: "checks", options: punkte.map((p) => ({ value: p, label: truncate(p, 120) })) },
        { name: "akte", label: "Akte", type: "select", options: akten.length ? akten.map((a) => ({ value: a.id, label: akteLabel(a) })) : akteOptions(), half: true },
        { name: "zustaendig", label: "Zuständig", type: "select", options: teamOptions, half: true },
        { name: "faellig", label: "Fällig am", type: "date", half: true },
      ],
      values: { punkte, akte: akten[0] ? akten[0].id : "", zustaendig: state.me.id },
      submitLabel: "Aufgaben anlegen",
      onSubmit: async (v) => {
        if (!v.punkte.length) throw new Error("Bitte mindestens einen Punkt wählen.");
        await insertRows("aufgaben", v.punkte.map((text) => ({ text: truncate(text, 300), akte_id: v.akte || null, zustaendig: v.zustaendig || null, faellig: v.faellig || null })));
        toast(`${anzahl(v.punkte.length, "Aufgabe", "Aufgaben")} angelegt`);
      },
    });
  },
  "nw-nochmal": async () => {
    const chat = nwAktiverChat();
    const liste = nwVerlauf(chat);
    const letzte = liste[liste.length - 1];
    if (!letzte || letzte.rolle !== "ki" || ui.nigel.laeuft[chat.id]) return;
    const frage = [...liste].reverse().find((m) => m.rolle === "nutzer");
    const { error } = await db.from("ki_nachrichten").delete().eq("id", letzte.id);
    if (error) return toast(errorText(error), "error");
    liste.pop();
    nwAnfrage(chat, letzte.modus || (frage && frage.modus) || chat.modus, null);
  },
  "nw-bearbeiten": async (d) => {
    const chat = nwAktiverChat();
    const liste = nwVerlauf(chat);
    const i = Number(d.i);
    const m = liste[i];
    if (!m || ui.nigel.laeuft[chat.id]) return;
    const danach = liste.length - i - 1;
    if (danach && !confirm(`Frage ändern? Die ${anzahl(danach, "Nachricht", "Nachrichten")} danach werden dabei entfernt.`)) return;
    const ids = liste.slice(i).map((x) => x.id);
    const { error } = await db.from("ki_nachrichten").delete().in("id", ids);
    if (error) return toast(errorText(error), "error");
    liste.splice(i);
    if (m.modus && m.modus !== "ueberarbeiten" && nwModusErlaubt(m.modus)) chat.modus = m.modus;
    const feld = nwFeld("nw-text");
    feld.value = m.text;
    nwTextHoehe();
    feld.focus();
    scheduleRender();
  },
  "nw-quelle": (d) => {
    const p = nwParagraphAusZitat(d.q);
    if (!p) return;
    ui.nigel.tab = "quellen";
    if (window.innerWidth <= 900) ui.nigel.ansicht = "panel";
    else ui.nigel.panel = true;
    scheduleRender();
    setTimeout(() => {
      const el = [...document.querySelectorAll('#main [data-nw="quellen"] details')].find((x) => x.querySelector(".nw-para-nr").textContent === d.q);
      if (el) { el.open = true; el.scrollIntoView({ behavior: "smooth", block: "nearest" }); el.classList.add("markiert"); setTimeout(() => el.classList.remove("markiert"), 1600); }
    }, 40);
  },
  "nw-zitat-einfuegen": (d) => {
    const feld = nwFeld("nw-text");
    feld.value = (feld.value ? feld.value.trimEnd() + " " : "") + d.q + " ";
    nwTextHoehe();
    if (window.innerWidth <= 900) { ui.nigel.ansicht = "chat"; scheduleRender(); }
    feld.focus();
  },
  "nw-akte-weg": (d) => {
    const chat = nwAktiverChat();
    nwSpeichernLeise(chat, { akte_ids: chat.akte_ids.filter((id) => id !== d.id) });
  },
  "nw-para-hinzu": (d) => {
    const chat = nwAktiverChat();
    if (chat.paragraph_ids.includes(d.id) || chat.paragraph_ids.length >= 20) return;
    nwSpeichernLeise(chat, { paragraph_ids: [...chat.paragraph_ids, d.id] });
  },
  "nw-para-weg": (d, el, e) => {
    if (e) e.stopPropagation();
    const chat = nwAktiverChat();
    nwSpeichernLeise(chat, { paragraph_ids: chat.paragraph_ids.filter((id) => id !== d.id) });
  },
  "nw-vorlage": (d) => {
    const v = nwAlleVorlagen().find((x) => x.key === d.key);
    if (!v) return;
    const chat = nwAktiverChat();
    if (nwModusErlaubt(v.modus) && chat.modus !== v.modus) {
      chat.modus = v.modus;
      if (chat.id) nwSpeichernLeise(chat, { modus: v.modus });
    }
    const feld = nwFeld("nw-text");
    feld.value = v.text;
    nwTextHoehe();
    if (window.innerWidth <= 900) ui.nigel.ansicht = "chat";
    scheduleRender();
    setTimeout(() => { feld.focus(); feld.setSelectionRange(v.text.length, v.text.length); }, 20);
    if (v.akte && !chat.akte_ids.length) toast("Diese Vorlage braucht eine Akte – bitte unter Kontext wählen.");
  },
  "nw-vorlage-neu": (d) => nwVorlageFormular(null, d.art),
  "nw-vorlage-bearbeiten": (d) => { const v = ui.nigel.vorlagen.find((x) => x.id === d.id); if (v) nwVorlageFormular(v); },
  "nw-entwurf-ansicht": (d) => { ui.nigel.entwurfAnsicht = d.ansicht; scheduleRender(); },
  "nw-entwurf-zurueck": () => {
    const chat = nwAktiverChat();
    const k = nwSchluessel(chat);
    const vorher = ui.nigel.entwurfVorher[k];
    if (vorher === undefined) return;
    delete ui.nigel.entwurfVorher[k];
    chat.entwurf = vorher;
    nwFeld("nw-entwurf").value = vorher;
    nwSpeichernLeise(chat, { entwurf: vorher });
    toast("Rückgängig gemacht");
  },
  "nw-entwurf-kopieren": async () => { if (await copyText(nwAktiverChat().entwurf || "")) toast("Entwurf kopiert"); },
  "nw-entwurf-laden": () => {
    const chat = nwAktiverChat();
    downloadFile(`Entwurf – ${chat.titel.replace(/[\\/:*?"<>|]/g, "")}.md`, chat.entwurf || "", "text/markdown;charset=utf-8");
  },
  "nw-entwurf-in-akte": () => nwInAkte(nwAktiverChat().entwurf || "", "Entwurf"),
  "nw-entwurf-leeren": () => {
    const chat = nwAktiverChat();
    if (!confirm("Entwurf leeren? (Lässt sich mit „Rückgängig“ zurückholen.)")) return;
    nwEntwurfSetzen(chat, "", "Entwurf geleert");
  },
  "nw-entwurf-drucken": () => {
    const chat = nwAktiverChat();
    const akte = chat.akte_ids.map((id) => byId("akten", id)).find(Boolean);
    openDocument({
      title: `Entwurf – ${chat.titel}`,
      content: html`${briefkopf()}<div class="nw-druck">${new SafeHtml(nwPlatzhalter(kiFormat(chat.entwurf || "")))}</div>${unterschrift(anwaltVon(akte))}`,
      verlaufAkte: akte ? akte.id : null,
      verlaufText: `Schriftsatz erstellt (mit Nigel): ${chat.titel}`,
    });
  },
  "nw-ueberarbeiten-chip": (d) => nwSenden(`Überarbeite den Entwurf: ${d.text}.`, { modus: "ueberarbeiten" }),
  "nw-einstellung": (d) => nwEinstellungSetzen(d.key, d.wert),
  "nw-vorgaben": () => {
    const v = nwVorgaben();
    openForm({
      title: "Kanzlei-Vorgaben für Nigel",
      intro: "Gilt für alle Mitglieder – im Arbeitsbereich und auf dem iFruit-Handy.",
      wide: true,
      fields: [
        { name: "modi", label: "Freigegebene Modi (Rechtsfrage ist immer frei)", type: "checks", options: NW_MODI.filter((m) => m.key !== "frage").map((m) => ({ value: m.key, label: m.label })) },
        { type: "section", label: "Gewichtung beim Tageslimit (wie oft eine Anfrage zählt)" },
        ...NW_MODI.filter((m) => m.key !== "frage").map((m) => ({ name: "g_" + m.key, label: m.label, type: "number", third: true, placeholder: "1" })),
        { type: "section", label: "Kosten" },
        { name: "kosten_max", label: "Max. Kosten pro Anfrage (US-Dollar)", type: "number", half: true, placeholder: "z. B. 0,05 – leer = kein Limit",
          help: "Gilt für Handy und Arbeitsbereich. Wird es knapp, schlägt Nigel weniger nach, denkt kürzer und antwortet knapper; reicht es gar nicht, lehnt er die Anfrage ab, statt Geld auszugeben." },
        { name: "reasoning_max", label: "Höchste Gründlichkeit", type: "select", required: true, half: true,
          options: [{ value: "low", label: "Schnell" }, { value: "medium", label: "Gründlich" }, { value: "high", label: "Sehr gründlich" }],
          help: "Begrenzt die Kosten: Mitglieder können nicht gründlicher einstellen." },
        { name: "akten_werkzeuge", label: "Nigel darf Akten der Kanzlei durchsuchen (nur mit Leserecht)", type: "checkbox", half: true },
        { name: "anweisungen", label: "Hausregeln für Nigel", type: "textarea", rows: 6,
          placeholder: "z. B. „Schriftsätze immer mit ‚Sehr geehrte Damen und Herren‘ beginnen.“ oder „Bei Haftsachen immer auf die Frist für die Haftprüfung hinweisen.“",
          help: "Zusätzliche Anweisungen für alle Antworten (max. 4000 Zeichen). Sie ergänzen Nigels Regeln, heben sie aber nicht auf." },
      ],
      values: { modi: v.modi, reasoning_max: v.reasoning_max, kosten_max: v.kosten_max || "", akten_werkzeuge: v.akten_werkzeuge, anweisungen: v.anweisungen,
        ...Object.fromEntries(NW_MODI.filter((m) => m.key !== "frage").map((m) => ["g_" + m.key, nwGewicht(m.key)])) },
      onSubmit: async (w) => {
        const gewichte = Object.fromEntries(NW_MODI.filter((m) => m.key !== "frage").map((m) => [m.key, Math.max(1, Math.min(10, Math.round(Number(w["g_" + m.key]) || 1)))]));
        const kostenMax = Number(w.kosten_max) > 0 ? Math.min(100, Math.round(Number(w.kosten_max) * 10000) / 10000) : 0;
        const nigel = { kosten_max: kostenMax, modi: w.modi, reasoning_max: w.reasoning_max, akten_werkzeuge: w.akten_werkzeuge, anweisungen: String(w.anweisungen || "").slice(0, 4000), gewichte };
        await updateRow("einstellungen", 1, { daten: { ...((state.einstellungen[0] || {}).daten || {}), nigel } });
        toast("Vorgaben gespeichert");
      },
    });
  },
});

async function nwEinstellungSetzen(key, wert) {
  const p = ui.nigel.profil;
  if (String(p[key]) === String(wert)) return;
  p[key] = wert;
  if (key === "modus") {
    const chat = nwAktiverChat();
    if (chat && !chat.id && !nwVerlauf(chat).length) chat.modus = wert;
  }
  scheduleRender();
  const { error } = await db.from("ki_profil").upsert({ user_id: state.me.id, einstellungen: p });
  if (error) toast(errorText(error), "error");
}

Object.assign(CHANGES, {
  "nw-akte-hinzu": (el) => {
    const chat = nwAktiverChat();
    const id = el.value;
    el.value = "";
    if (!id || chat.akte_ids.includes(id) || chat.akte_ids.length >= 5) return;
    nwSpeichernLeise(chat, { akte_ids: [...chat.akte_ids, id] });
  },
  "nw-mit-entwurf": (el) => { ui.nigel.mitEntwurf[nwSchluessel(nwAktiverChat())] = el.checked; scheduleRender(); },
  "nw-einstellung-check": (el) => nwEinstellungSetzen(el.dataset.key, el.checked),
});

Object.assign(INPUTS, {
  "nw-suche": (el) => { ui.nigel.q = el.value; nwListeZeichnen(nwAktiverChat()); },
  "nw-text": () => nwTextHoehe(),
  "nw-notiz": (el) => nwSpaeter(nwAktiverChat(), "notiz", el.value),
  "nw-entwurf": (el) => nwSpaeter(nwAktiverChat(), "entwurf", el.value),
  "nw-para-suche": (el) => { ui.nigel.paraQ = el.value; nwKontextZeichnen(nwAktiverChat()); },
});

Object.assign(SUBMITS, {
  "nw-senden": (form) => nwSenden(form.elements.text.value),
  "nw-ueberarbeiten": (form) => {
    const anweisung = form.elements.anweisung.value.trim();
    if (!anweisung) return form.elements.anweisung.focus();
    form.elements.anweisung.value = "";
    nwSenden(`Überarbeite den Entwurf: ${anweisung}`, { modus: "ueberarbeiten" });
  },
});

// Mittlere Breite: Die Arbeitsfläche schwebt über dem Chat – ein Klick in den Chat schließt sie.
// (Aktionen, die sie brauchen, öffnen sie danach selbst wieder.)
document.addEventListener("click", (e) => {
  if (!ui.nigel.panel || window.innerWidth > 1250 || window.innerWidth <= 900 || parseRoute().page !== "nigel") return;
  if (!e.target.closest || !e.target.closest(".nw-haupt") || e.target.closest('[data-action="nw-panel"]')) return;
  ui.nigel.panel = false;
  scheduleRender();
}, true);

// Tasten im Eingabefeld: Enter bzw. Strg+Enter sendet (Einstellung)
document.addEventListener("keydown", (e) => {
  if (e.target.id === "nw-text" && e.key === "Enter" && !e.isComposing) {
    const strg = ui.nigel.profil.senden === "strg";
    if (strg ? (e.ctrlKey || e.metaKey) : !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      nwSenden(e.target.value);
    }
    return;
  }
  // Im Arbeitsbereich holt K nicht das Handy, sondern springt ins Eingabefeld
  if (e.key === "k" && parseRoute().page === "nigel" && state.loaded && !e.ctrlKey && !e.metaKey && !e.altKey
      && !e.target.closest("input, textarea, select, [contenteditable]") && !document.querySelector("dialog[open]")) {
    const feld = nwFeld("nw-text");
    if (feld) { e.preventDefault(); feld.focus(); }
  }
});

// Desktop-Hinweis, wenn Nigel im Hintergrund fertig wird (einmal fragen, beim ersten Senden)
document.addEventListener("submit", (e) => {
  if (e.target.closest && e.target.closest('form[data-submit="nw-senden"]') && "Notification" in window && Notification.permission === "default") {
    try { Notification.requestPermission(); } catch {}
  }
}, true);
