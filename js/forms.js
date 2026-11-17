// =============================================================
//  Wiwang Law – Formulare & Dialoge
//  Formulare werden als Feldliste beschrieben, z. B.
//  { name: "titel", label: "Titel", type: "text", required: true, half: true }
// =============================================================

function optionList(options) {
  return (options || []).map((o) => (typeof o === "object" ? o : { value: o, label: o }));
}

function renderField(f, value) {
  if (f.type === "section") return html`<div class="form-section">${f.label}</div>`;
  if (f.type === "info") return html`<div class="field full form-info">${f.html || f.text}</div>`;
  if (f.type === "custom") return html`<div class="field full" data-field="${f.name}">${f.label ? html`<label class="label">${f.label}</label>` : ""}${f.render(value)}</div>`;

  const id = `f-${f.name}`;
  const req = f.required ? "required" : "";
  const width = f.full || f.type === "textarea" || f.type === "checks" ? "full" : f.half ? "half" : f.third ? "third" : "full";
  const label = html`<label class="label" for="${id}">${f.label}${f.required ? html` <span class="req">*</span>` : ""}</label>`;
  const help = f.help ? html`<small class="help">${f.help}</small>` : "";
  const v = value ?? "";
  let input;

  switch (f.type) {
    case "textarea":
      input = html`<textarea id="${id}" name="${f.name}" rows="${f.rows || 4}" placeholder="${f.placeholder || ""}" ${req}>${v}</textarea>`;
      break;
    case "select": {
      const opts = optionList(typeof f.options === "function" ? f.options() : f.options);
      const option = (o) => html`<option value="${o.value}" ${String(o.value) === String(v) ? "selected" : ""}>${o.label}</option>`;
      // Optionen mit "group" werden in Gruppen (optgroup) angezeigt
      const gruppen = [...new Set(opts.map((o) => o.group).filter(Boolean))];
      input = html`<select id="${id}" name="${f.name}" ${req}>
        ${!f.required || f.empty ? html`<option value="">${f.emptyLabel || "—"}</option>` : ""}
        ${gruppen.length
          ? gruppen.map((g) => html`<optgroup label="${g}">${opts.filter((o) => o.group === g).map(option)}</optgroup>`)
          : opts.map(option)}
      </select>`;
      break;
    }
    case "checkbox":
      return html`<div class="field ${width} check-field">
        <label class="check"><input type="checkbox" id="${id}" name="${f.name}" ${v ? "checked" : ""}> ${f.label}</label>${help}
      </div>`;
    case "checks": {
      const selected = Array.isArray(v) ? v : [];
      input = html`<div class="checks">${optionList(f.options).map((o) => html`
        <label class="check pill"><input type="checkbox" name="${f.name}" value="${o.value}" ${selected.includes(o.value) ? "checked" : ""}> ${o.label}</label>`)}</div>`;
      break;
    }
    case "money":
      input = html`<div class="money"><span>${state.settings.waehrung}</span><input type="text" inputmode="decimal" id="${id}" name="${f.name}" value="${v === "" ? "" : fmt.zahl(v)}" placeholder="${f.placeholder || "0"}" ${req}></div>`;
      break;
    case "number":
      input = html`<input type="text" inputmode="decimal" id="${id}" name="${f.name}" value="${v === "" ? "" : fmt.zahl(v)}" placeholder="${f.placeholder || ""}" ${req}>`;
      break;
    case "date":
      input = html`<input type="date" id="${id}" name="${f.name}" value="${v ? ymd(v) : ""}" ${req}>`;
      break;
    case "datetime":
      input = html`<input type="datetime-local" id="${id}" name="${f.name}" value="${toLocalInput(v)}" ${req}>`;
      break;
    default: {
      const listId = f.list ? `dl-${f.name}` : null;
      const items = typeof f.list === "function" ? f.list() : f.list;
      input = html`<input type="${f.type || "text"}" id="${id}" name="${f.name}" value="${v}" placeholder="${f.placeholder || ""}"
        ${listId ? html`list="${listId}"` : ""} autocomplete="off" ${req}>
        ${listId ? html`<datalist id="${listId}">${(items || []).map((o) => html`<option value="${o}"></option>`)}</datalist>` : ""}`;
    }
  }
  return html`<div class="field ${width}">${label}${input}${help}</div>`;
}

