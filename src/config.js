// Configuración del proyecto. Edita estos enlaces con los tuyos.
export const PROJECT = {
  name: "Purple Wave Sync",
  repo: "https://github.com/KarlaMedina97/purple-wave-sync",
};

// Enlaces de donación. Deja vacío "url" para ocultar una opción.
export const DONATIONS = [
  { label: "GitHub Sponsors", url: "https://github.com/sponsors/KarlaMedina97", note: "Apoya el desarrollo del proyecto." },
  { label: "Ko-fi", url: "", note: "Invítame un café." },
];

// Ranking global (opcional). Sin estos datos, los rankings se guardan solo en el dispositivo.
// Ver docs/ranking-global.md para crear la tabla en Supabase (plan gratuito).
export const LEADERBOARD = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  table: "scores",
};
