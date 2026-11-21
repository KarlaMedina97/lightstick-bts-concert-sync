// IndexNow: después de cada publicación avisa a Bing (y a los buscadores que comparten IndexNow: Yandex, Seznam,
// Naver…) qué páginas cambiaron, para que no esperen a pasar solos. La búsqueda de ChatGPT y Copilot usa Bing.
// La clave es pública por diseño: el archivo <clave>.txt en la raíz del sitio prueba que el dominio es nuestro.
//
//   node scripts/indexnow.mjs          páginas fijas (portada, guías, idiomas…) del mapa del sitio ya armado
//   node scripts/indexnow.mjs --all    todas, también cada canción y álbum (cuando cambia el catálogo)
//   node scripts/indexnow.mjs --dry    muestra lo que enviaría, sin enviar
//
// Lee _site/sitemap.xml (lo arma scripts/build-site.mjs); si no existe, el sitemap.xml del repo.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HOST = "lumiparty.com";
export const KEY = "6048336c2690cd90fb1fc59476b66e85";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

/** Direcciones del mapa del sitio; sin --all, solo las fijas (no las páginas de cada canción o álbum). */
export function pickUrls(xml, all = false) {
  const urls = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  return urls.filter((u) => new URL(u).host === HOST && (all || !new URL(u).pathname.startsWith("/player/") || new URL(u).pathname === "/player/"));
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const built = join(root, "_site", "sitemap.xml");
  const xml = readFileSync(existsSync(built) ? built : join(root, "sitemap.xml"), "utf8");
  const urlList = pickUrls(xml, args.has("--all"));
  if (!urlList.length) { console.log("IndexNow: no hay direcciones para avisar."); return; }
  const body = { host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList };
  if (args.has("--dry")) { console.log(`IndexNow (prueba): ${urlList.length} direcciones`, urlList.slice(0, 10)); return; }
  // Justo después de desplegar, la clave puede no estar publicada todavía (respondía 403): se espera hasta 2 min.
  for (let i = 0; i < 12; i++) {
    const t = await fetch(`${body.keyLocation}?v=${Date.now()}`).then((r) => (r.ok ? r.text() : ""), () => "");
    if (t.trim() === KEY) break;
    await new Promise((r) => setTimeout(r, 10_000));
  }
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  // 200 o 202: recibido. 403: la clave no coincide con el archivo publicado. 422: direcciones de otro dominio.
  console.log(`IndexNow: ${urlList.length} direcciones → HTTP ${res.status}`);
  if (!res.ok && res.status !== 202) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
