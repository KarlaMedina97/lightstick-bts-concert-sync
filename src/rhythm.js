// Reto de ritmo: toca al compás de la canción y suma puntos.
// No necesitamos saber dónde cae exactamente el primer tiempo: el reto estima la fase a partir
// de tus propios toques (media circular), así que mide qué tan constante eres al tempo de la canción.

export const JUDGEMENTS = [
  { id: "perfect", label: "¡Perfecto!", window: 0.06, points: 300 },
  { id: "great", label: "¡Genial!", window: 0.12, points: 100 },
  { id: "good", label: "Bien", window: 0.2, points: 50 },
];
const CALIBRATION_TAPS = 4;
export const MIN_TAPS_FOR_RANKING = 16;

export class RhythmChallenge {
  constructor(bpm) {
    this.beat = 60 / (bpm || 100);
    this.reset();
  }

  reset() {
    this.sumSin = 0;
    this.sumCos = 0;
    this.taps = 0;
    this.scored = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.hits = 0;
    this.lastTap = -Infinity;
  }

  /** @param {number} t segundos de la canción @returns {{id:string,label:string,points:number,combo:number}} */
  tap(t) {
    if (t - this.lastTap < this.beat * 0.4) return { id: "ignored", label: "", points: 0, combo: this.combo };
    this.lastTap = t;
    const angle = ((t / this.beat) % 1) * 2 * Math.PI;
    this.taps++;

    let result;
    if (this.taps <= CALIBRATION_TAPS) {
      result = { id: "calibrating", label: `Calibrando ${this.taps}/${CALIBRATION_TAPS}`, points: 0 };
    } else {
      const phase = Math.atan2(this.sumSin, this.sumCos);
      let diff = angle - phase;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // -π..π
      const errSec = (Math.abs(diff) / (2 * Math.PI)) * this.beat;
      const j = JUDGEMENTS.find((x) => errSec <= x.window);
      this.scored++;
      if (j) {
        this.hits++;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        const bonus = 1 + Math.min(this.combo, 50) / 50; // hasta x2 por combo
        const points = Math.round(j.points * bonus);
        this.score += points;
        result = { id: j.id, label: j.label, points };
      } else {
        this.combo = 0;
        result = { id: "miss", label: "Fuera de ritmo", points: 0 };
      }
    }
    // Actualiza la fase estimada con este toque.
    this.sumSin += Math.sin(angle);
    this.sumCos += Math.cos(angle);
    return { ...result, combo: this.combo };
  }

  get accuracy() {
    return this.scored ? this.hits / this.scored : 0;
  }

  get qualifies() {
    return this.taps >= MIN_TAPS_FOR_RANKING;
  }

  summary() {
    return {
      score: this.score,
      accuracy: Math.round(this.accuracy * 100),
      maxCombo: this.maxCombo,
      taps: this.taps,
    };
  }
}
