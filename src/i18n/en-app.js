// Inglés de los textos que genera src/app.js.
// Los patrones con datos (títulos de canciones o álbumes, nombres, búsquedas) usan funciones para que esos
// datos nunca pasen por el diccionario; los que llevan partes traducibles usan "$1" (se buscan en el diccionario).
const dict = {
  // Accesibilidad (docs/accesibilidad-visual.md)
  "Accesibilidad": "Accessibility",
  "Sonidos de la app": "App sounds",
  "Avisos cortos al conectar, desconectar y en el reto": "Short cues when connecting, disconnecting and in the challenge",
  "Describir las luces": "Describe the lights",
  "Dice el color y la parte al cambiar de sección": "Says the color and song part when the section changes",
  "Atajos de una tecla": "Single-key shortcuts",
  "Apágalos si usas lector de pantalla o control por voz": "Turn them off if you use a screen reader or voice control",
  "Interfaz tranquila": "Calm interface",
  "Menos brillo y movimiento en pantalla": "Less brightness and motion on screen",
  "Con lector de pantalla también puedes usar las teclas multimedia o los auriculares para pausar y cambiar de canción.": "With a screen reader you can also use your media keys or headphones to pause and change songs.",
  "Controles del reproductor": "Player controls",
  "Purple Wave Sync · Reproductor": "Purple Wave Sync · Player",
  "Reproductor de YouTube. Los controles de Purple Wave están después del video.": "YouTube player. Purple Wave controls come after the video.",
  "Se abre la lista de dispositivos del navegador: elige el que empieza con BTS LIGHTSTICK o BBOMB.": "The browser's device list opens: pick the one starting with BTS LIGHTSTICK or BBOMB.",
  "Se abrirá la lista de dispositivos del navegador: elige el que empieza con BTS LIGHTSTICK o BBOMB.": "The browser's device list will open: pick the one starting with BTS LIGHTSTICK or BBOMB.",
  "Lista cerrada sin elegir un dispositivo.": "List closed without choosing a device.",
  "¿Cómo están las luces?": "What are the lights doing?",
  "Lo dice en palabras · tecla L": "Says it in words · L key",
  "describir las luces ·": "describe the lights ·",
  "Cargando…": "Loading…",
  "Las luces siguen el micrófono": "Lights are following the microphone",
  "Las luces copian el color de la cámara": "Lights are copying the camera color",
  "estilo": "style",
  "Sin ARMY Bomb conectado": "No ARMY Bomb connected",
  "Fanchant: el público corea los nombres.": "Fanchant: the crowd chants the names.",
  "Fanchant entre canciones.": "Fanchant between songs.",
  "Video de YouTube": "YouTube video",
  "Video pequeño": "Small video",
  "Narración": "Narration",
  "Biblioteca compacta": "Compact library",
  // Bluetooth y ARMY Bomb
  "¿Borrar tus ajustes, nickname, puntajes, Me gusta, álbumes, historial y videos de este dispositivo? No se puede deshacer.": "Delete your settings, nickname, scores, likes, albums, history and videos from this device? This can't be undone.",
  "Desconectar": "Disconnect",
  "Conectar": "Connect",
  "Conectado": "Connected",
  "Conectando…": "Connecting…",
  "Conectar otro": "Connect another",
  "Conectar ARMY Bomb": "Connect ARMY Bomb",
  "Ese ARMY Bomb ya está conectado.": "That ARMY Bomb is already connected.",
  "No pudimos conectar. Revisa que parpadee y prueba otra vez.": "Couldn't connect. Make sure it's blinking and try again.",
  "En iPhone y iPad, Safari no permite conectar por Bluetooth. Abre esta página en": "On iPhone and iPad, Safari can't connect over Bluetooth. Open this page in",
  "(gratis) para conectar tu ARMY Bomb. Mientras, puedes ver los videos y usar tu pantalla como lightstick.": "(free) to connect your ARMY Bomb. Meanwhile, you can watch the videos and use your screen as a lightstick.",
  "Para usar Bluetooth, abre la app desde su dirección segura (empieza con https://).": "To use Bluetooth, open the app from its secure address (it starts with https://).",
  "Este navegador no puede conectar por Bluetooth. Abre la página en Chrome o Edge (Android, Windows, Mac o Chromebook).": "This browser can't connect over Bluetooth. Open the page in Chrome or Edge (Android, Windows, Mac or Chromebook).",
  "Este navegador no puede conectar por Bluetooth.": "This browser can't connect over Bluetooth.",
  "En iPhone, abre esta página en Bluefy para conectar.": "On iPhone, open this page in Bluefy to connect.",

  // Filtros, búsqueda y listas
  "Todo": "All",
  "♥ Me gusta": "♥ Liked",
  "Me gusta": "Liked",
  "Te gusta": "Liked",
  "Mis videos": "My videos",
  "Mi video": "My video",
  "Resultados": "Results",
  "Todos los álbumes": "All albums",
  "Todas las canciones": "All songs",
  "Canciones que me gustan": "Liked songs",
  "Sugerencias para ti": "Suggestions for you",
  "Aún no guardas canciones. Toca ♡ en una.": "No saved songs yet. Tap ♡ on one.",
  "Búscala en YouTube": "Search for it on YouTube",
  "Aún no agregas videos.": "No videos added yet.",
  "Abrir": "Open",
  "Ese enlace no parece de YouTube.": "That doesn't look like a YouTube link.",

  // Opiniones (mensajes de src/feedback.js que app.js muestra)
  "Elige una calificación o escribe un comentario.": "Pick a rating or write a comment.",
  "Gracias. Espera un minuto antes de enviar otra opinión.": "Thanks! Please wait a minute before sending more feedback.",
  "¡Gracias! Tu opinión llegó 💜": "Thank you! Your feedback arrived 💜",
  "Se abrió GitHub con tu opinión lista para publicar.": "GitHub opened with your feedback ready to post.",

  // Tipo de video y metadatos de fila
  "En vivo": "Live",
  "Coreografía": "Choreography",
  "Con letra": "Lyrics",

  // Letra y pronunciación
  "Pronunciación · subtítulos oficiales del video": "Pronunciation · official video subtitles",
  "Este video no trae pronunciación oficial": "This video has no official pronunciation",
  "Ver pronunciación en Genius ↗": "See pronunciation on Genius ↗",
  "Video oficial con la letra en pantalla": "Official video with on-screen lyrics",
  "Ver la letra en Genius ↗": "See lyrics on Genius ↗",
  "Letra oculta.": "Lyrics hidden.",
  "Pronunciación activada.": "Pronunciation on.",
  "Letra activada: cambiamos al video oficial con letra.": "Lyrics on: switched to the official lyric video.",
  "Este video no trae subtítulos oficiales.": "This video has no official subtitles.",
  "Coreano (hangul)": "Korean (hangul)",
  "Español": "Spanish",
  "Inglés": "English",
  "Japonés": "Japanese",
  "Portugués": "Portuguese",
  "coreano": "Korean",
  "español": "Spanish",
  "inglés": "English",
  "japonés": "Japanese",
  "portugués": "Portuguese",

  // Concierto: cámara y micrófono
  "En el estadio": "At the stadium",
  "Salir del modo concierto": "Exit concert mode",
  "Cámara apagada. Modo concierto en pausa.": "Camera off. Concert mode paused.",
  "Este navegador no permite usar la cámara.": "This browser can't use the camera.",
  "Apunta a un ARMY Bomb encendido y tu pantalla copiará su color.": "Point at a lit ARMY Bomb and your screen will copy its color.",
  "No pudimos usar la cámara. Revisa el permiso en tu navegador.": "Couldn't use the camera. Check the permission in your browser.",
  "Micrófono apagado.": "Mic off.",
  "🎙 Tus luces siguen la música que suena cerca. Nada se graba.": "🎙 Your lights follow the music playing nearby. Nothing is recorded.",
  "No pudimos usar el micrófono. Revisa el permiso en tu navegador.": "Couldn't use the mic. Check the permission in your browser.",
  "Apagar micrófono": "Turn off mic",
  "Activar micrófono": "Turn on mic",
  "En concierto": "At a concert",
  "Micrófono": "Mic",
  "Concierto": "Concert",

  // Estado de las luces
  "🎙 Luces siguiendo el micrófono": "🎙 Lights following the mic",
  "En pausa": "Paused",
  "Luces listas": "Lights ready",

  // Estilos de luz (src/patterns.js; también en el selector de Ajustes)
  "Océano morado": "Purple ocean",
  "Respiración": "Breathing",
  "Latido": "Heartbeat",
  "Ola de colores": "Color wave",
  "Arcoíris": "Rainbow",
  "Destellos": "Flashes",
  "Despedida": "Farewell",
  "Morado constante con una ola suave que recorre las lightsticks.": "Steady purple with a gentle wave rolling across the lightsticks.",
  "El color sube y baja lentamente, ideal para baladas.": "The color rises and falls slowly, perfect for ballads.",
  "Un pulso de brillo en cada tiempo de la canción.": "A pulse of brightness on every beat of the song.",
  "Los colores del álbum pasan de una lightstick a la siguiente.": "The album colors pass from one lightstick to the next.",
  "Recorre todos los colores, como en los cierres de concierto.": "Cycles through every color, like at the end of a concert.",
  "Alterna color y apagado al ritmo (limitado en modo seguro).": "Alternates color and off to the beat (limited in safe mode).",
  "Se desvanece lentamente hasta apagarse.": "Slowly fades out until it's off.",

  // Pantalla completa
  "Salir de pantalla completa": "Exit full screen",
  "Pantalla completa": "Full screen",
  "Salir": "Exit",
  "Pantalla": "Screen",

  // Estantes de inicio (SHELF_COPY)
  "Tu historial": "Your history",
  "Seguir escuchando": "Keep listening",
  "Tu lista": "Your list",
  "Tus Me gusta": "Your likes",
  "Clásicos": "Classics",
  "Para empezar": "Start here",
  "¿Primera vez? Empieza por un clásico.": "First time? Start with a classic.",
  "Letra": "Lyrics",
  "Con letra en pantalla": "On-screen lyrics",
  "Videos oficiales con la letra en el video.": "Official videos with the lyrics on screen.",
  "Integrantes": "Members",
  "Solistas": "Solo",
  "Lo más reciente de cada integrante.": "The latest from each member.",
  "Energía": "Energy",
  "Para que brille tu ARMY Bomb": "Make your ARMY Bomb shine",
  "Rápidas y con mucha energía.": "Fast and full of energy.",

  // A continuación
  "En tu cola": "In your queue",
  "Después": "Later",
  "Sigue": "Next",
  "Sugerida": "Suggested",

  // Biblioteca y Ahora suena
  "Expandir biblioteca": "Expand library",
  "Contraer biblioteca": "Collapse library",
  "Expandir": "Expand",
  "Contraer": "Collapse",
  "Álbum guardado": "Album saved",
  "Guardar álbum": "Save album",
  "Más de Mis videos": "More from My videos",
  "Ver en YouTube ↗": "Watch on YouTube ↗",
  "💜 Guardada en Me gusta": "💜 Saved to Liked",
  "Quitada de Me gusta": "Removed from Liked",
  "Cambiar a tema oscuro": "Switch to dark theme",
  "Cambiar a tema claro": "Switch to light theme",

  // Cola
  "Se reproducirá a continuación": "Playing next",
  "Deshacer": "Undo",
  "Agregada a la cola": "Added to queue",
  "Cola borrada": "Queue cleared",
  "Quitada de la cola": "Removed from queue",
  "Repetir: no": "Repeat: off",
  "Repetir: todo": "Repeat: all",
  "Repetir: una": "Repeat: one",
  "Aleatorio: sí": "Shuffle: on",
  "Aleatorio: no": "Shuffle: off",
  "Aleatorio activado": "Shuffle on",
  "Orden original": "Original order",
  "Tu cola sigue aquí. Dale play para seguir.": "Your queue is still here. Press play to continue.",
  "Nada sonando aún": "Nothing playing yet",
  "A continuación": "Up next",

  // Menú de canción
  "Quitar de Me gusta": "Remove from Liked",
  "Agregar a Me gusta": "Add to Liked",

  // Mini reproductor
  "Miniatura oculta, video en pausa": "Mini player hidden, video paused",
  "Mostrar": "Show",
  "Agrandar video": "Enlarge video",
  "Achicar video": "Shrink video",

  // Ajustes
  "Automático (según la canción)": "Automatic (based on the song)",
  "Cada parte usa un estilo distinto, como en un concierto.": "Each part uses a different style, like at a concert.",
  "Modo seguro desactivado.": "Safe mode off.",
  "Al terminar, sigue la siguiente.": "When it ends, the next one plays.",
  "Al terminar, se detiene.": "When it ends, playback stops.",
  "Apoya el desarrollo del proyecto.": "Support the project's development.",
  "Invítame un café.": "Buy me a coffee.",

  // Reto de ritmo y ranking
  "¡Toca al ritmo!": "Tap to the beat!",
  "Escribe tu nickname y activa el reto": "Enter your nickname and turn on the challenge",
  "¡Perfecto!": "Perfect!",
  "¡Genial!": "Great!",
  "Bien": "Good",
  "Fuera de ritmo": "Off beat",
  "Elige una canción para ver su ranking": "Pick a song to see its ranking",
  "Puntos de fan: tu mejor puntaje de cada canción, sumado": "Fan points: your best score on each song, added up",
  "Ranking global.": "Global ranking.",
  "Ranking de este dispositivo.": "Ranking on this device.",
  "Nadie ha jugado esta canción todavía. ¡Estrénala!": "Nobody has played this song yet. Be the first!",
  "Escribe tu nickname para jugar.": "Enter your nickname to play.",

  // Reproducción y varios
  "Pausar": "Pause",
  "Reproducir": "Play",
  "Listo, datos borrados. La página se recargará.": "Done, data cleared. The page will reload.",
  "YouTube no deja ver este video aquí. Pasamos al siguiente.": "YouTube won't play this video here. Skipping to the next one.",
};
export default dict;

