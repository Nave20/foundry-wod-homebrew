import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from import_pouvoirs_vault import lire_discipline  # noqa: E402

CLASSIQUE = """---
type: note
---

# Auspex

## Pouvoirs

### Généralités

- Remarque générale qui n'est pas un pouvoir.
  *Sources : Livre p1*

### Niveau 2

- **Sens surdéveloppés** (*Heightened senses*) : Effet de base.
  *Sources : X p93 ; Y p12*
- **Pulsions** (*Pulse*) : Omniscience [[Humanité|humaine]].
  1-ambiance humain
  2-futur <b>proche</b>
  *Sources : Z p74*

## Pouvoirs combinés

- [[Disciplines combinées#A|A]] : [[Auspex]] 1 + [[Dissimulation]] 1
"""

V5 = """# Célérité

## En V5

### Pouvoirs V5

| Niveau | Pouvoir | Effet | Coût | Dés | Durée | Amalgame |
|---|---|---|---|---|---|---|
| 3 | **Fulgurance** | Le vampire fonce. | un test d'Exaltation | Dextérité + Athlétisme | un tour | — |
| 1 | **Grâce féline** | Adresse. | gratuit | — | passif | — |

Texte complet : ailleurs.
"""


class TestLireDiscipline(unittest.TestCase):
    def test_pouvoir_classique(self):
        p = lire_discipline(CLASSIQUE, "Auspex")
        self.assertEqual(len(p), 2)
        s = p[0]["system"]
        self.assertEqual(p[0]["name"], "Sens surdéveloppés")
        self.assertEqual(p[0]["type"], "pouvoir")
        self.assertEqual((s["categorie"], s["groupe"], s["niveau"], s["edition"]), ("discipline", "Auspex", 2, "V20"))
        self.assertEqual(s["nomAnglais"], "Heightened senses")
        self.assertEqual(s["sources"], "X p93 ; Y p12")
        self.assertIn("Effet de base.", s["description"])

    def test_lignes_de_suite_et_nettoyage(self):
        s = lire_discipline(CLASSIQUE, "Auspex")[1]["system"]
        self.assertIn("humaine", s["description"])
        self.assertNotIn("[[", s["description"])
        self.assertIn("1-ambiance humain", s["description"])
        self.assertIn("&lt;b&gt;proche&lt;/b&gt;", s["description"])
        self.assertEqual(s["sources"], "Z p74")

    def test_tableau_v5(self):
        p = lire_discipline(V5, "Célérité")
        self.assertEqual([x["name"] for x in p], ["Fulgurance", "Grâce féline"])
        s = p[0]["system"]
        self.assertEqual((s["edition"], s["niveau"], s["groupe"]), ("V5", 3, "Célérité"))
        self.assertEqual(s["cout"], "un test d'Exaltation")
        self.assertEqual(s["jet"], "Dextérité + Athlétisme")
        self.assertIn("un tour", s["description"])
        self.assertEqual(p[1]["system"]["jet"], "")

    def test_note_sans_pouvoir(self):
        self.assertEqual(lire_discipline("# Rien\n\nDu texte.\n", "Rien"), [])

SANS_NOM = """### Niveau 1

- Permet de voir dans le monde des esprits.
  *Sources : Chicago p146*
- Variante : voir plus loin.
  *Sources : Autre p2*
"""

FORMULES = """### Formules V5

| Niveau | Formule | Effet | Ingrédients | Coût d'activation | Durée |
|---|---|---|---|---|---|
| 1 | **Brouillard** | Une zone brumeuse. | la vitae | un test d'Exaltation | une scène |
"""


class TestFormatsParticuliers(unittest.TestCase):
    def test_niveau_sans_nom(self):
        p = lire_discipline(SANS_NOM, "Tellurian")
        self.assertEqual(len(p), 1)
        self.assertEqual(p[0]["name"], "Tellurian 1")
        self.assertIn("monde des esprits", p[0]["system"]["description"])
        self.assertIn("Variante", p[0]["system"]["description"])
        self.assertEqual(p[0]["system"]["sources"], "Chicago p146 ; Autre p2")

    def test_formules_v5(self):
        p = lire_discipline(FORMULES, "Alchimie du sang clair")
        s = p[0]["system"]
        self.assertEqual((p[0]["name"], s["edition"], s["niveau"], s["cout"]), ("Brouillard", "V5", 1, "un test d'Exaltation"))
        self.assertIn("Ingrédients : la vitae", s["description"])
        self.assertIn("Durée : une scène", s["description"])


if __name__ == "__main__":
    unittest.main()
