// =============================================================
//  Wiwang Law – Arbeitsabläufe
//  - Abläufe: Checklisten-Vorlagen (z. B. „Strafverteidigung“), die
//    auf eine Akte angewendet Aufgaben und Termine anlegen
//  - Wiedervorlage mit einem Klick
//  - Arbeit übergeben (Urlaub, Krankheit, Ausscheiden)
// =============================================================

// ---------- Schritte als Text: "+3 [Frist] Text" ----------
function schrittAusZeile(zeile) {
  let s = String(zeile || "").trim().replace(/^[-•*]\s*/, "");
  if (!s) return null;
  let tage = 0, termin = null;
  let m = /^\+\s*(\d{1,3})\s*(?:tage?n?|t)?\.?\s+/i.exec(s);
  if (m) { tage = Math.min(365, Number(m[1])); s = s.slice(m[0].length); }
  m = /^\[([^\]]+)\]\s*/.exec(s);
  if (m) {
    const art = m[1].trim();
    termin = OPTIONEN.terminArt.find((x) => norm(x) === norm(art)) || art;
    s = s.slice(m[0].length);
  }
  s = s.trim();
  return s ? { text: s, tage, termin } : null;
}

function schrittZuZeile(x) {
  return `+${Number(x.tage) || 0} ${x.termin ? `[${x.termin}] ` : ""}${x.text}`;
}

function ablaeufeSortiert() {
  return [...state.ablaeufe].sort((a, b) => (a.sortierung ?? 100) - (b.sortierung ?? 100) || a.name.localeCompare(b.name, "de"));
}

function ablaufPasst(ablauf, akte) {
  if (!akte) return false;
  return (!ablauf.rechtsgebiet || ablauf.rechtsgebiet === akte.area) && (!ablauf.mandatsart || ablauf.mandatsart === akte.typ)
    && !!(ablauf.rechtsgebiet || ablauf.mandatsart);
}

function schrittZusammenfassung(schritte) {
  const n = (schritte || []).filter((s) => !s.termin).length;
  const t = (schritte || []).length - n;
  return joinHtml([n ? anzahl(n, "Aufgabe", "Aufgaben") : null, t ? anzahl(t, "Termin", "Termine") : null]);
}

// ---------- Ablauf auf eine Akte anwenden ----------
async function ablaufStarten(akte, ablauf, schritte, zustaendig, start) {
  const { data, error } = await db.rpc("ablauf_starten", {
    p_akte: akte.id, p_name: ablauf.name, p_schritte: schritte, p_zustaendig: zustaendig || null, p_start: start || ymd(new Date()),
  });
  if (error) {
    if (/Could not find the function|does not exist/i.test(error.message || "")) {
      throw new Error("Abläufe sind in der Datenbank noch nicht eingerichtet (supabase-update-7.sql).");
    }
    throw error;
  }
  // Neue Aufgaben/Termine sofort zeigen (die Live-Updates kommen zusätzlich)
  for (const t of ["aufgaben", "termine", "eintraege"]) {
    const res = await db.from(t).select("*").eq("akte_id", akte.id);
    if (!res.error) res.data.forEach((r) => upsertLocal(t, r));
  }
  scheduleRender();
  return data || {};
}

