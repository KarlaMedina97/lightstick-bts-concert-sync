// Métricas de uso con PostHog (posthog.com, servidor en la UE; ver /privacy/): para entender por dónde llegan las
// personas, qué usan y dónde abandonan (embudos), no para identificarlas.
// - Código propio y liviano (sin la librería de PostHog ni CDN): se envían eventos a su API pública de captura.
// - Sin cookies ni identidad: un número al azar que vive solo mientras la pestaña está abierta (sessionStorage), sin
//   perfiles de persona. Solo la ruta de la página (sin ?song=… ni #), el sitio de donde vino (sin su dirección
//   completa), navegador, sistema y tipo de pantalla.
// - Nunca con «No rastrear» (Do Not Track / Global Privacy Control), si la persona apagó las métricas en Ajustes, ni en
//   local o la red local: ahí se muestra en la consola lo que SE ENVIARÍA (para revisarlo).
// La API (pageview, event, analyticsOff, setAnalyticsOff) es la misma que usaba GA4: el resto de la app no cambia.
import { ANALYTICS } from "./config.js";

const PH = ANALYTICS?.posthog ?? {};
const KEY = /^phc_[A-Za-z0-9]{20,}$/.test(PH.key ?? "") ? PH.key : "";
const HOST = /^https:\/\/[a-z.]+\.posthog\.com$/.test(PH.host ?? "") ? PH.host : "https://eu.i.posthog.com";
const OPT_OUT_KEY = "pws.analytics.off";
const SID_KEY = "pws.ph.sid";

/** La persona apagó las métricas en Ajustes. */
export function analyticsOff() { try { return localStorage.getItem(OPT_OUT_KEY) === "1"; } catch { return false; } }
/** Prende o apaga las métricas (al apagar, se olvida el número de la visita). */
export function setAnalyticsOff(off) {
  try { off ? localStorage.setItem(OPT_OUT_KEY, "1") : localStorage.removeItem(OPT_OUT_KEY); } catch {}
  if (off) try { sessionStorage.removeItem(SID_KEY); } catch {}
}

const local = () => { const h = location.hostname; return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h) || !/(^|\.)lumiparty\.com$/.test(h); };
function allowed() {
  if (!KEY || typeof navigator === "undefined" || typeof location === "undefined") return false;
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true) return false;
  return !analyticsOff();
}
/** Número al azar de esta visita (se borra al cerrar la pestaña). */
function visitId() {
  try { let id = sessionStorage.getItem(SID_KEY); if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(SID_KEY, id); } return id; } catch { return (visitId.mem ??= crypto.randomUUID()); }
}

const browser = (ua) => (/Edg\//.test(ua) ? "Microsoft Edge" : /OPR\//.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox\//.test(ua) ? "Firefox" : /CriOS|Chrome\//.test(ua) ? (navigator.brave ? "Brave" : "Chrome") : /Safari\//.test(ua) ? "Safari" : "Otro");
const os = (ua) => (/Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac OS X" : /CrOS/.test(ua) ? "Chrome OS" : /Linux/.test(ua) ? "Linux" : "Otro");
const device = () => (matchMedia("(pointer: coarse)").matches ? (Math.min(screen.width, screen.height) >= 600 ? "Tablet" : "Mobile") : "Desktop");
/** Origen del que vino (solo el sitio, nunca la dirección completa). */
function referrer() {
  try { const r = new URL(document.referrer); return r.origin === location.origin ? { $referrer: location.origin + r.pathname, $referring_domain: r.hostname } : { $referrer: r.origin, $referring_domain: r.hostname }; } catch { return { $referrer: "$direct", $referring_domain: "$direct" }; }
}

/** Arma el evento de PostHog (sin datos personales). Exportado para las pruebas. */
export function buildCapture(name, params = {}, path = location.pathname) {
  const ua = navigator.userAgent, sid = visitId();
  return {
    api_key: KEY,
    event: name,
    distinct_id: sid,
    timestamp: new Date().toISOString(),
    properties: {
      $current_url: location.origin + path, $host: location.host, $pathname: path, ...referrer(),
      $browser: browser(ua), $os: os(ua), $device_type: device(), $screen_width: screen.width, $viewport_width: innerWidth,
      $session_id: sid, $process_person_profile: false, $lib: "lumiparty", idioma: document.documentElement.lang || "es",
      ...params,
    },
  };
}

function send(payload) {
  if (local()) { console.info("[LumiParty] (prueba local) se enviaría a PostHog:", payload); return; }
  fetch(`${HOST}/i/v0/e/`, { method: "POST", body: JSON.stringify(payload), keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
}

/** Visita a una página (solo la ruta, sin parámetros que identifiquen nada). */
export function pageview(path = location.pathname) {
  if (!allowed()) return;
  send(buildCapture("$pageview", { $title: document.title.slice(0, 80) }, path));
}

/** Evento anónimo: "reproducir", "conectar_army_bomb", "idioma"… (nombres fijos del código, nunca datos de la persona). */
export function event(name, params = {}) {
  if (!/^[a-z0-9_]{1,40}$/.test(name) || !allowed()) return;
  const clean = Object.fromEntries(Object.entries(params).filter(([k, v]) => /^[a-z_]{1,24}$/.test(k) && /^[\w.-]{0,40}$/.test(String(v))));
  send(buildCapture(name, clean));
}
