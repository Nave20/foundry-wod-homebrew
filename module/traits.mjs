import { WODHOMEBREW } from "./config.mjs";

/**
 * « Traits de la chronique » : réglage du monde qui renomme, masque ou ajoute des traits de base.
 * Les clés internes ne changent jamais (les jets de dés s'appuient dessus) : seul l'affichage change.
 *
 * Forme du réglage :
 * {
 *   attributs: { renommes: { apparence: "Sang-froid" } },
 *   capacites: {
 *     V20: {
 *       renommes: { informatique: "Ordinateurs" },
 *       masques: ["informatique"],
 *       ajouts: { competences: [{ cle: "pilotage", nom: "Pilotage" }] }
 *     }
 *   }
 * }
 * Les valeurs des capacités ajoutées sont stockées dans system.capacites_ajoutees.<clé>.
 */

export const SYSTEME = "wod_homebrew";
export const REGLAGE = "traits";

/** Réglage du monde, toujours complet (objets vides par défaut) */
export function configTraits() {
  return normaliserTraits(game.settings.get(SYSTEME, REGLAGE));
}

/**
 * Complète une configuration brute (réglage, profil, fichier importé) : chaque jeu et chaque colonne existent,
 * les masques sont triés et sans doublon.
 * @param {object} [brut]
 */
export function normaliserTraits(brut = {}) {
  brut ??= {};
  // trierAlpha : colonnes de capacités triées par ordre alphabétique (sinon ordre des livres, ajouts à la fin)
  // livresPour : types d'acteur qui gardent les capacités des livres (exception par créature, ex. ["mortel"])
  const config = { attributs: { renommes: {} }, capacites: {}, trierAlpha: !!brut.trierAlpha,
    livresPour: [...new Set(brut.livresPour ?? [])].sort() };
  Object.assign(config.attributs.renommes, brut.attributs?.renommes ?? {});
  for ( const jeu of Object.keys(WODHOMEBREW.jeux) ) {
    const c = brut.capacites?.[jeu] ?? {};
    config.capacites[jeu] = {
      renommes: { ...(c.renommes ?? {}) },
      masques: [...new Set(c.masques ?? [])].sort(),
      ajouts: Object.fromEntries(Object.keys(WODHOMEBREW.capacites[jeu]).map(g => [g, [...(c.ajouts?.[g] ?? [])]]))
    };
  }
  return config;
}

/** Nom du livre d'un attribut ou d'une capacité */
export const nomLivre = (type, cle) => game.i18n.localize(`WODHOMEBREW.Actor.FIELDS.${type}.${cle}.label`);

/** Nom affiché d'un attribut */
export function nomAttribut(cle, config = configTraits()) {
  return config.attributs.renommes[cle] || nomLivre("attributs", cle);
}

/**
 * Capacités affichées pour un jeu, par colonne, renommages et masques appliqués.
 * @returns {Array<{groupe: string, traits: Array<{cle: string, nom: string, ajoutee: boolean}>}>}
 */
export function capacitesAffichees(jeu, config = configTraits(), type = null) {
  const base = WODHOMEBREW.capacites[jeu] ?? WODHOMEBREW.capacites.V20;
  const livres = { renommes: {}, masques: [], ajouts: {} };
  const c = config.livresPour.includes(type) ? livres : (config.capacites[jeu] ?? config.capacites.V20);
  const tri = (a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
  return Object.entries(base).map(([groupe, cles]) => ({
    groupe,
    traits: [
      ...cles.filter(k => !c.masques.includes(k))
        .map(k => ({ cle: k, nom: c.renommes[k] || nomLivre("capacites", k), ajoutee: false })),
      // Ajout : une capacité de base d'un autre jeu (art, meditation, rituels…) garde son stockage d'origine,
      // une nouvelle capacité est stockée dans system.capacites_ajoutees
      ...(c.ajouts[groupe] ?? []).filter(a => !cles.includes(a.cle)).map(a => {
        const deBase = WODHOMEBREW.toutesCapacites.includes(a.cle);
        return { cle: a.cle, nom: a.nom || c.renommes[a.cle] || nomLivre("capacites", a.cle), ajoutee: !deBase };
      })
    ].sort(config.trierAlpha ? tri : () => 0)
  }));
}

/** Toutes les clés de capacités ajoutées, tous jeux confondus */
export function clesAjoutees(config = configTraits()) {
  return Object.values(config.capacites).flatMap(c => Object.values(c.ajouts).flat().map(a => a.cle));
}

/** Clé interne à partir d'un nom : « Pilotage d'avion » → « pilotage_d_avion » (unique) */
export function nouvelleCle(nom, existantes) {
  const base = nom.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "trait";
  let cle = base;
  for ( let i = 2; existantes.has(cle); i++ ) cle = `${base}_${i}`;
  return cle;
}

/** Réaffiche les fiches ouvertes après un changement du réglage */
function rafraichirFiches() {
  for ( const app of foundry.applications.instances.values() ) {
    if ( app.document instanceof Actor ) app.render();
  }
}

/** Enregistre le réglage et son menu (MJ seulement) */
export function registerTraitsSettings(MenuClass) {
  game.settings.register(SYSTEME, REGLAGE, {
    scope: "world", config: false, type: Object, default: {}, onChange: rafraichirFiches
  });
  game.settings.registerMenu(SYSTEME, `${REGLAGE}Menu`, {
    name: "WODHOMEBREW.Traits.Titre",
    label: "WODHOMEBREW.Traits.Ouvrir",
    hint: "WODHOMEBREW.Traits.Aide",
    icon: "fa-solid fa-list-check",
    type: MenuClass,
    restricted: true
  });
}
