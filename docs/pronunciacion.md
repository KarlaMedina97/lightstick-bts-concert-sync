# Letra y pronunciación: opciones evaluadas (2026-11-05)

Objetivo: ayudar a cantar con los videos mostrando la pronunciación (romanización) de las canciones en coreano.

## Resumen

| Opción | ¿Viable? | Por qué |
| --- | --- | --- |
| Guía fonética propia (escribir la romanización en el repo) | **No** | La romanización reproduce la letra completa, solo con otro alfabeto: sigue siendo copia de una obra protegida. Es una obra derivada que necesita licencia de las editoriales (HYBE/BIGHIT y coautores). También rompe la regla del proyecto: "no incluir letras". |
| Musixmatch API | No, por ahora | La letra completa y sincronizada requiere un plan comercial con licencia. En el plan gratuito solo se ve un fragmento. Además exige mostrar avisos de copyright y cargar su script o píxel de seguimiento, lo que choca con nuestra CSP (sin scripts de terceros) y con la privacidad. |
| Genius API | No para mostrar | La API oficial no devuelve letras. Extraerlas de la página web viola sus términos de servicio. Sí se puede **enlazar** a la página, que ya hacemos. |
| LRCLIB y otras bases abiertas | No | Las letras las suben usuarios y no tienen licencia de las editoriales. Mostrarlas en un sitio público es el mismo riesgo legal. |
| **Subtítulos oficiales del video de YouTube** | **Sí** | El reproductor de YouTube muestra las pistas que publica el canal. No copiamos nada y la atribución la da YouTube. Si el canal publica una pista romanizada, se elige con la API del reproductor (`setOption("captions", "track", …)`). |

## Qué hace la app

- La barra de letra tiene un selector **Letra | Pronunciación**.
- **Letra**: los subtítulos oficiales en el idioma elegido en Ajustes, o el video oficial con la letra en pantalla.
- **Pronunciación**: busca en el video una pista oficial romanizada. La detecta `isRomanTrack` en `src/player.js` por el código `*-Latn` o por nombres como "Romanized", "Romaji" o "Pronunciación".
  - Si existe, la muestra sobre el MV.
  - Si no existe, sigue la pista en coreano, avisa "Este video no trae pronunciación oficial" y ofrece el enlace "Ver pronunciación en Genius ↗". Ese enlace abre la búsqueda de Genius con "romanized"; las romanizaciones de Genius las publica su comunidad en Genius Romanizations.
- No se guarda ninguna letra ni pronunciación en el repositorio ni en el dispositivo.

## Requisitos si algún día se quiere letra integrada

- Contrato o plan comercial con un proveedor con licencia, como Musixmatch o LyricFind. Hay que cumplir sus reglas de atribución, caché y seguimiento.
- Revisar la CSP y la política de privacidad antes de cargar cualquier script del proveedor.
- Una romanización hecha por fans solo con permiso escrito del titular de los derechos.

Nota: los términos de los proveedores cambian; revísalos en sus sitios oficiales antes de cualquier integración.
