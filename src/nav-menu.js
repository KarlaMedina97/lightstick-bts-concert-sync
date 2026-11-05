// Menú de la landing en pantallas chicas y medianas: botón desplegable (patrón "disclosure" del APG).
// En escritorio (≥ 1100 px) los enlaces se ven en línea y el botón no existe.
// - El botón dice si está abierto (aria-expanded) y qué controla (aria-controls).
// - Esc cierra y devuelve el foco al botón; tocar fuera, elegir un enlace o salir con Tab también cierra.
const btn = document.getElementById("nav-menu-btn");
const list = document.getElementById("nav-links");

if (btn && list) {
  const isOpen = () => btn.getAttribute("aria-expanded") === "true";
  const set = (open, { focus = false } = {}) => {
    btn.setAttribute("aria-expanded", String(open));
    list.classList.toggle("open", open);
    if (open) list.querySelector("a, button")?.focus();
    else if (focus) btn.focus();
  };
  btn.addEventListener("click", () => set(!isOpen()));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) { e.preventDefault(); set(false, { focus: true }); }
  });
  document.addEventListener("pointerdown", (e) => {
    if (isOpen() && !list.contains(e.target) && !btn.contains(e.target)) set(false);
  });
  list.addEventListener("click", (e) => {
    // Enlaces internos y externos cierran el menú; el botón de idioma lo deja abierto para ver el cambio.
    if (e.target.closest("a")) set(false);
  });
  list.addEventListener("focusout", (e) => {
    if (isOpen() && !list.contains(e.relatedTarget) && e.relatedTarget !== btn && e.relatedTarget) set(false);
  });
  // Al pasar a escritorio el menú deja de ser desplegable.
  matchMedia("(min-width: 1100px)").addEventListener("change", (m) => m.matches && set(false));
}
