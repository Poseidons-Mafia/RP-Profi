// =============================================================
//  Wiwang Law – Mandantenportal
//
//  Ist ein MANDANTEN-Charakter angemeldet, sieht er statt des
//  Aktensystems nur dieses Portal. Alle Daten kommen aus einer
//  einzigen Datenbank-Funktion (portal_daten), die genau das
//  herausgibt, was der Mandant sehen darf: seine Akten (bzw. die,
//  für die er freigeschaltet ist), freigegebene Mitteilungen und
//  Dokumente, Termine ohne interne Fristen, seine Rechnungen.
//
//  Adressen: #/ Übersicht · #/akten · #/akte/<id> · #/termine ·
//            #/dokumente · #/rechnungen · #/anliegen · #/daten
//
//  Update 20 (Mandantenportal 2.0): Anliegen an die Kanzlei (Notruf,
//  neue Angelegenheit, Rückruf), Zahlung melden, Bewertung abgeschlossener
//  Akten, Termine mit Kalender-Export (.ics), alle Dokumente auf einen
//  Blick, Fortschrittsanzeige je Akte.
// =============================================================

const portal = {
  aktiv: false,
  daten: null,
  gesehen: null,            // vorheriger Besuch (für "neu")
  hinweise: [],             // Benachrichtigungen des Mandanten
  kanal: null,
  entwurf: {},              // Nachrichten-Entwürfe je Akte
};

const PORTAL_NAV = [
  { page: "", label: "Übersicht" },
  { page: "akten", label: "Meine Akten" },
  { page: "termine", label: "Termine" },
  { page: "dokumente", label: "Dokumente" },
  { page: "rechnungen", label: "Rechnungen" },
  { page: "anliegen", label: "Anliegen" },
  { page: "daten", label: "Meine Daten" },
];

// ---------- Start / Laden ----------
async function portalStarten() {
  portal.aktiv = true;
  showScreen("loading");
  $("loading-text").textContent = "Mandantenportal wird geladen …";
  try {
    const { data: vorher, error: e1 } = await db.rpc("portal_gesehen");
    if (e1) throw e1;
    portal.gesehen = vorher;
    await portalLaden();
  } catch (e) {
    console.error(e);
    if (isMissingSchema(e)) { showScreen("update"); return; }
    $("loading-text").textContent = "Das Mandantenportal konnte nicht geladen werden: " + errorText(e);
    return;
  }
  portalLive();
  showScreen("portal");
  portalRender();
}

async function portalLaden() {
  const [{ data, error }, hinweise] = await Promise.all([
    db.rpc("portal_daten"),
    db.from("benachrichtigungen").select("*").order("zeit", { ascending: false }).limit(50),
  ]);
  if (error) throw error;
  portal.daten = data;
  portal.hinweise = hinweise.error ? [] : hinweise.data;
  // Währung, Haft-Einheit, Briefkopf für Rechnungen
  const k = data.kanzlei || {};
  state.settings = { ...DEFAULT_SETTINGS };
  for (const [key, val] of Object.entries(k)) if (val !== null && val !== undefined && val !== "") state.settings[key] = val;
}

async function portalNeuLaden() {
  try { await portalLaden(); portalRender(); } catch (e) { console.warn(e); }
}

// Neue Hinweise kommen live (die Datenbank zeigt jedem nur seine eigenen)
function portalLive() {
  portalStoppen();
  portal.kanal = db.channel("wiwang-portal")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "benachrichtigungen" }, (p) => {
      if (!p.new || p.new.user_id !== state.me.id) return;
      toast(truncate(p.new.text, 160));
      portalNeuLaden();
    })
    .subscribe();
}

function portalStoppen() {
  if (portal.kanal && db) db.removeChannel(portal.kanal);
  portal.kanal = null;
}

// Nach längerer Abwesenheit frisch laden
document.addEventListener("visibilitychange", () => {
  if (portal.aktiv && document.visibilityState === "visible") portalNeuLaden();
});

window.addEventListener("hashchange", () => {
  if (!portal.aktiv || !portal.daten) return;
  portalRender();
  window.scrollTo(0, 0);
});

// ---------- Hilfen ----------
function portalRoute() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  return { page: parts[0] || "", id: parts[1] || null };
}

const portalAkten = () => (portal.daten && portal.daten.akten) || [];
const portalRechnungen = () => (portal.daten && portal.daten.rechnungen) || [];
const portalAkte = (id) => portalAkten().find((a) => a.id === id);
const portalAnliegenListe = () => (portal.daten && portal.daten.anliegen) || [];
const istNeu = (zeit) => !!(portal.gesehen && zeit && new Date(zeit) > new Date(portal.gesehen));

function portalTermine(a, { kommend = true } = {}) {
  const jetzt = startOfDay();
  return (a.termine || []).filter((t) => (kommend ? !t.erledigt && new Date(t.beginn) >= jetzt : t.erledigt || new Date(t.beginn) < jetzt));
}

function alleKommendenTermine() {
  return portalAkten().flatMap((a) => portalTermine(a).map((t) => ({ ...t, akte: a })))
    .sort((x, y) => new Date(x.beginn) - new Date(y.beginn));
}

// Neues seit dem letzten Besuch in einer Akte
function akteNeuigkeiten(a) {
  return (a.verlauf || []).filter((e) => !e.eigene && istNeu(e.created_at)).length
    + (a.beweise || []).filter((b) => istNeu(b.created_at)).length
    + (a.termine || []).filter((t) => istNeu(t.created_at)).length;
}

const portalStatusBadge = (s) => html`<span class="badge ${statusClass(s)}">${s}</span>`;

function portalRechnungUeberfaellig(r) {
  if (r.status !== "Offen") return false;
  const tage = Number(state.settings.zahlungsziel_tage) || 7;
  return addDays(parseDate(r.datum), tage) < startOfDay();
}

