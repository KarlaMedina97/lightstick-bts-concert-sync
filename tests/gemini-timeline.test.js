import { test } from "node:test";
import assert from "node:assert/strict";
import { checkTimeline, fitTimeline } from "../scripts/gemini-timeline.mjs";

const tramo = (inicio, fin) => ({ inicio, fin, escena: "escenario", ambiente: "fuerza", colores: ["#aa00ff"] });

test("Gemini: el reloj inflado se escala a la duración real y conserva proporciones", () => {
  // Como Dope: dice 419 s en un video de 257 s.
  const raw = { aura: "x", tramos: [tramo(0, 100), tramo(100, 250), tramo(250, 419)] };
  assert.ok(checkTimeline(raw, 257).length, "sin ajuste se rechaza");
  const { tl, notas } = fitTimeline(raw, 257);
  assert.deepEqual(checkTimeline(tl, 257), []);
  assert.equal(tl.tramos.at(-1).fin, 257);
  assert.ok(Math.abs(tl.tramos[1].inicio - 100 * 257 / 419) < 0.1);
  assert.match(notas[0], /escalados/);
  assert.equal(raw.tramos[2].fin, 419, "no toca el original");
});

test("Gemini: los tramos sin duración se quitan sin dejar huecos", () => {
  const raw = { aura: "x", tramos: [tramo(0, 50), tramo(50, 50), tramo(60, 120)] };
  const { tl } = fitTimeline(raw, 120);
  assert.equal(tl.tramos.length, 2);
  assert.deepEqual(checkTimeline(tl, 120), []);
});

test("Gemini: no se escala lo que no tiene arreglo razonable", () => {
  const raw = { aura: "x", tramos: [tramo(0, 30)] };
  const { tl } = fitTimeline(raw, 300); // factor 10: probablemente vio otro video
  assert.ok(checkTimeline(tl, 300).length);
  assert.deepEqual(fitTimeline({ aura: "x", tramos: [tramo(0, 120)] }, 120).notas, []);
});
