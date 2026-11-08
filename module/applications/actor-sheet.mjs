import { WODHOMEBREW } from "../config.mjs";
import { CHAMPS_PREFAITS, LISTES_PREFAITES } from "../listes.mjs";
import MenuSuggestions from "./suggestions.mjs";
import OrbeSang from "../orbe.mjs";
import { GriffesRage, LuneGnose } from "../jauges-garou.mjs";
import RoueMage from "../roue-mage.mjs";
import { capacitesAffichees, configTraits, nomAttribut } from "../traits.mjs";
import { lancerJet, preparerJet, reglesJets, texteModificateur } from "../des.mjs";
import { armeDe, MAINS_NUES, lancerAttaque } from "../combat.mjs";
import { malusDexterite, reserveEncaissement } from "../combat-regles.mjs";
import { FORMES, attributsEnForme, difficultePerception, forme as donneesForme } from "../formes.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const TEMPLATES = "systems/wod_homebrew/templates/actor";

/** Chemin du champ noté d'une ligne jetable (data-champ, sinon l'input caché des points) */
const champJet = ligne => ligne.dataset.champ || ligne.querySelector(".wod-points input[type=hidden]")?.name;

/** Période du reflet des cases de Volonté (secondes), commune à toutes les fiches pour rester synchronisé */
const REFLET_PERIODE = 4.5;

/** En-tête compacte : 4 champs clés par créature, sur une ligne */
const ENTETE = {
  mortel: ["concept", "occupation", "nature", "attitude"],
  vampire: ["clan", "generation", "nature", "attitude"],
  goule: ["domitor", "clan_domitor", "nature", "attitude"],
  garou: ["tribu", "auspice", "nature", "attitude"],
  mage: ["tradition", "essence", "nature", "attitude"]
};

/** Section « Identité » de l'onglet Biographie : le reste des champs d'identité */
const IDENTITE = {
  mortel: ["chronique", "joueur", "affiliation"],
  vampire: ["concept", "chronique", "joueur", "sire", "secte", "refuge"],
  goule: ["concept", "chronique", "joueur", "secte"],
  garou: ["concept", "chronique", "joueur", "race", "meute", "totem", "rang"],
  mage: ["concept", "chronique", "joueur", "cabale", "paradigme", "pratique", "instruments"]
};

/** Listes libres (nom + valeur) par onglet et par créature */
const LISTES_AVANTAGES = {
  commun: ["historiques", "atouts", "handicaps"],
  vampire: ["disciplines"],
  goule: ["disciplines"],
  garou: ["dons", "rites", "fetiches"],
  mage: []
};

/**
 * Fiche unique pour les cinq créatures. Mise en page volontairement simple :
 * elle sert d'abord à saisir et stocker les données.
 */
