---
name: analizar-video
description: Analiza cuadro a cuadro el MV oficial de una o varias canciones del catálogo y genera sus colores e intensidades por sección (src/video-looks.js) para las luces del ARMY Bomb. Úsala al agregar una canción nueva, al cambiar el video de una canción, o cuando pidan analizar videos del catálogo ("analiza el video de…", "saca los colores del MV", "--missing").
---

# Analizar el MV de una canción

Genera el "look de video" de una canción: colores dominantes por sección y una curva de intensidad, sacados del
**reproductor oficial de YouTube** cuadro a cuadro. LumiParty los usa en `generatePattern` (patrones de luz).

## Reglas del proyecto (no negociables)

- **Nada de descargar videos** (yt-dlp u otros) ni guardar imágenes o audio: el script mira el reproductor
  insertado, igual que LumiParty, y solo guarda números (colores hex, curva 0–1, cortes por minuto).
- **Nada de letras**: no leas subtítulos, transcripciones ni audio para sacar palabras. Las únicas palabras que se
  usan son las del **título oficial** del catálogo (diccionario `TITLE_COLORS` del script), y solo cuando el video
  da poco color. Tampoco copies descripciones del video.
- Los resultados se revisan con los tests de seguridad (máx. 3 destellos/s) antes de publicar.

## Pasos

1. Verifica que la canción esté en `src/catalog.js` con su `yt` (si es nueva, primero `/agregar-cancion`).
2. Ejecuta el análisis (abre Edge sin ventana; tarda ≈ la mitad de lo que dura el video con `--rate 2`):

   ```bash
   npm run analyze:video -- <id> [<id>…] --rate 2 --fps 6
   ```

   - `--missing` analiza todas las que aún no tienen look (son ~250: déjalo corriendo en segundo plano).
   - `--fps` = capturas por segundo de video (1–8). `--rate` = velocidad de reproducción (1–2).
3. Revisa la línea `✓ <id>: … colores … curva …`:
   - **Colores**: deben parecerse a la estética del MV (vestuario, escenario, luces), no a tonos de piel.
     Si salen grises, muy pocos o raros (video oscuro o en blanco y negro), está bien que el patrón use la paleta
     curada de `SONG_LOOKS` o del álbum: no los inventes.
   - **Curva**: 9 valores (intro, verso, pre-coro, coro, verso 2, coro 2, puente, coro final, final). Los coros
     y el clímax deberían quedar altos. Se mezcla 50/50 con la curva de energía de la canción; una `curve` curada
     en `SONG_LOOKS` manda sobre la del video.
   - `✗ <id>: YouTube no deja reproducirlo aquí (error 101/150)`: el video bloquea inserciones; sácalo del catálogo
     o cambia el video (ver `npm run check:embeds`).
4. Si la canción tiene un concepto claro que el video no muestra (p. ej. FIRE en rojo), ajusta `SONG_LOOKS` a mano
   (`palette`, `lock`, `curve`): lo curado siempre manda.
5. `npm test` (incluye validación de `src/video-looks.js` y modo seguro con cada look) y luego `npm run check`.
6. Commit: `feat(luces): colores del MV de <título>` (sin trailers de coautor).

## Cómo funciona (para depurar)

- `scripts/video-lab.html` (local, no se publica) inserta el reproductor oficial con la API de YouTube.
- `scripts/analyze-video.mjs` lo abre en Edge sin ventana, toma los cuadros continuos del navegador (screencast,
  160×90) y por cada muestra calcula en la página: brillo, saturación, diferencia con el cuadro anterior
  (movimiento/cortes) y píxeles de 32×18 para los colores.
- Colores: cada captura elige sus colores vivos con `dominantColors` (`src/videopalette.js`) y cada sección se queda
  con los tonos más votados (`vote`). Intensidad: movimiento 50 %, brillo 25 %, color 15 %, cortes 10 %,
  normalizado dentro de la canción a 0,45–1.
- Limitaciones: no oye la música (YouTube no deja leer el audio del reproductor), así que la intensidad sigue a la
  imagen y a la energía/BPM del catálogo; las secciones son las fracciones fijas de `STRUCTURE` (`src/patterns.js`).
