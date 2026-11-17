// =============================================================
//  Wiwang Law – Akten
//  Liste mit Filtern + Detailansicht mit Tabs
// =============================================================

const AKTE_TABS = [
  { key: "", label: "Überblick" },
  { key: "verlauf", label: "Verlauf", count: (id) => kinder("eintraege", id).length },
  { key: "beteiligte", label: "Beteiligte", count: (id) => kinder("beteiligte", id).length },
  { key: "beweise", label: "Beweise", count: (id) => kinder("beweise", id).length },
  { key: "termine", label: "Termine", count: (id) => kinder("termine", id).filter((t) => !t.erledigt).length },
  { key: "aufgaben", label: "Aufgaben", count: (id) => kinder("aufgaben", id).filter((t) => !t.erledigt).length },
  { key: "rechnungen", label: "Rechnungen", count: (id) => state.rechnungen.filter((r) => r.akte_id === id).length },
  { key: "historie", label: "Historie" },
];

const statusClass = (s) => norm(s).replace(/\s+/g, "-");
const statusBadge = (s) => html`<span class="badge ${statusClass(s)}">${s}</span>`;
const prioBadge = (p) => (p === "Hoch" || p === "Dringend" ? html`<span class="badge ${statusClass(p)}">${p}</span>` : "");
const haftBadge = (a) => (a.in_haft ? html`<span class="badge haft">In Haft</span>` : "");

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
    <a class="item ${a.id === activeId ? "active" : ""}" href="#/akten/${a.id}">
      <span class="num"><span class="dot ${statusClass(a.prioritaet)}"></span>${a.number}
        ${wer.length ? html`<span class="avatars mini" title="Gerade geöffnet von ${wer.map((id) => personName(id)).join(", ")}">${wer.map((id) => avatar(id, { punkt: false }))}</span>` : ""}</span>
      <span class="title">${a.title}</span>
      <span class="meta"><span>${mandantName(a)}</span><span class="badges">${haftBadge(a)}${statusBadge(a.status)}</span></span>
      ${nt ? html`<span class="sub">Nächster Termin: ${fmt.tag(nt.beginn)}, ${fmt.zeit(nt.beginn)} · ${nt.titel}</span>` : ""}
      ${a.status !== "Geschlossen" ? fortschrittBalken(a.id) : ""}
    </a>`;
}

// ---------- Aktenliste einklappen (wird im Browser gemerkt) ----------
const LISTE_ZU_KEY = "wiwang.aktenListeZu";
ui.akten.listeZu = (() => { try { return localStorage.getItem(LISTE_ZU_KEY) === "1"; } catch { return false; } })();

function setListeZu(zu) {
  ui.akten.listeZu = zu;
  try { localStorage.setItem(LISTE_ZU_KEY, zu ? "1" : "0"); } catch {}
}

// Schmale Leiste, wenn die Aktenliste eingeklappt ist: ausklappen, suchen, blättern, neu
function listenLeiste(list, activeId) {
  const i = activeId ? list.findIndex((a) => a.id === activeId) : -1;
  const vor = i > 0 ? list[i - 1] : null;
  const nach = i >= 0 && i < list.length - 1 ? list[i + 1] : !activeId && list.length ? list[0] : null;
  const pfeil = (a, icon, label) => a
    ? html`<a class="werkzeug" href="#/akten/${a.id}" aria-label="${label}: ${a.number}" data-tip="${label}" data-hinweis="${a.number} · ${a.title}">${new SafeHtml(AKTE_ICON[icon])}</a>`
    : html`<span class="werkzeug aus" aria-hidden="true">${new SafeHtml(AKTE_ICON[icon])}</span>`;
  return html`
    <nav class="list-rail" aria-label="Aktenliste (eingeklappt)">
      <button type="button" class="werkzeug" data-action="akten-liste-umschalten" aria-label="Aktenliste ausklappen" data-tip="Aktenliste ausklappen" data-hinweis="Taste [">${new SafeHtml(AKTE_ICON.ausklappen)}</button>
      <button type="button" class="werkzeug" data-action="akten-suche" aria-label="Akten durchsuchen" data-tip="Akten durchsuchen" data-hinweis="Taste /">${new SafeHtml(AKTE_ICON.suche)}</button>
      <span class="rail-trenner"></span>
      ${pfeil(vor, "hoch", "Vorherige Akte")}
      <span class="rail-pos" title="Position in der gefilterten Liste">${i >= 0 ? i + 1 : "–"}<small>von ${list.length}</small></span>
      ${pfeil(nach, "runter", "Nächste Akte")}
      <span class="rail-trenner"></span>
      <button type="button" class="werkzeug" data-action="akte-neu" aria-label="Neue Akte" data-tip="Neue Akte" data-hinweis="Taste N">${new SafeHtml(AKTE_ICON.plus)}</button>
    </nav>`;
}

VIEWS.akten = (route) => {
  const f = ui.akten;
  const list = gefilterteAkten();
  const akte = route.id ? byId("akten", route.id) : null;
  return html`
    <div class="page page-breit">
      <div class="split ${route.id ? "has-detail" : ""} ${f.listeZu ? "liste-zu" : ""}">
        ${listenLeiste(list, route.id)}
        <aside class="list-pane">
          <div class="toolbar">
            <div class="search"><input type="search" id="akten-q" data-search data-input="akten-filter" data-key="q"
              value="${f.q}" placeholder="Suchen: Name, Az., Vorwurf …"></div>
          </div>
          <div class="toolbar">
            <select id="akten-status" data-change="akten-filter" data-key="status">
              ${[["aktiv", "Offen + In Bearbeitung"], ["Offen", "Offen"], ["In Bearbeitung", "In Bearbeitung"],
                 ["Geschlossen", "Geschlossen"], ["haft", "Mandant in Haft"], ["liegen", "Liegen geblieben"], ["alle", "Alle Akten"]]
                .map(([v, l]) => html`<option value="${v}" ${f.status === v ? "selected" : ""}>${l}</option>`)}
            </select>
            <select id="akten-typ" data-change="akten-filter" data-key="typ">
              <option value="">Alle Rechtsgebiete</option>
              ${OPTIONEN.rechtsgebiet.map((r) => html`<option ${f.typ === r ? "selected" : ""}>${r}</option>`)}
            </select>
            <select id="akten-sort" data-change="akten-filter" data-key="sort" title="Sortierung">
              ${[["aktiv", "Zuletzt aktiv"], ["prio", "Priorität"], ["termin", "Nächster Termin"], ["neu", "Neueste zuerst"], ["az", "Aktenzeichen"]]
                .map(([v, l]) => html`<option value="${v}" ${f.sort === v ? "selected" : ""}>${l}</option>`)}
            </select>
            <label class="check"><input type="checkbox" id="akten-meine" data-change="akten-filter" data-key="meine" ${f.meine ? "checked" : ""}> Nur meine</label>
          </div>
          <div class="list-count">
            <span>${list.length} ${list.length === 1 ? "Akte" : "Akten"}</span>
            <button type="button" class="link-btn liste-zu-btn" data-action="akten-liste-umschalten" title="Liste einklappen, um sich auf die Akte zu konzentrieren (Taste [)">${new SafeHtml(AKTE_ICON.einklappen)} Liste einklappen</button>
          </div>
          <div class="list-scroll" data-scroll="akten-list">
            <ul class="item-list">${list.map((a) => html`<li>${akteListItem(a, route.id)}</li>`)}</ul>
            ${list.length ? "" : html`<p class="empty center">Keine Akten gefunden.</p>`}
          </div>
        </aside>
        <section class="detail-pane">
          ${route.id
            ? akte ? renderAkteDetail(akte, route.sub)
                   : html`<div class="card empty-state"><h2>Akte nicht gefunden</h2><p>Vielleicht wurde sie gelöscht.</p><a class="btn" href="#/akten">Zur Aktenliste</a></div>`
            : html`<div class="card empty-state">
                <h2>Wähle eine Akte aus</h2>
                <p>Links findest du alle Akten. Mit <strong>/</strong> springst du in die Suche, mit <strong>N</strong> legst du eine neue Akte an.
                  Mit <strong>[</strong> klappst du die Aktenliste ein und aus.</p>
                <button class="btn primary" data-action="akte-neu">+ Neue Akte</button>
              </div>`}
        </section>
      </div>
    </div>`;
};

ACTIONS["akten-liste-umschalten"] = () => { setListeZu(!ui.akten.listeZu); render(); };
ACTIONS["akten-suche"] = () => {
  setListeZu(false);
  render();
  const q = document.getElementById("akten-q");
  if (q) { q.focus(); q.select(); }
};

// Tastenkürzel nur auf der Aktenseite: [ klappt die Liste, / öffnet die Suche auch im eingeklappten Zustand
document.addEventListener("keydown", (e) => {
  if (!state.loaded || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest("input, textarea, select, [contenteditable]") || document.querySelector("dialog[open]")) return;
  if (parseRoute().page !== "akten" || !window.matchMedia("(min-width: 981px)").matches) return;
  if (e.key === "[") {
    e.preventDefault();
    ACTIONS["akten-liste-umschalten"]();
  } else if (e.key === "/" && ui.akten.listeZu) {
    e.preventDefault();
    e.stopImmediatePropagation();
    ACTIONS["akten-suche"]();
  }
}, true);

INPUTS["akten-filter"] = (el) => { ui.akten[el.dataset.key] = el.value; scheduleRender(); };
CHANGES["akten-filter"] = (el) => {
  ui.akten[el.dataset.key] = el.type === "checkbox" ? el.checked : el.value;
  scheduleRender();
};

// ---------- Werkzeugleiste (Icon-Buttons mit Tooltip) ----------
const AKTE_ICON = {
  ablauf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5" cy="18" r="1.4" fill="currentColor"/></svg>',
  wiedervorlage: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 12.5v3l2 1.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  dokument: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v4h4M12 11v6M9 14h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  drucken: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3.5h10V9M7 17H4.5A1.5 1.5 0 0 1 3 15.5v-5A1.5 1.5 0 0 1 4.5 9h15a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17M7 14h10v6.5H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3.5-3.5a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3.5 3.5a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  arbeitsbereich: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  einklappen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5v15M15 7l-5 5 5 5M10 12h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ausklappen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5v15M14 7l5 5-5 5M19 12H9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  suche: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15 15l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  hoch: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  runter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  loeschen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10.5 11v5M13.5 11v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

// Quadratischer Icon-Button; die Beschriftung erscheint als Tooltip beim Überfahren
function werkzeug(action, id, icon, label, hinweis = "", extra = "") {
  return html`<button type="button" class="werkzeug ${extra}" data-action="${action}" data-id="${id}" aria-label="${label}" data-tip="${label}"${hinweis ? html` data-hinweis="${hinweis}"` : ""}>${new SafeHtml(AKTE_ICON[icon])}<span class="wz-label">${label}</span></button>`;
}

// Schnell-Anlegen im Seitenmenü (nur auf breiten Bildschirmen sichtbar)
function anlegenKnopf(attrs, label) {
  return html`<button type="button" class="werkzeug" ${new SafeHtml(attrs)} aria-label="${label} hinzufügen" data-tip="${label} hinzufügen">${new SafeHtml(AKTE_ICON.plus)}<span class="wz-label">${label}</span></button>`;
}

// ---------- Detail ----------
function renderAkteDetail(a, sub) {
  const tab = AKTE_TABS.some((t) => t.key === (sub || "")) ? sub || "" : "";
  const k = konflikte(a);
  const m = byId("mandanten", a.mandant_id);
  const body = {
    "": tabUeberblick, verlauf: tabVerlauf, beteiligte: tabBeteiligte, beweise: tabBeweise,
    termine: tabTermine, aufgaben: tabAufgaben, rechnungen: tabRechnungen, historie: tabHistorie,
  }[tab];

  return html`
    <a class="back-link" href="#/akten">← Alle Akten</a>
    <div class="detail-card">
      <div class="detail-head">
        <div class="top">
          <div>
            <span class="case-number">${a.number}</span>
            <span class="badges">${prioBadge(a.prioritaet)} ${haftBadge(a)}</span>
            <h2>${a.title}</h2>
            <div class="head-sub">
              Mandant: ${m ? html`<a href="#/mandanten/${m.id}">${m.name}</a>` : a.client}
              ${a.opponent ? html` · Gegen: ${a.opponent}` : ""}
              · Zuständig: ${personName(a.zustaendig_id, a.lawyer || "niemand")}
            </div>
            ${typeof betrachterHinweis === "function" ? betrachterHinweis(a.id) : ""}
          </div>
          <div class="actions-row" style="align-items:flex-start">
            <select class="status-select" id="status-${a.id}" data-change="akte-status" data-id="${a.id}" title="Status ändern">
              ${OPTIONEN.status.map((s) => html`<option ${a.status === s ? "selected" : ""}>${s}</option>`)}
            </select>
            <button class="btn" data-action="akte-bearbeiten" data-id="${a.id}">Bearbeiten</button>
          </div>
        </div>
      </div>
      ${k.length ? html`
        <div class="box warning konflikt">
          <strong>Möglicher Interessenkonflikt:</strong>
          <ul>${k.map((c) => html`<li><a href="#/akten/${c.akte.id}">${c.akte.number} · ${c.akte.title}</a> – ${c.grund} (${c.akte.status})</li>`)}</ul>
        </div>` : ""}
      <div class="akte-rumpf">
        <aside class="akte-menu" aria-label="Menü der Akte">
          <nav class="tabs" aria-label="Bereiche der Akte">
            ${AKTE_TABS.map((t) => {
              const n = t.count ? t.count(a.id) : 0;
              return html`<a href="#/akten/${a.id}${t.key ? "/" + t.key : ""}" class="${t.key === tab ? "active" : ""}"${t.key === tab ? html` aria-current="page"` : ""}>${t.label}${n ? html`<span class="count">${n}</span>` : ""}</a>`;
            })}
          </nav>
          <div class="akte-werkzeuge" role="toolbar" aria-label="Aktionen zur Akte">
            <div class="werkzeug-gruppe anlegen" data-titel="Hinzufügen">
              <a class="werkzeug" href="#/akten/${a.id}/verlauf" aria-label="Verlaufseintrag schreiben" data-tip="Verlaufseintrag schreiben">${new SafeHtml(AKTE_ICON.plus)}<span class="wz-label">Eintrag</span></a>
              ${anlegenKnopf(`data-action="termin-neu" data-akte="${esc(a.id)}"`, "Termin")}
              ${anlegenKnopf(`data-action="beteiligter-neu" data-akte="${esc(a.id)}"`, "Person")}
              ${anlegenKnopf(`data-action="beweis-neu" data-akte="${esc(a.id)}"`, "Beweis")}
              ${anlegenKnopf(`data-action="vorwurf-hinzufuegen" data-id="${esc(a.id)}"`, "Tatvorwurf")}
              ${darf("rechnungen") ? anlegenKnopf(`data-action="rechnung-neu" data-akte="${esc(a.id)}"`, "Rechnung") : ""}
            </div>
            <div class="werkzeug-gruppe" data-titel="Planen">
              ${werkzeug("ablauf-starten", a.id, "ablauf", "Ablauf starten", "Checkliste mit Aufgaben und Terminen anlegen")}
              ${werkzeug("wiedervorlage", a.id, "wiedervorlage", "Wiedervorlage", "Termin zur Wiedervorlage anlegen")}
            </div>
            <div class="werkzeug-gruppe" data-titel="Ausgeben">
              ${werkzeug("dokument-waehlen", a.id, "dokument", "Dokument erstellen")}
              ${werkzeug("aktenblatt", a.id, "drucken", "Aktenblatt drucken")}
              ${werkzeug("akte-link", a.id, "link", "Link kopieren")}
            </div>
            ${darf("ki_assistent") ? html`<div class="werkzeug-gruppe" data-titel="Nigel">
              <button type="button" class="nigel-btn" data-action="ki-oeffnen" data-id="${a.id}" aria-label="Nigel zu dieser Akte befragen"><span class="nigel-btn-bild"><img src="assets/nigel.svg" alt=""></span><span class="nigel-btn-text" aria-hidden="true"><small>Zu Diensten, Sir</small>Nigel fragen</span></button>
              ${werkzeug("nw-mit-akte", a.id, "arbeitsbereich", "Mit Nigel bearbeiten", "Gutachten, Schriftsatz oder Fallanalyse im Arbeitsbereich")}
            </div>` : ""}
            ${darf("akten_loeschen") ? html`<div class="werkzeug-gruppe rechts">${werkzeug("akte-loeschen", a.id, "loeschen", "Akte löschen", "", "danger")}</div>` : ""}
          </div>
        </aside>
        <div class="tab-body">${body(a)}</div>
      </div>
    </div>`;
}

// ---------- Tab: Überblick ----------
function tabUeberblick(a) {
  const m = byId("mandanten", a.mandant_id);
  const termine = kinder("termine", a.id).filter((t) => !t.erledigt).sort((x, y) => new Date(x.beginn) - new Date(y.beginn)).slice(0, 4);
  const aufgaben = kinder("aufgaben", a.id).filter((t) => !t.erledigt).slice(0, 5);
  const wichtige = kinder("eintraege", a.id).filter((e) => e.wichtig).sort((x, y) => new Date(y.created_at) - new Date(x.created_at)).slice(0, 3);

  return html`
    ${a.in_haft ? html`
      <div class="box dark">
        <strong>Mandant in Haft</strong>
        ${a.haft_bis ? html` – voraussichtlich bis ${fmt.datumZeit(a.haft_bis)} (${fmt.bis(a.haft_bis)})` : ""}
        <div class="actions-row"><button class="btn small gold" data-action="haft-ende" data-id="${a.id}">Ist entlassen</button></div>
      </div>` : ""}
    ${a.ergebnis ? html`
      <div class="box ${ERFOLGE.includes(a.ergebnis) ? "ok" : "info"}">
        <strong>Ergebnis: ${a.ergebnis}</strong>${a.ergebnis_datum ? html` (${fmt.datum(a.ergebnis_datum)})` : ""}
        ${a.ergebnis_details ? html`<div class="pre">${a.ergebnis_details}</div>` : ""}
        <div class="actions-row"><button class="link-btn" data-action="akte-abschluss" data-id="${a.id}">Ergebnis ändern</button></div>
      </div>` : a.status === "Geschlossen" ? html`
      <div class="box info">Die Akte ist geschlossen, aber das Ergebnis fehlt noch.
        <div class="actions-row"><button class="btn small gold" data-action="akte-abschluss" data-id="${a.id}">Ergebnis eintragen</button></div>
      </div>` : ""}

    <dl class="facts">
      <div><dt>Mandant</dt><dd>${m ? html`<a href="#/mandanten/${m.id}">${m.name}</a>${m.telefon ? html`<br><span class="small muted">${m.telefon}</span>` : ""}` : a.client}</dd></div>
      <div><dt>Gegenpartei</dt><dd>${a.opponent || "–"}</dd></div>
      <div><dt>Rechtsgebiet</dt><dd>${a.area || "–"}</dd></div>
      <div><dt>Mandatsart</dt><dd>${a.typ || "–"}</dd></div>
      <div><dt>Zuständig</dt><dd>${personName(a.zustaendig_id, a.lawyer || "–")}</dd></div>
      <div><dt>Priorität</dt><dd>${a.prioritaet || "Normal"}</dd></div>
      <div><dt>Az. Polizei / StA / Gericht</dt><dd>${a.az_extern || "–"}</dd></div>
      <div><dt>Angelegt</dt><dd>${fmt.datum(a.created_at)} von ${personName(a.created_by)}</dd></div>
      <div><dt>Zuletzt aktiv</dt><dd>${fmt.relativ(zuletztAktiv(a))}${liegenGeblieben(a) ? html`<br><span class="small danger-text">liegt seit ${liegtSeitTagen(a)} Tagen</span>` : ""}</dd></div>
      ${aufgabenStand(a.id).gesamt ? html`<div><dt>Aufgaben</dt><dd>${fortschrittBalken(a.id)}</dd></div>` : ""}
    </dl>

    <h3 class="section-title">Sachverhalt</h3>
    <p class="pre" style="margin-top:0">${a.summary || html`<span class="muted">${darf("akten_schreiben") ? "Noch kein Sachverhalt. Über „Bearbeiten“ eintragen." : "Noch kein Sachverhalt erfasst."}</span>`}</p>

    ${wichtige.length ? html`
      <h3 class="section-title" style="margin-top:20px">Wichtige Einträge</h3>
      <ul class="timeline">${wichtige.map((e) => html`<li class="wichtig"><div class="head"><strong>${personName(e.author)}</strong> · ${fmt.datumZeit(e.created_at)}</div><p>${mitErwaehnungen(e.text)}</p></li>`)}</ul>` : ""}

    <div class="card-head" style="margin-top:20px">
      <h3 class="section-title" style="margin:0">Tatvorwürfe & Strafrahmen</h3>
      <button class="btn small" data-action="vorwurf-hinzufuegen" data-id="${a.id}">+ Vorwurf</button>
    </div>
    ${vorwurfTabelle(a)}

    <div class="grid-2" style="margin-top:20px">
      <div>
        <div class="card-head"><h3 class="section-title" style="margin:0">Nächste Termine</h3>
          <button class="btn small" data-action="termin-neu" data-akte="${a.id}">+ Termin</button></div>
        ${termine.length ? html`<ul class="rows">${termine.map((t) => terminRow(t, { akte: false }))}</ul>` : html`<p class="empty">Keine offenen Termine.</p>`}
      </div>
      <div>
        <div class="card-head"><h3 class="section-title" style="margin:0">Offene Aufgaben</h3>
          <a class="btn small" href="#/akten/${a.id}/aufgaben">Alle</a></div>
        ${aufgaben.length ? html`<ul class="rows">${aufgaben.map((t) => aufgabeRow(t, { akte: false }))}</ul>` : html`<p class="empty">Keine offenen Aufgaben.</p>`}
      </div>
    </div>`;
}

function vorwurfTabelle(a) {
  const list = a.vorwuerfe || [];
  if (!list.length) return html`<p class="empty">${darf("akten_schreiben") ? "Noch keine Tatvorwürfe. Über „+ Vorwurf“ aus dem Strafkatalog hinzufügen – Geldstrafe und Haft werden automatisch zusammengerechnet." : "Keine Tatvorwürfe erfasst."}</p>`;
  const sum = vorwurfSumme(list);
  return html`
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Paragraph</th><th>Vorwurf</th><th>Anzahl</th><th class="num">Geldstrafe</th><th class="num">Haft</th><th></th></tr></thead>
      <tbody>${list.map((v, i) => html`
        <tr>
          <td class="nowrap">${v.paragraph || "–"}</td>
          <td>${v.titel}</td>
          <td><span class="stepper">
            <button data-action="vorwurf-anzahl" data-id="${a.id}" data-i="${i}" data-delta="-1" title="weniger">−</button>
            <span>${v.anzahl || 1}</span>
            <button data-action="vorwurf-anzahl" data-id="${a.id}" data-i="${i}" data-delta="1" title="mehr">+</button>
          </span></td>
          <td class="num">${v.geldstrafe ? fmt.geld((Number(v.geldstrafe) || 0) * (v.anzahl || 1)) : "–"}</td>
          <td class="num">${v.haft ? fmt.haft((Number(v.haft) || 0) * (v.anzahl || 1)) : "–"}</td>
          <td class="row-actions"><button class="icon-btn" data-action="vorwurf-entfernen" data-id="${a.id}" data-i="${i}" title="Entfernen">✕</button></td>
        </tr>`)}
      </tbody>
    </table></div>
    <div class="sum-bar">
      <span>Strafrahmen gesamt:</span>
      <span>Geldstrafe <strong>${fmt.geld(sum.geld)}</strong></span>
      <span>Haft <strong>${fmt.haft(sum.haft)}</strong></span>
    </div>`;
}

// ---------- Tab: Verlauf ----------
function tabVerlauf(a) {
  const textId = `draft-${a.id}`, artId = `art-${a.id}`, wichtigId = `wichtig-${a.id}`;
  const entries = kinder("eintraege", a.id).sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
  return html`
    <form class="entry-form" data-submit="eintrag" data-id="${a.id}">
      <textarea id="${textId}" name="text" rows="3" data-input="draft" data-mention required
        placeholder="Neuer Eintrag … z. B. Gespräch mit Mandant, Anruf bei der StA. Mit @Name holst du Kollegen dazu.">${ui.drafts[textId] || ""}</textarea>
      <div class="actions-row">
        <div class="actions-row">
          <select id="${artId}" name="art" data-input="draft">
            ${OPTIONEN.eintragArt.map((o) => html`<option ${(ui.drafts[artId] || "Notiz") === o ? "selected" : ""}>${o}</option>`)}
          </select>
          <label class="check"><input type="checkbox" id="${wichtigId}" name="wichtig" data-input="draft" ${ui.drafts[wichtigId] ? "checked" : ""}> Wichtig</label>
          <span class="muted small erw-tipp">Tipp: <strong>@</strong> erwähnt Kollegen</span>
        </div>
        <button class="btn primary" type="submit">Eintragen</button>
      </div>
    </form>
    ${entries.length ? html`<ul class="timeline">${entries.map((e) => html`
      <li class="${e.wichtig ? "wichtig" : ""}">
        <div class="head">
          <span class="badge gold">${e.art || "Notiz"}</span>
          ${e.wichtig ? html`<span class="badge alert">Wichtig</span>` : ""}
          <strong>${personName(e.author)}</strong> · ${fmt.datumZeit(e.created_at)}
          ${(e.erwaehnt || []).length ? html`<span class="erw-an" title="Erwähnt und benachrichtigt">→ ${e.erwaehnt.map((id) => personName(id)).join(", ")}</span>` : ""}
        </div>
        <p>${mitErwaehnungen(e.text)}</p>
        <div class="tools">
          <button class="icon-btn" title="Bearbeiten" data-action="eintrag-bearbeiten" data-id="${e.id}">✎</button>
          <button class="icon-btn" title="Löschen" data-action="eintrag-loeschen" data-id="${e.id}">✕</button>
        </div>
      </li>`)}</ul>` : html`<p class="empty">Noch keine Einträge. Halte hier alles fest, was im Fall passiert.</p>`}`;
}

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
    ...(erwaehnt.length ? { erwaehnt } : {}),
  }));
  button.disabled = false;
  if (ok) {
    delete ui.drafts[`draft-${id}`];
    delete ui.drafts[`wichtig-${id}`];
    form.elements.text.value = "";
    form.elements.wichtig.checked = false;
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
      <div class="mini-card"><div class="meta">Mandant</div><div class="title">${m ? html`<a href="#/mandanten/${m.id}">${m.name}</a>` : a.client}</div>
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
    ${list.length ? "" : html`<p class="empty">Noch keine weiteren Personen erfasst.</p>`}`;
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
          <div class="meta"><span class="badge gold">${b.art}</span> · ${fmt.datum(b.created_at)} · ${personName(b.created_by)}</div>
          <div class="title" style="margin-top:4px">${b.titel}</div>
          ${url ? html`<a href="${url}" target="_blank" rel="noopener noreferrer" class="small">Öffnen ↗</a>` : ""}
          ${url && isImageUrl(url) ? html`<a href="${url}" target="_blank" rel="noopener noreferrer"><img class="thumb" src="${url}" alt="${b.titel}" loading="lazy"></a>` : ""}
          ${b.beschreibung ? html`<p>${b.beschreibung}</p>` : ""}
          <div class="tools"><button class="icon-btn" title="Bearbeiten" data-action="beweis-bearbeiten" data-id="${b.id}">✎</button></div>
        </div>`;
    })}</div>` : html`<p class="empty">Noch keine Beweismittel.</p>`}`;
}

function beweisFields() {
  return [
    { name: "art", label: "Art", type: "select", options: OPTIONEN.beweisArt, required: true, half: true },
    { name: "titel", label: "Bezeichnung", required: true, half: true, placeholder: "z. B. Dashcam Kreuzung Vinewood" },
    { name: "link", label: "Link", type: "url", placeholder: "https://…", help: "Bilder (.png/.jpg) werden direkt als Vorschau angezeigt." },
    { name: "beschreibung", label: "Beschreibung", type: "textarea", rows: 3, placeholder: "Was ist zu sehen? Warum ist es wichtig?" },
  ];
}

// ---------- Tab: Termine / Aufgaben / Rechnungen ----------
function tabTermine(a) {
  const list = kinder("termine", a.id).sort((x, y) => new Date(x.beginn) - new Date(y.beginn));
  const offen = list.filter((t) => !t.erledigt);
  const erledigt = list.filter((t) => t.erledigt).reverse();
  return html`
    <div class="card-head">
      <p class="muted small" style="margin:0">Verhandlungen, Haftprüfungen, Fristen und Wiedervorlagen zu dieser Akte.</p>
      <button class="btn small primary" data-action="termin-neu" data-akte="${a.id}">+ Termin</button>
    </div>
    ${offen.length ? html`<ul class="rows">${offen.map((t) => terminRow(t, { akte: false }))}</ul>` : html`<p class="empty">Keine offenen Termine.</p>`}
    ${erledigt.length ? html`<div class="group-title">Erledigt</div><ul class="rows">${erledigt.map((t) => terminRow(t, { akte: false }))}</ul>` : ""}`;
}

function tabAufgaben(a) {
  const list = kinder("aufgaben", a.id);
  const offen = list.filter((t) => !t.erledigt).sort(sortAufgaben);
  const erledigt = list.filter((t) => t.erledigt).sort((x, y) => new Date(y.erledigt_am || 0) - new Date(x.erledigt_am || 0));
  return html`
    <div class="card-head">
      <div class="muted small">${list.length ? fortschrittBalken(a.id) : "Noch keine Aufgaben – lege sie einzeln an oder starte einen Ablauf (Checkliste)."}</div>
      <button class="btn small" data-action="ablauf-starten" data-id="${a.id}">Ablauf starten</button>
    </div>
    ${aufgabeSchnellForm(a.id)}
    ${offen.length ? html`<ul class="rows">${offen.map((t) => aufgabeRow(t, { akte: false }))}</ul>` : html`<p class="empty">Keine offenen Aufgaben.</p>`}
    ${erledigt.length ? html`<div class="group-title">Erledigt</div><ul class="rows">${erledigt.map((t) => aufgabeRow(t, { akte: false }))}</ul>` : ""}`;
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
    { name: "mandant", label: "Mandant", required: true, half: true, placeholder: "Name – neu oder aus der Kartei",
      list: () => state.mandanten.map((m) => m.name).sort((x, y) => x.localeCompare(y, "de")),
      help: "Neue Namen kommen automatisch in die Mandantenkartei." },
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
  return findMandantByName(name) || insertRow("mandanten", { name: name.trim() });
}

function openAkteForm(akte, preset = {}) {
  const values = akte
    ? { ...akte, mandant: mandantName(akte) }
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
        title: v.title, client: mandant.name, mandant_id: mandant.id, opponent: v.opponent, area: v.area, typ: v.typ,
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
        <div class="field third"><label class="label">Geldstrafe</label><input name="geldstrafe" inputmode="decimal" placeholder="0"></div>
        <div class="field third"><label class="label">Haft (${state.settings.haft_einheit})</label><input name="haft" inputmode="decimal" placeholder="0"></div>
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
        <span class="right">${g.geldstrafe ? fmt.geld(g.geldstrafe) : ""}${g.haft ? html`<br>${fmt.haft(g.haft)}` : ""}
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
    await attempt(() => addVorwurf(akteId, { gesetz_id: g.id, paragraph: g.paragraph, titel: g.titel, geldstrafe: g.geldstrafe, haft: g.haft }),
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
      ],
      values: e,
      onMount: (form) => { form.elements.text.dataset.mention = ""; },
      onSubmit: async (v) => {
        const erwaehnt = erwaehnteIn(v.text);
        const vorher = new Set(e.erwaehnt || []);
        await updateRow("eintraege", e.id, { ...v, ...(erwaehnt.length || vorher.size ? { erwaehnt } : {}) });
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
    onSubmit: async (v) => { await insertRow("beweise", { ...v, akte_id: d.akte }); toast("Beweismittel gespeichert"); },
  }),
  "beweis-bearbeiten": (d) => {
    const b = byId("beweise", d.id);
    openForm({
      title: "Beweismittel bearbeiten",
      fields: beweisFields(),
      values: b,
      onSubmit: async (v) => { await updateRow("beweise", b.id, v); toast("Gespeichert"); },
      onDelete: async () => {
        if (!confirm(`„${b.titel}“ löschen?`)) return false;
        await deleteRow("beweise", b.id);
      },
    });
  },
});

CHANGES["akte-status"] = async (el) => {
  const a = byId("akten", el.dataset.id);
  const status = el.value;
  const ok = await attempt(() => updateRow("akten", a.id, { status }), `Status: ${status}`);
  if (ok !== undefined && status === "Geschlossen" && !a.ergebnis) openAbschlussForm(byId("akten", a.id));
};
