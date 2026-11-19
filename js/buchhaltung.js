// =============================================================
//  Wiwang Law – Buchhaltung (doppelte Buchführung, Reiter im Bereich Finanzen)
//  Grundbuch → Hauptbuch (T-Konten) → Summen-/Saldenliste → Bilanz & GuV
//  Buchungen sind unveränderbar; Korrekturen nur per Storno.
// =============================================================

// Die Reiter (Bilanz, Grundbuch, …) zeigt der Bereich Finanzen (js/finanzen.js).
ui.buch = { jahr: String(new Date().getFullYear()), q: "", konto: "" };

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const istEK = (k) => k.typ === "Passiv" && String(k.nummer).startsWith("2");
const istBestand = (k) => k.typ === "Aktiv" || k.typ === "Passiv";
const kontoNr = (nummer) => state.konten.find((k) => k.nummer === nummer);
const kontoText = (k) => (k ? `${k.nummer} ${k.name}` : "?");

function kontenSortiert() {
  return [...state.konten].sort((a, b) => String(a.nummer).localeCompare(String(b.nummer), "de", { numeric: true }));
}

function periode() {
  const y = ui.buch.jahr;
  return { von: `${y}-01-01`, bis: `${y}-12-31` };
}

function buchJahre() {
  const set = new Set(state.buchungen.map((b) => String(b.datum).slice(0, 4)));
  set.add(String(new Date().getFullYear()));
  return [...set].sort().reverse();
}

// Soll-/Haben-Summen je Konto
function summen(list) {
  const m = new Map();
  const get = (id) => m.get(id) || (m.set(id, { soll: 0, haben: 0 }), m.get(id));
  for (const b of list) {
    get(b.soll).soll += Number(b.betrag);
    get(b.haben).haben += Number(b.betrag);
  }
  return m;
}

// Saldo auf der "natürlichen" Seite: Aktiv/Aufwand im Soll, Passiv/Ertrag im Haben
function natSaldo(k, s) {
  const x = s ? s.soll - s.haben : 0;
  return r2(k.typ === "Aktiv" || k.typ === "Aufwand" ? x : -x);
}

function ergebnis(s) {
  let e = 0;
  for (const k of state.konten) {
    if (k.typ === "Ertrag") e += natSaldo(k, s.get(k.id));
    if (k.typ === "Aufwand") e -= natSaldo(k, s.get(k.id));
  }
  return r2(e);
}

function bilanzDaten() {
  const { von, bis } = periode();
  const bisList = state.buchungen.filter((b) => b.datum <= bis);
  const sBis = summen(bisList);
  const sVor = summen(bisList.filter((b) => b.datum < von));
  const sJahr = summen(bisList.filter((b) => b.datum >= von));
  const konten = kontenSortiert();
  const zeilen = (filter, s) => konten.filter(filter).map((k) => ({ k, betrag: natSaldo(k, s.get(k.id)) })).filter((x) => x.betrag !== 0);
  const aktiva = zeilen((k) => k.typ === "Aktiv", sBis);
  const ek = zeilen(istEK, sBis);
  const fk = zeilen((k) => k.typ === "Passiv" && !istEK(k), sBis);
  const vortrag = ergebnis(sVor);
  const jahresergebnis = ergebnis(sJahr);
  const aufwand = zeilen((k) => k.typ === "Aufwand", sJahr);
  const ertrag = zeilen((k) => k.typ === "Ertrag", sJahr);
  const sum = (l) => r2(l.reduce((t, x) => t + x.betrag, 0));
  const ekSumme = r2(sum(ek) + vortrag + jahresergebnis);
  return { aktiva, ek, fk, vortrag, jahresergebnis, aufwand, ertrag, sumAktiva: sum(aktiva), sumPassiva: r2(ekSumme + sum(fk)), ekSumme, sumFk: sum(fk), bis, von };
}

