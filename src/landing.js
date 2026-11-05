// Landing: ARMY Bomb 3D (three.js) que gira y se mueve como en la mano de una fan al ritmo de la intro de la
// canción destacada; con el scroll (GSAP + ScrollTrigger) se desarma, viaja entre capítulos, se junta con las
// otras versiones y termina en el océano de lightsticks. Ilustraciones inspiradas, no los diseños oficiales:
// los emblemas son originales (una ola), nunca el logo de BTS.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { FEATURED } from "./config.js";
import { ALBUMS, CONCERT_FILMS } from "./catalog.js";
import { MEMBERS, chantStepMs } from "./fanchant.js";
import { MicSync } from "./mic.js";
import { spanishClone, localize } from "./i18n.js";
import { createMaterials, glowTexture, contactShadow } from "./models/shared.js";
import { createArmyBombV4 } from "./models/armybomb-v4.js";

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const params = new URLSearchParams(location.search);
// Solo para pruebas con capturas: ?shot=<px> salta a esa posición sin suavizado ni animaciones de entrada.
const SHOT = params.get("shot");
const canvas = document.getElementById("scene");
const mobileQ = () => innerWidth < 720;
const LOW_END = innerWidth < 720 || (navigator.hardwareConcurrency || 8) <= 4 || (SHOT !== null && params.has("lite"));
// Gama baja de verdad (pocos núcleos o poca memoria): sin bloom desde el inicio y resolución 1×.
const VERY_LOW = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;
const $ = (id) => document.getElementById(id);

// Tarjetas de piezas y versiones: además de resaltar el modelo 3D, su texto se anuncia en #card-status
// (lector de pantalla). Cada pieza va en su propio nodo con el texto en español de la tarjeta, así i18n.js
// la traduce con el diccionario. Con espera corta: varios toques seguidos solo anuncian el último.
{
  const status = $("card-status");
  let timer = 0, last = null, lastAt = 0;
  const announce = (card) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const now = performance.now();
      if (card === last && now - lastAt < 2000) return; // la misma tarjeta otra vez: no repetir
      last = card; lastAt = now;
      const es = spanishClone(card);
      const pieces = [es.querySelector("b"), es.querySelector("b ~ span")].filter(Boolean).map((n) => {
        const s = document.createElement("span");
        s.textContent = n.textContent.trim();
        return s;
      });
      status.replaceChildren();
      pieces.forEach((s, i) => { if (i) status.append(": "); status.append(s); });
    }, 300);
  };
  if (status) document.addEventListener("click", (e) => { const c = e.target.closest?.(".part-card, .ver-card"); if (c) announce(c); });
}
const clamp01 = (v) => Math.min(1, Math.max(0, v));

const PALETTE = ["#8a2be2", "#4fc3f7", "#ff80ab", "#ffd600", "#7c4dff", "#00e5ff", "#ff3d00", "#e0f7fa"].map((c) => new THREE.Color(c));
const featuredAlbum = ALBUMS.find((a) => a.songs.some((s) => s.id === FEATURED.songId));
if (featuredAlbum) PALETTE.splice(1, 0, ...featuredAlbum.palette.map((c) => new THREE.Color(c)));

// ---------- Modo seguro (por defecto: máximo 3 cambios/destellos por segundo, sin sacudidas) ----------
const SAFE_KEY = "pws.landing.safe";
let safeMode = true;
try { const v = localStorage.getItem(SAFE_KEY); if (v !== null) safeMode = v === "1"; } catch {}
if (reduceMotion) safeMode = true;

// ---------- Enlaces de la misma página: scroll suave con margen para la barra fija ----------
function focusTarget(el) {
  const h = el.matches("h1, h2, h3, main") ? el : el.querySelector("h1, h2, h3");
  const f = h ?? el;
  if (!f.hasAttribute("tabindex")) f.setAttribute("tabindex", "-1");
  f.focus({ preventScroll: true });
}
function scrollToTarget(el, hash) {
  const y = el ? el.getBoundingClientRect().top + scrollY - (mobileQ() ? 56 : 70) : 0;
  scrollTo({ top: Math.max(0, y), behavior: reduceMotion ? "instant" : "smooth" });
  history.replaceState(null, "", hash || location.pathname + location.search);
  const done = () => focusTarget(el ?? document.getElementById("hero-title"));
  if ("onscrollend" in window && !reduceMotion) addEventListener("scrollend", done, { once: true });
  else setTimeout(done, reduceMotion ? 0 : 700);
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const href = a.getAttribute("href");
  if (a.hasAttribute("data-scroll-top")) { e.preventDefault(); scrollToTarget(null, ""); return; }
  if (href?.startsWith("#") && href.length > 1) {
    const el = document.getElementById(href.slice(1));
    if (!el) return;
    e.preventDefault();
    scrollToTarget(el, href);
  }
});

// ---------- Cabecera: fondo de vidrio y borde en cuanto hay scroll ----------
{
  const nav = document.querySelector(".nav");
  const onScroll = () => nav?.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// ---------- Datos reales del catálogo ----------
const STATS = { albums: ALBUMS.length, songs: ALBUMS.reduce((n, a) => n + a.songs.length, 0), concerts: CONCERT_FILMS.length };
for (const [k, v] of Object.entries(STATS)) { const el = document.querySelector(`[data-stat="${k}"]`); if (el) { el.textContent = String(v); el.dataset.count = String(v); } }

// ---------- Escena ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW_END, powerPreference: "high-performance" });
} catch {
  canvas.remove();
}

const color = PALETTE[0].clone();
const glow = { intensity: 1 };
const show = { live: 0, progress: 0, step: 0, burst: 0, burstT: -10, beatKick: 0 };
const demo = { active: false, color: new THREE.Color("#8a2be2"), energy: 0.55, gesture: "sway", until: 0 };
let api = null; // funciones de la escena que usa la interfaz (si hay WebGL)

