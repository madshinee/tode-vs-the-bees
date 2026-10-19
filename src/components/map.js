import * as THREE from 'three';

const wallMats = [0xb5703c, 0xc98a52, 0xa8643a].map((c) => new THREE.MeshStandardMaterial({ color: c }));
const thatchMat = new THREE.MeshStandardMaterial({ color: 0xe0b860, flatShading: true });
const doorMat = new THREE.MeshStandardMaterial({ color: 0x3b2314 });
const bandMats = [0xd84315, 0x1976d2, 0xfbc02d, 0x2e7d32].map(
  (c) => new THREE.MeshStandardMaterial({ color: c })
);

const wallGeo = new THREE.CylinderGeometry(1.5, 1.6, 1.8, 16);
const roofGeo = new THREE.ConeGeometry(2.25, 1.9, 16);
const tipGeo = new THREE.SphereGeometry(0.18, 8, 8);
const bandGeo = new THREE.TorusGeometry(1.52, 0.08, 6, 24);
const doorGeo = new THREE.BoxGeometry(0.65, 1.15, 0.12);

// A round mud-brick hut ("case") with a thatched conical roof and a painted band.
function createHut(variant) {
  const hut = new THREE.Group();
  const wall = new THREE.Mesh(wallGeo, wallMats[variant % wallMats.length]);
  wall.position.y = 0.9;
  const roof = new THREE.Mesh(roofGeo, thatchMat);
  roof.position.y = 2.75;
  const tip = new THREE.Mesh(tipGeo, thatchMat);
  tip.position.y = 3.75;
  const band = new THREE.Mesh(bandGeo, bandMats[variant % bandMats.length]);
  band.rotation.x = Math.PI / 2;
  band.position.y = 1.55;
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 0.58, 1.55);
  for (const m of [wall, roof, tip, band, door]) {
    m.castShadow = true;
    m.receiveShadow = true;
    hut.add(m);
  }
  return hut;
}

// Builds a few villages of huts. Returns { obstacles, villages } (colliders and
// the center of each village).
export function createMap(scene, villages = 3, hutsPerVillage = 5) {
  const obstacles = [];
  const centers = [];
  let variant = 0;
  for (let v = 0; v < villages; v++) {
    // village centers sit in a ring around the spawn point
    const angle = ((v + Math.random() * 0.6) / villages) * Math.PI * 2;
    const dist = 22 + Math.random() * 14;
    const cx = Math.cos(angle) * dist;
    const cz = Math.sin(angle) * dist;
    const village = { x: cx, z: cz, huts: [] };
    centers.push(village);

    for (let k = 0; k < hutsPerVillage; k++) {
      const scale = 0.9 + Math.random() * 0.4;
      const radius = 1.7 * scale;
      for (let attempt = 0; attempt < 20; attempt++) {
        const a = Math.random() * Math.PI * 2;
        const r = 3 + Math.random() * 7;
        const x = cx + Math.cos(a) * r;
        const z = cz + Math.sin(a) * r;
        if (Math.abs(x) > 44 || Math.abs(z) > 44) continue;
        if (obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.radius + radius + 1.2)) continue;

        const hut = createHut(variant++);
        hut.position.set(x, 0, z);
        const rotation = Math.atan2(cx - x, cz - z); // doors face the village center
        hut.rotation.y = rotation;
        hut.scale.setScalar(scale);
        scene.add(hut);
        obstacles.push({ x, z, radius });
        // the spot just outside the door, where villagers go in and out
        village.huts.push({
          x,
          z,
          doorX: x + Math.sin(rotation) * radius * 1.7,
          doorZ: z + Math.cos(rotation) * radius * 1.7,
        });
        break;
      }
    }
  }
  return { obstacles, villages: centers };
}