// ---------- T-Konto ----------
// links/rechts: [{ text, betrag, sub, cls }]; saldo: Beschriftung des Ausgleichs (z. B. "SB")
function tKonto({ titel, sub, links, rechts, lt = "Soll", rt = "Haben", saldo, action }) {
  const l = [...links], r = [...rechts];
  const sl = r2(l.reduce((t, x) => t + x.betrag, 0));
  const sr = r2(r.reduce((t, x) => t + x.betrag, 0));
  if (saldo && sl !== sr) (sl < sr ? l : r).push({ text: saldo, betrag: Math.abs(r2(sl - sr)), cls: "saldo" });
  const summe = Math.max(sl, sr);
  const zeile = (x) => html`<div class="tk-row ${x.cls || ""}"><span class="tk-text">${x.text}${x.sub ? html`<small>${x.sub}</small>` : ""}</span><span class="tk-betrag">${fmt.geld(x.betrag)}</span></div>`;
  return html`
    <div class="tkonto">
      <div class="tk-head">${action ? html`<a href="#/finanzen/hauptbuch" data-action="${action.name}" data-id="${action.id}">${titel}</a>` : titel}${sub ? html`<small>${sub}</small>` : ""}</div>
      <div class="tk-cols">
        <div class="tk-side"><div class="tk-label">${lt}</div>${l.map(zeile)}</div>
        <div class="tk-side"><div class="tk-label">${rt}</div>${r.map(zeile)}</div>
      </div>
      <div class="tk-cols tk-total"><div>${fmt.geld(summe)}</div><div>${fmt.geld(summe)}</div></div>
    </div>`;
}

function tabBilanz() {
  const d = bilanzDaten();
  const ok = Math.abs(d.sumAktiva - d.sumPassiva) < 0.005;
  const gewinn = d.jahresergebnis;
  const aktiva = d.aktiva.map((x) => ({ text: kontoText(x.k), betrag: x.betrag }));
  const passiva = [
    ...d.ek.map((x) => ({ text: kontoText(x.k), betrag: x.betrag, sub: "Eigenkapital" })),
    ...(d.vortrag ? [{ text: "Gewinnvortrag Vorjahre", betrag: d.vortrag, sub: "Eigenkapital" }] : []),
    ...(gewinn ? [{ text: gewinn >= 0 ? "Jahresüberschuss" : "Jahresfehlbetrag", betrag: gewinn, sub: "Eigenkapital", cls: "saldo" }] : []),
    ...d.fk.map((x) => ({ text: kontoText(x.k), betrag: x.betrag, sub: "Fremdkapital" })),
  ];
  const aufwand = d.aufwand.map((x) => ({ text: kontoText(x.k), betrag: x.betrag }));
  const ertrag = d.ertrag.map((x) => ({ text: kontoText(x.k), betrag: x.betrag }));
  if (gewinn > 0) aufwand.push({ text: "Gewinn", betrag: gewinn, cls: "saldo" });
  if (gewinn < 0) ertrag.push({ text: "Verlust", betrag: -gewinn, cls: "saldo" });

  return html`
    <div class="card">
      <div class="card-head">
        <div><h2>Bilanz zum ${fmt.datum(d.bis)}</h2>
          <p class="muted small" style="margin:0">Bilanzsumme ${fmt.geld(d.sumAktiva)} · Eigenkapital ${fmt.geld(d.ekSumme)}</p></div>
        <div class="actions-row">
          <span class="badge ${ok ? "ok" : "alert"}">${ok ? "✓ Aktiva = Passiva" : "Bilanz nicht ausgeglichen"}</span>
          <button class="btn small" data-action="bilanz-drucken">Drucken / PDF</button>
        </div>
      </div>
      ${tKonto({ titel: "Bilanz", lt: "Aktiva", rt: "Passiva", links: aktiva, rechts: passiva })}
    </div>
    <div class="card">
      <h2 style="margin-top:0">Gewinn- und Verlustrechnung ${fmt.datum(d.von)} – ${fmt.datum(d.bis)}</h2>
      ${tKonto({ titel: "GuV", lt: "Aufwendungen", rt: "Erträge", links: aufwand, rechts: ertrag })}
      ${!aufwand.length && !ertrag.length ? html`<p class="empty">In diesem Geschäftsjahr gibt es noch keine Erfolgsbuchungen.</p>` : ""}
    </div>`;
}

