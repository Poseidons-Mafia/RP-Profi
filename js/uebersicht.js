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
    return { href: `#/akten/${e.akte_id}/verlauf`, titel: truncate(e.text, 90), sub: `${a ? a.number : ""} · ${fmt.datum(e.created_at)} · ${personName(e.author)}` };
  }));
  add("Beweismittel", state.beweise.filter((b) => matches(q, b.titel, b.beschreibung, b.art)).map((b) => {
    const a = byId("akten", b.akte_id);
    return { href: `#/akten/${b.akte_id}/beweise`, titel: `${b.art}: ${b.titel}`, sub: a ? `${a.number} · ${a.title}` : "" };
  }));
  add("Termine", state.termine.filter((t) => matches(q, t.titel, t.ort, t.notiz, t.art)).map((t) => ({
    href: t.akte_id ? `#/akten/${t.akte_id}/termine` : "#/kalender", titel: `${t.titel} (${t.art})`, sub: fmt.datumZeit(t.beginn) })));
  add("Rechnungen", state.rechnungen.filter((r) => matches(q, r.nummer, r.empfaenger, r.betreff)).map((r) => ({
    href: r.akte_id ? `#/akten/${r.akte_id}/rechnungen` : "#/rechnungen", titel: `${r.nummer} · ${r.empfaenger}`, sub: `${fmt.geld(r.summe)} · ${r.status}` })));
  add("Gesetzbuch", state.gesetze.filter((g) => matches(q, g.paragraph, g.titel, g.kategorie)).map((g) => ({
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
    <div class="grid-2">
      <div class="card">
        <h3 class="section-title">Ergebnisse${mitErgebnis.length ? ` – Erfolgsquote ${Math.round((erfolge / mitErgebnis.length) * 100)} %` : ""}</h3>
        ${ergebnisRows.length ? balken(ergebnisRows) : html`<p class="empty">Noch keine abgeschlossenen Fälle mit Ergebnis.</p>`}
      </div>
      <div class="card">
        <h3 class="section-title">Umsatz (bezahlte Rechnungen)</h3>
        ${balken(umsatzMonate, "green")}
      </div>
      <div class="card">
        <h3 class="section-title">Akten nach Rechtsgebiet</h3>
        ${gebiete.length ? balken(gebiete) : html`<p class="empty">Noch keine Akten.</p>`}
      </div>
      <div class="card">
        <h3 class="section-title">Team – aktive Akten & Umsatz</h3>
        ${anwalt.length ? balken(anwalt.map((x) => ({ label: x.label, n: x.n, text: `${x.n} · ${fmt.geld(x.umsatz)}` })), "red") : ""}
      </div>
    </div>`;
}

// ---------- Seite ----------
VIEWS.uebersicht = () => {
  const now = new Date();
  const today = startOfDay();
  const offeneAkten = state.akten.filter((a) => a.status !== "Geschlossen");
  const termineHeute = state.termine.filter((t) => !t.erledigt && sameDay(t.beginn, now));
  const ueberfaellig = state.termine.filter(terminUeberfaellig);
  const naechste = state.termine.filter((t) => !t.erledigt && new Date(t.beginn) >= today && new Date(t.beginn) < addDays(today, 8))
    .sort((a, b) => new Date(a.beginn) - new Date(b.beginn));
  const offeneRechnungen = state.rechnungen.filter((r) => r.status === "Offen");
  const inHaft = state.akten.filter((a) => a.in_haft && a.status !== "Geschlossen")
    .sort((a, b) => new Date(a.haft_bis || "9999") - new Date(b.haft_bis || "9999"));
  const meineAufgaben = state.aufgaben.filter((t) => !t.erledigt && (t.zustaendig === state.me.id || (!t.zustaendig && isMe(t.created_by)))).sort(sortAufgaben);
  const dringend = offeneAkten.filter((a) => a.prioritaet === "Dringend" || a.prioritaet === "Hoch")
    .sort((a, b) => (a.prioritaet === "Dringend" ? -1 : 1) - (b.prioritaet === "Dringend" ? -1 : 1));
  const meineAkten = offeneAkten.filter((a) => a.zustaendig_id === state.me.id).sort((a, b) => zuletztAktiv(b) - zuletztAktiv(a));
  const profil = myProfile();
  const stunde = now.getHours();
  const gruss = stunde < 11 ? "Guten Morgen" : stunde < 18 ? "Guten Tag" : "Guten Abend";
  const q = ui.globalQ.trim();

  return html`
    <div class="page">
      <div class="page-head">
        <div>
          <h1>${gruss}${profil && profil.anzeigename ? `, ${firstName(profil.anzeigename)}` : ""}</h1>
          <p class="muted">${fmt.tagLang(now)} · ${state.settings.kanzlei}</p>
        </div>
        <div class="search global-search"><input type="search" id="global-q" data-search data-input="global-q" value="${ui.globalQ}" placeholder="Alles durchsuchen: Akten, Mandanten, Verlauf, Beweise … (Taste /)"></div>
      </div>

      ${profil && !profil.anzeigename ? html`
        <div class="box info">Lege deinen <strong>Anzeigenamen</strong> fest – er erscheint im Verlauf, auf Rechnungen und in Dokumenten.
          <div class="actions-row"><button class="btn small gold" data-action="profil-bearbeiten">Profil ausfüllen</button></div></div>` : ""}

      ${q ? sucheErgebnisse(q) : html`
        <div class="kpis">
          <a class="kpi" href="#/akten" data-action="akten-zeigen" data-status="aktiv"><span class="value">${offeneAkten.length}</span><span class="label">Aktive Akten</span></a>
          <a class="kpi ${termineHeute.length ? "alert" : ""}" href="#/kalender"><span class="value">${termineHeute.length}</span><span class="label">Termine heute</span></a>
          <a class="kpi ${ueberfaellig.length ? "alert" : ""}" href="#/kalender"><span class="value">${ueberfaellig.length}</span><span class="label">Fristen überfällig</span></a>
          <a class="kpi" href="#/akten" data-action="akten-zeigen" data-status="haft"><span class="value">${inHaft.length}</span><span class="label">Mandanten in Haft</span></a>
          <a class="kpi" href="#/rechnungen" data-action="rechnungen-filter" data-status="Offen"><span class="value">${fmt.geld(offeneRechnungSumme(offeneRechnungen))}</span><span class="label">${offeneRechnungen.length === 1 ? "1 Rechnung" : `${offeneRechnungen.length} Rechnungen`} offen</span></a>
        </div>

        <div class="grid-2">
          <div class="stack">
            <div class="card">
              <div class="card-head"><h2>Die nächsten 7 Tage</h2><a class="btn small" href="#/kalender">Kalender</a></div>
              ${ueberfaellig.length ? html`<div class="group-title danger-text">Überfällig</div><ul class="rows">${ueberfaellig.map((t) => terminRow(t))}</ul>` : ""}
              ${naechste.length ? html`<ul class="rows">${naechste.map((t) => terminRow(t))}</ul>` : html`<p class="empty">Keine Termine in den nächsten 7 Tagen.</p>`}
            </div>
            <div class="card">
              <div class="card-head"><h2>Meine Aufgaben</h2><span class="muted small">${meineAufgaben.length} offen</span></div>
              ${aufgabeSchnellForm(null)}
              ${meineAufgaben.length ? html`<ul class="rows">${meineAufgaben.slice(0, 12).map((t) => aufgabeRow(t))}</ul>` : html`<p class="empty">Keine offenen Aufgaben.</p>`}
            </div>
          </div>
          <div class="stack">
            ${inHaft.length ? html`<div class="card">
              <div class="card-head"><h2>Mandanten in Haft</h2></div>
              <ul class="rows">${inHaft.map((a) => html`<li>
                <div class="grow"><div class="title"><a href="#/akten/${a.id}">${mandantName(a)}</a></div>
                <div class="meta">${a.number} · ${a.title}</div></div>
                <div class="when" style="text-align:right">${a.haft_bis ? html`<strong>${fmt.bis(a.haft_bis)}</strong>${fmt.datumZeit(a.haft_bis)}` : "Ende offen"}</div>
              </li>`)}</ul></div>` : ""}
            ${dringend.length ? html`<div class="card">
              <div class="card-head"><h2>Dringende Akten</h2></div>
              <ul class="item-list">${dringend.slice(0, 8).map((a) => html`<li>${akteListItem(a)}</li>`)}</ul></div>` : ""}
            <div class="card">
              <div class="card-head"><h2>Meine Akten</h2><a class="btn small" href="#/akten" data-action="akten-zeigen" data-status="aktiv" data-meine="1">Alle</a></div>
              ${meineAkten.length ? html`<ul class="item-list">${meineAkten.slice(0, 6).map((a) => html`<li>${akteListItem(a)}</li>`)}</ul>` : html`<p class="empty">Dir sind keine aktiven Akten zugewiesen.</p>`}
            </div>
            <div class="card">
              <div class="card-head"><h2>Letzte Aktivitäten</h2><span class="muted small">live</span></div>
              ${state.protokoll.length ? html`<ul class="rows">${state.protokoll.slice(0, window.innerWidth < 700 ? 8 : 15).map((p) => protokollZeile(p))}</ul>` : html`<p class="empty">Noch keine Aktivitäten.</p>`}
            </div>
          </div>
        </div>

        <h2 style="margin:28px 0 12px">Statistik</h2>
        ${statistik()}`}
    </div>`;
};

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
