// Landing: lightstick 3D (three.js) que gira al ritmo de la intro de la canción destacada y que,
// al hacer scroll (GSAP + ScrollTrigger), se desarma como una vista de anatomía y acompaña cada sección.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { FEATURED } from "./config.js";
import { ALBUMS, CONCERT_FILMS } from "./catalog.js";

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
// Solo para pruebas con capturas: ?shot=<px> salta a esa posición sin suavizado ni animaciones de entrada.
const SHOT = new URLSearchParams(location.search).get("shot");
const canvas = document.getElementById("scene");

const PALETTE = ["#8a2be2", "#4fc3f7", "#ff80ab", "#ffd600", "#7c4dff", "#00e5ff", "#ff3d00", "#e0f7fa"].map((c) => new THREE.Color(c));
const featuredAlbum = ALBUMS.find((a) => a.songs.some((s) => s.id === FEATURED.songId));
if (featuredAlbum) PALETTE.splice(1, 0, ...featuredAlbum.palette.map((c) => new THREE.Color(c))); // morado primero, luego el álbum

// ---------- Escena ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
} catch {
  canvas.remove();
}

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 720 ? 1.5 : 2));
  document.documentElement.classList.add("has3d");
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#060818");
  scene.fog = new THREE.Fog("#060818", 16, 62);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.4, 11);

  scene.add(new THREE.AmbientLight("#8090ff", 0.35));
  const key = new THREE.DirectionalLight("#ffffff", 1.4);
  key.position.set(4, 6, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#7c4dff", 1.2);
  rim.position.set(-6, 2, -4);
  scene.add(rim);

  // ---------- Lightstick (ilustración inspirada, no el diseño oficial) ----------
  // Proporciones medidas en fotos de producto (vista frontal), relativas al diámetro D del globo:
  // mango ≈ 0.33·D de ancho y ≈ 1.32·D de largo (con tapa de pilas ≈ 0.23·D), collar ≈ 0.49·D de
  // ancho y ≈ 0.085·D de alto, remate ≈ 0.32·D a ~28° del eje con gema ≈ 0.09·D, botón ≈ 0.13·D
  // × 0.21·D, largo total ≈ 2.4·D. 1 unidad ≈ 3 cm → globo r = 1.55.
  // Dentro del globo hay un emblema ORIGINAL (una ola, identidad de "Purple Wave"): no se
  // reproduce ningún logo ni emblema registrado.
  const stick = new THREE.Group();
  const color = PALETTE[0].clone();
  // Revoluciona un perfil [radio, y] alrededor del eje Y.
  // El perfil se ordena de abajo hacia arriba para que las normales miren hacia fuera.
  const lathe = (pts, segs = 48) => {
    const p = pts[0][1] > pts[pts.length - 1][1] ? [...pts].reverse() : pts;
    return new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  };

  const R = 1.55; // radio del globo
  const BASE_Y = -0.86; // cara superior de la plataforma interior
  const COLLAR_TOP = -1.31, COLLAR_BOT = -1.57, HANDLE_R = 0.52, HANDLE_BOT = -5.67;
  // Resplandor suave dentro del globo (tiñe el globo con el color actual).
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(R - 0.04, 40, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1, depthWrite: false }),
  );
  core.renderOrder = 1;

  // Emblema: UNA pieza de acrílico esmerilado — una ola gordita con el rizo redondo,
  // dos burbujas y un destello, todo extruido junto con bisel suave.
  const wave = new THREE.Shape();
  wave.moveTo(-0.42, 0);
  wave.lineTo(0.42, 0);
  wave.quadraticCurveTo(0.58, 0, 0.57, 0.16);
  wave.bezierCurveTo(0.5, 0.45, 0.1, 0.62, 0.1, 0.98); // cara de la ola
  wave.bezierCurveTo(0.1, 1.28, 0.44, 1.38, 0.55, 1.16); // hueco profundo bajo el rizo
  wave.quadraticCurveTo(0.6, 1.02, 0.52, 0.96); // puntita redonda del rizo
  wave.bezierCurveTo(0.72, 0.86, 0.98, 1.08, 0.9, 1.38); // bola del rizo
  wave.bezierCurveTo(0.8, 1.76, 0.14, 1.9, -0.22, 1.66); // cresta
  wave.bezierCurveTo(-0.6, 1.44, -0.62, 0.62, -0.57, 0.16); // lomo
  wave.quadraticCurveTo(-0.58, 0, -0.42, 0);
  const bubble = (x, y, r) => new THREE.Shape().absarc(x, y, r, 0, Math.PI * 2, false);
  const sparkle = (x, y, s) => {
    const sh = new THREE.Shape();
    sh.moveTo(x, y + s);
    sh.quadraticCurveTo(x, y, x + s, y);
    sh.quadraticCurveTo(x, y, x, y - s);
    sh.quadraticCurveTo(x, y, x - s, y);
    sh.quadraticCurveTo(x, y, x, y + s);
    return sh;
  };
  const emblemGeo = new THREE.ExtrudeGeometry(
    [wave, bubble(-0.6, 1.9, 0.11), bubble(-0.8, 1.64, 0.07), sparkle(0.82, 1.82, 0.15)],
    { depth: 0.1, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 4, curveSegments: 14 },
  );
  emblemGeo.translate(-0.02, 0, -0.05);
  emblemGeo.scale(0.92, 0.92, 1);
  const crystal = new THREE.Mesh(
    emblemGeo,
    new THREE.MeshPhysicalMaterial({ color: "#2a2836", emissive: color, emissiveIntensity: 1.8, roughness: 0.5, metalness: 0, clearcoat: 0.5, transparent: true, opacity: 0.94 }),
  );
  crystal.position.y = BASE_Y + 0.02;
  crystal.renderOrder = 2;
  // Bordes biselados que brillan más (el bloom los resalta).
  const emblemEdges = new THREE.LineSegments(new THREE.EdgesGeometry(emblemGeo, 40), new THREE.LineBasicMaterial({ color }));
  emblemEdges.position.copy(crystal.position);

  // Plataforma interior: disco esmerilado con anillo de luz y 24 marcas blancas (esfera de reloj),
  // sobre una banda ahumada que sigue la curva del globo hasta el collar.
  const frost = new THREE.MeshPhysicalMaterial({ color: "#e9e6f2", roughness: 0.55, transparent: true, opacity: 0.6, depthWrite: false });
  const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.1, 0.06, 64), frost);
  baseDisc.position.y = BASE_Y - 0.03;
  const smoke = new THREE.Mesh(
    lathe([[0.78, COLLAR_TOP + 0.02], [0.95, -1.18], [1.07, -1.0], [1.1, BASE_Y - 0.06]]),
    new THREE.MeshPhysicalMaterial({ color: "#3b3946", roughness: 0.35, metalness: 0.2, transparent: true, opacity: 0.85 }),
  );
  const ledRing = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.028, 6, 72), new THREE.MeshBasicMaterial({ color }));
  ledRing.rotation.x = Math.PI / 2;
  ledRing.position.y = BASE_Y + 0.005;
  const ticks = new THREE.Mesh(
    mergeGeometries(Array.from({ length: 24 }, (_, i) => {
      const g = new THREE.BoxGeometry(0.03, 0.012, 0.12);
      g.translate(0, 0, 0.84);
      g.rotateY((i / 24) * Math.PI * 2);
      return g;
    })),
    new THREE.MeshBasicMaterial({ color: "#ffffff" }),
  );
  ticks.position.y = BASE_Y + 0.008;

  // Globo de policarbonato perfectamente transparente.
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: "#ffffff", roughness: 0.02, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02,
    transparent: true, opacity: 0.12, emissive: color, emissiveIntensity: 0.12, depthWrite: false,
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), shellMat);
  shell.renderOrder = 3;
  const coreLight = new THREE.PointLight(color, 30, 12, 2);
  coreLight.position.y = 0;

  const gloss = new THREE.MeshPhysicalMaterial({ color: "#0b0a10", metalness: 0.3, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.15 });
  const satin = new THREE.MeshStandardMaterial({ color: "#121117", metalness: 0.25, roughness: 0.55 });
  const chrome = new THREE.MeshStandardMaterial({ color: "#e4e2ee", metalness: 1, roughness: 0.15 });
  // Collar corto (≈0.49·D), más ancho que el mango, con borde fino brillante.
  const collar = new THREE.Mesh(
    lathe([[0.7, COLLAR_TOP + 0.03], [0.76, COLLAR_TOP], [0.77, COLLAR_TOP - 0.04], [0.77, COLLAR_BOT + 0.03], [0.74, COLLAR_BOT], [HANDLE_R, COLLAR_BOT]]),
    Object.assign(gloss.clone(), { side: THREE.DoubleSide }),
  );
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.765, 0.014, 8, 64), chrome);
  rimRing.rotation.x = Math.PI / 2;
  rimRing.position.y = COLLAR_TOP - 0.01;
  const rimRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.01, 6, 64), chrome);
  rimRing2.rotation.x = Math.PI / 2;
  rimRing2.position.y = COLLAR_BOT + 0.015;
  // Mango recto negro satinado con tapa de pilas (≈0.23·D) separada por una junta, base plana redondeada.
  const SEAM_Y = HANDLE_BOT + 0.71;
  const handle = new THREE.Mesh(
    lathe([[0, SEAM_Y + 0.01], [HANDLE_R - 0.04, SEAM_Y + 0.01], [HANDLE_R, SEAM_Y + 0.03], [HANDLE_R, COLLAR_BOT], [0, COLLAR_BOT + 0.001]]),
    satin,
  );
  const bottomCap = new THREE.Mesh(
    lathe([[0, HANDLE_BOT], [HANDLE_R - 0.08, HANDLE_BOT], [HANDLE_R - 0.03, HANDLE_BOT + 0.01], [HANDLE_R, HANDLE_BOT + 0.06], [HANDLE_R, SEAM_Y - 0.01], [0, SEAM_Y - 0.009]]),
    satin,
  );
  const seam = new THREE.Mesh(new THREE.TorusGeometry(HANDLE_R, 0.008, 6, 48), new THREE.MeshStandardMaterial({ color: "#3a3844", roughness: 0.4, metalness: 0.6 }));
  seam.rotation.x = Math.PI / 2;
  seam.position.y = SEAM_Y;
  // Dos botones (se pulsan juntos para el modo Bluetooth): una píldora vertical con contorno
  // plateado, dividida en botón superior e inferior.
  const BTN_Y = -2.23;
  const bezel = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.3, 4, 16), chrome);
  bezel.scale.z = 0.2;
  bezel.position.set(0, BTN_Y, HANDLE_R - 0.02);
  const btnMat = new THREE.MeshStandardMaterial({ color: "#16141c", emissive: color, emissiveIntensity: 0.3, roughness: 0.4 });
  const half = (up) => {
    const g = new THREE.CapsuleGeometry(0.165, 0.1, 4, 16);
    const m = new THREE.Mesh(g, btnMat);
    m.scale.set(1, 1, 0.22);
    m.position.set(0, BTN_Y + (up ? 0.13 : -0.13), HANDLE_R + 0.005);
    return m;
  };
  const button = half(true);
  const button2 = half(false);
  // Remate: tapa negra cilíndrica (≈0.32·D) a ~28° del eje, con una gema roja facetada pequeña al centro.
  const capGroup = new THREE.Group();
  const capMount = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.2, 24), gloss); // se hunde en el globo
  capMount.position.y = -0.08;
  const capBody = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.5, 0.24, 40), gloss);
  capBody.position.y = 0.12;
  const capEdge = new THREE.Mesh(new THREE.TorusGeometry(0.485, 0.012, 6, 40), chrome);
  capEdge.rotation.x = Math.PI / 2;
  capEdge.position.y = 0.24;
  const gem = new THREE.Mesh(
    lathe([[0.15, 0.23], [0.16, 0.28], [0.09, 0.35], [0, 0.36]], 8),
    new THREE.MeshPhysicalMaterial({ color: "#c0142e", emissive: "#5a0012", roughness: 0.06, metalness: 0.1, clearcoat: 1, flatShading: true }),
  );
  capGroup.add(capMount, capBody, capEdge, gem);
  // ~28° del eje hacia un lado y algo hacia el frente, como en las fotos.
  const capDir = new THREE.Vector3(0.47, 0.8, 0.37).normalize();
  capGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), capDir);
  capGroup.position.copy(capDir).multiplyScalar(R - 0.21);

  // Piezas para la vista explosionada: cada grupo se separa a lo largo del eje con su desplazamiento,
  // y lleva un punto de anclaje (en coordenadas del lightstick) para su etiqueta.
  const part = (name, offset, anchor, ...meshes) => {
    const g = new THREE.Group();
    g.name = name;
    g.add(...meshes);
    g.userData = { offset: new THREE.Vector3(...offset), anchor: new THREE.Vector3(...anchor) };
    stick.add(g);
    return g;
  };
  const capAnchor = capDir.clone().multiplyScalar(R + 0.25);
  const PARTS = [
    part("gem", [0.35, 2.55, 0.25], capAnchor.toArray(), capGroup),
    part("shell", [0, 2.05, 0], [R * 0.74, R * 0.5, 0], shell, core),
    part("emblem", [0, 0.6, 0.9], [0.7, 0.35, 0], crystal, emblemEdges, coreLight),
    part("base", [0, 0, 0], [1.1, BASE_Y - 0.03, 0], smoke, baseDisc, ledRing, ticks),
    part("collar", [0, -0.55, 0], [0.77, (COLLAR_TOP + COLLAR_BOT) / 2, 0], collar, rimRing, rimRing2),
    part("handle", [0, -1.05, 0], [HANDLE_R, -3.7, 0], handle, bezel, button, button2),
    part("bottom", [0, -1.75, 0], [HANDLE_R, HANDLE_BOT + 0.35, 0], bottomCap, seam),
  ];
  // Leve rotación propia de cada pieza al separarse (x, y, z), para que no salgan rígidas.
  const PART_ROT = { gem: [0.1, 0.6, -0.25], shell: [0, 0.5, 0.08], emblem: [0, -0.35, 0], base: [0.14, 0, 0], collar: [0, 0, -0.12], handle: [0, 0, 0.06], bottom: [-0.22, 0, 0.1] };
  for (const g of PARTS) g.userData.rot = PART_ROT[g.name];
  const partByName = Object.fromEntries(PARTS.map((g) => [g.name, g]));
  // Etiquetas: la de los botones se ancla en los botones (pieza "handle").
  const LABEL_ANCHORS = {
    gem: ["gem"], shell: ["shell"], emblem: ["emblem"], base: ["base"], collar: ["collar"],
    buttons: ["handle", new THREE.Vector3(0.16, BTN_Y, HANDLE_R + 0.02)], handle: ["handle"], bottom: ["bottom"],
  };
  const pivot = new THREE.Group(); // inclinación por puntero
  pivot.add(stick);
  const STICK_Y = 1.65;
  stick.position.y = STICK_Y;
  scene.add(pivot);

  // ---------- Océano de luces (público a lo lejos) ----------
  // Miles de mini lightsticks (globo + mango, ~28 triángulos) en un solo InstancedMesh.
  // El color de vértice (blanco en el globo, casi negro en el mango) se multiplica por el
  // color de cada instancia, así solo el globo se enciende.
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
  // Asientos: arcos de pista frente al escenario (cerca de la cámara) y gradas que suben al fondo y a los lados.
  const seats = [];
  const STAGE_Z = 4, FLOOR_Y = -5.0, R_MIN = 9, R_MAX = 37;
  const crowdSpacing = innerWidth < 720 ? 0.95 : 0.66;
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
      const y = FLOOR_Y + 0.6 + (r - 25.5) * 0.85 + Math.abs(aa) * 1.8 + (Math.random() - 0.5) * 0.2; // las gradas laterales suben más
      seats.push([Math.sin(aa) * r, y, STAGE_Z - Math.cos(aa) * r, r, aa]);
    }
  }
  const CROWD_CAP = innerWidth < 720 ? 1400 : 3000;
  while (seats.length > CROWD_CAP) seats.splice((Math.random() * seats.length) | 0, 1);
  const N = seats.length;
  const crowd = new THREE.InstancedMesh(miniStickGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true }), N);
  crowd.frustumCulled = false;
  crowd.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const crowdBase = new Float32Array(N * 3); // posición
  const crowdTilt = new Float32Array(N * 2); // inclinación x/z (brazos alzados)
  const rowN = new Float32Array(N); // 0 = primera fila, 1 = última grada
  const phase = new Float32Array(N); // fase de la ola
  const seed = new Float32Array(N); // aleatorio por persona
  seats.forEach(([x, y, z, r, a], i) => {
    crowdBase.set([x, y, z], i * 3);
    crowdTilt[i * 2] = -0.15 - Math.random() * 0.35; // hacia el escenario
    crowdTilt[i * 2 + 1] = (Math.random() - 0.5) * 0.6;
    rowN[i] = (r - R_MIN) / (R_MAX - R_MIN);
    phase[i] = a * 4.5 + r * 0.32;
    seed[i] = Math.random();
    crowd.setColorAt(i, new THREE.Color(0, 0, 0));
  });
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(0.42, 0.42, 0.42);
  function placeCrowd(t, energy) {
    for (let i = 0; i < N; i++) {
      const sway = reduceMotion ? 0 : Math.sin(t * (1.4 + seed[i] * 0.8) + phase[i]) * (0.08 + 0.22 * energy);
      _e.set(crowdTilt[i * 2] + sway * 0.4, 0, crowdTilt[i * 2 + 1] + sway);
      _q.setFromEuler(_e);
      _p.set(crowdBase[i * 3], crowdBase[i * 3 + 1] + (reduceMotion ? 0 : Math.max(0, Math.sin(t * 3 + phase[i])) * 0.12 * energy), crowdBase[i * 3 + 2]);
      crowd.setMatrixAt(i, _m.compose(_p, _q, _s));
    }
    crowd.instanceMatrix.needsUpdate = true;
  }
  placeCrowd(0, 0);
  scene.add(crowd);
  // Paleta del álbum de la canción destacada (aclarada para que brille en la oscuridad).
  const CROWD_PALETTE = (featuredAlbum?.palette ?? ["#8a2be2", "#b388ff", "#ff80ab"]).map((c) => {
    const k = new THREE.Color(c), hsl = {};
    k.getHSL(hsl);
    return k.setHSL(hsl.h, Math.max(hsl.s, 0.6), Math.min(0.72, Math.max(hsl.l, 0.55)));
  });
  const IDLE_PURPLE = new THREE.Color("#7a35e8");
  // Estado del "escalado" con la canción.
  const show = { live: 0, progress: 0, step: 0, burst: 0, burstT: -10, beatKick: 0 };

  // ---------- Bloom ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.5, 0.35);
  composer.addPass(bloom);

  // ---------- Tamaño y encuadre ----------
  const mobileQ = () => innerWidth < 720;
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
  // Cada capítulo tiene un "slot" (hueco en la maqueta). El lightstick busca el slot más visible:
  // su centro en pantalla da la posición, su alto la escala, y sus data-* el giro, la inclinación,
  // cuánto se desarma y el brillo del público. Todo se mueve con resortes críticamente amortiguados,
  // así viaja con inercia entre capítulos en vez de saltar.
  const slots = [...document.querySelectorAll(".slot")].map((el) => ({
    el,
    chapter: el.closest(".chapter"),
    rot: Number(el.dataset.rot || 0),
    tilt: Number(el.dataset.tilt || 0),
    spin: Number(el.dataset.spin || 0),
    crowd: Number(el.dataset.crowd || (el.closest(".hero") ? 1 : 0.6)),
    explode: el.dataset.explode === "scroll",
    focus: el.dataset.focus || null,
  }));
  const anatSlot = slots.find((s) => s.explode);
  const anat = { p: 0 }; // progreso suavizado de la anatomía (ScrollTrigger con scrub)
  const STICK_H = { assembled: 7.6, exploded: 12.4 }; // alto aproximado en unidades
  const CENTER_Y = { assembled: -0.28, exploded: 0.05 }; // centro vertical relativo al pivote
  const target = { x: 0, y: 0, s: 0.5, rot: 0, tilt: 0, explode: 0, spin: 1, crowd: 1 };
  const view = { ...target }, vel = Object.fromEntries(Object.keys(target).map((k) => [k, 0]));
  const pointerOff = { x: 0, y: 0 };
  let activeSlot = slots[0];

  function explodeFromProgress(p) {
    // Se abre entre 8 % y 38 % del capítulo y se vuelve a armar al final (curva sinusoidal suave).
    const open = Math.min(1, Math.max(0, (p - 0.08) / 0.3));
    const close = Math.min(1, Math.max(0, (p - 0.86) / 0.14));
    const s = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
    return s(open) * (1 - s(close));
  }
  function slotPose(S, rect) {
    const w = innerWidth, h = innerHeight;
    const ppu = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z);
    const e = S.explode ? (reduceMotion ? 1 : explodeFromProgress(anat.p)) : 0;
    const tall = STICK_H.assembled + (STICK_H.exploded - STICK_H.assembled) * e;
    const fitH = (rect.height * 0.86) / (tall * ppu);
    const fitW = (rect.width * 0.92) / (R * 2.3 * ppu);
    const s = Math.max(0.22, Math.min(mobileQ() ? 0.5 : 0.78, fitH, fitW));
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const cyOff = CENTER_Y.assembled + (CENTER_Y.exploded - CENTER_Y.assembled) * e;
    return {
      x: (cx - w / 2) / ppu,
      y: camera.position.y - (cy - h / 2) / ppu - cyOff * s,
      s, rot: S.rot + (S.explode ? (0.35 - anat.p * 0.8) : 0), tilt: S.tilt, explode: e, spin: S.spin, crowd: S.crowd,
    };
  }
  // Mezcla de las poses de los slots según cuánto se ve cada uno (el más visible domina).
  function computeTarget() {
    const h = innerHeight;
    let sum = 0, best = 0;
    const acc = { x: 0, y: 0, s: 0, rot: 0, tilt: 0, explode: 0, spin: 0, crowd: 0 };
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
      for (const k in acc) acc[k] += P[k] * wgt;
      sum += wgt;
    }
    for (const k in acc) target[k] = acc[k] / sum;
  }
  // Resorte críticamente amortiguado (sin rebote): x'' = ω²(objetivo − x) − 2ω x'.
  const OMEGA = { x: 5.5, y: 5.5, s: 6, rot: 4, tilt: 4, explode: 3.6, spin: 3, crowd: 2 };
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
        trigger: anatSlot.chapter, scrub: reduceMotion ? true : 1.2, invalidateOnRefresh: true,
        start: () => (mobileQ() ? "top 70%" : "top top"), end: () => (mobileQ() ? "bottom 35%" : "bottom bottom"),
      },
    });
  }

  // ---------- Color ----------
  let colorIndex = 0;
  const glow = { intensity: 1 };
  function setColor(next) {
    colorIndex = next ?? (colorIndex + 1) % PALETTE.length;
    tweenColor(PALETTE[colorIndex]);
  }
  function tweenColor(c) {
    gsap?.to(color, { r: c.r, g: c.g, b: c.b, duration: reduceMotion ? 0 : 0.6, ease: "power2.out", overwrite: true });
  }

  // ---------- Interacción ----------
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let spinVel = 0.004, spinAngle = 0;
  let dragging = false, dragX = 0, moved = 0, hovered = false;
  let hotPart = null, hotFromCard = false;

  function pick(e) {
    pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(stick, true)[0] || null;
  }
  const partOf = (obj) => { while (obj && !PARTS.includes(obj)) obj = obj.parent; return obj; };
  function pulse(strength = 1) {
    if (!gsap || reduceMotion) return;
    gsap.fromTo(stick.scale, { x: 1 + 0.07 * strength, y: 1 + 0.07 * strength, z: 1 + 0.07 * strength }, { x: 1, y: 1, z: 1, duration: 0.45, ease: "elastic.out(1, 0.45)" });
    gsap.fromTo(glow, { intensity: 1 + 0.9 * strength }, { intensity: 1, duration: 0.5, ease: "power2.out" });
  }

  addEventListener("pointermove", (e) => {
    const nx = (e.clientX / innerWidth) * 2 - 1, ny = (e.clientY / innerHeight) * 2 - 1;
    if (!reduceMotion) {
      // Paralaje suave del puntero, sumado a la pose del scroll.
      gsap?.to(pivot.rotation, { x: ny * 0.18, z: -nx * 0.12, duration: 1.4, ease: "power3.out", overwrite: "auto" });
      gsap?.to(pointerOff, { x: nx * 0.18, y: -ny * 0.1, duration: 1.6, ease: "power3.out", overwrite: "auto" });
    }
    if (dragging) {
      const dx = e.clientX - dragX;
      dragX = e.clientX;
      moved += Math.abs(dx);
      spinVel = dx * 0.004;
    }
    if (e.pointerType === "touch") return;
    const hitObj = pick(e);
    const h = !!hitObj;
    if (h !== hovered) {
      hovered = h;
      canvas.style.cursor = h ? "pointer" : "";
      if (h && !reduceMotion && view.explode < 0.3) gsap?.to(stick.rotation, { z: 0.12, duration: 0.25, yoyo: true, repeat: 1, ease: "sine.inOut" });
    }
    // Con la lightstick desarmada, pasar sobre una pieza resalta su tarjeta.
    if (!hotFromCard) setHot(view.explode > 0.5 && hitObj ? partOf(hitObj.object)?.name ?? null : null);
  });
  canvas.addEventListener("pointerdown", (e) => {
    if (!pick(e)) return;
    dragging = true;
    dragX = e.clientX;
    moved = 0;
  });
  addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    if (moved < 6) {
      setColor();
      pulse(1.4);
      spinVel += 0.06;
    }
  });

  // Tarjetas de piezas ↔ piezas 3D.
  const cards = [...document.querySelectorAll(".part-card")];
  function setHot(name) {
    if (name === hotPart) return;
    hotPart = name;
    for (const c of cards) c.classList.toggle("is-hot", c.dataset.part === name);
    for (const M of markers) M.el.classList.toggle("hot", M.key === name);
  }
  for (const c of cards) {
    const on = () => { hotFromCard = true; setHot(c.dataset.part); };
    const off = () => { hotFromCard = false; setHot(null); };
    c.addEventListener("pointerenter", on);
    c.addEventListener("focus", on);
    c.addEventListener("pointerleave", off);
    c.addEventListener("blur", off);
    c.addEventListener("click", () => { on(); pulse(0.6); });
  }

  // ---------- Demo interactiva ----------
  const demo = { active: false, color: new THREE.Color("#8a2be2"), energy: 0.55, until: 0 };
  const demoStatus = document.getElementById("demo-status");
  const MOOD_NAMES = { 0.15: "intro tranquila", 0.55: "verso", 1: "coro" };
  for (const b of document.querySelectorAll(".chip")) {
    b.addEventListener("click", () => {
      const group = b.closest("fieldset");
      for (const o of group.querySelectorAll(".chip")) o.setAttribute("aria-pressed", String(o === b));
      if (b.dataset.color) demo.color.set(b.dataset.color);
      if (b.dataset.mood) demo.energy = Number(b.dataset.mood);
      demo.active = true;
      demo.until = clock.elapsedTime + 14;
      tweenColor(demo.color);
      pulse(0.4 + demo.energy);
      if (!reduceMotion) { show.burst = 0.5 + demo.energy; show.burstT = clock.elapsedTime; }
      const colorName = document.querySelector('.chips:not(.moods) [aria-pressed="true"]')?.textContent.trim() ?? "Morado";
      const mood = MOOD_NAMES[demo.energy] ?? "verso";
      demoStatus.textContent = `${colorName} en ${mood}: así se vería tu lightstick y el público.`;
    });
  }

  // ---------- Música ----------
  let player = null, ytReady = false;
  const beat = 60 / (FEATURED.bpm || 100);
  let lastBeat = -1;
  function loadYT() {
    return new Promise((resolve) => {
      if (window.YT?.Player) return resolve();
      window.onYouTubeIframeAPIReady = resolve;
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.append(s);
    });
  }
  async function startIntro({ muted }) {
    document.getElementById("mini").hidden = false;
    document.getElementById("mini-title").textContent = `${FEATURED.title} · BTS`;
    document.getElementById("mini-note").textContent = FEATURED.note;
    if (player) {
      player.seekTo(FEATURED.introStart, true);
      muted ? player.mute() : player.unMute();
      player.playVideo();
      return;
    }
    await loadYT();
    player = new window.YT.Player("yt", {
      host: "https://www.youtube-nocookie.com",
      width: 200,
      height: 200,
      videoId: FEATURED.yt,
      playerVars: { autoplay: 1, mute: muted ? 1 : 0, playsinline: 1, start: FEATURED.introStart, end: FEATURED.introStart + FEATURED.introSeconds, rel: 0, controls: 1 },
      events: {
        onReady: () => { ytReady = true; player.playVideo(); },
        onStateChange: (e) => { if (e.data === 0) setIntroButton(false); },
      },
    });
  }
  const introButtons = [...document.querySelectorAll(".js-intro")];
  function setIntroButton(on) {
    for (const b of introButtons) {
      b.setAttribute("aria-pressed", on);
      b.textContent = on ? "🔊 Intro sonando" : "▶ Escuchar la intro";
    }
  }
  for (const b of introButtons) {
    b.onclick = () => {
      demo.active = false;
      startIntro({ muted: false });
      setIntroButton(true);
    };
  }
  document.getElementById("mini-close").onclick = () => {
    player?.pauseVideo();
    document.getElementById("mini").hidden = true;
    setIntroButton(false);
  };
  // Sin sonido el navegador permite empezar solo; con sonido hace falta un toque.
  if (!reduceMotion && !SHOT) startIntro({ muted: true });

  // ---------- Marcadores numerados sobre las piezas ----------
  const mkLayer = document.querySelector(".markers");
  const markers = cards.map((c, i) => {
    const key = c.dataset.part;
    const [partName, local] = LABEL_ANCHORS[key];
    const el = document.createElement("div");
    el.className = "mk";
    const n = document.createElement("i");
    n.textContent = String(i + 1).padStart(2, "0");
    const b = document.createElement("b");
    b.textContent = c.querySelector("b").textContent;
    el.append(n, b);
    mkLayer?.append(el);
    return { key, part: partByName[partName], local: local ?? partByName[partName].userData.anchor, el, shown: false };
  });
  const _v = new THREE.Vector3();
  function updateMarkers() {
    const on = view.explode > 0.55;
    const w = innerWidth, h = innerHeight;
    for (const M of markers) {
      if (on !== M.shown) { M.shown = on; M.el.classList.toggle("shown", on); }
      if (!on) continue;
      _v.copy(M.local);
      M.part.localToWorld(_v).project(camera);
      M.el.style.transform = `translate(${((_v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - _v.y) / 2 * h).toFixed(1)}px)`;
    }
  }

  // ---------- Animación ----------
  const clock = new THREE.Clock();
  const tmp = new THREE.Color();
  let crowdPainted = -1;
  let lastSide = "";
  let climaxDone = false;
  function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;

    const playing = ytReady && player?.getPlayerState?.() === 1;
    if (playing) {
      const songT = player.getCurrentTime() - FEATURED.introStart;
      show.progress = Math.min(1, Math.max(0, songT / (FEATURED.introSeconds || 30)));
      const b = Math.floor(songT / beat);
      if (b !== lastBeat && b >= 0) {
        lastBeat = b;
        pulse(b % 4 === 0 ? 1.2 : 0.55);
        spinVel += reduceMotion ? 0 : 0.035 * Math.max(0.2, view.spin);
        if (b % 4 === 0 && !demo.active) setColor();
        // El público: color nuevo cada 8 tiempos, estallido que viaja hacia el fondo en cada compás.
        show.step = Math.floor(b / 8);
        show.beatKick = 1;
        if (b % 4 === 0) { show.burst = 0.6 + 0.8 * show.progress; show.burstT = t; }
      }
    } else if (!reduceMotion && !demo.active && Math.floor(t / 3) !== lastBeat) {
      lastBeat = Math.floor(t / 3);
      setColor();
    }
    if (demo.active && t > demo.until) demo.active = false;

    // Pose: objetivo según los slots visibles + paralaje del puntero, seguido con resortes.
    computeTarget();
    target.x += pointerOff.x * (1 - target.explode);
    target.y += pointerOff.y * (1 - target.explode);
    springs(dt);
    const side = activeSlot?.chapter?.dataset.side ?? "right";
    if (side !== lastSide) { lastSide = side; document.body.dataset.side = side; }
    // Clímax: al llegar al océano, una ola recorre el estadio y el lightstick da una vuelta.
    if (activeSlot?.chapter?.id === "oceano" && !climaxDone && !reduceMotion) {
      climaxDone = true;
      show.burst = 1.4; show.burstT = t; show.beatKick = 1;
      spinVel += 0.12;
      pulse(1.2);
    } else if (activeSlot?.chapter?.id !== "oceano") climaxDone = false;

    const breathe = reduceMotion ? 0 : Math.sin(t * 1.1) * 0.06;
    pivot.position.set(view.x, view.y + breathe * view.s, 0);
    pivot.scale.setScalar(view.s);
    stick.rotation.x = view.tilt;

    // Giro con inercia: libre según "spin"; si no, vuelve a la orientación de la pose.
    if (!dragging) spinVel += (0.004 * view.spin - spinVel) * Math.min(1, dt * 1.6);
    if (!reduceMotion) spinAngle += spinVel;
    if (view.spin < 0.99) {
      const d = Math.atan2(Math.sin(view.rot - spinAngle), Math.cos(view.rot - spinAngle));
      spinAngle += d * (reduceMotion || SHOT ? 1 : Math.min(1, dt * 2.4)) * (1 - view.spin);
    }
    stick.rotation.y = spinAngle;
    stick.position.y = STICK_Y;

    // Vista explosionada: las piezas se separan con desfase (expo-out), con una leve rotación propia
    // y una deriva lenta, como si flotaran.
    PARTS.forEach((g, i) => {
      const e = Math.min(1, Math.max(0, view.explode * 1.42 - i * 0.06));
      const eased = e === 1 ? 1 : 1 - Math.pow(2, -9 * e);
      const drift = reduceMotion ? 0 : Math.sin(t * 0.9 + i * 1.3) * 0.08 * eased;
      g.position.copy(g.userData.offset).multiplyScalar(eased);
      g.position.y += drift;
      const r = g.userData.rot;
      g.rotation.set(r[0] * eased, r[1] * eased + (reduceMotion ? 0 : Math.sin(t * 0.6 + i) * 0.05 * eased), r[2] * eased);
      const hs = hotPart && (g.name === hotPart || (hotPart === "buttons" && g.name === "handle")) ? 1.07 : 1;
      g.scale.setScalar(g.scale.x + (hs - g.scale.x) * Math.min(1, dt * 8));
    });
    stick.updateMatrixWorld();
    updateMarkers();

    // Color y brillo.
    core.material.color.copy(color).multiplyScalar(0.55 + 0.3 * glow.intensity);
    crystal.material.emissive.copy(color);
    shellMat.emissive.copy(color);
    shellMat.emissiveIntensity = 0.08 + 0.1 * glow.intensity;
    crystal.material.emissiveIntensity = 1.3 + 0.6 * glow.intensity;
    emblemEdges.material.color.copy(color).multiplyScalar(1.1 + 0.5 * glow.intensity);
    button.material.emissive.copy(color);
    ledRing.material.color.copy(color).multiplyScalar(0.8 + 0.4 * glow.intensity);
    coreLight.color.copy(color);
    coreLight.intensity = 12 + 10 * glow.intensity;
    bloom.strength = 0.45 + 0.3 * glow.intensity;

    // El público: océano morado tranquilo en reposo; con la intro sonando se enciende de adelante hacia
    // atrás y recorre la paleta del álbum. En la demo responde al color y al momento elegidos.
    const crowdKey = view.crowd.toFixed(2) + (demo.active ? demo.color.getHexString() + demo.energy : "");
    if (!reduceMotion || crowdPainted !== crowdKey) {
      const live = playing && !reduceMotion && !demo.active ? 1 : demo.active ? 1 : 0;
      show.live += (live - show.live) * (reduceMotion ? 1 : Math.min(1, dt * 1.5));
      if (demo.active) show.progress += (demo.energy - show.progress) * (reduceMotion ? 1 : Math.min(1, dt * 2));
      else if (!playing) show.progress += (0 - show.progress) * Math.min(1, dt * 0.5);
      show.beatKick *= Math.exp(-dt * 6);
      show.burst *= Math.exp(-dt * 1.4);
      const L = show.live, P = show.progress, boost = view.crowd;
      const energy = L * (0.25 + 0.75 * P);
      if (!reduceMotion) placeCrowd(t, energy);
      const cA = demo.active ? demo.color : CROWD_PALETTE[show.step % CROWD_PALETTE.length];
      const cB = demo.active ? demo.color : CROWD_PALETTE[(show.step + 1) % CROWD_PALETTE.length];
      const litEdge = 1.25 + L * (0.12 + 1.0 * P - 1.25); // reposo: todo encendido
      const base = 0.55 + L * (0.18 + 0.6 * P - 0.55);
      const amp = reduceMotion ? 0 : 0.28 + L * (0.12 + 0.5 * P - 0.28);
      const speed = 1.1 + L * (1 + 1.6 * P);
      const front = (t - show.burstT) * 0.8; // el estallido viaja hacia el fondo
      const mixB = L * (0.1 + 0.45 * P);
      const ic = crowd.instanceColor.array;
      for (let i = 0; i < N; i++) {
        const lit = Math.min(1, Math.max(0.06, (litEdge - rowN[i]) / 0.1));
        const wave = Math.sin(t * speed - phase[i]);
        const d = rowN[i] - front;
        const burst = reduceMotion ? 0 : show.burst * Math.exp(-d * d * 40);
        const w = boost * lit * Math.max(0.04, base + amp * wave + 0.25 * show.beatKick * L * P + burst) * (0.75 + 0.5 * seed[i]);
        tmp.copy(seed[i] < mixB ? cB : cA).lerp(IDLE_PURPLE, 1 - L).multiplyScalar(w);
        ic[i * 3] = tmp.r; ic[i * 3 + 1] = tmp.g; ic[i * 3 + 2] = tmp.b;
      }
      crowd.instanceColor.needsUpdate = true;
      crowdPainted = crowdKey;
    }

    composer.render();
  }

  if (SHOT) {
    document.documentElement.style.scrollBehavior = "auto";
    scrollTo({ top: Number(SHOT) || 0, behavior: "instant" });
    ScrollTrigger?.refresh();
    if (anatSlot && ScrollTrigger) {
      const st = ScrollTrigger.getAll().find((s) => s.trigger === anatSlot.chapter);
      if (st) anat.p = st.progress;
    }
    // Opcional para pruebas: ?shot=Y&hot=pieza resalta una pieza.
    const hot = new URLSearchParams(location.search).get("hot");
    if (hot) { hotFromCard = true; setHot(hot); }
  }
  computeTarget();
  Object.assign(view, target);
  loop();
}

// ---------- Datos reales del catálogo ----------
const stat = (k, v) => { const el = document.querySelector(`[data-stat="${k}"]`); if (el) el.textContent = String(v); };
stat("albums", ALBUMS.length);
stat("songs", ALBUMS.reduce((n, a) => n + a.songs.length, 0));
stat("concerts", CONCERT_FILMS.length);

// ---------- Entrada del texto: fundidos y deslizamientos suaves, con hijos escalonados ----------
if (gsap && !reduceMotion && !SHOT) {
  gsap.from(".reveal", { y: 28, opacity: 0, duration: 1, stagger: 0.09, ease: "expo.out", delay: 0.15 });
  if (ScrollTrigger) {
    for (const el of gsap.utils.toArray(".reveal-up")) {
      const kids = el.matches(".parts, .steps, .feats, .stats, .chips, .demo") ? el.querySelectorAll(":scope > *") : [el];
      gsap.from(kids, {
        y: 36, opacity: 0, duration: 1.1, stagger: 0.06, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    }
  }
}
