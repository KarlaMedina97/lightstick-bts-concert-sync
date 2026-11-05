// ARMY Bomb "Ver. 3" (ilustración inspirada, no el diseño oficial). Donde el producto real lleva el logo,
// aquí va una ola original pequeña sobre un pedestal esmerilado.
// Proporciones medidas en fotos de producto (relativas al diámetro D del globo): soporte tipo corona
// ≈ 0.79·D con puntas ≈ 0.18·D, mango cónico 0.5·D → 0.39·D y ≈ 1.3·D de largo, anillo transparente
// inferior ≈ 0.43·D × 0.09·D, dos botones redondos ≈ 0.13·D apilados, remate ≈ 0.35·D casi arriba (~15°).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { lathe, waveEmblemGeometry, capWithGem } from "./shared.js";

/** @param {ReturnType<import("./shared.js").createMaterials>} m */
export function createArmyBombV3(m, { lowEnd = false } = {}) {
  const R = 1.55, seg = lowEnd ? 32 : 56;
  const group = new THREE.Group();
  const CROWN_Y = -1.0, NECK_Y = -1.62, BOT = -5.55;

  // Globo con facetas: esfera transparente + líneas de facetas muy tenues.
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, seg, Math.round(seg * 0.75)), m.glass);
  shell.renderOrder = 3;
  const facets = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(R * 1.002, 1), 1), new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.12 }));
  const tint = new THREE.Mesh(new THREE.SphereGeometry(R - 0.05, 28, 20), m.tint);

  // Emblema original pequeño sobre pedestal (en el real hay un logo: aquí no).
  const emblemGeo = waveEmblemGeometry({ variant: "small", curveSegments: lowEnd ? 8 : 12, bevelSegments: 2 });
  const emblem = new THREE.Mesh(emblemGeo, m.acrylic);
  emblem.position.y = -0.78;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(emblemGeo, 40), m.edge);
  edges.position.copy(emblem.position);
  const pedestal = new THREE.Mesh(lathe([[0, -0.8], [0.5, -0.8], [0.62, -0.95], [0.9, -1.05]], seg), m.diffuser);
  const halo = new THREE.Sprite(m.halo);
  halo.scale.setScalar(2.4);
  halo.position.y = -0.2;

  // Soporte tipo corona: copa negra brillante con puntas que abrazan el globo.
  const crown = new THREE.Mesh(lathe([[0.78, NECK_Y], [0.95, -1.35], [1.16, -1.12], [1.24, CROWN_Y], [1.16, CROWN_Y + 0.02]], seg), m.gloss);
  const teeth = new THREE.Mesh(
    mergeGeometries(Array.from({ length: 8 }, (_, i) => {
      const g = new THREE.ConeGeometry(0.32, 0.5, 3, 1);
      g.scale(1, 1, 0.22);
      g.rotateX(-0.42); // se inclina hacia dentro siguiendo la esfera
      g.translate(0, CROWN_Y + 0.2, 1.18);
      g.rotateY((i / 8) * Math.PI * 2);
      return g;
    })),
    m.gloss,
  );

  // Mango cónico satinado, dos botones redondos al frente y anillo transparente abajo.
  const handle = new THREE.Mesh(lathe([[0, BOT + 0.28], [0.6, BOT + 0.28], [0.62, BOT + 0.5], [0.7, -3.2], [0.78, NECK_Y], [0, NECK_Y]], seg), m.satin);
  const btn = (y) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 24), m.buttons);
    b.rotation.x = Math.PI / 2;
    b.position.set(0, y, 0.76 - (y - NECK_Y) * -0.03 + 0.02);
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.015, 6, 24), m.chrome);
    r.position.copy(b.position);
    return [b, r];
  };
  const [b1, r1] = btn(-2.55), [b2, r2] = btn(-3.0);
  const bottom = new THREE.Mesh(lathe([[0, BOT], [0.62, BOT], [0.67, BOT + 0.04], [0.67, BOT + 0.26], [0, BOT + 0.27]], seg), m.clearRing);

  const cap = capWithGem(m, { radius: 0.54, height: 0.22, gemR: 0.13 });
  const capDir = new THREE.Vector3(0.24, 0.96, 0.12).normalize();
  cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), capDir);
  cap.position.copy(capDir).multiplyScalar(R - 0.18);

  group.add(shell, facets, tint, emblem, edges, pedestal, halo, crown, teeth, handle, b1, r1, b2, r2, bottom, cap);
  return { group, halo, metrics: { top: 1.85, bottom: BOT, radius: 1.24 > R ? 1.24 : R, grip: -4.2 } };
}
