// =============================================================
//  Wiwang Law – Steuerung
//  Anmeldung, Seiten (über die Adresse #/akten/…), Neuzeichnen,
//  Klick-Aktionen und Tastenkürzel.
// =============================================================

// Zustand der Oberfläche (Filter, Entwürfe, …) – nur im Browser
const ui = {
  akten: { q: "", status: "aktiv", typ: "", sort: "aktiv", meine: false },
  pinnwand: { archiv: false },
  mandanten: { q: "", markierung: "" },
  kalender: { modus: "agenda", monat: ymd(new Date()).slice(0, 7), vergangene: false, meine: false },
  rechnungen: { status: "Offen", q: "" },
  gesetze: { q: "", kategorie: "", auswahl: {} },
  globalQ: "",
  drafts: {},
  historie: {},     // Änderungsprotokoll je Akte (nachgeladen)
  adminUsers: null, // Login-Infos für den Admin
};

// Klick-, Änderungs-, Eingabe- und Formular-Aktionen (von den Seiten befüllt)
const ACTIONS = {};
const CHANGES = {};
const INPUTS = {};
const SUBMITS = {};
// Wird nach jedem Neuzeichnen aufgerufen (z. B. Glocke, Online-Anzeige)
const RENDER_HOOKS = [];

// Seiten (von den Seiten-Dateien befüllt)
const VIEWS = {};
const NAV = [
  { page: "uebersicht", label: "Übersicht", href: "#/" },
  { page: "akten", label: "Akten", href: "#/akten" },
  { page: "mandanten", label: "Mandanten", href: "#/mandanten" },
  { page: "kalender", label: "Kalender", href: "#/kalender" },
  { page: "pinnwand", label: "Pinnwand", href: "#/pinnwand" },
  { page: "rechnungen", label: "Rechnungen", href: "#/rechnungen" },
  { page: "buchhaltung", label: "Buchhaltung", href: "#/buchhaltung" },
  { page: "gesetze", label: "Gesetze", href: "#/gesetze" },
  { page: "gesetzbuch", label: "Strafkatalog", href: "#/gesetzbuch" },
  { page: "nigel", label: "Nigel", href: "#/nigel" },
  { page: "team", label: "Personal", href: "#/team" },
];

