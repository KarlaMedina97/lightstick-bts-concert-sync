// ARMY Bomb "Ver. 3" (2018; ilustración inspirada, no el diseño oficial). Donde el producto real lleva el logo,
// aquí va una ola original pequeña; el motivo plateado del globo es un patrón abstracto original.
// Proporciones medidas en fotos de producto, relativas al radio R del globo: globo semiesmerilado con motivos
// plateados difusos, banda transparente lechosa donde apoya el globo (r ≈ 0.6·R), cuello negro que baja en
// embudo de 0.6·R a 0.42·R en ≈ 0.55·R, mango casi recto ≈ 1.6·R con dos botones redondos apilados al frente
// (el de arriba más chico), aro transparente abajo (r ≈ 0.36·R) y remate negro con gema roja (r ≈ 0.33·R) a ~28°.
// Largo total ≈ 2.25 diámetros.
import * as THREE from "three";
import { lathe, waveEmblemGeometry, capWithGem, shardShellGeometry, seamRing } from "./shared.js";

/** @param {ReturnType<import("./shared.js").createMaterials>} m */
export function createArmyBombV3(m, { lowEnd = false } = {}) {
  const R = 1.55, seg = lowEnd ? 32 : 56;
  const group = new THREE.Group();
  const BAND_TOP = -1.25, NECK_Y = -1.46, FUNNEL_BOT = -2.3, H_R = 0.66, BOT = -5.12;

  // Globo semiesmerilado con láminas plateadas abstractas por dentro y una costura en el ecuador.
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, seg, Math.round(seg * 0.75)), m.haze);
  shell.renderOrder = 3;
  const shards = new THREE.Mesh(shardShellGeometry(R * 0.965, { count: lowEnd ? 26 : 44, size: 0.2, seed: 23, band: [-0.7, 0.72] }), m.foil);
  shards.renderOrder = 2;
  const equator = seamRing(m.clearRing, R * 1.001, 0.008, { y: -0.08, segs: seg });
  const tint = new THREE.Mesh(new THREE.SphereGeometry(R - 0.06, 28, 20), m.tint);

  // Emblema original pequeño sobre un pedestal esmerilado (en el real hay un logo: aquí no).
  const emblemGeo = waveEmblemGeometry({ variant: "small", curveSegments: lowEnd ? 8 : 12, bevelSegments: 2 });
  const emblem = new THREE.Mesh(emblemGeo, m.acrylic);
  emblem.position.y = -0.72;
  const pedestal = new THREE.Mesh(lathe([[0, -0.74], [0.42, -0.74], [0.56, -0.86], [0.86, -1.02], [0.93, BAND_TOP]], seg), m.diffuser);
  const halo = new THREE.Sprite(m.halo);
  halo.scale.setScalar(2.5);
  halo.position.y = -0.2;

  // Banda transparente lechosa donde el globo se asienta sobre el cuello.
  const band = new THREE.Mesh(lathe([[0.9, NECK_Y], [0.97, -1.36], [0.98, BAND_TOP], [0.92, BAND_TOP + 0.06]], seg), m.clearRing);
  // Cuello en embudo (negro brillante) que se funde con el mango satinado.
  const neck = new THREE.Mesh(lathe([[H_R, FUNNEL_BOT], [0.7, -2.05], [0.8, -1.78], [0.9, -1.56], [0.93, NECK_Y], [0.86, NECK_Y + 0.02]], seg), m.gloss);
  const handle = new THREE.Mesh(lathe([[0, BOT + 0.3], [0.52, BOT + 0.3], [0.58, BOT + 0.42], [0.62, -4.2], [H_R, FUNNEL_BOT], [0, FUNNEL_BOT]], seg), m.satin);
  // Aro transparente inferior.
  const bottom = new THREE.Mesh(lathe([[0, BOT], [0.5, BOT], [0.56, BOT + 0.04], [0.57, BOT + 0.28], [0.52, BOT + 0.31], [0, BOT + 0.31]], seg), m.clearRing);

  // Dos botones redondos al frente con aro cromado: el de arriba más chico.
  const surfaceZ = (y) => 0.62 + ((H_R - 0.62) * (y + 4.2)) / (FUNNEL_BOT + 4.2); // radio del mango a esa altura
  const btn = (y, r) => {
    const z = surfaceZ(y);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.04, 0.06, 24), m.buttons);
    b.rotation.x = Math.PI / 2;
    b.position.set(0, y, z + 0.01);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.012, 0.014, 6, 24), m.chrome);
    ring.position.set(0, y, z + 0.02);
    return [b, ring];
  };
  const [b1, r1] = btn(-2.5, 0.12), [b2, r2] = btn(-2.9, 0.17);

  // Remate negro con gema roja, inclinado ~28° hacia un lado.
  const cap = capWithGem(m, { radius: 0.51, height: 0.22, gemR: 0.16 });
  const capDir = new THREE.Vector3(0.45, 0.88, 0.14).normalize();
  cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), capDir);
  cap.position.copy(capDir).multiplyScalar(R - 0.17);

  group.add(shell, shards, equator, tint, emblem, pedestal, halo, band, neck, handle, bottom, b1, r1, b2, r2, cap);
  return { group, halo, metrics: { top: 1.85, bottom: BOT, radius: R, grip: -3.7 } };
}
