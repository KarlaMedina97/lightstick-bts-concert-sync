import { ALBUMS, CONCERT_FILMS } from "./catalog.js";
import { PURPLE, STYLES, generateConcertPattern, generatePattern, hexToRgb, rgbToHex, ledLevel, lightColors } from "./patterns.js";
import { fireworks } from "./fireworks.js";
import { pageview, event as track, analyticsOff, setAnalyticsOff } from "./analytics.js";
let fx = null; // fuegos artificiales (se crean la primera vez que termina una canción)
import { bluetoothSupport, requestStick, LOW_BATTERY, isBrave, classifyBtError, browserInfo } from "./ble.js";
import { Player } from "./player.js";
import { DONATIONS, PROJECT } from "./config.js";
import { RhythmChallenge, MIN_TAPS_FOR_RANKING } from "./rhythm.js";
import { NETWORKS, clearAllLocalData, loadProfile, normalizeHandle, profileUrl, saveProfile, submitScore, topScores } from "./leaderboard.js";
import { buildFeedback, sendFeedback } from "./feedback.js";
import { MicSync } from "./mic.js";
import { fetchTitle, parseYouTubeId, isOfficialChannel } from "./youtube.js";
import { Guide } from "./guide.js";
import { Fanchant } from "./fanchant.js";
import { favorites } from "./favorites.js";
import { Tour } from "./tour.js";
import { CameraColor } from "./camera.js";
import { shelves, upNext, myAlbums } from "./suggest.js";
import { songTheme } from "./palette.js";
import { PlayQueue } from "./queue.js";
import { initTooltips } from "./tooltip.js";
import { lang, t } from "./i18n.js";
import { say } from "./announce.js";
import { earcon, buzz, configureEarcons } from "./earcons.js";
import { colorName } from "./palette.js";
import { videoPalette } from "./videopalette.js";
import { VIDEO_LOOKS } from "./video-looks.js";
import { watchUpdates } from "./update-watch.js";
import { inAppBrowser, showInAppNotice, redirectConnectButtons, chromeIntent } from "./inapp.js";

const $ = (id) => document.getElementById(id);
const app = $("app");
const SIM_COUNT = 7;
const BLUEFY_URL = "https://apps.apple.com/app/id1492822055";
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// ---------- Almacenamiento local (solo comodidad; puede fallar en modo privado) ----------
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

const SETTINGS_KEY = "pws.settings.v1";
const defaults = { brightness: 100, latencyMs: 60, style: "auto", safeMode: true, autoNext: true, albumEnd: "next", wake: true, chant: true, chantVoice: false, lightsModel: "orb", stickVer: "", sounds: true, describe: false, keys: true, calm: false, bpm: {}, phase: {} };
const settings = { ...defaults, ...store.get(SETTINGS_KEY, {}) };
// 2026-11-05: la descripción de las luces queda apagada para todos (una sola vez; después cada quien la activa en Ajustes).
if (!store.get("pws.migr.describeOff", false)) { settings.describe = false; store.set("pws.migr.describeOff", true); store.set(SETTINGS_KEY, settings); }
// Igual con "Con voz y aplausos" del fanchant: apagado para todos (el fanchant sigue, en silencio).
if (!store.get("pws.migr.chantVoiceOff", false)) { settings.chantVoice = false; store.set("pws.migr.chantVoiceOff", true); store.set(SETTINGS_KEY, settings); }
if (matchMedia("(prefers-reduced-motion: reduce)").matches) settings.safeMode = true;
const saveSettings = () => store.set(SETTINGS_KEY, settings);

// ---------- Cola: álbumes oficiales + "Mis videos" ----------
const MINE_KEY = "pws.mine.v1";
let mine = store.get(MINE_KEY, []);
const MINE_ALBUM = { id: "mine", title: "Mis videos", year: "", palette: ["#8a2be2", "#ff80ab", "#4fc3f7"] };
let queue = [];
function buildQueue() {
  queue = [
    ...ALBUMS.flatMap((album) => album.songs.map((song) => ({ album, song }))),
    ...mine.map((song) => ({ album: { ...MINE_ALBUM, songs: mine }, song })),
  ];
}
buildQueue();

// ---------- Estado ----------
let current = -1;
let pattern = null;
let patternDuration = 0;
let player;
let mic = null;
let view = "video";
let crowd = null;
let startTourLater = () => {};
let firstSongPending = true;
let tourScheduled = false;
let fanchant = null;
let guideRef = null; // guía de conexión (para que Conectar la retome si está minimizada)
let chantFlashAt = -1e9;
const sticks = [];

// ---------- Utilidades ----------
/** Aviso visible breve; también se dice por la región viva (el #toast no es región viva: aparece y se va). */
function toast(msg, ms = 4500, { assertive = false } = {}) {
  const el = $("toast");
  el.textContent = msg;
  fadeIn(el);
  dodgeVideo(el);
  say(msg, { assertive });
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => fadeOut(el), ms);
}
/** Rectángulo del reproductor de YouTube a la vista, o null. Sus políticas: nada encima del video ni de sus controles. */
function videoRect() {
  const card = $("video-view");
  if (current < 0 || card.hidden || app.classList.contains("home") || (app.classList.contains("mini-mode") && app.classList.contains("mini-off"))) return null;
  const r = card.querySelector(".video-box").getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? r : null;
}
const overlaps = (a, b, m = 10) => a.left < b.right + m && b.left < a.right + m && a.top < b.bottom + m && b.top < a.bottom + m;
/** Si el aviso tapa el video, prueba otra franja: arriba (sobre la cabecera) o abajo (sobre el pie de página). */
function dodgeVideo(el) {
  delete el.dataset.at;
  const v = videoRect();
  if (!v) return;
  for (const at of ["top", "bottom"]) {
    if (!overlaps(el.getBoundingClientRect(), v)) return;
    el.dataset.at = at;
  }
}
/** Aparecer / desvanecerse de verdad: [hidden] es display:none, así que primero se apaga la opacidad y luego se oculta. */
function fadeIn(el) {
  clearTimeout(el._fade);
  el.classList.remove("leaving");
  el.hidden = false;
}
function fadeOut(el, ms = 260) {
  if (el.hidden) return;
  clearTimeout(el._fade);
  el.classList.add("leaving");
  el._fade = setTimeout(() => { el.hidden = true; el.classList.remove("leaving"); }, ms);
}
const fmt = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};
const thumbUrl = (yt) => `https://i.ytimg.com/vi/${yt}/mqdefault.jpg`;
// ---------- Skeletons de miniaturas ----------
// Miniatura de fondo: se queda en esqueleto y se carga solo al entrar en pantalla (no las 248 de golpe).
const thumbIO = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((ents) => {
  for (const e of ents) {
    if (!e.isIntersecting) continue;
    thumbIO.unobserve(e.target);
    loadBgThumb(e.target);
  }
}, { rootMargin: "300px 0px" });
function loadBgThumb(el) {
  const url = el.dataset.thumb;
  if (!url) return;
  const im = new Image();
  im.onload = () => { el.style.backgroundImage = `url(${url})`; el.classList.remove("sk"); };
  im.onerror = () => el.classList.remove("sk");
  im.src = url;
}
function bgThumb(el, yt) {
  el.dataset.thumb = thumbUrl(yt);
  el.classList.add("sk");
  if (thumbIO) thumbIO.observe(el); else loadBgThumb(el);
}
/** Miniatura <img>: el contenedor muestra el esqueleto hasta que la imagen carga (y luego aparece suave). */
function imgThumb(box, img) {
  box.classList.add("sk");
  const done = () => box.classList.remove("sk");
  img.addEventListener("load", done, { once: true });
  img.addEventListener("error", done, { once: true });
  if (img.complete && img.naturalWidth) done();
}

// ---------- Paneles ----------
let openPanel = null;
let panelTrigger = null;
const phoneLayout = () => matchMedia("(max-width: 640px)").matches;
/** Con un panel o el cajón tapando la pantalla, lo de atrás queda inerte (VoiceOver/TalkBack no salen sin querer). */
let inerted = [];
function setModal(el, on) {
  for (const n of inerted) n.inert = false;
  inerted = [];
  el.toggleAttribute("aria-modal", on);
  if (on) el.setAttribute("aria-modal", "true");
  if (!on) return;
  for (const n of app.children) {
    if (n === el || n.contains(el) || n.matches("#toast, #sr-polite, #sr-assertive, .skip, dialog, #song-menu, .tip")) continue;
    n.inert = true;
    inerted.push(n);
  }
}
function showPanel(id, trigger) {
  if (openPanel === id) return closePanel();
  closePanel(false);
  const p = $(id);
  p.hidden = false;
  openPanel = id;
  panelTrigger = trigger ?? document.activeElement;
  // Si se abrió desde un menú (que se cierra), el foco vuelve al botón del menú.
  const pop = panelTrigger?.closest?.("[data-menu-for]");
  if (pop) panelTrigger = $(pop.dataset.menuFor);
  closeMenus();
  if (phoneLayout()) setModal(p, true);
  // Se enfoca el título: se oye el nombre del panel antes que "Cerrar".
  const h = p.querySelector("h2");
  if (h) { h.tabIndex = -1; h.focus(); } else p.querySelector(".close")?.focus();
}
function closePanel(restoreFocus = true) {
  if (!openPanel) return;
  const p = $(openPanel);
  const hadFocus = p.contains(document.activeElement);
  p.hidden = true;
  setModal(p, false);
  openPanel = null;
  if (p.id === "np-side") syncSideState();
  if (restoreFocus || hadFocus) panelTrigger?.focus?.();
}
/**
 * Hojas inferiores (teléfono): se arrastran hacia abajo desde su cabecera para cerrarlas. Tenían el indicador
 * de arrastre pero no respondían. Lejos o rápido → se cierra; poco → vuelve a su lugar.
 */
function bindSheetDrag() {
  for (const p of document.querySelectorAll(".panel")) {
    const head = p.querySelector(".panel-head");
    if (!head) continue;
    let y0 = null, t0 = 0, dy = 0;
    head.addEventListener("pointerdown", (e) => {
      if (!phoneLayout() || p.hidden || e.target.closest("button, a, input, select, [role=tab], label")) return;
      y0 = e.clientY; t0 = performance.now(); dy = 0;
      p.style.transition = "none";
      head.setPointerCapture?.(e.pointerId);
    });
    head.addEventListener("pointermove", (e) => {
      if (y0 == null) return;
      dy = Math.max(0, e.clientY - y0);
      p.style.transform = `translateY(${dy}px)`;
    });
    const end = () => {
      if (y0 == null) return;
      const v = dy / Math.max(1, performance.now() - t0);
      y0 = null;
      p.style.transition = "";
      p.style.transform = "";
      if (dy > 110 || (dy > 30 && v > 0.6)) closePanel();
    };
    head.addEventListener("pointerup", end);
    head.addEventListener("pointercancel", end);
  }
}
function bindPanels() {
  bindSheetDrag();
  document.querySelectorAll(".panel .close").forEach((b) => (b.onclick = () => closePanel()));
  // #btn-queue (Mis videos en la biblioteca) se maneja con [data-go], igual que los demás accesos.
  // "Ver canciones" lleva al buscador de Explorar (la lista ya está en pantalla).
  $("btn-settings").onclick = (e) => showPanel("panel-settings", e.currentTarget);
  $("btn-game").onclick = (e) => showPanel("panel-game", e.currentTarget);
  // Con la guía minimizada, Conectar la retoma en su paso; si no, abre el panel de Bluetooth.
  $("btn-bt").onclick = (e) => (guideRef?.isMinimized ? guideRef.restore() : showPanel("panel-bt", e.currentTarget));
  $("dock-bt").onclick = (e) => (guideRef?.isMinimized ? guideRef.restore() : showPanel("panel-bt", e.currentTarget));
  document.addEventListener("pointerdown", (e) => {
    if (!openPanel) return;
    if (e.target.closest(".panel") || e.target.closest("dialog") || e.target.closest(".toast, #song-menu, .cq-ghost") || e.target.closest("[aria-controls^='panel-']")) return;
    closePanel(false);
  });
}

function bindTabs(tabIds, onSelect) {
  const tabs = tabIds.map($);
  tabs.forEach((tab) => {
    tab.onclick = () => select(tab);
    tab.onkeydown = (e) => {
      const i = tabs.indexOf(tab);
      // Patrón de pestañas del APG: flechas, Inicio (primera) y Fin (última).
      const to = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[e.key];
      if (to == null) return;
      e.preventDefault();
      tabs[to].focus();
      select(tabs[to]);
    };
  });
  function select(tab) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      const panel = $(t.getAttribute("aria-controls"));
      if (panel && tabIds.length > 0 && t.getAttribute("aria-controls") !== "rank-table") panel.hidden = !on;
    });
    onSelect?.(tab.id);
  }
  tabs.forEach((t, i) => (t.tabIndex = i === 0 ? 0 : -1));
}

// ---------- Vista: video / luces ----------
let page = "home"; // dentro de Explorar: "home" (inicio), "likes" (Me gusta) o "videos" (Mis videos)
function setView(v) {
  view = v;
  const exploring = v === "explore";
  $("lights-view").hidden = v !== "lights";
  stick3d?.setActive(v === "lights" && settings.lightsModel === "stick");
  // En Explorar el video sigue sonando en un mini reproductor; sin canción, Video y Explorar muestran el inicio.
  // En Luces también, si hay canción: YouTube no permite que suene un video oculto (sin canción, .app.home lo deja invisible).
  $("video-view").hidden = v === "lights" && current < 0;
  const showHome = exploring || (v === "video" && current < 0);
  $("home").hidden = !showHome || page !== "home";
  $("likes-page").hidden = !showHome || page !== "likes";
  $("videos-page").hidden = !showHome || page !== "videos";
  syncPageItems();
  app.classList.toggle("exploring", exploring && current >= 0);
  app.classList.toggle("mini-mode", (exploring || v === "lights") && current >= 0); // video en el mini reproductor
  app.dataset.view = v;
  if (!exploring) app.classList.remove("mini-off");
  syncMiniButton();
  syncVideoTab();
  syncRoute();
  placeMini(false); // ya, sin esperar al cuadro siguiente: el mini nunca aparece donde tape algo
  requestAnimationFrame(() => placeMini(false));
}
/** Botón del pie de página junto a pantalla completa: Minimizar (en Video) o Expandir (con el video en la ventanita). */
/** Video sin canción no tiene nada que mostrar: la pestaña (y su opción del menú del teléfono) queda deshabilitada. */
function syncVideoTab() {
  const off = current < 0;
  for (const el of [$("view-video"), document.querySelector('[data-proxy="view-video"]')]) {
    if (!el) continue;
    el.toggleAttribute("aria-disabled", off);
    if (off) { el.setAttribute("aria-disabled", "true"); el.dataset.tip = "Elige una canción primero"; } else delete el.dataset.tip;
  }
}
function syncMiniButton() {
  const b = $("btn-mini");
  if (!b) return;
  const canMin = view === "video" && current >= 0, canGrow = view === "explore" && current >= 0;
  b.hidden = !(canMin || canGrow);
  const label = canMin ? "Minimizar video" : "Expandir video";
  b.setAttribute("aria-label", label);
  b.dataset.tip = label;
  b.querySelector("span").textContent = canMin ? "Minimizar" : "Expandir";
  b.querySelector("use").setAttribute("href", canMin ? "#i-pip" : "#i-pip-out");
}
/** Cambio de vista (la transición entre video grande y mini es CSS). */
function switchView(v) { setView(v); }

// ---------- Bluetooth ----------
function renderSticks() {
  $("stick-list").replaceChildren(
    ...sticks.map((s, i) => {
      const li = document.createElement("li");
      li.className = "stick-item";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.dataset.index = i;
      const info = document.createElement("span");
      const strong = document.createElement("strong");
      strong.textContent = s.name;
      const small = document.createElement("small");
      small.textContent = s.version;
      info.append(strong, small);
      const btn = document.createElement("button");
      btn.className = "btn small";
      btn.type = "button";
      btn.textContent = "Desconectar";
      btn.setAttribute("aria-label", `Desconectar ${s.name}`);
      btn.onclick = () => s.disconnect();
      li.classList.toggle("low", s.lowBattery);
      li.append(dot, info, btn, stickDetails(s));
      return li;
    }),
  );
  const n = sticks.length;
  // "Conectar" + " ARMY Bomb" (la segunda parte se oculta en pantallas medianas para que la cabecera quepa).
  const ext = document.createElement("span");
  ext.className = "cta-ext";
  ext.textContent = " ARMY Bomb";
  if (n) $("conn-label").textContent = `${n} conectado${n > 1 ? "s" : ""} 💜`;
  else $("conn-label").replaceChildren("Conectar", ext);
  $("btn-bt").classList.toggle("on", n > 0);
  syncOnboard(); // al conectar, la bienvenida ya no hace falta
  $("dock-bt-label").textContent = n ? "Conectado" : "Conectar";
  $("dock-bt").classList.toggle("on", n > 0);
  // El nombre accesible empieza con el texto visible (WCAG 2.5.3).
  if (n) $("btn-bt").setAttribute("aria-label", `${n} conectado${n > 1 ? "s" : ""}. Administrar ARMY Bomb`);
  else $("btn-bt").removeAttribute("aria-label");
}

/** Ficha del dispositivo: solo datos reales; lo que no se puede leer se dice tal cual. */
function stickDetails(s) {
  const wrap = document.createElement("div");
  wrap.className = "stick-info";
  if (s.lowBattery) {
    const low = document.createElement("p");
    low.className = "stick-low";
    low.setAttribute("role", "alert");
    low.textContent = "¡Ups! Tu ARMY Bomb tiene poca batería. Cambia las baterías.";
    wrap.append(low);
  }
  const dl = document.createElement("dl");
  const row = (label, value, { na = false } = {}) => {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    if (value instanceof Node) dd.append(value);
    else dd.textContent = value;
    dd.classList.toggle("na", na);
    dl.append(dt, dd);
  };
  row("Nombre", s.name);
  row("Versión", s.version);
  const mac = s.info?.mac;
  if (mac) row("Dirección MAC", mac);
  else row("Dirección MAC", s.info?.macReason === "device" ? "No disponible: este ARMY Bomb no la envió" : "No disponible: el navegador no permite leerla", { na: true });
  if (s.battery != null) {
    const box = document.createElement("span");
    box.className = "batt";
    const m = document.createElement("meter");
    m.min = 0; m.max = 100; m.low = LOW_BATTERY + 1; m.high = 40; m.optimum = 100; m.value = s.battery;
    m.setAttribute("aria-hidden", "true"); // el porcentaje en texto ya lo dice
    const pct = document.createElement("span");
    pct.textContent = `${s.battery} %`;
    box.append(m, pct);
    row("Batería", box);
  } else row("Batería", "No disponible: este ARMY Bomb no informa su nivel", { na: true });
  if (s.info?.firmware) row("Firmware", s.info.firmware);
  wrap.append(dl);
  return wrap;
}
const warnedLow = new Set();
/** Avisa una sola vez por ARMY Bomb cuando la batería baja al 10 % o menos. */
function checkBattery(s) {
  if (!s.lowBattery || warnedLow.has(s.id)) return;
  warnedLow.add(s.id);
  toast("¡Ups! Tu ARMY Bomb tiene poca batería. Cambia las baterías.", 8000, { assertive: true });
  earcon("error");
  buzz([80, 60, 80]);
}