// ---------- Zeichnen ----------
function portalRender() {
  if (!portal.daten) return;
  const route = portalRoute();
  const seite = route.page === "akte" ? "akten" : route.page;
  const offen = portalRechnungen().filter((r) => r.status === "Offen" && !r.zahlung_gemeldet_am).length;
  const termine = alleKommendenTermine().filter((t) => sameDay(t.beginn, new Date())).length;
  const badges = { rechnungen: offen, termine };
  $("portal-nav").innerHTML = String(html`${PORTAL_NAV.map((n) => html`
    <a href="#/${n.page}" class="${seite === n.page ? "active" : ""}">${n.label}${badges[n.page] ? html`<span class="nav-badge">${badges[n.page]}</span>` : ""}</a>`)}`);
  $("portal-name").textContent = portal.daten.name || "";
  $("brand-wechsel").hidden = false; // Logo: Charakter wechseln

  const views = { "": portalUebersicht, akten: portalAktenListe, akte: portalAkteDetail, termine: portalTermineSeite,
    dokumente: portalDokumenteSeite, rechnungen: portalRechnungenSeite, anliegen: portalAnliegenSeite, daten: portalDatenSeite };
  const view = views[route.page] || portalUebersicht;
  const main = $("portal");
  const fokus = document.activeElement && main.contains(document.activeElement) ? document.activeElement.id : null;
  try {
    main.innerHTML = String(view(route));
  } catch (e) {
    console.error(e);
    main.innerHTML = String(html`<div class="page"><div class="card empty-state"><h2>Hier ist etwas schiefgelaufen</h2><p>${e.message}</p><a class="btn" href="#/">Zur Übersicht</a></div></div>`);
  }
  if (fokus && document.getElementById(fokus)) document.getElementById(fokus).focus({ preventScroll: true });
  const k = state.settings;
  document.title = `Mandantenportal – ${k.kanzlei || "Wiwang Law"}`;
}

function kanzleiKontakt() {
  const k = state.settings;
  return html`<div class="portal-kontakt">
    <strong>${k.kanzlei}</strong>${k.ort ? html` · ${k.ort}` : ""}${k.telefon ? html` · Tel. <a href="tel:${k.telefon}">${k.telefon}</a>` : ""}
  </div>`;
}

function keinMandant() {
  return html`<div class="box info"><strong>Ihr Zugang ist freigeschaltet.</strong>
    Die Kanzlei hat Sie aber noch keiner Mandantenakte zugeordnet. Sobald das geschehen ist, sehen Sie hier Ihre Akten.</div>`;
}

// ---------- Übersicht ----------
function portalUebersicht() {
  const d = portal.daten;
  const akten = portalAkten();
  const aktiv = akten.filter((a) => a.status !== "Geschlossen");
  const termine = alleKommendenTermine().slice(0, 5);
  const offen = portalRechnungen().filter((r) => r.status === "Offen");
  const hinweise = portal.hinweise.filter((h) => !h.gelesen).slice(0, 8);
  const haft = akten.filter((a) => a.in_haft);
  const laufendeAnliegen = portalAnliegenListe().filter((x) => x.status !== "erledigt");
  const zuBewerten = akten.filter((a) => a.status === "Geschlossen" && !a.bewertung && portal.daten.mandant);

  return html`
    <div class="page portal-seite">
      <div class="portal-kopf">
        <div>
          <h1>Guten Tag, ${d.name}</h1>
          <p class="muted">Willkommen im Mandantenportal. Hier sehen Sie den Stand Ihrer Angelegenheiten bei uns.</p>
        </div>
        ${kanzleiKontakt()}
      </div>
      ${d.mandant ? "" : keinMandant()}
      <div class="portal-schnell">
        <button type="button" class="portal-notruf" data-action="portal-anliegen" data-art="notruf">
          <span class="icon" aria-hidden="true">🚨</span><span><strong>Notruf</strong><small>Ich wurde festgenommen</small></span></button>
        <button type="button" class="portal-kachel" data-action="portal-anliegen" data-art="rueckruf">
          <span class="icon" aria-hidden="true">📞</span><span><strong>Rückruf</strong><small>Gespräch mit der Kanzlei</small></span></button>
        <button type="button" class="portal-kachel" data-action="portal-anliegen" data-art="mandat">
          <span class="icon" aria-hidden="true">📂</span><span><strong>Neue Angelegenheit</strong><small>Mandat anfragen</small></span></button>
      </div>
      ${laufendeAnliegen.length ? html`<div class="box info"><strong>Ihre Anliegen:</strong>
        <ul>${laufendeAnliegen.map((x) => html`<li>${PORTAL_ANLIEGEN[x.art]?.kurz || x.art} vom ${fmt.datumZeit(x.created_at)} –
          ${x.status === "angenommen" ? html`<strong>${x.bearbeiter || "Die Kanzlei"} kümmert sich</strong>` : "eingegangen, noch nicht übernommen"}</li>`)}</ul>
        <div class="actions-row"><a class="btn small" href="#/anliegen">Ansehen</a></div></div>` : ""}
      ${zuBewerten.length ? html`<div class="box ok"><strong>Wie zufrieden waren Sie?</strong>
        ${zuBewerten.length === 1 ? html` Ihre Akte ${zuBewerten[0].number} ist abgeschlossen.` : html` ${zuBewerten.length} Ihrer Akten sind abgeschlossen.`}
        Ihre Bewertung hilft uns, noch besser zu werden.
        <div class="actions-row">${zuBewerten.slice(0, 3).map((a) => html`<button type="button" class="btn small" data-action="portal-bewerten" data-id="${a.id}">${a.number} bewerten</button>`)}</div></div>` : ""}
      ${haft.map((a) => html`<div class="box dark"><strong>In Haft</strong> (${a.number})${a.haft_bis ? html` – voraussichtlich bis ${fmt.datumZeit(a.haft_bis)} (${fmt.bis(a.haft_bis)})` : ""}</div>`)}

      ${hinweise.length ? html`
        <section class="card">
          <div class="card-head"><h2>Neuigkeiten</h2>
            <button type="button" class="link-btn" data-action="portal-hinweise-gelesen">Alle als gelesen markieren</button></div>
          <ul class="rows">${hinweise.map((h) => html`<li class="portal-hinweis">
            <a class="grow" href="${h.link || "#/"}" data-action="portal-hinweis" data-id="${h.id}">
              <div class="title">${h.text}</div><div class="meta">${fmt.relativ(h.zeit)}</div></a></li>`)}</ul>
        </section>` : ""}

      <div class="grid-2">
        <section class="card">
          <div class="card-head"><h2>Ihre Akten</h2><a class="btn small" href="#/akten">Alle</a></div>
          ${aktiv.length ? html`<ul class="portal-akten">${aktiv.map(portalAkteKarte)}</ul>`
            : html`<p class="empty">${akten.length ? "Keine laufenden Akten." : "Noch keine Akten."}</p>`}
        </section>
        <section class="card">
          <div class="card-head"><h2>Nächste Termine</h2></div>
          ${termine.length ? html`<ul class="rows">${termine.map((t) => portalTerminZeile(t, { akte: true }))}</ul>`
            : html`<p class="empty">Keine anstehenden Termine.</p>`}
          ${offen.length ? html`<div class="box ${offen.some(portalRechnungUeberfaellig) ? "warning" : "info"}" style="margin-top:16px">
            <strong>Offene Rechnungen: ${fmt.geld(offen.reduce((s, r) => s + (Number(r.summe) || 0), 0))}</strong>
            <div class="actions-row"><a class="btn small" href="#/rechnungen">Ansehen</a></div></div>` : ""}
        </section>
      </div>
    </div>`;
}

