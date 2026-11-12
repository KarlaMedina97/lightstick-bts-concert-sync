// Arma _site/ con SOLO lo que el sitio necesita para funcionar (lista explícita de lo que se publica).
// Documentación interna, pruebas, scripts, workflows, configuración de agentes y notas del runner local no se
// publican: no son secretos (el repo es público), pero no tienen por qué estar en el dominio.
// Uso: npm run build  (CI lo ejecuta antes de desplegar)
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { LOCALES, LOCALIZED, localizePage, withAlternates } from "./localize-pages.mjs";

export const PUBLIC = [
  "index.html", "app.html", "privacidad.html", "player", "privacy",
  "src", "vendor", "fonts", "icons", "assets",
  "styles.css", "tour.css", "landing.css", "sw.js", "manifest.webmanifest", "_headers", "LICENSE",
  "robots.txt", "sitemap.xml", "favicon.ico", "llms.txt", "404.html", "terms", "ai", "guide", ".well-known", ".nojekyll",
];
// Nunca, aunque aparezcan dentro de una carpeta pública.
const BLOCK = /(^|\/)(\.env|\.git|.*\.(md|map|log|pem|key)|node_modules|test|tests)(\/|$)/i;

const OUT = "_site";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const p of PUBLIC) {
  if (!existsSync(p)) throw new Error(`Falta ${p}`);
  cpSync(p, join(OUT, p), { recursive: true, filter: (src) => !BLOCK.test(src.replaceAll("\\", "/").replace(/^\.\//, "")) || src === p });
}

// Direcciones amigables: /player/dynamite. GitHub Pages sirve player/dynamite.html para /player/dynamite, y como la
// carpeta sigue siendo /player/, el reproductor funciona igual (rutas relativas intactas). Cada página lleva el
// título, la descripción y la dirección canónica de su canción (mejor para compartir y para buscadores).
const { ALBUMS } = await import(pathToFileURL(join(process.cwd(), "src/catalog.js")).href);
const { SEQUENCES } = await import(pathToFileURL(join(process.cwd(), "src/sequences.js")).href);
const playerHtml = readFileSync(join(OUT, "player/index.html"), "utf8");
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let songPages = 0;
const routes = [
  ["albums", "Álbumes · LumiParty", "Todos los álbumes de BTS e integrantes, con luces para tu ARMY Bomb. Página de fans, no oficial."],
  // Vistas personales (guardadas en el navegador): noindex y fuera del mapa del sitio.
  ["likes", "Me gusta · LumiParty", "Tus canciones y álbumes guardados en LumiParty.", undefined, true],
  ["my-videos", "Mis videos · LumiParty", "Agrega videos de canales oficiales de YouTube y sincroniza tu ARMY Bomb.", undefined, true],
  // Sin noindex: /player/lights es también la canción «Lights», que tiene el mismo id.
  ["lights", "Luces · LumiParty", "Tu ARMY Bomb (o tu pantalla) con el color de cada canción."],
];
for (const album of ALBUMS) {
  const who = album.artist && album.artist !== "BTS" ? album.artist : "BTS";
  routes.push([`album-${album.id}`, `${album.title} · ${who} · LumiParty`, `${album.title} (${who}${album.year ? `, ${album.year}` : ""}): canciones con luces para tu ARMY Bomb. Página de fans, no oficial.`, undefined, false, { album }]);
  for (const song of album.songs ?? []) routes.push([song.id, `${song.title} · ${who} · LumiParty`, `Tu ARMY Bomb al ritmo de ${song.title} (${who}) con el video oficial. Página de fans, no oficial.`, undefined, false, { album, song }]);
}
// Direcciones viejas en español: la misma página (el reproductor las pasa a la nueva sin recargar).
for (const [old, now] of [["albumes", "albums"], ["me-gusta", "likes"], ["mis-videos", "my-videos"], ["luces", "lights"]]) {
  const r = routes.find((x) => x[0] === now);
  if (r) routes.push([old, r[1], r[2], now, r[4], r[5]]); // canónica: la nueva
}
/**
 * Contenido propio y visible de cada página de canción o álbum (antes eran copias del reproductor con otro título):
 * encabezado, álbum y año, si tiene secuencia de luces propia, más canciones del álbum y la guía de conexión.
 * Solo datos del catálogo: nada de letras ni imágenes con derechos. La app la oculta si suena otra canción.
 */
function about({ album, song }) {
  const who = album.artist && album.artist !== "BTS" ? album.artist : "BTS";
  const li = (s) => `<li><a href="${esc(s.id)}">${esc(s.title)}</a></li>`;
  const guide = `<p class="sa-guide"><a href="../guide/">¿Primera vez? Así conectas tu ARMY Bomb</a></p>`;
  if (!song) {
    const songs = album.songs ?? [];
    const line = `Álbum de ${who}${album.year ? ` (${album.year})` : ""} con ${songs.length} ${songs.length === 1 ? "video" : "videos"} con luces.`;
    return `<section id="song-about" class="song-about" aria-labelledby="sa-title">
          <h2 id="sa-title">${esc(album.title)}: luces para tu ARMY Bomb</h2>
          <p>${esc(line)}</p>
          <ul class="sa-list">${songs.map(li).join("")}</ul>
          ${guide}
        </section>`;
  }
  const own = SEQUENCES[song.id] && SEQUENCES[song.id].yt === song.yt;
  const more = (album.songs ?? []).filter((s) => s.id !== song.id).slice(0, 8);
  return `<section id="song-about" class="song-about" data-song="${esc(song.id)}" aria-labelledby="sa-title">
          <h2 id="sa-title">${esc(song.title)}: luces para tu ARMY Bomb</h2>
          <p><span>Del álbum</span> <a href="album-${esc(album.id)}">${esc(album.title)}</a> <span translate="no">(${esc(who + (album.year ? `, ${album.year}` : ""))}).</span></p>
          <p>Dale play al video oficial y tu ARMY Bomb (o tu pantalla) cambia de color con la canción, sección por sección.</p>
          ${own ? "<p>Tiene una secuencia de luces propia, diseñada para esta canción.</p>" : ""}
          ${more.length ? `<h3>Más del álbum</h3><ul class="sa-list">${more.map(li).join("")}</ul>` : ""}
          ${guide}
        </section>`;
}

for (const [slug, title, desc, canon, noindex, data] of routes) {
  if (!/^[a-z0-9-]{1,90}$/.test(slug) || existsSync(join(OUT, "player", `${slug}.html`))) continue;
  const url = `https://lumiparty.com/player/${canon ?? slug}`;
  const html = playerHtml
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<link rel="canonical"[^>]*>)/, noindex ? `$1\n  <meta name="robots" content="noindex, follow">` : "$1")
    .replace(/<h1 class="sr">[^<]*<\/h1>/, (h) => (data ? `<h1 class="sr">${esc((data.song ?? data.album).title)}: luces para tu ARMY Bomb</h1>` : h))
    .replace("<!-- seo:about (scripts/build-site.mjs pone aquí la tarjeta de cada canción o álbum) -->", data ? about(data) : "");
  writeFileSync(join(OUT, "player", `${slug}.html`), html);
  songPages++;
}

// Portada: las cifras del catálogo escritas en el HTML (antes salían como «—» hasta que corría el JS).
{
  const { CONCERT_FILMS } = await import(pathToFileURL(join(process.cwd(), "src/catalog.js")).href);
  const stats = { albums: ALBUMS.length, songs: ALBUMS.reduce((n, a) => n + a.songs.length, 0), concerts: CONCERT_FILMS.length };
  const file = join(OUT, "index.html");
  let html = readFileSync(file, "utf8");
  for (const [k, v] of Object.entries(stats)) html = html.replace(`<dd data-stat="${k}">—</dd>`, `<dd data-stat="${k}">${v}</dd>`);
  writeFileSync(file, html);
}

// Páginas por idioma: la portada y la guía ya traducidas en /en/, /pt/, /ko/ y /id/, con hreflang en todas (también
// en las de español). Los textos sin traducción se avisan aquí: complétalos en src/i18n/.
const localized = [];
for (const [path, file] of Object.entries(LOCALIZED)) {
  const src = readFileSync(join(OUT, file), "utf8");
  writeFileSync(join(OUT, file), withAlternates(src, path));
  for (const code of Object.keys(LOCALES)) {
    const { html, leftovers } = await localizePage(src, path, code);
    const dest = join(OUT, code, file);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, html);
    localized.push(`/${code}${path}`);
    if (leftovers.length) console.warn(`  /${code}${path}: ${leftovers.length} texto(s) sin traducir: ${leftovers.slice(0, 5).join(" | ")}`);
  }
}

// Mapa del sitio: las páginas fijas (sitemap.xml del repo) más cada álbum y canción del reproductor (sin las viejas
// ni las vistas personales). Sin lastmod: la fecha del build no dice cuándo cambió cada página y Google la descarta.
{
  const base = readFileSync(join(OUT, "sitemap.xml"), "utf8");
  const extra = [
    ...localized.map((path) => `  <url><loc>https://lumiparty.com${path}</loc></url>`),
    ...routes.filter((r) => !r[3] && !r[4]).map(([slug]) => `  <url><loc>https://lumiparty.com/player/${slug}</loc></url>`),
  ];
  writeFileSync(join(OUT, "sitemap.xml"), base.replace("</urlset>", [...extra, "</urlset>"].join("\n")));
}

// Verificación: ninguna ruta bloqueada se coló y todo lo que pide el service worker existe.
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(OUT).map((f) => f.replaceAll("\\", "/").slice(OUT.length + 1));
const leaked = files.filter((f) => BLOCK.test(f) && !/^vendor\/.*LICENSE/i.test(f));
if (leaked.length) throw new Error(`No debería publicarse: ${leaked.join(", ")}`);
const shell = [...readFileSync("sw.js", "utf8").matchAll(/^\s*"([^"]+)",?$/gm)].map((m) => m[1]).filter((f) => f !== "./" && !f.endsWith("/"));
const missing = shell.filter((f) => !files.includes(f));
if (missing.length) throw new Error(`El service worker pide archivos que no se publican: ${missing.join(", ")}`);
console.log(`_site/: ${files.length} archivos publicados (${songPages} direcciones del reproductor, ${localized.length} páginas por idioma).`);
