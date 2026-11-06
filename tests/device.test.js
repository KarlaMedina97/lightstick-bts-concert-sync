import { test } from "node:test";
import assert from "node:assert/strict";
import { macFromBytes, versionLabel, LOW_BATTERY, classifyBtError } from "../src/ble.js";

test("MAC: 6 primeros bytes invertidos; nada inventado si no hay datos", () => {
  assert.equal(macFromBytes(new Uint8Array([0x11, 0x22, 0x33, 0x44, 0x55, 0xa4, 0x99])), "A4:55:44:33:22:11");
  assert.equal(macFromBytes(new Uint8Array([1, 2, 3])), null);
  assert.equal(macFromBytes(new Uint8Array(6)), null);
  assert.equal(macFromBytes(null), null);
});

test("versión según familia y nombre anunciado", () => {
  assert.equal(versionLabel("v4", "BBOMB-1A2B"), "Ver. 4");
  assert.equal(versionLabel("se", "BTS LIGHTSTICK_SE"), "Special Edition");
  assert.equal(versionLabel("se", "BTS LIGHTSTICK3"), "Ver. 3");
  assert.equal(versionLabel("se", "multiM"), "Ver. 3 o Special Edition");
});

test("aviso de batería baja al 10 % o menos", () => assert.equal(LOW_BATTERY, 10));

import { inAppBrowser, chromeIntent } from "../src/inapp.js";

test("detecta navegadores dentro de apps (sin Web Bluetooth)", () => {
  assert.equal(inAppBrowser("Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/120 Mobile musical_ly_2023"), "tiktok");
  assert.equal(inAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Mobile/15E148 Instagram 300.0"), "instagram");
  assert.equal(inAppBrowser("Mozilla/5.0 (iPhone) AppleWebKit [FBAN/FBIOS;FBAV/450.0]"), "facebook");
  assert.equal(inAppBrowser("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36"), null); // Chrome normal
  assert.equal(chromeIntent("https://lumiparty.com/player/?guide=1"), "intent://lumiparty.com/player/?guide=1#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Flumiparty.com%2Fplayer%2F%3Fguide%3D1;end");
});

test("errores de Bluetooth: cerrar la lista no es lo mismo que tenerlo desactivado (Brave)", () => {
  const err = (name, message) => Object.assign(new Error(message), { name });
  assert.equal(classifyBtError(err("NotFoundError", "User cancelled the requestDevice() chooser.")), "cancelled");
  assert.equal(classifyBtError(err("NotFoundError", "Web Bluetooth API globally disabled.")), "disabled");
  assert.equal(classifyBtError(err("NotFoundError", "Bluetooth adapter not available.")), "adapter-off");
  assert.equal(classifyBtError(err("SecurityError", "Origin is not allowed")), "denied");
  // Eligió el ARMY Bomb pero no aceptó la conexión (otro celular, app oficial, fuera de alcance): mensaje propio.
  assert.equal(classifyBtError(err("NetworkError", "GATT Server is disconnected. Cannot retrieve services.")), "gatt");
  assert.equal(classifyBtError(err("NetworkError", "Connection attempt failed.")), "gatt");
  assert.equal(classifyBtError(err("NotFoundError", "No Services matching UUID 0001fe01 found in Device.")), "not-stick");
  assert.equal(classifyBtError(err("NotCompatible", "Audífonos no parece ser una lightstick compatible.")), "not-stick");
  assert.equal(classifyBtError(err("TypeError", "algo raro")), "other");
});

import { parseYouTubeId, isOfficialChannel } from "../src/youtube.js";
import { readFileSync } from "node:fs";

test("Mis videos: reconoce los canales oficiales y avisa con los demás", () => {
  for (const c of ["HYBE LABELS", "hybe labels", " BANGTANTV ", "1theK (원더케이)", "UNIVERSAL MUSIC JAPAN", "ibighit", "BTS"]) assert.equal(isOfficialChannel(c), true, c);
  for (const c of ["BTS Fan Uploads", "Concierto completo HD", "", null, undefined]) assert.equal(isOfficialChannel(c), false, String(c));
});

test("compartir desde YouTube: la app es destino y entiende el texto que manda YouTube", () => {
  const m = JSON.parse(readFileSync(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(m.share_target.method, "GET");
  assert.deepEqual(Object.keys(m.share_target.params).sort(), ["text", "title", "url"]);
  // Lo que suele mandar la app de YouTube al compartir (el enlace va dentro del texto).
  const text = "BTS (방탄소년단) 'Dynamite' Official MV https://youtu.be/gdZLi9oWNZg?si=abc123";
  const link = text.match(/https?:\/\/\S+/g)[0];
  assert.equal(parseYouTubeId(link), "gdZLi9oWNZg");
  assert.equal(parseYouTubeId("https://www.youtube.com/shorts/gdZLi9oWNZg"), "gdZLi9oWNZg");
});

import { browserInfo } from "../src/ble.js";

test("navegadores: Samsung Internet y otros de fabricantes se marcan como inestables; Chrome, Edge y Opera no", () => {
  const S = "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36";
  assert.deepEqual(browserInfo(S), { name: "Samsung Internet", flaky: true, android: true, ios: false });
  assert.equal(browserInfo("Mozilla/5.0 (Linux; Android 13; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 XiaoMi/MiuiBrowser/18.0").flaky, true);
  for (const ua of [
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 Edg/124.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 OPR/110.0",
  ]) assert.equal(browserInfo(ua).flaky, false, ua);
  assert.equal(classifyBtError(Object.assign(new Error("x"), { name: "ChooserTimeout" })), "no-chooser");
});