export default class WodActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["wod_homebrew", "actor", "standard-form"],
    position: { width: 720, height: 760 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      listeAjouter: WodActorSheet.#onListeAjouter,
      caseSante: WodActorSheet.#onCaseSante,
      sang: WodActorSheet.#onSang,
      volonte: WodActorSheet.#onVolonte,
      jauge: WodActorSheet.#onJauge,
      roue: WodActorSheet.#onRoue,
      listeRetirer: WodActorSheet.#onListeRetirer,
      point: WodActorSheet.#onPoint,
      specialite: WodActorSheet.#onSpecialite,
      objetCreer: WodActorSheet.#onObjetCreer,
      objetEditer: WodActorSheet.#onObjetEditer,
      objetSupprimer: WodActorSheet.#onObjetSupprimer,
      attaquer: WodActorSheet.#onAttaquer,
      formeChoisir: WodActorSheet.#onFormeChoisir,
      formeChanger: WodActorSheet.#onFormeChanger,
      ouvrirForme: WodActorSheet.#onOuvrirForme,
      equiper: WodActorSheet.#onEquiper
    }
  };

  static PARTS = {
    entete: { template: `${TEMPLATES}/entete.hbs`, templates: [`${TEMPLATES}/trait.hbs`] },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    traits: { template: `${TEMPLATES}/traits.hbs`, scrollable: [""], templates: [`${TEMPLATES}/liste-traits.hbs`, `${TEMPLATES}/trait.hbs`] },
    avantages: { template: `${TEMPLATES}/avantages.hbs`, scrollable: [""], templates: [`${TEMPLATES}/liste-traits.hbs`] },
    etat: { template: `${TEMPLATES}/etat.hbs`, scrollable: [""], templates: [`${TEMPLATES}/trait.hbs`] },
    combat: { template: `${TEMPLATES}/combat.hbs`, scrollable: [""] },
    forme: { template: `${TEMPLATES}/forme.hbs`, scrollable: [""] },
    biographie: { template: `${TEMPLATES}/biographie.hbs`, scrollable: [""] },
    barre: { template: `${TEMPLATES}/barre-jet.hbs` }
  };

  static TABS = {
    primary: {
      tabs: [{ id: "traits" }, { id: "avantages" }, { id: "etat" }, { id: "combat" }, { id: "forme" }, { id: "biographie" }],
      initial: "traits",
      labelPrefix: "WODHOMEBREW.Fiche.Onglets"
    }
  };

  /**
   * Traits sélectionnés pour un jet : un attribut et une capacité au plus ({ name, nom } ou null).
   * Gardés d'un rendu à l'autre.
   */
  #jet = { attribut: null, capacite: null, volonte: null };

  /** Options du jet en cours : spécialité utilisée, dés et difficulté ajoutés à la main, réglages dépliés */
  #optionsJet = { specialite: true, desBonus: 0, diffMod: 0, ouvert: false, volonte: false, sang: false, quintessence: 0, malus: null };

  /** Forme du garou choisie pour voir ses effets (pas encore appliquée), et forme affichée au rendu précédent */
  #formeChoix = null;
  #formeAffichee = null;

  /** Arme de l'attaque en préparation dans la barre de jet ({ id, nom, absente? }) ou null */
  #arme = null;

  /** Orbe de sang affiché (pour animer le passage d'une valeur à l'autre entre deux rendus) */
  #orbe = null;

  /** Jauges du garou affichées (rage, gnose), même principe que l'orbe */
  #jaugesGarou = {};

  /** Volonté temporaire affichée au rendu précédent (pour animer les cases ajoutées ou retirées) */
  #volonteAffichee = null;

  /** Roue du mage affichée (quintessence, paradoxe) */
  #roue = null;

  /** Panneau des réglages ouvert ? */
  #reglagesOuverts = false;

  /** L'onglet Forme n'existe que pour les garous */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    if ( this.document.type !== "garou" ) delete parts.forme;
    return parts;
  }

  /** @inheritDoc */
  _prepareTabs(group) {
    const tabs = super._prepareTabs(group);
    if ( (group === "primary") && (this.document.type !== "garou") ) delete tabs.forme;
    return tabs;
  }

  /** @inheritDoc */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);
    // Classe par créature : sert aux couleurs de la fiche (mage bleu, vampire rouge, garou vert)
    options.classes.push(`creature-${options.document.type}`);
    return options;
  }

  /* -------------------------------------------- */
  /*  Contexte                                    */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const system = actor.system;
    const source = actor._source.system;
    const fields = system.schema.fields;
    const type = actor.type;

    /** Prépare un champ simple (clé de premier niveau de system) */
    const champ = (cle, parentFields = fields, parentSource = source, chemin = "") => ({
      cle, field: parentFields[cle], value: parentSource[cle], chemin: `${chemin}${cle}`
    });
    const traitsChronique = configTraits();
    /** Champ noté avec sa spécialité (attributs, capacités) */
    const avecSpecialite = c => ({ ...c, spec: { name: `system.specialites.${c.cle}`, value: source.specialites?.[c.cle] ?? "" } });

    Object.assign(context, {
      actor, system, source, systemFields: fields, type,
      typeLabel: CONFIG.Actor.typeLabels[type],
      isGM: game.user.isGM,
      echelle: system.echelle_max,
      reglagesOuverts: this.#reglagesOuverts,
      estVampirique: type === "vampire" || type === "goule",
      estGarou: type === "garou",
      estMage: type === "mage",
      entete: {
        haut: (ENTETE[type] ?? []).map(k => champ(k)),
        identite: (IDENTITE[type] ?? []).map(k => champ(k)),
        reglages: ["jeu", "role", "statut", "echelle_max"].map(k => champ(k))
      },
      attributs: Object.entries(WODHOMEBREW.attributs).map(([groupe, cles]) => ({
        label: `WODHOMEBREW.Attributs.${groupe}`,
        traits: cles.map(k => ({
          ...avecSpecialite(champ(k, fields.attributs.fields, source.attributs)),
          nom: nomAttribut(k, traitsChronique), name: `system.attributs.${k}`,
          effectif: (system.attributs?.[k] !== source.attributs?.[k]) ? system.attributs[k] : null
        }))
      })),
      // Capacités du jeu, avec les noms, masques et ajouts des « Traits de la chronique »
      capacites: capacitesAffichees(system.jeu, traitsChronique, type).map(({ groupe, traits }) => ({
        cle: groupe,
        label: `WODHOMEBREW.Capacites.${groupe}`,
        traits: traits.map(t => t.ajoutee ? {
          cle: t.cle, nom: t.nom, name: `system.capacites_ajoutees.${t.cle}.valeur`,
          value: source.capacites_ajoutees?.[t.cle]?.valeur ?? 0,
          spec: { name: `system.capacites_ajoutees.${t.cle}.specialite`, value: source.capacites_ajoutees?.[t.cle]?.specialite ?? "" }
        } : {
          ...avecSpecialite(champ(t.cle, fields.capacites.fields, source.capacites)),
          nom: t.nom, name: `system.capacites.${t.cle}`
        }),
        secondaires: this.#liste("capacites_secondaires").lignes.filter(l => l.categorie === groupe)
      })),
      listesAvantages: [...LISTES_AVANTAGES.commun, ...(LISTES_AVANTAGES[type] ?? [])].map(cle => this.#liste(cle)),
      objets: actor.items.contents.sort((a, b) => a.sort - b.sort),
      categoriesObjet: WODHOMEBREW.categoriesObjet
    });

    // Volonté : 10 cases, remplies jusqu'à la temporaire, estompées au-delà de la permanente
    const vol = source.volonte ?? {};
    context.volonteCases = Array.from({ length: 10 }, (_, i) => ({ on: i < (vol.temporaire ?? 0), hors: i >= (vol.permanente ?? 0) }));

    // Vampire / Goule
    if (context.estVampirique) {
      const sang = source.sang ?? {};
      context.orbe = { valeur: sang.valeur ?? 0, max: sang.max ?? 0, parTour: sang.par_tour ?? 1 };
      context.vertus = ["conscience", "maitrise_de_soi", "courage"].map(k => champ(k, fields.vertus.fields, source.vertus));
    }
    // Garou : jauges de rage et de gnose dans l'en-tête
    if (context.estGarou) {
      context.jaugesGarou = ["rage", "gnose"].map(cle => ({
        cle, label: `WODHOMEBREW.Actor.FIELDS.${cle}.label`,
        valeur: source[cle]?.temporaire ?? 0, max: source[cle]?.permanente ?? 0
      }));
    }
    // Mage
    if (context.estMage) {
      context.roue = { quintessence: source.quintessence ?? 0, paradoxe: source.paradoxe ?? 0, max: system.quintessenceMax };
      context.spheres = WODHOMEBREW.spheres.map(k => champ(k, fields.spheres.fields, source.spheres));
    }
    // Santé (libellés des niveaux)
    context.sante = system.sante.liste.map(n => ({
      ...n,
      label: `WODHOMEBREW.Sante.Niveaux.${n.cle}`,
      malusTexte: n.malus === null ? "" : n.malus === 0 ? "0" : String(n.malus)
    }));
    context.etatSante = `WODHOMEBREW.Sante.Niveaux.${system.sante.etat.cle}`;
    context.combat = this.#contexteCombat();
    if ( type === "garou" ) {
      context.formes = this.#contexteFormes();
      // Rappel de la forme actuelle sous le portrait
      const f = system.forme ?? "homide";
      context.formeActuelle = { cle: f, nom: _loc(`WODHOMEBREW.Forme.Noms.${f}`),
        img: foundry.utils.getRoute(`systems/wod_homebrew/assets/formes/${f}.svg`) };
    }
    return context;
  }

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (partId in (context.tabs ?? {})) context.tab = context.tabs[partId];
    if (partId === "biographie") {
      const TextEditor = foundry.applications.ux.TextEditor.implementation;
      const opts = { secrets: this.actor.isOwner, rollData: this.actor.getRollData(), relativeTo: this.actor };
      context.bio = {};
      for (const cle of ["historique", "apparence", "relations", "notes_mj"]) {
        context.bio[cle] = {
          field: context.systemFields.biographie.fields[cle],
          value: context.source.biographie[cle],
          enriched: await TextEditor.enrichHTML(context.source.biographie[cle], opts)
        };
      }
    }
    return context;
  }

  /** Onglet Forme : silhouettes, forme actuelle, forme choisie et ses effets sur les attributs */
  #contexteFormes() {
    const actuelle = this.actor.system.forme ?? "homide";
    if ( this.#formeChoix === actuelle ) this.#formeChoix = null;
    const nom = cle => _loc(`WODHOMEBREW.Forme.Noms.${cle}`);
    const base = this.actor._source.system.attributs ?? {};
    const libelle = k => _loc(`WODHOMEBREW.Actor.FIELDS.attributs.${k}.label`);
    const visibles = ["force", "dexterite", "vigueur", "manipulation", "apparence", "perception"];
    const avant = attributsEnForme(base, actuelle);
    const cible = this.#formeChoix;
    const apres = cible ? attributsEnForme(base, cible) : avant;
    let choix = null;
    if ( cible ) {
      const f = donneesForme(cible);
      const signe = n => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);
      const effets = [
        ...Object.entries(f.mods).map(([k, n]) => `${libelle(k)} ${signe(n)}`),
        ...(f.zero ?? []).map(k => `${libelle(k)} 0`),
        _loc("WODHOMEBREW.Forme.Diff", { n: f.difficulte }),
        ...(f.perception ? [_loc("WODHOMEBREW.Forme.Perception", { n: signe(f.perception) })] : []),
        ...(f.notes ?? []).map(n => _loc(`WODHOMEBREW.Forme.${n}`))
      ];
      if ( !Object.keys(f.mods).length ) effets.unshift(_loc("WODHOMEBREW.Forme.AucunChangement"));
      choix = { cle: cible, nom: nom(cible), effets: effets.join(" · ") };
    }
    return {
      actuelleNom: nom(actuelle), choix,
      liste: FORMES.map(f => ({ cle: f.cle, nom: nom(f.cle), img: foundry.utils.getRoute(`systems/wod_homebrew/assets/formes/${f.cle}.svg`),   // absolu : une url() dans une variable CSS se lit depuis la feuille de style
        actuelle: f.cle === actuelle, choix: f.cle === cible })),
      lignes: visibles.map(k => ({ nom: libelle(k), avant: avant[k], apres: apres[k], change: avant[k] !== apres[k],
        sens: apres[k] > avant[k] ? "hausse" : "baisse" }))
    };
  }

  /** Onglet Combat : armes (avec Mains nues), protections et résumé de l'encaissement */
  #contexteCombat() {
    const objets = this.actor.items.filter(i => i.type === "objet");
    const types = CONFIG.WODHOMEBREW.typesDegats;
    const ligneArme = (id, img, objet, a) => ({
      id, img, objet,
      nom: a.nom,
      competence: _loc(CONFIG.WODHOMEBREW.competencesCombat[a.competence] ?? "WODHOMEBREW.Combat.Aucune"),
      requis: a.requis,
      degatsTexte: [a.infini ? "∞" : [a.force ? _loc("WODHOMEBREW.Actor.FIELDS.attributs.force.label") : "", a.degats || (a.force ? "" : "0")]
        .filter(Boolean).join(" + "), a.type_degats ? _loc(types[a.type_degats]) : ""].filter(Boolean).join(" · "),
      portee: a.portee ? `${a.portee}${/^\d+$/.test(a.portee) ? " m" : ""}` : ""
    });
    const armes = objets.filter(i => i.system.estOffensif).map(i => ligneArme(i.id, i.img, true, armeDe(i)));
    armes.push(ligneArme(MAINS_NUES, "icons/svg/combat.svg", false, armeDe(MAINS_NUES)));
    const protections = objets.filter(i => i.system.estProtection).map(i => ({
      id: i.id, img: i.img, nom: i.name, armure: i.system.armure, malus: i.system.malus, equipe: i.system.equipe
    }));
    const vigueur = Number(this.actor.system.attributs?.vigueur) || 0;
    const listeProtections = protections.map(p => ({ armure: p.armure, malus: p.malus, equipe: p.equipe }));
    const total = reserveEncaissement(vigueur, listeProtections);
    const malus = malusDexterite(listeProtections);
    return { armes, protections,
      resume: _loc("WODHOMEBREW.Combat.Resume", { v: vigueur, a: total - vigueur, n: total })
        + (malus ? ` · ${_loc("WODHOMEBREW.Combat.MalusDex", { n: malus })}` : "") };
  }

  /** Données d'affichage d'une liste libre { nom, valeur } */
  #liste(cle) {
    const prefaite = LISTES_PREFAITES[cle]?.[this.actor.type];
    return {
      cle,
      suggestions: !!prefaite?.length,
      label: `WODHOMEBREW.Actor.FIELDS.${cle}.label`,
      lignes: (this.actor._source.system[cle] ?? []).map((l, index) => ({ ...l, index }))
    };
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    // Jets : un clic sur le nom d'un attribut ou d'une capacité le sélectionne (un par catégorie)
    for ( const ligne of this.element.querySelectorAll(".form-group[data-jet]") ) {
      const name = champJet(ligne);
      const libelle = ligne.querySelector(".nom-trait .libelle");
      if ( !name || !libelle ) continue;
      libelle.classList.add("jetable");
      libelle.dataset.tooltip = _loc("WODHOMEBREW.Jets.Selectionner");
      libelle.addEventListener("click", () => {
        const cat = ligne.dataset.jet;
        const choix = this.#jet[cat]?.name === name ? null : { name, nom: libelle.textContent.trim(), categorie: cat };
        // Le jet de Volonté se lance seul ; choisir un attribut ou une capacité le désélectionne
        this.#arme = null;
        if ( cat === "volonte" ) this.#jet = { attribut: null, capacite: null, volonte: choix };
        else { this.#jet.volonte = null; this.#jet[cat] = choix; }
        this.#optionsJet.specialite = true;   // la case Spécialité repart cochée à chaque nouvelle sélection
        this.#optionsJet.malus = null;        // malus de blessure : choix automatique selon le jet
        this.#majBarreJet();
      });
    }
    this.#majBarreJet();
    this.#ecouterBarreJet();

    // Orbe de sang : repart du niveau affiché au rendu précédent pour animer le changement
    const svgOrbe = this.element.querySelector(".orbe-sang svg");
    if ( svgOrbe ) {
      const { valeur, max } = context.orbe;
      const niveau = max > 0 ? valeur / max : 0;
      this.#orbe = new OrbeSang(svgOrbe, niveau, this.#orbe?.niveauAffiche ?? null);
    }
    // Forme du garou : éclair sur la silhouette quand la forme vient de changer
    if ( this.actor.type === "garou" ) {
      const f = this.actor.system.forme;
      if ( (this.#formeAffichee !== null) && (this.#formeAffichee !== f) ) {
        this.element.querySelector(".forme-garou.actuelle")?.classList.add("eclair");
      }
      this.#formeAffichee = f;
    }

    // Cases de Volonté : reflet calé sur une horloge commune, animation des cases ajoutées ou retirées
    const cases = [...this.element.querySelectorAll(".volonte-lames .lame")];
    const maintenant = performance.now() / 1000;
    cases.forEach((c, i) => c.style.setProperty("--dl", `${(i * .13 - (maintenant % REFLET_PERIODE)).toFixed(3)}s`));
    const temp = context.source.volonte?.temporaire ?? 0, avant = this.#volonteAffichee;
    if ( (avant !== null) && (temp !== avant) ) {
      const classe = temp > avant ? "ajout" : "retrait";
      for ( let i = Math.min(temp, avant); i < Math.max(temp, avant); i++ ) {
        const c = cases[i];
        if ( !c ) continue;
        c.classList.add(classe);
        if ( classe === "retrait" ) this.#cendres(c);
        setTimeout(() => c.classList.remove(classe), 800);
      }
    }
    this.#volonteAffichee = temp;

    // Roue du mage
    const svgRoue = this.element.querySelector(".roue-mage svg");
    if ( svgRoue ) this.#roue = new RoueMage(svgRoue, context.roue, this.#roue?.valeursAffichees ?? null);
    // Jauges du garou
    for ( const j of context.jaugesGarou ?? [] ) {
      const svg = this.element.querySelector(`.jauge-garou[data-cle="${j.cle}"] svg`);
      if ( !svg ) continue;
      const Classe = j.cle === "rage" ? GriffesRage : LuneGnose;
      this.#jaugesGarou[j.cle] = new Classe(svg, j, this.#jaugesGarou[j.cle]?.niveauAffiche ?? null);
    }

    // Le panneau « Réglages de la fiche » reste ouvert d'un rendu à l'autre
    this.element.querySelector("details.reglages")?.addEventListener("toggle", e => this.#reglagesOuverts = e.target.open);
    if ( !this.isEditable ) return;
    // Menu de suggestions (listes préfaites) sur les champs « nom » des historiques, atouts et handicaps
    const labelCreature = _loc("WODHOMEBREW.Suggestions.creature", { creature: _loc(CONFIG.Actor.typeLabels[this.actor.type]) });
    for ( const input of this.element.querySelectorAll("input[data-suggestions]") ) {
      const entrees = LISTES_PREFAITES[input.dataset.suggestions]?.[this.actor.type];
      if ( entrees ) new MenuSuggestions(input, entrees, { conteneur: this.element, labelCreature });
    }
    // Capacités secondaires : nom figé une fois saisi, double-clic pour renommer, nom vide = ligne retirée
    for ( const ligne of this.element.querySelectorAll(".secondaire[data-index]") ) {
      const index = Number(ligne.dataset.index);
      const label = ligne.querySelector("label.nom-trait");
      label?.addEventListener("dblclick", () => {
        const hidden = ligne.querySelector("input.valeur-nom");
        this.#editerEnLigne(label.querySelector(".libelle"), hidden.value, v => {
          if ( !v ) return this.#retirerLigne("capacites_secondaires", index);
          hidden.value = v;
          hidden.dispatchEvent(new Event("change", { bubbles: true }));
        });
      });
      const saisie = ligne.querySelector("input.nom-secondaire");
      if ( saisie ) {
        saisie.focus();
        saisie.addEventListener("blur", () => { if ( !saisie.value.trim() ) this.#retirerLigne("capacites_secondaires", index); });
      }
    }

    // Champs d'en-tête : nature, attitude, clan, secte, tribu, auspice, tradition…
    for ( const [cle, entrees] of Object.entries(CHAMPS_PREFAITS) ) {
      const input = this.element.querySelector(`input[name="system.${cle}"]`);
      if ( input ) new MenuSuggestions(input, entrees, { conteneur: this.element, labelCreature });
    }
  }

  /**
   * Choix d'un nom dans une liste préfaite : si la valeur de la ligne est encore à 0,
   * on y met le coût de l'atout ou du handicap avant l'enregistrement.
   * @inheritDoc
   */
  _onChangeForm(formConfig, event) {
    const champ = event.target;
    // Nom secondaire vide : la ligne est retirée au blur. Saisie en ligne : validée par son propre code.
    if ( champ.classList?.contains("nom-secondaire") && !champ.value.trim() ) return;
    if ( champ.classList?.contains("saisie-en-ligne") ) return;
    const m = champ.name?.match(/^system\.(\w+)\.(\d+)\.nom$/);
    const cout = m && LISTES_PREFAITES[m[1]]?.[this.actor.type]?.find(([nom]) => nom === champ.value)?.[1];
    if ( cout ) {
      const valeur = this.form.elements[`system.${m[1]}.${m[2]}.valeur`];
      if ( valeur && !Number(valeur.value) ) valeur.value = cout;
    }
    super._onChangeForm(formConfig, event);
  }

  /* -------------------------------------------- */
  /*  Actions (this = la fiche)                   */
  /* -------------------------------------------- */

  /** Clic sur un point : monte jusqu'à lui, ou l'enlève si c'est le dernier point rempli */
  static #onPoint(event, target) {
    const input = target.closest(".wod-points")?.querySelector("input[type=hidden]");
    if ( !input ) return;
    const i = Number(target.dataset.valeur);
    // Minimum du champ (ex. Avatar du mage : au moins 1)
    const champ = input.name.startsWith("system.") ? this.actor.system.schema.getField(input.name.slice(7)) : null;
    input.value = Math.max(champ?.min ?? 0, (i === Number(input.value)) ? i - 1 : i);
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /** Traits sélectionnés avec leur valeur et leur spécialité actuelles */
  #traitsJet() {
    return ["attribut", "capacite", "volonte"].map(cat => this.#jet[cat]).filter(Boolean).map(t => {
      const ligne = this.#ligneJet(t.name);
      const specialite = ligne?.querySelector("input.valeur-specialite")?.value?.trim() || "";
      return { nom: t.nom, categorie: t.categorie, valeur: Number(foundry.utils.getProperty(this.actor, t.name)) || 0, specialite };
    }).concat(this.#arme?.absente ? [{ nom: this.#arme.absente, categorie: "capacite", valeur: 0, specialite: "" }] : []);
  }

  /** Jet préparé (réserve, difficulté, modificateurs) à partir de la sélection et des options */
  #jetPrepare() {
    const traits = this.#traitsJet();
    const etat = this.actor.system.sante?.etat ?? {};
    const regles = reglesJets();
    // Malus de blessure : appliqué par défaut, sauf au jet de Volonté (selon les règles) ; la case de la barre décide
    const seulVolonte = traits.length && traits.every(t => t.categorie === "volonte");
    const parDefaut = regles.malusBlessure && !(seulVolonte && regles.volonteSansMalus);
    return preparerJet(traits, {
      ...this.#optionsJet,
      malus: Number(etat.malus) || 0,
      neutralise: etat.malus === null,
      etatSante: etat.cle ? _loc(`WODHOMEBREW.Sante.Niveaux.${etat.cle}`) : "",
      appliquerMalus: this.#optionsJet.malus ?? parDefaut,
      // Garou : difficulté de Perception selon la forme
      autres: this.#modsForme(),
      // Protections équipées : malus aux jets de Dextérité
      malusArmure: (this.#jet.attribut?.name === "system.attributs.dexterite") ? this.#malusArmure() : 0
    }, regles);
  }

  /** Modificateurs de la forme du garou pour le jet en cours (Perception en Lupus et en Hispo) */
  #modsForme() {
    if ( this.actor.type !== "garou" ) return [];
    const diff = difficultePerception(this.actor.system.forme);
    if ( !diff || (this.#jet.attribut?.name !== "system.attributs.perception") ) return [];
    return [{ label: _loc("WODHOMEBREW.Forme.ModForme", { nom: _loc(`WODHOMEBREW.Forme.Noms.${this.actor.system.forme}`) }), diff }];
  }

  /** Malus de Dextérité des protections équipées */
  #malusArmure() {
    return malusDexterite(this.actor.items.filter(i => (i.type === "objet") && i.system.estProtection)
      .map(i => ({ malus: i.system.malus, equipe: i.system.equipe })));
  }

  #reinitialiserJet() {
    this.#arme = null;
    this.#jet = { attribut: null, capacite: null, volonte: null };
    this.#optionsJet = { specialite: true, desBonus: 0, diffMod: 0, ouvert: false, volonte: false, sang: false, quintessence: 0, malus: null };
    this.#majBarreJet();
  }

  /** Ligne jetable affichée pour un champ donné */
  #ligneJet(name) {
    return [...this.element.querySelectorAll(".form-group[data-jet]")].find(l => champJet(l) === name) ?? null;
  }

  /** Surligne la sélection et redessine la barre de jet */
  #majBarreJet() {
    const barre = this.element.querySelector(".barre-jet");
    // Un trait sélectionné qui n'est plus affiché (masqué, renommé, retiré) est oublié
    for ( const cat of Object.keys(this.#jet) ) {
      if ( this.#jet[cat] && !this.#ligneJet(this.#jet[cat].name) ) this.#jet[cat] = null;
    }
    for ( const ligne of this.element.querySelectorAll(".form-group[data-jet]") ) {
      const name = champJet(ligne);
      ligne.classList.toggle("selection-jet", Object.values(this.#jet).some(t => t?.name === name));
    }
    if ( !barre ) return;
    const jet = this.#jetPrepare();
    barre.hidden = !jet.traits.length;
    if ( !jet.traits.length ) return barre.replaceChildren();
    const regles = reglesJets();
    const o = this.#optionsJet;
    const e = foundry.utils.escapeHTML;
    const signe = n => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
    const composition = (this.#arme ? `<b>${e(_loc("WODHOMEBREW.Combat.AttaqueAvec", { nom: this.#arme.nom }))}</b> · ` : "")
      + jet.traits.map(t => `${e(t.nom)} (${t.valeur})`).join(" + ");
    // La case Spécialité n'apparaît que si un des traits choisis en a une
    const specialite = jet.specialites.length ? `
      <label class="ligne-specialite">
        <input type="checkbox" data-jet-action="specialite" ${o.specialite ? "checked" : ""}>
        ${_loc("WODHOMEBREW.Jets.UtiliserSpecialite")} : <b>${e(jet.specialites.join(", "))}</b>
        <span class="hint">(+${regles.specialiteDes} ${_loc("WODHOMEBREW.Jets.Un_de")}, −${regles.specialiteDifficulte} ${_loc("WODHOMEBREW.Jets.DifficulteCourte")})</span>
      </label>` : "";
    const reglages = o.ouvert ? `
      <div class="reglages-jet">
        <span class="reglage">${_loc("WODHOMEBREW.Jets.DesSupplementaires")}
          <button type="button" data-jet-action="des-moins">−</button><b>${signe(o.desBonus)}</b><button type="button" data-jet-action="des-plus">+</button></span>
        <span class="reglage">${_loc("WODHOMEBREW.Jets.Difficulte")}
          <button type="button" data-jet-action="diff-moins">−</button><b>${jet.difficulte}</b><button type="button" data-jet-action="diff-plus">+</button></span>
      </div>` : "";
    // Malus de blessure : case cochée si appliqué ; avertissement si le personnage est neutralisé
    const etat = this.actor.system.sante?.etat ?? {};
    const blessure = (Number(etat.malus) < 0) ? `
      <label class="ligne-specialite">
        <input type="checkbox" data-jet-action="malus" ${jet.malusApplique ? "checked" : ""}>
        ${_loc("WODHOMEBREW.Jets.MalusBlessure", { etat: e(_loc(`WODHOMEBREW.Sante.Niveaux.${etat.cle}`)), n: Math.abs(etat.malus) })}
      </label>` : (etat.malus === null ? `<div class="alerte-jet"><i class="fa-solid fa-triangle-exclamation" inert></i> ${_loc("WODHOMEBREW.Jets.Neutralise")}</div>` : "");

    // Ressources dépensables : Volonté (tous), sang (vampires), quintessence (mages)
    const s = this.actor.system;
    const ressources = [];
    if ( s.volonte ) {
      const reste = s.volonte.temporaire ?? 0;
      ressources.push(`<label class="ressource ${reste < 1 ? "epuisee" : ""}">
        <input type="checkbox" data-jet-action="volonte" ${o.volonte ? "checked" : ""} ${reste < 1 ? "disabled" : ""}>
        ${_loc("WODHOMEBREW.Jets.DepenserVolonte")} <span class="hint">(${_loc("WODHOMEBREW.Jets.Reste", { n: reste })})</span></label>`);
    }
    if ( (this.actor.type === "vampire") && s.sang ) {
      const reste = s.sang.valeur ?? 0;
      ressources.push(`<label class="ressource ${reste < 1 ? "epuisee" : ""}">
        <input type="checkbox" data-jet-action="sang" ${o.sang ? "checked" : ""} ${reste < 1 ? "disabled" : ""}>
        ${_loc("WODHOMEBREW.Jets.DepenserSang")} <span class="hint">(+${regles.sangDes} ${_loc("WODHOMEBREW.Jets.Un_de")}, −${regles.sangDifficulte} ${_loc("WODHOMEBREW.Jets.DifficulteCourte")} · ${_loc("WODHOMEBREW.Jets.Reste", { n: reste })})</span></label>`);
    }
    if ( (this.actor.type === "mage") && regles.quintessenceParJet ) {
      const reste = s.quintessence ?? 0;
      ressources.push(`<span class="ressource reglage">${_loc("WODHOMEBREW.Jets.Quintessence")}
        <button type="button" data-jet-action="quint-moins" ${o.quintessence < 1 ? "disabled" : ""}>−</button><b>${o.quintessence}</b>
        <button type="button" data-jet-action="quint-plus" ${(o.quintessence >= Math.min(regles.quintessenceParJet, reste)) ? "disabled" : ""}>+</button>
        <span class="hint">(${_loc("WODHOMEBREW.Jets.QuintessenceAide", { max: regles.quintessenceParJet, n: reste })})</span></span>`);
    }
    const blocRessources = ressources.length ? `<div class="ressources-jet">${ressources.join("")}</div>` : "";
    const mods = jet.modificateurs.length
      ? `<div class="mods-jet">${jet.modificateurs.map(m => e(texteModificateur(m))).join(" · ")}</div>` : "";
    barre.innerHTML = `
      <div class="ligne-jet">
        <i class="fa-solid fa-dice-d20" inert></i>
        <span class="composition">${composition}</span>
        <span class="resume">${jet.reserve}d${regles.de} · ${_loc("WODHOMEBREW.Jets.DifficulteCourte")} ${jet.difficulte}</span>
        <button type="button" class="icone-jet ${o.ouvert ? "actif" : ""}" data-jet-action="reglages" data-tooltip="${_loc("WODHOMEBREW.Jets.Ajuster")}"><i class="fa-solid fa-gear" inert></i></button>
        <button type="button" class="lancer" data-jet-action="lancer"><i class="fa-solid fa-dice" inert></i> ${_loc("WODHOMEBREW.Jets.Lancer")}</button>
        <button type="button" class="icone-jet" data-jet-action="annuler" data-tooltip="${_loc("WODHOMEBREW.Jets.Annuler")}"><i class="fa-solid fa-xmark" inert></i></button>
      </div>${blessure}${specialite}${blocRessources}${reglages}${mods}`;
  }

  /** Clics et case à cocher de la barre de jet (sans passer par le formulaire de la fiche) */
  #ecouterBarreJet() {
    const barre = this.element.querySelector(".barre-jet");
    if ( !barre ) return;
    barre.addEventListener("change", event => {
      event.stopPropagation();   // ne pas enregistrer la fiche
      const action = event.target.dataset.jetAction;
      if ( ["specialite", "volonte", "sang", "malus"].includes(action) ) {
        this.#optionsJet[action] = event.target.checked;
        this.#majBarreJet();
      }
    });
    barre.addEventListener("click", async event => {
      const bouton = event.target.closest("button[data-jet-action]");
      if ( !bouton ) return;
      const o = this.#optionsJet;
      switch ( bouton.dataset.jetAction ) {
        case "reglages": o.ouvert = !o.ouvert; break;
        case "des-plus": o.desBonus += 1; break;
        case "des-moins": o.desBonus -= 1; break;
        case "diff-plus": o.diffMod += 1; break;
        case "diff-moins": o.diffMod -= 1; break;
        case "quint-plus": o.quintessence += 1; break;
        case "quint-moins": o.quintessence = Math.max(0, o.quintessence - 1); break;
        case "annuler": return this.#reinitialiserJet();
        case "lancer": {
          const resultat = this.#arme
            ? await lancerAttaque(this.actor, this.#jetPrepare(), this.#arme.id)
            : await lancerJet(this.actor, this.#jetPrepare());
          if ( resultat ) this.#reinitialiserJet();
          return;
        }
      }
      this.#majBarreJet();
    });
  }

  /** Clic sur ✎ : saisie de la spécialité du trait, à la place de son affichage */
  static #onSpecialite(event, target) {
    const ligne = target.closest(".form-group");
    const hidden = ligne?.querySelector("input.valeur-specialite");
    if ( !hidden ) return;
    ligne.querySelector(".specialite")?.remove();
    const place = document.createElement("span");
    target.replaceWith(place);
    this.#editerEnLigne(place, hidden.value, v => {
      hidden.value = v;
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
    }, "WODHOMEBREW.Fiche.Specialite");
  }

  /**
   * Remplace un élément par un petit champ texte. Entrée ou clic ailleurs valide, Échap annule.
   * @param {HTMLElement} element
   * @param {string} valeur
   * @param {(v: string) => void} valider   Appelé avec le texte saisi (rogné), seulement s'il a changé
   * @param {string} [placeholder]          Clé de traduction
   */
  #editerEnLigne(element, valeur, valider, placeholder) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "saisie-en-ligne";
    input.value = valeur;
    if ( placeholder ) input.placeholder = _loc(placeholder);
    let fini = false;
    const terminer = ok => {
      if ( fini ) return;
      fini = true;
      const v = input.value.trim();
      if ( ok && (v !== valeur) ) valider(v);
      else this.render();
    };
    input.addEventListener("keydown", e => {
      if ( e.key === "Enter" ) { e.preventDefault(); terminer(true); }
      else if ( e.key === "Escape" ) { e.preventDefault(); e.stopPropagation(); terminer(false); }
    });
    input.addEventListener("blur", () => terminer(true));
    element.replaceWith(input);
    input.focus();
    input.select();
  }

  /** Retire la ligne `index` d'une liste libre */
  #retirerLigne(cle, index) {
    const liste = foundry.utils.deepClone(this.actor._source.system[cle] ?? []);
    if ( !liste[index] ) return;
    liste.splice(index, 1);
    return this.actor.update({ [`system.${cle}`]: liste });
  }

  /**
   * Clic sur une case de santé : elle s'aggrave (vide → contondant → létal → aggravé → vide).
   * Les dégâts sont stockés en nombres ; la fiche range les plus graves en haut.
   */
  /** Petites cendres qui tombent d'une case de Volonté retirée */
  #cendres(c) {
    for ( let i = 0; i < 5; i++ ) {
      const s = document.createElement("span");
      s.className = "cendre";
      s.style.left = `${15 + Math.random() * 70}%`;
      s.style.animationDelay = `${(.25 + Math.random() * .2).toFixed(2)}s`;
      s.style.setProperty("--dx", `${((Math.random() - .5) * 10).toFixed(1)}px`);
      c.appendChild(s);
      setTimeout(() => s.remove(), 1200);
    }
  }

  /** Boutons − et + de la Volonté : points temporaires, entre 0 et la permanente */
  static async #onVolonte(event, target) {
    const vol = this.actor.system.volonte;
    const valeur = Math.max(0, Math.min(vol.permanente, vol.temporaire + Number(target.dataset.delta)));
    if ( valeur !== vol.temporaire ) await this.actor.update({ "system.volonte.temporaire": valeur });
  }

  /** Boutons − et + de l'orbe : dépense ou regain d'un point de sang */
  static async #onSang(event, target) {
    const sang = this.actor.system.sang;
    if ( !sang ) return;
    const valeur = Math.max(0, Math.min(sang.max, sang.valeur + Number(target.dataset.delta)));
    if ( valeur !== sang.valeur ) await this.actor.update({ "system.sang.valeur": valeur });
  }

  /** Boutons − et + des jauges du garou : points temporaires de rage ou de gnose, entre 0 et le score permanent */
  static async #onJauge(event, target) {
    const cle = target.closest("[data-cle]")?.dataset.cle;
    const jauge = this.actor.system[cle];
    if ( !jauge ) return;
    const valeur = Math.max(0, Math.min(jauge.permanente, jauge.temporaire + Number(target.dataset.delta)));
    if ( valeur !== jauge.temporaire ) await this.actor.update({ [`system.${cle}.temporaire`]: valeur });
  }

  /** Boutons de la roue du mage : ±1 quintessence ou paradoxe (les plafonds et la règle du paradoxe sont dans Actor#_preUpdate) */
  static async #onRoue(event, target) {
    const cle = target.dataset.cle;
    const actuel = this.actor.system[cle] ?? 0;
    const valeur = Math.max(0, Math.min(20, actuel + Number(target.dataset.delta)));
    if ( valeur !== actuel ) await this.actor.update({ [`system.${cle}`]: valeur });
  }

  static async #onCaseSante(event, target) {
    const s = this.actor._source.system.sante;
    let { contondants: c, letaux: l, aggraves: a } = s;
    switch ( target.dataset.type ) {
      case "contondant": c -= 1; l += 1; break;
      case "letal": l -= 1; a += 1; break;
      case "aggrave": a -= 1; break;
      default:
        if ( c + l + a >= s.niveaux ) return;
        c += 1;
    }
    return this.actor.update({ "system.sante.contondants": Math.max(0, c), "system.sante.letaux": Math.max(0, l),
      "system.sante.aggraves": Math.max(0, a) });
  }

  static async #onListeAjouter(event, target) {
    const cle = target.dataset.liste;
    const liste = foundry.utils.deepClone(this.actor._source.system[cle] ?? []);
    const ligne = { nom: "", valeur: 0 };
    if ( target.dataset.categorie ) ligne.categorie = target.dataset.categorie;
    liste.push(ligne);
    return this.actor.update({ [`system.${cle}`]: liste });
  }

  static async #onListeRetirer(event, target) {
    const { liste: cle, index } = target.dataset;
    const liste = foundry.utils.deepClone(this.actor._source.system[cle] ?? []);
    liste.splice(Number(index), 1);
    return this.actor.update({ [`system.${cle}`]: liste });
  }

  static async #onObjetCreer() {
    return Item.implementation.create({ name: _loc("WODHOMEBREW.Objet.Nouveau"), type: "objet" }, { parent: this.actor });
  }

  static #objet(target) {
    return this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
  }

  static async #onObjetEditer(event, target) {
    return WodActorSheet.#objet.call(this, target)?.sheet.render({ force: true });
  }

  /** « Attaquer » : la barre de jet se remplit avec l'attribut et la compétence de l'arme */
  static #onAttaquer(event, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    const arme = armeDe(id === MAINS_NUES ? MAINS_NUES : this.actor.items.get(id));
    if ( !arme ) return;
    const choix = (name, categorie) => {
      const ligne = this.#ligneJet(name);
      return ligne ? { name, nom: ligne.querySelector(".nom-trait .libelle")?.textContent.trim() || name, categorie } : null;
    };
    const attribut = choix(`system.attributs.${arme.attribut}`, "attribut");
    let capacite = null;
    if ( arme.competence ) capacite = choix(`system.capacites.${arme.competence}`, "capacite")
      ?? choix(`system.capacites_ajoutees.${arme.competence}.valeur`, "capacite");
    this.#jet = { attribut, capacite, volonte: null };
    this.#arme = { id, nom: arme.nom,
      absente: (arme.competence && !capacite) ? _loc(CONFIG.WODHOMEBREW.competencesCombat[arme.competence]) : null };
    this.#optionsJet = { specialite: true, desBonus: 0, diffMod: 0, ouvert: false, volonte: false, sang: false, quintessence: 0, malus: null };
    this.#majBarreJet();
  }

  /** Clic sur une silhouette : montre ses effets (un second clic, ou un clic sur la forme actuelle, les cache) */
  static #onFormeChoisir(event, target) {
    const cle = target.dataset.forme;
    this.#formeChoix = (this.#formeChoix === cle) || (cle === this.actor.system.forme) ? null : cle;
    this.render();
  }

  /** Mini silhouette sous le portrait : ouvre l'onglet Forme */
  static #onOuvrirForme() {
    this.changeTab("forme", "primary");
  }

  /** « Changer de forme » : applique la forme choisie */
  static async #onFormeChanger() {
    const cle = this.#formeChoix;
    if ( !cle ) return;
    this.#formeChoix = null;
    await this.actor.update({ "system.forme": cle });
  }

  /** Case « Équipée » d'une protection */
  static async #onEquiper(event, target) {
    const item = WodActorSheet.#objet.call(this, target);
    if ( item ) await item.update({ "system.equipe": !item.system.equipe });
  }

  static async #onObjetSupprimer(event, target) {
    return WodActorSheet.#objet.call(this, target)?.deleteDialog();
  }
}
