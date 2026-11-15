/**
 * Remplit le compendium du monde « Armes et armures » à partir du JSON produit par import_objets_vault.py.
 * À lancer dans la console de Foundry (F12), connecté en MJ :
 *   const { importerCompendium } = await import("/systems/wod_homebrew/tools/importer-compendium.js");
 *   await importerCompendium("wod-homebrew-objets/objets.json");
 *   await importerCompendium("wod-homebrew-pouvoirs/pouvoirs.json", { nom: "disciplines", titre: "Disciplines", filtre: o => o.system.categorie === "discipline" });
 *   await importerCompendium("wod-homebrew-pouvoirs/pouvoirs.json", { nom: "dons", titre: "Dons", filtre: o => o.system.categorie === "don" });
 *   await importerCompendium("wod-homebrew-avantages/avantages.json", { nom: "atouts-et-handicaps", titre: "Atouts et handicaps" });
 * Les objets sont validés et dédoublonnés avant que le compendium soit vidé puis rempli (dossiers par catégorie d'objet, ou par groupe). Il appartient au monde :
 * il n'est pas publié avec le système.
 */
export async function importerCompendium(url, { nom = "armes-et-armures", titre = "Armes et armures", filtre = null } = {}) {
  if ( !game.user.isGM ) throw new Error("Import réservé au MJ");
  let objets = await (await fetch(url, { cache: "no-store" })).json();
  if ( filtre ) objets = objets.filter(filtre);

  // Préparer et valider AVANT de vider le compendium : un objet invalide ne doit pas le laisser vide
  const { WODHOMEBREW } = await import("../module/config.mjs");
  const vus = new Set();
  let doublons = 0;
  const invalides = [];
  objets = objets.filter(o => {
    if ( (o.type === "objet") && !(o.system?.categorie in WODHOMEBREW.categoriesObjet) ) {
      o.system = { ...o.system, categorie: "divers" };
    }
    // Doublons : même type, même groupe, même nom (accents et casse ignorés)
    const cle = [o.type, o.system?.groupe ?? "", o.name].join("|").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    if ( vus.has(cle) ) { doublons++; return false; }
    vus.add(cle);
    try { new Item.implementation(o).validate({ strict: true }); }
    catch(err) { invalides.push(`${o.name} : ${err.message.split("\n")[0]}`); return false; }
    return true;
  });
  if ( invalides.length ) console.warn(`${titre} : objets invalides ignorés`, invalides);
  let pack = game.packs.get(`world.${nom}`);
  if ( !pack ) pack = await foundry.documents.collections.CompendiumCollection.createCompendium({ label: titre, name: nom, type: "Item" });
  if ( pack.locked ) await pack.configure({ locked: false });

  // Vider le compendium (objets et dossiers)
  const anciens = await pack.getIndex();
  if ( anciens.size ) await Item.deleteDocuments(anciens.map(i => i._id), { pack: pack.collection });
  if ( pack.folders.size ) await Folder.deleteDocuments(pack.folders.map(f => f.id), { pack: pack.collection });

  // Objets : par catégorie ; pouvoirs, atouts et handicaps : par groupe (discipline, tribu, auspice, note de la vault)
  const cleDossier = o => (o.type === "objet") ? (o.system.categorie ?? "divers") : (o.system.groupe || "Autres");
  const libelles = { arme: "Armes", armure: "Armures", artefact: "Artefacts", divers: "Divers" };
  const dossiers = {};
  for ( const cle of [...new Set(objets.map(cleDossier))].sort((a, b) => a.localeCompare(b, "fr")) ) {
    dossiers[cle] = (await Folder.create({ name: libelles[cle] ?? cle, type: "Item" }, { pack: pack.collection })).id;
  }
  const docs = objets.map(o => ({ ...o, folder: dossiers[cleDossier(o)] ?? null }));
  const crees = await Item.createDocuments(docs, { pack: pack.collection });
  const details = [doublons && `${doublons} doublons retirés`, invalides.length && `${invalides.length} invalides ignorés (voir la console)`].filter(Boolean);
  ui.notifications.info(`${titre} : ${crees.length} objets importés${details.length ? ` (${details.join(", ")})` : ""}.`);
  return { crees: crees.length, doublons, invalides };
}
