import { test } from "node:test";
import assert from "node:assert/strict";
import { FORMES, attributsEnForme, difficultePerception, niveauxSanteEnForme, REGLES_SANTE_FORME } from "../module/formes.mjs";

const base = { force: 3, dexterite: 3, vigueur: 3, charisme: 2, manipulation: 2, apparence: 3, perception: 2, intelligence: 2, astuce: 3 };

test("cinq formes dans l'ordre, Homidé par défaut", () => {
  assert.deepEqual(FORMES.map(f => f.cle), ["homide", "glabro", "crinos", "hispo", "lupus"]);
});

test("Homidé : aucun changement", () => {
  assert.deepEqual(attributsEnForme(base, "homide"), base);
});

test("Crinos : Force +4, Dex +1, Vigueur +3, Manipulation −3 (min 0), Apparence 0", () => {
  const a = attributsEnForme(base, "crinos");
  assert.equal(a.force, 7);
  assert.equal(a.dexterite, 4);
  assert.equal(a.vigueur, 6);
  assert.equal(a.manipulation, 0);
  assert.equal(a.apparence, 0);
  assert.equal(a.astuce, 3);
});

test("Glabro, Hispo, Lupus", () => {
  assert.deepEqual([attributsEnForme(base, "glabro").force, attributsEnForme(base, "glabro").apparence], [5, 2]);
  assert.deepEqual([attributsEnForme(base, "hispo").force, attributsEnForme(base, "hispo").dexterite], [6, 5]);
  assert.deepEqual([attributsEnForme(base, "lupus").force, attributsEnForme(base, "lupus").vigueur], [4, 5]);
});

test("forme inconnue : aucun changement, base non modifiée", () => {
  const copie = { ...base };
  assert.deepEqual(attributsEnForme(base, "xyz"), base);
  attributsEnForme(base, "crinos");
  assert.deepEqual(base, copie);
});

test("difficulté de Perception : Lupus −2, Hispo −1, autres 0", () => {
  assert.equal(difficultePerception("lupus"), -2);
  assert.equal(difficultePerception("hispo"), -1);
  assert.equal(difficultePerception("crinos"), 0);
});

test("santé : en Crinos, la piste double (règle de la table)", () => {
  assert.equal(niveauxSanteEnForme(7, "crinos", "double"), 14);
  assert.equal(niveauxSanteEnForme(7, "homide", "double"), 7);
  assert.equal(niveauxSanteEnForme(7, "hispo", "double"), 7);
});

test("santé : règle V5, Crinos +4", () => {
  assert.equal(niveauxSanteEnForme(7, "crinos", "v5"), 11);
  assert.equal(niveauxSanteEnForme(7, "lupus", "v5"), 7);
});

test("santé : règle aucune ou inconnue, piste inchangée", () => {
  assert.equal(niveauxSanteEnForme(7, "crinos", "aucune"), 7);
  assert.equal(niveauxSanteEnForme(7, "crinos", "xyz"), 7);
  assert.deepEqual(Object.keys(REGLES_SANTE_FORME), ["double", "v5", "aucune"]);
});
