// =============================================================
//  Wiwang Law – Dokumente & Druck
//  Aufbau wie die bisherigen Kanzlei-Dokumente: Logo oben links,
//  Datum und Verfasser oben rechts (auf jeder Seite), großer
//  zentrierter Titel, §-Überschriften fett, Unterschriftsblock mit
//  Linie, Name, Rang und „Ort den Datum“.
//  Die Vorschau ist direkt bearbeitbar; "Drucken" erzeugt auf dem
//  iPhone/Mac auch ein PDF (Teilen → Drucken → PDF sichern).
// =============================================================

const s = () => state.settings;
const DOC_LOGO = "assets/logo-dokument.png?v=2"; // freigestelltes Logo aus den alten Kanzlei-Dokumenten

// ---------- Seitenrahmen ----------
// Kopf (thead) und unterer Rand (tfoot) wiederholen sich beim Drucken
// auf jeder Seite – so hat auch Seite 2 Logo, Datum und Verfasser.
function dokumentSeite(inhalt, { autor, datum } = {}) {
  return html`
    <div class="doc-bg" aria-hidden="true"></div>
    <table class="doc-frame" role="presentation">
      <thead><tr><td>
        <div class="doc-kopf">
          <img src="${DOC_LOGO}" alt="${s().kanzlei}">
          <div class="doc-kopf-meta" contenteditable="true" spellcheck="false">
            <div>${fmt.datum(datum || new Date())}</div>
            <div>${autor || myName()}</div>
          </div>
        </div>
      </td></tr></thead>
      <tfoot><tr><td><div class="doc-fuss"></div></td></tr></tfoot>
      <tbody><tr><td><div class="doc-inhalt" contenteditable="true" spellcheck="true">${inhalt}</div></td></tr></tbody>
    </table>`;
}

function dokumentDrucken(page) {
  const area = $("print-area");
  area.innerHTML = `<div class="doc-page">${page.innerHTML}</div>`;
  area.querySelectorAll("[contenteditable]").forEach((el) => el.removeAttribute("contenteditable"));
  setTimeout(() => window.print(), 60);
}

// Ankreuzfelder (☐/☒) per Klick umschalten
function dokumentKreuzchen(root) {
  root.addEventListener("click", (e) => {
    const box = e.target.closest(".doc-check");
    if (!box) return;
    e.preventDefault();
    box.textContent = box.textContent === "☒" ? "☐" : "☒";
  });
}

// ---------- Bausteine ----------
function ortDatum(datum = new Date()) {
  return `${s().ort} den ${fmt.datum(datum)}`;
}

function kanzleiAnschrift() {
  return [s().kanzlei, s().adresse ? `${s().adresse} ${s().ort}` : s().ort].join(", ");
}

// kleine Absenderzeile über der Empfängeranschrift (Briefe)
function absenderZeile() {
  return html`<div class="doc-absender">${joinHtml([s().kanzlei, s().adresse, s().ort, s().telefon ? `Tel. ${s().telefon}` : null], " · ")}</div>`;
}

function empfaenger(zeilen) {
  return html`<div class="doc-empfaenger">${absenderZeile()}<div>${zeilen}</div></div>`;
}

function anwaltVon(akte) {
  const id = (akte && akte.zustaendig_id) || state.me.id;
  const p = profileOf(id) || {};
  return { name: personName(id, myName()), titel: rangName(p) || "Rechtsanwalt" };
}

// Unterschrift der Kanzlei: Schriftzug über der Linie, darunter Name, Rang, Ort/Datum
function unterschrift(person, datum, { gruss = true } = {}) {
  return html`
    <div class="doc-unterschrift">
      ${gruss ? html`<p>Mit freundlichen Grüßen</p>` : ""}
      <div class="doc-sig-linie"><span class="sig">${signatureName(person.name)}</span></div>
      <div>${person.name}</div>
      <div>${person.titel} bei ${s().kanzlei}</div>
      <div>${ortDatum(datum)}</div>
    </div>`;
}

// Leere Unterschriftslinie (z. B. für den Mandanten)
function unterschriftFeld(name, zusatz, datum) {
  return html`
    <div class="doc-unterschrift">
      <div class="doc-sig-linie"></div>
      <div>${name}</div>
      ${zusatz ? html`<div>${zusatz}</div>` : ""}
      <div>${ortDatum(datum)}</div>
    </div>`;
}

