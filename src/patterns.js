// Generador de patrones de luz inspirados en estilos que se ven en conciertos de K-pop
// (océano morado, olas que recorren el estadio, latidos al ritmo, arcoíris final...).
// No reproduce shows oficiales: crea un patrón propio a partir del BPM, la energía de la
// canción y la paleta del álbum.

export const PURPLE = "#8a2be2";

export const STYLES = {
  ocean: { label: "Océano morado", description: "Morado constante con una ola suave que recorre las lightsticks." },
  breathe: { label: "Respiración", description: "El color sube y baja lentamente, ideal para baladas." },
  pulse: { label: "Latido", description: "Un pulso de brillo en cada tiempo de la canción." },
  wave: { label: "Ola de colores", description: "Los colores del álbum pasan de una lightstick a la siguiente." },
  rainbow: { label: "Arcoíris", description: "Recorre todos los colores, como en los cierres de concierto." },
  flash: { label: "Destellos", description: "Alterna color y apagado al ritmo (limitado en modo seguro)." },
  fadeout: { label: "Despedida", description: "Se desvanece lentamente hasta apagarse." },
};

// Estructura aproximada de una canción pop, en fracciones de la duración.
const STRUCTURE = [
  ["intro", 0.0, 0.08],
  ["verso", 0.08, 0.25],
  ["pre-coro", 0.25, 0.3],
  ["coro", 0.3, 0.43],
  ["verso 2", 0.43, 0.55],
  ["coro 2", 0.55, 0.68],
  ["puente", 0.68, 0.8],
  ["coro final", 0.8, 0.95],
  ["final", 0.95, 1.0],
];

const PLANS = {
  high: ["breathe", "wave", "pulse", "flash", "wave", "pulse", "breathe", "rainbow", "fadeout"],
  mid: ["breathe", "wave", "breathe", "pulse", "wave", "pulse", "ocean", "wave", "fadeout"],
  ballad: ["breathe", "breathe", "ocean", "ocean", "breathe", "ocean", "rainbow", "ocean", "fadeout"],
};

export function hexToRgb(hex) {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const scale = (c, k) => c.map((v) => v * k);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

function hsvToRgb(h, s, v) {
  const f = (n) => {
    const k = (n + h * 6) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5) * 255, f(3) * 255, f(1) * 255];
}

/**
 * @param {{bpm:number, energy:"high"|"mid"|"ballad"}} song
 * @param {{palette:string[]}} album
 * @param {number} duration segundos
 * @param {{styleOverride?:string|null, safeMode?:boolean}} opts
 */
export function generatePattern(song, album, duration, opts = {}) {
  const plan = PLANS[song.energy] ?? PLANS.mid;
  const palette = [PURPLE, ...album.palette].map(hexToRgb);
  const beat = 60 / (song.bpm || 100);
  // WCAG 2.3.1: no más de 3 destellos por segundo en modo seguro.
  const maxFlashHz = opts.safeMode === false ? 8 : 3;
  const beatsPerFlash = Math.max(1, Math.ceil(1 / beat / maxFlashHz));

  const sections = STRUCTURE.map(([label, a, b], i) => ({
    label,
    start: a * duration,
    end: b * duration,
    style: opts.styleOverride || plan[i],
    color: palette[(i % (palette.length - 1)) + 1] ?? palette[0],
  }));

  function styleColor(sec, t, i, n) {
    const local = t - sec.start;
    const beats = local / beat;
    const phase = n > 1 ? i / n : 0; // desfase por lightstick → efecto ola
    switch (sec.style) {
      case "ocean": {
        const k = 0.75 + 0.25 * Math.sin(2 * Math.PI * (local / (beat * 8) - phase));
        return scale(palette[0], k);
      }
      case "breathe": {
        const k = 0.25 + 0.75 * (0.5 - 0.5 * Math.cos(2 * Math.PI * (beats / 4 - phase)));
        return scale(sec.color, k);
      }
      case "pulse": {
        const step = beats / beatsPerFlash;
        const frac = step - Math.floor(step);
        return scale(sec.color, 0.3 + 0.7 * Math.exp(-frac * 4));
      }
      case "wave": {
        const stepLen = 2; // cambia cada 2 tiempos
        const pos = beats / stepLen + phase * palette.length;
        const idx = Math.floor(pos);
        const frac = pos - idx;
        const a = palette[idx % palette.length];
        const b = palette[(idx + 1) % palette.length];
        return mix(a, b, clamp01((frac - 0.7) / 0.3)); // mantiene y luego funde
      }
      case "rainbow": {
        const h = (local / (beat * 16) + phase) % 1;
        return hsvToRgb(h, 0.9, 1);
      }
      case "flash": {
        const step = Math.floor(beats / beatsPerFlash);
        return step % 2 === 0 ? sec.color : scale(sec.color, 0.08);
      }
      case "fadeout": {
        const k = 1 - clamp01(local / Math.max(0.1, sec.end - sec.start));
        return scale(palette[0], k);
      }
      default:
        return palette[0];
    }
  }

  const CROSSFADE = 0.6;
  function colorAt(t, i = 0, n = 1) {
    if (!(duration > 0)) return palette[0];
    const tt = Math.min(Math.max(0, t), duration - 0.001);
    const idx = sections.findIndex((s) => tt >= s.start && tt < s.end);
    const sec = sections[Math.max(0, idx)];
    const c = styleColor(sec, tt, i, n);
    const prev = sections[idx - 1];
    if (prev && tt - sec.start < CROSSFADE) {
      const p = styleColor(prev, tt, i, n);
      return mix(p, c, (tt - sec.start) / CROSSFADE);
    }
    return c;
  }

  function sectionAt(t) {
    return sections.find((s) => t >= s.start && t < s.end) ?? sections[sections.length - 1];
  }

  return { sections, colorAt, sectionAt, beat };
}
