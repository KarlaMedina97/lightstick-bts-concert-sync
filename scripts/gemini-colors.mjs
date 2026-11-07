// Pide a Gemini (API de Google AI Studio) la línea de tiempo de colores y ambiente de cada video oficial, la valida y
// la guarda en docs/secuencias/gemini/<id>.json. Gemini recibe el video de YouTube como video (imagen y sonido).
//
//   npm run gemini:colors -- dynamite butter     unas canciones
//   npm run gemini:colors -- --missing           las que aún no tienen línea de tiempo
//   opciones: --modelo <nombre>  (si no, elige el Flash más nuevo disponible), --max 20 (tope por corrida)
//
// La clave se lee de la variable de entorno GEMINI_API_KEY o del archivo %USERPROFILE%\.config\lumiparty\gemini.env
// (una línea GEMINI_API_KEY=...). Nunca se imprime ni se guarda en el proyecto.
// Solo se envían el enlace público del video y las instrucciones; se pide no citar letras.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ALBUMS } from "../src/catalog.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUTDIR = join(root, "docs", "secuencias", "gemini");
mkdirSync(OUTDIR, { recursive: true });
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const API = "https://generativelanguage.googleapis.com/v1beta";

function apiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  const f = join(homedir(), ".config", "lumiparty", "gemini.env");
  if (existsSync(f)) { const m = readFileSync(f, "utf8").match(/GEMINI_API_KEY\s*=\s*(\S+)/); if (m) return m[1].trim(); }
  return null;
}
const KEY = apiKey();
if (!KEY) { console.log(`Falta la clave: crea ${join(homedir(), ".config", "lumiparty", "gemini.env")} con una línea GEMINI_API_KEY=… (o la variable de entorno).`); process.exit(2); }
const headers = { "content-type": "application/json", "x-goog-api-key": KEY };

async function pickModel() {
  if (opt("--modelo")) return opt("--modelo");
  const r = await fetch(`${API}/models?pageSize=200`, { headers });
  if (!r.ok) throw new Error(`no pude listar modelos (${r.status})`);
  const list = (await r.json()).models.filter((m) => m.supportedGenerationMethods?.includes("generateContent") && /flash/i.test(m.name) && !/lite|image|tts|live|audio|exp/i.test(m.name));
  const ver = (n) => (n.match(/(\d+(?:\.\d+)?)/)?.[1] ?? "0") * 1;
  list.sort((a, b) => ver(b.name) - ver(a.name) || (/preview/.test(a.name) ? 1 : 0) - (/preview/.test(b.name) ? 1 : 0));
  if (!list.length) throw new Error("no encontré un modelo Flash disponible");
  return list[0].name.replace(/^models\//, "");
}

const SCHEMA = {
  type: "OBJECT",
  properties: {
    duracion: { type: "NUMBER" },
    aura: { type: "STRING" },
    tramos: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          inicio: { type: "NUMBER" }, fin: { type: "NUMBER" },
          escena: { type: "STRING" },
          ambiente: { type: "STRING", enum: ["fuerza", "fiesta", "alegria", "emocion", "melancolia", "drama", "calma", "tension", "climax"] },
          colores: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["inicio", "fin", "escena", "ambiente", "colores"],
      },
    },
  },
  required: ["duracion", "aura", "tramos"],
};
const prompt = (song, dur) => `Mira y escucha completo este video musical oficial de BTS («${song.title}»).
Necesito su línea de tiempo de AMBIENTE y COLORES para diseñar las luces de un lightstick en un concierto.
- Divide el video en tramos según cambian la escena, la iluminación o el ambiente de la música (normalmente entre 8 y 25 tramos, de al menos 4 s).
- Para cada tramo: inicio y fin en segundos (un decimal) medidos en este video; "escena" = qué se ve (lugar, vestuario, luces) en pocas palabras; "ambiente" = el clima que transmite la música y la imagen; "colores" = 1 a 3 colores hex (#rrggbb) dominantes y vivos de lo que se VE en ese tramo.
- "aura" = una frase con el aura general de la canción (p. ej. «fuerza y poder, rap con retumbones»).
- Los tramos van en orden, sin huecos, de 0 a la duración real del video${dur ? ` (dura ${dur} s)` : ""}.
- NO cites ni transcribas la letra ni los subtítulos. Si no puedes ver el video, devuelve tramos vacíos y escribe el motivo en "aura".`;