/** Me gusta: alterna, anima el corazón y avisa (tarjetas, pie de página y panel Ahora suena). */
function toggleLike(song, btn) {
  const on = favorites.toggle(song.id);
  if (btn) { btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop"); }
  toast(on ? `💜 ${song.title} guardada en Me gusta` : `${song.title} ya no está en Me gusta`, 2000);
}

/** ♡ del pie de página: estado y nombre accesible de la canción que suena. */
function syncDockLike() {
  const song = queue[current]?.song;
  for (const b of [$("dock-like"), $("dock-like-m")]) { // junto al título (PC) y en la fila de botones (teléfono)
    b.hidden = !song;
    if (!song) continue;
    const on = favorites.has(song.id);
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute("aria-label", `${on ? "Quitar" : "Agregar"} ${song.title} ${on ? "de" : "a"} Me gusta`);
  }
}

// ---------- Bienvenida de conexión ----------
const ONBOARD_KEY = "pws.onboard.v1"; // "closed": la persona cerró el aviso (no se vuelve a mostrar)
/** Visible mientras no haya un ARMY Bomb conectado y la persona no haya cerrado el aviso. */
function syncOnboard() {
  const el = $("onboard");
  if (!el) return;
  el.hidden = sticks.length > 0 || Boolean(store.get(ONBOARD_KEY, ""));
}
function showBtWarning(reason) {
  const w = $("bt-warning");
  w.hidden = false;
  if (reason === "ios") {
    w.innerHTML = `En iPhone y iPad, Safari no permite conectar por Bluetooth. Abre esta página en <a href="${BLUEFY_URL}" target="_blank" rel="noopener noreferrer">Bluefy</a> (gratis) para conectar tu ARMY Bomb. Mientras, puedes ver los videos y usar tu pantalla como lightstick.`;
  } else if (reason === "brave" || reason === "brave-hint") {
    // Brave apaga Web Bluetooth por privacidad. Los enlaces brave:// no se abren desde una página: se copian.
    const flag = "brave://flags/#brave-web-bluetooth-api";
    const p1 = document.createElement("p");
    p1.textContent = reason === "brave"
      ? "Brave tiene el Bluetooth web desactivado, por eso no se abre la lista de dispositivos."
      : "¿Usas Brave? Trae el Bluetooth web desactivado: si al tocar Conectar no pasa nada, actívalo así:";
    const ol = document.createElement("ol");
    ol.className = "brave-steps";
    for (const step of ["Copia esta dirección y pégala en la barra de Brave:", "En «Web Bluetooth API», elige Enabled.", "Toca Relaunch (Brave se reinicia) y vuelve a esta página."]) {
      const li = document.createElement("li");
      li.textContent = step;
      ol.append(li);
    }
    // La dirección va DENTRO del paso 1, justo después de «Copia esta dirección…» (antes quedaba al final de la
    // lista y en pantallas angostas no se veía). Si el portapapeles está bloqueado, el campo queda seleccionado.
    const box = document.createElement("div");
    box.className = "copy-field";
    const field = document.createElement("input");
    field.type = "text";
    field.readOnly = true;
    field.value = flag;
    field.spellcheck = false;
    field.setAttribute("aria-label", "Dirección para activar el Bluetooth en Brave");
    field.onfocus = () => field.select();
    field.onclick = () => field.select();
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "btn small primary";
    copy.textContent = "Copiar";
    copy.onclick = async () => {
      try { await navigator.clipboard.writeText(flag); copy.textContent = "Copiada ✓"; }
      catch { field.focus(); field.select(); try { document.execCommand("copy"); copy.textContent = "Copiada ✓"; } catch { copy.textContent = "Selecciónala y cópiala"; } }
    };
    box.append(field, copy);
    ol.firstElementChild.append(box);
    const p2 = document.createElement("p");
    p2.className = "hint small";
    p2.textContent = "También puedes usar Chrome o Edge, que lo traen activado.";
    w.replaceChildren(p1, ol, p2);
    if (reason === "brave-hint") return; // solo informativo: no desactiva Conectar
  } else if (reason === "no-chooser" || reason === "flaky-hint") {
    // Samsung Internet (y otros de fabricantes) traen Bluetooth web a medias: a veces la lista no se abre nunca.
    const b = browserInfo();
    const p1 = document.createElement("p");
    p1.textContent = reason === "no-chooser"
      ? `${b.name} no abrió la lista de dispositivos Bluetooth. Ábrela en Chrome para conectar tu ARMY Bomb.`
      : `En ${b.name} la conexión Bluetooth puede no funcionar. Si al tocar Conectar no pasa nada, ábrela en Chrome.`;
    const row = document.createElement("div");
    row.className = "row wrap";
    if (b.android) {
      const a = document.createElement("a");
      a.className = "btn small primary";
      a.href = chromeIntent(location.href.replace(/#.*$/, ""));
      a.textContent = "Abrir en Chrome";
      row.append(a);
    }
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "btn small";
    copy.textContent = "Copiar enlace";
    copy.onclick = async () => { try { await navigator.clipboard.writeText(location.href); copy.textContent = "Enlace copiado ✓"; } catch { copy.textContent = location.href; } };
    row.append(copy);
    w.replaceChildren(p1, row);
    if (reason === "flaky-hint") return; // solo aviso: Conectar sigue activo
  } else if (reason === "disabled") {
    w.textContent = "Este navegador tiene el Bluetooth web desactivado. Ábrela en Chrome o Edge, o actívalo en la configuración del navegador.";
  } else if (reason === "inapp") {
    w.textContent = "Estás en el navegador de una app (TikTok, Instagram…): aquí no hay Bluetooth. Usa «Abrir en Chrome» o copia el enlace y ábrelo en tu navegador (en iPhone, en Bluefy).";
  } else if (reason === "insecure") {
    w.textContent = "Para usar Bluetooth, abre la app desde su dirección segura (empieza con https://).";
  } else {
    w.textContent = "Este navegador no puede conectar por Bluetooth. Abre la página en Chrome o Edge (Android, Windows, Mac o Chromebook).";
  }
  $("btn-connect").disabled = true;
}

let lastBtError = null; // { kind, detail, at } del último intento fallido
async function onConnect() {
  lastBtError = null;
  const btn = $("btn-connect");
  btn.disabled = true;
  btn.textContent = "Conectando…";
  $("panel-bt").setAttribute("aria-busy", "true");
  say("Se abrirá la lista de dispositivos del navegador: elige el que empieza con BTS LIGHTSTICK o BBOMB.", { delay: 0 });
  earcon("searching");
  try {
    const stick = await requestStick({ showAll: $("chk-all").checked });
    if (sticks.some((s) => s.id === stick.id)) return toast("Ese ARMY Bomb ya está conectado.");
    stick.device.addEventListener("gattserverdisconnected", () => {
      const i = sticks.indexOf(stick);
      if (i >= 0) sticks.splice(i, 1);
      renderSticks();
      // Inesperado y sin pistas visuales para quien no ve: aviso urgente, sonido y vibración.
      toast(`${stick.name} se desconectó.`, 6000, { assertive: true });
      earcon("disconnected");
      buzz([60, 40, 60]);
    });
    sticks.push(stick);
    if (stick3d && !settings.stickVer) { stick3d.setVersion(stickVersion()); syncVersionButtons(); } // el 3D muestra la versión conectada
    stick.onBattery = () => { renderSticks(); checkBattery(stick); };
    track("conectar_army_bomb", { familia: stick.family ?? "" });
    renderSticks();
    setTimeout(() => checkBattery(stick), 2500); // después del aviso de "conectado"
    stick.setColor(hexToRgb(PURPLE));
    toast(`¡${stick.name} conectado! Borahae 💜`);
    earcon("connected");
    buzz(40);
  } catch (e) {
    // Antes, cualquier "NotFoundError" se tomaba como "cerró la lista" y no se veía nada (pasaba en Brave).
    const kind = classifyBtError(e);
    // El motivo real queda a la vista (guía y diagnóstico) y en la consola: así se puede saber qué pasó.
    lastBtError = { kind, detail: `${e?.name ?? "Error"}: ${String(e?.message ?? e).slice(0, 160)}`, at: Date.now() };
    console.warn("[LumiParty] Bluetooth:", lastBtError.detail);
    if (kind === "cancelled") say("Lista cerrada sin elegir un dispositivo.");
    else if (kind === "disabled") { showBtWarning(isBrave() ? "brave" : "disabled"); showPanel("panel-bt"); earcon("error"); }
    else if (kind === "no-chooser") { showBtWarning("no-chooser"); if (openPanel !== "panel-bt") showPanel("panel-bt"); earcon("error"); }
    else if (kind === "adapter-off") { toast("El Bluetooth de tu dispositivo está apagado. Actívalo y vuelve a tocar Conectar.", 7000, { assertive: true }); earcon("error"); }
    else if (kind === "denied") { toast("El navegador no dio permiso para usar Bluetooth. Revisa los permisos del sitio y prueba otra vez.", 7000, { assertive: true }); earcon("error"); }
    else if (kind === "gatt") { toast("Tu ARMY Bomb no aceptó la conexión. Desconéctalo de otro celular o de la app oficial, ponlo en modo Bluetooth y prueba otra vez. Si sigue igual, apaga y enciende el Bluetooth del equipo y recarga la página.", 9000, { assertive: true }); earcon("error"); }
    else if (kind === "not-stick") { toast("Ese dispositivo no es un ARMY Bomb compatible. Elige el que empieza con BTS LIGHTSTICK o BBOMB.", 8000); earcon("error"); }
    else { toast("No pudimos conectar. Revisa que parpadee y prueba otra vez."); earcon("error"); }
  } finally {
    $("panel-bt").removeAttribute("aria-busy");
    btn.disabled = false;
    btn.textContent = sticks.length ? "Conectar otro" : "Conectar ARMY Bomb";
  }
}

// ---------- Lista de canciones ----------
function songButton(item, index) {
  const { album, song } = item;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "song";
  b.dataset.index = index;
  const th = document.createElement("span");
  th.className = "thumb";
  bgThumb(th, song.yt);
  b.dataset.song = song.id;
  const text = document.createElement("span");
  text.className = "s-text";
  const t = document.createElement("span");
  t.className = "s-title";
  t.textContent = song.title;
  text.append(t, metaLine(item));
  b.append(th, text, lightGlyph(item));
  b.setAttribute("aria-label", songLabel(item));
  b.onclick = () => { playIndex(index, contextFromRow(b, index)); if (matchMedia("(max-width: 640px)").matches) closePanel(false); };
  // Fila: canción + botón "Me gusta"
  const row = document.createElement("div");
  row.className = "song-row";
  row.dataset.index = index;
  const like = document.createElement("button");
  like.type = "button";
  like.className = "like-btn";
  like.dataset.song = song.id;
  const sync = () => {
    const on = favorites.has(song.id);
    like.setAttribute("aria-pressed", on);
    like.setAttribute("aria-label", on ? `Quitar ${song.title} de Me gusta` : `Agregar ${song.title} a Me gusta`);
  };
  sync();
  like.onclick = (e) => {
    e.stopPropagation();
    const on = favorites.toggle(song.id);
    like.classList.remove("pop"); void like.offsetWidth; like.classList.add("pop");
    toast(on ? `💜 ${song.title} guardada en Me gusta` : `${song.title} ya no está en Me gusta`, 2000);
  };
  row.append(b, like, moreButton(index, song.title));
  return row;
}

function renderAlbums() {
  renderFilters();
  $("explore-list").replaceChildren(...albumNodes(true));
  renderMine();
  markCurrent();
  applySearch();
}

/** Encabezados de álbum + botones con miniatura, para el panel y la lista lateral. */
function albumNodes(includeMine) {
  const groups = new Map();
  queue.forEach((item, i) => {
    if (item.album.id === "mine" && !includeMine) return;
    if (!groups.has(item.album.id)) groups.set(item.album.id, { album: item.album, items: [] });
    groups.get(item.album.id).items.push([item, i]);
  });
  const nodes = [];
  for (const { album, items } of groups.values()) {
    const h = document.createElement("h3");
    h.className = "album-title";
    h.dataset.album = album.id;
    album.palette.slice(0, 3).forEach((c, k) => h.style.setProperty(`--p${k + 1}`, c));
    const sw = document.createElement("span");
    sw.className = "swatches";
    sw.setAttribute("aria-hidden", "true");
    album.palette.slice(0, 3).forEach((c) => { const i = document.createElement("i"); i.style.background = c; sw.append(i); });
    h.append(sw, document.createTextNode(album.year ? `${album.title} · ${album.year}` : album.title));
    if (album.id !== "mine") h.append(albumLikeButton(album));
    nodes.push(h, ...items.map(([item, i]) => songButton(item, i)));
  }
  return nodes;
}

// ---------- Filtros: Todo / Me gusta / grupo / integrantes ----------
const ARTIST_ORDER = ["BTS", "RM", "Jin", "SUGA", "j-hope", "Jimin", "V", "Jung Kook"];
// Acentos propios para los chips de integrante (colores de la app, no oficiales; legibles sobre fondo oscuro).
const MEMBER_COLORS = { BTS: "#b58cff", RM: "#7cc4ff", Jin: "#ff9ecb", SUGA: "#a9c1dc", "j-hope": "#ffcf5c", Jimin: "#ffb3d9", V: "#5fe0b0", "Jung Kook": "#ff9a76" };
let listFilter = "all";
let exploreType = "songs"; // Explorar: "songs" (canciones) o "albums" (álbumes)
const artistOf = (item) => item.album.artist ?? (item.album.id === "mine" ? "mine" : "BTS");

/** Teléfono: el botón «Filtros» despliega los chips y muestra cuál está activo. */
function syncFiltersToggle() {
  const b = $("filters-toggle");
  if (!b) return;
  const on = listFilter !== "all";
  const name = listFilter.startsWith("album:") ? queue.find((q) => q.album.id === listFilter.slice(6))?.album.title : FILTER_NAMES[listFilter] ?? listFilter;
  $("filters-label").textContent = on ? `Filtros · ${name}` : "Filtros";
  b.classList.toggle("active", on);
}
function bindFiltersToggle() {
  const b = $("filters-toggle"), box = b.closest(".explore-tools");
  b.onclick = () => {
    const open = !box.classList.contains("open");
    box.classList.toggle("open", open);
    b.setAttribute("aria-expanded", String(open));
    if (open) $("explore-filters").querySelector("[aria-pressed='true'], button")?.focus({ preventScroll: true });
  };
  // Al elegir un filtro en el teléfono, se pliega solo (la lista queda a la vista).
  $("explore-filters").addEventListener("click", (e) => {
    if (!e.target.closest("button") || !matchMedia("(max-width: 640px)").matches) return;
    requestAnimationFrame(() => { box.classList.remove("open"); b.setAttribute("aria-expanded", "false"); syncFiltersToggle(); });
  });
}
function renderFilters() {
  queueMicrotask(syncFiltersToggle);
  const counts = new Map();
  queue.forEach((q) => counts.set(artistOf(q), (counts.get(artistOf(q)) ?? 0) + 1));
  const chips = [["all", "Todo", queue.length], ["likes", "♥ Me gusta", favorites.count()]];
  if (listFilter.startsWith("album:")) {
    const al = queue.find((q) => q.album.id === listFilter.slice(6))?.album;
    if (al) chips.unshift([listFilter, `✕ ${al.title}`, queue.filter((q) => q.album.id === al.id).length]);
  }
  for (const a of ARTIST_ORDER) if (counts.get(a)) chips.push([a, a, counts.get(a)]);
  if (counts.get("mine")) chips.push(["mine", "Mis videos", counts.get("mine")]);
  document.querySelectorAll("[data-filters]").forEach((box) => {
    box.replaceChildren(...chips.map(([id, label, n]) => {
      const c = document.createElement("button");
      c.type = "button";
      c.className = "filter-chip";
      if (MEMBER_COLORS[id]) { c.style.setProperty("--chip", MEMBER_COLORS[id]); c.classList.add("member"); }
      c.setAttribute("aria-pressed", listFilter === id);
      c.textContent = label;
      const sp = document.createElement("span");
      sp.className = "n";
      sp.textContent = n;
      c.append(sp);
      c.onclick = () => { listFilter = id; renderFilters(); applySearch(); };
      return c;
    }));
  });
  syncClearChip();
}

function passesFilter(item) {
  if (listFilter === "all") return true;
  if (listFilter.startsWith("album:")) return item.album.id === listFilter.slice(6);
  if (listFilter === "likes") return favorites.has(item.song.id);
  return artistOf(item) === listFilter;
}

// ---------- Buscador de canciones ----------
const norm = (t) => String(t ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
let searchQuery = "";

/** Filtra las listas (panel y costado) por título, álbum, año o tipo. */
function applySearch() {
  const terms = norm(searchQuery).split(" ").filter(Boolean);
  const albumsMode = exploreType === "albums";
  const searching = terms.length > 0 || listFilter !== "all" || exploreAll || albumsMode;
  $("explore-list").hidden = albumsMode;
  $("explore-albums").hidden = !albumsMode;
  if (albumsMode) renderExploreAlbums(terms);
  $("explore-results").hidden = !searching;
  $("home").classList.toggle("searching", searching);
  if (albumsMode) $("er-title").textContent = listFilter === "likes" ? "Álbumes que me gustan" : listFilter === "all" ? "Todos los álbumes" : `Álbumes · ${FILTER_NAMES[listFilter] ?? listFilter}`;
  else $("er-title").textContent = listFilter.startsWith("album:") ? queue.find((q) => q.album.id === listFilter.slice(6))?.album.title ?? "Resultados" : terms.length ? "Resultados" : listFilter === "all" ? "Todos los álbumes" : FILTER_NAMES[listFilter] ?? listFilter;
  for (const list of [$("explore-list")]) {
    let visibleInGroup = 0, header = null, total = 0;
    const flush = () => { if (header) header.hidden = visibleInGroup === 0; };
    for (const el of list.children) {
      if (el.classList.contains("album-title")) { flush(); header = el; visibleInGroup = 0; continue; }
      const item = queue[Number(el.dataset.index)];
      if (!item) continue;
      const hay = norm(`${artistOf(item)} ${item.song.title} ${item.album.title} ${item.album.year} ${item.song.kind === "concert" ? "concierto en vivo live" : ""} ${item.song.channel ?? ""}`);
      const match = passesFilter(item) && terms.every((t) => hay.includes(t));
      el.hidden = !match;
      if (match) { visibleInGroup++; total++; }
    }
    flush();
    const empty = list.parentElement.querySelector(".search-empty");
    if (!empty) continue;
    if (listFilter === "likes" && !total && !terms.length) {
      empty.hidden = false;
      empty.textContent = "Aún no guardas canciones. Toca ♡ en una.";
    } else if (terms.length && !total) {
      empty.hidden = false;
      empty.replaceChildren(document.createTextNode(`No encontramos "${searchQuery}". `));
      const a = document.createElement("a");
      a.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(`BTS ${searchQuery} official`)}`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "Búscala en YouTube";
      empty.append(a);
    } else empty.hidden = true;
  }
  syncClearChip();
}

function bindSearch() {
  const inputs = [$("search-explore")];
  inputs.forEach((inp) => {
    inp.addEventListener("input", () => {
      searchQuery = inp.value;
      inputs.forEach((o) => o !== inp && (o.value = inp.value));
      applySearch();
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const first = inp.closest(".side, .panel-body, .home-view")?.querySelector(".song-row:not([hidden]) .song");
        first?.click();
      }
      if (e.key === "Escape" && inp.value) { e.stopPropagation(); inp.value = ""; searchQuery = ""; inputs.forEach((o) => (o.value = "")); applySearch(); }
    });
  });
  // Atajo "/" para buscar, como en muchas apps.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.target.closest("input, textarea, select")) return;
    e.preventDefault();
    // "/" abre Explorar (pantalla completa) y pone el foco en el buscador.
    if (view !== "explore") $("view-explore").click();
    $("search-explore").focus();
  });
}

// ---------- Menú y lista lateral ----------
const SIDE_KEY = "pws.side.v1";
const wide = () => matchMedia("(min-width: 1100px)").matches;
// Entre 641 y 1099 px la biblioteca es un cajón sobre el contenido (en teléfono se usa el menú desplegable).
const drawerMode = () => matchMedia("(min-width: 641px) and (max-width: 1099px)").matches;
function setSide(open) {
  if (!wide()) {
    const show = open && drawerMode();
    $("side").hidden = !show;
    app.classList.remove("with-side");
    app.classList.toggle("side-drawer", show);
    setModal($("side"), show);
    $("btn-side").setAttribute("aria-expanded", String(show));
    if (show) requestAnimationFrame(() => $("side").querySelector(".lib-item")?.focus());
    return;
  }
  // Escritorio: la biblioteca siempre está (compacta o expandida); el botón Biblioteca la expande o la compacta.
  app.classList.remove("side-drawer");
  $("side").hidden = false;
  app.classList.add("with-side");
  syncSideButton();
}
/** El botón Biblioteca de la cabecera dice lo mismo que hace: en escritorio, expandir o contraer. */
function syncSideButton() {
  const b = $("btn-side");
  if (!wide()) { b.dataset.tip = "Biblioteca"; b.setAttribute("aria-label", "Biblioteca"); return; }
  const expanded = !app.classList.contains("rail");
  b.setAttribute("aria-expanded", String(expanded));
  b.setAttribute("aria-label", expanded ? "Contraer biblioteca" : "Expandir biblioteca");
  b.dataset.tip = expanded ? "Contraer biblioteca" : "Expandir biblioteca";
  b.classList.toggle("on", expanded);
}
function bindMenu() {
  // Escritorio: igual que el botón de adentro (expandir / contraer y queda así). Tablet: abre o cierra el cajón.
  $("btn-side").onclick = () => {
    if (wide()) { const on = !app.classList.contains("rail"); store.set(RAIL_KEY, on); applyRail(on); $("side").classList.remove("peek"); return; }
    setSide($("side").hidden);
  };
  $("side-close").onclick = () => { setSide(false); $("btn-side").focus(); };
  // El cajón se cierra al tocar fuera o al elegir algo dentro.
  document.addEventListener("pointerdown", (e) => {
    if (app.classList.contains("side-drawer") && !e.target.closest("#side, #btn-side, .panel, #song-menu")) setSide(false);
  });
  $("side").addEventListener("click", (e) => {
    if (app.classList.contains("side-drawer") && e.target.closest(".lib-item, .lib-row, .support-pill")) setTimeout(() => setSide(false), 0);
  });
  $("btn-feedback").onclick = (e) => showPanel("panel-feedback", e.currentTarget);
  setSide(wide() && store.get(SIDE_KEY, true));
  matchMedia("(min-width: 1100px)").addEventListener("change", () => { applyRail(railPreferred()); setSide(wide() && store.get(SIDE_KEY, true)); });
  matchMedia("(max-width: 640px)").addEventListener("change", () => { if (!wide()) setSide(false); });
}

// ---------- Opiniones ----------
function bindFeedback() {
  const form = $("form-feedback");
  const comment = $("fb-comment");
  $("fb-community").href = `${PROJECT.repo}/issues?q=label%3Aopinion`;
  comment.oninput = () => ($("fb-count").textContent = `${comment.value.length}/1000`);
  // Paso a paso: con la calificación aparecen las preguntas que tocan (qué falló / qué mejorar / qué gustó).
  const MOOD = { 1: "Lo sentimos. Cuéntanos qué pasó", 2: "Queremos mejorarlo", 3: "Gracias. ¿Qué le falta?", 4: "¡Qué bueno!", 5: "¡Nos encanta! 💜" };
  const HINT = { low: "Cuéntanos qué pasó para arreglarlo", mid: "¿Qué le falta?", high: "¿Algo más que quieras contarnos?" };
  const tierOf = (r) => (r <= 2 ? "low" : r === 3 ? "mid" : "high");
  const syncSteps = () => {
    const r = Number(form.elements.rating.value) || 0;
    $("fb-more").hidden = !r;
    $("fb-mood").textContent = t(r ? MOOD[r] : "Toca una estrella");
    const tier = r ? tierOf(r) : "";
    for (const f of form.querySelectorAll(".fb-tags")) {
      const on = f.dataset.tier === tier;
      f.hidden = !on;
      for (const i of f.querySelectorAll("input")) { i.disabled = !on; if (!on) i.checked = false; } // solo cuentan las del grupo visible
    }
    if (tier) comment.placeholder = t(HINT[tier]);
  };
  for (const i of form.querySelectorAll("input[name=rating]")) i.addEventListener("change", syncSteps);
  syncSteps();
  // Desde el aviso: la estrella elegida ya viene marcada y aparecen sus preguntas.
  bindFeedbackNudge((r, trigger) => {
    const radio = $(`fb-r${r}`);
    if (radio) radio.checked = true;
    syncSteps();
    showPanel("panel-feedback", trigger);
  });
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = { ...Object.fromEntries(fd), tags: fd.getAll("tags") };
    const entry = buildFeedback(data, { includeDevice: Boolean(data.device), songId: queue[current]?.song.id ?? null });
    const status = $("fb-status");
    if (!entry) {
      status.textContent = "Elige una calificación o escribe un comentario.";
      return;
    }
    const btn = form.querySelector("[type=submit]");
    btn.disabled = true;
    const r = await sendFeedback(entry);
    btn.disabled = false;
    status.textContent = r.message;
    if (r.ok) {
      store.set(FB_ASK_KEY, { ...store.get(FB_ASK_KEY, {}), sent: Date.now() });
      form.reset();
      $("fb-count").textContent = "0/1000";
      syncSteps();
      status.textContent = "";
      // Agradecimiento en lugar del formulario; si llegó al servidor, el panel se cierra solo en unos segundos.
      if (r.via !== "github") {
        form.hidden = true;
        $("fb-thanks").hidden = false;
        $("fb-thanks").focus({ preventScroll: true });
        clearTimeout(thanksTimer);
        thanksTimer = setTimeout(() => { if (openPanel === "panel-feedback" && !$("fb-thanks").hidden) closePanel(); }, 4500);
      } else status.textContent = r.message;
    }
  };
  // "Enviar otra" vuelve a las estrellas; al cerrar el panel, la próxima vez abre el formulario limpio.
  let thanksTimer = 0;
  const showForm = () => { clearTimeout(thanksTimer); $("fb-thanks").hidden = true; form.hidden = false; };
  $("fbt-again").onclick = () => { showForm(); form.querySelector("input[name=rating]")?.focus(); };
  $("fbt-close").onclick = () => { closePanel(); setTimeout(showForm, 400); };
  $("panel-feedback").addEventListener("transitionend", () => { if ($("panel-feedback").hidden) showForm(); });
}

function renderMine() {
  const list = $("mine");
  const items = queue.map((q, i) => [q, i]).filter(([q]) => q.album.id === "mine");
  $("lib-n-mine").textContent = String(items.length);
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "hint";
    li.textContent = "Aún no agregas videos.";
    list.replaceChildren(li);
    return;
  }
  list.replaceChildren(
    ...items.map(([item, i]) => {
      const li = document.createElement("li");
      li.className = "row";
      const b = songButton(item, i);
      const del = document.createElement("button");
      del.type = "button";
      del.className = "ibtn sm";
      del.setAttribute("aria-label", `Quitar ${item.song.title}`);
      del.innerHTML = `<svg aria-hidden="true"><use href="#i-close"/></svg>`;
      del.onclick = () => {
        mine = mine.filter((m) => m.id !== item.song.id);
        store.set(MINE_KEY, mine);
        const playingId = queue[current]?.song.id;
        buildQueue();
        current = queue.findIndex((q) => q.song.id === playingId);
        renderAlbums();
      };
      li.append(b, del);
      return li;
    }),
  );
}

function renderFilms() {
  $("films").replaceChildren(
    ...CONCERT_FILMS.map((f) => {
      const li = document.createElement("li");
      li.className = "film";
      const info = document.createElement("span");
      const s = document.createElement("strong");
      s.textContent = f.title;
      const sm = document.createElement("small");
      sm.textContent = f.platform;
      info.append(s, sm);
      const a = document.createElement("a");
      a.className = "btn small";
      a.href = f.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "Abrir";
      a.setAttribute("aria-label", `Abrir ${f.title} en ${f.platform}`);
      li.append(info, a);
      return li;
    }),
  );
}

async function onAddVideo(e) {
  e.preventDefault();
  const id = parseYouTubeId($("inp-url").value);
  if (!id) return toast("Ese enlace no parece de YouTube.");
  await addVideoById(id, new FormData(e.target).get("kind"));
  e.target.reset();
}
/** Agrega un video a «Mis videos» (o lo actualiza) y lo reproduce con su patrón de luces generado. */
async function addVideoById(id, kind = "song") {
  track("agregar_video", { tipo: kind });
  const meta = await fetchTitle(id);
  const song = { id: `mine-${id}`, title: meta?.title ?? "Mi video", yt: id, bpm: 110, energy: "high", kind, channel: meta?.channel };
  mine = [...mine.filter((m) => m.id !== song.id), song];
  store.set(MINE_KEY, mine);
  const playingId = queue[current]?.song.id;
  buildQueue();
  current = queue.findIndex((q) => q.song.id === playingId);
  renderAlbums();
  // Aviso que no bloquea: el canal (author_name de oEmbed) no está entre los oficiales que conocemos.
  if (meta?.channel && !isOfficialChannel(meta.channel)) toast("Este video no es de un canal oficial que conozcamos. Si es una copia de un concierto de pago, no lo agregues.", 9000);
  else toast(`Video agregado: ${song.title}`);
  playIndex(queue.findIndex((q) => q.song.id === song.id));
}
/**
 * Compartir desde YouTube a la app instalada (Web Share Target): YouTube manda el enlace dentro del texto. Si la
 * canción ya está (catálogo o Mis videos) se reproduce; si no, se agrega a «Mis videos» con su patrón generado.
 */
async function handleShared(params) {
  const raw = ["url", "text", "title"].map((k) => params.get(k) ?? "").join(" ");
  if (!raw.trim()) return false;
  const links = raw.match(/https?:\/\/\S+/g) ?? [];
  const id = [...links, raw.trim()].map((x) => parseYouTubeId(x.replace(/[)\].,;]+$/, ""))).find(Boolean);
  try { history.replaceState(null, "", location.pathname); } catch {} // recargar no lo vuelve a agregar
  if (!id) { toast("Lo que compartiste no es un video de YouTube."); return true; }
  const idx = queue.findIndex((q) => q.song.yt === id || q.song.lyricVideo === id);
  if (idx >= 0) {
    toast(`💜 ${queue[idx].song.title}`, 2500);
    playIndex(idx);
    return true;
  }
  const title = params.get("title") ?? "";
  const kind = /concert|concierto|full show|en vivo|world tour|live in|콘서트/i.test(`${title} ${raw}`) ? "concert" : "song";
  await addVideoById(id, kind);
  return true;
}

function markCurrent() {
  syncMiniButton();
  const heard = new Set(playedHistory);
  document.querySelectorAll(".song, .sg-play").forEach((b) => {
    const item = queue[Number(b.dataset.index)];
    if (!item) return;
    const was = heard.has(item.song.id);
    if (b.classList.contains("was-played") !== was) {
      b.classList.toggle("was-played", was);
      b.setAttribute("aria-label", b.classList.contains("sg-play") ? `Reproducir ${songLabel(item)}` : songLabel(item));
    }
  });
  document.querySelectorAll(".song, .sg-play").forEach((b) => {
    const on = Number(b.dataset.index) === current;
    b.classList.toggle("playing", on);
    if (on) b.setAttribute("aria-current", "true");
    else b.removeAttribute("aria-current");
  });
}

// ---------- Reproducción ----------
/** Carga una canción (sin tocar la cola). */
function loadIndex(i, { autoplay = true } = {}) {
  if (i < 0 || i >= queue.length) return;
  current = i;
  const { album, song } = queue[i];
  if (autoplay) say(`${t("Ahora suena")}: ${song.title}, ${album.id === "mine" ? song.channel ?? t("Mis videos") : album.title}`);
  setNowTitle(song.title);
  applySongTheme(album.palette);
  app.classList.remove("home");
  played.add(song.id);
  rememberPlayed(song.id);
  upnextDismissed = false;
  $("now-album").textContent = album.id === "mine" ? song.channel ?? "Mis videos" : `${album.title} · ${album.year}`;
  $("num-bpm").value = settings.bpm[song.id] ?? song.bpm;
  const art = $("np-art");
  album.palette.forEach((c, k) => art.style.setProperty(`--a${k + 1}`, c));
  $("empty").hidden = true;
  replayClass(app, "song-change"); // solo presentación: transición de cambio de canción
  pattern = null;
  patternDuration = 0;
  // Colores del propio MV (portada y cuadros al 25/50/75 %): cuando llegan, el patrón se rehace con ellos.
  // Si el MV ya se analizó cuadro a cuadro (npm run analyze:video), sus colores e intensidad por sección vienen
  // incluidos; si no, se leen al vuelo los 3 cuadros que publica YouTube.
  const analyzed = VIDEO_LOOKS[song.id];
  currentVideoPal = analyzed?.yt === song.yt ? analyzed : null;
  if (!currentVideoPal && song.kind !== "concert") videoPalette(song.yt).then((v) => { if (current === i && v) { currentVideoPal = v; pattern = null; } });
  markCurrent();
  startChallenge();
  renderRanking();
  player.load(videoFor(song), autoplay);
  player.setTitle(song.title);
  $("mini-title").textContent = song.title;
  syncDockLike();
  if (firstSongPending) {
    firstSongPending = false;
    if (view === "explore") { selectViewTab("view-video"); view = "video"; }
  }
  $("np-open").dataset.tip = `Ahora suena: ${song.title}`;
  maybeNudgeSupport();
  maybeAskFeedback();
  syncRoute();
  if (npDocked() && store.get(NP_KEY, true) && $("np-side").hidden) setNpOpen(true);
  if (view === "video") $("home").hidden = true;
  setView(view);
  document.title = routeTitle(currentSlug());
  updateMediaSession();
  renderUpNext();
}

let currentVideoPal = null;
function buildPattern() {
  const item = queue[current];
  const dur = player.duration();
  if (!item || !(dur > 0)) return;
  const bpm = Number(settings.bpm[item.song.id] ?? item.song.bpm);
  const opts = { styleOverride: settings.style === "auto" ? null : settings.style, safeMode: settings.safeMode, video: currentVideoPal, phase: settings.phase?.[item.song.id] ?? 0 };
  pattern =
    item.song.kind === "concert"
      ? generateConcertPattern(dur, { ...opts, bpm, palettes: ALBUMS.map((a) => a.palette) })
      : generatePattern({ ...item.song, bpm }, item.album, dur, opts);
  patternDuration = dur;
  renderTimeline();
}

function renderTimeline() {
  const tl = $("timeline");
  tl.querySelectorAll(".seg-part").forEach((n) => n.remove());
  if (!pattern) return;
  const frag = document.createDocumentFragment();
  for (const s of pattern.sections) {
    const seg = document.createElement("div");
    seg.className = "seg-part";
    seg.style.left = `${(s.start / patternDuration) * 100}%`;
    seg.style.width = `${((s.end - s.start) / patternDuration) * 100}%`;
    seg.style.background = rgbToHex(s.color);
    frag.append(seg);
  }
  tl.prepend(frag);
}

/** Video que se reproduce (el MV oficial). */
function videoFor(song) {
  return song.yt;
}

function togglePlay() {
  // Sin canción elegida, Reproducir empieza con la primera sugerencia de inicio.
  if (current < 0) return playIndex(shelves(queue).find((x) => x.id === "start")?.items[0] ?? 0);
  player.toggle();
}

function bindTimeline() {
  const tl = $("timeline");
  const seekTo = (clientX) => {
    const r = tl.getBoundingClientRect();
    const k = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    player.seek(k * player.duration());
  };
  let dragging = false;
  tl.addEventListener("pointerdown", (e) => { dragging = true; tl.setPointerCapture(e.pointerId); seekTo(e.clientX); });
  tl.addEventListener("pointermove", (e) => dragging && seekTo(e.clientX));
  tl.addEventListener("pointerup", () => (dragging = false));
  tl.addEventListener("keydown", (e) => {
    const step = { ArrowRight: 5, ArrowLeft: -5, ArrowUp: 5, ArrowDown: -5, PageUp: 30, PageDown: -30 }[e.key];
    let to = null;
    if (step) to = Math.max(0, player.time() + step);
    if (e.key === "Home") to = 0;
    if (e.key === "End") to = Math.max(0, player.duration() - 2);
    if (to == null) return;
    e.preventDefault();
    player.seek(to);
    setTimelineValue(to, player.duration());
  });
}

/** Valor accesible de la barra de tiempo: "1:23 de 3:45, coro". */
function setTimelineValue(time, dur) {
  const tl = $("timeline");
  tl.setAttribute("aria-valuemax", Math.round(dur));
  tl.setAttribute("aria-valuenow", Math.round(time));
  const sec = pattern?.sectionAt?.(time)?.label;
  tl.setAttribute("aria-valuetext", `${fmt(time)} de ${fmt(dur)}${sec ? `, ${sec}` : ""}`);
}

function applyAccess() {
  app.classList.toggle("calm", settings.calm);
  // "Describir las luces" apagado: tampoco se muestra el chip con la sección y el estilo (ni en Luces).
  app.classList.toggle("no-describe", !settings.describe);
  configureEarcons({ volume: settings.sounds ? 0.5 : 0, muted: () => Boolean(mic) });
}

// ---------- Luces en palabras (A-15) ----------
let lastColors = null;
let lastDescribed = 0;
/** "Rosa intenso, coro, estilo Ola. 2 ARMY Bomb conectados." (en el idioma actual) */
function describeLights() {
  const c = lastColors?.[0];
  const parts = [];
  if (mic && !mic.hybrid) parts.push(t("Las luces siguen el micrófono"));
  else if (cam) parts.push(t("Las luces copian el color de la cámara"));
  if (c && player?.state === "playing") parts.push(colorName(c.map((v) => v * (settings.brightness / 100)), lang));
  else parts.push(t(current >= 0 ? "En pausa" : "Luces listas"));
  if (pattern && player?.state === "playing" && !mic && !cam) {
    const sec = pattern.sectionAt(player.time());
    parts.push(t(sec.label), `${t("estilo")} ${t(STYLES[sec.style].label)}`);
  }
  const n = sticks.length;
  const CONN = { en: `${n} ARMY Bomb connected`, pt: `${n} ARMY Bomb conectado${n > 1 ? "s" : ""}`, ko: `ARMY Bomb ${n}개 연결됨`, id: `${n} ARMY Bomb terhubung` };
  const conn = n ? CONN[lang] ?? `${n} ARMY Bomb conectado${n > 1 ? "s" : ""}` : t("Sin ARMY Bomb conectado");
  return `${parts.join(", ")}. ${conn}.`;
}
function announceLights() { lastDescribed = performance.now(); say(describeLights(), { delay: 0 }); }

// ---------- Modo micrófono ----------
// ---------- "Estoy en un concierto" ----------
let cam = null;
let concertBrightnessBackup = null;
async function toggleConcert() {
  const btn = $("btn-concert");
  if (cam) {
    cam.stop();
    cam = null;
    if (mic) await toggleMic();
    $("concert-cam").hidden = true;
    btn.setAttribute("aria-pressed", "false");
    btn.querySelector(".mi-label").textContent = "En el estadio";
    syncLiveButton();
    if (concertBrightnessBackup !== null) { settings.brightness = concertBrightnessBackup; concertBrightnessBackup = null; }
    toast("Cámara apagada. Modo concierto en pausa.");
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) return toast("Este navegador no permite usar la cámara.");
  try {
    if (player.state === "playing") player.pause();
    setView("lights");
    selectViewTab("view-lights");
    cam = new CameraColor({ maxChangesPerSec: settings.safeMode ? 3 : 8 });
    $("concert-cam").hidden = false;
    await cam.start($("cam-video"));
    concertBrightnessBackup = settings.brightness;
    settings.brightness = 100;
    btn.setAttribute("aria-pressed", "true");
    btn.querySelector(".mi-label").textContent = "Salir del modo concierto";
    syncLiveButton();
    requestWakeLock();
    if (!mic) toggleMic().catch(() => {});
    toast("Apunta a un ARMY Bomb encendido y tu pantalla copiará su color.");
  } catch {
    cam?.stop();
    cam = null;
    $("concert-cam").hidden = true;
    toast("No pudimos usar la cámara. Revisa el permiso en tu navegador.");
  }
}

async function toggleMic() {
  if (mic) {
    mic.stop();
    mic = null;
    syncMicButtons();
    toast("Micrófono apagado.");
    return;
  }
  try {
    const palette = [PURPLE, ...(queue[current]?.album.palette ?? ["#ff80ab", "#4fc3f7", "#ffd600"])].map(hexToRgb);
    mic = new MicSync({ palette, maxChangesPerSec: settings.safeMode ? 3 : 8 });
    await mic.start();
    if (player.state === "playing") player.pause();
    syncMicButtons();
    setView("lights");
    selectViewTab("view-lights");
    toast("🎙 Tus luces siguen la música que suena cerca. Nada se graba.");
    requestWakeLock();
  } catch {
    mic = null;
    syncMicButtons();
    toast("No pudimos usar el micrófono. Revisa el permiso en tu navegador.");
  }
}
/** "Con el sonido del video": el video sigue sonando y el micrófono solo ajusta la intensidad de su patrón. */
async function toggleMicSync() {
  if (mic?.hybrid) {
    mic.stop();
    mic = null;
    syncMicButtons();
    return toast("Intensidad con el sonido real apagada.");
  }
  if (mic) { mic.stop(); mic = null; }
  try {
    mic = new MicSync({ palette: [hexToRgb(PURPLE)], maxChangesPerSec: settings.safeMode ? 2.5 : 8 });
    mic.hybrid = true;
    await mic.start();
    syncMicButtons();
    toast("Intensidad con el sonido real: el micrófono escucha tus parlantes. Nada se graba.");
  } catch {
    mic = null;
    syncMicButtons();
    toast("No pudimos usar el micrófono. Revisa el permiso en tu navegador.");
  }
}
function syncMicButtons() {
  $("btn-mic").setAttribute("aria-pressed", Boolean(mic && !mic.hybrid));
  $("btn-mic-sync").setAttribute("aria-pressed", Boolean(mic?.hybrid));
  syncLiveButton();
  $("btn-mic-2").textContent = mic ? "Apagar micrófono" : "Activar micrófono";
}

// ---------- Trabajo diferido ----------
/** Después del primer cuadro pintado y con el hilo libre. */
function afterPaintIdle(fn) {
  const idle = () => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 1000 }) : setTimeout(fn, 50));
  requestAnimationFrame(() => setTimeout(idle, 0));
}
/** Después del evento load y con el hilo libre. */
function afterLoadIdle(fn) {
  const idle = () => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 200));
  if (document.readyState === "complete") idle(); else addEventListener("load", idle, { once: true });
}

// ---------- Bucle de sincronía ----------
const simEls = [];
function setupSim() {
  for (let i = 0; i < SIM_COUNT; i++) {
    const el = document.createElement("div");
    el.className = "bulb";
    $("sim").append(el);
    simEls.push(el);
  }
}

const LED_GAMMA = 2;
let lastGlow = "", lastGlowAt = 0, lastEnergy = "";
const dotEls = []; // puntos de color de cada ARMY Bomb (se buscan una vez, no en cada cuadro)
let micGain = 1;
let lastUi = 0;
let lastLabel = "";
let lastSave = 0;
// Bucle de sincronía. Con la página visible lo mueve requestAnimationFrame; con la página oculta (otra pestaña u
// otra ventana) el navegador lo detiene, así que un temporizador sigue mandando colores al ARMY Bomb mientras el
// video suena. Nunca corren los dos a la vez (si no, cada color se mandaría dos veces).
function frame(now) {
  requestAnimationFrame(frame);
  if (!document.hidden) step(now);
}
let bgTimer = 0;
function syncBackground() {
  clearInterval(bgTimer);
  bgTimer = 0;
  // Las pestañas que suenan (el video) no se frenan: 50 ms. Si el video está en silencio, el navegador lo limita
  // a ~1 vez por segundo, que igual es mejor que dejar el ARMY Bomb congelado.
  if (document.hidden && sticks.length) bgTimer = setInterval(() => { if (document.hidden) step(performance.now()); else syncBackground(); }, 50);
}
document.addEventListener("visibilitychange", syncBackground);
function step(now) {
  if (!player?.ready) { if (!document.hidden) crowd?.draw(now); return; } // el fondo se dibuja aunque YouTube aún no cargue
  const k = settings.brightness / 100;
  const total = Math.max(SIM_COUNT, sticks.length);
  let colors;

  if (fanchant?.running) {
    const kf = 0.25 + 0.75 * Math.exp(-(now - chantFlashAt) / 260);
    const c = hexToRgb(PURPLE).map((v) => v * kf);
    colors = Array.from({ length: total }, () => c);
  } else if (cam) {
    // La cámara manda si ve una luz de color; si no, el micrófono marca el ritmo.
    const camColor = cam.sample(now);
    const c = cam.strength > 0.25 || !mic ? camColor : mic.sample(now);
    colors = Array.from({ length: total }, () => c);
  } else if (mic && !mic.hybrid) {
    const c = mic.sample(now);
    colors = Array.from({ length: total }, () => c);
  } else {
    const dur = player.duration();
    if (current >= 0 && dur > 0 && (!pattern || Math.abs(dur - patternDuration) > 0.5)) buildPattern();
    const playing = player.state === "playing";
    // Se calcula un poco "adelante" para compensar la latencia del Bluetooth.
    const lt = player.time() + settings.latencyMs / 1000;
    // Con el sonido del video, el golpe real (graves del micrófono) dispara las explosiones de los estilos "Golpes".
    const ext = mic?.hybrid && playing ? { hit: (micGain = mic.intensity(now), mic.flash) } : null;
    colors = Array.from({ length: total }, (_, i) => (pattern && playing ? pattern.colorAt(lt, i, total, ext) : [45, 20, 90]));
  }

  // Con el sonido del video: el patrón da los colores y el micrófono, cuánto brillan.
  if (mic?.hybrid && pattern && player.state === "playing") {
    const g = 0.45 + 0.55 * micGain; // el volumen real sube o baja todo el patrón, sin apagarlo
    colors = colors.map((c) => c.map((v) => v * g));
  }
  // Los LED del ARMY Bomb responden lineal y el ojo no: sin esta curva, un 40 % se ve casi como un 100 %
  // y la diferencia entre lo suave y lo intenso se pierde.
  // Piso de la sección: lo intenso nunca se ve apagado; solo el cierre de la canción puede llegar a negro.
  const floor = pattern && player.state === "playing" && !cam && (!mic || mic.hybrid) ? pattern.floorAt(player.time()) : 0;
  sticks.forEach((s, i) => s.setColor(ledLevel(colors[i].map((v) => v * k), floor * k, LED_GAMMA)));
  if (crowd && !document.hidden) { crowd.setColor(colors[0].map((v) => Math.max(40, v * k))); crowd.draw(now); } // oculto: solo el ARMY Bomb

  // La interfaz se actualiza a ~20 fps para ahorrar batería.
  if (now - lastUi < 50) return;
  lastUi = now;
  const hex = (c) => rgbToHex(c.map((v) => v * k));
  for (let i = 0; i < SIM_COUNT; i++) simEls[i].style.setProperty("--c", hex(colors[i]));
  $("big-bulb").style.setProperty("--c", hex(colors[0]));
  stick3d?.setColor(colors[0].map((v) => v * k));
  // --glow tiñe fondos enormes (haces, neblina, sombras): cambiarlo 20 veces/s obliga a repintar toda la pantalla.
  // Se actualiza como mucho 5 veces/s y solo si el color cambió de verdad (los cambios son de una paleta, no saltos bruscos).
  const glow = rgbToHex(colors[0].map((v) => Math.round(Math.max(30, v * 0.8) / 8) * 8));
  if (glow !== lastGlow && now - lastGlowAt > 200) { lastGlow = glow; lastGlowAt = now; app.style.setProperty("--glow", glow); }
  sticks.forEach((s, i) => {
    let dot = dotEls[i];
    if (!dot?.isConnected) dot = dotEls[i] = document.querySelector(`.dot[data-index="${i}"]`);
    if (dot) dot.style.background = rgbToHex(colors[i]);
  });

  const t = player.time();
  const dur = player.duration();
  $("t-cur").textContent = fmt(t);
  $("t-dur").textContent = fmt(dur);
  $("playhead").style.left = dur ? `${(t / dur) * 100}%` : "0";
  const tl = $("timeline");
  // Con el foco en la barra no se reescribe el valor (el lector lo leería cada segundo): solo tras una tecla.
  if (document.activeElement !== tl) setTimelineValue(t, dur);
  lastColors = colors;

  // El océano del fondo "escala" con la canción: tenue en la intro, máximo en los coros.
  let energy = 0.35;
  if (mic) energy = 0.4 + Math.min(0.6, mic.level * 2);
  else if (pattern && player.state === "playing") {
    const l = pattern.sectionAt(t).label;
    energy = /coro final/.test(l) ? 1 : /coro/.test(l) ? 0.85 : /pre-coro|puente/.test(l) ? 0.65 : /verso/.test(l) ? 0.5 : /final/.test(l) ? 0.3 : 0.4;
    energy = Math.min(1, energy + (dur ? (t / dur) * 0.15 : 0)); // sube poco a poco a lo largo del video
  }
  const eq = (Math.round(energy * 20) / 20).toFixed(2); // pasos de 0,05: casi nunca cambia de un cuadro a otro
  if (eq !== lastEnergy) { lastEnergy = eq; app.style.setProperty("--energy", eq); app.classList.toggle("chorus", energy >= 0.85); }
  if (now - lastSave > 5000 && player.state === "playing") { lastSave = now; saveQueue(); updateMediaPosition(); }
  updateUpNextCard(t, dur);
  crowd?.setEnergy(energy);

  let label;
  if (mic && !mic.hybrid) label = "🎙 Luces siguiendo el micrófono";
  else if (pattern && player.state === "playing") {
    const sec = pattern.sectionAt(t);
    label = `Luces: ${STYLES[sec.style].label} · ${sec.label}`;
  } else label = current >= 0 ? "En pausa" : "Luces listas";
  if (label !== lastLabel) {
    // Modo opcional "Describir las luces": un aviso por sección, nunca más de uno cada 8 s ni al empezar.
    if (settings.describe && pattern && player.state === "playing" && t > 5 && now - lastDescribed > 8000) announceLights();
    lastLabel = label;
    $("style-chip").textContent = label;
    $("now-section").textContent = label;
  }
}

// ---------- Pantalla completa, inactividad, pantalla encendida ----------
function toggleFullscreen() {
  const el = document.documentElement;
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else if (el.requestFullscreen) el.requestFullscreen().catch(() => app.classList.toggle("fs"));
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else app.classList.toggle("fs"); // iPhone: modo inmersivo sin API de pantalla completa
}
function onFsChange() {
  const on = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  app.classList.toggle("fs", on);
  syncOrientation(on);
  $("btn-fs").setAttribute("aria-label", on ? "Salir de pantalla completa" : "Pantalla completa");
  $("btn-fs").querySelector("span").textContent = on ? "Salir" : "Pantalla";
}

/**
 * En el teléfono el reproductor va siempre en vertical; solo la pantalla completa (la del video de YouTube o la
 * nuestra) puede girar a horizontal, y al salir vuelve a vertical aunque el teléfono tenga la rotación activada.
 * Funciona en Android (Chrome, Samsung) y con la app instalada; Safari de iPhone/iPad no permite bloquear el giro.
 */
const phoneLike = () => matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 600;
function syncOrientation(fullscreen) {
  const o = screen.orientation;
  if (!o?.lock || !phoneLike()) return;
  if (fullscreen) o.lock("landscape").catch(() => {});
  else o.lock("portrait").catch(() => {}); // fuera de pantalla completa solo funciona con la app instalada
}

let idleTimer;
function poke() {
  app.classList.remove("idle");
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (app.classList.contains("fs") && player?.state === "playing" && !openPanel) app.classList.add("idle");
  }, 3000);
}

let wakeLock = null;
async function requestWakeLock() {
  if (!settings.wake || !("wakeLock" in navigator) || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => (wakeLock = null));
  } catch {}
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && (player?.state === "playing" || mic)) requestWakeLock();
});

function updateMediaSession() {
  if (!("mediaSession" in navigator) || current < 0) return;
  const { album, song } = queue[current];
  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title,
    artist: album.id === "mine" ? song.channel ?? "" : "BTS",
    album: album.title,
    artwork: [{ src: thumbUrl(song.yt), sizes: "320x180", type: "image/jpeg" }],
  });
  const on = (action, fn) => { try { navigator.mediaSession.setActionHandler(action, fn); } catch {} };
  on("nexttrack", () => next(false));
  on("previoustrack", prev);
  on("play", () => player.play());
  on("pause", () => player.pause());
  on("seekbackward", (d) => player.seek(Math.max(0, player.time() - (d?.seekOffset ?? 10))));
  on("seekforward", (d) => player.seek(player.time() + (d?.seekOffset ?? 10)));
  on("seekto", (d) => d?.seekTime != null && player.seek(d.seekTime));
}
function updateMediaPosition() {
  if (!("mediaSession" in navigator) || !player?.ready) return;
  const duration = player.duration();
  try {
    navigator.mediaSession.playbackState = player.state === "playing" ? "playing" : "paused";
    if (duration > 0) navigator.mediaSession.setPositionState?.({ duration, position: Math.min(duration, player.time()), playbackRate: 1 });
  } catch {}
}

// ---------- Presentación (solo clases y variables CSS) ----------
/** Reinicia una animación CSS quitando y volviendo a poner la clase. */
function replayClass(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  clearTimeout(replayClass[cls]);
  replayClass[cls] = setTimeout(() => el.classList.remove(cls), 1600);
}
/** Pinta el relleno de los deslizadores con --p (porcentaje del valor). */
function bindRangeFill() {
  document.querySelectorAll('input[type="range"]').forEach((r) => {
    const paint = () => r.style.setProperty("--p", `${((r.value - r.min) / (r.max - r.min)) * 100}%`);
    r.addEventListener("input", paint);
    paint();
  });
}

// ---------- Tipografía y paleta por canción ----------
/** Título del dock: letras que entran escalonadas, con degradado del color de la canción. */
function setNowTitle(text) {
  const el = $("now-title");
  const sr = document.createElement("span");
  sr.className = "sr";
  sr.textContent = text;
  const vis = document.createElement("span");
  vis.className = "np-letters";
  vis.setAttribute("aria-hidden", "true");
  [...text].forEach((ch, i) => {
    const c = document.createElement("span");
    c.className = "ch";
    c.textContent = ch;
    c.style.setProperty("--i", i);
    vis.append(c);
  });
  // El degradado se reparte sobre todo el título: cada letra muestra su tramo (--i de --n).
  vis.style.setProperty("--n", Math.max(2, [...text].length));
  el.replaceChildren(sr, vis);
  requestAnimationFrame(markTitleOverflow);
}
/** El título del dock se desvanece al final solo cuando no cabe. */
function markTitleOverflow() {
  const el = $("now-title");
  el.classList.toggle("is-overflowing", el.scrollWidth > el.clientWidth + 1);
}
/** Acentos legibles derivados de la paleta del álbum (ver src/palette.js). */
function applySongTheme(palette) {
  for (const [k, v] of Object.entries(songTheme(palette))) app.style.setProperty(k, v);
}

// ---------- Metadatos compactos de cada canción ----------
const PLAYED_KEY = "pws.played.v1";
let playedHistory = (store.get(PLAYED_KEY, []) || []).filter((id) => typeof id === "string" && /^[a-z0-9-]{1,80}$/.test(id));
function rememberPlayed(id) {
  playedHistory = [...playedHistory.filter((x) => x !== id), id].slice(-500);
  store.set(PLAYED_KEY, playedHistory);
}
const LIGHT_LEVEL = { ballad: 1, mid: 2, high: 3 };
const LIGHT_NAME = ["", "suaves", "medias", "altas"]; // niveles: no "intensas" ("intensidad: intensa" se repetía)
/** Tipo de video: MV por defecto; En vivo, Coreografía, Performance o Film según el catálogo. */
function videoType(song) {
  if (song.kind === "cover") return "Cover";
  if (song.kind === "concert") return "En vivo";
  if (/dance practice|choreograph/i.test(song.title)) return "Coreografía";
  if (/performance/i.test(song.title)) return "Performance";
  if (/film|trailer/i.test(song.title)) return "Film";
  return "MV";
}
/** Artista solo cuando no es el grupo (solistas y colaboraciones). */
const soloArtist = ({ album, song }) => (album.id === "mine" ? song.channel ?? "" : album.artist && album.artist !== "BTS" ? album.artist : "");
const lightLevel = ({ song }) => LIGHT_LEVEL[song.energy] ?? 2;
function songLabel(item) {
  const type = videoType(item.song);
  return [item.song.title, soloArtist(item), type === "MV" ? "video musical" : type.toLowerCase(), `luces ${LIGHT_NAME[lightLevel(item)]}`, playedHistory.includes(item.song.id) ? "escuchada" : ""]
    .filter(Boolean).join(", ");
}
/** Línea 2 de una fila: artista (si es solista) + chip de tipo. */
function metaLine(item, { tag = "", fallback = "" } = {}) {
  const line = document.createElement("span");
  line.className = "s-meta meta-line";
  const add = (text, cls) => { const el = document.createElement("span"); el.className = cls; el.textContent = text; line.append(el); };
  if (tag) add(tag, "m-tag");
  const artist = soloArtist(item);
  if (artist) add(artist, "m-artist");
  const type = videoType(item.song);
  if (type !== "MV") add(type, "chip-type");
  if (!line.children.length && fallback) add(fallback, "m-artist");
  if (!line.children.length) line.hidden = true; // MV del grupo: no hace falta repetirlo
  return line;
}
/** Intensidad de luces: globo de lightstick con halo de 1 a 3 niveles (solo visual; el texto está en el nombre accesible). */
function lightGlyph(item) {
  const lvl = lightLevel(item);
  const g = document.createElement("span");
  g.className = "lights-glyph";
  g.dataset.level = lvl;
  g.dataset.tip = `Intensidad de luces: ${LIGHT_NAME[lvl]}`;
  g.setAttribute("aria-hidden", "true");
  // Globo de lightstick cuyo halo crece con la intensidad (3 = halo fuerte con rayos).
  g.innerHTML = `<svg viewBox="0 0 20 20"><circle class="lg-halo" cx="10" cy="8" r="7.5"/><path class="lg-rays" d="M10 .4v1.4M3.6 2.6l1 1M16.4 2.6l-1 1M1.8 8h1.4M16.8 8h1.4"/><circle class="lg-globe" cx="10" cy="8" r="3.6"/><path class="lg-stick" d="M10 11.8V18.6"/></svg>`;
  return g;
}

// ---------- Sugerencias ----------
const played = new Set();
let upnextDismissed = false;
const SHELF_COPY = {
  recent: { eyebrow: "Tu historial", title: "Seguir escuchando", sub: "", ko: "다시" },
  likes: { eyebrow: "Tu lista", title: "Tus Me gusta", sub: "", ko: "좋아요" },
  start: { eyebrow: "Clásicos", title: "Para empezar", sub: "¿Primera vez? Empieza por un clásico.", ko: "시작" },
  solo: { eyebrow: "Integrantes", title: "Solistas", sub: "Lo más reciente de cada integrante.", ko: "솔로" },
  hype: { eyebrow: "Energía", title: "Para que brille tu ARMY Bomb", sub: "Rápidas y con mucha energía.", ko: "응원봉" },
};
const artistName = (album) => (album.id === "mine" ? "Mis videos" : album.artist ?? "BTS");

/** Tarjeta de canción: miniatura 16:9, título, artista/álbum, reproducir y ♡. */
function suggestCard(index, { compact = false, tag = "", uid = 0, ctx = null } = {}) {
  const { album, song } = queue[index];
  const li = document.createElement("li");
  li.className = `sg-item${compact ? " compact" : ""}`;
  album.palette.slice(0, 3).forEach((c, k) => li.style.setProperty(`--p${k + 1}`, c));
  const play = document.createElement("button");
  play.type = "button";
  play.className = "sg-play";
  play.dataset.index = index;
  play.setAttribute("aria-label", `Reproducir ${tag ? `${tag}: ` : ""}${songLabel(queue[index])}`);
  const th = document.createElement("span");
  th.className = "sg-thumb";
  const img = document.createElement("img");
  img.src = thumbUrl(song.yt);
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  img.width = 320;
  img.height = 180;
  imgThumb(th, img);
  const icon = document.createElement("span");
  icon.className = "sg-icon";
  icon.innerHTML = `<svg aria-hidden="true"><use href="#i-play"/></svg>`;
  // Los colores que verás en tu ARMY Bomb con esta canción (la combinación real del patrón, no solo uno).
  const colors = document.createElement("span");
  colors.className = "sg-colors";
  colors.setAttribute("aria-hidden", "true");
  colors.title = "Colores de tu ARMY Bomb en esta canción";
  lightColors(song, queue[index].album).forEach((c, k) => {
    const dot = document.createElement("i");
    dot.style.setProperty("--c", c);
    dot.style.setProperty("--k", k);
    colors.append(dot);
  });
  th.append(img, icon, colors);
  const title = document.createElement("span");
  title.className = "sg-title";
  title.textContent = song.title;
  const meta = metaLine(queue[index], { tag, fallback: album.title });
  meta.classList.add("sg-meta");
  meta.append(lightGlyph(queue[index]));
  play.append(th, title, meta);
  play.onclick = () => { fanchant?.stop(); closePanel(false); if (uid) return jumpTo(uid); playIndex(index, ctx ?? undefined); };
  const like = document.createElement("button");
  like.type = "button";
  like.className = "like-btn sg-like";
  like.dataset.song = song.id;
  const on = favorites.has(song.id);
  like.setAttribute("aria-pressed", on);
  like.setAttribute("aria-label", `${on ? "Quitar" : "Agregar"} ${song.title} ${on ? "de" : "a"} Me gusta`);
  like.onclick = () => toggleLike(song, like);
  li.append(play, like, moreButton(index, song.title));
  return li;
}

/** Estantes de la pantalla de inicio. */
function renderHome() {
  const sections = shelves(queue, { likes: favorites.list(), recent: playedHistory }).map((shelf) => {
    const copy = SHELF_COPY[shelf.id];
    const sec = document.createElement("section");
    sec.className = `shelf shelf-${shelf.id}`;
    sec.setAttribute("aria-labelledby", `shelf-${shelf.id}`);
    const head = document.createElement("div");
    head.className = "shelf-head";
    const eb = document.createElement("p");
    eb.className = "shelf-eyebrow";
    eb.textContent = copy.eyebrow;
    const h = document.createElement("h2");
    h.id = `shelf-${shelf.id}`;
    h.className = "shelf-title";
    h.textContent = copy.title;
    const ko = document.createElement("span");
    ko.className = "shelf-ko";
    ko.lang = "ko";
    ko.setAttribute("aria-hidden", "true");
    ko.textContent = copy.ko;
    head.append(eb, h);
    if (copy.sub) { const sub = document.createElement("p"); sub.className = "shelf-sub"; sub.textContent = copy.sub; head.append(sub); }
    head.append(ko);
    const row = document.createElement("ul");
    row.className = "sg-row";
    const ids = shelf.items.map((i) => queue[i].song.id);
    row.append(...shelf.items.map((i, k) => suggestCard(i, { ctx: { context: ids.slice(k + 1), source: ids, label: copy.title, kind: "shelf" } })));
    sec.append(head, row);
    return sec;
  });
  $("shelves").replaceChildren(...sections);
}

/** Candidatos de "A continuación": lo que sigue en la cola y sugerencias parecidas. */
function upNextItems() {
  if (current < 0 || !pq) return [];
  // Primero lo que de verdad sigue (tu cola, luego el contexto); si falta, la cola de sugerencias.
  const items = [];
  for (const e of [...pq.userQueue, ...pq.context].slice(0, 4)) {
    const i = idxOf(e.id);
    if (i >= 0) items.push({ i, tag: items.length ? (pq.userQueue.includes(e) ? "En tu cola" : "Después") : "Sigue", uid: e.uid });
  }
  if (items.length < 3) {
    const skip = new Set([...played, ...items.map((x) => queue[x.i].song.id)]);
    for (const i of upNext(queue, current, { played: skip, likes: favorites.list(), n: 4 - items.length })) {
      items.push({ i, tag: favorites.has(queue[i].song.id) ? "Te gusta" : "Sugerida" });
    }
  }
  return items.slice(0, 4);
}
function renderUpNext() {
  const items = upNextItems();
  $("upnext-list").replaceChildren(...items.slice(0, 3).map(({ i, tag, uid }) => suggestCard(i, { compact: true, tag, uid })));
}
/** Muestra la tarjeta en los últimos segundos del video (se puede ocultar). */
function updateUpNextCard(t, dur) {
  const card = $("upnext");
  const left = dur - t;
  const inline = matchMedia("(max-width: 640px)").matches && view === "video";
  const show = card.dataset.force === "1" ||
    (inline && current >= 0 && !upnextDismissed && !fanchant?.running && $("upnext-list").children.length > 0) ||
    (current >= 0 && dur > 45 && left > 0 && left < 25 && !upnextDismissed && !fanchant?.running && $("upnext-list").children.length > 0);
  if (card.hidden === !show) return;
  card.hidden = !show;
}

// ---------- Colecciones: Mis álbumes y Canciones que me gustan ----------
const ALBUMS_KEY = "pws.albums.v1";
let savedAlbums = (store.get(ALBUMS_KEY, []) || []).filter((id) => typeof id === "string" && /^[a-z0-9-]{1,80}$/.test(id));
let exploreAll = false;
const albumSongs = (id) => queue.map((q, i) => [q, i]).filter(([q]) => q.album.id === id).map(([, i]) => i);
function toggleAlbum(album) {
  const on = !savedAlbums.includes(album.id);
  savedAlbums = on ? [...savedAlbums, album.id] : savedAlbums.filter((x) => x !== album.id);
  store.set(ALBUMS_KEY, savedAlbums);
  document.querySelectorAll(`.album-like[data-album="${album.id}"]`).forEach((b) => syncAlbumLike(b, album));
  renderCollections();
  renderLibrary();
  renderNowPanel();
  toast(on ? `💜 ${album.title} guardado` : `${album.title} ya no está en Mis álbumes`, 2000);
}
function syncAlbumLike(b, album) {
  const on = savedAlbums.includes(album.id);
  b.setAttribute("aria-pressed", on);
  b.setAttribute("aria-label", `${on ? "Quitar" : "Guardar"} álbum ${album.title}`);
}
function albumLikeButton(album) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "like-btn album-like";
  b.dataset.album = album.id;
  syncAlbumLike(b, album);
  b.onclick = (e) => { e.stopPropagation(); toggleAlbum(album); b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); };
  return b;
}
/** Abre un álbum en Explorar: filtra la lista a sus canciones. */
function openAlbum(id) {
  listFilter = `album:${id}`;
  exploreAll = false;
  renderFilters();
  applySearch();
  if (view !== "explore") $("view-explore").click();
  syncRoute();
  requestAnimationFrame(() => $("explore-results").scrollIntoView({ block: "start", behavior: "smooth" }));
}
function albumCard(id) {
  const items = albumSongs(id);
  const { album } = queue[items[0]];
  const li = document.createElement("li");
  li.className = "sg-item al-item";
  album.palette.slice(0, 3).forEach((c, k) => li.style.setProperty(`--p${k + 1}`, c));
  const open = document.createElement("button");
  open.type = "button";
  open.className = "sg-play al-open";
  const solo = album.artist && album.artist !== "BTS" ? album.artist : "";
  open.setAttribute("aria-label", `Abrir ${album.title}${solo ? `, ${solo}` : ""}, ${album.year}, ${items.length} canciones`);
  const th = document.createElement("span");
  th.className = "sg-thumb al-cover";
  const img = document.createElement("img");
  img.src = thumbUrl(queue[items[0]].song.yt);
  img.alt = "";
  img.loading = "lazy";
  img.width = 320;
  img.height = 180;
  imgThumb(th, img);
  th.append(img);
  const title = document.createElement("span");
  title.className = "sg-title";
  title.textContent = album.title;
  const meta = document.createElement("span");
  meta.className = "s-meta meta-line sg-meta";
  meta.textContent = [album.year, solo, `${items.length} ${items.length === 1 ? "canción" : "canciones"}`].filter(Boolean).join(" · ");
  open.append(th, title, meta);
  open.onclick = () => openAlbum(id);
  const play = document.createElement("button");
  play.type = "button";
  play.className = "al-play";
  play.setAttribute("aria-label", `Reproducir ${album.title}`);
  play.innerHTML = `<svg aria-hidden="true"><use href="#i-play"/></svg>`;
  play.onclick = () => { fanchant?.stop(); playIndex(items[0], albumContext(items[0])); };
  const like = albumLikeButton(album);
  like.classList.add("sg-like");
  li.append(open, play, like);
  return li;
}
/** "Me gusta" del panel Ahora suena: botón de acción (Like) o estado (Liked); "Me gusta" también es el nombre de la lista. */
function likeLabel(liked) {
  const span = $("nps-like").querySelector("span");
  span.setAttribute("translate", "no"); // lo maneja esta función en los dos idiomas
  const L = { en: ["Like", "Liked"], pt: ["Curtir", "Curtido"], ko: ["좋아요", "좋아요 누름"], id: ["Suka", "Disukai"] }[lang] ?? ["Me gusta", "Te gusta"];
  span.textContent = L[liked ? 1 : 0];
}
addEventListener("pws:lang", () => likeLabel($("nps-like").getAttribute("aria-pressed") === "true"));
function likedIndices() {
  return favorites.list().slice().reverse().map((id) => idxOf(id)).filter((i) => i >= 0);
}
function playLiked(shuffle) {
  const items = likedIndices();
  if (!items.length) return;
  const ids = items.map((i) => queue[i].song.id);
  const k = shuffle ? Math.floor(Math.random() * ids.length) : 0;
  playIndex(items[k], { context: [...ids.slice(k + 1), ...ids.slice(0, k)], source: ids, label: "Canciones que me gustan", kind: "list" });
  if (shuffle !== pq.shuffle) { pq.setShuffle(shuffle); queueChanged(); }
}
/** Álbumes del catálogo (sin "Mis videos"), del más reciente al más antiguo. */
function catalogAlbums() {
  const seen = new Map();
  for (const q of queue) if (q.album.id !== "mine" && !seen.has(q.album.id)) seen.set(q.album.id, q.album);
  return [...seen.values()].sort((x, y) => (y.year ?? 0) - (x.year ?? 0));
}
/** Explorar en modo Álbumes: mismas búsquedas y filtros (integrante, Me gusta) que las canciones. */
function renderExploreAlbums(terms) {
  const liked = new Set(myAlbums(queue, { saved: savedAlbums, likes: favorites.list() }).ids);
  const list = catalogAlbums().filter((al) => {
    if (listFilter === "likes" && !liked.has(al.id)) return false;
    if (listFilter !== "all" && listFilter !== "likes" && !listFilter.startsWith("album:") && (al.artist ?? "BTS") !== listFilter) return false;
    const hay = norm(`${al.title} ${al.year} ${al.artist ?? "BTS"}`);
    return terms.every((t) => hay.includes(t));
  });
  $("explore-albums").replaceChildren(...list.map((al) => albumCard(al.id)));
  const empty = $("explore-results").querySelector(".search-empty");
  empty.hidden = list.length > 0;
  if (!list.length) empty.textContent = listFilter === "likes" ? "Aún no hay álbumes en Me gusta. Toca ♡ en la portada de un álbum." : "No encontramos álbumes con esa búsqueda.";
}
function setExploreType(type) {
  exploreType = type;
  $("type-songs").setAttribute("aria-pressed", String(type === "songs"));
  $("type-albums").setAttribute("aria-pressed", String(type === "albums"));
  if (listFilter.startsWith("album:")) listFilter = "all";
  renderFilters();
  applySearch();
  syncRoute();
}

function renderCollections() {
  const { ids, derived } = myAlbums(queue, { saved: savedAlbums, likes: favorites.list() });
  $("ma-row").replaceChildren(...ids.map(albumCard));
  $("ma-row").hidden = !ids.length;
  $("ma-sub").hidden = !derived;
  $("ma-empty").hidden = ids.length > 0;
  const liked = likedIndices();
  // Solo se arma la lista si la página está abierta (o se va a abrir): no hay que pintar 200 filas a ciegas.
  if (page === "likes") $("ls-row").replaceChildren(...liked.map((i) => songButton(queue[i], i)));
  $("ls-row").hidden = !liked.length;
  $("as-row").replaceChildren(...catalogAlbums().slice(0, 12).map((al) => albumCard(al.id)));
  $("ls-actions").hidden = !liked.length || $("liked-songs").hidden;
  $("ls-empty").hidden = liked.length > 0;
  const nS = liked.length, nA = ids.length;
  $("lp-n-songs").textContent = nS || "";
  $("lp-n-albums").textContent = nA || "";
  $("lp-meta").textContent = `${nS} ${nS === 1 ? "canción" : "canciones"} · ${nA} ${nA === 1 ? "álbum" : "álbumes"}`;
  markCurrent();
}
function bindCollections() {
  $("ls-play").onclick = () => playLiked(false);
  $("ls-shuffle").onclick = () => playLiked(true);
  const showAllAlbums = () => { closeLikes(); exploreAll = false; listFilter = "all"; setExploreType("albums"); requestAnimationFrame(() => $("explore-results").scrollIntoView({ block: "start", behavior: "smooth" })); };
  $("ma-explore").onclick = showAllAlbums;
  $("as-all").onclick = showAllAlbums;
  $("type-songs").onclick = () => setExploreType("songs");
  $("type-albums").onclick = () => setExploreType("albums");
  $("er-clear").onclick = clearExplore;
}
/** Quita filtro, búsqueda, vista de álbumes y «ver todos» (chip «✕ Limpiar» al inicio de los filtros). */
function clearExplore() {
  exploreAll = false;
  listFilter = "all";
  exploreType = "songs";
  $("type-songs").setAttribute("aria-pressed", "true");
  $("type-albums").setAttribute("aria-pressed", "false");
  searchQuery = "";
  $("search-explore").value = "";
  renderFilters();
  applySearch();
  syncRoute();
  $("search-explore").focus();
}
/** El chip «✕ Limpiar» va primero en la fila de filtros, solo cuando hay algo que limpiar. */
function syncClearChip() {
  const active = listFilter !== "all" || Boolean(searchQuery.trim()); // Álbumes o "ver todo" son vistas, no filtros
  document.querySelectorAll("[data-filters]").forEach((box) => {
    let c = box.querySelector(".filter-chip.clear");
    if (active && !c) {
      c = document.createElement("button");
      c.type = "button";
      c.className = "filter-chip clear";
      c.textContent = "✕ Limpiar";
      c.setAttribute("aria-label", "Limpiar filtros y búsqueda");
      c.onclick = clearExplore;
      box.prepend(c);
    } else if (!active && c) c.remove();
  });
}

// ---------- Biblioteca (columna izquierda) ----------
const RAIL_KEY = "pws.rail.v1";
function railPreferred() {
  const saved = store.get(RAIL_KEY, null);
  return typeof saved === "boolean" ? saved : true; // compacta por defecto: se amplía al pasar el mouse
}
function applyRail(on) {
  app.classList.toggle("rail", on && wide()); // el cajón de tablet siempre va con etiquetas
  requestAnimationFrame(syncSideButton);
  $("side-rail").setAttribute("aria-pressed", String(on));
  $("side-rail").setAttribute("aria-label", "Biblioteca compacta");
  $("side-rail").dataset.tip = on ? "Expandir" : "Contraer";
}
function libItem(index, { sub = "", actions = false } = {}) {
  const { album, song } = queue[index];
  const li = document.createElement("li");
  const b = document.createElement("button");
  b.type = "button";
  b.className = "lib-row";
  b.dataset.index = index;
  b.setAttribute("aria-label", `Reproducir ${songLabel(queue[index])}`);
  const th = document.createElement("span");
  th.className = "thumb";
  bgThumb(th, song.yt);
  const t = document.createElement("span");
  t.className = "lib-row-text";
  const a = document.createElement("span");
  a.className = "s-title";
  a.textContent = song.title;
  const m = document.createElement("span");
  m.className = "s-meta";
  m.textContent = sub || soloArtist(queue[index]) || album.title;
  t.append(a, m);
  b.append(th, t);
  b.onclick = () => { fanchant?.stop(); playIndex(index); };
  li.append(b);
  if (actions) {
    li.className = "lib-li";
    const like = document.createElement("button");
    like.type = "button";
    like.className = "like-btn lib-like";
    like.dataset.song = song.id;
    like.setAttribute("aria-pressed", String(favorites.has(song.id)));
    like.setAttribute("aria-label", `Me gusta: ${song.title}`);
    // Sin ícono propio: el corazón lo dibuja el estilo de .like-btn (con un ícono extra se veían dos).
    like.onclick = (e) => { e.stopPropagation(); toggleLike(song, like); };
    li.append(like, moreButton(index, song.title));
  }
  return li;
}
function renderLibrary() {
  $("lib-n-likes").textContent = favorites.count() + savedAlbums.length; // canciones + álbumes
  $("lib-n-cola").textContent = pq ? pq.userQueue.length + pq.context.length : 0;
  // Tus álbumes: puntos con la paleta como portada.
  const albums = savedAlbums.slice().reverse().map((id) => queue.find((q) => q.album.id === id)?.album).filter(Boolean).slice(0, 8);
  $("lib-albums").replaceChildren(...albums.map((al) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "lib-row lib-album";
    b.setAttribute("aria-label", `Abrir ${al.title}`);
    b.dataset.tip = al.title;
    const dots = document.createElement("span");
    dots.className = "lib-dots";
    al.palette.slice(0, 3).forEach((c, k) => dots.style.setProperty(`--p${k + 1}`, c));
    const t = document.createElement("span");
    t.className = "lib-row-text";
    const n = document.createElement("span");
    n.className = "s-title";
    n.textContent = al.title;
    const y = document.createElement("span");
    y.className = "s-meta";
    y.textContent = [al.year, al.artist && al.artist !== "BTS" ? al.artist : ""].filter(Boolean).join(" · ");
    t.append(n, y);
    b.append(dots, t);
    b.onclick = () => openAlbum(al.id);
    li.append(b);
    return li;
  }));
  $("lib-albums-empty").hidden = albums.length > 0;
  const recent = playedHistory.slice(-6).reverse().filter((id) => id !== queue[current]?.song.id).slice(0, 5).map(idxOf).filter((i) => i >= 0);
  $("lib-recent").replaceChildren(...recent.map((i) => libItem(i, { actions: true })));
  $("lib-recent-empty").hidden = recent.length > 0;
}
// Páginas propias dentro de Explorar (como en las apps de música): Me gusta y Mis videos.
const PAGES = { likes: { el: "likes-page", title: "lp-title", hash: "#me-gusta" }, videos: { el: "videos-page", title: "vp-title", hash: "#mis-videos" } };
function openPage(name, { focus = true } = {}) {
  page = name;
  // Directo (sin "tocar" la pestaña Explorar, que desde una página significa volver al inicio).
  if (view !== "explore") { selectViewTab("view-explore"); switchView("explore"); } else setView("explore");
  $(PAGES[name].el).scrollTop = 0;
  if (focus) requestAnimationFrame(() => { const h = $(PAGES[name].title); h.tabIndex = -1; h.focus({ preventScroll: true }); });
}
/** Me gusta como página propia. `tab`: "songs" o "albums". */
function openLikes(tab = "songs", opts) {
  setLikesTab(tab);
  openPage("likes", opts);
  renderCollections();
}
function openVideos(opts) {
  renderMine();
  openPage("videos", opts);
}
/** Vuelve al inicio de Explorar desde Me gusta o Mis videos. */
function closeLikes() {
  if (page === "home") return;
  page = "home";
  setView(view);
}
/** La biblioteca marca la página abierta. */
function syncPageItems() {
  const open = view === "explore" || current < 0 ? page : "";
  for (const b of document.querySelectorAll(".lib-item[data-go]")) {
    const on = (b.dataset.go === "likes" && open === "likes") || (b.dataset.go === "mine" && open === "videos");
    if (b.dataset.go === "likes" || b.dataset.go === "mine") { b.classList.toggle("is-on", on); if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); }
  }
}
function setLikesTab(tab) {
  const songs = tab !== "albums";
  $("lp-songs").setAttribute("aria-pressed", String(songs));
  $("lp-albums").setAttribute("aria-pressed", String(!songs));
  $("liked-songs").hidden = !songs;
  $("my-albums").hidden = songs;
  $("ls-actions").hidden = !songs || !favorites.count();
}
/** La tarjetita de la leyenda se cierra al tocar fuera o con Escape. */
function bindLegend() {
  const d = $("ll-pop");
  document.addEventListener("pointerdown", (e) => { if (d.open && !d.contains(e.target)) d.open = false; });
  d.addEventListener("keydown", (e) => { if (e.key === "Escape" && d.open) { d.open = false; d.querySelector("summary").focus(); } });
}
/** Diagnóstico de compatibilidad (panel Bluetooth): para probar el sitio en cada navegador. */
async function renderBtDiag() {
  const b = browserInfo(), sup = bluetoothSupport();
  let avail = "—";
  if ("bluetooth" in navigator && navigator.bluetooth.getAvailability) {
    try { avail = (await navigator.bluetooth.getAvailability()) ? "Sí" : "No (apagado o sin adaptador)"; } catch { avail = "No se pudo saber"; }
  }
  const rows = [
    ["Navegador", b.name], ["Sistema", b.ios ? "iPhone / iPad" : b.android ? "Android" : "Computadora"],
    ["Bluetooth web", "bluetooth" in navigator ? "Disponible" : "No disponible"], ["Página segura (HTTPS)", window.isSecureContext ? "Sí" : "No"],
    ["Bluetooth del equipo", avail], ["Dentro de una app", inAppBrowser() ? "Sí" : "No"],
    ...(lastBtError ? [["Último error", lastBtError.detail]] : []),
  ];
  $("bt-diag-list").replaceChildren(...rows.flatMap(([k, v]) => { const dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = k; dd.textContent = v; return [dt, dd]; }));
  $("bt-diag-verdict").textContent = inAppBrowser() ? "Ábrela en Chrome: dentro de las apps no hay Bluetooth."
    : !sup.ok ? (b.ios ? "En iPhone, usa la app Bluefy." : "Este navegador no puede conectar: usa Chrome o Edge.")
    : isBrave() ? "Brave: activa el Bluetooth web (ver arriba) y listo."
    : b.flaky ? "Puede fallar en este navegador. Si la lista no se abre, usa Chrome."
    : "Todo listo para conectar.";
}
function bindLikesPage() {
  $("bt-diag").addEventListener("toggle", (e) => { if (e.target.open) renderBtDiag(); });
  bindLegend();
  // El logo lleva a Explorar dentro del reproductor (sin recargar ni cortar lo que suena).
  for (const a of document.querySelectorAll(".m-brand")) a.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return; // nueva pestaña: como un enlace normal
    e.preventDefault();
    closeLikes();
    if (view !== "explore") { selectViewTab("view-explore"); switchView("explore"); }
    requestAnimationFrame(() => { $("home").scrollTo({ top: 0, behavior: "smooth" }); $("search-explore").focus({ preventScroll: true }); });
  });
  $("lp-back").onclick = () => closeLikes();
  $("vp-back").onclick = () => closeLikes();
  $("lp-songs").onclick = () => setLikesTab("songs");
  $("lp-albums").onclick = () => setLikesTab("albums");
  $("ls-explore").onclick = () => { closeLikes(); requestAnimationFrame(() => $("search-explore").focus()); };
  // Atrás / adelante del navegador: la pantalla se rearma desde la dirección.
  addEventListener("popstate", () => applyRoute(slugFromPath(), { fromHistory: true }));
}

/** Acciones de la biblioteca (también los accesos de Explorar en teléfono). */
function goLibrary(where, trigger) {
  const toExplore = (then) => { closeLikes(); if (view !== "explore") $("view-explore").click(); requestAnimationFrame(then); };
  if (where === "explore") return toExplore(() => {});
  if (where === "search") return toExplore(() => $("search-explore").focus());
  // Me gusta es su propia página (canciones y álbumes); "albums" abre directo la pestaña de álbumes.
  if (where === "likes" || where === "albums") return openLikes(where === "albums" ? "albums" : "songs");
  if (where === "cola") return openSide("cola", trigger);
  if (where === "mine") { openVideos({ focus: false }); return requestAnimationFrame(() => $("inp-url").focus({ preventScroll: true })); }
  if (where === "concerts") { openVideos({ focus: false }); return requestAnimationFrame(() => $("rv-concerts").scrollIntoView({ block: "start", behavior: "smooth" })); }
}
function bindLibrary() {
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]");
    if (b) goLibrary(b.dataset.go, b);
  });
  applyRail(railPreferred());
  // Compacta: al pasar el mouse (con una pequeña espera, para no abrirse al cruzarla) o al entrar con Tab, se amplía.
  const side = $("side");
  let peekT = 0;
  const peek = (on) => { clearTimeout(peekT); side.classList.toggle("peek", on && app.classList.contains("rail")); };
  side.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") peekT = setTimeout(() => peek(true), 140); });
  side.addEventListener("pointerleave", () => peek(false));
  side.addEventListener("focusin", () => peek(true));
  side.addEventListener("focusout", (e) => { if (!side.contains(e.relatedTarget)) peek(false); });
  side.addEventListener("click", (e) => { if (e.target.closest("[data-go], a, .lib-li .song")) peek(false); });
  $("side-rail").onclick = () => { const on = !app.classList.contains("rail"); store.set(RAIL_KEY, on); applyRail(on); };
  addEventListener("resize", () => { if (typeof store.get(RAIL_KEY, null) !== "boolean") applyRail(true); });
  $("btn-feedback-2").onclick = (e) => showPanel("panel-feedback", e.currentTarget);
  const sponsor = DONATIONS.find((d) => d.url)?.url ?? PROJECT.repo;
  ["lib-support", "ex-support", "nudge-link"].forEach((id) => { const a = $(id); if (a) a.href = sponsor; });
  const nudgeClose = $("nudge-close"); // el aviso de apoyo se retiró: puede no existir
  if (nudgeClose) nudgeClose.onclick = () => fadeOut($("support-nudge"));
}

// ---------- Ahora suena (columna derecha ≥ 1280 px; hoja en pantallas chicas) ----------
const NP_KEY = "pws.np.v1";
const channelCache = new Map();
const npDocked = () => matchMedia("(min-width: 1280px)").matches;
let sideTab = "now"; // pestaña del panel lateral: "now" | "cola" (Mis videos es una página propia)
const SIDE_TABS = { now: "rs-now", cola: "rs-cola" };
const sideIsOpen = () => (npDocked() ? !$("np-side").hidden : openPanel === "np-side");
function setNpOpen(open, trigger = $("np-open")) {
  if (npDocked()) {
    $("np-side").hidden = !open;
    app.classList.toggle("with-np", open);
    store.set(NP_KEY, open);
  } else {
    app.classList.remove("with-np");
    if (open) { if (openPanel !== "np-side") showPanel("np-side", trigger); } else if (openPanel === "np-side") closePanel();
  }
  syncSideState();
  if (open) renderSideTab();
  requestAnimationFrame(() => placeMini(false));
}
/** Cambia de pestaña (sin abrir ni cerrar el panel). */
function setSideTab(tab, moveTabs = true) {
  sideTab = tab;
  if (moveTabs) for (const [k, id] of Object.entries(SIDE_TABS)) {
    const on = k === tab;
    $(id).setAttribute("aria-selected", String(on));
    $(id).tabIndex = on ? 0 : -1;
    $($(id).getAttribute("aria-controls")).hidden = !on;
  }
  syncSideState();
  renderSideTab();
}
function renderSideTab() {
  if (sideTab === "now") renderNowPanel();
  else if (sideTab === "cola") renderCola();
}
/** Abre el panel en una pestaña; `then` corre cuando ya está visible (foco, scroll). */
function openSide(tab, trigger, then) {
  setSideTab(tab);
  if (!sideIsOpen()) setNpOpen(true, trigger);
  requestAnimationFrame(() => {
    if (then) then();
    else if (npDocked() && trigger) $(SIDE_TABS[tab]).focus();
  });
}
/** Estado visible de los accesos: el que corresponde a la pestaña abierta se marca (biblioteca, pie de página). */
function syncSideState() {
  const open = sideIsOpen();
  $("np-open").setAttribute("aria-expanded", String(open && sideTab === "now"));
  $("btn-cola").setAttribute("aria-expanded", String(open && sideTab === "cola"));
  $("btn-cola").classList.toggle("on", open && sideTab === "cola");
  for (const b of document.querySelectorAll(".lib-item[data-go]")) {
    const tab = { cola: "cola" }[b.dataset.go];
    const on = Boolean(tab) && open && sideTab === tab;
    b.classList.toggle("is-on", on);
    if (tab) b.setAttribute("aria-expanded", String(on));
  }
}
function npList(listEl, indices, opts) {
  listEl.replaceChildren(...indices.map((i) => libItem(i, opts)));
  listEl.closest("section").hidden = !indices.length;
}
async function renderNowPanel() {
  if ($("np-side").hidden || sideTab !== "now") return;
  const item = queue[current];
  $("nps-empty").hidden = Boolean(item);
  $("nps-main").hidden = !item;
  if (!item) return;
  const { album, song } = item;
  const npsImg = $("nps-img");
  if (npsImg.getAttribute("src") !== thumbUrl(song.yt)) { npsImg.src = thumbUrl(song.yt); imgThumb(npsImg.parentElement, npsImg); }
  $("nps-title").textContent = song.title;
  const artist = album.id === "mine" ? song.channel ?? "Mis videos" : album.artist ?? "BTS";
  $("nps-artist").textContent = artist;
  $("nps-album-name").textContent = album.id === "mine" ? "Mis videos" : `${album.title}${album.year ? ` · ${album.year}` : ""}`;
  $("nps-album").disabled = album.id === "mine";
  $("nps-swatches").replaceChildren(...album.palette.slice(0, 3).map((c) => { const i = document.createElement("i"); i.style.background = c; return i; }));
  // Solo datos que tenemos: tipo de video, intensidad de luces y canal oficial.
  const chips = metaLine(item);
  chips.hidden = false;
  [...chips.querySelectorAll(".m-artist")].forEach((n) => n.remove());
  const type = videoType(song);
  if (type === "MV") { const mv = document.createElement("span"); mv.className = "chip-type"; mv.textContent = "MV"; chips.prepend(mv); }
  const lights = document.createElement("span");
  lights.className = "nps-lights";
  lights.append(lightGlyph(item), document.createTextNode(`Luces ${LIGHT_NAME[lightLevel(item)]}`));
  $("nps-chips").replaceChildren(chips, lights);
  const liked = favorites.has(song.id);
  $("nps-like").setAttribute("aria-pressed", liked);
  likeLabel(liked);
  const saved = savedAlbums.includes(album.id);
  $("nps-save").hidden = album.id === "mine";
  $("nps-save").setAttribute("aria-pressed", saved);
  $("nps-save").querySelector("span").textContent = saved ? "Álbum guardado" : "Guardar álbum";
  // Listas cortas: en cola, más del artista, del mismo álbum.
  const nextIdx = [...pq.userQueue, ...pq.context].slice(0, 3).map((e) => idxOf(e.id)).filter((i) => i >= 0);
  npList($("nps-next"), nextIdx);
  const me = album.artist ?? "BTS";
  $("nps-artist-t").textContent = album.id === "mine" ? "Más de Mis videos" : `Más de ${me}`;
  const byArtist = queue.map((q, i) => [q, i]).filter(([q, i]) => i !== current && q.album.id !== album.id && (q.album.artist ?? "BTS") === me && q.song.kind !== "concert" && videoType(q.song) === "MV").slice(-5).reverse().map(([, i]) => i);
  npList($("nps-artist-list"), album.id === "mine" ? [] : byArtist);
  const sameAlbum = queue.map((q, i) => [q, i]).filter(([q, i]) => i !== current && q.album.id === album.id).slice(0, 5).map(([, i]) => i);
  npList($("nps-album-list"), sameAlbum);
  // Canal oficial (oEmbed). Se cachea; si no responde, no se muestra nada.
  const ch = $("nps-channel");
  const link = `https://www.youtube.com/watch?v=${encodeURIComponent(videoFor(song))}`;
  const paint = (name) => {
    ch.replaceChildren();
    if (name) { const s = document.createElement("span"); s.textContent = `Canal: ${name} · `; ch.append(s); }
    const a = document.createElement("a");
    a.href = link;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "Ver en YouTube ↗";
    ch.append(a);
  };
  paint(channelCache.get(song.yt) ?? song.channel ?? "");
  if (!channelCache.has(song.yt) && !song.channel) {
    const meta = await fetchTitle(song.yt);
    channelCache.set(song.yt, meta?.channel ?? "");
    if (queue[current]?.song.yt === song.yt) paint(channelCache.get(song.yt));
  }
}
/** Alto real del pie de página: las columnas laterales terminan justo encima (cambia con el ancho y el idioma). */
function trackDockHeight() {
  const dock = document.querySelector(".dock");
  if (!dock || typeof ResizeObserver === "undefined") return;
  new ResizeObserver(([e]) => app.style.setProperty("--dock-real", `${Math.round(e.borderBoxSize?.[0]?.blockSize ?? dock.offsetHeight)}px`)).observe(dock);
}
function bindNowPanel() {
  trackDockHeight();
  $("np-open").onclick = (e) => {
    if (sideIsOpen() && sideTab === "now") return setNpOpen(false);
    openSide("now", e.currentTarget);
  };
  $("nps-close").onclick = () => setNpOpen(false);
  $("dock-like").onclick = (e) => { const song = queue[current]?.song; if (song) toggleLike(song, e.currentTarget); };
  $("dock-like-m").onclick = (e) => { const song = queue[current]?.song; if (song) toggleLike(song, e.currentTarget); };
  $("nps-like").onclick = (e) => { const song = queue[current]?.song; if (song) toggleLike(song, e.currentTarget); };
  $("nps-save").onclick = () => { const al = queue[current]?.album; if (al) toggleAlbum(al); };
  $("nps-album").onclick = () => { const al = queue[current]?.album; if (al && al.id !== "mine") openAlbum(al.id); };
  matchMedia("(min-width: 1280px)").addEventListener("change", () => {
    if (npDocked()) setNpOpen(store.get(NP_KEY, false));
    else { $("np-side").hidden = true; app.classList.remove("with-np"); syncSideState(); }
  });
  // En escritorio el panel se abre cuando hay algo sonando (vacío solo ocupaba un tercio de la pantalla); si la
  // persona lo cerró, se respeta.
  if (npDocked() && store.get(NP_KEY, true) && current >= 0) setNpOpen(true);
}

// ---------- Tema claro / oscuro ----------
const THEME_KEY = "pws.theme";
function currentTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch {}
  if (saved === "light" || saved === "dark") return saved;
  return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const next = theme === "light" ? "oscuro" : "claro";
  $("btn-theme").setAttribute("aria-label", `Cambiar a tema ${next}`);
  $("theme-icon").setAttribute("href", theme === "light" ? "#i-moon" : "#i-sun");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f4f0fb" : "#070a1a");
  crowd?.setTheme?.(theme);
}
function bindTheme() {
  applyTheme(currentTheme());
  $("btn-theme").onclick = () => {
    const t = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    try { localStorage.setItem(THEME_KEY, t); } catch {}
    applyTheme(t);
  };
  matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch {}
    if (!saved) applyTheme(currentTheme());
  });
}

// ---------- Rutas: cada pantalla, álbum y canción tiene su dirección (y atrás/adelante funcionan) ----------
// Todas en un solo nivel dentro de /player/, así las rutas relativas (../, ../assets/…) no cambian:
//   /player/                Explorar           /player/albums         Explorar en Álbumes
//   /player/album-<id>      un álbum           /player/likes          Me gusta
//   /player/my-videos       Mis videos         /player/lights         Luces
//   /player/<canción>       el video de esa canción
// Cambiar de pantalla agrega una entrada al historial; cambiar de canción en el video solo actualiza la dirección.
const playerBase = () => location.pathname.replace(/[^/]*$/, "");
const SCREENS = new Set(["albums", "likes", "my-videos", "lights"]);
// Direcciones viejas (en español o con #): siguen funcionando y pasan a la nueva.
const LEGACY_SLUGS = { albumes: "albums", "me-gusta": "likes", "mis-videos": "my-videos", luces: "lights" };
let routing = false, routeReady = false;
const slugFromPath = () => {
  const m = location.pathname.match(/\/player\/([a-z0-9-]{1,90})$/);
  return m ? LEGACY_SLUGS[m[1]] ?? m[1] : "";
};
const isSongSlug = (slug) => Boolean(slug) && !SCREENS.has(slug) && !slug.startsWith("album-");
/** La dirección de lo que se ve ahora. */
function currentSlug() {
  if (view === "lights") return "lights";
  if (view === "video" && current >= 0) return queue[current].album.id === "mine" ? "" : queue[current].song.id;
  if (page === "likes") return "likes";
  if (page === "videos") return "my-videos";
  if (listFilter.startsWith("album:")) return `album-${listFilter.slice(6)}`;
  if (exploreType === "albums") return "albums";
  return "";
}
function syncRoute() {
  if (routing || !routeReady) return;
  const slug = currentSlug(), next = playerBase() + slug;
  if (location.pathname === next && !location.search) return;
  const prev = slugFromPath();
  const replace = isSongSlug(prev) && isSongSlug(slug); // otra canción en el mismo video: no es navegar
  try { history[replace ? "replaceState" : "pushState"]({ r: slug }, "", next); } catch {}
  document.title = routeTitle(slug);
}
function routeTitle(slug) {
  const item = queue[current];
  if (isSongSlug(slug) && item) return `${item.song.title} · LumiParty`;
  const names = { albums: "Álbumes", likes: "Me gusta", "my-videos": "Mis videos", lights: "Luces" };
  if (slug.startsWith("album-")) { const al = queue.find((q) => q.album.id === slug.slice(6))?.album; return `${al?.title ?? t("Álbum")} · LumiParty`; }
  return names[slug] ? `${t(names[slug])} · LumiParty` : item ? `${item.song.title} · LumiParty` : "LumiParty";
}
/** Arma la pantalla de una dirección (al entrar, o con atrás/adelante). */
function applyRoute(slug, { fromHistory = false } = {}) {
  routing = true;
  try {
    const toExplore = () => { if (view !== "explore") { selectViewTab("view-explore"); switchView("explore"); } };
    if (slug === "likes") openLikes("songs", { focus: !fromHistory });
    else if (slug === "my-videos") openVideos({ focus: false });
    else if (slug === "lights") { closeLikes(); selectViewTab("view-lights"); switchView("lights"); }
    else if (slug === "albums") { closeLikes(); toExplore(); if (listFilter.startsWith("album:")) listFilter = "all"; setExploreType("albums"); }
    else if (slug.startsWith("album-") && queue.some((q) => q.album.id === slug.slice(6))) { closeLikes(); openAlbum(slug.slice(6)); }
    else if (isSongSlug(slug) && queue.some((q) => q.song.id === slug)) {
      closeLikes();
      const idx = queue.findIndex((q) => q.song.id === slug);
      if (queue[current]?.song.id !== slug) playIndex(idx);
      selectViewTab("view-video");
      switchView("video");
    } else {
      closeLikes();
      toExplore();
      if (exploreType === "albums" || listFilter.startsWith("album:")) setExploreType("songs");
    }
  } finally {
    routing = false;
  }
  // Si la dirección no existe (o cambió al armarla), queda la que corresponde, sin apilar historial.
  const want = playerBase() + currentSlug();
  if (location.pathname !== want || location.search) { try { history.replaceState({ r: currentSlug() }, "", want); } catch {} }
  document.title = routeTitle(currentSlug());
}

/** Los contadores de la biblioteca en 0 no se muestran (ni en la barra compacta). */
function watchZeroBadges() {
  for (const b of document.querySelectorAll(".lib-n")) {
    const sync = () => b.classList.toggle("zero", b.textContent.trim() === "0" || !b.textContent.trim());
    sync();
    new MutationObserver(sync).observe(b, { childList: true, characterData: true, subtree: true });
  }
}

// ---------- Vista Luces: bola o ARMY Bomb 3D ----------
let stick3d = null;
/** Versión a mostrar: la que eligió la persona, o la del ARMY Bomb conectado, o Ver. 4. */
function stickVersion() {
  if (settings.stickVer) return settings.stickVer;
  const fam = sticks[0]?.family, name = sticks[0]?.name ?? "";
  return fam === "v4" ? "v4" : /LIGHTSTICK3/.test(name) ? "v3" : fam === "se" ? "se" : "v4";
}
async function setLightsModel(mode, { save = true } = {}) {
  const model = mode === "stick";
  if (save) { settings.lightsModel = model ? "stick" : "orb"; saveSettings(); }
  $("lv-orb").setAttribute("aria-pressed", String(!model));
  $("lv-stick").setAttribute("aria-pressed", String(model));
  $("lights-view").classList.toggle("model", model);
  $("stick3d").hidden = !model;
  $("lv-vers").hidden = !model;
  $("lv-note").hidden = !model;
  $("lv-hint").textContent = t(model ? "Sostenlo y agítalo · también con el teléfono" : "Sin ARMY Bomb, tu pantalla brilla. Sube el brillo.");
  if (model && !stick3d) {
    try {
      const { createStick3D } = await import("./stick3d.js");
      stick3d = createStick3D($("stick3d"), { reduceMotion: matchMedia("(prefers-reduced-motion: reduce)").matches });
    } catch {
      toast("No se pudo mostrar el ARMY Bomb 3D en este dispositivo.");
      return setLightsModel("orb");
    }
  }
  if (model) { stick3d.setVersion(stickVersion()); syncVersionButtons(); }
  stick3d?.setActive(model && view === "lights");
}
function syncVersionButtons() {
  const v = stickVersion();
  for (const b of $("lv-vers").querySelectorAll("[data-ver]")) b.setAttribute("aria-pressed", String(b.dataset.ver === v));
}
function bindLightsView() {
  $("lv-orb").onclick = () => setLightsModel("orb");
  $("lv-stick").onclick = () => setLightsModel("stick");
  $("lv-vers").addEventListener("click", (e) => {
    const b = e.target.closest("[data-ver]");
    if (!b) return;
    settings.stickVer = b.dataset.ver;
    saveSettings();
    syncVersionButtons();
    stick3d?.setVersion(b.dataset.ver);
  });
  if (settings.lightsModel === "stick") setLightsModel("stick", { save: false });
}

// ---------- Pedir la opinión en un buen momento ----------
// Nunca en medio de una canción ni al entrar: justo cuando empieza la siguiente tras haber terminado (de verdad)
// 3 canciones en la sesión, o 1 con el ARMY Bomb conectado. Como mucho una vez cada 30 días; tras enviar una
// opinión o cerrar el aviso dos veces, no se vuelve a pedir.
const FB_ASK_KEY = "pws.fbask.v1";
let songsFinished = 0, askFeedbackNext = false, fbShownThisSession = false;
function feedbackAskAllowed() {
  const st = store.get(FB_ASK_KEY, {});
  if (st.sent || (st.dismissed ?? 0) >= 2) return false;
  return !st.at || Date.now() - st.at > 30 * 864e5;
}
function noteSongFinished() {
  songsFinished++;
  if (!fbShownThisSession && (songsFinished >= 3 || (sticks.length && songsFinished >= 1)) && feedbackAskAllowed()) askFeedbackNext = true;
}
function maybeAskFeedback() {
  if (!askFeedbackNext) return;
  askFeedbackNext = false;
  // Unos segundos después de que arranca la canción (y el fanchant terminó): sin tapar nada.
  setTimeout(() => {
    if (document.hidden || openPanel || fanchant?.running || $("support-nudge")?.hidden === false) { askFeedbackNext = true; return; }
    fbShownThisSession = true;
    store.set(FB_ASK_KEY, { ...store.get(FB_ASK_KEY, {}), at: Date.now() });
    const n = $("fb-nudge");
    fadeIn(n);
    const hide = () => (n.matches(":hover, :focus-within") ? setTimeout(hide, 1500) : fadeOut(n, 320));
    setTimeout(hide, 12000);
  }, 5000);
}
function bindFeedbackNudge(openWithRating) {
  const n = $("fb-nudge");
  n.querySelector(".fbn-stars").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-r]");
    if (!b) return;
    fadeOut(n, 200);
    openWithRating(Number(b.dataset.r), b);
  });
  $("fbn-close").onclick = () => {
    const st = store.get(FB_ASK_KEY, {});
    store.set(FB_ASK_KEY, { ...st, dismissed: (st.dismissed ?? 0) + 1 });
    fadeOut(n);
  };
}

