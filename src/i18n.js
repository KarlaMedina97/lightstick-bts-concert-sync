// Idioma de la interfaz: español (fuente), inglés, portugués (Brasil), coreano e indonesio.
// El HTML y el JS se escriben en español; en otro idioma, una capa traduce los textos visibles y los atributos
// accesibles (aria-label, title, placeholder…) con los diccionarios de src/i18n/<código>-*.js, también los que el
// JS cambia después (MutationObserver). Volver a español restaura los originales sin recargar.
// El inglés viene incluido (es el de respaldo); los demás se cargan solo si alguien los elige.
// Nunca traduce datos: solo textos que estén en el diccionario (los títulos de canciones no lo están).
import landing, { patterns as pLanding } from "./i18n/en-landing.js";
import player, { patterns as pPlayer } from "./i18n/en-player.js";
import app, { patterns as pApp } from "./i18n/en-app.js";

/** Idiomas disponibles, con su nombre en su propio idioma. */
// Un idioma nuevo entra al menú solo si su traducción pasa la prueba de tests/langs.test.js.
export const LANGS = [
  ["es", "Español"], ["en", "English"], ["pt", "Português (Brasil)"], ["ko", "한국어"], ["id", "Bahasa Indonesia"],
];
const CODES = LANGS.map(([c]) => c);
const BCP47 = { es: "es", en: "en", pt: "pt-BR", ko: "ko", id: "id" };
/** Código de voz para la síntesis de voz del sistema. */
export const VOICE = { es: "es-ES", en: "en-US", pt: "pt-BR", ko: "ko-KR", id: "id-ID" };

const KEY = "pws.lang";
const ATTRS = ["aria-label", "title", "placeholder", "data-tip", "alt", "aria-description", "aria-roledescription", "data-label", "aria-valuetext"];
const SKIP = "script, style, svg, textarea, [translate=no], [lang=ko]:not(html), [contenteditable], .lang-pop"; // de los input solo se tocan atributos

function norm(s) { return s.replace(/\s+/g, " ").trim(); }
function table(dicts, patterns) {
  return {
    exact: new Map(Object.entries(Object.assign({}, ...dicts)).map(([es, x]) => [norm(es), x])),
    patterns: patterns.flat().map(([re, to]) => [re instanceof RegExp ? re : new RegExp(re), to]),
  };
}
const TABLES = { en: table([landing, player, app], [pApp, pPlayer, pLanding]) };
const loading = {};
/** Carga (una vez) los diccionarios de un idioma. */
function load(code) {
  if (code === "es" || TABLES[code]) return Promise.resolve();
  return (loading[code] ??= Promise.all(["landing", "player", "app"].map((p) => import(`./i18n/${code}-${p}.js`)))
    .then(([l, pl, a]) => { TABLES[code] = table([l.default, pl.default, a.default], [a.patterns, pl.patterns, l.patterns]); })
    .catch(() => { delete loading[code]; }));
}

// Anotaciones en español dentro de títulos del catálogo: "(Japón)", "(cover de Adele)", "(con Coldplay)"…
// Solo se cambian dentro de paréntesis, así el nombre de la canción nunca se toca.
const NOTES = {
  en: [[/\bJapón(?![\p{L}])/gu, "Japan"], [/\bcover de\b/g, "cover of"], [/\barreglo de\b/g, "arranged by"], [/^con\b/g, "with"], [/, con\b/g, ", with"], [/\bCeremonia de apertura\b/g, "Opening Ceremony"], [/\bversión(?![\p{L}])/gu, "version"], [/\ben vivo\b/g, "live"]],
  pt: [[/\bJapón(?![\p{L}])/gu, "Japão"], [/\barreglo de\b/g, "arranjo de"], [/^con\b/g, "com"], [/, con\b/g, ", com"], [/\bCeremonia de apertura\b/g, "Cerimônia de abertura"], [/\bversión(?![\p{L}])/gu, "versão"], [/\ben vivo\b/g, "ao vivo"]],
  ko: [[/\bJapón(?![\p{L}])/gu, "일본"], [/\bcover de\b/g, "커버:"], [/\barreglo de\b/g, "편곡:"], [/^con\b/g, "with"], [/, con\b/g, ", with"], [/\bCeremonia de apertura\b/g, "개막식"], [/\bversión(?![\p{L}])/gu, "버전"], [/\ben vivo\b/g, "라이브"]],
  id: [[/\bJapón(?![\p{L}])/gu, "Jepang"], [/\bcover de\b/g, "cover dari"], [/\barreglo de\b/g, "aransemen"], [/^con\b/g, "bersama"], [/, con\b/g, ", bersama"], [/\bCeremonia de apertura\b/g, "Upacara Pembukaan"], [/\bversión(?![\p{L}])/gu, "versi"], [/\ben vivo\b/g, "live"]],
};
function annotations(s, code) {
  if (!s.includes("(") || !NOTES[code]) return null;
  const out = s.replace(/\(([^()]*)\)/g, (m, inner) => `(${NOTES[code].reduce((x, [re, to]) => x.replace(re, to), inner)})`);
  return out === s ? null : out;
}

