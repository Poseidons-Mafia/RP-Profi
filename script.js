// Wiwang Law – Aktensystem
// Alle Akten liegen in einer gemeinsamen Supabase-Datenbank.
// Jedes Kanzlei-Mitglied meldet sich an und sieht dieselben Akten – live.

const $ = (id) => document.getElementById(id);

const config = window.WIWANG_CONFIG || {};
let db = null;

let cases = [];
let selectedId = null;
let editingId = null;
let statusFilter = "alle";
let liveChannel = null;

const listEl = $("case-list");
const dialog = $("case-dialog");
const form = $("case-form");

// ---------- Bildschirme umschalten ----------
function showScreen(name) {
  $("setup-screen").hidden = name !== "setup";
  $("login-screen").hidden = name !== "login";
  $("app").hidden = name !== "app";
  $("topbar-actions").hidden = name !== "app";
}

// ---------- Hilfsfunktionen ----------
function formatDate(iso) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function badge(status) {
  const cls = (status || "").toLowerCase().replace(/\s+/g, "-");
  return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

// "max.mustermann@mail.de" → "max.mustermann"
function shortName(email) {
  return email ? email.split("@")[0] : "unbekannt";
}

function showError(action, error) {
  console.error(error);
  alert(`${action} hat nicht geklappt:\n${error.message || error}`);
}

// ---------- Daten laden ----------
async function loadCases() {
  const { data, error } = await db
    .from("akten")
    .select("*, eintraege(*)")
    .order("created_at", { ascending: false });

  if (error) return showError("Laden der Akten", error);

  cases = data.map((c) => ({
    ...c,
    eintraege: (c.eintraege || []).sort((a, b) => b.created_at.localeCompare(a.created_at)),
  }));
  if (selectedId && !cases.some((c) => c.id === selectedId)) selectedId = null;
  render();
}

// Wenn jemand anderes etwas ändert, kurz warten und neu laden
let reloadTimer = null;
function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(loadCases, 300);
}

function startLiveUpdates() {
  stopLiveUpdates();
  liveChannel = db
    .channel("wiwang-akten")
    .on("postgres_changes", { event: "*", schema: "public", table: "akten" }, scheduleReload)
    .on("postgres_changes", { event: "*", schema: "public", table: "eintraege" }, scheduleReload)
    .subscribe();
}

function stopLiveUpdates() {
  if (liveChannel) db.removeChannel(liveChannel);
  liveChannel = null;
}

// ---------- Liste anzeigen ----------
function renderList() {
  const query = $("search").value.trim().toLowerCase();

  const visible = cases
    .filter((c) => statusFilter === "alle" || c.status === statusFilter)
    .filter((c) =>
      [c.number, c.title, c.client, c.opponent, c.lawyer, c.area]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );

  listEl.innerHTML = visible
    .map(
      (c) => `
      <li data-id="${c.id}" class="${c.id === selectedId ? "active" : ""}">
        <span class="num">${escapeHtml(c.number)}</span>
        <span class="title">${escapeHtml(c.title)}</span>
        <span class="meta"><span>${escapeHtml(c.client)}</span>${badge(c.status)}</span>
      </li>`
    )
    .join("");

  $("list-empty").hidden = visible.length > 0;
}

// ---------- Detail anzeigen ----------
function renderDetail() {
  const c = cases.find((x) => x.id === selectedId);
  $("detail-empty").hidden = !!c;
  $("detail-view").hidden = !c;
  if (!c) return;

  $("d-number").textContent = c.number;
  $("d-title").textContent = c.title;
  $("d-client").textContent = c.client;
  $("d-opponent").textContent = c.opponent || "–";
  $("d-area").textContent = c.area || "–";
  $("d-lawyer").textContent = c.lawyer || "–";
  $("d-status").innerHTML = badge(c.status);
  $("d-created").textContent = formatDate(c.created_at);
  $("d-created-by").textContent = shortName(c.created_by);
  $("d-summary").textContent = c.summary || "Kein Sachverhalt eingetragen.";

  $("d-notes").innerHTML = c.eintraege.length
    ? c.eintraege
        .map(
          (n) => `
        <li>
          <time>${formatDate(n.created_at)} · <span class="author">${escapeHtml(shortName(n.author))}</span></time>
          <p>${escapeHtml(n.text)}</p>
          <button class="remove" data-id="${n.id}" title="Eintrag löschen">×</button>
        </li>`
        )
        .join("")
    : `<li class="muted">Noch keine Einträge.</li>`;
}

function render() {
  renderList();
  renderDetail();
}

// ---------- Anmelden / Abmelden ----------
$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { email, password } = Object.fromEntries(new FormData(e.target));
  const errorEl = $("login-error");
  errorEl.hidden = true;

  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    errorEl.textContent = "Anmeldung fehlgeschlagen. E-Mail oder Passwort falsch?";
    errorEl.hidden = false;
  }
});

