# Copy deck · Purple Wave Sync

Propuesta de textos para la landing, el reproductor, la privacidad, el README y los metadatos.
Es un documento de trabajo: nadie la aplica automáticamente. Cada fila dice **dónde** está el texto,
**qué dice hoy**, **qué proponemos** y, a veces, **una variante** para probar (A/B).

> Foto tomada el 2026-11-04, con `player/index.html` y `src/app.js` en pleno rediseño (dock nuevo, menús
> "Concierto" y "Más", inicio con estantes). Si un id cambió, búscalo por el texto "Actual".

---

## 1. Voz y tono

1. **De fan para fan.** Hablamos como alguien del fandom que te presta su app: de "tú", cálida, cómplice. Nunca como
   marca, sello ni "equipo oficial".
2. **Primero lo que vas a sentir, luego cómo se hace.** "Tu ARMY Bomb brilla con cada canción" antes que
   "sincronización por Web Bluetooth".
3. **Corto y con verbo.** Frases de una idea. Botones que empiezan con verbo ("Conectar", "Escuchar la intro").
4. **Honestidad como estilo.** Si algo depende del navegador, del dispositivo o de YouTube, lo decimos sin rodeos y sin
   letra chica. No prometemos lo que la app no hace (no se conecta a sistemas de concierto, no es oficial).
5. **Juguetona, no ruidosa.** Un guiño de fandom por pantalla basta. 💜 es el emoji de marca; como mucho uno por
   mensaje y nunca en errores.
6. **Inclusiva.** "Cada ARMY", "la primera persona", "quien esté cerca"; evitamos "todos los fans" y el masculino
   genérico cuando hay alternativa natural.
7. **Español latinoamericano neutro.** "Celular" y "computadora" (no "móvil", "ordenador" ni "computador"), "tú" (no
   "vos" ni "vosotros"), "agregar" (no "añadir"), "video" sin tilde.
8. **Cuidado con la seguridad.** Cuando hablamos de destellos, cámara o micrófono, el tono baja un punto: claro,
   tranquilo, sin chistes.

### Decisiones de consistencia (aplicar en todo el sitio)

| Tema | Decisión | Por qué |
| --- | --- | --- |
| Género de "lightstick" | **el** lightstick, **el** ARMY Bomb (hoy se mezclan "la lightstick", "lo" y "el") | El anglicismo suele ir en masculino en Latinoamérica y así concuerda con "ARMY Bomb". Ojo con las concordancias: "conectado", "conectados", "Libéralo". |
| Nombre del producto | "ARMY Bomb" cuando hablamos del lightstick oficial; "lightstick" cuando es genérico o incluye la pantalla | Es como lo dice el fandom. Es uso descriptivo, no un logo ni una afirmación de alianza. |
| La app | "Purple Wave Sync" en títulos; "la app" en el texto; "el reproductor" para `/player/` | "Experiencia" es vago y no dice qué abre. |
| Sincronizar | "seguir la canción", "brillar con la canción" en textos de marketing; "sincronizar" solo donde se espera el término técnico | Más claro y más emotivo. |
| Celular / computadora | "celular" y "computadora" | Neutro para LatAm. |
| Mayúsculas | Solo inicial de frase y nombres propios. "ARMY" y "BTS" sí, porque así se escriben. Nada de frases enteras en mayúsculas. | Legibilidad y lectores de pantalla. |

---

## 2. Glosario de fandom (usar con naturalidad, no en cada frase)

| Palabra | Cómo la usamos | Ejemplo |
| --- | --- | --- |
| **ARMY** | Nombre del fandom. Sirve en singular y plural, sin artículo de género: "cada ARMY", "ARMY de todo el mundo". | "Hecho por ARMY, para ARMY." |
| **ARMY Bomb** | El lightstick oficial. Siempre "tu ARMY Bomb". Explicarlo una vez en la landing ("el lightstick oficial de BTS") para quien llega de fuera. | "Conecta tu ARMY Bomb." |
| **Lightstick** | Genérico. Incluye la pantalla en modo Luces. | "Sin lightstick, tu pantalla brilla." |
| **Océano morado** | La imagen del estadio lleno de luces moradas. Es nuestro gran recurso emocional (y ya es un estilo de luces). | "Suma tu luz al océano morado." |
| **Borahae / 보라해** | Palabra de cariño del fandom ("te quiero en morado"). Para despedidas y momentos felices, nunca en errores ni avisos legales. Máximo una vez por pantalla. | Toast al conectar: "¡Conectado! Borahae 💜" |
| **Fanchant** | Lo que el público corea durante y entre canciones. Explicarlo la primera vez: "los nombres que corea el público". | "Fanchant entre canciones." |
| **Comeback, era** | Lanzamiento nuevo / etapa de un álbum. Úsalo en estantes y en el README, no en la landing (es jerga). | Estante: "Por era". |
| **Bias** | Integrante favorito. Útil en filtros por integrante. Explicar si se usa en un título. | "Filtra por tu bias." |
| **Integrantes** | Usamos sus nombres artísticos: RM, Jin, SUGA, j-hope, Jimin, V, Jung Kook. (El fanchant muestra sus nombres completos porque eso es lo que corea el público; ahí se queda así.) | — |

**No usar como si fueran nuestros:** títulos de giras o campañas oficiales como lemas ("Love Yourself",
"Speak Yourself", "Permission to Dance", "Yet to Come" fuera de su uso como título de canción), frases sacadas de
discursos o entrevistas, ni versos de canciones (tampoco "un poquito"). **Nada de juegos de palabras con títulos o
versos de canciones** (por ejemplo, frases de "Dynamite", "Butter" o "Mic Drop"): la línea con la letra es muy
fina. Los títulos de canciones solo aparecen como datos (en la lista o en el reproductor).

---

## 3. Ganchos para el hero (3–5 opciones)

El `h1` tiene dos partes: texto normal + `<span class="grad">` con degradado. Respetamos esa estructura.

| # | Hook (h1) | Lead (subtítulo) | Por qué funciona |
| --- | --- | --- | --- |
| **H1 ★ recomendado** | Tu ARMY Bomb, <span>al ritmo de cada canción</span> | Conéctalo por Bluetooth, dale play a un video oficial de BTS y míralo cambiar de color en el intro, el coro y el puente. Gratis, sin instalar nada. | Nombra el objeto que el fan ya tiene en la mano (reconocimiento inmediato), promete un beneficio concreto y comprobable, y cierra quitando fricción. |
| **H2 ★** | El océano morado <span>también se enciende en casa</span> | Tu ARMY Bomb (o tu pantalla) sigue cada canción y cada concierto que pongas. Hecho por ARMY, para ARMY. | Insider: la imagen favorita del fandom. Emoción de "extraño el concierto" sin prometer un concierto real. Ideal para A/B contra H1. |
| **H3 ★** | Dale play <span>y tu lightstick responde</span> | Videos oficiales de BTS, luces que siguen la canción y, si no tienes ARMY Bomb, tu pantalla brilla en su lugar. | Acción + recompensa inmediata. Incluye a quien no tiene lightstick (público más grande). |
| H4 | Saca tu ARMY Bomb <span>del cajón</span> | Entre giras también puede brillar: conéctalo y deja que siga tus canciones favoritas de BTS. | Toca un dolor real (el lightstick guardado entre conciertos). Muy compartible; algo menos claro para quien llega de fuera. |
| H5 | Tu concierto, <span>en tu sala</span> | Videos oficiales, luces que siguen la canción y fanchant entre temas. Desde el navegador, gratis. | Corto y memorable. Riesgo: "concierto" puede sonar a que transmitimos conciertos (no lo hacemos), por eso el lead aclara "videos oficiales". |

**Recomendación:** H1 como control (claridad para tráfico frío de buscadores y redes) y H2 como variante (más emoción
para tráfico que llega desde comunidades de ARMY).

---

## 4. Jerarquía de CTA

