import * as THREE from 'three';
import { resolveCollisions } from './physics.js';
import { createAccessories, createOutfits } from './accessories.js';

const MODEL_ROTATION_OFFSET = 0; // adjust if the model faces the wrong way
const DASH_SPEED = 28;
const DASH_DURATION = 0.18;
const DASH_COOLDOWN = 1.5;
const JUMP_DURATION = 0.7;
const JUMP_HEIGHT = 3;
const JUMP_COOLDOWN = 3;
const FLY_DURATION = 4;
const FLY_COOLDOWN = 12;
const FLY_HEIGHT = 3;
const AMBUSH_TIME = 2;
const UP = new THREE.Vector3(0, 1, 0);

// Levels at which new abilities unlock
export const AMBUSH_LEVEL = 2;
export const JUMP_LEVEL = 3;
export const ALLY_LEVEL = 5;
export const BOMB_LEVEL = 6;
export const FLY_LEVEL = 8;
export const CROWN_LEVEL = 10;

// Key bindings: player 1 uses WASD (plus arrows when playing alone), player 2 the arrows.
export const P1_CONTROLS = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
};
export const P1_COOP_CONTROLS = { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'] };
export const P2_CONTROLS = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
};

const pressed = (keys, codes) => (codes.some((c) => keys.has(c)) ? 1 : 0);

function moveDirection(keys, controls) {
  const dir = new THREE.Vector3(
    pressed(keys, controls.right) - pressed(keys, controls.left),
    0,
    pressed(keys, controls.down) - pressed(keys, controls.up)
  );
  return dir.lengthSq() > 0 ? dir.normalize() : dir;
}

