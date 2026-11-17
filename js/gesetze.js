// =============================================================
//  Wiwang Law – Gesetze (Gesetzestexte im Wortlaut)
//  Übersicht:     #/gesetze            – jedes Gesetzbuch eine Kachel
//  Gesetzbuch:    #/gesetze/<id>       – alle Paragraphen, nach Abschnitten
//  Paragraph:     #/gesetze/<id>/<pid> – springt zum Paragraphen
//  Der KI-Assistent durchsucht dieselben Daten mit seinen Werkzeugen
//  (gesetze_finden, paragraphen_finden).
//  Rechte: gesetzbuch_lesen / gesetzbuch_schreiben
// =============================================================

ui.gesetzeTexte = { q: "", buchQ: "", gesprungen: null };

const GB_FARBEN = [
  { value: "rot", label: "Rot" },
  { value: "gold", label: "Gold" },
  { value: "schwarz", label: "Schwarz" },
  { value: "blau", label: "Blau" },
  { value: "gruen", label: "Grün" },
];

// "§ 12a", "Art. 3", "§ 5 Abs. 2" → "12a", "3", "5" (wie paragraph_norm in der Datenbank)
function paragraphNorm(nummer) {
  return String(nummer || "")
    .replace(/^\s*(§+|art\.?|artikel|paragraph|para\.?)\s*/i, "")
    .replace(/\s*(,|\(|abs\.?|absatz|satz|s\.|nr\.?|ziff).*$/i, "")
    .replace(/[^0-9a-z]/gi, "")
    .toLowerCase();
}

function paragraphSort(a, b) {
  return paragraphNorm(a.nummer).localeCompare(paragraphNorm(b.nummer), "de", { numeric: true })
    || String(a.nummer).localeCompare(String(b.nummer), "de");
}

function gesetzbuecherSortiert() {
  return [...state.gesetzbuecher].sort((a, b) => (a.sortierung ?? 100) - (b.sortierung ?? 100) || a.kuerzel.localeCompare(b.kuerzel, "de"));
}

function paragraphenVon(buchId) {
  return state.paragraphen.filter((p) => p.gesetzbuch_id === buchId).sort(paragraphSort);
}

function gbFarbe(buch, i = 0) {
  return buch.farbe && GB_FARBEN.some((f) => f.value === buch.farbe) ? buch.farbe : GB_FARBEN[i % GB_FARBEN.length].value;
}

// "§ 12 StGB" bzw. "Art. 3 GG"
function paragraphZitat(p) {
  const buch = byId("gesetzbuecher", p.gesetzbuch_id);
  return `${p.nummer}${buch ? " " + buch.kuerzel : ""}`;
}

// Paragraphen nach Abschnitt gruppieren (Reihenfolge wie im Gesetz)
function nachAbschnitt(list) {
  const gruppen = [];
  for (const p of list) {
    const name = p.abschnitt || "";
    const letzte = gruppen[gruppen.length - 1];
    if (letzte && letzte.name === name) letzte.items.push(p);
    else gruppen.push({ name, items: [p] });
  }
  return gruppen;
}

// ---------- Seite ----------
VIEWS.gesetze = (route) => {
  if (route.id) {
    const buch = byId("gesetzbuecher", route.id);
    return buch ? gesetzbuchAnsicht(buch, route.sub)
      : html`<div class="page"><div class="card empty-state"><h2>Gesetzbuch nicht gefunden</h2><a class="btn" href="#/gesetze">Alle Gesetze</a></div></div>`;
  }
  return gesetzeUebersicht();
};

function gesetzeUebersicht() {
  const f = ui.gesetzeTexte;
  const buecher = gesetzbuecherSortiert();
  const anzahl = new Map();
  for (const p of state.paragraphen) anzahl.set(p.gesetzbuch_id, (anzahl.get(p.gesetzbuch_id) || 0) + 1);
  const treffer = f.q.trim()
    ? state.paragraphen.filter((p) => matches(f.q, p.nummer, p.titel, p.abschnitt, p.text, (byId("gesetzbuecher", p.gesetzbuch_id) || {}).kuerzel))
      .sort((a, b) => (byId("gesetzbuecher", a.gesetzbuch_id) || {}).kuerzel?.localeCompare((byId("gesetzbuecher", b.gesetzbuch_id) || {}).kuerzel || "", "de") || paragraphSort(a, b))
    : null;
  const schreiben = darf("gesetzbuch_schreiben");

  return html`
    <div class="page">
      <div class="page-head">
        <div><h1>Gesetze</h1>
          <p class="muted">Die Gesetzbücher eures Servers im Wortlaut. ${darf("ki_assistent") ? "Der KI-Assistent schlägt hier nach, wenn du ihm Rechtsfragen stellst." : ""}</p></div>
        <div class="actions-row">
          ${schreiben ? html`<button class="btn primary" data-action="gesetzbuch-neu">+ Gesetzbuch</button>` : ""}
        </div>
      </div>
      <div class="card gb-suche">
        <div class="toolbar" style="margin:0">
          <div class="search"><input type="search" id="gb-q" data-search data-input="gb-q" value="${f.q}" placeholder="In allen Gesetzen suchen …"></div>
          <span class="muted small">${buecher.length} ${buecher.length === 1 ? "Gesetzbuch" : "Gesetzbücher"} · ${state.paragraphen.length} Paragraphen</span>
        </div>
      </div>

      ${treffer ? html`
        <div class="card">
          <div class="card-head"><h2>${treffer.length ? `${treffer.length} ${treffer.length === 1 ? "Treffer" : "Treffer"}` : "Keine Treffer"}</h2>
            <button class="btn small" data-action="gb-suche-leeren">Suche leeren</button></div>
          <div class="gb-treffer">
            ${treffer.slice(0, 60).map((p) => html`
              <a class="gb-treffer-zeile" href="#/gesetze/${p.gesetzbuch_id}/${p.id}">
                <span class="gb-zitat">${paragraphZitat(p)}</span>
                <span class="gb-treffer-text"><strong>${p.titel || ""}</strong>
                  <span class="muted small">${truncate(String(p.text || "").replace(/\s+/g, " "), 200)}</span></span>
              </a>`)}
            ${treffer.length > 60 ? html`<p class="muted small">… und ${treffer.length - 60} weitere. Bitte genauer suchen.</p>` : ""}
          </div>
        </div>` : ""}

      <div class="gb-kacheln">
        ${buecher.map((b, i) => html`
          <a class="gb-kachel farbe-${gbFarbe(b, i)}" href="#/gesetze/${b.id}">
            <span class="gb-kuerzel">${b.kuerzel}</span>
            <span class="gb-titel">${b.titel}</span>
            ${b.beschreibung ? html`<span class="gb-beschreibung">${truncate(b.beschreibung, 160)}</span>` : ""}
            <span class="gb-fuss">${anzahl.get(b.id) || 0} ${(anzahl.get(b.id) || 0) === 1 ? "Paragraph" : "Paragraphen"}
              ${b.updated_at ? html`<span>· ${fmt.relativ(b.updated_at)}</span>` : ""}</span>
          </a>`)}
        <a class="gb-kachel gb-kachel-katalog" href="#/gesetzbuch">
          <span class="gb-kuerzel">§ €</span>
          <span class="gb-titel">Strafkatalog & Strafrechner</span>
          <span class="gb-beschreibung">Delikte mit Geldstrafe und Haft – Strafmaß ausrechnen und in eine Akte übernehmen.</span>
          <span class="gb-fuss">${state.gesetze.length} Delikte</span>
        </a>
        ${schreiben ? html`
          <button type="button" class="gb-kachel gb-kachel-neu" data-action="gesetzbuch-neu">
            <span class="gb-plus">+</span><span class="gb-titel">Gesetzbuch anlegen</span>
            <span class="gb-beschreibung">z. B. StGB, StVO, Waffengesetz – Paragraphen danach per Massenimport einfügen.</span>
          </button>` : ""}
      </div>
      ${buecher.length ? "" : html`<p class="muted" style="margin-top:14px">Noch keine Gesetzbücher erfasst.${schreiben ? " Lege das erste mit „+ Gesetzbuch“ an." : ""}</p>`}
    </div>`;
}

function gesetzbuchAnsicht(buch, springeZu) {
  const f = ui.gesetzeTexte;
  const alle = paragraphenVon(buch.id);
  const list = alle.filter((p) => matches(f.buchQ, p.nummer, p.titel, p.abschnitt, p.text));
  const gruppen = nachAbschnitt(list);
  const schreiben = darf("gesetzbuch_schreiben");
  const ki = darf("ki_assistent");
  const farbe = gbFarbe(buch, gesetzbuecherSortiert().findIndex((b) => b.id === buch.id));

  return html`
    <div class="page">
      <a class="muted small gb-zurueck" href="#/gesetze">← Alle Gesetze</a>
      <div class="page-head">
        <div class="gb-kopf">
          <span class="gb-kuerzel-gross farbe-${farbe}">${buch.kuerzel}</span>
          <div><h1>${buch.titel}</h1>
            ${buch.beschreibung ? html`<p class="muted">${buch.beschreibung}</p>` : ""}</div>
        </div>
        <div class="actions-row">
          ${schreiben ? html`
            <button class="btn" data-action="gesetzbuch-bearbeiten" data-id="${buch.id}">Bearbeiten</button>
            <button class="btn" data-action="paragraphen-import" data-id="${buch.id}">Massenimport</button>
            <button class="btn primary" data-action="paragraph-neu" data-id="${buch.id}">+ Paragraph</button>` : ""}
        </div>
      </div>

      <div class="gb-layout">
        <aside class="card gb-inhalt" data-scroll="gb-inhalt">
          <p class="section-title">Inhalt</p>
          ${alle.length ? nachAbschnitt(alle).map((g) => html`
            ${g.name ? html`<p class="gb-inhalt-abschnitt">${g.name}</p>` : ""}
            <ul>${g.items.map((p) => html`<li><a href="#/gesetze/${buch.id}/${p.id}" class="${p.id === springeZu ? "aktiv" : ""}">
              <span class="nr">${p.nummer}</span> ${p.titel || ""}</a></li>`)}</ul>`)
            : html`<p class="muted small">Noch leer.</p>`}
        </aside>

        <div class="gb-texte">
          <div class="card" style="padding:12px 14px">
            <div class="toolbar" style="margin:0">
              <div class="search"><input type="search" id="gb-buch-q" data-search data-input="gb-buch-q" value="${f.buchQ}" placeholder="In ${buch.kuerzel} suchen …"></div>
              <span class="muted small">${list.length === alle.length ? `${alle.length} Paragraphen` : `${list.length} von ${alle.length}`}</span>
            </div>
          </div>
          ${!alle.length ? html`
            <div class="card empty-state">
              <h2>Noch keine Paragraphen</h2>
              <p>${schreiben ? "Am schnellsten geht es mit dem Massenimport: Gesetzestext kopieren und einfügen." : "Hier wurde noch nichts erfasst."}</p>
              ${schreiben ? html`<button class="btn primary" data-action="paragraphen-import" data-id="${buch.id}">Massenimport</button>` : ""}
            </div>` : ""}
          ${alle.length && !list.length ? html`<div class="card"><p class="empty" style="margin:0">Nichts gefunden.</p></div>` : ""}
          ${gruppen.map((g) => html`
            ${g.name ? html`<h2 class="gb-abschnitt">${g.name}</h2>` : ""}
            ${g.items.map((p) => html`
              <article class="card gb-paragraph ${p.id === springeZu ? "markiert" : ""}" id="p-${p.id}">
                <header>
                  <h3><span class="nr">${p.nummer}</span> ${p.titel || ""}</h3>
                  <div class="gb-tools">
                    ${ki ? html`<button class="btn small" data-action="gb-ki" data-id="${p.id}" title="Den KI-Assistenten zu diesem Paragraphen fragen">KI fragen</button>` : ""}
                    <button class="icon-btn" data-action="gb-link" data-id="${p.id}" title="Link kopieren">🔗</button>
                    ${schreiben ? html`<button class="icon-btn" data-action="paragraph-bearbeiten" data-id="${p.id}" title="Bearbeiten">✎</button>` : ""}
                  </div>
                </header>
                <div class="gb-wortlaut">${p.text || ""}</div>
              </article>`)}`)}
        </div>
      </div>
    </div>`;
}

// Nach dem Zeichnen zum gewählten Paragraphen springen (einmal je Aufruf)
RENDER_HOOKS.push((route) => {
  const ziel = route.page === "gesetze" && route.id && route.sub ? route.sub : null;
  if (!ziel) { ui.gesetzeTexte.gesprungen = null; return; }
  if (ui.gesetzeTexte.gesprungen === ziel) return;
  ui.gesetzeTexte.gesprungen = ziel;
  setTimeout(() => {
    const el = document.getElementById(`p-${ziel}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 30);
});

INPUTS["gb-q"] = (el) => { ui.gesetzeTexte.q = el.value; scheduleRender(); };
INPUTS["gb-buch-q"] = (el) => { ui.gesetzeTexte.buchQ = el.value; scheduleRender(); };
window.addEventListener("hashchange", () => {
  // Beim Wechsel des Gesetzbuchs (oder Sprung zu einem Paragraphen) die Suche darin zurücksetzen
  const r = parseRoute();
  const f = ui.gesetzeTexte;
  if (f.buchQ && (r.page !== "gesetze" || r.id !== f.buchId || r.sub)) {
    f.buchQ = "";
    scheduleRender();
  }
  f.buchId = r.page === "gesetze" ? r.id : null;
});

// ---------- Formulare ----------
function gesetzbuchFelder() {
  return [
    { name: "kuerzel", label: "Kürzel", required: true, third: true, placeholder: "z. B. StGB" },
    { name: "titel", label: "Titel", required: true, placeholder: "z. B. Strafgesetzbuch" },
    { name: "beschreibung", label: "Beschreibung", type: "textarea", rows: 3, placeholder: "Wofür gilt das Gesetz? (erscheint auf der Kachel und hilft der KI bei der Suche)" },
    { name: "farbe", label: "Farbe der Kachel", type: "select", half: true, options: GB_FARBEN, emptyLabel: "automatisch" },
    { name: "sortierung", label: "Reihenfolge", type: "number", half: true, placeholder: "100", help: "Kleinere Zahl = weiter vorne" },
  ];
}

function paragraphFelder(buchId) {
  const abschnitte = [...new Set(paragraphenVon(buchId).map((p) => p.abschnitt).filter(Boolean))];
  return [
    { name: "nummer", label: "Paragraph", required: true, third: true, placeholder: "§ 12" },
    { name: "titel", label: "Überschrift", placeholder: "z. B. Körperverletzung" },
    { name: "abschnitt", label: "Abschnitt", list: abschnitte, placeholder: "optional, z. B. Zweiter Abschnitt – Gewaltdelikte" },
    { name: "text", label: "Wortlaut", type: "textarea", rows: 12, required: true, placeholder: "(1) Wer …\n(2) …" },
  ];
}

function nummerDoppelt(buchId, nummer, ohneId) {
  const n = paragraphNorm(nummer);
  return n && state.paragraphen.find((p) => p.gesetzbuch_id === buchId && p.id !== ohneId && paragraphNorm(p.nummer) === n);
}

// ---------- Massenimport ----------
// Erkennt Paragraphen-Überschriften ("§ 12 Körperverletzung", "Art. 3 – Gleichheit")
// und Abschnitte ("Erster Abschnitt …", "Teil 2 …", "# Überschrift"). Alles andere ist Wortlaut.
const RE_PARAGRAPH = /^\s*((?:§{1,2}|[Aa]rt\.|[Aa]rtikel)\s*\d+(?:\s?[a-z](?![A-Za-zÄÖÜäöüß]))?)\s*[.:–—-]?\s*(.*)$/;
const RE_ABSCHNITT = /^\s*(?:#{1,6}\s+(.+)|((?:[A-ZÄÖÜ][a-zäöüß]+(?:r|s)|\d+\.|[IVXLC]+\.)?\s*(?:Abschnitt|Unterabschnitt|Teil|Kapitel|Buch)\b.*|(?:Abschnitt|Teil|Kapitel)\s+[\dIVXLC]+.*))$/;

function parseParagraphen(text) {
  const out = [];
  let abschnitt = null;
  let aktuell = null;
  for (const roh of String(text).split(/\r?\n/)) {
    const zeile = roh.replace(/\s+$/, "");
    const kurz = zeile.trim().length <= 160;
    const p = kurz ? RE_PARAGRAPH.exec(zeile) : null;
    // "§ 5 gilt entsprechend." ist Text, keine Überschrift
    if (p && !/[.;,]$/.test(p[2].trim())) {
      aktuell = { nummer: p[1].replace(/\s+/g, " ").replace(/^§(?=\d)/, "§ ").trim(), titel: p[2].trim().replace(/^[\[(]|[\])]$/g, "") || null, abschnitt, zeilen: [] };
      out.push(aktuell);
      continue;
    }
    const a = kurz ? RE_ABSCHNITT.exec(zeile) : null;
    if (a && !/[.;,]$/.test(zeile.trim())) {
      abschnitt = (a[1] || a[2] || "").trim() || null;
      aktuell = null;
      continue;
    }
    if (aktuell) aktuell.zeilen.push(zeile);
  }
  return out.map((p) => ({
    nummer: p.nummer, titel: p.titel, abschnitt: p.abschnitt,
    text: p.zeilen.join("\n").replace(/^\n+|\n+$/g, "").replace(/\n{3,}/g, "\n\n"),
  }));
}

Object.assign(ACTIONS, {
  "gesetzbuch-neu": () => openForm({
    title: "Gesetzbuch anlegen",
    fields: gesetzbuchFelder(),
    intro: "Jedes Gesetzbuch erscheint als Kachel. Die Paragraphen fügst du danach einzeln oder per Massenimport ein.",
    onSubmit: async (v) => {
      if (state.gesetzbuecher.some((b) => norm(b.kuerzel) === norm(v.kuerzel))) throw new Error(`Das Kürzel „${v.kuerzel}“ gibt es schon.`);
      const neu = await insertRow("gesetzbuecher", { ...v, sortierung: v.sortierung ?? 100 });
      toast(`${neu.kuerzel} angelegt`);
      go(`gesetze/${neu.id}`);
    },
  }),
  "gesetzbuch-bearbeiten": (d) => {
    const b = byId("gesetzbuecher", d.id);
    if (!b) return;
    openForm({
      title: `${b.kuerzel} bearbeiten`,
      fields: gesetzbuchFelder(),
      values: b,
      onSubmit: async (v) => {
        if (state.gesetzbuecher.some((x) => x.id !== b.id && norm(x.kuerzel) === norm(v.kuerzel))) throw new Error(`Das Kürzel „${v.kuerzel}“ gibt es schon.`);
        await updateRow("gesetzbuecher", b.id, { ...v, sortierung: v.sortierung ?? 100 });
        toast("Gespeichert");
      },
      deleteLabel: "Gesetzbuch löschen",
      onDelete: async () => {
        const n = paragraphenVon(b.id).length;
        if (!confirm(`${b.kuerzel} – ${b.titel} löschen?${n ? `\n\nDabei werden auch alle ${n} Paragraphen gelöscht.` : ""}`)) return false;
        await deleteRow("gesetzbuecher", b.id);
        state.paragraphen = state.paragraphen.filter((p) => p.gesetzbuch_id !== b.id);
        toast("Gesetzbuch gelöscht");
        go("gesetze");
      },
    });
  },
  "paragraph-neu": (d) => {
    const b = byId("gesetzbuecher", d.id);
    if (!b) return;
    openForm({
      title: `Paragraph in ${b.kuerzel}`,
      fields: paragraphFelder(b.id),
      wide: true,
      onSubmit: async (v) => {
        if (nummerDoppelt(b.id, v.nummer)) throw new Error(`${v.nummer} gibt es in ${b.kuerzel} schon.`);
        const neu = await insertRow("paragraphen", { ...v, gesetzbuch_id: b.id });
        toast(`${paragraphZitat(neu)} gespeichert`);
      },
    });
  },
  "paragraph-bearbeiten": (d) => {
    const p = byId("paragraphen", d.id);
    if (!p) return;
    openForm({
      title: `${paragraphZitat(p)} bearbeiten`,
      fields: paragraphFelder(p.gesetzbuch_id),
      values: p,
      wide: true,
      onSubmit: async (v) => {
        if (nummerDoppelt(p.gesetzbuch_id, v.nummer, p.id)) throw new Error(`${v.nummer} gibt es in diesem Gesetzbuch schon.`);
        await updateRow("paragraphen", p.id, v);
        toast("Gespeichert");
      },
      onDelete: async () => {
        if (!confirm(`${paragraphZitat(p)} löschen?`)) return false;
        await deleteRow("paragraphen", p.id);
        toast("Paragraph gelöscht");
      },
    });
  },
  "paragraphen-import": (d) => {
    const b = byId("gesetzbuecher", d.id);
    if (!b) return;
    const dlg = openDialog({
      title: `Massenimport in ${b.kuerzel}`,
      wide: true,
      body: html`
        <p style="margin-top:0">Gesetzestext einfach einfügen. Jede Zeile, die mit <strong>§ …</strong> oder <strong>Art. …</strong> beginnt,
          startet einen neuen Paragraphen (der Rest der Zeile ist die Überschrift). Zeilen wie <strong>„Erster Abschnitt …“</strong>,
          <strong>„Teil 2 …“</strong> oder <strong># Überschrift</strong> legen den Abschnitt fest.</p>
        <pre class="gb-beispiel">Erster Abschnitt – Straftaten gegen das Leben
§ 1 Mord
(1) Wer einen Menschen vorsätzlich tötet, …
(2) …
§ 2 Totschlag
…</pre>
        <textarea id="gb-import-text" rows="14" placeholder="Hier einfügen …"></textarea>
        <p id="gb-import-info" class="muted small"></p>`,
      footer: html`<div class="dialog-actions"><span class="spacer"></span><button class="btn" data-close>Abbrechen</button><button class="btn primary" id="gb-import-go" disabled>Importieren</button></div>`,
    });
    const ta = dlg.querySelector("#gb-import-text");
    const info = dlg.querySelector("#gb-import-info");
    const los = dlg.querySelector("#gb-import-go");
    let neu = [], aendern = [];
    ta.addEventListener("input", () => {
      const rows = parseParagraphen(ta.value);
      const vorhanden = new Map(paragraphenVon(b.id).map((p) => [paragraphNorm(p.nummer), p]));
      const gesehen = new Set();
      neu = []; aendern = [];
      for (const r of rows) {
        const key = paragraphNorm(r.nummer);
        if (!key || gesehen.has(key)) continue;
        gesehen.add(key);
        const alt = vorhanden.get(key);
        if (!alt) neu.push({ ...r, gesetzbuch_id: b.id });
        else if (alt.text !== r.text || (alt.titel || null) !== r.titel || (alt.abschnitt || null) !== r.abschnitt) {
          aendern.push({ id: alt.id, gesetzbuch_id: b.id, nummer: alt.nummer, titel: r.titel, abschnitt: r.abschnitt, text: r.text });
        }
      }
      const leer = rows.filter((r) => !r.text).length;
      info.textContent = rows.length
        ? `${rows.length} Paragraphen erkannt: ${neu.length} neu, ${aendern.length} werden aktualisiert, ${rows.length - neu.length - aendern.length} unverändert.`
          + (leer ? ` Achtung: ${leer} ohne Text.` : "") + ` Erster: ${rows[0].nummer} ${rows[0].titel || ""}${rows[0].abschnitt ? ` (${rows[0].abschnitt})` : ""}`
        : ta.value.trim() ? "Keine Paragraphen erkannt – beginnt jeder Paragraph mit „§ …“ oder „Art. …“?" : "";
      los.disabled = !(neu.length + aendern.length);
    });
    los.addEventListener("click", async () => {
      los.disabled = true;
      const ok = await attempt(async () => {
        for (let i = 0; i < neu.length; i += 200) await insertRows("paragraphen", neu.slice(i, i + 200));
        for (let i = 0; i < aendern.length; i += 200) {
          const { data, error } = await db.from("paragraphen").upsert(aendern.slice(i, i + 200)).select();
          if (error) throw error;
          data.forEach((r) => upsertLocal("paragraphen", r));
        }
        scheduleRender();
      }, `${neu.length} neu, ${aendern.length} aktualisiert`);
      if (ok !== undefined) dlg.close();
      else los.disabled = false;
    });
  },
  "gb-suche-leeren": () => { ui.gesetzeTexte.q = ""; render(); },
  "gb-link": async (d) => {
    const p = byId("paragraphen", d.id);
    if (!p) return;
    const url = `${location.origin}${location.pathname}#/gesetze/${p.gesetzbuch_id}/${p.id}`;
    if (await copyText(url)) toast(`Link zu ${paragraphZitat(p)} kopiert`);
  },
  "gb-ki": (d) => {
    const p = byId("paragraphen", d.id);
    if (!p || typeof kiFrageVorbereiten !== "function") return;
    kiFrageVorbereiten(`Erkläre ${paragraphZitat(p)}${p.titel ? ` (${p.titel})` : ""}: `);
  },
});
