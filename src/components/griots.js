import * as THREE from 'three';

const ROBE_COLORS = [0x1e88e5, 0xd84315, 0x43a047];
const AURA_RADIUS = 7;
const skin = new THREE.MeshStandardMaterial({ color: 0x5a3a22 });
const cream = new THREE.MeshStandardMaterial({ color: 0xe8d5a8 });
const wood = new THREE.MeshStandardMaterial({ color: 0x6d4c2a });
const white = new THREE.MeshStandardMaterial({ color: 0xf5f5f5 });

const robeGeo = new THREE.CylinderGeometry(0.35, 0.72, 1.2, 14);
const headGeo = new THREE.SphereGeometry(0.3, 12, 10);
const capGeo = new THREE.CylinderGeometry(0.3, 0.34, 0.22, 12);
const gourdGeo = new THREE.SphereGeometry(0.38, 12, 10);
const neckGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6);

// A griot (traditional musician and storyteller) sitting with a kora.
function createGriot(color) {
  const g = new THREE.Group();
  const robe = new THREE.Mesh(robeGeo, new THREE.MeshStandardMaterial({ color }));
  robe.position.y = 0.6;
  const head = new THREE.Mesh(headGeo, skin);
  head.position.y = 1.5;
  const cap = new THREE.Mesh(capGeo, white);
  cap.position.y = 1.78;
  const gourd = new THREE.Mesh(gourdGeo, cream);
  gourd.scale.set(1, 1, 0.8);
  gourd.position.set(0.1, 0.6, 0.65);
  const neck = new THREE.Mesh(neckGeo, wood);
  neck.position.set(0.1, 1.3, 0.7);
  neck.rotation.x = -0.25;
  for (const m of [robe, head, cap, gourd, neck]) {
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

// Griots sit in the villages; players standing near them are healed and
// inspired by their music.
export class Griots {
  constructor(scene, villages, obstacles) {
    this.list = [];
    villages.forEach((v, i) => {
      const x = v.x + 1.4;
      const z = v.z - 1.4;
      const mesh = createGriot(ROBE_COLORS[i % ROBE_COLORS.length]);
      mesh.position.set(x, 0, z);
      mesh.rotation.y = Math.atan2(v.x - x, v.z - z) + 0.6;
      scene.add(mesh);
      obstacles.push({ x, z, radius: 0.9 });
      this.list.push({ mesh, x, z, phase: Math.random() * 6, noteTimer: 0, met: false });
    });
  }

  // `players` are living players. onMeet(griot) fires the first time someone
  // comes near, onBless(player) every frame a player is inside the aura.
  // Returns true while anyone is being blessed.
  update(dt, time, players, effects, onMeet, onBless, isActive = () => true) {
    let blessing = false;
    for (let gi = 0; gi < this.list.length; gi++) {
      const griot = this.list[gi];
      if (!isActive(gi)) continue; // this village fell
      griot.mesh.rotation.z = Math.sin(time * 3 + griot.phase) * 0.04;
      griot.noteTimer -= dt;
      if (griot.noteTimer <= 0) {
        griot.noteTimer = 0.45;
        effects.burst(new THREE.Vector3(griot.x, 2.4, griot.z), 0xffd54f, 1, 0.16, 2);
      }
      for (const p of players) {
        if (Math.hypot(p.position.x - griot.x, p.position.z - griot.z) > AURA_RADIUS) continue;
        blessing = true;
        if (!griot.met) {
          griot.met = true;
          onMeet(griot);
        }
        onBless(p, dt);
      }
    }
    return blessing;
  }
}
