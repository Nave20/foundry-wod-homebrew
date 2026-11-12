/**
 * Crée des personnages à partir du JSON produit par import_personnage_vault.py.
 * À lancer dans la console de Foundry (F12), connecté en MJ :
 *   const { importerPersonnages } = await import("/systems/wod_homebrew/tools/importer-personnage.js");
 *   const rapports = await importerPersonnages("wod-homebrew-personnages/personnages.json");
 *
 * Les attributs et capacités sont reconnus par leur clé ou par le nom affiché (Traits de la chronique du monde :
 * « sang_froid » → Apparence renommée Sang-froid, « Esquive 4 » → capacité ajoutée). Les pouvoirs et objets sont
 * pris dans les compendiums du monde quand le nom correspond, sinon créés à partir de la note.
 * Un personnage déjà importé (même note) est remplacé. Les acteurs sont rangés sous un dossier racine, avec les
 * sous-dossiers de la vault. Les créatures sans fiche (momie, kuei-jin…) sont ignorées.
 * Renvoie { resume, rapports } : resume regroupe les remarques par type (noms remplacés par « … »).
 */
import { capacitesAffichees, configTraits, nomAttribut } from "../module/traits.mjs";
import { WODHOMEBREW } from "../module/config.mjs";

const norm = s => String(s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, " ").trim();
const slug = s => norm(s).replace(/ /g, "_");
/** Clé de comparaison des noms : accents, casse et pluriels ignorés (« Réflexes éclairs » = « Réflexe éclair ») */
const memeNom = (a, b) => { const c = s => norm(s).split(" ").map(m => m.replace(/(?<=..)[sx]$/, "")).join(" "); return c(a) === c(b); };

/** Propriétés propres à la note Obsidian, sans équivalent attendu sur la fiche */
const PROPRIETES_NOTE = new Set(["type", "creature", "tags", "campagne", "aliases"]);
/** Sections reprises dans la biographie */
const SECTIONS_BIO = { "Historique": "historique", "Apparence": "apparence", "Relations": "relations", "Notes du MJ": "notes_mj" };
/** Sections sans champ, mais que le joueur doit voir */
const SECTIONS_JOUEUR = new Set(["Notes du joueur"]);
/** Sections transformées en objets de la fiche (leur texte reste dans les notes du MJ) */
const SECTIONS_OBJETS = new Set(["Pouvoirs et rituels", "Équipement"]);
const CATEGORIES_OBJET = { arme: "arme", armure: "armure", relique: "artefact", artefact: "artefact" };

export async function importerPersonnages(url, { racine = "Vault" } = {}) {
  if ( !game.user.isGM ) throw new Error("Import réservé au MJ");
  const fiches = await (await fetch(url, { cache: "no-store" })).json();
  const rapports = [];
  const resume = {};
  CACHE.clear();
  for ( const f of fiches ) {
    let r;
    try {
      r = await importerFiche(f, racine);
    } catch ( err ) {
      r = { nom: f.nom, erreur: err.message, remarques: { erreurs: [err.message] } };
    }
    rapports.push(r);
    for ( const [titre, lignes] of Object.entries(r.remarques) ) {
      if ( titre === "compendium" ) continue;
      for ( const l of lignes ) {
        // Regroupement : le contenu des guillemets et les nombres deviennent « … »
        const motif = l.replace(/«[^»]*»/g, "«…»").replace(/\d+/g, "N").replace(/ = .*$/, " = …");
        (resume[titre] ??= {})[motif] = (resume[titre][motif] ?? 0) + 1;
      }
    }
  }
  const ok = rapports.filter(r => r.id).length;
  ui.notifications.info(`${ok} personnage(s) importé(s) sur ${fiches.length}.`);
  return { resume, rapports };
}

/** Index des compendiums, gardé le temps d'un import */
const CACHE = new Map();

