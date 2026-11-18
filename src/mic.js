// Modo micrófono: las luces reaccionan a lo que suena en la habitación (música o la voz de quien lo usa).
// Sirve para conciertos que ves en la TV, Prime Video, Disney+, Weverse o en vivo.

export class MicSync {
  /** @param {{palette:number[][], maxChangesPerSec?:number}} opts */
  constructor(opts) {
    this.palette = opts.palette;
    this.maxChangesPerSec = opts.maxChangesPerSec ?? 3;
    // Modo seguro (≤ 3 cambios/s): el brillo sigue al sonido más despacio, así la voz (4–5 sílabas por segundo)
    // no se convierte en parpadeos.
    this.safe = this.maxChangesPerSec <= 3;
    this.active = false;
    this.level = 0;
    this.avg = 0;
    this.colorIndex = 0;
    this.lastChange = 0;
    this.flash = 0;
    this.bright = 0.3;
  }

  /**
   * Hay que llamarlo desde el toque de la persona. El AudioContext se crea ANTES de esperar el permiso del micrófono:
   * si se crea después, Chrome y Samsung Internet en Android lo dejan suspendido (ya no hay gesto) y el analizador
   * solo lee ceros, así que las luces no reaccionaban.
   */
  async start() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    const resumed = this.ctx.resume?.().catch(() => {});
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
      });
    } catch (e) {
      this.ctx.close().catch(() => {});
      throw e;
    }
    await resumed;
    if (this.ctx.state === "suspended") await this.ctx.resume().catch(() => {});
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.3; // poco suavizado: con 0,6 los golpes se aplanaban y no se detectaban
    src.connect(this.analyser);
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    this.active = true;
  }

  /** Si el navegador suspendió el audio (llamada, otra app), lo retoma en el siguiente toque. */
  wake() { if (this.ctx?.state === "suspended") this.ctx.resume().catch(() => {}); }

  stop() {
    this.active = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => {});
  }

  /**
   * Lee el espectro: graves (40–250 Hz) para el golpe de la música y la franja donde está casi todo lo que se oye,
   * música y voz (80 Hz–5 kHz), para el brillo. Promediar hasta 24 kHz diluía la voz y casi no se movía nada.
   */
  read() {
    this.analyser.getByteFrequencyData(this.bins);
    const hz = this.ctx.sampleRate / this.analyser.fftSize;
    const range = (a, b) => [Math.max(1, Math.floor(a / hz)), Math.min(this.bins.length - 1, Math.ceil(b / hz))];
    const band = (a, b) => {
      const [lo, hi] = range(a, b);
      let s = 0;
      for (let i = lo; i <= hi; i++) s += this.bins[i];
      return s / ((hi - lo + 1) * 255);
    };
    // Flujo espectral (100 Hz–4 kHz): cuánto SUBE la energía de un cuadro al siguiente. Marca el golpe de la batería,
    // la palmada o el inicio de cada sílaba aunque el micrófono del teléfono casi no capte graves.
    const [lo, hi] = range(100, 4000);
    this.prev ??= new Uint8Array(this.bins.length);
    let flux = 0;
    for (let i = lo; i <= hi; i++) { const d = this.bins[i] - this.prev[i]; if (d > 0) flux += d; }
    this.prev.set(this.bins);
    return { bass: band(40, 250), voice: band(80, 5000), flux: flux / ((hi - lo + 1) * 255) };
  }

  /** Volumen relativo a la habitación (0–1): el piso sube despacio y baja rápido; el techo, al revés. */
  normalize(level) {
    this.floor = this.floor == null ? level : level < this.floor ? level : this.floor + (level - this.floor) * 0.002;
    this.ceil = this.ceil == null ? level + 0.05 : level > this.ceil ? level : this.ceil - (this.ceil - level) * 0.003;
    return Math.min(1, Math.max(0, (level - this.floor) / Math.max(0.04, this.ceil - this.floor)));
  }

  /** ¿Empezó un golpe de música o una sílaba? Respeta el límite de cambios por segundo. */
  onset({ bass, flux }, now) {
    this.avg = this.avg * 0.95 + bass * 0.05;
    // Umbral adaptativo: media y desviación del flujo de los últimos ~1–2 s. Golpe = pico claro sobre lo habitual.
    this.fmean = (this.fmean ?? flux) * 0.96 + flux * 0.04;
    const dev = Math.abs(flux - this.fmean);
    this.fdev = (this.fdev ?? dev) * 0.96 + dev * 0.04;
    const fluxHit = flux > this.fmean + 1.6 * this.fdev + 0.004 && flux > 0.008;
    const bassHit = bass > this.avg * 1.35 + 0.04;
    // Un golpe recién empieza cuando el flujo cruza el umbral (no mientras sigue arriba).
    const rising = fluxHit && !this.wasHit;
    this.wasHit = fluxHit;
    if (!(rising || bassHit) || now - this.lastChange <= 1000 / this.maxChangesPerSec) return false;
    this.lastChange = now;
    return true;
  }

  /**
   * Intensidad real de lo que suena (0,3–1), para el modo "Con el sonido del video": el patrón pone los colores y
   * el micrófono, cuánto brillan.
   */
  intensity(now = performance.now()) {
    if (!this.active) return 1;
    const r = this.read();
    this.level = this.level * 0.85 + r.voice * 0.15;
    const norm = this.normalize(this.level);
    if (this.onset(r, now)) this.flash = 1;
    this.flash *= 0.88;
    return Math.min(1, 0.3 + 0.6 * norm + 0.25 * this.flash);
  }

  /** Color para este cuadro (modo micrófono): el brillo sigue el volumen y cada golpe o sílaba cambia de tono. */
  sample(now = performance.now()) {
    if (!this.active) return this.palette[0];
    const r = this.read();
    this.level = this.level * 0.8 + r.voice * 0.2;
    const norm = this.normalize(this.level);
    if (this.onset(r, now)) {
      this.colorIndex = (this.colorIndex + 1) % this.palette.length;
      this.flash = 1;
    }
    this.flash *= this.safe ? 0.94 : 0.9;
    // En silencio queda encendido tenue (nunca negro) y con sonido sube hasta el máximo.
    const target = Math.min(1, 0.3 + 0.7 * norm + this.flash * (this.safe ? 0.15 : 0.3));
    const a = target > this.bright ? (this.safe ? 0.12 : 0.35) : (this.safe ? 0.05 : 0.15); // sube rápido, baja suave
    this.bright += (target - this.bright) * a;
    return this.palette[this.colorIndex].map((v) => v * this.bright);
  }
}
