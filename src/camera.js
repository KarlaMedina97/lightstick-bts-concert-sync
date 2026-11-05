// Modo cámara para conciertos en vivo: apuntas a un ARMY Bomb real (o a la grada encendida)
// y la app copia su color en tiempo real. Todo se procesa en el dispositivo; la imagen nunca se envía.

const SIZE = 48; // la imagen se reduce a 48×48 px antes de analizarla

/**
 * Color dominante "de luz" en una región: pondera los píxeles brillantes y saturados
 * (una lightstick encendida) e ignora el fondo oscuro, el blanco quemado y el gris.
 * @param {Uint8ClampedArray|number[]} data RGBA
 * @param {number} w ancho  @param {number} h alto
 * @param {{cx?:number, cy?:number, r?:number}} [area] círculo en fracciones (0–1) del cuadro
 * @returns {{rgb:number[], strength:number}|null} strength 0–1 = cuánta luz de color hay
 */
export function dominantColor(data, w, h, area = {}) {
  const cx = (area.cx ?? 0.5) * w, cy = (area.cy ?? 0.5) * h, r = (area.r ?? 0.35) * Math.min(w, h);
  const r2 = r * r;
  let sr = 0, sg = 0, sb = 0, sw = 0, n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy > r2) continue;
      n++;
      const i = (y * w + x) * 4;
      const R = data[i], G = data[i + 1], B = data[i + 2];
      const max = Math.max(R, G, B), min = Math.min(R, G, B);
      const v = max / 255;
      const s = max ? (max - min) / max : 0;
      if (v < 0.25 || s < 0.25) continue; // oscuro o gris/blanco
      const wgt = s * s * v * v;
      sr += R * wgt; sg += G * wgt; sb += B * wgt; sw += wgt;
    }
  }
  if (!n || sw < n * 0.004) return null;
  // Lleva el color a brillo pleno (la pantalla y el lightstick lo atenúan después).
  const rgb = [sr / sw, sg / sw, sb / sw];
  const m = Math.max(...rgb) || 1;
  return { rgb: rgb.map((c) => Math.round((c / m) * 255)), strength: Math.min(1, sw / (n * 0.08)) };
}

export class CameraColor {
  /** @param {{maxChangesPerSec?:number}} [opts] */
  constructor(opts = {}) {
    this.maxChangesPerSec = opts.maxChangesPerSec ?? 3;
    this.active = false;
    this.color = [138, 43, 226];
    this.target = [...this.color];
    this.strength = 0;
    this.lastSample = 0;
    this.lastJump = 0;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.canvas.height = SIZE;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
  }

  /** @param {HTMLVideoElement} video vista previa visible para apuntar */
  async start(video) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
    });
    this.video = video;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = this.stream;
    await video.play().catch(() => {});
    // Exposición fija si el navegador lo permite: evita que la cámara "aclare" las luces.
    const track = this.stream.getVideoTracks()[0];
    try {
      const caps = track.getCapabilities?.() ?? {};
      if (caps.exposureMode?.includes("manual")) await track.applyConstraints({ advanced: [{ exposureMode: "manual" }] });
    } catch {}
    this.active = true;
  }

  stop() {
    this.active = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.video) this.video.srcObject = null;
  }

  /** Color suavizado para este cuadro. */
  sample(now = performance.now()) {
    if (!this.active || !this.video || this.video.readyState < 2) return this.color;
    if (now - this.lastSample > 60) {
      this.lastSample = now;
      this.ctx.drawImage(this.video, 0, 0, SIZE, SIZE);
      const res = dominantColor(this.ctx.getImageData(0, 0, SIZE, SIZE).data, SIZE, SIZE);
      if (res) {
        const diff = Math.hypot(...res.rgb.map((c, i) => c - this.target[i]));
        // Cambios grandes de color, como máximo N por segundo (modo seguro).
        if (diff < 60 || now - this.lastJump > 1000 / this.maxChangesPerSec) {
          if (diff >= 60) this.lastJump = now;
          this.target = res.rgb;
        }
        this.strength = this.strength * 0.7 + res.strength * 0.3;
      } else {
        this.strength *= 0.85;
      }
    }
    // Transición suave hacia el color objetivo.
    this.color = this.color.map((c, i) => c + (this.target[i] - c) * 0.25);
    const k = 0.35 + 0.65 * Math.min(1, this.strength * 1.4);
    return this.color.map((c) => c * k);
  }
}