// ---------- Rechte für Seiten und Aktionen ----------
// Was hier fehlt, darf jedes Mitglied. Die Datenbank prüft zusätzlich selbst.
const SEITEN_RECHTE = {
  akten: "akten_lesen", mandanten: "mandanten_lesen", kalender: "termine_lesen",
  rechnungen: "rechnungen_lesen", buchhaltung: "buchhaltung_lesen", gesetzbuch: "gesetzbuch_lesen", gesetze: "gesetzbuch_lesen",
  nigel: "ki_assistent",
};
const AKTIONS_RECHTE = {
  "akte-neu": "akten_schreiben", "akte-bearbeiten": "akten_schreiben", "akte-abschluss": "akten_schreiben",
  "haft-ende": "akten_schreiben", "vorwurf-hinzufuegen": "akten_schreiben", "vorwurf-anzahl": "akten_schreiben",
  "vorwurf-entfernen": "akten_schreiben", "eintrag-bearbeiten": "akten_schreiben", "eintrag-loeschen": "akten_schreiben",
  "beteiligter-neu": "akten_schreiben", "beteiligter-bearbeiten": "akten_schreiben", "beweis-neu": "akten_schreiben",
  "beweis-bearbeiten": "akten_schreiben", "auswahl-in-akte": "akten_schreiben", "akte-loeschen": "akten_loeschen",
  "mandant-neu": "mandanten_schreiben", "mandant-bearbeiten": "mandanten_schreiben",
  "termin-neu": "termine_schreiben", "termin-bearbeiten": "termine_schreiben", "aufgabe-bearbeiten": "termine_schreiben",
  "rechnung-neu": "rechnungen_schreiben", "rechnung-bearbeiten": "rechnungen_schreiben", "rechnung-bezahlt": "rechnungen_schreiben",
  "gebuehr-neu": "gesetzbuch_schreiben", "gebuehr-bearbeiten": "gesetzbuch_schreiben", "gesetz-neu": "gesetzbuch_schreiben",
  "gesetz-bearbeiten": "gesetzbuch_schreiben", "gesetze-import": "gesetzbuch_schreiben",
  "gesetzbuch-neu": "gesetzbuch_schreiben", "gesetzbuch-bearbeiten": "gesetzbuch_schreiben", "paragraph-neu": "gesetzbuch_schreiben",
  "paragraph-bearbeiten": "gesetzbuch_schreiben", "paragraphen-import": "gesetzbuch_schreiben", "gb-ki": "ki_assistent",
  "ki-nutzung-neu": "admin",
  "buchung-neu": "buchhaltung_schreiben", "buchung-storno": "buchhaltung_schreiben",
  "konto-neu": "buchhaltung_schreiben", "konto-bearbeiten": "buchhaltung_schreiben",
  "nutzer-neu": "personal_schreiben", "nutzer-passwort": "personal_schreiben", "nutzer-sperren": "personal_schreiben",
  "personalakte-bearbeiten": "personal_schreiben", "vermerk-neu": "personal_schreiben", "vermerk-loeschen": "personal_schreiben",
  "einstellungen-bearbeiten": "einstellungen_schreiben",
  "ki-oeffnen": "ki_assistent", "ki-klappen": "ki_assistent", "ki-neu": "ki_assistent", "ki-vorlage": "ki_assistent", "ki-akte-setzen": "ki_assistent",
  "ki-in-verlauf": "akten_schreiben", "ki-arbeitsbereich": "ki_assistent", "nw-mit-akte": "ki_assistent",
  "nw-in-akte": "akten_schreiben", "nw-entwurf-in-akte": "akten_schreiben", "nw-aufgaben": "termine_schreiben",
  "nw-vorgaben": "einstellungen_schreiben",
  "rang-neu": "admin", "rang-bearbeiten": "admin", "rang-sort": "admin", "nutzer-loeschen": "admin",
  "ablauf-starten": "termine_schreiben", "wiedervorlage": "termine_schreiben",
  "ablauf-neu": "einstellungen_schreiben", "ablauf-bearbeiten": "einstellungen_schreiben",
  "konten-laden": "admin", "konto-freigeben": "admin", "konto-ablehnen": "admin", "konto-person": "admin", "konto-charakter": "admin",
  "zugang-freigeben": "mandanten_schreiben", "zugang-aktion": "mandanten_schreiben", "zugang-verknuepfen": "mandanten_schreiben",
  "mitmandant-neu": "akten_schreiben", "mitmandant-entfernen": "akten_schreiben", "eintrag-fuer-mandant": "akten_schreiben",
};
const AENDERUNGS_RECHTE = {
  "akte-status": "akten_schreiben", "ki-akte": "ki_assistent", "termin-erledigt": "termine_schreiben", "aufgabe-erledigt": "termine_schreiben", "rang-recht": "admin",
  "rang-ki-limit": "admin", "ki-limit-offset": "admin",
};
const FORMULAR_RECHTE = { eintrag: "akten_schreiben", "aufgabe-schnell": "termine_schreiben", "ki-frage": "ki_assistent" };

function erlaubt(recht) {
  return !recht || (recht === "admin" ? state.isAdmin : darf(recht));
}

function keinRecht() {
  toast("Dafür fehlt dir die Berechtigung (Rang).", "error");
}

// Knöpfe, Häkchen und Formulare ohne passendes Recht entfernen bzw. sperren
function rechteAnwenden(root = document) {
  root.querySelectorAll("[data-action]").forEach((el) => {
    if (erlaubt(AKTIONS_RECHTE[el.dataset.action])) return;
    if (el.classList.contains("day-cell")) el.removeAttribute("data-action");
    else el.remove();
  });
  root.querySelectorAll("[data-change]").forEach((el) => {
    if (!erlaubt(AENDERUNGS_RECHTE[el.dataset.change])) el.disabled = true;
  });
  root.querySelectorAll("form[data-submit]").forEach((el) => {
    if (!erlaubt(FORMULAR_RECHTE[el.dataset.submit])) el.remove();
  });
}

// ---------- Routing ----------
function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  return { page: parts[0] || "uebersicht", id: parts[1] || null, sub: parts[2] || null };
}

function go(path) {
  const target = "#/" + path;
  if (location.hash === target) render();
  else location.hash = target;
}

