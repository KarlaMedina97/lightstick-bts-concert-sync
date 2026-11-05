// Sugerencias de canciones: estantes de bienvenida y "A continuación".
// Funciones puras sobre la cola ({album, song}[]) para poder probarlas sin navegador.

/** Éxitos con video oficial para empezar (IDs de src/catalog.js). */
export const STARTERS = ["swim", "dynamite", "butter", "spring-day", "bwl", "ptd", "life-goes-on", "yet-to-come"];
export const MEMBERS = ["RM", "Jin", "SUGA", "j-hope", "Jimin", "V", "Jung Kook"];

const VARIANT = /\b(dance practice|choreography|japanese ver|remix|comeback trailer|performance video|b-side)\b/i;
const artistOf = (item) => item.album.artist ?? "BTS";
const isPlain = (item) => item.album.id !== "mine" && item.song.kind !== "concert" && !VARIANT.test(item.song.title);
const baseTitle = (t) => t.replace(/\s*\(.*?\)\s*/g, "").trim().toLowerCase();

/** Quita repetidos por título base (p. ej. "Dynamite" y "Dynamite (B-side)"). */
function uniqueByTitle(indices, queue) {
  const seen = new Set();
  return indices.filter((i) => {
    const k = baseTitle(queue[i].song.title);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Estantes para la pantalla de inicio.
 * @param {{album:any, song:any}[]} queue
 * @param {{likes?: string[], recent?: string[], max?: number}} [opts]
 * @returns {{id:string, items:number[]}[]} índices de la cola por estante
 */
export function shelves(queue, { likes = [], recent = [], max = 8 } = {}) {
  const byId = new Map(queue.map((q, i) => [q.song.id, i]));
  const out = [];

  const back = [...recent].reverse().map((id) => byId.get(id)).filter((i) => i !== undefined);
  if (back.length) out.push({ id: "recent", items: back.slice(0, max) });

  const liked = likes.map((id) => byId.get(id)).filter((i) => i !== undefined).reverse();
  if (liked.length) out.push({ id: "likes", items: liked.slice(0, max) });

  out.push({ id: "start", items: STARTERS.map((id) => byId.get(id)).filter((i) => i !== undefined) });

  const lyric = queue.map((q, i) => (q.song.lyricVideo ? i : -1)).filter((i) => i >= 0);
  if (lyric.length) out.push({ id: "lyrics", items: lyric.slice(0, max) });

  // Solistas: la canción principal del álbum más reciente de cada integrante.
  const solo = [];
  for (const m of MEMBERS) {
    let pick = -1, year = -Infinity;
    queue.forEach((q, i) => {
      if (artistOf(q) !== m || !isPlain(q)) return;
      const y = Number(q.album.year) || 0;
      if (y > year) { year = y; pick = i; }
    });
    if (pick >= 0) solo.push(pick);
  }
  if (solo.length) out.push({ id: "solo", items: solo });

  // Para el ARMY Bomb: canciones de baile rápidas (se ven mejor en la lightstick).
  const hype = queue
    .map((q, i) => [q, i])
    .filter(([q]) => isPlain(q) && q.song.energy === "high" && (q.song.bpm ?? 0) >= 110)
    .sort((a, b) => (b[0].song.bpm ?? 0) - (a[0].song.bpm ?? 0))
    .map(([, i]) => i);
  out.push({ id: "hype", items: uniqueByTitle(hype, queue).slice(0, max) });

  return out.filter((s) => s.items.length);
}

/**
 * "A continuación": candidatos después de la canción actual.
 * Prioridad: Me gusta → mismo álbum → mismo artista → energía y tempo parecidos. Salta lo ya escuchado.
 * @param {{album:any, song:any}[]} queue
 * @param {number} current índice actual
 * @param {{played?: Iterable<string>, likes?: Iterable<string>, exclude?: number[], n?: number}} [opts]
 * @returns {number[]}
 */
export function upNext(queue, current, { played = [], likes = [], exclude = [], n = 4 } = {}) {
  const cur = queue[current];
  if (!cur) return [];
  const playedSet = new Set(played);
  const likeSet = new Set(likes);
  const skip = new Set([current, ...exclude]);
  const curBase = baseTitle(cur.song.title);
  const scored = [];
  queue.forEach((q, i) => {
    if (skip.has(i) || playedSet.has(q.song.id) || !isPlain(q) || baseTitle(q.song.title) === curBase) return;
    let score = 0;
    if (likeSet.has(q.song.id)) score += 8;
    if (q.album.id === cur.album.id) score += 4;
    if (artistOf(q) === artistOf(cur)) score += 2;
    if (q.song.energy === cur.song.energy) score += 1;
    if (Math.abs((q.song.bpm ?? 0) - (cur.song.bpm ?? 0)) <= 10) score += 0.5;
    if (score <= 0) return;
    // Desempate: lo que viene después en la cola, luego lo más cercano.
    const dist = (i - current + queue.length) % queue.length;
    scored.push([score, dist, i]);
  });
  scored.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  return uniqueByTitle(scored.map((s) => s[2]), queue).slice(0, n);
}

/**
 * "Mis álbumes": los guardados; si no hay, los que tienen canciones con Me gusta (más recientes primero).
 * @param {{album:any, song:any}[]} queue
 * @param {{saved?: string[], likes?: string[]}} [opts]
 * @returns {{ids: string[], derived: boolean}}
 */
export function myAlbums(queue, { saved = [], likes = [] } = {}) {
  const exists = new Set(queue.map((q) => q.album.id));
  const ids = [...saved].reverse().filter((id) => exists.has(id) && id !== "mine");
  if (ids.length) return { ids: [...new Set(ids)], derived: false };
  const byId = new Map(queue.map((q) => [q.song.id, q.album.id]));
  const fromLikes = [...likes].reverse().map((id) => byId.get(id)).filter((id) => id && id !== "mine");
  return { ids: [...new Set(fromLikes)], derived: fromLikes.length > 0 };
}
