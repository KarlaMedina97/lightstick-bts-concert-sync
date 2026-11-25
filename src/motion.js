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
 * Devuelve la inclinación del ARMY Bomb en radianes (±0,6). Sensibilidad subida tras probar en iPad (2026-11-23):
 * con 0,7 y tau 1,5 s un vaivén normal de la tablet casi no se notaba.
 */
export function createTiltFilter({ tau = 2, dead = 1.5, gain = 1.6, stillTau = 0.35, stillRate = 12 } = {}) {
  let base = null, last = 0, prev = null, off = 0, rate = 0;
  return {
    update(angle, now) {
      // Sin saltos de 360° al pasar por ±180 (el ángulo de la gravedad da la vuelta completa).
      if (prev != null) { const d = angle + off - prev; if (d > 180) off -= 360; else if (d < -180) off += 360; }
      angle += off;
      const dt = Math.min(0.2, Math.max(0, now - last) / 1000);
      // Velocidad de giro suavizada (°/s): el equipo quieto (en diagonal o como sea) se nota en ~0,2 s.
      if (prev != null && dt > 0) rate += (Math.abs(angle - prev) / dt - rate) * (1 - Math.exp(-dt / 0.12));
      prev = angle;
      if (base == null) { base = angle; last = now; rate = 0; }
      // Quieto, vuelve rápido a quedar derecho (antes tardaba varios segundos y parecía trabado en diagonal).
      const t = rate < stillRate ? stillTau : tau;
      base += (angle - base) * (1 - Math.exp(-dt / t));
      last = now;
      const d = angle - base;
      const rel = Math.abs(d) < dead ? 0 : d - Math.sign(d) * dead;
      return rel === 0 ? 0 : Math.max(-0.6, Math.min(0.6, (-rel / 90) * gain));
    },
    reset() { base = null; prev = null; off = 0; rate = 0; },
  };
}

/**
 * Aceleración (sin gravedad, m/s²) hacia la derecha de la pantalla tal como está: en horizontal, el lado a lado de
 * la persona es el eje y del equipo, no el x (antes en una tablet acostada no se notaba el vaivén).
 */
export function screenAccelX(screenAngle, x, y) {
  const a = ((Number(screenAngle) || 0) % 360 + 360) % 360;
  if (a === 90) return -(y ?? 0);
  if (a === 270) return y ?? 0;
  if (a === 180) return -(x ?? 0);
  return x ?? 0;
}

/** Componente vertical (hacia arriba de la pantalla tal como está) de un vector del equipo. */
export function screenAccelY(screenAngle, x, y) {
  const a = ((Number(screenAngle) || 0) % 360 + 360) % 360;
  if (a === 90) return x ?? 0;
  if (a === 270) return -(x ?? 0);
  if (a === 180) return -(y ?? 0);
  return y ?? 0;
}

/**
 * Inclinación hacia los lados con el equipo en la mano y de pie (como un lightstick): el giro sobre el eje que sale
 * de la pantalla, medido con la gravedad en el plano de la pantalla. Positivo = la parte de arriba va a la derecha.
 * `strength` (0–1) dice cuánto de la gravedad cae en la pantalla: casi 0 con el equipo acostado sobre una mesa,
 * donde este ángulo no sirve y se usa la inclinación del giroscopio (sideAngle).
 * Antes se usaba solo gamma/beta: de pie, esos ángulos miden el giro hacia adelante y atrás, y el ARMY Bomb se
 * movía al mecer el equipo perpendicular a la pantalla y no al inclinarlo de lado (2026-11-24).
 */
export function screenRoll(screenAngle, gx, gy) {
  const sx = screenAccelX(screenAngle, gx, gy), sy = screenAccelY(screenAngle, gx, gy);
  return { angle: (Math.atan2(-sx, sy) * 180) / Math.PI, strength: Math.min(1, Math.hypot(sx, sy) / 9.81) };
}

/** Empujón lateral de la mano a partir de la aceleración (m/s²); el ruido de un equipo quieto no cuenta. */
export function pushFromAccel(ax, dead = 0.3, gain = 18) {
  if (!ax || Math.abs(ax) <= dead) return 0;
  return Math.max(-110, Math.min(110, -(ax - Math.sign(ax) * dead) * gain));
}
