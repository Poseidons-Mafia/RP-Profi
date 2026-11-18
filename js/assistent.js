// =============================================================
//  Wiwang Law – KI-Assistent „Nigel“ (britischer Butler & Jurist)
//  Ein faltbares iFruit-Smartphone, das zugeklappt unten rechts aus
//  der Ecke schaut. Antippen holt es heraus. Herausgeholt lässt es
//  sich auf- und zuklappen (3D-Faltung):
//    zugeklappt  – kompakter Chat auf dem Außendisplay
//    aufgeklappt – links Akte & Schnellaktionen, rechts der Chat
//  Die Seite dahinter bleibt bedienbar. Die KI läuft über die
//  Supabase Edge Function "ki-assistent" (ein festes Modell über OpenRouter) und beantwortet
//  ausschließlich Rechtsfragen. Dabei schlägt sie mit Werkzeugen in den
//  Gesetzen nach. Ihre Antwort kommt als Markdown und wird hier mit
//  Showdown in HTML umgewandelt (und mit DOMPurify bereinigt).
//  Rechte: "ki_assistent" (= Nigel verwenden) bzw. "ki_sehen" (= nur sehen): Wer Nigel nur
//  sehen darf, bekommt dasselbe Handy, aber gesperrt (kein Chat, nichts wird geladen).
//  Budget: US-Dollar pro Monat (Grundwert des Rangs + Abweichung) des Mitglieds
//  (Personal → Ränge & Berechtigungen); die Beträge sieht nur der Admin.
//  Für größere Aufgaben gibt es Nigels Arbeitsbereich (js/nigel.js, #/nigel);
//  das Handy bleibt das schnelle Nachschlage-Werkzeug.
// =============================================================

const KI_SPEICHER = "wiwang-ki";
ui.assistent = { offen: false, modus: "auf", akteId: "", verlauf: [], laedt: false, info: null, userId: null };

// Zeiten der Animationen (müssen zu style.css passen)
const KI_ZEIT = { raus: 560, rein: 480, falten: 720, glas: 300 };
const kiMobil = window.matchMedia("(max-width: 700px)");

const KI_VORLAGEN = [
  { label: "Rechtslage", akte: true, text: "Wie ist die Rechtslage in dieser Akte? Welche Paragraphen sind einschlägig, und welche rechtlichen Einwände gibt es?" },
  { label: "Vorwürfe prüfen", akte: true, text: "Prüfe die Tatvorwürfe dieser Akte am Wortlaut der Paragraphen: Sind die Tatbestände erfüllt? Was fehlt ggf.?" },
  { label: "Strafrahmen", akte: true, text: "Welcher Strafrahmen (Geldstrafe und Haft) droht für die Tatvorwürfe dieser Akte laut Strafkatalog?" },
  { label: "Paragraphen finden", akte: false, text: "Welche Paragraphen passen auf folgenden Sachverhalt?\n", ergaenzen: true },
  { label: "Paragraph erklären", akte: false, text: "Erkläre mir ", ergaenzen: true },
  { label: "Welche Gesetze?", akte: false, text: "Welche Gesetzbücher gibt es auf dem Server und wofür gelten sie?" },
];

const KI_ICON = {
  senden: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  zu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  neu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h8M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  aufklappen: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="8.5" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="13" y="5" width="8.5" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 12h3.5M6.8 10.2 8.6 12l-1.8 1.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" transform="rotate(180 6.75 12)"/></svg>',
  zuklappen: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="12" y="5" width="8.5" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 12h6M7.5 9.5 10 12l-2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  kopieren: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 15V6a2 2 0 0 1 2-2h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  akte: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5A1.5 1.5 0 0 1 5.5 5H10l2 2h6.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  // Eigenes Logo (Zitrusscheibe) für die fiktive Marke iFruit
  ifruit: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><circle cx="12" cy="12" r="7.6" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.9"/><g stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity="0.9"><path d="M12 5.2v13.6M6.1 8.6l11.8 6.8M6.1 15.4l11.8-6.8"/></g><circle cx="12" cy="12" r="1.3" fill="#fff"/></svg>',
  schloss: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2.6" fill="currentColor"/><path d="M7.8 10.5V7.6a4.2 4.2 0 0 1 8.4 0v2.9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="15.2" r="1.6" fill="#fff"/><path d="M12 15.6v2.4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>',
  status: '<svg viewBox="0 0 54 12" aria-hidden="true"><g fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0.5" width="3" height="11.5" rx="1"/><path d="M29 3.2a8.6 8.6 0 0 1 6 2.4l1.3-1.3a10.4 10.4 0 0 0-14.6 0L23 5.6a8.6 8.6 0 0 1 6-2.4zm0 3.5a5 5 0 0 1 3.5 1.4l1.3-1.3a6.8 6.8 0 0 0-9.6 0l1.3 1.3A5 5 0 0 1 29 6.7zm0 3.4-1.6 1.6L29 13.3l1.6-1.6z"/><rect x="40" y="1" width="12" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="41.8" y="2.8" width="8.4" height="6.4" rx="1.2"/><rect x="52.6" y="4.2" width="1.4" height="3.6" rx="0.7"/></g></svg>',
};

const KI_STATUS = (uhr = true, kamera = false) => `<div class="ki-statusbar">
  ${uhr ? '<span class="ki-uhr" data-ki="uhr"></span>' : "<span></span>"}
  ${kamera ? '<span class="ki-kamera"></span>' : ""}
  <span class="ki-status-icons">${KI_ICON.status}</span></div>`;

