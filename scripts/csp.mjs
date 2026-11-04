// Inserta la Content-Security-Policy en index.html y app.html.
// Recalcula el hash del importmap en línea, así que ejecútalo si cambias ese bloque: `npm run csp`.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const YT = "https://www.youtube.com https://s.ytimg.com";
const base = {
  "default-src": "'self'",
  "style-src": "'self' 'unsafe-inline'", // atributos style generados por la app; sin scripts en línea
  "img-src": "'self' data: https://i.ytimg.com",
  "frame-src": "https://www.youtube-nocookie.com https://www.youtube.com",
  "object-src": "'none'",
  "base-uri": "'self'",
  "worker-src": "'self'",
  "manifest-src": "'self'",
  "media-src": "'self'",
  "font-src": "'self'",
  "upgrade-insecure-requests": "",
};

function policy(extra) {
  return Object.entries({ ...base, ...extra })
    .map(([k, v]) => (v ? `${k} ${v}` : k))
    .join("; ");
}

function inlineHashes(html) {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => `'sha256-${createHash("sha256").update(m[1], "utf8").digest("base64")}'`,
  );
}

function apply(file, extra) {
  let html = readFileSync(file, "utf8");
  const hashes = inlineHashes(html).join(" ");
  const csp = policy({ ...extra, "script-src": `'self' ${hashes} ${YT}`.replace(/\s+/g, " ").trim() });
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
  html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\n?\s*/, "");
  html = html.replace(/(<meta charset="utf-8">\n)/, `$1  ${meta}\n`);
  writeFileSync(file, html);
  console.log(`${file}: ${csp}`);
}

apply("index.html", { "connect-src": "'self'", "form-action": "'none'" });
apply("app.html", {
  // oEmbed para títulos de videos y, si se configura, el ranking global de Supabase.
  "connect-src": "'self' https://www.youtube.com https://*.supabase.co",
  "form-action": "'self'",
});
