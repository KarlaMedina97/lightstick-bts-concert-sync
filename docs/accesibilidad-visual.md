# Accesibilidad para personas con discapacidad visual · Purple Wave Sync

Fecha: 2026-11-05. Alcance: `player/index.html` (reproductor), `index.html` (landing 3D) y su JS/CSS.
Método: lectura del código fuente actual (no se ejecutó con lectores de pantalla reales; ver la lista de
verificación). Otra sesión está cambiando el dock, el mini reproductor y las miniaturas: los números de línea pueden
moverse, por eso cada hallazgo cita **archivo + función o selector**.

Este documento distingue dos grupos con necesidades distintas (a veces opuestas):

- **Ciegas (lector de pantalla):** NVDA o JAWS en Windows, VoiceOver en macOS e iOS, TalkBack en Android. Navegan
  por encabezados, regiones y controles; dependen del nombre accesible, del foco y de los avisos hablados. Pueden
  oír la música, así que el audio es su canal principal: **cada aviso hablado compite con la canción**.
  En iPhone, Web Bluetooth solo funciona en **Bluefy** (WebKit + VoiceOver); en Safari la app funciona sin conectar.
- **Baja visión:** zoom del navegador al 200–400 %, lupa del sistema (Lupa de Windows, Zoom de macOS/iOS),
  texto grande, alto contraste / colores forzados (Windows), daltonismo y sensibilidad a la luz. Ven parte de la
  pantalla, usan ratón o tacto y casi nunca un lector de pantalla completo.

Lo que ayuda a uno puede estorbar al otro (un aviso hablado de cada cambio de luz es útil para quien no ve, pero
ruido para quien usa lupa). Por eso varias propuestas son **opcionales y apagadas por defecto**.

---

## 1. Resumen de prioridades

| ID | Prioridad | Para | Barrera | Arreglo (resumen) | Esfuerzo |
|---|---|---|---|---|---|
| A-01 | **P0** | Ciegas | Al cambiar de canción (Siguiente, final automático, cola) no se anuncia qué suena. | Región viva única `#sr-status` y aviso "Ahora suena: título, álbum" en `loadIndex()`. | S |
| A-02 | **P0** | Ciegas | Avisos que hablan solos durante la música: `#style-chip` (`aria-live`) cambia en cada sección; el `aria-valuetext` del `#timeline` se reescribe a ~20 fps. | Quitar `aria-live` del chip; no tocar `aria-valuetext` mientras el slider tiene foco salvo tras una tecla. Narración de luces opcional (A-15). | S |
| A-03 | **P0** | Ambos | Avisos poco fiables: `#toast` y `#g-connected` pasan de `hidden` a visibles a la vez que cambian su texto (muchos lectores no lo leen). | Regiones vivas siempre presentes en el DOM; mostrar/ocultar solo con CSS; vaciar y reescribir. | S |
| A-04 | **P0** | Ciegas | Conexión Bluetooth sin estado hablado claro: botón "Conectando…" sin aviso, selector nativo sin indicaciones, desconexión solo en un aviso emergente. | Estado en `#sr-status` + sonido corto (A-14) para buscando / conectado / error / desconectado; texto de ayuda para el selector y Bluefy. | M |
| A-05 | **P0** | Ciegas | En teléfono, los paneles (`.panel[role=dialog]`) y el cajón de la biblioteca tapan la pantalla, pero lo de atrás sigue en el árbol accesible: con gestos de VoiceOver/TalkBack se sale del panel sin darse cuenta. | `inert` en el resto de `#app` mientras un panel ocupa la pantalla (o `<dialog>.showModal()`), `aria-modal="true"` solo en ese caso. | M |
| A-06 | **P0** | Baja visión | Sin estilos para **colores forzados**: el foco de los campos (`outline: none` + `box-shadow`) desaparece; los estados `aria-pressed` / `aria-selected` y los interruptores se pintan solo con fondo. | Bloque `@media (forced-colors: active)` en `styles.css`, `landing.css` y `tour.css`. | M |
| A-07 | **P0** | Ciegas | Reto de ritmo inutilizable sin ver: el resultado de cada toque (`#g-judge`) tiene `aria-hidden`, y `#tap-pad` escucha `pointerdown`/`keydown` pero no `click` (la activación de NVDA en modo exploración, VoiceOver y TalkBack llega como `click`). | Sonidos distintos por resultado (A-14) + vibración; `click` como respaldo; resumen hablado al final. | M |
| A-08 | **P1** | Ciegas | Semántica de menús inconsistente: `aria-haspopup="true"` (= menú) en `#np-open`, `#btn-live` y `.more-btn`, pero los menús son `role=group` y `#np-side` es un panel. | Patrón *disclosure* (solo `aria-expanded`) o *menu button* completo del APG; elegir uno por control. | S |
| A-09 | **P1** | Ambos | Media Session incompleta: solo `nexttrack`/`previoustrack`; sin play/pausa, posición ni estado. Los controles del sistema, la pantalla bloqueada y los auriculares no sirven bien. | `play`, `pause`, `seekto`, `seekbackward`, `seekforward`, `playbackState`, `setPositionState()`; probar cómo convive con el iframe de YouTube. | S |
| A-10 | **P1** | Ciegas | Atajos de una tecla (`N`, `P`, `B`, `F`, Espacio) en `document` sin forma de apagarlos (WCAG 2.1.4); chocan con la navegación rápida de VoiceOver (QuickNav por letras) y con NVDA en modo foco. | Ajuste "Atajos de una tecla" (encendido por defecto) + atajos con modificador; listarlos en un lugar encontrable. | S |
| A-11 | **P1** | Ciegas | El iframe de YouTube: título genérico, interfaz y subtítulos siempre en el idioma del navegador, foco que se queda dentro sin salida evidente. | `title` propio en `getIframe()`, `hl` y `cc_lang_pref` según `lang`; botón "Volver a los controles" accesible y atajo documentado. | S |
| A-12 | **P1** | Baja visión | Zoom 400 % / 320 px: el dock fijo, el mini reproductor flotante, el aviso de apoyo y el toast tapan el contenido y el foco (WCAG 2.4.11). | `scroll-padding-bottom` según la altura del dock; en `max-height: 500px` dock compacto; mini anclado y no flotante con zoom alto. | M |
| A-13 | **P1** | Ambos | Interruptores que cambian su nombre **y** su `aria-pressed` (`#mini-size`, `#btn-shuffle` "Aleatorio: sí", `#side-rail`, `#g-voice`): se oye "Agrandar video, presionado". | Nombre fijo + `aria-pressed`, o nombre cambiante sin `aria-pressed`, nunca los dos. | S |
| A-14 | **P1** | Ciegas (que oyen) | No hay señales de audio para estados importantes; todo es visual o texto. | Módulo `src/earcons.js` (Web Audio, sin archivos) con 5–6 sonidos cortos, volumen propio y opción para apagarlos. | M |
| A-15 | **P1** | Ciegas (que oyen) | El color y la sección de las luces solo se ven (`#big-bulb`, `#sim`, segmentos del `#timeline`). | Botón/atajo "¿Cómo están las luces?" que dice color en palabras + sección; modo opcional "Describir luces" (tipo audiodescripción). | M |
| A-16 | **P1** | Ciegas | Fanchant: `#chant-name` muestra hangul sin `lang="ko"`, y `#chant` es región viva mientras `speechSynthesis` dice lo mismo en coreano: dos voces a la vez. | `lang="ko"` en el nombre; sin `aria-live` cuando la voz está activa; un único aviso "Fanchant" al empezar. | S |
| A-17 | **P1** | Baja visión | Contraste variable: superficies de vidrio translúcido (`--surface-0/1`) sobre `--glow`, que cambia con cada canción; bordes de campos al 9 % de blanco (WCAG 1.4.11). | `@media (prefers-contrast: more)` con superficies opacas y bordes ≥ 3:1; probar con cada paleta de álbum. | M |
| A-18 | **P1** | Baja visión | Sensibilidad a la luz: vista Luces a brillo pleno, fondo con haces y degradados animados, cambios de color en toda la interfaz (`--glow`). | Ajuste "Interfaz tranquila": sin `--glow` en la interfaz, brillo de pantalla limitado en Luces, sin haces; respetar `prefers-reduced-transparency`. | M |
| A-19 | **P1** | Ciegas | Guía de conexión: la narración (`speechSynthesis`) habla encima del lector de pantalla; `#guide-text` es región viva **y** se narra. | Avisar en el botón de narración; si la narración está activa, la región viva calla; pasos con lista de comprobación. | S |
| A-20 | **P2** | Ciegas | Estructura: en las vistas Video y Luces no hay `h1`; el dock es `nav` aunque son controles; Luces no tiene encabezado. | `h1` visualmente oculto fijo; `h2` por vista; dock como `section`/`region`. | S |
| A-21 | **P2** | Baja visión | Tooltip propio: desaparece al pasar el ratón sobre él (WCAG 1.4.13) y enlaza `aria-describedby` antes de tener texto. | Mantenerlo al pasar sobre el tooltip; escribir el texto antes de enlazarlo. | S |
| A-22 | **P2** | Ciegas | Landing 3D: las tarjetas de piezas y versiones son botones cuyo único efecto es visual; los pasos `li.step` tienen `tabindex="0"` sin acción. | Tarjetas como texto (o botón que anuncia algo útil); quitar `tabindex` de los pasos. | S |
| A-23 | **P2** | Ciegas (que oyen) | Modo concierto con cámara: apuntar a un ARMY Bomb es solo visual (`#cam-status` no cambia). | Tono cuya altura sigue `cam.strength` + aviso "Color detectado: rosa". Cuidado con el micrófono activo. | M |
| A-24 | **P2** | Ambos | Arrastres sin alternativa de un solo puntero (WCAG 2.5.7): cola (`.cq-handle`, solo Alt+↑/↓ con teclado) y mini reproductor. | Botones "Subir"/"Bajar" en el menú de cada fila; menú "Mover a esquina…". | S |
| A-25 | **P2** | Baja visión | Espaciado de texto (WCAG 1.4.12) y textos que se cortan (`white-space: nowrap`, alturas fijas, título del dock con desvanecido). | Probar el marcador de espaciado; usar `min-height` en vez de `height`. | S |
| A-26 | **P2** | Ambos | Sin pruebas automáticas de accesibilidad. | axe-core solo en desarrollo + pruebas estáticas en `tests/markup.test.js`. | S |

