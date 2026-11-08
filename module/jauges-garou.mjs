/**
 * Jauges du garou, animées en SVG :
 * - Rage : trois griffures qui se remplissent de feu de bas en haut (temporaire / permanente).
 *   Plus la rage est haute (sur 10), plus le feu est violent : flammes plus hautes et rapides, braises,
 *   tremblement à partir de 7, sursaut à chaque point gagné.
 * - Gnose : une lune pleine au maximum, qui perd des croissants jusqu'à la nouvelle lune à 0.
 * Comme l'orbe de sang, chaque jauge repart du niveau affiché au rendu précédent.
 */

const NS = "http://www.w3.org/2000/svg";
const f = n => n.toFixed(1);
let compteur = 0;
const mouvementReduit = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* -------------------------------------------- */
/*  Rage                                        */
/* -------------------------------------------- */

const HAUT = 12, BAS = 188;

/** Lisse une suite de points en courbes de Bézier (Catmull-Rom) */
function lisser(pts) {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for ( let i = 0; i < pts.length - 1; i++ ) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/** Une griffure en arc aux bords irréguliers (tirage pseudo-aléatoire fixe) */
function griffure(x0, top, bot, pente, courbe, largeur, graine) {
  const alea = () => { graine = (graine * 9301 + 49297) % 233280; return graine / 233280; };
  const n = 12, gauche = [], droite = [];
  for ( let i = 0; i <= n; i++ ) {
    const s = i / n, y = top + (bot - top) * s;
    const cx = x0 + pente * (s - .5) + courbe * Math.sin(s * Math.PI);
    const w = largeur * Math.pow(Math.sin(Math.PI * s), .65);
    gauche.push([cx - w - (alea() - .5) * .35 * w, y]);
    droite.push([cx + w + (alea() - .5) * .35 * w, y]);
  }
  return `${lisser(gauche)} L${lisser(droite.reverse()).slice(1)} Z`;
}

const GRIFFES = [
  griffure(73, 24, 176, -10, -20, 11, 11),
  griffure(108, 12, 188, -10, -23, 13, 18),
  griffure(141, 24, 176, -10, -20, 11, 25)
];

export class GriffesRage {
  /**
   * @param {SVGSVGElement} svg       <svg viewBox="0 0 200 200">
   * @param {{valeur:number, max:number}} rage   Rage temporaire et permanente
   * @param {number|null} depart      Remplissage affiché au rendu précédent (0 à 1)
   */
  constructor(svg, { valeur, max }, depart = null) {
    const p = `rage${++compteur}-`;
    this.svg = svg;
    this.valeur = valeur;
    this.cible = max > 0 ? Math.min(1, valeur / max) : 0;
    this.niveau = depart ?? this.cible;
    this.choc = (depart !== null && this.cible > depart) ? 1 : 0;
    this.t = Math.random() * 10;
    const chemins = attrs => GRIFFES.map(d => `<path d="${d}" ${attrs}/>`).join("");
    svg.innerHTML = `<defs>
<clipPath id="${p}clip">${chemins("")}</clipPath>
<linearGradient id="${p}feu" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="190"><stop offset="0" stop-color="#fff4b8"/><stop offset=".12" stop-color="#ffc23a"/><stop offset=".4" stop-color="#ff6a14"/><stop offset=".75" stop-color="#c41a08"/><stop offset="1" stop-color="#5a0802"/></linearGradient>
<linearGradient id="${p}feu2" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="190"><stop offset="0" stop-color="#ff8a2a"/><stop offset=".5" stop-color="#b8160a"/><stop offset="1" stop-color="#3a0402"/></linearGradient>
<linearGradient id="${p}creux" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#050302"/><stop offset=".5" stop-color="#1a0d08"/><stop offset="1" stop-color="#050302"/></linearGradient>
<filter id="${p}flou8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="${p}flou2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter>
</defs>
<g data-r="tremble">
<g data-r="halo" filter="url(#${p}flou8)" fill="#ff5a14">${chemins("")}</g>
${chemins(`fill="url(#${p}creux)"`)}
<g clip-path="url(#${p}clip)"><path data-r="f2" fill="url(#${p}feu2)" opacity=".85"/><path data-r="f1" fill="url(#${p}feu)"/><path data-r="coeur" fill="#fff6c8" opacity=".35" filter="url(#${p}flou2)"/></g>
${chemins(`fill="none" stroke="#2a0c05" stroke-width="1.8" stroke-linejoin="round"`)}
<g data-r="braises"></g></g>`;
    this.el = Object.fromEntries([...svg.querySelectorAll("[data-r]")].map(e => [e.dataset.r, e]));
    this.braises = Array.from({ length: 14 }, () => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("fill", "#ffb04a"); c.setAttribute("opacity", "0");
      this.el.braises.appendChild(c);
      return { c, x: 0, y: 0, v: 0, vie: 0, r: 1 };
    });
    this._boucle = () => this.#boucle();
    if ( mouvementReduit() ) { this.niveau = this.cible; this.choc = 0; this.#dessiner(true); }
    else requestAnimationFrame(this._boucle);
  }

  get niveauAffiche() { return this.niveau; }

  #boucle() {
    if ( !this.svg.isConnected ) return;
    this.t += 1 / 60;
    this.choc *= .95;
    this.niveau += (this.cible - this.niveau) * .06;
    this.#dessiner(false);
    requestAnimationFrame(this._boucle);
  }

  #dessiner(fixe) {
    const { el, t } = this;
    const n = this.niveau, I = Math.min(1, this.valeur / 10);
    const lvl = BAS - n * (BAS - HAUT);
    const vit = 1 + I * 2.4;
    const amp = (3 + I * 13) * (n > .01 ? 1 : 0) + this.choc * 8;
    const bord = (ph, m) => {
      let d = `M30 ${BAS + 4}`;
      for ( let x = 30; x <= 170; x += 3 ) {
        const b = Math.abs(Math.sin(x * .11 + t * 6 * vit + ph)) * .55 + Math.abs(Math.sin(x * .23 - t * 9 * vit + ph * 2)) * .3
          + Math.abs(Math.sin(x * .05 + t * 3 * vit)) * .4;
        d += ` L${x} ${f(lvl - b * amp * m)}`;
      }
      return `${d} L170 ${BAS + 4} Z`;
    };
    el.f2.setAttribute("d", n > .005 ? bord(1.7, 1.35) : "");
    el.f1.setAttribute("d", n > .005 ? bord(0, 1) : "");
    let dc = `M30 ${BAS + 4}`;
    for ( let x = 30; x <= 170; x += 4 ) dc += ` L${x} ${f(lvl + 8 + Math.abs(Math.sin(x * .13 + t * 7 * vit)) * amp * .5)}`;
    el.coeur.setAttribute("d", n > .05 ? `${dc} L170 ${BAS + 4} Z` : "");
    el.halo.setAttribute("opacity", (n * (.35 + .5 * I) * (.8 + .2 * Math.sin(t * 10 * vit))).toFixed(2));
    if ( fixe ) return;

    // Tremblement à partir de 7, sursaut quand la rage monte
    const sh = this.valeur >= 7 ? (this.valeur - 6) * .7 : 0;
    const force = sh + this.choc * 3;
    el.tremble.setAttribute("transform", force > .15 ? `translate(${f((Math.random() - .5) * force)} ${f((Math.random() - .5) * force)})` : "");

    // Braises qui s'échappent au-dessus du feu
    for ( const b of this.braises ) {
      b.vie -= 1 / 60;
      if ( b.vie <= 0 ) {
        if ( (n > .05) && (Math.random() < .02 + I * .12) ) {
          Object.assign(b, { x: 50 + Math.random() * 100, y: lvl - 4, v: .4 + Math.random() * 1.2 * (1 + I), vie: 1 + Math.random() * 1.4, r: .6 + Math.random() * 1.4 });
        } else { b.c.setAttribute("opacity", 0); continue; }
      }
      b.y -= b.v;
      b.x += Math.sin(t * 5 + b.r * 9) * .4;
      b.c.setAttribute("cx", f(b.x)); b.c.setAttribute("cy", f(b.y)); b.c.setAttribute("r", f(b.r));
      b.c.setAttribute("opacity", Math.min(1, b.vie).toFixed(2));
    }
  }
}

