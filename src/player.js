// Envoltura del reproductor de YouTube con reloj de alta precisión.
import { lang, t } from "./i18n.js";

let apiReady;
function loadYouTubeApi() {
  if (apiReady) return apiReady;
  apiReady = new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.append(s);
  });
  return apiReady;
}

export class Player {
  /** @param {HTMLElement} mount @param {{onEnded?:()=>void, onState?:(s:string)=>void, onError?:(e:number)=>void}} cb */
  constructor(mount, cb = {}) {
    this.mount = mount;
    this.cb = cb;
    this.yt = null;
    this.ready = false;
    this.state = "idle";
    this.lastRaw = 0;
    this.lastRawAt = 0;
  }

  /** Carga la API de YouTube y crea el reproductor (una sola vez; lo pide quien lo necesite primero). */
  init() { return (this.initP ??= this.#create()); }

  async #create() {
    const YT = await loadYouTubeApi();
    await new Promise((resolve) => {
      this.yt = new YT.Player(this.mount, {
        host: "https://www.youtube-nocookie.com", // modo de privacidad mejorada: sin cookies de seguimiento hasta reproducir
        width: "100%",
        height: "100%",
        // hl: idioma de la interfaz de YouTube; iv_load_policy 3: sin anotaciones encima del video.
        playerVars: { playsinline: 1, rel: 0, iv_load_policy: 3, hl: lang },
        events: {
          onReady: () => {
            this.ready = true;
            this.setTitle(this.title ?? "");
            // Lo que se pidió antes de que YouTube estuviera listo.
            if (this.pending) { const [id, autoplay] = this.pending; this.pending = null; this.load(id, autoplay); }
            resolve();
          },
          onStateChange: (e) => this.#onState(e.data),
          onError: (e) => this.cb.onError?.(e.data),
        },
      });
    });
  }

  #onState(code) {
    const map = { [-1]: "idle", 0: "ended", 1: "playing", 2: "paused", 3: "buffering", 5: "cued" };
    this.state = map[code] ?? "idle";
    this.cb.onState?.(this.state);
    if (this.state === "ended") this.cb.onEnded?.();
  }

  /** Nombre del iframe para lectores de pantalla: "Video de YouTube: SWIM". */
  setTitle(title) {
    this.title = title;
    try {
      const f = this.yt?.getIframe?.();
      if (f) f.title = title ? `${t("Video de YouTube")}: ${title}` : t("Video de YouTube");
    } catch {}
  }

  load(videoId, autoplay = true) {
    // Antes de que YouTube esté listo se recuerda el video; si hay que reproducirlo ya, se carga YouTube ahora.
    if (!this.ready) { this.pending = [videoId, autoplay]; if (autoplay) this.init(); return; }
    this.lastRaw = 0;
    this.lastRawAt = performance.now();
    if (autoplay) this.yt.loadVideoById(videoId);
    else this.yt.cueVideoById(videoId);
  }

  play() { this.yt?.playVideo(); }
  pause() { this.yt?.pauseVideo(); }
  toggle() { this.state === "playing" ? this.pause() : this.play(); }
  seek(sec) { this.yt?.seekTo(sec, true); }

  duration() {
    return this.ready ? this.yt.getDuration() || 0 : 0;
  }

  /**
   * Tiempo actual en segundos. getCurrentTime() avanza a saltos, así que entre
   * muestras se extrapola con performance.now() para que las luces no "tartamudeen".
   */
  time() {
    if (!this.ready) return 0;
    const raw = this.yt.getCurrentTime() || 0;
    const now = performance.now();
    if (raw !== this.lastRaw) {
      this.lastRaw = raw;
      this.lastRawAt = now;
      return raw;
    }
    if (this.state !== "playing") return raw;
    const rate = this.yt.getPlaybackRate?.() || 1;
    return raw + Math.min(0.5, ((now - this.lastRawAt) / 1000) * rate);
  }
}
