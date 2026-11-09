"""
Import des pouvoirs de disciplines d'une vault Obsidian vers un fichier JSON d'objets « pouvoir » (wod_homebrew).

Usage (Windows) :
    PYTHONUTF8=1 python tools/import_pouvoirs_vault.py "<dossier des notes de disciplines>" "<fichier JSON de sortie>"

Lit dans chaque note :
- les pouvoirs des éditions classiques : sections « ### Niveau N », lignes « - **Nom** (*nom anglais*) : effet »,
  lignes de suite indentées, puis « *Sources : … * » ; édition « V20 » ;
- le tableau « ### Pouvoirs V5 » (Niveau | Pouvoir | Effet | Coût | Dés | Durée | Amalgame) ; édition « V5 ».
Les sections « Généralités » et « Pouvoirs combinés » sont ignorées.
Le fichier de sortie doit être placé dans le dossier Data de Foundry (hors du système), puis importé avec
tools/importer-compendium.js. Les pouvoirs ne sont pas publiés avec le système.
"""
import html
import json
import re
import sys
from pathlib import Path

PUCE = re.compile(r"^- \*\*(?P<nom>[^*]+)\*\*(?:\s*\(\*(?P<en>[^*]+)\*\))?\s*:?\s*(?P<effet>.*)$")
SOURCES = re.compile(r"^\*Sources\s*:\s*(?P<s>.*?)\*?\s*$")


def nettoyer(texte: str) -> str:
    """Liens Obsidian → texte affiché ; gras et italique retirés"""
    texte = re.sub(r"\[\[[^\]|]+\|([^\]]+)\]\]", r"\1", texte)
    texte = re.sub(r"\[\[([^\]#]+)(?:#[^\]]*)?\]\]", r"\1", texte)
    return texte.replace("**", "").strip()


def paragraphes(lignes) -> str:
    return "\n".join(f"<p>{html.escape(nettoyer(l))}</p>" for l in lignes if nettoyer(l))


def pouvoir(nom, groupe, niveau, edition, description_lignes, cout="", jet="", en="", sources=""):
    return {"name": nettoyer(nom), "type": "pouvoir", "system": {
        "categorie": "discipline", "groupe": groupe, "niveau": niveau, "edition": edition,
        "cout": nettoyer(cout), "jet": nettoyer(jet), "description": paragraphes(description_lignes),
        "nomAnglais": nettoyer(en), "sources": nettoyer(sources)}}


def vide(v: str) -> str:
    return "" if v.strip() in ("—", "-", "") else v.strip()


def lire_discipline(texte: str, groupe: str) -> list:
    resultat = []
    section, niveau, courant = None, None, None

    def clore():
        nonlocal courant
        if courant:
            courant.pop("anonyme", None)
            resultat.append(pouvoir(groupe=groupe, **courant))
            courant = None

    for brut in texte.splitlines():
        ligne = brut.rstrip()
        titre = re.match(r"^(#{2,4})\s+(.*)$", ligne)
        if titre:
            clore()
            t = titre.group(2).strip()
            m = re.match(r"^Niveau\s+(\d+)", t)
            if m:
                section, niveau = "classique", int(m.group(1))
            elif t.startswith("Pouvoirs V5"):
                section, niveau = "v5", None
            elif t.startswith("Formules V5"):
                section, niveau = "formules", None
            else:
                section, niveau = None, None
            continue
        if section == "formules":
            # Niveau | Formule | Effet | Ingrédients | Coût d'activation | Durée
            if ligne.startswith("|") and not re.match(r"^\|\s*-", ligne) and not ligne.startswith("| Niveau"):
                c = [x.strip() for x in ligne.strip("|").split("|")]
                if len(c) >= 6 and c[0].isdigit():
                    desc = [vide(c[2])] + [f"{t} : {v}" for t, v in (("Ingrédients", c[3]), ("Durée", c[5])) if vide(v)]
                    resultat.append(pouvoir(c[1], groupe, int(c[0]), "V5", desc, cout=vide(c[4])))
            continue
        if section == "v5":
            if ligne.startswith("|") and not re.match(r"^\|\s*-", ligne) and not ligne.startswith("| Niveau"):
                cellules = [c.strip() for c in ligne.strip("|").split("|")]
                if len(cellules) >= 6 and cellules[0].isdigit():
                    desc = [vide(cellules[2])]
                    if vide(cellules[5]):
                        desc.append(f"Durée : {cellules[5]}")
                    if len(cellules) > 6 and vide(cellules[6]):
                        desc.append(f"Amalgame : {cellules[6]}")
                    resultat.append(pouvoir(cellules[1], groupe, int(cellules[0]), "V5", desc,
                                            cout=vide(cellules[3]), jet=vide(cellules[4])))
            continue
        if section != "classique":
            continue
        m = PUCE.match(ligne)
        if m:
            clore()
            courant = {"nom": m.group("nom"), "niveau": niveau, "edition": "V20",
                       "description_lignes": [m.group("effet")], "en": m.group("en") or ""}
            continue
        if ligne.startswith("- "):
            # Niveau sans pouvoir nommé : un seul pouvoir « Discipline N » qui regroupe les variantes
            if not (courant and courant.get("anonyme") and courant["niveau"] == niveau):
                clore()
                courant = {"nom": f"{groupe} {niveau}", "niveau": niveau, "edition": "V20",
                           "description_lignes": [], "anonyme": True}
            courant["description_lignes"].append(ligne[2:])
            continue
        if courant and ligne.startswith((" ", "\t")) and ligne.strip():
            s = SOURCES.match(ligne.strip())
            if s:
                courant["sources"] = " ; ".join(x for x in (courant.get("sources"), s.group("s")) if x)
            else:
                courant["description_lignes"].append(ligne.strip())
        elif not ligne.strip():
            continue
        else:
            clore()
    clore()
    return resultat


def main(dossier: str, sortie: str):
    tous, ignorees = [], []
    for note in sorted(Path(dossier).glob("*.md")):
        if note.stem in ("Disciplines", "Disciplines combinées"):
            continue
        p = lire_discipline(note.read_text(encoding="utf-8"), note.stem)
        (tous.extend(p) if p else ignorees.append(note.stem))
    Path(sortie).parent.mkdir(parents=True, exist_ok=True)
    Path(sortie).write_text(json.dumps(tous, ensure_ascii=False, indent=1), encoding="utf-8")
    par_ed = {e: sum(1 for x in tous if x["system"]["edition"] == e) for e in ("V20", "V5")}
    groupes = len({x["system"]["groupe"] for x in tous})
    print(f"{len(tous)} pouvoirs ({par_ed}) dans {groupes} disciplines → {sortie}")
    if ignorees:
        print(f"- notes sans pouvoir reconnu ({len(ignorees)}) : {', '.join(ignorees)}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
