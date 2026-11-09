/**
 * Constantes du système. Les libellés sont des clés i18n (lang/fr.json).
 * Les clés reprennent celles des fiches de personnage de référence (propriétés Markdown), pour faciliter un import.
 */
const L = "WODHOMEBREW";

/** Types d'acteur → jeu par défaut */
const creatures = {
  mortel: { label: "TYPES.Actor.mortel", jeu: "V20" },
  vampire: { label: "TYPES.Actor.vampire", jeu: "V20" },
  goule: { label: "TYPES.Actor.goule", jeu: "V20" },
  garou: { label: "TYPES.Actor.garou", jeu: "W20" },
  mage: { label: "TYPES.Actor.mage", jeu: "M20" }
};

const jeux = {
  V20: `${L}.Jeu.V20`,
  DAV20: `${L}.Jeu.DAV20`,
  W20: `${L}.Jeu.W20`,
  M20: `${L}.Jeu.M20`
};

/** Attributs, par catégorie */
const attributs = {
  physiques: ["force", "dexterite", "vigueur"],
  sociaux: ["charisme", "manipulation", "apparence"],
  mentaux: ["perception", "intelligence", "astuce"]
};

const competencesModernes = ["animaux", "artisanat", "conduite", "etiquette", "armes_a_feu", "larcin", "melee",
  "representation", "furtivite", "survie"];

/** Capacités affichées selon le jeu (ordre de la fiche) */
const capacites = {
  V20: {
    talents: ["vigilance", "athletisme", "intuition", "bagarre", "empathie", "expression", "intimidation",
      "commandement", "connaissance_de_la_rue", "subterfuge"],
    competences: competencesModernes,
    connaissances: ["erudition", "informatique", "finances", "investigation", "droit", "medecine", "occultisme",
      "politique", "sciences", "technologie"]
  },
  DAV20: {
    talents: ["vigilance", "athletisme", "intuition", "bagarre", "empathie", "expression", "intimidation",
      "commandement", "prestidigitation", "subterfuge"],
    competences: ["animaux", "tir_a_l_arc", "commerce", "artisanat", "etiquette", "melee", "representation",
      "equitation", "furtivite", "survie"],
    connaissances: ["erudition", "enigmes", "sagesse_populaire", "investigation", "droit", "medecine", "occultisme",
      "politique", "senechal", "theologie"]
  },
  W20: {
    talents: ["vigilance", "athletisme", "bagarre", "empathie", "expression", "intimidation", "commandement",
      "instinct_primal", "connaissance_de_la_rue", "subterfuge"],
    competences: competencesModernes,
    connaissances: ["erudition", "informatique", "enigmes", "investigation", "droit", "medecine", "occultisme",
      "rituels", "sciences", "technologie"]
  },
  M20: {
    talents: ["vigilance", "art", "athletisme", "intuition", "bagarre", "empathie", "expression", "intimidation",
      "commandement", "connaissance_de_la_rue", "subterfuge"],
    competences: ["artisanat", "conduite", "etiquette", "armes_a_feu", "arts_martiaux", "meditation", "melee",
      "recherche", "furtivite", "survie", "technologie"],
    connaissances: ["erudition", "informatique", "cosmologie", "enigmes", "esoterisme", "investigation", "droit",
      "medecine", "occultisme", "politique", "sciences"]
  }
};

/** Toutes les clés de capacité, tous jeux confondus (le schéma les stocke toutes) */
const toutesCapacites = [...new Set(Object.values(capacites).flatMap(j => Object.values(j).flat()))];

const spheres = ["correspondance", "entropie", "forces", "vie", "matiere", "mental", "prime", "esprit", "temps"];

/** Niveaux de santé de base : [clé, malus] (null = neutralisé) */
const niveauxSante = [
  ["contusionne", 0], ["meurtri", -1], ["blesse", -1], ["grievement_blesse", -2],
  ["estropie", -2], ["infirme", -5], ["neutralise", null]
];

const categoriesObjet = {
  arme: `${L}.Objet.Categorie.arme`,
  armure: `${L}.Objet.Categorie.armure`,
  artefact: `${L}.Objet.Categorie.artefact`,
  divers: `${L}.Objet.Categorie.divers`
};

const typesDegats = {
  contondant: `${L}.Degats.contondant`,
  letal: `${L}.Degats.letal`,
  aggrave: `${L}.Degats.aggrave`
};

/** Attributs et compétences proposés pour l'attaque d'une arme */
const attributsCombat = {
  dexterite: `${L}.Actor.FIELDS.attributs.dexterite.label`,
  force: `${L}.Actor.FIELDS.attributs.force.label`,
  perception: `${L}.Actor.FIELDS.attributs.perception.label`
};
const competencesCombat = {
  "": `${L}.Combat.Aucune`,
  bagarre: `${L}.Actor.FIELDS.capacites.bagarre.label`,
  melee: `${L}.Actor.FIELDS.capacites.melee.label`,
  arts_martiaux: `${L}.Actor.FIELDS.capacites.arts_martiaux.label`,
  armes_a_feu: `${L}.Actor.FIELDS.capacites.armes_a_feu.label`,
  tir_a_l_arc: `${L}.Actor.FIELDS.capacites.tir_a_l_arc.label`,
  athletisme: `${L}.Actor.FIELDS.capacites.athletisme.label`
};

/** Pouvoirs : catégories et éditions (V20 et V5 cohabitent) */
const categoriesPouvoir = {
  discipline: `${L}.Pouvoir.Categorie.discipline`,
  don: `${L}.Pouvoir.Categorie.don`,
  rite: `${L}.Pouvoir.Categorie.rite`,
  autre: `${L}.Pouvoir.Categorie.autre`
};
const editionsPouvoir = { V20: "V20", V5: "V5", W20: "W20", M20: "M20", autre: `${L}.Pouvoir.Edition.autre` };

export const WODHOMEBREW = {
  creatures, jeux, attributs, capacites, toutesCapacites, spheres, niveauxSante, categoriesObjet, typesDegats,
  attributsCombat, competencesCombat, categoriesPouvoir, editionsPouvoir
};
