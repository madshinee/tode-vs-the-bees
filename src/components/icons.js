// Our own icon set, drawn as SVG (48x48), so the game looks the same on every
// device instead of depending on the system's emoji font.
const ICONS = {
  bee: `
    <ellipse cx="26" cy="28" rx="13" ry="10" fill="#f6b91a"/>
    <path d="M22 19.5v17M28 18.8v18.4M34 20.5v15" stroke="#2b1b00" stroke-width="3.2"/>
    <ellipse cx="24" cy="17" rx="8" ry="5" fill="#cfe9ff" opacity="0.9" transform="rotate(-20 24 17)"/>
    <ellipse cx="32" cy="16" rx="7" ry="4.5" fill="#e3f3ff" opacity="0.85" transform="rotate(10 32 16)"/>
    <circle cx="12" cy="27" r="7" fill="#2b1b00"/>
    <circle cx="10" cy="25" r="1.7" fill="#fff"/>
    <path d="M9 21Q6 14 2 13M13 20Q13 12 10 9" stroke="#2b1b00" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M39 28l7 2-7 2z" fill="#2b1b00"/>`,
  pause: `<rect x="12" y="9" width="8" height="30" rx="2.5" fill="currentColor"/><rect x="28" y="9" width="8" height="30" rx="2.5" fill="currentColor"/>`,
  bolt: `<path d="M28 4L10 28h10l-4 16 22-26H27z" fill="#ffd54f" stroke="#8a5a00" stroke-width="2.5" stroke-linejoin="round"/>`,
  heart: `<path d="M24 42C8 30 5 21 9 15c4-6 12-5 15 1 3-6 11-7 15-1 4 6 1 15-15 27z" fill="#7dff9a" stroke="#1b7a3a" stroke-width="2.5" stroke-linejoin="round"/>`,
  shield: `<path d="M24 4l16 6v12c0 11-7 18-16 22C15 40 8 33 8 22V10z" fill="#6fa8ff" stroke="#1d4f9c" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 12v26M14 20h20" stroke="#dbe9ff" stroke-width="3"/>`,
  target: `<circle cx="24" cy="24" r="18" fill="#fff" stroke="#c62828" stroke-width="3"/><circle cx="24" cy="24" r="11" fill="#ef5350"/><circle cx="24" cy="24" r="4.5" fill="#fff"/>`,
  paw: `<g fill="#ffb74d"><ellipse cx="24" cy="31" rx="11" ry="8.5"/><circle cx="10" cy="22" r="4.6"/><circle cx="18.5" cy="12.5" r="4.6"/><circle cx="29.5" cy="12.5" r="4.6"/><circle cx="38" cy="22" r="4.6"/></g>`,
  boots: `<path d="M16 5h12v18l13 6c2 1 3 3 3 5v5H8v-9c0-2 1-3 3-3h5z" fill="#a1887f" stroke="#4e342e" stroke-width="2.5" stroke-linejoin="round"/><path d="M8 39h36" stroke="#4e342e" stroke-width="4"/><path d="M2 14h8M0 21h7" stroke="#9de6ff" stroke-width="2.5" stroke-linecap="round"/>`,
  arrow: `<path d="M6 42L36 12" stroke="#66e0ff" stroke-width="4" stroke-linecap="round"/><path d="M29 7h12v12z" fill="#66e0ff"/><path d="M10 30l-6 2 4 6M18 38l-2 6 6-4" stroke="#66e0ff" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="28" cy="28" r="9" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="3 3"/>`,
  burst: `<path d="M24 3l4.5 12.5L41 11l-4.5 12.5L45 27l-12.5 3 3.5 13-11-8-11 8 3.5-13L3 27l8.5-3.5L7 11l12.5 4.5z" fill="#ff7722" stroke="#8a2d00" stroke-width="2.2" stroke-linejoin="round"/><circle cx="24" cy="24" r="7" fill="#ffe082"/>`,
  twin: `<path d="M26 14H4M26 34H4" stroke="#ffd54f" stroke-width="3.5" stroke-linecap="round" opacity="0.6"/><circle cx="34" cy="14" r="7" fill="#ffd54f" stroke="#8a5a00" stroke-width="2"/><circle cx="34" cy="34" r="7" fill="#ffd54f" stroke="#8a5a00" stroke-width="2"/>`,
  dash: `<path d="M4 14h16M2 24h20M6 34h14" stroke="#9de6ff" stroke-width="3.5" stroke-linecap="round"/><path d="M26 9l17 15-17 15z" fill="#9de6ff"/>`,
  jump: `<path d="M24 3l14 17h-9v9H19v-9h-9z" fill="#b6f5c5" stroke="#2e7d4f" stroke-width="2" stroke-linejoin="round"/><path d="M11 35q6 5 13 0t13 0M11 42q6 5 13 0t13 0" stroke="#b6f5c5" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  people: `<circle cx="15" cy="14" r="6" fill="#ffd54f"/><circle cx="33" cy="14" r="6" fill="#ff9a4d"/><path d="M3 41c0-9 5-14 12-14s12 5 12 14z" fill="#ffd54f"/><path d="M21 41c0-9 5-14 12-14s12 5 12 14z" fill="#ff9a4d"/>`,
  bomb: `<circle cx="21" cy="29" r="14" fill="#455a64" stroke="#111" stroke-width="2.5"/><circle cx="15" cy="23" r="3.5" fill="#fff" opacity="0.35"/><path d="M30 18l5-6" stroke="#a1887f" stroke-width="3.5" stroke-linecap="round"/><path d="M39 4l1.8 4.6 4.6 1.8-4.6 1.8L39 17l-1.8-4.8-4.6-1.8 4.6-1.8z" fill="#ffd54f"/>`,
  wings: `<path d="M23 37C11 37 3 25 3 10c10 0 17 4 20 15z" fill="#e3f2fd" stroke="#7ba7d9" stroke-width="2.2" stroke-linejoin="round"/><path d="M25 37c12 0 20-12 20-27-10 0-17 4-20 15z" fill="#e3f2fd" stroke="#7ba7d9" stroke-width="2.2" stroke-linejoin="round"/><path d="M8 16q9 3 13 14M40 16q-9 3-13 14" stroke="#9ec3ee" stroke-width="2" fill="none"/>`,
  tree: `<path d="M19 44c1-8 1-14-1-21h12c-2 7-2 13-1 21z" fill="#8b6b4a" stroke="#4e3a26" stroke-width="2" stroke-linejoin="round"/><ellipse cx="13" cy="17" rx="10" ry="6" fill="#6b8e23"/><ellipse cx="35" cy="15" rx="11" ry="6" fill="#7a9a2e"/><ellipse cx="24" cy="9" rx="11" ry="6" fill="#8aa83a"/><path d="M20 24l-6-6M28 24l7-8" stroke="#8b6b4a" stroke-width="3" stroke-linecap="round"/>`,
  frog: `<ellipse cx="24" cy="31" rx="19" ry="12" fill="#4cc15f"/><circle cx="13" cy="18" r="8.5" fill="#54c866"/><circle cx="35" cy="18" r="8.5" fill="#54c866"/><circle cx="13" cy="18" r="6" fill="#fff"/><circle cx="35" cy="18" r="6" fill="#fff"/><circle cx="14" cy="19" r="3" fill="#1b1b1b"/><circle cx="34" cy="19" r="3" fill="#1b1b1b"/><path d="M11 32q13 10 26 0" stroke="#1d5e2c" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  drum: `<path d="M13 8h22l-5 16 5 16H13l5-16z" fill="#c9892b" stroke="#6b3f1d" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="24" cy="8" rx="11" ry="3.5" fill="#f1d9a8" stroke="#6b3f1d" stroke-width="2"/><path d="M17 14l13 9M31 14L18 23M18 26l13 9M30 26L17 35" stroke="#f1d9a8" stroke-width="1.8" opacity="0.9"/>`,
  crown: `<path d="M6 36V13l9 9 9-13 9 13 9-9v23z" fill="#ffd54f" stroke="#8a5a00" stroke-width="2.5" stroke-linejoin="round"/><rect x="6" y="36" width="36" height="6" rx="2" fill="#e0a21f" stroke="#8a5a00" stroke-width="2"/><circle cx="15" cy="30" r="2.5" fill="#e040fb"/><circle cx="24" cy="26" r="2.5" fill="#66ccff"/><circle cx="33" cy="30" r="2.5" fill="#e040fb"/>`,
};

export function iconSvg(name) {
  return `<svg class="ico" viewBox="0 0 48 48" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

// Fills every element that has a data-icon="name" attribute with its icon.
export function fillIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = iconSvg(el.dataset.icon);
  });
}
