// =============================================================
//  Wiwang Law – Gesetzbuch & Strafrechner
// =============================================================

function gesetzSort(a, b) {
  return String(a.paragraph || "").localeCompare(String(b.paragraph || ""), "de", { numeric: true })
    || a.titel.localeCompare(b.titel, "de");
}

function kategorien() {
  return [...new Set(state.gesetze.map((g) => g.kategorie).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
}

function auswahlSumme() {
  let geld = 0, haft = 0, n = 0;
  for (const [id, anzahl] of Object.entries(ui.gesetze.auswahl)) {
    const g = byId("gesetze", id);
    if (!g) continue;
    n += anzahl;
    geld += (Number(g.geldstrafe) || 0) * anzahl;
    haft += (Number(g.haft) || 0) * anzahl;
  }
  return { geld, haft, n };
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
  const sum = auswahlSumme();

  return html`
    <div class="page">
      <div class="page-head">
        <div><h1>Gesetzbuch & Strafrechner</h1>
          <p class="muted">Das Gesetzbuch eures Servers – Haken setzen, und der Strafrahmen wird automatisch ausgerechnet.</p></div>
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
            <thead><tr><th></th><th>Paragraph</th><th>Delikt</th><th class="num">Geldstrafe</th><th class="num">Haft</th><th>Bemerkung</th><th></th></tr></thead>
            <tbody>${items.map((g) => {
              const anzahl = f.auswahl[g.id];
              return html`<tr class="${anzahl ? "selected" : ""}">
                <td><input type="checkbox" data-change="gesetz-wahl" data-id="${g.id}" ${anzahl ? "checked" : ""} title="Für den Strafrechner auswählen"></td>
                <td class="nowrap"><strong>${g.paragraph || "–"}</strong></td>
                <td>${g.titel}
                  ${anzahl ? html`<div class="stepper" style="margin-top:4px">
                    <button data-action="gesetz-anzahl" data-id="${g.id}" data-delta="-1">−</button><span>${anzahl}×</span>
                    <button data-action="gesetz-anzahl" data-id="${g.id}" data-delta="1">+</button></div>` : ""}</td>
                <td class="num">${g.geldstrafe ? fmt.geld(g.geldstrafe) : "–"}</td>
                <td class="num">${g.haft ? fmt.haft(g.haft) : "–"}</td>
                <td class="small">${g.bemerkung || ""}</td>
                <td class="row-actions">${darf("gesetzbuch") ? html`<button class="icon-btn" data-action="gesetz-bearbeiten" data-id="${g.id}" title="Bearbeiten">✎</button>` : ""}</td>
              </tr>`;
            })}</tbody>
          </table></div>`)}
        ${state.gesetze.length && !list.length ? html`<p class="empty">Nichts gefunden.</p>` : ""}
      </div>
      ${sum.n ? html`
        <div class="sum-bar calc-bar">
          <span><strong>${sum.n}</strong> ${sum.n === 1 ? "Delikt" : "Delikte"}</span>
          <span>Geldstrafe <strong>${fmt.geld(sum.geld)}</strong></span>
          <span>Haft <strong>${fmt.haft(sum.haft)}</strong></span>
          <span class="spacer"></span>
          <button class="btn small" style="color:#fff;border-color:#555" data-action="auswahl-leeren">Leeren</button>
          <button class="btn small gold" data-action="auswahl-in-akte">In Akte übernehmen</button>
        </div>` : ""}
    </div>`;
};

INPUTS["gesetze-q"] = (el) => { ui.gesetze.q = el.value; scheduleRender(); };
CHANGES["gesetze-kat"] = (el) => { ui.gesetze.kategorie = el.value; render(); };
CHANGES["gesetz-wahl"] = (el) => {
  if (el.checked) ui.gesetze.auswahl[el.dataset.id] = 1;
  else delete ui.gesetze.auswahl[el.dataset.id];
  render();
};

function gesetzFields() {
  return [
    { name: "paragraph", label: "Paragraph", third: true, placeholder: "§ 12 StGB" },
    { name: "titel", label: "Delikt", required: true, placeholder: "z. B. Körperverletzung", half: false, full: false },
    { name: "kategorie", label: "Kategorie", half: true, list: kategorien, placeholder: "z. B. Gewaltdelikte, Verkehr" },
    { name: "geldstrafe", label: "Geldstrafe", type: "money", third: true },
    { name: "haft", label: `Haft (${state.settings.haft_einheit})`, type: "number", third: true },
    { name: "bemerkung", label: "Bemerkung", placeholder: "z. B. Führerscheinentzug, nur bei Vorsatz" },
  ];
}

// "Paragraph; Delikt; Kategorie; Geldstrafe; Haft; Bemerkung" – Tab oder ; getrennt
function parseGesetze(text) {
  const rows = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = (line.includes("\t") ? line.split("\t") : line.split(/;|\|/)).map((p) => p.trim());
    if (/^(paragraph|§)$/i.test(parts[0]) && /delikt|bezeichnung|titel/i.test(parts[1] || "")) continue; // Kopfzeile
    let [paragraph, titel, kategorie, geldstrafe, haft, bemerkung] = parts;
    if (parts.length === 1) { titel = paragraph; paragraph = null; }
    if (!titel) continue;
    rows.push({
      paragraph: paragraph || null, titel, kategorie: kategorie || null,
      geldstrafe: parseNumber(geldstrafe), haft: parseNumber(haft), bemerkung: bemerkung || null,
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
  "auswahl-leeren": () => { ui.gesetze.auswahl = {}; render(); },
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
          else list.push({ gesetz_id: g.id, paragraph: g.paragraph, titel: g.titel, geldstrafe: g.geldstrafe, haft: g.haft, anzahl });
        }
        await updateRow("akten", a.id, { vorwuerfe: list });
        ui.gesetze.auswahl = {};
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
        <p><code>Paragraph; Delikt; Kategorie; Geldstrafe; Haft; Bemerkung</code></p>
        <p class="muted small">Beispiel:<br><code>§ 12 StGB; Körperverletzung; Gewaltdelikte; 5000; 10</code><br><code>§ 3 StVO; Geschwindigkeitsüberschreitung; Verkehr; 1500; 0; ab 50 km/h zu schnell</code></p>
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
        ? `${rows.length} Zeilen erkannt, davon ${neue.length} neu${rows.length - neue.length ? ` (${rows.length - neue.length} schon vorhanden)` : ""}. Erste Zeile: ${rows[0].paragraph || ""} ${rows[0].titel} · ${rows[0].geldstrafe ? fmt.geld(rows[0].geldstrafe) : "keine Geldstrafe"} · ${rows[0].haft ? fmt.haft(rows[0].haft) : "keine Haft"}`
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
    const head = "Paragraph;Delikt;Kategorie;Geldstrafe;Haft;Bemerkung";
    const clean = (v) => String(v ?? "").replace(/[;\r\n]+/g, " ");
    const lines = [...state.gesetze].sort(gesetzSort)
      .map((g) => [g.paragraph, g.titel, g.kategorie, g.geldstrafe, g.haft, g.bemerkung].map(clean).join(";"));
    downloadFile(`wiwang-gesetzbuch-${ymd(new Date())}.csv`, "﻿" + [head, ...lines].join("\r\n"), "text/csv");
  },
});
