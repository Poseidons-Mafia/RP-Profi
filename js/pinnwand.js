// =============================================================
//  Wiwang Law – Pinnwand & Team heute (beides auf der Übersicht)
//  Ankündigungen für alle (optional mit Lesebestätigung) und wer
//  gerade da ist, woran er sitzt und wie viel er auf dem Tisch hat.
//  Schreiben darf jedes Mitglied; ändern/löschen der Verfasser und
//  Ränge mit „Kanzlei-Einstellungen bearbeiten“.
// =============================================================

function pinnwandAktuell(b) {
  return !b.bis || parseDate(b.bis) >= startOfDay();
}

function hatBestaetigt(beitragId, userId) {
  return state.pinnwand_gelesen.some((g) => g.beitrag_id === beitragId && g.user_id === userId);
}

// Beiträge, die ich noch bestätigen soll (für Badge und Übersicht)
function pinnwandOffen() {
  if (!state.me) return [];
  return state.pinnwand.filter((b) => b.bestaetigen && pinnwandAktuell(b) && b.created_by !== state.me.id
    && !hatBestaetigt(b.id, state.me.id));
}

function pinnwandSortiert(list) {
  return [...list].sort((a, b) => (b.angeheftet ? 1 : 0) - (a.angeheftet ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at));
}

function darfBeitragAendern(b) {
  return isMe(b.created_by) || darf("einstellungen_schreiben");
}

// Wer soll bestätigen? Alle aktiven Mitglieder außer dem Verfasser
function bestaetigungStand(b) {
  const soll = state.profiles.filter((p) => p.status !== "Ausgeschieden" && p.user_id !== b.created_by);
  const ja = soll.filter((p) => hatBestaetigt(b.id, p.user_id));
  return { soll, ja, fehlt: soll.filter((p) => !hatBestaetigt(b.id, p.user_id)) };
}

// Text sicher ausgeben, Links anklickbar machen
function textMitLinks(text) {
  const s = esc(text).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)"'\]]/g,
    (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
  return new SafeHtml(s.replace(/\n/g, "<br>"));
}

function beitragKarte(b) {
  const st = b.bestaetigen ? bestaetigungStand(b) : null;
  const ichSoll = st && b.created_by !== state.me.id && st.soll.some((p) => p.user_id === state.me.id);
  const ichHab = hatBestaetigt(b.id, state.me.id);
  const zeigeFehlt = st && st.fehlt.length && (isMe(b.created_by) || darf("einstellungen_schreiben"));
  return html`
    <article class="beitrag ${b.wichtig ? "wichtig" : ""} ${b.angeheftet ? "angeheftet" : ""}">
      <div class="beitrag-kopf">
        ${b.von_nigel ? nigelAvatar({ gross: true }) : avatar(b.created_by)}
        <div class="grow">
          <div class="badges">
            ${b.angeheftet ? html`<span class="badge haft">Angeheftet</span>` : ""}
            ${b.wichtig ? html`<span class="badge alert">Wichtig</span>` : ""}
            ${ichSoll && !ichHab ? html`<span class="badge offen">Bitte bestätigen</span>` : ""}
          </div>
          <h3>${b.titel}</h3>
          <div class="meta">${b.von_nigel ? `Nigel · im Auftrag von ${personName(b.created_by)}` : personName(b.created_by)} · ${fmt.relativ(b.created_at)}${b.updated_at && new Date(b.updated_at) - new Date(b.created_at) > 60000 ? " · bearbeitet" : ""}${b.bis ? ` · bis ${fmt.datum(b.bis)}` : ""}</div>
        </div>
        ${darfBeitragAendern(b) ? html`<button class="icon-btn" title="Bearbeiten" data-action="pinnwand-bearbeiten" data-id="${b.id}">✎</button>` : ""}
      </div>
      ${b.text ? html`<div class="beitrag-text">${textMitLinks(b.text)}</div>` : ""}
      ${st ? html`
        <div class="beitrag-fuss">
          ${ichSoll ? ichHab
            ? html`<span class="ok-text small">✓ Von dir bestätigt</span>`
            : html`<button class="btn small gold" data-action="pinnwand-bestaetigen" data-id="${b.id}">Gelesen & verstanden</button>` : ""}
          <span class="small muted">${st.ja.length} von ${st.soll.length} bestätigt</span>
          ${st.ja.length ? html`<span class="avatars" title="Bestätigt: ${st.ja.map((p) => personName(p.user_id)).join(", ")}">${st.ja.slice(0, 8).map((p) => avatar(p.user_id, { punkt: false }))}</span>` : ""}
          ${zeigeFehlt ? html`<span class="small muted">Fehlt noch: ${st.fehlt.map((p) => personName(p.user_id)).join(", ")}</span>` : ""}
        </div>` : ""}
    </article>`;
}

