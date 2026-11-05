# Auditoría UX · Purple Wave Sync

Evaluación heurística (Nielsen), accesibilidad (WCAG 2.2 AA), diseño visual, arquitectura de información y UX móvil
de la landing (`/`), el reproductor (`/player/`) y la privacidad (`/privacy/`).

- **Fecha:** 2026-11-04. **Sitio auditado:** el publicado en GitHub Pages
  (https://karlamedina97.github.io/lightstick-bts-concert-sync/). La copia local tiene trabajo sin publicar (landing
  reescrita, tema claro en `styles.css`, botón `#btn-theme`); se menciona solo cuando cambia una conclusión.
- **Método:** Edge headless (SwiftShader) por CDP en 1440×900, 1280×800, 768×1024, 390×844, 360×740 y 844×390.
  Capturas de cada estado (primera visita, guía, recorrido, inicio, canción sonando, Luces, menús, paneles, cola,
  mini reproductor) y medición de contraste **contra el fondo real renderizado**: se toma la captura, se oculta el
  texto (`color: transparent`), se vuelve a capturar y se muestrea el fondo detrás de cada nodo de texto.
  Se reporta la **mediana** y el **peor caso** (percentil 95 de luminancia del fondo para texto claro). Se excluyen
  textos con degradado (`.grad`, el color real es la imagen de fondo) y nodos tapados por otros elementos.
- **Capturas:** `C:\Users\USUARIO\AppData\Local\Temp\claude\93853b72d935e70d\fce09ad3-0074-4131-a865-3fe976c120e3\scratchpad\audit\`
  (en este documento se citan solo por nombre de archivo). Los datos crudos de contraste están en
  `landing-live-contrast.json` y `player-report-*.json` en esa misma carpeta.
- **Limitaciones:** sin hardware BLE, sin lector de pantalla real y con GPU por software (los tiempos de tareas largas
  están inflados). En headless `pointer: coarse` no se activa, así que los tamaños táctiles medidos en "móvil" son los
  de ratón; el CSS ya los agranda con `@media (pointer: coarse)` en algunos controles (ver I-08).
- **Escala:** severidad **Crítico / Alto / Medio / Bajo**; esfuerzo **S** (horas), **M** (1–3 días), **L** (más).

---

## 1. Resumen ejecutivo: los 10 problemas principales

| # | Problema | Dónde | Sev. | Esf. |
|---|---|---|---|---|
| 1 | **El panel Cola se pinta roto**: secciones superpuestas ("En tu cola" encima de "A continuación"), títulos de canciones invisibles, el aviso de cola vacía visible con la lista llena. El DOM lo confirma: `#cq-user-title` (y=418) se monta sobre `#cq-ctx > li` (y=424). | `#panel-cola`, `#cola-body` | Crítico | M |
| 2 | **El mini reproductor flotante de la landing tapa el contenido** (≈450×220 px en escritorio, media pantalla en horizontal) y **arranca solo**, muestra **anuncios de YouTube** y recorta los títulos ("Todo el con…", "Enciende tu…"). | `.mini` de la landing (`pws.landing.mini`) | Crítico | S |
| 3 | **Tres listas de canciones a la vez** (lista lateral "Canciones", Explorar y el panel "Canciones y conciertos" desde Más). Además, la pestaña "Explorar" está repetida en Más. La persona no sabe cuál es "la" biblioteca. | `#side`, `#home`, `#panel-queue`, `#mi-explore` | Alto | M |
| 4 | **La cabecera fija de la landing no tiene fondo suficiente**: el texto pasa por debajo de la marca y los enlaces (marca sobre el botón blanco: **1.88:1**; "GitHub" **1.22:1** en 390 px; tarjetas de pasos montadas sobre los enlaces del menú en 1440). | `.landing .nav` | Alto | S |
| 5 | **Texto sobre la escena 3D y el público sin protección**: subtítulo del océano **1.21:1** en el peor punto, "Funciona en Chrome o Edge…" **1.83:1** cuando cruza el lightstick, metadatos de estantes del reproductor ("ARIRANG", "Butter") **2.82:1** y **1.74:1** sobre las luces del público. | landing `.sub`, reproductor `.m-artist` | Alto | S |
| 6 | **Estado de pestañas incoherente**: al entrar, "Video" aparece seleccionada pero se ve el contenido de Explorar; en el móvil la pestaña "Explorar" queda cortada en el borde. | `.view-tabs` | Alto | S |
| 7 | **El título del dock siempre se desvanece**: la máscara `linear-gradient(... calc(100% - 20px), transparent)` se aplica aunque el texto quepa ("Butter" se lee "Butte"); "Nada sonando aún" se trunca a "Nada son…" incluso en 1440 px. | `.np-title` (línea 1554 de `styles.css`) | Alto | S |
| 8 | **La primera visita apila tres capas** (guía de 4 pasos que tapa el botón Conectar del inicio + recorrido de 7 globos + sugerencias), y el paso 1 del recorrido señala "Canciones" cuando la lista ya está abierta. | `#guide`, `.tour` | Alto | M |
| 9 | **Áreas táctiles por debajo de la regla del proyecto (44 px)**: corazón 30×30, ⋯ 36×36, chips 34 px de alto, pestañas 36 px, Inicio 34×38 en 360 px; la barra de tiempo mide 4 px a la vista (su `::before` amplía el área a 36 px). | `.like-btn`, `.more-btn`, `.filter-chip`, `.seg` | Medio | S |
| 10 | **Acento que cambia con cada canción** (morado → naranja con Dynamite → amarillo con Butter) en el CTA, los interruptores y la pestaña activa: rompe la consistencia, cambia el significado del color de estado y algunos tonos (amarillo con texto blanco) son difíciles de garantizar en AA. | `--song-accent`, `.pill.cta`, `.mi[aria-pressed]` | Medio | M |

Otros temas de peso, fuera del top 10: el panel "Canciones y conciertos" deja los chips de filtro vacíos (UI-07), el
mini reproductor y el dock juntos ocupan la mitad de la pantalla en 390×844 (I-10), el ícono de intensidad de luces
no se entiende (V-06), y la portada repite "Proyecto de fans" en tres lugares, con "computador/computadora" y
"el/la lightstick" mezclados (C-01).

---

## 2. Hallazgos por área

### 2.1 Legibilidad sobre fondos (contraste medido sobre el fondo real)

Umbral: 4.5:1 para texto normal, 3:1 para texto grande (≥ 24 px, o ≥ 18.7 px en negrita) y para componentes de UI.

