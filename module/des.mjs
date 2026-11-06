/**
 * Jets de dés : réserve de dés = somme des traits choisis (par exemple Force + Athlétisme).
 * Chaque dé ≥ difficulté vaut une réussite ; selon les règles du monde, un 10 en vaut deux et un 1 en retire une.
 * Toutes les règles viennent du réglage du monde « reglesJets », modifiable par le MJ
 * (Panneau du MJ → Règles des jets).
 */

const SYSTEME = "wod_homebrew";
const TEMPLATE = "systems/wod_homebrew/templates/chat/jet.hbs";

/**
 * Règles par défaut.
 * - de : faces du dé ; difficulte : seuil de réussite d'un dé
 * - dixDouble : la face maximale compte pour deux réussites ; unRetire : un 1 retire une réussite
 * - seuilCritique : nombre de réussites à partir duquel le jet est une réussite critique (0 = jamais)
 * - capaciteNulle : difficulté ajoutée quand la capacité utilisée est à 0 (0 = aucune)
 * - specialiteDes / specialiteDifficulte : dés ajoutés et difficulté retirée par une spécialité
 */
export const REGLES_DEFAUT = {
  de: 10, difficulte: 6, dixDouble: true, unRetire: true,
  seuilCritique: 5, capaciteNulle: 2, specialiteDes: 1, specialiteDifficulte: 1
};

export function registerDesSettings() {
  game.settings.register(SYSTEME, "reglesJets", { scope: "world", config: false, type: Object, default: REGLES_DEFAUT });
}

/** Règles du monde, complétées par les valeurs par défaut */
export function reglesJets() {
  const r = { ...REGLES_DEFAUT, ...(game.settings.get(SYSTEME, "reglesJets") ?? {}) };
  const entier = (v, defaut, min = 0) => Math.max(min, Math.round(Number.isFinite(Number(v)) ? Number(v) : defaut));
  r.de = entier(r.de, REGLES_DEFAUT.de, 2);
  r.difficulte = Math.min(r.de, entier(r.difficulte, REGLES_DEFAUT.difficulte, 2));
  r.dixDouble = !!r.dixDouble;
  r.unRetire = !!r.unRetire;
  r.seuilCritique = entier(r.seuilCritique, REGLES_DEFAUT.seuilCritique);
  r.capaciteNulle = entier(r.capaciteNulle, REGLES_DEFAUT.capaciteNulle);
  r.specialiteDes = entier(r.specialiteDes, REGLES_DEFAUT.specialiteDes);
  r.specialiteDifficulte = entier(r.specialiteDifficulte, REGLES_DEFAUT.specialiteDifficulte);
  return r;
}

/**
 * Calcule la réserve et la difficulté d'un jet avant de lancer.
 * @param {Array<{nom: string, valeur: number, categorie: string, specialite?: string}>} traits
 * @param {object} [options]
 * @param {boolean} [options.specialite]   Utiliser la spécialité (si un trait en a une)
 * @param {number} [options.desBonus]      Dés ajoutés (ou retirés si négatif) à la main
 * @param {number} [options.diffMod]       Difficulté ajoutée (ou retirée) à la main
 * @param {object} [regles]
 * @returns {{traits: object[], reserve: number, difficulte: number, specialites: string[], modificateurs: Array<{label: string, des?: number, diff?: number}>}}
 */
export function preparerJet(traits, { specialite = true, desBonus = 0, diffMod = 0 } = {}, regles = reglesJets()) {
  const modificateurs = [];
  let reserve = traits.reduce((n, t) => n + (Number(t.valeur) || 0), 0);
  let difficulte = regles.difficulte;

  // Capacité utilisée à 0 point
  const capaciteNulle = traits.find(t => t.categorie === "capacite" && !(Number(t.valeur) > 0));
  if ( capaciteNulle && regles.capaciteNulle ) {
    difficulte += regles.capaciteNulle;
    modificateurs.push({ label: _loc("WODHOMEBREW.Jets.ModCapaciteNulle", { nom: capaciteNulle.nom }), diff: regles.capaciteNulle });
  }

  // Spécialité(s) des traits choisis
  const specialites = traits.map(t => t.specialite).filter(Boolean);
  if ( specialites.length && specialite ) {
    reserve += regles.specialiteDes;
    difficulte -= regles.specialiteDifficulte;
    modificateurs.push({ label: _loc("WODHOMEBREW.Jets.ModSpecialite", { nom: specialites.join(", ") }),
      des: regles.specialiteDes, diff: -regles.specialiteDifficulte });
  }

  // Ajustements manuels
  if ( desBonus ) {
    reserve += desBonus;
    modificateurs.push({ label: _loc("WODHOMEBREW.Jets.ModDes"), des: desBonus });
  }
  if ( diffMod ) {
    difficulte += diffMod;
    modificateurs.push({ label: _loc("WODHOMEBREW.Jets.ModDifficulte"), diff: diffMod });
  }

  difficulte = Math.min(regles.de, Math.max(2, difficulte));
  return { traits, reserve: Math.max(0, reserve), difficulte, specialites, modificateurs };
}

