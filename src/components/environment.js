import * as THREE from 'three';

// Trees, rocks and grass patches. Trees and rocks are added to `obstacles`.
export function createDecor(scene, obstacles) {
  const baobabMat = new THREE.MeshStandardMaterial({ color: 0x8b6b4a, flatShading: true });
  const acaciaTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4330 });
  const leafMats = [0x7a9a2e, 0x6b8e23, 0x8aa83a].map(
    (color) => new THREE.MeshStandardMaterial({ color, flatShading: true })
  );
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x6a7d2c, flatShading: true });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xa89b86, flatShading: true });
  const patchMats = [0xb9944d, 0xd2b06b, 0xc19a55].map(
    (color) => new THREE.MeshStandardMaterial({ color })
  );

  const baobabTrunkGeo = new THREE.CylinderGeometry(0.95, 1.35, 3.4, 10);
  const branchGeo = new THREE.CylinderGeometry(0.1, 0.22, 1.6, 6);
  const crownGeo = new THREE.SphereGeometry(1, 10, 8);
  const acaciaTrunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 3, 6);
  const bushGeo = new THREE.SphereGeometry(0.6, 8, 6);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const patchGeo = new THREE.CircleGeometry(1, 12);

  // Finds a free spot away from the spawn point and other obstacles.
  function findSpot(radius) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = (Math.random() - 0.5) * 92;
      const z = (Math.random() - 0.5) * 92;
      if (Math.hypot(x, z) < 8) continue;
      if (obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.radius + radius + 0.5)) continue;
      return { x, z };
    }
    return null;
  }

  function shadowed(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // Patches of different earth tones (flat, no collision)
  for (let i = 0; i < 70; i++) {
    const patch = new THREE.Mesh(patchGeo, patchMats[i % patchMats.length]);
    const s = 1 + Math.random() * 2.5;
    patch.scale.set(s, s, 1);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set((Math.random() - 0.5) * 96, 0.02, (Math.random() - 0.5) * 96);
    patch.receiveShadow = true;
    scene.add(patch);
  }

  // Baobabs: thick trunk, spreading branches and a flat crown
  for (let i = 0; i < 6; i++) {
    const spot = findSpot(1.6);
    if (!spot) continue;
    const tree = new THREE.Group();
    const trunk = shadowed(new THREE.Mesh(baobabTrunkGeo, baobabMat));
    trunk.position.y = 1.7;
    tree.add(trunk);
    for (let b = 0; b < 6; b++) {
      const a = (b / 6) * Math.PI * 2;
      const branch = shadowed(new THREE.Mesh(branchGeo, baobabMat));
      branch.position.set(Math.cos(a) * 0.6, 3.6, Math.sin(a) * 0.6);
      branch.rotation.z = -Math.cos(a) * 0.9;
      branch.rotation.x = Math.sin(a) * 0.9;
      tree.add(branch);
      const crown = shadowed(new THREE.Mesh(crownGeo, leafMats[b % leafMats.length]));
      crown.position.set(Math.cos(a) * 1.5, 4.4, Math.sin(a) * 1.5);
      crown.scale.set(1.1, 0.5, 1.1);
      tree.add(crown);
    }
    const top = shadowed(new THREE.Mesh(crownGeo, leafMats[0]));
    top.position.y = 4.7;
    top.scale.set(1.4, 0.55, 1.4);
    tree.add(top);
    const s = 0.9 + Math.random() * 0.5;
    tree.scale.setScalar(s);
    tree.position.set(spot.x, 0, spot.z);
    scene.add(tree);
    obstacles.push({ x: spot.x, z: spot.z, radius: 1.3 * s });
  }

  // Acacias: thin trunk and a flat umbrella canopy
  for (let i = 0; i < 22; i++) {
    const spot = findSpot(0.6);
    if (!spot) continue;
    const tree = new THREE.Group();
    const trunk = shadowed(new THREE.Mesh(acaciaTrunkGeo, acaciaTrunkMat));
    trunk.position.y = 1.5;
    trunk.rotation.z = (Math.random() - 0.5) * 0.2;
    const canopy = shadowed(new THREE.Mesh(crownGeo, leafMats[i % leafMats.length]));
    canopy.position.y = 3.2;
    canopy.scale.set(1.7, 0.4, 1.7);
    tree.add(trunk, canopy);
    const s = 0.8 + Math.random() * 0.5;
    tree.scale.setScalar(s);
    tree.rotation.y = Math.random() * Math.PI * 2;
    tree.position.set(spot.x, 0, spot.z);
    scene.add(tree);
    obstacles.push({ x: spot.x, z: spot.z, radius: 0.4 * s });
  }

  // Low bushes (decoration only)
  for (let i = 0; i < 45; i++) {
    const bush = shadowed(new THREE.Mesh(bushGeo, bushMat));
    const s = 0.6 + Math.random() * 0.8;
    bush.scale.set(s, s * 0.7, s);
    bush.position.set((Math.random() - 0.5) * 94, 0.25 * s, (Math.random() - 0.5) * 94);
    scene.add(bush);
  }

  // Rocks
  for (let i = 0; i < 20; i++) {
    const s = 0.6 + Math.random() * 1.1;
    const spot = findSpot(s);
    if (!spot) continue;
    const rock = shadowed(new THREE.Mesh(rockGeo, rockMat));
    rock.scale.set(s, s * 0.7, s);
    rock.position.set(spot.x, s * 0.35, spot.z);
    rock.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
    scene.add(rock);
    obstacles.push({ x: spot.x, z: spot.z, radius: s * 0.9 });
  }
}