// ---------- Apoyo ----------
// Retirado (2026-11-05): ya no se pide apoyo al terminar canciones. Se deja vacío para no tocar a quien la llama.
function maybeNudgeSupport() {}

// ---------- Menús compactos (Concierto) ----------
function closeMenus(except) {
  document.querySelectorAll(".menu-pop").forEach((m) => {
    if (m === except || m.hidden || !m.dataset.menuFor) return;
    m.hidden = true;
    $(m.dataset.menuFor).setAttribute("aria-expanded", "false");
  });
}
function bindMenus() {
  document.querySelectorAll(".menu-pop[data-menu-for]").forEach((menu) => {
    const btn = $(menu.dataset.menuFor);
    btn.onclick = () => {
      const open = menu.hidden;
      closeMenus(menu);
      if (open) closePanel(false);
      menu.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      if (!open) return;
      // Se alinea con su botón, sin salirse de la pantalla.
      const r = btn.getBoundingClientRect();
      const w = menu.offsetWidth;
      const left = Math.min(innerWidth - w - 12, Math.max(12, r.left + r.width / 2 - w / 2));
      menu.style.left = `${left}px`;
      menu.style.bottom = `${innerHeight - r.top + 10}px`;
      menu.querySelector("button")?.focus();
    };
    menu.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.stopPropagation(); closeMenus(); btn.focus(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = [...menu.querySelectorAll("button")];
        const i = items.indexOf(document.activeElement);
        items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
      }
    });
    // Elegir una opción cierra el menú (los toggles muestran su estado en el botón del dock).
    menu.addEventListener("click", (e) => { if (e.target.closest("button")) setTimeout(() => closeMenus(), 0); });
  });
  document.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".menu-pop") || e.target.closest("[aria-controls^='menu-']")) return;
    closeMenus();
  });
  addEventListener("resize", () => closeMenus());
}
/** El botón "Concierto" se marca si la cámara o el micrófono están activos. */
function syncLiveButton() {
  const on = Boolean(cam || mic);
  $("btn-live").classList.toggle("on", on);
  // En el teléfono dice solo «Concierto» (con «Modo» no cabía); en pantallas anchas, «Modo concierto».
  const lbl = $("btn-live").querySelector(".lv-label");
  lbl.querySelector(".lv-long").textContent = cam ? "En el estadio" : mic ? "Con micrófono" : "Modo concierto";
  lbl.querySelector(".lv-short").textContent = cam ? "Estadio" : mic ? "Micrófono" : "Concierto";
}

