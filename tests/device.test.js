import { test } from "node:test";
import assert from "node:assert/strict";
import { macFromBytes, versionLabel, LOW_BATTERY } from "../src/ble.js";

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