---

## 2. Hallazgos y propuestas en detalle

### 2.1 Avisos hablados (regiones vivas)

**Situación actual**

| Elemento | Qué hace | Problema |
|---|---|---|
| `#toast` (`role=status`, `aria-live=polite`) | `toast()` y `toastAction()` en `src/app.js` cambian el texto **y** quitan `hidden` a la vez | Una región que entra al árbol accesible con el texto ya puesto a menudo no se anuncia (Chrome+NVDA y VoiceOver iOS son los menos fiables). Además, el botón "Deshacer" de `toastAction()` desaparece a los 6 s: con lector de pantalla es difícil llegar a tiempo (WCAG 2.2.1). |
| `#style-chip` (`aria-live=polite`) | `frame()` lo reescribe cada vez que cambia la sección: "Luces: Ola · Coro" | Habla solo durante la canción, varias veces por minuto; tapa la música y se mezcla con lo que la persona esté leyendo. |
| `#timeline` (`role=slider`) | `frame()` reescribe `aria-valuenow`/`aria-valuetext` a ~20 fps | Con el foco en el slider, NVDA y JAWS leen el cambio de valor cada segundo ("1:23 de 3:45", "1:24 de 3:45"…). |
| `#guide-text` (`aria-live`) + narración | `Guide.go()` cambia el texto y además `speak()` | Dos voces si la narración está activa. |
| `#g-connected` (`role=status`) | `showStatus()` quita `hidden` y cambia el texto a la vez | Mismo problema que el toast. |
| `#chant` (`aria-live`) | Cambia cada ~0,7 s con nombres en hangul | Muy hablador y en el idioma equivocado (ver 2.9). |
| `#cq-live` (`.sr`, `aria-live`) | `announce()` al mover elementos de la cola | Bien hecho: siempre presente y visualmente oculto. Es el modelo a seguir. |
| `.tour` (`role=dialog` + `aria-live`) | Cada paso cambia el texto y mueve el foco a "Siguiente" | El foco ya anuncia el diálogo; la región viva lo duplica. |

**Propuesta (A-01, A-02, A-03)**

