# Patrones de luz por canción: investigación y guía

Investigación del 2026-11-05 para `src/patterns.js`. Purple Wave Sync no es oficial: nada de esto reproduce los shows de
BIGHIT/HYBE. Sirve para crear patrones **propios** que *recuerden* el ambiente de un concierto. No se copian letras,
cues ni código de terceros.

Leyenda de confianza:

- **Confirmado (fuente)**: lo dice una fuente oficial (ficha de la app, fabricante) o prensa con nombre y fecha.
- **Parcial**: la prensa describe la iluminación del escenario o el ambiente general, pero no el color exacto del ARMY Bomb en esa canción.
- **Afirmación de fans**: viene de TikTok, blogs o sitios de fans. No la usamos como hecho.
- **Propuesta creativa**: diseño nuestro, sin fuente.

---

## Estado de la implementación (2026-11-05)

En `src/patterns.js`:

- **Estilos nuevos:** `flame` (Llamas), `disco`, `split` (Secciones) y `sparkle` (Chispas).
- **`SONG_LOOKS`:** paleta y plan por canción, con todas las filas de la §3. Las variantes heredan el look de su canción por el prefijo del id (por ejemplo, `butter-fallon` usa el de `butter`). Excepciones: `run-bts-*` y `on-the-street`.
- **Brillo por sección:** los coros van a 1 y los versos a 0,75.
- **Cierre «Borahae»:** pasa del color de la canción a morado y después a apagado.
- **Morado de la canción:** en Spring Day, Black Swan y otras, el océano usa el color de la canción en vez del morado.

En `tests/looks.test.js`:

- los ids existen en el catálogo y los planes son válidos;
- en modo seguro ningún look pasa de 3 destellos por segundo;
- las baladas no destellan.

### Personalidad por canción (segunda ronda)

- **Colores del propio video** (`src/videopalette.js`):
  - Se leen la portada y los cuadros que YouTube publica al 25 %, 50 % y 75 % del video, en `i.ytimg.com` con CORS abierto, en un canvas de 32×18.
  - De cada cuadro salen hasta 3 colores vivos; las caras, los grises y las sombras pesan poco.
  - Las secciones toman el color de su momento: intro y verso del cuadro del 25 %, el coro del 50 %, y el puente y el coro final del 75 %.
  - Si el video tiene poco color real (oscuro o en blanco y negro), se usa la paleta curada de la canción o del álbum, sin inventar colores.
  - FIRE conserva su rojo (`lock`).
  - El resultado se guarda en el dispositivo; la imagen no se guarda ni se envía.
- **Intensidad** (`CURVES`): cada sección tiene un nivel de 0 a 1, según sea un momento suave, intenso o culminante. Ese nivel define:
  - el brillo: 0,4 + 0,6 × nivel;
  - la velocidad del latido: cada tiempo, cada 2 o cada 4;
  - la respiración: 4 u 8 tiempos;
  - la ola: cada 2 o cada 4 tiempos;
  - las chispas y el disco, que van más rápido en el clímax.
- **«Canto»:** cada frase de 2 compases, la luz toma aire (sube en medio tiempo y se apaga despacio), como una voz. Es una variación lenta, de menos de 0,5 Hz.
- **Seguridad:**
  - El compás es global, para que no caigan dos golpes juntos al cambiar de sección.
  - El tope del modo seguro es de 2,5 Hz, con margen bajo el límite de 3.
  - `tests/looks.test.js` comprueba todo el catálogo y BPM de 60 a 240.

### Por qué la intensidad no seguía a la música, y qué se hizo (tercera ronda)

| Causa | Arreglo |
| --- | --- |
| La página no puede oír el video: YouTube no deja leer su audio, así que las secciones son porcentajes fijos de la duración. | Modo **«Con el sonido del video»** (menú Concierto): el micrófono escucha los parlantes y ajusta el brillo del patrón con un rango que se adapta solo, con acentos en los graves. El video sigue sonando y nada se graba. Con auriculares no puede oír nada. |
| El compás empezaba en el segundo 0 del video, y casi ningún MV empieza la música ahí. | **«Marcar ritmo»** con la canción sonando: calcula el BPM (mediana de los intervalos) y la **fase** con el reloj del video, y se guarda por canción (`settings.phase`). |
| Los LED responden de forma lineal y el ojo no: un 40 % se veía casi como un 100 %. | **Curva de brillo** (γ = 2) solo en lo que se envía al ARMY Bomb. |
| Un video bloqueado para insertar (Graduation Song, por LatinAutor – UMPG) daba un error genérico. | Se quitó del catálogo. El aviso ahora explica el motivo según el código de YouTube (101/150, 100). Además, la guía para agregar canciones pide probar cada video en el reproductor, porque oEmbed no detecta estos bloqueos. |

### Estudio de bora-waves.com (solo estadísticas, sin copiar datos ni código)

Analicé la secuencia comunitaria más popular de FIRE: «MIC DROP + FYA + FIRE (Arirang World Tour)», de 9:54 y con 1.889 cues. Solo saqué estadísticas agregadas; no guardé tiempos ni colores exactos.

- **Dos capas:** una pista de color sólido (1.151 cues) y otra de efecto, con 725 fundidos y 13 parpadeos. En la práctica, cada golpe es «color encendido + fundido de unos 0,4 s».
- **Densidad por zona:** en la parte tranquila hay unos 2 cambios por segundo, con luces de unos 0,7 s. En el clímax hay de 3,6 a 3,9 cambios por segundo, con luces de 0,1 a 0,4 s.
- **Colores muy pocos y del concepto:**
  - la parte de MIC DROP usa sobre todo verde y blanco (es una sola secuencia de fans, no algo confirmado);
  - la de FIRE usa rojo, naranja y blanco, con algo de amarillo;
  - no aparece ni un fucsia.
