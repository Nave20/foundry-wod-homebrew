import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from import_avantages_vault import lire_avantages, valeur_cout  # noqa: E402

NOTE = """# Généraux - Physiques

Intro.

## Avantages (2)

### Ambidextre

**Coût : 1**

### Propriétés

**Coût : 1 à 5** · Autant de foyers [[Sécurité|sécurisés]].
Deuxième ligne.

## Inconvénients (1)

### Pourchassé

**Coût : -1 à -3** · Une personne vous pourchasse.

## Avantage ou inconvénient selon le niveau (1)

### De la Race

**Coût : 4/-4/2/-2** · Famille d'un Garou.

## Sous-catégories

- [[Autre]]
"""


class TestAvantages(unittest.TestCase):
    def test_lecture(self):
        a = lire_avantages(NOTE, "Généraux - Physiques")
        self.assertEqual([x["name"] for x in a], ["Ambidextre", "Propriétés", "Pourchassé", "De la Race"])
        self.assertEqual(a[0]["type"], "avantage")
        s = a[1]["system"]
        self.assertEqual((s["categorie"], s["groupe"], s["cout"]), ("atout", "Généraux - Physiques", "1 à 5"))
        self.assertIn("sécurisés", s["description"])
        self.assertIn("Deuxième ligne.", s["description"])
        self.assertEqual(a[2]["system"]["categorie"], "handicap")
        self.assertEqual(a[3]["system"]["categorie"], "atout")
        self.assertEqual(a[0]["system"]["description"], "")

    def test_valeur_cout(self):
        self.assertEqual(valeur_cout("1 à 5"), 1)
        self.assertEqual(valeur_cout("-1 à -3"), 1)
        self.assertEqual(valeur_cout("+/- 3/5/8"), 3)
        self.assertEqual(valeur_cout("variable"), 0)


if __name__ == "__main__":
    unittest.main()
