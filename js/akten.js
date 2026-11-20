// =============================================================
//  Wiwang Law – Akten
//  Liste mit Filtern + Detailansicht mit Tabs
// =============================================================

// Reiterleiste der Akte. Ältere Adressen (#/akten/:id, …/aufgaben) führen auf den passenden Reiter.
const AKTE_TABS = [
  { key: "verlauf", label: "Verlauf", count: (id) => kinder("eintraege", id).length },
  { key: "vorwuerfe", label: "Tatvorwürfe & Strafrechner", kurz: "Tatvorwürfe", count: (id) => ((byId("akten", id) || {}).vorwuerfe || []).length },
  { key: "beteiligte", label: "Beteiligte", count: (id) => kinder("beteiligte", id).length },
  { key: "beweise", label: "Beweise", count: (id) => kinder("beweise", id).length },
  { key: "termine", label: "Termine & Aufgaben", kurz: "Termine", count: (id) => kinder("termine", id).filter((t) => !t.erledigt).length + kinder("aufgaben", id).filter((t) => !t.erledigt).length },
  { key: "rechnungen", label: "Rechnungen", count: (id) => state.rechnungen.filter((r) => r.akte_id === id).length },
  { key: "historie", label: "Historie" },
];
const AKTE_TAB_ALIAS = { "": "verlauf", ueberblick: "verlauf", aufgaben: "termine" };

const statusClass = (s) => norm(s).replace(/\s+/g, "-");
const statusBadge = (s) => html`<span class="badge ${statusClass(s)}">${s}</span>`;
const prioBadge = (p) => (p === "Hoch" || p === "Dringend" ? html`<span class="badge ${statusClass(p)}">${p}</span>` : "");
const haftBadge = (a) => (a.in_haft ? html`<span class="badge haft">In Haft</span>` : "");
const AKTE_STATUS_TON = { Offen: "info", "In Bearbeitung": "gold", Geschlossen: "neutral" };

// ---------- Liste ----------
function gefilterteAkten() {
  const f = ui.akten;
  const prio = { Dringend: 0, Hoch: 1, Normal: 2 };
  const list = state.akten.filter((a) => {
    if (f.status === "aktiv" && a.status === "Geschlossen") return false;
    if (f.status === "haft" && !a.in_haft) return false;
    if (f.status === "liegen" && !liegenGeblieben(a)) return false;
    if (!["aktiv", "alle", "haft", "liegen"].includes(f.status) && a.status !== f.status) return false;
    if (f.typ && a.area !== f.typ) return false;
    if (f.meine && a.zustaendig_id !== state.me.id) return false;
    if (!f.q) return true;
    return matches(f.q, a.number, a.title, mandantName(a), a.client, a.opponent, a.az_extern, a.area, a.typ,
      a.summary, a.lawyer, personName(a.zustaendig_id, ""),
      (a.vorwuerfe || []).map((v) => `${v.paragraph || ""} ${v.titel || ""}`),
      kinder("beteiligte", a.id).map((b) => b.name));
  });
  const aktiv = (a) => zuletztAktiv(a).getTime();
  const sorters = {
    aktiv: (a, b) => aktiv(b) - aktiv(a),
    neu: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    az: (a, b) => (b.number || "").localeCompare(a.number || ""),
    prio: (a, b) => (prio[a.prioritaet] ?? 2) - (prio[b.prioritaet] ?? 2) || aktiv(b) - aktiv(a),
    termin: (a, b) => {
      const ta = naechsterTermin(a.id), tb = naechsterTermin(b.id);
      return (ta ? new Date(ta.beginn) : Infinity) - (tb ? new Date(tb.beginn) : Infinity);
    },
  };
  return list.sort(sorters[f.sort] || sorters.aktiv);
}

function fortschrittBalken(akteId, { text = true } = {}) {
  const st = aufgabenStand(akteId);
  if (!st.gesamt) return "";
  const pct = Math.round((st.erledigt / st.gesamt) * 100);
  return html`<span class="fortschritt-zeile" title="${st.erledigt} von ${st.gesamt} Aufgaben erledigt">
    <span class="fortschritt ${pct === 100 ? "fertig" : ""}"><span style="width:${pct}%"></span></span>${text ? html`<span>${st.erledigt}/${st.gesamt} Aufgaben</span>` : ""}</span>`;
}

function akteListItem(a, activeId) {
  const nt = naechsterTermin(a.id);
  const wer = typeof betrachter === "function" ? betrachter(a.id) : [];
  return html`
    <a class="item ${a.id === activeId ? "active" : ""}" href="#/akten/${a.id}" data-live="akten:${a.id}">
      <span class="num"><span class="dot ${statusClass(a.prioritaet)}"></span>${a.number}
        ${wer.length ? html`<span class="avatars mini" title="Gerade geöffnet von ${wer.map((id) => personName(id)).join(", ")}">${wer.map((id) => avatar(id, { punkt: false }))}</span>` : ""}</span>
      <span class="title">${a.title}</span>
      <span class="meta"><span>${mandantName(a)}</span><span class="badges">${haftBadge(a)}${statusBadge(a.status)}</span></span>
      ${nt ? html`<span class="sub">Nächster Termin: ${fmt.tag(nt.beginn)}, ${fmt.zeit(nt.beginn)} · ${nt.titel}</span>` : ""}
      ${a.status !== "Geschlossen" ? fortschrittBalken(a.id) : ""}
    </a>`;
}

// Status-Ton für Akzentstreifen (Haft schlägt alles)
function akteTon(a) {
  if (a.in_haft && a.status !== "Geschlossen") return "haft";
  return { Offen: "offen", "In Bearbeitung": "bearbeitung", Geschlossen: "abgeschlossen" }[a.status] || "offen";
}

// Filterleiste (Liste und Akten-Switcher teilen sich die Filter)
function aktenFilterleiste(praefix = "akten") {
  const f = ui.akten;
  return html`
    <div class="search"><input type="search" id="${praefix}-q" data-search data-input="akten-filter" data-key="q"
      value="${f.q}" placeholder="Suchen: Name, Az., Vorwurf …" aria-label="Akten durchsuchen" autocomplete="off"></div>
    <select id="${praefix}-status" data-change="akten-filter" data-key="status" aria-label="Status">
      ${[["aktiv", "Offen + In Bearbeitung"], ["Offen", "Offen"], ["In Bearbeitung", "In Bearbeitung"],
         ["Geschlossen", "Geschlossen"], ["haft", "Mandant in Haft"], ["liegen", "Liegen geblieben"], ["alle", "Alle Akten"]]
        .map(([v, l]) => html`<option value="${v}" ${f.status === v ? "selected" : ""}>${l}</option>`)}
    </select>
    <select id="${praefix}-typ" data-change="akten-filter" data-key="typ" aria-label="Rechtsgebiet">
      <option value="">Alle Rechtsgebiete</option>
      ${OPTIONEN.rechtsgebiet.map((r) => html`<option ${f.typ === r ? "selected" : ""}>${r}</option>`)}
    </select>
    <select id="${praefix}-sort" data-change="akten-filter" data-key="sort" title="Sortierung" aria-label="Sortierung">
      ${[["aktiv", "Zuletzt aktiv"], ["prio", "Priorität"], ["termin", "Nächster Termin"], ["neu", "Neueste zuerst"], ["az", "Aktenzeichen"]]
        .map(([v, l]) => html`<option value="${v}" ${f.sort === v ? "selected" : ""}>${l}</option>`)}
    </select>
    <label class="check"><input type="checkbox" id="${praefix}-meine" data-change="akten-filter" data-key="meine" ${f.meine ? "checked" : ""}> Nur meine</label>`;
}

// Zeile im vollbreiten Aktenverzeichnis – leere Angaben werden gar nicht gerendert
function akteVerzeichnisZeile(a) {
  const nt = naechsterTermin(a.id);
  const wer = typeof betrachter === "function" ? betrachter(a.id) : [];
  const zust = personName(a.zustaendig_id, a.lawyer || "");
  return html`<li><a class="akten-zeile ton-${akteTon(a)}" href="#/akten/${a.id}" data-live="akten:${a.id}">
    <span class="az-spalte"><span class="mono">${a.number}</span><span class="dot ${statusClass(a.prioritaet)}" title="Priorität ${a.prioritaet || "Normal"}"></span></span>
    <span class="titel-spalte">
      <span class="title">${a.title}</span>
      <span class="sub">${[mandantName(a), a.area].filter(Boolean).join(" · ")}</span>
    </span>
    <span class="status-spalte">${haftBadge(a)}${statusBadge(a.status)}${prioBadge(a.prioritaet)}</span>
    <span class="termin-spalte">${nt ? html`<span class="small"><strong>${fmt.tag(nt.beginn)}, ${fmt.zeit(nt.beginn)}</strong> · ${truncate(nt.titel, 34)}</span>` : ""}</span>
    <span class="fortschritt-spalte">${a.status !== "Geschlossen" ? fortschrittBalken(a.id) : ""}</span>
    <span class="wer-spalte">${zust ? html`<span class="small muted">${zust}</span>` : ""}${wer.length ? html`<span class="avatars mini" title="Gerade geöffnet von ${wer.map((id) => personName(id)).join(", ")}">${wer.map((id) => avatar(id, { punkt: false }))}</span>` : ""}</span>
  </a></li>`;
}

