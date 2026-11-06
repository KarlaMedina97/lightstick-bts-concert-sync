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
  assert.equal(classifyBtError(err("NetworkError", "GATT Server is disconnected")), "other");
});

import { parseYouTubeId } from "../src/youtube.js";
import { readFileSync } from "node:fs";

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
