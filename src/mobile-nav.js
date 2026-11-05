// Menú principal desplegable del teléfono (junto al logo). Reutiliza los botones existentes del reproductor.
const $ = (id) => document.getElementById(id);
const btn = $("m-nav-btn");
const menu = $("m-nav-menu");
const label = $("m-nav-label");
const tabs = ["view-video", "view-lights", "view-explore"].map($);
const items = () => [...menu.querySelectorAll("button, a")];
// Patrón de menú del APG: una sola parada de Tab (el botón); dentro se navega con flechas.
for (const it of items()) it.tabIndex = -1;

function sync() {
  const active = tabs.find((t) => t.getAttribute("aria-selected") === "true") ?? tabs[2];
  label.textContent = active.textContent.trim();
  menu.querySelectorAll("[role=menuitemradio]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.proxy === active.id)));
  const theme = $("btn-theme")?.getAttribute("aria-label");
  if (theme) $("m-theme-label").textContent = theme.replace(/^Cambiar a /, "Usar ");
}
function open() {
  sync();
  menu.hidden = false;
  btn.setAttribute("aria-expanded", "true");
  (menu.querySelector("[aria-checked=true]") ?? items()[0]).focus();
  setTimeout(() => document.addEventListener("pointerdown", outside), 0);
}
function close(focus = true) {
  if (menu.hidden) return;
  menu.hidden = true;
  btn.setAttribute("aria-expanded", "false");
  document.removeEventListener("pointerdown", outside);
  if (focus) btn.focus();
}
function outside(e) { if (!menu.contains(e.target) && !btn.contains(e.target)) close(false); }

btn.addEventListener("click", () => (menu.hidden ? open() : close()));
menu.addEventListener("click", (e) => {
  const it = e.target.closest("button, a");
  if (!it) return;
  close(false);
  if (it.dataset.proxy) $(it.dataset.proxy)?.click();
  // [data-go] lo maneja el reproductor (delegación en document).
  sync();
});
menu.addEventListener("keydown", (e) => {
  const list = items();
  const i = list.indexOf(document.activeElement);
  if (e.key === "Escape") { e.preventDefault(); close(); }
  else if (e.key === "ArrowDown") { e.preventDefault(); list[(i + 1) % list.length].focus(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
  else if (e.key === "Home") { e.preventDefault(); list[0].focus(); }
  else if (e.key === "End") { e.preventDefault(); list.at(-1).focus(); }
  else if (e.key === "Tab") close(false);
});
tabs.forEach((t) => new MutationObserver(sync).observe(t, { attributes: true, attributeFilter: ["aria-selected"] }));
sync();
