import { t } from './i18n.js';

// Sabar rhythm mini-game: near a griot, drum notes slide toward a target and the
// player presses B on the beat. Hits build a streak; every 6 in a row grants
// "Sabar power" (faster and stronger).
const WIDTH = 420;
const HEIGHT = 96;
const BEAT = 0.6; // seconds between steps
const TRAVEL = 2; // seconds a note takes to reach the target
const ZONE_X = 70;
const HIT_WINDOW = 0.2;
const PERFECT_WINDOW = 0.08;
const PATTERN = [1, 0, 1, 1, 0, 1, 1, 0]; // a syncopated 8-step groove

export class Rhythm {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.notes = [];
    this.timer = 0;
    this.step = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.message = '';
    this.messageTime = 0;
    this.active = false;
    this.pulse = 0;
  }

  reset() {
    this.notes.length = 0;
    this.streak = 0;
    this.timer = 0;
    this.step = 0;
    this.message = '';
    this.setActive(false);
  }

  setActive(on) {
    this.active = on;
    this.canvas.classList.toggle('on', on);
  }

  // Called every frame. `near` is true while the player is next to a griot.
  // handlers: { onMiss(), onBreak() } are optional.
  update(dt, near, handlers = {}) {
    if (near !== this.active) {
      if (!near) {
        this.notes.length = 0;
        this.streak = 0;
      } else {
        this.timer = 0.4;
        this.step = 0;
      }
      this.setActive(near);
    }
    if (!this.active) return;

    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer += BEAT;
      if (PATTERN[this.step % PATTERN.length]) this.notes.push({ age: 0, hit: false });
      this.step++;
      this.pulse = 1;
    }
    this.pulse = Math.max(0, this.pulse - dt * 4);
    this.messageTime = Math.max(0, this.messageTime - dt);

    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i];
      n.age += dt;
      if (!n.hit && n.age > TRAVEL + HIT_WINDOW) {
        // missed it
        if (this.streak > 0) handlers.onBreak?.(this.streak);
        this.streak = 0;
        this.say('miss');
        this.notes.splice(i, 1);
      } else if (n.hit && n.age > TRAVEL + 0.4) {
        this.notes.splice(i, 1);
      }
    }
    this.draw();
  }

  say(text) {
    this.message = text;
    this.messageTime = 0.7;
  }

  // The player pressed the beat key. Returns { hit, perfect, streak } or null if inactive.
  press() {
    if (!this.active) return null;
    let best = null;
    let bestDiff = HIT_WINDOW;
    for (const n of this.notes) {
      if (n.hit) continue;
      const diff = Math.abs(n.age - TRAVEL);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = n;
      }
    }
    if (!best) {
      this.streak = 0;
      this.say('miss');
      return { hit: false, perfect: false, streak: 0 };
    }
    best.hit = true;
    best.age = TRAVEL; // freeze it on the target
    const perfect = bestDiff < PERFECT_WINDOW;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.say(perfect ? 'perfect' : 'good');
    return { hit: true, perfect, streak: this.streak };
  }

  draw() {
    const g = this.g;
    g.clearRect(0, 0, WIDTH, HEIGHT);
    g.fillStyle = 'rgba(18, 14, 10, 0.7)';
    g.beginPath();
    g.roundRect(0, 0, WIDTH, HEIGHT, 18);
    g.fill();
    g.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    g.lineWidth = 2;
    g.stroke();

    const laneY = 54;
    g.strokeStyle = 'rgba(255, 213, 79, 0.35)';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(14, laneY);
    g.lineTo(WIDTH - 14, laneY);
    g.stroke();

    // target
    g.strokeStyle = '#ffd54f';
    g.lineWidth = 4 + this.pulse * 3;
    g.beginPath();
    g.arc(ZONE_X, laneY, 24 + this.pulse * 3, 0, Math.PI * 2);
    g.stroke();

    // notes (little sabar drums)
    for (const n of this.notes) {
      const x = ZONE_X + ((TRAVEL - n.age) / TRAVEL) * (WIDTH - ZONE_X - 24);
      g.globalAlpha = n.hit ? Math.max(0, 1 - (n.age - TRAVEL) * 2.5) : 1;
      g.fillStyle = n.hit ? '#7dff9a' : '#c9892b';
      g.beginPath();
      g.arc(x, laneY, n.hit ? 20 : 16, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#6b3f1d';
      g.lineWidth = 3;
      g.stroke();
      g.fillStyle = '#f1d9a8';
      g.beginPath();
      g.arc(x, laneY, 7, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;

    g.fillStyle = '#fff8ec';
    g.font = 'bold 14px "Segoe UI", sans-serif';
    g.textAlign = 'left';
    g.fillText(t('rhythm.title'), 16, 22);
    g.textAlign = 'right';
    g.fillStyle = '#ffd54f';
    g.fillText(t('rhythm.streak', { n: this.streak }), WIDTH - 16, 22);
    if (this.messageTime > 0) {
      g.globalAlpha = Math.min(1, this.messageTime * 2);
      g.textAlign = 'center';
      g.font = 'bold 20px "Segoe UI", sans-serif';
      g.fillStyle = this.message === 'miss' ? '#ff8a80' : '#7dff9a';
      g.fillText(t(`rhythm.${this.message}`), ZONE_X, 92);
      g.globalAlpha = 1;
    }
  }
}
