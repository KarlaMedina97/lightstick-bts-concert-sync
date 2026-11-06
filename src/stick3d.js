// ARMY Bomb 3D en la vista Luces: el mismo modelo del inicio, con el color que suena en vivo.
// Se carga solo cuando la persona elige verlo (three.js pesa), gira con el dedo o el mouse (con inercia) y cambia
// de versión. Dibuja solo mientras se ve: sin la vista Luces o con la pestaña oculta no gasta batería.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createMaterials, contactShadow, glowTexture } from "./models/shared.js";

export const VERSIONS = [
  ["v4", "Ver. 4"], ["se", "SE"], ["v3", "Ver. 3"], ["v2", "Ver. 2"], ["v1", "Ver. 1"],
];
const LOADERS = {
  v4: () => import("./models/armybomb-v4.js").then((m) => m.createArmyBombV4),
  v3: () => import("./models/armybomb-v3.js").then((m) => m.createArmyBombV3),
  se: () => import("./models/armybomb-se.js").then((m) => m.createArmyBombSE),
  v2: () => import("./models/armybomb-v2.js").then((m) => m.createArmyBombV2),
  v1: () => import("./models/armybomb-v1.js").then((m) => m.createArmyBombV1),
};

/**
 * @param {HTMLElement} mount  contenedor (el canvas ocupa todo su tamaño)
 * @param {{ reduceMotion?: boolean }} [opts]
 */