function portalAkteKarte(a) {
  const nt = portalTermine(a)[0];
  const neu = akteNeuigkeiten(a);
  return html`<li><a class="portal-akte" href="#/akte/${a.id}">
    <span class="portal-akte-kopf"><span class="case-number">${a.number}</span>
      <span class="badges">${a.in_haft ? html`<span class="badge haft">In Haft</span>` : ""}${portalStatusBadge(a.status)}
      ${neu ? html`<span class="badge alert" title="Neu seit Ihrem letzten Besuch">${neu} neu</span>` : ""}</span></span>
    <span class="title">${a.title}</span>
    <span class="meta">${a.rolle !== "Mandant" ? html`${a.rolle} · ` : ""}Zuständig: ${a.zustaendig || "–"}</span>
    ${nt ? html`<span class="meta">Nächster Termin: ${fmt.tag(nt.beginn)}, ${fmt.zeit(nt.beginn)} · ${nt.titel}</span>` : ""}
    ${a.ergebnis ? html`<span class="meta">Ergebnis: <strong>${a.ergebnis}</strong></span>` : ""}
  </a></li>`;
}

function portalTerminZeile(t, { akte = false } = {}) {
  return html`<li class="${t.erledigt ? "erledigt" : ""}">
    <div class="portal-termin-datum"><strong>${fmt.tag(t.beginn)}</strong><span>${fmt.zeit(t.beginn)}</span></div>
    <div class="grow"><div class="title">${t.titel} ${istNeu(t.created_at) ? html`<span class="badge alert">neu</span>` : ""}</div>
      <div class="meta">${t.art}${t.ort ? ` · ${t.ort}` : ""}${akte && t.akte ? html` · <a href="#/akte/${t.akte.id}">${t.akte.number}</a>` : ""}</div></div>
    ${!t.erledigt && new Date(t.beginn) >= startOfDay() ? html`<button type="button" class="icon-btn" data-action="portal-ics" data-id="${t.id}"
      title="In meinen Kalender übernehmen (.ics)" aria-label="In meinen Kalender übernehmen">📅</button>` : ""}
  </li>`;
}

// ---------- Akten ----------
function portalAktenListe() {
  const akten = portalAkten();
  return html`
    <div class="page portal-seite">
      <div class="portal-kopf"><div><h1>Meine Akten</h1>
        <p class="muted">Alle Angelegenheiten, in denen wir Sie vertreten oder für die Sie freigeschaltet sind.</p></div></div>
      ${portal.daten.mandant ? "" : keinMandant()}
      ${akten.length ? html`<ul class="portal-akten breit">${akten.map(portalAkteKarte)}</ul>`
        : html`<div class="card empty-state"><p>Noch keine Akten.</p></div>`}
    </div>`;
}

