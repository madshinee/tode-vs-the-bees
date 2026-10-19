import * as THREE from 'three';

const DURATION = 15;
const COOLDOWN = 30;
const RANGE = 16;

// A friend (an orange cousin of the frog) who follows the player and
// shoots the nearest enemy for a few seconds.
export class Ally {
  constructor(scene, model) {
    this.mesh = model.spawn();
    this.mesh.scale.setScalar(0.85);
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.active = false;
    this.time = 0;
    this.cd = 0;
    this.shootTimer = 0;
  }

  // Returns true if the friend was called.
  summon(playerPos) {
    if (this.active || this.cd > 0) return false;
    this.active = true;
    this.time = DURATION;
    this.cd = COOLDOWN;
    this.mesh.position.set(playerPos.x + 2, 0, playerPos.z + 2);
    this.mesh.visible = true;
    return true;
  }

  dismiss() {
    this.active = false;
    this.cd = 0;
    this.mesh.visible = false;
  }

  // onLeave(position) is called when the friend goes home.
  update(dt, playerPos, enemyList, bullets, onShoot, onLeave) {
    this.cd = Math.max(0, this.cd - dt);
    if (!this.active) return;

    this.time -= dt;
    if (this.time <= 0) {
      this.active = false;
      this.mesh.visible = false;
      onLeave(this.mesh.position.clone());
      return;
    }

    // Stay close to the player (slightly to the right and behind)
    const wanted = new THREE.Vector3(playerPos.x + 2.2, 0, playerPos.z + 1.6);
    this.mesh.position.lerp(wanted, Math.min(1, dt * 4));

    let target = null;
    let best = RANGE;
    for (const e of enemyList) {
      const d = e.mesh.position.distanceTo(this.mesh.position);
      if (d < best) {
        best = d;
        target = e;
      }
    }

    this.shootTimer -= dt;
    if (!target) return;
    const dir = target.mesh.position.clone().sub(this.mesh.position);
    dir.y = 0;
    dir.normalize();
    this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    if (this.shootTimer <= 0) {
      bullets.fire(this.mesh.position, dir, 1);
      this.shootTimer = 0.3;
      onShoot();
    }
  }
}
