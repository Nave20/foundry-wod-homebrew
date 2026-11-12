/**
 * Jets de dés : réserve de dés = somme des traits choisis (par exemple Force + Athlétisme).
 * Chaque dé ≥ difficulté vaut une réussite ; selon les règles du monde, un 10 en vaut deux et un 1 en retire une.
 * Toutes les règles viennent du réglage du monde « reglesJets », modifiable par le MJ
 * (Panneau du MJ → Règles des jets).
 */

import { REGLES_SANTE_FORME } from "./formes.mjs";

const SYSTEME = "wod_homebrew";
const TEMPLATE = "systems/wod_homebrew/templates/chat/jet.hbs";

/**
 * Règles par défaut.
 * - de : faces du dé ; difficulte : seuil de réussite d'un dé
 * - dixDouble : la face maximale compte pour deux réussites ; unRetire : un 1 retire une réussite
 * - seuilCritique : nombre de réussites à partir duquel le jet est une réussite critique (0 = jamais)
 * - capaciteNulle : difficulté ajoutée quand la capacité utilisée est à 0 (0 = aucune)
 * - specialiteDes / specialiteDifficulte : dés ajoutés et difficulté retirée par une spécialité
 * - volonteReussites / volonteSiReussite : réussites données par 1 point de Volonté, seulement si au moins un dé est réussi
 * - sangDes / sangDifficulte : effet d'un point de sang dépensé (vampires)
 * - quintessenceParJet / quintessenceDifficulte : points de quintessence dépensables par jet, difficulté retirée par point
 * - quintessenceAvatarPrime : la quintessence maximale d'un mage vaut Avatar + Prime
 * - extensionDifficulte : difficulté ajoutée à chaque extension d'un jet (bouton « Étendre » de la carte)
 * - malusBlessure : le malus de santé retire des dés aux jets ; volonteSansMalus : sauf au jet de Volonté
 * - masquerVertus : les fiches de vampire et de goule n'affichent pas les Vertus (valeurs gardées)
 */
export const REGLES_DEFAUT = {
  de: 10, difficulte: 6, dixDouble: true, unRetire: true,
  seuilCritique: 5, capaciteNulle: 2, specialiteDes: 1, specialiteDifficulte: 1,
  volonteReussites: 1, volonteSiReussite: true,
  sangDes: 1, sangDifficulte: 1,
  quintessenceParJet: 3, quintessenceDifficulte: 1, quintessenceAvatarPrime: true,
  extensionDifficulte: 1,
  malusBlessure: true, volonteSansMalus: true,
  degatsDifficulte: 6, encaissementDifficulte: 6,
  santeForme: "double",
  lancerParJoueurs: true,
  masquerVertus: true
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
  r.volonteReussites = entier(r.volonteReussites, REGLES_DEFAUT.volonteReussites);
  r.volonteSiReussite = !!r.volonteSiReussite;
  r.sangDes = entier(r.sangDes, REGLES_DEFAUT.sangDes);
  r.sangDifficulte = entier(r.sangDifficulte, REGLES_DEFAUT.sangDifficulte);
  r.quintessenceParJet = entier(r.quintessenceParJet, REGLES_DEFAUT.quintessenceParJet);
  r.quintessenceDifficulte = entier(r.quintessenceDifficulte, REGLES_DEFAUT.quintessenceDifficulte);
  r.quintessenceAvatarPrime = !!r.quintessenceAvatarPrime;
  r.extensionDifficulte = entier(r.extensionDifficulte, REGLES_DEFAUT.extensionDifficulte);
  r.malusBlessure = !!r.malusBlessure;
  r.volonteSansMalus = !!r.volonteSansMalus;
  r.degatsDifficulte = Math.min(r.de, entier(r.degatsDifficulte, REGLES_DEFAUT.degatsDifficulte, 2));
  r.encaissementDifficulte = Math.min(r.de, entier(r.encaissementDifficulte, REGLES_DEFAUT.encaissementDifficulte, 2));
  if ( !(r.santeForme in REGLES_SANTE_FORME) ) r.santeForme = REGLES_DEFAUT.santeForme;
  r.lancerParJoueurs = !!r.lancerParJoueurs;
  r.masquerVertus = !!r.masquerVertus;
  return r;
}

/**
 * Calcule la réserve et la difficulté d'un jet avant de lancer.
 * @param {Array<{nom: string, valeur: number, categorie: string, specialite?: string}>} traits
 * @param {object} [options]
 * @param {boolean} [options.specialite]   Utiliser la spécialité (si un trait en a une)
 * @param {number} [options.desBonus]      Dés ajoutés (ou retirés si négatif) à la main
 * @param {number} [options.diffMod]       Difficulté ajoutée (ou retirée) à la main
 * @param {boolean} [options.volonte]      Dépenser 1 point de Volonté (effet appliqué après le lancer)
 * @param {boolean} [options.sang]         Dépenser 1 point de sang
 * @param {number} [options.quintessence]  Points de quintessence dépensés
 * @param {object} [regles]
 * @returns {{traits: object[], reserve: number, difficulte: number, specialites: string[], modificateurs: Array<{label: string, des?: number, diff?: number}>}}
 */
