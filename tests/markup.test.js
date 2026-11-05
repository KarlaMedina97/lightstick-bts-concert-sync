import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_TIPS } from "../src/tour.js";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../player/index.html", import.meta.url), "utf8");

test("la cola no usa la clase genérica .empty (es la capa absoluta del video y rompía el panel)", () => {
  assert.ok(!/classList\.toggle\("empty"/.test(app), "usar is-empty en vez de empty");
  assert.match(css, /#cq-user-sec\.is-empty \.cq-list/);
  assert.match(css, /#cq-user-sec:not\(\.is-empty\) \.cq-empty \{ display: none; \}/);
});

test("el panel Cola tiene sus tres secciones en orden y fuera de capas absolutas", () => {
  const i = (id) => html.indexOf(`id="${id}"`);
  assert.ok(i("cq-now-title") < i("cq-user-title") && i("cq-user-title") < i("cq-ctx-title"));
  assert.ok(!/class="[^"]*\bempty\b[^"]*"[^>]*id="cq-/.test(html));
});

test("el recorrido es corto (≤ 4 pasos) y sin textos largos", () => {
  assert.ok(DEFAULT_TIPS.length <= 4);
  for (const t of DEFAULT_TIPS) assert.ok(t.text.length <= 90, t.title);
});

test("sin canción, la pestaña marcada es Explorar", () => {
  assert.match(html, /id="view-explore"[^>]*aria-selected="true"/);
  assert.match(html, /id="view-video"[^>]*aria-selected="false"/);
});
