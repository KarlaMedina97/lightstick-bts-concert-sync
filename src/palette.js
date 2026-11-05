// Paleta dinámica por canción: a partir de los colores del álbum calcula acentos legibles
// (contraste AA sobre las superficies oscuras de la app) para títulos, chips, botones y el brillo del dock.

const SURFACE = "#15122a"; // --surface-solid
const INK = "#120a24"; // texto oscuro sobre acento

export function hexToRgb(hex) {
  const h = String(hex).replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex(rgb) {
  return `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb([h, s, l]) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/** Luminancia relativa WCAG. */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * Lleva un color a un acento legible: saturación moderada y luminosidad suficiente
 * para ≥ 4.5:1 sobre la superficie oscura (y texto oscuro encima ≥ 4.5:1).
 */
export function readableAccent(hex, { minL = 0.66, maxL = 0.84 } = {}) {
  let [h, s, l] = rgbToHsl(hexToRgb(hex));
  s = s < 0.08 ? 0 : Math.min(0.92, Math.max(0.5, s)); // grises quedan grises
  l = Math.min(maxL, Math.max(minL, l));
  let out = rgbToHex(hslToRgb([h, s, l]));
  for (let i = 0; i < 20 && contrast(out, SURFACE) < 4.5; i++) {
    l = Math.min(0.95, l + 0.02);
    out = rgbToHex(hslToRgb([h, s, l]));
  }
  return out;
}

/** Variante para el tema claro: oscura y saturada, ≥ 4.5:1 sobre blanco (y texto blanco encima). */
export function readableAccentOnLight(hex) {
  let [h, s, l] = rgbToHsl(hexToRgb(hex));
  s = s < 0.08 ? 0 : Math.min(0.9, Math.max(0.55, s));
  l = Math.min(0.42, Math.max(0.26, l));
  let out = rgbToHex(hslToRgb([h, s, l]));
  for (let i = 0; i < 20 && contrast(out, "#ffffff") < 4.5; i++) {
    l = Math.max(0.12, l - 0.02);
    out = rgbToHex(hslToRgb([h, s, l]));
  }
  return out;
}

/** Elige el color más "vivo" de la paleta (saturado y no casi negro/blanco). */
export function vividest(palette) {
  let best = palette[0], score = -1;
  for (const c of palette) {
    const [, s, l] = rgbToHsl(hexToRgb(c));
    const sc = s * (1 - Math.abs(l - 0.55) * 1.4);
    if (sc > score) { score = sc; best = c; }
  }
  return best;
}

/**
 * Tokens CSS de la canción actual.
 * @param {string[]} palette colores del álbum
 * @returns {Record<string,string>} propiedades personalizadas listas para style.setProperty
 */
export function songTheme(palette = []) {
  const colors = palette.filter((c) => /^#[0-9a-f]{3,6}$/i.test(c));
  if (!colors.length) return {};
  const main = vividest(colors);
  const other = colors.filter((c) => c !== main);
  const second = other.length ? vividest(other) : main;
  const a1 = readableAccent(main);
  let a2 = readableAccent(second);
  if (a2 === a1 || contrast(a1, a2) < 1.08) a2 = readableAccent(rotate(main, 40));
  const [r, g, b] = hexToRgb(a1);
  return {
    "--song-accent": a1,
    "--song-accent-2": a2,
    "--song-accent-l": readableAccentOnLight(main),
    "--song-accent-l2": readableAccentOnLight(second === main ? rotate(main, 40) : second),
    "--song-ink": INK,
    "--song-soft": `rgba(${r}, ${g}, ${b}, 0.16)`,
    "--song-line": `rgba(${r}, ${g}, ${b}, 0.42)`,
  };
}

function rotate(hex, deg) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb([(h + deg) % 360, Math.max(s, 0.5), l]));
}

export const THEME_SURFACE = SURFACE;
export const THEME_INK = INK;

// ---------- Color en palabras (para lectores de pantalla, docs/accesibilidad-visual.md A-15) ----------
const COLOR_WORDS = {
  es: { white: "blanco", purple: "morado", violet: "violeta", pink: "rosa", red: "rojo", orange: "naranja", gold: "dorado", green: "verde", aqua: "aqua", sky: "celeste", blue: "azul", off: "apagado", dim: "tenue", bright: "intenso" },
  en: { white: "white", purple: "purple", violet: "violet", pink: "pink", red: "red", orange: "orange", gold: "gold", green: "green", aqua: "aqua", sky: "sky blue", blue: "blue", off: "off", dim: "dim", bright: "bright" },
};
/** Nombre corto del color más cercano + intensidad: "rosa intenso", "azul tenue". @param {number[]} rgb */
export function colorName(rgb, lang = "es") {
  const w = COLOR_WORDS[lang] ?? COLOR_WORDS.es;
  const [h, s, l] = rgbToHsl(rgb);
  const max = Math.max(...rgb);
  if (max < 18) return w.off;
  let key;
  if (s < 0.18 || l > 0.9) key = "white";
  else if (h < 12 || h >= 345) key = "red";
  else if (h < 40) key = "orange";
  else if (h < 70) key = "gold";
  else if (h < 160) key = "green";
  else if (h < 190) key = "aqua";
  else if (h < 215) key = "sky";
  else if (h < 250) key = "blue";
  else if (h < 262) key = "violet"; // el morado BTS (#8a2be2, 271°) queda en "morado"
  else if (h < 310) key = "purple";
  else key = "pink";
  const level = max < 110 ? w.dim : max > 200 ? w.bright : "";
  return level ? `${w[key]} ${level}` : w[key];
}
