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
      arete: points(1), avatar: points(1, { min: 1 }), quintessence: points(1, { max: 20 }), paradoxe: points(0, { max: 20 })
    };
  }

  /** Anciennes fiches : l'Avatar était un historique ; on reprend sa valeur (au moins 1) */
  static migrateData(source) {
    if ( (source.avatar === undefined) && Array.isArray(source.historiques) ) {
      const normaliser = s => String(s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
      const ancien = source.historiques.find(h => normaliser(h.nom) === "avatar");
      if ( ancien ) source.avatar = Math.max(1, Number(ancien.valeur) || 1);
    }
    return super.migrateData(source);
  }

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    // Quintessence maximale (règle « Avatar + Prime », réglable dans Règles des jets)
    this.quintessenceMax = quintessenceMax(this);
  }
}
