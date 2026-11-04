import { test } from "node:test";
import assert from "node:assert/strict";
import { RhythmChallenge } from "../src/rhythm.js";
import { normalizeHandle } from "../src/leaderboard.js";

test("toques exactos al tempo dan puntuación perfecta, sin importar la fase", () => {
  const c = new RhythmChallenge(120); // 0.5 s por tiempo
  const offset = 0.23; // fase arbitraria
  for (let i = 0; i < 20; i++) c.tap(offset + i * 0.5);
  assert.equal(c.accuracy, 1);
  assert.ok(c.qualifies);
  assert.ok(c.score > 0);
});

test("toques al azar rompen el combo", () => {
  const c = new RhythmChallenge(120);
  for (let i = 0; i < 4; i++) c.tap(i * 0.5);
  const r = c.tap(4 * 0.5 + 0.25); // medio tiempo fuera
  assert.equal(r.id, "miss");
  assert.equal(c.combo, 0);
});

test("ignora dobles toques demasiado rápidos", () => {
  const c = new RhythmChallenge(120);
  c.tap(1);
  assert.equal(c.tap(1.05).id, "ignored");
});

test("valida nicknames", () => {
  assert.equal(normalizeHandle("@karla.medina_97"), "karla.medina_97");
  assert.equal(normalizeHandle("a"), null);
  assert.equal(normalizeHandle("<script>"), null);
});
