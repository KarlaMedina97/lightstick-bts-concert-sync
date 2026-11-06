// ARMY Bomb "Ver. 4" (ilustración inspirada, no el diseño oficial; emblema original en forma de ola).
// Proporciones medidas en fotos de producto, relativas al diámetro D del globo (9,3 cm):
// mango ≈ 0.33·D × 1.32·D (tapa de pilas ≈ 0.23·D), collar ≈ 0.49·D × 0.085·D, remate ≈ 0.32·D a ~28°
// con gema ≈ 0.09·D, botón ≈ 0.13·D × 0.21·D, largo total ≈ 2.4·D. 1 unidad ≈ 3 cm → globo r = 1.55.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { lathe, waveEmblemGeometry, capWithGem } from "./shared.js";

export const V4 = { R: 1.55, BASE_Y: -0.86, COLLAR_TOP: -1.31, COLLAR_BOT: -1.57, HANDLE_R: 0.52, HANDLE_BOT: -5.67, BTN_Y: -2.23 };

/**
 * @param {ReturnType<import("./shared.js").createMaterials>} m materiales compartidos
 * @param {{ lowEnd?: boolean }} opts
 * @returns {{ group: THREE.Group, parts: THREE.Group[], partByName: Record<string, THREE.Group>, labelAnchors: Record<string, [string, THREE.Vector3?]>, metrics: {top:number,bottom:number,radius:number,grip:number}, light: THREE.PointLight, halo: THREE.Sprite }}
 */
