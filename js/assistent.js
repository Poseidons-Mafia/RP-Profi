// =============================================================
//  Wiwang Law – KI-Assistent
//  Ein faltbares iFruit-Smartphone, das zugeklappt unten rechts aus
//  der Ecke schaut. Antippen holt es heraus. Herausgeholt lässt es
//  sich auf- und zuklappen (3D-Faltung):
//    zugeklappt  – kompakter Chat auf dem Außendisplay
//    aufgeklappt – links Akte & Schnellaktionen, rechts der Chat
//  Die Seite dahinter bleibt bedienbar. Die KI läuft über die
//  Supabase Edge Function "ki-assistent" (Google Gemini).
//  Recht: "ki_assistent".
// =============================================================

const KI_SPEICHER = "wiwang-ki";
ui.assistent = { offen: false, modus: "auf", akteId: "", verlauf: [], laedt: false, info: null, userId: null };

// Zeiten der Animationen (müssen zu style.css passen)
const KI_ZEIT = { raus: 560, rein: 480, falten: 820 };
const kiMobil = window.matchMedia("(max-width: 700px)");

const KI_VORLAGEN = [
  { label: "Zusammenfassen", akte: true, text: "Fasse diese Akte kurz zusammen: Sachverhalt, Vorwürfe, Stand, offene Punkte." },
  { label: "Nächste Schritte", akte: true, text: "Welche nächsten Schritte und welche Verteidigungsstrategie empfiehlst du für diese Akte? Begründe kurz." },
  { label: "Strafrahmen", akte: true, text: "Berechne den Strafrahmen (Geldstrafe und Haft) für die Tatvorwürfe dieser Akte anhand des Gesetzbuchs." },
  { label: "Schriftsatz", akte: true, text: "Entwirf einen Schriftsatz an die Staatsanwaltschaft für diese Akte. Art des Schriftsatzes: ", ergaenzen: true },
  { label: "Paragraphen finden", akte: false, text: "Welche Paragraphen aus unserem Gesetzbuch passen auf folgenden Sachverhalt?\n", ergaenzen: true },
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
  status: '<svg viewBox="0 0 54 12" aria-hidden="true"><g fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0.5" width="3" height="11.5" rx="1"/><path d="M29 3.2a8.6 8.6 0 0 1 6 2.4l1.3-1.3a10.4 10.4 0 0 0-14.6 0L23 5.6a8.6 8.6 0 0 1 6-2.4zm0 3.5a5 5 0 0 1 3.5 1.4l1.3-1.3a6.8 6.8 0 0 0-9.6 0l1.3 1.3A5 5 0 0 1 29 6.7zm0 3.4-1.6 1.6L29 13.3l1.6-1.6z"/><rect x="40" y="1" width="12" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="41.8" y="2.8" width="8.4" height="6.4" rx="1.2"/><rect x="52.6" y="4.2" width="1.4" height="3.6" rx="0.7"/></g></svg>',
};

const KI_STATUS = (uhr = true, kamera = false) => `<div class="ki-statusbar">
  ${uhr ? '<span class="ki-uhr" data-ki="uhr"></span>' : "<span></span>"}
  ${kamera ? '<span class="ki-kamera"></span>' : ""}
  <span class="ki-status-icons">${KI_ICON.status}</span></div>`;

