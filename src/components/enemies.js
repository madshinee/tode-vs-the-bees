import * as THREE from 'three';
import { resolveCollisions } from './physics.js';
import { tintMesh } from './models.js';
import { createGear } from './gear.js';

// speed is a multiplier of the wave speed; tint colors the model.
const TYPES = {
  bee: { scale: 1, speed: 1, health: 1, damage: 10, score: 10, tint: null },
  fast: { scale: 0.7, speed: 1.9, health: 1, damage: 8, score: 15, tint: 0xffee55 },
  tank: { scale: 1.7, speed: 0.6, health: 5, damage: 25, score: 30, tint: 0xcc4444 },
  shooter: { scale: 1, speed: 0.9, health: 2, damage: 10, score: 25, tint: 0x66aaff, ranged: true },
};

// The bee model's head points along +Z like the frog, so no extra turn is needed
const ENEMY_YAW_OFFSET = 0;
const RAID_AGGRO = 16; // a raider turns on Tode when he gets this close
const RAID_ATTACK_RANGE = 5; // raiders hover this close to a village while they attack it

// Glowing ring on the ground under each enemy so it is easy to spot,
// even at night or in the shade of a tree.
const ringGeo = new THREE.RingGeometry(0.55, 0.78, 24);
const ring = (color, opacity = 0.6) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
const ringMaterials = {
  enemy: ring(0xff3b3b),
  raider: ring(0xffa000, 0.75), // orange: heading for a village
  clone: ring(0x66ccff),
  boss: ring(0xe040fb, 0.7),
  elite: ring(0xffd400, 0.95), // golden: a tougher, faster bee
  hornet: ring(0xff5722, 0.8),
};

function addRing(mesh, kind) {
  const r = new THREE.Mesh(ringGeo, ringMaterials[kind]);
  r.rotation.x = -Math.PI / 2;
  r.position.y = 0.06;
  mesh.add(r);
  return r;
}

function pickType(wave) {
  const weights = [
    ['bee', 1],
    ['fast', wave >= 2 ? 0.6 : 0],
    ['tank', wave >= 3 ? 0.35 : 0],
    ['shooter', wave >= 4 ? 0.5 : 0],
  ];
  let r = Math.random() * weights.reduce((sum, [, w]) => sum + w, 0);
  for (const [type, w] of weights) {
    if ((r -= w) < 0) return type;
  }
  return 'bee';
}

export class Enemies {
  constructor(scene, model) {
    this.scene = scene;
    this.model = model;
    this.list = [];
    this.dying = []; // bees playing their death animation
    this.difficulty = { speed: 1, damage: 1, count: 1 };
  }

  // Flapping wings (the model's own flying animation) and a death animation.
  animate(mesh) {
    const clips = this.model.clips || [];
    const find = (name) => clips.find((c) => c.name.endsWith(name));
    const fly = find('Fast_Flying');
    if (!fly) return {};
    const mixer = new THREE.AnimationMixer(mesh);
    const flyAction = mixer.clipAction(fly);
    flyAction.timeScale = 0.9 + Math.random() * 0.5;
    flyAction.time = Math.random() * fly.duration;
    flyAction.play();
    const death = find('Death');
    const deathAction = death ? mixer.clipAction(death) : null;
    if (deathAction) {
      deathAction.setLoop(THREE.LoopOnce, 1);
      deathAction.clampWhenFinished = true;
    }
    return { mixer, actions: { fly: flyAction, death: deathAction } };
  }

  spawnAround(mesh, x, z, distance) {
    const angle = Math.random() * Math.PI * 2;
    mesh.position.set(x + Math.cos(angle) * distance, 0, z + Math.sin(angle) * distance);
    resolveCollisions(mesh, 0, []); // clamp to map
    this.scene.add(mesh);
  }

  // raidVillage: when given, the bee flies to that village and attacks it
  // instead of hunting Tode (until Tode gets too close).
  spawn(wave, center, raidVillage = null) {
    const type = pickType(wave);
    const t = TYPES[type];
    const elite = wave >= 7 && Math.random() < Math.min(0.28, (wave - 5) * 0.025);
    const size = t.scale * (elite ? 1.25 : 1);
    const mesh = this.model.spawn();
    mesh.scale.setScalar(size);
    if (elite) tintMesh(mesh, 0xffc400);
    else if (t.tint) tintMesh(mesh, t.tint);
    const gear = createGear(type);
    if (gear) mesh.add(gear);
    addRing(mesh, elite ? 'elite' : raidVillage ? 'raider' : 'enemy');
    if (raidVillage) this.spawnAround(mesh, raidVillage.x, raidVillage.z, 26);
    else this.spawnAround(mesh, center.x, center.z, 30);

    // bees get tougher as the waves go on
    let health = (type === 'bee' && wave % 3 === 0 ? 2 : t.health) + Math.floor(wave / 6);
    if (elite) health = Math.ceil(health * 2.5);
    this.list.push({
      ...this.animate(mesh),
      type,
      mesh,
      raid: raidVillage,
      radius: Math.min(this.model.radius, 0.9) * size,
      centerY: size,
      baseScale: size,
      elite,
      seed: Math.random() * 10,
      flash: 0,
      speed: Math.min(2.5 + wave * 0.38, 6.6) * t.speed * (elite ? 1.15 : 1) * this.difficulty.speed * (0.85 + Math.random() * 0.3),
      health,
      damage: Math.round(t.damage * this.difficulty.damage),
      score: t.score * (elite ? 3 : 1),
      ranged: !!t.ranged,
      shootTimer: 1 + Math.random() * 2,
      boss: false,
    });
  }

