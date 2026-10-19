import * as THREE from 'three';

const geometry = new THREE.BoxGeometry(1, 1, 1);
const materials = new Map();

function getMaterial(color) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshBasicMaterial({ color }));
  return materials.get(color);
}

// Burst of little cubes that fly outward, fall and shrink.
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
  }

  burst(position, color = 0xff8800, count = 14, size = 0.25, speed = 7) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geometry, getMaterial(color));
      const s = size * (0.6 + Math.random() * 0.8);
      mesh.scale.setScalar(s);
      mesh.position.set(position.x, Math.max(position.y, 1), position.z);
      const vel = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.8 + 0.2,
        Math.random() - 0.5
      )
        .normalize()
        .multiplyScalar(speed * (0.4 + Math.random() * 0.6));
      const life = 0.4 + Math.random() * 0.4;
      this.scene.add(mesh);
      this.list.push({ mesh, vel, life, maxLife: life, size: s });
    }
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      p.vel.y -= 15 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 8;
      p.mesh.rotation.y += dt * 8;
      p.mesh.scale.setScalar(Math.max(0.001, p.size * (p.life / p.maxLife)));
      if (p.life <= 0 || p.mesh.position.y < 0) {
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
