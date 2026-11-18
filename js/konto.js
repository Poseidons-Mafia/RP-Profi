// =============================================================
//  Wiwang Law – Konto: Discord-Anmeldung, Registrierung,
//  Charaktere beantragen/übernehmen und zwischen ihnen wechseln
//
//  Eine PERSON meldet sich mit Discord an. Jeder CHARAKTER ist ein
//  eigenes Konto mit Profil, Rang und Rechten. Beim Wechsel gibt die
//  Datenbank (charakter_zugang) einen Einmal-Zugang für den Charakter
//  aus, mit dem sich der Browser sofort anmeldet.
// =============================================================

const DISCORD_SCOPES = "guilds"; // zusätzlich zu "identify email": Server-Liste für die Mitgliedsprüfung
ui.konto = { fehler: null, reg: "mitarbeiter" };

function istDiscordSitzung(session) {
  const u = session && session.user;
  if (!u) return false;
  const am = u.app_metadata || {};
  return am.provider === "discord" || (am.providers || []).includes("discord")
    || (u.identities || []).some((i) => i.provider === "discord");
}

// Fehlertext aus einer Edge-Function-Antwort holen
async function funktionsFehler(error) {
  try {
    const j = await error.context.json();
    if (j && j.fehler) return j.fehler;
  } catch {}
  return errorText(error);
}

// Welche Art Konto ist angemeldet? Direkt nach der Discord-Anmeldung wird
// zuerst die Server-Mitgliedschaft geprüft. Ergebnis null = Datenbank noch ohne Update 11.
async function kontoPruefen(session) {
  ui.konto.fehler = null;
  if (istDiscordSitzung(session)) {
    if (session.provider_token) {
      const { error } = await db.functions.invoke("discord-pruefung", { body: { provider_token: session.provider_token } });
      if (error) ui.konto.fehler = await funktionsFehler(error);
    }
  }
  return kontoLaden();
}

async function kontoLaden() {
  const { data, error } = await db.rpc("mein_konto");
  if (error) {
    if (/PGRST202|Could not find the function|does not exist/i.test(`${error.code} ${error.message}`)) return null;
    throw error;
  }
  state.konto = data;
  return data;
}

const kontoPerson = () => (state.konto && state.konto.person) || null;
const kontoCharaktere = () => (state.konto && state.konto.charaktere) || [];
const spielbar = (c) => c.status === "frei" && c.profil_status !== "Ausgeschieden";
// Mitarbeiter-Charaktere nur für Mitglieder des Discord-Servers, Mandanten-Zugänge immer
const erreichbar = (c, p) => spielbar(c) && (c.art === "mandant" || !!(p && p.server_mitglied));

// ---------- Anmelden mit Discord ----------
async function discordAnmelden() {
  const { error } = await db.auth.signInWithOAuth({
    provider: "discord",
    options: { scopes: DISCORD_SCOPES, redirectTo: location.origin + location.pathname },
  });
  if (error) toast(errorText(error), "error");
}

