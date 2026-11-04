import { ALBUMS, CONCERT_FILMS } from "./catalog.js";
import { PURPLE, STYLES, generateConcertPattern, generatePattern, hexToRgb, rgbToHex } from "./patterns.js";
import { bluetoothSupport, requestStick } from "./ble.js";
import { Player } from "./player.js";
import { DONATIONS, PROJECT } from "./config.js";
import { RhythmChallenge, MIN_TAPS_FOR_RANKING } from "./rhythm.js";
import { NETWORKS, clearAllLocalData, loadProfile, normalizeHandle, profileUrl, saveProfile, submitScore, topScores } from "./leaderboard.js";
import { buildFeedback, sendFeedback } from "./feedback.js";
import { MicSync } from "./mic.js";
import { fetchTitle, parseYouTubeId } from "./youtube.js";
import { Guide } from "./guide.js";
import { Crowd } from "./crowd.js";
import { Fanchant } from "./fanchant.js";

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
const defaults = { brightness: 100, latencyMs: 60, style: "auto", safeMode: true, autoNext: true, albumEnd: "next", wake: true, lyrics: false, lyricsLang: "ko", chant: true, chantVoice: true, bpm: {} };
const settings = { ...defaults, ...store.get(SETTINGS_KEY, {}) };
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
let fanchant = null;
let chantFlashAt = -1e9;
const sticks = [];

// ---------- Utilidades ----------
function toast(msg, ms = 4500) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), ms);
}
const fmt = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};
const thumbUrl = (yt) => `https://i.ytimg.com/vi/${yt}/mqdefault.jpg`;

// ---------- Paneles ----------
let openPanel = null;
let panelTrigger = null;
function showPanel(id, trigger) {
  if (openPanel === id) return closePanel();
  closePanel(false);
  const p = $(id);
  p.hidden = false;
  openPanel = id;
  panelTrigger = trigger ?? document.activeElement;
  p.querySelector(".close")?.focus();
}
function closePanel(restoreFocus = true) {
  if (!openPanel) return;
  $(openPanel).hidden = true;
  openPanel = null;
  if (restoreFocus) panelTrigger?.focus?.();
}
function bindPanels() {
  document.querySelectorAll(".panel .close").forEach((b) => (b.onclick = () => closePanel()));
  $("btn-queue").onclick = (e) => showPanel("panel-queue", e.currentTarget);
  $("btn-start").onclick = (e) => showPanel("panel-queue", e.currentTarget);
  $("btn-settings").onclick = (e) => showPanel("panel-settings", e.currentTarget);
  $("btn-game").onclick = (e) => showPanel("panel-game", e.currentTarget);
  $("btn-bt").onclick = (e) => showPanel("panel-bt", e.currentTarget);
  document.addEventListener("pointerdown", (e) => {
    if (!openPanel) return;
    if (e.target.closest(".panel") || e.target.closest("[aria-controls^='panel-']") || e.target.closest("#btn-start")) return;
    closePanel(false);
  });
}

function bindTabs(tabIds, onSelect) {
  const tabs = tabIds.map($);
  tabs.forEach((tab) => {
    tab.onclick = () => select(tab);
    tab.onkeydown = (e) => {
      const i = tabs.indexOf(tab);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const nextTab = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
        nextTab.focus();
        select(nextTab);
      }
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
function setView(v) {
  view = v;
  $("video-view").hidden = v !== "video";
  $("lights-view").hidden = v !== "lights";
}

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
      small.textContent = `${s.family === "v4" ? "Ver. 4" : "SE / Ver. 3"}${s.battery != null ? ` · batería ${s.battery}%` : ""}`;
      info.append(strong, small);
      const btn = document.createElement("button");
      btn.className = "btn small";
      btn.type = "button";
      btn.textContent = "Desconectar";
      btn.setAttribute("aria-label", `Desconectar ${s.name}`);
      btn.onclick = () => s.disconnect();
      li.append(dot, info, btn);
      return li;
    }),
  );
  const n = sticks.length;
  $("conn-label").textContent = n ? `${n} conectada${n > 1 ? "s" : ""}` : "Conectar";
  $("btn-bt").classList.toggle("on", n > 0);
  $("btn-bt").setAttribute("aria-label", n ? `${n} lightstick conectada. Administrar` : "Conectar lightstick");
}

