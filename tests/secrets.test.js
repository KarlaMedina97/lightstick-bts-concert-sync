import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Regla del proyecto: ninguna clave, token ni contraseña en GitHub. Las que el sitio necesita (PostHog) las pone CI
// al publicar desde sus secretos (ver scripts/build-site.mjs). Esta prueba falla si alguna se cuela en el código.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SKIP = /(^|[\\/])(node_modules|\.git|_site|\.ui-check|vendor|tests|secuencias)([\\/]|$)/;
const TEXT = /\.(m?js|json|html|css|md|ya?ml|txt|webmanifest|svg|toml|env)$|(^|[\\/])(_headers|\.env[^\\/]*)$/i;
const PATTERNS = [
  ["PostHog", /\bph[cx]_[A-Za-z0-9]{20,}/],
  ["Google", /\bAIza[0-9A-Za-z_-]{35}/],
  ["GitHub", /\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/],
  ["OpenAI/Anthropic", /\bsk-(ant-)?[A-Za-z0-9_-]{20,}/],
  ["Stripe", /\b[sr]k_(live|test)_[A-Za-z0-9]{10,}/],
  ["AWS", /\bAKIA[0-9A-Z]{16}\b/],
  ["Slack", /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ["JWT (p. ej. service_role de Supabase)", /\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\./],
  ["clave privada", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["contraseña o secreto asignado", /\b(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["'][^"'\s]{12,}["']/i],
];

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  if (SKIP.test(p.slice(ROOT.length))) return [];
  return statSync(p).isDirectory() ? walk(p) : TEXT.test(p) ? [p] : [];
});

test("seguridad: ninguna clave ni secreto en los archivos del repo", () => {
  const found = [];
  for (const file of walk(ROOT)) {
    const src = readFileSync(file, "utf8");
    for (const [name, re] of PATTERNS) if (re.test(src)) found.push(`${file.slice(ROOT.length)} (${name})`);
  }
  assert.deepEqual(found, [], `Claves en el repo (van en los secretos de GitHub Actions, nunca en archivos): ${found.join(", ")}`);
});