function openAblaufStarten(akteId, ablaufId = null) {
  const akte = byId("akten", akteId);
  if (!akte) return;
  const list = ablaeufeSortiert().sort((a, b) => ablaufPasst(b, akte) - ablaufPasst(a, akte));
  const verwalten = darf("einstellungen_schreiben");

  const auswahl = () => openDialog({
    title: `Ablauf starten – ${akte.number}`,
    wide: true,
    body: html`
      <p class="muted" style="margin-top:0">Ein Ablauf legt eine ganze Checkliste auf einmal an: Aufgaben mit Fälligkeit und Termine (z. B. Wiedervorlage). Vor dem Start kannst du einzelne Schritte abwählen.</p>
      ${list.length ? html`<div class="template-list ablauf-liste">${list.map((x) => html`
        <button type="button" data-ablauf="${x.id}">
          <strong>${x.name} ${ablaufPasst(x, akte) ? html`<span class="badge ok">passt</span>` : ""}</strong>
          <span>${x.beschreibung || ""}</span>
          <span class="small">${schrittZusammenfassung(x.schritte)}${x.rechtsgebiet || x.mandatsart ? ` · ${[x.rechtsgebiet, x.mandatsart].filter(Boolean).join(", ")}` : ""}</span>
        </button>`)}</div>`
      : html`<p class="empty">Noch keine Abläufe angelegt.${verwalten ? "" : " Abläufe legt an, wer die Kanzlei-Einstellungen bearbeiten darf."}</p>`}`,
    footer: html`<div class="dialog-actions">
      ${verwalten ? html`<button type="button" class="btn" data-action="ablauf-neu">+ Neuer Ablauf</button>` : ""}
      <span class="spacer"></span><button type="button" class="btn" data-close>Abbrechen</button></div>`,
  });

  const details = (ablauf) => {
    const dlg = openDialog({
      title: `${ablauf.name} – ${akte.number}`,
      wide: true,
      body: html`
        <form id="ablauf-form" class="form-grid" style="padding:0">
          <div class="field half"><label class="label" for="ab-zustaendig">Zuständig für alle Schritte</label>
            <select id="ab-zustaendig" name="zustaendig">
              ${teamOptions().map((o) => html`<option value="${o.value}" ${o.value === (akte.zustaendig_id || state.me.id) ? "selected" : ""}>${o.label}</option>`)}
            </select></div>
          <div class="field half"><label class="label" for="ab-start">Start (Tag 0)</label>
            <input type="date" id="ab-start" name="start" value="${ymd(new Date())}" required></div>
          <div class="field full">
            <label class="label">Schritte</label>
            <ul class="rows ablauf-schritte">${(ablauf.schritte || []).map((s, i) => html`
              <li>
                <input type="checkbox" name="schritt" value="${i}" checked aria-label="Schritt übernehmen">
                <div class="when" data-tage="${Number(s.tage) || 0}"></div>
                <div class="grow"><div>${s.text}</div>
                  <div class="meta">${s.termin ? html`<span class="badge ${terminArtClass(s.termin)}">Termin: ${s.termin}</span> um 10 Uhr` : "Aufgabe"}</div></div>
              </li>`)}</ul>
          </div>
        </form>`,
      footer: html`<div class="dialog-actions">
        <button type="button" class="btn" data-zurueck>← Andere Vorlage</button>
        <span class="spacer"></span>
        <button type="button" class="btn" data-close>Abbrechen</button>
        <button type="submit" form="ablauf-form" class="btn primary" data-start>Ablauf starten</button>
      </div>`,
    });
    const form = dlg.querySelector("#ablauf-form");
    const datumZeigen = () => {
      const start = parseDate(form.elements.start.value) || startOfDay();
      dlg.querySelectorAll("[data-tage]").forEach((el) => {
        el.innerHTML = String(html`<strong>${fmt.tag(addDays(start, Number(el.dataset.tage)))}</strong>+${el.dataset.tage} ${el.dataset.tage === "1" ? "Tag" : "Tage"}`);
      });
      const n = form.querySelectorAll('input[name="schritt"]:checked').length;
      const btn = dlg.querySelector("[data-start]");
      btn.textContent = n ? `${n} ${n === 1 ? "Schritt" : "Schritte"} anlegen` : "Nichts ausgewählt";
      btn.disabled = !n;
    };
    datumZeigen();
    form.addEventListener("change", datumZeigen);
    dlg.querySelector("[data-zurueck]").addEventListener("click", auswahl);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = dlg.querySelector("[data-start]");
      const idx = [...form.querySelectorAll('input[name="schritt"]:checked')].map((i) => Number(i.value));
      const schritte = idx.map((i) => ablauf.schritte[i]).filter(Boolean);
      if (!schritte.length) return;
      btn.disabled = true;
      const res = await attempt(() => ablaufStarten(akte, ablauf, schritte, form.elements.zustaendig.value, form.elements.start.value));
      btn.disabled = false;
      if (res === undefined) return;
      dlg.close();
      toast(`Ablauf „${ablauf.name}“ gestartet: ${[res.aufgaben ? anzahl(res.aufgaben, "Aufgabe", "Aufgaben") : "",
        res.termine ? anzahl(res.termine, "Termin", "Termine") : ""].filter(Boolean).join(", ") || "nichts angelegt"}`);
      go(`akten/${akte.id}/aufgaben`);
    });
  };

  const dlg = auswahl();
  // Klicks auf die Vorlagen (der Dialog wird beim Zurückgehen neu befüllt)
  dlg.onclick = (e) => {
    const b = e.target.closest("button[data-ablauf]");
    if (b) details(byId("ablaeufe", b.dataset.ablauf));
  };
  if (ablaufId && byId("ablaeufe", ablaufId)) details(byId("ablaeufe", ablaufId));
}

