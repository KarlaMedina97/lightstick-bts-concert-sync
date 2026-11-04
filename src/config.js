// Configuración del proyecto. Edita estos enlaces con los tuyos.
export const PROJECT = {
  name: "Purple Wave Sync",
  repo: "https://github.com/KarlaMedina97/lightstick-bts-concert-sync",
};

// Enlaces de donación. Deja vacío "url" para ocultar una opción.
export const DONATIONS = [
  { label: "GitHub Sponsors", url: "https://github.com/sponsors/KarlaMedina97", note: "Apoya el desarrollo del proyecto." },
  { label: "Ko-fi", url: "", note: "Invítame un café." },
];

// Canción destacada de la landing: la más escuchada del grupo en este momento.
// Actualízala cuando cambie (fuente: Spotify; "SWIM" superó los 1.000 M de streams en oct. 2026).
// bpm es aproximado: ajústalo si el giro no coincide con el ritmo.
export const FEATURED = {
  songId: "swim",
  title: "SWIM",
  yt: "b4iVv91Z6lY",
  bpm: 100,
  introStart: 0,
  introSeconds: 30,
  note: "La canción de BTS más escuchada de 2026 en Spotify",
};

// Ranking global (opcional). Sin estos datos, los rankings se guardan solo en el dispositivo.
// Ver docs/ranking-global.md para crear la tabla en Supabase (plan gratuito).
export const LEADERBOARD = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  table: "scores",
};
