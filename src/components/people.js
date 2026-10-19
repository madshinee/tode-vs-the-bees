import * as THREE from 'three';
import { dress } from './outfits.js';

// Animated people, built entirely in code: a simple skeleton (bones named like a
// standard humanoid rig so that the clothes in outfits.js can be glued to them),
// a body made of smooth shapes, and motions (idle, talking, walking, running,
// fear, cheering, clapping, dancing, waving) written as keyframes.
// Everything is measured in centimetres: floor = 0, top of the head = 180.

// name, parent, position in model space at rest (arms hanging down, facing +Z)
const SKELETON = [
  ['Hips', null, [0, 100, 0]],
  ['Spine', 'Hips', [0, 108, 0]],
  ['Spine1', 'Spine', [0, 120, 0]],
  ['Spine2', 'Spine1', [0, 134, 0]],
  ['Neck', 'Spine2', [0, 147, 0]],
  ['Head', 'Neck', [0, 155, 0]],
  ['LeftShoulder', 'Spine2', [6, 144, 0]],
  ['LeftArm', 'LeftShoulder', [17, 144, 0]],
  ['LeftForeArm', 'LeftArm', [17, 116, 0]],
  ['LeftHand', 'LeftForeArm', [17, 90, 0]],
  ['RightShoulder', 'Spine2', [-6, 144, 0]],
  ['RightArm', 'RightShoulder', [-17, 144, 0]],
  ['RightForeArm', 'RightArm', [-17, 116, 0]],
  ['RightHand', 'RightForeArm', [-17, 90, 0]],
  ['LeftUpLeg', 'Hips', [9, 96, 0]],
  ['LeftLeg', 'LeftUpLeg', [9, 52, 0]],
  ['LeftFoot', 'LeftLeg', [9, 8, 0]],
  ['RightUpLeg', 'Hips', [-9, 96, 0]],
  ['RightLeg', 'RightUpLeg', [-9, 52, 0]],
  ['RightFoot', 'RightLeg', [-9, 8, 0]],
];
const REST = Object.fromEntries(SKELETON.map(([name, , at]) => [name, new THREE.Vector3(...at)]));

function buildSkeleton() {
  const root = new THREE.Group();
  const bones = {};
  for (const [name, parent, at] of SKELETON) {
    const bone = new THREE.Bone();
    bone.name = name;
    const p = new THREE.Vector3(...at);
    if (parent) {
      bone.position.copy(p.sub(REST[parent]));
      bones[parent].add(bone);
    } else {
      bone.position.copy(p);
      root.add(bone);
    }
    bones[name] = bone;
  }
  return { root, bones };
}

// ---------------------------------------------------------------------------
// The body: smooth shapes glued to the bones (mostly hidden under the clothes)
// ---------------------------------------------------------------------------
const SKINS = [0x7a4b2d, 0x8c5a36, 0x6a3f25];
const skinMaterials = new Map();
const skin = (hex) => {
  if (!skinMaterials.has(hex)) skinMaterials.set(hex, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.6 }));
  return skinMaterials.get(hex);
};

// A tube between two rest points, attached to `bone`
function tube(bone, from, to, r1, r2, material) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry((r1 + r2) / 2, dir.length(), 4, 12), material);
  mesh.position.copy(a.add(b).multiplyScalar(0.5).sub(REST[bone.name]));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  bone.add(mesh);
  return mesh;
}

// A shape placed at a rest point, attached to `bone`
function blob(bone, at, scale, material, geometry = new THREE.SphereGeometry(1, 20, 16)) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(new THREE.Vector3(...at).sub(REST[bone.name]));
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  bone.add(mesh);
  return mesh;
}

