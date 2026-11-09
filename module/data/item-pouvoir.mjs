import { WODHOMEBREW } from "../config.mjs";
import { texte } from "./fields.mjs";

const { HTMLField, NumberField, StringField } = foundry.data.fields;

/**
 * Pouvoir : pouvoir de discipline, don, rite ou autre. Sert au suivi et à la relecture ;
 * aucune automatisation (les joueurs annoncent et dépensent eux-mêmes).
 */
export default class PouvoirData extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["WODHOMEBREW.Pouvoir"];

  static defineSchema() {
    return {
      categorie: new StringField({ required: true, blank: false, initial: "discipline", choices: () => WODHOMEBREW.categoriesPouvoir }),
      groupe: texte(),
      niveau: new NumberField({ required: true, nullable: false, integer: true, min: 0, max: 10, initial: 1 }),
      edition: new StringField({ required: true, blank: false, initial: "V20", choices: () => WODHOMEBREW.editionsPouvoir }),
      cout: texte(),
      jet: texte(),
      description: new HTMLField({ required: true, blank: true }),
      nomAnglais: texte(),
      sources: texte()
    };
  }
}
