// Fanchant entre canciones: como en los conciertos, el público corea los nombres de los
// integrantes antes de que empiece la siguiente canción. Solo usa los nombres (con romanización),
// una ovación sintetizada en el navegador y, si se quiere, la voz del sistema.

export const MEMBERS = [
  { ko: "김남준", roman: "Kim Namjoon" },
  { ko: "김석진", roman: "Kim Seokjin" },
  { ko: "민윤기", roman: "Min Yoongi" },
  { ko: "정호석", roman: "Jung Hoseok" },
  { ko: "박지민", roman: "Park Jimin" },
  { ko: "김태형", roman: "Kim Taehyung" },
  { ko: "전정국", roman: "Jeon Jungkook" },
];
const FINAL = { ko: "방탄소년단!", roman: "BTS!" };
// Ritmo real del público: cada nombre ocupa 2 tiempos de la canción (unos 0,9–1 s). Referencia: guía oficial de
// fanchant de DNA (fancafe de BTS, vía US BTS ARMY): la ronda de 7 nombres + «BTS!» empieza en 0:02 y se repite
// dos veces antes de la primera estrofa, ≈ 1 s por grito a 130 BPM. Sin BPM, 1 s.
// En la app se gritan con la voz del sistema, que tarda ≈ 1 s por nombre de tres sílabas: a menos de 1,1 s no
// alcanza a decirlos y se amontonan. Por eso el paso va de 1,1 a 1,5 s (3 tiempos si 2 quedan cortos).
/** Pausa entre un nombre y el siguiente (el público toma aire). */
export const CHANT_PAUSE_MS = 250;
/** Cuánto se ve (y se dice) cada nombre: 2,5 s fijos (decisión del proyecto), más la pausa de 0,25 s entre nombres. */
export const CHANT_STEP_MS = 2500;
export function chantStepMs(_bpm) {
  return CHANT_STEP_MS;
}

/** Ovación corta: ruido filtrado con una envolvente, sin archivos de audio. */
function cheer(ctx, { when = 0, length = 0.5, gain = 0.18 } = {}) {
  const n = Math.floor(ctx.sampleRate * length);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1400;
  band.Q.value = 0.6;
  const g = ctx.createGain();
  const t = ctx.currentTime + when;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.001, t + length);
  src.connect(band).connect(g).connect(ctx.destination);
  src.start(t);
  src.stop(t + length);
}

export class Fanchant {
  /** @param {{onBeat:(i:number)=>void}} hooks */
  constructor(hooks) {
    this.hooks = hooks;
    this.el = document.getElementById("chant");
    this.nameEl = document.getElementById("chant-name");
    this.romanEl = document.getElementById("chant-roman");
    this.timer = null;
    this.resolve = null;
    document.getElementById("chant-skip").onclick = () => this.stop();
  }

  get running() {
    return Boolean(this.resolve);
  }

  /** Corre el fanchant completo. Resuelve al terminar o al saltarlo. */
  run({ voice = true, bpm = 0 } = {}) {
    this.stop();
    const STEP_MS = chantStepMs(bpm);
    const items = [...MEMBERS, FINAL];
    let ctx = null;
    if (voice) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        ctx = new Ctx();
        cheer(ctx, { length: 1.2, gain: 0.12 });
      } catch {}
    }
    this.el.hidden = false;
    document.body.classList.add("chanting"); // el fanchant manda: los avisos esperan (el video nunca se tapa)
    return new Promise((resolve) => {
      this.resolve = () => {
        clearTimeout(this.timer);
        this.el.hidden = true;
        document.body.classList.remove("chanting");
        speechSynthesis?.cancel?.();
        ctx?.close?.().catch(() => {});
        this.resolve = null;
        resolve();
      };
      let i = 0;
      const step = () => {
        if (i >= items.length) {
          this.timer = setTimeout(() => this.resolve?.(), 400);
          return;
        }
        const it = items[i];
        this.nameEl.textContent = it.ko;
        this.romanEl.textContent = it.roman;
        this.nameEl.classList.remove("pop");
        void this.nameEl.offsetWidth; // reinicia la animación
        this.nameEl.classList.add("pop");
        this.hooks.onBeat(i);
        if (ctx) cheer(ctx, { length: i === items.length - 1 ? 1.4 : 0.45, gain: i === items.length - 1 ? 0.25 : 0.16 });
        const t0 = performance.now();
        i++;
        // «BTS!» es el remate: dura el doble antes de que empiece la canción.
        const minMs = i === items.length ? STEP_MS * 2 : STEP_MS;
        if (voice && "speechSynthesis" in window) {
          // El siguiente nombre espera a que la voz termine este (y una pausa corta), nunca se encima.
          let done = false;
          const next = () => {
            if (done || !this.resolve) return;
            done = true;
            clearTimeout(this.timer);
            this.timer = setTimeout(rest, Math.max(180, minMs - (performance.now() - t0)));
          };
          speechSynthesis.cancel(); // sin cola: si quedó algo pendiente, no se acumula
          const u = new SpeechSynthesisUtterance(it.ko);
          u.lang = "ko-KR";
          u.rate = 0.95; // tres sílabas por nombre, marcadas, como lo grita el público
          u.volume = 0.9;
          u.onend = next;
          u.onerror = next;
          speechSynthesis.speak(u);
          this.timer = setTimeout(next, minMs * 1.8); // respaldo si el navegador nunca avisa que terminó
        } else this.timer = setTimeout(rest, minMs);
      };
      // Entre nombres: se apaga 0,25 s (sin pausa después del último, «BTS!», que da paso a la canción).
      const rest = () => {
        if (!this.resolve) return;
        if (i >= items.length) return step();
        this.nameEl.classList.add("rest");
        this.romanEl.classList.add("rest");
        this.timer = setTimeout(() => { this.nameEl.classList.remove("rest"); this.romanEl.classList.remove("rest"); step(); }, CHANT_PAUSE_MS);
      };
      this.timer = setTimeout(step, 500);
    });
  }

  stop() {
    this.resolve?.();
  }
}
