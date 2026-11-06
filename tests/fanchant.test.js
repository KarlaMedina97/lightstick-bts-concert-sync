import { test } from "node:test";
import assert from "node:assert/strict";
import { chantStepMs, CHANT_PAUSE_MS } from "../src/fanchant.js";

test("fanchant: unos 3 s por nombre (al compás de la canción) y 1 s de pausa entre nombres", () => {
  assert.equal(chantStepMs(0), 3000); // sin BPM
  assert.equal(chantStepMs(120), 3000); // 6 tiempos
  assert.equal(CHANT_PAUSE_MS, 1000);
  for (let bpm = 60; bpm <= 220; bpm += 5) {
    const ms = chantStepMs(bpm);
    assert.ok(ms >= 2600 && ms <= 3400, `${bpm} BPM → ${ms} ms`);
  }
});
