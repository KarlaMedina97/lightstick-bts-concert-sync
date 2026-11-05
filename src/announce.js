// Avisos para lectores de pantalla: dos regiones vivas siempre presentes y visualmente ocultas
// (#sr-polite y #sr-assertive en player/index.html). Ver docs/accesibilidad-visual.md (A-01, A-03).
// - Se vacía y se reescribe en el siguiente cuadro, así se repite aunque sea el mismo texto.
// - Antirrebote: si llegan varios avisos educados seguidos (p. ej. Siguiente tres veces), se dice solo el último.
// - El texto ya va traducido (t) y sin emojis, y las regiones llevan translate="no" para que la capa de idioma
//   no lo cambie después (se oiría dos veces).
import { t } from "./i18n.js";

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
let timer = 0;

/** Limpia un texto para leerlo en voz alta: sin emojis ni espacios dobles. */
export function speakable(msg) {
  return String(msg ?? "").replace(EMOJI, "").replace(/\s+/g, " ").trim();
}

/** @param {string} msg texto en español (se traduce) @param {{assertive?:boolean, delay?:number}} [o] */
export function say(msg, { assertive = false, delay = 300 } = {}) {
  const text = speakable(t(speakable(msg)));
  if (!text || typeof document === "undefined") return;
  const el = document.getElementById(assertive ? "sr-assertive" : "sr-polite");
  if (!el) return;
  const write = () => {
    el.textContent = "";
    setTimeout(() => (el.textContent = text), 60); // vaciar y reescribir: se anuncia aunque se repita
  };
  if (assertive) return write();
  clearTimeout(timer);
  timer = setTimeout(write, delay);
}