async function ask(model, song, dur) {
  const body = {
    contents: [{ role: "user", parts: [{ fileData: { fileUri: `https://www.youtube.com/watch?v=${song.yt}`, mimeType: "video/*" } }, { text: prompt(song, dur) }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.2 },
  };
  let r;
  // Servidores saturados (500/503): hasta 4 intentos, esperando 20, 40 y 80 s.
  for (let k = 0; k < 4; k++) {
    r = await fetch(`${API}/models/${model}:generateContent`, { method: "POST", headers, body: JSON.stringify(body) });
    if (![500, 502, 503, 504].includes(r.status)) break;
    await new Promise((res) => setTimeout(res, 20000 * 2 ** k));
  }
  if (r.status === 429) { const e = new Error("límite de consultas de Gemini alcanzado (429)"); e.stop = true; throw e; }
  if (!r.ok) throw new Error(`Gemini respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return JSON.parse(text);
}

/** Valida la línea de tiempo: duración real, orden, colores, sin letras. Devuelve la lista de problemas. */
export function checkTimeline(tl, dur) {
  const bad = [];
  const T = tl?.tramos ?? [];
  if (!T.length) bad.push(`sin tramos (${tl?.aura ?? "?"})`);
  const end = T.at(-1)?.fin ?? 0;
  if (dur && Math.abs(end - dur) > Math.max(5, dur * 0.04)) bad.push(`termina en ${end} s y el video dura ${dur} s`);
  T.forEach((t, i) => {
    if (i && Math.abs(t.inicio - T[i - 1].fin) > 1) bad.push(`hueco o superposición en ${t.inicio} s`);
    if (!(t.fin > t.inicio)) bad.push(`tramo ${i + 1} sin duración`);
    if (!t.colores?.length || t.colores.some((c) => !/^#[0-9a-fA-F]{6}$/.test(c))) bad.push(`colores inválidos en ${t.inicio} s`);
    if (/[가-힯぀-ヿ]|«[^»]{12,}»|"[^"]{20,}"/.test(t.escena)) bad.push(`posible letra citada en ${t.inicio} s`);
  });
  return bad;
}

const songs = ALBUMS.flatMap((a) => a.songs).filter((s) => s.yt && s.kind !== "concert");
const max = Number(opt("--max", 999));
const ids = (args.includes("--missing") ? songs.filter((s) => !existsSync(join(OUTDIR, `${s.id}.json`))).map((s) => s.id) : args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"))).slice(0, max);
if (!ids.length) { console.log("Uso: npm run gemini:colors -- <id> […] | --missing"); process.exit(1); }
const { VIDEO_LOOKS } = await import(new URL("../src/video-looks.js", import.meta.url).href + "?" + Date.now()).catch(() => ({ VIDEO_LOOKS: {} }));
const model = await pickModel();
console.log(`Modelo: ${model}`);
let ok = 0;
for (const id of ids) {
  const song = songs.find((s) => s.id === id);
  if (!song) { console.log(`✗ ${id}: no está en el catálogo`); continue; }
  const dur = VIDEO_LOOKS[id]?.dur ?? null;
  try {
    const tl = await ask(model, song, dur);
    const bad = checkTimeline(tl, dur);
    if (bad.length) { console.log(`✗ ${id}: ${bad.slice(0, 2).join("; ")}`); continue; }
    writeFileSync(join(OUTDIR, `${id}.json`), JSON.stringify({ song: id, yt: song.yt, modelo: model, fecha: new Date().toISOString().slice(0, 10), ...tl }, null, 2));
    ok++;
    console.log(`✓ ${id}: ${tl.tramos.length} tramos · ${tl.aura}`);
  } catch (e) {
    console.log(`✗ ${id}: ${e.message}`);
    if (e.stop) break;
  }
}
console.log(`${ok}/${ids.length} líneas de tiempo → docs/secuencias/gemini/`);