function showBtWarning(reason) {
  const w = $("bt-warning");
  w.hidden = false;
  if (reason === "ios") {
    w.innerHTML = `Safari en iPhone y iPad no permite Bluetooth web. Abre esta página en <a href="${BLUEFY_URL}" target="_blank" rel="noopener noreferrer">Bluefy</a> (gratis) para conectar tu lightstick. Mientras, puedes ver los videos y usar tu pantalla como lightstick.`;
  } else if (reason === "insecure") {
    w.textContent = "Abre la app desde https:// para usar Bluetooth.";
  } else {
    w.textContent = "Tu navegador no soporta Web Bluetooth. Usa Chrome o Edge en Android, Windows, macOS o ChromeOS.";
  }
  $("btn-connect").disabled = true;
}

async function onConnect() {
  const btn = $("btn-connect");
  btn.disabled = true;
  btn.textContent = "Conectando…";
  try {
    const stick = await requestStick({ showAll: $("chk-all").checked });
    if (sticks.some((s) => s.id === stick.id)) return toast("Esa lightstick ya está conectada.");
    stick.device.addEventListener("gattserverdisconnected", () => {
      const i = sticks.indexOf(stick);
      if (i >= 0) sticks.splice(i, 1);
      renderSticks();
      toast(`${stick.name} se desconectó.`);
    });
    sticks.push(stick);
    renderSticks();
    stick.setColor(hexToRgb(PURPLE));
    toast(`${stick.name} conectada 💜`);
  } catch (e) {
    if (e?.name !== "NotFoundError") toast(e?.message || "No se pudo conectar.");
  } finally {
    btn.disabled = false;
    btn.textContent = sticks.length ? "Conectar otra" : "Conectar lightstick";
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
  th.style.backgroundImage = `url(${thumbUrl(song.yt)})`;
  const text = document.createElement("span");
  const t = document.createElement("span");
  t.className = "s-title";
  t.textContent = song.title;
  const meta = document.createElement("span");
  meta.className = "s-meta";
  meta.style.display = "block";
  meta.textContent = song.kind === "concert" ? "Concierto / en vivo" : { high: "Baile", mid: "Medio tiempo", ballad: "Balada" }[song.energy] ?? "Canción";
  text.append(t, meta);
  const right = document.createElement("span");
  right.className = "s-meta";
  right.textContent = album.year || "";
  b.append(th, text, right);
  b.setAttribute("aria-label", `${song.title}, ${album.title}`);
  b.onclick = () => { playIndex(index); if (matchMedia("(max-width: 640px)").matches) closePanel(false); };
  return b;
}

function renderAlbums() {
  $("albums").replaceChildren(...albumNodes(false));
  $("side-list").replaceChildren(...albumNodes(true));
  renderMine();
  markCurrent();
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
    const sw = document.createElement("span");
    sw.className = "swatches";
    sw.setAttribute("aria-hidden", "true");
    album.palette.slice(0, 3).forEach((c) => { const i = document.createElement("i"); i.style.background = c; sw.append(i); });
    h.append(sw, document.createTextNode(album.year ? `${album.title} · ${album.year}` : album.title));
    nodes.push(h, ...items.map(([item, i]) => songButton(item, i)));
  }
  return nodes;
}

// ---------- Menú y lista lateral ----------
const SIDE_KEY = "pws.side.v1";
const wide = () => matchMedia("(min-width: 1100px)").matches;
function setSide(open) {
  if (!wide()) {
    // En pantallas pequeñas la lista se abre como panel.
    $("side").hidden = true;
    app.classList.remove("with-side");
    $("btn-side").setAttribute("aria-expanded", "false");
    if (open) showPanel("panel-queue", $("btn-side"));
    return;
  }
  $("side").hidden = !open;
  app.classList.toggle("with-side", open);
  $("btn-side").setAttribute("aria-expanded", String(open));
  store.set(SIDE_KEY, open);
  if (open) $("side-list").querySelector(".song.playing")?.scrollIntoView({ block: "nearest" });
}
function bindMenu() {
  $("btn-side").onclick = () => (wide() ? setSide($("side").hidden) : setSide(true));
  $("side-close").onclick = () => { setSide(false); $("btn-side").focus(); };
  $("btn-feedback").onclick = (e) => showPanel("panel-feedback", e.currentTarget);
  setSide(wide() && store.get(SIDE_KEY, true));
  matchMedia("(min-width: 1100px)").addEventListener("change", () => setSide(wide() && store.get(SIDE_KEY, true)));
}

