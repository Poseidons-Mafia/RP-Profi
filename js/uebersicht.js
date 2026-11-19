// =============================================================
//  Wiwang Law – Übersicht (Startseite)
// =============================================================

const TABELLEN_NAMEN = {
  akten: "Akte", eintraege: "Verlaufseintrag", beteiligte: "Beteiligte/n", beweise: "Beweismittel",
  termine: "Termin", aufgaben: "Aufgabe", rechnungen: "Rechnung", mandanten: "Mandant", buchungen: "Buchung",
};
const FELD_NAMEN = {
  status: "Status", prioritaet: "Priorität", title: "Titel", summary: "Sachverhalt", opponent: "Gegenpartei",
  zustaendig_id: "Zuständig", vorwuerfe: "Tatvorwürfe", in_haft: "Haft", haft_bis: "Haft bis", ergebnis: "Ergebnis",
  ergebnis_details: "Strafmaß", az_extern: "Az. extern", area: "Rechtsgebiet", typ: "Mandatsart", erledigt: "erledigt",
  beginn: "Zeitpunkt", text: "Text", titel: "Titel", summe: "Summe", positionen: "Leistungen", name: "Name",
  telefon: "Telefon", notizen: "Notizen", markierungen: "Markierungen", client: "Mandant", mandant_id: "Mandant",
  verantwortlich: "Verantwortlich", zustaendig: "Zuständig", faellig: "Fälligkeit", ort: "Ort", link: "Link",
  bezahlt_am: "Bezahlt am", wichtig: "wichtig", art: "Art", rolle: "Rolle", kontakt: "Kontakt",
  erwaehnt: "Erwähnungen",
};

function aenderungText(p) {
  const ch = p.aenderungen || {};
  const keys = Object.keys(ch).filter((k) => !["erledigt_am", "client", "mandant_id"].includes(k) || Object.keys(ch).length === 1);
  if (ch.status) return `Status: ${ch.status[0]} → ${ch.status[1]}`;
  if (ch.erledigt) return ch.erledigt[1] === "true" ? "als erledigt markiert" : "wieder geöffnet";
  if (ch.in_haft) return ch.in_haft[1] === "true" ? "Mandant in Haft vermerkt" : "Haft beendet";
  if (ch.ergebnis && ch.ergebnis[1]) return `Ergebnis: ${ch.ergebnis[1]}`;
  return keys.map((k) => FELD_NAMEN[k] || k).join(", ");
}

function protokollZeile(p, { akte = true } = {}) {
  const verb = { INSERT: "angelegt", UPDATE: "geändert", DELETE: "gelöscht" }[p.aktion] || p.aktion;
  const a = p.akte_id ? byId("akten", p.akte_id) : null;
  const detail = p.aktion === "UPDATE" ? aenderungText(p) : "";
  const was = TABELLEN_NAMEN[p.tabelle] || p.tabelle;
  return html`
    <li>
      <div class="when"><strong>${fmt.zeit(p.zeit)}</strong>${fmt.tag(p.zeit)}</div>
      <div class="grow">
        <div><strong>${personName(p.benutzer)}</strong> hat ${was} ${p.tabelle !== "akten" && p.info ? html`„${truncate(p.info, 70)}“ ` : ""}<span class="${p.aktion === "DELETE" ? "danger-text" : ""}">${verb}</span></div>
        <div class="meta">${joinHtml([
          detail || null,
          akte && a ? html`<a href="#/akten/${a.id}">${a.number} · ${truncate(a.title, 40)}</a>` : akte && p.tabelle === "akten" ? p.info : null,
        ])}</div>
      </div>
    </li>`;
}