1. Un anunciador central en `src/app.js` (o un módulo pequeño `src/announce.js`):
   - Dos regiones **siempre presentes** y visualmente ocultas en `player/index.html`: `#sr-polite`
     (`role="status"`) y `#sr-assertive` (`role="alert"`, solo para errores que bloquean, p. ej. "Bluetooth no
     disponible").
   - `say(msg, { assertive = false })`: vacía la región, espera un cuadro (`requestAnimationFrame` o `setTimeout`
     de ~50 ms) y escribe el texto. Así se repite aunque sea el mismo mensaje.
   - Antirrebote: si llegan varios mensajes en 300 ms, se dice solo el último (p. ej. al pulsar Siguiente tres veces).
   - Mejora progresiva con `ariaNotify()` cuando exista (`document.ariaNotify?.(msg)` o
     `element.ariaNotify?.(msg)`), con la región viva como respaldo. Hoy su disponibilidad es limitada (Firefox
     reciente; Chrome/Edge con despliegue incierto), así que **la región viva es la vía principal**.
   - Como el texto pasa por la capa de idioma (`MutationObserver` de `src/i18n.js`), conviene escribir ya el texto
     traducido con `t()` para que nunca se oiga primero el español y luego el inglés (verificar en NVDA con la app
     en inglés).
2. `toast()`/`toastAction()`: el elemento `#toast` deja de usar `hidden` para mostrarse (clase `.show` con
   `opacity`/`transform`) y el texto se manda además a `say()`. Para `toastAction()` con "Deshacer": duración
   mínima de 10 s y que se pause mientras el foco o el puntero estén dentro; añadir "Deshacer" también en el lugar
   donde se hizo la acción (p. ej. en `#cq-user`).
3. **Ahora suena (A-01):** en `loadIndex()` decir "Ahora suena: {título}, {álbum o canal}" (con antirrebote). En
   `onPlayerState()` decir "En pausa" / "Reproduciendo" **solo** si el cambio no lo provocó un botón que ya cambia
   de nombre con foco (el botón `#btn-play` ya cambia a "Pausar"); sí cuando lo provoca YouTube (fin de anuncio,
   error, buffering largo > 3 s: "Cargando…").
4. **`#style-chip` (A-02):** quitar `aria-live`. Su contenido queda disponible al navegar, y el modo opcional de
   A-15 decide si se habla.
5. **`#timeline` (A-02):** en `frame()`, si `document.activeElement === tl`, no actualizar `aria-valuetext`
   (sí la parte visual). En el `keydown` de `bindTimeline()`, tras `seek`, actualizar una vez con el tiempo nuevo.
   Este es el patrón del ejemplo "Media Seek Slider" del APG. Añadir la sección al texto:
   `"1:23 de 3:45, coro"`.

### 2.2 Estructura, regiones y encabezados (A-20)

- `player/index.html` tiene `header`, `main`, `aside#side`, `nav#dock` y paneles `section[role=dialog]`. Está bien,
  pero:
  - Solo hay un `h1` (`#home-title`) y vive dentro de `#home`, que se oculta en la vista Video. En Video y Luces la
    página no tiene `h1`. Propuesta: `h1.sr` fijo "Purple Wave Sync · Reproductor" al principio de `main`, y
    `#home-title` pasa a `h2`. Añadir un `h2.sr` "Luces" dentro de `#lights-view` y otro "Video" en `#video-view`.
  - `#dock` es `nav aria-label="Reproductor"`: son controles, no navegación. Mejor `section aria-label="Controles
    del reproductor"` (los lectores lo listan como región). El enlace de salto `.skip` puede seguir apuntando ahí;
    añadir un segundo enlace "Saltar al contenido" (`#main`).
  - `#home` está enlazado como panel de la pestaña "Explorar" (`aria-controls="home"`) pero no tiene
    `role="tabpanel"`; mientras se explora, el panel del video sigue visible como mini reproductor. Las tres vistas
    funcionan más como *navegación* que como pestañas: valorar `nav` con `aria-current="page"` en vez de
    `tablist` (menos teclas que aprender). Si se mantienen pestañas, completar `role="tabpanel"` y
    `aria-labelledby`.
- Landing (`index.html`): buena base (`main#contenido`, secciones con `aria-labelledby`, títulos partidos con
  `.sr-only` en `splitHeading()`, `canvas` con `aria-hidden`). Ver 2.11.

### 2.3 Foco: paneles, cajón, menús, recorrido, guía y mini reproductor

**Paneles (A-05).** `showPanel()` mueve el foco al botón `.close` y `closePanel()` lo devuelve al disparador:
bien. Pero:

- En escritorio el panel es lateral y no modal: correcto no atrapar el foco. En teléfono (`max-width: 640px`) y en el
  cajón de tablet (`drawerMode()`), el panel o la biblioteca cubren la pantalla: ahí debe comportarse como modal.
  Implementación: en `showPanel()`, si `matchMedia("(max-width: 640px)").matches`, poner `inert` en los hermanos
  de primer nivel dentro de `#app` (`header`, `main`, `#dock`, `#side`…) y `aria-modal="true"` en el panel; quitarlo
  en `closePanel()`. Lo mismo en `setSide(true)` cuando es cajón.
  Alternativa: convertir los paneles en `<dialog>` y usar `showModal()` en teléfono y `show()` en escritorio
  (`#dlg-safe` ya lo usa). `inert` evita reescribir el HTML.
- El foco inicial en "Cerrar" hace que lo primero que se oye sea "Cerrar, botón". Mejor enfocar el `h2` del panel
  (`tabindex="-1"`) para que se lea el título y luego el contenido; el diálogo ya tiene `aria-labelledby`.
- El cierre al tocar fuera (`pointerdown` en `bindPanels()`) no devuelve el foco (`closePanel(false)`): si el foco
  estaba dentro, queda en `body`. Devolverlo al disparador cuando `panel.contains(document.activeElement)`.

**Menús (A-08).**

- `#btn-live` → `#menu-live` (`role=group`), `.more-btn` → `#song-menu` (`role=group`) y `#np-open` → `#np-side`
  (panel) usan `aria-haspopup="true"`, que los lectores anuncian como "menú" o "submenú". O se completa el patrón
  *Menu Button* del APG (`role=menu` / `menuitem` / `menuitemcheckbox` con `aria-checked` en vez de `aria-pressed`,
  foco itinerante, Inicio/Fin, cerrar con Tab), o se usa *Disclosure* (quitar `aria-haspopup`, dejar
  `aria-expanded` + `aria-controls`). Recomendación: **disclosure** para `#np-open` (abre un panel) y `#btn-live`
  (dos interruptores); **menu** solo para `#song-menu` (lista de acciones). `#m-nav-menu` (`src/mobile-nav.js`) ya
  sigue el patrón de menú casi completo: falta que los `menuitem` tengan `tabindex="-1"` (hoy todos son
  tabulables) y que el texto "Ver" (`p[role=presentation]`) sea un grupo (`role="group" aria-label="Ver"`).
- `#menu-live` y `#song-menu` sí manejan Esc, flechas y devuelven el foco: bien.

**Recorrido (`src/tour.js`).** `role=dialog` con `aria-live`: quitar `aria-live` y enlazar `aria-describedby` a
`.tour-text` para que, al enfocar "Siguiente", se lea título + texto una sola vez. Para lector de pantalla el
recorrido aporta poco ("señala" controles visualmente): añadir al texto dónde está el control ("en los controles
del reproductor, botón Letra"). Esc ya lo cierra.

**Guía (`src/guide.js`).** `open()` enfoca `#guide-title`: bien. Problemas: `minimize()` (Esc o "–") oculta la guía
y el foco se pierde (queda en un elemento oculto); moverlo a `#coach-pill`. `close()` tampoco devuelve el foco
(debe volver a `#btn-guide` o al disparador). El botón "–" tiene nombre "Minimizar guía": bien; el 🔈/🔊 de
`#g-voice` tiene nombre propio pero cambia nombre y `aria-pressed` a la vez (A-13).

**Mini reproductor.** `hideMini()` manda el foco a `#btn-play`: bien. `#btn-min` → mini: verificar que el foco
no quede en un botón que desaparece (mueve el foco al `#mini-back` o anuncia "Video minimizado"). La sesión que
edita el mini reproductor debería conservar: botones del mini en el orden de lectura justo después del video, y
nombres estables.

### 2.4 Teclado y atajos (A-10)

- Atajos globales en `init()` (`document.addEventListener("keydown", …)`): Espacio, N, P, B, F. Se ignoran si el
  foco está en un campo, botón o slider; con foco en `body` funcionan.
- WCAG 2.1.4 exige poder apagarlos, cambiarlos o que solo funcionen con foco en el componente. Propuesta: ajuste
  "Atajos de una tecla" en `#panel-settings` (guardado en `settings.shortcuts`), y equivalentes con modificador
  que funcionen siempre, p. ej. `Alt+Shift+N/P/K` (comprobar que no choquen con NVDA, que usa Insert/Bloq Mayús, ni
  con JAWS).
- Lectores de pantalla: en modo exploración NVDA/JAWS se quedan con las letras (N, P, B, F son navegación rápida),
  así que los atajos no llegan; en modo foco o con VoiceOver de Mac sin QuickNav, sí. Documentar en la ayuda:
  "Con lector de pantalla, usa los botones del reproductor o las teclas multimedia del teclado" (que funcionan
  gracias a Media Session, A-09).
- La lista de atajos está escondida al final de Ajustes (`.shortcuts`). Ponerla también en un botón "Atajos de
  teclado" (diálogo) o en `aria-keyshortcuts` de cada botón (`#btn-play` → `aria-keyshortcuts="Space"`,
  `#btn-next` → `"N"`…).
- `#timeline`: añadir `End` (al final) y un número de 0–9 para saltar al 0–90 % (opcional).
- Cola: Alt+↑/↓ está bien (anuncia con `announce()`); falta la alternativa para puntero (A-24).

### 2.5 Media Session (A-09)

`updateMediaSession()` pone metadatos y `nexttrack`/`previoustrack`. Faltan:

```js
navigator.mediaSession.setActionHandler("play", () => player.play());
navigator.mediaSession.setActionHandler("pause", () => player.pause());
navigator.mediaSession.setActionHandler("seekbackward", (d) => player.seek(Math.max(0, player.time() - (d.seekOffset ?? 10))));
navigator.mediaSession.setActionHandler("seekforward", (d) => player.seek(player.time() + (d.seekOffset ?? 10)));
navigator.mediaSession.setActionHandler("seekto", (d) => player.seek(d.seekTime));
// en onPlayerState(): playbackState = "playing" | "paused"; y cada ~5 s:
navigator.mediaSession.setPositionState?.({ duration: player.duration(), position: player.time(), playbackRate: 1 });
```

- Cada `setActionHandler` en `try/catch` (navegadores que no conocen la acción lanzan error).
- Artwork: añadir una imagen cuadrada (`icons/icon-512.png`) además de la miniatura de 320×180 (iOS y Android
  recortan).
- `album`: incluir la sección de luces no; mantener metadatos limpios ("título · BTS · álbum").
- **Riesgo a verificar:** el audio sale del iframe de YouTube (otro origen). Chrome asocia la sesión al marco que
  reproduce; puede que los controles del sistema muestren los datos de YouTube y que nuestros manejadores no se
  llamen. Probar en Chrome Android (notificación), Chrome Windows (botón multimedia del teclado), Bluefy iOS
  (pantalla bloqueada). Si YouTube gana, documentarlo y no prometer la función.
- Para personas ciegas es muy útil: pausar o pasar de canción con los auriculares o la pantalla bloqueada sin
  buscar el botón.

### 2.6 Iframe de YouTube y subtítulos (A-11)

- `src/player.js` `init()`: tras `onReady`, `this.yt.getIframe().title = t("Video de YouTube: ") + título` y
  actualizarlo en `load()` (hoy queda el título que ponga la API, a menudo genérico). Aceptar el título desde
  `app.js` (`player.load(id, autoplay, { title })`).
- `playerVars`: añadir `hl: lang` (idioma de la interfaz de YouTube), `cc_lang_pref: settings.lyricsLang` y
  `iv_load_policy: 3`. `modestbranding` ya no tiene efecto (se puede quitar).
- Dentro del iframe, el teclado es de YouTube (K, J, L, C para subtítulos). Tab sale del iframe hacia el siguiente
  control (no hay trampa), pero la persona puede no saber que está "dentro". Propuesta: un texto visualmente oculto
  antes del iframe: "Reproductor de YouTube. Los controles de Purple Wave están después del video" y un enlace
  "Saltar el video" que lleve a `#dock`.
- Subtítulos: para quien oye, los subtítulos no son la barrera; sí lo son para baja visión (tamaño). `setOption(
  "captions", "fontSize", 1)` fija un tamaño; ofrecer un ajuste "Tamaño de la letra" (−1…3) que use ese valor.
- La pista de pronunciación y la barra `#lyrics-bar` ya explican en texto qué se muestra: bien.

### 2.7 Bluetooth y selector de dispositivos (A-04)

- Flujo actual: `onConnect()` cambia el texto del botón a "Conectando…", abre el selector nativo
  (`requestStick()`), y avisa con `toast()` al conectar o fallar; la desconexión (`gattserverdisconnected`) solo
  hace `toast()`.
- El **selector nativo** de Chrome (escritorio y Android) es accesible con lector de pantalla, pero aparece como
  ventana del navegador, fuera de la página: NVDA anuncia un diálogo nuevo; TalkBack lo lee como lista. En
  **Bluefy** el selector es propio de la app (probar con VoiceOver: si no es accesible, documentarlo). Los nombres
  ("BBOMB-1A2B", "BTS LIGHTSTICK3") se deletrean: en la guía, decir "busca el que empieza con B-BOMB o BTS
  LIGHTSTICK".
- Propuesta:
  - Antes de abrir el selector: `say("Se abrirá la lista de dispositivos del navegador. Elige el que empiece con
    BTS LIGHTSTICK o BBOMB.")` (y lo mismo como texto visible bajo `#btn-connect` con `aria-describedby`).
  - Durante: `aria-busy` en `#panel-bt` y aviso "Buscando…".
  - Resultado: "Conectado: ARMY Bomb Ver. 4, batería 80 %" / "No se conectó. Revisa que parpadee." / "Se
    desconectó {nombre}" con `say()` **asertivo** para la desconexión inesperada (la persona no ve que sus luces
    se apagaron) + sonido (A-14) + `navigator.vibrate?.([60, 40, 60])` en Android.
  - `#btn-bt` ya cambia su nombre a "1 conectado. Administrar ARMY Bomb": bien (empieza por el texto visible).
  - La lista `#stick-list` no dice el color actual: el punto `.dot` tiene solo fondo. Añadir texto oculto con el
    color en palabras si se activa A-15.
  - `showBtWarning("ios")` usa `innerHTML` con una constante (no datos de usuario); el aviso es claro. Ponerle
    `role="note"` o enlazarlo con `aria-describedby` desde `#btn-connect` (que está desactivado: un botón
    desactivado sin explicación es una barrera común).