function buildBody(bones, kind, skinHex) {
  const m = skin(skinHex);
  const woman = kind === 'woman';
  // head (the face is painted on top of it by outfits.js), neck and torso
  blob(bones.Head, [0, 169.2, 1.2], [8.1, 11.4, 11.2], m, new THREE.SphereGeometry(1, 28, 22));
  tube(bones.Neck, [0, 146, 0], [0, 159, 0], 4.6, 4.2, m);
  blob(bones.Spine2, [0, 136, 0], woman ? [17, 13, 11] : [19, 14, 12], m);
  blob(bones.Spine, [0, 112, 0], woman ? [15, 15, 10.5] : [16, 15, 11], m);
  blob(bones.Hips, [0, 98, 0], woman ? [17, 10, 11.5] : [16, 10, 11], m);
  for (const s of ['Left', 'Right']) {
    const x = s === 'Left' ? 17 : -17;
    const lx = s === 'Left' ? 9 : -9;
    blob(bones[`${s}Shoulder`], [x * 0.85, 144, 0], [6, 5.5, 6], m);
    tube(bones[`${s}Arm`], [x, 144, 0], [x, 116, 0], 4.6, 4, m);
    tube(bones[`${s}ForeArm`], [x, 116, 0], [x, 91, 0], 4, 3.3, m);
    blob(bones[`${s}Hand`], [x, 85, 0.5], [3.2, 6, 2.4], m);
    tube(bones[`${s}UpLeg`], [lx, 96, 0], [lx, 52, 0], 7, 5.5, m);
    tube(bones[`${s}Leg`], [lx, 52, 0], [lx, 10, 0], 5.2, 4, m);
    blob(bones[`${s}Foot`], [lx, 4, 6], [4.5, 3.5, 11], m);
  }
}

// ---------------------------------------------------------------------------
// Motions: each one is a function of the time (0..duration) that returns the
// rotation (x, y, z in radians) of some bones, plus the height of the hips.
// x < 0 swings a limb forward, z opens the left arm outward (-z the right one).
// ---------------------------------------------------------------------------
const TAU = Math.PI * 2;
const ARMS_REST = (p, out = 0.08) => {
  p.LeftArm = [0, 0, out];
  p.RightArm = [0, 0, -out];
};

