// Métricas de uso con PostHog (posthog.com, región EE. UU.; ver /privacy/): para entender por dónde llegan las
// personas, qué usan y dónde abandonan (embudos), no para identificarlas.
// - Librería oficial (posthog-js, versión «slim» que nunca descarga scripts externos), copiada en vendor/posthog/ y
//   cargada solo cuando las métricas están permitidas. Da sesiones reales (30 min sin actividad), salida de página
//   (rebote y duración) y el navegador real (sin eso PostHog marcaba todas las visitas como bots).
// - Sin cookies ni perfiles de persona: un número al azar en sessionStorage (se borra al cerrar la pestaña). Solo si
//   la persona tocó «Aceptar» en el aviso de privacidad, ese número se guarda en localStorage para contar las visitas
//   que vuelven. Sin grabación de sesiones, encuestas, flags ni clics automáticos.
// - Solo la ruta de la página (sin ?song=… ni #; se conservan los utm_* de campañas), el sitio de donde vino (sin su
//   dirección completa), navegador, sistema y tipo de pantalla.
// - Nunca con «No rastrear» (Do Not Track / Global Privacy Control), si la persona apagó las métricas en Ajustes, ni en
//   local o la red local: ahí se muestra en la consola lo que SE ENVIARÍA (para revisarlo).
// La API (pageview, event, analyticsOff, setAnalyticsOff) es la de siempre: el resto de la app no cambia.
import { ANALYTICS } from "./config.js";

const PH = ANALYTICS?.posthog ?? {};
const KEY = /^phc_[A-Za-z0-9]{20,}$/.test(PH.key ?? "") ? PH.key : "";
const HOST = /^https:\/\/[a-z.]+\.posthog\.com$/.test(PH.host ?? "") ? PH.host : "https://us.i.posthog.com";
const LIB = "../vendor/posthog/posthog.slim.no-external.js";
const OPT_OUT_KEY = "pws.analytics.off";
const CONSENT_KEY = "pws.consent"; // lo escribe src/consent.js: "si" | "no"
const OLD_SID_KEY = "pws.ph.sid"; // número de la versión anterior (código propio): se borra

/** La persona apagó las métricas en Ajustes. */
export function analyticsOff() { try { return localStorage.getItem(OPT_OUT_KEY) === "1"; } catch { return false; } }
/** La persona aceptó las métricas en el aviso de privacidad: se puede recordar el número entre visitas. */
const accepted = () => { try { return localStorage.getItem(CONSENT_KEY) === "si"; } catch { return false; } };
/** Prende o apaga las métricas (al apagar, se olvida el número de la visita). */
export function setAnalyticsOff(off) {
  try { off ? localStorage.setItem(OPT_OUT_KEY, "1") : localStorage.removeItem(OPT_OUT_KEY); } catch {}
  try { sessionStorage.removeItem(OLD_SID_KEY); } catch {}
  if (!ph) return;
  if (off) { ph.reset(); ph.opt_out_capturing(); return; } // en este orden: reset() borra también la exclusión
  if (ph.has_opted_out_capturing()) ph.opt_in_capturing({ captureEventName: false });
  if (accepted()) ph.set_config({ persistence: "localStorage" }); // aceptó en el aviso: el número pasa a este dispositivo
}

const local = () => { const h = location.hostname; return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h) || !/(^|\.)lumiparty\.com$/.test(h); };
function allowed() {
  if (typeof navigator === "undefined" || typeof location === "undefined" || typeof window === "undefined") return false;
  if (!KEY && !local()) return false; // sin clave (el repo no la tiene) solo en local, para ver en la consola qué se enviaría
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true) return false;
  return !analyticsOff();
}

const UTM = /^utm_(source|medium|campaign|content|term)$/;
/** Dirección sin datos: origen + ruta; en la página actual se conservan solo los utm_* (de qué publicación llegó). */
function cleanUrl(value, { keepUtm = false, siteOnly = false } = {}) {
  if (typeof value !== "string" || value === "$direct") return value;
  try {
    const u = new URL(value);
    if (siteOnly) return u.origin; // de otro sitio: solo cuál, nunca la búsqueda ni la página
    const utm = keepUtm ? [...u.searchParams].filter(([k]) => UTM.test(k)) : [];
    return u.origin + u.pathname + (utm.length ? `?${new URLSearchParams(utm)}` : "");
  } catch { return ""; }
}

/**
 * Limpia cada evento antes de enviarlo (before_send de PostHog). Exportado para las pruebas.
 * Devuelve null (no se envía) en local o en la red local: ahí solo se muestra en la consola.
 */
export function cleanEvent(ev) {
  if (!ev?.properties) return ev;
  const p = ev.properties;
  const here = typeof location !== "undefined" ? location.host : "";
  for (const k of Object.keys(p)) {
    if (!/(url|referrer)$/i.test(k)) continue;
    const external = /referrer$/i.test(k) && typeof p[k] === "string" && !p[k].startsWith("$") && (() => { try { return new URL(p[k]).host !== here; } catch { return true; } })();
    p[k] = cleanUrl(p[k], { keepUtm: k === "$current_url", siteOnly: external });
  }
  delete p.$set; delete p.$set_once; // nunca perfiles de persona
  p.$process_person_profile = false;
  p.idioma = (typeof document !== "undefined" && document.documentElement?.lang) || "es";
  if (typeof location !== "undefined" && local()) { console.info("[LumiParty] (prueba local) se enviaría a PostHog:", ev); return null; }
  return ev;
}

let ph = null;
let loading = null;
/** Carga e inicia la librería una sola vez (solo si las métricas están permitidas). */
function load() {
  loading ??= import(LIB).then(({ default: posthog }) => {
    try { sessionStorage.removeItem(OLD_SID_KEY); } catch {}
    // En local la clave no existe: una de mentira basta, porque before_send (cleanEvent) nunca deja salir nada de ahí.
    posthog.init(KEY || "phc_local-sin-envio", {
      api_host: HOST,
      persistence: accepted() ? "localStorage" : "sessionStorage", // nunca cookies
      person_profiles: "identified_only", // nunca se identifica a nadie: sin perfiles de persona
      autocapture: false, capture_pageview: false, capture_pageleave: true, rageclick: false, capture_dead_clicks: false,
      disable_session_recording: true, disable_surveys: true, disable_web_experiments: true, disable_product_tours: true,
      advanced_disable_flags: true, disable_external_dependency_loading: true,
      mask_personal_data_properties: true,
      before_send: cleanEvent,
    });
    if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing({ captureEventName: false });
    ph = posthog;
    return posthog;
  }).catch((e) => { console.warn("[LumiParty] No se pudieron cargar las métricas:", e); return null; });
  return loading;
}

/** Visita a una página (solo la ruta, sin parámetros que identifiquen nada). */
export function pageview(path) {
  if (!allowed()) return;
  const props = { $title: document.title.slice(0, 80) };
  if (path && path !== location.pathname) Object.assign(props, { $current_url: location.origin + path, $pathname: path });
  load().then((p) => p?.capture("$pageview", props));
}

/** Evento anónimo: "reproducir", "conectar_army_bomb", "idioma"… (nombres fijos del código, nunca datos de la persona). */
export function event(name, params = {}) {
  if (!/^[a-z0-9_]{1,40}$/.test(name) || !allowed()) return;
  const clean = Object.fromEntries(Object.entries(params).filter(([k, v]) => /^[a-z_]{1,24}$/.test(k) && /^[\w.-]{0,40}$/.test(String(v))));
  load().then((p) => p?.capture(name, clean));
}