- iPhone: en Safari no hay Web Bluetooth. Con VoiceOver, la guía debe decir **al inicio** del paso 1 que hace falta
  Bluefy (hoy está en el texto del paso 1: bien) y la app podría detectar Bluefy por agente de usuario solo para
  ocultar el aviso.

### 2.8 Reto de ritmo (A-07)

Una persona ciega que oye puede jugar de oído: el reto no depende de ver. Hoy falla por detalles:

- `#tap-pad`: solo `pointerdown` y `keydown`. NVDA/JAWS en modo exploración, VoiceOver (doble toque) y TalkBack
  activan con `click`. Añadir `click` y descartar el `click` que sigue a un `pointerdown` (marca de tiempo < 500 ms).
- Latencia: el doble toque de VoiceOver/TalkBack añade retraso variable; sugerir en la ayuda el gesto de paso
  directo (VoiceOver: "toque directo" en el rotor, o doble toque mantenido) o un teclado físico (B o Espacio con
  foco en el botón).
- `#g-judge` tiene `aria-hidden="true"`: correcto **no** anunciar cada toque (sería un aviso por tiempo, imposible
  de seguir), pero hace falta otro canal: sonido corto por resultado (Perfecto = nota aguda, Genial = media,
  Bien = grave, Fuera = ruido corto), y vibración en Android. Ajuste "Sonidos del reto" (encendido si se juega).
