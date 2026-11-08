# CLAUDE.md

Guía para agentes de IA (Claude Code y otros) que trabajen en este repositorio.
Léela entera antes de cambiar algo. `AGENTS.md` apunta aquí.

## Qué es

**LumiParty** (`lightstick-bts-concert-sync`): PWA estática, no oficial y de código abierto, que sincroniza
el lightstick ARMY Bomb por **Web Bluetooth** con videos de YouTube de canciones y conciertos de BTS.
Se publica en GitHub Pages con dominio propio: https://lumiparty.com/ (DNS en Hostinger; antes https://karlamedina97.github.io/lightstick-bts-concert-sync/)

- Sin build, sin dependencias de npm, sin backend propio. JavaScript moderno con módulos ES nativos.
- Interfaz y textos en **español** (fuente), cortos y directos; opción de **inglés** con `src/i18n.js`.
- Node ≥ 22 solo para desarrollo (servidor local, pruebas, scripts).

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor local en http://localhost:5173 |
| `npm test` | Pruebas unitarias (`node --test`) |
| `npm run csp` | Regenera la Content-Security-Policy de `index.html` y `app.html` |
| `npm run check` | Pruebas + verifica que la CSP esté al día (lo mismo que corre CI) |
| `npm run check:commits` | Verifica mensajes de commit contra `origin/main` |
| `npm run build` | Arma `_site/` con solo lo que se publica (lista en `scripts/build-site.mjs`); CI despliega esa carpeta |
| `npm run check:ui` | Prueba en navegador real (inicio, reproductor, páginas): excepciones, desbordes, anatomía pegajosa, íconos |
| `npm run analyze:video -- <id>` | Analiza el MV oficial cuadro a cuadro (sin descargarlo) y guarda colores e intensidad por sección en `src/video-looks.js`; skill `analizar-video` |
| `npm run check:embeds` | Comprueba que cada video del catálogo se pueda ver dentro de la página (bloqueos por derechos, error 150) |

Antes de dar algo por terminado: `npm run check` y probar en el navegador (escritorio y 390×844).

**Validación antes de desplegar (obligatoria si el cambio puede romper la interfaz):** todo cambio en HTML, CSS,
`src/` o `sw.js` pasa `npm run check:ui` antes del push. Abre el inicio, el reproductor y las páginas de texto en un
navegador real sin ventana (390 y 1440 px) y falla si hay excepciones, scroll horizontal, la anatomía deja de ser
«pegajosa», un ícono no es SVG o hay caracteres sin fuente en iPhone/iPad (ᛒ, ⏻…). Deja capturas en `.ui-check/`:
míralas. El gancho `.githooks/pre-push` la corre solo (actívalo una vez con `git config core.hooksPath .githooks`).
Si agregas una sección o flujo importante, súmale su comprobación en `scripts/check-ui.mjs`.
- Nunca `overflow` en `html`: con `html` y `body` recortados, `body` pasa a ser el contenedor de scroll y lo `sticky` (anatomía, capítulos) deja de funcionar. En otros ancestros de algo `sticky`, usa `overflow-x: clip`, no `hidden`.

## Mapa del código