function portalAkteDetail(route) {
  const a = portalAkte(route.id);
  if (!a) return html`<div class="page portal-seite"><div class="card empty-state"><h2>Akte nicht gefunden</h2>
    <p>Diese Akte ist für Sie nicht (mehr) sichtbar.</p><a class="btn" href="#/akten">Zu meinen Akten</a></div></div>`;
  const kommend = portalTermine(a);
  const vergangen = portalTermine(a, { kommend: false }).reverse();
  const verlauf = [...(a.verlauf || [])].reverse();
  const summe = vorwurfSumme(a.vorwuerfe);
  const textId = `portal-nachricht-${a.id}`;

  return html`
    <div class="page portal-seite">
      <a class="back-link" href="#/akten">← Meine Akten</a>
      <div class="detail-card">
        <div class="detail-head">
          <span class="case-number">${a.number}</span>
          <span class="badges">${a.in_haft ? html`<span class="badge haft">In Haft</span>` : ""}${portalStatusBadge(a.status)}
            ${a.rolle !== "Mandant" ? html`<span class="badge gold">${a.rolle}</span>` : ""}</span>
          <h2>${a.title}</h2>
        </div>
        <div class="tab-body">
          ${portalFortschritt(a)}
          ${a.in_haft ? html`<div class="box dark"><strong>In Haft</strong>${a.haft_bis ? html` – voraussichtlich bis ${fmt.datumZeit(a.haft_bis)} (${fmt.bis(a.haft_bis)})` : ""}</div>` : ""}
          ${a.ergebnis ? html`<div class="box ${ERFOLGE.includes(a.ergebnis) ? "ok" : "info"}">
            <strong>Ergebnis: ${a.ergebnis}</strong>${a.ergebnis_datum ? html` (${fmt.datum(a.ergebnis_datum)})` : ""}
            ${a.ergebnis_details ? html`<div class="pre">${a.ergebnis_details}</div>` : ""}</div>` : ""}

          <dl class="facts">
            <div><dt>Mandant</dt><dd>${a.mandant || "–"}</dd></div>
            ${a.opponent ? html`<div><dt>Gegenpartei</dt><dd>${a.opponent}</dd></div>` : ""}
            <div><dt>Ihr Ansprechpartner</dt><dd>${a.zustaendig || "–"}${a.zustaendig_telefon ? html`<br><a class="small" href="tel:${a.zustaendig_telefon}">${a.zustaendig_telefon}</a>` : ""}</dd></div>
            <div><dt>Rechtsgebiet</dt><dd>${a.area || "–"}</dd></div>
            <div><dt>Mandatsart</dt><dd>${a.typ || "–"}</dd></div>
            ${a.az_extern ? html`<div><dt>Az. Polizei / StA / Gericht</dt><dd>${a.az_extern}</dd></div>` : ""}
            <div><dt>Angelegt</dt><dd>${fmt.datum(a.created_at)}</dd></div>
          </dl>
          <div class="actions-row">
            ${a.status !== "Geschlossen" ? html`<button type="button" class="btn small" data-action="portal-anliegen" data-art="rueckruf" data-akte="${a.id}">📞 Rückruf zu dieser Akte</button>` : ""}
            ${a.status === "Geschlossen" && portal.daten.mandant ? html`<button type="button" class="btn small ${a.bewertung ? "" : "gold"}" data-action="portal-bewerten" data-id="${a.id}">${a.bewertung ? "Bewertung ändern" : "★ Akte bewerten"}</button>` : ""}
          </div>
          ${a.bewertung ? html`<p class="small">Ihre Bewertung: ${portalSterne(a.bewertung.sterne)}${a.bewertung.text ? html` – „${a.bewertung.text}“` : ""}</p>` : ""}

          ${(a.vorwuerfe || []).length ? html`
            <h3 class="section-title" style="margin-top:20px">Tatvorwürfe & Strafrahmen</h3>
            <div class="table-wrap"><table class="table">
              <thead><tr><th>Paragraph</th><th>Vorwurf</th><th>Anzahl</th><th class="num">Geldstrafe</th><th class="num">Haft</th></tr></thead>
              <tbody>${a.vorwuerfe.map((v) => html`<tr><td class="nowrap">${v.paragraph || "–"}</td><td>${v.titel}</td><td>${v.anzahl || 1}</td>
                <td class="num">${v.geldstrafe ? fmt.geld((Number(v.geldstrafe) || 0) * (v.anzahl || 1)) : "–"}</td>
                <td class="num">${v.haft ? fmt.haft((Number(v.haft) || 0) * (v.anzahl || 1)) : "–"}</td></tr>`)}</tbody>
            </table></div>
            <div class="sum-bar"><span>Strafrahmen gesamt:</span><span>Geldstrafe <strong>${fmt.geld(summe.geld)}</strong></span><span>Haft <strong>${fmt.haft(summe.haft)}</strong></span></div>
            <p class="small muted">Höchstmaß laut Strafkatalog – das tatsächliche Ergebnis kann davon abweichen.</p>` : ""}

          <div class="grid-2" style="margin-top:20px">
            <div>
              <h3 class="section-title">Termine</h3>
              ${kommend.length ? html`<ul class="rows">${kommend.map((t) => portalTerminZeile(t))}</ul>` : html`<p class="empty">Keine anstehenden Termine.</p>`}
              ${vergangen.length ? html`<details class="portal-vergangen"><summary class="small muted">${anzahl(vergangen.length, "früherer Termin", "frühere Termine")}</summary>
                <ul class="rows">${vergangen.map((t) => portalTerminZeile(t))}</ul></details>` : ""}
            </div>
            <div>
              <h3 class="section-title">Dokumente & Beweismittel</h3>
              ${(a.beweise || []).length ? html`<ul class="rows">${a.beweise.map((b) => {
                const url = safeUrl(b.link);
                return html`<li><div class="grow">
                  <div class="title">${url ? html`<a href="${url}" target="_blank" rel="noopener noreferrer">${b.titel} ↗</a>` : b.titel}
                    ${istNeu(b.created_at) ? html`<span class="badge alert">neu</span>` : ""}</div>
                  <div class="meta">${b.art} · ${fmt.datum(b.created_at)}</div>
                  ${b.beschreibung ? html`<div class="small">${b.beschreibung}</div>` : ""}</div></li>`;
              })}</ul>` : html`<p class="empty">Noch keine Dokumente für Sie freigegeben.</p>`}
            </div>
          </div>

          <h3 class="section-title" style="margin-top:24px">Nachrichten</h3>
          <p class="small muted" style="margin-top:0">Mitteilungen der Kanzlei zu dieser Akte. Sie können uns hier auch schreiben – Ihre Nachricht geht direkt an ${a.zustaendig || "die Kanzlei"}.</p>
          <form class="portal-nachricht-form" data-submit="portal-nachricht" data-id="${a.id}">
            <textarea id="${textId}" name="text" rows="3" maxlength="2000" required data-input="portal-entwurf" data-id="${a.id}"
              placeholder="Ihre Nachricht an die Kanzlei …">${portal.entwurf[a.id] || ""}</textarea>
            <div class="actions-row"><span class="spacer"></span><button class="btn primary" type="submit">Senden</button></div>
          </form>
          ${verlauf.length ? html`<ul class="portal-chat">${verlauf.map((e) => html`
            <li class="${e.vom_mandanten ? "vom-mandanten" : "von-kanzlei"} ${e.eigene ? "eigene" : ""}">
              <div class="head"><strong>${e.eigene ? "Sie" : e.von}</strong>${e.vom_mandanten || !e.art ? "" : html` · ${e.art}`} · ${fmt.datumZeit(e.created_at)}
                ${!e.eigene && istNeu(e.created_at) ? html`<span class="badge alert">neu</span>` : ""}</div>
              <p>${multiline(e.text)}</p>
            </li>`)}</ul>` : html`<p class="empty">Noch keine Nachrichten.</p>`}
        </div>
      </div>
    </div>`;
}

INPUTS["portal-entwurf"] = (el) => { portal.entwurf[el.dataset.id] = el.value; };

SUBMITS["portal-nachricht"] = async (form) => {
  const id = form.dataset.id;
  const text = form.elements.text.value.trim();
  if (!text) return;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  const ok = await attempt(async () => {
    const { error } = await db.rpc("portal_nachricht", { p_akte: id, p_text: text });
    if (error) throw error;
  }, "Nachricht gesendet");
  button.disabled = false;
  if (ok) {
    delete portal.entwurf[id];
    await portalNeuLaden();
  }
};

