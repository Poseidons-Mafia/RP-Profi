// =============================================================
//  Wiwang Law – KI-Assistent
//  Chat mit Google Gemini über die Supabase Edge Function
//  "ki-assistent". Optional mit einer Akte als Kontext.
//  Recht: "ki_assistent". (Design folgt später.)
// =============================================================

ui.assistent = { akteId: "", verlauf: [], laedt: false, info: null };

const KI_VORLAGEN = [
  { label: "Akte zusammenfassen", akte: true, text: "Fasse diese Akte kurz zusammen: Sachverhalt, Vorwürfe, Stand, offene Punkte." },
  { label: "Nächste Schritte", akte: true, text: "Welche nächsten Schritte und welche Verteidigungsstrategie empfiehlst du für diese Akte? Begründe kurz." },
  { label: "Strafrahmen", akte: true, text: "Berechne den Strafrahmen (Geldstrafe und Haft) für die Tatvorwürfe dieser Akte anhand des Gesetzbuchs." },
  { label: "Schriftsatz entwerfen", akte: true, text: "Entwirf einen Schriftsatz an die Staatsanwaltschaft für diese Akte. Art des Schriftsatzes: " },
  { label: "Passende Paragraphen", akte: false, text: "Welche Paragraphen aus unserem Gesetzbuch passen auf folgenden Sachverhalt?\n\n" },
];

VIEWS.assistent = (route) => {
  const s = ui.assistent;
  if (route.id && route.id !== s.akteId && byId("akten", route.id)) wechsleKiAkte(route.id);
  const akte = s.akteId ? byId("akten", s.akteId) : null;
  const akten = [...state.akten].sort((a, b) =>
    (a.status === "Geschlossen") - (b.status === "Geschlossen") || String(b.updated_at || "").localeCompare(String(a.updated_at || "")));

  return html`
    <div class="page">
      <div class="page-head">
        <div><h1>KI-Assistent</h1>
          <p class="muted">Fragen zu Akten, Gesetzbuch und Schriftsätzen. Antworten sind Vorschläge: bitte immer prüfen.</p></div>
        <div class="actions-row">
          ${s.verlauf.length ? html`<button class="btn" data-action="ki-neu">Neuer Chat</button>` : ""}
        </div>
      </div>

      <div class="card">
        <div class="toolbar">
          <label class="small">Akte als Kontext
            <select id="ki-akte" data-change="ki-akte">
              <option value="">– keine Akte –</option>
              ${akten.map((a) => html`<option value="${a.id}" ${a.id === s.akteId ? "selected" : ""}>${a.number} · ${truncate(a.title, 50)}${a.status === "Geschlossen" ? " (geschlossen)" : ""}</option>`)}
            </select>
          </label>
          ${akte ? html`<a class="btn small" href="#/akten/${akte.id}">Zur Akte</a>` : ""}
        </div>
        <div class="actions-row" style="margin-top:10px">
          ${KI_VORLAGEN.filter((v) => !v.akte || akte).map((v, i) => html`
            <button class="btn small" data-action="ki-vorlage" data-i="${KI_VORLAGEN.indexOf(v)}" ${s.laedt ? "disabled" : ""}>${v.label}</button>`)}
        </div>
      </div>

      <div class="card" data-scroll="ki-chat" style="max-height:60vh;overflow:auto">
        ${s.verlauf.length ? s.verlauf.map((n, i) => html`
          <div style="margin:0 0 14px">
            <div class="small muted"><strong>${n.rolle === "nutzer" ? "Du" : "KI-Assistent"}</strong></div>
            <div style="white-space:pre-wrap">${n.text}</div>
            ${n.rolle === "ki" ? html`<div class="actions-row" style="margin-top:6px">
              <button class="btn small" data-action="ki-kopieren" data-i="${i}">Kopieren</button>
              ${akte ? html`<button class="btn small" data-action="ki-in-verlauf" data-i="${i}">In Verlauf der Akte speichern</button>` : ""}
            </div>` : ""}
          </div>`)
        : html`<p class="empty">${akte ? `Akte ${akte.number} ist ausgewählt. Stell eine Frage oder nutze einen der Knöpfe oben.` : "Stell eine Frage – oder wähle oben eine Akte aus."}</p>`}
        ${s.laedt ? html`<p class="muted"><span class="spinner"></span> Die KI denkt nach …</p>` : ""}
      </div>

      <form class="card" data-submit="ki-frage">
        <label>Deine Frage
          <textarea id="ki-eingabe" name="text" rows="4" data-input="draft" placeholder="z. B. Welche Paragraphen kommen bei einem bewaffneten Raubüberfall in Frage?">${ui.drafts["ki-eingabe"] || ""}</textarea>
        </label>
        <div class="actions-row" style="justify-content:space-between;margin-top:8px">
          <span class="small muted">${s.info ? `Heute ${s.info.heute} von ${s.info.limit} Anfragen · ${s.info.modell}` : ""}</span>
          <button class="btn primary" type="submit" ${s.laedt ? "disabled" : ""}>Senden</button>
        </div>
      </form>
    </div>`;
};

