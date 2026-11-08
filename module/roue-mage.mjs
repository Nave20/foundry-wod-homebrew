/**
 * Roue du mage (20 cases) façon astrolabe, animée en SVG.
 * - Quintessence : une comète qui part du milieu gauche dans le sens horaire, avec sa traînée de lumière.
 * - Paradoxe : une traînée de vide violet qui part du même point dans le sens inverse, d'où se dégagent
 *   des particules et des volutes.
 * - Quand le paradoxe prend des cases à la quintessence, des étincelles grésillent au point de contact ;
 *   quand il la dévore entièrement, la comète éclate (éclair, ondes de choc, fragments aspirés par le vide).
 * Comme les autres jauges, la roue repart des valeurs affichées au rendu précédent.
 */

const NS = "http://www.w3.org/2000/svg";
const N = 20, ST = 18, RM = 70, RAD = Math.PI / 180, K = 34;
const VIOLET = { glow: "#a24dff", vif: "#e0b8ff" };
const ROM = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
const f = n => n.toFixed(1);
let compteur = 0;

const pt = (a, r) => [100 + r * Math.cos(a * RAD), 100 + r * Math.sin(a * RAD)];
function arc(r, a0, a1) {
  if ( a1 - a0 < .15 ) return "";
  const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r);
  return `M${f(x0)} ${f(y0)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)}`;
}
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for ( const [k, v] of Object.entries(attrs) ) e.setAttribute(k, v);
  parent?.appendChild(e);
  return e;
}

