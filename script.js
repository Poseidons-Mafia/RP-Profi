// Wiwang Law – Aktensystem
// Alle Akten werden im Browser gespeichert (localStorage).

const STORAGE_KEY = "wiwang-law-akten";

let cases = loadCases();
let selectedId = null;
let editingId = null;
let statusFilter = "alle";

// ---------- Elemente ----------
const $ = (id) => document.getElementById(id);
const listEl = $("case-list");
const dialog = $("case-dialog");
const form = $("case-form");

// ---------- Speichern & Laden ----------
function loadCases() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCases() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  } catch {
    alert("Speichern im Browser nicht möglich. Bitte regelmäßig exportieren.");
  }
}

// ---------- Hilfsfunktionen ----------
function nextCaseNumber() {
  const year = new Date().getFullYear();
  const prefix = `WL-${year}-`;
  const highest = cases
    .filter((c) => c.number.startsWith(prefix))
    .map((c) => parseInt(c.number.slice(prefix.length), 10))
    .reduce((max, n) => Math.max(max, n), 0);
  return prefix + String(highest + 1).padStart(3, "0");
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function badge(status) {
  const cls = status.toLowerCase().replace(/\s+/g, "-");
  return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
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
    )
    .sort((a, b) => b.created.localeCompare(a.created));

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
  $("d-area").textContent = c.area;
  $("d-lawyer").textContent = c.lawyer || "–";
  $("d-status").innerHTML = badge(c.status);
  $("d-created").textContent = formatDate(c.created);
  $("d-summary").textContent = c.summary || "Kein Sachverhalt eingetragen.";

  $("d-notes").innerHTML = c.notes.length
    ? c.notes
        .map(
          (n, i) => `
        <li>
          <time>${formatDate(n.date)}</time>
          <p>${escapeHtml(n.text)}</p>
          <button class="remove" data-index="${i}" title="Eintrag löschen">×</button>
        </li>`
        )
        .join("")
    : `<li class="muted">Noch keine Einträge.</li>`;
}

function render() {
  renderList();
  renderDetail();
}

// ---------- Formular ----------
function openForm(c = null) {
  editingId = c ? c.id : null;
  $("form-heading").textContent = c ? `Akte ${c.number} bearbeiten` : "Neue Akte";
  form.reset();
  if (c) {
    for (const field of ["title", "client", "opponent", "area", "status", "lawyer", "summary"]) {
      form.elements[field].value = c[field] || "";
    }
  }
  dialog.showModal();
}

form.addEventListener("submit", () => {
  const data = Object.fromEntries(new FormData(form));

  if (editingId) {
    const c = cases.find((x) => x.id === editingId);
    Object.assign(c, data);
  } else {
    const c = {
      id: Date.now().toString(36),
      number: nextCaseNumber(),
      created: new Date().toISOString(),
      notes: [],
      ...data,
    };
    cases.push(c);
    selectedId = c.id;
  }
  saveCases();
  render();
});

$("btn-cancel").addEventListener("click", () => dialog.close());

// ---------- Buttons & Klicks ----------
$("btn-new").addEventListener("click", () => openForm());

$("btn-edit").addEventListener("click", () => {
  openForm(cases.find((x) => x.id === selectedId));
});

$("btn-delete").addEventListener("click", () => {
  const c = cases.find((x) => x.id === selectedId);
  if (!confirm(`Akte ${c.number} „${c.title}“ wirklich löschen?`)) return;
  cases = cases.filter((x) => x.id !== selectedId);
  selectedId = null;
  saveCases();
  render();
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

// ---------- Verlauf / Notizen ----------
$("note-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("note-text").value.trim();
  if (!text) return;
  const c = cases.find((x) => x.id === selectedId);
  c.notes.unshift({ date: new Date().toISOString(), text });
  $("note-text").value = "";
  saveCases();
  renderDetail();
});

$("d-notes").addEventListener("click", (e) => {
  const btn = e.target.closest(".remove");
  if (!btn || !confirm("Eintrag löschen?")) return;
  const c = cases.find((x) => x.id === selectedId);
  c.notes.splice(Number(btn.dataset.index), 1);
  saveCases();
  renderDetail();
});

// ---------- Export & Import ----------
$("btn-export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(cases, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `wiwang-law-akten-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$("input-import").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error();
    if (!confirm(`${imported.length} Akten laden? Die aktuellen Akten werden ersetzt.`)) return;
    cases = imported;
    selectedId = null;
    saveCases();
    render();
  } catch {
    alert("Die Datei konnte nicht gelesen werden.");
  } finally {
    e.target.value = "";
  }
});

// ---------- Start ----------
render();
