import { test } from "node:test";
import assert from "node:assert/strict";
import { sideAngle, createTiltFilter, pushFromAccel, screenAccelX, screenRoll } from "../src/motion.js";

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

// Gravedad (accelerationIncludingGravity) con el equipo de pie y girado `deg` grados hacia la derecha.
const upright = (deg, screen = 0) => {
  const r = (deg * Math.PI) / 180, sx = -9.81 * Math.sin(r), sy = 9.81 * Math.cos(r);
  // del plano de la pantalla a los ejes del equipo según la orientación
  if (screen === 90) return [sy, -sx];
  if (screen === 270) return [-sy, sx];
  if (screen === 180) return [-sx, -sy];
  return [sx, sy];
};

test("de pie: inclinarlo hacia los lados da el ángulo, en las cuatro orientaciones", () => {
  for (const s of [0, 90, 180, 270]) {
    const [x, y] = upright(25, s);
    const r = screenRoll(s, x, y);
    assert.ok(Math.abs(r.angle - 25) < 0.01, `pantalla ${s}°: ${r.angle}`);
    assert.ok(r.strength > 0.99);
  }
});

test("de pie: mecerlo perpendicular a la pantalla no lo inclina; de lado sí", () => {
  // Hacia adelante y atrás, la gravedad sale de la pantalla (z) y el ángulo en el plano no cambia.
  const r = (pitch) => screenRoll(0, 0, 9.81 * Math.cos((pitch * Math.PI) / 180));
  assert.equal(Math.abs(r(0).angle), 0);
  assert.equal(Math.abs(r(40).angle), 0);
  const f = createTiltFilter();
  run(f, 500, () => 0);
  const side = run(f, 80, () => screenRoll(0, ...upright(20)).angle, 500);
  assert.ok(Math.abs(side) > 0.15, `reacciona de lado (${side})`);
});

test("acostado sobre la mesa: la gravedad no sirve (strength baja) y se usa el giroscopio", () => {
  assert.ok(screenRoll(0, 0.3, 0.2).strength < 0.1);
});

test("filtro: pasar por ±180° no da un salto", () => {
  const f = createTiltFilter();
  run(f, 500, () => 178);
  const out = run(f, 80, () => -178, 500); // 4° más allá, no 356° atrás
  assert.ok(Math.abs(out) < 0.1, `sin salto (${out})`);
});

test("diagonal: inclinarlo y dejarlo quieto en diagonal no lo deja trabado (vuelve en menos de 1,5 s)", () => {
  const f = createTiltFilter();
  run(f, 500, () => 0);
  const moving = run(f, 300, (t) => ((t - 500) / 300) * 40, 500); // gira 40° en 0,3 s
  assert.ok(Math.abs(moving) > 0.3, `se inclina mientras se mueve (${moving})`);
  const still = run(f, 1500, () => 40, 820); // queda quieto en diagonal
  assert.equal(still, 0);
});

test("vaivén continuo de lado a lado: sigue respondiendo (no se queda pegado a un lado)", () => {
  const f = createTiltFilter();
  const outs = [];
  for (let t = 0; t <= 4000; t += 1000 / 60) outs.push(f.update(Math.sin(t / 250) * 25, t));
  const late = outs.slice(-120);
  assert.ok(Math.max(...late) > 0.1 && Math.min(...late) < -0.1, "va a ambos lados");
});

test("brusco: sacudidas violentas (saltos de ±70° y vueltas por ±180°) y luego quieto → vuelve derecho", () => {
  const f = createTiltFilter();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  let a = 30;
  for (let t = 0; t <= 2000; t += 1000 / 60) {
    a += rnd() * 70;
    a = ((a + 540) % 360) - 180; // el sensor da la vuelta en ±180
    const out = f.update(a, t);
    assert.ok(Number.isFinite(out) && Math.abs(out) <= 0.6, `salida acotada (${out})`);
  }
  const still = run(f, 1500, () => a, 2010);
  assert.equal(still, 0);
});
