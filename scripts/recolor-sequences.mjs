// Recolorea las secuencias automáticas (docs/secuencias/auto/) con las líneas de tiempo de Gemini
// (docs/secuencias/gemini/), sin volver a escuchar: tiempos, efectos y acentos medidos se mantienen.
//   npm run recolor:sequences            todas las que tengan línea de tiempo de Gemini
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { lookFor } from "../src/patterns.js";
import { recolor } from "./auto-design.mjs";
import { checkAll, loadMeasuredDurations } from "./check-sequence.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const AUTO = join(root, "docs", "secuencias", "auto"), GEM = join(root, "docs", "secuencias", "gemini");
await loadMeasuredDurations();
let ok = 0;
for (const f of existsSync(GEM) ? readdirSync(GEM).filter((x) => x.endsWith(".json")) : []) {
  const file = join(AUTO, f);
  if (!existsSync(file)) continue;
  const seq = recolor(JSON.parse(readFileSync(file, "utf8")), JSON.parse(readFileSync(join(GEM, f), "utf8")), lookFor(f.replace(/\.json$/, "")));
  const [{ errors }] = checkAll([{ seq }]);
  if (errors.length) { console.log(`✗ ${seq.song}: ${errors[0]}`); continue; }
  writeFileSync(file, JSON.stringify(seq, null, 2));
  spawnSync(process.execPath, [join(root, "scripts", "import-sequences.mjs"), file], { stdio: "ignore" });
  ok++;
  console.log(`✓ ${seq.song}: recoloreada con Gemini`);
}
console.log(`${ok} recoloreada(s)`);