| ID | Pantalla / elemento | Problema | Evidencia | Recomendación | Sev. | Esf. |
|---|---|---|---|---|---|---|
| L-01 | Landing · cabecera fija `.landing .nav` | El degradado `#060818f2 → transparente` deja pasar el contenido. La marca y los enlaces se leen sobre el botón blanco, las tarjetas y el globo encendido. | `landing-live-390x844-s01.png`: "Purple Wave Sync" **1.88:1** (mediana 3.0), "GitHub" **1.22:1**, el CTA "Entrar a la experiencia" queda debajo de la marca. `landing-live-1440x900-s04.png`: la tarjeta "Modo Bluetooth" pisa "Anatomía · Cómo conectar". `s-landing-1280x800-0.5.png`. | Fondo sólido al hacer scroll: `background: rgba(6,8,24,.82); backdrop-filter: blur(14px) saturate(140%)`, línea inferior `1px rgba(255,255,255,.08)`. Alternativa: `scroll-margin-top` y `padding-top` de las secciones ≥ alto de la cabecera, para que el texto nunca pase por debajo. | Alto | S |
| L-02 | Landing · capítulo 05 `p.sub` ("Dale play a la intro…") | Texto 16 px `#c3bcd8` sobre el océano de lightsticks brillantes. | `landing-live-390x844-s08.png`: **1.21:1** peor caso (mediana 9.48). | Velo local detrás del bloque de texto: `.copy::before { background: radial-gradient(60% 80% at 50% 50%, rgba(6,8,24,.78), transparent 70%) }` o un `text-shadow: 0 1px 2px #000, 0 0 18px rgba(6,8,24,.9)`. Atenuar las partículas (−40 % de brillo) en la franja donde vive el texto. | Alto | S |
| L-03 | Landing · capítulo 02 `p.sub` y `h2#t-conectar` | El lightstick 3D cruza el titular y el subtítulo en 1440 y 390. | `landing-live-1440x900-s03.png`: subtítulo **1.83:1**, "Cuatro pasos y" **2.53:1** (peor caso), el aro del globo atraviesa "02 Cómo conectar". | Reservar la columna del lightstick (el `slot` ya existe en ≥ 720 px): que el modelo no salga de su columna mientras el capítulo de texto está activo, o bajar su opacidad a 0.25 cuando se superpone (`IntersectionObserver` + uniform). | Alto | M |
| L-04 | Landing · insignia de pasos `i` ("06") | Número blanco 10.5 px sobre morado medio. | `landing-live-1440x900-s03.png`: **2.43:1**. | Texto `#14072b` sobre la insignia morada clara, o subir la insignia a `#4b2a9a` con texto blanco (≈ 8:1). | Medio | S |
| L-05 | Reproductor · metadatos de estantes `.m-artist` | Álbum/artista (12 px, `#cfc8de`) en la grilla de inicio se apoya directo sobre las luces del público, sin tarjeta. | `player-1440x900-01-firstrun.png` y `player-1440x900-03-home.png`: "ARIRANG" **2.82:1**; `player-768x1024-01-firstrun.png`: "Butter" **1.74:1**. | Dar a cada tarjeta un pie con fondo (`--surface-1`), o un velo de estantes: `.shelves { background: linear-gradient(180deg, transparent, rgba(6,6,26,.7) 120px) }`. También bajar la densidad del canvas del público detrás de `#home` (ver P-03). | Alto | S |
| L-06 | Reproductor · contadores de chips `.filter-chip .n` | Números de 12.8 px con opacidad reducida. | En todos los tamaños: "155" / "97" **4.06–4.18:1**; "11" en el chip de SUGA **3.19:1**. | Quitar la opacidad del contador y usar `--text-2` (11.3:1); para el chip de integrante, el color del integrante solo en el punto y el texto en `--text`. | Medio | S |
| L-07 | Reproductor · título del dock `.np-title` | La máscara de desvanecido de 20 px siempre está activa. | `player-360x740-03-home.png`: "Nada sonando aún" **1.12:1** en su extremo; `s-player-1280x800-video.png`: "Butter" se lee "Butte". | Aplicar la máscara solo si hay desborde (`.np-title.is-overflowing`, medido con `scrollWidth > clientWidth`) o usar `text-overflow: ellipsis` sin máscara. | Alto | S |
| L-08 | Reproductor · cola vacía `p.hint.cq-empty` | El aviso se pinta sobre las miniaturas. | `x-1440x900-cola-settled.png`, `x-390x844-cola-settled.png`: **1.65:1** y **1.33:1**. | Es consecuencia de UI-01 (superposición). Ocultar el aviso si `#cq-user` tiene hijos (`#cq-user:not(:empty) + .cq-empty { display: none }`). | Crítico (por UI-01) | S |
| L-09 | Reproductor · Ajustes, encabezado de grupo `h3.group-title` | "LUCES" 12 px `--muted` sobre la hoja translúcida cuando hay un haz de luz detrás. | `player-390x844-11-settings.png`: **1.5:1** peor caso, `lat-help` **3.92:1**. | Paneles y hojas con `--surface-2` **opaco** (`#15122a`) en vez de 95 % + desenfoque; con `prefers-reduced-transparency` aún más. | Medio | S |
| L-10 | Reproductor · rótulos coreanos decorativos `.shelf-ko` | Glifos de 59 px con contorno muy tenue; compiten con el título y en móvil tapan la descripción ("¿Primera vez? Empieza por un clásico." queda cruzada por 시작). | `player-390x844-03-home.png`, `player-360x740-03-home.png`. | Son decorativos (`aria-hidden`, bien): bajarlos a opacidad 0.12, moverlos detrás del título (`z-index: -1`) y ocultarlos por debajo de 480 px. | Bajo | S |
| L-11 | Reproductor · escenario en Video/Luces | El texto de estado ("En pausa", "Sin ARMY Bomb, tu pantalla brilla…") sobre haz + público + grano. | `player-1440x900-09-lights.png`: el texto pasa (≥ 4.5:1 de mediana) pero depende del momento de la canción: con `--energy` alto los haces se aclaran. | Añadir `text-shadow: 0 1px 2px rgba(0,0,0,.6), 0 0 24px rgba(6,6,26,.8)` a `.section-label` y `.lights-view .hint`, y un mínimo de oscurecido bajo la franja de texto. | Medio | S |
| L-12 | Landing · titulares con degradado `.grad` | El extremo cian/celeste del degradado sobre partículas claras pierde forma en tamaños de 54–96 px (el peor caso no se puede medir con píxeles porque el color *es* el fondo). | `landing-live-1440x900-s07.png`, `landing-live-390x844-s08.png`. | Dejar el degradado solo en el `h1` del hero y, en los capítulos, en texto ≥ 40 px sobre zona oscura garantizada; o añadir `filter: drop-shadow(0 2px 12px rgba(6,8,24,.8))` al `span.grad`. | Bajo | S |

