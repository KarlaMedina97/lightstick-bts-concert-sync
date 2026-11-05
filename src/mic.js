// Modo micrófono: las luces reaccionan a lo que suena en la habitación.
// Sirve para conciertos que ves en la TV, Prime Video, Disney+, Weverse o en vivo.

export class MicSync {
  /** @param {{palette:number[][], maxChangesPerSec?:number}} opts */
  constructor(opts) {
    this.palette = opts.palette;
    this.maxChangesPerSec = opts.maxChangesPerSec ?? 3;
    this.active = false;
    this.level = 0;
    this.avg = 0;
    this.colorIndex = 0;
    this.lastChange = 0;
    this.flash = 0;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
    });
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.6;
    src.connect(this.analyser);
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    this.active = true;
  }

  stop() {
    this.active = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => {});
  }

  /**
   * Intensidad real de lo que suena (0,3–1), para el modo "Con el sonido del video": el patrón pone los colores y
   * el micrófono, cuánto brillan. Rango adaptativo (se ajusta solo al volumen de la habitación) y acentos en los
   * golpes de graves, sin pasar del límite de cambios por segundo.
   */
  intensity(now = performance.now()) {
    if (!this.active) return 1;
    this.analyser.getByteFrequencyData(this.bins);
    const hz = this.ctx.sampleRate / this.analyser.fftSize;
    const lo = Math.max(1, Math.floor(40 / hz)), hi = Math.ceil(250 / hz);
    let bass = 0, all = 0;
    for (let i = lo; i <= hi; i++) bass += this.bins[i];
    for (let i = 0; i < this.bins.length; i++) all += this.bins[i];
    bass /= (hi - lo + 1) * 255;
    all /= this.bins.length * 255;
    this.level = this.level * 0.85 + all * 0.15;
    // Envolvente: el piso sube despacio y baja rápido; el techo, al revés.
    this.floor = this.floor == null ? this.level : this.level < this.floor ? this.level : this.floor + (this.level - this.floor) * 0.002;
    this.ceil = this.ceil == null ? this.level + 0.05 : this.level > this.ceil ? this.level : this.ceil - (this.ceil - this.level) * 0.002;
    const norm = Math.min(1, Math.max(0, (this.level - this.floor) / Math.max(0.04, this.ceil - this.floor)));
    this.avg = this.avg * 0.95 + bass * 0.05;
    if (bass > this.avg * 1.35 + 0.04 && now - this.lastChange > 1000 / this.maxChangesPerSec) { this.lastChange = now; this.flash = 1; }
    this.flash *= 0.88;
    return Math.min(1, 0.3 + 0.6 * norm + 0.25 * this.flash);
  }

  /** Calcula el color para este cuadro. @returns {number[]} rgb */
  sample(now = performance.now()) {
    if (!this.active) return this.palette[0];
    this.analyser.getByteFrequencyData(this.bins);
    // Graves (≈ 40–250 Hz) para detectar el golpe; todo el espectro para el brillo.
    const hz = this.ctx.sampleRate / this.analyser.fftSize;
    const lo = Math.max(1, Math.floor(40 / hz)), hi = Math.ceil(250 / hz);
    let bass = 0, all = 0;
    for (let i = lo; i <= hi; i++) bass += this.bins[i];
    for (let i = 0; i < this.bins.length; i++) all += this.bins[i];
    bass /= (hi - lo + 1) * 255;
    all /= this.bins.length * 255;

    this.avg = this.avg * 0.95 + bass * 0.05;
    const onset = bass > this.avg * 1.35 + 0.04;
    if (onset && now - this.lastChange > 1000 / this.maxChangesPerSec) {
      this.lastChange = now;
      this.colorIndex = (this.colorIndex + 1) % this.palette.length;
      this.flash = 1;
    }
    this.flash *= 0.9;
    this.level = this.level * 0.8 + all * 0.2;
    const k = Math.min(1, 0.25 + this.level * 1.6 + this.flash * 0.4);
    return this.palette[this.colorIndex].map((v) => v * k);
  }
}