function readForm(form, fields) {
  const values = {};
  for (const f of fields) {
    if (!f.name || ["section", "info"].includes(f.type)) continue;
    const el = form.elements[f.name];
    switch (f.type) {
      case "checkbox": values[f.name] = !!(el && el.checked); break;
      case "checks": values[f.name] = [...form.querySelectorAll(`input[name="${f.name}"]:checked`)].map((i) => i.value); break;
      case "number":
      case "money": values[f.name] = parseNumber(el && el.value); break;
      case "date": values[f.name] = (el && el.value) || null; break;
      case "datetime": values[f.name] = fromLocalInput(el && el.value); break;
      case "custom": values[f.name] = f.read(form); break;
      default: {
        const s = ((el && el.value) || "").trim();
        values[f.name] = s === "" ? null : s;
      }
    }
  }
  return values;
}

// ---------- Allgemeiner Dialog ----------
function openDialog({ title, body, wide = false, id = "form-dialog", footer = "" }) {
  const dlg = $(id);
  dlg.className = wide ? "wide" : "";
  dlg.innerHTML = String(html`
    <div class="dialog-head">
      <h2>${title}</h2>
      <button type="button" class="icon-btn" data-close aria-label="Schließen">✕</button>
    </div>
    <div class="dialog-body">${body}</div>
    ${footer}`);
  dlg.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => dlg.close()));
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
  return dlg;
}

// ---------- Formular-Dialog ----------
// onSubmit(values) speichert; wirft es einen Fehler, bleibt der Dialog offen.
function openForm({ title, fields, values = {}, submitLabel = "Speichern", onSubmit, onDelete,
                    deleteLabel = "Löschen", wide = false, intro, onChange, onMount }) {
  const dlg = $("form-dialog");
  dlg.className = wide ? "wide" : "";
  dlg.innerHTML = String(html`
    <form class="form">
      <div class="dialog-head">
        <h2>${title}</h2>
        <button type="button" class="icon-btn" data-close aria-label="Schließen">✕</button>
      </div>
      ${intro ? html`<p class="intro">${intro}</p>` : ""}
      <div class="form-grid">
        ${fields.map((f) => renderField(f, values[f.name] !== undefined ? values[f.name] : f.default))}
      </div>
      <p class="form-error" hidden></p>
      <div class="dialog-actions">
        ${onDelete ? html`<button type="button" class="btn danger" data-delete>${deleteLabel}</button>` : ""}
        <span class="spacer"></span>
        <button type="button" class="btn" data-close>Abbrechen</button>
        <button type="submit" class="btn primary">${submitLabel}</button>
      </div>
    </form>`);

  const form = dlg.querySelector("form");
  const errorEl = form.querySelector(".form-error");
  fields.forEach((f) => f.mount && f.mount(form));
  if (onMount) onMount(form);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = form.querySelector('[type="submit"]');
    errorEl.hidden = true;
    button.disabled = true;
    try {
      await onSubmit(readForm(form, fields), form);
      dlg.close();
    } catch (err) {
      console.error(err);
      errorEl.textContent = errorText(err);
      errorEl.hidden = false;
    } finally {
      button.disabled = false;
    }
  });
  if (onChange) {
    form.addEventListener("change", (e) => onChange(e.target.name, form, e));
  }
  dlg.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => dlg.close()));
  if (onDelete) {
    form.querySelector("[data-delete]").addEventListener("click", async () => {
      try {
        if ((await onDelete()) !== false) dlg.close();
      } catch (err) {
        errorEl.textContent = errorText(err);
        errorEl.hidden = false;
      }
    });
  }
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
  return form;
}

function closeDialogs() {
  document.querySelectorAll("dialog[open]").forEach((d) => d.close());
}
