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