export default class RoueMage {
  /**
   * @param {SVGSVGElement} svg   <svg viewBox="0 0 200 200">
   * @param {{quintessence:number, paradoxe:number}} valeurs
   * @param {{quintessence:number, paradoxe:number}|null} avant   Valeurs affichées au rendu précédent
   */
  constructor(svg, { quintessence, paradoxe }, avant = null) {
    const p = `roue${++compteur}-`;
    this.svg = svg;
    this.q = quintessence; this.p = paradoxe;
    this.qv = avant?.quintessence ?? quintessence;
    this.pv = avant?.paradoxe ?? paradoxe;
    this.t = 0; this.secousse = 0; this.evenement = null;
    this.reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    this.#construire(p);
    // Le paradoxe a pris des cases à la quintessence depuis le dernier rendu
    if ( avant && (paradoxe > avant.paradoxe) && (quintessence < avant.quintessence) ) {
      if ( quintessence === 0 ) this.#extinction(180 + avant.quintessence * ST);
      else this.#grignote(540 - paradoxe * ST);
    }
    this._boucle = () => this.#boucle();
    if ( this.reduit ) { this.qv = this.q; this.pv = this.p; this.#dessiner(); }
    else requestAnimationFrame(this._boucle);
  }

  /** Valeurs affichées, pour enchaîner l'animation au rendu suivant */
  get valeursAffichees() { return { quintessence: this.q, paradoxe: this.p }; }

  #construire(p) {
    const svg = this.svg;
    svg.innerHTML = `<defs>
<filter id="${p}b4" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="${p}b2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2"/></filter>
<filter id="${p}fum" x="-40%" y="-40%" width="180%" height="180%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="3" seed="7"/><feDisplacementMap in="SourceGraphic" scale="9" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation=".7"/></filter>
<radialGradient id="${p}bloom"><stop offset="0" stop-color="#fff"/><stop offset=".2" stop-color="#e4f4ff"/><stop offset=".55" stop-color="#7fc2ff" stop-opacity=".3"/><stop offset="1" stop-color="#7fc2ff" stop-opacity="0"/></radialGradient>
<radialGradient id="${p}flash"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#cfe9ff" stop-opacity=".8"/><stop offset="1" stop-color="#7fc2ff" stop-opacity="0"/></radialGradient>
<linearGradient id="${p}ray" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>
<circle cx="100" cy="100" r="99" fill="#08070d"/>
<g data-x="tout"><g data-x="ciel"></g><g data-x="cercles"></g><g data-x="pglow"></g><g data-x="volutes"></g><g data-x="pfum" filter="url(#${p}fum)"></g><g data-x="part"></g>
<path data-x="qhalo" fill="none" stroke="#5aa8ff" stroke-width="10" stroke-linecap="round" filter="url(#${p}b4)" opacity=".35"/>
<path data-x="qbase" fill="none" stroke="#7fc2ff" stroke-width="1.2" stroke-linecap="round" opacity=".35"/>
<g data-x="trainee"></g><g data-x="poussiere"></g><g data-x="tete"></g><g data-x="fx"></g>
<text x="100" y="103" text-anchor="middle" font-size="26" fill="#e6f4ff" font-family="serif">${this.q}</text>
<text x="100" y="121" text-anchor="middle" font-size="10.5" letter-spacing=".5" fill="${VIOLET.vif}" font-family="serif">${this.p} paradoxe</text></g>`;
    const q = x => svg.querySelector(`[data-x="${x}"]`);
    this.turb = svg.querySelector("feTurbulence");
    this.tout = q("tout");

    // Ciel étoilé (tirage fixe)
    let graine = 42;
    const alea = () => { graine = (graine * 9301 + 49297) % 233280; return graine / 233280; };
    this.scintille = [];
    for ( let i = 0; i < 34; i++ ) {
      const [x, y] = pt(alea() * 360, alea() < .6 ? alea() * 48 : 94 + alea() * 4);
      const e = el("circle", { cx: f(x), cy: f(y), r: f(.3 + alea() * .5), fill: "#fff", opacity: f(.12 + alea() * .4) }, q("ciel"));
      if ( i % 3 === 0 ) this.scintille.push([e, alea() * 6]);
    }

    // Astrolabe : cercles, graduations, chiffres romains, cadran intérieur qui tourne lentement
    const c = q("cercles");
    for ( const [r, sw, co] of [[RM - 9, .5, "#2a2640"], [RM + 9, .6, "#2e2a46"], [RM + 19, .9, "#3a3454"], [RM + 21, .4, "#2a2640"]] ) {
      el("circle", { cx: 100, cy: 100, r, fill: "none", stroke: co, "stroke-width": sw }, c);
    }
    for ( let i = 0; i < N; i++ ) {
      const a = 180 + i * ST;
      const [x, y] = pt(a + ST / 2, RM + 14.3);
      el("text", { x: f(x), y: f(y + 1.8), "text-anchor": "middle", "font-size": "4.8", fill: "#6e6890",
        "font-family": "serif", transform: `rotate(${f(a + ST / 2 + 90)} ${f(x)} ${f(y)})` }, c).textContent = ROM[i];
      const [a1, b1] = pt(a, RM + 9), [a2, b2] = pt(a, RM + 19), [d1, d2] = pt(a, RM + 20);
      el("path", { d: `M${f(a1)} ${f(b1)} L${f(a2)} ${f(b2)}`, stroke: "#3a3454", "stroke-width": .6 }, c);
      el("circle", { cx: f(d1), cy: f(d2), r: .7, fill: "#4a4468" }, c);
    }
    this.cadran = el("g", {}, c);
    for ( let i = 0; i < 80; i++ ) {
      const [x, y] = pt(i * 4.5, RM - 9), [x2, y2] = pt(i * 4.5, RM - (i % 5 ? 7.6 : 5.8));
      el("path", { d: `M${f(x)} ${f(y)} L${f(x2)} ${f(y2)}`, stroke: "#2c2842", "stroke-width": .45 }, this.cadran);
    }

    // Paradoxe
    this.pglow = el("path", { fill: "none", stroke: VIOLET.glow, "stroke-width": 15, "stroke-linecap": "round", filter: `url(#${p}b4)` }, q("pglow"));
    this.psegs = Array.from({ length: K }, () => el("path", { fill: "none", stroke: "#040207", "stroke-linecap": "round" }, q("pfum")));
    this.volutes = Array.from({ length: 10 }, () => ({ e: el("circle", { fill: "#07040a", filter: `url(#${p}b2)`, r: 0 }, q("volutes")), vie: 0 }));
    this.particules = Array.from({ length: 22 }, () => ({ e: el("circle", { fill: VIOLET.vif, r: 0 }, q("part")), vie: 0 }));

    // Quintessence
    this.qhalo = q("qhalo"); this.qbase = q("qbase");
    this.segs = Array.from({ length: K }, () => [
      el("path", { fill: "none", stroke: "#a8dcff", "stroke-linecap": "round" }, q("trainee")),
      el("path", { fill: "none", stroke: "#fff", "stroke-linecap": "round" }, q("trainee"))
    ]);
    this.poussiere = Array.from({ length: 12 }, () => ({ e: el("circle", { fill: "#d8f0ff", r: 0 }, q("poussiere")), vie: 0 }));
    this.tete = q("tete");
    el("circle", { r: 11, fill: `url(#${p}bloom)` }, this.tete);
    for ( const r of [0, 90] ) el("rect", { x: -20, y: -.45, width: 40, height: .9, fill: `url(#${p}ray)`, transform: `rotate(${r})` }, this.tete);
    for ( const r of [45, 135] ) el("rect", { x: -8, y: -.3, width: 16, height: .6, fill: `url(#${p}ray)`, transform: `rotate(${r})`, opacity: .6 }, this.tete);

    // Effets : grésillement et extinction
    const fx = q("fx");
    this.flash = el("circle", { r: 0, fill: `url(#${p}flash)`, opacity: 0 }, fx);
    this.ondes = [el("circle", { r: 0, fill: "none", stroke: VIOLET.glow, "stroke-width": 1.5, opacity: 0 }, fx),
      el("circle", { r: 0, fill: "none", stroke: VIOLET.glow, "stroke-width": .8, opacity: 0 }, fx)];
    this.eclats = Array.from({ length: 34 }, () => ({ e: el("circle", { r: 0 }, fx), vie: 0 }));
    this.etincelles = Array.from({ length: 12 }, () => ({ e: el("path", { fill: "none", "stroke-width": .8, "stroke-linecap": "round" }, fx), vie: 0 }));
  }

