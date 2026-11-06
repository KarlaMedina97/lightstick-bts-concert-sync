import { test } from "node:test";
import assert from "node:assert/strict";
import { ALBUMS } from "../src/catalog.js";
import { SONG_LOOKS, STYLES, generatePattern, lookFor } from "../src/patterns.js";

const songs = ALBUMS.flatMap((a) => a.songs.map((s) => ({ ...s, album: a })));
const ids = new Set(songs.map((s) => s.id));

test("looks por canción: ids del catálogo, 9 estilos válidos y colores hex", () => {
  for (const [id, look] of Object.entries(SONG_LOOKS)) {
    assert.ok(ids.has(id), `no existe ${id}`);
    if (look.plan) {
      assert.equal(look.plan.length, 9, id);
      for (const st of look.plan) assert.ok(STYLES[st], `${id}: estilo ${st}`);
    }
    for (const c of look.palette ?? []) assert.match(c, /^#[0-9a-f]{6}$/i, id);
  }
});

test("las variantes heredan el look de su canción y no se cuelan otras", () => {
  assert.equal(lookFor("butter-fallon"), SONG_LOOKS.butter);
  assert.equal(lookFor("fire-dance-practice"), SONG_LOOKS.fire);
  assert.equal(lookFor("run-bts-busan"), null);
  assert.equal(lookFor("on-the-street"), null);
  assert.equal(lookFor("butterfly-practice-record"), null);
});

// Destello (aprox. WCAG 2.3.1): subida y bajada de luminancia relativa ≥ 0,2 cada una.
const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
function maxFlashesPerSecond(p, dur, fps = 60) {
  const L = [];
  for (let f = 0; f < dur * fps; f++) L.push(lum(p.colorAt(f / fps, 0, 1)));
  const events = [];
  let dir = 0, ref = L[0], refIdx = 0;
  for (let f = 1; f < L.length; f++) {
    if (dir >= 0 && L[f] > ref) { ref = L[f]; refIdx = f; }
    if (dir <= 0 && L[f] < ref) { ref = L[f]; refIdx = f; }
    if (Math.abs(L[f] - ref) >= 0.2 && Math.sign(L[f] - ref) !== dir) { events.push(f); dir = Math.sign(L[f] - ref); ref = L[f]; refIdx = f; }
  }
  // Un destello = dos cambios opuestos. Máximo en cualquier ventana de 1 s.
  let best = 0;
  for (let i = 0; i < events.length; i++) {
    let j = i; while (j < events.length && events[j] - events[i] < fps) j++;
    best = Math.max(best, Math.floor((j - i) / 2));
  }
  return best;
}

test("modo seguro: ningún look pasa de 3 destellos por segundo", () => {
  const sample = ["fire", "dynamite", "mic-drop", "not-today", "my-universe", "idol", "spring-day", "on", "hooligan"];
  for (const id of sample) {
    const s = songs.find((x) => x.id === id);
    const p = generatePattern(s, s.album, 90, { safeMode: true });
    const fl = maxFlashesPerSecond(p, 90);
    assert.ok(fl <= 3, `${id}: ${fl} destellos/s`);
  }
});

test("modo seguro: todo el catálogo y BPM de 60 a 240 sin pasar de 3 destellos por segundo", () => {
  for (const s of songs) {
    const p = generatePattern(s, s.album, 200, { safeMode: true });
    const fl = maxFlashesPerSecond(p, 200, 30);
    assert.ok(fl <= 3, `${s.id} (${s.bpm} BPM): ${fl} destellos/s`);
  }
  const base = songs.find((x) => x.id === "dope");
  for (let bpm = 60; bpm <= 240; bpm += 4) {
    for (const energy of ["high", "mid"]) {
      const p = generatePattern({ id: "x", bpm, energy }, base.album, 200, { safeMode: true });
      const fl = maxFlashesPerSecond(p, 200, 30);
      assert.ok(fl <= 3, `${bpm} BPM ${energy}: ${fl} destellos/s`);
    }
  }
});

test("las baladas no destellan", () => {
  const s = songs.find((x) => x.id === "spring-day");
  const p = generatePattern(s, s.album, 120, { safeMode: true });
  assert.ok(p.sections.every((sec) => !["flash", "pulse", "sparkle", "disco"].includes(sec.style)));
});

import { dominantColors } from "../src/videopalette.js";

test("colores del video: dominantes y vivos; gris o negro no cuentan", () => {
  const px = (r, g, b, n) => Array.from({ length: n }, () => [r, g, b, 255]).flat();
  const data = new Uint8ClampedArray([...px(200, 20, 30, 300), ...px(20, 40, 200, 150), ...px(128, 128, 128, 400), ...px(5, 5, 5, 300)]);
  assert.deepEqual(dominantColors(new Uint8ClampedArray([...px(200, 20, 30, 5), ...px(10, 10, 10, 995)])), []); // casi sin color
  const c = dominantColors(data);
  assert.equal(c.length, 2);
  assert.match(c[0], /^#ff/); // rojo primero (más peso), llevado a brillo pleno
  assert.deepEqual(dominantColors(new Uint8ClampedArray(px(120, 120, 120, 100))), []);
});

test("con colores del video: cada sección usa su cuadro, y el modo seguro se respeta", () => {
  const video = { overall: ["#ff0000", "#00ff00", "#0000ff"], frames: [["#ffffff", "#ff00ff"], ["#00ffff"], ["#ffff00", "#ff0000"]] };
  for (const id of ["dynamite", "idol", "dope", "spring-day", "fire"]) {
    const s = songs.find((x) => x.id === id);
    const p = generatePattern(s, s.album, 200, { safeMode: true, video });
    assert.ok(maxFlashesPerSecond(p, 200, 30) <= 3, id);
    if (id === "dynamite") assert.deepEqual(p.sections[3].color, [0, 255, 255]); // coro → cuadro del 50 %
    if (id === "fire") assert.deepEqual(p.sections[3].color.slice(0, 1), [255]); // FIRE conserva su rojo
  }
});

test("los momentos culminantes brillan más que los suaves", () => {
  const s = songs.find((x) => x.id === "dope");
  const p = generatePattern(s, s.album, 200, { safeMode: true });
  const coroFinal = p.sections.find((x) => x.label === "coro final"), puente = p.sections.find((x) => x.label === "puente");
  assert.ok(coroFinal.gain > puente.gain && coroFinal.div < puente.div);
});

test("la fase marcada mueve el latido al golpe de la música", () => {
  const s = songs.find((x) => x.id === "dope");
  const a = generatePattern(s, s.album, 200, { safeMode: true, styleOverride: "pulse" });
  const b = generatePattern(s, s.album, 200, { safeMode: true, styleOverride: "pulse", phase: 0.2 });
  // El golpe que caía en t=70 s (mitad del coro) ahora cae en t=70,2 s.
  assert.deepEqual(b.colorAt(70.2).map(Math.round), a.colorAt(70).map(Math.round));
});

import { onConcept } from "../src/patterns.js";

test("FIRE: solo fuego (rojo, amarillo, blanco), aunque el video traiga fucsia; y entre golpes casi apagado", () => {
  assert.deepEqual(onConcept(["#ff00c8", "#ff3000", "#ffe000", "#00a0ff"], ["#ff1a00", "#ffd000", "#ffffff"]), ["#ff3000", "#ffe000"]);
  const s = songs.find((x) => x.id === "fire");
  const p = generatePattern(s, s.album, 200, { safeMode: true, video: { overall: ["#ff00c8", "#7a00ff"], frames: [["#ff00c8"], ["#00a0ff"], ["#ff00ff"]] } });
  let dark = 0, n = 0;
  for (let t = 0; t < 190; t += 0.05) {
    const [r, g, b] = p.colorAt(t);
    n++;
    if (Math.max(r, g, b) < 40) dark++;
    // Ni fucsia ni azul: el azul nunca supera al rojo salvo en blanco puro.
    if (Math.max(r, g, b) > 60) assert.ok(b <= r + 1 && b <= g + 60, `t=${t.toFixed(2)} [${[r, g, b].map(Math.round)}]`);
  }
  assert.ok(dark / n > 0.1, "debe haber oscuridad entre golpes");
});

import { ledLevel, lightable } from "../src/patterns.js";

test("colores aptos para luz: el negro se descarta y los oscuros saturados se aclaran", () => {
  assert.equal(lightable("#111111"), null);
  assert.equal(lightable("#212121"), null);
  assert.equal(Math.max(...lightable("#0d3b66")), 255); // azul marino → azul brillante
  assert.deepEqual(lightable("#ff5252"), [255, 82, 82]);
});

test("canciones intensas: el ARMY Bomb nunca se ve apagado salvo en el cierre, y el coro final supera a la intro", () => {
  for (const s of songs.filter((x) => x.energy === "high" && x.kind !== "concert")) {
    const p = generatePattern(s, s.album, 220, { safeMode: true });
    const avg = {};
    for (const sec of p.sections) {
      if (sec.label === "final") continue;
      let sum = 0, n = 0, off = 0;
      for (let t = sec.start + 0.7; t < sec.end; t += 0.05) {
        const l = Math.max(...ledLevel(p.colorAt(t), p.floorAt(t), 2)) / 255;
        sum += l; n++; if (l < 0.08) off++;
      }
      avg[sec.label] = sum / n;
      assert.ok(off / n < 0.02, `${s.id} · ${sec.label}: ${Math.round((100 * off) / n)} % apagado`);
    }
    assert.ok(avg["coro final"] > avg.intro, `${s.id}: coro final ${avg["coro final"].toFixed(2)} ≤ intro ${avg.intro.toFixed(2)}`);
  }
});

test("Euphoria fluye: sin saltos bruscos en versos y puente, sin verdes, y el coro final es el punto más alto", () => {
  const s = songs.find((x) => x.id === "euphoria");
  const p = generatePattern(s, s.album, 230, { safeMode: true });
  const hue = ([r, g, b]) => { const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); if (d < 20) return -1; const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return h * 60; };
  const avg = {};
  for (const sec of p.sections) {
    let prev = null, maxJump = 0, sum = 0, n = 0;
    for (let t = sec.start + 2.5; t < sec.end - 0.1; t += 0.05) {
      const c = p.colorAt(t), l = lum(c);
      const h = hue(c);
      assert.ok(!(h > 70 && h < 170), `${sec.label}: verde en t=${t.toFixed(2)}`);
      if (prev != null) maxJump = Math.max(maxJump, Math.abs(l - prev));
      prev = l; sum += l; n++;
    }
    avg[sec.label] = sum / n;
    if (["verso", "verso 2", "puente", "intro"].includes(sec.label)) assert.ok(maxJump < 0.03, `${sec.label}: salto ${maxJump.toFixed(3)} en 50 ms`);
  }
  assert.ok(avg["coro final"] > avg.verso && avg.coro > avg.verso, "los coros brillan más que los versos");
});

import { withCompanion, hexToRgb } from "../src/patterns.js";

test("intensidad continua: el pre-coro se construye, toma aire antes del coro y el coro entra con impacto", () => {
  const s = songs.find((x) => x.id === "dope");
  const p = generatePattern(s, s.album, 200, { safeMode: true });
  const pre = p.sections.find((x) => x.label === "pre-coro"), coro = p.sections.find((x) => x.label === "coro");
  const fin = p.sections.find((x) => x.label === "coro final");
  assert.ok(p.energyAt(pre.end - pre.end * 0.02 - 1) > p.energyAt(pre.start + 0.1), "el pre-coro sube");
  assert.ok(p.energyAt(pre.end - 0.05) < p.energyAt(coro.start + 0.05), "respiro y luego golpe del coro");
  // En el coro final, al tope de brillo, crece la cresta blanca del 1 de cada compás (más blanco al final).
  const white = (t) => { const c = p.colorAt(t); return Math.min(...c) / Math.max(1, ...c); };
  const crestAt = (from) => { let m = 0; for (let t = from; t < from + p.beat * 4; t += 0.01) m = Math.max(m, white(t)); return m; };
  assert.ok(crestAt(fin.end - p.beat * 5) > crestAt(fin.start + p.beat * 4), "el coro final sigue subiendo");
});

test("combinaciones: cada sección tiene principal y acento distintos, y el latido usa los dos", () => {
  const s = songs.find((x) => x.id === "idol");
  const p = generatePattern(s, s.album, 200, { safeMode: true, styleOverride: "pulse" });
  for (const sec of p.sections) assert.notDeepEqual(sec.accent, sec.color, sec.label);
  const coro = p.sections.find((x) => x.label === "coro");
  const seen = new Set();
  for (let t = coro.start + 1; t < coro.end; t += 0.02) seen.add(p.colorAt(t).map((v) => Math.round(v / 40)).join());
  assert.ok(seen.size > 6, "el coro mezcla colores, no es un solo tono");
});

test("variedad: canciones de la misma energía sin look propio no reciben todas el mismo plan", () => {
  const plain = songs.filter((x) => x.energy === "high" && !lookFor(x.id) && x.kind !== "concert");
  const plans = new Set(plain.map((x) => generatePattern(x, x.album, 200, { safeMode: true }).sections.map((sec) => sec.style).join()));
  assert.ok(plans.size >= 3, `solo ${plans.size} planes distintos`);
});

test("paletas de un solo tono reciben un compañero análogo; las que ya combinan quedan igual", () => {
  const red = withCompanion([hexToRgb("#ff1744"), hexToRgb("#ffffff")]);
  assert.equal(red.length, 3); // rojo + blanco → suma un naranja
  const [r, g, b] = red[2];
  assert.ok(r > 200 && g > 60 && b < 80, `compañero del rojo: ${red[2].map(Math.round)}`);
  const ok = [hexToRgb("#ff2e88"), hexToRgb("#00c2a8")];
  assert.equal(withCompanion(ok).length, 2);
  assert.equal(withCompanion([hexToRgb("#ffffff")]).length, 1); // solo blanco: no inventa
});

// ---------- Control de calidad: ninguna canción (ni las nuevas) con luces planas o aburridas ----------
// Puntaje 0–100: variedad de color (tonos distintos), rango de brillo, contraste coro/verso y movimiento.
function lightScore(p, dur = 210) {
  const hue = ([r, g, b]) => { const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); if (d < 25 || mx < 30) return -1; const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return h * 60; };
  const L = [], H = new Set(), by = {};
  let prev = null, moves = 0;
  for (let t = 0; t < dur * 0.95; t += 0.1) {
    const c = ledLevel(p.colorAt(t), p.floorAt(t), 2), l = Math.max(...c) / 255;
    L.push(l);
    const h = hue(c); if (h >= 0) H.add(Math.round(h / 20));
    if (prev && Math.hypot(c[0] - prev[0], c[1] - prev[1], c[2] - prev[2]) > 18) moves++;
    prev = c;
    (by[p.sectionAt(t).label] ??= []).push(l);
  }
  const n = L.length, s = [...L].sort((a, b) => a - b), avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const range = s[Math.floor(n * 0.9)] - s[Math.floor(n * 0.1)];
  const contrast = avg([...(by.coro ?? []), ...(by["coro 2"] ?? []), ...(by["coro final"] ?? [])]) - avg([...(by.verso ?? []), ...(by["verso 2"] ?? [])]);
  return Math.round(25 * Math.min(1, H.size / 6) + 25 * Math.min(1, range / 0.5) + 25 * Math.min(1, Math.max(0, contrast) / 0.15) + 25 * Math.min(1, moves / n / 0.35));
}

