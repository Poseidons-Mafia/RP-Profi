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
    </div>`;
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