// ---------- Gerüst (einmal anlegen, danach nur Teile aktualisieren) ----------
// Aufbau: rechte Hälfte (fest) + Scharnier + Klappe (linke Hälfte, dreht sich ums Scharnier).
// Die Vorderseite der Klappe ist das linke Innendisplay (Kontext), ihre Rückseite das Außendisplay.
// Der Chat-Bildschirm ist außen und rechts innen pixelgleich und wandert beim Falten mit.
const kiPhone = document.createElement("aside");
kiPhone.id = "ki-phone";
kiPhone.className = "ki-phone";
kiPhone.hidden = true;
kiPhone.setAttribute("aria-label", "Nigel, der KI-Butler");
kiPhone.innerHTML = `
  <div class="ki-geraet">
    <div class="ki-haelfte ki-haelfte-rechts">
      <span class="ki-btn-side ki-btn-touch"></span><span class="ki-btn-side ki-btn-vol1"></span><span class="ki-btn-side ki-btn-vol2"></span>
      <span class="ki-naht"></span>
      <div class="ki-screen ki-innen-rechts">
        ${KI_STATUS(true, true)}
        <div class="ki-slot" data-slot="chat-innen"></div>
        <div class="ki-home"></div>
      </div>
    </div>
    <div class="ki-scharnier"><span class="ki-glanz"></span></div>
    <div class="ki-klappe">
      <div class="ki-seite ki-seite-innen ki-haelfte">
        <div class="ki-screen ki-innen-links">
          ${KI_STATUS(true, false)}
          <div class="ki-panel" data-ki="panel"></div>
        </div>
      </div>
      <div class="ki-seite ki-seite-aussen ki-haelfte">
        <div class="ki-screen ki-cover">
          ${KI_STATUS(true, true)}
          <div class="ki-slot" data-slot="chat-cover"></div>
          <div class="ki-home"></div>
          <button type="button" class="ki-lock" aria-label="Nigel rufen (Taste K)">
            <span class="ki-lock-marke">${KI_ICON.ifruit}iFruit</span>
            <span class="ki-lock-datum" data-ki="datum"></span>
            <span class="ki-lock-uhr" data-ki="uhr"></span>
            <span class="ki-notification">
              <img src="assets/nigel.svg" alt="">
              <span><strong>Nigel</strong><span data-ki="lock-text">Sie haben geläutet?</span></span>
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>`;

// Der Chat-Bildschirm (wandert zwischen Außendisplay und rechtem Innendisplay)
const kiChatBlock = document.createElement("div");
kiChatBlock.className = "ki-chatblock";
kiChatBlock.innerHTML = `
  <header class="ki-appbar">
    <img class="ki-avatar" src="assets/nigel.svg" alt="Nigel">
    <div class="ki-appbar-text">
      <strong>Nigel <span class="ki-online" data-ki="status">zu Diensten</span></strong>
      <label class="ki-pill" title="Akte als Kontext wählen">
        ${KI_ICON.akte}<span data-ki="pill"></span><svg class="ki-pfeil" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <select data-change="ki-akte" data-ki="akten" aria-label="Akte als Kontext"></select>
      </label>
    </div>
    <div class="ki-appbar-btns">
      <button type="button" class="ki-icon-btn ki-klapp-btn" data-action="ki-klappen" data-ki="klapp-btn">${KI_ICON.aufklappen}</button>
      <button type="button" class="ki-icon-btn" data-action="ki-neu" title="Neuer Chat" aria-label="Neuer Chat">${KI_ICON.neu}</button>
      <button type="button" class="ki-icon-btn" data-action="ki-schliessen" title="Einstecken (Esc)" aria-label="Einstecken">${KI_ICON.zu}</button>
    </div>
  </header>
  <div class="ki-chat" data-ki="chat" aria-live="polite"></div>
  <div class="ki-unten">
    <div class="ki-chips" data-ki="chips"></div>
    <form class="ki-eingabe" data-submit="ki-frage">
      <textarea name="text" rows="1" placeholder="Ihre Rechtsfrage an Nigel …" aria-label="Nachricht an Nigel"></textarea>
      <button type="submit" class="ki-senden" aria-label="Senden">${KI_ICON.senden}</button>
    </form>
  </div>`;

document.body.append(kiPhone);
const kiEl = (name) => kiPhone.querySelector(`[data-ki="${name}"]`);
const kiSlot = (name) => kiPhone.querySelector(`[data-slot="${name}"]`);
const kiTextarea = kiChatBlock.querySelector("textarea");
// Einblend-Animation nur einmal: danach Markierung entfernen, sonst spielt sie beim
// Verschieben zwischen den Displays erneut ab (Ruckeln)
kiChatBlock.addEventListener("animationend", (e) => {
  if (e.target.classList.contains("neu")) e.target.classList.remove("neu");
});

// Chat-Bildschirm auf das passende Display legen
function kiLayout(modus) {
  const zu = modus !== "auf";
  const chat = kiChatBlock.querySelector(".ki-chat");
  const unten = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 40;
  const scroll = chat.scrollTop;
  const fokus = document.activeElement === kiTextarea;
  kiSlot(zu ? "chat-cover" : "chat-innen").append(kiChatBlock);
  kiPhone.dataset.layout = zu ? "zu" : "auf";
  const btn = kiEl("klapp-btn");
  btn.innerHTML = zu ? KI_ICON.aufklappen : KI_ICON.zuklappen;
  btn.title = zu ? "Aufklappen" : "Zuklappen";
  btn.setAttribute("aria-label", btn.title);
  chat.scrollTop = unten ? chat.scrollHeight : scroll;
  if (fokus) kiTextarea.focus({ preventScroll: true });
}
kiLayout("zu");