// ---------- Opiniones ----------
function bindFeedback() {
  const form = $("form-feedback");
  const comment = $("fb-comment");
  $("fb-community").href = `${PROJECT.repo}/issues?q=label%3Aopinion`;
  comment.oninput = () => ($("fb-count").textContent = `${comment.value.length}/1000`);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
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
      form.reset();
      $("fb-count").textContent = "0/1000";
    }
  };
}

function renderMine() {
  const list = $("mine");
  const items = queue.map((q, i) => [q, i]).filter(([q]) => q.album.id === "mine");
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "hint";
    li.textContent = "Aún no agregaste videos.";
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
  const kind = new FormData(e.target).get("kind");
  const meta = await fetchTitle(id);
  const song = { id: `mine-${id}`, title: meta?.title ?? "Mi video", yt: id, bpm: 110, energy: "high", kind, channel: meta?.channel };
  mine = [...mine.filter((m) => m.id !== song.id), song];
  store.set(MINE_KEY, mine);
  const playingId = queue[current]?.song.id;
  buildQueue();
  current = queue.findIndex((q) => q.song.id === playingId);
  renderAlbums();
  e.target.reset();
  toast(`Agregado: ${song.title}`);
  playIndex(queue.findIndex((q) => q.song.id === song.id));
}

function markCurrent() {
  document.querySelectorAll(".song").forEach((b) => {
    const on = Number(b.dataset.index) === current;
    b.classList.toggle("playing", on);
    if (on) b.setAttribute("aria-current", "true");
    else b.removeAttribute("aria-current");
  });
}

// ---------- Reproducción ----------
function playIndex(i) {
  if (i < 0 || i >= queue.length) return;
  current = i;
  const { album, song } = queue[i];
  $("now-title").textContent = song.title;
  $("now-album").textContent = album.id === "mine" ? song.channel ?? "Mis videos" : `${album.title} · ${album.year}`;
  $("num-bpm").value = settings.bpm[song.id] ?? song.bpm;
  const art = $("np-art");
  album.palette.forEach((c, k) => art.style.setProperty(`--a${k + 1}`, c));
  $("empty").hidden = true;
  pattern = null;
  patternDuration = 0;
  markCurrent();
  startChallenge();
  renderRanking();
  player.load(song.yt, true);
  document.title = `${song.title} · Purple Wave Sync`;
  updateMediaSession();
}

function buildPattern() {
  const item = queue[current];
  const dur = player.duration();
  if (!item || !(dur > 0)) return;
  const bpm = Number(settings.bpm[item.song.id] ?? item.song.bpm);
  const opts = { styleOverride: settings.style === "auto" ? null : settings.style, safeMode: settings.safeMode };
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

function next(fromEnd = false) {
  if (current < 0) return playIndex(0);
  const album = queue[current].album;
  const nextItem = queue[current + 1];
  const albumEnds = !nextItem || nextItem.album.id !== album.id;
  if (fromEnd && albumEnds) {
    if (settings.albumEnd === "stop") return;
    if (settings.albumEnd === "repeat") return playIndex(queue.findIndex((q) => q.album.id === album.id));
  }
  playIndex(nextItem ? current + 1 : 0);
}
/** ¿Habrá otra canción después de esta según los ajustes? */
function willContinue() {
  if (current < 0) return false;
  const nextItem = queue[current + 1];
  const albumEnds = !nextItem || nextItem.album.id !== queue[current].album.id;
  return !(albumEnds && settings.albumEnd === "stop");
}

const LYRIC_NAMES = { ko: "coreano", es: "español", en: "inglés", ja: "japonés", pt: "portugués" };
function applyLyrics(announce) {
  $("btn-lyrics").setAttribute("aria-pressed", settings.lyrics);
  player?.setCaptions(settings.lyrics ? settings.lyricsLang : null);
  if (!announce) return;
  if (!settings.lyrics) return toast("Letra desactivada.");
  toast(`Letra en ${LYRIC_NAMES[settings.lyricsLang]} activada (subtítulos oficiales del video).`);
  setTimeout(() => {
    const info = player?.captionInfo();
    if (info && player.state === "playing" && !info.langs.some((l) => l.startsWith(settings.lyricsLang))) {
      toast(info.available ? "Este video no tiene letra en ese idioma. Prueba con otro en Ajustes." : "Este video no tiene subtítulos oficiales.");
    }
  }, 2500);
}

function prev() {
  if (player.time() > 5) return player.seek(0);
  playIndex(current > 0 ? current - 1 : queue.length - 1);
}
function togglePlay() {
  if (current < 0) return playIndex(0);
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
    const step = { ArrowRight: 5, ArrowLeft: -5, PageUp: 30, PageDown: -30 }[e.key];
    if (step) { e.preventDefault(); player.seek(Math.max(0, player.time() + step)); }
    if (e.key === "Home") player.seek(0);
  });
}

