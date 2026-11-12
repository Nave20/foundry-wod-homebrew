"""
Import de fiches de personnage d'une vault Obsidian vers un fichier JSON lu par tools/importer-personnage.js.

Usage (Windows) :
    PYTHONUTF8=1 python tools/import_personnage_vault.py "<fichier JSON de sortie>" "<note.md>" ["<note2.md>" …]
    Option --racine "<dossier>" : les sous-dossiers des notes sous ce dossier sont recréés dans Foundry.

Ce script ne fait que lire la note, sans rien décider du côté Foundry :
- les propriétés (front matter) : valeurs simples et listes de textes ;
- les sections « ## Titre », converties en HTML ;
- les pouvoirs de « ## Pouvoirs et rituels » (« - Discipline : Pouvoir (niveau : effet), … ») ;
- les tableaux « ### Rituels » et « ## Équipement ».
La correspondance avec les champs de la fiche (attributs, capacités, compendiums) est faite dans Foundry, avec
les Traits de la chronique du monde. Le fichier de sortie va dans le dossier Data de Foundry (hors du système).
"""
import html
import json
import shutil
import re
import sys
from pathlib import Path


def _valeur(brut: str):
    v = brut.strip()
    if v == "[]":
        return []
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        return v[1:-1]
    if re.fullmatch(r"-?\d+", v):
        return int(v)
    return v


def lire_front_matter(texte: str) -> dict:
    """Propriétés de la note : « clé: valeur » ou « clé: » suivi de lignes « - élément »"""
    m = re.match(r"^---\n(.*?)\n---\n", texte.replace("\r\n", "\n"), re.S)
    if not m:
        return {}
    props, cle = {}, None
    for ligne in m.group(1).splitlines():
        e = re.match(r"^\s+-\s*(.*)$", ligne)
        if e and cle:
            if not isinstance(props[cle], list):
                props[cle] = []
            props[cle].append(_valeur(e.group(1)))
            continue
        c = re.match(r"^([\w-]+):\s*(.*)$", ligne)
        if c:
            cle = c.group(1)
            props[cle] = _valeur(c.group(2)) if c.group(2).strip() else []
    return props


def lire_trait(texte: str) -> dict:
    """« Nom (détail) N » ; « Spécialité trait (spécialité) N » donne specialite_de = trait"""
    t = str(texte).strip()
    valeur = 0
    m = re.match(r"^(.*?)\s+(\d+)$", t)
    if m:
        t, valeur = m.group(1).strip(), int(m.group(2))
    detail = ""
    d = re.match(r"^(.*?)\s*\((.*)\)$", t)
    if d:
        t, detail = d.group(1).strip(), d.group(2).strip()
    s = re.match(r"^Spécialité\s+(.+)$", t, re.I)
    if s:
        return {"nom": s.group(1).strip(), "detail": detail, "valeur": valeur, "specialite_de": s.group(1).strip()}
    return {"nom": t, "detail": detail, "valeur": valeur, "specialite_de": None}


def _decouper(texte: str, sep: str) -> list:
    """Découpe sur sep hors des parenthèses"""
    morceaux, prof, courant = [], 0, ""
    for c in texte:
        prof += (c == "(") - (c == ")")
        if c == sep and prof == 0:
            morceaux.append(courant)
            courant = ""
        else:
            courant += c
    morceaux.append(courant)
    return [m.strip() for m in morceaux if m.strip()]


