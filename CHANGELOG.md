# Journal des modifications

Une entrée par session de travail. Chaque entrée indique le build de Foundry sur lequel la version a été vérifiée.

## 0.8.0 — 2026-11-12 · Session 8 : import des personnages de la vault

Vérifié sur **Foundry VTT 14.369**.

### Import de personnages
- Outil en deux temps : `tools/import_personnage_vault.py` lit des notes de personnage Obsidian (propriétés, sections en HTML, pouvoirs, rituels, équipement, portrait et jeton copiés dans `Data/wod-homebrew-portraits`) ; `tools/importer-personnage.js` crée les acteurs dans la console du MJ.
- Les traits sont reconnus par leur clé ou leur nom affiché (Traits de la chronique) : Sang-froid, capacités ajoutées (Esquive, Sanguinis…), spécialités « Spécialité X (y) » ou « Trait : spécialité », capacités d'un autre jeu rangées en capacités secondaires dans leur colonne d'origine.
- Pouvoirs, rituels et objets pris dans les compendiums du monde quand le nom correspond (accents, casse et pluriels ignorés ; pouvoirs combinés) ; sinon créés depuis la note. Les descriptions en phrases ne deviennent pas des pouvoirs.
- Armes : Bagarre et contondant pour « Force + N », Armes à feu et létal pour des dégâts fixes ; une protection importée est portée.
- Import en masse : dossiers de la vault recréés sous un dossier racine, un réimport remplace l'acteur de la même note, créatures sans fiche ignorées, rapport regroupé par type de remarque.
- Rituels V5 de Sorcellerie du sang lus par `import_pouvoirs_vault.py` (catégorie « rite »).

### Fiche
- Nouvelle option **« Masquer les Vertus »** (Règles des jets → Vampires et goules), cochée par défaut.
- Le nom d'un trait reste lisible : la spécialité est coupée en premier (texte entier au survol).
- Capacités secondaires : les points restent alignés avec les autres lignes.
- Biographie : les textes s'affichent en entier (jusqu'à 28rem, puis défilement).
- Pouvoirs : l'édition « Autre » est traduite.

## 0.7.0 — 2026-11-09 · Session 7 : jets des joueurs et pouvoirs

Vérifié sur **Foundry VTT 14.369**.

### Combat : les joueurs lancent leurs dés
- Nouveau réglage **« Les joueurs lancent eux-mêmes défense, dégâts et encaissement »** (Panneau du MJ → Règles des jets → Combat), coché par défaut.
- Chaque étape de la carte de combat attend un clic sur **Lancer** : la défense et l'encaissement par le joueur de la cible, les dégâts par celui de l'attaquant. La réserve, la difficulté et le nom du lanceur s'affichent ; les dés sont lancés sur l'ordinateur de celui qui clique (bruit des dés, dés 3D si un module les affiche) et les faces apparaissent sur la carte.
- Le MJ peut lancer à la place de n'importe qui ; le crayon, le bonus secret et « Appliquer » restent à lui seul. Décoché, tout se lance automatiquement comme avant.
- Fenêtre des Règles des jets : hauteur bornée, liste défilante, boutons fixes en bas.

