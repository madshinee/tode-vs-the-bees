import * as THREE from 'three';

const geometry = new THREE.SphereGeometry(0.45, 12, 12);
const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
const hotMaterial = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200 });

export const BOMB_FUSE = 2;

export class Bombs {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
  }

  drop(position) {
    const mesh = new THREE.Mesh(geometry, darkMaterial);
    mesh.position.set(position.x, 0.45, position.z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.list.push({ mesh, timer: BOMB_FUSE });
  }

  // onExplode(position) is called when a bomb goes off.
  update(dt, onExplode) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      b.timer -= dt;
      // blinks faster as the fuse runs out
      const blink = Math.floor(b.timer * (4 + (BOMB_FUSE - b.timer) * 4)) % 2 === 0;
      b.mesh.material = blink ? hotMaterial : darkMaterial;
      b.mesh.scale.setScalar(1 + (BOMB_FUSE - b.timer) * 0.12);
      if (b.timer <= 0) {
        onExplode(b.mesh.position.clone());
        this.scene.remove(b.mesh);
        this.list.splice(i, 1);
      }
    }
  }

  clear() {
    for (const b of this.list) this.scene.remove(b.mesh);
    this.list.length = 0;
  }
}
