// =============================================================
//  Wiwang Law – Akte aus Material (Nigel baut die Akte)
//  Discord-Tickets, Polizeiakten und Notizen einfügen → Nigel macht
//  daraus Stammdaten, Sachverhalt, Verlauf, Beteiligte, Tatvorwürfe,
//  Beweise, Termine und Aufgaben. Alles erscheint zuerst als Vorschau
//  mit Häkchen; gespeichert wird erst nach „Akte anlegen“/„Übernehmen“.
// =============================================================

const AUFNAHME_ARTEN = ["Discord-Ticket", "Polizeiakte", "Notiz / Sonstiges"];
const AUFNAHME_MAX = 120000; // Zeichen Material insgesamt (nach dem Aufräumen)
const AUFNAHME_PERSPEKTIVEN = [
  { value: "verteidigung", label: "Verteidigung – Mandant ist der Beschuldigte" },
  { value: "geschaedigter", label: "Geschädigte/r bzw. Anzeigeerstatter/in (Nebenklage)" },
  { value: "staatsanwaltschaft", label: "Staatsanwaltschaft – Akte ohne Mandant" },
];

// ---------- Discord-Text aufräumen ----------
// Discord liefert beim Kopieren Kopfzeilen wie „Name [TAG],  — 10/26/26, 7:32 PM“, Bot-Nachrichten
// über drei Zeilen („DOJ | Verwaltung“ / „APP“ / „ — 10/21/26, 12:38 AM“), Server-Tags als eigene Zeilen
// („ [CAT], “), Embed-Fußzeilen („Department of Justice – Ticket Zugriff•10/21/26, 12:39 AM“) und „Image“.
// Daraus wird: „[2026-10-21 00:38] Name:“ + Text – eindeutig datiert und ohne Rauschen.
const DC_MONATE = { jan: 1, januar: 1, january: 1, feb: 2, februar: 2, february: 2, "mär": 3, mrz: 3, "märz": 3, mar: 3, march: 3,
  apr: 4, april: 4, mai: 5, may: 5, jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, okt: 10, oct: 10, oktober: 10, october: 10, nov: 11, november: 11, dez: 12, dec: 12, dezember: 12, december: 12 };
const DC_ZEIT = String.raw`(\d{1,2}):(\d{2})(?:\s*([AaPp])\.?\s*[Mm]\.?)?(?:\s*Uhr)?`;
const DC_DATUM = [
  // 10/21/26, 12:38 AM (englische Discord-Oberfläche)
  { re: String.raw`(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+` + DC_ZEIT, f: (m) => [m[3], m[1], m[2], m[4], m[5], m[6]] },
  // 21.10.26, 00:38 (deutsche Oberfläche)
  { re: String.raw`(\d{1,2})\.(\d{1,2})\.(\d{2,4}),?\s+` + DC_ZEIT, f: (m) => [m[3], m[2], m[1], m[4], m[5], m[6]] },
  // Heute um 14:32 · Gestern um 9:05 · Today at 2:32 PM · Yesterday at 9:05 AM
  { re: String.raw`(Heute|Gestern|Today|Yesterday)\s+(?:um|at)\s+` + DC_ZEIT, f: (m) => {
    const d = new Date();
    if (/^(Gestern|Yesterday)$/i.test(m[1])) d.setDate(d.getDate() - 1);
    return [d.getFullYear(), d.getMonth() + 1, d.getDate(), m[2], m[3], m[4]];
  } },
];

function dcDatumText(teile) {
  let [j, mo, t, h, mi, ap] = teile.map((x, i) => (i === 5 ? x : Number(x)));
  if (j < 100) j += 2000;
  if (ap) {
    const pm = /p/i.test(ap);
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
  }
  if (!(mo >= 1 && mo <= 12 && t >= 1 && t <= 31 && h >= 0 && h < 24 && mi >= 0 && mi < 60)) return null;
  const p = (n) => String(n).padStart(2, "0");
  return `${j}-${p(mo)}-${p(t)} ${p(h)}:${p(mi)}`;
}

// „Name — Datum“ → { name, datum } oder null
function dcKopfzeile(zeile) {
  for (const d of DC_DATUM) {
    const m = zeile.match(new RegExp(String.raw`^(.*?)\s*[—–]\s*` + d.re + String.raw`\s*$`, "i"));
    if (!m) continue;
    const name = m[1];
    const datum = dcDatumText(d.f(m.slice(1)));
    if (datum) return { name, datum };
  }
  return null;
}

function dcName(roh) {
  return String(roh || "")
    .replace(/\s+(APP|BOT|APP\s*\[[^\]]*\])\s*$/i, "")
    .replace(/(\s*\[[^\]]{1,24}\],?)+\s*$/, "")   // Server-Tag am Ende: „ [CAT], “
    .replace(/[,\s]+$/, "")
    .trim();
}

const DC_RAUSCHEN = [
  /^\s*(\[[^\]]{1,24}\],?\s*)+$/,                       // „ [CAT], “ – Server-Tag als eigene Zeile
  /^(Image|Bild|GIF|Video|Attachment|Anhang|NEW|NEU|Neu|Jump|Springen|Click to see attachment|Klicke, um den Anhang anzusehen)$/i,
  /^\((edited|bearbeitet)\)$/i,
  /^(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?,?\s*\d{1,2}\.?\s+[A-Za-zäöüÄÖÜ]+\.?\s+\d{4}$/, // Datumstrenner „21. Oktober 2026“
  /^[A-Za-z]+\s+\d{1,2},\s+\d{4}$/,                      // „October 21, 2026“
];