$("btn-logout").addEventListener("click", () => db.auth.signOut());

function onSession(session) {
  if (session) {
    $("user-name").textContent = shortName(session.user.email);
    showScreen("app");
    loadCases();
    startLiveUpdates();
    checkAdmin();
  } else {
    $("btn-users").hidden = true;
    stopLiveUpdates();
    cases = [];
    selectedId = null;
    showScreen("login");
  }
}

// ---------- Formular (Akte anlegen / bearbeiten) ----------
const FIELDS = ["title", "client", "opponent", "area", "status", "lawyer", "summary"];

function openForm(c = null) {
  editingId = c ? c.id : null;
  $("form-heading").textContent = c ? `Akte ${c.number} bearbeiten` : "Neue Akte";
  form.reset();
  if (c) {
    for (const field of FIELDS) form.elements[field].value = c[field] || "";
  }
  dialog.showModal();
}

form.addEventListener("submit", async () => {
  const data = Object.fromEntries(new FormData(form));

  if (editingId) {
    const { error } = await db.from("akten").update(data).eq("id", editingId);
    if (error) return showError("Speichern", error);
  } else {
    const { data: created, error } = await db.from("akten").insert(data).select().single();
    if (error) return showError("Anlegen der Akte", error);
    selectedId = created.id;
  }
  loadCases();
});

$("btn-cancel").addEventListener("click", () => dialog.close());

// ---------- Buttons & Klicks ----------
$("btn-new").addEventListener("click", () => openForm());

$("btn-edit").addEventListener("click", () => {
  openForm(cases.find((x) => x.id === selectedId));
});

$("btn-delete").addEventListener("click", async () => {
  const c = cases.find((x) => x.id === selectedId);
  if (!confirm(`Akte ${c.number} „${c.title}“ wirklich für ALLE löschen?`)) return;
  const { error } = await db.from("akten").delete().eq("id", c.id);
  if (error) return showError("Löschen", error);
  selectedId = null;
  loadCases();
});

listEl.addEventListener("click", (e) => {
  const li = e.target.closest("li[data-id]");
  if (!li) return;
  selectedId = li.dataset.id;
  render();
});

$("search").addEventListener("input", renderList);

$("filters").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll(".chip").forEach((el) => el.classList.remove("active"));
  chip.classList.add("active");
  statusFilter = chip.dataset.status;
  renderList();
});

// ---------- Verlauf / Einträge ----------
$("note-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = $("note-text").value.trim();
  if (!text || !selectedId) return;
  const { error } = await db.from("eintraege").insert({ akte_id: selectedId, text });
  if (error) return showError("Eintragen", error);
  $("note-text").value = "";
  loadCases();
});

$("d-notes").addEventListener("click", async (e) => {
  const btn = e.target.closest(".remove");
  if (!btn || !confirm("Eintrag für alle löschen?")) return;
  const { error } = await db.from("eintraege").delete().eq("id", btn.dataset.id);
  if (error) return showError("Löschen des Eintrags", error);
  loadCases();
});