### Pouvoirs
- Nouveau type d'objet **Pouvoir** (discipline, don, rite, autre) : discipline ou famille, niveau, édition (V20, V5, autre), coût et jet indicatifs, description, nom anglais, sources. Aucune automatisation : il sert au suivi et à la relecture.
- Onglet **Avantages** : liste « Pouvoirs » groupée par discipline et triée par niveau ; clic pour relire, corbeille, bouton « + » ; on y glisse les pouvoirs du compendium.
- **Mage** : les sphères et l'Arété se sélectionnent dans la barre de jet (sphère + Arété, ou Arété seule) ; la difficulté se règle avec la roue.
- Outil d'import (`tools/import_pouvoirs_vault.py`) : lit les notes de disciplines d'une vault (pouvoirs classiques par niveau, tableaux V5, formules d'alchimie, disciplines combinées) et les notes de dons de loup-garou W20 (un don par titre sous chaque niveau, coût en Rage, Gnose ou Volonté repris du système) ; deux compendiums du monde, « Disciplines » et « Dons », sont remplis avec `tools/importer-compendium.js` (option `filtre`, un dossier par discipline ou par race, auspice et tribu). Ils ne sont pas publiés avec le système.
- La liste de la fiche s'intitule « Pouvoirs de disciplines » (vampire, goule), « Dons » (garou) ou « Pouvoirs ».

### Atouts et handicaps
- Nouveau type d'objet **Atout ou handicap** (catégorie, coût en texte, groupe, description), pour un compendium de référence.
- Glissé sur une fiche, il **ajoute une ligne « nom + coût »** à la liste Atouts ou Handicaps (premier nombre du coût, en positif) au lieu de devenir un objet.
- Outil d'import (`tools/import_avantages_vault.py`) : lit les notes d'avantages et inconvénients d'une vault (sections Avantages, Inconvénients, « selon le niveau ») ; compendium du monde « Atouts et handicaps », un dossier par note.
- Éditions des pouvoirs : V20, V5, W20, M20, autre.

### Vérifications
- Tests automatiques : Node 32 sur 32 (combat, jets des joueurs, formes) ; Python 10 sur 10 (import des pouvoirs, des dons, des atouts et handicaps).
- Relecture indépendante des pouvoirs : aucun défaut bloquant ; les pouvoirs combinés, d'abord ignorés, sont maintenant importés.
- Tests dans Foundry 14.369 : déroulement complet de la carte en mode joueurs (défense, dégâts, encaissement), droits par étape, mode automatique ; pouvoirs créés, glissés, groupés ; Sphère + Arété ; compendiums « Disciplines » (1 043 pouvoirs, 42 dossiers), « Dons » (420 dons, 21 dossiers) et « Atouts et handicaps » (601 éléments, 36 dossiers) ; atout et handicap déposés sur une fiche → lignes ajoutées.

## 0.6.0 — 2026-11-08 · Session 6 : armes, armures, combat et formes des garous

Vérifié sur **Foundry VTT 14.369**.

### Objets
- **Dégâts chiffrés** : dés de base de l'arme, case « Ajoute la Force » (armes de contact), case « Dégâts infinis » (au-delà de tout encaissement). Les anciens dégâts saisis en texte (« Force + 2 ») sont convertis automatiquement.
- **Attaque** : attribut (Dextérité par défaut), compétence (Bagarre, Mêlée, Arts martiaux, Armes à feu, Tir à l'arc, Athlétisme) et compétence ou spécialité exigée (affichée en alerte).
- **Protection** : dés d'encaissement, malus de Dextérité, case « Équipée ».
- Nouvelle catégorie **Artefact** : peut porter des champs d'arme et de protection.

### Fiche : onglet Combat
- Armes (et **Mains nues**, toujours disponibles) avec compétence, dégâts, portée et bouton **Attaquer** ; protections avec la case « Équipée » ; résumé de l'encaissement (Vigueur + armure) et du malus de Dextérité.
- « Attaquer » remplit la barre de jet habituelle (attribut + compétence, spécialité, dés et difficulté ajustables, Volonté…). Les protections équipées retirent leur malus aux jets de Dextérité.

### Carte de combat
- Une seule carte qui avance dans le chat : **attaque → défense (Esquive, Parade, Blocage ou Aucune) → dégâts → encaissement → santé**.
- Règles de la table : attaque − défense, la première réussite nette valide le coup et les suivantes deviennent des dés de dégâts ; dégâts = dés de l'arme (+ Force) + réussites restantes ; encaissement = Vigueur + protections équipées, contre tous les types ; un résultat négatif (échec critique) s'ajoute à l'adversaire. Difficulté 6, 5 avec une spécialité de Force (dégâts au contact) ou de Vigueur (encaissement).
- **Le MJ intervient à chaque moment** : réglage de dés et de difficulté avant la défense, crayon sur chaque ligne pour relancer avec des dés ou une difficulté corrigés ou saisir directement les réussites (la suite se recalcule), dégâts finaux modifiables. Rien ne touche la santé avant le clic sur « Appliquer ».
- Le joueur propriétaire de la cible choisit sa défense ; ses clics passent par le MJ connecté (socket du système). Les corrections ne sont visibles que du MJ.
- La carte s'arrête dès qu'il n'y a plus rien à jouer : une attaque à 0 réussite ou moins affiche « Raté » sans défense ; des dégâts à 0 ou moins ne déclenchent pas d'encaissement (une correction du MJ relance la suite).
- La barre de jet est désormais en bas de la fiche, hors des onglets : elle reste visible depuis l'onglet Combat (et pour un jet de Volonté lancé depuis n'importe quel onglet).

### Garous : formes
- Nouvel onglet **Forme** (fiches de garou seulement) : les cinq formes (Homidé, Glabro, Crinos, Hispo, Lupus) en silhouettes. La forme actuelle brille en vert néon ; un clic sur une autre forme l'affiche en vert pâle avec ses effets (« ancienne valeur → nouvelle valeur ») ; le bouton **Changer de forme** l'applique, avec un éclair lumineux.
- Les attributs suivent la forme partout (jets, attaque, dégâts, défense, encaissement). Les points de la fiche restent ceux de la forme humaine, avec la valeur de la forme affichée en vert à côté. La difficulté de Perception baisse en Lupus (−2) et en Hispo (−1).
- **Santé selon la forme** (réglage des Règles des jets, section Garous) : en Crinos la piste double (règle par défaut), ou +4 niveaux (5e édition), ou aucun changement (W20). Les blessures sont gardées au changement de forme, avec une alerte si elles dépassent la piste.
- Rappel de la forme actuelle en mini silhouette sous le portrait ; un clic ouvre l'onglet Forme.

### Compendium
- Outils d'import (`tools/`) : un script Python lit les armes et armures d'une vault Obsidian et produit un fichier d'objets ; un script lancé dans Foundry remplit un **compendium du monde** « Armes et armures » (dossiers Armes, Armures, Artefacts). Les objets et leurs images restent sur la machine du MJ : ils ne sont pas publiés avec le système.

### Vérifications
- Tests automatiques (Node, `node --test "tests/*.test.mjs"`) : 27 sur 27 (calculs du combat, enchaînement de la carte, formes et santé).
- Vérification statique (`check_system.py`) : 0 erreur, 0 avertissement.
- Relecture indépendante de la carte de combat : expéditeur des demandes de joueur fourni par le serveur (non falsifiable), réglage secret du MJ masqué aux joueurs, texte d'objet affiché sans interprétation HTML.
- Tests dans Foundry 14.369 : test complet après redémarrage (15 étapes), puis test de contrôle avant publication (13 étapes : onglets par créature, barre visible depuis Combat, carte qui s'arrête, Crinos Force 7 et santé 14, blessures gardées au retour), aucune erreur.

## 0.5.0 — 2026-11-08 · Session 5 : jauges animées

Vérifié sur **Foundry VTT 14.369**.

### Jauges animées dans l'en-tête des fiches
- **Vampire et goule : orbe de sang.** Globe de verre réaliste (reflet diffus, épaisseur du verre, effet de lentille) rempli de sang qui ondule. Une vague apparaît à chaque changement ; quand le sang baisse, un film reste sur la paroi et des coulures descendent. Boutons − / + en dessous.
- **Garou : griffes de rage et lune de gnose.**
  - Trois griffures en arc qui se remplissent de feu de bas en haut (temporaire / permanente). Le feu est de plus en plus violent avec la rage : flammes plus hautes, braises, tremblement à partir de 7, sursaut à chaque point gagné.
  - Une lune pleine au maximum de gnose, qui perd des croissants jusqu'à la nouvelle lune.
- **Mage : roue de quintessence et de paradoxe** (20 cases, façon astrolabe avec chiffres romains).
  - La quintessence est une comète qui part du milieu gauche dans le sens horaire, avec sa traînée de lumière.
  - Le paradoxe est une traînée de vide violet qui part dans l'autre sens, d'où se dégagent particules et volutes.
  - Quand le paradoxe grignote la quintessence, des étincelles grésillent ; quand il la dévore entièrement, la comète éclate.
- **Volonté (toutes les fiches) : 10 lames biseautées** à la couleur de la fiche, à la place de la ligne de points. La couleur glisse à l'ajout d'un point ; la lame refroidit et tombe en cendres au retrait. Un reflet discret les traverse, synchronisé. Un clic sur « Volonté » lance toujours le jet.
- Les jauges repartent de la valeur affichée au rendu précédent, pour animer chaque changement. Elles respectent le réglage « réduire les animations » du système d'exploitation.
- Les 4 champs clés de l'en-tête passent en 2 × 2 pour laisser la place aux jauges.

### Règles et données
- **Mage : nouvelle caractéristique Avatar** (au moins 1), dans l'onglet État. La quintessence maximale vaut Avatar + Prime. Les anciennes fiches reprennent la valeur de l'historique « Avatar », qui disparaît des suggestions.
- **Le paradoxe l'emporte sur la quintessence** : la roue compte 20 cases au total ; si le paradoxe empiète sur la quintessence, celle-ci diminue. La règle s'applique à toute modification (boutons, onglet État, jets). Quintessence et paradoxe sont limités à 20.
- **Volonté permanente** : se règle désormais dans l'onglet État, dans l'encart Volonté.
- Un clic sur les points ne descend plus sous le minimum d'un champ (par exemple l'Avatar).

### Vérifications
- Vérification statique (`check_system.py`) : 0 erreur, 0 avertissement.
- Tests dans Foundry 14.369 au fil de la session : boutons et plafonds de chaque jauge, règle du paradoxe (6 / 14 + 1 paradoxe → 5 / 15 ; 1 / 19 → 0 / 20 avec extinction), Avatar minimum 1 et migration, Volonté (−1, +1 bloqué à la permanente, jet 7d10), couleurs par créature.
- Test final dans Foundry redémarré : 21/21 (version, 10 lames sur les 5 fiches, orbe vampire et goule, griffes et lune, roue du mage, aucune jauge sur le mortel, sang −1, rage +1, gnose plafonnée, quintessence max 6, paradoxe qui l'emporte, Avatar ≥ 1, Volonté −1 et jet, nettoyage). Aucune erreur du système ni avertissement d'obsolescence.

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
