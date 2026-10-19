import * as THREE from 'three';
import './style.css';
import { createCoast, ISLAND_HALF } from './components/coast.js';
import { audioStream } from './components/audio.js';
import { hostGame, joinGame, send, streamTo, closeNet, isConnected, hooks } from './components/net.js';
import { loadModel, addOutline } from './components/models.js';
import { createFrogModel } from './components/frog.js';
import { createMap } from './components/map.js';
import { createDecor, DayNight } from './components/environment.js';
import {
  Player,
  P1_CONTROLS,
  P1_COOP_CONTROLS,
  P2_CONTROLS,
  AMBUSH_LEVEL,
  JUMP_LEVEL,
  ALLY_LEVEL,
  BOMB_LEVEL,
  FLY_LEVEL,
} from './components/player.js';
import { Bullets } from './components/bullets.js';
import { Enemies } from './components/enemies.js';
import { Pickups, randomPickupType } from './components/pickups.js';
import { Effects } from './components/effects.js';
import { Bombs } from './components/bombs.js';
import { Ally } from './components/ally.js';
import { Griots } from './components/griots.js';
import { Villagers } from './components/villagers.js';
import { playCutscene } from './components/cutscene.js';
import { SCORE_PER_KILL, VILLAGE_BONUS, MAX_COMBO_MULTIPLIER, totalScore } from './components/scoring.js';
import { VillageDefense } from './components/defense.js';
import { updateRadar, resizeIndicators } from './components/radar.js';
import { fillIcons } from './components/icons.js';
import { VirtualInput, pollGamepad } from './components/input.js';
import { initTouch } from './components/touch.js';
import { t, applyI18n, onLangChange } from './components/i18n.js';
import { initMenus, isMenuOpen, closeMenus } from './components/menus.js';
import {
  unlock,
  addStat,
  setBest,
  saveStats,
  stats as lifetime,
  setUnlockListener,
} from './components/achievements.js';
import { Shake, FloatingTexts } from './components/juice.js';
import { Rhythm } from './components/rhythm.js';
import { Weather } from './components/weather.js';
import { say, clearDialogue } from './components/dialogue.js';
import { pickUpgrades } from './components/upgrades.js';
import { sfx, startMusic, setMusicMode, toggleMusic, setRain } from './components/audio.js';
import {
  updateHud,
  showGameOver,
  showBanner,
  showUpgrades,
  hideUpgrades,
  showPause,
  updateVillages,
} from './components/hud.js';

fillIcons(); // draw the icons of the page (abilities, pause button, ...)
const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 40, 120);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
// The camera sits behind and above the player. The mouse wheel zooms (also ?zoom=2 in the URL).
const BASE_OFFSET = new THREE.Vector3(0, 16, 12);
const ZOOM_MIN = 0.8;
const ZOOM_MAX = 2.6;
let zoom = Number(params.get('zoom') || localStorage.getItem('zoom') || 1.5);
const cameraOffset = () => BASE_OFFSET.clone().multiplyScalar(zoom);

// Renderer
const canvas = document.querySelector('canvas.game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(10, 20, 10);
sun.castShadow = true;
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);
scene.add(sun.target);
const lantern = new THREE.PointLight(0xffe0a0, 0, 30, 1.5);
scene.add(lantern);
const dayNight = new DayNight(scene, ambient, sun, lantern);
// Debug: add ?time=90 to the URL to start at midnight
const timeOffset = Number(params.get('time') || 0);

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0xc8a45c })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const coast = createCoast(scene); // beach, palm trees, sea and pirogues

// Biomes change every 5 waves: golden savanna, burnt savanna, river lands
const river = new THREE.Mesh(
  new THREE.RingGeometry(9, 11.5, 72),
  new THREE.MeshStandardMaterial({ color: 0x2f8fb8, transparent: true, opacity: 0.85, roughness: 0.2 })
);
river.rotation.x = -Math.PI / 2;
river.position.y = 0.03;
river.visible = false;
scene.add(river);
const BIOMES = [
  { ground: 0xc8a45c, sky: 0x87ceeb, tint: 0 },
  { ground: 0x4d3b30, sky: 0xe0763a, tint: 0.55 },
  { ground: 0x86a85a, sky: 0xa6e6e0, tint: 0.4 },
];
const groundTarget = new THREE.Color(BIOMES[0].ground);
let biome = 0;
function setBiome(index, announce = false) {
  biome = index;
  const b = BIOMES[index];
  groundTarget.set(b.ground);
  dayNight.tint.set(b.sky);
  dayNight.tintTarget = b.tint;
  river.visible = index === 2;
  if (announce) showBanner(t(`banner.biome.${index}`));
}

// Game state
const DIFFICULTIES = {
  easy: { speed: 0.85, damage: 0.7, count: 0.8 },
  normal: { speed: 1, damage: 1, count: 1 },
  hard: { speed: 1.15, damage: 1.4, count: 1.3 },
};

const state = {
  started: false,
  paused: false,
  difficulty: 'normal',
  daily: false,
  remote: false, // a friend plays the orange frog online
  guest: false, // this page is the friend's screen
  auto: false, // trailer mode: Tode plays by himself
  kills: [0, 0],
  coop: false,
  over: false,
  choosing: false,
  options: [],
  upgradesTaken: {},
  waveActive: false,
  score: 0,
  survivalTime: 0, // seconds alive
  killPoints: 0,
  combo: 0,
  comboTimer: 0,
  wave: 0,
  toSpawn: 0,
  spawnTimer: 0,
  nextWaveTimer: 1,
  best: 0,
};

const multiplier = () => Math.min(MAX_COMBO_MULTIPLIER, 1 + Math.floor(state.combo / 5));
const refreshScore = () => (state.score = totalScore(state.survivalTime, state.killPoints));

// Input
const keys = new Set();
let mouseDown = false;
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const aimPoint = new THREE.Vector3();
const aimPoint2 = new THREE.Vector3();
const input = new VirtualInput(); // gamepad + touch
const virtualKeys = new Set(); // keyboard keys plus the sticks, as seen by the player
const remoteKeys = new Set(); // the online friend's controls, as arrow keys
const remote = { mx: 0, my: 0, shoot: false, dash: false };

function setPaused(value) {
  if (!state.started || state.over || state.choosing) return;
  state.paused = value;
  $('paused').style.display = value ? 'flex' : 'none';
  if (value) showPause(pauseInfo());
}

function pauseInfo() {
  const upgrades = Object.entries(state.upgradesTaken).map(([id, n]) => {
    const name = t(`up.${id}.name`);
    return n > 1 ? `${name} x${n}` : name;
  });
  const stats = [
    ['stat.level', player.level],
    ['stat.health', `${Math.ceil(player.health)} / ${player.maxHealth}`],
    ['stat.damage', player.damage],
    ['stat.firerate', `x${player.fireRateMul.toFixed(2)}`],
    ['stat.speed', player.speed.toFixed(1)],
    ['stat.weapon', t(`weapon.${player.weapon}`)],
    ['stat.wave', Math.max(1, state.wave)],
    ['stat.enemies', enemies.list.length + state.toSpawn],
    ['stat.villages', `${defense.standing().length} / ${defense.list.length}`],
  ];
  return { stats, upgrades };
}

