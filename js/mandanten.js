// =============================================================
//  Wiwang Law – Mandantenkartei
// =============================================================

function mandantAkten(m) {
  return state.akten.filter((a) => a.mandant_id === m.id);
}

function markierungBadges(m) {
  return (m.markierungen || []).map((x) => html`<span class="badge ${["Zahlt schlecht", "Vorsicht"].includes(x) ? "offen" : x === "VIP" ? "haft" : "gold"}">${x}</span>`);
}

// Wo taucht die Person sonst auf? (Gegenpartei, Zeuge, …)
function auftritte(m) {
  const n = norm(m.name);
  const list = [];
  for (const a of state.akten) {
    if (a.mandant_id === m.id) continue;
    if (norm(a.opponent) === n) list.push({ akte: a, rolle: "Gegenpartei" });
  }
  for (const b of state.beteiligte) {
    if (norm(b.name) !== n) continue;
    const a = byId("akten", b.akte_id);
    if (a && a.mandant_id !== m.id) list.push({ akte: a, rolle: b.rolle });
  }
  return list;
}

function mandantFields() {
  return [
    { name: "name", label: "Name", required: true, half: true },
    { name: "telefon", label: "Telefon (ingame)", half: true, placeholder: "z. B. 555-0123" },
    { name: "discord", label: "Discord", third: true },
    { name: "geburtsdatum", label: "Geburtsdatum", third: true, placeholder: "TT.MM.JJJJ" },
    { name: "adresse", label: "Adresse", third: true },
    { name: "markierungen", label: "Markierungen", type: "checks", options: OPTIONEN.markierung },
    { name: "notizen", label: "Notizen", type: "textarea", rows: 4, placeholder: "Wichtiges zur Person: Zahlungsmoral, Gang-Zugehörigkeit, Absprachen …" },
  ];
}

function openMandantForm(m) {
  openForm({
    title: m ? `${m.name} bearbeiten` : "Neuer Mandant",
    fields: mandantFields(),
    values: m || { markierungen: [] },
    onSubmit: async (v) => {
      const doppelt = findMandantByName(v.name);
      if (doppelt && (!m || doppelt.id !== m.id)) throw new Error(`„${doppelt.name}“ gibt es schon in der Kartei.`);
      if (m) {
        await updateRow("mandanten", m.id, v);
        if (v.name !== m.name && mandantAkten(m).length) {
          // Namen auch in den Akten aktualisieren (für Suche & Dokumente)
          const { data, error } = await db.from("akten").update({ client: v.name }).eq("mandant_id", m.id).select();
          if (error) throw error;
          data.forEach((r) => upsertLocal("akten", r));
        }
        toast("Mandant gespeichert");
      } else {
        const created = await insertRow("mandanten", v);
        go(`mandanten/${created.id}`);
        toast(`${created.name} angelegt`);
      }
    },
    onDelete: m ? async () => {
      const n = mandantAkten(m).length;
      if (!confirm(`${m.name} aus der Kartei löschen?${n ? `\n\nDie ${n} Akte(n) bleiben erhalten, sind dann aber nicht mehr mit der Kartei verknüpft.` : ""}`)) return false;
      await deleteRow("mandanten", m.id);
      go("mandanten");
    } : null,
  });
}

