// Sonidos cortos de estado (Web Audio, sin archivos). Ayudan sobre todo a quien no ve la pantalla
// y también a baja visión: confirman conectar, desconectar, errores y los toques del reto de ritmo.
// Reglas (docs/accesibilidad-visual.md, A-14): < 300 ms, volumen propio, nunca más de uno cada 120 ms,
// y apagados mientras el micrófono escucha (MicSync haría reaccionar las luces con estos sonidos).

/** Notas de cada sonido: [frecuencia Hz, inicio s, duración s, tipo de onda]. */
export const EARCONS = {
  connected: [[660, 0, 0.09, "sine"], [990, 0.09, 0.14, "sine"]],
  disconnected: [[880, 0, 0.09, "sine"], [520, 0.09, 0.16, "sine"]],
  error: [[220, 0, 0.18, "triangle"]],
  searching: [[740, 0, 0.06, "sine"]],
  start: [[1046, 0, 0.12, "sine"]],
  perfect: [[1318, 0, 0.08, "sine"]],
  great: [[988, 0, 0.08, "sine"]],
  good: [[659, 0, 0.08, "sine"]],
  miss: [[160, 0, 0.07, "square"]],
};

let ctx = null;
let last = 0;
const state = { volume: 0.5, muted: () => false };

/** @param {{volume?:number, muted?:()=>boolean}} o volumen 0–1; muted() true = no sonar (p. ej. micrófono activo) */
export function configureEarcons(o) { Object.assign(state, o); }

export function earcon(name) {
  const notes = EARCONS[name];
  if (!notes || state.volume <= 0 || state.muted()) return;
  const now = performance.now();
  if (now - last < 120) return;
  last = now;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime + 0.01;
    for (const [freq, at, dur, type] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const peak = 0.18 * state.volume;
      gain.gain.setValueAtTime(0, t0 + at);
      gain.gain.linearRampToValueAtTime(peak, t0 + at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + at);
      osc.stop(t0 + at + dur + 0.02);
    }
  } catch {}
}

/** Vibración corta en teléfonos que la permiten (Android). */
export function buzz(pattern) {
  try { navigator.vibrate?.(pattern); } catch {}
}