// ---------- Cola tipo Spotify (modelo en src/queue.js) ----------
const QUEUE_KEY = "pws.queue.v1";
const idxOf = (id) => queue.findIndex((q) => q.song.id === id);
let pq = null;
let resumeAt = 0;

/** Qué sigue cuando se acaba el contexto: el álbum (según el ajuste) o sugerencias parecidas. */
function contextEnd(q, { auto }) {
  const cur = idxOf(q.nowPlaying);
  if (cur < 0) return null;
  const album = queue[cur].album;
  if (q.contextKind === "album") {
    if (auto && settings.albumEnd === "stop") return null;
    const ids = (a) => queue.filter((x) => x.album.id === a.id).map((x) => x.song.id);
    if (settings.albumEnd === "repeat") return { ids: ids(album), label: album.title, kind: "album" };
    const last = queue.findLastIndex((x) => x.album.id === album.id);
    const nextAlbum = (queue[last + 1] ?? queue[0]).album;
    return { ids: ids(nextAlbum), label: nextAlbum.title, kind: "album" };
  }
  const recent = new Set([...q.history.slice(-30), ...played]);
  const s = upNext(queue, cur, { played: recent, likes: favorites.list(), n: 10 }).map((i) => queue[i].song.id);
  return s.length ? { ids: s, label: "Sugerencias para ti", kind: "auto" } : null;
}
function saveQueue() {
  if (!pq) return;
  store.set(QUEUE_KEY, { ...pq.toJSON(), pos: Math.floor(player?.time?.() || 0) });
}
/** Cualquier cambio en la cola: guardar y repintar lo que la muestra. */
function queueChanged() {
  saveQueue();
  renderUpNext();
  renderLibrary();
  renderNowPanel();
  if (!$("np-side").hidden && sideTab === "cola") renderCola();
  syncModes();
}
function albumContext(i) {
  const { album } = queue[i];
  const ids = queue.filter((x) => x.album.id === album.id).map((x) => x.song.id);
  const k = ids.indexOf(queue[i].song.id);
  return { context: ids.slice(k + 1), source: ids, label: album.title, kind: "album" };
}
const FILTER_NAMES = { all: "Todas las canciones", likes: "Me gusta", mine: "Mis videos" };
/** Contexto desde una lista: si hay filtro o búsqueda, lo que se ve; si no, el resto del álbum. */
function contextFromRow(btn, i) {
  if (btn.closest("#ls-row")) {
    const ids = likedIndices().map((k) => queue[k].song.id);
    const k = ids.indexOf(queue[i].song.id);
    return { context: ids.slice(k + 1), source: ids, label: "Canciones que me gustan", kind: "list" };
  }
  const list = btn.closest(".albums");
  if (list && (listFilter !== "all" || searchQuery.trim())) {
    const rows = [...list.children].filter((el) => el.classList.contains("song-row") && !el.hidden);
    const ids = rows.map((r) => queue[Number(r.dataset.index)].song.id);
    const k = ids.indexOf(queue[i].song.id);
    const label = searchQuery.trim() ? `Búsqueda "${searchQuery.trim()}"` : FILTER_NAMES[listFilter] ?? listFilter;
    return { context: ids.slice(k + 1), source: ids, label, kind: "list" };
  }
  return albumContext(i);
}
/** Empieza una canción con su contexto (por defecto, el resto del álbum). */
function playIndex(i, ctx) {
  if (i < 0 || i >= queue.length) return;
  track("reproducir", { cancion: queue[i].album.id === "mine" ? "video_propio" : queue[i].song.id });
  pq.start(queue[i].song.id, ctx ?? albumContext(i));
  loadIndex(i);
  queueChanged();
}
function next(fromEnd = false) {
  if (current < 0) return togglePlay();
  const id = pq.next({ auto: fromEnd });
  if (!id) return;
  loadIndex(idxOf(id));
  queueChanged();
}
/** ¿Habrá otra canción después de esta según los ajustes? */
function willContinue() {
  return current >= 0 && pq.peek({ auto: true }) !== null;
}
function prev() {
  const r = pq.prev(player.time());
  if (r === "restart") return player.seek(0);
  if (r) { loadIndex(idxOf(r)); queueChanged(); }
}
function jumpTo(uid) {
  const id = pq.jump(uid);
  if (!id) return;
  fanchant?.stop();
  loadIndex(idxOf(id));
  queueChanged();
}

