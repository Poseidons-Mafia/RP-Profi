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
  // Angeheftet zuerst, dann „Wichtig“, dann das Neueste
  return [...list].sort((a, b) => (b.angeheftet ? 1 : 0) - (a.angeheftet ? 1 : 0) || (b.wichtig ? 1 : 0) - (a.wichtig ? 1 : 0)
    || new Date(b.created_at) - new Date(a.created_at));
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

// „Al Abadi Al Majdoub“ → „Al Abadi“ (kurz für die Signatur)
function kurzName(name) {
  const teile = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (teile.length < 2) return teile[0] || "";
  return teile[0].length <= 2 ? `${teile[0]} ${teile[1]}` : teile[0];
}

function beitragKarte(b, { featured = false } = {}) {
  const st = b.bestaetigen ? bestaetigungStand(b) : null;
  const ichSoll = st && b.created_by !== state.me.id && st.soll.some((p) => p.user_id === state.me.id);
  const ichHab = hatBestaetigt(b.id, state.me.id);
  const zeigeFehlt = st && st.fehlt.length && (isMe(b.created_by) || darf("einstellungen_schreiben"));
  const pct = st && st.soll.length ? Math.round((st.ja.length / st.soll.length) * 100) : 0;
  const autor = personName(b.created_by);
  const signLang = b.von_nigel ? `Nigel · im Auftrag von ${autor}` : autor;
  const signKurz = b.von_nigel ? `Nigel · i. A. ${kurzName(autor)}` : autor;
  const zusatz = [fmt.relativ(b.created_at),
    b.updated_at && new Date(b.updated_at) - new Date(b.created_at) > 60000 ? "bearbeitet" : "",
    b.bis ? `bis ${fmt.datum(b.bis)}` : ""].filter(Boolean).join(" · ");
  const badges = b.angeheftet || b.wichtig || (ichSoll && !ichHab);
  const offen = ui.pinnwand.offen && ui.pinnwand.offen.has(b.id);
  return html`
    <article data-live="pinnwand:${b.id}" data-beitrag="${b.id}" class="beitrag pinnwand-post ${featured ? "pinnwand-post--featured" : ""} ${b.wichtig ? "wichtig" : ""} ${b.angeheftet ? "angeheftet" : ""} ${b.von_nigel ? "nigel-post" : ""} ${ichSoll && !ichHab ? "offen" : ""} ${offen ? "is-expanded" : ""}">
      ${badges || darfBeitragAendern(b) ? html`<div class="beitrag-dach">
        <div class="badges">
          ${b.angeheftet ? html`<span class="badge angeheftet" title="Oben angeheftet">📌 Angeheftet</span>` : ""}
          ${b.wichtig ? html`<span class="badge alert">Wichtig</span>` : ""}
          ${ichSoll && !ichHab ? html`<span class="badge gold">Bitte bestätigen</span>` : ""}
        </div>
        ${darfBeitragAendern(b) ? html`<button class="icon-btn beitrag-edit" title="Bearbeiten" aria-label="Beitrag bearbeiten" data-action="pinnwand-bearbeiten" data-id="${b.id}">✎</button>` : ""}
      </div>` : ""}
      <h3 class="beitrag-titel">${b.titel}</h3>
      ${b.text ? html`<div class="beitrag-text pinnwand-body">${textMitLinks(b.text)}</div>
        <button type="button" class="link-btn mehr-lesen" data-action="pinnwand-mehr" data-id="${b.id}" hidden>${offen ? "Weniger anzeigen ↑" : "Mehr lesen ↓"}</button>` : ""}
      <div class="beitrag-signatur" title="${signLang} · ${zusatz}">
        ${b.von_nigel ? nigelAvatar() : avatar(b.created_by, { punkt: false })}
        <span class="beitrag-signatur-text">${signKurz} · ${zusatz}</span>
      </div>
      ${st ? html`
        <div class="beitrag-fuss">
          ${ichSoll ? ichHab
            ? html`<span class="ok-text small">✓ Von dir bestätigt</span>`
            : html`<button class="btn small bestaetigen" data-action="pinnwand-bestaetigen" data-id="${b.id}">✓ Gelesen & verstanden</button>` : ""}
          <span class="lese-stand" title="${st.ja.length ? `Bestätigt: ${st.ja.map((p) => personName(p.user_id)).join(", ")}` : "Noch niemand hat bestätigt"}">
            <span class="fortschritt ${pct === 100 ? "fertig" : ""}"><span style="width:${pct}%"></span></span>
            <span class="small muted tabular-nums">${st.ja.length} von ${st.soll.length} bestätigt</span>
          </span>
          ${zeigeFehlt ? html`<span class="small muted fehlt-noch">Fehlt noch: ${st.fehlt.map((p) => personName(p.user_id)).join(", ")}</span>` : ""}
        </div>` : ""}
    </article>`;
}

