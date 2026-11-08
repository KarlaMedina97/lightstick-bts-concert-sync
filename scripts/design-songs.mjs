// Escucha el video oficial de cada canción y diseña su secuencia de luces automáticamente.
//
//   npm run design:songs -- dynamite butter      unas canciones
//   npm run design:songs -- --missing            todas las que aún no tienen diseño automático
//   opciones: --rehacer (vuelve a diseñar aunque exista)
//
// Por canción: abre scripts/video-lab.html (local) en Edge sin ventana con el reproductor oficial CON SONIDO, captura
// el audio de esa pestaña y lo reduce a números (no se graba ni se descarga nada), mide tempo, golpes, silencios y
// cambios (scripts/audio-features.mjs), diseña con scripts/auto-design.mjs y guarda docs/secuencias/auto/<id>.json.
// Lo que pasa check:sequence se importa a src/sequences.js al momento (si se corta, no se pierde lo hecho).
// Ojo: la canción suena por los parlantes mientras se escucha (se puede bajar el volumen de Windows).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ALBUMS } from "../src/catalog.js";
import { lookFor } from "../src/patterns.js";
import { audioFeatures } from "./audio-features.mjs";
import { autoDesign, recolor } from "./auto-design.mjs";
import { checkAll, loadMeasuredDurations } from "./check-sequence.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUTDIR = join(root, "docs", "secuencias", "auto");
mkdirSync(OUTDIR, { recursive: true });
const MANUAL = new Set(["we-are-bulletproof-pt2", "dynamite"]); // aprobadas por la usuaria: el diseño automático nunca las pisa
const args = process.argv.slice(2);
const songs = ALBUMS.flatMap((a) => a.songs.map((s) => ({ ...s, album: a }))).filter((s) => s.yt && s.kind !== "concert");
const ids = args.includes("--missing")
  ? songs.filter((s) => !MANUAL.has(s.id) && (args.includes("--rehacer") || !existsSync(join(OUTDIR, `${s.id}.json`)))).map((s) => s.id)
  : args.filter((a) => !a.startsWith("--"));
if (!ids.length) { console.log("Uso: npm run design:songs -- <id> […] | --missing"); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { VIDEO_LOOKS } = await import(new URL("../src/video-looks.js", import.meta.url).href + "?" + Date.now());
await loadMeasuredDurations();

const port = 5800 + Math.floor(Math.random() * 300);
const server = spawn(process.execPath, [join(root, "scripts", "serve.mjs")], { env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
const profile = mkdtempSync(join(tmpdir(), "pws-listen-"));
const dport = 9600 + Math.floor(Math.random() * 300);
spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", [
  "--headless=new", "--host-resolver-rules=MAP lumiparty.com 127.0.0.1", `--unsafely-treat-insecure-origin-as-secure=http://lumiparty.com:${port}`, // la captura de audio necesita contexto seguro // algunos videos solo se dejan insertar en lumiparty.com: el laboratorio se sirve con ese nombre desde esta PC
   "--autoplay-policy=no-user-gesture-required", "--auto-accept-this-tab-capture",
  "--auto-select-desktop-capture-source=Laboratorio de video", "--auto-select-tab-capture-source-by-title=Laboratorio de video",
  "--enable-features=AutoAcceptThisTabCapture", "--window-size=640,360", `--remote-debugging-port=${dport}`, `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });
function cleanup() {
  const dir = profile.replace(/'/g, "''");
  spawnSync("powershell", ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${dir}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`]);
  spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"]);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
process.on("SIGINT", () => { cleanup(); process.exit(130); });

let ws;
for (let i = 0; i < 60 && !ws; i++) { try { const p = (await (await fetch(`http://127.0.0.1:${dport}/json`)).json()).find((t) => t.type === "page"); if (p) ws = new WebSocket(p.webSocketDebuggerUrl); } catch {} if (!ws) await sleep(250); }
if (!ws) { cleanup(); throw new Error("No se pudo abrir Edge sin ventana"); }
await new Promise((r) => ws.addEventListener("open", r));
let mid = 0; const pend = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise((res) => { const i = ++mid; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression, extra = {}) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, ...extra })).result?.result?.value;
await send("Page.enable");
await send("Emulation.setFocusEmulationEnabled", { enabled: true });

