/**
 * Combat : carte d'attaque qui avance dans le chat (attaque → défense → dégâts → encaissement → santé).
 * L'état de l'échange est dans les flags du message (flags.wod_homebrew.combat) ; la carte est redessinée
 * à chaque étape. Les calculs sont dans combat-regles.mjs.
 *
 * Droits : le MJ peut tout faire ; le propriétaire de la cible choisit sa défense. Un joueur ne peut pas
 * modifier un message qui n'est pas le sien : ses demandes passent par le socket du système et sont
 * exécutées par le MJ actif.
 */
import { compterReussites, effectuerJet, lancerReserve, preparerJet, reglesJets, texteModificateur } from "./des.mjs";
import { corriger, creerEtape, defensePossible, difficulteOpposee, lancerAttente, mettreEnAttente, malusDexterite, recalculer, reserveEncaissement } from "./combat-regles.mjs";

const SYSTEME = "wod_homebrew";
const TEMPLATE = "systems/wod_homebrew/templates/chat/combat.hbs";
const CANAL = `system.${SYSTEME}`;

/** Identifiant de l'attaque à mains nues (pas d'objet) */
export const MAINS_NUES = "mains-nues";

/** Capacité utilisée par chaque défense */
const DEFENSES = { esquive: "esquive", parade: "melee", blocage: "bagarre", aucune: null };

/** Compteur de santé de chaque type de dégâts */
const COMPTEURS = { contondant: "contondants", letal: "letaux", aggrave: "aggraves" };

/** Messages en cours de traitement sur ce client (évite deux exécutions simultanées) */
const enCours = new Set();

/**
 * Données d'attaque d'une arme (objet) ou des mains nues.
 * @param {Item|string} objet   Objet de type « objet », ou MAINS_NUES
 * @returns {{nom, degats, force, infini, type_degats, portee, attribut, competence, requis}|null}
 */
export function armeDe(objet) {
  if ( objet === MAINS_NUES ) return { nom: _loc("WODHOMEBREW.Combat.MainsNues"), degats: 0, force: true, infini: false,
    type_degats: "contondant", portee: "", attribut: "dexterite", competence: "bagarre", requis: "" };
  if ( !objet?.system ) return null;
  const s = objet.system;
  return { nom: objet.name, degats: s.degats, force: s.force, infini: s.infini, type_degats: s.type_degats || "letal",
    portee: s.portee, attribut: s.attribut, competence: s.competence, requis: s.requis };
}

/** Nom affiché d'une capacité (libellé du système, sinon la clé mise en forme : « esquive » → « Esquive ») */
function nomCapacite(cle) {
  const k = `WODHOMEBREW.Actor.FIELDS.capacites.${cle}.label`;
  return game.i18n.has(k) ? _loc(k) : cle.charAt(0).toUpperCase() + cle.slice(1).replaceAll("_", " ");
}

/**
 * Valeur et spécialité d'un trait d'un personnage, pour un jet préparé hors de la fiche.
 * @param {Actor} actor
 * @param {string} cle
 * @param {"attribut"|"capacite"} categorie
 */
export function traitActeur(actor, cle, categorie) {
  const s = actor.system;
  if ( categorie === "attribut" ) return { nom: _loc(`WODHOMEBREW.Actor.FIELDS.attributs.${cle}.label`), categorie,
    valeur: Number(s.attributs?.[cle]) || 0, specialite: s.specialites?.[cle] || "" };
  const ajoutee = s.capacites_ajoutees?.[cle];
  if ( ajoutee ) return { nom: nomCapacite(cle), categorie, valeur: Number(ajoutee.valeur) || 0, specialite: ajoutee.specialite || "" };
  return { nom: nomCapacite(cle), categorie, valeur: Number(s.capacites?.[cle]) || 0, specialite: s.specialites?.[cle] || "" };
}

/** Protections portées par un personnage ({ armure, malus, equipe }) */
export function protectionsDe(actor) {
  return actor.items.filter(i => (i.type === "objet") && i.system.estProtection)
    .map(i => ({ armure: i.system.armure, malus: i.system.malus, equipe: i.system.equipe }));
}

/**
 * Lance l'attaque préparée dans la barre de jet et crée la carte de combat.
 * La cible est le premier jeton ciblé par l'utilisateur (sinon elle sera choisie à la défense).
 * @param {Actor} actor
 * @param {object} jet       Jet préparé (preparerJet)
 * @param {string} armeId    Identifiant de l'objet, ou MAINS_NUES
 * @returns {Promise<ChatMessage|null>}
 */