// ---------- Team heute ----------
function teamHeute() {
  const heute = new Date();
  const mitglieder = team().filter((p) => p.status !== "Ausgeschieden").sort((a, b) =>
    (onlineStatus(b.user_id) === "online") - (onlineStatus(a.user_id) === "online")
    || !!onlineStatus(b.user_id) - !!onlineStatus(a.user_id)
    || ((rangVon(a) || {}).sortierung ?? 999) - ((rangVon(b) || {}).sortierung ?? 999)
    || personName(a.user_id).localeCompare(personName(b.user_id), "de"));
  const online = mitglieder.filter((p) => onlineStatus(p.user_id)).length;
  const akten = darf("akten_lesen"), termine = darf("termine_lesen");
  return html`
    <div class="card" id="team-heute">
      <div class="card-head"><h2>Team heute</h2><span class="muted small">${online} online</span></div>
      <ul class="rows team-rows">${mitglieder.map((p) => {
        const id = p.user_id;
        const o = state.online.get(id);
        const wo = o ? [...o.akten].map((x) => byId("akten", x)).filter(Boolean)[0] : null;
        const nAkten = state.akten.filter((a) => a.zustaendig_id === id && a.status !== "Geschlossen").length;
        const aufg = state.aufgaben.filter((t) => !t.erledigt && t.zustaendig === id);
        const ueber = aufg.filter(aufgabeUeberfaellig).length;
        const nHeute = state.termine.filter((t) => !t.erledigt && t.verantwortlich === id && sameDay(t.beginn, heute)).length;
        return html`<li>
          ${avatar(id, { gross: true })}
          <div class="grow">
            <div class="title"><a href="#/team/${id}">${personName(id)}</a>
              ${id === state.me.id ? html`<span class="badge gold">Du</span>` : ""}
              ${p.status && p.status !== "Aktiv" ? statusBadgeP(p.status) : ""}</div>
            <div class="meta">${joinHtml([
              rangName(p) || null,
              o ? (o.weg ? "online (im Hintergrund)" : wo ? html`<span class="ok-text">online</span> · in <a href="#/akten/${wo.id}">${wo.number}</a>` : html`<span class="ok-text">online</span>`) : null,
            ])}</div>
            ${akten || termine ? html`<div class="meta">${joinHtml([
              akten ? `${nAkten} ${nAkten === 1 ? "Akte" : "Akten"}` : null,
              termine ? `${aufg.length} ${aufg.length === 1 ? "Aufgabe" : "Aufgaben"}` : null,
              termine && ueber ? html`<span class="danger-text">${ueber} überfällig</span>` : null,
              termine && nHeute ? `${nHeute} ${nHeute === 1 ? "Termin" : "Termine"} heute` : null,
            ])}</div>` : ""}
          </div>
        </li>`;
      })}</ul>
      <p class="small muted" style="margin:10px 0 0">Bei Urlaub oder Krankheit: In der Personalakte „Arbeit übergeben“ – Akten, Aufgaben und Termine gehen dann in einem Schritt an eine Vertretung.</p>
    </div>`;
}