/* -------------------------------------------- */
/*  Gnose                                       */
/* -------------------------------------------- */

const LC = 100, LR = 62;

/** Partie éclairée de la lune pour une fraction k (0 = nouvelle lune, 1 = pleine) */
function phase(k) {
  if ( k <= .001 ) return "M0 0Z";
  if ( k >= .999 ) return `M${LC} ${LC - LR} A${LR} ${LR} 0 1 1 ${LC} ${LC + LR} A${LR} ${LR} 0 1 1 ${LC} ${LC - LR} Z`;
  const rx = LR * Math.abs(1 - 2 * k);
  return `M${LC} ${LC - LR} A${LR} ${LR} 0 0 1 ${LC} ${LC + LR} A${f(rx)} ${LR} 0 0 ${k < .5 ? 0 : 1} ${LC} ${LC - LR} Z`;
}

/** Ligne d'ombre (terminateur) adoucie */
function terminateur(k) {
  if ( k <= .001 || k >= .999 ) return "";
  const rx = LR * Math.abs(1 - 2 * k);
  return `M${LC} ${LC + LR} A${f(rx)} ${LR} 0 0 ${k < .5 ? 0 : 1} ${LC} ${LC - LR}`;
}

export class LuneGnose {
  /**
   * @param {SVGSVGElement} svg       <svg viewBox="0 0 200 200">
   * @param {{valeur:number, max:number}} gnose  Gnose temporaire et permanente
   * @param {number|null} depart      Fraction affichée au rendu précédent (0 à 1)
   */
  constructor(svg, { valeur, max }, depart = null) {
    const p = `lune${++compteur}-`;
    this.svg = svg;
    this.cible = max > 0 ? Math.min(1, valeur / max) : 0;
    this.niveau = depart ?? this.cible;
    this.t = Math.random() * 10;
    svg.innerHTML = `<defs>
<radialGradient id="${p}lg" cx=".4" cy=".38" r=".72"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#dde6ef"/><stop offset="1" stop-color="#93a5ba"/></radialGradient>
<radialGradient id="${p}halo" cx=".5" cy=".5" r=".5"><stop offset=".5" stop-color="#cfe2ff" stop-opacity=".5"/><stop offset=".75" stop-color="#9fc2ff" stop-opacity=".14"/><stop offset="1" stop-color="#9fc2ff" stop-opacity="0"/></radialGradient>
<radialGradient id="${p}sombre" cx=".45" cy=".42" r=".7"><stop offset="0" stop-color="#1e2634"/><stop offset="1" stop-color="#0b0f16"/></radialGradient>
<clipPath id="${p}clip"><path data-l="clip"/></clipPath>
<filter id="${p}tex"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="4" seed="11"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .4  0 0 0 0 .48  0 0 0 -1.6 1.15"/></filter>
<filter id="${p}flou3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter>
</defs>
<circle data-l="halo" cx="${LC}" cy="${LC}" r="96" fill="url(#${p}halo)"/>
<circle cx="${LC}" cy="${LC}" r="${LR}" fill="url(#${p}sombre)"/>
<circle cx="${LC}" cy="${LC}" r="${LR}" fill="none" stroke="#2c3646" stroke-width="1"/>
<g clip-path="url(#${p}clip)"><circle cx="${LC}" cy="${LC}" r="${LR}" fill="url(#${p}lg)"/>
<rect x="38" y="38" width="124" height="124" filter="url(#${p}tex)" opacity=".55"/>
<g fill="#7d8ea3" opacity=".35"><circle cx="84" cy="80" r="9"/><circle cx="118" cy="114" r="12"/><circle cx="92" cy="128" r="5"/><circle cx="122" cy="78" r="6"/><circle cx="72" cy="108" r="4"/></g>
<g fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".8"><circle cx="84.6" cy="79.4" r="9"/><circle cx="118.8" cy="113.2" r="12"/></g>
<path data-l="term" fill="none" stroke="#0b0f16" stroke-width="6" stroke-opacity=".55" filter="url(#${p}flou3)"/></g>
<circle cx="${LC}" cy="${LC}" r="${LR}" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1"/>`;
    this.el = Object.fromEntries([...svg.querySelectorAll("[data-l]")].map(e => [e.dataset.l, e]));
    this._boucle = () => this.#boucle();
    if ( mouvementReduit() ) { this.niveau = this.cible; this.#dessiner(); }
    else requestAnimationFrame(this._boucle);
  }

  get niveauAffiche() { return this.niveau; }

  #boucle() {
    if ( !this.svg.isConnected ) return;
    this.t += 1 / 60;
    this.niveau += (this.cible - this.niveau) * .05;
    this.#dessiner();
    requestAnimationFrame(this._boucle);
  }

  #dessiner() {
    const n = this.niveau;
    this.el.clip.setAttribute("d", phase(n));
    this.el.term.setAttribute("d", terminateur(n));
    this.el.halo.setAttribute("opacity", (Math.pow(n, 1.5) * (.85 + .15 * Math.sin(this.t * 1.1))).toFixed(2));
  }
}
