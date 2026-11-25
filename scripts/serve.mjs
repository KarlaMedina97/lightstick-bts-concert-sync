// Servidor estático mínimo para desarrollo (sin dependencias).
import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { LOCALIZED, localizePage, withAlternates } from "./localize-pages.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT) || (process.argv.includes("--https") ? 5443 : 5173);
// --lan: escucha en la red local para probar en el teléfono u otra PC (npm run dev:lan). Por defecto, solo esta PC.
const lan = process.argv.includes("--lan");
// --https (con --lan): Safari en iPhone/iPad solo da el giroscopio y el acelerómetro a páginas HTTPS. Usa un
// certificado propio en .cert/ (no se publica ni se sirve): `npm run dev:https` lo explica. El equipo avisa que no es
// de confianza: «Mostrar detalles» → «visitar este sitio web».
const https = process.argv.includes("--https");
const scheme = https ? "https" : "http";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".woff2": "font/woff2",
  ".lrc": "text/plain; charset=utf-8",
};

const handler = async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(root, path.endsWith("/") ? path + "index.html" : path));
  // Canción con dirección amigable (/player/dynamite): en el sitio la sirve player/dynamite.html (lo arma el build).
  if (/^\/player\/[a-z0-9-]{1,90}$/.test(path)) file = join(root, "player", "index.html");
  // Rutas de carpeta sin barra final (/player) → redirige a /player/, como GitHub Pages.
  else if (!extname(path) && !path.endsWith("/")) return res.writeHead(301, { location: path + "/" + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "") }).end();
  if (file !== root && !file.startsWith(root + sep)) return res.writeHead(403).end();
  // Nunca archivos ocultos (.git, .env, .claude…): importa sobre todo en modo --lan.
  if (/[\\/]\./.test(file.slice(root.length))) return res.writeHead(403).end();
  // Páginas por idioma (/en/, /pt/guide/…): las arma el build; aquí se generan al vuelo con el mismo código.
  const loc = path.match(/^\/(en|pt|ko|id|zh)(\/.*)$/);
  if (loc && LOCALIZED[loc[2]]) {
    try {
      const { html } = await localizePage(await readFile(join(root, LOCALIZED[loc[2]]), "utf8"), loc[2], loc[1]);
      res.writeHead(200, { "content-type": types[".html"], "cache-control": "no-store" });
      return res.end(lan && !https ? html.replace(/;\s*upgrade-insecure-requests/g, "") : html);
    } catch (e) {
      return res.writeHead(500).end(String(e));
    }
  }
  try {
    let body = await readFile(file);
    const page = Object.entries(LOCALIZED).find(([, f]) => join(root, f) === file)?.[0];
    if (page) body = Buffer.from(withAlternates(body.toString("utf8"), page));
    // En la red local no hay HTTPS: la CSP del sitio pide «upgrade-insecure-requests» (correcto en lumiparty.com) y
    // el navegador pasaba cada recurso a https://… y fallaba. Solo en --lan y solo al servir, el archivo no cambia.
    if (lan && !https && extname(file) === ".html") body = Buffer.from(body.toString("utf8").replace(/;\s*upgrade-insecure-requests/g, ""));
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404).end("No encontrado");
  }
};
const server = https
  ? createHttpsServer({ key: readFileSync(join(root, ".cert", "lan.key")), cert: readFileSync(join(root, ".cert", "lan.crt")) }, handler)
  : createServer(handler);
server.listen(port, lan ? "0.0.0.0" : "127.0.0.1", async () => {
  console.log(`LumiParty en ${scheme}://localhost:${port}`);
  if (lan) {
    const { networkInterfaces } = await import("node:os");
    for (const a of Object.values(networkInterfaces()).flat()) if (a?.family === "IPv4" && !a.internal) console.log(`  En tu red local: ${scheme}://${a.address}:${port}`);
    if (!https) console.log("  Ojo: sin HTTPS no hay Bluetooth web ni giroscopio en iPhone/iPad; usa npm run dev:https.");
  }
});
