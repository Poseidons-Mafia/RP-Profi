// =============================================================
//  Wiwang Law – Mandantenportal aus Sicht der Kanzlei
//  • Portal-Zugänge freigeben, mit der Kartei verknüpfen, sperren
//    (Recht "Mandanten bearbeiten"; Seite #/mandanten/portal)
//  • Weitere Mandanten mit Einblick in eine Akte (Mitmandanten)
//  • Hilfen für "für Mandant sichtbar" in Verlauf und Beweisen
// =============================================================

ui.portalZugaenge = null; // Ergebnis von portal_zugaenge()

async function ladePortalZugaenge() {
  if (!state.loaded || !darf("mandanten_lesen") || ui.portalZugaengeLaedt) return;
  ui.portalZugaengeLaedt = true;
  const { data, error } = await db.rpc("portal_zugaenge");
  ui.portalZugaengeLaedt = false;
  if (error) { console.warn(error); ui.portalZugaenge = []; }
  else ui.portalZugaenge = data || [];
  scheduleRender();
}

const portalZugaenge = () => ui.portalZugaenge || [];
function portalAntraege() { return portalZugaenge().filter((z) => z.status === "wartet" && z.person_status !== "gesperrt"); }
function portalZugaengeVon(mandantId) { return portalZugaenge().filter((z) => z.mandant_id === mandantId && z.status !== "abgelehnt"); }
const findeZugang = (id) => portalZugaenge().find((z) => z.id === id);

// Neuer Antrag (Benachrichtigung) → Liste neu laden
{
  const vorher = LIVE_HOOKS.benachrichtigungen;
  LIVE_HOOKS.benachrichtigungen = (p) => {
    if (vorher) vorher(p);
    if (p.eventType === "INSERT" && p.new && state.me && p.new.user_id === state.me.id && p.new.link === "#/mandanten/portal") ladePortalZugaenge();
  };
}

// Absender in der Glocke: Mandanten-Nachrichten kommen "vom Portal"
function benachrichtigungAbsender(b) {
  if (b.von_nigel) return `Nigel (im Auftrag von ${personName(b.von, "–")})`;
  return b.art === "mandant" ? "Mandantenportal:" : personName(b.von, "System");
}

// Wer hat einen Verlaufseintrag geschrieben? (Mandanten-Nachrichten: Name aus der Kartei)
function eintragAutor(e) {
  if (e.mandant_id) {
    const m = byId("mandanten", e.mandant_id);
    return m ? m.name : "Mandant";
  }
  return e.von_nigel ? `Nigel (im Auftrag von ${personName(e.author)})` : personName(e.author);
}

// Akten, in die ein Mandant (zusätzlich) Einblick hat
function mitmandantenVon(akteId) { return state.akten_mandanten.filter((x) => x.akte_id === akteId); }
function einblickAkten(mandantId) { return state.akten_mandanten.filter((x) => x.mandant_id === mandantId); }

function zugangStatusBadge(z) {
  if (z.person_status === "gesperrt") return html`<span class="badge alert">Person gesperrt</span>`;
  return { wartet: html`<span class="badge gold">wartet</span>`, frei: html`<span class="badge ok">aktiv</span>`,
    abgelehnt: html`<span class="badge geschlossen">abgelehnt</span>`, gesperrt: html`<span class="badge alert">gesperrt</span>` }[z.status] || z.status;
}

function discordZeile(z) {
  return html`<span class="name-mit-avatar">${z.avatar_url ? html`<img src="${z.avatar_url}" alt="" class="discord-avatar klein">`
      : html`<span class="discord-avatar klein leer">${(z.discord_name || "?").slice(0, 1)}</span>`}
    <span>${z.discord_name || "–"}${z.discord_benutzer ? html`<div class="small muted">@${z.discord_benutzer}</div>` : ""}</span></span>`;
}

