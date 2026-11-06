export default class WodActor extends Actor {
  /**
   * Données de jet : raccourcis @force, @vigilance, @volonte… en plus de system.*.
   * @inheritDoc
   */
  getRollData() {
    const data = { ...super.getRollData() };
    const s = this.system;
    Object.assign(data, s.attributs ?? {}, s.capacites ?? {});
    // Capacités ajoutées par le MJ : même accès par leur clé (@pilotage…)
    for ( const [cle, c] of Object.entries(s.capacites_ajoutees ?? {}) ) data[cle] = Number(c?.valeur) || 0;
    if (s.volonte) data.volonte = s.volonte.permanente;
    return data;
  }

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;
    // Les personnages joueurs ont un jeton lié à la fiche
    if (data.system?.role === "PJ") this.updateSource({ prototypeToken: { actorLink: true } });
  }
}
