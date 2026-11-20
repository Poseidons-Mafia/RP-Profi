// =============================================================
//  Wiwang Law – Mandantenkartei
// =============================================================

function mandantAkten(m) {
  return state.akten.filter((a) => a.mandant_id === m.id);
}

function markierungBadges(m) {
  return (m.markierungen || []).map((x) => html`<span class="badge ${["Zahlt schlecht", "Vorsicht"].includes(x) ? "alert" : x === "VIP" ? "vip" : "gold"}">${x}</span>`);
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

// ---------- Bausteine der CRM-Kartei ----------
// Freigegebener Portal-Zugang (oder wartender Antrag) eines Mandanten
function mandantZugang(m) {
  const z = portalZugaengeVon(m.id);
  return z.find((x) => x.status === "frei" && x.person_status !== "gesperrt") || z.find((x) => x.status === "wartet") || null;
}

// Runder Avatar: Discord-Bild (falls Portal-Zugang verknüpft), sonst Monogramm
function mandantAvatar(m, gr = 32) {
  const z = portalZugaengeVon(m.id).find((x) => x.avatar_url);
  if (z) return html`<img class="m-avatar" style="--gr:${gr}px" src="${z.avatar_url}" alt="" loading="lazy">`;
  let h = 0;
  for (const c of String(m.id || m.name)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [bg, fg] = AVATAR_FARBEN[h % AVATAR_FARBEN.length];
  return html`<span class="m-avatar" style="--gr:${gr}px;background:${bg};color:${fg}" aria-hidden="true">${initialen(m.name)}</span>`;
}

function mandantPortalBadge(m) {
  const z = mandantZugang(m);
  if (!z) return html`<span class="portal-status kein">Kein Zugang</span>`;
  if (z.status === "wartet") return html`<span class="portal-status wartet">Antrag wartet</span>`;
  return html`<span class="portal-status aktiv" title="${z.zuletzt_aktiv ? `zuletzt im Portal ${fmt.datumZeit(z.zuletzt_aktiv)}` : "war noch nie im Portal"}">Aktiv${z.zuletzt_aktiv ? ` · ${fmt.relativ(z.zuletzt_aktiv)}` : ""}</span>`;
}

const MANDANT_FILTER = [["alle", "Alle"], ["rechnung", "Offene Rechnungen"], ["portal", "Portal aktiv"], ["markiert", "VIP / Markiert"]];

function mandantenZaehler() {
  return portalAntraege().length + offeneAnliegen().filter((x) => x.status === "offen").length
    + (typeof offeneNotrufe === "function" ? offeneNotrufe().length : 0);
}

// Kopf mit Umschalter „Mandantenkartei | Mandantenportal“
function mandantenKopf(reiter) {
  const n = mandantenZaehler();
  return html`<div class="page-head mandanten-kopf">
    <div><h1>Mandanten</h1><p class="muted">${reiter === "portal" ? "Portal-Zugänge, Anträge und Anliegen" : "Kartei aller Personen, die wir vertreten"}</p></div>
    <div class="mandanten-kopf-rechts">
      <nav class="seg-tabs gross" aria-label="Mandanten">
        <a class="seg-tab ${reiter === "kartei" ? "active" : ""}" href="#/mandanten" ${reiter === "kartei" ? new SafeHtml('aria-current="page"') : ""}>Mandantenkartei</a>
        <a class="seg-tab ${reiter === "portal" ? "active" : ""}" href="#/mandanten/portal" ${reiter === "portal" ? new SafeHtml('aria-current="page"') : ""}>Mandantenportal${n ? html`<span class="seg-n rot" title="wartende Anträge, offene Anliegen und Notrufe">${n}</span>` : ""}</a>
      </nav>
      ${reiter === "kartei" ? html`<button class="btn" data-action="mandant-neu">+ Neuer Mandant</button>` : ""}
    </div>
  </div>`;
}

function mandantenListe() {
  const f = ui.mandanten;
  const filter = f.filter || "alle";
  const offenVon = (m) => offeneRechnungSumme(state.rechnungen.filter((r) => r.mandant_id === m.id));
  const list = state.mandanten
    .filter((m) => filter !== "rechnung" || offenVon(m) > 0)
    .filter((m) => filter !== "portal" || portalZugaengeVon(m.id).some((z) => z.status === "frei" && z.person_status !== "gesperrt"))
    .filter((m) => filter !== "markiert" || (m.markierungen || []).length > 0)
    .filter((m) => matches(f.q, m.name, m.telefon, m.discord, m.adresse, m.notizen, m.markierungen))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  const zeilen = list.map((m) => {
    const akten = mandantAkten(m);
    const aktiv = akten.filter((a) => a.status !== "Geschlossen").length;
    return { m, akten, aktiv, offen: offenVon(m), haft: akten.some((a) => a.in_haft && a.status !== "Geschlossen") };
  });
  const kontakt = (m) => [
    m.telefon ? html`<span class="kontakt-zeile">${m.telefon}</span>` : "",
    m.discord ? html`<span class="kontakt-zeile muted">@${String(m.discord).replace(/^@/, "")}</span>` : "",
  ];
  const aktenText = (x) => x.akten.length ? html`<span class="tabular-nums">${x.aktiv} aktiv / ${x.akten.length} gesamt</span>` : html`<span class="muted">keine Akten</span>`;
  return html`
    ${mandantenKopf("kartei")}
    <div class="crm-filterleiste">
      <div class="search"><input type="search" id="mandanten-q" data-search data-input="mandanten-q" value="${f.q}" placeholder="Name, Telefon, Discord …" aria-label="Mandanten durchsuchen"></div>
      <div class="filter-chips" role="group" aria-label="Schnellfilter">
        ${MANDANT_FILTER.map(([k, l]) => html`<button type="button" class="filter-chip ${filter === k ? "active" : ""}" aria-pressed="${filter === k}" data-action="mandanten-filter" data-filter="${k}">${l}</button>`)}
      </div>
      <span class="list-count">${list.length} ${list.length === 1 ? "Mandant" : "Mandanten"}</span>
    </div>
    ${list.length ? html`
      <div class="card crm-karte">
        <table class="table crm-tabelle">
          <thead><tr><th>Mandant</th><th>Kontakt</th><th>Mandantenportal</th><th>Akten</th><th class="right">Offene Rechnungen</th></tr></thead>
          <tbody>${zeilen.map((x) => html`<tr class="clickable" data-action="goto" data-to="mandanten/${x.m.id}" data-live="mandanten:${x.m.id}">
            <td><div class="crm-person">${mandantAvatar(x.m)}<div class="crm-name"><a href="#/mandanten/${x.m.id}">${x.m.name}</a>
              <span class="badges">${markierungBadges(x.m)}${x.haft ? html`<span class="badge haft">In Haft</span>` : ""}</span></div></div></td>
            <td class="crm-kontakt">${kontakt(x.m)}</td>
            <td>${mandantPortalBadge(x.m)}</td>
            <td class="nowrap">${aktenText(x)}</td>
            <td class="right tabular-nums">${x.offen > 0 ? html`<span class="offen-betrag">${fmt.geld(x.offen)} offen</span>` : ""}</td>
          </tr>`)}</tbody>
        </table>
        <ul class="crm-karten">${zeilen.map((x) => html`<li><a class="crm-kachel" href="#/mandanten/${x.m.id}">
          ${mandantAvatar(x.m, 40)}
          <span class="crm-kachel-inhalt">
            <span class="crm-name"><strong>${x.m.name}</strong><span class="badges">${markierungBadges(x.m)}${x.haft ? html`<span class="badge haft">In Haft</span>` : ""}</span></span>
            ${x.m.telefon || x.m.discord ? html`<span class="crm-kontakt">${kontakt(x.m)}</span>` : ""}
            <span class="crm-kachel-fuss">${mandantPortalBadge(x.m)}<span class="small">${aktenText(x)}</span>${x.offen > 0 ? html`<span class="offen-betrag">${fmt.geld(x.offen)} offen</span>` : ""}</span>
          </span>
        </a></li>`)}</ul>
      </div>`
      : html`<div class="card empty-state"><h2>Keine Mandanten gefunden</h2>
        <p>${state.mandanten.length ? "Suche oder Filter ändern." : "Neue Mandanten entstehen auch automatisch beim Anlegen einer Akte."}</p></div>`}`;
}

VIEWS.mandanten = (route) => {
  if (ui.portalZugaenge === null) ladePortalZugaenge();
  const m = route.id && route.id !== "portal" ? byId("mandanten", route.id) : null;
  return html`
    <div class="page mandanten-seite">
      ${route.id === "portal" ? html`${mandantenKopf("portal")}${portalZugaengeSeite()}`
        : route.id ? m ? mandantDetail(m)
          : html`<a class="zurueck-link" href="#/mandanten">← Alle Mandanten</a><div class="card empty-state"><h2>Mandant nicht gefunden</h2><a class="btn" href="#/mandanten">Zur Kartei</a></div>`
        : mandantenListe()}
    </div>`;
};

// Pill mit Klick-zum-Kopieren
function kopierPill(label, wert, anzeige = wert) {
  return html`<button type="button" class="kontakt-pill" data-action="wert-kopieren" data-wert="${wert}" title="${label} kopieren"><span class="muted">${label}:</span> ${anzeige}</button>`;
}

function mandantDetail(m) {
  const akten = mandantAkten(m).sort((a, b) => (b.number || "").localeCompare(a.number || ""));
  const rechnungen = state.rechnungen.filter((r) => r.mandant_id === m.id).sort((a, b) => (b.nummer || "").localeCompare(a.nummer || ""));
  const offen = offeneRechnungSumme(rechnungen);
  const termine = state.termine.filter((t) => !t.erledigt && new Date(t.beginn) >= startOfDay() && akten.some((a) => a.id === t.akte_id))
    .sort((a, b) => new Date(a.beginn) - new Date(b.beginn));
  const ergebnisse = akten.filter((a) => a.ergebnis);
  const auftr = auftritte(m);
  const erste = akten.length ? akten.reduce((x, a) => (new Date(a.created_at) < new Date(x.created_at) ? a : x)) : null;
  const seit = erste ? erste.created_at : m.created_at;
  const fehlt = !m.telefon || !m.discord || !m.geburtsdatum || !m.adresse;

  return html`
    <a class="zurueck-link" href="#/mandanten">← Alle Mandanten</a>
    <header class="card dossier-kopf" data-live="mandanten:${m.id}">
      ${mandantAvatar(m, 48)}
      <div class="dossier-titel">
        <div class="dossier-name-zeile"><h1>${m.name}</h1><span class="badges">${markierungBadges(m)}</span></div>
        <div class="kontakt-leiste">
          ${m.discord ? kopierPill("Discord", String(m.discord).replace(/^@/, "")) : ""}
          ${m.telefon ? kopierPill("Telefon", m.telefon) : ""}
          ${m.geburtsdatum ? kopierPill("Geboren", m.geburtsdatum) : ""}
          ${m.adresse ? kopierPill("Adresse", m.adresse) : ""}
          ${seit ? html`<span class="kontakt-pill statisch"><span class="muted">Mandant seit</span> ${fmt.datum(seit)}</span>` : ""}
          ${fehlt ? html`<button type="button" class="link-btn small kontakt-ergaenzen" data-action="mandant-bearbeiten" data-id="${m.id}">+ Kontaktdaten ergänzen</button>` : ""}
        </div>
      </div>
      <div class="dossier-aktionen">
        <button class="btn" data-action="akte-neu" data-mandant="${m.name}">+ Neue Akte</button>
        ${darf("rechnungen") ? html`<button class="btn" data-action="rechnung-neu" data-mandant="${m.id}">+ Rechnung</button>` : ""}
        <button class="btn" data-action="mandant-bearbeiten" data-id="${m.id}">Bearbeiten</button>
      </div>
    </header>
    ${offen ? html`<div class="box warning dossier-hinweis"><strong>Offene Rechnungen: ${fmt.geld(offen)}</strong></div>` : ""}
    ${auftr.length ? html`<div class="box warning dossier-hinweis"><strong>Achtung – taucht auch in anderen Akten auf:</strong>
      <ul>${auftr.map((x) => html`<li>${x.rolle} in <a href="#/akten/${x.akte.id}">${x.akte.number} · ${x.akte.title}</a> (Mandant: ${mandantName(x.akte)})</li>`)}</ul></div>` : ""}

    <div class="dossier-raster">
      <div class="dossier-spalte">
        <section class="card">
          <div class="card-head"><h2>Akten</h2><span class="muted small">${akten.length} gesamt · ${akten.filter((a) => a.status !== "Geschlossen").length} aktiv</span></div>
          ${akten.length ? html`<div class="table-wrap"><table class="table">
            <thead><tr><th>Az.</th><th>Betreff</th><th>Status</th><th>Ergebnis</th><th>Zuständig</th></tr></thead>
            <tbody>${akten.map((a) => html`<tr class="clickable" data-action="goto" data-to="akten/${a.id}">
              <td class="nowrap"><a class="mono" href="#/akten/${a.id}">${a.number}</a></td>
              <td>${a.title} ${haftBadge(a)}</td>
              <td>${statusBadge(a.status)}</td>
              <td>${a.ergebnis || ""}</td>
              <td>${personName(a.zustaendig_id, a.lawyer || "")}</td></tr>`)}</tbody></table></div>`
            : html`<p class="empty">Noch keine Akten.</p>`}
        </section>
        ${termine.length ? html`<section class="card">
          <div class="card-head"><h2>Anstehende Termine</h2></div>
          <ul class="rows">${termine.map((t) => terminRow(t, { mandant: false, checkNurFrist: true }))}</ul>
        </section>` : ""}
        ${ergebnisse.length ? html`<section class="card">
          <div class="card-head"><h2>Frühere Ergebnisse</h2></div>
          <ul class="rows">${ergebnisse.map((a) => html`<li><div class="grow"><div class="title">${a.ergebnis}${a.ergebnis_datum ? html` <span class="muted small">(${fmt.datum(a.ergebnis_datum)})</span>` : ""}</div>
            <div class="meta">${akteChip(a, a.title)}${a.ergebnis_details ? ` – ${a.ergebnis_details}` : ""}</div></div></li>`)}</ul>
        </section>` : ""}
      </div>
      <div class="dossier-spalte">
        ${mandantPortalBlock(m)}
        <section class="card">
          <div class="card-head"><h2>Rechnungen</h2>${offen ? html`<span class="offen-betrag small">${fmt.geld(offen)} offen</span>` : ""}</div>
          ${rechnungen.length ? html`<ul class="rows dossier-rechnungen">${rechnungen.map((r) => {
            const a = byId("akten", r.akte_id);
            return html`<li data-live="rechnungen:${r.id}">
              <div class="grow">
                <div class="title"><span class="mono">${r.nummer}</span>${r.betreff ? html` · ${truncate(r.betreff, 40)}` : ""}</div>
                <div class="meta">${joinHtml([fmt.datum(r.datum), a ? akteChip(a, "") : null, rechnungStatusBadge(r)])}</div>
              </div>
              <div class="dossier-betrag tabular-nums ${r.status === "Offen" ? "offen-betrag" : ""}">${fmt.geld(r.summe)}</div>
              <div class="tools">
                <button class="icon-btn" data-action="rechnung-drucken" data-id="${r.id}" title="Drucken / PDF" aria-label="Rechnung drucken">⎙</button>
                ${r.status === "Offen" && darf("rechnungen") ? html`<button class="btn small gold" data-action="rechnung-bezahlt" data-id="${r.id}" title="Als bezahlt markieren">Bezahlt</button>` : ""}
                ${darf("rechnungen") ? html`<button class="icon-btn" data-action="rechnung-bearbeiten" data-id="${r.id}" title="Bearbeiten" aria-label="Rechnung bearbeiten">✎</button>` : ""}
              </div>
            </li>`;
          })}</ul>` : html`<p class="empty">Noch keine Rechnungen.</p>`}
        </section>
        ${m.notizen ? html`<section class="card">
          <div class="card-head"><h2>Notizen</h2><button class="link-btn small" data-action="mandant-bearbeiten" data-id="${m.id}">ändern</button></div>
          <p class="pre dossier-notiz">${m.notizen}</p>
        </section>` : ""}
      </div>
    </div>`;
}

INPUTS["mandanten-q"] = (el) => { ui.mandanten.q = el.value; scheduleRender(); };

Object.assign(ACTIONS, {
  "mandant-neu": () => openMandantForm(null),
  "mandant-bearbeiten": (d) => openMandantForm(byId("mandanten", d.id)),
  goto: (d) => go(d.to),
  "mandanten-filter": (d) => { ui.mandanten.filter = d.filter; render(); },
  "wert-kopieren": async (d) => { toast((await copyText(d.wert)) ? `„${d.wert}“ kopiert` : d.wert); },
});
