// Aviso de actualización: mientras se publica una versión nueva (el despliegue de GitHub Pages está en curso) y
// cuando ya se publicó. Durante ese rato la página puede mezclar archivos viejos y nuevos, así que se avisa a quien
// la está usando que recargue si algo falla o se desincroniza.
//
// - "Se está actualizando": la API pública de GitHub dice si el flujo de CI (que despliega) está corriendo en main.
//   No se envía ningún dato de la persona; GitHub solo ve la consulta, como cualquier visita.
// - "Ya se actualizó": la versión de caché de sw.js (pws-vNN) cambió respecto a la que se cargó.
// Solo en lumiparty.com (en local y en las pruebas no consulta nada).

export const REPO = "KarlaMedina97/lightstick-bts-concert-sync";
const RUNS = `https://api.github.com/repos/${REPO}/actions/workflows/ci.yml/runs?branch=main&event=push&status=in_progress&per_page=1`;

/** Versión publicada a partir del texto de sw.js ("pws-v77"), o null. */
export function versionOf(swText = "") {
  return /pws-v\d+/.exec(swText)?.[0] ?? null;
}
/** Id del despliegue en curso según la respuesta de la API de GitHub, o null. */
export function deployingRun(json) {
  const run = json?.workflow_runs?.[0];
  return json?.total_count > 0 && run && ["in_progress", "queued"].includes(run.status) ? run.id : null;
}

/**
 * @param {{onUpdating:(id:number)=>void, onUpdated:(version:string)=>void, swUrl:string, everyMs?:number, fetchFn?:typeof fetch}} o
 */
export function watchUpdates({ onUpdating, onUpdated, swUrl, everyMs = 180000, fetchFn = fetch }) {
  if (typeof location === "undefined" || location.hostname !== "lumiparty.com") return () => {};
  let loaded = null, seenRun = null, seenVersion = null, pauseUntil = 0, timer = 0;
  const sw = async () => versionOf(await (await fetchFn(`${swUrl}?v=${Date.now()}`, { cache: "no-store" })).text());

  async function check() {
    if (document.hidden) return;
    try {
      const v = await sw();
      if (!loaded) loaded = v;
      else if (v && v !== loaded && v !== seenVersion) { seenVersion = v; onUpdated(v); }
    } catch {}
    if (Date.now() < pauseUntil) return;
    try {
      const r = await fetchFn(RUNS, { headers: { accept: "application/vnd.github+json" } });
      if (r.status === 403 || r.status === 429) { pauseUntil = Date.now() + 30 * 60000; return; } // límite de consultas
      const id = deployingRun(await r.json());
      if (id && id !== seenRun) { seenRun = id; onUpdating(id); }
    } catch {}
  }
  check();
  timer = setInterval(check, everyMs);
  const onVis = () => { if (!document.hidden) check(); };
  document.addEventListener("visibilitychange", onVis);
  // El service worker nuevo tomó el control: la página sigue con el código anterior hasta recargar.
  const onCtl = () => { if (loaded) check(); };
  navigator.serviceWorker?.addEventListener?.("controllerchange", onCtl);
  return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVis); navigator.serviceWorker?.removeEventListener?.("controllerchange", onCtl); };
}
