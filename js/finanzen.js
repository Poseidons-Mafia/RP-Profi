// =============================================================
//  Wiwang Law – Finanzen: Rechnungen und Buchhaltung auf einer Seite
//  Oben die Wahl des Bereichs (Rechnungen | Buchhaltung), darunter
//  nur dessen Kennzahlen, Reiter und Knopf:
//  Rechnungen (Rechnungsliste, Gebührenkatalog) und Buchhaltung
//  (Bilanz & GuV, Grundbuch, Hauptbuch, Salden, Kontenplan).
//  Jeder Bereich erscheint nur mit dem passenden Leserecht.
//  Adressen: #/finanzen/<reiter>; alte Links (#/rechnungen,
//  #/buchhaltung) leitet parseRoute() hierher um.
// =============================================================

// Zwei Bereiche mit eigenen Kennzahlen, Unterreitern und Knöpfen – statt sieben Reitern in einer Zeile
const FINANZ_BEREICHE = [
  { key: "Rechnungen", recht: "rechnungen_lesen", text: "Rechnungen schreiben, Zahlungseingang verfolgen",
    icon: "M6 3h9l4 4v14H6zM15 3v4h4M9 11h7M9 15h7M9 19h4" },
  { key: "Buchhaltung", recht: "buchhaltung_lesen", text: "Bilanz, Buchungen und Konten",
    icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
];
const FINANZ_TABS = [
  { key: "rechnungen", label: "Rechnungsliste", gruppe: "Rechnungen", recht: "rechnungen_lesen", body: () => tabRechnungen() },
  { key: "gebuehren", label: "Gebührenkatalog", gruppe: "Rechnungen", recht: "rechnungen_lesen", body: () => tabGebuehren() },
  { key: "bilanz", label: "Bilanz & GuV", gruppe: "Buchhaltung", recht: "buchhaltung_lesen", jahr: true, body: () => tabBilanz() },
  { key: "grundbuch", label: "Grundbuch", gruppe: "Buchhaltung", recht: "buchhaltung_lesen", jahr: true, body: () => tabGrundbuch() },
  { key: "hauptbuch", label: "Hauptbuch", gruppe: "Buchhaltung", recht: "buchhaltung_lesen", jahr: true, body: () => tabHauptbuch() },
  { key: "salden", label: "Summen & Salden", gruppe: "Buchhaltung", recht: "buchhaltung_lesen", jahr: true, body: () => tabSalden() },
  { key: "konten", label: "Kontenplan", gruppe: "Buchhaltung", recht: "buchhaltung_lesen", body: () => tabKontenplan() },
];
// Zuletzt geöffneter Reiter je Bereich – beim Zurückwechseln landet man wieder dort
const finanzZuletzt = {};

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

const finanzSumme = (l) => l.reduce((t, r) => t + (Number(r.summe) || 0), 0);

function rechnungKpis() {
  const offen = state.rechnungen.filter((r) => r.status === "Offen");
  const ueberfaellig = offen.filter(rechnungUeberfaellig);
  const monat = ymd(new Date()).slice(0, 7);
  const eingang = state.rechnungen.filter((r) => r.status === "Bezahlt" && String(r.bezahlt_am || r.datum).startsWith(monat));
  return html`
    <div class="kpis">
      <a class="kpi ${offen.length ? "" : "ruhig"}" href="#/finanzen/rechnungen" data-action="rechnungen-filter" data-status="Offen"><span class="value">${fmt.geld(finanzSumme(offen))}</span><span class="label">${offen.length === 1 ? "1 Rechnung" : `${offen.length} Rechnungen`} offen</span></a>
      <a class="kpi ${ueberfaellig.length ? "alert" : "ruhig"}" href="#/finanzen/rechnungen" data-action="rechnungen-filter" data-status="ueberfaellig"><span class="value">${ueberfaellig.length}</span><span class="label">Überfällig (> ${state.settings.zahlungsziel_tage} Tage)</span></a>
      <a class="kpi ${eingang.length ? "" : "ruhig"}" href="#/finanzen/rechnungen" data-action="rechnungen-filter" data-status="Bezahlt"><span class="value">${fmt.geld(finanzSumme(eingang))}</span><span class="label">Zahlungseingang ${MONATE[new Date().getMonth()]}</span></a>
    </div>`;
}

function buchKpis() {
  if (!state.konten.length) return "";
  const gewinn = bilanzDaten().jahresergebnis;
  const { von, bis } = periode();
  const buchungen = state.buchungen.filter((b) => b.datum >= von && b.datum <= bis).length;
  return html`
    <div class="kpis">
      <a class="kpi" href="#/finanzen/hauptbuch" data-action="hauptbuch-konto" data-id="${(kontoNr("1200") || {}).id || ""}"><span class="value">${fmt.geld(kontoBestand("1200") + kontoBestand("1000"))}</span><span class="label">Bank & Kasse heute</span></a>
      <a class="kpi ${gewinn < 0 ? "alert" : ""}" href="#/finanzen/bilanz"><span class="value">${fmt.geld(gewinn)}</span><span class="label">${gewinn >= 0 ? "Gewinn" : "Verlust"} ${ui.buch.jahr}</span></a>
      <a class="kpi ${buchungen ? "" : "ruhig"}" href="#/finanzen/grundbuch"><span class="value">${buchungen}</span><span class="label">Buchungen ${ui.buch.jahr}</span></a>
    </div>`;
}

VIEWS.finanzen = (route) => {
  const tabs = finanzTabs();
  const tab = tabs.find((t) => t.key === route.id) || tabs[0];
  finanzZuletzt[tab.gruppe] = tab.key;
  const bereiche = FINANZ_BEREICHE.filter((b) => darf(b.recht));
  const bereich = bereiche.find((b) => b.key === tab.gruppe);
  const imBuch = tab.gruppe === "Buchhaltung";
  const unterTabs = tabs.filter((t) => t.gruppe === tab.gruppe);
  // Je Bereich nur der passende Knopf
  const neu = imBuch
    ? (darf("buchhaltung_schreiben") && state.konten.length ? html`<button class="btn primary" data-action="buchung-neu">+ Buchung</button>` : "")
    : (darf("rechnungen_schreiben") ? html`<button class="btn primary" data-action="rechnung-neu">+ Rechnung</button>` : "");
  const offen = state.rechnungen.filter((r) => r.status === "Offen").length;
  return html`
    <div class="page">
      <div class="page-head">
        <div><h1>Finanzen</h1>
          <p class="muted">Rechnungen und Zahlungseingänge werden automatisch gebucht.</p></div>
        <div class="actions-row">${neu}</div>
      </div>
      ${bereiche.length > 1 ? html`
        <nav class="finanz-bereiche" aria-label="Finanzbereich">
          ${bereiche.map((b) => {
            const ziel = finanzZuletzt[b.key] || tabs.find((t) => t.gruppe === b.key).key;
            const zahl = b.key === "Rechnungen" ? offen : 0;
            return html`<a href="#/finanzen/${ziel}" class="finanz-bereich ${b === bereich ? "active" : ""}"${b === bereich ? html` aria-current="page"` : ""}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${b.icon}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span><strong>${b.key}${zahl ? html` <span class="nav-badge">${zahl}</span>` : ""}</strong><small>${b.text}</small></span>
            </a>`;
          })}
        </nav>` : ""}
      ${imBuch ? buchKpis() : rechnungKpis()}
      <div class="finanz-leiste">
        <nav class="tabs" aria-label="${tab.gruppe}">
          ${unterTabs.map((t) => html`<a href="#/finanzen/${t.key}" class="${t === tab ? "active" : ""}">${t.label}</a>`)}
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
