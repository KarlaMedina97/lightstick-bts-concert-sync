import { test } from "node:test";
import assert from "node:assert/strict";
import { dominantColor } from "../src/camera.js";

function frame(w, h, fill) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = fill(x, y);
    const i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  return d;
}

test("detecta una lightstick morada sobre fondo oscuro", () => {
  const d = frame(48, 48, (x, y) => (Math.hypot(x - 24, y - 24) < 8 ? [140, 40, 230] : [10, 10, 14]));
  const res = dominantColor(d, 48, 48);
  assert.ok(res);
  const [r, g, b] = res.rgb;
  assert.ok(b > r && r > g, `morado esperado, recibido ${res.rgb}`);
});

test("ignora el blanco quemado y el gris", () => {
  const d = frame(48, 48, (x) => (x < 24 ? [255, 255, 255] : [128, 128, 128]));
  assert.equal(dominantColor(d, 48, 48), null);
});

test("solo mira dentro de la mira central", () => {
  const d = frame(48, 48, (x, y) => (Math.hypot(x - 24, y - 24) < 10 ? [20, 200, 60] : [230, 20, 20]));
  const [r, g] = dominantColor(d, 48, 48, { r: 0.2 }).rgb;
  assert.ok(g > r, "verde del centro, no el rojo del borde");
});

test("una escena oscura no da color", () => {
  const d = frame(48, 48, () => [5, 5, 8]);
  assert.equal(dominantColor(d, 48, 48), null);
});
