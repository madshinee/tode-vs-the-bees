import { iconSvg } from './icons.js';

// On-screen controls for phones and tablets: a left stick to move, a right stick
// to aim (and shoot while touched), and buttons for the abilities.
export const isTouchDevice = () =>
  window.matchMedia('(pointer: coarse)').matches || new URLSearchParams(location.search).has('touch');

const BUTTONS = [
  ['dash', 'dash'],
  ['jump', 'jump'],
  ['bomb', 'bomb'],
  ['ally', 'people'],
  ['fly', 'wings'],
  ['beat', 'drum'],
];

function makeStick(side, onChange) {
  const stick = document.createElement('div');
  stick.className = `stick ${side}`;
  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  stick.append(thumb);
  let id = null;
  let origin = null;
  const radius = 55;

  const update = (e) => {
    let dx = e.clientX - origin.x;
    let dy = e.clientY - origin.y;
    const d = Math.hypot(dx, dy);
    if (d > radius) {
      dx = (dx / d) * radius;
      dy = (dy / d) * radius;
    }
    thumb.style.transform = `translate(${dx}px, ${dy}px)`;
    onChange(dx / radius, dy / radius, true);
  };

  stick.addEventListener('pointerdown', (e) => {
    if (id !== null) return;
    id = e.pointerId;
    stick.setPointerCapture(id);
    const rect = stick.getBoundingClientRect();
    origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    update(e);
    e.preventDefault();
  });
  stick.addEventListener('pointermove', (e) => {
    if (e.pointerId === id) update(e);
  });
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    thumb.style.transform = 'translate(0, 0)';
    onChange(0, 0, false);
  };
  stick.addEventListener('pointerup', end);
  stick.addEventListener('pointercancel', end);
  return stick;
}

export function initTouch(input) {
  if (!isTouchDevice()) return;
  document.body.classList.add('touch');
  const root = document.createElement('div');
  root.id = 'touch';

  root.append(
    makeStick('left', (x, y) => {
      input.touchMove = { x, y };
      input.merge();
    }),
    makeStick('right', (x, y, active) => {
      input.touchAim = { x, y, active: active && Math.hypot(x, y) > 0.2 };
      input.touchShoot = input.touchAim.active; // aiming with the right stick also shoots
      input.merge();
    })
  );

  const buttons = document.createElement('div');
  buttons.className = 'tbuttons';
  for (const [name, icon] of BUTTONS) {
    const b = document.createElement('button');
    b.className = 'tbtn';
    b.dataset.btn = name;
    b.innerHTML = iconSvg(icon);
    b.addEventListener('pointerdown', (e) => {
      input.press(name);
      e.preventDefault();
    });
    buttons.append(b);
  }
  root.append(buttons);
  document.body.append(root);
}