| Nivel | Texto | Destino | Dónde |
| --- | --- | --- | --- |
| **Primario** | **Abrir el reproductor** · A/B: **Sincronizar mi ARMY Bomb** | `player/` | Hero, cierre (océano), nav (opcional, como botón) |
| Secundario | ▶ Escuchar la intro → al sonar: 🔊 Sonando la intro | botón `.js-intro` | Hero, cierre |
| Terciario | Ver la guía de conexión | `player/?guide=1` | Sección "Cómo conectar", pie |
| En el reproductor | **Conectar ARMY Bomb** (primario) · **Ver canciones** (secundario) | panel BT / panel cola | Inicio del reproductor |

Reglas: un solo botón primario visible por pantalla; el primario siempre dice a dónde lleva; "Entrar a la
experiencia" se retira (4 palabras y no dice qué abre).

---

## 5. Reglas de microcopy

> **Dieta de contenido (reproductor):** intros de panel ≤ 1 línea corta o ninguna · descripciones de ajustes ≤ 60
> caracteres (el detalle va en tooltip o en la confirmación) · toasts ≤ 70 · guía y tour ≤ 90 · pantallas vacías =
> título + 1 línea + acción. Preferir íconos, chips y números a frases.

| Tipo | Límite | Notas |
| --- | --- | --- |
| Botones | **≤ 3 palabras** ("ARMY Bomb" cuenta como una) | Empieza con verbo. Que se entienda fuera de contexto (lector de pantalla en lista de enlaces). Si el visible es corto, el `aria-label` puede dar más contexto, pero debe **empezar** con el texto visible (WCAG 2.5.3). |
| Toasts | **≤ 90 caracteres** | Qué pasó + qué hacer (si hace falta). Éxito puede llevar 💜; errores, nunca emoji. |
| Coach (guía de conexión) y tour | **≤ 110 caracteres** por texto; título ≤ 4 palabras | Una acción por paso. |
| Tooltips / `title` | ≤ 60 caracteres | Nunca la única forma de saber qué hace un botón. |
| Errores | Sin culpa ("No pudimos…" en vez de "Hiciste mal…") y siempre con salida. | |
| Números | "2 s" en tarjetas; "2 segundos" en la guía narrada (se lee en voz alta). | |
| Emojis | 💜 en éxitos y despedidas; 🎙 🏆 permitidos como icono de estado. Nada de emojis en avisos de seguridad, privacidad ni errores. | |

---

## 6. Ideas de engagement (honestas y posibles con lo que ya existe)

Todo es **local** (almacenamiento del navegador), sin cuentas, sin notificaciones push y sin rastreo. Marcamos
lo que requiere código nuevo.

### Compartir (requiere código: Web Share API con copia al portapapeles como respaldo)
- **Compartir canción** (desde el reproductor; el enlace `?song=<id>` ya existe):
  - Botón: "Compartir"
  - Texto: "Estoy encendiendo mi ARMY Bomb con {canción} 💜 Pruébalo aquí:" + enlace
- **Compartir puntaje del reto**, junto al toast de resultado:
  - Botón: "Compartir puntaje"
  - Texto: "Hice {puntos} puntos al ritmo de {canción} en Purple Wave Sync. ¿Me superas? 💜" + enlace a `?song=<id>`
- **Compartir la app** (en Ajustes → Apoya el proyecto, y en la pantalla de "¡Conectado!"):
  - Botón: "Invitar a ARMY"
  - Texto: "Encontré una app de fans para que el ARMY Bomb siga las canciones de BTS. Gratis y sin cuentas:" + enlace
- Al compartir, mostrar "Enlace copiado 💜" si no hay Web Share.

### Pantallas vacías que invitan a actuar
- Inicio sin historial: estante "Para empezar" primero, con el texto "¿Primera vez? Empieza por un clásico."
- Me gusta vacío: "Aún no guardas canciones. Toca ♡ en tu favorita y aparece aquí."
- Mis videos vacío: "Pega el enlace de una presentación oficial de YouTube y tus luces la seguirán."
- Ranking vacío: "Nadie ha jugado esta canción todavía. ¡Estrénala!"

### Volver (requiere código, todo local)
- **Seguir donde lo dejaste:** si hay una última canción guardada, primer estante: "Seguir escuchando" con esa
  canción y la siguiente del álbum.
- **Racha suave y opcional:** contar días distintos con al menos una canción. Mostrar solo en positivo
  ("3 días seguidos brillando 💜") y nunca un mensaje de culpa al perderla. Se borra con "Borrar mis datos".
- **Fechas del fandom:** en los cumpleaños de los integrantes y en el aniversario de debut (13 de junio), un
  estante especial y un aviso en el inicio. Ejemplos:
  - "Hoy es el cumpleaños de Jimin 💜 Una lista con sus canciones para celebrarlo." (fechas: RM 12/9, Jin 4/12,
    SUGA 9/3, j-hope 18/2, Jimin 13/10, V 30/12, Jung Kook 1/9)
  - "13 de junio: aniversario de debut. ¿Encendemos el océano morado?"
  - No usar nombres de eventos oficiales como título nuestro.
- **Instalar la app** (PWA) después de la 2.ª sesión, no en la primera: "Agrega Purple Wave Sync a tu pantalla de
  inicio y ábrela como una app." Botón: "Agregar". Botón secundario: "Ahora no".
- **Pedir opinión en el momento justo:** tras terminar la 3.ª canción o un álbum, un toast: "¿Te gustó? Cuéntanos en
  10 segundos." Botón: "Opinar". Una sola vez por semana.

### Lo que NO hacemos
Notificaciones push, contadores falsos ("1.234 ARMY conectados ahora"), urgencia artificial, rachas que castigan,
ni pedir correo o redes para jugar.

---

## 7. Metadatos y manifest

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| M-01 | `index.html` `<title>` | Purple Wave Sync | Purple Wave Sync · Tu ARMY Bomb al ritmo de BTS | Purple Wave Sync · Lightstick sync para ARMY |
| M-02 | `index.html` `meta[name=description]` | Página web no oficial para sincronizar tu lightstick (ARMY Bomb) con videos de canciones y conciertos de BTS. Gratis y de código abierto. | Conecta tu ARMY Bomb por Bluetooth y haz que brille con los videos oficiales de BTS, canción por canción. Proyecto de fans no oficial, gratis y sin cuentas. | — |
| M-03 | `index.html` `og:title` | Purple Wave Sync · Lightstick BTS concert sync | Tu ARMY Bomb, al ritmo de cada canción · Purple Wave Sync | El océano morado también se enciende en casa |
| M-04 | `index.html` `og:description` | Sincroniza tu lightstick con canciones y conciertos de BTS desde el navegador. | Dale play a un video de BTS y tu lightstick cambia de color con la canción. Hecho por ARMY, no oficial, gratis. | — |
| M-05 | `index.html` (nuevo) | — | Agregar `og:type` = website, `og:url`, `og:image` (captura del lightstick 3D, sin logos oficiales), `og:locale` = es_419 y `twitter:card` = summary_large_image. Sin imagen, los enlaces compartidos se ven pobres. | — |
| M-06 | `player/index.html` `<title>` | Purple Wave Sync | Reproductor · Purple Wave Sync | — |
| M-07 | `player/index.html` `meta[name=description]` | Página web no oficial para sincronizar tu lightstick con videos de canciones y conciertos de BTS, álbum por álbum. | Elige una canción de BTS y tu ARMY Bomb (o tu pantalla) la sigue en colores, álbum por álbum. Proyecto de fans no oficial. | — |
| M-08 | `privacy/index.html` `<title>` | Privacidad · Purple Wave Sync | (se queda) | — |
| M-09 | `privacy/index.html` (nuevo) `meta[name=description]` | — | Qué guarda Purple Wave Sync (casi nada) y cómo usa Bluetooth, cámara y micrófono: todo se procesa en tu dispositivo. | — |
| M-10 | `manifest.webmanifest` `name` | Purple Wave Sync | (se queda) | — |
| M-11 | `manifest.webmanifest` `short_name` | PurpleWave | Purple Wave | — |
| M-12 | `manifest.webmanifest` `description` | Sincroniza tu lightstick con canciones, álbum por álbum. Proyecto de fans, abierto y no oficial. | Tu ARMY Bomb al ritmo de cada canción de BTS. Proyecto de fans, gratis, abierto y no oficial. | — |
| M-13 | `player/index.html` `apple-mobile-web-app-title` | PurpleWave | Purple Wave | — |