// Fehler, mit dem Discord/Supabase zurückleitet (z. B. abgebrochen), auf dem Login anzeigen
function anmeldeFehlerAusAdresse() {
  const q = new URLSearchParams(location.search);
  const h = new URLSearchParams(location.hash.replace(/^#/, ""));
  const text = q.get("error_description") || h.get("error_description");
  if (!text) return;
  const errorEl = $("login-error");
  errorEl.textContent = /discord/i.test(text) || /sign ?ups?/i.test(text)
    ? `Anmeldung mit Discord nicht möglich: ${text}` : `Anmeldung fehlgeschlagen: ${text}`;
  errorEl.hidden = false;
  history.replaceState(null, "", location.pathname + "#/");
}

// ---------- Charakter wechseln ----------
async function charakterWechseln(charakterId) {
  const { data, error } = await db.rpc("charakter_zugang", { p_charakter: charakterId });
  if (error) throw error;
  ui.charakterWechsel = true;
  closeDialogs();
  stopLive();
  showScreen("loading");
  $("loading-text").textContent = "Charakter wird gewechselt …";
  try {
    // bisherige Sitzung beenden (nur dieses Gerät), dann als Charakter anmelden
    await db.auth.signOut({ scope: "local" }).catch(() => {});
    const { error: e2 } = await db.auth.signInWithPassword({ email: data.email, password: data.passwort });
    if (e2) throw e2;
    await db.rpc("zugang_abschliessen");
  } catch (e) {
    ui.charakterWechsel = false;
    console.error(e);
    toast("Wechsel fehlgeschlagen: " + errorText(e), "error");
    const { data: s } = await db.auth.getSession();
    if (!s.session) showScreen("login");
    else onSession(s.session);
    return false;
  }
  // Frisch laden, damit nichts vom vorigen Charakter im Speicher bleibt
  location.hash = "#/";
  location.reload();
  return true;
}

// Nach der Anmeldung als Person: direkt in den zuletzt gespielten Charakter
async function automatischWechseln(konto) {
  const p = konto.person;
  if (!p || p.status !== "frei") return false;
  if (sessionStorage.getItem("wiwang-auswahl")) { sessionStorage.removeItem("wiwang-auswahl"); return false; }
  const liste = konto.charaktere.filter((c) => erreichbar(c, p));
  const zuletzt = liste.filter((c) => c.zuletzt_aktiv).sort((a, b) => new Date(b.zuletzt_aktiv) - new Date(a.zuletzt_aktiv))[0];
  const ziel = zuletzt || (liste.length === 1 ? liste[0] : null);
  if (!ziel) return false;
  try {
    return await charakterWechseln(ziel.id);
  } catch (e) {
    toast(errorText(e), "error");
    return false;
  }
}

// ---------- Bausteine ----------
function charakterStatusBadge(c) {
  if (c.status === "wartet") return html`<span class="badge gold">wartet auf Freigabe</span>`;
  if (c.status === "abgelehnt") return html`<span class="badge geschlossen">abgelehnt</span>`;
  if (c.status === "gesperrt") return html`<span class="badge geschlossen">gesperrt</span>`;
  if (c.profil_status === "Ausgeschieden") return html`<span class="badge geschlossen">ausgeschieden</span>`;
  if (c.aktiv) return html`<span class="badge ok">aktiv</span>`;
  return "";
}

function discordKopf(p) {
  return html`<div class="discord-kopf">
    ${p.avatar_url ? html`<img src="${p.avatar_url}" alt="" class="discord-avatar">` : html`<span class="discord-avatar leer">${(p.discord_name || "?").slice(0, 1)}</span>`}
    <div><strong>${p.discord_name || "Discord-Konto"}</strong>
      ${p.discord_benutzer ? html`<div class="small muted">@${p.discord_benutzer}</div>` : ""}</div>
  </div>`;
}

function charakterListe(liste, { wechseln = true } = {}) {
  const p = kontoPerson();
  return html`<div class="charakter-liste">${liste.map((c) => {
    const klickbar = wechseln && erreichbar(c, p) && !c.aktiv;
    return html`<div class="charakter-zeile ${klickbar ? "klickbar" : ""}" ${klickbar ? html`data-action="charakter-wechseln" data-id="${c.id}" role="button" tabindex="0"` : ""}>
      <span class="charakter-initiale ${c.art === "mandant" ? "mandant" : ""}">${initialen(c.name)}</span>
      <span class="charakter-text"><strong>${c.name}</strong>
        <span class="small muted">${c.rang || (c.status === "frei" ? "noch kein Rang" : "")}</span></span>
      ${charakterStatusBadge(c)}
      ${klickbar ? html`<span class="charakter-los">${c.art === "mandant" ? "Portal →" : "Spielen →"}</span>` : ""}
      ${c.status === "wartet" ? html`<button type="button" class="btn small ruhig" data-action="antrag-zurueckziehen" data-id="${c.id}" title="Antrag zurückziehen">✕</button>` : ""}
    </div>`;
  })}</div>`;
}

// ---------- Bildschirm für Personen (ohne aktiven Charakter) ----------
function kontoBildschirm() {
  const k = state.konto || { art: "unbekannt" };
  const p = k.person;
  const abmelden = html`<button type="button" class="btn ruhig" data-action="logout">Abmelden</button>`;
  const fehler = ui.konto.fehler ? html`<p class="error">${ui.konto.fehler}</p>` : "";
  let inhalt;

  if (k.art === "neu") {
    inhalt = html`<h2>Discord-Prüfung fehlgeschlagen</h2>
      <p>Wir konnten nicht prüfen, ob du Mitglied unseres Discord-Servers bist.</p>${fehler}
      <div class="actions-row"><button type="button" class="btn primary" data-action="discord-login">Erneut mit Discord anmelden</button>${abmelden}</div>`;
  } else if (k.art !== "person" || !p) {
    inhalt = html`<h2>Kein Zugang</h2>
      <p>Dieses Konto gehört zu keinem Mitglied der Kanzlei. Bitte melde dich mit Discord an.</p>
      <div class="actions-row">${abmelden}</div>`;
  } else if (p.status === "abgelehnt" || p.status === "gesperrt") {
    inhalt = html`${discordKopf(p)}<h2>${p.status === "gesperrt" ? "Zugang gesperrt" : "Registrierung abgelehnt"}</h2>
      <p>Bitte wende dich an die Kanzleileitung.</p><div class="actions-row">${abmelden}</div>`;
  } else if (!k.charaktere.length) {
    const mandant = ui.konto.reg === "mandant";
    inhalt = html`${discordKopf(p)}<h2>Registrieren</h2>${fehler}
      <div class="reg-wahl" role="tablist">
        <button type="button" role="tab" class="${mandant ? "" : "aktiv"}" aria-selected="${mandant ? "false" : "true"}" data-action="reg-art" data-art="mitarbeiter">
          <strong>Ich arbeite bei ${state.settings.kanzlei || "Wiwang Law"}</strong><span>Mitarbeiter-Zugang zum Aktensystem</span></button>
        <button type="button" role="tab" class="${mandant ? "aktiv" : ""}" aria-selected="${mandant ? "true" : "false"}" data-action="reg-art" data-art="mandant">
          <strong>Ich bin Mandant</strong><span>Einblick in meine Akten, Termine und Rechnungen</span></button>
      </div>
      ${mandant ? html`
        <p>Lege deinen RP-Charakter an. Die Kanzlei ordnet ihn deiner Mandantenakte zu und schaltet dich frei.</p>
        <form data-submit="registrieren" class="form">
          <input type="hidden" name="art" value="mandant">
          <label class="field">Name deines Charakters
            <input name="name" required minlength="3" maxlength="60" placeholder="so wie bei uns in der Akte" autocomplete="off"></label>
          <label class="field">Hinweis für die Kanzlei <span class="small muted">(optional)</span>
            <textarea name="notiz" rows="2" maxlength="500" placeholder="z. B. Aktenzeichen, Name deines Anwalts, Telefonnummer"></textarea></label>
          <button class="btn primary full" type="submit">Zugang beantragen</button>
        </form>
        <div class="actions-row">${abmelden}</div>`
      : !p.server_mitglied ? html`
        <div class="box warning">Mitarbeiter müssen Mitglied des Wiwang-Discord-Servers sein. Tritt dem Server bei und prüfe danach erneut.</div>
        <div class="actions-row"><button type="button" class="btn primary" data-action="discord-login">Erneut prüfen</button>${abmelden}</div>`
      : html`
        <p>Lege deinen RP-Charakter an. Ein Admin von Wiwang Law gibt die Registrierung danach frei.</p>
        <form data-submit="registrieren" class="form">
          <input type="hidden" name="art" value="mitarbeiter">
          <label class="field">Name deines Charakters
            <input name="name" required minlength="3" maxlength="60" placeholder="z. B. Max Power" autocomplete="off"></label>
          <button class="btn primary full" type="submit">Registrierung absenden</button>
        </form>
        <div class="konto-trenner"><span>schon Mitglied?</span></div>
        <p class="small muted">Du hast bisher eigene Zugangsdaten (E-Mail und Passwort)? Dann übernimm deinen Charakter – er ist sofort freigeschaltet.</p>
        <div class="actions-row"><button type="button" class="btn" data-action="charakter-uebernehmen">Bestehenden Charakter übernehmen</button>${abmelden}</div>`}`;
  } else if (p.status === "wartet") {
    const nurMandant = k.charaktere.every((c) => c.art === "mandant");
    inhalt = html`${discordKopf(p)}<h2>Warte auf Freigabe</h2>
      <p>${nurMandant
        ? "Dein Antrag ist eingegangen. Sobald die Kanzlei dich deiner Mandantenakte zugeordnet hat, kannst du das Mandantenportal öffnen."
        : "Deine Registrierung ist eingegangen. Sobald ein Admin sie freigibt, kannst du loslegen."}</p>
      ${charakterListe(k.charaktere, { wechseln: false })}
      <div class="actions-row">
        <button type="button" class="btn primary" data-action="konto-neu-laden">Status prüfen</button>
        ${p.server_mitglied && !nurMandant ? html`<button type="button" class="btn" data-action="charakter-uebernehmen">Bestehenden Charakter übernehmen</button>` : ""}
        ${abmelden}</div>`;
  } else {
    const liste = k.charaktere;
    const mitarbeiter = liste.some((c) => c.art !== "mandant");
    inhalt = html`${discordKopf(p)}<h2>Charakter wählen</h2>${fehler}
      ${!p.server_mitglied && mitarbeiter ? html`<div class="box warning">Du bist nicht (mehr) auf dem Wiwang-Discord-Server.
        Mitarbeiter-Charaktere sind erst wieder erreichbar, wenn du beitrittst und dich erneut anmeldest.</div>` : ""}
      ${liste.some((c) => erreichbar(c, p)) ? "" : html`<p class="muted">Noch kein freigegebener Charakter.</p>`}
      ${charakterListe(liste)}
      <div class="actions-row">
        <button type="button" class="btn" data-action="charakter-beantragen">+ Neuer Charakter</button>
        ${p.server_mitglied ? html`<button type="button" class="btn" data-action="charakter-uebernehmen">Bestehenden übernehmen</button>` : ""}
        ${!p.server_mitglied ? html`<button type="button" class="btn" data-action="discord-login">Erneut prüfen</button>` : ""}
        <button type="button" class="btn" data-action="person-passwort">Passwort</button>
        ${abmelden}</div>`;
  }
  $("konto-inhalt").innerHTML = String(inhalt);
  showScreen("konto");
}

// ---------- Charakter-Menü (Klick aufs Logo) ----------
async function charakterMenue() {
  const imPortal = typeof portal !== "undefined" && portal.aktiv;
  if (!state.loaded && !imPortal) return;
  if (!state.konto || !["charakter", "mandant"].includes(state.konto.art)) {
    if (state.konto && state.konto.art === "mitglied") {
      openDialog({
        title: "Mit Discord verknüpfen",
        body: html`<p>Dein Konto ist noch nicht mit Discord verknüpft. Danach meldest du dich mit Discord an
          und kannst mehrere Charaktere anlegen und zwischen ihnen wechseln.</p>
          <ol class="small"><li>Mit Discord anmelden (du wirst dabei abgemeldet).</li>
          <li>„Bestehenden Charakter übernehmen“ wählen und deine jetzige E-Mail und dein Passwort eingeben.</li></ol>
          <p class="small muted">Danach gelten die alten Zugangsdaten nicht mehr – Anmeldung nur noch mit Discord
          (oder einem eigenen Passwort, das du dann festlegen kannst).</p>
          <div class="dialog-actions"><span class="spacer"></span>
            <button type="button" class="btn" data-close>Später</button>
            <button type="button" class="btn primary" data-action="discord-login">Mit Discord anmelden</button></div>`,
      });
    } else go("");
    return;
  }
  try { await kontoLaden(); } catch (e) { console.warn(e); }
  const k = state.konto;
  openDialog({
    title: "Charakter wechseln",
    body: html`${k.person ? discordKopf(k.person) : ""}
      ${charakterListe(k.charaktere)}
      <div class="dialog-actions wrap">
        <button type="button" class="btn" data-action="charakter-beantragen">+ Neuer Charakter</button>
        ${k.person && k.person.server_mitglied ? html`<button type="button" class="btn" data-action="charakter-uebernehmen">Bestehenden übernehmen</button>` : ""}
        <button type="button" class="btn" data-action="person-passwort">${k.person && k.person.hat_passwort ? "Passwort ändern" : "Passwort festlegen"}</button>
      </div>`,
  });
}

// Konto neu laden und die passende Ansicht zeigen
async function kontoAktualisieren() {
  await kontoLaden();
  if (state.loaded || (typeof portal !== "undefined" && portal.aktiv)) { if ($("form-dialog").open) charakterMenue(); }
  else kontoBildschirm();
}

// ---------- Aktionen ----------
Object.assign(ACTIONS, {
  "discord-login": () => discordAnmelden(),
  "charakter-menue": () => charakterMenue(),
  "charakter-wechseln": async (d) => {
    try { await charakterWechseln(d.id); } catch (e) { toast(errorText(e), "error"); }
  },
  "konto-neu-laden": () => attempt(async () => {
    await kontoLaden();
    if (await automatischWechseln(state.konto)) return;
    kontoBildschirm();
  }),
  "antrag-zurueckziehen": async (d) => {
    if (!confirm("Antrag für diesen Charakter zurückziehen?")) return;
    if (await attempt(async () => {
      const { error } = await db.rpc("charakter_antrag_zurueckziehen", { p_charakter: d.id });
      if (error) throw error;
    }, "Antrag zurückgezogen")) await attempt(kontoAktualisieren);
  },
  "charakter-beantragen": () => {
    const p = kontoPerson() || {};
    const hatMandant = kontoCharaktere().some((c) => c.art === "mandant" && ["wartet", "frei"].includes(c.status));
    const arten = [
      ...(p.server_mitglied ? [{ value: "mitarbeiter", label: "Mitarbeiter der Kanzlei" }] : []),
      ...(hatMandant ? [] : [{ value: "mandant", label: "Mandant (Mandantenportal)" }]),
    ];
    if (!arten.length) {
      toast("Mitarbeiter-Charaktere nur für Mitglieder des Discord-Servers – einen Mandanten-Zugang hast du schon.", "error");
      return;
    }
    openForm({
      title: "Neuen Charakter beantragen",
      intro: "Mitarbeiter gibt ein Admin frei, Mandanten-Zugänge die Kanzlei (sie ordnet dich deiner Mandantenakte zu). Danach wechselst du über das Logo oben links.",
      fields: [
        { name: "art", label: "Art", type: "select", options: arten, required: true },
        { name: "name", label: "Name des Charakters", required: true, placeholder: "z. B. Lisa Lustig" },
        { name: "notiz", label: "Hinweis für die Kanzlei (nur Mandanten)", type: "textarea", rows: 2, placeholder: "z. B. Aktenzeichen, Name deines Anwalts" },
      ],
      values: { art: arten[0].value },
      submitLabel: "Beantragen",
      onSubmit: async (v) => {
        const { error } = await db.rpc("charakter_beantragen", { p_name: v.name, p_art: v.art, p_notiz: v.art === "mandant" ? v.notiz : null });
        if (error) throw error;
        toast(v.art === "mandant" ? "Beantragt – die Kanzlei schaltet dich frei." : "Beantragt – du wirst freigeschaltet, sobald ein Admin zustimmt.");
        setTimeout(() => attempt(kontoAktualisieren), 50);
      },
    });
  },
  "reg-art": (d) => { ui.konto.reg = d.art; ui.konto.fehler = null; kontoBildschirm(); },
  "charakter-uebernehmen": () => openForm({
    title: "Bestehenden Charakter übernehmen",
    intro: "Gib die bisherigen Zugangsdaten des Charakters ein. Er wird mit deinem Discord-Konto verknüpft und ist sofort freigeschaltet. Die alten Zugangsdaten gelten danach nicht mehr.",
    fields: [
      { name: "email", label: "Bisherige E-Mail", type: "email", required: true },
      { name: "passwort", label: "Bisheriges Passwort", type: "password", required: true },
    ],
    submitLabel: "Übernehmen",
    onSubmit: async (v) => {
      const { data, error } = await db.rpc("charakter_uebernehmen", { p_email: v.email, p_passwort: v.passwort });
      if (error) throw error;
      if (!data.ok) throw new Error(data.fehler);
      toast(`${data.name} ist jetzt mit deinem Discord-Konto verknüpft.`);
      setTimeout(() => attempt(kontoAktualisieren), 50);
    },
  }),
  "person-passwort": () => {
    const p = kontoPerson() || {};
    openForm({
      title: p.hat_passwort ? "Passwort ändern" : "Passwort festlegen",
      intro: html`Damit kannst du dich auch ohne Discord anmelden: mit <strong>${p.email || "deiner Discord-E-Mail"}</strong>
        und diesem Passwort. Danach wählst du wie gewohnt deinen Charakter.`,
      fields: [
        { name: "passwort", label: "Neues Passwort", type: "password", required: true, help: "Mindestens 8 Zeichen." },
        { name: "wiederholung", label: "Passwort wiederholen", type: "password", required: true },
      ],
      onSubmit: async (v) => {
        if (v.passwort !== v.wiederholung) throw new Error("Die Passwörter stimmen nicht überein.");
        const { data, error } = await db.rpc("person_passwort_setzen", { p_passwort: v.passwort });
        if (error) throw error;
        if (state.konto && state.konto.person) state.konto.person.hat_passwort = true;
        alert(`Passwort gespeichert.\n\nAnmeldung ohne Discord:\nE-Mail: ${data}\nPasswort: das eben gewählte`);
      },
    });
  },
});

SUBMITS.registrieren = async (form) => {
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  try {
    const f = new FormData(form);
    const art = f.get("art") || "mitarbeiter";
    const { error } = await db.rpc("charakter_beantragen", { p_name: f.get("name"), p_art: art, p_notiz: art === "mandant" ? f.get("notiz") : null });
    if (error) throw error;
    ui.konto.fehler = null;
    await kontoLaden();
    kontoBildschirm();
  } catch (e) {
    ui.konto.fehler = errorText(e);
    kontoBildschirm();
  }
};

// Tastatur: Charakterzeilen mit Enter wählbar
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const el = e.target.closest && e.target.closest(".charakter-zeile.klickbar");
  if (el) { e.preventDefault(); el.click(); }
});
