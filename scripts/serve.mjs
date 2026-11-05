// Servidor estático mínimo para desarrollo (sin dependencias).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT) || 5173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".lrc": "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(root, path.endsWith("/") ? path + "index.html" : path));
  // Rutas de carpeta sin barra final (/player) → redirige a /player/, como GitHub Pages.
  if (!extname(path) && !path.endsWith("/")) return res.writeHead(301, { location: path + "/" + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "") }).end();
  if (!file.startsWith(root)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404).end("No encontrado");
  }
}).listen(port, "127.0.0.1", () => console.log(`Purple Wave Sync en http://localhost:${port}`));