// ---------- Export (Sicherungskopie) ----------
$("btn-export").addEventListener("click", () => {
  const backup = cases.map((c) => ({
    number: c.number,
    title: c.title,
    client: c.client,
    opponent: c.opponent,
    area: c.area,
    status: c.status,
    lawyer: c.lawyer,
    summary: c.summary,
    created: c.created_at,
    created_by: c.created_by,
    notes: c.eintraege.map((n) => ({ date: n.created_at, text: n.text, author: n.author })),
  }));
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `wiwang-law-akten-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

// ---------- Import (z. B. alte Akten aus der ersten Version) ----------
$("input-import").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;

  let imported;
  try {
    imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error();
  } catch {
    return alert("Die Datei konnte nicht gelesen werden.");
  }
  if (!confirm(`${imported.length} Akten zur gemeinsamen Datenbank HINZUFÜGEN?`)) return;

  let ok = 0;
  for (const item of imported) {
    const row = {
      title: item.title || "Ohne Titel",
      client: item.client || "Unbekannt",
      opponent: item.opponent || null,
      area: item.area || null,
      status: item.status || "Offen",
      lawyer: item.lawyer || null,
      summary: item.summary || null,
      ...(item.created ? { created_at: item.created } : {}),
    };

    // Erst mit dem alten Aktenzeichen versuchen; ist es schon vergeben, ein neues nehmen
    let result = await db.from("akten").insert({ ...row, number: item.number || null }).select().single();
    if (result.error && result.error.code === "23505") {
      result = await db.from("akten").insert(row).select().single();
    }
    if (result.error) {
      showError(`Import von „${row.title}“`, result.error);
      continue;
    }

    const notes = (item.notes || []).map((n) => ({
      akte_id: result.data.id,
      text: n.text,
      ...(n.date ? { created_at: n.date } : {}),
      ...(n.author ? { author: n.author } : {}),
    }));
    if (notes.length) {
      const { error } = await db.from("eintraege").insert(notes);
      if (error) showError(`Import der Einträge von „${row.title}“`, error);
    }
    ok++;
  }
  alert(`${ok} von ${imported.length} Akten importiert.`);
  loadCases();
});

// ---------- Nutzerverwaltung (nur Admin) ----------
// Die eigentliche Prüfung, ob jemand Admin ist, macht die Datenbank.
// Hier wird nur der Knopf ein- oder ausgeblendet.
async function checkAdmin() {
  const { data, error } = await db.rpc("is_admin");
  $("btn-users").hidden = !!error || data !== true;
}

const usersDialog = $("users-dialog");
const userForm = $("user-form");

function showUserMsg(text, ok) {
  const el = $("user-msg");
  el.textContent = text;
  el.className = "user-msg " + (ok ? "ok" : "error");
  el.hidden = false;
}

// Datenbank-Fehlermeldungen etwas freundlicher machen
function dbMessage(error) {
  if (/function .* does not exist|Could not find the function/i.test(error.message)) {
    return "Die Nutzerverwaltung ist in Supabase noch nicht eingerichtet (supabase-nutzerverwaltung.sql).";
  }
  return error.message;
}

function randomPassword() {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

async function loadUsers() {
  const listEl = $("user-list");
  const { data, error } = await db.rpc("admin_list_users");
  if (error) {
    listEl.innerHTML = `<li class="error">${escapeHtml(dbMessage(error))}</li>`;
    return;
  }
  listEl.innerHTML = data
    .map(
      (u) => `
      <li>
        <div class="user-info">
          <strong>${escapeHtml(u.email)}</strong>
          ${u.is_admin ? '<span class="badge admin">Admin</span>' : ""}
          <span class="muted small">
            angelegt ${formatDate(u.created_at)} ·
            ${u.last_sign_in_at ? "zuletzt angemeldet " + formatDate(u.last_sign_in_at) : "noch nie angemeldet"}
          </span>
        </div>
        <div class="user-actions">
          <button class="btn ghost small" data-action="password" data-id="${u.id}" data-email="${escapeHtml(u.email)}">Passwort ändern</button>
          ${u.is_admin ? "" : `<button class="btn danger small" data-action="delete" data-id="${u.id}" data-email="${escapeHtml(u.email)}">Löschen</button>`}
        </div>
      </li>`
    )
    .join("");
}

$("btn-users").addEventListener("click", () => {
  userForm.reset();
  $("user-msg").hidden = true;
  $("user-list").innerHTML = `<li class="muted">Lade …</li>`;
  usersDialog.showModal();
  loadUsers();
});

$("btn-users-close").addEventListener("click", () => usersDialog.close());

$("btn-gen-pw").addEventListener("click", () => {
  userForm.elements.password.value = randomPassword();
});

userForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = userForm.elements.email.value.trim();
  const password = userForm.elements.password.value;
  const button = userForm.querySelector("[type=submit]");
  button.disabled = true;

  const { error } = await db.rpc("admin_create_user", { p_email: email, p_password: password });
  button.disabled = false;

  if (error) return showUserMsg(dbMessage(error), false);
  showUserMsg(`Nutzer angelegt: ${email} · Passwort: ${password}  →  Bitte notieren und weitergeben!`, true);
  userForm.reset();
  loadUsers();
});

$("user-list").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { id, email, action } = btn.dataset;

  if (action === "password") {
    const pw = prompt(`Neues Passwort für ${email} (mind. 6 Zeichen):`, randomPassword());
    if (pw === null) return;
    const { error } = await db.rpc("admin_set_password", { p_user_id: id, p_password: pw });
    if (error) return showUserMsg(dbMessage(error), false);
    showUserMsg(`Neues Passwort für ${email}: ${pw}  →  Bitte notieren und weitergeben!`, true);
  }

  if (action === "delete") {
    if (!confirm(`${email} wirklich löschen? Die Person kann sich danach nicht mehr anmelden. Ihre Akten und Einträge bleiben erhalten.`)) return;
    const { error } = await db.rpc("admin_delete_user", { p_user_id: id });
    if (error) return showUserMsg(dbMessage(error), false);
    showUserMsg(`${email} wurde gelöscht.`, true);
    loadUsers();
  }
});

// ---------- Start ----------
function start() {
  if (!config.supabaseUrl || !config.supabaseKey || !window.supabase) {
    showScreen("setup");
    return;
  }
  db = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);

  let currentUserId;
  db.auth.onAuthStateChange((event, session) => {
    const userId = session?.user?.id ?? null;
    if (userId === currentUserId) return; // nichts Neues (z. B. Token erneuert)
    currentUserId = userId;
    // setTimeout: Supabase empfiehlt, hier keine Abfragen direkt zu starten
    setTimeout(() => onSession(session), 0);
  });
}

start();
