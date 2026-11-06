// Guía de conexión integrada: una tarjeta compacta sobre el escenario (no un modal),
// con 4 pasos cortos centrados en encender y sincronizar el ARMY Bomb.
// Cada paso tiene una mini animación, texto breve y narración opcional.

import { lang, t, VOICE } from "./i18n.js";

const STEPS = [
  {
    scene: "bluetooth",
    title: "Activa el Bluetooth",
    text: "En tu celular o computadora. En iPhone, abre esta página en la app Bluefy.",
    next: "Listo",
  },
  {
    scene: "free",
    title: "Libéralo",
    text: "Si está conectado a otro celular o app, desconéctalo: solo acepta uno a la vez.",
    next: "Hecho",
  },
  {
    scene: "power",
    title: "Modo Bluetooth",
    text: "Con el ARMY Bomb apagado, mantén los dos botones 2 segundos, hasta que parpadee.",
    next: "Ya parpadea",
  },
  {
    scene: "pair",
    title: "Conéctalo",
    text: "Toca Conectar y elige tu ARMY Bomb: aparece como BTS LIGHTSTICK o BBOMB-…",
    action: "connect",
  },
];

const SCENES = {
  bluetooth: `<div class="g-phone"><span class="g-bt">ᛒ</span><span class="g-toggle"><b></b></span></div>`,
  free: `<div class="g-phone list"><span class="g-cap">Vinculados</span><span class="g-forget">ARMY Bomb <em>Olvidar</em></span><span>Auriculares</span></div>`,
  // Mano con volumen (degradados y sombra): el índice y el medio llegan a los dos botones del mango,
  // los mantienen hundidos 2 s (el anillo se llena) y al soltar el ARMY Bomb parpadea en modo Bluetooth.
  power: `<div class="g-stick on-power"><span class="g-globe"></span><span class="g-handle"><b class="g-btn b1"></b><b class="g-btn b2"></b></span><svg class="g-hand" viewBox="0 0 96 70" aria-hidden="true"><defs><linearGradient id="g-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe3d3"/><stop offset="0.55" stop-color="#f6c3a8"/><stop offset="1" stop-color="#d9957a"/></linearGradient></defs><rect class="g-palm" x="44" y="2" width="50" height="62" rx="20" fill="url(#g-skin)"/><rect x="2" y="9" width="58" height="17" rx="8.5" fill="url(#g-skin)"/><rect x="6" y="31" width="54" height="17" rx="8.5" fill="url(#g-skin)"/><ellipse cx="9" cy="17.5" rx="4.5" ry="5.5" fill="#fff6"/><ellipse cx="13" cy="39.5" rx="4.5" ry="5.5" fill="#fff6"/><path d="M28 10v15M30 32v15" stroke="#c9836a" stroke-width="1.4" opacity="0.5"/><path d="M54 52c8 10 26 12 36 4" fill="none" stroke="#c9836a" stroke-width="2" stroke-linecap="round" opacity="0.6"/></svg></div><div class="g-timer"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/></svg><span>2 s</span></div>`,
  pair: `<div class="g-chooser"><span class="g-row">Auriculares</span><span class="g-row sel"><b>ᛒ</b> BBOMB-1A2B</span><span class="g-row">BTS LIGHTSTICK3</span></div>`,
  done: `<div class="g-stick test"><span class="g-globe"></span><span class="g-handle"></span></div>`,
};

const SEEN_KEY = "pws.guide.seen";

