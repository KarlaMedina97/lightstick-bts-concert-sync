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
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lowEnd ? 1.25 : 1.5)); // menos píxeles: cuadros parejos al agitarlo
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

  // Como en el inicio: se sostiene con el mouse o el dedo y se agita. La mano sigue al puntero con un resorte, el
  // ARMY Bomb se inclina con la velocidad (pivota en el agarre del mango), un movimiento rápido lo sacude y al
  // soltarlo vuelve a su lugar con un vaivén. Un toque sin arrastrar lo hace latir; doble toque lo endereza.
  const hand = new THREE.Group();   // posición (sigue al puntero) e inclinación; su origen es el agarre
  // Halo con mezcla normal (no aditiva): sobre un lienzo transparente la aditiva no se ve.
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(128), color: color.clone(), transparent: true, opacity: 0.7, depthWrite: false, depthTest: false }));
  aura.renderOrder = -1;
  const spin = new THREE.Group();   // giro sobre su eje
  hand.add(spin, aura);
  hand.add(key);
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
    try { canvas.setPointerCapture(e.pointerId); } catch {} // algunos punteros (o eventos sintéticos) no se pueden capturar
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
    yaw += dx * 0.004; // gira un poco con el dedo (directo, sin saltos entre cuadros)
    spinVel = spinVel * 0.6 + (dx * 0.004) * 0.4 * (16.7 / ddt); // para que siga girando al soltar
    // Movimiento rápido: el globo destella (sin la sacudida automática, que peleaba con el arrastre y daba tirones).
    if (!reduceMotion && Math.hypot(dx, dy) / ddt > 2.2 && now - lastFlick > 450) { lastFlick = now; beat = 1; }
  });
  const up = () => {
    if (!dragging) return;
    dragging = false;
    tryMotion(); // iPhone: el permiso del giroscopio se pide con un toque
    hold.tx = hold.ty = 0;
    if (moved < 6) shake(0.5); // toque: late
  };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("dblclick", () => { yaw = -0.5; spinVel = 0; });
  // Giroscopio / acelerómetro del teléfono: inclinarlo lo inclina; sacudirlo lo agita y destella.
  const STEP = 1 / 240;
  let acc = 0;
  const motion = { tilt: 0, ax: 0, lastShake: 0, on: false };
  function onMotion(e) {
    const a = e.acceleration ?? e.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    const ax = e.acceleration ? a.x : 0; // sin gravedad: solo el movimiento
    if (!dragging && ax) motion.ax = Math.max(-60, Math.min(60, -ax * 6)); // empuja la mano como un sacudón
    const mag = Math.hypot(e.acceleration?.x ?? 0, e.acceleration?.y ?? 0, e.acceleration?.z ?? 0);
    const now = performance.now();
    if (mag > 14 && now - motion.lastShake > 350) { motion.lastShake = now; beat = 1; }
    wake();
  }
  function onOrient(e) {
    if (e.gamma == null) return;
    const angle = (screen.orientation?.angle ?? 0) % 180 ? (e.beta ?? 0) : e.gamma; // de lado o derecho
    motion.tilt = reduceMotion ? 0 : Math.max(-0.5, Math.min(0.5, (-angle / 90) * 0.7));
  }
  function startMotion() {
    if (motion.on) return;
    motion.on = true;
    addEventListener("devicemotion", onMotion);
    addEventListener("deviceorientation", onOrient);
  }
  function tryMotion() {
    if (motion.on || typeof DeviceMotionEvent === "undefined") return;
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      DeviceMotionEvent.requestPermission().then((r) => { if (r === "granted") startMotion(); }).catch(() => {});
    } else startMotion();
  }
  // Android: sin permiso que pedir, se activa solo en pantallas táctiles. iPhone: con el primer toque (tryMotion).
  if (matchMedia("(pointer: coarse)").matches && typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission !== "function") startMotion();

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
    // Física en pasos fijos de 1/240 s: el resultado no depende de cuánto tardó el cuadro (sin tirones al agitarlo).
    acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      const K = dragging ? 140 : 70, D = dragging ? 18 : 9;
      hold.vx += ((hold.tx - hold.x) * K - hold.vx * D + motion.ax) * STEP;
      hold.vy += ((hold.ty - hold.y) * K - hold.vy * D) * STEP;
      hold.x += hold.vx * STEP; hold.y += hold.vy * STEP;
      // Péndulo: se inclina contra la velocidad de la mano (y con la inclinación del teléfono) y se asienta con un vaivén.
      leanV += ((-hold.vx * 0.09 + motion.tilt - lean) * 60 - leanV * 7) * STEP;
      lean += leanV * STEP;
      pitchV += ((hold.vy * 0.05 - pitch) * 60 - pitchV * 7) * STEP;
      pitch += pitchV * STEP;
    }
    motion.ax *= Math.exp(-dt * 12);
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
      removeEventListener("devicemotion", onMotion);
      removeEventListener("deviceorientation", onOrient);
      ro?.disconnect();
      renderer.dispose();
      canvas.remove();
    },
  };
}
