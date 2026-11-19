// =============================================================
//  Wiwang Law – App-Shell
//  - Kopfzeile: Brotkrumen (Kontext), Such-/Befehlsleiste
//  - Charakter-Switcher (Seitenleiste oben bzw. „Mehr“ auf dem Handy)
//  - Online-Liste (Avatar-Stapel in der Kopfzeile)
//  Aufklappmenüs nutzen die native Popover-API (popover="auto"):
//  Klick daneben oder Esc schließt sie von selbst.
// =============================================================

const POPOVER_API = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;
const SHELL_ICON = {
  wechseln: "M7 4v16M4 7l3-3 3 3M17 20V4M14 17l3 3 3-3",
  suche: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20.5 20.5 16 16",
  plus: "M12 5v14M5 12h14",
  paragraph: "M14.5 5.5A3 3 0 0 0 9 7c0 3 6 3 6 6.5a2.5 2.5 0 0 1-1.5 2.3M9.5 18.5A3 3 0 0 0 15 17c0-3-6-3-6-6.5a2.5 2.5 0 0 1 1.5-2.3",
  tastatur: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM7 9h.01M11 9h.01M15 9h.01M7 13h.01M17 13h.01M9 16h6",
  pfeil: "M5 12h14M13 6l6 6-6 6",
  haken: "M5 12.5l4.5 4.5L19 7.5",
};
function shellIcon(name, cls = "nav-icon") {
  return new SafeHtml(`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${SHELL_ICON[name] || NAV_ICON_PFADE[name] || ""}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
}

// ---------- Popover: öffnen, am Auslöser ausrichten, schließen ----------
let popAusloeser = null;
// Wer hat zuletzt ein Popover ausgelöst? (für die Ausrichtung)
document.addEventListener("pointerdown", (e) => { const t = e.target.closest("[popovertarget]"); if (t) popAusloeser = t; }, true);
document.addEventListener("keydown", (e) => { const t = e.target.closest && e.target.closest("[popovertarget]"); if (t) popAusloeser = t; }, true);

function popAusrichten(pop, anker) {
  if (!anker) return;
  const r = anker.getBoundingClientRect();
  const breite = pop.offsetWidth || 280;
  const hoehe = pop.offsetHeight || 200;
  const vw = window.innerWidth, vh = window.innerHeight;
  // rechtsbündig, wenn der Auslöser in der rechten Hälfte sitzt (Kopfzeile), sonst linksbündig (Seitenleiste)
  let left = r.left + r.width / 2 > vw / 2 ? r.right - breite : r.left;
  left = Math.max(8, Math.min(left, vw - breite - 8));
  let top = r.bottom + 6;
  if (top + hoehe > vh - 8 && r.top - hoehe - 6 > 8) top = r.top - hoehe - 6; // passt unten nicht: nach oben öffnen
  pop.style.left = `${Math.round(left)}px`;
  pop.style.top = `${Math.round(Math.max(8, top))}px`;
}

function popoverEinrichten(pop, fuellen) {
  const ausloeser = () => document.querySelectorAll(`[popovertarget="${pop.id}"]`);
  if (POPOVER_API) {
    pop.addEventListener("beforetoggle", (e) => {
      const offen = e.newState === "open";
      if (offen) fuellen(pop);
      ausloeser().forEach((b) => b.setAttribute("aria-expanded", offen ? "true" : "false"));
    });
    pop.addEventListener("toggle", (e) => { if (e.newState === "open") popAusrichten(pop, popAusloeser); });
  } else {
    // Ältere Browser: einfach ein-/ausblenden
    pop.hidden = true;
    document.addEventListener("click", (e) => {
      const t = e.target.closest(`[popovertarget="${pop.id}"]`);
      if (t) {
        e.preventDefault();
        if (pop.hidden) { fuellen(pop); pop.hidden = false; pop.classList.add("offen"); popAusrichten(pop, t); }
        else { pop.hidden = true; pop.classList.remove("offen"); }
      } else if (!pop.hidden && !pop.contains(e.target)) { pop.hidden = true; pop.classList.remove("offen"); }
    });
  }
  // Aktion im Menü gewählt → Menü zu
  pop.addEventListener("click", (e) => {
    if (!e.target.closest("[data-action], a[href]")) return;
    popSchliessen(pop);
    if (!$("nav-sheet").hidden) navSheet(false);
  });
  window.addEventListener("resize", () => popSchliessen(pop));
  window.addEventListener("hashchange", () => popSchliessen(pop));
}

function popSchliessen(pop) {
  if (POPOVER_API) { if (pop.matches(":popover-open")) pop.hidePopover(); }
  else { pop.hidden = true; pop.classList.remove("offen"); }
}

// ---------- Charakter-Switcher ----------
// Kanzlei-Marke + aktiver RP-Charakter + Rang + ⇅. Öffnet das Konto-Menü.
function charakterSwitcher({ imSheet = false } = {}) {
  const p = myProfile();
  const rang = (p && rangName(p)) || (state.isAdmin ? "Admin" : "Mitglied");
  return html`<button type="button" class="char-switch ${imSheet ? "im-sheet" : ""}" popovertarget="char-pop" aria-haspopup="menu" aria-expanded="false"
      title="Charakter wechseln, Profil, Abmelden">
    <img class="char-marke" src="assets/icon.png?v=60" alt="" width="36" height="36">
    <span class="char-text">
      <strong class="char-name">${myName() || "Mein Konto"}</strong>
      <span class="char-rang">${rang}</span>
    </span>
    ${shellIcon("wechseln", "char-pfeil")}
  </button>`;
}

function charakterPopoverInhalt() {
  const k = state.konto;
  const mitCharakteren = k && k.art === "charakter" && Array.isArray(k.charaktere);
  const p = typeof kontoPerson === "function" ? kontoPerson() : null;
  const andere = mitCharakteren ? k.charaktere.filter((c) => !c.aktiv && c.id !== (state.me && state.me.id)) : [];
  const zeile = (c) => {
    const geht = typeof erreichbar === "function" ? erreichbar(c, p) : c.status === "frei";
    return html`<button type="button" role="menuitem" class="pop-zeile" ${geht ? html`data-action="charakter-wechseln" data-id="${c.id}"` : "disabled"}>
      <span class="avatar" style="background:var(--nigel-bg);color:var(--nigel-accent)">${initialen(c.name)}</span>
      <span class="pop-text"><strong>${c.name}</strong><small>${c.art === "mandant" ? "Mandantenportal" : c.rang || (c.status === "frei" ? "noch kein Rang" : c.status === "wartet" ? "wartet auf Freigabe" : c.status)}</small></span>
      ${geht ? shellIcon("pfeil", "pop-pfeil") : ""}
    </button>`;
  };
  const prof = myProfile();
  return html`
    <div class="pop-kopf">
      ${avatar(state.me && state.me.id, { gross: true, punkt: false })}
      <span class="pop-text"><strong>${myName()}</strong><small>${(prof && rangName(prof)) || ""}${state.isAdmin ? " · Admin" : ""}</small></span>
    </div>
    ${mitCharakteren ? html`
      <div class="pop-titel">Charakter wechseln</div>
      ${andere.length ? andere.map(zeile) : html`<p class="pop-leer">Keine weiteren Charaktere.</p>`}
      <button type="button" role="menuitem" class="pop-zeile ruhig" data-action="charakter-menue">${shellIcon("plus")}<span>Charaktere verwalten …</span></button>`
    : k && k.art === "mitglied" ? html`
      <button type="button" role="menuitem" class="pop-zeile" data-action="charakter-menue">${shellIcon("wechseln")}<span>Mit Discord verknüpfen …</span></button>` : ""}
    <hr>
    <button type="button" role="menuitem" class="pop-zeile" data-action="profil-bearbeiten">${shellIcon("profil")}<span>Mein Profil</span></button>
    <button type="button" role="menuitem" class="pop-zeile danger" data-action="logout">${shellIcon("abmelden")}<span>Abmelden</span></button>`;
}

popoverEinrichten($("char-pop"), (pop) => {
  pop.innerHTML = String(charakterPopoverInhalt());
  // Liste aktuell halten (neue Freigaben), ohne das Öffnen zu verzögern
  if (typeof kontoLaden === "function" && state.konto && state.konto.art === "charakter" && !ui.kontoFrisch) {
    ui.kontoFrisch = true;
    kontoLaden().then(() => { if (POPOVER_API ? pop.matches(":popover-open") : !pop.hidden) pop.innerHTML = String(charakterPopoverInhalt()); }, () => {});
    setTimeout(() => { ui.kontoFrisch = false; }, 30000);
  }
});

// ---------- Online-Liste ----------
function onlineAndere() {
  if (!state.me) return [];
  return [...state.online.keys()].filter((id) => id !== state.me.id && profileOf(id))
    .sort((a, b) => (onlineStatus(a) === "weg") - (onlineStatus(b) === "weg") || personName(a).localeCompare(personName(b), "de"));
}

popoverEinrichten($("online-pop"), (pop) => {
  const ids = onlineAndere();
  pop.innerHTML = String(html`
    <div class="pop-titel">Gerade online (${ids.length})</div>
    ${ids.map((id) => {
      const o = state.online.get(id);
      const akte = o ? [...o.akten].map((x) => byId("akten", x)).filter(Boolean)[0] : null;
      return html`<a class="pop-zeile" href="#/team/${id}">
        ${avatar(id)}
        <span class="pop-text"><strong>${personName(id)}</strong>
          <small>${onlineStatus(id) === "weg" ? "im Hintergrund" : akte ? html`in ${akte.number}` : "online"}</small></span></a>`;
    })}
    <hr>
    <a class="pop-zeile ruhig" href="#/team-heute">${shellIcon("mandanten")}<span>Team heute ansehen</span></a>`);
});

// ---------- Brotkrumen in der Kopfzeile ----------
function kopfKontext(route) {
  const el = $("kopf-kontext");
  if (!el) return;
  const n = NAV.find((x) => x.page === route.page) || NAV[0];
  let detail = null;
  if (route.id) {
    if (route.page === "akten") { const a = byId("akten", route.id); detail = a ? html`<span class="mono">${a.number}</span>` : null; }
    else if (route.page === "mandanten") { const m = byId("mandanten", route.id); detail = m ? m.name : route.id === "portal" ? "Mandantenportal" : null; }
    else if (route.page === "gesetze") { const b = byId("gesetzbuecher", route.id); detail = b ? b.kuerzel : null; }
    else if (route.page === "team") { const p = profileOf(route.id); detail = p ? personName(route.id) : null; }
    else if (route.page === "finanzen") detail = { rechnungen: "Rechnungen", bilanz: "Bilanz", guv: "GuV", grundbuch: "Grundbuch", hauptbuch: "Hauptbuch", konten: "Konten", gebuehren: "Gebühren" }[route.id] || null;
  }
  const sep = html`<span class="crumb-sep" aria-hidden="true">/</span>`;
  el.innerHTML = String(html`
    <span class="crumb-gruppe">${n.gruppe}</span>${sep}
    ${detail ? html`<a class="crumb" href="${n.href}">${n.label}</a>${sep}<span class="crumb aktuell" aria-current="page">${detail}</span>`
      : html`<span class="crumb aktuell" aria-current="page">${n.label}</span>`}`);
}

// ---------- Such- & Befehlsleiste ----------
const cmd = { q: "", i: 0, items: [] };

function cmdAktionen() {
  const liste = [
    { titel: "Neue Akte anlegen", sub: "Leere Akte mit Aktenzeichen", kbd: "N", icon: "plus", recht: AKTIONS_RECHTE["akte-neu"], los: () => ACTIONS["akte-neu"]({}) },
    { titel: "§ Paragraph nachschlagen", sub: "Gesetzestexte durchsuchen", icon: "paragraph", recht: SEITEN_RECHTE.gesetze, los: () => { go("gesetze"); setTimeout(() => { const s = document.querySelector("#main [data-search]"); if (s) s.focus(); }, 60); } },
    { titel: "Strafkatalog öffnen", sub: "Delikte, Geldstrafe, Haft", icon: "gesetzbuch", recht: SEITEN_RECHTE.gesetzbuch, los: () => go("gesetzbuch") },
    { titel: "Kalender öffnen", sub: "Termine, Fristen, Aufgaben", icon: "kalender", recht: SEITEN_RECHTE.kalender, los: () => go("kalender") },
    { titel: "Nigel fragen", sub: "KI-Butler – auch mit K", kbd: "K", icon: "nigel", recht: "ki_assistent", los: () => { if (ACTIONS["ki-oeffnen"]) ACTIONS["ki-oeffnen"]({}); else go("nigel"); } },
    { titel: "Tastenkürzel anzeigen", sub: "Alle Abkürzungen auf einen Blick", icon: "tastatur", los: () => tastenkuerzelZeigen() },
    { titel: "Design umschalten", sub: "Hell / Dunkel", icon: "uebersicht", los: () => ACTIONS["theme-umschalten"]() },
  ];
  return liste.filter((a) => erlaubt(a.recht));
}

function cmdEintraege(q) {
  const aktionen = cmdAktionen().filter((a) => matches(q, a.titel, a.sub)).map((a) => ({ ...a, gruppe: "Schnellaktionen" }));
  if (!q) {
    const zuletzt = darf("akten_lesen") ? [...state.akten].filter((a) => a.status !== "Geschlossen")
      .sort((a, b) => zuletztAktiv(b) - zuletztAktiv(a)).slice(0, 5)
      .map((a) => ({ gruppe: "Zuletzt aktive Akten", titel: `${a.number} · ${a.title}`, sub: `${mandantName(a)} · ${a.status}`, href: `#/akten/${a.id}`, icon: "akten" })) : [];
    return [...aktionen, ...zuletzt];
  }
  const treffer = typeof globaleSuche === "function" ? globaleSuche(q) : [];
  const icons = { Akten: "akten", Mandanten: "mandanten", Beteiligte: "mandanten", Verlauf: "dokument", Beweismittel: "dokument", Termine: "kalender", Rechnungen: "rechnung", Gesetze: "gesetze", Strafkatalog: "gesetzbuch" };
  return [...aktionen, ...treffer.flatMap((g) => g.items.map((i) => ({ gruppe: g.titel, titel: i.titel, sub: i.sub, href: i.href, icon: icons[g.titel] || "dokument" })))];
}

