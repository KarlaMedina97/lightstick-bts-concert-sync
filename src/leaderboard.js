// Rankings sin cuentas: solo tu nickname de redes sociales.
// Por defecto se guardan en este dispositivo. Si configuras un backend en config.js (Supabase),
// también se comparten en un ranking global.
import { LEADERBOARD } from "./config.js";

export const NETWORKS = [
  { id: "x", label: "X / Twitter" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "weverse", label: "Weverse" },
  { id: "youtube", label: "YouTube" },
];

const HANDLE_RE = /^[A-Za-z0-9._]{2,30}$/;
const KEY = "pws.scores.v1";
const PROFILE_KEY = "pws.profile.v1";

/** Limpia y valida el nickname. Devuelve null si no es válido. */
export function normalizeHandle(raw) {
  const h = String(raw ?? "").trim().replace(/^@/, "");
  return HANDLE_RE.test(h) ? h : null;
}

export function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null") ?? { handle: "", network: "x" };
  } catch {
    return { handle: "", network: "x" };
  }
}
export function saveProfile(p) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
}

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function saveLocal(rows) {
  try { localStorage.setItem(KEY, JSON.stringify(rows.slice(-500))); } catch {}
}

const remoteEnabled = () => Boolean(LEADERBOARD?.supabaseUrl && LEADERBOARD?.supabaseAnonKey);
const headers = () => ({
  apikey: LEADERBOARD.supabaseAnonKey,
  Authorization: `Bearer ${LEADERBOARD.supabaseAnonKey}`,
  "Content-Type": "application/json",
});

/**
 * Guarda una puntuación.
 * @param {{handle:string, network:string, songId:string, albumId:string, score:number, accuracy:number, maxCombo:number}} entry
 */
export async function submitScore(entry) {
  const row = { ...entry, at: new Date().toISOString() };
  const rows = loadLocal();
  rows.push(row);
  saveLocal(rows);
  if (!remoteEnabled()) return { remote: false };
  try {
    const res = await fetch(`${LEADERBOARD.supabaseUrl}/rest/v1/${LEADERBOARD.table}`, {
      method: "POST",
      headers: { ...headers(), Prefer: "return=minimal" },
      body: JSON.stringify({
        handle: row.handle,
        network: row.network,
        song_id: row.songId,
        album_id: row.albumId,
        score: row.score,
        accuracy: row.accuracy,
        max_combo: row.maxCombo,
      }),
    });
    return { remote: res.ok };
  } catch {
    return { remote: false };
  }
}

/** Mejor puntuación por persona (handle+red) para una canción, o puntos de fan totales si songId es null. */
function aggregate(rows, songId) {
  const best = new Map();
  for (const r of rows) {
    if (songId && r.songId !== songId) continue;
    const k = `${r.network}:${r.handle.toLowerCase()}`;
    const cur = best.get(k);
    if (songId) {
      if (!cur || r.score > cur.score) best.set(k, { ...r });
    } else {
      // Puntos de fan: suma de la mejor puntuación de cada canción.
      const entry = cur ?? { handle: r.handle, network: r.network, perSong: {}, score: 0, songs: 0 };
      entry.perSong[r.songId] = Math.max(entry.perSong[r.songId] ?? 0, r.score);
      entry.score = Object.values(entry.perSong).reduce((a, b) => a + b, 0);
      entry.songs = Object.keys(entry.perSong).length;
      best.set(k, entry);
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, 20);
}

/** @param {string|null} songId null = ranking general */
export async function topScores(songId) {
  if (remoteEnabled()) {
    try {
      const q = songId ? `&song_id=eq.${encodeURIComponent(songId)}` : "";
      const res = await fetch(
        `${LEADERBOARD.supabaseUrl}/rest/v1/${LEADERBOARD.table}?select=handle,network,song_id,album_id,score,accuracy,max_combo${q}&order=score.desc&limit=500`,
        { headers: headers() },
      );
      if (res.ok) {
        const rows = (await res.json()).map((r) => ({
          handle: r.handle, network: r.network, songId: r.song_id, albumId: r.album_id,
          score: r.score, accuracy: r.accuracy, maxCombo: r.max_combo,
        }));
        return { rows: aggregate(rows, songId), source: "global" };
      }
    } catch {}
  }
  return { rows: aggregate(loadLocal(), songId), source: "local" };
}

export function profileUrl(network, handle) {
  const h = encodeURIComponent(handle);
  return {
    x: `https://x.com/${h}`,
    instagram: `https://www.instagram.com/${h}/`,
    tiktok: `https://www.tiktok.com/@${h}`,
    youtube: `https://www.youtube.com/@${h}`,
  }[network] ?? null;
}
