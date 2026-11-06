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

  // Giro: el arrastre suma velocidad; al soltar sigue con inercia y vuelve de a poco a un vaivén suave.
  const spin = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.add(spin);
  scene.add(tilt);
  const shadow = contactShadow(mats, 1.3);
  scene.add(shadow);
  let yaw = -0.5, vel = 0, pitch = 0, pitchT = 0, dragging = false, lastX = 0, lastY = 0, lastT = 0;
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY; lastT = performance.now(); vel = 0;
    canvas.setPointerCapture(e.pointerId);
    wake();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now(), dt = Math.max(8, now - lastT);
    const dx = e.clientX - lastX;
    yaw += dx * 0.012;
    vel = (dx * 0.012) / (dt / 16.7);
    pitchT = Math.max(-0.35, Math.min(0.35, pitchT + (e.clientY - lastY) * 0.004));
    lastX = e.clientX; lastY = e.clientY; lastT = now;
  });
  const up = () => { dragging = false; };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("dblclick", () => { yaw = -0.5; vel = 0; pitchT = 0; });

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
    // Centrado: el centro del alto del lightstick en el origen.
    group.position.y = -(metrics.top + metrics.bottom) / 2;
    built.light && (built.light.intensity = 0); // la luz la pone `key`
    spin.add(group);
    shadow.position.y = group.position.y + metrics.bottom - 0.25;
    current = { key: wanted, obj: group, metrics };
    fit();
    wake();
  }

  let w = 0, h = 0;
  function fit() {
    const r = mount.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Que entre entero a lo alto (y a lo ancho en pantallas angostas).
    const tall = current ? current.metrics.top - current.metrics.bottom + 1.2 : 8.6;
    const fov = (camera.fov * Math.PI) / 180;
    const byH = tall / 2 / Math.tan(fov / 2);
    const byW = (3.6 / 2) / (Math.tan(fov / 2) * camera.aspect);
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
    mats.update(color, glow);
    key.color.copy(color);
    key.intensity = 6 * glow;
    if (!dragging) {
      yaw += vel;
      vel *= Math.exp(-dt * 2.2);
      if (!reduceMotion && Math.abs(vel) < 0.002) yaw += dt * 0.25; // giro lento de vitrina
    }
    pitch += (pitchT - pitch) * (1 - Math.exp(-dt * 8));
    if (!dragging) pitchT *= Math.exp(-dt * 1.5);
    spin.rotation.y = yaw;
    tilt.rotation.x = pitch + (reduceMotion ? 0 : Math.sin(now / 1600) * 0.03);
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
