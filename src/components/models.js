import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

const loader = new GLTFLoader();

// Loads a .glb, scales it to `height`, and centers it on the ground.
// Returns { spawn(), radius } where spawn() gives a fresh copy.
export async function loadModel(url, height) {
  const gltf = await loader.loadAsync(url);
  const root = gltf.scene;

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  root.scale.setScalar(height / size.y);

  box.setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.set(-center.x, -box.min.y, -center.z);

  const template = new THREE.Group();
  template.add(root);
  template.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  const finalSize = new THREE.Box3().setFromObject(template).getSize(new THREE.Vector3());
  const radius = Math.max(finalSize.x, finalSize.z) / 2;

  return { spawn: () => clone(template), radius, clips: gltf.animations };
}

const tinted = new Map();

// Multiplies the colors of every mesh by `color` (materials are cached so
// many copies share one tinted material).
export function tintMesh(mesh, color) {
  mesh.traverse((o) => {
    if (!o.isMesh) return;
    const key = `${color}:${o.material.uuid}`;
    if (!tinted.has(key)) {
      const m = o.material.clone();
      m.color.multiply(new THREE.Color(color));
      tinted.set(key, m);
    }
    o.material = tinted.get(key);
  });
}

// Cartoon outline: every mesh gets a slightly inflated dark copy drawn from
// behind, which makes the character stand out from the ground and shadows.
export function addOutline(root, color = 0x0d3b1c, width = 0.05) {
  root.updateMatrixWorld(true);
  const scale = new THREE.Vector3();
  const targets = [];
  root.traverse((o) => {
    if (o.isMesh && !o.isSkinnedMesh && !o.userData.isOutline) targets.push(o);
  });
  for (const mesh of targets) {
    mesh.getWorldScale(scale);
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { color: { value: new THREE.Color(color) }, thickness: { value: width / scale.x } },
      vertexShader: `
        uniform float thickness;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * thickness, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 color;
        void main() { gl_FragColor = vec4(color, 1.0); }`,
    });
    const outline = new THREE.Mesh(mesh.geometry, material);
    outline.userData.isOutline = true;
    outline.castShadow = false;
    mesh.add(outline);
  }
}
