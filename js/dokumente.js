// =============================================================
//  Wiwang Law – Dokumente & Druck
//  Vorschau ist direkt bearbeitbar; "Drucken" erzeugt auf dem
//  iPhone/Mac auch ein PDF (Teilen → Drucken → PDF sichern).
// =============================================================

const s = () => state.settings;

function briefkopf() {
  return html`
    <div class="doc-letterhead">
      <div class="sender">${s().kanzlei} · ${s().ort}${s().telefon ? ` · Tel. ${s().telefon}` : ""}</div>
      <img src="assets/logo.png?v=8" alt="${s().kanzlei}">
    </div>`;
}

function ortDatum(datum = new Date()) {
  return `${s().ort} den ${fmt.datum(datum)}`;
}

function anwaltVon(akte) {
  const id = (akte && akte.zustaendig_id) || state.me.id;
  const p = profileOf(id) || {};
  return { name: personName(id, myName()), titel: p.titel || "Rechtsanwalt" };
}

function unterschrift(person, datum) {
  return html`
    <div class="doc-signature">
      <p>Mit freundlichen Grüßen</p>
      <div class="sig">${signatureName(person.name)}</div>
      <div>${person.name}</div>
      <div>${person.titel} bei ${s().kanzlei}</div>
      <div>${ortDatum(datum)}</div>
    </div>`;
}

function platzhalter(text) {
  return html`<span style="background:#fff3b0">[${text}]</span>`;
}

function aktenzeichenZeile(a) {
  return joinHtml([a.number ? `Unser Az.: ${a.number}` : null, a.az_extern ? `Ihr Az.: ${a.az_extern}` : null]);
}