/** Aviso con un botón (p. ej. "Deshacer"). */
/** Aviso con acción (Deshacer, Mostrar…): dura al menos 10 s y no se cierra mientras el puntero o el foco estén dentro. */
function toastAction(msg, label, fn, ms = 6000) {
  const el = $("toast");
  el.replaceChildren(document.createTextNode(msg));
  const b = document.createElement("button");
  b.type = "button";
  b.className = "toast-action";
  b.textContent = label;
  b.onclick = () => { fadeOut(el); fn(); };
  el.append(b);
  fadeIn(el);
  dodgeVideo(el);
  say(msg);
  const hide = () => { if (!el.matches(":hover, :focus-within")) fadeOut(el); else toast.timer = setTimeout(hide, 1500); };
  clearTimeout(toast.timer);
  toast.timer = setTimeout(hide, Math.max(6000, ms));
}
function queuePlayNext(i) {
  const e = pq.playNext(queue[i].song.id);
  queueChanged();
  toastAction("Se reproducirá a continuación", "Deshacer", () => { pq.remove(e.uid); queueChanged(); });
}
function queueAdd(i) {
  const e = pq.add(queue[i].song.id);
  queueChanged();
  toastAction("Agregada a la cola", "Deshacer", () => { pq.remove(e.uid); queueChanged(); });
}

