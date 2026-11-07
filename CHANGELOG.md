# Journal des modifications

Une entrée par session de travail. Chaque entrée indique le build de Foundry sur lequel la version a été vérifiée.

## 0.4.0 — 2026-11-07 · Session 4 : ressources, jets étendus, santé et Volonté

Vérifié sur **Foundry VTT 14.369**.

### Jets de dés
- **Ressources dépensées depuis la barre de jet**, retirées de la fiche au lancer :
  - **Volonté** (tous) : +1 réussite si au moins un dé est réussi, même si des 1 ramènent le total à 0 ;
  - **sang** (vampires) : +1 dé et −1 difficulté, 1 point par jet ;
  - **quintessence** (mages) : −1 difficulté par point, 3 points maximum par jet.
- **Quintessence maximale = Avatar + Prime** : calculée sur la fiche (« x / max »), et non dépassable.
- **Jets étendus** : bouton « Étendre (+1 diff.) » sur la carte de résultat, réservé au propriétaire du personnage et au MJ. Il relance la même réserve à difficulté +1 par extension, avec le total cumulé, sans redépenser les ressources.
- **Attribut seul** : confirmé (cliquer seulement sur l'attribut).
- Règles des jets : sections Ressources, Blessures et Jets étendus ; toutes les valeurs sont réglables par le MJ.

### Santé et Volonté
- **Cases de santé cliquables** : vide → / contondant → X létal → ✱ aggravé → vide. Les blessures les plus graves sont en haut.
- **Malus de blessure** appliqué aux jets en dés retirés, avec une case décochable dans la barre de jet. Si le personnage est neutralisé, la barre affiche un avertissement.
- **Volonté permanente dans l'en-tête** de la fiche, avec les points temporaires (⚡ x / y). Un clic prépare un **jet de Volonté**, seul et sans malus de blessure par défaut.

### Vérifications
- Vérification statique (`check_system.py`) : 0 erreur, 0 avertissement.
- Test dans Foundry 14.369, après redémarrage : 13/13 étapes.
  - Fiches des 5 types (Volonté en en-tête, cases de santé).
  - Blessure par clic (Blessé, −1).
  - Jet Force + Bagarre avec malus, sang et Volonté : 5d10 diff. 5, ressources débitées.
  - Extension (diff. +1, total cumulé), jet de Volonté sans malus.
  - Quintessence plafonnée à Avatar + Prime, fenêtre Règles des jets.
  - Aucune erreur ni aucun avertissement d'obsolescence.
- Tests précédents de la session : Volonté avec dés imposés (7 et 1 → 1 réussite ; 4 et 1 → sans effet), sang, quintessence (plafond à 3 par jet), deux extensions successives.

## 0.3.0 — 2026-11-06 · Session 3 : profils de traits et jets de dés

Vérifié sur **Foundry VTT 14.369**.

### Profils de traits
- La fenêtre **Traits de la chronique** reçoit une barre **Profil**. On y choisit un profil, ce qui charge sa configuration ; on peut aussi **enregistrer** la configuration actuelle comme profil du monde (même nom = mise à jour), en **supprimer** un, l'**exporter** ou l'**importer** en `.json`.
- **Profils du système**, disponibles dans tous les mondes :
  - **Livres (20e anniversaire)** ;
  - **Homebrew** : Sang-froid à la place d'Apparence, Esquive en talent, capacités propres à chaque créature (Vampire et Goule, Mage, Garou). Le Mortel garde les capacités des livres.
- Option **Trier les capacités par ordre alphabétique**.
- Un profil peut ajouter à un jeu une capacité de base d'un autre jeu (par exemple Art ou Méditation pour V20). Elle garde alors sa clé et ses points.
- Exception par créature (`livresPour`) : la créature garde les capacités des livres, quel que soit le profil.

### Jets de dés
- **Composer un jet** : cliquer sur le nom d'un attribut puis d'une capacité (un de chaque). Une barre affiche la réserve et la difficulté.
- **Roue ⚙** pour ajouter ou retirer des dés et ajuster la difficulté du jet. Case **Spécialité**, visible si l'un des traits en a une et cochée par défaut.
- **Carte de résultat** dans le chat : dés en couleur, total de réussites, détail des modificateurs. Réussite critique, échec et échec critique.
- **Règles des jets**, nouvelle entrée du Panneau du MJ, avec ces réglages par défaut :
  - d10, difficulté 6 ;
  - un 10 compte pour deux réussites, un 1 en retire une ;
  - réussite critique à partir de 5 réussites ;
  - capacité à 0 : difficulté +2 ;
  - spécialité : +1 dé et −1 de difficulté.

### Vérifications
- Vérification statique (`check_system.py`) : 0 erreur, 0 avertissement.
- Test dans Foundry 14.369, après redémarrage : 15/15 étapes.
  - Fiches des 5 types, avec les points et les noms cliquables.
  - Jet avec spécialité (6d10, diff. 5), roue ⚙ (+1 dé), lancer et carte de résultat, capacité à 0 (diff. 8).
  - Panneau du MJ avec ses 2 entrées, profils disponibles, scène d'accueil.
  - Aucune erreur ni aucun avertissement d'obsolescence dans la console.
- Tests précédents de la session : enregistrement, chargement, suppression, export et import de profils ; comptage des réussites sur des dés connus (10, 10, 5 → 4 ; 6, 7, 1 → 1 ; 1, 1, 3 → −2).

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