// ---------- Dokument-Dialog ----------
function openDocument({ title, content, onPrinted, verlaufAkte, verlaufText }) {
  const dlg = openDialog({
    id: "doc-dialog",
    wide: true,
    title,
    body: html`
      <div class="doc-toolbar">
        <span class="muted small">Text direkt im Dokument anklicken und ändern. Gelb markierte Stellen ergänzen.</span>
        <span class="spacer"></span>
        ${verlaufAkte ? html`<label class="check small"><input type="checkbox" id="doc-verlauf" checked> Im Verlauf vermerken</label>` : ""}
        <button class="btn primary" type="button" data-doc="print">Drucken / PDF</button>
      </div>
      <div class="doc-preview"><div class="doc-page" contenteditable="true" spellcheck="true">${content}</div></div>`,
  });
  let vermerkt = false;
  dlg.querySelector('[data-doc="print"]').addEventListener("click", async () => {
    const page = dlg.querySelector(".doc-page");
    $("print-area").innerHTML = `<div class="doc-page">${page.innerHTML}</div>`;
    const box = dlg.querySelector("#doc-verlauf");
    if (verlaufAkte && box && box.checked && !vermerkt) {
      vermerkt = true;
      attempt(() => insertRow("eintraege", { akte_id: verlaufAkte, art: "Schriftverkehr", text: verlaufText || `Dokument erstellt: ${title}` }));
    }
    if (onPrinted) onPrinted();
    setTimeout(() => window.print(), 60);
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

const VORLAGEN = [
  {
    key: "vollmacht",
    label: "Vollmacht",
    text: "Mandant bevollmächtigt die Kanzlei – zum Unterschreiben.",
    build: ({ a, m, mandant, anwalt }) => html`
      ${briefkopf()}
      <h1 class="doc-title">Vollmacht</h1>
      <p>Hiermit erteile ich, <strong>${mandant}</strong>${m.geburtsdatum ? html`, geboren am ${m.geburtsdatum}` : ""}${m.adresse ? html`, wohnhaft ${m.adresse}` : ""},</p>
      <p>der Kanzlei <strong>${s().kanzlei}</strong>, vertreten durch ${anwalt.name} (${anwalt.titel}),</p>
      <p>Vollmacht, mich in der Angelegenheit</p>
      <p class="doc-subject">${a.title} (${aktenzeichenZeile(a)})</p>
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
      <p style="margin-top:8mm">${ortDatum()}</p>
      <div class="doc-sign-lines"><div>Unterschrift ${mandant}</div><div>Unterschrift ${anwalt.name}, ${s().kanzlei}</div></div>`,
  },
  {
    key: "mandatsvertrag",
    label: "Mandatsvertrag",
    text: "Vertrag mit Vergütung nach Gebührenkatalog (§2).",
    build: ({ a, mandant, anwalt }) => html`
      ${briefkopf()}
      <h1 class="doc-title">Mandatsvertrag</h1>
      <p>zwischen <strong>${mandant}</strong> – nachfolgend „Mandant“ –</p>
      <p>und der Kanzlei <strong>${s().kanzlei}</strong>, vertreten durch ${anwalt.name} – nachfolgend „Kanzlei“.</p>
      <h3>§1 Gegenstand des Mandats</h3>
      <p>Die Kanzlei übernimmt die rechtliche Vertretung und Beratung des Mandanten in der Angelegenheit „${a.title}“ (Az. ${a.number})${a.typ ? ` – ${a.typ}` : ""}.</p>
      <h3>§2 Vergütung</h3>
      <p>Die Vergütung richtet sich nach dem jeweils gültigen Gebührenkatalog der Kanzlei. Beratungen, Schriftsätze, Termine und Anreisen werden gesondert in Rechnung gestellt. Rechnungen sind innerhalb von ${s().zahlungsziel_tage || 7} Tagen nach Zugang zu begleichen.</p>
      ${state.gebuehren.length ? html`
        <table class="doc-table" style="margin-top:2mm"><thead><tr><th>Leistung (Auszug)</th><th>Preis</th></tr></thead>
        <tbody>${[...state.gebuehren].sort((x, y) => x.bezeichnung.localeCompare(y.bezeichnung, "de")).map((g) => html`<tr><td>${g.bezeichnung}</td><td>${fmt.geld(g.preis)}</td></tr>`)}</tbody></table>` : ""}
      <h3>§3 Pflichten des Mandanten</h3>
      <p>Der Mandant informiert die Kanzlei vollständig und wahrheitsgemäß über alle für das Mandat wichtigen Umstände und hält sie über neue Entwicklungen auf dem Laufenden.</p>
      <h3>§4 Verschwiegenheit</h3>
      <p>Die Kanzlei behandelt alle ihr anvertrauten Informationen streng vertraulich.</p>
      <h3>§5 Beendigung</h3>
      <p>Beide Seiten können das Mandat jederzeit beenden. Bis dahin erbrachte Leistungen sind zu vergüten.</p>
      <p style="margin-top:8mm">${ortDatum()}</p>
      <div class="doc-sign-lines"><div>Unterschrift ${mandant}</div><div>Unterschrift ${anwalt.name}, ${s().kanzlei}</div></div>`,
  },
  {
    key: "haftpruefung",
    label: "Antrag auf Haftprüfung",
    text: "An das Gericht – Aufhebung oder Aussetzung der Haft.",
    build: ({ a, mandant, anwalt }) => html`
      ${briefkopf()}
      <p>An das zuständige Gericht<br>Department of Justice<br>${s().ort}</p>
      <p class="doc-subject">Antrag auf Haftprüfung<br>In der Sache gegen ${mandant}${a.az_extern ? html` – Az. ${a.az_extern}` : ""}</p>
      <p>Sehr geehrte Damen und Herren,</p>
      <p>in der oben genannten Sache zeige ich an, dass ich ${mandant} anwaltlich vertrete. Eine Vollmacht liegt vor.</p>
      <p>Namens und in Vollmacht meines Mandanten beantrage ich,</p>
      <ol>
        <li>die Haft zu überprüfen,</li>
        <li>den Haftbefehl aufzuheben, hilfsweise den Vollzug gegen geeignete Auflagen (z. B. Kaution, Meldeauflagen) auszusetzen.</li>
      </ol>
      <h3>Begründung</h3>
      <p>${a.summary ? multiline(a.summary) : platzhalter("Sachverhalt aus Sicht des Mandanten")}</p>
      ${(a.vorwuerfe || []).length ? html`<p>Meinem Mandanten wird Folgendes vorgeworfen:</p>${vorwurfListe(a)}` : ""}
      <p>Ein Haftgrund liegt nicht vor. Insbesondere besteht weder Flucht- noch Verdunkelungsgefahr: ${platzhalter("z. B. fester Wohnsitz, Arbeitsplatz, Kooperation mit den Behörden")}. Die Fortdauer der Haft wäre unverhältnismäßig.</p>
      ${unterschrift(anwalt)}`,
  },
  {
    key: "akteneinsicht",
    label: "Antrag auf Akteneinsicht",
    text: "An Polizei / Staatsanwaltschaft – Berichte, Bodycam, Aussagen.",
    build: ({ a, mandant, anwalt }) => html`
      ${briefkopf()}
      <p>An das Los Santos Police Department<br>bzw. die Staatsanwaltschaft ${s().ort}</p>
      <p class="doc-subject">Antrag auf Akteneinsicht<br>Verfahren gegen ${mandant}${a.az_extern ? html` – Az. ${a.az_extern}` : ""}</p>
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
        ${briefkopf()}
        <p>An das Los Santos Police Department<br>Internal Affairs / Dienstaufsicht<br>${s().ort}</p>
        <p class="doc-subject">Dienstaufsichtsbeschwerde<br>gegen ${gegen || platzhalter("Name und Dienstnummer der Beamten")}</p>
        <p>Sehr geehrte Damen und Herren,</p>
        <p>namens und in Vollmacht von ${mandant} erhebe ich Dienstaufsichtsbeschwerde gegen ${gegen || "die beteiligten Beamten"}.</p>
        <h3>Sachverhalt</h3>
        <p>${a.summary ? multiline(a.summary) : platzhalter("Was ist passiert? Wann und wo?")}</p>
        <h3>Beanstandetes Verhalten</h3>
        <p>${platzhalter("z. B. unverhältnismäßige Gewalt, Verweigerung des Anwalts, fehlende Belehrung, Beleidigung")}</p>
        ${kinder("beweise", a.id).length ? html`<p>Zum Beweis verweise ich auf:</p><ul>${kinder("beweise", a.id).map((x) => html`<li>${x.art}: ${x.titel}</li>`)}</ul>` : ""}
        <p>Ich bitte um Prüfung, eine schriftliche Stellungnahme und die Mitteilung der ergriffenen Maßnahmen.</p>
        ${unterschrift(anwalt)}`;
    },
  },
  {
    key: "schriftsatz",
    label: "Freier Schriftsatz",
    text: "Leerer Brief mit Briefkopf und Unterschrift.",
    build: ({ a, mandant, anwalt }) => html`
      ${briefkopf()}
      <p>${platzhalter("Empfänger")}</p>
      <p class="doc-subject">In der Sache ${mandant} – ${a.title}<br><span style="font-weight:normal">${aktenzeichenZeile(a)}</span></p>
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
    openDocument({ title: `${v.label} – ${a.number}`, content: v.build(akteKontext(a)), verlaufAkte: a.id, verlaufText: `Dokument erstellt: ${v.label}` });
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

function rechnungDokument(r) {
  const unterzeichner = { name: personName(r.unterzeichner || state.me.id), titel: (profileOf(r.unterzeichner || state.me.id) || {}).titel || "Rechtsanwalt" };
  const a = byId("akten", r.akte_id);
  return html`
    ${briefkopf()}
    <h1 class="doc-title">Rechnung</h1>
    <p>${r.empfaenger}</p>
    <p class="doc-small">Rechnungs-Nr. ${r.nummer} · Datum ${fmt.datum(r.datum)}${a ? ` · Akte ${a.number}` : ""}</p>
    <p class="doc-subject">Rechnung – ${r.betreff || "Anwaltliche Leistungen"} ${fmt.datum(r.datum)}</p>
    <p>Sehr geehrte/r ${r.empfaenger},</p>
    <p>${s().rechnung_einleitung}</p>
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
    <p>${s().rechnung_hinweis}</p>
    ${unterschrift(unterzeichner, parseDate(r.datum))}`;
}

function zahlungserinnerung(r) {
  const offene = state.rechnungen.filter((x) => x.status === "Offen" && norm(x.empfaenger) === norm(r.empfaenger))
    .sort((x, y) => (x.nummer || "").localeCompare(y.nummer || ""));
  const summe = offene.reduce((t, x) => t + (Number(x.summe) || 0), 0);
  return html`
    ${briefkopf()}
    <h1 class="doc-title">Zahlungserinnerung</h1>
    <p>${r.empfaenger}</p>
    <p class="doc-subject">Offene Rechnungen – Stand ${fmt.datum(new Date())}</p>
    <p>Sehr geehrte/r ${r.empfaenger},</p>
    <p>sicher ist es Ihrer Aufmerksamkeit entgangen, dass folgende Rechnungen noch nicht beglichen wurden:</p>
    <table class="doc-table">
      <thead><tr><th>Rechnung</th><th>Datum</th><th>Betreff</th><th>Betrag</th></tr></thead>
      <tbody>
        ${offene.map((x) => html`<tr><td>${x.nummer}</td><td>${fmt.datum(x.datum)}</td><td>${x.betreff || "–"}</td><td>${fmt.geld(x.summe)}</td></tr>`)}
        <tr class="total"><td></td><td></td><td>Summe:</td><td>${fmt.geld(summe)}</td></tr>
      </tbody>
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
  const zeile = (label, value) => (value ? html`<tr><td style="width:48mm;color:#555">${label}</td><td>${value}</td></tr>` : "");
  return html`
    ${briefkopf()}
    <h1 class="doc-title" style="margin-bottom:2mm">Aktenblatt ${a.number}</h1>
    <p class="center doc-small">Stand ${fmt.datumZeit(new Date())} · vertraulich</p>
    <table class="doc-table" style="text-align:left"><tbody>
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
    <p>${a.summary ? multiline(a.summary) : "–"}</p>
    ${(a.vorwuerfe || []).length ? html`
      <h3>Tatvorwürfe</h3>
      <table class="doc-table"><thead><tr><th>Vorwurf</th><th>Anzahl</th><th>Geldstrafe</th><th>Haft</th></tr></thead><tbody>
        ${a.vorwuerfe.map((v) => html`<tr><td>${v.paragraph ? `${v.paragraph} – ` : ""}${v.titel}</td><td>${v.anzahl || 1}</td>
          <td>${fmt.geld((Number(v.geldstrafe) || 0) * (v.anzahl || 1))}</td><td>${fmt.haft((Number(v.haft) || 0) * (v.anzahl || 1))}</td></tr>`)}
        <tr class="total"><td>Strafrahmen gesamt</td><td></td><td>${fmt.geld(sum.geld)}</td><td>${fmt.haft(sum.haft)}</td></tr>
      </tbody></table>` : ""}
    ${kinder("beteiligte", a.id).length ? html`<h3>Beteiligte</h3><ul>${kinder("beteiligte", a.id).map((b) => html`<li><strong>${b.rolle}:</strong> ${b.name}${b.kontakt ? ` (${b.kontakt})` : ""}${b.notiz ? ` – ${b.notiz}` : ""}</li>`)}</ul>` : ""}
    ${kinder("beweise", a.id).length ? html`<h3>Beweismittel</h3><ul>${kinder("beweise", a.id).map((b) => html`<li><strong>${b.art}:</strong> ${b.titel}${b.link ? html` – <span class="doc-small">${b.link}</span>` : ""}${b.beschreibung ? ` – ${b.beschreibung}` : ""}</li>`)}</ul>` : ""}
    ${termine.length ? html`<h3>Termine</h3><ul>${termine.map((t) => html`<li>${fmt.datumZeit(t.beginn)} – ${t.art}: ${t.titel}${t.ort ? ` (${t.ort})` : ""}${t.erledigt ? " ✓" : ""}</li>`)}</ul>` : ""}
    ${eintraege.length ? html`<h3>Verlauf</h3>${eintraege.map((e) => html`<p><span class="doc-small">${fmt.datumZeit(e.created_at)} · ${e.art || "Notiz"} · ${personName(e.author)}${e.wichtig ? " · WICHTIG" : ""}</span><br>${multiline(e.text)}</p>`)}` : ""}`;
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
      verlaufAkte: r.akte_id, verlaufText: `Rechnung ${r.nummer} über ${fmt.geld(r.summe)} gedruckt` });
  },
  "rechnung-erinnerung": (d) => {
    const r = byId("rechnungen", d.id);
    openDocument({ title: `Zahlungserinnerung – ${r.empfaenger}`, content: zahlungserinnerung(r),
      verlaufAkte: r.akte_id, verlaufText: `Zahlungserinnerung an ${r.empfaenger} erstellt` });
  },
});
