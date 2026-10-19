// Sound effects synthesized with the Web Audio API (no audio files needed).
let ctx;
let sfxMaster = null;
let sfxVolume = 1;
let musicVolume = 1;

// Every sound effect goes through one master gain so the volume can be set.
function out() {
  const c = ac();
  if (!sfxMaster) {
    sfxMaster = c.createGain();
    sfxMaster.gain.value = sfxVolume;
    sfxMaster.connect(c.destination);
  }
  return sfxMaster;
}

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq, end = freq, dur = 0.15, type = 'square', vol = 0.08, delay = 0 }) {
  const c = ac();
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(end, 1), t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(out());
  osc.start(t);
  osc.stop(t + dur);
}

function noise(dur, vol = 0.2) {
  const c = ac();
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  const gain = c.createGain();
  gain.gain.value = vol;
  src.buffer = buffer;
  src.connect(gain).connect(out());
  src.start();
}

export const sfx = {
  shoot: () => tone({ freq: 700, end: 200, dur: 0.1, vol: 0.05 }),
  hit: () => tone({ freq: 300, end: 120, dur: 0.06, type: 'sawtooth', vol: 0.05 }),
  explode: () => noise(0.35, 0.25),
  bossExplode: () => noise(1, 0.45),
  dash: () => tone({ freq: 300, end: 900, dur: 0.15, type: 'sine', vol: 0.08 }),
  enemyShoot: () => tone({ freq: 500, end: 250, dur: 0.12, type: 'triangle', vol: 0.06 }),
  upgrade: () => {
    tone({ freq: 400, end: 600, dur: 0.1, type: 'sine', vol: 0.1 });
    tone({ freq: 600, end: 800, dur: 0.1, type: 'sine', vol: 0.1, delay: 0.1 });
    tone({ freq: 800, end: 1200, dur: 0.15, type: 'sine', vol: 0.1, delay: 0.2 });
  },
  jump: () => tone({ freq: 200, end: 600, dur: 0.25, type: 'sine', vol: 0.1 }),
  land: () => {
    noise(0.2, 0.25);
    tone({ freq: 120, end: 40, dur: 0.2, type: 'sine', vol: 0.15 });
  },
  bombDrop: () => tone({ freq: 800, end: 600, dur: 0.08, type: 'square', vol: 0.06 }),
  levelUp: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, end: f * 1.02, dur: 0.18, type: 'square', vol: 0.08, delay: i * 0.09 })
    );
  },
  fly: () => tone({ freq: 250, end: 700, dur: 0.4, type: 'triangle', vol: 0.1 }),
  ambushReady: () => tone({ freq: 900, end: 1100, dur: 0.1, type: 'sine', vol: 0.06 }),
  poof: () => {
    noise(0.3, 0.2);
    tone({ freq: 700, end: 150, dur: 0.25, type: 'sine', vol: 0.08 });
  },
  hurt: () => tone({ freq: 220, end: 60, dur: 0.25, type: 'sawtooth', vol: 0.12 }),
  // sabar drum for the rhythm game
  drumHit: (perfect) => {
    tone({ freq: perfect ? 260 : 200, end: 80, dur: 0.14, type: 'triangle', vol: 0.18 });
    noise(0.06, perfect ? 0.18 : 0.1);
  },
  drumMiss: () => tone({ freq: 90, end: 50, dur: 0.15, type: 'sine', vol: 0.12 }),
  sabarPower: () => {
    [392, 523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, end: f * 1.03, dur: 0.16, type: 'triangle', vol: 0.1, delay: i * 0.07 })
    );
  },
  thunder: () => {
    noise(1.4, 0.5);
    tone({ freq: 70, end: 28, dur: 1.2, type: 'sawtooth', vol: 0.2 });
  },
  // a village is under attack
  alarm: () => {
    tone({ freq: 880, end: 880, dur: 0.14, type: 'square', vol: 0.07 });
    tone({ freq: 660, end: 660, dur: 0.14, type: 'square', vol: 0.07, delay: 0.17 });
    tone({ freq: 880, end: 880, dur: 0.14, type: 'square', vol: 0.07, delay: 0.34 });
  },
  villageFall: () => {
    noise(0.8, 0.35);
    tone({ freq: 200, end: 40, dur: 1.1, type: 'sawtooth', vol: 0.18 });
  },
  // villagers shouting in fear
  scream: () => {
    tone({ freq: 900, end: 450, dur: 0.3, type: 'sawtooth', vol: 0.04 });
    tone({ freq: 1100, end: 600, dur: 0.25, type: 'triangle', vol: 0.04, delay: 0.08 });
  },
  // sabar drum roll and joyful cries when the villagers celebrate
  cheer: () => {
    for (let i = 0; i < 10; i++) {
      tone({ freq: i % 3 === 0 ? 220 : 340, end: 90, dur: 0.09, type: 'triangle', vol: 0.12, delay: i * 0.11 });
    }
    tone({ freq: 380, end: 560, dur: 0.18, type: 'triangle', vol: 0.1, delay: 0.2 });
    tone({ freq: 700, end: 1250, dur: 0.4, type: 'sine', vol: 0.07, delay: 0.3 });
    tone({ freq: 900, end: 1500, dur: 0.4, type: 'sine', vol: 0.06, delay: 0.55 });
  },
  pickup: () => {
    tone({ freq: 500, end: 900, dur: 0.12, type: 'sine', vol: 0.1 });
    tone({ freq: 900, end: 1300, dur: 0.12, type: 'sine', vol: 0.1, delay: 0.1 });
  },
  boss: () => {
    tone({ freq: 90, end: 50, dur: 0.8, type: 'sawtooth', vol: 0.2 });
    tone({ freq: 120, end: 60, dur: 0.8, type: 'square', vol: 0.1, delay: 0.3 });
  },
  gameOver: () => {
    tone({ freq: 400, end: 100, dur: 0.8, type: 'sawtooth', vol: 0.15 });
    tone({ freq: 300, end: 60, dur: 1, type: 'sawtooth', vol: 0.15, delay: 0.3 });
  },
};