---

## 8. Landing (`index.html`, `src/landing.js`)

### 8.1 Navegación y accesos

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| L-01 | `.skip` | Saltar al contenido | (se queda) | — |
| L-02 | `.nav nav a[href="#anatomia"]` | Anatomía | El ARMY Bomb | Pieza por pieza |
| L-03 | `.nav a[href="#conectar"]` | Cómo conectar | (se queda) | — |
| L-04 | `.nav a[href="#demo"]` | Pruébalo | Pruébalo aquí | — |
| L-05 | `.nav a[href*="github"]` | GitHub | Código en GitHub | — |
| L-06 | `.nav` (nuevo, opcional) | — | Botón al final: "Abrir el reproductor" | — |

### 8.2 Hero (`#inicio`)

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| L-07 | `.hero .eyebrow` | Proyecto de fans · no oficial · gratis | Hecho por ARMY · no oficial · gratis | (se queda el actual) |
| L-08 | `#hero-title` | Tu lightstick, / al ritmo del concierto | Tu ARMY Bomb, / **al ritmo de cada canción** | El océano morado / **también se enciende en casa** |
| L-09 | `.hero .lead` | Conecta tu ARMY Bomb por Bluetooth y míralo brillar con los videos de BTS, canción por canción y álbum por álbum. En iPhone, Android o tu computador. | Conéctalo por Bluetooth, dale play a un video oficial de BTS y míralo cambiar de color en el intro, el coro y el puente. Funciona en Android, computadora y, con la app Bluefy, en iPhone. | Tu ARMY Bomb (o tu pantalla) sigue cada canción y cada concierto que pongas. Hecho por ARMY, para ARMY. |
| L-10 | `.hero .btn.primary` | Entrar a la experiencia | Abrir el reproductor | Sincronizar mi ARMY Bomb |
| L-11 | `.js-intro` (reposo) | ▶ Escuchar la intro | (se queda) | ▶ Oír la intro |
| L-12 | `src/landing.js` `setIntroButton(true)` | 🔊 Intro sonando | 🔊 Sonando la intro | — |
| L-13 | `.hero-facts` `aria-label` | En resumen | (se queda) | — |
| L-14 | `.hero-facts li` ×3 | **0** instalaciones · **0** cuentas · **100%** en tu navegador | **0** descargas · **0** cuentas · **100%** gratis | **0** apps que instalar · **0** cuentas · **1** toque para empezar |

Nota L-09: hoy dice "En iPhone, Android o tu computador" sin aclarar que en iPhone hace falta Bluefy. La propuesta
lo dice desde el principio (evita frustración y reseñas negativas).

### 8.3 Mini reproductor de la intro (`#mini`)

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| L-15 | `#mini` `aria-label` | Canción destacada | (se queda) | — |
| L-16 | `.mini-label` | Ahora girando con | Girando al ritmo de | Suena ahora |
| L-17 | `#mini-close` `aria-label` | Detener la intro | (se queda) | — |
| L-18 | `src/config.js` `FEATURED.note` | La canción de BTS más escuchada de 2026 en Spotify | Canción destacada del momento | La más escuchada de BTS en Spotify este año (solo si el dato está verificado y con fecha) |

Nota L-18: es una afirmación de dato. Si no se revisa cada vez que cambia, envejece mal. "Canción destacada del
momento" es siempre verdad.

### 8.4 Anatomía (`#anatomia`)

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| L-19 | `#anatomia .kicker` | 01 Anatomía | 01 Pieza por pieza | — |
| L-20 | `#anat-title` | Pieza por pieza, / qué hace cada una | Conoce tu ARMY Bomb / **por dentro** | Lo que ya tienes en la mano, / **pieza por pieza** |
| L-21 | `#anatomia .sub` | Pasa el cursor o el foco por una tarjeta para resaltar la pieza (y al revés). Ilustración inspirada: el emblema es una ola original, no el logo oficial. | Toca o pasa el cursor por una tarjeta y la pieza se ilumina. Es una ilustración propia: la ola del centro es nuestra, no el logo oficial. | — |
| L-22 | `.part-card[data-part=gem]` | **Remate y gema** · El detalle rojo de arriba: decora y la hace reconocible. | **Remate y gema** · El detalle rojo de arriba. Lo reconoces desde la última fila. | — |
| L-23 | `[data-part=shell]` | **Globo** · La app lo llena con el color de cada parte de la canción. | **Globo** · Aquí pasa la magia: se llena con el color de cada parte de la canción. | — |
| L-24 | `[data-part=emblem]` | **Emblema de luz** · La fuente de luz principal: sigue el patrón del tema. | **Emblema de luz** · La luz principal. Late, respira u ondea según la canción. | — |
| L-25 | `[data-part=base]` | **Anillo LED** · Con varias lightsticks, la app hace olas entre ellas. | **Anillo LED** · ¿Tienen varios ARMY Bomb? La app hace olas de luz entre ellos. | — |
| L-26 | `[data-part=collar]` | **Collar** · Une globo y mango, con un borde que atrapa la luz. | (se queda) | — |
| L-27 | `[data-part=buttons]` | **Dos botones** · Mantén ambos 2 s para entrar en modo Bluetooth. | **Dos botones** · Con el ARMY Bomb apagado, mantén ambos 2 s y entra en modo Bluetooth. | — |
| L-28 | `[data-part=handle]` | **Mango** · Su radio Bluetooth conecta con Web Bluetooth, sin instalar nada. | **Mango** · Guarda el Bluetooth: se conecta directo desde el navegador, sin instalar nada. | — |
| L-29 | `[data-part=bottom]` | **Tapa inferior** · Se desenrosca para cambiar las pilas (3 AAA). | **Tapa inferior** · Se desenrosca para cambiar las pilas (3 AAA). Pilas nuevas = colores más vivos. | — |

Nota L-27: la versión actual omite "apagado", y la guía sí lo pide. Mejor que coincidan.
Nota L-29: confirmar "3 AAA" para cada versión antes de publicar; si varía, dejar "Se desenrosca para cambiar las pilas".

### 8.5 Cómo conectar (`#conectar`)

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| L-30 | `#conectar .kicker` | 02 Cómo conectar | (se queda) | — |
| L-31 | `#t-conectar` | Cuatro pasos y / a brillar | Cuatro pasos / **y a brillar** | Menos de un minuto / **y a brillar** |
| L-32 | `#conectar .sub` | Funciona en Chrome o Edge (Android, Windows, macOS, ChromeOS). En iPhone, abre la página en Bluefy. | Funciona en Chrome o Edge en Android, Windows, Mac y Chromebook. En iPhone o iPad, ábrela en la app gratuita Bluefy. | — |
| L-33 | `.step` 1 | **Activa el Bluetooth** · En tu teléfono o computador. | **Activa el Bluetooth** · En tu celular o computadora. | — |
| L-34 | `.step` 2 | **Libérala** · Si está vinculada a otro teléfono o app, desconéctala: admite uno a la vez. | **Libéralo** · Si está conectado a otro celular o app, desconéctalo: solo acepta uno a la vez. | — |
| L-35 | `.step` 3 | **Modo Bluetooth** · Apagada, mantén los dos botones del mango 2 s hasta que parpadee. | **Modo Bluetooth** · Con el ARMY Bomb apagado, mantén los dos botones del mango 2 s, hasta que parpadee. | — |
| L-36 | `.step` 4 | **Conectar** · En la experiencia, toca Conectar y elige tu lightstick. | **Conectar** · En el reproductor, toca Conectar y elige tu ARMY Bomb en la lista. | — |
| L-37 | `a[href="player/?guide=1"]` (sección) | Abrir la guía paso a paso | Ver la guía de conexión | Guía paso a paso |

Nota L-31: "Menos de un minuto" solo si se mide con personas reales; si no, quedarse con "Cuatro pasos".

