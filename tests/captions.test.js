import { test } from "node:test";
import assert from "node:assert/strict";
import { isRomanTrack } from "../src/player.js";

test("detecta pistas de pronunciación (romanización)", () => {
  assert.ok(isRomanTrack({ languageCode: "ko-Latn" }));
  assert.ok(isRomanTrack({ languageCode: "ko", languageName: "Korean (Romanized)" }));
  assert.ok(isRomanTrack({ languageCode: "ja", displayName: "Japanese (Romaji)" }));
  assert.ok(isRomanTrack({ languageCode: "es", displayName: "Pronunciación" }));
  assert.ok(!isRomanTrack({ languageCode: "ko", languageName: "Korean" }));
  assert.ok(!isRomanTrack({ languageCode: "en", languageName: "English" }));
  assert.ok(!isRomanTrack(null));
});