export async function lancerAttaque(actor, jet, armeId) {
  const arme = armeDe(armeId === MAINS_NUES ? MAINS_NUES : actor.items.get(armeId));
  if ( !arme ) return null;
  const r = await effectuerJet(actor, jet);
  if ( !r ) return null;
  const jeton = game.user.targets.first();
  const etat = {
    attaquant: actor.uuid, attaquantNom: actor.name,
    cible: jeton?.actor?.uuid ?? null, cibleNom: jeton?.name ?? null,
    arme: { ...arme, id: armeId },
    contexte: { valeurForce: Number(actor.system.attributs?.force) || 0, specForce: !!actor.system.specialites?.force,
      degatsDifficulte: r.regles.degatsDifficulte, encaissement: null },
    attaque: { libelle: "attaque", base: { reserve: jet.reserve, difficulte: jet.difficulte }, ajust: { des: 0, diff: 0 },
      reserve: jet.reserve, difficulte: jet.difficulte, reussites: r.reussites, des: r.des, manuel: false, bonus: r.bonus,
      detail: jet.traits.map(t => `${t.nom} ${t.valeur}`).join(" + "), mods: r.modificateurs },
    // Réglage « les joueurs lancent eux-mêmes » : chaque étape attend un clic sur « Lancer »
    parJoueurs: !!r.regles.lancerParJoueurs, attente: null,
    defenseType: null, defense: null, degats: null, encaissement: null,
    touche: null, restantes: 0, final: null, finalManuel: null, applique: false, appliques: 0
  };
  return ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor }),
    content: await rendreCarte(etat),
    rolls: [r.roll],
    flags: { [SYSTEME]: { combat: etat } }
  });
}

/**
 * Exécute une action sur la carte (sur le client du MJ, ou du demandeur s'il est MJ).
 * @param {ChatMessage} message
 * @param {"defendre"|"corriger"|"appliquer"} action
 * @param {object} donnees
 * @param {User} user   Utilisateur à l'origine de la demande (droits vérifiés ici)
 */
