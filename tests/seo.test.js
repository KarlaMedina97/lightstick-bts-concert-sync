// Datos estructurados: la guía describe sus preguntas frecuentes en cada idioma y la portada separa la marca de
// sitios con nombre parecido.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LOCALES, localizePage, withAlternates } from "../scripts/localize-pages.mjs";

const guide = readFileSync(new URL("../guide/index.html", import.meta.url), "utf8");
const ld = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const questions = (html) => (html.match(/<section id="preguntas">([\s\S]*?)<\/section>/)[1].match(/<h3>/g) ?? []).length;

test("guía: FAQPage con cada pregunta visible, en español y en cada idioma", async () => {
  const pages = [["es", withAlternates(guide, "/guide/")]];
  for (const code of Object.keys(LOCALES)) pages.push([code, (await localizePage(guide, "/guide/", code)).html]);
  for (const [code, html] of pages) {
    const graph = ld(html).flatMap((d) => d["@graph"] ?? [d]);
    const faq = graph.find((n) => n["@type"] === "FAQPage");
    assert.ok(faq, `${code}: falta FAQPage`);
    assert.equal(faq.mainEntity.length, questions(html), `${code}: preguntas`);
    for (const q of faq.mainEntity) {
      assert.ok(/[?？]$/.test(q.name), `${code}: «${q.name}»`); // en chino, signo de ancho completo
      assert.ok(q.acceptedAnswer.text.length > 20 && !/[<>]/.test(q.acceptedAnswer.text), `${code}: respuesta de «${q.name}»`);
    }
    if (code !== "es") assert.ok(!faq.mainEntity.some((q) => q.name.startsWith("¿")), `${code}: preguntas sin traducir`);
    const crumbs = graph.find((n) => n["@type"] === "BreadcrumbList").itemListElement;
    assert.deepEqual(crumbs.map((c) => c.position), [1, 2]);
    assert.equal(crumbs[1].item, faq.url);
  }
});

test("portada: WebSite y WebApplication con los nombres de la marca", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const graph = ld(html).flatMap((d) => d["@graph"] ?? [d]);
  for (const type of ["WebSite", "WebApplication"]) {
    const node = graph.find((n) => n["@type"] === type);
    assert.ok(node, type);
    assert.deepEqual(node.alternateName, ["LumiParty ARMY Bomb", "LumiParty BTS"]);
    assert.equal(node.url, "https://lumiparty.com/");
  }
  assert.match(html, /No es una tienda ni tiene relación con lumiparty\.net\./);
});
