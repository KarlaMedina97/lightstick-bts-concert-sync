// Giroscopio y acelerómetro del ARMY Bomb 3D (vista Luces), sin three.js para poder probarlo en Node.
// Regla: el ARMY Bomb responde a los movimientos; con el teléfono o la tablet quieto (en la mano, torcido o apoyado
// en un atril) vuelve solo a quedar derecho y centrado.

/** Inclinación hacia los lados (grados) según cómo está la pantalla: cada orientación mira otro eje y con otro signo. */
export function sideAngle(screenAngle, beta, gamma) {
  const a = ((Number(screenAngle) || 0) % 360 + 360) % 360;
  if (a === 90) return beta ?? 0;
  if (a === 270) return -(beta ?? 0);
  if (a === 180) return -(gamma ?? 0);
  return gamma ?? 0;
}

/**
 * Filtro de inclinación: solo cuenta el cambio. La base sigue al ángulo con una constante de `tau` segundos, así una
 * inclinación sostenida se desvanece; `dead` grados de margen para el pulso de la mano y el ruido del sensor.
 * Devuelve la inclinación del ARMY Bomb en radianes (±0,5).
 */
export function createTiltFilter({ tau = 1.5, dead = 2 } = {}) {
  let base = null, last = 0;
  return {
    update(angle, now) {
      if (base == null) { base = angle; last = now; }
      base += (angle - base) * (1 - Math.exp(-Math.min(0.2, Math.max(0, now - last) / 1000) / tau));
      last = now;
      const d = angle - base;
      const rel = Math.abs(d) < dead ? 0 : d - Math.sign(d) * dead;
      return rel === 0 ? 0 : Math.max(-0.5, Math.min(0.5, (-rel / 90) * 0.7));
    },
    reset() { base = null; },
  };
}

/** Empujón lateral de la mano a partir de la aceleración sin gravedad (m/s²); el ruido de un equipo quieto no cuenta. */
export function pushFromAccel(ax, dead = 0.35) {
  if (!ax || Math.abs(ax) < dead) return 0;
  return Math.max(-60, Math.min(60, -(ax - Math.sign(ax) * dead) * 6));
}
