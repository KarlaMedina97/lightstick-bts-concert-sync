// Genera los prompts para que Gemini arme las secuencias de luces por marcas de tiempo, en lotes de canciones, y
// los empaca en un zip: npm run prompts:sequences [-- --lote 10] [--out ruta.zip]
// Cada lote pide a Gemini un zip con un <id>.json por canción (formato de docs/secuencias/ejemplo-formato.json);
// esas respuestas se validan con npm run check:sequence -- <zip | carpeta | archivo>.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ALBUMS } from "../src/catalog.js";
import { VIDEO_LOOKS } from "../src/video-looks.js";
import { STRUCTURE, lookFor } from "../src/patterns.js";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SIZE = Number(opt("--lote", 10));
const OUT = resolve(opt("--out", "prompts-secuencias.zip"));
const FULL = args.includes("--completo"); // cada lote repite todas las reglas (para una sesión nueva de Gemini)
const SKIP = new Set((opt("--sin", "dynamite") || "").split(",").filter(Boolean)); // ya hechas

const songs = ALBUMS.flatMap((a) => a.songs.map((s) => ({ ...s, album: a }))).filter((s) => s.yt && s.kind !== "concert" && !SKIP.has(s.id));
const pct = ([, a, b]) => `${Math.round(a * 100)}–${Math.round(b * 100)} %`;

