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
  "robots.txt", "sitemap.xml", "llms.txt", "404.html", "terms", "ai", ".well-known", ".nojekyll",
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
for (const album of ALBUMS) for (const song of album.songs ?? []) {
  if (!/^[a-z0-9-]{1,80}$/.test(song.id) || existsSync(join(OUT, "player", `${song.id}.html`))) continue;
  const who = album.artist && album.artist !== "BTS" ? album.artist : "BTS";
  const url = `https://lumiparty.com/player/${song.id}`;
  const title = `${song.title} · ${who} · LumiParty`;
  const desc = `Tu ARMY Bomb al ritmo de ${song.title} (${who}) con el video oficial. Página de fans, no oficial.`;
  const html = playerHtml
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`);
  writeFileSync(join(OUT, "player", `${song.id}.html`), html);
  songPages++;
}

// Verificación: ninguna ruta bloqueada se coló y todo lo que pide el service worker existe.
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(OUT).map((f) => f.replaceAll("\\", "/").slice(OUT.length + 1));
const leaked = files.filter((f) => BLOCK.test(f) && !/^vendor\/.*LICENSE/i.test(f));
if (leaked.length) throw new Error(`No debería publicarse: ${leaked.join(", ")}`);
const shell = [...readFileSync("sw.js", "utf8").matchAll(/^\s*"([^"]+)",?$/gm)].map((m) => m[1]).filter((f) => f !== "./" && !f.endsWith("/"));
const missing = shell.filter((f) => !files.includes(f));
if (missing.length) throw new Error(`El service worker pide archivos que no se publican: ${missing.join(", ")}`);
console.log(`_site/: ${files.length} archivos publicados (${songPages} páginas de canción).`);
