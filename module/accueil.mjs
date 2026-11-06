/**
 * Accueil du monde :
 * - au premier lancement (MJ, aucune scène), crée et active une scène « Accueil » avec l'image du système ;
 * - quand aucune scène n'est active, affiche cette image en fond au lieu d'un écran noir.
 */

const SYSTEME = "wod_homebrew";
export const IMAGE_ACCUEIL = "systems/wod_homebrew/assets/accueil-4k.webp";
const LARGEUR = 3840;
const HAUTEUR = 2160;

export function registerAccueilSettings() {
  game.settings.register(SYSTEME, "accueilCree", { scope: "world", config: false, type: Boolean, default: false });
}

/**
 * Crée la scène d'accueil et l'active.
 * @returns {Promise<Scene>}
 */
export async function creerSceneAccueil() {
  const scene = await Scene.implementation.create({
    name: game.i18n.localize("WODHOMEBREW.Accueil.Scene"),
    width: LARGEUR,
    height: HAUTEUR,
    padding: 0,
    grid: { type: CONST.GRID_TYPES.GRIDLESS },
    tokenVision: false,
    navigation: true,
    levels: [{ name: game.i18n.localize("WODHOMEBREW.Accueil.Scene"), background: { src: IMAGE_ACCUEIL, color: "#000000" } }],
    flags: { [SYSTEME]: { accueil: true } }
  });
  await scene.activate();
  return scene;
}

/** Premier lancement : uniquement pour un MJ, si le monde n'a encore aucune scène */
async function premierLancement() {
  if ( !game.user.isGM ) return;
  // Scène d'accueil d'une version précédente : mise à l'image et aux dimensions actuelles
  for ( const scene of game.scenes.filter(s => s.getFlag(SYSTEME, "accueil")) ) {
    const niveau = scene.levels.contents[0];
    if ( (scene.width !== LARGEUR) || (scene.height !== HAUTEUR) ) await scene.update({ width: LARGEUR, height: HAUTEUR });
    if ( niveau && (niveau.background.src !== IMAGE_ACCUEIL) ) await niveau.update({ "background.src": IMAGE_ACCUEIL });
  }
  if ( game.settings.get(SYSTEME, "accueilCree") ) return;
  if ( game.scenes.size === 0 ) await creerSceneAccueil();
  await game.settings.set(SYSTEME, "accueilCree", true);
}

/** Fond de secours quand aucune scène n'est affichée */
function majFond() {
  document.body.classList.toggle("wod-sans-scene", !canvas.scene);
}

export function registerAccueilHooks() {
  Hooks.once("ready", () => {
    majFond();
    premierLancement();
  });
  Hooks.on("canvasReady", () => {
    majFond();
    // Scène d'accueil : l'image remplit toute la fenêtre (comme « cover » en CSS)
    if ( canvas.scene?.getFlag(SYSTEME, "accueil") ) {
      const scale = Math.max(window.innerWidth / LARGEUR, window.innerHeight / HAUTEUR);
      canvas.pan({ x: LARGEUR / 2, y: HAUTEUR / 2, scale });
    }
  });
  Hooks.on("canvasTearDown", majFond);
}