// ---------- Seite: Mandanten → Portal-Zugänge ----------
function portalZugaengeSeite() {
  if (ui.portalZugaenge === null) { ladePortalZugaenge(); return html`<div class="card"><p class="muted">Portal-Zugänge werden geladen …</p></div>`; }
  const offen = portalAntraege();
  const rest = portalZugaenge().filter((z) => !offen.includes(z));
  const mandant = (z) => z.mandant_id ? byId("mandanten", z.mandant_id) : null;
  return html`
    <a class="back-link" href="#/mandanten">← Alle Mandanten</a>
    ${anliegenKarte()}
    <div class="card">
      <div class="card-head"><h2>Portal-Anträge</h2><button class="btn small" data-action="portal-zugaenge-laden">Aktualisieren</button></div>
      <p class="small muted" style="margin-top:0">Mandanten registrieren sich mit Discord („Ich bin Mandant“). Beim Freigeben ordnest du sie einem
        Eintrag der Kartei zu – danach sehen sie im Mandantenportal ihre Akten, Termine (ohne Fristen/Wiedervorlagen), Rechnungen und alles,
        was ihr im Verlauf oder bei den Beweisen „für Mandant sichtbar“ macht. Interne Notizen, Aufgaben und den Sachverhalt sehen sie nie.</p>
      ${offen.length ? html`<div class="table-wrap"><table class="table">
        <thead><tr><th>Name</th><th>Discord</th><th>Hinweis</th><th>Beantragt</th><th></th></tr></thead>
        <tbody>${offen.map((z) => html`<tr>
          <td><strong>${z.name}</strong>${z.vorschlag && byId("mandanten", z.vorschlag) ? html`<div class="small muted">passt zu <a href="#/mandanten/${z.vorschlag}">${byId("mandanten", z.vorschlag).name}</a></div>` : html`<div class="small muted">nicht in der Kartei</div>`}</td>
          <td>${discordZeile(z)}</td>
          <td class="small">${z.notiz || "–"}</td>
          <td class="nowrap">${fmt.relativ(z.created_at)}</td>
          <td class="nowrap right">
            <button class="btn small primary" data-action="zugang-freigeben" data-id="${z.id}">Freigeben</button>
            <button class="btn small danger" data-action="zugang-aktion" data-aktion="ablehnen" data-id="${z.id}">Ablehnen</button></td>
        </tr>`)}</tbody></table></div>`
      : html`<p class="empty">Keine offenen Anträge.</p>`}
    </div>
    <div class="card">
      <div class="card-head"><h2>Alle Portal-Zugänge</h2><span class="muted small">${anzahl(rest.length, "Zugang", "Zugänge")}</span></div>
      ${rest.length ? html`<div class="table-wrap"><table class="table">
        <thead><tr><th>Name</th><th>Mandant (Kartei)</th><th>Discord</th><th>Status</th><th>Zuletzt im Portal</th><th></th></tr></thead>
        <tbody>${rest.map((z) => html`<tr>
          <td><strong>${z.name}</strong></td>
          <td>${mandant(z) ? html`<a href="#/mandanten/${z.mandant_id}">${mandant(z).name}</a>` : html`<span class="muted">–</span>`}</td>
          <td>${discordZeile(z)}</td>
          <td>${zugangStatusBadge(z)}</td>
          <td class="nowrap small">${z.zuletzt_aktiv ? fmt.relativ(z.zuletzt_aktiv) : "noch nie"}</td>
          <td class="nowrap right">${zugangAktionen(z)}</td>
        </tr>`)}</tbody></table></div>`
      : html`<p class="empty">Noch keine freigegebenen Zugänge.</p>`}
    </div>
    ${bewertungenKarte()}`;
}

function zugangAktionen(z) {
  if (z.person_status === "gesperrt") return "";
  return html`
    ${z.status === "frei" ? html`<button class="btn small" data-action="zugang-verknuepfen" data-id="${z.id}" title="Nur nötig, wenn der Zugang dem falschen Mandanten zugeordnet wurde">Anderem Mandanten zuordnen</button>
      <button class="btn small danger" data-action="zugang-aktion" data-aktion="sperren" data-id="${z.id}">Sperren</button>` : ""}
    ${z.status === "gesperrt" ? html`<button class="btn small" data-action="zugang-aktion" data-aktion="entsperren" data-id="${z.id}">Entsperren</button>` : ""}
    ${z.status === "abgelehnt" ? html`<button class="btn small" data-action="zugang-freigeben" data-id="${z.id}">Doch freigeben</button>` : ""}`;
}

