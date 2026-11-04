# Política de seguridad

## Cómo reportar una vulnerabilidad

**No abras un issue público.** Usa el reporte privado de GitHub:
pestaña **Security → Report a vulnerability** de este repositorio.

Incluye qué encontraste, cómo reproducirlo y qué impacto crees que tiene. Responderemos lo antes posible.

## Qué cubre

- El sitio web (`index.html`, `app.html`, `privacidad.html`) y el código en `src/`.
- La configuración opcional del ranking y las opiniones (Supabase), documentada en `docs/ranking-global.md`.

## Medidas actuales

- Sitio estático sin cuentas ni contraseñas; los datos de cada persona quedan en su dispositivo.
- Content-Security-Policy en cada página (`npm run csp` la regenera).
- three.js y GSAP servidos desde `vendor/`, copiados de paquetes npm con integridad verificada.
- Validación de todo lo que llega del almacenamiento local o del servidor antes de mostrarlo; se muestra como texto.
- YouTube en modo de privacidad mejorada (`youtube-nocookie.com`).
- Dependabot para las acciones de GitHub, análisis CodeQL y escaneo de secretos.