// ---------- Globale Suche ----------
function globaleSuche(q) {
  const gruppen = [];
  const add = (titel, items) => items.length && gruppen.push({ titel, items: items.slice(0, 8), mehr: Math.max(0, items.length - 8) });
  add("Akten", state.akten.filter((a) => matches(q, a.number, a.title, mandantName(a), a.opponent, a.az_extern, a.summary,
    (a.vorwuerfe || []).map((v) => `${v.paragraph || ""} ${v.titel}`))).map((a) => ({
    href: `#/akten/${a.id}`, titel: `${a.number} · ${a.title}`, sub: `${mandantName(a)} · ${a.status}` })));
  add("Mandanten", state.mandanten.filter((m) => matches(q, m.name, m.telefon, m.discord, m.notizen)).map((m) => ({
    href: `#/mandanten/${m.id}`, titel: m.name, sub: [m.telefon, m.discord].filter(Boolean).join(" · ") })));
  add("Beteiligte", state.beteiligte.filter((b) => matches(q, b.name, b.kontakt, b.notiz)).map((b) => {
    const a = byId("akten", b.akte_id);
    return { href: `#/akten/${b.akte_id}/beteiligte`, titel: `${b.name} (${b.rolle})`, sub: a ? `${a.number} · ${a.title}` : "" };
  }));
  add("Verlauf", state.eintraege.filter((e) => matches(q, e.text)).map((e) => {
    const a = byId("akten", e.akte_id);
    return { href: `#/akten/${e.akte_id}/verlauf`, titel: truncate(e.text, 90), sub: `${a ? a.number : ""} · ${fmt.datum(e.created_at)} · ${eintragAutor(e)}` };
  }));
  add("Beweismittel", state.beweise.filter((b) => matches(q, b.titel, b.beschreibung, b.art)).map((b) => {
    const a = byId("akten", b.akte_id);
    return { href: `#/akten/${b.akte_id}/beweise`, titel: `${b.art}: ${b.titel}`, sub: a ? `${a.number} · ${a.title}` : "" };
  }));
  add("Termine", state.termine.filter((t) => matches(q, t.titel, t.ort, t.notiz, t.art)).map((t) => ({
    href: t.akte_id ? `#/akten/${t.akte_id}/termine` : "#/kalender", titel: `${t.titel} (${t.art})`, sub: fmt.datumZeit(t.beginn) })));
  add("Rechnungen", state.rechnungen.filter((r) => matches(q, r.nummer, r.empfaenger, r.betreff)).map((r) => ({
    href: r.akte_id ? `#/akten/${r.akte_id}/rechnungen` : "#/finanzen/rechnungen", titel: `${r.nummer} · ${r.empfaenger}`, sub: `${fmt.geld(r.summe)} · ${r.status}` })));
  add("Gesetze", state.paragraphen.filter((p) => matches(q, p.nummer, p.titel, p.text, (byId("gesetzbuecher", p.gesetzbuch_id) || {}).kuerzel)).map((p) => ({
    href: `#/gesetze/${p.gesetzbuch_id}/${p.id}`, titel: `${paragraphZitat(p)} ${p.titel || ""}`, sub: truncate(String(p.text || "").replace(/\s+/g, " "), 90) })));
  add("Strafkatalog", state.gesetze.filter((g) => matches(q, g.paragraph, g.titel, g.kategorie)).map((g) => ({
    href: "#/gesetzbuch", titel: `${g.paragraph || ""} ${g.titel}`, sub: [g.geldstrafe ? fmt.geld(g.geldstrafe) : "", g.haft ? fmt.haft(g.haft) : ""].filter(Boolean).join(" · ") })));
  return gruppen;
}

// ---------- Statistik ----------
function balken(rows, color = "") {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return html`<div class="bars">${rows.map((r) => html`
    <div class="bar-row"><span>${r.label}</span><span class="bar"><span class="${r.color || color}" style="width:${Math.round((r.n / max) * 100)}%"></span></span><span class="n">${r.text ?? r.n}</span></div>`)}</div>`;
}

