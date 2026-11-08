// Reporte de errores a Sentry (sentry.io), propio y liviano (sin su librería de ~70 KB): cuando la página falla en el
// navegador de alguien, se envía el tipo de error, el mensaje y dónde ocurrió en NUESTRO código. Así nos enteramos de
// fallos que nadie reporta.
// - Sin datos personales: nada de IP guardada (Sentry no la recibe del cuerpo), sin cookies, sin texto que la persona
//   escribió, sin la dirección completa (solo la ruta, sin parámetros ni #).
// - No se envía nada con «No rastrear» (Do Not Track / GPC), si la persona apagó las métricas en Ajustes, ni en local:
//   en local se muestra en la consola lo que SE ENVIARÍA (para revisarlo).
// - Como mucho 5 errores por visita y sin repetir el mismo.
import { analyticsOff } from "./analytics.js";
import { SENTRY } from "./config.js";

const sent = new Set();
let count = 0;

/** DSN → dirección de envío pública de Sentry. */
export function endpointOf(dsn) {
  const m = /^https:\/\/([0-9a-f]+)@([^/]+)\/(\d+)$/.exec(dsn ?? "");
  return m ? `https://${m[2]}/api/${m[3]}/envelope/?sentry_key=${m[1]}&sentry_version=7` : null;
}

/** Marcos de la pila (Chrome/Edge «at f (url:l:c)» y Firefox/Safari «f@url:l:c»), del más antiguo al más reciente. */
export function parseStack(stack = "") {
  const frames = [];
  for (const line of String(stack).split("\n")) {
    const m = /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?\s*$/.exec(line) || /^\s*(.*?)@(.+?):(\d+):(\d+)\s*$/.exec(line);
    if (!m) continue;
    const file = m[2].replace(/[?#].*$/, "");
    frames.push({ function: m[1] || "(anónima)", filename: file, lineno: +m[3], colno: +m[4], in_app: typeof location !== "undefined" && file.startsWith(location.origin) });
  }
  return frames.reverse().slice(-30);
}

const browserName = (ua = "") => (/Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Brave/.test(ua) ? "Brave" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Otro");
const osName = (ua = "") => (/Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Otro");

/** Evento de Sentry a partir de un error (sin datos personales). */
export function buildEvent(err, extra = {}) {
  const e = err instanceof Error ? err : new Error(String(err?.message ?? err ?? "Error"));
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return {
    event_id: Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
    timestamp: Date.now() / 1000,
    platform: "javascript",
    level: "error",
    release: `lumiparty@${SENTRY.release}`,
    environment: typeof location !== "undefined" && location.hostname === "lumiparty.com" ? "produccion" : "local",
    request: { url: typeof location !== "undefined" ? location.origin + location.pathname : "" },
    contexts: { browser: { name: browserName(ua) }, os: { name: osName(ua) } },
    tags: { pantalla: typeof location !== "undefined" ? location.pathname.split("/")[1] || "inicio" : "desconocida", ...extra.tags },
    exception: { values: [{ type: e.name || "Error", value: String(e.message).slice(0, 300), stacktrace: { frames: parseStack(e.stack) } }] },
  };
}

function allowed() {
  if (typeof navigator === "undefined" || typeof location === "undefined") return false;
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true) return false;
  return !analyticsOff();
}
const isLocal = () => !/(^|\.)lumiparty\.com$/.test(location.hostname);

/** Reporta un error (también se puede llamar a mano). */
export function reportError(err, extra = {}) {
  try {
    if (!allowed() || count >= 5) return;
    const ev = buildEvent(err, extra);
    const v = ev.exception.values[0];
    // Solo errores de nuestro código (no de extensiones del navegador ni de YouTube) y sin ruido conocido.
    if (!v.stacktrace.frames.some((f) => f.in_app) && !extra.manual) return;
    if (/ResizeObserver loop|Script error\.?$/i.test(v.value)) return;
    const key = `${v.type}:${v.value}`;
    if (sent.has(key)) return;
    sent.add(key); count++;
    if (isLocal()) { console.info("[LumiParty] (prueba local) se enviaría a Sentry:", ev); return; }
    const url = endpointOf(SENTRY.dsn);
    if (!url) return;
    const body = `${JSON.stringify({ event_id: ev.event_id, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(ev)}`;
    fetch(url, { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain;charset=UTF-8" } }).catch(() => {});
  } catch {}
}

/** Escucha los errores no atrapados de la página. */
export function watchErrors() {
  if (typeof window === "undefined" || !SENTRY?.dsn) return;
  window.addEventListener("error", (e) => { if (e.error || e.message) reportError(e.error ?? new Error(e.message)); });
  window.addEventListener("unhandledrejection", (e) => reportError(e.reason instanceof Error ? e.reason : new Error(`Promesa rechazada: ${String(e.reason).slice(0, 200)}`)));
}
