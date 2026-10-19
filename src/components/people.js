import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { dress } from './outfits.js';

// Real animated people: Mixamo mannequins (X Bot, Y Bot) with motion-captured
// clips (idle, talking, walking, running, terrified, cheering, dancing), dressed
// in traditional African clothes built in code.
const loader = new FBXLoader();
const BASE = `${import.meta.env.BASE_URL}models/people/`;

const CLIPS = {
  idle: 'idle.fbx',
  talk1: 'talk_general.fbx',
  talk2: 'talk_two_hands.fbx',
  talk3: 'talk_one_hand.fbx',
  terrified: 'terrified.fbx',
  walk: 'walk.fbx',
  run: 'run.fbx',
  cheer: 'cheer.fbx',
  clap: 'clap.fbx',
  dance1: 'dance_noodle.fbx',
  dance2: 'dance_rainbow.fbx',
  wave: 'wave.fbx',
};

let assets = null;
const everyone = []; // every person created, so late clips can be added to them
const ESSENTIAL = ['idle', 'walk', 'run', 'talk1'];

function addClip(name, file) {
  if (!file || !file.animations.length) return;
  const clip = file.animations[0];
  clip.name = name;
  assets.clips[name] = clip;
  for (const p of everyone) p.addAction(name, clip);
}

async function loadAssets() {
  if (assets) return assets;
  const [xbot, ybot, ...clipFiles] = await Promise.all([
    loader.loadAsync(`${BASE}xbot.fbx`),
    loader.loadAsync(`${BASE}ybot.fbx`),
    ...ESSENTIAL.map((n) => loader.loadAsync(`${BASE}${CLIPS[n]}`).catch(() => null)),
  ]);
  // the mannequins are faceted: smooth their shading once, for every copy
  for (const model of [xbot, ybot]) {
    model.traverse((o) => {
      if (!o.isMesh) return;
      const geo = o.geometry;
      geo.deleteAttribute('normal');
      if (geo.attributes.uv) geo.deleteAttribute('uv');
      o.geometry = mergeVertices(geo, 0.01);
      o.geometry.computeVertexNormals();
    });
  }
  assets = { models: { woman: xbot, man: ybot }, clips: {} };
  ESSENTIAL.forEach((n, i) => addClip(n, clipFiles[i]));
  // the other motions (talking, fear, dancing...) load quietly in the background
  Object.keys(CLIPS)
    .filter((n) => !ESSENTIAL.includes(n))
    .forEach((n) => loader.loadAsync(`${BASE}${CLIPS[n]}`).then((f) => addClip(n, f)).catch(() => {}));
  return assets;
}

const SKINS = [0x7a4b2d, 0x8c5a36, 0x6a3f25];

// Paints the mannequin's material a skin colour
function dressSkin(root, colorHex) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.material = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.65 });
      o.frustumCulled = false;
    }
  });
}

// Creates a person: { group, mixer, play(name), bones }
export async function createPerson(kind, outfitIndex = 0) {
  const { models, clips } = await loadAssets();
  const group = new THREE.Group();
  const model = clone(models[kind]);
  model.scale.setScalar(0.01); // Mixamo is in centimetres
  group.add(model);
  dressSkin(model, SKINS[outfitIndex % SKINS.length]);

  const bones = {};
  model.traverse((o) => {
    if (o.isBone) bones[o.name.replace('mixamorig', '')] = o;
  });

  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  const addAction = (name, clip) => {
    if (!actions[name]) actions[name] = mixer.clipAction(clip);
  };
  for (const [name, clip] of Object.entries(clips)) addAction(name, clip);
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

  const person = { group, model, mixer, bones, play, actions, addAction, skinColor: SKINS[outfitIndex % SKINS.length], mouth: null };
  dress(person, kind, outfitIndex);
  everyone.push(person);
  return person;
}