window.addEventListener("hashchange", () => {
  closeDialogs();
  render();
  window.scrollTo(0, 0);
});

// ---------- Neuzeichnen ----------
let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function render() {
  if (!state.loaded) return;
  const main = $("main");
  const route = parseRoute();

  // Fokus, Cursor und Scrollpositionen merken (z. B. beim Tippen in der Suche)
  const active = document.activeElement;
  const focus = active && active.id && main.contains(active)
    ? { id: active.id, start: active.selectionStart, end: active.selectionEnd } : null;
  const scrolls = {};
  main.querySelectorAll("[data-scroll]").forEach((el) => (scrolls[el.dataset.scroll] = el.scrollTop));

  const view = !erlaubt(SEITEN_RECHTE[route.page])
    ? () => html`<div class="page"><div class="card empty-state"><h2>Kein Zugriff</h2><p>Dein Rang erlaubt es nicht, diesen Bereich zu sehen.</p><a class="btn" href="#/">Zur Übersicht</a></div></div>`
    : VIEWS[route.page] || VIEWS.uebersicht;
  // Dauerhafte Seiten (view.dauerhaft, z. B. Nigels Arbeitsbereich) werden nur beim Betreten
  // aufgebaut und danach von view.aktualisieren() in Teilen erneuert – Eingaben bleiben erhalten.
  const behalten = view.dauerhaft && main.dataset.view === route.page && main.firstElementChild;
  try {
    if (!behalten) main.innerHTML = String(view(route));
    main.dataset.view = view.dauerhaft ? route.page : "";
    if (view.aktualisieren) view.aktualisieren(route);
  } catch (e) {
    console.error(e);
    main.dataset.view = "";
    main.innerHTML = String(html`<div class="page"><div class="empty-state">
      <h2>Hier ist etwas schiefgelaufen</h2><p>${e.message}</p><a class="btn" href="#/">Zur Übersicht</a></div></div>`);
  }

  main.querySelectorAll("[data-scroll]").forEach((el) => {
    if (scrolls[el.dataset.scroll] !== undefined) el.scrollTop = scrolls[el.dataset.scroll];
  });
  if (focus) {
    const el = document.getElementById(focus.id);
    if (el) {
      el.focus({ preventScroll: true });
      try { if (focus.start !== null && focus.start !== undefined) el.setSelectionRange(focus.start, focus.end); } catch {}
    }
  }
  renderNav(route);
  document.querySelectorAll(".topbar [data-action]").forEach((el) => { el.hidden = !erlaubt(AKTIONS_RECHTE[el.dataset.action]); });
  rechteAnwenden(main);
  if (typeof kiAktualisieren === "function") kiAktualisieren();
  document.title = `${(NAV.find((n) => n.page === route.page) || NAV[0]).label} – Wiwang Law`;
  for (const hook of RENDER_HOOKS) {
    try { hook(route); } catch (e) { console.error(e); }
  }
}

function renderNav(route) {
  const heute = state.termine.filter((t) => !t.erledigt && sameDay(t.beginn, new Date())).length
    + state.termine.filter(terminUeberfaellig).length;
  const offen = state.rechnungen.filter(rechnungUeberfaellig).length;
  const pinnwand = typeof pinnwandOffen === "function" ? pinnwandOffen().length : 0;
  const antraege = typeof portalAntraege === "function" ? portalAntraege().length : 0;
  const badges = { kalender: heute, rechnungen: offen, pinnwand, mandanten: antraege };
  const sichtbar = NAV.filter((n) => erlaubt(SEITEN_RECHTE[n.page]));
  $("nav").innerHTML = String(html`${sichtbar.map((n) => html`
    <a href="${n.href}" class="${route.page === n.page || (n.page === "uebersicht" && !VIEWS[route.page]) ? "active" : ""}">
      ${n.label}${badges[n.page] ? html`<span class="nav-badge">${badges[n.page]}</span>` : ""}
    </a>`)}`);
  navAusrichten(route.page);
  // Auf dem Handy nur der Vorname, damit die Kopfzeile nicht umbricht
  $("btn-me").textContent = (window.innerWidth < 700 ? firstName(myName()) : myName()) || "Profil";
  // Logo zeigt an, dass man hier den Charakter wechselt (Discord-Konten)
  $("brand-wechsel").hidden = !(state.konto && state.konto.art === "charakter");
}

