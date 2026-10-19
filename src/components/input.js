// Gamepad and touch input, merged into one "virtual input" that the game reads
// next to the keyboard and mouse.
const DEADZONE = 0.25;

export class VirtualInput {
  constructor() {
    this.padMove = { x: 0, y: 0 };
    this.padAim = { x: 0, y: 0, active: false };
    this.padShoot = false;
    this.touchMove = { x: 0, y: 0 };
    this.touchAim = { x: 0, y: 0, active: false };
    this.touchShoot = false;
    // the merged values the game uses
    this.move = { x: 0, y: 0 };
    this.aim = { x: 0, y: 0, active: false };
    this.shoot = false;
    // buttons pressed since they were last taken (dash, jump, bomb, ally, fly, beat, pause, btnA...)
    this.pressed = new Set();
  }

  press(name) {
    this.pressed.add(name);
  }

  // True once for each press.
  take(name) {
    return this.pressed.delete(name);
  }

  merge() {
    const padMoving = this.padMove.x !== 0 || this.padMove.y !== 0;
    this.move = padMoving ? this.padMove : this.touchMove;
    this.aim = this.padAim.active ? this.padAim : this.touchAim;
    this.shoot = this.padShoot || this.touchShoot;
  }
}

// Standard gamepad layout: left stick moves, right stick aims, RT or A shoots,
// B dash, X jump, Y bomb, LB friend, RB fly, LT drum beat, Start pause.
const BUTTONS = {
  0: ['btnA'],
  1: ['btnB', 'dash'],
  2: ['btnX', 'jump'],
  3: ['btnY', 'bomb'],
  4: ['ally'],
  5: ['fly'],
  6: ['beat'],
  9: ['pause'],
};
const previous = {};

export function pollGamepad(input) {
  const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
  const pad = pads.find((p) => p && p.connected);
  input.padMove = { x: 0, y: 0 };
  input.padAim = { x: 0, y: 0, active: false };
  input.padShoot = false;
  if (!pad) {
    input.merge();
    return;
  }
  const dead = (v) => (Math.abs(v || 0) < DEADZONE ? 0 : v);
  input.padMove = { x: dead(pad.axes[0]), y: dead(pad.axes[1]) };
  const ax = dead(pad.axes[2]);
  const ay = dead(pad.axes[3]);
  input.padAim = { x: ax, y: ay, active: Math.hypot(ax, ay) > 0.3 };
  input.padShoot = (pad.buttons[7]?.value ?? 0) > 0.3 || !!pad.buttons[0]?.pressed;

  for (const [index, names] of Object.entries(BUTTONS)) {
    const down = !!pad.buttons[index]?.pressed;
    if (down && !previous[index]) names.forEach((n) => input.press(n));
    previous[index] = down;
  }
  input.merge();
}
