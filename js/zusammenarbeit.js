// =============================================================
//  Wiwang Law – Zusammenarbeit
//  - Wer ist online? (Supabase Presence, ohne Datenbank)
//  - Benachrichtigungen (Glocke oben rechts, Taste B)
//  - @-Erwähnungen im Verlauf (Vorschlagsliste beim Tippen)
//  Die Benachrichtigungen schreibt nur die Datenbank selbst
//  (supabase-update-7.sql), nie der Browser.
// =============================================================

state.online = new Map(); // user_id → { akten: Set<akte_id>, weg: bool }
let praesenzKanal = null;

// ---------- Avatare (Initialen in Kanzleifarben) ----------
const AVATAR_FARBEN = [["#a30000", "#fff"], ["#cc9e00", "#141414"], ["#141414", "#cc9e00"], ["#1f4e8a", "#fff"],
                       ["#2f6b1f", "#fff"], ["#7d0000", "#f6ebc4"], ["#7a5d00", "#fff"]];

function initialen(name) {
  const teile = String(name || "?").trim().split(/\s+/).filter(Boolean);
  if (!teile.length) return "?";
  return (teile[0][0] + (teile.length > 1 ? teile[teile.length - 1][0] : "")).toUpperCase();
}

function onlineStatus(userId) {
  const o = state.online.get(userId);
  return o ? (o.weg ? "weg" : "online") : null;
}

