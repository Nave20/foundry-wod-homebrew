/**
 * Orbe de sang : globe de verre rempli de sang, animé en SVG.
 * - ondulation lente en continu, vague quand la valeur change ;
 * - quand le niveau baisse, un film de sang reste sur la paroi et des coulures descendent, puis s'estompent.
 * La fiche est re-rendue à chaque mise à jour : l'orbe repart du niveau affiché précédemment
 * (transmis par la fiche) pour animer le passage à la nouvelle valeur.
 */

const NS = "http://www.w3.org/2000/svg";
const CX = 120, CY = 112, R = 100, RAD = Math.PI / 180;
const f = n => n.toFixed(1);
let compteur = 0;

/** Contenu statique du globe ; p = préfixe unique des identifiants (gradients, filtres) */
function gabarit(p) {
  const arcRouge = [20, 150].map(a => [CX + (R - 3) * Math.cos(a * RAD), CY + (R - 3) * Math.sin(a * RAD)]);
  return `<defs>
<linearGradient id="${p}sang" gradientUnits="userSpaceOnUse" x1="0" y1="${CY - R}" x2="0" y2="${CY + R}"><stop offset="0" stop-color="#b3101a"/><stop offset=".45" stop-color="#6e0710"/><stop offset=".8" stop-color="#330207"/><stop offset="1" stop-color="#1c0103"/></linearGradient>
<radialGradient id="${p}surf" cx=".38" cy=".35" r=".75"><stop offset="0" stop-color="#d23a42"/><stop offset=".45" stop-color="#9a121b"/><stop offset="1" stop-color="#4a040a"/></radialGradient>
<radialGradient id="${p}ombre" cx=".44" cy=".4" r=".6"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset=".85" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
<radialGradient id="${p}fresnel" cx=".5" cy=".5" r=".5"><stop offset=".78" stop-color="#fff" stop-opacity="0"/><stop offset=".95" stop-color="#ffe9e0" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity=".3"/></radialGradient>
<radialGradient id="${p}fond" cx=".5" cy=".62" r=".55"><stop offset="0" stop-color="#3a1418" stop-opacity=".85"/><stop offset="1" stop-color="#0a0305" stop-opacity=".95"/></radialGradient>
<radialGradient id="${p}hot" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".4" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="${p}tache" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".45" stop-color="#fff" stop-opacity=".14"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="${p}caust" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff6a4a" stop-opacity=".75"/><stop offset=".5" stop-color="#e0202a" stop-opacity=".3"/><stop offset="1" stop-color="#e0202a" stop-opacity="0"/></radialGradient>
<linearGradient id="${p}film" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a0a12" stop-opacity="0"/><stop offset=".35" stop-color="#8a0a12" stop-opacity=".35"/><stop offset="1" stop-color="#8a0a12" stop-opacity=".6"/></linearGradient>
<clipPath id="${p}clip"><circle cx="${CX}" cy="${CY}" r="${R - 1.5}"/></clipPath>
<filter id="${p}flou" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="${p}flou2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2"/></filter>
<filter id="${p}flou3" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="${p}grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .6 -.25"/></filter>
</defs>
<circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#${p}fond)"/>
<g clip-path="url(#${p}clip)">
<path data-o="film" fill="url(#${p}film)" opacity="0"/><g data-o="gouttes"></g>
<path data-o="corps" fill="url(#${p}sang)"/>
<ellipse data-o="lueur" cx="${CX + R * .28}" cy="${CY + R * .62}" rx="${R * .42}" ry="${R * .24}" fill="url(#${p}caust)" filter="url(#${p}flou)"/>
<ellipse data-o="surface" fill="url(#${p}surf)"/>
<ellipse data-o="reflet" fill="#fff" filter="url(#${p}flou2)"/>
<ellipse data-o="menisque" fill="none" stroke="#ffb0a8" stroke-width="1"/>
<g data-o="bulles"></g>
<rect x="${CX - R}" y="${CY - R}" width="${2 * R}" height="${2 * R}" filter="url(#${p}grain)" opacity=".05"/>
<ellipse cx="${CX - R * .38}" cy="${CY - R * .44}" rx="${R * .32}" ry="${R * .25}" transform="rotate(-35 ${CX - R * .38} ${CY - R * .44})" fill="url(#${p}tache)" filter="url(#${p}flou3)"/>
</g>
<circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#${p}ombre)"/>
<circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#${p}fresnel)"/>
<circle cx="${CX}" cy="${CY}" r="${R - 4}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2"/>
<path data-o="bord" d="M${f(arcRouge[0][0])} ${f(arcRouge[0][1])} A${R - 3} ${R - 3} 0 0 1 ${f(arcRouge[1][0])} ${f(arcRouge[1][1])}" fill="none" stroke="#ff5a4a" stroke-width="1.6" filter="url(#${p}flou2)"/>
<ellipse cx="${CX - R * .64}" cy="${CY + R * .02}" rx="${R * .04}" ry="${R * .2}" transform="rotate(12 ${CX - R * .64} ${CY})" fill="url(#${p}hot)" opacity=".15"/>
<ellipse cx="${CX + R * .5}" cy="${CY + R * .58}" rx="${R * .14}" ry="${R * .035}" transform="rotate(-42 ${CX + R * .5} ${CY + R * .58})" fill="url(#${p}hot)" opacity=".18"/>
<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#000" stroke-opacity=".8" stroke-width="1.4"/>
<circle cx="${CX}" cy="${CY}" r="${R - 1.4}" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width=".8"/>`;
}