- **Casi nunca queda apagado:** hay oscuridad solo entre el 2 % y el 5 % del tiempo.
- **Por qué se siente «soso»:** todo es color plano con fundidos; no hay ola entre varios sticks ni respiración, y la estructura es igual de principio a fin.

**Qué tomamos (sin copiar):**
- Golpes que encienden y se funden rápido (estilo `hit`).
- Pocos colores por canción, siempre del concepto (`onConcept`).
- Luces más largas en lo tranquilo y más cortas en el clímax (`div` por sección).

**Qué hacemos distinto:**
- Oscuridad real entre golpes, que da contraste (en FIRE, más del 10 % del tiempo).
- Explosión blanco → amarillo → rojo → brasa.
- Olas entre varios sticks, «canto» por frase y colores del propio video filtrados por el concepto.
- Golpes reales tomados del micrófono.
- Modo seguro de 2,5 Hz como máximo. Esa secuencia llega a casi 4 cambios por segundo, por encima del límite de WCAG; aquí solo sería posible con el modo seguro apagado.

### Danger y el «casi apagado» (cuarta ronda)

Medí el brillo que realmente le llega al LED, sección por sección. En Danger, el coro final quedaba **100 % apagado** y los coros, entre el 79 % y el 87 % del tiempo casi apagados. Había tres causas, y valían para casi todo el catálogo:

1. **Negro en las paletas:** 29 álbumes tienen un color casi negro (Dark & Wild usa `#111111`), y en un LED eso es «sin luz». Ahora `lightable()` descarta los grises y negros, y lleva los oscuros saturados a brillo pleno con el mismo tono; por ejemplo, el azul marino pasa a azul.
2. **La curva del LED (γ = 2) aplastaba los medios.** Ahora `ledLevel()` aplica la curva **sobre un piso** por sección: piso de energía (0,12 en canciones intensas) + 0,5 × nivel². Solo la sección final puede llegar a negro, porque ahí sí hay una razón musical. En las canciones con explosiones (FIRE) el piso es una brasa tenue, para conservar el contraste.
3. **Golpes demasiado cortos en lo intenso:** en el clímax ahora tienen más cuerpo, salvo las explosiones. La «ola» lleva un pulso suave, para no quedar siempre al máximo y quitarle fuerza al coro.

**Danger:**
- rojo, blanco y rojo claro;
- versos de rap como momentos intensos (golpes);
- curva propia que sube de la intro al coro final.

Resultado del brillo promedio del LED:

| intro | verso (rap) | coro | puente | coro final |
| --- | --- | --- | --- | --- |
| 0,50 | 0,59 | 0,64 | 0,58 | 0,67 |

Nunca queda apagado; los golpes llegan hasta 0,97.

Otras canciones de rap con versos intensos (`rap: true`): Boy In Luv, No More Dream, We Are Bulletproof Pt.2, DOPE, MIC Drop, Not Today, IDOL, ON, Daechwita, Hooligan, 2.0 y FIRE.

Prueba nueva: ninguna canción intensa del catálogo puede quedar «apagada» (por debajo de 0,08) fuera del cierre, y el coro final debe superar a la intro.

**Límite honesto:** la página no escucha el audio. Las partes de la canción siguen siendo porcentajes de la duración, y el carácter de cada canción (rap, coros) viene de conocerla, no de analizar su sonido en vivo. Para seguir la voz y los golpes reales de verdad hay dos herramientas: «Marcar ritmo» y el modo «Con el sonido del video».

### Euphoria: de robótico a orgánico (quinta ronda)

**Por qué se veía robótico:**
- La luz latía en cada tiempo como un metrónomo: subía y bajaba exacto cada 0,57 s.
- El color se quedaba fijo y luego saltaba (rosa → gris → morado).
- El blanco a medio brillo se veía gris apagado.

**Estilos nuevos para canciones soñadoras:**

| Estilo | Qué hace |
| --- | --- |
| `aurora` | Gradiente continuo, sin pausas ni saltos, con un vaivén lento. El brillo suma ondas de periodos que no coinciden (8 tiempos, 5,3 s y 2,9 s), así que nunca se repite igual. |
| `rise` | El pre-coro crece hacia el coro, cada vez más brillante y vivo, con un mínimo de 1,5 s por color. |
| `bloom` | El coro se abre por **compás**, no por tiempo: sube en el 1, tiene un eco suave en el 3 y destellos tenues (como mucho 1 por segundo). |

**Cambios de color:**
- Se mezcla por el círculo de colores, no en línea recta en RGB, para que los intermedios no se vuelvan grises.
- La paleta se recorre de ida y vuelta, así que nunca pasa por colores ajenos (antes aparecía verde entre el durazno y el celeste).
- Las transiciones entre secciones duran 2,2 s y el «canto» es más amplio e irregular (`organic`).

**Euphoria:**
- Celeste, rosa, lavanda y durazno.
- Plan: aurora → subida → florecer en los coros.
- Brillo del LED: verso 0,54, coro 0,76 y coro final 0,80.

Prueba nueva: Euphoria no da saltos de más de 0,03 de luminancia en 50 ms en versos, intro ni puente; no tiene verdes; y los coros brillan más que los versos.

Lo que **no** se puede hacer:

- recrear el modo concierto oficial (textos o imágenes con el público);
- leer el compás real del video.

Las secciones siguen siendo fracciones fijas de la duración.

