# Librerías incluidas

Se sirven desde el propio sitio (no desde CDNs) para que nadie externo pueda cambiar el código que corre en la página.
Se copiaron de los paquetes oficiales de npm con `npm pack`, que verifica la integridad (sha512) del registro.

| Librería | Versión | Archivos | Licencia |
| --- | --- | --- | --- |
| three.js | 0.160.0 | `build/three.module.min.js` (versión minificada del mismo paquete), `examples/jsm/postprocessing/*`, `examples/jsm/shaders/*`, `examples/jsm/utils/BufferGeometryUtils.js` | MIT (`three/LICENSE`) |
| GSAP | 3.13.0 | `dist/gsap.min.js`, `dist/ScrollTrigger.min.js` | GreenSock Standard License (uso gratuito, ver `gsap/LICENSE.txt` y https://gsap.com/standard-license); no la cubre la licencia MIT del proyecto |
| posthog-js | 1.447.3 | `dist/module.slim.no-external.js` → `posthog/posthog.slim.no-external.js` (sin la línea `sourceMappingURL`). Versión «slim» que nunca descarga scripts externos: sin grabación de sesiones, encuestas ni autocaptura | Apache-2.0 y MIT (`posthog/LICENSE`) |

Para actualizar: `npm pack three@<versión> gsap@<versión> posthog-js@<versión>`, extrae los mismos archivos y reemplázalos aquí
(PostHog: actualiza también la versión de esta tabla y la de `CACHE` en `sw.js`).
