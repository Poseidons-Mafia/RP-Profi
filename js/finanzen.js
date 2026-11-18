// =============================================================
//  Wiwang Law – Finanzen: Rechnungen und Buchhaltung auf einer Seite
//  Oben die wichtigsten Zahlen, darunter Reiter in zwei Gruppen:
//  Rechnungen (Rechnungen, Gebührenkatalog) und Buchhaltung
//  (Bilanz & GuV, Grundbuch, Hauptbuch, Salden, Kontenplan).
//  Jede Gruppe erscheint nur mit dem passenden Leserecht.
//  Adressen: #/finanzen/<reiter>; alte Links (#/rechnungen,
//  #/buchhaltung) leitet parseRoute() hierher um.
// =============================================================

const FINANZ_TABS = [
  { key: "rechnungen", label: "Rechnungen", gruppe: "Rechnungen", recht: "rechnungen_lesen", body: () => tabRechnungen() },
  { key: "gebuehren", label: "Gebührenkatalog", gruppe: "Rechnungen", recht: "rechnungen_lesen", body: () => tabGebuehren() },
  { key: "bilanz", label: "Bilanz & GuV", gruppe: "Buchhaltung", recht: "buchhaltung_lesen", jahr: true, body: () => tabBilanz() },
  { key: "grundbuch", label: "Grundbuch", gruppe: "Buchhaltung", recht: "buchhaltung_lesen", jahr: true, body: () => tabGrundbuch() },
  { key: "hauptbuch", label: "Hauptbuch", gruppe: "Buchhaltung", recht: "buchhaltung_lesen", jahr: true, body: () => tabHauptbuch() },
  { key: "salden", label: "Summen & Salden", gruppe: "Buchhaltung", recht: "buchhaltung_lesen", jahr: true, body: () => tabSalden() },
  { key: "konten", label: "Kontenplan", gruppe: "Buchhaltung", recht: "buchhaltung_lesen", body: () => tabKontenplan() },
];

function finanzTabs() {
  return FINANZ_TABS.filter((t) => darf(t.recht));
}

// Bestand eines Bestandskontos (z. B. 1200 Bank) bis heute
function kontoBestand(nummer) {
  const k = kontoNr(nummer);
  if (!k) return 0;
  const heute = ymd(new Date());
  return natSaldo(k, summen(state.buchungen.filter((b) => b.datum <= heute)).get(k.id));
}

function finanzKpis() {
  const R = darf("rechnungen_lesen"), B = darf("buchhaltung_lesen");
  const sum = (l) => l.reduce((t, r) => t + (Number(r.summe) || 0), 0);
  const offen = state.rechnungen.filter((r) => r.status === "Offen");
  const ueberfaellig = offen.filter(rechnungUeberfaellig);
  const monat = ymd(new Date()).slice(0, 7);
  const eingang = state.rechnungen.filter((r) => r.status === "Bezahlt" && String(r.bezahlt_am || r.datum).startsWith(monat));
  const gewinn = B && state.konten.length ? bilanzDaten().jahresergebnis : 0;
  return html`
    <div class="kpis">
      ${R ? html`
        <a class="kpi" href="#/finanzen/rechnungen" data-action="rechnungen-filter" data-status="Offen"><span class="value">${fmt.geld(sum(offen))}</span><span class="label">${offen.length === 1 ? "1 Rechnung" : `${offen.length} Rechnungen`} offen</span></a>
        <a class="kpi ${ueberfaellig.length ? "alert" : ""}" href="#/finanzen/rechnungen" data-action="rechnungen-filter" data-status="ueberfaellig"><span class="value">${ueberfaellig.length}</span><span class="label">Überfällig (> ${state.settings.zahlungsziel_tage} Tage)</span></a>
        <a class="kpi" href="#/finanzen/rechnungen" data-action="rechnungen-filter" data-status="Bezahlt"><span class="value">${fmt.geld(sum(eingang))}</span><span class="label">Zahlungseingang ${MONATE[new Date().getMonth()]}</span></a>` : ""}
      ${B && state.konten.length ? html`
        <a class="kpi" href="#/finanzen/hauptbuch" data-action="hauptbuch-konto" data-id="${(kontoNr("1200") || {}).id || ""}"><span class="value">${fmt.geld(kontoBestand("1200") + kontoBestand("1000"))}</span><span class="label">Bank & Kasse heute</span></a>
        <a class="kpi ${gewinn < 0 ? "alert" : ""}" href="#/finanzen/bilanz"><span class="value">${fmt.geld(gewinn)}</span><span class="label">${gewinn >= 0 ? "Gewinn" : "Verlust"} ${ui.buch.jahr}</span></a>`
      : R ? html`<div class="kpi"><span class="value">${fmt.geld(sum(state.rechnungen.filter((r) => r.status === "Bezahlt")))}</span><span class="label">Umsatz gesamt</span></div>` : ""}
    </div>`;
}

VIEWS.finanzen = (route) => {
  const tabs = finanzTabs();
  const tab = tabs.find((t) => t.key === route.id) || tabs[0];
  const gruppen = [...new Set(tabs.map((t) => t.gruppe))];
  const imBuch = tab.gruppe === "Buchhaltung";
  const neuRechnung = darf("rechnungen_schreiben") ? html`<button class="btn ${imBuch ? "" : "primary"}" data-action="rechnung-neu">+ Rechnung</button>` : "";
  const neuBuchung = darf("buchhaltung_schreiben") && state.konten.length ? html`<button class="btn ${imBuch || !darf("rechnungen_lesen") ? "primary" : ""}" data-action="buchung-neu">+ Buchung</button>` : "";
  return html`
    <div class="page">
      <div class="page-head">
        <div><h1>Finanzen</h1>
          <p class="muted">${gruppen.length > 1
            ? "Rechnungen und Buchhaltung · Rechnungen und Zahlungseingänge werden automatisch gebucht."
            : imBuch ? "Doppelte Buchführung · Rechnungen und Zahlungseingänge werden automatisch gebucht."
            : "Rechnungen erstellen, drucken und den Zahlungseingang verfolgen."}</p></div>
        <div class="actions-row">${imBuch ? html`${neuBuchung}${neuRechnung}` : html`${neuRechnung}${neuBuchung}`}</div>
      </div>
      ${finanzKpis()}
      <div class="finanz-leiste">
        <nav class="tabs finanz-tabs">
          ${gruppen.map((g) => html`
            ${gruppen.length > 1 ? html`<span class="tab-gruppe">${g}</span>` : ""}
            ${tabs.filter((t) => t.gruppe === g).map((t) => html`<a href="#/finanzen/${t.key}" class="${t === tab ? "active" : ""}">${t.label}</a>`)}`)}
        </nav>
        ${tab.jahr ? html`<label class="muted small finanz-jahr">Geschäftsjahr
          <select id="buch-jahr" data-change="buch-jahr">
            ${buchJahre().map((y) => html`<option ${y === ui.buch.jahr ? "selected" : ""}>${y}</option>`)}
          </select></label>` : ""}
      </div>
      ${imBuch && !state.konten.length
        ? html`<div class="card"><p class="empty">Noch kein Kontenrahmen vorhanden – bitte <code>supabase-update-3.sql</code> in Supabase ausführen.</p></div>`
        : tab.body()}
    </div>`;
};