**Qué está bien:** `--text` (16.3:1), `--text-2` (11.3:1), `--muted` (6.9:1) y `--accent` (7.1:1) sobre
`--surface-solid` cumplen con holgura; el foco (`--focus #ff8fcb`, 2 px) es visible en todos los controles probados.
El problema no son los tokens, sino las **superficies translúcidas** sobre una escena viva.

### 2.2 Arquitectura de información y navegación

| ID | Pantalla / elemento | Problema | Evidencia | Recomendación | Sev. | Esf. |
|---|---|---|---|---|---|---|
| IA-01 | `#side` + `#home` + `#panel-queue` | Tres listados de canciones con buscador y filtros propios (tres `input.song-search`, tres grupos `[data-filters]`). En 1440 px se ven dos a la vez (lista lateral + Explorar) y hasta tres con el panel. | `player-1440x900-13-explore-playing.png`, `x-1440x900-panel-queue.png`. | **Una sola biblioteca**: Explorar es el lugar para buscar y filtrar. La barra lateral izquierda deja de ser una lista de canciones y pasa a ser navegación de biblioteca (ver §3). El panel "Canciones y conciertos" desaparece: sus pestañas "Conciertos" y "Mis videos" se vuelven secciones de la barra lateral/Explorar. | Alto | M |
| IA-02 | `.view-tabs` (Video · Luces · Explorar) | Mezcla dos ejes: **modo de escenario** (Video/Luces, sobre la canción actual) y **navegación** (Explorar, una página). Al inicio "Video" está seleccionada mientras se ve Explorar. | `player-1440x900-03-home.png`, `player-390x844-03-home.png`. | Separar: Explorar sale de las pestañas y vive en la navegación (barra lateral en escritorio, barra inferior en móvil). Video/Luces queda como un segmento junto al escenario, visible solo cuando hay canción. | Alto | M |
| IA-03 | Menú "Más" `#menu-more` | 7 ítems de naturaleza distinta: navegación (Explorar, Conciertos y Mis videos), preferencia de reproducción (Seguir al terminar), juego (Reto), sistema (Ajustes, Pantalla completa) y feedback. "Explorar" duplica la pestaña. | `player-1440x900-05-more.png`, `player-390x844-05-more.png`. | Reubicar cada ítem (tabla en §3.4). "Más" queda con 3–4 acciones de sistema. | Medio | S |
| IA-04 | Menú de canción `#song-menu` | No hay "Ver detalles", "Abrir en YouTube" ni "Compartir" (el enlace `?song=` ya existe). "Ir al artista" usa un ícono de micrófono. | `x-1440x900-song-menu.png`. | Añadir "Compartir canción" (copia `?song=<id>`) y "Ver en YouTube ↗" (canal oficial), y "Detalles" que abre el panel derecho de §3.2. | Medio | S |
| IA-05 | Landing · navegación móvil | En < 720 px el único enlace de la cabecera es **GitHub**: la acción principal (abrir el reproductor) no está en la cabecera, y en 844×390 "GitHub" se sale del borde. | `landing-live-390x844-s00.png`, `s-landing-844x390-0.png`. | Cabecera móvil: marca + botón "Abrir app" (`.nav-cta`, ya existe en CSS). GitHub va al pie. En horizontal, colapsar los enlaces. | Alto | S |
| IA-06 | Descubribilidad: Conectar | Conectar está en 3 lugares en escritorio (pill superior, botón del inicio, guía) y en el dock en móvil; bien. Pero el botón del inicio queda tapado por la guía en la primera visita (`player-1440x900-01-firstrun.png`, `player-768x1024-01-firstrun.png`) y desaparece en móvil. | — | Mantener la pill superior como único Conectar en escritorio y el botón del dock en móvil; el inicio puede mostrar el **estado** del lightstick ("Sin conectar · Conectar") en vez de un segundo CTA. | Medio | S |
| IA-07 | Descubribilidad: Concierto, Letra, Reto, guía | "Concierto" (cámara/micrófono) es potente pero su nombre no dice qué hace; el Reto solo está en Más y en la tecla B; la guía solo desde el panel Bluetooth. | `player-1440x900-06-live.png`, `x-1440x900-live-menu-lights.png`. | Renombrar "Concierto" por **"Modo en vivo"** con subtítulo en el menú; mostrar el Reto como estante en Explorar ("Pon a prueba tu ritmo"); enlace "¿Cómo conecto?" bajo la pill de Conectar cuando no hay lightstick. | Medio | S |
| IA-08 | `#btn-start` "Ver canciones" (inicio) | Abre el panel "Canciones y conciertos", otra lista más, en lugar de llevar a la biblioteca que ya está en pantalla. | `player-1440x900-03-home.png`. | Que haga foco en el buscador de Explorar o que desaparezca (la grilla ya está debajo). | Bajo | S |

### 2.3 Jerarquía visual, espaciado, tipografía, componentes y estados

