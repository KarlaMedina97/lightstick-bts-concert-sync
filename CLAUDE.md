# CLAUDE.md

Guía para agentes de IA (Claude Code y otros) que trabajen en este repositorio.
Léela entera antes de cambiar algo. `AGENTS.md` apunta aquí.

## Qué es

**Purple Wave Sync** (`lightstick-bts-concert-sync`): PWA estática, no oficial y de código abierto, que sincroniza
el lightstick ARMY Bomb por **Web Bluetooth** con videos de YouTube de canciones y conciertos de BTS.
Se publica en GitHub Pages: https://karlamedina97.github.io/lightstick-bts-concert-sync/

- Sin build, sin dependencias de npm, sin backend propio. JavaScript moderno con módulos ES nativos.
- Interfaz y textos en **español**, cortos y directos.
- Node ≥ 22 solo para desarrollo (servidor local, pruebas, scripts).

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor local en http://localhost:5173 |
| `npm test` | Pruebas unitarias (`node --test`) |
| `npm run csp` | Regenera la Content-Security-Policy de `index.html` y `app.html` |
| `npm run check` | Pruebas + verifica que la CSP esté al día (lo mismo que corre CI) |
| `npm run check:commits` | Verifica mensajes de commit contra `origin/main` |

Antes de dar algo por terminado: `npm run check` y probar en el navegador (escritorio y 390×844).

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
| `src/patterns.js` | Generador de patrones de luz por secciones (y modo concierto) |
| `src/catalog.js` | Álbumes (`artist`: BTS o integrante), canciones (`yt` oficial, `lyricVideo` oficial con letra si existe), películas de concierto |
| `src/guide.js` | Guía de conexión integrada (4 pasos) |
| `src/fanchant.js`, `src/crowd.js`, `src/mic.js` | Fanchant entre canciones, multitud en canvas, modo micrófono |
| `src/rhythm.js`, `src/leaderboard.js`, `src/feedback.js` | Reto de ritmo, rankings por nickname, opiniones |
| `src/config.js` | Enlaces, donaciones, canción destacada, Supabase opcional |
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
- **No incluir letras de canciones**, audio, video ni imágenes con derechos de autor. La "letra" son los subtítulos
  oficiales del video de YouTube o un enlace externo (Genius).
- **No reproducir el logo de BTS** (dos paneles tipo "puertas") ni marcas de HYBE/BIGHIT. El lightstick 3D usa un
  emblema original en forma de ola. Mantener siempre el aviso "no oficial".
- **No copiar código** de apps o sitios de terceros. El protocolo BLE está documentado para interoperabilidad;
  la implementación es propia.
- Videos solo de canales oficiales (HYBE LABELS, BANGTANTV, 1theK, Coldplay, UNIVERSAL MUSIC JAPAN…). Verifica cada
  ID nuevo con oEmbed antes de añadirlo (ver `.claude/commands/agregar-cancion.md`).

### Seguridad
- **Nada de CDNs ni scripts en línea.** Toda librería va en `vendor/` desde `npm pack`. El único script en línea
  permitido es el importmap de `index.html`; si lo cambias, ejecuta `npm run csp`.
- Si añades un origen externo (fetch, iframe, imagen), actualízalo en `scripts/csp.mjs` y regenera.
- Muestra datos del usuario o del servidor con `textContent`, nunca `innerHTML`. Valida con `sanitizeRow`
  (`src/leaderboard.js`) o equivalentes.
- Nunca pongas claves `service_role` ni secretos en el repo. La clave `anon` de Supabase es pública por diseño.

### Accesibilidad y UX
- Todo control con nombre accesible y usable con teclado; foco visible.
- **Modo seguro por defecto**: máximo 3 destellos por segundo (WCAG 2.3.1). Respeta `prefers-reduced-motion`.
- Responsivo desde 360 px; prueba 390×844 y escritorio. Áreas táctiles ≥ 44 px.
- Textos breves; sin pasos redundantes en guías.

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