def lire_pouvoirs(texte: str) -> list:
    """Puces « - Discipline : Pouvoir (n : effet), Pouvoir (n). Autre discipline : … »"""
    pouvoirs = []
    for ligne in texte.splitlines():
        if not ligne.startswith("- "):
            continue
        # Plusieurs disciplines sur une puce : « …. Célérité : … » (hors parenthèses)
        blocs, courant, prof = [], "", 0
        contenu = ligne[2:].strip()
        i = 0
        while i < len(contenu):
            c = contenu[i]
            prof += (c == "(") - (c == ")")
            if c == "." and prof == 0 and re.match(r"\s+[A-ZÀ-Ý][^:().]{0,40}\s:", contenu[i + 1:]):
                blocs.append(courant)
                courant = ""
            else:
                courant += c
            i += 1
        blocs.append(courant)
        for bloc in blocs:
            if " : " not in bloc:
                continue
            groupe, liste = bloc.split(" : ", 1)
            # « Jet : … » et descriptions en phrases (« **Auspex 2** : il voit… ») : pas une liste de pouvoirs
            if re.match(r"^\s*Jets?$", groupe) or "**" in groupe:
                continue
            elements = []
            for p in _decouper(liste.rstrip(". "), ","):
                m = re.match(r"^(.*?)\s*\((\d+)\s*(?::\s*(.*))?\)$", p, re.S)
                if m:
                    elements.append({"groupe": groupe.strip(), "nom": m.group(1).strip(),
                                     "niveau": int(m.group(2)), "effet": (m.group(3) or "").strip()})
                elif "(" in p or len(p) > 45 or p[:1].islower():
                    elements = None  # phrase ou sous-liste : le texte reste dans les notes
                    break
                else:
                    elements.append({"groupe": groupe.strip(), "nom": p.strip(), "niveau": 0, "effet": ""})
            pouvoirs.extend(elements or [])
    return pouvoirs


def lire_tableau(texte: str) -> list:
    """Premier tableau Markdown du texte → liste de dictionnaires (en-tête → cellule)"""
    lignes = [l.strip() for l in texte.splitlines()]
    for i, l in enumerate(lignes):
        if l.startswith("|") and i + 1 < len(lignes) and re.match(r"^\|[\s:|-]+\|$", lignes[i + 1]):
            entete = [c.strip() for c in l.strip("|").split("|")]
            rangs = []
            for r in lignes[i + 2:]:
                if not r.startswith("|"):
                    break
                cellules = [c.strip() for c in r.strip("|").split("|")]
                rangs.append(dict(zip(entete, cellules)))
            return rangs
    return []


def _en_ligne(t: str) -> str:
    t = re.sub(r"\[\[[^\]|]+\|([^\]]+)\]\]", r"\1", t)
    t = re.sub(r"\[\[([^\]#|]+)(?:#[^\]]*)?\]\]", r"\1", t)
    t = html.escape(t, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)", r"<em>\1</em>", t)
    return t


def markdown_html(md: str) -> str:
    """Paragraphes, listes à puces, tableaux et titres ### → HTML simple"""
    sortie, liste, para = [], [], []
    lignes = md.strip().splitlines()

    def vider():
        if para:
            sortie.append(f"<p>{_en_ligne(' '.join(para))}</p>")
            para.clear()
        if liste:
            sortie.append("<ul>" + "".join(f"<li>{_en_ligne(x)}</li>" for x in liste) + "</ul>")
            liste.clear()

    i = 0
    while i < len(lignes):
        l = lignes[i].strip()
        if l.startswith("|") and i + 1 < len(lignes) and re.match(r"^\|[\s:|-]+\|$", lignes[i + 1].strip()):
            vider()
            entete = [c.strip() for c in l.strip("|").split("|")]
            corps = []
            i += 2
            while i < len(lignes) and lignes[i].strip().startswith("|"):
                corps.append([c.strip() for c in lignes[i].strip().strip("|").split("|")])
                i += 1
            sortie.append("<table><thead><tr>" + "".join(f"<th>{_en_ligne(c)}</th>" for c in entete)
                          + "</tr></thead><tbody>" + "".join(
                              "<tr>" + "".join(f"<td>{_en_ligne(c)}</td>" for c in r) + "</tr>" for r in corps)
                          + "</tbody></table>")
            continue
        if l.startswith("### "):
            vider()
            sortie.append(f"<h3>{_en_ligne(l[4:])}</h3>")
        elif l.startswith("- "):
            if para:
                vider()
            liste.append(l[2:])
        elif not l:
            vider()
        else:
            if liste:
                vider()
            para.append(l)
        i += 1
    vider()
    return "\n".join(sortie)


