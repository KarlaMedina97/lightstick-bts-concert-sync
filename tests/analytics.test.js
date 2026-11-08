import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("analítica: PostHog con código propio, sin cookies, con opción de apagarlo y sin Google", () => {
  const src = read("src/analytics.js");
  assert.match(src, /analyticsOff\(\)/); // se puede apagar en Ajustes
  assert.match(src, /doNotTrack|globalPrivacyControl/); // respeta "no rastrear"
  assert.match(src, /localhost/); // nunca en desarrollo ni en la red local
  assert.match(src, /\$process_person_profile: false/); // sin perfiles de persona
  assert.match(src, /sessionStorage/); // número de la visita: se borra al cerrar la pestaña
  assert.doesNotMatch(src, /document\.cookie\s*=|localStorage\.setItem\(SID/); // sin cookies ni identidad duradera
  assert.doesNotMatch(src, /location\.search|location\.href|location\.hash/); // nunca la URL completa (?song=…)
  assert.doesNotMatch(src, /googletagmanager|gtag\(/); // GA4 retirado
  const cfg = read("src/config.js");
  assert.match(cfg, /posthog: \{ key: "(phc_[A-Za-z0-9]+)?", host: "https:\/\/us\.i\.posthog\.com" \}/);
  for (const page of ["index.html", "player/index.html"]) {
    assert.match(read(page), /connect-src[^"]*https:\/\/us\.i\.posthog\.com/);
    assert.doesNotMatch(read(page), /googletagmanager|google-analytics/);
  }
  assert.match(read("privacy/index.html"), /PostHog/);
});

test("analítica: fuera de una página (sin navegador) no hace nada ni envía datos", async () => {
  const { pageview, event } = await import("../src/analytics.js");
  assert.doesNotThrow(() => { pageview("/"); event("reproducir", { cancion: "dynamite" }); });
});
