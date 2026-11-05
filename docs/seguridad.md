# Seguridad y fugas de información (revisión del 2026-11-05)

Alcance:

- código del sitio;
- historial completo de git (47 commits, todas las ramas);
- lo que se publica en la web;
- configuración del repositorio en GitHub;
- runner local.

## Resultado

| Revisión | Estado | Detalle |
| --- | --- | --- |
| Claves o tokens en archivos actuales | ✅ Ninguno | Búsqueda de patrones de AWS, Google, GitHub, OpenAI, Slack, JWT, `service_role` y claves privadas. |
| Claves o tokens en el historial de git | ✅ Ninguno | Revisado `git log -p --all`. Nunca se versionó un `.env`, `.pem` ni nada parecido. |
| Supabase | ✅ Apagado | `supabaseUrl` y `supabaseAnonKey` están vacíos en `src/config.js`. Si se activa, la clave *anon* es pública por diseño y la seguridad depende de las políticas RLS (`docs/ranking-global.md`). **Nunca** la clave `service_role`. |
| Correo en los commits | ✅ Privado | Todos usan `…@users.noreply.github.com`. |
| Alertas de GitHub | ✅ 0 | Escaneo de secretos (0), CodeQL (0 abiertas), Dependabot (0). Activos: escaneo de secretos, protección al hacer push y actualizaciones de Dependabot. |
| **Archivos publicados en la web** | ⚠️ → ✅ **Corregido** | Antes se publicaba **todo el repositorio** (`path: .`): documentación interna, auditorías, notas del runner de la PC, pruebas, scripts y `CLAUDE.md`. Ahora `scripts/build-site.mjs` arma `_site/` con una lista explícita (80 archivos) y CI despliega solo eso. El script bloquea `.md`, `.env`, `.git`, mapas, claves y pruebas, y verifica que exista todo lo que pide el service worker. |
| HTML insertado (XSS) | ✅ | Todos los `innerHTML` usan texto fijo del código (íconos SVG, escenas de la guía). Los datos de la persona o de un servidor entran con `textContent`; nickname, filas del ranking e ids de YouTube se validan (`normalizeHandle`, `sanitizeRow`, `parseYouTubeId`). |
| Terceros | ✅ | Solo YouTube (`youtube-nocookie.com`, `i.ytimg.com` para miniaturas y colores, oEmbed para títulos). Sin analítica, sin rastreadores, sin CDN. Supabase solo si se configura. |
| Datos en el dispositivo | ✅ | `localStorage`: ajustes, cola, historial, Me gusta, nickname, puntajes y colores de los videos. **No** se guardan la MAC ni la batería del ARMY Bomb, que solo se muestran en pantalla. |
| Consola | ✅ | Solo con `?debug` (rendimiento de la landing). |
| CSP | ✅ | En `<meta>`, sin scripts en línea salvo el importmap con hash. `object-src 'none'`, `base-uri 'self'`, `upgrade-insecure-requests`. |
| Runner local | ✅ / ⚠️ | Los PR siempre corren en runners de GitHub. El `GITHUB_TOKEN` es de solo lectura por defecto. **Pendiente (tu decisión):** ver abajo. |

## Pendiente: lo decides tú (configuración de GitHub)

1. **Aprobación de PR de forks:** hoy está en `first_time_contributors`. Con un runner en tu PC conviene `all_external_contributors`:
   `gh api -X PUT repos/KarlaMedina97/lightstick-bts-concert-sync/actions/permissions/fork-pr-contributor-approval -f approval_policy=all_external_contributors`
2. **Proteger `main`:** que no se pueda forzar push ni borrar la rama, y que CI pase antes de fusionar.
3. **Acciones permitidas:** hoy se permite cualquiera. Lo ideal es limitarlas a las de GitHub y a creadores verificados (Settings → Actions → General).

## Lista para el dominio pago

**Antes de apuntar el dominio**
- [ ] En el registrador: 2FA, bloqueo de transferencia y **privacidad WHOIS**, para que no se publiquen tu nombre, dirección, teléfono ni correo.
- [ ] Verificar el dominio en GitHub (Settings → Pages → *Verified domains*). Evita que otra cuenta lo tome si algún día quitas el CNAME.
- [ ] Registro **CAA** que solo permita la autoridad del certificado (Let's Encrypt en GitHub Pages; la de Cloudflare si se usa).
- [ ] DNSSEC si el registrador lo ofrece.

**Hosting: cabeceras de seguridad**
- GitHub Pages **ignora `_headers`**. En el dominio no habría HSTS propio ni protección contra que otro sitio meta la página en un iframe (`frame-ancestors` no funciona en `<meta>`).
- Opciones:
  - **Cloudflare Pages** o **Netlify**: leen `_headers` tal cual, con `X-Frame-Options`, `Permissions-Policy`, HSTS y `frame-ancestors`.
  - Cloudflare delante de GitHub Pages, con reglas de cabeceras.
- [ ] Probar en https://securityheaders.com y https://observatory.mozilla.org después del cambio.
- [ ] HSTS ya está en `_headers` con `includeSubDomains`: activarlo solo si **todos** los subdominios tienen HTTPS. El `preload` va al final, cuando todo esté estable.

**En el código**
- [ ] Dominio nuevo: no hay rutas absolutas al dominio viejo (todo es relativo). Revisar `og:url` y enlaces en `README.md` y `privacy/`.
- [ ] Si se activa el ranking global: crear la tabla con RLS según `docs/ranking-global.md`, y poner la URL y la clave *anon* en `src/config.js` (nunca `service_role`).
- [ ] `npm run check` (pruebas + CSP + publicación) y `npm run check:embeds` antes de cada despliegue.
- [ ] Repetir la búsqueda de secretos: `git log -p --all | grep -E "AKIA|AIza|ghp_|github_pat_|sk-|eyJ|service_role|PRIVATE KEY"`.

**Privacidad**
- [ ] Actualizar `privacy/index.html` con lo que encontró la auditoría de promesas (`docs/auditoria-promesas.md`):
  - el modo concierto usa el micrófono;
  - el reproductor de YouTube se conecta al abrir la página, no solo al reproducir;
  - se leen la batería y los datos del ARMY Bomb, que no se envían a ningún lado;
  - los colores se calculan a partir de las miniaturas, dentro del dispositivo.
