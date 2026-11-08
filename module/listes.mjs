/**
 * Listes préfaites proposées dans les champs « nom » des historiques, atouts et handicaps.
 * Ce sont de simples suggestions : on peut toujours taper un nom libre.
 * Chaque entrée : [nom, coût, catégorie]. Le coût sert de valeur par défaut quand la ligne est encore à 0
 * (pour un coût variable, c'est le minimum).
 */

/** Ajoute la catégorie d'affichage (clé WODHOMEBREW.Suggestions.*) à chaque entrée [nom, coût] */
const categorie = (cat, liste) => liste.map(([nom, cout = null]) => [nom, cout, cat]);

/* -------------------------------------------- */
/*  Historiques                                 */
/* -------------------------------------------- */

const HISTO_MORTEL = ["Alliés", "Contacts", "Fausse identité", "Influence", "Mentor", "Renommée", "Ressources", "Serviteurs", "Statut"];
const HISTO_VAMPIRE = ["Alliés", "Contacts", "Domaine", "Fausse identité", "Génération", "Influence", "Mentor", "Renommée",
  "Ressources", "Rituels", "Serviteurs", "Statut", "Troupeau"];
const HISTO_GOULE = ["Alliés", "Contacts", "Domitor", "Fausse identité", "Influence", "Mentor", "Renommée", "Ressources",
  "Serviteurs", "Statut"];
const HISTO_GAROU = ["Alliés", "Ancêtres", "Contacts", "Fétiche", "Mentor", "Parentèle", "Race pure", "Ressources", "Rites", "Totem"];
const HISTO_MAGE = ["Accréditation", "Alliés", "Amélioration", "Arcane", "Armes secrètes", "Bénédiction", "Bibliothèque",
  "Camouflage", "Compagnon", "Contacts", "Culte", "Destinée", "Domaine", "Espions", "Familier", "Fausse identité", "Fondation",
  "Influence", "Légende", "Mécène", "Mentor", "Nœud", "Prodige", "Rang", "Renforts", "Renommée", "Réquisitions", "Ressources",
  "Rêve", "Sanctuaire", "Serviteurs", "Statut", "Totem", "Vies antérieures"];

/* -------------------------------------------- */
/*  Atouts                                      */
/* -------------------------------------------- */

const ATOUTS_COMMUNS = [
  ...categorie("physique", [
    ["Ambidextre", 1], ["Cogneur", 1], ["Équilibre félin", 1], ["Estomac de fer", 1], ["Sens aiguisé", 1], ["Visage familier", 1],
    ["Voix envoûtante", 2], ["Beau", 2], ["Casse-cou", 3], ["Taille immense", 4]
  ]),
  ...categorie("mental", [
    ["Concentration", 1], ["Connaissances utiles", 1], ["Introspection", 1], ["Langue", 1], ["Sens commun", 1], ["Sens du temps", 1],
    ["Aptitude à la mécanique", 1], ["Aptitude informatique", 2], ["Code d'honneur", 2], ["Linguiste né", 2], ["Mémoire eidétique", 2],
    ["Sommeil léger", 2], ["Calme", 3], ["Précoce", 3], ["Volonté de fer", 3]
  ]),
  ...categorie("social", [
    ["Chef naturel", 1], ["Inoffensif", 1], ["Protégé", 1], ["Réputation", 1], ["Faveur", 1], ["Initié d'une sous-culture", 1],
    ["Menteur né", 2], ["Vieil ami", 2], ["Ami de la police", 2], ["Étoile montante", 3], ["Taupe", 3]
  ]),
  ...categorie("surnaturel", [
    ["Toucher guérisseur", 1], ["Médium", 2], ["Sensibilité au surnaturel", 2], ["Résistance à la magie", 2], ["Chanceux", 3],
    ["Don oraculaire", 3], ["Mentor spirituel", 3], ["Sens du danger", 3], ["Amour véritable", 4], ["Vraie foi", 7]
  ])
];

const ATOUTS_VAMPIRE = categorie("creature", [
  ["Aura trompeuse", 1], ["Lève-tôt", 1], ["Manducation", 1], ["Ancienne goule", 1], ["Habitué de l'Élysium", 1],
  ["Inoffensif pour les animaux", 1], ["Teint de pêche", 2], ["Sainteté", 2], ["Digestion efficace", 3],
  ["Diablerie cachée", 3], ["Amitié de clan", 4], ["Lien rompu", 4], ["Discipline additionnelle", 5],
  ["Insoumis au lien de sang", 5], ["Neuf vies", 6]
]);

const ATOUTS_GOULE = categorie("creature", [["Manducation", 1], ["Teint de pêche", 2], ["Maître satisfait", 3]]);

const ATOUTS_GAROU = categorie("creature", [["Affinité avec l'Umbra", 3]]);

