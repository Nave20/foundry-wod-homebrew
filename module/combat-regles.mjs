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

/* -------------------------------------------- */
/*  État de la carte de combat                  */
/* -------------------------------------------- */

/**
 * Une étape lancée de la carte (attaque, défense, dégâts, encaissement).
 * @param {string} libelle
 * @param {{reserve: number, difficulte: number}} base   Réserve et difficulté avant les corrections du MJ
 * @param {(reserve: number, difficulte: number) => {reussites: number, des: object[]}} lancer
 * @param {number} [bonus]   Réussites ajoutées à chaque lancer (Volonté de l'attaque)
 * @param {{des: number, diff: number}} [ajust]   Réglage du MJ appliqué dès le premier lancer
 */
export function creerEtape(libelle, base, lancer, bonus = 0, ajust = null) {
  const etape = { libelle, base: { ...base }, ajust: { des: Number(ajust?.des) || 0, diff: Number(ajust?.diff) || 0 },
    reserve: 0, difficulte: base.difficulte,
    reussites: 0, des: [], manuel: false, bonus };
  return relancerEtape(etape, lancer);
}

/** Relance une étape avec ses corrections (dés et difficulté ajoutés à la base) */
function relancerEtape(etape, lancer) {
  etape.reserve = Math.max(0, etape.base.reserve + (etape.ajust.des || 0));
  etape.difficulte = Math.min(10, Math.max(2, etape.base.difficulte + (etape.ajust.diff || 0)));
  const r = etape.reserve > 0 ? lancer(etape.reserve, etape.difficulte) : { reussites: 0, des: [] };
  etape.reussites = r.reussites + (etape.bonus || 0);
  etape.des = r.des;
  etape.manuel = false;
  return etape;
}

/**
 * Enchaîne ce qui suit la défense : touche, dégâts (relancés si leur réserve a changé),
 * encaissement (lancé une fois, sauf dégâts infinis), dégâts finaux.
 * etat.contexte : { valeurForce, specForce, degatsDifficulte, encaissement: { reserve, difficulte } }
 */
export function recalculer(etat, lancer) {
  if ( !etat.defense ) return etat;
  const t = resoudreTouche(etat.attaque.reussites, etat.defense.reussites);
  etat.touche = t.touche;
  etat.restantes = t.restantes;
  if ( !t.touche ) {
    etat.degats = null;
    etat.encaissement = null;
    etat.final = etat.finalManuel ?? 0;
    return etat;
  }
  const c = etat.contexte;
  const reserve = reserveDegats({ ...etat.arme, valeurForce: c.valeurForce, restantes: t.restantes });
  if ( !etat.degats || (etat.degats.base.reserve !== reserve) ) {
    const difficulte = difficulteOpposee(c.degatsDifficulte ?? 6, etat.arme.force && c.specForce);
    const ajust = etat.degats?.ajust;
    etat.degats = creerEtape("degats", { reserve, difficulte }, lancer);
    if ( ajust && (ajust.des || ajust.diff) ) { etat.degats.ajust = ajust; relancerEtape(etat.degats, lancer); }
  }
  if ( etat.arme.infini ) etat.encaissement = null;
  else if ( !etat.encaissement ) etat.encaissement = creerEtape("encaissement", c.encaissement, lancer);
  etat.final = etat.finalManuel ?? degatsFinaux(etat.degats.reussites, etat.encaissement?.reussites ?? 0, etat.arme.infini);
  return etat;
}

/**
 * Correction du MJ sur une étape : nouvelles corrections de dés et de difficulté (l'étape est relancée),
 * ou réussites saisies à la main. La suite est recalculée ; une valeur finale saisie est oubliée.
 * @param {object} etat
 * @param {"attaque"|"defense"|"degats"|"encaissement"} cle
 * @param {{des?: number, diff?: number, reussites?: number}} correction
 */
export function corriger(etat, cle, { des = 0, diff = 0, reussites = null } = {}, lancer) {
  const etape = etat[cle];
  if ( !etape ) return etat;
  if ( Number.isFinite(reussites) ) {
    etape.reussites = reussites;
    etape.manuel = true;
  }
  else {
    etape.ajust = { des: Number(des) || 0, diff: Number(diff) || 0 };
    relancerEtape(etape, lancer);
  }
  etat.finalManuel = null;
  return recalculer(etat, lancer);
}
