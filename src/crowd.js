// Multitud de fans con lightsticks dibujada en un canvas 2D detrás del video.
// Filas en perspectiva: siluetas con el brazo en alto y la lightstick encendida con el color actual.

export class Crowd {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas, { reduceMotion = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.reduceMotion = reduceMotion;
    this.color = [138, 43, 226];
    this.energy = 0.4;
    this.flashT = 0;
    this.fans = [];
    this.sprite = document.createElement("canvas");
    this.spriteKey = "";
    this.last = 0;
    this.resize();
    addEventListener("resize", () => this.resize());
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = this.canvas.clientWidth || innerWidth;
    const h = this.canvas.clientHeight || innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    this.build();
  }

  build() {
    // Pocas filas en teléfonos para cuidar la batería.
    const rows = this.w < 700 ? 7 : 10;
    const fans = [];
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let r = 0; r < rows; r++) {
      const depth = r / (rows - 1); // 0 = fondo, 1 = frente
      const scale = 0.35 + depth * 0.95;
      const y = this.h * (0.42 + depth * 0.62);
      const spacing = 46 * scale;
      for (let x = -spacing * rand(); x < this.w + spacing; x += spacing * (0.8 + rand() * 0.4)) {
        fans.push({
          x, y: y + (rand() - 0.5) * 10 * scale, scale, depth,
          phase: x / this.w * 6 + r * 0.7,
          lean: (rand() - 0.5) * 0.5,
          up: rand() > 0.12, // casi todos con la lightstick arriba
          hand: rand() > 0.5 ? 1 : -1,
        });
      }
    }
    this.fans = fans;
  }

  /** @param {number[]} rgb */
  setColor(rgb) { this.color = rgb; }
  setEnergy(e) { this.energy = e; }
  /** Destello general (por ejemplo, en cada nombre del fanchant). */
  flash() { this.flashT = 1; }

  glowSprite() {
    const [r, g, b] = this.color.map((v) => Math.round(v / 8) * 8);
    const key = `${r},${g},${b}`;
    if (key === this.spriteKey) return this.sprite;
    const s = 64;
    this.sprite.width = this.sprite.height = s;
    const c = this.sprite.getContext("2d");
    const grad = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.18, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(0.45, `rgba(${r},${g},${b},.35)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    c.clearRect(0, 0, s, s);
    c.fillStyle = grad;
    c.fillRect(0, 0, s, s);
    this.spriteKey = key;
    return this.sprite;
  }

  draw(now) {
    // ~30 fps es suficiente para el fondo.
    if (now - this.last < 33) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const { ctx, w, h } = this;
    const t = this.reduceMotion ? 0 : now / 1000;
    this.flashT = Math.max(0, this.flashT - dt * 2.5);
    ctx.clearRect(0, 0, w, h);
    const sprite = this.glowSprite();
    const e = this.energy;

    for (const f of this.fans) {
      const s = f.scale;
      // La ola recorre el público; más amplia cuando la canción tiene más energía.
      const wave = this.reduceMotion ? 0.7 : 0.5 + 0.5 * Math.sin(t * (1.2 + e * 2) - f.phase);
      const sway = this.reduceMotion ? 0 : Math.sin(t * 1.6 + f.phase) * (0.15 + e * 0.25);
      const bright = Math.min(1, (0.35 + 0.65 * e) * (0.55 + 0.45 * wave) + this.flashT * 0.6);
      const fog = 0.35 + 0.65 * f.depth;

      // Lightstick: mango + globo brillante.
      if (f.up) {
        const angle = f.lean + sway;
        const armLen = 34 * s + wave * 6 * s * e;
        const hx = f.x + f.hand * 10 * s;
        const hy = f.y - 26 * s;
        const tx = hx + Math.sin(angle) * armLen;
        const ty = hy - Math.cos(angle) * armLen;
        ctx.strokeStyle = "#07060d";
        ctx.lineWidth = 5 * s;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(hx, hy + 6 * s);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        const size = (22 + 26 * bright) * s;
        ctx.globalAlpha = bright * fog;
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(sprite, tx - size / 2, ty - size / 2 - 4 * s, size, size);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }

      // Silueta: cabeza y hombros, con un borde de luz del color actual.
      ctx.fillStyle = `rgb(${8 + 6 * (1 - f.depth)}, ${7 + 5 * (1 - f.depth)}, ${14 + 10 * (1 - f.depth)})`;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y + 8 * s, 19 * s, 15 * s, 0, Math.PI, 0);
      ctx.rect(f.x - 19 * s, f.y + 8 * s, 38 * s, 60 * s);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(f.x, f.y - 12 * s, 10 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Brillo ambiental del público sobre las siluetas del frente.
    const [r, g, b] = this.color;
    const grad = ctx.createLinearGradient(0, h * 0.35, 0, h);
    grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},${0.08 + 0.12 * e})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, h * 0.35, w, h * 0.65);
  }
}
