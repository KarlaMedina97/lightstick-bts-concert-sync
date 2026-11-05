// Cola de reproducción tipo Spotify, sin dependencias del navegador (se prueba con node --test).
//
//   nowPlaying   la canción actual (id)
//   userQueue    lo que la persona agregó a mano: siempre suena primero y en orden
//   context      el resto de la lista desde donde se empezó (álbum, filtro, estante) o sugerencias
//   history      lo que ya sonó (para "Anterior")
//
// Las entradas llevan un `uid` propio para poder repetir una canción y moverla sin ambigüedad.
// Los ids son los de src/catalog.js (o "mine-…" para Mis videos).

const ID_RE = /^[a-z0-9-]{1,80}$/;
const HISTORY_MAX = 100;

/** PRNG pequeño y determinista (mulberry32) para que el aleatorio sea estable con su semilla. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seededShuffle(list, seed) {
  const out = [...list];
  const r = rng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const REPEAT_MODES = ["off", "all", "one"];

export class PlayQueue {
  /**
   * @param {{onContextEnd?: (q: PlayQueue, opts: {auto: boolean}) => ({ids: string[], label?: string, kind?: string} | null)}} [opts]
   *   Se llama cuando no queda nada en la cola ni en el contexto: devuelve el siguiente contexto
   *   (siguiente álbum, sugerencias…) o null para detenerse.
   */
  constructor({ onContextEnd } = {}) {
    this.onContextEnd = onContextEnd ?? (() => null);
    this.nowPlaying = null;
    this.userQueue = [];
    this.context = [];
    this.contextSource = []; // la lista completa del contexto (para "repetir todo")
    this.contextOrder = []; // orden original del contexto mientras está en aleatorio
    this.contextLabel = "";
    this.contextKind = "";
    this.history = [];
    this.shuffle = false;
    this.seed = 1;
    this.repeat = "off";
    this.uid = 0;
  }

  entry(id) { return { uid: ++this.uid, id }; }
  ids(list) { return list.map((e) => e.id); }

  /** Empieza una canción con su contexto (los ids que siguen después de ella). */
  start(id, { context = [], source, label = "", kind = "" } = {}) {
    if (this.nowPlaying) this.pushHistory(this.nowPlaying);
    this.nowPlaying = id;
    this.contextLabel = label;
    this.contextKind = kind;
    this.contextSource = [...(source ?? [id, ...context])];
    this.context = context.map((c) => this.entry(c));
    this.contextOrder = this.ids(this.context);
    if (this.shuffle) this.context = seededShuffle(this.context, this.seed);
    return id;
  }

  pushHistory(id) {
    this.history.push(id);
    if (this.history.length > HISTORY_MAX) this.history.splice(0, this.history.length - HISTORY_MAX);
  }

  /** "Reproducir a continuación": primero de la cola manual. */
  playNext(id) { const e = this.entry(id); this.userQueue.unshift(e); return e; }
  /** "Agregar a la cola": al final de la cola manual. */
  add(id) { const e = this.entry(id); this.userQueue.push(e); return e; }

  find(uid) {
    for (const name of ["userQueue", "context"]) {
      const i = this[name].findIndex((e) => e.uid === uid);
      if (i >= 0) return { list: name, index: i };
    }
    return null;
  }

  remove(uid) {
    const f = this.find(uid);
    if (!f) return null;
    const [e] = this[f.list].splice(f.index, 1);
    if (f.list === "context") this.contextOrder = this.removeOnce(this.contextOrder, e.id);
    return { ...f, entry: e };
  }
  removeOnce(list, id) { const i = list.indexOf(id); return i < 0 ? list : [...list.slice(0, i), ...list.slice(i + 1)]; }

  /** Mueve una entrada (también entre la cola manual y el contexto). */
  move(uid, toList, toIndex) {
    if (toList !== "userQueue" && toList !== "context") return false;
    const r = this.remove(uid);
    if (!r) return false;
    const list = this[toList];
    const i = Math.max(0, Math.min(list.length, toIndex));
    list.splice(i, 0, r.entry);
    if (toList === "context") this.contextOrder.push(r.entry.id);
    return true;
  }

  /** Salta a una entrada: lo que había antes en su lista pasa al historial. */
  jump(uid) {
    const f = this.find(uid);
    if (!f) return null;
    const skipped = this[f.list].splice(0, f.index + 1);
    const target = skipped.pop();
    if (this.nowPlaying) this.pushHistory(this.nowPlaying);
    skipped.forEach((e) => this.pushHistory(e.id));
    if (f.list === "context") skipped.concat(target).forEach((e) => (this.contextOrder = this.removeOnce(this.contextOrder, e.id)));
    this.nowPlaying = target.id;
    return target.id;
  }

  /** Lo que sonaría después, sin cambiar nada. */
  peek({ auto = false } = {}) {
    if (auto && this.repeat === "one" && this.nowPlaying) return this.nowPlaying;
    if (this.userQueue.length) return this.userQueue[0].id;
    if (this.context.length) return this.context[0].id;
    if (this.repeat === "all" && this.contextSource.length) return this.shuffle ? "(aleatorio)" : this.contextSource[0];
    const nextCtx = this.onContextEnd(this, { auto, peek: true });
    return nextCtx?.ids?.[0] ?? null;
  }

  /**
   * Avanza. Con auto (al terminar el video) respeta "repetir una".
   * @returns {string|null} id que debe sonar, o null para detenerse
   */
  next({ auto = false } = {}) {
    if (auto && this.repeat === "one" && this.nowPlaying) return this.nowPlaying;
    let e = this.userQueue.shift() ?? null;
    if (!e) {
      if (!this.context.length) this.refillContext(auto);
      e = this.context.shift() ?? null;
      if (e) this.contextOrder = this.removeOnce(this.contextOrder, e.id);
    }
    if (!e) return null;
    if (this.nowPlaying) this.pushHistory(this.nowPlaying);
    this.nowPlaying = e.id;
    return e.id;
  }

  refillContext(auto) {
    if (this.repeat === "all" && this.contextSource.length) {
      this.setContext(this.contextSource, this.contextLabel, this.contextKind, true);
      return;
    }
    const nextCtx = this.onContextEnd(this, { auto });
    if (nextCtx?.ids?.length) this.setContext(nextCtx.ids, nextCtx.label ?? "", nextCtx.kind ?? "", false);
  }

  setContext(ids, label, kind, keepSource) {
    this.context = ids.map((id) => this.entry(id));
    this.contextOrder = [...ids];
    if (!keepSource) this.contextSource = [...ids];
    this.contextLabel = label;
    this.contextKind = kind;
    if (this.shuffle) this.context = seededShuffle(this.context, ++this.seed);
  }

  /**
   * "Anterior": con más de 5 s reinicia la canción; si no, vuelve a la del historial.
   * @returns {"restart"|string|null}
   */
  prev(currentTime = 0) {
    if (currentTime > 5 || !this.history.length) return this.nowPlaying ? "restart" : null;
    const id = this.history.pop();
    if (this.nowPlaying) {
      const e = this.entry(this.nowPlaying);
      this.context.unshift(e);
      this.contextOrder.unshift(e.id);
    }
    this.nowPlaying = id;
    return id;
  }

  /** Aleatorio: solo el contexto (la cola manual se respeta). Apagarlo restaura el orden. */
  setShuffle(on, seed = Date.now()) {
    if (on === this.shuffle) return;
    this.shuffle = on;
    if (on) {
      this.seed = seed >>> 0 || 1;
      this.contextOrder = this.ids(this.context);
      this.context = seededShuffle(this.context, this.seed);
    } else {
      // Orden original con lo que queda; lo agregado después va al final.
      const pool = [...this.context];
      const ordered = [];
      for (const id of this.contextOrder) {
        const i = pool.findIndex((e) => e.id === id);
        if (i >= 0) ordered.push(...pool.splice(i, 1));
      }
      this.context = [...ordered, ...pool];
      this.contextOrder = this.ids(this.context);
    }
  }

  cycleRepeat() {
    this.repeat = REPEAT_MODES[(REPEAT_MODES.indexOf(this.repeat) + 1) % REPEAT_MODES.length];
    return this.repeat;
  }

  clearUserQueue() { const old = this.userQueue; this.userQueue = []; return old; }

  toJSON() {
    return {
      v: 1,
      nowPlaying: this.nowPlaying,
      userQueue: this.ids(this.userQueue),
      context: this.ids(this.context),
      contextSource: this.contextSource,
      contextOrder: this.contextOrder,
      contextLabel: this.contextLabel,
      contextKind: this.contextKind,
      history: this.history.slice(-HISTORY_MAX),
      shuffle: this.shuffle,
      seed: this.seed,
      repeat: this.repeat,
    };
  }

  /** Restaura desde localStorage; descarta ids inválidos o que ya no existen. */
  static from(data, { onContextEnd, valid } = {}) {
    const q = new PlayQueue({ onContextEnd });
    if (!data || data.v !== 1) return q;
    const ok = (id) => typeof id === "string" && ID_RE.test(id) && (!valid || valid(id));
    const list = (a) => (Array.isArray(a) ? a.filter(ok).slice(0, 1000) : []);
    q.nowPlaying = ok(data.nowPlaying) ? data.nowPlaying : null;
    q.userQueue = list(data.userQueue).map((id) => q.entry(id));
    q.context = list(data.context).map((id) => q.entry(id));
    q.contextSource = list(data.contextSource);
    q.contextOrder = list(data.contextOrder);
    q.contextLabel = typeof data.contextLabel === "string" ? data.contextLabel.slice(0, 80) : "";
    q.contextKind = typeof data.contextKind === "string" ? data.contextKind.slice(0, 20) : "";
    q.history = list(data.history).slice(-HISTORY_MAX);
    q.shuffle = data.shuffle === true;
    q.seed = Number.isInteger(data.seed) ? data.seed : 1;
    q.repeat = REPEAT_MODES.includes(data.repeat) ? data.repeat : "off";
    return q;
  }
}
