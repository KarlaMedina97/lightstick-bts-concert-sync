# 💜 Purple Wave Sync

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
- **Accesible:** navegación con teclado, lector de pantalla, contraste alto, tema claro/oscuro y
  **modo seguro** (máx. 3 destellos/segundo, WCAG 2.3.1).
- **Funciona como app instalable** y abre sin conexión (los videos sí necesitan internet).

## Compatibilidad

| Plataforma | Navegador |
| --- | --- |
| Android, Windows, macOS, ChromeOS, Linux | Chrome, Edge, Opera |
| iPhone / iPad | Bluefy (Safari no soporta Web Bluetooth) |

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
index.html            Panel principal
styles.css            Estilos (claro/oscuro)
src/app.js            Interfaz, cola de reproducción y bucle de sincronía
src/ble.js            Conexión Bluetooth y envío de colores
src/player.js         Reproductor de YouTube con reloj de alta precisión
src/patterns.js       Generador de patrones de luz
src/catalog.js        Álbumes y canciones
src/config.js         Enlaces del proyecto y de donación
docs/protocolo-ble.md Notas del protocolo Bluetooth
```

## Contribuir

¡Toda ayuda es bienvenida! Lee [CONTRIBUTING.md](CONTRIBUTING.md). Ideas: más álbumes, nuevos estilos de luz,
traducciones, detección de BPM automática.

## Apoya el proyecto

Si te gusta, puedes apoyarlo desde el botón **Sponsor** del repositorio o los enlaces dentro de la app.

## Licencia

[MIT](LICENSE). Los nombres de artistas y álbumes se usan solo para identificar la música; pertenecen a sus dueños.