| Archivo | Responsabilidad |
| --- | --- |
| `index.html`, `landing.css`, `src/landing.js` | Landing 3D (three.js + GSAP/ScrollTrigger): lightstick que gira, se desarma con el scroll y océano de lightsticks |
| `player/index.html` (ruta `/player/`), `styles.css`, `tour.css`, `src/app.js` | Reproductor: cola por álbum, filtros por integrante, Me gusta, vistas Video/Luces, paneles, bucle de sincronía |
| `privacy/index.html` (ruta `/privacy/`) | Política de privacidad |
| `app.html`, `privacidad.html`, `src/redirect.js` | Redirecciones desde las direcciones antiguas |
| `src/favorites.js`, `src/tour.js`, `src/camera.js` | Lista Me gusta, recorrido de bienvenida, modo concierto con cámara |
| `src/ble.js` | Web Bluetooth: descubrimiento, familias V4/SE, paquetes de color, ritmo de escritura |
| `src/player.js` | Envoltura del reproductor de YouTube (reloj interpolado, subtítulos oficiales) |
| `src/patterns.js` | Generador de patrones de luz por secciones, looks por canción (`SONG_LOOKS`, ver `docs/patrones-luces.md`) y modo concierto |
| `src/catalog.js` | Álbumes (`artist`: BTS o integrante), canciones (`yt` oficial; `lyricVideo` se retiró con la función de letra), películas de concierto |
| `src/guide.js` | Guía de conexión integrada (4 pasos) |
| `src/fanchant.js`, `src/crowd.js`, `src/mic.js` | Fanchant entre canciones, multitud en canvas, modo micrófono |
| `src/rhythm.js`, `src/leaderboard.js`, `src/feedback.js` | Reto de ritmo, rankings por nickname, opiniones |
| `src/video-looks.js` | Generado por `scripts/analyze-video.mjs`: colores e intensidad del MV por sección (solo números) |
| `src/config.js` | Enlaces, donaciones, canción destacada, Supabase opcional |
| `src/i18n.js`, `src/i18n/en-*.js` | Idioma español/inglés: traduce textos y atributos accesibles con diccionarios (también los que el JS cambia después) |
| `sw.js` | Service worker (lista `SHELL`: añade ahí cada archivo nuevo y sube la versión de `CACHE`) |
| `vendor/` | three.js 0.160.0 y GSAP 3.13.0 copiados de npm (ver `vendor/README.md`) |
| `fonts/` | Unbounded y Plus Jakarta Sans (OFL) servidas localmente |
| `docs/protocolo-ble.md` | Notas del protocolo Bluetooth |
| `docs/ranking-global.md` | SQL de Supabase para ranking y opiniones |

## Rutas

URLs amigables en inglés y sin `.html`: `/` (landing), `/player/` (`?guide=1` abre la guía, `?song=<id>` abre una canción), `/privacy/`.
Las páginas dentro de carpetas usan rutas relativas con `../`. No uses `<base>` (rompe los íconos `<use href="#…">`).

## Reglas obligatorias

### Legal y contenido
- **No incluir letras de canciones**, pronunciaciones ni romanizaciones, audio, video ni imágenes con derechos de autor.
  La función de letra (subtítulos oficiales y pronunciación) se retiró el 2026-11-05: ver `docs/pronunciacion.md`.
- **No reproducir el logo de BTS** (dos paneles tipo "puertas") ni marcas de HYBE/BIGHIT. El lightstick 3D usa un
  emblema original en forma de ola. Mantener siempre el aviso "no oficial".
- **No copiar código** de apps o sitios de terceros. El protocolo BLE está documentado para interoperabilidad;
  la implementación es propia.
- Videos solo de canales oficiales (HYBE LABELS, BANGTANTV, 1theK, Coldplay, UNIVERSAL MUSIC JAPAN…). Verifica cada
  ID nuevo con oEmbed antes de añadirlo (ver `.claude/commands/agregar-cancion.md`).
- **Luces ricas en toda canción o video nuevo**: intensidad continua, combinaciones de colores y transiciones. CI lo
  exige con el control de calidad de `tests/looks.test.js` (cada canción ≥ 55, promedio ≥ 75). Si una canción nueva
  sale plana, dale un look en `SONG_LOOKS` (paleta de 2–3 tonos y plan por sección); ver `docs/patrones-luces.md`.

### Seguridad
- **Nada de CDNs ni scripts en línea.** Toda librería va en `vendor/` desde `npm pack`. Los únicos scripts en línea
  permitidos son el importmap y los datos estructurados JSON-LD de `index.html` (no se ejecutan); si los cambias,
  ejecuta `npm run csp`.
