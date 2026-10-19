import * as THREE from 'three';
import { resolveCollisions } from './physics.js';

const PER_VILLAGE = 4;
const DANGER_RADIUS = 13; // bees this close make villagers run for their hut
const SAFE_TIME = 2.5; // seconds without bees before they come back out
const WALK_SPEED = 0.9;
const RUN_SPEED = 4.2;

// What the villagers shout in Wolof when they see the bees
export const CRIES = [
  'Daw! Daw!', // Run!
  'Wallu ma!', // Help me!
  'Dugg ci kër gi!', // Get inside the house!
  'Yàlla! Yàlla!', // God! God!
];

// Speech bubbles with the Wolof cries, cached per phrase
const bubbleMaterials = new Map();
function bubbleMaterial(text) {
  if (!bubbleMaterials.has(text)) {
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = '#fff8ec';
    g.strokeStyle = '#b3475a';
    g.lineWidth = 6;
    g.beginPath();
    g.roundRect(6, 6, 308, 70, 24);
    g.fill();
    g.stroke();
    g.fillStyle = '#b3475a';
    g.beginPath();
    g.moveTo(150, 74);
    g.lineTo(170, 74);
    g.lineTo(160, 92);
    g.fill();
    g.fillStyle = '#2b1b00';
    g.font = 'bold 36px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 160, 42);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    bubbleMaterials.set(text, new THREE.SpriteMaterial({ map: t, depthTest: false }));
  }
  return bubbleMaterials.get(text);
}

// Turns `current` toward `target` by at most `maxStep` radians (shortest way)
function turnToward(current, target, maxStep) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + Math.max(-maxStep, Math.min(maxStep, diff));
}

