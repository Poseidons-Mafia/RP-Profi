// =============================================================
//  Wiwang Law – Chronik einer Akte
//  Alles, was in einem Fall passiert: Ereignistypen mit passenden
//  Angaben, Phasen, Lagebild, Stränge (z. B. Deal-Verhandlung)
//  und automatische Systemzeilen aus dem Änderungsprotokoll.
// =============================================================

// ---------- Phasen ----------
const PHASEN = ["mandat", "vorverfahren", "klage", "verhandlung", "entscheidung", "rechtsmittel"];
const PHASEN_NAMEN = {
  straf: { mandat: "Mandat", vorverfahren: "Ermittlungen", klage: "Anklage", verhandlung: "Hauptverhandlung",
           entscheidung: "Urteil", rechtsmittel: "Rechtsmittel", ende: "Abgeschlossen" },
  zivil: { mandat: "Mandat", vorverfahren: "Außergerichtlich", klage: "Klage", verhandlung: "Verhandlung",
           entscheidung: "Urteil / Vergleich", rechtsmittel: "Rechtsmittel", ende: "Abgeschlossen" },
};

function phasenSchema(a) {
  return ["Strafrecht", "Verkehrsrecht"].includes(a.area) || ["Verteidigung", "Nebenklage", "Haftprüfung"].includes(a.typ)
    ? "straf" : "zivil";
}
function phaseVon(a) {
  return PHASEN.includes(a.phase) ? a.phase : "mandat";
}
function phaseName(a, key = phaseVon(a)) {
  return PHASEN_NAMEN[phasenSchema(a)][key] || PHASEN_NAMEN[phasenSchema(a)].mandat;
}

// ---------- Ereignistypen ----------
const KATEGORIEN = {
  mandat: "Mandat",
  haft: "Haft",
  ermittlung: "Ermittlungen",
  kommunikation: "Kommunikation",
  schriftsatz: "Anträge & Schriftsätze",
  verhandeln: "Deal & Vergleich",
  gericht: "Gericht",
  frist: "Fristen",
  beweis: "Beweise",
  intern: "Intern",
};
const BEHOERDEN = ["LSPD", "Sheriff", "State Police", "FIB", "Staatsanwaltschaft", "Justizvollzug"];
const GELD = { name: "geld", label: "Geldstrafe / Betrag", type: "money" };
const HAFT = { name: "haft", label: "Haft", type: "haft" };
const strafmass = (d) => [d.haft ? fmt.haft(d.haft) + " Haft" : "", d.geld ? fmt.geld(d.geld) : ""].filter(Boolean).join(", ");