VIEWS.mandanten = (route) => {
  const f = ui.mandanten;
  const list = state.mandanten
    .filter((m) => !f.markierung || (m.markierungen || []).includes(f.markierung))
    .filter((m) => matches(f.q, m.name, m.telefon, m.discord, m.adresse, m.notizen, m.markierungen))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  const m = route.id ? byId("mandanten", route.id) : null;
  const antraege = portalAntraege().length + offeneAnliegen().filter((x) => x.status === "offen").length;
  return html`
    <div class="page">
      <div class="split ${route.id ? "has-detail" : ""}">
        <aside class="list-pane">
          <div class="toolbar">
            <div class="search"><input type="search" id="mandanten-q" data-search data-input="mandanten-q" value="${f.q}" placeholder="Name, Telefon, Discord …"></div>
            <button class="btn small primary" data-action="mandant-neu">+ Neu</button>
          </div>
          <div class="toolbar">
            <a class="btn small ${route.id === "portal" ? "primary" : ""} portal-link" href="#/mandanten/portal" title="Zugänge zum Mandantenportal">
              Mandantenportal${antraege ? html`<span class="nav-badge" title="wartende Anträge und offene Anliegen">${antraege}</span>` : ""}</a>
          </div>
          <div class="toolbar">
            <select id="mandanten-mark" data-change="mandanten-mark">
              <option value="">Alle Mandanten</option>
              ${OPTIONEN.markierung.map((x) => html`<option ${f.markierung === x ? "selected" : ""}>${x}</option>`)}
            </select>
          </div>
          <div class="list-count">${list.length} Mandanten</div>
          <div class="list-scroll" data-scroll="mandanten-list">
            <ul class="item-list">${list.map((x) => {
              const akten = mandantAkten(x);
              const aktiv = akten.filter((a) => a.status !== "Geschlossen").length;
              const offen = offeneRechnungSumme(state.rechnungen.filter((r) => r.mandant_id === x.id));
              return html`<li><a class="item ${x.id === route.id ? "active" : ""}" href="#/mandanten/${x.id}">
                <span class="title">${x.name}</span>
                <span class="meta"><span>${x.telefon || "—"}</span><span class="badges">${markierungBadges(x)}</span></span>
                <span class="sub">${akten.length} ${akten.length === 1 ? "Akte" : "Akten"}${aktiv ? `, ${aktiv} aktiv` : ""}${offen ? ` · offen ${fmt.geld(offen)}` : ""}${akten.some((a) => a.in_haft) ? " · in Haft" : ""}</span>
              </a></li>`;
            })}</ul>
            ${list.length ? "" : html`<p class="empty center">Keine Mandanten gefunden.</p>`}
          </div>
        </aside>
        <section class="detail-pane">
          ${route.id === "portal" ? portalZugaengeSeite() : route.id
            ? m ? mandantDetail(m) : html`<div class="card empty-state"><h2>Mandant nicht gefunden</h2><a class="btn" href="#/mandanten">Zur Liste</a></div>`
            : html`<div class="card empty-state"><h2>Mandantenkartei</h2>
                <p>Alle Mandanten mit Kontaktdaten, Akten, Ergebnissen und offenen Rechnungen. Neue Mandanten entstehen auch automatisch beim Anlegen einer Akte.</p>
                <button class="btn primary" data-action="mandant-neu">+ Neuer Mandant</button></div>`}
        </section>
      </div>
    </div>`;
};