test("calidad de luces: cada canción del catálogo puntúa ≥ 55 y el promedio ≥ 75 (las nuevas también)", () => {
  const scores = songs.filter((s) => s.kind !== "concert").map((s) => [s.id, lightScore(generatePattern(s, s.album, 210, { safeMode: true }))]);
  const flat = scores.filter(([, v]) => v < 55);
  assert.deepEqual(flat, [], `luces planas (agrega un look en SONG_LOOKS o ajusta su paleta): ${flat.map(([id, v]) => `${id}=${v}`).join(", ")}`);
  const mean = scores.reduce((a, [, v]) => a + v, 0) / scores.length;
  assert.ok(mean >= 75, `promedio ${mean.toFixed(1)}`);
});

test("calidad de luces: un video agregado por enlace (sin look propio) también aprovecha combinaciones e intensidad", () => {
  const mine = { palette: ["#8a2be2", "#ff80ab", "#4fc3f7"] }; // paleta de «Mis videos»
  for (const [id, energy, bpm] of [["mine-a1b2c3", "high", 110], ["mine-x9y8z7", "mid", 96], ["mine-q1w2e3", "ballad", 72]]) {
    const v = lightScore(generatePattern({ id, title: "Mi video", bpm, energy }, mine, 210, { safeMode: true }));
    assert.ok(v >= 60, `${energy}: ${v}`);
  }
});