window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (e.code === 'KeyR' && state.over) restart();
  if (state.choosing && e.code.startsWith('Digit')) chooseUpgrade(Number(e.code.slice(5)) - 1);
  if (e.code === 'KeyM') toggleMusic();
  if (e.code === 'KeyT' && state.over) showTitle();
  if (isMenuOpen()) {
    if (e.code === 'Escape') closeMenus();
    return;
  }
  if (e.code === 'KeyP' || e.code === 'Escape') setPaused(!state.paused);
  if (!state.started || state.paused || state.over || state.choosing) return;
  // Debug: with ?debug in the URL, K makes the villagers cheer
  if (params.has('debug') && e.code === 'KeyK') celebrate(6, t('say.cheer.1'));

  // Player 2: right shift dashes
  if (state.coop && !state.remote && e.code === 'ShiftRight' && !player2.dead && player2.tryDash(keys)) {
    sfx.dash();
    effects.burst(player2.position, 0xffcc88, 10, 0.2, 4);
  }
  if (e.code === 'ShiftLeft' || (e.code === 'ShiftRight' && !state.coop)) doDash(keys);
  if (e.code === 'KeyQ') doJump();
  if (e.code === 'KeyF') doFly();
  if (e.code === 'KeyG') doAlly();
  if (e.code === 'KeyE') doBomb();
  if (e.code === 'KeyB') beat();
});

// Abilities (shared by the keyboard, the gamepad and the touch buttons)
function doDash(keySet) {
  if (player.dead || !player.tryDash(keySet)) return;
  sfx.dash();
  effects.burst(player.position, 0xaaffcc, 10, 0.2, 4);
}

function doJump() {
  if (player.dead || !player.tryJump()) return;
  sfx.jump();
  effects.burst(player.position, 0xcfd8dc, 8, 0.2, 4);
}

function doFly() {
  if (player.dead || !player.tryFly()) return;
  sfx.fly();
  effects.burst(player.position, 0xe3f2fd, 14, 0.2, 5);
}

function doAlly() {
  if (player.dead || player.level < ALLY_LEVEL || !ally.summon(player.position)) return;
  sfx.poof();
  effects.burst(ally.mesh.position, 0xffcc88, 20, 0.3, 6);
  say('tode', t('say.friend'));
}

function doBomb() {
  if (player.dead || !player.tryBomb()) return;
  bombs.drop(player.position);
  sfx.bombDrop();
}

window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('mousedown', () => {
  mouseDown = true;
  if (state.over) restart();
});
window.addEventListener('mouseup', () => (mouseDown = false));
window.addEventListener('mousemove', (e) => {
  mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
});
$('pause-btn').addEventListener('mousedown', (e) => e.stopPropagation());
$('pause-btn').addEventListener('click', () => setPaused(!state.paused));

window.addEventListener(
  'wheel',
  (e) => {
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + Math.sign(e.deltaY) * 0.1));
    try {
      localStorage.setItem('zoom', zoom.toFixed(2));
    } catch {
      // storage can be unavailable; zoom still works
    }
  },
  { passive: true }
);