// ---------- Abläufe verwalten ----------
function openAblaufForm(ablauf) {
  openForm({
    title: ablauf ? `Ablauf „${ablauf.name}“ bearbeiten` : "Neuer Ablauf",
    wide: true,
    fields: [
      { name: "name", label: "Name", required: true, half: true, placeholder: "z. B. Verkehrsunfall" },
      { name: "beschreibung", label: "Kurzbeschreibung", half: true, placeholder: "Wann passt der Ablauf?" },
      { name: "rechtsgebiet", label: "Passt zu Rechtsgebiet", type: "select", options: OPTIONEN.rechtsgebiet, emptyLabel: "— egal —", half: true },
      { name: "mandatsart", label: "Passt zu Mandatsart", type: "select", options: OPTIONEN.mandatsart, emptyLabel: "— egal —", half: true },
      { name: "schritte", label: "Schritte – einer pro Zeile", type: "textarea", rows: 10, required: true,
        placeholder: "+0 Mandantengespräch führen\n+1 Akteneinsicht beantragen\n+7 [Wiedervorlage] Stand prüfen",
        help: html`<strong>+3</strong> am Anfang = fällig nach 3 Tagen. <strong>[Frist]</strong>, <strong>[Wiedervorlage]</strong>, <strong>[Verhandlung]</strong> … danach = statt einer Aufgabe wird ein Termin dieser Art angelegt (10 Uhr).` },
    ],
    values: ablauf ? { ...ablauf, schritte: (ablauf.schritte || []).map(schrittZuZeile).join("\n") } : {},
    onSubmit: async (v) => {
      const schritte = String(v.schritte || "").split("\n").map(schrittAusZeile).filter(Boolean);
      if (!schritte.length) throw new Error("Bitte mindestens einen Schritt eintragen.");
      const unbekannt = schritte.filter((s) => s.termin && !OPTIONEN.terminArt.includes(s.termin));
      if (unbekannt.length) throw new Error(`Unbekannte Terminart „${unbekannt[0].termin}“. Möglich: ${OPTIONEN.terminArt.join(", ")}.`);
      const row = { name: v.name, beschreibung: v.beschreibung, rechtsgebiet: v.rechtsgebiet, mandatsart: v.mandatsart, schritte };
      if (ablauf) await updateRow("ablaeufe", ablauf.id, row);
      else await insertRow("ablaeufe", { ...row, sortierung: Math.max(0, ...state.ablaeufe.map((x) => x.sortierung || 0)) + 10 });
      toast(`Ablauf „${v.name}“ gespeichert`);
    },
    onDelete: ablauf ? async () => {
      if (!confirm(`Ablauf „${ablauf.name}“ löschen? Bereits angelegte Aufgaben bleiben erhalten.`)) return false;
      await deleteRow("ablaeufe", ablauf.id);
      toast("Ablauf gelöscht");
    } : null,
  });
}

// Karte für „Personal → Kanzlei & Daten“
function ablaeufeKarte() {
  const list = ablaeufeSortiert();
  const verwalten = darf("einstellungen_schreiben");
  return html`
    <div class="card" style="margin-top:16px">
      <div class="card-head">
        <div><h2>Abläufe (Checklisten)</h2>
          <p class="muted small" style="margin:0">Vorlagen, die in einer Akte mit einem Klick Aufgaben und Termine anlegen – „Ablauf starten“ in der Akte.</p></div>
        ${verwalten ? html`<button class="btn small primary" data-action="ablauf-neu">+ Ablauf</button>` : ""}
      </div>
      ${list.length ? html`<div class="table-wrap"><table class="table">
        <thead><tr><th>Name</th><th>Passt zu</th><th>Schritte</th><th></th></tr></thead>
        <tbody>${list.map((x) => html`<tr>
          <td><strong>${x.name}</strong>${x.beschreibung ? html`<div class="small muted">${x.beschreibung}</div>` : ""}</td>
          <td>${[x.rechtsgebiet, x.mandatsart].filter(Boolean).join(", ") || html`<span class="muted">jede Akte</span>`}</td>
          <td class="small">${schrittZusammenfassung(x.schritte)}</td>
          <td class="row-actions">${verwalten ? html`<button class="icon-btn" title="Bearbeiten" data-action="ablauf-bearbeiten" data-id="${x.id}">✎</button>` : ""}</td>
        </tr>`)}</tbody>
      </table></div>` : html`<p class="empty">Noch keine Abläufe.</p>`}
    </div>`;
}

// ---------- Wiedervorlage ----------
function openWiedervorlage(akteId) {
  const a = byId("akten", akteId);
  const tag = addDays(startOfDay(), 3);
  tag.setHours(10);
  openTerminForm(null, {
    art: "Wiedervorlage", titel: "Wiedervorlage", akte_id: akteId, beginn: tag.toISOString(),
    verantwortlich: (a && a.zustaendig_id) || state.me.id,
  });
}

