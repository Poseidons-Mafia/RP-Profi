#!/usr/bin/env python3
# =============================================================
#  Wiwang Law – Gesetzestexte (gesetze/*.txt) in SQL umwandeln
#
#  Liest die Gesetzbücher aus dem Ordner gesetze/ und schreibt
#  supabase-gesetze.sql. Die Datei legt jedes Gesetzbuch an (oder
#  aktualisiert es) und ersetzt seine Paragraphen vollständig.
#
#  Aufruf:  python3 tools/gesetze-sql.py
#  Danach:  ./tools/supabase-sql.sh supabase-gesetze.sql
# =============================================================
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Datei, Kürzel, Titel, Beschreibung, Farbe, Sortierung
BUECHER = [
    ("BGB.txt", "BGB", "Bürgerliches Gesetzbuch",
     "Rechtsfähigkeit, Verträge, Eigentum, Selbsthilfe und Schadensersatz, Zivilklage, Ausweispflicht und Familienrecht.",
     "blau", 20),
    ("LPolG.txt", "LPolG", "Landespolizeigesetz",
     "Aufgaben und Befugnisse der Polizeibehörden: Gefahrenabwehr, Identitätsfeststellung, Gewahrsam, Durchsuchung, Sicherstellung und Zwang.",
     "schwarz", 30),
    ("BtMG.txt", "BtMG", "Betäubungsmittelgesetz",
     "Erlaubnispflicht für Betäubungsmittel, Eigenkonsum von Cannabis, medizinische und behördliche Ausnahmen.",
     "gruen", 40),
    ("GewO.txt", "GewO", "Gewerbeordnung",
     "Gewerbelizenz und -eintragung, besondere Gewerbe, Veranstaltungslizenzen, Arbeitnehmerschutz, Rohstofflizenz und Bußgelder.",
     "gold", 50),
    ("LuftVO.txt", "LuftVO", "Luftverkehrsordnung",
     "Fluglizenz, Flugverbotszonen, Mindestflughöhe, Landung, Flugfunk und Fallschirmpflicht.",
     "rot", 60),
]

RE_KAPITEL = re.compile(r"^Kapitel\s+\d+\s*[–-]\s*\S")
RE_PARA = re.compile(r"^§\s*(\d+[a-z]?)\s*[–-]\s*(.+)$")
RE_ANLAGE = re.compile(r"^Anlage\s+(\d+)\s*[–-]\s*(.+)$")
RE_ABSATZ = re.compile(r"^\(\d+[a-z]?\)")
RE_LISTE = re.compile(r"^(\d+\.|[a-z]\))\s")
UEBERSPRINGEN = {"Inhaltsverzeichnis", "Inhaltsübersicht"}


def formatiere(zeilen):
    """Absätze durch Leerzeile trennen, Aufzählungen kompakt untereinander."""
    out = []
    vorher_liste = False
    for z in zeilen:
        liste = bool(RE_LISTE.match(z))
        if out:
            if RE_ABSATZ.match(z) or (vorher_liste and not liste):
                out.append("")
            elif liste and not vorher_liste:
                out.append("")
        out.append("    " + z if re.match(r"^[a-z]\)\s", z) else z)
        vorher_liste = liste
    return "\n".join(out)


def anlage_text(zeilen):
    """Tabelle 'Kategorie / Gegenstände' (abwechselnde Zeilen) als Liste."""
    vorspann, tabelle = [], []
    for z in zeilen:
        (tabelle if tabelle or z == "Kategorie" else vorspann).append(z)
    zeilen_out = list(vorspann)
    if tabelle[:2] == ["Kategorie", "Gegenstände"]:
        rest = tabelle[2:]
        if vorspann:
            zeilen_out.append("")
        for i in range(0, len(rest) - 1, 2):
            zeilen_out.append(f"• {rest[i + 1]} ({rest[i]})")
    else:
        zeilen_out += tabelle
    return "\n".join(zeilen_out)