VIEWS.akten = (route) => {
  const akte = route.id ? byId("akten", route.id) : null;
  if (route.id) {
    return html`<div class="page page-breit akten-arbeitsraum">
      ${akte ? renderAkteDetail(akte, route.sub)
        : html`<a class="zurueck-link" href="#/akten">← Alle Akten</a><div class="card empty-state"><h2>Akte nicht gefunden</h2><p>Vielleicht wurde sie gelöscht.</p><a class="btn" href="#/akten">Zur Aktenliste</a></div>`}
    </div>`;
  }
  const list = gefilterteAkten();
  return html`
    <div class="page page-breit akten-verzeichnis">
      <div class="page-head"><div><h1>Akten</h1><p class="muted">${list.length} ${list.length === 1 ? "Akte" : "Akten"} · <strong>/</strong> sucht, <strong>N</strong> legt eine neue Akte an</p></div></div>
      <div class="akten-filterleiste">${aktenFilterleiste("akten")}</div>
      ${list.length ? html`<ul class="akten-verzeichnis-liste card" data-scroll="akten-list">${list.map(akteVerzeichnisZeile)}</ul>`
        : html`<div class="card empty-state"><h2>Keine Akten gefunden</h2><p>Suche oder Filter ändern.</p></div>`}
    </div>`;
};

// ---------- Akten-Switcher: Slide-over von links (eigener Top-Layer, außerhalb von #main) ----------
function aktenDrawer() {
  let d = document.getElementById("akten-drawer");
  if (d) return d;
  d = document.createElement("dialog");
  d.id = "akten-drawer";
  d.className = "akten-drawer";
  d.setAttribute("aria-label", "Akte wechseln");
  d.innerHTML = `<div class="drawer-kopf"><h2>Akte wechseln</h2><button type="button" class="btn ghost icon-only" data-drawer-zu aria-label="Schließen">✕</button></div>
    <div class="drawer-filter toolbar"></div><div class="list-count drawer-zahl"></div><div class="drawer-liste list-scroll"></div>`;
  document.body.append(d);
  // Klick auf den Backdrop (= auf das Dialog-Element selbst) oder auf eine Akte schließt
  d.addEventListener("click", (e) => {
    if (e.target === d || e.target.closest("[data-drawer-zu]") || e.target.closest("a.item[href]")) d.close();
  });
  // Esc schließt immer – auch wenn das Suchfeld den Fokus hat (dort leert Esc sonst nur die Suche)
  d.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); d.close(); }
  });
  d.addEventListener("close", () => {
    const btn = document.querySelector(".akten-switcher");
    if (btn) { btn.setAttribute("aria-expanded", "false"); btn.focus({ preventScroll: true }); }
  });
  return d;
}

function aktenDrawerListe() {
  const d = document.getElementById("akten-drawer");
  if (!d || !d.open) return;
  const r = parseRoute();
  const list = gefilterteAkten();
  d.querySelector(".drawer-zahl").textContent = `${list.length} ${list.length === 1 ? "Akte" : "Akten"}`;
  d.querySelector(".drawer-liste").innerHTML = String(list.length
    ? html`<ul class="item-list">${list.map((a) => html`<li>${akteListItem(a, r.id)}</li>`)}</ul>`
    : html`<p class="empty center">Keine Akten gefunden.</p>`);
  const aktiv = d.querySelector("a.item.active");
  if (aktiv && !d.dataset.gescrollt) { aktiv.scrollIntoView({ block: "center" }); d.dataset.gescrollt = "1"; }
}

function aktenDrawerOeffnen() {
  const d = aktenDrawer();
  d.querySelector(".drawer-filter").innerHTML = String(aktenFilterleiste("drawer"));
  delete d.dataset.gescrollt;
  if (!d.open) d.showModal();
  aktenDrawerListe();
  const btn = document.querySelector(".akten-switcher");
  if (btn) btn.setAttribute("aria-expanded", "true");
  const q = d.querySelector("#drawer-q");
  if (q && matchMedia("(pointer: fine)").matches) q.focus();
}

RENDER_HOOKS.push((route) => {
  const d = document.getElementById("akten-drawer");
  if (!d || !d.open) return;
  if (route.page !== "akten" || !route.id) d.close();
  else aktenDrawerListe();
});

ACTIONS["akten-switcher"] = () => aktenDrawerOeffnen();

// Tastenkürzel in einer geöffneten Akte: [ öffnet den Akten-Switcher
document.addEventListener("keydown", (e) => {
  if (!state.loaded || e.metaKey || e.ctrlKey || e.altKey || e.key !== "[") return;
  if (e.target.closest("input, textarea, select, [contenteditable]") || document.querySelector("dialog[open]")) return;
  const r = parseRoute();
  if (r.page !== "akten" || !r.id) return;
  e.preventDefault();
  aktenDrawerOeffnen();
}, true);

// Reiterleiste: weicher Verlauf rechts, solange es dort noch weitergeht
function reiterFadePruefen() {
  document.querySelectorAll("#main .fall-tabs").forEach((leiste) => {
    const wrap = leiste.parentElement;
    if (!wrap || !wrap.classList.contains("reiter-fade")) return;
    const pruefen = () => wrap.classList.toggle("mehr-rechts", leiste.scrollLeft + leiste.clientWidth < leiste.scrollWidth - 2);
    if (!leiste.dataset.fade) { leiste.dataset.fade = "1"; leiste.addEventListener("scroll", pruefen, { passive: true }); }
    pruefen();
  });
}
RENDER_HOOKS.push((route) => { if (route.page === "akten" && route.id) reiterFadePruefen(); });
window.addEventListener("resize", () => { if (parseRoute().page === "akten") reiterFadePruefen(); });

// Höhe des klebenden Aktenkopfs merken: Die Aktendaten-Spalte klebt darunter
function fallKopfMessen() {
  const k = document.querySelector(".fall-kopf");
  if (k) k.closest(".akte-detail").style.setProperty("--fall-kopf-h", `${k.offsetHeight}px`);
}
RENDER_HOOKS.push(fallKopfMessen);
window.addEventListener("resize", fallKopfMessen);

INPUTS["akten-filter"] = (el) => { ui.akten[el.dataset.key] = el.value; scheduleRender(); };
CHANGES["akten-filter"] = (el) => {
  ui.akten[el.dataset.key] = el.type === "checkbox" ? el.checked : el.value;
  scheduleRender();
};

