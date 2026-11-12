import { REGLES_SANTE_FORME } from "../formes.mjs";
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
    window: { title: "WODHOMEBREW.Jets.Titre", icon: "fa-solid fa-dice-d20", resizable: true },
    // Hauteur bornée : les réglages défilent, les boutons restent visibles en bas
    position: { width: 540, height: Math.min(760, Math.round(window.innerHeight * 0.85)) },
    form: { handler: ReglesJets.#onSubmit, closeOnSubmit: true },
    actions: { reinitialiser: ReglesJets.#onReinitialiser }
  };

  static PARTS = {
    form: { template: "systems/wod_homebrew/templates/apps/regles-jets.hbs", scrollable: [".regles-corps"] },
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
    context.santeFormeChoix = Object.entries(REGLES_SANTE_FORME).map(([cle, label]) => ({ cle, label, choisi: cle === context.regles?.santeForme }));
    return context;
  }

  static async #onReinitialiser() {
    await game.settings.set("wod_homebrew", "reglesJets", { ...REGLES_DEFAUT });
    for ( const actor of game.actors.filter(a => a.type === "mage") ) actor.reset();
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
      specialiteDifficulte: Number(donnees.specialiteDifficulte) || 0,
      volonteReussites: Number(donnees.volonteReussites) || 0,
      volonteSiReussite: !!donnees.volonteSiReussite,
      sangDes: Number(donnees.sangDes) || 0,
      sangDifficulte: Number(donnees.sangDifficulte) || 0,
      quintessenceParJet: Number(donnees.quintessenceParJet) || 0,
      quintessenceDifficulte: Number(donnees.quintessenceDifficulte) || 0,
      quintessenceAvatarPrime: !!donnees.quintessenceAvatarPrime,
      extensionDifficulte: Number(donnees.extensionDifficulte) || 0,
      malusBlessure: !!donnees.malusBlessure,
      volonteSansMalus: !!donnees.volonteSansMalus,
      santeForme: (donnees.santeForme in REGLES_SANTE_FORME) ? donnees.santeForme : REGLES_DEFAUT.santeForme,
      lancerParJoueurs: !!donnees.lancerParJoueurs,
      masquerVertus: !!donnees.masquerVertus
    });
    // Les fiches de garou recalculent leur piste de santé selon la forme
    for ( const actor of game.actors.filter(a => a.type === "garou") ) {
      actor.reset();
      actor.sheet?.rendered && actor.sheet.render();
    }
    // Les fiches de mage recalculent leur quintessence maximale
    for ( const actor of game.actors.filter(a => a.type === "mage") ) {
      actor.reset();
      actor.sheet?.rendered && actor.sheet.render();
    }
    // Les fiches de vampire et de goule affichent ou masquent les Vertus
    for ( const actor of game.actors.filter(a => ["vampire", "goule"].includes(a.type)) ) {
      actor.sheet?.rendered && actor.sheet.render();
    }
    ui.notifications.info("WODHOMEBREW.Jets.Enregistre", { localize: true });
  }
}
