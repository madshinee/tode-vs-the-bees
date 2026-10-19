import * as THREE from 'three';

// 360-degree awareness: a radar showing everything around the players, and red
// arrows on the screen edges pointing at enemies that are out of view.
const RADAR_SIZE = 200;
const RADAR_RANGE = 40; // world units from the center to the radar's edge
const point = new THREE.Vector3();

export function resizeIndicators(canvas) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function drawRadar(canvas, center, players, enemies, pickups, villages) {
  const g = canvas.getContext('2d');
  const half = RADAR_SIZE / 2;
  const k = half / RADAR_RANGE;
  g.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);

  g.save();
  g.beginPath();
  g.arc(half, half, half - 2, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = 'rgba(18, 14, 10, 0.6)';
  g.fillRect(0, 0, RADAR_SIZE, RADAR_SIZE);

  // distance rings and cross
  g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  g.lineWidth = 1;
  for (const r of [0.33, 0.66]) {
    g.beginPath();
    g.arc(half, half, half * r, 0, Math.PI * 2);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(half, 0);
  g.lineTo(half, RADAR_SIZE);
  g.moveTo(0, half);
  g.lineTo(RADAR_SIZE, half);
  g.stroke();

  const toRadar = (p) => {
    let dx = (p.x - center.x) * k;
    let dz = (p.z - center.z) * k;
    const d = Math.hypot(dx, dz);
    const edge = d > half - 8;
    if (edge) {
      dx = (dx / d) * (half - 8);
      dz = (dz / d) * (half - 8);
    }
    return { x: half + dx, y: half + dz, edge };
  };

  // villages: blue squares (blinking red when attacked, grey when fallen)
  for (const v of villages) {
    const r = toRadar(v.pos);
    const blink = v.attacked > 0 && Math.floor(performance.now() / 250) % 2 === 0;
    g.fillStyle = v.fallen ? '#666' : blink ? '#ff5252' : '#4fc3f7';
    g.fillRect(r.x - 4, r.y - 4, 8, 8);
    g.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    g.lineWidth = 1;
    g.strokeRect(r.x - 4, r.y - 4, 8, 8);
  }
  for (const p of pickups) {
    const r = toRadar(p.mesh.position);
    g.fillStyle = '#7dff9a';
    g.fillRect(r.x - 2, r.y - 2, 4, 4);
  }
  for (const e of enemies) {
    const r = toRadar(e.mesh.position);
    g.globalAlpha = r.edge ? 0.6 : 1;
    g.fillStyle = e.boss ? '#e040fb' : e.clone ? '#66ccff' : '#ff4a4a';
    g.beginPath();
    g.arc(r.x, r.y, e.boss ? 6 : 3, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  for (const [p, color] of players) {
    const r = toRadar(p.position);
    g.fillStyle = color;
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(r.x, r.y, 5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  g.restore();

  g.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(half, half, half - 2, 0, Math.PI * 2);
  g.stroke();
}

function drawArrows(canvas, camera, enemies, villages) {
  const g = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  g.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const marginX = 34;
  const marginTop = 90;
  const marginBottom = 110;

  // nearest first, so the closest threats always get an arrow
  const list = [];
  for (const e of enemies) {
    point.copy(e.mesh.position);
    point.y = 1;
    point.project(camera);
    const px = (point.x * 0.5 + 0.5) * w;
    const py = (-point.y * 0.5 + 0.5) * h;
    if (px > marginX && px < w - marginX && py > marginTop && py < h - marginBottom) continue; // visible
    list.push({ e, px, py, d: Math.hypot(px - cx, py - cy) });
  }
  list.sort((a, b) => a.d - b.d);

  // orange arrows for villages under attack that are off-screen
  for (const v of villages) {
    if (v.fallen || v.attacked <= 0) continue;
    point.copy(v.pos);
    point.y = 1;
    point.project(camera);
    const px = (point.x * 0.5 + 0.5) * w;
    const py = (-point.y * 0.5 + 0.5) * h;
    if (px > marginX && px < w - marginX && py > marginTop && py < h - marginBottom) continue;
    list.unshift({ e: { village: true }, px, py, d: 0 });
  }

  for (const { e, px, py, d } of list.slice(0, 14)) {
    const dx = px - cx;
    const dy = py - cy;
    const sx = Math.abs(dx) > 0.001 ? (w / 2 - marginX) / Math.abs(dx) : Infinity;
    const sy =
      Math.abs(dy) > 0.001 ? ((dy < 0 ? cy - marginTop : h - marginBottom - cy) ) / Math.abs(dy) : Infinity;
    const s = Math.min(sx, sy, 1);
    const x = cx + dx * s;
    const y = cy + dy * s;
    const angle = Math.atan2(dy, dx);
    const size = e.village ? 18 : e.boss ? 20 : 12;

    g.save();
    g.translate(x, y);
    g.rotate(angle);
    g.globalAlpha = Math.max(0.45, 1 - d / 1500);
    g.fillStyle = e.village ? '#ffa000' : e.boss ? '#e040fb' : e.clone ? '#66ccff' : '#ff4a4a';
    g.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(size, 0);
    g.lineTo(-size * 0.6, -size * 0.7);
    g.lineTo(-size * 0.3, 0);
    g.lineTo(-size * 0.6, size * 0.7);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }
}

export function updateRadar({ radar, indicators, camera, center, players, enemies, pickups, villages = [] }) {
  drawRadar(radar, center, players, enemies, pickups, villages);
  drawArrows(indicators, camera, enemies, villages);
}
