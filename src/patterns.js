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
  flame: { label: "Llamas", description: "Rojo y naranja que tiemblan como fuego, sin destellos bruscos." },
  disco: { label: "Disco", description: "Cambia de color de la paleta cada 2 tiempos." },
  split: { label: "Secciones", description: "Cada ARMY Bomb toma un color y la asignación rota, como las zonas del estadio." },
  aurora: { label: "Aurora", description: "Colores que se deslizan sin pausas y un brillo que respira con ondas que nunca se repiten igual." },
  rise: { label: "Subida", description: "La luz va creciendo hacia el coro, cada vez más brillante y viva." },
  bloom: { label: "Florecer", description: "En cada compás la luz se abre y se apaga despacio, con destellos suaves." },
  hit: { label: "Golpes", description: "Oscuro entre golpes y una explosión de luz en cada golpe fuerte, como en el concierto." },
  sparkle: { label: "Chispas", description: "Base tenue con chispas breves, como estrellas (máximo 2 por segundo en modo seguro)." },
  borahae: { label: "Océano Borahae", description: "Cierre de concierto: todo el público en morado que respira despacio, con olas lentas, hasta apagarse." },
  duo: { label: "Dúo", description: "Dos colores de la canción se reparten las ARMY Bomb y se intercambian en cada compás; con una sola, va y viene entre los dos." },
};

