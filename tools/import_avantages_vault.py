"""
Import des atouts et handicaps (avantages et inconvénients) d'une vault Obsidian vers un fichier JSON
d'objets « avantage » (wod_homebrew).

Usage (Windows) :
    PYTHONUTF8=1 python tools/import_avantages_vault.py "<fichier JSON de sortie>" "<dossier Avantages et inconvénients>"

Lit chaque note (sous-dossiers compris) : sections « ## Avantages » (atouts), « ## Inconvénients » (handicaps),
« ## Avantage ou inconvénient selon le niveau » (selon le signe du premier coût) ; un élément par « ### Nom »,
avec « **Coût : X** · description ». Le groupe est le nom de la note. Glissé sur une fiche, un avantage ajoute
une ligne « nom + coût » à la liste Atouts ou Handicaps. Le fichier de sortie va dans le dossier Data de Foundry
(hors du système) ; il est importé avec tools/importer-compendium.js.
"""
import json
import re
import sys
from pathlib import Path

from import_pouvoirs_vault import nettoyer, paragraphes

COUT = re.compile(r"^\*\*Coût\s*:\s*(?P<cout>[^*]*)\*\*\s*(?:·\s*(?P<texte>.*))?$")


def valeur_cout(cout: str) -> int:
    """Premier nombre du coût, en valeur positive (0 si aucun)"""
    m = re.search(r"\d+", cout or "")
    return int(m.group(0)) if m else 0


def lire_avantages(texte: str, groupe: str) -> list:
    resultat, section, courant = [], None, None

    def clore():
        if courant:
            categorie = section
            if categorie == "selon":
                m = re.search(r"-?\d+", courant["cout"])
                categorie = "handicap" if (m and int(m.group(0)) < 0) else "atout"
            resultat.append({"name": nettoyer(courant["nom"]), "type": "avantage", "system": {
                "categorie": categorie, "groupe": groupe, "cout": courant["cout"],
                "description": paragraphes(courant["lignes"])}})

    for brut in texte.splitlines():
        ligne = brut.strip()
        s = re.match(r"^##\s+(.*)$", ligne)
        if s and not ligne.startswith("###"):
            clore()
            courant = None
            t = s.group(1)
            section = ("atout" if t.startswith("Avantages") else "handicap" if t.startswith("Inconvénients")
                       else "selon" if t.startswith("Avantage ou inconvénient") else None)
            continue
        d = re.match(r"^###\s+(.*)$", ligne)
        if d and section:
            clore()
            courant = {"nom": d.group(1), "cout": "", "lignes": []}
            continue
        if not courant or not ligne:
            continue
        c = COUT.match(ligne)
        if c and not courant["cout"]:
            courant["cout"] = c.group("cout").strip()
            if c.group("texte"):
                courant["lignes"].append(c.group("texte"))
        else:
            courant["lignes"].append(ligne)
    clore()
    return resultat


def main(sortie: str, dossier: str):
    tous = []
    for note in sorted(Path(dossier).rglob("*.md")):
        tous.extend(lire_avantages(note.read_text(encoding="utf-8"), note.stem))
    Path(sortie).parent.mkdir(parents=True, exist_ok=True)
    Path(sortie).write_text(json.dumps(tous, ensure_ascii=False, indent=1), encoding="utf-8")
    par = {c: sum(1 for x in tous if x["system"]["categorie"] == c) for c in ("atout", "handicap")}
    print(f"{len(tous)} atouts et handicaps ({par}) dans {len({x['system']['groupe'] for x in tous})} groupes → {sortie}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
