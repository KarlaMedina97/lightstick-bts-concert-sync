// ARMY Bomb 3D en la vista Luces: el mismo modelo del inicio, con el color que suena en vivo.
// Se carga solo cuando la persona elige verlo (three.js pesa), gira con el dedo o el mouse (con inercia) y cambia
// de versión. Dibuja solo mientras se ve: sin la vista Luces o con la pestaña oculta no gasta batería.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createMaterials, contactShadow } from "./models/shared.js";

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
  scene.add(key, fill, new THREE.AmbientLight("#ffffff", 0.5));

  // Como en el inicio: se sostiene con el mouse o el dedo y se agita. La mano sigue al puntero con un resorte, el
  // ARMY Bomb se inclina con la velocidad (pivota en el agarre del mango), un movimiento rápido lo sacude y al
  // soltarlo vuelve a su lugar con un vaivén. Un toque sin arrastrar lo hace latir; doble toque lo endereza.
  const hand = new THREE.Group();   // posición (sigue al puntero) e inclinación; su origen es el agarre
  const spin = new THREE.Group();   // giro sobre su eje
  hand.add(spin);
  scene.add(hand);
  const shadow = contactShadow(mats, 1.3);
  scene.add(shadow);
  const hold = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, ox: 0, oy: 0 };
  let yaw = -0.5, spinVel = 0, lean = 0, leanV = 0, pitch = 0, pitchV = 0;
  let dragging = false, lastX = 0, lastY = 0, lastT = 0, moved = 0, shakeT = -10, shakeAmp = 0, lastFlick = 0, beat = 0;
  const worldPerPx = () => (2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, h);
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; moved = 0;
    lastX = hold.ox = e.clientX; lastY = hold.oy = e.clientY; lastT = performance.now();
    hold.tx = hold.x; hold.ty = hold.y;
    canvas.setPointerCapture(e.pointerId);
    wake();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now(), ddt = Math.max(1, now - lastT);
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    moved += Math.abs(dx) + Math.abs(dy);
    const k = worldPerPx();
    hold.tx = Math.max(-1.6, Math.min(1.6, (e.clientX - hold.ox) * k));
    hold.ty = Math.max(-0.9, Math.min(0.9, -(e.clientY - hold.oy) * k));
    spinVel = dx * 0.004; // gira un poco, pero lo principal es moverlo
    if (!reduceMotion && Math.hypot(dx, dy) / ddt > 2.2 && now - lastFlick > 450) { lastFlick = now; shake(1); }
  });
  const up = () => {
    if (!dragging) return;
    dragging = false;
    hold.tx = hold.ty = 0;
    if (moved < 6) shake(0.5); // toque: late
  };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("dblclick", () => { yaw = -0.5; spinVel = 0; });
  function shake(a = 1) {
    if (reduceMotion) a *= 0.3;
    shakeT = performance.now() / 1000;
    shakeAmp = a;
    beat = 1; // destello del globo con la sacudida (suave: el modo seguro limita los destellos del ARMY Bomb real, no este)
  }

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
    restY = metrics.grip - (metrics.top + metrics.bottom) / 2;
    shadow.position.y = -(metrics.top - metrics.bottom) / 2 - 0.35;
    current = { key: wanted, obj: group, metrics };
    fit();
    wake();
  }

  let w = 0, h = 0, restY = 0;
  function fit() {
    const r = mount.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Que entre entero a lo alto (y a lo ancho en pantallas angostas).
    const tall = current ? current.metrics.top - current.metrics.bottom + 2.2 : 9.6; // aire para moverlo y agitarlo
    const fov = (camera.fov * Math.PI) / 180;
    const byH = tall / 2 / Math.tan(fov / 2);
    const byW = (5.2 / 2) / (Math.tan(fov / 2) * camera.aspect);
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
    // Mano: resorte hacia el puntero (o de vuelta al centro al soltar).
    const K = dragging ? 140 : 70, D = dragging ? 18 : 9;
    hold.vx += ((hold.tx - hold.x) * K - hold.vx * D) * dt;
    hold.vy += ((hold.ty - hold.y) * K - hold.vy * D) * dt;
    hold.x += hold.vx * dt; hold.y += hold.vy * dt;
    // Péndulo: se inclina contra la velocidad de la mano y se asienta con un vaivén.
    leanV += ((-hold.vx * 0.09 - lean) * 60 - leanV * 7) * dt;
    lean += leanV * dt;
    pitchV += ((hold.vy * 0.05 - pitch) * 60 - pitchV * 7) * dt;
    pitch += pitchV * dt;
    // Sacudida de concierto: unas oscilaciones rápidas que se apagan.
    const st = now / 1000 - shakeT;
    const sh = st < 1.2 ? Math.sin(st * 38) * Math.exp(-st * 5) * 0.32 * shakeAmp : 0;
    yaw += spinVel;
    spinVel *= Math.exp(-dt * 2.4);
    if (!reduceMotion && !dragging && Math.abs(spinVel) < 0.002) yaw += dt * 0.25; // giro lento de vitrina
    spin.rotation.y = yaw;
    hand.position.set(hold.x, restY + hold.y + (st < 1.2 ? Math.abs(sh) * 0.25 : 0), 0);
    hand.rotation.set(Math.max(-0.5, Math.min(0.5, pitch)) + (reduceMotion ? 0 : Math.sin(now / 1600) * 0.03), 0, Math.max(-0.7, Math.min(0.7, lean)) + sh);
    shadow.position.x = hold.x * 0.8;
    shadow.scale.setScalar(1 - Math.min(0.4, Math.max(0, hold.y) * 0.3));
    beat *= Math.exp(-dt * 5);
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