| ID | Pantalla / elemento | Problema | Evidencia | Recomendación | Sev. | Esf. |
|---|---|---|---|---|---|---|
| V-01 | Reproductor · densidad general | Cada vista combina haces, público animado, neblina, viñeta, grano, glow por canción, degradados en títulos, rótulos coreanos y chips de colores. Todo compite; el contenido (portadas) pierde. | `player-1440x900-03-home.png`, `player-1440x900-13-explore-playing.png`. | Regla "el escenario es para Video/Luces": en Explorar, atenuar el escenario al 30–40 % (`.app.home .crowd-canvas { opacity: .35 }`, sin haces). Un solo título con degradado por pantalla. | Medio | S |
| V-02 | Escala tipográfica | Títulos de estante en Unbounded 28 px + eyebrow + subtítulo + rótulo de 59 px: cuatro niveles para un estante. Nombres de canción 13–14 px en grilla. | `player-1440x900-03b-home-scroll.png`. | Escala de 5 pasos (12 / 14 / 16 / 20 / 28, y 40 para el hero). Estante = eyebrow opcional + título 20 px. Nombres de canción 15 px / 600. | Bajo | S |
| V-03 | Grilla de estantes | En 1440 px con lista lateral abierta caben 5 tarjetas y la sexta baja sola ("Yet To Come" huérfana en `player-1440x900-13-explore-playing.png`). En 768 se ven 3+3+2. | — | Estantes en **una fila con scroll horizontal** (como en móvil) y "Ver todo" a la derecha; o `grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))` con filas completas y "Ver más". | Medio | S |
| V-04 | Lista lateral · filtros y buscador | En 360 px de ancho de barra, los chips se cortan ("BTS 155" pegado al borde, el resto oculto sin indicio de scroll) y el placeholder se trunca ("Busca canción, álbum, año o inte"). | `player-1440x900-04-video.png`. | Con la barra rediseñada (§3) desaparece. Si se mantiene: placeholder corto ("Buscar"), chips con degradado de borde que indique scroll. | Bajo | S |
| V-05 | Dock · posición | El dock cambia de ancho y de posición según la vista (centrado y más estrecho en Explorar, a la derecha de la barra en Video). | `player-1440x900-13-explore-playing.png` vs `player-1440x900-04-video.png`. | Dock de ancho completo y fijo en todas las vistas (como Spotify/YouTube Music): memoria espacial. | Medio | S |
| V-06 | Ícono de intensidad de luces (globo con rayos) | Tres variantes de un glifo de 16 px en amarillo, junto al corazón y ⋯: parece "bombilla/idea" o "sol". Su significado solo está en el nombre accesible ("luces intensas"). | `player-1440x900-04-video.png` (lista lateral), `x-1440x900-song-menu.png`. | Medidor de 3 barras (▁▃▆) o 1–3 puntos con etiqueta en tooltip y en la leyenda de Explorar ("Luces: suaves · medias · intensas"). Color neutro (`--text-2`), no amarillo, para no confundirlo con un estado activo. | Medio | S |
| V-07 | Estados de carga | El video muestra un recuadro negro mientras carga YouTube; la cola y los estantes no tienen esqueleto. | `player-768x1024-04-video.png`, `player-1440x900-05-more.png`. | Miniatura del video (ya se carga `i.ytimg.com`) como póster con spinner, esqueletos de tarjeta en estantes. | Bajo | S |
| V-08 | Estados duplicados | "En pausa" aparece dos veces en Luces (chip superior + rótulo bajo el globo). | `player-1440x900-09-lights.png`. | Ocultar `#style-chip` en la vista Luces, o usar el rótulo para la sección de la canción ("Coro") y el chip para el estado. | Bajo | S |
| V-09 | Interruptores en menú | El interruptor "Seguir al terminar" se ve como un ítem más; los de "Concierto" parecen deshabilitados (gris). | `player-1440x900-05-more.png`, `x-1440x900-live-menu-lights.png`. | Estado apagado con borde de 1.5 px `--text-2` (contraste de UI ≥ 3:1) y texto de estado ("No" / "Sí") para lectores. | Bajo | S |
| V-10 | `styles.css` | 105 KB con bloques que se sobrescriben (`.np-title` definido en las líneas 406, 1069, 1295, 1310 y 1554; `.filter-chip` en 1091 y 1530; `.explore-head` en 1372 y 1552). Es la causa probable de regresiones como UI-01 y L-07. | — | Consolidar por componente (una regla base y sus variantes) antes de añadir el tema claro. | Medio | M |

### 2.4 Interacción y feedback

