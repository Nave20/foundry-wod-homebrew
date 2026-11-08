import { quintessenceMax } from "../des.mjs";

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
  async _preUpdate(changes, options, user) {
    if ( (await super._preUpdate(changes, options, user)) === false ) return false;
    // Mage : la quintessence ne dépasse pas Avatar + Prime (calculé avec les valeurs après modification)
    if ( (this.type === "mage") && (changes.system?.quintessence !== undefined) ) {
      const apres = foundry.utils.mergeObject(this._source.system, changes.system, { inplace: false });
      const max = quintessenceMax(apres);
      if ( (max !== null) && (changes.system.quintessence > max) ) changes.system.quintessence = max;
    }
    // Mage : roue de 20 cases partagée. Le paradoxe l'emporte : s'il empiète sur la quintessence, elle diminue ;
    // la quintessence, elle, ne peut pas empiéter sur le paradoxe.
    if ( (this.type === "mage") && ((changes.system?.quintessence !== undefined) || (changes.system?.paradoxe !== undefined)) ) {
      const apres = foundry.utils.mergeObject(this._source.system, changes.system, { inplace: false });
      const paradoxe = Math.min(20, apres.paradoxe ?? 0);
      if ( (apres.quintessence ?? 0) + paradoxe > 20 ) changes.system.quintessence = 20 - paradoxe;
    }
  }

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;
    // Les personnages joueurs ont un jeton lié à la fiche
    if (data.system?.role === "PJ") this.updateSource({ prototypeToken: { actorLink: true } });
  }
}