// Looks por canción (docs/patrones-luces.md). Casi todo es PROPUESTA CREATIVA: no hay fuentes públicas del color
// del ARMY Bomb canción por canción. Confirmado solo el morado de base y de cierre; FIRE en rojo es parcial (luces
// del escenario en rojo en Permission to Dance LA, 2021). Las variantes (prácticas, presentaciones, remixes)
// heredan el look por prefijo del id: "butter-fallon" usa "butter".
// plan: 9 estilos en el orden de STRUCTURE (intro, verso, pre-coro, coro, verso 2, coro 2, puente, coro final, final).
const H = "high", B = "ballad";
const BALLAD_PLAN = ["breathe", "breathe", "ocean", "breathe", "breathe", "breathe", "ocean", "breathe", "fadeout"];
export const SONG_LOOKS = {
  // FIRE: el estadio entero en rojo (PTD LA 2021, Las Vegas 2022: los ARMY Bomb pasan de blanco a rojo al empezar).
  // Apertura en blanco tenue → rojo de golpe, y apagón (brasa) justo antes de cada coro.
  fire: { lock: true, explode: true, intro: "#ffffff", drop: true, palette: ["#ff1a00", "#ffd000", "#ffffff"], plan: ["breathe", "flame", "hit", "hit", "flame", "hit", "flame", "hit", "fadeout"], source: "confirmado (prensa: isplus, Las Vegas Weekly)" },
  dynamite: { source: "propuesta", rainbow: true, palette: ["#ff4fa3", "#ffd23f", "#3ec1ff", "#7cff6b"], plan: ["breathe", "disco", "wave", "disco", "disco", "pulse", "wave", "rainbow", "fadeout"] },
  butter: { palette: ["#ffd400", "#ffe680", "#ffffff"], plan: ["breathe", "pulse", "breathe", "pulse", "pulse", "pulse", "breathe", "pulse", "fadeout"], source: "propuesta" },
  // PTD fue el bis de la gira: en vez de arcoíris al final, ola con todos los colores que termina en el océano morado.
  ptd: { rainbow: true, finale: "borahae", palette: ["#ff5a5a", "#ffd23f", "#4fd1ff", "#9b6bff"], plan: ["breathe", "wave", "wave", "rainbow", "wave", "rainbow", "ocean", "wave", "fadeout"], source: "propuesta" },
  "mic-drop": { explode: true, palette: ["#ffffff", "#ff2d2d", "#3a3a3a"], plan: ["breathe", "hit", "hit", "hit", "pulse", "hit", "breathe", "hit", "fadeout"] },
  idol: { palette: ["#ff2e88", "#00c2a8", "#ffb300"], plan: ["breathe", "wave", "pulse", "disco", "wave", "disco", "split", "rainbow", "fadeout"] },
  // Spring Day y Yet To Come cerraron Busan 2022: terminan en el océano Borahae (morado largo antes de apagarse).
  "spring-day": { palette: ["#bfe3ff", "#ffffff", "#9fb8ff"], plan: BALLAD_PLAN, oceanColor: "#9fc4ff", finale: "borahae" },
  "yet-to-come": { palette: ["#8a2be2", "#ffe9b0"], plan: ["breathe", "ocean", "ocean", "wave", "ocean", "wave", "ocean", "ocean", "fadeout"], finale: "borahae", source: "parcial (cierre de Busan 2022)" },
  // Danger (2014): rap y coro gritado con mucha fuerza; rojo, blanco y rojo claro (el negro del álbum es "sin luz").
  danger: {
    rap: true, palette: ["#ff1a1a", "#ffffff", "#ff5252"],
    plan: ["pulse", "hit", "pulse", "hit", "hit", "hit", "pulse", "hit", "fadeout"],
    curve: [0.75, 0.92, 0.85, 0.97, 0.92, 0.98, 0.85, 1, 0.6],
  },
  dna: { palette: ["#00b2ff", "#ff4fd8", "#ffffff"], plan: ["breathe", "wave", "pulse", "pulse", "wave", "pulse", "wave", "rainbow", "fadeout"] },
  "fake-love": { palette: ["#b0002a", "#5a1a6a", "#ffffff"], plan: ["breathe", "breathe", "pulse", "pulse", "breathe", "pulse", "breathe", "pulse", "fadeout"] },
  bst: { palette: ["#8a1240", "#c9a227", "#ffffff"], plan: ["breathe", "breathe", "wave", "pulse", "breathe", "pulse", "breathe", "pulse", "fadeout"] },
  "not-today": { explode: true, palette: ["#ffffff", "#e53935", "#5a5a5a"], plan: ["breathe", "hit", "pulse", "hit", "pulse", "hit", "breathe", "hit", "fadeout"] },
  dope: { palette: ["#ffffff", "#ff1744"] },
  run: { palette: ["#ff9a3c", "#ffd27a"] },
  "save-me": { palette: ["#00e5ff", "#ff5ab4"] },
  "i-need-u": { palette: ["#c62828", "#ff8a65"], plan: ["breathe", "breathe", "ocean", "pulse", "breathe", "pulse", "breathe", "pulse", "fadeout"], oceanColor: "#c62828" },
  "epilogue-young-forever": { palette: ["#ffffff", "#ffd6e8", "#8a2be2"], energy: B, finale: "borahae" },
  "make-it-right": { palette: ["#ffd6e8", "#ffffff", "#b388ff"], finale: "borahae", source: "propuesta (canción de cierre)" },
  // Euphoria (Jung Kook, 2018): soñadora y luminosa. Luz que fluye (aurora), un pre-coro que sube y coros que
  // florecen por compás; nada de golpes en cada tiempo. Celeste, rosa, lavanda y durazno del MV.
  euphoria: {
    organic: true, crossfade: 2.2, palette: ["#7ad7ff", "#ffb3e6", "#c9a6ff", "#ffc49a"],
    plan: ["aurora", "aurora", "rise", "bloom", "aurora", "bloom", "aurora", "bloom", "fadeout"],
    curve: [0.5, 0.68, 0.78, 0.95, 0.7, 0.97, 0.6, 1, 0.45],
  },
  bwl: { palette: ["#ff8ccf", "#ffffff", "#ffd1e8"], plan: ["breathe", "wave", "pulse", "pulse", "wave", "pulse", "wave", "rainbow", "fadeout"] },
  on: { palette: ["#d9c7a0", "#8a6a3a", "#ffffff"], plan: ["breathe", "pulse", "pulse", "pulse", "pulse", "pulse", "split", "pulse", "fadeout"] },
  "black-swan": { palette: ["#ffffff", "#8c8c8c", "#b3a5ff"], plan: BALLAD_PLAN, oceanColor: "#b3a5ff" },
  "life-goes-on": { palette: ["#ffe0b3", "#ffffff"], plan: BALLAD_PLAN, oceanColor: "#ffd39a" },
  "film-out": { palette: ["#9ec9ff", "#ffffff"], plan: BALLAD_PLAN, oceanColor: "#9ec9ff" },
  "my-universe": { palette: ["#3a2fd0", "#ff6ad5", "#ffffff"], plan: ["breathe", "sparkle", "wave", "wave", "sparkle", "wave", "ocean", "rainbow", "fadeout"] },
  "the-astronaut": { palette: ["#2a4ab8", "#ffffff", "#8fd3ff"], plan: ["breathe", "sparkle", "ocean", "wave", "sparkle", "wave", "ocean", "wave", "fadeout"] },
  daechwita: { explode: true, palette: ["#c9a227", "#a00000", "#ffffff"], plan: ["breathe", "hit", "pulse", "hit", "pulse", "hit", "flame", "hit", "fadeout"] },
  seven: { plan: ["breathe", "wave", "pulse", "disco", "wave", "disco", "breathe", "rainbow", "fadeout"] },
  // Era ARIRANG (2026): rojo como base (sin verificar: solo un resumen de prensa de la apertura en Goyang).
  // Hooligan abrió ARIRANG en Goyang 2026: ARMY Bomb rojos, llamas y bengala roja (Nocut). Apertura blanca → rojo.
  hooligan: {
    palette: ["#c8102e", "#ffffff", "#ff5a5a"], energy: H, intro: "#ffffff", drop: true,
    plan: ["breathe", "flame", "rise", "hit", "pulse", "hit", "duo", "hit", "fadeout"], source: "confirmado (prensa: Nocut, Goyang 2026)",
  },
  // Dionysus abrió Love Yourself: Speak Yourself (Rose Bowl 2019): de multicolor a todo el estadio en rojo.
  "dionysus-dance-practice": {
    palette: ["#c8102e", "#ffffff", "#ff5a5a"], energy: H, drop: true,
    plan: ["wave", "hit", "pulse", "hit", "hit", "hit", "flame", "hit", "fadeout"], source: "fans (Rose Bowl 2019)",
  },
  swim: { palette: ["#c8102e", "#ffffff", "#ff8a8a"], source: "sin verificar" },
};
for (const id of ["haegeum", "agust-d"]) SONG_LOOKS[id] = SONG_LOOKS.daechwita;
// Canciones con mucho rap: los versos son momentos intensos, no de bajón.
for (const id of ["boy-in-luv", "no-more-dream", "we-are-bulletproof-pt2"]) SONG_LOOKS[id] ??= { rap: true };
for (const id of ["standing-next-to-you", "3d"]) SONG_LOOKS[id] = SONG_LOOKS.seven;
for (const id of ["two-point-o"]) SONG_LOOKS[id] = SONG_LOOKS.hooligan;
for (const id of ["dionysus-mma-dance-practice", "dionysus-mma-intro-dance-practice"]) SONG_LOOKS[id] = SONG_LOOKS["dionysus-dance-practice"];
for (const id of ["normal"]) SONG_LOOKS[id] = SONG_LOOKS.swim;
for (const id of ["blue-side", "winter-bear", "lights", "epiphany", "singularity", "serendipity", "abyss", "forever-rain"]) SONG_LOOKS[id] ??= { plan: BALLAD_PLAN };
for (const id of ["dope", "mic-drop", "not-today", "idol", "on", "daechwita", "hooligan", "two-point-o", "fire", "dionysus-dance-practice"]) SONG_LOOKS[id].rap = true;
// Ids que empiezan igual pero son otra canción.
const NOT_VARIANTS = new Set(["run-bts-dance-practice", "run-bts-busan", "on-the-street"]);