function platzhalter(text) {
  return html`<span class="doc-platzhalter">[${text}]</span>`;
}

function kreuz(an) {
  return html`<span class="doc-check" contenteditable="false" title="Zum Ankreuzen klicken">${an ? "☒" : "☐"}</span>`;
}

// Freitext in Absätze: Leerzeile = neuer Absatz, Zeilenumbruch bleibt
function absaetze(text) {
  return String(text || "").split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean)
    .map((t) => html`<p>${multiline(t)}</p>`);
}

function aktenzeichenZeile(a) {
  return joinHtml([a.number ? `Unser Az.: ${a.number}` : null, a.az_extern ? `Ihr Az.: ${a.az_extern}` : null], " · ");
}

// ---------- Dokument-Dialog ----------
function openDocument({ title, content, autor, datum, onPrinted, verlaufAkte, verlaufText }) {
  if (!darf("akten_schreiben")) verlaufAkte = null;
  const dlg = openDialog({
    id: "doc-dialog",
    wide: true,
    title,
    body: html`
      <div class="doc-toolbar">
        <span class="muted small">Text direkt im Dokument anklicken und ändern. Gelb markierte Stellen ergänzen, ☐ zum Ankreuzen anklicken.</span>
        <span class="spacer"></span>
        ${verlaufAkte ? html`<label class="check small"><input type="checkbox" id="doc-verlauf" checked> Im Verlauf vermerken</label>` : ""}
        <button class="btn primary" type="button" data-doc="print">Drucken / PDF</button>
      </div>
      <div class="doc-preview"><div class="doc-page">${dokumentSeite(content, { autor, datum })}</div></div>`,
  });
  dokumentKreuzchen(dlg.querySelector(".doc-page"));
  let vermerkt = false;
  dlg.querySelector('[data-doc="print"]').addEventListener("click", async () => {
    const box = dlg.querySelector("#doc-verlauf");
    if (verlaufAkte && box && box.checked && !vermerkt) {
      vermerkt = true;
      attempt(() => insertRow("eintraege", { akte_id: verlaufAkte, art: "Schriftverkehr", text: verlaufText || `Dokument erstellt: ${title}` }));
    }
    if (onPrinted) onPrinted();
    dokumentDrucken(dlg.querySelector(".doc-page"));
  });
}

// ---------- Vorlagen ----------
function akteKontext(a) {
  const m = byId("mandanten", a.mandant_id) || {};
  return { a, m, mandant: mandantName(a), anwalt: anwaltVon(a) };
}

function vorwurfListe(a) {
  const list = a.vorwuerfe || [];
  if (!list.length) return "";
  return html`<ul>${list.map((v) => html`<li>${v.paragraph ? `${v.paragraph} – ` : ""}${v.titel}${(v.anzahl || 1) > 1 ? ` (${v.anzahl}×)` : ""}</li>`)}</ul>`;
}

function beamte(a) {
  return kinder("beteiligte", a.id).filter((b) => b.rolle === "Beamter");
}

// Gegenseite einer Klage: Beamte (mit Dienstnummer) → Gegenpartei → Feld „Gegenpartei“ der Akte
function beklagte(a) {
  const bet = kinder("beteiligte", a.id);
  const liste = beamte(a).length ? beamte(a) : bet.filter((b) => b.rolle === "Gegenpartei");
  if (liste.length) return liste.map((x) => x.name + (x.kontakt ? ` (${x.kontakt})` : ""));
  return a.opponent ? [a.opponent] : [];
}

function beweisListe(a) {
  const list = kinder("beweise", a.id);
  if (!list.length) return "";
  return html`<ul>${list.map((x) => html`<li>${x.art}: ${x.titel}</li>`)}</ul>`;
}

function sachverhalt(a, hinweis) {
  return a.summary ? absaetze(a.summary) : html`<p>${platzhalter(hinweis)}</p>`;
}

function preislisteAnlage() {
  if (!state.gebuehren.length) return "";
  const liste = [...state.gebuehren].sort((x, y) => x.bezeichnung.localeCompare(y.bezeichnung, "de"));
  return html`
    <div class="doc-anlage">
      <h2 class="doc-title doc-title-klein">Anlage: Preisliste von ${s().kanzlei}</h2>
      <p class="doc-small center">Stand ${fmt.datum(new Date())}</p>
      <table class="doc-table"><thead><tr><th>Leistung</th><th class="num">Preis</th></tr></thead>
      <tbody>${liste.map((g) => html`<tr><td>${g.bezeichnung}</td><td class="num">${fmt.geld(g.preis)}</td></tr>`)}</tbody></table>
    </div>`;
}

