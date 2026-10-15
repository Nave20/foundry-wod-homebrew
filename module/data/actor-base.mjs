import { WODHOMEBREW } from "../config.mjs";
import { groupe, jauge, listeTraits, points, texte } from "./fields.mjs";

const { HTMLField, SchemaField, StringField } = foundry.data.fields;

/**
 * Données communes à toutes les créatures (fiche « Mortel »).
 */
export default class ActorBaseData extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["WODHOMEBREW.Actor"];

  /** Jeu par défaut du sous-type (V20, W20, M20…) */
  static JEU_DEFAUT = "V20";

  static defineSchema() {
    const attributs = Object.values(WODHOMEBREW.attributs).flat();
    return {
      // Identité
      jeu: new StringField({ required: true, blank: false, initial: this.JEU_DEFAUT, choices: () => WODHOMEBREW.jeux }),
      role: new StringField({ required: true, blank: false, initial: "PNJ", choices: { PJ: "PJ", PNJ: "PNJ" } }),
      joueur: texte(),
      statut: texte("actif"),
      chronique: texte(),
      concept: texte(),
      nature: texte(),
      attitude: texte(),
      echelle_max: points(5, { min: 1 }),

      // Traits
      attributs: groupe(attributs, 1),
      capacites: groupe(WODHOMEBREW.toutesCapacites, 0),
      capacites_secondaires: listeTraits(),
      historiques: listeTraits(),
      atouts: listeTraits(),
      handicaps: listeTraits(),

      // État
      volonte: jauge(3),
      sante: new SchemaField({
        niveaux: points(7, { min: 1 }),
        contondants: points(0),
        letaux: points(0),
        aggraves: points(0)
      }),

      // Notes libres
      biographie: new SchemaField({
        historique: new HTMLField({ required: true, blank: true }),
        apparence: new HTMLField({ required: true, blank: true }),
        relations: new HTMLField({ required: true, blank: true }),
        notes_mj: new HTMLField({ required: true, blank: true, gmOnly: true })
      })
    };
  }

  /**
   * Liste des niveaux de santé [clé, malus] pour n niveaux (règle des fiches de référence) :
   * au-delà de 7, on ajoute des « Contusionné » en tête ; en dessous, on garde les premiers + « Neutralisé ».
   * @param {number} n
   * @returns {Array<[string, number|null]>}
   */
  static niveauxSante(n) {
    const base = WODHOMEBREW.niveauxSante;
    if (n <= 0) return [];
    if (n >= base.length) return [...Array(n - base.length).fill(base[0]), ...base];
    return [...base.slice(0, n - 1), base.at(-1)];
  }

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    // Santé : liste des niveaux, niveau actuel et malus (valeurs dérivées, non stockées)
    const s = this.sante;
    s.degats = s.contondants + s.letaux + s.aggraves;
    s.liste = this.constructor.niveauxSante(s.niveaux).map(([cle, malus], i) => ({
      cle, malus, coche: i < s.degats,
      type: i < s.aggraves ? "aggrave" : i < s.aggraves + s.letaux ? "letal" : i < s.degats ? "contondant" : null
    }));
    const actuel = s.degats > 0 ? s.liste[Math.min(s.degats, s.liste.length) - 1] : null;
    s.etat = actuel ? { cle: actuel.cle, malus: actuel.malus } : { cle: "indemne", malus: 0 };
  }
}