// ---------- Patrones ----------
/** Sustituye $n por el grupo tal cual (datos: no se traducen). */
const keep = (tpl) => (...m) => tpl.replace(/\$(\d)/g, (_, n) => m[Number(n)] ?? "");

const LIGHTS = { suaves: "soft", medias: "medium", intensas: "intense" };
const TYPES = { "video musical": "music video", cover: "cover", "en vivo": "live", "coreografía": "choreography", performance: "performance", film: "film" };
const TAGS = { "En tu cola": "In your queue", "Después": "Later", "Sigue": "Next", "Te gusta": "Liked", "Sugerida": "Suggested" };
const SECTIONS = { intro: "intro", verso: "verse", "pre-coro": "pre-chorus", coro: "chorus", "verso 2": "verse 2", "coro 2": "chorus 2", puente: "bridge", "coro final": "final chorus", final: "outro" };
const SEC_RE = "(intro|verso 2|verso|pre-coro|coro final|coro 2|coro|puente|final)";
const songs = (n) => `${n} ${Number(n) === 1 ? "song" : "songs"}`;
const yourList = (w) => (w === "tu cola" ? "your queue" : "the list");
/** Etiqueta de contexto de la cola: búsqueda, nombre fijo del diccionario o dato (álbum). */
const ctxLabel = (s) => {
  const q = s.match(/^Búsqueda "(.*)"$/);
  return q ? `Search "${q[1]}"` : dict[s] ?? s;
};