if (renderer) {
  renderer.setPixelRatio(VERY_LOW ? 1 : Math.min(devicePixelRatio, mobileQ() ? 1.25 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.documentElement.classList.add("has3d");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#05061a");
  scene.fog = new THREE.Fog("#070823", 18, 74);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 140);
  camera.position.set(0, 0.4, 11);
  // Reflejos reales: entorno de estudio filtrado (PMREM). En teléfonos, menos resolución.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();

  scene.add(new THREE.AmbientLight("#8090ff", 0.22));
  const key = new THREE.DirectionalLight("#ffffff", 1.2);
  key.position.set(4, 6, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#7c4dff", 1.4);
  rim.position.set(-6, 2, -4);
  scene.add(rim);

  // ---------- Fondo: arena con cielo degradado, estructura, rigs de luces, haces, bruma, bokeh y confeti ----------
  const glowTex = glowTexture(64);
  const mood = { beam: 0.5, speed: 0.6, haze: 0.5, glow: 0.6, confetti: 0 };
  const MOODS = {
    hero: { beam: 0.55, speed: 0.6, haze: 0.5, glow: 0.7, confetti: 0 },
    calm: { beam: 0.12, speed: 0.22, haze: 0.35, glow: 0.35, confetti: 0 },
    party: { beam: 1, speed: 1.5, haze: 0.75, glow: 1.1, confetti: 0 },
    show: { beam: 0.45, speed: 0.6, haze: 0.5, glow: 0.6, confetti: 0 },
    climax: { beam: 1, speed: 1.05, haze: 0.85, glow: 1.3, confetti: 1 },
  };
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 140),
    new THREE.ShaderMaterial({
      depthWrite: false,
      uniforms: { uGlow: { value: new THREE.Color("#5a2bd6") }, uAmt: { value: 0.6 }, uTime: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `varying vec2 vUv; uniform vec3 uGlow; uniform float uAmt; uniform float uTime;
        void main(){
          vec3 top = vec3(0.012,0.014,0.05), mid = vec3(0.03,0.025,0.1);
          float y = vUv.y;
          vec3 c = mix(mid, top, smoothstep(0.42, 0.9, y));
          float h = exp(-pow((y-0.42)*7.0, 2.0)) * (0.7 + 0.3*sin(vUv.x*9.0 + uTime*0.2));
          float r = exp(-pow((vUv.x-0.5)*2.2, 2.0));
          c += uGlow * h * r * uAmt * 0.55;
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  sky.position.set(0, 8, -72);
  sky.renderOrder = -10;
  scene.add(sky);
  // Estructura del recinto: arcos del techo y torres de truss (siluetas lejanas).
  const trussPts = [];
  for (let k = 0; k < 3; k++) {
    const rr = 44 + k * 3, yy = 9 + k * 2.4;
    for (let i = 0; i < 40; i++) {
      const a0 = -1.15 + (i / 40) * 2.3, a1 = -1.15 + ((i + 1) / 40) * 2.3;
      trussPts.push(Math.sin(a0) * rr, yy + Math.cos(a0 * 1.2) * 4, 4 - Math.cos(a0) * rr, Math.sin(a1) * rr, yy + Math.cos(a1 * 1.2) * 4, 4 - Math.cos(a1) * rr);
    }
  }
  for (const x of [-26, -14, 14, 26]) {
    for (let j = 0; j < 8; j++) trussPts.push(x - 0.6, -4 + j * 2.2, -34, x + 0.6, -4 + (j + 1) * 2.2, -34, x + 0.6, -4 + j * 2.2, -34, x - 0.6, -4 + (j + 1) * 2.2, -34);
  }
  const truss = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(trussPts, 3)), new THREE.LineBasicMaterial({ color: "#3a3270", transparent: true, opacity: 0.55, fog: true }));
  scene.add(truss);
  // Rigs: focos pequeños a lo largo de la estructura.
  const rigPts = [], rigCol = [];
  for (let i = 0; i < 46; i++) {
    const a = -1.1 + (i / 45) * 2.2, rr = 45;
    rigPts.push(Math.sin(a) * rr, 12.5 + Math.cos(a * 1.2) * 4, 4 - Math.cos(a) * rr);
    const warm = i % 3 === 0;
    rigCol.push(warm ? 1 : 0.75, warm ? 0.85 : 0.7, 1);
  }
  const rigs = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(rigPts, 3)).setAttribute("color", new THREE.Float32BufferAttribute(rigCol, 3)),
    new THREE.PointsMaterial({ size: 1.6, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }),
  );
  scene.add(rigs);
  // Haces de luz "volumétricos": conos aditivos con caída suave que barren con la música.
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color("#b98cff") }, uAmt: { value: 0.5 } },
    vertexShader: "varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }",
    fragmentShader: "varying vec2 vUv; varying vec3 vN; varying vec3 vV; uniform vec3 uColor; uniform float uAmt; void main(){ float edge = pow(abs(dot(vN, vV)), 1.6); float fall = pow(vUv.y, 1.8); gl_FragColor = vec4(uColor * edge * fall * uAmt * 0.32, 1.0); }",
  });
  const beams = [];
  const BEAMS = LOW_END ? 5 : 9;
  for (let i = 0; i < BEAMS; i++) {
    const g = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 4.6, 42, 20, 1, true), beamMat);
    cone.position.y = -21;
    g.add(cone);
    const a = -0.9 + (i / (BEAMS - 1)) * 1.8;
    g.position.set(Math.sin(a) * 40, 15 + Math.cos(a * 1.2) * 3, 4 - Math.cos(a) * 40);
    g.userData = { base: a, phase: i * 1.7 };
    beams.push(g);
    scene.add(g);
  }
  // Bruma en capas (planos con manchas suaves que se desplazan).
  const hazeTex = (() => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 128;
    const g = c.getContext("2d");
    // Manchas que se repiten sin costura en X (se dibujan también a ±256) y que se desvanecen arriba y
    // abajo: así los planos de bruma nunca muestran bordes rectos ("cuadros") sobre la escena.
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * 256, y = 50 + Math.random() * 28, r = 18 + Math.random() * 30;
      for (const ox of [-256, 0, 256]) {
        const grd = g.createRadialGradient(x + ox, y, 0, x + ox, y, r);
        grd.addColorStop(0, "rgba(255,255,255,.16)");
        grd.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = grd;
        g.fillRect(0, 0, 256, 128);
      }
    }
    const mask = g.createLinearGradient(0, 0, 0, 128);
    mask.addColorStop(0, "rgba(0,0,0,0)");
    mask.addColorStop(0.3, "rgba(0,0,0,1)");
    mask.addColorStop(0.7, "rgba(0,0,0,1)");
    mask.addColorStop(1, "rgba(0,0,0,0)");
    g.globalCompositeOperation = "destination-in";
    g.fillStyle = mask;
    g.fillRect(0, 0, 256, 128);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    return t;
  })();
  const hazes = [0, 1, 2].map((i) => {
    const mat = new THREE.MeshBasicMaterial({ map: hazeTex, color: "#7d5cff", transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(120, 26), mat);
    p.position.set(0, -2 + i * 2.5, -22 - i * 14);
    p.userData.speed = 0.004 + i * 0.002;
    scene.add(p);
    return p;
  });
  // Bokeh de luces lejanas.
  const bokehPts = [], bokehCol = [];
  for (let i = 0; i < (LOW_END ? 40 : 90); i++) {
    bokehPts.push((Math.random() - 0.5) * 120, -1 + Math.random() * 14, -48 - Math.random() * 18);
    const c = PALETTE[i % PALETTE.length];
    bokehCol.push(c.r, c.g, c.b);
  }
  const bokeh = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(bokehPts, 3)).setAttribute("color", new THREE.Float32BufferAttribute(bokehCol, 3)),
    new THREE.PointsMaterial({ size: 3.2, map: glowTex, vertexColors: true, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
  );
  scene.add(bokeh);
  // Confeti para el clímax.
  const CONF = LOW_END ? 110 : 240;
  const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.9 }), CONF);
  const confData = Array.from({ length: CONF }, (_, i) => ({ x: (Math.random() - 0.5) * 22, y: Math.random() * 16 - 4, z: 2 - Math.random() * 14, s: 0.6 + Math.random() * 1.2, r: Math.random() * 6, w: 1 + Math.random() * 3 }));
  confData.forEach((_, i) => confetti.setColorAt(i, new THREE.Color().setHSL(0.72 + Math.random() * 0.3, 0.8, 0.65)));
  confetti.visible = false;
  confetti.frustumCulled = false;
  scene.add(confetti);
  const _cm = new THREE.Matrix4(), _cq = new THREE.Quaternion(), _ce = new THREE.Euler(), _cp = new THREE.Vector3(), _cs = new THREE.Vector3(1, 1, 1);
  function updateBackground(t, dt, beatPulse) {
    sky.material.uniforms.uTime.value = t;
    sky.material.uniforms.uGlow.value.copy(color).lerp(new THREE.Color("#5a2bd6"), 0.35);
    sky.material.uniforms.uAmt.value = mood.glow * (0.8 + 0.4 * beatPulse);
    beamMat.uniforms.uColor.value.copy(color).lerp(new THREE.Color("#ffffff"), 0.35);
    beamMat.uniforms.uAmt.value = mood.beam * (0.75 + 0.5 * beatPulse);
    const sp = reduceMotion ? 0 : mood.speed;
    for (const g of beams) {
      g.rotation.z = Math.sin(t * 0.6 * sp + g.userData.phase) * 0.45 - g.userData.base * 0.55;
      g.rotation.x = 0.5 + Math.sin(t * 0.43 * sp + g.userData.phase * 0.7) * 0.18;
    }
    for (const p of hazes) {
      p.material.map.offset.x += reduceMotion ? 0 : p.userData.speed * dt * (0.5 + mood.speed);
      p.material.opacity = 0.12 + 0.22 * mood.haze;
      p.material.color.copy(color).lerp(new THREE.Color("#5a46c8"), 0.5);
    }
    rigs.material.opacity = 0.5 + 0.5 * Math.max(mood.beam, beatPulse);
    bokeh.material.size = 3.2 + (reduceMotion ? 0 : Math.sin(t * 0.7) * 0.3);
    const on = mood.confetti > 0.05 && !reduceMotion;
    confetti.visible = on;
    if (on) {
      confetti.material.opacity = 0.9 * mood.confetti;
      confData.forEach((d, i) => {
        d.y -= dt * d.s * 1.4;
        d.r += dt * d.w;
        if (d.y < -6) { d.y = 10 + Math.random() * 4; d.x = (Math.random() - 0.5) * 22; }
        _ce.set(d.r, d.r * 0.7, d.r * 0.3);
        _cq.setFromEuler(_ce);
        _cp.set(d.x + Math.sin(t + i) * 0.4, d.y, d.z);
        confetti.setMatrixAt(i, _cm.compose(_cp, _cq, _cs));
      });
      confetti.instanceMatrix.needsUpdate = true;
    }
  }

  // ---------- Lightstick principal (Ver. 4) ----------
  const mats = createMaterials({ lowEnd: LOW_END, color });
  const v4 = createArmyBombV4(mats, { lowEnd: LOW_END });
  const stick = v4.group;
  const PARTS = v4.parts, partByName = v4.partByName, R = v4.metrics.radius;
  // Jerarquía: pivote (pose del scroll) → mano (agarre en el tercio inferior del mango) → lightstick.
  const STICK_Y = 1.65, GRIP = v4.metrics.grip;
  const pivot = new THREE.Group();
  const hand = new THREE.Group();
  hand.position.y = STICK_Y + GRIP;
  stick.position.y = -GRIP;
  hand.add(stick);
  pivot.add(hand);
  const shadow = contactShadow(mats, 1.3);
  shadow.position.y = STICK_Y + v4.metrics.bottom - 0.2;
  pivot.add(shadow);
  scene.add(pivot);
  // Estela de luz del globo en los movimientos más fuertes.
  const trail = Array.from({ length: 5 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: color.clone(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(s);
    return s;
  });
  const trailHist = [];

  // ---------- Océano de luces (público) ----------
  function miniStickGeometry() {
    const globe = new THREE.IcosahedronGeometry(0.2, 0);
    globe.translate(0, 0.62, 0);
    const stem = new THREE.CylinderGeometry(0.05, 0.04, 0.48, 4, 1, true).toNonIndexed();
    stem.translate(0, 0.26, 0);
    const paint = (g, v) => g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(v), 3));
    paint(globe, 1);
    paint(stem, 0.04);
    return mergeGeometries([globe, stem]);
  }
  const seats = [];
  const STAGE_Z = 4, FLOOR_Y = -5.0, R_MIN = 9, R_MAX = 37;
  const crowdSpacing = mobileQ() ? 0.95 : 0.66;
  for (let r = R_MIN; r < 24.5; r += crowdSpacing) {
    const span = Math.min(1.3, 26 / r);
    for (let a = -span; a <= span; a += crowdSpacing / r) {
      const j = (Math.random() - 0.5) * 0.25;
      seats.push([Math.sin(a) * r + j, FLOOR_Y + (Math.random() - 0.5) * 0.15, STAGE_Z - Math.cos(a) * r + j, r, a]);
    }
  }
  let tier = 0;
  for (let r = 25.5; r < R_MAX; r += crowdSpacing * 1.25, tier++) {
    const span = 1.15, da = (crowdSpacing * 1.1) / r;
    for (let a = -span + (tier % 2) * da * 0.5; a <= span; a += da) {
      const aa = a + (Math.random() - 0.5) * da * 0.6;
      const y = FLOOR_Y + 0.6 + (r - 25.5) * 0.85 + Math.abs(aa) * 1.8 + (Math.random() - 0.5) * 0.2;
      seats.push([Math.sin(aa) * r, y, STAGE_Z - Math.cos(aa) * r, r, aa]);
    }
  }
  const CROWD_CAP = mobileQ() ? 1400 : 3000;
  while (seats.length > CROWD_CAP) seats.splice((Math.random() * seats.length) | 0, 1);
  const N = seats.length;
  const crowd = new THREE.InstancedMesh(miniStickGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true }), N);
  crowd.frustumCulled = false;
  crowd.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const crowdBase = new Float32Array(N * 3), crowdTilt = new Float32Array(N * 2), rowN = new Float32Array(N), phase = new Float32Array(N), seed = new Float32Array(N);
  seats.forEach(([x, y, z, r, a], i) => {
    crowdBase.set([x, y, z], i * 3);
    crowdTilt[i * 2] = -0.15 - Math.random() * 0.35;
    crowdTilt[i * 2 + 1] = (Math.random() - 0.5) * 0.6;
    rowN[i] = (r - R_MIN) / (R_MAX - R_MIN);
    phase[i] = a * 4.5 + r * 0.32;
    seed[i] = Math.random();
    crowd.setColorAt(i, new THREE.Color(0, 0, 0));
  });
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(0.42, 0.42, 0.42);
  // El público se mece y, en el clímax, también "bombea" al pulso, cada quien con su desfase.
  // Cada lightstick del público pivota en el agarre (la base de su mango) y combina capas:
  // (1) ola "mexicana" que recorre las gradas (≈10 s por vuelta), (2) vaivén cada 2 tiempos con la
  // música (lento sin música), (3) "pumps" en los tiempos fuertes en las primeras filas y (4) subir y
  // bajar el brazo, con ruido propio por persona. Las filas cercanas se mueven más que las lejanas.
  const crowdAng = new Float32Array(N), crowdRaise = new Float32Array(N);
  seats.forEach(([, , , , a], i) => { crowdAng[i] = a; });
  const LAP = 10;
  function placeCrowd(t, energy, pumpAmt, beatPos, live) {
    const band = t / LAP;
    for (let i = 0; i < N; i++) {
      const rowAmp = 1.25 - rowN[i] * 0.85, sd = seed[i];
      // (1) Ola que viaja por ángulo de asiento (con un poco de retraso por fila).
      let d = ((crowdAng[i] + 1.3) / 2.6 + rowN[i] * 0.08 - band) % 1;
      if (d < 0) d += 1;
      const raise = Math.exp(-(((d - 0.5) / 0.07) ** 2));
      crowdRaise[i] = raise;
      // (2) Vaivén: al compás cuando suena algo; lento y desfasado en reposo.
      const sway = live > 0.5
        ? Math.sin((Math.PI * (beatPos + sd * 0.15)) / 2) * (0.16 + 0.2 * energy)
        : Math.sin(t * (0.6 + sd * 0.5) + phase[i]) * 0.1;
      // (3) Pumps en tiempos fuertes, sobre todo adelante.
      const x4 = (beatPos + sd * 0.25) % 4, x = x4 < 1 ? x4 : 9; // solo en el tiempo fuerte
      const front = rowN[i] < 0.35 && sd < 0.55 ? 1 : 0.25;
      const pump = pumpAmt * front * (x < 0.15 ? x / 0.15 : Math.exp(-(x - 0.15) * 6));
      // (4) Brazo que sube y baja + ruido humano.
      const lift = Math.sin(t * (0.5 + sd * 0.4) + sd * 9) * 0.06 + raise * 0.42 + pump * 0.22;
      const noise = Math.sin(t * (2.3 + sd * 1.7) + sd * 40) * 0.03;
      _e.set(crowdTilt[i * 2] * (1 - raise * 0.8) + raise * 0.12 - pump * 0.35 + noise, 0, crowdTilt[i * 2 + 1] * (1 - raise * 0.6) + (sway + noise) * rowAmp);
      _q.setFromEuler(_e);
      _p.set(crowdBase[i * 3], crowdBase[i * 3 + 1] + lift * rowAmp, crowdBase[i * 3 + 2]);
      crowd.setMatrixAt(i, _m.compose(_p, _q, _s));
    }
    crowd.instanceMatrix.needsUpdate = true;
  }
  placeCrowd(0, 0, 0, 0, 0);
  scene.add(crowd);
  const CROWD_PALETTE = (featuredAlbum?.palette ?? ["#8a2be2", "#b388ff", "#ff80ab"]).map((c) => {
    const k = new THREE.Color(c), hsl = {};
    k.getHSL(hsl);
    return k.setHSL(hsl.h, Math.max(hsl.s, 0.6), Math.min(0.72, Math.max(hsl.l, 0.55)));
  });
  const IDLE_PURPLE = reduceMotion ? new THREE.Color("#a06cf0") : new THREE.Color("#7a35e8"); // cálido y quieto con movimiento reducido

  // ---------- Bloom ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.42, 0.62);
  composer.addPass(bloom);
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();

  // ---------- Coreografía con el scroll ----------
  // Cada capítulo tiene un "slot": el lightstick busca el más visible (centro → posición, alto → escala,
  // data-* → giro, inclinación, desarme, gesto y ambiente). Resortes críticamente amortiguados lo hacen
  // viajar con inercia entre capítulos.
  const slots = [...document.querySelectorAll(".slot")].map((el) => ({
    el,
    chapter: el.closest(".chapter"),
    rot: Number(el.dataset.rot || 0),
    tilt: Number(el.dataset.tilt || 0),
    spin: Number(el.dataset.spin || 0),
    crowd: Number(el.dataset.crowd || (el.closest(".hero") ? 1 : 0.6)),
    explode: el.dataset.explode === "scroll",
    lineup: el.dataset.lineup === "1",
    gesture: el.dataset.gesture || "none",
    mood: el.dataset.mood || "show",
  }));
  const anatSlot = slots.find((s) => s.explode);
  const anat = { p: 0 };
  const H_ASSEMBLED = v4.metrics.top - v4.metrics.bottom, H_EXPLODED = H_ASSEMBLED + 5.4;
  const CENTER = { assembled: STICK_Y + (v4.metrics.top + v4.metrics.bottom) / 2, exploded: STICK_Y + (v4.metrics.top + 2.7 + v4.metrics.bottom - 1.9) / 2 };
  const target = { x: 0, y: 0, s: 0.5, rot: 0, tilt: 0, explode: 0, spin: 1, crowd: 1, gest: 0, lineup: 0 };
  const view = { ...target }, vel = Object.fromEntries(Object.keys(target).map((k) => [k, 0]));
  const pointerOff = { x: 0, y: 0 };
  let activeSlot = slots[0];
  let lineupPose = null;

  function explodeFromProgress(p) {
    const open = clamp01((p - 0.06) / 0.3), close = clamp01((p - 0.88) / 0.12);
    const s = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
    return s(open) * (1 - s(close));
  }
  const NAV_H = () => (mobileQ() ? 56 : 68);
  // Ajusta posición/escala para que el lightstick entero (gema a tapa + margen de gestos) quede a la vista.
  function frameFit(x, y, s, e, gest) {
    const ppu = ppuNow(), h = innerHeight, nav = NAV_H();
    const margin = 0.35 + gest * 0.9;
    const top = STICK_Y + v4.metrics.top + 2.7 * e + margin, bot = STICK_Y + v4.metrics.bottom - 1.9 * e - margin * 0.6;
    const maxH = (h - nav - 20) / ppu;
    if ((top - bot) * s > maxH) s = maxH / (top - bot);
    const topLim = camera.position.y + (h / 2 - nav - 8) / ppu, botLim = camera.position.y - (h / 2 - 10) / ppu;
    const yt = y + top * s, yb = y + bot * s;
    if (yt > topLim) y -= yt - topLim;
    else if (yb < botLim) y += botLim - yb;
    return [x, y, s];
  }
  const ppuNow = () => innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z);
  function slotPose(S, rect) {
    const w = innerWidth, h = innerHeight, ppu = ppuNow();
    const e = S.explode ? (reduceMotion ? 1 : explodeFromProgress(anat.p)) : 0;
    const tall = H_ASSEMBLED + (H_EXPLODED - H_ASSEMBLED) * e + (S.lineup ? 2 : 0); // la ronda inclinada suma profundidad
    // Margen para los gestos (que nunca se salga del encuadre) y para la fila de versiones.
    const reach = S.gesture === "demo" ? 1.6 : S.gesture === "none" ? 1 : 1.3;
    const across = S.lineup ? 4.8 : 1;
    const fitH = (Math.max(rect.height * 0.55, rect.bottom - Math.max(rect.top, NAV_H() + 6)) * 0.88) / (tall * ppu);
    const fitW = (rect.width * 0.94) / (R * 2.3 * reach * across * ppu);
    const s = Math.max(0.2, Math.min(mobileQ() ? 0.52 : 0.8, fitH, fitW));
    // La parte del slot tapada por la barra fija no cuenta (así la gema nunca queda bajo la barra).
    const top = Math.max(rect.top, NAV_H() + 6);
    const effH = Math.max(rect.height * 0.55, rect.bottom - top);
    const cx = rect.left + rect.width / 2, cy = rect.bottom - effH / 2;
    const cOff = CENTER.assembled + (CENTER.exploded - CENTER.assembled) * e;
    return {
      x: (cx - w / 2) / ppu, y: camera.position.y - (cy - h / 2) / ppu - cOff * s,
      s, rot: S.rot + (S.explode ? 0.35 - anat.p * 0.7 : 0), tilt: S.tilt, explode: e, spin: S.spin, crowd: S.crowd,
      gest: S.gesture === "none" || e > 0.05 ? 0 : 1, lineup: S.lineup ? 1 : 0,
    };
  }
  function computeTarget() {
    const h = innerHeight;
    let sum = 0, best = 0;
    const acc = Object.fromEntries(Object.keys(target).map((k) => [k, 0]));
    const poses = [];
    for (const S of slots) {
      const r = S.el.getBoundingClientRect();
      const vis = Math.max(0, Math.min(r.bottom, h) - Math.max(r.top, 0)) / Math.max(1, Math.min(r.height, h));
      if (vis <= 0) continue;
      poses.push([S, r, vis]);
      if (vis > best) { best = vis; activeSlot = S; }
    }
    if (!poses.length) return;
    for (const [S, r, vis] of poses) {
      if (reduceMotion && S !== activeSlot) continue;
      const wgt = reduceMotion ? 1 : vis ** 3;
      const P = slotPose(S, r);
      if (S.lineup) lineupPose = { ...P, vis };
      for (const k in acc) acc[k] += P[k] * wgt;
      sum += wgt;
    }
    for (const k in acc) target[k] = acc[k] / sum;
    if (!poses.some(([S]) => S.lineup)) lineupPose = null;
  }
  const OMEGA = { x: 5, y: 5, s: 5.5, rot: 3.6, tilt: 4, explode: 3.2, spin: 3, crowd: 2, gest: 3, lineup: 4 };
  function springs(dt) {
    for (const k in target) {
      if (reduceMotion || SHOT) { view[k] = target[k]; vel[k] = 0; continue; }
      const w = OMEGA[k];
      vel[k] += (w * w * (target[k] - view[k]) - 2 * w * vel[k]) * dt;
      view[k] += vel[k] * dt;
    }
  }
  if (ScrollTrigger && anatSlot) {
    gsap.to(anat, {
      p: 1, ease: "none",
      scrollTrigger: {
        trigger: anatSlot.chapter, scrub: reduceMotion ? true : 1.3, invalidateOnRefresh: true,
        start: () => (mobileQ() ? "top 75%" : "top top"), end: () => (mobileQ() ? "bottom 40%" : "bottom bottom"),
      },
    });
  }

  // ---------- Color ----------
  let colorIndex = 0, lastColorChange = 0;
  const minColorGap = () => (safeMode ? 1000 / 3 : 1000 / 8);
  function tweenColor(c) {
    const now = performance.now();
    if (now - lastColorChange < minColorGap()) return false;
    lastColorChange = now;
    gsap?.to(color, { r: c.r, g: c.g, b: c.b, duration: reduceMotion ? 0 : 0.6, ease: "power2.out", overwrite: true });
    if (!gsap) color.copy(c);
    return true;
  }
  function setColor(next) {
    const i = next ?? (colorIndex + 1) % PALETTE.length;
    if (tweenColor(PALETTE[i])) colorIndex = i;
  }

  // ---------- Gestos de concierto (como si una fan lo sostuviera) ----------
  // Pivotan en el agarre del mango. Se mezclan con pesos suavizados y nunca con movimiento reducido.
  const gw = { sway: 0, pump: 0, wave: 0, shake: 0 };
  const gwT = { sway: 0, pump: 0, wave: 0, shake: 0 };
  let shakeT = -10, shakeAmp = 0, handVz = 0, lastHandZ = 0, lag = 0, lagV = 0;
  const pumpCurve = (x) => (x < 0.12 ? x / 0.12 : Math.exp(-(x - 0.12) * 7) * Math.cos((x - 0.12) * 9));
  function triggerShake(a = 1) {
    if (reduceMotion || safeMode) a *= 0.4;
    if (reduceMotion) return;
    shakeT = clock.elapsedTime;
    shakeAmp = Math.max(shakeAmp, a);
  }
  function gestureOffsets(b, t, beatSec) {
    const o = { rz: 0, rx: 0, dx: 0, dy: 0 };
    const sw = Math.sin((Math.PI * b) / 2);
    o.rz += gw.sway * 0.24 * sw; o.dx += gw.sway * 0.22 * sw;
    const pc = pumpCurve(b % 1);
    o.rx += gw.pump * -0.3 * pc; o.dy += gw.pump * 0.3 * pc; o.rz += gw.pump * 0.06 * Math.sin(Math.PI * b);
    const ang = (2 * Math.PI * b) / 8;
    o.rz += gw.wave * 0.34 * Math.sin(ang); o.rx += gw.wave * -0.16 * Math.cos(ang); o.dx += gw.wave * 0.45 * Math.sin(ang); o.dy += gw.wave * 0.12 * (1 - Math.cos(ang));
    // Sacudida corta con amortiguación de muñeca (en los tiempos fuertes o al hacer clic).
    const xs = t - shakeT;
    if (xs < 0.8) { const s = shakeAmp * Math.exp(-xs * 7) * Math.sin(xs * 46); o.rz += 0.11 * s; o.rx += 0.05 * s; } else shakeAmp = 0;
    if (gw.shake > 0.05 && (b % 4) < 0.04 && xs > beatSec * 2) triggerShake(gw.shake);
    return o;
  }

  // ---------- Interacción: arrastrar para girar (yaw + pitch con inercia), clic para color y sacudida ----------
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let spinVel = 0.004, spinAngle = 0, pitch = 0, pitchVel = 0;
  let dragging = false, dragX = 0, dragY = 0, dragT = 0, moved = 0, hovered = false, lastFlick = 0;
  let hotPart = null, hotFromUI = false;
  function pick(e) {
    pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(stick, true)[0] || null;
  }
  const partOf = (obj) => { while (obj && !PARTS.includes(obj)) obj = obj.parent; return obj; };
  function pulse(strength = 1) {
    if (!gsap || reduceMotion) return;
    const s = safeMode ? strength * 0.6 : strength;
    gsap.fromTo(stick.scale, { x: 1 + 0.06 * s, y: 1 + 0.06 * s, z: 1 + 0.06 * s }, { x: 1, y: 1, z: 1, duration: 0.45, ease: "elastic.out(1, 0.45)" });
    gsap.fromTo(glow, { intensity: 1 + 0.9 * s }, { intensity: 1, duration: 0.5, ease: "power2.out" });
  }
  addEventListener("pointermove", (e) => {
    const nx = (e.clientX / innerWidth) * 2 - 1, ny = (e.clientY / innerHeight) * 2 - 1;
    if (!reduceMotion) {
      gsap?.to(pivot.rotation, { x: ny * 0.14, z: -nx * 0.1, duration: 1.4, ease: "power3.out", overwrite: "auto" });
      gsap?.to(pointerOff, { x: nx * 0.16, y: -ny * 0.08, duration: 1.6, ease: "power3.out", overwrite: "auto" });
    }
    if (dragging) {
      const now = performance.now();
      const dx = e.clientX - dragX, dy = e.clientY - dragY, ddt = Math.max(1, now - dragT);
      dragX = e.clientX; dragY = e.clientY; dragT = now;
      moved += Math.abs(dx) + Math.abs(dy);
      if (ring.dragging) { ring.vel = dx * 0.25; return; }
      spinVel = dx * 0.006;
      if (e.pointerType !== "touch") pitchVel = dy * 0.25;
      // Un movimiento rápido ("flick") dispara la sacudida de concierto.
      if (Math.hypot(dx, dy) / ddt > 2.4 && now - lastFlick > 600) { lastFlick = now; triggerShake(1); }
      return;
    }
    if (e.pointerType === "touch") return;
    const hitObj = pick(e);
    const h = !!hitObj || ringHit();
    if (h !== hovered) {
      hovered = h;
      canvas.classList.toggle("grab", h);
    }
    if (!hotFromUI) setHot(view.explode > 0.5 && hitObj ? partOf(hitObj.object)?.name ?? null : null);
  });
  const ringHit = () => ring.group.visible && raycaster.intersectObject(ring.group, true).length > 0;
  canvas.addEventListener("pointerdown", (e) => {
    const onStick = !!pick(e);
    const onRing = !onStick && ringHit();
    if (!onStick && !onRing) return;
    ring.dragging = ring.mainIn > 0.3 || onRing;
    e.preventDefault(); // sin selección de texto ni arrastre de imágenes
    dragging = true;
    dragX = e.clientX; dragY = e.clientY; dragT = performance.now();
    moved = 0;
    document.documentElement.classList.add("dragging");
    canvas.classList.add("grabbing");
    canvas.setPointerCapture?.(e.pointerId);
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    const wasRing = ring.dragging;
    ring.dragging = false;
    document.documentElement.classList.remove("dragging");
    if (wasRing) { canvas.classList.remove("grabbing"); return; }
    canvas.classList.remove("grabbing");
    if (moved < 6) {
      setColor();
      pulse(1.2);
      triggerShake(0.8);
      spinVel += 0.05;
    }
  };
  addEventListener("pointerup", endDrag);
  addEventListener("pointercancel", endDrag);
  document.addEventListener("dragstart", (e) => { if (dragging) e.preventDefault(); });

  // Tarjetas/pasos ↔ piezas 3D.
  const cards = [...document.querySelectorAll(".part-card")];
  const steps = [...document.querySelectorAll(".step")];
  function setHot(name) {
    if (name === hotPart) return;
    hotPart = name;
    for (const c of cards) c.classList.toggle("is-hot", c.dataset.part === name);
    for (const L of leaders) { L.path.classList.toggle("hot", L.key === name); L.dot.classList.toggle("hot", L.key === name); }
    for (const M of markers) M.el.classList.toggle("hot", M.key === name);
  }
  const bindHot = (el, name, focusable = true) => {
    const on = () => { hotFromUI = true; setHot(name); };
    const off = () => { hotFromUI = false; setHot(null); };
    el.addEventListener("pointerenter", on);
    el.addEventListener("pointerleave", off);
    if (focusable) {
      el.addEventListener("focus", on);
      el.addEventListener("blur", off);
    }
    el.addEventListener("click", () => { on(); pulse(0.5); });
  };
  for (const c of cards) bindHot(c, c.dataset.part);
  for (const s of steps) bindHot(s, s.dataset.focus, false); // los pasos son texto: solo al pasar el puntero

  // ---------- Marcadores numerados y líneas guía (anatomía) ----------
  const mkLayer = document.querySelector(".markers");
  const svg = document.querySelector(".leaders");
  const NS = "http://www.w3.org/2000/svg";
  const anchorOf = (key) => { const [pn, local] = v4.labelAnchors[key]; return { part: partByName[pn], local: local ?? partByName[pn].userData.anchor }; };
  const markers = cards.map((c, i) => {
    const el = document.createElement("div");
    el.className = "mk";
    const n = document.createElement("i");
    n.textContent = String(i + 1).padStart(2, "0");
    el.append(n);
    mkLayer?.append(el);
    return { key: c.dataset.part, ...anchorOf(c.dataset.part), el, shown: false };
  });
  const leaders = cards.map((c) => {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("pathLength", "1");
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("r", "3.5");
    svg?.append(path, dot);
    const left = !!c.closest(".parts-left");
    const a = anchorOf(c.dataset.part);
    const local = left && c.dataset.part !== "gem" ? a.local.clone().setX(-Math.abs(a.local.x)) : a.local;
    return { key: c.dataset.part, card: c, left, part: a.part, local, path, dot };
  });
  // Las tarjetas aparecen en secuencia con el desarme (en escritorio).
  for (const c of cards) c.style.opacity = "";
  const _v = new THREE.Vector3();
  const project = (part, local) => {
    _v.copy(local);
    part.localToWorld(_v).project(camera);
    return [(_v.x + 1) / 2 * innerWidth, (1 - _v.y) / 2 * innerHeight, _v.z < 1];
  };
  function updateMarkers() {
    const e = view.explode, mobile = mobileQ();
    const anatOn = e > 0.45;
    // Escritorio: líneas guía desde cada tarjeta hasta su pieza. Móvil: números sobre el modelo.
    leaders.forEach((L, i) => {
      const show = anatOn && !mobile && (reduceMotion || anat.p > 0.1 + i * 0.045);
      L.card.classList.toggle("pre", !mobile && !reduceMotion && !show && activeSlot === anatSlot);
      L.path.classList.toggle("on", show);
      L.dot.classList.toggle("on", show);
      if (!show) return;
      const [ax, ay] = project(L.part, L.local);
      const r = L.card.getBoundingClientRect();
      const cx = L.left ? r.right + 6 : r.left - 6, cy = r.top + r.height / 2;
      const ex = L.left ? Math.min(ax - 26, cx + 30) : Math.max(ax + 26, cx - 30);
      L.path.setAttribute("d", `M${cx.toFixed(1)},${cy.toFixed(1)} H${ex.toFixed(1)} L${ax.toFixed(1)},${ay.toFixed(1)}`);
      L.dot.setAttribute("cx", ax.toFixed(1));
      L.dot.setAttribute("cy", ay.toFixed(1));
    });
    for (const M of markers) {
      const on = (anatOn && mobile) || (M.key === hotPart && hotPart && !(anatOn && !mobile));
      if (on !== M.shown) { M.shown = on; M.el.classList.toggle("shown", on); }
      if (!on) continue;
      const [x, y] = project(M.part, M.local);
      M.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }

  // ---------- Versiones: ronda de lightsticks que gira, "tomados de la mano" (se cargan al acercarse) ----------
  // Miembros: el principal (Ver. 4) + Ver. 3 + SE, una de cada una, con su etiqueta.
  const mainTag = (() => { const d = document.createElement("div"); d.className = "ver-tag"; d.textContent = "Ver. 4"; document.querySelector(".markers")?.append(d); return d; })();
  const ring = { group: new THREE.Group(), members: [], loading: false, hot: null, angle: 0, off: 0, vel: 0, mainIn: 0, othersIn: 0, cx: 0, cy: 0, s: 0.4, dragging: false, last: null };
  ring.group.rotation.x = 0.18;
  scene.add(ring.group);
  const verSection = document.getElementById("versiones");
  async function loadLineup() {
    if (ring.loading) return;
    ring.loading = true;
    const [{ createArmyBombV3 }, { createArmyBombSE }] = await Promise.all([import("./models/armybomb-v3.js"), import("./models/armybomb-se.js")]);
    const v3 = createArmyBombV3(mats, { lowEnd: LOW_END }), se = createArmyBombSE(mats, { lowEnd: LOW_END });
    // Una sola de cada versión: el principal (Ver. 4) + Ver. 3 + SE, en un triángulo con aire entre ellos.
    const entries = [["v3", v3.group, v3.metrics.grip, "Ver. 3"], ["se", se.group, se.metrics.grip, "SE"]];
    entries.forEach(([key, obj, grip, label], k) => {
      const holder = new THREE.Group();
      const spinner = new THREE.Group();
      obj.position.set(0, -grip, 0);
      spinner.add(obj);
      holder.add(spinner);
      holder.rotation.order = "YXZ";
      // Halo propio para que el color "viaje" alrededor de la ronda.
      obj.traverse((o) => { if (o.isSprite) { o.material = mats.halo.clone(); } });
      ring.group.add(holder);
      const tag = document.createElement("div");
      tag.className = "ver-tag";
      tag.textContent = label;
      mkLayer?.append(tag);
      ring.members.push({ key, holder, spinner, obj, k: k + 1, primary: true, hot: 0, sprites: [], tag, top: 1.9 });
      obj.traverse((o) => { if (o.isSprite) ring.members.at(-1).sprites.push(o); });
    });
  }
  if (verSection) {
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((ents, obs) => { if (ents.some((x) => x.isIntersecting)) { loadLineup(); obs.disconnect(); } }, { rootMargin: "150% 0px" }).observe(verSection);
    } else loadLineup();
  }
  const verCards = [...document.querySelectorAll(".ver-card")];
  for (const c of verCards) {
    const on = () => { ring.hot = c.dataset.model; verCards.forEach((o) => o.classList.toggle("is-hot", o === c)); };
    const off = () => { ring.hot = null; verCards.forEach((o) => o.classList.remove("is-hot")); };
    c.addEventListener("pointerenter", on); c.addEventListener("focus", on);
    c.addEventListener("pointerleave", off); c.addEventListener("blur", off);
    c.addEventListener("click", () => { on(); pulse(0.6); triggerShake(0.5); });
  }
  const _rp = new THREE.Vector3(), _hc = new THREE.Color();
  /** Ronda: centro y escala del slot, giro con inercia, ola que levanta uno tras otro y entradas en espiral. */
  function updateRing(dt, t) {
    const P = lineupPose;
    const k = reduceMotion || SHOT ? 1 : Math.min(1, dt * 4);
    ring.othersIn += ((P ? clamp01(P.vis * 1.5) : 0) - ring.othersIn) * (reduceMotion ? 1 : Math.min(1, dt * 2.2));
    ring.mainIn = clamp01(view.lineup);
    if (P) {
      ring.cx += (P.x - ring.cx) * k;
      ring.cy += (P.y + (STICK_Y + GRIP) * P.s - ring.cy) * k;
      ring.s += (P.s - ring.s) * k;
    }
    const on = ring.othersIn > 0.01 || ring.mainIn > 0.01;
    ring.group.visible = on && ring.members.length > 0;
    if (!on) { for (const M of ring.members) M.tag.classList.remove("shown"); mainTag.classList.remove("shown"); return null; }
    // Triángulo: Ver. 4 al frente y al centro; Ver. 3 y SE atrás a izquierda y derecha. La ronda se mece
    // (sin dar la vuelta completa, así nunca se tapan) y al arrastrarla gira y vuelve con un resorte.
    if (ring.dragging) ring.off += ring.vel * dt;
    else { ring.off += (0 - ring.off) * Math.min(1, dt * 1.2); ring.vel *= 0.9; }
    ring.angle = ring.off + (reduceMotion ? 0 : Math.sin(t * 0.25) * 0.1);
    const s = ring.s, Rr = 5.6 * s; // aire entre las tres versiones
    ring.group.position.set(ring.cx, ring.cy, 0);
    // Ángulo de las de atrás: ±2 rad con el principal; sin él, se reparten (±π/2) y cierran el hueco.
    const spread = 1.72 + (1 - ring.mainIn) * (Math.PI / 2 - 1.72);
    const waveOn = !reduceMotion && t % 11 < 3.2;
    const counter = !reduceMotion && Math.sin(t * 0.21) > 0.55;
    const ownSpin = reduceMotion ? 0 : t * 0.9;
    for (const M of ring.members) {
      const u = ring.othersIn;
      const ease = u * u * (3 - 2 * u);
      const theta = ring.angle + (M.k === 1 ? -spread : spread) + (1 - ease) * (3 * Math.PI + M.k * 0.7);
      const rad = Rr * (1 + (1 - ease) * 2.2);
      const lift = waveOn ? 0.9 * s * Math.max(0, Math.sin((t % 11) * 2.4 - M.k * 0.85)) ** 2 : 0;
      const fly = (1 - ease) * (M.k % 2 ? 7 : -7) * s;
      M.hot += ((ring.hot === M.key && M.primary ? 1 : 0) - M.hot) * Math.min(1, dt * 6);
      const fwd = M.hot * 1.1 * s;
      M.holder.position.set(Math.sin(theta) * (rad + fwd), lift + fly, Math.cos(theta) * (rad + fwd));
      M.holder.rotation.set(-0.24 * ease, theta, 0); // inclinado hacia el centro, como tomados de la mano
      M.holder.scale.setScalar(Math.max(0.001, s * (0.3 + 0.7 * ease) * (1 + M.hot * 0.12)));
      M.spinner.rotation.y = ownSpin * (counter && M.k % 2 ? -1 : 1);
      // El color viaja alrededor de la ronda.
      _hc.copy(color).offsetHSL(Math.sin(t * 1.4 - M.k * 1.05) * 0.06, 0, 0);
      for (const sp of M.sprites) { sp.material.color.copy(_hc); sp.material.opacity = (0.04 + 0.08 * Math.max(0, Math.sin(t * 2 - M.k * 1.05))) * ease; }
    }
    // Etiqueta clara sobre cada versión, sin choques: si dos se tocan, la de atrás sube.
    const tags = [];
    for (const M of ring.members) {
      _rp.set(0, M.top + 0.5, 0);
      M.obj.localToWorld(_rp);
      const z = _rp.z;
      _rp.project(camera);
      tags.push({ el: M.tag, x: (_rp.x + 1) / 2 * innerWidth, y: (1 - _rp.y) / 2 * innerHeight, z, show: ring.othersIn > 0.6, hot: ring.hot === M.key });
    }
    _rp.set(0, v4.metrics.top + 0.5, 0);
    stick.localToWorld(_rp);
    const zMain = _rp.z;
    _rp.project(camera);
    tags.push({ el: mainTag, x: (_rp.x + 1) / 2 * innerWidth, y: (1 - _rp.y) / 2 * innerHeight, z: zMain, show: ring.mainIn > 0.7, hot: ring.hot === "v4" });
    tags.sort((p, q) => q.z - p.z); // primero las de adelante
    const placed = [];
    for (const T of tags) {
      const w = (T.el.offsetWidth || 70) + 10, h = 30;
      let y = T.y;
      for (let tries = 0; tries < 4; tries++) {
        const hit = placed.find((P) => Math.abs(P.x - T.x) < (P.w + w) / 2 && Math.abs(P.y - y) < h);
        if (!hit) break;
        y = hit.y - h - 4;
      }
      y = Math.max(NAV_H() + 24, y);
      placed.push({ x: T.x, y, w });
      T.el.style.transform = `translate(${T.x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      T.el.classList.toggle("shown", T.show);
      T.el.classList.toggle("hot", T.hot);
    }
    // Posición del principal en la ronda (índice 0): entra y sale en espiral.
    const theta0 = ring.angle;
    _rp.set(Math.sin(theta0) * Rr, 0, Math.cos(theta0) * Rr);
    ring.group.updateMatrixWorld();
    ring.group.localToWorld(_rp);
    return { pos: _rp, theta: theta0, s, hot: ring.hot === "v4" ? 1 : 0 };
  }

  // ---------- Demo interactiva ----------
  const demoStatus = $("demo-status");
  const MOOD_NAMES = { 0.15: "intro", 0.55: "verso", 1: "coro", 0.85: "final" };
  for (const b of document.querySelectorAll(".demo .chip")) {
    b.addEventListener("click", () => {
      const group = b.closest("fieldset");
      for (const o of group.querySelectorAll(".chip")) o.setAttribute("aria-pressed", String(o === b));
      if (b.dataset.color) demo.color.set(b.dataset.color);
      if (b.dataset.mood) { demo.energy = Number(b.dataset.mood); demo.gesture = b.dataset.gesture || "sway"; }
      demo.active = true;
      demo.until = clock.elapsedTime + 16;
      lastColorChange = 0;
      tweenColor(demo.color);
      pulse(0.4 + demo.energy * 0.6);
      if (!reduceMotion) { show.burst = (safeMode ? 0.5 : 1) * (0.5 + demo.energy); show.burstT = clock.elapsedTime; }
      const colorName = document.querySelector('.demo .chips:not(.moods) [aria-pressed="true"]')?.textContent.trim() ?? "Morado";
      const mood = MOOD_NAMES[demo.energy] ?? "verso";
      demoStatus.textContent = `${colorName} en el ${mood}: así brillarían tu lightstick y el estadio.`;
    });
  }

  // ---------- Música (intro de la canción destacada) y reproductor mini ----------
  let player = null, ytReady = false;
  const beatSec = 60 / (FEATURED.bpm || 100);
  let lastBeat = -1;
  const mini = $("mini");
  $("mini-title").textContent = `${FEATURED.title} · BTS`;
  function loadYT() {
    return new Promise((resolve) => {
      if (window.YT?.Player) return resolve();
      window.onYouTubeIframeAPIReady = resolve;
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.append(s);
    });
  }
  function setMiniState(state) {
    mini.dataset.state = state;
    const open = state === "expanded";
    $("mini-expand").setAttribute("aria-expanded", String(open));
    $("mini-expand").setAttribute("aria-label", open ? "Ocultar el video" : "Mostrar el video");
    $("mini-expand").textContent = open ? "▾" : "▴";
    $("mini-expand").dataset.tip = open ? "Ocultar el video" : "Mostrar el video";
    // YouTube exige ver el reproductor (≥200×200): al plegarlo, se pausa.
    if (!open) player?.pauseVideo?.();
    placeMini();
  }
  async function startIntro({ muted }) {
    setMiniState("expanded");
    if (player && ytReady) {
      player.seekTo(FEATURED.introStart, true);
      muted ? player.mute() : player.unMute();
      player.playVideo();
      return;
    }
    if (player) return;
    await loadYT();
    player = new window.YT.Player("yt", {
      host: "https://www.youtube-nocookie.com",
      width: 200, height: 200, videoId: FEATURED.yt,
      playerVars: { autoplay: 1, mute: muted ? 1 : 0, playsinline: 1, start: FEATURED.introStart, end: FEATURED.introStart + FEATURED.introSeconds, rel: 0, controls: 1 },
      events: {
        onReady: () => { ytReady = true; if (mini.dataset.state === "expanded") player.playVideo(); },
        onStateChange: (e) => { if (e.data === 0) setIntroButton(false); syncPlayButtons(); },
      },
    });
  }
  const isPlaying = () => ytReady && player?.getPlayerState?.() === 1;
  const introButtons = [...document.querySelectorAll(".js-intro")];
  function setIntroButton(on) {
    for (const b of introButtons) {
      b.setAttribute("aria-pressed", on);
      b.textContent = on ? "🔊 Sonando la intro" : "▶ Escuchar la intro";
    }
  }
  function syncPlayButtons() {
    const on = isPlaying();
    for (const b of [$("mini-play"), $("fv-play")]) {
      if (!b) continue;
      b.setAttribute("aria-pressed", String(on));
      b.textContent = on ? "❚❚" : "▶";
      b.setAttribute("aria-label", on ? "Pausar la intro" : "Reproducir la intro");
    }
  }
  function togglePlay() {
    demo.active = false;
    if (isPlaying()) { player.pauseVideo(); setIntroButton(false); }
    else if (player && ytReady) { setMiniState("expanded"); player.unMute(); player.playVideo(); setIntroButton(true); }
    else { startIntro({ muted: false }); setIntroButton(true); }
    setTimeout(syncPlayButtons, 300);
  }
  for (const b of introButtons) b.onclick = () => { demo.active = false; startIntro({ muted: false }); setIntroButton(true); };
  $("mini-play").onclick = togglePlay;
  $("mini-expand").onclick = () => setMiniState(mini.dataset.state === "expanded" ? "collapsed" : "expanded");
  $("mini-close").onclick = () => { player?.pauseVideo?.(); setMiniState("idle"); setIntroButton(false); syncPlayButtons(); };

  // Arrastrar el reproductor; se acomoda en la esquina más cercana (escritorio) y recuerda la posición.
  const MINI_KEY = "pws.landing.miniCorner";
  let corner = "br";
  try { corner = localStorage.getItem(MINI_KEY) || "br"; } catch {}
  function placeMini() {
    mini.style.left = mini.style.top = mini.style.right = mini.style.bottom = "";
    if (mobileQ()) return; // en móvil queda acoplado al borde inferior
    const m = 16;
    if (corner.includes("t")) mini.style.top = "76px"; else mini.style.bottom = `${m}px`;
    if (corner.includes("l")) { mini.style.left = `${m}px`; mini.style.right = "auto"; } else mini.style.right = `${m}px`;
  }
  placeMini();
  addEventListener("resize", placeMini);
  const grip = $("mini-grip");
  let mDrag = null;
  grip.addEventListener("pointerdown", (e) => {
    if (mobileQ()) return;
    e.preventDefault();
    const r = mini.getBoundingClientRect();
    mDrag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    mini.classList.add("dragging");
    document.documentElement.classList.add("dragging");
    grip.setPointerCapture(e.pointerId);
  });
  grip.addEventListener("pointermove", (e) => {
    if (!mDrag) return;
    mini.style.right = mini.style.bottom = "auto";
    mini.style.left = `${Math.max(4, Math.min(innerWidth - mini.offsetWidth - 4, e.clientX - mDrag.dx))}px`;
    mini.style.top = `${Math.max(4, Math.min(innerHeight - mini.offsetHeight - 4, e.clientY - mDrag.dy))}px`;
  });
  const dropMini = () => {
    if (!mDrag) return;
    mDrag = null;
    mini.classList.remove("dragging");
    document.documentElement.classList.remove("dragging");
    const r = mini.getBoundingClientRect();
    corner = (r.top + r.height / 2 < innerHeight / 2 ? "t" : "b") + (r.left + r.width / 2 < innerWidth / 2 ? "l" : "r");
    try { localStorage.setItem(MINI_KEY, corner); } catch {}
    if (gsap && !reduceMotion) {
      const from = mini.getBoundingClientRect();
      placeMini();
      const to = mini.getBoundingClientRect();
      gsap.from(mini, { x: from.left - to.left, y: from.top - to.top, duration: 0.5, ease: "expo.out", clearProps: "transform" });
    } else placeMini();
  };
  grip.addEventListener("pointerup", dropMini);
  grip.addEventListener("pointercancel", dropMini);
  grip.addEventListener("keydown", (e) => {
    const map = { ArrowLeft: ["l", 1], ArrowRight: ["r", 1], ArrowUp: ["t", 0], ArrowDown: ["b", 0] };
    const k = map[e.key];
    if (!k || mobileQ()) return;
    e.preventDefault();
    corner = k[1] ? corner[0] + k[0] : k[0] + corner[1];
    try { localStorage.setItem(MINI_KEY, corner); } catch {}
    placeMini();
  });
  // El reproductor de YouTube no se carga hasta que la persona pide la intro (sin autoarranque ni anuncios
  // al entrar). Mientras tanto, el lightstick y el público siguen un metrónomo local.

  // ---------- "Qué puedes hacer": cada maqueta funciona ----------
  // Videos + luces: play/pausa real, barra de progreso con las partes y búsqueda al tocarla.
  const fvBar = $("fv-bar"), fvSegs = fvBar?.querySelector(".mv-segs"), fvHead = fvBar?.querySelector(".mv-head");
  const SEG_COLORS = [PALETTE[0], ...CROWD_PALETTE].slice(0, 4);
  if (fvSegs) fvSegs.innerHTML = SEG_COLORS.map((c) => `<i style="--c:#${c.getHexString()}"></i>`).join("");
  $("fv-play")?.addEventListener("click", togglePlay);
  const seekFrac = (f) => {
    const s = clamp01(f) * FEATURED.introSeconds;
    if (player && ytReady) { setMiniState("expanded"); player.seekTo(FEATURED.introStart + s, true); player.playVideo(); }
    else { startIntro({ muted: false }); setIntroButton(true); }
  };
  // Patrón de slider de búsqueda (APG): con el foco en la barra, aria-valuenow/valuetext solo cambian justo
  // después de una tecla o un toque (si no, el lector anunciaría cada segundo que avanza la intro).
  let fvUserAt = -Infinity, fvSecs = -1;
  fvBar?.addEventListener("click", (e) => { fvUserAt = performance.now(); const r = fvBar.getBoundingClientRect(); seekFrac((e.clientX - r.left) / r.width); });
  fvBar?.addEventListener("keydown", (e) => {
    const cur = player && ytReady ? (player.getCurrentTime() - FEATURED.introStart) / FEATURED.introSeconds : 0;
    const step = 2 / FEATURED.introSeconds;
    const m = { ArrowRight: cur + step, ArrowUp: cur + step, ArrowLeft: cur - step, ArrowDown: cur - step, Home: 0, End: 0.98 };
    if (e.key in m) { e.preventDefault(); fvUserAt = performance.now(); seekFrac(m[e.key]); }
  });
  function updateVideoMock() {
    if (!fvBar) return;
    const p = player && ytReady ? clamp01((player.getCurrentTime() - FEATURED.introStart) / FEATURED.introSeconds) : 0;
    fvHead.style.setProperty("--p", `${(p * 100).toFixed(1)}%`);
    const seg = Math.min(3, Math.floor(p * 4));
    [...fvSegs.children].forEach((el, i) => el.classList.toggle("on", isPlaying() && i === seg));
    const secs = Math.round(p * FEATURED.introSeconds);
    $("fv-time").textContent = `0:${String(secs).padStart(2, "0")}`;
    // Con foco: solo hasta 1 s después de la última interacción (el salto del video tarda un poco en llegar).
    const focused = document.activeElement === fvBar;
    if (secs !== fvSecs && (!focused || performance.now() - fvUserAt < 1000)) {
      fvSecs = secs;
      fvBar.setAttribute("aria-valuenow", String(secs));
      fvBar.setAttribute("aria-valuetext", `${secs} segundos`);
    }
  }
  // Micrófono: análisis real (como en el reproductor), ecualizador y lightstick reaccionan.
  let mic = null;
  const fmBtn = $("fm-btn"), fmStatus = $("fm-status"), eqBars = [...document.querySelectorAll("#fm-eq i")];
  async function toggleMic() {
    if (mic?.active) {
      mic.stop(); mic = null;
      fmBtn.setAttribute("aria-pressed", "false"); fmBtn.textContent = "Probar micrófono";
      fmStatus.textContent = "Micrófono apagado.";
      eqBars.forEach((b) => b.style.setProperty("--h", "0"));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) { fmStatus.textContent = "Este navegador no permite usar el micrófono aquí."; return; }
    try {
      mic = new MicSync({ palette: PALETTE.map((c) => [c.r * 255, c.g * 255, c.b * 255]), maxChangesPerSec: safeMode ? 3 : 8 });
      await mic.start();
      fmBtn.setAttribute("aria-pressed", "true"); fmBtn.textContent = "Apagar micrófono";
      fmStatus.textContent = "Escuchando: pon música cerca. El sonido no sale de tu dispositivo.";
    } catch (err) {
      mic = null;
      fmStatus.textContent = err?.name === "NotAllowedError" ? "No diste permiso al micrófono. Puedes activarlo en los ajustes del navegador." : "No pudimos usar el micrófono en este dispositivo.";
    }
  }
  fmBtn?.addEventListener("click", toggleMic);
  addEventListener("pagehide", () => mic?.stop());
  document.addEventListener("visibilitychange", () => { if (document.hidden && mic?.active) toggleMic(); });
  function updateMic() {
    if (!mic?.active) return;
    const rgb = mic.sample();
    color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
    const bins = mic.bins, n = eqBars.length;
    for (let i = 0; i < n; i++) {
      const lo = Math.floor((i / n) ** 2 * bins.length * 0.5), hi = Math.max(lo + 1, Math.floor(((i + 1) / n) ** 2 * bins.length * 0.5));
      let s = 0;
      for (let j = lo; j < hi; j++) s += bins[j];
      eqBars[i].style.setProperty("--h", (s / (hi - lo) / 255).toFixed(2));
    }
    glow.intensity = 1 + mic.flash * (safeMode ? 0.4 : 0.9);
  }
  // Fanchant visual: nombres en hangul + romanización uno por uno; el lightstick bombea en cada nombre.
  const fcBtn = $("fc-btn"), fcStage = $("fc-stage");
  let chanting = false;
  fcBtn?.addEventListener("click", async () => {
    if (chanting) return;
    chanting = true;
    fcBtn.disabled = true;
    fcStage.textContent = "";
    const voice = $("fc-voice")?.checked && "speechSynthesis" in window;
    const seq = [...MEMBERS, { ko: "방탄소년단!", roman: "BTS!" }];
    for (const [i, m] of seq.entries()) {
      const el = document.createElement("span");
      el.className = "fc-name" + (i === seq.length - 1 ? " final" : "");
      const b = document.createElement("b"); b.textContent = m.ko;
      const s = document.createElement("small"); s.textContent = m.roman;
      el.append(b, s);
      fcStage.append(el);
      if (gsap && !reduceMotion) gsap.from(el, { y: 14, opacity: 0, scale: 0.8, duration: 0.45, ease: "back.out(2)" });
      pulse(0.7);
      gw.pump = Math.max(gw.pump, 0.8);
      if (voice) { const u = new SpeechSynthesisUtterance(m.ko); u.lang = "ko-KR"; u.rate = 1; speechSynthesis.speak(u); }
      // Mismo ritmo que en el reproductor: 2 tiempos por nombre; «BTS!» dura el doble.
      const stepMs = chantStepMs(FEATURED.bpm);
      await new Promise((r) => setTimeout(r, i === seq.length - 1 ? stepMs * 2 : stepMs));
    }
    chanting = false;
    fcBtn.disabled = false;
  });
  // Reto de ritmo mini: compás de la intro (o metrónomo) con Perfecto/Genial y puntos.
  const rtPad = $("rt-pad"), rtJudge = $("rt-judge"), rtScore = $("rt-score");
  let rtPoints = 0, rtCombo = 0;
  const metroStart = performance.now() / 1000;
  const beatClock = () => (isPlaying() ? player.getCurrentTime() - FEATURED.introStart : performance.now() / 1000 - metroStart);
  function rhythmTap() {
    const T = beatClock(), ph = T / beatSec;
    const ms = Math.abs(ph - Math.round(ph)) * beatSec * 1000;
    let label, pts;
    if (ms <= 70) { label = "¡Perfecto!"; pts = 100; rtCombo++; }
    else if (ms <= 140) { label = "¡Genial!"; pts = 60; rtCombo++; }
    else if (ms <= 220) { label = "Bien"; pts = 30; rtCombo = 0; }
    else { label = "Fuera de tiempo"; pts = 0; rtCombo = 0; }
    rtPoints += pts * (rtCombo > 2 ? 2 : 1);
    rtJudge.textContent = rtCombo > 2 ? `${label} ×${rtCombo}` : label;
    rtScore.textContent = String(rtPoints);
    rtPad.classList.add("hit");
    setTimeout(() => rtPad.classList.remove("hit"), 90);
    if (pts) { pulse(0.4); show.beatKick = 1; }
  }
  rtPad?.addEventListener("pointerdown", (e) => { e.preventDefault(); rhythmTap(); });
  rtPad?.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!e.repeat) rhythmTap(); } });
  // Modo seguro: interruptor real, recordado en este navegador.
  const safeSwitch = $("safe-switch");
  const applySafe = () => {
    safeSwitch?.setAttribute("aria-checked", String(safeMode));
    if (mic) mic.maxChangesPerSec = safeMode ? 3 : 8;
  };
  applySafe();
  safeSwitch?.addEventListener("click", () => {
    if (reduceMotion) { safeMode = true; applySafe(); return; }
    safeMode = !safeMode;
    try { localStorage.setItem(SAFE_KEY, safeMode ? "1" : "0"); } catch {}
    applySafe();
  });

  // ---------- CTA principal: imán, pulso al ritmo, onda al pulsar y "entrada" al reproductor ----------
  const orb = document.querySelector(".orb-cta");
  if (orb && !reduceMotion) {
    addEventListener("pointermove", (e) => {
      const r = orb.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = e.clientX - cx, dy = e.clientY - cy;
      const near = Math.hypot(dx / (r.width / 2 + 60), dy / (r.height / 2 + 60)) < 1;
      orb.style.setProperty("--mx", near ? `${(dx * 0.18).toFixed(1)}px` : "0px");
      orb.style.setProperty("--my", near ? `${(dy * 0.3).toFixed(1)}px` : "0px");
    });
    orb.addEventListener("pointerdown", (e) => {
      const r = orb.getBoundingClientRect();
      const sp = document.createElement("span");
      sp.className = "ripple";
      sp.style.left = `${e.clientX - r.left}px`;
      sp.style.top = `${e.clientY - r.top}px`;
      orb.append(sp);
      setTimeout(() => sp.remove(), 700);
    });
  }
  const fx = document.querySelector(".enter-fx");
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a.js-enter");
    if (!a || reduceMotion || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !gsap) return;
    e.preventDefault();
    const [gx, gy] = project(partByName.emblem, new THREE.Vector3(0, 0.6, 0));
    fx.style.setProperty("--fx-x", `${gx}px`);
    fx.style.setProperty("--fx-y", `${gy}px`);
    gsap.to(pivot.scale, { x: view.s * 1.6, y: view.s * 1.6, z: view.s * 1.6, duration: 0.32, ease: "power2.in" });
    gsap.fromTo(fx, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.in" });
    setTimeout(() => { location.href = a.href; }, 320);
  });
  addEventListener("pageshow", () => { if (fx) fx.style.opacity = "0"; });

  // ---------- Animación ----------
  const clock = new THREE.Clock();
  const tmp = new THREE.Color(), liveTmp = new THREE.Color(), liveC = new THREE.Color();
  let frameN = 0, lastLive = "";
  let crowdPainted = "", lastSide = "", lastPal = "", climaxDone = false, liveT = 0, beatPulse = 0;
  const root = document.documentElement;
  function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;

    const playing = isPlaying();
    const songT = playing ? player.getCurrentTime() - FEATURED.introStart : (performance.now() / 1000 - metroStart);
    const b = songT / beatSec;
    if (playing) {
      show.progress = clamp01(songT / (FEATURED.introSeconds || 30));
      const bi = Math.floor(b);
      if (bi !== lastBeat && bi >= 0) {
        lastBeat = bi;
        pulse(bi % 4 === 0 ? 1.1 : 0.5);
        beatPulse = bi % 4 === 0 ? 1 : 0.6;
        if (bi % 4 === 0 && !demo.active && !mic?.active) setColor();
        show.step = Math.floor(bi / 8);
        show.beatKick = 1;
        if (bi % 4 === 0) { show.burst = (safeMode ? 0.5 : 1) * (0.6 + 0.8 * show.progress); show.burstT = t; }
        if (orb && !reduceMotion) gsap?.fromTo(orb, { "--beat": bi % 4 === 0 ? 1 : 0.5 }, { "--beat": 0, duration: 0.5, ease: "power2.out" });
      }
    } else if (!reduceMotion && !demo.active && !mic?.active && Math.floor(t / 3) !== lastBeat) {
      lastBeat = Math.floor(t / 3);
      setColor();
    }
    beatPulse *= Math.exp(-dt * 5);
    if (demo.active && t > demo.until) demo.active = false;
    updateMic();

    // Pose del scroll + paralaje, seguida con resortes.
    computeTarget();
    target.x += pointerOff.x * (1 - target.explode) * (1 - target.lineup);
    target.y += pointerOff.y * (1 - target.explode);
    springs(dt);
    const side = activeSlot?.chapter?.dataset.side ?? "right";
    if (side !== lastSide) { lastSide = side; document.body.dataset.side = side; }
    const pal = activeSlot?.chapter?.dataset.pal ?? "hero";
    if (pal !== lastPal) { lastPal = pal; document.body.dataset.pal = pal; }
    // Ambiente del fondo según el capítulo.
    const M = MOODS[activeSlot?.mood] ?? MOODS.show;
    for (const k in mood) mood[k] += (M[k] - mood[k]) * (reduceMotion ? 1 : Math.min(1, dt * 1.5));
    if (activeSlot?.chapter?.id === "oceano" && !climaxDone && !reduceMotion) {
      climaxDone = true;
      show.burst = safeMode ? 0.8 : 1.4; show.burstT = t; show.beatKick = 1;
      spinVel += 0.1;
      pulse(1.1);
    } else if (activeSlot?.chapter?.id !== "oceano") climaxDone = false;

    const breathe = reduceMotion ? 0 : Math.sin(t * 1.1) * 0.05;
    const [fx0, fy0, fs0] = frameFit(view.x, view.y, view.s, view.explode, view.gest);
    const ringK = ring.mainIn;
    pivot.position.set(fx0, fy0 + breathe * fs0, 0);
    pivot.scale.setScalar(fs0);

    // Giro: libre en la portada, si no vuelve a la orientación de la pose. Inclinación con resorte.
    if (!dragging) spinVel += (0.004 * view.spin - spinVel) * Math.min(1, dt * 1.6);
    if (!reduceMotion) spinAngle += spinVel;
    if (view.spin < 0.99 && !dragging) {
      const d = Math.atan2(Math.sin(view.rot - spinAngle), Math.cos(view.rot - spinAngle));
      spinAngle += d * (reduceMotion || SHOT ? 1 : Math.min(1, dt * 2.2)) * (1 - view.spin);
    }
    if (dragging) { pitch += pitchVel * dt; pitchVel *= 0.85; pitch = Math.max(-0.8, Math.min(0.8, pitch)); }
    else { pitchVel += (-36 * pitch - 12 * pitchVel) * dt; pitch += pitchVel * dt; }
    stick.rotation.y = spinAngle;
    stick.rotation.x = view.tilt + pitch;

    // Gestos de concierto por capítulo.
    const g = activeSlot?.gesture ?? "none";
    const allow = !reduceMotion && view.explode < 0.05;
    const E = allow ? view.gest : 0;
    gwT.sway = gwT.pump = gwT.wave = gwT.shake = 0;
    if (g === "intro" && playing) { gwT.sway = 0.8; gwT.pump = 0.35; }
    else if (g === "demo") {
      const k = demo.active ? demo.gesture : "sway";
      gwT[k] = demo.active ? 1 : 0.5;
      if (demo.active && k === "pump") gwT.shake = safeMode ? 0 : 0.8;
    } else if (g === "sway") gwT.sway = 0.6;
    else if (g === "pump") { gwT.pump = 1; gwT.sway = 0.3; gwT.shake = playing && !safeMode ? 0.6 : 0; }
    for (const k in gw) gw[k] += (gwT[k] * E - gw[k]) * Math.min(1, dt * 2.5);
    const o = allow ? gestureOffsets(b, t, beatSec) : { rz: 0, rx: 0, dx: 0, dy: 0 };
    hand.rotation.set(o.rx, 0, o.rz);
    hand.position.set(o.dx, STICK_Y + GRIP + o.dy, 0);
    // Movimiento secundario: el globo se atrasa unos cuadros respecto del mango.
    handVz = (o.rz - lastHandZ) / Math.max(dt, 1e-3);
    lastHandZ = o.rz;
    lagV += (-60 * (lag + handVz * 0.02) - 14 * lagV) * dt;
    lag += lagV * dt;
    if (Math.abs(handVz) > 1.2) glow.intensity = Math.max(glow.intensity, 1 + Math.min(0.6, Math.abs(handVz) * 0.15));

    // Vista explosionada: piezas con desfase (expo-out), rotación propia y deriva lenta.
    PARTS.forEach((p, i) => {
      const e = clamp01(view.explode * 1.42 - i * 0.06);
      const eased = e === 1 ? 1 : 1 - Math.pow(2, -9 * e);
      const drift = reduceMotion ? 0 : Math.sin(t * 0.9 + i * 1.3) * 0.08 * eased;
      p.position.copy(p.userData.offset).multiplyScalar(eased);
      p.position.y += drift;
      const r = p.userData.rot;
      const lagZ = i < 3 ? lag * (1 - eased) : 0;
      p.rotation.set(r[0] * eased, r[1] * eased + (reduceMotion ? 0 : Math.sin(t * 0.6 + i) * 0.05 * eased), r[2] * eased + lagZ);
      const hs = hotPart && (p.name === hotPart || (hotPart === "buttons" && p.name === "handle")) ? 1.07 + Math.sin(t * 6) * 0.015 : 1;
      p.scale.setScalar(p.scale.x + (hs - p.scale.x) * Math.min(1, dt * 8));
    });
    v4.strap.rotation.z = -o.rz * 0.6;
    shadow.material.opacity = 0.32 * (1 - view.explode) * (1 - view.lineup * 0.5);
    // Ronda de versiones: el principal entra y sale en espiral hasta su lugar (índice 0).
    const R0 = updateRing(dt, t);
    if (R0 && ring.mainIn > 0.001) {
      const m = ring.mainIn, e2 = m * m * (3 - 2 * m), f = 4 * e2 * (1 - e2);
      const tx = R0.pos.x, ty = R0.pos.y - (STICK_Y + GRIP) * R0.s, tz = R0.pos.z + R0.hot * 1.1 * R0.s;
      const hx = Math.sin(e2 * Math.PI * 3) * f * 2 * R0.s, hz = Math.cos(e2 * Math.PI * 3) * f * 1.6 * R0.s, hy = f * 1.4 * R0.s;
      pivot.position.set(pivot.position.x + (tx - pivot.position.x) * e2 + hx, pivot.position.y + (ty - pivot.position.y) * e2 + hy, tz * e2 + hz);
      pivot.scale.setScalar(pivot.scale.x + (R0.s * (1 + R0.hot * 0.12) - pivot.scale.x) * e2);
      const own = reduceMotion ? 0 : t * 0.9;
      stick.rotation.y = spinAngle + Math.atan2(Math.sin(own - spinAngle), Math.cos(own - spinAngle)) * e2;
      hand.rotation.z += 0.24 * e2 * Math.sin(R0.theta);
      hand.rotation.x += -0.24 * e2 * Math.cos(R0.theta);
      // Durante la entrada/salida en espiral también se mantiene a la vista.
      {
        // Corrige la perspectiva: más cerca de la cámara se ve más grande.
        const kz = camera.position.z / Math.max(1, camera.position.z - pivot.position.z);
        const y0 = pivot.position.y;
        const [, fy, fs] = frameFit(pivot.position.x, y0 * kz, pivot.scale.x * kz, 0, e2 < 0.98 ? 1 : 0.3);
        pivot.position.y = fy / kz;
        pivot.scale.setScalar(fs / kz);
      }
    }
    stick.updateMatrixWorld();
    updateMarkers();

    // Materiales encendidos y luces.
    const ringDim = 1 - 0.6 * Math.max(view.lineup, ring.othersIn);
    mats.update(liveC.copy(color).multiplyScalar(ringDim), glow.intensity * ringDim);
    v4.light.color.copy(color);
    v4.light.intensity = 12 + 10 * glow.intensity;
    bloom.strength = (0.38 + 0.22 * glow.intensity) * (1 - 0.6 * Math.max(view.lineup, ring.othersIn));
    // Estela del globo en movimientos fuertes.
    partByName.emblem.getWorldPosition(_v);
    trailHist.unshift(_v.clone());
    trailHist.length = Math.min(trailHist.length, 14);
    const speed = Math.abs(handVz);
    trail.forEach((s, i) => {
      const pnt = trailHist[Math.min(trailHist.length - 1, (i + 1) * 2)];
      s.position.copy(pnt);
      s.scale.setScalar(2.2 * view.s * (1 - i * 0.15));
      s.material.color.copy(color);
      s.material.opacity = reduceMotion ? 0 : Math.min(0.35, Math.max(0, speed - 1.5) * 0.12) * (1 - i / trail.length);
    });

    updateBackground(t, dt, beatPulse);

    // Público: tranquilo en reposo; con la intro se enciende de adelante hacia atrás; en la demo
    // responde al color y al momento; en el clímax bombea al pulso.
    const crowdKey = view.crowd.toFixed(2) + (demo.active ? demo.color.getHexString() + demo.energy : "");
    if (!reduceMotion || crowdPainted !== crowdKey) {
      const live = (playing && !reduceMotion) || demo.active || mic?.active ? 1 : 0;
      show.live += (live - show.live) * (reduceMotion ? 1 : Math.min(1, dt * 1.5));
      if (demo.active) show.progress += (demo.energy - show.progress) * (reduceMotion ? 1 : Math.min(1, dt * 2));
      else if (!playing) show.progress += (0 - show.progress) * Math.min(1, dt * 0.5);
      show.beatKick *= Math.exp(-dt * 6);
      show.burst *= Math.exp(-dt * 1.4);
      const L = show.live, P = show.progress, boost = view.crowd;
      const energy = L * (0.25 + 0.75 * P);
      const pumpAmt = reduceMotion ? 0 : (playing || demo.active ? 0.6 : 0) + (activeSlot?.gesture === "pump" ? view.gest * 0.6 : 0);
      if (!reduceMotion && (!LOW_END || (frameN++ & 1) === 0)) placeCrowd(t, energy, pumpAmt, b, L); // en teléfonos, cada 2 cuadros
      const cA = demo.active ? demo.color : mic?.active ? color : CROWD_PALETTE[show.step % CROWD_PALETTE.length];
      const cB = demo.active ? demo.color : mic?.active ? color : CROWD_PALETTE[(show.step + 1) % CROWD_PALETTE.length];
      const litEdge = 1.25 + L * (0.12 + 1.0 * P - 1.25);
      const base = 0.55 + L * (0.18 + 0.6 * P - 0.55);
      const amp = reduceMotion ? 0 : 0.28 + L * (0.12 + 0.5 * P - 0.28);
      const speedW = 1.1 + L * (1 + 1.6 * P);
      const front = (t - show.burstT) * 0.8;
      const mixB = L * (0.1 + 0.45 * P);
      const ic = crowd.instanceColor.array;
      for (let i = 0; i < N; i++) {
        const lit = Math.min(1, Math.max(0.06, (litEdge - rowN[i]) / 0.1));
        const wave = Math.sin(t * speedW - phase[i]);
        const d = rowN[i] - front;
        const burst = reduceMotion ? 0 : show.burst * Math.exp(-d * d * 40);
        const waveGlow = reduceMotion ? 0 : crowdRaise[i] * (safeMode ? 0.35 : 0.55); // la luz viaja con la ola
        const w = boost * lit * Math.max(0.04, base + amp * wave + 0.25 * show.beatKick * L * P + burst + waveGlow) * (0.75 + 0.5 * seed[i]);
        tmp.copy(seed[i] < mixB ? cB : cA).lerp(IDLE_PURPLE, 1 - L).multiplyScalar(w);
        ic[i * 3] = tmp.r; ic[i * 3 + 1] = tmp.g; ic[i * 3 + 2] = tmp.b;
      }
      crowd.instanceColor.needsUpdate = true;
      crowdPainted = crowdKey;
    }

    // Interfaz que sigue a la escena: color vivo (para degradados), compás del reto y barra del video.
    if (t - liveT > 0.1) {
      liveT = t;
      const hsl = {};
      liveTmp.copy(color).getHSL(hsl);
      liveTmp.setHSL(hsl.h, Math.max(0.55, hsl.s), Math.min(0.78, Math.max(0.62, hsl.l)));
      const hex = `#${liveTmp.getHexString()}`;
      if (hex !== lastLive) { lastLive = hex; root.style.setProperty("--live", hex); }
      updateVideoMock();
      syncPlayButtonsLazy();
    }
    if (rtPad) rtPad.style.setProperty("--b", Math.exp(-((b % 1) * 6)).toFixed(2));

    const t0 = performance.now();
    if (DEBUG) renderer.info.reset();
    if (useBloom) composer.render(); else renderer.render(scene, camera);
    perfTick(dt, performance.now() - t0);
  }
  // ---------- Rendimiento: calidad adaptativa y medición con ?debug=1 ----------
  // Si el cuadro tarda > 22 ms durante 2 s, se baja un escalón: sin transmisión → sin bloom → menos público.
  let useBloom = !VERY_LOW, slowFor = 0, qTier = VERY_LOW ? 2 : 0, frames = 0, acc = 0, accCpu = 0, lastReport = 0;
  const DEBUG = params.has("debug");
  if (DEBUG) renderer.info.autoReset = false;
  const dbg = DEBUG ? Object.assign(document.createElement("pre"), { className: "perf" }) : null;
  if (dbg) document.body.append(dbg);
  function perfTick(dt, cpu) {
    frames++; acc += dt; accCpu += cpu;
    slowFor = dt > 0.022 ? slowFor + dt : Math.max(0, slowFor - dt * 0.5);
    if (slowFor > (LOW_END ? 1 : 2) && !SHOT && qTier < 3) { // en teléfonos se reacciona en 1 s, no en 2
      slowFor = 0;
      qTier++;
      if (qTier === 1 && mats.glass.transmission > 0) { mats.glass.transmission = 0; mats.glass.transparent = true; mats.glass.opacity = 0.16; mats.glass.needsUpdate = true; }
      else if (qTier === 2) useBloom = false;
      else if (qTier === 3) crowd.count = Math.floor(N / 2);
      if (DEBUG) console.info("[pws] calidad ↓", qTier);
    }
    const now = performance.now();
    if (DEBUG && now - lastReport > 1000) {
      const i = renderer.info.render;
      const line1 = `${(frames / acc).toFixed(0)} fps · ${(acc / frames * 1000).toFixed(1)} ms/cuadro · cpu ${(accCpu / frames).toFixed(1)} ms`;
      const line2 = `${i.calls} draw calls · ${(i.triangles / 1000).toFixed(0)}k tri · nivel ${qTier}`;
      dbg.textContent = `${line1}\n${line2}`;
      console.info("[pws]", line1, "·", line2);
      frames = 0; acc = 0; accCpu = 0; lastReport = now;
    }
  }
  let lastPlayState = null;
  function syncPlayButtonsLazy() { const p = isPlaying(); if (p !== lastPlayState) { lastPlayState = p; syncPlayButtons(); setIntroButton(p); } }

  api = { setColor, pulse };
  if (SHOT) {
    // Prueba automática: proyecta la caja del lightstick a la pantalla y comprueba que quede dentro (bajo la barra).
    window.__pwsFrame = () => {
      const box = new THREE.Box3().setFromObject(stick, true);
      const pts = [];
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) pts.push(new THREE.Vector3(x, y, z).project(camera));
      const xs = pts.map((p) => (p.x + 1) / 2 * innerWidth), ys = pts.map((p) => (1 - p.y) / 2 * innerHeight);
      const r = { left: Math.min(...xs) | 0, right: Math.max(...xs) | 0, top: Math.min(...ys) | 0, bottom: Math.max(...ys) | 0, nav: NAV_H(), w: innerWidth, h: innerHeight };
      r.inside = r.top >= r.nav - 2 && r.bottom <= innerHeight + 2 && r.left >= -2 && r.right <= innerWidth + 2;
      return r;
    };
  }
  if (SHOT) {
    document.documentElement.style.scrollBehavior = "auto";
    scrollTo({ top: Number(SHOT) || 0, behavior: "instant" });
    ScrollTrigger?.refresh();
    if (anatSlot && ScrollTrigger) {
      const st = ScrollTrigger.getAll().find((s) => s.trigger === anatSlot.chapter);
      if (st) anat.p = st.progress;
    }
    // Opcional en pruebas: &hot=pieza, &model=v3, &demo=<color>,<mood>,<gesto>.
    const hot = params.get("hot");
    if (hot) { hotFromUI = true; setHot(hot); }
    const mdl = params.get("model");
    if (mdl) ring.hot = mdl;
    const dm = params.get("demo");
    if (dm) { const [c, m, gname] = dm.split(","); demo.active = true; demo.color.set(`#${c}`); demo.energy = Number(m); demo.gesture = gname; demo.until = 1e9; color.set(`#${c}`); }
    if (verSection) loadLineup();
  }
  computeTarget();
  Object.assign(view, target);
  loop();
}

