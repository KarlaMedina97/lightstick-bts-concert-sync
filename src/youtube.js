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

/** Canales oficiales que conocemos (author_name de oEmbed). Si un video agregado no es de aquí, se avisa. */
export const OFFICIAL_CHANNELS = [
  "HYBE LABELS", "BANGTANTV", "BTS", "BTS JAPAN OFFICIAL", "1theK (원더케이)", "UNIVERSAL MUSIC JAPAN",
  "Mnet K-POP", "M2", "MBCkpop", "KBS Kpop", "SBSKPOP", "Big Hit Labels", "ibighit",
];
const norm = (s) => String(s ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
const OFFICIAL = new Set(OFFICIAL_CHANNELS.map(norm));
/** ¿El canal (author_name) está en la lista de oficiales? Sin distinguir mayúsculas ni espacios de más. */
export const isOfficialChannel = (name) => OFFICIAL.has(norm(name));

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