## 1. Cómo se sincroniza el ARMY Bomb oficial en un concierto

### Confirmado

| Hecho | Fuente |
| --- | --- |
| La app oficial «BTS Official Light Stick» la publica **FANLIGHT Co., Ltd.** Soporta **ARMY Bomb V3 y SE**. El V4 aparece como una app aparte («BTS Official Light Stick Ver.4»). | [App Store](https://apps.apple.com/us/app/id1419937069) |
| Antes del concierto, el fan **registra en la app el asiento de su entrada** (sección, fila y asiento) y lo guarda en el lightstick. El menú de concierto se habilita unos días antes. El día del show se pone el interruptor en **CONCERT MODE**. | App Store (ficha en inglés y coreano) |
| Hay que sentarse en el asiento registrado: «Moving to a different seat may cause different stage appearance». En el recinto hay **cabinas de emparejamiento**. | App Store |
| Para usarlo con el teléfono hay que poner el interruptor en **Bluetooth mode**. En algunos teléfonos también hay que activar el GPS. | App Store |
| FANLIGHT fabrica los lightsticks oficiales de BTS (también los de SHINee, aespa e IVE). Su fundador desarrolló y patentó un «sistema de control inalámbrico» con control por grupos, letras y corazones, sincronizado con las luces del escenario y con las canciones. | [Sports Kyunghyang (EN), 2025-12-10](https://sports.khan.co.kr/en/article/202512101115587) |
| El fabricante describe un **sistema de control central propio** que manda señales en tiempo real a todos los dispositivos. Usa un **mapeo por asiento**, adaptado a cada evento, para controlar asientos sueltos, secciones o el público entero. Sus efectos son: *Animation* (el público funciona como una pantalla), *Spatial* (logos e imágenes), *Text* (texto y números), *Group* (secciones con colores distintos) y *Unifying* (todo el público de un color). | [fanlight.com/technology](https://www.fanlight.com/technology) |

**Cómo se forman las olas, las secciones y las imágenes (deducción razonable, no documentada en detalle):** cada
lightstick sabe en qué asiento está. El controlador central manda un único mensaje, y cada stick calcula su color a
partir de su asiento (o se le asigna un grupo). Así, el público entero funciona como una pantalla de baja resolución.

> **V4 (gira ARIRANG, 2026):** el aviso oficial dice que los efectos se activan solos al encender el ARMY Bomb, **sin
> registrar el asiento**, y que V3/SE no son compatibles con ese control ([Weverse, aviso 40173](https://weverse.io/bts/notice/40173?hl=es)).
> Lo de arriba (registro de asiento, cabinas) describe el sistema de V3/SE.
Las olas son animaciones que se desplazan por las coordenadas de los asientos.

### Sin confirmar

- **Qué radio se usa durante el show** (¿RF propietaria de 2.4 GHz? ¿BLE en difusión?). FANLIGHT dice solo «wireless»,
  sin dar el protocolo ni la latencia. La prensa coreana menciona Bluetooth para el enlace con el teléfono. En un foro, un
  usuario sugiere RF sin pruebas ([WLED forum](https://wled.discourse.group/t/how-can-the-concert-lighting-staff-control-lightsticks-at-kpop-concerts/8648)).
  **No afirmar ninguno de los dos en la app.**
- **Diferencias entre versiones**, según el sitio de fans [BTS 101](https://bts101.info/resources-list/army-bomb-history/):
  - V1 (2015): solo luz blanca.
  - V2 (2017): Bluetooth, encendido y apagado central, solo blanco.
  - V3 (2018): multicolor y sincronización por asiento.
  - MOTS SE (2020): multicolor; se usó en PERMISSION TO DANCE 2021–22.
  - V4 (febrero de 2026): Bluetooth en conciertos, botones, modo «shake» y base iluminada.

  Coincide con la ficha oficial en lo que respecta a V3 y SE. Lo demás es una **afirmación de fans**.
- **Compatibilidad del V3 y el SE con la gira ARIRANG 2026**: los blogs se contradicen (unos dicen que «no sincroniza»,
  y en las reseñas de la App Store hay usuarios que dicen que sí). **No verificado.**
- **TikTok del usuario** (`@seorinnyx/video/7638021952304712978`, «FYA»): **no se pudo abrir**, porque TikTok devolvió
  solo «TikTok - Make Your Day» y ningún dato. No describimos lo que muestra.

### Qué implica para la app

Un ARMY Bomb conectado por Bluetooth a un teléfono (como en nuestra PWA) **no recibe el control central**: solo recibe
colores sólidos (`[R,G,B,modo]`). Podemos imitar dos efectos:

- el efecto *Unifying* en un solo stick;
- los efectos *Group* y *wave* entre **varios sticks conectados**, usando `i` y `n` de `colorAt(t, i, n)`.

Las imágenes y el texto formados por el público son imposibles.

---

## 2. Lo que se sabe de las luces por canción

Hay muy pocas fuentes que describan el color del ARMY Bomb canción por canción. Esto es lo que se pudo comprobar:

| Canción / momento | Qué dice la fuente | Confianza |
| --- | --- | --- |
| **FIRE (불타오르네)**, PTD ON STAGE LA, 2021-11-28 | «모든 조명이 붉은색으로 바뀌었고» (todas las luces se volvieron rojas). Se refiere a la iluminación del show; no aclara si incluye los ARMY Bomb. | Parcial ([isplus](https://isplus.com/article/625/24172625.html)) |
| **Blue & Grey**, el mismo show | Pantallas en blanco y negro y luz azul sobre los integrantes. No está en el catálogo, pero sirve de referencia para baladas. | Parcial (isplus) |
| PTD LA y Las Vegas, en general | Un «mar de ARMY Bomb» morado y en movimiento; en Las Vegas, «5만개의 보랏빛 아미밤» (50 000 ARMY Bomb morados). | Confirmado, como ambiente general ([Sports Kyunghyang](https://sports.khan.co.kr/article/202111291747003), [NewsTomato](https://newstomato.com/ReadNews.aspx?no=1116316)) |
| PTD Las Vegas | Los sticks emparejados cambian de color por todo el estadio, y al final se hacen olas («tsunami of lights»). | Confirmado, en general ([BroadwayWorld](https://www.broadwayworld.com/bwwmusic/article/ARMY-Diaries-The-Power-of-BTS-is-Palpable-as-Las-Vegas-Becomes-Borahaegas-For-PERMISSION-TO-DANCE-ON-STAGE-20220415), resumen del buscador; no se abrió la página) |
| PTD Seúl (Weverse Magazine) | Una «ola brillante» de ARMY Bomb en las gradas. La paleta del show se inspiraba en «Dynamite», pero no dice si los Bomb la seguían. | Parcial ([Weverse Magazine](https://magazine.weverse.io/article/view/283?lang=en)) |
| Yet To Come in BUSAN, 2022-10-15 | Ciudad y estadio de morado («Bora Road», el puente Gwangan iluminado). El bis fue «Spring Day» + «Yet To Come». | Parcial: morado general ([Busan](https://www.busan.go.kr/eng/bsnews01/1542970), [Rappler](https://www.rappler.com/entertainment/music/bts-busan-concert-why-best-yet-to-come/); resúmenes del buscador) |
| Gira de estadios en Texas | Los sticks cambiaban de color según la canción, con olas arcoíris por secciones. No nombra los colores por canción. | Parcial ([Dallas Observer](https://www.dallasobserver.com/music/bts-rounded-up-diverse-and-dedicated-north-texas-troops-at-their-sold-out-stadium-shows-40705669/); no se pudo abrir, conexión rechazada) |
| ARIRANG 2026, apertura en Goyang | Los ARMY Bomb se volvieron **rojos**, como el logo de ARIRANG. | Sin verificar ([Forbes](https://www.forbes.com/sites/laurasirikul/2026/04/19/bts-kicks-off-arirang-world-tour-with-stunning-spectacle-in-goyang/): 403; solo el resumen del buscador) |
| Mikrokosmos, Love Yourself | Clip de fan titulado «rainbow army bomb ocean» (océano arcoíris). | Afirmación de fans ([YouTube](https://www.youtube.com/watch?v=RoCqQFAjdAI); no abierto) |
| PTD Las Vegas | Clips con el título «Rainbow army ocean». | Afirmación de fans ([TikTok](https://www.tiktok.com/@shmems96/video/7085542421211204910); no abierto) |
| Butter y PTD en sitios de fans | Un sitio de shows hechos por fans asigna dorado o amarillo a Butter y arcoíris a PTD. | Afirmación de fans ([bora-waves.com](https://bora-waves.com/albums/butter), resumen del buscador; no copiar sus cues) |

**Conclusión:** solo está respaldado el **morado como base y para el final** y el **rojo para FIRE** (este último como
luz de escenario). El resto de colores por canción son **propuestas creativas** basadas en la estética oficial del MV y
del álbum (la paleta de `catalog.js`), no en un show documentado.

---

## 3. Guía por canción

Columnas:

- **Secciones**: siguen la `STRUCTURE` de `patterns.js`, en orden: intro → verso → pre-coro → coro → verso 2 → coro 2 → puente → coro final → final.
- **Plan**: los 9 estilos en ese mismo orden. Los estilos nuevos (`flame`, `disco`, `split`, `sparkle`) se explican en el §4.
- **Energía**: el valor actual en el catálogo.

| id | Paleta (hex) | Comportamiento por sección | Plan sugerido | Energía | Estado |
| --- | --- | --- | --- | --- | --- |
| `fire` | `#ff1a00` `#ff6a00` `#ffb300` | Intro: rojo tenue que respira. Verso: llama roja que parpadea. Coro: pulsos rojo/naranja a 168 BPM (2,8 Hz, justo bajo el límite de 3). Puente: llama baja. Final: rojo y luego morado. | `breathe, flame, flame, pulse, flame, pulse, flame, pulse, fadeout` | high | **Parcial** (luces rojas en PTD LA, [isplus](https://isplus.com/article/625/24172625.html)); el parpadeo de llama es propuesta |
| `dynamite`, `-bside`, `-choreo`, `-sing-with-me*` | `#ff4fa3` `#ffd23f` `#3ec1ff` `#7cff6b` | Disco: cambia de color cada 2 tiempos. El coro es más brillante y con pulsos. Final: arcoíris. | `breathe, disco, wave, disco, disco, pulse, wave, rainbow, fadeout` | high | Propuesta creativa (MV de estética retro y colorida) |
| `butter`, `-hotter`, `-spv`, `-megan-spv` | `#ffd400` `#ffe680` `#ffffff` | Amarillo mantequilla constante. Pulso en el coro. Puente: respiración amarilla. Final: el amarillo se funde en morado. | `breathe, pulse, breathe, pulse, pulse, pulse, breathe, pulse, fadeout` | high | Afirmación de fans (amarillo en bora-waves) + propuesta |
| `ptd` | arcoíris + `#8a2be2` | Verso: ola de colores. Coro: arcoíris. Final: arcoíris y luego morado. Sin destellos (es una canción luminosa y alegre). | `breathe, wave, wave, rainbow, wave, rainbow, ocean, rainbow, fadeout` | high | Afirmación de fans (arcoíris) + propuesta |
| `mic-drop`, `mic-drop-jp` | `#ffffff` `#ff2d2d` `#1a1a1a` | Golpes blancos en los acentos del coro y verso oscuro con rojo. | `breathe, pulse, flash, flash, pulse, flash, breathe, flash, fadeout` | high | Propuesta creativa |
| `idol`, `idol-nicki` | `#ff2e88` `#00c2a8` `#ffb300` | Colores vivos y festivos. Coro con `disco`. Puente en `split` (mitades de color, con varios sticks). | `breathe, wave, pulse, disco, wave, disco, split, rainbow, fadeout` | high | Propuesta creativa |
| `spring-day`, `spring-day-mcountdown` | `#bfe3ff` `#ffffff` `#9fb8ff` | Todo en respiración y océano azul y blanco suaves. Coro: un poco más brillante. **Sin destellos.** Final: morado. | `breathe, breathe, ocean, breathe, breathe, breathe, ocean, breathe, fadeout` (ocean en azul) | ballad | Propuesta creativa (en Busan fue bis, pero no hay colores documentados) |
| `yet-to-come`, `yet-to-come-proof-live` | `#8a2be2` `#ffe9b0` | Morado cálido. Coro: ola morada lenta. Final: el morado más largo («Borahae»). | `breathe, ocean, ocean, wave, ocean, wave, ocean, ocean, fadeout` | ballad | **Parcial** (Busan en morado: [Busan](https://www.busan.go.kr/eng/bsnews01/1542970)) |
| `dna`, `dna-mcountdown` | `#00b2ff` `#ff4fd8` `#ffffff` | Ola azul y rosa. Coro: pulsos. | `breathe, wave, pulse, pulse, wave, pulse, wave, rainbow, fadeout` | high | Propuesta creativa |
| `fake-love`, `fake-love-inkigayo` | `#b0002a` `#2a0a3a` `#ffffff` | Respiración granate. Coro: pulso lento. Puente: casi apagado. | `breathe, breathe, pulse, pulse, breathe, pulse, breathe, pulse, fadeout` | mid | Propuesta creativa |
| `bst`, `bst-jp` | `#5a0f2e` `#c9a227` `#1a1a1a` | Burdeos y dorado; respiración larga y pulsos en el coro. | `breathe, breathe, wave, pulse, breathe, pulse, breathe, pulse, fadeout` | mid | Propuesta creativa |
| `not-today` | `#ffffff` `#e53935` `#212121` | Ritmo marcial: pulsos blancos y rojos. Coro en `flash` (110 BPM → 1,8 Hz). | `breathe, pulse, pulse, flash, pulse, flash, breathe, flash, fadeout` | high | Propuesta creativa |
| `dope`, `run`, `run-jp`, `save-me` | `dope` `#ffffff` `#ff1744`; `run` `#ff9a3c` `#ffd27a`; `save-me` `#00e5ff` `#ff5ab4` | Energía alta: pulsos en el coro y ola en el verso. | plan `high` actual | high | Propuesta creativa |
| `i-need-u`, `i-need-u-jp` | `#c62828` `#ff8a65` | Respiración roja cálida, sin destellos. Coro: un pulso suave. | `breathe, breathe, ocean, pulse, breathe, pulse, breathe, pulse, fadeout` | mid | Propuesta creativa |
| `epilogue-young-forever` | `#ffffff` `#ffd6e8` `#8a2be2` | Blanco y rosa pálido; termina en morado largo. | plan `ballad` | mid | Propuesta creativa |
| `euphoria` | `#7ad7ff` `#ffd1f2` `#ffffff` | Pastel azul y rosa; ola lenta. | `breathe, wave, wave, pulse, wave, pulse, ocean, wave, fadeout` | mid | Propuesta creativa |
| `bwl` | `#ff8ccf` `#ffffff` `#ffd1e8` | Rosa: ola en el verso y pulso en el coro. | `breathe, wave, pulse, pulse, wave, pulse, wave, rainbow, fadeout` | high | Propuesta creativa (estética rosa del MV) |
| `on`, `on-kinetic`, `on-fallon` | `#d9c7a0` `#4a3b2a` `#ffffff` | Tambores: pulsos fuertes. Puente: `split` por grupos. | `breathe, pulse, pulse, pulse, pulse, pulse, split, pulse, fadeout` | high | Propuesta creativa |
| `black-swan`, `black-swan-art-film` | `#ffffff` `#1a1a1a` `#b3a5ff` | Blanco y gris en respiración. Sin colores saturados ni destellos. | `breathe, breathe, ocean, breathe, breathe, breathe, ocean, breathe, fadeout` | mid | Propuesta creativa |
| `life-goes-on`, `life-goes-on-forest`, `life-goes-on-video-call-rm` | `#ffe0b3` `#ffffff` | Blanco cálido que respira despacio. | plan `ballad` sin `rainbow` | ballad | Propuesta creativa |
| `film-out` | `#9ec9ff` `#ffffff` | Azul frío que respira. | plan `ballad` | ballad | Propuesta creativa |
| `my-universe`, `my-universe-amas` | `#1b1464` `#ff6ad5` `#ffffff` | Espacial: `sparkle` en el verso y ola en el coro. | `breathe, sparkle, wave, wave, sparkle, wave, ocean, rainbow, fadeout` | mid | Propuesta creativa |
| `the-astronaut`, `the-astronaut-coldplay-live` | `#0b1d51` `#ffffff` `#8fd3ff` | Azul noche con `sparkle`; final en morado. | `breathe, sparkle, ocean, wave, sparkle, wave, ocean, wave, fadeout` | mid | Propuesta creativa |
| `blue-side`, `winter-bear`, `lights`, `epiphany`, `singularity`, `serendipity`, `abyss`, `forever-rain`, `film-out` | según álbum (azules y blancos; rosa en `serendipity`) | Baladas: solo `breathe` y `ocean`, sin destellos. | plan `ballad` | ballad | Propuesta creativa |
| `no-more-dream`, `n-o`, `we-are-bulletproof-pt2` | `#212121` `#ffeb3b` `#e53935` (ya en el catálogo) | Era escolar: pulsos amarillos y rojos. | plan `high` | high | Propuesta creativa |
| `daechwita`, `haegeum`, `agust-d` | `#c9a227` `#7a0000` `#1a1a1a` | Dorado y granate, con `flame` lento en el puente. | `breathe, pulse, pulse, pulse, pulse, pulse, flame, pulse, fadeout` | high | Propuesta creativa |
| `seven`, `seven-performance`, `seven-iheart`, `standing-next-to-you`, `3d` | según álbum | Pop dance: `disco` en el coro. | plan `high` con `disco` en el coro | high | Propuesta creativa |
| `hooligan`, `two-point-o`, `normal`, `swim` (era ARIRANG 2026) | `#c8102e` `#ffffff` `#1a1a1a` | Rojo como base de la era. El coro de `hooligan`/`two-point-o` usa pulsos; `swim` y `normal` usan océano rojo y blanco. | `hooligan`: plan `high`; `swim`: plan `mid` | según catálogo | **Sin verificar** (Bomb rojos en la apertura de Goyang, según el resumen del buscador de [Forbes](https://www.forbes.com/sites/laurasirikul/2026/04/19/bts-kicks-off-arirang-world-tour-with-stunning-spectacle-in-goyang/)) |

Para el resto del catálogo (unos 250 videos), se mantienen el plan por `energy` y la paleta del álbum que ya existen.

---

## 4. Reglas generales para `src/patterns.js`

Estilos que existen hoy (`STYLES`): `ocean` (Océano morado), `breathe` (Respiración), `pulse` (Latido),
`wave` (Ola de colores), `rainbow` (Arcoíris), `flash` (Destellos) y `fadeout` (Despedida).

### Reglas que funcionan con los estilos actuales

1. **Baladas** (`ballad`): solo `breathe`, `ocean` y `fadeout`. Nada de `flash`, `pulse` ni `rainbow` rápido. Un ciclo
   de `breathe` de 4 tiempos a 70–90 BPM dura unos 3 s, y es correcto.
2. **Canciones de alta energía**: `pulse` en el coro y `wave` en el verso. `flash` solo en el coro final y solo en modo
   seguro: con `beatsPerFlash` = ⌈(BPM/60)/3⌉ ya queda ≤ 3 Hz. Si el BPM es mayor de 180, pulsar a BPM/2.
3. **El coro más brillante que el verso**: escala de 1,0 en el coro y de unos 0,7 en verso y puente. Hoy `pulse` va de
   0,3 a 1, y `breathe` llega a 1. Se puede añadir `sec.gain` por sección.
4. **Final morado («Borahae»)**: `fadeout` ya parte de `PURPLE`. Conviene que la sección `final` funda primero del color
   de la canción a morado y después a negro.
5. **Varios sticks** (`n > 1`): `wave`, `ocean` y el nuevo `split` usan `i/n` para imitar las secciones del estadio.
   Con un solo stick deben verse bien igualmente.
6. **Transiciones**: mantener el `CROSSFADE` de 0,6 s, pero no alargarlo en canciones rápidas.
7. **Brillo**: no apagar del todo en secciones suaves (mínimo de 0,15–0,25), porque con un stick real un apagón parece
   una desconexión.

### Estilos nuevos que harían falta

| id propuesto | label (es) | Comportamiento | Límite de seguridad |
| --- | --- | --- | --- |
| `flame` | «Llamas» | Ruido suave entre rojo `#ff1a00` y naranja `#ff6a00` con brillo de 0,6 a 1. Por ejemplo, una suma de dos senos a 0,9 Hz y 1,7 Hz desfasados por `i`. | ≤ 3 transiciones fuertes por segundo. Evitar saltos de rojo saturado a negro: según WCAG, eso cuenta como *red flash*. |
| `disco` | «Disco» | Cambio de color de la paleta cada 2 tiempos, con corte limpio o un fundido de 80 ms. | A 114 BPM, cada 2 tiempos son 0,95 cambios por segundo: seguro. |
| `split` | «Secciones» | El stick `i` toma `palette[i % k]`. Cada 4 compases, la asignación rota. | Sin destellos. |
| `sparkle` | «Destellos suaves» | Base oscura del color con «chispas» breves y pseudoaleatorias (con semilla por `i`). | ≤ 2 chispas por segundo en modo seguro. |

Además, un mapa opcional `SONG_LOOKS` (`{ [songId]: { palette, plan } }`) dentro de `patterns.js` o en
`catalog.js` (`look:` por canción), que tenga prioridad sobre `PLANS[energy]` y `album.palette`. Cada estilo nuevo
necesita su `label` y su `description` en `STYLES`, más su traducción en `src/i18n/en-*.js`.

---

## 5. Limitaciones

- **Velocidad de escritura BLE**: como mínimo 20 ms entre escrituras en el V4 (escritura con respuesta), y 120 ms tras
  un error. Solo se manda el último color, así que los fundidos se ven a 50 pasos/s como máximo y bajan si hay
  reintentos. El SE/V3 escribe sin respuesta. No hay garantía de entrega.
- **Latencia**: entre el cálculo del color y que el LED cambie pasan, por estimación, unas decenas de ms (intervalo de
  conexión BLE + escritura + firmware). **No se ha medido** con hardware. Podría haber una compensación configurable
  (por ejemplo, calcular `colorAt(t + 0,05)`).
- **Sin control central**: un stick en modo Bluetooth con un teléfono solo recibe colores sólidos. No hay olas reales
  por asiento, ni texto, ni imágenes. Tampoco sabemos si el V4 tiene modos de efecto en el byte `modo` (solo usamos
  `1` = sólido).
- **Seguridad ante destellos**: WCAG 2.3.1 prohíbe más de **3 destellos por segundo**. Un destello es un par de cambios
  opuestos de luminancia de 10 % o más, o un par que implica rojo saturado, con R/(R+G+B) ≥ 0,8
  ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)). Un lightstick ocupa poco
  del campo visual, pero se sostiene cerca de la cara y hay decenas en una sala. Por eso el **modo seguro (≤ 3/s) va
  por defecto**, y también se respeta `prefers-reduced-motion`, que debería forzar `breathe` y `ocean`. Ojo con `pulse`:
  cada tiempo cuenta como un destello si la diferencia de brillo supera el 10 %.
- **Reloj de YouTube**: `getCurrentTime()` devuelve segundos sin precisión documentada. Durante el estado `3`
  (buffering) el tiempo se detiene, y `setPlaybackRate()` es solo una sugerencia
  ([IFrame API](https://developers.google.com/youtube/iframe_api_reference)). Hay que interpolar (como ya hace
  `src/player.js`), resincronizar en `onStateChange` y en `onPlaybackRateChange`, y congelar el patrón durante la
  pausa o el buffering.
- **No tenemos datos de beat**: solo el BPM aproximado del catálogo y una `STRUCTURE` fija en fracciones. Los coros
  reales no caen en el 30 % de la duración. El patrón no está en fase con el beat: aunque el BPM sea correcto, el
  primer tiempo no coincide con `t = 0`. Hacen falta un offset por canción y, para ajustar, el control de BPM que ya
  existe en la app.
- **Videos en vivo y conciertos**: el tempo en vivo, los MC, las intros y los medleys no siguen el BPM de estudio.
  `generateConcertPattern` usa bloques de 210 s que no se alinean con el setlist. Para conciertos, mejor estilos sin
  fase de beat (`ocean`, `breathe`, `wave` lento, `flame`) que `pulse` o `flash`.
- **Videos de práctica de baile, MV y versiones con efectos**: duraciones distintas (intros cinemáticas largas en
  `on-kinetic`, `black-swan-art-film`, etc.) desplazan aún más las secciones heurísticas.

---

## 6. Fuentes

Abiertas en esta investigación:

- App Store, «BTS Official Light Stick» (FANLIGHT Co., Ltd.): https://apps.apple.com/us/app/id1419937069
- FANLIGHT, Technology: https://www.fanlight.com/technology
- Sports Kyunghyang (EN), FANLIGHT en LDI Las Vegas: https://sports.khan.co.kr/en/article/202512101115587
- BTS 101, ARMY Bomb History (sitio de fans): https://bts101.info/resources-list/army-bomb-history/
- isplus, reseña de PTD ON STAGE LA (2021-11-29): https://isplus.com/article/625/24172625.html
- Sports Kyunghyang, PTD LA: https://sports.khan.co.kr/article/202111291747003
- NewsTomato, PTD Las Vegas: https://newstomato.com/ReadNews.aspx?no=1116316
- Weverse Magazine, PTD: https://magazine.weverse.io/article/view/283?lang=en
- The Pearl Post, ARIRANG Tour (sin datos de luces): https://www.thepearlpost.com/38378/ae/entertainment/concert-review-bts-lights-it-up-like-dynamite-on-stage-for-their-arirang-tour/
- Foro de WLED (especulación sobre RF): https://wled.discourse.group/t/how-can-the-concert-lighting-staff-control-lightsticks-at-kpop-concerts/8648
- W3C, Understanding SC 2.3.1: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html
- YouTube IFrame Player API: https://developers.google.com/youtube/iframe_api_reference

**No abiertas** (bloqueadas o usadas solo a través del resumen del buscador):

- TikTok del usuario (FIRE / «FYA»): https://www.tiktok.com/@seorinnyx/video/7638021952304712978. **Bloqueado**: solo devolvió el título genérico.
- Forbes, apertura de ARIRANG en Goyang: https://www.forbes.com/sites/laurasirikul/2026/04/19/bts-kicks-off-arirang-world-tour-with-stunning-spectacle-in-goyang/ (403).
- Dallas Observer: https://www.dallasobserver.com/music/bts-rounded-up-diverse-and-dedicated-north-texas-troops-at-their-sold-out-stadium-shows-40705669/ (conexión rechazada).
- FAQ de ARMY Bomb de r/bangtan (espejo): https://r.datuan.dev/r/bangtan/wiki/armybombfaq (403).
- BroadwayWorld, PTD Las Vegas: https://www.broadwayworld.com/bwwmusic/article/ARMY-Diaries-The-Power-of-BTS-is-Palpable-as-Las-Vegas-Becomes-Borahaegas-For-PERMISSION-TO-DANCE-ON-STAGE-20220415
- Busan Metropolitan City, Yet To Come in BUSAN: https://www.busan.go.kr/eng/bsnews01/1542970
- Rappler, Busan: https://www.rappler.com/entertainment/music/bts-busan-concert-why-best-yet-to-come/
- bora-waves.com, Butter (shows hechos por fans): https://bora-waves.com/albums/butter
- YouTube, «rainbow army bomb ocean»: https://www.youtube.com/watch?v=RoCqQFAjdAI
- TikTok, «Rainbow army ocean» (PTD Las Vegas): https://www.tiktok.com/@shmems96/video/7085542421211204910

## Intensidad continua y combinaciones (2026-11-05)

- **Intensidad (`energyAt`)**: ya no es un número fijo por sección. El pre-coro se construye y toma aire en los
  últimos tiempos antes del coro; el coro entra con impacto; el último compás de cada frase de 8 compases remata;
  el puente baja y vuelve a crecer; en el coro final crece la cresta blanca del 1 de cada compás (≤ 1 por segundo).
  Manda el brillo y el piso del LED (`floorAt`).
- **Combinaciones**: cada sección tiene `color`, `accent` y `third`. El latido pega con el acento en el 1 del compás
  (en lo culminante, principal y acento se turnan); la respiración se tiñe del acento al exhalar (con el mismo
  brillo: cambia el tono, no la luz); los golpes alternan principal/acento; el océano asoma el acento en la cresta.
- **Dúo** (estilo nuevo): dos colores que se reparten las ARMY Bomb (pares e impares opuestas) y se intercambian
  cada compás; con una sola, va y viene entre los dos. En lo intenso entra el tercer color cada 4 compases.
- **Color compañero** (`withCompanion`): las paletas de un solo tono (rojo y blanco, beige y café…) reciben un
  análogo a 30–35° (dentro del filtro del concepto): los cálidos hacia el naranja o ámbar, el resto hacia el violeta.
  No se aplica a los looks con `lock` (FIRE).
- **Variedad**: las canciones sin look propio eligen variantes de verso, verso 2 y puente con una semilla estable
  del id (la misma canción siempre se ve igual; dos canciones de la misma energía, no).
- **Rap**: los versos suben a 0,78 (antes 0,85) para que el coro se siga sintiendo.
- Barrido del catálogo (183 canciones, puntaje de variedad de color, rango, contraste coro/verso y movimiento):
  promedio 75 → 79; canciones bajo 60: 29 → 2 (las restantes son de golpes, oscuras entre golpes a propósito).


## Conciertos reales: qué hacía el océano de luces (estudio del 2026-11-05)

Casi ninguna fuente pública describe el ARMY Bomb canción por canción; esto es lo que se puede respaldar
(C = prensa u oficial, F = relato de fans).

| Momento | Qué pasaba | Fuente | En LumiParty |
| --- | --- | --- | --- |
| Canción de apertura | El estadio pasa de multicolor o blanco a un solo color, todos a la vez | F: [Pearl Post](https://thepearlpost.com/22622/showcase/korean-boy-band-bts-sells-out-concert-at-rose-bowl-stadium) (Dionysus, 2019); C: [Nocut](https://nocutnews.co.kr/news/6500742) (Hooligan, 2026) | `intro`: blanco tenue → rojo de golpe en el verso (FIRE, Hooligan); Dionysus de ola multicolor a golpes rojos |
| FIRE | Todo en rojo; los sticks pasan de blanco a rojo | C: [isplus](https://isplus.com/article/625/24172625.html), Las Vegas Weekly | Paleta de fuego bloqueada, apertura blanca, apagón antes de cada coro (`drop`) |
| Hooligan (ARIRANG) | ARMY Bomb rojos, llamas y bengala roja | C: Nocut | Look propio rojo/blanco con fuego, subida y golpes |
| Baladas (Singularity, Epiphany, Blue & Grey) | Balanceo suave, silencio, luz azul sobria | C: [London Korean Links](https://londonkoreanlinks.net/2019/09/22/concert-review-bts-love-yourself-speak-yourself-at-wembley-stadium/), isplus | Ya coincide: respiración lenta (BALLAD_PLAN) |
| Cierre | Océano morado (Busan: de rojo a morado; ARIRANG: cierre en morado) | F: [kbizoom](https://kbizoom.com/?p=242301), [Hallyuism](https://hallyuism.com/2026/04/29/k-event-coverage-bts-world-tour-arirang-2026-in-goyang-south-korea/) | `finale: "borahae"` en Spring Day, Yet To Come, Epilogue, Make It Right y PTD |
| Charlas (ment) | Los miembros piden una ola de lightsticks | F: Daily Titan; C: [Weverse Magazine](https://magazine.weverse.io/article/view/283?lang=en) | Pendiente: botón «Ola» entre canciones |

Sin respaldo público: el amarillo de Butter, el arcoíris de Dynamite y PTD, el celeste de Spring Day. Quedan como
**propuesta** (así lo dice su `source`).

### Momentos de concierto (opciones del look)

- **`intro: "#hex"`**: la intro usa ese color (blanco tenue) y en el primer verso todo cambia de golpe, como la
  apertura de un show. Un solo cambio.
- **`drop: true`**: apagón de 1 tiempo antes de cada coro. Brasa (piso del LED), nunca negro total: el paso de rojo
  saturado a negro cuenta como destello rojo (WCAG). Un solo destello por entrada.
- **`finale: "borahae"`**: el final ocupa del 88 % al 100 % de la canción (≈ 25 s) con el estilo **Océano Borahae**:
  morado que respira en ciclos de 5 s, olas lentas entre ARMY Bomb, un recuerdo del color de la canción al empezar
  y se apaga en el último 30 %.
