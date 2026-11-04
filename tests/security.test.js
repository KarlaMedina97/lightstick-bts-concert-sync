import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeRow } from "../src/leaderboard.js";
import { buildFeedback } from "../src/feedback.js";
import { parseYouTubeId } from "../src/youtube.js";

const ok = { handle: "army_97", network: "x", songId: "dynamite", albumId: "be", score: 1200, accuracy: 90, maxCombo: 20 };

test("acepta una fila válida", () => assert.deepEqual(sanitizeRow(ok), ok));

test("descarta filas con datos peligrosos o fuera de rango", () => {
  assert.equal(sanitizeRow({ ...ok, handle: "<img src=x onerror=alert(1)>" }), null);
  assert.equal(sanitizeRow({ ...ok, network: "javascript:" }), null);
  assert.equal(sanitizeRow({ ...ok, songId: "../../etc" }), null);
  assert.equal(sanitizeRow({ ...ok, score: 1e9 }), null);
  assert.equal(sanitizeRow({ ...ok, accuracy: "100" }), null);
  assert.equal(sanitizeRow(null), null);
});

test("las opiniones se limpian y se recortan", () => {
  const nav = { userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/130", bluetooth: {} };
  const f = buildFeedback({ rating: "5", ease: "4", would_use: "yes", comment: "hola\u0000 " + "a".repeat(2000) }, { nav, songId: "swim" });
  assert.equal(f.rating, 5);
  assert.equal(f.comment.length, 1000);
  assert.ok(!f.comment.includes("\u0000"));
  assert.equal(f.os, "Android");
  assert.equal(f.browser, "Chrome");
  assert.equal(buildFeedback({ rating: "", comment: "   " }, { nav }), null);
  assert.equal(buildFeedback({ rating: "9", would_use: "hack", comment: "x" }, { nav }).would_use, null);
});

test("solo acepta enlaces reales de YouTube", () => {
  assert.equal(parseYouTubeId("https://youtu.be/b4iVv91Z6lY"), "b4iVv91Z6lY");
  assert.equal(parseYouTubeId("https://www.youtube.com/watch?v=b4iVv91Z6lY&t=3"), "b4iVv91Z6lY");
  assert.equal(parseYouTubeId("https://evil.com/watch?v=b4iVv91Z6lY"), null);
  assert.equal(parseYouTubeId("javascript:alert(1)"), null);
});