// Felder: name, label, type (text, select, money, haft, datetime, team, beweis, textarea),
// options, required, list ("personen" = Namen aus der Akte), badge (Wert erscheint als Status-Abzeichen),
// meta (Kurzform in der Zeile). Folgen: was beim Anlegen zusätzlich passieren kann (abschaltbar).
const EREIGNISSE = [
  // Mandat
  { key: "erstkontakt", kat: "mandat", label: "Erstkontakt", felder: [
    { name: "kanal", label: "Wie?", type: "select", options: ["Telefon", "Persönlich", "Nachricht / Discord", "Im Gefängnis", "Über Dritte"] }] },
  { key: "mandat_angenommen", kat: "mandat", label: "Mandat angenommen", felder: [
    { name: "vorschuss", label: "Vorschuss / Honorar", type: "money", meta: (v) => `Vorschuss ${fmt.geld(v)}` },
    { name: "vollmacht", label: "Vollmacht", type: "select", options: ["Unterschrieben", "Folgt", "Keine"], meta: (v) => `Vollmacht: ${v}` }] },
  { key: "mandat_beendet", kat: "mandat", label: "Mandat beendet", felder: [
    { name: "grund", label: "Grund", type: "select", options: ["Fall erledigt", "Mandant hat gekündigt", "Niedergelegt", "Nicht gezahlt", "Interessenkonflikt", "Sonstiges"] }],
    folgen: [{ key: "abschluss", label: "Akte abschließen (Ergebnis „Mandat beendet“)", an: false, abschluss: () => ({ ergebnis: "Mandat beendet" }) }] },

  // Haft
  { key: "festnahme", kat: "haft", label: "Festnahme / Gewahrsam", phase: "vorverfahren", imTitel: ["behoerde"], felder: [
    { name: "behoerde", label: "Durch", placeholder: "z. B. LSPD", list: BEHOERDEN },
    { name: "ort", label: "Ort", placeholder: "z. B. Würfelpark" },
    { name: "haft_bis", label: "Haft voraussichtlich bis", type: "datetime", meta: (v) => `Haft bis ${fmt.datumZeit(v)}` }],
    titel: (d) => `Festnahme${d.behoerde ? ` durch ${d.behoerde}` : ""}`,
    folgen: [{ key: "haft", label: "In der Akte vermerken: Mandant ist in Haft", an: true, akte: (d) => ({ in_haft: true, haft_bis: d.haft_bis || null }) }] },
  { key: "haftpruefung_antrag", kat: "haft", label: "Haftprüfung beantragt", folge: "haftpruefung", felder: [
    { name: "bei", label: "Bei", placeholder: "z. B. Richter, Staatsanwaltschaft", list: "personen" }],
    offen: (d, k, e, a) => a.in_haft && !k.length && !kinder("eintraege", a.id).some((x) => x.typ === "haftpruefung" && zeitVon(x) >= zeitVon(e)) },
  { key: "haftpruefung", kat: "haft", label: "Haftprüfung entschieden", felder: [
    { name: "ergebnis", label: "Ergebnis", type: "select", required: true, badge: true, options: ["Haft aufgehoben", "Haft verkürzt", "Kaution festgesetzt", "Haft bestätigt"] },
    { name: "haft_bis", label: "Neues Haftende", type: "datetime", meta: (v) => `bis ${fmt.datumZeit(v)}` }],
    folgen: [
      { key: "haft_ende", label: "Haft in der Akte beenden (falls aufgehoben)", an: true, wenn: (d) => d.ergebnis === "Haft aufgehoben", akte: () => ({ in_haft: false }) },
      { key: "haft_bis", label: "Neues Haftende in die Akte übernehmen", an: true, wenn: (d) => !!d.haft_bis && d.ergebnis !== "Haft aufgehoben", akte: (d) => ({ haft_bis: d.haft_bis }) }] },
  { key: "kaution", kat: "haft", label: "Kaution", imTitel: ["betrag"], felder: [
    { name: "betrag", label: "Betrag", type: "money" },
    { name: "status", label: "Stand", type: "select", badge: true, options: ["Festgesetzt", "Gezahlt", "Verfallen"] }],
    titel: (d) => `Kaution${d.betrag ? ` ${fmt.geld(d.betrag)}` : ""}`,
    offen: (d) => d.status === "Festgesetzt" },
  { key: "entlassung", kat: "haft", label: "Entlassung aus der Haft", felder: [
    { name: "grund", label: "Wie?", type: "select", options: ["Haft verbüßt", "Haftprüfung", "Kaution", "Einstellung", "Freispruch", "Sonstiges"] }],
    folgen: [{ key: "haft_ende", label: "Haft in der Akte beenden", an: true, akte: () => ({ in_haft: false }) }] },

  // Ermittlungen
  { key: "vernehmung", kat: "ermittlung", label: "Vernehmung", phase: "vorverfahren", imTitel: ["wer"], felder: [
    { name: "wer", label: "Wer wurde vernommen?", placeholder: "Mandant, Zeuge …", list: "personen" },
    { name: "durch", label: "Durch", placeholder: "z. B. Det. Miller", list: "personen" },
    { name: "aussage", label: "Aussage", type: "select", badge: true, options: ["Hat ausgesagt", "Hat geschwiegen", "Teilweise"] }],
    titel: (d) => `Vernehmung${d.wer ? ` – ${d.wer}` : ""}` },
  { key: "akteneinsicht", kat: "ermittlung", label: "Akteneinsicht", phase: "vorverfahren", felder: [
    { name: "status", label: "Stand", type: "select", badge: true, options: ["Beantragt", "Erhalten", "Verweigert"] }],
    offen: (d) => d.status === "Beantragt" },
  { key: "durchsuchung", kat: "ermittlung", label: "Durchsuchung / Beschlagnahme", phase: "vorverfahren", felder: [
    { name: "ort", label: "Wo?" },
    { name: "gegenstaende", label: "Was wurde beschlagnahmt?" }] },
  { key: "ermittlung", kat: "ermittlung", label: "Sonstige Ermittlung", textTitel: true, felder: [] },

  // Kommunikation
  { key: "gespraech", kat: "kommunikation", label: "Gespräch mit Mandant", felder: [
    { name: "ort", label: "Wo / wie?", placeholder: "Kanzlei, Telefon, Zelle …" }] },
  { key: "telefonat", kat: "kommunikation", label: "Telefonat", imTitel: ["mit"], felder: [
    { name: "mit", label: "Mit", list: "personen" },
    { name: "richtung", label: "Richtung", type: "select", options: ["Ausgehend", "Eingehend"] }],
    titel: (d) => (d.mit ? `Telefonat mit ${d.mit}` : null) },
  { key: "kontakt_behoerde", kat: "kommunikation", label: "Kontakt StA / Polizei", imTitel: ["mit"], felder: [
    { name: "mit", label: "Mit", list: "personen" }],
    titel: (d) => (d.mit ? `Kontakt mit ${d.mit}` : null) },
  { key: "kontakt_gegenseite", kat: "kommunikation", label: "Kontakt Gegenseite", imTitel: ["mit"], felder: [
    { name: "mit", label: "Mit", list: "personen" }],
    titel: (d) => (d.mit ? `Kontakt mit ${d.mit}` : null) },
  { key: "schriftverkehr", kat: "kommunikation", label: "Schriftverkehr", felder: [
    { name: "richtung", label: "Richtung", type: "select", options: ["Gesendet", "Erhalten"] },
    { name: "partner", label: "An / von", list: "personen" }] },

  // Anträge & Schriftsätze
  { key: "antrag", kat: "schriftsatz", label: "Antrag", folge: "notiz", imTitel: ["art"], felder: [
    { name: "art", label: "Antrag auf", type: "select", required: true, options: ["Haftprüfung", "Akteneinsicht", "Einstellung", "Beweiserhebung", "Fristverlängerung", "Aussetzung", "Befangenheit", "Sonstiges"] },
    { name: "an", label: "Gestellt bei", placeholder: "Gericht, Staatsanwaltschaft …", list: "personen" },
    { name: "status", label: "Stand", type: "select", badge: true, options: ["Gestellt", "Stattgegeben", "Teilweise stattgegeben", "Abgelehnt", "Zurückgenommen"] }],
    titel: (d) => `Antrag${d.art ? ` auf ${d.art}` : ""}`,
    offen: (d) => !d.status || d.status === "Gestellt" },
  { key: "klage", kat: "schriftsatz", label: "Anklage / Klage", phase: "klage", imTitel: ["art"], felder: [
    { name: "art", label: "Was?", type: "select", required: true, options: ["Anklage durch StA", "Strafbefehl", "Klage eingereicht (von uns)", "Klage erhalten (Gegenseite)"] },
    { name: "gericht", label: "Gericht" }],
    titel: (d) => d.art || null },
  { key: "stellungnahme", kat: "schriftsatz", label: "Stellungnahme / Erwiderung", felder: [
    { name: "an", label: "An", list: "personen" }] },

  // Deal & Vergleich
  { key: "angebot", kat: "verhandeln", label: "Angebot / Deal-Vorschlag", folge: "angebot_antwort", imTitel: ["von"], felder: [
    { name: "von", label: "Angebot von", type: "select", required: true, options: ["Staatsanwaltschaft", "Gegenseite", "Uns"] },
    GELD, HAFT,
    { name: "bedingungen", label: "Bedingungen", placeholder: "z. B. Geständnis, Aussage gegen Mittäter" }],
    titel: (d) => (d.von === "Uns" ? "Angebot von uns" : `Angebot der ${d.von || "Gegenseite"}`),
    offen: (d, k) => {
      const last = [...k].reverse().find((x) => x.daten && x.daten.entscheidung);
      return !last || !["Angenommen", "Abgelehnt"].includes(last.daten.entscheidung);
    } },
  { key: "angebot_antwort", kat: "verhandeln", label: "Antwort auf Angebot", folge: "angebot_antwort", badgeImTitel: true, felder: [
    { name: "entscheidung", label: "Antwort", type: "select", required: true, badge: true, options: ["Gegenangebot", "Angenommen", "Abgelehnt", "Bedenkzeit"] },
    { name: "von", label: "Von", type: "select", options: ["Uns / Mandant", "Staatsanwaltschaft", "Gegenseite"] },
    GELD, HAFT],
    titel: (d) => (!d.entscheidung ? null : d.entscheidung === "Gegenangebot" ? "Gegenangebot" : d.entscheidung === "Bedenkzeit" ? "Bedenkzeit erbeten" : `Angebot ${d.entscheidung.toLowerCase()}`),
    folgen: [{ key: "abschluss", label: "Ergebnis in die Akte eintragen (falls angenommen)", an: true, wenn: (d) => d.entscheidung === "Angenommen",
      abschluss: (d, a) => ({ ergebnis: phasenSchema(a) === "straf" ? "Strafmilderung / Deal" : "Vergleich", ergebnis_details: strafmass(d) }) }] },

  // Gericht
  { key: "verhandlung", kat: "gericht", label: "Verhandlung", phase: "verhandlung", felder: [
    { name: "gericht", label: "Gericht / Richter", list: "personen" },
    { name: "ausgang", label: "Ausgang", type: "select", badge: true, options: ["Urteil gefallen", "Vertagt", "Fortsetzung folgt", "Abgebrochen"] }] },
  { key: "zeugenaussage", kat: "gericht", label: "Zeugenaussage", phase: "verhandlung", imTitel: ["zeuge"], felder: [
    { name: "zeuge", label: "Zeuge", required: true, list: "personen" },
    { name: "wirkung", label: "Wirkung für uns", type: "select", badge: true, options: ["Entlastend", "Neutral", "Belastend"] }],
    titel: (d) => (d.zeuge ? `Aussage ${d.zeuge}` : null) },
  { key: "urteil", kat: "gericht", label: "Urteil / Beschluss", phase: "entscheidung", badgeImTitel: true, felder: [
    { name: "ergebnis", label: "Ergebnis", type: "select", required: true, badge: true, options: OPTIONEN.ergebnis },
    GELD, HAFT],
    titel: (d) => (d.ergebnis ? `Urteil: ${d.ergebnis}` : null),
    folgen: [{ key: "abschluss", label: "Ergebnis in die Akte übernehmen und Akte abschließen", an: true,
      abschluss: (d) => ({ ergebnis: d.ergebnis, ergebnis_details: strafmass(d) }) }] },
  { key: "rechtsmittel", kat: "gericht", label: "Rechtsmittel", phase: "rechtsmittel", imTitel: ["art", "von"], felder: [
    { name: "art", label: "Art", type: "select", options: ["Berufung", "Revision", "Beschwerde", "Einspruch"] },
    { name: "von", label: "Eingelegt von", type: "select", options: ["Uns", "Staatsanwaltschaft", "Gegenseite"] },
    { name: "status", label: "Stand", type: "select", badge: true, options: ["Eingelegt", "Erfolgreich", "Teilweise erfolgreich", "Verworfen", "Zurückgenommen"] }],
    titel: (d) => (d.art ? `${d.art}${d.von ? ` (${d.von === "Uns" ? "von uns" : d.von})` : ""}` : null),
    offen: (d) => !d.status || d.status === "Eingelegt" },
  { key: "gericht", kat: "gericht", label: "Sonstiges bei Gericht", textTitel: true, felder: [] },

  // Fristen
  { key: "frist", kat: "frist", label: "Frist", imTitel: ["was"], felder: [
    { name: "was", label: "Wofür?", required: true, placeholder: "z. B. Stellungnahme, Zahlung, Einspruch" },
    { name: "bis", label: "Frist bis", type: "datetime", required: true, meta: (v) => `bis ${fmt.datumZeit(v)}` },
    { name: "status", label: "Stand", type: "select", badge: true, options: ["Läuft", "Verlängert", "Eingehalten", "Versäumt"] }],
    titel: (d) => (d.was ? `Frist: ${d.was}` : null),
    offen: (d, k, e) => {
      if (["Eingehalten", "Versäumt"].includes(d.status)) return false;
      const t = byId("termine", e.bezug && e.bezug.termin);
      return !(t && t.erledigt);
    },
    folgen: [{ key: "termin", label: "Als Frist in den Kalender eintragen", an: true, wenn: (d) => !!d.bis,
      termin: (d, titel) => ({ titel, art: "Frist", beginn: d.bis }) }] },

  // Beweise
  { key: "beweis", kat: "beweis", label: "Beweis-Vorgang", felder: [
    { name: "beweis_id", label: "Beweismittel", type: "beweis" },
    { name: "vorgang", label: "Was ist passiert?", type: "select", required: true, badge: true, options: ["Gesichert", "Gesichtet", "Angefordert", "Eingereicht", "Zugelassen", "Abgelehnt", "Verloren / gelöscht"] }],
    titel: (d) => {
      const b = byId("beweise", d.beweis_id);
      return b ? `${b.titel}${d.vorgang ? ` – ${d.vorgang.toLowerCase()}` : ""}` : d.vorgang ? `Beweis ${d.vorgang.toLowerCase()}` : null;
    } },

  // Intern
  { key: "notiz", kat: "intern", label: "Notiz", textTitel: true, felder: [] },
  { key: "intern", kat: "intern", label: "Interne Absprache", textTitel: true, felder: [] },
  { key: "uebergabe", kat: "intern", label: "Übergabe / Zuständigkeit", imTitel: ["an"], felder: [
    { name: "an", label: "Übergeben an", type: "team", required: true }],
    titel: (d) => (d.an ? `Übergabe an ${personName(d.an)}` : null),
    folgen: [{ key: "zustaendig", label: "Zuständigkeit in der Akte ändern", an: true, akte: (d) => (d.an ? { zustaendig_id: d.an } : null) }] },
];
const EREIGNIS = Object.fromEntries(EREIGNISSE.map((t) => [t.key, t]));
const ALTE_ARTEN = { Telefonat: "telefonat", "Gespräch": "gespraech", Gericht: "gericht", "Polizei / StA": "kontakt_behoerde", Schriftverkehr: "schriftverkehr", Intern: "intern" };
// Abgeschlossene Termine → passendes Ereignis zum Festhalten des Ergebnisses
const TERMIN_EREIGNIS = { Verhandlung: "verhandlung", "Haftprüfung": "haftpruefung", Vernehmung: "vernehmung", "Mandantengespräch": "gespraech" };