window.addEventListener('resize', () => {
  resizeIndicators($('indicators'));
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

resizeIndicators($('indicators'));

// Load assets
const enemyModel = await loadModel('/models/enemy.glb', 2);
const frogGreen = createFrogModel('green'); // Tode
const frogOrange = createFrogModel('orange'); // player 2 and the friend

const { obstacles, villages } = createMap(scene);
const griots = new Griots(scene, villages, obstacles);
createDecor(scene, obstacles);
// the villagers are motion-captured people dressed in boubous and wax
const { createPerson } = await import('./components/people.js');
const villagerPeople = [];
for (let i = 0; i < 12; i++) villagerPeople.push(await createPerson(i % 2 === 0 ? 'woman' : 'man', Math.floor(i / 2)));
const villagers = new Villagers(scene, villages, obstacles, villagerPeople);
const defense = new VillageDefense(villages);

const playerMesh = frogGreen.spawn();
addOutline(playerMesh); // outline the frog itself, before the outfits are attached
const player = new Player(playerMesh, frogGreen.radius);
scene.add(player.mesh);
const { createStage } = await import('./components/stage.js');
const cutStage = await createStage({ scene, player, createPerson }); // the opening scene in 3D

// Player 2: an orange cousin of the frog (local co-op)
const player2Mesh = frogOrange.spawn();
addOutline(player2Mesh, 0x5a2a05);
const player2 = new Player(player2Mesh, frogOrange.radius);
player2.controls = P2_CONTROLS;
player2.position.set(2, 0, 0);
player2.mesh.visible = false;
scene.add(player2.mesh);

// Floating "P1" / "P2" labels so it is always clear who is who in co-op
function createTag(text, color) {
  const tagCanvas = document.createElement('canvas');
  tagCanvas.width = 128;
  tagCanvas.height = 64;
  const g = tagCanvas.getContext('2d');
  g.fillStyle = color;
  g.beginPath();
  g.roundRect(4, 4, 120, 56, 18);
  g.fill();
  g.fillStyle = '#2b1b00';
  g.font = 'bold 36px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 64, 34);
  const texture = new THREE.CanvasTexture(tagCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.scale.set(1.6, 0.8, 1);
  sprite.position.y = 3.2;
  sprite.renderOrder = 10;
  sprite.visible = false;
  return sprite;
}
const tag1 = createTag('P1', '#ffd54f');
const tag2 = createTag('P2', '#ff9a4d');
player.mesh.add(tag1);
player2.mesh.add(tag2);

const bullets = new Bullets(scene);
const enemyBullets = new Bullets(scene, { color: 0xff3366, speed: 14, life: 3, blocked: true });
const enemies = new Enemies(scene, enemyModel);
const pickups = new Pickups(scene);
const effects = new Effects(scene);
const shake = new Shake();
setUnlockListener(() => sfx.upgrade());
const rhythm = new Rhythm($('rhythm'));
const weather = new Weather(scene);
const floaters = new FloatingTexts(scene);
const bombs = new Bombs(scene);
const ally = new Ally(scene, frogOrange);

// Debug: ?wave=5 and ?level=10 start at that wave / level
state.wave = Number(params.get('wave') || 1) - 1;
const startLevel = Number(params.get('level') || 1);
// Debug: ?spawn starts next to the first griot (to try the rhythm game)
if (params.has('spawn')) player.position.set(villages[0].x + 3, 0, villages[0].z - 3);
while (player.level < startLevel) player.addXp(player.xpNeeded);

const activePlayers = () => (state.coop ? [player, player2] : [player]);
const alivePlayers = () => activePlayers().filter((p) => !p.dead);

// Where new enemies appear: around the middle of the living players
function spawnCenter() {
  const alive = alivePlayers();
  const center = new THREE.Vector3();
  if (alive.length === 0) return center.copy(player.position);
  for (const p of alive) center.add(p.position);
  return center.multiplyScalar(1 / alive.length);
}

function waveDialogue(wave) {
  if (wave === 2) say('baobab', t('say.wave2'));
  if (wave === 2) say('baobab', t('say.raid'), 5);
  if (wave === 4) say('baobab', t('say.wave4'));
  if (wave % 4 === 3) say('baobab', t('say.storm'), 5);
  if (wave % 10 === 0) {
    say('queen', t('say.hornet.1'));
    say('baobab', t('say.hornet.2'));
  } else if (wave % 5 === 0) {
    say('queen', wave === 5 ? t('say.queen.5') : t('say.queen.n'));
    if (wave === 5) say('tode', t('say.tode.5'));
  }
}

function startWave() {
  state.wave++;
  state.waveActive = true;
  const wantedBiome = Math.floor((state.wave - 1) / 5) % BIOMES.length;
  if (wantedBiome !== biome) setBiome(wantedBiome, true);
  villagers.stopCheer(); // the party is over, hide!
  const base =
    state.wave <= 2 ? 2 + state.wave * 2 : (4 + state.wave * 3) * (1 + Math.min(0.9, state.wave * 0.035)); // gentle start, then more and more bees
  state.toSpawn = Math.round(base * DIFFICULTIES[state.difficulty].count);
  if (state.coop) state.toSpawn = Math.round(state.toSpawn * 1.5);
  state.spawnTimer = 0;
  state.villagersShouted = false;
  for (const v of defense.list) v.warned = false;
  state.hurtThisWave = false;
  state.stormWave = state.wave % 4 === 3;
  weather.setStorm(state.wave % 4 === 3); // the rainy season storm
  if (state.wave % 5 === 0) {
    enemies.spawnBoss(state.wave, spawnCenter(), state.wave % 10 === 0 ? 'hornet' : 'queen');
    sfx.boss();
    showBanner(t('banner.boss', { n: state.wave }));
  } else {
    showBanner(t('banner.wave', { n: state.wave }));
  }
  waveDialogue(state.wave);
  startQuest();
}

// A village asks Tode for help: keep its safety high during the wave
const QUEST_PCT = 60;
let quest = null;
function startQuest() {
  for (const v of defense.list) v.quest = false;
  quest = null;
  if (state.wave < 2 || state.wave % 5 === 0) return;
  const v = defense.randomStanding();
  if (!v) return;
  quest = { village: v, minSafety: v.safety };
  v.quest = true;
  showBanner(t('quest.start', { name: v.name, pct: QUEST_PCT }));
  say('village', t('quest.say'), 4);
}

function finishQuest() {
  if (!quest) return;
  const v = quest.village;
  v.quest = false;
  if (!v.fallen && quest.minSafety >= QUEST_PCT) {
    const pts = 50 + state.wave * 5;
    state.killPoints += pts;
    refreshScore();
    for (const p of activePlayers()) p.heal(p.maxHealth);
    sfx.upgrade();
    showBanner(t('quest.done', { name: v.name, pts }));
  } else {
    showBanner(t('quest.fail', { name: v.name }));
  }
  quest = null;
}

// Fallen players get back up between waves
function revivePlayers() {
  const alive = alivePlayers();
  if (alive.length === 0) return;
  for (const p of activePlayers()) {
    if (!p.dead) continue;
    p.dead = false;
    p.health = p.maxHealth * 0.5;
    p.mesh.visible = true;
    p.position.set(alive[0].position.x + 2, 0, alive[0].position.z + 1);
    effects.burst(p.position, 0x7dff9a, 24, 0.3, 7);
    sfx.pickup();
  }
}

function waveCleared() {
  state.waveActive = false;
  finishQuest();
  weather.setStorm(false);

  // achievements (checked before the villages are repaired)
  if (state.wave >= 10) unlock('marathon');
  if (!state.hurtThisWave && state.wave >= 3) unlock('untouchable');
  if (defense.list.every((v) => !v.fallen && v.safety >= 80)) unlock('village_hero');
  if (state.stormWave) unlock('storm_walker');
  if (state.coop) unlock('together');
  setBest('bestWave', state.wave);
  saveStats();
  const standing = defense.standing();
  if (standing.length > 0) {
    defense.repair(25);
    state.killPoints += VILLAGE_BONUS * standing.length;
    refreshScore();
    showBanner(t('banner.villages', { a: standing.length, b: defense.list.length, c: VILLAGE_BONUS * standing.length }));
  }
  // The villagers come out and run to cheer Tode
  const line = state.bossDown
    ? t('say.cheer.boss')
    : state.levelUpsThisWave > 0
      ? t('say.cheer.1')
      : t('say.cheer.2');
  celebrate(state.bossDown ? 18 : 14, line);
  say('griot', t(`tale.${((state.wave - 1) % 6) + 1}`), 6);
  party = state.bossDown ? 16 : 9;
  state.bossDown = false;
  state.levelUpsThisWave = 0;
  state.choosing = true;
  revivePlayers();
  state.options = pickUpgrades(player, 3);
  showUpgrades(state.options, chooseUpgrade);
}

function chooseUpgrade(index) {
  const upgrade = state.options[index];
  if (!state.choosing || !upgrade) return;
  for (const p of activePlayers()) upgrade.apply(p);
  state.upgradesTaken[upgrade.id] = (state.upgradesTaken[upgrade.id] || 0) + 1;
  state.choosing = false;
  state.nextWaveTimer = 7; // time for the villagers to celebrate
  mouseDown = false;
  sfx.upgrade();
  hideUpgrades();
}

function restart() {
  applyRandomMode();
  state.kills = [0, 0];
  if (biome !== 0) setBiome(0);
  state.over = false;
  state.paused = false;
  state.choosing = false;
  state.waveActive = false;
  state.score = 0;
  state.survivalTime = 0;
  state.killPoints = 0;
  state.combo = 0;
  state.wave = 0;
  state.toSpawn = 0;
  state.nextWaveTimer = 1;
  state.upgradesTaken = {};
  player.reset();
  player2.reset();
  player2.position.set(2, 0, 0);
  player2.mesh.visible = state.coop;
  enemies.clear();
  bullets.clear();
  enemyBullets.clear();
  pickups.clear();
  effects.clear();
  floaters.clear();
  bombs.clear();
  ally.dismiss();
  villagers.reset();
  defense.reset();
  quest = null;
  weather.reset();
  rhythm.reset();
  clearDialogue();
  hideUpgrades();
  $('paused').style.display = 'none';
  showGameOver(0, 0, false);
}

function gameOver(reason = 'died') {
  if (state.over) return;
  state.over = true;
  for (const p of activePlayers()) p.mesh.visible = true;
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(bestKey(), String(state.best));
  }
  addStat('games');
  addStat('seconds', state.survivalTime);
  setBest('bestWave', state.wave);
  setBest('bestScore', state.score);
  saveStats();
  sfx.gameOver();
  say('queen', reason === 'villages' ? t('say.over.villages') : t('say.over.queen'));
  setMusicMode('calm');
  showGameOver(state.score, state.wave, true, reason, state.coop ? state.kills : null);
}

function hurtPlayer(p, damage) {
  const before = p.health;
  p.hit(damage);
  if (p.health >= before) return;
  state.combo = 0;
  state.hurtThisWave = true;
  if (p === player) hurtFlash = 0.6;
  sfx.hurt();
  shake.add(0.35);
  floaters.spawn(p.position, `-${Math.round(before - p.health)}`, '#ff5252', 1.2);
  effects.burst(p.position, 0xff2222, 12, 0.2, 6);
  if (p.health <= 0 && !p.dead) {
    p.dead = true;
    p.mesh.visible = false;
    effects.burst(p.position, 0xff5252, 30, 0.35, 9);
    if (state.coop && alivePlayers().length > 0) say('tode', t('say.coop.down'));
  }
}

// Shadow clones: the queen splits into copies at 66% and 33% health.
function checkBossClones(e) {
  const ratio = e.health / e.maxHealth;
  const stage = ratio <= 0.33 ? 2 : ratio <= 0.66 ? 1 : 0;
  while (e.cloneStage < stage) {
    e.cloneStage++;
    const count = e.cloneStage === 1 ? 2 : 3;
    for (let k = 0; k < count; k++) {
      const clone = enemies.spawnClone(e, state.wave);
      effects.burst(clone.mesh.position, 0xcfe8ff, 25, 0.4, 6);
    }
    sfx.poof();
    say('queen', e.cloneStage === 1 ? t('say.clone.1') : t('say.clone.2'), 3);
  }
}

// Villagers hide in their huts during a wave and run out to cheer Tode when it is won
function updateVillagers(dt, time) {
  villagers.update(
    dt,
    time,
    enemies.list,
    effects,
    obstacles,
    () => {
      sfx.scream();
      if (!state.villagersShouted) {
        state.villagersShouted = true;
        say('village', t('say.cry'), 4);
      }
    },
    { hide: state.waveActive, focus: player.position }
  );
}

let hurtFlash = 0; // red edge of the screen when Tode is hit

// Slow-motion, falling petals and the orbiting camera of the village party
let slowmo = 0;
let bossCam = null;
let party = 0;
let partyTimer = 0;
const PETALS = [0xff6f91, 0xffc93c, 0xff9a3c, 0x7dff9a, 0xffffff];

// Daily challenge: the same random numbers for everybody on a given day
const nativeRandom = Math.random;
function seedRandom(seedText) {
  let a = 0;
  for (const ch of seedText) a = (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function bestKey() {
  return state.daily ? `best-daily-${todayKey()}` : `best-${state.difficulty}`;
}
function applyRandomMode() {
  if (state.daily) seedRandom(`tode-${todayKey()}`);
  else Math.random = nativeRandom;
  state.best = Number(localStorage.getItem(bestKey()) || 0);
}

// The villagers come out to cheer Tode, dancing to the sabar
function celebrate(seconds, line) {
  unlock('sabar_dance');
  villagers.cheer(seconds);
  sfx.cheer();
  if (line) say('village', line, 4);
}

// Lightning strikes a spot: big damage to bees around it
function lightningStrike(spot) {
  sfx.thunder();
  shake.add(0.5);
  effects.burst(spot.clone().setY(1), 0xf4f8ff, 40, 0.4, 12);
  effects.burst(spot.clone().setY(1), 0xffee77, 20, 0.3, 8);
  areaDamage(spot, 3.5, 4, 5);
}

// B key: hit the drum on the beat (only near a griot)
function beat() {
  const r = rhythm.press();
  if (!r) return;
  if (!r.hit) {
    sfx.drumMiss();
    return;
  }
  sfx.drumHit(r.perfect);
  if (r.streak >= 20) unlock('rhythm_master');
  effects.burst(player.position.clone().setY(1.5), 0xffd54f, r.perfect ? 12 : 5, 0.2, 5);
  if (r.streak % 6 === 0) {
    for (const p of activePlayers()) p.buffTime = 12;
    sfx.sabarPower();
    showBanner(t('banner.sabar'));
    say('griot', t('say.sabar'), 3);
  }
}

// A raider is attacking its village: the safety bar goes down.
function onRaid(e, dt) {
  const v = e.raid;
  if (v.fallen) return;
  const fell = defense.attack(v, dt, DIFFICULTIES[state.difficulty].damage);
  if (!v.warned) {
    v.warned = true;
    sfx.alarm();
    shake.add(0.15);
    say('village', t('say.attack', { name: v.name }), 3.5);
  }
  if (fell) villageFell(v);
}

function villageFell(v) {
  villagers.removeVillage(v.ref);
  effects.burst(v.pos.clone().setY(2), 0x333333, 60, 0.6, 10);
  effects.burst(v.pos.clone().setY(1), 0xff7722, 30, 0.4, 8);
  sfx.villageFall();
  shake.add(0.6);
  say('village', t('say.fall', { name: v.name }), 4);
  if (defense.standing().length === 0) gameOver('villages');
}

function levelUp() {
  const perk = [2, 3, 5, 6, 8, 10].includes(player.level) ? t(`perk.${player.level}`) : '';
  showBanner(t('banner.level', { n: player.level, perk }));
  sfx.levelUp();
  if (player.level >= 10) unlock('crowned');
  if (player.level === ALLY_LEVEL) say('baobab', t('say.levelup.friend'));
  effects.burst(player.position, 0xffd54f, 30, 0.3, 9);
  state.levelUpsThisWave = (state.levelUpsThisWave || 0) + 1; // celebrated when the wave is won
}

// Damages every enemy within `radius` of `center` and pushes them away.
function areaDamage(center, radius, damage, push, who = 0) {
  for (let j = enemies.list.length - 1; j >= 0; j--) {
    const e = enemies.list[j];
    const dx = e.mesh.position.x - center.x;
    const dz = e.mesh.position.z - center.z;
    const d = Math.hypot(dx, dz);
    if (d > radius + e.radius) continue;
    e.health -= damage;
    if (e.health <= 0) {
      killEnemy(e, j, who);
    } else {
      if (e.boss) checkBossClones(e);
      const k = (e.boss ? push * 0.3 : push) / (d || 1);
      e.mesh.position.x += dx * k;
      e.mesh.position.z += dz * k;
    }
  }
}

function explodeBomb(position) {
  const radius = player.hasCrown ? 7 : 5.5;
  effects.burst(position, 0xff8800, 50, 0.4, 12);
  effects.burst(position, 0xffee55, 25, 0.3, 8);
  sfx.explode();
  shake.add(0.45);
  areaDamage(position, radius, 5, 3);
}

function killEnemy(e, index, who = 0) {
  state.kills[who]++;
  if (player.addXp(Math.ceil(e.score / 5)) > 0) levelUp();
  state.combo++;
  state.comboTimer = 3;
  if ([5, 10, 20, 35].includes(state.combo)) {
    showBanner(t(`streak.${state.combo}`));
    sfx.upgrade();
    shake.add(0.2);
  }
  addStat('kills');
  unlock('first_blood');
  if (lifetime.kills >= 100) unlock('bee_hunter');
  if (state.combo >= 10) unlock('swarm_breaker');
  state.killPoints += SCORE_PER_KILL * multiplier();
  refreshScore();
  const center = e.mesh.position.clone().setY(e.centerY);
  floaters.spawn(center, `+${SCORE_PER_KILL * multiplier()}`, '#ffd54f', e.boss ? 1.8 : 1);
  shake.add(e.boss ? 0.9 : 0.05);
  if (e.boss) {
    effects.burst(center, 0xe040fb, 60, 0.5, 14);
    effects.burst(center, 0xff8800, 40, 0.4, 10);
    sfx.bossExplode();
    pickups.drop(e.mesh.position, 'spread');
  } else {
    effects.burst(center, 0xff5522, 16, 0.25, 8);
    sfx.explode();
    if (Math.random() < 0.25) pickups.drop(e.mesh.position, randomPickupType());
  }
  enemies.remove(index, true);
  if (e.boss) {
    for (const spot of enemies.removeClones()) effects.burst(spot, 0xcfe8ff, 25, 0.4, 6);
    say('baobab', t('say.bossdown'));
    unlock(e.kind === 'hornet' ? 'hornet_slayer' : 'queens_bane');
    state.bossDown = true; // celebrated when the wave is won
    slowmo = 1.4; // a short slow-motion on the final blow
    bossCam = center.clone();
  }
}

// Player 2 aims by itself at the nearest enemy
function nearestEnemyPoint(from) {
  let best = null;
  let bestDist = 30;
  for (const e of enemies.list) {
    const d = e.mesh.position.distanceTo(from);
    if (d < bestDist) {
      bestDist = d;
      best = e.mesh.position;
    }
  }
  return best;
}

function fireFrom(p, ambush) {
  // jumping or flying: the shots dive down towards the bees below
  const dive = p.position.y > 0.5 ? -Math.min(0.45, p.position.y / 10) : 0;
  for (const dir of p.shotDirections()) {
    const aim = dive ? dir.clone().setY(dive).normalize() : dir;
    bullets.fire(p.position, aim, p.damage * (ambush ? 3 : 1) * (p.buffTime > 0 ? 1.5 : 1), {
      pierce: p.pierce || ambush,
      explosive: p.explosive,
      size: ambush ? 2 : 1,
      owner: p,
    });
  }
  sfx.shoot();
  const muzzle = p.position.clone().setY(1.3);
  effects.burst(muzzle, 0xfff0a0, 2, 0.1, 2);
  p.shotFired();
}

function updatePlayers(dt) {
  // Player 1 aims with the mouse
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(groundPlane, aimPoint);
  // a stick (gamepad or touch) takes over the aim while it is pushed
  if (input.aim.active) {
    aimPoint.set(player.position.x + input.aim.x * 10, 0, player.position.z + input.aim.y * 10);
  }
  player.controls = state.coop ? P1_COOP_CONTROLS : P1_CONTROLS;

  // keyboard keys plus the left stick, as virtual WASD presses
  virtualKeys.clear();
  keys.forEach((k) => virtualKeys.add(k));
  if (input.move.x > 0.3) virtualKeys.add('KeyD');
  if (input.move.x < -0.3) virtualKeys.add('KeyA');
  if (input.move.y > 0.3) virtualKeys.add('KeyS');
  if (input.move.y < -0.3) virtualKeys.add('KeyW');

  if (state.auto) autopilot(virtualKeys);

  // abilities pressed on the gamepad or the touch buttons
  if (input.take('dash')) doDash(virtualKeys);
  if (input.take('jump')) doJump();
  if (input.take('fly')) doFly();
  if (input.take('ally')) doAlly();
  if (input.take('bomb')) doBomb();
  if (input.take('beat')) beat();

  if (!player.dead) {
    player.update(dt, virtualKeys, aimPoint, obstacles);
    if (player.justLanded) {
      player.justLanded = false;
      sfx.land();
      effects.burst(player.position, 0xcfd8dc, 24, 0.3, 9);
      shake.add(0.3);
      areaDamage(player.position, 4.5, 2, 4);
    }
    if (player.dashTime > 0) effects.burst(player.position, 0xaaffcc, 1, 0.25, 2);
    if ((mouseDown || keys.has('Space') || input.shoot || state.auto) && player.canShoot()) fireFrom(player, player.consumeAmbush());
  }

  if (state.coop && !player2.dead) {
    const target = nearestEnemyPoint(player2.position);
    aimPoint2.copy(target || player2.position.clone().addScaledVector(player2.aimDir, 5));
    const p2keys = state.remote ? remoteKeys : keys;
    if (state.remote) {
      remoteKeys.clear();
      if (remote.mx > 0.3) remoteKeys.add('ArrowRight');
      if (remote.mx < -0.3) remoteKeys.add('ArrowLeft');
      if (remote.my > 0.3) remoteKeys.add('ArrowDown');
      if (remote.my < -0.3) remoteKeys.add('ArrowUp');
      if (remote.dash) {
        remote.dash = false;
        if (player2.tryDash(remoteKeys)) {
          sfx.dash();
          effects.burst(player2.position, 0xffcc88, 10, 0.2, 4);
        }
      }
    }
    player2.update(dt, p2keys, aimPoint2, obstacles);
    if (player2.dashTime > 0) effects.burst(player2.position, 0xffcc88, 1, 0.25, 2);
    const p2shoot = state.remote ? remote.shoot : keys.has('Enter') || keys.has('NumpadEnter');
    if (p2shoot && player2.canShoot()) fireFrom(player2, false);

    // Keep the two players on the same screen
    if (!player.dead) {
      const dx = player2.position.x - player.position.x;
      const dz = player2.position.z - player.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 22) {
        player2.position.x = player.position.x + (dx / d) * 22;
        player2.position.z = player.position.z + (dz / d) * 22;
      }
    }
  }
}

function update(dt, time) {
  updatePlayers(dt);
  updateHint();
  // the sea starts at the beach
  for (const p of [player, player2]) {
    p.position.x = Math.max(-ISLAND_HALF, Math.min(ISLAND_HALF, p.position.x));
    p.position.z = Math.max(-ISLAND_HALF, Math.min(ISLAND_HALF, p.position.z));
  }

  // Survival reward: points for every second the player stays alive
  state.survivalTime += dt;
  refreshScore();

  // Combo expires if you stop killing
  if (state.combo > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }

  // Waves
  if (state.waveActive) {
    if (state.toSpawn > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        // from wave 2, some bees raid a village instead of hunting Tode
        const raidChance = Math.min(0.6, 0.1 + state.wave * 0.04);
        const raid = state.wave >= 3 && Math.random() < raidChance ? defense.randomStanding() : null;
        enemies.spawn(state.wave, spawnCenter(), raid);
        state.toSpawn--;
        state.spawnTimer = Math.max(0.3, (state.wave <= 2 ? 1.8 : 1.2) - state.wave * 0.08);
      }
    } else if (enemies.list.length === 0) {
      waveCleared();
    }
  } else if (!state.choosing) {
    state.nextWaveTimer -= dt;
    if (state.nextWaveTimer <= 0) startWave();
  }

  const targets = alivePlayers().map((p) => p.position);
  enemies.update(
    dt,
    targets,
    obstacles,
    (e, dir) => {
      enemyBullets.fire(e.mesh.position, dir, e.shotDamage ?? e.damage);
      sfx.enemyShoot();
    },
    time,
    onRaid
  );
  setMusicMode(enemies.list.some((e) => e.boss) ? 'boss' : state.waveActive ? 'battle' : 'calm');
  bombs.update(dt, explodeBomb);
  ally.update(
    dt,
    player.position,
    enemies.list,
    bullets,
    () => sfx.shoot(),
    (spot) => effects.burst(spot, 0xffcc88, 20, 0.3, 6)
  );
  bullets.update(dt, obstacles);
  enemyBullets.update(dt, obstacles);

  // Player bullets vs enemies
  const splashes = [];
  for (let i = bullets.list.length - 1; i >= 0; i--) {
    const b = bullets.list[i];
    for (let j = enemies.list.length - 1; j >= 0; j--) {
      const e = enemies.list[j];
      if (b.hit.has(e)) continue;
      const center = e.mesh.position.clone().setY(e.centerY);
      if (b.mesh.position.distanceTo(center) < e.radius + 0.4 * b.mesh.scale.x) {
        effects.burst(b.mesh.position, 0xffdd33, 4, 0.15, 5);
        floaters.spawn(center, Math.round(b.damage * 10) / 10, '#ffffff', 0.7);
        e.flash = 0.12;
        b.hit.add(e);
        const who = b.owner === player2 ? 1 : 0;
        if (b.explosive) splashes.push({ at: b.mesh.position.clone(), who });
        e.health -= b.damage;
        if (e.health <= 0) killEnemy(e, j, who);
        else {
          sfx.hit();
          if (e.boss) checkBossClones(e);
        }
        if (!b.pierce) {
          bullets.remove(i);
          break;
        }
      }
    }
  }
  for (const s of splashes) {
    effects.burst(s.at, 0xff8800, 14, 0.25, 7);
    areaDamage(s.at, 2.5, 1, 2, s.who);
  }

  const alive = alivePlayers();

  // Enemy bullets vs players
  for (let i = enemyBullets.list.length - 1; i >= 0; i--) {
    const b = enemyBullets.list[i];
    for (const p of alive) {
      const dx = b.mesh.position.x - p.position.x;
      const dz = b.mesh.position.z - p.position.z;
      if (Math.hypot(dx, dz) < p.radius + 0.3) {
        hurtPlayer(p, b.damage);
        enemyBullets.remove(i);
        break;
      }
    }
  }

  // Enemies touching players (they pass underneath while a player is airborne)
  for (const e of enemies.list) {
    for (const p of alive) {
      const dx = e.mesh.position.x - p.position.x;
      const dz = e.mesh.position.z - p.position.z;
      if (!p.airborne && Math.hypot(dx, dz) < e.radius + p.radius) hurtPlayer(p, e.damage);
    }
  }
  if (alivePlayers().length === 0) gameOver();

  updateVillagers(dt, time);

  defense.update(dt);
  if (quest) quest.minSafety = Math.min(quest.minSafety, quest.village.safety);
  // burning villages smoke
  for (const v of defense.list) {
    if (v.fallen && Math.random() < dt * 3) effects.burst(v.pos.clone().setY(2), 0x2b2b2b, 3, 0.45, 2);
  }

  // Griots heal nearby players
  const blessing = griots.update(
    dt,
    time,
    alivePlayers(),
    effects,
    () =>
      say(
        'griot',
        t(`say.griot.${1 + Math.floor(Math.random() * 2)}`)
      ),
    (p, step) => p.heal(2 * step),
    (i) => !defense.list[i].fallen
  );

  rhythm.update(dt, blessing && !player.dead, {
    onBreak: () => sfx.drumMiss(),
  });
  if (player.buffTime > 0 && Math.random() < dt * 8) {
    effects.burst(player.position.clone().setY(2), 0xffd54f, 1, 0.2, 2);
  }

  pickups.update(
    dt,
    time,
    alivePlayers().map((p) => p.position),
    (type, who) => {
      const p = alivePlayers()[who];
      sfx.pickup();
      if (type === 'health') {
        p.heal(30);
        floaters.spawn(p.position, '+30', '#7dff9a', 1.1);
      } else p.setWeapon(type);
    }
  );
  effects.update(dt);
  floaters.update(dt);

  updateRadar({
    radar: $('radar'),
    indicators: $('indicators'),
    camera,
    center: spawnCenter(),
    players: [[player, '#ffd54f'], ...(state.coop ? [[player2, '#ff9a4d']] : [])].filter(([p]) => !p.dead),
    enemies: enemies.list,
    pickups: pickups.list,
    villages: defense.list,
  });

  if (player.ambushReady && !state.ambushWasReady) sfx.ambushReady();
  state.ambushWasReady = player.ambushReady;

  updateHud({
    health: player.health,
    maxHealth: player.maxHealth,
    score: state.score,
    wave: Math.max(1, state.wave),
    best: state.best,
    weapon: player.weapon,
    weaponTime: player.weaponTime,
    boss: enemies.list.find((e) => e.boss),
    combo: state.combo,
    multiplier: multiplier(),
    level: player.level,
    xp: player.xp,
    xpNeeded: player.xpNeeded,
    abilities: {
      dash: { unlock: 1, cd: player.dashCd },
      jump: { unlock: JUMP_LEVEL, cd: player.jumpCd },
      ally: { unlock: ALLY_LEVEL, cd: ally.cd, active: ally.active, time: ally.time },
      bomb: { unlock: BOMB_LEVEL, cd: player.bombCd },
      fly: { unlock: FLY_LEVEL, cd: player.flyCd, active: player.flyTime > 0, time: player.flyTime },
    },
    ambush: player.level < AMBUSH_LEVEL ? 'locked' : player.ambushReady ? 'ready' : 'charging',
    p2: state.coop ? { health: player2.health, maxHealth: player2.maxHealth, dead: player2.dead } : null,
    blessing,
    buffTime: player.buffTime,
  });
  updateVillages(defense.list);
  $('left').textContent = state.waveActive ? t('left.line', { n: enemies.list.length + state.toSpawn }) : '';
  hurtFlash = Math.max(0, hurtFlash - dt);
  const lowHealth = player.health / player.maxHealth < 0.3 && !player.dead ? 0.35 + 0.2 * Math.sin(time * 6) : 0;
  $('hurt').style.opacity = String(Math.max(hurtFlash * 1.4, lowHealth));
  $('kills').textContent = state.coop ? t('kills.line', { a: state.kills[0], b: state.kills[1] }) : '';
}

// Title screen options
function chooseOption(attr, value, apply) {
  document.querySelectorAll(`[data-${attr}]`).forEach((b) => {
    b.classList.toggle('selected', b.dataset[attr] === value);
    if (!b.dataset.bound) {
      b.dataset.bound = '1';
      b.addEventListener('click', () => apply(b.dataset[attr]));
    }
  });
}

function selectDifficulty(name) {
  state.difficulty = name;
  enemies.difficulty = DIFFICULTIES[name];
  state.best = Number(localStorage.getItem(bestKey()) || 0);
  localStorage.setItem('difficulty', name);
  chooseOption('diff', name, selectDifficulty);
}

function refreshHelp() {
  $('help').textContent = t(state.coop ? 'help.coop' : 'help.solo');
}

function selectMode(value) {
  state.coop = value === '2';
  player2.mesh.visible = state.coop;
  tag1.visible = tag2.visible = state.coop;
  refreshHelp();
  localStorage.setItem('mode', value);
  chooseOption('mode', value, selectMode);
}

function selectOutfit(name) {
  player.setOutfit(name);
  localStorage.setItem('outfit', name);
  chooseOption('outfit', name, selectOutfit);
}

function showTitle() {
  state.started = false;
  document.body.classList.remove('playing');
  $('radar').style.display = 'none';
  $('indicators').style.display = 'none';
  restart();
  $('title').style.display = 'flex';
}

function beginGame() {
  applyRandomMode();
  if (state.daily) showBanner(t('banner.daily'));
  state.started = true;
  document.body.classList.add('playing');
  $('radar').style.display = 'block';
  $('indicators').style.display = 'block';
  if (state.coop) {
    say('baobab', t('say.intro.p1'), 5);
    say('baobab', t('say.intro.p2'), 5);
  } else {
    say('baobab', t('say.intro.solo'), 5);
  }
}

let pendingDaily = false;
$('btn-daily').addEventListener('click', () => {
  pendingDaily = true;
  $('play').click();
});
$('play').addEventListener('click', () => {
  state.daily = pendingDaily;
  pendingDaily = false;
  $('title').style.display = 'none';
  startMusic();
  if (params.has('trailer')) {
    state.auto = true;
    document.body.classList.add('trailer');
    beginGame();
    return;
  }
  // The opening scene: two villagers talk about the bees, then Tode hops in
  playCutscene(
    beginGame,
    (event) => {
      if (event === 'line') sfx.hit();
      if (event === 'enter') sfx.levelUp();
    },
    cutStage
  );
});

const saved = (key, fallback, allowed) => {
  const value = localStorage.getItem(key);
  return allowed.includes(value) ? value : fallback;
};
selectDifficulty(saved('difficulty', 'normal', Object.keys(DIFFICULTIES)));
selectMode(saved('mode', '1', ['1', '2']));
selectOutfit(saved('outfit', 'none', ['none', 'boubou', 'wax', 'sahel']));
$('play').disabled = false;
$('play').dataset.i18n = 'play';
onLangChange(refreshHelp);
initMenus({ onShake: (on) => (shake.enabled = on) });
initTouch(input);
applyI18n();
if (params.get('join')) startGuest(params.get('join'));

// ---------- First-minutes hints (only the very first game) ----------
const hint = { step: localStorage.getItem('tode-tutorial') ? 3 : 0, start: null };
function updateHint() {
  const el = $('hint');
  if (state.guest || state.auto || hint.step >= 3 || state.wave > 2) {
    if (hint.step < 3 && state.wave > 2) finishHint();
    el.style.display = 'none';
    return;
  }
  const touch = document.body.classList.contains('touch');
  if (!hint.start) hint.start = player.position.clone();
  let key = 'hint.move';
  if (hint.step === 0 && player.position.distanceTo(hint.start) > 4) hint.step = 1;
  if (hint.step === 1) {
    key = 'hint.shoot';
    if (state.kills[0] >= 2) hint.step = 2;
  }
  if (hint.step === 2) {
    key = 'hint.dash';
    if (player.dashTime > 0) return finishHint();
  }
  el.textContent = t(touch ? `${key}.touch` : key);
  el.style.display = 'block';
}

function finishHint() {
  hint.step = 3;
  $('hint').style.display = 'none';
  try {
    localStorage.setItem('tode-tutorial', '1');
  } catch {
    // fine
  }
}

// ---------- Trailer mode: ?trailer lets Tode play by himself, with title cards ----------
// Use it to record the video: http://localhost:5173/?trailer&level=8&wave=3
function autopilot(keySet) {
  let target = null;
  let best = 1e9;
  for (const e of enemies.list) {
    const d = e.mesh.position.distanceTo(player.position);
    const score = d - (e.raid && !e.raid.fallen ? 10 : 0); // raiders first: save the villages
    if (score < best) {
      best = score;
      target = e;
    }
  }
  if (!target) return;
  const dx = target.mesh.position.x - player.position.x;
  const dz = target.mesh.position.z - player.position.z;
  const d = Math.hypot(dx, dz) || 1;
  aimPoint.copy(target.mesh.position);
  const away = d < 7;
  const toward = d > 13;
  if (away || toward) {
    const sign = away ? -1 : 1;
    keySet.add(dz * sign > 0 ? 'KeyS' : 'KeyW');
    keySet.add(dx * sign > 0 ? 'KeyD' : 'KeyA');
  } else {
    keySet.add(Math.sin(performance.now() / 2500) > 0 ? 'KeyD' : 'KeyA'); // strafe
  }
  const roll = Math.random();
  if (d < 4 && roll < 0.03) doDash(keySet);
  if (player.level >= JUMP_LEVEL && d < 5 && roll > 0.99) doJump();
  if (player.level >= BOMB_LEVEL && enemies.list.length > 5 && roll > 0.992) doBomb();
  if (player.level >= ALLY_LEVEL && roll < 0.004) doAlly();
  if (player.level >= FLY_LEVEL && roll > 0.998) doFly();
}

const TRAILER = [
  [0, 1],
  [4, 2],
  [11, 3],
  [19, 4],
  [26, 5],
  [33, 6],
  [40, 7],
];
let trailerTime = 0;
let trailerCue = -1;
function trailerStep(dt) {
  if (!state.auto || !state.started) return;
  trailerTime += dt;
  const card = $('trailer-card');
  let cue = -1;
  TRAILER.forEach(([at], i) => {
    if (trailerTime >= at) cue = i;
  });
  if (cue === trailerCue) return;
  trailerCue = cue;
  const n = TRAILER[cue][1];
  card.style.opacity = 0;
  setTimeout(() => {
    card.textContent = t(`trailer.${n}`);
    card.style.opacity = 1;
  }, 350);
  if (n === 4) {
    enemies.spawnBoss(10, spawnCenter(), 'hornet');
    sfx.boss();
  }
  if (n === 5) weather.setStorm(true);
  if (n === 6) {
    weather.setStorm(false);
    celebrate(8, t('say.cheer.boss'));
    party = 8;
  }
}

// ---------- Online co-op ----------
// Host: the friend plays the orange frog. The game picture is streamed to him.
let netTimer = 0;
function hostSend(dt) {
  if (!state.remote || !isConnected()) return;
  netTimer -= dt;
  if (netTimer > 0) return;
  netTimer = 0.25;
  send({
    t: 'hud',
    wave: Math.max(1, state.wave),
    score: state.score,
    kills: state.kills,
    hp: [player.health / player.maxHealth, player2.health / player2.maxHealth],
    dead: player2.dead,
    over: state.over,
    final: $('final').textContent,
    started: state.started,
  });
}

function setupHost() {
  const link = $('online-link');
  const status = $('online-status');
  link.value = '';
  $('online-start').disabled = true;
  status.textContent = t('online.creating');
  $('online-overlay').classList.add('open');
  hooks.banner = (text) => send({ t: 'banner', text });
  hooks.say = (who, text, seconds) => send({ t: 'say', who, text, seconds });
  hostGame({
    onJoin: () => {
      status.textContent = t('online.joined');
      $('online-start').disabled = false;
      // a lower resolution keeps the video light
      renderer.setPixelRatio(Math.min(1, 1280 / window.innerWidth));
      renderer.setSize(window.innerWidth, window.innerHeight);
      const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...audioStream().getAudioTracks()]);
      streamTo(stream);
    },
    onData: (msg) => {
      if (msg.t === 'in') {
        remote.mx = msg.mx;
        remote.my = msg.my;
        remote.shoot = !!msg.shoot;
      } else if (msg.t === 'dash') remote.dash = true;
    },
    onLeave: () => {
      if (!state.remote) {
        status.textContent = t('online.waiting');
        $('online-start').disabled = true;
        return;
      }
      state.remote = false;
      selectMode('1');
      showBanner(t('online.left'));
    },
  })
    .then((url) => {
      link.value = url;
      status.textContent = t('online.waiting');
    })
    .catch(() => (status.textContent = t('online.error')));
}