export class Guide {
  /** @param {{onConnect:()=>Promise<void>, onTest:()=>void, hasSticks:()=>boolean, stickNames:()=>string[], onDone?:()=>void}} hooks */
  constructor(hooks) {
    this.hooks = hooks;
    this.i = 0;
    this.voice = false;
    this.el = document.getElementById("guide");
    this.pill = document.getElementById("coach-pill");
    this.scene = this.el.querySelector(".c-scene");
    this.titleEl = this.el.querySelector("#guide-title");
    this.textEl = this.el.querySelector("#guide-text");
    this.stepEl = this.el.querySelector("#c-step");
    this.progress = this.el.querySelector(".g-progress");
    this.actionBtn = this.el.querySelector("#g-action");
    this.nextBtn = this.el.querySelector("#g-next");
    this.prevBtn = this.el.querySelector("#g-prev");
    this.progress.innerHTML = STEPS.map(() => "<i></i>").join("");

    this.prevBtn.onclick = () => this.go(this.i - 1);
    this.nextBtn.onclick = () => this.go(this.i + 1);
    this.el.querySelector("#g-close").onclick = () => this.minimize();
    this.el.querySelector("#g-skip").onclick = () => this.close();
    this.pill.onclick = () => this.restore();

    this.voiceBtn = this.el.querySelector("#g-voice");
    this.voiceBtn.onclick = () => {
      this.voice = !this.voice;
      this.voiceBtn.setAttribute("aria-pressed", this.voice);
      this.voiceBtn.setAttribute("aria-label", "Narración");
      // Con narración, el texto deja de ser región viva: si no, el lector y la voz hablarían a la vez.
      this.textEl.setAttribute("aria-live", this.voice ? "off" : "polite");
      this.voiceBtn.textContent = this.voice ? "🔊" : "🔈";
      if (this.voice) this.speak(STEPS[this.i]?.text ?? "");
      else speechSynthesis?.cancel?.();
    };

    this.actionBtn.onclick = () => this.connect();
    // La burbuja (y su flecha) se ubican según dónde está de verdad el botón Conectar: cambia con el ancho de la
    // ventana, el idioma y el panel lateral. Antes la flecha tenía una distancia fija y apuntaba a la nada.
    this.anchor = document.getElementById("btn-bt");
    addEventListener("resize", () => this.place());
    if (this.anchor && "ResizeObserver" in window) new ResizeObserver(() => this.place()).observe(this.anchor);
    this.el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.minimize();
    });
    // Tocar fuera (la música, Explorar…) la minimiza: la guía acompaña, no estorba.
    document.addEventListener("pointerdown", (e) => {
      if (this.el.hidden || this.el.contains(e.target) || e.target.closest?.("#btn-bt, #dock-bt, #panel-bt, .panel, dialog")) return;
      this.minimize();
    });
  }

  /** Coloca la burbuja bajo el botón Conectar, con la flecha a su centro (solo cuando flota con flecha). */
  place() {
    const el = this.el, pill = this.pill, a = this.anchor;
    const clear = () => ["--coach-top", "--coach-right", "--arrow-right"].forEach((k) => { el.style.removeProperty(k); pill.style.removeProperty(k); });
    const r = a?.getBoundingClientRect();
    if (!r || !r.width || a.closest("[hidden]")) return clear();
    const host = el.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0, right: innerWidth };
    const top = `${Math.round(r.bottom - host.top + 18)}px`; // deja aire para la flecha (7 px)
    const right = Math.max(8, Math.round(host.right - r.right));
    for (const n of [el, pill]) { n.style.setProperty("--coach-top", top); n.style.setProperty("--coach-right", `${right}px`); }
    if (el.hidden) return;
    const box = el.getBoundingClientRect();
    if (!box.width) return;
    // Flecha al centro del botón, sin salirse de las esquinas redondeadas de la burbuja.
    const ax = Math.min(box.width - 28, Math.max(16, box.right - (r.left + r.width / 2) - 6));
    el.style.setProperty("--arrow-right", `${Math.round(ax)}px`);
  }

  get seen() {
    try { return localStorage.getItem(SEEN_KEY) === "1"; } catch { return false; }
  }

  open(step = 0) {
    this.markResume(false);
    const f = document.activeElement;
    if (f && !this.el.contains(f) && f !== document.body) this.opener = f;
    this.pill.hidden = true;
    this.el.hidden = false;
    this.el.classList.remove("done");
    this.go(this.hooks.hasSticks() ? STEPS.length - 1 : step);
    this.place();
    this.titleEl.focus({ preventScroll: true });
  }

  /** Se esconde sin dejar nada flotando: el botón Conectar muestra el paso ("2/4") y desde ahí se retoma. */
  minimize() {
    speechSynthesis?.cancel?.();
    const hadFocus = this.el.contains(document.activeElement);
    this.el.hidden = true;
    this.pill.hidden = true;
    this.markResume(!this.hooks.hasSticks());
    if (hadFocus || document.activeElement === document.body) this.returnFocus();
  }
  /** Marca (o desmarca) los botones Conectar como "retomar la guía en el paso N". */
  markResume(on) {
    this.resuming = on;
    for (const id of ["btn-bt", "dock-bt"]) {
      const b = document.getElementById(id);
      if (!b) continue;
      b.classList.toggle("resume", on);
      if (on) { b.dataset.step = `${this.i + 1}/${STEPS.length}`; b.setAttribute("aria-description", `Seguir conectando · paso ${this.i + 1} de ${STEPS.length}`); }
      else { delete b.dataset.step; b.removeAttribute("aria-description"); }
    }
  }
  get isMinimized() { return Boolean(this.resuming) && this.el.hidden; }

  /** Al cerrar, el foco vuelve a donde estaba (o al botón de conectar), nunca a un elemento oculto. */
  returnFocus() {
    const back = this.opener?.isConnected && !this.opener.closest("[hidden]") ? this.opener : document.getElementById("btn-bt");
    back?.focus?.({ preventScroll: true });
  }

  restore() {
    this.markResume(false);
    this.pill.hidden = true;
    this.el.hidden = false;
    this.go(this.i);
    this.place();
  }

  close() {
    speechSynthesis?.cancel?.();
    this.markResume(false);
    const hadFocus = this.el.contains(document.activeElement);
    this.el.hidden = true;
    this.pill.hidden = true;
    if (hadFocus) this.returnFocus();
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
  }

  go(i) {
    if (i < 0 || i >= STEPS.length) return;
    this.i = i;
    const s = STEPS[i];
    this.scene.innerHTML = SCENES[s.scene];
    this.stepEl.textContent = `Paso ${i + 1} de ${STEPS.length}`;
    this.titleEl.textContent = s.title;
    this.textEl.textContent = s.text;
    [...this.progress.children].forEach((d, k) => d.classList.toggle("on", k <= i));
    this.prevBtn.hidden = i === 0;
    this.nextBtn.hidden = Boolean(s.action);
    this.nextBtn.textContent = s.next ?? "Siguiente";
    this.actionBtn.hidden = !s.action;
    this.actionBtn.textContent = "Conectar";
    this.hideConnected();
    this.speak(s.text);
  }

  async connect() {
    this.showStatus("wait", "Buscando…", "Elige tu ARMY Bomb en la lista que abrió el navegador");
    this.actionBtn.disabled = true;
    await this.hooks.onConnect();
    this.actionBtn.disabled = false;
    const names = this.hooks.stickNames?.() ?? [];
    if (!names.length) {
      this.showStatus("fail", "No se conectó", "Revisa que esté parpadeando y vuelve a tocar Conectar");
      return;
    }
    // Éxito: nombre del dispositivo resaltado, prueba de luz y cierre.
    const name = names[names.length - 1];
    this.el.classList.add("done");
    this.scene.innerHTML = SCENES.done;
    this.stepEl.textContent = "Listo";
    this.titleEl.textContent = "¡Conectado!";
    this.textEl.textContent = "Si brilla en morado, ya está. Borahae 💜";
    this.showStatus("ok", name, names.length > 1 ? `${names.length} ARMY Bomb conectados` : "Recibiendo colores");
    this.actionBtn.hidden = true;
    this.prevBtn.hidden = true;
    this.hooks.onTest();
    this.speak(`Conectado a ${name.replace(/[-_]/g, " ")}`);
    setTimeout(() => {
      this.close();
      this.hooks.onDone?.(name);
    }, 2600);
  }

  showStatus(kind, title, sub) {
    const c = this.el.querySelector("#g-connected");
    c.hidden = false;
    c.className = `g-connected ${kind}`;
    c.querySelector("strong").textContent = title;
    c.querySelector("small").textContent = sub;
  }

  hideConnected() {
    this.el.querySelector("#g-connected").hidden = true;
  }

  speak(text) {
    if (!this.voice || !("speechSynthesis" in window) || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t(text));
    const code = lang;
    u.lang = VOICE[lang] ?? "es-ES";
    const voices = speechSynthesis.getVoices();
    u.voice = voices.find((v) => v.lang.startsWith(code)) ?? null;
    speechSynthesis.speak(u);
  }
}