/**
 * Traduce un texto en español al idioma `code` (por defecto, inglés), o lo devuelve igual si no hay traducción.
 * Si el idioma todavía no cargó, usa el inglés como respaldo (nunca deja la interfaz a medias en español).
 */
export function translate(es, code = "en") {
  if (code === "es") return es;
  const key = norm(es);
  if (!key) return es;
  const T = TABLES[code] ?? TABLES.en;
  let out = T.exact.get(key);
  if (out == null) {
    for (const [re, to] of T.patterns) {
      if (re.test(key)) {
        out = key.replace(re, (...m) => (typeof to === "function" ? to(...m) : to.replace(/\$(\d)/g, (_, n) => {
          const part = m[Number(n)] ?? "";
          return T.exact.get(norm(part)) ?? part; // las partes capturadas también se traducen si se puede
        })));
        break;
      }
    }
  }
  out = annotations(out ?? key, TABLES[code] ? code : "en") ?? out; // también sobre lo que dejó un patrón
  if (out == null) return es;
  // Conserva los espacios de los bordes (importan entre elementos en línea).
  const lead = es.match(/^\s*/)[0], trail = es.match(/\s*$/)[0];
  return lead + out + trail;
}

function stored() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
/** Idioma del dispositivo, si es uno de los nuestros; si no, inglés. ("in" es el código antiguo del indonesio.) */
function prefers() {
  const list = typeof navigator === "undefined" ? [] : navigator.languages ?? [navigator.language];
  for (const l of list) {
    const c = String(l ?? "").toLowerCase().split("-")[0];
    if (CODES.includes(c)) return c;
    if (c === "in") return "id";
  }
  return "en";
}
export let lang = CODES.includes(stored()) ? stored() : prefers();

/** t("texto en español") → texto en el idioma actual (para el JS que necesita el valor, p. ej. narración). */
export const t = (es) => (lang === "es" ? es : translate(es, lang));

// Originales en español, por nodo de texto y por (elemento, atributo).
const textOrig = new WeakMap(); // Text → { es, out }
const attrOrig = new WeakMap(); // Element → Map(attr → { es, out })