function mandantDetail(m) {
  const akten = mandantAkten(m).sort((a, b) => (b.number || "").localeCompare(a.number || ""));
  const rechnungen = state.rechnungen.filter((r) => r.mandant_id === m.id).sort((a, b) => (b.nummer || "").localeCompare(a.nummer || ""));
  const offen = offeneRechnungSumme(rechnungen);
  const termine = state.termine.filter((t) => !t.erledigt && new Date(t.beginn) >= startOfDay() && akten.some((a) => a.id === t.akte_id))
    .sort((a, b) => new Date(a.beginn) - new Date(b.beginn));
  const ergebnisse = akten.filter((a) => a.ergebnis);
  const auftr = auftritte(m);
  const erste = akten.length ? akten.reduce((x, a) => (new Date(a.created_at) < new Date(x.created_at) ? a : x)) : null;

  return html`
    <a class="back-link" href="#/mandanten">← Alle Mandanten</a>
    <div class="detail-card">
      <div class="detail-head" style="padding-bottom:4px">
        <div class="top">
          <div>
            <h2>${m.name}</h2>
            <div class="badges">${markierungBadges(m)}</div>
          </div>
          <div class="actions-row" style="align-items:flex-start">
            <button class="btn primary" data-action="akte-neu" data-mandant="${m.name}">+ Neue Akte</button>
            ${darf("rechnungen") ? html`<button class="btn" data-action="rechnung-neu" data-mandant="${m.id}">+ Rechnung</button>` : ""}
            <button class="btn" data-action="mandant-bearbeiten" data-id="${m.id}">Bearbeiten</button>
          </div>
        </div>
      </div>
      <div class="tab-body">
        ${offen ? html`<div class="box warning"><strong>Offene Rechnungen: ${fmt.geld(offen)}</strong></div>` : ""}
        ${auftr.length ? html`<div class="box warning"><strong>Achtung – taucht auch in anderen Akten auf:</strong>
          <ul>${auftr.map((x) => html`<li>${x.rolle} in <a href="#/akten/${x.akte.id}">${x.akte.number} · ${x.akte.title}</a> (Mandant: ${mandantName(x.akte)})</li>`)}</ul></div>` : ""}
        <dl class="facts">
          <div><dt>Telefon</dt><dd>${m.telefon || "–"}</dd></div>
          <div><dt>Discord</dt><dd>${m.discord || "–"}</dd></div>
          <div><dt>Geburtsdatum</dt><dd>${m.geburtsdatum || "–"}</dd></div>
          <div><dt>Adresse</dt><dd>${m.adresse || "–"}</dd></div>
          <div><dt>Mandant seit</dt><dd>${fmt.datum(erste ? erste.created_at : m.created_at)}</dd></div>
          <div><dt>Akten</dt><dd>${akten.length} (${akten.filter((a) => a.status !== "Geschlossen").length} aktiv)</dd></div>
        </dl>
        ${m.notizen ? html`<h3 class="section-title">Notizen</h3><p class="pre" style="margin-top:0">${m.notizen}</p>` : ""}
        ${mandantPortalBlock(m)}

        <h3 class="section-title" style="margin-top:20px">Akten</h3>
        ${akten.length ? html`<div class="table-wrap"><table class="table">
          <thead><tr><th>Az.</th><th>Betreff</th><th>Status</th><th>Ergebnis</th><th>Zuständig</th></tr></thead>
          <tbody>${akten.map((a) => html`<tr class="clickable" data-action="goto" data-to="akten/${a.id}">
            <td class="nowrap"><a href="#/akten/${a.id}">${a.number}</a></td>
            <td>${a.title} ${haftBadge(a)}</td>
            <td>${statusBadge(a.status)}</td>
            <td>${a.ergebnis || "–"}</td>
            <td>${personName(a.zustaendig_id, a.lawyer || "–")}</td></tr>`)}</tbody></table></div>`
          : html`<p class="empty">Noch keine Akten.</p>`}

        ${ergebnisse.length ? html`<h3 class="section-title" style="margin-top:20px">Frühere Ergebnisse</h3>
          <ul class="rows">${ergebnisse.map((a) => html`<li><div class="grow"><div class="title">${a.ergebnis}${a.ergebnis_datum ? html` <span class="muted small">(${fmt.datum(a.ergebnis_datum)})</span>` : ""}</div>
            <div class="meta"><a href="#/akten/${a.id}">${a.number} · ${a.title}</a>${a.ergebnis_details ? ` – ${a.ergebnis_details}` : ""}</div></div></li>`)}</ul>` : ""}

        ${termine.length ? html`<h3 class="section-title" style="margin-top:20px">Anstehende Termine</h3>
          <ul class="rows">${termine.map((t) => terminRow(t))}</ul>` : ""}

        <h3 class="section-title" style="margin-top:20px">Rechnungen</h3>
        ${rechnungen.length ? rechnungTabelle(rechnungen) : html`<p class="empty">Noch keine Rechnungen.</p>`}
      </div>
    </div>`;
}

INPUTS["mandanten-q"] = (el) => { ui.mandanten.q = el.value; scheduleRender(); };
CHANGES["mandanten-mark"] = (el) => { ui.mandanten.markierung = el.value; render(); };

Object.assign(ACTIONS, {
  "mandant-neu": () => openMandantForm(null),
  "mandant-bearbeiten": (d) => openMandantForm(byId("mandanten", d.id)),
  goto: (d) => go(d.to),
});