export async function executer(message, action, donnees = {}, user = game.user) {
  if ( enCours.has(message.id) ) return;
  const source = message.getFlag(SYSTEME, "combat");
  if ( !source ) return;
  const etat = foundry.utils.deepClone(source);
  const regles = reglesJets();
  enCours.add(message.id);
  try {
    switch ( action ) {
      case "defendre": {
        if ( !defensePossible(etat) || !(donnees.type in DEFENSES) ) return;
        const uuid = etat.cible ?? donnees.cible;
        const cible = uuid ? fromUuidSync(uuid) : null;
        if ( !cible ) return ui.notifications.warn("WODHOMEBREW.Combat.PasDeCible", { localize: true });
        if ( !user.isGM && !cible.testUserPermission(user, "OWNER") ) return;
        etat.cible = uuid;
        etat.cibleNom ??= donnees.cibleNom || cible.name;
        etat.defenseType = donnees.type;
        // Défense : Dextérité + capacité, malus de blessure et d'armure ; réglage du MJ ajouté avant le lancer
        const ajust = user.isGM ? { des: Number(donnees.ajust?.des) || 0, diff: Number(donnees.ajust?.diff) || 0 } : { des: 0, diff: 0 };
        const protections = protectionsDe(cible);
        // Encaissement de la cible : Vigueur + protections équipées (−1 diff. avec une spécialité de Vigueur)
        const vigueur = traitActeur(cible, "vigueur", "attribut");
        const reserveEnc = reserveEncaissement(vigueur.valeur, protections);
        etat.contexte.encaissement = { reserve: reserveEnc,
          difficulte: difficulteOpposee(regles.encaissementDifficulte, !!vigueur.specialite) };
        etat.contexte.vigueur = vigueur.valeur;
        etat.contexte.armure = reserveEnc - vigueur.valeur;
        if ( donnees.type === "aucune" ) {
          etat.defense = creerEtape("defense", { reserve: 0, difficulte: regles.difficulte }, lancerReserve, 0, ajust);
          etat.defense.detail = "";
          etat.defense.mods = [];
        }
        else {
          const sante = cible.system.sante?.etat ?? {};
          const traits = [traitActeur(cible, "dexterite", "attribut"), traitActeur(cible, DEFENSES[donnees.type], "capacite")];
          const jet = preparerJet(traits, { specialite: true,
            malus: Number(sante.malus) || 0, appliquerMalus: regles.malusBlessure,
            etatSante: sante.cle ? _loc(`WODHOMEBREW.Sante.Niveaux.${sante.cle}`) : "",
            malusArmure: malusDexterite(protections) }, regles);
          const extra = { ajust, detail: traits.map(t => `${t.nom} ${t.valeur}`).join(" + "),
            mods: jet.modificateurs.map(texteModificateur) };
          // Les joueurs lancent eux-mêmes : la défense attend le clic du défenseur
          if ( etat.parJoueurs ) {
            mettreEnAttente(etat, "defense", { reserve: jet.reserve, difficulte: jet.difficulte }, extra);
            break;
          }
          etat.defense = creerEtape("defense", { reserve: jet.reserve, difficulte: jet.difficulte }, lancerReserve, 0, ajust);
          etat.defense.detail = extra.detail;
          etat.defense.mods = extra.mods;
        }
        recalculer(etat, lancerReserve);
        break;
      }
      case "lancer": {
        // Étape en attente lancée par un joueur (ou le MJ) : les faces des dés viennent de son client
        const a = etat.attente;
        if ( !a || (a.etape !== donnees.etape) || etat.applique ) return;
        if ( !peutLancer(etat, a.etape, user) ) return;
        const faces = Array.isArray(donnees.faces) ? donnees.faces.map(Number) : [];
        if ( (faces.length !== a.reserve) || faces.some(f => !Number.isInteger(f) || (f < 1) || (f > regles.de)) ) return;
        let utilisees = false;
        lancerAttente(etat, (n, difficulte) => {
          if ( utilisees ) return lancerReserve(n, difficulte);
          utilisees = true;
          return compterReussites(faces, { ...regles, difficulte });
        });
        break;
      }
      case "corriger": {
        if ( !user.isGM || etat.applique || !["attaque", "defense", "degats", "encaissement"].includes(donnees.etape) ) return;
        const reussites = (donnees.reussites === "" || donnees.reussites === null || donnees.reussites === undefined)
          ? null : Number(donnees.reussites);
        corriger(etat, donnees.etape, { des: Number(donnees.des) || 0, diff: Number(donnees.diff) || 0, reussites }, lancerReserve);
        break;
      }
      case "appliquer": {
        if ( !user.isGM || etat.applique || (etat.final === null) ) return;
        // Valeur finale corrigée à la main par le MJ
        const saisie = Number(donnees.final);
        if ( (donnees.final !== undefined) && (donnees.final !== "") && Number.isFinite(saisie) && (saisie !== etat.final) ) {
          etat.finalManuel = Math.max(0, Math.round(saisie));
          etat.final = etat.finalManuel;
        }
        const cible = etat.cible ? await fromUuid(etat.cible) : null;
        if ( !cible ) return ui.notifications.warn("WODHOMEBREW.Combat.CibleIntrouvable", { localize: true });
        const s = cible._source.system.sante;
        const niveaux = cible.system.sante.niveaux;   // piste effective (forme du garou comprise)
        const place = Math.max(0, niveaux - (s.contondants + s.letaux + s.aggraves));
        const n = etat.final === "infini" ? place : Math.min(place, Number(etat.final) || 0);
        const compteur = COMPTEURS[etat.arme.type_degats] ?? "letaux";
        if ( n > 0 ) await cible.update({ [`system.sante.${compteur}`]: s[compteur] + n });
        etat.applique = true;
        etat.appliques = n;
        break;
      }
      default: return;
    }
    await message.update({ content: await rendreCarte(etat), [`flags.${SYSTEME}.combat`]: etat });
  }
  finally {
    enCours.delete(message.id);
  }
}

/** Le MJ, le propriétaire de la cible (défense, encaissement) ou de l'attaquant (dégâts) peut lancer l'étape */
function peutLancer(etat, etape, user) {
  if ( user.isGM ) return true;
  const uuid = etape === "degats" ? etat.attaquant : etat.cible;
  const acteur = uuid ? fromUuidSync(uuid) : null;
  return !!acteur?.testUserPermission(user, "OWNER");
}