// ---------- Rechnungen ----------
function portalRechnungenSeite() {
  const list = portalRechnungen();
  const offen = list.filter((r) => r.status === "Offen");
  return html`
    <div class="page portal-seite">
      <div class="portal-kopf"><div><h1>Rechnungen</h1>
        <p class="muted">${offen.length ? html`Offen: <strong>${fmt.geld(offen.reduce((s, r) => s + (Number(r.summe) || 0), 0))}</strong>` : "Keine offenen Rechnungen."}</p>
        ${offen.length ? html`<p class="small muted">Schon bezahlt? Klicken Sie auf „Ich habe bezahlt“ – wir prüfen den Eingang und bestätigen ihn.</p>` : ""}</div>
        ${kanzleiKontakt()}</div>
      ${list.length ? html`<div class="card portal-rechnung-tabelle"><div class="table-wrap"><table class="table">
        <thead><tr><th>Nr.</th><th>Datum</th><th>Betreff</th><th>Akte</th><th class="num">Betrag</th><th>Status</th><th></th></tr></thead>
        <tbody>${list.map((r) => html`<tr>
          <td class="nowrap">${r.nummer}</td>
          <td class="nowrap">${fmt.datum(r.datum)}</td>
          <td>${r.betreff || "Anwaltliche Leistungen"}</td>
          <td class="nowrap">${r.akte_id && portalAkte(r.akte_id) ? html`<a href="#/akte/${r.akte_id}">${r.akte_number}</a>` : r.akte_number || "–"}</td>
          <td class="num">${fmt.geld(r.summe)}</td>
          <td>${portalRechnungBadge(r)}</td>
          <td class="right nowrap"><button class="btn small" data-action="portal-rechnung" data-id="${r.id}">Ansehen</button>
            ${r.status === "Offen" && !r.zahlung_gemeldet_am ? html`<button class="btn small gold" data-action="portal-zahlung" data-id="${r.id}">Ich habe bezahlt</button>` : ""}</td>
        </tr>`)}</tbody></table></div></div>`
      : html`<div class="card empty-state"><p>Noch keine Rechnungen.</p></div>`}
      ${list.length ? html`<ul class="portal-rechnung-karten">${list.map((r) => html`<li class="card">
        <div class="portal-akte-kopf"><strong>${r.nummer}</strong>${portalRechnungBadge(r)}</div>
        <div class="title">${r.betreff || "Anwaltliche Leistungen"} · <strong>${fmt.geld(r.summe)}</strong></div>
        <div class="meta">${fmt.datum(r.datum)}${r.akte_number ? html` · ${r.akte_id && portalAkte(r.akte_id) ? html`<a href="#/akte/${r.akte_id}">${r.akte_number}</a>` : r.akte_number}` : ""}</div>
        <div class="actions-row"><button class="btn small" data-action="portal-rechnung" data-id="${r.id}">Ansehen</button>
          ${r.status === "Offen" && !r.zahlung_gemeldet_am ? html`<button class="btn small gold" data-action="portal-zahlung" data-id="${r.id}">Ich habe bezahlt</button>` : ""}</div>
      </li>`)}</ul>` : ""}
    </div>`;
}

function portalRechnungBadge(r) {
  return r.status === "Bezahlt" ? html`<span class="badge ok">Bezahlt${r.bezahlt_am ? ` ${fmt.datum(r.bezahlt_am)}` : ""}</span>`
    : r.zahlung_gemeldet_am ? html`<span class="badge sichtbar" title="Gemeldet am ${fmt.datumZeit(r.zahlung_gemeldet_am)}">Zahlung gemeldet – wird geprüft</span>`
    : portalRechnungUeberfaellig(r) ? html`<span class="badge alert">überfällig</span>` : html`<span class="badge offen">Offen</span>`;
}

function portalRechnungDokument(r) {
  return html`
    ${briefkopf()}
    <h1 class="doc-title">Rechnung</h1>
    <p>${r.empfaenger}</p>
    <p class="doc-small">Rechnungs-Nr. ${r.nummer} · Datum ${fmt.datum(r.datum)}${r.akte_number ? ` · Akte ${r.akte_number}` : ""}</p>
    <p class="doc-subject">Rechnung – ${r.betreff || "Anwaltliche Leistungen"} ${fmt.datum(r.datum)}</p>
    <p>Sehr geehrte/r ${r.empfaenger},</p>
    <p>${state.settings.rechnung_einleitung}</p>
    <table class="doc-table">
      <thead><tr><th>Dienstleistung</th><th>Anzahl</th><th>Einzel</th><th>Gesamt</th></tr></thead>
      <tbody>
        ${(r.positionen || []).map((p) => html`<tr>
          <td>${p.text}</td><td>${p.menge ?? 1}</td>
          <td>${posMenge(p) === null ? "/" : fmt.geld(p.einzel)}</td>
          <td>${fmt.geld(posGesamt(p))}</td></tr>`)}
        <tr class="total"><td></td><td></td><td>Summe:</td><td>${fmt.geld(r.summe)}</td></tr>
      </tbody>
    </table>
    <p>${state.settings.rechnung_hinweis}</p>
    ${r.status === "Bezahlt" ? html`<p><strong>Bezahlt${r.bezahlt_am ? ` am ${fmt.datum(r.bezahlt_am)}` : ""}.</strong></p>` : ""}
    ${unterschrift({ name: r.unterzeichner || state.settings.kanzlei, titel: r.unterzeichner_titel || "Rechtsanwalt" }, parseDate(r.datum))}`;
}

// ---------- Meine Daten ----------
function portalDatenSeite() {
  const m = portal.daten.mandant;
  const p = kontoPerson() || {};
  return html`
    <div class="page portal-seite">
      <div class="portal-kopf"><div><h1>Meine Daten</h1>
        <p class="muted">So erreichen wir Sie. Bitte halten Sie Ihre Kontaktdaten aktuell.</p></div></div>
      <div class="grid-2">
        <section class="card">
          <h2>Kontaktdaten</h2>
          ${m ? html`<form class="form" data-submit="portal-kontakt">
            <div class="form-grid">
              <div class="field full"><label class="label">Name</label><input value="${m.name}" disabled></div>
              <div class="field half"><label class="label" for="pk-telefon">Telefon (ingame)</label>
                <input id="pk-telefon" name="telefon" value="${m.telefon || ""}" maxlength="60" placeholder="z. B. 555-0123"></div>
              <div class="field half"><label class="label">Discord</label><input value="${m.discord || p.discord_benutzer || ""}" disabled></div>
              <div class="field full"><label class="label" for="pk-adresse">Adresse</label>
                <input id="pk-adresse" name="adresse" value="${m.adresse || ""}" maxlength="200"></div>
            </div>
            <div class="dialog-actions"><span class="spacer"></span><button class="btn primary" type="submit">Speichern</button></div>
          </form>` : keinMandant()}
        </section>
        <section class="card">
          <h2>Zugang</h2>
          ${p.discord_name ? discordKopf(p) : ""}
          <p class="small muted">Sie melden sich mit Discord an. Über das Logo oben links wechseln Sie zwischen Ihren Charakteren.</p>
          <div class="actions-row">
            <button type="button" class="btn" data-action="charakter-menue">Charakter wechseln</button>
            <button type="button" class="btn" data-action="person-passwort">${p.hat_passwort ? "Passwort ändern" : "Passwort festlegen"}</button>
            <button type="button" class="btn" data-action="logout">Abmelden</button>
          </div>
        </section>
      </div>
    </div>`;
}