// ---------- Tipografía cinética ----------
// Los títulos se parten en palabras y letras (spans decorativos con aria-hidden) y el texto completo queda
// en un span .sr-only para lectores de pantalla.
function splitHeading(el) {
  const label = el.textContent.replace(/\s+/g, " ").trim();
  const visual = document.createElement("span");
  visual.setAttribute("aria-hidden", "true");
  const walk = (node, into) => {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === 3) {
        for (const part of ch.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { into.append(" "); continue; }
          const w = document.createElement("span");
          w.className = "w";
          for (const c of Array.from(part)) {
            const s = document.createElement("span");
            s.className = "c";
            s.textContent = c;
            w.append(s);
          }
          into.append(w);
        }
      } else if (ch.nodeType === 1) {
        const clone = ch.cloneNode(false);
        walk(ch, clone);
        into.append(clone);
      }
    }
  };
  walk(el, visual);
  const sr = document.createElement("span");
  sr.className = "sr-only";
  sr.textContent = label;
  el.replaceChildren(sr, visual);
  return visual;
}
const kts = [...document.querySelectorAll(".kt")].map((el) => ({ el, es: spanishClone(el), visual: splitHeading(el) }));
// Al cambiar de idioma, las letras sueltas se rehacen desde el original en español (la capa de idioma no las ve).
addEventListener("pws:lang", () => {
  for (const k of kts) {
    k.el.replaceChildren(...localize(k.es.cloneNode(true)).childNodes);
    k.visual = splitHeading(k.el);
  }
  layoutGradients();
});
// Degradado continuo sobre letras sueltas: cada letra recibe su desplazamiento dentro del bloque .grad.
function layoutGradients() {
  for (const g of document.querySelectorAll(".kt .grad")) {
    const r = g.getBoundingClientRect();
    for (const c of g.querySelectorAll(".c")) {
      const cr = c.getBoundingClientRect();
      c.style.setProperty("--gx", `${(cr.left - r.left).toFixed(1)}px`);
      c.style.setProperty("--gw", `${r.width.toFixed(1)}px`);
    }
  }
}
layoutGradients();
document.fonts?.ready.then(layoutGradients);
addEventListener("resize", () => requestAnimationFrame(layoutGradients));

