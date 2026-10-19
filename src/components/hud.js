import { iconSvg } from './icons.js';
import { hooks } from './net.js';
import { t } from './i18n.js';

const $ = (id) => document.getElementById(id);

// Longest cooldown seen per ability, used to draw the cooldown overlay.
const maxCooldown = {};

// ability = { unlock, level, cd, active, time }
function updateAbility(id, ability, level) {
  const el = $(`ab-${id}`);
  const locked = level < ability.unlock;
  const status = el.querySelector('.status');
  const overlay = el.querySelector('.cd');

  if (ability.cd <= 0) maxCooldown[id] = 0;
  maxCooldown[id] = Math.max(maxCooldown[id] || 0, ability.cd);

  el.classList.toggle('locked', locked);
  el.classList.toggle('active', !locked && !!ability.active);
  el.classList.toggle('ready', !locked && !ability.active && ability.cd <= 0);

  if (locked) {
    status.textContent = t('hud.lv', { n: ability.unlock });
    overlay.style.height = '0';
  } else if (ability.active) {
    status.textContent = `${Math.ceil(ability.time)}s`;
    overlay.style.height = '0';
  } else if (ability.cd > 0) {
    status.textContent = ability.cd.toFixed(1);
    overlay.style.height = `${(ability.cd / maxCooldown[id]) * 100}%`;
  } else {
    status.textContent = '';
    overlay.style.height = '0';
  }
}

export function updateHud({
  health,
  maxHealth,
  score,
  wave,
  best,
  weapon,
  weaponTime,
  boss,
  combo,
  multiplier,
  level,
  xp,
  xpNeeded,
  abilities,
  ambush,
  p2,
  blessing,
  buffTime,
}) {
  $('buff').textContent = buffTime > 0 ? t('hud.buff', { s: Math.ceil(buffTime) }) : '';
  $('p2-card').style.display = p2 ? 'flex' : 'none';
  if (p2) {
    $('p2-health-fill').style.width = `${(p2.health / p2.maxHealth) * 100}%`;
    $('p2-health-text').textContent = p2.dead ? t('hud.down') : `${Math.ceil(p2.health)} / ${p2.maxHealth}`;
  }
  $('blessing').textContent = blessing ? t('hud.blessing') : '';
  $('level-badge').textContent = level;
  $('health-fill').style.width = `${(health / maxHealth) * 100}%`;
  $('health-fill').classList.toggle('low', health / maxHealth < 0.3);
  $('health-text').textContent = `${Math.ceil(health)} / ${maxHealth}`;
  $('xp-fill').style.width = `${(xp / xpNeeded) * 100}%`;
  $('score').textContent = score;
  $('wave').textContent = wave;
  $('best').textContent = best;

  $('weapon').textContent = weapon === 'normal' ? '' : `${t(`weapon.${weapon}`)} ${Math.ceil(weaponTime)}s`;
  $('combo').textContent = combo > 1 ? t('hud.combo', { m: multiplier, n: combo }) : '';
  $('ambush').textContent =
    ambush === 'ready' ? t('hud.ambush.ready') : ambush === 'charging' ? t('hud.ambush.charge') : '';
  $('ambush').classList.toggle('ready', ambush === 'ready');

  for (const [id, ability] of Object.entries(abilities)) updateAbility(id, ability, level);

  $('boss').style.display = boss ? 'block' : 'none';
  if (boss) {
    $('boss-name').textContent = t(`boss.${boss.kind}`).toUpperCase();
    $('boss-fill').style.width = `${(boss.health / boss.maxHealth) * 100}%`;
  }
}

const ENEMY_GUIDE = [
  ['bee', 'bee'],
  ['bolt', 'ninja'],
  ['shield', 'tank'],
  ['target', 'gunner'],
  ['arrow', 'raider'],
  ['crown', 'queen'],
  ['burst', 'hornet'],
];

function fillRows(container, rows) {
  container.replaceChildren(...rows);
}