const MOTIONS = {
  idle: [2.6, (t) => {
    const b = Math.sin((t / 2.6) * TAU);
    const p = { Spine1: [0.02 * b, 0, 0], Head: [0.03 * b, 0.08 * Math.sin((t / 2.6) * TAU * 0.5), 0], hips: 0.4 * b };
    ARMS_REST(p, 0.1 + 0.02 * b);
    p.LeftForeArm = [-0.12, 0, 0];
    p.RightForeArm = [-0.12, 0, 0];
    return p;
  }],
  walk: [1.0, (t) => {
    const a = (t / 1.0) * TAU;
    const s = Math.sin(a);
    return {
      LeftUpLeg: [-0.42 * s, 0, 0],
      RightUpLeg: [0.42 * s, 0, 0],
      LeftLeg: [0.45 * Math.max(0, -Math.cos(a)) + 0.1, 0, 0],
      RightLeg: [0.45 * Math.max(0, Math.cos(a)) + 0.1, 0, 0],
      LeftArm: [0.32 * s, 0, 0.08],
      RightArm: [-0.32 * s, 0, -0.08],
      LeftForeArm: [-0.25, 0, 0],
      RightForeArm: [-0.25, 0, 0],
      Spine: [0.04, 0.08 * s, 0],
      hips: -1.5 * Math.abs(Math.cos(a)),
    };
  }],
  run: [0.62, (t) => {
    const a = (t / 0.62) * TAU;
    const s = Math.sin(a);
    return {
      LeftUpLeg: [-0.85 * s - 0.15, 0, 0],
      RightUpLeg: [0.85 * s - 0.15, 0, 0],
      LeftLeg: [1.25 * Math.max(0, -Math.cos(a)) + 0.25, 0, 0],
      RightLeg: [1.25 * Math.max(0, Math.cos(a)) + 0.25, 0, 0],
      LeftArm: [0.75 * s, 0, 0.12],
      RightArm: [-0.75 * s, 0, -0.12],
      LeftForeArm: [-1.35, 0, 0],
      RightForeArm: [-1.35, 0, 0],
      Spine: [0.22, 0.12 * s, 0],
      Head: [-0.12, 0, 0],
      hips: -3 + 3 * Math.abs(Math.cos(a)),
    };
  }],
  talk1: [3.2, (t) => {
    const a = (t / 3.2) * TAU;
    const p = { Head: [0.06 * Math.sin(a * 2), 0.15 * Math.sin(a), 0], Spine1: [0, 0.06 * Math.sin(a), 0], hips: 0.3 * Math.sin(a) };
    p.RightArm = [-0.35 - 0.15 * Math.sin(a * 2), 0, -0.15];
    p.RightForeArm = [-1.1 - 0.25 * Math.sin(a * 3), 0, 0];
    p.LeftArm = [0, 0, 0.1];
    p.LeftForeArm = [-0.2, 0, 0];
    return p;
  }],
  talk2: [2.8, (t) => {
    const a = (t / 2.8) * TAU;
    const open = 0.3 + 0.25 * Math.sin(a * 2);
    return {
      LeftArm: [-0.45, 0, open],
      RightArm: [-0.45, 0, -open],
      LeftForeArm: [-1.0, 0, 0],
      RightForeArm: [-1.0, 0, 0],
      Head: [0.08 * Math.sin(a * 2), 0.1 * Math.sin(a), 0],
      hips: 0.4 * Math.sin(a),
    };
  }],
  talk3: [3.0, (t) => {
    const a = (t / 3.0) * TAU;
    return {
      LeftArm: [-0.5 - 0.2 * Math.sin(a * 2), 0, 0.2],
      LeftForeArm: [-1.3, 0, 0],
      RightArm: [0, 0, -0.1],
      RightForeArm: [-0.2, 0, 0],
      Head: [0.05 * Math.sin(a * 2), -0.12 * Math.sin(a), 0.05 * Math.sin(a)],
      Spine1: [0, -0.05 * Math.sin(a), 0],
    };
  }],
  terrified: [1.0, (t) => {
    const a = (t / 1.0) * TAU;
    const shiver = 0.04 * Math.sin(a * 6);
    return {
      Spine: [0.3, 0, shiver],
      Spine1: [0.15, 0, 0],
      Head: [0.25, 0.25 * Math.sin(a), 0],
      LeftArm: [-2.3 + shiver, 0, 0.35],
      RightArm: [-2.3 - shiver, 0, -0.35],
      LeftForeArm: [-1.7, 0, 0],
      RightForeArm: [-1.7, 0, 0],
      LeftUpLeg: [-0.35, 0, 0.05],
      RightUpLeg: [-0.35, 0, -0.05],
      LeftLeg: [0.6, 0, 0],
      RightLeg: [0.6, 0, 0],
      hips: -6 + 0.6 * Math.sin(a * 6),
    };
  }],
  cheer: [0.9, (t) => {
    const a = (t / 0.9) * TAU;
    const up = 0.5 + 0.5 * Math.sin(a);
    return {
      LeftArm: [-0.2, 0, 2.5 + 0.3 * up],
      RightArm: [-0.2, 0, -2.5 - 0.3 * up],
      LeftForeArm: [-0.4 * (1 - up), 0, 0],
      RightForeArm: [-0.4 * (1 - up), 0, 0],
      Head: [-0.25, 0, 0],
      LeftUpLeg: [-0.25 * (1 - up), 0, 0],
      RightUpLeg: [-0.25 * (1 - up), 0, 0],
      LeftLeg: [0.5 * (1 - up), 0, 0],
      RightLeg: [0.5 * (1 - up), 0, 0],
      hips: 9 * up - 3,
    };
  }],
  clap: [0.5, (t) => {
    const a = (t / 0.5) * TAU;
    const open = 0.18 + 0.2 * Math.max(0, Math.sin(a));
    return {
      LeftArm: [-1.15, 0, open],
      RightArm: [-1.15, 0, -open],
      LeftForeArm: [-0.9, -0.4, 0],
      RightForeArm: [-0.9, 0.4, 0],
      Head: [0.05 * Math.sin(a), 0, 0],
      hips: 1.5 * Math.sin(a),
    };
  }],
  dance1: [1.1, (t) => {
    const a = (t / 1.1) * TAU;
    const s = Math.sin(a);
    return {
      Hips: [0, 0.25 * s, 0.08 * s],
      Spine: [0.1, -0.2 * s, -0.12 * s],
      Spine1: [0, 0, -0.08 * s],
      LeftArm: [-0.5, 0, 1.2 + 0.9 * Math.max(0, s)],
      RightArm: [-0.5, 0, -1.2 - 0.9 * Math.max(0, -s)],
      LeftForeArm: [-1.2 + 0.6 * s, 0, 0],
      RightForeArm: [-1.2 - 0.6 * s, 0, 0],
      LeftUpLeg: [-0.3 * Math.max(0, s), 0, 0.1],
      RightUpLeg: [-0.3 * Math.max(0, -s), 0, -0.1],
      LeftLeg: [0.6 * Math.max(0, s), 0, 0],
      RightLeg: [0.6 * Math.max(0, -s), 0, 0],
      Head: [0.1 * Math.sin(a * 2), 0.2 * s, 0],
      hips: -4 + 3 * Math.abs(Math.sin(a * 2)),
    };
  }],
  dance2: [1.3, (t) => {
    const a = (t / 1.3) * TAU;
    const s = Math.sin(a);
    const bounce = Math.abs(Math.sin(a * 2));
    return {
      Spine: [0.25 * bounce, 0.3 * s, 0],
      LeftArm: [-0.3, 0, 1.5 + 0.4 * Math.sin(a * 2)],
      RightArm: [-0.3, 0, -1.5 + 0.4 * Math.sin(a * 2)],
      LeftForeArm: [-0.3, 0, 0.6 * Math.sin(a * 2)],
      RightForeArm: [-0.3, 0, 0.6 * Math.sin(a * 2)],
      LeftUpLeg: [-0.5 * bounce, 0, 0.15],
      RightUpLeg: [-0.5 * bounce, 0, -0.15],
      LeftLeg: [0.9 * bounce, 0, 0],
      RightLeg: [0.9 * bounce, 0, 0],
      Head: [-0.15 * bounce, 0, 0.15 * s],
      hips: -9 * bounce,
    };
  }],
  wave: [1.2, (t) => {
    const a = (t / 1.2) * TAU;
    return {
      RightArm: [-0.2, 0, -2.6],
      RightForeArm: [0, 0, -0.5 * Math.sin(a * 2)],
      LeftArm: [0, 0, 0.1],
      LeftForeArm: [-0.2, 0, 0],
      Head: [-0.1, 0.15, 0.05 * Math.sin(a)],
      Spine1: [0, 0, 0.05 * Math.sin(a * 2)],
    };
  }],
};