SUBMITS["portal-kontakt"] = async (form) => {
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  const ok = await attempt(async () => {
    const { error } = await db.rpc("portal_kontakt", { p_telefon: form.elements.telefon.value, p_adresse: form.elements.adresse.value });
    if (error) throw error;
  }, "Kontaktdaten gespeichert");
  button.disabled = false;
  if (ok) await portalNeuLaden();
};

// ---------- Aktionen ----------
Object.assign(ACTIONS, {
  "portal-hinweis": async (d) => {
    const h = portal.hinweise.find((x) => x.id === d.id);
    if (h && !h.gelesen) {
      h.gelesen = true;
      db.from("benachrichtigungen").update({ gelesen: true }).eq("id", h.id).then(() => {});
    }
    const ziel = (h && h.link) || "#/";
    if (location.hash === ziel) portalRender(); else location.hash = ziel;
  },
  "portal-hinweise-gelesen": async () => {
    const ids = portal.hinweise.filter((h) => !h.gelesen).map((h) => h.id);
    portal.hinweise.forEach((h) => (h.gelesen = true));
    portalRender();
    if (ids.length) await attempt(async () => {
      const { error } = await db.from("benachrichtigungen").update({ gelesen: true }).in("id", ids);
      if (error) throw error;
    });
  },
  "portal-rechnung": (d) => {
    const r = portalRechnungen().find((x) => x.id === d.id);
    if (!r) return;
    const dlg = openDialog({
      id: "doc-dialog",
      wide: true,
      title: `Rechnung ${r.nummer}`,
      body: html`<div class="doc-toolbar"><span class="spacer"></span>
          <button class="btn primary" type="button" data-doc="print">Drucken / PDF</button></div>
        <div class="doc-preview"><div class="doc-page">${portalRechnungDokument(r)}</div></div>`,
    });
    dlg.querySelector('[data-doc="print"]').addEventListener("click", () => {
      $("print-area").innerHTML = `<div class="doc-page">${dlg.querySelector(".doc-page").innerHTML}</div>`;
      setTimeout(() => window.print(), 60);
    });
  },
});

// =============================================================
//  Mandantenportal 2.0
// =============================================================
const PORTAL_ANLIEGEN = {
  notruf: { kurz: "Notruf", titel: "🚨 Notruf – ich wurde festgenommen" },
  rueckruf: { kurz: "Rückrufbitte", titel: "📞 Rückruf / Gespräch mit der Kanzlei" },
  mandat: { kurz: "Neue Angelegenheit", titel: "📂 Neue Angelegenheit – Mandat anfragen" },
};

const portalSterne = (n) => html`<span class="sterne" aria-label="${n} von 5 Sternen">${"★".repeat(n)}<span class="leer">${"★".repeat(5 - n)}</span></span>`;

// ---------- Fortschritt einer Akte ----------
function portalFortschritt(a) {
  const schritte = [
    { key: "Offen", label: "Eingegangen" },
    { key: "In Bearbeitung", label: "In Bearbeitung" },
    { key: "Geschlossen", label: a.ergebnis ? `Abgeschlossen: ${a.ergebnis}` : "Abgeschlossen" },
  ];
  const i = Math.max(0, schritte.findIndex((s) => s.key === a.status));
  return html`<ol class="portal-fortschritt" aria-label="Stand der Akte">
    ${schritte.map((s, n) => html`<li class="${n < i ? "fertig" : n === i ? "aktuell" : ""}"${n === i ? html` aria-current="step"` : ""}>
      <span class="punkt" aria-hidden="true">${n < i || (n === i && n === schritte.length - 1) ? "✓" : n + 1}</span><span class="text">${s.label}</span></li>`)}
  </ol>`;
}

// ---------- Termine ----------
function portalTermineSeite() {
  const kommend = alleKommendenTermine();
  const vergangen = portalAkten().flatMap((a) => portalTermine(a, { kommend: false }).map((t) => ({ ...t, akte: a })))
    .sort((x, y) => new Date(y.beginn) - new Date(x.beginn)).slice(0, 30);
  // nach Tagen gruppieren
  const tage = [];
  for (const t of kommend) {
    const key = startOfDay(new Date(t.beginn)).getTime();
    let g = tage.find((x) => x.key === key);
    if (!g) tage.push((g = { key, datum: t.beginn, termine: [] }));
    g.termine.push(t);
  }
  return html`
    <div class="page portal-seite">
      <div class="portal-kopf"><div><h1>Termine</h1>
        <p class="muted">Verhandlungen, Gespräche und andere Termine in Ihren Akten.</p></div>
        ${kommend.length ? html`<button type="button" class="btn" data-action="portal-ics" data-id="alle">📅 Alle in meinen Kalender (.ics)</button>` : ""}</div>
      ${kommend.length ? tage.map((g) => html`<section class="card">
          <h2 class="portal-tag">${fmt.tagLang(g.datum)}</h2>
          <ul class="rows">${g.termine.map((t) => portalTerminZeile(t, { akte: true }))}</ul></section>`)
        : html`<div class="card empty-state"><p>Keine anstehenden Termine.</p></div>`}
      ${vergangen.length ? html`<details class="card portal-vergangen"><summary class="small muted">${anzahl(vergangen.length, "früherer Termin", "frühere Termine")}</summary>
        <ul class="rows">${vergangen.map((t) => portalTerminZeile(t, { akte: true }))}</ul></details>` : ""}
      <p class="small muted">Tipp: Mit 📅 übernehmen Sie einen Termin in Ihren Kalender (Handy, Outlook, Google …). Verschiebt sich ein Termin, benachrichtigen wir Sie hier im Portal.</p>
    </div>`;
}