// Schmale Bildschirme (Handy, iPad hochkant): Navigation lässt sich seitlich wischen.
// Beim Seitenwechsel den aktiven Punkt ins Bild holen und Ränder andeuten, wo es weitergeht.
let navSeite = null;
function navAusrichten(page) {
  if (page !== navSeite) {
    navSeite = page;
    aktivInsBild($("nav"));
  }
  navRaender();
  // Reiter (Akte, Buchhaltung, Personal) werden neu gezeichnet – aktiven Reiter sichtbar halten
  $("main").querySelectorAll(".tabs").forEach(aktivInsBild);
}
function aktivInsBild(leiste) {
  const aktiv = leiste.querySelector("a.active");
  if (!aktiv || leiste.scrollWidth <= leiste.clientWidth) return;
  const start = aktiv.offsetLeft - leiste.firstElementChild.offsetLeft;
  if (start < leiste.scrollLeft + 32 || start + aktiv.offsetWidth > leiste.scrollLeft + leiste.clientWidth - 32) {
    leiste.scrollLeft = start - (leiste.clientWidth - aktiv.offsetWidth) / 2; // mittig
  }
}
function navRaender() {
  const nav = $("nav");
  nav.classList.toggle("mehr-links", nav.scrollLeft > 4);
  nav.classList.toggle("mehr-rechts", nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4);
}
$("nav").addEventListener("scroll", navRaender, { passive: true });
window.addEventListener("resize", () => { if (!$("nav").hidden) navRaender(); });

// ---------- Bildschirme ----------
function showScreen(name) {
  for (const s of ["setup", "login", "loading", "update", "konto"]) $(`${s}-screen`).hidden = s !== name;
  const inApp = name === "app";
  const imPortal = name === "portal";
  $("main").hidden = !inApp;
  $("nav").hidden = !inApp;
  $("topbar-actions").hidden = !inApp;
  $("portal").hidden = !imPortal;
  $("portal-nav").hidden = !imPortal;
  $("portal-actions").hidden = !imPortal;
  document.body.classList.toggle("in-app", inApp);
  document.body.classList.toggle("im-portal", imPortal);
  $("brand-sub").textContent = imPortal ? "Mandantenportal" : "Aktensystem";
}

// ---------- Anmeldung ----------
$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { email, password } = Object.fromEntries(new FormData(e.target));
  const errorEl = $("login-error");
  const button = e.target.querySelector("button");
  errorEl.hidden = true;
  button.disabled = true;
  const { error } = await db.auth.signInWithPassword({ email, password });
  button.disabled = false;
  if (error) {
    errorEl.textContent = /fetch|network/i.test(error.message)
      ? "Keine Verbindung zur Datenbank." : "Anmeldung fehlgeschlagen. E-Mail oder Passwort falsch?";
    errorEl.hidden = false;
  }
});

async function onSession(session) {
  // Beim Charakter-Wechsel lädt die Seite gleich neu – Zwischenstände ignorieren
  if (ui.charakterWechsel) return;
  if (!session) {
    stopLive();
    if (typeof portalStoppen === "function") portalStoppen();
    if (typeof portal !== "undefined") { portal.aktiv = false; portal.daten = null; }
    state.session = null;
    state.me = null;
    state.loaded = false;
    state.isAdmin = false;
    state.konto = null;
    ui.adminUsers = null;
    closeDialogs();
    showScreen("login");
    return;
  }
  state.session = session;
  state.me = { id: session.user.id, email: session.user.email };
  showScreen("loading");
  $("loading-text").textContent = "Anmeldung wird geprüft …";

  // Discord-Person (ohne aktiven Charakter)? Dann Registrierung bzw. Charakter-Auswahl.
  let konto;
  try {
    konto = await kontoPruefen(session);
  } catch (e) {
    console.error(e);
    $("loading-text").textContent = "Die Anmeldung konnte nicht geprüft werden: " + errorText(e);
    return;
  }
  state.konto = konto;
  // Mandanten-Charakter: nur das Mandantenportal
  if (konto && konto.art === "mandant") {
    portalStarten();
    return;
  }
  if (konto && ["person", "neu", "unbekannt"].includes(konto.art)) {
    if (konto.art === "person" && await automatischWechseln(konto)) return;
    kontoBildschirm();
    return;
  }

  $("loading-text").textContent = "Akten werden geladen …";
  try {
    await loadAll();
  } catch (e) {
    console.error(e);
    if (isMissingSchema(e)) {
      showScreen("update");
    } else {
      $("loading-text").textContent = "Die Daten konnten nicht geladen werden: " + errorText(e);
    }
    return;
  }
  const { data: admin } = await db.rpc("is_admin");
  state.isAdmin = admin === true;
  state.rechteSig = RECHTE.map((r) => (darf(r.key) ? 1 : 0)).join("");
  // Profile legt nur noch die Datenbank an (Mitglied einstellen bzw. Charakter freigeben)
  if (!profileOf(state.me.id) && !state.isAdmin) {
    state.loaded = false;
    state.konto = { art: "unbekannt" };
    kontoBildschirm();
    return;
  }
  startLive();
  showScreen("app");
  render();
  if (typeof ladePortalZugaenge === "function") ladePortalZugaenge();
}