// ---------- Block in der Mandanten-Detailansicht ----------
// Zeigt nur: Welches Discord-Konto kommt als DIESER Mandant ins Portal – und was sieht es?
function mandantPortalBlock(m) {
  if (ui.portalZugaenge === null) ladePortalZugaenge();
  // eigene Zugänge + offene Anträge, deren Name zu diesem Mandanten passt
  const zugaenge = [...portalZugaengeVon(m.id),
    ...portalAntraege().filter((z) => !z.mandant_id && z.vorschlag === m.id)];
  const einblick = einblickAkten(m.id);
  const zuletzt = (z) => z.zuletzt_aktiv ? `zuletzt im Portal ${fmt.relativ(z.zuletzt_aktiv)}` : "war noch nie im Portal";
  return html`
    <h3 class="section-title" style="margin-top:20px">Online-Zugang (Mandantenportal)</h3>
    <div class="portal-einblick">
      ${zugaenge.length ? html`
        <p class="small muted" style="margin-top:0">Mit diesem Discord-Konto meldet sich <strong>${m.name}</strong> im Mandantenportal an
          und sieht dort die eigenen Akten, Termine, Rechnungen und alles, was ihr „für Mandant sichtbar“ macht.</p>
        <ul class="rows">${zugaenge.map((z) => html`<li>
          <div class="grow">
            <div class="title">${discordZeile(z)}</div>
            <div class="meta">${zugangStatusBadge(z)} · ${z.status === "wartet" ? html`neuer Antrag als „${z.name}“ – wartet auf Freigabe` : zuletzt(z)}</div>
          </div>
          <div class="nowrap">${mandantZugangAktionen(z)}</div>
        </li>`)}</ul>
        ${zugaenge.some((z) => z.status === "frei" && z.person_status !== "gesperrt") ? html`<p class="small muted" style="margin-bottom:0">
          Falsches Discord-Konto? <button class="link-btn" data-action="zugang-verknuepfen" data-id="${zugaenge.find((z) => z.status === "frei").id}">Einem anderen Mandanten zuordnen</button></p>` : ""}`
      : html`<p class="small" style="margin-top:0"><strong>${m.name}</strong> hat noch keinen Online-Zugang.</p>
        <p class="small muted" style="margin-bottom:0">So geht's: Der Mandant registriert sich auf der Startseite mit Discord („Ich bin Mandant“).
          Der Antrag erscheint dann unter <a href="#/mandanten/portal">Mandantenportal → Anträge</a> und hier – einmal auf „Freigeben“ klicken, fertig.</p>`}
      ${einblick.length ? html`<div class="group-title" style="margin-top:12px">Sieht im Portal außerdem</div>
        <ul class="rows">${einblick.map((x) => {
          const a = byId("akten", x.akte_id);
          return a ? html`<li><div class="grow"><div class="title"><a href="#/akten/${a.id}/beteiligte">${a.number} · ${a.title}</a></div>
            <div class="meta">als ${x.rolle} · Mandant der Akte: ${mandantName(a)}</div></div></li>` : "";
        })}</ul>` : ""}
    </div>`;
}

function mandantZugangAktionen(z) {
  if (z.person_status === "gesperrt") return "";
  if (z.status === "wartet") return html`<button class="btn small primary" data-action="zugang-freigeben" data-id="${z.id}">Freigeben</button>
    <button class="btn small danger" data-action="zugang-aktion" data-aktion="ablehnen" data-id="${z.id}">Ablehnen</button>`;
  if (z.status === "frei") return html`<button class="btn small danger" data-action="zugang-aktion" data-aktion="sperren" data-id="${z.id}">Zugang sperren</button>`;
  if (z.status === "gesperrt") return html`<button class="btn small" data-action="zugang-aktion" data-aktion="entsperren" data-id="${z.id}">Entsperren</button>`;
  return "";
}

