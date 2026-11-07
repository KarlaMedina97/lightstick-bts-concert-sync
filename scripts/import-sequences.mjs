// Importa secuencias de luces por marcas de tiempo (de Gemini, formato docs/secuencias/) a src/sequences.js, que la
// app usa en vez del patrón automático para esa canción.
//
//   npm run import:sequences -- <archivo.json | respuesta.txt | carpeta | lote.zip> [más…]
//   npm run import:sequences -- --quitar dynamite
//
// Solo entra lo que pasa check:sequence sin errores. Se guarda lo que usa la app (tiempos, colores, brillos, efectos,
// acentos) y la verificación; las notas y la «evidencia» quedan en el archivo original.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkAll, loadMeasuredDurations, loadSequences } from "./check-sequence.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUT = join(root, "src", "sequences.js");
let all = {};
try { all = JSON.parse(readFileSync(OUT, "utf8").match(/export const SEQUENCES = (\{[\s\S]*\});/)[1]); } catch {}

const args = process.argv.slice(2);
const qi = args.indexOf("--quitar");
if (qi >= 0) for (const id of args[qi + 1].split(",")) { delete all[id]; console.log(`− ${id}`); }

let ok = 0, bad = 0;
for (const path of args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--quitar")) {
  await loadMeasuredDurations();
  for (const { seq, file, errors } of checkAll(loadSequences(path))) {
    if (errors.length) { bad++; console.log(`✗ ${seq.song} (${file}): ${errors.length} error(es), no se importa. Revísalo con npm run check:sequence`); continue; }
    all[seq.song] = {
      yt: seq.yt, duracion: seq.duracion, bpm: seq.bpm, primerTiempo: seq.primerTiempo,
      confianza: seq.verificacion?.confianza ?? "baja", importado: new Date().toISOString().slice(0, 10),
      paleta: (seq.paleta ?? []).map((p) => ({ hex: p.hex.toLowerCase() })),
      tramos: seq.tramos.map((t) => ({
        inicio: t.inicio, fin: t.fin, seccion: t.seccion, color: t.color.toLowerCase(), color2: t.color2 ? t.color2.toLowerCase() : null,
        brillo: t.brillo, brilloFin: t.brilloFin, transicion: t.transicion, transicionSeg: t.transicionSeg, efecto: t.efecto,
        cadaTiempos: t.cadaTiempos, destellosPorSeg: t.destellosPorSeg, ...(t.acentos?.length ? { acentos: t.acentos } : {}),
      })),
    };
    ok++;
    console.log(`✓ ${seq.song}: ${seq.tramos.length} tramos (confianza ${seq.verificacion?.confianza ?? "?"})`);
  }
}
const sorted = Object.fromEntries(Object.keys(all).sort().map((k) => [k, all[k]]));
writeFileSync(OUT, `// GENERADO por scripts/import-sequences.mjs (npm run import:sequences). No editar a mano.
// Secuencias de luces por marcas de tiempo, validadas con check:sequence. Si una canción tiene secuencia (y es del
// mismo video), la app la usa en vez del patrón automático. Solo números y efectos: nada de letras.
export const SEQUENCES = ${JSON.stringify(sorted)};
`);
console.log(`${ok} importada(s), ${bad} con errores → src/sequences.js (${Object.keys(sorted).length} en total)`);
process.exit(bad && !ok ? 1 : 0);
