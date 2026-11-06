import { WODHOMEBREW } from "../config.mjs";
import { REGLAGE, SYSTEME, clesAjoutees, configTraits, nomLivre, nouvelleCle } from "../traits.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Fenêtre du MJ : « Traits de la chronique ».
 * Un onglet pour les attributs (communs à tous les jeux) et un par jeu pour les capacités.
 * Les modifications sont gardées en mémoire d'un onglet à l'autre, puis enregistrées d'un coup.
 */
export default class TraitsConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "wod-traits-config",
    tag: "form",
    classes: ["wod_homebrew", "traits-config", "standard-form"],
    window: { title: "WODHOMEBREW.Traits.Titre", icon: "fa-solid fa-list-check", resizable: true },
    position: { width: 620, height: 720 },
    form: { handler: TraitsConfig.#onSubmit, closeOnSubmit: true },
    actions: {
      ajouter: TraitsConfig.#onAjouter,
      retirer: TraitsConfig.#onRetirer,
      reinitialiser: TraitsConfig.#onReinitialiser
    }
  };

  static PARTS = {
    form: { template: "systems/wod_homebrew/templates/apps/traits-config.hbs", scrollable: [".liste-config"] },
    footer: { template: "templates/generic/form-footer.hbs" }
  };

  /** Copie de travail du réglage */
  #config = configTraits();

  /** Onglet affiché : "attributs" ou un jeu (V20, W20…) */
  #onglet = "attributs";

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const onglets = { attributs: "WODHOMEBREW.Traits.OngletAttributs", ...WODHOMEBREW.jeux };
    context.onglets = Object.entries(onglets).map(([cle, label]) => ({ cle, label, actif: cle === this.#onglet }));
    context.estAttributs = this.#onglet === "attributs";
    if ( context.estAttributs ) {
      const r = this.#config.attributs.renommes;
      context.groupes = Object.entries(WODHOMEBREW.attributs).map(([groupe, cles]) => ({
        label: `WODHOMEBREW.Attributs.${groupe}`,
        base: cles.map(cle => ({ cle, livre: nomLivre("attributs", cle), nom: r[cle] ?? "", name: `attributs.renommes.${cle}` }))
      }));
    } else {
      const jeu = this.#onglet;
      const c = this.#config.capacites[jeu];
      context.jeu = jeu;
      context.groupes = Object.entries(WODHOMEBREW.capacites[jeu]).map(([groupe, cles]) => ({
        groupe,
        label: `WODHOMEBREW.Capacites.${groupe}`,
        base: cles.map(cle => ({
          cle, livre: nomLivre("capacites", cle), nom: c.renommes[cle] ?? "", masque: c.masques.includes(cle),
          name: `capacites.${jeu}.renommes.${cle}`, nameMasque: `capacites.${jeu}.masques.${cle}`
        })),
        ajouts: c.ajouts[groupe].map((a, i) => ({ ...a, prefixe: `capacites.${jeu}.ajouts.${groupe}.${i}` }))
      }));
    }
    context.buttons = [
      { type: "button", action: "reinitialiser", icon: "fa-solid fa-rotate-left", label: "WODHOMEBREW.Traits.Reinitialiser" },
      { type: "submit", icon: "fa-solid fa-floppy-disk", label: "WODHOMEBREW.Traits.Enregistrer" }
    ];
    return context;
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector("select.onglet")?.addEventListener("change", event => {
      this.#lireFormulaire();
      this.#onglet = event.target.value;
      this.render();
    });
    // Curseur dans la ligne ajoutée (nom vide)
    this.element.querySelector("input.nom-ajout[value='']")?.focus();
  }

  /** Reporte les champs de l'onglet affiché dans la copie de travail */
  #lireFormulaire() {
    const data = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(this.element).object);
    const propre = obj => Object.fromEntries(Object.entries(obj ?? {})
      .map(([k, v]) => [k, String(v ?? "").trim()]).filter(([, v]) => v));
    if ( this.#onglet === "attributs" ) {
      this.#config.attributs.renommes = propre(data.attributs?.renommes);
      return;
    }
    const jeu = this.#onglet;
    const d = data.capacites?.[jeu] ?? {};
    const c = this.#config.capacites[jeu];
    c.renommes = propre(d.renommes);
    c.masques = Object.entries(d.masques ?? {}).filter(([, v]) => v).map(([k]) => k);
    // Clés déjà prises : capacités et attributs de base, et capacités ajoutées
    const prises = new Set([...WODHOMEBREW.toutesCapacites, ...Object.values(WODHOMEBREW.attributs).flat(),
      ...clesAjoutees(this.#config)]);
    for ( const groupe of Object.keys(c.ajouts) ) {
      c.ajouts[groupe] = Object.values(d.ajouts?.[groupe] ?? {}).map(a => {
        const nom = String(a.nom ?? "").trim();
        if ( !nom ) return null;
        let cle = a.cle;
        if ( !cle ) { cle = nouvelleCle(nom, prises); prises.add(cle); }
        return { cle, nom };
      }).filter(Boolean);
    }
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #onAjouter(event, target) {
    this.#lireFormulaire();
    this.#config.capacites[this.#onglet].ajouts[target.dataset.groupe].push({ cle: "", nom: "" });
    this.render();
  }

  static #onRetirer(event, target) {
    this.#lireFormulaire();
    const { groupe, index } = target.dataset;
    this.#config.capacites[this.#onglet].ajouts[groupe].splice(Number(index), 1);
    this.render();
  }

  static #onReinitialiser() {
    if ( this.#onglet === "attributs" ) this.#config.attributs.renommes = {};
    else {
      const c = this.#config.capacites[this.#onglet];
      c.renommes = {};
      c.masques = [];
      for ( const g of Object.keys(c.ajouts) ) c.ajouts[g] = [];
    }
    this.render();
  }

  static async #onSubmit() {
    this.#lireFormulaire();
    await game.settings.set(SYSTEME, REGLAGE, this.#config);
    ui.notifications.info("WODHOMEBREW.Traits.Enregistre", { localize: true });
  }
}
