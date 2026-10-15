import { WODHOMEBREW } from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const TEMPLATES = "systems/wod_homebrew/templates/actor";

/** Champs d'en-tête propres à chaque créature (ordre d'affichage) */
const ENTETE = {
  mortel: ["occupation", "affiliation"],
  vampire: ["clan", "generation", "sire", "secte", "refuge"],
  goule: ["domitor", "clan_domitor", "secte"],
  garou: ["race", "auspice", "tribu", "meute", "totem", "rang"],
  mage: ["tradition", "essence", "cabale", "paradigme", "pratique", "instruments"]
};

/** Listes libres (nom + valeur) par onglet et par créature */
const LISTES_AVANTAGES = {
  commun: ["historiques", "atouts", "handicaps"],
  vampire: ["disciplines"],
  goule: ["disciplines"],
  garou: ["dons", "rites", "fetiches"],
  mage: []
};

/**
 * Fiche unique pour les cinq créatures. Mise en page volontairement simple :
 * elle sert d'abord à saisir et stocker les données.
 */
export default class WodActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["wod_homebrew", "actor", "standard-form"],
    position: { width: 720, height: 760 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      listeAjouter: WodActorSheet.#onListeAjouter,
      listeRetirer: WodActorSheet.#onListeRetirer,
      objetCreer: WodActorSheet.#onObjetCreer,
      objetEditer: WodActorSheet.#onObjetEditer,
      objetSupprimer: WodActorSheet.#onObjetSupprimer
    }
  };

  static PARTS = {
    entete: { template: `${TEMPLATES}/entete.hbs` },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    traits: { template: `${TEMPLATES}/traits.hbs`, scrollable: [""], templates: [`${TEMPLATES}/liste-traits.hbs`] },
    avantages: { template: `${TEMPLATES}/avantages.hbs`, scrollable: [""], templates: [`${TEMPLATES}/liste-traits.hbs`] },
    etat: { template: `${TEMPLATES}/etat.hbs`, scrollable: [""] },
    biographie: { template: `${TEMPLATES}/biographie.hbs`, scrollable: [""] }
  };

  static TABS = {
    primary: {
      tabs: [{ id: "traits" }, { id: "avantages" }, { id: "etat" }, { id: "biographie" }],
      initial: "traits",
      labelPrefix: "WODHOMEBREW.Fiche.Onglets"
    }
  };

  /* -------------------------------------------- */
  /*  Contexte                                    */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const system = actor.system;
    const source = actor._source.system;
    const fields = system.schema.fields;
    const type = actor.type;

    /** Prépare un champ simple (clé de premier niveau de system) */
    const champ = (cle, parentFields = fields, parentSource = source, chemin = "") => ({
      cle, field: parentFields[cle], value: parentSource[cle], chemin: `${chemin}${cle}`
    });

    Object.assign(context, {
      actor, system, source, systemFields: fields, type,
      typeLabel: CONFIG.Actor.typeLabels[type],
      isGM: game.user.isGM,
      estVampirique: type === "vampire" || type === "goule",
      estGarou: type === "garou",
      estMage: type === "mage",
      entete: {
        commun: ["concept", "nature", "attitude", "chronique", "joueur"].map(k => champ(k)),
        creature: (ENTETE[type] ?? []).map(k => champ(k)),
        reglages: ["jeu", "role", "statut", "echelle_max"].map(k => champ(k))
      },
      attributs: Object.entries(WODHOMEBREW.attributs).map(([groupe, cles]) => ({
        label: `WODHOMEBREW.Attributs.${groupe}`,
        traits: cles.map(k => champ(k, fields.attributs.fields, source.attributs))
      })),
      capacites: Object.entries(WODHOMEBREW.capacites[system.jeu] ?? WODHOMEBREW.capacites.V20).map(([groupe, cles]) => ({
        label: `WODHOMEBREW.Capacites.${groupe}`,
        traits: cles.map(k => champ(k, fields.capacites.fields, source.capacites))
      })),
      listesAvantages: [...LISTES_AVANTAGES.commun, ...(LISTES_AVANTAGES[type] ?? [])].map(cle => this.#liste(cle)),
      listeSecondaires: this.#liste("capacites_secondaires"),
      objets: actor.items.contents.sort((a, b) => a.sort - b.sort),
      categoriesObjet: WODHOMEBREW.categoriesObjet
    });

    // Vampire / Goule
    if (context.estVampirique) {
      context.vertus = ["conscience", "maitrise_de_soi", "courage"].map(k => champ(k, fields.vertus.fields, source.vertus));
    }
    // Mage
    if (context.estMage) {
      context.spheres = WODHOMEBREW.spheres.map(k => champ(k, fields.spheres.fields, source.spheres));
    }
    // Santé (libellés des niveaux)
    context.sante = system.sante.liste.map(n => ({
      ...n,
      label: `WODHOMEBREW.Sante.Niveaux.${n.cle}`,
      malusTexte: n.malus === null ? "" : n.malus === 0 ? "0" : String(n.malus)
    }));
    context.etatSante = `WODHOMEBREW.Sante.Niveaux.${system.sante.etat.cle}`;
    return context;
  }

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (partId in (context.tabs ?? {})) context.tab = context.tabs[partId];
    if (partId === "biographie") {
      const TextEditor = foundry.applications.ux.TextEditor.implementation;
      const opts = { secrets: this.actor.isOwner, rollData: this.actor.getRollData(), relativeTo: this.actor };
      context.bio = {};
      for (const cle of ["historique", "apparence", "relations", "notes_mj"]) {
        context.bio[cle] = {
          field: context.systemFields.biographie.fields[cle],
          value: context.source.biographie[cle],
          enriched: await TextEditor.enrichHTML(context.source.biographie[cle], opts)
        };
      }
    }
    return context;
  }

  /** Données d'affichage d'une liste libre { nom, valeur } */
  #liste(cle) {
    return {
      cle,
      label: `WODHOMEBREW.Actor.FIELDS.${cle}.label`,
      lignes: (this.actor._source.system[cle] ?? []).map((l, index) => ({ ...l, index }))
    };
  }

  /* -------------------------------------------- */
  /*  Actions (this = la fiche)                   */
  /* -------------------------------------------- */

  static async #onListeAjouter(event, target) {
    const cle = target.dataset.liste;
    const liste = foundry.utils.deepClone(this.actor._source.system[cle] ?? []);
    liste.push({ nom: "", valeur: 0 });
    return this.actor.update({ [`system.${cle}`]: liste });
  }

  static async #onListeRetirer(event, target) {
    const { liste: cle, index } = target.dataset;
    const liste = foundry.utils.deepClone(this.actor._source.system[cle] ?? []);
    liste.splice(Number(index), 1);
    return this.actor.update({ [`system.${cle}`]: liste });
  }

  static async #onObjetCreer() {
    return Item.implementation.create({ name: _loc("WODHOMEBREW.Objet.Nouveau"), type: "objet" }, { parent: this.actor });
  }

  static #objet(target) {
    return this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
  }

  static async #onObjetEditer(event, target) {
    return WodActorSheet.#objet.call(this, target)?.sheet.render({ force: true });
  }

  static async #onObjetSupprimer(event, target) {
    return WodActorSheet.#objet.call(this, target)?.deleteDialog();
  }
}
