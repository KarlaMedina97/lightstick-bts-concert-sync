// Recorrido de bienvenida: globos que señalan los controles reales de la app, uno a la vez.
// No bloquea la pantalla (sin modal ni fondo oscuro), se puede saltar y retomar desde Ajustes.

const KEY = "pws.tour.v1";

/** @typedef {{target:string, title:string, text:string, place?:"top"|"bottom"|"left"|"right"}} Tip */

/** @type {Tip[]} */
export const DEFAULT_TIPS = [
  // Un selector puede listar varias opciones: se usa la primera visible (escritorio o teléfono).
  { target: "#btn-bt, #dock-bt", title: "Conecta tu ARMY Bomb", text: "Cambia de color con cada parte de la canción. ¿Sin él? La vista Luces usa tu pantalla.", place: "bottom" },
  { target: "#btn-lyrics", title: "Letra", text: "Muestra la letra con el video oficial o sus subtítulos, cuando existen.", place: "top" },
  { target: "#btn-live", title: "Concierto", text: "¿En el estadio o frente a la TV? Elige y tus luces te acompañan.", place: "top" },
  { target: "#btn-cola", title: "Tu cola", text: "Toca ⋯ en una canción y elige Agregar a la cola. Ordénala arrastrando.", place: "top" },
];

export class Tour {
  /** @param {{tips?:Tip[], onEnd?:()=>void}} opts */
  constructor(opts = {}) {
    this.tips = opts.tips ?? DEFAULT_TIPS;
    this.onEnd = opts.onEnd;
    this.i = -1;
    this.el = document.createElement("div");
    this.el.className = "tour";
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-live", "polite");
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="tour-arrow" aria-hidden="true"></div>
      <p class="tour-step"></p>
      <h2 class="tour-title" tabindex="-1"></h2>
      <p class="tour-text"></p>
      <div class="tour-actions">
        <button type="button" class="tour-skip">Saltar</button>
        <button type="button" class="tour-next">Siguiente</button>
      </div>`;
    this.ring = document.createElement("div");
    this.ring.className = "tour-ring";
    this.ring.hidden = true;
    this.ring.setAttribute("aria-hidden", "true");
    document.body.append(this.ring, this.el);
    this.el.querySelector(".tour-skip").onclick = () => this.end();
    this.el.querySelector(".tour-next").onclick = () => this.next();
    this.el.addEventListener("keydown", (e) => { if (e.key === "Escape") this.end(); });
    this.reposition = () => this.place();
    addEventListener("resize", this.reposition);
    addEventListener("scroll", this.reposition, true);
  }

  static get done() {
    try { return localStorage.getItem(KEY) === "1"; } catch { return true; }
  }

  start() {
    this.i = -1;
    this.next();
  }

  next() {
    // Salta tips cuyo control no está visible en esta pantalla (p. ej. la lista lateral en el teléfono).
    do { this.i++; } while (this.i < this.tips.length && !this.visibleTarget(this.tips[this.i]));
    if (this.i >= this.tips.length) return this.end();
    const tip = this.tips[this.i];
    const remaining = this.tips.slice(this.i + 1).filter((t) => this.visibleTarget(t)).length;
    this.el.querySelector(".tour-step").textContent = `${this.i + 1} de ${this.i + 1 + remaining}`;
    this.el.querySelector(".tour-title").textContent = tip.title;
    this.el.querySelector(".tour-text").textContent = tip.text;
    this.el.querySelector(".tour-next").textContent = remaining ? "Siguiente" : "¡Listo!";
    this.el.setAttribute("aria-label", tip.title);
    this.el.hidden = false;
    this.ring.hidden = false;
    this.el.classList.remove("in");
    void this.el.offsetWidth;
    this.el.classList.add("in");
    this.place();
    this.el.querySelector(".tour-next").focus({ preventScroll: true });
  }

  visibleTarget(tip) {
    for (const el of document.querySelectorAll(tip.target)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
    }
    return null;
  }

  place() {
    if (this.el.hidden) return;
    const tip = this.tips[this.i];
    const target = tip && this.visibleTarget(tip);
    if (!target) return;
    const r = target.getBoundingClientRect();
    const pad = 6;
    Object.assign(this.ring.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });

    const box = this.el.getBoundingClientRect();
    const gap = 14, m = 10;
    let place = tip.place ?? "bottom";
    const fits = {
      bottom: r.bottom + gap + box.height < innerHeight - m,
      top: r.top - gap - box.height > m,
      right: r.right + gap + box.width < innerWidth - m,
      left: r.left - gap - box.width > m,
    };
    if (!fits[place]) place = ["bottom", "top", "right", "left"].find((p) => fits[p]) ?? "bottom";
    let x, y;
    if (place === "bottom" || place === "top") {
      x = r.left + r.width / 2 - box.width / 2;
      y = place === "bottom" ? r.bottom + gap : r.top - gap - box.height;
    } else {
      y = r.top + r.height / 2 - box.height / 2;
      x = place === "right" ? r.right + gap : r.left - gap - box.width;
    }
    x = Math.min(innerWidth - box.width - m, Math.max(m, x));
    y = Math.min(innerHeight - box.height - m, Math.max(m, y));
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    this.el.dataset.place = place;
    // Flecha apuntando al centro del control.
    const arrow = this.el.querySelector(".tour-arrow");
    if (place === "bottom" || place === "top") arrow.style.left = `${Math.min(box.width - 18, Math.max(18, r.left + r.width / 2 - x))}px`, (arrow.style.top = "");
    else arrow.style.top = `${Math.min(box.height - 18, Math.max(18, r.top + r.height / 2 - y))}px`, (arrow.style.left = "");
  }

  end() {
    this.el.hidden = true;
    this.ring.hidden = true;
    try { localStorage.setItem(KEY, "1"); } catch {}
    this.onEnd?.();
  }

  static reset() {
    try { localStorage.removeItem(KEY); } catch {}
  }
}