$('btn-online').addEventListener('click', setupHost);
$('online-close').addEventListener('click', () => {
  $('online-overlay').classList.remove('open');
  if (!state.remote) {
    closeNet();
    hooks.banner = hooks.say = null;
  }
});
$('online-copy').addEventListener('click', async () => {
  const url = $('online-link').value;
  if (!url) return;
  try {
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) await navigator.share({ url });
    else await navigator.clipboard.writeText(url);
  } catch {
    $('online-link').select();
    document.execCommand('copy');
  }
  $('online-copy').textContent = t('online.copied');
  setTimeout(() => ($('online-copy').textContent = t('online.copy')), 1500);
});
$('online-start').addEventListener('click', () => {
  $('online-overlay').classList.remove('open');
  state.remote = true;
  selectMode('2');
  $('play').click();
});

// Guest: this page shows the host's video and sends the controls.
let guestTimer = 0;
function guestSend(dt) {
  guestTimer -= dt;
  if (input.take('dash')) send({ t: 'dash' });
  if (guestTimer > 0) return;
  guestTimer = 0.05;
  const left = keys.has('KeyA') || keys.has('KeyQ') || keys.has('ArrowLeft');
  const right = keys.has('KeyD') || keys.has('ArrowRight');
  const up = keys.has('KeyW') || keys.has('KeyZ') || keys.has('ArrowUp');
  const down = keys.has('KeyS') || keys.has('ArrowDown');
  let mx = (right ? 1 : 0) - (left ? 1 : 0);
  let my = (down ? 1 : 0) - (up ? 1 : 0);
  if (input.move.x || input.move.y) {
    mx = input.move.x;
    my = input.move.y;
  }
  const shoot = mouseDown || keys.has('Space') || keys.has('Enter') || input.shoot;
  send({ t: 'in', mx, my, shoot });
}

