// =============================================================
//  Wiwang Law – Steuerung
//  Anmeldung, Seiten (über die Adresse #/akten/…), Neuzeichnen,
//  Klick-Aktionen und Tastenkürzel.
// =============================================================

// Zustand der Oberfläche (Filter, Entwürfe, …) – nur im Browser
const ui = {
  akten: { q: "", status: "aktiv", typ: "", sort: "aktiv", meine: false },
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

// Seiten (von den Seiten-Dateien befüllt)
const VIEWS = {};
const NAV = [
  { page: "uebersicht", label: "Übersicht", href: "#/" },
  { page: "akten", label: "Akten", href: "#/akten" },
  { page: "mandanten", label: "Mandanten", href: "#/mandanten" },
  { page: "kalender", label: "Kalender", href: "#/kalender" },
  { page: "rechnungen", label: "Rechnungen", href: "#/rechnungen" },
  { page: "gesetzbuch", label: "Gesetzbuch", href: "#/gesetzbuch" },
  { page: "team", label: "Team", href: "#/team" },
];

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

  const view = VIEWS[route.page] || VIEWS.uebersicht;
  try {
    main.innerHTML = String(view(route));
  } catch (e) {
    console.error(e);
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
  document.title = `${(NAV.find((n) => n.page === route.page) || NAV[0]).label} – Wiwang Law`;
}

function renderNav(route) {
  const heute = state.termine.filter((t) => !t.erledigt && sameDay(t.beginn, new Date())).length
    + state.termine.filter(terminUeberfaellig).length;
  const offen = state.rechnungen.filter(rechnungUeberfaellig).length;
  const badges = { kalender: heute, rechnungen: offen };
  $("nav").innerHTML = String(html`${NAV.map((n) => html`
    <a href="${n.href}" class="${route.page === n.page || (n.page === "uebersicht" && !VIEWS[route.page]) ? "active" : ""}">
      ${n.label}${badges[n.page] ? html`<span class="nav-badge">${badges[n.page]}</span>` : ""}
    </a>`)}`);
  $("btn-me").textContent = myName() || "Profil";
}

// ---------- Bildschirme ----------
function showScreen(name) {
  for (const s of ["setup", "login", "loading", "update"]) $(`${s}-screen`).hidden = s !== name;
  const inApp = name === "app";
  $("main").hidden = !inApp;
  $("nav").hidden = !inApp;
  $("topbar-actions").hidden = !inApp;
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
  if (!session) {
    stopLive();
    state.session = null;
    state.me = null;
    state.loaded = false;
    state.isAdmin = false;
    ui.adminUsers = null;
    closeDialogs();
    showScreen("login");
    return;
  }
  state.session = session;
  state.me = { id: session.user.id, email: session.user.email };
  showScreen("loading");
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
  if (!profileOf(state.me.id)) {
    await attempt(() => insertRow("profiles", { user_id: state.me.id }));
  }
  startLive();
  showScreen("app");
  render();
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
  if (!fn) return;
  e.preventDefault();
  fn(el.dataset, el, e);
});

document.addEventListener("change", (e) => {
  const el = e.target.closest("[data-change]");
  if (el && CHANGES[el.dataset.change]) CHANGES[el.dataset.change](el, e);
});

document.addEventListener("input", (e) => {
  const el = e.target.closest("[data-input]");
  if (el && INPUTS[el.dataset.input]) INPUTS[el.dataset.input](el, e);
});

document.addEventListener("submit", (e) => {
  const form = e.target.closest("form[data-submit]");
  if (!form) return;
  e.preventDefault();
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
    ACTIONS["akte-neu"]({});
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
  db = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
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
