# Cómo contribuir

1. Haz un fork y crea una rama: `git checkout -b mi-mejora`.
2. Ejecuta `npm run dev` y prueba tus cambios en Chrome o Edge.
3. Abre un Pull Request explicando qué cambia y cómo lo probaste.

## Reglas del proyecto

- **No subas audio, video, logos ni imágenes con derechos de autor.** Las canciones se enlazan a YouTube.
- **No copies código de apps o sitios de terceros.** Escribe tu propia implementación.
- **Accesibilidad primero:** todo control debe funcionar con teclado y tener nombre accesible; respeta el modo
  seguro (máx. 3 destellos por segundo).
- Sin dependencias ni paso de compilación, salvo que haya una buena razón.

## Añadir una canción

Edita `src/catalog.js` y agrega un objeto en el álbum correspondiente:

```js
{ id: "slug-unico", title: "Título", yt: "ID_DEL_VIDEO", bpm: 120, energy: "high" }
```

`energy` puede ser `high`, `mid` o `ballad`. Usa solo videos de canales oficiales.

## Añadir un estilo de luz

Agrega la entrada en `STYLES` y su caso en `styleColor()` dentro de `src/patterns.js`.