const VORLAGEN = [
  {
    key: "mandatsvertrag",
    label: "Mandatsvertrag",
    text: "Vertrag mit Vergütung (§2 zum Ankreuzen) – zum Unterschreiben.",
    build: ({ a, mandant, anwalt }) => html`
      <h1 class="doc-title">Mandatsvertrag</h1>
      <div class="doc-vertrag">
        <p>Zwischen</p>
        <p><em><u>${mandant}</u> (nachfolgend Mandant)</em></p>
        <p>und</p>
        <p><em>${kanzleiAnschrift()} (nachfolgend ${s().kanzlei})</em></p>
        <p>wird Folgendes vereinbart:</p>

        <h3>§1 Geltungsbereich</h3>
        <p>Der Mandant beauftragt ${s().kanzlei} in folgender Angelegenheit:<br>
          <u>${a.title}${a.opponent ? ` gegen ${a.opponent}` : ""}</u> (Az. ${a.number})</p>
        <p>Dieser Vertrag gilt für alle Handlungen, die in direktem Bezug zur vorgenannten Angelegenheit stehen, bis zur formalen Beendigung durch ${s().kanzlei}.</p>

        <h3>§2 Vergütung</h3>
        <p>Für die vorgenannten Aufgaben wird folgende Vergütung vereinbart:</p>
        <ul class="doc-optionen">
          <li>${kreuz(false)} Ein Festpreis von ${s().waehrung}__________</li>
          <li>${kreuz(false)} Eine Sachvergütung durch __________________</li>
          <li>${kreuz(true)} Eine Vergütung entsprechend der aktuellen Preisliste von ${s().kanzlei}</li>
          <li>${kreuz(false)} Eine Vergütung entsprechend der aktuellen Preisliste von ${s().kanzlei} mit Reduzierung um ____ %</li>
        </ul>
        <p>Diese wird im Voraus auf einen maximalen Rahmen von ${s().waehrung}__________ festgesetzt.
          <span class="doc-janein">${kreuz(false)} Ja ${kreuz(true)} Nein</span></p>
        <p>Sowie ein Anteil des Streitwertes in Höhe von ____ % im Erfolgsfall.
          <span class="doc-janein">${kreuz(false)} Ja ${kreuz(true)} Nein</span></p>
        <p>Rechnungen sind innerhalb von ${s().zahlungsziel_tage || 7} Tagen nach Zugang zu begleichen.</p>

        <h3>§3 Haftungsbeschränkung</h3>
        <p>${s().kanzlei} haftet nicht für Entscheidungen und Handlungen legitimierter Gerichte und Behörden des Staates San Andreas.</p>
        <p>${s().kanzlei} haftet für fahrlässige oder missgünstige Handlungen seiner Mitarbeiter, die in Bezug zum Mandanten stehen. Diese Haftung ist auf einen maximalen Streitwert von ${fmt.geld(100000)} beschränkt.</p>
        <p>Diese Haftungsbeschränkung gilt für alle in der Vergangenheit, Gegenwart und Zukunft auftretenden Forderungen in direktem Zusammenhang mit diesem Mandat.</p>

        <h3>§4 Garantien des Mandanten</h3>
        <p>Der Mandant verpflichtet sich durch Unterzeichnung dieses Vertrages:</p>
        <ul>
          <li>zur Verschwiegenheit über Firmengeheimnisse von ${s().kanzlei},</li>
          <li>zur ausschließlichen Vertretung eigener Interessen in rechtlichen Angelegenheiten,</li>
          <li>${s().kanzlei} im Umfang des Mandates nicht aktiv zu schaden,</li>
          <li>alle anfallenden Kosten wie vereinbart umgehend zu begleichen.</li>
        </ul>

        <h3>§5 Vertragsmissachtung</h3>
        <p>Bei Missachtung dieses Vertrages durch den Mandanten verfallen sämtliche Ansprüche des Mandanten gegenüber ${s().kanzlei}. Dies schließt die Schweigepflicht ein. Ebenso steht ${s().kanzlei} eine Schadensforderung von mindestens ${fmt.geld(1000000)} zu.</p>
        <p>Bei Missachtung dieses Vertrages durch ${s().kanzlei} verfallen sämtliche Ansprüche von ${s().kanzlei} gegenüber dem Mandanten. Eine Schadensforderung ist entsprechend den in §3 genannten Richtlinien möglich.</p>
      </div>
      <div class="doc-unterschriften">
        ${unterschrift(anwalt, undefined, { gruss: false })}
        ${unterschriftFeld(mandant)}
      </div>
      ${preislisteAnlage()}`,
  },
  {
    key: "vollmacht",
    label: "Vollmacht",
    text: "Mandant bevollmächtigt die Kanzlei – zum Unterschreiben.",
    build: ({ a, m, mandant, anwalt }) => html`
      <h1 class="doc-title">Vollmacht</h1>
      <p>Hiermit erteile ich,</p>
      <p><em><u>${mandant}</u>${m.geburtsdatum ? html`, geboren am ${m.geburtsdatum}` : ""}${m.adresse ? html`, wohnhaft ${m.adresse}` : ""}</em></p>
      <p>der Kanzlei</p>
      <p><em>${kanzleiAnschrift()}</em>, vertreten durch ${anwalt.name} (${anwalt.titel}),</p>
      <p>Vollmacht, mich in der Angelegenheit</p>
      <p class="doc-subject">${a.title}<br><span class="doc-small">${aktenzeichenZeile(a)}</span></p>
      <p>außergerichtlich und gerichtlich zu vertreten. Die Vollmacht umfasst insbesondere:</p>
      <ul>
        <li>die Vertretung gegenüber Polizei, Staatsanwaltschaft, Gerichten und Behörden,</li>
        <li>die Akteneinsicht einschließlich Bodycam-Aufnahmen und Einsatzberichten,</li>
        <li>die Stellung von Anträgen, insbesondere auf Haftprüfung und Haftverschonung,</li>
        <li>die Einlegung und Rücknahme von Rechtsmitteln,</li>
        <li>den Abschluss von Vergleichen und Absprachen,</li>
        <li>den Empfang von Zustellungen, Geldern und Wertsachen.</li>
      </ul>
      <p>Die Vollmacht gilt bis zum schriftlichen Widerruf.</p>
      <div class="doc-unterschriften">
        ${unterschriftFeld(mandant, "Vollmachtgeber")}
        ${unterschrift(anwalt, undefined, { gruss: false })}
      </div>`,
  },
  {
    key: "klage",
    label: "Schadenersatzklage",
    text: "Zivilklage auf Schadenersatz – Beklagte aus den Beteiligten.",
    build: ({ a, m, mandant, anwalt }) => {
      const gegen = beklagte(a);
      const betrag = html`${s().waehrung}${platzhalter("Betrag")}`;
      return html`
        <h1 class="doc-title">Schadenersatzklage</h1>
        ${empfaenger(html`An den<br>United States District Court<br>${s().ort}`)}
        <table class="doc-parteien">
          <tr><th>Kläger</th><td>${mandant}<br><span class="doc-small">vertreten durch ${s().kanzlei}, ${anwalt.name}</span></td></tr>
          <tr><th>Beklagte</th><td>${gegen.length ? joinHtml(gegen, html`<br>`) : platzhalter("Name bzw. Dienstnummer der Beklagten")}</td></tr>
          <tr><th>wegen</th><td>Schadenersatz in Höhe von ${betrag}</td></tr>
          ${a.az_extern ? html`<tr><th>Az.</th><td>${a.az_extern}</td></tr>` : ""}
        </table>

        <h3>Anträge</h3>
        <p>Namens und in Vollmacht des Klägers beantragen wir,</p>
        <ol>
          <li>${gegen.length > 1 ? "die Beklagten als Gesamtschuldner" : "die beklagte Partei"} zu verurteilen, an den Kläger ${betrag} zu zahlen,</li>
          <li>${gegen.length > 1 ? "den Beklagten" : "der beklagten Partei"} die Kosten des Verfahrens aufzuerlegen.</li>
        </ol>

        <h3>Begründung</h3>
        <h4>I. Sachverhalt</h4>
        ${sachverhalt(a, "Was ist passiert? Wann, wo, durch wen?")}
        ${kinder("beweise", a.id).length ? html`<p><strong>Beweis:</strong></p>${beweisListe(a)}` : ""}

        <div class="doc-zusammen">
          <h4>II. Schadenersatzforderung</h4>
          <p>Die Schadenersatzforderung stellt sich wie folgt dar:</p>
          <p>${mandant}${m.geburtsdatum ? `, geboren am ${m.geburtsdatum}` : ""}, ${platzhalter("Beruf / Lebensumstände")}.</p>
          <p>${platzhalter("Worin besteht der Schaden und wie errechnet sich der Betrag?")}</p>
          <p>Somit ergibt sich ein Schaden in Höhe von ${betrag}, dessen Ersatz der Kläger von ${gegen.length ? joinHtml(gegen, " und ") : "der beklagten Partei"} verlangt.</p>
        </div>

        ${unterschrift(anwalt, undefined, { gruss: false })}`;
    },
  },
  {
    key: "haftpruefung",
    label: "Antrag auf Haftprüfung",
    text: "An das Gericht – Aufhebung oder Aussetzung der Haft.",
    build: ({ a, mandant, anwalt }) => html`
      ${empfaenger(html`An das zuständige Gericht<br>Department of Justice<br>${s().ort}`)}
      <h1 class="doc-title">Antrag auf Haftprüfung</h1>
      <p class="doc-subject">In der Sache gegen ${mandant}<br><span class="doc-small">${aktenzeichenZeile(a)}</span></p>
      <p>Sehr geehrte Damen und Herren,</p>
      <p>in der oben genannten Sache zeige ich an, dass ich ${mandant} anwaltlich vertrete. Eine Vollmacht liegt vor.</p>
      <p>Namens und in Vollmacht meines Mandanten beantrage ich,</p>
      <ol>
        <li>die Haft zu überprüfen,</li>
        <li>den Haftbefehl aufzuheben, hilfsweise den Vollzug gegen geeignete Auflagen (z. B. Kaution, Meldeauflagen) auszusetzen.</li>
      </ol>
      <h3>Begründung</h3>
      ${sachverhalt(a, "Sachverhalt aus Sicht des Mandanten")}
      ${(a.vorwuerfe || []).length ? html`<p>Meinem Mandanten wird Folgendes vorgeworfen:</p>${vorwurfListe(a)}` : ""}
      <p>Ein Haftgrund liegt nicht vor. Insbesondere besteht weder Flucht- noch Verdunkelungsgefahr: ${platzhalter("z. B. fester Wohnsitz, Arbeitsplatz, Kooperation mit den Behörden")}. Die Fortdauer der Haft wäre unverhältnismäßig.</p>
      ${unterschrift(anwalt)}`,
  },
  {
    key: "akteneinsicht",
    label: "Antrag auf Akteneinsicht",
    text: "An Polizei / Staatsanwaltschaft – Berichte, Bodycam, Aussagen.",
    build: ({ a, mandant, anwalt }) => html`
      ${empfaenger(html`An das Los Santos Police Department<br>bzw. die Staatsanwaltschaft ${s().ort}`)}
      <h1 class="doc-title">Antrag auf Akteneinsicht</h1>
      <p class="doc-subject">Verfahren gegen ${mandant}<br><span class="doc-small">${aktenzeichenZeile(a)}</span></p>
      <p>Sehr geehrte Damen und Herren,</p>
      <p>ich vertrete ${mandant} in dem oben genannten Verfahren. Eine Vollmacht liegt vor.</p>
      <p>Ich beantrage Einsicht in die vollständige Verfahrensakte, insbesondere in:</p>
      <ul>
        <li>Einsatz- und Festnahmeberichte,</li>
        <li>Bodycam- und Dashcam-Aufnahmen,</li>
        <li>Zeugenaussagen und Vernehmungsprotokolle,</li>
        <li>sichergestellte Beweismittel und Spurenberichte.</li>
      </ul>
      <p>Ich bitte um Übermittlung der Unterlagen oder um einen Termin zur Einsichtnahme innerhalb von 3 Tagen.</p>
      ${unterschrift(anwalt)}`,
  },
  {
    key: "beschwerde",
    label: "Dienstaufsichtsbeschwerde",
    text: "Gegen Beamte – wenn der Mandant unfair behandelt wurde.",
    build: ({ a, mandant, anwalt }) => {
      const b = beamte(a);
      const gegen = b.length ? b.map((x) => x.name + (x.kontakt ? ` (${x.kontakt})` : "")).join(", ") : null;
      return html`
        ${empfaenger(html`An das Los Santos Police Department<br>Internal Affairs / Dienstaufsicht<br>${s().ort}`)}
        <h1 class="doc-title">Dienstaufsichtsbeschwerde</h1>
        <p class="doc-subject">gegen ${gegen || platzhalter("Name und Dienstnummer der Beamten")}<br><span class="doc-small">${aktenzeichenZeile(a)}</span></p>
        <p>Sehr geehrte Damen und Herren,</p>
        <p>namens und in Vollmacht von ${mandant} erhebe ich Dienstaufsichtsbeschwerde gegen ${gegen || "die beteiligten Beamten"}.</p>
        <h3>Sachverhalt</h3>
        ${sachverhalt(a, "Was ist passiert? Wann und wo?")}
        <h3>Beanstandetes Verhalten</h3>
        <p>${platzhalter("z. B. unverhältnismäßige Gewalt, Verweigerung des Anwalts, fehlende Belehrung, Beleidigung")}</p>
        ${kinder("beweise", a.id).length ? html`<p>Zum Beweis verweise ich auf:</p>${beweisListe(a)}` : ""}
        <p>Ich bitte um Prüfung, eine schriftliche Stellungnahme und die Mitteilung der ergriffenen Maßnahmen.</p>
        ${unterschrift(anwalt)}`;
    },
  },
  {
    key: "schriftsatz",
    label: "Freier Schriftsatz",
    text: "Leerer Brief mit Briefkopf und Unterschrift.",
    build: ({ a, mandant, anwalt }) => html`
      ${empfaenger(platzhalter("Empfänger"))}
      <h1 class="doc-title">${platzhalter("Titel")}</h1>
      <p class="doc-subject">In der Sache ${mandant} – ${a.title}<br><span class="doc-small">${aktenzeichenZeile(a)}</span></p>
      <p>Sehr geehrte Damen und Herren,</p>
      <p>${platzhalter("Text")}</p>
      ${unterschrift(anwalt)}`,
  },
];

