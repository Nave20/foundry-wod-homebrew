import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from import_pouvoirs_vault import lire_combinees, lire_discipline, lire_dons  # noqa: E402

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

    def test_rituels_v5(self):
        p = lire_discipline(RITUELS, "Sorcellerie du sang")
        self.assertEqual(len(p), 2)
        s = p[1]["system"]
        self.assertEqual((p[1]["name"], s["categorie"], s["edition"], s["niveau"], s["groupe"]),
                         ("Pierre de sang", "rite", "V5", 1, "Sorcellerie du sang"))
        self.assertIn("Ingrédients : un aimant", s["description"])
        self.assertIn("Système : jet de Rituel", s["description"])


RITUELS = """### Rituels V5

| Niveau | Rituel | Effet | Ingrédients | Système |
|---|---|---|---|---|
| 1 | **Chemin du sang** | Étend Goût du sang. | une coupe d'argent | jet de Rituel |
| 1 | **Pierre de sang** | Une balise magique. | un aimant | jet de Rituel à la troisième nuit |
"""

COMBINEES = """# Disciplines combinées

Intro.

## Acier Noir

**Prérequis** : [[Obténébration]] 3 + [[Puissance]] 3

Manipulation+Occultisme SR 7, 2 Sang.

Deuxième paragraphe.

*Source : Libellus Sanguinis I (2807) p33*

## Ami distant

**Prérequis** : [[Auspex]] 2 ou [[Présence]] 4

Effet.
"""


class TestCombinees(unittest.TestCase):
    def test_pouvoirs_combines(self):
        p = lire_combinees(COMBINEES)
        self.assertEqual([x["name"] for x in p], ["Acier Noir", "Ami distant"])
        s = p[0]["system"]
        self.assertEqual((s["groupe"], s["niveau"], s["edition"]), ("Disciplines combinées", 3, "V20"))
        self.assertIn("Prérequis : Obténébration 3 + Puissance 3", s["description"])
        self.assertIn("Deuxième paragraphe.", s["description"])
        self.assertEqual(s["sources"], "Libellus Sanguinis I (2807) p33")
        self.assertEqual(p[1]["system"]["niveau"], 4)

DONS = """# Dons - Ahroun

Index : [[Dons]] · auspice

Texte d'introduction.

## Niveau 1

### Dards

Description du don.

**Système** : le personnage dépense 1 point de Rage. La cible subit +2 diff.

### Griffes acérées

Autre description.

**Système** : le joueur dépense 2 points de Gnose et l'Ahroun aiguise ses griffes.

Aussi chez : [[Dons - Fils de Fenris|Fils de Fenris]]

## Niveau 2

### Vraie peur

**Système** : le joueur fait un jet de Force + Intimidation.
"""


class TestDons(unittest.TestCase):
    def test_dons(self):
        p = lire_dons(DONS, "Ahroun")
        self.assertEqual([x["name"] for x in p], ["Dards", "Griffes acérées", "Vraie peur"])
        s = p[0]["system"]
        self.assertEqual((s["categorie"], s["groupe"], s["niveau"], s["edition"]), ("don", "Ahroun", 1, "W20"))
        self.assertIn("Description du don.", s["description"])
        self.assertIn("Système : le personnage dépense 1 point de Rage.", s["description"])
        self.assertEqual(s["cout"], "1 point de Rage")
        self.assertEqual(p[1]["system"]["cout"], "2 points de Gnose")
        self.assertIn("Aussi chez : Fils de Fenris", p[1]["system"]["description"])
        self.assertEqual((p[2]["system"]["niveau"], p[2]["system"]["cout"]), (2, ""))
        self.assertNotIn("introduction", " ".join(x["system"]["description"] for x in p))


if __name__ == "__main__":
    unittest.main()
