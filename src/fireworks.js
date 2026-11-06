// Fuegos artificiales en un canvas propio (encima del fondo, debajo del texto, sin capturar el puntero).
// Formas: peonía (esfera), anillo, sauce (cae con estela larga), palmera (brazos), corazón, crisantemo que se
// parte en chispas (crossette) y purpurina que titila. Cada una con su velocidad, tamaño, gravedad y desvanecido.
// Seguro para fotosensibles: nunca un destello de pantalla completa (la luz es siempre de puntos chicos) y, en
// modo seguro, como mucho 2 estallidos por segundo. No aparece con movimiento reducido ni con la pestaña oculta.

const SHAPES = ["peony", "ring", "willow", "palm", "heart", "crossette", "glitter"];

/**
 * @param {{ mount?: HTMLElement, z?: number, safe?: () => boolean, max?: number }} o
 * @returns {{ burst: (opts?: object) => void, show: (opts?: object) => void, auto: (perSecond: number, opts?: object) => void, stop: () => void }}
 */
export function fireworks({ mount = document.body, z = 1, safe = () => true, max } = {}) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const canvas = document.createElement("canvas");
  canvas.className = "fireworks";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = `position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:${z}`;
  mount.append(canvas);
  const ctx = canvas.getContext("2d");
  const small = innerWidth < 720;
  const CAP = max ?? (small ? 320 : 700);
  const P = []; // partículas
  let raf = 0, last = 0, autoRate = 0, autoOpts = {}, nextAuto = 0, lastBurst = 0, dpr = 1;

  function size() {
    dpr = Math.min(1.5, devicePixelRatio || 1);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
  }
  size();
  addEventListener("resize", size);

  const hexToRgb = (h) => { const n = Number.parseInt(String(h).replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const pick = (a) => a[(Math.random() * a.length) | 0];

  function add(x, y, vx, vy, o) {
    if (P.length >= CAP) return;
    P.push({ x, y, vx, vy, life: 0, ...o });
  }

  /** Un estallido. x, y en px de pantalla (por defecto, arriba y al azar); colors: lista de hex. */
  function burst({ x, y, colors = ["#b388ff", "#ff6fb5", "#ffd23f", "#4fd1ff"], shape = pick(SHAPES), scale = 1 } = {}) {
    if (reduce.matches || document.hidden) return;
    const now = performance.now();
    if (safe() && now - lastBurst < 500) return; // modo seguro: ≤ 2 por segundo
    lastBurst = now;
    const W = innerWidth, H = innerHeight;
    x ??= W * (0.15 + Math.random() * 0.7);
    y ??= H * (0.12 + Math.random() * 0.33);
    const s = (small ? 0.7 : 1) * scale;
    const cols = colors.map(hexToRgb);
    const c1 = pick(cols), c2 = pick(cols);
    const n = Math.round((small ? 46 : 80) * (shape === "glitter" ? 0.7 : 1));
    const base = { r: 2.2 * s, decay: 0.012, drag: 0.985, g: 0.035 };
    switch (shape) {
      case "ring":
        for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, v = 3.4 * s; add(x, y, Math.cos(a) * v, Math.sin(a) * v * 0.62, { ...base, c: c1 }); }
        break;
      case "willow":
        for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = (1 + Math.random() * 2.4) * s; add(x, y, Math.cos(a) * v, Math.sin(a) * v, { ...base, c: [255, 214, 140], decay: 0.006, drag: 0.975, g: 0.05, trail: 1 }); }
        break;
      case "palm":
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2 - Math.PI / 2;
          for (let j = 0; j < 9; j++) { const v = (1.6 + j * 0.42) * s; add(x, y, Math.cos(a) * v, Math.sin(a) * v, { ...base, c: k % 2 ? c1 : c2, decay: 0.009, trail: 1 }); }
        }
        break;
      case "heart":
        for (let i = 0; i < n; i++) {
          const t = (i / n) * Math.PI * 2;
          const hx = 16 * Math.sin(t) ** 3, hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          add(x, y, hx * 0.17 * s, hy * 0.17 * s, { ...base, c: [255, 111, 181], g: 0.02, drag: 0.97 });
        }
        break;
      case "crossette":
        for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, v = 3 * s; add(x, y, Math.cos(a) * v, Math.sin(a) * v, { ...base, c: c1, split: 46, r: 2.6 * s }); }
        break;
      case "glitter":
        for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = Math.random() * 3.2 * s; add(x, y, Math.cos(a) * v, Math.sin(a) * v, { ...base, c: [255, 245, 220], decay: 0.008, twinkle: Math.random() * 6, r: 1.6 * s }); }
        break;
      default: // peonía: esfera de dos colores
        for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = (2.2 + Math.random() * 1.8) * s; add(x, y, Math.cos(a) * v, Math.sin(a) * v, { ...base, c: i % 2 ? c1 : c2 }); }
    }
    start();
  }

  /** Final: una serie de estallidos variados durante unos segundos (al terminar una canción). */
  function show({ colors, count = 6, every = 520 } = {}) {
    if (reduce.matches) return;
    for (let i = 0; i < count; i++) setTimeout(() => burst({ colors, shape: SHAPES[(i + ((Math.random() * 3) | 0)) % SHAPES.length] }), i * every);
  }
  /** Estallidos sueltos y espaciados mientras dure (0 = apagado). */
  function auto(perSecond, opts = {}) {
    autoRate = perSecond;
    autoOpts = opts;
    nextAuto = performance.now() + 400;
    if (autoRate) start();
  }

  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0;
    const dt = Math.min(3, (now - last) / 16.7);
    last = now;
    if (autoRate && !document.hidden && now >= nextAuto) {
      burst(autoOpts);
      nextAuto = now + (1000 / autoRate) * (0.6 + Math.random() * 0.8);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Estelas: se borra con transparencia (no con negro) para no oscurecer la escena de atrás.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.globalCompositeOperation = "lighter";
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.vx *= p.drag ** dt; p.vy = p.vy * p.drag ** dt + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life += p.decay * dt;
      if (p.split && p.life > 0.38 && !p.didSplit) { // crossette: se parte en 4 chispas
        p.didSplit = true;
        for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4, v = 1.6; add(p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, { r: 1.6, decay: 0.022, drag: 0.97, g: 0.03, c: [255, 255, 255] }); }
      }
      if (p.life >= 1) { P.splice(i, 1); continue; }
      let a = (1 - p.life) ** 1.4;
      if (p.twinkle != null) a *= 0.55 + 0.45 * Math.sin(now / 90 + p.twinkle); // titileo suave (no estroboscópico)
      ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (p.trail ? 0.9 : 1), 0, Math.PI * 2);
      ctx.fill();
    }
    if (P.length || autoRate) raf = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && (P.length || autoRate)) start(); });

  return { burst, show, auto, stop: () => { autoRate = 0; } };
}
