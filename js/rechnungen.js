// =============================================================
//  Wiwang Law – Rechnungen & Gebührenkatalog (Reiter im Bereich Finanzen)
// =============================================================

function rechnungStatusBadge(r) {
  if (rechnungUeberfaellig(r)) return html`<span class="badge alert">überfällig</span>`;
  return html`<span class="badge ${statusClass(r.status)}">${r.status}</span>`;
}

function rechnungTabelle(list, { akte = true } = {}) {
  return html`
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Nr.</th><th>Datum</th><th>Empfänger</th><th>Betreff</th>${akte ? html`<th>Akte</th>` : ""}<th class="num">Summe</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map((r) => {
        const a = byId("akten", r.akte_id);
        return html`<tr>
          <td class="nowrap"><strong>${r.nummer}</strong></td>
          <td class="nowrap">${fmt.datum(r.datum)}</td>
          <td>${r.mandant_id ? html`<a href="#/mandanten/${r.mandant_id}">${r.empfaenger}</a>` : r.empfaenger}</td>
          <td>${r.betreff || "–"}</td>
          ${akte ? html`<td class="nowrap">${a ? html`<a href="#/akten/${a.id}">${a.number}</a>` : "–"}</td>` : ""}
          <td class="num">${fmt.geld(r.summe)}</td>
          <td>${rechnungStatusBadge(r)}${r.status === "Bezahlt" && r.bezahlt_am ? html`<div class="small muted">${fmt.datum(r.bezahlt_am)}</div>` : ""}
            ${r.status === "Offen" && r.zahlung_gemeldet_am ? html`<div><span class="badge sichtbar" title="${r.zahlung_hinweis ? `Hinweis des Mandanten: ${r.zahlung_hinweis}` : "Der Mandant hat im Portal gemeldet, dass er bezahlt hat"}">Zahlung gemeldet ${fmt.datum(r.zahlung_gemeldet_am)}</span></div>` : ""}</td>
          <td class="row-actions">
            <button class="btn small" data-action="rechnung-drucken" data-id="${r.id}" title="Drucken / PDF">Drucken</button>
            ${r.status === "Offen" && darf("rechnungen") ? html`<button class="btn small gold" data-action="rechnung-bezahlt" data-id="${r.id}" title="Als bezahlt markieren">Bezahlt</button>` : ""}
            ${rechnungUeberfaellig(r) ? html`<button class="btn small" data-action="rechnung-erinnerung" data-id="${r.id}">Erinnerung</button>` : ""}
            ${darf("rechnungen") ? html`<button class="icon-btn" data-action="rechnung-bearbeiten" data-id="${r.id}" title="Bearbeiten">✎</button>` : ""}
          </td>
        </tr>`;
      })}</tbody>
    </table></div>`;
}

// ---------- Positionen-Editor ----------
function posRow(p) {
  return html`<tr>
    <td><input data-p="text" value="${p.text || ""}" placeholder="z. B. Beratung U-Haft"></td>
    <td class="c-menge"><input data-p="menge" value="${p.menge ?? 1}" title="Zahl – oder Text wie „2km + Sperrzone“ (dann gilt der Preis pauschal)"></td>
    <td class="c-preis"><input data-p="einzel" inputmode="decimal" value="${p.einzel !== null && p.einzel !== undefined ? fmt.zahl(p.einzel) : ""}" placeholder="0"></td>
    <td class="c-sum" data-p="sum"></td>
    <td><button type="button" class="icon-btn" data-pos="del" title="Zeile entfernen">✕</button></td>
  </tr>`;
}

function readPositionen(root) {
  return [...root.querySelectorAll("#pos-body tr")].map((tr) => {
    const get = (k) => tr.querySelector(`[data-p="${k}"]`).value.trim();
    const mengeText = get("menge");
    const menge = /^\d+([.,]\d+)?$/.test(mengeText) ? parseNumber(mengeText) : mengeText || 1;
    return { text: get("text"), menge, einzel: parseNumber(get("einzel")) };
  }).filter((p) => p.text || p.einzel);
}