// ---------- Gerüst (einmal anlegen, danach nur Teile aktualisieren) ----------
// Aufbau: rechte Hälfte (fest) + Scharnier + Klappe (linke Hälfte, dreht sich ums Scharnier).
// Die Vorderseite der Klappe ist das linke Innendisplay, ihre Rückseite das Außendisplay.
const kiPhone = document.createElement("aside");
kiPhone.id = "ki-phone";
kiPhone.className = "ki-phone";
kiPhone.hidden = true;
kiPhone.setAttribute("aria-label", "KI-Assistent");
kiPhone.innerHTML = `
  <div class="ki-geraet">
    <div class="ki-haelfte ki-haelfte-rechts">
      <span class="ki-btn-side ki-btn-touch"></span><span class="ki-btn-side ki-btn-vol1"></span><span class="ki-btn-side ki-btn-vol2"></span>
      <div class="ki-screen ki-innen-rechts">
        ${KI_STATUS(false, true)}
        <div class="ki-slot" data-slot="chat-innen"></div>
        <div class="ki-home"></div>
        <div class="ki-schatten"></div>
        <div class="ki-aus"></div>
      </div>
    </div>
    <div class="ki-scharnier"><span class="ki-glanz"></span></div>
    <div class="ki-klappe">
      <div class="ki-seite ki-seite-innen ki-haelfte">
        <div class="ki-screen ki-innen-links">
          ${KI_STATUS(true, false)}
          <div class="ki-slot" data-slot="steuer-innen"></div>
          <div class="ki-aus"></div>
        </div>
      </div>
      <div class="ki-seite ki-seite-aussen ki-haelfte">
        <span class="ki-btn-side ki-btn-touch"></span><span class="ki-btn-side ki-btn-vol1"></span><span class="ki-btn-side ki-btn-vol2"></span>
        <div class="ki-screen ki-cover">
          ${KI_STATUS(true, true)}
          <div class="ki-slot" data-slot="steuer-cover"></div>
          <div class="ki-slot ki-slot-chat" data-slot="chat-cover"></div>
          <div class="ki-home"></div>
          <button type="button" class="ki-lock" aria-label="KI-Assistent öffnen (Taste K)">
            <span class="ki-lock-marke">${KI_ICON.ifruit}iFruit</span>
            <span class="ki-lock-datum" data-ki="datum"></span>
            <span class="ki-lock-uhr" data-ki="uhr"></span>
            <span class="ki-notification">
              <img src="assets/icon.png" alt="">
              <span><strong>KI-Assistent</strong><span data-ki="lock-text">Tippen, um zu chatten</span></span>
            </span>
          </button>
          <div class="ki-aus"></div>
        </div>
      </div>
    </div>
  </div>`;

// Die beiden beweglichen Bereiche: Steuerung (Kopf, Akte, Vorschläge) und Chat.
// Sie wandern beim Falten zwischen Innen- und Außendisplay hin und her.
const kiSteuer = document.createElement("div");
kiSteuer.className = "ki-steuer";
kiSteuer.innerHTML = `
  <header class="ki-head">
    <img class="ki-avatar" src="assets/icon.png" alt="">
    <div class="ki-head-text">
      <strong>KI-Assistent</strong>
      <span data-ki="untertitel"></span>
    </div>
    <div class="ki-head-btns">
      <button type="button" class="ki-icon-btn ki-klapp-btn" data-action="ki-klappen" title="Aufklappen" aria-label="Aufklappen">${KI_ICON.aufklappen}</button>
      <button type="button" class="ki-icon-btn" data-action="ki-neu" title="Neuer Chat" aria-label="Neuer Chat">${KI_ICON.neu}</button>
      <button type="button" class="ki-icon-btn" data-action="ki-schliessen" title="Einstecken (Esc)" aria-label="Einstecken">${KI_ICON.zu}</button>
    </div>
  </header>
  <div class="ki-kontext">
    ${KI_ICON.akte}
    <select data-change="ki-akte" aria-label="Akte als Kontext" data-ki="akten"></select>
  </div>
  <div class="ki-akte-karte" data-ki="akte-karte"></div>
  <p class="ki-label">Schnellaktionen</p>
  <div class="ki-chips" data-ki="chips"></div>
  <footer class="ki-links-fuss">
    <span data-ki="info"></span>
    <span class="ki-marke">${KI_ICON.ifruit}iFruit</span>
  </footer>`;

