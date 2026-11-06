# Librerías incluidas

Se sirven desde el propio sitio (no desde CDNs) para que nadie externo pueda cambiar el código que corre en la página.
Se copiaron de los paquetes oficiales de npm con `npm pack`, que verifica la integridad (sha512) del registro.

| Librería | Versión | Archivos | Licencia |
| --- | --- | --- | --- |
| three.js | 0.160.0 | `build/three.module.min.js` (versión minificada del mismo paquete), `examples/jsm/postprocessing/*`, `examples/jsm/shaders/*`, `examples/jsm/utils/BufferGeometryUtils.js` | MIT (`three/LICENSE`) |
| GSAP | 3.13.0 | `dist/gsap.min.js`, `dist/ScrollTrigger.min.js` | GreenSock Standard License (uso gratuito, ver `gsap/LICENSE.txt` y https://gsap.com/standard-license); no la cubre la licencia MIT del proyecto |

Para actualizar: `npm pack three@<versión> gsap@<versión>`, extrae los mismos archivos y reemplázalos aquí.
