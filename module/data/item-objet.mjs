import { WODHOMEBREW } from "../config.mjs";
import { lireDegats } from "../combat-regles.mjs";
import { points, texte } from "./fields.mjs";

const { BooleanField, HTMLField, StringField } = foundry.data.fields;

/**
 * Objet : arme, armure, artefact ou divers.
 * Une arme (ou un artefact offensif) se lance depuis l'onglet Combat ; une protection équipée ajoute
 * ses dés à l'encaissement et retire son malus aux jets de Dextérité.
 */
export default class ObjetData extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["WODHOMEBREW.Objet"];

  static defineSchema() {
    return {
      categorie: new StringField({ required: true, blank: false, initial: "divers", choices: () => WODHOMEBREW.categoriesObjet }),
      description: new HTMLField({ required: true, blank: true }),
      quantite: points(1),
      // Attaque
      degats: points(0),
      force: new BooleanField({ initial: false }),
      infini: new BooleanField({ initial: false }),
      type_degats: new StringField({ required: true, blank: true, initial: "", choices: () => WODHOMEBREW.typesDegats }),
      portee: texte(),
      attribut: new StringField({ required: true, blank: false, initial: "dexterite", choices: () => WODHOMEBREW.attributsCombat }),
      competence: new StringField({ required: true, blank: true, initial: "", choices: () => WODHOMEBREW.competencesCombat }),
      requis: texte(),
      // Protection
      armure: points(0),
      malus: points(0),
      equipe: new BooleanField({ initial: false })
    };
  }

  /** Les anciens dégâts étaient un texte libre (« Force + 2 ») */
  static migrateData(source) {
    if ( typeof source.degats === "string" ) {
      const { degats, force } = lireDegats(source.degats);
      source.degats = degats;
      if ( source.force === undefined ) source.force = force;
    }
    return super.migrateData(source);
  }

  /** L'objet peut servir à attaquer (arme ou artefact avec des dégâts) */
  get estOffensif() {
    if ( this.categorie === "arme" ) return true;
    return (this.categorie === "artefact") && ((this.degats > 0) || this.force || this.infini);
  }

  /** L'objet protège (armure ou artefact avec une valeur de protection) */
  get estProtection() {
    return ["armure", "artefact"].includes(this.categorie) && ((this.armure > 0) || (this.malus > 0));
  }
}