// ---------- Chat merken (nur in diesem Tab, bis er geschlossen wird) ----------
function kiSpeichern() {
  if (kiGesperrt()) return; // gesperrt gibt es keinen Chat – den gespeicherten nicht überschreiben
  const s = ui.assistent;
  try { sessionStorage.setItem(KI_SPEICHER, JSON.stringify({ userId: s.userId, akteId: s.akteId, verlauf: s.verlauf, offen: s.offen, modus: s.modus })); } catch {}
}
function kiLaden(userId) {
  const s = ui.assistent;
  Object.assign(s, { userId, akteId: "", verlauf: [], offen: false, modus: "auf", info: null, laedt: false });
  try {
    const d = JSON.parse(sessionStorage.getItem(KI_SPEICHER) || "null");
    if (d && d.userId === userId) {
      Object.assign(s, { akteId: d.akteId || "", verlauf: d.verlauf || [], offen: !!d.offen, modus: d.modus === "zu" ? "zu" : "auf" });
    }
  } catch {}
  kiGezeigt = s.verlauf.length; // gespeicherte Nachrichten nicht einploppen lassen
  kiZustandSofort();
  kiInfoLaden(userId);
}

// Verbrauch und Budget im laufenden Monat (eigenes und das der Kanzlei) anzeigen
async function kiInfoLaden(userId) {
  try {
    const { data, error } = await db.rpc("ki_budget_status");
    if (error || ui.assistent.userId !== userId) return;
    ui.assistent.info = { ...(ui.assistent.info || {}), budget: kiBudgetStand(data) };
    // Kontingent-Anzeige (Prozent/Dollar) aus Nigels Einstellungen – nur für den Admin wählbar
    if (state.isAdmin && !ui.nigel.geladen) {
      const { data: profil } = await db.from("ki_profil").select("einstellungen").eq("user_id", userId).maybeSingle();
      if (profil && profil.einstellungen && !ui.nigel.geladen) Object.assign(ui.nigel.profil, profil.einstellungen);
    }
    kiAktualisieren();
  } catch (e) {
    console.warn(e);
  }
}

// Frage vorbereiten (z. B. „KI fragen“ an einem Paragraphen): Handy holen, Text ins Eingabefeld
function kiFrageVorbereiten(text) {
  kiOeffnen();
  kiTextarea.value = text;
  kiTextareaHoehe();
  setTimeout(() => {
    kiTextarea.focus({ preventScroll: true });
    kiTextarea.setSelectionRange(text.length, text.length);
  }, 50);
}

// ---------- KI-Antworten: Markdown → HTML (Showdown), danach bereinigt (DOMPurify) ----------
const kiMarkdown = window.showdown ? new window.showdown.Converter({
  tables: true, strikethrough: true, simpleLineBreaks: true, simplifiedAutoLink: true, excludeTrailingPunctuationFromURLs: true,
  literalMidWordUnderscores: true, noHeaderId: true, ghCodeBlocks: true, openLinksInNewWindow: true, emoji: false,
  disableForced4SpacesIndentedSublists: true, ghCompatibleHeaderId: false,
}) : null;
if (window.DOMPurify) {
  // Links aus Antworten immer in neuem Tab und ohne Zugriff auf diese Seite
  window.DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") { node.setAttribute("target", "_blank"); node.setAttribute("rel", "noopener noreferrer"); }
  });
}

function kiFormat(text) {
  if (kiMarkdown && window.DOMPurify) {
    const roh = kiMarkdown.makeHtml(String(text || ""));
    const sauber = window.DOMPurify.sanitize(roh, {
      ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "del", "s", "code", "pre", "blockquote", "ul", "ol", "li",
        "h1", "h2", "h3", "h4", "h5", "h6", "hr", "table", "thead", "tbody", "tr", "th", "td", "a"],
      ALLOWED_ATTR: ["href", "target", "rel", "align", "start"],
      ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#)/i,
    });
    // breite Tabellen im Handy-Display seitlich scrollbar machen
    return sauber.replace(/<table>/g, '<div class="ki-tabelle"><table>').replace(/<\/table>/g, "</table></div>");
  }
  return kiFormatEinfach(text);
}

// Notlösung, falls Showdown/DOMPurify nicht geladen werden konnten (sicher, ohne fremdes HTML)
function kiFormatEinfach(text) {
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  const out = [];
  let liste = null;
  const schliessen = () => { if (liste) { out.push(`<${liste.tag}>${liste.items.join("")}</${liste.tag}>`); liste = null; } };
  for (const zeile of String(text).split("\n")) {
    const ul = zeile.match(/^\s*[-*•]\s+(.*)$/);
    const ol = zeile.match(/^\s*\d+[.)]\s+(.*)$/);
    const h = zeile.match(/^\s*#{1,6}\s+(.*)$/);
    if (ul || ol) {
      const tag = ul ? "ul" : "ol";
      if (!liste || liste.tag !== tag) { schliessen(); liste = { tag, items: [] }; }
      liste.items.push(`<li>${inline((ul || ol)[1])}</li>`);
      continue;
    }
    schliessen();
    if (h) out.push(`<p class="ki-h">${inline(h[1])}</p>`);
    else if (zeile.trim()) out.push(`<p>${inline(zeile)}</p>`);
  }
  schliessen();
  return out.join("");
}

// „Guten Morgen“ / „Guten Tag“ / „Guten Abend“ – wie es sich für einen Butler gehört
function kiTagesgruss() {
  const h = new Date().getHours();
  return h < 5 ? "Guten Abend" : h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
}

function kiZeit(iso) {
  return iso ? new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "";
}

// Akte der aktuell geöffneten Seite (#/akten/<id>)
function kiSeitenAkte() {
  const r = parseRoute();
  return r.page === "akten" && r.id && byId("akten", r.id) ? r.id : "";
}