// Banda de frases: se duplica el contenido para que el bucle no tenga cortes.
for (const tr of document.querySelectorAll(".mq-track")) tr.innerHTML += tr.innerHTML;

if (gsap && !reduceMotion && !SHOT) {
  // Portada: letras con desenfoque, inclinación y subida escalonada.
  const heroChars = document.querySelectorAll("#hero-title .c");
  gsap.from(heroChars, { yPercent: 70, opacity: 0, skewX: 14, filter: "blur(10px)", duration: 1.1, stagger: 0.022, ease: "expo.out", delay: 0.1, clearProps: "filter" });
  gsap.from(".reveal", { y: 26, opacity: 0, duration: 1, stagger: 0.08, ease: "expo.out", delay: 0.45 });
  // Respiración del espaciado en las etiquetas.
  if (innerWidth >= 720) gsap.to(".kicker, .eyebrow", { letterSpacing: "0.22em", duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
  if (ScrollTrigger) {
    // Títulos de capítulo: entran letra por letra al aparecer.
    for (const { el } of kts) {
      if (el.id === "hero-title") continue;
      gsap.from(el.querySelectorAll(".c"), {
        yPercent: 60, opacity: 0, skewX: 12, filter: "blur(8px)", duration: 0.9, stagger: 0.014, ease: "expo.out", clearProps: "filter",
        scrollTrigger: { trigger: el, start: "top 86%", once: true },
      });
    }
    // Peso variable con el scroll en la palabra gigante de la portada (900 → 500) y vuelta al pasar el cursor.
    const giant = document.querySelectorAll("#hero-title .h-giant .c");
    gsap.to(giant, { fontWeight: 480, stagger: 0.04, ease: "none", scrollTrigger: { trigger: "#inicio", start: "top top", end: "bottom 30%", scrub: 1 } });
    for (const c of giant) c.addEventListener("pointerenter", () => gsap.to(c, { fontWeight: 900, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out" }));
    for (const el of gsap.utils.toArray(".reveal-up")) {
      const kids = el.matches(".parts, .steps, .feats, .stats, .chips, .demo, .vers") ? el.querySelectorAll(":scope > *") : [el];
      gsap.from(kids, { y: 34, opacity: 0, duration: 1.1, stagger: 0.07, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    }
    // Palabra con contorno que se rellena con el color al avanzar por el clímax.
    const bw = document.querySelector(".bigword");
    if (bw) gsap.fromTo(bw, { "--fill": "0%" }, { "--fill": "100%", ease: "none", scrollTrigger: { trigger: "#oceano", start: "top 85%", end: "center 45%", scrub: 1.2 } });
    // Contadores de la banda de datos.
    for (const dd of document.querySelectorAll(".stats dd[data-count]")) {
      const n = { v: 0 }, to = Number(dd.dataset.count) || 0;
      gsap.to(n, { v: to, duration: 1.6, ease: "expo.out", onUpdate: () => { dd.textContent = String(Math.round(n.v)); }, scrollTrigger: { trigger: dd, start: "top 92%", once: true } });
    }
    // Marquesinas: avanzan solas y se aceleran con la velocidad del scroll.
    for (const [i, tr] of document.querySelectorAll(".mq-track").entries()) {
      const tw = gsap.to(tr, { xPercent: i % 2 ? 0 : -50, startAt: { xPercent: i % 2 ? -50 : 0 }, duration: 38, ease: "none", repeat: -1 });
      ScrollTrigger.create({ trigger: tr, start: "top bottom", end: "bottom top", onUpdate: (s) => { tw.timeScale(1 + Math.min(4, Math.abs(s.getVelocity()) / 600)); } });
    }
  }
}

// ---------- Tooltips propios (en lugar de "title"): burbuja accesible con flecha ----------
{
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.id = "tip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.append(tip);
  let timer = 0, owner = null;
  const place = (el) => {
    const r = el.getBoundingClientRect();
    tip.hidden = false;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let top = r.top - th - 10, below = false;
    if (top < 8) { top = r.bottom + 10; below = true; } // se voltea para no salirse
    const left = Math.max(8, Math.min(innerWidth - tw - 8, r.left + r.width / 2 - tw / 2));
    tip.style.transform = `translate(${left}px, ${top}px)`;
    tip.style.setProperty("--ax", `${r.left + r.width / 2 - left}px`);
    tip.classList.toggle("below", below);
  };
  const showTip = (el, delay) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      owner = el;
      tip.textContent = el.dataset.tip;
      el.setAttribute("aria-describedby", "tip");
      place(el);
      tip.classList.add("on");
    }, delay);
  };
  const hideTip = () => {
    clearTimeout(timer);
    owner?.removeAttribute("aria-describedby");
    owner = null;
    tip.classList.remove("on");
    tip.hidden = true;
  };
  document.addEventListener("pointerover", (e) => { const el = e.target.closest("[data-tip]"); if (el && e.pointerType !== "touch") showTip(el, 400); });
  document.addEventListener("pointerout", (e) => { if (e.target.closest("[data-tip]") && !e.relatedTarget?.closest?.("[data-tip]")) hideTip(); });
  document.addEventListener("focusin", (e) => { const el = e.target.closest("[data-tip]"); if (el && e.target.matches(":focus-visible")) showTip(el, 0); });
  document.addEventListener("focusout", hideTip);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && owner) hideTip(); });
  addEventListener("scroll", () => { if (owner) place(owner); }, { passive: true });
}