function statistik() {
  const A = darf("akten_lesen"), R = darf("rechnungen_lesen");
  if (!A && !R) return "";
  const akten = state.akten;
  const mitErgebnis = akten.filter((a) => a.ergebnis);
  const erfolge = mitErgebnis.filter((a) => ERFOLGE.includes(a.ergebnis)).length;
  const ergebnisRows = OPTIONEN.ergebnis.map((e) => ({ label: e, n: mitErgebnis.filter((a) => a.ergebnis === e).length, color: ERFOLGE.includes(e) ? "green" : "red" })).filter((r) => r.n);
  const gebiete = OPTIONEN.rechtsgebiet.map((g) => ({ label: g, n: akten.filter((a) => a.area === g).length })).filter((r) => r.n);
  const anwalt = team().map((p) => {
    const umsatz = state.rechnungen.filter((r) => r.status === "Bezahlt" && r.unterzeichner === p.user_id).reduce((t, r) => t + (Number(r.summe) || 0), 0);
    return { label: personName(p.user_id), n: akten.filter((a) => a.zustaendig_id === p.user_id && a.status !== "Geschlossen").length, umsatz };
  });
  const umsatzMonate = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const key = ymd(d).slice(0, 7);
    const n = state.rechnungen.filter((r) => r.status === "Bezahlt" && String(r.bezahlt_am || r.datum).startsWith(key)).reduce((t, r) => t + (Number(r.summe) || 0), 0);
    umsatzMonate.push({ label: MONATE[d.getMonth()].slice(0, 3) + " " + String(d.getFullYear()).slice(2), n, text: fmt.geld(n) });
  }
  return html`
    <div class="statistik-raster">
      ${A ? html`<div class="card">
        <h3 class="section-title">Ergebnisse${mitErgebnis.length ? ` – Erfolgsquote ${Math.round((erfolge / mitErgebnis.length) * 100)} %` : ""}</h3>
        ${ergebnisRows.length ? balken(ergebnisRows) : html`<p class="empty">Noch keine abgeschlossenen Fälle mit Ergebnis.</p>`}
      </div>` : ""}
      ${R ? html`<div class="card">
        <h3 class="section-title">Umsatz (bezahlte Rechnungen)</h3>
        ${balken(umsatzMonate, "green")}
      </div>` : ""}
      ${A ? html`<div class="card">
        <h3 class="section-title">Akten nach Rechtsgebiet</h3>
        ${gebiete.length ? balken(gebiete) : html`<p class="empty">Noch keine Akten.</p>`}
      </div>
      <div class="card">
        <h3 class="section-title">Team – aktive Akten${R ? " & Umsatz" : ""}</h3>
        ${anwalt.length ? balken(anwalt.map((x) => ({ label: x.label, n: x.n, text: R ? `${x.n} · ${fmt.geld(x.umsatz)}` : String(x.n) })), "red") : ""}
      </div>` : ""}
    </div>`;
}

// ---------- Seite ----------
// Zwei Reiter: „Mein Arbeitstag“ (Standard) und „Kanzlei-Aktivität & Statistik“.
// Mein Arbeitstag in drei Zonen: Notruf (nur wenn aktiv) · Handlungs-Kennzahlen · Fokus + Kanzlei-Puls.
const DASH_KEY = "wiwang-dash-reiter";
ui.dash = {
  reiter: (() => { try { return localStorage.getItem(DASH_KEY) === "kanzlei" ? "kanzlei" : "arbeitstag"; } catch { return "arbeitstag"; } })(),
  fokus: "aufgaben",
};

function dashDaten() {
  const now = new Date();
  const today = startOfDay();
  const offeneAkten = state.akten.filter((a) => a.status !== "Geschlossen");
  return {
    now,
    offeneAkten,
    ueberfaellig: state.termine.filter(terminUeberfaellig).sort((a, b) => new Date(a.beginn) - new Date(b.beginn)),
    naechste: state.termine.filter((t) => !t.erledigt && new Date(t.beginn) >= today && new Date(t.beginn) < addDays(today, 8))
      .sort((a, b) => new Date(a.beginn) - new Date(b.beginn)),
    inHaft: state.akten.filter((a) => a.in_haft && a.status !== "Geschlossen")
      .sort((a, b) => new Date(a.haft_bis || "9999") - new Date(b.haft_bis || "9999")),
    meineAufgaben: state.aufgaben.filter((t) => !t.erledigt && (t.zustaendig === state.me.id || (!t.zustaendig && isMe(t.created_by)))).sort(sortAufgaben),
    dringend: offeneAkten.filter((a) => a.prioritaet === "Dringend" || a.prioritaet === "Hoch")
      .sort((a, b) => (a.prioritaet === "Dringend" ? -1 : 1) - (b.prioritaet === "Dringend" ? -1 : 1)),
    liegen: offeneAkten.filter(liegenGeblieben)
      .sort((a, b) => (b.zustaendig_id === state.me.id) - (a.zustaendig_id === state.me.id) || zuletztAktiv(a) - zuletztAktiv(b)),
  };
}