function cmdZeichnen() {
  const liste = $("cmd-liste");
  if (!liste) return;
  cmd.items = cmdEintraege(cmd.q.trim());
  cmd.i = Math.min(cmd.i, Math.max(0, cmd.items.length - 1));
  let gruppe = null;
  liste.innerHTML = String(cmd.items.length ? html`${cmd.items.map((it, i) => {
    const kopf = it.gruppe !== gruppe ? html`<div class="cmd-gruppe" role="presentation">${it.gruppe}</div>` : "";
    gruppe = it.gruppe;
    return html`${kopf}<div class="cmd-item ${i === cmd.i ? "aktiv" : ""}" role="option" id="cmd-i-${i}" aria-selected="${i === cmd.i}" data-i="${i}">
      ${shellIcon(it.icon)}<span class="cmd-item-text"><strong>${it.titel}</strong>${it.sub ? html`<small>${it.sub}</small>` : ""}</span>
      ${it.kbd ? html`<kbd>${it.kbd}</kbd>` : ""}</div>`;
  })}` : html`<p class="cmd-leer">Nichts gefunden für „${cmd.q}“.</p>`);
  const inp = $("cmd-q");
  if (inp) inp.setAttribute("aria-activedescendant", cmd.items.length ? `cmd-i-${cmd.i}` : "");
  const aktiv = liste.querySelector(".cmd-item.aktiv");
  if (aktiv) aktiv.scrollIntoView({ block: "nearest" });
}