function openVorlagenWahl(akteId) {
  const a = byId("akten", akteId);
  const dlg = openDialog({
    title: `Dokument erstellen – ${a.number}`,
    body: html`
      <p class="muted" style="margin-top:0">Die Vorlage wird mit den Daten der Akte gefüllt. Danach kannst du alles anpassen und drucken oder als PDF speichern.</p>
      <div class="template-list">${VORLAGEN.map((v) => html`<button type="button" data-vorlage="${v.key}"><strong>${v.label}</strong><span>${v.text}</span></button>`)}</div>`,
  });
  dlg.querySelector(".template-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-vorlage]");
    if (!b) return;
    const v = VORLAGEN.find((x) => x.key === b.dataset.vorlage);
    dlg.close();
    const ctx = akteKontext(a);
    openDocument({ title: `${v.label} – ${a.number}`, content: v.build(ctx), autor: ctx.anwalt.name,
      verlaufAkte: a.id, verlaufText: `Dokument erstellt: ${v.label}` });
  });
}

// ---------- Rechnung ----------
function posMenge(p) {
  return /^\s*\d+([.,]\d+)?\s*$/.test(String(p.menge ?? "1")) ? parseNumber(p.menge) : null;
}
function posGesamt(p) {
  const n = posMenge(p);
  return (n === null ? 1 : n) * (Number(p.einzel) || 0);
}