### 8.6 Demo (`#demo`)

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| L-38 | `#demo .kicker` | 03 Pruébalo aquí | (se queda) | — |
| L-39 | `#t-demo` | Elige un color y / el estadio responde | Elige un color / **y el estadio responde** | (se queda) |
| L-40 | `#demo .sub` | Una muestra de lo que hace la app con tu lightstick y con el público. | Una probadita sin conectar nada: así reaccionan tu lightstick y el público. | — |
| L-41 | `.chips legend` | Color | Elige un color | — |
| L-42 | `.chips.moods legend` | Momento de la canción | Elige un momento | — |
| L-43 | chips de momento | Intro tranquila · Verso · ¡Coro! | (se quedan) | — |
| L-44 | `#demo-status` inicial | Toca un color o un momento. | Toca un color o un momento y mira el estadio. | — |
| L-45 | `src/landing.js` `demoStatus` | `${color} en ${momento}: así se vería tu lightstick y el público.` | `${color} en el ${momento}: así brillarían tu lightstick y el estadio.` | — |

Nota L-45: `MOOD_NAMES` usa "intro tranquila / verso / coro". Para que lea bien con "en el", cambiar a
"intro tranquilo / verso / coro" o usar "durante ${momento}". Recomendado: `${color} durante ${momento}: …`.

### 8.7 Qué puedes hacer (`#funciones`)

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| L-46 | `#funciones .kicker` | 04 Qué puedes hacer | (se queda) | — |
| L-47 | `#t-funciones` | Todo el concierto, / desde el navegador | Todo lo que extrañas del concierto, / **desde el navegador** | Más que luces: / **un concierto para tu sala** |
| L-48 | `.feat` 1 h3 / p | **Videos + luces** · Los videos oficiales y tu lightstick cambiando de color con el intro, el coro y el puente. | **Videos + luces** · Videos oficiales de BTS y tu lightstick cambiando de color en cada parte: intro, coro, puente. | — |
| L-49 | `.feat` 2 | **Modo micrófono** · ¿Concierto en la TV? Tus luces siguen la música. El audio nunca sale de tu dispositivo. | **Concierto en la TV** · Pon el concierto en otra pantalla y tus luces siguen la música por el micrófono. El sonido se analiza en tu dispositivo y nunca se envía. | — |
| L-50 | `.feat` 3 | **Fanchant** · Entre canciones, los nombres de los integrantes a tiempo, con romanización. | **Fanchant** · Entre canción y canción aparecen los nombres que corea el público, en hangul y con romanización, para que corees a tiempo. | — |
| L-51 | `.feat` 4 | **Reto de ritmo** · Toca al compás y entra al ranking solo con tu nickname. Sin cuentas. | **Reto de ritmo** · Toca al compás, arma combos y sube en el ranking solo con tu nickname. Sin cuentas. | — |
| L-52 | `.mock-rank` (decorativo) | @tu_nick Ejemplo · @army_luz · @purple_7 | @tu_nick (Ejemplo) · @nick_ejemplo · @otro_nick | — |
| L-53 | `.feat.wide` | **Para todas las personas** · Teclado y lector de pantalla, modo seguro activado por defecto y, sin lightstick, tu pantalla como lightstick. | **Para cada ARMY** · Se usa con teclado y lector de pantalla. El modo seguro (máximo 3 destellos por segundo) viene activado. ¿Sin lightstick? Tu pantalla brilla en su lugar. | — |
| L-54 | `.mock-safe` (decorativo) | Modo seguro · máx. 3 destellos/s | (se queda) | — |
| L-55 | `.stats dt` | Álbumes · Canciones · Conciertos · Destellos/s máx. | Álbumes · Canciones · Conciertos · Destellos por segundo, máximo | — |

Nota L-52: los nicknames de ejemplo actuales podrían pertenecer a personas reales. Usar ejemplos que se lean como
ejemplo. Nota L-49: el título pasa de la función ("Modo micrófono") al caso de uso ("Concierto en la TV"), igual que
el nuevo menú "Concierto" del reproductor.

### 8.8 Cierre: océano (`#oceano`)

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| L-56 | `#oceano .kicker` | 05 El océano morado | (se queda) | — |
| L-57 | `#t-oceano` | Enciende tu parte / del estadio | Suma tu luz / **al océano morado** | Enciende tu parte / **del estadio** (actual) |
| L-58 | `#oceano .sub` | Dale play a la intro y mira cómo el público se enciende fila por fila, al ritmo de la canción. | Dale play a la intro y mira cómo el estadio se enciende fila por fila. Después, es tu turno. | — |
| L-59 | `#oceano .btn.primary` | Entrar a la experiencia | Abrir el reproductor | Sincronizar mi ARMY Bomb |
| L-60 | `#oceano .js-intro` | ▶ Escuchar la intro | (igual que L-11/L-12) | — |

### 8.9 Pie (`.foot`)

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| L-61 | `.foot-links` | Privacidad · GitHub · Cómo conectar | Privacidad · Código en GitHub · Guía de conexión | — |
| L-62 | `.foot p` (aviso) | Proyecto de fans sin afiliación con HYBE, BIGHIT MUSIC ni BTS. La lightstick 3D es una ilustración inspirada, no el diseño oficial. La música se reproduce desde YouTube. | Hecho con 💜 por ARMY. Proyecto de fans no oficial, sin afiliación con HYBE, BIGHIT MUSIC ni BTS. El lightstick 3D es una ilustración propia, no el diseño oficial. Los videos se reproducen desde YouTube. | — |

---

## 9. Reproductor (`player/index.html`, `src/app.js`)

### 9.1 Barra superior y lista lateral

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| P-01 | `.skip` | Saltar a los controles | (se queda) | — |
| P-02 | `.menu-item[href="../"]` | Inicio | (se queda) | — |
| P-03 | `#btn-side` | Canciones | (se queda) | — |
| P-04 | `.view-tabs` `#view-video` / `#view-lights` | Video · Luces | (se quedan) | — |
| P-05 | `#conn-label` (sin conexión, HTML) | Conectar ARMY Bomb | (se queda) | — |
| P-06 | `src/app.js` `renderSticks` `#conn-label` | `Conectar` / `${n} conectada(s)` | `Conectar ARMY Bomb` / `${n} conectado(s)` 💜 | — |
| P-07 | `src/app.js` `#btn-bt` `aria-label` | `${n} lightstick conectada. Administrar` / Conectar lightstick | `Conectar ARMY Bomb: ${n} conectado(s). Administrar` / Conectar ARMY Bomb | — |
| P-08 | `#side-close` `aria-label` | Ocultar lista de canciones | (se queda) | — |
| P-09 | `.song-search` `placeholder` | Buscar canción, álbum o año | Busca canción, álbum, año o integrante | — |
| P-10 | `src/app.js` búsqueda sin resultados | No está "{q}" en el catálogo. Búscala en YouTube y pega el enlace en Mis videos. | No encontramos "{q}". [Búscala en YouTube] | — |
| P-11 | `src/app.js` filtro Me gusta vacío | Aún no tienes canciones en Me gusta. Toca ♡ junto a una canción para guardarla. | Aún no guardas canciones. Toca ♡ en una. | — |
| P-12 | `src/app.js` chips de filtro | Todo · ♥ Me gusta · Mis videos | (se quedan) | — |
| P-13 | `#style-chip` estados | Luces listas · En pausa · 🎙 Luces siguiendo el micrófono | Luces listas · En pausa · 🎙 Luces siguiendo el micrófono (se quedan) | — |

Nota P-07: con la regla de "label en el nombre", el `aria-label` empieza con el texto visible.

### 9.2 Inicio del reproductor (`#home`) y estantes

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| P-14 | `#home .eyebrow` | Proyecto de fans · no oficial | (se queda) | — |
| P-15 | `#home-title` | Elige una canción | ¿Qué suena hoy? | Elige una canción |
| P-16 | `#home .hero-sub` | Tus luces seguirán cada parte del video. | Dale play y tus luces siguen la canción. | — |
| P-17 | `#home-connect` | Conectar ARMY Bomb | (se queda) | — |
| P-18 | `#btn-start` | Todas las canciones | Ver canciones | Todas las canciones |
| P-19 | estante `likes` (título) | (sin texto aún) | Tus Me gusta | — |
| P-20 | estante `start` | (sin texto aún) | Para empezar · sub: "¿Primera vez? Empieza por un clásico." | Los clásicos |
| P-21 | estante `lyrics` | (sin texto aún) | Con letra en pantalla · sub: "Videos oficiales con la letra en el video." | — |
| P-22 | estante `solo` | (sin texto aún) | Solistas · sub: "Lo más reciente de cada integrante." | Por integrante |
| P-23 | estante `hype` | (sin texto aún) | Para que brille tu ARMY Bomb · sub: "Rápidas y con mucha energía." | Las más movidas |
| P-24 | estante nuevo (si se implementa) | — | Seguir escuchando | — |
| P-25 | `#upnext-title` / `#qun-title` | A continuación | (se queda) | — |
| P-26 | `#upnext-close` `aria-label` | Ocultar sugerencias | (se queda) | — |