// ---------- Icons ----------
const AKTE_ICON = {
  liste: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9.5 4.5v15" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  dokument: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v4h4M12 11v6M9 14h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  mehr: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="18.5" cy="12" r="1.7" fill="currentColor"/></svg>',
  wiedervorlage: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  drucken: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3.5h10V9M7 17H4.5A1.5 1.5 0 0 1 3 15.5v-5A1.5 1.5 0 0 1 4.5 9h15a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17M7 14h10v6.5H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3.5-3.5a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3.5 3.5a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  arbeitsbereich: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  auge: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  bearbeiten: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  checkliste: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  schloss: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  kopieren: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  loeschen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10.5 11v5M13.5 11v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
const icon = (name) => new SafeHtml(AKTE_ICON[name]);

// ---------- Menü „Weitere Aktionen“ (⋯) ----------
function menuePunkt(action, id, iconName, label, extra = "") {
  return html`<button type="button" role="menuitem" class="menue-punkt ${extra}" data-action="${action}" data-id="${id}">${icon(iconName)}<span>${label}</span></button>`;
}

function mehrMenue(a) {
  const statusPunkt = (st) => html`<button type="button" role="menuitemradio" aria-checked="${a.status === st}" class="menue-punkt ${a.status === st ? "aktiv" : ""}"
      data-action="akte-status-setzen" data-id="${a.id}" data-status="${st}"><span class="status-punkt-menue ${statusClass(st)}"></span><span>${st}</span>${a.status === st ? html`<span class="menue-haken">✓</span>` : ""}</button>`;
  return html`
    <details class="mehr">
      <summary class="btn icon-only" aria-label="Weitere Aktionen" title="Weitere Aktionen">${icon("mehr")}</summary>
      <div class="mehr-menue" role="menu">
        ${menuePunkt("akte-bearbeiten", a.id, "bearbeiten", "Akte bearbeiten")}
        ${menuePunkt("ablauf-starten", a.id, "checkliste", "Checklisten-Vorlage starten")}
        ${menuePunkt("wiedervorlage", a.id, "wiedervorlage", "Wiedervorlage anlegen")}
        ${darf("akten_schreiben") ? html`<hr><div class="menue-titel">Status ändern</div>${OPTIONEN.status.map(statusPunkt)}` : ""}
        <hr>
        ${menuePunkt("aktenblatt", a.id, "drucken", "Aktenblatt drucken")}
        ${menuePunkt("akte-link", a.id, "link", "Link kopieren")}
        ${darf("ki_assistent") ? menuePunkt("nw-mit-akte", a.id, "arbeitsbereich", "Im Nigel-Arbeitsbereich öffnen") : ""}
        ${darf("akten_loeschen") ? html`<hr>${menuePunkt("akte-loeschen", a.id, "loeschen", "Akte löschen", "danger")}` : ""}
      </div>
    </details>`;
}

// Menü schließen: bei Klick auf einen Eintrag, außerhalb oder mit Escape
document.addEventListener("click", (e) => {
  document.querySelectorAll("details.mehr[open]").forEach((d) => {
    if (!d.contains(e.target) || e.target.closest(".menue-punkt")) d.open = false;
  });
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  document.querySelectorAll("details.mehr[open]").forEach((d) => { d.open = false; d.querySelector("summary").focus(); });
});

// ---------- Aktendaten (rechte Spalte; auf Tablet/Handy aufklappbar über den Reitern) ----------
function eckdaten(a) {
  const m = byId("mandanten", a.mandant_id);
  const st = aufgabenStand(a.id);
  return [
    ["Mandant", m ? html`<a href="#/mandanten/${m.id}">${m.name}</a>${m.telefon ? html`<br><span class="small muted">${m.telefon}</span>` : ""}` : a.client || html`<span class="muted">ohne Mandant</span>`],
    ["Gegenpartei", a.opponent || "–"],
    ["Mandatsart", [a.typ, a.area].filter(Boolean).join(" · ") || "–"],
    ["Priorität", a.prioritaet === "Dringend" || a.prioritaet === "Hoch" ? prioBadge(a.prioritaet) : a.prioritaet || "Normal"],
    ["Zuständig", personName(a.zustaendig_id, a.lawyer || "–")],
    ["Az. Polizei / StA / Gericht", a.az_extern ? html`<span class="mono">${a.az_extern}</span>` : "–"],
    ...(a.in_haft ? [["Haft", html`<span class="danger-text"><strong>In Haft</strong>${a.haft_bis ? html` bis ${fmt.datumZeit(a.haft_bis)} (${fmt.bis(a.haft_bis)})` : ""}</span>
      <div><button class="btn small" data-action="haft-ende" data-id="${a.id}">Ist entlassen</button></div>`]] : []),
    ["Checkliste", st.gesamt ? html`<a class="spiegel-fortschritt" href="#/akten/${a.id}/termine">${fortschrittBalken(a.id)}</a>`
      : html`<span class="muted">keine Aufgaben</span>`],
    ["Ergebnis", a.ergebnis ? html`<span class="${ERFOLGE.includes(a.ergebnis) ? "ok-text" : ""}"><strong>${a.ergebnis}</strong></span>${a.ergebnis_datum ? html` <span class="small muted">${fmt.datum(a.ergebnis_datum)}</span>` : ""}
      ${a.ergebnis_details ? html`<div class="small pre">${a.ergebnis_details}</div>` : ""}<button class="link-btn small" data-action="akte-abschluss" data-id="${a.id}">ändern</button>`
      : a.status === "Geschlossen" ? html`<button class="btn small gold" data-action="akte-abschluss" data-id="${a.id}">Ergebnis eintragen</button>` : html`<span class="muted">offen</span>`],
    ["Zuletzt aktiv", html`${fmt.relativ(zuletztAktiv(a))}${liegenGeblieben(a) ? html`<br><span class="small danger-text">liegt seit ${liegtSeitTagen(a)} Tagen</span>` : ""}`],
    ["Angelegt", html`${fmt.datum(a.created_at)} · ${personName(a.created_by)}`],
  ];
}

function metadatenListe(a) {
  return html`<dl class="spiegel-daten">${eckdaten(a).map(([dt, dd]) => html`<div><dt>${dt}</dt><dd>${dd}</dd></div>`)}</dl>`;
}

// Rechte Spalte: dauerhaft sichtbar, klebt beim Scrollen
function aktenspiegel(a) {
  return html`
    <aside class="aktenspiegel" aria-label="Aktendaten">
      <div class="spiegel-kopf"><h3 class="spiegel-titel">Aktendaten</h3>
        <button class="link-btn small" data-action="akte-bearbeiten" data-id="${a.id}">Bearbeiten</button></div>
      ${metadatenListe(a)}
    </aside>`;
}

// ---------- Sachverhalt als „Fall-Briefing“ über den Reitern ----------
// Lesemodus mit 3 Zeilen + „Mehr lesen“, Leerzustand als Ghost-Zeile, Inline-Bearbeitung.
ui.akten.svEdit = null;          // Akte, deren Sachverhalt gerade bearbeitet wird
ui.akten.svOffen = new Set();    // aufgeklappte Sachverhalte
const svDraftId = (id) => `sv-text-${id}`;

function sachverhaltKarte(a) {
  const schreiben = darf("akten_schreiben");
  const text = String(a.summary || "");
  const edit = ui.akten.svEdit === a.id && schreiben;
  const offen = ui.akten.svOffen.has(a.id);
  if (!text.trim() && !edit && !schreiben) return "";
  const draftId = svDraftId(a.id);
  return html`<section class="akten-sachverhalt-card ${offen ? "is-expanded" : ""} ${edit ? "is-editing" : ""}" data-sv="${a.id}" aria-label="Sachverhalt">
    <div class="sv-kopf">
      <h3 class="sv-label">Sachverhalt</h3>
      ${schreiben && !edit && text.trim() ? html`<button type="button" class="sv-bearbeiten" data-action="sv-bearbeiten" data-id="${a.id}" aria-label="Sachverhalt bearbeiten">✎ Bearbeiten</button>` : ""}
    </div>
    ${edit ? html`
      <textarea id="${draftId}" class="akten-sachverhalt-input" data-input="draft" data-sv-input="${a.id}" rows="4"
        placeholder="Was ist passiert? Was wird dem Mandanten vorgeworfen? Was sagt er selbst?" aria-label="Sachverhalt">${ui.drafts[draftId] ?? text}</textarea>
      <div class="sv-aktionen">
        <button type="button" class="btn small primary" data-action="sv-speichern" data-id="${a.id}">Speichern</button>
        <button type="button" class="btn small ghost" data-action="sv-abbrechen" data-id="${a.id}">Abbrechen</button>
        <span class="small muted sv-tipp">Strg + Enter speichert · Esc bricht ab</span>
      </div>`
    : text.trim() ? html`
      <div class="akten-sachverhalt-text pre">${text}</div>
      <button type="button" class="link-btn sv-mehr" data-action="sv-mehr" data-id="${a.id}" hidden>${offen ? "Weniger anzeigen ↑" : "Mehr lesen ↓"}</button>`
    : html`<button type="button" class="akten-sachverhalt-ghost" data-action="sv-bearbeiten" data-id="${a.id}">+ Sachverhalt erfassen …</button>`}
  </section>`;
}

function svAutoHoehe(ta) {
  ta.style.height = "auto";
  ta.style.height = `${Math.max(90, ta.scrollHeight + 2)}px`;
}

function sachverhaltPruefen() {
  document.querySelectorAll("#main .akten-sachverhalt-card").forEach((card) => {
    const t = card.querySelector(".akten-sachverhalt-text");
    const btn = card.querySelector(".sv-mehr");
    if (t && btn) btn.hidden = !(card.classList.contains("is-expanded") || t.scrollHeight > t.clientHeight + 2);
    const ta = card.querySelector(".akten-sachverhalt-input");
    if (ta) svAutoHoehe(ta);
  });
}
RENDER_HOOKS.push((route) => { if (route.page === "akten" && route.id) sachverhaltPruefen(); });
window.addEventListener("resize", () => { if (parseRoute().page === "akten") sachverhaltPruefen(); });

function svBeenden(id) {
  ui.akten.svEdit = null;
  delete ui.drafts[svDraftId(id)];
  render();
}

async function svSpeichern(id) {
  const ta = document.getElementById(svDraftId(id));
  const a = byId("akten", id);
  if (!ta || !a) return;
  const wert = ta.value.trim();
  if (wert === String(a.summary || "").trim()) { svBeenden(id); return; }
  const ok = await attempt(() => updateRow("akten", id, { summary: wert || null }), "Sachverhalt gespeichert");
  if (ok !== undefined) svBeenden(id);
}

Object.assign(ACTIONS, {
  "sv-bearbeiten": (d) => {
    ui.akten.svEdit = d.id;
    render();
    const ta = document.getElementById(svDraftId(d.id));
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  },
  "sv-abbrechen": (d) => svBeenden(d.id),
  "sv-speichern": (d) => svSpeichern(d.id),
  "sv-mehr": (d) => {
    const auf = !ui.akten.svOffen.has(d.id);
    if (auf) ui.akten.svOffen.add(d.id); else ui.akten.svOffen.delete(d.id);
    const card = document.querySelector(`#main .akten-sachverhalt-card[data-sv="${CSS.escape(d.id)}"]`);
    if (!card) { render(); return; }
    card.classList.toggle("is-expanded", auf);
    const btn = card.querySelector(".sv-mehr");
    if (btn) btn.textContent = auf ? "Weniger anzeigen ↑" : "Mehr lesen ↓";
    sachverhaltPruefen();
  },
});

document.addEventListener("input", (e) => {
  if (e.target.matches && e.target.matches(".akten-sachverhalt-input")) svAutoHoehe(e.target);
});
document.addEventListener("keydown", (e) => {
  const ta = e.target.closest && e.target.closest(".akten-sachverhalt-input");
  if (!ta) return;
  const id = ta.dataset.svInput;
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); svSpeichern(id); }
  else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); svBeenden(id); }
});

