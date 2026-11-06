# 💜 LumiParty

> **Lightstick BTS concert sync** · Página web no oficial para sincronizar tu lightstick (ARMY Bomb) con canciones de BTS en modo concierto.

App web progresiva (PWA), gratuita y de código abierto, para sincronizar tu lightstick con canciones,
**álbum por álbum**, desde el navegador. Sin instalar nada y sin cuentas.

> Proyecto de fans. **No oficial** y sin afiliación con HYBE, BIGHIT MUSIC ni BTS.
> Los videos se reproducen desde YouTube; este repositorio no contiene audio ni video.

## Qué hace

- **Conecta por Bluetooth** (Web Bluetooth) una o varias lightsticks compatibles (Ver. 3 / SE y Ver. 4).
- **Canciones agrupadas por álbum.** Al terminar una canción empieza la siguiente; al terminar el álbum puedes
  seguir con el siguiente, repetirlo o detener.
- **Patrones de luz inspirados en conciertos**, generados en tu navegador según el BPM, la energía de la canción y
  la paleta del álbum: océano morado, respiración, latido, ola de colores, arcoíris, destellos y despedida.
- **Olas entre varias lightsticks:** cada una lleva un pequeño desfase, como la ola en un estadio.
- **Sincronía precisa:** reloj interpolado del reproductor, envío del color más reciente (sin colas) y
  ajuste de latencia manual.
- **Reto de ritmo con rankings sin cuentas:** toca al compás, suma combos y compite solo con tu nickname de
  X, Instagram, TikTok, Weverse o YouTube. Ranking por canción y "puntos de fan" globales
  (local por defecto; global opcional con Supabase, ver [docs/ranking-global.md](docs/ranking-global.md)).
- **Reproductor de video a pantalla completa** con barra flotante, vista *Video* o *Luces*, y un fondo que
  brilla con el color actual y un océano de lightsticks que crece con la energía de la canción.
- **Conciertos:** los conciertos completos oficiales están en Prime Video, Disney+ o Weverse (con DRM, no se
  pueden incrustar). Ponlos en la TV y activa el **modo micrófono**: las luces siguen la música de la habitación.
  También puedes agregar presentaciones en vivo oficiales de YouTube en *Mis videos*.
- **Guía de conexión narrada**, como los anuncios antes de un concierto: pasos animados, subtítulos y voz.
- **Landing 3D** (three.js + GSAP): una lightstick gigante que cambia de color, reacciona al toque y gira al ritmo
  de la intro de la canción del grupo más escuchada del momento (configurable en `src/config.js`).
- **Multitud de fans** con lightsticks detrás del video, que se ilumina con el color y la energía de la canción.
- **Fanchant entre canciones:** como en los conciertos, aparecen los nombres de los integrantes (hangul y romanización)
  con ovación y destellos antes de la siguiente canción. Se puede saltar o desactivar.
- **Menú fijo y lista lateral** con miniaturas de las canciones por álbum, y sección **Opinar** (calificación,
  facilidad para conectar y comentario anónimo) para medir si la experiencia gusta.
- **Tu pantalla como lightstick** cuando no hay Bluetooth, con la pantalla siempre encendida (Wake Lock).
- **Accesible:** navegación con teclado, lector de pantalla, alto contraste y
  **modo seguro** (máx. 3 destellos/segundo, WCAG 2.3.1).
- **Funciona como app instalable** y abre sin conexión (los videos sí necesitan internet).

## Más funciones

- **131 canciones** de canales oficiales: grupo y solistas (RM, Jin, SUGA, j-hope, Jimin, V, Jung Kook), con filtros por integrante.
- **Me gusta:** arma tu lista con ♡ (se guarda en tu dispositivo).
- **Estoy en un concierto:** la cámara copia el color de un ARMY Bomb real cercano y el micrófono marca el ritmo.
- **Recorrido de bienvenida** con globos sobre los controles reales.
- Rutas: `/`, `/player/`, `/privacy/`.

## Seguridad y privacidad

- Sin cuentas ni servidor propio: los datos de cada persona quedan en su dispositivo y se pueden borrar desde Ajustes.
- Content-Security-Policy en cada página (`npm run csp`), librerías servidas desde `vendor/` (sin CDNs),
  YouTube en modo de privacidad mejorada y validación de todo lo que llega del almacenamiento o del servidor.
- Micrófono procesado solo en el dispositivo. Ver [privacidad.html](privacidad.html) y [SECURITY.md](SECURITY.md).

## Compatibilidad

| Plataforma | Videos y luces en pantalla | Lightstick por Bluetooth |
| --- | --- | --- |
| Android (Chrome, Edge) | ✅ | ✅ |
| Windows, macOS, ChromeOS, Linux (Chrome, Edge) | ✅ | ✅ |
| iPhone / iPad (Safari) | ✅ | ❌ (Apple no permite Bluetooth web) |
| iPhone / iPad ([Bluefy](https://apps.apple.com/app/id1492822055)) | ✅ | ✅ |

## Ejecutar en local

Necesitas [Node.js](https://nodejs.org) 22 o superior. No hay dependencias.

```bash
npm run dev
```

Abre http://localhost:5173. Web Bluetooth funciona en `localhost` y en `https://`.

## Publicar

El repositorio incluye un flujo de GitHub Actions que publica la app en **GitHub Pages** en cada push a `main`
(Settings → Pages → Source: *GitHub Actions*).

## Estructura

```
index.html            Landing 3D (three.js + GSAP)
app.html              Reproductor y panel principal
landing.css           Estilos de la landing
src/landing.js        Escena 3D de la lightstick
src/guide.js          Guía de conexión narrada
src/mic.js            Modo micrófono
src/youtube.js        Enlaces de YouTube
styles.css            Estilos del reproductor
src/app.js            Interfaz, cola de reproducción y bucle de sincronía
src/ble.js            Conexión Bluetooth y envío de colores
src/player.js         Reproductor de YouTube con reloj de alta precisión
src/patterns.js       Generador de patrones de luz
src/catalog.js        Álbumes y canciones
src/rhythm.js         Reto de ritmo (puntuación)
src/leaderboard.js    Rankings por nickname (local u online)
src/config.js         Enlaces, donación, canción destacada y ranking global
docs/protocolo-ble.md Notas del protocolo Bluetooth
```

## Contribuir

¡Toda ayuda es bienvenida! Lee [CONTRIBUTING.md](CONTRIBUTING.md). Ideas: más álbumes, nuevos estilos de luz,
traducciones, detección de BPM automática.

## Apoya el proyecto

Si te gusta, puedes apoyarlo desde el botón **Sponsor** del repositorio o los enlaces dentro de la app.

## Licencia

[MIT](LICENSE). Los nombres de artistas y álbumes se usan solo para identificar la música; pertenecen a sus dueños.