function cmdAusfuehren(i) {
  const it = cmd.items[i];
  if (!it) return;
  $("cmd-dialog").close();
  if (it.href) { if (location.hash === it.href) render(); else location.hash = it.href; }
  else if (it.los) it.los();
}

function cmdOeffnen(start = "") {
  if (!state.loaded) return;
  const dlg = $("cmd-dialog");
  cmd.q = start;
  cmd.i = 0;
  dlg.innerHTML = String(html`
    <div class="cmd-kopf">
      ${shellIcon("suche")}
      <input id="cmd-q" type="search" value="${start}" placeholder="Akten, Mandanten, Paragraphen suchen – oder Befehl …" autocomplete="off" spellcheck="false"
        role="combobox" aria-expanded="true" aria-controls="cmd-liste" aria-label="Suchen oder Befehl">
      <button type="button" class="btn ghost small cmd-zu" data-close aria-label="Schließen"><kbd>Esc</kbd></button>
    </div>
    <div class="cmd-liste" id="cmd-liste" role="listbox" aria-label="Ergebnisse"></div>
    <div class="cmd-fuss"><span><kbd>↑</kbd><kbd>↓</kbd> auswählen</span><span><kbd>Enter</kbd> öffnen</span><span><kbd>Esc</kbd> schließen</span></div>`);
  dlg.querySelector("[data-close]").addEventListener("click", () => dlg.close());
  if (!dlg.open) dlg.showModal();
  cmdZeichnen();
  const inp = $("cmd-q");
  inp.focus();
  inp.addEventListener("input", () => { cmd.q = inp.value; cmd.i = 0; cmdZeichnen(); });
  inp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!cmd.items.length) return;
      cmd.i = (cmd.i + (e.key === "ArrowDown" ? 1 : -1) + cmd.items.length) % cmd.items.length;
      cmdZeichnen();
    } else if (e.key === "Enter") {
      e.preventDefault();
      cmdAusfuehren(cmd.i);
    }
  });
}

