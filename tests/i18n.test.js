import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { translate } from "../src/i18n.js";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const norm = (s) => s.replace(/\s+/g, " ").trim();

/** Textos visibles y atributos accesibles de una página (aproximado, sin DOM). */
function pageStrings(file) {
  const h = read(file)
    .replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<([a-z]+)[^>]*(?:lang="ko"|translate="no"|data-lang-toggle)[^>]*>[\s\S]*?<\/\1>/g, "");
  const out = new Set();
  for (const m of h.matchAll(/>([^<>]+)</g)) { const t = norm(m[1]); if (/[a-záéíóúñ]{3}/i.test(t)) out.add(t); }
  for (const m of h.matchAll(/\s(?:aria-label|title|placeholder|data-tip|alt)="([^"]+)"/g)) { const t = norm(m[1]); if (/[a-záéíóúñ]{3}/i.test(t)) out.add(t); }
  return [...out];
}
// Iguales en ambos idiomas (marcas, nombres, palabras compartidas).
const SAME = /^(LumiParty( Sync)?|ARMY Bomb,?|Fan|&nbsp;|https?:\/\/\S+|[a-z0-9-]+\.(com|net|org|io|co)|BTS|Video|YouTube|GitHub|Genius|Bluefy|Fanchant|Nickname|Combo|Normal|Color|Intro|llms.txt|Collar|Aqua|SE|Special Edition|Ver\. \d|SWIM · BTS|Bluetooth:?|Web Bluetooth|Borahae.*|.*[ㄱ-힝].*|[A-Z0-9 .,:'’!?&/~·+-]+)$/;

for (const file of ["index.html", "player/index.html", "privacy/index.html", "terms/index.html", "ai/index.html", "404.html"]) {
  test(`${file}: todo texto visible tiene traducción al inglés`, () => {
    const missing = pageStrings(file).filter((s) => !SAME.test(s) && translate(s) === s);
    assert.deepEqual(missing, [], `Faltan en src/i18n/en-*.js:\n${missing.join("\n")}`);
  });
}

test("traduce exactos, conserva espacios de los bordes y usa patrones con partes traducidas", () => {
  assert.equal(translate("Explorar"), "Explore");
  assert.equal(translate(" Explorar "), " Explore ");
  assert.equal(translate("Paso 2 de 4"), "Step 2 of 4");
  assert.equal(translate("YOUTH (Japón)"), "YOUTH (Japan)");
  assert.equal(translate("Cola de reproducción"), "Queue");
  assert.equal(translate("Butter"), "Butter"); // datos (títulos) no se tocan
});
