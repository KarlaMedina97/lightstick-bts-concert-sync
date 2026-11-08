// Configuración del proyecto. Edita estos enlaces con los tuyos.
export const PROJECT = {
  name: "LumiParty",
  repo: "https://github.com/KarlaMedina97/lightstick-bts-concert-sync",
};

// Métricas de uso con PostHog (src/analytics.js), proyecto en la región de EE. UU. (us.i.posthog.com). La clave de proyecto es pública por diseño (solo
// sirve para ENVIAR eventos). Vacía = sin métricas.
export const ANALYTICS = { posthog: { key: "phc_BnzssvsNqGp8teidinuKgg8A9YvEgtfAf43gGg3hDdh6", host: "https://us.i.posthog.com" } };

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
  note: "La canción de BTS más escuchada de 2026 en Spotify (oct. 2026)",
};

// Ranking global (opcional). Sin estos datos, los rankings se guardan solo en el dispositivo.
// Ver docs/ranking-global.md para crear la tabla en Supabase (plan gratuito).
// Opiniones a un Formulario de Google (las respuestas quedan en una Hoja de cálculo del responsable).
// La app NO muestra el formulario de Google: manda lo que la persona respondió en el panel «Dar mi opinión».
// Para activarlo: en el formulario, ⋮ › «Obtener vínculo previamente completado», llenar cualquier valor en cada
// campo y copiar el vínculo; de ahí salen el id del formulario (después de /d/e/) y los entry.NNN de cada campo.
export const FEEDBACK_FORM = {
  id: "1FAIpQLSfdRCG9sQheyFW5uEmFPZ5vhmG3rYoLOdNl6zwfqtIpdnI1og", // «Opiniones LumiParty»; vacío = apagado. p. ej. "1FAIpQLSe…" (vacío: sin formulario; las opiniones abren GitHub como hasta ahora)
  fields: {
    rating: "entry.1269415260", // entry.NNN de «Calificación (1-5)»
    tags: "entry.717399740", // «Etiquetas»
    ease: "entry.1410107750", // «Facilidad para conectar (0-5)»
    would_use: "entry.123940479", // «¿La usaría?»
    comment: "entry.1113455152", // «Comentario»
    device: "entry.1819771066", // «Dispositivo»
    song_id: "entry.1625895833", // «Canción»
    app_version: "entry.1598577977", // «Versión de la app»
  },
};

export const LEADERBOARD = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  table: "scores",
  feedbackTable: "feedback",
};