### 9.3 Video, letra, fanchant y vista Luces

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| P-27 | `#lb-text` (HTML/JS) | Coreano (hangul) · subtítulos oficiales del video | (se queda) | — |
| P-28 | `#lb-text` con `lyricVideo` | Video oficial con la letra en pantalla | (se queda) | — |
| P-29 | `#lb-link` | Letra completa y romanización ↗ | Ver la letra en Genius ↗ (si el enlace siempre va a Genius) | Letra y romanización (sitio externo) ↗ |
| P-30 | `.chant-label` | Fanchant | Fanchant · ¡a corear! | — |
| P-31 | `#chant-skip` | Saltar | Saltar fanchant | — |
| P-32 | `#lights-view .hint` | Tu pantalla también es una lightstick: súbele el brillo y levántala. | Sin ARMY Bomb, tu pantalla brilla. Sube el brillo. | — |
| P-33 | `#cam-video` `aria-label` | Vista de la cámara para apuntar a un lightstick | (se queda) | — |
| P-34 | `#cam-status` | Apunta la mira a un ARMY Bomb encendido | Apunta el círculo a un ARMY Bomb encendido | — |
| P-35 | `#now-section` (patrones) | intro · verso · pre-coro · coro · puente · coro final · final | (se quedan) | — |

Nota P-29: confirmar a dónde lleva `lb-link`. Un enlace que abre otro sitio debe decirlo.

### 9.4 Dock y menús

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| P-36 | `#now-title` / `#now-album` (sin canción) | Nada sonando / Purple Wave Sync | Nada sonando aún / Elige una canción | — |
| P-37 | `#btn-prev` / `#btn-play` / `#btn-next` `aria-label` | Anterior / Reproducir / Siguiente | Canción anterior / Reproducir (Pausar) / Siguiente canción | — |
| P-38 | `#timeline` `aria-label` | Posición en el video | (se queda) | — |
| P-39 | `#btn-queue` | Canciones | (se queda) | — |
| P-40 | `#btn-lyrics` `title` | Video oficial con letra o subtítulos oficiales | Muestra la letra (video o subtítulos oficiales) | — |
| P-41 | `#btn-live` | Concierto | (se queda) | — |
| P-42 | `#menu-live .mp-title` | ¿Dónde estás? | ¿Dónde es el concierto? | — |
| P-43 | `#btn-concert` label / small | Estoy en un concierto · La cámara copia el color de los ARMY Bomb | En el estadio · La cámara copia el color de los ARMY Bomb | Estoy en un concierto (actual) |
| P-44 | `#btn-mic` label / small | Concierto en la TV · El micrófono hace que las luces sigan la música | En la TV · Las luces siguen la música | Concierto en la TV (actual) |
| P-45 | `#dock-bt-label` | Conectar | (se queda; con conexión: "Conectado") | — |
| P-46 | `#btn-more` | Más | (se queda) | — |
| P-47 | `#btn-auto` label / small | Seguir al terminar · Pasa sola a la siguiente canción | (se quedan) | — |
| P-48 | `#btn-game` | Reto de ritmo | (se queda) | — |
| P-49 | `#btn-feedback` | Opinar | Dar mi opinión | Opinar |
| P-50 | `#btn-fs` / `aria-label` en JS | Pantalla completa / Salir de pantalla completa | (se quedan) | — |

Nota P-43: "Estoy en un concierto" es claro y emotivo; si se mantiene, mejor. Solo asegurar que el texto pequeño
no sugiera que se conecta con el sistema del estadio (no lo hace: copia lo que ve la cámara).

### 9.5 Panel Canciones y conciertos (`#panel-queue`)

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| P-51 | `#pq-title` | Canciones y conciertos | (se queda) | — |
| P-52 | pestañas | Canciones · Conciertos · Mis videos | (se quedan) | — |
| P-53 | `#q-concerts .hint` 1 | Los conciertos completos oficiales están en plataformas de pago y no se pueden incrustar aquí. Ponlos en tu TV o en otro dispositivo y activa el **modo micrófono**: tus luces seguirán la música. | Son de pago: míralos en la TV y usa el micrófono. | — |
| P-54 | `#btn-mic-2` | Activar modo micrófono / Apagar modo micrófono | Activar micrófono / Apagar micrófono | — |
| P-55 | `#q-concerts .hint` 2 | ¿Encontraste una presentación en vivo oficial en YouTube (por ejemplo, en BANGTANTV)? Agrégala en *Mis videos* como concierto. | ¿Un en vivo oficial en YouTube? Agrégalo en *Mis videos*. | — |
| P-56 | `#inp-url` label | Enlace de YouTube | Enlace del video de YouTube | — |
| P-57 | `.kind legend` / radios | Tipo · Canción · Concierto o en vivo | ¿Qué es? · Canción · Concierto o en vivo | — |
| P-58 | `#form-add [type=submit]` | Agregar | Agregar video | — |
| P-59 | `#q-mine .hint` | Usa solo videos de canales oficiales. Se guardan en este dispositivo. | Solo canales oficiales. Se guardan en este dispositivo. | — |
| P-60 | `src/app.js` lista vacía | Aún no agregaste videos. | Aún no agregas videos. | — |
| P-61 | `src/app.js` toast enlace inválido | Ese enlace no parece de YouTube. | Ese enlace no parece de YouTube. | — |
| P-62 | `src/app.js` título por defecto | Mi video | (se queda) | — |
| P-63 | `src/app.js` mood en fila | Concierto / en vivo · Baile · Medio tiempo · Balada · Canción | (se quedan) | — |
| P-64 | `src/app.js` badge | Con letra | (se queda) | — |
| P-65 | `src/app.js` like `aria-label` | Agregar {t} a Me gusta / Quitar {t} de Me gusta | (se quedan) | — |
| P-66 | `src/app.js` toast like | ♥ {t} en Me gusta / {t} quitada de Me gusta | 💜 {t} guardada en Me gusta / {t} ya no está en Me gusta | — |

### 9.6 Panel Bluetooth (`#panel-bt`)

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| P-67 | `#pb-title` | Tu lightstick | Tu ARMY Bomb | — |
| P-68 | `#panel-bt .hint` 1 | Enciende la lightstick y el Bluetooth. Conecta varias para hacer olas. | Pon tu ARMY Bomb en modo Bluetooth y conéctalo. | — |
| P-69 | `#btn-connect` | Conectar lightstick / Conectando… / Conectar otra | Conectar ARMY Bomb / Conectando… / Conectar otro | — |
| P-70 | `#chk-all` | Mostrar todos los dispositivos | Mostrar todos los dispositivos (se queda) | — |
| P-71 | `#stick-list` `aria-label` | Lightsticks conectadas | ARMY Bomb conectados | — |
| P-72 | fila de stick, botón | Desconectar | (se queda) | — |
| P-73 | `#btn-guide` | Ver guía paso a paso | Ver la guía | Guía paso a paso |
| P-74 | `#panel-bt .hint` 2 | Sin lightstick también funciona: usa la vista **Luces** y tu pantalla brillará al ritmo. | ¿Sin ARMY Bomb? Usa la vista **Luces**. | — |
| P-75 | `showBtWarning("ios")` | Safari en iPhone y iPad no permite Bluetooth web. Abre esta página en Bluefy (gratis) para conectar tu lightstick. Mientras, puedes ver los videos y usar tu pantalla como lightstick. | En iPhone y iPad, Safari no permite conectar por Bluetooth. Abre esta página en [Bluefy] (gratis) para conectar tu ARMY Bomb. Mientras, puedes ver los videos y usar tu pantalla como lightstick. | — |
| P-76 | `showBtWarning("insecure")` | Abre la app desde https:// para usar Bluetooth. | Para usar Bluetooth, abre la app desde su dirección segura (empieza con https://). | — |
| P-77 | `showBtWarning` (otro) | Tu navegador no soporta Web Bluetooth. Usa Chrome o Edge en Android, Windows, macOS o ChromeOS. | Este navegador no puede conectar por Bluetooth. Abre la página en Chrome o Edge (Android, Windows, Mac o Chromebook). | — |