// ---- Background music: a West African-inspired groove (mbalax style) ----
// 12 steps per bar (12/8 feel). Instruments, all synthesized:
//  - kora: plucked arpeggio on a pentatonic scale
//  - gungung: deep bass drum
//  - sabar: sharp hand-drum slaps (filtered noise)
//  - tama: "talking drum" with a pitch bend
// Moods: calm (between waves), battle (during waves), boss (faster, minor).
const MUSIC_VOLUME = 0.3;
const MAJOR_PENTATONIC = [0, 2, 4, 7, 9];
const MINOR_PENTATONIC = [0, 3, 5, 7, 10];
const KORA_PATTERN = [0, 2, 4, 5, 4, 2, 1, 3, 4, 6, 4, 3];
const BASS_ROOTS = [0, 0, 5, 7]; // D, D, G, A (one per bar)
const GUNGUNG_STEPS = [0, 6];
const SABAR_STEPS = [0, 2, 3, 5, 6, 8, 9, 11];
const TAMA_STEPS = [2, 7, 10];
const D3 = 146.83;

let musicGain;
let noiseBuffer;
let musicTimer = null;
let musicMode = 'calm';
let musicMuted = false;
let step = 0;
let nextTime = 0;

const stepLength = () => (musicMode === 'boss' ? 0.11 : musicMode === 'battle' ? 0.14 : 0.18);
const freqOf = (semitones) => D3 * 2 ** (semitones / 12);

function env(node, when, attack, peak, dur) {
  node.gain.setValueAtTime(0.0001, when);
  node.gain.exponentialRampToValueAtTime(peak, when + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, when + dur);
}

function kora(freq, when, vol) {
  const c = ac();
  const gain = c.createGain();
  env(gain, when, 0.005, vol, 0.45);
  gain.connect(musicGain);
  for (const [type, mult, level] of [['triangle', 1, 1], ['sine', 2, 0.35]]) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq * mult;
    g.gain.value = level;
    osc.connect(g).connect(gain);
    osc.start(when);
    osc.stop(when + 0.5);
  }
}

function gungung(when, vol) {
  const c = ac();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(130, when);
  osc.frequency.exponentialRampToValueAtTime(48, when + 0.25);
  env(gain, when, 0.005, vol, 0.35);
  osc.connect(gain).connect(musicGain);
  osc.start(when);
  osc.stop(when + 0.4);
}