- Al terminar (`finishChallenge()`), `say("Reto terminado: 12 400 puntos, 86 % de precisión, combo 22.
  Puesto 3 en esta canción.")`.
- Puntos/combo (`.score-row`): al navegar se leen bien ("Puntos 0"). Envolver en `dl` o dar
  `aria-live="off"` explícito.
- Tabla de ranking: `caption`, `th[scope]`: bien. Las medallas 🥇🥈🥉 se leen como "medalla de oro…": añadir
  texto oculto con el número ("1").

### 2.9 Idioma y textos en coreano (A-16)

- `<html lang>` cambia con `applyMeta()` de `src/i18n.js`: bien. Los botones de idioma llevan `lang` del idioma
  destino: bien.
- Hangul: `.shelf-ko` y las marquesinas tienen `aria-hidden` (decorativo): bien. En la landing, los `.ko` tienen
  `lang="ko"`: bien.
- `#chant-name` (fanchant) **no** tiene `lang="ko"`: el lector lo leerá con voz española (silencio, deletreo o
  "carácter coreano"). Añadir `lang="ko"` en el HTML; `#chant-roman` ya es legible.
- Con "Con voz y aplausos" activado, `Fanchant.run()` dice el nombre con `speechSynthesis` y la región viva lo
  repite: quitar `aria-live` de `#chant` y, en su lugar, `say("Fanchant: los nombres de los integrantes")` al
  empezar. Sin voz, anunciar solo el inicio y el final (no cada nombre cada 0,7 s).
- Títulos de canciones en inglés dentro de una página en español: son nombres propios (exentos de WCAG 3.1.2). No
  hace falta marcar `lang` en cada título.
- La traducción por `MutationObserver` también toca `aria-label` y `aria-valuetext`: bien. Verificar que los
  avisos que se escriben y se traducen en el mismo tick no se lean dos veces (ver 2.1).

### 2.10 Colores, contraste, colores forzados y luz (A-06, A-17, A-18)

**Información solo con color (WCAG 1.4.1)**

- Glifo de intensidad (`lightGlyph()`): distingue por forma (halo/rayos), y el nombre accesible de cada canción
  incluye "luces suaves/medias/intensas" (`songLabel()`): bien.
- Segmentos del `#timeline` (`renderTimeline()`): solo color, sin texto. Son decorativos, pero cuentan la
  estructura de la canción. Exponerla en `aria-valuetext` (2.1) y, para baja visión, separar los segmentos con
  una línea de 2 px del color de fondo.
- Punto `.dot` de cada ARMY Bomb y `#big-bulb`: solo color. Ver A-15.
- Estados `aria-pressed`/`aria-selected` en chips y pestañas: revisar que además del fondo haya borde, peso o
  marca (✓). En colores forzados el fondo se pierde.

**Contraste**

- Los tokens de `styles.css` documentan contrastes altos (texto 16,9:1, secundario 11,6:1, muted 6,9:1, acento
  7,1:1; tema claro 6–9:1). Bien. El riesgo está en:
  - superficies translúcidas (`--surface-0` 62 %, `--surface-1` 80 %) sobre fondo que cambia con `--glow` y la
    paleta de cada álbum (`applySongTheme()` / `src/palette.js`): medir con las paletas más claras (amarillos,
    rosas) en tema claro y oscuro;
  - bordes de campos y chips (`--border` 9 %, `--border-strong` 16 % de blanco): menos de 3:1 contra el fondo
    (WCAG 1.4.11 pide 3:1 para el límite de un control cuando es lo único que lo identifica).
- Propuesta `@media (prefers-contrast: more)`: superficies opacas (`--surface-solid`), `--border-strong` a ≥ 3:1
  (≈ 45 % de blanco en oscuro), sin desenfoque (`backdrop-filter: none`), textos `--muted` → `--text-2`, subrayado
  permanente en enlaces.

**Colores forzados (Windows Contraste alto) — A-06**

No hay ninguna regla `forced-colors`. En ese modo el navegador quita fondos, sombras y degradados. Consecuencias:

- `select/input/textarea:focus-visible { outline: none; box-shadow: … }` → **foco invisible** en campos.
  `input[type=range]:focus-visible { outline: none }` → igual.