// Aleatorio y repetir (dock en escritorio; panel Cola en teléfono)
const REPEAT_LABEL = { off: "Repetir: no", all: "Repetir: todo", one: "Repetir: una" };
function syncModes() {
  if (!pq) return;
  for (const id of ["btn-shuffle", "cq-shuffle"]) {
    $(id).setAttribute("aria-pressed", pq.shuffle);
    $(id).setAttribute("aria-label", "Aleatorio");
  }
  for (const id of ["btn-repeat", "cq-repeat"]) {
    const b = $(id);
    b.removeAttribute("aria-pressed"); // tres estados: el nombre los dice
    b.setAttribute("aria-label", REPEAT_LABEL[pq.repeat]);
    b.dataset.tip = REPEAT_LABEL[pq.repeat];
    b.querySelector("use").setAttribute("href", pq.repeat === "one" ? "#i-repeat-one" : "#i-repeat");
  }
}
function bindModes() {
  const shuffle = () => { pq.setShuffle(!pq.shuffle); queueChanged(); toast(pq.shuffle ? "Aleatorio activado" : "Orden original", 2000); };
  const repeat = () => { pq.cycleRepeat(); queueChanged(); toast(REPEAT_LABEL[pq.repeat], 2000); };
  $("btn-shuffle").onclick = shuffle;
  $("cq-shuffle").onclick = shuffle;
  $("btn-repeat").onclick = repeat;
  $("cq-repeat").onclick = repeat;
  // Como en las apps de música: el botón de cola abre/cierra la pestaña Cola del panel lateral.
  $("btn-cola").onclick = (e) => (sideIsOpen() && sideTab === "cola" ? setNpOpen(false) : openSide("cola", e.currentTarget));
  $("cq-clear").onclick = () => {
    const old = pq.clearUserQueue();
    queueChanged();
    if (old.length) toastAction("Cola borrada", "Deshacer", () => { pq.userQueue = [...old, ...pq.userQueue]; queueChanged(); });
  };
}

/** Restaura la cola guardada: la canción queda lista, en pausa, en el mismo punto. */
function restoreQueue() {
  const saved = store.get(QUEUE_KEY, null);
  pq = PlayQueue.from(saved, { onContextEnd: contextEnd, valid: (id) => idxOf(id) >= 0 });
  syncModes();
  const i = idxOf(pq.nowPlaying);
  if (i < 0) return false;
  resumeAt = Math.max(0, Number(saved?.pos) || 0);
  loadIndex(i, { autoplay: false });
  renderUpNext();
  toast("Tu cola sigue aquí. Dale play para seguir.", 3500);
  return true;
}