// ---------- Detail: klebender Aktenkopf + Inhalt | Aktendaten ----------
function renderAkteDetail(a, sub) {
  const gewuenscht = AKTE_TAB_ALIAS[sub || ""] || sub;
  const tab = AKTE_TABS.some((t) => t.key === gewuenscht) ? gewuenscht : "verlauf";
  const k = konflikte(a);
  const m = byId("mandanten", a.mandant_id);
  const wer = typeof betrachter === "function" ? betrachter(a.id) : [];
  const body = {
    verlauf: tabVerlauf, vorwuerfe: tabVorwuerfe, beteiligte: tabBeteiligte, beweise: tabBeweise,
    termine: tabTermineAufgaben, rechnungen: tabRechnungen, historie: tabHistorie,
  }[tab];

  const st = aufgabenStand(a.id);
  return html`
    <nav class="akte-navi" aria-label="Aktennavigation">
      <a class="zurueck-link" href="#/akten">← Alle Akten</a>
      <button type="button" class="akten-switcher" data-action="akten-switcher" aria-haspopup="dialog" aria-expanded="false"
        title="Akte wechseln ([)">${icon("checkliste")}<span class="mono">${a.number}</span><span aria-hidden="true">▾</span></button>
    </nav>
    <div class="detail-card akte-detail ton-${akteTon(a)}">
      <header class="fall-kopf">
        <div class="fall-titel">
          <div class="fall-zeile">
            <button type="button" class="aktenzeichen" data-action="az-kopieren" data-az="${a.number}" title="Aktenzeichen kopieren" aria-label="Aktenzeichen ${a.number} kopieren">${a.number}${icon("kopieren")}</button>
            <span class="status-pill ${AKTE_STATUS_TON[a.status] || "neutral"}">${a.status}</span>
            ${a.in_haft ? html`<span class="badge haft">In Haft</span>` : ""}
            ${prioBadge(a.prioritaet)}
            ${st.gesamt ? html`<a class="kopf-fortschritt" href="#/akten/${a.id}/termine">${fortschrittBalken(a.id)}</a>` : ""}
          </div>
          <h2>${a.title}</h2>
          <div class="fall-mandant">${m ? html`<a href="#/mandanten/${m.id}">${m.name}</a>` : a.client || "Ohne Mandant"}${a.opponent ? html`<span class="muted"> gegen ${a.opponent}</span>` : ""}</div>
        </div>
        <div class="fall-aktionen">
          ${wer.length ? html`<span class="avatars praesenz" title="Gerade auch geöffnet von ${wer.map((id) => personName(id)).join(", ")} – kurz absprechen, damit nichts überschrieben wird">${wer.slice(0, 3).map((id) => avatar(id))}${wer.length > 3 ? html`<span class="avatar mehr">+${wer.length - 3}</span>` : ""}</span>` : ""}
          <button class="btn primary" data-action="dokument-waehlen" data-id="${a.id}">${icon("dokument")}<span>Dokument erzeugen</span></button>
          <button class="btn nigel" data-action="ki-oeffnen" data-id="${a.id}" title="Nigel kennt diese Akte (K)"><img class="btn-nigel-bild" src="assets/nigel.svg" alt=""><span>Mit Nigel bearbeiten</span></button>
          ${mehrMenue(a)}
        </div>
      </header>
      ${k.length ? html`
        <div class="konflikt-banner" role="alert">
          <strong>⚠ Möglicher Interessenkonflikt</strong>
          <ul>${k.map((c) => html`<li><a href="#/akten/${c.akte.id}"><span class="mono">${c.akte.number}</span> · ${c.akte.title}</a> – ${c.grund} (${c.akte.status})</li>`)}</ul>
        </div>` : ""}
      <div class="akte-rumpf">
        <div class="akte-haupt">
          <details class="meta-zusammenfassung">
            <summary><span class="meta-titel">Aktendaten</span><span class="muted small">${[mandantName(a), personName(a.zustaendig_id, ""), a.az_extern].filter(Boolean).join(" · ")}</span>${st.gesamt ? fortschrittBalken(a.id) : ""}</summary>
            ${metadatenListe(a)}
            <button class="btn small" data-action="akte-bearbeiten" data-id="${a.id}" style="margin-top:10px">Akte bearbeiten</button>
          </details>
          ${sachverhaltKarte(a)}
          <div class="reiter-fade"><nav class="tabs fall-tabs" aria-label="Bereiche der Akte">
            ${AKTE_TABS.map((t) => {
              const n = t.count ? t.count(a.id) : 0;
              return html`<a href="#/akten/${a.id}/${t.key}" class="${t.key === tab ? "active" : ""}"${t.key === tab ? html` aria-current="page"` : ""}><span class="tab-lang">${t.label}</span><span class="tab-kurz">${t.kurz || t.label}</span>${n ? html`<span class="count">${n}</span>` : ""}</a>`;
            })}
          </nav></div>
          <div class="tab-body">${body(a)}</div>
        </div>
        ${aktenspiegel(a)}
      </div>
    </div>`;
}

// ---------- Reiter: Tatvorwürfe & Strafrechner ----------
function tabVorwuerfe(a) {
  return html`
    <div class="card-head">
      <p class="muted small" style="margin:0">Aus dem Strafkatalog – die Spanne der möglichen Haft und Geldstrafe (Mindest- bis Höchstmaß) wird automatisch zusammengerechnet.</p>
      <button class="btn small primary" data-action="vorwurf-hinzufuegen" data-id="${a.id}">+ Vorwurf</button>
    </div>
    ${vorwurfTabelle(a)}`;
}

function vorwurfTabelle(a) {
  const list = a.vorwuerfe || [];
  if (!list.length) return html`<p class="empty">${darf("akten_schreiben") ? "Noch keine Tatvorwürfe. Über „+ Vorwurf“ aus dem Strafkatalog hinzufügen – die Spanne der möglichen Strafe wird automatisch ausgerechnet." : "Keine Tatvorwürfe erfasst."}</p>`;
  const rahmen = vorwurfStrafrahmen(list);
  return html`
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Paragraph</th><th>Vorwurf</th><th>Anzahl</th><th class="num">Haft</th><th class="num">Geldstrafe</th><th></th></tr></thead>
      <tbody>${list.map((v, i) => { const r = vorwurfRahmen(v); return html`
        <tr>
          <td class="nowrap">${v.paragraph || "–"}</td>
          <td>${v.titel}${r.wahlweise ? html` <span class="badge art" title="Das Gericht kann statt der Haft eine Geldstrafe verhängen">oder Geldstrafe</span>` : ""}${r.ordnungswidrigkeit ? html` <span class="badge art">Ordnungswidrigkeit</span>` : ""}</td>
          <td><span class="stepper">
            <button data-action="vorwurf-anzahl" data-id="${a.id}" data-i="${i}" data-delta="-1" title="weniger">−</button>
            <span>${v.anzahl || 1}</span>
            <button data-action="vorwurf-anzahl" data-id="${a.id}" data-i="${i}" data-delta="1" title="mehr">+</button>
          </span></td>
          <td class="num">${vorwurfZeileText(r, v.anzahl, "haft")}</td>
          <td class="num">${vorwurfZeileText(r, v.anzahl, "geld")}</td>
          <td class="row-actions"><button class="icon-btn" data-action="vorwurf-entfernen" data-id="${a.id}" data-i="${i}" title="Entfernen">✕</button></td>
        </tr>`; })}
      </tbody>
    </table></div>
    <div class="sum-bar strafrahmen">
      <span class="sum-label">Mögliche Bestrafung (Spanne)</span>
      ${rahmen.haft ? spanneBlock("Haft", rahmen.haft, "haft") : ""}
      ${rahmen.geld ? spanneBlock("Geldstrafe", rahmen.geld, "geld") : ""}
    </div>
    <ul class="strafrahmen-hinweise">${strafrahmenHinweise(rahmen).map((t) => html`<li>${t}</li>`)}</ul>`;
}