function sabar(when, vol, pitch) {
  const c = ac();
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  src.buffer = noiseBuffer;
  filter.type = 'bandpass';
  filter.frequency.value = pitch;
  filter.Q.value = 3;
  env(gain, when, 0.002, vol, 0.09);
  src.connect(filter).connect(gain).connect(musicGain);
  src.start(when);
  src.stop(when + 0.12);
}

function tama(when, vol, high) {
  const c = ac();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'triangle';
  const base = high ? 420 : 300;
  osc.frequency.setValueAtTime(base, when);
  osc.frequency.exponentialRampToValueAtTime(base * (high ? 0.6 : 1.5), when + 0.14);
  env(gain, when, 0.005, vol, 0.2);
  osc.connect(gain).connect(musicGain);
  osc.start(when);
  osc.stop(when + 0.25);
}

function scheduleStep(n, when) {
  const bar = Math.floor(n / 12);
  const i = n % 12;
  const root = BASS_ROOTS[bar % 4];
  const scale = musicMode === 'boss' ? MINOR_PENTATONIC : MAJOR_PENTATONIC;

  // kora arpeggio (every step in battle/boss, every other step when calm)
  if (musicMode !== 'calm' || i % 2 === 0) {
    const idx = KORA_PATTERN[i];
    const semis = scale[idx % 5] + 12 * Math.floor(idx / 5) + root;
    kora(freqOf(semis + 12), when, musicMode === 'calm' ? 0.16 : 0.2);
  }
  if (musicMode === 'boss' && i % 3 === 0) kora(freqOf(root + 24), when, 0.12);

  // gungung bass drum
  if (GUNGUNG_STEPS.includes(i) || (musicMode === 'boss' && i % 3 === 0)) {
    gungung(when, musicMode === 'calm' ? 0.4 : 0.7);
  }

  // shaker-like ticks when calm; sabar patterns and tama when fighting
  if (musicMode === 'calm') {
    if (i % 3 === 0) sabar(when, 0.12, 6000);
  } else {
    if (SABAR_STEPS.includes(i)) sabar(when, i % 3 === 0 ? 0.4 : 0.25, i % 2 ? 2200 : 1500);
    if (TAMA_STEPS.includes(i)) tama(when, 0.3, i === 7);
  }
}

// The sound as a stream, so the online friend can hear the game too.
let streamDest = null;
export function audioStream() {
  const c = ac();
  if (!streamDest) {
    streamDest = c.createMediaStreamDestination();
    out().connect(streamDest);
    if (musicGain) musicGain.connect(streamDest);
  }
  return streamDest.stream;
}

export function startMusic() {
  if (musicTimer) return;
  const c = ac();
  musicGain = c.createGain();
  musicGain.gain.value = musicMuted ? 0 : MUSIC_VOLUME * musicVolume;
  musicGain.connect(c.destination);
  if (streamDest) musicGain.connect(streamDest);
  nextTime = c.currentTime + 0.1;
  musicTimer = setInterval(() => {
    while (nextTime < c.currentTime + 0.25) {
      scheduleStep(step++, nextTime);
      nextTime += stepLength();
    }
  }, 80);
}

export function setMusicMode(mode) {
  musicMode = mode;
}

// Returns true if the music is now on.
export function toggleMusic() {
  musicMuted = !musicMuted;
  if (musicGain) musicGain.gain.value = musicMuted ? 0 : MUSIC_VOLUME * musicVolume;
  return !musicMuted;
}

// Volumes from 0 to 1 (settings screen).
export function setVolumes({ music = musicVolume, sfx: effects = sfxVolume }) {
  musicVolume = music;
  sfxVolume = effects;
  if (musicGain) musicGain.gain.value = musicMuted ? 0 : MUSIC_VOLUME * musicVolume;
  if (sfxMaster) sfxMaster.gain.value = sfxVolume;
}

// ---- Rain: a loop of filtered noise whose volume follows the storm ----
let rainGain = null;

export function setRain(level) {
  if (level <= 0.01 && !rainGain) return;
  const c = ac();
  if (!rainGain) {
    const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1500;
    rainGain = c.createGain();
    rainGain.gain.value = 0;
    src.connect(filter).connect(rainGain).connect(out());
    src.start();
  }
  rainGain.gain.value = level * 0.12;
}