| ID | Pantalla / elemento | Problema | Evidencia | Recomendación | Sev. | Esf. |
|---|---|---|---|---|---|---|
| UI-01 | Panel Cola `#panel-cola` | Ver resumen #1. Además en móvil la hoja deja un hueco vacío de ~300 px arriba y las filas no tienen título. | `x-1440x900-cola-settled.png`, `x-390x844-cola-settled.png`, `player-390x844-07-cola.png`. | Revisar `#cola-body` (grid): cada `.cq-sec` en su fila (`grid-auto-rows: min-content`, sin `grid-area` compartida), el estado vacío dentro de su sección y no posicionado. Probar con 0, 1 y 20 canciones en la cola. | Crítico | M |
| UI-02 | Primera visita | Guía (4 pasos, flotante, con narración) → al omitirla, recorrido de 7 globos → sugerencias. Son **11 pantallas** antes de escuchar algo, y la guía tapa el CTA de Conectar del inicio. | `player-1440x900-01-firstrun.png`, `player-1440x900-02-tour1.png`, `player-390x844-01-firstrun.png`. | **Valor primero:** la primera visita muestra Explorar con una sola tarjeta "¿Tienes un ARMY Bomb? Conectar · Ahora no" (que abre la guía solo si dice que sí). El recorrido baja a 3 globos (Conectar, Letra/Modo en vivo, Cola) y aparece **después** de la primera canción, no antes. | Alto | M |
| UI-03 | Recorrido · paso 1 | Señala "Canciones" (lista lateral) cuando ya está abierta, y en móvil señala Explorar con el anillo recortado en el borde. Texto "Busca con la tecla /." no aplica en táctil. | `player-1440x900-02-tour1.png`, `player-390x844-02-tour1.png`. | Elegir el objetivo según el estado; texto según el dispositivo (tecla / solo con `pointer: fine`). | Medio | S |
| UI-04 | Mini reproductor (reproductor) | Al ir a Explorar con una canción sonando, el mini reproductor de 360×250 tapa la grilla y, en móvil, se apila sobre el dock: juntos ocupan **~420 px de 844**. | `player-1440x900-13-explore-playing.png`, `x-390x844-explore-mini.png`. | En móvil, sin mini video: el dock ya es el mini reproductor (miniatura en `#np-art`, toque para volver). En escritorio, mini de 280 px de ancho, anclado sobre el dock a la derecha, con "Ocultar video" y arrastre (ya existe el `.mini-grip`). | Alto | S |
| UI-05 | Toasts `#toast` | Aparecen arriba al centro, sobre las pestañas ("Letra oculta." tapa la pestaña Luces; "Tu cola sigue aquí" tapa el video). | `player-390x844-09-lights.png`, `s-player-844x390-home.png`. | En móvil, encima del dock (zona del pulgar, no tapa navegación); en escritorio, abajo a la izquierda. Máximo uno a la vez; los de acción ("Deshacer") 6 s. | Medio | S |
| UI-06 | Teclado: orden de foco | Desde "Conectar" el Tab entra en el iframe de YouTube (`#yt`, 7 tabulaciones internas sin foco visible propio) antes de llegar al dock. | Orden registrado: `skip → Inicio → Canciones → Video → Conectar → #yt ×7 → Aleatorio → …`. | Poner el dock antes del escenario en el orden de foco (o `tabindex="-1"` en el iframe cuando no está en vista Video) y añadir enlace de salto "Saltar al video". El enlace "Saltar a los controles" existe (bien). | Medio | S |
| UI-07 | Panel "Canciones y conciertos" | Los chips de filtro se pintan vacíos (solo el contorno). | `x-1440x900-panel-queue.png` (y ≈ 560). | Se resuelve con IA-01 (el panel desaparece). | Medio | S |
| UI-08 | Áreas táctiles | Ver resumen #9. Con ratón todo supera 24 px (WCAG 2.5.8 AA), pero la regla del proyecto es 44 px y no todos los controles tienen el refuerzo de `pointer: coarse` (pestañas 36, Inicio 34×38, ⋯ de tarjeta de estante 36). | `player-report-*.json` (`*-targets`). | Token `--tap: 44px` aplicado a `.seg button`, `.menu-item`, `.more-btn`, `.like-btn`, `.filter-chip` en `(pointer: coarse)`; espacio entre corazón y ⋯ ≥ 8 px. | Medio | S |
| UI-09 | Alcance del pulgar (móvil) | Lo frecuente está abajo (dock, bien), pero las pestañas Video/Luces/Explorar y la búsqueda están arriba, en la zona difícil. | `player-390x844-03-home.png`. | Barra inferior de 4 destinos en móvil (Inicio · Explorar · Biblioteca · Ahora suena) con el dock compacto encima (patrón de §3.5). Video/Luces como gesto (deslizar sobre el escenario) y segmento dentro de "Ahora suena". | Medio | L |
| UI-10 | Gestos | No hay gesto para cambiar de canción ni para abrir "Ahora suena" desde el dock; arrastrar en la cola existe (y tiene alternativa de teclado Alt+↑/↓, bien). | — | Deslizar el dock hacia arriba abre "Ahora suena"; deslizar el título a los lados = anterior/siguiente. Siempre con botón equivalente (WCAG 2.5.1). | Bajo | M |
| UI-11 | Lectores de pantalla | Landmarks correctos (1 `main`, `nav` "Menú principal" y "Reproductor"). Pero el dock es un `nav` (es una región de controles: mejor `section aria-label="Reproductor"`), `#chant` usa `aria-live="assertive"` (interrumpe en cada fanchant) y los menús son `role="group"` sin gestión de flechas. | `player-report-1440x900.json` (`landmarks`). | Dock como `region`; fanchant con `polite`; menús con patrón `menu`/`menuitem` y navegación con flechas, o mantener botones y no anunciar `aria-haspopup="true"`. | Medio | S |
| UI-12 | Movimiento reducido y modo seguro | Bien resuelto: con `prefers-reduced-motion` la landing congela cámara, balanceo y la intro; el reproductor fuerza el modo seguro; desactivarlo pide confirmación (`#dlg-safe`). | `x-landing-390-reduced.png`. | Añadir el control visible "Reducir movimiento" en Ajustes (no todos conocen la opción del sistema) y respetar `prefers-reduced-transparency` (paneles opacos). | Bajo | S |
| UI-13 | Tema | Solo hay tema oscuro publicado; en la copia local ya hay un tema claro en curso (`:root[data-theme="light"]` y `#btn-theme`). | — | Ver §4. | Medio | M |

### 2.5 Percepción de rendimiento

| ID | Pantalla / elemento | Problema | Evidencia | Recomendación | Sev. | Esf. |
|---|---|---|---|---|---|---|
| P-01 | Landing · YouTube al cargar | La landing crea el iframe de YouTube y arranca la intro muda en la carga (`startIntro({ muted: true })`): descarga cientos de KB, muestra anuncios y compite con la escena 3D en el hilo principal. | Tareas largas registradas: 2, la mayor de **878 ms** (GPU por software: en un teléfono real será menor, pero el patrón importa). `landing-live-1440x900-s01.png` (anuncio "Patrocinado"). | Fachada ligera: miniatura + botón "▶ Escuchar la intro"; el iframe se crea solo al tocar. | Alto | S |
| P-02 | Landing · escena 3D en teléfonos | three.js + bloom + miles de partículas sin niveles de calidad (no se consulta `hardwareConcurrency`, `deviceMemory` ni `saveData`; solo se limita el `pixelRatio` a 1.5). | `src/landing.js` línea 32. | Tres niveles: alto (bloom + partículas), medio (sin bloom, 40 % de partículas), bajo (imagen estática WebP). Elegir por `deviceMemory ≤ 4`, `saveData`, FPS medido en los primeros 2 s. | Medio | M |
| P-03 | Reproductor · capas del escenario | Canvas del público + 5 haces con `mix-blend-mode` + neblina + viñeta + grano `overlay` animan siempre, también en Explorar (donde no aportan). 250 recursos al cargar el reproductor (miniaturas). | `extra` (`res: 250`). | Pausar el canvas del público fuera de Video/Luces; `loading="lazy"` y `decoding="async"` en miniaturas fuera de pantalla; `content-visibility: auto` en estantes. | Medio | S |
| P-04 | Estabilidad | CLS **0** en landing y reproductor (bien). Pero el contenido salta visualmente: el dock cambia de ancho entre vistas (V-05) y la cabecera de Explorar es pegajosa con un hueco transparente bajo los chips por donde se ve el contenido (`player-1440x900-03b-home-scroll.png`). | — | Dock fijo; `.explore-head` con fondo opaco hasta su borde inferior. | Bajo | S |
| P-05 | Parpadeo de paneles | Paneles y hojas se capturan a medio animar 700 ms después de abrir (la cola y la hoja de móvil). | `player-390x844-07-cola.png`. | Duración de entrada ≤ 200 ms, solo `transform`/`opacity`; sin animar `height`. | Bajo | S |

### 2.6 Contenido, microcopy y honestidad

