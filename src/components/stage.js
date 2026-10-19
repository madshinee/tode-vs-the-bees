import * as THREE from 'three';

// The opening scene in 3D: two motion-captured villagers talk (and get scared),
// a camera moves between shots, and Tode hops in between them.
// Stage position: the spawn point, which is always free of trees and huts.
const MAN_AT = new THREE.Vector3(-1.9, 0, 0);
const WOMAN_AT = new THREE.Vector3(1.9, 0, 0);

const SHOTS = {
  wide: { pos: new THREE.Vector3(0.4, 1.9, 8.2), look: new THREE.Vector3(0, 1.2, 0) },
  // over Awa's shoulder at Mamadou, and the other way round
  man: { pos: new THREE.Vector3(2.9, 1.7, 3.1), look: new THREE.Vector3(-1.9, 1.45, 0) },
  woman: { pos: new THREE.Vector3(-2.9, 1.7, 3.1), look: new THREE.Vector3(1.9, 1.45, 0) },
  tode: { pos: new THREE.Vector3(0, 1.8, 9.2), look: new THREE.Vector3(0, 1.0, 0.6) },
};

const TALKS = ['talk2', 'talk1', 'talk3'];

export async function createStage({ scene, player, createPerson }) {
  const man = await createPerson('man', 0);
  const woman = await createPerson('woman', 0);
  man.group.position.copy(MAN_AT);
  woman.group.position.copy(WOMAN_AT);
  man.group.rotation.y = Math.PI / 2; // facing each other
  woman.group.rotation.y = -Math.PI / 2;
  man.group.scale.setScalar(1.12);
  woman.group.scale.setScalar(1.08);
  man.group.visible = woman.group.visible = false;
  scene.add(man.group, woman.group);

  const camPos = SHOTS.wide.pos.clone();
  const camLook = SHOTS.wide.look.clone();
  const goalPos = camPos.clone();
  const goalLook = camLook.clone();
  const stage = {
    active: false,
    todeT: -1, // < 0: not hopping, 0..1: hopping in
    leaving: 0,
    speaker: null,
    time: 0,
  };
  stage.people = { man, woman };
  let talkIndex = 0;

  function shot(name) {
    goalPos.copy(SHOTS[name].pos);
    goalLook.copy(SHOTS[name].look);
  }

  stage.start = () => {
    stage.active = true;
    stage.todeT = -1;
    stage.leaving = 0;
    stage.time = 0;
    man.group.visible = woman.group.visible = true;
    man.group.position.copy(MAN_AT);
    woman.group.position.copy(WOMAN_AT);
    man.group.rotation.y = Math.PI / 2;
    woman.group.rotation.y = -Math.PI / 2;
    man.play('idle');
    woman.play('idle');
    player.mesh.visible = false;
    camPos.copy(SHOTS.wide.pos);
    camLook.copy(SHOTS.wide.look);
    shot('wide');
  };

  // One line of dialogue: the speaker talks, the other listens or gets scared
  stage.line = (line) => {
    stage.speaker = line.who;
    if (line.who === 'tode') {
      shot('tode');
      man.play('cheer');
      woman.play('clap');
      return;
    }
    const speaker = line.who === 'man' ? man : woman;
    const listener = line.who === 'man' ? woman : man;
    talkIndex++;
    shot(line.who === 'man' ? 'man' : 'woman');
    // Awa calls Tode with a big wave; otherwise the speaker talks with his hands
    speaker.play(line.key === 'cut.4' ? 'wave' : TALKS[talkIndex % TALKS.length]);
    listener.play(talkIndex <= 1 ? 'idle' : 'terrified');
  };

  // Tode hops in between them
  stage.enter = () => {
    stage.todeT = 0;
    player.mesh.visible = true;
    player.mesh.rotation.y = 0;
  };

  // The villagers run for their huts and the game begins
  stage.finish = () => {
    stage.leaving = 1.4;
    man.play('run', { fade: 0.15 });
    woman.play('run', { fade: 0.15 });
    man.group.rotation.y = -Math.PI / 2;
    woman.group.rotation.y = Math.PI / 2;
    stage.todeT = 1;
    player.position.set(0, 0, 1.2);
    player.mesh.position.set(0, 0, 1.2);
    player.mesh.visible = true;
    stage.active = false;
  };

  stage.update = (dt, camera) => {
    if (!stage.active && stage.leaving <= 0) return;
    stage.time += dt;
    man.mixer.update(dt);
    woman.mixer.update(dt);

    // mouths move on the speaker
    for (const [p, who] of [[man, 'man'], [woman, 'woman']]) {
      const talking = stage.speaker === who && stage.active;
      if (p.mouth) p.mouth.scale.y = talking ? 0.15 + Math.abs(Math.sin(stage.time * 13 + (who === 'man' ? 0 : 1))) * 1.0 : 0.05;
    }

    // after the scene, the villagers run away from the camera
    if (stage.leaving > 0) {
      stage.leaving -= dt;
      man.group.position.x -= dt * 4.5;
      woman.group.position.x += dt * 4.5;
      man.group.position.z -= dt * 1.5;
      woman.group.position.z -= dt * 1.5;
      if (stage.leaving <= 0) man.group.visible = woman.group.visible = false;
    }

    // Tode's three hops
    if (stage.todeT >= 0 && stage.todeT < 1) {
      stage.todeT = Math.min(1, stage.todeT + dt / 2.2);
      const k = stage.todeT;
      const z = THREE.MathUtils.lerp(-9, 1.2, 1 - Math.pow(1 - k, 1.3));
      player.mesh.position.set(0, Math.abs(Math.sin(k * Math.PI * 3)) * 1.4 * (1 - k * 0.6), z);
      player.position.copy(player.mesh.position);
    }

    // the camera glides between shots, with a slow drift
    if (stage.active || stage.leaving > 0) {
      const f = 1 - Math.exp(-dt * 2.6);
      camPos.lerp(goalPos, f);
      camLook.lerp(goalLook, f);
      camera.position.copy(camPos);
      camera.position.x += Math.sin(stage.time * 0.5) * 0.12;
      camera.position.y += Math.sin(stage.time * 0.7) * 0.05;
      camera.lookAt(camLook);
    }
  };

  return stage;
}
