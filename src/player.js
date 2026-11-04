// Envoltura del reproductor de YouTube con reloj de alta precisión.

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

  async init() {
    const YT = await loadYouTubeApi();
    await new Promise((resolve) => {
      this.yt = new YT.Player(this.mount, {
        host: "https://www.youtube-nocookie.com", // modo de privacidad mejorada: sin cookies de seguimiento hasta reproducir
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            this.ready = true;
            resolve();
          },
          onStateChange: (e) => this.#onState(e.data),
          onError: (e) => this.cb.onError?.(e.data),
          // El módulo de subtítulos se carga después de empezar a reproducir.
          onApiChange: () => this.#applyCaptions(),
        },
      });
    });
  }

  /**
   * Letra: activa los subtítulos oficiales del video (los que publica el canal) en el idioma pedido.
   * No incluimos letras en el proyecto; dependen de que el video tenga esa pista.
   * @param {string|null} lang "ko", "es", "en"… o null para apagar.
   */
  setCaptions(lang) {
    this.captionLang = lang;
    this.#applyCaptions();
  }

  /** @returns {{available:boolean, langs:string[]}} */
  captionInfo() {
    try {
      const list = this.yt?.getOption?.("captions", "tracklist") ?? [];
      return { available: list.length > 0, langs: list.map((t) => t.languageCode) };
    } catch {
      return { available: false, langs: [] };
    }
  }

  #applyCaptions() {
    if (!this.ready) return;
    try {
      if (this.captionLang) {
        this.yt.loadModule("captions");
        this.yt.setOption("captions", "track", { languageCode: this.captionLang });
        this.yt.setOption("captions", "fontSize", 1);
      } else {
        this.yt.setOption("captions", "track", {});
        this.yt.unloadModule("captions");
      }
    } catch {}
  }

  #onState(code) {
    const map = { [-1]: "idle", 0: "ended", 1: "playing", 2: "paused", 3: "buffering", 5: "cued" };
    this.state = map[code] ?? "idle";
    this.cb.onState?.(this.state);
    if (this.state === "ended") this.cb.onEnded?.();
  }

  load(videoId, autoplay = true) {
    if (!this.ready) return;
    this.lastRaw = 0;
    this.lastRawAt = performance.now();
    if (autoplay) this.yt.loadVideoById(videoId);
    else this.yt.cueVideoById(videoId);
    if (this.captionLang) setTimeout(() => this.#applyCaptions(), 1500);
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
