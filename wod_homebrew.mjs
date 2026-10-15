/**
 * Monde des Ténèbres (Homebrew) — point d'entrée du système Foundry VTT V14.
 */
import { WODHOMEBREW } from "./module/config.mjs";
import * as data from "./module/data/_module.mjs";
import WodActor from "./module/documents/actor.mjs";
import WodItem from "./module/documents/item.mjs";
import WodActorSheet from "./module/applications/actor-sheet.mjs";
import WodItemSheet from "./module/applications/item-sheet.mjs";

Hooks.once("init", () => {
  console.log("wod_homebrew | Initialisation du Monde des Ténèbres (Homebrew)");

  CONFIG.WODHOMEBREW = WODHOMEBREW;
  game.system.api = { data, documents: { WodActor, WodItem } };

  // Documents
  CONFIG.Actor.documentClass = WodActor;
  CONFIG.Item.documentClass = WodItem;

  // Modèles de données : clés identiques à system.json → documentTypes
  CONFIG.Actor.dataModels = {
    mortel: data.MortelData,
    vampire: data.VampireData,
    goule: data.GouleData,
    garou: data.GarouData,
    mage: data.MageData
  };
  CONFIG.Item.dataModels = { objet: data.ObjetData };

  // Jetons : Volonté affichable en valeur
  CONFIG.Actor.trackableAttributes = Object.fromEntries(Object.keys(CONFIG.Actor.dataModels).map(type => [
    type, { bar: [], value: ["volonte.temporaire", "sante.contondants", "sante.letaux", "sante.aggraves"] }
  ]));

  // Fiches (ApplicationV2)
  const { DocumentSheetConfig } = foundry.applications.apps;
  DocumentSheetConfig.unregisterSheet(Actor, "core", foundry.appv1.sheets.ActorSheet);
  DocumentSheetConfig.registerSheet(Actor, "wod_homebrew", WodActorSheet, {
    types: Object.keys(CONFIG.Actor.dataModels), makeDefault: true, label: "WODHOMEBREW.Fiche.Acteur"
  });
  DocumentSheetConfig.unregisterSheet(Item, "core", foundry.appv1.sheets.ItemSheet);
  DocumentSheetConfig.registerSheet(Item, "wod_homebrew", WodItemSheet, {
    types: ["objet"], makeDefault: true, label: "WODHOMEBREW.Fiche.Objet"
  });
});
