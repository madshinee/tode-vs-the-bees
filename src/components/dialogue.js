import { hooks } from './net.js';
import { iconSvg } from './icons.js';
import { t } from './i18n.js';

// Little speech bubbles that tell the story. They never pause the game.
const SPEAKERS = {
  baobab: { icon: 'tree', color: '#d9a45c' },
  tode: { icon: 'frog', color: '#7dff9a' },
  griot: { icon: 'drum', color: '#ff8a65' },
  village: { icon: 'people', color: '#80deea' },
  queen: { icon: 'crown', color: '#ffd54f' },
};

const queue = [];
let timer = null;

function box() {
  return document.getElementById('dialogue');
}

function next() {
  const item = queue.shift();
  if (!item) {
    timer = null;
    box().style.display = 'none';
    return;
  }
  const s = SPEAKERS[item.speaker];
  const el = box();
  el.style.borderColor = s.color;
  el.querySelector('.icon').innerHTML = iconSvg(s.icon);
  const name = el.querySelector('.name');
  name.textContent = t('who.' + item.speaker);
  name.style.color = s.color;
  el.querySelector('.text').textContent = item.text;
  el.style.display = 'flex';
  timer = setTimeout(next, item.seconds * 1000);
}

export function say(speaker, text, seconds = 4) {
  hooks.say?.(speaker, text, seconds);
  if (queue.length > 4) queue.shift();
  queue.push({ speaker, text, seconds });
  if (!timer) next();
}

export function clearDialogue() {
  queue.length = 0;
  clearTimeout(timer);
  timer = null;
  box().style.display = 'none';
}
