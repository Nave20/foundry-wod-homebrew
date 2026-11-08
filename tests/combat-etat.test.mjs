import { test } from "node:test";
import assert from "node:assert/strict";
import { creerEtape, recalculer, corriger } from "../module/combat-regles.mjs";

/** Lanceur factice : rend les réussites prévues dans l'ordre et note les réserves demandées */
function lanceur(...reussites) {
  const appels = [];
  const lancer = (reserve, difficulte) => { appels.push({ reserve, difficulte }); return { reussites: reussites.shift() ?? 0, des: [] }; };
  return { lancer, appels };
}

function etatGlock(a = 5) {
  return {
    arme: { degats: 4, force: false, infini: false, type_degats: "letal" },
    contexte: { valeurForce: 2, degatsDifficulte: 6, specForce: false },
    attaque: { libelle: "Attaque", base: { reserve: 6, difficulte: 6 }, ajust: { des: 0, diff: 0 }, reserve: 6, difficulte: 6, reussites: a, des: [], manuel: false, bonus: 0 },
    defense: null, degats: null, encaissement: null, final: null, finalManuel: null, applique: false
  };
}

test("sans défense, rien n'est calculé", () => {
  const { lancer, appels } = lanceur();
  const e = recalculer(etatGlock(), lancer);
  assert.equal(e.final, null);
  assert.equal(appels.length, 0);
});

test("touché : dégâts (arme + restantes) puis encaissement, final = dégâts − encaissement", () => {
  const { lancer, appels } = lanceur(4, 2);
  const e = etatGlock(5);
  e.defense = creerEtape("Esquive", { reserve: 3, difficulte: 6 }, () => ({ reussites: 3, des: [] }));
  e.contexte.encaissement = { reserve: 5, difficulte: 6 };
  recalculer(e, lancer);
  assert.deepEqual(appels, [{ reserve: 5, difficulte: 6 }, { reserve: 5, difficulte: 6 }]);
  assert.equal(e.touche, true);
  assert.equal(e.final, 2);
});

test("raté : ni dégâts ni encaissement", () => {
  const { lancer, appels } = lanceur();
  const e = etatGlock(3);
  e.defense = creerEtape("Esquive", { reserve: 3, difficulte: 6 }, () => ({ reussites: 3, des: [] }));
  e.contexte.encaissement = { reserve: 5, difficulte: 6 };
  recalculer(e, lancer);
  assert.equal(e.touche, false);
  assert.equal(e.degats, null);
  assert.equal(e.final, 0);
  assert.equal(appels.length, 0);
});

test("dégâts infinis : pas d'encaissement", () => {
  const { lancer, appels } = lanceur(1);
  const e = etatGlock(2);
  e.arme.infini = true;
  e.defense = creerEtape("Aucune", { reserve: 0, difficulte: 6 }, () => ({ reussites: 0, des: [] }));
  e.contexte.encaissement = { reserve: 5, difficulte: 6 };
  recalculer(e, lancer);
  assert.equal(e.final, "infini");
  assert.equal(e.encaissement, null);
  assert.equal(appels.length, 1);
});

test("corriger la défense relance les dégâts (réserve changée) mais garde l'encaissement", () => {
  const { lancer, appels } = lanceur(4, 2, 4, 3);
  const e = etatGlock(5);
  e.defense = creerEtape("Esquive", { reserve: 3, difficulte: 6 }, () => ({ reussites: 2, des: [] }));
  e.contexte.encaissement = { reserve: 5, difficulte: 6 };
  recalculer(e, lancer);                       // nettes 3 → 4 + 2 = 6 dés de dégâts
  assert.equal(appels[0].reserve, 6);
  corriger(e, "defense", { des: 2, diff: 0 }, lancer);   // défense relancée : 4 réussites → nettes 1 → 4 dés
  assert.deepEqual(appels[2], { reserve: 5, difficulte: 6 });
  assert.equal(e.defense.reussites, 4);
  assert.deepEqual(appels[3], { reserve: 4, difficulte: 6 });
  assert.equal(appels.length, 4);
  assert.equal(e.final, 1);                    // 3 − 2 (encaissement gardé)
});

test("réussites saisies sur l'encaissement : seul le final change", () => {
  const { lancer, appels } = lanceur(2, 1);
  const e = etatGlock(5);
  e.defense = creerEtape("Aucune", { reserve: 0, difficulte: 6 }, () => ({ reussites: 4, des: [] }));
  e.contexte.encaissement = { reserve: 5, difficulte: 6 };
  recalculer(e, lancer);
  corriger(e, "encaissement", { reussites: -1 }, lancer);
  assert.equal(appels.length, 2);
  assert.equal(e.encaissement.manuel, true);
  assert.equal(e.final, 3);
});

test("ajustement de dés et de difficulté appliqué à la réserve de base", () => {
  const { lancer, appels } = lanceur(3, 1, 2);
  const e = etatGlock(5);
  e.defense = creerEtape("Aucune", { reserve: 0, difficulte: 6 }, () => ({ reussites: 0, des: [] }));
  e.contexte.encaissement = { reserve: 5, difficulte: 6 };
  recalculer(e, lancer);
  corriger(e, "degats", { des: -1, diff: 2 }, lancer);
  assert.deepEqual(appels[2], { reserve: 7, difficulte: 8 });
  assert.equal(e.final, 1);
});

test("réglage du MJ avant le lancer : rangé dans ajust, la base reste sans le bonus", () => {
  const appels = [];
  const e = creerEtape("defense", { reserve: 4, difficulte: 6 }, (r, d) => { appels.push({ r, d }); return { reussites: 1, des: [] }; }, 0, { des: 2, diff: -1 });
  assert.deepEqual(e.base, { reserve: 4, difficulte: 6 });
  assert.deepEqual(e.ajust, { des: 2, diff: -1 });
  assert.deepEqual(appels, [{ r: 6, d: 5 }]);
});
