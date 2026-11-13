// Versión ligera de la portada: con red lenta, ahorro de datos o un equipo con pocos recursos no se descarga ni se
// arma la escena 3D (three.js y el modelo pesan ~0,8 MB y su primer cuadro ocupa al procesador). La portada se ve
// igual con la silueta luminosa del CSS crítico, y un botón «Ver en 3D» la carga cuando la persona quiera.
// Sin datos del navegador (Safari y Firefox no tienen navigator.connection ni deviceMemory) manda la medición de cuadros.

/**
 * Motivo para la versión ligera según lo que informa el navegador, o "" si no hay.
 * "datos" (ahorro de datos), "red" (conexión lenta) o "equipo" (poca memoria o pocos núcleos).
 * @param {{ connection?: any, deviceMemory?: number, hardwareConcurrency?: number }} nav
 * @param {(q: string) => boolean} media
 */
export function liteReason(nav = typeof navigator === "undefined" ? {} : navigator, media = (q) => typeof matchMedia !== "undefined" && matchMedia(q).matches) {
  const c = nav.connection;
  if (c?.saveData || media("(prefers-reduced-data: reduce)")) return "datos";
  if (["slow-2g", "2g", "3g"].includes(c?.effectiveType) || (c?.downlink > 0 && c.downlink < 1.2)) return "red";
  if ((nav.deviceMemory > 0 && nav.deviceMemory <= 2) || (nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 2)) return "equipo";
  return "";
}

/** ¿Cuadros lentos? Mediana > 34 ms (menos de ~30 por segundo) o más de un tercio por encima de 50 ms. */
export function slowFrames(deltas) {
  const d = deltas.filter((x) => x > 0 && x < 1000).sort((a, b) => a - b);
  if (d.length < 8) return false;
  const median = d[Math.floor(d.length / 2)];
  return median > 34 || d.filter((x) => x > 50).length / d.length > 0.34;
}

/** Mide los cuadros durante `ms` (con la pestaña visible) y devuelve las duraciones. */
export function measureFrames(ms = 800) {
  return new Promise((resolve) => {
    const out = [];
    let last = 0, start = 0;
    const tick = (now) => {
      if (document.hidden) return resolve([]); // oculta: el navegador frena los cuadros, la medida no sirve
      if (last) out.push(now - last);
      else start = now;
      last = now;
      if (now - start < ms) requestAnimationFrame(tick);
      else resolve(out);
    };
    requestAnimationFrame(tick);
  });
}

/** Lo que dice el aviso según el motivo (en español: i18n.js lo traduce al mostrarlo). */
export const LITE_TEXT = {
  datos: "Versión ligera: tienes activado el ahorro de datos.",
  red: "Versión ligera para tu conexión.",
  equipo: "Versión ligera para tu equipo.",
  lento: "Versión ligera: las animaciones iban lentas en tu equipo.",
};
