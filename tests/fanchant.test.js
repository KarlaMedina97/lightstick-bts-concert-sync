import { test } from "node:test";
import assert from "node:assert/strict";
import { chantStepMs, CHANT_PAUSE_MS, CHANT_STEP_MS } from "../src/fanchant.js";

test("fanchant: 2,5 s por nombre y 0,25 s de pausa entre nombres", () => {
  assert.equal(CHANT_STEP_MS, 2500);
  assert.equal(CHANT_PAUSE_MS, 250);
  for (const bpm of [0, 90, 120, 180]) assert.equal(chantStepMs(bpm), 2500);
});
