// =============================================================
//  Wiwang Law – Strafkatalog & Strafrechner
// =============================================================

// Reihenfolge der Gesetze im Katalog: erst das Strafgesetzbuch, dann die Fachgesetze
const KATALOG_GESETZE = ["StGB", "StVO", "GewO"];
const DELIKTSARTEN = ["Verbrechen", "Vergehen", "Ordnungswidrigkeit"];

function gesetzKuerzel(g) {
  const m = String(g.paragraph || "").match(/([A-Za-zÄÖÜäöü]+)\s*$/);
  return m ? m[1] : "";
}

function gesetzSort(a, b) {
  const ra = KATALOG_GESETZE.indexOf(gesetzKuerzel(a)), rb = KATALOG_GESETZE.indexOf(gesetzKuerzel(b));
  return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb)
    || String(a.paragraph || "").localeCompare(String(b.paragraph || ""), "de", { numeric: true })
    || (Number(a.geldstrafe) || 0) - (Number(b.geldstrafe) || 0)   // Stufen eines Paragraphen (z. B. Bußgeldtabelle) aufsteigend
    || a.titel.localeCompare(b.titel, "de");
}

function kategorien() {
  return [...new Set(state.gesetze.map((g) => g.kategorie).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
}

// Strafrahmen der angehakten Delikte (mit Anzahl) – Spanne von Mindest- bis Höchstmaß
function auswahlRahmen() {
  const posten = [];
  for (const [id, anzahl] of Object.entries(ui.gesetze.auswahl)) {
    const g = byId("gesetze", id);
    if (g) posten.push({ rahmen: deliktRahmen(g), anzahl });
  }
  return strafrahmen(posten, { schwer: ui.gesetze.schwer });
}

// Kleine Kennzeichen am Delikt: Art, Wahlstrafe, offen, erhöhte Gesamtstrafe
function deliktBadges(g) {
  const r = deliktRahmen(g);
  return html`${g.deliktsart ? html`<span class="badge art ${g.deliktsart === "Verbrechen" ? "verbrechen" : ""}" title="${g.deliktsart === "Verbrechen" ? "Mindestmaß mindestens 15 Hafteinheiten (§ 5 StGB)" : g.deliktsart === "Ordnungswidrigkeit" ? "Bußgeld, keine Straftat – zählt nicht zur Gesamtstrafe" : "Vergehen (§ 5 StGB)"}">${g.deliktsart}</span>` : ""}
    ${r.wahlweise ? html`<span class="badge art" title="Das Gericht kann statt der Haft eine Geldstrafe verhängen">Haft oder Geldstrafe</span>` : ""}
    ${(r.haft && r.haft.offen) || (r.geld && r.geld.offen) ? html`<span class="badge alert" title="Nur ein Mindestmaß – ein Höchstmaß gibt es nicht">nach oben offen</span>` : ""}
    ${g.gesamt_erhoeht ? html`<span class="badge art" title="Gesamtstrafe bis 180 statt 120 Hafteinheiten (§ 3 Abs. 2 StGB)">bis 180 HE gesamt</span>` : ""}`;
}

VIEWS.gesetzbuch = () => {
  const f = ui.gesetze;
  const list = state.gesetze
    .filter((g) => !f.kategorie || (g.kategorie || "") === f.kategorie)
    .filter((g) => matches(f.q, g.paragraph, g.titel, g.kategorie, g.bemerkung))
    .sort(gesetzSort);
  const gruppen = new Map();
  for (const g of list) {
    const k = g.kategorie || "Ohne Kategorie";
    if (!gruppen.has(k)) gruppen.set(k, []);
    gruppen.get(k).push(g);
  }
  const rahmen = auswahlRahmen();
  const nAuswahl = Object.values(ui.gesetze.auswahl).reduce((a, b) => a + b, 0);

  return html`
    <div class="page">
      <div class="page-head">
        <div><h1>Strafkatalog & Strafrechner</h1>
          <p class="muted">Die Delikte eures Servers mit Mindest- und Höchstmaß – Haken setzen, und die Spanne der möglichen Bestrafung
            wird automatisch ausgerechnet (inkl. Gesamtstrafe nach § 3 StGB). Den Wortlaut der Gesetze findest du unter <a href="#/gesetze">Gesetze</a>.</p></div>
        <div class="actions-row">
          ${darf("gesetzbuch") ? html`<button class="btn" data-action="gesetze-import">Massenimport</button>` : ""}
          ${state.gesetze.length ? html`<button class="btn" data-action="gesetze-export">Export (CSV)</button>` : ""}
          ${darf("gesetzbuch") ? html`<button class="btn primary" data-action="gesetz-neu">+ Paragraph</button>` : ""}
        </div>
      </div>
      <div class="card">
        <div class="toolbar">
          <div class="search"><input type="search" id="gesetze-q" data-search data-input="gesetze-q" value="${f.q}" placeholder="Paragraph oder Delikt suchen …"></div>
          <select id="gesetze-kat" data-change="gesetze-kat">
            <option value="">Alle Kategorien</option>
            ${kategorien().map((k) => html`<option ${f.kategorie === k ? "selected" : ""}>${k}</option>`)}
          </select>
          <span class="muted small">${list.length} von ${state.gesetze.length} Paragraphen</span>
        </div>
        ${state.gesetze.length ? "" : html`
          <div class="box info">
            <strong>Das Gesetzbuch ist noch leer.</strong> Am schnellsten geht es mit dem Massenimport:
            Kopiere das Gesetzbuch eures Servers (z. B. aus Google Sheets oder einem Dokument) und füge es ein – eine Zeile pro Paragraph.
          </div>`}
        ${[...gruppen.entries()].map(([kat, items]) => html`
          <div class="group-title">${kat}</div>
          <div class="table-wrap"><table class="table law-table">
            <thead><tr><th></th><th>Paragraph</th><th>Delikt</th><th class="num">Haft</th><th class="num">Geldstrafe</th><th>Bemerkung</th><th></th></tr></thead>
            <tbody>${items.map((g) => {
              const anzahl = f.auswahl[g.id];
              const r = deliktRahmen(g);
              return html`<tr class="${anzahl ? "selected" : ""}">
                <td><input type="checkbox" data-change="gesetz-wahl" data-id="${g.id}" ${anzahl ? "checked" : ""} title="Für den Strafrechner auswählen"></td>
                <td class="nowrap"><strong>${g.paragraph || "–"}</strong></td>
                <td>${g.titel}<div class="delikt-badges">${deliktBadges(g)}</div>
                  ${anzahl ? html`<div class="stepper" style="margin-top:4px">
                    <button data-action="gesetz-anzahl" data-id="${g.id}" data-delta="-1">−</button><span>${anzahl}×</span>
                    <button data-action="gesetz-anzahl" data-id="${g.id}" data-delta="1">+</button></div>` : ""}</td>
                <td class="num">${deliktStrafeText(r, "haft")}</td>
                <td class="num">${deliktStrafeText(r, "geld")}</td>
                <td class="small">${g.bemerkung || ""}</td>
                <td class="row-actions">${darf("gesetzbuch") ? html`<button class="icon-btn" data-action="gesetz-bearbeiten" data-id="${g.id}" title="Bearbeiten">✎</button>` : ""}</td>
              </tr>`;
            })}</tbody>
          </table></div>`)}
        ${state.gesetze.length && !list.length ? html`<p class="empty">Nichts gefunden.</p>` : ""}
      </div>
      ${nAuswahl ? html`
        <div class="calc-bar strafrahmen-bar">
          <div class="calc-kopf">
            <span><strong>${nAuswahl}</strong> ${nAuswahl === 1 ? "Delikt" : "Delikte"} · Spanne der möglichen Bestrafung</span>
            <span class="spacer"></span>
            ${rahmen.gesamtstrafe && !rahmen.schwerFall || ui.gesetze.schwer ? html`
              <label class="check calc-schwer" title="Straftat gegen Leben, körperliche Unversehrtheit oder die verfassungsmäßige Ordnung: Gesamtstrafe bis 180 statt 120 Hafteinheiten (§ 3 Abs. 2 StGB)">
                <input type="checkbox" data-change="schwer-fall" ${ui.gesetze.schwer ? "checked" : ""}> besonders schwerer Fall</label>` : ""}
          </div>
          <div class="calc-spanne">
            ${rahmen.haft ? spanneBlock("Haft (Mindest- bis Höchstmaß)", rahmen.haft, "haft") : ""}
            ${rahmen.geld ? spanneBlock("Geldstrafe (Mindest- bis Höchstmaß)", rahmen.geld, "geld") : ""}
            <span class="spacer"></span>
            <button class="btn small" style="color:#fff;border-color:#555" data-action="auswahl-leeren">Leeren</button>
            <button class="btn small gold" data-action="auswahl-in-akte">In Akte übernehmen</button>
          </div>
          <ul class="calc-hinweise">${strafrahmenHinweise(rahmen).map((t) => html`<li>${t}</li>`)}</ul>
        </div>` : ""}
    </div>`;
};

INPUTS["gesetze-q"] = (el) => { ui.gesetze.q = el.value; scheduleRender(); };
CHANGES["gesetze-kat"] = (el) => { ui.gesetze.kategorie = el.value; render(); };
CHANGES["schwer-fall"] = (el) => { ui.gesetze.schwer = el.checked; render(); };
CHANGES["gesetz-wahl"] = (el) => {
  if (el.checked) ui.gesetze.auswahl[el.dataset.id] = 1;
  else delete ui.gesetze.auswahl[el.dataset.id];
  render();
};

function gesetzFields() {
  const e = state.settings.haft_einheit;
  return [
    { name: "paragraph", label: "Paragraph", third: true, placeholder: "§ 12 StGB" },
    { name: "titel", label: "Delikt", required: true, placeholder: "z. B. Körperverletzung", half: false, full: false },
    { name: "kategorie", label: "Kategorie", half: true, list: kategorien, placeholder: "z. B. Gewaltdelikte, Verkehr" },
    { name: "deliktsart", label: "Art", type: "select", half: true, empty: true, emptyLabel: "–", options: () => DELIKTSARTEN.map((a) => ({ value: a, label: a })) },
    { type: "section", label: "Strafrahmen" },
    { type: "info", text: `„Bis zu 20 ${e}“ → nur Höchstmaß eintragen (Mindestmaß gilt dann als 1). „Nicht unter 45 ${e}“ → nur Mindestmaß eintragen (nach oben offen, kein Höchstmaß). Feste Strafe → beides gleich. Sind Haft und Geldstrafe eingetragen, gilt „Haft oder Geldstrafe“.` },
    { name: "haft_min", label: `Haft ab (${e})`, type: "number", third: true },
    { name: "haft", label: `Haft bis (${e})`, type: "number", third: true },
    { name: "geldstrafe_min", label: "Geldstrafe ab", type: "money", third: true },
    { name: "geldstrafe", label: "Geldstrafe bis", type: "money", third: true },
    { name: "gesamt_erhoeht", type: "checkbox", label: "Erhöhte Gesamtstrafe (bis 180 statt 120 HE) – Tat gegen Leben, körperliche Unversehrtheit oder die verfassungsmäßige Ordnung" },
    { name: "bemerkung", label: "Bemerkung", placeholder: "z. B. Führerscheinentzug, nur bei Vorsatz" },
  ];
}

// "Paragraph; Delikt; Kategorie; Geldstrafe bis; Haft bis; Bemerkung; Haft ab; Geldstrafe ab; Art; Erhöhte Gesamtstrafe"
// – Tab oder ; getrennt. Die letzten vier Spalten sind optional (ältere Listen mit sechs Spalten funktionieren weiter).
function parseGesetze(text) {
  const rows = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = (line.includes("\t") ? line.split("\t") : line.split(/;|\|/)).map((p) => p.trim());
    if (/^(paragraph|§)$/i.test(parts[0]) && /delikt|bezeichnung|titel/i.test(parts[1] || "")) continue; // Kopfzeile
    let [paragraph, titel, kategorie, geldstrafe, haft, bemerkung, haftMin, geldMin, art, erhoeht] = parts;
    if (parts.length === 1) { titel = paragraph; paragraph = null; }
    if (!titel) continue;
    rows.push({
      paragraph: paragraph || null, titel, kategorie: kategorie || null,
      geldstrafe: parseNumber(geldstrafe), haft: parseNumber(haft), bemerkung: bemerkung || null,
      haft_min: parseNumber(haftMin), geldstrafe_min: parseNumber(geldMin),
      deliktsart: DELIKTSARTEN.find((a) => norm(a) === norm(art)) || null,
      gesamt_erhoeht: /^(ja|j|1|x|true|wahr)$/i.test(String(erhoeht || "").trim()),
    });
  }
  return rows;
}

Object.assign(ACTIONS, {
  "gesetz-neu": () => openForm({
    title: "Paragraph hinzufügen",
    fields: gesetzFields(),
    values: { kategorie: ui.gesetze.kategorie || "" },
    onSubmit: async (v) => { await insertRow("gesetze", v); toast(`${v.paragraph || v.titel} gespeichert`); },
  }),
  "gesetz-bearbeiten": (d) => {
    const g = byId("gesetze", d.id);
    openForm({
      title: "Paragraph bearbeiten",
      fields: gesetzFields(),
      values: g,
      onSubmit: async (v) => { await updateRow("gesetze", g.id, v); toast("Gespeichert"); },
      onDelete: async () => {
        if (!confirm(`${g.paragraph || ""} ${g.titel} löschen?`)) return false;
        await deleteRow("gesetze", g.id);
        delete ui.gesetze.auswahl[g.id];
      },
    });
  },
  "gesetz-anzahl": (d) => {
    const n = (ui.gesetze.auswahl[d.id] || 1) + Number(d.delta);
    if (n <= 0) delete ui.gesetze.auswahl[d.id];
    else ui.gesetze.auswahl[d.id] = n;
    render();
  },
  "auswahl-leeren": () => { ui.gesetze.auswahl = {}; ui.gesetze.schwer = false; render(); },
  "auswahl-in-akte": () => {
    const offen = state.akten.filter((a) => a.status !== "Geschlossen");
    openForm({
      title: "Vorwürfe in Akte übernehmen",
      intro: "Die ausgewählten Delikte werden zu den Tatvorwürfen der Akte hinzugefügt.",
      fields: [{ name: "akte_id", label: "Akte", type: "select", required: true, empty: true, emptyLabel: "Bitte wählen …",
        options: () => akteOptions().filter((o) => offen.some((a) => a.id === o.value)) }],
      submitLabel: "Übernehmen",
      onSubmit: async (v) => {
        const a = byId("akten", v.akte_id);
        const list = [...(a.vorwuerfe || [])];
        for (const [id, anzahl] of Object.entries(ui.gesetze.auswahl)) {
          const g = byId("gesetze", id);
          if (!g) continue;
          const i = list.findIndex((x) => x.gesetz_id === g.id);
          if (i >= 0) list[i] = { ...list[i], anzahl: (Number(list[i].anzahl) || 1) + anzahl };
          else list.push({ ...vorwurfAusKatalog(g), anzahl });
        }
        await updateRow("akten", a.id, { vorwuerfe: list });
        ui.gesetze.auswahl = {};
        ui.gesetze.schwer = false;
        toast(`In Akte ${a.number} übernommen`);
        go(`akten/${a.id}`);
      },
    });
  },
  "gesetze-import": () => {
    const dlg = openDialog({
      title: "Gesetzbuch importieren",
      wide: true,
      body: html`
        <p style="margin-top:0">Eine Zeile pro Paragraph. Spalten getrennt durch <strong>Tab</strong> (direkt aus Google Sheets/Excel kopiert) oder <strong>Semikolon</strong>:</p>
        <p><code>Paragraph; Delikt; Kategorie; Geldstrafe bis; Haft bis; Bemerkung; Haft ab; Geldstrafe ab; Art; Erhöhte Gesamtstrafe</code></p>
        <p class="muted small">Die letzten vier Spalten sind optional. „Haft bis“ leer + „Haft ab“ gefüllt = nach oben offen („nicht unter …“).<br>
          Beispiel:<br><code>§ 21 StGB; Körperverletzung; Gewaltdelikte; 60000; 20; Versuch strafbar; ; ; Vergehen; ja</code><br>
          <code>§ 18 StGB; Mord; Straftaten gegen das Leben; ; ; ; 45; ; Verbrechen; ja</code></p>
        <textarea id="import-text" rows="12" placeholder="Hier einfügen …"></textarea>
        <p id="import-info" class="muted small"></p>`,
      footer: html`<div class="dialog-actions"><span class="spacer"></span><button class="btn" data-close>Abbrechen</button><button class="btn primary" id="import-go" disabled>Importieren</button></div>`,
    });
    const ta = dlg.querySelector("#import-text");
    const info = dlg.querySelector("#import-info");
    const go_ = dlg.querySelector("#import-go");
    const vorhanden = new Set(state.gesetze.map((g) => norm(`${g.paragraph}|${g.titel}`)));
    let neue = [];
    ta.addEventListener("input", () => {
      const rows = parseGesetze(ta.value);
      neue = rows.filter((r) => !vorhanden.has(norm(`${r.paragraph}|${r.titel}`)));
      info.textContent = rows.length
        ? `${rows.length} Zeilen erkannt, davon ${neue.length} neu${rows.length - neue.length ? ` (${rows.length - neue.length} schon vorhanden)` : ""}. Erste Zeile: ${rows[0].paragraph || ""} ${rows[0].titel} · Haft ${deliktStrafeText(deliktRahmen(rows[0]), "haft")} · Geldstrafe ${deliktStrafeText(deliktRahmen(rows[0]), "geld")}`
        : "";
      go_.disabled = !neue.length;
    });
    go_.addEventListener("click", async () => {
      go_.disabled = true;
      const ok = await attempt(async () => {
        for (let i = 0; i < neue.length; i += 200) await insertRows("gesetze", neue.slice(i, i + 200));
      }, `${neue.length} Paragraphen importiert`);
      if (ok !== undefined || neue.length === 0) dlg.close();
      go_.disabled = false;
    });
  },
  "gesetze-export": () => {
    const head = "Paragraph;Delikt;Kategorie;Geldstrafe bis;Haft bis;Bemerkung;Haft ab;Geldstrafe ab;Art;Erhöhte Gesamtstrafe";
    const clean = (v) => String(v ?? "").replace(/[;\r\n]+/g, " ");
    const lines = [...state.gesetze].sort(gesetzSort)
      .map((g) => [g.paragraph, g.titel, g.kategorie, g.geldstrafe, g.haft, g.bemerkung, g.haft_min, g.geldstrafe_min, g.deliktsart, g.gesamt_erhoeht ? "ja" : ""].map(clean).join(";"));
    downloadFile(`wiwang-gesetzbuch-${ymd(new Date())}.csv`, "﻿" + [head, ...lines].join("\r\n"), "text/csv");
  },
});
