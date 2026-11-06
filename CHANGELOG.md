# Journal des modifications

Une entrée par session de travail. Chaque entrée indique le build de Foundry sur lequel la version a été vérifiée.

## 0.2.0 — 2026-11-06 · Session 2 : mise en page de la fiche, traits de la chronique, accueil

Vérifié sur **Foundry VTT 14.369**.

### Fiche de personnage
- **Points cliquables** (●●●○○) pour les attributs, capacités, historiques, atouts, handicaps, disciplines, dons, vertus, sphères, Volonté, Rage, Gnose, Renommée, Voie et Arété. Cliquer sur le dernier point rempli l'enlève. Les points sont groupés par 5, et leur nombre suit l'échelle de la fiche.
- **Couleur par créature** : Vampire en rouge, Mage en bleu, Garou en vert foncé.
- **En-tête compacte** : portrait, nom et 4 champs clés selon la créature (par exemple Tradition, Essence, Nature et Attitude pour un mage). Les réglages de la fiche s'ouvrent sous le portrait. Les autres champs d'identité sont dans la section **Identité** de l'onglet Biographie.
- **Capacités secondaires dans leur colonne** : un bouton « + » sur chaque colonne (Talents, Compétences, Connaissances). Une fois saisi, le nom devient un libellé normal ; un double-clic le renomme, et un nom vide retire la ligne.
- **Spécialités** pour chaque attribut et capacité, sans minimum de points : icône ✎ au survol, affichage « Mêlée · *Épées* ».
- **Listes préfaites** dans un menu de suggestions personnalisé, qui filtre pendant la frappe, se pilote au clavier et regroupe par catégorie :
  - historiques, atouts et handicaps selon la créature, avec leur coût (repris dans la valeur s'il est à 0) ;
  - nature, attitude, clan, secte, race, auspice, tribu, tradition et essence.
- Interligne des traits resserré ; libellé « Tradition » raccourci.

### Pour le MJ
- **Panneau du MJ** : point d'entrée unique vers les réglages du système. Il s'ouvre par l'engrenage de la barre d'outils de gauche (même sans scène active) ou par le bouton de l'onglet Paramètres.
- **Traits de la chronique** : renommer les attributs (par exemple Apparence → Sang-froid), et par jeu renommer, masquer ou ajouter des capacités de base. Les clés internes ne changent pas, donc les futurs jets de dés restent valides. Une capacité ajoutée a ses propres points, sa spécialité et sa donnée de jet (`@pilotage`…).

### Accueil
- **Scène « Accueil »** créée et activée au premier lancement d'un monde vide. Son image 4K, tirée du pack gratuit Dark Pack, porte un titre doré, la mention légale et le lien du dépôt.
- La même image sert de fond quand aucune scène n'est active, et de bannière du système sur l'écran de connexion.

### Données
- Nouveaux champs : `specialites`, `capacites_ajoutees`, `categorie` et `specialite` des capacités secondaires. Les fiches existantes sont compatibles : les capacités secondaires déjà saisies se rangent dans Talents.

### Vérifications
- Vérification statique (`check_system.py`) : 0 erreur, 0 avertissement.
- Test dans Foundry 14.369, après redémarrage : 16/16 étapes. Création et affichage des 5 types, couleurs, clic sur les points (monter et descendre), capacité secondaire avec spécialité, spécialité d'attribut, suggestions de clan, renommage Sang-froid, fiche d'objet, Panneau du MJ et Traits de la chronique, scène d'accueil 3840×2160. Aucune erreur ni aucun avertissement d'obsolescence dans la console.

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