- Si añades un origen externo (fetch, iframe, imagen), actualízalo en `scripts/csp.mjs` y regenera.
- **Métricas de uso: PostHog (región EE. UU., us.i.posthog.com)** (decisión del proyecto, 2026-11-07; reemplazó a Google Analytics 4) con código
  propio en `src/analytics.js` (sin su librería ni CDN): eventos a la API de captura, **sin cookies** ni perfiles de
  persona (un número al azar en `sessionStorage`), solo si `ANALYTICS.posthog.key` tiene clave, y nunca con Do Not
  Track / Global Privacy Control, con las métricas apagadas en Ajustes, en localhost ni en la red local (ahí se
  muestra en la consola lo que se enviaría). Solo rutas sin parámetros y eventos con nombres fijos: nunca datos de la persona.
- Muestra datos del usuario o del servidor con `textContent`, nunca `innerHTML`. Valida con `sanitizeRow`
  (`src/leaderboard.js`) o equivalentes.
- Nunca pongas claves `service_role` ni secretos en el repo. La clave `anon` de Supabase es pública por diseño.
- Lo que se publica es solo la lista `PUBLIC` de `scripts/build-site.mjs`: un archivo nuevo del sitio va ahí (y en
  `sw.js`); documentación, pruebas y scripts nunca. Ver `docs/seguridad.md`.

### Idioma
- El HTML y el JS se escriben en español. **Todo texto visible nuevo** (o aria-label, title, data-tip, placeholder) necesita su
  entrada en `src/i18n/en-landing.js`, `en-player.js` o `en-app.js`; si lleva variables, un patrón `[/^…$/, "…$1"]`.
- No compares ni leas texto del DOM para decidir lógica (en inglés cambia): usa `data-*` o estado en JS.
- Para valores que el JS necesita ya traducidos (narración, `confirm()`), usa `t()` de `src/i18n.js`.

### Accesibilidad y UX
- Todo control con nombre accesible y usable con teclado; foco visible.
- **Modo seguro por defecto**: máximo 3 destellos por segundo (WCAG 2.3.1). Respeta `prefers-reduced-motion`.
- Responsivo desde 360 px; prueba 390×844 y escritorio. Áreas táctiles ≥ 44 px.
- Textos breves; sin pasos redundantes en guías.
- **Carga en red lenta**: `index.html` lleva en `<style id="critico">` una copia literal de las reglas de `landing.css`
  y `fonts/fonts.css` que pintan la portada, y `landing.css` se enlaza después de la portada; `player/index.html` pinta una
  pantalla de carga (`.boot`) que `styles.css` oculta, y estantes esqueleto que reemplaza el JS. Si cambias una regla
  copiada, actualiza la copia: lo exige `tests/critical-css.test.js`. Nada de contenido oculto hasta que corra el JS.

### Git
- **Conventional Commits** en todos los commits: `tipo(alcance): descripción` en español
  (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`). CI lo verifica.
- **No añadir trailers `Co-Authored-By`** de asistentes de IA.
- No reescribir el historial publicado sin pedirlo explícitamente.

### CI
- Un solo pipeline: `.github/workflows/ci.yml` (commits, pruebas, CSP y despliegue a Pages); CodeQL solo semanal y en PR.
- Los jobs corren donde diga la variable de repositorio `RUNNER` (`pws-local` = runner local en la PC). Los pull requests
  siempre usan runners de GitHub. Ver `docs/runner-local.md`.

## Protocolo Bluetooth (resumen)

- Filtros: `BTS LIGHTSTICK_SE`, `multiM`, `BTS LIGHTSTICK3`, `BTS_V4 LS`, prefijo `BBOMB-`.
- V4: paquete `[R, G, B, modo]` con respuesta; SE/V3: 11 bytes con suma de control, sin respuesta.
- Escribe solo el color más reciente, cada ≥ 20 ms (retroceso a 120 ms tras error).
- Detalles en `docs/protocolo-ble.md`.

## Limitaciones conocidas

- Safari en iOS no tiene Web Bluetooth: en iPhone se usa Bluefy; sin él, la pantalla funciona como lightstick.
- GitHub Pages no permite cabeceras HTTP propias: la CSP va en `<meta>`; `_headers` está listo para Netlify/Cloudflare.
- Sin pruebas automáticas con hardware real: valida con un ARMY Bomb antes de cambiar `src/ble.js`.