// ---------- Panel Cola ----------
const COLA_MAX = 60;
function colaItem(e, list) {
  const i = idxOf(e.id);
  const item = queue[i];
  const li = document.createElement("li");
  li.className = "cq-item";
  li.dataset.uid = e.uid;
  li.dataset.list = list;
  li.tabIndex = -1;
  const h = document.createElement("button");
  h.type = "button";
  h.className = "cq-handle";
  h.setAttribute("aria-label", `Mover ${item.song.title}`);
  h.setAttribute("aria-describedby", "cq-help");
  h.innerHTML = `<svg aria-hidden="true"><use href="#i-grip"/></svg>`;
  const main = document.createElement("button");
  main.type = "button";
  main.className = "cq-main";
  main.setAttribute("aria-label", `Reproducir ${songLabel(item)}`);
  const th = document.createElement("span");
  th.className = "thumb";
  bgThumb(th, item.song.yt);
  const text = document.createElement("span");
  text.className = "s-text";
  const t = document.createElement("span");
  t.className = "s-title";
  t.textContent = item.song.title;
  text.append(t, metaLine(item, { fallback: item.album.title }));
  main.append(th, text);
  main.onclick = () => { if (!li.dataset.swiped) jumpTo(e.uid); };
  const x = document.createElement("button");
  x.type = "button";
  x.className = "ibtn sm cq-remove";
  x.setAttribute("aria-label", `Quitar ${item.song.title} de la cola`);
  x.innerHTML = `<svg aria-hidden="true"><use href="#i-close"/></svg>`;
  x.onclick = () => removeFromCola(e.uid);
  li.append(h, main, x);
  return li;
}
function renderCola() {
  const cur = queue[idxOf(pq.nowPlaying)];
  const now = $("cq-now");
  now.replaceChildren();
  if (cur) {
    const row = document.createElement("div");
    row.className = "cq-nowrow";
    const th = document.createElement("span");
    th.className = "thumb";
    bgThumb(th, cur.song.yt);
    const text = document.createElement("span");
    text.className = "s-text";
    const t = document.createElement("span");
    t.className = "s-title";
    t.textContent = cur.song.title;
    text.append(t, metaLine(cur, { fallback: cur.album.title }));
    row.append(th, text, lightGlyph(cur));
    now.append(row);
  } else now.textContent = "Nada sonando aún";
  $("cq-user").replaceChildren(...pq.userQueue.map((e) => colaItem(e, "userQueue")));
  $("cq-user-sec").classList.toggle("is-empty", !pq.userQueue.length);
  $("cq-clear").hidden = !pq.userQueue.length;
  const ctx = pq.context.slice(0, COLA_MAX);
  $("cq-ctx").replaceChildren(...ctx.map((e) => colaItem(e, "context")));
  $("cq-ctx-title").textContent = pq.contextLabel ? `A continuación de: ${pq.contextLabel}` : "A continuación";
  $("cq-more").hidden = pq.context.length <= COLA_MAX;
  $("cq-more").textContent = `y ${pq.context.length - COLA_MAX} más`;
}
function announce(msg) { $("cq-live").textContent = msg; }
function removeFromCola(uid) {
  const r = pq.remove(uid);
  if (!r) return;
  queueChanged();
  const title = queue[idxOf(r.entry.id)]?.song.title ?? "";
  announce(`${title} quitada de la cola`);
  toastAction("Quitada de la cola", "Deshacer", () => { pq[r.list].splice(r.index, 0, r.entry); queueChanged(); });
}
/** Mueve con el teclado (Alt+↑/↓ o ↑/↓ sobre el asa), cruzando entre tu cola y el contexto. */
function moveByKey(uid, dir) {
  const f = pq.find(uid);
  if (!f) return;
  let list = f.list, index = f.index + dir;
  if (list === "userQueue" && index >= pq.userQueue.length) { list = "context"; index = 0; }
  else if (list === "context" && index < 0) { list = "userQueue"; index = pq.userQueue.length; }
  if (index < 0 || (list === "context" && index > pq.context.length - 1 && f.list === "context")) return;
  pq.move(uid, list, index);
  queueChanged();
  renderCola();
  $("cola-body").querySelector(`[data-uid="${uid}"] .cq-handle`)?.focus();
  const f2 = pq.find(uid);
  const title = queue[idxOf(pq[f2.list][f2.index].id)].song.title;
  announce(`${title}: posición ${f2.index + 1} de ${f2.list === "userQueue" ? "tu cola" : "la lista"}`);
}
function bindCola() {
  const body = $("cola-body");
  body.addEventListener("keydown", (e) => {
    const li = e.target.closest(".cq-item");
    if (!li) return;
    const uid = Number(li.dataset.uid);
    const onHandle = e.target.classList.contains("cq-handle");
    if ((e.altKey || onHandle) && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); moveByKey(uid, e.key === "ArrowUp" ? -1 : 1); }
    if (e.key === "Delete") { e.preventDefault(); removeFromCola(uid); }
  });
  // Arrastrar y soltar con el asa (mouse, lápiz o dedo), con desplazamiento automático.
  body.addEventListener("pointerdown", (e) => {
    const handle = e.target.closest(".cq-handle");
    if (!handle) return;
    e.preventDefault();
    const li = handle.closest(".cq-item");
    const uid = Number(li.dataset.uid);
    const r = li.getBoundingClientRect();
    const ghost = li.cloneNode(true);
    ghost.classList.add("cq-ghost");
    Object.assign(ghost.style, { width: `${r.width}px`, left: `${r.left}px`, top: `${r.top}px` });
    document.body.append(ghost);
    li.classList.add("dragging");
    const drop = document.createElement("li");
    drop.className = "cq-drop";
    drop.setAttribute("aria-hidden", "true");
    li.after(drop);
    const offY = e.clientY - r.top;
    let y = e.clientY;
    try { handle.setPointerCapture(e.pointerId); } catch {}
    let raf = 0;
    const place = () => {
      const lists = [$("cq-user"), $("cq-ctx")];
      // La lista bajo el dedo (o la más cercana) y la posición antes del primer ítem que queda debajo.
      let target = lists[1];
      for (const ol of lists) { const b = ol.getBoundingClientRect(); if (y >= b.top - 24 && y <= b.bottom + 24) { target = ol; break; } }
      if (y < lists[1].getBoundingClientRect().top - 24) target = lists[0];
      const items = [...target.querySelectorAll(".cq-item:not(.dragging)")];
      const before = items.find((it) => { const b = it.getBoundingClientRect(); return y < b.top + b.height / 2; });
      if (before) before.before(drop); else target.append(drop);
    };
    const tick = () => {
      const b = body.getBoundingClientRect();
      if (y < b.top + 48) body.scrollTop -= 10;
      else if (y > b.bottom - 48) body.scrollTop += 10;
      place();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const move = (ev) => { y = ev.clientY; ghost.style.top = `${ev.clientY - offY}px`; };
    const up = () => {
      cancelAnimationFrame(raf);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      const ol = drop.parentElement;
      const list = ol?.dataset.list;
      const index = ol ? [...ol.children].filter((c) => c.classList.contains("cq-item") && !c.classList.contains("dragging")).indexOf(drop.nextElementSibling) : -1;
      const count = ol ? [...ol.children].filter((c) => c.classList.contains("cq-item") && !c.classList.contains("dragging")).length : 0;
      ghost.remove();
      drop.remove();
      li.classList.remove("dragging");
      if (list) {
        pq.move(uid, list, index < 0 ? count : index);
        queueChanged();
        renderCola();
        const f = pq.find(uid);
        if (f) announce(`Movida a la posición ${f.index + 1} de ${f.list === "userQueue" ? "tu cola" : "la lista"}`);
      }
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  });
  // Deslizar a la izquierda para quitar (táctil).
  body.addEventListener("pointerdown", (e) => {
    const main = e.target.closest(".cq-main");
    if (!main || e.pointerType !== "touch") return;
    const li = main.closest(".cq-item");
    const x0 = e.clientX, y0 = e.clientY;
    let dx = 0, horizontal = null;
    delete li.dataset.swiped;
    const move = (ev) => {
      dx = Math.min(0, ev.clientX - x0);
      if (horizontal === null && (Math.abs(ev.clientX - x0) > 8 || Math.abs(ev.clientY - y0) > 8)) horizontal = Math.abs(ev.clientX - x0) > Math.abs(ev.clientY - y0);
      if (horizontal) li.style.transform = `translateX(${dx}px)`;
    };
    const up = () => {
      main.removeEventListener("pointermove", move);
      main.removeEventListener("pointerup", up);
      main.removeEventListener("pointercancel", up);
      li.style.transform = "";
      if (horizontal && dx < -80) { li.dataset.swiped = "1"; removeFromCola(Number(li.dataset.uid)); }
      else if (horizontal) li.dataset.swiped = "1";
      setTimeout(() => delete li.dataset.swiped, 50);
    };
    main.addEventListener("pointermove", move);
    main.addEventListener("pointerup", up);
    main.addEventListener("pointercancel", up);
  });
}

// ---------- Menú ⋯ de cada canción (también clic derecho, pulsación larga y tecla de menú) ----------
let songMenuIndex = -1;
let songMenuTrigger = null;
function openSongMenu(index, trigger, point) {
  const menu = $("song-menu");
  closeMenus();
  songMenuIndex = index;
  songMenuTrigger = trigger;
  const { song } = queue[index];
  $("sm-title").textContent = song.title;
  const liked = favorites.has(song.id);
  $("sm-like").querySelector(".mi-label").textContent = liked ? "Quitar de Me gusta" : "Agregar a Me gusta";
  $("sm-artist").hidden = artistOf(queue[index]) === "mine";
  menu.hidden = false;
  trigger?.setAttribute?.("aria-expanded", "true");
  const r = trigger.getBoundingClientRect();
  const w = menu.offsetWidth, h = menu.offsetHeight;
  const px = point && (point.x || point.y) ? point.x : r.right - w;
  const py = point && (point.x || point.y) ? point.y : r.bottom + 6;
  menu.style.left = `${Math.min(innerWidth - w - 12, Math.max(12, px))}px`;
  menu.style.top = `${Math.min(innerHeight - h - 12, Math.max(12, py))}px`;
  menu.style.bottom = "auto";
  menu.querySelector("button:not([hidden])")?.focus();
}
function closeSongMenu(restore) {
  const menu = $("song-menu");
  if (menu.hidden) return;
  menu.hidden = true;
  songMenuTrigger?.setAttribute?.("aria-expanded", "false");
  if (restore) songMenuTrigger?.focus?.();
}
function goToAlbum(i) { openAlbum(queue[i].album.id); }
function goToArtist(i) {
  listFilter = artistOf(queue[i]);
  renderFilters();
  applySearch();
  $("view-explore").click();
  requestAnimationFrame(() => $("explore-results").scrollIntoView({ block: "start", behavior: "smooth" }));
}
function bindSongMenu() {
  const act = (fn) => () => { const i = songMenuIndex; closeSongMenu(false); if (i >= 0) fn(i); };
  $("sm-next").onclick = act(queuePlayNext);
  $("sm-add").onclick = act(queueAdd);
  $("sm-album").onclick = act(goToAlbum);
  $("sm-artist").onclick = act(goToArtist);
  $("sm-like").onclick = act((i) => {
    const on = favorites.toggle(queue[i].song.id);
    toast(on ? `💜 Guardada en Me gusta` : `Quitada de Me gusta`, 2000);
  });
  $("song-menu").addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.stopPropagation(); closeSongMenu(true); }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = [...$("song-menu").querySelectorAll("button:not([hidden])")];
      const k = items.indexOf(document.activeElement);
      items[(k + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
    }
    if (e.key === "Tab") closeSongMenu(false);
  });
  document.addEventListener("pointerdown", (e) => { if (!e.target.closest("#song-menu, .more-btn")) closeSongMenu(false); });
  // Botón ⋯, clic derecho y tecla de menú.
  document.addEventListener("click", (e) => {
    const more = e.target.closest(".more-btn");
    if (!more) return;
    const i = Number(more.dataset.index);
    if ($("song-menu").hidden || songMenuIndex !== i) openSongMenu(i, more); else closeSongMenu(true);
  });
  document.addEventListener("contextmenu", (e) => {
    const b = e.target.closest(".song, .sg-play, .lib-row[data-index]");
    if (!b) return;
    e.preventDefault();
    openSongMenu(Number(b.dataset.index), b, { x: e.clientX, y: e.clientY });
  });
  // Pulsación larga en pantallas táctiles (iOS no dispara contextmenu).
  let timer = 0, startX = 0, startY = 0, longPressed = false;
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest(".song, .sg-play, .lib-row[data-index]");
    if (!b || e.pointerType !== "touch") return;
    longPressed = false;
    startX = e.clientX; startY = e.clientY;
    clearTimeout(timer);
    timer = setTimeout(() => { longPressed = true; openSongMenu(Number(b.dataset.index), b); navigator.vibrate?.(10); }, 520);
  });
  document.addEventListener("pointermove", (e) => { if (Math.hypot(e.clientX - startX, e.clientY - startY) > 10) clearTimeout(timer); });
  document.addEventListener("pointerup", () => clearTimeout(timer));
  document.addEventListener("click", (e) => { if (longPressed && e.target.closest(".song, .sg-play")) { e.preventDefault(); e.stopPropagation(); longPressed = false; } }, true);
}
function moreButton(index, title) {
  const m = document.createElement("button");
  m.type = "button";
  m.className = "more-btn";
  m.dataset.index = index;
  m.setAttribute("aria-label", `Más opciones: ${title}`);
  m.setAttribute("aria-controls", "song-menu");
  m.setAttribute("aria-expanded", "false");
  m.innerHTML = `<svg aria-hidden="true"><use href="#i-more"/></svg>`;
  return m;
}

// ---------- Explorar con mini reproductor ----------
const MINI = { corner: "br" };
/** Oculta la miniatura y pausa: nunca suena un video que no se ve. */
function hideMini() {
  player.pause();
  app.classList.add("mini-off");
  placeMini(false); // sin miniatura, Explorar ya no reserva su espacio abajo
  toastAction("Miniatura oculta, video en pausa", "Mostrar", () => { showMini(); player.play(); });
  $("btn-play").focus({ preventScroll: true });
}
function showMini() {
  app.classList.remove("mini-off");
  placeMini(false);
  requestAnimationFrame(() => placeMini(false));
}
let minimizeVideo = () => {};
function placeMini(animate) {
  const card = $("video-view");
  const main = $("main");
  if (!app.classList.contains("mini-mode")) {
    card.style.removeProperty("--mx"); card.style.removeProperty("--my");
    for (const k of "trbl") main.style.removeProperty(`--mini-res-${k}`);
    return;
  }
  const stage = main.getBoundingClientRect();
  const head = $("explore-head").getBoundingClientRect();
  const w = card.offsetWidth, h = card.offsetHeight, g = 12;
  // Si Explorar le reserva una columna (teléfono en horizontal), el mini va arriba de todo, junto al buscador.
  const reserved = parseFloat(getComputedStyle($("home")).paddingRight) >= w;
  const top = reserved ? g / 2 : Math.max(g, Math.min(head.bottom - stage.top + g, stage.height - h - g));
  const pos = {
    tl: [g, top], tr: [stage.width - w - g, top],
    bl: [g, stage.height - h - g], br: [stage.width - w - g, stage.height - h - g],
  }[MINI.corner];
  card.classList.toggle("snapping", Boolean(animate));
  // Siempre dentro del escenario, aunque el mini sea más ancho que el hueco disponible.
  const maxX = Math.max(0, stage.width - w - g), maxY = Math.max(top, stage.height - h - g);
  const x = Math.min(maxX, Math.max(0, pos[0])), y = Math.min(maxY, Math.max(top, pos[1]));
  card.style.setProperty("--mx", `${x}px`);
  card.style.setProperty("--my", `${y}px`);
  // Lo que comparte el escenario con el mini (vista Luces, fanchant) le deja su franja: a un lado si sobra ancho,
  // si no, arriba o abajo. Así nada tapa el video ni el video tapa los controles de Luces.
  const res = { t: 0, r: 0, b: 0, l: 0 };
  if (!app.classList.contains("mini-off")) {
    if (stage.width - w - g * 2 >= 480) { if (x + w / 2 > stage.width / 2) res.r = stage.width - x + g; else res.l = x + w + g; }
    else if (y + h / 2 > stage.height / 2) res.b = stage.height - y + g;
    else res.t = y + h + g;
  }
  for (const k of "trbl") main.style.setProperty(`--mini-res-${k}`, `${Math.round(res[k])}px`);
  dispatchEvent(new Event("pws:layout"));
  // Explorar deja al final solo el espacio que tapa la miniatura (si está abajo y a la vista), no 280 px fijos.
  const bottomCorner = MINI.corner.startsWith("b") && !app.classList.contains("mini-off");
  $("home").style.setProperty("--mini-pad", `${bottomCorner ? h + g * 2 : 24}px`);
}
function bindMini() {
  const bar = $("mini-bar");
  const card = $("video-view");
  bar.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    e.preventDefault();
    try { bar.setPointerCapture(e.pointerId); } catch {}
    const stage = $("main").getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const x0 = parseFloat(card.style.getPropertyValue("--mx")) || 0;
    const y0 = parseFloat(card.style.getPropertyValue("--my")) || 0;
    card.classList.remove("snapping");
    card.classList.add("dragging");
    const move = (ev) => {
      card.style.setProperty("--mx", `${x0 + ev.clientX - sx}px`);
      card.style.setProperty("--my", `${y0 + ev.clientY - sy}px`);
    };
    const up = (ev) => {
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", up);
      card.classList.remove("dragging");
      // Un toque sin arrastrar abre el video (en el teléfono no hay botón de expandir: estorbaba).
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) { placeMini(false); $("view-video").click(); return; }
      const cx = x0 + ev.clientX - sx + card.offsetWidth / 2;
      const cy = y0 + ev.clientY - sy + card.offsetHeight / 2;
      MINI.corner = `${cy < stage.height / 2 ? "t" : "b"}${cx < stage.width / 2 ? "l" : "r"}`;
      placeMini(true);
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", up);
  });
  $("mini-hide").onclick = () => hideMini();
  $("mini-back").onclick = () => $("view-video").click();
  $("btn-mini").onclick = () => (view === "video" ? minimizeVideo() : $("view-video").click());
  const setSmall = (on) => {
    card.classList.toggle("mini-sm", on);
    const b = $("mini-size");
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute("aria-label", "Video pequeño");
    b.querySelector("use").setAttribute("href", on ? "#i-grow" : "#i-shrink");
    requestAnimationFrame(() => placeMini(true));
  };
  $("mini-size").onclick = () => setSmall(!card.classList.contains("mini-sm"));
  // Minimizar desde la vista Video: el video sigue sonando en un mini reproductor chico, abajo a la derecha.
  minimizeVideo = () => { MINI.corner = "br"; setSmall(true); $("view-explore").click(); };
  // El escenario cambia de tamaño sin que cambie la ventana (abrir, cerrar o compactar la biblioteca, el dock,
  // la barra de desplazamiento): se recoloca con cada cambio real de tamaño, no solo con "resize".
  if ("ResizeObserver" in window) new ResizeObserver(() => placeMini(false)).observe($("main"));
  else addEventListener("resize", () => placeMini(false));
}

// ---------- Ajustes ----------
function bindSettings() {
  const bright = $("rng-bright"), lat = $("rng-latency"), style = $("sel-style");
  style.append(new Option("Automático (según la canción)", "auto"));
  for (const [id, s] of Object.entries(STYLES)) style.append(new Option(s.label, id));
  const sync = () => {
    $("out-bright").textContent = `${settings.brightness}%`;
    $("out-latency").textContent = `${settings.latencyMs >= 0 ? "+" : ""}${settings.latencyMs} ms`;
    $("style-help").textContent = settings.style === "auto" ? "Cada parte usa un estilo distinto, como en un concierto." : STYLES[settings.style].description;
    $("btn-auto").setAttribute("aria-pressed", settings.autoNext);
  };
  bright.value = settings.brightness;
  lat.value = settings.latencyMs;
  style.value = settings.style;
  $("chk-safe").checked = settings.safeMode;
  $("chk-wake").checked = settings.wake;
  $("chk-chant").checked = settings.chant;
  $("chk-chant-voice").checked = settings.chantVoice;
  $("chk-chant").onchange = (e) => { settings.chant = e.target.checked; saveSettings(); };
  $("chk-chant-voice").onchange = (e) => { settings.chantVoice = e.target.checked; saveSettings(); };
  $("sel-album-end").value = settings.albumEnd;
  sync();

  bright.oninput = () => { settings.brightness = +bright.value; sync(); saveSettings(); };
  lat.oninput = () => { settings.latencyMs = +lat.value; sync(); saveSettings(); };
  style.onchange = () => { settings.style = style.value; sync(); saveSettings(); pattern = null; };
  $("chk-safe").onchange = (e) => {
    if (!e.target.checked) {
      // Desactivarlo pide confirmación (destellos rápidos; epilepsia fotosensible).
      e.target.checked = true;
      $("dlg-safe").showModal();
      $("dlg-safe-keep").focus();
      return;
    }
    settings.safeMode = true; saveSettings(); pattern = null;
  };
  $("dlg-safe-keep").onclick = () => $("dlg-safe").close();
  $("dlg-safe-off").onclick = () => {
    $("dlg-safe").close();
    $("chk-safe").checked = false;
    settings.safeMode = false; saveSettings(); pattern = null;
    toast("Modo seguro desactivado.");
  };
  $("chk-wake").onchange = (e) => { settings.wake = e.target.checked; saveSettings(); if (!settings.wake) wakeLock?.release(); };
  // Métricas de uso (Google Analytics): se pueden apagar; queda guardado en este dispositivo.
  $("chk-metrics").checked = !analyticsOff();
  $("chk-metrics").onchange = (e) => { setAnalyticsOff(!e.target.checked); if (e.target.checked) pageview(); };
  const access = { "chk-sounds": "sounds", "chk-describe": "describe", "chk-keys": "keys", "chk-calm": "calm" };
  for (const [id, key] of Object.entries(access)) {
    $(id).checked = settings[key];
    $(id).onchange = (e) => {
      settings[key] = e.target.checked;
      saveSettings();
      applyAccess();
      if (key === "sounds" && settings.sounds) earcon("connected");
    };
  }
  applyAccess();
  $("sel-album-end").onchange = (e) => { settings.albumEnd = e.target.value; saveSettings(); };
  $("btn-auto").onclick = () => { settings.autoNext = !settings.autoNext; sync(); saveSettings(); toast(settings.autoNext ? "Al terminar, sigue la siguiente." : "Al terminar, se detiene."); };
  const setBpm = (v) => {
    const item = queue[current];
    if (!item || !(v >= 40 && v <= 220)) return;
    settings.bpm[item.song.id] = Math.round(v);
    $("num-bpm").value = Math.round(v);
    saveSettings();
    pattern = null;
  };
  $("num-bpm").onchange = (e) => setBpm(Number(e.target.value));

  // Marcar tempo: promedio de los intervalos entre toques.
  // Marcar ritmo con la canción sonando: BPM (mediana de los intervalos) y fase (dónde cae el tiempo), con el reloj
  // del video. Así el latido de las luces cae en el golpe de la música y no en el segundo 0 del video.
  let taps = [];
  $("btn-tap-tempo").onclick = () => {
    const item = queue[current];
    const playing = player?.state === "playing";
    const now = playing ? player.time() : performance.now() / 1000;
    taps = taps.filter((t) => now - t < 3 && now >= t);
    taps.push(now);
    const n = taps.length;
    if (n >= 4) {
      const gaps = taps.slice(1).map((t, i) => t - taps[i]).sort((a, b) => a - b);
      const gap = gaps[Math.floor(gaps.length / 2)];
      const bpm = 60 / gap;
      setBpm(bpm);
      if (playing && item) {
        const b = 60 / Math.round(bpm);
        // Fase promedio de los toques (circular) para no depender de un solo toque.
        const ang = taps.map((t) => (2 * Math.PI * (t % b)) / b);
        const mean = Math.atan2(ang.reduce((a, x) => a + Math.sin(x), 0), ang.reduce((a, x) => a + Math.cos(x), 0));
        settings.phase[item.song.id] = Number(((((mean / (2 * Math.PI)) * b) + b) % b).toFixed(3));
        saveSettings();
        pattern = null;
      }
      $("btn-tap-tempo").textContent = `${Math.round(bpm)} BPM${playing ? " · alineado" : ""}`;
      say(playing ? `${Math.round(bpm)} BPM, luces alineadas al ritmo.` : `${Math.round(bpm)} BPM. Para alinear las luces, marca el ritmo con la canción sonando.`);
    } else $("btn-tap-tempo").textContent = `Toca… ${n}/4`;
  };
}