  // kind: 'queen' (clones herself) or 'hornet' (charges and fires volleys)
  spawnBoss(wave, center, kind = 'queen') {
    const hornet = kind === 'hornet';
    const scale = hornet ? 3.6 : 3;
    const mesh = this.model.spawn();
    mesh.scale.setScalar(scale);
    if (hornet) tintMesh(mesh, 0xc24a2a);
    mesh.add(createGear(hornet ? 'hornet' : 'boss'));
    const r = addRing(mesh, hornet ? 'hornet' : 'boss');
    this.spawnAround(mesh, center.x, center.z, 30);
    const health = hornet ? 40 + wave * 4 : 15 + wave * 3;
    this.list.push({
      ...this.animate(mesh),
      type: 'boss',
      kind,
      name: hornet ? 'Giant Hornet' : 'Queen Bee',
      mesh,
      ring: r,
      radius: Math.min(this.model.radius, 0.9) * scale,
      centerY: scale,
      baseScale: scale,
      seed: Math.random() * 10,
      flash: 0,
      speed: (hornet ? 2.6 : 3.2) * this.difficulty.speed,
      health,
      maxHealth: health,
      damage: Math.round((hornet ? 35 : 30) * this.difficulty.damage),
      shotDamage: Math.round(12 * this.difficulty.damage),
      score: hornet ? 400 : 200,
      ranged: false,
      boss: true,
      cloneStage: 0,
      // hornet attack pattern
      phase: 'chase',
      phaseTimer: 0,
      chargeCd: 4,
      volleyCd: 3,
      lockedDir: new THREE.Vector3(),
    });
  }

  // "Shadow clone": a smaller, bluish copy that appears next to the boss.
  spawnClone(boss, wave) {
    const mesh = this.model.spawn();
    mesh.scale.setScalar(1.8);
    tintMesh(mesh, 0x88ccff);
    addRing(mesh, 'clone');
    this.spawnAround(mesh, boss.mesh.position.x, boss.mesh.position.z, 4);
    const clone = {
      ...this.animate(mesh),
      type: 'clone',
      mesh,
      radius: Math.min(this.model.radius, 0.9) * 1.8,
      centerY: 1.8,
      baseScale: 1.8,
      seed: Math.random() * 10,
      flash: 0,
      speed: 3.6 * this.difficulty.speed,
      health: 3 + Math.floor(wave / 2),
      damage: Math.round(20 * this.difficulty.damage),
      score: 40,
      ranged: false,
      boss: false,
      clone: true,
    };
    this.list.push(clone);
    return clone;
  }

