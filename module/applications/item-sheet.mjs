const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export default class WodItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["wod_homebrew", "item", "standard-form"],
    position: { width: 480, height: 560 },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  static PARTS = {
    fiche: { template: "systems/wod_homebrew/templates/item/objet.hbs", scrollable: [".details"] }
  };

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.item;
    context.item = item;
    context.source = item._source.system;
    context.systemFields = item.system.schema.fields;
    context.estArme = ["arme", "artefact"].includes(item.system.categorie);
    context.estArmure = ["armure", "artefact"].includes(item.system.categorie);
    context.descriptionEnrichie = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      item.system.description, { secrets: item.isOwner, rollData: item.getRollData(), relativeTo: item }
    );
    return context;
  }
}