const ATOUTS_MAGE = categorie("creature", [
  ["Avatar compagnon", 1], ["Avatar prudent", 2], ["Affinité de sphère", 3], ["Œil de la vérité", 3], ["Présence éthérée", 2]
]);

/* -------------------------------------------- */
/*  Handicaps                                   */
/* -------------------------------------------- */

const HANDICAPS_COMMUNS = [
  ...categorie("physique", [
    ["Dur d'oreille", 1], ["Petit", 1], ["Tic", 1], ["Asthme", 1], ["Mauvaise vue", 1], ["Borgne", 2], ["Défiguré", 2],
    ["Addiction", 3], ["Boiteux", 3], ["Difformité", 3], ["Enfant", 3], ["Monstrueux", 3], ["Blessure permanente", 3],
    ["Sourd", 4], ["Muet", 4], ["Aveugle", 6]
  ]),
  ...categorie("mental", [
    ["Cauchemars", 1], ["Impatient", 1], ["Présomptueux", 1], ["Sommeil profond", 1], ["Timide", 1], ["Cœur tendre", 1],
    ["Trouble de la parole", 1], ["Amnésie", 2], ["Arrogance", 2], ["Colérique", 2], ["Curiosité", 2], ["Immodéré", 2],
    ["Phobie", 2], ["Vengeur", 2], ["Faible volonté", 3], ["Préjugés", 3], ["Rongé par la culpabilité", 4]
  ]),
  ...categorie("social", [
    ["Sombre secret", 1], ["Nouveau venu", 1], ["Ennemi", 1], ["Ancien amour", 2], ["Échec retentissant", 2], ["Rivalité", 2],
    ["Indic", 3], ["Mis à l'index", 3], ["Traqué", 4]
  ]),
  ...categorie("surnaturel", [
    ["Maudit", 1], ["Présence inquiétante", 2], ["Hanté", 3], ["Sombre destin", 5]
  ])
];

const HANDICAPS_VAMPIRE = categorie("creature", [
  ["Absence de reflet", 1], ["Brise froide", 1], ["Compréhension incomplète", 1], ["Exclusion de proie", 1],
  ["Odeur de tombe", 1], ["Rancœur du sire", 1], ["Repoussé par l'ail", 1], ["Sire infâme", 1], ["Toucher glacé", 1],
  ["Morsure émoussée", 2], ["Morsure infectieuse", 2], ["Plaie ouverte", 2], ["Quatorzième génération", 2],
  ["Seigneur des mouches", 2], ["Soif d'innocence", 2], ["Victime de la Mascarade", 2], ["Crocs permanents", 3],
  ["Guérison lente", 3], ["Ne peut franchir l'eau vive", 3], ["Repoussé par les croix", 3], ["Yeux luisants", 3],
  ["Inimitié de clan", 4], ["Proie de la chasse de sang", 4], ["Sang clair", 4], ["Quinzième génération", 4],
  ["Chair de cadavre", 5], ["Sensible à la lumière", 5], ["Vitae stérile", 5], ["Liste rouge", 7]
]);

const HANDICAPS_GOULE = categorie("creature", [["Lien de sang", 1]]);

const HANDICAPS_GAROU = categorie("creature", [
  ["Vulnérabilité à l'argent", 2], ["Psyché animale", 3], ["Bête intérieure", 3], ["Marque du Parjure", 3], ["Faim étrange", 3]
]);

const HANDICAPS_MAGE = categorie("creature", [
  ["Aimant à esprits", 2], ["Compréhension incomplète", 1], ["Inapte à une sphère", 5], ["Mage à abattre", 4],
  ["Sphère épineuse", 6], ["Absence d'ombre", 2]
]);

/* -------------------------------------------- */

/** Fusionne des listes [nom, coût, catégorie] en retirant les doublons (le premier gagne) et trie par nom */
const fusion = (...listes) => {
  const vus = new Map();
  for (const entree of listes.flat()) if (!vus.has(entree[0])) vus.set(entree[0], entree);
  return [...vus.values()].sort(([a], [b]) => a.localeCompare(b, "fr"));
};
const noms = liste => [...liste].sort((a, b) => a.localeCompare(b, "fr")).map(nom => [nom, null, null]);