// Zone 0: aktiver Mandanten-Notruf („festgenommen“) – volle Breite, signalrot
function notrufSlot() {
  const liste = typeof offeneNotrufe === "function" ? offeneNotrufe() : [];
  if (!liste.length) return "";
  const darfUebernehmen = darf("akten_schreiben") || darf("mandanten_schreiben");
  return html`<section class="notruf-slot" role="alert" aria-label="Offener Notruf">
    <div class="notruf-symbol" aria-hidden="true">🚨</div>
    <div class="notruf-inhalt">
      <div class="notruf-titel">${liste.length === 1 ? "Mandanten-Notruf: festgenommen" : `${liste.length} Mandanten-Notrufe: festgenommen`}</div>
      <ul class="notruf-liste">${liste.map((x) => html`<li>
        <div class="grow">
          <strong>${anliegenVonText(x) || "Mandant"}</strong>${x.erreichbar ? html` · ${x.erreichbar}` : ""}
          <span class="notruf-zeit">${fmt.bis(x.created_at).replace(/^seit /, "seit ")}</span>
          ${x.text ? html`<div class="notruf-text">${truncate(x.text, 160)}</div>` : ""}
        </div>
        <div class="notruf-aktionen">
          ${darfUebernehmen ? html`<button type="button" class="btn notruf-btn" data-action="anliegen-status" data-id="${x.id}" data-status="angenommen">Notruf übernehmen</button>` : ""}
          <a class="btn ghost notruf-link" href="#/mandanten/portal">Details</a>
        </div>
      </li>`)}</ul>
    </div>
  </section>`;
}

