// Idioma de la interfaz: español (fuente) o inglés.
// El HTML y el JS se escriben en español; en inglés, una capa traduce los textos visibles y los atributos
// accesibles (aria-label, title, placeholder…) con los diccionarios de src/i18n/, también los que el JS
// cambia después (MutationObserver). Volver a español restaura los originales sin recargar.
// Nunca traduce datos: solo textos que estén en el diccionario (los títulos de canciones no lo están).
import landing, { patterns as pLanding } from "./i18n/en-landing.js";
import player, { patterns as pPlayer } from "./i18n/en-player.js";
import app, { patterns as pApp } from "./i18n/en-app.js";

const KEY = "pws.lang";
const ATTRS = ["aria-label", "title", "placeholder", "data-tip", "alt", "aria-description", "aria-roledescription", "data-label", "aria-valuetext"];
const SKIP = "script, style, svg, textarea, [translate=no], [lang=ko], [contenteditable]"; // de los input solo se tocan atributos, nunca value

const EXACT = new Map(Object.entries({ ...landing, ...player, ...app }).map(([es, en]) => [norm(es), en]));
const PATTERNS = [...pApp, ...pPlayer, ...pLanding].map(([re, to]) => [re instanceof RegExp ? re : new RegExp(re), to]);

function norm(s) { return s.replace(/\s+/g, " ").trim(); }

// Anotaciones en español dentro de títulos del catálogo: "(Japón)", "(cover de Adele)", "(con Coldplay)"…
// Solo se cambian dentro de paréntesis, así el nombre de la canción nunca se toca.
const NOTES = [
  [/\bJapón(?![\p{L}])/gu, "Japan"], [/\bcover de\b/g, "cover of"], [/\barreglo de\b/g, "arranged by"],
  [/^con\b/g, "with"], [/, con\b/g, ", with"], [/\bCeremonia de apertura\b/g, "Opening Ceremony"],
  [/\bversión(?![\p{L}])/gu, "version"], [/\ben vivo\b/g, "live"],
];
function annotations(s) {
  if (!s.includes("(")) return null;
  const out = s.replace(/\(([^()]*)\)/g, (m, inner) => `(${NOTES.reduce((x, [re, to]) => x.replace(re, to), inner)})`);
  return out === s ? null : out;
}

/** Traduce un texto en español (o lo devuelve igual si no hay traducción). */
export function translate(es) {
  const key = norm(es);
  if (!key) return es;
  let en = EXACT.get(key);
  if (en == null) {
    for (const [re, to] of PATTERNS) {
      if (re.test(key)) {
        en = key.replace(re, (...m) => (typeof to === "function" ? to(...m) : to.replace(/\$(\d)/g, (_, n) => {
          const part = m[Number(n)] ?? "";
          return EXACT.get(norm(part)) ?? part; // las partes capturadas también se traducen si se puede
        })));
        break;
      }
    }
  }
  en = annotations(en ?? key) ?? en; // también sobre lo que dejó un patrón (títulos capturados)
  if (en == null) return es;
  // Conserva los espacios de los bordes (importan entre elementos en línea).
  const lead = es.match(/^\s*/)[0], trail = es.match(/\s*$/)[0];
  return lead + en + trail;
}

function stored() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
const prefers = () => ((navigator.languages ?? [navigator.language]).some((l) => /^es\b/i.test(l ?? "")) ? "es" : "en");
export let lang = stored() === "en" || stored() === "es" ? stored() : prefers();

/** t("texto en español") → texto en el idioma actual (para el JS que necesita el valor, p. ej. narración). */
export const t = (es) => (lang === "en" ? translate(es) : es);

// Originales en español, por nodo de texto y por (elemento, atributo).
const textOrig = new WeakMap(); // Text → { es, en }
const attrOrig = new WeakMap(); // Element → Map(attr → { es, en })

