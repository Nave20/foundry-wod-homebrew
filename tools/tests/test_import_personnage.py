import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from import_personnage_vault import (  # noqa: E402
    lire_front_matter, lire_trait, lire_pouvoirs, lire_tableau, markdown_html, lire_note)

NOTE = """---
type: personnage
creature: vampire
joueur: "Victor"
generation: 9
secte: ""
force: 3
capacites_secondaires:
  - "Art 2"
  - "Spécialité bagarre (boxe) 4"
  - "Linguistique (français, anglais) 4"
handicaps:
  - "Sélectivité"
tags:
  - personnage
---

```dataviewjs
await dv.view("Ressources/Scripts/fiche")
```

## Pouvoirs et rituels

- Domination : Contrainte (1), Hypnose (2), Altération mémorielle (3). Jet : Manipulation + Domination, contre Intelligence.
- Puissance : Bond surhumain (1 : Puissance × 5 m, × 3 m), Corps létal (1). Célérité : Rapidité, Fulgurance.

### Rituels

| Rituel | Niveau | Effet |
|---|---|---|
| Rite d'introduction (Trémère) | 1 | Contacter le régent. |

## Historique

Propriétaire du **club** de [[Succubus Club|Eclipse]].

## Équipement

| Objet | Type | Effet | Description |
|---|---|---|---|
| Beretta | Arme | 4 dégâts. | Classique. |
"""


class TestPersonnage(unittest.TestCase):
    def test_front_matter(self):
        fm = lire_front_matter(NOTE)
        self.assertEqual(fm["creature"], "vampire")
        self.assertEqual(fm["joueur"], "Victor")
        self.assertEqual(fm["generation"], 9)
        self.assertEqual(fm["secte"], "")
        self.assertEqual(fm["capacites_secondaires"][1], "Spécialité bagarre (boxe) 4")
        self.assertEqual(fm["handicaps"], ["Sélectivité"])

    def test_trait(self):
        self.assertEqual(lire_trait("Art 2"), {"nom": "Art", "detail": "", "valeur": 2, "specialite_de": None})
        self.assertEqual(lire_trait("Spécialité bagarre (boxe) 4"),
                         {"nom": "bagarre", "detail": "boxe", "valeur": 4, "specialite_de": "bagarre"})
        self.assertEqual(lire_trait("Contacts (baron, général) 3")["detail"], "baron, général")
        self.assertEqual(lire_trait("Sélectivité")["valeur"], 0)
        self.assertEqual(lire_trait("Lien de sang (Helena) 2")["nom"], "Lien de sang")

    def test_pouvoirs(self):
        texte = NOTE.split("## Pouvoirs et rituels")[1].split("###")[0]
        p = lire_pouvoirs(texte)
        self.assertEqual([(x["groupe"], x["nom"], x["niveau"]) for x in p][:3],
                         [("Domination", "Contrainte", 1), ("Domination", "Hypnose", 2),
                          ("Domination", "Altération mémorielle", 3)])
        self.assertIn(("Puissance", "Bond surhumain", 1), [(x["groupe"], x["nom"], x["niveau"]) for x in p])
        self.assertIn("Puissance × 5 m", next(x for x in p if x["nom"] == "Bond surhumain")["effet"])
        self.assertIn(("Célérité", "Fulgurance", 0), [(x["groupe"], x["nom"], x["niveau"]) for x in p])
        self.assertNotIn("Jet", [x["groupe"] for x in p])
        self.assertEqual(len(p), 7)

    def test_pouvoirs_en_phrases(self):
        texte = ("- **Auspex 2** : il voit la douleur dans l'aura des mourants.\n"
                 "- Escrimeur d'exception : ses lames, forgées selon l'art de Tolède, sont des œuvres d'art.\n"
                 "- Thaumaturgie : voie du sang (Goût du sang, Éteindre la vitae), voie de l'éclair.\n"
                 "- Occultation : Manteau d'ombre, Silence de la mort.")
        self.assertEqual([x["nom"] for x in lire_pouvoirs(texte)], ["Manteau d'ombre", "Silence de la mort"])

    def test_liste_vide(self):
        self.assertEqual(lire_front_matter("---\natouts: []\n---\n")["atouts"], [])

    def test_tableau(self):
        lignes = lire_tableau(NOTE.split("## Équipement")[1])
        self.assertEqual(lignes, [{"Objet": "Beretta", "Type": "Arme", "Effet": "4 dégâts.", "Description": "Classique."}])

    def test_markdown_html(self):
        h = markdown_html("Un **club** de [[Succubus Club|Eclipse]].\n\n- a\n- b\n\n| A | B |\n|---|---|\n| 1 | 2 |")
        self.assertIn("<p>Un <strong>club</strong> de Eclipse.</p>", h)
        self.assertIn("<ul><li>a</li><li>b</li></ul>", h)
        self.assertIn("<td>1</td>", h)

    def test_note(self):
        n = lire_note(NOTE, "Valentine Nash")
        self.assertEqual(n["nom"], "Valentine Nash")
        self.assertEqual(n["creature"], "vampire")
        self.assertIn("Historique", n["sections"])
        self.assertEqual(n["rituels"][0]["Niveau"], "1")
        self.assertEqual(n["equipement"][0]["Objet"], "Beretta")
        self.assertEqual(n["pouvoirs"][0]["nom"], "Contrainte")
        self.assertEqual(n["traits"]["capacites_secondaires"][2]["detail"], "français, anglais")
        self.assertNotIn("tags", n["traits"])


if __name__ == "__main__":
    unittest.main()
