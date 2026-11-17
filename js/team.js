// =============================================================
//  Wiwang Law – Personal: Mitglieder, Personalakte, Ränge &
//  Berechtigungen, Kanzlei-Einstellungen
// =============================================================

ui.personal = { tab: "mitglieder", filter: "aktiv" };
const VERMERK_ARTEN = ["Notiz", "Gespräch", "Lob", "Beförderung", "Fortbildung", "Abmahnung"];

function randomPassword() {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function adminFehler(error) {
  if (/function .* does not exist|Could not find the function/i.test(error.message || "")) {
    return new Error("Die Nutzerverwaltung ist in Supabase noch nicht eingerichtet (supabase-update-4.sql).");
  }
  return error;
}

async function ladeAdminUsers() {
  if (!darf("personal_verwalten") || ui.adminUsersLaedt) return;
  ui.adminUsersLaedt = true;
  const { data, error } = await db.rpc("admin_list_users");
  ui.adminUsersLaedt = false;
  ui.adminUsers = error ? [] : data;
  if (error) toast(errorText(adminFehler(error)), "error");
  scheduleRender();
}

const istAdminUser = (id) => ((ui.adminUsers || []).find((u) => u.id === id) || {}).is_admin || (id === state.me.id && state.isAdmin);
const rangeSortiert = () => [...state.raenge].sort((a, b) => a.sortierung - b.sortierung || a.name.localeCompare(b.name, "de"));

function statusBadgeP(s) {
  const cls = { Aktiv: "ok", Urlaub: "blue", Krank: "hoch", Beurlaubt: "gold", Ausgeschieden: "geschlossen" }[s] || "";
  return html`<span class="badge ${cls}">${s || "Aktiv"}</span>`;
}

// Ränge, die ich vergeben darf: nur solche, deren Rechte ich selbst habe
function vergebbareRaenge() {
  return rangeSortiert().filter((r) => state.isAdmin || (r.berechtigungen || []).every((k) => darf(k)));
}

// Darf ich Rang/Status dieses Mitglieds ändern?
function kannVerwalten(userId) {
  if (state.isAdmin) return true;
  return darf("personal_verwalten") && userId !== state.me.id && !istAdminUser(userId);
}

function dauerSeit(datum) {
  const d = parseDate(datum);
  if (!d) return "–";
  const tage = Math.floor((Date.now() - d) / 86400000);
  if (tage < 1) return "heute";
  if (tage < 31) return `${tage} ${tage === 1 ? "Tag" : "Tage"}`;
  const monate = Math.floor(tage / 30.44);
  if (monate < 12) return `${monate} ${monate === 1 ? "Monat" : "Monate"}`;
  const jahre = Math.floor(monate / 12);
  return `${jahre} ${jahre === 1 ? "Jahr" : "Jahre"}${monate % 12 ? `, ${monate % 12} Mon.` : ""}`;
}

// ---------- Formulare ----------
function openProfilForm(userId) {
  const p = profileOf(userId) || { user_id: userId };
  const r = rangVon(p);
  const fields = [
    { name: "anzeigename", label: "Anzeigename", required: true, half: true, placeholder: "z. B. Günther Freitag" },
    { name: "telefon", label: "Telefon (ingame)", half: true, placeholder: "z. B. 555-0100" },
    { name: "discord", label: "Discord", half: true },
  ];
  if (r && r.ist_sonstiges) {
    fields.push({ name: "rang_eigen", label: "Meine Rangbezeichnung", half: true, required: true,
      placeholder: "z. B. Ermittler, Senior Counsel", help: "Dein Rang ist „Sonstiges“ – den Namen legst du selbst fest." });
  }
  openForm({
    title: "Mein Profil",
    intro: "Dein Name und Rang erscheinen im Verlauf, auf Rechnungen und unter Dokumenten.",
    fields,
    values: p,
    onSubmit: async (v) => {
      if (profileOf(userId)) await updateRow("profiles", userId, v);
      else await insertRow("profiles", { user_id: userId, ...v });
      toast("Profil gespeichert");
    },
  });
}

function openPersonalForm(userId) {
  const p = profileOf(userId);
  const verwalten = kannVerwalten(userId);
  const fields = [
    { name: "anzeigename", label: "Name", required: true, half: true },
    { name: "telefon", label: "Telefon (ingame)", half: true },
    { name: "discord", label: "Discord", half: true },
    { name: "personalnummer", label: "Personalnummer", half: true, placeholder: "z. B. WL-07" },
  ];
  if (verwalten) {
    fields.push(
      { type: "section", label: "Rang & Status" },
      { name: "rang_id", label: "Rang", type: "select", half: true, emptyLabel: "— kein Rang (keine Rechte) —",
        options: () => vergebbareRaenge().map((r) => ({ value: r.id, label: r.ist_sonstiges ? `${r.name} (eigener Name)` : r.name })) },
      { name: "rang_eigen", label: "Rangbezeichnung bei „Sonstiges“", half: true, help: "Kann das Mitglied auch selbst ändern." },
      { name: "status", label: "Status", type: "select", options: PERSONAL_STATUS, required: true, half: true },
      { name: "eintritt", label: "Eintritt", type: "date", half: true },
    );
  }
  openForm({
    title: `${personName(userId)} bearbeiten`,
    fields,
    values: p,
    wide: true,
    onSubmit: async (v) => {
      const vorher = p.status;
      await updateRow("profiles", userId, v);
      toast("Gespeichert");
      if (v.status === "Ausgeschieden" && vorher !== "Ausgeschieden" && !istAdminUser(userId)
          && confirm(`${personName(userId)} ist ausgeschieden. Den Zugang zum Aktensystem jetzt auch sperren?`)) {
        await sperren(userId, true);
      }
      // Abwesend? Dann die offene Arbeit gleich an eine Vertretung geben
      const n = offeneArbeit(userId);
      if (v.status && v.status !== "Aktiv" && v.status !== vorher && darfUebergeben() && n.akten + n.aufgaben + n.termine > 0
          && confirm(`${personName(userId)} ist jetzt „${v.status}“ und hat noch ${n.akten} aktive Akte(n), ${n.aufgaben} offene Aufgabe(n) und ${n.termine} Termin(e).\n\nJetzt an eine Vertretung übergeben?`)) {
        setTimeout(() => openUebergabe(userId), 50); // erst nach dem Schließen dieses Dialogs
      }
    },
  });
}

async function sperren(userId, gesperrt) {
  const { error } = await db.rpc("personal_sperren", { p_user_id: userId, p_gesperrt: gesperrt });
  if (error) return toast(errorText(adminFehler(error)), "error");
  toast(gesperrt ? `${personName(userId)}: Zugang gesperrt` : `${personName(userId)}: Zugang entsperrt`);
  ui.adminUsers = null;
  render();
}

function einstellungFields() {
  return [
    { name: "kanzlei", label: "Name der Kanzlei", required: true, half: true },
    { name: "ort", label: "Ort (für Briefe)", required: true, half: true },
    { name: "telefon", label: "Telefon der Kanzlei", half: true },
    { name: "waehrung", label: "Währungszeichen", required: true, third: true },
    { name: "haft_einheit", label: "Haft-Einheit", required: true, third: true, help: "z. B. HE, Monate, Minuten" },
    { name: "zahlungsziel_tage", label: "Zahlungsziel (Tage)", type: "number", required: true, third: true },
    { name: "liegezeit_tage", label: "„Liegen geblieben“ nach (Tagen)", type: "number", required: true, half: true,
      help: "Offene Akten ohne Eintrag, Aufgabe oder Termin seit so vielen Tagen werden auf der Übersicht gemeldet." },
    { name: "rechnung_einleitung", label: "Rechnung: Einleitungstext", type: "textarea", rows: 3 },
    { name: "rechnung_hinweis", label: "Rechnung: Hinweis unter der Tabelle", type: "textarea", rows: 2 },
  ];
}

// ---------- Seite ----------
VIEWS.team = (route) => {
  if (darf("personal_verwalten") && ui.adminUsers === null) ladeAdminUsers();
  if (route.id) {
    const p = profileOf(route.id);
    return html`<div class="page">${p ? personalDetail(p)
      : html`<div class="card empty-state"><h2>Mitglied nicht gefunden</h2><a class="btn" href="#/team">Zur Übersicht</a></div>`}</div>`;
  }
  const tabs = [["mitglieder", "Mitglieder"], ["raenge", "Ränge & Berechtigungen"], ["einstellungen", "Kanzlei & Daten"]];
  const tab = ui.personal.tab;
  return html`
    <div class="page">
      <div class="page-head">
        <div><h1>Personal</h1><p class="muted">${(() => { const n = state.profiles.filter((p) => p.status !== "Ausgeschieden").length; return n === 1 ? "1 aktives Mitglied" : `${n} aktive Mitglieder`; })()} bei ${state.settings.kanzlei}</p></div>
        <div class="actions-row">
          <a class="btn" href="#/team/${state.me.id}">Meine Personalakte</a>
          ${darf("personal_verwalten") ? html`<button class="btn primary" data-action="nutzer-neu">+ Mitglied einstellen</button>` : ""}
        </div>
      </div>
      <nav class="tabs" style="margin:0 0 16px;padding:0">
        ${tabs.map(([k, l]) => html`<a href="#/team" data-action="personal-tab" data-tab="${k}" class="${k === tab ? "active" : ""}">${l}</a>`)}
      </nav>
      ${tab === "raenge" ? tabRaenge() : tab === "einstellungen" ? tabEinstellungen() : tabMitglieder()}
    </div>`;
};

function tabMitglieder() {
  const logins = new Map((ui.adminUsers || []).map((u) => [u.id, u]));
  const f = ui.personal.filter;
  const liste = team()
    .filter((p) => f === "alle" || (f === "aktiv" ? p.status !== "Ausgeschieden" : p.status === "Ausgeschieden"))
    .sort((a, b) => ((rangVon(a) || {}).sortierung ?? 999) - ((rangVon(b) || {}).sortierung ?? 999) || personName(a.user_id).localeCompare(personName(b.user_id), "de"));
  return html`
    <div class="card">
      <div class="toolbar">
        <div class="chips">
          ${[["aktiv", "Aktiv"], ["ausgeschieden", "Ausgeschieden"], ["alle", "Alle"]].map(([v, l]) =>
            html`<button class="chip ${f === v ? "active" : ""}" data-action="personal-filter" data-filter="${v}">${l}</button>`)}
        </div>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Name</th><th>Rang</th><th>Status</th><th>Eintritt</th><th>Telefon</th><th class="num">Aktive Akten</th>
          ${darf("personal_verwalten") ? html`<th>Zuletzt angemeldet</th>` : ""}</tr></thead>
        <tbody>${liste.map((p) => {
          const u = logins.get(p.user_id);
          const akten = state.akten.filter((a) => a.zustaendig_id === p.user_id && a.status !== "Geschlossen").length;
          return html`<tr class="clickable" data-action="goto" data-to="team/${p.user_id}">
            <td><span class="name-mit-avatar">${avatar(p.user_id)}<a href="#/team/${p.user_id}"><strong>${personName(p.user_id)}</strong></a></span>
              ${p.user_id === state.me.id ? html` <span class="badge gold">Du</span>` : ""}
              ${istAdminUser(p.user_id) ? html` <span class="badge alert">Admin</span>` : ""}
              ${u && u.gesperrt ? html` <span class="badge geschlossen">gesperrt</span>` : ""}
              ${p.personalnummer ? html`<div class="small muted">${p.personalnummer}</div>` : ""}</td>
            <td>${rangName(p) || html`<span class="muted">kein Rang</span>`}</td>
            <td>${statusBadgeP(p.status)}</td>
            <td class="nowrap">${p.eintritt ? fmt.datum(p.eintritt) : "–"}</td>
            <td>${p.telefon || "–"}</td>
            <td class="num">${akten}</td>
            ${darf("personal_verwalten") ? html`<td class="small">${u ? (u.last_sign_in_at ? fmt.relativ(u.last_sign_in_at) : "noch nie") : "…"}</td>` : ""}
          </tr>`;
        })}</tbody>
      </table></div>
      ${liste.length ? "" : html`<p class="empty">Niemand in dieser Ansicht.</p>`}
    </div>`;
}

function hatRangRecht(r, key) {
  const liste = r.berechtigungen || [];
  return liste.some((b) => b === key || ALTE_RECHTE[b] === key);
}

function tabRaenge() {
  const admin = state.isAdmin;
  const raenge = rangeSortiert();
  const zelle = (r, key, label) => html`<td class="center"><input type="checkbox" title="${r.name}: ${label}"
    data-change="rang-recht" data-id="${r.id}" data-key="${key}" ${hatRangRecht(r, key) ? "checked" : ""} ${admin ? "" : "disabled"}></td>`;
  return html`
    <div class="card">
      <div class="card-head">
        <div><h2>Ränge & Berechtigungen</h2>
          <p class="muted small" style="margin:0">Für jeden Bereich getrennt: <strong>Lesen</strong> (ansehen) und <strong>Bearbeiten</strong> (anlegen, ändern – schließt Lesen ein).
            Die Datenbank prüft jede Aktion selbst. Der Admin (Inhaber) hat immer alle Rechte. ${admin ? "" : "Ändern kann nur der Admin."}</p></div>
        ${admin ? html`<button class="btn small primary" data-action="rang-neu">+ Rang</button>` : ""}
      </div>
      <div class="table-wrap"><table class="table rights-table">
        <thead>
          <tr><th rowspan="2">Rang</th><th rowspan="2" class="num">Mitgl.</th>
            ${BEREICHE.map((b) => html`<th class="rt grp" colspan="${b.nurSchreiben ? 1 : 2}" title="${b.text}">${b.label}</th>`)}
            ${SONDERRECHTE.map((x) => html`<th class="rt grp" rowspan="2">${x.label}</th>`)}
            <th class="rt grp" rowspan="2" title="Grundwert: KI-Anfragen pro Tag für Mitglieder dieses Rangs">KI-Limit<br>pro Tag</th>
            ${admin ? html`<th rowspan="2"></th>` : ""}</tr>
          <tr>${BEREICHE.map((b) => b.nurSchreiben ? html`<th class="rt sub">Bearb.</th>` : html`<th class="rt sub">Lesen</th><th class="rt sub">Bearb.</th>`)}</tr>
        </thead>
        <tbody>${raenge.map((r, i) => {
          const n = state.profiles.filter((p) => p.rang_id === r.id && p.status !== "Ausgeschieden").length;
          return html`<tr>
            <td><strong>${r.name}</strong>${r.ist_sonstiges ? html`<div class="small muted">benennt sich selbst</div>` : ""}</td>
            <td class="num">${n}</td>
            ${BEREICHE.map((b) => html`${b.nurSchreiben ? "" : zelle(r, `${b.key}_lesen`, `${b.label} lesen`)}${zelle(r, `${b.key}_schreiben`, `${b.label} bearbeiten`)}`)}
            ${SONDERRECHTE.map((x) => zelle(r, x.key, x.label))}
            <td class="center"><input type="number" class="ki-limit-feld" min="0" max="100000" step="1" inputmode="numeric"
              value="${rangKiLimit(r)}" data-change="rang-ki-limit" data-id="${r.id}" title="${r.name}: KI-Anfragen pro Tag (Grundwert)"
              aria-label="${r.name}: KI-Limit pro Tag" ${admin ? "" : "disabled"}
              style="${hatRangRecht(r, "ki_assistent") ? "" : "opacity:.55"}"></td>
            ${admin ? html`<td class="row-actions">
              <button class="icon-btn" title="Nach oben" data-action="rang-sort" data-id="${r.id}" data-delta="-1" ${i === 0 ? "disabled" : ""}>↑</button>
              <button class="icon-btn" title="Nach unten" data-action="rang-sort" data-id="${r.id}" data-delta="1" ${i === raenge.length - 1 ? "disabled" : ""}>↓</button>
              <button class="icon-btn" title="Bearbeiten" data-action="rang-bearbeiten" data-id="${r.id}">✎</button>
            </td>` : ""}
          </tr>`;
        })}</tbody>
      </table></div>
      <h3 class="section-title" style="margin-top:18px">Die Bereiche</h3>
      <ul class="small" style="margin:0;padding-left:18px;color:var(--muted)">
        ${BEREICHE.map((b) => html`<li><strong>${b.label}</strong>: ${b.text}</li>`)}
        <li><strong>Akten löschen</strong>: eigenes Recht, weil Löschen nicht rückgängig zu machen ist.</li>
        <li><strong>KI-Assistent</strong>: Chat mit der KI (über OpenRouter bzw. Google Gemini) – beantwortet ausschließlich Rechtsfragen und schlägt dafür in den Gesetzen nach. Sie sieht nur Daten, die das Mitglied selbst lesen darf; die Inhalte gehen dafür an den KI-Anbieter.</li>
        <li><strong>KI-Limit pro Tag</strong>: Grundwert für alle Mitglieder des Rangs. Je Mitglied lässt sich unten eine Abweichung (+/−) festlegen.</li>
        <li>Wer einen Bereich nicht lesen darf, sieht ihn auch nicht im Menü, auf der Übersicht oder in der Suche.</li>
        <li>Personal verwalten (= Personalakten bearbeiten): Man kann nur Ränge vergeben, deren Rechte man selbst hat, und nie den eigenen.</li>
      </ul>
    </div>
    ${kiLimitKarte()}`;
}

// ---------- KI-Limits ----------
// Wirksames Limit = Grundwert des Rangs (ohne Rang: 100) + Abweichung des Mitglieds, mindestens 0
// (dieselbe Rechnung macht die Datenbank in ki_tageslimit())
const KI_LIMIT_OHNE_RANG = 100;
function rangKiLimit(r) {
  return r && Number.isFinite(Number(r.ki_tageslimit)) ? Number(r.ki_tageslimit) : KI_LIMIT_OHNE_RANG;
}
function kiLimitVon(p) {
  const r = rangVon(p);
  return Math.max(0, (r ? rangKiLimit(r) : KI_LIMIT_OHNE_RANG) + (Number(p.ki_limit_offset) || 0));
}
function darfKiNutzer(p) {
  if (istAdminUser(p.user_id)) return true;
  const r = rangVon(p);
  return !!r && p.status !== "Ausgeschieden" && hatRangRecht(r, "ki_assistent");
}

// Heutige Nutzung aller Mitglieder (nur der Admin darf sie lesen)
ui.kiNutzungHeute = null;
async function ladeKiNutzungHeute() {
  ui.kiNutzungHeute = {};
  const tagesbeginn = new Date();
  tagesbeginn.setUTCHours(0, 0, 0, 0);
  const { data, error } = await db.from("ki_nutzung").select("user_id").gte("zeit", tagesbeginn.toISOString()).limit(10000);
  if (error) { console.warn(error); return; }
  const zaehler = {};
  for (const z of data) zaehler[z.user_id] = (zaehler[z.user_id] || 0) + 1;
  ui.kiNutzungHeute = zaehler;
  scheduleRender();
}

function kiLimitKarte() {
  const admin = state.isAdmin;
  if (admin && ui.kiNutzungHeute === null) ladeKiNutzungHeute();
  const liste = team().filter((p) => p.status !== "Ausgeschieden")
    .sort((a, b) => darfKiNutzer(b) - darfKiNutzer(a)
      || ((rangVon(a) || {}).sortierung ?? 999) - ((rangVon(b) || {}).sortierung ?? 999)
      || personName(a.user_id).localeCompare(personName(b.user_id), "de"));
  const nutzung = ui.kiNutzungHeute || {};
  return html`
    <div class="card">
      <div class="card-head">
        <div><h2>KI-Limit je Mitglied</h2>
          <p class="muted small" style="margin:0">Anfragen pro Tag = <strong>Grundwert des Rangs</strong> (Spalte „KI-Limit“ oben) + <strong>Abweichung</strong> des Mitglieds.
            Beispiel: Rang 50, Abweichung −20 → 30 pro Tag. ${admin ? "" : "Ändern kann nur der Admin."}</p></div>
        ${admin ? html`<button class="btn small" data-action="ki-nutzung-neu" title="Heutige Nutzung neu laden">Nutzung aktualisieren</button>` : ""}
      </div>
      <div class="table-wrap"><table class="table ki-limit-tabelle">
        <thead><tr><th>Mitglied</th><th>Rang</th><th class="center">KI-Recht</th><th class="num">Grundwert</th>
          <th class="center">Abweichung</th><th class="num">Wirksam / Tag</th>${admin ? html`<th class="num">Heute genutzt</th>` : ""}</tr></thead>
        <tbody>${liste.map((p) => {
          const r = rangVon(p);
          const ki = darfKiNutzer(p);
          const limit = kiLimitVon(p);
          const offset = Number(p.ki_limit_offset) || 0;
          const heute = nutzung[p.user_id] || 0;
          return html`<tr class="${ki ? "" : "gedimmt"}">
            <td><span class="name-mit-avatar">${avatar(p.user_id)}<a href="#/team/${p.user_id}"><strong>${personName(p.user_id)}</strong></a></span>
              ${istAdminUser(p.user_id) ? html` <span class="badge alert">Admin</span>` : ""}</td>
            <td>${rangName(p) || html`<span class="muted">kein Rang</span>`}</td>
            <td class="center">${ki ? html`<span class="badge ok">ja</span>` : html`<span class="badge">nein</span>`}</td>
            <td class="num">${r ? rangKiLimit(r) : html`<span class="muted" title="ohne Rang">${KI_LIMIT_OHNE_RANG}</span>`}</td>
            <td class="center"><input type="number" class="ki-limit-feld" min="-100000" max="100000" step="1" inputmode="numeric"
              value="${offset}" data-change="ki-limit-offset" data-id="${p.user_id}" aria-label="${personName(p.user_id)}: Abweichung vom Grundwert"
              title="Abweichung vom Grundwert des Rangs (+/−)" ${admin ? "" : "disabled"}></td>
            <td class="num"><strong>${limit}</strong>${offset ? html` <span class="small ${offset > 0 ? "ok-text" : "danger-text"}">(${offset > 0 ? "+" : ""}${offset})</span>` : ""}</td>
            ${admin ? html`<td class="num ${ki && heute >= limit ? "danger-text" : ""}">${ui.kiNutzungHeute ? heute : "…"}</td>` : ""}
          </tr>`;
        })}</tbody>
      </table></div>
      <p class="muted small" style="margin:8px 0 0">Ein Limit von 0 sperrt die KI für das Mitglied, auch wenn der Rang sie erlaubt. Gezählt wird pro Kalendertag (UTC).</p>
    </div>`;
}

CHANGES["rang-ki-limit"] = async (el) => {
  const r = byId("raenge", el.dataset.id);
  const wert = Math.round(Number(el.value));
  if (!r) return;
  if (!Number.isFinite(wert) || wert < 0 || wert > 100000 || el.value === "") {
    toast("Bitte eine Zahl von 0 bis 100000 eingeben.", "error");
    el.value = rangKiLimit(r);
    return;
  }
  if (wert === rangKiLimit(r)) return;
  await attempt(() => updateRow("raenge", r.id, { ki_tageslimit: wert }), `${r.name}: KI-Limit ${wert} pro Tag`);
};

CHANGES["ki-limit-offset"] = async (el) => {
  const p = profileOf(el.dataset.id);
  const wert = el.value === "" ? 0 : Math.round(Number(el.value));
  if (!p) return;
  if (!Number.isFinite(wert) || Math.abs(wert) > 100000) {
    toast("Bitte eine ganze Zahl eingeben (z. B. 20 oder -10).", "error");
    el.value = Number(p.ki_limit_offset) || 0;
    return;
  }
  if (wert === (Number(p.ki_limit_offset) || 0)) return;
  await attempt(() => updateRow("profiles", p.user_id, { ki_limit_offset: wert }),
    `${personName(p.user_id)}: Abweichung ${wert > 0 ? "+" : ""}${wert} → ${Math.max(0, kiLimitVon({ ...p, ki_limit_offset: wert }))} pro Tag`);
};

ACTIONS["ki-nutzung-neu"] = () => ladeKiNutzungHeute();

function tabEinstellungen() {
  const st = state.settings;
  return html`
    <div class="grid-2">
      <div class="card">
        <div class="card-head"><h2>Kanzlei-Einstellungen</h2>
          ${darf("einstellungen") ? html`<button class="btn small" data-action="einstellungen-bearbeiten">Bearbeiten</button>` : ""}</div>
        <dl class="facts">
          <div><dt>Kanzlei</dt><dd>${st.kanzlei}</dd></div>
          <div><dt>Ort</dt><dd>${st.ort}</dd></div>
          <div><dt>Telefon</dt><dd>${st.telefon || "–"}</dd></div>
          <div><dt>Währung</dt><dd>${st.waehrung}</dd></div>
          <div><dt>Haft-Einheit</dt><dd>${st.haft_einheit}</dd></div>
          <div><dt>Zahlungsziel</dt><dd>${st.zahlungsziel_tage} Tage</dd></div>
          <div><dt>Liegen geblieben nach</dt><dd>${st.liegezeit_tage} Tagen</dd></div>
        </dl>
        <p class="small muted" style="margin:0">Rechnungstext: „${truncate(st.rechnung_einleitung, 120)}“</p>
      </div>
      <div class="card">
        <h2 style="margin-top:0">Daten sichern</h2>
        <p class="muted">Lädt alle Daten, die du sehen darfst, als Datei herunter.</p>
        <button class="btn" data-action="export-alles">Komplettsicherung herunterladen</button>
        <h3 class="section-title" style="margin-top:22px">Tastenkürzel</h3>
        <p class="small" style="margin:0"><code>/</code> Suche · <code>N</code> neue Akte · <code>B</code> Benachrichtigungen · <code>K</code> KI-Assistent · <code>Esc</code> schließen</p>
      </div>
    </div>
    ${ablaeufeKarte()}`;
}

// ---------- Personalakte eines Mitglieds ----------
function personalDetail(p) {
  const id = p.user_id;
  const ich = id === state.me.id;
  const u = (ui.adminUsers || []).find((x) => x.id === id);
  const verwalten = kannVerwalten(id);
  const sehen = ich || darf("personal_sehen") || darf("personal_verwalten");
  const r = rangVon(p);
  const rechte = istAdminUser(id) ? null : (r && r.berechtigungen) || [];
  const akten = state.akten.filter((a) => a.zustaendig_id === id);
  const aktiv = akten.filter((a) => a.status !== "Geschlossen");
  const mitErgebnis = akten.filter((a) => a.ergebnis);
  const erfolge = mitErgebnis.filter((a) => ERFOLGE.includes(a.ergebnis)).length;
  const umsatz = state.rechnungen.filter((x) => x.status === "Bezahlt" && x.unterzeichner === id).reduce((t, x) => t + (Number(x.summe) || 0), 0);
  const aufgaben = state.aufgaben.filter((t) => !t.erledigt && t.zustaendig === id).sort(sortAufgaben);
  const termine = state.termine.filter((t) => !t.erledigt && t.verantwortlich === id && new Date(t.beginn) >= startOfDay())
    .sort((a, b) => new Date(a.beginn) - new Date(b.beginn)).slice(0, 5);
  const akte = state.personalakte.find((x) => x.user_id === id);
  const vermerke = state.personal_vermerke.filter((v) => v.user_id === id)
    .sort((a, b) => String(b.datum).localeCompare(String(a.datum)) || new Date(b.created_at) - new Date(a.created_at));
  const aktivitaet = state.protokoll.filter((x) => isMe2(x.benutzer, p.email)).slice(0, 8);

  return html`
    <a class="back-link" style="display:inline-block" href="#/team">← Personal</a>
    <div class="detail-card">
      <div class="detail-head" style="padding-bottom:12px">
        <div class="top">
          <div>
            ${p.personalnummer ? html`<span class="case-number">${p.personalnummer}</span> ` : ""}
            <h2>${personName(id)}</h2>
            <div class="badges">
              ${rangName(p) ? html`<span class="badge haft">${rangName(p)}</span>` : html`<span class="badge">kein Rang</span>`}
              ${statusBadgeP(p.status)}
              ${istAdminUser(id) ? html`<span class="badge alert">Admin</span>` : ""}
              ${u && u.gesperrt ? html`<span class="badge geschlossen">Zugang gesperrt</span>` : ""}
              ${onlineStatus(id) ? html`<span class="badge ok">${onlineStatus(id) === "weg" ? "online (im Hintergrund)" : "online"}</span>` : ""}
            </div>
          </div>
          <div class="actions-row" style="align-items:flex-start">
            ${ich ? html`<button class="btn" data-action="profil-bearbeiten">Mein Profil</button>` : ""}
            ${darfUebergeben() && (() => { const n = offeneArbeit(id); return n.akten + n.aufgaben + n.termine > 0; })()
              ? html`<button class="btn" data-action="uebergabe" data-id="${id}" title="Akten, Aufgaben und Termine an eine Vertretung geben (Urlaub, Krankheit …)">Arbeit übergeben</button>` : ""}
            ${verwalten || (ich && state.isAdmin) ? html`<button class="btn primary" data-action="personal-bearbeiten" data-id="${id}">Bearbeiten</button>` : ""}
            ${darf("personal_verwalten") && !ich && !istAdminUser(id) ? html`
              <button class="btn" data-action="nutzer-passwort" data-id="${id}">Passwort</button>
              <button class="btn" data-action="nutzer-sperren" data-id="${id}" data-sperren="${u && u.gesperrt ? "0" : "1"}">${u && u.gesperrt ? "Entsperren" : "Zugang sperren"}</button>` : ""}
            ${state.isAdmin && !ich ? html`<button class="btn danger" data-action="nutzer-loeschen" data-id="${id}">Löschen</button>` : ""}
          </div>
        </div>
      </div>
      <div class="tab-body">
        <dl class="facts">
          <div><dt>E-Mail (Login)</dt><dd>${p.email || "–"}</dd></div>
          <div><dt>Telefon</dt><dd>${p.telefon || "–"}</dd></div>
          <div><dt>Discord</dt><dd>${p.discord || "–"}</dd></div>
          <div><dt>Eintritt</dt><dd>${p.eintritt ? html`${fmt.datum(p.eintritt)}<br><span class="small muted">seit ${dauerSeit(p.eintritt)}</span>` : "–"}</dd></div>
          ${u ? html`<div><dt>Zuletzt angemeldet</dt><dd>${u.last_sign_in_at ? fmt.relativ(u.last_sign_in_at) : "noch nie"}</dd></div>` : ""}
        </dl>

        <h3 class="section-title">Rechte</h3>
        <div class="badges" style="margin-bottom:18px">
          ${rechte === null ? html`<span class="badge alert">Alle Rechte (Inhaber)</span>`
            : rechteText(r).length ? rechteText(r).map((x) => html`<span class="badge ${x.stufe === "Bearbeiten" ? "gold" : "blue"}">${x.label}: ${x.stufe}</span>`)
            : html`<span class="muted small">Keine Rechte – sieht nur die eigene Personalakte.</span>`}
        </div>

        <div class="kpis">
          <div class="kpi"><span class="value">${aktiv.length}</span><span class="label">Aktive Akten</span></div>
          <div class="kpi"><span class="value">${akten.length - aktiv.length}</span><span class="label">Abgeschlossen</span></div>
          <div class="kpi"><span class="value">${mitErgebnis.length ? Math.round((erfolge / mitErgebnis.length) * 100) + " %" : "–"}</span><span class="label">Erfolgsquote</span></div>
          <div class="kpi"><span class="value">${fmt.geld(umsatz)}</span><span class="label">Umsatz (unterzeichnet)</span></div>
        </div>

        <div class="grid-2">
          <div>
            <h3 class="section-title">Aktive Akten</h3>
            ${aktiv.length ? html`<ul class="item-list">${aktiv.slice(0, 8).map((a) => html`<li>${akteListItem(a)}</li>`)}</ul>` : html`<p class="empty">Keine.</p>`}
            <h3 class="section-title" style="margin-top:16px">Offene Aufgaben</h3>
            ${aufgaben.length ? html`<ul class="rows">${aufgaben.slice(0, 6).map((t) => aufgabeRow(t))}</ul>` : html`<p class="empty">Keine.</p>`}
          </div>
          <div>
            <h3 class="section-title">Nächste Termine</h3>
            ${termine.length ? html`<ul class="rows">${termine.map((t) => terminRow(t))}</ul>` : html`<p class="empty">Keine.</p>`}
            <h3 class="section-title" style="margin-top:16px">Letzte Aktivitäten</h3>
            ${aktivitaet.length ? html`<ul class="rows">${aktivitaet.map((x) => protokollZeile(x))}</ul>` : html`<p class="empty">Keine.</p>`}
          </div>
        </div>

        ${sehen ? html`
          <div class="card" style="margin-top:20px;box-shadow:none">
            <div class="card-head">
              <div><h2>Personalakte</h2><p class="muted small" style="margin:0">Vertraulich – sichtbar für ${personName(id)} selbst und für Ränge mit „Personalakten ansehen“.</p></div>
              ${verwalten ? html`<div class="actions-row">
                <button class="btn small" data-action="personalakte-bearbeiten" data-id="${id}">Gehalt & Notizen</button>
                <button class="btn small primary" data-action="vermerk-neu" data-id="${id}">+ Vermerk</button></div>` : ""}
            </div>
            <dl class="facts">
              <div><dt>Gehalt</dt><dd>${akte && akte.gehalt !== null && akte.gehalt !== undefined ? fmt.geld(akte.gehalt) : "–"}</dd></div>
              <div style="grid-column: span 3"><dt>Notizen</dt><dd class="pre">${(akte && akte.notizen) || "–"}</dd></div>
            </dl>
            <h3 class="section-title">Vermerke</h3>
            ${vermerke.length ? html`<ul class="timeline">${vermerke.map((v) => html`
              <li class="${v.art === "Abmahnung" ? "wichtig" : ""}">
                <div class="head"><span class="badge ${v.art === "Abmahnung" ? "alert" : v.art === "Lob" || v.art === "Beförderung" ? "ok" : "gold"}">${v.art}</span>
                  ${fmt.datum(v.datum)} · von ${personName(v.created_by)}</div>
                <p>${v.text}</p>
                ${verwalten ? html`<div class="tools"><button class="icon-btn" title="Löschen" data-action="vermerk-loeschen" data-id="${v.id}">✕</button></div>` : ""}
              </li>`)}</ul>` : html`<p class="empty">Keine Vermerke.</p>`}
          </div>` : ""}
      </div>
    </div>`;
}

function rechteText(r) {
  if (!r) return [];
  const out = [];
  for (const b of BEREICHE) {
    if (hatRangRecht(r, `${b.key}_schreiben`)) out.push({ label: b.label, stufe: "Bearbeiten" });
    else if (!b.nurSchreiben && hatRangRecht(r, `${b.key}_lesen`)) out.push({ label: b.label, stufe: "Lesen" });
  }
  for (const x of SONDERRECHTE) if (hatRangRecht(r, x.key)) out.push({ label: x.label, stufe: "Bearbeiten" });
  return out;
}

function isMe2(a, b) {
  return a && b && String(a).toLowerCase() === String(b).toLowerCase();
}

// ---------- Aktionen ----------
Object.assign(ACTIONS, {
  "personal-tab": (d) => { ui.personal.tab = d.tab; if (parseRoute().page !== "team" || parseRoute().id) go("team"); else render(); },
  "personal-filter": (d) => { ui.personal.filter = d.filter; render(); },
  "profil-bearbeiten": () => openProfilForm(state.me.id),
  "personal-bearbeiten": (d) => openPersonalForm(d.id),
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
    title: "Mitglied einstellen",
    intro: "Die E-Mail muss nicht echt sein (z. B. max@wiwang.de). Zugangsdaten danach an die Person weitergeben.",
    fields: [
      { name: "anzeigename", label: "Name", required: true, half: true, placeholder: "z. B. Max Power" },
      { name: "rang_id", label: "Rang", type: "select", half: true, emptyLabel: "— kein Rang —",
        options: () => vergebbareRaenge().map((r) => ({ value: r.id, label: r.name })) },
      { name: "email", label: "E-Mail (Login)", type: "email", required: true, half: true },
      { name: "password", label: "Passwort", required: true, half: true, default: randomPassword(), help: "Mindestens 6 Zeichen – zufällig vorgeschlagen." },
      { name: "personalnummer", label: "Personalnummer", half: true },
      { name: "eintritt", label: "Eintritt", type: "date", half: true, default: ymd(new Date()) },
    ],
    submitLabel: "Einstellen",
    onSubmit: async (v) => {
      const { data: id, error } = await db.rpc("admin_create_user", { p_email: v.email, p_password: v.password });
      if (error) throw adminFehler(error);
      // Das Profil legt die Datenbank an – Daten ergänzen
      await new Promise((r) => setTimeout(r, 300));
      const { data: prof } = await db.from("profiles").select("*").eq("user_id", id).limit(1);
      if (prof && prof.length) upsertLocal("profiles", prof[0]);
      const daten = { anzeigename: v.anzeigename, rang_id: v.rang_id, personalnummer: v.personalnummer, eintritt: v.eintritt, status: "Aktiv" };
      await attempt(() => (profileOf(id) ? updateRow("profiles", id, daten) : insertRow("profiles", { user_id: id, ...daten })));
      ui.adminUsers = null;
      scheduleRender();
      alert(`${v.anzeigename} ist eingestellt!\n\nLogin: ${v.email.trim().toLowerCase()}\nPasswort: ${v.password}\n\nBitte notieren und weitergeben.`);
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
  "nutzer-sperren": (d) => {
    const s = d.sperren === "1";
    if (s && !confirm(`Zugang von ${personName(d.id)} sperren? Die Person kann sich dann nicht mehr anmelden.`)) return;
    sperren(d.id, s);
  },
  "nutzer-loeschen": async (d) => {
    const name = personName(d.id);
    if (!confirm(`${name} endgültig löschen?\n\nTipp: Bei Ausscheiden besser Status „Ausgeschieden“ setzen und den Zugang sperren – dann bleibt die Personalakte erhalten.`)) return;
    const { error } = await db.rpc("admin_delete_user", { p_user_id: d.id });
    if (error) return toast(errorText(adminFehler(error)), "error");
    removeLocal("profiles", d.id);
    ui.adminUsers = null;
    toast(`${name} gelöscht`);
    go("team");
  },
  "personalakte-bearbeiten": (d) => {
    const akte = state.personalakte.find((x) => x.user_id === d.id);
    openForm({
      title: `Personalakte – ${personName(d.id)}`,
      fields: [
        { name: "gehalt", label: "Gehalt", type: "money", half: true, help: "z. B. pro Woche oder Monat – wie bei euch üblich" },
        { name: "notizen", label: "Notizen", type: "textarea", rows: 5, placeholder: "Stärken, Absprachen, Verfügbarkeit …" },
      ],
      values: akte || {},
      onSubmit: async (v) => {
        if (akte) await updateRow("personalakte", d.id, v);
        else await insertRow("personalakte", { user_id: d.id, ...v });
        toast("Personalakte gespeichert");
      },
    });
  },
  "vermerk-neu": (d) => openForm({
    title: `Vermerk – ${personName(d.id)}`,
    fields: [
      { name: "art", label: "Art", type: "select", options: VERMERK_ARTEN, required: true, half: true },
      { name: "datum", label: "Datum", type: "date", required: true, half: true },
      { name: "text", label: "Text", type: "textarea", rows: 4, required: true },
    ],
    values: { art: "Notiz", datum: ymd(new Date()) },
    onSubmit: async (v) => { await insertRow("personal_vermerke", { ...v, user_id: d.id }); toast("Vermerk gespeichert"); },
  }),
  "vermerk-loeschen": async (d) => {
    if (!confirm("Vermerk löschen?")) return;
    attempt(() => deleteRow("personal_vermerke", d.id), "Vermerk gelöscht");
  },
  "rang-neu": () => openRangForm(null),
  "rang-bearbeiten": (d) => openRangForm(byId("raenge", d.id)),
  "rang-sort": async (d) => {
    const list = rangeSortiert();
    const i = list.findIndex((r) => r.id === d.id);
    const j = i + Number(d.delta);
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await attempt(async () => {
      for (let k = 0; k < list.length; k++) {
        if (list[k].sortierung !== (k + 1) * 10) await updateRow("raenge", list[k].id, { sortierung: (k + 1) * 10 });
      }
    });
  },
  "export-alles": () => {
    const backup = { app: "Wiwang Law Aktensystem", version: 4, exportiert_am: new Date().toISOString(), tabellen: {} };
    for (const t of TABLES) backup.tabellen[t] = state[t];
    backup.tabellen.protokoll = state.protokoll;
    downloadFile(`wiwang-law-sicherung-${ymd(new Date())}.json`, JSON.stringify(backup, null, 2), "application/json");
    toast("Sicherung heruntergeladen");
  },
});

CHANGES["rang-recht"] = async (el) => {
  const r = byId("raenge", el.dataset.id);
  const key = el.dataset.key;
  // alte Namen übersetzen, dann ändern
  const set = new Set((r.berechtigungen || []).map((b) => ALTE_RECHTE[b] || b));
  if (el.checked) {
    set.add(key);
    if (key.endsWith("_schreiben") && !key.startsWith("einstellungen")) set.add(key.replace(/_schreiben$/, "_lesen"));
  } else {
    set.delete(key);
    if (key.endsWith("_lesen")) set.delete(key.replace(/_lesen$/, "_schreiben"));
  }
  const liste = RECHTE.map((x) => x.key).filter((k) => set.has(k));
  const label = (RECHTE.find((x) => x.key === key) || { label: key }).label;
  await attempt(() => updateRow("raenge", r.id, { berechtigungen: liste }), `${r.name}: „${label}“ ${el.checked ? "erlaubt" : "entzogen"}`);
};

function openRangForm(r) {
  openForm({
    title: r ? `Rang „${r.name}“ bearbeiten` : "Neuer Rang",
    fields: [
      { name: "name", label: "Name", required: true, placeholder: "z. B. Senior Partner" },
      { name: "ist_sonstiges", label: "Mitglieder mit diesem Rang benennen ihn selbst (wie „Sonstiges“)", type: "checkbox" },
      { type: "info", text: "Die Rechte setzt du danach in der Tabelle per Häkchen (Lesen / Bearbeiten je Bereich)." },
    ],
    values: r || { ist_sonstiges: false },
    onSubmit: async (v) => {
      const doppelt = state.raenge.find((x) => norm(x.name) === norm(v.name) && (!r || x.id !== r.id));
      if (doppelt) throw new Error(`Den Rang „${v.name}“ gibt es schon.`);
      if (r) await updateRow("raenge", r.id, v);
      else await insertRow("raenge", { ...v, berechtigungen: [], sortierung: Math.max(0, ...state.raenge.map((x) => x.sortierung)) + 10 });
      toast("Rang gespeichert");
    },
    onDelete: r ? async () => {
      const n = state.profiles.filter((p) => p.rang_id === r.id).length;
      if (!confirm(`Rang „${r.name}“ löschen?${n ? `\n\n${n} Mitglied(er) haben dann keinen Rang und keine besonderen Rechte mehr.` : ""}`)) return false;
      await deleteRow("raenge", r.id);
      state.profiles.forEach((p) => { if (p.rang_id === r.id) p.rang_id = null; });
      toast("Rang gelöscht");
    } : null,
  });
}
