// ARMY Bomb "Ver. 2" (ilustración inspirada, no el diseño oficial; sin logos). A diferencia de las versiones
// nuevas, el globo NO es transparente ni lleva una esfera adentro: es una cáscara esmerilada, lechosa, que se
// ilumina entera. Collar plateado acanalado, mango cónico con dos botones ovalados y tapa superior oscura.
// No tiene Bluetooth: en LumiParty la luz la pone la pantalla.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { lathe } from "./shared.js";

/** @param {ReturnType<import("./shared.js").createMaterials>} m */
export function createArmyBombV2(m, { lowEnd = false } = {}) {
  const R = 1.45, seg = lowEnd ? 32 : 52;
  const group = new THREE.Group();
  const COLLAR_TOP = -1.05, COLLAR_BOT = -1.42, NECK_Y = -1.72, BOT = -5.5, RIBS = lowEnd ? 12 : 20;

  const shellGeo = new THREE.SphereGeometry(R, seg, Math.round(seg * 0.75));
  shellGeo.scale(1, 0.94, 1); // base un poco aplanada
  // Cáscara esmerilada opaca que brilla con el color (sin esfera interior ni emblema flotando).
  const shell = new THREE.Mesh(shellGeo, m.frostDome);
  const halo = new THREE.Sprite(m.halo);
  halo.scale.setScalar(2.8);

  // Collar plateado con estrías verticales.
  const collar = new THREE.Mesh(lathe([[0.7, COLLAR_BOT], [0.92, -1.3], [1.08, -1.14], [1.12, COLLAR_TOP], [1.0, COLLAR_TOP + 0.03]], seg), m.chrome);
  const ribs = new THREE.Mesh(
    mergeGeometries(Array.from({ length: RIBS }, (_, i) => {
      const g = new THREE.BoxGeometry(0.035, 0.3, 0.05);
      g.translate(0, -1.24, 1.02);
      g.rotateY((i / RIBS) * Math.PI * 2);
      return g;
    })),
    m.gloss,
  );
  // Mango cónico negro con dos botones ovalados.
  const handle = new THREE.Mesh(lathe([[0, BOT + 0.25], [0.52, BOT + 0.25], [0.55, BOT + 0.45], [0.62, -3.3], [0.7, NECK_Y], [0.72, COLLAR_BOT], [0, COLLAR_BOT]], seg), m.satin);
  const oval = (y) => {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.16, 4, 14), m.buttons);
    b.scale.z = 0.25;
    b.position.set(0, y, 0.66 - (y + 3) * 0.02);
    return b;
  };
  const bottom = new THREE.Mesh(lathe([[0, BOT], [0.5, BOT], [0.54, BOT + 0.05], [0.54, BOT + 0.24], [0, BOT + 0.25]], seg), m.gloss);
  // Tapa superior oscura y lisa (sin gema).
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.16, seg), m.gloss);
  top.position.y = R * 0.94 - 0.04;

  group.add(shell, halo, collar, ribs, handle, oval(-2.45), oval(-2.95), bottom, top);
  return { group, halo, metrics: { top: 1.65, bottom: BOT, radius: R, grip: -4.2 } };
}
