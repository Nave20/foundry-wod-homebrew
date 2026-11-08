# Armes, armures et combat — plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** relier armes et armures aux jets avec une carte de combat qui avance (attaque → défense → dégâts → encaissement → santé), et remplir un compendium local depuis la vault.

**Architecture:** calculs purs dans `module/combat-regles.mjs` (testés avec Node, sans Foundry) ; orchestration Foundry (carte, socket, application à la santé) dans `module/combat.mjs` ; onglet `templates/actor/combat.hbs` branché sur la barre de jet existante ; import par un script Python (vault → JSON + images) puis un script JS lancé dans Foundry.

**Tech Stack:** Foundry VTT 14.369 (ApplicationV2, TypeDataModel, ChatMessage flags, socket du système), Node 24 (`node --test`), Python 3 (`PYTHONUTF8=1 python`).

**Spec:** `docs/superpowers/specs/2026-11-08-armes-armures-combat-design.md`

## Global Constraints

- Version du système : **0.6.0** ; textes en français dans `lang/fr.json` sous `WODHOMEBREW.*`.
- Difficulté des dégâts et de l'encaissement : **6**, −1 avec une spécialité de Force (arme qui utilise la Force) ou de Vigueur ; bornée à 2..10 comme les autres jets.
- Dégâts finaux = `max(0, G − E)` ; touché si `A − D ≥ 1` ; réussites restantes = `A − D − 1`.
- Le dépôt public ne contient ni objets ni images de la vault ; aucune donnée personnelle ; identité git noreply.
- Contrôle statique `check_system.py` : 0 erreur, 0 avertissement, avant chaque commit.

## Review Focus

1. Défense cliquée par un joueur qui n'est pas l'auteur du message → passe par le socket, exécutée une seule fois par le MJ actif (pas de double lancer avec deux MJ).
2. Carte relue après rechargement du monde → l'état vient des flags, les boutons sont rebranchés, le crayon reste invisible pour les joueurs.
3. Cible supprimée ou jeton non lié entre l'attaque et « Appliquer » → message d'avertissement, pas d'exception.
4. « Appliquer » cliqué deux fois → la santé n'est cochée qu'une fois (état `applique`).
5. Ancien objet dont `degats` est un texte (« Force + 2 », « 4 », « ») → migration sans erreur.

---

### Task 1: Calculs du combat (purs)

**Files:**
- Create: `module/combat-regles.mjs`
- Test: `tests/combat-regles.test.mjs`

**Interfaces:**
- Produces:
  - `resoudreTouche(a: number, d: number) → { nettes, touche: boolean, restantes }`
  - `reserveDegats({ degats, force: boolean, valeurForce, restantes }) → number`
  - `difficulteOpposee(base: number, specialite: boolean) → number` (base − 1 si spécialité, borné 2..10)
  - `degatsFinaux(g: number, e: number, infini = false) → number | "infini"`
  - `reserveEncaissement(vigueur: number, protections: Array<{armure, equipe}>) → number`
  - `malusDexterite(protections) → number` (somme des `malus` des protections équipées, positif)
  - `lireDegats(texte: string) → { degats: number, force: boolean }` (« Force + 2 » → {2, true} ; « 4 » → {4, false} ; « » → {0, false})
  - `deduireArme(modeAttaque: string, nom: string) → { attribut, competence, force, requis }`

- [ ] **Step 1: Tests** — `node:test` + `node:assert/strict` :
  - `resoudreTouche(5,3)` → `{nettes:2, touche:true, restantes:1}` ; `(3,3)` → touche false ; `(2,-1)` → nettes 3, restantes 2.
  - `reserveDegats({degats:3, force:true, valeurForce:2, restantes:1})` → 6.
  - `degatsFinaux(2,-1)` → 3 ; `(-1,2)` → 0 ; `(4,2)` → 2 ; `(1,5,true)` → `"infini"`.
  - `difficulteOpposee(6,true)` → 5 ; `(2,true)` → 2.
  - `reserveEncaissement(2,[{armure:3,equipe:true},{armure:2,equipe:false}])` → 5 ; `malusDexterite([{malus:1,equipe:true},{malus:2,equipe:false}])` → 1.
  - `lireDegats("Force + 2")`, `("4")`, `("")`, `("force+1")`.
  - `deduireArme("tir","Glock")` → armes_a_feu, force false ; `("mêlée","Katana")` → melee, force true ; `("corps à corps","Poing")` → bagarre, force true ; `("lancer","Grenade")` → athletisme ; `("tir","Arc")` → competence `tir_a_l_arc`, requis "Tir à l'arc" ; `("tir lourd","M-19")` → armes_a_feu, requis "Armes à feu (armes lourdes)".