async function listen(song) {
  await send("Page.navigate", { url: `http://lumiparty.com:${port}/scripts/video-lab.html?v=${song.yt}&sonido` });
  let st;
  for (let i = 0; i < 80; i++) { await sleep(250); const err = await ev("window.lab?.error"); if (err) throw new Error(`YouTube no deja reproducirlo aquí (error ${err})`); st = await ev("window.lab?.state?.()"); if (st?.s === 1 && st.t > 0) break; }
  if (st?.s !== 1) throw new Error("el video no empezó a reproducirse");
  await ev("window.lab.peek(0)"); await sleep(600);
  const r = await ev("window.lab.listen().then((x) => x.label, (e) => 'ERROR ' + e.message)", { userGesture: true });
  if (!r || r.startsWith("ERROR")) throw new Error(`no pude escuchar la pestaña: ${r}`);
  await ev("window.lab.seek(0)");
  const dur = st.d;
  let last = 0, lastWall = Date.now();
  while (true) {
    await sleep(1000);
    st = await ev("window.lab.state()");
    if (!st || st.s === 0 || st.t >= dur - 0.4) break;
    if (st.t !== last) { last = st.t; lastWall = Date.now(); } else if (Date.now() - lastWall > 20000) throw new Error("el video se quedó detenido");
    if (Math.round(st.t) % 30 === 0) process.stdout.write(`\r  ${song.id}: ${Math.round((st.t / dur) * 100)} %   `);
  }
  process.stdout.write("\n");
  await ev("window.lab.stopListening()");
  const raw = JSON.parse((await ev("JSON.stringify(window.lab.audio)")) || "[]");
  await ev("window.lab.pause()");
  if (raw.length < 500) throw new Error(`muy pocas muestras de audio (${raw.length})`);
  const peak = Math.max(...raw.map((x) => x[1]));
  if (!(peak > 0.05)) throw new Error("el audio llegó en silencio (¿pestaña silenciada?)");
  return raw;
}

let ok = 0;
try {
  for (const id of ids) {
    const song = songs.find((s) => s.id === id);
    if (!song) { console.log(`✗ ${id}: no está en el catálogo`); continue; }
    const t0 = Date.now();
    try {
      // Energía medida (solo números, no es audio) guardada fuera del proyecto: con --redisenar se rediseña con las
      // reglas nuevas sin volver a escuchar.
      const cache = join(homedir(), ".cache", "lumiparty", "audio");
      mkdirSync(cache, { recursive: true });
      const rawFile = join(cache, `${id}.json`);
      let raw;
      if (args.includes("--redisenar") && existsSync(rawFile)) raw = JSON.parse(readFileSync(rawFile, "utf8"));
      else { raw = await listen(song); writeFileSync(rawFile, JSON.stringify(raw)); }
      const f = audioFeatures(raw, { bpmHint: song.bpm || 0 });
      // Colores del MV recién medidos (el análisis de video puede ir corriendo a la vez).
      const { VIDEO_LOOKS: vl } = await import(new URL("../src/video-looks.js", import.meta.url).href + "?" + Date.now()).catch(() => ({ VIDEO_LOOKS }));
      let seq = autoDesign({ song, look: lookFor(song.id), video: vl[song.id] ?? VIDEO_LOOKS[song.id] ?? null, f });
      // Si Gemini ya describió el video (npm run gemini:colors), cada tramo toma los colores de su momento.
      const gem = join(root, "docs", "secuencias", "gemini", `${id}.json`);
      if (existsSync(gem)) seq = recolor(seq, JSON.parse(readFileSync(gem, "utf8")), lookFor(song.id));
      const [{ errors }] = checkAll([{ seq }]);
      const file = join(OUTDIR, `${id}.json`);
      writeFileSync(file, JSON.stringify(seq, null, 2));
      if (errors.length) { console.log(`✗ ${id}: el diseño no pasó el validador: ${errors[0]}`); continue; }
      spawnSync(process.execPath, [join(root, "scripts", "import-sequences.mjs"), file], { stdio: "ignore" });
      ok++;
      console.log(`✓ ${id}: ${seq.tramos.length} tramos, ${seq.tramos.reduce((a, t) => a + t.acentos.length, 0)} acentos, ${seq.bpm} BPM, ${seq.duracion} s (${Math.round((Date.now() - t0) / 1000)} s)`);
    } catch (e) { console.log(`✗ ${id}: ${e.message}`); }
  }
} finally { ws.close(); cleanup(); }
console.log(`${ok}/${ids.length} diseñadas → docs/secuencias/auto/ e importadas a src/sequences.js`);
process.exit(ok ? 0 : 1);
