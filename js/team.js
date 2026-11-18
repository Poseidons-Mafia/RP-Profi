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
  // Anrede (pro Charakter); erst verfügbar, wenn supabase-update-15.sql gelaufen ist
  if (!profileOf(userId) || "anrede" in profileOf(userId)) {
    fields.push({ name: "anrede", label: "Anrede", type: "select", half: true, options: ANREDEN, required: true,
      help: "So spricht Nigel dich an – auf dem iFruit-Handy, im Arbeitsbereich und in seinen Antworten." });
  }
  if (r && r.ist_sonstiges) {
    fields.push({ name: "rang_eigen", label: "Meine Rangbezeichnung", half: true, required: true,
      placeholder: "z. B. Ermittler, Senior Counsel", help: "Dein Rang ist „Sonstiges“ – den Namen legst du selbst fest." });
  }
  openForm({
    title: "Mein Profil",
    intro: "Dein Name und Rang erscheinen im Verlauf, auf Rechnungen und unter Dokumenten.",
    fields,
    values: { anrede: "sir", ...p },
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
  // #/team/konten öffnet direkt die Accounts (Link aus der Benachrichtigung)
  if (route.id === "konten") { ui.personal.tab = "konten"; route = { ...route, id: null }; }
  if (route.id) {
    const p = profileOf(route.id);
    return html`<div class="page">${p ? personalDetail(p)
      : html`<div class="card empty-state"><h2>Mitglied nicht gefunden</h2><a class="btn" href="#/team">Zur Übersicht</a></div>`}</div>`;
  }
  const tabs = [["mitglieder", "Mitglieder"], ["raenge", "Ränge & Berechtigungen"], ["einstellungen", "Kanzlei & Daten"]];
  if (state.isAdmin) {
    const n = ui.konten && !ui.konten.fehler ? kontenOffen().length : 0;
    tabs.push(["konten", n ? `Accounts (${n})` : "Accounts"]);
  }
  const tab = ui.personal.tab === "konten" && !state.isAdmin ? "mitglieder" : ui.personal.tab;
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
      ${tab === "raenge" ? tabRaenge() : tab === "einstellungen" ? tabEinstellungen() : tab === "konten" ? tabKonten() : tabMitglieder()}
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
          <p class="muted small" style="margin:0">Für jeden Bereich getrennt: <strong>Lesen</strong> (ansehen) und <strong>Bearbeiten</strong> (anlegen, ändern – schließt Lesen ein), bei Nigel <strong>Sehen</strong> und <strong>Verwenden</strong>.
            Die Datenbank prüft jede Aktion selbst. Der Admin (Inhaber) hat immer alle Rechte. ${admin ? "" : "Ändern kann nur der Admin."}</p></div>
        ${admin ? html`<button class="btn small primary" data-action="rang-neu">+ Rang</button>` : ""}
      </div>
      <div class="table-wrap"><table class="table rights-table">
        <thead>
          <tr><th rowspan="2">Rang</th><th rowspan="2" class="num">Mitgl.</th>
            ${BEREICHE.map((b) => html`<th class="rt grp" colspan="${b.nurSchreiben ? 1 : 2}" title="${b.text}">${b.label}</th>`)}
            ${SONDERRECHTE.map((x) => html`<th class="rt grp" rowspan="2">${x.label}</th>`)}
            ${admin ? html`<th rowspan="2"></th>` : ""}</tr>
          <tr>${BEREICHE.map((b) => b.nurSchreiben ? html`<th class="rt sub">Bearb.</th>`
            : html`<th class="rt sub">${stufeLesen(b)}</th><th class="rt sub">${b.schreibenLabel || "Bearb."}</th>`)}</tr>
        </thead>
        <tbody>${raenge.map((r, i) => {
          const n = state.profiles.filter((p) => p.rang_id === r.id && p.status !== "Ausgeschieden").length;
          return html`<tr>
            <td><strong>${r.name}</strong>${r.ist_sonstiges ? html`<div class="small muted">benennt sich selbst</div>` : ""}</td>
            <td class="num">${n}</td>
            ${BEREICHE.map((b) => html`${b.nurSchreiben ? "" : zelle(r, rechtLesen(b), `${b.label} ${stufeLesen(b).toLowerCase()}`)}${zelle(r, rechtSchreiben(b), `${b.label} ${stufeSchreiben(b).toLowerCase()}`)}`)}
            ${SONDERRECHTE.map((x) => zelle(r, x.key, x.label))}
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
        <li>Nigel beantwortet ausschließlich Rechtsfragen (KI-Modell über OpenRouter) und schlägt dafür in den Gesetzen nach. Er sieht nur Daten, die das Mitglied selbst lesen darf; die Inhalte gehen dafür an den KI-Anbieter.</li>
        ${admin ? html`<li><strong>KI-Budget</strong>: US-Dollar pro Monat je Mitglied, darüber der Deckel der Kanzlei – siehe unten. Die Beträge sieht nur der Admin.</li>` : ""}
        <li>Wer einen Bereich nicht lesen darf, sieht ihn auch nicht im Menü, auf der Übersicht oder in der Suche.</li>
        <li>Personal verwalten (= Personalakten bearbeiten): Man kann nur Ränge vergeben, deren Rechte man selbst hat, und nie den eigenen.</li>
      </ul>
    </div>
    ${admin ? kiBudgetKarte() : ""}`;
}

// ---------- KI-Budget (US-Dollar pro Kalendermonat, UTC) ----------
// Wirksames Budget = Grundwert des Rangs (ohne Rang: 0) + Abweichung des Mitglieds, mindestens 0
// (dieselbe Rechnung macht die Datenbank in ki_budget_status()). Darüber liegt der Deckel der Kanzlei.
function rangKiBudget(r) {
  return r && Number.isFinite(Number(r.ki_budget_monat)) ? Number(r.ki_budget_monat) : 0;
}
function kiBudgetVon(p) {
  return Math.max(0, rangKiBudget(rangVon(p)) + (Number(p.ki_budget_offset) || 0));
}
function kiDeckel() {
  const e = state.einstellungen[0] || {};
  return Number.isFinite(Number(e.ki_budget_monat)) ? Number(e.ki_budget_monat) : 10;
}
function darfKiNutzer(p) {
  if (istAdminUser(p.user_id)) return true;
  const r = rangVon(p);
  return !!r && p.status !== "Ausgeschieden" && hatRangRecht(r, "ki_assistent");
}
const kiMitglieder = () => team().filter((p) => p.status !== "Ausgeschieden" && darfKiNutzer(p));
const kiCent = (n) => Math.round(Number(n) * 100) / 100;

// Verbrauch im laufenden Monat (nur der Admin darf alle Zeilen lesen) und Ø-Kosten je Modus (letzte 30 Tage)
ui.kiNutzungMonat = null;
async function ladeKiNutzungMonat() {
  ui.kiNutzungMonat = { laedt: true, kosten: {}, anfragen: {}, gesamt: 0, schnitt: {} };
  const jetzt = new Date();
  const monat = new Date(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), 1));
  const ab = new Date(Math.min(monat.getTime(), jetzt.getTime() - 30 * 86400000));
  const { data, error } = await db.from("ki_nutzung").select("user_id,kosten,modus,zeit").gte("zeit", ab.toISOString()).limit(20000);
  if (error) { console.warn(error); ui.kiNutzungMonat = { fehler: true }; scheduleRender(); return; }
  const n = { kosten: {}, anfragen: {}, gesamt: 0, schnitt: {} };
  const proModus = {};
  for (const z of data) {
    const k = Number(z.kosten) || 0;
    if (new Date(z.zeit) >= monat) {
      n.kosten[z.user_id] = (n.kosten[z.user_id] || 0) + k;
      n.anfragen[z.user_id] = (n.anfragen[z.user_id] || 0) + 1;
      n.gesamt += k;
    }
    if (z.kosten !== null && z.modus && new Date(z.zeit).getTime() >= jetzt.getTime() - 30 * 86400000) {
      const m = (proModus[z.modus] = proModus[z.modus] || { summe: 0, anzahl: 0 });
      m.summe += k;
      m.anzahl++;
    }
  }
  for (const [m, w] of Object.entries(proModus)) n.schnitt[m] = { kosten: w.summe / w.anzahl, anzahl: w.anzahl };
  ui.kiNutzungMonat = n;
  scheduleRender();
}

const KI_MODUS_NAMEN = { frage: "Rechtsfrage", gutachten: "Gutachten", schriftsatz: "Schriftsatz", strategie: "Fallanalyse", ueberarbeiten: "Überarbeiten" };

function kiBudgetKarte() {
  const admin = state.isAdmin;
  if (admin && ui.kiNutzungMonat === null) ladeKiNutzungMonat();
  const nutzung = ui.kiNutzungMonat && !ui.kiNutzungMonat.laedt && !ui.kiNutzungMonat.fehler ? ui.kiNutzungMonat : null;
  const deckel = kiDeckel();
  const mitglieder = kiMitglieder();
  const summe = kiCent(mitglieder.reduce((s, p) => s + kiBudgetVon(p), 0));
  const hoechstens = Math.min(summe, deckel);
  const ueber = summe > deckel + 0.0001;

  // Hochrechnung: bisheriger Verbrauch auf den ganzen Monat
  const jetzt = new Date();
  const tageImMonat = new Date(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth() + 1, 0)).getUTCDate();
  const tagAnteil = (jetzt.getUTCDate() - 1 + (jetzt.getUTCHours() * 60 + jetzt.getUTCMinutes()) / 1440) / tageImMonat;
  const hochrechnung = nutzung && tagAnteil > 0.03 ? Math.min(deckel, nutzung.gesamt / tagAnteil) : null;

  const liste = team().filter((p) => p.status !== "Ausgeschieden")
    .sort((a, b) => darfKiNutzer(b) - darfKiNutzer(a)
      || ((rangVon(a) || {}).sortierung ?? 999) - ((rangVon(b) || {}).sortierung ?? 999)
      || personName(a.user_id).localeCompare(personName(b.user_id), "de"));
  const raenge = rangeSortiert();
  const schnitt = nutzung ? Object.entries(nutzung.schnitt).sort((a, b) => a[1].kosten - b[1].kosten) : [];
  const frage = nutzung && nutzung.schnitt.frage ? nutzung.schnitt.frage.kosten : null;
  const dollarFeld = (attrs) => html`<span class="ki-dollar-feld">$<input type="number" class="ki-limit-feld" step="0.01" inputmode="decimal" ${attrs} ${admin ? "" : "disabled"}></span>`;

  return html`
    <div class="card ki-budget">
      <div class="card-head">
        <div><h2>KI-Budget pro Monat</h2>
          <p class="muted small" style="margin:0">Jedes Mitglied hat ein Budget in US-Dollar pro Kalendermonat: <strong>Grundwert des Rangs</strong> + <strong>Abweichung</strong>.
            Abgerechnet wird, was jede Anfrage bei OpenRouter tatsächlich kostet. Darüber liegt der <strong>Kanzlei-Deckel</strong>: Ist er erreicht, antwortet Nigel bis zum Monatsersten niemandem mehr.
            ${admin ? "" : "Ändern kann nur der Admin."}</p></div>
        ${admin ? html`<button class="btn small" data-action="ki-nutzung-neu" title="Verbrauch neu laden">Verbrauch aktualisieren</button>` : ""}
      </div>

      <div class="kpis ki-budget-kpis">
        <div class="kpi ki-deckel">
          <span class="value">${dollarFeld(html`min="0" max="10000" value="${deckel.toFixed(2)}" data-change="ki-deckel" aria-label="Kanzlei-Deckel pro Monat in US-Dollar" title="Mehr gibt die Kanzlei im Monat nie aus"`)}</span>
          <span class="label">Kanzlei-Deckel / Monat</span>
        </div>
        <div class="kpi ${ueber ? "warn" : ""}" title="Summe der Budgets aller Mitglieder mit KI-Recht">
          <span class="value">${kiDollar(summe)}</span>
          <span class="label">Wenn alle ausschöpfen</span>
        </div>
        <div class="kpi" title="Mehr als der Deckel kann es nicht werden">
          <span class="value">${kiDollar(hoechstens)}</span>
          <span class="label">Höchstens ausgegeben</span>
        </div>
        ${admin ? html`<div class="kpi ${nutzung && nutzung.gesamt >= deckel ? "alert" : ""}">
          <span class="value">${nutzung ? kiDollar(nutzung.gesamt) : "…"}</span>
          <span class="label">Bisher diesen Monat${hochrechnung !== null ? html`<br>Hochrechnung ≈ ${kiDollar(hochrechnung)}` : ""}</span>
        </div>` : ""}
      </div>

      ${admin ? html`<div class="ki-balken ki-balken-gross" title="Verbrauch der Kanzlei im Verhältnis zum Deckel"><span style="width:${nutzung ? kiProzent(nutzung.gesamt, deckel) : 0}%"></span></div>` : ""}
      <p class="small ${ueber ? "" : "ok-text"}" style="margin:6px 0 14px">
        ${mitglieder.length === 0 ? "Noch kein Mitglied hat das KI-Recht."
          : ueber ? html`<strong>Die Budgets (${kiDollar(summe)}) sind größer als der Deckel (${kiDollar(deckel)}).</strong> Das ist erlaubt – dann greift der Deckel, und wer zuletzt kommt, bekommt nichts mehr.
              Soll jedes Mitglied sein Budget sicher nutzen können, die Budgets um ${kiDollar(kiCent(summe - deckel))} senken.`
          : html`✓ Alle ${anzahl(mitglieder.length, "Mitglied", "Mitglieder")} mit KI-Recht können ihr Budget voll nutzen – zusammen höchstens ${kiDollar(summe)}, ${kiDollar(kiCent(deckel - summe))} unter dem Deckel.`}
        ${admin && mitglieder.length ? html` <button class="btn small" data-action="ki-budget-verteilen" style="margin-left:6px">Deckel gleichmäßig verteilen</button>` : ""}
      </p>

      ${schnitt.length ? html`<p class="muted small" style="margin:0 0 14px"><strong>Was kostet eine Anfrage?</strong> (Ø der letzten 30 Tage)
        ${schnitt.map(([m, w], i) => html`${i ? " · " : ""}${KI_MODUS_NAMEN[m] || m} ≈ ${kiDollar(w.kosten)} <span title="Anzahl Anfragen">(${w.anzahl}×)</span>`)}
        ${frage ? html`<br>Beispiel: $1 reicht für etwa <strong>${Math.floor(1 / frage)}</strong> Rechtsfragen, der Deckel von ${kiDollar(deckel)} für etwa <strong>${Math.floor(deckel / frage)}</strong>.` : ""}</p>` : ""}

      <h3 class="section-title">Grundwert je Rang</h3>
      <div class="table-wrap"><table class="table ki-limit-tabelle">
        <thead><tr><th>Rang</th><th class="center">KI-Recht</th><th class="num">Mitglieder mit KI</th><th class="center">Budget / Mitglied</th><th class="num">Zusammen</th></tr></thead>
        <tbody>${raenge.map((r) => {
          const ki = hatRangRecht(r, "ki_assistent");
          const leute = mitglieder.filter((p) => p.rang_id === r.id);
          const zusammen = leute.reduce((s, p) => s + kiBudgetVon(p), 0);
          return html`<tr class="${ki ? "" : "gedimmt"}">
            <td><strong>${r.name}</strong></td>
            <td class="center">${ki ? html`<span class="badge ok">ja</span>` : html`<span class="badge">nein</span>`}</td>
            <td class="num">${leute.length}</td>
            <td class="center">${dollarFeld(html`min="0" max="1000" value="${rangKiBudget(r).toFixed(2)}" data-change="rang-ki-budget" data-id="${r.id}" aria-label="${r.name}: KI-Budget pro Monat"`)}</td>
            <td class="num">${leute.length ? kiDollar(zusammen) : "–"}</td>
          </tr>`;
        })}</tbody>
      </table></div>

      <h3 class="section-title" style="margin-top:18px">Budget je Mitglied</h3>
      <div class="table-wrap"><table class="table ki-limit-tabelle">
        <thead><tr><th>Mitglied</th><th>Rang</th><th class="center">KI-Recht</th><th class="num">Grundwert</th>
          <th class="center">Abweichung</th><th class="num">Budget / Monat</th>${admin ? html`<th class="num">Verbraucht</th><th class="num">Rest</th>` : ""}</tr></thead>
        <tbody>${liste.map((p) => {
          const r = rangVon(p);
          const ki = darfKiNutzer(p);
          const budget = kiBudgetVon(p);
          const offset = Number(p.ki_budget_offset) || 0;
          const verbraucht = nutzung ? nutzung.kosten[p.user_id] || 0 : null;
          return html`<tr class="${ki ? "" : "gedimmt"}">
            <td><span class="name-mit-avatar">${avatar(p.user_id)}<a href="#/team/${p.user_id}"><strong>${personName(p.user_id)}</strong></a></span>
              ${istAdminUser(p.user_id) ? html` <span class="badge alert">Admin</span>` : ""}</td>
            <td>${rangName(p) || html`<span class="muted">kein Rang</span>`}</td>
            <td class="center">${ki ? html`<span class="badge ok">ja</span>` : html`<span class="badge">nein</span>`}</td>
            <td class="num">${r ? kiDollar(rangKiBudget(r)) : html`<span class="muted" title="ohne Rang">$0.00</span>`}</td>
            <td class="center">${dollarFeld(html`min="-1000" max="1000" value="${offset.toFixed(2)}" data-change="ki-budget-offset" data-id="${p.user_id}" aria-label="${personName(p.user_id)}: Abweichung vom Grundwert in US-Dollar" title="Abweichung vom Grundwert des Rangs (+/−)"`)}</td>
            <td class="num"><strong>${kiDollar(budget)}</strong>${offset ? html` <span class="small ${offset > 0 ? "ok-text" : "danger-text"}">(${offset > 0 ? "+" : "−"}${kiDollar(Math.abs(offset))})</span>` : ""}</td>
            ${admin ? html`<td class="num ${ki && verbraucht !== null && verbraucht >= budget && budget > 0 ? "danger-text" : ""}">${verbraucht === null ? "…" : verbraucht ? html`${kiDollar(verbraucht)} <span class="muted small">(${nutzung.anfragen[p.user_id]}×)</span>` : "–"}</td>
              <td class="num">${verbraucht === null || !ki ? "–" : kiDollar(Math.max(0, budget - verbraucht))}</td>` : ""}
          </tr>`;
        })}</tbody>
      </table></div>
      <p class="muted small" style="margin:8px 0 0">Ein Budget von $0 sperrt die KI für das Mitglied, auch wenn der Rang sie erlaubt. Abgerechnet wird pro Kalendermonat (UTC); am 1. beginnt jedes Budget von vorn.
        Zusätzlich begrenzt „Max. Kosten pro Anfrage“ (Nigel → Einstellungen → Kanzlei-Vorgaben) jede einzelne Anfrage. Tipp: Bei OpenRouter dem Schlüssel zusätzlich ein Limit geben – als zweite Sicherung.</p>
    </div>`;
}

// Eingabe in US-Dollar (Komma oder Punkt), auf Cent gerundet; null bei ungültiger Eingabe
function kiDollarEingabe(el, min, max) {
  const wert = el.value === "" ? 0 : kiCent(String(el.value).replace(",", "."));
  return Number.isFinite(wert) && wert >= min && wert <= max ? wert : null;
}

CHANGES["ki-deckel"] = async (el) => {
  const wert = kiDollarEingabe(el, 0, 10000);
  if (wert === null) {
    toast("Bitte einen Betrag von 0 bis 10000 Dollar eingeben.", "error");
    el.value = kiDeckel().toFixed(2);
    return;
  }
  if (wert === kiDeckel()) return;
  await attempt(() => updateRow("einstellungen", 1, { ki_budget_monat: wert }), `Kanzlei-Deckel: ${kiDollar(wert)} pro Monat`);
};

CHANGES["rang-ki-budget"] = async (el) => {
  const r = byId("raenge", el.dataset.id);
  if (!r) return;
  const wert = kiDollarEingabe(el, 0, 1000);
  if (wert === null) {
    toast("Bitte einen Betrag von 0 bis 1000 Dollar eingeben.", "error");
    el.value = rangKiBudget(r).toFixed(2);
    return;
  }
  if (wert === rangKiBudget(r)) return;
  await attempt(() => updateRow("raenge", r.id, { ki_budget_monat: wert }), `${r.name}: KI-Budget ${kiDollar(wert)} pro Monat`);
};

CHANGES["ki-budget-offset"] = async (el) => {
  const p = profileOf(el.dataset.id);
  if (!p) return;
  const wert = kiDollarEingabe(el, -1000, 1000);
  if (wert === null) {
    toast("Bitte einen Betrag eingeben (z. B. 1.50 oder -0.50).", "error");
    el.value = (Number(p.ki_budget_offset) || 0).toFixed(2);
    return;
  }
  if (wert === (Number(p.ki_budget_offset) || 0)) return;
  await attempt(() => updateRow("profiles", p.user_id, { ki_budget_offset: wert }),
    `${personName(p.user_id)}: Abweichung ${wert > 0 ? "+" : wert < 0 ? "−" : ""}${kiDollar(Math.abs(wert))} → ${kiDollar(kiBudgetVon({ ...p, ki_budget_offset: wert }))} pro Monat`);
};

// Deckel gleichmäßig auf alle Mitglieder mit KI-Recht verteilen: Abweichungen auf 0,
// jeder Rang mit KI-Recht bekommt denselben Grundwert (abgerundet auf Cent)
ACTIONS["ki-budget-verteilen"] = async () => {
  const mitglieder = kiMitglieder();
  if (!mitglieder.length) return;
  const je = Math.floor((kiDeckel() / mitglieder.length) * 100) / 100;
  const ohneRang = mitglieder.filter((p) => !rangVon(p));
  if (!confirm(`Den Deckel von ${kiDollar(kiDeckel())} gleichmäßig verteilen?\n\nJedes der ${mitglieder.length} Mitglieder mit KI-Recht bekommt ${kiDollar(je)} pro Monat. `
    + `Alle Ränge mit KI-Recht erhalten diesen Grundwert, alle Abweichungen werden auf $0 gesetzt${ohneRang.length ? " (Mitglieder ohne Rang erhalten den Betrag als Abweichung)" : ""}.`)) return;
  await attempt(async () => {
    for (const r of rangeSortiert().filter((r) => hatRangRecht(r, "ki_assistent") && rangKiBudget(r) !== je)) {
      await updateRow("raenge", r.id, { ki_budget_monat: je });
    }
    for (const p of team().filter((p) => p.status !== "Ausgeschieden")) {
      const soll = rangVon(p) ? 0 : mitglieder.includes(p) ? je : 0;
      // Mitglieder mit Rang ohne KI-Recht behalten ihre Abweichung (wirkt ohnehin nicht)
      if (rangVon(p) && !mitglieder.includes(p)) continue;
      if ((Number(p.ki_budget_offset) || 0) !== soll) await updateRow("profiles", p.user_id, { ki_budget_offset: soll });
    }
  }, `Verteilt: ${kiDollar(je)} je Mitglied, zusammen ${kiDollar(kiCent(je * mitglieder.length))}`);
};

ACTIONS["ki-nutzung-neu"] = () => ladeKiNutzungMonat();

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
        <p class="small" style="margin:0"><code>/</code> Suche · <code>N</code> neue Akte · <code>B</code> Benachrichtigungen · <code>K</code> Nigel (KI-Butler) · <code>Esc</code> schließen</p>
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
            : rechteText(r).length ? rechteText(r).map((x) => html`<span class="badge ${x.voll ? "gold" : "blue"}">${x.label}: ${x.stufe}</span>`)
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
    if (hatRangRecht(r, rechtSchreiben(b))) out.push({ label: b.label, stufe: stufeSchreiben(b), voll: true });
    else if (!b.nurSchreiben && hatRangRecht(r, rechtLesen(b))) out.push({ label: b.label, stufe: stufeLesen(b) });
  }
  for (const x of SONDERRECHTE) if (hatRangRecht(r, x.key)) out.push({ label: x.label, stufe: "Bearbeiten", voll: true });
  return out;
}