function startGuest(hostId) {
  state.guest = true;
  document.body.classList.add('guest', 'playing');
  $('title').style.display = 'none';
  const status = $('guest-status');
  const video = $('guest-video');
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) send({ t: 'dash' });
  });
  $('guest-join').addEventListener('click', () => {
    $('guest-join').disabled = true;
    status.textContent = t('guest.connecting');
    joinGame(hostId, {
      onOpen: () => (status.textContent = t('guest.waiting')),
      onVideo: (stream) => {
        video.srcObject = stream;
        video.play().catch(() => {});
        $('guest-panel').style.display = 'none';
        $('guest-hud').style.display = 'block';
      },
      onData: (msg) => {
        if (msg.t === 'banner') showBanner(msg.text);
        else if (msg.t === 'say') say(msg.who, msg.text, msg.seconds);
        else if (msg.t === 'hud') showGuestHud(msg);
      },
      onClose: () => {
        $('guest-panel').style.display = 'block';
        $('guest-join').disabled = true;
        status.textContent = t('guest.lost');
      },
      onError: () => {
        $('guest-join').disabled = false;
        status.textContent = t('online.error');
      },
    });
  });
}

function showGuestHud(m) {
  const pct = Math.max(0, Math.round(m.hp[1] * 100));
  $('guest-hud').innerHTML =
    `<div>${t('guest.hud', { wave: m.wave, score: m.score })}</div>` +
    `<div>${t('guest.kills', { a: m.kills[1], b: m.kills[0] })}</div>` +
    `<div class="bar health"><div style="width:${pct}%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#ff8a50,#ffb74d)"></div></div>` +
    (m.over ? `<div style="margin-top:6px;color:#ff8a80">${m.final}</div>` : '');
}

