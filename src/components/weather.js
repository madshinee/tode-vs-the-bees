import * as THREE from 'three';

// Rainy season (hivernage): rain, darker skies and lightning that strikes
// the bees. Storms come on some waves; the rest of the time the sky is clear.
const DROPS = 700;
const BOX = 64; // rain falls in a box this wide around the camera target
const HEIGHT = 30;

export class Weather {
  constructor(scene) {
    this.scene = scene;
    this.intensity = 0; // 0 = clear, 1 = full storm
    this.target = 0;
    this.flash = 0; // lightning flash, fades out quickly
    this.strikeTimer = 5;
    this.bolt = null;
    this.boltLife = 0;

    this.positions = new Float32Array(DROPS * 6);
    this.drops = [];
    for (let i = 0; i < DROPS; i++) {
      this.drops.push({
        x: (Math.random() - 0.5) * BOX,
        y: Math.random() * HEIGHT,
        z: (Math.random() - 0.5) * BOX,
        speed: 26 + Math.random() * 10,
      });
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.material = new THREE.LineBasicMaterial({
      color: 0xbcd4ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rain = new THREE.LineSegments(geometry, this.material);
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);
  }

  setStorm(on) {
    this.target = on ? 1 : 0;
    if (on) this.strikeTimer = 4 + Math.random() * 3;
  }

  get stormy() {
    return this.intensity > 0.05;
  }

  // `center` is where the camera looks. `candidates` are the enemies lightning may hit.
  // Returns the point struck by lightning this frame, or null.
  update(dt, center, candidates) {
    this.intensity += (this.target - this.intensity) * Math.min(1, dt * 0.8);
    this.flash = Math.max(0, this.flash - dt * 4);
    this.rain.visible = this.stormy;
    this.material.opacity = this.intensity * 0.55;

    if (this.stormy) {
      this.rain.position.set(center.x, 0, center.z);
      for (let i = 0; i < DROPS; i++) {
        const d = this.drops[i];
        d.y -= d.speed * dt;
        if (d.y < 0) {
          d.y = HEIGHT;
          d.x = (Math.random() - 0.5) * BOX;
          d.z = (Math.random() - 0.5) * BOX;
        }
        const o = i * 6;
        this.positions[o] = d.x;
        this.positions[o + 1] = d.y;
        this.positions[o + 2] = d.z;
        this.positions[o + 3] = d.x + 0.25; // wind-blown streak
        this.positions[o + 4] = d.y - 0.9;
        this.positions[o + 5] = d.z;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }

    // the visible bolt fades quickly
    if (this.bolt) {
      this.boltLife -= dt;
      this.bolt.material.opacity = Math.max(0, this.boltLife * 5);
      if (this.boltLife <= 0) {
        this.scene.remove(this.bolt);
        this.bolt.geometry.dispose();
        this.bolt = null;
      }
    }

    if (this.target > 0 && this.intensity > 0.6) {
      this.strikeTimer -= dt;
      if (this.strikeTimer <= 0) {
        this.strikeTimer = 5 + Math.random() * 5;
        return this.strike(center, candidates);
      }
    }
    return null;
  }

  // Lightning picks an enemy near the players when there is one.
  strike(center, candidates) {
    let spot = null;
    const near = candidates.filter((e) => e.mesh.position.distanceTo(center) < 24);
    if (near.length) spot = near[Math.floor(Math.random() * near.length)].mesh.position.clone();
    else spot = new THREE.Vector3(center.x + (Math.random() - 0.5) * 26, 0, center.z + (Math.random() - 0.5) * 26);
    spot.y = 0;
    this.flash = 1;

    // a jagged bolt from the sky
    const points = [];
    let x = spot.x + (Math.random() - 0.5) * 6;
    let z = spot.z;
    for (let i = 0; i <= 8; i++) {
      const y = 40 - i * 5;
      points.push(new THREE.Vector3(x, y, z));
      x += (spot.x - x) * 0.25 + (Math.random() - 0.5) * 2.5;
    }
    points[points.length - 1].set(spot.x, 0, spot.z);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    if (this.bolt) this.scene.remove(this.bolt);
    this.bolt = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xf4f8ff, transparent: true, linewidth: 3 })
    );
    this.scene.add(this.bolt);
    this.boltLife = 0.25;
    return spot;
  }

  reset() {
    this.target = 0;
    this.intensity = 0;
    this.flash = 0;
    this.rain.visible = false;
  }
}