$("cmd-dialog").addEventListener("click", (e) => {
  const it = e.target.closest(".cmd-item");
  if (it) return cmdAusfuehren(Number(it.dataset.i));
  if (e.target === e.currentTarget) e.currentTarget.close(); // Klick auf den Hintergrund
});
$("cmd-dialog").addEventListener("mousemove", (e) => {
  const it = e.target.closest(".cmd-item");
  if (it && Number(it.dataset.i) !== cmd.i) { cmd.i = Number(it.dataset.i); $("cmd-dialog").querySelectorAll(".cmd-item").forEach((x) => x.classList.toggle("aktiv", x === it)); }
});

function tastenkuerzelZeigen() {
  const zeilen = [
    ["/", "Suchen: Suchfeld der Seite – sonst Such- & Befehlsleiste"], ["Strg K", "Such- & Befehlsleiste öffnen"],
    ["N", "Neue Akte anlegen"], ["B", "Benachrichtigungen öffnen/schließen"], ["K", "Nigel (iFruit-Handy) öffnen/schließen"],
    ["[", "Aktenliste aus-/einblenden (in einer Akte)"], ["Esc", "Dialog, Menü oder Handy schließen"],
  ];
  openDialog({
    title: "Tastenkürzel",
    body: html`<dl class="kuerzel-liste">${zeilen.map(([k, t]) => html`<div><dt>${k.split(" ").map((x) => html`<kbd>${x}</kbd>`)}</dt><dd>${t}</dd></div>`)}</dl>`,
  });
}

Object.assign(ACTIONS, {
  "cmd-oeffnen": () => cmdOeffnen(),
  "tastenkuerzel": () => tastenkuerzelZeigen(),
});

// Strg/⌘ + K öffnet die Befehlsleiste überall (auch aus Eingabefeldern)
document.addEventListener("keydown", (e) => {
  if (!state.loaded || !(e.ctrlKey || e.metaKey) || e.altKey || e.key.toLowerCase() !== "k") return;
  if (document.body.classList.contains("im-portal")) return;
  e.preventDefault();
  const dlg = $("cmd-dialog");
  if (dlg.open) dlg.close(); else { closeDialogs(); cmdOeffnen(); }
});