const icsText = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsZeit = (d) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function portalIcs(termine) {
  const kanzlei = state.settings.kanzlei || "Wiwang Law";
  const jetzt = icsZeit(new Date());
  const ereignisse = termine.map((t) => [
    "BEGIN:VEVENT",
    `UID:${t.id}@wiwang-law`,
    `DTSTAMP:${jetzt}`,
    `DTSTART:${icsZeit(t.beginn)}`,
    `DTEND:${icsZeit(new Date(new Date(t.beginn).getTime() + 3600000))}`,
    `SUMMARY:${icsText(`${t.titel} (${kanzlei})`)}`,
    t.ort ? `LOCATION:${icsText(t.ort)}` : null,
    `DESCRIPTION:${icsText(`${t.art}${t.akte ? ` – Akte ${t.akte.number}: ${t.akte.title}` : ""}`)}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsText(t.titel)}`, "TRIGGER:-PT30M", "END:VALARM",
    "END:VEVENT",
  ].filter(Boolean).join("\r\n"));
  return ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${icsText(kanzlei)}//Mandantenportal//DE`, "CALSCALE:GREGORIAN",
    ...ereignisse, "END:VCALENDAR"].join("\r\n") + "\r\n";
}

// ---------- Dokumente ----------
portal.dokQ = "";
function portalDokumenteSeite() {
  const q = portal.dokQ.trim();
  const akten = portalAkten().map((a) => ({ a, docs: (a.beweise || []).filter((b) => matches(q, b.titel, b.art, b.beschreibung, a.number, a.title)) }))
    .filter((x) => x.docs.length);
  const gesamt = portalAkten().reduce((s, a) => s + (a.beweise || []).length, 0);
  return html`
    <div class="page portal-seite">
      <div class="portal-kopf"><div><h1>Dokumente</h1>
        <p class="muted">Alle Dokumente und Beweismittel, die wir für Sie freigegeben haben – ${anzahl(gesamt, "Dokument", "Dokumente")}.</p></div>
        ${gesamt > 4 ? html`<div class="search"><input type="search" id="portal-dok-q" data-input="portal-dok-q" value="${portal.dokQ}" placeholder="Dokumente durchsuchen …"></div>` : ""}</div>
      ${akten.length ? akten.map(({ a, docs }) => html`<section class="card">
          <div class="card-head"><h2><a href="#/akte/${a.id}">${a.number}</a> · ${a.title}</h2><span class="muted small">${anzahl(docs.length, "Dokument", "Dokumente")}</span></div>
          <ul class="rows">${docs.map((b) => {
            const url = safeUrl(b.link);
            return html`<li><div class="grow">
              <div class="title">${url ? html`<a href="${url}" target="_blank" rel="noopener noreferrer">${b.titel} ↗</a>` : b.titel}
                ${istNeu(b.created_at) ? html`<span class="badge alert">neu</span>` : ""}</div>
              <div class="meta">${b.art} · ${fmt.datum(b.created_at)}</div>
              ${b.beschreibung ? html`<div class="small">${b.beschreibung}</div>` : ""}</div></li>`;
          })}</ul></section>`)
        : html`<div class="card empty-state"><p>${q ? "Keine Dokumente gefunden." : "Noch keine Dokumente für Sie freigegeben."}</p></div>`}
    </div>`;
}
INPUTS["portal-dok-q"] = (el) => {
  const pos = el.selectionStart;
  portal.dokQ = el.value;
  portalRender();
  const neu = document.getElementById("portal-dok-q");
  if (neu) try { neu.setSelectionRange(pos, pos); } catch {}
};

// ---------- Anliegen ----------
function portalAnliegenSeite() {
  const list = portalAnliegenListe();
  const statusText = (x) => x.status === "erledigt" ? html`<span class="badge ok">erledigt</span>`
    : x.status === "angenommen" ? html`<span class="badge gold">${x.bearbeiter || "Die Kanzlei"} kümmert sich</span>`
    : html`<span class="badge offen">eingegangen</span>`;
  return html`
    <div class="page portal-seite">
      <div class="portal-kopf"><div><h1>Anliegen</h1>
        <p class="muted">Schnell Hilfe holen, einen Rückruf anfordern oder eine neue Angelegenheit anfragen.</p></div>
        ${kanzleiKontakt()}</div>
      <div class="portal-schnell gross">
        <button type="button" class="portal-notruf" data-action="portal-anliegen" data-art="notruf">
          <span class="icon" aria-hidden="true">🚨</span><span><strong>Notruf</strong><small>Ich wurde festgenommen oder brauche sofort einen Anwalt. Alle Anwälte werden alarmiert.</small></span></button>
        <button type="button" class="portal-kachel" data-action="portal-anliegen" data-art="rueckruf">
          <span class="icon" aria-hidden="true">📞</span><span><strong>Rückruf / Gespräch</strong><small>Sie möchten mit Ihrem Ansprechpartner sprechen.</small></span></button>
        <button type="button" class="portal-kachel" data-action="portal-anliegen" data-art="mandat">
          <span class="icon" aria-hidden="true">📂</span><span><strong>Neue Angelegenheit</strong><small>Anzeige, Klage, Vertrag, Beratung – wir melden uns.</small></span></button>
      </div>

      <details class="card portal-rechte">
        <summary><strong>Festgenommen? Das sollten Sie wissen</strong></summary>
        <ul>
          <li><strong>Bleiben Sie ruhig</strong> und leisten Sie keinen Widerstand.</li>
          <li>Sie müssen Angaben zu Ihrer Person machen – <strong>zur Sache dürfen Sie schweigen.</strong> Sagen Sie: „Ich möchte erst mit meinem Anwalt sprechen.“</li>
          <li><strong>Verlangen Sie Ihren Anwalt</strong> und nennen Sie die Kanzlei ${state.settings.kanzlei}${state.settings.telefon ? html` (Tel. ${state.settings.telefon})` : ""}.</li>
          <li><strong>Unterschreiben Sie nichts</strong>, was Sie nicht verstanden haben.</li>
          <li>Merken Sie sich Namen bzw. Dienstnummern der Beamten, Uhrzeit und Ort.</li>
        </ul>
        <p class="small muted">Allgemeine Hinweise, keine Rechtsberatung im Einzelfall. Drücken Sie oben auf <strong>Notruf</strong> – wir melden uns so schnell wie möglich.</p>
      </details>

      <section class="card">
        <div class="card-head"><h2>Ihre Anliegen</h2><span class="muted small">letzte 90 Tage</span></div>
        ${list.length ? html`<ul class="rows">${list.map((x) => {
          const a = x.akte_id && portalAkte(x.akte_id);
          return html`<li><div class="grow">
            <div class="title">${PORTAL_ANLIEGEN[x.art]?.kurz || x.art} ${statusText(x)}</div>
            <div class="pre small">${x.text}</div>
            <div class="meta">${fmt.datumZeit(x.created_at)}${x.erreichbar ? ` · erreichbar: ${x.erreichbar}` : ""}${a ? html` · <a href="#/akte/${a.id}">${a.number}</a>` : ""}</div>
            ${x.antwort ? html`<div class="portal-antwort"><strong>Antwort${x.bearbeiter ? ` von ${x.bearbeiter}` : ""}:</strong> ${multiline(x.antwort)}</div>` : ""}
          </div></li>`;
        })}</ul>` : html`<p class="empty">Noch keine Anliegen.</p>`}
      </section>
    </div>`;
}