// Adaptive quality: if the frame rate stays low, render at a lower resolution
const QUALITY = [Math.min(window.devicePixelRatio, 2), 1.25, 1, 0.8];
let qualityLevel = 0;
let frameSum = 0;
let frameCount = 0;
function watchQuality(dt) {
  frameSum += dt;
  frameCount++;
  if (frameSum < 3 || state.remote) return;
  const fps = frameCount / frameSum;
  frameSum = 0;
  frameCount = 0;
  if (fps < 38 && qualityLevel < QUALITY.length - 1 && state.started) {
    qualityLevel++;
    renderer.setPixelRatio(QUALITY[qualityLevel]);
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (qualityLevel >= 2) {
      sun.castShadow = false;
    }
  }
}

// Debug: ?debug exposes the game state in the console (window.__tode)
if (params.has('debug')) {
  window.__tode = { state, player, player2, enemies, defense, villagers, cutStage, keys, input, step: (dt, time) => update(dt, time), pick: (i) => chooseUpgrade(i), begin: () => beginGame(), restart: () => restart(), setDiff: (n) => selectDifficulty(n) };
}

// Debug: ?people shows two motion-captured villagers next to Tode (clip with ?clip=talk1)
const peopleList = [];
if (params.has('people')) {
  const clipName = params.get('clip') || 'idle';
  for (const [kind, x, yaw] of [['man', -1.4, Math.PI / 2], ['woman', 1.4, -Math.PI / 2]]) {
    const person = await createPerson(kind, 0);
    person.group.position.set(params.has('front') ? x / 2 : x, 0, 4);
    person.group.rotation.y = params.has('front') ? 0 : yaw;
    scene.add(person.group);
    person.play(clipName);
    peopleList.push(person);
  }
  window.__people = peopleList;
}

