---
description: Revisión completa antes de publicar (pruebas, CSP, commits y navegador)
---

1. `npm run check` (pruebas + CSP al día).
2. `npm run check:commits` (Conventional Commits, sin `Co-Authored-By`).
3. Si añadiste archivos, confirma que están en `SHELL` de `sw.js` y sube la versión de `CACHE`.
4. Abre `npm run dev` y revisa `index.html` y `app.html` a 1280×800 y 390×844: consola sin errores, sin
   violaciones de CSP, sin desbordes horizontales.
5. Resume qué se probó y qué no (por ejemplo, hardware Bluetooth real).