const kiChatBlock = document.createElement("div");
kiChatBlock.className = "ki-chatblock";
kiChatBlock.innerHTML = `
  <div class="ki-chat-kopf">
    <strong>Chat</strong>
    <button type="button" class="ki-icon-btn" data-action="ki-klappen" title="Zuklappen" aria-label="Zuklappen">${KI_ICON.zuklappen}</button>
    <button type="button" class="ki-icon-btn" data-action="ki-neu" title="Neuer Chat" aria-label="Neuer Chat">${KI_ICON.neu}</button>
    <button type="button" class="ki-icon-btn" data-action="ki-schliessen" title="Einstecken (Esc)" aria-label="Einstecken">${KI_ICON.zu}</button>
  </div>
  <div class="ki-chat" data-ki="chat" aria-live="polite"></div>
  <form class="ki-eingabe" data-submit="ki-frage">
    <textarea name="text" rows="1" placeholder="Nachricht" aria-label="Nachricht an den KI-Assistenten"></textarea>
    <button type="submit" class="ki-senden" aria-label="Senden">${KI_ICON.senden}</button>
  </form>`;

document.body.append(kiPhone);
const kiEl = (name) => kiPhone.querySelector(`[data-ki="${name}"]`);
const kiSlot = (name) => kiPhone.querySelector(`[data-slot="${name}"]`);
const kiTextarea = kiChatBlock.querySelector("textarea");

// Inhalte auf das passende Display legen
function kiLayout(modus) {
  const zu = modus !== "auf";
  const chat = kiChatBlock.querySelector(".ki-chat");
  const unten = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 40;
  const fokus = document.activeElement === kiTextarea;
  kiSlot(zu ? "steuer-cover" : "steuer-innen").append(kiSteuer);
  kiSlot(zu ? "chat-cover" : "chat-innen").append(kiChatBlock);
  kiPhone.dataset.layout = zu ? "zu" : "auf";
  const btn = kiSteuer.querySelector(".ki-klapp-btn");
  btn.title = btn.ariaLabel = "Aufklappen";
  if (unten) chat.scrollTop = chat.scrollHeight;
  if (fokus) kiTextarea.focus({ preventScroll: true });
}
kiLayout("zu");

// ---------- Chat merken (nur in diesem Tab, bis er geschlossen wird) ----------
function kiSpeichern() {
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
  kiZustandSofort();
}