// ---------- Tab: Verlauf ----------
// Art eines Verlaufseintrags: intern · für den Mandanten sichtbar · Nachricht vom Mandanten · von Nigel
function verlaufTyp(e) {
  if (e.mandant_id) return "mandant";
  if (e.von_nigel) return "nigel";
  if (e.fuer_mandant) return "sichtbar";
  return "intern";
}
const VERLAUF_TYP_TEXT = {
  intern: "Intern – nur für die Kanzlei", sichtbar: "Für den Mandanten sichtbar",
  mandant: "Nachricht vom Mandanten", nigel: "Von Nigel angelegt",
};

function tabVerlauf(a) {
  const textId = `draft-${a.id}`, artId = `art-${a.id}`, wichtigId = `wichtig-${a.id}`, mandantId = `fuer-mandant-${a.id}`;
  const entries = kinder("eintraege", a.id).sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
  const sichtbar = !!ui.drafts[mandantId];
  return html`
    <form class="entry-form ${sichtbar ? "fuer-mandant" : ""}" data-submit="eintrag" data-id="${a.id}">
      <textarea id="${textId}" name="text" rows="3" data-input="draft" data-mention required
        placeholder="Neuer Eintrag … z. B. Gespräch mit Mandant, Anruf bei der StA. Mit @Name holst du Kollegen dazu.">${ui.drafts[textId] || ""}</textarea>
      <div class="entry-leiste">
        <div class="entry-optionen">
          <select id="${artId}" name="art" data-input="draft" aria-label="Art des Eintrags">
            ${OPTIONEN.eintragArt.map((o) => html`<option ${(ui.drafts[artId] || "Notiz") === o ? "selected" : ""}>${o}</option>`)}
          </select>
          <label class="check"><input type="checkbox" id="${wichtigId}" name="wichtig" data-input="draft" ${ui.drafts[wichtigId] ? "checked" : ""}> Wichtig</label>
          <label class="sichtbar-schalter" title="Im Mandantenportal sichtbar – der Mandant wird benachrichtigt">
            <input type="checkbox" role="switch" id="${mandantId}" name="fuer_mandant" data-change="sichtbar-schalter" ${sichtbar ? "checked" : ""}>
            <span class="schalter" aria-hidden="true"></span>
            ${icon("auge")}<span>Für Mandant sichtbar</span>
          </label>
          <span class="muted small erw-tipp">Tipp: <strong>@</strong> erwähnt Kollegen</span>
        </div>
        <button class="btn primary" type="submit">${sichtbar ? "An Mandanten freigeben" : "Eintragen"}</button>
      </div>
      <p class="entry-hinweis" ${sichtbar ? "" : "hidden"}>${icon("auge")} Dieser Eintrag erscheint im Mandantenportal – der Mandant wird benachrichtigt.</p>
    </form>
    ${entries.length ? html`<ul class="timeline verlauf">${entries.map((e) => {
      const typ = verlaufTyp(e);
      return html`
      <li class="eintrag typ-${typ} ${e.wichtig ? "wichtig" : ""}" data-live="eintraege:${e.id}">
        <div class="head">
          <span class="typ-zeichen" title="${VERLAUF_TYP_TEXT[typ]}" aria-label="${VERLAUF_TYP_TEXT[typ]}">${typ === "intern" ? icon("schloss") : typ === "sichtbar" ? icon("auge") : typ === "mandant" ? icon("chat") : nigelAvatar()}</span>
          ${typ === "mandant" ? html`<span class="badge mandant">Nachricht vom Mandanten</span>` : html`<span class="badge art">${e.art || "Notiz"}</span>`}
          ${typ === "sichtbar" ? html`<span class="badge sichtbar">${icon("auge")}Mandant sichtbar</span>` : ""}
          ${e.wichtig ? html`<span class="badge alert">Wichtig</span>` : ""}
          <strong>${typ === "nigel" ? `Nigel · im Auftrag von ${personName(e.author)}` : eintragAutor(e)}</strong>
          <span class="zeit">${fmt.datumZeit(e.created_at)}</span>
          ${(e.erwaehnt || []).length ? html`<span class="erw-an" title="Erwähnt und benachrichtigt">→ ${e.erwaehnt.map((id) => personName(id)).join(", ")}</span>` : ""}
        </div>
        <p>${mitErwaehnungen(e.text)}</p>
        <div class="tools">
          ${e.mandant_id ? "" : html`<button class="icon-btn ${e.fuer_mandant ? "an" : ""}" title="${e.fuer_mandant ? "Für den Mandanten wieder verbergen" : "Für den Mandanten sichtbar machen"}" aria-label="${e.fuer_mandant ? "Für den Mandanten verbergen" : "Für den Mandanten sichtbar machen"}" data-action="eintrag-fuer-mandant" data-id="${e.id}">${icon("auge")}</button>
          <button class="icon-btn" title="Bearbeiten" aria-label="Eintrag bearbeiten" data-action="eintrag-bearbeiten" data-id="${e.id}">✎</button>`}
          <button class="icon-btn" title="Löschen" aria-label="Eintrag löschen" data-action="eintrag-loeschen" data-id="${e.id}">✕</button>
        </div>
      </li>`;
    })}</ul>` : html`<p class="empty">Noch keine Einträge. Halte hier alles fest, was im Fall passiert.</p>`}`;
}

// „Für Mandant sichtbar“: Formular sofort deutlich markieren (ohne Neuzeichnen, damit der Text bleibt)
CHANGES["sichtbar-schalter"] = (el) => {
  ui.drafts[el.id] = el.checked;
  const form = el.closest("form");
  form.classList.toggle("fuer-mandant", el.checked);
  form.querySelector(".entry-hinweis").hidden = !el.checked;
  form.querySelector('[type="submit"]').textContent = el.checked ? "An Mandanten freigeben" : "Eintragen";
};

INPUTS.draft = (el) => { ui.drafts[el.id] = el.type === "checkbox" ? el.checked : el.value; };

SUBMITS.eintrag = async (form) => {
  const id = form.dataset.id;
  const text = form.elements.text.value.trim();
  if (!text) return;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  const erwaehnt = erwaehnteIn(text);
  const ok = await attempt(() => insertRow("eintraege", {
    akte_id: id, text, art: form.elements.art.value, wichtig: form.elements.wichtig.checked,
    ...(form.elements.fuer_mandant.checked ? { fuer_mandant: true } : {}),
    ...(erwaehnt.length ? { erwaehnt } : {}),
  }));
  button.disabled = false;
  if (ok) {
    delete ui.drafts[`draft-${id}`];
    delete ui.drafts[`wichtig-${id}`];
    delete ui.drafts[`fuer-mandant-${id}`];
    form.elements.text.value = "";
    form.elements.wichtig.checked = false;
    form.elements.fuer_mandant.checked = false;
    const andere = erwaehnt.filter((x) => x !== state.me.id);
    toast(andere.length ? `Eintrag gespeichert – ${andere.map((x) => personName(x)).join(", ")} benachrichtigt` : "Eintrag gespeichert");
  }
};

// ---------- Tab: Beteiligte ----------
function tabBeteiligte(a) {
  const list = kinder("beteiligte", a.id);
  const m = byId("mandanten", a.mandant_id);
  const rollen = [...OPTIONEN.rolle, ...new Set(list.map((b) => b.rolle).filter((r) => !OPTIONEN.rolle.includes(r)))];
  return html`
    <div class="card-head">
      <p class="muted small" style="margin:0">Zeugen, Beamte, Richter, Gegenseite – alle Personen rund um den Fall.</p>
      <button class="btn small primary" data-action="beteiligter-neu" data-akte="${a.id}">+ Person</button>
    </div>
    <div class="group-title">Mandant & Gegenpartei</div>
    <div class="cards">
      <div class="mini-card"><div class="meta">Mandant</div><div class="title">${m ? html`<a href="#/mandanten/${m.id}">${m.name}</a>` : a.client || html`<span class="muted">ohne Mandant</span>`}</div>
        ${m && m.telefon ? html`<div class="meta">${m.telefon}</div>` : ""}</div>
      ${a.opponent ? html`<div class="mini-card"><div class="meta">Gegenpartei (aus der Akte)</div><div class="title">${a.opponent}</div></div>` : ""}
    </div>
    ${rollen.map((rolle) => {
      const people = list.filter((b) => b.rolle === rolle);
      if (!people.length) return "";
      return html`<div class="group-title">${rolle}</div>
        <div class="cards">${people.map((b) => html`
          <div class="mini-card">
            <div class="title">${b.name}</div>
            ${b.kontakt ? html`<div class="meta">${b.kontakt}</div>` : ""}
            ${b.notiz ? html`<p>${b.notiz}</p>` : ""}
            <div class="tools"><button class="icon-btn" title="Bearbeiten" data-action="beteiligter-bearbeiten" data-id="${b.id}">✎</button></div>
          </div>`)}</div>`;
    })}
    ${list.length ? "" : html`<p class="empty">Noch keine weiteren Personen erfasst.</p>`}
    ${aktePortalBlock(a)}`;
}

