import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("analítica: Google Analytics sin cookies, con privacidad y solo si hay ID", () => {
  const src = read("src/analytics.js");
  assert.match(src, /client_storage: "none"/); // sin cookies ni identificador guardado
  assert.match(src, /allow_google_signals: false/);
  assert.match(src, /ad_storage: "denied"/);
  assert.match(src, /doNotTrack|globalPrivacyControl/); // respeta "no rastrear"
  assert.match(src, /localhost/); // nunca en desarrollo ni en la red local
  assert.doesNotMatch(src, /location\.search|location\.href/); // nunca la URL completa (?song=…)
  const cfg = read("src/config.js");
  assert.match(cfg, /export const ANALYTICS = \{ ga4: "(G-[A-Z0-9]{4,20})?" \}/);
  // La CSP permite gtag solo en las páginas que lo usan; la privacidad lo explica.
  for (const page of ["index.html", "player/index.html"]) assert.match(read(page), /script-src[^"]*https:\/\/www\.googletagmanager\.com/);
  assert.match(read("privacy/index.html"), /Google Analytics/);
});

test("analítica: fuera de una página (sin ID o sin navegador) no hace nada ni envía datos", async () => {
  const { pageview, event } = await import("../src/analytics.js");
  globalThis.window ??= {};
  assert.doesNotThrow(() => { pageview("/"); event("reproducir", { cancion: "dynamite" }); });
  assert.equal(globalThis.window.dataLayer, undefined);
});
