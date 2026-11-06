import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { colorName } from "../src/palette.js";
import { speakable } from "../src/announce.js";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const player = read("player/index.html");
const app = read("src/app.js");

test("regiones vivas siempre presentes y el aviso visible no es región viva", () => {
  assert.match(player, /id="sr-polite"[^>]*role="status"/);
  assert.match(player, /id="sr-assertive"[^>]*role="alert"/);
  assert.ok(!/id="sr-(polite|assertive)"[^>]*hidden/.test(player));
  assert.ok(!/id="toast"[^>]*aria-live/.test(player));
  assert.ok(!/id="style-chip"[^>]*aria-live/.test(player), "el chip de luces no debe hablar solo");
});

test("sin aria-haspopup=\"true\" (los desplegables usan aria-expanded)", () => {
  assert.ok(!/aria-haspopup="true"/.test(player));
  assert.ok(!/aria-haspopup", "true"/.test(app));
});

test("hangul visible marcado con lang=ko o decorativo", () => {
  assert.match(player, /id="chant-name"[^>]*lang="ko"/);
});

test("cada hoja de estilos tiene colores forzados", () => {
  for (const f of ["styles.css", "tour.css", "landing.css"]) assert.match(read(f), /@media \(forced-colors: active\)/, f);
});

test("un solo h1 en el reproductor y el dock es una región, no navegación", () => {
  assert.equal(player.match(/<h1\b/g).length, 1);
  assert.match(player, /<section id="dock"[^>]*aria-label="Controles del reproductor"/);
});

test("color en palabras y avisos sin emojis", () => {
  assert.equal(colorName([138, 43, 226]), "morado intenso");
  assert.equal(colorName([255, 105, 180], "en"), "pink bright");
  assert.equal(colorName([0, 0, 0]), "apagado");
  assert.equal(speakable("¡SWIM conectado! Borahae 💜"), "¡SWIM conectado! Borahae");
});

test("cada id aparece una sola vez y las etiquetas de bloque cierran (páginas)", () => {
  for (const page of ["index.html", "player/index.html", "privacy/index.html", "terms/index.html", "ai/index.html", "404.html"]) {
    const html = read(page);
    const seen = new Map();
    for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) seen.set(id, (seen.get(id) ?? 0) + 1);
    assert.deepEqual([...seen].filter(([, n]) => n > 1).map(([id]) => id), [], `${page}: ids repetidos`);
    const body = html.slice(html.indexOf("<body"));
    for (const tag of ["div", "section", "aside", "ul", "ol", "form"]) {
      const open = body.match(new RegExp(`<${tag}[\\s>]`, "g"))?.length ?? 0;
      const close = body.match(new RegExp(`</${tag}>`, "g"))?.length ?? 0;
      assert.equal(open, close, `${page}: <${tag}> abiertos ${open}, cerrados ${close}`);
    }
  }
});

test("el panel lateral reúne Ahora suena, Cola y Tus videos (sin ventanas sueltas)", () => {
  for (const id of ["rs-now", "rs-cola", "rp-now", "cola-body", "videos-page", "vp-back", "form-add", "films", "lib-n-mine"]) assert.match(player, new RegExp(`id="${id}"`));
  assert.doesNotMatch(player, /id="panel-(queue|cola)"/);
  assert.doesNotMatch(app, /panel-(queue|cola)/);
});
