// Verifica que los mensajes de commit sigan Conventional Commits (https://www.conventionalcommits.org/es/).
// Uso: node scripts/check-commits.mjs <rango-git>   p. ej. origin/main..HEAD
import { execFileSync } from "node:child_process";

const TYPES = ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"];
const RE = new RegExp(String.raw`^(${TYPES.join("|")})(\([a-z0-9-]+\))?!?: .{1,100}$`);

const range = process.argv[2] || "HEAD~1..HEAD";
const out = execFileSync("git", ["log", "--format=%H%x00%s", range], { encoding: "utf8" }).trim();
const bad = out ? out.split("\n").map((l) => l.split("\0")).filter(([, s]) => !RE.test(s) && !/^Merge /.test(s)) : [];
if (bad.length) {
  console.error("Estos commits no siguen Conventional Commits (tipo(alcance): descripción):");
  for (const [h, s] of bad) console.error(`  ${h.slice(0, 7)}  ${s}`);
  console.error(`Tipos válidos: ${TYPES.join(", ")}`);
  process.exit(1);
}
console.log(`OK: ${out ? out.split("\n").length : 0} commits revisados.`);