function tabGrundbuch() {
  const { von, bis } = periode();
  const storniert = new Set(state.buchungen.filter((b) => b.storno_von).map((b) => b.storno_von));
  const list = state.buchungen
    .filter((b) => b.datum >= von && b.datum <= bis)
    .filter((b) => matches(ui.buch.q, b.nummer, b.beleg, b.text, kontoText(byId("konten", b.soll)), kontoText(byId("konten", b.haben)), String(b.betrag)))
    .sort((a, b) => String(a.datum).localeCompare(String(b.datum)) || String(a.nummer).localeCompare(String(b.nummer)));
  const summe = r2(list.reduce((t, b) => t + Number(b.betrag), 0));
  return html`
    <div class="card">
      <div class="toolbar">
        <div class="search"><input type="search" id="buch-q" data-search data-input="buch-q" value="${ui.buch.q}" placeholder="Text, Beleg, Konto, Betrag …"></div>
        <button class="btn small" data-action="grundbuch-export">Export (CSV)</button>
        <span class="muted small">${list.length} Buchungen · ${fmt.geld(summe)}</span>
      </div>
      ${darf("buchhaltung_buchen") ? "" : html`<p class="muted small" style="margin-top:0">Buchen und stornieren darfst du mit deinem Rang nicht. Rechnungen werden automatisch gebucht.</p>`}
      ${list.length ? html`<div class="table-wrap"><table class="table journal">
        <thead><tr><th>Nr.</th><th>Datum</th><th>Beleg</th><th>Buchungstext</th><th>Soll</th><th>Haben</th><th class="num">Betrag</th><th></th></tr></thead>
        <tbody>${list.map((b) => html`<tr class="${storniert.has(b.id) ? "storniert" : ""} ${b.storno_von ? "storno" : ""}">
          <td class="nowrap">${b.nummer}</td>
          <td class="nowrap">${fmt.datum(b.datum)}</td>
          <td class="nowrap small">${b.beleg || "–"}</td>
          <td>${b.text}${storniert.has(b.id) ? html` <span class="badge geschlossen">storniert</span>` : ""}${b.storno_von ? html` <span class="badge offen">Storno</span>` : ""}
            <div class="small muted">${personName(b.created_by)}</div></td>
          <td class="nowrap small">${kontoText(byId("konten", b.soll))}</td>
          <td class="nowrap small">${kontoText(byId("konten", b.haben))}</td>
          <td class="num">${fmt.geld(b.betrag)}</td>
          <td class="row-actions">${darf("buchhaltung_buchen") && !b.storno_von && !storniert.has(b.id) ? html`<button class="btn small danger" data-action="buchung-storno" data-id="${b.id}">Storno</button>` : ""}</td>
        </tr>`)}</tbody>
      </table></div>` : html`<p class="empty">Keine Buchungen in ${ui.buch.jahr}${ui.buch.q ? " für diese Suche" : ""}.</p>`}
    </div>`;
}

function hauptbuchKonto(k, von, bis) {
  const vor = state.buchungen.filter((b) => b.datum < von && (b.soll === k.id || b.haben === k.id));
  const jahr = state.buchungen.filter((b) => b.datum >= von && b.datum <= bis && (b.soll === k.id || b.haben === k.id))
    .sort((a, b) => String(a.datum).localeCompare(String(b.datum)) || String(a.nummer).localeCompare(String(b.nummer)));
  const links = [], rechts = [];
  if (istBestand(k)) {
    const s = summen(vor).get(k.id);
    const ab = s ? r2(s.soll - s.haben) : 0;
    if (ab > 0) links.push({ text: "AB Anfangsbestand", betrag: ab, cls: "ab" });
    if (ab < 0) rechts.push({ text: "AB Anfangsbestand", betrag: -ab, cls: "ab" });
  }
  for (const b of jahr) {
    const soll = b.soll === k.id;
    const gegen = byId("konten", soll ? b.haben : b.soll);
    (soll ? links : rechts).push({ text: `${fmt.datum(b.datum).slice(0, 6)} ${gegen ? gegen.name : "?"}`, sub: `${b.nummer} · ${b.text}`, betrag: Number(b.betrag) });
  }
  return { links, rechts, aktiv: links.length + rechts.length > 0 };
}

