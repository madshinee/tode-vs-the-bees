import * as THREE from 'three';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, ...extra });
const RED = mat(0xd32f2f, { side: THREE.DoubleSide });
const STEEL = mat(0x9aa7b0, { metalness: 0.6, roughness: 0.4 });
const DARK = mat(0x2b2b2b, { metalness: 0.5, roughness: 0.5 });
const GOLD = mat(0xffd54f, { metalness: 0.8, roughness: 0.3, emissive: 0x553300 });
const PURPLE = mat(0x7b1fa2, { side: THREE.DoubleSide });
const GLOW = mat(0xe040fb, { emissive: 0xaa00cc });
const LENS = mat(0x66ccff, { emissive: 0x2288cc });

function build(parts) {
  const group = new THREE.Group();
  for (const part of parts) {
    part.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    group.add(part);
  }
  return group;
}

function at(mesh, x, y, z) {
  mesh.position.set(x, y, z);
  return mesh;
}

// Costumes and weapons for each enemy type (the bee faces +Z).
export function createGear(type) {
  switch (type) {
    case 'fast': {
      // Ninja headband with a trailing ribbon
      const band = at(new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.07, 6, 16), RED), 0, 1.25, 0.2);
      band.rotation.x = Math.PI / 2;
      const ribbon = at(new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.7), RED), 0, 1.25, -0.5);
      ribbon.rotation.x = Math.PI / 2;
      return build([band, ribbon]);
    }
    case 'tank': {
      // Helmet and a round shield
      const helmet = at(
        new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), STEEL),
        0, 1.2, 0.2
      );
      const shield = at(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16), STEEL), 0.75, 0.9, 0.5);
      shield.rotation.z = Math.PI / 2;
      shield.rotation.y = 0.4;
      const boss = at(new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), GOLD), 0.82, 0.9, 0.5);
      return build([helmet, shield, boss]);
    }
    case 'shooter': {
      // Goggles and a little cannon
      const barrel = at(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.9, 10), DARK), 0, 0.8, 0.75);
      barrel.rotation.x = Math.PI / 2;
      const left = at(new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), LENS), -0.17, 1.2, 0.5);
      const right = at(new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), LENS), 0.17, 1.2, 0.5);
      return build([barrel, left, right]);
    }
    case 'boss': {
      // Queen Bee: crown, royal cape and a glowing scepter
      const crown = new THREE.Group();
      crown.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 14, 1, true), GOLD));
      for (let i = 0; i < 5; i++) {
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 6), GOLD);
        const a = (i / 5) * Math.PI * 2;
        tip.position.set(Math.cos(a) * 0.35, 0.22, Math.sin(a) * 0.35);
        crown.add(tip);
      }
      crown.position.set(0, 1.6, 0.25);
      const cape = at(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.3), PURPLE), 0, 0.9, -0.55);
      cape.rotation.x = 0.2;
      const staff = at(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8), GOLD), 0.8, 0.9, 0.4);
      const orb = at(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), GLOW), 0.8, 1.75, 0.4);
      return build([crown, cape, staff, orb]);
    }
    case 'hornet': {
      // Giant Hornet: curved horns, a spiked collar and a glowing stinger
      const horns = [1, -1].map((side) => {
        const horn = at(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 8), STEEL), side * 0.32, 1.7, 0.45);
        horn.rotation.z = -side * 0.5;
        horn.rotation.x = 0.4;
        return horn;
      });
      const spikes = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const spike = at(new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 6), DARK), Math.cos(a) * 0.5, 1.05, Math.sin(a) * 0.5 - 0.1);
        spike.rotation.z = -Math.cos(a) * 1.2;
        spike.rotation.x = Math.sin(a) * 1.2;
        spikes.push(spike);
      }
      const stinger = at(new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 8), GLOW), 0, 0.7, -0.95);
      stinger.rotation.x = -Math.PI / 2;
      return build([...horns, ...spikes, stinger]);
    }
    default:
      return null;
  }
}
