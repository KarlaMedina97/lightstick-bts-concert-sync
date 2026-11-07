// Diseño automático de una secuencia de luces a partir del audio medido (audio-features.mjs) y los colores del MV
// (src/video-looks.js). Reglas aprendidas al diseñar a mano We Are Bulletproof Pt.2 con la usuaria:
// - golpes de bajo fuertes → destellos (acentos), entre golpes una brasa del mismo color;
// - silencios → apagón breve; subidas de agudos sin bajo → bombillo (o subida en baladas) que baja antes del golpe;
// - partes brillantes → coro abierto (amarillo, dorado, blanco); partes pesadas → rojo y carmesí al máximo;
// - partes suaves → morado tenue; nunca plano: cada tramo cambia color, efecto o brillo;
// - colores preferidos: blanco, amarillo, naranja, rojo y morado más que celeste; una paleta obligatoria manda.
// Función pura: no escucha ni escribe nada.
import { STRUCTURE } from "../src/patterns.js";

const P = { blanco: "#ffffff", amarillo: "#ffd000", dorado: "#ffc840", naranja: "#ff7a00", rojo: "#ff1f51", carmesi: "#c8102e", morado: "#8a2be2", moradoOsc: "#4b1a8a", lila: "#b388ff" };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] ?? 0; };
const hueOf = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255); const M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m; if (!d) return -1; return 60 * (M === r ? ((g - b) / d + 6) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4); };
const r1 = (x) => Math.round(x * 10) / 10;

/**
 * @param {{song:{id:string,yt:string,title:string,energy?:string}, look?:object|null, video?:object|null, f:ReturnType<import("./audio-features.mjs").audioFeatures>}} o
 */