import { lightColors } from "../src/patterns.js";

test("colores en las carátulas: la combinación real del ARMY Bomb (2–4, sin repetidos, FIRE con su fuego)", () => {
  const find = (id) => songs.find((x) => x.id === id);
  const fire = lightColors(find("fire"), find("fire").album);
  assert.deepEqual(fire, ["#ff1a00", "#ffd000", "#ffffff"]);
  const dope = lightColors(find("dope"), find("dope").album);
  assert.ok(dope.length === 3, `dope: ${dope}`); // blanco + rojo + compañero naranja
  for (const s of songs) {
    const c = lightColors(s, s.album);
    assert.ok(c.length >= 1 && c.length <= 4, s.id);
    for (const h of c) assert.match(h, /^#[0-9a-f]{6}$/, s.id);
  }
});

test("concierto: FIRE y Hooligan abren en blanco tenue y el verso cambia de golpe a rojo", () => {
  for (const id of ["fire", "hooligan"]) {
    const s = songs.find((x) => x.id === id);
    const p = generatePattern(s, s.album, 200, { safeMode: true });
    const intro = p.sections[0], verso = p.sections[1];
    assert.deepEqual(intro.color, [255, 255, 255], id);
    const [r, g, b] = p.colorAt(verso.start + 2);
    assert.ok(r > g && r > b, `${id}: el verso es rojo (${[r, g, b].map(Math.round)})`);
  }
});

test("concierto: apagón (brasa) 1 tiempo antes del coro en FIRE, sin pasar el límite de destellos", () => {
  const s = songs.find((x) => x.id === "fire");
  const p = generatePattern(s, s.album, 200, { safeMode: true });
  const coro = p.sections.find((x) => x.label === "coro");
  assert.ok(p.energyAt(coro.start - p.beat * 0.5) < 0.1, "casi apagado justo antes");
  assert.ok(p.floorAt(coro.start - p.beat * 0.5) > 0, "brasa, nunca negro total");
  assert.ok(maxFlashesPerSecond(p, 200) <= 3);
});

test("concierto: las canciones de cierre terminan en el océano Borahae (morado largo que se apaga)", () => {
  for (const id of ["spring-day", "yet-to-come", "epilogue-young-forever", "make-it-right", "ptd"]) {
    const s = songs.find((x) => x.id === id);
    const p = generatePattern(s, s.album, 210, { safeMode: true });
    const fin = p.sections[8];
    assert.equal(fin.style, "borahae", id);
    assert.ok(fin.end - fin.start > 20, `${id}: ${(fin.end - fin.start).toFixed(1)} s`);
    const [r, g, b] = p.colorAt(fin.start + (fin.end - fin.start) * 0.5);
    assert.ok(b > g && r > g, `${id}: morado a la mitad (${[r, g, b].map(Math.round)})`);
    const end = p.colorAt(fin.end - 0.05);
    assert.ok(Math.max(...end) < 20, `${id}: se apaga al final`);
    assert.ok(maxFlashesPerSecond(p, 210) <= 3, id);
  }
});

import { VIDEO_LOOKS } from "../src/video-looks.js";
import { STRUCTURE } from "../src/patterns.js";

test("looks analizados del MV (npm run analyze:video): datos válidos y modo seguro con ellos", () => {
  const hex = /^#[0-9a-f]{6}$/;
  for (const [id, v] of Object.entries(VIDEO_LOOKS)) {
    const s = songs.find((x) => x.id === id);
    assert.ok(s, `${id} no está en el catálogo`);
    assert.equal(v.yt, s.yt, `${id}: el análisis es de otro video`);
    assert.equal(v.frames.length, STRUCTURE.length, id);
    assert.equal(v.curve.length, STRUCTURE.length, id);
    for (const c of [...v.overall, ...v.frames.flat()]) assert.match(c, hex, `${id}: ${c}`);
    for (const x of v.curve) assert.ok(x >= 0 && x <= 1, `${id}: curva ${x}`);
    const p = generatePattern(s, s.album, v.dur, { safeMode: true, video: v });
    assert.ok(maxFlashesPerSecond(p, Math.min(v.dur, 240), 30) <= 3, `${id}: pasa de 3 destellos/s`);
  }
});

test("con análisis completo, cada una de las 9 secciones toma su propio color del MV", () => {
  const frames = STRUCTURE.map((_, i) => [["#ff0000", "#00ff00", "#0000ff"][i % 3]]);
  const s = songs.find((x) => !lookFor(x.id) && x.yt); // sin paleta curada que filtre los colores del video
  const p = generatePattern(s, s.album, 200, { safeMode: true, video: { overall: ["#ff0000", "#00ff00", "#0000ff"], frames, curve: STRUCTURE.map(() => 0.5) } });
  assert.deepEqual(p.sections[4].color, [0, 255, 0]); // verso 2 → su propio cuadro, no el del 50 %
});

test("con el video: los coros no bajan, el rap sigue arriba y un video quieto casi no cambia la curva", () => {
  const s = songs.find((x) => x.id === "dope"); // rap
  const base = generatePattern(s, s.album, 210, { safeMode: true });
  const quiet = STRUCTURE.map((_, i) => (i === 0 ? 1 : 0.45)); // intro "alta" por ruido de cámara
  const still = generatePattern(s, s.album, 210, { safeMode: true, video: { overall: ["#ffffff"], frames: STRUCTURE.map(() => ["#ffffff"]), curve: quiet, contrast: 0.004 } });
  for (const i of [3, 5, 7]) assert.ok(still.sections[i].lvl >= base.sections[i].lvl - 1e-9, `coro ${i} bajó`);
  for (const i of [1, 4]) assert.ok(still.sections[i].lvl >= 0.78 - 1e-9, `rap ${i} bajó a ${still.sections[i].lvl}`);
  assert.ok(Math.abs(still.sections[0].lvl - base.sections[0].lvl) < 0.05, "un video quieto movió la intro");
});

test("calidad con el video: ningún look analizado queda plano", () => {
  for (const [id, v] of Object.entries(VIDEO_LOOKS)) {
    const s = songs.find((x) => x.id === id);
    const score = lightScore(generatePattern(s, s.album, 210, { safeMode: true, video: v }));
    assert.ok(score >= 55, `${id}: ${score.toFixed(0)} (plano)`);
  }
});