/** Lance les dés de l'étape en attente sur ce client (son des dés, dés 3D si un module les affiche) */
async function lancerMesDes(message, etat) {
  const a = etat.attente;
  if ( !a ) return;
  const faces = [];
  if ( a.reserve > 0 ) {
    const roll = await new Roll(`${a.reserve}d${reglesJets().de}`).evaluate();
    faces.push(...roll.dice[0].results.map(r => r.result));
    if ( game.dice3d ) await game.dice3d.showForRoll(roll, game.user, true);
    else foundry.audio.AudioHelper.play({ src: CONFIG.sounds.dice, volume: 0.8, autoplay: true, loop: false }, false);
  }
  return demander(message, "lancer", { etape: a.etape, faces });
}

/** Demande une action : exécutée ici pour le MJ, envoyée au MJ actif pour un joueur */
async function demander(message, action, donnees) {
  if ( game.user.isGM ) return executer(message, action, donnees, game.user);
  if ( !game.users.activeGM ) return ui.notifications.warn("WODHOMEBREW.Combat.PasDeMJ", { localize: true });
  game.socket.emit(CANAL, { type: "combat", message: message.id, action, donnees });
}

/* -------------------------------------------- */
/*  Affichage                                   */
/* -------------------------------------------- */

/** Ligne d'une étape pour le modèle de carte */
function ligne(cle, etape, libelle, detail) {
  if ( !etape ) return null;
  return { cle, libelle, detail, reserve: etape.reserve, difficulte: etape.difficulte, des: etape.des ?? [],
    reussites: etape.reussites, manuel: etape.manuel, mods: etape.mods ?? [], ajust: etape.ajust ?? { des: 0, diff: 0 } };
}

