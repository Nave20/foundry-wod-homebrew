/**
 * Monde des Ténèbres (Homebrew) — point d'entrée du système Foundry VTT V14.
 */
import { WODHOMEBREW } from "./module/config.mjs";
import * as data from "./module/data/_module.mjs";
import WodActor from "./module/documents/actor.mjs";
import WodItem from "./module/documents/item.mjs";
import WodActorSheet from "./module/applications/actor-sheet.mjs";
import WodItemSheet from "./module/applications/item-sheet.mjs";
import { registerHelpers } from "./module/helpers.mjs";
import { registerTraitsSettings } from "./module/traits.mjs";
import { registerProfilsHooks, registerProfilsSettings } from "./module/profils.mjs";
import { registerDesSettings, registerJetsChatHooks } from "./module/des.mjs";
import TraitsConfig from "./module/applications/traits-config.mjs";
import PanneauMJ from "./module/applications/panneau-mj.mjs";
import { registerAccueilHooks, registerAccueilSettings } from "./module/accueil.mjs";

Hooks.once("init", () => {
  console.log("wod_homebrew | Initialisation du Monde des Ténèbres (Homebrew)");

  CONFIG.WODHOMEBREW = WODHOMEBREW;
  registerHelpers();
  registerTraitsSettings(TraitsConfig);
  registerProfilsSettings();
  registerDesSettings();
  registerAccueilSettings();
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

// Panneau du MJ : engrenage dans la barre d'outils de gauche
Hooks.on("getSceneControlButtons", controls => PanneauMJ.ajouterOutil(controls));

// Panneau du MJ : bouton dans l'onglet Paramètres (fonctionne même sans scène active)
Hooks.on("renderSettings", (app, element) => {
  if ( !game.user.isGM || element.querySelector(".wod-panneau-mj") ) return;
  const titre = element.querySelector("section.settings h4.divider");
  if ( !titre ) return;
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = "wod-panneau-mj";
  bouton.innerHTML = `<i class="fa-solid fa-gear" inert></i> ${game.i18n.localize("WODHOMEBREW.PanneauMJ.Titre")}`;
  bouton.addEventListener("click", () => PanneauMJ.basculer());
  titre.after(bouton);
});

// Sans scène active, Foundry ignore les clics de la barre de gauche (canvas.ready faux) :
// l'engrenage du panneau reste alors cliquable grâce à ce gestionnaire.
Hooks.on("renderSceneControls", (app, element) => {
  const bouton = element.querySelector('button[data-tool="wodPanneauMJ"]');
  if ( !bouton || bouton.dataset.wodHorsScene ) return;
  bouton.dataset.wodHorsScene = "1";
  bouton.addEventListener("click", () => { if ( !canvas.ready ) PanneauMJ.basculer(); });
});

// Accueil : scène créée au premier lancement, fond quand aucune scène n'est active
registerAccueilHooks();

// Profils de traits : un monde déjà configuré devient « personnalisé »
registerProfilsHooks();

// Jets : bouton « Étendre » des cartes du chat
registerJetsChatHooks();