// Samples a motion into a looping AnimationClip
function makeClip(name, [duration, pose]) {
  const fps = 30;
  const frames = Math.round(duration * fps);
  const times = [];
  const rotations = {};
  const hips = [];
  const euler = new THREE.Euler();
  const quat = new THREE.Quaternion();
  const names = new Set();
  for (let i = 0; i <= frames; i++) Object.keys(pose((i / frames) * duration)).forEach((k) => k !== 'hips' && names.add(k));
  for (const n of names) rotations[n] = [];
  for (let i = 0; i <= frames; i++) {
    const t = (i / frames) * duration;
    const p = pose(i === frames ? 0 : t); // the last key equals the first, so the loop is seamless
    times.push(t);
    for (const n of names) {
      const [x, y, z] = p[n] || [0, 0, 0];
      quat.setFromEuler(euler.set(x, y, z));
      rotations[n].push(quat.x, quat.y, quat.z, quat.w);
    }
    hips.push(0, REST.Hips.y + (p.hips || 0), 0);
  }
  const tracks = [...names].map((n) => new THREE.QuaternionKeyframeTrack(`${n}.quaternion`, times, rotations[n]));
  tracks.push(new THREE.VectorKeyframeTrack('Hips.position', times, hips));
  return new THREE.AnimationClip(name, duration, tracks);
}

const CLIPS = Object.fromEntries(Object.entries(MOTIONS).map(([name, motion]) => [name, makeClip(name, motion)]));

// Creates a person: { group, mixer, play(name), bones }
export async function createPerson(kind, outfitIndex = 0) {
  const group = new THREE.Group();
  const { root: model, bones } = buildSkeleton();
  model.scale.setScalar(0.01); // centimetres to metres
  group.add(model);
  const skinColor = SKINS[outfitIndex % SKINS.length];
  buildBody(bones, kind, skinColor);
  model.traverse((o) => {
    if (o.isMesh) o.frustumCulled = false;
  });

  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  const addAction = (name, clip) => {
    if (!actions[name]) actions[name] = mixer.clipAction(clip);
  };
  for (const [name, clip] of Object.entries(CLIPS)) addAction(name, clip);
  let current = null;

  function play(name, { fade = 0.3, loop = true, speed = 1 } = {}) {
    const next = actions[name] || actions.idle;
    if (next && next === current) next.timeScale = speed;
    if (!next || next === current) return next;
    next.reset();
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    next.clampWhenFinished = !loop;
    next.timeScale = speed;
    next.play();
    if (current) current.crossFadeTo(next, fade, false);
    current = next;
    return next;
  }

  const person = { group, model, mixer, bones, play, actions, addAction, skinColor, mouth: null };
  dress(person, kind, outfitIndex);
  return person;
}
