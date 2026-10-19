import * as THREE from 'three';

// Simple outfit pieces built from primitives. The frog faces +Z, so the back
// is -Z. Positions are in the frog's local space (height ~2).
export function createAccessories() {
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa7b0, metalness: 0.6, roughness: 0.4 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc62828, side: THREE.DoubleSide });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xffd54f,
    metalness: 0.8,
    roughness: 0.3,
    emissive: 0x553300,
  });

  // Helmet: half sphere on top of the head
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    steel
  );
  helmet.position.set(0, 1.62, -0.05);

  // Cape: flowing red sheet behind the back
  const cape = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.2, 1, 4), red);
  cape.position.set(0, 1.0, -0.98);
  cape.rotation.x = 0.25;

  // Crown: gold ring with points
  const crown = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.22, 16, 1, true), gold);
  crown.add(ring);
  for (let i = 0; i < 6; i++) {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 6), gold);
    const a = (i / 6) * Math.PI * 2;
    tip.position.set(Math.cos(a) * 0.4, 0.24, Math.sin(a) * 0.4);
    crown.add(tip);
  }
  crown.position.set(0, 2.35, 0);

  // Wings: two translucent panels pivoting at the shoulders (flapped by the player)
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x6688aa,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const wings = new THREE.Group();
  for (const side of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.75, 1.15, -0.35);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.55), wingMat);
    panel.rotation.x = -Math.PI / 2;
    panel.position.x = side * 0.6;
    pivot.add(panel);
    wings.add(pivot);
  }

  for (const piece of [helmet, cape, crown, wings]) {
    piece.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    piece.visible = false;
  }
  return { helmet, cape, crown, wings };
}

// Procedural "wax print" fabric pattern drawn on a canvas.
export function patternTexture(colors, kind) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  g.fillStyle = colors[0];
  g.fillRect(0, 0, size, size);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const cx = x * 32 + 16;
      const cy = y * 32 + 16;
      g.fillStyle = colors[1 + ((x + y) % (colors.length - 1))];
      g.beginPath();
      if (kind === 'wax') g.arc(cx, cy, 11, 0, Math.PI * 2);
      else {
        g.moveTo(cx, cy - 12);
        g.lineTo(cx + 12, cy);
        g.lineTo(cx, cy + 12);
        g.lineTo(cx - 12, cy);
      }
      g.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const goldMaterial = () =>
  new THREE.MeshStandardMaterial({ color: 0xffd54f, metalness: 0.8, roughness: 0.3 });

// African-inspired outfits for Tode. Each outfit is a group; `userData.head`
// holds the headwear so it can be hidden when the helmet is worn.
export function createOutfits() {
  const outfits = {};

  // Boubou: flowing embroidered robe with a kufi cap
  {
    const g = new THREE.Group();
    const fabric = new THREE.MeshStandardMaterial({
      map: patternTexture(['#1565c0', '#4dd0e1', '#ffd54f', '#ffffff'], 'diamond'),
      side: THREE.DoubleSide,
    });
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 1.06, 0.95, 18, 1, true), fabric);
    robe.position.y = 0.6;
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.07, 6, 20), goldMaterial());
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.07;
    const cap = new THREE.Group();
    const capBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.4, 0.26, 16),
      new THREE.MeshStandardMaterial({ color: 0xf5f5f5 })
    );
    const capBand = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 6, 20), goldMaterial());
    capBand.rotation.x = Math.PI / 2;
    capBand.position.y = -0.1;
    cap.add(capBody, capBand);
    cap.position.set(0, 1.9, 0);
    g.add(robe, collar, cap);
    g.userData.head = [cap];
    outfits.boubou = g;
  }

  // Wax: wax-print cape and head wrap
  {
    const g = new THREE.Group();
    const fabric = new THREE.MeshStandardMaterial({
      map: patternTexture(['#e53935', '#fdd835', '#43a047', '#1e88e5'], 'wax'),
      side: THREE.DoubleSide,
    });
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.4, 1, 3), fabric);
    cape.position.set(0, 1.0, -1.0);
    cape.rotation.x = 0.2;
    const wrap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), fabric);
    wrap.scale.set(1, 0.6, 1);
    wrap.position.set(0, 1.84, 0);
    g.add(cape, wrap);
    g.userData.head = [wrap];
    outfits.wax = g;
  }

  // Teranga: scarf in the bright green, yellow and red (green, yellow, red)
  {
    const g = new THREE.Group();
    [0x00853f, 0xfdef42, 0xe31b23].forEach((color, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.8, 0.09, 8, 24),
        new THREE.MeshStandardMaterial({ color })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.0 + i * 0.1;
      g.add(ring);
    });
    const tail = new THREE.Mesh(
      new THREE.PlaneGeometry(0.2, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xe31b23, side: THREE.DoubleSide })
    );
    tail.position.set(0.5, 0.7, -0.85);
    g.add(tail);
    g.userData.head = [];
    outfits.sahel = g;
  }

  for (const outfit of Object.values(outfits)) {
    outfit.visible = false;
    outfit.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
  }
  return outfits;
}