- Interruptores `.check.switch` y `#safe-switch` (landing) dibujados con fondo: el estado se pierde.
- Pestañas `.seg`/`.tabs` con indicador `::before` de fondo; chips con fondo de color.
- Íconos SVG con `currentColor`: se ven bien.

Bloque mínimo:

```css
@media (forced-colors: active) {
  :focus-visible, select:focus-visible, input:focus-visible, textarea:focus-visible { outline: 3px solid Highlight; outline-offset: 2px; }
  [aria-pressed="true"], [aria-selected="true"], [aria-checked="true"], [aria-current] { outline: 2px solid Highlight; forced-color-adjust: none; background: Highlight; color: HighlightText; }
  .panel, .dock, .menu-pop, .toast, .tip, .tour, .coach { border: 1px solid CanvasText; }
  .seg-part, .big-bulb, .bulb, .dot { forced-color-adjust: none; } /* el color de la luz es contenido */
}
```

(Repetir lo necesario en `landing.css` y `tour.css`.)

**Sensibilidad a la luz — A-18**

- El modo seguro (≤ 3 destellos/s, WCAG 2.3.1) y `prefers-reduced-motion` ya están (bien; `settings.safeMode` se
  fuerza con movimiento reducido).
- Para fotofobia: la vista Luces pone la pantalla a brillo de color pleno y el fondo de toda la interfaz cambia
  con `--glow`. Ajuste "Interfaz tranquila" (o automático con `prefers-reduced-transparency` y
  `prefers-contrast: more`): `--glow` fijo y oscuro en la interfaz, `.beams`/`.haze` ocultos, `#crowd` estático,
  y un tope de brillo en `#big-bulb` (el brillo de las luces Bluetooth sigue su propio ajuste `#rng-bright`).
- El tema claro existe; en él, la vista Luces sobre blanco puede deslumbrar: probar.

### 2.11 Landing 3D (A-22)

- El `canvas#scene` es decorativo (`aria-hidden`) y todo el contenido existe como texto: bien. El aviso
  `#demo-status` (`role=status`) describe en palabras lo que hace el estadio ("Rosa en el coro: así brillarían…"):
  muy bien, es el modelo para A-15.
