import { ALBUMS, flatQueue } from "./catalog.js";
import { STYLES, generatePattern, rgbToHex } from "./patterns.js";
import { bluetoothSupport, requestStick } from "./ble.js";
import { Player } from "./player.js";
import { DONATIONS, PROJECT } from "./config.js";
import { RhythmChallenge, MIN_TAPS_FOR_RANKING } from "./rhythm.js";
import { NETWORKS, loadProfile, normalizeHandle, profileUrl, saveProfile, submitScore, topScores } from "./leaderboard.js";

const $ = (id) => document.getElementById(id);
const SIM_COUNT = 7; // lightsticks virtuales en la vista previa

// ---------- Ajustes persistentes (solo comodidad por navegador) ----------
const SETTINGS_KEY = "pws.settings.v1";
const defaults = {
  brightness: 100,
  latencyMs: 60,
  style: "auto",
  safeMode: true,
  autoNext: true,
  albumEnd: "next",
  bpm: {},
};
function loadSettings() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return { ...defaults };
  }
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}
const settings = loadSettings();
if (matchMedia("(prefers-reduced-motion: reduce)").matches) settings.safeMode = true;

// ---------- Estado ----------
const queue = flatQueue();
let current = -1; // índice en queue
let pattern = null;
let patternDuration = 0;
const sticks = [];
let player;

