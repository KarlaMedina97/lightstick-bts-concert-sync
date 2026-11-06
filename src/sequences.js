// Luces editadas por la persona (editor de luces): por canción, una lista de secciones con su parte de la
// canción, estilo, hasta 3 colores e intensidad. Se guardan en este dispositivo y se pueden exportar o importar
// como archivo. El generador (src/patterns.js) las usa en lugar de la estructura automática: así heredan las
// combinaciones, la intensidad continua y, sobre todo, el límite de destellos del modo seguro.

const KEY = "pws.seq.v1";
export const MAX_SEGMENTS = 80;
export const MIN_SEGMENT_S = 1; // una sección de menos de 1 s no se ve como sección, sino como destello
export const PARTS = ["intro", "verso", "pre-coro", "coro", "puente", "final"];
const HEX = /^#[0-9a-f]{6}$/i;
const ID = /^[a-z0-9-]{1,80}$/;

/**
 * Valida y normaliza una secuencia (también las importadas de un archivo: nunca se confía en su contenido).
 * @param {any} raw @param {string[]} styles estilos válidos
 * @returns {{v:1, segments:{start:number, part:string, style:string, colors:string[], lvl:number}[]} | null}
 */
export function sanitizeSequence(raw, styles) {
  const list = Array.isArray(raw?.segments) ? raw.segments.slice(0, MAX_SEGMENTS) : null;
  if (!list?.length) return null;
  const segs = [];
  for (const s of list) {
    const start = Number(s?.start);
    if (!Number.isFinite(start) || start < 0 || start > 6 * 3600) continue;
    const colors = (Array.isArray(s?.colors) ? s.colors : []).filter((c) => typeof c === "string" && HEX.test(c)).slice(0, 3).map((c) => c.toLowerCase());
    if (!colors.length) continue;
    segs.push({
      start: Math.round(start * 10) / 10,
      part: PARTS.includes(s?.part) ? s.part : "verso",
      style: styles.includes(s?.style) ? s.style : "breathe",
      colors,
      lvl: Math.min(1, Math.max(0.1, Number.isFinite(Number(s?.lvl)) ? Number(s.lvl) : 0.6)),
    });
  }
  segs.sort((a, b) => a.start - b.start);
  // Sin secciones demasiado cortas: si dos empiezan casi juntas, queda la segunda (la más reciente al editar).
  const out = [];
  for (const s of segs) {
    if (out.length && s.start - out[out.length - 1].start < MIN_SEGMENT_S) out[out.length - 1] = s;
    else out.push(s);
  }
  if (!out.length) return null;
  out[0].start = 0;
  return { v: 1, segments: out };
}

function readAll() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch { return {}; }
}

export const sequences = {
  get(songId, styles) {
    if (!ID.test(songId ?? "")) return null;
    const raw = readAll()[songId];
    return raw ? sanitizeSequence(raw, styles) : null;
  },
  set(songId, seq) {
    if (!ID.test(songId ?? "")) return;
    const all = readAll();
    all[songId] = { ...seq, updatedAt: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {}
  },
  remove(songId) {
    const all = readAll();
    delete all[songId];
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {}
  },
  has(songId) { return Boolean(readAll()[songId]); },
};

/** Archivo para compartir: incluye la canción y el video para que quien lo importe sepa de qué es. */
export function exportSequence(seq, song) {
  return JSON.stringify({ app: "lumiparty", kind: "luces", v: 1, song: song.id, title: song.title, yt: song.yt, segments: seq.segments }, null, 2);
}
