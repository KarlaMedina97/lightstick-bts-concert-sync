import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("analítica: PostHog con su librería oficial local, sin cookies, con opción de apagarlo y sin Google", () => {
  const src = read("src/analytics.js");
  assert.match(src, /analyticsOff\(\)/); // se puede apagar en Ajustes
  assert.match(src, /doNotTrack|globalPrivacyControl/); // respeta "no rastrear"
  assert.match(src, /localhost/); // nunca en desarrollo ni en la red local
  assert.match(src, /\.\.\/vendor\/posthog\/posthog\.slim\.no-external\.js/); // librería oficial servida desde el sitio
  assert.doesNotMatch(src, /https:\/\/[^"]*(cdn|assets)[^"]*posthog/i); // nunca su CDN
  assert.match(src, /person_profiles: "identified_only"/); // sin perfiles de persona (nunca se identifica a nadie)
  assert.match(src, /persistence: accepted\(\) \? "localStorage" : "sessionStorage"/); // nunca cookies; duradero solo si aceptó
  assert.match(src, /disable_session_recording: true/); // sin grabación de sesiones
  assert.match(src, /autocapture: false/); // solo eventos con nombres fijos
  assert.match(src, /before_send: cleanEvent/); // cada evento pasa por la limpieza de direcciones
  assert.doesNotMatch(src, /document\.cookie\s*=/);
  assert.doesNotMatch(src, /location\.search|location\.href|location\.hash/); // nunca la URL completa (?song=…)
  assert.doesNotMatch(src, /googletagmanager|gtag\(/); // GA4 retirado
  const lib = read("vendor/posthog/posthog.slim.no-external.js");
  const version = lib.match(/LIB_VERSION:\(\w+,"(\d+\.\d+\.\d+)"\)/)?.[1];
  assert.ok(version, "la librería está copiada (ver vendor/README.md)");
  assert.match(read("vendor/README.md"), new RegExp(`\\| posthog-js \\| ${version.replaceAll(".", "\\.")} \\|`)); // y su versión anotada
  assert.match(read("sw.js"), /"vendor\/posthog\/posthog\.slim\.no-external\.js"/); // disponible sin conexión
  const cfg = read("src/config.js");
  assert.match(cfg, /posthog: \{ key: "", host: "https:\/\/us\.i\.posthog\.com" \}/); // ninguna clave en el repo (CI la pone al publicar)
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
