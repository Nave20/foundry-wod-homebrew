/**
 * Combat : carte d'attaque qui avance dans le chat (attaque → défense → dégâts → encaissement → santé).
 */
import { lancerJet } from "./des.mjs";

/** Identifiant de l'attaque à mains nues (pas d'objet) */
export const MAINS_NUES = "mains-nues";

/**
 * Données d'attaque d'une arme (objet) ou des mains nues.
 * @param {Item|string} objet   Objet de type « objet », ou MAINS_NUES
 * @returns {{nom, degats, force, infini, type_degats, portee, attribut, competence, requis}|null}
 */
export function armeDe(objet) {
  if ( objet === MAINS_NUES ) return { nom: _loc("WODHOMEBREW.Combat.MainsNues"), degats: 0, force: true, infini: false,
    type_degats: "contondant", portee: "", attribut: "dexterite", competence: "bagarre", requis: "" };
  if ( !objet?.system ) return null;
  const s = objet.system;
  return { nom: objet.name, degats: s.degats, force: s.force, infini: s.infini, type_degats: s.type_degats || "letal",
    portee: s.portee, attribut: s.attribut, competence: s.competence, requis: s.requis };
}

/** Lance l'attaque (provisoire : jet simple, la carte de combat arrive à l'étape suivante) */
export async function lancerAttaque(actor, jet, armeId) {
  return lancerJet(actor, jet);
}
