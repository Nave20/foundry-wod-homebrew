import TraitsConfig from "./traits-config.mjs";
import ReglesJets from "./regles-jets.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Panneau du MJ : point d'entrée unique vers les réglages internes du système.
 * Pour ajouter un réglage, ajouter une entrée à PanneauMJ.ENTREES.
 */
export default class PanneauMJ extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "wod-panneau-mj",
    classes: ["wod_homebrew", "panneau-mj"],
    window: { title: "WODHOMEBREW.PanneauMJ.Titre", icon: "fa-solid fa-gear" },
    position: { width: 420, height: "auto" },
    actions: { ouvrir: PanneauMJ.#onOuvrir }
  };

  static PARTS = {
    corps: { template: "systems/wod_homebrew/templates/apps/panneau-mj.hbs" }
  };

  /**
   * Réglages proposés : { id, icone, titre, aide (clés i18n), app (classe ApplicationV2) }
   * @type {Array<{id: string, icone: string, titre: string, aide: string, app: typeof ApplicationV2}>}
   */
  static ENTREES = [
    { id: "traits", icone: "fa-solid fa-list-check", titre: "WODHOMEBREW.Traits.Titre", aide: "WODHOMEBREW.Traits.Aide", app: TraitsConfig },
    { id: "jets", icone: "fa-solid fa-dice-d20", titre: "WODHOMEBREW.Jets.Titre", aide: "WODHOMEBREW.Jets.Aide", app: ReglesJets }
  ];

  /** Ouvre le panneau, ou le ferme s'il est déjà ouvert */
  static basculer() {
    const ouvert = foundry.applications.instances.get(this.DEFAULT_OPTIONS.id);
    if ( ouvert ) return ouvert.close();
    return new this().render({ force: true });
  }

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.entrees = this.constructor.ENTREES;
    return context;
  }

  static #onOuvrir(event, target) {
    const entree = this.constructor.ENTREES.find(e => e.id === target.dataset.id);
    if ( !entree ) return;
    const existante = foundry.applications.instances.get(entree.app.DEFAULT_OPTIONS.id);
    if ( existante ) return existante.bringToFront();
    new entree.app().render({ force: true });
  }

  /** Ajoute l'engrenage du panneau dans la barre d'outils de gauche (groupe Jetons), pour le MJ */
  static ajouterOutil(controls) {
    const jetons = controls.tokens;
    if ( !jetons ) return;
    jetons.tools.wodPanneauMJ = {
      name: "wodPanneauMJ",
      title: "WODHOMEBREW.PanneauMJ.Titre",
      icon: "fa-solid fa-gear",
      order: Object.keys(jetons.tools).length,
      button: true,
      visible: game.user.isGM,
      onChange: () => PanneauMJ.basculer()
    };
  }
}
