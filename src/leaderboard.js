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

const NETWORK_IDS = new Set(["x", "instagram", "tiktok", "weverse", "youtube"]);
const ID_RE = /^[a-z0-9-]{1,60}$/;
const int = (v, min, max) => (Number.isInteger(v) && v >= min && v <= max ? v : null);

/**
 * Valida una fila de puntuación (venga del servidor o del almacenamiento local).
 * Cualquier dato con forma inesperada se descarta en vez de mostrarse.
 */
export function sanitizeRow(r) {
  if (!r || typeof r !== "object") return null;
  const handle = normalizeHandle(r.handle);
  const network = NETWORK_IDS.has(r.network) ? r.network : null;
  const songId = typeof r.songId === "string" && ID_RE.test(r.songId) ? r.songId : null;
  const albumId = typeof r.albumId === "string" && ID_RE.test(r.albumId) ? r.albumId : null;
  const score = int(r.score, 0, 200000);
  const accuracy = int(r.accuracy, 0, 100);
  const maxCombo = int(r.maxCombo, 0, 2000);
  if (!handle || !network || !songId || !albumId || score === null || accuracy === null || maxCombo === null) return null;
  return { handle, network, songId, albumId, score, accuracy, maxCombo };
}

function loadLocal() {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(rows) ? rows.map(sanitizeRow).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Borra todos los datos que la app guardó en este dispositivo. */
export function clearAllLocalData() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith("pws.")).forEach((k) => localStorage.removeItem(k));
  } catch {}
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
let lastRemoteSubmit = 0;
export async function submitScore(entry) {
  const row = sanitizeRow(entry);
  if (!row) return { remote: false };
  const rows = loadLocal();
  rows.push(row);
  saveLocal(rows);
  // Solo HTTPS y como máximo un envío cada 30 s por dispositivo (el servidor debe limitar también).
  if (!remoteEnabled() || !LEADERBOARD.supabaseUrl.startsWith("https://") || Date.now() - lastRemoteSubmit < 30000) return { remote: false };
  lastRemoteSubmit = Date.now();
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
        const data = await res.json();
        const rows = (Array.isArray(data) ? data : [])
          .map((r) => sanitizeRow({
            handle: r?.handle, network: r?.network, songId: r?.song_id, albumId: r?.album_id,
            score: r?.score, accuracy: r?.accuracy, maxCombo: r?.max_combo,
          }))
          .filter(Boolean);
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