function portalAkteOptionen() {
  return portalAkten().filter((a) => a.status !== "Geschlossen").map((a) => ({ value: a.id, label: `${a.number} · ${a.title}` }));
}

// ---------- Aktionen ----------
Object.assign(ACTIONS, {
  "portal-anliegen": (d) => {
    const art = d.art;
    const akten = portalAkteOptionen();
    const felder = {
      notruf: [
        { name: "erreichbar", label: "Wo sind Sie gerade?", placeholder: "z. B. Mission Row PD, Sandy Shores Sheriff …", required: true },
        { name: "text", label: "Was ist passiert? (optional)", type: "textarea", rows: 3, placeholder: "z. B. Festnahme wegen …, Haftprüfung beantragt …" },
        ...(akten.length ? [{ name: "akte", label: "Gehört zu Akte (optional)", type: "select", options: akten, emptyLabel: "— keine / neue Sache —" }] : []),
      ],
      rueckruf: [
        ...(akten.length ? [{ name: "akte", label: "Zu welcher Akte?", type: "select", options: akten, emptyLabel: "— allgemein —" }] : []),
        { name: "text", label: "Worum geht es?", type: "textarea", rows: 4, required: true },
        { name: "erreichbar", label: "Wann und wie sind Sie erreichbar?", placeholder: "z. B. heute ab 20 Uhr, Tel. 555-0123" },
      ],
      mandat: [
        { name: "text", label: "Worum geht es?", type: "textarea", rows: 5, required: true,
          placeholder: "Kurz den Sachverhalt schildern: Was ist passiert, wann, wer ist beteiligt? Gibt es schon ein Aktenzeichen?" },
        { name: "erreichbar", label: "Wann und wie sind Sie erreichbar?", placeholder: "z. B. abends, Tel. 555-0123" },
      ],
    }[art];
    if (!felder) return;
    openForm({
      title: PORTAL_ANLIEGEN[art].titel,
      intro: art === "notruf"
        ? html`<strong>Alle Anwältinnen und Anwälte der Kanzlei werden sofort benachrichtigt.</strong> Bitte nur im Ernstfall nutzen.`
        : art === "rueckruf" ? "Ihre Bitte geht an Ihren Ansprechpartner. Sie werden hier im Portal benachrichtigt, sobald sich jemand kümmert."
        : "Wir prüfen Ihre Anfrage und melden uns bei Ihnen. Sie sehen den Stand unter „Anliegen“.",
      fields: felder,
      values: { akte: d.akte || "" },
      submitLabel: art === "notruf" ? "🚨 Notruf senden" : "Senden",
      onSubmit: async (v) => {
        const { error } = await db.rpc("portal_anliegen_senden", { p_art: art, p_text: v.text || "", p_akte: v.akte || null, p_erreichbar: v.erreichbar || null });
        if (error) throw error;
        toast(art === "notruf" ? "Notruf gesendet – die Kanzlei ist alarmiert." : "Gesendet – wir melden uns.");
        await portalNeuLaden();
      },
    });
  },
  "portal-bewerten": (d) => {
    const a = portalAkte(d.id);
    if (!a) return;
    const vorher = a.bewertung || {};
    openForm({
      title: `Akte ${a.number} bewerten`,
      intro: html`Wie zufrieden waren Sie mit unserer Arbeit in „${a.title}“?${a.zustaendig ? html` Ihr Ansprechpartner: <strong>${a.zustaendig}</strong>.` : ""}`,
      fields: [
        { name: "sterne", type: "custom", label: "Ihre Bewertung",
          render: (v) => html`<div class="sterne-wahl" role="radiogroup" aria-label="Sterne">
            ${[5, 4, 3, 2, 1].map((n) => html`<input type="radio" name="sterne" id="stern-${n}" value="${n}" ${Number(v) === n ? "checked" : ""}>
              <label for="stern-${n}" title="${n} von 5">★</label>`)}</div>`,
          read: (form) => Number((form.querySelector('input[name="sterne"]:checked') || {}).value) || null },
        { name: "text", label: "Kommentar (optional)", type: "textarea", rows: 3, placeholder: "Was war gut, was können wir besser machen?" },
      ],
      values: { sterne: vorher.sterne || "", text: vorher.text || "" },
      submitLabel: "Bewertung senden",
      onSubmit: async (v) => {
        if (!v.sterne) throw new Error("Bitte 1 bis 5 Sterne auswählen");
        const { error } = await db.rpc("portal_bewerten", { p_akte: a.id, p_sterne: v.sterne, p_text: v.text || null });
        if (error) throw error;
        toast("Vielen Dank für Ihre Bewertung!");
        await portalNeuLaden();
      },
    });
  },
  "portal-zahlung": (d) => {
    const r = portalRechnungen().find((x) => x.id === d.id);
    if (!r) return;
    openForm({
      title: `Zahlung melden – ${r.nummer}`,
      intro: html`Sie haben <strong>${fmt.geld(r.summe)}</strong> bezahlt? Wir prüfen den Eingang und markieren die Rechnung dann als bezahlt.`,
      fields: [{ name: "hinweis", label: "Hinweis (optional)", placeholder: "z. B. bar an Herrn … übergeben, Überweisung am …" }],
      submitLabel: "Zahlung melden",
      onSubmit: async (v) => {
        const { error } = await db.rpc("portal_zahlung_melden", { p_rechnung: r.id, p_hinweis: v.hinweis || null });
        if (error) throw error;
        toast("Danke! Wir prüfen den Zahlungseingang.");
        await portalNeuLaden();
      },
    });
  },
  "portal-ics": (d) => {
    const alle = alleKommendenTermine();
    const termine = d.id === "alle" ? alle : alle.filter((t) => t.id === d.id);
    if (!termine.length) return;
    const name = termine.length === 1 ? `termin-${ymd(termine[0].beginn)}.ics` : "termine-wiwang-law.ics";
    downloadFile(name, portalIcs(termine), "text/calendar;charset=utf-8");
  },
});