function trText(node) {
  const v = node.nodeValue;
  const rec = textOrig.get(node);
  if (rec && rec.en === v) return; // ya traducido
  const en = translate(v);
  if (en === v) return;
  textOrig.set(node, { es: v, en });
  node.nodeValue = en;
}
function trAttr(el, a) {
  const v = el.getAttribute(a);
  if (v == null) return;
  let m = attrOrig.get(el);
  if (m?.get(a)?.en === v) return;
  const en = translate(v);
  if (en === v) return;
  if (!m) attrOrig.set(el, (m = new Map()));
  m.set(a, { es: v, en });
  el.setAttribute(a, en);
}
const skipped = (el) => el?.closest?.(SKIP);

function walk(root, fn) {
  if (root.nodeType === 3) { if (!skipped(root.parentElement)) fn.text(root); return; }
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.nodeType === 1 && skipped(root)) return;
  if (root.nodeType === 1) fn.el(root);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = tw.nextNode(); n; n = tw.nextNode()) (n.nodeType === 3 ? fn.text : fn.el)(n);
}
const toEn = { text: trText, el: (el) => { for (const a of ATTRS) if (el.hasAttribute(a)) trAttr(el, a); } };
const toEs = {
  text: (n) => { const r = textOrig.get(n); if (r && n.nodeValue === r.en) n.nodeValue = r.es; textOrig.delete(n); },
  el: (el) => {
    const m = attrOrig.get(el);
    if (!m) return;
    for (const [a, r] of m) if (el.getAttribute(a) === r.en) el.setAttribute(a, r.es);
    attrOrig.delete(el);
  },
};

let observer = null;
function observe() {
  observer = new MutationObserver((list) => {
    if (lang !== "en") return;
    for (const r of list) {
      if (r.type === "characterData") { if (!skipped(r.target.parentElement)) trText(r.target); }
      else if (r.type === "attributes") { if (!skipped(r.target)) trAttr(r.target, r.attributeName); }
      else for (const n of r.addedNodes) walk(n, toEn);
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

function applyMeta() {
  document.documentElement.lang = lang;
  const d = document.querySelector('meta[name="description"]');
  if (d) {
    d.dataset.es ??= d.content;
    d.content = lang === "en" ? translate(d.dataset.es) : d.dataset.es;
  }
  for (const b of document.querySelectorAll("[data-lang-toggle]")) {
    const other = lang === "en" ? "es" : "en";
    b.textContent = b.dataset.langToggle === "long" ? (other === "en" ? "English" : "Español") : other.toUpperCase();
    b.setAttribute("lang", other);
    b.setAttribute("aria-label", other === "en" ? "Switch to English" : "Cambiar a español");
    b.title = other === "en" ? "English" : "Español";
  }
}

/** Copia de `el` con sus textos en español (aunque ya se hayan traducido), para quien reconstruye el DOM. */
export function spanishClone(el) {
  const copy = el.cloneNode(true);
  const a = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), b = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
  for (let x = a.nextNode(), y = b.nextNode(); x && y; x = a.nextNode(), y = b.nextNode()) {
    const r = textOrig.get(x);
    if (r && x.nodeValue === r.en) y.nodeValue = r.es;
  }
  return copy;
}

/** Traduce los textos de un árbol que todavía no está en la página (lo deja en el idioma actual). */
export function localize(root) {
  if (lang !== "en") return root;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeValue = translate(n.nodeValue);
  return root;
}

export function setLang(next) {
  if (next === lang) return;
  lang = next;
  try { localStorage.setItem(KEY, lang); } catch {}
  walk(document.documentElement, lang === "en" ? toEn : toEs);
  applyMeta();
  dispatchEvent(new CustomEvent("pws:lang", { detail: lang }));
}

function init() {
  // Los botones de idioma llevan translate=no: su texto es el otro idioma y lo maneja applyMeta.
  for (const b of document.querySelectorAll("[data-lang-toggle]")) {
    b.setAttribute("translate", "no");
    b.addEventListener("click", () => setLang(lang === "en" ? "es" : "en"));
  }
  if (lang === "en") walk(document.documentElement, toEn);
  applyMeta();
  observe();
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