function songBlock(s, n) {
  const v = VIDEO_LOOKS[s.id], look = lookFor(s.id);
  const lines = [
    `### ${n}. \`${s.id}\` — ${s.title} (${s.album.title ?? s.album.name ?? ""}${s.album.year ? `, ${s.album.year}` : ""})`,
    `- Video oficial: https://www.youtube.com/watch?v=${s.yt}`,
    `- BPM aproximado del catálogo: ${s.bpm ?? "sin dato"} (verifícalo) · energía: ${s.energy ?? "sin dato"}${look?.rap ? " · **tiene partes de rap: deben subir fuerte**" : ""}`,
  ];
  if (v?.frames?.length === STRUCTURE.length) {
    lines.push("- Colores medidos en el video por tramos aproximados de la duración (pista visual; las secciones reales las decides tú):");
    STRUCTURE.forEach((sec, i) => lines.push(`  - ${pct(sec)}: ${v.frames[i].map((c) => `\`${c}\``).join(" ")}`));
  }
  if (look?.palette) lines.push(`- Concepto curado del proyecto: paleta ${look.palette.map((c) => `\`${c}\``).join(" ")}${look.lock ? " (**obligatoria**: no la cambies)" : ""}`);
  return lines.join("\n");
}

const BASE = (lote, total, list) => `# Secuencias de luces del ARMY Bomb — lote ${lote} de ${total}

Eres diseñador o diseñadora de iluminación de conciertos. Para **cada canción de la lista**, mira y escucha su video
musical oficial **completo** y diseña la secuencia de luz de **un lightstick** (ARMY Bomb Ver.4).

## Qué es el lightstick (límites reales)
- Un solo color RGB a la vez para todo el globo. Puede hacer fundidos propios (hasta ~12 s) y cortes secos.
- Lo ve una multitud: legible y agradable, nunca caótico.
- **Seguridad (obligatorio):** máximo 3 destellos por segundo en cualquier momento (mejor ≤ 2,5). Nada de destellos rápidos continuos; un rojo saturado en ráfagas cuenta doble.

## Cómo analizar cada video
1. Escucha el audio completo: tempo (BPM), segundo del primer tiempo fuerte, pulsos, **acentos** (golpes, remates, entradas), **pausas**, cambios de intensidad y secciones reales (intro, verso, pre-coro, coro, verso 2, coro 2, **puente**, coro final, final; las que existan).
2. Mira la imagen: vestuario, escenario y luces de cada parte, para colores que evoquen el ambiente y **evolucionen**.
3. **No transcribas ni cites la letra** ni los subtítulos. Trabaja con el sonido y la imagen.
4. **Comprueba cada marca de tiempo** en el video antes de escribirla. Si un cambio de sección no cae en un número redondo, no lo redondees. Si no lo pudiste comprobar, dilo en \`dudas\` y baja la confianza: es mejor «media» honesta que «alta» sin verificar.

## Cómo diseñar
- Pulsos sincronizados con el ritmo; **destellos rápidos solo en acentos importantes** (lístalos en \`acentos\`).
- La luz **crece gradualmente** con la tensión y llega al **máximo en los clímax**; partes suaves: brillo bajo, transiciones lentas o luz sostenida.
- **Rap:** los versos de rap suben fuerte (brillo ≥ 0,78), con golpes marcados.
- **Pausas:** atenuación breve o apagón corto (\`blackout\`), no destellos.
- Variaciones **reconocibles** entre secciones (el coro 2 no es igual al 1; el final cierra el arco). Ataque nítido y caída suave.
- Los coros brillan más que los versos.

## Formato de cada canción (\`<id>.json\`)
\`\`\`json
{
  "formato": 1, "song": "<id>", "yt": "<id de YouTube>", "duracion": 0, "bpm": 0, "primerTiempo": 0,
  "verificacion": { "audio": "cómo sacaste tempo, golpes y secciones", "imagen": "qué tomaste del video para los colores", "confianza": "alta | media | baja", "dudas": [] },
  "paleta": [{ "nombre": "", "hex": "#rrggbb", "de": "qué del video lo inspira" }],
  "tramos": [{
    "inicio": 0, "fin": 0, "seccion": "intro | verso | pre-coro | coro | verso 2 | coro 2 | puente | coro final | final | pausa | rap",
    "evidencia": "qué se oye y se ve justo en «inicio» (p. ej. «entra la batería; cambia a la escena del camión»), sin letra",
    "sigue": "qué pulso o acento sigue la luz", "color": "#rrggbb", "color2": "#rrggbb o null",
    "brillo": 0.0, "brilloFin": 0.0, "transicion": "corte | fundido | crescendo | decrescendo", "transicionSeg": 0,
    "efecto": "breathe | pulse | hit | rise | bloom | wave | duo | disco | aurora | sparkle | rainbow | ocean | flame | fadeout | blackout | hold",
    "cadaTiempos": 1, "destellosPorSeg": 0, "acentos": [], "nota": ""
  }]
}
\`\`\`
Reglas: tiempos en segundos con un decimal (0 = inicio del video); tramos en orden, **sin huecos ni superposiciones**, de 0 a \`duracion\`; brillos de 0 a 1; \`destellosPorSeg\` ≤ 3; acentos dentro de su tramo; colores hex vivos de 6 dígitos.

## Entrega
- **Un archivo zip** llamado \`secuencias-lote-${String(lote).padStart(2, "0")}.zip\` con **un archivo \`<id>.json\` por canción** (el id exacto de la lista), solo JSON válido en cada uno.
- Si no puedes crear archivos, escribe cada JSON en su propio bloque de código precedido por una línea \`### <id>.json\`, uno detrás de otro, sin texto entre medio.
- Al final, una tabla breve por canción: confianza y dudas.

## Canciones de este lote
${list}
`;

// Prompts CORTOS (por defecto): para seguir en la misma sesión de Gemini que ya hizo Dynamite y conoce las reglas.
function shortLine(s) {
  const v = VIDEO_LOOKS[s.id], look = lookFor(s.id);
  const cols = v?.overall?.length ? ` · colores medidos: ${v.overall.join(" ")}` : "";
  const curated = look?.palette ? ` · paleta curada${look.lock ? " obligatoria" : ""}: ${look.palette.join(" ")}` : "";
  return `- \`${s.id}\` · ${s.title} · https://youtu.be/${s.yt}${v?.dur ? ` · dura ${v.dur} s` : ""} · ~${s.bpm ?? "?"} BPM${look?.rap ? " · RAP (sube fuerte)" : ""}${cols}${curated}`;
}
const SHORT = (lote, total, part) => `Lote ${lote}/${total}. Mismo formato y reglas que Dynamite, para estas canciones:

${part.map(shortLine).join("\n")}

Comprueba cada marca contra el video (no redondees), agrega "evidencia" por tramo (qué se oye/ve, sin letra), marca puente y pausas si existen y pon en "dudas" lo no verificado. Entrega un zip \`secuencias-lote-${String(lote).padStart(2, "0")}.zip\` con un \`<id>.json\` por canción (si no puedes crear archivos: un bloque \`### <id>.json\` por canción).
`;

const tmp = mkdtempSync(join(tmpdir(), "pws-prompts-"));
const dir = join(tmp, "prompts-secuencias");
mkdirSync(join(dir, "lotes"), { recursive: true });
const total = Math.ceil(songs.length / SIZE);
for (let l = 0; l < total; l++) {
  const part = songs.slice(l * SIZE, (l + 1) * SIZE);
  writeFileSync(join(dir, "lotes", `lote-${String(l + 1).padStart(2, "0")}.md`), FULL ? BASE(l + 1, total, part.map((s, i) => songBlock(s, l * SIZE + i + 1)).join("\n\n")) : SHORT(l + 1, total, part));
}
cpSync(join("docs", "secuencias", "ejemplo-formato.json"), join(dir, "ejemplo-formato.json"));
writeFileSync(join(dir, "LEEME.md"), `# Prompts de secuencias de luces (LumiParty)

${songs.length} canciones en ${total} lotes de hasta ${SIZE}. Para cada lote:

${FULL ? "1. Abre Gemini (app o AI Studio, con un modelo que vea video de YouTube)." : "1. Sigue en la **misma sesión de Gemini** que hizo Dynamite (ya conoce el formato y las reglas)."}
2. Copia el contenido de \`lotes/lote-NN.md\` y envíalo, un lote a la vez.
3. Guarda lo que entregue: el zip \`secuencias-lote-NN.zip\` (o su respuesta completa en un .txt si escribió los JSON en bloques).
4. Pásaselo a Claude, o valídalo tú: \`npm run check:sequence -- secuencias-lote-NN.zip\`.

\`ejemplo-formato.json\` muestra el formato con tiempos ilustrativos (no son de ninguna canción real).
Ya hecha aparte: ${[...SKIP].join(", ") || "ninguna"}.
`);
if (existsSync(OUT)) rmSync(OUT);
const zip = process.platform === "win32"
  ? spawnSync("powershell", ["-NoProfile", "-Command", `Compress-Archive -Path '${dir.replace(/'/g, "''")}' -DestinationPath '${OUT.replace(/'/g, "''")}' -Force`])
  : spawnSync("zip", ["-qr", OUT, "prompts-secuencias"], { cwd: tmp });
rmSync(tmp, { recursive: true, force: true });
if (zip.status !== 0) { console.error("No se pudo crear el zip:", String(zip.stderr)); process.exit(1); }
console.log(`✓ ${songs.length} canciones en ${total} lotes → ${OUT}`);