// Gemeinsamer Rechnungsinhalt (Kanzlei und Mandantenportal)
function rechnungInhalt(r, { aktenNr, unterzeichner, zusatz = "" }) {
  return html`
    ${empfaenger(r.empfaenger)}
    <h1 class="doc-title">Rechnung</h1>
    <table class="doc-info"><tbody>
      <tr><th>Rechnungs-Nr.</th><td>${r.nummer}</td></tr>
      <tr><th>Datum</th><td>${fmt.datum(r.datum)}</td></tr>
      ${aktenNr ? html`<tr><th>Akte</th><td>${aktenNr}</td></tr>` : ""}
    </tbody></table>
    <p class="doc-subject">${r.betreff || "Anwaltliche Leistungen"}</p>
    <p>Sehr geehrte/r ${r.empfaenger},</p>
    <p>${s().rechnung_einleitung}</p>
    <table class="doc-table">
      <thead><tr><th>Dienstleistung</th><th class="num">Anzahl</th><th class="num">Einzel</th><th class="num">Gesamt</th></tr></thead>
      <tbody>
        ${(r.positionen || []).map((p) => html`<tr>
          <td>${p.text}</td><td class="num">${p.menge ?? 1}</td>
          <td class="num">${posMenge(p) === null ? "/" : fmt.geld(p.einzel)}</td>
          <td class="num">${fmt.geld(posGesamt(p))}</td></tr>`)}
      </tbody>
      <tfoot><tr class="total"><td colspan="3">Summe</td><td class="num">${fmt.geld(r.summe)}</td></tr></tfoot>
    </table>
    <p>${s().rechnung_hinweis}</p>
    ${zusatz}
    ${unterschrift(unterzeichner, parseDate(r.datum))}`;
}

