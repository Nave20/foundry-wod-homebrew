/**
 * Fabriques de champs réutilisables.
 */
const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;

/** Valeur entière ≥ 0 (points d'une jauge) */
export function points(initial = 0, options = {}) {
  return new NumberField({ required: true, nullable: false, integer: true, min: 0, initial, ...options });
}

/** Texte court, vide autorisé */
export function texte(initial = "") {
  return new StringField({ required: true, blank: true, initial });
}

/** Jauge permanente / temporaire (Volonté, Rage, Gnose, Renommée…) */
export function jauge(initial = 1) {
  return new SchemaField({ permanente: points(initial), temporaire: points(initial) });
}

/**
 * Liste libre de traits notés : [{ nom, valeur }] (historiques, disciplines, dons…)
 * @param {object} [extra]  Champs supplémentaires de chaque ligne
 */
export function listeTraits(extra = {}) {
  return new ArrayField(new SchemaField({ nom: texte(), valeur: points(0), ...extra }));
}

/** Schéma construit à partir d'une liste de clés : { cle: points(initial) } */
export function groupe(cles, initial = 0) {
  return new SchemaField(Object.fromEntries(cles.map(k => [k, points(initial)])));
}