// Zone 1: Handlungs-Kennzahlen – 0 = ruhig mit Häkchen, > 0 = farbiger Akzentstreifen + Direktfilter
function kpiKachel({ label, n, ton, href, aktion, hinweis, ruhigText = "Alles im Griff" }) {
  const aktiv = n > 0;
  return html`<a class="kpi-kachel ${aktiv ? `aktiv ${ton}` : "ruhig"}" href="${href}" ${aktion ? new SafeHtml(aktion) : ""}>
    <span class="kpi-label">${label}</span>
    <span class="kpi-wert">${n}</span>
    <span class="kpi-hinweis">${aktiv ? hinweis : html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>${ruhigText}`}</span>
  </a>`;
}

function dashKennzahlen(d, A, T) {
  const kacheln = [
    A && kpiKachel({ label: "Mandanten in Haft", n: d.inHaft.length, ton: "danger", href: "#/akten",
      aktion: 'data-action="akten-zeigen" data-status="haft"', hinweis: d.inHaft[0] && d.inHaft[0].haft_bis ? `nächstes Haftende ${fmt.bis(d.inHaft[0].haft_bis)}` : "Haftende im Blick behalten" }),
    T && kpiKachel({ label: "Überfällige Fristen", n: d.ueberfaellig.length, ton: "danger", href: "#/",
      aktion: 'data-action="fokus-tab" data-tab="aufgaben"', hinweis: "Fristen & Wiedervorlagen", ruhigText: "Keine überfällig" }),
    A && kpiKachel({ label: "Liegen gebliebene Akten", n: d.liegen.length, ton: "warning", href: "#/akten",
      aktion: 'data-action="akten-zeigen" data-status="liegen"', hinweis: `seit ${state.settings.liegezeit_tage}+ Tagen ohne Bewegung` }),
    T && kpiKachel({ label: "Meine offenen Aufgaben", n: d.meineAufgaben.length, ton: d.meineAufgaben.some(aufgabeUeberfaellig) ? "danger" : "warning", href: "#/",
      aktion: 'data-action="fokus-tab" data-tab="aufgaben"', hinweis: d.meineAufgaben.some(aufgabeUeberfaellig) ? `${d.meineAufgaben.filter(aufgabeUeberfaellig).length} davon überfällig` : "zum Abarbeiten", ruhigText: "Nichts offen" }),
  ].filter(Boolean);
  return kacheln.length ? html`<div class="kpi-reihe" role="list">${kacheln.map((k) => html`<div role="listitem">${k}</div>`)}</div>` : "";
}

// Zone 2 links: „Mein Fokus“ – eine Karte mit Reitern
function fokusKarte(d, A, T) {
  const reiter = [
    T && { key: "aufgaben", label: "Aufgaben & Fristen", n: d.meineAufgaben.length + d.ueberfaellig.length, rot: d.ueberfaellig.length > 0 },
    A && { key: "dringend", label: "Dringend & Liegen geblieben", n: d.dringend.length + d.liegen.length + d.inHaft.length, rot: d.inHaft.length > 0 },
    T && { key: "termine", label: "Termine (7 Tage)", n: d.naechste.length },
  ].filter(Boolean);
  if (!reiter.length) return "";
  const aktiv = reiter.some((r) => r.key === ui.dash.fokus) ? ui.dash.fokus : reiter[0].key;
  const inhalt = {
    aufgaben: () => html`
      ${aufgabeSchnellForm(null)}
      ${d.ueberfaellig.length ? html`<div class="group-title danger-text">Überfällige Fristen</div><ul class="rows">${d.ueberfaellig.map((t) => terminRow(t))}</ul>` : ""}
      <div class="group-title">Meine Aufgaben</div>
      ${d.meineAufgaben.length ? html`<ul class="rows">${d.meineAufgaben.slice(0, 15).map((t) => aufgabeRow(t))}</ul>` : html`<p class="empty">Keine offenen Aufgaben.</p>`}`,
    dringend: () => html`
      ${d.inHaft.length ? html`<div class="group-title danger-text">Mandanten in Haft</div>
        <ul class="rows">${d.inHaft.map((a) => html`<li>
          <div class="grow"><div class="title"><a href="#/akten/${a.id}">${mandantName(a)}</a> <span class="badge haft">In Haft</span></div>
          <div class="meta"><span class="mono">${a.number}</span> · ${truncate(a.title, 50)}</div></div>
          <div class="when right">${a.haft_bis ? html`<strong>${fmt.bis(a.haft_bis)}</strong>${fmt.datumZeit(a.haft_bis)}` : "Ende offen"}</div>
        </li>`)}</ul>` : ""}
      ${d.dringend.length ? html`<div class="group-title">Dringend & hohe Priorität</div>
        <ul class="item-list">${d.dringend.slice(0, 8).map((a) => html`<li>${akteListItem(a)}</li>`)}</ul>` : ""}
      ${d.liegen.length ? html`<div class="group-title">Liegen geblieben <span class="muted small">(seit ${state.settings.liegezeit_tage}+ Tagen nichts passiert, kein Termin)</span></div>
        <ul class="rows">${d.liegen.slice(0, 8).map((a) => html`<li>
          <div class="when"><strong class="danger-text">${liegtSeitTagen(a)} Tage</strong>still</div>
          <div class="grow">
            <div class="title"><a href="#/akten/${a.id}"><span class="mono">${a.number}</span> · ${truncate(a.title, 50)}</a></div>
            <div class="meta">${joinHtml([mandantName(a), html`Zuständig: ${a.zustaendig_id === state.me.id ? html`<strong>du</strong>` : personName(a.zustaendig_id, "niemand")}`])}</div>
          </div>
          <div class="tools"><button class="btn small" data-action="wiedervorlage" data-id="${a.id}" title="Wiedervorlage-Termin anlegen">Wiedervorlage</button></div>
        </li>`)}</ul>
        ${d.liegen.length > 8 ? html`<a class="btn small ghost" href="#/akten" data-action="akten-zeigen" data-status="liegen">Alle ${d.liegen.length} anzeigen</a>` : ""}` : ""}
      ${!d.inHaft.length && !d.dringend.length && !d.liegen.length ? html`<p class="empty">Nichts Dringendes – alle Akten sind in Bewegung.</p>` : ""}`,
    termine: () => html`
      ${d.naechste.length ? html`<ul class="rows">${d.naechste.map((t) => terminRow(t))}</ul>` : html`<p class="empty">Keine Termine in den nächsten 7 Tagen.</p>`}
      <div class="actions-row" style="margin-top:10px"><a class="btn small ghost" href="#/kalender">Zum Kalender →</a></div>`,
  }[aktiv];
  return html`<section class="card fokus-karte" id="fokus" aria-label="Mein Fokus">
    <div class="card-head">
      <h2>Mein Fokus</h2>
      <div class="seg-tabs" role="tablist" aria-label="Fokus">
        ${reiter.map((r) => html`<button type="button" role="tab" class="seg-tab ${r.key === aktiv ? "active" : ""}" aria-selected="${r.key === aktiv}"
          data-action="fokus-tab" data-tab="${r.key}">${r.label}${r.n ? html`<span class="seg-n ${r.rot ? "rot" : ""}">${r.n}</span>` : ""}</button>`)}
      </div>
    </div>
    <div class="fokus-inhalt" role="tabpanel">${inhalt()}</div>
  </section>`;
}

VIEWS.uebersicht = () => {
  const d = dashDaten();
  // Was der Rang nicht lesen darf, erscheint auch nicht auf der Übersicht
  const A = darf("akten_lesen"), T = darf("termine_lesen");
  const profil = myProfile();
  const stunde = d.now.getHours();
  const gruss = stunde < 11 ? "Guten Morgen" : stunde < 18 ? "Guten Tag" : "Guten Abend";
  // Sprungmarken (#/pinnwand, #/team-heute) liegen im ersten Reiter
  if (ui.anker === "pinnwand" || ui.anker === "team-heute") ui.dash.reiter = "arbeitstag";
  const reiter = ui.dash.reiter;

  return html`
    <div class="page dashboard">
      <div class="page-head">
        <div>
          <h1>${gruss}${profil && profil.anzeigename ? `, ${firstName(profil.anzeigename)}` : ""}</h1>
          <p class="muted">${fmt.tagLang(d.now)} · ${state.settings.kanzlei}</p>
        </div>
        <div class="seg-tabs gross" role="tablist" aria-label="Übersicht">
          <button type="button" role="tab" class="seg-tab ${reiter === "arbeitstag" ? "active" : ""}" aria-selected="${reiter === "arbeitstag"}" data-action="dash-tab" data-tab="arbeitstag">Mein Arbeitstag</button>
          <button type="button" role="tab" class="seg-tab ${reiter === "kanzlei" ? "active" : ""}" aria-selected="${reiter === "kanzlei"}" data-action="dash-tab" data-tab="kanzlei">Kanzlei-Aktivität & Statistik</button>
        </div>
      </div>

      ${profil && !profil.anzeigename ? html`
        <div class="box info">Lege deinen <strong>Anzeigenamen</strong> fest – er erscheint im Verlauf, auf Rechnungen und in Dokumenten.
          <div class="actions-row"><button class="btn small gold" data-action="profil-bearbeiten">Profil ausfüllen</button></div></div>` : ""}

      ${reiter === "arbeitstag" ? html`
        ${notrufSlot()}
        ${dashKennzahlen(d, A, T)}
        <div class="dash-grid">
          <div class="dash-haupt">${fokusKarte(d, A, T)}</div>
          <aside class="dash-puls" aria-label="Kanzlei-Puls">
            ${pinnwandKarte()}
            ${teamHeute()}
          </aside>
        </div>` : html`
        <div class="dash-grid kanzlei">
          <section class="card">
            <div class="card-head"><h2>Letzte Aktivitäten im Team</h2><span class="live-hinweis"><span class="live-punkt"></span>live</span></div>
            ${state.protokoll.length ? html`<ul class="rows">${state.protokoll.slice(0, 30).map((p) => protokollZeile(p))}</ul>` : html`<p class="empty">Noch keine Aktivitäten.</p>`}
          </section>
          <div>${statistik()}</div>
        </div>`}
    </div>`;
};

Object.assign(ACTIONS, {
  "dash-tab": (d) => {
    ui.dash.reiter = d.tab === "kanzlei" ? "kanzlei" : "arbeitstag";
    try { localStorage.setItem(DASH_KEY, ui.dash.reiter); } catch {}
    if (parseRoute().page !== "uebersicht") go(""); else render();
  },
  "fokus-tab": (d) => {
    ui.dash.fokus = d.tab;
    ui.dash.reiter = "arbeitstag";
    if (parseRoute().page !== "uebersicht") { go(""); return; }
    render();
    const el = $("fokus");
    if (el && el.getBoundingClientRect().top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: "smooth", block: "start" });
  },
});

function sucheErgebnisse(q) {
  const gruppen = globaleSuche(q);
  if (!gruppen.length) return html`<div class="card"><p class="empty">Nichts gefunden für „${q}“.</p></div>`;
  return html`<div class="card">${gruppen.map((g) => html`
    <div class="search-group">
      <h3>${g.titel}</h3>
      ${g.items.map((i) => html`<a class="search-hit" href="${i.href}"><strong>${i.titel}</strong>${i.sub ? html`<span class="sub">${i.sub}</span>` : ""}</a>`)}
      ${g.mehr ? html`<p class="muted small">… und ${g.mehr} weitere</p>` : ""}
    </div>`)}</div>`;
}

INPUTS["global-q"] = (el) => { ui.globalQ = el.value; scheduleRender(); };

Object.assign(ACTIONS, {
  "akten-zeigen": (d) => {
    ui.akten.status = d.status || "aktiv";
    ui.akten.meine = d.meine === "1";
    ui.akten.q = "";
    go("akten");
  },
});
