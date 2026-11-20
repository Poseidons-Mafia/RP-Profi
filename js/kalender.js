// =============================================================
//  Wiwang Law – Kalender & Aufgaben
// =============================================================

function joinHtml(parts, sep = " · ") {
  return parts.filter((p) => p !== null && p !== undefined && p !== false && p !== "")
    .flatMap((p, i) => (i ? [sep, p] : [p]));
}

function terminArtClass(art) {
  if (["Verhandlung", "Haftprüfung"].includes(art)) return "gericht";
  if (["Frist", "Wiedervorlage"].includes(art)) return "hoch";
  if (art === "Mandantengespräch") return "blue";
  return "gold";
}

function istMeinTermin(t) {
  if (t.verantwortlich) return t.verantwortlich === state.me.id;
  const a = byId("akten", t.akte_id);
  return (a && a.zustaendig_id === state.me.id) || isMe(t.created_by);
}

// ---------- Bausteine (auch in Akten & Übersicht genutzt) ----------
// mandant: false → Akten-Chip ohne Mandantennamen (z. B. im Mandanten-Dossier)
// checkNurFrist: Häkchen nur bei abhakbaren Fristen/Wiedervorlagen, sonst Kalender-Icon
function terminRow(t, { akte = true, datum = true, mandant = true, checkNurFrist = false } = {}) {
  const a = byId("akten", t.akte_id);
  const overdue = terminUeberfaellig(t);
  const abhakbar = !checkNurFrist || ["Frist", "Wiedervorlage"].includes(t.art);
  return html`
    <li class="${overdue ? "overdue" : ""}" data-live="termine:${t.id}">
      ${abhakbar ? html`<label class="check-hit"><input type="checkbox" title="Erledigt" data-change="termin-erledigt" data-id="${t.id}" ${t.erledigt ? "checked" : ""}></label>`
        : html`<span class="termin-icon" title="Termin" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 9.5h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>`}
      <div class="when">${datum ? html`<strong>${fmt.tag(t.beginn)}</strong>` : ""}${fmt.zeit(t.beginn)} Uhr</div>
      <div class="grow">
        <div class="title ${t.erledigt ? "strike" : ""}">${t.titel}
          <span class="badge ${terminArtClass(t.art)}">${t.art}</span>
          ${overdue ? html`<span class="badge alert">überfällig</span>` : ""}
        </div>
        <div class="meta">${joinHtml([
          t.ort,
          akte && a ? akteChip(a, mandant ? mandantName(a) : "") : null,
          t.verantwortlich && t.verantwortlich !== state.me.id ? personName(t.verantwortlich) : null,
          vonNigel(t),
        ])}</div>
        ${t.notiz ? html`<div class="meta pre">${t.notiz}</div>` : ""}
      </div>
      <div class="tools">
        <button class="icon-btn" title="In den Handy-Kalender übernehmen (.ics)" data-action="termin-ics" data-id="${t.id}">⇩</button>
        <button class="icon-btn" title="Bearbeiten" data-action="termin-bearbeiten" data-id="${t.id}">✎</button>
      </div>
    </li>`;
}

function sortAufgaben(a, b) {
  const fa = a.faellig ? parseDate(a.faellig).getTime() : Infinity;
  const fb = b.faellig ? parseDate(b.faellig).getTime() : Infinity;
  return fa - fb || new Date(a.created_at) - new Date(b.created_at);
}

function aufgabeRow(t, { akte = true } = {}) {
  const a = byId("akten", t.akte_id);
  const overdue = aufgabeUeberfaellig(t);
  return html`
    <li class="${overdue ? "overdue" : ""}" data-live="aufgaben:${t.id}">
      <label class="check-hit"><input type="checkbox" title="Erledigt" data-change="aufgabe-erledigt" data-id="${t.id}" ${t.erledigt ? "checked" : ""}></label>
      <div class="grow">
        <div class="${t.erledigt ? "strike" : ""}">${t.text}</div>
        <div class="meta">${joinHtml([
          t.faellig ? html`<span class="${overdue ? "faellig-ueber" : ""}">fällig ${fmt.tag(t.faellig)}</span>` : null,
          // Eigener Name ist redundant – nur zeigen, wenn jemand anderes zuständig ist
          t.zustaendig && t.zustaendig !== state.me.id ? personName(t.zustaendig) : null,
          akte && a ? akteChip(a, a.title) : null,
          t.erledigt && t.erledigt_am ? `erledigt ${fmt.relativ(t.erledigt_am)}` : null,
          vonNigel(t),
        ])}</div>
      </div>
      <div class="tools"><button class="icon-btn" title="Bearbeiten" data-action="aufgabe-bearbeiten" data-id="${t.id}">✎</button></div>
    </li>`;
}

