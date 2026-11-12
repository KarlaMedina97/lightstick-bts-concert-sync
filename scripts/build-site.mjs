// Arma _site/ con SOLO lo que el sitio necesita para funcionar (lista explícita de lo que se publica).
// Documentación interna, pruebas, scripts, workflows, configuración de agentes y notas del runner local no se
// publican: no son secretos (el repo es público), pero no tienen por qué estar en el dominio.
// Uso: npm run build  (CI lo ejecuta antes de desplegar)
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

export const PUBLIC = [
  "index.html", "app.html", "privacidad.html", "player", "privacy",
  "src", "vendor", "fonts", "icons", "assets",
  "styles.css", "tour.css", "landing.css", "sw.js", "manifest.webmanifest", "_headers", "LICENSE",
  "robots.txt", "sitemap.xml", "llms.txt", "404.html", "terms", "ai", "guide", ".well-known", ".nojekyll",
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
  routes.push([`album-${album.id}`, `${album.title} · ${who} · LumiParty`, `${album.title} (${who}${album.year ? `, ${album.year}` : ""}): canciones con luces para tu ARMY Bomb. Página de fans, no oficial.`]);
  for (const song of album.songs ?? []) routes.push([song.id, `${song.title} · ${who} · LumiParty`, `Tu ARMY Bomb al ritmo de ${song.title} (${who}) con el video oficial. Página de fans, no oficial.`]);
}
// Direcciones viejas en español: la misma página (el reproductor las pasa a la nueva sin recargar).
for (const [old, now] of [["albumes", "albums"], ["me-gusta", "likes"], ["mis-videos", "my-videos"], ["luces", "lights"]]) {
  const r = routes.find((x) => x[0] === now);
  if (r) routes.push([old, r[1], r[2], now, r[4]]); // canónica: la nueva
}
for (const [slug, title, desc, canon, noindex] of routes) {
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
    .replace(/(<link rel="canonical"[^>]*>)/, noindex ? `$1
  <meta name="robots" content="noindex, follow">` : "$1");
  writeFileSync(join(OUT, "player", `${slug}.html`), html);
  songPages++;
}

// Mapa del sitio: las páginas fijas (sitemap.xml del repo) más cada álbum y canción del reproductor (sin las viejas
// ni las vistas personales). Sin lastmod: la fecha del build no dice cuándo cambió cada página y Google la descarta.
{
  const base = readFileSync(join(OUT, "sitemap.xml"), "utf8");
  const extra = routes.filter((r) => !r[3] && !r[4]).map(([slug]) => `  <url><loc>https://lumiparty.com/player/${slug}</loc></url>`);
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
console.log(`_site/: ${files.length} archivos publicados (${songPages} direcciones del reproductor).`);