/** Dossier d'acteurs (créé au besoin) : racine / sous-dossiers de la vault */
async function dossierActeur(chemin) {
  let parent = null;
  for ( const nom of chemin.filter(Boolean) ) {
    const cle = `dossier:${parent?.id ?? ""}:${nom}`;
    let d = CACHE.get(cle) ?? game.folders.find(f => f.type === "Actor" && f.name === nom && (f.folder?.id ?? null) === (parent?.id ?? null));
    d ??= await Folder.create({ name: nom, type: "Actor", folder: parent?.id ?? null });
    CACHE.set(cle, d);
    parent = d;
  }
  return parent?.id ?? null;
}

async function importerFiche(f, racine) {
  const remarques = { nonRepris: [], approximations: [], compendium: [], crees: [] };
  const p = f.proprietes;
  const utilises = new Set(PROPRIETES_NOTE);
  const lire = k => { utilises.add(k); return p[k]; };
  if ( !(f.creature in CONFIG.Actor.dataModels) ) {
    return { nom: f.nom, ignore: true, remarques: { ignores: [`Créature « ${f.creature} » sans fiche : non importée.`] } };
  }
  const type = f.creature;
  const champs = CONFIG.Actor.dataModels[type].schema.fields;
  const system = {};

  // Champs simples du modèle (identité, génération, arété…) : même clé dans la note
  for ( const [cle, champ] of Object.entries(champs) ) {
    if ( !(cle in p) || Array.isArray(p[cle]) ) continue;
    if ( champ instanceof foundry.data.fields.NumberField ) {
      const n = Number(lire(cle));
      if ( Number.isFinite(n) ) system[cle] = Math.max(0, Math.round(n));
      else remarques.approximations.push(`${cle} « ${p[cle]} » n'est pas un nombre : valeur par défaut.`);
    } else if ( champ instanceof foundry.data.fields.StringField ) {
      const v = String(lire(cle) ?? "");
      const choix = champ.choices ? Object.keys(typeof champ.choices === "function" ? champ.choices() : champ.choices) : null;
      if ( choix && !choix.includes(v) ) remarques.approximations.push(`${cle} « ${v} » hors des choix : valeur par défaut.`);
      else system[cle] = v;
    }
  }
  const jeu = system.jeu ?? CONFIG.Actor.dataModels[type].JEU_DEFAUT;
  const config = configTraits();

  // Attributs : clé du système ou nom affiché (Sang-froid → apparence)
  system.attributs = {};
  system.specialites = {};
  const attributs = Object.keys(champs.attributs.fields);
  const cleAttribut = nom => attributs.find(k => [k, slug(nomAttribut(k, config))].includes(slug(nom)));
  for ( const k of attributs ) {
    const source = [k, slug(nomAttribut(k, config))].find(c => c in p);
    if ( source !== undefined ) system.attributs[k] = lire(source);
  }

  // Capacités de base (clé) et capacités affichées (nom, renommage ou ajout du monde)
  system.capacites = {};
  system.capacites_ajoutees = {};
  for ( const k of Object.keys(champs.capacites.fields) ) if ( typeof p[k] === "number" ) system.capacites[k] = lire(k);
  const affichees = capacitesAffichees(jeu, config, type).flatMap(g => g.traits.map(t => ({ ...t, groupe: g.groupe })));
  const capacite = nom => affichees.find(t => [norm(t.nom), norm(t.cle)].includes(norm(nom)));
  // Valeur numérique de la note portant le nom d'une capacité affichée (« esquive: 4 »)
  for ( const t of affichees ) {
    if ( utilises.has(t.cle) || typeof p[t.cle] !== "number" ) continue;
    if ( t.ajoutee ) system.capacites_ajoutees[t.cle] = { valeur: lire(t.cle), specialite: "" };
    else system.capacites[t.cle] = lire(t.cle);
  }

  // Capacités secondaires : capacité affichée, spécialité d'un trait, ou vraie capacité secondaire
  const traits = f.traits ?? {};
  utilises.add("capacites_secondaires");
  system.capacites_secondaires = [];
  const secondaires = traits.capacites_secondaires ?? [];
  for ( const t of secondaires.filter(t => !t.specialite_de) ) {
    const c = capacite(t.nom);
    if ( c?.ajoutee ) system.capacites_ajoutees[c.cle] = { valeur: t.valeur, specialite: t.detail };
    else if ( c ) {
      system.capacites[c.cle] = t.valeur;
      if ( t.detail ) system.specialites[c.cle] = t.detail;
    } else {
      // Colonne d'origine si la capacité existe dans un autre jeu ou un autre profil (Rituels → Connaissances)
      const categorie = colonneConnue(t.nom, config);
      system.capacites_secondaires.push({ nom: t.nom, valeur: t.valeur, categorie: categorie ?? "talents", specialite: t.detail });
      remarques.approximations.push(categorie
        ? `« ${t.nom} » n'est pas affichée pour ce jeu : capacité secondaire en ${categorie} (colonne d'un autre jeu).`
        : `« ${t.nom} » n'est pas une capacité connue : capacité secondaire rangée en talents par défaut.`);
    }
  }
  for ( const t of secondaires.filter(t => t.specialite_de) ) {
    const a = cleAttribut(t.nom);
    const c = !a && capacite(t.nom);
    const sec = !a && !c && system.capacites_secondaires.find(s => norm(s.nom) === norm(t.nom));
    let niveau;
    if ( a ) { system.specialites[a] = t.detail; niveau = system.attributs[a]; }
    else if ( c?.ajoutee ) { (system.capacites_ajoutees[c.cle] ??= { valeur: 0 }).specialite = t.detail; niveau = system.capacites_ajoutees[c.cle].valeur; }
    else if ( c ) { system.specialites[c.cle] = t.detail; niveau = system.capacites[c.cle]; }
    else if ( sec ) { sec.specialite = t.detail; niveau = sec.valeur; }
    else { remarques.nonRepris.push(`Spécialité « ${t.detail} » : trait « ${t.nom} » introuvable.`); continue; }
    if ( t.valeur && niveau !== undefined && t.valeur !== niveau ) {
      remarques.approximations.push(`Spécialité « ${t.nom} (${t.detail}) » notée ${t.valeur}, mais le trait vaut ${niveau}.`);
    }
  }

  // Listes de traits notés (historiques, atouts, handicaps, disciplines, dons…)
  for ( const [cle, liste] of Object.entries(traits) ) {
    if ( cle === "capacites_secondaires" ) continue;
    if ( !(champs[cle] instanceof foundry.data.fields.ArrayField) ) continue;
    utilises.add(cle);
    system[cle] = liste.map(t => ({ nom: t.detail ? `${t.nom} (${t.detail})` : t.nom, valeur: t.valeur }));
    for ( const t of liste.filter(t => !t.valeur) ) remarques.approximations.push(`${cle} : « ${t.nom} » sans valeur (0).`);
  }

  // Jauges « x_permanente / x_temporaire » (Volonté, Rage, Gnose…)
  for ( const [cle, champ] of Object.entries(champs) ) {
    if ( !(champ instanceof foundry.data.fields.SchemaField) || !champ.fields.permanente ) continue;
    if ( `${cle}_permanente` in p ) system[cle] = { permanente: lire(`${cle}_permanente`), temporaire: lire(`${cle}_temporaire`) ?? p[`${cle}_permanente`] };
  }
  // Groupes de points (vertus, sphères…) : une propriété par clé
  for ( const groupe of ["vertus", "spheres"] ) {
    if ( !champs[groupe] ) continue;
    system[groupe] = {};
    for ( const k of Object.keys(champs[groupe].fields) ) if ( typeof p[k] === "number" ) system[groupe][k] = lire(k);
  }
  // Renommée garou : « gloire » et « gloire_temporaire »
  if ( champs.renommee ) {
    system.renommee = {};
    for ( const k of Object.keys(champs.renommee.fields) ) {
      if ( k in p ) system.renommee[k] = { permanente: lire(k), temporaire: lire(`${k}_temporaire`) ?? p[k] };
    }
  }
  // Liste « specialites » : « Trait : spécialité »
  if ( Array.isArray(p.specialites) ) {
    utilises.add("specialites");
    for ( const ligne of p.specialites ) {
      const [nom, spec] = String(ligne).split(/\s*:\s*/, 2);
      if ( !spec ) continue;
      const a = cleAttribut(nom);
      const c = !a && capacite(nom);
      const sec = !a && !c && system.capacites_secondaires.find(s => memeNom(s.nom, nom));
      if ( a ) system.specialites[a] = spec;
      else if ( c?.ajoutee ) (system.capacites_ajoutees[c.cle] ??= { valeur: 0 }).specialite = spec;
      else if ( c ) system.specialites[c.cle] = spec;
      else if ( sec ) sec.specialite = spec;
      else remarques.nonRepris.push(`Spécialité « ${spec} » : trait « ${nom} » introuvable.`);
    }
  }
  if ( champs.voie ) system.voie = { nom: lire("voie") ?? "Humanité", valeur: lire("voie_valeur") ?? 7 };
  if ( champs.sang ) system.sang = { valeur: lire("sang") ?? 0, max: lire("sang_max") ?? 10, par_tour: lire("sang_par_tour") ?? 1 };
  system.sante = {
    niveaux: lire("sante_niveaux") ?? 7, contondants: lire("degats_contondants") ?? 0,
    letaux: lire("degats_letaux") ?? 0, aggraves: lire("degats_aggraves") ?? 0
  };

  // Biographie : sections connues ; les autres sections sont gardées dans les notes du MJ
  system.biographie = {};
  const autres = [];
  for ( const [titre, html] of Object.entries(f.sections) ) {
    const champ = SECTIONS_BIO[titre];
    if ( champ ) system.biographie[champ] = [system.biographie[champ], html].filter(Boolean).join("\n");
    else if ( SECTIONS_JOUEUR.has(titre) ) {
      // Visible du joueur (les notes du MJ sont cachées) : à la suite de l'historique
      system.biographie.historique = [system.biographie.historique, `<h2>${titre}</h2>${html}`].filter(Boolean).join("\n");
      remarques.approximations.push(`Section « ${titre} » : pas de champ dédié, ajoutée à la fin de l'historique.`);
    } else {
      autres.push(`<h2>${titre}</h2>${html}`);
      if ( !SECTIONS_OBJETS.has(titre) ) remarques.nonRepris.push(`Section « ${titre} » : pas de champ sur la fiche, placée dans les notes du MJ.`);
    }
  }
  if ( autres.length ) system.biographie.notes_mj = [system.biographie.notes_mj ?? "", ...autres].join("\n");

  // Portrait et jeton : images copiées depuis la vault par le script Python
  const portrait = lire("portrait");
  const jeton = lire("jeton");
  const images = f.images ?? {};
  if ( portrait && !images.portrait ) remarques.nonRepris.push(`Portrait « ${portrait} » : image introuvable dans la vault.`);
  if ( jeton && !images.jeton ) remarques.nonRepris.push(`Jeton « ${jeton} » : image introuvable dans la vault.`);

  // Valeur d'une capacité qui n'est pas affichée pour ce jeu (« esquive: 2 » sur un mortel) : capacité secondaire
  for ( const [k, v] of Object.entries(p) ) {
    if ( utilises.has(k) || (typeof v !== "number") || !v ) continue;
    const colonne = colonneConnue(k, config);
    if ( !colonne ) continue;
    utilises.add(k);
    const cleLabel = `WODHOMEBREW.Actor.FIELDS.capacites.${k}.label`;
    const nom = game.i18n.has(cleLabel) ? game.i18n.localize(cleLabel) : k.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
    system.capacites_secondaires.push({ nom, valeur: v, categorie: colonne, specialite: "" });
    remarques.approximations.push(`« ${k} » n'est pas affichée pour ce jeu : capacité secondaire en ${colonne}.`);
  }

  // Propriétés de la note sans place sur la fiche
  for ( const [k, v] of Object.entries(p) ) {
    if ( !utilises.has(k) && !(Array.isArray(v) && !v.length) && v !== "" ) remarques.nonRepris.push(`Propriété ${k} = ${JSON.stringify(v)}`);
  }

  // Objets de la fiche : pouvoirs, rituels, équipement
  const items = [
    ...await pouvoirs(f, jeu, remarques),
    ...await rituels(f, remarques),
    ...await equipement(f, remarques)
  ];

  // Remplacer un import précédent de la même note
  const chemin = f.chemin ?? f.nom;
  const ancien = game.actors.find(a => {
    const i = a.getFlag("wod_homebrew", "import");
    return i && ((i.chemin === chemin) || (!i.chemin && a.name === f.nom));
  });
  if ( ancien ) await ancien.delete();
  const folder = await dossierActeur([racine, ...(f.dossier ?? [])]);
  const acteur = await Actor.create({
    name: f.nom, type, system, items, folder,
    ...(images.portrait ? { img: images.portrait } : {}),
    prototypeToken: { name: f.nom, ...((images.jeton ?? images.portrait) ? { texture: { src: images.jeton ?? images.portrait } } : {}) },
    flags: { wod_homebrew: { import: { source: "vault", chemin, date: Date.now() } } }
  });
  return { nom: f.nom, id: acteur.id, remarques };
}

