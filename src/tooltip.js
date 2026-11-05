// Tooltip propio y accesible para todo el reproductor.
// Toma el texto de `data-tip` (o de un `title`, que se mueve a `data-tip` para que no salga el nativo).
// Aparece tras 400 ms con el mouse y enseguida con el foco del teclado; Esc lo cierra; se voltea para
// quedarse dentro de la pantalla. Si el texto agrega algo al nombre accesible, se enlaza con aria-describedby.

const SHOW_DELAY = 400;
const GAP = 8;

export function initTooltips(root = document) {
  const tip = document.createElement("div");
  tip.id = "tip";
  tip.className = "tip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  const text = document.createElement("span");
  const arrow = document.createElement("i");
  arrow.className = "tip-arrow";
  arrow.setAttribute("aria-hidden", "true");
  tip.append(text, arrow);
  document.body.append(tip);

  let target = null;
  let timer = 0;
  let suppressed = null; // tras Esc, no vuelve a salir hasta salir del control

  const textOf = (el) => {
    if (el.hasAttribute("title")) {
      const t = el.getAttribute("title");
      el.removeAttribute("title");
      if (t) el.dataset.tip = t;
    }
    return el.dataset.tip || "";
  };
  const nameOf = (el) => (el.getAttribute("aria-label") || el.textContent || "").trim().toLowerCase();

  function place() {
    if (!target) return;
    const r = target.getBoundingClientRect();
    const b = tip.getBoundingClientRect();
    let top = r.top - b.height - GAP;
    let side = "top";
    if (top < 8) { top = r.bottom + GAP; side = "bottom"; }
    const left = Math.min(innerWidth - b.width - 8, Math.max(8, r.left + r.width / 2 - b.width / 2));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    tip.dataset.side = side;
    arrow.style.left = `${Math.min(b.width - 12, Math.max(12, r.left + r.width / 2 - left))}px`;
  }
  function show(el, delay) {
    clearTimeout(timer);
    const t = textOf(el);
    if (!t || el === suppressed) return;
    target = el;
    text.textContent = t; // antes de enlazar aria-describedby: el lector nunca lee un texto viejo o vacío
    // Solo describe si agrega información (no repetir el nombre visible).
    if (!nameOf(el).includes(t.toLowerCase())) {
      const ids = new Set((el.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
      ids.add("tip");
      el.setAttribute("aria-describedby", [...ids].join(" "));
    }
    timer = setTimeout(() => {
      if (target !== el) return;
      text.textContent = t;
      tip.hidden = false;
      tip.classList.remove("in");
      place();
      void tip.offsetWidth;
      tip.classList.add("in");
    }, delay);
  }
  function hide(el) {
    clearTimeout(timer);
    if (el && el !== target) return;
    if (target) {
      const ids = (target.getAttribute("aria-describedby") || "").split(/\s+/).filter((x) => x && x !== "tip");
      if (ids.length) target.setAttribute("aria-describedby", ids.join(" "));
      else target.removeAttribute("aria-describedby");
    }
    target = null;
    tip.hidden = true;
    tip.classList.remove("in");
  }
  const tipTarget = (e) => e.target.closest?.("[data-tip], [title]");

  root.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch") return;
    const el = tipTarget(e);
    if (el && el !== target) show(el, SHOW_DELAY);
  });
  // WCAG 1.4.13: se puede pasar el puntero sobre el tooltip (útil con lupa) sin que se cierre.
  tip.addEventListener("pointerleave", (e) => { if (target && !target.contains(e.relatedTarget)) hide(); });
  root.addEventListener("pointerout", (e) => {
    const el = tipTarget(e);
    if (!el || el.contains(e.relatedTarget) || tip.contains(e.relatedTarget)) return;
    if (suppressed === el) suppressed = null;
    hide(el);
  });
  root.addEventListener("focusin", (e) => {
    const el = tipTarget(e);
    if (el && el.matches(":focus-visible")) show(el, 120);
  });
  root.addEventListener("focusout", (e) => { const el = tipTarget(e); if (el) { if (suppressed === el) suppressed = null; hide(el); } });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && target && !tip.hidden) { suppressed = target; hide(); e.stopPropagation(); }
  }, true);
  root.addEventListener("pointerdown", () => hide(), true);
  addEventListener("scroll", () => hide(), true);
  addEventListener("resize", () => hide());
}
