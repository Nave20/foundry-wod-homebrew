# Pouvoirs : suivi sur la fiche, compendium de référence, jets de sphères — conception

Validée en conversation le 09/11/2026.

## Intention

Garder la trace des pouvoirs de chaque personnage et pouvoir les relire en jeu, sans alourdir la partie. Les joueurs connaissent leurs pouvoirs, les annoncent et dépensent eux-mêmes ce qu'il faut (sang, gnose, rage, Volonté, quintessence : déjà possible sur la fiche).

**Non-objectifs** : pas de bouton « Utiliser », pas de message automatique dans le chat, pas de dépense automatique, pas de jet propre aux pouvoirs, pas d'automatisation de la magie (difficulté décidée par le MJ).

**Anti-objectif** : une fiche ou une session plus lourdes qu'aujourd'hui.

## 1. Objet « Pouvoir »

Nouveau type d'objet `pouvoir` :

| Champ | Usage |
|---|---|
| `categorie` | discipline (pouvoir de discipline), don, rite, autre |
| `groupe` | discipline ou famille du pouvoir (« Auspex », « Rite d'accord »…), texte |
| `niveau` | niveau ou rang (0 à 10) |
| `edition` | V20 (éditions classiques), V5, autre — les deux éditions cohabitent |
| `cout` | coût indicatif, texte libre (« 1 point de sang », « un test d'Exaltation ») |
| `jet` | réserve indicative, texte libre (« Dextérité + Athlétisme ») |
| `description` | texte (HTML) |
| `nomAnglais`, `sources` | texte, facultatifs |

Fiche d'objet simple : ces champs et la description.

## 2. Sur la fiche du personnage

- Dans l'onglet **Avantages**, une liste **Pouvoirs** : les objets Pouvoir du personnage, groupés par `groupe` (par discipline pour un vampire), triés par niveau ; chaque ligne montre le niveau, le nom, l'édition en petit. Un clic ouvre la fiche de l'objet pour relire la description ; une corbeille le retire ; un bouton « + » en crée un vide.
- On ajoute un pouvoir en **glissant** un objet du compendium (ou d'un autre personnage) sur la fiche.
- Les listes « nom + points » actuelles (disciplines, dons, rites, fétiches) restent : elles portent le niveau des disciplines.
- Les objets Pouvoir n'apparaissent pas dans l'équipement (Biographie) ni dans l'onglet Combat.

## 3. Compendium de référence

- Script d'import (comme pour les armes) qui lit les notes `05 - Règles & Systèmes/Vampire/Disciplines` de la vault :
  - pouvoirs classiques : sections « Niveau N », lignes « **Nom** (*nom anglais*) : effet » + ligne de sources ; édition **V20** ;
  - pouvoirs V5 : tableau « Pouvoirs V5 » (niveau, nom, effet, coût, dés, durée) ; édition **V5**.
- Compendium du monde « Pouvoirs » (local, non publié), un dossier par discipline. Les pouvoirs combinés (« Disciplines combinées ») sont importés dans un dossier à part si leur note s'y prête, sinon laissés de côté (signalé).
- Dons et rites de garou : aucune source dans la vault ; le type d'objet les accepte (création à la main) et le compendium pourra les accueillir plus tard.

## 4. Mage : sphères et Arété cliquables

- Les sphères et l'Arété deviennent sélectionnables dans la barre de jet, comme les attributs et capacités : sphère + Arété, ou Arété seule.
- Difficulté de départ : celle des règles des jets (6) ; le MJ l'ajuste avec la roue (préparation, complexité) ; la dépense de quintessence (−1 diff. par point) reste disponible.
- Rien d'automatique sur coïncident / vulgaire ni sur le paradoxe.

## Laissé au constructeur

Mise en forme exacte de la liste, icônes par catégorie, gestion des doublons à l'import (même nom et même niveau), nettoyage du texte (liens Obsidian, retours à la ligne).