// Nach dem Rendern: „Mehr lesen“ nur dort zeigen, wo der Text wirklich abgeschnitten ist
function pinnwandUeberlaufPruefen() {
  document.querySelectorAll("#main .pinnwand-post").forEach((post) => {
    const body = post.querySelector(".pinnwand-body");
    const btn = post.querySelector(".mehr-lesen");
    if (!body || !btn) return;
    btn.hidden = !(post.classList.contains("is-expanded") || body.scrollHeight > body.clientHeight + 2);
  });
}
RENDER_HOOKS.push((route) => { if (route.page === "uebersicht") pinnwandUeberlaufPruefen(); });
let pinnwandResizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(pinnwandResizeTimer);
  pinnwandResizeTimer = setTimeout(pinnwandUeberlaufPruefen, 150);
});

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
    <section class="card team-karte" id="team-heute">
      <div class="card-head"><h2>Team heute</h2><span class="muted small"><span class="live-punkt"></span>${online} online</span></div>
      <ul class="team-liste">${mitglieder.map((p) => {
        const id = p.user_id;
        const o = state.online.get(id);
        const wo = o ? [...o.akten].map((x) => byId("akten", x)).filter(Boolean)[0] : null;
        const nAkten = state.akten.filter((a) => a.zustaendig_id === id && a.status !== "Geschlossen").length;
        const aufg = state.aufgaben.filter((t) => !t.erledigt && t.zustaendig === id);
        const ueber = aufg.filter(aufgabeUeberfaellig).length;
        const nHeute = state.termine.filter((t) => !t.erledigt && t.verantwortlich === id && sameDay(t.beginn, heute)).length;
        const abwesend = p.status && p.status !== "Aktiv";
        return html`<li class="${o ? "ist-online" : ""} ${abwesend ? "abwesend" : ""}">
          ${avatar(id)}
          <div class="grow">
            <div class="team-name"><a href="#/team/${id}">${personName(id)}</a>${id === state.me.id ? html` <span class="badge gold">Du</span>` : ""}</div>
            <div class="team-meta">${joinHtml([
              abwesend ? html`<span class="status-punkt urlaub"></span>${p.status}` : o ? (o.weg ? "im Hintergrund" : wo ? html`in <a href="#/akten/${wo.id}" class="mono">${wo.number}</a>` : "online") : rangName(p) || null,
            ])}</div>
          </div>
          <span class="team-zaehler">
            ${akten && nAkten ? html`<span class="zaehler" title="${nAkten} aktive ${nAkten === 1 ? "Akte" : "Akten"}">${navIcon("akten")}${nAkten}</span>` : ""}
            ${termine && nHeute ? html`<span class="zaehler" title="${nHeute} ${nHeute === 1 ? "Termin" : "Termine"} heute">${navIcon("kalender")}${nHeute}</span>` : ""}
            ${termine && ueber ? html`<span class="zaehler rot" title="${ueber} überfällige ${ueber === 1 ? "Aufgabe" : "Aufgaben"}">!${ueber}</span>` : ""}
          </span>
        </li>`;
      })}</ul>
      <p class="small muted team-hinweis">Urlaub oder krank? In der Personalakte „Arbeit übergeben“ – Akten, Aufgaben und Termine gehen in einem Schritt an eine Vertretung.</p>
    </section>`;
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
        <div><h2>${archiv ? "Pinnwand – Archiv" : "Pinnwand"}</h2>
          ${offenIds.size ? html`<p class="small pinnwand-offen">${offenIds.size} ${offenIds.size === 1 ? "wartet" : "warten"} auf deine Bestätigung</p>` : ""}</div>
        <button class="btn small" data-action="pinnwand-neu" title="Neuer Beitrag an der Pinnwand">+ Beitrag</button>
      </div>
      ${zeigen.length ? html`<div class="beitrag-liste">${zeigen.map((b, i) => beitragKarte(b, { featured: i === 0 }))}</div>`
        : html`<p class="empty">${archiv ? "Hier landen Beiträge, deren „Sichtbar bis“-Datum vorbei ist." : "Noch nichts angepinnt – neue Dienstzeiten, Regeln, Erfolge, Termine fürs ganze Team: alles, was alle wissen sollen."}</p>`}
      <div class="pinnwand-fuss">
        ${mehr > 0 ? html`<button class="link-btn" data-action="pinnwand-alle" data-alle="1">${mehr === 1 ? "1 weiteren Beitrag" : `${mehr} weitere Beiträge`} anzeigen</button>`
          : ui.pinnwand.alle && !archiv && list.length > kurz.length ? html`<button class="link-btn" data-action="pinnwand-alle" data-alle="0">Weniger anzeigen</button>` : ""}
        <span class="spacer"></span>
        ${archiv ? html`<button class="link-btn" data-action="pinnwand-archiv" data-archiv="0">← Zurück zu aktuell</button>`
          : imArchiv ? html`<button class="link-btn" data-action="pinnwand-archiv" data-archiv="1">Archiv (${imArchiv}) →</button>` : ""}
      </div>
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
  "pinnwand-mehr": (d) => {
    ui.pinnwand.offen = ui.pinnwand.offen || new Set();
    const auf = !ui.pinnwand.offen.has(d.id);
    if (auf) ui.pinnwand.offen.add(d.id); else ui.pinnwand.offen.delete(d.id);
    const post = document.querySelector(`#main .pinnwand-post[data-beitrag="${CSS.escape(d.id)}"]`);
    if (!post) { render(); return; }
    post.classList.toggle("is-expanded", auf);
    const btn = post.querySelector(".mehr-lesen");
    if (btn) btn.textContent = auf ? "Weniger anzeigen ↑" : "Mehr lesen ↓";
    pinnwandUeberlaufPruefen();
  },
  "pinnwand-bestaetigen": async (d) => {
    if (hatBestaetigt(d.id, state.me.id)) return;
    await attempt(() => insertRow("pinnwand_gelesen", { beitrag_id: d.id }), "Danke – als gelesen bestätigt");
  },
});