// Game loop
const clock = new THREE.Clock();
camera.position.copy(cameraOffset());
const cameraTarget = new THREE.Vector3();
const cameraBase = camera.position.clone();
const shakeOffset = new THREE.Vector3();
// Gamepad navigation of the menus: A confirms, B and X pick the other upgrade cards
function padNavigation() {
  if (input.take('btnA')) {
    if ($('cutscene').style.display === 'block') $('cutscene').click();
    else if ($('title').style.display !== 'none' && !isMenuOpen()) $('play').click();
    else if (state.over) restart();
    else if (state.choosing) chooseUpgrade(0);
  }
  if (state.choosing) {
    if (input.take('btnB')) chooseUpgrade(1);
    if (input.take('btnX')) chooseUpgrade(2);
  }
  if (state.over && input.take('btnY')) showTitle();
  for (const name of ['btnA', 'btnB', 'btnX', 'btnY']) input.pressed.delete(name);
}

function animate() {
  requestAnimationFrame(animate);
  pollGamepad(input);
  const rawDt = Math.min(clock.getDelta(), 0.05);
  if (state.guest) {
    guestSend(rawDt);
    return; // the friend only watches the video
  }
  hostSend(rawDt);
  trailerStep(rawDt);
  for (const person of peopleList) person.mixer.update(rawDt);
  if (input.take('pause')) setPaused(!state.paused);
  padNavigation();
  watchQuality(rawDt);
  let dt = rawDt;
  if (slowmo > 0) {
    slowmo -= rawDt;
    dt = rawDt * 0.25;
  }
  if (party > 0 && state.started) {
    party -= rawDt;
    partyTimer -= rawDt;
    if (partyTimer <= 0) {
      partyTimer = 0.12;
      const c = player.position;
      const spot = new THREE.Vector3(c.x + (Math.random() - 0.5) * 12, 5 + Math.random() * 3, c.z + (Math.random() - 0.5) * 12);
      effects.burst(spot, PETALS[Math.floor(Math.random() * PETALS.length)], 6, 0.18, 2);
    }
  }
  const time = clock.elapsedTime;
  if (state.started && !state.paused && !state.over && !state.choosing) update(dt, time);
  else {
    for (const name of ['dash', 'jump', 'fly', 'ally', 'bomb', 'beat']) input.pressed.delete(name);
  }
  if (state.started && !state.paused && !state.over && state.choosing) {
    // while Tode picks an upgrade the villagers already run out to cheer him
    updateVillagers(dt, time);
    effects.update(dt);
  }

  // Visuals that keep running even when paused: follow the middle of the living players
  cameraTarget.copy(spawnCenter());
  // Debug: ?village looks at the first village
  if (params.has('village')) cameraTarget.set(villages[0].x, 0, villages[0].z);
  const strike = weather.update(dt, cameraTarget, enemies.list);
  if (strike && state.started && !state.paused && !state.over && !state.choosing) lightningStrike(strike);
  setRain(state.started ? weather.intensity : 0);
  dayNight.update(time + timeOffset, weather.intensity, weather.flash);
  if (state.auto) zoom = 1.35 + 0.3 * Math.sin(time * 0.25);
  const orbit = party > 0 ? Math.sin(time * 0.5) * 0.45 : state.auto ? Math.sin(time * 0.18) * 0.35 : 0;
  const offset = cameraOffset().applyAxisAngle(new THREE.Vector3(0, 1, 0), orbit);
  if (slowmo > 0) offset.multiplyScalar(0.8); // zoom in on the final blow
  if (party > 0) offset.multiplyScalar(0.62); // come closer to see everybody dance
  cameraBase.lerp(cameraTarget.clone().add(offset), 0.1);
  ground.material.color.lerp(groundTarget, 0.02);
  shake.update(dt);
  camera.position.copy(cameraBase).add(shake.offset(shakeOffset));
  camera.lookAt(cameraTarget);
  cutStage.update(rawDt, camera);
  if (cutStage.active || cutStage.leaving > 0) cameraBase.copy(camera.position);
  if (params.has('people')) {
    if (params.has('front')) {
      camera.position.set(window.__camx ?? 0, window.__camy ?? 1.62, window.__camz ?? 5.3);
      camera.lookAt(window.__camx ?? 0, window.__camy ?? 1.6, 4);
    } else {
      camera.position.set(0, 1.5, 6.6);
      camera.lookAt(0, 1.1, 4);
    }
  }
  sun.position.copy(cameraTarget).add(new THREE.Vector3(10, 20, 10));
  sun.target.position.copy(cameraTarget);
  lantern.position.copy(cameraTarget).setY(4);

  coast.update(time);
  renderer.render(scene, camera);
}
animate();
