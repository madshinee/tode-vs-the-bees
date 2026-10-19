import { t } from './i18n.js';

// Opening scene: a man and a woman talk about the bees (in Wolof, with subtitles in the
// player's language), then Tode hops in and the game begins.
const LINES = [
  {
    who: 'man',
    mood: 'alarm',
    name: 'Mamadou',
    wolof: 'Salaam aleekum, Awa! Dafa metti... les abeilles ñëw nañu ci dëkk bi!',
    key: 'cut.1',
  },
  {
    who: 'woman',
    mood: 'alarm',
    name: 'Awa',
    wolof: 'Maleekum salaam, Mamadou! Yàlla! Daw, dugg ci kër gi!',
    key: 'cut.2',
  },
  {
    who: 'man',
    mood: 'alarm',
    name: 'Mamadou',
    wolof: 'Lu ñuy def? Ñuy dem fu?',
    key: 'cut.3',
  },
  {
    who: 'woman',
    mood: 'alarm',
    name: 'Awa',
    wolof: 'Kaay, Tode! Wallu nu, Tode!',
    key: 'cut.4',
  },
  {
    who: 'tode',
    mood: 'relief',
    name: 'Tode',
    wolof: 'Maa ngi fi! Jàmm rekk, dinaa leen wallu.',
    key: 'cut.5',
  },
];

const $ = (id) => document.getElementById(id);

// onEvent(name) lets the game play sounds: 'line' for every line, 'enter' when Tode arrives.
export function playCutscene(onDone, onEvent = () => {}, stage = null) {
  const root = $('cutscene');
  const bubble = $('cut-bubble');
  const wolofEl = $('cut-wolof');
  const englishEl = $('cut-english');
  const nameEl = $('cut-name');
  const frog = $('cut-frog');
  const man = $('cut-man');
  const woman = $('cut-woman');

  let index = -1;
  let typing = null;
  let finished = false;
  let waiting = false; // true while Tode is hopping in

  root.style.display = 'block';
  if (stage) {
    document.body.classList.add('cut3d');
    stage.start();
  }
  frog.classList.remove('enter');
  bubble.style.opacity = 0;

  function finish() {
    if (finished) return;
    finished = true;
    clearInterval(typing);
    window.removeEventListener('keydown', onKey, true);
    root.removeEventListener('click', advance);
    $('cut-skip').removeEventListener('click', skip);
    root.style.display = 'none';
    if (stage) {
      document.body.classList.remove('cut3d');
      stage.finish();
    }
    onDone();
  }

  function skip(e) {
    e?.stopPropagation();
    finish();
  }

  function showLine(line) {
    onEvent('line');
    stage?.line(line);
    // the speaker talks and gestures, the other one listens and reacts
    for (const [el, who] of [[man, 'man'], [woman, 'woman']]) {
      el.classList.toggle('talking', line.who === who);
      el.classList.toggle('listening', line.who !== who);
      el.classList.toggle('alarmed', line.mood === 'alarm');
      el.classList.toggle('relieved', line.mood === 'relief');
    }
    frog.classList.toggle('talking', line.who === 'tode');
    bubble.className = `cut-bubble ${line.who}`;
    bubble.style.opacity = 1;
    nameEl.textContent = line.who === 'tode' ? t('who.tode') : line.name;
    englishEl.textContent = t(line.key);
    englishEl.style.opacity = 0;
    wolofEl.textContent = '';
    let i = 0;
    clearInterval(typing);
    typing = setInterval(() => {
      i++;
      wolofEl.textContent = line.wolof.slice(0, i);
      if (i >= line.wolof.length) {
        clearInterval(typing);
        typing = null;
        englishEl.style.opacity = 1;
      }
    }, 28);
  }

  function advance() {
    if (finished || waiting) return;
    // first click completes the typing, the next one moves on
    if (typing && index >= 0) {
      clearInterval(typing);
      typing = null;
      wolofEl.textContent = LINES[index].wolof;
      englishEl.style.opacity = 1;
      return;
    }
    index++;
    if (index >= LINES.length) {
      waiting = true;
      bubble.style.opacity = 0;
      return;
    }
    showLine(LINES[index]);
    // Tode's line: he hops in while talking
    if (LINES[index].who === 'tode') {
      frog.classList.add('enter');
      stage?.enter();
      onEvent('enter');
    }
  }

  function onKey(e) {
    if (e.code === 'Escape') {
      e.stopPropagation(); // do not also pause the game that starts right after
      skip();
    } else if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      advance();
    }
  }

  window.addEventListener('keydown', onKey, true);
  root.addEventListener('click', advance);
  $('cut-skip').addEventListener('click', skip);

  // After Tode's last line, wait a moment and start the game
  const poll = setInterval(() => {
    if (finished) clearInterval(poll);
    else if (waiting) {
      clearInterval(poll);
      setTimeout(finish, 600);
    }
  }, 100);

  advance();
}