function wechsleKiAkte(id) {
  if (ui.assistent.akteId === id) return;
  ui.assistent.akteId = id || "";
  ui.assistent.verlauf = []; // neuer Kontext → neuer Chat
}

async function kiFragen(text) {
  const s = ui.assistent;
  text = String(text || "").trim();
  if (!text || s.laedt) return;
  s.verlauf.push({ rolle: "nutzer", text });
  s.laedt = true;
  delete ui.drafts["ki-eingabe"];
  render();
  try {
    const { data, error } = await db.functions.invoke("ki-assistent", {
      body: { nachrichten: s.verlauf, akte_id: s.akteId || null },
    });
    if (error) {
      let msg = error.message;
      try { const j = await error.context.json(); if (j && j.fehler) msg = j.fehler; } catch {}
      throw new Error(msg);
    }
    s.verlauf.push({ rolle: "ki", text: data.antwort });
    s.info = { heute: data.heute, limit: data.limit, modell: data.modell };
  } catch (e) {
    console.error(e);
    s.verlauf.pop(); // Frage zurück ins Eingabefeld, damit nichts verloren geht
    ui.drafts["ki-eingabe"] = text;
    toast(/Failed to send|fetch/i.test(e.message) ? "Der KI-Assistent ist nicht erreichbar." : e.message, "error");
  } finally {
    s.laedt = false;
    render();
    const chat = document.querySelector('[data-scroll="ki-chat"]');
    if (chat) chat.scrollTop = chat.scrollHeight;
  }
}

CHANGES["ki-akte"] = (el) => {
  wechsleKiAkte(el.value);
  go(el.value ? `assistent/${el.value}` : "assistent");
};

SUBMITS["ki-frage"] = (form) => kiFragen(form.elements.text.value);

Object.assign(ACTIONS, {
  "ki-neu": () => { ui.assistent.verlauf = []; ui.assistent.laedt = false; render(); },
  "ki-vorlage": (d) => {
    const v = KI_VORLAGEN[Number(d.i)];
    if (!v) return;
    // Vorlagen, die eine Ergänzung brauchen, nur ins Eingabefeld schreiben
    if (/[:\n]\s*$/.test(v.text)) {
      ui.drafts["ki-eingabe"] = v.text;
      render();
      const el = $("ki-eingabe");
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    } else kiFragen(v.text);
  },
  "ki-kopieren": async (d) => {
    const n = ui.assistent.verlauf[Number(d.i)];
    if (n && await copyText(n.text)) toast("Kopiert");
  },
  "ki-in-verlauf": async (d) => {
    const n = ui.assistent.verlauf[Number(d.i)];
    if (!n || !ui.assistent.akteId) return;
    await attempt(() => insertRow("eintraege", { akte_id: ui.assistent.akteId, art: "Intern", text: `KI-Assistent:\n${n.text}` }),
      "Im Verlauf der Akte gespeichert");
  },
});