function positionenField() {
  return {
    name: "positionen",
    type: "custom",
    label: "Leistungen",
    render: (value) => html`
      <div class="table-wrap"><table class="pos-table">
        <thead><tr><th>Leistung</th><th class="c-menge">Anzahl</th><th class="c-preis">Einzelpreis</th><th class="c-sum">Gesamt</th><th></th></tr></thead>
        <tbody id="pos-body">${(value && value.length ? value : [{ text: "", menge: 1, einzel: null }]).map(posRow)}</tbody>
      </table></div>
      <div class="pos-tools">
        <button type="button" class="btn small" data-pos="add">+ Zeile</button>
        ${state.gebuehren.length ? html`<select data-pos="katalog">
          <option value="">+ Aus Gebührenkatalog …</option>
          ${[...state.gebuehren].sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, "de")).map((g) => html`<option value="${g.id}">${g.bezeichnung} (${fmt.geld(g.preis)})</option>`)}
        </select>` : html`<span class="muted small">Tipp: Feste Preise im Gebührenkatalog hinterlegen.</span>`}
        <span class="pos-total">Summe: <span id="pos-total">${fmt.geld(0)}</span></span>
      </div>`,
    mount: (form) => {
      const root = form.querySelector('[data-field="positionen"]');
      const body = root.querySelector("#pos-body");
      const recalc = () => {
        let total = 0;
        body.querySelectorAll("tr").forEach((tr) => {
          const mengeText = tr.querySelector('[data-p="menge"]').value.trim();
          const p = { menge: /^\d+([.,]\d+)?$/.test(mengeText) ? parseNumber(mengeText) : mengeText || 1, einzel: parseNumber(tr.querySelector('[data-p="einzel"]').value) };
          const sum = posGesamt(p);
          total += sum;
          tr.querySelector('[data-p="sum"]').textContent = fmt.geld(sum);
        });
        root.querySelector("#pos-total").textContent = fmt.geld(total);
      };
      const addRow = (p) => {
        const tmp = document.createElement("tbody");
        tmp.innerHTML = String(posRow(p));
        body.append(tmp.firstElementChild);
        recalc();
      };
      root.addEventListener("input", recalc);
      root.addEventListener("click", (e) => {
        const b = e.target.closest("[data-pos]");
        if (!b) return;
        if (b.dataset.pos === "add") addRow({ text: "", menge: 1, einzel: null });
        if (b.dataset.pos === "del") {
          b.closest("tr").remove();
          if (!body.children.length) addRow({ text: "", menge: 1, einzel: null });
          recalc();
        }
      });
      const katalog = root.querySelector('[data-pos="katalog"]');
      if (katalog) {
        katalog.addEventListener("change", () => {
          const g = byId("gebuehren", katalog.value);
          katalog.value = "";
          if (!g) return;
          // leere erste Zeile ersetzen
          const rows = [...body.querySelectorAll("tr")];
          const empty = rows.find((tr) => !tr.querySelector('[data-p="text"]').value && !tr.querySelector('[data-p="einzel"]').value);
          if (empty) empty.remove();
          addRow({ text: g.bezeichnung, menge: 1, einzel: g.preis });
        });
      }
      recalc();
    },
    read: (form) => readPositionen(form.querySelector('[data-field="positionen"]')),
  };
}

function rechnungFields() {
  return [
    { name: "akte_id", label: "Akte", type: "select", options: akteOptions, emptyLabel: "— ohne Akte —" },
    { name: "empfaenger", label: "Empfänger", required: true, half: true, list: () => state.mandanten.map((m) => m.name).sort((a, b) => a.localeCompare(b, "de")) },
    { name: "betreff", label: "Betreff", half: true, placeholder: "z. B. Beratung U-Haft" },
    positionenField(),
    { name: "datum", label: "Rechnungsdatum", type: "date", required: true, third: true },
    { name: "status", label: "Status", type: "select", options: OPTIONEN.rechnungStatus, required: true, third: true },
    { name: "bezahlt_am", label: "Bezahlt am", type: "date", third: true },
    { name: "unterzeichner", label: "Unterschrift von", type: "select", options: teamOptions, half: true },
    { name: "notiz", label: "Interne Notiz", half: true, placeholder: "z. B. Barzahlung vereinbart" },
  ];
}

function openRechnungForm(r, preset = {}) {
  let values = r;
  if (!r) {
    const a = byId("akten", preset.akte_id);
    const m = byId("mandanten", preset.mandant_id);
    values = {
      datum: ymd(new Date()), status: "Offen", unterzeichner: state.me.id, positionen: [],
      akte_id: preset.akte_id || null,
      empfaenger: a ? mandantName(a) : m ? m.name : "",
      betreff: a ? a.title : "",
    };
  }
  openForm({
    title: r ? `Rechnung ${r.nummer} bearbeiten` : "Neue Rechnung",
    fields: rechnungFields(),
    values,
    wide: true,
    submitLabel: r ? "Speichern" : "Rechnung erstellen",
    onChange: (name, form) => {
      if (name !== "akte_id") return;
      const a = byId("akten", form.elements.akte_id.value);
      if (!a) return;
      if (!form.elements.empfaenger.value.trim()) form.elements.empfaenger.value = mandantName(a);
      if (!form.elements.betreff.value.trim()) form.elements.betreff.value = a.title;
    },
    onSubmit: async (v) => {
      if (!v.positionen.length) throw new Error("Bitte mindestens eine Leistung eintragen.");
      const a = byId("akten", v.akte_id);
      const mandant = (a && byId("mandanten", a.mandant_id)) || findMandantByName(v.empfaenger);
      const row = {
        ...v,
        summe: v.positionen.reduce((t, p) => t + posGesamt(p), 0),
        mandant_id: mandant ? mandant.id : null,
        bezahlt_am: v.status === "Bezahlt" ? v.bezahlt_am || ymd(new Date()) : null,
      };
      if (r) {
        await updateRow("rechnungen", r.id, row);
        toast("Rechnung gespeichert");
      } else {
        const created = await insertRow("rechnungen", row);
        toast(`Rechnung ${created.nummer} erstellt`);
        ACTIONS["rechnung-drucken"]({ id: created.id });
      }
    },
    onDelete: r ? async () => {
      if (!confirm(`Rechnung ${r.nummer} löschen? Besser: Status „Storniert“ setzen.`)) return false;
      await deleteRow("rechnungen", r.id);
      toast("Rechnung gelöscht");
    } : null,
  });
}