function isMe2(a, b) {
  return a && b && String(a).toLowerCase() === String(b).toLowerCase();
}


// ---------- Accounts (Discord-Konten & Charaktere, nur Admin) ----------
ui.konten = null;

async function ladeKonten() {
  if (!state.isAdmin || ui.kontenLaedt) return;
  ui.kontenLaedt = true;
  const { data, error } = await db.rpc("admin_konten");
  ui.kontenLaedt = false;
  ui.konten = error
    ? { fehler: /PGRST202|Could not find the function/i.test(`${error.code} ${error.message}`)
        ? "Die Accounts sind in Supabase noch nicht eingerichtet (supabase-update-11.sql)." : errorText(error) }
    : data;
  scheduleRender();
}

// Offene Freigaben: je wartendem Charakter eine Zeile
function kontenOffen() {
  if (!ui.konten || ui.konten.fehler) return [];
  return ui.konten.personen.flatMap((p) => p.status === "gesperrt" ? [] : p.charaktere
    .filter((c) => c.status === "wartet")
    .map((c) => ({ p, c, erste: p.status !== "frei" })));
}

const findeCharakter = (id) => {
  for (const p of (ui.konten && ui.konten.personen) || []) {
    const c = p.charaktere.find((x) => x.id === id);
    if (c) return { p, c };
  }
  return {};
};
const findePerson = (id) => ((ui.konten && ui.konten.personen) || []).find((p) => p.user_id === id) || {};

