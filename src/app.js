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
import { favorites } from "./favorites.js";
import { Tour } from "./tour.js";
import { CameraColor } from "./camera.js";
import { shelves, upNext, myAlbums } from "./suggest.js";
import { songTheme } from "./palette.js";
import { PlayQueue } from "./queue.js";
import { initTooltips } from "./tooltip.js";

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
let startTourLater = () => {};
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
  // Si se abrió desde un menú (que se cierra), el foco vuelve al botón del menú.
  const pop = panelTrigger?.closest?.("[data-menu-for]");
  if (pop) panelTrigger = $(pop.dataset.menuFor);
  closeMenus();
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
  $("dock-bt").onclick = (e) => showPanel("panel-bt", e.currentTarget);
  $("home-connect").onclick = (e) => showPanel("panel-bt", e.currentTarget);
  document.addEventListener("pointerdown", (e) => {
    if (!openPanel) return;
    if (e.target.closest(".panel") || e.target.closest("dialog") || e.target.closest(".toast, #song-menu, .cq-ghost") || e.target.closest("[aria-controls^='panel-']") || e.target.closest("#btn-start")) return;
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
  const exploring = v === "explore";
  $("lights-view").hidden = v !== "lights";
  // En Explorar el video sigue sonando en un mini reproductor; sin canción, Video y Explorar muestran el inicio.
  $("video-view").hidden = v === "lights" || (exploring && current < 0);
  $("home").hidden = !(exploring || (v === "video" && current < 0));
  app.classList.toggle("exploring", exploring && current >= 0);
  app.dataset.view = v;
  requestAnimationFrame(() => placeMini(false));
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
  $("conn-label").textContent = n ? `${n} conectado${n > 1 ? "s" : ""} 💜` : "Conectar ARMY Bomb";
  $("btn-bt").classList.toggle("on", n > 0);
  $("dock-bt-label").textContent = n ? "Conectado" : "Conectar";
  $("dock-bt").classList.toggle("on", n > 0);
  $("home-connect").hidden = n > 0;
  // El nombre accesible empieza con el texto visible (WCAG 2.5.3).
  if (n) $("btn-bt").setAttribute("aria-label", `${n} conectado${n > 1 ? "s" : ""}. Administrar ARMY Bomb`);
  else $("btn-bt").removeAttribute("aria-label");
}

function showBtWarning(reason) {
  const w = $("bt-warning");
  w.hidden = false;
  if (reason === "ios") {
    w.innerHTML = `En iPhone y iPad, Safari no permite conectar por Bluetooth. Abre esta página en <a href="${BLUEFY_URL}" target="_blank" rel="noopener noreferrer">Bluefy</a> (gratis) para conectar tu ARMY Bomb. Mientras, puedes ver los videos y usar tu pantalla como lightstick.`;
  } else if (reason === "insecure") {
    w.textContent = "Para usar Bluetooth, abre la app desde su dirección segura (empieza con https://).";
  } else {
    w.textContent = "Este navegador no puede conectar por Bluetooth. Abre la página en Chrome o Edge (Android, Windows, Mac o Chromebook).";
  }
  $("btn-connect").disabled = true;
}

async function onConnect() {
  const btn = $("btn-connect");
  btn.disabled = true;
  btn.textContent = "Conectando…";
  try {
    const stick = await requestStick({ showAll: $("chk-all").checked });
    if (sticks.some((s) => s.id === stick.id)) return toast("Ese ARMY Bomb ya está conectado.");
    stick.device.addEventListener("gattserverdisconnected", () => {
      const i = sticks.indexOf(stick);
      if (i >= 0) sticks.splice(i, 1);
      renderSticks();
      toast(`${stick.name} se desconectó.`);
    });
    sticks.push(stick);
    renderSticks();
    stick.setColor(hexToRgb(PURPLE));
    toast(`¡${stick.name} conectado! Borahae 💜`);
  } catch (e) {
    if (e?.name !== "NotFoundError") toast("No pudimos conectar. Revisa que parpadee y prueba otra vez.");
  } finally {
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
  th.style.backgroundImage = `url(${thumbUrl(song.yt)})`;
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
  $("albums").replaceChildren(...albumNodes(false));
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
const artistOf = (item) => item.album.artist ?? (item.album.id === "mine" ? "mine" : "BTS");

function renderFilters() {
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
  const searching = terms.length > 0 || listFilter !== "all" || exploreAll;
  $("explore-results").hidden = !searching;
  $("home").classList.toggle("searching", searching);
  $("er-title").textContent = listFilter.startsWith("album:") ? queue.find((q) => q.album.id === listFilter.slice(6))?.album.title ?? "Resultados" : terms.length ? "Resultados" : listFilter === "all" ? "Todos los álbumes" : FILTER_NAMES[listFilter] ?? listFilter;
  for (const list of [$("albums"), $("explore-list")]) {
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
}

function bindSearch() {
  const inputs = [$("search-panel"), $("search-explore")];
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
  toast(`Video agregado: ${song.title}`);
  playIndex(queue.findIndex((q) => q.song.id === song.id));
}

function markCurrent() {
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
  document.querySelectorAll(".song").forEach((b) => {
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
  markCurrent();
  startChallenge();
  renderRanking();
  player.load(videoFor(song), autoplay);
  $("mini-title").textContent = song.title;
  $("np-open").dataset.tip = `Ahora suena: ${song.title}`;
  maybeNudgeSupport();
  if (view === "video") $("home").hidden = true;
  setView(view);
  document.title = `${song.title} · Purple Wave Sync`;
  updateLyricsBar();
  updateMediaSession();
  renderUpNext();
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

/** Con "Letra" activada se usa el video oficial con la letra en pantalla, si existe. */
function videoFor(song) {
  return settings.lyrics && song.lyricVideo ? song.lyricVideo : song.yt;
}

const LYRIC_NAMES = { ko: "coreano", es: "español", en: "inglés", ja: "japonés", pt: "portugués" };
function updateLyricsBar() {
  const bar = $("lyrics-bar");
  const item = queue[current];
  bar.hidden = !settings.lyrics || !item;
  if (bar.hidden) return;
  $("lb-text").textContent = item.song.lyricVideo ? "Video oficial con la letra en pantalla" : `${LYRIC_NAMES[settings.lyricsLang][0].toUpperCase()}${LYRIC_NAMES[settings.lyricsLang].slice(1)}${settings.lyricsLang === "ko" ? " (hangul)" : ""} · subtítulos oficiales del video`;
  // Enlace externo a la letra completa (no copiamos letras en la app).
  $("lb-link").href = `https://genius.com/search?q=${encodeURIComponent(`BTS ${item.song.title.replace(/\s*\(.*?\)/g, "")}`)}`;
}

function applyLyrics(announce) {
  $("btn-lyrics").setAttribute("aria-pressed", settings.lyrics);
  updateLyricsBar();
  const song = queue[current]?.song;
  // Cambia entre el MV y el video oficial con letra, conservando el punto de la canción.
  if (announce && song?.lyricVideo && player?.ready) {
    const t = player.time();
    const playing = player.state === "playing";
    player.load(videoFor(song), playing);
    if (t > 2) setTimeout(() => player.seek(t), 900);
    pattern = null;
  }
  player?.setCaptions(settings.lyrics && !song?.lyricVideo ? settings.lyricsLang : null);
  if (!announce) return;
  if (!settings.lyrics) return toast("Letra oculta.");
  if (song?.lyricVideo) return toast("Letra activada: cambiamos al video oficial con letra.");
  toast(`Letra en ${LYRIC_NAMES[settings.lyricsLang]} activada.`);
  setTimeout(() => {
    const info = player?.captionInfo();
    if (info && player.state === "playing" && !info.langs.some((l) => l.startsWith(settings.lyricsLang))) {
      toast(info.available ? `Sin letra en ${LYRIC_NAMES[settings.lyricsLang]}. Prueba otro idioma en Ajustes.` : "Este video no trae subtítulos oficiales.");
    }
  }, 2500);
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
    const step = { ArrowRight: 5, ArrowLeft: -5, PageUp: 30, PageDown: -30 }[e.key];
    if (step) { e.preventDefault(); player.seek(Math.max(0, player.time() + step)); }
    if (e.key === "Home") player.seek(0);
  });
}

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
function syncMicButtons() {
  $("btn-mic").setAttribute("aria-pressed", Boolean(mic));
  syncLiveButton();
  $("btn-mic-2").textContent = mic ? "Apagar micrófono" : "Activar micrófono";
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
let lastSave = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (!player?.ready) { crowd?.draw(now); return; } // el fondo se dibuja aunque YouTube aún no cargue
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
  app.classList.toggle("chorus", energy >= 0.85);
  if (now - lastSave > 5000 && player.state === "playing") { lastSave = now; saveQueue(); }
  updateUpNextCard(t, dur);
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
const LIGHT_NAME = ["", "suaves", "medias", "intensas"];
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
  return [item.song.title, soloArtist(item), type === "MV" ? "video musical" : type.toLowerCase(), item.song.lyricVideo ? "con letra" : "", `luces ${LIGHT_NAME[lightLevel(item)]}`, playedHistory.includes(item.song.id) ? "escuchada" : ""]
    .filter(Boolean).join(", ");
}
/** Línea 2 de una fila: artista (si es solista) + chips de tipo y letra. */
function metaLine(item, { tag = "", fallback = "" } = {}) {
  const line = document.createElement("span");
  line.className = "s-meta meta-line";
  const add = (text, cls) => { const el = document.createElement("span"); el.className = cls; el.textContent = text; line.append(el); };
  if (tag) add(tag, "m-tag");
  const artist = soloArtist(item);
  if (artist) add(artist, "m-artist");
  const type = videoType(item.song);
  if (type !== "MV") add(type, "chip-type");
  if (item.song.lyricVideo) add("Con letra", "badge-lyrics");
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
  g.dataset.tip = `Luces ${LIGHT_NAME[lvl]}`;
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
  lyrics: { eyebrow: "Letra", title: "Con letra en pantalla", sub: "Videos oficiales con la letra en el video.", ko: "가사" },
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
  const icon = document.createElement("span");
  icon.className = "sg-icon";
  icon.innerHTML = `<svg aria-hidden="true"><use href="#i-play"/></svg>`;
  th.append(img, icon);
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
  like.onclick = () => {
    const now = favorites.toggle(song.id);
    like.classList.remove("pop"); void like.offsetWidth; like.classList.add("pop");
    toast(now ? `💜 ${song.title} guardada en Me gusta` : `${song.title} ya no está en Me gusta`, 2000);
  };
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
  $("q-upnext").hidden = !items.length;
  $("q-upnext-row").replaceChildren(...items.map(({ i, tag, uid }) => suggestCard(i, { compact: true, tag, uid })));
  $("upnext-list").replaceChildren(...items.slice(0, 3).map(({ i, tag, uid }) => suggestCard(i, { compact: true, tag, uid })));
}
/** Muestra la tarjeta en los últimos segundos del video (se puede ocultar). */
function updateUpNextCard(t, dur) {
  const card = $("upnext");
  const left = dur - t;
  const show = card.dataset.force === "1" ||
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
function renderCollections() {
  const { ids, derived } = myAlbums(queue, { saved: savedAlbums, likes: favorites.list() });
  $("ma-row").replaceChildren(...ids.slice(0, 12).map(albumCard));
  $("ma-row").hidden = !ids.length;
  $("ma-sub").hidden = !derived;
  $("ma-empty").hidden = ids.length > 0;
  const liked = likedIndices();
  const ctxIds = liked.map((i) => queue[i].song.id);
  $("ls-row").replaceChildren(...liked.slice(0, 24).map((i, k) => suggestCard(i, { ctx: { context: ctxIds.slice(k + 1), source: ctxIds, label: "Canciones que me gustan", kind: "list" } })));
  $("ls-row").hidden = !liked.length;
  $("ls-actions").hidden = !liked.length;
  $("ls-empty").hidden = liked.length > 0;
  markCurrent();
}
function bindCollections() {
  $("ls-play").onclick = () => playLiked(false);
  $("ls-shuffle").onclick = () => playLiked(true);
  $("ma-explore").onclick = () => { exploreAll = true; listFilter = "all"; renderFilters(); applySearch(); $("search-explore").focus(); requestAnimationFrame(() => $("explore-results").scrollIntoView({ block: "start" })); };
  $("er-clear").onclick = () => {
    exploreAll = false;
    listFilter = "all";
    searchQuery = "";
    ["search-panel", "search-explore"].forEach((x) => ($(x).value = ""));
    renderFilters();
    applySearch();
    $("search-explore").focus();
  };
}

// ---------- Biblioteca (columna izquierda) ----------
const RAIL_KEY = "pws.rail.v1";
function railPreferred() {
  const saved = store.get(RAIL_KEY, null);
  return typeof saved === "boolean" ? saved : innerWidth < 1280;
}
function applyRail(on) {
  app.classList.toggle("rail", on);
  $("side-rail").setAttribute("aria-pressed", String(on));
  $("side-rail").setAttribute("aria-label", on ? "Expandir biblioteca" : "Contraer biblioteca");
  $("side-rail").dataset.tip = on ? "Expandir" : "Contraer";
}
function libItem(index, { sub = "" } = {}) {
  const { album, song } = queue[index];
  const li = document.createElement("li");
  const b = document.createElement("button");
  b.type = "button";
  b.className = "lib-row";
  b.dataset.index = index;
  b.setAttribute("aria-label", `Reproducir ${songLabel(queue[index])}`);
  const th = document.createElement("span");
  th.className = "thumb";
  th.style.backgroundImage = `url(${thumbUrl(song.yt)})`;
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
  return li;
}
function renderLibrary() {
  $("lib-n-likes").textContent = favorites.count();
  $("lib-n-albums").textContent = savedAlbums.length;
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
  $("lib-recent").replaceChildren(...recent.map((i) => libItem(i)));
  $("lib-recent-empty").hidden = recent.length > 0;
}
/** Acciones de la biblioteca (también los accesos de Explorar en teléfono). */
function goLibrary(where, trigger) {
  const toExplore = (then) => { if (view !== "explore") $("view-explore").click(); requestAnimationFrame(then); };
  if (where === "explore") return toExplore(() => {});
  if (where === "search") return toExplore(() => $("search-explore").focus());
  if (where === "likes" || where === "albums") {
    exploreAll = false;
    listFilter = "all";
    renderFilters();
    applySearch();
    return toExplore(() => $(where === "likes" ? "liked-songs" : "my-albums").scrollIntoView({ block: "start", behavior: "smooth" }));
  }
  if (where === "cola") { showPanel("panel-cola", trigger); return renderCola(); }
  if (where === "mine" || where === "concerts") {
    showPanel("panel-queue", trigger);
    $(where === "mine" ? "qt-mine" : "qt-concerts").click();
  }
}
function bindLibrary() {
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]");
    if (b) goLibrary(b.dataset.go, b);
  });
  applyRail(railPreferred());
  $("side-rail").onclick = () => { const on = !app.classList.contains("rail"); store.set(RAIL_KEY, on); applyRail(on); };
  addEventListener("resize", () => { if (typeof store.get(RAIL_KEY, null) !== "boolean") applyRail(innerWidth < 1280); });
  $("btn-feedback-2").onclick = (e) => showPanel("panel-feedback", e.currentTarget);
  const sponsor = DONATIONS.find((d) => d.url)?.url ?? PROJECT.repo;
  ["lib-support", "ex-support", "nudge-link"].forEach((id) => ($(id).href = sponsor));
  $("nudge-close").onclick = () => ($("support-nudge").hidden = true);
}

// ---------- Ahora suena (columna derecha ≥ 1280 px; hoja en pantallas chicas) ----------
const NP_KEY = "pws.np.v1";
const channelCache = new Map();
const npDocked = () => matchMedia("(min-width: 1280px)").matches;
function setNpOpen(open) {
  if (npDocked()) {
    $("np-side").hidden = !open;
    app.classList.toggle("with-np", open);
    store.set(NP_KEY, open);
  } else {
    app.classList.remove("with-np");
    if (open) showPanel("np-side", $("np-open")); else if (openPanel === "np-side") closePanel();
  }
  $("np-open").setAttribute("aria-expanded", String(open));
  if (open) renderNowPanel();
  requestAnimationFrame(() => placeMini(false));
}
function npList(listEl, indices, opts) {
  listEl.replaceChildren(...indices.map((i) => libItem(i, opts)));
  listEl.closest("section").hidden = !indices.length;
}
async function renderNowPanel() {
  if ($("np-side").hidden) return;
  const item = queue[current];
  $("nps-empty").hidden = Boolean(item);
  $("nps-main").hidden = !item;
  if (!item) return;
  const { album, song } = item;
  $("nps-img").src = thumbUrl(song.yt);
  $("nps-title").textContent = song.title;
  const artist = album.id === "mine" ? song.channel ?? "Mis videos" : album.artist ?? "BTS";
  $("nps-artist").textContent = artist;
  $("nps-album-name").textContent = album.id === "mine" ? "Mis videos" : `${album.title}${album.year ? ` · ${album.year}` : ""}`;
  $("nps-album").disabled = album.id === "mine";
  $("nps-swatches").replaceChildren(...album.palette.slice(0, 3).map((c) => { const i = document.createElement("i"); i.style.background = c; return i; }));
  // Solo datos que tenemos: tipo de video, letra, intensidad de luces y canal oficial.
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
  $("nps-like").querySelector("span").textContent = liked ? "Te gusta" : "Me gusta";
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
function bindNowPanel() {
  $("np-open").onclick = () => {
    const open = npDocked() ? $("np-side").hidden : openPanel !== "np-side";
    setNpOpen(open);
  };
  $("nps-close").onclick = () => setNpOpen(false);
  $("nps-like").onclick = () => { const id = queue[current]?.song.id; if (id) { const on = favorites.toggle(id); toast(on ? "💜 Guardada en Me gusta" : "Quitada de Me gusta", 2000); } };
  $("nps-save").onclick = () => { const al = queue[current]?.album; if (al) toggleAlbum(al); };
  $("nps-album").onclick = () => { const al = queue[current]?.album; if (al && al.id !== "mine") openAlbum(al.id); };
  matchMedia("(min-width: 1280px)").addEventListener("change", () => {
    if (npDocked()) setNpOpen(store.get(NP_KEY, false));
    else { $("np-side").hidden = true; app.classList.remove("with-np"); }
  });
  if (npDocked() && store.get(NP_KEY, false)) setNpOpen(true);
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

// ---------- Apoyo: un aviso discreto, una vez por sesión, tras la quinta canción ----------
let songsThisSession = 0;
function maybeNudgeSupport() {
  songsThisSession++;
  if (songsThisSession !== 5) return;
  try { if (sessionStorage.getItem("pws.nudge")) return; sessionStorage.setItem("pws.nudge", "1"); } catch { return; }
  const n = $("support-nudge");
  n.hidden = false;
  setTimeout(() => (n.hidden = true), 15000);
}

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
  $("btn-live").querySelector("span").textContent = cam ? "En concierto" : mic ? "Micrófono" : "Concierto";
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
  if (!$("panel-cola").hidden) renderCola();
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
function toastAction(msg, label, fn, ms = 6000) {
  const t = $("toast");
  t.replaceChildren(document.createTextNode(msg));
  const b = document.createElement("button");
  b.type = "button";
  b.className = "toast-action";
  b.textContent = label;
  b.onclick = () => { t.hidden = true; fn(); };
  t.append(b);
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), ms);
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
    $(id).setAttribute("aria-label", pq.shuffle ? "Aleatorio: sí" : "Aleatorio: no");
  }
  for (const id of ["btn-repeat", "cq-repeat"]) {
    const b = $(id);
    b.setAttribute("aria-pressed", pq.repeat !== "off");
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
  $("btn-cola").onclick = (e) => { showPanel("panel-cola", e.currentTarget); renderCola(); };
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
  th.style.backgroundImage = `url(${thumbUrl(item.song.yt)})`;
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
    th.style.backgroundImage = `url(${thumbUrl(cur.song.yt)})`;
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
  $("cq-user-sec").classList.toggle("empty", !pq.userQueue.length);
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
    const b = e.target.closest(".song, .sg-play");
    if (!b) return;
    e.preventDefault();
    openSongMenu(Number(b.dataset.index), b, { x: e.clientX, y: e.clientY });
  });
  // Pulsación larga en pantallas táctiles (iOS no dispara contextmenu).
  let timer = 0, startX = 0, startY = 0, longPressed = false;
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest(".song, .sg-play");
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
  m.setAttribute("aria-haspopup", "true");
  m.setAttribute("aria-controls", "song-menu");
  m.setAttribute("aria-expanded", "false");
  m.innerHTML = `<svg aria-hidden="true"><use href="#i-more"/></svg>`;
  return m;
}

// ---------- Explorar con mini reproductor ----------
const MINI = { corner: "br" };
function placeMini(animate) {
  const card = $("video-view");
  if (!app.classList.contains("exploring")) { card.style.removeProperty("--mx"); card.style.removeProperty("--my"); return; }
  const stage = $("main").getBoundingClientRect();
  const head = $("explore-head").getBoundingClientRect();
  const w = card.offsetWidth, h = card.offsetHeight, g = 12;
  const top = Math.max(g, head.bottom - stage.top + g);
  const pos = {
    tl: [g, top], tr: [stage.width - w - g, top],
    bl: [g, stage.height - h - g], br: [stage.width - w - g, stage.height - h - g],
  }[MINI.corner];
  card.classList.toggle("snapping", Boolean(animate));
  card.style.setProperty("--mx", `${Math.max(0, pos[0])}px`);
  card.style.setProperty("--my", `${Math.max(top, pos[1])}px`);
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
      const cx = x0 + ev.clientX - sx + card.offsetWidth / 2;
      const cy = y0 + ev.clientY - sy + card.offsetHeight / 2;
      MINI.corner = `${cy < stage.height / 2 ? "t" : "b"}${cx < stage.width / 2 ? "l" : "r"}`;
      placeMini(true);
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", up);
  });
  $("mini-play").onclick = () => togglePlay();
  $("mini-back").onclick = () => $("view-video").click();
  addEventListener("resize", () => placeMini(false));
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
  $("mini-play").setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
  $("mini-play").querySelector("use").setAttribute("href", playing ? "#i-pause" : "#i-play");
  if (playing && resumeAt > 3) { player.seek(resumeAt); resumeAt = 0; }
  app.classList.toggle("playing-now", playing);
  if (playing) {
    requestWakeLock();
    if (mic) toggleMic();
  }
  poke();
}
function selectViewTab(id) {
  ["view-video", "view-lights", "view-explore"].forEach((t) => {
    $(t).setAttribute("aria-selected", t === id);
    $(t).tabIndex = t === id ? 0 : -1;
  });
}

