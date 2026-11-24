import { test } from "node:test";
import assert from "node:assert/strict";
import { sideAngle, createTiltFilter, pushFromAccel, screenAccelX } from "../src/motion.js";

// Simula el sensor a 60 eventos por segundo durante `ms` con el ángulo que da `angleAt(t)`; devuelve la última salida.
function run(filter, ms, angleAt, t0 = 0) {
  let out = 0;
  for (let t = t0; t <= t0 + ms; t += 1000 / 60) out = filter.update(angleAt(t), t);
  return out;
}

test("giroscopio: tablet quieta y torcida 30° → el ARMY Bomb vuelve a quedar derecho", () => {
  const f = createTiltFilter();
  run(f, 500, () => 0);
  const right = run(f, 80, () => 30, 500); // la inclina de golpe
  assert.ok(Math.abs(right) > 0.15, `reacciona al inclinarla (${right})`);
  const still = run(f, 8000, () => 30, 600); // y la deja quieta así
  assert.equal(still, 0);
});

test("giroscopio: apoyada en un atril desde el principio, nunca arranca torcido", () => {
  const f = createTiltFilter();
  assert.equal(run(f, 3000, () => -40), 0);
});

test("giroscopio: el pulso de la mano y el ruido del sensor (±1,5°) no lo mueven", () => {
  const f = createTiltFilter();
  const out = run(f, 4000, (t) => 10 + Math.sin(t / 37) * 1.5);
  assert.equal(out, 0);
});

test("giroscopio: celular que se mueve sin parar sigue respondiendo (vaivén de 1 Hz)", () => {
  const f = createTiltFilter();
  let peak = 0;
  for (let t = 0; t < 6000; t += 1000 / 60) peak = Math.max(peak, Math.abs(f.update(Math.sin((t / 1000) * 2 * Math.PI) * 35, t)));
  assert.ok(peak > 0.2, `sigue el movimiento (${peak})`);
});

test("giroscopio: sensible a un vaivén suave de la tablet (10° en un instante se nota)", () => {
  const f = createTiltFilter();
  run(f, 500, () => 0);
  const out = run(f, 100, () => 10, 500);
  assert.ok(Math.abs(out) > 0.12, `se inclina lo suficiente (${out})`);
});

test("giroscopio: la salida nunca pasa de ±0,6 rad", () => {
  const f = createTiltFilter();
  run(f, 200, () => 0);
  assert.equal(run(f, 30, () => 180, 200), -0.6);
});

test("giroscopio: después de girar la pantalla (reset) no queda torcido", () => {
  const f = createTiltFilter();
  run(f, 1000, () => 0);
  f.reset();
  assert.equal(run(f, 100, () => 80, 1000), 0);
});

test("giroscopio: cada orientación de pantalla usa su eje y su signo", () => {
  assert.equal(sideAngle(0, 50, 12), 12);
  assert.equal(sideAngle(180, 50, 12), -12);
  assert.equal(sideAngle(90, 20, 5), 20);
  assert.equal(sideAngle(270, 20, 5), -20);
  assert.equal(sideAngle(-90, 20, 5), -20); // iOS viejo (window.orientation)
  assert.equal(sideAngle(undefined, 20, 5), 5);
});

test("acelerómetro: un equipo quieto (ruido ≤ 0,3 m/s²) no empuja; una sacudida sí", () => {
  assert.equal(pushFromAccel(0), 0);
  assert.equal(pushFromAccel(0.2), 0);
  assert.equal(pushFromAccel(-0.3), 0);
  assert.ok(pushFromAccel(3) < -10);
  assert.ok(pushFromAccel(-3) > 10);
  assert.equal(pushFromAccel(50), -110);
  assert.ok(Math.abs(pushFromAccel(3)) > 40, "un lado a lado normal (3 m/s²) mueve la mano con claridad");
});

test("acelerómetro: el lado a lado se mide en el eje de la pantalla, también en horizontal", () => {
  assert.equal(screenAccelX(0, 2, 5), 2);
  assert.equal(screenAccelX(180, 2, 5), -2);
  assert.equal(screenAccelX(90, 2, 5), -5);
  assert.equal(screenAccelX(270, 2, 5), 5);
  assert.equal(screenAccelX(-90, 2, 5), 5); // iOS viejo (window.orientation)
});
