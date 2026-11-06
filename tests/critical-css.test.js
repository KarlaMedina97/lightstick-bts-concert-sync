// CSS crítico en línea (<style id="critico">): permite pintar la portada y la pantalla de carga del reproductor sin
// esperar las hojas en una red lenta. Debe ser copia literal de las hojas, así lo que se ve al terminar de cargar es
// idéntico. Si cambias una regla de landing.css o fonts/fonts.css que esté copiada, actualiza la copia del <head>.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const norm = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
const inline = (html) => {
  const m = read(html).match(/<style id="critico">([\s\S]*?)<\/style>/);
  assert.ok(m, `${html} debe tener <style id="critico">`);
  return norm(m[1]);
};
/** Reglas de primer nivel y las que hay dentro de @media (un nivel), como texto normalizado. */
function rules(css) {
  const out = [];
  let depth = 0, start = 0, head = null, hstart = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === "{") {
      if (depth === 0 && /^@(media|supports)/.test(css.slice(start, i).trim())) { head = css.slice(start, i).trim(); hstart = i + 1; }
      else if (depth === 1 && head) start = start < hstart ? hstart : start;
      depth++;
    } else if (css[i] === "}") {
      depth--;
      if (depth === 0) { if (!head) out.push(css.slice(start, i + 1).trim()); head = null; start = i + 1; }
      else if (depth === 1 && head) { out.push(css.slice(start, i + 1).trim()); start = i + 1; }
    }
  }
  return out.filter(Boolean);
}
const fonts = norm(read("fonts/fonts.css"));

test("la portada: cada regla en línea es copia de landing.css o de fonts.css", () => {
  const sheet = norm(read("landing.css"));
  const list = rules(inline("index.html"));
  assert.ok(list.length > 50, "el CSS crítico de la portada está casi vacío");
  for (const r of list) {
    if (r.startsWith("@font-face")) assert.ok(fonts.includes(r.replaceAll("url(fonts/", "url(./")), `@font-face distinto de fonts/fonts.css: ${r.slice(0, 120)}`);
    else assert.ok(sheet.includes(r), `regla en línea que no está igual en landing.css: ${r.slice(0, 160)}`);
  }
});

test("la portada pinta sin esperar hojas: no hay hojas en el <head>", () => {
  const html = read("index.html");
  const head = html.slice(0, html.indexOf("</head>"));
  assert.doesNotMatch(head, /<link rel="stylesheet"/);
  assert.ok(html.indexOf('<link rel="stylesheet" href="landing.css">') > html.indexOf('id="inicio"'), "landing.css va después de la portada");
});

test("el reproductor: la pantalla de carga solo toca .boot y styles.css la oculta", () => {
  const list = rules(inline("player/index.html"));
  for (const r of list) {
    if (r.startsWith("@font-face")) { assert.ok(fonts.includes(r.replaceAll("url(../fonts/", "url(./")), `@font-face distinto de fonts/fonts.css: ${r.slice(0, 120)}`); continue; }
    if (r.startsWith("@keyframes")) { assert.match(r, /^@keyframes boot-/); continue; }
    const sel = r.slice(0, r.indexOf("{"));
    for (const s of sel.split(",")) assert.match(s.trim(), /^\.boot\b/, `regla de carga fuera de .boot: ${r.slice(0, 120)}`);
  }
  assert.ok(norm(read("styles.css")).includes(".boot { display: none; }"), "styles.css debe ocultar .boot");
  const html = read("player/index.html");
  assert.ok(html.indexOf('<div class="boot"') < html.indexOf('<link rel="stylesheet" href="../styles.css">'), "la pantalla de carga va antes de styles.css");
});