- [ ] **Step 2:** `node --test tests/` → FAIL (module absent).
- [ ] **Step 3:** écrire `module/combat-regles.mjs` (aucune dépendance Foundry).
- [ ] **Step 4:** `node --test tests/` → PASS.
- [ ] **Step 5:** commit `combat : calculs purs et tests`.

### Task 2: Modèle d'objet et fiche d'objet

**Files:**
- Modify: `module/data/item-objet.mjs`, `module/config.mjs` (catégorie `artefact`, liste `competencesCombat`), `module/applications/item-sheet.mjs`, `templates/item/objet.hbs`, `lang/fr.json`

**Interfaces:**
- Consumes: `lireDegats` (Task 1).
- Produces: champs `system.degats` (NumberField entier ≥ 0), `force`, `infini`, `equipe` (BooleanField), `attribut` (défaut `dexterite`), `competence` (défaut `""`), `requis` (texte), `armure`, `malus`, `type_degats`, `portee` ; getters `estOffensif` (degats > 0 ou force ou infini) et `estProtection` (armure > 0) ; contexte de fiche `estArme` vrai pour arme et artefact, `estArmure` vrai pour armure et artefact.

- [ ] **Step 1:** `static migrateData(source)` : si `typeof source.degats === "string"`, remplacer par `lireDegats` (et mettre `force` si absent).
- [ ] **Step 2:** fiche d'objet : champs d'arme (dégâts, Force, infini, type, portée, attribut, compétence en liste, requis) et de protection (armure, malus, équipée).
- [ ] **Step 3:** `check_system.py` → 0/0 ; dans Foundry, créer un objet `{degats:"Force + 2"}` par `Item.create` → `system.degats === 2 && system.force === true`.
- [ ] **Step 4:** commit.

### Task 3: Onglet Combat

**Files:**
- Create: `templates/actor/combat.hbs`
- Modify: `module/applications/actor-sheet.mjs` (PARTS, TABS, contexte, actions `attaquer`, `equiper`), `styles/wod_homebrew.css`, `lang/fr.json`

**Interfaces:**
- Consumes: Task 2 ; `reserveEncaissement`, `malusDexterite` (Task 1).
- Produces: champ privé de fiche `#arme = { itemId | "mains-nues" } | null` ; quand il est posé, « Lancer » de la barre appelle `lancerAttaque(actor, jet, arme)` (Task 4) au lieu de `lancerJet`. Le malus d'armure s'ajoute à `preparerJet` par une nouvelle option `malusArmure: number` (modificateur « Armure : −n dés »), appliquée quand un trait du jet est `dexterite`.

- [ ] **Step 1:** contexte `combat = { armes, protections, encaissement, malusDex }` ; « Mains nues » = `{ nom, degats: 0, force: true, type_degats: "contondant", competence: "bagarre" }`.
- [ ] **Step 2:** action `attaquer` : sélectionne la ligne d'attribut et la ligne de compétence (si présente sur la fiche), pose `#arme`, ouvre la barre avec le titre « Attaque : <arme> » ; action `equiper` : bascule `system.equipe`.
- [ ] **Step 3:** Foundry : onglet visible sur les 5 créatures, Kevlar équipé → résumé « Vigueur + 3 », jet de Dextérité → modificateur Armure −1.
- [ ] **Step 4:** commit.

### Task 4: Carte de combat

