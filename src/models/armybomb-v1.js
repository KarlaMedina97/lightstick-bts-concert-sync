// ARMY Bomb "Ver. 1" (ilustración inspirada, no el diseño oficial; sin logos). Silueta de la primera versión:
// globo redondo más chico sobre una copa negra simple, mango recto con una banda plateada y un solo botón.
// No tiene Bluetooth: en LumiParty se muestra en la ronda de versiones, pero la luz la pone la pantalla.
import * as THREE from "three";
import { lathe, waveEmblemGeometry } from "./shared.js";

/** @param {ReturnType<import("./shared.js").createMaterials>} m */
export function createArmyBombV1(m, { lowEnd = false } = {}) {
  const R = 1.3, seg = lowEnd ? 32 : 48;
  const group = new THREE.Group();
  const CUP_TOP = -0.95, CUP_BOT = -1.5, H_R = 0.5, BOT = -5.2;

  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, seg, Math.round(seg * 0.75)), m.glass);
  shell.renderOrder = 3;
  const tint = new THREE.Mesh(new THREE.SphereGeometry(R - 0.05, 24, 18), m.tint);
  // Emblema original (ola) pequeño al centro del globo.
  const emblemGeo = waveEmblemGeometry({ variant: "small", curveSegments: lowEnd ? 6 : 10, bevelSegments: 1 });
  const emblem = new THREE.Mesh(emblemGeo, m.acrylic);
  emblem.scale.setScalar(0.8);
  emblem.position.y = -0.55;
  const halo = new THREE.Sprite(m.halo);
  halo.scale.setScalar(2.2);

  // Copa negra lisa que sostiene el globo.
  const cup = new THREE.Mesh(lathe([[H_R, CUP_BOT], [0.7, -1.32], [0.98, -1.08], [1.02, CUP_TOP], [0.9, CUP_TOP + 0.03]], seg), m.gloss);
  // Mango recto con banda plateada y un botón redondo.
  const handle = new THREE.Mesh(lathe([[0, BOT + 0.2], [H_R - 0.04, BOT + 0.2], [H_R, BOT + 0.34], [H_R, CUP_BOT], [0, CUP_BOT + 0.001]], seg), m.satin);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(H_R + 0.015, H_R + 0.015, 0.16, seg, 1, true), m.chrome);
  band.position.y = -2.0;
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 24), m.buttons);
  btn.rotation.x = Math.PI / 2;
  btn.position.set(0, -2.7, H_R + 0.02);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.014, 6, 24), m.chrome);
  rim.position.copy(btn.position);
  const bottom = new THREE.Mesh(lathe([[0, BOT], [H_R - 0.08, BOT], [H_R - 0.02, BOT + 0.06], [H_R - 0.02, BOT + 0.2], [0, BOT + 0.21]], seg), m.gloss);

  group.add(shell, tint, emblem, halo, cup, handle, band, btn, rim, bottom);
  return { group, halo, metrics: { top: 1.45, bottom: BOT, radius: R, grip: -3.9 } };
}
