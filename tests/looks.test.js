import { test } from "node:test";
import assert from "node:assert/strict";
import { ALBUMS } from "../src/catalog.js";
import { SONG_LOOKS, STYLES, generatePattern, lookFor } from "../src/patterns.js";

const songs = ALBUMS.flatMap((a) => a.songs.map((s) => ({ ...s, album: a })));
const ids = new Set(songs.map((s) => s.id));

test("looks por canción: ids del catálogo, 9 estilos válidos y colores hex", () => {
  for (const [id, look] of Object.entries(SONG_LOOKS)) {
    assert.ok(ids.has(id), `no existe ${id}`);
    if (look.plan) {
      assert.equal(look.plan.length, 9, id);
      for (const st of look.plan) assert.ok(STYLES[st], `${id}: estilo ${st}`);
    }
    for (const c of look.palette ?? []) assert.match(c, /^#[0-9a-f]{6}$/i, id);
  }
});

test("las variantes heredan el look de su canción y no se cuelan otras", () => {
  assert.equal(lookFor("butter-fallon"), SONG_LOOKS.butter);
  assert.equal(lookFor("fire-dance-practice"), SONG_LOOKS.fire);
  assert.equal(lookFor("run-bts-busan"), null);
  assert.equal(lookFor("on-the-street"), null);
  assert.equal(lookFor("butterfly-practice-record"), null);
});

// Destello (aprox. WCAG 2.3.1): subida y bajada de luminancia relativa ≥ 0,2 cada una.
const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
function maxFlashesPerSecond(p, dur, fps = 60) {
  const L = [];
  for (let f = 0; f < dur * fps; f++) L.push(lum(p.colorAt(f / fps, 0, 1)));
  const events = [];
  let dir = 0, ref = L[0], refIdx = 0;
  for (let f = 1; f < L.length; f++) {
    if (dir >= 0 && L[f] > ref) { ref = L[f]; refIdx = f; }
    if (dir <= 0 && L[f] < ref) { ref = L[f]; refIdx = f; }
    if (Math.abs(L[f] - ref) >= 0.2 && Math.sign(L[f] - ref) !== dir) { events.push(f); dir = Math.sign(L[f] - ref); ref = L[f]; refIdx = f; }
  }
  // Un destello = dos cambios opuestos. Máximo en cualquier ventana de 1 s.
  let best = 0;
  for (let i = 0; i < events.length; i++) {
    let j = i; while (j < events.length && events[j] - events[i] < fps) j++;
    best = Math.max(best, Math.floor((j - i) / 2));
  }
  return best;
}

test("modo seguro: ningún look pasa de 3 destellos por segundo", () => {
  const sample = ["fire", "dynamite", "mic-drop", "not-today", "my-universe", "idol", "spring-day", "on", "hooligan"];
  for (const id of sample) {
    const s = songs.find((x) => x.id === id);
    const p = generatePattern(s, s.album, 90, { safeMode: true });
    const fl = maxFlashesPerSecond(p, 90);
    assert.ok(fl <= 3, `${id}: ${fl} destellos/s`);
  }
});

test("modo seguro: todo el catálogo y BPM de 60 a 240 sin pasar de 3 destellos por segundo", () => {
  for (const s of songs) {
    const p = generatePattern(s, s.album, 200, { safeMode: true });
    const fl = maxFlashesPerSecond(p, 200, 30);
    assert.ok(fl <= 3, `${s.id} (${s.bpm} BPM): ${fl} destellos/s`);
  }
  const base = songs.find((x) => x.id === "dope");
  for (let bpm = 60; bpm <= 240; bpm += 4) {
    for (const energy of ["high", "mid"]) {
      const p = generatePattern({ id: "x", bpm, energy }, base.album, 200, { safeMode: true });
      const fl = maxFlashesPerSecond(p, 200, 30);
      assert.ok(fl <= 3, `${bpm} BPM ${energy}: ${fl} destellos/s`);
    }
  }
});

test("las baladas no destellan", () => {
  const s = songs.find((x) => x.id === "spring-day");
  const p = generatePattern(s, s.album, 120, { safeMode: true });
  assert.ok(p.sections.every((sec) => !["flash", "pulse", "sparkle", "disco"].includes(sec.style)));
});

import { dominantColors } from "../src/videopalette.js";

test("colores del video: dominantes y vivos; gris o negro no cuentan", () => {
  const px = (r, g, b, n) => Array.from({ length: n }, () => [r, g, b, 255]).flat();
  const data = new Uint8ClampedArray([...px(200, 20, 30, 300), ...px(20, 40, 200, 150), ...px(128, 128, 128, 400), ...px(5, 5, 5, 300)]);
  assert.deepEqual(dominantColors(new Uint8ClampedArray([...px(200, 20, 30, 5), ...px(10, 10, 10, 995)])), []); // casi sin color
  const c = dominantColors(data);
  assert.equal(c.length, 2);
  assert.match(c[0], /^#ff/); // rojo primero (más peso), llevado a brillo pleno
  assert.deepEqual(dominantColors(new Uint8ClampedArray(px(120, 120, 120, 100))), []);
});

test("con colores del video: cada sección usa su cuadro, y el modo seguro se respeta", () => {
  const video = { overall: ["#ff0000", "#00ff00", "#0000ff"], frames: [["#ffffff", "#ff00ff"], ["#00ffff"], ["#ffff00", "#ff0000"]] };
  for (const id of ["dynamite", "idol", "dope", "spring-day", "fire"]) {
    const s = songs.find((x) => x.id === id);
    const p = generatePattern(s, s.album, 200, { safeMode: true, video });
    assert.ok(maxFlashesPerSecond(p, 200, 30) <= 3, id);
    if (id === "dynamite") assert.deepEqual(p.sections[3].color, [0, 255, 255]); // coro → cuadro del 50 %
    if (id === "fire") assert.deepEqual(p.sections[3].color.slice(0, 1), [255]); // FIRE conserva su rojo
  }
});

test("los momentos culminantes brillan más que los suaves", () => {
  const s = songs.find((x) => x.id === "dope");
  const p = generatePattern(s, s.album, 200, { safeMode: true });
  const coroFinal = p.sections.find((x) => x.label === "coro final"), puente = p.sections.find((x) => x.label === "puente");
  assert.ok(coroFinal.gain > puente.gain && coroFinal.div < puente.div);
});

test("la fase marcada mueve el latido al golpe de la música", () => {
  const s = songs.find((x) => x.id === "dope");
  const a = generatePattern(s, s.album, 200, { safeMode: true, styleOverride: "pulse" });
  const b = generatePattern(s, s.album, 200, { safeMode: true, styleOverride: "pulse", phase: 0.2 });
  // El golpe que caía en t=70 s (mitad del coro) ahora cae en t=70,2 s.
  assert.deepEqual(b.colorAt(70.2).map(Math.round), a.colorAt(70).map(Math.round));
});
