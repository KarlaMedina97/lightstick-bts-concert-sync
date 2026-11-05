---
description: Añade una canción oficial al catálogo verificando su video de YouTube
argument-hint: "<título> [álbum]"
---

Añade la canción "$ARGUMENTS" a `src/catalog.js`.

1. Busca el MV oficial en YouTube (canales oficiales: HYBE LABELS, BANGTANTV, 1theK, sellos oficiales).
2. Verifica el ID con oEmbed: `curl -s "https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=<ID>"`.
   Descártalo si el `author_name` no es un canal oficial.
   oEmbed **no** detecta los bloqueos de inserción por derechos (p. ej. "LatinAutor - UMPG … bloqueado en este
   sitio"): prueba el video en el reproductor (`npm run dev`) antes de añadirlo.
3. Agrégala en su álbum (créalo si no existe, con `year` y una `palette` de 3 colores) con `id` en kebab-case único,
   `bpm` aproximado y `energy` (`high`, `mid` o `ballad`).
4. No copies letras ni descripciones del video.
5. Ejecuta `npm run check` y haz un commit `feat(catalogo): añadir <título>` sin trailers de coautor.
