import { test } from "node:test";
import assert from "node:assert/strict";
import { chantStepMs, CHANT_PAUSE_MS, CHANT_STEP_MS } from "../src/fanchant.js";

test("fanchant: 2,5 s por nombre y 0,25 s de pausa entre nombres", () => {
  assert.equal(CHANT_STEP_MS, 2500);
  assert.equal(CHANT_PAUSE_MS, 250);
  for (const bpm of [0, 90, 120, 180]) assert.equal(chantStepMs(bpm), 2500);
});

test("velocidad del fanchant: más rápida acorta cada nombre, nunca a menos de 1,1 s", async () => {
  const { chantStepMs, CHANT_STEP_MS } = await import("../src/fanchant.js");
  assert.equal(chantStepMs(0, 1), CHANT_STEP_MS);
  assert.ok(chantStepMs(0, 0.75) > CHANT_STEP_MS);
  assert.ok(chantStepMs(0, 1.5) < CHANT_STEP_MS);
  assert.ok(chantStepMs(0, 2) >= 1100);
  assert.equal(chantStepMs(0, 7), CHANT_STEP_MS); // valor desconocido → normal
});