// ---------- Globale Aktionen ----------
Object.assign(ACTIONS, {
  logout: () => db.auth.signOut(),
  reload: () => location.reload(),
});

// ---------- Ereignisse an die Aktionen verteilen ----------
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || el.disabled) return;
  // Links innerhalb einer anklickbaren Zeile funktionieren ganz normal
  const link = e.target.closest("a[href]");
  if (link && link !== el && el.contains(link)) return;
  const fn = ACTIONS[el.dataset.action];
  if (fn && !erlaubt(AKTIONS_RECHTE[el.dataset.action])) { e.preventDefault(); return keinRecht(); }
  if (!fn) return;
  e.preventDefault();
  fn(el.dataset, el, e);
});

document.addEventListener("change", (e) => {
  const el = e.target.closest("[data-change]");
  if (!el || !CHANGES[el.dataset.change]) return;
  if (!erlaubt(AENDERUNGS_RECHTE[el.dataset.change])) return keinRecht();
  CHANGES[el.dataset.change](el, e);
});

document.addEventListener("input", (e) => {
  const el = e.target.closest("[data-input]");
  if (el && INPUTS[el.dataset.input]) INPUTS[el.dataset.input](el, e);
});

document.addEventListener("submit", (e) => {
  const form = e.target.closest("form[data-submit]");
  if (!form) return;
  e.preventDefault();
  if (!erlaubt(FORMULAR_RECHTE[form.dataset.submit])) return keinRecht();
  if (SUBMITS[form.dataset.submit]) SUBMITS[form.dataset.submit](form, e);
});

// ---------- Tastenkürzel ----------
document.addEventListener("keydown", (e) => {
  if (!state.loaded || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest("input, textarea, select, [contenteditable]") || document.querySelector("dialog[open]")) return;
  if (e.key === "/") {
    const search = document.querySelector("#main [data-search]");
    if (search) { e.preventDefault(); search.focus(); search.select(); }
  } else if (e.key === "n") {
    e.preventDefault();
    if (erlaubt(AKTIONS_RECHTE["akte-neu"])) ACTIONS["akte-neu"]({});
  }
});

// Nach dem Drucken den Druckbereich leeren
window.addEventListener("afterprint", () => { $("print-area").innerHTML = ""; });

// ---------- Start ----------
function start() {
  const config = window.WIWANG_CONFIG || {};
  if (!config.supabaseUrl || !config.supabaseKey || !window.supabase) {
    showScreen("setup");
    return;
  }
  // PKCE: Discord leitet mit ?code=… zurück (stört die #/-Adressen nicht)
  db = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, { auth: { flowType: "pkce" } });
  anmeldeFehlerAusAdresse();
  let currentUserId;
  db.auth.onAuthStateChange((event, session) => {
    const userId = (session && session.user && session.user.id) || null;
    if (userId === currentUserId) {
      if (session) state.session = session;
      return; // nichts Neues (z. B. Token erneuert)
    }
    currentUserId = userId;
    // Supabase empfiehlt, hier keine Abfragen direkt zu starten
    setTimeout(() => onSession(session), 0);
  });
}

document.addEventListener("DOMContentLoaded", start);
