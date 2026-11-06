// Fondo de panal: líneas hexagonales sutiles que nacen en los bordes de la pantalla. Con el scroll (GSAP +
// ScrollTrigger) cada capítulo decide hasta dónde llegan: en unos se juntan hacia el centro y en otros se quedan
// solo en los bordes, dejando el centro libre para el ARMY Bomb y el texto.
// Rendimiento: los hexágonos se agrupan en ~12 bandas según su distancia al borde; al hacer scroll solo se animan
// las bandas (opacidad y un leve "entrar desde afuera"), no cada celda.

const NS = "http://www.w3.org/2000/svg";
const BANDS = 12;

/**
 * @param {{ gsap?: any, ScrollTrigger?: any, reduceMotion?: boolean, reach?: Record<string, number> }} o
 *   reach: por id de capítulo, hasta dónde llega el panal (0 = solo el borde, 1 = toda la pantalla).
 */
export function hive({ gsap, ScrollTrigger, reduceMotion = false, reach = {} } = {}) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "hive");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  document.getElementById("scene")?.after(svg);
  const state = { reach: 0.18 };
  let groups = [];

  function build() {
    const W = innerWidth, H = Math.max(innerHeight, document.documentElement.clientHeight);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const r = W < 720 ? 34 : 46; // radio del hexágono: más grandes (menos celdas) en teléfono
    const w = Math.sqrt(3) * r, h = 1.5 * r;
    const bands = Array.from({ length: BANDS }, () => []);
    const half = Math.min(W, H) / 2;
    for (let row = -1, y = 0; y < H + r; row++, y = row * h) {
      for (let col = -1; col * w < W + w; col++) {
        const cx = col * w + (row % 2 ? w / 2 : 0), cy = y;
        // Distancia al borde más cercano, normalizada (0 en el borde, 1 en el centro).
        const d = Math.min(cx, W - cx, cy, H - cy) / half;
        const b = Math.max(0, Math.min(BANDS - 1, Math.floor(d * BANDS)));
        let p = "";
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI / 3) * k + Math.PI / 6;
          p += `${k ? "L" : "M"}${(cx + r * 0.94 * Math.cos(a)).toFixed(1)} ${(cy + r * 0.94 * Math.sin(a)).toFixed(1)}`;
        }
        bands[b].push(p + "Z");
      }
    }
    svg.replaceChildren();
    groups = bands.map((paths, i) => {
      const g = document.createElementNS(NS, "path");
      g.setAttribute("d", paths.join(""));
      g.setAttribute("class", "hive-band");
      g.dataset.band = String(i);
      g.style.transformOrigin = `${W / 2}px ${H / 2}px`;
      svg.append(g);
      return g;
    });
    paint();
  }

  // Cada banda se ve si está dentro del alcance actual; las del borde del alcance aparecen a medias y llegan
  // desde un poco más afuera (escala > 1), como si el panal se fuera juntando desde los bordes.
  function paint() {
    const R = state.reach;
    groups.forEach((g, i) => {
      const t = i / BANDS;
      const v = Math.max(0, Math.min(1, (R - t) / 0.16));
      const o = v * (0.34 - t * 0.18); // sutil: más visible en el borde, casi nada hacia el centro
      g.style.opacity = o.toFixed(3);
      g.style.transform = reduceMotion ? "" : `scale(${(1 + (1 - v) * 0.06).toFixed(4)})`;
    });
  }

  build();
  let rt = 0;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(build, 200); });

  if (!gsap || !ScrollTrigger || reduceMotion) return { set: (v) => { state.reach = v; paint(); } };
  // Al entrar a cada capítulo, el panal se acomoda a su alcance (avanza o retrocede, suave).
  for (const [id, value] of Object.entries(reach)) {
    const el = document.getElementById(id);
    if (!el) continue;
    ScrollTrigger.create({
      trigger: el, start: "top 60%", end: "bottom 40%",
      onToggle: (self) => { if (self.isActive) gsap.to(state, { reach: value, duration: 1.4, ease: "power2.out", overwrite: true, onUpdate: paint }); },
    });
  }
  return { set: (v) => gsap.to(state, { reach: v, duration: 1, onUpdate: paint, overwrite: true }) };
}
