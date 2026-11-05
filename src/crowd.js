// Multitud de fans con lightsticks dibujada en un canvas 2D detrás del video.
// El público mira al escenario (de espaldas a nosotros): las luces del show lo iluminan
// a contraluz, con un borde de luz del color actual. Cuatro capas de profundidad; las lejanas
// se dibujan a menor resolución y se escalan, lo que da un desenfoque (profundidad de campo)
// casi gratis. API: setColor(rgb), setEnergy(0..1), flash(), draw(now).

const FPS_MS = 1000 / 30; // ~30 fps es suficiente para el fondo
const TAU = Math.PI * 2;

// Capas de atrás hacia adelante. `res` = resolución relativa (menos = más desenfoque).
const LAYERS = [
  { id: "far", res: 0.34, lod: 0 },
  { id: "mid", res: 0.62, lod: 1 },
  { id: "near", res: 1, lod: 2 },
  { id: "front", res: 0.3, lod: 2 },
];

const mix = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export class Crowd {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas, { reduceMotion = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.reduceMotion = reduceMotion;
    this.target = [138, 43, 226];
    this.color = [138, 43, 226];
    this.lit = [160, 50, 255];
    this.energy = 0.4;
    this.energyS = 0.4;
    this.flashT = 0;
    this.layers = LAYERS.map((l) => ({ ...l, canvas: document.createElement("canvas"), rows: [] }));
    this.sprite = document.createElement("canvas");
    this.spriteKey = "";
    this.last = 0;
    this.resize();
    let pending = 0;
    addEventListener("resize", () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => this.resize());
    });
  }

  resize() {
    const w = this.canvas.clientWidth || innerWidth;
    const h = this.canvas.clientHeight || innerHeight;
    const phone = w < 700;
    // Tope de DPR: en teléfonos un poco más bajo para cuidar la batería.
    const dpr = Math.min(devicePixelRatio || 1, phone ? 1.25 : 1.5);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.dpr = dpr;
    this.w = w;
    this.h = h;
    this.phone = phone;
    for (const l of this.layers) {
      l.canvas.width = Math.max(1, Math.round(w * dpr * l.res));
      l.canvas.height = Math.max(1, Math.round(h * dpr * l.res));
      l.ctx = l.canvas.getContext("2d");
      l.k = dpr * l.res;
    }
    this.hazeKey = "";
    this.build();
  }

  build() {
    const { w, h, phone } = this;
    let seed = 11;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // Pocas filas en teléfonos.
    const plan = phone
      ? { far: 3, mid: 2, near: 2, front: 1 }
      : { far: 5, mid: 3, near: 3, front: 1 };
    // Línea del horizonte del público y profundidad de cada capa.
    const horizon = h * (phone ? 0.56 : 0.5);
    const ranges = { far: [0, 0.34], mid: [0.4, 0.66], near: [0.72, 0.94], front: [1.18, 1.18] };
    for (const layer of this.layers) {
      const n = plan[layer.id];
      const [d0, d1] = ranges[layer.id];
      layer.rows = [];
      for (let r = 0; r < n; r++) {
        const depth = n === 1 ? d0 : mix(d0, d1, r / (n - 1));
        const scale = 0.26 + depth * 0.95;
        const y = horizon + Math.pow(Math.min(depth, 1), 1.25) * (h * 1.02 - horizon) + (layer.id === "front" ? h * 0.06 : 0);
        const spacing = Math.max(12, (layer.id === "front" ? 70 : 40) * scale);
        const fans = [];
        for (let x = -spacing * rand(); x < w + spacing; x += spacing * (0.78 + rand() * 0.5)) {
          const p = rand();
          const pose = layer.id === "front" ? (p < 0.5 ? 3 : p < 0.8 ? 0 : 4) : p < 0.56 ? 0 : p < 0.7 ? 1 : p < 0.78 ? 2 : p < 0.9 ? 3 : 4;
          fans.push({
            x,
            y: y + (rand() - 0.5) * 8 * scale,
            depth,
            scale: scale * (0.9 + rand() * 0.22),
            bodyW: 0.86 + rand() * 0.34,
            neck: 0.9 + rand() * 0.25,
            hair: Math.floor(rand() * 5), // 0 corto, 1 largo, 2 moño, 3 cola, 4 gorra
            pose,
            side: rand() > 0.5 ? 1 : -1,
            lean: (rand() - 0.5) * 0.5,
            phase: (x / w) * 6.2 + r * 0.8 + rand() * 0.4,
            bob: rand() * TAU,
          });
        }
        layer.rows.push({ depth, fans });
      }
    }
  }

  /** @param {number[]} rgb */
  setColor(rgb) { this.target = rgb; }
  setEnergy(e) { this.energy = e; }
  /** Tema claro: público violeta suave sobre fondo lavanda; oscuro: siluetas casi negras. */
  setTheme(theme) { this.light = theme === "light"; }
  /** Destello general (por ejemplo, en cada nombre del fanchant). */
  flash() { this.flashT = 1; }

  glowSprite() {
    const [r, g, b] = this.lit.map((v) => Math.round(v / 8) * 8);
    const key = `${r},${g},${b}`;
    if (key === this.spriteKey) return this.sprite;
    const s = 64;
    this.sprite.width = this.sprite.height = s;
    const c = this.sprite.getContext("2d");
    const grad = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, "rgba(255,255,255,.95)");
    grad.addColorStop(0.14, `rgba(${r},${g},${b},.9)`);
    grad.addColorStop(0.4, `rgba(${r},${g},${b},.28)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    c.clearRect(0, 0, s, s);
    c.fillStyle = grad;
    c.fillRect(0, 0, s, s);
    this.spriteKey = key;
    return this.sprite;
  }

  draw(now) {
    if (now - this.last < FPS_MS) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const { ctx, w, h, dpr } = this;
    const t = this.reduceMotion ? 0 : now / 1000;
    this.flashT = Math.max(0, this.flashT - dt * 2.5);
    // Suaviza el color y la energía para que los cambios se sientan como luz, no como saltos.
    const kc = this.reduceMotion ? 1 : 1 - Math.exp(-dt * 14);
    this.color = this.color.map((v, i) => mix(v, this.target[i], kc));
    this.energyS = mix(this.energyS, this.energy, 1 - Math.exp(-dt * 3));
    // Color de la luz: el mismo tono, normalizado al máximo brillo (una lightstick siempre brilla;
    // la intensidad la ponen la energía y la ola). Sin color (negro) se usa el morado de la marca.
    const m = Math.max(...this.color);
    this.lit = m < 8 ? [150, 90, 255] : this.color.map((v) => Math.round((v * 255) / m));
    const e = this.energyS;
    const sprite = this.glowSprite();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    this.drawSpill(ctx, e);

    for (const layer of this.layers) {
      const lc = layer.ctx;
      lc.setTransform(1, 0, 0, 1, 0, 0);
      lc.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
      lc.setTransform(layer.k, 0, 0, layer.k, 0, 0);
      for (const row of layer.rows) this.drawRow(lc, row, layer.lod, t, e, sprite);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.globalAlpha = layer.id === "front" ? 0.92 : 1;
      ctx.drawImage(layer.canvas, 0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    // Suelo: oscurece la parte baja para que el reproductor se lea bien encima.
    const floor = ctx.createLinearGradient(0, h * 0.72, 0, h);
    floor.addColorStop(0, this.light ? "rgba(244,240,251,0)" : "rgba(4,4,12,0)");
    floor.addColorStop(1, this.light ? "rgba(244,240,251,.6)" : "rgba(4,4,12,.55)");
    ctx.fillStyle = floor;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
  }

  /** Luz del escenario que se derrama sobre el horizonte del público. */
  drawSpill(ctx, e) {
    const { w, h } = this;
    const [r, g, b] = this.lit;
    const a = 0.2 + 0.24 * e + this.flashT * 0.2;
    const cy = h * (this.phone ? 0.56 : 0.5);
    ctx.save();
    ctx.translate(w / 2, cy);
    ctx.scale(1, 0.32);
    const rad = Math.max(w, h) * 0.75;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
    grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
    grad.addColorStop(0.45, `rgba(${r},${g},${b},${a * 0.35})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
    ctx.restore();
  }

  drawRow(c, row, lod, t, e, sprite) {
    const [r, g, b] = this.lit;
    const d = Math.min(row.depth, 1);
    // Perspectiva atmosférica: las filas lejanas toman el tono de la neblina del escenario.
    const fog = (1 - d) * 0.75;
    const fr = Math.round(this.light ? mix(62, 200 + r * 0.06, fog) : mix(6, 8 + r * 0.12, fog));
    const fg = Math.round(this.light ? mix(48, 190 + g * 0.05, fog) : mix(5, 6 + g * 0.1, fog));
    const fb = Math.round(this.light ? mix(98, 228 + b * 0.04, fog) : mix(12, 18 + b * 0.16, fog));
    const body = `rgb(${fr},${fg},${fb})`;
    const rimA = clamp01((0.3 + 0.45 * e + this.flashT * 0.4) * (0.3 + 0.7 * d));
    const rim = `rgba(${Math.round(mix(r, 255, 0.3))},${Math.round(mix(g, 255, 0.3))},${Math.round(mix(b, 255, 0.3))},${rimA.toFixed(3)})`;
    const lift = -1.4; // el borde de luz cae arriba: el escenario ilumina al público a contraluz
    c.lineCap = "round";
    c.lineJoin = "round";

    for (const f of row.fans) {
      const s = f.scale;
      const wave = this.reduceMotion ? 0.7 : 0.5 + 0.5 * Math.sin(t * (1.1 + e * 1.8) - f.phase);
      const sway = this.reduceMotion ? 0 : Math.sin(t * 1.5 + f.phase) * (0.1 + e * 0.22);
      // En los coros el público salta un poco.
      const jump = this.reduceMotion ? 0 : Math.max(0, e - 0.7) * 3.2 * Math.abs(Math.sin(t * 2.6 + f.bob)) * 4 * s;
      const bright = clamp01((0.45 + 0.55 * e) * (0.55 + 0.45 * wave) + this.flashT * 0.6);
      const fig = this.figure(f, s, f.y - jump, sway, wave, e);

      if (lod > 0) {
        // Borde de luz (contraluz): la misma silueta un poco más arriba, en el color actual;
        // el relleno oscuro encima deja ver solo el filo superior.
        c.translate(0, lift * s);
        c.fillStyle = rim;
        c.fill(fig.body);
        if (fig.arms) {
          c.strokeStyle = rim;
          c.lineWidth = fig.armW;
          c.stroke(fig.arms);
        }
        c.translate(0, -lift * s);
      }
      c.fillStyle = body;
      c.fill(fig.body);
      if (fig.arms) {
        c.strokeStyle = body;
        c.lineWidth = fig.armW;
        c.stroke(fig.arms);
      }

      // Lightstick: mango oscuro + globo encendido.
      if (fig.stick) {
        const { hx, hy, tx, ty } = fig.stick;
        c.strokeStyle = "#0b0a12";
        c.lineWidth = 2.6 * s;
        c.beginPath();
        c.moveTo(hx, hy);
        c.lineTo(tx, ty);
        c.stroke();
        const glowA = bright * (0.45 + 0.55 * d);
        const size = Math.max(10, (20 + 26 * bright) * s);
        c.globalCompositeOperation = "lighter";
        c.globalAlpha = glowA;
        c.drawImage(sprite, tx - size / 2, ty - size / 2, size, size);
        c.globalAlpha = Math.min(1, 0.55 + bright * 0.45);
        c.fillStyle = `rgb(${Math.round(mix(r, 255, 0.35))},${Math.round(mix(g, 255, 0.35))},${Math.round(mix(b, 255, 0.35))})`;
        c.beginPath();
        c.arc(tx, ty, 3.6 * s, 0, TAU);
        c.fill();
        c.globalAlpha = 1;
        c.globalCompositeOperation = "source-over";
      }
      // Pantalla del teléfono (luz fría, discreta).
      if (fig.phone) {
        const { px, py } = fig.phone;
        c.fillStyle = `rgba(190,205,255,${(0.14 + 0.2 * d).toFixed(2)})`;
        c.fillRect(px - 3 * s, py - 5 * s, 6 * s, 9.5 * s);
      }
    }
  }

  /** Construye la silueta de un fan (cuerpo + cabeza + pelo como un Path2D, brazos aparte). */
  figure(f, s, y, sway, wave, e) {
    const x = f.x;
    const sw = 17 * f.bodyW * s; // medio ancho de hombros
    const sy = y - 2 * s; // altura de hombros
    const nk = 8 * f.neck * s;
    const body = new Path2D();
    body.moveTo(x - sw - 4 * s, y + 70 * s);
    body.lineTo(x - sw, sy + 12 * s);
    body.quadraticCurveTo(x - sw, sy, x - sw + 9 * s, sy - 2 * s);
    body.lineTo(x - 4.2 * s, sy - 4 * s);
    body.lineTo(x - 3.6 * s, sy - nk);
    body.lineTo(x + 3.6 * s, sy - nk);
    body.lineTo(x + 4.2 * s, sy - 4 * s);
    body.lineTo(x + sw - 9 * s, sy - 2 * s);
    body.quadraticCurveTo(x + sw, sy, x + sw, sy + 12 * s);
    body.lineTo(x + sw + 4 * s, y + 70 * s);
    body.closePath();
    // Cabeza
    const hy = sy - nk - 7.5 * s;
    body.moveTo(x + 7.4 * s, hy);
    body.ellipse(x, hy, 7.4 * s, 9 * s, 0, 0, TAU);
    // Pelo / accesorios: variedad de siluetas.
    switch (f.hair) {
      case 1: // largo
        body.moveTo(x - 8.2 * s, hy - 1 * s);
        body.quadraticCurveTo(x - 9.5 * s, sy + 2 * s, x - 6 * s, sy + 6 * s);
        body.lineTo(x + 6 * s, sy + 6 * s);
        body.quadraticCurveTo(x + 9.5 * s, sy + 2 * s, x + 8.2 * s, hy - 1 * s);
        body.closePath();
        break;
      case 2: // moño
        body.moveTo(x + 4.6 * s, hy - 10.5 * s);
        body.arc(x, hy - 10.5 * s, 4.6 * s, 0, TAU);
        break;
      case 3: // cola de caballo
        body.moveTo(x + f.side * 6 * s, hy - 2 * s);
        body.ellipse(x + f.side * 8 * s, hy + 3 * s, 3.2 * s, 7.5 * s, f.side * 0.35, 0, TAU);
        break;
      case 4: // gorra
        body.rect(x - 8 * s, hy - 4.5 * s, 16 * s, 3 * s);
        body.moveTo(x + f.side * 6 * s, hy - 3.5 * s);
        body.lineTo(x + f.side * 13 * s, hy - 2.5 * s);
        body.lineTo(x + f.side * 6 * s, hy - 1 * s);
        body.closePath();
        break;
      default:
        break;
    }

    const out = { body, arms: null, armW: 5.4 * s, stick: null, phone: null };
    const shoulder = (side) => [x + side * (sw - 5 * s), sy + 2 * s];
    const reach = 0.85 + 0.25 * e + 0.12 * wave; // brazos más arriba con más energía
    const armUp = (side, extra = 0) => {
      const [ax, ay] = shoulder(side);
      const a1 = -Math.PI / 2 + side * (0.42 + f.lean * 0.4) + sway * 0.5 + extra;
      const ex = ax + Math.cos(a1) * 17 * s * reach;
      const ey = ay + Math.sin(a1) * 17 * s * reach;
      const a2 = a1 - side * 0.32 + sway;
      const hx = ex + Math.cos(a2) * 16 * s * reach;
      const hy2 = ey + Math.sin(a2) * 16 * s * reach;
      return { ax, ay, ex, ey, hx, hy: hy2, a2 };
    };

    if (f.pose === 0 || f.pose === 1) {
      const a = armUp(f.side);
      const arms = new Path2D();
      arms.moveTo(a.ax, a.ay);
      arms.lineTo(a.ex, a.ey);
      arms.lineTo(a.hx, a.hy);
      if (f.pose === 1) {
        const o = armUp(-f.side, -f.side * 0.1);
        arms.moveTo(o.ax, o.ay);
        arms.lineTo(o.ex, o.ey);
        arms.lineTo(o.hx, o.hy);
      }
      out.arms = arms;
      const sl = 10 * s;
      out.stick = { hx: a.hx, hy: a.hy, tx: a.hx + Math.cos(a.a2) * sl, ty: a.hy + Math.sin(a.a2) * sl };
    } else if (f.pose === 2) {
      // Grabando con el teléfono: ambos antebrazos frente a la cara.
      const arms = new Path2D();
      const px = x + f.side * 2 * s;
      const py = hy - 14 * s - 4 * s * wave * e;
      for (const side of [-1, 1]) {
        const [ax, ay] = shoulder(side);
        arms.moveTo(ax, ay);
        arms.lineTo(x + side * 10 * s, sy - 10 * s);
        arms.lineTo(px + side * 2.5 * s, py + 3 * s);
      }
      out.arms = arms;
      out.phone = { px, py };
    } else if (f.pose === 3) {
      // Lightstick a la altura del pecho, por encima del hombro.
      const [ax, ay] = shoulder(f.side);
      const arms = new Path2D();
      const hx = x + f.side * (sw + 5 * s);
      const hy3 = sy - 6 * s - 4 * s * wave * e;
      arms.moveTo(ax, ay);
      arms.lineTo(x + f.side * (sw + 2 * s), sy + 10 * s);
      arms.lineTo(hx, hy3);
      out.arms = arms;
      const a = -Math.PI / 2 + f.side * 0.25 + sway;
      out.stick = { hx, hy: hy3, tx: hx + Math.cos(a) * 10 * s, ty: hy3 + Math.sin(a) * 10 * s };
    }
    return out;
  }
}
