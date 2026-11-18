import { test } from "node:test";
import assert from "node:assert/strict";
import { MicSync } from "../src/mic.js";

// Micrófono simulado: espectro de 512 bandas a 48 kHz (≈ 47 Hz por banda), 60 cuadros por segundo.
// `shape(t)` devuelve la energía 0–1 en graves (≤ 250 Hz) y en medios (250 Hz–4 kHz) en el segundo t.
function run(shape, { seconds = 8, safe = true } = {}) {
  const mic = new MicSync({ palette: [[180, 60, 255], [255, 128, 171], [79, 195, 247]], maxChangesPerSec: safe ? 3 : 8 });
  let now = 0, t = 0;
  mic.ctx = { sampleRate: 48000 };
  mic.analyser = {
    fftSize: 1024,
    getByteFrequencyData(a) {
      const { low, mid } = shape(t);
      for (let i = 0; i < a.length; i++) a[i] = i * 47 <= 250 ? 255 * low : i * 47 <= 4000 ? 255 * mid : 4;
    },
  };
  mic.bins = new Uint8Array(512);
  mic.active = true;
  const frames = [];
  for (let f = 0; f < seconds * 60; f++) {
    t = f / 60; now = t * 1000;
    const c = mic.sample(now);
    frames.push({ t, color: mic.colorIndex, bright: Math.max(...c) / 255 });
  }
  return frames;
}
const changes = (fr) => fr.filter((f, i) => i && f.color !== fr[i - 1].color);

// Batería a 120 BPM: golpe corto cada 0,5 s sobre un fondo musical.
const drums = (t) => { const p = t % 0.5; return p < 0.06 ? { low: 0.55, mid: 0.6 } : { low: 0.15, mid: 0.3 }; };
// Voz: sílabas de 150 ms, 4 por segundo, sin graves (el micrófono del teléfono casi no los capta).
const voice = (t) => { const p = t % 0.25; return p < 0.15 ? { low: 0.02, mid: 0.45 } : { low: 0.02, mid: 0.06 }; };
const silence = () => ({ low: 0.01, mid: 0.02 });

test("micrófono: el color cambia con el ritmo de la música", () => {
  const ch = changes(run(drums)).filter((f) => f.t > 1); // el primer segundo se adapta a la habitación
  assert.ok(ch.length >= 10, `solo ${ch.length} cambios de color en 7 s de batería a 120 BPM`);
});

test("micrófono: sigue el ritmo con el micrófono de un teléfono (casi sin graves)", () => {
  const phone = (t) => { const p = t % 0.5; return p < 0.06 ? { low: 0.14, mid: 0.55 } : { low: 0.12, mid: 0.3 }; };
  const ch = changes(run(phone)).filter((f) => f.t > 1);
  assert.ok(ch.length >= 10, `solo ${ch.length} cambios de color en 7 s a 120 BPM`);
});

test("micrófono: la voz también cambia el color, aunque no tenga graves", () => {
  const ch = changes(run(voice)).filter((f) => f.t > 1);
  assert.ok(ch.length >= 8, `solo ${ch.length} cambios de color con la voz`);
});

test("micrófono: el brillo sube con el sonido y en silencio queda tenue, nunca apagado", () => {
  const quiet = run(silence).at(-1).bright;
  const loud = Math.max(...run(drums).filter((f) => f.t > 2).map((f) => f.bright));
  assert.ok(quiet > 0.2 && quiet < 0.5, `en silencio brilla ${quiet}`);
  assert.ok(loud > 0.8, `con música llega solo a ${loud}`);
});

test("micrófono, modo seguro: nunca más de 3 cambios de color por segundo", () => {
  for (const shape of [drums, voice, (t) => ({ low: (t * 20) % 1 < 0.5 ? 0.6 : 0.05, mid: (t * 20) % 1 < 0.5 ? 0.6 : 0.05 })]) {
    const ch = changes(run(shape));
    for (const c of ch) assert.ok(ch.filter((d) => d.t > c.t - 1 && d.t <= c.t).length <= 3, `más de 3 cambios en el segundo que termina en ${c.t.toFixed(2)} s`);
  }
});

test("micrófono, modo seguro: el brillo no parpadea (≤ 3 subidas y bajadas fuertes por segundo)", () => {
  // Un destello = subida y bajada de luminancia de más de 10 %; se cuentan los cambios de dirección grandes.
  const fr = run(voice).filter((f) => f.t > 1);
  let flips = 0, dir = 0, ref = fr[0].bright;
  for (const f of fr) {
    const d = f.bright - ref;
    if (Math.abs(d) > 0.1 && Math.sign(d) !== dir) { if (dir) flips++; dir = Math.sign(d); ref = f.bright; }
    else if (Math.sign(d) === dir) ref = dir > 0 ? Math.max(ref, f.bright) : Math.min(ref, f.bright);
  }
  assert.ok(flips / 2 / 7 <= 3, `${(flips / 2 / 7).toFixed(1)} destellos por segundo`);
});