function personStatusBadge(s) {
  return { wartet: html`<span class="badge gold">wartet</span>`, frei: html`<span class="badge ok">freigegeben</span>`,
    abgelehnt: html`<span class="badge geschlossen">abgelehnt</span>`, gesperrt: html`<span class="badge alert">gesperrt</span>` }[s] || s;
}

function discordAvatar(p) {
  return p.avatar_url ? html`<img src="${p.avatar_url}" alt="" class="discord-avatar klein">`
    : html`<span class="discord-avatar klein leer">${(p.discord_name || "?").slice(0, 1)}</span>`;
}

function tabKonten() {
  if (ui.konten === null) { ladeKonten(); return html`<div class="card"><p class="muted">Accounts werden geladen …</p></div>`; }
  if (ui.konten.fehler) return html`<div class="card"><p class="error">${ui.konten.fehler}</p></div>`;
  const offen = kontenOffen();
  const personen = ui.konten.personen;
  const ohne = ui.konten.ohne_discord;
  return html`
    <div class="card">
      <div class="card-head"><h2>Freigaben</h2>
        <button class="btn small" data-action="konten-laden">Aktualisieren</button></div>
      ${offen.length ? html`<div class="table-wrap"><table class="table">
        <thead><tr><th>Charakter</th><th>Discord</th><th>Art</th><th>Beantragt</th><th></th></tr></thead>
        <tbody>${offen.map(({ p, c, erste }) => html`<tr>
          <td><strong>${c.name}</strong></td>
          <td><span class="name-mit-avatar">${discordAvatar(p)}<span>${p.discord_name || "–"}
            ${p.discord_benutzer ? html`<div class="small muted">@${p.discord_benutzer}</div>` : ""}</span></span>
            ${p.server_mitglied || c.art === "mandant" ? "" : html` <span class="badge alert">nicht auf dem Server</span>`}</td>
          <td>${c.art === "mandant" ? html`<span class="badge mandant">Mandant</span>${c.notiz ? html`<div class="small muted">„${truncate(c.notiz, 80)}“</div>` : ""}`
            : erste ? "Registrierung" : html`Weiterer Charakter<div class="small muted">hat schon ${anzahl(p.charaktere.filter((x) => x.status === "frei").length, "Charakter", "Charaktere")}</div>`}</td>
          <td class="nowrap">${fmt.relativ(c.created_at)}</td>
          <td class="nowrap right">
            <button class="btn small primary" data-action="${c.art === "mandant" ? "zugang-freigeben" : "konto-freigeben"}" data-id="${c.id}">Freigeben</button>
            <button class="btn small danger" data-action="konto-ablehnen" data-id="${c.id}">Ablehnen</button></td>
        </tr>`)}</tbody></table></div>`
      : html`<p class="empty">Keine offenen Freigaben.</p>`}
    </div>

    <div class="card">
      <div class="card-head"><h2>Discord-Konten</h2><span class="muted small">${anzahl(personen.length, "Person", "Personen")}</span></div>
      ${personen.length ? html`<div class="table-wrap"><table class="table konten-tabelle">
        <thead><tr><th>Person</th><th>Status</th><th>Charaktere</th><th>Zuletzt aktiv</th><th></th></tr></thead>
        <tbody>${personen.map((p) => html`<tr>
          <td><span class="name-mit-avatar">${discordAvatar(p)}<span><strong>${p.discord_name || "–"}</strong>
            ${p.ich ? html` <span class="badge gold">Du</span>` : ""}${p.ist_admin ? html` <span class="badge alert">Admin</span>` : ""}
            <div class="small muted">${p.discord_benutzer ? `@${p.discord_benutzer}` : ""}${p.email ? ` · ${p.email}` : ""}</div></span></span>
            ${p.server_mitglied || p.charaktere.every((c) => c.art === "mandant") ? "" : html`<div><span class="badge alert">nicht auf dem Server</span></div>`}</td>
          <td>${personStatusBadge(p.status)}</td>
          <td>${p.charaktere.length ? p.charaktere.map((c) => html`<div class="konto-char">
              <span>${c.user_id && c.art !== "mandant" ? html`<a href="#/team/${c.user_id}">${c.name}</a>` : c.name}</span>
              <span class="small muted">${c.art === "mandant"
                ? html`Mandant${c.mandant_id ? html` · <a href="#/mandanten/${c.mandant_id}">${c.mandant_name || "Kartei"}</a>` : ""}`
                : c.rang || ""}</span>
              ${charakterStatusBadge({ ...c, aktiv: false })}
              ${c.status === "frei" && !p.ich ? html`<button class="link-btn small" data-action="konto-charakter" data-id="${c.id}" data-aktion="sperren">sperren</button>` : ""}
              ${c.status === "gesperrt" ? html`<button class="link-btn small" data-action="konto-charakter" data-id="${c.id}" data-aktion="entsperren">entsperren</button>` : ""}
            </div>`) : html`<span class="muted">–</span>`}</td>
          <td class="nowrap small">${p.letzte_anmeldung ? fmt.relativ(p.letzte_anmeldung) : "noch nie"}</td>
          <td class="nowrap right">${p.ich ? "" : html`
            ${p.status === "gesperrt"
              ? html`<button class="btn small" data-action="konto-person" data-id="${p.user_id}" data-aktion="entsperren">Entsperren</button>`
              : p.status === "abgelehnt"
                ? html`<button class="btn small" data-action="konto-person" data-id="${p.user_id}" data-aktion="freigeben">Doch freigeben</button>`
                : html`<button class="btn small danger" data-action="konto-person" data-id="${p.user_id}" data-aktion="sperren">Sperren</button>`}
            ${p.status === "frei" ? html`<button class="btn small" data-action="konto-person" data-id="${p.user_id}" data-aktion="${p.ist_admin ? "kein_admin" : "admin"}">${p.ist_admin ? "Admin entziehen" : "Zum Admin"}</button>` : ""}`}</td>
        </tr>`)}</tbody></table></div>`
      : html`<p class="empty">Noch hat sich niemand mit Discord angemeldet.</p>`}
    </div>

    <div class="card">
      <div class="card-head"><h2>Noch nicht mit Discord verknüpft</h2></div>
      <p class="small muted">Diese Mitglieder melden sich noch mit E-Mail und Passwort an. Zum Verknüpfen: mit Discord anmelden und
        „Bestehenden Charakter übernehmen“ wählen (danach gelten die alten Zugangsdaten nicht mehr).</p>
      ${ohne.length ? html`<div class="table-wrap"><table class="table">
        <thead><tr><th>Mitglied</th><th>Login</th><th>Status</th><th>Zuletzt angemeldet</th></tr></thead>
        <tbody>${ohne.map((u) => html`<tr>
          <td><a href="#/team/${u.user_id}"><strong>${u.name}</strong></a>${u.ist_admin ? html` <span class="badge alert">Admin</span>` : ""}</td>
          <td class="small">${u.email}</td>
          <td>${statusBadgeP(u.profil_status)}${u.gesperrt ? html` <span class="badge geschlossen">gesperrt</span>` : ""}</td>
          <td class="nowrap small">${u.letzte_anmeldung ? fmt.relativ(u.letzte_anmeldung) : "noch nie"}</td>
        </tr>`)}</tbody></table></div>`
      : html`<p class="empty">Alle Mitglieder sind mit Discord verknüpft.</p>`}
    </div>`;
}

