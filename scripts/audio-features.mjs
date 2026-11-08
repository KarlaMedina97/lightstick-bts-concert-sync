// Medición del audio escuchado (lab.listen de scripts/video-lab.html): tempo, fase, golpes fuertes, pausas, perfil
// por compás y cambios de sección. Funciones puras: entra la lista de muestras [t, total, graves, medios, agudos,
// flujo] y sale un resumen en números. No guarda audio.

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] || 1e-9; };
const smooth = (a, w) => { const o = new Float32Array(a.length); let s = 0; for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= w) s -= a[i - w]; o[i] = s / Math.min(i + 1, w); } return o; };

/** @param {number[][]} raw muestras [t, total, graves, medios, agudos, flujo] */
export function audioFeatures(raw, { FS = 50, bpmHint = 0 } = {}) {
  const dur = raw.at(-1)[0];
  const N = Math.floor(dur * FS);
  const grid = (k) => { const a = new Float32Array(N); let j = 0; for (let i = 0; i < N; i++) { const t = i / FS; while (j < raw.length - 1 && raw[j + 1][0] <= t) j++; a[i] = raw[j][k]; } return a; };
  const tot = grid(1), low = grid(2), high = grid(4), flux = grid(5);
  const lowRise = new Float32Array(N); for (let i = 1; i < N; i++) lowRise[i] = Math.max(0, low[i] - low[i - 1]);
  const mf = median(flux), ml = median(lowRise);
  const on = new Float32Array(N); for (let i = 0; i < N; i++) on[i] = flux[i] / mf + (2 * lowRise[i]) / ml;
  // Tempo por autocorrelación del onset (70–180 BPM).
  const score = (bpm) => { const lag = (60 / bpm) * FS; let s = 0; for (let i = 0; i + lag * 2 < N; i += 2) s += on[i] * (on[Math.round(i + lag)] + 0.5 * on[Math.round(i + 2 * lag)]); return s; };
  let best = { bpm: 100, s: -1 };
  for (let bpm = 70; bpm <= 180; bpm += 0.5) { const s = score(bpm); if (s > best.s) best = { bpm, s }; }
  // Con el BPM aproximado del catálogo: si cerca de él (±8 %, o su doble/mitad) hay un pulso casi tan claro, se usa ese
  // (la autocorrelación a veces engancha un múltiplo raro del tempo real).
  if (bpmHint > 0) {
    // Se prefiere el tempo cercano al del catálogo; su doble o su mitad solo si su pulso es claramente más fuerte.
    const around = (h) => { let n = { bpm: 0, s: -1 }; if (h < 50 || h > 210) return n; for (let bpm = h * 0.92; bpm <= h * 1.08; bpm += 0.25) { const s = score(bpm); if (s > n.s) n = { bpm: +bpm.toFixed(2), s }; } return n; };
    const same = around(bpmHint), alt = [around(bpmHint * 2), around(bpmHint / 2)].sort((x, y) => y.s - x.s)[0];
    const near = same.s >= alt.s * 0.7 ? same : alt;
    if (near.s >= best.s * 0.6) best = near;
  }
  const beat = 60 / best.bpm;
  let ph = { p: 0, s: -1 };
  for (let p = 0; p < beat; p += 0.01) { let s = 0; for (let t = p; t < dur; t += beat) s += on[Math.round(t * FS)] ?? 0; if (s > ph.s) ph = { p, s }; }
  // Golpes fuertes (retumbones y remates), separados ≥ 0,35 s.
  const lowS = smooth(low, 3), lowMed = median(lowS);
  const hits = [];
  for (let i = 2; i < N - 2; i++) if (on[i] > on[i - 1] && on[i] >= on[i + 1] && on[i] > 6 && lowS[i] > lowMed * 1.6 && (!hits.length || i / FS - hits.at(-1).t >= 0.35)) hits.push({ t: +(i / FS).toFixed(2), f: +on[i].toFixed(1), bajo: +(lowS[i] / lowMed).toFixed(1) });
  // Ráfagas: golpes de cualquier tipo (palmas, cajas, disparos, «pa pa pa») muy seguidos: ≥ 3 golpes con menos de
  // 0,45 s entre uno y otro. Se quedan las más fuertes, como mucho una cada 8 s.
  // Un golpe de ráfaga sobresale de lo que suena alrededor (≥ 2,5 veces la mediana local de ±1,5 s).
  const W = Math.round(1.5 * FS), localMed = new Float32Array(N);
  for (let i = 0; i < N; i += 5) { const seg = Array.from(on.subarray(Math.max(0, i - W), Math.min(N, i + W))).sort((a, b) => a - b); const m = seg[Math.floor(seg.length / 2)] || 1e-9; for (let k = i; k < Math.min(N, i + 5); k++) localMed[k] = m; }
  const onsets = [];
  for (let i = 2; i < N - 2; i++) if (on[i] > on[i - 1] && on[i] >= on[i + 1] && on[i] > 2.5 * localMed[i] && (!onsets.length || i / FS - onsets.at(-1).t >= 0.1)) onsets.push({ t: +(i / FS).toFixed(2), f: on[i] / localMed[i] });
  const runs = [];
  for (let i = 0; i < onsets.length; ) {
    let j = i; while (j + 1 < onsets.length && onsets[j + 1].t - onsets[j].t <= 0.45 && j - i < 11) j++;
    const g = onsets.slice(i, j + 1), gaps = g.slice(1).map((o, k) => o.t - g[k].t), mg = gaps.reduce((a, x) => a + x, 0) / Math.max(1, gaps.length);
    const regular = gaps.every((x) => Math.abs(x - mg) <= mg * 0.45); // ritmo parejo: «pa pa pa pa»
    if (g.length >= 3 && g.at(-1).t - g[0].t <= 3 && regular) runs.push({ t: g[0].t, fin: g.at(-1).t, golpes: g.map((o) => o.t), fuerza: g.reduce((a, o) => a + o.f, 0) / g.length });
    i = j + 1;
  }
  const bursts = [];
  for (const r of [...runs].sort((a, b) => b.fuerza - a.fuerza)) if (bursts.length < Math.ceil(dur / 20) && bursts.every((b) => Math.abs(b.t - r.t) >= 8)) bursts.push({ ...r, fuerza: +r.fuerza.toFixed(1) });
  bursts.sort((a, b) => a.t - b.t);
  // Pausas: energía < 12 % de la mediana durante ≥ 0,25 s.
  const totS = smooth(tot, 5), totMed = median(totS);
  const pauses = []; let st = -1;
  for (let i = 0; i <= N; i++) { const q = i < N && totS[i] < totMed * 0.12; if (q && st < 0) st = i; if (!q && st >= 0) { if ((i - st) / FS >= 0.25) pauses.push({ t: +(st / FS).toFixed(2), fin: +(i / FS).toFixed(2) }); st = -1; } }
  // Perfil por compás (4 tiempos), relativo a la mediana de la canción.
  const mLow = median(low), mHigh = median(high), bars = [];
  for (let t = ph.p; t + 4 * beat <= dur + 0.01; t += 4 * beat) {
    const a = Math.round(t * FS), b = Math.min(N, Math.round((t + 4 * beat) * FS));
    const avg = (arr) => { let s = 0; for (let i = a; i < b; i++) s += arr[i]; return s / Math.max(1, b - a); };
    bars.push({ t: +t.toFixed(2), e: avg(tot) / totMed, g: avg(low) / mLow, h: avg(high) / mHigh, golpes: hits.filter((x) => x.t >= t && x.t < t + 4 * beat).length });
  }
  // Cambios de sección: contraste entre los 4 compases antes y después.
  const feat = (i) => [bars[i].e, bars[i].g / 3, bars[i].h, bars[i].golpes / 4];
  const nov = bars.map((_, i) => {
    if (i < 2 || i > bars.length - 3) return 0;
    const A = [0, 0, 0, 0], B = [0, 0, 0, 0];
    for (let k = 1; k <= 4; k++) { feat(Math.max(0, i - k)).forEach((v, j) => (A[j] += v / 4)); feat(Math.min(bars.length - 1, i + k - 1)).forEach((v, j) => (B[j] += v / 4)); }
    return Math.hypot(...A.map((v, j) => v - B[j]));
  });
  const peaks = nov.map((v, i) => ({ i, v })).filter(({ i, v }) => v > 0.35 && v >= (nov[i - 1] ?? 0) && v >= (nov[i + 1] ?? 0));
  return { dur: +dur.toFixed(1), bpm: best.bpm, beat, primerTiempo: +ph.p.toFixed(2), hits, bursts, pauses, bars, cambios: peaks.map(({ i, v }) => ({ t: bars[i].t, fuerza: +v.toFixed(2) })) };
}
