// ARMY Bomb "Special Edition" (ilustración inspirada, no el diseño oficial). El producto real tiene una
// esfera interior lechosa con un logo impreso: aquí es una cúpula esmerilada lisa, sin ninguna marca.
// Proporciones medidas en una foto de producto (relativas al diámetro D del globo): esfera interior
// ≈ 0.9·D, cuello cónico 0.49·D → 0.29·D y ≈ 0.18·D de alto, mango recto ≈ 0.29·D, tapa inferior
// ≈ 0.25·D con junta, botón corto ≈ 0.12·D × 0.10·D y botón largo ≈ 0.12·D × 0.22·D, remate ≈ 0.27·D a ~35°.
// Largo total: la foto da ≈ 2.8·D y la ficha (95,2 × 226,9 mm) ≈ 2.4·D; se usa un punto medio (≈ 2.55·D).
import * as THREE from "three";
import { lathe, capWithGem } from "./shared.js";

/** @param {ReturnType<import("./shared.js").createMaterials>} m */
export function createArmyBombSE(m, { lowEnd = false } = {}) {
  const R = 1.55, seg = lowEnd ? 32 : 56;
  const group = new THREE.Group();
  const FUNNEL_TOP = -1.3, FUNNEL_BOT = -1.86, H_R = 0.45, BOT = -6.05, SEAM = BOT + 0.78;

  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, seg, Math.round(seg * 0.75)), m.glass);
  shell.renderOrder = 3;
  // Cúpula interior esmerilada que se ilumina con el color (sin logo).
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R * 0.9, seg, Math.round(seg * 0.75)), m.frostDome);
  const halo = new THREE.Sprite(m.halo);
  halo.scale.setScalar(3.2);

  // Cuello cónico negro brillante y mango recto satinado.
  const funnel = new THREE.Mesh(lathe([[H_R, FUNNEL_BOT], [0.58, -1.6], [0.72, -1.4], [0.76, FUNNEL_TOP], [0.6, FUNNEL_TOP + 0.04]], seg), m.gloss);
  const handle = new THREE.Mesh(lathe([[0, SEAM + 0.01], [H_R - 0.03, SEAM + 0.01], [H_R, SEAM + 0.03], [H_R, FUNNEL_BOT], [0, FUNNEL_BOT + 0.001]], seg), m.satin);
  const bottom = new THREE.Mesh(lathe([[0, BOT], [H_R - 0.06, BOT], [H_R, BOT + 0.05], [H_R, SEAM - 0.01], [0, SEAM - 0.009]], seg), m.satin);
  const seam = new THREE.Mesh(new THREE.TorusGeometry(H_R + 0.002, 0.008, 6, 40), m.seam);
  seam.rotation.x = Math.PI / 2;
  seam.position.y = SEAM;
  // Botones: uno corto redondeado arriba y uno largo tipo píldora debajo, con contorno.
  const pillBtn = (w, h, y) => {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(w / 2, Math.max(0.01, h - w), 4, 16), m.buttons);
    b.scale.z = 0.25;
    b.position.set(0, y, H_R + 0.005);
    const rim = new THREE.Mesh(new THREE.CapsuleGeometry(w / 2 + 0.03, Math.max(0.01, h - w), 4, 16), m.chrome);
    rim.scale.z = 0.18;
    rim.position.set(0, y, H_R - 0.02);
    return [b, rim];
  };
  const [bu, ru] = pillBtn(0.36, 0.32, -2.55), [bl, rl] = pillBtn(0.36, 0.68, -3.25);

  const cap = capWithGem(m, { radius: 0.42, height: 0.2, gemR: 0.12 });
  const capDir = new THREE.Vector3(0.57, 0.8, 0.2).normalize();
  cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), capDir);
  cap.position.copy(capDir).multiplyScalar(R - 0.17);

  group.add(shell, dome, halo, funnel, handle, bottom, seam, bu, ru, bl, rl, cap);
  return { group, halo, metrics: { top: 1.8, bottom: BOT, radius: R, grip: -4.6 } };
}
