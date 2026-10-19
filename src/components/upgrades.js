// Permanent bonuses offered between waves. Names and descriptions live in
// locales.js under up.<id>.name / up.<id>.desc. `available` hides one-time
// upgrades that were already taken.
export const UPGRADES = [
  { id: 'speed', icon: 'paw', apply: (p) => (p.speed *= 1.15) },
  { id: 'damage', icon: 'target', apply: (p) => (p.damage += 1) },
  {
    id: 'hp',
    icon: 'shield',
    apply: (p) => {
      p.maxHealth += 25;
      p.heal(25);
    },
  },
  { id: 'rate', icon: 'bolt', apply: (p) => (p.fireRateMul *= 1.2) },
  { id: 'dash', icon: 'boots', apply: (p) => (p.dashCdMul *= 0.75) },
  { id: 'heal', icon: 'heart', apply: (p) => (p.health = p.maxHealth) },
  { id: 'pierce', icon: 'arrow', available: (p) => !p.pierce, apply: (p) => (p.pierce = true) },
  { id: 'explosive', icon: 'burst', available: (p) => !p.explosive, apply: (p) => (p.explosive = true) },
  { id: 'twin', icon: 'twin', available: (p) => !p.multishot, apply: (p) => (p.multishot = true) },
];

export function pickUpgrades(player, count = 3) {
  return UPGRADES.filter((u) => !u.available || u.available(player))
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}
