// Métricas de uso con Google Analytics 4 SIN cookies (decisión del proyecto, ver docs/seguridad.md y /privacy/).
// - client_storage: "none": no se guarda nada en el dispositivo (sin cookies ni identificador persistente).
// - Sin señales de Google ni personalización de anuncios; IP anonimizada.
// - Solo la ruta de la página (sin ?song=… ni parámetros) y eventos con nombres fijos del código.
// - No se carga nada si el navegador pide no ser rastreado (Do Not Track / Global Privacy Control), en localhost o
//   en la red local, ni si ANALYTICS.ga4 está vacío en src/config.js.
// La configuración va en este archivo (no en un script en línea), así se respeta la CSP.
import { ANALYTICS } from "./config.js";

const ID = /^G-[A-Z0-9]{4,20}$/.test(ANALYTICS?.ga4 ?? "") ? ANALYTICS.ga4 : "";
let ready = false;

function allowed() {
  if (!ID || typeof navigator === "undefined" || typeof location === "undefined" || typeof document === "undefined") return false;
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true) return false;
  const h = location.hostname;
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]" || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h)) return false;
  return true;
}

function gtag() { window.dataLayer.push(arguments); }

function init() {
  if (ready || !allowed()) return ready;
  window.dataLayer = window.dataLayer || [];
  window.gtag = gtag;
  // analytics_storage "denied": gtag.js NO escribe cookies (_ga) y manda solo visitas anónimas sin identificador.
  // (client_storage: "none" no basta en GA4: igual crea las cookies; se comprobó en producción el 2026-11-05.)
  gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied", functionality_storage: "denied", personalization_storage: "denied" });
  gtag("js", new Date());
  gtag("config", ID, {
    client_storage: "none", anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false,
    send_page_view: false,
  });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`;
  document.head.append(s);
  ready = true;
  return ready;
}

/** Visita a una página (solo la ruta, sin parámetros que identifiquen nada). */
export function pageview(path = location.pathname) {
  if (!init()) return;
  gtag("event", "page_view", { page_location: location.origin + path, page_path: path, page_title: document.title.slice(0, 80) });
}

/** Evento anónimo: "play", "conectar", "idioma"… (nombres fijos del código, nunca datos de la persona). */
export function event(name, params = {}) {
  if (!/^[a-z0-9_]{1,40}$/.test(name) || !init()) return;
  const clean = Object.fromEntries(Object.entries(params).filter(([k, v]) => /^[a-z_]{1,24}$/.test(k) && /^[\w.-]{0,40}$/.test(String(v))));
  gtag("event", name, clean);
}