  // Clones vanish when the boss dies. Returns where they were (for effects).
  removeClones() {
    const spots = [];
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (!this.list[i].clone) continue;
      spots.push(this.list[i].mesh.position.clone());
      this.remove(i);
    }
    return spots;
  }

  // The hornet alternates between chasing, winding up (a warning) and a fast
  // charge, and now and then fires a fan of shots.
  hornetBehavior(e, dt, toPlayer, dist, onShoot, time) {
    e.chargeCd -= dt;
    e.volleyCd -= dt;
    e.phaseTimer -= dt;
    let move = 1;
    let speed = e.speed;

    if (e.phase === 'chase') {
      if (e.chargeCd <= 0 && dist < 30) {
        e.phase = 'wind';
        e.phaseTimer = 0.9;
      }
      if (e.volleyCd <= 0 && dist < 26) {
        e.volleyCd = 3.5;
        for (const a of [-0.5, -0.25, 0, 0.25, 0.5]) {
          onShoot(e, toPlayer.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a));
        }
      }
    } else if (e.phase === 'wind') {
      move = 0; // freezes, shakes and glows: get out of the way!
      e.mesh.position.x += (Math.random() - 0.5) * 0.12;
      e.ring.scale.setScalar(1 + 0.4 * Math.abs(Math.sin(time * 25)));
      e.lockedDir.copy(toPlayer);
      if (e.phaseTimer <= 0) {
        e.phase = 'charge';
        e.phaseTimer = 0.8;
        e.ring.scale.setScalar(1);
      }
    } else if (e.phase === 'charge') {
      speed = 17;
      toPlayer.copy(e.lockedDir);
      if (e.phaseTimer <= 0) {
        e.phase = 'chase';
        e.chargeCd = 5 + Math.random() * 2;
      }
    }
    return { move, speed };
  }

  // onShoot(enemy, direction) is called when a ranged enemy fires.
  // onRaid(enemy, dt) is called every frame a raider is attacking its village.
  // `targets` are the positions of the living players; each enemy hunts the nearest.
  update(dt, targets, obstacles, onShoot, time = 0, onRaid = () => {}) {
    // dying bees tumble down and fade away
    for (let i = this.dying.length - 1; i >= 0; i--) {
      const d = this.dying[i];
      d.mixer.update(dt);
      d.left -= dt;
      d.mesh.position.y = Math.max(0, d.mesh.position.y - 5 * dt);
      d.mesh.rotation.y += dt * 6;
      if (d.left <= 0) {
        this.scene.remove(d.mesh);
        this.dying.splice(i, 1);
      }
    }
    for (const e of this.list) e.mixer?.update(dt);
    if (targets.length === 0) return;
    for (const e of this.list) {
      let playerPos = targets[0];
      for (const t of targets) {
        if (t.distanceToSquared(e.mesh.position) < playerPos.distanceToSquared(e.mesh.position)) {
          playerPos = t;
        }
      }
      let aim = playerPos;
      let raiding = false;
      if (e.raid && !e.raid.fallen && playerPos.distanceTo(e.mesh.position) > RAID_AGGRO) {
        aim = e.raid.pos;
        raiding = true;
      }

      const toTarget = aim.clone().sub(e.mesh.position);
      toTarget.y = 0;
      const dist = toTarget.length();
      if (dist > 0.1) toTarget.normalize();

      let move = 1;
      let speed = e.speed;
      if (raiding) {
        if (dist < RAID_ATTACK_RANGE) {
          move = 0; // hovering over the village, attacking it
          onRaid(e, dt);
          // circle around the village while attacking
          e.mesh.position.x += Math.cos(time * 1.5 + e.seed) * dt * 1.5;
          e.mesh.position.z += Math.sin(time * 1.5 + e.seed) * dt * 1.5;
        }
      } else if (e.kind === 'hornet') {
        ({ move, speed } = this.hornetBehavior(e, dt, toTarget, dist, onShoot, time));
      } else if (e.ranged) {
        // keep a distance: approach when far, back off when too close
        move = dist > 12 ? 1 : dist < 8 ? -0.7 : 0;
        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && dist < 22) {
          e.shootTimer = 2.2;
          onShoot(e, toTarget.clone());
        }
      }
      if (move !== 0) e.mesh.position.addScaledVector(toTarget, speed * move * dt);
      if (dist > 0.1) e.mesh.rotation.y = Math.atan2(toTarget.x, toTarget.z) + ENEMY_YAW_OFFSET;
      // bees fly over huts and trees: no collision, so they never get stuck behind one

      // juice: flash bigger when hit, and buzz up and down in the air
      e.flash = Math.max(0, (e.flash || 0) - dt);
      e.mesh.scale.setScalar(e.baseScale * (1 + e.flash * 2.2));
      e.mesh.position.y = 0.3 + Math.sin(time * 9 + e.seed) * 0.12;
      e.mesh.rotation.z = Math.sin(time * 15 + e.seed) * 0.1;
    }
    // keep enemies from stacking on each other
    for (let i = 0; i < this.list.length; i++) {
      for (let j = i + 1; j < this.list.length; j++) {
        const a = this.list[i].mesh.position;
        const b = this.list[j].mesh.position;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const min = this.list[i].radius + this.list[j].radius;
        const d = Math.hypot(dx, dz);
        if (d > 0 && d < min) {
          const push = (min - d) / 2;
          a.x -= (dx / d) * push;
          a.z -= (dz / d) * push;
          b.x += (dx / d) * push;
          b.z += (dz / d) * push;
        }
      }
    }
  }

  // dying = true plays the death animation before the bee disappears
  remove(i, dying = false) {
    const e = this.list[i];
    this.list.splice(i, 1);
    if (dying && e.actions?.death) {
      e.actions.fly.stop();
      e.actions.death.reset().play();
      e.mesh.traverse((o) => {
        if (o.geometry === ringGeo) o.visible = false;
      });
      this.dying.push({ mesh: e.mesh, mixer: e.mixer, left: 0.9 });
    } else {
      this.scene.remove(e.mesh);
    }
  }

  clear() {
    for (let i = this.list.length - 1; i >= 0; i--) this.remove(i);
    for (const d of this.dying) this.scene.remove(d.mesh);
    this.dying.length = 0;
  }
}
