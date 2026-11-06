// Analiza el MV oficial de una canción cuadro a cuadro y guarda su "look de video" en src/video-looks.js.
//
//   npm run analyze:video -- dynamite            una canción (por id del catálogo)
//   npm run analyze:video -- dynamite butter     varias
//   npm run analyze:video -- --missing           todas las que aún no tienen análisis
//   opciones: --rate 2 (velocidad de reproducción, 1–2), --fps 4 (capturas por segundo de video)
//
// Cómo: abre scripts/video-lab.html (local, no se publica) en Edge sin ventana, que inserta el reproductor OFICIAL de
// YouTube igual que LumiParty. Captura lo que se ve (80×45 px) varias veces por segundo y lo reduce a números:
// colores dominantes por sección, brillo, saturación y movimiento (cortes de escena). No descarga el video, no lee
// el audio ni los subtítulos (nada de letras) y no guarda imágenes: solo colores e intensidades.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ALBUMS } from "../src/catalog.js";
import { dominantColors } from "../src/videopalette.js";
import { STRUCTURE } from "../src/patterns.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUT = join(root, "src", "video-looks.js");
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? Number(args[i + 1]) : def; };
const RATE = Math.min(2, Math.max(1, opt("--rate", 1)));
const FPS = Math.min(8, Math.max(1, opt("--fps", 4)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const songs = ALBUMS.flatMap((a) => a.songs.map((s) => ({ ...s, album: a })));
let looks = {};
try { looks = JSON.parse(readFileSync(OUT, "utf8").match(/export const VIDEO_LOOKS = (\{[\s\S]*\});/)[1]); } catch {}
const ids = args.includes("--missing")
  ? songs.filter((s) => s.yt && !looks[s.id]).map((s) => s.id)
  : args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!ids.length) { console.log("Uso: npm run analyze:video -- <id> [<id>…] | --missing"); process.exit(1); }

// Palabras del TÍTULO oficial (nunca de la letra) que sugieren un color; solo pesan si el video da poco color.
const TITLE_COLORS = [
  [/fire|flame|blood|red/i, "#ff2a00"], [/butter|gold|sun|sunshine/i, "#ffd000"], [/blue|sea|ocean|rain|swim/i, "#2f7dff"],
  [/spring|snow|winter|white/i, "#cfe8ff"], [/purple|borahae|violet/i, "#8a2be2"], [/pink|love|heart|boy with luv/i, "#ff4fa3"],
  [/black|dark|swan|night/i, "#e8e8ff"], [/green|forest|leaf/i, "#38e070"], [/dynamite|rainbow|disco|party/i, "#ff4fa3"],
];

// --- servidor local + Edge sin ventana -----------------------------------------------------------------------------
const port = 5500 + Math.floor(Math.random() * 300);
const server = spawn(process.execPath, [join(root, "scripts", "serve.mjs")], { env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
const profile = mkdtempSync(join(tmpdir(), "pws-video-"));
const dport = 9300 + Math.floor(Math.random() * 300);
const browser = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", [
  "--headless=new", "--autoplay-policy=no-user-gesture-required", "--mute-audio", "--window-size=640,360",
  `--remote-debugging-port=${dport}`, `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });
function cleanup() {
  if (process.platform === "win32") {
    const dir = profile.replace(/'/g, "''");
    spawnSync("powershell", ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${dir}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`]);
    spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"]);
  } else { browser.kill(); server.kill(); }
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
const ev = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send("Page.enable");
await send("Emulation.setFocusEmulationEnabled", { enabled: true }); // sin esto la pestaña cuenta como oculta y no avanza
await send("Emulation.setDeviceMetricsOverride", { width: 640, height: 360, deviceScaleFactor: 1, mobile: false });

// --- análisis de un video ------------------------------------------------------------------------------------------
async function analyze(song) {
  await send("Page.navigate", { url: `http://127.0.0.1:${port}/scripts/video-lab.html?v=${song.yt}` });
  let st = null;
  for (let i = 0; i < 80; i++) { // hasta 20 s para que empiece
    await sleep(250);
    const err = await ev("window.lab?.error");
    if (err) throw new Error(`YouTube no deja reproducirlo aquí (error ${err})`);
    st = await ev("window.lab?.state?.()");
    if (st?.s === 1 && st.t > 0) break;
  }
  if (st?.s !== 1) throw new Error("el video no empezó a reproducirse");
  if (RATE > 1) await ev(`window.lab.rate(${RATE})`);
  const dur = st.d, samples = [];
  // Cuadros continuos del navegador (screencast): mucho más rápido que pedir una captura cada vez.
  let frame = null;
  const onFrame = (e) => {
    const m = JSON.parse(e.data);
    if (m.method !== "Page.screencastFrame") return;
    send("Page.screencastFrameAck", { sessionId: m.params.sessionId });
    frame = m.params.data; // solo importa el más reciente
  };
  ws.addEventListener("message", onFrame);
  await send("Page.startScreencast", { format: "jpeg", quality: 70, maxWidth: 160, maxHeight: 90, everyNthFrame: 1 });
  let lastT = st.t, lastWall = Date.now(), lastSampleT = -1;
  const gap = (1 / FPS) * 0.9; // segundos de video entre muestras
  try {
    while (true) {
      st = await ev("window.lab.state()");
      if (!st || st.s === 0 || st.t >= dur - 0.3) break; // terminó
      if (st.t !== lastT) { lastT = st.t; lastWall = Date.now(); } else if (Date.now() - lastWall > 15000) throw new Error("el video se quedó detenido");
      if (frame && st.s === 1 && st.t - lastSampleT >= gap) {
        const data = frame; frame = null;
        const a = await ev(`window.lab.analyze("data:image/jpeg;base64,${data}")`);
        if (a) { samples.push({ t: st.t, ...a }); lastSampleT = st.t; }
        if (samples.length % 40 === 0) process.stdout.write(`\r  ${song.id}: ${Math.round((st.t / dur) * 100)} %   `);
      } else await sleep(10);
    }
  } finally {
    await send("Page.stopScreencast");
    ws.removeEventListener("message", onFrame);
  }
  process.stdout.write("\n");
  await ev("window.lab.pause()");
  if (samples.length < 20) throw new Error(`muy pocas capturas (${samples.length})`);
  return summarize(song, dur, samples);
}

