import { test } from "node:test";
import assert from "node:assert/strict";
import { chantStepMs } from "../src/fanchant.js";

test("fanchant: un nombre cada 2 tiempos (≈ 1 s), como corea el público", () => {
  assert.equal(chantStepMs(130), 923); // DNA: 2 tiempos a 130 BPM
  assert.equal(chantStepMs(0), 1000); // sin BPM
  assert.equal(chantStepMs(60), 1000); // balada lenta: medio paso (1 s), no 2 s por nombre
  assert.equal(chantStepMs(200), 1200); // muy rápida: paso doble, con tope cómodo
  for (let bpm = 60; bpm <= 220; bpm += 5) {
    const ms = chantStepMs(bpm);
    assert.ok(ms >= 850 && ms <= 1200, `${bpm} BPM → ${ms} ms`);
  }
});