  #grignote(a) {
    const [x, y] = pt(a, RM);
    for ( const g of this.etincelles ) Object.assign(g, { x, y, a: Math.random() * 6.28, l: 2 + Math.random() * 5, vie: .35 + Math.random() * .3 });
  }

  #extinction(a) {
    const [x, y] = pt(a, RM);
    this.evenement = { x, y, t: 0 };
    this.secousse = 1;
    for ( const o of this.eclats ) {
      const d = Math.random() * 6.28, v = .6 + Math.random() * 1.8;
      Object.assign(o, { x, y, vx: Math.cos(d) * v, vy: Math.sin(d) * v, vie: 1.2 + Math.random(), r: .5 + Math.random() * 1.2 });
    }
  }

  #boucle() {
    if ( !this.svg.isConnected ) return;
    this.t += 1 / 60;
    this.qv += (this.q - this.qv) * .07;
    this.pv += (this.p - this.pv) * .05;
    this.#dessiner();
    requestAnimationFrame(this._boucle);
  }

  #dessiner() {
    const t = this.t, qa = 180 + this.qv * ST, pa = 540 - this.pv * ST, vq = this.qv > .05, vp = this.pv > .05;
    for ( const [e, ph] of this.scintille ) e.setAttribute("opacity", f(.12 + .4 * (.5 + .5 * Math.sin(t * 1.4 + ph))));
    this.cadran.setAttribute("transform", `rotate(${f(t * 2)} 100 100)`);

    // Traînée de la comète : plus fine et plus pâle vers le départ, mais toujours visible
    this.segs.forEach(([m, co], k) => {
      const u = (k + 1) / K, d = vq ? arc(RM, 180 + (qa - 180) * k / K, 180 + (qa - 180) * u + .3) : "";
      m.setAttribute("d", d); co.setAttribute("d", d);
      m.setAttribute("stroke-width", f(1.1 + 2.3 * u * u)); co.setAttribute("stroke-width", f(.45 + .9 * u * u));
      m.setAttribute("opacity", f(.32 + .5 * Math.pow(u, 1.3))); co.setAttribute("opacity", f(.4 + .6 * Math.pow(u, 1.1)));
    });
    this.qbase.setAttribute("d", vq ? arc(RM, 180, qa) : "");
    this.qhalo.setAttribute("d", vq ? arc(RM, Math.max(180, qa - 70), qa) : "");
    const [hx, hy] = pt(qa, RM);
    this.tete.setAttribute("transform", `translate(${f(hx)} ${f(hy)}) rotate(${f(t * 12)}) scale(${f(.92 + .1 * Math.sin(t * 4.5))})`);
    this.tete.setAttribute("opacity", vq ? 1 : 0);
    for ( const o of this.poussiere ) {
      o.vie -= 1 / 60;
      if ( o.vie <= 0 ) {
        if ( vq && Math.random() < .1 ) {
          const a = (qa + 180 + (Math.random() - .5) * 70) * RAD;
          Object.assign(o, { x: hx, y: hy, vx: Math.cos(a) * .3, vy: Math.sin(a) * .3, vie: .8 + Math.random() });
        } else { o.e.setAttribute("r", 0); continue; }
      }
      o.x += o.vx; o.y += o.vy;
      o.e.setAttribute("cx", f(o.x)); o.e.setAttribute("cy", f(o.y));
      o.e.setAttribute("r", f(.35 + o.vie * .4)); o.e.setAttribute("opacity", f(Math.min(1, o.vie) * .8));
    }

    // Paradoxe : vide effilé aux deux bouts, lueur violette, particules et volutes
    this.psegs.forEach((e, k) => {
      const u = (k + 1) / K, a1 = 540 - (540 - pa) * k / K, a0 = 540 - (540 - pa) * u - .3;
      const profil = u < .8 ? Math.pow(u / .8, 1.2) : 1 - (u - .8) / .2 * .85;
      e.setAttribute("d", vp ? arc(RM, a0, a1) : "");
      e.setAttribute("stroke-width", f(1 + 7 * profil));
      e.setAttribute("opacity", f(.45 + .55 * Math.min(1, u * 1.3)));
    });
    const ev = this.evenement;
    this.pglow.setAttribute("d", vp ? arc(RM, pa + 2, 540) : "");
    this.pglow.setAttribute("opacity", f(.5 + .12 * Math.sin(t * 1.7) + (ev ? .4 * Math.max(0, 1 - ev.t) : 0)));
    for ( const o of this.particules ) {
      o.vie -= 1 / 60;
      if ( o.vie <= 0 ) {
        if ( vp && Math.random() < .12 ) {
          o.a = pa + Math.random() * (540 - pa);
          const sens = Math.random() < .6 ? 1 : -1, [x, y] = pt(o.a, RM + sens * 4), d = o.a * RAD;
          Object.assign(o, { x, y, vx: Math.cos(d) * .18 * sens + (Math.random() - .5) * .15, vy: Math.sin(d) * .18 * sens + (Math.random() - .5) * .15,
            vie: 1.2 + Math.random() * 1.2, r: .4 + Math.random() * .7 });
        } else { o.e.setAttribute("r", 0); continue; }
      }
      o.x += o.vx; o.y += o.vy;
      o.e.setAttribute("cx", f(o.x)); o.e.setAttribute("cy", f(o.y));
      o.e.setAttribute("r", f(o.r * (.6 + .4 * Math.min(1, o.vie))));
      o.e.setAttribute("opacity", f(Math.min(1, o.vie) * (.6 + .4 * Math.sin(t * 9 + o.a))));
    }
    for ( const o of this.volutes ) {
      o.vie -= 1 / 60;
      if ( o.vie <= 0 ) {
        if ( vp && Math.random() < .05 ) {
          o.a = pa + Math.random() * (540 - pa);
          const sens = Math.random() < .5 ? 1 : -1, [x, y] = pt(o.a, RM + sens * 3), d = o.a * RAD;
          Object.assign(o, { x, y, vx: Math.cos(d) * .1 * sens, vy: Math.sin(d) * .1 * sens - .04, vie: 2.5 + Math.random() });
        } else { o.e.setAttribute("r", 0); continue; }
      }
      o.x += o.vx; o.y += o.vy;
      o.e.setAttribute("cx", f(o.x)); o.e.setAttribute("cy", f(o.y));
      o.e.setAttribute("r", f(1.5 + (3.5 - o.vie) * 1.1)); o.e.setAttribute("opacity", f(Math.min(1, o.vie / 2) * .7));
    }

    // Grésillement au point de contact
    for ( const g of this.etincelles ) {
      g.vie -= 1 / 60;
      if ( g.vie <= 0 ) { g.e.setAttribute("d", ""); continue; }
      const l = g.l * (1.4 - g.vie);
      g.e.setAttribute("d", `M${f(g.x + Math.cos(g.a) * 2)} ${f(g.y + Math.sin(g.a) * 2)} L${f(g.x + Math.cos(g.a) * l)} ${f(g.y + Math.sin(g.a) * l)}`);
      g.e.setAttribute("stroke", Math.random() < .5 ? "#e4f4ff" : VIOLET.vif);
      g.e.setAttribute("opacity", f(g.vie * 2));
    }

    // Extinction de la quintessence
    if ( ev ) {
      ev.t += 1 / 60;
      const k = ev.t;
      this.flash.setAttribute("cx", f(ev.x)); this.flash.setAttribute("cy", f(ev.y));
      this.flash.setAttribute("r", f(8 + k * 60)); this.flash.setAttribute("opacity", f(Math.max(0, 1 - k * 2.2)));
      this.ondes.forEach((o, i) => {
        o.setAttribute("cx", f(ev.x)); o.setAttribute("cy", f(ev.y));
        o.setAttribute("r", f(k * (i ? 70 : 40))); o.setAttribute("opacity", f(Math.max(0, 1 - k * (i ? 1.1 : 1.6))));
      });
      if ( k > 2.5 ) this.evenement = null;
    }
    const [cx, cy] = pt(pa + (540 - pa) / 2, RM);
    for ( const o of this.eclats ) {
      o.vie -= 1 / 60;
      if ( o.vie <= 0 ) { o.e.setAttribute("r", 0); continue; }
      o.vx = o.vx * .96 + (cx - o.x) * .0009; o.vy = o.vy * .96 + (cy - o.y) * .0009;   // aspirés par le vide
      o.x += o.vx; o.y += o.vy;
      const vie = Math.min(1, o.vie);
      o.e.setAttribute("cx", f(o.x)); o.e.setAttribute("cy", f(o.y)); o.e.setAttribute("r", f(o.r * vie));
      o.e.setAttribute("fill", o.vie > 1.2 ? "#ffffff" : VIOLET.vif); o.e.setAttribute("opacity", f(vie));
    }
    this.secousse *= .92;
    this.tout.setAttribute("transform", this.secousse > .03 ? `translate(${f((Math.random() - .5) * this.secousse * 4)} ${f((Math.random() - .5) * this.secousse * 4)})` : "");
    this.turb?.setAttribute("baseFrequency", `${f(.05 + .012 * Math.sin(t * .6))} ${f(.07 + .012 * Math.cos(t * .45))}`);
  }
}