export function autoDesign({ song, look = null, video = null, f }) {
  const dur = f.dur, ballad = song.energy === "ballad" || (f.bpm < 80 && f.hits.length / dur < 0.6);
  const bars = f.bars;
  const mE = med(bars.map((b) => b.e)), mG = med(bars.map((b) => b.g)), mH = med(bars.map((b) => b.h));

  // 1) Fronteras: cambios de sección fuertes, con tramos de al menos 6 s (se quedan las fronteras más fuertes).
  let cuts = [...f.cambios].sort((a, b) => b.fuerza - a.fuerza);
  const kept = [];
  for (const c of cuts) if (c.t > 3 && c.t < dur - 3 && kept.every((k) => Math.abs(k - c.t) >= 6)) kept.push(c.t);
  kept.sort((a, b) => a - b);
  // 2) Pausas reales (0,25–3 s) como apagones; un silencio largo al final se queda en el cierre.
  const pauses = f.pauses.filter((p) => p.fin - p.t <= 3 && p.fin < dur - 2);
  let edges = [0, ...kept, dur];
  for (const p of pauses) edges.push(p.t, p.fin);
  edges = [...new Set(edges.map(r1))].sort((a, b) => a - b).filter((t, i, a) => i === 0 || t - a[i - 1] >= 0.2);
  edges[edges.length - 1] = dur;

  // 3) Clase de cada tramo según su sonido.
  const segs = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const a = edges[i], b = edges[i + 1];
    const isPause = pauses.some((p) => Math.abs(p.t - a) < 0.25 && Math.abs(p.fin - b) < 0.25);
    const bs = bars.filter((x) => x.t + 1 >= a && x.t < b);
    const E = mean(bs.map((x) => x.e)), G = mean(bs.map((x) => x.g)), H = mean(bs.map((x) => x.h));
    const hitsPerSec = f.hits.filter((h) => h.t >= a && h.t < b).length / Math.max(1, b - a);
    segs.push({ a, b, isPause, E, G, H, hps: hitsPerSec, hFirst: bs[0]?.h ?? H, hLast: bs.at(-1)?.h ?? H });
  }
  segs.forEach((s, i) => {
    const next = segs[i + 1];
    if (s.isPause) s.k = "pausa";
    else if (i === segs.length - 1) s.k = "final";
    else if (i === 0 && s.E < mE) s.k = "intro";
    else if (next && next.E > s.E * 1.2 && s.hLast > s.hFirst * 1.25 && s.G < mG * 1.1) s.k = "subida";
    else if (s.G >= Math.max(3, mG * 1.45) && s.hps >= 0.8) s.k = "pesado";
    else if (s.H >= mH * 1.35 && s.E >= mE * 0.95) s.k = "brillo";
    else if (s.E < mE * 0.7) s.k = "suave";
    else s.k = "medio";
  });

  // 4) Colores: los del MV en ese momento + la preferencia de la usuaria; una paleta obligatoria manda.
  const lock = look?.lock ? look.palette : null;
  const vidAt = (t) => { const x = t / dur; const i = Math.max(0, STRUCTURE.findIndex(([, a, b]) => x >= a && x < b)); return video?.frames?.[i] ?? video?.overall ?? []; };
  const pick = (list, want) => list.find((h) => { const hu = hueOf(h); return hu >= 0 && want(hu); });
  const warm = (hu) => hu < 20 || hu > 340, gold = (hu) => hu >= 35 && hu <= 60, violet = (hu) => hu >= 260 && hu <= 320;
  const count = {};
  const colorFor = (k, t) => {
    const n = (count[k] = (count[k] ?? 0) + 1) - 1, v = vidAt(t);
    if (lock) return [lock[n % lock.length], lock[(n + 1) % lock.length]];
    switch (k) {
      case "pesado": return [pick(v, warm) ?? [P.rojo, P.carmesi][n % 2], [P.blanco, P.dorado, P.amarillo][n % 3]];
      case "brillo": return [pick(v, gold) ?? [P.amarillo, P.dorado, P.blanco][n % 3], [P.blanco, P.rojo, P.naranja][n % 3]];
      case "subida": return [P.naranja, P.amarillo];
      case "suave": return [pick(v, violet) ?? [P.morado, P.lila][n % 2], v[0] ?? P.blanco];
      case "intro": return [pick(v, violet) ?? P.moradoOsc, v[0] ?? P.blanco];
      case "final": return [v[0] ?? P.morado, null];
      case "pausa": return ["#000000", null];
      default: return [v[n % Math.max(1, v.length)] ?? [P.morado, P.carmesi][n % 2], [P.rojo, P.morado, P.dorado][n % 3]];
    }
  };

  // 5) Efecto, brillo y acentos por clase (las baladas no destellan: respiran y crecen).
  const occ = {};
  const tramos = segs.map((s, i) => {
    const n = (occ[s.k] = (occ[s.k] ?? 0) + 1) - 1;
    const [color, color2] = colorFor(s.k, (s.a + s.b) / 2);
    const rap = Boolean(look?.rap);
    const E = {
      pausa: ["blackout", 0, 0, "corte", 0],
      intro: [ballad ? "breathe" : "hold", 0.25, 0.45, "fundido", 1.5],
      subida: [ballad ? "rise" : "bulb", ballad ? 0.45 : 0.7, 1, "corte", 0],
      pesado: [ballad ? "bloom" : n % 3 === 2 ? "flame" : "hit", ballad ? 0.75 : rap ? 0.9 : 0.86, ballad ? 0.85 : 0.95, "corte", 0],
      brillo: [ballad ? ["aurora", "bloom"][n % 2] : ["bloom", "disco", "sparkle"][n % 3], 1, 1, "corte", 0],
      suave: [ballad ? ["aurora", "hold"][n % 2] : ["breathe", "hold"][n % 2], 0.35, 0.5, "fundido", 2],
      medio: [ballad ? "breathe" : ["pulse", "duo", "wave"][n % 3], ballad ? 0.5 : 0.72, ballad ? 0.6 : 0.8, "corte", 0],
      final: ["fadeout", 0.6, 0, "decrescendo", 4],
    }[s.k];
    const minBajo = ballad ? 4 : { pesado: 2.4, brillo: 2.5, medio: 3 }[s.k] ?? 99, gap = ballad ? 2 : 0.45;
    const acentos = [];
    for (const h of f.hits) if (h.t >= s.a + 0.05 && h.t < s.b - 0.05 && h.bajo >= minBajo && (!acentos.length || h.t - acentos.at(-1) >= gap) && acentos.filter((x) => h.t - x < 1).length < 2) acentos.push(h.t);
    const seccion = { pausa: "pausa", intro: "intro", final: "final", subida: "pre-coro", pesado: rap ? "rap" : "verso", brillo: "coro", suave: s.a > dur * 0.3 && s.a < dur * 0.85 ? "puente" : "verso", medio: "verso" }[s.k];
    return {
      inicio: r1(s.a), fin: r1(s.b), seccion,
      evidencia: `graves ×${r1(s.G)}, agudos ×${r1(s.H)}, energía ×${r1(s.E)} y ${r1(s.hps)} golpes por segundo (${s.k})`,
      sigue: s.k === "pesado" ? "golpes de bombo y retumbones de bajo" : s.k === "subida" ? "la subida de tensión hasta el golpe" : s.k === "pausa" ? "el silencio" : "el pulso del compás",
      color, color2, brillo: E[1], brilloFin: E[2], transicion: E[3], transicionSeg: E[4], efecto: E[0],
      cadaTiempos: E[0] === "hold" || E[0] === "blackout" || E[0] === "fadeout" ? 0 : s.k === "suave" ? 4 : s.k === "medio" ? 2 : 1,
      destellosPorSeg: acentos.length ? Math.min(3, Math.ceil(acentos.length / Math.max(1, s.b - s.a))) : 0,
      acentos, nota: "",
    };
  });
  // Coros: el último brillante después del 70 % es el coro final; el segundo, coro 2.
  const choruses = tramos.filter((t) => t.seccion === "coro");
  choruses.forEach((t, i) => { if (i === 1) t.seccion = "coro 2"; });
  const lastC = [...choruses].reverse().find((t) => t.inicio > dur * 0.7);
  if (lastC) lastC.seccion = "coro final";

  const paleta = [...new Set(tramos.flatMap((t) => [t.color, t.color2]).filter((c) => c && c !== "#000000"))].map((hex) => ({ nombre: hex, hex, de: "paleta del MV y preferencia de la usuaria" }));
  return {
    formato: 1, song: song.id, yt: song.yt, duracion: dur, bpm: f.bpm, primerTiempo: f.primerTiempo,
    verificacion: {
      audio: "Escuchado completo desde el reproductor oficial (graves, agudos y golpes medidos cada ~23 ms, sin grabar audio); tempo por autocorrelación; fronteras por cambios de energía; acentos en golpes de bajo reales.",
      imagen: video ? "Colores del análisis cuadro a cuadro del MV en cada momento, con preferencia por blanco, amarillo, naranja, rojo y morado." : "Sin análisis del MV: paleta de preferencia de la usuaria.",
      confianza: "media",
      dudas: ["Los nombres de sección se deducen del sonido (no de la letra)."],
    },
    paleta, tramos,
  };
}
