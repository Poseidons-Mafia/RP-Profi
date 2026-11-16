// =============================================================
//  Wiwang Law – Team, Profil, Nutzerverwaltung, Einstellungen
// =============================================================

function randomPassword() {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function adminFehler(error) {
  if (/function .* does not exist|Could not find the function/i.test(error.message || "")) {
    return new Error("Die Nutzerverwaltung ist in Supabase noch nicht eingerichtet (supabase-nutzerverwaltung.sql).");
  }
  return error;
}

async function ladeAdminUsers() {
  if (!state.isAdmin || ui.adminUsersLaedt) return;
  ui.adminUsersLaedt = true;
  const { data, error } = await db.rpc("admin_list_users");
  ui.adminUsersLaedt = false;
  ui.adminUsers = error ? [] : data;
  if (error) toast(errorText(adminFehler(error)), "error");
  scheduleRender();
}

function profilFields() {
  return [
    { name: "anzeigename", label: "Anzeigename", required: true, half: true, placeholder: "z. B. Günther Freitag" },
    { name: "titel", label: "Position / Titel", half: true, placeholder: "z. B. Chairman, Rechtsanwalt, Referendar" },
    { name: "telefon", label: "Telefon (ingame)", placeholder: "z. B. 555-0100" },
  ];
}

function openProfilForm(userId) {
  const p = profileOf(userId) || { user_id: userId };
  const eigenes = userId === state.me.id;
  openForm({
    title: eigenes ? "Mein Profil" : `Profil von ${personName(userId)}`,
    intro: eigenes ? "Dein Name erscheint im Verlauf, auf Rechnungen und unter Dokumenten (als Unterschrift)." : null,
    fields: profilFields(),
    values: p,
    onSubmit: async (v) => {
      if (profileOf(userId)) await updateRow("profiles", userId, v);
      else await insertRow("profiles", { user_id: userId, ...v });
      toast("Profil gespeichert");
    },
  });
}

function einstellungFields() {
  return [
    { name: "kanzlei", label: "Name der Kanzlei", required: true, half: true },
    { name: "ort", label: "Ort (für Briefe)", required: true, half: true },
    { name: "telefon", label: "Telefon der Kanzlei", half: true },
    { name: "waehrung", label: "Währungszeichen", required: true, third: true },
    { name: "haft_einheit", label: "Haft-Einheit", required: true, third: true, help: "z. B. HE, Monate, Minuten" },
    { name: "zahlungsziel_tage", label: "Zahlungsziel (Tage)", type: "number", required: true, third: true },
    { name: "rechnung_einleitung", label: "Rechnung: Einleitungstext", type: "textarea", rows: 3 },
    { name: "rechnung_hinweis", label: "Rechnung: Hinweis unter der Tabelle", type: "textarea", rows: 2 },
  ];
}

VIEWS.team = () => {
  if (state.isAdmin && ui.adminUsers === null) ladeAdminUsers();
  const logins = new Map((ui.adminUsers || []).map((u) => [u.id, u]));
  const st = state.settings;
  const mitglieder = team();

  return html`
    <div class="page">
      <div class="page-head">
        <div><h1>Team & Einstellungen</h1><p class="muted">${mitglieder.length} Mitglieder bei ${st.kanzlei}</p></div>
        <div class="actions-row">
          <button class="btn" data-action="profil-bearbeiten">Mein Profil</button>
          ${state.isAdmin ? html`<button class="btn primary" data-action="nutzer-neu">+ Mitglied anlegen</button>` : ""}
        </div>
      </div>

      <div class="card">
        <h2 style="margin-top:0">Mitglieder</h2>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Name</th><th>Position</th><th>Telefon</th><th>E-Mail (Login)</th><th class="num">Aktive Akten</th>${state.isAdmin ? html`<th>Zuletzt angemeldet</th><th></th>` : ""}</tr></thead>
          <tbody>${mitglieder.map((p) => {
            const u = logins.get(p.user_id);
            const akten = state.akten.filter((a) => a.zustaendig_id === p.user_id && a.status !== "Geschlossen").length;
            return html`<tr>
              <td><strong>${personName(p.user_id)}</strong>${p.user_id === state.me.id ? html` <span class="badge gold">Du</span>` : ""}${u && u.is_admin ? html` <span class="badge alert">Admin</span>` : ""}</td>
              <td>${p.titel || "–"}</td>
              <td>${p.telefon || "–"}</td>
              <td class="small">${p.email || "–"}</td>
              <td class="num">${akten}</td>
              ${state.isAdmin ? html`
                <td class="small">${u ? (u.last_sign_in_at ? fmt.relativ(u.last_sign_in_at) : "noch nie") : "…"}</td>
                <td class="row-actions">
                  <button class="btn small" data-action="profil-fremd" data-id="${p.user_id}">Profil</button>
                  <button class="btn small" data-action="nutzer-passwort" data-id="${p.user_id}">Passwort</button>
                  ${p.user_id !== state.me.id ? html`<button class="btn small danger" data-action="nutzer-loeschen" data-id="${p.user_id}">Löschen</button>` : ""}
                </td>` : ""}
            </tr>`;
          })}</tbody>
        </table></div>
        ${state.isAdmin ? "" : html`<p class="muted small">Neue Mitglieder legt der Admin an.</p>`}
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <div class="card-head"><h2>Kanzlei-Einstellungen</h2>
            ${state.isAdmin ? html`<button class="btn small" data-action="einstellungen-bearbeiten">Bearbeiten</button>` : ""}</div>
          <dl class="facts">
            <div><dt>Kanzlei</dt><dd>${st.kanzlei}</dd></div>
            <div><dt>Ort</dt><dd>${st.ort}</dd></div>
            <div><dt>Telefon</dt><dd>${st.telefon || "–"}</dd></div>
            <div><dt>Währung</dt><dd>${st.waehrung}</dd></div>
            <div><dt>Haft-Einheit</dt><dd>${st.haft_einheit}</dd></div>
            <div><dt>Zahlungsziel</dt><dd>${st.zahlungsziel_tage} Tage</dd></div>
          </dl>
          <p class="small muted" style="margin:0">Rechnungstext: „${truncate(st.rechnung_einleitung, 120)}“</p>
          ${state.isAdmin ? "" : html`<p class="muted small">Nur der Admin kann die Einstellungen ändern.</p>`}
        </div>
        <div class="card">
          <h2 style="margin-top:0">Daten sichern</h2>
          <p class="muted">Lädt alle Akten, Mandanten, Verläufe, Termine, Rechnungen und das Gesetzbuch als Datei herunter – zur Sicherheit oder zum Archivieren.</p>
          <button class="btn" data-action="export-alles">Komplettsicherung herunterladen</button>
          <h3 class="section-title" style="margin-top:22px">Tastenkürzel</h3>
          <p class="small" style="margin:0"><code>/</code> Suche · <code>N</code> neue Akte · <code>Esc</code> Dialog schließen</p>
        </div>
      </div>
    </div>`;
};

Object.assign(ACTIONS, {
  "profil-bearbeiten": () => openProfilForm(state.me.id),
  "profil-fremd": (d) => openProfilForm(d.id),
  "einstellungen-bearbeiten": () => openForm({
    title: "Kanzlei-Einstellungen",
    fields: einstellungFields(),
    values: state.settings,
    wide: true,
    onSubmit: async (v) => {
      await updateRow("einstellungen", 1, { daten: { ...((state.einstellungen[0] || {}).daten || {}), ...v } });
      toast("Einstellungen gespeichert");
    },
  }),
  "nutzer-neu": () => openForm({
    title: "Mitglied anlegen",
    intro: "Die E-Mail muss nicht echt sein (z. B. max@wiwang.de). Zugangsdaten danach an die Person weitergeben.",
    fields: [
      { name: "anzeigename", label: "Name", required: true, half: true, placeholder: "z. B. Max Power" },
      { name: "titel", label: "Position", half: true, placeholder: "z. B. Rechtsanwalt" },
      { name: "email", label: "E-Mail (Login)", type: "email", required: true, half: true },
      { name: "password", label: "Passwort", required: true, half: true, default: randomPassword(), help: "Mindestens 6 Zeichen – zufällig vorgeschlagen." },
    ],
    submitLabel: "Anlegen",
    onSubmit: async (v) => {
      const { data: id, error } = await db.rpc("admin_create_user", { p_email: v.email, p_password: v.password });
      if (error) throw adminFehler(error);
      // Profil wird von der Datenbank angelegt – Name & Titel ergänzen
      await new Promise((r) => setTimeout(r, 300));
      const { data: prof } = await db.from("profiles").select("*").eq("user_id", id).limit(1);
      if (prof && prof.length) upsertLocal("profiles", prof[0]);
      await attempt(() => (profileOf(id) ? updateRow("profiles", id, { anzeigename: v.anzeigename, titel: v.titel })
        : insertRow("profiles", { user_id: id, anzeigename: v.anzeigename, titel: v.titel })));
      ui.adminUsers = null;
      scheduleRender();
      alert(`Mitglied angelegt!\n\nLogin: ${v.email.trim().toLowerCase()}\nPasswort: ${v.password}\n\nBitte notieren und an ${v.anzeigename} weitergeben.`);
    },
  }),
  "nutzer-passwort": async (d) => {
    const name = personName(d.id);
    const pw = prompt(`Neues Passwort für ${name} (mind. 6 Zeichen):`, randomPassword());
    if (pw === null) return;
    const { error } = await db.rpc("admin_set_password", { p_user_id: d.id, p_password: pw });
    if (error) return toast(errorText(adminFehler(error)), "error");
    alert(`Neues Passwort für ${name}:\n\n${pw}\n\nBitte notieren und weitergeben.`);
  },
  "nutzer-loeschen": async (d) => {
    const name = personName(d.id);
    if (!confirm(`${name} wirklich löschen? Die Person kann sich danach nicht mehr anmelden. Akten und Einträge bleiben erhalten.`)) return;
    const { error } = await db.rpc("admin_delete_user", { p_user_id: d.id });
    if (error) return toast(errorText(adminFehler(error)), "error");
    removeLocal("profiles", d.id);
    ui.adminUsers = null;
    toast(`${name} gelöscht`);
    render();
  },
  "export-alles": () => {
    const backup = { app: "Wiwang Law Aktensystem", version: 2, exportiert_am: new Date().toISOString(), tabellen: {} };
    for (const t of TABLES) backup.tabellen[t] = state[t];
    backup.tabellen.protokoll = state.protokoll;
    downloadFile(`wiwang-law-sicherung-${ymd(new Date())}.json`, JSON.stringify(backup, null, 2), "application/json");
    toast("Sicherung heruntergeladen");
  },
});