function tabHauptbuch() {
  const { von, bis } = periode();
  const konten = kontenSortiert().filter((k) => !ui.buch.konto || k.id === ui.buch.konto);
  const tks = konten.map((k) => ({ k, ...hauptbuchKonto(k, von, bis) })).filter((x) => x.aktiv || ui.buch.konto);
  return html`
    <div class="card">
      <div class="toolbar">
        <select id="buch-konto" data-change="buch-konto">
          <option value="">Alle bebuchten Konten</option>
          ${kontenSortiert().map((k) => html`<option value="${k.id}" ${ui.buch.konto === k.id ? "selected" : ""}>${kontoText(k)}</option>`)}
        </select>
        <span class="muted small">AB = Anfangsbestand · SB = Schlussbestand (geht in die Bilanz) · Erfolgskonten werden über die GuV abgeschlossen</span>
      </div>
      ${tks.length ? html`<div class="tk-grid">${tks.map((x) => tKonto({
        titel: kontoText(x.k), sub: x.k.typ + (istEK(x.k) ? " · Eigenkapital" : ""),
        links: x.links, rechts: x.rechts, saldo: istBestand(x.k) ? "SB Schlussbestand" : "Saldo an GuV",
      }))}</div>` : html`<p class="empty">Keine Buchungen in ${ui.buch.jahr}.</p>`}
    </div>`;
}

function tabSalden() {
  const { von, bis } = periode();
  const sVor = summen(state.buchungen.filter((b) => b.datum < von));
  const sJahr = summen(state.buchungen.filter((b) => b.datum >= von && b.datum <= bis));
  let tAB = 0, tS = 0, tH = 0, tSS = 0, tSH = 0;
  const rows = kontenSortiert().map((k) => {
    const v = sVor.get(k.id), j = sJahr.get(k.id) || { soll: 0, haben: 0 };
    const ab = istBestand(k) && v ? r2(v.soll - v.haben) : 0;
    const saldo = r2(ab + j.soll - j.haben);
    if (!ab && !j.soll && !j.haben) return null;
    tAB += ab; tS += j.soll; tH += j.haben;
    if (saldo > 0) tSS += saldo; else tSH -= saldo;
    return { k, ab, soll: j.soll, haben: j.haben, saldo };
  }).filter(Boolean);
  const ok = Math.abs(tS - tH) < 0.005 && Math.abs(tSS - tSH) < 0.005;
  return html`
    <div class="card">
      <div class="card-head"><h2>Summen- und Saldenliste ${ui.buch.jahr}</h2>
        <span class="badge ${ok ? "ok" : "alert"}">${ok ? "✓ Soll = Haben" : "Differenz!"}</span></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Konto</th><th>Art</th><th class="num">AB</th><th class="num">Soll ${ui.buch.jahr}</th><th class="num">Haben ${ui.buch.jahr}</th><th class="num">Saldo Soll</th><th class="num">Saldo Haben</th></tr></thead>
        <tbody>${rows.map((x) => html`<tr class="clickable" data-action="hauptbuch-konto" data-id="${x.k.id}">
          <td>${kontoText(x.k)}</td><td class="small muted">${x.k.typ}</td>
          <td class="num">${x.ab ? fmt.geld(x.ab) : "–"}</td>
          <td class="num">${fmt.geld(x.soll)}</td><td class="num">${fmt.geld(x.haben)}</td>
          <td class="num">${x.saldo > 0 ? fmt.geld(x.saldo) : ""}</td><td class="num">${x.saldo < 0 ? fmt.geld(-x.saldo) : ""}</td>
        </tr>`)}</tbody>
        <tfoot><tr><td>Summe</td><td></td><td class="num">${fmt.geld(tAB)}</td><td class="num">${fmt.geld(tS)}</td><td class="num">${fmt.geld(tH)}</td><td class="num">${fmt.geld(tSS)}</td><td class="num">${fmt.geld(tSH)}</td></tr></tfoot>
      </table></div>
      ${rows.length ? "" : html`<p class="empty">Keine Buchungen in ${ui.buch.jahr}.</p>`}
      <p class="muted small">Tipp: Auf ein Konto klicken, um sein T-Konto im Hauptbuch zu sehen.</p>
    </div>`;
}

