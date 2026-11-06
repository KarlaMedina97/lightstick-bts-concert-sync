// ARMY Bomb "Ver. 2" (2017; ilustración inspirada, no el diseño oficial; sin logos). A diferencia de las versiones
// nuevas, el globo NO es transparente ni lleva una esfera adentro: es una cáscara esmerilada, lechosa, que se
// ilumina entera (con un motivo plateado difuso, aquí abstracto y original).
// Proporciones medidas en fotos de producto, relativas al radio R del globo: copa negra con aro plateado
// (r ≈ 0.58·R) que baja en embudo hasta el mango (r ≈ 0.31·R) en ≈ 0.8·R, mango bicolor (negro al frente y
// atrás, paneles plateados a los lados) de ≈ 2.3·R con un botón redondo arriba, remate inferior plateado
// ≈ 0.6·R y tapa negra con gema roja (r ≈ 0.28·R) a ~18°. Largo total ≈ 2.6 diámetros.
// No tiene Bluetooth: en LumiParty la luz la pone la pantalla.
import * as THREE from "three";
import { lathe, capWithGem, shardShellGeometry, seamRing } from "./shared.js";

/** @param {ReturnType<import("./shared.js").createMaterials>} m */
export function createArmyBombV2(m, { lowEnd = false } = {}) {
  const R = 1.45, seg = lowEnd ? 32 : 52;
  const group = new THREE.Group();
  const CUP_TOP = -1.22, NECK_Y = -2.4, H_R = 0.45, END_TOP = -4.95, BOT = -5.8;

  // Cáscara esmerilada opaca que brilla con el color, con motivo plateado tenue y costura en el ecuador.
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, seg, Math.round(seg * 0.75)), m.frostDome);
  const shards = new THREE.Mesh(shardShellGeometry(R * 1.003, { count: lowEnd ? 16 : 28, size: 0.18, seed: 5, band: [-0.55, 0.5] }), m.foil);
  const equator = seamRing(m.clearRing, R * 1.004, 0.009, { y: 0.1, segs: seg });
  const halo = new THREE.Sprite(m.halo);
  halo.scale.setScalar(2.8);

  // Copa negra en embudo con aro plateado arriba.
  const cup = new THREE.Mesh(lathe([[H_R, NECK_Y], [0.5, -2.15], [0.62, -1.75], [0.78, -1.4], [0.85, CUP_TOP], [0.8, CUP_TOP + 0.03]], seg), m.gloss);
  const rim = new THREE.Mesh(lathe([[0.83, CUP_TOP - 0.12], [0.87, CUP_TOP - 0.06], [0.87, CUP_TOP + 0.02], [0.82, CUP_TOP + 0.05]], seg), m.chrome);

  // Mango satinado con paneles laterales plateados, un botón redondo y remate inferior plateado.
  const handle = new THREE.Mesh(lathe([[0, END_TOP], [H_R, END_TOP], [H_R, NECK_Y], [0, NECK_Y]], seg), m.satin);
  const panel = (side) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(H_R + 0.012, H_R + 0.012, NECK_Y - END_TOP - 0.25, lowEnd ? 8 : 14, 1, true, side - 0.62, 1.24), m.chrome);
    p.position.y = (NECK_Y + END_TOP) / 2 - 0.08;
    return p;
  };
  const end = new THREE.Mesh(lathe([[0, BOT], [H_R - 0.06, BOT], [H_R, BOT + 0.06], [H_R + 0.01, END_TOP - 0.01], [0, END_TOP]], seg), m.chrome);
  const endSeam = seamRing(m.seam, H_R + 0.012, 0.008, { y: END_TOP, segs: seg });
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.135, 0.06, 24), m.buttons);
  btn.rotation.x = Math.PI / 2;
  btn.position.set(0, -2.8, H_R + 0.01);
  const btnRing = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.014, 6, 24), m.chrome);
  btnRing.position.set(0, -2.8, H_R + 0.02);

  // Tapa negra con gema roja, poco inclinada.
  const cap = capWithGem(m, { radius: 0.4, height: 0.2, gemR: 0.13 });
  const capDir = new THREE.Vector3(0.3, 0.95, 0.06).normalize();
  cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), capDir);
  cap.position.copy(capDir).multiplyScalar(R - 0.13);

  group.add(shell, shards, equator, halo, cup, rim, handle, panel(Math.PI / 2), panel(-Math.PI / 2), end, endSeam, btn, btnRing, cap);
  return { group, halo, metrics: { top: 1.75, bottom: BOT, radius: R, grip: -3.9 } };
}