| ID | Dónde | Problema | Recomendación | Sev. | Esf. |
|---|---|---|---|---|---|
| C-01 | Landing (todo) | Concordancias mezcladas: "Tu lightstick… míralo" (masculino), "Libérala… vinculada" y "La lightstick 3D" (femenino), "Con varias lightsticks". `docs/copy.md` decide **el** lightstick. | "Libéralo: si está vinculado a otro celular o app, desconéctalo"; "El lightstick 3D es una ilustración"; "Con varios lightsticks". | Medio | S |
| C-02 | Landing | "computador" (hero, paso 1) frente a "computadora" (guía del reproductor); "teléfono" frente a "celular". | "celular" y "computadora" en todo el sitio, como manda `docs/copy.md`. | Bajo | S |
| C-03 | Landing | "con **el** intro, el coro y el puente" (Videos + luces) frente a "Escuchar **la** intro". | Unificar en "la intro". | Bajo | S |
| C-04 | Landing · hero | "Entrar a la experiencia" no dice qué abre. | "Abrir el reproductor" o "Elegir una canción". | Medio | S |
| C-05 | Landing · hero | Indicadores "**0** instalaciones · **0** cuentas · **100%** en tu navegador": el "0" en grande se lee como métrica de uso ("nadie la instaló"). | "Sin instalar · Sin cuentas · Todo en tu navegador" con íconos de check. | Medio | S |
| C-06 | Landing · mini reproductor | "La canción de BTS más escuchada de 2026 en Spotify": afirmación factual sin fuente, y además se reproduce un video con anuncios. | Quitar la afirmación o enlazar la fuente; "Canción destacada" es honesto y suficiente. | Medio | S |
| C-07 | Landing · anatomía | "Pasa el cursor o el foco por una tarjeta…" no aplica en táctil; "Ilustración inspirada" es ambiguo; "Su radio Bluetooth conecta con Web Bluetooth" es jerga. | "Toca una pieza para verla"; "Ilustración propia inspirada en el ARMY Bomb (no es el diseño oficial)"; "Se conecta desde el navegador, sin instalar nada". | Bajo | S |
| C-08 | Privacidad | "Sin cookies propias, sin analítica y **sin publicidad**", pero los videos de YouTube muestran anuncios (se ven en la landing). | "Sin cookies, analítica ni publicidad propias. YouTube puede mostrar anuncios en sus videos." | Medio | S |
| C-09 | Reproductor | "Conciertos y Mis videos" (menú) abre "Canciones y conciertos" (panel): el nombre del destino no coincide con el del botón. | Con IA-01 se separan en "Conciertos" y "Mis videos". | Bajo | S |
| C-10 | Reproductor · Concierto | "¿Dónde es el concierto?" + "En el estadio / En la TV" es claro, pero el botón del dock dice solo "Concierto", que se confunde con "Conciertos" (películas de pago). | "Modo en vivo" en el dock; el panel de películas se llama "Películas de concierto". | Medio | S |
| C-11 | Reproductor · estantes | "¿Primera vez? Empieza por un clásico." aparece siempre, también a quien ya escuchó 50 canciones. | Mostrarlo solo sin historial; después, "Para empezar" → "Clásicos". | Bajo | S |
| C-12 | Reproductor · cola vacía | "Usa ⋯ en una canción para sumarla." depende de un ícono. | "Toca ⋯ en una canción y elige Agregar a la cola." | Bajo | S |
| C-13 | Reproductor · reto | "Red social: X / Twitter" para un nickname que se publica en un ranking: invita a dar el usuario real. | "Nickname (no uses tu nombre real)" y quitar el selector de red social o explicar para qué sirve. | Medio | S |

Ortografía: no se encontraron faltas en los textos visibles; los problemas son de consistencia (C-01 a C-03).

### 2.7 Donaciones

Hoy `DONATIONS` en `src/config.js` tiene la URL vacía y el bloque "Apoya el proyecto" vive al fondo de Ajustes, donde
casi nadie llega. Propuesta **sutil, de fan para fan y nunca en medio de una canción**:

1. **"Créditos" al final de un álbum o de la cola** (el momento natural de agradecer, como los créditos de una
   película): tarjeta pequeña en la cola terminada: "Esta app la hace una ARMY en su tiempo libre.
   ¿Le invitas un café? 💜 · Ahora no". Máximo una vez cada 30 días y nunca en la primera semana de uso.
2. **Ítem fijo y discreto en la barra lateral**, al pie, junto a "Opinar" y "GitHub": "💜 Apoyar".
   Sin contador, sin metas, sin ventanas emergentes.
3. **Agradecimiento al conectar por primera vez** (después del "¡Conectado! Borahae 💜"), no un pedido: un enlace de
   texto en el toast de 6 s "Apoyar el proyecto".
4. En la landing, en el pie: "Gratis y sin anuncios propios. Si te gusta, apóyala" con enlace.

Evitar: banners, ventanas emergentes, la palabra "donar" en botones grandes, recordatorios repetidos, poner la
donación en el dock o entre la persona y la música.

---

## 3. Propuesta de estructura del reproductor

### 3.1 Escritorio (≥ 1100 px): tres columnas + dock

```
┌───────────────┬──────────────────────────────────────────┬────────────────────┐
│ BARRA IZQ.    │ CABECERA: buscador global · Conectar ●   │ AHORA SUENA        │
│ (biblioteca)  ├──────────────────────────────────────────┤ (panel derecho,    │
│               │                                          │  plegable)         │
│ ⌂ Inicio      │   CONTENIDO                              │                    │
│ ⌕ Explorar    │   · Inicio/Explorar: estantes y grilla   │ [miniatura]        │
│               │   · Video: escenario + video             │ Dynamite           │
│ TU BIBLIOTECA │   · Luces: globo + simulación            │ BTS · BE · 2020    │
│ ♡ Me gusta    │   [Video | Luces] sobre el escenario     │ MV oficial         │
│ ▣ Mis álbumes │                                          │ Luces: ▁▃▆ intensas│
│ ≡ Cola    (3) │                                          │ ▶ Canal oficial ↗  │
│ ▶ Mis videos  │                                          │ Letra: subtítulos  │
│ 🎬 Películas  │                                          │ ─────────────────  │
│   de concierto│                                          │ Integrantes        │
│               │                                          │ Relacionadas (3)   │
│ JUGAR         │                                          │ Más del álbum      │
│ 🏆 Reto       │                                          │                    │
│               │                                          │                    │
│ ─────────     │                                          │                    │
│ ⚙ Ajustes     │                                          │                    │
│ ? Guía        │                                          │                    │
│ 💬 Opinar     │                                          │                    │
│ 💜 Apoyar     │                                          │                    │
├───────────────┴──────────────────────────────────────────┴────────────────────┤
│ DOCK (ancho completo, fijo): ● Dynamite · BE  ⤮ ⏮ ▶ ⏭ ↻  ──●──── 1:02/3:43   │
│                              Letra · Modo en vivo · Cola · ⛶ · ⋯              │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Barra izquierda (biblioteca) y derecha (Ahora suena)

**Izquierda (240 px, plegable a 72 px solo íconos):**

| Sección | Ítems | Notas |
|---|---|---|
| Navegación | Inicio · Explorar | Inicio = estantes personalizados; Explorar = buscador + filtros por integrante + álbumes. Reemplaza la lista de canciones actual y la pestaña Explorar. |
| Tu biblioteca | Me gusta · Mis álbumes · Cola (con contador) · Mis videos · Películas de concierto | Cada ítem abre su vista en el contenido; la Cola puede abrir el panel derecho en la pestaña "Cola". |
| Jugar | Reto de ritmo | Con la mejor puntuación local como subtítulo. |
| Pie | Ajustes · Guía de conexión · Opinar · Apoyar · Tema (☾/☀) | Lo terciario, siempre en el mismo lugar. |

**Derecha "Ahora suena" (320 px, plegable; se abre sola la primera vez que suena algo):**

- Miniatura grande, título, **artista o integrante** (enlace a su filtro), **álbum** (enlace), **año**.
- **Tipo de video** (MV, En vivo, Coreografía, Performance, Con letra) como etiqueta.
- **Intensidad de luces** con el medidor de 3 barras y el **estilo actual** ("Automático · ahora: Coro").
- **Letra:** estado (subtítulos oficiales en coreano / video con letra / enlace a Genius ↗).
- **Canal oficial ↗** (HYBE LABELS, BANGTANTV…): refuerza la honestidad del proyecto.
- **Pestañas:** Detalles · Cola · Relacionadas (3–6 canciones del mismo álbum/integrante/energía; hoy es
  `#upnext`, que aparece flotando sobre el video cerca del final).
