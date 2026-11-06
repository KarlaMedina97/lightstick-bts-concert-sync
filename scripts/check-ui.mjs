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
//     estrellas; el ARMY Bomb 3D de Luces carga, cambia de versión y se arrastra sin errores;
//   - políticas de YouTube (con YouTube simulado): en Video, Explorar y Luces el reproductor se ve entero, mide al menos
//     200 × 200 px y nada lo tapa ("A continuación", fanchant, avisos, chip de luces, pie de página, fuegos artificiales).
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
const evaluateOnce = async (expression, ms) => {
  return Promise.race([
    send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }),
    sleep(ms).then(async () => {
      const where = await Promise.race([send("Runtime.evaluate", { expression: "String(window.__p)", returnByValue: true }).then((x) => x.result?.result?.value), sleep(3000).then(() => "(congelada)")]);
      return { timeout: true, where };
    }),
  ]);
};
// Con el equipo cargado (otros navegadores abiertos) una evaluación puede tardar: 40 s y un reintento antes de fallar.
const evaluate = async (expression) => {
  if (process.env.UI_DEBUG) console.log("·", expression.slice(0, 70).replace(/\s+/g, " "));
  let r = await evaluateOnce(expression, 40000);
  if (r.timeout) r = await evaluateOnce(expression, 40000);
  if (r.timeout) throw new Error(`la página no respondió en 40 s (dos intentos) en: ${expression.slice(0, 60).replace(/\s+/g, " ")}… (último paso: ${r.where})`);
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

// YouTube simulado (sin red): reproduce al instante y avisa sus cambios de estado como el de verdad.
const YT_STUB = `(() => {
  class P {
    constructor(el, o) { this.o = o; this.s = 5; this.off = 0; this.t0 = 0; setTimeout(() => o.events?.onReady?.({ target: this }), 60);
      return new Proxy(this, { get: (t, k) => (k in t ? t[k] : () => undefined) }); }
    emit(s) { window.__yt = this; this.s = s; this.o.events?.onStateChange?.({ data: s, target: this }); }
    loadVideoById() { this.off = 0; this.t0 = performance.now(); this.emit(1); }
    cueVideoById() { this.off = 0; this.emit(5); }
    playVideo() { this.t0 = performance.now(); this.emit(1); }
    pauseVideo() { this.off = this.getCurrentTime(); this.emit(2); }
    seekTo(x) { this.off = x; this.t0 = performance.now(); }
    getDuration() { return 213; }
    getCurrentTime() { return this.s === 1 ? this.off + (performance.now() - this.t0) / 1000 : this.off; }
    getPlayerState() { return this.s; }
    getIframe() { return document.createElement("iframe"); }
    getVideoData() { return { title: "" }; }
  }
  window.YT = { Player: P, PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } };
})();`;
// En cada vista: "A continuación" forzado + un aviso, y luego el fin de la canción (fanchant y fuegos artificiales).
const YT_POLICY = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const shown = (el) => el && !el.hidden && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none";
  const hit = (a, b) => Math.min(a.right, b.right) > Math.max(a.left, b.left) + 1 && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 1;
  if (!window.__yt) return "la canción no empezó (YouTube simulado)";
  document.querySelectorAll(".tour .tour-skip").forEach((b) => b.click());
  const errs = [];
  const check = (label) => {
    const r = $(".video-box").getBoundingClientRect();
    if (!shown($("#video-view")) || r.height < 199.5 || r.width < 199.5 || r.top < 0 || r.bottom > innerHeight) errs.push(label + ": el video no se ve entero o mide menos de 200 px (" + [r.width, r.height].map(Math.round).join("×") + ")");
    for (const s of ["#upnext", "#chant", "#toast", ".style-chip", ".dock", ".tour"]) if (shown($(s)) && hit(r, $(s).getBoundingClientRect())) errs.push(label + ": " + s + " tapa el video");
    const fw = $("canvas.fireworks");
    if (fw && r.width) { const d = fw.width / innerWidth; const px = fw.getContext("2d").getImageData(r.left * d, r.top * d, r.width * d, r.height * d).data; for (let k = 3; k < px.length; k += 4) if (px[k]) { errs.push(label + ": fuegos artificiales sobre el video"); break; } }
  };
  for (const v of ["video", "explore", "lights"]) {
    document.getElementById("view-" + v).click();
    await wait(700);
    check(v);
    $("#upnext").dataset.force = "1";
    $("#dock-like").click();
    await wait(500);
    check(v + " + A continuación y aviso");
    delete $("#upnext").dataset.force;
    window.__yt.emit(0);
    await wait(1500);
    check(v + " + fanchant");
    $("#chant-skip").click();
    await wait(800);
  }
  return errs.join("; ");
})()`;

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
  // Conexión (flujo crítico): guía → «Omitir guía» abre el panel de conexión solo, sin nada encima, y Conectar
  // sigue pidiendo la lista de dispositivos al navegador (se simula: aquí no hay Bluetooth de verdad).
  const conn = await evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const $ = (id) => document.getElementById(id);
    let asked = 0;
    const fake = { requestDevice: async () => { asked++; throw Object.assign(new Error("User cancelled the requestDevice() chooser."), { name: "NotFoundError" }); }, getAvailability: async () => true, getDevices: async () => [] };
    try { Object.defineProperty(navigator, "bluetooth", { value: fake, configurable: true }); } catch {}
    $("btn-bt").click();
    await wait(400);
    if ($("panel-bt").hidden) return "Conectar no abrió el panel de conexión";
    $("btn-guide").click();
    await wait(500);
    if ($("guide").hidden) return "Ver la guía no abrió la guía";
    if (!$("panel-bt").hidden) return "la guía se abrió con el panel de conexión encima";
    $("g-skip").click();
    await wait(500);
    if (!$("guide").hidden) return "Omitir guía no cerró la guía";
    if (!$("coach-pill").hidden) return "tras omitir quedó la burbuja de la guía";
    if ($("btn-bt").classList.contains("resume")) return "tras omitir, Conectar quedó como «seguir la guía»";
    if ($("panel-bt").hidden) return "Omitir guía no abrió el panel de conexión";
    const open = [...document.querySelectorAll(".panel")].filter((p) => !p.hidden && p.id !== "panel-bt").map((p) => p.id);
    if (open.length) return "otro panel quedó abierto: " + open.join(", ");
    const c = $("btn-connect");
    if (document.activeElement !== c) return "el foco no quedó en Conectar ARMY Bomb";
    // Se mide la posición final (sin la animación de la hoja, que en el navegador sin ventana puede no avanzar).
    const still = document.createElement("style");
    still.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}";
    document.head.append(still);
    await wait(100);
    const r = c.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!c.contains(top)) return "algo tapa Conectar ARMY Bomb: " + (top ? (top.id || String(top.className?.baseVal ?? top.className) || top.tagName) + " en " + (top.closest("[id]")?.id ?? "") : "nada (fuera de pantalla)") + " · botón y=" + Math.round(r.top) + "/" + innerHeight;
    still.remove();
    c.click();
    await wait(800);
    if (!asked) return "Conectar ARMY Bomb no abrió la lista de dispositivos";
    return "";
  })()`);
  if (conn) fail(ap, `conexión: ${conn}`);
  await shot(`reproductor-conexion-${w}`);
  await evaluate(`document.querySelector("#panel-bt .close")?.click()`);
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

  // Políticas de YouTube: mientras suena, el reproductor se ve entero (≥ 200 × 200 px) en Video, Explorar y Luces, y
  // nada lo tapa ("A continuación", fanchant, avisos, chip de luces, pie de página). YouTube simulado: sin red.
  const stub = await send("Page.addScriptToEvaluateOnNewDocument", { source: YT_STUB });
  await open("/player/dynamite", w, h, 4000);
  const yt = await evaluate(YT_POLICY);
  if (yt) fail(`políticas de YouTube (${vp})`, yt);
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: stub.result.identifier });
  await evaluate(`localStorage.removeItem("pws.queue.v1")`);

  // ---------- Páginas de texto ----------
  for (const path of ["/privacy/", "/terms/", "/ai/", "/404.html"]) {
    await open(path, w, h, 1500);
    if (!(await evaluate(noOverflow))) fail(`${path} (${vp})`, "hay scroll horizontal");
    // Todos los enlaces visibles se pueden tocar (no hay nada encima que se lleve el clic).
    const dead = await evaluate(`(() => { const bad = []; for (const a of document.querySelectorAll("a[href]")) { a.scrollIntoView({ block: "center" }); const r = a.getClientRects()[0]; if (!r || !r.width) continue; /* primera línea: un enlace partido en dos líneas no tiene nada en el centro de su caja */ const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!(el === a || a.contains(el))) bad.push(a.textContent.trim().slice(0, 24)); } return bad.join(", "); })()`);
    if (dead) fail(`${path} (${vp})`, `enlaces que no se pueden tocar: ${dead}`);
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
