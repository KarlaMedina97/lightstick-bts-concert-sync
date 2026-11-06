// Páginas de texto (privacidad, términos, IA, 404): tema guardado, índice «En esta página» y sección actual.
// En escritorio el índice queda abierto y pegajoso; en teléfono es un <details> que se cierra al elegir una sección.

// Tema: el mismo que elegiste en el reproductor (pws.theme); si no hay, manda el del sistema (CSS).
try {
  const saved = localStorage.getItem("pws.theme");
  if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved;
} catch {}

const toc = document.querySelector(".doc-toc details");
if (toc) {
  const wide = matchMedia("(min-width: 1024px)");
  const sync = () => { toc.open = wide.matches; };
  sync();
  wide.addEventListener("change", sync);

  const links = new Map([...toc.querySelectorAll('a[href^="#"]')].map((a) => [a.hash.slice(1), a]));
  toc.addEventListener("click", (e) => {
    if (e.target.closest("a") && !wide.matches) toc.open = false;
  });

  // Sección actual: la última cuyo título ya pasó la parte alta de la pantalla.
  const sections = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  let current = null;
  const mark = () => {
    let id = sections[0]?.id;
    for (const s of sections) if (s.getBoundingClientRect().top < innerHeight * 0.3) id = s.id;
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) id = sections.at(-1)?.id;
    if (id === current) return;
    current = id;
    for (const [k, a] of links) {
      if (k === id) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    }
  };
  let raf = 0;
  addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; mark(); }); }, { passive: true });
  addEventListener("resize", mark);
  mark();
}
