// Wiwang Law – Automatische Aktualisierung
//
// GitHub Pages lässt Browser die Seite bis zu 10 Minuten zwischenspeichern.
// Damit niemand mit einer alten Version arbeitet, fragt die Seite beim Öffnen
// (und wenn man zum Tab zurückkehrt) die aktuelle Versionsnummer ab – am
// Zwischenspeicher vorbei. Gibt es eine neuere, lädt sie sich selbst neu.
//
// Bei jeder Änderung an der Website die Versionsnummer an 3 Stellen erhöhen:
//   version.json, <meta name="app-version"> und die ?v=… in index.html

(function () {
  const meta = document.querySelector('meta[name="app-version"]');
  const current = meta ? meta.content : null;
  if (!current || location.protocol === "file:") return;

  async function check() {
    try {
      const res = await fetch("version.json?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return;
      const latest = String((await res.json()).version);
      if (latest === current) return;

      // Schutz vor Endlosschleife: pro Version nur einmal neu laden
      const params = new URLSearchParams(location.search);
      if (params.get("v") === latest) return;
      params.set("v", latest);
      location.replace(location.pathname + "?" + params.toString() + location.hash);
    } catch {
      // offline o. Ä. – einfach mit der aktuellen Version weiterarbeiten
    }
  }

  check();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
})();
