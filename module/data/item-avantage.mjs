import { WODHOMEBREW } from "../config.mjs";
import { texte } from "./fields.mjs";

const { HTMLField, StringField } = foundry.data.fields;

/**
 * Atout ou handicap de référence (compendium). Glissé sur une fiche, il ajoute une ligne « nom + coût »
 * à la liste Atouts ou Handicaps du personnage (il ne reste pas comme objet sur la fiche).
 */
export default class AvantageData extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["WODHOMEBREW.Avantage"];

  static defineSchema() {
    return {
      categorie: new StringField({ required: true, blank: false, initial: "atout", choices: () => WODHOMEBREW.categoriesAvantage }),
      groupe: texte(),
      cout: texte(),
      description: new HTMLField({ required: true, blank: true })
    };
  }

  /** Points inscrits sur la fiche : premier nombre du coût, en valeur positive (« 1 à 5 » → 1, « -2 » → 2) */
  get valeur() {
    const m = String(this.cout ?? "").match(/\d+/);
    return m ? Number(m[0]) : 0;
  }

  /** Liste de la fiche qui reçoit cet élément */
  get liste() {
    return this.categorie === "handicap" ? "handicaps" : "atouts";
  }
}