// ---------------------------------------------------------------------------
// Villagers start outside, talking and strolling. When bees get close they shout
// in Wolof and run into their huts; when it is safe they come out again. When
// Tode does something great, everybody comes out to cheer and dance the sabar.
// ---------------------------------------------------------------------------
export class Villagers {
  constructor(scene, villages, obstacles, people) {
    this.list = [];
    this.cheerTime = 0;
    this.screamTimer = 0;

    let n = 0;
    for (const v of villages) {
      for (let k = 0; k < PER_VILLAGE; k++) {
        let x = v.x;
        let z = v.z;
        for (let attempt = 0; attempt < 30; attempt++) {
          const a = Math.random() * Math.PI * 2;
          const r = 2 + Math.random() * 5;
          x = v.x + Math.cos(a) * r;
          z = v.z + Math.sin(a) * r;
          if (!obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.radius + 0.7)) break;
        }
        const person = people[n++ % people.length];
        const parts = { group: person.group, person };
        parts.group.position.set(x, 0, z);
        parts.group.scale.setScalar(1.1);
        const bubble = new THREE.Sprite(bubbleMaterial(CRIES[0]));
        bubble.scale.set(3, 0.9, 1);
        bubble.position.y = 3.2;
        bubble.renderOrder = 10;
        bubble.visible = false;
        parts.group.add(bubble);
        scene.add(parts.group);
        this.list.push({
          ...parts,
          bubble,
          bubbleTime: 0,
          village: v,
          hut: v.huts.length ? v.huts[k % v.huts.length] : null,
          slot: k,
          index: n - 1,
          mode: 'calm',
          inside: false,
          entering: 0,
          fleeTime: 0,
          safeTimer: 0,
          yaw: Math.random() * Math.PI * 2,
          cycle: Math.random() * 6,
          target: new THREE.Vector3(x, 0, z),
          wanderTimer: 1 + Math.random() * 4,
          phase: Math.random() * 6,
        });
      }
    }
  }

  // Everyone comes out to celebrate for `seconds`.
  cheer(seconds) {
    this.cheerTime = Math.max(this.cheerTime, seconds);
  }

  stopCheer() {
    this.cheerTime = 0;
  }

  // The village fell: its villagers are gone for good.
  removeVillage(village) {
    for (const v of this.list) {
      if (v.village !== village) continue;
      v.gone = true;
      v.inside = false;
      v.group.visible = false;
    }
  }

  // Back outside, calm (new game)
  reset() {
    this.cheerTime = 0;
    for (const v of this.list) {
      v.gone = false;
      this.comeOut(v);
    }
  }

  comeOut(v) {
    v.inside = false;
    v.entering = 0;
    v.fleeTime = 0;
    v.group.visible = true;
    v.safeTimer = 0;
    if (v.hut) {
      v.group.position.set(v.hut.doorX, 0, v.hut.doorZ);
      // step out of the door, facing the middle of the village
      v.yaw = Math.atan2(v.village.x - v.hut.doorX, v.village.z - v.hut.doorZ);
    }
  }

  // onScream(text) is called when a villager starts shouting.
  // options.hide: a wave is on, everybody hides in their hut.
  // options.focus: where Tode is; the cheering crowd gathers around him.
  update(dt, time, enemyList, effects, obstacles, onScream, { hide = false, focus = null } = {}) {
    this.cheerTime = Math.max(0, this.cheerTime - dt);
    this.screamTimer -= dt;

    for (const v of this.list) {
      if (v.gone) continue;
      if (!v.inside) v.person.mixer.update(dt);
      const pos = v.group.position;
      const home = v.hut || v.village;

      let near = false;
      for (const e of enemyList) {
        if (Math.hypot(e.mesh.position.x - home.x, e.mesh.position.z - home.z) < DANGER_RADIUS) {
          near = true;
          break;
        }
      }

      let mode;
      if (this.cheerTime > 0) mode = 'cheer';
      else if (hide || near) mode = 'flee';
      else mode = 'calm';

      if (v.inside) {
        if (mode === 'cheer') this.comeOut(v);
        else if (mode === 'calm') {
          v.safeTimer += dt;
          if (v.safeTimer > SAFE_TIME) this.comeOut(v);
        } else v.safeTimer = 0;
        if (v.inside) continue;
      }

      if (mode === 'flee' && v.mode !== 'flee' && v.bubbleTime <= 0) {
        const cry = CRIES[Math.floor(Math.random() * CRIES.length)];
        v.bubble.material = bubbleMaterial(cry);
        v.bubbleTime = 2.2;
        if (this.screamTimer <= 0) {
          this.screamTimer = 2;
          onScream(cry);
        }
      }
      if (mode !== 'flee') v.fleeTime = 0;
      v.mode = mode;
      v.bubbleTime = Math.max(0, v.bubbleTime - dt);
      v.bubble.visible = v.bubbleTime > 0;

      // --- decide where to go and how fast ---
      let speed = 0;
      let faceYaw = null; // where to look when standing still
      const dir = new THREE.Vector3();

      if (v.entering > 0) {
        // stepping through the door into the hut
        v.entering -= dt;
        dir.set(v.hut.x - pos.x, 0, v.hut.z - pos.z).normalize();
        speed = 2;
        pos.addScaledVector(dir, speed * dt);
        v.yaw = turnToward(v.yaw, Math.atan2(dir.x, dir.z), 12 * dt);
        this.pose(v, 'walk', speed, dt, time);
        v.group.rotation.y = v.yaw;
        if (v.entering <= 0) {
          v.inside = true;
          v.group.visible = false;
        }
        continue;
      }

      let nearDoor = false;
      if (mode === 'flee' && v.hut) {
        v.fleeTime += dt;
        dir.set(v.hut.doorX - pos.x, 0, v.hut.doorZ - pos.z);
        const toDoor = dir.length();
        nearDoor = toDoor < 5; // no bumping into neighbors right at the door
        if (toDoor > 1.4 && v.fleeTime < 6) {
          dir.normalize();
          speed = RUN_SPEED;
        } else {
          // reached the door (or got stuck for too long): go inside
          if (v.fleeTime >= 6) pos.set(v.hut.doorX, 0, v.hut.doorZ);
          v.entering = 0.45;
          continue;
        }
      } else if (mode === 'cheer') {
        // run to Tode and form two rings around him
        const center = focus || v.village;
        const a = (v.index / this.list.length) * Math.PI * 2;
        const r = 3.2 + (v.index % 2) * 1.3;
        v.target.set(center.x + Math.cos(a) * r, 0, center.z + Math.sin(a) * r);
        dir.subVectors(v.target, pos);
        dir.y = 0;
        const dist = dir.length();
        if (dist > 0.5) {
          dir.normalize();
          speed = Math.min(5.2, 1.5 + dist * 0.5);
        } else {
          dir.set(0, 0, 0);
          faceYaw = Math.atan2(center.x - pos.x, center.z - pos.z); // dance facing Tode
        }
      } else {
        v.wanderTimer -= dt;
        if (v.wanderTimer <= 0) {
          // pause for a while, then stroll to somewhere new
          v.wanderTimer = 4 + Math.random() * 6;
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * 4;
          v.target.set(v.village.x + Math.cos(a) * (2 + r), 0, v.village.z + Math.sin(a) * (2 + r));
        }
        dir.subVectors(v.target, pos);
        dir.y = 0;
        if (dir.length() > 0.3) {
          dir.normalize();
          speed = WALK_SPEED;
        } else {
          dir.set(0, 0, 0);
          // chat: turn towards the nearest neighbour
          let nearest = null;
          let nd = 5;
          for (const o of this.list) {
            if (o === v || o.gone || o.inside || o.village !== v.village) continue;
            const d = Math.hypot(o.group.position.x - pos.x, o.group.position.z - pos.z);
            if (d < nd) {
              nd = d;
              nearest = o;
            }
          }
          if (nearest) faceYaw = Math.atan2(nearest.group.position.x - pos.x, nearest.group.position.z - pos.z);
        }
      }

      if (speed > 0) {
        pos.addScaledVector(dir, speed * dt);
        v.yaw = turnToward(v.yaw, Math.atan2(dir.x, dir.z), (mode === 'flee' ? 10 : 5) * dt);
        if (!nearDoor) resolveCollisions(v.group, 0.4, obstacles);
      } else if (faceYaw !== null) {
        v.yaw = turnToward(v.yaw, faceYaw, 4 * dt);
      }
      v.group.rotation.y = v.yaw;

      const pose =
        mode === 'cheer'
          ? speed === 0
            ? 'dance'
            : speed > 1.8
              ? 'sprint'
              : 'walk'
          : speed > RUN_SPEED * 0.6
            ? 'run'
            : speed > 0
              ? 'walk'
              : 'idle';
      this.pose(v, pose, speed, dt, time);

      if (pose === 'dance' && Math.random() < dt * 1.5) {
        effects.burst(pos.clone().setY(2.4), 0xffd54f, 2, 0.15, 3);
      }
    }
  }

  // Picks the motion-captured clip that matches what the villager is doing
  pose(v, pose, speed, dt) {
    const p = v.person;
    if (pose === 'walk') p.play('walk', { speed: Math.max(0.5, speed / 1.3) });
    else if (pose === 'run' || pose === 'sprint') p.play('run', { speed: Math.max(0.7, speed / 4.4), fade: 0.2 });
    else if (pose === 'dance') p.play(DANCES[v.index % DANCES.length], { speed: 1 });
    else p.play(TALKS[v.index % TALKS.length]);
  }
}

const DANCES = ['dance1', 'dance2', 'cheer', 'dance1', 'clap'];
const TALKS = ['talk1', 'idle', 'talk3', 'idle', 'talk2', 'idle'];
