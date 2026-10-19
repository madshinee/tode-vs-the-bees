import * as THREE from 'three';

// A smooth, hand-built frog (replaces the blocky model from the course).
// Faces +Z, about 2 units tall, feet on the ground. The rig (body, legs and
// arms) is exposed in userData.rig so the player can animate it.
const PALETTES = {
  green: { skin: 0x3fb950, dark: 0x1d6b30, belly: 0xeaf5b5, toe: 0x34a047 },
  orange: { skin: 0xff9a4d, dark: 0x9a4a12, belly: 0xffe6b8, toe: 0xf08a3c },
  blue: { skin: 0x4fb8e8, dark: 0x1b5f8a, belly: 0xe3f6ff, toe: 0x3aa3d6 }, // the summoned friend
};

export function createFrogModel(paletteName = 'green') {
  const p = PALETTES[paletteName];
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
  const skin = std(p.skin);
  const dark = std(p.dark);
  const belly = std(p.belly);
  const toe = std(p.toe);
  const white = std(0xffffff, { roughness: 0.2 });
  const black = std(0x111111, { roughness: 0.3 });
  const cheek = std(0xff9aa2);
  const sphereGeo = new THREE.SphereGeometry(1, 22, 16);

  const sphere = (r, material, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(sphereGeo, material);
    m.scale.set(r * sx, r * sy, r * sz);
    m.castShadow = true;
    return m;
  };
  const at = (mesh, x, y, z) => {
    mesh.position.set(x, y, z);
    return mesh;
  };

  function build() {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    // torso, belly and head
    body.add(at(sphere(1, skin, 0.78, 0.62, 0.85), 0, 0.75, 0));
    body.add(at(sphere(1, belly, 0.6, 0.5, 0.5), 0, 0.68, 0.5));
    body.add(at(sphere(1, skin, 0.74, 0.46, 0.68), 0, 1.3, 0.1));

    // big bulging eyes
    for (const side of [1, -1]) {
      body.add(at(sphere(0.3, skin), side * 0.38, 1.58, 0.22));
      body.add(at(sphere(0.24, white), side * 0.4, 1.64, 0.34));
      body.add(at(sphere(0.13, black), side * 0.42, 1.64, 0.55));
      body.add(at(sphere(0.045, white), side * 0.46, 1.7, 0.62));
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.08), dark);
      brow.position.set(side * 0.38, 1.93, 0.36);
      brow.rotation.z = side * 0.32; // determined eyebrows
      body.add(brow);
      body.add(at(sphere(0.12, cheek, 1, 0.6, 0.4), side * 0.56, 1.22, 0.5));
      body.add(at(sphere(0.03, dark), side * 0.1, 1.44, 0.75));
    }

    // smile
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.028, 8, 24, Math.PI), dark);
    smile.rotation.z = Math.PI;
    smile.scale.set(1, 0.4, 1);
    smile.position.set(0, 1.27, 0.72);
    body.add(smile);

    // little arms
    const arms = [1, -1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.68, 1.0, 0.25);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.5, 8), skin);
      arm.position.y = -0.25;
      arm.castShadow = true;
      pivot.add(arm, at(sphere(0.13, toe), 0, -0.55, 0.02));
      body.add(pivot);
      return pivot;
    });

    // strong back legs with flat feet (they hang from the root so the body can hop)
    const legs = [1, -1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.62, 0.55, -0.12);
      pivot.add(at(sphere(0.3, skin, 1, 1.2, 1.4), 0, 0, -0.05));
      pivot.add(at(sphere(0.2, toe, 1.3, 0.35, 1.9), 0, -0.5, 0.3));
      for (const t of [-0.12, 0, 0.12]) pivot.add(at(sphere(0.06, toe, 1, 0.8, 1), t, -0.5, 0.68));
      root.add(pivot);
      return pivot;
    });

    root.userData.rig = { body, legs, arms };
    return root;
  }

  return { spawn: build, radius: 0.8 };
}