function renderDonations() {
  $("repo-link").href = PROJECT.repo;
  $("donations").replaceChildren(
    ...DONATIONS.filter((d) => d.url).map((d) => {
      const a = document.createElement("a");
      a.className = "btn";
      a.href = d.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = d.label;
      a.title = d.note;
      return a;
    }),
  );
}

// ---------- Reto de ritmo y rankings ----------
const profile = loadProfile();
let challenge = null;
let rankTab = "song";
const currentHandle = () => normalizeHandle($("inp-handle").value);

function startChallenge() {
  const item = queue[current];
  const ok = $("chk-game").checked && currentHandle() && item;
  challenge = ok ? new RhythmChallenge(Number(settings.bpm[item.song.id] ?? item.song.bpm)) : null;
  $("tap-pad").disabled = !challenge;
  $("tap-pad").textContent = challenge ? "¡Toca al ritmo!" : "Escribe tu nickname y activa el reto";
  $("btn-game").classList.toggle("active", Boolean(challenge));
  updateScore();
  $("g-judge").innerHTML = "&nbsp;";
}
function updateScore() {
  $("g-score").textContent = challenge?.score.toLocaleString("es") ?? "0";
  $("g-combo").textContent = challenge?.combo ?? 0;
  $("g-acc").textContent = challenge?.scored ? `${Math.round(challenge.accuracy * 100)}%` : "—";
}
function onTap() {
  if (!challenge || player.state !== "playing") return;
  const r = challenge.tap(player.time());
  if (r.id === "ignored") return;
  // Sin mirar: un sonido por resultado (Perfecto agudo … Fuera grave) y vibración en Android.
  if (settings.sounds && !mic) earcon(r.id === "calibrating" ? "searching" : r.id);
  buzz(r.id === "miss" ? [30, 30, 30] : r.id === "perfect" ? 25 : 12);
  const j = $("g-judge");
  j.textContent = r.points ? `${r.label} +${r.points}${r.combo > 1 ? ` · combo ${r.combo}` : ""}` : r.label;
  j.classList.toggle("miss", r.id === "miss");
  const pad = $("tap-pad");
  pad.classList.add("hit");
  setTimeout(() => pad.classList.remove("hit"), 90);
  updateScore();
}
async function finishChallenge() {
  if (!challenge) return;
  const item = queue[current];
  const c = challenge;
  challenge = null;
  if (!c.qualifies) return toast(`Faltaron toques: con ${MIN_TAPS_FOR_RANKING} entras al ranking.`);
  const s = c.summary();
  const { remote } = await submitScore({
    handle: currentHandle(), network: $("sel-network").value, songId: item.song.id, albumId: item.album.id,
    score: s.score, accuracy: s.accuracy, maxCombo: s.maxCombo,
  });
  toast(`🏆 ${s.score.toLocaleString("es")} puntos · ${s.accuracy}% · combo ${s.maxCombo}`, 6000);
  const DONE = {
    en: `Challenge over: ${s.score} points, ${s.accuracy}% accuracy, best combo ${s.maxCombo}.`,
    pt: `Desafio encerrado: ${s.score} pontos, ${s.accuracy}% de precisão, combo máximo ${s.maxCombo}.`,
    ko: `챌린지 종료: ${s.score}점, 정확도 ${s.accuracy}%, 최고 콤보 ${s.maxCombo}.`,
    id: `Tantangan selesai: ${s.score} poin, akurasi ${s.accuracy}%, kombo terbaik ${s.maxCombo}.`,
  };
  say(DONE[lang] ?? `Reto terminado: ${s.score} puntos, ${s.accuracy} % de precisión, combo máximo ${s.maxCombo}.`, { delay: 600 });
  renderRanking();
}
async function renderRanking() {
  const item = queue[current];
  const songId = rankTab === "song" ? item?.song.id ?? null : null;
  const body = $("rank-body");
  if (rankTab === "song" && !songId) {
    $("rank-caption").textContent = "Elige una canción para ver su ranking";
    body.replaceChildren();
    return;
  }
  const { rows, source } = await topScores(songId);
  $("rank-caption").textContent = rankTab === "song" ? `Lo mejor en ${item.song.title}` : "Puntos de fan: tu mejor puntaje de cada canción, sumado";
  $("rank-source").textContent = source === "global" ? "Ranking global." : "Ranking de este dispositivo.";
  const me = currentHandle()?.toLowerCase();
  const myNet = $("sel-network").value;
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.textContent = "Nadie ha jugado esta canción todavía. ¡Estrénala!";
    tr.append(td);
    body.replaceChildren(tr);
    return;
  }
  body.replaceChildren(
    ...rows.map((r, i) => {
      const tr = document.createElement("tr");
      if (r.handle.toLowerCase() === me && r.network === myNet) tr.className = "me";
      const pos = document.createElement("td");
      pos.textContent = ["🥇", "🥈", "🥉"][i] ?? i + 1;
      const who = document.createElement("td");
      const url = profileUrl(r.network, r.handle);
      const name = document.createElement(url ? "a" : "span");
      name.textContent = `@${r.handle}`;
      if (url) { name.href = url; name.target = "_blank"; name.rel = "noopener noreferrer nofollow ugc"; }
      const net = document.createElement("span");
      net.className = "net";
      const extra = rankTab === "all" ? ` · ${r.songs} canción${r.songs > 1 ? "es" : ""}` : ` · ${r.accuracy}%`;
      net.textContent = ` ${NETWORKS.find((n) => n.id === r.network)?.label ?? r.network}${extra}`;
      who.append(name, net);
      const pts = document.createElement("td");
      pts.textContent = r.score.toLocaleString("es");
      tr.append(pos, who, pts);
      return tr;
    }),
  );
}
function bindGame() {
  const sel = $("sel-network");
  for (const n of NETWORKS) sel.append(new Option(n.label, n.id));
  sel.value = profile.network;
  const inp = $("inp-handle");
  inp.value = profile.handle ? `@${profile.handle}` : "";
  $("chk-game").checked = Boolean(profile.play);
  const persist = () => {
    const h = currentHandle();
    inp.setAttribute("aria-invalid", inp.value.trim() && !h ? "true" : "false");
    saveProfile({ handle: h ?? "", network: sel.value, play: $("chk-game").checked });
    if (!challenge && current >= 0 && player.state === "playing") startChallenge();
    if (challenge && !h) startChallenge();
  };
  inp.oninput = persist;
  sel.onchange = () => { persist(); renderRanking(); };
  $("chk-game").onchange = () => {
    persist();
    if (!$("chk-game").checked) startChallenge();
    else if (!currentHandle()) { toast("Escribe tu nickname para jugar."); inp.focus(); }
  };
  // NVDA en modo exploración, VoiceOver y TalkBack activan con "click": se acepta si no vino justo de un toque.
  let lastPointerTap = 0;
  $("tap-pad").addEventListener("pointerdown", (e) => { e.preventDefault(); lastPointerTap = performance.now(); onTap(); });
  $("tap-pad").addEventListener("click", (e) => { if (e.detail === 0 || performance.now() - lastPointerTap > 500) onTap(); });
  $("tap-pad").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTap(); } });
  bindTabs(["tab-song", "tab-all"], (id) => { rankTab = id === "tab-song" ? "song" : "all"; renderRanking(); });
  renderRanking();
}

// ---------- Inicio ----------
let bufferTimer = 0;
function onPlayerState(state) {
  const playing = state === "playing";
  updateMediaPosition();
  // YouTube vuelve a poner su propio título al iframe al cargar: se repone el nuestro.
  if (current >= 0 && (state === "cued" || state === "playing")) player.setTitle(queue[current].song.title);
  // Carga larga: se avisa (quien no ve no sabe si se trabó).
  clearTimeout(bufferTimer);
  if (state === "buffering") bufferTimer = setTimeout(() => player.state === "buffering" && say("Cargando…"), 3000);
  $("play-icon").setAttribute("href", playing ? "#i-pause" : "#i-play");
  $("btn-play").setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
  // Miniatura oculta: el video no suena. Si se reanuda desde el pie de página, la miniatura vuelve.
  if (playing && app.classList.contains("mini-off")) showMini();
  markCurrent();
  if (playing && resumeAt > 3) { player.seek(resumeAt); resumeAt = 0; }
  // El recorrido corto llega después de que suena la primera canción (no antes).
  if (playing && !tourScheduled) { tourScheduled = true; if (!Tour.done) setTimeout(() => startTourLater(), 4000); }
  app.classList.toggle("playing-now", playing);
  if (playing) {
    requestWakeLock();
    if (mic && !mic.hybrid) toggleMic(); // el modo TV se apaga al reproducir; el de intensidad, no
  }
  poke();
}
function selectViewTab(id) {
  ["view-explore", "view-video", "view-lights"].forEach((t) => {
    $(t).setAttribute("aria-selected", t === id);
    $(t).tabIndex = t === id ? 0 : -1;
  });
}

async function init() {
  setupSim();
  bindTheme();
  initTooltips();
  pq = new PlayQueue({ onContextEnd: contextEnd });
  // El público del fondo (canvas) se arma después de la primera pintura y con el hilo libre: primero se ven el
  // catálogo y los controles; el fondo aparece enseguida.
  afterPaintIdle(async () => {
    const { Crowd } = await import("./crowd.js");
    crowd = new Crowd($("crowd"), { reduceMotion: matchMedia("(prefers-reduced-motion: reduce)").matches });
    crowd.setTheme?.(document.documentElement.dataset.theme);
  });
  renderAlbums();
  renderFilms();
  renderSticks();
  bindPanels();
  bindSettings();
  bindRangeFill();
  renderDonations();
  bindGame();
  bindTimeline();
  bindTabs(["view-explore", "view-video", "view-lights"], (id) => {
    // Sin canción, Video no tiene nada que mostrar (y el reproductor vacío de YouTube puede mostrar un error).
    if (id === "view-video" && current < 0) {
      selectViewTab(view === "lights" ? "view-lights" : "view-explore");
      toast("Elige una canción para ver su video.", 3000);
      return;
    }
    // Estando en Me gusta o Mis videos, Explorar vuelve al inicio; Video y Luces salen de la página.
    if (page !== "home" && (id !== "view-explore" || !$(PAGES[page].el).hidden)) { closeLikes(); if (id === "view-explore") return; }
    switchView({ "view-video": "video", "view-lights": "lights", "view-explore": "explore" }[id]);
  });
  // Sin canción, lo que se ve es Explorar: la pestaña lo dice.
  if (current < 0) { selectViewTab("view-explore"); setView("explore"); }
  bindLikesPage();
  bindLightsView();
  watchZeroBadges();
  bindFiltersToggle();
  addEventListener("resize", () => requestAnimationFrame(markTitleOverflow));
  bindTabs(["rs-now", "rs-cola"], (id) => setSideTab(id.slice(3), false));

  const support = bluetoothSupport();
  if (!support.ok) showBtWarning(IS_IOS ? "ios" : support.reason);
  else if (isBrave()) showBtWarning("brave-hint"); // aviso informativo: el botón sigue activo por si ya lo activaron
  else if (browserInfo().flaky) showBtWarning("flaky-hint"); // Samsung Internet y similares: aviso, sin bloquear

  $("btn-connect").onclick = onConnect;
  $("btn-next").onclick = () => { fanchant?.stop(); next(false); };
  $("btn-prev").onclick = () => { fanchant?.stop(); prev(); };
  fanchant = new Fanchant({
    onBeat: () => {
      chantFlashAt = performance.now();
      crowd?.flash();
    },
  });
  $("btn-describe").onclick = () => { closeMenus(); announceLights(); };
  $("btn-play").onclick = togglePlay;
  $("btn-mic").onclick = () => (mic?.hybrid ? toggleMicSync().then(toggleMic) : toggleMic());
  $("btn-mic-sync").onclick = () => { closeMenus(); toggleMicSync(); };
  $("btn-mic-2").onclick = toggleMic;
  $("btn-fs").onclick = toggleFullscreen;
  $("form-add").onsubmit = onAddVideo;
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("webkitfullscreenchange", onFsChange);
  ["pointermove", "pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, poke, { passive: true }));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("song-menu").hidden) return closeSongMenu(true);
    if (e.key === "Escape" && document.querySelector(".menu-pop:not([hidden])")) return closeMenus();
    if (e.key === "Escape" && openPanel) return closePanel();
    if (e.key === "Escape" && app.classList.contains("side-drawer")) { setSide(false); return $("btn-side").focus(); }
    const withMod = e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey;
    if (e.target.closest("input, select, textarea") || (!withMod && e.target.closest("button, a, [role='slider']"))) return;
    if (!withMod && (!settings.keys || e.altKey || e.ctrlKey || e.metaKey)) return;
    const k = withMod ? e.code.replace(/^Key/, "").toLowerCase() : e.key.toLowerCase();
    if (e.code === "Space" || (withMod && k === "k")) { e.preventDefault(); togglePlay(); }
    else if (k === "n") { e.preventDefault(); next(false); }
    else if (k === "p") { e.preventDefault(); prev(); }
    else if (k === "b") onTap();
    else if (k === "f") toggleFullscreen();
    else if (k === "l") { e.preventDefault(); announceLights(); }
  });

  const guide = (guideRef = new Guide({
    onConnect: async () => {
      if (!bluetoothSupport().ok) {
        toast(IS_IOS ? "En iPhone, abre esta página en Bluefy para conectar." : "Este navegador no puede conectar por Bluetooth.");
        return;
      }
      await onConnect();
    },
    onTest: () => {
      // Prueba: morado, luego latido suave, luego morado fijo.
      const purple = hexToRgb(PURPLE);
      // En el V4 el latido lo funde el propio ARMY Bomb (400 ms); en los demás es un cambio directo.
      sticks.forEach((s) => s.setColor(purple, 0));
      setTimeout(() => sticks.forEach((s) => s.setColor(purple.map((v) => v * 0.4), 400)), 500);
      setTimeout(() => sticks.forEach((s) => s.setColor(purple, 400)), 1000);
    },
    hasSticks: () => sticks.length > 0,
    lastError: () => lastBtError,
    stickNames: () => sticks.map((s) => s.name),
    // "Omitir guía": la guía ya se cerró; se abre el panel de conexión solo (sin la guía encima) y el foco va a Conectar.
    onSkip: () => {
      if (openPanel !== "panel-bt") showPanel("panel-bt", $("btn-bt"));
      $("btn-connect")?.focus({ preventScroll: true });
    },
    onDone: (name) => { toast(`💜 ¡${name} listo! Ahora elige una canción.`); },
  }));
  $("btn-guide").onclick = () => { closePanel(false); guide.open(); };
  bindMenu();
  bindMenus();
  bindModes();
  bindCola();
  bindSongMenu();
  bindMini();
  bindSearch();
  bindLibrary();
  bindNowPanel();
  renderLibrary();
  renderHome();
  bindCollections();
  renderCollections();
  $("upnext-close").onclick = () => { upnextDismissed = true; $("upnext").hidden = true; $("btn-play").focus(); };
  favorites.prune(queue.map((q) => q.song.id));
  favorites.onChange(() => {
    document.querySelectorAll(".like-btn").forEach((b) => {
      const on = favorites.has(b.dataset.song);
      b.setAttribute("aria-pressed", on);
    });
    renderFilters();
    applySearch();
    renderHome();
    renderCollections();
    renderUpNext();
    renderLibrary();
    renderNowPanel();
    syncDockLike();
  });
  $("btn-concert").onclick = toggleConcert;
  const firstLike = () => [...document.querySelectorAll("#home .sg-like, #albums .like-btn")].find((b) => b.getBoundingClientRect().width > 0);
  const tour = new Tour({ avoid: videoRect });
  const startTour = () => {
    document.querySelectorAll("[data-tour='like']").forEach((el) => el.removeAttribute("data-tour"));
    firstLike()?.setAttribute("data-tour", "like");
    tour.start();
  };
  $("btn-tour").onclick = () => { closePanel(false); Tour.reset(); setTimeout(startTour, 250); };
  bindFeedback();
  $("btn-clear-data").onclick = () => {
    if (!confirm(t("¿Borrar tus ajustes, nickname, puntajes, Me gusta, álbumes, historial y videos de este dispositivo? No se puede deshacer."))) return;
    clearAllLocalData();
    toast("Listo, datos borrados. La página se recargará.");
    setTimeout(() => location.reload(), 1200);
  };
  // El micrófono se apaga al salir de la página o al ocultarla.
  addEventListener("pagehide", () => { mic?.stop(); cam?.stop(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && mic) toggleMic(); });
  const params = new URLSearchParams(location.search);
  // Primera visita: Explorar con una tarjeta "¿Tienes un ARMY Bomb?" (la guía solo si la persona quiere).
  // Dentro de TikTok, Instagram… no hay Bluetooth: aviso con "Abrir en Chrome" o "Copiar enlace".
  if (inAppBrowser()) { showInAppNotice(); showBtWarning("inapp"); }
  // ---------- Bienvenida: la pantalla ya brilla; conectar es opcional ----------
  $("ob-yes").onclick = () => guide.open();
  redirectConnectButtons([$("ob-yes")]); // dentro de TikTok/Instagram: abrir Chrome o copiar el enlace, no la guía
  $("ob-close").onclick = () => { store.set(ONBOARD_KEY, "closed"); syncOnboard(); $("main").focus({ preventScroll: true }); };
  syncOnboard();
  if (params.has("guide") || params.has("guia")) guide.open();
  // Parámetros de un solo uso (?guide=1, ?song=…) y direcciones viejas (#me-gusta, #mis-videos): se leen y se
  // pasan a la dirección amigable, así no se arrastran.
  const legacy = params.get("song") ?? { "#me-gusta": "likes", "#mis-videos": "my-videos" }[location.hash] ?? null;
  // El recorrido no se apila con la guía: si está abierta, espera.
  startTourLater = () => { if (Tour.done) return; if ($("guide").hidden) startTour(); else setTimeout(() => startTourLater(), 5000); };
  // Si la persona omite la guía, el recorrido empieza después.
  pageview();
  addEventListener("pws:lang", (e) => track("idioma", { idioma: e.detail }));
  // Compartido desde YouTube (botón Compartir → LumiParty).
  if (params.has("text") || params.has("url")) setTimeout(() => handleShared(params), 600);
  // La dirección de entrada arma la pantalla (/player/luces, /player/album-wings, /player/dynamite…).
  const startSlug = legacy && /^[a-z0-9-]{1,90}$/.test(legacy) ? legacy : slugFromPath();
  if (startSlug && isSongSlug(startSlug)) setTimeout(() => { routeReady = true; applyRoute(startSlug); }, 800); // espera al reproductor
  else { if (startSlug) applyRoute(startSlug); routeReady = true; if (location.search || location.hash) try { history.replaceState({ r: currentSlug() }, "", playerBase() + currentSlug()); } catch {} }

  player = new Player($("yt"), {
    onState: onPlayerState,
    onEnded: async () => {
      // Fuegos artificiales al terminar la canción, con sus colores (los del ARMY Bomb en esa canción).
      const done = queue[current];
      noteSongFinished();
      if (done) (fx ??= fireworks({ z: 30, safe: () => settings.safeMode !== false, avoid: videoRect })).show({ colors: lightColors(done.song, done.album), count: 6 });
      await finishChallenge();
      if (!settings.autoNext) return;
      const endedAt = current;
      if (settings.chant && willContinue()) {
        say(settings.chantVoice ? "Fanchant: el público corea los nombres." : "Fanchant entre canciones.");
        // Al ritmo de la canción que viene (como en el concierto, el público ya va con su tempo).
        const up = pq.peek({ auto: true });
        const upItem = up ? queue[idxOf(up.id ?? up)] : null;
        const bpm = upItem ? Number(settings.bpm[upItem.song.id] ?? upItem.song.bpm) : 0;
        await fanchant.run({ voice: settings.chantVoice, bpm });
        if (current !== endedAt) return; // la persona eligió otra canción durante el fanchant
      }
      next(true);
    },
    onError: (code) => {
      // 101/150: el dueño de los derechos no permite verlo fuera de YouTube (a veces solo en algunas regiones).
      const msg = code === 101 || code === 150
        ? "El dueño de los derechos no permite ver este video fuera de YouTube en tu región. Pasamos al siguiente."
        : code === 100 ? "Este video ya no está en YouTube. Pasamos al siguiente." : "YouTube no pudo cargar este video. Pasamos al siguiente.";
      toast(msg, 6000);
      setTimeout(() => next(true), 1500);
    },
  });
  requestAnimationFrame(frame);
  // YouTube (la API y el reproductor pesan cerca de 1 MB) se carga cuando la página terminó de cargar y el hilo está
  // libre; si antes alguien elige una canción, Player.load lo pide en ese momento.
  await new Promise((r) => afterLoadIdle(r));
  await player.init();
  // Retoma la cola guardada (en pausa) si no se pidió una canción por enlace.
  if (!isSongSlug(startSlug)) restoreQueue();

  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("../sw.js", { scope: "../" }).catch(() => {});
  // Mientras publicamos una versión nueva (y cuando ya está), aviso con «Recargar»: en ese rato pueden mezclarse
  // archivos viejos y nuevos, y si algo falla o se desincroniza lo que sirve es recargar y volver a conectar.
  watchUpdates({
    swUrl: new URL("../sw.js", location.href).href,
    onUpdating: () => toastAction(t("Estamos actualizando LumiParty. Si algo deja de responder o las luces se desincronizan, recarga la página y vuelve a conectar tu ARMY Bomb."), t("Recargar"), () => location.reload(), 20000),
    onUpdated: () => toastAction(t("LumiParty se actualizó. Recarga la página cuando puedas: tus Me gusta y listas se guardan; después vuelve a conectar tu ARMY Bomb."), t("Recargar"), () => location.reload(), 30000),
  });
}

init();
