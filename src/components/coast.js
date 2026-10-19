import * as THREE from 'three';

// The island is surrounded by a beach, palm trees and the sea, where
// brightly painted fishing pirogues bob on the waves (all built in code).
export const ISLAND_HALF = 46; // players are kept on the island

const HULL_COLORS = [0xd7263d, 0xf2b705, 0x2a9d8f, 0x1d6fb8, 0xe76f51, 0x6a4c93];
const SAIL_COLORS = [0xfff1c9, 0xf2b705, 0xd7263d, 0x2a9d8f];

function makePirogue(colorIndex) {
  const boat = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: HULL_COLORS[colorIndex % HULL_COLORS.length], flatShading: true, side: THREE.DoubleSide });
  const stripeMat = new THREE.MeshStandardMaterial({ color: HULL_COLORS[(colorIndex + 2) % HULL_COLORS.length] });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4330 });

  // a long open hull with a raised prow and stern
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), hullMat);
  hull.scale.set(3.6, 1, 0.95);
  hull.position.y = 0.7;
  boat.add(hull);
  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.12, 0.1), stripeMat);
    stripe.position.set(0, 0.62, side * 0.62);
    boat.add(stripe);
  }
  for (const end of [-1, 1]) {
    const prow = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.5, 6), hullMat);
    prow.position.set(end * 3.5, 1.15, 0);
    prow.rotation.z = -end * 0.5;
    boat.add(prow);
  }

  // a fisherman in a boubou and a mast with a sail on some boats
  const fisher = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1, 8), new THREE.MeshStandardMaterial({ color: 0xf5f0e6 }));
  robe.position.y = 0.5;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshStandardMaterial({ color: 0x4a2f20 }));
  head.position.y = 1.15;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd7263d }));
  cap.position.y = 1.2;
  fisher.add(robe, head, cap);
  fisher.position.set(0.8, 0.5, 0);
  boat.add(fisher);

  if (colorIndex % 2 === 0) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4.2, 6), woodMat);
    mast.position.set(-0.6, 2.7, 0);
    boat.add(mast);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(2.6, 0);
    shape.lineTo(0, 3.4);
    shape.closePath();
    const sail = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshStandardMaterial({ color: SAIL_COLORS[(colorIndex / 2) % SAIL_COLORS.length], side: THREE.DoubleSide })
    );
    sail.position.set(-0.55, 1.0, 0);
    sail.rotation.y = Math.PI;
    boat.add(sail);
  }
  return boat;
}

function makePalm(scale) {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8f3a, flatShading: true, side: THREE.DoubleSide });
  const lean = (Math.random() - 0.5) * 0.4;
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.22 - i * 0.03, 0.26 - i * 0.03, 1.5, 6), trunkMat);
    seg.position.set(lean * i * 0.5, 0.75 + i * 1.45, 0);
    seg.rotation.z = lean * 0.3;
    palm.add(seg);
  }
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 3.2, 4), leafMat);
    leaf.scale.set(1, 1, 0.25);
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(lean * 2 + Math.cos(a) * 1.3, 6.1, Math.sin(a) * 1.3);
    leaf.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
    palm.add(leaf);
  }
  palm.scale.setScalar(scale);
  return palm;
}

export function createCoast(scene) {
  // sand rim and sea
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(116, 116), new THREE.MeshStandardMaterial({ color: 0xe6cf98 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = -0.03;
  sand.receiveShadow = true;
  scene.add(sand);

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: 0x1b8fa6, roughness: 0.25, metalness: 0.1 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.2;
  scene.add(sea);

  // a ring of foam where the sea meets the sand
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(122, 122), new THREE.MeshBasicMaterial({ color: 0xdff6f5, transparent: true, opacity: 0.55 }));
  foam.rotation.x = -Math.PI / 2;
  foam.position.y = -0.15;
  scene.add(foam);

  // palm trees along the beach
  for (let i = 0; i < 26; i++) {
    const side = i % 4;
    const along = (Math.random() - 0.5) * 100;
    const edge = 48 + Math.random() * 4;
    const palm = makePalm(0.8 + Math.random() * 0.5);
    palm.position.set(side < 2 ? along : (side === 2 ? -edge : edge), 0, side < 2 ? (side === 0 ? -edge : edge) : along);
    palm.rotation.y = Math.random() * Math.PI * 2;
    scene.add(palm);
  }

  // pirogues out at sea
  const boats = [];
  for (let i = 0; i < 12; i++) {
    const boat = makePirogue(i);
    const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 62 + Math.random() * 28;
    boat.position.set(Math.cos(angle) * dist, -0.1, Math.sin(angle) * dist);
    boat.rotation.y = Math.random() * Math.PI * 2;
    boat.scale.setScalar(1.1 + Math.random() * 0.4);
    scene.add(boat);
    boats.push({ boat, phase: Math.random() * 10, baseY: boat.position.y, spin: boat.rotation.y });
  }

  return {
    update(time) {
      for (const b of boats) {
        b.boat.position.y = b.baseY + Math.sin(time * 0.9 + b.phase) * 0.18;
        b.boat.rotation.z = Math.sin(time * 0.7 + b.phase) * 0.05;
        b.boat.rotation.x = Math.sin(time * 0.6 + b.phase * 2) * 0.03;
        b.boat.rotation.y = b.spin + Math.sin(time * 0.15 + b.phase) * 0.15;
      }
    },
  };
}
