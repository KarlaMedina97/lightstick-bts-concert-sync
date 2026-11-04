// Landing: lightstick 3D (three.js) que gira al ritmo de la intro de la canción destacada (GSAP).
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { FEATURED } from "./config.js";
import { ALBUMS } from "./catalog.js";

const gsap = window.gsap;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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
  // Proporciones aproximadas de un lightstick de globo (≈ 9,3 cm de globo y 21,8 cm de largo):
  // 1 unidad ≈ 3 cm → globo r = 1.55, largo total ≈ 7.3. Globo transparente, cuerpo negro
  // brillante, aro plateado fino y dos botones en el mango. Dentro del globo va una forma
  // abstracta (no se reproduce ningún logo ni emblema).
  const stick = new THREE.Group();
  const color = PALETTE[0].clone();
  // Revoluciona un perfil [radio, y] alrededor del eje Y.
  // El perfil se ordena de abajo hacia arriba para que las normales miren hacia fuera.
  const lathe = (pts, segs = 48) => {
    const p = pts[0][1] > pts[pts.length - 1][1] ? [...pts].reverse() : pts;
    return new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  };

  const R = 1.55; // radio del globo
  // Volumen de luz difusa dentro del globo (lo que "pinta" el color).
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.98, 40, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  core.position.y = 0.05;
  core.renderOrder = 1;
  // Halo esmerilado alrededor: degrada la luz hacia el borde del globo.
  const haze = new THREE.Mesh(new THREE.SphereGeometry(1.4, 40, 28), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, depthWrite: false }));
  haze.position.y = 0.02;
  haze.renderOrder = 1;
  // Forma abstracta flotando en el centro: gema facetada (no es un logo).
  const crystalGeo = new THREE.OctahedronGeometry(0.5, 0);
  crystalGeo.scale(0.8, 1.25, 0.8);
  const crystal = new THREE.Mesh(
    crystalGeo,
    new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: color, emissiveIntensity: 1.3, flatShading: true, metalness: 0.1, roughness: 0.25 }),
  );
  crystal.position.y = 0.1;
  crystal.renderOrder = 2;
  // Globo de policarbonato transparente.
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: "#ffffff", roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03,
    transparent: true, opacity: 0.2, emissive: color, emissiveIntensity: 0.3, depthWrite: false,
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), shellMat);
  shell.renderOrder = 3;
  const coreLight = new THREE.PointLight(color, 30, 12, 2);
  coreLight.position.y = 0.1;
  // Anillo de LEDs en la base interior del globo.
  const ledRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 8, 64), new THREE.MeshBasicMaterial({ color }));
  ledRing.rotation.x = Math.PI / 2;
  ledRing.position.y = -0.94;

  const dark = new THREE.MeshPhysicalMaterial({ color: "#0d0c12", metalness: 0.35, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const chrome = new THREE.MeshStandardMaterial({ color: "#dcd9e8", metalness: 1, roughness: 0.15 });
  // Copa negra que abraza la parte baja del globo y baja hasta el mango.
  const collar = new THREE.Mesh(
    lathe([[1.04, -1.0], [1.17, -1.0], [1.2, -1.04], [1.16, -1.16], [1.0, -1.32], [0.76, -1.46], [0.58, -1.56], [0.53, -1.66]]),
    dark,
  );
  // Aro plateado fino en el borde de la copa.
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(1.175, 0.03, 10, 72), chrome);
  rimRing.rotation.x = Math.PI / 2;
  rimRing.position.y = -1.01;
  // Mango largo, ligeramente entallado, con extremo redondeado.
  const handle = new THREE.Mesh(
    lathe([[0.53, -1.66], [0.515, -2.1], [0.485, -3.0], [0.46, -3.8], [0.455, -4.5], [0.47, -5.0], [0.5, -5.35], [0.5, -5.5], [0.46, -5.62], [0.32, -5.69], [0, -5.71]]),
    dark,
  );
  // Junta plateada fina entre copa y mango.
  const neck = new THREE.Mesh(new THREE.TorusGeometry(0.535, 0.022, 8, 48), chrome);
  neck.rotation.x = Math.PI / 2;
  neck.position.y = -1.67;
  const grips = [-5.2].map((y) => {
    const g = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.018, 8, 48), chrome);
    g.rotation.x = Math.PI / 2;
    g.position.y = y;
    return g;
  });
  // Dos botones en el frente del mango (el de arriba muestra el color actual).
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 24), new THREE.MeshBasicMaterial({ color }));
  button.rotation.x = Math.PI / 2;
  button.position.set(0, -2.25, 0.5);
  const button2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 24), chrome);
  button2.rotation.x = Math.PI / 2;
  button2.position.set(0, -2.62, 0.49);
  // Remate superior negro (donde se encajan los accesorios).
  const cap = new THREE.Mesh(lathe([[0.36, 1.44], [0.34, 1.56], [0.28, 1.66], [0.16, 1.72], [0, 1.735]], 40), dark);
  const capRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.014, 6, 40), dark);
  capRing.rotation.x = Math.PI / 2;
  capRing.position.y = 1.5;

  stick.add(core, haze, crystal, shell, coreLight, ledRing, collar, rimRing, neck, handle, ...grips, button, button2, cap, capRing);
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
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    const mobile = w < 720;
    // El lightstick completo (≈7.4 de alto) cabe en el encuadre.
    pivot.position.set(mobile ? 0 : Math.min(3.4, w / 420), mobile ? 1.6 : 0.35, 0);
    pivot.scale.setScalar(mobile ? Math.max(0.42, Math.min(0.55, w / 720)) : 0.78);
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();

  // ---------- Color ----------
  let colorIndex = 0;
  const glow = { intensity: 1 };
  function setColor(next) {
    colorIndex = next ?? (colorIndex + 1) % PALETTE.length;
    const target = PALETTE[colorIndex];
    gsap?.to(color, { r: target.r, g: target.g, b: target.b, duration: reduceMotion ? 0 : 0.6, ease: "power2.out" });
  }

  // ---------- Interacción ----------
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let spinVel = 0.004;
  let dragging = false, dragX = 0, moved = 0, hovered = false;

  function hit(e) {
    pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(stick, true).length > 0;
  }
  function pulse(strength = 1) {
    if (!gsap || reduceMotion) return;
    gsap.fromTo(stick.scale, { x: 1 + 0.07 * strength, y: 1 + 0.07 * strength, z: 1 + 0.07 * strength }, { x: 1, y: 1, z: 1, duration: 0.45, ease: "elastic.out(1, 0.45)" });
    gsap.fromTo(glow, { intensity: 1 + 0.9 * strength }, { intensity: 1, duration: 0.5, ease: "power2.out" });
  }

  addEventListener("pointermove", (e) => {
    const nx = (e.clientX / innerWidth) * 2 - 1, ny = (e.clientY / innerHeight) * 2 - 1;
    if (!reduceMotion) gsap?.to(pivot.rotation, { x: ny * 0.25, z: -nx * 0.18, duration: 1.2, ease: "power3.out", overwrite: "auto" });
    if (dragging) {
      const dx = e.clientX - dragX;
      dragX = e.clientX;
      moved += Math.abs(dx);
      spinVel = dx * 0.004;
    }
    const h = hit(e);
    if (h !== hovered) {
      hovered = h;
      canvas.style.cursor = h ? "pointer" : "";
      if (h && !reduceMotion) gsap?.to(stick.rotation, { z: 0.12, duration: 0.25, yoyo: true, repeat: 1, ease: "sine.inOut" });
    }
  });
  canvas.addEventListener("pointerdown", (e) => {
    if (!hit(e)) return;
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
  function setIntroButton(on) {
    const b = document.getElementById("btn-intro");
    b.setAttribute("aria-pressed", on);
    b.textContent = on ? "🔊 Intro sonando" : "▶ Escuchar la intro";
  }
  document.getElementById("btn-intro").onclick = () => {
    startIntro({ muted: false });
    setIntroButton(true);
  };
  document.getElementById("mini-close").onclick = () => {
    player?.pauseVideo();
    document.getElementById("mini").hidden = true;
    setIntroButton(false);
  };
  // Sin sonido el navegador permite empezar solo; con sonido hace falta un toque.
  if (!reduceMotion) startIntro({ muted: true });

  // ---------- Animación ----------
  const clock = new THREE.Clock();
  const tmp = new THREE.Color();
  let crowdPainted = false;
  function loop() {
    requestAnimationFrame(loop);
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
        spinVel += reduceMotion ? 0 : 0.035;
        if (b % 4 === 0) setColor();
        // El público: color nuevo cada 8 tiempos, estallido que viaja hacia el fondo en cada compás.
        show.step = Math.floor(b / 8);
        show.beatKick = 1;
        if (b % 4 === 0) { show.burst = 0.6 + 0.8 * show.progress; show.burstT = t; }
      }
    } else if (!reduceMotion && Math.floor(t / 3) !== lastBeat) {
      lastBeat = Math.floor(t / 3);
      setColor();
    }

    // Giro con inercia.
    if (!dragging) spinVel += (0.004 - spinVel) * Math.min(1, dt * 1.6);
    if (!reduceMotion) stick.rotation.y += spinVel;
    crystal.rotation.x += dt * 0.6;
    crystal.rotation.y -= dt * 0.9;
    stick.position.y = STICK_Y + (reduceMotion ? 0 : Math.sin(t * 1.2) * 0.08);

    // Color y brillo.
    core.material.color.copy(color).multiplyScalar(0.55 + 0.3 * glow.intensity);
    haze.material.color.copy(core.material.color);
    crystal.material.emissive.copy(color);
    shellMat.emissive.copy(color);
    shellMat.emissiveIntensity = 0.25 + 0.25 * glow.intensity;
    button.material.color.copy(color);
    ledRing.material.color.copy(color).multiplyScalar(0.8 + 0.4 * glow.intensity);
    coreLight.color.copy(color);
    coreLight.intensity = 12 + 10 * glow.intensity;
    bloom.strength = 0.45 + 0.3 * glow.intensity;

    // El público: océano morado tranquilo en reposo; con la intro sonando se enciende
    // de adelante hacia atrás, sube brillo y ola, y recorre la paleta del álbum.
    if (!reduceMotion || !crowdPainted) {
      show.live += ((playing && !reduceMotion ? 1 : 0) - show.live) * Math.min(1, dt * 1.5);
      if (!playing) show.progress += (0 - show.progress) * Math.min(1, dt * 0.5);
      show.beatKick *= Math.exp(-dt * 6);
      show.burst *= Math.exp(-dt * 1.4);
      const L = show.live, P = show.progress;
      const energy = L * (0.25 + 0.75 * P);
      if (!reduceMotion) placeCrowd(t, energy);
      const cA = CROWD_PALETTE[show.step % CROWD_PALETTE.length];
      const cB = CROWD_PALETTE[(show.step + 1) % CROWD_PALETTE.length];
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
        const w = lit * Math.max(0.04, base + amp * wave + 0.25 * show.beatKick * L * P + burst) * (0.75 + 0.5 * seed[i]);
        tmp.copy(seed[i] < mixB ? cB : cA).lerp(IDLE_PURPLE, 1 - L).multiplyScalar(w);
        ic[i * 3] = tmp.r; ic[i * 3 + 1] = tmp.g; ic[i * 3 + 2] = tmp.b;
      }
      crowd.instanceColor.needsUpdate = true;
      crowdPainted = true;
    }

    composer.render();
  }
  loop();
}

// ---------- Entrada del texto ----------
if (gsap && !reduceMotion) {
  gsap.from(".reveal", { y: 28, opacity: 0, duration: 0.9, stagger: 0.1, ease: "power3.out", delay: 0.2 });
  gsap.from(".reveal-up", { y: 40, opacity: 0, duration: 0.8, stagger: 0.08, ease: "power2.out", delay: 0.7 });
}