/** Listes préfaites par liste puis par type d'acteur */
export const LISTES_PREFAITES = {
  historiques: {
    mortel: noms(HISTO_MORTEL), vampire: noms(HISTO_VAMPIRE), goule: noms(HISTO_GOULE),
    garou: noms(HISTO_GAROU), mage: noms(HISTO_MAGE)
  },
  atouts: {
    mortel: fusion(ATOUTS_COMMUNS), vampire: fusion(ATOUTS_COMMUNS, ATOUTS_VAMPIRE),
    goule: fusion(ATOUTS_COMMUNS, ATOUTS_GOULE), garou: fusion(ATOUTS_COMMUNS, ATOUTS_GAROU),
    mage: fusion(ATOUTS_COMMUNS, ATOUTS_MAGE)
  },
  handicaps: {
    mortel: fusion(HANDICAPS_COMMUNS), vampire: fusion(HANDICAPS_COMMUNS, HANDICAPS_VAMPIRE),
    goule: fusion(HANDICAPS_COMMUNS, HANDICAPS_GOULE), garou: fusion(HANDICAPS_COMMUNS, HANDICAPS_GAROU),
    mage: fusion(HANDICAPS_COMMUNS, HANDICAPS_MAGE)
  }
};

/* -------------------------------------------- */
/*  Champs d'en-tête                            */
/* -------------------------------------------- */

const ARCHETYPES = ["Apôtre", "Architecte", "Artisan", "Autocrate", "Bête", "Bienfaiteur", "Bohème", "Bon vivant", "Bouffon",
  "Brute", "Bureaucrate", "Caméléon", "Compétiteur", "Conformiste", "Croisé", "Déviant", "Directeur", "Énigme", "Enfant",
  "Excentrique", "Fanatique", "Fanfaron", "Galant", "Gamin", "Gardien", "Gourou", "Grincheux", "Hédoniste", "Idéaliste",
  "Individualiste", "Innovateur", "Juge", "Machine", "Martyr", "Masochiste", "Mentor", "Monstre", "Noble", "Opportuniste",
  "Pédagogue", "Pédant", "Pénitent", "Perfectionniste", "Pernicieux", "Prédateur", "Professionnel", "Profiteur", "Prophète",
  "Protecteur", "Rebelle", "Redresseur de torts", "Sadique", "Savant fou", "Soignant", "Soldat", "Solitaire", "Stoïque",
  "Survivant", "Traditionaliste", "Tyran", "Visionnaire"];

const CLANS = [
  ...categorie("camarilla", [["Brujah"], ["Gangrel"], ["Malkavien"], ["Nosferatu"], ["Toréador"], ["Trémère"], ["Ventrue"], ["Caïtiff"]]),
  ...categorie("sabbat", [["Lasombra"], ["Tzimisce"], ["Antitribu"], ["Panders"]]),
  ...categorie("independants", [["Assamite"], ["Disciples de Seth"], ["Giovanni"], ["Ravnos"]]),
  ...categorie("lignees", [["Baali"], ["Gargouille"], ["Lamia"], ["Salubri"], ["Samedi"], ["Cappadocien"], ["Sang-faible"]])
];

const SECTES = ["Camarilla", "Sabbat", "Anarchs", "Indépendant", "Inconnus", "Aucune"];

const TRIBUS = [
  ...categorie("nation_garou", [["Arpenteurs silencieux"], ["Contemplateurs d'étoiles"], ["Crocs d'argent"], ["Enfants de Gaïa"],
    ["Fianna"], ["Fils de Fenris"], ["Furies noires"], ["Griffes rouges"], ["Marcheurs sur verre"], ["Rongeurs d'os"],
    ["Seigneurs de l'ombre"], ["Uktena"], ["Wendigo"]]),
  ...categorie("autres_tribus", [["Bunyips"], ["Croatans"], ["Danseurs de la spirale noire"], ["Ronins"]])
];

const TRADITIONS = [
  ...categorie("traditions", [["Adeptes du virtuel"], ["Chœur céleste"], ["Culte de l'Extase"], ["Euthanatoï"],
    ["Fils de l'Éther"], ["Fraternité Akashite"], ["Ordre d'Hermès"], ["Parlesonges"], ["Verbenae"]]),
  ...categorie("technocratie", [["Ingénieurs du vide"], ["Itération X"], ["Nouvel Ordre mondial"], ["Progéniteurs"], ["Syndicat"]]),
  ...categorie("autres_mages", [["Orphelin"], ["Artisans"], ["Bata'a"], ["Ngoma"], ["Maraudeur"], ["Nephandus"]])
];

/** Suggestions des champs d'en-tête : clé du champ (system.<clé>) → [nom, coût, catégorie] */
export const CHAMPS_PREFAITS = {
  nature: noms(ARCHETYPES),
  attitude: noms(ARCHETYPES),
  clan: CLANS,
  clan_domitor: CLANS,
  secte: noms(SECTES),
  race: noms(["Homidé", "Métis", "Lupus"]),
  auspice: noms(["Ragabash", "Théurge", "Philodox", "Galliard", "Ahroun"]),
  tribu: TRIBUS,
  tradition: TRADITIONS,
  essence: noms(["Dynamique", "Motivale", "Primordiale", "Questive"])
};