async function kontoAktion(rpc, args, ok) {
  const { error } = await db.rpc(rpc, args);
  if (error) throw error;
  toast(ok);
  ui.konten = null;
  ui.adminUsers = null;
  await neuLaden(["profiles"]);
}

const KONTO_TEXTE = {
  sperren: ["sperren", "gesperrt"], entsperren: ["entsperren", "entsperrt"], freigeben: ["freigeben", "freigegeben"],
  admin: ["zum Admin machen (gilt für alle Charaktere)", "ist jetzt Admin"], kein_admin: ["die Admin-Rechte entziehen", "ist kein Admin mehr"],
};

// ---------- Aktionen ----------
Object.assign(ACTIONS, {
  "konten-laden": () => { ui.konten = null; render(); },
  "konto-freigeben": (d) => {
    const { p, c } = findeCharakter(d.id);
    if (!c) return;
    openForm({
      title: `${c.name} freigeben`,
      intro: p.status !== "frei"
        ? html`Damit ist auch die Registrierung von <strong>${p.discord_name || "dieser Person"}</strong> freigegeben.`
        : html`Weiterer Charakter von <strong>${p.discord_name || "dieser Person"}</strong>.`,
      fields: [{ name: "rang_id", label: "Rang", type: "select", emptyLabel: "— kein Rang (keine Rechte) —",
        options: () => vergebbareRaenge().map((r) => ({ value: r.id, label: r.name })),
        help: "Kann später unter Personal geändert werden." }],
      submitLabel: "Freigeben",
      onSubmit: (v) => kontoAktion("admin_charakter", { p_charakter: c.id, p_aktion: "freigeben", p_rang: v.rang_id || null },
        `${c.name} ist freigegeben`),
    });
  },
  "konto-ablehnen": async (d) => {
    const { p, c } = findeCharakter(d.id);
    if (!c || !confirm(`${c.name} ablehnen?`)) return;
    // Erste Registrierung: die ganze Person ablehnen, sonst nur den Charakter
    await attempt(() => p.status !== "frei"
      ? kontoAktion("admin_person", { p_person: p.user_id, p_aktion: "ablehnen" }, "Registrierung abgelehnt")
      : kontoAktion("admin_charakter", { p_charakter: c.id, p_aktion: "ablehnen" }, `${c.name} abgelehnt`));
  },
  "konto-person": async (d) => {
    const p = findePerson(d.id);
    const [frage, fertig] = KONTO_TEXTE[d.aktion] || [d.aktion, "erledigt"];
    const name = p.discord_name || "Person";
    const zusatz = d.aktion === "sperren" ? "\n\nAlle Charaktere dieser Person werden gesperrt." : "";
    if (!confirm(`${name} ${frage}?${zusatz}`)) return;
    await attempt(() => kontoAktion("admin_person", { p_person: d.id, p_aktion: d.aktion }, `${name} ${fertig}`));
  },
  "konto-charakter": async (d) => {
    const { c } = findeCharakter(d.id);
    if (!c) return;
    const [frage, fertig] = KONTO_TEXTE[d.aktion];
    if (!confirm(`${c.name} ${frage}?`)) return;
    await attempt(() => kontoAktion("admin_charakter", { p_charakter: d.id, p_aktion: d.aktion }, `${c.name} ${fertig}`));
  },
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
  // Bearbeiten/Verwenden schließt Lesen/Sehen ein – beides wird zusammen gesetzt bzw. entzogen
  const bereich = BEREICHE.find((b) => !b.nurSchreiben && (rechtLesen(b) === key || rechtSchreiben(b) === key));
  if (el.checked) {
    set.add(key);
    if (bereich && key === rechtSchreiben(bereich)) set.add(rechtLesen(bereich));
  } else {
    set.delete(key);
    if (bereich && key === rechtLesen(bereich)) set.delete(rechtSchreiben(bereich));
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