function tabKontenplan() {
  const anzahl = new Map();
  for (const b of state.buchungen) for (const id of [b.soll, b.haben]) anzahl.set(id, (anzahl.get(id) || 0) + 1);
  return html`
    <div class="card">
      <div class="card-head"><div><h2>Kontenplan</h2>
        <p class="muted small" style="margin:0">Aktiv- und Passivkonten (Bestandskonten) bilden die Bilanz, Aufwands- und Ertragskonten (Erfolgskonten) die GuV. Konten mit 2xxx gelten als Eigenkapital.</p></div>
        ${darf("buchhaltung_buchen") ? html`<button class="btn small primary" data-action="konto-neu">+ Konto</button>` : ""}</div>
      ${["Aktiv", "Passiv", "Aufwand", "Ertrag"].map((typ) => html`
        <div class="group-title">${typ === "Aktiv" ? "Aktivkonten" : typ === "Passiv" ? "Passivkonten" : typ === "Aufwand" ? "Aufwandskonten" : "Ertragskonten"}</div>
        <div class="table-wrap"><table class="table">
          <tbody>${kontenSortiert().filter((k) => k.typ === typ).map((k) => html`<tr>
            <td class="nowrap" style="width:70px"><strong>${k.nummer}</strong></td>
            <td>${k.name}${istEK(k) ? html` <span class="badge gold">Eigenkapital</span>` : ""}</td>
            <td class="num small muted">${anzahl.get(k.id) || 0} Buchungen</td>
            <td class="row-actions">${darf("buchhaltung_buchen") ? html`<button class="icon-btn" data-action="konto-bearbeiten" data-id="${k.id}" title="Umbenennen">✎</button>` : ""}</td>
          </tr>`)}</tbody></table></div>`)}
    </div>`;
}

// ---------- Buchung erfassen ----------
const BUCH_VORLAGEN = [
  { label: "Kapitaleinlage (Bank an Eigenkapital)", soll: "1200", haben: "2000", text: "Kapitaleinlage" },
  { label: "Privateinlage (Bank an Privateinlagen)", soll: "1200", haben: "2200", text: "Privateinlage" },
  { label: "Privatentnahme (Privatentnahmen an Bank)", soll: "2100", haben: "1200", text: "Privatentnahme" },
  { label: "Gehalt (Gehälter an Bank)", soll: "4000", haben: "1200", text: "Gehalt " },
  { label: "Miete (Miete an Bank)", soll: "4100", haben: "1200", text: "Miete " },
  { label: "Ausgabe per Bank (Aufwand an Bank)", soll: "4900", haben: "1200", text: "" },
  { label: "Ausgabe bar (Aufwand an Kasse)", soll: "4900", haben: "1000", text: "" },
  { label: "Sonstige Einnahme (Bank an Sonstige Erlöse)", soll: "1200", haben: "8100", text: "" },
  { label: "Bareinzahlung auf Bank (Bank an Kasse)", soll: "1200", haben: "1000", text: "Bareinzahlung" },
  { label: "Barabhebung (Kasse an Bank)", soll: "1000", haben: "1200", text: "Barabhebung" },
];

function kontoOptionen() {
  return kontenSortiert().map((k) => ({ value: k.id, label: `${k.nummer} ${k.name} (${k.typ})` }));
}

