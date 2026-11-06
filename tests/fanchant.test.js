import { test } from "node:test";
import assert from "node:assert/strict";
import { chantStepMs } from "../src/fanchant.js";

test("fanchant: tiempo para decir cada nombre completo (1,1–1,5 s), al compás de la canción", () => {
  assert.equal(chantStepMs(130), 1385); // DNA: 2 tiempos (0,92 s) no alcanzan → 3 tiempos
  assert.equal(chantStepMs(100), 1200); // 2 tiempos
  assert.equal(chantStepMs(0), 1200); // sin BPM
  assert.equal(chantStepMs(60), 1100); // balada lenta: un tiempo por nombre, no 2 s
  for (let bpm = 60; bpm <= 220; bpm += 5) {
    const ms = chantStepMs(bpm);
    assert.ok(ms >= 1100 && ms <= 1500, `${bpm} BPM → ${ms} ms`);
  }
});