function rechnungDokument(r) {
  const unterzeichner = { name: personName(r.unterzeichner || state.me.id), titel: rangName(profileOf(r.unterzeichner || state.me.id)) || "Rechtsanwalt" };
  const a = byId("akten", r.akte_id);
  return rechnungInhalt(r, { aktenNr: a && a.number, unterzeichner });
}

function zahlungserinnerung(r) {
  const offene = state.rechnungen.filter((x) => x.status === "Offen" && norm(x.empfaenger) === norm(r.empfaenger))
    .sort((x, y) => (x.nummer || "").localeCompare(y.nummer || ""));
  const summe = offene.reduce((t, x) => t + (Number(x.summe) || 0), 0);
  return html`
    ${empfaenger(r.empfaenger)}
    <h1 class="doc-title">Zahlungserinnerung</h1>
    <p class="doc-subject">Offene Rechnungen – Stand ${fmt.datum(new Date())}</p>
    <p>Sehr geehrte/r ${r.empfaenger},</p>
    <p>sicher ist es Ihrer Aufmerksamkeit entgangen, dass folgende Rechnungen noch nicht beglichen wurden:</p>
    <table class="doc-table">
      <thead><tr><th>Rechnung</th><th>Datum</th><th>Betreff</th><th class="num">Betrag</th></tr></thead>
      <tbody>
        ${offene.map((x) => html`<tr><td>${x.nummer}</td><td>${fmt.datum(x.datum)}</td><td>${x.betreff || "–"}</td><td class="num">${fmt.geld(x.summe)}</td></tr>`)}
      </tbody>
      <tfoot><tr class="total"><td colspan="3">Summe</td><td class="num">${fmt.geld(summe)}</td></tr></tfoot>
    </table>
    <p>Wir bitten Sie, den offenen Betrag innerhalb von 3 Tagen zu begleichen. Sollte sich Ihre Zahlung mit diesem Schreiben überschnitten haben, betrachten Sie es bitte als gegenstandslos.</p>
    ${unterschrift(anwaltVon(null))}`;
}