/** Colonne (talents, competences, connaissances) d'une capacité dans n'importe quel jeu ou ajout du monde */
function colonneConnue(nom, config) {
  const cle = slug(nom);
  for ( const jeu of Object.keys(WODHOMEBREW.capacites) ) {
    for ( const [groupe, cles] of Object.entries(WODHOMEBREW.capacites[jeu]) ) {
      if ( cles.includes(cle) ) return groupe;
      if ( (config.capacites[jeu]?.ajouts?.[groupe] ?? []).some(a => a.cle === cle || slug(a.nom) === cle) ) return groupe;
    }
  }
  return null;
}

/** Index d'un compendium du monde (vide s'il n'existe pas) */
async function indexPack(nom) {
  if ( CACHE.has(`pack:${nom}`) ) return CACHE.get(`pack:${nom}`);
  const pack = game.packs.get(`world.${nom}`);
  let r = { pack: null, index: [] };
  if ( pack ) {
    const index = await pack.getIndex({ fields: ["system.groupe", "system.niveau", "system.edition", "system.categorie"] });
    r = { pack, index: [...index] };
  }
  CACHE.set(`pack:${nom}`, r);
  return r;
}

async function copier(pack, entree) {
  const doc = (await pack.getDocument(entree._id)).toObject();
  delete doc._id;
  delete doc.folder;
  foundry.utils.setProperty(doc, "_stats.compendiumSource", entree.uuid);
  return doc;
}

