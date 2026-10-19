import { LOCALES } from './locales.js';

// Language support (English / French). Static page texts carry data-i18n
// attributes; texts built by the code use t('key', { values }).
const STORAGE_KEY = 'tode-lang';
const listeners = [];
let lang = 'en';

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved in LOCALES) lang = saved; // English by default; French is a choice in the settings
} catch {
  // storage can be unavailable; English is used
}

export const getLang = () => lang;

export function t(key, values = {}) {
  const text = LOCALES[lang][key] ?? LOCALES.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => (name in values ? values[name] : `{${name}}`));
}

// Fills every element that has data-i18n (text), data-i18n-html (trusted markup) or
// data-i18n-title (tooltip).
export function applyI18n(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll('[data-i18n-html]').forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  root.querySelectorAll('[data-i18n-title]').forEach((el) => (el.title = t(el.dataset.i18nTitle)));
}

export function setLang(next) {
  if (!(next in LOCALES)) return;
  lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore
  }
  applyI18n();
  listeners.forEach((fn) => fn(lang));
}

// Called whenever the language changes (to redraw texts built by the code).
export function onLangChange(fn) {
  listeners.push(fn);
}