// ---------- Utilidades UI ----------
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 5000);
}
const fmt = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// ---------- Paso 1: Bluetooth ----------
function renderSticks() {
  const list = $("stick-list");
  list.replaceChildren(
    ...sticks.map((s, i) => {
      const li = document.createElement("li");
      li.className = "stick-item";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.dataset.index = i;
      const info = document.createElement("span");
      info.innerHTML = `<strong></strong><small></small>`;
      info.querySelector("strong").textContent = s.name;
      info.querySelector("small").textContent =
        `${s.family === "v4" ? "Ver. 4" : "SE / Ver. 3"}${s.battery != null ? ` · batería ${s.battery}%` : ""}`;
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
  const chip = $("conn-chip");
  chip.textContent = sticks.length ? `${sticks.length} lightstick${sticks.length > 1 ? "s" : ""} conectada${sticks.length > 1 ? "s" : ""}` : "Sin lightstick";
  chip.classList.toggle("on", sticks.length > 0);
}

async function onConnect() {
  const support = bluetoothSupport();
  if (!support.ok) return showBtWarning(support.reason);
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
    stick.setColor([138, 43, 226]);
    toast(`${stick.name} conectada 💜`);
  } catch (e) {
    if (e?.name !== "NotFoundError") toast(e?.message || "No se pudo conectar.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Conectar otra lightstick";
    if (!sticks.length) btn.textContent = "Conectar lightstick";
  }
}

function showBtWarning(reason) {
  const w = $("bt-warning");
  w.hidden = false;
  w.textContent = {
    ios: "Safari en iPhone/iPad no permite Bluetooth web. Usa la app Bluefy u otro navegador con Web Bluetooth.",
    browser: "Tu navegador no soporta Web Bluetooth. Usa Chrome o Edge en Android, Windows, macOS o ChromeOS.",
    insecure: "Abre la app desde https:// o localhost para usar Bluetooth.",
  }[reason];
}

// ---------- Paso 2: álbumes ----------
function renderAlbums() {
  const root = $("albums");
  root.replaceChildren(
    ...ALBUMS.map((album) => {
      const d = document.createElement("details");
      d.className = "album";
      d.dataset.album = album.id;
      const sum = document.createElement("summary");
      const sw = album.palette.map((c) => `<i style="background:${c}"></i>`).join("");
      sum.innerHTML = `<span class="swatches" aria-hidden="true">${sw}</span><span class="a-title"></span><span class="a-year"></span>`;
      sum.querySelector(".a-title").textContent = album.title;
      sum.querySelector(".a-year").textContent = `${album.year} · ${album.songs.length} canción${album.songs.length > 1 ? "es" : ""}`;
      const ol = document.createElement("ol");
      album.songs.forEach((song) => {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.type = "button";
        b.className = "song";
        b.dataset.song = song.id;
        b.innerHTML = `<span class="s-title"></span><span class="s-meta"></span>`;
        b.querySelector(".s-title").textContent = song.title;
        b.querySelector(".s-meta").textContent = { high: "Baile", mid: "Medio tiempo", ballad: "Balada" }[song.energy];
        b.onclick = () => playIndex(queue.findIndex((q) => q.song.id === song.id));
        li.append(b);
        ol.append(li);
      });
      d.append(sum, ol);
      return d;
    }),
  );
  root.querySelector("details")?.setAttribute("open", "");
}

function markCurrent() {
  document.querySelectorAll(".song").forEach((b) => {
    const on = queue[current]?.song.id === b.dataset.song;
    b.classList.toggle("playing", on);
    if (on) b.setAttribute("aria-current", "true");
    else b.removeAttribute("aria-current");
  });
  const album = queue[current]?.album;
  if (album) document.querySelector(`details[data-album="${album.id}"]`)?.setAttribute("open", "");
}

// ---------- Paso 3: reproducción ----------
function playIndex(i) {
  if (i < 0 || i >= queue.length) return;
  current = i;
  const { album, song } = queue[i];
  $("now-title").textContent = song.title;
  $("now-album").textContent = `${album.title} · ${album.year}`;
  $("num-bpm").value = settings.bpm[song.id] ?? song.bpm;
  pattern = null;
  patternDuration = 0;
  markCurrent();
  startChallenge();
  renderRanking();
  player.load(song.yt, true);
  document.title = `${song.title} · Purple Wave Sync`;
}

function buildPattern() {
  const item = queue[current];
  const dur = player.duration();
  if (!item || !(dur > 0)) return;
  const song = { ...item.song, bpm: Number(settings.bpm[item.song.id] ?? item.song.bpm) };
  pattern = generatePattern(song, item.album, dur, {
    styleOverride: settings.style === "auto" ? null : settings.style,
    safeMode: settings.safeMode,
  });
  patternDuration = dur;
  renderTimeline();
}

function renderTimeline() {
  const tl = $("timeline");
  tl.querySelectorAll(".seg").forEach((n) => n.remove());
  if (!pattern) return;
  for (const s of pattern.sections) {
    const seg = document.createElement("div");
    seg.className = "seg";
    seg.style.left = `${(s.start / patternDuration) * 100}%`;
    seg.style.width = `${((s.end - s.start) / patternDuration) * 100}%`;
    seg.style.background = rgbToHex(s.color);
    seg.title = `${s.label}: ${STYLES[s.style].label}`;
    tl.prepend(seg);
  }
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
function prev() {
  if (player.time() > 5) return player.seek(0);
  playIndex(current > 0 ? current - 1 : queue.length - 1);
}

// ---------- Bucle de sincronía ----------
const simEls = [];
function setupSim() {
  const sim = $("sim");
  for (let i = 0; i < SIM_COUNT; i++) {
    const el = document.createElement("div");
    el.className = "bulb";
    sim.append(el);
    simEls.push(el);
  }
}

let lastStyleShown = "";
function frame() {
  requestAnimationFrame(frame);
  if (!player?.ready) return;
  const dur = player.duration();
  if (current >= 0 && dur > 0 && (!pattern || Math.abs(dur - patternDuration) > 0.5)) buildPattern();

  const t = player.time();
  $("t-cur").textContent = fmt(t);
  $("t-dur").textContent = fmt(dur);
  $("playhead").style.left = dur ? `${(t / dur) * 100}%` : "0";

  const playing = player.state === "playing";
  const k = settings.brightness / 100;
  // Las luces se calculan un poco "adelante" para compensar la latencia del Bluetooth.
  const lt = t + settings.latencyMs / 1000;
  const total = Math.max(SIM_COUNT, sticks.length);

  for (let i = 0; i < SIM_COUNT; i++) {
    const c = pattern && playing ? pattern.colorAt(lt, i, total) : [40, 16, 70];
    simEls[i].style.setProperty("--c", rgbToHex(c.map((v) => v * k)));
  }
  sticks.forEach((s, i) => {
    const c = pattern && playing ? pattern.colorAt(lt, i, total) : [30, 10, 60];
    s.setColor(c.map((v) => v * k));
    const dot = document.querySelector(`.dot[data-index="${i}"]`);
    if (dot) dot.style.background = rgbToHex(c);
  });

  if (pattern) {
    const sec = pattern.sectionAt(t);
    const label = STYLES[sec.style].label;
    if (label !== lastStyleShown) {
      lastStyleShown = label;
      $("now-style").textContent = label;
    }
    $("now-section").textContent = playing ? `Parte: ${sec.label}` : "En pausa";
  }
}

// ---------- Ajustes ----------
function bindSettings() {
  const bright = $("rng-bright"), lat = $("rng-latency"), style = $("sel-style");
  style.append(new Option("Automático (según la canción)", "auto"));
  for (const [id, s] of Object.entries(STYLES)) style.append(new Option(s.label, id));

  const sync = () => {
    $("out-bright").textContent = `${settings.brightness}%`;
    $("out-latency").textContent = `${settings.latencyMs >= 0 ? "+" : ""}${settings.latencyMs} ms`;
    $("style-help").textContent =
      settings.style === "auto" ? "Cada parte de la canción usa un estilo distinto, como en un concierto." : STYLES[settings.style].description;
  };
  bright.value = settings.brightness;
  lat.value = settings.latencyMs;
  style.value = settings.style;
  $("chk-safe").checked = settings.safeMode;
  $("chk-auto").checked = settings.autoNext;
  $("sel-album-end").value = settings.albumEnd;
  sync();

  bright.oninput = () => { settings.brightness = +bright.value; sync(); saveSettings(); };
  lat.oninput = () => { settings.latencyMs = +lat.value; sync(); saveSettings(); };
  style.onchange = () => { settings.style = style.value; sync(); saveSettings(); pattern = null; };
  $("chk-safe").onchange = (e) => { settings.safeMode = e.target.checked; saveSettings(); pattern = null; };
  $("chk-auto").onchange = (e) => { settings.autoNext = e.target.checked; saveSettings(); };
  $("sel-album-end").onchange = (e) => { settings.albumEnd = e.target.value; saveSettings(); };
  $("num-bpm").onchange = (e) => {
    const item = queue[current];
    const v = Number(e.target.value);
    if (!item || !(v >= 40 && v <= 220)) return;
    settings.bpm[item.song.id] = v;
    saveSettings();
    pattern = null;
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
      a.rel = "noopener";
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

function currentHandle() {
  return normalizeHandle($("inp-handle").value);
}

function startChallenge() {
  const item = queue[current];
  const ok = $("chk-game").checked && currentHandle() && item;
  challenge = ok ? new RhythmChallenge(Number(settings.bpm[item.song.id] ?? item.song.bpm)) : null;
  $("tap-pad").disabled = !challenge;
  $("tap-pad").textContent = challenge ? "Toca al ritmo" : "Activa el reto y escribe tu nickname";
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
  if (!c.qualifies) {
    toast(`Reto: necesitas al menos ${MIN_TAPS_FOR_RANKING} toques para entrar al ranking.`);
    return;
  }
  const s = c.summary();
  const { remote } = await submitScore({
    handle: currentHandle(),
    network: $("sel-network").value,
    songId: item.song.id,
    albumId: item.album.id,
    score: s.score,
    accuracy: s.accuracy,
    maxCombo: s.maxCombo,
  });
  toast(`🏆 ${item.song.title}: ${s.score.toLocaleString("es")} puntos · ${s.accuracy}% de precisión · combo ${s.maxCombo}${remote ? " · enviado al ranking global" : ""}`);
  renderRanking();
}

async function renderRanking() {
  const item = queue[current];
  const songId = rankTab === "song" ? item?.song.id ?? null : null;
  $("tab-song").setAttribute("aria-selected", rankTab === "song");
  $("tab-all").setAttribute("aria-selected", rankTab === "all");
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
    tr.innerHTML = `<td colspan="3">Aún no hay puntuaciones. ¡Sé la primera persona!</td>`;
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
      if (url) { name.href = url; name.target = "_blank"; name.rel = "noopener nofollow"; }
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
  $("tab-song").onclick = () => { rankTab = "song"; renderRanking(); };
  $("tab-all").onclick = () => { rankTab = "all"; renderRanking(); };
  renderRanking();
}

// ---------- Inicio ----------
function onPlayerState(state) {
  const btn = $("btn-play");
  const playing = state === "playing";
  btn.textContent = playing ? "⏸" : "▶";
  btn.setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
}

async function init() {
  setupSim();
  renderAlbums();
  renderSticks();
  bindSettings();
  renderDonations();
  bindGame();
  const support = bluetoothSupport();
  if (!support.ok) showBtWarning(support.reason);

  $("btn-connect").onclick = onConnect;
  $("btn-next").onclick = () => next(false);
  $("btn-prev").onclick = prev;
  $("btn-play").onclick = () => (current < 0 ? playIndex(0) : player.toggle());
  $("timeline").onclick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    player.seek(((e.clientX - r.left) / r.width) * player.duration());
  };

  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, select, textarea, button, summary, a")) return;
    if (e.code === "Space") { e.preventDefault(); $("btn-play").click(); }
    else if (e.key.toLowerCase() === "n") next(false);
    else if (e.key.toLowerCase() === "p") prev();
    else if (e.key.toLowerCase() === "b") onTap();
  });

  player = new Player($("yt"), {
    onState: onPlayerState,
    onEnded: async () => {
      await finishChallenge();
      if (settings.autoNext) next(true);
    },
    onError: () => { toast("Este video no está disponible aquí. Pasando a la siguiente."); setTimeout(() => next(true), 1500); },
  });
  requestAnimationFrame(frame);
  await player.init();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

init();