function openBuchungForm() {
  openForm({
    title: "Buchung erfassen",
    intro: "Buchungssatz: Soll an Haben. Buchungen können später nicht geändert, nur storniert werden.",
    fields: [
      { name: "vorlage", label: "Vorlage (optional)", type: "select", emptyLabel: "— frei buchen —", options: BUCH_VORLAGEN.map((v, i) => ({ value: String(i), label: v.label })) },
      { name: "datum", label: "Datum", type: "date", required: true, third: true },
      { name: "beleg", label: "Beleg", third: true, placeholder: "z. B. Quittung 12" },
      { name: "betrag", label: "Betrag", type: "money", required: true, third: true },
      { name: "text", label: "Buchungstext", required: true, placeholder: "z. B. Miete Kanzlei November" },
      { name: "soll", label: "Soll (an)", type: "select", options: kontoOptionen, required: true, empty: true, emptyLabel: "Konto wählen …", half: true },
      { name: "haben", label: "Haben", type: "select", options: kontoOptionen, required: true, empty: true, emptyLabel: "Konto wählen …", half: true },
    ],
    values: { datum: ymd(new Date()) },
    onChange: (name, form) => {
      if (name !== "vorlage" || form.elements.vorlage.value === "") return;
      const v = BUCH_VORLAGEN[Number(form.elements.vorlage.value)];
      form.elements.soll.value = (kontoNr(v.soll) || {}).id || "";
      form.elements.haben.value = (kontoNr(v.haben) || {}).id || "";
      if (!form.elements.text.value.trim()) form.elements.text.value = v.text;
    },
    submitLabel: "Buchen",
    onSubmit: async (v) => {
      if (v.soll === v.haben) throw new Error("Soll- und Haben-Konto müssen verschieden sein.");
      if (!(v.betrag > 0)) throw new Error("Der Betrag muss größer als 0 sein.");
      const b = await insertRow("buchungen", { datum: v.datum, beleg: v.beleg, text: v.text, soll: v.soll, haben: v.haben, betrag: r2(v.betrag) });
      ui.buch.jahr = String(v.datum).slice(0, 4);
      toast(`Gebucht: ${b.nummer}`);
    },
  });
}

// ---------- Druck ----------
function bilanzDokument() {
  const d = bilanzDaten();
  const zeilen = (list) => list.map((x) => html`<tr><td>${x.text}</td><td style="text-align:right">${fmt.geld(x.betrag)}</td></tr>`);
  const seite = (titel, lt, l, rt, r) => {
    const sl = r2(l.reduce((t, x) => t + x.betrag, 0)), sr = r2(r.reduce((t, x) => t + x.betrag, 0));
    return html`<h3>${titel}</h3>
      <table class="doc-table doc-t"><thead><tr><th>${lt}</th><th></th><th>${rt}</th><th></th></tr></thead>
      <tbody><tr><td colspan="2" style="vertical-align:top;padding:0"><table style="width:100%">${zeilen(l)}</table></td>
        <td colspan="2" style="vertical-align:top;padding:0;border-left:1px solid #333"><table style="width:100%">${zeilen(r)}</table></td></tr>
      <tr class="total"><td>Summe</td><td style="text-align:right">${fmt.geld(sl)}</td><td>Summe</td><td style="text-align:right">${fmt.geld(sr)}</td></tr></tbody></table>`;
  };
  const passiva = [...d.ek.map((x) => ({ text: kontoText(x.k), betrag: x.betrag })),
    ...(d.vortrag ? [{ text: "Gewinnvortrag", betrag: d.vortrag }] : []),
    ...(d.jahresergebnis ? [{ text: d.jahresergebnis >= 0 ? "Jahresüberschuss" : "Jahresfehlbetrag", betrag: d.jahresergebnis }] : []),
    ...d.fk.map((x) => ({ text: kontoText(x.k), betrag: x.betrag }))];
  const aufwand = d.aufwand.map((x) => ({ text: kontoText(x.k), betrag: x.betrag }));
  const ertrag = d.ertrag.map((x) => ({ text: kontoText(x.k), betrag: x.betrag }));
  if (d.jahresergebnis > 0) aufwand.push({ text: "Gewinn", betrag: d.jahresergebnis });
  if (d.jahresergebnis < 0) ertrag.push({ text: "Verlust", betrag: -d.jahresergebnis });
  return html`
    <h1 class="doc-title">Jahresabschluss ${ui.buch.jahr}</h1>
    ${seite(`Bilanz zum ${fmt.datum(d.bis)}`, "Aktiva", d.aktiva.map((x) => ({ text: kontoText(x.k), betrag: x.betrag })), "Passiva", passiva)}
    ${seite(`Gewinn- und Verlustrechnung ${fmt.datum(d.von)} – ${fmt.datum(d.bis)}`, "Aufwendungen", aufwand, "Erträge", ertrag)}
    <p class="doc-small" style="margin-top:8mm">Erstellt am ${fmt.datum(new Date())} aus dem Aktensystem von ${s().kanzlei}.</p>
    ${unterschrift(anwaltVon(null))}`;
}