const TON_GUT = ["Stattgegeben", "Teilweise stattgegeben", "Angenommen", "Erhalten", "Eingehalten", "Haft aufgehoben", "Haft verkürzt",
  "Zugelassen", "Gezahlt", "Erfolgreich", "Teilweise erfolgreich", "Entlastend", "Gesichert", ...ERFOLGE];
const TON_SCHLECHT = ["Abgelehnt", "Verweigert", "Versäumt", "Haft bestätigt", "Verworfen", "Belastend", "Verfallen",
  "Verloren / gelöscht", "Verurteilung", "Klage verloren", "Abgebrochen"];
const tonKlasse = (v) => (TON_GUT.includes(v) ? "ok" : TON_SCHLECHT.includes(v) ? "offen" : "gold");

// ---------- Nachschlagen ----------
function ereignisTyp(e) {
  let key = typeof e === "string" ? e : e && e.typ;
  if (e && typeof e === "object" && (!key || key === "notiz") && ALTE_ARTEN[e.art]) key = ALTE_ARTEN[e.art];
  return EREIGNIS[key] || EREIGNIS.notiz;
}
const zeitVon = (e) => e.zeitpunkt || e.created_at;
// "Heute", "Gestern" oder "10.11." – kurz genug für die Zeitspalte
function tagKurz(value) {
  const t = fmt.tag(value);
  if (["Heute", "Gestern", "Morgen"].includes(t)) return t;
  const d = parseDate(value);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear() !== new Date().getFullYear() ? String(d.getFullYear()).slice(2) : ""}`;
}
// Zeitpunkte werden minutengenau erfasst – innerhalb einer Minute entscheidet die Erfassungszeit
const minute = (t) => Math.floor(new Date(t).getTime() / 60000);
const nachZeitAuf = (x, y) => minute(zeitVon(x)) - minute(zeitVon(y)) || new Date(x.created_at) - new Date(y.created_at);

function chronikKinder(akteId, elternId) {
  return state.eintraege.filter((e) => e.akte_id === akteId && e.eltern_id === elternId).sort(nachZeitAuf);
}
// Haupteinträge (ohne Antworten in Strängen)
function chronikWurzeln(akteId) {
  const alle = kinder("eintraege", akteId);
  const ids = new Set(alle.map((e) => e.id));
  return alle.filter((e) => !e.eltern_id || !ids.has(e.eltern_id));
}

function feldWert(f, v, { lang = false } = {}) {
  if (v === null || v === undefined || v === "") return null;
  if (f.meta && !lang) return f.meta(v);
  switch (f.type) {
    case "money": return fmt.geld(v);
    case "haft": return fmt.haft(v);
    case "datetime": return fmt.datumZeit(v);
    case "team": return personName(v);
    case "beweis": { const b = byId("beweise", v); return b ? b.titel : "Beweismittel (gelöscht)"; }
    default: return String(v);
  }
}

function ereignisTitel(e, a) {
  const t = ereignisTyp(e);
  if (e.titel) return e.titel;
  const auto = t.titel ? t.titel(e.daten || {}, a) : null;
  if (auto) return auto;
  if (t.textTitel && e.text) return truncate(e.text.split("\n")[0], 110);
  return t.label;
}

// Kurzinfos für die zweite Zeile (ohne das Status-Abzeichen)
function ereignisFakten(e) {
  const t = ereignisTyp(e);
  const d = e.daten || {};
  const ausblenden = e.titel ? [] : t.imTitel || [];
  return t.felder.filter((f) => !f.badge && f.type !== "beweis" && !ausblenden.includes(f.name))
    .map((f) => feldWert(f, d[f.name])).filter(Boolean);
}

function ereignisBadge(e, { auchImTitel = true } = {}) {
  const t = ereignisTyp(e);
  const f = t.felder.find((x) => x.badge);
  if (!auchImTitel && t.badgeImTitel && !e.titel) return null;
  return f && e.daten ? e.daten[f.name] || null : null;
}

function ereignisOffen(e, a, k = chronikKinder(a.id, e.id)) {
  const t = ereignisTyp(e);
  return a.status !== "Geschlossen" && !!t.offen && !!t.offen(e.daten || {}, k, e, a);
}

function ereignisSuchtext(e, a) {
  const t = ereignisTyp(e);
  return [ereignisTitel(e, a), e.text, t.label, KATEGORIEN[t.kat], Object.values(e.daten || {}).map(String), personName(e.author)];
}

// Links zu verknüpften Personen, Beweisen und Terminen
function bezugLinks(e) {
  const b = e.bezug || {};
  const out = [];
  for (const id of b.personen || []) {
    const p = byId("beteiligte", id);
    if (p) out.push(html`<a href="#/akten/${e.akte_id}/beteiligte">${p.name}</a> <span class="muted">(${p.rolle})</span>`);
  }
  for (const id of b.beweise || []) {
    const x = byId("beweise", id);
    if (x) out.push(html`<a href="${safeUrl(x.link) || `#/akten/${e.akte_id}/beweise`}" ${safeUrl(x.link) ? html`target="_blank" rel="noopener noreferrer"` : ""}>${x.art}: ${x.titel}</a>`);
  }
  const bewId = e.daten && e.daten.beweis_id;
  if (bewId && !(b.beweise || []).includes(bewId)) {
    const x = byId("beweise", bewId);
    if (x) out.push(html`<a href="${safeUrl(x.link) || `#/akten/${e.akte_id}/beweise`}" ${safeUrl(x.link) ? html`target="_blank" rel="noopener noreferrer"` : ""}>${x.art}: ${x.titel}</a>`);
  }
  if (b.termin) {
    const t = byId("termine", b.termin);
    if (t) out.push(html`<a href="#/akten/${e.akte_id}/termine">${t.art}: ${t.titel}, ${fmt.datumZeit(t.beginn)}${t.erledigt ? " ✓" : ""}</a>`);
  }
  return out;
}

// ---------- Systemzeilen aus dem Änderungsprotokoll ----------
const kurz = (v, n = 60) => (v === null || v === undefined || v === "" ? "–" : truncate(v, n));

function vorwurfSchluessel(v) {
  return v.gesetz_id || `${norm(v.paragraph)}|${norm(v.titel)}`;
}
function vorwurfName(v) {
  return v.paragraph ? `${v.paragraph} ${v.titel}` : v.titel;
}
function vorwurfAenderung(alt, neu) {
  if (!Array.isArray(neu) || !Array.isArray(alt)) return ["Tatvorwürfe geändert"];
  const a = new Map(alt.map((v) => [vorwurfSchluessel(v), v]));
  const n = new Map(neu.map((v) => [vorwurfSchluessel(v), v]));
  const teile = [];
  for (const [k, v] of n) {
    const o = a.get(k);
    if (!o) teile.push(`+ ${vorwurfName(v)}${(v.anzahl || 1) > 1 ? ` (${v.anzahl}×)` : ""}`);
    else {
      if ((o.anzahl || 1) !== (v.anzahl || 1)) teile.push(`${vorwurfName(v)}: ${o.anzahl || 1}× → ${v.anzahl || 1}×`);
      if ((o.status || "Erhoben") !== (v.status || "Erhoben")) teile.push(`${vorwurfName(v)}: ${(v.status || "Erhoben").toLowerCase()}`);
    }
  }
  for (const [k, v] of a) if (!n.has(k)) teile.push(`− ${vorwurfName(v)}`);
  return teile.length ? [`Tatvorwürfe: ${teile.join("; ")}`] : [];
}

// Aufeinanderfolgende Änderungen derselben Person am selben Datensatz (innerhalb 10 Min.) zusammenfassen
function protokollZusammenfassen(asc) {
  const out = [];
  for (const p of asc) {
    const prev = out[out.length - 1];
    if (prev && p.aktion === "UPDATE" && prev.aktion === "UPDATE" && prev.tabelle === p.tabelle && prev.datensatz === p.datensatz
        && prev.benutzer === p.benutzer && new Date(p.zeit) - new Date(prev.zeit) < 10 * 60000) {
      const ch = { ...(prev.aenderungen || {}) };
      for (const [k, w] of Object.entries(p.aenderungen || {})) ch[k] = ch[k] ? [ch[k][0], w[1]] : w;
      for (const k of Object.keys(ch)) if (JSON.stringify(ch[k][0]) === JSON.stringify(ch[k][1])) delete ch[k];
      out[out.length - 1] = { ...prev, aenderungen: ch, zeit: p.zeit };
      continue;
    }
    out.push(p);
  }
  return out.filter((p) => p.aktion !== "UPDATE" || Object.keys(p.aenderungen || {}).length);
}

// → { haupt: [...], neben: [...] } – "haupt" erscheint standardmäßig in der Chronik
function systemTexte(p, a) {
  const ch = p.aenderungen || {};
  let info = p.info || "";
  const haupt = [], neben = [];
  const was = (label) => (p.aktion === "INSERT" ? `${label} angelegt` : p.aktion === "DELETE" ? `${label} gelöscht` : `${label} geändert`);
  switch (p.tabelle) {
    case "akten": {
      if (p.aktion === "INSERT") { haupt.push("Akte angelegt"); break; }
      if (p.aktion !== "UPDATE") break;
      const rest = [];
      for (const [k, [alt, neu]] of Object.entries(ch)) {
        switch (k) {
          case "status": haupt.push(`Status: ${kurz(alt)} → ${kurz(neu)}`); break;
          case "phase": haupt.push(`Phase: ${phaseName(a, alt)} → ${phaseName(a, neu)}`); break;
          case "prioritaet": haupt.push(`Priorität: ${kurz(alt)} → ${kurz(neu)}`); break;
          case "zustaendig_id": haupt.push(`Zuständig: ${personName(alt, "niemand")} → ${personName(neu, "niemand")}`); break;
          case "in_haft": haupt.push(neu === "true" ? `Mandant in Haft${ch.haft_bis && ch.haft_bis[1] ? ` (bis ${fmt.datumZeit(ch.haft_bis[1])})` : ""}` : "Haft beendet"); break;
          case "haft_bis": if (!ch.in_haft && neu) haupt.push(`Haftende: ${fmt.datumZeit(neu)}`); break;
          case "ergebnis": haupt.push(neu ? `Ergebnis: ${neu}` : "Ergebnis entfernt"); break;
          case "vorwuerfe": haupt.push(...vorwurfAenderung(alt, neu)); break;
          case "stand": if (neu) haupt.push(`Lagebild: „${truncate(neu, 140)}“`); break;
          case "naechster_schritt": if (neu) haupt.push(`Nächster Schritt: „${truncate(neu, 100)}“`); break;
          case "verbunden": {
            const vorher = Array.isArray(alt) ? alt : [], nachher = Array.isArray(neu) ? neu : [];
            for (const id of nachher.filter((x) => !vorher.includes(x))) haupt.push(`Verknüpft mit ${(byId("akten", id) || {}).number || "einer Akte"}`);
            for (const id of vorher.filter((x) => !nachher.includes(x))) haupt.push(`Verknüpfung zu ${(byId("akten", id) || {}).number || "einer Akte"} entfernt`);
            break;
          }
          case "stand_am": case "client": case "mandant_id": case "lawyer": break;
          default: rest.push(FELD_NAMEN[k] || k);
        }
      }
      if (ch.mandant_id || ch.client) rest.push("Mandant");
      if (rest.length) neben.push(`Geändert: ${[...new Set(rest)].join(", ")}`);
      break;
    }
    case "beteiligte":
      (p.aktion === "UPDATE" ? neben : haupt).push(p.aktion === "INSERT" ? `Neue Person – ${info}` : p.aktion === "DELETE" ? `Person entfernt – ${info}` : `Person geändert – ${info}`);
      break;
    case "beweise":
      (p.aktion === "UPDATE" ? neben : haupt).push(`${was("Beweismittel")}: ${info}`);
      break;
    case "termine": {
      const t = byId("termine", p.datensatz);
      if (p.aktion === "INSERT") haupt.push(`Termin angesetzt: ${info}${t ? ` (${fmt.datumZeit(t.beginn)})` : ""}`);
      else if (p.aktion === "DELETE") haupt.push(`Termin gelöscht: ${info}`);
      else {
        if (ch.beginn) haupt.push(`Termin verschoben: ${info} (${fmt.datumZeit(ch.beginn[0])} → ${fmt.datumZeit(ch.beginn[1])})`);
        if (ch.erledigt) haupt.push(ch.erledigt[1] === "true" ? `Termin erledigt: ${info}` : `Termin wieder offen: ${info}`);
        const rest = Object.keys(ch).filter((k) => !["beginn", "erledigt"].includes(k));
        if (rest.length) neben.push(`Termin „${info}“ geändert: ${rest.map((k) => FELD_NAMEN[k] || k).join(", ")}`);
      }
      break;
    }
    case "aufgaben":
      if (p.aktion === "UPDATE" && ch.erledigt) neben.push(ch.erledigt[1] === "true" ? `Aufgabe erledigt: ${info}` : `Aufgabe wieder offen: ${info}`);
      else neben.push(`${was("Aufgabe")}: ${info}`);
      break;
    case "rechnungen":
      if (p.aktion === "UPDATE" && ch.status) haupt.push(`Rechnung ${info}: ${kurz(ch.status[0])} → ${kurz(ch.status[1])}`);
      else if (p.aktion === "UPDATE") neben.push(`Rechnung ${info} geändert`);
      else haupt.push(`${was("Rechnung")}: ${info}`);
      break;
    case "eintraege":
      if (EREIGNIS[info]) info = EREIGNIS[info].label;
      neben.push(p.aktion === "INSERT" ? `Eintrag erfasst: ${truncate(info, 80)}` : p.aktion === "DELETE" ? `Eintrag gelöscht: ${truncate(info, 80)}` : `Eintrag bearbeitet: ${truncate(info, 80)}`);
      break;
    default:
      neben.push(`${TABELLEN_NAMEN[p.tabelle] || p.tabelle} ${({ INSERT: "angelegt", UPDATE: "geändert", DELETE: "gelöscht" })[p.aktion] || ""}: ${info}`);
  }
  return { haupt, neben };
}

function systemZeilen(a, hist, alles) {
  if (!hist) return [];
  const asc = [...hist].sort((x, y) => new Date(x.zeit) - new Date(y.zeit) || x.id - y.id);
  const out = [];
  for (const p of protokollZusammenfassen(asc)) {
    const { haupt, neben } = systemTexte(p, a);
    const teile = alles ? [...haupt, ...neben] : haupt;
    if (!teile.length) continue;
    out.push({ system: true, id: `p${p.id}`, zeit: p.zeit, text: teile.join(" · "), haupt: haupt.length > 0, benutzer: p.benutzer,
      tabelle: p.tabelle, aktion: p.aktion, felder: Object.keys(p.aenderungen || {}) });
  }
  return out;
}

// Welche Phase galt zu einem Zeitpunkt? (aus den Phasen-Änderungen im Protokoll)
function phasenVerlauf(a, hist) {
  const wechsel = (hist || []).filter((p) => p.tabelle === "akten" && p.aenderungen && p.aenderungen.phase)
    .sort((x, y) => new Date(x.zeit) - new Date(y.zeit))
    .map((p) => ({ zeit: new Date(p.zeit), von: p.aenderungen.phase[0], nach: p.aenderungen.phase[1] }));
  const start = wechsel.length ? wechsel[0].von : a.phase;
  return (zeit) => {
    let ph = start;
    const t = new Date(zeit);
    for (const w of wechsel) if (w.zeit <= t) ph = w.nach;
    return PHASEN.includes(ph) ? ph : "mandat";
  };
}

// ---------- Darstellung ----------
function ereignisZeile(e, a, { tag = true, kompakt = false, mit = {} } = {}) {
  const t = ereignisTyp(e);
  const k = chronikKinder(a.id, e.id);
  const offen = !kompakt && !!ui.chronik.offen[e.id];
  const titel = ereignisTitel(e, a);
  const letzteMitBadge = [...k].reverse().find((x) => ereignisBadge(x));
  const badge = letzteMitBadge ? ereignisBadge(letzteMitBadge) : ereignisBadge(e, { auchImTitel: false });
  const pending = ereignisOffen(e, a, k);
  const wichtig = e.wichtig || k.some((x) => x.wichtig);
  const textVorschau = e.text && !(t.textTitel && !e.titel) ? truncate(e.text.replace(/\s+/g, " "), 110) : null;
  const meta = joinHtml([
    titel !== t.label ? t.label : null,
    ...ereignisFakten(e),
    k.length ? html`<strong>${k.length} ${k.length === 1 ? "Antwort" : "Antworten"}</strong>` : null,
    !offen || kompakt ? (kompakt ? textVorschau && truncate(textVorschau, 70) : textVorschau) : null,
    personName(e.author),
  ]);
  return html`
    <li class="ev kat-${t.kat} ${wichtig ? "wichtig" : ""} ${offen ? "open" : ""}" id="ev-${e.id}">
      <div class="ev-when" title="${fmt.tagLang(zeitVon(e))}">${tag ? html`<strong>${tagKurz(zeitVon(e))}</strong>` : ""}${fmt.zeit(zeitVon(e))}</div>
      <div class="ev-body">
        <div class="ev-head" ${kompakt ? html`data-action="ev-zeigen" data-akte="${a.id}"` : html`data-action="ev-toggle"`} data-id="${e.id}" title="${kompakt ? "In der Chronik öffnen" : offen ? "Zuklappen" : "Details anzeigen"}">
          <div class="ev-title">${wichtig ? html`<span class="pin" title="Angeheftet">★</span>` : ""}${titel}
            ${badge ? html`<span class="badge ${tonKlasse(badge)}">${badge}</span>` : ""}
            ${pending ? html`<span class="badge blue">offen</span>` : ""}</div>
          <div class="ev-meta">${meta}</div>
        </div>
        ${offen ? ereignisDetails(e, a, k, mit[e.id]) : ""}
      </div>
    </li>`;
}

function ereignisDetails(e, a, k, mit = []) {
  const t = ereignisTyp(e);
  const d = e.daten || {};
  const felder = t.felder.map((f) => [f.label, feldWert(f, d[f.name], { lang: true })]).filter(([, v]) => v);
  const links = bezugLinks(e);
  const nachtraeglich = Math.abs(new Date(e.created_at) - new Date(zeitVon(e))) > 3600000;
  return html`
    <div class="ev-detail">
      ${e.text ? html`<p class="pre">${e.text}</p>` : ""}
      ${felder.length ? html`<dl class="ev-facts">${felder.map(([l, v]) => html`<div><dt>${l}</dt><dd>${v}</dd></div>`)}</dl>` : ""}
      ${links.length ? html`<div class="ev-links"><span class="muted">Bezug:</span> ${joinHtml(links)}</div>` : ""}
      ${mit.length ? html`<div class="ev-links"><span class="muted">Dabei geändert:</span> ${mit.join(" · ")}</div>` : ""}
      ${k.length ? html`<ul class="ev-thread">${k.map((x) => strangZeile(x, a))}</ul>` : ""}
      <div class="ev-foot">
        <span class="muted small">${KATEGORIEN[t.kat]} · erfasst von ${personName(e.author)}, ${fmt.datumZeit(e.created_at)}${nachtraeglich ? " (nachträglich)" : ""}</span>
        <span class="spacer"></span>
        <button class="btn small" data-action="ereignis-folge" data-id="${e.id}" title="Antwort oder nächster Schritt in diesem Strang">↳ Fortsetzung</button>
        <button class="btn small" data-action="ereignis-wichtig" data-id="${e.id}">${e.wichtig ? "Lösen" : "Anheften"}</button>
        <button class="btn small" data-action="ereignis-bearbeiten" data-id="${e.id}">Bearbeiten</button>
      </div>
    </div>`;
}

function strangZeile(x, a) {
  const badge = ereignisBadge(x, { auchImTitel: false });
  return html`
    <li class="${x.wichtig ? "wichtig" : ""}">
      <div class="ev-title small">${x.wichtig ? html`<span class="pin">★</span>` : ""}${ereignisTitel(x, a)} ${badge ? html`<span class="badge ${tonKlasse(badge)}">${badge}</span>` : ""}</div>
      <div class="ev-meta">${joinHtml([fmt.datumZeit(zeitVon(x)), ...ereignisFakten(x), personName(x.author)])}</div>
      ${x.text ? html`<p class="pre">${x.text}</p>` : ""}
      ${bezugLinks(x).length ? html`<div class="ev-links">${joinHtml(bezugLinks(x))}</div>` : ""}
      <div class="tools"><button class="icon-btn" title="Bearbeiten" data-action="ereignis-bearbeiten" data-id="${x.id}">✎</button></div>
    </li>`;
}

function systemZeile(s, { tag = true } = {}) {
  return html`
    <li class="ev sys ${s.haupt ? "" : "neben"}">
      <div class="ev-when" title="${fmt.tagLang(s.zeit)}">${tag ? html`<strong>${tagKurz(s.zeit)}</strong>` : ""}${fmt.zeit(s.zeit)}</div>
      <div class="ev-body"><span class="sys-text">${s.text}</span> <span class="ev-meta">· ${personName(s.benutzer)}</span></div>
    </li>`;
}

// Liste mit Datum nur beim ersten Eintrag eines Tages
function chronikListe(items, a, opts = {}) {
  let letzterTag = null;
  return html`<ul class="ev-list">${items.map((i) => {
    const z = i.system ? i.zeit : zeitVon(i.e);
    const tag = ymd(z) !== letzterTag;
    letzterTag = ymd(z);
    return i.system ? systemZeile(i, { tag }) : ereignisZeile(i.e, a, { tag, ...opts });
  })}</ul>`;
}

// ---------- Tab: Chronik ----------
function tabChronik(a, evId) {
  const c = ui.chronik;
  if (c.akte !== a.id) Object.assign(c, { akte: a.id, kat: "", wichtig: false, q: "" });
  if (evId && c.zuletztGeoeffnet !== evId) {
    const e = byId("eintraege", evId);
    const ziel = e && e.eltern_id ? e.eltern_id : evId;
    c.offen[ziel] = true;
    c.zuletztGeoeffnet = evId;
    c.zielEv = ziel;
    ui.scrollTo = `ev-${ziel}`;
  }
  const hist = ui.historie[a.id];
  if (!hist) ladeHistorie(a.id);

  const wurzeln = chronikWurzeln(a.id);
  const katZahl = {};
  for (const e of wurzeln) { const k = ereignisTyp(e).kat; katZahl[k] = (katZahl[k] || 0) + 1; }
  const gefiltert = !!(c.kat || c.wichtig || c.q);

  let items = wurzeln.map((e) => ({ e, zeit: zeitVon(e), erfasst: e.created_at }));
  if (c.kat) items = items.filter((i) => ereignisTyp(i.e).kat === c.kat || chronikKinder(a.id, i.e.id).some((x) => ereignisTyp(x).kat === c.kat));
  if (c.wichtig) items = items.filter((i) => i.e.wichtig || chronikKinder(a.id, i.e.id).some((x) => x.wichtig));
  if (c.q) items = items.filter((i) => matches(c.q, ereignisSuchtext(i.e, a), chronikKinder(a.id, i.e.id).map((x) => ereignisSuchtext(x, a))));
  // Änderungen, die direkt beim Erfassen eines Ereignisses passiert sind (Phase, Haft …), gehören zu diesem
  const mit = {};
  if (c.ansicht !== "eintraege" && !c.kat && !c.wichtig) {
    const alle = kinder("eintraege", a.id);
    let sys = systemZeilen(a, hist, c.ansicht === "alles");
    if (c.ansicht === "standard") {
      sys = sys.filter((s) => {
        const abstand = (x) => new Date(s.zeit) - new Date(x.created_at);
        const passt = (x) => {
          const fo = (x.bezug && x.bezug.folgen) || [];
          if (!fo.length || norm(x.author) !== norm(s.benutzer) || Math.abs(abstand(x)) > 15000) return false;
          if (s.tabelle === "termine") return s.aktion === "INSERT" && fo.includes("termin");
          return s.tabelle === "akten" && s.aktion === "UPDATE" && s.felder.length && s.felder.every((f) => fo.includes(f) || f === "updated_at");
        };
        const e = alle.filter(passt).sort((x, y) => Math.abs(abstand(x)) - Math.abs(abstand(y)))[0];
        if (!e) return true;
        const root = e.eltern_id && alle.some((x) => x.id === e.eltern_id) ? e.eltern_id : e.id;
        (mit[root] = mit[root] || []).push(s.text);
        return false;
      });
    }
    items.push(...sys.filter((s) => !c.q || matches(c.q, s.text, personName(s.benutzer))));
  }
  items.sort((x, y) => minute(y.zeit) - minute(x.zeit) || new Date(y.erfasst || y.zeit) - new Date(x.erfasst || x.zeit));

  // Nach Phasen gruppieren (neueste zuerst); ältere Phasen eingeklappt
  const phaseAm = phasenVerlauf(a, hist);
  const gruppen = [];
  for (const i of items) {
    // Ereignisse, die selbst eine Phase einleiten (Anklage, Verhandlung, Urteil …), gehören in diese Phase –
    // auch wenn sie nachträglich mit früherer Uhrzeit erfasst wurden
    let ph = phaseAm(i.e && minute(i.e.created_at) === minute(i.zeit) ? i.e.created_at : i.zeit);
    const eigene = i.e && ereignisTyp(i.e).phase;
    if (eigene && PHASEN.indexOf(eigene) > PHASEN.indexOf(ph)) ph = eigene;
    const g = gruppen[gruppen.length - 1];
    if (g && g.phase === ph) g.items.push(i);
    else gruppen.push({ phase: ph, items: [i] });
  }
  // stabiler Schlüssel je Gruppe (für auf-/zugeklappt), von alt nach neu gezählt
  const zaehler = {};
  for (const g of [...gruppen].reverse()) { zaehler[g.phase] = (zaehler[g.phase] || 0) + 1; g.key = `${a.id}:${g.phase}:${zaehler[g.phase]}`; }
  const aktuell = phaseVon(a);
  const draftId = `draft-${a.id}`, typId = `typ-${a.id}`, wichtigId = `wichtig-${a.id}`;

  return html`
    <form class="entry-form" data-submit="eintrag" data-id="${a.id}">
      <textarea id="${draftId}" name="text" rows="2" data-input="draft"
        placeholder="Was ist passiert? z. B. Mandant hat angerufen, StA bietet Deal an, Zeuge widerspricht Bodycam …">${ui.drafts[draftId] || ""}</textarea>
      <div class="actions-row">
        <div class="actions-row">
          <select id="${typId}" name="typ" data-input="draft" title="Art des Ereignisses">${typAuswahl(ui.drafts[typId] || "notiz")}</select>
          <label class="check"><input type="checkbox" id="${wichtigId}" name="wichtig" data-input="draft" ${ui.drafts[wichtigId] ? "checked" : ""}> Anheften</label>
        </div>
        <div class="actions-row">
          <button class="btn" type="button" data-action="ereignis-details" data-akte="${a.id}" title="Mit Zeitpunkt, Angaben und Bezügen erfassen">Mit Details …</button>
          <button class="btn primary" type="submit">Eintragen</button>
        </div>
      </div>
    </form>

    <div class="chronik-tools">
      <div class="chips">
        <button class="chip ${!c.kat && !c.wichtig ? "active" : ""}" data-action="chronik-filter" data-kat="">Alle <span class="n">${wurzeln.length}</span></button>
        <button class="chip ${c.wichtig ? "active" : ""}" data-action="chronik-filter" data-wichtig="1">★ Angeheftet</button>
        ${Object.keys(KATEGORIEN).filter((k) => katZahl[k]).map((k) => html`
          <button class="chip ${c.kat === k ? "active" : ""}" data-action="chronik-filter" data-kat="${k}"><span class="kat-dot kat-${k}"></span>${KATEGORIEN[k]} <span class="n">${katZahl[k]}</span></button>`)}
      </div>
      <div class="actions-row">
        <div class="search"><input type="search" id="chronik-q" data-input="chronik-q" value="${c.q}" placeholder="In der Chronik suchen …"></div>
        <select id="chronik-ansicht" data-change="chronik-ansicht" title="Was soll angezeigt werden?">
          ${[["standard", "Einträge + wichtige Änderungen"], ["eintraege", "Nur Einträge"], ["alles", "Alles inkl. Protokoll"]]
            .map(([v, l]) => html`<option value="${v}" ${c.ansicht === v ? "selected" : ""}>${l}</option>`)}
        </select>
      </div>
    </div>

    ${!hist && c.ansicht !== "eintraege" ? html`<p class="muted small">Änderungen werden geladen …</p>` : ""}
    ${items.length ? gruppen.map((g, gi) => {
      const zeigen = gruppen.length === 1;
      const key = g.key;
      const mitZiel = c.zielEv && g.items.some((i) => i.e && i.e.id === c.zielEv);
      const auf = gefiltert || zeigen || gi === 0 || g.phase === aktuell || mitZiel ? c.phasen[key] !== false : c.phasen[key] === true;
      const eintraege = g.items.filter((i) => !i.system).length;
      return html`
        ${zeigen ? "" : html`
          <button class="phase-head ${auf ? "auf" : ""}" data-action="chronik-phase" data-key="${key}" data-auf="${auf ? "1" : ""}">
            <span class="chev">${auf ? "▾" : "▸"}</span> ${phaseName(a, g.phase)}${g.phase === aktuell && gi === 0 ? html` <span class="badge gold">aktuell</span>` : ""}
            <span class="muted small">${eintraege} ${eintraege === 1 ? "Eintrag" : "Einträge"}${g.items.length > eintraege ? ` · ${g.items.length - eintraege} Änderungen` : ""}</span>
          </button>`}
        ${auf ? chronikListe(g.items, a, { mit }) : ""}`;
    }) : html`<p class="empty">${gefiltert ? "Nichts gefunden." : "Noch nichts in der Chronik. Halte hier alles fest, was im Fall passiert – Gespräche, Festnahme, Anträge, Angebote, Verhandlungen."}</p>`}`;
}

function typAuswahl(selected) {
  return Object.entries(KATEGORIEN).map(([k, label]) => html`
    <optgroup label="${label}">${EREIGNISSE.filter((t) => t.kat === k).map((t) => html`<option value="${t.key}" ${t.key === selected ? "selected" : ""}>${t.label}</option>`)}</optgroup>`);
}

function typOptionen() {
  return EREIGNISSE.map((t) => ({ value: t.key, label: t.label, group: KATEGORIEN[t.kat] }));
}

INPUTS["chronik-q"] = (el) => { ui.chronik.q = el.value; scheduleRender(); };
CHANGES["chronik-ansicht"] = (el) => {
  ui.chronik.ansicht = el.value;
  try { localStorage.setItem("wiwang-chronik-ansicht", el.value); } catch {}
  render();
};

// Schnell-Eintrag: einfache Typen direkt speichern, sonst das Formular mit Details öffnen
SUBMITS.eintrag = async (form) => {
  const id = form.dataset.id;
  const text = form.elements.text.value.trim();
  const t = ereignisTyp(form.elements.typ.value);
  const wichtig = form.elements.wichtig.checked;
  const a = byId("akten", id);
  const braucht = t.felder.some((f) => f.required) || (t.folgen || []).length || (t.phase && PHASEN.indexOf(t.phase) > PHASEN.indexOf(phaseVon(a)));
  if (braucht || (!text && t.felder.length)) {
    openEreignisForm({ akteId: id, typ: t.key, preset: { text, wichtig }, nachSpeichern: () => schnellEintragLeeren(id, form) });
    return;
  }
  if (!text) { form.elements.text.focus(); return toast("Bitte kurz beschreiben, was passiert ist.", "error"); }
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  const ok = await attempt(() => insertRow("eintraege", { akte_id: id, typ: t.key, art: t.label, text, wichtig, zeitpunkt: new Date().toISOString() }));
  button.disabled = false;
  if (ok !== undefined) {
    schnellEintragLeeren(id, form);
    toast("Eingetragen");
  }
};

function schnellEintragLeeren(id, form) {
  delete ui.drafts[`draft-${id}`];
  delete ui.drafts[`wichtig-${id}`];
  delete ui.drafts[`typ-${id}`];
  if (form && form.isConnected) {
    form.elements.text.value = "";
    form.elements.wichtig.checked = false;
    form.elements.typ.value = "notiz";
  }
}

// ---------- Formular für ein Ereignis ----------
function feldFuerForm(f, a) {
  const base = { name: `d_${f.name}`, label: f.label, required: f.required, placeholder: f.placeholder, half: true };
  switch (f.type) {
    case "select": return { ...base, type: "select", options: f.options };
    case "money": return { ...base, type: "money" };
    case "haft": return { ...base, type: "number", label: `${f.label} (${state.settings.haft_einheit})` };
    case "datetime": return { ...base, type: "datetime" };
    case "team": return { ...base, type: "select", options: teamOptions };
    case "beweis": return { ...base, type: "select", emptyLabel: "— keins / noch nicht erfasst —",
      options: () => kinder("beweise", a.id).map((b) => ({ value: b.id, label: `${b.art}: ${b.titel}` })) };
    default: return { ...base, list: f.list === "personen" ? () => [...new Set([mandantName(a), ...kinder("beteiligte", a.id).map((b) => b.name)])] : f.list };
  }
}

function folgenVon(t, a) {
  const list = [...(t.folgen || [])];
  if (t.phase && PHASEN.indexOf(t.phase) > PHASEN.indexOf(phaseVon(a)) && a.status !== "Geschlossen") {
    list.unshift({ key: "phase", label: `Phase weiterschalten: „${phaseName(a)}“ → „${phaseName(a, t.phase)}“`, an: true, akte: () => ({ phase: t.phase }) });
  }
  return list;
}

function openEreignisForm({ akteId, eintrag = null, typ, preset = {}, elternId = null, intro, nachSpeichern }) {
  const a = byId("akten", akteId);
  const t = ereignisTyp(typ || (eintrag ? eintrag : "notiz"));
  const bezug = (eintrag && eintrag.bezug) || {};
  const d = { ...((eintrag && eintrag.daten) || {}), ...(preset.daten || {}) };
  const values = {
    typ: t.key,
    zeitpunkt: preset.zeitpunkt || (eintrag ? zeitVon(eintrag) : new Date().toISOString()),
    titel: preset.titel !== undefined ? preset.titel : eintrag ? eintrag.titel : null,
    text: preset.text !== undefined ? preset.text : eintrag ? eintrag.text : null,
    wichtig: preset.wichtig !== undefined ? preset.wichtig : eintrag ? eintrag.wichtig : false,
    personen: preset.personen || bezug.personen || [],
    beweise: preset.beweise || bezug.beweise || [],
    termin: preset.termin !== undefined ? preset.termin : bezug.termin || null,
  };
  for (const f of t.felder) values[`d_${f.name}`] = d[f.name];

  const personen = kinder("beteiligte", a.id);
  const beweise = kinder("beweise", a.id);
  const termine = kinder("termine", a.id).sort((x, y) => new Date(y.beginn) - new Date(x.beginn));
  const folgen = eintrag ? [] : folgenVon(t, a);
  const eltern = elternId ? byId("eintraege", elternId) : eintrag && eintrag.eltern_id ? byId("eintraege", eintrag.eltern_id) : null;
  const autoTitel = t.titel ? t.titel(d, a) : null;

  const fields = [
    { name: "typ", label: "Art des Ereignisses", type: "select", required: true, options: typOptionen(), half: true },
    { name: "zeitpunkt", label: "Wann ist es passiert?", type: "datetime", required: true, half: true },
    ...(t.felder.length ? [{ type: "section", label: t.label }] : []),
    ...t.felder.map((f) => feldFuerForm(f, a)),
    { type: "section", label: "Beschreibung" },
    { name: "titel", label: "Kurztitel", placeholder: autoTitel || (t.textTitel ? "leer = erste Zeile der Details" : t.label),
      help: "Eine Zeile, die in der Chronik steht. Leer lassen = automatisch." },
    { name: "text", label: "Details", type: "textarea", rows: 4, placeholder: "Was genau ist passiert? Wer hat was gesagt? Was bedeutet es für den Fall?" },
    ...(personen.length || beweise.length || termine.length ? [{ type: "section", label: "Bezug" }] : []),
    ...(personen.length ? [{ name: "personen", label: "Beteiligte Personen", type: "checks", options: personen.map((p) => ({ value: p.id, label: `${p.name} (${p.rolle})` })) }] : []),
    ...(beweise.length ? [{ name: "beweise", label: "Beweismittel", type: "checks", options: beweise.map((b) => ({ value: b.id, label: `${b.art}: ${truncate(b.titel, 40)}` })) }] : []),
    ...(termine.length ? [{ name: "termin", label: "Termin", type: "select", emptyLabel: "— kein Termin —",
      options: termine.map((x) => ({ value: x.id, label: `${fmt.datum(x.beginn)} · ${x.art}: ${truncate(x.titel, 40)}` })) }] : []),
    { name: "wichtig", label: "Wichtig – im Überblick anheften", type: "checkbox" },
    ...(folgen.length ? [{ type: "section", label: "Gleich miterledigen" }] : []),
    ...folgen.map((fo) => ({ name: `folge_${fo.key}`, label: fo.label, type: "checkbox", default: fo.an })),
  ];

  openForm({
    title: eintrag ? "Eintrag bearbeiten" : eltern ? `Fortsetzung: ${truncate(ereignisTitel(eltern, a), 50)}` : `Neues Ereignis – ${a.number}`,
    intro,
    fields,
    values,
    wide: true,
    submitLabel: eintrag ? "Speichern" : "Eintragen",
    onChange: (name, form) => {
      if (name !== "typ") return;
      const v = readForm(form, fields);
      const daten = {};
      for (const f of t.felder) if (v[`d_${f.name}`] !== null && v[`d_${f.name}`] !== undefined) daten[f.name] = v[`d_${f.name}`];
      openEreignisForm({ akteId, eintrag, typ: v.typ, elternId, intro, nachSpeichern,
        preset: { zeitpunkt: v.zeitpunkt, titel: v.titel, text: v.text, wichtig: v.wichtig, personen: v.personen, beweise: v.beweise, termin: v.termin, daten } });
    },
    onSubmit: async (v) => {
      const typNeu = ereignisTyp(v.typ);
      const daten = {};
      for (const f of typNeu.felder) {
        const x = v[`d_${f.name}`];
        if (x !== null && x !== undefined && x !== "") daten[f.name] = x;
      }
      const bez = {};
      if (v.personen && v.personen.length) bez.personen = v.personen;
      if (v.beweise && v.beweise.length) bez.beweise = v.beweise;
      if (v.termin) bez.termin = v.termin;
      if (!v.titel && !v.text && !Object.keys(daten).length && !typNeu.titel) throw new Error("Bitte einen Kurztitel oder Details eingeben.");
      const row = { typ: typNeu.key, art: typNeu.label, zeitpunkt: v.zeitpunkt, titel: v.titel, text: v.text, wichtig: v.wichtig, daten, bezug: bez };

      if (eintrag) {
        if (eintrag.bezug && eintrag.bezug.folgen) row.bezug = { ...row.bezug, folgen: eintrag.bezug.folgen };
        await updateRow("eintraege", eintrag.id, row);
        toast("Eintrag gespeichert");
        return;
      }

      // Folgen, die vor dem Speichern laufen müssen (Kalender-Frist wird verknüpft)
      const aktiv = folgen.filter((fo) => v[`folge_${fo.key}`] && (!fo.wenn || fo.wenn(daten)));
      const titelText = v.titel || (typNeu.titel && typNeu.titel(daten, a)) || typNeu.label;
      for (const fo of aktiv.filter((x) => x.termin)) {
        const termin = await attempt(() => insertRow("termine", { ...fo.termin(daten, titelText), akte_id: a.id, verantwortlich: a.zustaendig_id || state.me.id }));
        if (termin && termin.id) row.bezug = { ...row.bezug, termin: termin.id };
      }
      const akteUpdate = {};
      let abschluss = null;
      for (const fo of aktiv) {
        if (fo.akte) Object.assign(akteUpdate, fo.akte(daten, a) || {});
        if (fo.abschluss) abschluss = fo.abschluss(daten, a);
      }
      // merken, was dieses Ereignis an der Akte geändert hat (so erscheint es in der Chronik beim Ereignis)
      const folgenFelder = [...Object.keys(akteUpdate), ...(row.bezug.termin && aktiv.some((x) => x.termin) ? ["termin"] : [])];
      if (folgenFelder.length) row.bezug = { ...row.bezug, folgen: folgenFelder };
      const neu = await insertRow("eintraege", { ...row, akte_id: a.id, eltern_id: eltern ? (eltern.eltern_id || eltern.id) : null });
      if (eltern) ui.chronik.offen[eltern.eltern_id || eltern.id] = true;
      if (nachSpeichern) nachSpeichern(neu);

      // Folgen danach: Akte anpassen, Ergebnis eintragen
      if (Object.keys(akteUpdate).length) await attempt(() => updateRow("akten", a.id, akteUpdate));
      toast(akteUpdate.phase ? `Eingetragen · Phase: ${phaseName(a, akteUpdate.phase)}` : "Eingetragen");
      if (abschluss) setTimeout(() => openAbschlussForm(byId("akten", a.id), abschluss), 120);
    },
    onDelete: eintrag ? async () => {
      const k = chronikKinder(a.id, eintrag.id);
      if (!confirm(`Eintrag „${truncate(ereignisTitel(eintrag, a), 60)}“${k.length ? ` samt ${k.length} Antwort(en)` : ""} für alle löschen?`)) return false;
      await deleteRow("eintraege", eintrag.id);
      for (const x of k) removeLocal("eintraege", x.id);
      toast("Eintrag gelöscht");
    } : null,
  });
}

// ---------- Lagebild (Überblick) ----------
function lagebild(a) {
  const nt = naechsterTermin(a.id);
  const wurzeln = chronikWurzeln(a.id);
  const offene = wurzeln.filter((e) => ereignisOffen(e, a)).sort(nachZeitAuf);
  const kann = darf("akten_schreiben");
  const leer = !a.stand && !a.naechster_schritt;
  return html`
    <div class="lagebild">
      <div class="lb-head">
        <span class="lb-label">Lagebild</span>
        ${a.stand_am ? html`<span class="muted small">aktualisiert ${fmt.relativ(a.stand_am)}</span>` : ""}
        <span class="spacer"></span>
        <button class="btn small" data-action="akte-stand" data-id="${a.id}">${leer ? "Lagebild eintragen" : "Aktualisieren"}</button>
      </div>
      <div class="lb-row"><span class="lb-k">Stand</span><span class="lb-v pre">${a.stand || html`<span class="muted">${kann ? "Noch kein Lagebild – in 1–3 Sätzen: Wo stehen wir gerade?" : "–"}</span>`}</span></div>
      <div class="lb-row"><span class="lb-k">Nächster Schritt</span><span class="lb-v">${a.naechster_schritt || html`<span class="muted">–</span>`}</span></div>
      <div class="lb-row"><span class="lb-k">Nächster Termin</span><span class="lb-v">${nt
        ? html`<a href="#/akten/${a.id}/termine">${fmt.tag(nt.beginn)}, ${fmt.zeit(nt.beginn)} · ${nt.art}: ${nt.titel}</a> <span class="muted small">(${fmt.bis(nt.beginn)})</span>`
        : html`<span class="muted">keiner</span>`}</span></div>
      ${offene.length ? html`
        <div class="lb-row"><span class="lb-k">Offen</span><span class="lb-v"><ul class="lb-offen">${offene.map((e) => {
          const badge = ereignisBadge([...chronikKinder(a.id, e.id)].reverse().find((x) => ereignisBadge(x)) || e);
          const bis = e.daten && e.daten.bis;
          return html`<li><a href="#/akten/${a.id}/chronik/${e.id}">${ereignisTitel(e, a)}</a>
            ${badge ? html`<span class="badge ${tonKlasse(badge)}">${badge}</span>` : ""}
            <span class="muted small">${bis ? html`<span class="${new Date(bis) < new Date() ? "danger-text" : ""}">bis ${fmt.datumZeit(bis)}</span>` : `seit ${fmt.relativ(zeitVon(e))}`}</span></li>`;
        })}</ul></span></div>` : ""}
    </div>`;
}

function openStandForm(a) {
  openForm({
    title: `Lagebild – ${a.number}`,
    intro: "Kurz und aktuell halten: Wer die Akte öffnet, soll in 10 Sekunden wissen, wo der Fall steht.",
    fields: [
      { name: "stand", label: "Stand der Dinge", type: "textarea", rows: 3, placeholder: "z. B. StA bietet 15 HE + $10.000, Mandant überlegt bis Freitag. Bodycam fehlt noch." },
      { name: "naechster_schritt", label: "Nächster Schritt", placeholder: "z. B. Rückmeldung an StA bis Fr 20:00" },
    ],
    values: a,
    onSubmit: async (v) => {
      await updateRow("akten", a.id, { ...v, stand_am: new Date().toISOString() });
      toast("Lagebild gespeichert");
    },
  });
}

// ---------- Phasenleiste (Kopf der Akte) ----------
function phasenLeiste(a) {
  const geschlossen = a.status === "Geschlossen";
  const aktuell = phaseVon(a);
  const keys = PHASEN.filter((k) => k !== "rechtsmittel" || aktuell === "rechtsmittel");
  const idx = geschlossen ? keys.length : keys.indexOf(aktuell);
  const kann = darf("akten_schreiben") && !geschlossen;
  return html`<ol class="phasebar" aria-label="Verfahrensphase">
    ${keys.map((k, i) => {
      const cls = i < idx ? "done" : i === idx ? "current" : "";
      return html`<li class="${cls}">${kann && i !== idx
        ? html`<button type="button" data-action="akte-phase" data-id="${a.id}" data-phase="${k}" title="Phase auf „${phaseName(a, k)}“ setzen">${phaseName(a, k)}</button>`
        : html`<span>${phaseName(a, k)}</span>`}</li>`;
    })}
    <li class="${geschlossen ? "current ende" : ""}"><span>Abgeschlossen</span></li>
    ${kann && aktuell !== "rechtsmittel" && PHASEN.indexOf(aktuell) >= PHASEN.indexOf("entscheidung")
      ? html`<li class="extra"><button type="button" data-action="akte-phase" data-id="${a.id}" data-phase="rechtsmittel" title="Rechtsmittel eingelegt">+ Rechtsmittel</button></li>` : ""}
  </ol>`;
}

// ---------- Verbundene Akten ----------
function verbundeneAkten(a) {
  const ids = new Set([...(a.verbunden || []), ...state.akten.filter((x) => (x.verbunden || []).includes(a.id)).map((x) => x.id)]);
  ids.delete(a.id);
  return [...ids].map((id) => byId("akten", id)).filter(Boolean).sort((x, y) => (y.number || "").localeCompare(x.number || ""));
}

async function entknuepfen(a, b) {
  if ((a.verbunden || []).includes(b.id)) await updateRow("akten", a.id, { verbunden: a.verbunden.filter((x) => x !== b.id) });
  if ((b.verbunden || []).includes(a.id)) await updateRow("akten", b.id, { verbunden: b.verbunden.filter((x) => x !== a.id) });
}

// ---------- Aktionen ----------
Object.assign(ACTIONS, {
  "ev-zeigen": (d) => {
    ui.chronik.zuletztGeoeffnet = null;
    go(`akten/${d.akte}/chronik/${d.id}`);
  },
  "ev-toggle": (d) => {
    ui.chronik.offen[d.id] = !ui.chronik.offen[d.id];
    render();
  },
  "chronik-filter": (d) => {
    const c = ui.chronik;
    if (d.wichtig) { c.wichtig = !c.wichtig; c.kat = ""; }
    else { c.kat = c.kat === d.kat ? "" : d.kat; c.wichtig = false; }
    render();
  },
  "chronik-phase": (d) => {
    ui.chronik.phasen[d.key] = !d.auf;
    render();
  },
  "ereignis-details": (d, el) => {
    const form = el.closest("form");
    const text = form ? form.elements.text.value.trim() : "";
    const typ = form ? form.elements.typ.value : "notiz";
    const wichtig = form ? form.elements.wichtig.checked : false;
    openEreignisForm({ akteId: d.akte, typ, preset: { text: text || null, wichtig }, nachSpeichern: () => schnellEintragLeeren(d.akte, form) });
  },
  "ereignis-neu": (d) => openEreignisForm({ akteId: d.akte, typ: d.typ || "notiz" }),
  "ereignis-bearbeiten": (d) => {
    const e = byId("eintraege", d.id);
    if (e) openEreignisForm({ akteId: e.akte_id, eintrag: e });
  },
  "ereignis-folge": (d) => {
    const e = byId("eintraege", d.id);
    if (!e) return;
    const root = e.eltern_id ? byId("eintraege", e.eltern_id) || e : e;
    const t = ereignisTyp(root);
    openEreignisForm({ akteId: e.akte_id, typ: t.folge || "notiz", elternId: root.id,
      preset: { personen: (root.bezug && root.bezug.personen) || [] } });
  },
  "ereignis-wichtig": (d) => {
    const e = byId("eintraege", d.id);
    attempt(() => updateRow("eintraege", e.id, { wichtig: !e.wichtig }), e.wichtig ? "Gelöst" : "Angeheftet – erscheint im Überblick");
  },
  "akte-phase": (d) => {
    const a = byId("akten", d.id);
    attempt(() => updateRow("akten", a.id, { phase: d.phase }), `Phase: ${phaseName(a, d.phase)}`);
  },
  "akte-stand": (d) => openStandForm(byId("akten", d.id)),
  "akte-verknuepfen": (d) => {
    const a = byId("akten", d.id);
    const schon = new Set(verbundeneAkten(a).map((x) => x.id));
    openForm({
      title: `Akte verknüpfen – ${a.number}`,
      intro: "Z. B. eine neue Festnahme desselben Mandanten, ein Verfahren gegen Mittäter oder die zivilrechtliche Seite desselben Falls.",
      fields: [{ name: "ziel", label: "Akte", type: "select", required: true, empty: true, emptyLabel: "Bitte wählen …",
        options: () => akteOptions().filter((o) => o.value !== a.id && !schon.has(o.value)) }],
      submitLabel: "Verknüpfen",
      onSubmit: async (v) => {
        await updateRow("akten", a.id, { verbunden: [...new Set([...(a.verbunden || []), v.ziel])] });
        toast(`Verknüpft mit ${byId("akten", v.ziel).number}`);
      },
    });
  },
  "akte-entknuepfen": async (d) => {
    const a = byId("akten", d.id), b = byId("akten", d.ziel);
    if (!a || !b || !confirm(`Verknüpfung zwischen ${a.number} und ${b.number} entfernen?`)) return;
    attempt(() => entknuepfen(a, b), "Verknüpfung entfernt");
  },
  "akte-neu-verknuepft": (d) => {
    const a = byId("akten", d.id);
    openAkteForm(null, { mandant: mandantName(a), area: a.area, typ: a.typ, verbunden: [a.id] });
  },
});

// Termin erledigt → kurz festhalten, was dabei herauskam
function nachTerminErledigt(t) {
  if (!t || !t.akte_id || !darf("akten_schreiben")) return;
  // Frist aus der Chronik als eingehalten markieren
  for (const e of state.eintraege.filter((x) => x.akte_id === t.akte_id && x.typ === "frist" && x.bezug && x.bezug.termin === t.id)) {
    if (!["Eingehalten", "Versäumt"].includes((e.daten || {}).status)) {
      attempt(() => updateRow("eintraege", e.id, { daten: { ...e.daten, status: "Eingehalten" } }));
    }
  }
  const typ = TERMIN_EREIGNIS[t.art];
  if (!typ || state.eintraege.some((x) => x.bezug && x.bezug.termin === t.id && x.typ === typ)) return;
  openEreignisForm({
    akteId: t.akte_id, typ,
    intro: `„${t.titel}“ ist erledigt. Halte kurz fest, was dabei herauskam – oder auf „Abbrechen“, wenn nicht nötig.`,
    preset: { zeitpunkt: t.beginn, termin: t.id },
  });
}