function kiOffeneAkten() {
  return [...state.akten].sort((a, b) =>
    (a.status === "Geschlossen") - (b.status === "Geschlossen") || String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
}

// Nur neu geänderte Teile ins DOM schreiben (verhindert Flackern und erneutes Einploppen)
function kiSetzen(el, inhalt) {
  const h = String(inhalt);
  if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; }
}

// ---------- Aktualisieren (wird bei jedem Neuzeichnen aufgerufen) ----------
function kiAktualisieren() {
  // Im Arbeitsbereich (#/nigel) ist das Handy überflüssig und bleibt eingesteckt verborgen
  const sichtbar = state.loaded && !!state.me && darf("ki_sehen") && parseRoute().page !== "nigel";
  kiPhone.hidden = !sichtbar;
  document.body.classList.toggle("ki-da", sichtbar);
  if (!sichtbar) return;
  const s = ui.assistent;
  // Nur „Sehen“: gleiches Handy wie sonst, aber gesperrt (kein Chat, nichts wird geladen)
  const gesperrt = !darf("ki_assistent");
  if (kiGesperrt() !== gesperrt) {
    kiPhone.classList.toggle("gesperrt", gesperrt);
    s.userId = null; // Zustand passend neu herstellen
  }
  if (gesperrt) {
    if (s.userId !== state.me.id) {
      Object.assign(s, { userId: state.me.id, akteId: "", verlauf: [], offen: false, modus: "auf", info: null, laedt: false });
      kiZustandSofort();
    }
    kiGesperrtZeichnen();
    return;
  }
  kiTextarea.disabled = false;
  kiTextarea.placeholder = `Ihre Rechtsfrage an Nigel${anredeKomma()} …`;
  if (s.userId !== state.me.id) kiLaden(state.me.id);

  // Ohne laufenden Chat folgt der Kontext der geöffneten Akte
  const seitenAkte = kiSeitenAkte();
  if (!s.verlauf.length && !s.laedt && seitenAkte && seitenAkte !== s.akteId) s.akteId = seitenAkte;
  if (s.akteId && !byId("akten", s.akteId)) s.akteId = "";
  const akte = s.akteId ? byId("akten", s.akteId) : null;

  kiUhr();
  const status = kiEl("status");
  status.textContent = s.laedt ? "schlägt nach …" : "zu Diensten";
  status.classList.toggle("tippt", s.laedt);
  kiEl("pill").textContent = akte ? `${akte.number} · ${akte.title || ""}` : "Allgemein – keine Akte";
  kiEl("lock-text").textContent = s.verlauf.length
    ? truncate(s.verlauf[s.verlauf.length - 1].text.replace(/[*#`]/g, "").replace(/\s+/g, " ").trim(), 70)
    : akte ? `Rechtsfragen zu ${akte.number}${anredeKomma()}? Tippen Sie, und ich bin zur Stelle.` : `Sie haben geläutet${anredeKomma()}? Tippen Sie, und ich bin zur Stelle.`;

  // Aktenauswahl (in der Kopfzeile)
  const akten = kiOffeneAkten();
  kiSetzen(kiEl("akten"), html`
    <option value="">Allgemein – keine Akte</option>
    ${akten.map((a) => html`<option value="${a.id}" ${a.id === s.akteId ? "selected" : ""}>${a.number} · ${truncate(a.title, 40)}${a.status === "Geschlossen" ? " (geschl.)" : ""}</option>`)}`);
  kiEl("akten").value = s.akteId;

  // Vorschläge über dem Eingabefeld
  const chips = [];
  if (seitenAkte && seitenAkte !== s.akteId) {
    const a = byId("akten", seitenAkte);
    chips.push(html`<button type="button" class="ki-chip gold" data-action="ki-akte-setzen" data-id="${a.id}">${a.number} verwenden</button>`);
  }
  KI_VORLAGEN.forEach((v, i) => {
    if (!v.akte || akte) chips.push(html`<button type="button" class="ki-chip" data-action="ki-vorlage" data-i="${i}" ${s.laedt ? "disabled" : ""}>${v.label}</button>`);
  });
  kiSetzen(kiEl("chips"), html`${chips}`);

  kiPanelZeichnen(akte, akten);
  kiChatZeichnen();
  kiChatBlock.querySelector(".ki-senden").disabled = s.laedt;
}

// Linkes Innendisplay: Kontext (Akte, Details, Nutzung)
function kiPanelZeichnen(akte, akten) {
  const s = ui.assistent;
  const vorwuerfe = akte ? (akte.vorwuerfe || []) : [];
  const zustaendig = akte && akte.zustaendig_id ? personName(akte.zustaendig_id) : "";
  const offene = akten.filter((a) => a.status !== "Geschlossen").slice(0, 5);
  kiSetzen(kiEl("panel"), html`
    <div class="ki-panel-kopf">
      <span class="ki-panel-titel">Nigels Notizbuch</span>
      <span class="ki-marke">${new SafeHtml(KI_ICON.ifruit)}iFruit</span>
    </div>
    ${akte ? html`
      <section class="ki-karte ki-akte">
        <div class="ki-akte-oben">
          <span class="ki-badge">${akte.number}</span>
          <span class="ki-status s-${norm(akte.status || "").replace(/\s+/g, "-")}">${akte.status || "–"}</span>
        </div>
        <h3>${akte.title || "–"}</h3>
        <dl>
          <dt>Mandant</dt><dd>${mandantName(akte)}</dd>
          ${zustaendig ? html`<dt>Zuständig</dt><dd>${zustaendig}</dd>` : ""}
          ${akte.in_haft ? html`<dt>Haft</dt><dd class="danger-text">in Haft${akte.haft_bis ? ` bis ${fmt.datum(akte.haft_bis)}` : ""}</dd>` : ""}
        </dl>
        ${vorwuerfe.length ? html`
          <p class="ki-mini-titel">Tatvorwürfe</p>
          <ul class="ki-vorwuerfe">
            ${vorwuerfe.slice(0, 4).map((v) => html`<li><span>${v.paragraph || "§"}</span>${v.anzahl > 1 ? `${v.anzahl}× ` : ""}${v.titel || ""}</li>`)}
            ${vorwuerfe.length > 4 ? html`<li class="mehr">+ ${vorwuerfe.length - 4} weitere</li>` : ""}
          </ul>` : html`<p class="ki-leise">Noch keine Tatvorwürfe erfasst.</p>`}
        <div class="ki-karte-aktionen">
          <a class="ki-knopf" href="#/akten/${akte.id}">Akte öffnen</a>
          <button type="button" class="ki-knopf leise" data-action="ki-akte-setzen" data-id="">Ohne Akte</button>
        </div>
      </section>` : html`
      <section class="ki-karte ki-allgemein">
        <h3>Allgemeine Rechtsfragen</h3>
        <p class="ki-leise">Nigel, Butler und Jurist, beantwortet Ihre Rechtsfragen und schlägt dafür selbst in den Gesetzen und im Strafkatalog nach. Für Rechtsfragen zu einem Fall wählen Sie eine Akte${anredeKomma()}:</p>
        ${offene.length ? html`<div class="ki-aktenliste">
          ${offene.map((a) => html`<button type="button" data-action="ki-akte-setzen" data-id="${a.id}"><span class="ki-badge">${a.number}</span><span class="t">${a.title || ""}</span></button>`)}
        </div>` : ""}
      </section>`}
    <section class="ki-karte ki-arbeitsbereich">
      <p class="ki-mini-titel" style="margin-top:0">Eine größere Aufgabe${anredeKomma()}?</p>
      <p class="ki-leise">Gutachten, Schriftsätze und Fallanalysen erledige ich im Arbeitsbereich – mit gespeicherten Chats, mehreren Akten und einem Entwurf.</p>
      <div class="ki-karte-aktionen">
        <button type="button" class="ki-knopf" data-action="ki-arbeitsbereich">${s.verlauf.length ? "Im Arbeitsbereich fortsetzen" : "Arbeitsbereich öffnen"}</button>
      </div>
    </section>
    <section class="ki-karte">
      <p class="ki-mini-titel" style="margin-top:0">Wie Sie Nigel bedienen${anredeKomma()}</p>
      <ul class="ki-tipps">
        <li><kbd>Enter</kbd>senden · <kbd>⇧</kbd>+<kbd>Enter</kbd>neue Zeile</li>
        <li><kbd>K</kbd>Nigel rufen · <kbd>Esc</kbd>entlassen</li>
        <li><kbd>2×</kbd>aufs Scharnier klicken: auf- und zuklappen</li>
      </ul>
    </section>
    <div class="ki-panel-fuss">
      ${kiBudgetHtml(s.info && s.info.budget, kiAnzeige("kontingent"))}
      <p class="ki-leise">${s.info && s.info.modell ? html`Modell: ${s.info.modell} · ` : ""}Nur Rechtsfragen · max. 4000 Zeichen · bitte prüfen.</p>
    </div>`);
}

// Wie viele Nachrichten schon angezeigt wurden (nur neue ploppen ein)
let kiGezeigt = 0;

function kiChatZeichnen() {
  const s = ui.assistent;
  const chat = kiEl("chat");
  const amEnde = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 40;
  const darfVerlauf = s.akteId && darf("akten_schreiben");
  const akte = s.akteId ? byId("akten", s.akteId) : null;
  const neuAb = Math.min(kiGezeigt, s.verlauf.length);
  const leer = html`<div class="ki-leer">
    <img src="assets/nigel.svg" alt="Nigel">
    <p class="ki-gruss">${kiTagesgruss()}${anredeKomma()}.</p>
    <p>Nigel, zu Ihren Diensten. Ich kläre Ihre Rechtsfragen zu den Gesetzen dieser Stadt – und, wenn Sie gestatten, ausschließlich diese.</p>
    <ul class="ki-weiss">
      <li>§ ${state.gesetzbuecher.length} ${state.gesetzbuecher.length === 1 ? "Gesetzbuch" : "Gesetzbücher"} · ${state.gesetze.length} Delikte</li>
      ${akte ? html`<li>${new SafeHtml(KI_ICON.akte)}Akte ${akte.number}</li>` : ""}
    </ul>
  </div>`;
  const inhalt = html`
    ${s.verlauf.length ? html`<div class="ki-tag">Heute</div>` : leer}
    ${s.verlauf.map((n, i) => n.rolle === "nutzer"
      ? html`<div class="ki-msg ich ${i >= neuAb ? "neu" : ""}"><div class="ki-bubble">${multiline(n.text)}</div><time>${kiZeit(n.zeit)}</time></div>`
      : html`<div class="ki-msg ki ${i >= neuAb ? "neu" : ""}">
          <div class="ki-bubble ki-md">${new SafeHtml(kiFormat(n.text))}</div>
          ${(n.quellen || []).length ? html`<div class="ki-quellen" title="Von der KI nachgeschlagen">
            <span>Nachgeschlagen:</span>${n.quellen.map((q) => html`<button type="button" class="ki-quelle" data-action="ki-quelle" data-q="${q}">${q}</button>`)}</div>` : ""}
          <div class="ki-msg-aktionen">
            <time>${kiZeit(n.zeit)}</time>
            <button type="button" data-action="ki-kopieren" data-i="${i}" title="Kopieren">${new SafeHtml(KI_ICON.kopieren)}Kopieren</button>
            ${darfVerlauf ? html`<button type="button" data-action="ki-in-verlauf" data-i="${i}" title="In den Verlauf der Akte">${new SafeHtml(KI_ICON.akte)}In Akte</button>` : ""}
          </div>
        </div>`)}
    ${s.laedt ? html`<div class="ki-msg ki neu"><div class="ki-bubble ki-tippt"><span></span><span></span><span></span></div></div>` : ""}`;
  kiSetzen(chat, inhalt);
  kiGezeigt = s.verlauf.length;
  if (amEnde || s.laedt) chat.scrollTop = chat.scrollHeight;
}

function kiUhr() {
  const d = new Date();
  const uhr = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  kiPhone.querySelectorAll('[data-ki="uhr"]').forEach((el) => { if (el.textContent !== uhr) el.textContent = uhr; });
  const datum = d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  kiPhone.querySelectorAll('[data-ki="datum"]').forEach((el) => { if (el.textContent !== datum) el.textContent = datum; });
}

// ---------- Sperrbildschirm (Recht „Nigel sehen“ ohne „Nigel verwenden“) ----------
function kiGesperrt() {
  return kiPhone.classList.contains("gesperrt");
}

// Gesperrt: dieselbe Oberfläche, nur ohne Chat – Aufklappen und Einstecken funktionieren wie immer
function kiGesperrtZeichnen() {
  kiUhr();
  const status = kiEl("status");
  status.textContent = "gesperrt";
  status.classList.remove("tippt");
  kiEl("lock-text").textContent = `Ich bedaure${anredeKomma()} – Ihr Rang gestattet es mir nicht, Ihnen zu Diensten zu sein.`;
  kiTextarea.value = "";
  kiTextarea.disabled = true;
  kiTextarea.placeholder = "Gesperrt – „Nigel verwenden“ ist nicht freigeschaltet";
  kiChatBlock.querySelector(".ki-senden").disabled = true;
  kiSetzen(kiEl("chips"), "");
  const schloss = new SafeHtml(KI_ICON.schloss);
  kiSetzen(kiEl("chat"), html`<div class="ki-leer ki-gesperrt-leer">
    <span class="ki-gesperrt-bild"><img src="assets/nigel.svg" alt="Nigel"><span class="ki-gesperrt-schloss">${schloss}</span></span>
    <p class="ki-gruss">Gesperrt</p>
    <p>Ich bedaure${anredeKomma()} – Ihr Rang gestattet es mir nicht, Ihnen zu Diensten zu sein.</p>
    <button type="button" class="ki-knopf" data-action="ki-ansehen">Arbeitsbereich ansehen</button>
  </div>`);
  const rang = rangName(myProfile());
  kiSetzen(kiEl("panel"), html`
    <div class="ki-panel-kopf">
      <span class="ki-panel-titel">Nigels Notizbuch</span>
      <span class="ki-marke">${new SafeHtml(KI_ICON.ifruit)}iFruit</span>
    </div>
    <section class="ki-karte">
      <h3>Gesperrt</h3>
      <p class="ki-leise">Nigel beantwortet Rechtsfragen und schlägt dafür in den Gesetzen nach. Für Ihren Rang${rang ? ` (${rang})` : ""} ist das Verwenden nicht freigeschaltet.</p>
    </section>
    <section class="ki-karte">
      <p class="ki-mini-titel" style="margin-top:0">Arbeitsbereich</p>
      <p class="ki-leise">Den Arbeitsbereich können Sie sich ansehen – Inhalte bleiben ausgeblendet.</p>
      <div class="ki-karte-aktionen"><button type="button" class="ki-knopf" data-action="ki-ansehen">Arbeitsbereich ansehen</button></div>
    </section>
    <div class="ki-panel-fuss"><p class="ki-leise">Freischalten kann der Admin unter Personal → Ränge & Berechtigungen.</p></div>`);
}

// =============================================================
//  Bewegung: herausholen, einstecken, auf- und zuklappen
//  Jede Bewegung bekommt eine Nummer; eine neue bricht die alte ab.
// =============================================================
let kiLauf = 0;
const kiWarte = (ms) => new Promise((r) => setTimeout(r, ms));
const kiReduziert = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const kiDarfAuf = () => !kiMobil.matches;

// Kurz eine Effekt-Klasse setzen (Animation neu starten)
function kiEffekt(klasse, ms) {
  kiPhone.classList.remove(klasse);
  void kiPhone.offsetWidth;
  kiPhone.classList.add(klasse);
  setTimeout(() => kiPhone.classList.remove(klasse), ms);
}

// Zustand ohne Animation herstellen (Seitenstart, Benutzerwechsel)
function kiZustandSofort() {
  const s = ui.assistent;
  const auf = s.offen && s.modus === "auf" && kiDarfAuf();
  kiPhone.classList.add("ohne-anim");
  kiPhone.classList.toggle("offen", s.offen);
  kiPhone.classList.toggle("auf", auf);
  kiLayout(auf ? "auf" : "zu");
  void kiPhone.offsetWidth;
  requestAnimationFrame(() => kiPhone.classList.remove("ohne-anim"));
}

// Standbild eines Displays (für nahtlose Übergänge beim Falten). Das Abbild ist reine
// Optik: ohne Aktionen, Namen oder Formularfunktionen, damit nichts doppelt reagiert.
function kiAbbild(screen) {
  const abbild = document.createElement("div");
  abbild.className = "ki-abbild";
  abbild.setAttribute("aria-hidden", "true");
  abbild.inert = true;
  for (const kind of screen.children) {
    if (kind.matches(".ki-abbild, .ki-lock")) continue;
    abbild.append(kind.cloneNode(true));
  }
  abbild.querySelectorAll("[data-ki], [data-slot], [data-action], [data-change], [data-submit], [name]").forEach((el) => {
    for (const a of ["data-ki", "data-slot", "data-action", "data-change", "data-submit", "name"]) el.removeAttribute(a);
  });
  screen.append(abbild);
  // Textfeld und Scrollpositionen übernehmen (kopiert cloneNode nicht mit)
  const echt = screen.querySelectorAll(":scope > :not(.ki-abbild) textarea, :scope > :not(.ki-abbild) .ki-chat, :scope > :not(.ki-abbild) .ki-chips");
  const kopie = abbild.querySelectorAll("textarea, .ki-chat, .ki-chips");
  echt.forEach((el, i) => {
    if (!kopie[i]) return;
    if (el.tagName === "TEXTAREA") { kopie[i].value = el.value; kopie[i].style.height = el.style.height; }
    kopie[i].scrollTop = el.scrollTop;
    kopie[i].scrollLeft = el.scrollLeft;
  });
}
function kiAbbilderWeg() {
  kiPhone.querySelectorAll(".ki-abbild").forEach((el) => el.remove());
}

// Falten wie beim echten Foldable – ohne schwarze Displays:
//  Aufklappen: Das Außendisplay wird zu Glas, man schaut hindurch auf den Chat des
//              Innendisplays, dann schwingt die Klappe mit dem linken Display auf.
//  Zuklappen:  Die Klappe schwingt über den weiterlaufenden Chat, danach blendet das
//              Außendisplay über ihm ein.
async function kiFalten(auf, lauf) {
  if (kiPhone.classList.contains("auf") === auf) return;
  kiAbbilderWeg();
  if (kiReduziert()) {
    kiPhone.classList.remove("glas", "faltet");
    kiPhone.classList.toggle("auf", auf);
    kiLayout(auf ? "auf" : "zu");
    return;
  }
  const fertig = () => { kiPhone.classList.remove("faltet", "glas"); kiAbbilderWeg(); };
  kiEffekt("fx-falten", KI_ZEIT.falten + 200);

  if (auf) {
    kiAbbild(kiPhone.querySelector(".ki-cover"));   // Außendisplay einfrieren …
    kiLayout("auf");                                 // … echte Inhalte liegen schon innen bereit
    kiPhone.classList.add("faltet");
    void kiPhone.offsetWidth;
    kiPhone.classList.add("glas");                   // Außendisplay wird durchsichtig
    await kiWarte(KI_ZEIT.glas * 0.45);
    if (lauf !== kiLauf) return;
    kiPhone.classList.add("auf");                    // Klappe schwingt auf
    await kiWarte(KI_ZEIT.falten);
    if (lauf !== kiLauf) return;
    fertig();
  } else {
    kiPhone.classList.add("faltet", "glas");         // Außendisplay (noch auf der Rückseite) durchsichtig
    void kiPhone.offsetWidth;
    kiPhone.classList.remove("auf");                 // Klappe schwingt zu
    await kiWarte(KI_ZEIT.falten);
    if (lauf !== kiLauf) return;
    kiAbbild(kiPhone.querySelector(".ki-innen-rechts")); // Chat innen einfrieren …
    kiLayout("zu");                                  // … echte Inhalte aufs Außendisplay
    kiPhone.classList.remove("glas");                // Außendisplay blendet über dem Chat ein
    await kiWarte(KI_ZEIT.glas + 40);
    if (lauf !== kiLauf) return;
    fertig();
  }
}

async function kiOeffnen(akteId) {
  const s = ui.assistent;
  const lauf = ++kiLauf;
  if (akteId && akteId !== s.akteId) {
    s.akteId = akteId;
    s.verlauf = []; // neue Akte → neuer Chat
  }
  const warSchonOffen = s.offen;
  s.offen = true;
  kiSpeichern();
  kiAktualisieren();
  if (!warSchonOffen) {
    kiPhone.classList.add("offen");
    kiEffekt("fx-raus", KI_ZEIT.raus + 100);
    await kiWarte(kiReduziert() ? 0 : KI_ZEIT.raus * 0.7);
    if (lauf !== kiLauf) return;
  }
  if (s.modus === "auf" && kiDarfAuf()) await kiFalten(true, lauf);
  if (lauf !== kiLauf || kiGesperrt()) return;
  kiTextarea.focus({ preventScroll: true });
}

async function kiSchliessen() {
  const s = ui.assistent;
  const lauf = ++kiLauf;
  s.offen = false;
  kiSpeichern();
  kiTextarea.blur();
  if (kiPhone.classList.contains("auf")) {
    await kiFalten(false, lauf); // erst zuklappen, dann einstecken
    if (lauf !== kiLauf) return;
    await kiWarte(kiReduziert() ? 0 : 120);
    if (lauf !== kiLauf) return;
  }
  kiPhone.classList.remove("offen");
  kiAktualisieren();
}

async function kiKlappen() {
  const s = ui.assistent;
  if (!s.offen || !kiDarfAuf() || kiPhone.classList.contains("faltet")) return;
  const lauf = ++kiLauf;
  s.modus = kiPhone.classList.contains("auf") ? "zu" : "auf";
  kiSpeichern();
  await kiFalten(s.modus === "auf", lauf);
}

// Wechsel zwischen Handy- und Desktopbreite: auf dem Handy immer zugeklappt
kiMobil.addEventListener("change", () => {
  kiLauf++;
  kiPhone.classList.remove("faltet", "glas");
  kiAbbilderWeg();
  kiZustandSofort();
});

function kiTextareaHoehe() {
  kiTextarea.style.height = "auto";
  kiTextarea.style.height = Math.min(kiTextarea.scrollHeight, 120) + "px";
}

async function kiFragen(text) {
  const s = ui.assistent;
  text = String(text || "").trim();
  if (!text || s.laedt || kiGesperrt()) return;
  s.verlauf.push({ rolle: "nutzer", text, zeit: new Date().toISOString() });
  s.laedt = true;
  kiTextarea.value = "";
  kiTextareaHoehe();
  kiSpeichern();
  kiAktualisieren();
  try {
    const { data, error } = await db.functions.invoke("ki-assistent", {
      body: { nachrichten: s.verlauf.map(({ rolle, text }) => ({ rolle, text })), akte_id: s.akteId || null },
    });
    if (error) {
      let msg = error.message;
      try { const j = await error.context.json(); if (j && j.fehler) msg = j.fehler; } catch {}
      throw new Error(msg);
    }
    s.verlauf.push({ rolle: "ki", text: data.antwort, zeit: new Date().toISOString(), quellen: data.nachgeschlagen || [], gekuerzt: !!data.gekuerzt });
    s.info = { ...(s.info || {}), budget: kiBudgetStand(data.budget) || (s.info && s.info.budget) || null, modell: data.modell };
  } catch (e) {
    console.error(e);
    s.verlauf.pop(); // Frage zurück ins Eingabefeld, damit nichts verloren geht
    if (!kiTextarea.value) kiTextarea.value = text;
    kiTextareaHoehe();
    toast(/Failed to send|fetch/i.test(e.message) ? `Verzeihung${anredeKomma()} – Nigel ist gerade nicht erreichbar.` : e.message, "error");
  } finally {
    s.laedt = false;
    kiSpeichern();
    kiAktualisieren();
  }
}

// ---------- Ereignisse ----------
// Eingesteckt: ein Klick irgendwo aufs Handy holt es heraus
kiPhone.addEventListener("click", (e) => {
  if (ui.assistent.offen) return;
  e.preventDefault();
  e.stopPropagation();
  kiOeffnen();
});
// Doppelklick aufs Scharnier klappt auf bzw. zu
kiPhone.querySelector(".ki-scharnier").addEventListener("dblclick", () => kiKlappen());

kiTextarea.addEventListener("input", kiTextareaHoehe);
kiTextarea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    kiFragen(kiTextarea.value);
  }
});
document.addEventListener("keydown", (e) => {
  if (kiPhone.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
  const imFeld = e.target.closest("input, textarea, select, [contenteditable]");
  if (e.key === "Escape" && ui.assistent.offen && !document.querySelector("dialog[open]")) {
    kiSchliessen();
  } else if (e.key === "k" && !ui.assistent.offen && !imFeld && !document.querySelector("dialog[open]")) {
    e.preventDefault();
    kiOeffnen();
  }
});

CHANGES["ki-akte"] = (el) => {
  const s = ui.assistent;
  if (el.value === s.akteId) return;
  s.akteId = el.value;
  s.verlauf = []; // neuer Kontext → neuer Chat
  kiSpeichern();
  kiAktualisieren();
};

SUBMITS["ki-frage"] = () => kiFragen(kiTextarea.value);

Object.assign(ACTIONS, {
  "ki-oeffnen": (d) => kiOeffnen(d.id),
  "ki-schliessen": () => kiSchliessen(),
  "ki-ansehen": async () => { await kiSchliessen(); go("nigel"); },
  "ki-klappen": () => kiKlappen(),
  "ki-neu": () => {
    ui.assistent.verlauf = [];
    kiSpeichern();
    kiAktualisieren();
    kiTextarea.focus();
  },
  "ki-akte-setzen": (d) => {
    if ((d.id || "") === ui.assistent.akteId) return;
    ui.assistent.akteId = d.id || "";
    ui.assistent.verlauf = [];
    kiSpeichern();
    kiAktualisieren();
  },
  "ki-vorlage": (d) => {
    const v = KI_VORLAGEN[Number(d.i)];
    if (!v) return;
    if (v.ergaenzen) {
      kiTextarea.value = v.text;
      kiTextareaHoehe();
      kiTextarea.focus();
      kiTextarea.setSelectionRange(v.text.length, v.text.length);
    } else kiFragen(v.text);
  },
  // Nachgeschlagenen Paragraphen ("§ 12 StGB") in den Gesetzen öffnen
  "ki-quelle": (d) => {
    const q = norm(d.q);
    const buch = [...state.gesetzbuecher].sort((a, b) => b.kuerzel.length - a.kuerzel.length)
      .find((b) => q.endsWith(" " + norm(b.kuerzel)));
    const nr = buch ? paragraphNorm(q.slice(0, q.length - norm(buch.kuerzel).length)) : "";
    const p = buch && state.paragraphen.find((x) => x.gesetzbuch_id === buch.id && paragraphNorm(x.nummer) === nr);
    if (p) go(`gesetze/${buch.id}/${p.id}`);
    else if (buch) go(`gesetze/${buch.id}`);
  },
  "ki-kopieren": async (d) => {
    const n = ui.assistent.verlauf[Number(d.i)];
    if (n && await copyText(n.text)) toast("Kopiert");
  },
  "ki-in-verlauf": async (d) => {
    const n = ui.assistent.verlauf[Number(d.i)];
    if (!n || !ui.assistent.akteId) return;
    await attempt(() => insertRow("eintraege", { akte_id: ui.assistent.akteId, art: "Intern", text: `Nigel (KI-Butler) – rechtliche Einschätzung:\n${n.text}` }),
      "Im Verlauf der Akte gespeichert");
  },
});
