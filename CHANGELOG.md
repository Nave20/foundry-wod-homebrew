# Journal des modifications

Une entrée par session de travail. Chaque entrée indique le build de Foundry sur lequel la version a été vérifiée.

## 0.1.0 — 2026-10-15 · Session 1 : modèle de données et fiche simple

Vérifié sur **Foundry VTT 14.369**.

### Ajouts
- Système V14 `wod_homebrew` : `documentTypes`, `TypeDataModel` et fiches ApplicationV2 + Handlebars.
- **5 types d'acteur** : Mortel, Vampire, Goule, Garou, Mage.
  - Base commune : identité (concept, nature, attitude, chronique, joueur, rôle PJ/PNJ, statut), 9 attributs, capacités, capacités secondaires, historiques, atouts, handicaps, volonté, santé, biographie (historique, apparence, relations, notes du MJ).
  - Vampire et Goule : clan ou domitor, génération, sire, secte, refuge, disciplines, vertus, voie, réserve de sang.
  - Garou : race, auspice, tribu, meute, totem, rang, dons, rites, fétiches, rage, gnose, renommée (gloire, honneur, sagesse).
  - Mage : tradition, essence, cabale, paradigme, pratique, instruments, 9 sphères, arété, quintessence, paradoxe.
- **Champ « jeu »** par fiche (V20, Dark Ages V20, W20, M20) : il choisit la liste de capacités affichée. Toutes les valeurs restent stockées.
- **Santé calculée** : liste des niveaux, niveau actuel et malus, y compris au-delà de 7 niveaux.
- Type d'objet `objet` (arme, armure, divers) : dégâts, type de dégâts, portée, protection, malus.
- Fiche à 4 onglets (Traits, Avantages, État, Biographie), avec des listes éditables (ajouter / retirer) et l'équipement.
- Notes du MJ : invisibles et non modifiables pour les joueurs.
- Données de jet : `@force`, `@vigilance`, `@volonte`… Initiative : `1d10 + @dexterite + @astuce`.
- Interface entièrement en français, affichée même si Foundry est en anglais.

### Vérifications
- Vérification statique (`check_system.py`) : 0 erreur, 0 avertissement.
- Test dans Foundry 14.369 : 21/21 étapes. Création des 5 types, affichage des fiches, modification d'un champ, ajout et retrait de lignes de liste, changement de jeu, santé calculée, initiative, fiche d'objet. Aucune erreur ni aucun avertissement d'obsolescence dans la console.
