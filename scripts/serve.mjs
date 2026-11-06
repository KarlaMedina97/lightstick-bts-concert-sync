// Servidor estático mínimo para desarrollo (sin dependencias).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT) || 5173;
// --lan: escucha en la red local para probar en el teléfono u otra PC (npm run dev:lan). Por defecto, solo esta PC.
const lan = process.argv.includes("--lan");
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

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(root, path.endsWith("/") ? path + "index.html" : path));
  // Canción con dirección amigable (/player/dynamite): en el sitio la sirve player/dynamite.html (lo arma el build).
  if (/^\/player\/[a-z0-9-]{1,90}$/.test(path)) file = join(root, "player", "index.html");
  // Rutas de carpeta sin barra final (/player) → redirige a /player/, como GitHub Pages.
  else if (!extname(path) && !path.endsWith("/")) return res.writeHead(301, { location: path + "/" + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "") }).end();
  if (file !== root && !file.startsWith(root + sep)) return res.writeHead(403).end();
  // Nunca archivos ocultos (.git, .env, .claude…): importa sobre todo en modo --lan.
  if (/[\\/]\./.test(file.slice(root.length))) return res.writeHead(403).end();
  try {
    let body = await readFile(file);
    // En la red local no hay HTTPS: la CSP del sitio pide «upgrade-insecure-requests» (correcto en lumiparty.com) y
    // el navegador pasaba cada recurso a https://… y fallaba. Solo en --lan y solo al servir, el archivo no cambia.
    if (lan && extname(file) === ".html") body = Buffer.from(body.toString("utf8").replace(/;\s*upgrade-insecure-requests/g, ""));
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404).end("No encontrado");
  }
}).listen(port, lan ? "0.0.0.0" : "127.0.0.1", async () => {
  console.log(`LumiParty en http://localhost:${port}`);
  if (lan) {
    const { networkInterfaces } = await import("node:os");
    for (const a of Object.values(networkInterfaces()).flat()) if (a?.family === "IPv4" && !a.internal) console.log(`  En tu red local: http://${a.address}:${port}`);
    console.log("  Ojo: el Bluetooth web solo funciona en localhost o HTTPS; en otros dispositivos prueba la pantalla.");
  }
});