function avatar(userId, { gross = false, punkt = true } = {}) {
  const name = personName(userId, "System");
  let h = 0;
  for (const c of String(userId || "x")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [bg, fg] = userId ? AVATAR_FARBEN[h % AVATAR_FARBEN.length] : ["#7b7262", "#fff"];
  const on = userId ? onlineStatus(userId) : null;
  const titel = name + (on === "online" ? " – online" : on === "weg" ? " – online, im Hintergrund" : "");
  return html`<span class="avatar ${gross ? "gross" : ""}" style="background:${bg};color:${fg}" title="${titel}">${userId ? initialen(name) : "★"}${punkt && on ? html`<span class="avatar-punkt ${on}"></span>` : ""}</span>`;
}

// Wer hat diese Akte gerade (außer mir) geöffnet?
function betrachter(akteId) {
  return [...state.online.entries()]
    .filter(([id, o]) => state.me && id !== state.me.id && o.akten.has(akteId) && profileOf(id))
    .map(([id]) => id);
}

function betrachterHinweis(akteId) {
  const ids = betrachter(akteId);
  if (!ids.length) return "";
  return html`<div class="hier-auch" title="Gleichzeitig bearbeiten kann Änderungen überschreiben – kurz absprechen.">
    <span class="avatars">${ids.map((id) => avatar(id, { punkt: false }))}</span>
    <span>Gerade auch geöffnet von <strong>${ids.map((id) => personName(id)).join(", ")}</strong></span>
  </div>`;
}

// ---------- Anwesenheit ----------
function startZusammenarbeit() {
  stopZusammenarbeit();
  praesenzKanal = db.channel("wiwang-praesenz", { config: { presence: { key: state.me.id } } });
  praesenzKanal.on("presence", { event: "sync" }, () => {
    if (!praesenzKanal) return;
    const neu = new Map();
    for (const [key, metas] of Object.entries(praesenzKanal.presenceState())) {
      neu.set(key, {
        akten: new Set(metas.map((m) => m.akte).filter(Boolean)),
        weg: metas.every((m) => m.weg), // mehrere Tabs: online, sobald einer sichtbar ist
      });
    }
    const sig = [...neu.entries()].map(([k, o]) => `${k}:${o.weg ? 1 : 0}:${[...o.akten].sort().join(",")}`).sort().join("|");
    if (sig === state.onlineSig) return;
    state.online = neu;
    state.onlineSig = sig;
    scheduleRender();
  });
  praesenzKanal.subscribe((status) => { if (status === "SUBSCRIBED") praesenzMelden(); });

  // Gelesene Benachrichtigungen nach 30 Tagen aufräumen
  const grenze = new Date(Date.now() - 30 * 86400000).toISOString();
  db.from("benachrichtigungen").delete().eq("gelesen", true).lt("zeit", grenze).then(() => {}, () => {});
}

function stopZusammenarbeit() {
  if (praesenzKanal && db) db.removeChannel(praesenzKanal);
  praesenzKanal = null;
  state.online = new Map();
  state.onlineSig = "";
  glockeSchliessen();
}

function praesenzMelden() {
  if (!praesenzKanal || !state.me) return;
  const r = parseRoute();
  praesenzKanal.track({
    akte: r.page === "akten" && r.id ? r.id : null,
    weg: document.visibilityState === "hidden",
  }).catch(() => {});
}

window.addEventListener("hashchange", praesenzMelden);
document.addEventListener("visibilitychange", praesenzMelden);

function onlineZeichnen() {
  const el = $("online");
  if (!el || !state.me) return;
  const andere = [...state.online.keys()].filter((id) => id !== state.me.id && profileOf(id))
    .sort((a, b) => (onlineStatus(a) === "weg") - (onlineStatus(b) === "weg") || personName(a).localeCompare(personName(b), "de"));
  el.hidden = !andere.length;
  el.title = andere.length ? `Gerade online: ${andere.map((id) => personName(id)).join(", ")}` : "";
  el.setAttribute("aria-label", el.title);
  el.innerHTML = String(html`${andere.slice(0, 4).map((id) => avatar(id))}${andere.length > 4 ? html`<span class="avatar mehr">+${andere.length - 4}</span>` : ""}`);
}

// ---------- Benachrichtigungen ----------
const glockePanel = document.createElement("aside");
glockePanel.className = "glocke-panel";
glockePanel.hidden = true;
glockePanel.setAttribute("aria-label", "Benachrichtigungen");
document.body.append(glockePanel);

function meineBenachrichtigungen() {
  if (!state.me) return [];
  return state.benachrichtigungen.filter((b) => b.user_id === state.me.id)
    .sort((a, b) => new Date(b.zeit) - new Date(a.zeit));
}

function ungelesen() {
  return meineBenachrichtigungen().filter((b) => !b.gelesen);
}

function glockeZeichnen() {
  const list = meineBenachrichtigungen();
  const neu = list.filter((b) => !b.gelesen).length;
  const desktop = "Notification" in window && Notification.permission === "default";
  glockePanel.innerHTML = String(html`
    <div class="gp-head">
      <strong>Benachrichtigungen</strong>
      <span class="spacer"></span>
      ${neu ? html`<button type="button" class="link-btn" data-action="glocke-alle-gelesen">Alle gelesen</button>` : ""}
      ${list.length > neu ? html`<button type="button" class="link-btn" data-action="glocke-aufraeumen">Gelesene löschen</button>` : ""}
    </div>
    ${desktop ? html`<div class="gp-desktop">
      <span>Auch Hinweise bekommen, wenn der Tab im Hintergrund ist?</span>
      <button type="button" class="btn small" data-action="glocke-desktop">Aktivieren</button>
    </div>` : ""}
    <div class="gp-list">
      ${list.length ? list.map((b) => html`
        <a class="gp-item ${b.gelesen ? "" : "neu"}" href="${b.link || "#/"}" data-action="benachrichtigung-oeffnen" data-id="${b.id}">
          ${avatar(b.von)}
          <span class="gp-text"><strong>${personName(b.von, "System")}</strong> ${b.text}
            <span class="gp-zeit">${fmt.relativ(b.zeit)}</span></span>
          ${b.gelesen ? "" : html`<span class="gp-punkt" title="ungelesen"></span>`}
        </a>`)
      : html`<p class="empty center" style="padding:24px 12px">Noch keine Benachrichtigungen.<br>
          <span class="small">Hier landet, wenn dir jemand eine Akte, Aufgabe oder einen Termin gibt oder dich mit <strong>@Name</strong> erwähnt.</span></p>`}
    </div>`);
}

function glockeOeffnen() {
  const btn = $("btn-glocke");
  const r = btn.getBoundingClientRect();
  glockePanel.style.top = `${Math.round(r.bottom + 8)}px`;
  glockeZeichnen();
  glockePanel.hidden = false;
  btn.setAttribute("aria-expanded", "true");
}

function glockeSchliessen() {
  if (glockePanel.hidden) return;
  glockePanel.hidden = true;
  const btn = $("btn-glocke");
  if (btn) btn.setAttribute("aria-expanded", "false");
}

async function benachrichtigungOeffnen(id) {
  const b = state.benachrichtigungen.find((x) => x.id === id);
  if (!b) return;
  glockeSchliessen();
  if (!b.gelesen) attempt(() => updateRow("benachrichtigungen", b.id, { gelesen: true }));
  const ziel = b.link || "#/";
  if (location.hash === ziel) render();
  else location.hash = ziel;
}

document.addEventListener("click", (e) => {
  if (glockePanel.hidden) return;
  if (glockePanel.contains(e.target) || e.target.closest("#btn-glocke")) return;
  glockeSchliessen();
});
window.addEventListener("hashchange", glockeSchliessen);
window.addEventListener("resize", glockeSchliessen);

document.addEventListener("keydown", (e) => {
  if (!state.loaded || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "Escape" && !glockePanel.hidden) {
    glockeSchliessen();
  } else if (e.key === "b" && !e.target.closest("input, textarea, select, [contenteditable]") && !document.querySelector("dialog[open]")) {
    e.preventDefault();
    if (glockePanel.hidden) glockeOeffnen(); else glockeSchliessen();
  }
});

// Neue Benachrichtigung live: Meldung, Glocke wackelt, ggf. Desktop-Hinweis
LIVE_HOOKS.benachrichtigungen = (p) => {
  if (p.eventType !== "INSERT" || !state.me || !p.new || p.new.user_id !== state.me.id) return;
  const text = `${personName(p.new.von, "System")} ${p.new.text}`;
  toast(truncate(text, 160));
  const btn = $("btn-glocke");
  if (btn) {
    btn.classList.remove("klingelt");
    void btn.offsetWidth; // Animation neu starten
    btn.classList.add("klingelt");
  }
  if (document.visibilityState === "hidden" && "Notification" in window && Notification.permission === "granted") {
    try {
      const n = new Notification(state.settings.kanzlei || "Wiwang Law", { body: text, icon: "assets/icon.png", tag: p.new.id });
      n.onclick = () => { window.focus(); benachrichtigungOeffnen(p.new.id); n.close(); };
    } catch {}
  }
};

Object.assign(ACTIONS, {
  glocke: () => (glockePanel.hidden ? glockeOeffnen() : glockeSchliessen()),
  "benachrichtigung-oeffnen": (d) => benachrichtigungOeffnen(d.id),
  "glocke-alle-gelesen": async () => {
    const ids = ungelesen().map((b) => b.id);
    if (!ids.length) return;
    await attempt(async () => {
      const { error } = await db.from("benachrichtigungen").update({ gelesen: true }).in("id", ids);
      if (error) throw error;
      state.benachrichtigungen.forEach((b) => { if (ids.includes(b.id)) b.gelesen = true; });
      scheduleRender();
    });
  },
  "glocke-aufraeumen": async () => {
    const ids = meineBenachrichtigungen().filter((b) => b.gelesen).map((b) => b.id);
    if (!ids.length) return;
    await attempt(async () => {
      const { error } = await db.from("benachrichtigungen").delete().in("id", ids);
      if (error) throw error;
      state.benachrichtigungen = state.benachrichtigungen.filter((b) => !ids.includes(b.id));
      scheduleRender();
    });
  },
  "glocke-desktop": async () => {
    try {
      const erlaubnis = await Notification.requestPermission();
      toast(erlaubnis === "granted" ? "Desktop-Hinweise sind an." : "Desktop-Hinweise bleiben aus.");
    } catch {}
    glockeZeichnen();
  },
});

// ---------- @-Erwähnungen ----------
function erwaehnbare() {
  return team().filter((p) => p.status !== "Ausgeschieden")
    .map((p) => ({ id: p.user_id, name: personName(p.user_id, "") }))
    .filter((p) => p.name);
}

const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const WORTZEICHEN = /[\p{L}\p{N}_]/u;

// Welche Mitglieder werden im Text mit @Name erwähnt? (längere Namen zuerst)
function erwaehnteIn(text) {
  let t = String(text || "").toLowerCase();
  const ids = new Set();
  for (const p of erwaehnbare().sort((a, b) => b.name.length - a.name.length)) {
    const muster = "@" + p.name.toLowerCase();
    let i = t.indexOf(muster);
    while (i >= 0) {
      const danach = t[i + muster.length];
      if (!danach || !WORTZEICHEN.test(danach)) {
        ids.add(p.id);
        t = t.slice(0, i) + " ".repeat(muster.length) + t.slice(i + muster.length); // nicht doppelt zählen
      }
      i = t.indexOf(muster, i + 1);
    }
  }
  return [...ids];
}

// Text sicher ausgeben, @Namen hervorheben (mich selbst besonders)
function mitErwaehnungen(text) {
  const s = esc(text);
  const namen = new Map(erwaehnbare().map((p) => [esc("@" + p.name).toLowerCase(), p.id]));
  if (!namen.size || !s.includes("@")) return new SafeHtml(s);
  const muster = [...namen.keys()].sort((a, b) => b.length - a.length).map(reEsc).join("|");
  const re = new RegExp(`(${muster})(?![\\p{L}\\p{N}_])`, "giu");
  return new SafeHtml(s.replace(re, (m) => {
    const ich = state.me && namen.get(m.toLowerCase()) === state.me.id;
    return `<span class="mention${ich ? " ich" : ""}">${m}</span>`;
  }));
}

// Vorschlagsliste beim Tippen von "@" in Feldern mit data-mention
const erwBox = document.createElement("div");
erwBox.className = "mention-box";
erwBox.hidden = true;
erwBox.setAttribute("role", "listbox");
const erw = { el: null, start: 0, items: [], i: 0 };

function erwSuchen(el) {
  if (!el || !el.isConnected || el.selectionStart !== el.selectionEnd) return erwSchliessen();
  const vor = el.value.slice(0, el.selectionStart);
  const m = /(^|[\s(„"'])@([^\s@]{0,30})$/u.exec(vor);
  if (!m) return erwSchliessen();
  const q = norm(m[2]);
  const items = erwaehnbare()
    .filter((p) => !q || norm(p.name).startsWith(q) || norm(p.name).split(" ").some((w) => w.startsWith(q)))
    .sort((a, b) => (state.me && a.id === state.me.id) - (state.me && b.id === state.me.id) || a.name.localeCompare(b.name, "de"))
    .slice(0, 6);
  if (!items.length) return erwSchliessen();
  if (erw.el !== el || erw.start !== vor.length - m[2].length - 1) erw.i = 0;
  Object.assign(erw, { el, start: vor.length - m[2].length - 1, items, i: Math.min(erw.i, items.length - 1) });
  erwBox.innerHTML = String(html`
    <div class="mention-hint">Erwähnen – wird benachrichtigt</div>
    ${items.map((p, i) => html`<button type="button" role="option" class="${i === erw.i ? "aktiv" : ""}" data-i="${i}">${avatar(p.id)}<span>${p.name}</span></button>`)}`);
  const ziel = el.closest("dialog") || document.body;
  if (erwBox.parentNode !== ziel) ziel.append(erwBox);
  const r = el.getBoundingClientRect();
  erwBox.style.left = `${Math.round(Math.max(8, Math.min(r.left, window.innerWidth - 268)))}px`;
  const unten = r.bottom + 4;
  const hoehe = 40 + items.length * 38;
  erwBox.style.top = `${Math.round(unten + hoehe > window.innerHeight ? Math.max(8, r.top - hoehe - 4) : unten)}px`;
  erwBox.hidden = false;
}

function erwSchliessen() {
  erwBox.hidden = true;
  erw.el = null;
}

function erwEinfuegen(i) {
  const p = erw.items[i];
  const el = erw.el;
  if (!p || !el || !el.isConnected) return erwSchliessen();
  const bis = el.selectionStart;
  const einfuegen = "@" + p.name + " ";
  el.value = el.value.slice(0, erw.start) + einfuegen + el.value.slice(bis);
  const pos = erw.start + einfuegen.length;
  erwSchliessen();
  el.focus();
  el.setSelectionRange(pos, pos);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

erwBox.addEventListener("mousedown", (e) => {
  const b = e.target.closest("button[data-i]");
  if (!b) return;
  e.preventDefault(); // Fokus bleibt im Textfeld
  erwEinfuegen(Number(b.dataset.i));
});

document.addEventListener("input", (e) => {
  if (e.target.matches && e.target.matches("textarea[data-mention]")) erwSuchen(e.target);
});
document.addEventListener("focusout", (e) => {
  if (e.target === erw.el) setTimeout(() => { if (document.activeElement !== erw.el) erwSchliessen(); }, 120);
});
document.addEventListener("keydown", (e) => {
  if (erwBox.hidden || e.target !== erw.el) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    erw.i = (erw.i + (e.key === "ArrowDown" ? 1 : -1) + erw.items.length) % erw.items.length;
    erwSuchen(erw.el);
  } else if (e.key === "Enter" || e.key === "Tab") {
    e.preventDefault();
    erwEinfuegen(erw.i);
  } else if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    erwSchliessen();
  }
}, true);

// ---------- Nach jedem Neuzeichnen ----------
RENDER_HOOKS.push(() => {
  if (!state.me) return;
  const n = ungelesen().length;
  const zahl = $("glocke-zahl");
  zahl.hidden = !n;
  zahl.textContent = n > 99 ? "99+" : String(n);
  $("btn-glocke").classList.toggle("hat-neue", n > 0);
  $("btn-glocke").title = n ? `${n} neue Benachrichtigung${n === 1 ? "" : "en"} (Taste B)` : "Benachrichtigungen (Taste B)";
  if (n) document.title = `(${n}) ${document.title}`;
  onlineZeichnen();
  if (!glockePanel.hidden) glockeZeichnen();
  // Das Textfeld wurde ggf. neu gezeichnet – Vorschläge am neuen Feld weiterführen
  if (!erwBox.hidden) {
    const a = document.activeElement;
    if (a && a.matches("textarea[data-mention]")) erwSuchen(a); else erwSchliessen();
  }
});
