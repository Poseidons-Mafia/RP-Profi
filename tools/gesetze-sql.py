#!/usr/bin/env python3
# =============================================================
#  Wiwang Law – Gesetzestexte (gesetze/*.txt) in SQL umwandeln
#
#  Liest die Gesetzbücher aus dem Ordner gesetze/ und schreibt
#  supabase-gesetze.sql. Die Datei legt jedes Gesetzbuch an (oder
#  aktualisiert es) und ersetzt seine Paragraphen vollständig.
#
#  Erkannt werden:
#    Gliederung   "Kapitel 1 – …", "Abschnitt 2 – …", "Abschnitt IV – …", "III. – …"
#    Vorschriften "§ 12 – Titel", "Artikel 5 – Titel", "Anlage 1 – Titel", "Präambel"
#    Absätze "(1)", Aufzählungen "1." / "a)", Aufzählungen ohne Nummer
#    (direkt untereinander stehende Zeilen), Tabellen aus Anlagen.
#  Inhaltsverzeichnisse (Einträge ohne Text) werden übersprungen.
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
    ("Verfassung.txt", "Verf", "Verfassung des Staates San Andreas",
     "Staatsform, Grundrechte, Parlament und Gesetzgebung, Exekutive, Gerichte, Constitutional Court und National Guard.",
     "gold", 5),
    ("StGB.txt", "StGB", "Strafgesetzbuch",
     "Allgemeiner Teil (Gesamtstrafe, Versuch, Notwehr, Strafen) und alle Straftatbestände mit Strafrahmen in Hafteinheiten.",
     "rot", 10),
    ("StPO.txt", "StPO", "Strafprozessordnung",
     "Ermittlungsverfahren, Beweismittel, Festnahme und Untersuchungshaft, Anklage, Hauptverhandlung, Rechtsmittel, Vollstreckung und Verjährung.",
     "schwarz", 15),
    ("BGB.txt", "BGB", "Bürgerliches Gesetzbuch",
     "Rechtsfähigkeit, Verträge, Eigentum, Selbsthilfe und Schadensersatz, Zivilklage, Ausweispflicht und Familienrecht.",
     "blau", 20),
    ("LPolG.txt", "LPolG", "Landespolizeigesetz",
     "Aufgaben und Befugnisse der Polizeibehörden: Gefahrenabwehr, Identitätsfeststellung, Gewahrsam, Durchsuchung, Sicherstellung und Zwang.",
     "schwarz", 30),
    ("StVO.txt", "StVO", "Straßenverkehrsordnung",
     "Verkehrsregeln, Höchstgeschwindigkeiten, Sonderrechte, Ordnungswidrigkeiten, Verkehrspunkte und Bußgeldkatalog.",
     "blau", 35),
    ("WaffG.txt", "WaffG", "Waffengesetz",
     "Waffenschein und Sonderwaffenschein, Erlaubnisvoraussetzungen, Waffenhandel und zugelassene Waffen.",
     "gruen", 38),
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

# Texte, die sich nicht automatisch sinnvoll umwandeln lassen (mehrspaltige Tabellen)
ERSETZT = {
    ("WaffG", "Anlage 1"): """Die nachfolgend aufgeführten Waffen sind nach § 9 erlaubnisfähig. Die mit einem Stern (*) gekennzeichneten Waffen sind ausschließlich den in § 6 genannten Behörden vorbehalten; ihr Besitz oder ihre Nutzung durch andere Behörden oder Zivilpersonen ist nach § 9 verboten.

Zivil zugelassen

Schusswaffen:
• Schwere Pistole
• Pistole
• Klassische Pistole
• SNS Pistole

Stich-, Wurf-, Hieb- und Schlagwaffen:
• Messer
• Axt

Nur den Behörden nach § 6 vorbehalten (*)

Schusswaffen*:
• (Schweres) Scharfschützengewehr
• Spezialkarabiner
• Erweitertes Gewehr
• Karabinergewehr
• Militärgewehr
• Bullpup-Gewehr
• Dienstgewehr
• Pumpgun
• Einsatz-PDW
• Sturm-MP
• SMG
• Gefechtspistole
• Keramik Pistole
• Leuchtpistole
• Elektroimpulswaffe

Stich-, Wurf-, Hieb- und Schlagwaffen*:
• Schlagstock
• Signalfackel
• BZ-Gasgranaten""",
}