export function createArmyBombV4(m, { lowEnd = false } = {}) {
  const { R, BASE_Y, COLLAR_TOP, COLLAR_BOT, HANDLE_R, HANDLE_BOT, BTN_Y } = V4;
  const seg = lowEnd ? 36 : 64;
  const group = new THREE.Group();

  // Globo transparente + tinte interior muy leve + anillo de puntos bajo el remate.
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, seg, Math.round(seg * 0.75)), m.glass);
  shell.renderOrder = 3;
  const tint = new THREE.Mesh(new THREE.SphereGeometry(R - 0.05, 32, 24), m.tint);
  tint.renderOrder = 1;
  const dots = new THREE.Mesh(
    mergeGeometries(Array.from({ length: 14 }, (_, i) => {
      const g = new THREE.SphereGeometry(0.032, 6, 4);
      const a = (i / 14) * Math.PI * 2;
      g.translate(Math.cos(a) * 0.5, 1.36, Math.sin(a) * 0.5);
      return g;
    })),
    m.dots,
  );

  // Emblema original (ola) de acrílico esmerilado, con bordes que brillan y un halo de dispersión interna.
  const emblemGeo = waveEmblemGeometry({ curveSegments: lowEnd ? 8 : 14, bevelSegments: lowEnd ? 2 : 4 });
  const emblem = new THREE.Mesh(emblemGeo, m.acrylic);
  emblem.position.y = BASE_Y + 0.02;
  emblem.renderOrder = 2;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(emblemGeo, 40), m.edge);
  edges.position.copy(emblem.position);
  const halo = new THREE.Sprite(m.halo);
  halo.scale.setScalar(2.6);
  halo.position.y = 0.1;
  halo.renderOrder = 4;
  const light = new THREE.PointLight(0xffffff, 20, 12, 2);

  // Plataforma: banda ahumada, difusor esmerilado iluminado, anillo LED y 24 marcas como un reloj.
  const smoke = new THREE.Mesh(lathe([[0.78, COLLAR_TOP + 0.02], [0.95, -1.18], [1.07, -1.0], [1.1, BASE_Y - 0.06]], seg), m.smoke);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.1, 0.06, seg), m.diffuser);
  disc.position.y = BASE_Y - 0.03;
  const led = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.028, 6, 72), m.led);
  led.rotation.x = Math.PI / 2;
  led.position.y = BASE_Y + 0.005;
  const ticks = new THREE.Mesh(
    mergeGeometries(Array.from({ length: 24 }, (_, i) => {
      const g = new THREE.BoxGeometry(0.03, 0.012, 0.12);
      g.translate(0, 0, 0.84);
      g.rotateY((i / 24) * Math.PI * 2);
      return g;
    })),
    m.tick,
  );
  ticks.position.y = BASE_Y + 0.008;

  // Collar corto con bordes brillantes.
  const collar = new THREE.Mesh(
    lathe([[0.7, COLLAR_TOP + 0.03], [0.76, COLLAR_TOP], [0.77, COLLAR_TOP - 0.04], [0.77, COLLAR_BOT + 0.03], [0.74, COLLAR_BOT], [HANDLE_R, COLLAR_BOT]], seg),
    Object.assign(m.gloss.clone(), { side: THREE.DoubleSide }),
  );
  const ring = (r, t, y) => { const o = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, seg), m.chrome); o.rotation.x = Math.PI / 2; o.position.y = y; return o; };
  const rim1 = ring(0.765, 0.014, COLLAR_TOP - 0.01), rim2 = ring(0.75, 0.01, COLLAR_BOT + 0.015);

  // Mango satinado, junta de la tapa de pilas y línea de molde a lo largo.
  const SEAM_Y = HANDLE_BOT + 0.71;
  const handle = new THREE.Mesh(lathe([[0, SEAM_Y + 0.01], [HANDLE_R - 0.04, SEAM_Y + 0.01], [HANDLE_R, SEAM_Y + 0.03], [HANDLE_R, COLLAR_BOT], [0, COLLAR_BOT + 0.001]], seg), m.satin);
  const mould = new THREE.Mesh(new THREE.BoxGeometry(0.006, COLLAR_BOT - SEAM_Y - 0.06, 0.006), m.seam);
  mould.position.set(-HANDLE_R, (COLLAR_BOT + SEAM_Y) / 2, 0);
  const bottomCap = new THREE.Mesh(lathe([[0, HANDLE_BOT], [HANDLE_R - 0.08, HANDLE_BOT], [HANDLE_R - 0.03, HANDLE_BOT + 0.01], [HANDLE_R, HANDLE_BOT + 0.06], [HANDLE_R, SEAM_Y - 0.01], [0, SEAM_Y - 0.009]], seg), m.satin);
  const seam = new THREE.Mesh(new THREE.TorusGeometry(HANDLE_R + 0.002, 0.008, 6, 48), m.seam);
  seam.rotation.x = Math.PI / 2;
  seam.position.y = SEAM_Y;
  // Correa: argolla fija bajo la base y un lazo de cordón que cuelga de ella. El cordón tiene su propio pivote
  // justo en la argolla (`cord`): así se mece como una cuerda sin despegarse; la argolla nunca se mueve.
  const strap = new THREE.Group();
  const eyelet = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.022, 6, 16), m.chrome);
  eyelet.position.y = HANDLE_BOT - 0.07;
  const CORD_Y = HANDLE_BOT - 0.12;
  const cord = new THREE.Group();
  cord.position.y = CORD_Y;
  const loop = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, HANDLE_BOT - 0.12, 0), new THREE.Vector3(0.12, HANDLE_BOT - 0.4, 0.04), new THREE.Vector3(0.1, HANDLE_BOT - 0.82, 0.08),
      new THREE.Vector3(-0.06, HANDLE_BOT - 0.9, 0.06), new THREE.Vector3(-0.12, HANDLE_BOT - 0.5, 0.02), new THREE.Vector3(0, HANDLE_BOT - 0.12, 0),
    ], true), lowEnd ? 24 : 48, 0.022, 6, true),
    m.cord,
  );
  loop.geometry.translate(0, -CORD_Y, 0); // el lazo cuelga desde el pivote
  cord.add(loop);
  strap.add(eyelet, cord);

  // Dos botones: píldora vertical con contorno cromado dividida en botón superior e inferior.
  const bezel = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.3, 4, 16), m.chrome);
  bezel.scale.z = 0.2;
  bezel.position.set(0, BTN_Y, HANDLE_R - 0.02);
  const half = (up) => {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.165, 0.1, 4, 16), m.buttons);
    b.scale.set(1, 1, 0.22);
    b.position.set(0, BTN_Y + (up ? 0.13 : -0.13), HANDLE_R + 0.005);
    return b;
  };

  // Remate con gema a ~28° del eje (hacia un lado y algo al frente).
  const cap = capWithGem(m);
  const capDir = new THREE.Vector3(0.47, 0.8, 0.37).normalize();
  cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), capDir);
  cap.position.copy(capDir).multiplyScalar(R - 0.21);

  const part = (name, offset, anchor, rot, ...meshes) => {
    const g = new THREE.Group();
    g.name = name;
    g.add(...meshes);
    g.userData = { offset: new THREE.Vector3(...offset), anchor: new THREE.Vector3(...anchor), rot };
    group.add(g);
    return g;
  };
  const parts = [
    part("gem", [0.35, 2.55, 0.25], capDir.clone().multiplyScalar(R + 0.25).toArray(), [0.1, 0.6, -0.25], cap),
    part("shell", [0, 2.05, 0], [R * 0.74, R * 0.5, 0], [0, 0.5, 0.08], shell, tint, dots),
    part("emblem", [0, 0.6, 0.9], [0.7, 0.35, 0], [0, -0.35, 0], emblem, edges, halo, light),
    part("base", [0, 0, 0], [1.1, BASE_Y - 0.03, 0], [0.14, 0, 0], smoke, disc, led, ticks),
    part("collar", [0, -0.55, 0], [0.77, (COLLAR_TOP + COLLAR_BOT) / 2, 0], [0, 0, -0.12], collar, rim1, rim2),
    part("handle", [0, -1.05, 0], [HANDLE_R, -3.7, 0], [0, 0, 0.06], handle, mould, bezel, half(true), half(false)),
    part("bottom", [0, -1.75, 0], [HANDLE_R, HANDLE_BOT + 0.35, 0], [-0.22, 0, 0.1], bottomCap, seam, strap),
  ];
  const partByName = Object.fromEntries(parts.map((g) => [g.name, g]));
  const labelAnchors = {
    gem: ["gem"], shell: ["shell"], emblem: ["emblem"], base: ["base"], collar: ["collar"],
    buttons: ["handle", new THREE.Vector3(0.16, BTN_Y, HANDLE_R + 0.02)], handle: ["handle"], bottom: ["bottom"],
  };
  return { group, parts, partByName, labelAnchors, strap, cord, light, halo, metrics: { top: 1.95, bottom: HANDLE_BOT - 0.95, radius: R, grip: -4.3 } };
}