// ---------- Einfache Formatierung der KI-Antworten (sicher, ohne fremdes HTML) ----------
function kiFormat(text) {
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

function kiZeit(iso) {
  return iso ? new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "";
}

// Akte der aktuell geöffneten Seite (#/akten/<id>)
function kiSeitenAkte() {
  const r = parseRoute();
  return r.page === "akten" && r.id && byId("akten", r.id) ? r.id : "";
}

// ---------- Aktualisieren (wird bei jedem Neuzeichnen aufgerufen) ----------
function kiAktualisieren() {
  const sichtbar = state.loaded && !!state.me && darf("ki_assistent");
  kiPhone.hidden = !sichtbar;
  document.body.classList.toggle("ki-da", sichtbar);
  if (!sichtbar) return;
  const s = ui.assistent;
  if (s.userId !== state.me.id) kiLaden(state.me.id);

  // Ohne laufenden Chat folgt der Kontext der geöffneten Akte
  const seitenAkte = kiSeitenAkte();
  if (!s.verlauf.length && !s.laedt && seitenAkte && seitenAkte !== s.akteId) s.akteId = seitenAkte;
  if (s.akteId && !byId("akten", s.akteId)) s.akteId = "";
  const akte = s.akteId ? byId("akten", s.akteId) : null;

  kiUhr();
  kiEl("untertitel").textContent = s.laedt ? "schreibt …" : akte ? `${akte.number} · ${akte.title || ""}` : "Gesetzbuch & Kanzlei";
  kiEl("lock-text").textContent = s.verlauf.length
    ? truncate(s.verlauf[s.verlauf.length - 1].text.replace(/[*#`]/g, "").replace(/\s+/g, " ").trim(), 70)
    : akte ? `Fragen zu ${akte.number}? Tippen, um zu chatten` : "Tippen, um zu chatten";

  // Aktenauswahl
  const akten = [...state.akten].sort((a, b) =>
    (a.status === "Geschlossen") - (b.status === "Geschlossen") || String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
  kiEl("akten").innerHTML = String(html`
    <option value="">Ohne Akte – allgemeine Fragen</option>
    ${akten.map((a) => html`<option value="${a.id}" ${a.id === s.akteId ? "selected" : ""}>${a.number} · ${truncate(a.title, 40)}${a.status === "Geschlossen" ? " (geschl.)" : ""}</option>`)}`);

  // Akte-Karte (nur aufgeklappt sichtbar)
  kiEl("akte-karte").innerHTML = String(akte ? html`
    <div class="ki-akte-nr">${akte.number}</div>
    <div class="ki-akte-titel">${akte.title || "–"}</div>
    <dl>
      <dt>Mandant</dt><dd>${mandantName(akte)}</dd>
      <dt>Status</dt><dd>${akte.status || "–"}${akte.in_haft ? html` · <span class="danger-text">in Haft</span>` : ""}</dd>
      <dt>Vorwürfe</dt><dd>${(akte.vorwuerfe || []).length || "keine"}</dd>
    </dl>
    <a href="#/akten/${akte.id}">Akte öffnen</a>`
    : html`<p class="ki-akte-leer">Keine Akte gewählt. Der Assistent kennt dann euer Gesetzbuch und die Liste der offenen Akten.</p>`);
  kiEl("info").textContent = s.info ? `Heute ${s.info.heute}/${s.info.limit} Anfragen` : "";

  // Vorschläge
  const chips = [];
  if (seitenAkte && seitenAkte !== s.akteId) {
    const a = byId("akten", seitenAkte);
    chips.push(html`<button type="button" class="ki-chip gold" data-action="ki-akte-setzen" data-id="${a.id}">${a.number} verwenden</button>`);
  }
  KI_VORLAGEN.forEach((v, i) => {
    if (!v.akte || akte) chips.push(html`<button type="button" class="ki-chip" data-action="ki-vorlage" data-i="${i}" ${s.laedt ? "disabled" : ""}>${v.label}</button>`);
  });
  kiEl("chips").innerHTML = String(html`${chips}`);

  kiChatZeichnen();
  kiChatBlock.querySelector(".ki-senden").disabled = s.laedt;
}

function kiChatZeichnen() {
  const s = ui.assistent;
  const chat = kiEl("chat");
  const amEnde = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 40;
  const darfVerlauf = s.akteId && darf("akten_schreiben");
  const leer = html`<div class="ki-leer">
    <img src="assets/icon.png" alt="">
    <p><strong>Hallo${myName() ? `, ${myName().split(" ")[0]}` : ""}!</strong></p>
    <p>Ich kenne euer Gesetzbuch und ${s.akteId ? "die gewählte Akte" : "eure offenen Akten"}. Frag mich etwas oder tippe auf einen Vorschlag.</p>
    <p class="ki-hinweis">Antworten sind Vorschläge. Bitte immer prüfen.</p>
  </div>`;
  chat.innerHTML = String(html`
    ${s.verlauf.length ? "" : leer}
    ${s.verlauf.map((n, i) => n.rolle === "nutzer"
      ? html`<div class="ki-msg ich"><div class="ki-bubble">${multiline(n.text)}</div><time>${kiZeit(n.zeit)}</time></div>`
      : html`<div class="ki-msg ki">
          <div class="ki-bubble">${new SafeHtml(kiFormat(n.text))}</div>
          <div class="ki-msg-aktionen">
            <time>${kiZeit(n.zeit)}</time>
            <button type="button" data-action="ki-kopieren" data-i="${i}" title="Kopieren">${new SafeHtml(KI_ICON.kopieren)}Kopieren</button>
            ${darfVerlauf ? html`<button type="button" data-action="ki-in-verlauf" data-i="${i}" title="In den Verlauf der Akte">${new SafeHtml(KI_ICON.akte)}In Akte</button>` : ""}
          </div>
        </div>`)}
    ${s.laedt ? html`<div class="ki-msg ki"><div class="ki-bubble ki-tippt"><span></span><span></span><span></span></div></div>` : ""}`);
  if (amEnde || s.laedt) chat.scrollTop = chat.scrollHeight;
}

function kiUhr() {
  const d = new Date();
  const uhr = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  kiPhone.querySelectorAll('[data-ki="uhr"]').forEach((el) => (el.textContent = uhr));
  kiEl("datum").textContent = d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
}
setInterval(() => { if (!kiPhone.hidden) kiUhr(); }, 20000);

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

// Falten: die Klappe dreht sich ums Scharnier. Bei 90° (Kante zum Betrachter)
// wechseln die Inhalte das Display – genau dann sieht man keines der beiden.
async function kiFalten(auf, lauf) {
  if (kiPhone.classList.contains("auf") === auf) return;
  if (kiReduziert()) {
    kiPhone.classList.toggle("auf", auf);
    kiLayout(auf ? "auf" : "zu");
    return;
  }
  kiPhone.classList.add("faltet");
  kiEffekt(auf ? "fx-auf" : "fx-zu", KI_ZEIT.falten + 200);
  kiPhone.classList.toggle("auf", auf);
  await kiWarte(KI_ZEIT.falten * 0.46);
  if (lauf !== kiLauf) return;
  kiLayout(auf ? "auf" : "zu");
  await kiWarte(KI_ZEIT.falten * 0.54);
  if (lauf !== kiLauf) return;
  kiPhone.classList.remove("faltet");
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
  if (lauf !== kiLauf) return;
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
  if (!s.offen || !kiDarfAuf()) return;
  const lauf = ++kiLauf;
  s.modus = kiPhone.classList.contains("auf") ? "zu" : "auf";
  kiSpeichern();
  await kiFalten(s.modus === "auf", lauf);
}

// Wechsel zwischen Handy- und Desktopbreite: auf dem Handy immer zugeklappt
kiMobil.addEventListener("change", () => {
  kiLauf++;
  kiPhone.classList.remove("faltet");
  kiZustandSofort();
});

function kiTextareaHoehe() {
  kiTextarea.style.height = "auto";
  kiTextarea.style.height = Math.min(kiTextarea.scrollHeight, 120) + "px";
}

async function kiFragen(text) {
  const s = ui.assistent;
  text = String(text || "").trim();
  if (!text || s.laedt) return;
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
    s.verlauf.push({ rolle: "ki", text: data.antwort, zeit: new Date().toISOString() });
    s.info = { heute: data.heute, limit: data.limit, modell: data.modell };
  } catch (e) {
    console.error(e);
    s.verlauf.pop(); // Frage zurück ins Eingabefeld, damit nichts verloren geht
    if (!kiTextarea.value) kiTextarea.value = text;
    kiTextareaHoehe();
    toast(/Failed to send|fetch/i.test(e.message) ? "Der KI-Assistent ist nicht erreichbar." : e.message, "error");
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
  "ki-klappen": () => kiKlappen(),
  "ki-neu": () => {
    ui.assistent.verlauf = [];
    kiSpeichern();
    kiAktualisieren();
    kiTextarea.focus();
  },
  "ki-akte-setzen": (d) => {
    ui.assistent.akteId = d.id;
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
  "ki-kopieren": async (d) => {
    const n = ui.assistent.verlauf[Number(d.i)];
    if (n && await copyText(n.text)) toast("Kopiert");
  },
  "ki-in-verlauf": async (d) => {
    const n = ui.assistent.verlauf[Number(d.i)];
    if (!n || !ui.assistent.akteId) return;
    await attempt(() => insertRow("eintraege", { akte_id: ui.assistent.akteId, art: "Intern", text: `KI-Assistent:\n${n.text}` }),
      "Im Verlauf der Akte gespeichert");
  },
});
