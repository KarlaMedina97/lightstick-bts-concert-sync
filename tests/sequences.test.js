import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeSequence, exportSequence, MAX_SEGMENTS } from "../src/sequences.js";
import { STYLES, generatePattern } from "../src/patterns.js";
import { ALBUMS } from "../src/catalog.js";

const STYLE_IDS = Object.keys(STYLES);
const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
function flashesPerSecond(p, dur, fps = 60) {
  const L = []; for (let f = 0; f < dur * fps; f++) L.push(lum(p.colorAt(f / fps)));
  const ev = []; let dir = 0, ref = L[0];
  for (let f = 1; f < L.length; f++) {
    if (dir >= 0 && L[f] > ref) ref = L[f];
    if (dir <= 0 && L[f] < ref) ref = L[f];
    if (Math.abs(L[f] - ref) >= 0.2 && Math.sign(L[f] - ref) !== dir) { ev.push(f); dir = Math.sign(L[f] - ref); ref = L[f]; }
  }
  let best = 0; for (let i = 0; i < ev.length; i++) { let j = i; while (j < ev.length && ev[j] - ev[i] < fps) j++; best = Math.max(best, Math.floor((j - i) / 2)); }
  return best;
}

test("editor: valida lo importado (nunca confía en el archivo)", () => {
  assert.equal(sanitizeSequence(null, STYLE_IDS), null);
  assert.equal(sanitizeSequence({ segments: [] }, STYLE_IDS), null);
  const s = sanitizeSequence({ segments: [
    { start: 12.34, part: "coro", style: "hit", colors: ["#FF0000", "javascript:alert(1)", "#00ff00", "#0000ff", "#ffffff"], lvl: 9 },
    { start: 3, part: "nada", style: "<img>", colors: ["#123456"], lvl: -1 },
    { start: 12.8, part: "puente", style: "duo", colors: ["#abcdef"] }, // a menos de 1 s: reemplaza a la anterior
    { start: "x", colors: ["#ffffff"] },
  ] }, STYLE_IDS);
  assert.equal(s.segments.length, 2);
  assert.equal(s.segments[0].start, 0); // la primera siempre empieza en 0
  assert.equal(s.segments[0].part, "verso");
  assert.equal(s.segments[0].style, "breathe");
  assert.equal(s.segments[0].lvl, 0.1);
  assert.deepEqual(s.segments[1], { start: 12.8, part: "puente", style: "duo", colors: ["#abcdef"], lvl: 0.6 });
  const many = sanitizeSequence({ segments: Array.from({ length: 500 }, (_, i) => ({ start: i * 2, colors: ["#ffffff"] })) }, STYLE_IDS);
  assert.ok(many.segments.length <= MAX_SEGMENTS);
});

test("editor: las secciones editadas mandan, con sus colores, y el modo seguro se respeta con cualquier estilo", () => {
  const album = ALBUMS[0], song = { ...album.songs[0], bpm: 180 };
  for (const style of ["flash", "hit", "disco", "sparkle", "pulse"]) {
    const seq = sanitizeSequence({ segments: [
      { start: 0, part: "intro", style: "breathe", colors: ["#ff0000", "#0000ff"], lvl: 0.5 },
      { start: 20, part: "coro", style, colors: ["#ff0000", "#ffffff", "#00ff00"], lvl: 1 },
      { start: 60, part: "final", style: "borahae", colors: ["#8a2be2"], lvl: 0.5 },
    ] }, STYLE_IDS);
    const p = generatePattern(song, album, 90, { safeMode: true, custom: seq });
    assert.equal(p.sections.length, 3);
    assert.deepEqual(p.sections[1].color, [255, 0, 0]);
    assert.deepEqual(p.sections[1].accent, [255, 255, 255]);
    assert.equal(p.sections[1].style, style);
    assert.ok(flashesPerSecond(p, 90) <= 3, `${style}: más de 3 destellos/s`);
  }
});

test("editor: el archivo exportado se puede volver a importar igual", () => {
  const seq = sanitizeSequence({ segments: [{ start: 0, part: "intro", style: "aurora", colors: ["#ff00aa"], lvl: 0.4 }, { start: 30, part: "coro", style: "duo", colors: ["#ff00aa", "#00e5ff"], lvl: 0.9 }] }, STYLE_IDS);
  const file = JSON.parse(exportSequence(seq, { id: "idol", title: "IDOL", yt: "pBuZEGYXA6E" }));
  assert.equal(file.app, "lumiparty");
  assert.deepEqual(sanitizeSequence(file, STYLE_IDS), seq);
});
