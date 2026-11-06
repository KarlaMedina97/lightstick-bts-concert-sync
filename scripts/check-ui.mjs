// Prueba de interfaz en un navegador real (Edge o Chrome sin ventana) antes de desplegar cambios que pueden romper
// la página: HTML, CSS, src/landing.js, src/app.js… Las pruebas unitarias no ven el layout; esto sí.
//
//   npm run check:ui            (sale con error si algo falla; sin navegador instalado, avisa y no bloquea)
//   npm run check:ui -- --strict  (sin navegador también falla: para CI)
//
// Qué revisa, en teléfono (390×844) y escritorio (1440×900):
//   - ninguna excepción de JavaScript al cargar ni al usar lo básico;
//   - sin scroll horizontal en ninguna página;
//   - inicio: la anatomía queda fija (sticky) mientras se hace scroll por ella; los íconos de los pasos son SVG y no hay
//     caracteres sin fuente en iPhone/iPad (runas ᛒ, ⏻ … salían como un cuadro con X);
//   - reproductor: Video sin canción avisa y no cambia de vista; Mis videos abre su página; la opinión empieza con
//     estrellas; el ARMY Bomb 3D de Luces carga, cambia de versión y se arrastra sin errores.
// Deja capturas en .ui-check/ para mirarlas (no se publican ni se suben al repo).
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const strict = process.argv.includes("--strict");
const outDir = join(root, ".ui-check");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BROWSERS = [
  process.env.BROWSER,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge",
].filter(Boolean);
const browserPath = BROWSERS.find((p) => existsSync(p));
if (!browserPath) {
  console.warn("check:ui — no encontré Edge ni Chrome (define BROWSER=ruta). Se omite la prueba de interfaz.");
  process.exit(strict ? 1 : 0);
}

// Servidor local en un puerto libre (el mismo de npm run dev).
const port = 5600 + Math.floor(Math.random() * 300);
const server = spawn(process.execPath, [join(root, "scripts/serve.mjs")], { env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
const base = `http://localhost:${port}`;
for (let i = 0; i < 40; i++) { try { await fetch(base + "/"); break; } catch { await sleep(150); } }

const debugPort = 9400 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), "pws-ui-"));
const browser = spawn(browserPath, [
  "--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars", "--mute-audio",
  "--no-first-run", "--no-default-browser-check", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });

let ws;
for (let i = 0; i < 60 && !ws; i++) {
  try {
    const page = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find((t) => t.type === "page");
    if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
  } catch {}
  if (!ws) await sleep(250);
}
await new Promise((r) => ws.addEventListener("open", r));
let seq = 0;
const pending = new Map();
let exceptions = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") {
    const d = m.params.exceptionDetails;
    exceptions.push((d.exception?.description || d.text || "").split("\n").slice(0, 2).join(" ").slice(0, 240));
  }
});
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => {
  if (process.env.UI_DEBUG) console.log("·", expression.slice(0, 70).replace(/\s+/g, " "));
  const r = await Promise.race([
    send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }),
    sleep(20000).then(async () => {
      const where = await Promise.race([send("Runtime.evaluate", { expression: "String(window.__p)", returnByValue: true }).then((x) => x.result?.result?.value), sleep(3000).then(() => "(congelada)")]);
      return { result: { exceptionDetails: { exception: { description: `la página no respondió en 20 s (último paso: ${where})` } } } };
    }),
  ]);
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? "error al evaluar");
  return r.result?.result?.value;
};
await send("Page.enable");
await send("Runtime.enable");
// GSAP en un navegador sin ventana avanza lento (lagSmoothing): sin esto las animaciones parecen trabadas.
await send("Page.addScriptToEvaluateOnNewDocument", { source: "addEventListener('load',()=>{try{gsap.ticker.lagSmoothing(0)}catch{}});try{localStorage.setItem('pws.tour.v1','1')}catch{}" });

