// Piezas comunes de los modelos 3D de lightsticks (ilustraciones inspiradas, no los diseños oficiales).
// Ningún modelo reproduce logos ni emblemas registrados: los emblemas son originales (una ola).
import * as THREE from "three";

/** Revoluciona un perfil [radio, y] alrededor del eje Y (ordenado de abajo hacia arriba). */
export function lathe(pts, segs = 48) {
  const p = pts[0][1] > pts[pts.length - 1][1] ? [...pts].reverse() : pts;
  return new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), segs);
}

/** Ruido suave en un canvas: variación de rugosidad y micro relieve del plástico satinado. */
export function noiseTexture(size = 128, seed = 7) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < size * size; i++) {
    const v = 150 + rnd() * 70; // rugosidad media con variación fina
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // Un desenfoque leve para que no se vea "arena" sino un satinado.
  g.filter = "blur(0.6px)";
  g.drawImage(c, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 10);
  return t;
}

/** Gradiente radial para halos y destellos (sprites aditivos). */
export function glowTexture(size = 64) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(255,255,255,.45)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

/**
 * Emblema original: una ola gordita con rizo redondo, dos burbujas y un destello, extruida en una
 * sola pieza con bisel suave. `variant: "small"` es una ola más baja para otros modelos.
 */
export function waveEmblemGeometry({ variant = "main", curveSegments = 14, bevelSegments = 4 } = {}) {
  const wave = new THREE.Shape();
  wave.moveTo(-0.42, 0);
  wave.lineTo(0.42, 0);
  wave.quadraticCurveTo(0.58, 0, 0.57, 0.16);
  wave.bezierCurveTo(0.5, 0.45, 0.1, 0.62, 0.1, 0.98);
  wave.bezierCurveTo(0.1, 1.28, 0.44, 1.38, 0.55, 1.16);
  wave.quadraticCurveTo(0.6, 1.02, 0.52, 0.96);
  wave.bezierCurveTo(0.72, 0.86, 0.98, 1.08, 0.9, 1.38);
  wave.bezierCurveTo(0.8, 1.76, 0.14, 1.9, -0.22, 1.66);
  wave.bezierCurveTo(-0.6, 1.44, -0.62, 0.62, -0.57, 0.16);
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
  const shapes = variant === "small"
    ? [wave, bubble(-0.62, 1.86, 0.1)]
    : [wave, bubble(-0.6, 1.9, 0.11), bubble(-0.8, 1.64, 0.07), sparkle(0.82, 1.82, 0.15)];
  const g = new THREE.ExtrudeGeometry(shapes, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments, curveSegments });
  g.translate(-0.02, 0, -0.05);
  if (variant === "small") g.scale(0.62, 0.55, 1);
  else g.scale(0.92, 0.92, 1);
  return g;
}

/**
 * Materiales compartidos por todos los modelos (así cambian de color juntos y se ahorra memoria).
 * `glass`: con transmisión real en equipos potentes; en teléfonos, transparencia simple.
 */