/** Look de una canción: el suyo o el de su canción base (por prefijo del id). */
export function lookFor(id = "") {
  if (SONG_LOOKS[id]) return SONG_LOOKS[id];
  if (NOT_VARIANTS.has(id)) return null;
  let best = null;
  for (const key of Object.keys(SONG_LOOKS)) if (id.startsWith(`${key}-`) && (!best || key.length > best.length)) best = key;
  return best ? SONG_LOOKS[best] : null;
}

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

// Intensidad por sección (0–1): marca los momentos suaves, intensos y culminantes. Controla el brillo y la
// velocidad (cada cuántos tiempos late la luz). El coro final es el punto más alto.
const CURVES = {
  high: [0.5, 0.65, 0.8, 0.95, 0.7, 1, 0.55, 1, 0.45],
  mid: [0.45, 0.55, 0.7, 0.9, 0.6, 0.92, 0.5, 1, 0.4],
  ballad: [0.35, 0.45, 0.55, 0.75, 0.5, 0.8, 0.6, 0.9, 0.35],
};
// Qué cuadro del video da color a cada sección: portada → 25 % → 50 % → 75 % del video.
const FRAME_OF = [0, 0, 0, 1, 1, 1, 2, 2, 2];
const FLAME = ["#ff1a00", "#ff6a00"];
const FLOOR_BASE = { high: 0.12, mid: 0.08, ballad: 0.04 };

