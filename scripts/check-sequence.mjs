// Valida una secuencia de luces por marcas de tiempo (formato de docs/secuencias/, la que arma Gemini con
// docs/secuencias/prompt-gemini.md). Acepta el JSON solo o la respuesta completa de Gemini (toma el primer {…}).
//
//   npm run check:sequence -- respuesta.json
//
// Revisa: formato, tramos en orden sin huecos ni superposiciones, brillos 0–1, colores hex, efectos conocidos,
// máximo 3 destellos por segundo (también contando los acentos en cualquier ventana de 1 s), que la canción exista
// en el catálogo con ese video, y avisa si la luz queda plana (poco contraste o un solo efecto).
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { ALBUMS } from "../src/catalog.js";

export const EFFECTS = ["blink", "bulb", "breathe", "pulse", "hit", "rise", "bloom", "wave", "duo", "disco", "aurora", "sparkle", "rainbow", "ocean", "flame", "fadeout", "blackout", "hold", "split", "flash", "borahae"];
const SECTIONS = ["intro", "verso", "pre-coro", "coro", "verso 2", "coro 2", "puente", "coro final", "final", "pausa", "post-coro", "outro", "interludio", "break", "rap", "verso 3", "coro 3"];
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Todos los objetos JSON de primer nivel de un texto (respuesta de Gemini con varios bloques). */
export function extractAll(text) {
  // Copiado del chat de Gemini, el JSON trae escapes de Markdown (\[ \] \_): se quitan antes de leerlo.
  text = text.replace(/\\([[\]_*#])/g, "$1");
  const out = [];
  let from = 0;
  while (true) {
    const i = text.indexOf("{", from);
    if (i < 0) return out;
    try { const { obj, end } = readObject(text, i); if (obj?.tramos) out.push(obj); from = end; } catch { from = i + 1; }
  }
}
function readObject(text, start) {
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return { obj: JSON.parse(text.slice(start, i + 1)), end: i + 1 };
  }
  throw new Error("el JSON está incompleto");
}
/** Extrae el JSON de un texto (la respuesta de Gemini puede traer una tabla después). */
export function extractJson(text) {
  const start = text.indexOf("{");
  if (start < 0) throw new Error("no hay JSON en el archivo");
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error("el JSON está incompleto");
}

/** @returns {{errors:string[], warnings:string[]}} */
export function checkSequence(seq, { catalog = ALBUMS } = {}) {
  const errors = [], warnings = [];
  const err = (m) => errors.push(m), warn = (m) => warnings.push(m);
  const example = Boolean(seq._aviso);
  if (seq.formato !== 1) err("«formato» debe ser 1");
  const song = catalog.flatMap((a) => a.songs).find((s) => s.id === seq.song);
  if (!example) {
    if (!song) err(`la canción «${seq.song}» no está en el catálogo`);
    else if (song.yt !== seq.yt) err(`el video ${seq.yt} no es el de «${seq.song}» en el catálogo (${song.yt})`);
  }
  if (!(seq.duracion > 0)) err("«duracion» debe ser > 0");
  if (!(seq.bpm >= 40 && seq.bpm <= 240)) err(`BPM fuera de rango: ${seq.bpm}`);
  if (!(seq.primerTiempo >= 0)) err("«primerTiempo» debe ser ≥ 0");
  if (!seq.verificacion?.audio) warn("falta «verificacion.audio»: ¿cómo se sacaron los tiempos?");
  if (!["alta", "media", "baja"].includes(seq.verificacion?.confianza)) warn("«verificacion.confianza» debería ser alta, media o baja");
  if (seq.verificacion?.confianza === "baja") warn("confianza baja: revisa las dudas antes de usarla");
  for (const p of seq.paleta ?? []) if (!HEX.test(p.hex)) err(`color de paleta inválido: ${p.hex}`);

  const T = seq.tramos ?? [];
  if (!T.length) err("no hay tramos");
  let prevEnd = 0;
  const accents = [];
  T.forEach((t, i) => {
    const at = `tramo ${i + 1} (${t.inicio}–${t.fin} s, ${t.seccion})`;
    if (Math.abs(t.inicio - prevEnd) > 0.05) err(`${at}: ${t.inicio > prevEnd ? "hueco" : "se superpone"} con el anterior (termina en ${prevEnd})`);
    if (!(t.fin > t.inicio)) err(`${at}: «fin» debe ser mayor que «inicio»`);
    prevEnd = t.fin;
    if (!SECTIONS.includes(t.seccion)) warn(`${at}: sección poco común «${t.seccion}»`);
    if (t.evidencia === undefined && t.evidence === undefined) warn(`${at}: sin «evidencia» (qué se oye/ve en ese momento): no se puede revisar`);
    if (!HEX.test(t.color)) err(`${at}: color inválido ${t.color}`);
    if (t.color2 != null && !HEX.test(t.color2)) err(`${at}: color2 inválido ${t.color2}`);
    for (const k of ["brillo", "brilloFin"]) if (!(t[k] >= 0 && t[k] <= 1)) err(`${at}: ${k} fuera de 0–1 (${t[k]})`);
    if (!EFFECTS.includes(t.efecto)) err(`${at}: efecto desconocido «${t.efecto}» (usa: ${EFFECTS.join(", ")})`);
    if (!(t.destellosPorSeg >= 0 && t.destellosPorSeg <= 3)) err(`${at}: ${t.destellosPorSeg} destellos/s (máximo 3)`);
    for (const a of t.acentos ?? []) {
      if (a < t.inicio - 0.05 || a > t.fin + 0.05) err(`${at}: acento en ${a} s fuera del tramo`);
      accents.push(a);
    }
  });
  if (T.length && Math.abs(prevEnd - seq.duracion) > 1) err(`los tramos terminan en ${prevEnd} s pero la duración es ${seq.duracion} s`);
  accents.sort((a, b) => a - b);
  for (let i = 0; i < accents.length; i++) {
    let j = i; while (j < accents.length && accents[j] - accents[i] < 1) j++;
    if (j - i > 3) { err(`más de 3 acentos con destello en 1 s (desde ${accents[i]} s)`); break; }
  }
  // Que no quede plana: contraste de brillo, variedad de efectos y de color.
  const lv = T.map((t) => Math.max(t.brillo, t.brilloFin));
  if (T.length > 2 && Math.max(...lv) - Math.min(...lv) < 0.35) warn("poco contraste de brillo entre tramos: se verá plana");
  if (new Set(T.map((t) => t.efecto)).size < 3) warn("menos de 3 efectos distintos: se verá repetitiva");
  if (new Set(T.map((t) => t.color.toLowerCase())).size < 2) warn("un solo color en toda la canción");
  const chorus = T.filter((t) => /coro/.test(t.seccion) && !/pre/.test(t.seccion)).map((t) => t.brillo);
  const verse = T.filter((t) => /verso/.test(t.seccion)).map((t) => t.brillo);
  if (chorus.length && verse.length && Math.min(...chorus) <= Math.max(...verse)) warn("algún verso brilla tanto como un coro: el coro no se va a sentir");
  if (example) warn("es el archivo de EJEMPLO (tiempos ilustrativos, no de una canción real)");
  // Duración real del video (medida con npm run analyze:video): si no coincide, los tiempos no son de este video.
  const measured = durations[seq.song];
  if (!example && measured && Math.abs(seq.duracion - measured) > Math.max(4, measured * 0.03)) err(`dice que dura ${seq.duracion} s pero el video dura ${measured} s: los tiempos no son de este video`);
  return { errors, warnings };
}

let durations = {};
/** Duraciones medidas por id ({ id: segundos }); las usa checkSequence. */
export function setDurations(map) { durations = map ?? {}; }

/**
 * Revisión de un lote: secuencias copiadas de una plantilla (mismos tiempos, misma duración o misma «evidencia» en
 * muchas canciones) no son un análisis de cada video. Devuelve los errores por canción.
 * @param {{seq:object}[]} list
 */
export function checkBatch(list) {
  const out = new Map(), add = (id, m) => out.set(id, [...(out.get(id) ?? []), m]);
  if (list.length < 3) return out;
  const group = (key) => { const g = new Map(); for (const { seq } of list) { const k = key(seq); g.set(k, [...(g.get(k) ?? []), seq.song]); } return g; };
  const shape = (s) => (s.tramos ?? []).map((t) => (t.inicio / s.duracion).toFixed(2)).join(",");
  for (const [, ids] of group(shape)) if (ids.length >= 3) for (const id of ids) add(id, `mismos tiempos relativos que otras ${ids.length - 1} canciones: parece una plantilla, no un análisis de su video`);
  for (const [d, ids] of group((s) => s.duracion)) if (ids.length >= Math.max(5, list.length * 0.3)) for (const id of ids) add(id, `${ids.length} canciones con la misma duración (${d} s): no es la duración real de cada video`);
  const ev = new Map();
  for (const { seq } of list) for (const t of seq.tramos ?? []) { const e = t.evidencia ?? t.evidence; if (e) ev.set(e, (ev.get(e) ?? new Set()).add(seq.song)); }
  for (const { seq } of list) {
    const reused = (seq.tramos ?? []).filter((t) => (t.evidencia ?? t.evidence) && ev.get(t.evidencia ?? t.evidence).size >= 3).length;
    if (reused > (seq.tramos?.length ?? 0) / 2) add(seq.song, `la «evidencia» se repite igual en otras canciones (${reused} tramos): no describe este video`);
  }
  return out;
}

/** Secuencias de un archivo .json/.txt, una carpeta o un .zip (respuesta de Gemini por lotes). */
export function loadSequences(path) {
  if (statSync(path).isDirectory()) return readdirSync(path, { recursive: true }).filter((f) => /\.(json|txt|md)$/i.test(f)).flatMap((f) => loadSequences(join(path, f)).map((x) => ({ ...x, file: f })));
  if (/\.zip$/i.test(path)) {
    const dir = mkdtempSync(join(tmpdir(), "pws-seq-"));
    const r = process.platform === "win32"
      ? spawnSync("powershell", ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${path.replace(/'/g, "''")}' -DestinationPath '${dir.replace(/'/g, "''")}' -Force`])
      : spawnSync("unzip", ["-q", path, "-d", dir]);
    if (r.status !== 0) throw new Error("no se pudo abrir el zip");
    try { return loadSequences(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
  }
  return extractAll(readFileSync(path, "utf8")).map((seq) => ({ seq, file: basename(path) }));
}

/** Duraciones medidas en los videos (src/video-looks.js), para comparar con lo que dice cada secuencia. */
export async function loadMeasuredDurations() {
  try {
    const { VIDEO_LOOKS } = await import(new URL("../src/video-looks.js", import.meta.url).href);
    setDurations(Object.fromEntries(Object.entries(VIDEO_LOOKS).map(([id, v]) => [id, v.dur])));
  } catch {}
}

/** Valida un lote completo: errores de cada secuencia más los de plantilla entre canciones. */
export function checkAll(all) {
  const batch = checkBatch(all);
  return all.map((x) => { const r = checkSequence(x.seq); return { ...x, errors: [...r.errors, ...(batch.get(x.seq.song) ?? [])], warnings: r.warnings }; });
}

if (process.argv[1]?.endsWith("check-sequence.mjs")) {
  const file = process.argv[2];
  if (!file) { console.log("Uso: npm run check:sequence -- <archivo.json | respuesta.txt | carpeta | lote.zip>"); process.exit(1); }
  let all;
  try { all = loadSequences(file); } catch (e) { console.log(`✗ ${file}: ${e.message}`); process.exit(1); }
  if (!all.length) { console.log(`✗ ${file}: no encontré secuencias`); process.exit(1); }
  await loadMeasuredDurations();
  let bad = 0;
  for (const { seq, file: f, errors, warnings } of checkAll(all)) {
    console.log(`${errors.length ? "✗" : "✓"} ${seq.song} (${f}): ${seq.tramos?.length ?? 0} tramos, confianza ${seq.verificacion?.confianza ?? "?"}${errors.length ? `, ${errors.length} error(es)` : ""}${warnings.length ? `, ${warnings.length} aviso(s)` : ""}`);
    for (const e of errors) console.log(`   ✗ ${e}`);
    for (const w of warnings) console.log(`   ⚠ ${w}`);
    if (errors.length) bad++;
  }
  console.log(bad ? `✗ ${bad} de ${all.length} con errores.` : `✓ ${all.length} secuencia(s) válidas.`);
  process.exit(bad ? 1 : 0);
}
