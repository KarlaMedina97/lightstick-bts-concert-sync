// Utilidades para enlaces de YouTube.

/** Extrae el ID de 11 caracteres de cualquier enlace de YouTube, o null. */
export function parseYouTubeId(input) {
  const s = String(input ?? "").trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return valid(u.pathname.slice(1, 12));
    if (host === "youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
      if (u.searchParams.get("v")) return valid(u.searchParams.get("v"));
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
      if (m) return m[1];
    }
  } catch {}
  return null;
}
const valid = (id) => (/^[\w-]{11}$/.test(id) ? id : null);

/** Busca el título del video (oEmbed público de YouTube). */
export async function fetchTitle(id) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
    if (!res.ok) return null;
    const j = await res.json();
    return { title: j.title, channel: j.author_name };
  } catch {
    return null;
  }
}
