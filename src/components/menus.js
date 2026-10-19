import { setVolumes } from './audio.js';
import { setLang, getLang, applyI18n, onLangChange } from './i18n.js';
import { renderAchievements } from './achievements.js';

// The Settings and Achievements screens (opened from the title and pause screens).
const KEY = 'tode-settings';
const $ = (id) => document.getElementById(id);

export const settings = { music: 80, sfx: 80, shake: true };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem(KEY)) ?? {});
} catch {
  // keep the defaults
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

const overlays = ['settings-overlay', 'ach-overlay'];

export function isMenuOpen() {
  return overlays.some((id) => $(id).classList.contains('open'));
}

export function closeMenus() {
  overlays.forEach((id) => $(id).classList.remove('open'));
}

function open(id) {
  closeMenus();
  $(id).classList.add('open');
}

function refreshButtons() {
  document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('selected', b.dataset.lang === getLang()));
  document
    .querySelectorAll('[data-shake]')
    .forEach((b) => b.classList.toggle('selected', (b.dataset.shake === 'on') === settings.shake));
}

// onShake(enabled) tells the game when screen shake is switched on or off.
export function initMenus({ onShake }) {
  $('set-music').value = settings.music;
  $('set-sfx').value = settings.sfx;
  setVolumes({ music: settings.music / 100, sfx: settings.sfx / 100 });
  onShake(settings.shake);

  $('set-music').addEventListener('input', (e) => {
    settings.music = Number(e.target.value);
    setVolumes({ music: settings.music / 100 });
    persist();
  });
  $('set-sfx').addEventListener('input', (e) => {
    settings.sfx = Number(e.target.value);
    setVolumes({ sfx: settings.sfx / 100 });
    persist();
  });
  document.querySelectorAll('[data-lang]').forEach((b) =>
    b.addEventListener('click', () => {
      setLang(b.dataset.lang);
      refreshButtons();
    })
  );
  document.querySelectorAll('[data-shake]').forEach((b) =>
    b.addEventListener('click', () => {
      settings.shake = b.dataset.shake === 'on';
      onShake(settings.shake);
      persist();
      refreshButtons();
    })
  );

  for (const id of ['btn-settings', 'btn-settings-pause']) $(id).addEventListener('click', () => open('settings-overlay'));
  $('btn-achievements').addEventListener('click', () => {
    renderAchievements();
    open('ach-overlay');
  });
  $('settings-close').addEventListener('click', closeMenus);
  $('ach-close').addEventListener('click', closeMenus);
  onLangChange(() => {
    if ($('ach-overlay').classList.contains('open')) renderAchievements();
  });
  applyI18n();
  refreshButtons();
}
