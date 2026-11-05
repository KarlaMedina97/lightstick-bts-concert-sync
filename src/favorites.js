// Lista "Me gusta": canciones favoritas guardadas solo en este dispositivo.

const KEY = "pws.likes.v1";
const ID_RE = /^[a-z0-9-]{1,80}$/;
const listeners = new Set();

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((id) => typeof id === "string" && ID_RE.test(id)) : [];
  } catch {
    return [];
  }
}

let likes = read();

function write() {
  try { localStorage.setItem(KEY, JSON.stringify(likes)); } catch {}
  listeners.forEach((fn) => fn(likes));
}

export const favorites = {
  /** IDs en el orden en que se marcaron (el más reciente al final). */
  list: () => [...likes],
  has: (id) => likes.includes(id),
  count: () => likes.length,
  /** @returns {boolean} true si quedó marcada */
  toggle(id) {
    if (!ID_RE.test(id)) return false;
    likes = likes.includes(id) ? likes.filter((x) => x !== id) : [...likes, id];
    write();
    return likes.includes(id);
  },
  /** Quita IDs que ya no existen en el catálogo. */
  prune(validIds) {
    const valid = new Set(validIds);
    const next = likes.filter((id) => valid.has(id));
    if (next.length !== likes.length) { likes = next; write(); }
  },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

// Otras pestañas abiertas se mantienen sincronizadas.
addEventListener?.("storage", (e) => {
  if (e.key === KEY) { likes = read(); listeners.forEach((fn) => fn(likes)); }
});