const SECTION_EN = { intro: "intro", verso: "verse", "pre-coro": "pre-chorus", coro: "chorus", puente: "bridge", "coro final": "final chorus", final: "outro" };
export const patterns = [
  [/^(\d+:\d{2}(?::\d{2})?) de (\d+:\d{2}(?::\d{2})?)(?:, (.+))?$/, (m, a, b, sec) => `${a} of ${b}${sec ? `, ${SECTION_EN[sec] ?? sec}` : ""}`], // aria-valuetext de la línea de tiempo
  // Nombre accesible de cada canción (songLabel), con "Reproducir" y etiqueta opcionales.
  [
    /^(Reproducir (?:(En tu cola|Después|Sigue|Te gusta|Sugerida): )?)?(.+), (video musical|cover|en vivo|coreografía|performance|film)(, con letra)?, luces (suaves|medias|intensas)(, escuchada)?$/,
    (_, play, tag, rest, type, lyr, lights, heard) =>
      `${play ? "Play " : ""}${tag ? `${TAGS[tag]}: ` : ""}${rest}, ${TYPES[type]}${lyr ? ", with lyrics" : ""}, ${LIGHTS[lights]} lights${heard ? ", played" : ""}`,
  ],

  // ARMY Bomb conectados
  [/^(Ver\. 4|SE \/ Ver\. 3) · batería (\d+)%$/, "$1 · battery $2%"],
  [/^(\d+) conectados? 💜$/, "$1 connected 💜"],
  [/^(\d+) conectados?\. Administrar ARMY Bomb$/, "$1 connected. Manage ARMY Bomb"],
  [/^¡(.+) conectado! Borahae 💜$/, keep("$1 connected! Borahae 💜")],
  [/^(.+) se desconectó\.$/, keep("$1 disconnected.")],
  [/^💜 ¡(.+) listo! Ahora elige una canción\.$/, keep("💜 $1 is ready! Now pick a song.")],

  // Me gusta y álbumes guardados
  [/^Quitar álbum (.+)$/, keep("Remove album $1")],
  [/^Guardar álbum (.+)$/, keep("Save album $1")],
  [/^Quitar (.+) de Me gusta$/, keep("Remove $1 from Liked")],
  [/^Agregar (.+) a Me gusta$/, keep("Add $1 to Liked")],
  [/^💜 (.+) guardada en Me gusta$/, keep("💜 $1 saved to Liked")],
  [/^(.+) ya no está en Me gusta$/, keep("$1 removed from Liked")],
  [/^(.+) ya no está en Mis álbumes$/, keep("$1 removed from My albums")],
  [/^💜 (.+) guardado$/, keep("💜 $1 saved")],

  // Cola
  [/^Quitar (.+) de la cola$/, keep("Remove $1 from queue")],
  [/^Mover (.+)$/, keep("Move $1")],
  [/^A continuación de: (.+)$/, (_, l) => `Up next from: ${ctxLabel(l)}`],
  [/^y (\d+) más$/, "and $1 more"],
  [/^(.+) quitada de la cola$/, keep("$1 removed from queue")],
  [/^Movida a la posición (\d+) de (tu cola|la lista)$/, (_, n, w) => `Moved to position ${n} in ${yourList(w)}`],
  [/^(.+): posición (\d+) de (tu cola|la lista)$/, (_, t, n, w) => `${t}: position ${n} in ${yourList(w)}`],
  [/^Búsqueda "(.*)"$/, keep('Search "$1"')],

  // Álbumes, películas y conteos de canciones ("2020 · 7 canciones", "Instagram · 3 canciones")
  [/^Abrir (.+), (\d{4}), (\d+) canciones$/, (_, a, y, n) => `Open ${a}, ${y}, ${songs(n)}`],
  [/^Abrir (.+) en (Disney\+|Prime Video|Weverse)$/, keep("Open $1 on $2")],
  [/^(?:(.+) · )?(\d+) canci(?:ón|ones)$/, (_, p, n) => `${p ? `${p} · ` : ""}${songs(n)}`],

  // Búsqueda sin resultados (el texto buscado es dato)
  [/^No encontramos "(.*)"\.$/, keep('No results for "$1".')],

  // Letra
  [/^(Coreano \(hangul\)|Español|Inglés|Japonés|Portugués) · subtítulos oficiales del video$/, "$1 · official video subtitles"],
  [/^Letra en (coreano|español|inglés|japonés|portugués) activada\.$/, "Lyrics in $1 on."],
  [/^Sin letra en (coreano|español|inglés|japonés|portugués)\. Prueba otro idioma en Ajustes\.$/, "No $1 lyrics. Try another language in Settings."],

  // Luces
  [new RegExp(`^Luces: (.+?) · bloque (\\d+) · ${SEC_RE}$`), (_, s, n, sec) => `Lights: ${dict[s] ?? s} · block ${n} · ${SECTIONS[sec]}`],
  [new RegExp(`^Luces: (.+?) · ${SEC_RE}$`), (_, s, sec) => `Lights: ${dict[s] ?? s} · ${SECTIONS[sec]}`],
  [/^Intensidad de luces: (suaves|medias|intensas)$/, (_, l) => `Light intensity: ${LIGHTS[l]}`],
  [/^Luces (suaves|medias|intensas)$/, (_, l) => `${LIGHTS[l][0].toUpperCase()}${LIGHTS[l].slice(1)} lights`],

  // Ahora suena
  [/^Ahora suena: (.+)$/, keep("Now playing: $1")],
  [/^Más de (BTS|RM|Jin|SUGA|j-hope|Jimin|V|Jung Kook)$/, "More from $1"],
  [/^Canal: (.+) ·$/, keep("Channel: $1 ·")],
  [/^Más opciones: (.+)$/, keep("More options: $1")],
  [/^Video agregado: (.+)$/, keep("Video added: $1")],

  // Ajustes
  [/^Toca… (\d+)\/4$/, "Tap… $1/4"],

  // Reto de ritmo y ranking
  [/^(¡Perfecto!|¡Genial!|Bien) \+(\d+)(?: · combo (\d+))?$/, (_, l, p, c) => `${dict[l]} +${p}${c ? ` · combo ${c}` : ""}`],
  [/^Calibrando (\d+)\/(\d+)$/, "Calibrating $1/$2"],
  [/^Faltaron toques: con (\d+) entras al ranking\.$/, "Not enough taps: you need $1 to make the ranking."],
  [/^🏆 ([\d.]+) puntos · (\d+)% · combo (\d+)$/, "🏆 $1 points · $2% · combo $3"],
  [/^Lo mejor en (.+)$/, keep("Top scores for $1")],

  // Genéricos al final (menos específicos)
  [/^Desconectar (.+)$/, keep("Disconnect $1")],
  [/^Quitar (.+)$/, keep("Remove $1")],
  [/^Reproducir (.+)$/, keep("Play $1")],
  [/^Abrir (.+)$/, keep("Open $1")],
];