// ---------- Block in der Akte (Tab Beteiligte) ----------
function aktePortalBlock(a) {
  if (ui.portalZugaenge === null) ladePortalZugaenge();
  const haupt = a.mandant_id ? portalZugaengeVon(a.mandant_id).filter((z) => z.status === "frei") : [];
  const weitere = mitmandantenVon(a.id);
  const sichtbar = kinder("eintraege", a.id).filter((e) => e.fuer_mandant && !e.mandant_id).length
    + kinder("beweise", a.id).filter((b) => b.fuer_mandant).length;
  return html`
    <div class="group-title">Mandantenportal – wer sieht diese Akte?</div>
    <div class="portal-einblick">
      <p class="small" style="margin-top:0">
        ${a.mandant_id ? html`<strong>${mandantName(a)}</strong>: ${haupt.length ? html`<span class="badge ok">hat Portal-Zugang</span>` : html`<span class="muted">kein Portal-Zugang</span>`}`
          : html`<span class="muted">Die Akte ist mit keinem Kartei-Eintrag verknüpft.</span>`}
        · für den Mandanten freigegeben: ${anzahl(sichtbar, "Eintrag/Beweis", "Einträge/Beweise")}</p>
      ${weitere.length ? html`<ul class="rows">${weitere.map((x) => {
        const m = byId("mandanten", x.mandant_id);
        const zugang = portalZugaengeVon(x.mandant_id).some((z) => z.status === "frei");
        return html`<li><div class="grow"><div class="title">${m ? html`<a href="#/mandanten/${m.id}">${m.name}</a>` : "–"}
            <span class="badge gold">${x.rolle}</span> ${zugang ? html`<span class="badge ok">hat Portal-Zugang</span>` : ""}</div></div>
          <button class="icon-btn" title="Einblick entziehen" data-action="mitmandant-entfernen" data-id="${x.id}">✕</button></li>`;
      })}</ul>` : ""}
      <div class="actions-row"><button class="btn small" data-action="mitmandant-neu" data-akte="${a.id}">+ Weiteren Mandanten freischalten</button></div>
      <p class="small muted">Mitmandanten, Vertreter oder Firmen sehen die Akte im Portal genauso wie der Mandant – aber nicht seine Rechnungen.</p>
    </div>`;
}

// ---------- Dialoge ----------
function mandantOptionen() {
  return [...state.mandanten].sort((x, y) => x.name.localeCompare(y.name, "de")).map((m) => ({ value: m.id, label: m.name + (m.telefon ? ` (${m.telefon})` : "") }));
}

async function zugangRpc(args, ok) {
  const { error } = await db.rpc("mandant_zugang", args);
  if (error) throw error;
  toast(ok);
  if (state.isAdmin) ui.konten = null; // Accounts-Übersicht neu laden
  await ladePortalZugaenge();
  await neuLaden(["mandanten"]);
}