async function pouvoirs(f, jeu, remarques) {
  const packs = [await indexPack("disciplines"), await indexPack("dons")];
  const resultat = [];
  const pris = new Set();
  for ( const p of f.pouvoirs ) {
    // Un pouvoir du compendium n'est pris qu'une fois (deux « Révérence » de niveaux différents dans la note)
    const chercher = groupe => packs.flatMap(({ pack, index }) => index
      .filter(e => memeNom(e.name, p.nom) && groupe(norm(e.system?.groupe)))
      .filter(e => !pris.has(e.uuid))
      .map(e => ({ pack, e })));
    let candidats = chercher(g => !p.groupe || g === norm(p.groupe));
    // Pouvoir combiné rangé sous son propre nom dans la note (« Suprématie mentale : Choc mental »)
    if ( !candidats.length ) candidats = chercher(g => g === norm("Disciplines combinées"));
    // Même niveau d'abord, puis l'édition du personnage
    candidats.sort((a, b) => ((a.e.system.niveau === p.niveau) ? 0 : 2) + ((a.e.system.edition === jeu) ? 0 : 1)
      - (((b.e.system.niveau === p.niveau) ? 0 : 2) + ((b.e.system.edition === jeu) ? 0 : 1)));
    const trouve = candidats[0];
    if ( trouve ) {
      pris.add(trouve.e.uuid);
      const doc = await copier(trouve.pack, trouve.e);
      if ( p.niveau && doc.system.niveau !== p.niveau ) {
        remarques.approximations.push(`${p.groupe} : « ${p.nom} » niveau ${p.niveau} dans la note, ${doc.system.niveau} dans le compendium (${doc.system.edition}).`);
      }
      remarques.compendium.push(`${p.groupe} : ${p.nom} (${doc.system.edition})`);
      resultat.push(doc);
    } else {
      remarques.crees.push(`Pouvoir ${p.groupe} : « ${p.nom} » absent des compendiums, créé depuis la note.`);
      resultat.push({ name: p.nom, type: "pouvoir", system: {
        categorie: "discipline", groupe: p.groupe, niveau: p.niveau || 1, edition: "autre",
        description: p.effet ? `<p>${foundry.utils.escapeHTML(p.effet)}</p>` : "" } });
    }
  }
  return resultat;
}