/** HTML de la carte à partir de l'état */
export async function rendreCarte(etat) {
  const a = etat.arme;
  const type = a.type_degats ? _loc(CONFIG.WODHOMEBREW.typesDegats[a.type_degats]) : "";
  const force = _loc("WODHOMEBREW.Actor.FIELDS.attributs.force.label");
  const partsDegats = [a.infini ? "∞" : null, a.degats ? String(a.degats) : null, a.force ? `${force} ${etat.contexte.valeurForce}` : null,
    etat.restantes ? _loc("WODHOMEBREW.Combat.Restantes", { n: etat.restantes }) : null].filter(Boolean);
  const c = etat.contexte;
  const lignes = [
    ligne("attaque", etat.attaque, _loc("WODHOMEBREW.Combat.Attaque"), etat.attaque.detail),
    ligne("defense", etat.defense, etat.defenseType ? _loc(`WODHOMEBREW.Combat.Defenses.${etat.defenseType}`) : "", etat.defense?.detail),
    // Attaque ratée d'emblée (0 réussite ou moins) : la carte s'arrête là
    (!etat.defense && (etat.attaque.reussites <= 0))
      ? { touche: true, ok: false, texte: _loc("WODHOMEBREW.Combat.Rate"), nettes: etat.attaque.reussites } : null,
    etat.touche === null ? null : { touche: true, ok: etat.touche,
      texte: etat.touche ? _loc("WODHOMEBREW.Combat.Touche", { n: etat.restantes }) : _loc("WODHOMEBREW.Combat.Rate"),
      nettes: etat.attaque.reussites - (etat.defense?.reussites ?? 0) },
    ligne("degats", etat.degats, _loc("WODHOMEBREW.Combat.Degats"), partsDegats.join(" + ")),
    ligne("encaissement", etat.encaissement, _loc("WODHOMEBREW.Combat.Encaissement"),
      etat.encaissement ? _loc("WODHOMEBREW.Combat.DetailEncaissement", { v: c.vigueur ?? 0, a: c.armure ?? 0 }) : "")
  ].filter(Boolean);
  return foundry.applications.handlebars.renderTemplate(TEMPLATE, {
    titre: _loc(etat.cibleNom ? "WODHOMEBREW.Combat.Titre" : "WODHOMEBREW.Combat.TitreSansCible",
      { a: etat.attaquantNom, c: etat.cibleNom ?? "", arme: a.nom }),
    requis: a.requis, lignes, type,
    attendDefense: defensePossible(etat),
    attente: etat.attente ? {
      etape: etat.attente.etape, reserve: etat.attente.reserve, difficulte: etat.attente.difficulte,
      libelle: etat.attente.etape === "defense" ? _loc(`WODHOMEBREW.Combat.Defenses.${etat.defenseType}`)
        : _loc(etat.attente.etape === "degats" ? "WODHOMEBREW.Combat.Degats" : "WODHOMEBREW.Combat.Encaissement"),
      detail: etat.attente.etape === "defense" ? etat.attente.detail
        : etat.attente.etape === "degats" ? partsDegats.join(" + ")
        : _loc("WODHOMEBREW.Combat.DetailEncaissement", { v: c.vigueur ?? 0, a: c.armure ?? 0 }),
      qui: _loc("WODHOMEBREW.Combat.AttenteDe", { nom: (etat.attente.etape === "degats" ? etat.attaquantNom : etat.cibleNom) ?? "" })
    } : null,
    defenses: Object.keys(DEFENSES).map(k => ({ cle: k, label: _loc(`WODHOMEBREW.Combat.Defenses.${k}`) })),
    final: etat.final, infini: etat.final === "infini", aFinal: (etat.final !== null) && etat.touche,
    applique: etat.applique,
    texteApplique: etat.applique ? _loc("WODHOMEBREW.Combat.Applique", { c: etat.cibleNom ?? "", n: etat.appliques, type }) : "",
    cibleNom: etat.cibleNom
  });
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

/** Boutons de la carte (selon les droits) et réception des demandes des joueurs */
export function registerCombatHooks() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const carte = html.querySelector?.(".wod-combat");
    if ( !carte ) return;
    const etat = message.getFlag(SYSTEME, "combat");
    if ( !etat ) return;
    const mj = game.user.isGM;
    const cible = etat.cible ? fromUuidSync(etat.cible) : null;
    // Sans cible enregistrée, tout le monde voit les boutons ; la défense vise alors la cible de celui qui clique
    const defenseur = mj || (cible ? cible.isOwner : true);
    if ( !mj ) carte.querySelectorAll("[data-pour='mj']").forEach(e => e.remove());
    else for ( const zone of carte.querySelectorAll(".wod-combat-etape[data-etape]") ) {
      const ajust = etat[zone.dataset.etape]?.ajust ?? {};
      for ( const nom of ["des", "diff"] ) {
        const champ = zone.querySelector(`.correction [name='${nom}']`);
        if ( champ ) champ.value = ajust[nom] ?? 0;
      }
    }
    if ( !defenseur ) carte.querySelectorAll("[data-pour='defense']").forEach(e => e.remove());
    // Bouton « Lancer » : seulement pour celui qui doit lancer cette étape (ou le MJ)
    if ( etat.attente && !peutLancer(etat, etat.attente.etape, game.user) ) carte.querySelectorAll("[data-pour='lanceur']").forEach(e => e.remove());

    carte.addEventListener("click", async event => {
      const bouton = event.target.closest("[data-combat]");
      if ( !bouton ) return;
      event.preventDefault();
      const zone = bouton.closest("[data-etape]") ?? carte;
      const champ = nom => zone.querySelector(`[name='${nom}']`)?.value ?? "";
      switch ( bouton.dataset.combat ) {
        case "defendre": {
          const jeton = game.user.targets.first();
          if ( !etat.cible && !jeton ) return ui.notifications.warn("WODHOMEBREW.Combat.PasDeCible", { localize: true });
          return demander(message, "defendre", { type: bouton.dataset.type, cible: jeton?.actor?.uuid, cibleNom: jeton?.name,
            ajust: { des: champ("des"), diff: champ("diff") } });
        }
        case "lancer":
          bouton.disabled = true;
          return lancerMesDes(message, etat);
        case "crayon":
          zone.querySelector(".correction")?.classList.toggle("replie");
          return;
        case "relancer":
          return demander(message, "corriger", { etape: zone.dataset.etape, des: champ("des"), diff: champ("diff") });
        case "fixer":
          return demander(message, "corriger", { etape: zone.dataset.etape, reussites: champ("reussites") });
        case "appliquer":
          return demander(message, "appliquer", { final: champ("final") });
      }
    });
  });

  Hooks.once("ready", () => {
    // L'expéditeur est fourni par le serveur (2e argument) : ne jamais le lire dans les données reçues
    game.socket.on(CANAL, (data, expediteur) => {
      if ( (data?.type !== "combat") || !game.users.activeGM?.isSelf ) return;
      const message = game.messages.get(data.message);
      const user = game.users.get(expediteur);
      if ( message && user ) executer(message, data.action, data.donnees, user);
    });
  });
}