// Ruhiger, klickbarer Akten-Verweis (Rot bleibt der Überfälligkeit vorbehalten)
function akteChip(a, zusatz) {
  return html`<a class="akte-chip" href="#/akten/${a.id}" title="${a.number} · ${a.title}"><span class="mono">${a.number}</span>${zusatz ? html` · ${truncate(zusatz, 30)}` : ""}</a>`;
}

// Datumsfeld mit sichtbarem Platzhalter: Safari/iPadOS zeigt ein leeres
// <input type="date"> sonst als weiße Box. Ruhezustand type="text", beim
// Fokus type="date" (siehe Listener unten), ohne Wert zurück zu text.
function datumPlatzhalter(name, id, placeholder = "Fällig am …") {
  return html`<span class="datum-feld">
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 9.5h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
    <input type="text" id="${id}" name="${name}" data-datum-platzhalter placeholder="${placeholder}" title="Fällig am" aria-label="Fällig am" inputmode="none" autocomplete="off">
  </span>`;
}

// Quick-Add; klappbar = im Ruhezustand nur die Textzeile (Übersicht)
ui.quickAddOffen = ui.quickAddOffen || {};
function aufgabeSchnellForm(akteId, { klappbar = false } = {}) {
  const id = `aufgabe-${akteId || "allgemein"}`;
  const offen = !klappbar || ui.quickAddOffen[id] || !!ui.drafts[id];
  return html`
    <form class="quick-add ${klappbar ? "klappbar" : ""} ${offen ? "offen" : ""}" data-submit="aufgabe-schnell" data-akte="${akteId || ""}" data-klapp-id="${id}">
      <input id="${id}" name="text" data-input="draft" value="${ui.drafts[id] || ""}" required placeholder="Neue Aufgabe … z. B. Bodycam anfordern" autocomplete="off">
      <div class="quick-add-mehr">
        <select id="${id}-zustaendig" name="zustaendig" title="Zuständig">
          ${teamOptions().map((o) => html`<option value="${o.value}" ${o.value === state.me.id ? "selected" : ""}>${o.label}</option>`)}
        </select>
        ${datumPlatzhalter("faellig", `${id}-faellig`)}
        <button class="btn primary" type="submit" title="Aufgabe anlegen">+ Aufgabe</button>
      </div>
    </form>`;
}

function quickAddKlappen(form, offen) {
  if (!form || !form.classList.contains("klappbar")) return;
  form.classList.toggle("offen", offen);
  if (offen) ui.quickAddOffen[form.dataset.klappId] = true;
  else delete ui.quickAddOffen[form.dataset.klappId];
}

document.addEventListener("focusin", (e) => {
  const el = e.target;
  if (el.matches && el.matches("input[data-datum-platzhalter]") && el.type !== "date") {
    el.type = "date";
    try { if (el.showPicker && matchMedia("(pointer: fine)").matches) el.showPicker(); } catch {}
  }
  quickAddKlappen(el.closest && el.closest("form.quick-add.klappbar"), true);
});
document.addEventListener("focusout", (e) => {
  const el = e.target;
  if (el.matches && el.matches("input[data-datum-platzhalter]") && !el.value) el.type = "text";
  const form = el.closest && el.closest("form.quick-add.klappbar");
  if (!form) return;
  // Einklappen nur, wenn der Fokus das Formular verlässt und das Textfeld leer ist
  setTimeout(() => {
    if (!form.isConnected || form.contains(document.activeElement)) return;
    const hatDatum = form.elements.faellig && form.elements.faellig.value;
    if (!form.elements.text.value.trim() && !hatDatum) quickAddKlappen(form, false);
  }, 120);
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const form = e.target.closest && e.target.closest("form.quick-add.klappbar");
  if (!form) return;
  form.reset();
  const df = form.querySelector("input[data-datum-platzhalter]");
  if (df) df.type = "text";
  delete ui.drafts[form.elements.text.id];
  quickAddKlappen(form, false);
  e.target.blur();
});