// Intensidad por sección: movimiento (cortes y cámara), brillo y color. Se normaliza dentro de la canción, así el
// coro más movido del MV queda arriba y el momento más quieto abajo.
function summarize(song, dur, samples) {
  const sec = STRUCTURE.map(([, a, b]) => samples.filter((s) => s.t >= a * dur && s.t < b * dur));
  const mean = (arr, k) => (arr.length ? arr.reduce((x, s) => x + s[k], 0) / arr.length : 0);
  const cutAt = 0.18; // diferencia media entre capturas que cuenta como corte de escena
  const raw = sec.map((list) => {
    const cuts = list.filter((s) => s.diff > cutAt).length;
    const secs = Math.max(1, list.length / FPS);
    return 0.5 * mean(list, "diff") * 6 + 0.25 * mean(list, "lum") + 0.15 * mean(list, "sat") + 0.1 * Math.min(1, cuts / secs);
  });
  const lo = Math.min(...raw), hi = Math.max(...raw);
  const curve = raw.map((v) => +(0.45 + 0.55 * ((v - lo) / (hi - lo || 1))).toFixed(2));
  // Colores: cada captura elige sus colores vivos (como la portada en src/videopalette.js) y la sección se queda
  // con los que más se repiten. Promediar todos los píxeles juntos borraba los colores de los MV muy variados.
  for (const s of samples) { s.cols = dominantColors(new Uint8ClampedArray(s.px), 3); delete s.px; }
  const frames = sec.map((list) => vote(list, 3));
  let overall = vote(samples, 4);
  const title = TITLE_COLORS.filter(([re]) => re.test(song.title)).map(([, c]) => c);
  if (overall.length < 2) overall = [...new Set([...overall, ...title])];
  const cutsPerMin = +((samples.filter((s) => s.diff > cutAt).length / (samples.length / FPS)) * 60).toFixed(1);
  return {
    yt: song.yt, analyzed: new Date().toISOString().slice(0, 10), dur: Math.round(dur), samples: samples.length,
    overall, frames: frames.map((f) => (f.length ? f : overall)), curve, cutsPerMin, ...(title.length ? { title } : {}),
  };
}

const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hexOf = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
function hueOf([r, g, b]) {
  const M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m;
  if (!d) return 0;
  return (M === r ? ((g - b) / d + 6) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
}
/** Votación por tono (12 grupos): 1.º color de cada captura vale 3, el 2.º 2 y el 3.º 1. Quedan los grupos con ≥ 12 %. */
function vote(list, k) {
  const g = Array.from({ length: 12 }, () => ({ w: 0, c: [0, 0, 0] }));
  for (const s of list) s.cols.forEach((h, i) => { const c = rgbOf(h), b = g[Math.floor(hueOf(c) * 12) % 12], w = 3 - i; b.w += w; b.c = b.c.map((v, j) => v + c[j] * w); });
  const total = g.reduce((a, b) => a + b.w, 0);
  if (!total) return [];
  return g.filter((b) => b.w / total >= 0.12).sort((a, b) => b.w - a.w).slice(0, k).map((b) => hexOf(b.c.map((v) => v / b.w)));
}

function save() {
  const sorted = Object.fromEntries(Object.keys(looks).sort().map((k) => [k, looks[k]]));
  writeFileSync(OUT, `// GENERADO por scripts/analyze-video.mjs (npm run analyze:video). No editar a mano.
// Por canción: colores dominantes del MV oficial por sección (intro, verso, pre-coro, coro, verso 2, coro 2, puente,
// coro final, final), una curva de intensidad 0–1 sacada del movimiento, brillo y color del video, y cortes por
// minuto. Solo números: ninguna imagen, audio ni texto del video.
export const VIDEO_LOOKS = ${JSON.stringify(sorted, null, 0).replace(/\},"/g, '},\n"')};
`);
}

let ok = 0;
try {
  for (const id of ids) {
    const song = songs.find((s) => s.id === id);
    if (!song?.yt) { console.log(`✗ ${id}: no está en el catálogo o no tiene video`); continue; }
    const t0 = Date.now();
    try {
      looks[id] = await analyze(song);
      save(); ok++;
      const l = looks[id];
      console.log(`✓ ${id}: ${l.samples} capturas en ${Math.round((Date.now() - t0) / 1000)} s · colores ${l.overall.join(" ")} · curva ${l.curve.join(" ")} · ${l.cutsPerMin} cortes/min`);
    } catch (e) { console.log(`✗ ${id}: ${e.message}`); }
  }
} finally { ws.close(); cleanup(); }
console.log(`${ok}/${ids.length} analizadas → src/video-looks.js`);
process.exit(ok ? 0 : 1);