### 9.7 Toasts del reproductor (≤ 90 caracteres)

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| P-78 | `onConnect` duplicado | Esa lightstick ya está conectada. | Ese ARMY Bomb ya está conectado. | — |
| P-79 | `onConnect` éxito | {nombre} conectada 💜 | ¡{nombre} conectado! Borahae 💜 | {nombre} conectado 💜 Elige una canción |
| P-80 | `gattserverdisconnected` | {nombre} se desconectó. | {nombre} se desconectó. | — |
| P-81 | `onConnect` error genérico | (mensaje del sistema) o No se pudo conectar. | No pudimos conectar. Revisa que parpadee y prueba otra vez. | — |
| P-82 | `toggleLyrics` off | Letra desactivada. | Letra oculta. | — |
| P-83 | `toggleLyrics` lyricVideo | Letra activada: video oficial con la letra en pantalla. | Letra activada: cambiamos al video oficial con letra. | — |
| P-84 | `toggleLyrics` subtítulos | Letra en {idioma} activada (subtítulos oficiales del video). | Letra en {idioma} activada. | — |
| P-85 | sin pista en idioma / sin subtítulos | Este video no tiene letra en ese idioma. Prueba con otro en Ajustes. / Este video no tiene subtítulos oficiales. | Sin letra en {idioma}. Prueba otro idioma en Ajustes. / Este video no trae subtítulos oficiales. | — |
| P-86 | cámara off | Modo concierto apagado. | Cámara apagada. Modo concierto en pausa. | — |
| P-87 | cámara sin soporte | Este navegador no permite usar la cámara. | (se queda) | — |
| P-88 | cámara on | Apunta la mira a un ARMY Bomb encendido: tu pantalla copiará su color. | Apunta a un ARMY Bomb encendido y tu pantalla copiará su color. | — |
| P-89 | cámara error | No se pudo usar la cámara. Revisa los permisos del navegador. | No pudimos usar la cámara. Revisa el permiso en tu navegador. | — |
| P-90 | micrófono off | Modo micrófono apagado. | Micrófono apagado. | — |
| P-91 | micrófono on | 🎙 Modo micrófono: tus luces siguen la música que suena cerca. | 🎙 Tus luces siguen la música que suena cerca. Nada se graba. | — |
| P-92 | micrófono error | No se pudo usar el micrófono. Revisa los permisos del navegador. | No pudimos usar el micrófono. Revisa el permiso en tu navegador. | — |
| P-93 | `btn-auto` | Pasará a la siguiente al terminar. / Se detendrá al terminar cada video. | Al terminar, sigue la siguiente. / Al terminar, se detiene. | — |
| P-94 | video bloqueado | Este video no se puede reproducir aquí. Pasando al siguiente. | YouTube no deja ver este video aquí. Pasamos al siguiente. | — |
| P-95 | guía sin soporte | En iPhone abre esta página en Bluefy para conectar. / Este navegador no soporta Bluetooth web. | En iPhone, abre esta página en Bluefy para conectar. / Este navegador no puede conectar por Bluetooth. | — |
| P-96 | `onDone` guía | 💜 {nombre} sincronizado. ¡Elige una canción! | 💜 ¡{nombre} listo! Ahora elige una canción. | — |
| P-97 | borrar datos `confirm()` | ¿Borrar tus ajustes, nickname, puntajes y videos guardados en este dispositivo? | ¿Borrar tus ajustes, nickname, puntajes, Me gusta y videos de este dispositivo? No se puede deshacer. | — |
| P-98 | borrar datos ok | Datos borrados. La página se recargará. | Listo, datos borrados. La página se recargará. | — |

Nota P-97: confirmar que "Borrar mis datos" también borra Me gusta; si sí, nombrarlo (la privacidad lo menciona).

### 9.8 Ajustes (`#panel-settings`)

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| P-99 | `#ps-title` | Ajustes | (se queda) | — |
| P-100 | `#sg-lights` | Luces | (se queda) | — |
| P-101 | `rng-bright` label | Brillo | (se queda) | — |
| P-102 | `rng-latency` label | Ajuste de sincronía | Retraso de las luces | Ajuste de sincronía |
| P-103 | `#lat-help` | ¿Llegan tarde? Súbelo. ¿Se adelantan? Bájalo. | ¿Van tarde? Súbelo. ¿Se adelantan? Bájalo. | — |
| P-104 | `sel-style` label | Estilo de luces | (se queda) | — |
| P-105 | `sel-style` opción auto / `#style-help` | Automático (según la canción) · Cada parte usa un estilo distinto, como en un concierto. | (se quedan) | — |
| P-106 | `src/patterns.js` estilos | Océano morado · Respiración · Latido · Ola de colores · Arcoíris · Destellos · Despedida (+ descripciones) | Se quedan. Solo cambiar "Destellos": "Alterna color y apagado al ritmo. Con modo seguro, máximo 3 por segundo." | — |
| P-107 | `num-bpm` label | BPM del video actual | Ritmo (BPM) de esta canción | — |
| P-108 | `#btn-tap-tempo` / estados | Marcar tempo · Toca… n/4 · {n} BPM | Marcar ritmo · Toca… n/4 · {n} BPM | — |
| P-109 | ayuda BPM | Toca "Marcar tempo" al ritmo 4 veces o más. | Toca "Marcar ritmo" 4 veces al compás. | — |
| P-110 | `#chk-safe` | **Modo seguro** · Máximo 3 destellos por segundo | **Modo seguro** · Máximo 3 destellos por segundo (el aviso completo va en la confirmación P-111) | — |
| P-111 | (nuevo, al desactivar `#chk-safe`) | — | Diálogo: **¿Desactivar el modo seguro?** · "Las luces podrían parpadear rápido. Si alguien cerca tiene epilepsia fotosensible, déjalo activado." · Botones: **Mantener modo seguro** (foco) / Desactivar | — |
| P-112 | `#sg-play` | Reproducción | (se queda) | — |
| P-113 | `sel-lyrics` label / ayuda | Idioma de la letra · Son los subtítulos oficiales del video. Si no existen en ese idioma, no aparecen. | Idioma de la letra · Subtítulos oficiales del video, si existen. | — |
| P-114 | `sel-album-end` | Al terminar el álbum: seguir con el siguiente / repetir el álbum / detener | (se quedan; con mayúscula inicial: "Seguir con el siguiente", "Repetir el álbum", "Detener") | — |
| P-115 | `#chk-chant` | **Fanchant entre canciones** · Los nombres de los integrantes, como en los conciertos | **Fanchant entre canciones** · Los nombres que corea el público | — |
| P-116 | `#chk-chant-voice` | Con voz y ovación | Con voz y aplausos | — |
| P-117 | `#chk-wake` | Mantener la pantalla encendida | (se queda) | — |
| P-118 | `#sg-privacy` hint | Tus ajustes, nickname y puntajes se guardan solo en este dispositivo. El micrófono se procesa aquí y nunca se envía. Política de privacidad. | Todo se queda en este dispositivo. [Privacidad] | — |
| P-119 | `#btn-tour` | Ver el recorrido de bienvenida | Repetir el recorrido | Ver el recorrido |
| P-120 | `#btn-clear-data` | Borrar mis datos de este dispositivo | Borrar mis datos | — |
| P-121 | `#sg-support` / hint | Apoya el proyecto · Es gratis y de código abierto. Si te gusta, ayuda a mantenerlo. | Apoya el proyecto · Gratis, de código abierto y hecho por ARMY. | — |
| P-122 | `src/config.js` donaciones `note` | Apoya el desarrollo del proyecto. · Invítame un café. | (se quedan) | — |
| P-123 | `#repo-link` | Código en GitHub | (se queda) | — |
| P-124 | `.shortcuts` | Atajos: Espacio reproducir · N/P siguiente/anterior · B reto · F pantalla completa | Atajos: Espacio reproduce o pausa · N siguiente · P anterior · B reto · F pantalla completa · / buscar | — |
| P-125 | `.legal` | Proyecto de fans sin afiliación con HYBE, BIGHIT MUSIC ni BTS. Los videos se reproducen desde YouTube. Los patrones de luz se generan en tu navegador e imitan estilos de concierto; no son shows oficiales. | Proyecto de fans no oficial, sin afiliación con HYBE, BIGHIT MUSIC ni BTS. Videos desde YouTube; luces creadas en tu navegador. | — |