SUBMITS["aufgabe-schnell"] = async (form) => {
  const text = form.elements.text.value.trim();
  if (!text) return;
  const ok = await attempt(() => insertRow("aufgaben", {
    text, akte_id: form.dataset.akte || null, zustaendig: form.elements.zustaendig.value || null, faellig: form.elements.faellig.value || null,
  }), "Aufgabe angelegt");
  if (ok !== undefined) {
    delete ui.drafts[form.elements.text.id];
    form.reset();
    const df = form.querySelector("input[data-datum-platzhalter]");
    if (df) df.type = "text";
    quickAddKlappen(form, false);
    if (form.contains(document.activeElement)) document.activeElement.blur();
  }
};

function aufgabeFields() {
  return [
    { name: "text", label: "Aufgabe", type: "textarea", rows: 2, required: true },
    { name: "zustaendig", label: "Zuständig", type: "select", options: teamOptions, half: true },
    { name: "faellig", label: "Fällig am", type: "date", half: true },
    { name: "akte_id", label: "Akte", type: "select", options: akteOptions, emptyLabel: "— keine Akte —" },
    { name: "erledigt", label: "Erledigt", type: "checkbox" },
  ];
}

function terminFields() {
  return [
    { name: "titel", label: "Titel", required: true, placeholder: "z. B. Hauptverhandlung, Frist Einspruch" },
    { name: "art", label: "Art", type: "select", options: OPTIONEN.terminArt, required: true, half: true },
    { name: "beginn", label: "Datum & Uhrzeit", type: "datetime", required: true, half: true },
    { name: "ort", label: "Ort", half: true, placeholder: "z. B. Gericht, Mission Row PD" },
    { name: "verantwortlich", label: "Verantwortlich", type: "select", options: teamOptions, half: true },
    { name: "akte_id", label: "Akte", type: "select", options: akteOptions, emptyLabel: "— keine Akte —" },
    { name: "notiz", label: "Notiz", type: "textarea", rows: 3 },
    { name: "erledigt", label: "Erledigt", type: "checkbox" },
  ];
}

function openTerminForm(termin, preset = {}) {
  const morgen = addDays(startOfDay(), 1);
  morgen.setHours(10);
  openForm({
    title: termin ? "Termin bearbeiten" : "Neuer Termin",
    fields: terminFields(),
    values: termin || { art: "Verhandlung", beginn: morgen.toISOString(), verantwortlich: state.me.id, ...preset },
    onChange: (name, form) => {
      if (name === "art" && !form.elements.titel.value.trim()) form.elements.titel.value = form.elements.art.value;
    },
    onSubmit: async (v) => {
      if (termin) await updateRow("termine", termin.id, v);
      else await insertRow("termine", v);
      toast(termin ? "Termin gespeichert" : "Termin angelegt");
    },
    onDelete: termin ? async () => {
      if (!confirm(`Termin „${termin.titel}“ löschen?`)) return false;
      await deleteRow("termine", termin.id);
      toast("Termin gelöscht");
    } : null,
  });
}