- **Lightstick:** estado de conexión, nombre del dispositivo y brillo rápido.

Entre 768 y 1099 px: la barra izquierda pasa a íconos (72 px) y "Ahora suena" se abre como hoja sobre el contenido.

### 3.3 Dock

- Izquierda: miniatura (toque = abre "Ahora suena"), título y subtítulo **sin máscara** si caben, ♡.
- Centro: aleatorio · anterior · reproducir · siguiente · repetir, y debajo la barra de tiempo (área de 36 px, ya existe).
- Derecha: **Letra** · **Modo en vivo** · **Cola** · pantalla completa · ⋯ (solo en ≥ 1100 px con etiquetas; en tablet
  con etiqueta corta visible bajo el ícono, nunca íconos solos como hoy en 768×1024 y 844×390).

### 3.4 Dónde va cada ítem del menú "Más"

| Ítem actual | Nuevo lugar | Por qué |
|---|---|---|
| Explorar | Barra izquierda (escritorio) / barra inferior (móvil). Se quita de Más. | Es navegación y ya está duplicado. |
| Conciertos y Mis videos | Dos ítems de biblioteca: "Películas de concierto" y "Mis videos". | Son colecciones, no acciones. |
| Seguir al terminar | Panel "Cola" (interruptor en su cabecera, junto a Aleatorio/Repetir) y Ajustes › Reproducción. | Es una regla de la cola. |
| Reto de ritmo | Barra izquierda › Jugar; estante en Inicio; tecla B. | Es una actividad, merece visibilidad. |
| Ajustes | Pie de la barra izquierda; en móvil, ícono de engranaje en la cabecera de Biblioteca. | Lugar estable y esperado. |
| Dar mi opinión | Pie de la barra izquierda y al final de Ajustes. | Terciario, pero encontrable. |
| Pantalla completa | Botón ⛶ en el dock y doble toque en el escenario (tecla F). | Es una acción de reproducción. |
| (nuevo) Compartir canción, Ver en YouTube, Detalles | Menú ⋯ de la canción y panel "Ahora suena". | Faltan hoy (IA-04). |

Con esto, "⋯" del dock queda para acciones de **la canción actual** (Compartir, Ver en YouTube, Ir al álbum,
Ir al artista, Agregar a Me gusta), coherente con el ⋯ de cada fila.

### 3.5 Móvil (< 768 px)

```
┌──────────────────────────┐
│ Cabecera: título · ● BT  │  (punto de estado; toque = panel Bluetooth)
│                          │
│ CONTENIDO (scroll)       │
│                          │
├──────────────────────────┤
│ Mini dock: ▣ Dynamite ▶ ⏭│  (toque = "Ahora suena" a pantalla completa)
├──────────────────────────┤
│ ⌂ Inicio ⌕ Explorar ♡ Biblioteca ◉ Conectar │  (barra inferior, 4 destinos, 56 px)
└──────────────────────────┘
```

"Ahora suena" a pantalla completa (deslizar hacia arriba): video o Luces (segmento), controles completos, barra de
tiempo, y debajo Letra · Modo en vivo · Cola · Detalles. Así el contenido recupera los ~175 px que hoy ocupa el dock
de dos niveles (`player-360x740-03-home.png`) y no se apila un mini video encima (UI-04).

---

## 4. Tema claro: tokens y alternancia

La copia local ya trae un tema claro (`:root[data-theme="light"]`, líneas 1684+ de `styles.css`) con valores muy
cercanos a esta propuesta; se validan aquí y se completan. Contraste calculado con la fórmula WCAG.

| Token | Claro | Sobre `#ffffff` | Sobre `--bg #f6f2fc` | Sobre `--surface-2 #ede6f8` | Uso |
|---|---|---|---|---|---|
| `--bg` | `#f6f2fc` | — | — | — | Fondo de página (lila muy claro, no blanco puro) |
| `--surface-1` | `#ffffff` | — | — | — | Tarjetas, dock, barra lateral |
| `--surface-2` | `#ede6f8` | — | — | — | Hover, campos, filas activas |
| `--text` | `#1b1430` | **17.66** | **16.00** | **14.52** | Texto principal |
| `--text-2` | `#463d5c` | **10.08** | **9.14** | **8.30** | Secundario |
| `--muted` | `#5f5675` | **6.83** | **6.19** | **5.62** | Metadatos, placeholder |
| `--accent` | `#6b3fd1` | **6.45** | **5.84** | — | Enlaces, estado activo |
| `--accent-strong` | `#5a2fc0` | **8.07** | — | — | Hover de acento, texto pequeño de acento |
| `--accent-ink` | `#ffffff` sobre `#6b3fd1` | **6.45** | — | — | Texto de botón primario |
| `--focus` | `#b0166f` | — | **5.96** | — | Anillo de foco 2 px |
| `--success` | `#0f7a4a` | **5.38** | — | — | Conectado |
| `--error` | `#b3243b` | **6.50** | — | — | Errores |
| `--warn-text` / `--warn-bg` | `#5c3d00` / `#fff3d1` | **8.95** (entre sí) | — | — | Avisos |
| `--border-strong` | `#8f86a3` | **3.44** | — | — | Bordes de campos y chips (UI ≥ 3:1) |
| `--live` | `#c2187a` | **5.67** | — | — | Fanchant, "en vivo" |
| `--info` | `#1d5f9e` | **6.60** | — | — | Estante "Con letra" |

