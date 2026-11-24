// Carrusel para listas que se desplazan de lado (los pasos de «Cómo conectar» en teléfono y tableta).
// Rehecho 2026-11-24 (revisión UX): avanza solo con calma (6 s por tarjeta, tiempo de leerla) y vuelve al
// principio al llegar al final, sin rebotes que movían la lista. La persona siempre manda:
//   - Tocar o hacer clic en una tarjeta lo detiene (el botón pasa a «Reanudar»); retoma solo tras 20 s sin tocar
//     nada, y el botón vuelve a estar a mano para detenerlo otra vez.
//   - Pausa con el botón: no retoma sola nunca.
//   - Deslizar con el dedo, la rueda, las flechas del teclado, los puntos o Anterior/Siguiente: navega y frena el
//     avance 15 s.
//   - Nunca cambia mientras tiene el foco del teclado, el puntero encima o un dedo apoyado.
// Con movimiento reducido no avanza solo. Tampoco fuera de pantalla ni con la pestaña oculta (WCAG 2.2.2).
// Los textos están en español: la capa de idioma (src/i18n.js) los traduce.

export const STEP_MS = 6000;      // cada tarjeta a la vista
export const MANUAL_HOLD_MS = 15000; // tras navegar a mano
export const TOUCH_IDLE_MS = 20000;  // tras tocar una tarjeta, sin más interacción

const ICONS = {
  prev: '<path d="M15 6l-6 6 6 6"/>',
  next: '<path d="M9 6l6 6-6 6"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
};
const svg = (name) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