function beteiligterFields() {
  return [
    { name: "rolle", label: "Rolle", type: "select", options: OPTIONEN.rolle, required: true, half: true },
    { name: "name", label: "Name", required: true, half: true, placeholder: "z. B. Officer J. Smith" },
    { name: "kontakt", label: "Kontakt / Dienstnummer", placeholder: "Telefon, Dienstnummer, Discord …" },
    { name: "notiz", label: "Notiz", type: "textarea", rows: 3, placeholder: "Was weiß die Person? Wie verhält sie sich?" },
  ];
}

// ---------- Tab: Beweise ----------
function tabBeweise(a) {
  const list = kinder("beweise", a.id).sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
  return html`
    <div class="card-head">
      <p class="muted small" style="margin:0">Screenshots, Clips, Bodycam, Aussagen – am besten als Link (Imgur, Medal, Discord, YouTube …).</p>
      <button class="btn small primary" data-action="beweis-neu" data-akte="${a.id}">+ Beweismittel</button>
    </div>
    ${list.length ? html`<div class="cards">${list.map((b) => {
      const url = safeUrl(b.link);
      return html`
        <div class="mini-card">
          <div class="meta"><span class="badge gold">${b.art}</span>${b.fuer_mandant ? html` <span class="badge sichtbar" title="Im Mandantenportal sichtbar">für Mandant sichtbar</span>` : ""} · ${fmt.datum(b.created_at)} · ${personName(b.created_by)}</div>
          <div class="title" style="margin-top:4px">${b.titel}</div>
          ${url ? html`<a href="${url}" target="_blank" rel="noopener noreferrer" class="small">Öffnen ↗</a>` : ""}
          ${url && isImageUrl(url) ? html`<a href="${url}" target="_blank" rel="noopener noreferrer"><img class="thumb" src="${url}" alt="${b.titel}" loading="lazy"></a>` : ""}
          ${b.beschreibung ? html`<p>${b.beschreibung}</p>` : ""}
          <div class="tools"><button class="icon-btn" title="Bearbeiten" data-action="beweis-bearbeiten" data-id="${b.id}">✎</button></div>
        </div>`;
    })}</div>` : html`<p class="empty">Noch keine Beweismittel.</p>`}`;
}

// "für Mandant sichtbar" nur mitschicken, wenn es gesetzt ist (oder vorher gesetzt war)
function ohneFalschesSichtbar(v) {
  const { fuer_mandant, ...rest } = v;
  return fuer_mandant ? v : rest;
}

function beweisFields() {
  return [
    { name: "art", label: "Art", type: "select", options: OPTIONEN.beweisArt, required: true, half: true },
    { name: "titel", label: "Bezeichnung", required: true, half: true, placeholder: "z. B. Dashcam Kreuzung Vinewood" },
    { name: "link", label: "Link", type: "url", placeholder: "https://…", help: "Bilder (.png/.jpg) werden direkt als Vorschau angezeigt." },
    { name: "beschreibung", label: "Beschreibung", type: "textarea", rows: 3, placeholder: "Was ist zu sehen? Warum ist es wichtig?" },
    { name: "fuer_mandant", label: "Für Mandant sichtbar (Mandantenportal, der Mandant wird benachrichtigt)", type: "checkbox" },
  ];
}

// ---------- Tab: Termine / Aufgaben / Rechnungen ----------
// Termine & Aufgaben in einem Reiter, mit Filter (Alle · Termine · Aufgaben)
function tabTermineAufgaben(a) {
  const filter = ui.akten.taFilter || "alle";
  const termine = kinder("termine", a.id).sort((x, y) => new Date(x.beginn) - new Date(y.beginn));
  const tOffen = termine.filter((t) => !t.erledigt);
  const tErledigt = termine.filter((t) => t.erledigt).reverse();
  const aufgaben = kinder("aufgaben", a.id);
  const aOffen = aufgaben.filter((t) => !t.erledigt).sort(sortAufgaben);
  const aErledigt = aufgaben.filter((t) => t.erledigt).sort((x, y) => new Date(y.erledigt_am || 0) - new Date(x.erledigt_am || 0));
  const chip = (k, l, n) => html`<button type="button" class="seg-tab ${filter === k ? "active" : ""}" aria-pressed="${filter === k}" data-action="ta-filter" data-f="${k}">${l}${n ? html`<span class="seg-n">${n}</span>` : ""}</button>`;
  const zeigeT = filter !== "aufgaben", zeigeA = filter !== "termine";
  const nErledigt = (zeigeT ? tErledigt.length : 0) + (zeigeA ? aErledigt.length : 0);
  return html`
    <div class="card-head">
      <div class="seg-tabs" role="group" aria-label="Filter">${chip("alle", "Alle", tOffen.length + aOffen.length)}${chip("termine", "Termine", tOffen.length)}${chip("aufgaben", "Aufgaben", aOffen.length)}</div>
      <div class="actions-row">
        <button class="btn small" data-action="ablauf-starten" data-id="${a.id}">Checkliste starten</button>
        <button class="btn small primary" data-action="termin-neu" data-akte="${a.id}">+ Termin</button>
      </div>
    </div>
    ${zeigeT ? html`
      <h3 class="group-title">Termine, Fristen & Wiedervorlagen</h3>
      ${tOffen.length ? html`<ul class="rows">${tOffen.map((t) => terminRow(t, { akte: false }))}</ul>` : html`<p class="empty">Keine offenen Termine.</p>`}` : ""}
    ${zeigeA ? html`
      <h3 class="group-title aufgaben-titel">Aufgaben ${aufgaben.length ? fortschrittBalken(a.id) : ""}</h3>
      ${aufgabeSchnellForm(a.id)}
      ${aOffen.length ? html`<ul class="rows">${aOffen.map((t) => aufgabeRow(t, { akte: false }))}</ul>` : html`<p class="empty">${aufgaben.length ? "Alle Aufgaben erledigt." : "Noch keine Aufgaben – einzeln anlegen oder eine Checkliste starten."}</p>`}` : ""}
    ${nErledigt ? html`<details class="erledigt-block"><summary class="group-title">Erledigt (${nErledigt})</summary>
      ${zeigeT && tErledigt.length ? html`<ul class="rows">${tErledigt.map((t) => terminRow(t, { akte: false }))}</ul>` : ""}
      ${zeigeA && aErledigt.length ? html`<ul class="rows">${aErledigt.map((t) => aufgabeRow(t, { akte: false }))}</ul>` : ""}
    </details>` : ""}`;
}

function tabRechnungen(a) {
  const list = state.rechnungen.filter((r) => r.akte_id === a.id).sort((x, y) => (y.nummer || "").localeCompare(x.nummer || ""));
  const offen = offeneRechnungSumme(list);
  return html`
    <div class="card-head">
      <p class="muted small" style="margin:0">${list.length ? html`Offen: <strong>${fmt.geld(offen)}</strong>` : "Noch keine Rechnungen zu dieser Akte."}</p>
      ${darf("rechnungen") ? html`<button class="btn small primary" data-action="rechnung-neu" data-akte="${a.id}">+ Rechnung</button>` : ""}
    </div>
    ${list.length ? rechnungTabelle(list, { akte: false }) : ""}`;
}

// ---------- Tab: Historie ----------
function tabHistorie(a) {
  const list = ui.historie[a.id];
  if (!list) {
    ladeHistorie(a.id);
    return html`<p class="empty">Historie wird geladen …</p>`;
  }
  return html`
    <p class="muted small" style="margin-top:0">Jede Änderung an dieser Akte – automatisch von der Datenbank aufgezeichnet.</p>
    ${list.length ? html`<ul class="rows">${list.map((p) => protokollZeile(p, { akte: false }))}</ul>` : html`<p class="empty">Noch keine Änderungen aufgezeichnet.</p>`}`;
}

async function ladeHistorie(id) {
  if (ui.historieLaedt === id) return;
  ui.historieLaedt = id;
  const { data, error } = await db.from("protokoll").select("*").eq("akte_id", id).order("id", { ascending: false }).limit(300);
  ui.historieLaedt = null;
  ui.historie[id] = error ? [] : data;
  if (error) toast(errorText(error), "error");
  scheduleRender();
}

