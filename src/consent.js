// Aviso de privacidad / consentimiento (landing y reproductor). LumiParty no usa cookies propias: las métricas
// (src/analytics.js, PostHog) son anónimas y sin cookies; el reproductor de YouTube puede guardar sus propios datos al
// reproducir. Se muestra una vez hasta que la persona elige: «Aceptar» o «Rechazar métricas» (las apaga, igual que
// Ajustes › Métricas de uso). La elección queda en este dispositivo.
import { setAnalyticsOff } from "./analytics.js";
import { t } from "./i18n.js";

const KEY = "pws.consent"; // "si" | "no"

export function consentChoice() { try { return localStorage.getItem(KEY); } catch { return null; } }

/** Muestra el aviso si aún no se eligió. */
export function showConsent() {
  if (typeof document === "undefined" || consentChoice() || document.getElementById("consent")) return;
  const box = document.createElement("section");
  box.id = "consent";
  box.className = "consent";
  box.setAttribute("role", "region");
  box.setAttribute("aria-label", t("Aviso de privacidad"));
  const p = document.createElement("p");
  p.textContent = t("LumiParty no usa cookies. Medimos el uso de forma anónima, sin datos personales, para mejorar la app. El reproductor de YouTube puede guardar sus propios datos al reproducir un video.");
  const more = document.createElement("a");
  more.href = "/privacy/";
  more.textContent = t("Más sobre privacidad");
  p.append(" ", more);
  const actions = document.createElement("div");
  actions.className = "consent-actions";
  const choose = (v) => {
    try { localStorage.setItem(KEY, v); } catch {}
    setAnalyticsOff(v === "no");
    const chk = document.getElementById("chk-metrics");
    if (chk) chk.checked = v !== "no";
    box.remove();
  };
  const yes = document.createElement("button");
  yes.type = "button"; yes.className = "consent-yes"; yes.textContent = t("Aceptar");
  yes.onclick = () => choose("si");
  const no = document.createElement("button");
  no.type = "button"; no.className = "consent-no"; no.textContent = t("Rechazar métricas");
  no.onclick = () => choose("no");
  actions.append(no, yes);
  box.append(p, actions);
  document.body.append(box);
  // En el reproductor, encima de la barra de controles (no tapa reproducir ni la cola; el video queda arriba, libre).
  const dock = document.getElementById("dock");
  const place = () => { const r = dock?.getBoundingClientRect(); if (r && r.height && !dock.closest("[hidden]")) box.style.bottom = `${Math.max(12, innerHeight - r.top + 10)}px`; };
  place();
  addEventListener("resize", place);
}