/** @param {HTMLElement} list contenedor con overflow-x (sus hijos son las tarjetas) */
export function carousel(list, { label = "Paso" } = {}) {
  if (!list || list.dataset.carousel === "on") return;
  list.dataset.carousel = "on";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const cards = [...list.children];
  let i = 0, timer = 0, holdUntil = 0, visible = false, pressing = false, hovering = false;
  /** "" = avanza · "user" = pausado con el botón · "touch" = pausado al tocar una tarjeta (retoma tras 20 s) */
  let pausedBy = "";
  let touchTimer = 0;

  // Controles: Anterior, puntos, Siguiente y Pausa, debajo de la lista.
  const bar = document.createElement("div");
  bar.className = "car-bar";
  const mk = (cls, icon) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.innerHTML = svg(icon);
    return b;
  };
  const prev = mk("car-nav car-prev", "prev");
  prev.setAttribute("aria-label", "Paso anterior");
  const next = mk("car-nav car-next", "next");
  next.setAttribute("aria-label", "Paso siguiente");
  const dots = document.createElement("div");
  dots.className = "car-dots";
  dots.setAttribute("role", "group");
  dots.setAttribute("aria-label", "Elegir paso");
  cards.forEach((_, k) => {
    const d = document.createElement("button");
    d.type = "button";
    d.className = "car-dot";
    d.setAttribute("aria-label", `${label} ${k + 1}`);
    d.onclick = () => { manual(); go(k); };
    dots.append(d);
  });
  const pause = mk("car-pause", "pause");
  bar.append(prev, dots, next, pause);
  list.after(bar);

  const syncPause = () => {
    const paused = Boolean(pausedBy);
    pause.setAttribute("aria-pressed", String(paused));
    pause.setAttribute("aria-label", paused ? "Reanudar carrusel" : "Pausar carrusel");
    pause.innerHTML = svg(paused ? "play" : "pause");
    bar.classList.toggle("is-paused", paused);
  };
  const setPaused = (by) => {
    pausedBy = by;
    clearTimeout(touchTimer);
    if (by === "touch") touchTimer = setTimeout(() => { if (pausedBy === "touch") { pausedBy = ""; syncPause(); schedule(); } }, TOUCH_IDLE_MS);
    syncPause();
    schedule();
  };
  pause.onclick = () => setPaused(pausedBy ? "" : "user");
  prev.onclick = () => { manual(); go(i - 1); };
  next.onclick = () => { manual(); go(i + 1); };
  syncPause();

  const overflowing = () => list.scrollWidth > list.clientWidth + 4;
  // Posición de desplazamiento de cada tarjeta. Las últimas pueden caber juntas en pantalla: comparten el final de la
  // lista, y estando ahí la actual es la última (antes el cuarto paso nunca quedaba marcado).
  const maxScroll = () => Math.max(0, list.scrollWidth - list.clientWidth);
  const positions = () => cards.map((c) => Math.min(c.offsetLeft - cards[0].offsetLeft, maxScroll()));
  const maxIndex = () => cards.length - 1;
  const current = () => {
    const pos = positions();
    // Si la lista está donde la dejó el último paso elegido, ese es el actual (aunque comparta posición con otro).
    if (Math.abs(pos[i] - list.scrollLeft) <= 4) return i;
    if (list.scrollLeft >= maxScroll() - 4) return cards.length - 1;
    let best = 0;
    pos.forEach((p, n) => { if (Math.abs(p - list.scrollLeft) < Math.abs(pos[best] - list.scrollLeft)) best = n; });
    return best;
  };
  function mark() {
    const k = current();
    i = k;
    const last = maxIndex();
    [...dots.children].forEach((d, n) => d.setAttribute("aria-current", String(n === k)));
    cards.forEach((c, n) => c.classList.toggle("is-current", n === k && overflowing()));
    prev.disabled = k <= 0;
    next.disabled = k >= last;
  }
  function go(k, smooth = !reduce.matches) {
    i = Math.max(0, Math.min(maxIndex(), k));
    list.scrollTo({ left: positions()[i], behavior: smooth ? "smooth" : "instant" });
    mark(); // si dos pasos comparten posición no hay scroll que avise: se marca igual
  }
  // Navegar a mano frena el avance automático un rato (no lo apaga).
  function manual() { holdUntil = performance.now() + MANUAL_HOLD_MS; schedule(); }

  const inView = () => { const r = list.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.height > 0; };
  // Foco del teclado dentro del carrusel o sus controles (un toque deja foco, pero no :focus-visible).
  const keyboardInside = () => [list, bar].some((el) => el.matches(":focus-visible") || el.querySelector(":focus-visible"));
  const blocked = () => pausedBy || pressing || hovering || keyboardInside() || document.hidden || reduce.matches || !overflowing();

  function schedule() {
    clearTimeout(timer);
    const can = overflowing();
    bar.hidden = !can;
    // Con movimiento reducido no hay avance automático: el botón de pausa sobra.
    pause.hidden = reduce.matches;
    if (!can || pausedBy || document.hidden || reduce.matches) return;
    const wait = Math.max(STEP_MS, holdUntil - performance.now());
    timer = setTimeout(() => {
      if (blocked() || !(visible || inView()) || performance.now() < holdUntil) return schedule();
      const last = maxIndex();
      go(i >= last ? 0 : i + 1); // al final vuelve al principio
      schedule();
    }, wait);
  }

  // Tocar o hacer clic en una tarjeta: se queda quieto para leerla.
  list.addEventListener("click", (e) => { if (e.target.closest(".step, li") && !list.classList.contains("was-dragged")) setPaused("touch"); });
  // Dedo apoyado o puntero encima: no se mueve.
  list.addEventListener("pointerdown", () => { pressing = true; manual(); }, { passive: true });
  addEventListener("pointerup", () => { pressing = false; }, { passive: true });
  addEventListener("pointercancel", () => { pressing = false; }, { passive: true });
  list.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hovering = true; });
  list.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { hovering = false; schedule(); } });
  bar.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hovering = true; });
  bar.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { hovering = false; schedule(); } });
  list.addEventListener("wheel", manual, { passive: true });
  // Lo que mueve la persona (dedo, rueda, teclado, controles) ya frena el avance desde su propio evento; el scroll
  // solo actualiza la marca (el desplazamiento suave del propio carrusel se confundía con un gesto y lo frenaba).
  list.addEventListener("scroll", mark, { passive: true });

  // Arrastrar con el ratón (tabletas o ventanas angostas con ratón): el ajuste por tarjeta lo hace el snap.
  let drag = null;
  list.addEventListener("pointerdown", (e) => {
    list.classList.remove("was-dragged");
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
    if (moved) { list.classList.add("was-dragged"); go(current()); } // arrastrar no cuenta como «tocar la tarjeta»
  });
  // Teclado: flechas, Inicio y Fin (la lista es enfocable).
  list.addEventListener("keydown", (e) => {
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: cards.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    manual();
    go(to);
  });
  for (const el of [list, bar]) el.addEventListener("focusout", () => setTimeout(schedule, 0));

  new IntersectionObserver(([en]) => { visible = en.isIntersecting; schedule(); }, { threshold: 0.6 }).observe(list);
  document.addEventListener("visibilitychange", schedule);
  reduce.addEventListener?.("change", schedule);
  addEventListener("resize", () => { mark(); schedule(); });
  mark();
  schedule();
}
