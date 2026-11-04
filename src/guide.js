// Guía audiovisual de conexión, al estilo de los anuncios previos a un concierto:
// pasos animados con subtítulos y narración por voz (síntesis del navegador, sin audio grabado).

const STEPS = [
  {
    scene: "welcome",
    title: "Bienvenida, ARMY 💜",
    text: "Antes de que empiece el show, vamos a preparar tu lightstick. Son unos pocos pasos y toma menos de un minuto.",
  },
  {
    scene: "power",
    title: "1 · Enciende tu lightstick",
    text: "Pon las pilas o carga tu lightstick y presiona el botón de encendido hasta que se ilumine.",
  },
  {
    scene: "bluetooth",
    title: "2 · Activa el Bluetooth",
    text: "Activa el Bluetooth de tu teléfono o computador. En iPhone, abre esta página en la app Bluefy, porque Safari no permite Bluetooth web.",
  },
  {
    scene: "free",
    title: "3 · Libera la conexión",
    text: "Si la lightstick estaba conectada a otra app, ciérrala. Una lightstick solo puede conectarse a una app a la vez.",
  },
  {
    scene: "pair",
    title: "4 · Conecta",
    text: "Toca Conectar lightstick y elige tu lightstick en la lista. Suele aparecer como BTS LIGHTSTICK o BBOMB.",
    action: "connect",
  },
  {
    scene: "test",
    title: "5 · Prueba de luces",
    text: "Si tu lightstick brilla en morado, ¡está lista! Si no, acércala al teléfono y vuelve a intentarlo.",
    action: "test",
  },
  {
    scene: "show",
    title: "¡Que empiece el show!",
    text: "Sube el brillo, deja esta página abierta y levanta tu lightstick. Tres, dos, uno… ¡Borahae!",
  },
];

const SCENES = {
  welcome: `<div class="g-ocean">${Array.from({ length: 24 }, (_, i) => `<i style="--d:${i * 0.08}s"></i>`).join("")}</div>`,
  power: `<div class="g-stick on-power"><span class="g-globe"></span><span class="g-handle"><b class="g-btn"></b></span><span class="g-finger"></span></div>`,
  bluetooth: `<div class="g-phone"><span class="g-bt">ᛒ</span><span class="g-toggle"><b></b></span></div>`,
  free: `<div class="g-phone"><span class="g-app">App</span><span class="g-x">✕</span></div><div class="g-stick small"><span class="g-globe"></span><span class="g-handle"></span></div>`,
  pair: `<div class="g-phone list"><span>BTS LIGHTSTICK</span><span class="sel">BBOMB-1A2B</span><span>Auriculares</span></div><div class="g-waves"><i></i><i></i><i></i></div><div class="g-stick small"><span class="g-globe"></span><span class="g-handle"></span></div>`,
  test: `<div class="g-stick test"><span class="g-globe"></span><span class="g-handle"></span></div>`,
  show: `<div class="g-count"><span>3</span><span>2</span><span>1</span></div><div class="g-ocean">${Array.from({ length: 24 }, (_, i) => `<i style="--d:${i * 0.05}s"></i>`).join("")}</div>`,
};

export class Guide {
  /** @param {{onConnect:()=>Promise<void>, onTest:()=>void, hasSticks:()=>boolean}} hooks */
  constructor(hooks) {
    this.hooks = hooks;
    this.i = 0;
    this.voice = true;
    this.el = document.getElementById("guide");
    this.stage = this.el.querySelector(".g-stage");
    this.titleEl = this.el.querySelector("#guide-title");
    this.textEl = this.el.querySelector("#guide-text");
    this.progress = this.el.querySelector(".g-progress");
    this.actionBtn = this.el.querySelector("#g-action");
    this.el.querySelector("#g-prev").onclick = () => this.go(this.i - 1);
    this.el.querySelector("#g-next").onclick = () => (this.i === STEPS.length - 1 ? this.close() : this.go(this.i + 1));
    this.el.querySelector("#g-close").onclick = () => this.close();
    this.el.querySelector("#g-replay").onclick = () => this.speak(STEPS[this.i].text);
    this.voiceBtn = this.el.querySelector("#g-voice");
    this.voiceBtn.onclick = () => {
      this.voice = !this.voice;
      this.voiceBtn.setAttribute("aria-pressed", this.voice);
      this.voiceBtn.textContent = this.voice ? "🔊 Voz" : "🔇 Voz";
      if (!this.voice) speechSynthesis?.cancel();
    };
    this.actionBtn.onclick = async () => {
      const a = STEPS[this.i].action;
      if (a === "connect") {
        await this.hooks.onConnect();
        if (this.hooks.hasSticks()) this.go(this.i + 1);
      } else if (a === "test") this.hooks.onTest();
    };
    this.el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
      if (e.key === "ArrowRight") this.go(this.i + 1);
      if (e.key === "ArrowLeft") this.go(this.i - 1);
    });
    this.progress.innerHTML = STEPS.map(() => "<i></i>").join("");
  }

  open() {
    this.lastFocus = document.activeElement;
    this.el.hidden = false;
    this.go(0);
    this.el.querySelector("#g-next").focus();
  }

  close() {
    speechSynthesis?.cancel();
    this.el.hidden = true;
    try { localStorage.setItem("pws.guide.seen", "1"); } catch {}
    this.lastFocus?.focus?.();
  }

  go(i) {
    if (i < 0 || i >= STEPS.length) return;
    this.i = i;
    const s = STEPS[i];
    this.stage.innerHTML = SCENES[s.scene];
    this.titleEl.textContent = s.title;
    this.textEl.textContent = s.text;
    [...this.progress.children].forEach((d, k) => d.classList.toggle("on", k <= i));
    this.el.querySelector("#g-prev").disabled = i === 0;
    this.el.querySelector("#g-next").textContent = i === STEPS.length - 1 ? "¡Empezar!" : "Siguiente";
    this.actionBtn.hidden = !s.action;
    this.actionBtn.textContent = s.action === "connect" ? "Conectar lightstick" : "Probar luces";
    if (s.action === "test") this.hooks.onTest();
    this.speak(s.text);
  }

  speak(text) {
    if (!this.voice || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/💜/g, ""));
    u.lang = "es-ES";
    const voices = speechSynthesis.getVoices();
    u.voice = voices.find((v) => v.lang.startsWith("es") && /female|mujer|helena|paulina|monica|sabina/i.test(v.name)) ?? voices.find((v) => v.lang.startsWith("es")) ?? null;
    u.rate = 1;
    u.pitch = 1.05;
    speechSynthesis.speak(u);
  }
}
