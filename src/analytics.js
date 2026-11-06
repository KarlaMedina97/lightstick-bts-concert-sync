// Métricas de uso con Google Analytics 4 (ver /privacy/): cookie propia de analítica fuera de Europa, sin cookies en
// Europa salvo permiso, nunca publicidad ni señales de Google, y se puede apagar en Ajustes.
// - Solo la ruta de la página (sin ?song=… ni parámetros) y eventos con nombres fijos del código.
// - No se carga nada si el navegador pide no ser rastreado (Do Not Track / Global Privacy Control), en localhost o
//   en la red local, ni si ANALYTICS.ga4 está vacío en src/config.js.
// La configuración va en este archivo (no en un script en línea), así se respeta la CSP.
import { ANALYTICS } from "./config.js";

const ID = /^G-[A-Z0-9]{4,20}$/.test(ANALYTICS?.ga4 ?? "") ? ANALYTICS.ga4 : "";
let ready = false;
// UE/EEE + Reino Unido + Suiza: ahí las cookies de analítica necesitan permiso.
const EU_REGIONS = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH"];
const OPT_OUT_KEY = "pws.analytics.off";
/** La persona apagó las métricas en Ajustes. */
export function analyticsOff() { try { return localStorage.getItem(OPT_OUT_KEY) === "1"; } catch { return false; } }
/** Prende o apaga las métricas (al apagar, se borran las cookies _ga y no se vuelve a cargar). */
export function setAnalyticsOff(off) {
  try { off ? localStorage.setItem(OPT_OUT_KEY, "1") : localStorage.removeItem(OPT_OUT_KEY); } catch {}
  if (off) {
    if (ID) window[`ga-disable-${ID}`] = true;
    for (const c of document.cookie.split(";")) {
      const name = c.split("=")[0].trim();
      if (/^_ga/.test(name)) for (const d of ["", `; domain=${location.hostname}`, `; domain=.${location.hostname.replace(/^www\./, "")}`]) document.cookie = `${name}=; Max-Age=0; path=/${d}`;
    }
  }
}

function allowed() {
  if (!ID || typeof navigator === "undefined" || typeof location === "undefined" || typeof document === "undefined") return false;
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true) return false;
  if (analyticsOff()) return false;
  const h = location.hostname;
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]" || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h)) return false;
  return true;
}

function gtag() { window.dataLayer.push(arguments); }

function init() {
  if (ready || !allowed()) return ready;
  window.dataLayer = window.dataLayer || [];
  window.gtag = gtag;
  // Métricas reales: GA4 con su cookie propia (_ga, solo de lumiparty.com) para contar visitantes y sesiones.
  // Sin cookies Google recibe las visitas pero no las muestra en los informes (se comprobó: todo en cero).
  // - Europa (UE/EEE, Reino Unido, Suiza): sin cookies salvo permiso, como pide su ley (consentimiento denegado).
  // - Nunca publicidad: ad_storage, ad_user_data y ad_personalization siempre denegados; sin señales de Google.
  // - La persona puede apagarlo en Ajustes («Métricas de uso»); con «No rastrear» o GPC ni se carga.
  const denied = { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" };
  gtag("consent", "default", { ...denied, analytics_storage: "granted", functionality_storage: "denied", personalization_storage: "denied" });
  gtag("consent", "default", { ...denied, analytics_storage: "denied", region: EU_REGIONS });
  gtag("js", new Date());
  gtag("config", ID, {
    allow_google_signals: false, allow_ad_personalization_signals: false,
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