- Botones `.part-card` y `.ver-card`: al pulsarlos solo resaltan la pieza 3D (`setHot()`, `pulse()`). Con lector de
  pantalla son botones que "no hacen nada". Opciones: convertirlos en elementos de lista (no interactivos) con su
  texto, o que al pulsarlos actualicen una región `role=status` con una descripción táctil útil ("Dos botones: en
  el mango, uno sobre otro. Con el ARMY Bomb apagado, mantén ambos 2 segundos").
- `li.step` con `tabindex="0"`: añaden paradas de tabulación sin acción. Quitar el `tabindex` y activar el
  resaltado con `:hover` y con el foco del enlace "Ver la guía".
- Desplazamiento con GSAP/ScrollTrigger: con lupa o zoom 400 %, el contenido que aparece con el scroll
  (`.reveal`) debe estar visible sin animación cuando `reduceMotion` (ya se respeta) y también si ScrollTrigger no
  carga. Verificar que con `prefers-reduced-motion` no queda texto con `opacity: 0`.
- `#mini` (canción destacada) en la landing: `#mini-grip` se mueve con flechas (bien). `#fv-bar` es slider con
  `aria-valuetext` "N segundos": aplicar la misma regla de no actualizar con foco (2.1).

### 2.12 Cámara y micrófono (A-23)

- `toggleConcert()` enciende la cámara **y** el micrófono. `#cam-status` (`role=status`) tiene un texto fijo.
- Para una persona ciega que oye, apuntar a un lightstick es posible con sonido: un tono suave cuya altura sube con
  `cam.strength` (0–1) y un aviso hablado cuando se fija un color: "Color detectado: rosa" (máximo uno cada 3 s).
- **Cuidado:** con el micrófono activo (modo concierto y modo TV), cualquier sonido de la app lo capta `MicSync` y
  hace reaccionar las luces. Con micrófono activo: sin earcons (solo vibración y avisos del lector), o volumen muy
  bajo y frecuencias fuera de 40–250 Hz (la banda que usa `MicSync.sample()` para detectar golpes).
- Modo TV (`toggleMic()`): el aviso "🎙 Tus luces siguen la música…" se lee con el emoji ("micrófono de estudio");
  quitar emojis de los textos que van a `say()` o dejarlos solo en la parte visible.

### 2.13 Reflujo, zoom 400 % y foco tapado (A-12, A-25)

- A 1280 px con zoom 400 % el área es 320×~200 CSS px (horizontal). Elementos fijos: `.hud-top`, `#dock`
  (128–148 px en teléfono según la ronda 2 de `docs/ux-audit.md`), mini reproductor flotante, `#toast`,
  `#support-nudge`, `#coach-pill`, `#guide`. Juntos pueden dejar casi nada de contenido visible y **tapar el
  elemento con foco** (WCAG 2.4.11, nuevo en 2.2).
- Propuesta:
  - `scroll-padding-top/bottom` en los contenedores con scroll iguales a la altura de cabecera y dock (variables
    `--hud-h`, `--dock-h`), para que el foco al tabular quede visible.
  - En `@media (max-height: 500px)` (ya existe para horizontal) y con zoom alto: dock en una fila compacta, o no
    fijo (que se desplace con la página), y el mini reproductor anclado al flujo en vez de flotar.
  - El `#guide` (tarjeta sobre el escenario) y el `.tour` deben caber en 320 px de ancho y poder desplazarse.
  - Probar con el marcador de espaciado de texto (WCAG 1.4.12): `.thumb` y botones con alturas fijas,
    `white-space: nowrap` en `.btn` y en el título del dock (`markTitleOverflow()` desvanece el final: con lupa se
    pierde el título; ofrecer el título completo en `#np-side`, que ya existe).
- Áreas táctiles: 36 px con ratón y 44 px con `pointer: coarse` (cumple WCAG 2.5.8 de 24 px y casi siempre la regla
  del proyecto). Excepciones: `.more-btn` y `.like-btn` solo suben la altura (ancho 36 px), `.lb-opt` y
  `.nps-album` 32 px. Con lupa, el tamaño ayuda: llevarlos a 44 px en `coarse`.

### 2.14 Interruptores y nombres (A-13)

| Control | Hoy | Propuesta |
|---|---|---|
| `#mini-size` | `aria-pressed` + nombre "Achicar/Agrandar video" | Nombre fijo "Video pequeño" + `aria-pressed` |
| `#btn-shuffle`, `#cq-shuffle` | `aria-pressed` + "Aleatorio: sí/no" | "Aleatorio" + `aria-pressed` |
| `#btn-repeat`, `#cq-repeat` | `aria-pressed` + etiquetas de 3 estados | Tres estados no caben en `aria-pressed`: quitar `aria-pressed` y dejar el nombre "Repetir: no / todo / una" |
| `#side-rail` | `aria-pressed` + "Contraer/Expandir biblioteca" | `aria-expanded` sobre la biblioteca y nombre fijo "Biblioteca compacta"… o nombre cambiante sin estado |
| `#g-voice` | `aria-pressed` + "Activar/Silenciar narración" | "Narración" + `aria-pressed` |
| `#btn-lyrics`, `#btn-concert`, `#btn-mic` | `aria-pressed` con nombre fijo | Bien |

- `#btn-cola`, `#btn-lyrics`, `#btn-live` tienen `title` que `src/tooltip.js` convierte en `data-tip` +
  `aria-describedby`. Bien, pero el tooltip enlaza `aria-describedby="tip"` antes de escribir el texto (lo escribe
  tras 120–400 ms): el lector puede leer la descripción anterior o vacía. Escribir `text.textContent` en `show()` de
  inmediato y solo retrasar la visibilidad (A-21). Además, el tooltip se oculta al mover el puntero desde el control
  hasta el tooltip (`pointerout`): WCAG 1.4.13 pide poder pasar sobre él (importante con lupa, que agranda y mueve).

### 2.15 Ideas pensadas para personas ciegas que oyen

1. **Sonidos de estado (earcons, A-14).** `src/earcons.js` con Web Audio (osciladores, sin archivos, sin CDN):
   - conectado: dos notas ascendentes; desconectado: dos descendentes; buscando: pulso suave cada 1,5 s mientras
     el selector está abierto; error: nota grave corta; sincronía en marcha (luces siguiendo el video): un "ding"
     al empezar la canción; reto: tonos por resultado (2.8).
   - < 300 ms, volumen propio (ajuste "Sonidos de la app", 0–100 %), **apagados con micrófono activo** (2.12) y
     nunca más de uno por segundo.
   - Útiles también para baja visión (confirmación sin buscar el aviso en pantalla).
2. **Narración de la guía (existe).** Mantenerla apagada por defecto; en el botón, texto de ayuda: "Si usas lector
   de pantalla, no hace falta". Cuando está activa, `#guide-text` sin `aria-live` (2.1). Usar `t()` y la voz del
   idioma (ya lo hace `speak()`).
3. **"¿Cómo están las luces?" (A-15, a demanda).** Botón en el dock o en la vista Luces y atajo (`L` / `Alt+Shift+L`)
   que dice: "Rosa intenso, coro, estilo Ola. 2 ARMY Bomb conectados". Nombres de color: función
   `colorName(rgb)` en `src/palette.js` que elige el más cercano de una lista corta y traducible (morado, violeta,
   rosa, rojo, naranja, dorado, verde, aqua, cielo, azul, blanco) + "tenue/intenso" según el brillo.
4. **Modo "Describir luces" (tipo audiodescripción, opcional, P2 dentro de A-15).** Al cambiar de sección
   (`pattern.sectionAt(t)` en `frame()`), un aviso breve por `say()` ("Coro: dorado y rosa, ola"), con antirrebote
   de 8–10 s y nunca durante los primeros 5 s de la canción. Alternativa sin voz: un tono distinto por estilo de luz
   (`STYLES`). Apagado por defecto.
5. **Media Session completa (A-09):** controlar todo con auriculares y pantalla bloqueada.
6. **Resumen al terminar una canción** (si "Seguir al terminar" está apagado): "Terminó {título}. Siguiente:
   {título}. Pulsa Siguiente para continuar".

---

## 3. Lista de verificación

### 3.1 Automática (solo desarrollo, sin CDN)

- **axe-core:** instalar como `devDependency` (o copiar `axe.min.js` desde `npm pack` a una carpeta de pruebas que
  **no** entra en `sw.js` ni en `vendor/` de producción). Script `scripts/a11y.mjs` que abra
  `http://localhost:5173/player/` y `/` con el navegador del sistema (p. ej. Playwright o Puppeteer como
  `devDependency`, o Edge con CDP como en la auditoría UX) e inyecte axe con reglas `wcag2a, wcag2aa, wcag21aa,
  wcag22aa`. Correr en: inicio, canción sonando, cada panel abierto, guía, recorrido, tema claro, inglés.
- **Pruebas estáticas en `tests/markup.test.js`** (sin navegador):
  - ningún `aria-haspopup="true"` cuyo `aria-controls` no apunte a `role=menu`;
  - todo `[aria-live]`/`role=status|alert` sin `hidden` en el HTML inicial;
  - ningún control con `aria-pressed` cuyo `aria-label` cambie (difícil estáticamente: revisar en el JS con
    búsqueda de `setAttribute("aria-label"` junto a `aria-pressed`);
  - hangul (`/[가-힣]/`) siempre dentro de `[lang=ko]` o `[aria-hidden=true]`;
  - existe `@media (forced-colors: active)` en cada hoja de estilos.
- **Herramientas del navegador:** panel Accesibilidad de Chrome/Edge (árbol y nombre calculado), emulación de
  `prefers-reduced-motion`, `prefers-contrast`, `forced-colors` y deficiencias de visión (Rendering → Emulate vision
  deficiencies). Accessibility Insights for Web (FastPass) como extensión local.

### 3.2 Manual con lector de pantalla

**NVDA + Firefox y NVDA + Chrome (Windows)**

1. Abrir `/player/`. `H`: ¿hay un `h1` en Explorar, Video y Luces? `D`: ¿regiones con nombre útil?
2. Tab hasta una canción, Enter. ¿Se oye "Ahora suena: …" una sola vez? Pulsar Siguiente 3 veces rápido: ¿un solo
   aviso con la última?
3. Dejar sonar 1 minuto sin tocar nada: **no debe hablar** (salvo modo Describir luces activado).
4. Tab al slider de posición: ¿se calla mientras suena? Flecha derecha: ¿dice el tiempo nuevo y la sección?
5. Abrir Ajustes (Tab + Enter): ¿lee el título del panel? Esc: ¿vuelve el foco a "Ajustes"?
6. "Concierto" y ⋯ de una canción: ¿se anuncia como botón desplegable (disclosure) o menú, coherente con lo que
   pasa? Flechas, Esc.
7. Panel Bluetooth → Conectar: ¿avisa que se abre la lista del navegador? En el selector de Chrome, ¿se lee la
   lista? Cancelar: ¿vuelve el foco y se oye el resultado? (Con ARMY Bomb real: conectar y apagarlo: ¿aviso
   asertivo + sonido de desconexión?)
8. Reto de ritmo: activar con nickname, Enter en "¡Toca al ritmo!" en modo exploración: ¿cuenta el toque? ¿Hay
   sonido por resultado? ¿Resumen hablado al final?
9. Cambiar a inglés: repetir 2 y 5; ¿avisos solo en inglés?
10. Atajos: con el ajuste apagado, N/P/B/F no hacen nada; con modo foco, funcionan.

**VoiceOver + Bluefy (iPhone)**

1. Abrir la URL en Bluefy. Deslizar por toda la página: ¿se sale del panel abierto hacia lo de atrás? (no debe).
2. Rotor → Encabezados: ¿navegación útil?
3. Guía: ¿se entiende el paso 1 (Bluefy), el paso 3 (botones) sin ver la animación?
4. Conectar: ¿el selector de Bluefy es legible con VoiceOver? Anotar el resultado en la guía.
5. Bloquear la pantalla con música: ¿los controles de la pantalla bloqueada pausan y pasan de canción?
6. Fanchant: ¿una sola voz? ¿Nombres en coreano con voz coreana?

**TalkBack + Chrome (Android)**

1. Explorar por toque y deslizar: orden de lectura del dock (anterior, reproducir, siguiente, posición, acciones).
2. Paneles a pantalla completa: ¿el foco se queda dentro?
3. Notificación multimedia: play/pausa/siguiente/posición.
4. Reto: doble toque en el pad: ¿cuenta? ¿vibra?

**VoiceOver + Safari (macOS)** sin Bluetooth: pasos 1–6 de NVDA; probar que QuickNav (letras) no dispara atajos.

### 3.3 Manual de baja visión

1. **Zoom 400 %** (Chrome, ventana 1280×1024): sin scroll horizontal en `/` ni `/player/` (salvo el video); el
   foco nunca queda tapado por el dock, el mini, el toast o el aviso de apoyo al tabular por toda la página.
2. **320×256 CSS px** (emulación): abrir cada panel, la guía y el recorrido: ¿se pueden leer y cerrar?
3. **Windows Contraste alto** (Configuración → Accesibilidad → Temas de contraste, "Desierto" y "Acuático"): foco
   visible en campos, sliders, chips y pestañas; estado de interruptores y pestañas visible; luces simuladas
   (`#big-bulb`) con su color.
4. **Texto 200 %** (solo texto, Firefox "Ampliar solo texto"): nada cortado ni superpuesto.
5. **Espaciado de texto** (marcador de WCAG 1.4.12: interlineado 1,5, párrafos 2, letras 0,12, palabras 0,16 em):
   nada se pierde.
6. **Lupa de Windows / Zoom de macOS** siguiendo el foco: los tooltips se pueden recorrer con el puntero sin que
   desaparezcan.
7. **Daltonismo** (emulación protanopia, deuteranopia, tritanopia, acromatopsia): ¿algo depende solo del color?
   (pestañas, chips, estado conectado, segmentos).
8. **`prefers-contrast: more`** y **`prefers-reduced-transparency`** emulados: superficies opacas, bordes visibles.
9. **Fotofobia**: vista Luces en tema claro y oscuro con "Interfaz tranquila"; ¿se puede bajar el brillo de la
   pantalla de luces?
10. **Contraste medido**: repetir la medición de `docs/ux-audit.md` (fondo real) con las 3 paletas de álbum más
    claras en ambos temas.

---

## 4. Fuentes

Normas y patrones

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Entender 4.1.3 Mensajes de estado: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- Entender 2.1.4 Atajos de una tecla: https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html
- Entender 2.4.11 Foco no tapado (mínimo): https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- Entender 1.4.10 Reflujo: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- Entender 1.4.11 Contraste no textual: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- Entender 1.4.12 Espaciado de texto: https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html
- Entender 1.4.13 Contenido al pasar el puntero o con foco: https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html
- Entender 2.5.7 Movimientos de arrastre: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
- Entender 2.5.8 Tamaño del objetivo (mínimo): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Entender 2.3.1 Tres destellos: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html
- Entender 3.1.2 Idioma de las partes: https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html
- WAI-ARIA APG, patrones: https://www.w3.org/WAI/ARIA/apg/patterns/
  - Diálogo modal: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
  - Botón de menú: https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
  - Disclosure: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
  - Pestañas: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
  - Slider de posición de medios: https://www.w3.org/WAI/ARIA/apg/patterns/slider/examples/slider-seek/
  - Interfaz de teclado: https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/

Regiones vivas y notificaciones

- MDN, `aria-live`: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-live
- Scott O'Hara, "Are we live?": https://www.scottohara.me/blog/2022/02/05/are-we-live.html
- Adrian Roselli, "Defining 'Toast' Messages": https://adrianroselli.com/2020/01/defining-toast-messages.html
- Explicación de ARIA Notify (Microsoft Edge): https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/Accessibility/AriaNotify/explainer.md
- Estado de `ariaNotify` (web-features): https://web-platform-dx.github.io/web-features-explorer/features/arianotify/
- Intento de lanzamiento en Chromium: https://groups.google.com/a/chromium.org/g/blink-dev/c/QCtWzIPgcCY

CSS y APIs de la plataforma

- MDN, `forced-colors`: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors
- MDN, `prefers-contrast`: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast
- MDN, `prefers-reduced-transparency`: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency
- MDN, atributo `inert`: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert
- MDN, elemento `<dialog>`: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog
- MDN, Media Session API: https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API
- web.dev, controles multimedia con Media Session: https://web.dev/articles/media-session
- MDN, Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- MDN, Vibration API: https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
- Chrome, Web Bluetooth: https://developer.chrome.com/docs/capabilities/bluetooth
- YouTube IFrame Player API: https://developers.google.com/youtube/iframe_api_reference
- Parámetros del reproductor de YouTube (`hl`, `cc_lang_pref`, `cc_load_policy`): https://developers.google.com/youtube/player_parameters

Lectores de pantalla

- Guía de usuario de NVDA (modo exploración y navegación por letras): https://download.nvaccess.org/documentation/userGuide.html
- Gestos de VoiceOver en iPhone: https://support.apple.com/guide/iphone/learn-voiceover-gestures-iph3e2e2281/ios
- Gestos de TalkBack: https://support.google.com/accessibility/android/answer/6151827

Herramientas

- axe-core: https://github.com/dequelabs/axe-core
- Accessibility Insights for Web: https://accessibilityinsights.io/docs/web/overview/
- Marcador de espaciado de texto (Steve Faulkner): https://www.html5accessibility.com/tests/tsbookmarklet.html