const DAY_SKY = new THREE.Color(0x87ceeb);
const NIGHT_SKY = new THREE.Color(0x0b1026);
const DAY_SUN = new THREE.Color(0xffffff);
const NIGHT_SUN = new THREE.Color(0x7788ff);
const CYCLE_SECONDS = 180;
const STORM_SKY = new THREE.Color(0x4a5560);

// Smooth day/night cycle: lights, sky and fog change over time, and a
// lantern around the player lights up at night.
export class DayNight {
  constructor(scene, ambient, sun, lantern) {
    this.scene = scene;
    this.ambient = ambient;
    this.sun = sun;
    this.lantern = lantern;
    this.daylight = 1;
    this.tint = new THREE.Color(0x87ceeb); // biome sky colour
    this.tintAmount = 0;
    this.tintTarget = 0;
  }

  update(time, storm = 0, flash = 0) {
    const phase = (time % CYCLE_SECONDS) / CYCLE_SECONDS;
    // 1 at noon (start), 0 at midnight (half cycle), with longer days/nights
    const raw = 0.5 + 0.5 * Math.cos(phase * Math.PI * 2);
    const d = THREE.MathUtils.smoothstep(raw, 0.2, 0.8);
    this.daylight = d;

    this.scene.background.lerpColors(NIGHT_SKY, DAY_SKY, d);
    this.scene.fog.color.copy(this.scene.background);
    // a storm turns the sky grey and dims the sun; lightning flashes light everything up
    this.tintAmount += (this.tintTarget - this.tintAmount) * 0.02;
    this.scene.background.lerp(this.tint, this.tintAmount * d);
    this.scene.background.lerp(STORM_SKY, storm * 0.75);
    this.scene.fog.color.copy(this.scene.background);
    this.scene.fog.near = 40 - 22 * storm;
    this.scene.fog.far = 120 - 55 * storm;
    this.ambient.intensity = (0.25 + 0.35 * d) * (1 - 0.25 * storm) + flash * 1.8;
    this.sun.intensity = (0.3 + 1.2 * d) * (1 - 0.55 * storm) + flash * 1.2;
    this.sun.color.lerpColors(NIGHT_SUN, DAY_SUN, d);
    this.lantern.intensity = (1 - d) * 45;
  }
}
