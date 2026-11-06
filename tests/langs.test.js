import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LANGS } from "../src/i18n.js";

const PARTS = ["landing", "player", "app"];
const OTHER = LANGS.map(([c]) => c).filter((c) => c !== "es" && c !== "en"); // los que ofrece el menú

test("idiomas: el menú ofrece al menos español, inglés, portugués e indonesio", () => {
  const codes = LANGS.map(([c]) => c);
  for (const c of ["es", "en", "pt", "id"]) assert.ok(codes.includes(c), c);
});

for (const code of OTHER) {
  test(`idioma ${code}: mismas claves y patrones que el inglés (nada queda sin traducir)`, async () => {
    for (const p of PARTS) {
      const en = await import(`../src/i18n/en-${p}.js`);
      const x = await import(`../src/i18n/${code}-${p}.js`);
      const missing = Object.keys(en.default).filter((k) => !(k in x.default));
      assert.deepEqual(missing, [], `${code}-${p}: faltan ${missing.length}`);
      const empty = Object.entries(x.default).filter(([, v]) => typeof v !== "string" || !v.trim()).map(([k]) => k);
      assert.deepEqual(empty, [], `${code}-${p}: vacías`);
      assert.equal(x.patterns.length, en.patterns.length, `${code}-${p}: patrones`);
      // Cada patrón conserva la expresión del español (lo que se traduce es la salida).
      x.patterns.forEach(([re], i) => assert.equal(String(re), String(en.patterns[i][0]), `${code}-${p} patrón ${i}`));
    }
  });
}

test("idiomas: los diccionarios nuevos se publican y quedan en caché sin conexión", () => {
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  for (const code of OTHER) for (const p of PARTS) assert.match(sw, new RegExp(`"src/i18n/${code}-${p}\\.js"`), `${code}-${p} en sw.js`);
});
