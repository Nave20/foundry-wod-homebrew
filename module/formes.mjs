/**
 * Formes des garous (W20) : modificateurs d'attributs, difficulté de changement et effets particuliers.
 * Sans dépendance à Foundry (testé avec Node).
 * - mods : points ajoutés (ou retirés) aux attributs ; zero : attributs ramenés à 0
 * - difficulte : difficulté indiquée par la fiche de référence pour cette forme
 * - perception : difficulté ajoutée aux jets de Perception
 * - notes : clés de texte des effets particuliers (Délire, morsure…)
 */
export const FORMES = [
  { cle: "homide", mods: {}, difficulte: 6 },
  { cle: "glabro", mods: { force: 2, vigueur: 2, manipulation: -2, apparence: -1 }, difficulte: 7 },
  { cle: "crinos", mods: { force: 4, dexterite: 1, vigueur: 3, manipulation: -3 }, zero: ["apparence"], difficulte: 6, notes: ["Delire"] },
  { cle: "hispo", mods: { force: 3, dexterite: 2, vigueur: 3, manipulation: -3 }, difficulte: 7, perception: -1, notes: ["Morsure"] },
  { cle: "lupus", mods: { force: 1, dexterite: 2, vigueur: 2, manipulation: -3 }, difficulte: 6, perception: -2 }
];

/** Données d'une forme (Homidé si la clé est inconnue) */
export function forme(cle) {
  return FORMES.find(f => f.cle === cle) ?? FORMES[0];
}

/**
 * Attributs d'un garou dans une forme, à partir de ses attributs de base (jamais en dessous de 0).
 * @param {Record<string, number>} attributs
 * @param {string} cle
 * @returns {Record<string, number>} nouvel objet
 */
export function attributsEnForme(attributs, cle) {
  const f = FORMES.find(x => x.cle === cle);
  const resultat = { ...attributs };
  if ( !f ) return resultat;
  for ( const [attr, n] of Object.entries(f.mods) ) {
    if ( attr in resultat ) resultat[attr] = Math.max(0, (Number(resultat[attr]) || 0) + n);
  }
  for ( const attr of f.zero ?? [] ) if ( attr in resultat ) resultat[attr] = 0;
  return resultat;
}

/** Difficulté ajoutée aux jets de Perception dans une forme */
export function difficultePerception(cle) {
  return FORMES.find(f => f.cle === cle)?.perception ?? 0;
}

/**
 * Règles de santé selon la forme (réglage « santeForme » des Règles des jets) :
 * - double : la piste de santé double en Crinos (règle de la table)
 * - v5 : +4 niveaux en Crinos (Werewolf 5e édition)
 * - aucune : la forme ne change pas la santé (W20)
 */
export const REGLES_SANTE_FORME = {
  double: "WODHOMEBREW.Jets.SanteFormeDouble",
  v5: "WODHOMEBREW.Jets.SanteFormeV5",
  aucune: "WODHOMEBREW.Jets.SanteFormeAucune"
};

/** Nombre de niveaux de santé dans une forme */
export function niveauxSanteEnForme(niveaux, cle, regle) {
  if ( cle !== "crinos" ) return niveaux;
  if ( regle === "double" ) return niveaux * 2;
  if ( regle === "v5" ) return niveaux + 4;
  return niveaux;
}
