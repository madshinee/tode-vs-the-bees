import * as THREE from 'three';

const geometry = new THREE.SphereGeometry(0.25, 8, 8);
const pierceMaterial = new THREE.MeshBasicMaterial({ color: 0x66e0ff });
const explosiveMaterial = new THREE.MeshBasicMaterial({ color: 0xff7722 });

export class Bullets {
  constructor(scene, { color = 0xffdd33, speed = 35, life = 1.5, blocked = false } = {}) {
    this.scene = scene;
    this.blocked = blocked; // do huts and trees stop these bullets?
    this.material = new THREE.MeshBasicMaterial({ color });
    this.speed = speed;
    this.life = life;
    this.list = [];
  }

  // Returns the new bullet. Special bullets get their own color.
  fire(origin, dir, damage = 1, { pierce = false, explosive = false, size = 1, owner = null } = {}) {
    const mesh = new THREE.Mesh(
      geometry,
      explosive ? explosiveMaterial : pierce ? pierceMaterial : this.material
    );
    mesh.position.copy(origin);
    mesh.position.y = Math.max(1.2, origin.y + 1.2);
    mesh.position.addScaledVector(dir, 1);
    mesh.scale.setScalar(size);
    this.scene.add(mesh);
    const bullet = { mesh, dir: dir.clone(), life: this.life, damage, pierce, explosive, owner, hit: new Set() };
    this.list.push(bullet);
    return bullet;
  }

  update(dt, obstacles) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      b.mesh.position.addScaledVector(b.dir, this.speed * dt);
      b.life -= dt;
      const blocked =
        this.blocked &&
        obstacles.some(
        (o) => Math.hypot(b.mesh.position.x - o.x, b.mesh.position.z - o.z) < o.radius
      );
      if (b.life <= 0 || blocked) this.remove(i);
    }
  }

  remove(i) {
    this.scene.remove(this.list[i].mesh);
    this.list.splice(i, 1);
  }

  clear() {
    for (let i = this.list.length - 1; i >= 0; i--) this.remove(i);
  }
}