export function createStick3D(mount, { reduceMotion = false } = {}) {
  const lowEnd = matchMedia("(pointer: coarse)").matches && (navigator.hardwareConcurrency ?? 8) <= 6;
  const canvas = document.createElement("canvas");
  canvas.className = "s3d-canvas";
  canvas.setAttribute("aria-hidden", "true");
  mount.append(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowEnd, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lowEnd ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 17);

  const color = new THREE.Color("#8a2be2");
  // Vidrio sin transmisión: sobre un lienzo transparente la transmisión sale negra (no hay fondo que refractar).
  const mats = createMaterials({ lowEnd: true, color });
  const key = new THREE.PointLight(color, 0, 12);
  key.position.set(0, 1.2, 3.5);
  const fill = new THREE.DirectionalLight("#ffffff", 1.1);
  fill.position.set(-4, 6, 8);
  scene.add(fill, new THREE.AmbientLight("#ffffff", 0.5));

  // Se sostiene como uno de verdad: desde el punto exacto donde se toma (globo o mango). La mano sigue al dedo 1:1;
  // el ARMY Bomb es un péndulo rígido alrededor de ese punto: la gravedad, la aceleración de la mano y la muñeca
  // (un resorte que lo quiere derecho) lo mueven. Tomado del globo, el mango cuelga y se mece; tomado del mango, la
  // muñeca lo sostiene erguido y el globo latiguea. Al batirlo, cada cambio de dirección hace destellar el globo; al
  // soltarlo sale con la inercia y vuelve a su lugar rebotando. Un toque lo hace latir; doble toque lo endereza.
  const hand = new THREE.Group();   // posición del punto de agarre
  const swing = new THREE.Group();  // péndulo (inclinación lateral y hacia adelante)
  const body = new THREE.Group();   // desplazado para que el agarre quede en el origen
  const spin = new THREE.Group();   // giro sobre su eje (su origen es el agarre del mango)
  // Halo con mezcla normal (no aditiva): sobre un lienzo transparente la aditiva no se ve.
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(128), color: color.clone(), transparent: true, opacity: 0.7, depthWrite: false, depthTest: false }));
  aura.renderOrder = -1;
  body.add(spin, aura, key);
  swing.add(body);
  hand.add(swing);
  scene.add(hand);
  const shadow = contactShadow(mats, 1.3);
  scene.add(shadow);
  // hold: dónde está el agarre (mundo) relativo a su lugar de reposo; tx/ty: hacia dónde lo lleva el dedo.
  const hold = { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, tx: 0, ty: 0, ox: 0, oy: 0, sx: 0, sy: 0 };
  let grabY = 0, grabYT = 0;        // punto de agarre a lo largo del eje (0 = agarre del mango)
  let yaw = -0.5, spinVel = 0, th = 0, thV = 0, ph = 0, phV = 0;
  let dragging = false, lastX = 0, lastT = 0, moved = 0, dirX = 0, lastBeat = 0, beat = 0, shakeT = -10, shakeAmp = 0;
  const worldPerPx = () => (2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, h);
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; moved = 0; dirX = 0;
    const r = canvas.getBoundingClientRect(), k = worldPerPx();
    // Dónde tocó, a lo largo del ARMY Bomb (en su eje, sin la inclinación): ahí queda el agarre.
    const wy = -(e.clientY - r.top - r.height / 2) * k;
    const m = current?.metrics ?? { top: 2, bottom: -5, grip: -4 };
    const along = wy - (restY + hold.y) + grabY;
    grabYT = Math.max(m.bottom - m.grip + 0.3, Math.min(m.top - m.grip - 0.2, along));
    // Sin salto: la mano pasa al nuevo punto y el cuerpo se corre lo mismo al revés.
    hold.y += grabYT - grabY; grabY = grabYT;
    hold.ox = e.clientX; hold.oy = e.clientY; hold.sx = hold.x; hold.sy = hold.y; hold.tx = hold.x; hold.ty = hold.y;
    lastX = e.clientX; lastT = performance.now();
    canvas.setPointerCapture(e.pointerId);
    wake();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now(), ddt = Math.max(1, now - lastT);
    const dx = e.clientX - lastX;
    lastX = e.clientX; lastT = now;
    moved += Math.abs(dx);
    const k = worldPerPx(), lim = visW() / 2 - 0.9;
    hold.tx = Math.max(-lim, Math.min(lim, hold.sx + (e.clientX - hold.ox) * k));
    hold.ty = Math.max(-1.4, Math.min(1.4, hold.sy - (e.clientY - hold.oy) * k));
    spinVel += dx * 0.0008;
    // Batir: al cambiar de dirección con fuerza, el globo destella (como el golpe en el concierto).
    const v = dx / ddt, d = Math.sign(v);
    if (Math.abs(v) > 0.6 && d && d !== dirX) { if (dirX && now - lastBeat > 140) { lastBeat = now; beat = 1; } dirX = d; }
  });
  const up = () => {
    if (!dragging) return;
    dragging = false;
    if (moved < 6) shake(0.5); // toque: late
    grabYT = 0; // vuelve a "sostenerlo del mango"
  };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("dblclick", () => { yaw = -0.5; spinVel = 0; th = ph = thV = phV = 0; });
  function shake(a = 1) {
    if (reduceMotion) a *= 0.3;
    shakeT = performance.now() / 1000;
    shakeAmp = a;
    beat = 1;
  }
  const visW = () => 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;

  let current = null, wanted = null, loadingKey = null;
  async function setVersion(k) {
    wanted = LOADERS[k] ? k : "v4";
    if (current?.key === wanted || loadingKey === wanted) return;
    loadingKey = wanted;
    const make = await LOADERS[wanted]();
    if (loadingKey !== wanted) return; // la persona eligió otra mientras cargaba
    loadingKey = null;
    const built = make(mats, { lowEnd: true }); // la versión de alto detalle usa vidrio con transmisión, que sobre lienzo transparente sale negra
    if (current) { spin.remove(current.obj); current.obj.traverse((o) => o.geometry?.dispose?.()); }
    const { group, metrics } = built;
    // Pivote en el agarre (como una mano que lo sostiene); el conjunto queda centrado en la vista.
    group.position.y = -metrics.grip;
    built.light && (built.light.intensity = 0); // la luz la pone `key`
    spin.add(group);
    // Resplandor del globo: va dentro de la mano (se mueve, se inclina y se agita con el ARMY Bomb).
    globeY = metrics.top - metrics.radius * 1.05 - metrics.grip;
    aura.position.set(0, globeY, 0);
    aura.scale.setScalar(metrics.radius * 4.2); // sin llegar al borde del lienzo (se veía cortado en recto)
    key.position.set(0, globeY, 1.2);
    restY = metrics.grip - (metrics.top + metrics.bottom) / 2;
    shadow.position.y = -(metrics.top - metrics.bottom) / 2 - 0.35;
    current = { key: wanted, obj: group, metrics };
    fit();
    wake();
  }

  let w = 0, h = 0, restY = 0, globeY = 0;
  function fit() {
    const r = mount.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Que entre entero a lo alto (y a lo ancho en pantallas angostas).
    const tall = current ? current.metrics.top - current.metrics.bottom + 2.6 : 10; // aire para moverlo y agitarlo
    const fov = (camera.fov * Math.PI) / 180;
    const byH = tall / 2 / Math.tan(fov / 2);
    const byW = (5.4 / 2) / (Math.tan(fov / 2) * camera.aspect); // ancho para el vaivén (±1,6) más el globo
    camera.position.z = Math.max(byH, byW);
    camera.updateProjectionMatrix();
  }
  const ro = "ResizeObserver" in window ? new ResizeObserver(() => { fit(); wake(); }) : null;
  ro?.observe(mount);

  const target = new THREE.Color("#8a2be2");
  let glow = 1, glowT = 1;
  /** Color que manda el bucle de sincronía (0–255) — el mismo que va al ARMY Bomb. */
  function setColor(rgb) {
    target.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace);
    glowT = Math.min(1.4, 0.35 + (Math.max(...rgb) / 255) * 1.05);
  }

  let raf = 0, running = false, t0 = performance.now();
  function frame(now) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (now - t0) / 1000);
    t0 = now;
    color.lerp(target, 1 - Math.exp(-dt * 18)); // sigue al color casi al instante, sin parpadeo de cuadros
    glow += (glowT - glow) * (1 - Math.exp(-dt * 14));
    mats.update(color, glow + beat * 0.5);
    key.color.copy(color);
    key.intensity = 6 * glow;
    aura.material.color.copy(color);
    aura.material.opacity = Math.min(0.95, 0.35 + 0.4 * (glow + beat * 0.5));
    // Mano: pegada al dedo mientras se sostiene; al soltar, sale con su inercia y un resorte la trae de vuelta.
    const pvx = hold.vx, pvy = hold.vy;
    if (dragging) {
      const f = 1 - Math.exp(-dt * 38);
      const nx = hold.x + (hold.tx - hold.x) * f, ny = hold.y + (hold.ty - hold.y) * f;
      hold.vx = (nx - hold.x) / Math.max(dt, 1e-3); hold.vy = (ny - hold.y) / Math.max(dt, 1e-3);
      hold.x = nx; hold.y = ny;
    } else {
      hold.vx += (-hold.x * 38 - hold.vx * 5.5) * dt;
      hold.vy += (-(hold.y - grabY) * 38 - hold.vy * 5.5) * dt;
      hold.x += hold.vx * dt; hold.y += hold.vy * dt;
    }
    // Aceleración de la mano (suavizada): es lo que empuja al péndulo.
    hold.ax += ((hold.vx - pvx) / Math.max(dt, 1e-3) - hold.ax) * (1 - Math.exp(-dt * 30));
    hold.ay += ((hold.vy - pvy) / Math.max(dt, 1e-3) - hold.ay) * (1 - Math.exp(-dt * 30));
    // Al soltar, el agarre vuelve al mango sin que el ARMY Bomb salte (la mano se corre lo mismo).
    if (!dragging && Math.abs(grabY) > 1e-3) { const g0 = grabY; grabY += (0 - grabY) * (1 - Math.exp(-dt * 4)); hold.y += grabY - g0; }
    // Péndulo rígido alrededor del agarre: d = del agarre al centro de masa (positivo: el centro queda arriba).
    const m = current?.metrics ?? { top: 2, bottom: -5, grip: -4 };
    const d = (m.top + m.bottom) / 2 - m.grip - grabY;
    // La muñeca siempre gana a la gravedad cuando el centro queda arriba (si no, se "cae" de la mano).
    const G = 14, I = d * d + 1.6, wrist = (dragging ? 22 : 60) + G * Math.max(0, d) * 1.15;
    // Amortiguación proporcional a la rigidez: en la mano se mece (zeta 0,3); al soltarlo se asienta en ~1 s (0,6).
    const damp = (dragging ? 0.3 : 0.6) * 2 * Math.sqrt(wrist * I);
    const ax = Math.max(-80, Math.min(80, hold.ax)); // sin picos al soltar
    const thA = (G * d * Math.sin(th) - ax * d * Math.cos(th) - wrist * th - damp * thV) / I;
    thV += thA * dt; th += thV * dt;
    th = Math.max(-1.25, Math.min(1.25, th));
    const phA = (-hold.ay * 0.05 - 40 * ph - 6 * phV); // un poco hacia adelante/atrás al subir y bajar
    phV += phA * dt; ph += phV * dt;
    // Latido de un toque: unas oscilaciones rápidas que se apagan.
    const st = now / 1000 - shakeT;
    const sh = st < 1.2 ? Math.sin(st * 38) * Math.exp(-st * 5) * 0.22 * shakeAmp : 0;
    yaw += spinVel;
    spinVel *= Math.exp(-dt * 2.4);
    if (!reduceMotion && !dragging && Math.abs(spinVel) < 0.002) yaw += dt * 0.25; // giro lento de vitrina
    spin.rotation.y = yaw;
    body.position.y = -grabY;
    hand.position.set(hold.x, restY + hold.y, 0);
    swing.rotation.set(Math.max(-0.4, Math.min(0.4, ph)) + (reduceMotion ? 0 : Math.sin(now / 1600) * 0.03), 0, -th + sh);
    shadow.position.x = hold.x * 0.8;
    shadow.scale.setScalar(1 - Math.min(0.4, Math.max(0, hold.y - grabY) * 0.3));
    beat *= Math.exp(-dt * 6);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (running && !raf) { t0 = performance.now(); raf = requestAnimationFrame(frame); }
  }
  let wantActive = false;
  function apply() {
    running = wantActive && !document.hidden;
    if (running) { fit(); wake(); } else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function setActive(on) { wantActive = on; apply(); }
  document.addEventListener("visibilitychange", apply);

  return {
    setVersion, setColor, setActive,
    get version() { return wanted; },
    dispose() {
      setActive(false);
      ro?.disconnect();
      renderer.dispose();
      canvas.remove();
    },
  };
}