RE_GLIEDERUNG = re.compile(r"^(?:Kapitel\s+\d+|Abschnitt\s+(?:\d+|[IVXLC]+)\.?|[IVXLC]+\.)\s*[–-]\s*(\S.*)$")
RE_PARA = re.compile(r"^§\s*(\d+[a-z]?)\s*[–-]\s*(.+)$")
RE_ARTIKEL = re.compile(r"^Artikel\s+(\d+[a-z]?)\s*[–-]\s*(.+)$")
RE_ANLAGE = re.compile(r"^Anlage\s+(\d+)\s*[–-]\s*(.+)$")
RE_ABSATZ = re.compile(r"^\(\d+[a-z]?\)")
RE_LISTE = re.compile(r"^(\d+\.|[a-z]\))\s")
UEBERSPRINGEN = {"Inhaltsverzeichnis", "Inhaltsübersicht"}

# Tabellen in den Texten: Kopfzeile → Darstellung je Zeile
TABELLEN = {
    ("Kategorie", "Gegenstände"): lambda z: f"• {z[1]} ({z[0]})",
    ("Überschreitung", "Bußgeld", "Punkte"): lambda z: f"• {z[0]}: {z[1]}" + (f", {z[2]} Punkt{'' if z[2] == '1' else 'e'}" if z[2].isdigit() else f", {z[2]}"),
}


def tabellen_umwandeln(zeilen):
    """Erkennt Tabellen (eine Zelle je Zeile) und macht daraus Listenzeilen.
    Gibt Zeilen zurück; None steht für eine Leerzeile."""
    out, i = [], 0
    while i < len(zeilen):
        z = zeilen[i]
        if z is None:
            out.append(None); i += 1; continue
        treffer = None
        for kopf, fmt in TABELLEN.items():
            zellen = [x for x in zeilen[i:i + 3 * len(kopf)] if x is not None][:len(kopf)]
            if tuple(zellen) == kopf:
                treffer = (kopf, fmt)
                break
        if not treffer:
            out.append(z); i += 1; continue
        kopf, fmt = treffer
        n = len(kopf)
        # Kopf überspringen
        gesehen = 0
        while gesehen < n:
            if zeilen[i] is not None:
                gesehen += 1
            i += 1
        zellen = []
        while i < len(zeilen) and (zeilen[i] is None or not RE_ABSATZ.match(zeilen[i])):
            if zeilen[i] is not None:
                zellen.append(zeilen[i])
            i += 1
        if out and out[-1] is not None:
            out.append(None)
        for k in range(0, len(zellen) - n + 1, n):
            out.append("\x00" + fmt(zellen[k:k + n]))  # \x00 = fertige Listenzeile
        out.append(None)
    return out


def formatiere(roh):
    """roh: Zeilen des Paragraphen, None = Leerzeile in der Vorlage.
    Absätze durch Leerzeile trennen, Aufzählungen kompakt untereinander."""
    roh = tabellen_umwandeln(roh)
    while roh and roh[0] is None:
        roh.pop(0)
    # Zeilen ohne Nummer, die direkt (ohne Leerzeile) an eine ebensolche grenzen, sind Aufzählungspunkte
    def schlicht(z):
        return z is not None and not z.startswith("\x00") and not RE_ABSATZ.match(z) and not RE_LISTE.match(z)
    zeilen, punkt = [], []
    for i, z in enumerate(roh):
        if z is None:
            continue
        nachbar = (i > 0 and schlicht(roh[i - 1])) or (i + 1 < len(roh) and schlicht(roh[i + 1]))
        zeilen.append(z)
        punkt.append(schlicht(z) and nachbar)

    out = []
    vorher_liste = False
    for z, ist_punkt in zip(zeilen, punkt):
        if z.startswith("\x00"):
            z, liste = z[1:], True
        elif ist_punkt:
            z, liste = "• " + z, True
        else:
            liste = bool(RE_LISTE.match(z))
        if out:
            if RE_ABSATZ.match(z) or (vorher_liste and not liste) or (liste and not vorher_liste):
                out.append("")
        out.append("    " + z if re.match(r"^[a-z]\)\s", z) else z)
        vorher_liste = liste
    return "\n".join(out)


