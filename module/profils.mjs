import { REGLAGE, SYSTEME, normaliserTraits } from "./traits.mjs";

/**
 * Profils de traits : des configurations « Traits de la chronique » nommées, à charger en un clic.
 * - profils intégrés : livrés avec le système (ci-dessous), disponibles dans tous les mondes ;
 * - profils du monde : enregistrés par le MJ dans le réglage `profilsTraits`.
 * Le profil actif est mémorisé dans `profilActif` ("" = configuration personnalisée).
 */

/**
 * Profil « Homebrew » : Sang-froid à la place d'Apparence ; Esquive en talent partout ;
 * capacités propres à chaque créature (Vampire et Goule : V20, Mage : M20, Garou : W20) ; le Mortel garde celles des livres.
 * Les capacités d'un autre jeu (art, meditation, enigmes, rituels) gardent leur clé et leurs points.
 */
const HOMEBREW = {
    "trierAlpha": true,
    "livresPour": ["mortel"],
    "attributs": {
      "renommes": {
        "apparence": "Sang-froid"
      }
    },
    "capacites": {
      "V20": {
        "renommes": {
          "connaissance_de_la_rue": "Expérience de la rue",
          "artisanat": "Artisanats",
          "finances": "Finance"
        },
        "masques": [
          "intuition",
          "larcin",
          "technologie"
        ],
        "ajouts": {
          "talents": [
            {
              "cle": "art",
              "nom": "Art"
            },
            {
              "cle": "esquive",
              "nom": "Esquive"
            }
          ],
          "competences": [
            {
              "cle": "meditation",
              "nom": "Méditation"
            },
            {
              "cle": "securite",
              "nom": "Sécurité"
            }
          ],
          "connaissances": [
            {
              "cle": "enigmes",
              "nom": "Énigmes"
            },
            {
              "cle": "linguistique",
              "nom": "Linguistique"
            },
            {
              "cle": "sanguinis",
              "nom": "Sanguinis"
            }
          ]
        }
      },
      "M20": {
        "renommes": {
          "connaissance_de_la_rue": "Expérience de la rue",
          "artisanat": "Artisanats",
          "recherche": "Recherches",
          "technologie": "Technologies"
        },
        "masques": [
          "droit",
          "enigmes"
        ],
        "ajouts": {
          "talents": [
            {
              "cle": "esquive",
              "nom": "Esquive"
            }
          ],
          "competences": [],
          "connaissances": [
            {
              "cle": "rituels",
              "nom": "Rituel"
            },
            {
              "cle": "thaumaturgie",
              "nom": "Thaumaturgie"
            }
          ]
        }
      },
      "W20": {
        "renommes": {
          "connaissance_de_la_rue": "Expérience de la rue",
          "artisanat": "Artisanats",
          "instinct_primal": "Appel primal",
          "rituels": "Rituel"
        },
        "masques": [
          "droit",
          "enigmes"
        ],
        "ajouts": {
          "talents": [
            {
              "cle": "esquive",
              "nom": "Esquive"
            }
          ],
          "competences": [
            {
              "cle": "securite",
              "nom": "Sécurité"
            }
          ],
          "connaissances": [
            {
              "cle": "linguistique",
              "nom": "Linguistique"
            },
            {
              "cle": "litanie",
              "nom": "Litanie"
            }
          ]
        }
      }
    }
  };

/**
 * Profils intégrés au système. Pour en ajouter un, copier la configuration exportée d'un monde (bouton Exporter).
 * @type {Record<string, {nom: string, config: object}>}
 */
export const PROFILS_INTEGRES = {
  livres: { nom: "WODHOMEBREW.Profils.Livres", config: {} },
  homebrew: { nom: "WODHOMEBREW.Profils.Homebrew", config: HOMEBREW }
};

export function registerProfilsSettings() {
  game.settings.register(SYSTEME, "profilsTraits", { scope: "world", config: false, type: Object, default: {} });
  game.settings.register(SYSTEME, "profilActif", { scope: "world", config: false, type: String, default: "livres" });
}

/** Tous les profils : { id: { nom, config, integre } } (id préfixé « monde. » pour ceux du monde) */
export function listeProfils() {
  const profils = {};
  for ( const [id, p] of Object.entries(PROFILS_INTEGRES) ) {
    profils[id] = { nom: game.i18n.localize(p.nom), config: normaliserTraits(p.config), integre: true };
  }
  for ( const [id, p] of Object.entries(game.settings.get(SYSTEME, "profilsTraits") ?? {}) ) {
    profils[`monde.${id}`] = { nom: p.nom, config: normaliserTraits(p.config), integre: false };
  }
  return profils;
}

/** Deux configurations sont-elles identiques (une fois normalisées) ? */
export function memesTraits(a, b) {
  const tri = o => JSON.stringify(o, (k, v) => (v && typeof v === "object" && !Array.isArray(v))
    ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y))) : v);
  return tri(normaliserTraits(a)) === tri(normaliserTraits(b));
}

/** Enregistre un profil du monde ; renvoie son id complet */
export async function enregistrerProfil(nom, config) {
  const profils = foundry.utils.deepClone(game.settings.get(SYSTEME, "profilsTraits") ?? {});
  // Même nom = mise à jour du profil existant
  let id = Object.entries(profils).find(([, p]) => p.nom === nom)?.[0];
  id ??= foundry.utils.randomID(8);
  profils[id] = { nom, config: normaliserTraits(config) };
  await game.settings.set(SYSTEME, "profilsTraits", profils);
  return `monde.${id}`;
}

/** Supprime un profil du monde */
export async function supprimerProfil(idComplet) {
  const id = idComplet.replace(/^monde\./, "");
  const profils = foundry.utils.deepClone(game.settings.get(SYSTEME, "profilsTraits") ?? {});
  delete profils[id];
  await game.settings.set(SYSTEME, "profilsTraits", profils);
  if ( game.settings.get(SYSTEME, "profilActif") === idComplet ) await game.settings.set(SYSTEME, "profilActif", "");
}

/** Applique une configuration au monde et retient le profil actif s'il correspond */
export async function appliquerTraits(config, idProfil = "") {
  const profil = listeProfils()[idProfil];
  const actif = (profil && memesTraits(profil.config, config)) ? idProfil : "";
  await game.settings.set(SYSTEME, REGLAGE, normaliserTraits(config));
  await game.settings.set(SYSTEME, "profilActif", actif);
  return actif;
}

/** Monde déjà configuré avant les profils : s'il ne correspond pas aux livres, il est « personnalisé » */
export function registerProfilsHooks() {
  Hooks.once("ready", async () => {
    if ( !game.user.isGM || game.settings.get(SYSTEME, "profilActif") !== "livres" ) return;
    if ( !memesTraits(PROFILS_INTEGRES.livres.config, game.settings.get(SYSTEME, REGLAGE)) ) {
      await game.settings.set(SYSTEME, "profilActif", "");
    }
  });
}
