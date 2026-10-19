import * as THREE from 'three';

// Screen shake: add "trauma" when something big happens; the camera shakes
// harder the more trauma there is, and it fades away by itself.
export class Shake {
  constructor() {
    this.trauma = 0;
    this.enabled = true;
  }

  add(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
  }

  // Writes a random camera offset into `target` and returns it.
  offset(target) {
    const s = this.enabled ? this.trauma * this.trauma * 0.9 : 0;
    return target.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s * 0.6, (Math.random() - 0.5) * s);
  }
}

// Numbers and words that float up from where something happened
// ("12" on a hit, "+10" on a kill, "-10" when Tode is hurt).
const textMaterials = new Map();

function textMaterial(text, color) {
  const key = `${text}|${color}`;
  if (!textMaterials.has(key)) {
    const c = document.createElement('canvas');
    c.width = 192;
    c.height = 96;
    const g = c.getContext('2d');
    g.font = 'bold 56px "Segoe UI", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 9;
    g.strokeStyle = 'rgba(20, 10, 0, 0.85)';
    g.strokeText(text, 96, 50);
    g.fillStyle = color;
    g.fillText(text, 96, 50);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    textMaterials.set(key, new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  }
  return textMaterials.get(key);
}

export class FloatingTexts {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
  }

  spawn(position, text, color = '#ffffff', size = 1) {
    if (this.list.length > 40) this.remove(0); // never flood the screen
    const sprite = new THREE.Sprite(textMaterial(String(text), color).clone());
    sprite.scale.set(1.8 * size, 0.9 * size, 1);
    sprite.position.copy(position);
    sprite.position.y += 1.6;
    sprite.position.x += (Math.random() - 0.5) * 0.8;
    sprite.renderOrder = 20;
    this.scene.add(sprite);
    this.list.push({ sprite, life: 0.9 });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      f.life -= dt;
      f.sprite.position.y += dt * 2.2;
      f.sprite.material.opacity = Math.min(1, f.life * 2.5);
      if (f.life <= 0) this.remove(i);
    }
  }

  remove(i) {
    const f = this.list[i];
    this.scene.remove(f.sprite);
    f.sprite.material.dispose();
    this.list.splice(i, 1);
  }

  clear() {
    for (let i = this.list.length - 1; i >= 0; i--) this.remove(i);
  }
}
