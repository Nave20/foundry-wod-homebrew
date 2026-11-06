import { REGLES_DEFAUT, reglesJets } from "../des.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Fenêtre du MJ : « Règles des jets » : dé, difficulté, 10 qui compte double, 1 qui retire une réussite.
 * Aussi : seuil de réussite critique, difficulté ajoutée pour une capacité à 0, effet d'une spécialité.
 */
export default class ReglesJets extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "wod-regles-jets",
    tag: "form",
    classes: ["wod_homebrew", "regles-jets", "standard-form"],
    window: { title: "WODHOMEBREW.Jets.Titre", icon: "fa-solid fa-dice-d20" },
    position: { width: 520, height: "auto" },
    form: { handler: ReglesJets.#onSubmit, closeOnSubmit: true },
    actions: { reinitialiser: ReglesJets.#onReinitialiser }
  };

  static PARTS = {
    form: { template: "systems/wod_homebrew/templates/apps/regles-jets.hbs" },
    footer: { template: "templates/generic/form-footer.hbs" }
  };

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.regles = reglesJets();
    context.buttons = [
      { type: "button", action: "reinitialiser", icon: "fa-solid fa-rotate-left", label: "WODHOMEBREW.Jets.Reinitialiser" },
      { type: "submit", icon: "fa-solid fa-floppy-disk", label: "WODHOMEBREW.Traits.Enregistrer" }
    ];
    return context;
  }

  static async #onReinitialiser() {
    await game.settings.set("wod_homebrew", "reglesJets", { ...REGLES_DEFAUT });
    this.render();
  }

  static async #onSubmit(event, form, formData) {
    const donnees = foundry.utils.expandObject(formData.object);
    await game.settings.set("wod_homebrew", "reglesJets", {
      ...reglesJets(),
      de: Number(donnees.de) || REGLES_DEFAUT.de,
      difficulte: Number(donnees.difficulte) || REGLES_DEFAUT.difficulte,
      dixDouble: !!donnees.dixDouble,
      unRetire: !!donnees.unRetire,
      seuilCritique: Number(donnees.seuilCritique) || 0,
      capaciteNulle: Number(donnees.capaciteNulle) || 0,
      specialiteDes: Number(donnees.specialiteDes) || 0,
      specialiteDifficulte: Number(donnees.specialiteDifficulte) || 0
    });
    ui.notifications.info("WODHOMEBREW.Jets.Enregistre", { localize: true });
  }
}