async function rituels(f, remarques) {
  const { pack, index } = await indexPack("disciplines");
  const resultat = [];
  for ( const r of f.rituels ) {
    const nom = r.Rituel ?? r.Nom ?? "";
    const propre = nom.replace(/\s*\([^)]*\)\s*$/, "");
    const e = index.find(x => memeNom(x.name, propre));
    if ( e ) { resultat.push(await copier(pack, e)); remarques.compendium.push(`Rituel : ${propre}`); continue; }
    remarques.crees.push(`Rituel « ${nom} » absent des compendiums, créé depuis la note.`);
    resultat.push({ name: nom, type: "pouvoir", system: {
      categorie: "rite", groupe: "Rituels", niveau: Number(r.Niveau) || 1, edition: "autre",
      description: r.Effet ? `<p>${foundry.utils.escapeHTML(r.Effet)}</p>` : "" } });
  }
  return resultat;
}

async function equipement(f, remarques) {
  const { pack, index } = await indexPack("armes-et-armures");
  const resultat = [];
  for ( const o of f.equipement ) {
    const nom = o.Objet ?? o.Nom ?? "";
    const e = index.find(x => memeNom(x.name, nom));
    if ( e ) { resultat.push(await copier(pack, e)); remarques.compendium.push(`Objet : ${nom}`); continue; }
    const effet = o.Effet ?? "";
    const categorie = CATEGORIES_OBJET[norm(o.Type)] ?? "divers";
    const system = { categorie, description: [effet, o.Description].filter(Boolean).map(t => `<p>${foundry.utils.escapeHTML(t)}</p>`).join("") };
    // Quelques formes courantes : « Force + 2 », « 4 dégâts », « 2 points de protection », « diff. 5 »
    const force = effet.match(/Force\s*\+\s*(\d+)/i);
    const degats = effet.match(/(\d+)\s*d[ée]g[âa]ts/i);
    const protection = effet.match(/(\d+)\s*points? de protection/i);
    // Arme de corps à corps « Force + N » : Bagarre, contondant ; arme à dégâts fixes : arme à feu, létal
    if ( force ) Object.assign(system, { degats: Number(force[1]), force: true, competence: "bagarre", attribut: "dexterite", type_degats: "contondant" });
    else if ( degats ) Object.assign(system, { degats: Number(degats[1]), competence: "armes_a_feu", attribut: "dexterite", type_degats: "letal" });
    // Une protection importée est portée
    if ( protection ) Object.assign(system, { armure: Number(protection[1]), equipe: true });
    const lu = force || degats || protection;
    if ( categorie === "arme" && !force && !degats ) remarques.approximations.push(`Arme « ${nom} » : dégâts non reconnus (« ${effet} »).`);
    if ( (categorie === "arme") && /diff/i.test(effet) ) remarques.approximations.push(`Arme « ${nom} » : difficulté propre (« ${effet} ») sans champ sur l'objet.`);
    if ( categorie === "arme" && (force || degats) ) {
      remarques.approximations.push(`Arme « ${nom} » : ${force ? "Bagarre, contondant" : "Armes à feu, létal"} déduits ; à vérifier.`);
    }
    if ( categorie === "artefact" && !lu ) remarques.approximations.push(`Artefact « ${nom} » : effet gardé en description, aucun effet automatique.`);
    remarques.crees.push(`Objet « ${nom} » (${categorie}) absent du compendium, créé depuis la note.`);
    resultat.push({ name: nom, type: "objet", system });
  }
  return resultat;
}