Object.assign(ACTIONS, {
  "portal-zugaenge-laden": () => { ui.portalZugaenge = null; render(); },
  "zugang-freigeben": async (d) => {
    if (!findeZugang(d.id)) await ladePortalZugaenge();
    const z = findeZugang(d.id);
    if (!z) return;
    openForm({
      title: `${z.name} freigeben`,
      intro: html`Discord: <strong>${z.discord_name || "–"}</strong>${z.discord_benutzer ? ` (@${z.discord_benutzer})` : ""}
        ${z.notiz ? html`<br>Hinweis: „${z.notiz}“` : ""}<br>Welchem Mandanten der Kartei gehört dieser Zugang? Er sieht danach alle Akten dieses Mandanten.`,
      fields: [{ name: "mandant", label: "Mandant (Kartei)", type: "select", emptyLabel: `— neu anlegen: „${z.name}“ —`,
        options: mandantOptionen }],
      values: { mandant: z.mandant_id || z.vorschlag || "" },
      submitLabel: "Freigeben",
      onSubmit: (v) => zugangRpc({ p_charakter: z.id, p_aktion: "freigeben", p_mandant: v.mandant || null }, `${z.name} ist freigeschaltet`),
    });
  },
  "zugang-verknuepfen": async (d) => {
    if (!findeZugang(d.id)) await ladePortalZugaenge();
    const z = findeZugang(d.id);
    if (!z) return;
    const bisher = z.mandant_id && byId("mandanten", z.mandant_id);
    openForm({
      title: "Zugang einem anderen Mandanten zuordnen",
      intro: html`Discord-Konto <strong>${z.discord_name || z.name}</strong>${z.discord_benutzer ? ` (@${z.discord_benutzer})` : ""}
        gehört im Moment zu <strong>${bisher ? bisher.name : "keinem Mandanten"}</strong>.<br>
        Nur ändern, wenn der Zugang versehentlich der falschen Person zugeordnet wurde – danach sieht dieses Konto
        die Akten und Rechnungen des neu gewählten Mandanten${bisher ? html` und <strong>nicht mehr</strong> die von ${bisher.name}` : ""}.`,
      fields: [{ name: "mandant", label: "Gehört stattdessen zu", type: "select", required: true, empty: true, emptyLabel: "— Mandant wählen —",
        options: () => mandantOptionen().filter((o) => o.value !== z.mandant_id) }],
      values: { mandant: "" },
      submitLabel: "Neu zuordnen",
      onSubmit: (v) => zugangRpc({ p_charakter: z.id, p_aktion: "verknuepfen", p_mandant: v.mandant }, `Zugang gehört jetzt zu ${byId("mandanten", v.mandant)?.name || "dem Mandanten"}`),
    });
  },
  "zugang-aktion": async (d) => {
    const z = findeZugang(d.id);
    if (!z) return;
    const texte = { ablehnen: ["ablehnen", "abgelehnt"], sperren: ["sperren (kein Zugriff mehr aufs Portal)", "gesperrt"], entsperren: ["wieder freischalten", "freigeschaltet"] };
    const [frage, fertig] = texte[d.aktion] || [d.aktion, "erledigt"];
    if (!confirm(`Portal-Zugang von ${z.name} ${frage}?`)) return;
    await attempt(() => zugangRpc({ p_charakter: z.id, p_aktion: d.aktion }, `${z.name} ${fertig}`));
  },
  "mitmandant-neu": (d) => {
    const a = byId("akten", d.akte);
    const vergeben = new Set([a.mandant_id, ...mitmandantenVon(a.id).map((x) => x.mandant_id)]);
    openForm({
      title: "Weiteren Mandanten freischalten",
      intro: html`Dieser Mandant sieht <strong>${a.number}</strong> im Mandantenportal (Eckdaten, Termine, freigegebene Einträge und Beweise).`,
      fields: [
        { name: "mandant_id", label: "Mandant (Kartei)", type: "select", required: true,
          options: () => mandantOptionen().filter((o) => !vergeben.has(o.value)) },
        { name: "rolle", label: "Rolle", required: true, list: ["Mitmandant", "Vertreter", "Angehöriger", "Firma", "Bevollmächtigter"] },
      ],
      values: { rolle: "Mitmandant" },
      submitLabel: "Freischalten",
      onSubmit: async (v) => {
        await insertRow("akten_mandanten", { akte_id: a.id, mandant_id: v.mandant_id, rolle: v.rolle });
        toast(`${byId("mandanten", v.mandant_id).name} hat jetzt Einblick`);
      },
    });
  },
  "mitmandant-entfernen": async (d) => {
    const x = state.akten_mandanten.find((r) => r.id === d.id);
    const m = x && byId("mandanten", x.mandant_id);
    if (!x || !confirm(`${m ? m.name : "Diesem Mandanten"} den Einblick in die Akte entziehen?`)) return;
    await attempt(() => deleteRow("akten_mandanten", x.id), "Einblick entzogen");
  },
  "eintrag-fuer-mandant": async (d) => {
    const e = byId("eintraege", d.id);
    if (!e) return;
    if (!e.fuer_mandant && !confirm("Diesen Eintrag für den Mandanten im Portal sichtbar machen? Er wird benachrichtigt.")) return;
    await attempt(() => updateRow("eintraege", e.id, { fuer_mandant: !e.fuer_mandant }),
      e.fuer_mandant ? "Für den Mandanten wieder verborgen" : "Für den Mandanten sichtbar");
  },
});

// =============================================================
//  Mandantenportal 2.0 (Update 20): Anliegen, Bewertungen
//  • Anliegen aus dem Portal: Notruf, neues Mandat, Rückrufbitte –
//    annehmen, erledigen, antworten (der Mandant wird benachrichtigt)
//  • Bewertungen abgeschlossener Akten (1–5 Sterne)
// =============================================================
const ANLIEGEN_ART = {
  notruf: { label: "🚨 Notruf", kurz: "Notruf" },
  mandat: { label: "Neue Angelegenheit", kurz: "Neues Mandat" },
  rueckruf: { label: "Rückrufbitte", kurz: "Rückruf" },
};
const ANLIEGEN_STATUS = { offen: "offen", angenommen: "in Bearbeitung", erledigt: "erledigt" };

const portalAnliegen = () => state.portal_anliegen || [];
const offeneAnliegen = () => portalAnliegen().filter((x) => x.status !== "erledigt");
const offeneNotrufe = () => portalAnliegen().filter((x) => x.art === "notruf" && x.status === "offen");