// ---------- Aktionen ----------
INPUTS["buch-q"] = (el) => { ui.buch.q = el.value; scheduleRender(); };
CHANGES["buch-jahr"] = (el) => { ui.buch.jahr = el.value; render(); };
CHANGES["buch-konto"] = (el) => { ui.buch.konto = el.value; render(); };

Object.assign(ACTIONS, {
  "hauptbuch-konto": (d) => { ui.buch.konto = d.id; go("finanzen/hauptbuch"); },
  "buchung-neu": () => openBuchungForm(),
  "buchung-storno": async (d) => {
    const b = byId("buchungen", d.id);
    if (!confirm(`Buchung ${b.nummer} „${b.text}“ über ${fmt.geld(b.betrag)} stornieren?\n\nEs wird eine Gegenbuchung angelegt. Die Originalbuchung bleibt sichtbar.`)) return;
    attempt(() => insertRow("buchungen", {
      datum: ymd(new Date()), beleg: b.nummer, text: `Storno ${b.nummer}: ${b.text}`,
      soll: b.haben, haben: b.soll, betrag: b.betrag, storno_von: b.id,
    }), `${b.nummer} storniert`);
  },
  "grundbuch-export": () => {
    const { von, bis } = periode();
    const clean = (v) => String(v ?? "").replace(/[;\r\n]+/g, " ");
    const lines = state.buchungen.filter((b) => b.datum >= von && b.datum <= bis)
      .sort((a, b) => String(a.nummer).localeCompare(String(b.nummer)))
      .map((b) => [b.nummer, fmt.datum(b.datum), b.beleg, b.text, kontoText(byId("konten", b.soll)), kontoText(byId("konten", b.haben)),
        fmt.zahl(b.betrag), personName(b.created_by)].map(clean).join(";"));
    downloadFile(`wiwang-grundbuch-${ui.buch.jahr}.csv`, "﻿" + ["Nr;Datum;Beleg;Buchungstext;Soll;Haben;Betrag;Gebucht von", ...lines].join("\r\n"), "text/csv");
  },
  "bilanz-drucken": () => openDocument({ title: `Jahresabschluss ${ui.buch.jahr}`, content: bilanzDokument() }),
  "konto-neu": () => openForm({
    title: "Neues Konto",
    fields: [
      { name: "nummer", label: "Kontonummer", required: true, third: true, placeholder: "z. B. 4250" },
      { name: "name", label: "Bezeichnung", required: true, placeholder: "z. B. Werbung" },
      { name: "typ", label: "Kontoart", type: "select", options: ["Aktiv", "Passiv", "Aufwand", "Ertrag"], required: true, half: true,
        help: "Passivkonten mit 2xxx gelten als Eigenkapital." },
    ],
    values: { typ: "Aufwand" },
    onSubmit: async (v) => {
      if (kontoNr(v.nummer)) throw new Error(`Konto ${v.nummer} gibt es schon.`);
      await insertRow("konten", v);
      toast(`Konto ${v.nummer} angelegt`);
    },
  }),
  "konto-bearbeiten": (d) => {
    const k = byId("konten", d.id);
    openForm({
      title: `Konto ${k.nummer} umbenennen`,
      fields: [{ name: "name", label: "Bezeichnung", required: true }],
      values: k,
      onSubmit: async (v) => { await updateRow("konten", k.id, v); toast("Gespeichert"); },
    });
  },
});
