"""
Import des pouvoirs de disciplines d'une vault Obsidian vers un fichier JSON d'objets « pouvoir » (wod_homebrew).

Usage (Windows) :
    PYTHONUTF8=1 python tools/import_pouvoirs_vault.py "<fichier JSON de sortie>" "<dossier des disciplines>" ["<dossier des dons>" …]

Lit dans chaque note :
- les pouvoirs des éditions classiques : sections « ### Niveau N », lignes « - **Nom** (*nom anglais*) : effet »,
  lignes de suite indentées, puis « *Sources : … * » ; édition « V20 » ;
- le tableau « ### Pouvoirs V5 » (Niveau | Pouvoir | Effet | Coût | Dés | Durée | Amalgame) ; édition « V5 ».
- le tableau « ### Rituels V5 » (Niveau | Rituel | Effet | Ingrédients | Système) : pouvoirs de catégorie « rite », édition « V5 ».
Les sections « Généralités » et « Pouvoirs combinés » sont ignorées.
La note « Disciplines combinées » donne un pouvoir par bloc « ## Nom » (niveau = plus haut prérequis).
Les notes « Dons - Groupe » (W20) donnent un don par « ### Nom » sous « ## Niveau N » ; édition « W20 ».
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


def pouvoir(nom, groupe, niveau, edition, description_lignes, cout="", jet="", en="", sources="", categorie="discipline"):
    return {"name": nettoyer(nom), "type": "pouvoir", "system": {
        "categorie": categorie, "groupe": groupe, "niveau": niveau, "edition": edition,
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
            elif t.startswith("Rituels V5"):
                section, niveau = "rituels", None
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
        if section == "rituels":
            # Niveau | Rituel | Effet | Ingrédients | Système
            if ligne.startswith("|") and not re.match(r"^\|\s*-", ligne) and not ligne.startswith("| Niveau"):
                c = [x.strip() for x in ligne.strip("|").split("|")]
                if len(c) >= 5 and c[0].isdigit():
                    desc = [vide(c[2])] + [f"{t} : {v}" for t, v in (("Ingrédients", c[3]), ("Système", c[4])) if vide(v)]
                    resultat.append(pouvoir(c[1], groupe, int(c[0]), "V5", desc, categorie="rite"))
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


def lire_combinees(texte: str) -> list:
    """Note « Disciplines combinées » : blocs « ## Nom », ligne « **Prérequis** : … », effet, « *Source : … * ».
    Le niveau est le plus haut prérequis."""
    resultat, courant = [], None

    def clore():
        if courant:
            niveaux = [int(n) for n in re.findall(r"\b(\d+)\b", courant["prerequis"]) if int(n) <= 10]
            lignes = [f"Prérequis : {courant['prerequis']}"] + courant["lignes"]
            resultat.append(pouvoir(courant["nom"], "Disciplines combinées", max(niveaux, default=0), "V20", lignes,
                                    sources=courant["sources"]))

    for brut in texte.splitlines():
        ligne = brut.strip()
        m = re.match(r"^##\s+(.*)$", ligne)
        if m and not ligne.startswith("###"):
            clore()
            courant = {"nom": m.group(1), "prerequis": "", "lignes": [], "sources": ""}
            continue
        if not courant or not ligne:
            continue
        p = re.match(r"^\*\*Prérequis\*\*\s*:\s*(.*)$", ligne)
        s = re.match(r"^\*Sources?\s*:\s*(.*?)\*?$", ligne)
        if p:
            courant["prerequis"] = nettoyer(p.group(1))
        elif s:
            courant["sources"] = s.group(1)
        else:
            courant["lignes"].append(ligne)
    clore()
    return resultat


COUT_DON = re.compile(r"dépense\s+(\d+\s+points?\s+de\s+(?:Rage|Gnose|Volonté))", re.I)


def lire_dons(texte: str, groupe: str) -> list:
    """Note « Dons - Groupe » (W20) : « ## Niveau N », puis « ### Nom », description, « **Système** : … »,
    éventuellement « Aussi chez : … ». Le coût est repris du système (« dépense 1 point de Rage »)."""
    resultat, niveau, courant = [], None, None

    def clore():
        if courant:
            m = COUT_DON.search(" ".join(courant["lignes"]))
            resultat.append(pouvoir(courant["nom"], groupe, niveau, "W20", courant["lignes"],
                                    cout=m.group(1) if m else "", categorie="don"))

    for brut in texte.splitlines():
        ligne = brut.strip()
        n = re.match(r"^##\s+Niveau\s+(\d+)", ligne)
        if n:
            clore()
            courant, niveau = None, int(n.group(1))
            continue
        d = re.match(r"^###\s+(.*)$", ligne)
        if d and niveau is not None:
            clore()
            courant = {"nom": d.group(1), "lignes": []}
            continue
        if ligne.startswith("#"):
            clore()
            courant = None
            continue
        if courant and ligne:
            courant["lignes"].append(ligne)
    clore()
    return resultat


def main(sortie: str, *dossiers: str):
    tous, ignorees = [], []
    for note in sorted(n for d in dossiers for n in Path(d).glob("*.md")):
        if note.stem in ("Disciplines", "Dons"):   # index, sans pouvoir
            continue
        texte = note.read_text(encoding="utf-8")
        if note.stem == "Disciplines combinées":
            tous.extend(lire_combinees(texte))
            continue
        p = lire_dons(texte, note.stem[len("Dons - "):]) if note.stem.startswith("Dons - ") else lire_discipline(texte, note.stem)
        (tous.extend(p) if p else ignorees.append(note.stem))
    Path(sortie).parent.mkdir(parents=True, exist_ok=True)
    Path(sortie).write_text(json.dumps(tous, ensure_ascii=False, indent=1), encoding="utf-8")
    par_ed = {e: sum(1 for x in tous if x["system"]["edition"] == e) for e in ("V20", "V5", "W20")}
    groupes = len({x["system"]["groupe"] for x in tous})
    print(f"{len(tous)} pouvoirs ({par_ed}) dans {groupes} groupes → {sortie}")
    if ignorees:
        print(f"- notes sans pouvoir reconnu ({len(ignorees)}) : {', '.join(ignorees)}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], *sys.argv[2:])