def parse(pfad, kuerzel):
    zeilen = [z.strip() for z in pfad.read_text(encoding="utf-8-sig").splitlines()]
    eintraege = {}   # nummer -> dict (letztes Vorkommen mit Text gewinnt)
    reihenfolge = []
    abschnitt = None
    aktuell = None

    def abschliessen():
        if not aktuell:
            return
        roh = list(aktuell["zeilen"])
        while roh and roh[-1] is None:
            roh.pop()
        weggefallen = re.fullmatch(r"\((weggefallen|entfallen|aufgehoben)\)", aktuell["titel"] or "", re.I)
        if weggefallen and not any(z is not None for z in roh):
            roh = [aktuell["titel"]]
        elif not any(z is not None for z in roh):
            return  # Eintrag eines Inhaltsverzeichnisses
        nr = aktuell["nummer"]
        text = ERSETZT.get((kuerzel, nr)) or formatiere(roh)
        if nr not in eintraege:
            reihenfolge.append(nr)
        eintraege[nr] = {"nummer": nr, "titel": aktuell["titel"], "abschnitt": aktuell["abschnitt"], "text": text}

    def neu(nummer, titel, abschn):
        nonlocal aktuell
        abschliessen()
        aktuell = {"nummer": nummer, "titel": titel, "abschnitt": abschn, "zeilen": []}

    for z in zeilen:
        if z in UEBERSPRINGEN:
            continue
        m = RE_GLIEDERUNG.match(z)
        if m and len(z) < 120:
            abschliessen(); aktuell = None
            kopf = re.sub(r"^(Abschnitt\s+[IVXLC\d]+)\.", r"\1", z)
            abschnitt = re.sub(r"\s+[–-]\s+", " – ", kopf, count=1)
            continue
        m = RE_PARA.match(z) or RE_ARTIKEL.match(z)
        if m and len(z) < 120 and not z.endswith((".", ",", ";")):
            neu(("§ " if z.startswith("§") else "Art. ") + m.group(1), m.group(2).strip(), abschnitt)
            continue
        m = RE_ANLAGE.match(z)
        if m:
            neu(f"Anlage {m.group(1)}", m.group(2).strip(), "Anlagen")
            continue
        if z == "Präambel":
            neu("Präambel", None, None)
            continue
        if aktuell is not None:
            aktuell["zeilen"].append(z or None)
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
        paras = parse(ROOT / "gesetze" / datei, kuerzel)
        gesamt += len(paras)
        print(f"{kuerzel}: {len(paras)} Einträge", file=sys.stderr)
        teile += [
            "",
            f"-- ---------- {kuerzel} – {titel} ({len(paras)} Einträge) ----------",
            "insert into public.gesetzbuecher (kuerzel, titel, beschreibung, farbe, sortierung)",
            f"select {q(kuerzel)}, {q(titel)}, {q(beschreibung)}, {q(farbe)}, {sortierung}",
            f"where not exists (select 1 from public.gesetzbuecher where lower(kuerzel) = lower({q(kuerzel)}));",
            f"update public.gesetzbuecher set titel = {q(titel)}, beschreibung = {q(beschreibung)}",
            f"  where lower(kuerzel) = lower({q(kuerzel)});",
            f"delete from public.paragraphen where gesetzbuch_id = (select id from public.gesetzbuecher where lower(kuerzel) = lower({q(kuerzel)}));",
            "insert into public.paragraphen (gesetzbuch_id, nummer, titel, abschnitt, text)",
            "select g.id, v.nummer, v.titel, v.abschnitt, v.text from public.gesetzbuecher g, (values",
        ]
        werte = [f"  ({q(p['nummer'])}, {q(p['titel'])}, {q(p['abschnitt'])}, {q(p['text'])})" for p in paras]
        teile.append(",\n".join(werte))
        teile.append(f") as v(nummer, titel, abschnitt, text) where lower(g.kuerzel) = lower({q(kuerzel)});")
    teile += ["", "commit;", ""]
    (ROOT / "supabase-gesetze.sql").write_text("\n".join(teile), encoding="utf-8")
    print(f"supabase-gesetze.sql geschrieben ({gesamt} Einträge)", file=sys.stderr)


if __name__ == "__main__":
    main()