function trText(node) {
  const v = node.nodeValue;
  const rec = textOrig.get(node);
  if (rec && rec.out === v) return; // ya traducido
  const out = translate(v, lang);
  if (out === v) return;
  textOrig.set(node, { es: v, out });
  node.nodeValue = out;
}
function trAttr(el, a) {
  const v = el.getAttribute(a);
  if (v == null) return;
  let m = attrOrig.get(el);
  if (m?.get(a)?.out === v) return;
  const out = translate(v, lang);
  if (out === v) return;
  if (!m) attrOrig.set(el, (m = new Map()));
  m.set(a, { es: v, out });
  el.setAttribute(a, out);
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
const toLang = { text: trText, el: (el) => { for (const a of ATTRS) if (el.hasAttribute(a)) trAttr(el, a); } };
const toEs = {
  text: (n) => { const r = textOrig.get(n); if (r && n.nodeValue === r.out) n.nodeValue = r.es; textOrig.delete(n); },
  el: (el) => {
    const m = attrOrig.get(el);
    if (!m) return;
    for (const [a, r] of m) if (el.getAttribute(a) === r.out) el.setAttribute(a, r.es);
    attrOrig.delete(el);
  },
};

let observer = null;
function observe() {
  observer = new MutationObserver((list) => {
    if (lang === "es") return;
    for (const r of list) {
      if (r.type === "characterData") { if (!skipped(r.target.parentElement)) trText(r.target); }
      else if (r.type === "attributes") { if (!skipped(r.target)) trAttr(r.target, r.attributeName); }
      else for (const n of r.addedNodes) walk(n, toLang);
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

const nameOf = (c) => LANGS.find(([x]) => x === c)?.[1] ?? c;
function applyMeta() {
  document.documentElement.lang = BCP47[lang] ?? lang;
  const d = document.querySelector('meta[name="description"]');
  if (d) {
    d.dataset.es ??= d.content;
    d.content = lang === "es" ? d.dataset.es : translate(d.dataset.es, lang);
  }
  // Botones de idioma: muestran el idioma actual y abren el menú con los demás.
  for (const b of document.querySelectorAll("[data-lang-toggle]")) {
    b.textContent = b.dataset.langToggle === "long" ? nameOf(lang) : lang.toUpperCase(); // el globo lo pone el estilo del menú
    b.setAttribute("lang", BCP47[lang]);
    b.setAttribute("aria-haspopup", "menu");
    b.setAttribute("aria-label", `${t("Idioma")}: ${nameOf(lang)}`);
    b.title = t("Idioma");
  }
}

/** Copia de `el` con sus textos en español (aunque ya se hayan traducido), para quien reconstruye el DOM. */
export function spanishClone(el) {
  const copy = el.cloneNode(true);
  const a = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), b = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
  for (let x = a.nextNode(), y = b.nextNode(); x && y; x = a.nextNode(), y = b.nextNode()) {
    const r = textOrig.get(x);
    if (r && x.nodeValue === r.out) y.nodeValue = r.es;
  }
  return copy;
}

/** Traduce los textos de un árbol que todavía no está en la página (lo deja en el idioma actual). */
export function localize(root) {
  if (lang === "es") return root;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeValue = translate(n.nodeValue, lang);
  return root;
}

export async function setLang(next) {
  if (next === lang || !CODES.includes(next)) return;
  await load(next);
  if (lang !== "es") walk(document.documentElement, toEs); // primero vuelve al original
  lang = next;
  try { localStorage.setItem(KEY, lang); } catch {}
  if (lang !== "es") walk(document.documentElement, toLang);
  applyMeta();
  dispatchEvent(new CustomEvent("pws:lang", { detail: lang }));
}

// ---------- Menú de idioma ----------
let pop = null, popFor = null;
function closeMenu(focusBack = true) {
  if (!pop) return;
  pop.remove();
  popFor?.setAttribute("aria-expanded", "false");
  if (focusBack) popFor?.focus();
  pop = popFor = null;
}
function openMenu(btn) {
  if (pop) { const same = popFor === btn; closeMenu(false); if (same) return; }
  pop = document.createElement("div");
  pop.className = "lang-pop";
  pop.setAttribute("role", "menu");
  pop.setAttribute("aria-label", t("Idioma"));
  for (const [code, name] of LANGS) {
    const it = document.createElement("button");
    it.type = "button";
    it.setAttribute("role", "menuitemradio");
    it.setAttribute("aria-checked", String(code === lang));
    it.setAttribute("lang", BCP47[code]);
    it.dataset.code = code;
    it.textContent = name;
    it.onclick = () => { closeMenu(true); setLang(code); };
    pop.append(it);
  }
  document.body.append(pop);
  popFor = btn;
  btn.setAttribute("aria-expanded", "true");
  const r = btn.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  pop.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.right - w))}px`;
  pop.style.top = `${r.bottom + 6 + h > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6}px`;
  (pop.querySelector('[aria-checked="true"]') ?? pop.firstElementChild).focus();
  pop.addEventListener("keydown", (e) => {
    const items = [...pop.querySelectorAll("button")], i = items.indexOf(document.activeElement);
    if (e.key === "Escape") { e.preventDefault(); closeMenu(true); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus(); }
    else if (e.key === "Tab") closeMenu(false);
  });
}

async function init() {
  // Los botones de idioma llevan translate=no: su texto lo maneja applyMeta.
  for (const b of document.querySelectorAll("[data-lang-toggle]")) {
    b.setAttribute("translate", "no");
    b.setAttribute("aria-expanded", "false");
    b.addEventListener("click", (e) => { e.stopPropagation(); openMenu(b); });
  }
  document.addEventListener("pointerdown", (e) => { if (pop && !pop.contains(e.target) && !e.target.closest("[data-lang-toggle]")) closeMenu(false); });
  addEventListener("resize", () => closeMenu(false));
  if (lang !== "es") {
    await load(lang);
    walk(document.documentElement, toLang);
  }
  applyMeta();
  observe();
  if (lang !== "es" && lang !== "en") dispatchEvent(new CustomEvent("pws:lang", { detail: lang }));
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}
