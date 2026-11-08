import { test } from "node:test";
import assert from "node:assert/strict";
import { resoudreTouche, reserveDegats, difficulteOpposee, degatsFinaux, reserveEncaissement, malusDexterite,
  lireDegats, deduireArme } from "../module/combat-regles.mjs";

test("touche : attaque moins défense, la première réussite valide le coup", () => {
  assert.deepEqual(resoudreTouche(5, 3), { nettes: 2, touche: true, restantes: 1 });
  assert.equal(resoudreTouche(3, 3).touche, false);
  assert.deepEqual(resoudreTouche(2, -1), { nettes: 3, touche: true, restantes: 2 });
  assert.equal(resoudreTouche(1, 4).restantes, 0);
});

test("réserve de dégâts : dés de l'arme, Force si l'arme l'utilise, réussites restantes", () => {
  assert.equal(reserveDegats({ degats: 3, force: true, valeurForce: 2, restantes: 1 }), 6);
  assert.equal(reserveDegats({ degats: 4, force: false, valeurForce: 2, restantes: 1 }), 5);
});

test("dégâts finaux : un encaissement négatif s'ajoute, jamais en dessous de 0", () => {
  assert.equal(degatsFinaux(2, -1), 3);
  assert.equal(degatsFinaux(-1, 2), 0);
  assert.equal(degatsFinaux(4, 2), 2);
  assert.equal(degatsFinaux(1, 5, true), "infini");
});

test("difficulté opposée : −1 avec une spécialité, bornée à 2", () => {
  assert.equal(difficulteOpposee(6, true), 5);
  assert.equal(difficulteOpposee(6, false), 6);
  assert.equal(difficulteOpposee(2, true), 2);
});

test("protections : seules les équipées comptent", () => {
  assert.equal(reserveEncaissement(2, [{ armure: 3, equipe: true }, { armure: 2, equipe: false }]), 5);
  assert.equal(malusDexterite([{ malus: 1, equipe: true }, { malus: 2, equipe: false }]), 1);
  assert.equal(malusDexterite([]), 0);
});

test("lecture des anciens dégâts en texte", () => {
  assert.deepEqual(lireDegats("Force + 2"), { degats: 2, force: true });
  assert.deepEqual(lireDegats("4"), { degats: 4, force: false });
  assert.deepEqual(lireDegats(""), { degats: 0, force: false });
  assert.deepEqual(lireDegats("force+1"), { degats: 1, force: true });
  assert.deepEqual(lireDegats("Force"), { degats: 0, force: true });
});

test("arme déduite du mode d'attaque de la vault", () => {
  assert.deepEqual(deduireArme("tir", "Glock 17"), { attribut: "dexterite", competence: "armes_a_feu", force: false, requis: "" });
  assert.deepEqual(deduireArme("mêlée", "Katana"), { attribut: "dexterite", competence: "melee", force: true, requis: "" });
  assert.deepEqual(deduireArme("corps à corps", "Poing américain"), { attribut: "dexterite", competence: "bagarre", force: true, requis: "" });
  assert.equal(deduireArme("lancer", "Grenade flash").competence, "athletisme");
  assert.equal(deduireArme("lancer", "Grenade flash").force, false);
  assert.deepEqual(deduireArme("tir", "Arc"), { attribut: "dexterite", competence: "tir_a_l_arc", force: false, requis: "Tir à l'arc" });
  assert.equal(deduireArme("tir", "Arbalète").competence, "tir_a_l_arc");
  assert.deepEqual(deduireArme("tir lourd", "Lance grenades M-19"), { attribut: "dexterite", competence: "armes_a_feu", force: false, requis: "Armes à feu (armes lourdes)" });
});
