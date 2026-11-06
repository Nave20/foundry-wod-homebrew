import { WODHOMEBREW } from "../config.mjs";
import { CHAMPS_PREFAITS, LISTES_PREFAITES } from "../listes.mjs";
import MenuSuggestions from "./suggestions.mjs";
import { capacitesAffichees, configTraits, nomAttribut } from "../traits.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const TEMPLATES = "systems/wod_homebrew/templates/actor";

/** En-tête compacte : 4 champs clés par créature, sur une ligne */
const ENTETE = {
  mortel: ["concept", "occupation", "nature", "attitude"],
  vampire: ["clan", "generation", "nature", "attitude"],
  goule: ["domitor", "clan_domitor", "nature", "attitude"],
  garou: ["tribu", "auspice", "nature", "attitude"],
  mage: ["tradition", "essence", "nature", "attitude"]
};

/** Section « Identité » de l'onglet Biographie : le reste des champs d'identité */
const IDENTITE = {
  mortel: ["chronique", "joueur", "affiliation"],
  vampire: ["concept", "chronique", "joueur", "sire", "secte", "refuge"],
  goule: ["concept", "chronique", "joueur", "secte"],
  garou: ["concept", "chronique", "joueur", "race", "meute", "totem", "rang"],
  mage: ["concept", "chronique", "joueur", "cabale", "paradigme", "pratique", "instruments"]
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
      point: WodActorSheet.#onPoint,
      specialite: WodActorSheet.#onSpecialite,
      objetCreer: WodActorSheet.#onObjetCreer,
      objetEditer: WodActorSheet.#onObjetEditer,
      objetSupprimer: WodActorSheet.#onObjetSupprimer
    }
  };

  static PARTS = {
    entete: { template: `${TEMPLATES}/entete.hbs` },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    traits: { template: `${TEMPLATES}/traits.hbs`, scrollable: [""], templates: [`${TEMPLATES}/liste-traits.hbs`, `${TEMPLATES}/trait.hbs`] },
    avantages: { template: `${TEMPLATES}/avantages.hbs`, scrollable: [""], templates: [`${TEMPLATES}/liste-traits.hbs`] },
    etat: { template: `${TEMPLATES}/etat.hbs`, scrollable: [""], templates: [`${TEMPLATES}/trait.hbs`] },
    biographie: { template: `${TEMPLATES}/biographie.hbs`, scrollable: [""] }
  };

  static TABS = {
    primary: {
      tabs: [{ id: "traits" }, { id: "avantages" }, { id: "etat" }, { id: "biographie" }],
      initial: "traits",
      labelPrefix: "WODHOMEBREW.Fiche.Onglets"
    }
  };

  /** Panneau des réglages ouvert ? */
  #reglagesOuverts = false;

  /** @inheritDoc */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);
    // Classe par créature : sert aux couleurs de la fiche (mage bleu, vampire rouge, garou vert)
    options.classes.push(`creature-${options.document.type}`);
    return options;
  }

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
    const traitsChronique = configTraits();
    /** Champ noté avec sa spécialité (attributs, capacités) */
    const avecSpecialite = c => ({ ...c, spec: { name: `system.specialites.${c.cle}`, value: source.specialites?.[c.cle] ?? "" } });

    Object.assign(context, {
      actor, system, source, systemFields: fields, type,
      typeLabel: CONFIG.Actor.typeLabels[type],
      isGM: game.user.isGM,
      echelle: system.echelle_max,
      reglagesOuverts: this.#reglagesOuverts,
      estVampirique: type === "vampire" || type === "goule",
      estGarou: type === "garou",
      estMage: type === "mage",
      entete: {
        haut: (ENTETE[type] ?? []).map(k => champ(k)),
        identite: (IDENTITE[type] ?? []).map(k => champ(k)),
        reglages: ["jeu", "role", "statut", "echelle_max"].map(k => champ(k))
      },
      attributs: Object.entries(WODHOMEBREW.attributs).map(([groupe, cles]) => ({
        label: `WODHOMEBREW.Attributs.${groupe}`,
        traits: cles.map(k => ({
          ...avecSpecialite(champ(k, fields.attributs.fields, source.attributs)),
          nom: nomAttribut(k, traitsChronique), name: `system.attributs.${k}`
        }))
      })),
      // Capacités du jeu, avec les noms, masques et ajouts des « Traits de la chronique »
      capacites: capacitesAffichees(system.jeu, traitsChronique).map(({ groupe, traits }) => ({
        cle: groupe,
        label: `WODHOMEBREW.Capacites.${groupe}`,
        traits: traits.map(t => t.ajoutee ? {
          cle: t.cle, nom: t.nom, name: `system.capacites_ajoutees.${t.cle}.valeur`,
          value: source.capacites_ajoutees?.[t.cle]?.valeur ?? 0,
          spec: { name: `system.capacites_ajoutees.${t.cle}.specialite`, value: source.capacites_ajoutees?.[t.cle]?.specialite ?? "" }
        } : {
          ...avecSpecialite(champ(t.cle, fields.capacites.fields, source.capacites)),
          nom: t.nom, name: `system.capacites.${t.cle}`
        }),
        secondaires: this.#liste("capacites_secondaires").lignes.filter(l => l.categorie === groupe)
      })),
      listesAvantages: [...LISTES_AVANTAGES.commun, ...(LISTES_AVANTAGES[type] ?? [])].map(cle => this.#liste(cle)),
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
    const prefaite = LISTES_PREFAITES[cle]?.[this.actor.type];
    return {
      cle,
      suggestions: !!prefaite?.length,
      label: `WODHOMEBREW.Actor.FIELDS.${cle}.label`,
      lignes: (this.actor._source.system[cle] ?? []).map((l, index) => ({ ...l, index }))
    };
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    // Le panneau « Réglages de la fiche » reste ouvert d'un rendu à l'autre
    this.element.querySelector("details.reglages")?.addEventListener("toggle", e => this.#reglagesOuverts = e.target.open);
    if ( !this.isEditable ) return;
    // Menu de suggestions (listes préfaites) sur les champs « nom » des historiques, atouts et handicaps
    const labelCreature = _loc("WODHOMEBREW.Suggestions.creature", { creature: _loc(CONFIG.Actor.typeLabels[this.actor.type]) });
    for ( const input of this.element.querySelectorAll("input[data-suggestions]") ) {
      const entrees = LISTES_PREFAITES[input.dataset.suggestions]?.[this.actor.type];
      if ( entrees ) new MenuSuggestions(input, entrees, { conteneur: this.element, labelCreature });
    }
    // Capacités secondaires : nom figé une fois saisi, double-clic pour renommer, nom vide = ligne retirée
    for ( const ligne of this.element.querySelectorAll(".secondaire[data-index]") ) {
      const index = Number(ligne.dataset.index);
      const label = ligne.querySelector("label.nom-trait");
      label?.addEventListener("dblclick", () => {
        const hidden = ligne.querySelector("input.valeur-nom");
        this.#editerEnLigne(label.querySelector(".libelle"), hidden.value, v => {
          if ( !v ) return this.#retirerLigne("capacites_secondaires", index);
          hidden.value = v;
          hidden.dispatchEvent(new Event("change", { bubbles: true }));
        });
      });
      const saisie = ligne.querySelector("input.nom-secondaire");
      if ( saisie ) {
        saisie.focus();
        saisie.addEventListener("blur", () => { if ( !saisie.value.trim() ) this.#retirerLigne("capacites_secondaires", index); });
      }
    }

    // Champs d'en-tête : nature, attitude, clan, secte, tribu, auspice, tradition…
    for ( const [cle, entrees] of Object.entries(CHAMPS_PREFAITS) ) {
      const input = this.element.querySelector(`input[name="system.${cle}"]`);
      if ( input ) new MenuSuggestions(input, entrees, { conteneur: this.element, labelCreature });
    }
  }

  /**
   * Choix d'un nom dans une liste préfaite : si la valeur de la ligne est encore à 0,
   * on y met le coût de l'atout ou du handicap avant l'enregistrement.
   * @inheritDoc
   */
  _onChangeForm(formConfig, event) {
    const champ = event.target;
    // Nom secondaire vide : la ligne est retirée au blur. Saisie en ligne : validée par son propre code.
    if ( champ.classList?.contains("nom-secondaire") && !champ.value.trim() ) return;
    if ( champ.classList?.contains("saisie-en-ligne") ) return;
    const m = champ.name?.match(/^system\.(\w+)\.(\d+)\.nom$/);
    const cout = m && LISTES_PREFAITES[m[1]]?.[this.actor.type]?.find(([nom]) => nom === champ.value)?.[1];
    if ( cout ) {
      const valeur = this.form.elements[`system.${m[1]}.${m[2]}.valeur`];
      if ( valeur && !Number(valeur.value) ) valeur.value = cout;
    }
    super._onChangeForm(formConfig, event);
  }

  /* -------------------------------------------- */
  /*  Actions (this = la fiche)                   */
  /* -------------------------------------------- */

  /** Clic sur un point : monte jusqu'à lui, ou l'enlève si c'est le dernier point rempli */
  static #onPoint(event, target) {
    const input = target.closest(".wod-points")?.querySelector("input[type=hidden]");
    if ( !input ) return;
    const i = Number(target.dataset.valeur);
    input.value = (i === Number(input.value)) ? i - 1 : i;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /** Clic sur ✎ : saisie de la spécialité du trait, à la place de son affichage */
  static #onSpecialite(event, target) {
    const ligne = target.closest(".form-group");
    const hidden = ligne?.querySelector("input.valeur-specialite");
    if ( !hidden ) return;
    ligne.querySelector(".specialite")?.remove();
    const place = document.createElement("span");
    target.replaceWith(place);
    this.#editerEnLigne(place, hidden.value, v => {
      hidden.value = v;
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
    }, "WODHOMEBREW.Fiche.Specialite");
  }

  /**
   * Remplace un élément par un petit champ texte. Entrée ou clic ailleurs valide, Échap annule.
   * @param {HTMLElement} element
   * @param {string} valeur
   * @param {(v: string) => void} valider   Appelé avec le texte saisi (rogné), seulement s'il a changé
   * @param {string} [placeholder]          Clé de traduction
   */
  #editerEnLigne(element, valeur, valider, placeholder) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "saisie-en-ligne";
    input.value = valeur;
    if ( placeholder ) input.placeholder = _loc(placeholder);
    let fini = false;
    const terminer = ok => {
      if ( fini ) return;
      fini = true;
      const v = input.value.trim();
      if ( ok && (v !== valeur) ) valider(v);
      else this.render();
    };
    input.addEventListener("keydown", e => {
      if ( e.key === "Enter" ) { e.preventDefault(); terminer(true); }
      else if ( e.key === "Escape" ) { e.preventDefault(); e.stopPropagation(); terminer(false); }
    });
    input.addEventListener("blur", () => terminer(true));
    element.replaceWith(input);
    input.focus();
    input.select();
  }

  /** Retire la ligne `index` d'une liste libre */
  #retirerLigne(cle, index) {
    const liste = foundry.utils.deepClone(this.actor._source.system[cle] ?? []);
    if ( !liste[index] ) return;
    liste.splice(index, 1);
    return this.actor.update({ [`system.${cle}`]: liste });
  }

  static async #onListeAjouter(event, target) {
    const cle = target.dataset.liste;
    const liste = foundry.utils.deepClone(this.actor._source.system[cle] ?? []);
    const ligne = { nom: "", valeur: 0 };
    if ( target.dataset.categorie ) ligne.categorie = target.dataset.categorie;
    liste.push(ligne);
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
