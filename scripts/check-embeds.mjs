// Revisa que cada video del catálogo se pueda ver DENTRO de la página (inserción permitida).
// oEmbed no lo detecta: un video puede ser de un canal oficial y aun así tener la inserción bloqueada por derechos
// (YouTube da el error 150). Los bloqueos pueden depender de la región: el resultado vale para donde se ejecuta.
// Uso: npm run check:embeds
import { ALBUMS } from "../src/catalog.js";

const items = ALBUMS.flatMap((a) => a.songs.flatMap((s) => [
  { id: s.id, title: s.title, yt: s.yt },
  ...(s.lyricVideo ? [{ id: `${s.id} (video con letra)`, title: s.title, yt: s.lyricVideo }] : []),
]));
const bad = [];
async function check(it) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://www.youtube-nocookie.com/embed/${it.yt}`, { headers: { "User-Agent": "Mozilla/5.0" } });
      if ((await r.text()).includes("UNPLAYABLE")) bad.push(it);
      return;
    } catch { await new Promise((r) => setTimeout(r, 800)); }
  }
  bad.push({ ...it, note: "no se pudo comprobar" });
}
const queue = [...items];
await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await check(queue.shift()); }));
console.log(`Revisados: ${items.length}.`);
if (bad.length) {
  console.log("No se pueden ver dentro de la página:");
  for (const b of bad) console.log(`- ${b.id}: ${b.title} (${b.yt})${b.note ? ` · ${b.note}` : ""}`);
  process.exitCode = 1;
} else console.log("Todos se pueden insertar.");
