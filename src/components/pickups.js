import * as THREE from 'three';

const geometry = new THREE.OctahedronGeometry(0.5);

export const PICKUP_TYPES = {
  health: { color: 0x33ff66, emissive: 0x118833 },
  spread: { color: 0x44aaff, emissive: 0x114488 },
  rapid: { color: 0xff9933, emissive: 0x884411 },
};

const materials = Object.fromEntries(
  Object.entries(PICKUP_TYPES).map(([type, c]) => [
    type,
    new THREE.MeshStandardMaterial({ color: c.color, emissive: c.emissive }),
  ])
);

export function randomPickupType() {
  const r = Math.random();
  return r < 0.5 ? 'health' : r < 0.75 ? 'spread' : 'rapid';
}

export class Pickups {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
  }

  drop(position, type = 'health') {
    const mesh = new THREE.Mesh(geometry, materials[type]);
    mesh.position.set(position.x, 0.8, position.z);
    this.scene.add(mesh);
    this.list.push({ mesh, type, life: 12 });
  }

  // `targets` are the positions of the living players; onCollect(type, index)
  // tells which player picked it up.
  update(dt, time, targets, onCollect) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      p.mesh.rotation.y += dt * 2;
      p.mesh.position.y = 0.8 + Math.sin(time * 3) * 0.15;
      const who = targets.findIndex((t) => p.mesh.position.distanceTo(t) < 1.6);
      if (who >= 0) onCollect(p.type, who);
      if (who >= 0 || p.life <= 0) {
        this.scene.remove(p.mesh);
        this.list.splice(i, 1);
      }
    }
  }

  clear() {
    for (const p of this.list) this.scene.remove(p.mesh);
    this.list.length = 0;
  }
}