Nota P-111: es la única pieza nueva que recomendamos sí o sí antes de cualquier campaña: desactivar el modo seguro
debería pedir una confirmación clara.
Nota P-124: el tour menciona la tecla "/" para buscar; los atajos de Ajustes no la mencionan.

### 9.9 Reto de ritmo (`#panel-game`, `src/rhythm.js`)

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| P-126 | `#pg-title` | Reto de ritmo | (se queda) | — |
| P-127 | `#panel-game .hint` 1 | Toca al compás y entra al ranking. Sin cuentas: solo tu nickname de redes. | Toca al compás y entra al ranking. | — |
| P-128 | `sel-network` label / `inp-handle` label | Red · Nickname | Red social · Nickname | — |
| P-129 | `#handle-help` | Letras, números, punto o guion bajo (2 a 30). | 2 a 30 caracteres: letras, números, . o _ | — |
| P-130 | `#chk-game` | Jugar en cada canción | Jugar en todas las canciones | — |
| P-131 | `#tap-pad` | Toca al ritmo / Activa el reto y escribe tu nickname | ¡Toca al ritmo! / Escribe tu nickname y activa el reto | — |
| P-132 | `#tap-help` | También con la tecla B. 4 toques calibran; necesitas 16 para puntuar. | Tecla B · 16 toques para el ranking | — |
| P-133 | `.score-row` | Puntos · Combo · Precisión | (se quedan) | — |
| P-134 | `src/rhythm.js` juicios | ¡Perfecto! · ¡Genial! · Bien · Fuera de ritmo | (se quedan) | ¡Perfecto! · ¡Genial! · ¡Bien! · Casi |
| P-135 | pestañas | Esta canción · Puntos de fan | (se quedan) | — |
| P-136 | `#rank-caption` sin canción | Elige una canción para ver su ranking | (se queda) | — |
| P-137 | `#rank-caption` | Mejores puntuaciones en {t} / Puntos de fan: suma de tu mejor puntuación en cada canción | Lo mejor en {t} / Puntos de fan: tu mejor puntaje de cada canción, sumado | — |
| P-138 | ranking vacío | Aún no hay puntuaciones. ¡Sé la primera persona! | Nadie ha jugado esta canción todavía. ¡Estrénala! | Aún no hay puntajes. ¡Sé la primera persona! |
| P-139 | `#rank-source` | Ranking global. / Ranking guardado en este dispositivo. | Ranking global. / Ranking de este dispositivo. | — |
| P-140 | hint final | Los nicknames no se verifican. | Los nicknames no se verifican. (se queda) | — |
| P-141 | toast pocos toques | Reto: necesitas al menos {16} toques para entrar al ranking. | Faltaron toques: con {16} entras al ranking. | — |
| P-142 | toast resultado | 🏆 {t}: {puntos} puntos · {acc}% · combo {c} · ranking global | (se queda) + botón "Compartir puntaje" (sección 6) | — |
| P-143 | toast sin nickname | Escribe tu nickname para jugar. | (se queda) | — |
| P-144 | tabla `th` | # · Fan · Puntos | (se quedan) | — |

### 9.10 Opinión (`#panel-feedback`, `src/feedback.js`)

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| P-145 | `#pf-title` | Tu opinión | (se queda) | — |
| P-146 | hint | Ayúdanos a mejorar. Es anónimo: no pongas datos personales. | Es anónimo: no escribas datos personales. | — |
| P-147 | estrellas `legend` | ¿Qué tan agradable fue la experiencia? | ¿Qué tal la pasaste? | — |
| P-148 | `ease` label | ¿Qué tan fácil fue conectar tu lightstick? | ¿Qué tan fácil fue conectar tu ARMY Bomb? | — |
| P-149 | `ease` opciones | Muy fácil · Fácil · Normal · Difícil · No pude conectarla · No lo intenté | Muy fácil · Fácil · Normal · Difícil · No pude conectarlo · No lo intenté | — |
| P-150 | `would_use` label | ¿La usarías en un concierto o fiesta? | ¿La usarías en una fiesta o un concierto? | — |
| P-151 | `#fb-comment` placeholder | ¿Qué te gustó? ¿Qué mejorarías? ¿Algo falló? | ¿Qué te gustó? ¿Qué le falta? ¿Algo falló? | — |
| P-152 | `device` check | Incluir mi tipo de dispositivo y navegador (sin datos personales) | Incluir el tipo de dispositivo y navegador (nos ayuda a arreglar fallas) | — |
| P-153 | submit | Enviar opinión | (se queda) | — |
| P-154 | validación | Elige una calificación o escribe un comentario. | (se queda) | — |
| P-155 | `src/feedback.js` límite | Gracias. Espera un minuto antes de enviar otra opinión. | ¡Gracias! Espera un minuto para enviar otra. | — |
| P-156 | `src/feedback.js` ok servidor | ¡Gracias! Tu opinión llegó 💜 | ¡Gracias! Tu opinión llegó. Borahae 💜 | — |
| P-157 | `src/feedback.js` vía GitHub | Se abrió GitHub con tu opinión lista para publicar. | Abrimos GitHub con tu opinión lista. Solo se publica si tú lo confirmas allí. | — |
| P-158 | `#fb-community` | Ver y comentar en la comunidad (GitHub) | Ver opiniones de otras personas en GitHub | — |

---

## 10. Guía de conexión (`src/guide.js`, `#guide`) · ≤ 110 caracteres

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| G-01 | paso 1 title / text / next | Activa el Bluetooth · En tu teléfono o computador. En iPhone, abre esta página en Bluefy. · Ya está | Activa el Bluetooth · En tu celular o computadora. En iPhone, abre esta página en la app Bluefy. · Listo | — |
| G-02 | paso 2 | Libéralo de otros dispositivos · Si estaba conectado a otro teléfono o app, desconéctalo: solo admite uno a la vez. · Hecho | Libéralo · Si está conectado a otro celular o app, desconéctalo: solo acepta uno a la vez. · Hecho | — |
| G-03 | paso 3 | Enciende el modo Bluetooth · Con el ARMY Bomb apagado, mantén presionados los dos botones del mango durante 2 segundos. · Ya parpadea | Modo Bluetooth · Con el ARMY Bomb apagado, mantén los dos botones 2 segundos, hasta que parpadee. · Ya parpadea | — |
| G-04 | paso 4 | Conéctalo · Toca Conectar y elige el dispositivo resaltado: BTS LIGHTSTICK o BBOMB-… | Conéctalo · Toca Conectar y elige tu ARMY Bomb: aparece como BTS LIGHTSTICK o BBOMB-… | — |
| G-05 | `#c-step` | Paso {n} de 4 | (se queda) | — |
| G-06 | `#g-voice` aria | Activar narración / Silenciar narración | (se quedan) | — |
| G-07 | `#g-close` aria | Minimizar guía | (se queda) | — |
| G-08 | `#g-skip` | Omitir | Omitir guía | — |
| G-09 | `#g-prev` / `#g-next` / `#g-action` | Atrás · Siguiente · Conectar | (se quedan) | — |
| G-10 | estado buscando | Buscando… · Elige tu ARMY Bomb en la ventana del navegador | Buscando… · Elige tu ARMY Bomb en la lista que abrió el navegador | — |
| G-11 | estado fallo | No se conectó · Revisa que parpadee en modo Bluetooth y vuelve a intentarlo | No se conectó · Revisa que esté parpadeando y vuelve a tocar Conectar | — |
| G-12 | final `#c-step` / título / texto | Listo · ¡Conectado! · Si brilla en morado, ya está sincronizado. | Listo · ¡Conectado! · Si brilla en morado, ya está. Borahae 💜 | — |
| G-13 | estado ok sub | {n} lightsticks conectadas / Recibiendo colores | {n} ARMY Bomb conectados / Recibiendo colores | — |
| G-14 | narración | Conectado a {nombre} | (se queda; sin emoji porque se lee en voz alta) | — |
| G-15 | `#coach-pill` | Conectar ARMY Bomb · paso {n}/4 | Seguir conectando · paso {n} de 4 | — |
| G-16 | escena `free` (decorativa) | Vinculados · ARMY Bomb Olvidar · Auriculares | (se queda) | — |