const PLANS = {
  high: ["breathe", "duo", "rise", "hit", "wave", "hit", "aurora", "hit", "fadeout"],
  mid: ["breathe", "duo", "rise", "pulse", "wave", "bloom", "ocean", "hit", "fadeout"],
  ballad: ["breathe", "aurora", "breathe", "ocean", "aurora", "ocean", "breathe", "bloom", "fadeout"],
};
// Para que dos canciones de la misma energía no se vean idénticas: alternativas por sección (verso, verso 2,
// puente) que se eligen con una semilla estable del id de la canción.
const VARIANTS = {
  high: { 1: ["duo", "wave", "pulse"], 4: ["wave", "duo", "split"], 6: ["aurora", "ocean", "sparkle"] },
  mid: { 1: ["duo", "wave", "breathe"], 4: ["wave", "duo", "aurora"], 6: ["ocean", "aurora", "split"] },
  ballad: { 1: ["aurora", "breathe"], 4: ["aurora", "breathe", "duo"], 6: ["breathe", "ocean"] },
};
/** Número estable (0–2³²) a partir de un texto: la misma canción siempre recibe las mismas luces. */
function seedOf(text = "") {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Tono (0–1) y saturación de un color. */
function hueSat([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return [0, 0];
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : max === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
  return [h, d / max];
}
/**
 * Filtra colores del video que no van con el concepto de la canción: solo quedan los que están a menos de 35°
 * de tono de algún color de su paleta curada (el blanco del concepto no deja pasar colores nuevos).
 * En FIRE, por ejemplo, un fucsia del video nunca llega al ARMY Bomb.
 */
export function onConcept(videoHex, conceptHex) {
  const concept = conceptHex.map((h) => hueSat(hexToRgb(h))).filter(([, sat]) => sat > 0.25).map(([h]) => h);
  if (!concept.length) return videoHex;
  return videoHex.filter((v) => {
    const [h, sat] = hueSat(hexToRgb(v));
    if (sat < 0.25) return true;
    return concept.some((c) => Math.min(Math.abs(h - c), 1 - Math.abs(h - c)) * 360 <= 35);
  });
}

/**
 * Color que un ARMY Bomb puede mostrar: los oscuros saturados se llevan a brillo pleno con el mismo tono
 * (azul marino → azul) y los grises o negros se descartan (en un LED son "apagado", no un color).
 */
export function lightable(hex) {
  const c = hexToRgb(hex);
  const mx = Math.max(...c);
  if (mx >= 140) return c;
  const [, sat] = hueSat(c);
  if (sat < 0.3 || mx < 12) return null;
  return c.map((v) => (v * 255) / mx);
}

export function hexToRgb(hex) {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
/** Recorre la paleta de ida y vuelta (A→B→C→B→A…): nunca cierra el círculo pasando por colores ajenos. */
function pingPong(colors, pos) {
  const n = colors.length;
  if (n < 2) return colors[0];
  const span = 2 * (n - 1);
  const q = ((pos % span) + span) % span;
  const x = q <= n - 1 ? q : span - q;
  const a = Math.min(n - 2, Math.floor(x)), f = x - a;
  return mixVivid(colors[a], colors[a + 1], f * f * (3 - 2 * f));
}
/** Mezcla por el círculo de colores (no en línea recta en RGB): los intermedios siguen vivos, no grises. */
function mixVivid(a, b, k) {
  const hsv = ([r, g, bl]) => {
    const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn;
    let h = 0;
    if (d) h = mx === r ? ((g - bl) / d + (g < bl ? 6 : 0)) / 6 : mx === g ? ((bl - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
    return [h, mx ? d / mx : 0, mx / 255];
  };
  const [h1, s1, v1] = hsv(a), [h2, s2, v2] = hsv(b);
  if (s1 < 0.08 || s2 < 0.08) return mix(a, b, k); // con blanco o gris, la mezcla normal ya va bien
  let dh = h2 - h1;
  if (dh > 0.5) dh -= 1; else if (dh < -0.5) dh += 1;
  return hsvToRgb((((h1 + dh * k) % 1) + 1) % 1, s1 + (s2 - s1) * k, v1 + (v2 - v1) * k);
}
const scale = (c, k) => c.map((v) => v * k);
/**
 * Paletas de un solo tono (rojo y blanco, beige y café, lavanda y gris) dejan las combinaciones sin con qué jugar:
 * se les suma un color compañero análogo (a 26–35°, dentro de lo que el filtro del concepto acepta). Los rojos van
 * hacia el naranja (fuego), los amarillos hacia el naranja dorado (nunca al lima) y los demás, hacia el violeta.
 */
export function withCompanion(cols) {
  const hs = cols.map(hueSat).filter(([, sat]) => sat > 0.3).map(([h]) => h);
  if (!hs.length) return cols; // solo blancos: el morado de base ya acompaña
  const apart = (a, b) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b)) * 360;
  if (hs.some((h) => apart(h, hs[0]) >= 30)) return cols;
  const deg = hs[0] * 360;
  let to;
  if (deg >= 38 && deg < 70) to = deg - 26; // amarillo/ámbar → naranja dorado (hacia el verde se vería lima)
  else if (deg < 38 || deg > 330) to = deg + 30; // rojo → naranja fuego
  else if (Math.abs(275 - deg) < 12) to = 310; // ya es violeta: hacia el rosa
  else to = deg + Math.sign(275 - deg) * Math.min(35, Math.abs(275 - deg));
  return [...cols, hsvToRgb((((to / 360) % 1) + 1) % 1, 0.85, 1)];
}
const clamp01 = (x) => Math.min(1, Math.max(0, x));

function hsvToRgb(h, s, v) {
  const f = (n) => {
    const k = (n + h * 6) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5) * 255, f(3) * 255, f(1) * 255];
}

/**
 * Colores que mostrará el ARMY Bomb en una canción, con la misma lógica que el patrón: la paleta del look (o del
 * álbum), llevada a colores que un LED puede mostrar, con el compañero de las paletas de un solo tono y la paleta
 * bloqueada de FIRE. Sin repetidos casi iguales; como mucho 4. Para mostrarlos en las carátulas.
 * @returns {string[]} hex
 */
export function lightColors(song, album) {
  const look = lookFor(song.id);
  const src = (look?.palette ?? album?.palette ?? []).map(lightable).filter(Boolean);
  const cols = src.length ? (look?.lock ? src : withCompanion(src)) : [hexToRgb("#b388ff")];
  const out = [];
  for (const c of cols) if (!out.some((o) => Math.hypot(o[0] - c[0], o[1] - c[1], o[2] - c[2]) < 48)) out.push(c);
  return out.slice(0, 4).map(rgbToHex);
}

/**
 * @param {{bpm:number, energy:"high"|"mid"|"ballad"}} song
 * @param {{palette:string[]}} album
 * @param {number} duration segundos
 * @param {{styleOverride?:string|null, safeMode?:boolean}} opts
 */
export function generatePattern(song, album, duration, opts = {}) {
  const look = lookFor(song.id);
  const energy = look?.energy ?? song.energy;
  const seed = seedOf(song.id ?? song.title ?? "");
  const plan = look?.plan ?? (PLANS[energy] ?? PLANS.mid).map((st, i) => {
    const alt = VARIANTS[energy]?.[i];
    return alt ? alt[(seed >>> (i * 3)) % alt.length] : st;
  });
  let curve = look?.curve ?? CURVES[energy] ?? CURVES.mid;
  // Rap: los versos (y el puente) suben; ahí está la fuerza de la canción.
  // (0,78 y no más: si los versos casi igualan al coro, el coro ya no se siente; la intensidad continua suma el resto).
  if (look?.rap && !look?.curve) curve = curve.map((v, i) => ([1, 4, 6].includes(i) ? Math.max(v, 0.78) : v));
  // Colores: los del propio video (opts.video, de src/videopalette.js) si existen; si no, el look o el álbum.
  // Un look con lock (FIRE) conserva su paleta curada.
  let vid = opts.video?.overall?.length && !look?.lock ? opts.video : null;
  if (vid && look?.palette) {
    const keep = (list) => onConcept(list ?? [], look.palette);
    const overall = keep(vid.overall);
    vid = overall.length ? { overall, frames: (vid.frames ?? []).map((f) => { const k = keep(f); return k.length ? k : overall; }) } : null;
  }
  const source = (vid?.overall ?? look?.palette ?? album.palette).map(lightable).filter(Boolean);
  const palette = [hexToRgb(PURPLE), ...(source.length ? (look?.lock ? source : withCompanion(source)) : [hexToRgb("#b388ff")])];
  const framePal = vid?.frames?.map((f) => { const c = (f?.length ? f : vid.overall).map(lightable).filter(Boolean); return c.length ? c : palette.slice(1); }) ?? null;
  const oceanRgb = look?.oceanColor ? hexToRgb(look.oceanColor) : null;
  const flamePal = (look?.palette ?? FLAME).slice(0, 2).map(hexToRgb);
  if (look?.explode && flamePal.length === 2) flamePal[1] = mix(flamePal[0], flamePal[1], 0.45); // brasa: rojo→naranja
  const white = [255, 255, 255];
  const beat = 60 / (song.bpm || 100);
  // Fase: segundo del video donde cae un tiempo (lo marca la persona con "Marcar ritmo"). Sin ella, el compás
  // empezaría en el segundo 0 del video, y casi ningún MV empieza la música justo ahí.
  const phase0 = Number(opts.phase) || 0;
  // WCAG 2.3.1: no más de 3 destellos por segundo en modo seguro.
  // Margen bajo el límite: a 3 Hz exactos, un cambio de sección puede sumar un cuarto destello en el mismo segundo.
  const maxFlashHz = opts.safeMode === false ? 8 : 2.5;
  const beatsPerFlash = Math.max(1, Math.ceil(1 / beat / maxFlashHz));

  // Combinaciones: cada sección tiene un color principal, un acento y un tercero de la paleta de la canción.
  // Si la paleta tiene un solo color, el acento es el morado del ARMY Bomb (siempre combina).
  const concept = palette.slice(1);
  const rot = seed % Math.max(1, concept.length);
  let sections = STRUCTURE.map(([label, a, b], i) => {
    const lvl = curve[i];
    const frame = framePal?.[FRAME_OF[i]];
    // Apertura de concierto: la intro en un color propio (blanco tenue) y en el verso todo cambia de golpe.
    const color = i === 0 && look?.intro && !opts.styleOverride ? hexToRgb(look.intro) : frame ? frame[i % frame.length] : palette[(i % (palette.length - 1)) + 1] ?? palette[0];
    const pool = frame?.length > 1 ? frame : concept;
    const at = (k) => pool[(pool.indexOf(color) + k + (frame ? 0 : rot) + pool.length) % pool.length];
    const accent = pool.length > 1 ? (at(1) === color ? at(2) : at(1)) : palette[0];
    const third = pool.length > 2 ? at(2) : mix(color, [255, 255, 255], 0.45);
    return {
      label,
      start: a * duration,
      end: b * duration,
      style: opts.styleOverride || plan[i],
      color, accent, third,
      lvl,
      gain: 0.4 + 0.6 * lvl, // suave → tenue, culminante → pleno
      // Brillo mínimo que verá el ARMY Bomb en esta sección (tras la curva del LED). Más alto en lo intenso.
      floor: plan[i] === "fadeout" && !opts.styleOverride ? 0 : (look?.explode ? 0.04 : FLOOR_BASE[energy] ?? 0.1) + (look?.explode ? 0.12 : 0.5) * lvl ** 2, // explosiones: brasa tenue entre golpes
      div: lvl >= 0.9 ? 1 : lvl >= 0.65 ? 2 : 4, // late en cada tiempo, cada 2 o cada 4
    };
  });
  // Cierre Borahae: el final ocupa del 88 % al 100 % (≈ 25 s en una canción de 3,5 min) y respira en morado.
  if (look?.finale === "borahae" && !opts.styleOverride) {
    const cut = 0.88 * duration;
    sections[7].end = cut;
    Object.assign(sections[8], { start: cut, style: "borahae", floor: 0 });
  }
  const safe = opts.safeMode !== false;
  // Pseudoaleatorio estable (mismo resultado en cada cuadro) para las chispas.
  const hash = (x) => { const v = Math.sin(x * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

  let ext = null;
  function styleColor(sec, t, i, n) {
    const local = t - sec.start;
    // Compás GLOBAL (desde el inicio del video), no por sección: si el pulso reiniciara en cada sección,
    // al cambiar de una a otra caerían dos golpes casi juntos y se pasaría del límite de destellos.
    const beats = (t - phase0) / beat;
    const phase = n > 1 ? i / n : 0; // desfase por lightstick → efecto ola
    switch (sec.style) {
      case "ocean": {
        const w = Math.sin(2 * Math.PI * (beats / 8 - phase));
        const k = 0.75 + 0.25 * w;
        // Morado con un toque del color del video (o el color propio de la canción, si lo tiene); en la cresta de la
        // ola asoma el acento de la canción, como reflejos en el océano.
        const base = oceanRgb ?? (vid ? mix(palette[0], sec.color, 0.55) : palette[0]);
        return scale(mixVivid(base, sec.accent, 0.3 * Math.max(0, w) ** 2), k);
      }
      case "duo": {
        // Dos colores: mantiene 3 tiempos y funde en el último. Con varias ARMY Bomb, las pares y las impares van
        // opuestas (mitad y mitad del público); en lo intenso entra el tercer color cada 4 compases.
        const bar = beats / 4 + (n > 1 ? (i % 2) : 0);
        const b = Math.floor(bar), x = bar - b;
        const trio = sec.lvl >= 0.85 && ((Math.floor(beats / 16) % 2) + 2) % 2 === 1;
        const A = ((b % 2) + 2) % 2 ? sec.accent : sec.color, Bc = ((b % 2) + 2) % 2 ? (trio ? sec.third : sec.color) : sec.accent;
        const c = mixVivid(A, Bc, clamp01((x - 0.75) / 0.25));
        const bstep = beats / beatsPerFlash, bf = bstep - Math.floor(bstep);
        return scale(c, 0.78 + 0.22 * Math.exp(-bf * 3));
      }
      case "flame": {
        // Dos senos lentos (0,9 y 1,7 Hz) desfasados por lightstick: tiembla sin destellos (nunca baja de 0,6).
        const w = 0.5 + 0.25 * Math.sin(2 * Math.PI * (0.9 * local + phase)) + 0.25 * Math.sin(2 * Math.PI * (1.7 * local + 2 * phase + 0.3));
        const [red, orange] = flamePal;
        return scale(mix(red, orange, clamp01(w)), 0.6 + 0.4 * w);
      }
      case "disco": {
        const colors = palette.slice(1).length ? palette.slice(1) : palette;
        // En el clímax cambia en cada tiempo (si el tempo lo permite en modo seguro); si no, cada 2.
        const per = sec.lvl >= 0.95 && 1 / beat <= maxFlashHz ? 1 : 2;
        const step = Math.floor(beats / per + (n > 1 ? i : 0));
        const frac = beats / per - Math.floor(beats / per);
        const a = colors[step % colors.length], b = colors[(step + 1) % colors.length];
        return mix(a, b, clamp01((frac - 0.92) / 0.08)); // corte casi limpio con un fundido corto
      }
      case "split": {
        const colors = palette.slice(1).length ? palette.slice(1) : palette;
        const rot = Math.floor(beats / 16); // rota cada 4 compases
        const k = 0.85 + 0.15 * Math.sin(2 * Math.PI * (beats / 8));
        return scale(colors[(i + rot) % colors.length], k);
      }
      case "sparkle": {
        // Base tenue; una chispa breve como mucho cada 0,5 s (modo seguro) o cada tiempo.
        const slot = safe ? 0.5 : Math.max(0.12, beat / 2);
        const idx = Math.floor(t / slot);
        const on = hash(idx + i * 17.3) > (sec.lvl >= 0.9 ? 0.4 : 0.6); // más chispas en los momentos intensos
        const frac = t / slot - idx;
        const spark = on ? Math.exp(-frac * 6) : 0;
        return mix(scale(sec.color, 0.3), [255, 255, 255], 0.65 * spark);
      }
      case "breathe": {
        // Respiración: lenta en lo suave (8 tiempos), más viva en lo intenso (4). Al inhalar es el color
        // principal; al exhalar se tiñe del acento (degradado de dos colores, no solo brillo).
        const per = sec.div >= 4 ? 8 : 4;
        const u = 0.5 - 0.5 * Math.cos(2 * Math.PI * (beats / per - phase));
        const breath = Math.floor(beats / per - phase);
        const raw = ((breath % 2) + 2) % 2 ? sec.accent : sec.third; // cada respiración alterna el tinte
        const tint = scale(raw, Math.max(...sec.color) / Math.max(1, ...raw)); // mismo brillo: cambia el tono, no la luz
        return scale(mixVivid(tint, sec.color, 0.35 + 0.65 * u), 0.25 + 0.75 * u);
      }
      case "pulse": {
        // Latido. El primer tiempo del compás pega con el acento y los demás con el principal; en lo culminante
        // los latidos se reparten entre principal y acento, uno y uno.
        const per = Math.max(sec.div, beatsPerFlash);
        const step = beats / per, k = Math.floor(step);
        const frac = step - k;
        const down = per >= 4 || (((Math.round(k * per) % 4) + 4) % 4) === 0;
        const c = sec.lvl >= 0.9 ? (((k % 2) + 2) % 2 ? sec.accent : sec.color) : down ? sec.accent : sec.color;
        return scale(c, 0.3 + 0.7 * Math.exp(-frac * 4));
      }
      case "wave": {
        const stepLen = Math.max(2, sec.div); // cada 2 tiempos en lo intenso, cada 4 en lo suave
        const pos = beats / stepLen + phase * palette.length;
        const idx = Math.floor(pos);
        const frac = pos - idx;
        const a = palette[idx % palette.length];
        const b = palette[(idx + 1) % palette.length];
        // Pulso suave en cada tiempo (no siempre al máximo): la ola acompaña, el coro es el que pega.
        const bstep = beats / beatsPerFlash, bf = bstep - Math.floor(bstep); // respeta el límite del modo seguro
        return scale(mix(a, b, clamp01((frac - 0.7) / 0.3)), 0.68 + 0.24 * Math.exp(-bf * 3)); // mantiene y luego funde
      }
      case "rainbow": {
        // Arcoíris real solo si es el concepto (Dynamite, Permission to Dance); si no, recorre la paleta de la canción.
        if (look?.rainbow || (!look && !vid)) return hsvToRgb((local / (beat * 16) + phase) % 1, 0.9, 1);
        const colors = palette.slice(1).length ? palette.slice(1) : palette;
        const pos = ((local / (beat * 4) + phase * colors.length) % colors.length + colors.length) % colors.length;
        const a = Math.floor(pos);
        return mix(colors[a], colors[(a + 1) % colors.length], pos - a);
      }
      case "aurora": {
        // Gradiente continuo por la paleta (sin mantener ni saltar), con un vaivén lento que lo hace "vivo",
        // y brillo con ondas de periodos que no coinciden: nunca se repite igual, no parece un metrónomo.
        const colors = palette.slice(1).length ? palette.slice(1) : palette;
        const drift = beats / 12 + 0.35 * Math.sin(2 * Math.PI * (t / 23 + phase)) + phase * colors.length * 0.5;
        const k = 0.78 + 0.12 * Math.sin(2 * Math.PI * (beats / 8 - phase)) + 0.07 * Math.sin(2 * Math.PI * (t / 5.3 + 2 * phase)) + 0.04 * Math.sin(2 * Math.PI * t / 2.9);
        return scale(pingPong(colors, drift), k);
      }
      case "rise": {
        // Crece a lo largo de la sección: de 0,55 a pleno, con aurora de fondo cada vez más rápida.
        const colors = palette.slice(1).length ? palette.slice(1) : palette;
        const u = clamp01(local / Math.max(0.1, sec.end - sec.start));
        // Cada vez más rápida, pero nunca menos de 1,5 s por color (sin parpadeos a tempos altos).
        const c = pingPong(colors, local / Math.max(1.5, beat * (8 - 5 * u)) + phase * colors.length);
        return mix(scale(c, 0.55 + 0.45 * u * u), [255, 255, 255], 0.18 * u * u);
      }
      case "bloom": {
        // Por compás (4 tiempos): se abre rápido en el 1 y baja despacio, con un eco suave en el 3.
        // Destellos blancos tenues y escasos (≤ 1/s) encima, como brillos en el aire.
        const colors = palette.slice(1).length ? palette.slice(1) : palette;
        const bar = beats / 4, b = Math.floor(bar), x = (bar - b) * 4;
        const env = 0.62 + 0.38 * Math.exp(-x / 1.7) + 0.12 * Math.exp(-Math.abs(x - 2) * 2.5);
        // El color avanza en el 1 del compás, fundido en medio tiempo (no corte), de ida y vuelta por la paleta.
        const c = pingPong(colors, b - 1 + clamp01(x / 0.5) + Math.round(phase * colors.length));
        // Destellos: como mucho uno por segundo y de subida suave (sin pico brusco).
        const slot = 1.1, idx = Math.floor(t / slot), u2 = (t / slot) - idx;
        const spark = hash(idx + i * 13.7) > 0.6 ? Math.sin(Math.PI * Math.min(1, u2 / 0.45)) : 0;
        return mix(scale(c, Math.min(1, env)), [255, 255, 255], 0.2 * spark);
      }
      case "hit": {
        // Golpes: casi apagado entre golpes (no siempre encendido) y una explosión en cada golpe fuerte.
        // El 1 y el 3 del compás pegan más que el 2 y el 4. Con el sonido del video, el golpe lo da el micrófono.
        let env;
        if (ext?.hit != null) env = ext.hit;
        else {
          const per = Math.max(sec.div >= 4 ? 2 : 1, beatsPerFlash);
          const step = beats / per;
          const k = Math.floor(step);
          const frac = step - k;
          const strong = per >= 2 || ((k % 4) + 4) % 4 === 0 || ((k % 4) + 4) % 4 === 2 ? 1 : 0.7;
          // En lo culminante el golpe tiene más cuerpo (se apaga más lento); en lo suave es un toque corto.
          // Explosiones (FIRE): siempre cortas, con brasa entre golpes.
          env = strong * Math.exp(-frac * (look?.explode ? 6 : 6 - 3 * sec.lvl));
        }
        const ember = scale(look?.explode ? flamePal[0] : sec.color, 0.06);
        // Golpes que se turnan: el 1 del compás con el color principal y el 3 con el acento (combinación).
        const hitColor = look?.explode ? sec.color : ((Math.floor((beats + 0.25) / 2) % 2) + 2) % 2 ? sec.accent : sec.color;
        if (look?.explode) {
          // Explosión: núcleo blanco → amarillo → rojo → brasa (fuego, no colores ajenos).
          const yellow = palette[2] ?? [255, 208, 0], red = palette[1] ?? flamePal[0];
          if (env > 0.75) return mix(yellow, white, (env - 0.75) / 0.25);
          if (env > 0.35) return mix(red, yellow, (env - 0.35) / 0.4);
          return mix(ember, red, env / 0.35);
        }
        return mix(ember, hitColor, env);
      }
      case "flash": {
        const step = Math.floor(beats / beatsPerFlash);
        return step % 2 === 0 ? sec.color : scale(sec.color, 0.08);
      }
      case "borahae": {
        // Océano Borahae: morado que respira en ciclos de 5 s, con olas lentas que recorren las ARMY Bomb (desfase
        // por lightstick), un recuerdo del color de la canción al empezar, y se apaga en el último 30 %.
        const len = Math.max(0.1, sec.end - sec.start), k = clamp01(local / len);
        const breath = 0.7 + 0.3 * Math.sin(2 * Math.PI * (t / 5 - phase * 0.6));
        const fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        const prev = sections[sections.indexOf(sec) - 1]?.color ?? palette[0];
        return scale(mixVivid(palette[0], prev, 0.35 * Math.max(0, 1 - k * 4)), breath * fade);
      }
      case "fadeout": {
        // Cierre "Borahae": del color de la canción al morado, y del morado a apagado.
        const k = clamp01(local / Math.max(0.1, sec.end - sec.start));
        const prevColor = sections[sections.indexOf(sec) - 1]?.color ?? palette[0];
        return k < 0.35 ? mix(prevColor, palette[0], k / 0.35) : scale(palette[0], 1 - (k - 0.35) / 0.65);
      }
      default:
        return palette[0];
    }
  }

  /**
   * Intensidad de la canción en el segundo t (0–1). No es un número por sección: el pre-coro se construye y
   * toma aire justo antes del coro, el coro entra con impacto, cada frase de 8 compases remata al final, el
   * puente baja y vuelve a crecer, y el coro final sigue subiendo. Todo es lento (sin destellos nuevos).
   */
  function energyAt(tt) {
    const k = Math.max(0, sections.findIndex((s) => tt >= s.start && tt < s.end));
    const sec = sections[k], next = sections[k + 1];
    const len = Math.max(0.1, sec.end - sec.start);
    const u = clamp01((tt - sec.start) / len);
    const bars = (tt - phase0) / beat / 4;
    const inPhrase = ((bars % 8) + 8) % 8; // 0–8 compases
    const fill = inPhrase >= 7 ? inPhrase - 7 : 0; // último compás de la frase
    let e = sec.lvl;
    switch (sec.label) {
      case "intro": e *= 0.85 + 0.15 * u; break; // arranca un poco más bajo y crece (sin verse apagado)
      case "pre-coro": {
        e += ((next?.lvl ?? e) - e) * 0.85 * u * u; // se construye hacia el coro
        const left = (sec.end - tt) / beat;
        if (look?.drop && left < 1) e = 0.06; // apagón de concierto (brasa, no negro): 1 tiempo antes del coro
        else if (left < Math.min(2, (len / beat) * 0.2)) e = Math.min(e, sec.lvl * 0.78); // respiro antes del golpe
        break;
      }
      case "coro": case "coro 2": case "coro final": {
        e += 0.1 * Math.exp(-((tt - sec.start) / beat) / 2); // impacto de entrada
        e += 0.06 * fill;
        if (sec.label === "coro final") e += 0.07 * u; // (al tope de brillo, lo que sigue creciendo es la cresta blanca)
        break;
      }
      case "puente": e *= 0.78 + 0.34 * u * u; break; // baja y vuelve a crecer
      case "verso": case "verso 2": e += -0.05 * Math.sin(Math.PI * u) + 0.04 * fill; break;
      default: break;
    }
    return clamp01(e);
  }

  const CROSSFADE = look?.crossfade ?? 0.6;
  function colorAt(t, i = 0, n = 1, external = null) {
    ext = external;
    if (!(duration > 0)) return palette[0];
    const tt = Math.min(Math.max(0, t), duration - 0.001);
    const idx = sections.findIndex((s) => tt >= s.start && tt < s.end);
    const sec = sections[Math.max(0, idx)];
    // Brillo por sección (con mínimo: una sección suave no debe parecer una desconexión) y el "canto": cada frase
    // de 2 compases la luz toma aire (sube en medio tiempo y se apaga despacio), como una voz. Es lento (< 0,5 Hz).
    const x = (((tt - phase0) / beat) % 8 + 8) % 8;
    const sing = look?.organic
      ? 0.9 + 0.1 * Math.sin(2 * Math.PI * (x / 8)) * (0.7 + 0.3 * Math.sin(2 * Math.PI * tt / 31))
      : 0.86 + 0.14 * Math.min(1, x / 0.5) * Math.exp(-x / 5);
    // La intensidad de la canción manda el brillo; en lo culminante, además, cada compás arranca con una cresta
    // blanca breve (≤ 1 por segundo: el 1 del compás), como cuando el estadio entero sube el lightstick.
    const E = energyAt(tt);
    // En el coro final la cresta crece hasta el último compás: el estadio entero sube la luz.
    const lift = sec.label === "coro final" ? 0.6 + 0.8 * clamp01((tt - sec.start) / Math.max(0.1, sec.end - sec.start)) : 1;
    const crest = E > 0.86 && !look?.explode ? Math.min(0.42, ((E - 0.86) / 0.14) * 0.32 * lift) * Math.exp(-(((((tt - phase0) / beat) % 4) + 4) % 4) * 2.2) : 0;
    const withGain = (s, col) => {
      if (s.style === "fadeout" || s.style === "borahae") return col;
      const g = scale(col, (0.4 + 0.6 * E) * sing);
      return crest ? mix(g, scale([255, 255, 255], Math.max(...g) / 255), crest) : g;
    };
    const c = withGain(sec, styleColor(sec, tt, i, n));
    const prev = sections[idx - 1];
    if (prev && tt - sec.start < CROSSFADE) {
      const p = withGain(prev, styleColor(prev, tt, i, n));
      return mix(p, c, (tt - sec.start) / CROSSFADE);
    }
    return c;
  }

  /** Brillo mínimo del LED en el segundo t (lo usa la app al convertir a brillo del ARMY Bomb). */
  function floorAt(t) {
    const s = sections.find((x) => t >= x.start && t < x.end) ?? sections[sections.length - 1];
    if (s.floor === 0 || look?.explode) return s.floor;
    // El piso sigue la intensidad: en el coro que entra o en el remate de frase, la luz no baja tanto.
    return (FLOOR_BASE[energy] ?? 0.1) + 0.5 * energyAt(t) ** 2;
  }

  function sectionAt(t) {
    return sections.find((s) => t >= s.start && t < s.end) ?? sections[sections.length - 1];
  }

  return { sections, colorAt, sectionAt, floorAt, energyAt, beat };
}

/**
 * Brillo que verá el LED: curva perceptiva (γ) por encima de un piso. El piso evita que una parte intensa se vea
 * apagada; la curva hace que lo suave se vea suave de verdad. El tono no cambia.
 * @param {number[]} rgb 0–255 @param {number} floor 0–1 @param {number} gamma
 */
export function ledLevel(rgb, floor = 0.2, gamma = 2) {
  const m = Math.max(...rgb) / 255;
  if (m <= 0.002) return floor > 0 ? rgb : [0, 0, 0];
  const target = floor + (1 - floor) * m ** gamma;
  return rgb.map((v) => Math.min(255, (v / 255 / m) * target * 255));
}

/**
 * Patrón para videos largos (conciertos o presentaciones en vivo): divide el video en bloques del
 * largo de una canción y a cada bloque le da su propia energía y paleta, como un setlist.
 * @param {number} duration segundos
 * @param {{bpm?:number, palettes:string[][], styleOverride?:string|null, safeMode?:boolean}} opts
 */
export function generateConcertPattern(duration, opts) {
  const BLOCK = 210; // ~3.5 min por canción
  const energies = ["high", "high", "mid", "high", "ballad", "mid", "high"];
  const blocks = [];
  for (let start = 0, i = 0; start < duration; start += BLOCK, i++) {
    const len = Math.min(BLOCK, duration - start);
    const p = generatePattern(
      { bpm: opts.bpm || 110, energy: energies[i % energies.length] },
      { palette: opts.palettes[i % opts.palettes.length] },
      len,
      opts,
    );
    blocks.push({ start, len, p, n: i + 1 });
  }
  const blockAt = (t) => blocks[Math.min(blocks.length - 1, Math.max(0, Math.floor(t / BLOCK)))];
  const sections = blocks.flatMap((b) => b.p.sections.map((s) => ({ ...s, start: s.start + b.start, end: s.end + b.start, label: `bloque ${b.n} · ${s.label}` })));
  return {
    sections,
    beat: 60 / (opts.bpm || 110),
    colorAt(t, i = 0, n = 1) {
      const b = blockAt(t);
      return b.p.colorAt(t - b.start, i, n);
    },
    floorAt(t) {
      const b = blockAt(t);
      return b.p.floorAt(t - b.start);
    },
    sectionAt(t) {
      const b = blockAt(t);
      const s = b.p.sectionAt(t - b.start);
      return { ...s, label: `bloque ${b.n} · ${s.label}` };
    },
  };
}