export function createMaterials({ lowEnd = false, color = new THREE.Color("#8a2be2") } = {}) {
  const noise = noiseTexture(lowEnd ? 64 : 128);
  const glass = lowEnd
    ? new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 1.4, emissive: color.clone(), emissiveIntensity: 0.1 })
    : new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.03, metalness: 0, transmission: 1, thickness: 0.18, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1, envMapIntensity: 1.3, transparent: false, depthWrite: false, attenuationColor: new THREE.Color("#f4f0ff"), attenuationDistance: 6, emissive: color.clone(), emissiveIntensity: 0.06 });
  const m = {
    glass,
    // Plástico negro satinado: rugosidad con variación fina y micro relieve.
    satin: new THREE.MeshPhysicalMaterial({ color: "#121117", metalness: 0.15, roughness: 0.62, roughnessMap: noise, bumpMap: noise, bumpScale: 0.004, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 0.8 }),
    gloss: new THREE.MeshPhysicalMaterial({ color: "#0b0a10", metalness: 0.25, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1 }),
    chrome: new THREE.MeshStandardMaterial({ color: "#eceaf4", metalness: 1, roughness: 0.12, envMapIntensity: 1.6 }),
    seam: new THREE.MeshStandardMaterial({ color: "#2a2832", roughness: 0.5, metalness: 0.4 }),
    // Acrílico esmerilado del emblema: opaco para que se vea a través del vidrio con transmisión.
    acrylic: new THREE.MeshPhysicalMaterial({ color: "#2a2836", emissive: color.clone(), emissiveIntensity: 1.6, roughness: 0.55, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color("#ffffff") }),
    edge: new THREE.LineBasicMaterial({ color: color.clone() }),
    led: new THREE.MeshBasicMaterial({ color: color.clone() }),
    tick: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
    // Difusor del anillo LED: esmerilado que se ilumina con el color.
    diffuser: new THREE.MeshPhysicalMaterial({ color: "#d9d4e8", roughness: 0.75, metalness: 0, emissive: color.clone(), emissiveIntensity: 0.35, envMapIntensity: 0.6 }),
    smoke: new THREE.MeshPhysicalMaterial({ color: "#2a2834", roughness: 0.35, metalness: 0.25, clearcoat: 0.6, envMapIntensity: 0.9 }),
    frostDome: new THREE.MeshPhysicalMaterial({ color: "#f2eefb", roughness: 0.7, metalness: 0, emissive: color.clone(), emissiveIntensity: 0.9, envMapIntensity: 0.5 }),
    buttons: new THREE.MeshStandardMaterial({ color: "#16141c", emissive: color.clone(), emissiveIntensity: 0.3, roughness: 0.4, envMapIntensity: 0.8 }),
    gem: new THREE.MeshPhysicalMaterial({ color: "#c0142e", emissive: "#4a0010", roughness: 0.05, metalness: 0.05, clearcoat: 1, ior: 1.77, envMapIntensity: 2, flatShading: true }),
    cord: new THREE.MeshStandardMaterial({ color: "#1b1a22", roughness: 0.9, metalness: 0 }),
    clearRing: new THREE.MeshPhysicalMaterial({ color: "#e8e6f2", roughness: 0.2, metalness: 0, transparent: true, opacity: 0.55, clearcoat: 1, envMapIntensity: 1.2 }),
    dots: new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.85 }),
    tint: new THREE.MeshBasicMaterial({ color: color.clone(), transparent: true, opacity: 0.08, depthWrite: false }),
    halo: new THREE.SpriteMaterial({ map: glowTexture(), color: color.clone(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }),
    shadow: new THREE.MeshBasicMaterial({ map: glowTexture(), color: "#000000", transparent: true, opacity: 0.5, depthWrite: false }),
  };
  m.glow = 1;
  /** Aplica el color actual y la intensidad del brillo (golpes) a todos los materiales encendidos. */
  m.update = (c, glow = 1) => {
    m.glow = glow;
    m.acrylic.emissive.copy(c);
    m.acrylic.emissiveIntensity = 0.7 + 0.4 * glow;
    m.edge.color.copy(c).multiplyScalar(1.1 + 0.5 * glow);
    m.led.color.copy(c).multiplyScalar(0.8 + 0.4 * glow);
    m.diffuser.emissive.copy(c);
    m.diffuser.emissiveIntensity = 0.25 + 0.3 * glow;
    m.frostDome.emissive.copy(c);
    m.frostDome.emissiveIntensity = 0.55 + 0.35 * glow;
    m.buttons.emissive.copy(c);
    m.glass.emissive.copy(c);
    m.glass.emissiveIntensity = (lowEnd ? 0.03 : 0.02) + 0.03 * glow;
    m.tint.color.copy(c).multiplyScalar(0.35 + 0.2 * glow);
    m.halo.color.copy(c);
    m.halo.opacity = 0.1 + 0.12 * glow;
  };
  return m;
}

/** Remate superior con gema roja (común a las tres versiones, con medidas distintas). */
export function capWithGem(m, { radius = 0.49, height = 0.24, gemR = 0.15, segs = 40 } = {}) {
  const g = new THREE.Group();
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.7, radius * 0.7, 0.2, 24), m.gloss);
  mount.position.y = -0.08;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.02, height, segs), m.gloss);
  body.position.y = height / 2;
  const edge = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.99, 0.012, 6, segs), m.chrome);
  edge.rotation.x = Math.PI / 2;
  edge.position.y = height;
  const gem = new THREE.Mesh(lathe([[gemR, height - 0.01], [gemR * 1.07, height + 0.04], [gemR * 0.6, height + 0.11], [0, height + 0.12]], 8), m.gem);
  g.add(mount, body, edge, gem);
  return g;
}

/** Sombra de contacto suave (disco con gradiente) bajo un modelo. */
export function contactShadow(m, r = 1.2) {
  const s = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), m.shadow);
  s.rotation.x = -Math.PI / 2;
  s.renderOrder = -1;
  return s;
}