// ---------- Aktenblatt ----------
function aktenblatt(a) {
  const m = byId("mandanten", a.mandant_id) || {};
  const sum = vorwurfSumme(a.vorwuerfe);
  const eintraege = kinder("eintraege", a.id).sort((x, y) => new Date(x.created_at) - new Date(y.created_at));
  const termine = kinder("termine", a.id).sort((x, y) => new Date(x.beginn) - new Date(y.beginn));
  const zeile = (label, value) => (value ? html`<tr><th>${label}</th><td>${value}</td></tr>` : "");
  return html`
    <h1 class="doc-title">Aktenblatt ${a.number}</h1>
    <p class="center doc-small" style="margin-top:-6mm;margin-bottom:6mm">Stand ${fmt.datumZeit(new Date())} · vertraulich</p>
    <table class="doc-info doc-info-breit"><tbody>
      ${zeile("Betreff", a.title)}
      ${zeile("Mandant", [mandantName(a), m.telefon].filter(Boolean).join(" · "))}
      ${zeile("Gegenpartei", a.opponent)}
      ${zeile("Rechtsgebiet / Mandatsart", [a.area, a.typ].filter(Boolean).join(" / "))}
      ${zeile("Status / Priorität", `${a.status} / ${a.prioritaet || "Normal"}`)}
      ${zeile("Zuständig", personName(a.zustaendig_id, a.lawyer || ""))}
      ${zeile("Az. Behörde / Gericht", a.az_extern)}
      ${zeile("Haft", a.in_haft ? `in Haft${a.haft_bis ? ` bis ${fmt.datumZeit(a.haft_bis)}` : ""}` : "")}
      ${zeile("Ergebnis", a.ergebnis ? `${a.ergebnis}${a.ergebnis_details ? ` – ${a.ergebnis_details}` : ""}` : "")}
    </tbody></table>
    <h3>Sachverhalt</h3>
    ${a.summary ? absaetze(a.summary) : html`<p>–</p>`}
    ${(a.vorwuerfe || []).length ? html`
      <h3>Tatvorwürfe</h3>
      <table class="doc-table"><thead><tr><th>Vorwurf</th><th class="num">Anzahl</th><th class="num">Geldstrafe</th><th class="num">Haft</th></tr></thead><tbody>
        ${a.vorwuerfe.map((v) => html`<tr><td>${v.paragraph ? `${v.paragraph} – ` : ""}${v.titel}</td><td class="num">${v.anzahl || 1}</td>
          <td class="num">${fmt.geld((Number(v.geldstrafe) || 0) * (v.anzahl || 1))}</td><td class="num">${fmt.haft((Number(v.haft) || 0) * (v.anzahl || 1))}</td></tr>`)}
      </tbody>
      <tfoot><tr class="total"><td>Strafrahmen gesamt</td><td></td><td class="num">${fmt.geld(sum.geld)}</td><td class="num">${fmt.haft(sum.haft)}</td></tr></tfoot></table>` : ""}
    ${kinder("beteiligte", a.id).length ? html`<h3>Beteiligte</h3><ul>${kinder("beteiligte", a.id).map((b) => html`<li><strong>${b.rolle}:</strong> ${b.name}${b.kontakt ? ` (${b.kontakt})` : ""}${b.notiz ? ` – ${b.notiz}` : ""}</li>`)}</ul>` : ""}
    ${kinder("beweise", a.id).length ? html`<h3>Beweismittel</h3><ul>${kinder("beweise", a.id).map((b) => html`<li><strong>${b.art}:</strong> ${b.titel}${b.link ? html` – <span class="doc-small">${b.link}</span>` : ""}${b.beschreibung ? ` – ${b.beschreibung}` : ""}</li>`)}</ul>` : ""}
    ${termine.length ? html`<h3>Termine</h3><ul>${termine.map((t) => html`<li>${fmt.datumZeit(t.beginn)} – ${t.art}: ${t.titel}${t.ort ? ` (${t.ort})` : ""}${t.erledigt ? " ✓" : ""}</li>`)}</ul>` : ""}
    ${eintraege.length ? html`<h3>Verlauf</h3>${eintraege.map((e) => html`<div class="doc-eintrag"><div class="doc-small">${fmt.datumZeit(e.created_at)} · ${e.art || "Notiz"} · ${eintragAutor(e)}${e.wichtig ? " · WICHTIG" : ""}</div><p>${multiline(e.text)}</p></div>`)}` : ""}`;
}

// ---------- Aktionen ----------
Object.assign(ACTIONS, {
  "dokument-waehlen": (d) => openVorlagenWahl(d.id),
  aktenblatt: (d) => {
    const a = byId("akten", d.id);
    openDocument({ title: `Aktenblatt ${a.number}`, content: aktenblatt(a) });
  },
  "rechnung-drucken": (d) => {
    const r = byId("rechnungen", d.id);
    openDocument({ title: `Rechnung ${r.nummer}`, content: rechnungDokument(r),
      autor: personName(r.unterzeichner || state.me.id), datum: parseDate(r.datum),
      verlaufAkte: r.akte_id, verlaufText: `Rechnung ${r.nummer} über ${fmt.geld(r.summe)} gedruckt` });
  },
  "rechnung-erinnerung": (d) => {
    const r = byId("rechnungen", d.id);
    openDocument({ title: `Zahlungserinnerung – ${r.empfaenger}`, content: zahlungserinnerung(r),
      verlaufAkte: r.akte_id, verlaufText: `Zahlungserinnerung an ${r.empfaenger} erstellt` });
  },
});