/** Hauteur (en unités SVG) de la surface pour un niveau entre 0 et 1 */
const hauteur = n => CY + R - n * 2 * R;

export default class OrbeSang {
  /**
   * @param {SVGSVGElement} svg     Élément <svg viewBox="16 8 208 208"> à remplir
   * @param {number} niveau         Niveau cible, entre 0 et 1
   * @param {number|null} depart    Niveau affiché avant ce rendu (null au premier affichage)
   */
  constructor(svg, niveau, depart = null) {
    this.svg = svg;
    this.cible = Math.max(0, Math.min(1, niveau));
    this.niveau = depart ?? this.cible;
    this.vitesse = 0;
    this.vague = 0;
    this.t = Math.random() * 10;
    this.filmHaut = null;
    this.filmOpacite = 0;
    this.reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    svg.innerHTML = gabarit(`orbe${++compteur}-`);
    this.el = Object.fromEntries([...svg.querySelectorAll("[data-o]")].map(e => [e.dataset.o, e]));

    this.bulles = Array.from({ length: 6 }, () => {
      const g = document.createElementNS(NS, "g");
      g.innerHTML = `<circle fill="none" stroke="#ffb3ab" stroke-opacity=".5" stroke-width=".7"/><circle fill="#fff" opacity=".6"/>`;
      this.el.bulles.appendChild(g);
      return { g, x: CX, y: 999, r: .8 + Math.random() * 2, v: .12 + Math.random() * .22 };
    });
    this.gouttes = Array.from({ length: 6 }, () => {
      const e = document.createElementNS(NS, "path");
      e.setAttribute("fill", "#7a0810");
      e.setAttribute("opacity", "0");
      this.el.gouttes.appendChild(e);
      return { e, x: 0, long: 0, v: 0 };
    });

    if ( depart !== null && Math.abs(depart - this.cible) > 1e-6 ) this.#changement(depart);
    this._boucle = () => this.#boucle();
    if ( this.reduit ) { this.niveau = this.cible; this.vague = 0; this.#dessiner(); }
    else requestAnimationFrame(this._boucle);
  }

  /** Lance la vague (et le film sur la paroi si le niveau baisse) */
  #changement(depart) {
    const ecart = Math.abs(this.cible - depart);
    this.vague = Math.min(1.6, .6 + ecart * 2.2);
    if ( this.cible < depart ) {
      this.filmHaut = hauteur(depart);
      this.filmOpacite = 1;
      for ( const g of this.gouttes ) {
        const y = this.filmHaut + 6;
        const demi = Math.sqrt(Math.max(0, R * R - (y - CY) ** 2));
        Object.assign(g, { x: CX + (Math.random() - .5) * demi * 1.5, long: 2, v: .15 + Math.random() * .35 });
      }
    }
  }