const failures = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);
mkdirSync(outDir, { recursive: true });
async function shot(name) {
  const r = await send("Page.captureScreenshot", { format: "png" });
  if (r.result?.data) writeFileSync(join(outDir, `${name}.png`), Buffer.from(r.result.data, "base64"));
}
async function open(path, w, h, wait = 3500) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 720 });
  exceptions = [];
  await send("Page.navigate", { url: base + path });
  await sleep(wait);
}
const noOverflow = `document.documentElement.scrollWidth <= innerWidth + 1`;
// Caracteres que iPhone/iPad no tienen en sus fuentes (se ven como un cuadro): runas, símbolos de encendido.
const missingGlyphs = `(() => { const m = document.body.innerText.match(/[\\u16A0-\\u16FF\\u23FB-\\u23FE\\u2B58]/g); return m ? [...new Set(m)].join(" ") : ""; })()`;

const VIEWPORTS = [["teléfono", 390, 844], ["escritorio", 1440, 900]];

for (const [vp, w, h] of VIEWPORTS) {
  // ---------- Inicio ----------
  const at = `inicio (${vp})`;
  await open("/", w, h, 4500);
  if (!(await evaluate(noOverflow))) fail(at, "hay scroll horizontal");
  const glyphs = await evaluate(missingGlyphs);
  if (glyphs) fail(at, `caracteres sin fuente en iPhone/iPad: ${glyphs}`);
  const icons = await evaluate(`[...document.querySelectorAll(".st-ico")].every((i) => i.querySelector("svg"))`);
  if (!icons) fail(at, "un ícono de los pasos no es SVG");
  if (w >= 720) {
    // La anatomía es "pegajosa": al avanzar por ella, el escenario se queda arriba.
    const sticky = await evaluate(`(async () => {
      const a = document.querySelector(".anatomy"), st = document.querySelector(".anat-stage");
      if (!a || !st) return "no está la sección de anatomía";
      const top = a.getBoundingClientRect().top + scrollY, run = a.offsetHeight - innerHeight;
      const tops = [];
      for (const f of [0.2, 0.6]) { scrollTo(0, top + run * f); await new Promise((r) => setTimeout(r, 700)); tops.push(Math.round(st.getBoundingClientRect().top)); }
      return tops.every((t) => Math.abs(t) <= 2) ? "" : "el escenario se movió (" + tops.join(", ") + " px): lo pegajoso no funciona";
    })()`);
    if (sticky) fail(at, `anatomía: ${sticky}`);
    await shot(`inicio-anatomia-${w}`);
  }
  await evaluate(`document.querySelector("#conectar")?.scrollIntoView({ block: "center" })`);
  await sleep(1500);
  await shot(`inicio-conectar-${w}`);
  if (exceptions.length) fail(at, `excepciones: ${[...new Set(exceptions)].join(" | ")}`);

  // ---------- Reproductor ----------
  const ap = `reproductor (${vp})`;
  await open("/player/", w, h, 1500);
  // Cada tamaño empieza de cero (sin la canción ni los ajustes que dejó la prueba anterior).
  await evaluate(`localStorage.clear(); localStorage.setItem("pws.tour.v1", "1"); 1`);
  await open("/player/", w, h, 4000);
  if (!(await evaluate(noOverflow))) fail(ap, "hay scroll horizontal");
  const glyphsP = await evaluate(missingGlyphs);
  if (glyphsP) fail(ap, `caracteres sin fuente en iPhone/iPad: ${glyphsP}`);
  await shot(`reproductor-${w}`);
  const video = await evaluate(`(async () => {
    document.getElementById("view-video").click();
    await new Promise((r) => setTimeout(r, 300));
    const sel = document.querySelector("[id^=view-][aria-selected=true]")?.id;
    const t = document.getElementById("toast");
    return sel === "view-video" ? "Video sin canción cambió de vista" : t.hidden || !t.textContent ? "Video sin canción no avisó" : "";
  })()`);
  if (video) fail(ap, video);
  const pages = await evaluate(`(async () => {
    document.getElementById("btn-queue").click();
    await new Promise((r) => setTimeout(r, 500));
    if (document.getElementById("videos-page").hidden) return "Mis videos no abrió su página";
    document.getElementById("vp-back").click();
    await new Promise((r) => setTimeout(r, 400));
    return document.getElementById("home").hidden ? "Volver desde Mis videos no regresó a Explorar" : "";
  })()`);
  if (pages) fail(ap, pages);
  const fb = await evaluate(`(async () => {
    document.getElementById("btn-feedback").click();
    await new Promise((r) => setTimeout(r, 600));
    const p = document.getElementById("panel-feedback");
    if (p.hidden) return "Dar mi opinión no abrió";
    if (!document.getElementById("fb-more").hidden) return "la opinión no empieza solo con estrellas";
    document.getElementById("fb-r2").click();
    await new Promise((r) => setTimeout(r, 200));
    return document.getElementById("fb-more").hidden ? "tras elegir estrellas no aparecen las preguntas" : "";
  })()`);
  if (fb) fail(ap, fb);
  await shot(`reproductor-opinion-${w}`);
  // Luces: el ARMY Bomb 3D carga, cambia de versión y se puede arrastrar sin errores.
  const lights = await evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__p = "inicio";
    document.querySelector("#panel-feedback .close")?.click();
    document.getElementById("view-lights").click();
    window.__p = "luces";
    await wait(400);
    document.getElementById("lv-stick").click();
    window.__p = "3d pedido";
    await wait(2500);
    window.__p = "3d listo";
    const c = document.querySelector(".s3d-canvas");
    if (!c) return "el ARMY Bomb 3D no se creó";
    document.querySelector('[data-ver="v2"]').click();
    await wait(800);
    const r = c.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const ev = (t, px) => c.dispatchEvent(new PointerEvent(t, { clientX: px, clientY: y, pointerId: 7, bubbles: true }));
    ev("pointerdown", x);
    // Sin pausas entre movimientos: sin ventana, el navegador frena los temporizadores (20 × 16 ms ≈ 20 s).
    for (let i = 0; i < 20; i++) ev("pointermove", x + Math.sin(i / 2) * 120);
    ev("pointerup", x);
    await wait(600);
    document.getElementById("lv-orb").click();
    return "";
  })()`);
  if (lights) fail(ap, lights);
  if (exceptions.length) fail(ap, `excepciones: ${[...new Set(exceptions)].join(" | ")}`);

  // Dirección amigable de una canción: /player/<id> abre el reproductor (sin 404) y la conserva.
  await open("/player/dynamite", w, h, 3500);
  const friendly = await evaluate(`document.getElementById("main") ? (location.pathname.endsWith("/player/dynamite") ? "" : "la dirección cambió a " + location.pathname) : "no abrió el reproductor"`);
  if (friendly) fail(`/player/dynamite (${vp})`, friendly);
  if (exceptions.length) fail(`/player/dynamite (${vp})`, `excepciones: ${[...new Set(exceptions)].join(" | ")}`);

  // ---------- Páginas de texto ----------
  for (const path of ["/privacy/", "/terms/", "/ai/", "/404.html"]) {
    await open(path, w, h, 1500);
    if (!(await evaluate(noOverflow))) fail(`${path} (${vp})`, "hay scroll horizontal");
    if (exceptions.length) fail(`${path} (${vp})`, `excepciones: ${[...new Set(exceptions)].join(" | ")}`);
  }
}

ws.close();
browser.kill();
server.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}

if (failures.length) {
  console.error(`check:ui — ${failures.length} problema(s):\n  - ${failures.join("\n  - ")}\nCapturas en .ui-check/`);
  process.exit(1);
}
console.log(`check:ui — OK (inicio, reproductor y páginas de texto en 390 y 1440 px). Capturas en .ui-check/`);
process.exit(0);
