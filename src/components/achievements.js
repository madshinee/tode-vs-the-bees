import { t } from './i18n.js';
import { iconSvg } from './icons.js';

// Achievements and lifetime stats, saved in the browser.
const ACH_KEY = 'tode-achievements';
const STATS_KEY = 'tode-stats';

export const ACHIEVEMENTS = [
  { id: 'first_blood', icon: 'bee' },
  { id: 'bee_hunter', icon: 'target' },
  { id: 'swarm_breaker', icon: 'burst' },
  { id: 'village_hero', icon: 'people' },
  { id: 'untouchable', icon: 'shield' },
  { id: 'queens_bane', icon: 'crown' },
  { id: 'hornet_slayer', icon: 'bolt' },
  { id: 'crowned', icon: 'crown' },
  { id: 'rhythm_master', icon: 'drum' },
  { id: 'storm_walker', icon: 'bolt' },
  { id: 'marathon', icon: 'boots' },
  { id: 'sabar_dance', icon: 'drum' },
];

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage can be unavailable; the game still works
  }
}

const unlocked = load(ACH_KEY, {});
export const stats = { kills: 0, games: 0, seconds: 0, bestWave: 0, bestScore: 0, ...load(STATS_KEY, {}) };

let onUnlock = () => {};

// Called with the achievement id each time one is unlocked (to play a sound).
export function setUnlockListener(fn) {
  onUnlock = fn;
}

export const isUnlocked = (id) => !!unlocked[id];

export function saveStats() {
  save(STATS_KEY, stats);
}

export function addStat(name, amount = 1) {
  stats[name] += amount;
}

export function setBest(name, value) {
  if (value > stats[name]) stats[name] = value;
}

export function unlock(id) {
  if (unlocked[id]) return;
  unlocked[id] = Date.now();
  save(ACH_KEY, unlocked);
  saveStats();
  showToast(id);
  onUnlock(id);
}

function showToast(id) {
  const root = document.getElementById('toasts');
  if (!root) return;
  const info = ACHIEVEMENTS.find((a) => a.id === id);
  const toast = document.createElement('div');
  toast.className = 'toast glass';
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.innerHTML = iconSvg(info.icon);
  const body = document.createElement('div');
  const small = document.createElement('small');
  small.textContent = t('ach.unlocked');
  const name = document.createElement('b');
  name.textContent = t(`ach.${id}.name`);
  body.append(small, name);
  toast.append(icon, body);
  root.append(toast);
  setTimeout(() => toast.classList.add('out'), 4200);
  setTimeout(() => toast.remove(), 4800);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min ${Math.floor(seconds % 60)} s`;
}

// Draws the achievements list and the stats inside the achievements screen.
export function renderAchievements() {
  const statsEl = document.getElementById('ach-stats');
  const listEl = document.getElementById('ach-list');
  const rows = [
    ['ach.kills', stats.kills],
    ['ach.games', stats.games],
    ['ach.time', formatTime(stats.seconds)],
    ['ach.bestwave', stats.bestWave],
    ['ach.bestscore', stats.bestScore],
  ];
  statsEl.replaceChildren(
    ...rows.map(([key, value]) => {
      const row = document.createElement('div');
      const label = document.createElement('small');
      label.textContent = t(key);
      const v = document.createElement('b');
      v.textContent = value;
      row.append(label, v);
      return row;
    })
  );
  listEl.replaceChildren(
    ...ACHIEVEMENTS.map((a) => {
      const card = document.createElement('div');
      card.className = `ach-card${unlocked[a.id] ? ' done' : ''}`;
      const icon = document.createElement('span');
      icon.className = 'ach-icon';
      icon.innerHTML = iconSvg(a.icon);
      const body = document.createElement('div');
      const name = document.createElement('b');
      name.textContent = t(`ach.${a.id}.name`);
      const desc = document.createElement('small');
      desc.textContent = t(`ach.${a.id}.desc`);
      body.append(name, desc);
      card.append(icon, body);
      return card;
    })
  );
}
