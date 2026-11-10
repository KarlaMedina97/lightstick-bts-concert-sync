// Ajuste y validación de las líneas de tiempo que devuelve Gemini (sin efectos al importar: lo usan el script y las pruebas).

const r1 = (x) => Math.round(x * 10) / 10;

/**
 * Corrige los dos errores habituales de Gemini antes de validar:
 * - Tramos sin duración (fin ≤ inicio): se quitan y el anterior se estira hasta el siguiente.
 * - Reloj inflado o encogido: con algunos videos mide todo ~1,6 veces más largo (dice 419 s en un video de 257 s),
 *   pero el orden y las proporciones de los tramos son buenos. Si el final no cuadra con la duración real y el
 *   factor está entre 0,4 y 2,5, se escalan todos los tiempos para que terminen en la duración real.
 * Devuelve { tl, notas } con una copia ajustada; no toca el original.
 */
export function fitTimeline(tl, dur) {
  const notas = [];
  let T = (tl?.tramos ?? []).map((t) => ({ ...t }));
  const kept = T.filter((t) => t.fin > t.inicio);
  if (kept.length && kept.length < T.length) {
    notas.push(`${T.length - kept.length} tramo(s) sin duración quitados`);
    kept.forEach((t, i) => { if (kept[i + 1]) t.fin = kept[i + 1].inicio; });
    T = kept;
  }
  const end = T.at(-1)?.fin ?? 0;
  if (dur && end > 0 && Math.abs(end - dur) > Math.max(5, dur * 0.04)) {
    const f = dur / end;
    if (f >= 0.4 && f <= 2.5) {
      T.forEach((t) => { t.inicio = r1(t.inicio * f); t.fin = r1(t.fin * f); });
      T.at(-1).fin = dur;
      notas.push(`tiempos escalados ×${f.toFixed(2)} (terminaba en ${end} s, el video dura ${dur} s)`);
    }
  }
  return { tl: { ...tl, tramos: T }, notas };
}

/** Valida la línea de tiempo: duración real, orden, colores, sin letras. Devuelve la lista de problemas. */
export function checkTimeline(tl, dur) {
  const bad = [];
  const T = tl?.tramos ?? [];
  if (!T.length) bad.push(`sin tramos (${tl?.aura ?? "?"})`);
  const end = T.at(-1)?.fin ?? 0;
  if (dur && Math.abs(end - dur) > Math.max(5, dur * 0.04)) bad.push(`termina en ${end} s y el video dura ${dur} s`);
  T.forEach((t, i) => {
    if (i && Math.abs(t.inicio - T[i - 1].fin) > 1) bad.push(`hueco o superposición en ${t.inicio} s`);
    if (!(t.fin > t.inicio)) bad.push(`tramo ${i + 1} sin duración`);
    if (!t.colores?.length || t.colores.some((c) => !/^#[0-9a-fA-F]{6}$/.test(c))) bad.push(`colores inválidos en ${t.inicio} s`);
    if (/[가-힯぀-ヿ]|«[^»]{12,}»|"[^"]{20,}"/.test(t.escena)) bad.push(`posible letra citada en ${t.inicio} s`);
  });
  return bad;
}