  #boucle() {
    if ( !this.svg.isConnected ) return;   // fiche fermée ou re-rendue : l'animation s'arrête
    this.t += 1 / 60;
    this.vitesse = (this.vitesse + (this.cible - this.niveau) * .05) * .85;
    this.niveau += this.vitesse;
    this.vague *= .985;
    this.filmOpacite *= .994;
    this.#dessiner();
    requestAnimationFrame(this._boucle);
  }

  #dessiner() {
    const { el, t } = this;
    const n = Math.max(0, Math.min(1, this.niveau));
    const y = hauteur(n);
    const demi = Math.sqrt(Math.max(0, R * R - (y - CY) ** 2));
    const amp = .4 + this.vague * 5;
    const penche = Math.sin(t * 4.6) * this.vague * 6;
    const visible = n > .004 ? 1 : 0;

    let d = `M${CX - R - 6} ${f(y)}`;
    for ( let x = CX - R - 6; x <= CX + R + 6; x += 5 ) {
      d += ` L${x} ${(y + Math.sin(x * .07 + t * 1.5) * amp + Math.sin(x * .19 - t * 2.3) * amp * .35).toFixed(2)}`;
    }
    d += ` L${CX + R + 6} ${CY + R + 8} L${CX - R - 6} ${CY + R + 8} Z`;
    const ry = Math.max(1.2, demi * .14 + Math.sin(t * 3) * this.vague * 2.6);
    const rot = `rotate(${penche.toFixed(2)} ${CX} ${f(y)})`;

    el.corps.setAttribute("d", d);
    el.corps.setAttribute("transform", rot);
    el.corps.setAttribute("opacity", visible);
    for ( const e of [el.surface, el.menisque] ) {
      e.setAttribute("cx", CX); e.setAttribute("cy", f(y));
      e.setAttribute("rx", f(demi)); e.setAttribute("ry", ry.toFixed(2));
      e.setAttribute("transform", rot); e.setAttribute("opacity", visible);
    }
    el.menisque.setAttribute("stroke-opacity", (.35 + this.vague * .2).toFixed(2));
    el.reflet.setAttribute("cx", f(CX - demi * .38)); el.reflet.setAttribute("cy", f(y - ry * .25));
    el.reflet.setAttribute("rx", f(demi * .22)); el.reflet.setAttribute("ry", f(Math.max(.6, ry * .28)));
    el.reflet.setAttribute("transform", rot); el.reflet.setAttribute("opacity", visible * .3);
    el.lueur.setAttribute("opacity", Math.min(1, n * 1.1).toFixed(2));
    el.bord.setAttribute("opacity", (Math.min(1, n * 1.6) * .35).toFixed(2));

    // Film de sang et coulures sur la paroi, au-dessus de la surface
    if ( this.filmHaut !== null && this.filmOpacite > .02 && this.filmHaut < y ) {
      const op = this.filmOpacite.toFixed(2);
      el.film.setAttribute("d", `M${CX - R} ${f(this.filmHaut)} L${CX + R} ${f(this.filmHaut)} L${CX + R} ${f(y + 2)} L${CX - R} ${f(y + 2)} Z`);
      el.film.setAttribute("opacity", op);
      for ( const g of this.gouttes ) {
        g.long = Math.min(g.long + g.v, y - this.filmHaut + 4);
        const y0 = this.filmHaut + 2, y1 = y0 + g.long, x = g.x;
        g.e.setAttribute("d", `M${f(x - .9)} ${f(y0)} L${f(x - 1.1)} ${f(y1 - 2)} Q${f(x)} ${f(y1 + 2.4)} ${f(x + 1.1)} ${f(y1 - 2)} L${f(x + .9)} ${f(y0)} Z`);
        g.e.setAttribute("opacity", op);
      }
    } else {
      el.film.setAttribute("opacity", 0);
      for ( const g of this.gouttes ) g.e.setAttribute("opacity", 0);
      if ( this.filmOpacite <= .02 ) this.filmHaut = null;
    }

    // Bulles qui remontent
    for ( const b of this.bulles ) {
      b.y -= b.v + this.vague * .4;
      if ( b.y < y + ry + 2 || b.y > CY + R ) {
        b.y = CY + R - 8 - Math.random() * 30;
        const dm = Math.sqrt(Math.max(0, R * R - (b.y - CY) ** 2));
        b.x = CX + (Math.random() - .5) * dm * 1.3;
      }
      const x = b.x + Math.sin(t * 2 + b.r * 5) * 1.3;
      const [c1, c2] = b.g.children;
      c1.setAttribute("cx", f(x)); c1.setAttribute("cy", f(b.y)); c1.setAttribute("r", b.r);
      c2.setAttribute("cx", f(x - b.r * .35)); c2.setAttribute("cy", f(b.y - b.r * .35)); c2.setAttribute("r", f(b.r * .3));
      b.g.setAttribute("opacity", (n > .06 && b.y > y + ry + 2) ? 1 : 0);
    }
  }

  /** Niveau actuellement affiché (pour enchaîner l'animation au rendu suivant) */
  get niveauAffiche() { return Math.max(0, Math.min(1, this.niveau)); }
}
