"""
Import des armes et armures d'une vault Obsidian vers un fichier JSON d'objets Foundry (wod_homebrew).

Usage (Windows) :
    PYTHONUTF8=1 python tools/import_objets_vault.py "<dossier 08 - Objets de la vault>" "<dossier de sortie>"

Le dossier de sortie reçoit objets.json et un sous-dossier images/ (copie des images des fiches).
Il doit se trouver dans le dossier Data de Foundry (par exemple Data/wod-homebrew-objets), en dehors
du système : les objets et leurs images ne sont pas publiés avec le système.
Ensuite, dans Foundry (MJ), lancer tools/importer-compendium.js pour remplir le compendium du monde.

Correspondances (identiques à module/combat-regles.mjs → deduireArme) :
tir / tir lourd → Armes à feu ; mêlée → Mêlée + Force ; corps à corps → Bagarre + Force ; lancer → Athlétisme ;
arc et arbalète → Tir à l'arc ; tir lourd → exige la spécialité « armes lourdes ».
"""
import html
import json
import re
import shutil
import sys
from pathlib import Path

# Objets rangés dans Armes qui sont des artefacts (effets, pas une arme)
ARTEFACTS = {
    "Auto-collant porte au loin", "Bague o-ku", "Bonbon langue de feu", "Chevalière de protection",
    "Chevalière du bannissement", "Eléxir de clarté", "Emblème marché gris", "Fairness", "Fourreau",
    "Oeil d'Erlik", "Oracle Primo Grade", "Parure de la lune", "Peau intelligente", "Spray charismatique",
}
TYPES = {"létal": "letal", "letal": "letal", "contondant": "contondant", "aggravé": "aggrave", "aggrave": "aggrave"}
ICONES = {"arme": "icons/svg/sword.svg", "armure": "icons/svg/shield.svg", "artefact": "icons/svg/aura.svg"}


def lire_note(chemin: Path):
    """Propriétés YAML simples (clé: valeur) et corps de la note"""
    texte = chemin.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", texte, re.S)
    if not m:
        return {}, texte
    props = {}
    for ligne in m.group(1).splitlines():
        mm = re.match(r"^([a-z_]+):\s*(.*)$", ligne)
        if mm:
            props[mm.group(1)] = mm.group(2).strip().strip('"')
    return props, m.group(2)


def deduire_arme(mode: str, nom: str):
    mode = (mode or "").lower().strip()
    arme = {"attribut": "dexterite", "competence": "", "force": False, "requis": ""}
    if mode.startswith("tir"):
        arme["competence"] = "armes_a_feu"
        if re.search(r"\b(arc|arbal[eè]te)\b", nom, re.I):
            arme.update(competence="tir_a_l_arc", requis="Tir à l'arc")
        elif mode == "tir lourd":
            arme["requis"] = "Armes à feu (armes lourdes)"
    elif mode in ("mêlée", "melee"):
        arme.update(competence="melee", force=True)
    elif mode == "corps à corps":
        arme.update(competence="bagarre", force=True)
    elif mode == "lancer":
        arme["competence"] = "athletisme"
    return arme


def corps_html(corps: str) -> str:
    """Corps de la note → paragraphes HTML (sans les images intégrées)"""
    lignes = []
    for ligne in corps.splitlines():
        ligne = ligne.strip()
        if not ligne or ligne.startswith("![["):
            continue
        ligne = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", ligne)
        ligne = re.sub(r"\[\[([^\]]+)\]\]", r"\1", ligne)
        lignes.append(f"<p>{html.escape(ligne)}</p>")
    return "\n".join(lignes)


def degats_du_texte(corps: str):
    """« 12 dés de dégâts », « 20 dégâts », « (8 dés dégâts) » → (nombre, plage ?) ; « 12-16 » → 16 (borne haute)"""
    m = re.search(r"(\d+)(?:\s*-\s*(\d+))?\s*(?:dés\s*)?(?:de\s*)?d[ée]g[âa]ts", corps, re.I)
    if not m:
        return 0, False
    return int(m.group(2) or m.group(1)), bool(m.group(2))


def trouver_image(props, vault: Path, index):
    m = re.search(r"\[\[([^\]|]+)", props.get("image", ""))
    return index.get(m.group(1).strip().lower()) if m else None


def main(dossier_objets: str, sortie: str):
    objets = Path(dossier_objets)
    vault = objets
    while vault.parent != vault and not (vault / ".obsidian").exists():
        vault = vault.parent
    index = {p.name.lower(): p for p in vault.rglob("*") if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp", ".gif")}
    out = Path(sortie)
    (out / "images").mkdir(parents=True, exist_ok=True)
    prefixe = out.name   # chemin relatif au dossier Data de Foundry

    resultat, rapport = [], {"dégâts tirés du texte": [], "dégâts infinis": [], "artefacts": [], "sans dégâts": [], "sans image": []}
    for categorie_vault, dossier in (("Armes", objets / "Armes"), ("Armures", objets / "Armures")):
        for note in sorted(dossier.glob("*.md")):
            props, corps = lire_note(note)
            if props.get("type") != "objet":
                continue
            nom = note.stem
            system = {"description": corps_html(corps), "quantite": 1}
            if categorie_vault == "Armures":
                categorie = "armure"
                system.update(armure=int(props.get("armure") or 0), malus=0, equipe=False)
            else:
                categorie = "artefact" if nom in ARTEFACTS else "arme"
                degats = int(props.get("degats") or 0)
                infini = bool(re.search(r"vraiment\s*\?", corps, re.I))
                if degats == 0 and not infini and categorie == "arme":
                    degats, plage = degats_du_texte(corps)
                    if degats:
                        rapport["dégâts tirés du texte"].append(f"{nom} : {degats}" + (" (borne haute d'une plage)" if plage else ""))
                if infini:
                    rapport["dégâts infinis"].append(nom)
                arme = deduire_arme(props.get("mode_attaque", ""), nom)
                system.update(degats=degats, infini=infini, type_degats=TYPES.get(props.get("type_degats", "").lower(), "letal"),
                              portee=props.get("portee", ""), **arme)
                if categorie == "artefact":
                    rapport["artefacts"].append(nom)
                elif degats == 0 and not infini and not arme["force"]:
                    rapport["sans dégâts"].append(nom)
            system["categorie"] = categorie
            image = trouver_image(props, vault, index)
            if image:
                shutil.copy2(image, out / "images" / image.name)
                img = f"{prefixe}/images/{image.name}"
            else:
                img = ICONES[categorie]
                rapport["sans image"].append(nom)
            resultat.append({"name": nom, "type": "objet", "img": img, "system": system})

    (out / "objets.json").write_text(json.dumps(resultat, ensure_ascii=False, indent=1), encoding="utf-8")
    compte = {c: sum(1 for o in resultat if o["system"]["categorie"] == c) for c in ("arme", "armure", "artefact")}
    print(f"{len(resultat)} objets → {out / 'objets.json'} ({compte})")
    for titre, noms in rapport.items():
        if noms:
            print(f"- {titre} ({len(noms)}) : {', '.join(noms)}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
