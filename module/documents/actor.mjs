export default class WodActor extends Actor {
  /**
   * Données de jet : raccourcis @force, @vigilance, @volonte… en plus de system.*.
   * @inheritDoc
   */
  getRollData() {
    const data = { ...super.getRollData() };
    const s = this.system;
    Object.assign(data, s.attributs ?? {}, s.capacites ?? {});
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
