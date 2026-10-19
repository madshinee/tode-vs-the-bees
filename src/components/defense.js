import * as THREE from 'three';

// Each village has a "safety" bar. Raider bees attack it; when it hits zero the
// village falls (its villagers are lost and its griot stops healing). Tode
// defends a village just by getting close to the raiders. If all villages
// fall, the Queen wins.
export const VILLAGE_NAMES = ['Sabar', 'Kora', 'Baobab'];
const RAID_DAMAGE_PER_SECOND = 3.5; // per raider, at normal difficulty

export class VillageDefense {
  constructor(villages) {
    this.list = villages.map((v, i) => ({
      ref: v, // the map's village (huts, center) shared with the villagers
      index: i,
      name: VILLAGE_NAMES[i % VILLAGE_NAMES.length],
      x: v.x,
      z: v.z,
      pos: new THREE.Vector3(v.x, 0, v.z),
      safety: 100,
      fallen: false,
      attacked: 0, // seconds left of the "under attack" alert
      warned: false, // already announced during this wave
    }));
  }

  reset() {
    for (const v of this.list) {
      v.safety = 100;
      v.fallen = false;
      v.attacked = 0;
      v.warned = false;
    }
  }

  standing() {
    return this.list.filter((v) => !v.fallen);
  }

  randomStanding() {
    const s = this.standing();
    return s.length ? s[Math.floor(Math.random() * s.length)] : null;
  }

  // Returns true when this attack made the village fall.
  attack(village, dt, damageMultiplier = 1) {
    if (village.fallen) return false;
    village.safety = Math.max(0, village.safety - RAID_DAMAGE_PER_SECOND * damageMultiplier * dt);
    village.attacked = 1.2;
    if (village.safety <= 0) {
      village.fallen = true;
      return true;
    }
    return false;
  }

  repair(amount) {
    for (const v of this.list) if (!v.fallen) v.safety = Math.min(100, v.safety + amount);
  }

  update(dt) {
    for (const v of this.list) v.attacked = Math.max(0, v.attacked - dt);
  }
}
