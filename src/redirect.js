// Redirige las direcciones antiguas (*.html) a las nuevas rutas en inglés, conservando ?parámetros y #ancla.
const map = { "app.html": "player/", "privacidad.html": "privacy/" };
const file = location.pathname.split("/").pop();
const target = map[file];
if (target) {
  const params = new URLSearchParams(location.search);
  if (params.has("guia")) { params.delete("guia"); params.set("guide", "1"); }
  const q = params.toString();
  location.replace(target + (q ? `?${q}` : "") + location.hash);
}