// ---------- Pinnwand-Karte auf der Übersicht ----------
// Angeheftete und noch zu bestätigende Beiträge stehen immer oben; der Rest ist aufklappbar.
const PINNWAND_KURZ = 3;
function pinnwandKarte() {
  const archiv = ui.pinnwand.archiv;
  const aktuell = state.pinnwand.filter(pinnwandAktuell);
  const imArchiv = state.pinnwand.length - aktuell.length;
  const offenIds = new Set(pinnwandOffen().map((b) => b.id));
  const list = archiv ? pinnwandSortiert(state.pinnwand.filter((b) => !pinnwandAktuell(b)))
    : [...pinnwandSortiert(aktuell)].sort((a, b) => offenIds.has(b.id) - offenIds.has(a.id));
  // Eingeklappt: mindestens die ersten 3, dazu alles Angeheftete und Unbestätigte
  const kurz = list.filter((b, i) => i < PINNWAND_KURZ || b.angeheftet || offenIds.has(b.id));
  const zeigen = ui.pinnwand.alle || archiv ? list : kurz;
  const mehr = list.length - zeigen.length;
  return html`
    <div class="card pinnwand-karte" id="pinnwand">
      <div class="card-head">
        <div><h2>Pinnwand</h2>
          <p class="muted small" style="margin:0">Ankündigungen und Dienstanweisungen für alle${offenIds.size ? html` · <strong class="danger-text">${offenIds.size} ${offenIds.size === 1 ? "wartet" : "warten"} auf deine Bestätigung</strong>` : ""}</p></div>
        <div class="actions-row">
          ${imArchiv || archiv ? html`<div class="chips">
            <button class="chip ${archiv ? "" : "active"}" data-action="pinnwand-archiv" data-archiv="0">Aktuell</button>
            <button class="chip ${archiv ? "active" : ""}" data-action="pinnwand-archiv" data-archiv="1">Archiv${imArchiv ? ` (${imArchiv})` : ""}</button>
          </div>` : ""}
          <button class="btn small primary" data-action="pinnwand-neu">+ Beitrag</button>
        </div>
      </div>
      ${zeigen.length ? html`<div class="stack">${zeigen.map((b) => beitragKarte(b))}</div>`
        : html`<p class="empty">${archiv ? "Hier landen Beiträge, deren „Sichtbar bis“-Datum vorbei ist." : "Noch nichts angepinnt – neue Dienstzeiten, Regeln, Erfolge, Termine fürs ganze Team: alles, was alle wissen sollen."}</p>`}
      ${mehr > 0 ? html`<div class="actions-row" style="margin-top:10px"><button class="btn small" data-action="pinnwand-alle" data-alle="1">${mehr === 1 ? "1 weiteren Beitrag" : `${mehr} weitere Beiträge`} anzeigen</button></div>`
        : ui.pinnwand.alle && !archiv && list.length > kurz.length ? html`<div class="actions-row" style="margin-top:10px"><button class="btn small" data-action="pinnwand-alle" data-alle="0">Weniger anzeigen</button></div>` : ""}
    </div>`;
}

// ---------- Formular ----------
function openBeitragForm(b) {
  openForm({
    title: b ? "Beitrag bearbeiten" : "Neuer Beitrag an der Pinnwand",
    intro: b ? "" : "Alle aktiven Mitglieder werden benachrichtigt.",
    fields: [
      { name: "titel", label: "Überschrift", required: true, placeholder: "z. B. Neue Dienstzeiten ab Montag" },
      { name: "text", label: "Text", type: "textarea", rows: 7, placeholder: "Was soll das Team wissen? Links werden anklickbar." },
      { name: "wichtig", label: "Wichtig (rot)", type: "checkbox", third: true },
      { name: "angeheftet", label: "Oben anheften", type: "checkbox", third: true },
      { name: "bestaetigen", label: "Lesebestätigung erbitten", type: "checkbox", third: true },
      { name: "bis", label: "Sichtbar bis (optional)", type: "date", half: true, help: "Danach wandert der Beitrag ins Archiv." },
    ],
    values: b || {},
    submitLabel: b ? "Speichern" : "Anpinnen",
    onSubmit: async (v) => {
      if (b) await updateRow("pinnwand", b.id, v);
      else await insertRow("pinnwand", v);
      toast(b ? "Beitrag gespeichert" : "Beitrag angepinnt – das Team wird benachrichtigt");
    },
    onDelete: b ? async () => {
      if (!confirm(`Beitrag „${b.titel}“ für alle löschen?`)) return false;
      await deleteRow("pinnwand", b.id);
      state.pinnwand_gelesen = state.pinnwand_gelesen.filter((g) => g.beitrag_id !== b.id);
      toast("Beitrag gelöscht");
    } : null,
  });
}

Object.assign(ACTIONS, {
  "pinnwand-neu": () => openBeitragForm(null),
  "pinnwand-bearbeiten": (d) => {
    const b = byId("pinnwand", d.id);
    if (b && darfBeitragAendern(b)) openBeitragForm(b);
  },
  "pinnwand-archiv": (d) => { ui.pinnwand.archiv = d.archiv === "1"; render(); },
  "pinnwand-alle": (d) => { ui.pinnwand.alle = d.alle === "1"; render(); },
  "pinnwand-bestaetigen": async (d) => {
    if (hatBestaetigt(d.id, state.me.id)) return;
    await attempt(() => insertRow("pinnwand_gelesen", { beitrag_id: d.id }), "Danke – als gelesen bestätigt");
  },
});
