# Auditoría de promesas de la landing

Fecha: 2026-11-05. Alcance: `index.html`, `src/landing.js`, `src/i18n/en-landing.js` y `privacy/index.html`,
contrastados con el código del reproductor. Análisis estático más estas comprobaciones:

- `npm test`: **62/62 pruebas pasan**, y 66/66 al repetirlo después de que otra sesión añadiera `tests/looks.test.js`.
- `npm run check`: las pruebas pasan, pero `check:csp` falla en local solo porque `git diff` ve cambios sin commit
  de otra sesión. La CSP regenerada es idéntica a la actual.
- Conteo del catálogo con node: 71 álbumes, 259 entradas de canción y 3 `CONCERT_FILMS`.
- oEmbed de YouTube para los 266 IDs (`yt` + `lyricVideo`): 266/266 responden y todos vienen de canales oficiales.
- Medición del ritmo de destellos en modo seguro: un script recorre todos los estilos de 60 a 240 BPM.
- Enlaces probados con `curl`: GitHub, la política de seguridad, GitHub Pages (301 a HTTPS, con HSTS) y localhost:5173 responden 200.

Los números de línea corresponden a la copia del 2026-11-05. `src/app.js`, `src/ble.js`, `src/patterns.js` y
`src/catalog.js` tenían cambios sin commit en ese momento, así que las líneas pueden moverse.

Estados: **Cumple** · **Parcial** · **No cumple** · **No verificable sin hardware**.

## Tabla

