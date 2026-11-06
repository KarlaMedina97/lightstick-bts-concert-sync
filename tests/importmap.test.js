import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Si un modulepreload o un <script type="module"> aparece antes del importmap, el navegador ignora el mapa: "three"
// no se resuelve y la página queda sin JavaScript (pasó en producción al recargar, con el service worker).
for (const page of ["index.html", "player/index.html"]) {
  test(`${page}: el importmap va antes de cualquier módulo o modulepreload`, () => {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), "utf8");
    const map = html.indexOf('<script type="importmap">');
    assert.ok(map > 0, "falta el importmap");
    for (const m of html.matchAll(/<link[^>]+rel="modulepreload"|<script[^>]+type="module"/g)) assert.ok(m.index > map, `${m[0]} está antes del importmap`);
  });
}