// ---------- Akte anlegen / bearbeiten ----------
function akteFields() {
  return [
    { name: "title", label: "Titel / Betreff", required: true, placeholder: "z. B. Raub Fleeca Bank, Verkehrsunfall Vinewood Blvd." },
    { name: "mandant", label: "Mandant (optional)", half: true, placeholder: "Name – neu oder aus der Kartei",
      list: () => state.mandanten.map((m) => m.name).sort((x, y) => x.localeCompare(y, "de")),
      help: "Neue Namen kommen automatisch in die Mandantenkartei. Leer lassen für Akten ohne Mandant (z. B. interne Akten, Gutachten)." },
    { name: "opponent", label: "Gegenpartei", half: true, placeholder: "optional" },
    { name: "area", label: "Rechtsgebiet", type: "select", options: OPTIONEN.rechtsgebiet, half: true },
    { name: "typ", label: "Mandatsart", type: "select", options: OPTIONEN.mandatsart, half: true },
    { name: "status", label: "Status", type: "select", options: OPTIONEN.status, required: true, third: true },
    { name: "prioritaet", label: "Priorität", type: "select", options: OPTIONEN.prioritaet, required: true, third: true },
    { name: "zustaendig_id", label: "Zuständig", type: "select", options: teamOptions, third: true },
    { name: "az_extern", label: "Aktenzeichen Polizei / Staatsanwaltschaft / Gericht", placeholder: "z. B. LSPD-2026-0815" },
    { name: "summary", label: "Sachverhalt", type: "textarea", rows: 5, placeholder: "Was ist passiert? Was wird dem Mandanten vorgeworfen? Was sagt er selbst?" },
    { type: "section", label: "Haft" },
    { name: "in_haft", label: "Mandant ist in Haft / U-Haft", type: "checkbox", half: true },
    { name: "haft_bis", label: "Voraussichtlich bis", type: "datetime", half: true },
  ];
}

// Nur beim Anlegen: gleich eine Checkliste starten
function akteAblaufFeld() {
  return { type: "custom", name: "ablauf", label: "Ablauf starten (optional)",
    render: () => html`<select name="ablauf" id="f-ablauf">
        <option value="">— keinen —</option>
        ${ablaeufeSortiert().map((x) => html`<option value="${x.id}" data-rg="${x.rechtsgebiet || ""}" data-ma="${x.mandatsart || ""}">${x.name} (${schrittZusammenfassung(x.schritte)})</option>`)}
      </select>
      <small class="help" id="f-ablauf-hilfe">Legt die Aufgaben und Termine der Checkliste direkt für die zuständige Person an.</small>`,
    read: (form) => form.elements.ablauf.value || null };
}

async function mandantFuerName(name) {
  if (!(name || "").trim()) return null; // Akte ohne Mandant
  return findMandantByName(name) || insertRow("mandanten", { name: name.trim() });
}

function openAkteForm(akte, preset = {}) {
  const values = akte
    ? { ...akte, mandant: akte.mandant_id || akte.client ? mandantName(akte) : "" }
    : { status: "Offen", prioritaet: "Normal", area: "Strafrecht", zustaendig_id: state.me.id, ...preset };
  const mitAblauf = !akte && darf("termine_schreiben") && state.ablaeufe.length;
  // Passenden Ablauf hervorheben, sobald Rechtsgebiet/Mandatsart gewählt sind
  const ablaufHinweis = (form) => {
    const sel = form.elements.ablauf;
    if (!sel) return;
    const passend = [...sel.options].find((o) => o.value && (o.dataset.rg || o.dataset.ma)
      && (!o.dataset.rg || o.dataset.rg === form.elements.area.value) && (!o.dataset.ma || o.dataset.ma === form.elements.typ.value));
    [...sel.options].forEach((o) => { o.textContent = o.textContent.replace(/ ★$/, "") + (o === passend ? " ★" : ""); });
    $("f-ablauf-hilfe").textContent = passend
      ? `Passend: „${passend.textContent.replace(/ \(.*$/, "")}“ (★). Legt die Aufgaben und Termine direkt an.`
      : "Legt die Aufgaben und Termine der Checkliste direkt für die zuständige Person an.";
  };
  openForm({
    title: akte ? `Akte ${akte.number} bearbeiten` : "Neue Akte",
    fields: mitAblauf ? [...akteFields(), { type: "section", label: "Arbeitsablauf" }, akteAblaufFeld()] : akteFields(),
    values,
    wide: true,
    submitLabel: akte ? "Speichern" : "Akte anlegen",
    onMount: mitAblauf ? ablaufHinweis : null,
    onChange: mitAblauf ? (name, form) => { if (name === "area" || name === "typ") ablaufHinweis(form); } : null,
    onSubmit: async (v) => {
      const mandant = await mandantFuerName(v.mandant);
      const row = {
        title: v.title, client: mandant ? mandant.name : null, mandant_id: mandant ? mandant.id : null, opponent: v.opponent, area: v.area, typ: v.typ,
        status: v.status, prioritaet: v.prioritaet, zustaendig_id: v.zustaendig_id, az_extern: v.az_extern,
        summary: v.summary, in_haft: v.in_haft, haft_bis: v.in_haft ? v.haft_bis : null,
      };
      if (akte) {
        await updateRow("akten", akte.id, row);
        toast("Akte gespeichert");
      } else {
        const created = await insertRow("akten", row);
        go(`akten/${created.id}`);
        toast(`Akte ${created.number} angelegt`);
        if (konflikte(created).length) toast("Achtung: möglicher Interessenkonflikt – siehe Akte.", "error");
        const ablauf = v.ablauf && byId("ablaeufe", v.ablauf);
        if (ablauf) {
          const res = await attempt(() => ablaufStarten(created, ablauf, ablauf.schritte, created.zustaendig_id, ymd(new Date())));
          if (res !== undefined) toast(`Ablauf „${ablauf.name}“ gestartet`);
        }
      }
    },
  });
}

function openAbschlussForm(akte) {
  openForm({
    title: `Ergebnis – ${akte.number}`,
    intro: "Wie ist der Fall ausgegangen? Das fließt auch in die Statistik ein.",
    fields: [
      { name: "ergebnis", label: "Ergebnis", type: "select", options: OPTIONEN.ergebnis, required: true, half: true },
      { name: "ergebnis_datum", label: "Datum", type: "date", half: true },
      { name: "ergebnis_details", label: "Strafmaß / Details", type: "textarea", rows: 4, placeholder: "z. B. 20 HE Haft, $15.000 Geldstrafe; Deal mit StA …" },
      { name: "schliessen", label: "Akte auf „Geschlossen“ setzen", type: "checkbox" },
    ],
    values: { ...akte, ergebnis_datum: akte.ergebnis_datum || ymd(new Date()), schliessen: true },
    onSubmit: async (v) => {
      const row = { ergebnis: v.ergebnis, ergebnis_datum: v.ergebnis_datum, ergebnis_details: v.ergebnis_details };
      if (v.schliessen) {
        row.status = "Geschlossen";
        row.in_haft = false;
      }
      await updateRow("akten", akte.id, row);
      toast("Ergebnis gespeichert");
    },
  });
}

// ---------- Tatvorwürfe ----------
async function addVorwurf(akteId, v) {
  const a = byId("akten", akteId);
  const list = [...(a.vorwuerfe || [])];
  const i = list.findIndex((x) => (v.gesetz_id && x.gesetz_id === v.gesetz_id)
    || (!v.gesetz_id && norm(x.titel) === norm(v.titel) && norm(x.paragraph) === norm(v.paragraph)));
  if (i >= 0) list[i] = { ...list[i], anzahl: (Number(list[i].anzahl) || 1) + 1 };
  else list.push({ ...v, anzahl: 1 });
  await updateRow("akten", akteId, { vorwuerfe: list });
}

