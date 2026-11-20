// =============================================================
//  Wiwang Law – Steuerung
//  Anmeldung, Seiten (über die Adresse #/akten/…), Neuzeichnen,
//  Klick-Aktionen und Tastenkürzel.
// =============================================================

// Zustand der Oberfläche (Filter, Entwürfe, …) – nur im Browser
const ui = {
  akten: { q: "", status: "aktiv", typ: "", sort: "aktiv", meine: false },
  pinnwand: { archiv: false, alle: false },
  mandanten: { q: "", filter: "alle" },
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
// Hauptmenü in drei Gruppen – auf großen Bildschirmen als Seitenleiste, auf Tablets als Leiste
// oben, auf dem Handy als Leiste unten (die ersten Punkte aus TABBAR) plus „Mehr“-Kachelmenü.
const NAV = [
  { page: "uebersicht", label: "Übersicht", href: "#/", gruppe: "Arbeit" },
  { page: "akten", label: "Akten", href: "#/akten", gruppe: "Arbeit" },
  { page: "mandanten", label: "Mandanten", href: "#/mandanten", gruppe: "Arbeit" },
  { page: "kalender", label: "Kalender", href: "#/kalender", gruppe: "Arbeit" },
  { page: "gesetze", label: "Gesetze", href: "#/gesetze", gruppe: "Recht" },
  { page: "gesetzbuch", label: "Strafkatalog", href: "#/gesetzbuch", gruppe: "Recht" },
  { page: "nigel", label: "Nigel", href: "#/nigel", gruppe: "Recht" },
  { page: "finanzen", label: "Finanzen", href: "#/finanzen", gruppe: "Kanzlei" },
  { page: "team", label: "Personal", href: "#/team", gruppe: "Kanzlei" },
];
// Handy: diese Bereiche (sofern erlaubt) stehen direkt in der unteren Leiste, der Rest unter „Mehr“
const TABBAR = ["uebersicht", "akten", "kalender", "mandanten"];
const TABBAR_PLAETZE = 4;
const NAV_ICON_PFADE = {
  uebersicht: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  akten: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  mandanten: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5a6.5 6.5 0 0 1 3.5 5.5",
  kalender: "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 2.5v3M16 2.5v3",
  gesetze: "M5 4.5A1.5 1.5 0 0 1 6.5 3H19v14H6.5A1.5 1.5 0 0 0 5 18.5zM5 18.5A1.5 1.5 0 0 0 6.5 20H19M9 7h6",
  gesetzbuch: "M12 4v16M8 20h8M4 7h16M6 7l-3 7h6zM18 7l-3 7h6z",
  nigel: "M4 5h16v11H9l-5 4zM9 10.5h.01M12 10.5h.01M15 10.5h.01",
  finanzen: "M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14h1.5",
  team: "M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.5 16.5a3.5 3.5 0 0 1 7 0M15 9h3M15 13h3",
  mehr: "M5 5h4v4H5zM15 5h4v4h-4zM5 15h4v4H5zM15 15h4v4h-4z",
  profil: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 21a7.5 7.5 0 0 1 15 0",
  leitfaden: "M5 4.5A1.5 1.5 0 0 1 6.5 3H19v14H6.5A1.5 1.5 0 0 0 5 18.5zM5 18.5A1.5 1.5 0 0 0 6.5 20H19",
  rechnung: "M6 3h9l4 4v14H6zM15 3v4h4M9 11h7M9 15h7M9 19h4",
  dokument: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4",
  hilfe: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  wechseln: "M4 8h14l-3-3M20 16H6l3 3",
  einklappen: "M14 6l-6 6 6 6M19 5v14",
  ausklappen: "M10 6l6 6-6 6M5 5v14",
  abmelden: "M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10",
};
function navIcon(name) {
  return new SafeHtml(`<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${NAV_ICON_PFADE[name] || ""}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
}

// ---------- Rechte für Seiten und Aktionen ----------
// Was hier fehlt, darf jedes Mitglied. Die Datenbank prüft zusätzlich selbst.
// Eine Liste heißt: eines der Rechte genügt (Finanzen: Rechnungen oder Buchhaltung lesen).
const SEITEN_RECHTE = {
  akten: "akten_lesen", mandanten: "mandanten_lesen", kalender: "termine_lesen",
  finanzen: ["rechnungen_lesen", "buchhaltung_lesen"], gesetzbuch: "gesetzbuch_lesen", gesetze: "gesetzbuch_lesen",
  nigel: "ki_sehen", // nur „Sehen“: Arbeitsbereich als zensierte Vorschau (js/nigel.js)
};
const AKTIONS_RECHTE = {
  "akte-neu": "akten_schreiben", "akte-bearbeiten": "akten_schreiben",
  "sv-bearbeiten": "akten_schreiben", "sv-speichern": "akten_schreiben", "sv-abbrechen": "akten_schreiben", "akte-abschluss": "akten_schreiben",
  "haft-ende": "akten_schreiben", "vorwurf-hinzufuegen": "akten_schreiben", "vorwurf-anzahl": "akten_schreiben",
  "vorwurf-entfernen": "akten_schreiben", "eintrag-bearbeiten": "akten_schreiben", "eintrag-loeschen": "akten_schreiben",
  "beteiligter-neu": "akten_schreiben", "beteiligter-bearbeiten": "akten_schreiben", "beweis-neu": "akten_schreiben",
  "beweis-bearbeiten": "akten_schreiben", "auswahl-in-akte": "akten_schreiben", "akte-loeschen": "akten_loeschen",
  "mandant-neu": "mandanten_schreiben", "mandant-bearbeiten": "mandanten_schreiben",
  "termin-neu": "termine_schreiben", "termin-bearbeiten": "termine_schreiben", "aufgabe-bearbeiten": "termine_schreiben",
  "rechnung-neu": "rechnungen_schreiben", "rechnung-bearbeiten": "rechnungen_schreiben", "rechnung-bezahlt": "rechnungen_schreiben",
  "gebuehr-neu": "einstellungen_schreiben", "gebuehr-bearbeiten": "einstellungen_schreiben", "gesetz-neu": "gesetzbuch_schreiben",
  "gesetz-bearbeiten": "gesetzbuch_schreiben", "gesetze-import": "gesetzbuch_schreiben",
  "gesetzbuch-neu": "gesetzbuch_schreiben", "gesetzbuch-bearbeiten": "gesetzbuch_schreiben", "paragraph-neu": "gesetzbuch_schreiben",
  "paragraph-bearbeiten": "gesetzbuch_schreiben", "paragraphen-import": "gesetzbuch_schreiben", "gb-ki": "ki_assistent",
  "ki-nutzung-neu": "admin",
  "buchung-neu": "buchhaltung_schreiben", "buchung-storno": "buchhaltung_schreiben",
  "konto-neu": "buchhaltung_schreiben", "konto-bearbeiten": "buchhaltung_schreiben",
  "nutzer-neu": "personal_schreiben", "nutzer-passwort": "personal_schreiben", "nutzer-sperren": "personal_schreiben",
  "personalakte-bearbeiten": "personal_schreiben", "vermerk-neu": "personal_schreiben", "vermerk-loeschen": "personal_schreiben",
  "einstellungen-bearbeiten": "einstellungen_schreiben",
  "ki-oeffnen": "ki_assistent", "ki-klappen": "ki_sehen", "ki-neu": "ki_assistent", "ki-vorlage": "ki_assistent", "ki-akte-setzen": "ki_assistent",
  "ki-in-verlauf": "akten_schreiben", "ki-arbeitsbereich": "ki_assistent", "nw-mit-akte": "ki_assistent",
  "ki-ansehen": "ki_sehen", "nw-neu": "ki_assistent", "nw-vom-handy": "ki_assistent",
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
  "rang-ki-budget": "admin", "ki-budget-offset": "admin", "ki-deckel": "admin", "ki-budget-verteilen": "admin",
};
const FORMULAR_RECHTE = { eintrag: "akten_schreiben", "aufgabe-schnell": "termine_schreiben", "ki-frage": "ki_assistent" };

function erlaubt(recht) {
  if (Array.isArray(recht)) return recht.some(erlaubt);
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
// Frühere eigene Seiten, die jetzt Teil einer anderen sind (alte Links, Lesezeichen, Benachrichtigungen):
// Pinnwand und „Team heute“ stehen auf der Übersicht, Rechnungen und Buchhaltung unter Finanzen.
const ALTE_SEITEN = {
  pinnwand: () => ({ ziel: "", anker: "pinnwand" }),
  "team-heute": () => ({ ziel: "", anker: "team-heute" }),
  rechnungen: () => ({ ziel: "finanzen/rechnungen" }),
  buchhaltung: (id) => ({ ziel: `finanzen/${id || "bilanz"}` }),
};
function parseRoute() {
  let parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  // Nur im Aktensystem – das Mandantenportal hat eigene Adressen (u. a. #/rechnungen)
  const alt = state.loaded && !document.body.classList.contains("im-portal") && ALTE_SEITEN[parts[0]];
  if (alt) {
    const { ziel, anker } = alt(parts[1]);
    history.replaceState(null, "", "#/" + ziel); // löst kein hashchange aus
    if (anker) ui.anker = anker;
    parts = ziel.split("/").filter(Boolean);
  }
  return { page: parts[0] || "uebersicht", id: parts[1] || null, sub: parts[2] || null };
}

function go(path) {
  const target = "#/" + path;
  if (location.hash === target) render();
  else location.hash = target;
}

window.addEventListener("hashchange", () => {
  closeDialogs();
  if (!$("nav-sheet").hidden) navSheet(false);
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
  $("main").querySelectorAll(".tabs").forEach(aktivInsBild);
  // Sprungmarke (z. B. #/pinnwand → Pinnwand auf der Übersicht) erst nach dem Hochscrollen anfahren
  if (ui.anker) {
    const anker = ui.anker;
    ui.anker = null;
    requestAnimationFrame(() => { const el = document.getElementById(anker); if (el) el.scrollIntoView({ block: "start" }); });
  }
  document.querySelectorAll(".topbar [data-action]").forEach((el) => { el.hidden = !erlaubt(AKTIONS_RECHTE[el.dataset.action]); });
  rechteAnwenden(main);
  if (typeof kiAktualisieren === "function") kiAktualisieren();
  document.title = `${(NAV.find((n) => n.page === route.page) || NAV[0]).label} – Wiwang Law`;
  liveHervorheben();
  for (const hook of RENDER_HOOKS) {
    try { hook(route); } catch (e) { console.error(e); }
  }
}

function navAktiv(n, route) {
  return route.page === n.page || (n.page === "uebersicht" && !VIEWS[route.page]);
}

function renderNav(route) {
  const heute = state.termine.filter((t) => !t.erledigt && sameDay(t.beginn, new Date())).length
    + state.termine.filter(terminUeberfaellig).length;
  const offen = state.rechnungen.filter(rechnungUeberfaellig).length;
  const pinnwand = typeof pinnwandOffen === "function" ? pinnwandOffen().length : 0;
  const antraege = (typeof portalAntraege === "function" ? portalAntraege().length : 0)
    + (typeof offeneAnliegen === "function" ? offeneAnliegen().filter((x) => x.status === "offen").length : 0);
  const badges = { kalender: heute, finanzen: offen, uebersicht: pinnwand, mandanten: antraege };
  // Rot nur, wo etwas überfällig ist (Fristen, Rechnungen); sonst ein ruhiger Zähler
  const dringend = { kalender: state.termine.some(terminUeberfaellig), finanzen: offen > 0 };
  const badge = (n) => (badges[n.page]
    ? html`<span class="nav-badge ${dringend[n.page] ? "dringend" : ""}" aria-label="${badges[n.page]} offen">${badges[n.page]}</span>` : "");
  const sichtbar = NAV.filter((n) => erlaubt(SEITEN_RECHTE[n.page]));
  const gruppen = [...new Set(sichtbar.map((n) => n.gruppe))].map((g) => ({ name: g, items: sichtbar.filter((n) => n.gruppe === g) }));
  const link = (n) => html`<a href="${n.href}" title="${n.label}" class="nav-item ${navAktiv(n, route) ? "active" : ""}"${navAktiv(n, route) ? html` aria-current="page"` : ""}>
      ${navIcon(n.page)}<span class="nav-label">${n.label}</span>${badge(n)}</a>`;

  // Seitenleiste (Desktop; Tablet als schmale Symbolleiste): Charakter, Bereiche nach Gruppen, Leitfaden, Einklappen
  const zu = navEingeklappt();
  $("nav").innerHTML = String(html`
    <div class="sb-kopf">${charakterSwitcher()}</div>
    <div class="sb-gruppen">
      ${gruppen.map((g) => html`
      <div class="nav-group" role="group" aria-label="${g.name}">
        <span class="nav-titel" aria-hidden="true">${g.name}</span>
        ${g.items.map(link)}
      </div>`)}
    </div>
    <div class="sb-fuss">
      <a class="nav-item sb-leitfaden" href="leitfaden/straftat.html?v=64" title="Leitfaden „Abhandlung einer Straftat“">
        ${navIcon("leitfaden")}<span class="nav-label">Leitfaden <small>Abhandlung einer Straftat</small></span></a>
      <button type="button" class="nav-item nav-klappen" data-action="nav-klappen" aria-expanded="${!zu}"
        title="${zu ? "Menü ausklappen" : "Menü einklappen (nur Symbole)"}" aria-label="${zu ? "Menü ausklappen" : "Menü einklappen"}">
        ${navIcon(zu ? "ausklappen" : "einklappen")}<span class="nav-label">Einklappen</span></button>
    </div>`);

  // Handy: die wichtigsten Bereiche unten, alles andere im „Mehr“-Menü (immer da: dort stehen auch Charakter, Profil und Abmelden)
  const direkt = [...TABBAR.map((p) => sichtbar.find((n) => n.page === p)).filter(Boolean),
    ...sichtbar.filter((n) => !TABBAR.includes(n.page))].slice(0, TABBAR_PLAETZE);
  const rest = sichtbar.filter((n) => !direkt.includes(n));
  const restAktiv = rest.some((n) => navAktiv(n, route)) || document.body.classList.contains("nav-sheet-offen");
  const restBadges = rest.reduce((t, n) => t + (badges[n.page] || 0), 0);
  $("tabbar").innerHTML = String(html`${direkt.map(link)}
    ${html`<button type="button" class="nav-item ${restAktiv ? "active" : ""}" data-action="nav-sheet" aria-haspopup="dialog" aria-expanded="${document.body.classList.contains("nav-sheet-offen")}">
      ${navIcon("mehr")}<span class="nav-label">Mehr</span>${restBadges ? html`<span class="nav-badge">${restBadges}</span>` : ""}</button>`}`);

  // Bottom Sheet „Mehr“ (nur Handy): Charakter, übrige Bereiche, Darstellung, Leitfaden, Profil, Abmelden
  const kachel = (n) => html`<a href="${n.href}" class="nav-kachel ${navAktiv(n, route) ? "active" : ""}">
        ${navIcon(n.page)}<span class="nav-label">${n.label}</span>${badge(n)}</a>`;
  const restGruppen = gruppen.map((g) => ({ ...g, items: g.items.filter((n) => rest.includes(n)) })).filter((g) => g.items.length);
  $("nav-sheet-inhalt").innerHTML = String(html`
    <div class="sheet-charakter">${charakterSwitcher({ imSheet: true })}</div>
    ${restGruppen.map((g) => html`
      <h3 class="nav-sheet-titel">${g.name}</h3>
      <div class="nav-kacheln">${g.items.map(kachel)}</div>`)}
    <h3 class="nav-sheet-titel">Konto & Darstellung</h3>
    <div class="sheet-liste">
      <button type="button" class="sheet-zeile" data-action="nav-profil">${navIcon("profil")}<span>Mein Profil</span></button>
      <button type="button" class="sheet-zeile" data-action="theme-umschalten">${themeIcon()}<span class="theme-label">Design umschalten</span></button>
      <a class="sheet-zeile" href="leitfaden/straftat.html?v=64">${navIcon("leitfaden")}<span>Leitfaden „Abhandlung einer Straftat“</span></a>
      <button type="button" class="sheet-zeile danger" data-action="logout">${navIcon("abmelden")}<span>Abmelden</span></button>
    </div>`);

  kopfKontext(route);
}

// ---------- Seitenleiste einklappen (nur Symbole) – merkt sich der Browser ----------
const NAV_KLAPP_KEY = "wiwang-nav-eingeklappt";
function navEingeklappt() { return document.body.classList.contains("nav-eingeklappt"); }
try { if (localStorage.getItem(NAV_KLAPP_KEY) === "1") document.body.classList.add("nav-eingeklappt"); } catch {}
ACTIONS["nav-klappen"] = () => {
  const zu = !navEingeklappt();
  document.body.classList.toggle("nav-eingeklappt", zu);
  try { localStorage.setItem(NAV_KLAPP_KEY, zu ? "1" : "0"); } catch {}
  renderNav(parseRoute());
};

// ---------- Handy: Kachelmenü „Mehr“ ----------
function navSheet(offen) {
  const sheet = $("nav-sheet");
  if (offen === undefined) offen = sheet.hidden;
  sheet.hidden = !offen;
  document.body.classList.toggle("nav-sheet-offen", offen);
  // „Mehr“-Knopf markieren (Aktensystem bzw. Mandantenportal)
  if (document.body.classList.contains("im-portal")) { if (typeof portalNavRender === "function") portalNavRender(); }
  else if (state.loaded) renderNav(parseRoute());
  if (offen) { const erstes = sheet.querySelector(".nav-kachel"); if (erstes) erstes.focus({ preventScroll: true }); }
}
Object.assign(ACTIONS, {
  "nav-sheet": () => navSheet(),
  "nav-sheet-zu": () => navSheet(false),
  "nav-profil": () => { navSheet(false); ACTIONS["profil-bearbeiten"]({}); },
});
// Link im Menü angetippt (auch die aktuelle Seite) → Menü schließen
$("nav-sheet").addEventListener("click", (e) => { if (e.target.closest("a[href], .nav-kachel")) navSheet(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("nav-sheet").hidden) navSheet(false); });
// Wird das Fenster breiter (iPad drehen), gibt es kein „Mehr“ mehr
window.matchMedia("(min-width: 768px)").addEventListener("change", (m) => { if (m.matches) navSheet(false); });

// Reiter (Akte, Buchhaltung, Personal) werden neu gezeichnet – aktiven Reiter sichtbar halten
function aktivInsBild(leiste) {
  const aktiv = leiste.querySelector("a.active");
  if (!aktiv || leiste.scrollWidth <= leiste.clientWidth) return;
  const start = aktiv.offsetLeft - leiste.firstElementChild.offsetLeft;
  if (start < leiste.scrollLeft + 32 || start + aktiv.offsetWidth > leiste.scrollLeft + leiste.clientWidth - 32) {
    leiste.scrollLeft = start - (leiste.clientWidth - aktiv.offsetWidth) / 2; // mittig
  }
}

// ---------- Bildschirme ----------
function showScreen(name) {
  for (const s of ["setup", "login", "loading", "update", "konto"]) $(`${s}-screen`).hidden = s !== name;
  const inApp = name === "app";
  const imPortal = name === "portal";
  $("main").hidden = !inApp;
  $("nav").hidden = !inApp;
  $("tabbar").hidden = !inApp && !imPortal; // Handy: untere Leiste auch im Mandantenportal
  navSheet(false);
  $("topbar-actions").hidden = !inApp;
  $("cmd-btn").hidden = !inApp;
  $("kopf-kontext").hidden = !inApp;
  $("portal").hidden = !imPortal;
  $("portal-nav").hidden = !imPortal;
  $("portal-actions").hidden = !imPortal;
  document.body.classList.toggle("in-app", inApp);
  document.body.classList.toggle("im-portal", imPortal);
  if (imPortal) document.body.setAttribute("data-portal", "mandant"); else document.body.removeAttribute("data-portal");
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
    // Suchfeld der Seite (Akten, Mandanten, Gesetze …) – gibt es keins, die Such- & Befehlsleiste
    e.preventDefault();
    const search = document.querySelector("#main [data-search]");
    if (search && search.offsetParent !== null) { search.focus(); search.select(); }
    else if (typeof cmdOeffnen === "function") cmdOeffnen();
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
