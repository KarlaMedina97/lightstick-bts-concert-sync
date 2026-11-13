import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { liteReason, slowFrames, LITE_TEXT } from "../src/lite.js";

const no = () => false;

test("versión ligera: ahorro de datos, red lenta y equipo justo", () => {
  assert.equal(liteReason({ connection: { saveData: true, effectiveType: "4g" } }, no), "datos");
  assert.equal(liteReason({}, (q) => q === "(prefers-reduced-data: reduce)"), "datos");
  for (const effectiveType of ["slow-2g", "2g", "3g"]) assert.equal(liteReason({ connection: { effectiveType } }, no), "red");
  assert.equal(liteReason({ connection: { effectiveType: "4g", downlink: 0.6 } }, no), "red");
  assert.equal(liteReason({ deviceMemory: 2, hardwareConcurrency: 8 }, no), "equipo");
  assert.equal(liteReason({ deviceMemory: 8, hardwareConcurrency: 2 }, no), "equipo");
  // Sin datos (Safari, Firefox) o con un equipo normal: versión completa (decide la medición de cuadros).
  assert.equal(liteReason({}, no), "");
  assert.equal(liteReason({ connection: { effectiveType: "4g", downlink: 10 }, deviceMemory: 4, hardwareConcurrency: 4 }, no), "");
  for (const k of ["datos", "red", "equipo", "lento"]) assert.ok(LITE_TEXT[k]);
});

test("versión ligera: cuadros lentos medidos", () => {
  assert.equal(slowFrames(Array(30).fill(16.7)), false);
  assert.equal(slowFrames(Array(30).fill(45)), true);
  assert.equal(slowFrames([...Array(20).fill(16), ...Array(12).fill(70)]), true); // muchos tirones
  assert.equal(slowFrames([...Array(28).fill(16), 120, 90]), false); // un par sueltos no
  assert.equal(slowFrames([40, 40]), false); // muy pocas muestras: no se decide
});

test("versión ligera: three.js ya no se precarga fijo en el HTML (lo pide landing.js si hace falta)", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /rel="modulepreload"[^>]+three/);
  const js = readFileSync(new URL("../src/landing.js", import.meta.url), "utf8");
  assert.match(js, /if \(!liteWhy\) \{\n\s+for \(const href of \["\/vendor\/three\/build\/three\.module\.min\.js"/);
});