// Fills the tactical pause screen. info = { stats: [[labelKey, value]...], upgrades: [name...] }
export function showPause(info) {
  fillRows(
    $('pause-stats'),
    info.stats.map(([labelKey, value]) => {
      const row = document.createElement('div');
      row.className = 'stat-row';
      const l = document.createElement('span');
      l.textContent = t(labelKey);
      const v = document.createElement('b');
      v.textContent = value;
      row.append(l, v);
      return row;
    })
  );
  const upgrades = $('pause-upgrades');
  if (info.upgrades.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = t('pause.none');
    fillRows(upgrades, [empty]);
  } else {
    fillRows(
      upgrades,
      info.upgrades.map((text) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = text;
        return chip;
      })
    );
  }
  fillRows(
    $('pause-enemies'),
    ENEMY_GUIDE.map(([icon, id]) => {
      const row = document.createElement('div');
      row.className = 'enemy-row';
      const i = document.createElement('span');
      i.className = 'e-icon';
      i.innerHTML = iconSvg(icon);
      const body = document.createElement('div');
      const n = document.createElement('b');
      n.textContent = t(`guide.${id}.name`);
      const text = document.createElement('small');
      text.textContent = t(`guide.${id}.text`);
      body.append(n, text);
      row.append(i, body);
      return row;
    })
  );
  const tip = t(`tip.${1 + Math.floor(Math.random() * 5)}`);
  $('pause-tip').textContent = t('pause.tip', { tip });
}

export function showGameOver(score, wave, visible, reason = 'died', kills = null) {
  $('gameover').style.display = visible ? 'flex' : 'none';
  if (visible) {
    const why = reason === 'villages' ? t('over.villages') : '';
    const k = kills ? ` ${t('over.kills', { a: kills[0], b: kills[1] })}` : '';
    $('final').textContent = `${why}${t('over.score', { score, wave })}${k}`;
  }
}

// One row per village: its name and a safety bar (red when attacked, grey when fallen).
let villageRows = null;
export function updateVillages(villages) {
  const root = $('villages');
  if (!villageRows) {
    root.replaceChildren();
    villageRows = villages.map((v) => {
      const row = document.createElement('div');
      row.className = 'v-row';
      const name = document.createElement('span');
      name.className = 'v-name';
      name.textContent = v.name;
      const bar = document.createElement('div');
      bar.className = 'v-bar';
      const fill = document.createElement('div');
      fill.className = 'v-fill';
      bar.append(fill);
      row.append(name, bar);
      root.append(row);
      return { row, fill };
    });
  }
  villages.forEach((v, i) => {
    const { row, fill } = villageRows[i];
    fill.style.width = `${v.safety}%`;
    row.classList.toggle('attacked', v.attacked > 0);
    row.classList.toggle('fallen', v.fallen);
    row.classList.toggle('quest', !!v.quest);
  });
}

export function showBanner(text) {
  hooks.banner?.(text);
  const el = $('banner');
  el.textContent = text;
  el.style.opacity = 1;
  setTimeout(() => (el.style.opacity = 0), 1500);
}

// Shows upgrade cards; onPick(index) is called when one is chosen.
export function showUpgrades(options, onPick) {
  const root = $('upgrades');
  const cards = $('cards');
  cards.replaceChildren();
  options.forEach((u, i) => {
    const card = document.createElement('button');
    card.className = 'card';
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = String(i + 1);
    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.innerHTML = iconSvg(u.icon);
    const name = document.createElement('strong');
    name.textContent = t(`up.${u.id}.name`);
    const desc = document.createElement('em');
    desc.textContent = t(`up.${u.id}.desc`);
    const prov = document.createElement('small');
    prov.className = 'prov';
    prov.textContent = t(`prov.${u.id}`);
    card.append(num, icon, name, desc, prov);
    card.addEventListener('click', () => onPick(i));
    cards.append(card);
  });
  root.style.display = 'flex';
}

export function hideUpgrades() {
  $('upgrades').style.display = 'none';
}