export function preparerJet(traits, { specialite = true, desBonus = 0, diffMod = 0, volonte = false, sang = false,
  quintessence = 0, malus = 0, appliquerMalus = false, etatSante = "", malusArmure = 0, autres = [] } = {}, regles = reglesJets()) {
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

  // Malus de blessure (dés retirés)
  const malusApplique = appliquerMalus && (malus < 0);
  if ( malusApplique ) {
    reserve += malus;
    modificateurs.push({ label: _loc("WODHOMEBREW.Jets.ModBlessure", { etat: etatSante }), des: malus });
  }

  // Autres modificateurs (forme du garou…) : [{ label, des?, diff? }]
  for ( const m of autres ) {
    reserve += m.des || 0;
    difficulte += m.diff || 0;
    modificateurs.push(m);
  }

  // Protections équipées (jets de Dextérité)
  if ( malusArmure > 0 ) {
    reserve -= malusArmure;
    modificateurs.push({ label: _loc("WODHOMEBREW.Jets.ModArmure"), des: -malusArmure });
  }

  // Ressources dépensées
  if ( sang ) {
    reserve += regles.sangDes;
    difficulte -= regles.sangDifficulte;
    modificateurs.push({ label: _loc("WODHOMEBREW.Jets.ModSang"), des: regles.sangDes, diff: -regles.sangDifficulte });
  }
  quintessence = Math.max(0, Math.min(regles.quintessenceParJet, Math.round(quintessence) || 0));
  if ( quintessence ) {
    difficulte -= quintessence * regles.quintessenceDifficulte;
    modificateurs.push({ label: _loc("WODHOMEBREW.Jets.ModQuintessence", { n: quintessence }),
      diff: -quintessence * regles.quintessenceDifficulte });
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
  return { traits, reserve: Math.max(0, reserve), difficulte, specialites, modificateurs, malusApplique,
    depenses: { volonte: !!volonte, sang: sang ? 1 : 0, quintessence } };
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
 * @param {object} [chaine]                 Pour une extension : numéro et total cumulé des jets précédents
 * @param {number} [chaine.extension=0]
 * @param {number} [chaine.cumulPrecedent=0]
 * @returns {Promise<Roll|null>}
 */
export async function lancerJet(actor, jet, { extension = 0, cumulPrecedent = 0 } = {}) {
  const r = await effectuerJet(actor, jet);
  if ( !r ) return null;
  const { roll, reussites, des, modificateurs, issue, regles } = r;
  const d = r.depenses;
  const cumul = extension ? cumulPrecedent + reussites : reussites;
  const cles = { "critique-reussite": "WODHOMEBREW.Jets.ReussiteCritique", reussite: reussites > 1 ? "WODHOMEBREW.Jets.Reussites" : "WODHOMEBREW.Jets.Reussite",
    echec: "WODHOMEBREW.Jets.Echec", critique: "WODHOMEBREW.Jets.EchecCritique" };
  const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE, {
    traits: jet.traits, reserve: jet.reserve, regles, des, reussites, issue,
    modificateurs,
    afficherNombre: reussites > 0,
    resultat: _loc(cles[issue], { n: reussites }),
    extension, cumul,
    etendre: _loc("WODHOMEBREW.Jets.Etendre", { n: regles.extensionDifficulte })
  });
  await roll.toMessage({
    speaker: ChatMessage.implementation.getSpeaker({ actor }),
    content,
    flags: { [SYSTEME]: { jet: { traits: jet.traits, reserve: jet.reserve, difficulte: jet.difficulte, reussites, issue,
      depenses: d, extension, cumul, actorUuid: actor.uuid } } }
  });
  return roll;
}

/**
 * Lance un jet préparé : dépense les ressources, lance les dés, compte les réussites (Volonté comprise).
 * Ne crée pas de message.
 * @returns {Promise<{roll: Roll, reussites: number, des: object[], modificateurs: string[], issue: string,
 *   regles: object, depenses: object, bonus: number}|null>}
 */
export async function effectuerJet(actor, jet) {
  const regles = { ...reglesJets(), difficulte: jet.difficulte };
  if ( jet.reserve <= 0 ) {
    ui.notifications.warn("WODHOMEBREW.Jets.ReserveVide", { localize: true });
    return null;
  }
  // Dépense des ressources (avant le lancer ; vérifie qu'il en reste assez)
  const d = jet.depenses ?? {};
  const s = actor.system;
  const maj = {};
  if ( d.volonte ) {
    if ( !(s.volonte?.temporaire > 0) ) return ui.notifications.warn("WODHOMEBREW.Jets.PlusDeVolonte", { localize: true }), null;
    maj["system.volonte.temporaire"] = s.volonte.temporaire - 1;
  }
  if ( d.sang ) {
    if ( !(s.sang?.valeur >= d.sang) ) return ui.notifications.warn("WODHOMEBREW.Jets.PlusDeSang", { localize: true }), null;
    maj["system.sang.valeur"] = s.sang.valeur - d.sang;
  }
  if ( d.quintessence ) {
    if ( !(s.quintessence >= d.quintessence) ) return ui.notifications.warn("WODHOMEBREW.Jets.PlusDeQuintessence", { localize: true }), null;
    maj["system.quintessence"] = s.quintessence - d.quintessence;
  }
  if ( !foundry.utils.isEmpty(maj) ) await actor.update(maj);

  const roll = await new Roll(`${jet.reserve}d${regles.de}`).evaluate();
  let { reussites, des } = compterReussites(roll.dice[0].results.map(r => r.result), regles);

  // Volonté : réussite(s) automatique(s), seulement si au moins un dé est réussi (selon la règle),
  // même si des 1 ramènent le total à 0 ou moins
  const modificateurs = jet.modificateurs.map(texteModificateur);
  if ( d.volonte ) {
    const effet = !regles.volonteSiReussite || des.some(de => de.points > 0);
    if ( effet ) reussites += regles.volonteReussites;
    modificateurs.push(_loc(effet ? "WODHOMEBREW.Jets.ModVolonte" : "WODHOMEBREW.Jets.ModVolonteSansEffet",
      { n: regles.volonteReussites }));
  }
  const issue = issueJet(reussites, regles);
  return { roll, reussites, des, modificateurs, issue, regles, depenses: d, bonus: reussites - compterReussites(roll.dice[0].results.map(x => x.result), regles).reussites };
}

/**
 * Lance n dés à une difficulté donnée, sans message (étapes de la carte de combat).
 * @returns {{reussites: number, des: Array<{valeur: number, type: string, points: number}>}}
 */
export function lancerReserve(n, difficulte) {
  const regles = { ...reglesJets(), difficulte };
  if ( n <= 0 ) return { reussites: 0, des: [] };
  // Roll.evaluateSync refuse les dés (non déterministes) : tirage direct avec le générateur de Foundry
  const resultats = Array.from({ length: n }, () => Math.ceil(CONFIG.Dice.randomUniform() * regles.de) || 1);
  return compterReussites(resultats, regles);
}

/**
 * Quintessence maximale d'un mage selon la règle « Avatar + Prime » (null si la règle est désactivée).
 * L'Avatar est la caractéristique « avatar » du mage (au moins 1).
 * @param {object} system   Données système (source ou préparées) du mage
 */
export function quintessenceMax(system) {
  let regles;
  try { regles = reglesJets(); } catch { return null; }   // réglages pas encore prêts
  if ( !regles.quintessenceAvatarPrime ) return null;
  return Math.max(1, Number(system.avatar) || 1) + (Number(system.spheres?.prime) || 0);
}

/**
 * Étend un jet du chat : relance la même réserve, difficulté + extensionDifficulte, et cumule les réussites.
 * Les ressources (Volonté, sang, quintessence) ne sont pas redépensées.
 * @param {ChatMessage} message   Carte de jet à étendre
 */
export async function etendreJet(message) {
  const precedent = message.getFlag(SYSTEME, "jet");
  if ( !precedent ) return null;
  const actor = (precedent.actorUuid && fromUuidSync(precedent.actorUuid)) || game.actors.get(message.speaker.actor);
  if ( !actor?.isOwner ) return ui.notifications.warn("WODHOMEBREW.Jets.EtendreInterdit", { localize: true }), null;
  const regles = reglesJets();
  const extension = (precedent.extension ?? 0) + 1;
  const jet = {
    traits: precedent.traits,
    reserve: precedent.reserve,
    difficulte: Math.min(regles.de, precedent.difficulte + regles.extensionDifficulte),
    modificateurs: [{ label: _loc("WODHOMEBREW.Jets.ModExtension", { n: extension }), diff: regles.extensionDifficulte }],
    depenses: {}
  };
  return lancerJet(actor, jet, { extension, cumulPrecedent: precedent.cumul ?? precedent.reussites ?? 0 });
}

/** Bouton « Étendre » des cartes de jet : visible et actif seulement pour le propriétaire du personnage et le MJ */
export function registerJetsChatHooks() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const bouton = html.querySelector?.(".wod-jet [data-wod-action='etendre']");
    if ( !bouton ) return;
    const jet = message.getFlag(SYSTEME, "jet");
    const actor = (jet?.actorUuid && fromUuidSync(jet.actorUuid)) || game.actors.get(message.speaker.actor);
    if ( !actor?.isOwner ) return bouton.remove();
    bouton.addEventListener("click", async event => {
      event.preventDefault();
      bouton.disabled = true;
      try { await etendreJet(message); } finally { bouton.disabled = false; }
    });
  });
}
