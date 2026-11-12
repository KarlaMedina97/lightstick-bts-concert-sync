// Páginas por idioma (/en/, /pt/, /ko/, /id/): la portada y la guía, ya traducidas en el HTML para que los buscadores
// indexen cada idioma en su propia dirección (con hreflang). Usa los mismos diccionarios que la app (src/i18n/*).
// Lo usan el build (scripts/build-site.mjs) y el servidor de desarrollo (scripts/serve.mjs). Sin dependencias.
import { known, translate, loadLang } from "../src/i18n.js";

export const ORIGIN = "https://lumiparty.com";
/** Idiomas con dirección propia (el español es la raíz). */
export const LOCALES = {
  en: { bcp: "en", og: "en_US" },
  pt: { bcp: "pt-BR", og: "pt_BR" },
  ko: { bcp: "ko", og: "ko_KR" },
  id: { bcp: "id", og: "id_ID" },
};
/** Páginas que existen en cada idioma: dirección → archivo fuente (en español). */
export const LOCALIZED = { "/": "index.html", "/guide/": "guide/index.html" };

const ATTRS = "aria-label|title|placeholder|data-tip|alt|aria-description|aria-roledescription|data-label|aria-valuetext";
const META = "description|og:title|og:description|og:image:alt|twitter:title|twitter:description|twitter:image:alt";
const decode = (s) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " })[e]);
const encText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;");
const encAttr = (s) => encText(s).replace(/"/g, "&quot;");
const ES = /[a-záéíóúñ¿¡]{3}/i;

/** <link rel="alternate" hreflang> de una página: español, los 4 idiomas y x-default (inglés, para el resto del mundo). */
export function alternates(path) {
  const rows = [["es", `${ORIGIN}${path}`], ...Object.entries(LOCALES).map(([c, l]) => [l.bcp, `${ORIGIN}/${c}${path}`]), ["x-default", `${ORIGIN}/en${path}`]];
  return rows.map(([h, u]) => `<link rel="alternate" hreflang="${h}" href="${u}">`).join("\n  ");
}
/** Agrega los hreflang justo después de la canónica (la versión en español los lleva igual que las traducidas). */
export function withAlternates(html, path) {
  if (html.includes('hreflang="x-default"')) return html;
  return html.replace(/(<link rel="canonical"[^>]*>)/, `$1\n  ${alternates(path)}`);
}

/**
 * Traduce la página `path` (fuente en español) al idioma `code`. Devuelve { html, leftovers }: leftovers son textos
 * en español que no tienen traducción (el build los muestra para completarlos en src/i18n/).
 */
export async function localizePage(html, path, code) {
  const loc = LOCALES[code];
  if (!loc || !LOCALIZED[path]) throw new Error(`Sin versión ${code} para ${path}`);
  await loadLang(code);
  const tr = (s) => translate(s, code);
  const leftovers = new Set();

  // Direcciones relativas → absolutas desde la raíz (la página ahora vive un nivel más abajo); las que apuntan a una
  // página traducida van a su versión en este idioma.
  const url = (v) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(v)) return v;
    const u = new URL(v, ORIGIN + path);
    const p = LOCALIZED[u.pathname] ? `/${code}${u.pathname}` : u.pathname;
    return p + u.search + u.hash;
  };

  // Bloques que no se traducen: scripts (importmap y JSON-LD quedan idénticos y su hash de la CSP sigue valiendo),
  // estilos (solo se corrigen sus url()), svg, comentarios, código y lo marcado translate="no", lang="ko" o data-lang-toggle.
  const kept = [];
  const keep = (s) => `\u0000${kept.push(s) - 1}\u0000`;
  let out = html
    .replace(/<style\b[\s\S]*?<\/style>/g, (s) => keep(s.replace(/url\((?!["']?(?:data:|https?:|\/))["']?([^)"']+)["']?\)/g, (_, u) => `url(${url(u)})`)))
    // <script src> también se protege (su contenido en línea no cambia), pero su dirección sí se corrige.
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, (s) => keep(s.replace(/^<script\b[^>]*>/, (tag) => tag.replace(/\ssrc="([^"]*)"/, (_, v) => ` src="${url(v)}"`))))
    .replace(/<svg\b[\s\S]*?<\/svg>|<!--[\s\S]*?-->|<code\b[\s\S]*?<\/code>/g, keep)
    .replace(/<([a-z][a-z0-9]*)\b[^>]*\s(?:translate="no"|lang="ko"|data-lang-toggle)[^>]*>[\s\S]*?<\/\1>/g, (s) => keep(s.replace(/\s(href|src)="([^"]*)"/g, (_, a, v) => ` ${a}="${url(v)}"`)));

  // Etiquetas: idioma, canónica, Open Graph, atributos accesibles y direcciones.
  out = out.replace(/<[a-z][^>]*>/gi, (tag) => {
    if (/^<html\b/i.test(tag)) return tag.replace(/\slang="[^"]*"/, ` lang="${loc.bcp}"`);
    if (/rel="canonical"/.test(tag) || /property="og:url"/.test(tag)) return tag.replace(/(href|content)="[^"]*"/, `$1="${ORIGIN}/${code}${path}"`);
    if (/property="og:locale"/.test(tag)) return tag.replace(/content="[^"]*"/, `content="${loc.og}"`);
    if (/property="og:locale:alternate"/.test(tag)) return tag.replace(/content="[^"]*"/, 'content="es_419"');
    if (new RegExp(`<meta\\s+(?:name|property)="(?:${META})"`).test(tag)) {
      return tag.replace(/content="([^"]*)"/, (_, v) => `content="${encAttr(tr(decode(v)))}"`);
    }
    return tag
      .replace(new RegExp(`\\s(${ATTRS})="([^"]*)"`, "g"), (_, a, v) => {
        const t = tr(decode(v));
        if (t === decode(v) && ES.test(v) && !known(decode(v), code)) leftovers.add(v);
        return ` ${a}="${encAttr(t)}"`;
      })
      .replace(/\s(href|src)="([^"]*)"/g, (_, a, v) => ` ${a}="${url(v)}"`);
  });

  // Textos entre etiquetas.
  out = out.replace(/>([^<>]+)</g, (m, txt) => {
    if (!/\p{L}/u.test(txt) || txt.includes("\u0000")) return m;
    const src = decode(txt);
    const t = tr(src);
    if (t === src && ES.test(src) && !known(src, code) && /[áéíóúñ¿¡]|\b(el|la|los|las|de|del|tu|tus|con|para|por|una?|y|que|sin|en)\b/i.test(src)) leftovers.add(src.trim());
    return `>${t === src ? txt : encText(t)}<`;
  });

  out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => kept[Number(i)]);
  return { html: withAlternates(out, path), leftovers: [...leftovers] };
}
