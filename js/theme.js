// =============================================================
//  Wiwang Law – Hell/Dunkel („Kanzlei Tag“ / „Kanzlei Nacht“)
//  Das Attribut data-theme auf <html> setzt schon ein kleines Skript
//  im <head> (kein Aufblitzen). Hier: Umschalter, Merken im Browser,
//  Folgen der Systemeinstellung, solange nichts gewählt wurde.
// =============================================================

const THEME_KEY = "wiwang-theme";
const THEME_FARBE = { light: "#f7f5f0", dark: "#121110" };
const THEME_ICON = {
  // Sonne (zum Hellmodus wechseln) bzw. Mond (zum Dunkelmodus wechseln)
  light: "M12 4V2.5M12 21.5V20M4 12H2.5M21.5 12H20M6.3 6.3 5.2 5.2M18.8 18.8l-1.1-1.1M6.3 17.7l-1.1 1.1M18.8 5.2l-1.1 1.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
  dark: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
};

function themeGewaehlt() {
  try { const t = localStorage.getItem(THEME_KEY); return t === "light" || t === "dark" ? t : null; } catch { return null; }
}
function themeSystem() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function themeAktuell() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function themeSetzen(t, { merken = false } = {}) {
  document.documentElement.setAttribute("data-theme", t);
  if (merken) { try { localStorage.setItem(THEME_KEY, t); } catch {} }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_FARBE[t]);
  themeKnoepfe();
}

// Alle Umschalter (Kopfzeile, Mandantenportal, „Mehr“-Menü) zeigen das Ziel an
function themeKnoepfe() {
  const ziel = themeAktuell() === "dark" ? "light" : "dark";
  const text = ziel === "dark" ? "Dunkles Design" : "Helles Design";
  document.querySelectorAll("[data-action='theme-umschalten']").forEach((el) => {
    el.setAttribute("aria-label", `${text} einschalten`);
    el.title = `${text} einschalten`;
    const pfad = el.querySelector("svg path");
    if (pfad) pfad.setAttribute("d", THEME_ICON[ziel === "dark" ? "dark" : "light"]);
    const label = el.querySelector(".theme-label");
    if (label) label.textContent = text;
    el.setAttribute("aria-pressed", themeAktuell() === "dark" ? "true" : "false");
  });
}

function themeIcon() {
  const ziel = themeAktuell() === "dark" ? "light" : "dark";
  return new SafeHtml(`<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${THEME_ICON[ziel]}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
}

ACTIONS["theme-umschalten"] = () => {
  // Kurz ohne Übergänge umschalten, damit nicht alles einzeln „nachblendet“
  document.documentElement.classList.add("theme-wechsel");
  themeSetzen(themeAktuell() === "dark" ? "light" : "dark", { merken: true });
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove("theme-wechsel")));
};

// Systemeinstellung ändert sich (z. B. iPhone abends automatisch dunkel) – nur folgen, wenn nichts gewählt wurde
if (window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!themeGewaehlt()) themeSetzen(themeSystem());
  });
}

themeSetzen(themeAktuell());
RENDER_HOOKS.push(themeKnoepfe);
