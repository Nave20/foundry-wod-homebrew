/**
 * Calculs du combat, sans dépendance à Foundry (testés avec Node : node --test "tests/*.test.mjs").
 * Règles de la table : attaque − défense ; la première réussite nette valide le coup, les suivantes
 * deviennent des dés de dégâts ; dégâts − encaissement. Un résultat négatif (échec critique)
 * s'ajoute donc à l'adversaire.
 */

/**
 * @param {number} a   Réussites de l'attaque
 * @param {number} d   Réussites de la défense (0 sans défense)
 * @returns {{nettes: number, touche: boolean, restantes: number}}
 */
export function resoudreTouche(a, d) {
  const nettes = a - d;
  return { nettes, touche: nettes >= 1, restantes: Math.max(0, nettes - 1) };
}

/** Dés de dégâts : dés de l'arme, + Force si l'arme l'utilise, + réussites restantes de l'attaque */
export function reserveDegats({ degats = 0, force = false, valeurForce = 0, restantes = 0 }) {
  return Math.max(0, (Number(degats) || 0) + (force ? (Number(valeurForce) || 0) : 0) + (Number(restantes) || 0));
}

/** Difficulté d'un jet de dégâts ou d'encaissement : −1 avec une spécialité de l'attribut, entre 2 et 10 */
export function difficulteOpposee(base, specialite) {
  return Math.min(10, Math.max(2, base - (specialite ? 1 : 0)));
}

/** Dégâts subis : max(0, dégâts − encaissement), ou "infini" (au-delà de tout encaissement) */
export function degatsFinaux(g, e, infini = false) {
  if ( infini ) return "infini";
  return Math.max(0, g - e);
}

/** Dés d'encaissement : Vigueur + dés des protections équipées */
export function reserveEncaissement(vigueur, protections = []) {
  return (Number(vigueur) || 0) + protections.filter(p => p.equipe).reduce((n, p) => n + (Number(p.armure) || 0), 0);
}

/** Malus de Dextérité des protections équipées (nombre positif de dés retirés) */
export function malusDexterite(protections = []) {
  return protections.filter(p => p.equipe).reduce((n, p) => n + (Number(p.malus) || 0), 0);
}

/** Lecture d'anciens dégâts saisis en texte : « Force + 2 », « 4 », « Force » */
export function lireDegats(texte) {
  const t = String(texte ?? "").toLowerCase();
  const force = t.includes("force");
  const nombre = t.match(/\d+/);
  return { degats: nombre ? Number(nombre[0]) : 0, force };
}

/**
 * Attaque déduite du mode d'attaque des fiches de la vault.
 * tir / tir lourd → Armes à feu ; mêlée → Mêlée + Force ; corps à corps → Bagarre + Force ; lancer → Athlétisme.
 * Arc et arbalète demandent Tir à l'arc ; les armes lourdes, la spécialité « armes lourdes ».
 * @returns {{attribut: string, competence: string, force: boolean, requis: string}}
 */
export function deduireArme(modeAttaque, nom = "") {
  const mode = String(modeAttaque ?? "").toLowerCase().trim();
  const arme = { attribut: "dexterite", competence: "", force: false, requis: "" };
  if ( mode.startsWith("tir") ) {
    arme.competence = "armes_a_feu";
    if ( /\b(arc|arbal[eè]te)\b/i.test(nom) ) {
      arme.competence = "tir_a_l_arc";
      arme.requis = "Tir à l'arc";
    }
    else if ( mode === "tir lourd" ) arme.requis = "Armes à feu (armes lourdes)";
  }
  else if ( mode === "mêlée" || mode === "melee" ) Object.assign(arme, { competence: "melee", force: true });
  else if ( mode === "corps à corps" ) Object.assign(arme, { competence: "bagarre", force: true });
  else if ( mode === "lancer" ) arme.competence = "athletisme";
  return arme;
}