/**
 * Compte les réussites d'un jet.
 * @param {number[]} resultats
 * @param {object} regles       Règles (avec la difficulté du jet)
 * @returns {{ reussites: number, des: Array<{valeur: number, type: string, points: number}> }}
 *   type : "max" (face maximale qui compte double), "reussite", "un" (retire une réussite) ou "echec"
 */
export function compterReussites(resultats, regles = reglesJets()) {
  const des = resultats.map(valeur => {
    if ( valeur === regles.de && regles.dixDouble && valeur >= regles.difficulte ) return { valeur, type: "max", points: 2 };
    if ( valeur >= regles.difficulte ) return { valeur, type: "reussite", points: 1 };
    if ( valeur === 1 && regles.unRetire ) return { valeur, type: "un", points: -1 };
    return { valeur, type: "echec", points: 0 };
  });
  return { reussites: des.reduce((n, d) => n + d.points, 0), des };
}

/** Issue d'un jet : "critique-reussite", "reussite", "echec" ou "critique" (échec critique) */
export function issueJet(reussites, regles = reglesJets()) {
  if ( reussites <= 0 ) return reussites === 0 ? "echec" : "critique";
  return (regles.seuilCritique && reussites >= regles.seuilCritique) ? "critique-reussite" : "reussite";
}

/** Texte d'un modificateur : « Spécialité (Épées) : +1 dé, −1 diff. » */
export function texteModificateur(m) {
  const signe = n => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);
  const parts = [];
  if ( m.des ) parts.push(`${signe(m.des)} ${_loc(Math.abs(m.des) > 1 ? "WODHOMEBREW.Jets.Des" : "WODHOMEBREW.Jets.Un_de")}`);
  if ( m.diff ) parts.push(`${signe(m.diff)} ${_loc("WODHOMEBREW.Jets.DifficulteCourte")}`);
  return `${m.label} : ${parts.join(", ")}`;
}

/**
 * Lance un jet préparé par preparerJet et affiche le résultat (réussites) dans le chat.
 * @param {Actor} actor
 * @param {ReturnType<typeof preparerJet>} jet
 * @returns {Promise<Roll|null>}
 */
export async function lancerJet(actor, jet) {
  const regles = { ...reglesJets(), difficulte: jet.difficulte };
  if ( jet.reserve <= 0 ) {
    ui.notifications.warn("WODHOMEBREW.Jets.ReserveVide", { localize: true });
    return null;
  }
  const roll = await new Roll(`${jet.reserve}d${regles.de}`).evaluate();
  const { reussites, des } = compterReussites(roll.dice[0].results.map(r => r.result), regles);
  const issue = issueJet(reussites, regles);
  const cles = { "critique-reussite": "WODHOMEBREW.Jets.ReussiteCritique", reussite: reussites > 1 ? "WODHOMEBREW.Jets.Reussites" : "WODHOMEBREW.Jets.Reussite",
    echec: "WODHOMEBREW.Jets.Echec", critique: "WODHOMEBREW.Jets.EchecCritique" };
  const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE, {
    traits: jet.traits, reserve: jet.reserve, regles, des, reussites, issue,
    modificateurs: jet.modificateurs.map(texteModificateur),
    afficherNombre: reussites > 0,
    resultat: _loc(cles[issue], { n: reussites })
  });
  await roll.toMessage({
    speaker: ChatMessage.implementation.getSpeaker({ actor }),
    content,
    flags: { [SYSTEME]: { jet: { traits: jet.traits, reserve: jet.reserve, difficulte: jet.difficulte, reussites, issue } } }
  });
  return roll;
}