async function init() {
  setupSim();
  bindTheme();
  initTooltips();
  pq = new PlayQueue({ onContextEnd: contextEnd });
  crowd = new Crowd($("crowd"), { reduceMotion: matchMedia("(prefers-reduced-motion: reduce)").matches });
  crowd.setTheme?.(document.documentElement.dataset.theme);
  renderAlbums();
  renderFilms();
  renderSticks();
  bindPanels();
  bindSettings();
  bindRangeFill();
  renderDonations();
  bindGame();
  bindTimeline();
  bindTabs(["view-video", "view-lights", "view-explore"], (id) => switchView({ "view-video": "video", "view-lights": "lights", "view-explore": "explore" }[id]));
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
    if (e.key === "Escape" && !$("song-menu").hidden) return closeSongMenu(true);
    if (e.key === "Escape" && document.querySelector(".menu-pop:not([hidden])")) return closeMenus();
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
        toast(IS_IOS ? "En iPhone, abre esta página en Bluefy para conectar." : "Este navegador no puede conectar por Bluetooth.");
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
    stickNames: () => sticks.map((s) => s.name),
    onDone: (name) => { toast(`💜 ¡${name} listo! Ahora elige una canción.`); if (!Tour.done) setTimeout(() => startTourLater(), 1200); },
  });
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
  });
  $("btn-concert").onclick = toggleConcert;
  const firstLike = () => [...document.querySelectorAll("#home .sg-like, #albums .like-btn")].find((b) => b.getBoundingClientRect().width > 0);
  const tour = new Tour();
  const startTour = () => {
    document.querySelectorAll("[data-tour='like']").forEach((el) => el.removeAttribute("data-tour"));
    firstLike()?.setAttribute("data-tour", "like");
    tour.start();
  };
  $("btn-tour").onclick = () => { closePanel(false); Tour.reset(); setTimeout(startTour, 250); };
  bindFeedback();
  $("btn-clear-data").onclick = () => {
    if (!confirm("¿Borrar tus ajustes, nickname, puntajes, Me gusta, álbumes, historial y videos de este dispositivo? No se puede deshacer.")) return;
    clearAllLocalData();
    toast("Listo, datos borrados. La página se recargará.");
    setTimeout(() => location.reload(), 1200);
  };
  // El micrófono se apaga al salir de la página o al ocultarla.
  addEventListener("pagehide", () => { mic?.stop(); cam?.stop(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && mic) toggleMic(); });
  const params = new URLSearchParams(location.search);
  if ((params.has("guide") || params.has("guia")) || !guide.seen) guide.open();
  else if (!Tour.done) setTimeout(startTour, 1500);
  startTourLater = () => startTour();
  // Si la persona omite la guía, el recorrido empieza después.
  $("g-skip").addEventListener("click", () => { if (!Tour.done) setTimeout(startTour, 500); });
  // Enlace directo a una canción: /player/?song=dynamite
  const songParam = params.get("song");
  if (songParam && /^[a-z0-9-]{1,80}$/.test(songParam)) {
    const idx = queue.findIndex((q) => q.song.id === songParam);
    if (idx >= 0) setTimeout(() => playIndex(idx), 800);
  }

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
      toast("YouTube no deja ver este video aquí. Pasamos al siguiente.");
      setTimeout(() => next(true), 1500);
    },
  });
  requestAnimationFrame(frame);
  await player.init();
  applyLyrics(false);
  // Retoma la cola guardada (en pausa) si no se pidió una canción por enlace.
  if (!(songParam && /^[a-z0-9-]{1,80}$/.test(songParam))) restoreQueue();

  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("../sw.js", { scope: "../" }).catch(() => {});
}

init();
