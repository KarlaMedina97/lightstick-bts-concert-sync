// Colores del propio video: YouTube publica la portada y tres cuadros del video (al 25 %, 50 % y 75 %) en
// i.ytimg.com con CORS abierto. Se leen en un canvas diminuto (no se guarda la imagen, solo 3 colores por cuadro)
// y se convierten en colores vivos que un ARMY Bomb puede mostrar. Así cada canción brilla con la estética de su MV.
// Se guarda en el dispositivo por id de video para no repetir el cálculo.

const KEY = "pws.vpal.";
const W = 32, H = 18;
const FRAMES = ["mqdefault", "1", "2", "3"]; // portada, 25 %, 50 %, 75 %

function rgbToHsv([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : max === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
  return [h, max ? d / max : 0, max];
}
function hsvToRgb(h, s, v) {
  const f = (n) => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [f(5) * 255, f(3) * 255, f(1) * 255].map(Math.round);
}
const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;

/**
 * Colores dominantes y "pintables" de una imagen (RGBA): agrupa por tono (12 grupos), pesa por saturación y brillo,
 * descarta grises, negros y blancos. Devuelve hasta `k` colores vivos ordenados por peso.
 * @param {Uint8ClampedArray} data
 */
export function dominantColors(data, k = 3) {
  const buckets = Array.from({ length: 12 }, () => ({ w: 0, h: 0, s: 0, v: 0 }));
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, v] = rgbToHsv([data[i], data[i + 1], data[i + 2]]);
    if (s < 0.22 || v < 0.18) continue; // grises y sombras: no son "el color" del video
    // Tonos de piel (naranja poco saturado): en un MV casi siempre hay caras; pesan poco frente al vestuario y la escena.
    const skin = h > 0.02 && h < 0.12 && s < 0.62 && v > 0.3;
    const w = s * s * v * (skin ? 0.12 : 1);
    const b = buckets[Math.floor(h * 12) % 12];
    // Promedio circular simple del tono dentro del grupo.
    b.w += w; b.h += h * w; b.s += s * w; b.v += v * w;
  }
  const total = buckets.reduce((a, b) => a + b.w, 0);
  // Cuadro con poco color real (oscuro, en blanco y negro o casi todo piel): no se inventan colores;
  // se usa otro cuadro o la paleta curada de la canción o del álbum.
  if (total / (data.length / 4) < 0.03) return [];
  return buckets
    .filter((b) => b.w / total > 0.06)
    .sort((a, b) => b.w - a.w)
    .slice(0, k)
    // Para luz: saturación y brillo altos (un LED con color "apagado" se ve gris o blanco).
    .map((b) => hex(hsvToRgb(b.h / b.w, Math.max(0.6, Math.min(1, (b.s / b.w) * 1.15)), 1)));
}

function load(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** @returns {Promise<{overall:string[], frames:string[][]}|null>} */
export async function videoPalette(yt) {
  if (!yt || typeof document === "undefined") return null;
  try {
    const cached = JSON.parse(localStorage.getItem(KEY + yt) || "null");
    if (cached?.overall) return cached;
  } catch {}
  try {
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const sets = [];
    for (const f of FRAMES) {
      try {
        const img = await load(`https://i.ytimg.com/vi/${yt}/${f}.jpg`);
        ctx.drawImage(img, 0, 0, W, H);
        sets.push(dominantColors(ctx.getImageData(0, 0, W, H).data));
      } catch { sets.push([]); }
    }
    const [overall, ...frames] = sets;
    if (!overall.length && frames.every((f) => !f.length)) return null;
    const base = overall.length ? overall : frames.find((f) => f.length);
    const res = { overall: base, frames: frames.map((f) => (f.length ? f : base)) };
    try { localStorage.setItem(KEY + yt, JSON.stringify(res)); } catch {}
    return res;
  } catch {
    return null;
  }
}
