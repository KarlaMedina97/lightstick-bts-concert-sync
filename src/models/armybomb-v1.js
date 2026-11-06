// ARMY Bomb "Ver. 1" (ilustración inspirada, no el diseño oficial; sin logos). Silueta de la primera versión,
// medida en fotos de producto y relativa al radio R del globo: globo grande en dos mitades (costura vertical y
// otra horizontal), la de arriba más esmerilada, con motivos plateados difusos (aquí abstractos y originales);
// tapa plana negra (r ≈ 0.33·R) con la "mecha" roja de bomba; copa negra con cuatro aletas que baja de 0.46·R a
// 0.28·R en ≈ 0.67·R; mango corto y delgado (≈ 1.5·R) con anillos de agarre y un botón redondo. Largo ≈ 2.2·D.
// No tiene Bluetooth: en LumiParty se muestra en la ronda de versiones, pero la luz la pone la pantalla.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { lathe, waveEmblemGeometry, shardShellGeometry, seamRing } from "./shared.js";

/** @param {ReturnType<import("./shared.js").createMaterials>} m */
export function createArmyBombV1(m, { lowEnd = false } = {}) {
  const R = 1.45, seg = lowEnd ? 32 : 48;
  const group = new THREE.Group();
  const CUP_TOP = -1.3, CUP_BOT = -2.28, H_R = 0.41, BOT = -4.47;

  // Globo: mitad inferior transparente, casquete superior esmerilado, costuras y láminas plateadas por dentro.
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, seg, Math.round(seg * 0.75)), m.glass);
  shell.renderOrder = 3;
  const frostTop = new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, seg, Math.round(seg * 0.3), 0, Math.PI * 2, 0, 1.45), m.haze);
  frostTop.renderOrder = 2;
  const shards = new THREE.Mesh(shardShellGeometry(R * 0.95, { count: lowEnd ? 18 : 32, size: 0.2, seed: 41, band: [-0.75, 0.35] }), m.foil);
  const tint = new THREE.Mesh(new THREE.SphereGeometry(R - 0.06, 24, 18), m.tint);
  const equator = seamRing(m.clearRing, R * Math.sin(1.45) + 0.004, 0.012, { y: R * Math.cos(1.45), segs: seg });
  const meridian = seamRing(m.clearRing, R * 1.001, 0.01, { vertical: true, segs: seg });
  meridian.rotation.y = 0.35;

  // Emblema original (ola) pequeño en la parte baja del globo.
  const emblemGeo = waveEmblemGeometry({ variant: "small", curveSegments: lowEnd ? 6 : 10, bevelSegments: 1 });
  const emblem = new THREE.Mesh(emblemGeo, m.acrylic);
  emblem.scale.setScalar(0.8);
  emblem.position.y = -0.85;
  const halo = new THREE.Sprite(m.halo);
  halo.scale.setScalar(2.4);

  // Tapa plana negra con la mecha: varilla gris inclinada y punta roja.
  const capTop = R + 0.08;
  const cap = new THREE.Mesh(lathe([[0, R - 0.08], [0.44, R - 0.1], [0.48, capTop - 0.04], [0.45, capTop], [0, capTop + 0.01]], seg), m.gloss);
  const fuse = new THREE.Group();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.3, 8), m.chrome);
  rod.position.y = 0.15;
  const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.08, 3, 8), m.gem);
  tip.position.y = 0.33;
  fuse.add(rod, tip);
  fuse.position.set(0.08, capTop, 0);
  fuse.rotation.z = -0.55;

  // Copa negra con cuatro aletas verticales.
  const cup = new THREE.Mesh(lathe([[H_R, CUP_BOT], [0.46, -2.05], [0.56, -1.7], [0.66, -1.42], [0.68, CUP_TOP], [0.6, CUP_TOP + 0.04]], seg), m.gloss);
  const fins = new THREE.Mesh(
    mergeGeometries(Array.from({ length: 4 }, (_, i) => {
      const g = new THREE.BoxGeometry(0.06, 0.6, 0.07);
      g.rotateX(0.32); // sigue la pendiente de la copa
      g.translate(0, -1.74, 0.56);
      g.rotateY((i / 4) * Math.PI * 2 + Math.PI / 4);
      return g;
    })),
    m.gloss,
  );

  // Mango corto con anillos de agarre, un botón redondo y remate algo más ancho.
  const handle = new THREE.Mesh(lathe([[0, BOT + 0.18], [H_R - 0.02, BOT + 0.18], [H_R, BOT + 0.3], [H_R, CUP_BOT], [0, CUP_BOT + 0.001]], seg), m.satin);
  const grips = lowEnd ? [] : Array.from({ length: 5 }, (_, i) => seamRing(m.gloss, H_R + 0.004, 0.018, { y: -2.5 - i * 0.14, segs: 32 }));
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 20), m.buttons);
  btn.rotation.x = Math.PI / 2;
  btn.position.set(0, -3.4, H_R + 0.01);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 6, 20), m.chrome);
  rim.position.copy(btn.position);
  const bottom = new THREE.Mesh(lathe([[0, BOT], [H_R - 0.04, BOT], [H_R + 0.03, BOT + 0.06], [H_R + 0.03, BOT + 0.16], [H_R, BOT + 0.19], [0, BOT + 0.19]], seg), m.gloss);

  group.add(shell, frostTop, shards, tint, equator, meridian, emblem, halo, cap, fuse, cup, fins, handle, ...grips, btn, rim, bottom);
  return { group, halo, metrics: { top: 2.0, bottom: BOT, radius: R, grip: -3.4 } };
}