function discordAufraeumen(roh) {
  const zeilen = String(roh || "").replace(/\r\n?/g, "\n").replace(/ /g, " ").split("\n");
  const nachrichten = [];
  let aktuell = null;
  let vorlauf = []; // Text vor der ersten Kopfzeile
  const ziel = () => (aktuell ? aktuell.zeilen : vorlauf);

  for (const original of zeilen) {
    const zeile = original.replace(/\s+$/, "");
    const kopf = dcKopfzeile(zeile.trim());
    if (kopf) {
      let name = dcName(kopf.name);
      let bot = /\s(APP|BOT)\s*$/i.test(kopf.name);
      if (!name) {
        // Bot-Nachricht: Name und „APP“ stehen in den Zeilen davor (und hängen gerade an der vorigen Nachricht)
        const z = ziel();
        while (z.length && !z[z.length - 1].trim()) z.pop();
        if (z.length && /^(APP|BOT)$/i.test(z[z.length - 1].trim())) { z.pop(); bot = true; }
        while (z.length && !z[z.length - 1].trim()) z.pop();
        if (z.length) name = dcName(z.pop());
      }
      aktuell = { name: (name || "Unbekannt") + (bot ? " (Bot)" : ""), datum: kopf.datum, zeilen: [] };
      nachrichten.push(aktuell);
      continue;
    }
    const t = zeile.trim();
    if (DC_RAUSCHEN.some((re) => re.test(t))) continue;
    // Embed-Fußzeile „Department of Justice – Ticket Zugriff•10/21/26, 12:39 AM“ – die Zeit steht schon im Kopf
    if (/•/.test(t) && DC_DATUM.some((d) => new RegExp("•\\s*" + d.re + "\\s*$", "i").test(t))) continue;
    let sauber = zeile
      .replace(/\s*\((edited|bearbeitet)\)\s*$/i, "")
      .replace(/<@&\d+>/g, "@Rolle")
      .replace(/<@!?\d+>/g, "@Person")
      .replace(/<#\d+>/g, "#Kanal")
      .replace(/\s*\(\d{17,20}\)/g, "");               // Discord-IDs in Klammern
    // Zeitstempel fortgesetzter Nachrichten: „[2:27 PM] Text“
    sauber = sauber.replace(new RegExp("^\\s*\\[" + DC_ZEIT + "\\]\\s*"), (m) => `(${m.replace(/[[\]\s]/g, "")}) `);
    ziel().push(sauber);
  }

  const block = (zeilenListe) => zeilenListe.join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const teile = [];
  const vor = block(vorlauf);
  if (vor) teile.push(vor);
  for (const n of nachrichten) {
    const text = block(n.zeilen);
    teile.push(`[${n.datum}] ${n.name}:${text ? "\n" + text : " (ohne Text)"}`);
  }
  return { text: teile.join("\n\n"), nachrichten: nachrichten.length,
    personen: [...new Set(nachrichten.map((n) => n.name))],
    von: nachrichten[0] ? nachrichten[0].datum : null, bis: nachrichten.length ? nachrichten[nachrichten.length - 1].datum : null };
}

function istDiscordText(roh) {
  return String(roh || "").split(/\r?\n/).filter((z) => dcKopfzeile(z.trim())).length >= 1;
}

function textAufraeumen(roh) {
  return String(roh || "").replace(/\r\n?/g, "\n").replace(/ /g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
}

function linksIn(text) {
  return [...new Set((String(text || "").match(/https?:\/\/[^\s<>()"'`\]]+/g) || []).map((u) => u.replace(/[.,;:!?]+$/, "")))];
}

// HTML-Transkript eines Ticket-Bots (DiscordChatExporter / Ticket Tool / discord-html-transcripts) → Text im Kopierformat
function transkriptZuText(htmlText) {
  const doc = new DOMParser().parseFromString(htmlText, "text/html");
  doc.querySelectorAll("script,style,noscript").forEach((e) => e.remove());
  const textVon = (el) => {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll("br").forEach((b) => b.replaceWith("\n"));
    c.querySelectorAll("p,div,li,tr,h1,h2,h3,h4,h5,h6,blockquote,pre").forEach((b) => b.append("\n"));
    c.querySelectorAll("a[href]").forEach((a) => { if (/^https?:/i.test(a.href) && !a.textContent.includes(a.href)) a.append(` ${a.href}`); });
    return c.textContent.replace(/\n{3,}/g, "\n\n").trim();
  };
  const zeit = (s) => {
    const d = new Date(s);
    if (isNaN(d)) return null;
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getMonth() + 1)}/${p(d.getDate())}/${String(d.getFullYear()).slice(2)}, ${d.getHours() % 12 || 12}:${p(d.getMinutes())} ${d.getHours() < 12 ? "AM" : "PM"}`;
  };
  const aus = [];
  // discord-html-transcripts: <discord-message author="…" timestamp="…">
  const komponenten = doc.querySelectorAll("discord-message");
  if (komponenten.length) {
    komponenten.forEach((m) => {
      const t = zeit(m.getAttribute("timestamp")) || m.getAttribute("timestamp") || "";
      aus.push(`${m.getAttribute("author") || "Unbekannt"}${m.hasAttribute("bot") ? " APP" : ""} — ${t}`, textVon(m), "");
    });
    return aus.join("\n");
  }
  // DiscordChatExporter / Ticket Tool: .chatlog__message-group bzw. .chatlog__message-container
  const gruppen = doc.querySelectorAll(".chatlog__message-group, .chatlog__message-container");
  if (gruppen.length) {
    let letzterName = "Unbekannt";
    gruppen.forEach((g) => {
      const autor = g.querySelector(".chatlog__author, .chatlog__author-name");
      if (autor) letzterName = (autor.getAttribute("title") || autor.textContent || letzterName).trim();
      const ts = g.querySelector(".chatlog__timestamp");
      const roh = ts ? (ts.getAttribute("title") || ts.textContent || "").trim() : "";
      const t = zeit(roh) || roh;
      const inhalt = [...g.querySelectorAll(".chatlog__content, .chatlog__embed, .chatlog__attachment")].map(textVon).filter(Boolean).join("\n");
      if (!inhalt) return;
      aus.push(t ? `${letzterName} — ${t}` : `${letzterName}:`, inhalt, "");
    });
    return aus.join("\n");
  }
  return textVon(doc.body);
}

// ---------- Zustand ----------
const auf = { akteId: null, stuecke: [], perspektive: "verteidigung", laeuft: null, ergebnis: null };

function aufMaterial() {
  return auf.stuecke.map((s, i) => {
    const discord = s.art === "Discord-Ticket";
    const r = discord ? discordAufraeumen(s.text) : { text: textAufraeumen(s.text) };
    return { ...s, i, sauber: r.text, info: r };
  }).filter((s) => s.sauber);
}

function aufMaterialText(material) {
  return material.map((s, n) => `===== Stück ${n + 1}: ${s.art}${s.name ? ` (${s.name})` : ""} =====\n${s.sauber}`).join("\n\n");
}

// ---------- Schritt 1: Material sammeln ----------
function openAufnahme(akteId = null) {
  const akte = akteId ? byId("akten", akteId) : null;
  Object.assign(auf, { akteId: akte ? akte.id : null, stuecke: [{ art: "Discord-Ticket", text: "", name: "" }], ergebnis: null, laeuft: null,
    perspektive: auf.perspektive || "verteidigung" });
  aufMaterialZeichnen();
}

function aufMaterialZeichnen() {
  const akte = auf.akteId ? byId("akten", auf.akteId) : null;
  const dlg = openDialog({
    title: akte ? `Material nachtragen – ${akte.number}` : "Akte aus Material erstellen",
    wide: true,
    body: html`
      <div class="auf">
        <p class="intro" style="margin-top:0">${akte
          ? "Füge neues Material ein (Ticket, Polizeiakte, Notizen). Nigel gleicht es mit der Akte ab und schlägt nur vor, was neu ist."
          : "Füge alles ein, was du zum Fall hast – das ganze Discord-Ticket, die Polizeiakte, eigene Notizen. Nigel baut daraus eine Akte. Du prüfst alles, bevor gespeichert wird."}</p>
        ${akte ? "" : html`<div class="field"><label class="label" for="auf-perspektive">Wen vertreten wir?</label>
          <select id="auf-perspektive">${AUFNAHME_PERSPEKTIVEN.map((p) => html`<option value="${p.value}" ${p.value === auf.perspektive ? "selected" : ""}>${p.label}</option>`)}</select></div>`}
        <div class="auf-stuecke">${auf.stuecke.map((s, i) => html`
          <div class="auf-stueck" data-i="${i}">
            <div class="auf-stueck-kopf">
              <select class="auf-art" data-i="${i}" aria-label="Art des Materials">${AUFNAHME_ARTEN.map((a) => html`<option ${a === s.art ? "selected" : ""}>${a}</option>`)}</select>
              <input class="auf-name" data-i="${i}" value="${s.name}" placeholder="Bezeichnung (optional), z. B. Ticket #prozess-0815" aria-label="Bezeichnung">
              ${auf.stuecke.length > 1 ? html`<button type="button" class="icon-btn auf-weg" data-i="${i}" title="Stück entfernen" aria-label="Stück entfernen">✕</button>` : ""}
            </div>
            <textarea class="auf-text" data-i="${i}" rows="9" spellcheck="false"
              placeholder="${s.art === "Discord-Ticket" ? "Im Ticket-Kanal alles markieren (vom ersten bis zum letzten Beitrag), kopieren und hier mit Strg+V einfügen …" : s.art === "Polizeiakte" ? "Polizeiakte hier einfügen – Tatvorwürfe, Sachverhalt, Zeugenaussagen …" : "Notizen, Mandantengespräch, weitere Texte …"}">${s.text}</textarea>
            <div class="auf-stueck-info small muted" data-info="${i}"></div>
          </div>`)}
        </div>
        <div class="auf-leiste">
          <button type="button" class="btn small" id="auf-plus">+ Weiteres Stück</button>
          <label class="btn small auf-datei">Datei laden (.txt / .html-Transkript)<input type="file" id="auf-datei" accept=".txt,.html,.htm,.md,text/plain,text/html" multiple hidden></label>
          <span class="spacer"></span>
          <span class="small muted" id="auf-groesse"></span>
        </div>
        <details class="auf-tipps small">
          <summary>So bekommst du ein langes Discord-Ticket vollständig heraus</summary>
          <ul>
            <li>Discord lädt lange Kanäle nur stückweise nach. Ganz nach oben scrollen, beim ersten Beitrag mit der Maus ansetzen, dann mit <strong>Umschalt + Klick</strong> auf den letzten Beitrag markieren und kopieren.</li>
            <li>Bei sehr langen Tickets einfach in <strong>mehreren Portionen</strong> kopieren und jede Portion als eigenes Stück einfügen – Nigel setzt sie zusammen.</li>
            <li>Erstellt der Ticket-Bot beim Schließen ein <strong>Transkript</strong> (HTML-Datei), lade diese Datei – das ist am vollständigsten.</li>
            <li>Bilder im Ticket kommen beim Kopieren nicht mit. Links (Google Docs, Imgur, Medal …) schon – sie landen als Beweismittel in der Akte.</li>
          </ul>
        </details>
      </div>`,
    footer: html`<div class="dialog-actions">
      <span class="small muted">Nigel ändert nichts, bevor du die Vorschau bestätigst.</span>
      <span class="spacer"></span>
      <button type="button" class="btn" data-close>Abbrechen</button>
      <button type="button" class="btn primary" id="auf-los">Nigel baut die Akte</button>
    </div>`,
  });

  const info = () => {
    let gesamt = 0;
    auf.stuecke.forEach((s, i) => {
      const el = dlg.querySelector(`[data-info="${i}"]`);
      if (!el) return;
      if (!s.text.trim()) { el.textContent = ""; return; }
      if (s.art === "Discord-Ticket") {
        const r = discordAufraeumen(s.text);
        gesamt += r.text.length;
        const zeitraum = r.von ? ` · ${fmtAufDatum(r.von)} bis ${fmtAufDatum(r.bis)}` : "";
        el.textContent = r.nachrichten
          ? `${r.nachrichten} Nachrichten von ${r.personen.length} Personen erkannt${zeitraum} · aufgeräumt ${r.text.length.toLocaleString("de-DE")} Zeichen (vorher ${s.text.length.toLocaleString("de-DE")})`
          : "Keine Discord-Nachrichtenköpfe erkannt – wird als normaler Text gelesen.";
      } else {
        gesamt += textAufraeumen(s.text).length;
        el.textContent = `${s.text.length.toLocaleString("de-DE")} Zeichen`;
      }
    });
    const g = dlg.querySelector("#auf-groesse");
    g.textContent = gesamt ? `${gesamt.toLocaleString("de-DE")} von ${AUFNAHME_MAX.toLocaleString("de-DE")} Zeichen` : "";
    g.classList.toggle("danger-text", gesamt > AUFNAHME_MAX);
    dlg.querySelector("#auf-los").disabled = !gesamt || gesamt > AUFNAHME_MAX;
  };
  info();

  dlg.querySelectorAll(".auf-text").forEach((ta) => ta.addEventListener("input", () => {
    const s = auf.stuecke[+ta.dataset.i];
    const vorher = s.text;
    s.text = ta.value;
    // Beim ersten Einfügen die Art automatisch erkennen
    if (!vorher.trim() && s.text.trim()) {
      const art = istDiscordText(s.text) ? "Discord-Ticket" : /polizei|lspd|lssd|sahp|tatvorw|zeugenaussage|festnahme/i.test(s.text) ? "Polizeiakte" : s.art;
      if (art !== s.art) { s.art = art; dlg.querySelector(`.auf-art[data-i="${ta.dataset.i}"]`).value = art; }
    }
    info();
  }));
  dlg.querySelectorAll(".auf-art").forEach((sel) => sel.addEventListener("change", () => { auf.stuecke[+sel.dataset.i].art = sel.value; info(); }));
  dlg.querySelectorAll(".auf-name").forEach((inp) => inp.addEventListener("input", () => { auf.stuecke[+inp.dataset.i].name = inp.value; }));
  dlg.querySelectorAll(".auf-weg").forEach((b) => b.addEventListener("click", () => { auf.stuecke.splice(+b.dataset.i, 1); aufMaterialZeichnen(); }));
  const persp = dlg.querySelector("#auf-perspektive");
  if (persp) persp.addEventListener("change", () => { auf.perspektive = persp.value; });
  dlg.querySelector("#auf-plus").addEventListener("click", () => {
    auf.stuecke.push({ art: "Polizeiakte", text: "", name: "" });
    aufMaterialZeichnen();
    const t = document.querySelectorAll("#form-dialog .auf-text");
    if (t.length) t[t.length - 1].focus();
  });
  dlg.querySelector("#auf-datei").addEventListener("change", async (e) => {
    for (const datei of e.target.files) {
      if (datei.size > 8 * 1024 * 1024) { toast(`${datei.name} ist zu groß (höchstens 8 MB).`, "error"); continue; }
      const inhalt = await datei.text();
      const istHtml = /\.html?$/i.test(datei.name) || /^\s*<(!doctype|html)/i.test(inhalt);
      const text = istHtml ? transkriptZuText(inhalt) : inhalt;
      const leer = auf.stuecke.findIndex((s) => !s.text.trim());
      const stueck = { art: istDiscordText(text) || istHtml ? "Discord-Ticket" : "Notiz / Sonstiges", text, name: datei.name };
      if (leer >= 0) auf.stuecke[leer] = stueck; else auf.stuecke.push(stueck);
    }
    aufMaterialZeichnen();
  });
  dlg.querySelector("#auf-los").addEventListener("click", () => aufStarten());
  const erstes = dlg.querySelector(".auf-text");
  if (erstes && !erstes.value) setTimeout(() => erstes.focus(), 30);
}

function fmtAufDatum(s) {
  const d = aufDatum(s);
  return d ? `${fmt.datum(d)}${s.length > 10 ? `, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : ""}` : s;
}

// „YYYY-MM-DD HH:MM“ (Ortszeit) → Date
function aufDatum(s) {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0));
  return isNaN(d) ? null : d;
}

// ---------- Schritt 2: Nigel arbeitet ----------
async function aufStarten() {
  const material = aufMaterial();
  if (!material.length) return;
  const text = aufMaterialText(material);
  const lauf = { abbruch: new AbortController(), start: Date.now(), zeichen: text.length };
  auf.laeuft = lauf;
  const dlg = openDialog({
    title: "Nigel baut die Akte …",
    body: html`<div class="auf-laeuft">
      <div class="auf-spinner" aria-hidden="true"></div>
      <p><strong>Nigel liest ${text.length.toLocaleString("de-DE")} Zeichen Material</strong> und ordnet alles der Akte zu.</p>
      <p class="muted small" id="auf-status">Das dauert je nach Länge etwa 20 Sekunden bis 2 Minuten.</p>
    </div>`,
    footer: html`<div class="dialog-actions"><span class="spacer"></span><button type="button" class="btn" id="auf-stopp">Abbrechen</button></div>`,
  });
  dlg.querySelector("#auf-stopp").addEventListener("click", () => lauf.abbruch.abort());
  dlg.addEventListener("close", () => { if (auf.laeuft === lauf) lauf.abbruch.abort(); }, { once: true });
  const uhr = setInterval(() => {
    const el = document.getElementById("auf-status");
    if (el) el.textContent = `Läuft seit ${Math.round((Date.now() - lauf.start) / 1000)} Sekunden …`;
  }, 1000);
  try {
    const erg = await aufAnfrage({
      modus: "aufnahme", stream: true,
      nachrichten: [{ rolle: "nutzer", text }],
      akte_ids: auf.akteId ? [auf.akteId] : [],
      perspektive: auf.akteId ? undefined : auf.perspektive,
      zeitzone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }, lauf);
    if (auf.laeuft !== lauf) return;
    auf.ergebnis = aufVorbereiten(erg.aufnahme || {}, material);
    auf.ergebnis.kosten = erg.kosten;
    aufVorschauZeichnen();
  } catch (e) {
    if (auf.laeuft !== lauf) return;
    const abgebrochen = e.name === "AbortError";
    toast(abgebrochen ? "Abgebrochen." : /Failed to fetch|NetworkError|Load failed/i.test(e.message) ? "Verzeihung – Nigel ist gerade nicht erreichbar." : e.message, abgebrochen ? "ok" : "error");
    aufMaterialZeichnen(); // Material bleibt erhalten
  } finally {
    clearInterval(uhr);
    if (auf.laeuft === lauf) auf.laeuft = null;
  }
}

async function aufAnfrage(body, lauf) {
  const config = window.WIWANG_CONFIG || {};
  const { data } = await db.auth.getSession();
  const token = data && data.session && data.session.access_token;
  if (!token) throw new Error("Anmeldung abgelaufen. Bitte neu anmelden.");
  const res = await fetch(`${config.supabaseUrl.replace(/\/$/, "")}/functions/v1/ki-assistent`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, apikey: config.supabaseKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: lauf.abbruch.signal,
  });
  const typ = res.headers.get("Content-Type") || "";
  if (!res.ok || !typ.includes("text/event-stream")) {
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.aufnahme) return j;
    throw new Error(j.fehler || j.message || `Fehler ${res.status}`);
  }
  const leser = res.body.getReader();
  const dec = new TextDecoder();
  let puffer = "";
  for (;;) {
    const { value, done } = await leser.read();
    if (done) break;
    puffer += dec.decode(value, { stream: true });
    let i;
    while ((i = puffer.indexOf("\n\n")) >= 0) {
      const block = puffer.slice(0, i);
      puffer = puffer.slice(i + 2);
      const zeile = block.split("\n").filter((z) => z.startsWith("data:")).map((z) => z.slice(5).trim()).join("");
      if (!zeile) continue;
      let e;
      try { e = JSON.parse(zeile); } catch { continue; }
      if (e.typ === "fertig") return e;
      if (e.typ === "fehler") throw new Error(e.text);
    }
  }
  throw new Error("Die Verbindung zu Nigel wurde unterbrochen. Bitte erneut versuchen.");
}

// ---------- Ergebnis vorbereiten: Strafkatalog zuordnen, Doppeltes erkennen ----------
function katalogTreffer(v) {
  const p = norm(v.paragraph || "").replace(/\s/g, "");
  const t = norm(v.titel || "");
  if (!state.gesetze || !state.gesetze.length) return null;
  const mitPara = p ? state.gesetze.filter((g) => norm(g.paragraph || "").replace(/\s/g, "") === p) : [];
  if (mitPara.length === 1) return mitPara[0];
  if (mitPara.length > 1) return mitPara.find((g) => norm(g.titel) === t) || mitPara.find((g) => t && (norm(g.titel).includes(t) || t.includes(norm(g.titel)))) || mitPara[0];
  return t ? state.gesetze.find((g) => norm(g.titel) === t) || null : null;
}

function aufVorbereiten(roh, material) {
  const akte = auf.akteId ? byId("akten", auf.akteId) : null;
  const liste = (x) => (Array.isArray(x) ? x : []);
  const vorhandeneNamen = new Set(akte ? kinder("beteiligte", akte.id).map((b) => norm(b.name)) : []);
  const vorhandeneLinks = new Set(akte ? kinder("beweise", akte.id).map((b) => b.link).filter(Boolean) : []);
  const vorhandeneVorwuerfe = akte ? (akte.vorwuerfe || []) : [];

  const vorwuerfe = liste(roh.vorwuerfe).map((v) => {
    const g = katalogTreffer(v);
    const doppelt = vorhandeneVorwuerfe.some((x) => (g && x.gesetz_id === g.id) || (norm(x.titel) === norm(g ? g.titel : v.titel)));
    return { ...v, gesetz: g, an: !doppelt, doppelt };
  });
  const beteiligte = liste(roh.beteiligte).map((b) => {
    const doppelt = vorhandeneNamen.has(norm(b.name));
    return { ...b, an: !doppelt, doppelt };
  });
  const beweise = liste(roh.beweise).filter((b) => !b.link || !vorhandeneLinks.has(b.link)).map((b) => ({ ...b, an: true }));
  // Links aus dem Material, die Nigel nicht aufgenommen hat, trotzdem anbieten
  const bekannt = new Set([...beweise.map((b) => b.link), ...vorhandeneLinks]);
  for (const link of material.flatMap((s) => linksIn(s.sauber))) {
    if (bekannt.has(link)) continue;
    bekannt.add(link);
    let host = link;
    try { host = new URL(link).hostname.replace(/^www\./, ""); } catch { /* bleibt der Link */ }
    beweise.push({ art: /docs\.google|\.pdf/i.test(link) ? "Dokument" : /medal|youtu|streamable|twitch|\.mp4/i.test(link) ? "Video" : "Sonstiges",
      titel: `Link aus dem Material (${host})`, link, beschreibung: "", an: true });
  }
  return {
    akte: roh.akte || {},
    sachverhalt: roh.akte && roh.akte.sachverhalt || "",
    zusammenfassung: roh.zusammenfassung || "",
    vorwuerfe, beteiligte, beweise,
    verlauf: liste(roh.verlauf).map((e) => ({ ...e, an: true })),
    termine: liste(roh.termine).map((t) => ({ ...t, an: !!aufDatum(t.beginn) && darf("termine_schreiben") })),
    aufgaben: liste(roh.aufgaben).map((t) => ({ ...t, an: darf("termine_schreiben") })),
    offene_fragen: liste(roh.offene_fragen),
    material,
  };
}

// ---------- Schritt 3: Vorschau mit Häkchen ----------
function aufHaken(liste, i, an, extra = "") {
  return html`<input type="checkbox" class="auf-an" data-liste="${liste}" data-i="${i}" ${an ? "checked" : ""} ${extra} aria-label="übernehmen">`;
}
function aufOptionen(werte, wert) {
  const alle = werte.includes(wert) || !wert ? werte : [wert, ...werte];
  return alle.map((w) => html`<option ${w === wert ? "selected" : ""}>${w}</option>`);
}

function aufVorschauZeichnen() {
  const r = auf.ergebnis;
  const akte = auf.akteId ? byId("akten", auf.akteId) : null;
  const k = r.akte;
  const termineOk = darf("termine_schreiben");
  const anzahlAn = (l) => l.filter((x) => x.an).length;
  const zaehler = (l) => `${anzahlAn(l)} von ${l.length} ausgewählt`;
  const kopf = (titel, l, extra = "") => html`<div class="form-section auf-abschnitt"><span>${titel}</span><span class="muted small">${l ? html`<span data-zaehler="${Object.keys(r).find((k2) => r[k2] === l)}">${zaehler(l)}</span>` : ""}${extra}</span></div>`;
  const mandantInKartei = k.mandant && findMandantByName(k.mandant);

  // Stammdaten: neue Akte = Formular; Nachtrag = nur Abweichungen zum Übernehmen
  const stammFelder = [
    ["title", "Titel", k.titel, akte && akte.title],
    ["mandant", "Mandant", k.mandant, akte && mandantName(akte)],
    ["opponent", "Gegenpartei", k.gegenpartei, akte && akte.opponent],
    ["az_extern", "Aktenzeichen Polizei / StA / Gericht", k.az_extern, akte && akte.az_extern],
  ];
  const stamm = akte
    ? (() => {
      const diff = stammFelder.filter(([name, , neu, alt]) => neu && norm(neu) !== norm(alt || "") && name !== "mandant");
      const haftNeu = k.in_haft === true && !akte.in_haft;
      return diff.length || haftNeu ? html`${kopf("Aktendaten – Vorschläge")}
        <div class="auf-liste">${diff.map(([name, label, neu, alt]) => html`
          <label class="auf-zeile auf-stamm">${aufHaken("stamm", name, !alt)}
            <span class="auf-feld-label">${label}</span>
            <input class="auf-wert" data-stamm="${name}" value="${neu}">
            <span class="small muted">bisher: ${alt || "–"}</span></label>`)}
          ${haftNeu ? html`<label class="auf-zeile auf-stamm">${aufHaken("stamm", "in_haft", true)}<span class="auf-feld-label">Haft</span><span>Mandant ist in Haft / U-Haft</span></label>` : ""}
        </div>` : "";
    })()
    : html`${kopf("Aktendaten")}
      <div class="form-grid auf-stammform">
        <div class="field full"><label class="label" for="auf-title">Titel / Betreff <span class="req">*</span></label><input id="auf-title" data-stamm="title" value="${k.titel || ""}" required></div>
        <div class="field half"><label class="label" for="auf-mandant">Mandant</label><input id="auf-mandant" data-stamm="mandant" value="${k.mandant || ""}" list="auf-mandanten" autocomplete="off">
          <datalist id="auf-mandanten">${state.mandanten.map((m) => html`<option value="${m.name}"></option>`)}</datalist>
          <small class="help">${k.mandant ? (mandantInKartei ? "✓ steht schon in der Mandantenkartei" : "wird neu in die Mandantenkartei aufgenommen") : "leer = Akte ohne Mandant"}</small></div>
        <div class="field half"><label class="label" for="auf-opponent">Gegenpartei</label><input id="auf-opponent" data-stamm="opponent" value="${k.gegenpartei || ""}"></div>
        <div class="field half"><label class="label" for="auf-az">Aktenzeichen Polizei / StA / Gericht</label><input id="auf-az" data-stamm="az_extern" value="${k.az_extern || ""}"></div>
        <div class="field half"><label class="label" for="auf-zustaendig">Zuständig</label><select id="auf-zustaendig" data-stamm="zustaendig_id">${teamOptions().map((o) => html`<option value="${o.value}" ${o.value === state.me.id ? "selected" : ""}>${o.label}</option>`)}</select></div>
        <div class="field third"><label class="label" for="auf-area">Rechtsgebiet</label><select id="auf-area" data-stamm="area">${aufOptionen(OPTIONEN.rechtsgebiet, k.rechtsgebiet || "Strafrecht")}</select></div>
        <div class="field third"><label class="label" for="auf-typ">Mandatsart</label><select id="auf-typ" data-stamm="typ"><option value="">—</option>${aufOptionen(OPTIONEN.mandatsart, k.mandatsart || "")}</select></div>
        <div class="field third"><label class="label" for="auf-prio">Priorität</label><select id="auf-prio" data-stamm="prioritaet">${aufOptionen(OPTIONEN.prioritaet, k.prioritaet || "Normal")}</select></div>
        <div class="field third"><label class="label" for="auf-status">Status</label><select id="auf-status" data-stamm="status">${aufOptionen(OPTIONEN.status, "In Bearbeitung")}</select></div>
        <div class="field half check-field"><label class="check"><input type="checkbox" data-stamm="in_haft" ${k.in_haft ? "checked" : ""}> Mandant ist in Haft / U-Haft</label></div>
      </div>`;

  const body = html`
    <div class="auf auf-vorschau">
      ${r.zusammenfassung ? html`<div class="auf-zusammenfassung"><img src="assets/nigel.png" alt="" width="36" height="36"><p>${r.zusammenfassung}</p></div>` : ""}
      <p class="muted small" style="margin:0 0 6px">Alles ist bearbeitbar. Nur angehakte Punkte werden gespeichert${akte ? "; was schon in der Akte steht, ist abgewählt" : ""}.</p>
      ${stamm}

      ${kopf("Sachverhalt (Fall-Briefing)")}
      <label class="auf-zeile auf-block">${aufHaken("sachverhalt", 0, !!r.sachverhalt)}
        <span class="auf-block-inhalt">${akte && akte.summary ? html`<span class="small muted">Ersetzt den bisherigen Sachverhalt (Nigel hat ihn eingearbeitet).</span>` : ""}
          <textarea id="auf-sachverhalt" rows="7">${r.sachverhalt}</textarea></span></label>

      ${r.vorwuerfe.length ? html`${kopf("Tatvorwürfe", r.vorwuerfe)}
        <div class="auf-liste">${r.vorwuerfe.map((v, i) => html`
          <label class="auf-zeile">${aufHaken("vorwuerfe", i, v.an)}
            <span class="auf-haupt"><strong>${v.gesetz ? v.gesetz.paragraph : v.paragraph || "§ ?"}</strong> ${v.gesetz ? v.gesetz.titel : v.titel}
              ${v.gesetz ? html`<span class="badge ok">im Strafkatalog</span>` : html`<span class="badge" title="Kein passender Eintrag im Strafkatalog – wird als freier Vorwurf ohne Strafmaß angelegt">frei</span>`}
              ${v.doppelt ? html`<span class="badge">schon in der Akte</span>` : ""}
              ${v.quelle ? html`<span class="small muted auf-quelle">${v.quelle}</span>` : ""}</span>
            <input type="number" min="1" max="99" class="auf-anzahl" data-i="${i}" value="${Math.max(1, Number(v.anzahl) || 1)}" aria-label="Anzahl" title="Anzahl"></label>`)}
        </div>` : ""}

      ${r.beteiligte.length ? html`${kopf("Beteiligte", r.beteiligte)}
        <div class="auf-liste">${r.beteiligte.map((b, i) => html`
          <label class="auf-zeile">${aufHaken("beteiligte", i, b.an)}
            <select data-feld="rolle" data-liste="beteiligte" data-i="${i}" aria-label="Rolle">${aufOptionen(OPTIONEN.rolle, b.rolle || "Zeuge")}</select>
            <input data-feld="name" data-liste="beteiligte" data-i="${i}" value="${b.name || ""}" aria-label="Name" class="auf-name-feld">
            <input data-feld="notiz" data-liste="beteiligte" data-i="${i}" value="${[b.kontakt, b.notiz].filter(Boolean).join(" · ")}" placeholder="Notiz" aria-label="Notiz" class="auf-grow">
            ${b.doppelt ? html`<span class="badge">schon in der Akte</span>` : ""}</label>`)}
        </div>` : ""}

      ${r.verlauf.length ? html`${kopf("Verlauf", r.verlauf, " · mit dem Datum aus dem Material")}
        <div class="auf-liste">${r.verlauf.map((e, i) => html`
          <label class="auf-zeile auf-verlauf">${aufHaken("verlauf", i, e.an)}
            <span class="auf-verlauf-kopf">
              <input type="datetime-local" data-feld="datum" data-liste="verlauf" data-i="${i}" value="${aufDatum(e.datum) ? toLocalInput(aufDatum(e.datum)) : ""}" aria-label="Datum">
              <select data-feld="art" data-liste="verlauf" data-i="${i}" aria-label="Art">${aufOptionen(OPTIONEN.eintragArt, e.art || "Notiz")}</select>
              <span class="check small"><input type="checkbox" data-feld="wichtig" data-liste="verlauf" data-i="${i}" ${e.wichtig ? "checked" : ""}> wichtig</span>
            </span>
            <textarea data-feld="text" data-liste="verlauf" data-i="${i}" rows="2">${e.text || ""}</textarea></label>`)}
        </div>` : ""}

      ${r.beweise.length ? html`${kopf("Beweise & Dokumente", r.beweise)}
        <div class="auf-liste">${r.beweise.map((b, i) => html`
          <label class="auf-zeile">${aufHaken("beweise", i, b.an)}
            <select data-feld="art" data-liste="beweise" data-i="${i}" aria-label="Art">${aufOptionen(OPTIONEN.beweisArt, b.art || "Sonstiges")}</select>
            <input data-feld="titel" data-liste="beweise" data-i="${i}" value="${b.titel || ""}" aria-label="Bezeichnung" class="auf-grow">
            ${b.link ? html`<a href="${safeUrl(b.link) || "#"}" target="_blank" rel="noopener noreferrer" class="small auf-link" title="${b.link}">Link ↗</a>` : html`<span class="small muted">ohne Link</span>`}</label>`)}
        </div>` : ""}

      ${r.termine.length ? html`${kopf("Termine & Fristen", r.termine)}
        <div class="auf-liste">${r.termine.map((t, i) => html`
          <label class="auf-zeile">${aufHaken("termine", i, t.an, termineOk ? "" : "disabled")}
            <input type="datetime-local" data-feld="beginn" data-liste="termine" data-i="${i}" value="${aufDatum(t.beginn) ? toLocalInput(aufDatum(t.beginn)) : ""}" aria-label="Beginn">
            <select data-feld="art" data-liste="termine" data-i="${i}" aria-label="Art">${aufOptionen(OPTIONEN.terminArt, t.art || "Termin")}</select>
            <input data-feld="titel" data-liste="termine" data-i="${i}" value="${t.titel || ""}" aria-label="Titel" class="auf-grow"></label>`)}
        </div>` : ""}

      ${r.aufgaben.length ? html`${kopf("Aufgaben", r.aufgaben, termineOk ? "" : " · dein Rang darf keine Aufgaben anlegen")}
        <div class="auf-liste">${r.aufgaben.map((t, i) => html`
          <label class="auf-zeile">${aufHaken("aufgaben", i, t.an, termineOk ? "" : "disabled")}
            <input data-feld="text" data-liste="aufgaben" data-i="${i}" value="${t.text || ""}" aria-label="Aufgabe" class="auf-grow">
            <input type="date" data-feld="faellig" data-liste="aufgaben" data-i="${i}" value="${t.faellig && /^\d{4}-\d{2}-\d{2}/.test(t.faellig) ? t.faellig.slice(0, 10) : ""}" aria-label="Fällig"></label>`)}
        </div>` : ""}

      ${r.offene_fragen.length ? html`${kopf("Offene Fragen & Widersprüche")}
        <label class="auf-zeile auf-block">${aufHaken("fragen", 0, true)}
          <span class="auf-block-inhalt"><span class="small muted">Als interne Notiz in den Verlauf schreiben</span>
            <ul class="auf-fragen">${r.offene_fragen.map((f) => html`<li>${f}</li>`)}</ul></span></label>` : ""}

      ${kopf("Originalmaterial")}
      <label class="auf-zeile auf-block">${aufHaken("original", 0, true)}
        <span class="auf-block-inhalt">Den aufgeräumten Originaltext (${r.material.map((s) => s.art).join(", ")}) unverändert als Beweismittel „Chatverlauf/Dokument“ ablegen – so geht nichts verloren.</span></label>
    </div>`;

  const dlg = openDialog({
    title: akte ? `Vorschau – Nachtrag für ${akte.number}` : "Vorschau – neue Akte",
    wide: true,
    body,
    footer: html`<div class="dialog-actions">
      <button type="button" class="btn" id="auf-zurueck">← Material ändern</button>
      <span class="spacer"></span>
      <button type="button" class="btn" data-close>Verwerfen</button>
      <button type="button" class="btn primary" id="auf-speichern">${akte ? "In die Akte übernehmen" : "Akte anlegen"}</button>
    </div>`,
  });
  dlg.querySelector("#auf-zurueck").addEventListener("click", () => aufMaterialZeichnen());
  dlg.querySelector("#auf-speichern").addEventListener("click", async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    try { await aufSpeichern(dlg); dlg.close(); }
    catch (err) { console.error(err); toast(errorText(err), "error"); }
    finally { b.disabled = false; }
  });
  // Häkchen merken (der Dialog wird wiederverwendet – daher am Inhalt, nicht am Dialog lauschen)
  dlg.querySelector(".auf-vorschau").addEventListener("change", (ev) => {
    const h = ev.target.closest(".auf-an");
    if (!h) return;
    const l = r[h.dataset.liste];
    if (!Array.isArray(l) || !l[+h.dataset.i]) return;
    l[+h.dataset.i].an = h.checked;
    const z = dlg.querySelector(`[data-zaehler="${h.dataset.liste}"]`);
    if (z) z.textContent = zaehler(l);
  });
}

// ---------- Speichern ----------
async function aufSpeichern(dlg) {
  const r = auf.ergebnis;
  const an = (liste, i) => { const h = dlg.querySelector(`.auf-an[data-liste="${liste}"][data-i="${i}"]`); return !!(h && h.checked && !h.disabled); };
  const feld = (liste, i, name) => dlg.querySelector(`[data-liste="${liste}"][data-i="${i}"][data-feld="${name}"]`);
  const wert = (liste, i, name) => { const el = feld(liste, i, name); return el ? (el.type === "checkbox" ? el.checked : el.value.trim()) : ""; };
  const stamm = (name) => { const el = dlg.querySelector(`[data-stamm="${name}"]`); return el ? (el.type === "checkbox" ? el.checked : el.value.trim()) : ""; };

  let akte = auf.akteId ? byId("akten", auf.akteId) : null;
  const neu = !akte;
  let zustaendigZiel = null;

  if (neu) {
    const titel = stamm("title");
    if (!titel) throw new Error("Bitte einen Titel für die Akte angeben.");
    const mandant = await mandantFuerName(stamm("mandant"));
    zustaendigZiel = stamm("zustaendig_id") || state.me.id;
    akte = await insertRow("akten", {
      title: titel, client: mandant ? mandant.name : null, mandant_id: mandant ? mandant.id : null,
      opponent: stamm("opponent") || null, area: stamm("area") || "Strafrecht", typ: stamm("typ") || null,
      status: stamm("status") || "In Bearbeitung", prioritaet: stamm("prioritaet") || "Normal",
      // Erst selbst zuständig, damit die vielen Verlaufseinträge niemanden mit Hinweisen überschütten;
      // am Ende geht die Akte an die gewählte Person (eine Benachrichtigung)
      zustaendig_id: state.me.id,
      az_extern: stamm("az_extern") || null, in_haft: !!stamm("in_haft"),
      summary: an("sachverhalt", 0) ? (dlg.querySelector("#auf-sachverhalt").value.trim() || null) : null,
    });
  } else {
    const aenderung = {};
    for (const name of ["title", "opponent", "az_extern"]) if (an("stamm", name)) aenderung[name] = stamm(name) || null;
    if (an("stamm", "in_haft")) aenderung.in_haft = true;
    if (an("sachverhalt", 0)) aenderung.summary = dlg.querySelector("#auf-sachverhalt").value.trim() || null;
    if (Object.keys(aenderung).length) akte = await updateRow("akten", akte.id, aenderung);
  }

  // Tatvorwürfe (mit Strafmaß aus dem Katalog, sonst frei)
  const vorwuerfe = [...(akte.vorwuerfe || [])];
  r.vorwuerfe.forEach((v, i) => {
    if (!an("vorwuerfe", i)) return;
    const el = dlg.querySelector(`.auf-anzahl[data-i="${i}"]`);
    const anzahl = Math.max(1, Math.min(99, Number(el && el.value) || 1));
    const basis = v.gesetz ? vorwurfAusKatalog(v.gesetz) : { paragraph: v.paragraph || null, titel: v.titel || "Vorwurf", geldstrafe: null, haft: null };
    const j = vorwuerfe.findIndex((x) => (basis.gesetz_id && x.gesetz_id === basis.gesetz_id) || (!basis.gesetz_id && norm(x.titel) === norm(basis.titel)));
    if (j >= 0) vorwuerfe[j] = { ...vorwuerfe[j], anzahl: Math.max(Number(vorwuerfe[j].anzahl) || 1, anzahl) };
    else vorwuerfe.push({ ...basis, anzahl });
  });
  if (vorwuerfe.length !== (akte.vorwuerfe || []).length || r.vorwuerfe.some((_, i) => an("vorwuerfe", i))) {
    akte = await updateRow("akten", akte.id, { vorwuerfe });
  }

  const beteiligte = r.beteiligte.map((_, i) => an("beteiligte", i) && wert("beteiligte", i, "name")
    ? { akte_id: akte.id, rolle: wert("beteiligte", i, "rolle") || "Zeuge", name: wert("beteiligte", i, "name"), notiz: wert("beteiligte", i, "notiz") || null }
    : null).filter(Boolean);

  const eintraege = r.verlauf.map((_, i) => {
    if (!an("verlauf", i) || !wert("verlauf", i, "text")) return null;
    const d = wert("verlauf", i, "datum");
    return { akte_id: akte.id, art: wert("verlauf", i, "art") || "Notiz", text: wert("verlauf", i, "text"), wichtig: !!wert("verlauf", i, "wichtig"),
      ...(d ? { created_at: fromLocalInput(d) } : {}) };
  }).filter(Boolean);
  if (r.offene_fragen.length && an("fragen", 0)) {
    eintraege.push({ akte_id: akte.id, art: "Intern", wichtig: false,
      text: "Offene Fragen & Widersprüche (aus dem Material, von Nigel zusammengestellt):\n" + r.offene_fragen.map((f) => `• ${f}`).join("\n") });
  }

  const beweise = r.beweise.map((b, i) => an("beweise", i)
    ? { akte_id: akte.id, art: wert("beweise", i, "art") || "Sonstiges", titel: wert("beweise", i, "titel") || "Beweismittel", link: b.link || null, beschreibung: b.beschreibung || null }
    : null).filter(Boolean);
  if (an("original", 0)) {
    const heute = fmt.datum(new Date());
    r.material.forEach((s) => beweise.push({
      akte_id: akte.id, art: s.art === "Discord-Ticket" ? "Chatverlauf" : "Dokument",
      titel: `Original: ${s.name || s.art} (eingelesen am ${heute})`, link: null, beschreibung: s.sauber,
    }));
  }

  const termine = darf("termine_schreiben") ? r.termine.map((_, i) => {
    const beginn = wert("termine", i, "beginn");
    return an("termine", i) && beginn && wert("termine", i, "titel")
      ? { akte_id: akte.id, titel: wert("termine", i, "titel"), art: wert("termine", i, "art") || "Termin", beginn: fromLocalInput(beginn), verantwortlich: zustaendigZiel || akte.zustaendig_id || state.me.id }
      : null;
  }).filter(Boolean) : [];
  const aufgaben = darf("termine_schreiben") ? r.aufgaben.map((_, i) => an("aufgaben", i) && wert("aufgaben", i, "text")
    ? { akte_id: akte.id, text: wert("aufgaben", i, "text"), faellig: wert("aufgaben", i, "faellig") || null, zustaendig: zustaendigZiel || akte.zustaendig_id || state.me.id }
    : null).filter(Boolean) : [];

  await insertRows("beteiligte", beteiligte);
  await insertRows("eintraege", eintraege);
  await insertRows("beweise", beweise);
  if (termine.length) await insertRows("termine", termine);
  if (aufgaben.length) await insertRows("aufgaben", aufgaben);
  if (neu && zustaendigZiel && zustaendigZiel !== state.me.id) akte = await updateRow("akten", akte.id, { zustaendig_id: zustaendigZiel });

  const teile = [
    [beteiligte.length, "Beteiligte/r", "Beteiligte"], [eintraege.length, "Verlaufseintrag", "Verlaufseinträge"],
    [beweise.length, "Beweismittel", "Beweismittel"], [termine.length, "Termin", "Termine"], [aufgaben.length, "Aufgabe", "Aufgaben"],
  ].filter(([n]) => n).map(([n, e, v]) => anzahl(n, e, v));
  auf.ergebnis = null;
  auf.stuecke = [];
  if (neu) {
    go(`akten/${akte.id}`);
    toast(`Akte ${akte.number} angelegt${teile.length ? ` – ${teile.join(", ")}` : ""}`);
    if (konflikte(akte).length) toast("Achtung: möglicher Interessenkonflikt – siehe Akte.", "error");
  } else {
    toast(teile.length ? `Übernommen: ${teile.join(", ")}` : "Akte aktualisiert");
  }
}

// ---------- Aktionen ----------
Object.assign(ACTIONS, {
  "akte-aus-material": () => openAufnahme(null),
  "material-nachtragen": (d) => openAufnahme(d.id),
});