def parse(pfad):
    zeilen = [z.strip() for z in pfad.read_text(encoding="utf-8-sig").splitlines()]
    eintraege = {}   # nummer -> dict (letztes Vorkommen mit Text gewinnt)
    reihenfolge = []
    abschnitt = None
    aktuell = None

    def abschliessen():
        if not aktuell:
            return
        body = [z for z in aktuell["zeilen"] if z]
        if not body:
            return  # Eintrag eines Inhaltsverzeichnisses
        text = anlage_text(body) if aktuell["anlage"] else formatiere(body)
        nr = aktuell["nummer"]
        if nr not in eintraege:
            reihenfolge.append(nr)
        eintraege[nr] = {"nummer": nr, "titel": aktuell["titel"], "abschnitt": aktuell["abschnitt"], "text": text}

    for z in zeilen:
        if z in UEBERSPRINGEN:
            continue
        if RE_KAPITEL.match(z):
            abschliessen(); aktuell = None
            abschnitt = z.replace(" - ", " – ")
            continue
        m = RE_PARA.match(z)
        if m and len(z) < 120 and not z.endswith((".", ",", ";")):
            abschliessen()
            aktuell = {"nummer": f"§ {m.group(1)}", "titel": m.group(2).strip(), "abschnitt": abschnitt, "zeilen": [], "anlage": False}
            continue
        m = RE_ANLAGE.match(z)
        if m:
            abschliessen()
            aktuell = {"nummer": f"Anlage {m.group(1)}", "titel": m.group(2).strip(), "abschnitt": "Anlagen", "zeilen": [], "anlage": True}
            continue
        if aktuell is not None:
            aktuell["zeilen"].append(z)
    abschliessen()
    return [eintraege[n] for n in reihenfolge]


def q(s):
    return "null" if s is None else "'" + s.replace("'", "''") + "'"


def main():
    teile = [
        "-- =============================================================",
        "--  Wiwang Law – Gesetzestexte: " + ", ".join(b[1] for b in BUECHER),
        "--",
        "--  Erzeugt mit tools/gesetze-sql.py aus dem Ordner gesetze/.",
        "--  Diesen ganzen Text in Supabase unter \"SQL Editor\" einfügen und",
        "--  auf \"Run\" klicken. Voraussetzung: Update 8.",
        "--  Kann gefahrlos mehrfach ausgeführt werden: Die Gesetzbücher",
        "--  werden angelegt bzw. aktualisiert, ihre Paragraphen ersetzt.",
        "-- =============================================================",
        "",
        "begin;",
    ]
    gesamt = 0
    for datei, kuerzel, titel, beschreibung, farbe, sortierung in BUECHER:
        paras = parse(ROOT / "gesetze" / datei)
        gesamt += len(paras)
        print(f"{kuerzel}: {len(paras)} Einträge", file=sys.stderr)
        teile += [
            "",
            f"-- ---------- {kuerzel} – {titel} ({len(paras)} Paragraphen) ----------",
            "insert into public.gesetzbuecher (kuerzel, titel, beschreibung, farbe, sortierung)",
            f"select {q(kuerzel)}, {q(titel)}, {q(beschreibung)}, {q(farbe)}, {sortierung}",
            f"where not exists (select 1 from public.gesetzbuecher where lower(kuerzel) = lower({q(kuerzel)}));",
            f"update public.gesetzbuecher set titel = {q(titel)}, beschreibung = {q(beschreibung)}",
            f"  where lower(kuerzel) = lower({q(kuerzel)});",
            f"delete from public.paragraphen where gesetzbuch_id = (select id from public.gesetzbuecher where lower(kuerzel) = lower({q(kuerzel)}));",
            "insert into public.paragraphen (gesetzbuch_id, nummer, titel, abschnitt, text)",
            f"select g.id, v.nummer, v.titel, v.abschnitt, v.text from public.gesetzbuecher g, (values",
        ]
        werte = [f"  ({q(p['nummer'])}, {q(p['titel'])}, {q(p['abschnitt'])}, {q(p['text'])})" for p in paras]
        teile.append(",\n".join(werte))
        teile.append(f") as v(nummer, titel, abschnitt, text) where lower(g.kuerzel) = lower({q(kuerzel)});")
    teile += ["", "commit;", ""]
    (ROOT / "supabase-gesetze.sql").write_text("\n".join(teile), encoding="utf-8")
    print(f"supabase-gesetze.sql geschrieben ({gesamt} Paragraphen)", file=sys.stderr)


if __name__ == "__main__":
    main()