Referencia oscura (vigente, sobre `--surface-solid #15122a`): `--text` 16.33, `--text-2` 11.26, `--muted` 6.95
(5.43 sobre una hoja aclarada por un haz, `#2e2643`), `--accent #b58cff` 7.08, `--accent-ink` sobre acento 7.45.

**Reglas para el tema claro:**
- El **escenario** (haces, público, neblina) no se invierte: en claro se ve como un "estadio de día": público en
  siluetas lila (`#cbbfe6`) al 50 %, sin haces aditivos (`mix-blend-mode: normal`), sin grano.
- La vista **Luces** y el modo pantalla-lightstick **siempre en oscuro** (es una fuente de luz).
- El color por canción (`--song-accent`) en claro se oscurece con `color-mix(in oklab, var(--song-accent) 55%, #1b1430)`
  y se valida en tiempo de ejecución (si < 4.5:1 sobre `#fff`, cae a `--accent`). Lo mismo en oscuro para el
  dorado/amarillo de Butter y similares (resumen #10).
- Sombras en vez de brillos: `--e-1: 0 1px 2px rgba(40,20,80,.08), 0 4px 12px -4px rgba(40,20,80,.14)`.

**Alternancia (UX):**
- Tres estados: **Sistema** (por defecto, sigue `prefers-color-scheme`) · Claro · Oscuro. Se guarda en
  `localStorage` (`pws.theme`) y se aplica en `<head>` antes de pintar para evitar el destello.
- Ubicación: control segmentado en **Ajustes › Apariencia** (lugar canónico) y atajo en el pie de la barra izquierda
  (ícono ☀/☾ con `aria-label="Tema: sistema"`). En móvil, solo en Ajustes. No en la cabecera: compite con Conectar.
- La landing respeta el tema del sistema pero mantiene la escena 3D oscura (es parte de la experiencia); solo las
  secciones de texto y la privacidad pasan a claro.

---

## 5. Hoja de ruta priorizada

### Ahora (1–2 semanas, casi todo S)
1. Arreglar el panel Cola (UI-01, L-08).
2. Landing: mini reproductor con fachada, sin autoarranque, cerrado por defecto en móvil y horizontal (resumen #2, P-01).
3. Cabecera de la landing con fondo al hacer scroll y CTA "Abrir app" en móvil (L-01, IA-05).
4. Velos y sombras de texto en los puntos medidos (L-02, L-03 como mínimo con opacidad del modelo, L-05, L-11).
5. Quitar la máscara permanente del título del dock (L-07) y los contadores con opacidad (L-06).
6. Pestañas: no marcar "Video" en Inicio; que "Explorar" quepa en 360 px (IA-02 parcial).
7. Toasts encima del dock en móvil (UI-05).
8. Microcopy y honestidad: C-01 a C-06, C-08 (un solo PR de textos).
9. Áreas táctiles a 44 px con `pointer: coarse` (UI-08).

### Siguiente (3–6 semanas, M)
1. Nueva arquitectura: barra izquierda de biblioteca, panel "Ahora suena", dock fijo de ancho completo, reubicación de
   "Más" (§3, IA-01, IA-03, V-05).
2. Primera visita "valor primero" y recorrido de 3 pasos tras la primera canción (UI-02, UI-03).
3. Acento por canción con validación de contraste y estados de color fijos (resumen #10).
4. Tema claro con Sistema/Claro/Oscuro (§4), después de consolidar `styles.css` (V-10).
5. Ícono de intensidad de luces como medidor + leyenda (V-06).
6. Niveles de calidad de la escena 3D y pausa del canvas del público fuera de Video/Luces (P-02, P-03).
7. Orden de foco y semántica (UI-06, UI-11).

### Después (L)
1. Navegación inferior móvil + "Ahora suena" a pantalla completa con gestos (UI-09, UI-10, §3.5).
2. Estantes en una fila con "Ver todo" y vistas de álbum/integrante dedicadas (V-03).
3. Donaciones con el patrón de "créditos" (§2.7).
4. Pruebas con personas: 5 ARMY con ARMY Bomb real (Android + iPhone con Bluefy) y 2 con lector de pantalla
   (TalkBack, NVDA), midiendo tiempo hasta la primera canción con luces.

---

## Anexo: capturas citadas

Carpeta: `C:\Users\USUARIO\AppData\Local\Temp\claude\93853b72d935e70d\fce09ad3-0074-4131-a865-3fe976c120e3\scratchpad\audit\`

- Landing: `landing-live-1440x900-s00…s07.png`, `landing-live-390x844-s00…s08.png`, `s-landing-1280x800-*.png`,
  `s-landing-844x390-*.png`, `s-landing-768x1024-*.png`, `s-landing-360x740-*.png`, `x-landing-390-reduced.png`.
- Reproductor (por tamaño `1440x900`, `768x1024`, `390x844`, `360x740`): `player-<tamaño>-01-firstrun.png`,
  `-01b-guide2`, `-02-tour1`, `-02b-tour2`, `-02c-tour3`, `-03-home`, `-03b-home-scroll`, `-04-video`, `-05-more`,
  `-06-live`, `-07-cola`, `-08-lyrics`, `-09-lights`, `-10-bt`, `-11-settings`, `-12-side`, `-13-explore-playing`;
  `player-1440x900-14-focus.png`; `s-player-1280x800-*.png`, `s-player-844x390-*.png`.
- Estados extra: `x-<1440x900|390x844>-cola-settled.png`, `-explore-mini`, `-song-menu`, `-live-menu-lights`, `-game`,
  `-feedback`, `-panel-queue`; `x-privacy-390.png`, `x-privacy-1440.png`.
- Datos: `landing-live-contrast.json`, `player-report-1440x900.json`, `player-report-390x844.json`,
  `player-report-768x1024_360x740.json`.