def lire_sections(texte: str) -> dict:
    corps = re.sub(r"^---\n.*?\n---\n", "", texte.replace("\r\n", "\n"), count=1, flags=re.S)
    corps = re.sub(r"```.*?```", "", corps, flags=re.S)
    return {m.group(1).strip(): m.group(2).strip()
            for m in re.finditer(r"^## (.+?)\n(.*?)(?=^## |\Z)", corps, re.S | re.M)}


LISTES_SIMPLES = {"tags", "campagne", "aliases"}


def lire_note(texte: str, nom: str) -> dict:
    props = lire_front_matter(texte)
    sections = lire_sections(texte)
    pouvoirs_md = sections.get("Pouvoirs et rituels", "")
    rituels_md = pouvoirs_md.split("### Rituels", 1)[1] if "### Rituels" in pouvoirs_md else ""
    return {
        "nom": nom,
        "creature": props.get("creature", "mortel"),
        "proprietes": props,
        # Listes de traits notés (capacités secondaires, historiques, atouts…) déjà découpées
        "traits": {cle: [lire_trait(x) for x in v] for cle, v in props.items()
                   if isinstance(v, list) and cle not in LISTES_SIMPLES},
        "sections": {titre: markdown_html(md) for titre, md in sections.items() if md.strip()},
        "pouvoirs": lire_pouvoirs(pouvoirs_md.split("###", 1)[0]),
        "rituels": lire_tableau(rituels_md),
        "equipement": lire_tableau(sections.get("Équipement", "")),
    }


def racine_vault(chemin: Path):
    """Dossier de la vault (celui qui contient .obsidian), ou None"""
    for d in [chemin, *chemin.parents]:
        if (d / ".obsidian").is_dir():
            return d
    return None


def copier_images(fiches, notes, sortie):
    """Portrait et jeton (« [[image.jpg]] ») copiés dans <Data>/wod-homebrew-portraits ; chemin Foundry dans f["images"]"""
    vault = racine_vault(Path(notes[0]).resolve()) if notes else None
    if not vault:
        return
    index = {}
    for p in vault.rglob("*"):
        if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp", ".gif") and ".trash" not in p.parts:
            index.setdefault(p.name.lower(), p)
    data = Path(sortie).resolve().parent.parent
    dest = data / "wod-homebrew-portraits"
    dest.mkdir(exist_ok=True)
    for f in fiches:
        for cle in ("portrait", "jeton"):
            v = str(f["proprietes"].get(cle) or "")
            m = re.match(r"^!?\[\[([^\]|#]+)", v)
            source = index.get(m.group(1).strip().split("/")[-1].lower()) if m else None
            if source:
                cible = dest / source.name
                if not cible.exists() or cible.stat().st_size != source.stat().st_size:
                    shutil.copy2(source, cible)
                f.setdefault("images", {})[cle] = f"wod-homebrew-portraits/{source.name}"


def main(sortie: str, *notes: str, racine: str = ""):
    fiches = []
    for n in notes:
        f = lire_note(Path(n).read_text(encoding="utf-8"), Path(n).stem)
        # Chemin de la note (sert à remplacer un import précédent) et sous-dossiers à recréer dans Foundry
        rel = Path(n).resolve().relative_to(Path(racine).resolve()) if racine else Path(Path(n).name)
        f["chemin"] = rel.as_posix()
        f["dossier"] = list(rel.parent.parts)
        fiches.append(f)
    copier_images(fiches, notes, sortie)
    Path(sortie).parent.mkdir(parents=True, exist_ok=True)
    Path(sortie).write_text(json.dumps(fiches, ensure_ascii=False, indent=1), encoding="utf-8")
    for f in fiches:
        print(f"{f['nom']} ({f['creature']}) : {len(f['proprietes'])} propriétés, {len(f['sections'])} sections, "
              f"{len(f['pouvoirs'])} pouvoirs, {len(f['rituels'])} rituels, {len(f['equipement'])} objets")
    print(f"→ {sortie}")


if __name__ == "__main__":
    args = sys.argv[1:]
    racine = ""
    if "--racine" in args:
        i = args.index("--racine")
        racine = args[i + 1]
        del args[i:i + 2]
    if len(args) < 2:
        sys.exit(__doc__)
    main(args[0], *args[1:], racine=racine)
