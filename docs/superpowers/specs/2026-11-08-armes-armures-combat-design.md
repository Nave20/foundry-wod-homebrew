# Armes, armures et combat — conception (v0.6.0)

Validée en conversation le 08/11/2026 (aperçus de l'onglet Combat et de la carte d'attaque).

## Intention

Jouer un échange de coups complet dans Foundry, avec peu de clics. Le MJ dirige les jets : il doit pouvoir intervenir à chaque moment (bonus secret, correction d'un résultat) sans casser le déroulement.

**Non-objectifs (pour l'instant)** : munitions, tir automatique et rafales, portée dépassée, Force d'âme et autres réductions, effets d'artefacts automatisés, débordement des dégâts au-delà de la santé.

**Anti-objectif** : devoir cliquer à de multiples endroits ; une carte illisible pour les joueurs.

## Règles (celles de la table)

| Étape | Réserve | Difficulté | Résultat |
|---|---|---|---|
| Attaque | Attribut + compétence de l'arme (Dextérité par défaut), via la barre de jet habituelle | 6 et modificateurs habituels | réussites A |
| Défense | Dextérité + Esquive (esquive), + Mêlée (parade) ou + Bagarre (blocage) ; ou aucune (0) | 6 | réussites D |
| Touche | nettes = A − D ; touché si nettes ≥ 1 ; égalité = raté | — | réussites restantes = nettes − 1 |
| Dégâts | dés de l'arme (+ Force pour les armes de contact) + réussites restantes | 6, ou 5 avec une spécialité de Force (si l'arme utilise la Force) | réussites G |
| Encaissement | Vigueur + dés des protections équipées, contre **tous** les types | 6, ou 5 avec une spécialité de Vigueur | réussites E |
| Dégâts finaux | max(0, G − E), du type de l'arme | — | cochés sur la santé au clic « Appliquer » |

- **Échec critique en opposition** : un résultat négatif s'ajoute à l'adversaire. Avec les jets en soustraction (A − D, G − E), la formule `max(0, x − y)` le prend en compte toute seule (2 dégâts contre −1 → 3).
- **Malus d'armure** : les protections équipées retirent leur malus aux jets qui utilisent la Dextérité (attaque et défense).
- **Malus de blessure** : s'applique à l'attaque et à la défense comme aux autres jets. Pas aux dégâts ni à l'encaissement *(mon choix)*.
- **Dégâts infinis** (bague o-ku) : l'encaissement n'est pas lancé, toute la piste de santé se remplit du type de l'arme.
- **Compétence requise** (arc → Tir à l'arc, armes lourdes → spécialité) : la carte affiche une alerte ; le malus reste au MJ (roue d'ajustement).
- **Compétence absente de la fiche** : l'attaque se fait avec l'attribut seul, avec la règle « capacité à 0 ».

## Objets

Type `objet`, catégories : **arme, armure, artefact, divers** (artefact est nouveau). Champs :

| Champ | Usage |
|---|---|
| `degats` (nombre) | dés de dégâts de base (ancien champ texte : migré, « Force + 2 » → Force cochée + 2) |
| `force` (case) | ajoute la Force aux dégâts (mêlée, bagarre, arts martiaux) |
| `infini` (case) | dégâts au-delà de tout encaissement |
| `type_degats`, `portee` | inchangés |
| `attribut`, `competence` | jet d'attaque (Dextérité + compétence) |
| `requis` (texte) | spécialité ou compétence exigée, affichée en alerte |
| `armure`, `malus` | dés d'encaissement, malus de Dextérité |
| `equipe` (case) | seules les protections équipées comptent |

Un artefact peut porter des champs d'arme et de protection. Il apparaît dans l'onglet Combat s'il a des dégâts ou une valeur d'armure.

## Fiche : onglet Combat

Nouvel onglet entre État et Biographie :
- **Armes** : nom, compétence (alerte si requise), dégâts (« Force + 3 · létal »), portée, bouton **Attaquer**. Ligne fixe **Mains nues** (Force, contondant, Bagarre).
- **Protections** : nom, dés, malus, case **Équipée**.
- **Résumé** : encaissement (Vigueur + armure = n dés) et malus de Dextérité.

« Attaquer » remplit la barre de jet habituelle (attribut + compétence, spécialité, dés ±, roue, Volonté…) en mode attaque ; « Lancer » crée la carte de combat.

## Carte de combat (chat)

Une seule carte qui avance. État stocké dans les flags du message, carte redessinée à chaque étape.

1. **Attaque lancée** : réserve, dés, réussites, arme, cible (jeton ciblé au moment du lancer, sinon « à choisir »).
2. **Défense** : boutons Esquive · Parade · Blocage · Aucune, pour le MJ et le propriétaire de la cible. Au-dessus, réglage dés ± et difficulté ± (**MJ seulement**). Sans cible enregistrée, la défense vise la cible de celui qui clique.
3. Au clic : défense, dégâts et encaissement sont lancés à la suite ; la carte affiche chaque ligne et le total.
4. **Crayon sur chaque ligne (MJ seulement)** : dés ±, difficulté ±, puis « Relancer », ou saisie directe des réussites. Les lignes suivantes sont relancées ou recalculées.
5. **Dégâts finaux modifiables, bouton Appliquer (MJ)** : coche la santé de la cible (plafonnée au nombre de niveaux), puis la carte passe en « appliqué ».

Les joueurs ne peuvent pas modifier un message qui n'est pas le leur : leurs clics (défense) passent par le socket du système et sont exécutés par le MJ actif (`"socket": true`).

## Compendium (local, non publié)

- Un script Python lit `08 - Objets/Armes` et `Armures` de la vault (propriétés YAML + texte), produit un JSON et copie les images dans `Data/wod-homebrew-objets/` (hors du système).
- Corrections à l'import : dégâts tirés du texte quand ils y sont explicites (grenade : 12 dés), dégâts « ? » → infini, objets non offensifs → artefact (liste montrée au MJ), compétence et Force déduites du mode d'attaque (tir et tir lourd → Armes à feu, mêlée → Mêlée, corps à corps → Bagarre + Force, lancer → Athlétisme ; arc et arbalète → requis Tir à l'arc).
- Les objets sont créés dans un **compendium du monde** « Armes et armures ». Les images Pinterest ne quittent pas la machine ; les objets sans image prennent une icône de Foundry.
- Le dépôt public ne reçoit ni objets ni images.

## Laissé au constructeur

Mise en forme exacte, textes des boutons, dés affichés en petit sur chaque ligne, réglages de difficulté des dégâts et de l'encaissement dans les règles des jets (défaut 6).