| # | Promesa | Dónde | Estado | Evidencia | Arreglo sugerido |
|---|---|---|---|---|---|
| 1 | "Sin instalar · gratis · en tu navegador" | Portada (orb-micro) | Cumple | PWA estática sin build. El reproductor corre en el navegador (`player/index.html`, `src/app.js`) | — |
| 2 | "Sin descargas" | Portada (hero-facts) | Cumple | No hay instalador. Al abrir el reproductor, el service worker guarda unos 69 archivos en caché (`sw.js:4-73`, registro en `src/app.js:2739`) | Opcional: "Sin instalar nada" para no chocar con la caché offline |
| 3 | "Sin cuentas" / meta "sin cuentas" | Portada, `<meta description>` | Cumple | No hay inicio de sesión. El ranking remoto está apagado (`src/config.js:29-30` vacío; `src/leaderboard.js:75`) | — |
| 4 | "Gratis" | Portada, og:description | Cumple | Las donaciones son opcionales (`src/config.js:8-11`) | — |
| 5 | "Hecho por ARMY · no oficial", "sin afiliación con HYBE, BIGHIT MUSIC ni BTS" | Portada, pie | Cumple | `index.html:69,296`. El emblema es propio (`index.html:104`) | — |
| 6 | "Dale play a un video de BTS y tu ARMY Bomb cambia de color" | Portada (lead) | No verificable sin hardware | Bucle de color en `src/app.js:985-1007`, envío en `src/ble.js:224-258`. Los paquetes tienen pruebas (`tests/core.test.js:7-15`) | Probar con un ARMY Bomb real de cada familia |
| 7 | "En iPhone, con Bluefy" / "En iPhone o iPad, con la app Bluefy" | Portada, Cómo conectar | No verificable sin hardware | Detección de iOS en `src/ble.js:28-35`. Aviso y enlace en `src/app.js:290` y `src/guide.js:11` | Probar en Bluefy: `writeValueWithoutResponse` en SE/V3 |
| 8 | "los videos oficiales de BTS" | `<meta description>` | Cumple | oEmbed 266/266 OK: BANGTANTV 138, HYBE LABELS 85, 1theK 8, BTS JAPAN OFFICIAL 6, más canales de TV y de artistas colaboradores (Coldplay, Charlie Puth, FIFA, ONU…) | Opcional: "videos oficiales" (no todos son de canales de BTS) |
| 9 | "al ritmo de cada canción" / "canción por canción" | Título h1, meta, og:title | Parcial | Durante la auditoría otra sesión añadió `SONG_LOOKS`: paleta y plan por canción, heredados por las variantes (`src/patterns.js:29-75,126`). El propio código dice que casi todo es "PROPUESTA CREATIVA". El resto usa BPM aproximado, energía y paleta del álbum (`src/config.js:17`). No hay alineación al primer tiempo real y la rejilla se reinicia en cada sección (`src/patterns.js:149`) | Suavizar: "con luces para cada canción", o alinear la fase a un offset por canción |
| 10 | "Color en la intro, el coro y el puente." | Funciones, Videos + luces | Parcial | Las secciones siguen siendo fracciones fijas de la duración (intro 0-8 %, coro 30-43 %, puente 68-80 %) en `src/patterns.js:79-89`. Ninguna canción del catálogo trae marcas de sección reales | "Cambia de color a lo largo de la canción", o añadir marcas de sección reales por canción |
| 11 | "Sin conectar nada: mira cómo reaccionan el lightstick y el público." | Pruébalo aquí | Cumple | Demo en `src/landing.js:893-907`. Sin WebGL se borra el canvas y solo cambia el texto de estado (`src/landing.js:109-113`) | Opcional: mensaje de respaldo si no hay WebGL |
| 12 | "{color} en el {momento}: así brillarían tu lightstick y el estadio." | Pruébalo aquí (estado) | Parcial (texto) | `src/landing.js:905-907`: dice "en el intro" aunque el resto del sitio dice "la intro". Lee el texto del DOM para armar la frase, algo que `CLAUDE.md` prohíbe. "Aqua" falta en `DEMO_COLORS` (`src/i18n/en-landing.js`), aunque sale igual en inglés | Usar `data-*` en vez de `textContent` y escribir "en la intro" |
| 13 | "Emblema de luz: La luz principal: late con la música." | Anatomía | Parcial | Late con el BPM estimado, no con la música real (ver #9) | "late al ritmo" o "late con la canción" |
| 14 | "Anillo LED: Hace olas entre varios ARMY Bomb." | Anatomía | Cumple | El desfase por lightstick (`phase = i/n`) está en `src/patterns.js:83` y se envía un color por stick (`src/app.js:1007`). Requiere varios ARMY Bomb conectados al mismo equipo. El anillo no se controla por separado (`src/ble.js:153-159`) | Opcional: "…varios ARMY Bomb conectados a la vez" |
| 15 | "Dos botones: mantén ambos 2 s", "pilas AAA", gema roja | Anatomía, paso 3 | No verificable sin hardware | Son datos del dispositivo, no del código | Confirmar con el manual de cada versión |
| 16 | "Mango: Bluetooth directo desde el navegador." | Anatomía | Cumple | `navigator.bluetooth.requestDevice` en `src/ble.js:165-170` | — |
| 17 | "Chrome o Edge." | Cómo conectar | Cumple | Detección en `src/ble.js:28-35`. Chrome en iOS no tiene Web Bluetooth (lo cubre Bluefy) y en Linux puede requerir una flag | Opcional: "Chrome o Edge (computadora o Android)" |
| 18 | "Cuatro pasos…", "Toca Conectar en el reproductor." | Cómo conectar | Cumple | Botón "Conectar" en `player/index.html:97,318`. Guía de 4 pasos en `src/guide.js` | — |
| 19 | "Ver. 4 · Familia V4" | Versiones | No verificable sin hardware | Filtros `BTS_V4 LS` y `BBOMB-` en `src/ble.js:24-25,38`. Paquete `[R,G,B,modo]` con respuesta en `src/ble.js:154,241` | Probar con hardware |
| 20 | "Ver. 3 · Familia SE/V3" | Versiones | No verificable sin hardware | Filtro `BTS LIGHTSTICK3`/`multiM` en `src/ble.js:22-23,39`. Paquete de 11 bytes en `src/ble.js:155-157`. Etiqueta en `src/ble.js:121` | Probar con hardware |
| 21 | "Special Edition · Familia SE/V3" | Versiones | No verificable sin hardware | Filtro `BTS LIGHTSTICK_SE` en `src/ble.js:21,120` | Probar con hardware |
| 22 | "Funciona con tu versión" / "Color sincronizado por Bluetooth con estas versiones." | Versiones | Parcial | Afirma más de lo probado. El propio caption dice "Aún sin pruebas con cada hardware" (`index.html:257`) y `CLAUDE.md` reconoce que no hay pruebas con hardware real | "Pensado para tu versión" o "Compatible (en pruebas)" hasta validar cada modelo |
| 23 | "Concierto en la TV: Siguen la música; el audio no sale de tu equipo." | Funciones | Cumple | Solo usa `getUserMedia` y `AnalyserNode`, sin `MediaRecorder` ni `fetch` (`src/mic.js:17-35`). Se apaga al ocultar la página (`src/app.js:2698`) | — |
| 24 | "Escuchando: pon música cerca. El sonido no sale de tu dispositivo." | Funciones (demo micrófono) | Cumple | `src/landing.js:1093-1106` (se detiene en `pagehide` y al ocultar la página) | — |
| 25 | "Fanchant: Los nombres a tiempo, en hangul y romanizados." | Funciones | Cumple | `src/fanchant.js:5-15,84-85`. Cadencia fija de 720 ms entre canciones | — |
| 26 | "Con voz" | Funciones (demo fanchant) | Cumple | `speechSynthesis` con `ko-KR` en `src/fanchant.js:91-97`. Depende de que el sistema tenga voz coreana | — |
| 27 | "Reto de ritmo: Toca al compás y sube al ranking." | Funciones | Parcial | El reto existe (`src/rhythm.js`), pero el ranking es solo de este dispositivo: Supabase no está configurado (`src/config.js:29-30`) y la app lo dice así (`src/app.js:2466`, "Ranking de este dispositivo") | "…y compite en tu ranking" o activar el ranking global |
| 28 | "@tu_nick (Ejemplo) · @nick_ejemplo · @otro_nick" | Funciones (demo ranking) | Cumple | Está rotulado como ejemplo (`index.html:218`) | — |
| 29 | "Modo seguro · máx. 3 destellos/s", "Modo seguro activado", estadística "3 destellos por segundo, máximo" | Funciones | Parcial | Viene activado por defecto y se fuerza con `prefers-reduced-motion` (`src/app.js:43,45`). Límite en `src/patterns.js:131-132`; micrófono y cámara limitados a ≤3 cambios/s (`src/app.js:916,945`). Las pruebas (`tests/core.test.js:32`, `tests/looks.test.js:49`) miden 90 s de 9 looks y del estilo `flash`. Mi medición (todos los estilos, 60–240 BPM, ventana deslizante de 1 s, subida de luminancia ≥ 0,1), repetida con la versión nueva: estilo `pulse` a 164–176 BPM da **4 subidas en 1 s** (p. ej. t≈103,0–103,9 s a 176 BPM), porque la rejilla de tiempos se reinicia en cada cambio de sección (`src/patterns.js:149`). El catálogo llega a 176 BPM | Calcular los tiempos con el reloj global (`t`, no `t - sec.start`) o imponer un intervalo mínimo entre picos. Ampliar la prueba a `pulse` y a los cambios de sección con ventana deslizante |
| 30 | "Teclado y lector de pantalla." | Funciones | Cumple | Atajos de teclado (`src/app.js:515`), regiones `aria-live` y pruebas en `tests/a11y.test.js`. Revisión estática: no se probó con un lector de pantalla real | Probar con NVDA o VoiceOver |
| 31 | Estadística "Álbumes" (71) | Funciones (stats) | Cumple | Se calcula en vivo desde `src/catalog.js` (`src/landing.js:104-105`): 71 | — |
| 32 | Estadística "Canciones" (259) | Funciones (stats) | Parcial | Son 259 **videos**: 181 normales, 67 presentaciones en vivo (`kind: "concert"`) y 11 covers. Hay unos 152 títulos distintos (Butter ×12, Dynamite ×10, PTD ×8) | Rotular "Videos", o contar canciones únicas sin `kind` |
| 33 | Estadística "Conciertos" (3) | Funciones (stats) | No cumple | `CONCERT_FILMS` (`src/catalog.js:864-883`) son 3 enlaces externos de pago que no se ven en la app: Prime Video, Disney+ (enlace a la portada genérica) y "Conciertos y VODs en Weverse", que no es un concierto | Quitar la estadística o rotularla "Conciertos para ver con el modo micrófono". Arreglar la URL de Disney+ |
| 34 | `aria-label` "Abrir el modo micrófono / el fanchant / el reto de ritmo / los ajustes de accesibilidad en el reproductor" | Funciones (enlaces ↗) | No cumple | Los cuatro enlaces van a `player/` sin parámetro (`index.html:198,210,223,232`). La app solo entiende `?guide` y `?song` (`src/app.js:2706,2714`), así que abren el reproductor genérico | Añadir `?open=mic`, `?open=rhythm`, `?open=settings`, etc., o cambiar el label a "Abrir el reproductor" |
| 35 | "Abrir videos y luces en el reproductor" (`player/?song=swim`) | Funciones | Cumple | `swim` existe en el catálogo (yt `b4iVv91Z6lY`). El parámetro se procesa en `src/app.js:2714-2718` | — |
| 36 | Enlaces `player/`, `privacy/`, `player/?guide=1`, GitHub, política de seguridad | Nav, CTAs, pie | Cumple | Los archivos existen. `?guide=1` abre la guía (`src/app.js:2706`). GitHub y `/security/policy` responden HTTP 200 | — |
| 37 | "▶ Escuchar la intro" (canción destacada) | Portada, Océano, mini reproductor | Cumple | YouTube solo se carga al pulsar (`src/landing.js:918-955`) y con `youtube-nocookie.com` (`src/landing.js:948`) | — |
| 38 | "Nada en servidores propios… no hay cuentas, ni contraseñas, ni base de datos de usuarios." | Privacidad | Cumple | Sitio estático. Supabase apagado (`src/config.js:29-30`) | — |
| 39 | "En tu dispositivo… Puedes borrarlo todo en Ajustes → Borrar mis datos de este dispositivo" | Privacidad | Cumple | `clearAllLocalData` borra todas las claves `pws.*` (`src/leaderboard.js:66-70`) y todas las claves usan ese prefijo. El botón dice solo "Borrar mis datos" (`player/index.html:562`). `sessionStorage` `pws.nudge` y la caché del SW no se borran, pero no son datos personales | Igualar el nombre del botón con la política |
| 40 | "Sin cookies propias, sin analítica y sin publicidad propia." | Privacidad | Cumple | No hay `document.cookie`, `sendBeacon`, gtag ni ningún SDK de analítica en `src/`. `connect-src 'self'` en la landing (`index.html:5`) | — |
| 41 | "Bluetooth: solo se usa para enviar colores… No se lee ningún otro dispositivo." | Privacidad | Parcial | Además de enviar colores, lee del lightstick elegido la batería, el modelo, el firmware, el fabricante y, en V4, la MAC (`src/ble.js:129-150,188-190`). Solo se muestran en el dispositivo (`src/app.js:258-272`) y no se envían. Existe la opción "mostrar todos" (`acceptAllDevices`, `src/ble.js:167`) | "Se usa para enviar colores y leer la batería y el modelo del lightstick que eliges. Nada de eso sale de tu dispositivo." |
| 42 | "Micrófono… nunca se graba ni se envía. Se apaga al salir o al ocultar la página." | Privacidad | Cumple | `src/mic.js:17-35`. `pagehide` y `visibilitychange` en `src/app.js:2697-2698` | — |
| 43 | "Cámara… la imagen se reduce a 48×48… nunca se graba ni se envía. Se apaga al salir del modo concierto o de la página." | Privacidad | Parcial | Nada se graba ni se envía (`src/camera.js`). Pero captura a 640×480 y muestra la vista previa: los 48×48 son solo para el análisis (`src/camera.js:4,57-65`). **El modo concierto también enciende el micrófono automáticamente** (`src/app.js:925`) y la política no lo menciona. Al ocultar la pestaña no se apaga, solo con `pagehide` (`src/app.js:2697`) | Decir "También activa el micrófono" y "se analiza a 48×48". Apagar la cámara en `visibilitychange` |
| 44 | "Pantalla encendida: se pide solo mientras suena un video o el modo micrófono" | Privacidad | Parcial | También se pide en modo cámara (`src/app.js:924`) y no se libera al pausar: solo si se desactiva en Ajustes (`src/app.js:2354`) o cuando el navegador la suelta al ocultar la página | Liberar el bloqueo al pausar o detener, y mencionar el modo concierto |
| 45 | "YouTube reproduce los videos en su modo de privacidad mejorada (youtube-nocookie.com). Al reproducir, YouTube aplica…" | Privacidad | Parcial | El iframe usa `youtube-nocookie.com` (`src/player.js:45`). Pero el reproductor carga `https://www.youtube.com/iframe_api` al abrirse, antes de dar play (`src/player.js:15`; `player.init()` en `src/app.js:2734`). Las miniaturas vienen de `i.ytimg.com` y oEmbed de `youtube.com` al agregar videos (`src/youtube.js:24`) | Política: "Al abrir el reproductor se carga el reproductor de YouTube y sus miniaturas". O cargar la API solo en el primer play |
| 46 | "Ranking global y opiniones (solo si el proyecto los activa)" | Privacidad | Cumple | `remoteEnabled()` es falso con la config vacía (`src/leaderboard.js:75`; `src/feedback.js:48`) | — |
| 47 | "Las opiniones no se pueden leer desde la web." | Privacidad | No verificable sin hardware (sin backend) | Depende de las reglas RLS de Supabase (`docs/ranking-global.md`) y no hay backend activo | Revisar las RLS cuando se active |
| 48 | "Opiniones sin servidor: se abre GitHub con tu texto listo" | Privacidad | Cumple | `src/feedback.js:76` (`/issues/new` con el texto listo; se publica solo si la persona confirma) | — |
| 49 | "CSP que solo permite código del propio sitio y de YouTube." | Privacidad | Cumple | `script-src 'self'`, hash del importmap, `youtube.com` y `s.ytimg.com` (`index.html:5`, `player/index.html:5`, `privacy/index.html:5`). La regeneración produce la misma CSP. Matiz: `style-src 'unsafe-inline'` (estilos, no código) | — |
| 50 | "Las librerías (three.js y GSAP) se sirven desde el propio sitio, copiadas de paquetes verificados de npm." | Privacidad | Cumple | `vendor/gsap` (3.13.0, también ScrollTrigger) y `vendor/three` (r160). Ningún CDN en el HTML. Matiz: `vendor/README.md` no lista `ScrollTrigger.min.js` ni `RoomEnvironment.js`, y falta el archivo de licencia de GSAP en `vendor/gsap/` | Completar `vendor/README.md` y copiar la licencia de GSAP |
| 51 | "Todo lo que escriben las personas se valida y se muestra como texto" | Privacidad | Cumple | `sanitizeRow` (`tests/security.test.js`). Los `innerHTML` de `src/app.js` usan solo cadenas fijas (p. ej. `:290`, `:608`) | — |
| 52 | "Conexión cifrada (HTTPS) obligatoria." | Privacidad | Cumple | GitHub Pages responde 301 a HTTPS con `Strict-Transport-Security`, más `upgrade-insecure-requests` | — |
| 53 | PWA y offline (manifest, comentario de `sw.js`; no se promete en la landing) | Implícito | Cumple | Existen los 69 archivos de `SHELL`. Estrategia red primero con respaldo de caché (`sw.js:88-101`). Matiz: solo se registra desde el reproductor (`src/app.js:2739`); los videos requieren internet | — |
| 54 | Inglés frente a español | `src/i18n/en-landing.js` | Parcial (texto) | El inglés no promete más que el español. Única diferencia: "Not yet tested on **every** hardware version" suena a que algunos modelos sí se probaron, mientras "Aún sin pruebas con cada hardware" es más ambiguo. `tests/i18n.test.js` verifica que todo texto tenga traducción | Alinear ambos: "Aún no probado con hardware real" / "Not yet tested on real hardware" |

### Conteo

| Estado | Cantidad |
|---|---|
| Cumple | 32 |
| Parcial | 13 |
| No cumple | 2 |
| No verificable sin hardware | 7 (una de ellas, #47, depende del backend y no del hardware) |
| **Total** | **54** |

## Problemas principales, por riesgo

### Legal y privacidad

1. **El modo concierto activa el micrófono sin avisarlo en la política** (`src/app.js:925`). Además, la cámara
   captura a 640×480 con vista previa (los 48×48 son solo para el análisis) y no se apaga al ocultar la pestaña.
   Hay que actualizar `privacy/index.html` y apagar la cámara en `visibilitychange`.
2. **Modo seguro "máx. 3 destellos/s"**: es un riesgo de fotosensibilidad (WCAG 2.3.1). En el caso límite medido,
   el estilo `pulse` produce 4 picos en 1 s cerca de los cambios de sección a 164–176 BPM (176 BPM está en el catálogo).
   Las pruebas actuales solo miden una muestra de 9 looks. Conviene usar una rejilla de tiempos global y una prueba con ventana deslizante para todos los estilos.
3. **YouTube "al reproducir"**: el reproductor carga `www.youtube.com/iframe_api` y las miniaturas de `i.ytimg.com`
   al abrirse, antes de cualquier play. Hay que precisar la política o cargar la API en el primer play.
4. **Bluetooth "solo enviar colores"**: también se leen la batería, el modelo, el firmware, el fabricante y la MAC (V4).
   No se envían, pero la política debe decirlo.
5. **Pantalla encendida**: también se pide en modo cámara y no se libera al pausar.

### Funcionalidad engañosa

6. **"Conciertos: 3"**: son 3 enlaces externos de pago, no conciertos dentro de la app. Uno es Weverse en general y el de Disney+ va a la portada.
7. **"Canciones: 259"**: son videos. Incluyen 67 presentaciones en vivo y 11 covers (unos 152 títulos distintos).
8. **"Color en la intro, el coro y el puente" / "canción por canción"**: las secciones son porcentajes fijos de la
   duración, iguales para todas las canciones, y el BPM es aproximado y sin fase.
9. **Enlaces ↗ con `aria-label` específicos** (micrófono, fanchant, reto, ajustes de accesibilidad): todos abren el reproductor genérico.
10. **"Sube al ranking" / "Funciona con tu versión"**: el ranking es solo local y no hay pruebas con hardware real.

### Ajustes de texto

11. Inglés más suave que el español en el aviso de hardware. Alinearlos.
12. "en el intro" frente a "la intro". La demo lee `textContent` del DOM (`src/landing.js:905`), contra la regla de `CLAUDE.md`.
13. El botón "Borrar mis datos" no coincide con el nombre que da la política.
14. `vendor/README.md` está incompleto y falta la licencia de GSAP.
