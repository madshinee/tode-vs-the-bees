# Tode vs the Bees

A 3D wave-survival game built with **Three.js** and **Vite** for the JB-BYGC. The Queen Bee's swarm is invading the villages of a West African-inspired savanna. You are
**Tode**, a frog who has to defend the villages, level up, evolve and wear the crown.

Playable in English and French, with keyboard and mouse, a gamepad, or a touch screen, alone or with a computer partner.

## Run it

```bash
npm install
npm run dev      # play at http://localhost:5173
npm run build    # production build in dist/
npm run preview  # try the production build
```

## Controls

| Keyboard / mouse | Gamepad | Touch | Action |
| --- | --- | --- | --- |
| WASD / ZQSD (or arrows) | Left stick | Left stick | Move |
| Mouse | Right stick | Right stick | Aim (touch: the right stick also shoots) |
| Click / Space | RT or A | Right stick | Shoot |
| Shift | B | Button | Dash (brief invulnerability) |
| Q | X | Button | Jump over enemies, landing shockwave (Level 3) |
| G | LB | Button | Call a friend who shoots for you (Level 5) |
| E | Y | Button | Drop a bomb (Level 6) |
| F | RB | Button | Fly for 4 seconds (Level 8) |
| B | LT | Button | Hit the drum on the beat (near a griot) |
| P / Esc / pause button | Start | Pause button | Tactical pause: stats, upgrades and an enemy guide |
| Mouse wheel | | | Zoom the camera |
| M | | | Toggle music |

Stand still for 2 seconds (Level 2) to charge an **ambush** shot: triple damage and piercing.

**2 Players mode:** pick *2 Players* on the title screen. You play Tode as usual; **Player 2 (the orange frog)
is a computer-controlled partner**, not a human. It follows you, keeps its distance from the bees and shoots
on its own, but it is balanced as a helper: it fires slower, misses a little, hits softer and only gets half of
your upgrades. The harder the difficulty, the less it helps. A fallen partner gets back up after the wave.

## What makes it different

- **Defend the villages.** Some bees are *raiders* (orange ring): they fly to a village and attack it.
  Each village has a safety bar. Get close to a raider and it turns on you. If a village falls, its
  villagers are lost and its griot goes silent. If all villages fall, the Queen wins.
- **A living story, with real motion capture.** An opening scene shows two villagers talking in **Wolof** (with subtitles) about
  the bees until Tode hops in. In the game the villagers shout in Wolof ("Daw!", "Wallu ma!", "Dugg ci
  kër gi!") and run into their huts during a battle; when Tode wins the wave they run out, gather
  around him and dance to a sabar drum roll.
- **Sabar rhythm mini-game.** Stand next to a griot (musician), who also heals you, and press B on the
  drum beat. Every 6 hits in a row gives *Sabar power*: faster movement and stronger shots.
- **Two bosses.** The Queen Bee (every 5 waves) splits into shadow clones at 66% and 33% health. The
  Giant Hornet (every 10 waves) glows before a fast charge and fires fans of shots.
- **Rainy season storms.** Some waves bring rain, a darker sky, and lightning that strikes the bees.
- **Tode evolves.** XP and levels make the frog grow and unlock a helmet, cape, wings and a crown, each
  with a new ability (ambush, jump, friend, bomb, flight). Pick upgrade cards between waves.
- **African outfits** for Tode on the title screen: boubou with a kufi cap, wax-print cape and head
  wrap, or a scarf in bright green, yellow and red.
- **Costumed enemies**: ninja bees, shielded tanks, cannon-carrying gunners, and a crowned queen.
- **Achievements and stats**, saved in the browser.
- **Daily challenge**: the same bees for everybody on a given day, with its own best score.
- **Griot tales and proverbs**: a short tale between waves and a proverb on every upgrade card.
- **An island by the sea**: beach, palm trees and brightly painted fishing pirogues (with fishermen in boubous) bobbing on the waves.
- **Three landscapes** that change every 5 waves: golden savanna, burnt savanna, river lands.
- **Village quests**: a village asks for help each wave; keep it above 60% safety for a reward.
- **Party time**: slow-motion on a boss's last blow, then falling petals and an orbiting camera while the villagers dance.
- **Adaptive quality**: the game lowers its resolution by itself on slow computers.
- **360-degree awareness**: a radar, edge arrows pointing at enemies and attacked villages, and a
  glowing ring under every enemy.
- **Living bees**: flapping wings and a tumbling death animation (from the course model's own clips), plus a first-minutes tutorial and a `?trailer` mode where Tode plays by himself for recording a video.
- **Combat feedback**: red screen edge when hurt and a heartbeat glow at low health, kill-streak announcements, golden elite bees from wave 7, a "bees left" counter and a crosshair cursor.
- **Juice**: screen shake, floating damage numbers, buzzing bees, a hopping hand-built frog.
- **Tactical pause** to plan your strategy, a day/night cycle, combos, power-ups and three difficulties.

## Known limitations

- **Online co-op is switched off.** A prototype exists in the code (`src/components/net.js`): a friend opens a
  share link and plays the orange frog on their own screen, while the host streams the game to them with
  WebRTC (PeerJS). It worked between two browsers on one computer, but over two different networks it was
  unreliable: with a phone on mobile data it stayed stuck on "Connecting...", and on Wi-Fi the friend dropped
  right after the start. It would need a relay (TURN) server to be dependable, so the button is hidden
  (`btn-online` in `index.html`) and the game offers 1 Player or 2 Players (with the computer partner).
- The Wolof lines were written with care but should be checked by a native speaker.
- The game starts in English; French can be chosen in the settings or on the title screen.

## Score

Defined in `src/components/scoring.js`: 1 point for every 10 seconds survived (`SCORE_PER_SECOND = 0.1`),
10 points per enemy defeated (`SCORE_PER_KILL = 10`), a combo multiplier on kills (set
`MAX_COMBO_MULTIPLIER = 1` to remove it) and a bonus for every village still standing when a wave is won.
The displayed score is rounded down.

## Made with

- **Three.js** (3D) and **Vite**. No game engine, no audio files, no image files.
- The bee model comes from the course. The people (villagers, Mamadou and Awa) are the free **Adobe Mixamo** mannequins (X Bot and Y Bot) with Mixamo's motion-captured animations (idle, talking, walking, running, terrified, cheering, dancing); the boubous, wax cloth, gele, caps and jewellery are built in code. Everything else is original: the frog, the huts, villagers, griots,
  trees, the icons (SVG) and the characters of the opening scene are built in code.
- **All the music and sound effects are synthesized** with the Web Audio API (a kora, gungung, sabar and
  tama groove inspired by mbalax).
- Written with the help of an AI coding agent, prompt by prompt, checking each step.

## Project layout

- `src/main.js`: scene, input, game loop, waves
- `src/components/`: player, frog, enemies, gear (costumes), defense (villages), villagers, griots,
  rhythm, weather, bullets, bombs, pickups, effects, juice, environment, map, upgrades, achievements,
  dialogue, cutscene, hud, radar, icons, menus, i18n/locales, input and touch, audio (sfx + music)
- `public/models/`: the bee model and house from the course, the frog, and the Mixamo mannequins plus animations for the people (see Credits)

## Debug URLs

`?level=10`, `?wave=5`, `?time=90`, `?zoom=2`, `?spawn` (next to a griot), `?village` and `?debug`
(K makes the villagers cheer) jump to a level, wave, time of day, zoom or place. `?touch` shows the
touch controls on a computer.

