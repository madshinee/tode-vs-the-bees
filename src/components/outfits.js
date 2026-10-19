import * as THREE from 'three';
import { patternTexture } from './accessories.js';

// Clothes and faces for the motion-captured mannequins. The mannequin is measured
// in centimetres (floor = 0, head top = 175). Every garment is glued to a bone so
// it moves with the animation.
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
const GOLD = new THREE.MeshStandardMaterial({ color: 0xe0a21f, metalness: 0.7, roughness: 0.3 });

// Men: grand boubou in rich colours, and one in mud cloth (bogolan)
const MEN = [
  { robe: 0x2d79c4, trim: 0xe0a21f, shoes: 0xf2c230 },
  { robe: 0xf1ece0, trim: 0x4f8fd6, shoes: 0xf2c230 },
  { robe: 0xc9892b, trim: 0xf6efdc, shoes: 0x5a3a22 },
  { robe: 0x2e9e6b, trim: 0xe0a21f, shoes: 0xf2c230 },
  { bogolan: true, trim: 0xe0a21f, shoes: 0x5a3a22 },
  { robe: 0x6a2c8f, trim: 0xf6d777, shoes: 0xf2c230 },
];
const WAX = [
  ['#b3226b', '#ffca28', '#26c6da'],
  ['#1565c0', '#ffd54f', '#ffffff'],
  ['#2e7d32', '#ffb300', '#ef5350'],
  ['#e65100', '#fff176', '#1b5e20'],
  ['#6a1b9a', '#ffd740', '#ffffff'],
  ['#00838f', '#ff8f00', '#fff8e1'],
];
const GELE = [0xffb300, 0x00acc1, 0xd81b60, 0x7cb342, 0x8e24aa, 0xff7043];
const TOPS = [0x14705a, 0x1b3a8a, 0x7a2a8c, 0xb3402a, 0x0b7a75, 0xc2185b];

const waxCache = new Map();
function wax(i) {
  const k = i % WAX.length;
  if (!waxCache.has(k)) {
    const map = patternTexture(WAX[k], k % 2 ? 'diamond' : 'wax');
    map.repeat.set(3, 2);
    waxCache.set(k, new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.8 }));
  }
  return waxCache.get(k);
}

// Bogolan: hand-painted mud cloth in earth tones with bands and arrows
let bogolanMaterial = null;
function bogolan() {
  if (!bogolanMaterial) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#e7d9b8';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#3b2616';
    g.fillStyle = '#3b2616';
    g.lineWidth = 6;
    for (let row = 0; row < 4; row++) {
      const y = 32 + row * 64;
      g.beginPath();
      for (let x = 0; x <= 256; x += 32) {
        g.moveTo(x, y - 14);
        g.lineTo(x + 16, y + 14);
        g.lineTo(x + 32, y - 14);
      }
      g.stroke();
      for (let x = 16; x < 256; x += 48) {
        g.beginPath();
        g.arc(x, y + 28, 5, 0, Math.PI * 2);
        g.fill();
      }
    }
    const map = new THREE.CanvasTexture(c);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(2, 2);
    map.colorSpace = THREE.SRGBColorSpace;
    bogolanMaterial = new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.9 });
  }
  return bogolanMaterial;
}

const lathe = (points, segments = 22) =>
  new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments
  );

// ---------------------------------------------------------------------------
// The face: a painted patch over the front of the head (eyes, brows, nose, lips),
// plus ears and a nose. Drawn in centimetres on the head.
// ---------------------------------------------------------------------------
// measured on the mannequin: the head spans y 158-180.5 and is about 16 cm wide
const FACE_REF_Y = 165.5; // the face is drawn around this height, then moved onto the head
const HEAD_CENTER_Y = 169.2;
const HEAD_RADIUS = { x: 8.1, y: 11.4, z: 11.2 };
const PATCH = { phi: 0.95, theta0: 0.66, thetaLength: 2.05 };
const faceCache = new Map();