function anliegenVon(x) {
  const m = x.mandant_id && byId("mandanten", x.mandant_id);
  if (m) return html`<a href="#/mandanten/${m.id}">${m.name}</a>`;
  const z = findeZugang(x.charakter_id);
  return z ? z.name : "Mandant";
}
const anliegenVonText = (x) => (x.mandant_id && byId("mandanten", x.mandant_id)?.name) || findeZugang(x.charakter_id)?.name || "";

function anliegenStatusBadge(x) {
  const k = { offen: x.art === "notruf" ? "alert" : "offen", angenommen: "gold", erledigt: "ok" }[x.status] || "";
  return html`<span class="badge ${k}">${ANLIEGEN_STATUS[x.status] || x.status}</span>`;
}

function anliegenZeile(x) {
  const a = x.akte_id && byId("akten", x.akte_id);
  const darfBearbeiten = darf("mandanten_schreiben") || darf("akten_schreiben");
  return html`<li class="anliegen-zeile ${x.art === "notruf" && x.status !== "erledigt" ? "notruf" : ""}">
    <div class="grow">
      <div class="title"><span class="badge ${x.art === "notruf" ? "alert" : "gold"}">${ANLIEGEN_ART[x.art]?.kurz || x.art}</span>
        ${anliegenVon(x)} ${anliegenStatusBadge(x)}</div>
      <div class="pre">${x.text}</div>
      <div class="meta">${joinHtml([fmt.relativ(x.created_at),
        x.erreichbar ? html`erreichbar: <strong>${x.erreichbar}</strong>` : "",
        a ? html`<a href="#/akten/${a.id}">${a.number}</a>` : "",
        x.bearbeiter ? html`${x.status === "erledigt" ? "erledigt" : "übernommen"} von ${x.bearbeiter === state.me.id ? html`<strong>dir</strong>` : personName(x.bearbeiter)}` : ""].filter(Boolean))}</div>
      ${x.antwort ? html`<div class="small anliegen-antwort"><strong>Antwort:</strong> ${x.antwort}</div>` : ""}
    </div>
    ${darfBearbeiten ? html`<div class="nowrap anliegen-tools">
      ${x.status === "offen" ? html`<button class="btn small primary" data-action="anliegen-status" data-id="${x.id}" data-status="angenommen">Übernehmen</button>` : ""}
      ${x.status !== "erledigt" ? html`<button class="btn small" data-action="anliegen-antworten" data-id="${x.id}" data-status="erledigt">Erledigt …</button>` : ""}
      ${x.status !== "erledigt" ? html`<button class="btn small ghost" data-action="anliegen-antworten" data-id="${x.id}">Antworten</button>` : ""}
      ${x.art === "mandat" && x.status !== "erledigt" && darf("akten_schreiben") ? html`<button class="btn small" data-action="akte-neu" data-mandant="${anliegenVonText(x)}">Akte anlegen</button>` : ""}
      ${x.status === "erledigt" ? html`<button class="btn small ghost" data-action="anliegen-status" data-id="${x.id}" data-status="offen">Wieder öffnen</button>` : ""}
    </div>` : ""}
  </li>`;
}

function anliegenKarte() {
  const offen = offeneAnliegen().sort((x, y) => (y.art === "notruf") - (x.art === "notruf") || new Date(y.created_at) - new Date(x.created_at));
  const erledigt = portalAnliegen().filter((x) => x.status === "erledigt").slice(0, 20);
  return html`<div class="card">
    <div class="card-head"><h2>Anliegen aus dem Portal</h2><span class="muted small">${anzahl(offen.length, "offenes", "offene")}</span></div>
    <p class="small muted" style="margin-top:0">Notrufe („Ich wurde festgenommen“), Anfragen für neue Angelegenheiten und Rückrufbitten.
      Übernimm ein Anliegen, damit die anderen wissen, dass sich jemand kümmert – der Mandant sieht den Stand und deine Antwort im Portal.</p>
    ${offen.length ? html`<ul class="rows">${offen.map(anliegenZeile)}</ul>` : html`<p class="empty">Keine offenen Anliegen.</p>`}
    ${erledigt.length ? html`<details class="portal-vergangen"><summary class="small muted">${anzahl(erledigt.length, "erledigtes Anliegen", "erledigte Anliegen")}</summary>
      <ul class="rows">${erledigt.map(anliegenZeile)}</ul></details>` : ""}
  </div>`;
}

const sterne = (n) => html`<span class="sterne" title="${n} von 5 Sternen" aria-label="${n} von 5 Sternen">${"★".repeat(n)}<span class="leer">${"★".repeat(5 - n)}</span></span>`;

