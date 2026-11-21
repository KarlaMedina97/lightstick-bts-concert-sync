import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { pickUrls, KEY, HOST } from "../scripts/indexnow.mjs";
import { PUBLIC } from "../scripts/build-site.mjs";

test("IndexNow: el archivo de la clave existe, contiene la clave y se publica", () => {
  assert.match(KEY, /^[a-f0-9]{32}$/);
  assert.ok(existsSync(new URL(`../${KEY}.txt`, import.meta.url)));
  assert.equal(readFileSync(new URL(`../${KEY}.txt`, import.meta.url), "utf8").trim(), KEY);
  assert.ok(PUBLIC.includes(`${KEY}.txt`));
});

test("IndexNow: sin --all solo las páginas fijas; con --all también canciones; nunca otro dominio", () => {
  const xml = `<urlset><url><loc>https://${HOST}/</loc></url><url><loc>https://${HOST}/player/</loc></url>
    <url><loc>https://${HOST}/player/spring-day</loc></url><url><loc>https://otro.com/x</loc></url></urlset>`;
  assert.deepEqual(pickUrls(xml), [`https://${HOST}/`, `https://${HOST}/player/`]);
  assert.equal(pickUrls(xml, true).length, 3);
});