// ---------- Modo micrófono ----------
async function toggleMic() {
  if (mic) {
    mic.stop();
    mic = null;
    syncMicButtons();
    toast("Modo micrófono apagado.");
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
    toast("🎙 Modo micrófono: tus luces siguen la música que suena cerca.");
    requestWakeLock();
  } catch {
    mic = null;
    syncMicButtons();
    toast("No se pudo usar el micrófono. Revisa los permisos del navegador.");
  }
}
function syncMicButtons() {
  $("btn-mic").setAttribute("aria-pressed", Boolean(mic));
  $("btn-mic-2").textContent = mic ? "Apagar modo micrófono" : "Activar modo micrófono";
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

let lastUi = 0;
let lastLabel = "";
function frame(now) {
  requestAnimationFrame(frame);
  if (!player?.ready) return;
  const k = settings.brightness / 100;
  const total = Math.max(SIM_COUNT, sticks.length);
  let colors;

  if (fanchant?.running) {
    const kf = 0.25 + 0.75 * Math.exp(-(now - chantFlashAt) / 260);
    const c = hexToRgb(PURPLE).map((v) => v * kf);
    colors = Array.from({ length: total }, () => c);
  } else if (mic) {
    const c = mic.sample(now);
    colors = Array.from({ length: total }, () => c);
  } else {
    const dur = player.duration();
    if (current >= 0 && dur > 0 && (!pattern || Math.abs(dur - patternDuration) > 0.5)) buildPattern();
    const playing = player.state === "playing";
    // Se calcula un poco "adelante" para compensar la latencia del Bluetooth.
    const lt = player.time() + settings.latencyMs / 1000;
    colors = Array.from({ length: total }, (_, i) => (pattern && playing ? pattern.colorAt(lt, i, total) : [45, 20, 90]));
  }

  sticks.forEach((s, i) => s.setColor(colors[i].map((v) => v * k)));
  if (crowd) { crowd.setColor(colors[0].map((v) => Math.max(40, v * k))); crowd.draw(now); }

  // La interfaz se actualiza a ~20 fps para ahorrar batería.
  if (now - lastUi < 50) return;
  lastUi = now;
  const hex = (c) => rgbToHex(c.map((v) => v * k));
  for (let i = 0; i < SIM_COUNT; i++) simEls[i].style.setProperty("--c", hex(colors[i]));
  $("big-bulb").style.setProperty("--c", hex(colors[0]));
  app.style.setProperty("--glow", rgbToHex(colors[0].map((v) => Math.max(30, v * 0.8))));
  sticks.forEach((s, i) => {
    const dot = document.querySelector(`.dot[data-index="${i}"]`);
    if (dot) dot.style.background = rgbToHex(colors[i]);
  });

  const t = player.time();
  const dur = player.duration();
  $("t-cur").textContent = fmt(t);
  $("t-dur").textContent = fmt(dur);
  $("playhead").style.left = dur ? `${(t / dur) * 100}%` : "0";
  const tl = $("timeline");
  tl.setAttribute("aria-valuemax", Math.round(dur));
  tl.setAttribute("aria-valuenow", Math.round(t));
  tl.setAttribute("aria-valuetext", `${fmt(t)} de ${fmt(dur)}`);

  // El océano del fondo "escala" con la canción: tenue en la intro, máximo en los coros.
  let energy = 0.35;
  if (mic) energy = 0.4 + Math.min(0.6, mic.level * 2);
  else if (pattern && player.state === "playing") {
    const l = pattern.sectionAt(t).label;
    energy = /coro final/.test(l) ? 1 : /coro/.test(l) ? 0.85 : /pre-coro|puente/.test(l) ? 0.65 : /verso/.test(l) ? 0.5 : /final/.test(l) ? 0.3 : 0.4;
    energy = Math.min(1, energy + (dur ? (t / dur) * 0.15 : 0)); // sube poco a poco a lo largo del video
  }
  app.style.setProperty("--energy", energy.toFixed(2));
  crowd?.setEnergy(energy);

  let label;
  if (mic) label = "🎙 Luces siguiendo el micrófono";
  else if (pattern && player.state === "playing") {
    const sec = pattern.sectionAt(t);
    label = `Luces: ${STYLES[sec.style].label} · ${sec.label}`;
  } else label = current >= 0 ? "En pausa" : "Luces listas";
  if (label !== lastLabel) {
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
  $("btn-fs").setAttribute("aria-label", on ? "Salir de pantalla completa" : "Pantalla completa");
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
  navigator.mediaSession.setActionHandler("nexttrack", () => next(false));
  navigator.mediaSession.setActionHandler("previoustrack", prev);
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
  $("sel-lyrics").value = settings.lyricsLang;
  $("chk-chant").checked = settings.chant;
  $("chk-chant-voice").checked = settings.chantVoice;
  $("sel-lyrics").onchange = (e) => { settings.lyricsLang = e.target.value; saveSettings(); applyLyrics(settings.lyrics); };
  $("chk-chant").onchange = (e) => { settings.chant = e.target.checked; saveSettings(); };
  $("chk-chant-voice").onchange = (e) => { settings.chantVoice = e.target.checked; saveSettings(); };
  $("sel-album-end").value = settings.albumEnd;
  sync();

  bright.oninput = () => { settings.brightness = +bright.value; sync(); saveSettings(); };
  lat.oninput = () => { settings.latencyMs = +lat.value; sync(); saveSettings(); };
  style.onchange = () => { settings.style = style.value; sync(); saveSettings(); pattern = null; };
  $("chk-safe").onchange = (e) => { settings.safeMode = e.target.checked; saveSettings(); pattern = null; };
  $("chk-wake").onchange = (e) => { settings.wake = e.target.checked; saveSettings(); if (!settings.wake) wakeLock?.release(); };
  $("sel-album-end").onchange = (e) => { settings.albumEnd = e.target.value; saveSettings(); };
  $("btn-auto").onclick = () => { settings.autoNext = !settings.autoNext; sync(); saveSettings(); toast(settings.autoNext ? "Pasará a la siguiente al terminar." : "Se detendrá al terminar cada video."); };
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
  let taps = [];
  $("btn-tap-tempo").onclick = () => {
    const now = performance.now();
    taps = taps.filter((t) => now - t < 3000);
    taps.push(now);
    if (taps.length >= 4) {
      const gaps = taps.slice(1).map((t, i) => t - taps[i]);
      const bpm = 60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length);
      setBpm(bpm);
      $("btn-tap-tempo").textContent = `${Math.round(bpm)} BPM`;
    } else $("btn-tap-tempo").textContent = `Toca… ${taps.length}/4`;
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
  $("tap-pad").textContent = challenge ? "Toca al ritmo" : "Activa el reto y escribe tu nickname";
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
  if (!c.qualifies) return toast(`Reto: necesitas al menos ${MIN_TAPS_FOR_RANKING} toques para entrar al ranking.`);
  const s = c.summary();
  const { remote } = await submitScore({
    handle: currentHandle(), network: $("sel-network").value, songId: item.song.id, albumId: item.album.id,
    score: s.score, accuracy: s.accuracy, maxCombo: s.maxCombo,
  });
  toast(`🏆 ${item.song.title}: ${s.score.toLocaleString("es")} puntos · ${s.accuracy}% · combo ${s.maxCombo}${remote ? " · ranking global" : ""}`, 7000);
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
  $("rank-caption").textContent = rankTab === "song" ? `Mejores puntuaciones en ${item.song.title}` : "Puntos de fan: suma de tu mejor puntuación en cada canción";
  $("rank-source").textContent = source === "global" ? "Ranking global." : "Ranking guardado en este dispositivo.";
  const me = currentHandle()?.toLowerCase();
  const myNet = $("sel-network").value;
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.textContent = "Aún no hay puntuaciones. ¡Sé la primera persona!";
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
  $("tap-pad").addEventListener("pointerdown", (e) => { e.preventDefault(); onTap(); });
  $("tap-pad").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTap(); } });
  bindTabs(["tab-song", "tab-all"], (id) => { rankTab = id === "tab-song" ? "song" : "all"; renderRanking(); });
  renderRanking();
}

