import { WODHOMEBREW } from "../config.mjs";
import { points, texte } from "./fields.mjs";

const { HTMLField, StringField } = foundry.data.fields;

/**
 * Objet : arme, armure ou divers.
 */
export default class ObjetData extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["WODHOMEBREW.Objet"];

  static defineSchema() {
    return {
      categorie: new StringField({ required: true, blank: false, initial: "divers", choices: () => WODHOMEBREW.categoriesObjet }),
      description: new HTMLField({ required: true, blank: true }),
      quantite: points(1),
      degats: texte(),
      type_degats: new StringField({ required: true, blank: true, initial: "", choices: () => WODHOMEBREW.typesDegats }),
      portee: texte(),
      armure: points(0),
      malus: points(0)
    };
  }
}
