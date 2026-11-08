import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPacket, v4Fade } from "../src/ble.js";
import { generatePattern, hexToRgb } from "../src/patterns.js";
import { ALBUMS, flatQueue } from "../src/catalog.js";

test("paquete V4: RGB + modo", () => {
  assert.deepEqual([...buildPacket("v4", [255, 0, 128])], [255, 0, 128, 1]);
});

test("paquete SE: 11 bytes con suma de control", () => {
  const p = [...buildPacket("se", [10, 20, 30])];
  assert.equal(p.length, 11);
  assert.equal(p[10], (1 + 1 + 11 + 10 + 20 + 30 - 2) & 0xff);
});

test("la cola recorre los álbumes en orden", () => {
  const q = flatQueue();
  assert.equal(q.length, ALBUMS.reduce((n, a) => n + a.songs.length, 0));
  assert.equal(q[0].album.id, ALBUMS[0].id);
});

test("los patrones dan colores válidos en toda la canción", () => {
  for (const album of ALBUMS) for (const song of album.songs) {
    const p = generatePattern(song, album, 200, { safeMode: true });
    for (let t = 0; t < 200; t += 0.37) {
      for (const v of p.colorAt(t, 2, 5)) assert.ok(v >= 0 && v <= 255 && Number.isFinite(v));
    }
  }
});

test("modo seguro: como máximo 3 destellos por segundo", () => {
  const album = { palette: ["#ffffff"] };
  const song = { bpm: 200, energy: "high" };
  const p = generatePattern(song, album, 100, { styleOverride: "flash", safeMode: true });
  let changes = 0, prev = null;
  for (let t = 10; t < 20; t += 0.01) {
    const on = p.colorAt(t)[0] > 128;
    if (prev !== null && on && !prev) changes++;
    prev = on;
  }
  assert.ok(changes / 10 <= 3, `destellos/s = ${changes / 10}`);
});

test("hexToRgb", () => assert.deepEqual(hexToRgb("#8a2be2"), [138, 43, 226]));

test("V4: el 4.º byte es el fundido del propio ARMY Bomb (≈50 ms por paso)", () => {
  assert.deepEqual([...buildPacket("v4", [1, 2, 3], 0)], [1, 2, 3, 0]);
  assert.deepEqual([...buildPacket("v4", [1, 2, 3], 300)], [1, 2, 3, 255]); // tope de un byte
  assert.equal(v4Fade(null, [255, 0, 0], 20), 0); // primer color: directo
  assert.equal(v4Fade([10, 0, 40], [255, 255, 255], 20), 0); // golpe de brillo: instantáneo
  assert.equal(v4Fade([255, 255, 255], [10, 0, 40], 20), 1); // caída: fundido corto
  assert.equal(v4Fade([128, 0, 255], [255, 0, 128], 120), 2); // Bluetooth lento: funde el hueco
  assert.equal(v4Fade([128, 0, 255], [0, 0, 0], 1000), 4); // nunca más de ~200 ms solo
});

import { versionOf, deployingRun } from "../src/update-watch.js";
test("aviso de actualización: versión de sw.js y despliegue en curso de GitHub", () => {
  assert.equal(versionOf('const CACHE = "pws-v77";'), "pws-v77");
  assert.equal(versionOf("sin versión"), null);
  assert.equal(deployingRun({ total_count: 1, workflow_runs: [{ id: 42, status: "in_progress" }] }), 42);
  assert.equal(deployingRun({ total_count: 0, workflow_runs: [] }), null);
  assert.equal(deployingRun({ total_count: 1, workflow_runs: [{ id: 7, status: "completed" }] }), null);
  assert.equal(deployingRun(null), null);
});

import { checkSequence, extractJson } from "../scripts/check-sequence.mjs";
import { readFileSync } from "node:fs";
test("secuencias por marcas de tiempo: el ejemplo es válido y se detectan huecos, destellos y luz plana", () => {
  const ok = JSON.parse(readFileSync("docs/secuencias/ejemplo-formato.json", "utf8"));
  assert.deepEqual(checkSequence(ok).errors, []);
  const bad = structuredClone(ok);
  bad.tramos[1].inicio = 9; // hueco
  bad.tramos[4].destellosPorSeg = 6;
  bad.tramos[4].acentos = [50, 50.2, 50.4, 50.6];
  const r = checkSequence(bad);
  assert.ok(r.errors.some((e) => /hueco/.test(e)));
  assert.ok(r.errors.some((e) => /destellos\/s/.test(e)));
  assert.ok(r.errors.some((e) => /3 acentos/.test(e)));
  assert.equal(extractJson("Aquí va:\n" + JSON.stringify(ok) + "\n| tabla |").song, ok.song); // respuesta de Gemini con texto
});

import { checkBatch, setDurations } from "../scripts/check-sequence.mjs";
test("secuencias: una plantilla repetida en muchas canciones o con otra duración se rechaza", () => {
  const base = JSON.parse(readFileSync("docs/secuencias/ejemplo-formato.json", "utf8"));
  const copy = (song) => ({ seq: { ...structuredClone(base), song, _aviso: undefined } });
  const batch = checkBatch([copy("a"), copy("b"), copy("c")]);
  assert.ok(batch.get("a").some((e) => /plantilla/.test(e)));
  setDurations({ dynamite: 224 });
  const s = { ...structuredClone(base), _aviso: undefined, song: "dynamite", yt: "gdZLi9oWNZg", duracion: 72 };
  assert.ok(checkSequence(s).errors.some((e) => /el video dura 224 s/.test(e)));
  setDurations({});
});
