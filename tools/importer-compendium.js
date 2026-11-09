/**
 * Remplit le compendium du monde « Armes et armures » à partir du JSON produit par import_objets_vault.py.
 * À lancer dans la console de Foundry (F12), connecté en MJ :
 *   const { importerCompendium } = await import("/systems/wod_homebrew/tools/importer-compendium.js");
 *   await importerCompendium("wod-homebrew-objets/objets.json");
 * Le compendium est vidé puis rempli (dossiers Armes, Armures, Artefacts). Il appartient au monde :
 * il n'est pas publié avec le système.
 */
export async function importerCompendium(url, { nom = "armes-et-armures", titre = "Armes et armures" } = {}) {
  if ( !game.user.isGM ) throw new Error("Import réservé au MJ");
  const objets = await (await fetch(url, { cache: "no-store" })).json();
  let pack = game.packs.get(`world.${nom}`);
  if ( !pack ) pack = await foundry.documents.collections.CompendiumCollection.createCompendium({ label: titre, name: nom, type: "Item" });
  if ( pack.locked ) await pack.configure({ locked: false });

  // Vider le compendium (objets et dossiers)
  const anciens = await pack.getIndex();
  if ( anciens.size ) await Item.deleteDocuments(anciens.map(i => i._id), { pack: pack.collection });
  if ( pack.folders.size ) await Folder.deleteDocuments(pack.folders.map(f => f.id), { pack: pack.collection });

  // Dossiers : par catégorie pour les objets, par discipline (system.groupe) pour les pouvoirs
  const cleDossier = o => {
    if ( o.type !== "pouvoir" ) return o.system.categorie;
    const groupe = o.system.groupe || "Autres pouvoirs";
    return (o.system.categorie === "don") ? `Dons - ${groupe}` : groupe;
  };
  const libelles = { arme: "Armes", armure: "Armures", artefact: "Artefacts", divers: "Divers" };
  const dossiers = {};
  for ( const cle of [...new Set(objets.map(cleDossier))].sort((a, b) => a.localeCompare(b, "fr")) ) {
    dossiers[cle] = (await Folder.create({ name: libelles[cle] ?? cle, type: "Item" }, { pack: pack.collection })).id;
  }
  const docs = objets.map(o => ({ ...o, folder: dossiers[cleDossier(o)] ?? null }));
  const crees = await Item.createDocuments(docs, { pack: pack.collection });
  ui.notifications.info(`${titre} : ${crees.length} objets importés.`);
  return crees.length;
}
