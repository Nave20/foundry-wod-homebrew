/**
 * Helpers Handlebars du système.
 */

const { escapeHTML } = foundry.utils;

/**
 * Points cliquables (●●●○○) liés à un champ numérique.
 * La valeur est portée par un <input type="hidden"> : la fiche l'enregistre comme un champ normal.
 * Clic sur un point vide : la valeur monte jusqu'à lui. Clic sur le dernier point rempli : il s'enlève.
 *
 * {{wodPoints name="system.attributs.force" value=3 max=5 editable=true}}
 * @param {object} options.hash
 * @param {string} options.hash.name      Chemin du champ
 * @param {number} options.hash.value     Valeur actuelle
 * @param {number} [options.hash.max=5]   Nombre de points affichés (davantage si la valeur dépasse)
 * @param {boolean} [options.hash.editable=true]
 */
export function wodPoints(options) {
  const { name, value = 0, max = 5, editable = true } = options.hash;
  const valeur = Number(value) || 0;
  const affiches = Math.max(Number(max) || 5, valeur);
  let html = `<span class="wod-points${editable ? "" : " verrouille"}" data-tooltip="${valeur}">`;
  html += `<input type="hidden" name="${escapeHTML(name)}" value="${valeur}" data-dtype="Number">`;
  for ( let i = 1; i <= affiches; i++ ) {
    const classes = ["wod-point"];
    if ( i <= valeur ) classes.push("plein");
    if ( (i % 5 === 0) && (i < affiches) ) classes.push("groupe");
    const action = editable ? ` data-action="point" data-valeur="${i}"` : "";
    html += `<span class="${classes.join(" ")}"${action}></span>`;
  }
  html += "</span>";
  return new Handlebars.SafeString(html);
}

export function registerHelpers() {
  Handlebars.registerHelper({ wodPoints });
}
