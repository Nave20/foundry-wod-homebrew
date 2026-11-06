/**
 * Menu de suggestions sous un champ texte (remplace le <datalist> natif, qu'on ne peut pas styler).
 * - s'ouvre au focus ou à la saisie, filtre pendant la frappe (sans tenir compte des accents) ;
 * - regroupe par catégorie et affiche le coût en points ;
 * - clavier : ↑ ↓ pour choisir, Entrée pour valider, Échap pour fermer.
 * Valider remplit le champ et déclenche « change », ce qui enregistre la fiche.
 */

/** Ordre et libellés des catégories (clés WODHOMEBREW.Suggestions.*) */
const ORDRE = ["physique", "mental", "social", "surnaturel", "creature", "camarilla", "sabbat", "independants", "lignees",
  "nation_garou", "autres_tribus", "traditions", "technocratie", "autres_mages"];

const normaliser = s => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default class MenuSuggestions {
  /**
   * @param {HTMLInputElement} input
   * @param {Array<[string, number|null, string|null]>} entrees  [nom, coût, catégorie]
   * @param {object} options
   * @param {HTMLElement} options.conteneur  Élément qui reçoit le menu (hérite des couleurs de la fiche)
   * @param {string} options.labelCreature   Libellé de la catégorie « creature »
   */
  constructor(input, entrees, { conteneur, labelCreature }) {
    this.input = input;
    this.entrees = entrees;
    this.conteneur = conteneur;
    this.labelCreature = labelCreature;
    this.menu = null;
    this.actif = -1;
    input.autocomplete = "off";
    input.addEventListener("focus", () => this.ouvrir());
    input.addEventListener("input", () => this.ouvrir());
    input.addEventListener("keydown", e => this.#onKeydown(e));
    input.addEventListener("blur", () => this.fermer());
  }

  /** Entrées correspondant à la saisie, groupées par catégorie */
  #groupes() {
    const q = normaliser(this.input.value.trim());
    const filtrees = this.entrees.filter(([nom]) => !q || normaliser(nom).includes(q));
    const groupes = new Map();
    for (const e of filtrees) {
      const cat = e[2] ?? "";
      if (!groupes.has(cat)) groupes.set(cat, []);
      groupes.get(cat).push(e);
    }
    return [...groupes].sort(([a], [b]) => ORDRE.indexOf(a) - ORDRE.indexOf(b));
  }

  #label(cat) {
    if (!cat) return null;
    return cat === "creature" ? this.labelCreature : game.i18n.localize(`WODHOMEBREW.Suggestions.${cat}`);
  }

  ouvrir() {
    const groupes = this.#groupes();
    if (!groupes.length) return this.fermer();
    if (!this.menu) {
      this.menu = document.createElement("div");
      this.menu.className = "wod-suggestions";
      // mousedown avant le blur du champ : on garde le focus pour pouvoir cliquer
      this.menu.addEventListener("mousedown", e => e.preventDefault());
      this.menu.addEventListener("click", e => {
        const item = e.target.closest(".suggestion");
        if (item) this.valider(item.dataset.nom);
      });
      this.conteneur.append(this.menu);
    }
    this.menu.replaceChildren(...groupes.flatMap(([cat, entrees]) => {
      const elements = [];
      const label = this.#label(cat);
      if (label) {
        const titre = document.createElement("div");
        titre.className = "categorie";
        titre.textContent = label;
        elements.push(titre);
      }
      for (const [nom, cout] of entrees) {
        const item = document.createElement("div");
        item.className = "suggestion";
        item.dataset.nom = nom;
        const n = document.createElement("span");
        n.className = "nom";
        n.textContent = nom;
        item.append(n);
        if (cout) {
          const c = document.createElement("span");
          c.className = "cout";
          c.textContent = "●".repeat(Math.min(cout, 7));
          c.dataset.tooltip = String(cout);
          item.append(c);
        }
        elements.push(item);
      }
      return elements;
    }));
    this.actif = -1;
    this.#placer();
  }

  /** Positionne le menu sous le champ (ou au-dessus s'il n'y a pas la place) */
  #placer() {
    const r = this.input.getBoundingClientRect();
    const base = this.conteneur.getBoundingClientRect();
    const hauteurMax = 260;
    const dessous = window.innerHeight - r.bottom;
    Object.assign(this.menu.style, {
      left: `${r.left - base.left}px`,
      width: `${Math.max(r.width, 220)}px`,
      maxHeight: `${hauteurMax}px`,
      top: dessous < hauteurMax && r.top > dessous ? "" : `${r.bottom - base.top + 2}px`,
      bottom: dessous < hauteurMax && r.top > dessous ? `${base.bottom - r.top + 2}px` : ""
    });
  }

  fermer() {
    this.menu?.remove();
    this.menu = null;
    this.actif = -1;
  }

  valider(nom) {
    this.fermer();
    this.input.value = nom;
    this.input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  #onKeydown(event) {
    if (!this.menu) {
      if (event.key === "ArrowDown") { event.preventDefault(); this.ouvrir(); }
      return;
    }
    const items = [...this.menu.querySelectorAll(".suggestion")];
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        const pas = event.key === "ArrowDown" ? 1 : -1;
        this.actif = (this.actif + pas + items.length) % items.length;
        items.forEach((el, i) => el.classList.toggle("active", i === this.actif));
        items[this.actif]?.scrollIntoView({ block: "nearest" });
        break;
      }
      case "Enter":
        if (this.actif >= 0) { event.preventDefault(); this.valider(items[this.actif].dataset.nom); }
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation(); // ne ferme pas la fiche
        this.fermer();
        break;
    }
  }
}
