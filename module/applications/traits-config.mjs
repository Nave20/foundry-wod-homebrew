import { WODHOMEBREW } from "../config.mjs";
import { SYSTEME, clesAjoutees, configTraits, nomLivre, normaliserTraits, nouvelleCle } from "../traits.mjs";
import { appliquerTraits, enregistrerProfil, listeProfils, memesTraits, supprimerProfil } from "../profils.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Fenêtre du MJ : « Traits de la chronique ».
 * Un onglet pour les attributs (communs à tous les jeux) et un par jeu pour les capacités.
 * Les modifications sont gardées en mémoire d'un onglet à l'autre, puis enregistrées d'un coup.
 */
export default class TraitsConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "wod-traits-config",
    tag: "form",
    classes: ["wod_homebrew", "traits-config", "standard-form"],
    window: { title: "WODHOMEBREW.Traits.Titre", icon: "fa-solid fa-list-check", resizable: true },
    position: { width: 620, height: 720 },
    form: { handler: TraitsConfig.#onSubmit, closeOnSubmit: true },
    actions: {
      ajouter: TraitsConfig.#onAjouter,
      retirer: TraitsConfig.#onRetirer,
      reinitialiser: TraitsConfig.#onReinitialiser,
      profilEnregistrer: TraitsConfig.#onProfilEnregistrer,
      profilSupprimer: TraitsConfig.#onProfilSupprimer,
      profilExporter: TraitsConfig.#onProfilExporter,
      profilImporter: TraitsConfig.#onProfilImporter
    }
  };

  static PARTS = {
    form: { template: "systems/wod_homebrew/templates/apps/traits-config.hbs", scrollable: [".liste-config"] },
    footer: { template: "templates/generic/form-footer.hbs" }
  };

  /** Copie de travail du réglage */
  #config = configTraits();

  /** Onglet affiché : "attributs" ou un jeu (V20, W20…) */
  #onglet = "attributs";

  /** Profil sélectionné dans la liste ("" = configuration personnalisée) */
  #profil = game.settings.get(SYSTEME, "profilActif");

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    // Profils
    const profils = listeProfils();
    const choisi = profils[this.#profil];
    context.profils = Object.entries(profils).map(([id, p]) => ({ id, nom: p.nom, integre: p.integre, actif: id === this.#profil }));
    context.profilsIntegres = context.profils.filter(p => p.integre);
    context.profilsMonde = context.profils.filter(p => !p.integre);
    context.profilPersonnalise = !choisi;
    context.profilModifie = !!choisi && !memesTraits(choisi.config, this.#config);
    context.profilEstMonde = !!choisi && !choisi.integre;
    const onglets = { attributs: "WODHOMEBREW.Traits.OngletAttributs", ...WODHOMEBREW.jeux };
    context.onglets = Object.entries(onglets).map(([cle, label]) => ({ cle, label, actif: cle === this.#onglet }));
    context.estAttributs = this.#onglet === "attributs";
    context.trierAlpha = this.#config.trierAlpha;
    if ( context.estAttributs ) {
      const r = this.#config.attributs.renommes;
      context.groupes = Object.entries(WODHOMEBREW.attributs).map(([groupe, cles]) => ({
        label: `WODHOMEBREW.Attributs.${groupe}`,
        base: cles.map(cle => ({ cle, livre: nomLivre("attributs", cle), nom: r[cle] ?? "", name: `attributs.renommes.${cle}` }))
      }));
    } else {
      const jeu = this.#onglet;
      const c = this.#config.capacites[jeu];
      context.jeu = jeu;
      context.groupes = Object.entries(WODHOMEBREW.capacites[jeu]).map(([groupe, cles]) => ({
        groupe,
        label: `WODHOMEBREW.Capacites.${groupe}`,
        base: cles.map(cle => ({
          cle, livre: nomLivre("capacites", cle), nom: c.renommes[cle] ?? "", masque: c.masques.includes(cle),
          name: `capacites.${jeu}.renommes.${cle}`, nameMasque: `capacites.${jeu}.masques.${cle}`
        })),
        ajouts: c.ajouts[groupe].map((a, i) => ({ ...a, prefixe: `capacites.${jeu}.ajouts.${groupe}.${i}` }))
      }));
    }
    context.buttons = [
      { type: "button", action: "reinitialiser", icon: "fa-solid fa-rotate-left", label: "WODHOMEBREW.Traits.Reinitialiser" },
      { type: "submit", icon: "fa-solid fa-floppy-disk", label: "WODHOMEBREW.Traits.Enregistrer" }
    ];
    return context;
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector("select.profil")?.addEventListener("change", event => {
      const profil = listeProfils()[event.target.value];
      if ( !profil ) return;
      this.#profil = event.target.value;
      this.#config = foundry.utils.deepClone(profil.config);
      this.render();
    });
    // Toute modification d'un champ met à jour l'indicateur « modifié »
    this.element.querySelector(".traits-corps")?.addEventListener("change", event => {
      if ( event.target.matches("select.profil, select.onglet") ) return;
      this.#lireFormulaire();
      const profil = listeProfils()[this.#profil];
      this.element.querySelector(".profil-modifie")?.classList.toggle("visible", !!profil && !memesTraits(profil.config, this.#config));
    });
    this.element.querySelector("select.onglet")?.addEventListener("change", event => {
      this.#lireFormulaire();
      this.#onglet = event.target.value;
      this.render();
    });
    // Curseur dans la ligne ajoutée (nom vide)
    this.element.querySelector("input.nom-ajout[value='']")?.focus();
  }

  /** Reporte les champs de l'onglet affiché dans la copie de travail */
  #lireFormulaire() {
    const data = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(this.element).object);
    const propre = obj => Object.fromEntries(Object.entries(obj ?? {})
      .map(([k, v]) => [k, String(v ?? "").trim()]).filter(([, v]) => v));
    this.#config.trierAlpha = !!data.trierAlpha;
    if ( this.#onglet === "attributs" ) {
      this.#config.attributs.renommes = propre(data.attributs?.renommes);
      return;
    }
    const jeu = this.#onglet;
    const d = data.capacites?.[jeu] ?? {};
    const c = this.#config.capacites[jeu];
    c.renommes = propre(d.renommes);
    c.masques = Object.entries(d.masques ?? {}).filter(([, v]) => v).map(([k]) => k);
    // Clés déjà prises : capacités et attributs de base, et capacités ajoutées
    const prises = new Set([...WODHOMEBREW.toutesCapacites, ...Object.values(WODHOMEBREW.attributs).flat(),
      ...clesAjoutees(this.#config)]);
    for ( const groupe of Object.keys(c.ajouts) ) {
      c.ajouts[groupe] = Object.values(d.ajouts?.[groupe] ?? {}).map(a => {
        const nom = String(a.nom ?? "").trim();
        if ( !nom ) return null;
        let cle = a.cle;
        if ( !cle ) { cle = nouvelleCle(nom, prises); prises.add(cle); }
        return { cle, nom };
      }).filter(Boolean);
    }
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #onAjouter(event, target) {
    this.#lireFormulaire();
    this.#config.capacites[this.#onglet].ajouts[target.dataset.groupe].push({ cle: "", nom: "" });
    this.render();
  }

  static #onRetirer(event, target) {
    this.#lireFormulaire();
    const { groupe, index } = target.dataset;
    this.#config.capacites[this.#onglet].ajouts[groupe].splice(Number(index), 1);
    this.render();
  }

  static #onReinitialiser() {
    if ( this.#onglet === "attributs" ) this.#config.attributs.renommes = {};
    else {
      const c = this.#config.capacites[this.#onglet];
      c.renommes = {};
      c.masques = [];
      for ( const g of Object.keys(c.ajouts) ) c.ajouts[g] = [];
    }
    this.render();
  }

  /* -------------------------------------------- */
  /*  Profils                                     */
  /* -------------------------------------------- */

  /** Enregistre la configuration affichée comme profil du monde (même nom = mise à jour) */
  static async #onProfilEnregistrer() {
    this.#lireFormulaire();
    const actuel = listeProfils()[this.#profil];
    const nom = await foundry.applications.api.DialogV2.prompt({
      window: { title: "WODHOMEBREW.Profils.Enregistrer" },
      content: `<div class="form-group"><label>${_loc("WODHOMEBREW.Profils.Nom")}</label>
        <input type="text" name="nom" value="${foundry.utils.escapeHTML(actuel && !actuel.integre ? actuel.nom : "")}" autofocus></div>`,
      ok: { label: "WODHOMEBREW.Profils.Enregistrer", callback: (event, button) => button.form.elements.nom.value.trim() },
      rejectClose: false
    });
    if ( !nom ) return;
    this.#profil = await enregistrerProfil(nom, this.#config);
    ui.notifications.info(_loc("WODHOMEBREW.Profils.EnregistreNotif", { nom }));
    this.render();
  }

  static async #onProfilSupprimer() {
    const profil = listeProfils()[this.#profil];
    if ( !profil || profil.integre ) return;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "WODHOMEBREW.Profils.Supprimer" },
      content: `<p>${_loc("WODHOMEBREW.Profils.SupprimerConfirmer", { nom: foundry.utils.escapeHTML(profil.nom) })}</p>`
    });
    if ( !ok ) return;
    await supprimerProfil(this.#profil);
    this.#profil = "";
    this.render();
  }

  /** Télécharge la configuration affichée en .json */
  static #onProfilExporter() {
    this.#lireFormulaire();
    const nom = listeProfils()[this.#profil]?.nom ?? _loc("WODHOMEBREW.Profils.Personnalise");
    const donnees = { type: "wod_homebrew.traits", version: 1, nom, config: normaliserTraits(this.#config) };
    const fichier = nom.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
    foundry.utils.saveDataToFile(JSON.stringify(donnees, null, 2), "application/json", `traits-${fichier || "profil"}.json`);
  }

  /** Importe un profil depuis un .json exporté : il devient un profil du monde et s'affiche */
  static #onProfilImporter() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      const fichier = input.files?.[0];
      if ( !fichier ) return;
      try {
        const donnees = JSON.parse(await foundry.utils.readTextFromFile(fichier));
        if ( donnees?.type !== "wod_homebrew.traits" || !donnees.config ) throw new Error("format");
        const nom = String(donnees.nom || fichier.name.replace(/\.json$/i, "")).trim();
        this.#config = normaliserTraits(donnees.config);
        this.#profil = await enregistrerProfil(nom, this.#config);
        ui.notifications.info(_loc("WODHOMEBREW.Profils.ImporteNotif", { nom }));
        this.render();
      } catch ( err ) {
        ui.notifications.error("WODHOMEBREW.Profils.ImportInvalide", { localize: true });
      }
    });
    input.click();
  }

  static async #onSubmit() {
    this.#lireFormulaire();
    await appliquerTraits(this.#config, this.#profil);
    ui.notifications.info("WODHOMEBREW.Traits.Enregistre", { localize: true });
  }
}