function bewertungenKarte() {
  const list = state.portal_bewertungen || [];
  if (!list.length) return "";
  const schnitt = list.reduce((s, b) => s + b.sterne, 0) / list.length;
  return html`<div class="card">
    <div class="card-head"><h2>Bewertungen</h2><span class="small">Ø <strong>${fmt.zahl(Math.round(schnitt * 10) / 10)}</strong> ${sterne(Math.round(schnitt))} · ${anzahl(list.length, "Bewertung", "Bewertungen")}</span></div>
    <ul class="rows">${list.slice(0, 15).map((b) => {
      const a = byId("akten", b.akte_id);
      const m = byId("mandanten", b.mandant_id);
      return html`<li><div class="grow">
        <div class="title">${sterne(b.sterne)} ${m ? html`<a href="#/mandanten/${m.id}">${m.name}</a>` : ""}</div>
        ${b.text ? html`<div class="pre">„${b.text}“</div>` : ""}
        <div class="meta">${joinHtml([a ? html`<a href="#/akten/${a.id}">${a.number}</a>` : "", a ? html`Zuständig: ${personName(a.zustaendig_id, "–")}` : "", fmt.relativ(b.updated_at)].filter(Boolean))}</div>
      </div></li>`;
    })}</ul>
  </div>`;
}

// Notruf-Alarm ganz oben auf der Übersicht
function notrufBanner() {
  const n = offeneNotrufe();
  if (!n.length) return "";
  return html`<div class="box notruf-banner">
    <strong>🚨 ${n.length === 1 ? "Offener Notruf" : `${n.length} offene Notrufe`} aus dem Mandantenportal</strong>
    <ul>${n.map((x) => html`<li><strong>${anliegenVonText(x) || "Mandant"}</strong>${x.erreichbar ? html` – ${x.erreichbar}` : ""} · ${fmt.relativ(x.created_at)}: ${truncate(x.text, 120)}</li>`)}</ul>
    <div class="actions-row"><a class="btn small primary" href="#/mandanten/portal">Ansehen und übernehmen</a></div>
  </div>`;
}

async function anliegenRpc(id, status, antwort, ok) {
  const { error } = await db.rpc("portal_anliegen_bearbeiten", { p_id: id, p_status: status, p_antwort: antwort || null });
  if (error) throw error;
  toast(ok);
  await neuLaden(["portal_anliegen"]);
}

Object.assign(ACTIONS, {
  "anliegen-status": (d) => attempt(() => anliegenRpc(d.id, d.status, null,
    d.status === "angenommen" ? "Übernommen – der Mandant weiß Bescheid" : d.status === "offen" ? "Wieder offen" : "Erledigt")),
  "anliegen-antworten": (d) => {
    const x = portalAnliegen().find((r) => r.id === d.id);
    if (!x) return;
    const erledigen = d.status === "erledigt";
    openForm({
      title: erledigen ? "Anliegen erledigen" : "Dem Mandanten antworten",
      intro: html`<strong>${ANLIEGEN_ART[x.art]?.label || x.art}</strong> von ${anliegenVonText(x) || "Mandant"}: „${truncate(x.text, 200)}“`,
      fields: [{ name: "antwort", label: erledigen ? "Antwort an den Mandanten (optional)" : "Antwort an den Mandanten", type: "textarea", rows: 4,
        required: !erledigen, placeholder: "Erscheint im Portal, der Mandant wird benachrichtigt." }],
      values: { antwort: "" },
      submitLabel: erledigen ? "Erledigt" : "Antwort senden",
      onSubmit: (v) => anliegenRpc(x.id, erledigen ? "erledigt" : x.status === "offen" ? "angenommen" : x.status, v.antwort,
        erledigen ? "Anliegen erledigt" : "Antwort gesendet"),
    });
  },
});

// Neues Anliegen (Benachrichtigung) → sofort neu laden, auch wenn die Live-Verbindung hakt
{
  const vorher = LIVE_HOOKS.benachrichtigungen;
  LIVE_HOOKS.benachrichtigungen = (p) => {
    if (vorher) vorher(p);
    if (p.eventType === "INSERT" && p.new && state.me && p.new.user_id === state.me.id && p.new.art === "mandant") neuLaden(["portal_anliegen", "portal_bewertungen"]);
  };
}
