import { WODHOMEBREW } from "../config.mjs";
import { quintessenceMax } from "../des.mjs";
import ActorBaseData from "./actor-base.mjs";
import { groupe, jauge, listeTraits, points, texte } from "./fields.mjs";

const { SchemaField } = foundry.data.fields;

/* -------------------------------------------- */
/*  Blocs partagés                              */
/* -------------------------------------------- */

/** Vertus, Voie et Sang (Vampire, Goule) */
function vampirique({ sangMax, sang }) {
  return {
    disciplines: listeTraits(),
    vertus: groupe(["conscience", "maitrise_de_soi", "courage"], 1),
    voie: new SchemaField({ nom: texte("Humanité"), valeur: points(7) }),
    sang: new SchemaField({ valeur: points(sang), max: points(sangMax), par_tour: points(1) })
  };
}

/* -------------------------------------------- */
/*  Créatures                                   */
/* -------------------------------------------- */

export class MortelData extends ActorBaseData {
  static defineSchema() {
    return { ...super.defineSchema(), occupation: texte(), affiliation: texte() };
  }
}

export class VampireData extends ActorBaseData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      clan: texte(), generation: points(13, { min: 1 }), sire: texte(), secte: texte(), refuge: texte(),
      ...vampirique({ sangMax: 10, sang: 10 })
    };
  }
}

export class GouleData extends ActorBaseData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      domitor: texte(), clan_domitor: texte(), secte: texte(),
      ...vampirique({ sangMax: 3, sang: 1 })
    };
  }
}

export class GarouData extends ActorBaseData {
  static JEU_DEFAUT = "W20";

  static defineSchema() {
    return {
      ...super.defineSchema(),
      race: texte(), auspice: texte(), tribu: texte(), meute: texte(), totem: texte(), rang: points(1),
      dons: listeTraits(), rites: listeTraits(), fetiches: listeTraits(),
      rage: jauge(1), gnose: jauge(1),
      renommee: new SchemaField({ gloire: jauge(0), honneur: jauge(0), sagesse: jauge(0) })
    };
  }
}

export class MageData extends ActorBaseData {
  static JEU_DEFAUT = "M20";

  static defineSchema() {
    return {
      ...super.defineSchema(),
      tradition: texte(), essence: texte(), cabale: texte(), paradigme: texte(), pratique: texte(), instruments: texte(),
      spheres: groupe(WODHOMEBREW.spheres, 0),
      arete: points(1), quintessence: points(1), paradoxe: points(0)
    };
  }

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    // Quintessence maximale (règle « Avatar + Prime », réglable dans Règles des jets)
    this.quintessenceMax = quintessenceMax(this);
  }
}