export class Player {
  constructor(mesh, radius) {
    this.mesh = mesh;
    this.position = mesh.position;
    this.baseRadius = Math.min(radius, 0.8);
    this.aimDir = new THREE.Vector3(0, 0, -1);
    this.dashDir = new THREE.Vector3();
    this.controls = P1_CONTROLS;
    this.outfits = createOutfits();
    this.outfitName = 'none';
    this.accessories = createAccessories();
    const { helmet, cape, crown, wings } = this.accessories;
    mesh.add(helmet, cape, crown, wings, ...Object.values(this.outfits));

    // Golden ring under the frog while an ambush shot is charged
    this.ambushRing = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.1, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd54f, side: THREE.DoubleSide })
    );
    this.ambushRing.rotation.x = -Math.PI / 2;
    this.ambushRing.position.y = 0.05;
    mesh.add(this.ambushRing);

    this.time = 0;
    this.reset();
  }

  // Back to starting stats (new game).
  reset() {
    this.speed = 8;
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.damage = 1;
    this.fireRateMul = 1;
    this.dashCdMul = 1;
    this.pierce = false;
    this.explosive = false;
    this.multishot = false;
    this.cooldown = 0;
    this.invulnerable = 0;
    this.dashTime = 0;
    this.dashCd = 0;
    this.jumpTime = 0;
    this.jumpCd = 0;
    this.bombCd = 0;
    this.flyTime = 0;
    this.flyCd = 0;
    this.stillTime = 0;
    this.justLanded = false;
    this.dead = false;
    this.buffTime = 0; // Sabar power: faster and stronger
    this.weapon = 'normal';
    this.weaponTime = 0;
    this.level = 1;
    this.xp = 0;
    this.mesh.visible = true;
    this.position.set(0, 0, 0);
    this.applyLevel();
  }

  get xpNeeded() {
    return 6 + this.level * 4;
  }

  get hasCrown() {
    return this.level >= CROWN_LEVEL;
  }

  get ambushReady() {
    return this.level >= AMBUSH_LEVEL && this.stillTime >= AMBUSH_TIME;
  }

  // Adds XP and returns how many levels were gained.
  addXp(amount) {
    this.xp += amount;
    let gained = 0;
    while (this.xp >= this.xpNeeded) {
      this.xp -= this.xpNeeded;
      this.level++;
      gained++;
      if (this.level === CROWN_LEVEL) this.maxHealth += 25;
      this.heal(20);
    }
    if (gained > 0) this.applyLevel();
    return gained;
  }

  // The frog grows and gets outfit pieces as it levels up.
  applyLevel() {
    // 1.25: the frog is a bit bigger than the raw model so it reads well from the camera
    const scale = Math.min(1.6, 1 + 0.06 * (this.level - 1)) * 1.25;
    this.mesh.scale.setScalar(scale);
    this.radius = this.baseRadius * scale;
    this.accessories.helmet.visible = this.level >= JUMP_LEVEL;
    this.accessories.cape.visible = this.level >= BOMB_LEVEL;
    this.accessories.wings.visible = this.level >= FLY_LEVEL;
    this.accessories.crown.visible = this.level >= CROWN_LEVEL;
    this.refreshOutfit();
  }

  // 'none', 'boubou', 'wax' or 'sahel'
  setOutfit(name) {
    this.outfitName = name;
    this.refreshOutfit();
  }

  refreshOutfit() {
    for (const [name, outfit] of Object.entries(this.outfits)) {
      outfit.visible = name === this.outfitName;
      // headwear would clip through the helmet
      for (const part of outfit.userData.head) part.visible = this.level < JUMP_LEVEL;
    }
  }

  update(dt, keys, aimPoint, obstacles) {
    this.time += dt;
    const jumping = this.jumpTime > 0;
    const flying = this.flyTime > 0;

    if (jumping) {
      this.jumpTime -= dt;
      const t = 1 - Math.max(this.jumpTime, 0) / JUMP_DURATION;
      this.position.y = Math.sin(t * Math.PI) * JUMP_HEIGHT;
      if (this.jumpTime <= 0) {
        this.position.y = 0;
        this.justLanded = true;
      }
    } else if (flying) {
      this.flyTime -= dt;
      this.position.y += (FLY_HEIGHT - this.position.y) * Math.min(1, dt * 8);
    } else if (this.position.y > 0) {
      this.position.y = Math.max(0, this.position.y - 12 * dt); // glide down
    }

    const dir = moveDirection(keys, this.controls);
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.position.addScaledVector(this.dashDir, DASH_SPEED * dt);
      resolveCollisions(this.mesh, this.radius, obstacles);
    } else if (dir.lengthSq() > 0) {
      const boost = flying ? 1.3 : jumping ? 1.25 : 1;
      this.position.addScaledVector(dir, this.speed * boost * (this.buffTime > 0 ? 1.2 : 1) * dt);
      resolveCollisions(this.mesh, this.radius, obstacles);
    }

    // Standing still charges the ambush shot
    const moving = dir.lengthSq() > 0 || this.dashTime > 0 || jumping || flying;
    if (this.mesh.userData.rig) this.animateRig(dt, dir.lengthSq() > 0 || this.dashTime > 0, jumping || flying);
    this.stillTime = moving ? 0 : Math.min(AMBUSH_TIME, this.stillTime + dt);
    this.ambushRing.visible = this.ambushReady;
    this.ambushRing.rotation.z += dt * 2;

    // Wings flap while flying
    const flap = flying ? Math.sin(this.time * 18) * 0.6 : 0.2;
    this.accessories.wings.children[0].rotation.z = flap;
    this.accessories.wings.children[1].rotation.z = -flap;

    const aim = aimPoint.clone().sub(this.position);
    aim.y = 0;
    if (aim.lengthSq() > 0.01) {
      this.aimDir.copy(aim.normalize());
      this.mesh.rotation.y = Math.atan2(aim.x, aim.z) + MODEL_ROTATION_OFFSET;
    }

    this.cooldown = Math.max(0, this.cooldown - dt);
    this.buffTime = Math.max(0, this.buffTime - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.jumpCd = Math.max(0, this.jumpCd - dt);
    this.bombCd = Math.max(0, this.bombCd - dt);
    this.flyCd = Math.max(0, this.flyCd - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    if (this.weaponTime > 0) {
      this.weaponTime -= dt;
      if (this.weaponTime <= 0) this.weapon = 'normal';
    }
    // blink while invulnerable (but not during a dash)
    this.mesh.visible =
      this.dashTime > 0 || this.invulnerable <= 0 || Math.floor(this.invulnerable * 20) % 2 === 0;
  }

  // True while the frog is in the air (enemies can't touch it).
  get airborne() {
    return this.position.y > 1;
  }

  // Hops and swings the legs when walking, tucks them in the air, breathes when idle.
  animateRig(dt, walking, airborne) {
    const { body, legs, arms } = this.mesh.userData.rig;
    this.walkPhase = (this.walkPhase || 0) + dt * (walking ? 15 : 2);
    const s = Math.sin(this.walkPhase);
    if (airborne) {
      legs.forEach((leg) => (leg.rotation.x = 0.9));
      arms.forEach((arm) => (arm.rotation.x = -0.7));
      body.position.y = 0;
      body.scale.y = 1.05;
    } else if (walking) {
      body.position.y = Math.abs(s) * 0.16;
      body.scale.y = 1 + Math.cos(this.walkPhase * 2) * 0.04;
      legs[0].rotation.x = s * 0.7;
      legs[1].rotation.x = -s * 0.7;
      arms[0].rotation.x = -s * 0.6;
      arms[1].rotation.x = s * 0.6;
    } else {
      body.position.y = 0;
      body.scale.y = 1 + s * 0.015;
      legs.forEach((leg) => (leg.rotation.x = 0));
      arms.forEach((arm, i) => (arm.rotation.x = s * 0.05 * (i ? -1 : 1)));
    }
  }

  // Quick burst of speed (invulnerable) in the movement direction.
  tryDash(keys) {
    if (this.dashCd > 0 || this.dashTime > 0) return false;
    const dir = moveDirection(keys, this.controls);
    this.dashDir.copy(dir.lengthSq() > 0 ? dir : this.aimDir);
    this.dashTime = DASH_DURATION;
    this.dashCd = DASH_COOLDOWN * this.dashCdMul;
    this.invulnerable = Math.max(this.invulnerable, DASH_DURATION + 0.1);
    return true;
  }

  // Jump over enemies; landing makes a shockwave (handled by the game).
  tryJump() {
    if (this.level < JUMP_LEVEL || this.jumpCd > 0 || this.jumpTime > 0 || this.flyTime > 0) {
      return false;
    }
    this.jumpTime = JUMP_DURATION;
    this.jumpCd = JUMP_COOLDOWN;
    return true;
  }

  tryBomb() {
    if (this.level < BOMB_LEVEL || this.bombCd > 0) return false;
    this.bombCd = this.hasCrown ? 3 : 4.5;
    return true;
  }

  // Hover above the ground for a few seconds.
  tryFly() {
    if (this.level < FLY_LEVEL || this.flyCd > 0 || this.flyTime > 0 || this.jumpTime > 0) {
      return false;
    }
    this.flyTime = FLY_DURATION;
    this.flyCd = FLY_COOLDOWN;
    return true;
  }

  // Uses up a charged ambush shot; returns true if there was one.
  consumeAmbush() {
    if (!this.ambushReady) return false;
    this.stillTime = 0;
    return true;
  }

  canShoot() {
    return this.cooldown <= 0;
  }

  // Returns the direction of each bullet for the current weapon.
  shotDirections() {
    let angles;
    if (this.weapon === 'spread') angles = this.multishot ? [-0.4, -0.2, 0, 0.2, 0.4] : [-0.25, 0, 0.25];
    else angles = this.multishot ? [-0.07, 0.07] : [0];
    return angles.map((a) => this.aimDir.clone().applyAxisAngle(UP, a));
  }

  shotFired() {
    const base = this.weapon === 'rapid' ? 0.07 : this.weapon === 'spread' ? 0.3 : 0.18;
    this.cooldown = base / this.fireRateMul;
  }

  setWeapon(type) {
    this.weapon = type;
    this.weaponTime = 12;
  }

  hit(damage) {
    if (this.dead || this.invulnerable > 0) return;
    this.health = Math.max(0, this.health - damage);
    this.invulnerable = 1;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }
}