// ---------- Reiter im Bereich Finanzen (js/finanzen.js) ----------
function tabRechnungen() {
  const f = ui.rechnungen;
  const list = state.rechnungen
    .filter((r) => f.status === "alle" || (f.status === "ueberfaellig" ? rechnungUeberfaellig(r) : r.status === f.status))
    .filter((r) => matches(f.q, r.nummer, r.empfaenger, r.betreff, (byId("akten", r.akte_id) || {}).number))
    .sort((a, b) => String(b.datum).localeCompare(String(a.datum)) || (b.nummer || "").localeCompare(a.nummer || ""));
  const anzahl = (status) => state.rechnungen.filter((r) => (status === "ueberfaellig" ? rechnungUeberfaellig(r) : status === "alle" || r.status === status)).length;
  return html`
    <div class="card">
      <div class="toolbar">
        <div class="chips">
          ${[["Offen", "Offen"], ["ueberfaellig", "Überfällig"], ["Bezahlt", "Bezahlt"], ["Storniert", "Storniert"], ["alle", "Alle"]]
            .map(([v, l]) => html`<button class="chip ${f.status === v ? "active" : ""}" data-action="rechnungen-filter" data-status="${v}">${l} <span class="chip-n">${anzahl(v)}</span></button>`)}
        </div>
        <div class="search"><input type="search" id="rechnungen-q" data-search data-input="rechnungen-q" value="${f.q}" placeholder="Nummer, Empfänger, Betreff …"></div>
      </div>
      ${list.length ? rechnungTabelle(list) : html`<p class="empty">Keine Rechnungen in dieser Ansicht.</p>`}
    </div>`;
}

function tabGebuehren() {
  const pflegen = darf("einstellungen_schreiben");
  return html`
    <div class="card">
      <div class="card-head">
        <div><h2>Gebührenkatalog</h2><p class="muted small" style="margin:0">Feste Preise der Kanzlei – in Rechnungen mit einem Klick übernehmen.
          ${pflegen ? "" : "Pflegen dürfen Ränge mit „Kanzlei-Einstellungen bearbeiten“."}</p></div>
        ${pflegen ? html`<button class="btn small primary" data-action="gebuehr-neu">+ Gebühr</button>` : ""}
      </div>
      ${state.gebuehren.length ? html`
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Leistung</th><th class="num">Preis</th><th></th></tr></thead>
          <tbody>${[...state.gebuehren].sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, "de")).map((g) => html`
            <tr><td>${g.bezeichnung}</td><td class="num">${fmt.geld(g.preis)}</td>
              <td class="row-actions">${pflegen ? html`<button class="icon-btn" data-action="gebuehr-bearbeiten" data-id="${g.id}" title="Bearbeiten">✎</button>` : ""}</td></tr>`)}
          </tbody></table></div>` : html`<p class="empty">Noch keine Gebühren hinterlegt, z. B. „Beratung U-Haft – $50.000“.</p>`}
    </div>`;
}

INPUTS["rechnungen-q"] = (el) => { ui.rechnungen.q = el.value; scheduleRender(); };

function gebuehrFields() {
  return [
    { name: "bezeichnung", label: "Leistung", required: true, placeholder: "z. B. Beratung U-Haft" },
    { name: "preis", label: "Preis", type: "money", required: true },
  ];
}

Object.assign(ACTIONS, {
  "rechnungen-filter": (d) => { ui.rechnungen.status = d.status; go("finanzen/rechnungen"); },
  "rechnung-neu": (d) => openRechnungForm(null, { akte_id: d.akte || null, mandant_id: d.mandant || null }),
  "rechnung-bearbeiten": (d) => openRechnungForm(byId("rechnungen", d.id)),
  "rechnung-bezahlt": (d) => {
    const r = byId("rechnungen", d.id);
    attempt(() => updateRow("rechnungen", r.id, { status: "Bezahlt", bezahlt_am: ymd(new Date()) }), `${r.nummer} als bezahlt markiert`);
  },
  "gebuehr-neu": () => openForm({
    title: "Neue Gebühr",
    fields: gebuehrFields(),
    onSubmit: async (v) => { await insertRow("gebuehren", v); toast("Gebühr gespeichert"); },
  }),
  "gebuehr-bearbeiten": (d) => {
    const g = byId("gebuehren", d.id);
    openForm({
      title: "Gebühr bearbeiten",
      fields: gebuehrFields(),
      values: g,
      onSubmit: async (v) => { await updateRow("gebuehren", g.id, v); toast("Gespeichert"); },
      onDelete: async () => {
        if (!confirm(`„${g.bezeichnung}“ aus dem Katalog löschen?`)) return false;
        await deleteRow("gebuehren", g.id);
      },
    });
  },
});
