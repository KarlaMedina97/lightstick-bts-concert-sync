// Opiniones anónimas para medir si la experiencia es agradable y cómo escala.
// Con Supabase configurado se guardan en una tabla de solo escritura (nadie puede leerlas desde la web).
// Sin servidor, se abre una propuesta de "issue" en GitHub con el texto ya escrito.
import { LEADERBOARD, PROJECT } from "./config.js";

const MAX_COMMENT = 1000;
const COOLDOWN_MS = 60000;
/** Etiquetas fijas de las opciones visuales (nunca texto libre). */
export const FEEDBACK_TAGS = ["conexion", "sincronia", "video", "lento", "confuso", "canciones", "diseno", "idiomas", "luces", "facil", "concierto", "otro"];

/** Resumen anónimo del dispositivo: solo familia de sistema y navegador, y capacidades. */
export function deviceSummary(nav = navigator) {
  const ua = nav.userAgent || "";
  const os = /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : "otro";
  const browser = /Bluefy/i.test(ua) ? "Bluefy" : /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "otro";
  return { os, browser, bluetooth: "bluetooth" in nav };
}

/** Limpia y valida lo que escribió la persona. Devuelve null si no hay nada útil que enviar. */
export function buildFeedback(form, { includeDevice = true, songId = null, nav } = {}) {
  const rating = Number(form.rating);
  const ease = form.ease === "" || form.ease == null ? null : Number(form.ease);
  const wouldUse = ["yes", "maybe", "no"].includes(form.would_use) ? form.would_use : null;
  const comment = String(form.comment ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, MAX_COMMENT);
  const tags = [...new Set((Array.isArray(form.tags) ? form.tags : []).filter((x) => FEEDBACK_TAGS.includes(x)))];
  if (!(rating >= 1 && rating <= 5) && !comment) return null;
  const d = includeDevice ? deviceSummary(nav) : {};
  return {
    rating: rating >= 1 && rating <= 5 ? Math.round(rating) : null,
    ease: ease !== null && ease >= 0 && ease <= 5 ? Math.round(ease) : null,
    would_use: wouldUse,
    comment: comment || null,
    tags,
    song_id: typeof songId === "string" && /^[a-z0-9-]{1,60}$/.test(songId) ? songId : null,
    os: d.os ?? null,
    browser: d.browser ?? null,
    bluetooth: d.bluetooth ?? null,
    app_version: "0.4.0",
  };
}

let lastSent = 0;

/** Fila para la tabla `feedback` (docs/ranking-global.md): las etiquetas se guardan dentro del comentario. */
export function toRow({ tags = [], ...rest }) {
  if (!tags.length) return rest;
  const comment = `[${tags.join(", ")}]${rest.comment ? ` ${rest.comment}` : ""}`.slice(0, MAX_COMMENT);
  return { ...rest, comment };
}

/** @returns {Promise<{ok:boolean, via:"server"|"github"|"none", message:string}>} */
export async function sendFeedback(entry) {
  if (Date.now() - lastSent < COOLDOWN_MS) {
    return { ok: false, via: "none", message: "Gracias. Espera un minuto antes de enviar otra opinión." };
  }
  if (LEADERBOARD.supabaseUrl?.startsWith("https://") && LEADERBOARD.supabaseAnonKey) {
    try {
      const res = await fetch(`${LEADERBOARD.supabaseUrl}/rest/v1/${LEADERBOARD.feedbackTable || "feedback"}`, {
        method: "POST",
        headers: {
          apikey: LEADERBOARD.supabaseAnonKey,
          Authorization: `Bearer ${LEADERBOARD.supabaseAnonKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        // La tabla no tiene columna de etiquetas: van al inicio del comentario ("[conexion, lento] …").
        body: JSON.stringify(toRow(entry)),
      });
      if (res.ok) {
        lastSent = Date.now();
        return { ok: true, via: "server", message: "¡Gracias! Tu opinión llegó 💜" };
      }
    } catch {}
  }
  // Sin servidor: propone un issue en GitHub (la persona decide si lo publica).
  const stars = entry.rating ? "★".repeat(entry.rating) + "☆".repeat(5 - entry.rating) : "sin calificación";
  const body = [
    `**Calificación:** ${stars}`,
    `**Facilidad para conectar:** ${entry.ease ?? "—"} / 5`,
    `**¿La usaría en una fiesta, pijamada o concierto?:** ${{ yes: "Sí", maybe: "Tal vez", no: "No" }[entry.would_use] ?? "—"}`,
    `**Etiquetas:** ${entry.tags?.length ? entry.tags.join(", ") : "—"}`,
    `**Dispositivo:** ${entry.os ?? "—"} · ${entry.browser ?? "—"} · Bluetooth web: ${entry.bluetooth === null ? "—" : entry.bluetooth ? "sí" : "no"}`,
    "",
    entry.comment ?? "",
  ].join("\n");
  const url = `${PROJECT.repo}/issues/new?labels=opinion&title=${encodeURIComponent(`Opinión: ${stars}`)}&body=${encodeURIComponent(body)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  lastSent = Date.now();
  return { ok: true, via: "github", message: "Se abrió GitHub con tu opinión lista para publicar." };
}
