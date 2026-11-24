import { test } from "node:test";
import assert from "node:assert/strict";
import { chantStepMs, CHANT_PAUSE_MS, CHANT_STEP_MS } from "../src/fanchant.js";
import { FINAL, chantVoiceFor } from "../src/fanchant.js";

test("fanchant: 2,5 s por nombre y 0,25 s de pausa entre nombres", () => {
  assert.equal(CHANT_STEP_MS, 2500);
  assert.equal(CHANT_PAUSE_MS, 250);
  for (const bpm of [0, 90, 120, 180]) assert.equal(chantStepMs(bpm), 2500);
});

test("velocidad del fanchant: más rápida acorta cada nombre, nunca a menos de 1,1 s", async () => {
  const { chantStepMs, CHANT_STEP_MS } = await import("../src/fanchant.js");
  assert.equal(chantStepMs(0, 1), CHANT_STEP_MS);
  assert.ok(chantStepMs(0, 0.75) > CHANT_STEP_MS);
  assert.ok(chantStepMs(0, 1.5) < CHANT_STEP_MS);
  assert.ok(chantStepMs(0, 2) >= 1100);
  assert.equal(chantStepMs(0, 7), CHANT_STEP_MS); // valor desconocido → normal
});

test("fanchant: «BTS» se dice siempre en inglés (bi-ti-es), aunque haya voz coreana", () => {
  const voices = [{ lang: "ko-KR", name: "ko" }, { lang: "en-US", name: "en" }, { lang: "es-ES", name: "es" }];
  const v = chantVoiceFor(FINAL, voices);
  assert.equal(v.text, "BTS!");
  assert.equal(v.lang, "en-US");
  assert.equal(v.voice.name, "en");
  assert.equal(chantVoiceFor(FINAL, []).lang, "en-US"); // sin lista de voces: igual en inglés
});

test("fanchant: los nombres en coreano; sin voz coreana, romanizados", () => {
  const nam = { ko: "김남준", roman: "Kim Namjoon" };
  assert.deepEqual(chantVoiceFor(nam, [{ lang: "ko_KR" }]).text, "김남준");
  assert.equal(chantVoiceFor(nam, [{ lang: "es-ES" }, { lang: "en-US" }]).text, "Kim Namjoon");
  assert.equal(chantVoiceFor(nam, []).text, "김남준"); // voces aún sin cargar: el navegador elige por idioma
  assert.equal(chantVoiceFor(nam, []).lang, "ko-KR");
});