---

## 11. Recorrido de bienvenida (`src/tour.js`) · ≤ 110 caracteres

| # | Ubicación | Actual | Propuesta | Alt A/B |
| --- | --- | --- | --- | --- |
| T-01 | tip `#btn-side` | Elige qué escuchar · Canciones por álbum y por integrante. Usa el buscador o la tecla /. | Elige qué escuchar · Canciones por álbum y por integrante. Busca con la tecla /. | — |
| T-02 | tip `like` | Arma tu lista · Toca ♡ en una canción para guardarla en Me gusta. | Arma tu lista · Toca ♡ y la canción queda en Me gusta, lista para la próxima. | — |
| T-03 | tip `#btn-bt` | Conecta tu ARMY Bomb · Se ilumina con cada parte de la canción. Sin lightstick, la vista Luces usa tu pantalla. | Conecta tu ARMY Bomb · Cambia de color con cada parte de la canción. ¿Sin él? La vista Luces usa tu pantalla. | — |
| T-04 | tip `#btn-lyrics` | Letra · Cambia al video oficial con la letra en pantalla cuando existe. | Letra · Muestra la letra con el video oficial o sus subtítulos, cuando existen. | — |
| T-05 | tip `#btn-mic` | ¿Concierto en la TV? · El modo micrófono hace que las luces sigan lo que suena cerca. | ¿Concierto en la TV? · Tus luces siguen lo que suena cerca, por el micrófono. Nada se graba. | — |
| T-06 | tip nuevo `#btn-live` (si el micrófono queda dentro del menú y no se ve) | — | Concierto · ¿En el estadio o frente a la TV? Elige y tus luces te acompañan. | — |
| T-07 | contador / botones | {n} de {total} · Saltar · Siguiente · ¡Listo! | (se quedan) | — |

Nota T-05/T-06: con el dock nuevo, `#btn-mic` vive dentro del menú "Concierto". El tour salta tips sin objetivo
visible, así que ese tip ya no se mostraría. Apuntar el tip a `#btn-live` con el texto T-06.

---

## 12. Privacidad (`privacy/index.html`) · solo tono, mismo significado legal

| # | Ubicación | Actual | Propuesta |
| --- | --- | --- | --- |
| V-01 | `nav a` | Ir a la app | Abrir el reproductor |
| V-02 | `h1` | Privacidad y seguridad | (se queda) |
| V-03 | `.lead` | Purple Wave Sync es un proyecto de fans, gratis y de código abierto. Está hecho para guardar lo mínimo posible. | Purple Wave Sync es un proyecto de fans, gratis y de código abierto. Lo hicimos para guardar lo mínimo posible, y casi todo se queda en tu dispositivo. |
| V-04 | `h2` | Qué guardamos | (se queda) |
| V-05 | li 1 | Nada en servidores propios. El sitio es estático: no hay cuentas, ni contraseñas, ni base de datos de usuarios. | (se queda) |
| V-06 | li 2 | En tu dispositivo (almacenamiento local del navegador): … Puedes borrarlo todo en Ajustes → Borrar mis datos de este dispositivo. | (se queda; actualizar el nombre del botón si se aplica P-120: "Ajustes → Borrar mis datos") |
| V-07 | li 3 | Sin cookies propias, sin analítica y sin publicidad. | (se queda) |
| V-08 | `h2` / li Bluetooth | Permisos del navegador · Bluetooth: solo se usa para enviar colores a la lightstick que tú eliges… | (se queda; "al lightstick" por la regla de género) |
| V-09 | li Micrófono / Cámara / Pantalla | (texto actual) | Se quedan. Son claros y precisos; el tono ya es el correcto. |
| V-10 | `h2` | Servicios de terceros | (se queda) |
| V-11 | li Ranking | … Los nicknames no se verifican: no uses tu nombre real si no quieres. | (se queda) |
| V-12 | `h2` / lista seguridad | Medidas de seguridad | (se queda) |
| V-13 | `h2` / Contacto | ¿Encontraste un problema de seguridad? Repórtalo en privado como se explica en la política de seguridad. | (se queda) |
| V-14 | `.hint` final | Proyecto de fans sin afiliación con HYBE, BIGHIT MUSIC ni BTS. | Proyecto de fans no oficial, sin afiliación con HYBE, BIGHIT MUSIC ni BTS. |

La privacidad ya habla en el tono correcto: llana, directa y sin jerga legal. Recomendamos tocar lo mínimo.

---

## 13. README (intro)

| # | Ubicación | Actual | Propuesta |
| --- | --- | --- | --- |
| R-01 | `# 💜 Purple Wave Sync` | (se queda) | (se queda) |
| R-02 | cita bajo el título | **Lightstick BTS concert sync** · Página web no oficial para sincronizar tu lightstick (ARMY Bomb) con canciones de BTS en modo concierto. | **Lightstick BTS concert sync** · Tu ARMY Bomb al ritmo de cada canción de BTS, desde el navegador. Proyecto de fans, no oficial. |
| R-03 | párrafo | App web progresiva (PWA), gratuita y de código abierto, para sincronizar tu lightstick con canciones, **álbum por álbum**, desde el navegador. Sin instalar nada y sin cuentas. | Conecta tu ARMY Bomb por Bluetooth, dale play a un video oficial y míralo cambiar de color en el intro, el coro y el puente, **álbum por álbum**. ¿Sin lightstick? Tu pantalla brilla en su lugar. Es una app web (PWA) gratuita y de código abierto: sin instalar nada y sin cuentas. |
| R-04 | nueva línea tras el párrafo | — | **[Abrir Purple Wave Sync](https://karlamedina97.github.io/lightstick-bts-concert-sync/)** · Funciona en Chrome o Edge (Android, Windows, Mac, Chromebook) y en iPhone con Bluefy. |
| R-05 | aviso | Proyecto de fans. **No oficial** y sin afiliación con HYBE, BIGHIT MUSIC ni BTS. Los videos se reproducen desde YouTube; este repositorio no contiene audio ni video. | (se queda) |
| R-06 | viñeta "Landing 3D" | … gira al ritmo de la intro de la canción del grupo más escuchada del momento … | … gira al ritmo de la intro de una canción destacada (configurable en `src/config.js`). |

---

## 14. Resumen de cambios

| Pantalla | Filas | Reescritas | Se quedan |
| --- | --- | --- | --- |
| Metadatos y manifest (M) | 13 | 11 | 2 |
| Landing (L) | 62 | 47 | 15 |
| Reproductor (P) | 158 | 106 | 52 |
| Guía de conexión (G) | 16 | 10 | 6 |
| Tour (T) | 7 | 6 | 1 |
| Privacidad (V) | 14 | 4 | 10 |
| README (R) | 6 | 4 | 2 |

**Pendientes que dependen de código** (no son solo texto): P-111 (confirmar al desactivar modo seguro), P-19 a P-24
(títulos de estantes cuando existan), T-06 (tip en `#btn-live`), M-05 (etiquetas OG con imagen) y todo lo de la
sección 6.

**Verificar antes de publicar:** L-18 (dato de Spotify), L-29 (pilas por versión), P-29 (destino de `lb-link`),
P-97 (qué borra "Borrar mis datos").
