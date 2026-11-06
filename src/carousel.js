// Carrusel suave para listas que se desplazan de lado (los pasos de «Cómo conectar» en teléfono y tableta).
// Avanza solo, una tarjeta cada pocos segundos, y en los extremos da la vuelta con un rebote elástico (ida y
// vuelta). El dedo, el ratón, la rueda o el teclado siempre mandan: al tocarlo se pausa y retoma después.
// No se mueve solo con movimiento reducido, fuera de la pantalla ni con la pestaña oculta. Tiene puntos para
// saltar y un botón de pausa (WCAG 2.2.2: lo que se mueve solo debe poder detenerse).
// Los textos están en español: la capa de idioma (src/i18n.js) los traduce.

const STEP_MS = 3200;
const RESUME_MS = 5000;

/** @param {HTMLElement} list contenedor con overflow-x (sus hijos son las tarjetas) */
export function carousel(list, { label = "Paso" } = {}) {
  if (!list || list.dataset.carousel === "on") return;
  list.dataset.carousel = "on";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const cards = [...list.children];
  let i = 0, dir = 1, timer = 0, resumeAt = 0, visible = false, paused = false, programmatic = 0;

  // Controles: puntos y pausa, debajo de la lista.
  const bar = document.createElement("div");
  bar.className = "car-bar";
  const dots = document.createElement("div");
  dots.className = "car-dots";
  dots.setAttribute("role", "group");
  dots.setAttribute("aria-label", "Elegir paso");
  cards.forEach((_, k) => {
    const d = document.createElement("button");
    d.type = "button";
    d.className = "car-dot";
    d.setAttribute("aria-label", `${label} ${k + 1}`);
    d.onclick = () => { hold(); go(k); };
    dots.append(d);
  });
  const pause = document.createElement("button");
  pause.type = "button";
  pause.className = "car-pause";
  const syncPause = () => {
    pause.setAttribute("aria-pressed", String(paused));
    pause.setAttribute("aria-label", paused ? "Reanudar carrusel" : "Pausar carrusel");
    pause.textContent = paused ? "▶" : "❚❚";
  };
  pause.onclick = () => { paused = !paused; syncPause(); schedule(); };
  syncPause();
  bar.append(dots, pause);
  list.after(bar);

  const overflowing = () => list.scrollWidth > list.clientWidth + 4;
  const step = () => (cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : list.clientWidth);
  const maxIndex = () => {
    // Último índice al que se puede llegar (las últimas tarjetas pueden caber juntas en pantalla).
    const max = list.scrollWidth - list.clientWidth;
    return Math.max(0, Math.min(cards.length - 1, Math.round(max / Math.max(1, step()))));
  };
  const current = () => Math.max(0, Math.min(cards.length - 1, Math.round(list.scrollLeft / Math.max(1, step()))));
  function mark() {
    const k = current();
    i = k;
    [...dots.children].forEach((d, n) => d.setAttribute("aria-current", String(n === k)));
    cards.forEach((c, n) => c.classList.toggle("is-current", n === k && overflowing()));
  }
  function go(k, smooth = !reduce.matches) {
    i = Math.max(0, Math.min(maxIndex(), k));
    programmatic = performance.now();
    list.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: smooth ? "smooth" : "instant" });
  }
  // Rebote elástico al dar la vuelta en un extremo.
  function bounce(towards) {
    if (reduce.matches || !list.animate) return;
    list.animate(
      [{ transform: "translateX(0)" }, { transform: `translateX(${towards * -18}px)` }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }],
      { duration: 700, easing: "cubic-bezier(.3,1.5,.5,1)" },
    );
  }
  function next() {
    const last = maxIndex();
    if (last === 0) return;
    let k = i + dir;
    if (k > last || k < 0) {
      bounce(dir);
      dir = -dir;
      k = i + dir;
    }
    go(k);
  }
  // ¿Está en pantalla? Se mide al momento (el aviso de IntersectionObserver no siempre llega: las animaciones de
  // entrada de la landing transforman a los contenedores).
  const inView = () => { const r = list.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.height > 0; };
  function schedule() {
    clearTimeout(timer);
    bar.hidden = !overflowing();
    if (paused || document.hidden || reduce.matches || !overflowing()) return;
    const wait = Math.max(STEP_MS, resumeAt - performance.now());
    timer = setTimeout(() => {
      if (!(visible || inView())) return schedule(); // fuera de pantalla: se vuelve a mirar en el próximo ciclo
      next();
      schedule();
    }, wait);
  }
  // Cualquier interacción de la persona pausa el avance automático un rato.
  function hold() { resumeAt = performance.now() + RESUME_MS; schedule(); }
  for (const ev of ["pointerdown", "wheel", "keydown", "focusin", "touchstart"]) list.addEventListener(ev, hold, { passive: true });
  // Pausa al pasar el ratón por encima. Solo con ratón de verdad: en el teléfono, un toque genera un "mouseenter"
  // falso sin su "mouseleave" y el carrusel quedaba detenido para siempre.
  list.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") clearTimeout(timer); });
  list.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hold(); });
  list.addEventListener("scroll", () => {
    mark();
    if (performance.now() - programmatic > 900) resumeAt = performance.now() + RESUME_MS; // la movió la persona
  }, { passive: true });

  // Arrastrar con el ratón (en tabletas o ventanas angostas con ratón): el ajuste por tarjeta lo hace el snap.
  let drag = null;
  list.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || !overflowing()) return;
    drag = { x: e.clientX, left: list.scrollLeft, moved: false };
    list.classList.add("dragging");
  });
  addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 3) drag.moved = true;
    list.scrollLeft = drag.left - dx;
  });
  addEventListener("pointerup", () => {
    if (!drag) return;
    list.classList.remove("dragging");
    const moved = drag.moved;
    drag = null;
    if (moved) go(current());
  });
  // Teclado: flechas para ir de tarjeta en tarjeta (la lista es enfocable).
  list.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); go(i + (e.key === "ArrowRight" ? 1 : -1)); }
  });

  new IntersectionObserver(([en]) => { visible = en.isIntersecting; schedule(); }, { threshold: 0.4 }).observe(list);
  document.addEventListener("visibilitychange", schedule);
  reduce.addEventListener?.("change", schedule);
  addEventListener("resize", () => { mark(); schedule(); });
  mark();
  schedule();
}