// ---------- Arbeit übergeben ----------
function offeneArbeit(userId) {
  return {
    akten: state.akten.filter((a) => a.zustaendig_id === userId && a.status !== "Geschlossen").length,
    aufgaben: state.aufgaben.filter((t) => !t.erledigt && t.zustaendig === userId).length,
    termine: state.termine.filter((t) => !t.erledigt && t.verantwortlich === userId).length,
  };
}

function darfUebergeben() {
  return darf("akten_schreiben") || darf("termine_schreiben");
}

function openUebergabe(vonId) {
  const n = offeneArbeit(vonId);
  // Wer gerade selbst nicht da ist (Urlaub, krank …), steht hinten und ist markiert
  const ziele = team().filter((p) => p.user_id !== vonId && p.status !== "Ausgeschieden")
    .sort((a, b) => ((a.status || "Aktiv") !== "Aktiv") - ((b.status || "Aktiv") !== "Aktiv"))
    .map((p) => ({ value: p.user_id, label: personName(p.user_id) + (rangName(p) ? ` (${rangName(p)})` : "")
      + (p.status && p.status !== "Aktiv" ? ` – ${p.status}` : "") }));
  if (!ziele.length) return toast("Es gibt niemanden, an den übergeben werden kann.", "error");
  const zahl = anzahl;
  openForm({
    title: `Arbeit von ${personName(vonId)} übergeben`,
    intro: "Für Urlaub, Krankheit oder Ausscheiden: Alles Ausgewählte geht in einem Schritt an die Vertretung. Sie wird benachrichtigt, jede Akte bekommt einen Vermerk im Verlauf.",
    fields: [
      { name: "an", label: "Übergeben an", type: "select", required: true, options: ziele },
      { type: "section", label: "Was soll übergeben werden?" },
      { name: "akten", label: `Aktive Akten (${n.akten})`, type: "checkbox", third: true },
      { name: "aufgaben", label: `Offene Aufgaben (${n.aufgaben})`, type: "checkbox", third: true },
      { name: "termine", label: `Offene Termine (${n.termine})`, type: "checkbox", third: true },
      { name: "notiz", label: "Notiz für die Vertretung", type: "textarea", rows: 3,
        placeholder: "z. B. Bin bis Freitag im Urlaub. In WL-2026-004 wartet die StA auf einen Rückruf." },
    ],
    values: {
      akten: n.akten > 0 && darf("akten_schreiben"),
      aufgaben: n.aufgaben > 0 && darf("termine_schreiben"),
      termine: n.termine > 0 && darf("termine_schreiben"),
    },
    submitLabel: "Übergeben",
    onMount: (form) => {
      if (!darf("akten_schreiben")) form.elements.akten.disabled = true;
      if (!darf("termine_schreiben")) { form.elements.aufgaben.disabled = true; form.elements.termine.disabled = true; }
    },
    onSubmit: async (v) => {
      if (!v.akten && !v.aufgaben && !v.termine) throw new Error("Bitte mindestens eins auswählen.");
      const { data, error } = await db.rpc("arbeit_uebergeben", {
        p_von: vonId, p_an: v.an, p_akten: v.akten, p_aufgaben: v.aufgaben, p_termine: v.termine, p_notiz: v.notiz,
      });
      if (error) {
        if (/Could not find the function|does not exist/i.test(error.message || "")) {
          throw new Error("Die Übergabe ist in der Datenbank noch nicht eingerichtet (supabase-update-7.sql).");
        }
        throw error;
      }
      await neuLaden(["akten", "aufgaben", "termine", "eintraege"]);
      const r = data || {};
      const teile = [r.akten ? zahl(r.akten, "Akte", "Akten") : "", r.aufgaben ? zahl(r.aufgaben, "Aufgabe", "Aufgaben") : "",
                     r.termine ? zahl(r.termine, "Termin", "Termine") : ""].filter(Boolean);
      toast(teile.length ? `An ${personName(v.an)} übergeben: ${teile.join(", ")}` : "Es gab nichts zu übergeben.");
    },
  });
}

Object.assign(ACTIONS, {
  "ablauf-starten": (d) => openAblaufStarten(d.id, d.ablauf || null),
  "ablauf-neu": () => openAblaufForm(null),
  "ablauf-bearbeiten": (d) => openAblaufForm(byId("ablaeufe", d.id)),
  wiedervorlage: (d) => openWiedervorlage(d.id),
  uebergabe: (d) => openUebergabe(d.id),
});