function faceTexture(kind, skinHex, seed) {
  const key = `${kind}-${skinHex}-${seed % 3}`;
  if (faceCache.has(key)) return faceCache.get(key);
  const W = 512;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  // cm on the face -> canvas pixels
  const px = (dx) => W / 2 + dx * (W / (2 * PATCH.phi * HEAD_RADIUS.x));
  const py = (y) => {
    const theta = Math.PI / 2 + (FACE_REF_Y - y) / HEAD_RADIUS.y;
    return ((theta - PATCH.theta0) / PATCH.thetaLength) * H;
  };
  const sx = W / (2 * PATCH.phi * HEAD_RADIUS.x); // pixels per cm across
  const woman = kind === 'woman';
  const skin = new THREE.Color(skinHex);
  const shade = (f) => `#${skin.clone().multiplyScalar(f).getHexString()}`;

  // soft light and shadow so that the face has volume
  let grad = g.createRadialGradient(px(0), py(164.5), 10, px(0), py(164.5), 8 * sx);
  grad.addColorStop(0, 'rgba(255,230,200,0.18)');
  grad.addColorStop(1, 'rgba(255,230,200,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  grad = g.createRadialGradient(px(0), py(157), 10, px(0), py(157), 5 * sx);
  grad.addColorStop(0, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  // cheeks
  for (const s of [-1, 1]) {
    const cg = g.createRadialGradient(px(s * 5), py(161), 4, px(s * 5), py(161), 3.3 * sx);
    cg.addColorStop(0, woman ? 'rgba(190,80,70,0.28)' : 'rgba(150,70,50,0.18)');
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = cg;
    g.fillRect(0, 0, W, H);
  }

  // nose: soft shadows along the sides and dark nostrils
  g.lineCap = 'round';
  for (const s of [-1, 1]) {
    g.strokeStyle = 'rgba(30,12,4,0.32)';
    g.lineWidth = 0.55 * sx;
    g.beginPath();
    g.moveTo(px(s * 1.1), py(166.2));
    g.quadraticCurveTo(px(s * 1.8), py(164), px(s * 2.1), py(162.1));
    g.stroke();
    g.fillStyle = 'rgba(25,8,4,0.75)';
    g.beginPath();
    g.ellipse(px(s * 1.05), py(162.3), 0.5 * sx, 0.3 * sx, s * 0.5, 0, Math.PI * 2);
    g.fill();
  }

  // eyes
  for (const s of [-1, 1]) {
    const cx = s * 3.3;
    const cy = 166.4;
    const w = 2.25 * sx;
    const h = 1.05 * sx;
    // eyeshadow / eyeliner
    g.fillStyle = woman ? 'rgba(212,160,23,0.5)' : shade(0.75);
    g.globalAlpha = woman ? 0.6 : 0.35;
    g.beginPath();
    g.ellipse(px(cx), py(cy + 0.5), w * 1.15, h * 1.5, 0, Math.PI, 0);
    g.fill();
    g.globalAlpha = 1;
    // eye white
    g.fillStyle = '#f8f3ea';
    g.beginPath();
    g.moveTo(px(cx) - w, py(cy));
    g.quadraticCurveTo(px(cx), py(cy) - h * 1.5, px(cx) + w, py(cy) - s * 0.03 * sx);
    g.quadraticCurveTo(px(cx), py(cy) + h * 1.2, px(cx) - w, py(cy));
    g.fill();
    // iris, pupil, highlight (looking slightly towards the middle)
    g.save();
    g.beginPath();
    g.moveTo(px(cx) - w, py(cy));
    g.quadraticCurveTo(px(cx), py(cy) - h * 1.5, px(cx) + w, py(cy));
    g.quadraticCurveTo(px(cx), py(cy) + h * 1.2, px(cx) - w, py(cy));
    g.clip();
    g.fillStyle = '#2b1608';
    g.beginPath();
    g.arc(px(cx) - s * 0.2 * sx, py(cy) - 0.05 * sx, 1.0 * sx, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#000';
    g.beginPath();
    g.arc(px(cx) - s * 0.2 * sx, py(cy) - 0.05 * sx, 0.5 * sx, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath();
    g.arc(px(cx) - s * 0.2 * sx + 0.28 * sx, py(cy) - 0.32 * sx, 0.17 * sx, 0, Math.PI * 2);
    g.fill();
    g.restore();
    // upper lid line and lashes
    g.strokeStyle = '#150a04';
    g.lineWidth = (woman ? 0.38 : 0.3) * sx;
    g.beginPath();
    g.moveTo(px(cx) - w, py(cy));
    g.quadraticCurveTo(px(cx), py(cy) - h * 1.5, px(cx) + w, py(cy));
    g.stroke();
    if (woman) {
      g.lineWidth = 0.2 * sx;
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const lx = px(cx) - w + t * 2 * w;
        const ly = py(cy) - Math.sin(t * Math.PI) * h * 1.5 * 0.75;
        g.beginPath();
        g.moveTo(lx, ly);
        g.lineTo(lx + s * 0.1 * sx, ly - 0.45 * sx);
        g.stroke();
      }
    }
    // lower lid
    g.strokeStyle = 'rgba(20,8,2,0.4)';
    g.lineWidth = 0.15 * sx;
    g.beginPath();
    g.moveTo(px(cx) - w * 0.9, py(cy) + 0.05 * sx);
    g.quadraticCurveTo(px(cx), py(cy) + h * 1.2, px(cx) + w * 0.9, py(cy) + 0.05 * sx);
    g.stroke();
    // eyebrow
    g.strokeStyle = woman ? '#1a0e07' : '#17100a';
    g.lineWidth = (woman ? 0.6 : 1.0) * sx;
    g.beginPath();
    g.moveTo(px(s * 1.4), py(168.7));
    g.quadraticCurveTo(px(s * 3.6), py(woman ? 170.2 : 169.6), px(s * 5.9), py(168.3));
    g.stroke();
  }

  // beard and moustache for the men
  if (!woman) {
    g.fillStyle = 'rgba(74,66,60,0.78)';
    g.beginPath();
    g.moveTo(px(-6.6), py(162.5));
    g.quadraticCurveTo(px(-6.4), py(156.5), px(-3.2), py(154.6));
    g.quadraticCurveTo(px(0), py(153.8), px(3.2), py(154.6));
    g.quadraticCurveTo(px(6.4), py(156.5), px(6.6), py(162.5));
    g.quadraticCurveTo(px(5), py(160.2), px(3), py(160.2));
    g.lineTo(px(-3), py(160.2));
    g.quadraticCurveTo(px(-5), py(160.2), px(-6.6), py(162.5));
    g.fill();
    g.beginPath();
    g.moveTo(px(-3.3), py(161.2));
    g.quadraticCurveTo(px(0), py(162.6), px(3.3), py(161.2));
    g.quadraticCurveTo(px(0), py(160.7), px(-3.3), py(161.2));
    g.fill();
  }

  // lips
  const lipColor = woman ? '#8a1c3b' : '#6b3028';
  const lipLight = woman ? '#b02a50' : '#8a4a3c';
  g.fillStyle = lipColor;
  g.beginPath();
  g.moveTo(px(-2.1), py(159.7));
  g.quadraticCurveTo(px(-1), py(160.9), px(0), py(160.3));
  g.quadraticCurveTo(px(1), py(160.9), px(2.1), py(159.7));
  g.quadraticCurveTo(px(0), py(159.4), px(-2.1), py(159.7));
  g.fill();
  g.fillStyle = lipLight;
  g.beginPath();
  g.moveTo(px(-2.1), py(159.6));
  g.quadraticCurveTo(px(0), py(157.8), px(2.1), py(159.6));
  g.quadraticCurveTo(px(0), py(159.3), px(-2.1), py(159.6));
  g.fill();
  g.strokeStyle = 'rgba(20,5,5,0.85)';
  g.lineWidth = 0.18 * sx;
  g.beginPath();
  g.moveTo(px(-2.2), py(159.65));
  g.quadraticCurveTo(px(0), py(159.3), px(2.2), py(159.65));
  g.stroke();

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  faceCache.set(key, texture);
  return texture;
}

export function dress(person, kind, style) {
  const { model, bones } = person;
  model.updateMatrixWorld(true);
  const modelQuat = model.getWorldQuaternion(new THREE.Quaternion());
  const modelPos = model.getWorldPosition(new THREE.Vector3());
  const modelScale = model.getWorldScale(new THREE.Vector3()).x;

  // Glues `mesh` (modelled upright, in cm) to `bone`; `at` is where its origin sits in model space
  const glue = (bone, mesh, at = [0, 0, 0]) => {
    const worldPoint = new THREE.Vector3(...at).multiplyScalar(modelScale).applyQuaternion(modelQuat).add(modelPos);
    const boneQuat = bone.getWorldQuaternion(new THREE.Quaternion());
    mesh.quaternion.copy(boneQuat.invert().multiply(modelQuat));
    mesh.position.copy(bone.worldToLocal(worldPoint));
    mesh.castShadow = true;
    bone.add(mesh);
    return mesh;
  };

  // Same, but the mesh is wrapped in a group first so that it can be rotated in its own frame
  const glueRotated = (bone, mesh, at, rotation) => {
    mesh.rotation.set(...rotation);
    const holder = new THREE.Group();
    holder.add(mesh);
    return glue(bone, holder, at);
  };

  // A tube from one bone to the next, glued to the first (sleeves)
  const limb = (from, to, r1, r2, material) => {
    const target = to.getWorldPosition(new THREE.Vector3());
    const dir = from.worldToLocal(target);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, dir.length(), 14, 1, true), material);
    mesh.position.copy(dir).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.castShadow = true;
    from.add(mesh);
    return mesh;
  };

  // A ring around a limb (cuffs, bracelets), glued to the first bone at a fraction of the way
  const ring = (from, to, t, radius, thickness, material) => {
    const dir = from.worldToLocal(to.getWorldPosition(new THREE.Vector3()));
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 6, 14), material);
    mesh.position.copy(dir).multiplyScalar(t);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
    from.add(mesh);
    return mesh;
  };

  const skinColor = person.skinColor ?? 0x5a3a22;
  const woman = kind === 'woman';

  if (!woman) {
    const m = MEN[style % MEN.length];
    const robe = m.bogolan ? bogolan() : std(m.robe, { side: THREE.DoubleSide });
    const trim = std(m.trim, { metalness: m.trim === 0xe0a21f ? 0.6 : 0.1 });
    // long grand boubou: a skirt from the hips down and a body up to the shoulders
    glue(bones.Hips, new THREE.Mesh(lathe([[46, 6], [41, 30], [33, 70], [29, 96], [27, 102]]), robe));
    glue(bones.Spine2, new THREE.Mesh(lathe([[27, 96], [26, 112], [25, 130], [24, 141], [22, 146], [13, 150], [8.5, 152]]), robe));
    for (const arm of [bones.LeftArm, bones.RightArm]) arm.add(new THREE.Mesh(new THREE.SphereGeometry(9.8, 12, 10), robe));
    // golden embroidery: a V-shaped neckline, a medallion and a band at the hem
    const vA = new THREE.Mesh(new THREE.BoxGeometry(2.2, 30, 1), trim);
    const vB = vA.clone();
    glueRotated(bones.Spine2, vA, [-5.5, 130, 23.5], [0, 0, -0.32]);
    glueRotated(bones.Spine2, vB, [5.5, 130, 23.5], [0, 0, 0.32]);
    glue(bones.Spine2, new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.8, 16).rotateX(Math.PI / 2), trim), [0, 108, 25.6]);
    glueRotated(bones.Hips, new THREE.Mesh(new THREE.TorusGeometry(46, 1.4, 6, 28), trim), [0, 8, 0], [Math.PI / 2, 0, 0]);
    glueRotated(bones.Hips, new THREE.Mesh(new THREE.TorusGeometry(41, 1, 6, 28), trim), [0, 30, 0], [Math.PI / 2, 0, 0]);
    // wide sleeves with golden cuffs
    for (const [arm, fore, hand] of [
      [bones.LeftArm, bones.LeftForeArm, bones.LeftHand],
      [bones.RightArm, bones.RightForeArm, bones.RightHand],
    ]) {
      limb(arm, fore, 9, 9.5, robe);
      limb(fore, hand, 9.5, 8, robe);
      ring(fore, hand, 0.9, 8.2, 0.9, trim);
    }
    // babouche slippers, a kufi cap with a golden band and prayer beads
    for (const foot of [bones.LeftFoot, bones.RightFoot]) {
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(9, 3, 26), std(m.shoes));
      glue(foot, shoe, [0, 2, 8]);
    }
    glue(bones.Head, new THREE.Mesh(new THREE.CylinderGeometry(8.9, 9.6, 8, 18), std(0xf5f1e6)), [0, 177.6, 1]);
    glueRotated(bones.Head, new THREE.Mesh(new THREE.TorusGeometry(9.3, 1, 6, 20), GOLD), [0, 174.4, 1], [Math.PI / 2, 0, 0]);
    glueRotated(bones.Spine2, new THREE.Mesh(new THREE.TorusGeometry(10, 1.1, 6, 18), std(0xefe6d2)), [0, 142, 4], [Math.PI / 2.4, 0, 0]);
  } else {
    const top = std(TOPS[style % TOPS.length], { side: THREE.DoubleSide });
    // wrapped pagne (wax), fitted top with a golden neckline, sash and waist beads
    glue(bones.Hips, new THREE.Mesh(lathe([[37, 8], [34, 35], [30, 70], [26, 96], [24, 100]]), wax(style)));
    glue(bones.Spine2, new THREE.Mesh(lathe([[25, 96], [23, 110], [21, 124], [20, 138], [19, 144], [12, 149], [8, 151]]), top));
    glueRotated(bones.Spine, new THREE.Mesh(new THREE.TorusGeometry(24.5, 2.2, 6, 22), GOLD), [0, 104, 0], [Math.PI / 2, 0, 0]);
    for (const [h, col] of [[98, 0xff6f91], [95, 0x26c6da], [92, 0xffd54f]]) {
      glueRotated(bones.Hips, new THREE.Mesh(new THREE.TorusGeometry(26, 0.8, 5, 24), std(col)), [0, h, 0], [Math.PI / 2, 0, 0]);
    }
    // a mussor: a wax scarf draped over the shoulder
    const drape = new THREE.Mesh(new THREE.BoxGeometry(11, 56, 1.6), wax(style + 2));
    glueRotated(bones.Spine2, drape, [-6, 118, 20], [0, 0, 0.55]);
    // short wax sleeves, golden bracelets
    for (const [arm, fore, hand] of [
      [bones.LeftArm, bones.LeftForeArm, bones.LeftHand],
      [bones.RightArm, bones.RightForeArm, bones.RightHand],
    ]) {
      limb(arm, fore, 7.4, 7, wax(style + 1));
      ring(fore, hand, 0.82, 3.6, 0.55, GOLD);
      ring(fore, hand, 0.7, 3.6, 0.55, GOLD);
    }
    // sandals
    for (const foot of [bones.LeftFoot, bones.RightFoot]) {
      glue(foot, new THREE.Mesh(new THREE.BoxGeometry(8, 2, 24), std(0xf2c230)), [0, 1.5, 8]);
    }
    // gele: a sculpted head wrap with two folds and a knot
    const gele = std(GELE[style % GELE.length], { roughness: 0.55 });
    const base = new THREE.Mesh(new THREE.SphereGeometry(12.8, 16, 12), gele);
    base.scale.set(0.85, 0.8, 1.0);
    glue(bones.Head, base, [0, 179.5, 0]);
    glueRotated(bones.Head, new THREE.Mesh(new THREE.TorusGeometry(9, 2.8, 8, 18), gele), [0, 183.5, 0.5], [Math.PI / 2.4, 0, 0]);
    glueRotated(bones.Head, new THREE.Mesh(new THREE.ConeGeometry(7, 17, 10), gele), [9, 190.5, 0], [0, 0, -0.65]);
    glueRotated(bones.Head, new THREE.Mesh(new THREE.ConeGeometry(6, 13, 10), gele), [-8, 189.5, 1], [0, 0, 0.75]);
    // big golden hoop earrings and a layered necklace
    for (const x of [-8.6, 8.6]) {
      glueRotated(bones.Head, new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.45, 6, 14), GOLD), [x, 164.5, 0], [0, Math.PI / 2, 0]);
    }
    glueRotated(bones.Spine2, new THREE.Mesh(new THREE.TorusGeometry(8.8, 0.9, 6, 18), GOLD), [0, 143, 3], [Math.PI / 2, 0, 0]);
    glueRotated(bones.Spine2, new THREE.Mesh(new THREE.TorusGeometry(10.5, 0.8, 6, 18), std(0xff6f91)), [0, 140, 5], [Math.PI / 2.3, 0, 0]);
  }

  // ---- the face: painted patch, ears, nose ----
  const faceMaterial = new THREE.MeshStandardMaterial({
    map: faceTexture(kind, skinColor, style),
    transparent: true,
    roughness: 0.55,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const patch = new THREE.Mesh(
    new THREE.SphereGeometry(1, 36, 28, Math.PI / 2 - PATCH.phi, PATCH.phi * 2, PATCH.theta0, PATCH.thetaLength),
    faceMaterial
  );
  patch.scale.set(HEAD_RADIUS.x + 0.2, HEAD_RADIUS.y + 0.2, HEAD_RADIUS.z + 0.2);
  glue(bones.Head, patch, [0, HEAD_CENTER_Y, 1.2]);
  const skinMat = std(skinColor, { roughness: 0.6 });
  glue(bones.Head, new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), skinMat), [0, 166.5, 12.2]).scale.set(0.9, 1.5, 1.1); // nose
  for (const x of [-8.4, 8.4]) {
    const ear = glue(bones.Head, new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), skinMat), [x, 168.5, 0.6]);
    ear.scale.set(0.8, 2.6, 1.8);
  }
  // an open mouth that appears while the person talks
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), std(0x2a0808));
  mouth.scale.set(1.5, 0.05, 0.4);
  glue(bones.Head, mouth, [0, 163.1, 11.6]);
  person.mouth = mouth;
}