// ---------- Inicio ----------
function onPlayerState(state) {
  const playing = state === "playing";
  $("play-icon").setAttribute("href", playing ? "#i-pause" : "#i-play");
  $("btn-play").setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
  app.classList.toggle("playing-now", playing);
  if (playing) {
    requestWakeLock();
    if (mic) toggleMic();
  }
  poke();
}
function selectViewTab(id) {
  ["view-video", "view-lights"].forEach((t) => {
    $(t).setAttribute("aria-selected", t === id);
    $(t).tabIndex = t === id ? 0 : -1;
  });
}

async function init() {
  setupSim();
  crowd = new Crowd($("crowd"), { reduceMotion: matchMedia("(prefers-reduced-motion: reduce)").matches });
  renderAlbums();
  renderFilms();
  renderSticks();
  bindPanels();
  bindSettings();
  renderDonations();
  bindGame();
  bindTimeline();
  bindTabs(["view-video", "view-lights"], (id) => setView(id === "view-video" ? "video" : "lights"));
  bindTabs(["qt-songs", "qt-concerts", "qt-mine"]);

  const support = bluetoothSupport();
  if (!support.ok) showBtWarning(IS_IOS ? "ios" : support.reason);

  $("btn-connect").onclick = onConnect;
  $("btn-next").onclick = () => { fanchant?.stop(); next(false); };
  $("btn-prev").onclick = () => { fanchant?.stop(); prev(); };
  fanchant = new Fanchant({
    onBeat: () => {
      chantFlashAt = performance.now();
      crowd?.flash();
    },
  });
  $("btn-lyrics").onclick = () => {
    settings.lyrics = !settings.lyrics;
    saveSettings();
    applyLyrics(true);
  };
  applyLyrics(false);
  $("btn-play").onclick = togglePlay;
  $("btn-mic").onclick = toggleMic;
  $("btn-mic-2").onclick = toggleMic;
  $("btn-fs").onclick = toggleFullscreen;
  $("form-add").onsubmit = onAddVideo;
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("webkitfullscreenchange", onFsChange);
  ["pointermove", "pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, poke, { passive: true }));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openPanel) return closePanel();
    if (e.target.closest("input, select, textarea, button, a, [role='slider']")) return;
    const k = e.key.toLowerCase();
    if (e.code === "Space") { e.preventDefault(); togglePlay(); }
    else if (k === "n") next(false);
    else if (k === "p") prev();
    else if (k === "b") onTap();
    else if (k === "f") toggleFullscreen();
  });

  const guide = new Guide({
    onConnect: async () => {
      if (!bluetoothSupport().ok) {
        toast(IS_IOS ? "En iPhone abre esta página en Bluefy para conectar." : "Este navegador no soporta Bluetooth web.");
        return;
      }
      await onConnect();
    },
    onTest: () => {
      // Prueba: morado, luego latido suave, luego morado fijo.
      const purple = hexToRgb(PURPLE);
      sticks.forEach((s) => s.setColor(purple));
      setTimeout(() => sticks.forEach((s) => s.setColor(purple.map((v) => v * 0.4))), 500);
      setTimeout(() => sticks.forEach((s) => s.setColor(purple)), 1000);
    },
    hasSticks: () => sticks.length > 0,
  });
  $("btn-guide").onclick = () => { closePanel(false); guide.open(); };
  bindMenu();
  bindFeedback();
  $("btn-clear-data").onclick = () => {
    if (!confirm("¿Borrar tus ajustes, nickname, puntajes y videos guardados en este dispositivo?")) return;
    clearAllLocalData();
    toast("Datos borrados. La página se recargará.");
    setTimeout(() => location.reload(), 1200);
  };
  // El micrófono se apaga al salir de la página o al ocultarla.
  addEventListener("pagehide", () => mic?.stop());
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && mic) toggleMic(); });
  const params = new URLSearchParams(location.search);
  let seen = false;
  try { seen = localStorage.getItem("pws.guide.seen") === "1"; } catch {}
  if (params.has("guia") || !seen) guide.open();

  player = new Player($("yt"), {
    onState: onPlayerState,
    onEnded: async () => {
      await finishChallenge();
      if (!settings.autoNext) return;
      const endedAt = current;
      if (settings.chant && willContinue()) {
        await fanchant.run({ voice: settings.chantVoice });
        if (current !== endedAt) return; // la persona eligió otra canción durante el fanchant
      }
      next(true);
    },
    onError: () => {
      toast("Este video no se puede reproducir aquí. Pasando al siguiente.");
      setTimeout(() => next(true), 1500);
    },
  });
  requestAnimationFrame(frame);
  await player.init();
  applyLyrics(false);

  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
}

init();