function openVorwurfPicker(akteId) {
  const dlg = openDialog({
    title: "Tatvorwurf hinzufügen",
    body: html`
      <div class="search"><input type="search" id="vw-q" placeholder="Paragraph oder Delikt suchen …" autocomplete="off"></div>
      <div class="pick-list" id="vw-list"></div>
      <div class="form-section" style="margin-top:14px">Oder frei eingeben</div>
      <form id="vw-free" class="form-grid" style="padding:8px 0 0">
        <div class="field third"><label class="label">Paragraph</label><input name="paragraph" placeholder="§ 12 StGB"></div>
        <div class="field" style="grid-column: span 4"><label class="label">Vorwurf <span class="req">*</span></label><input name="titel" required placeholder="z. B. Körperverletzung"></div>
        <div class="field third"><label class="label">Geldstrafe bis</label><input name="geldstrafe" inputmode="decimal" placeholder="0"></div>
        <div class="field third"><label class="label">Haft bis (${state.settings.haft_einheit})</label><input name="haft" inputmode="decimal" placeholder="0"></div>
        <div class="field third" style="align-self:end"><button class="btn full" type="submit">Hinzufügen</button></div>
      </form>`,
    footer: html`<div class="dialog-actions"><a class="btn" href="#/gesetzbuch">Strafkatalog öffnen</a><span class="spacer"></span><button class="btn primary" data-close>Fertig</button></div>`,
  });
  const listEl = dlg.querySelector("#vw-list");
  const q = dlg.querySelector("#vw-q");
  const draw = () => {
    const a = byId("akten", akteId);
    const vorhanden = new Map((a.vorwuerfe || []).filter((v) => v.gesetz_id).map((v) => [v.gesetz_id, v.anzahl || 1]));
    const items = state.gesetze
      .filter((g) => matches(q.value, g.paragraph, g.titel, g.kategorie))
      .sort((x, y) => String(x.paragraph || "").localeCompare(String(y.paragraph || ""), "de", { numeric: true }))
      .slice(0, 150);
    listEl.innerHTML = String(items.length ? html`${items.map((g) => html`
      <button type="button" data-gid="${g.id}">
        <span><strong>${g.paragraph || ""}</strong> ${g.titel}<span class="sub">${g.kategorie || ""}</span></span>
        <span class="right">${deliktStrafeText(deliktRahmen(g), "haft") !== "–" ? deliktStrafeText(deliktRahmen(g), "haft") : ""}${deliktStrafeText(deliktRahmen(g), "geld") !== "–" ? html`<br>${deliktStrafeText(deliktRahmen(g), "geld")}` : ""}
          ${vorhanden.has(g.id) ? html`<br><strong class="ok-text">✓ ${vorhanden.get(g.id)}×</strong>` : ""}</span>
      </button>`)}`
      : html`<p class="empty" style="padding:10px 12px">${state.gesetze.length ? "Nichts gefunden." : "Der Strafkatalog ist noch leer. Lege ihn unter „Strafkatalog“ an oder gib den Vorwurf unten frei ein."}</p>`);
  };
  draw();
  q.addEventListener("input", draw);
  listEl.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-gid]");
    if (!b) return;
    const g = byId("gesetze", b.dataset.gid);
    await attempt(() => addVorwurf(akteId, vorwurfAusKatalog(g)),
      `${g.paragraph || g.titel} hinzugefügt`);
    draw();
  });
  dlg.querySelector("#vw-free").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const v = { paragraph: f.paragraph.value.trim() || null, titel: f.titel.value.trim(), geldstrafe: parseNumber(f.geldstrafe.value), haft: parseNumber(f.haft.value) };
    if (!v.titel) return;
    const ok = await attempt(() => addVorwurf(akteId, v), "Vorwurf hinzugefügt");
    if (ok !== undefined) e.target.reset();
  });
}

// ---------- Aktionen ----------
Object.assign(ACTIONS, {
  "akte-neu": (d) => openAkteForm(null, d.mandant ? { mandant: d.mandant } : {}),
  "akte-bearbeiten": (d) => openAkteForm(byId("akten", d.id)),
  "akte-abschluss": (d) => openAbschlussForm(byId("akten", d.id)),
  "akte-link": async (d) => {
    const url = `${location.origin}${location.pathname}#/akten/${d.id}`;
    toast((await copyText(url)) ? "Link kopiert – du kannst ihn im Team teilen." : url);
  },
  "akte-loeschen": async (d) => {
    const a = byId("akten", d.id);
    if (!confirm(`Akte ${a.number} „${a.title}“ wirklich für ALLE löschen?\n\nVerlauf, Beteiligte, Beweise, Termine und Aufgaben werden mitgelöscht. Rechnungen bleiben erhalten.`)) return;
    const ok = await attempt(() => deleteRow("akten", a.id), `Akte ${a.number} gelöscht`);
    if (ok !== undefined) go("akten");
  },
  "haft-ende": (d) => attempt(() => updateRow("akten", d.id, { in_haft: false }), "Haft beendet"),
  "az-kopieren": async (d) => { toast((await copyText(d.az)) ? `Aktenzeichen ${d.az} kopiert` : d.az); },
  "ta-filter": (d) => { ui.akten.taFilter = d.f; render(); },
  "akte-status-setzen": (d) => akteStatusSetzen(byId("akten", d.id), d.status),
  "vorwurf-hinzufuegen": (d) => openVorwurfPicker(d.id),
  "vorwurf-anzahl": (d) => {
    const a = byId("akten", d.id);
    const list = [...(a.vorwuerfe || [])];
    const v = list[+d.i];
    if (!v) return;
    list[+d.i] = { ...v, anzahl: Math.max(1, (Number(v.anzahl) || 1) + Number(d.delta)) };
    attempt(() => updateRow("akten", a.id, { vorwuerfe: list }));
  },
  "vorwurf-entfernen": (d) => {
    const a = byId("akten", d.id);
    const list = (a.vorwuerfe || []).filter((_, i) => i !== +d.i);
    attempt(() => updateRow("akten", a.id, { vorwuerfe: list }));
  },
  "eintrag-bearbeiten": (d) => {
    const e = byId("eintraege", d.id);
    openForm({
      title: "Eintrag bearbeiten",
      fields: [
        { name: "art", label: "Art", type: "select", options: OPTIONEN.eintragArt, required: true, half: true },
        { name: "wichtig", label: "Wichtig", type: "checkbox", half: true },
        { name: "text", label: "Text", type: "textarea", rows: 6, required: true },
        { name: "fuer_mandant", label: "Für Mandant sichtbar (Mandantenportal)", type: "checkbox" },
      ],
      values: e,
      onMount: (form) => { form.elements.text.dataset.mention = ""; },
      onSubmit: async (v) => {
        const erwaehnt = erwaehnteIn(v.text);
        const vorher = new Set(e.erwaehnt || []);
        await updateRow("eintraege", e.id, { ...(e.fuer_mandant ? v : ohneFalschesSichtbar(v)), ...(erwaehnt.length || vorher.size ? { erwaehnt } : {}) });
        const neu = erwaehnt.filter((x) => !vorher.has(x) && x !== state.me.id);
        toast(neu.length ? `Eintrag gespeichert – ${neu.map((x) => personName(x)).join(", ")} benachrichtigt` : "Eintrag gespeichert");
      },
      onDelete: async () => {
        if (!confirm("Eintrag löschen?")) return false;
        await deleteRow("eintraege", e.id);
        toast("Eintrag gelöscht");
      },
    });
  },
  "eintrag-loeschen": async (d) => {
    if (!confirm("Eintrag für alle löschen?")) return;
    attempt(() => deleteRow("eintraege", d.id), "Eintrag gelöscht");
  },
  "beteiligter-neu": (d) => openForm({
    title: "Person hinzufügen",
    fields: beteiligterFields(),
    values: { rolle: "Zeuge" },
    onSubmit: async (v) => { await insertRow("beteiligte", { ...v, akte_id: d.akte }); toast(`${v.name} hinzugefügt`); },
  }),
  "beteiligter-bearbeiten": (d) => {
    const b = byId("beteiligte", d.id);
    openForm({
      title: "Person bearbeiten",
      fields: beteiligterFields(),
      values: b,
      onSubmit: async (v) => { await updateRow("beteiligte", b.id, v); toast("Gespeichert"); },
      onDelete: async () => {
        if (!confirm(`${b.name} aus der Akte entfernen?`)) return false;
        await deleteRow("beteiligte", b.id);
      },
    });
  },
  "beweis-neu": (d) => openForm({
    title: "Beweismittel hinzufügen",
    fields: beweisFields(),
    values: { art: "Foto" },
    onSubmit: async (v) => { await insertRow("beweise", { ...ohneFalschesSichtbar(v), akte_id: d.akte }); toast("Beweismittel gespeichert"); },
  }),
  "beweis-bearbeiten": (d) => {
    const b = byId("beweise", d.id);
    openForm({
      title: "Beweismittel bearbeiten",
      fields: beweisFields(),
      values: b,
      onSubmit: async (v) => { await updateRow("beweise", b.id, b.fuer_mandant ? v : ohneFalschesSichtbar(v)); toast("Gespeichert"); },
      onDelete: async () => {
        if (!confirm(`„${b.titel}“ löschen?`)) return false;
        await deleteRow("beweise", b.id);
      },
    });
  },
});

async function akteStatusSetzen(a, status) {
  if (!a || a.status === status) return;
  const ok = await attempt(() => updateRow("akten", a.id, { status }), `Status: ${status}`);
  if (ok !== undefined && status === "Geschlossen" && !a.ergebnis) openAbschlussForm(byId("akten", a.id));
}
CHANGES["akte-status"] = (el) => akteStatusSetzen(byId("akten", el.dataset.id), el.value);