// ---------- Kalender-Export (.ics für iPhone, Google, Outlook) ----------
function icsDate(d) {
  return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function icsEscape(s) {
  return String(s || "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
function icsEvent(t) {
  const a = byId("akten", t.akte_id);
  const start = new Date(t.beginn);
  const end = new Date(start.getTime() + 60 * 60000);
  const summary = (t.titel === t.art ? t.titel : `${t.art}: ${t.titel}`) + (a ? ` – ${mandantName(a)}` : "");
  const desc = [a ? `Akte ${a.number}: ${a.title}` : "", t.notiz || ""].filter(Boolean).join("\n");
  return [
    "BEGIN:VEVENT", `UID:${t.id}@wiwang-law`, `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`, `SUMMARY:${icsEscape(summary)}`,
    t.ort ? `LOCATION:${icsEscape(t.ort)}` : null, desc ? `DESCRIPTION:${icsEscape(desc)}` : null,
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Erinnerung", "TRIGGER:-PT30M", "END:VALARM",
    "END:VEVENT",
  ].filter(Boolean);
}
function icsFile(termine) {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wiwang Law//Aktensystem//DE", "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH", ...termine.flatMap(icsEvent), "END:VCALENDAR"].join("\r\n");
}

// ---------- Seite ----------
VIEWS.kalender = () => {
  const k = ui.kalender;
  let termine = state.termine;
  if (k.meine) termine = termine.filter(istMeinTermin);

  let aufgaben = state.aufgaben.filter((t) => !t.erledigt);
  if (k.meine) aufgaben = aufgaben.filter((t) => t.zustaendig === state.me.id || (!t.zustaendig && isMe(t.created_by)));
  aufgaben.sort(sortAufgaben);

  return html`
    <div class="page">
      <div class="page-head">
        <div><h1>Kalender & Aufgaben</h1><p class="muted">Verhandlungen, Haftprüfungen, Fristen – und was zu tun ist.</p></div>
        <div class="actions-row">
          <div class="chips">
            <button class="chip ${k.modus === "agenda" ? "active" : ""}" data-action="kalender-modus" data-modus="agenda">Liste</button>
            <button class="chip ${k.modus === "monat" ? "active" : ""}" data-action="kalender-modus" data-modus="monat">Monat</button>
          </div>
          <label class="check"><input type="checkbox" id="kal-meine" data-change="kalender-meine" ${k.meine ? "checked" : ""}> Nur meine</label>
          <button class="btn" data-action="termine-export" title="Alle kommenden Termine als Datei für den Handy-Kalender">Alle exportieren</button>
          <button class="btn primary" data-action="termin-neu">+ Termin</button>
        </div>
      </div>
      <div class="cal-layout">
        <div class="card">${k.modus === "monat" ? monatsAnsicht(termine) : agendaAnsicht(termine)}</div>
        <div class="card">
          <div class="card-head"><h2>Aufgaben</h2><span class="muted small">${aufgaben.length} offen</span></div>
          ${aufgabeSchnellForm(null)}
          ${aufgaben.length ? html`<ul class="rows">${aufgaben.map((t) => aufgabeRow(t))}</ul>` : html`<p class="empty">Nichts zu tun. 🎉</p>`}
        </div>
      </div>
    </div>`;
};

function agendaAnsicht(termine) {
  const today = startOfDay();
  const ueberfaellig = termine.filter(terminUeberfaellig).sort((a, b) => new Date(a.beginn) - new Date(b.beginn));
  const kommend = termine.filter((t) => !terminUeberfaellig(t) && new Date(t.beginn) >= today)
    .sort((a, b) => new Date(a.beginn) - new Date(b.beginn));
  const vergangen = ui.kalender.vergangene
    ? termine.filter((t) => !terminUeberfaellig(t) && new Date(t.beginn) < today && new Date(t.beginn) >= addDays(today, -60))
      .sort((a, b) => new Date(b.beginn) - new Date(a.beginn))
    : [];
  const tage = new Map();
  for (const t of kommend) {
    const key = ymd(t.beginn);
    if (!tage.has(key)) tage.set(key, []);
    tage.get(key).push(t);
  }
  return html`
    ${ueberfaellig.length ? html`<div class="day-group today"><h3>Überfällig</h3><ul class="rows">${ueberfaellig.map((t) => terminRow(t))}</ul></div>` : ""}
    ${[...tage.entries()].map(([day, list]) => html`
      <div class="day-group ${day === ymd(today) ? "today" : ""}">
        <h3>${fmt.tagLang(day)}</h3>
        <ul class="rows">${list.map((t) => terminRow(t, { datum: false }))}</ul>
      </div>`)}
    ${!kommend.length && !ueberfaellig.length ? html`<p class="empty">Keine anstehenden Termine.</p>` : ""}
    <div class="actions-row" style="margin-top:8px">
      <button class="link-btn" data-action="kalender-vergangene">${ui.kalender.vergangene ? "Vergangene ausblenden" : "Vergangene Termine anzeigen"}</button>
    </div>
    ${vergangen.length ? html`<div class="day-group" style="margin-top:12px"><h3>Vergangen (60 Tage)</h3><ul class="rows">${vergangen.map((t) => terminRow(t))}</ul></div>` : ""}`;
}

function monatsAnsicht(termine) {
  const [y, m] = ui.kalender.monat.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const start = addDays(first, -((first.getDay() + 6) % 7)); // Montag davor
  const last = new Date(y, m, 0);
  const weeks = Math.ceil((((first.getDay() + 6) % 7) + last.getDate()) / 7);
  const byDay = new Map();
  for (const t of termine) {
    const key = ymd(t.beginn);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(t);
  }
  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i);
    const key = ymd(d);
    const items = (byDay.get(key) || []).sort((a, b) => new Date(a.beginn) - new Date(b.beginn));
    cells.push(html`
      <div class="day-cell ${d.getMonth() !== m - 1 ? "other" : ""} ${sameDay(d, new Date()) ? "today" : ""}" data-action="termin-neu" data-datum="${key}" title="Neuer Termin am ${fmt.datum(d)}">
        <span class="d">${d.getDate()}</span>
        ${items.slice(0, 3).map((t) => html`<a class="cal-item ${norm(t.art)} ${t.erledigt ? "done" : ""}" data-action="termin-bearbeiten" data-id="${t.id}" title="${fmt.zeit(t.beginn)} ${t.titel}">${fmt.zeit(t.beginn)} ${t.titel}</a>`)}
        ${items.length > 3 ? html`<span class="cal-more">+${items.length - 3} weitere</span>` : ""}
      </div>`);
  }
  return html`
    <div class="month-head">
      <button class="btn small" data-action="monat" data-delta="-1" title="Voriger Monat">‹</button>
      <h2>${MONATE[m - 1]} ${y}</h2>
      <button class="btn small" data-action="monat" data-delta="1" title="Nächster Monat">›</button>
      <button class="btn small" data-action="monat" data-delta="0">Heute</button>
    </div>
    <div class="month-grid">
      ${["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => html`<div class="dow">${d}</div>`)}
      ${cells}
    </div>
    <p class="muted small">Tipp: Auf einen Tag tippen, um dort einen Termin anzulegen.</p>`;
}

// ---------- Aktionen ----------
Object.assign(ACTIONS, {
  "kalender-modus": (d) => { ui.kalender.modus = d.modus; render(); },
  "kalender-vergangene": () => { ui.kalender.vergangene = !ui.kalender.vergangene; render(); },
  monat: (d) => {
    if (d.delta === "0") ui.kalender.monat = ymd(new Date()).slice(0, 7);
    else {
      const [y, m] = ui.kalender.monat.split("-").map(Number);
      const n = new Date(y, m - 1 + Number(d.delta), 1);
      ui.kalender.monat = ymd(n).slice(0, 7);
    }
    render();
  },
  "termin-neu": (d) => {
    const preset = {};
    if (d.akte) preset.akte_id = d.akte;
    if (d.datum) {
      const t = parseDate(d.datum);
      t.setHours(10);
      preset.beginn = t.toISOString();
    }
    openTerminForm(null, preset);
  },
  "termin-bearbeiten": (d) => openTerminForm(byId("termine", d.id)),
  "termin-ics": (d) => {
    const t = byId("termine", d.id);
    downloadFile(`termin-${ymd(t.beginn)}.ics`, icsFile([t]), "text/calendar");
  },
  "termine-export": () => {
    const list = state.termine.filter((t) => !t.erledigt && new Date(t.beginn) >= startOfDay())
      .filter((t) => !ui.kalender.meine || istMeinTermin(t));
    if (!list.length) return toast("Keine kommenden Termine zum Exportieren.");
    downloadFile(`wiwang-termine-${ymd(new Date())}.ics`, icsFile(list), "text/calendar");
  },
  "aufgabe-bearbeiten": (d) => {
    const t = byId("aufgaben", d.id);
    openForm({
      title: "Aufgabe bearbeiten",
      fields: aufgabeFields(),
      values: t,
      onSubmit: async (v) => {
        if (v.erledigt && !t.erledigt) v.erledigt_am = new Date().toISOString();
        if (!v.erledigt) v.erledigt_am = null;
        await updateRow("aufgaben", t.id, v);
        toast("Aufgabe gespeichert");
      },
      onDelete: async () => {
        if (!confirm("Aufgabe löschen?")) return false;
        await deleteRow("aufgaben", t.id);
      },
    });
  },
});

CHANGES["kalender-meine"] = (el) => { ui.kalender.meine = el.checked; render(); };
CHANGES["termin-erledigt"] = (el) => {
  attempt(() => updateRow("termine", el.dataset.id, { erledigt: el.checked }), el.checked ? "Termin erledigt" : null);
};
CHANGES["aufgabe-erledigt"] = (el) => {
  attempt(() => updateRow("aufgaben", el.dataset.id, { erledigt: el.checked, erledigt_am: el.checked ? new Date().toISOString() : null }),
    el.checked ? "Aufgabe erledigt ✓" : null);
};