**Files:**
- Create: `module/combat.mjs`, `templates/chat/combat.hbs`
- Modify: `wod_homebrew.mjs` (hooks), `system.json` (`"socket": true`, version 0.6.0), `module/des.mjs` (export `lancerReserve(n, difficulte) → { reussites, des }` réutilisé par la carte ; `REGLES_DEFAUT.degatsDifficulte = 6`, `encaissementDifficulte = 6`), `styles/wod_homebrew.css`, `lang/fr.json`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - `lancerAttaque(actor, jet, arme) → Promise<ChatMessage|null>` : lance l'attaque comme `lancerJet` (mêmes dépenses), crée le message avec `flags.wod_homebrew.combat = { attaquant: uuid, cible: uuid|null, arme: {...}, etapes: { attaque, defense, degats, encaissement }, final, applique: false, ajust: { des: 0, diff: 0 } }`. Chaque étape : `{ libelle, reserve, difficulte, des, reussites, manuel: boolean }`.
  - `executer(message, action, donnees)` : actions `defendre {type, cibleUuid?}`, `ajuster {des, diff}`, `corriger {etape, des, diff, reussites?}`, `final {valeur}`, `appliquer`. Si l'utilisateur ne peut pas modifier le message : `game.socket.emit("system.wod_homebrew", {message, action, donnees})`, exécuté par `game.users.activeGM` seulement.
  - `registerCombatHooks()` : rendu des boutons dans `renderChatMessageHTML` ; défense visible pour le MJ et le propriétaire de la cible ; ajustements, crayons, final et Appliquer pour le MJ seulement.
- `defendre` : réserve Dextérité + (esquive|melee|bagarre) − malus de blessure − malus d'armure + ajust ; puis, si touché, dégâts (Task 1) et encaissement (sauf infini) ; `corriger` relance l'étape et toutes les suivantes, sauf saisie manuelle des réussites qui ne recalcule que le final.
- `appliquer` : ajoute `final` au compteur du type (`contondants|letaux|aggraves`) sans dépasser `niveaux` au total ; « infini » remplit la piste ; `applique: true`.

- [ ] **Step 1:** Foundry, en MJ : Glock contre une cible au Kevlar, défense Esquive → 4 lignes, final = max(0, G − E).
- [ ] **Step 2:** corriger l'esquive (+2 dés, relancer) → dégâts et encaissement relancés ; saisir l'encaissement à −1 → final recalculé.
- [ ] **Step 3:** Appliquer deux fois → santé cochée une fois ; bague infinie → piste pleine.
- [ ] **Step 4:** en joueur (utilisateur de test propriétaire de la cible) : la défense passe par le socket, le crayon est absent.
- [ ] **Step 5:** commit.

### Task 5: Import de la vault vers un compendium du monde

**Files:**
- Create: `tools/import_objets_vault.py` (publié, sans données), `tools/importer-compendium.js` (publié)
- Hors dépôt : `Data/wod-homebrew-objets/objets.json` et images

**Interfaces:**
- Consumes: Task 1 (`deduireArme` reproduite en Python, mêmes correspondances), Task 2 (champs).
- Produces: JSON `[{ name, img, system }]` ; `importerCompendium(url)` crée (ou vide) le compendium du monde `world.armes-et-armures` (type Item) et y importe.

- [ ] **Step 1:** script Python : propriétés YAML + texte → description HTML ; « N dés de dégâts » dans le texte → `degats` ; « ? » ou « Vraiment » → `infini` ; liste des objets non offensifs → `artefact` (affichée à la fin) ; images copiées, sinon icône Foundry.
- [ ] **Step 2:** exécution : 65 objets, rapport des cas corrigés.
- [ ] **Step 3:** Foundry : compendium de 65 objets, glisser le Katana sur une fiche → arme utilisable dans l'onglet Combat.
- [ ] **Step 4:** commit (scripts seuls).

### Task 6: Finition

- [ ] Test complet après redémarrage de Foundry (onglet, carte, socket, compendium, migration), suppression des acteurs de test.
- [ ] CHANGELOG 0.6.0, README, vault (Accueil, Règles des jets, planning), skill si leçons nouvelles ; push du système (fin de session).
