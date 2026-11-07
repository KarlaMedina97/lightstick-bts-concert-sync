# Encargo: secuencias de luz del ARMY Bomb para 179 videos de BTS (LumiParty)

Eres diseñador o diseñadora de iluminación de conciertos y vas a trabajar con datos reales. LumiParty es una app que sincroniza el lightstick oficial de BTS (ARMY Bomb Ver.4) con los videos oficiales de YouTube. Para **cada video de la lista** del final tienes que **ver y escuchar el video completo** y entregar su secuencia de luces por marcas de tiempo en un archivo JSON. Al final, todo va en **un solo archivo .zip**.

Tus resultados se validan automáticamente contra los videos reales (duración, ID, cuadros capturados en segundos concretos y plantillas repetidas). Lo que no pase se descarta, así que **es mejor entregar menos canciones bien hechas que muchas inventadas**.

## 1. Lo que NO debes hacer (motivos de rechazo automático)

1. **No uses plantillas.** Cada canción tiene su propia estructura: sus propios tiempos, número de tramos, efectos y colores. Si dos canciones comparten los mismos tiempos relativos, la misma duración o la misma «evidencia», se rechazan las dos.
2. **No inventes ni modifiques IDs ni duraciones.** Copia `song` y `yt` **exactamente** como aparecen en la lista (letra por letra). Si la lista dice «dura N s», tu `duracion` debe ser N (±2 s). Si dice «mídela», mide el video real.
3. **No redondees las marcas a múltiplos fijos** (12, 24, 48…). Pon el segundo real (con un decimal) en que cambia la música.
4. **No cites ni transcribas la letra** ni los subtítulos, en ningún campo. Describe solo lo que se oye (instrumentos, golpes, silencios) y lo que se ve (escena, vestuario, luces).
5. **No uses estrobos continuos.** Máximo 3 destellos por segundo en cualquier momento; los destellos rápidos solo en acentos importantes.
6. **No digas «verificado» si no lo hiciste.** Si no pudiste ver o escuchar un video, **no lo entregues**: anótalo en `pendientes.txt` con el motivo.

## 2. Cómo analizar cada video

1. Míralo **completo** con imagen y sonido.
2. Anota: tempo real (BPM), segundo del **primer tiempo fuerte**, pulsos, **acentos** (golpes de batería, remates, entradas de voz o de un instrumento), **pausas o silencios**, cambios de intensidad y las **secciones que existan de verdad**: intro, verso, pre-coro, coro, verso 2, coro 2, puente, coro final, final, y también `rap` y `pausa` si las hay.
3. Para cada tramo, escribe en `evidencia` **qué se oye y qué se ve justo en su segundo de inicio** (p. ej. «entra la batería y cambia a la escena del autobús amarillo de noche»). Tiene que ser específico de ese video: con esto se comprueba tu análisis.
4. Saca los colores de la imagen real: vestuario, escenario, luces, cielo, fuego… La paleta debe **evolucionar** con el video.
5. Versiones distintas (dance practice, japonesa, remix, performance) son videos distintos: analiza cada uno por separado; sus tiempos y su duración cambian.

## 3. Cómo diseñar las luces

El lightstick muestra **un solo color RGB para todo el globo** a la vez. Puede hacer cortes secos y fundidos propios (hasta ~12 s). Lo ve una multitud: tiene que ser legible, emocionante y nunca caótico.

- **Nunca plana ni repetitiva:** varía color, brillo, efecto y velocidad entre secciones; el coro 2 no es igual al coro 1 y el final cierra el arco emocional.
- **Pulsos al ritmo**; los destellos rápidos solo en acentos importantes (lístalos en `acentos`, en segundos exactos).
- **Tensión:** la luz crece gradualmente (pre-coro, puente) y llega a su **máximo en los clímax** (coros, coro final).
- **Partes suaves:** brillo bajo, transiciones lentas o luz sostenida.
- **Pausas:** un apagón breve (`blackout`) o una atenuación, no destellos.
- **Rap (marcado RAP en la lista):** los versos de rap suben fuerte (brillo ≥ 0,78) con golpes marcados; ahí está la energía de la canción.
- **Coros más brillantes que los versos**, siempre.
- **Ataque nítido y caída suave:** los golpes entran de golpe y se apagan con fundido.
- **Baladas:** sin destellos; respiración, aurora, luz sostenida y fundidos largos.
- Si la lista dice «paleta obligatoria», usa solo esos colores.

## 4. Formato exacto de cada archivo `<id>.json`

```json
{
  "formato": 1,
  "song": "<id exacto de la lista>",
  "yt": "<yt exacto de la lista>",
  "duracion": 0.0,
  "bpm": 0,
  "primerTiempo": 0.0,
  "verificacion": {
    "audio": "cómo obtuviste tempo, golpes y secciones",
    "imagen": "qué tomaste del video para los colores",
    "confianza": "alta | media | baja",
    "dudas": ["lo que no pudiste confirmar"]
  },
  "paleta": [{ "nombre": "", "hex": "#rrggbb", "de": "qué del video lo inspira" }],
  "tramos": [
    {
      "inicio": 0.0,
      "fin": 0.0,
      "seccion": "intro | verso | pre-coro | coro | verso 2 | coro 2 | puente | coro final | final | pausa | rap",
      "evidencia": "qué se oye y se ve en el segundo de inicio (sin letra)",
      "sigue": "qué pulso o acento sigue la luz",
      "color": "#rrggbb",
      "color2": "#rrggbb o null",
      "brillo": 0.0,
      "brilloFin": 0.0,
      "transicion": "corte | fundido | crescendo | decrescendo",
      "transicionSeg": 0,
      "efecto": "breathe | pulse | hit | rise | bloom | wave | duo | disco | aurora | sparkle | rainbow | ocean | flame | fadeout | blackout | hold",
      "cadaTiempos": 1,
      "destellosPorSeg": 0,
      "acentos": [],
      "nota": ""
    }
  ]
}
```

Reglas del JSON:
- JSON válido, sin comentarios ni texto fuera del objeto. Usa `evidencia` (en español).
- Tiempos en **segundos con un decimal**, desde 0 = inicio del video.
- Tramos en orden, **sin huecos ni superposiciones**: cada `inicio` es el `fin` del anterior; el primero empieza en 0 y el último termina en `duracion`.
- `brillo` y `brilloFin` de 0 a 1 (inicio y fin del tramo; distintos si sube o baja).
- `cadaTiempos`: cada cuántos tiempos late la luz (1, 2, 4; 0 si es sostenida).
- `destellosPorSeg` ≤ 3; `acentos` dentro de su tramo, separados al menos 0,4 s.
- Colores hex de 6 dígitos, vivos (un LED gris o apagado se ve sucio).
- Efectos solo de la lista. Usa al menos 3 efectos distintos por canción.
- `confianza` honesta: «alta» solo si viste y escuchaste todo el video y comprobaste cada marca.

## 5. Entrega

- **Un archivo `secuencias-lumiparty.zip`** con:
  - un `<id>.json` por canción entregada (nombre = id exacto);
  - `resumen.txt`: una línea por canción con id, duración, número de tramos y confianza;
  - `pendientes.txt`: las que no pudiste ver o escuchar, con el motivo.
- Si no te alcanza para todas en una respuesta, entrega un zip con las que sí analizaste de verdad (por ejemplo `secuencias-lumiparty-parte-1.zip`), di en cuál te quedaste y continúa cuando te escriban «continúa».

## 6. Lista de videos (179)

Formato: id | título | yt | enlace | duración | BPM aproximado (verifícalo) | energía | marcas

no-more-dream | No More Dream | yt=rBG5L7UsUxA | https://www.youtube.com/watch?v=rBG5L7UsUxA | dura 289 s | ~84 BPM | energía high | RAP
we-are-bulletproof-pt2 | We Are Bulletproof Pt.2 | yt=lE9lkSdtZeQ | https://www.youtube.com/watch?v=lE9lkSdtZeQ | dura 233 s | ~95 BPM | energía high | RAP
wab2-dance-practice | We Are Bulletproof Pt.2 (Dance Practice) | yt=bV9Svms-LYY | https://www.youtube.com/watch?v=bV9Svms-LYY | dura 223 s | ~95 BPM | energía high
wab2-nmd-practice-record | We Are Bulletproof Pt.2 + No More Dream (Practice Record) | yt=_vJIzDBvPKU | https://www.youtube.com/watch?v=_vJIzDBvPKU | dura 314 s | ~95 BPM | energía high
boy-in-luv | Boy In Luv | yt=LHHjp3IMjMk | https://www.youtube.com/watch?v=LHHjp3IMjMk | dura 283 s | ~122 BPM | energía high | RAP
come-over | Come Over (Lyric Video) | yt=MEoxtFRfPoc | https://www.youtube.com/watch?v=MEoxtFRfPoc | duración: mídela | ~100 BPM | energía mid
danger | Danger | yt=bagj78IQ3l0 | https://www.youtube.com/watch?v=bagj78IQ3l0 | dura 292 s | ~123 BPM | energía high | RAP
danger-dance-practice | Danger (Dance Practice) | yt=vJwHIpEogEY | https://www.youtube.com/watch?v=vJwHIpEogEY | dura 243 s | ~123 BPM | energía high | RAP
war-of-hormone-dance-practice | War of Hormone (Dance Practice) | yt=JumcC5jFcQc | https://www.youtube.com/watch?v=JumcC5jFcQc | dura 269 s | ~122 BPM | energía high
danger-practice-record | Danger (Practice Record) | yt=bs8SfZdb4us | https://www.youtube.com/watch?v=bs8SfZdb4us | dura 218 s | ~123 BPM | energía high | RAP
no-more-dream-jp | No More Dream (Japanese ver.) | yt=Q3n6wMdqnhk | https://www.youtube.com/watch?v=Q3n6wMdqnhk | dura 230 s | ~84 BPM | energía high | RAP
boy-in-luv-jp | Boy In Luv (Japanese ver.) | yt=ocqCmfw145A | https://www.youtube.com/watch?v=ocqCmfw145A | duración: mídela | ~122 BPM | energía high | RAP
danger-jp | Danger (Japanese ver.) | yt=rdLkxbjK9aM | https://www.youtube.com/watch?v=rdLkxbjK9aM | duración: mídela | ~123 BPM | energía high | RAP
hug-me-cover | Hug me (cover de Jung Joon Il, con j-hope) | yt=tv_HQ-0upns | https://www.youtube.com/watch?v=tv_HQ-0upns | dura 244 s | ~76 BPM | energía ballad
look-like-christmas-cover | It's Beginning to Look a Lot Like Christmas (cover de Michael Bublé) | yt=QH4mCEanwKI | https://www.youtube.com/watch?v=QH4mCEanwKI | dura 172 s | ~96 BPM | energía mid
dope-dance-practice | DOPE (Dance Practice) | yt=NnbIIXNPtPU | https://www.youtube.com/watch?v=NnbIIXNPtPU | dura 242 s | ~125 BPM | energía high | RAP
i-need-u-dance-practice | I NEED U (Dance Practice) | yt=hvUZb9NT7EY | https://www.youtube.com/watch?v=hvUZb9NT7EY | dura 213 s | ~79 BPM | energía mid
i-need-u-practice-record | I NEED U (Practice Record) | yt=1uVwfEl63xo | https://www.youtube.com/watch?v=1uVwfEl63xo | dura 116 s | ~79 BPM | energía mid
boyz-with-fun-practice-record | Boyz with Fun (Practice Record) | yt=8I9d5ZFKMCM | https://www.youtube.com/watch?v=8I9d5ZFKMCM | dura 251 s | ~118 BPM | energía high
run | RUN | yt=wKysONrSmew | https://www.youtube.com/watch?v=wKysONrSmew | duración: mídela | ~128 BPM | energía high
run-dance-practice | RUN (Dance Practice) | yt=9S3ZhJGv8JM | https://www.youtube.com/watch?v=9S3ZhJGv8JM | dura 237 s | ~128 BPM | energía high
butterfly-practice-record | Butterfly (Practice Record) | yt=jucstn9Uonk | https://www.youtube.com/watch?v=jucstn9Uonk | dura 243 s | ~75 BPM | energía ballad
for-you | FOR YOU | yt=TTG6nxwdhyA | https://www.youtube.com/watch?v=TTG6nxwdhyA | duración: mídela | ~96 BPM | energía mid
i-need-u-jp | I NEED U (Japanese ver.) | yt=LYAcYSmaLoc | https://www.youtube.com/watch?v=LYAcYSmaLoc | dura 219 s | ~79 BPM | energía mid
perfect-man-cover | Perfect Man (cover de SHINHWA) | yt=AMMx1hOwH-4 | https://www.youtube.com/watch?v=AMMx1hOwH-4 | dura 141 s | ~130 BPM | energía high
as-i-told-you-cover | As I Told You (cover de Kim Sung Jae) | yt=inNYQUC6dFs | https://www.youtube.com/watch?v=inNYQUC6dFs | dura 161 s | ~112 BPM | energía high
do-you | Do You | yt=0XAxf8aFtL4 | https://www.youtube.com/watch?v=0XAxf8aFtL4 | dura 188 s | ~90 BPM | energía mid
joke | Joke | yt=TfenCTabhDY | https://www.youtube.com/watch?v=TfenCTabhDY | dura 199 s | ~92 BPM | energía high
awakening | Awakening | yt=JKBM9y3EuDQ | https://www.youtube.com/watch?v=JKBM9y3EuDQ | dura 160 s | ~80 BPM | energía mid
fire | FIRE | yt=ALj5MKjy2BU | https://www.youtube.com/watch?v=ALj5MKjy2BU | duración: mídela | ~168 BPM | energía high | RAP | paleta obligatoria #ff1a00 #ffd000 #ffffff
save-me | Save ME | yt=GZjt_sA2eso | https://www.youtube.com/watch?v=GZjt_sA2eso | dura 217 s | ~112 BPM | energía high
epilogue-young-forever | Epilogue: Young Forever | yt=LbvE0FV_70U | https://www.youtube.com/watch?v=LbvE0FV_70U | dura 205 s | ~87 BPM | energía mid
fire-dance-practice | FIRE (Dance Practice) | yt=sWuYspuN6U8 | https://www.youtube.com/watch?v=sWuYspuN6U8 | duración: mídela | ~168 BPM | energía high | RAP | paleta obligatoria #ff1a00 #ffd000 #ffffff
bst | Blood Sweat & Tears | yt=hmE9f-TEutc | https://www.youtube.com/watch?v=hmE9f-TEutc | dura 363 s | ~93 BPM | energía mid
boy-meets-evil | Boy Meets Evil (Comeback Trailer) | yt=iJJSh-eEdRk | https://www.youtube.com/watch?v=iJJSh-eEdRk | dura 173 s | ~90 BPM | energía high
bst-dance-practice | Blood Sweat & Tears (Dance Practice) | yt=v8z1TtlY1no | https://www.youtube.com/watch?v=v8z1TtlY1no | dura 216 s | ~93 BPM | energía mid
agust-d | Agust D | yt=3Y_Eiyg4bfk | https://www.youtube.com/watch?v=3Y_Eiyg4bfk | dura 186 s | ~87 BPM | energía high | RAP
spring-day | Spring Day | yt=xEeFrLSkMm8 | https://www.youtube.com/watch?v=xEeFrLSkMm8 | duración: mídela | ~107 BPM | energía ballad
not-today | Not Today | yt=9DwzBICPhdM | https://www.youtube.com/watch?v=9DwzBICPhdM | dura 290 s | ~110 BPM | energía high | RAP
not-today-dance-practice | Not Today (Dance Practice) | yt=_PwYjNh1bww | https://www.youtube.com/watch?v=_PwYjNh1bww | dura 234 s | ~110 BPM | energía high | RAP
spring-day-dance-practice | Spring Day (Dance Practice) | yt=_AlODdAInRY | https://www.youtube.com/watch?v=_AlODdAInRY | dura 278 s | ~107 BPM | energía ballad
spring-day-dance-practice-lovely | Spring Day (Dance Practice, Lovely ver.) | yt=8ZbPyzh3pio | https://www.youtube.com/watch?v=8ZbPyzh3pio | duración: mídela | ~107 BPM | energía ballad
dna | DNA | yt=MBdVXkSdhwU | https://www.youtube.com/watch?v=MBdVXkSdhwU | dura 255 s | ~130 BPM | energía high
mic-drop | MIC Drop (Steve Aoki Remix) | yt=kTlv5_Bs8aw | https://www.youtube.com/watch?v=kTlv5_Bs8aw | duración: mídela | ~85 BPM | energía high | RAP
serendipity | Serendipity (Comeback Trailer) | yt=BEMaH9Sm3lQ | https://www.youtube.com/watch?v=BEMaH9Sm3lQ | dura 152 s | ~89 BPM | energía ballad
dna-dance-practice | DNA (Dance Practice) | yt=GEIU_7v40Dw | https://www.youtube.com/watch?v=GEIU_7v40Dw | duración: mídela | ~130 BPM | energía high
mic-drop-dance-practice | MIC Drop (Dance Practice, MAMA ver.) | yt=eRkpkveBWyo | https://www.youtube.com/watch?v=eRkpkveBWyo | duración: mídela | ~85 BPM | energía high | RAP
bst-jp | Blood Sweat & Tears (Japanese ver.) | yt=7OX7dIRReSA | https://www.youtube.com/watch?v=7OX7dIRReSA | dura 253 s | ~93 BPM | energía mid
we-dont-talk-anymore-cover | We Don't Talk Anymore (cover de Charlie Puth, con Jung Kook) | yt=RbctNBlXBJc | https://www.youtube.com/watch?v=RbctNBlXBJc | duración: mídela | ~100 BPM | energía mid
lost-stars-cover | Lost Stars (cover de Adam Levine) | yt=VLzRQCIZrmE | https://www.youtube.com/watch?v=VLzRQCIZrmE | duración: mídela | ~84 BPM | energía ballad
christmas-song-cover | The Christmas Song (cover de Nat King Cole) | yt=fjTvhaDsRDg | https://www.youtube.com/watch?v=fjTvhaDsRDg | dura 139 s | ~70 BPM | energía ballad
let-there-be-love-cover | Let There Be Love (cover de Oasis, BBC Live Lounge) | yt=2davNWu3mr4 | https://www.youtube.com/watch?v=2davNWu3mr4 | dura 186 s | ~76 BPM | energía ballad
change-rm | Change (with Wale) | yt=9rAyprZdo7o | https://www.youtube.com/watch?v=9rAyprZdo7o | dura 289 s | ~95 BPM | energía mid
euphoria | Euphoria | yt=kX0vO4vlJuU | https://www.youtube.com/watch?v=kX0vO4vlJuU | duración: mídela | ~105 BPM | energía mid
fake-love | FAKE LOVE | yt=7C2z4GqqS5E | https://www.youtube.com/watch?v=7C2z4GqqS5E | dura 319 s | ~78 BPM | energía mid
singularity | Singularity (Comeback Trailer) | yt=p8npDG2ulKQ | https://www.youtube.com/watch?v=p8npDG2ulKQ | dura 212 s | ~78 BPM | energía ballad
fake-love-dance-practice | FAKE LOVE (Dance Practice) | yt=nQySbNGu4g0 | https://www.youtube.com/watch?v=nQySbNGu4g0 | duración: mídela | ~78 BPM | energía mid
airplane-pt2-practice-record | Airplane pt.2 (Practice Record) | yt=U2cgZLs-3Ag | https://www.youtube.com/watch?v=U2cgZLs-3Ag | dura 219 s | ~104 BPM | energía mid
anpanman-practice-record | Anpanman (Practice Record) | yt=gEzOk284TDg | https://www.youtube.com/watch?v=gEzOk284TDg | dura 235 s | ~140 BPM | energía high
idol | IDOL | yt=pBuZEGYXA6E | https://www.youtube.com/watch?v=pBuZEGYXA6E | duración: mídela | ~126 BPM | energía high | RAP
epiphany | Epiphany (Comeback Trailer) | yt=fIkZOLsnoqY | https://www.youtube.com/watch?v=fIkZOLsnoqY | dura 262 s | ~83 BPM | energía ballad
idol-nicki | IDOL (feat. Nicki Minaj) | yt=K1scjjbfNsk | https://www.youtube.com/watch?v=K1scjjbfNsk | duración: mídela | ~126 BPM | energía high | RAP
idol-dance-practice | IDOL (Dance Practice) | yt=bhWXw56puNY | https://www.youtube.com/watch?v=bhWXw56puNY | duración: mídela | ~126 BPM | energía high | RAP
airplane-pt2-jp | Airplane pt.2 (Japanese ver.) | yt=CxnJf0tWu48 | https://www.youtube.com/watch?v=CxnJf0tWu48 | duración: mídela | ~104 BPM | energía mid
waste-it-on-me | Waste It On Me | yt=G7UWsXZbUkQ | https://www.youtube.com/watch?v=G7UWsXZbUkQ | duración: mídela | ~96 BPM | energía mid
forever-rain | forever rain | yt=Cvb76hBX_Oc | https://www.youtube.com/watch?v=Cvb76hBX_Oc | dura 268 s | ~80 BPM | energía ballad
seoul-rm | seoul (prod. HONNE) | yt=F8wI5ZosdRA | https://www.youtube.com/watch?v=F8wI5ZosdRA | dura 274 s | ~90 BPM | energía mid
daydream | Daydream | yt=OK3GJ0WIQ8s | https://www.youtube.com/watch?v=OK3GJ0WIQ8s | dura 229 s | ~105 BPM | energía high
blue-side | Blue Side | yt=OZD_EU_hMUQ | https://www.youtube.com/watch?v=OZD_EU_hMUQ | dura 199 s | ~90 BPM | energía ballad
bwl | Boy With Luv (feat. Halsey) | yt=XsX3ATc3FbA | https://www.youtube.com/watch?v=XsX3ATc3FbA | duración: mídela | ~120 BPM | energía high
make-it-right | Make It Right (feat. Lauv) | yt=eXBu09fwe3I | https://www.youtube.com/watch?v=eXBu09fwe3I | dura 257 s | ~106 BPM | energía mid
persona | Persona (Comeback Trailer) | yt=M9Uy0opVF3s | https://www.youtube.com/watch?v=M9Uy0opVF3s | dura 178 s | ~79 BPM | energía high
bwl-dance-practice | Boy With Luv (Dance Practice) | yt=CzvfbRbEjww | https://www.youtube.com/watch?v=CzvfbRbEjww | duración: mídela | ~120 BPM | energía high
dionysus-dance-practice | Dionysus (Dance Practice) | yt=QmgcyLozkbQ | https://www.youtube.com/watch?v=QmgcyLozkbQ | dura 248 s | ~176 BPM | energía high | RAP
dionysus-mma-dance-practice | Dionysus (2019 MMA, Dance Practice) | yt=bccr1BwNI0Y | https://www.youtube.com/watch?v=bccr1BwNI0Y | duración: mídela | ~176 BPM | energía high | RAP
dionysus-mma-intro-dance-practice | Dionysus (2019 MMA Intro, Dance Practice) | yt=GYs4bRYZxIA | https://www.youtube.com/watch?v=GYs4bRYZxIA | dura 539 s | ~176 BPM | energía high | RAP
lights | Lights | yt=eaUpme4jalE | https://www.youtube.com/watch?v=eaUpme4jalE | duración: mídela | ~75 BPM | energía ballad
heartbeat | Heartbeat (BTS WORLD OST) | yt=aKSxbt-O6TA | https://www.youtube.com/watch?v=aKSxbt-O6TA | dura 257 s | ~87 BPM | energía ballad
chicken-noodle-soup | Chicken Noodle Soup (feat. Becky G) | yt=i23NEQEFpgQ | https://www.youtube.com/watch?v=i23NEQEFpgQ | duración: mídela | ~95 BPM | energía high
winter-bear | Winter Bear | yt=pk7ESz6vtyA | https://www.youtube.com/watch?v=pk7ESz6vtyA | dura 211 s | ~70 BPM | energía ballad
snow-flower | Snow Flower (feat. Peakboy) | yt=2nY0spA5UL4 | https://www.youtube.com/watch?v=2nY0spA5UL4 | dura 229 s | ~82 BPM | energía ballad
on | ON | yt=mPVDGOVjRQ0 | https://www.youtube.com/watch?v=mPVDGOVjRQ0 | duración: mídela | ~106 BPM | energía high | RAP
black-swan | Black Swan | yt=0lapF4DQPKQ | https://www.youtube.com/watch?v=0lapF4DQPKQ | dura 218 s | ~93 BPM | energía mid
on-kinetic | ON (Kinetic Manifesto Film) | yt=gwMa6gpoE9I | https://www.youtube.com/watch?v=gwMa6gpoE9I | duración: mídela | ~106 BPM | energía high | RAP
black-swan-art-film | Black Swan (Art Film) | yt=vGbuUFRdYqU | https://www.youtube.com/watch?v=vGbuUFRdYqU | dura 331 s | ~93 BPM | energía mid
on-dance-practice | ON (Dance Practice) | yt=VkuEzN8IS_o | https://www.youtube.com/watch?v=VkuEzN8IS_o | duración: mídela | ~106 BPM | energía high | RAP
black-swan-dance-practice | Black Swan (Dance Practice) | yt=fTS1jAhWPbw | https://www.youtube.com/watch?v=fTS1jAhWPbw | dura 204 s | ~93 BPM | energía mid
on-mama-dance-practice | ON (2020 MAMA, Dance Practice) | yt=81sNq45I48s | https://www.youtube.com/watch?v=81sNq45I48s | duración: mídela | ~106 BPM | energía high | RAP
stay-gold | Stay Gold | yt=9IHwqdz8Xhw | https://www.youtube.com/watch?v=9IHwqdz8Xhw | duración: mídela | ~89 BPM | energía mid
daechwita | Daechwita | yt=qGjAWJ2zWWI | https://www.youtube.com/watch?v=qGjAWJ2zWWI | dura 268 s | ~86 BPM | energía high | RAP
christmas-love | Christmas Love | yt=LDPSNwJPnGY | https://www.youtube.com/watch?v=LDPSNwJPnGY | dura 198 s | ~96 BPM | energía mid
eight-iu | eight (IU, prod. & feat. SUGA) | yt=TgOu00Mf3kI | https://www.youtube.com/watch?v=TgOu00Mf3kI | dura 222 s | ~120 BPM | energía mid
blueberry-eyes | Blueberry Eyes (MAX feat. SUGA) | yt=xcoEL6XwCN4 | https://www.youtube.com/watch?v=xcoEL6XwCN4 | duración: mídela | ~96 BPM | energía mid
over-the-horizon | Over the Horizon (arreglo de SUGA) | yt=0IR2dYcyTCs | https://www.youtube.com/watch?v=0IR2dYcyTCs | dura 183 s | ~80 BPM | energía ballad
abyss | Abyss | yt=aqtSOksH-NE | https://www.youtube.com/watch?v=aqtSOksH-NE | dura 155 s | ~72 BPM | energía ballad
super-tuna | Super Tuna (Special Video) | yt=ArHGiOxYwHM | https://www.youtube.com/watch?v=ArHGiOxYwHM | dura 131 s | ~128 BPM | energía high
super-tuna-performance | Super Tuna (Special Performance Video) | yt=cQA7VKSvXFM | https://www.youtube.com/watch?v=cQA7VKSvXFM | dura 73 s | ~128 BPM | energía high
life-goes-on | Life Goes On | yt=-5q5mZbe3V8 | https://www.youtube.com/watch?v=-5q5mZbe3V8 | duración: mídela | ~81 BPM | energía ballad
dynamite-bside | Dynamite (B-side) | yt=BV2FdDmGiW0 | https://www.youtube.com/watch?v=BV2FdDmGiW0 | dura 227 s | ~114 BPM | energía high
dynamite-choreo | Dynamite (Choreography ver.) | yt=BflFNMl_UWY | https://www.youtube.com/watch?v=BflFNMl_UWY | dura 206 s | ~114 BPM | energía high
dynamite-dance-practice | Dynamite (Dance Practice, Cute & Lovely ver.) | yt=WhDsAW1ZzZ8 | https://www.youtube.com/watch?v=WhDsAW1ZzZ8 | dura 205 s | ~114 BPM | energía high
dynamite-dance-practice-original | Dynamite (Dance Practice) | yt=CN4fffh7gmk | https://www.youtube.com/watch?v=CN4fffh7gmk | dura 205 s | ~114 BPM | energía high
dynamite-mma-dance-break | Dynamite (2020 MMA Dance Break Practice) | yt=uBZXCkwCKxw | https://www.youtube.com/watch?v=uBZXCkwCKxw | dura 230 s | ~114 BPM | energía high
dynamite-sing-with-me | Sing 'Dynamite' with me | yt=JvjvbBDqdgw | https://www.youtube.com/watch?v=JvjvbBDqdgw | dura 197 s | ~114 BPM | energía high
dynamite-sing-with-me-army | Sing 'Dynamite' with me (feat. ARMY) | yt=e07LQnuHKnI | https://www.youtube.com/watch?v=e07LQnuHKnI | duración: mídela | ~114 BPM | energía high
dynamite-sing-with-me-holiday | Sing 'Dynamite' with me (Holiday Remix) | yt=y8pTFwksO7s | https://www.youtube.com/watch?v=y8pTFwksO7s | duración: mídela | ~114 BPM | energía high
life-goes-on-video-call-rm | Life Goes On (Video Call ver., RM) | yt=oz9xoFyZnDo | https://www.youtube.com/watch?v=oz9xoFyZnDo | duración: mídela | ~81 BPM | energía ballad
film-out | Film out | yt=zFT3f9biz68 | https://www.youtube.com/watch?v=zFT3f9biz68 | duración: mídela | ~76 BPM | energía ballad
butter | Butter | yt=WMweEpGlu_U | https://www.youtube.com/watch?v=WMweEpGlu_U | duración: mídela | ~110 BPM | energía high
ptd | Permission to Dance | yt=CuklIb9d3fI | https://www.youtube.com/watch?v=CuklIb9d3fI | duración: mídela | ~125 BPM | energía high
butter-hotter | Butter (Hotter Remix) | yt=YLXfyHsfFz0 | https://www.youtube.com/watch?v=YLXfyHsfFz0 | duración: mídela | ~110 BPM | energía high
butter-dance-practice | Butter (Dance Practice) | yt=ujf3iJoWgrM | https://www.youtube.com/watch?v=ujf3iJoWgrM | duración: mídela | ~110 BPM | energía high
ptd-dance-practice | Permission to Dance (Dance Practice) | yt=0xSFPome3Tc | https://www.youtube.com/watch?v=0xSFPome3Tc | duración: mídela | ~125 BPM | energía high
butter-spv | Butter (Special Performance Video) | yt=DbXMjAYSa68 | https://www.youtube.com/watch?v=DbXMjAYSa68 | duración: mídela | ~110 BPM | energía high
butter-megan-spv | Butter (feat. Megan Thee Stallion) (Special Performance Video) | yt=IkeZX2hnoOk | https://www.youtube.com/watch?v=IkeZX2hnoOk | duración: mídela | ~110 BPM | energía high
my-universe | My Universe | yt=3YqPKLZF_WU | https://www.youtube.com/watch?v=3YqPKLZF_WU | duración: mídela | ~105 BPM | energía mid
yet-to-come | Yet To Come | yt=kXpOEzNZ8hQ | https://www.youtube.com/watch?v=kXpOEzNZ8hQ | duración: mídela | ~87 BPM | energía ballad
run-bts-dance-practice | Run BTS (Dance Practice) | yt=aqW4xXUgmno | https://www.youtube.com/watch?v=aqW4xXUgmno | duración: mídela | ~128 BPM | energía high
bad-decisions | Bad Decisions | yt=BGNkkVrJZks | https://www.youtube.com/watch?v=BGNkkVrJZks | duración: mídela | ~124 BPM | energía high
my-you | My You | yt=_yTP_L8fC-k | https://www.youtube.com/watch?v=_yTP_L8fC-k | duración: mídela | ~76 BPM | energía ballad
that-that | That That (PSY prod. & feat. SUGA) | yt=8dJyRm2jJ-U | https://www.youtube.com/watch?v=8dJyRm2jJ-U | duración: mídela | ~130 BPM | energía high
left-and-right | Left and Right (Charlie Puth feat. Jung Kook) | yt=a7GITgqwDVg | https://www.youtube.com/watch?v=a7GITgqwDVg | duración: mídela | ~95 BPM | energía mid
more | MORE | yt=pKdBFeewZYE | https://www.youtube.com/watch?v=pKdBFeewZYE | duración: mídela | ~100 BPM | energía high
arson | Arson | yt=QmpTkkaKYSU | https://www.youtube.com/watch?v=QmpTkkaKYSU | duración: mídela | ~90 BPM | energía high
future-jhope | Future (Visualizer) | yt=Fh2PTrTaxv0 | https://www.youtube.com/watch?v=Fh2PTrTaxv0 | duración: mídela | ~105 BPM | energía high
equal-sign | = (Equal Sign) (Visualizer) | yt=_hNuNiNhcI4 | https://www.youtube.com/watch?v=_hNuNiNhcI4 | duración: mídela | ~90 BPM | energía mid
rush-hour | Rush Hour (Crush feat. j-hope) | yt=PS0qkO5qty0 | https://www.youtube.com/watch?v=PS0qkO5qty0 | duración: mídela | ~100 BPM | energía high
dreamers | Dreamers (feat. Fahad Al Kubaisi) | yt=IwzkfMmNMpM | https://www.youtube.com/watch?v=IwzkfMmNMpM | duración: mídela | ~95 BPM | energía high
the-astronaut | The Astronaut | yt=c6ASQOwKkhk | https://www.youtube.com/watch?v=c6ASQOwKkhk | duración: mídela | ~120 BPM | energía mid
wild-flower | Wild Flower (with youjeen) | yt=u18be_kRmC0 | https://www.youtube.com/watch?v=u18be_kRmC0 | duración: mídela | ~75 BPM | energía mid
still-life | Still Life (with Anderson .Paak) | yt=2vfmL4q2koo | https://www.youtube.com/watch?v=2vfmL4q2koo | duración: mídela | ~105 BPM | energía high
set-me-free-pt2 | Set Me Free Pt.2 | yt=UaywgAqcLxI | https://www.youtube.com/watch?v=UaywgAqcLxI | duración: mídela | ~100 BPM | energía high
like-crazy | Like Crazy | yt=nOI67IDlNMQ | https://www.youtube.com/watch?v=nOI67IDlNMQ | duración: mídela | ~120 BPM | energía mid
vibe | VIBE (TAEYANG feat. Jimin) | yt=cXCBiF67jLM | https://www.youtube.com/watch?v=cXCBiF67jLM | duración: mídela | ~110 BPM | energía high
haegeum | Haegeum | yt=iy9qZR_OGa0 | https://www.youtube.com/watch?v=iy9qZR_OGa0 | duración: mídela | ~88 BPM | energía high | RAP
people-pt2 | People Pt.2 (feat. IU) | yt=uVD-YgzDzyY | https://www.youtube.com/watch?v=uVD-YgzDzyY | duración: mídela | ~89 BPM | energía ballad
haegeum-dance-practice | Haegeum (Dance Practice) | yt=0zN2YxoPnD8 | https://www.youtube.com/watch?v=0zN2YxoPnD8 | duración: mídela | ~88 BPM | energía high | RAP
on-the-street | on the street (with J. Cole) | yt=r6WbbU_lLCA | https://www.youtube.com/watch?v=r6WbbU_lLCA | duración: mídela | ~83 BPM | energía mid
love-me-again | Love Me Again | yt=HYzyRHAHJl8 | https://www.youtube.com/watch?v=HYzyRHAHJl8 | duración: mídela | ~93 BPM | energía ballad
slow-dancing | Slow Dancing | yt=eI0iTRS0Ha8 | https://www.youtube.com/watch?v=eI0iTRS0Ha8 | duración: mídela | ~81 BPM | energía ballad
rainy-days | Rainy Days | yt=yTsINmrAK4I | https://www.youtube.com/watch?v=yTsINmrAK4I | duración: mídela | ~80 BPM | energía ballad
blue-v | Blue | yt=sIh9_cNCwPc | https://www.youtube.com/watch?v=sIh9_cNCwPc | duración: mídela | ~86 BPM | energía mid
seven | Seven (feat. Latto) | yt=QU9c0053UAU | https://www.youtube.com/watch?v=QU9c0053UAU | duración: mídela | ~125 BPM | energía high
3d | 3D (feat. Jack Harlow) | yt=mHNCM-YALSA | https://www.youtube.com/watch?v=mHNCM-YALSA | duración: mídela | ~108 BPM | energía high
standing-next-to-you | Standing Next to You | yt=UNo0TG9LwwI | https://www.youtube.com/watch?v=UNo0TG9LwwI | duración: mídela | ~106 BPM | energía high
hate-you | Hate You (Visualizer) | yt=tAcKfnf0zv4 | https://www.youtube.com/watch?v=tAcKfnf0zv4 | duración: mídela | ~80 BPM | energía ballad
seven-performance | Seven (feat. Latto) (Performance Video) | yt=1QYBiNRu1ok | https://www.youtube.com/watch?v=1QYBiNRu1ok | duración: mídela | ~125 BPM | energía high
closer-than-this | Closer Than This | yt=zzKV_T9ybe8 | https://www.youtube.com/watch?v=zzKV_T9ybe8 | duración: mídela | ~90 BPM | energía ballad
neuron | NEURON | yt=z4Rg_VgOlJU | https://www.youtube.com/watch?v=z4Rg_VgOlJU | duración: mídela | ~95 BPM | energía high
never-let-go | Never Let Go (Lyric Video) | yt=J_n4Ysi5iUM | https://www.youtube.com/watch?v=J_n4Ysi5iUM | duración: mídela | ~92 BPM | energía mid
lost-rm | LOST! | yt=kq6UVL3H6SI | https://www.youtube.com/watch?v=kq6UVL3H6SI | duración: mídela | ~120 BPM | energía mid
come-back-to-me | Come back to me | yt=NrfikKxF4Ps | https://www.youtube.com/watch?v=NrfikKxF4Ps | duración: mídela | ~74 BPM | energía ballad
groin | Groin | yt=ChAXAFqzBpw | https://www.youtube.com/watch?v=ChAXAFqzBpw | duración: mídela | ~110 BPM | energía high
credit-roll | ㅠㅠ (Credit Roll) | yt=p6w64hIPloI | https://www.youtube.com/watch?v=p6w64hIPloI | duración: mídela | ~95 BPM | energía mid
smeraldo-garden-marching-band | Smeraldo Garden Marching Band (feat. Loco) | yt=LIER2z3DBe8 | https://www.youtube.com/watch?v=LIER2z3DBe8 | duración: mídela | ~108 BPM | energía mid
who-jimin | Who | yt=Av9DvtlJ9_M | https://www.youtube.com/watch?v=Av9DvtlJ9_M | duración: mídela | ~120 BPM | energía high
be-mine-en | Be Mine (English Version) (Visualizer) | yt=MYrZ5T3jFmA | https://www.youtube.com/watch?v=MYrZ5T3jFmA | duración: mídela | ~105 BPM | energía mid
who-acoustic-remix | Who (Acoustic Remix) (Visualizer) | yt=BKRfGu7qWM4 | https://www.youtube.com/watch?v=BKRfGu7qWM4 | duración: mídela | ~120 BPM | energía mid
friends-v | FRI(END)S | yt=62peQdQv4uo | https://www.youtube.com/watch?v=62peQdQv4uo | duración: mídela | ~92 BPM | energía mid
winter-ahead | Winter Ahead (with PARK HYO SHIN) | yt=HAWYOuMGkK0 | https://www.youtube.com/watch?v=HAWYOuMGkK0 | duración: mídela | ~72 BPM | energía ballad
ill-be-there | I'll Be There | yt=PWjZ3p1jNho | https://www.youtube.com/watch?v=PWjZ3p1jNho | duración: mídela | ~130 BPM | energía high
running-wild | Running Wild | yt=uoHol5Dr_go | https://www.youtube.com/watch?v=uoHol5Dr_go | duración: mídela | ~118 BPM | energía mid
sweet-dreams | Sweet Dreams (feat. Miguel) | yt=kW1e8NtdW90 | https://www.youtube.com/watch?v=kW1e8NtdW90 | duración: mídela | ~85 BPM | energía mid
mona-lisa | MONA LISA | yt=ECqGCH1TfLY | https://www.youtube.com/watch?v=ECqGCH1TfLY | duración: mídela | ~105 BPM | energía high
killin-it-girl | Killin' It Girl (feat. GloRilla) | yt=q9leDzlNEaY | https://www.youtube.com/watch?v=q9leDzlNEaY | duración: mídela | ~115 BPM | energía high
dont-say-you-love-me | Don't Say You Love Me | yt=o7BcyAd6rqg | https://www.youtube.com/watch?v=o7BcyAd6rqg | duración: mídela | ~82 BPM | energía ballad
close-to-you | Close to You (When the Stars Gossip OST) | yt=NFeI7hJvfeA | https://www.youtube.com/watch?v=NFeI7hJvfeA | duración: mídela | ~76 BPM | energía ballad
swim | SWIM | yt=b4iVv91Z6lY | https://www.youtube.com/watch?v=b4iVv91Z6lY | duración: mídela | ~100 BPM | energía mid
hooligan | Hooligan | yt=diBO0gMuTXo | https://www.youtube.com/watch?v=diBO0gMuTXo | duración: mídela | ~120 BPM | energía high | RAP
two-point-o | 2.0 | yt=_gyultVTesk | https://www.youtube.com/watch?v=_gyultVTesk | duración: mídela | ~110 BPM | energía high | RAP
normal | NORMAL | yt=GEk4jHwfFTA | https://www.youtube.com/watch?v=GEk4jHwfFTA | duración: mídela | ~100 BPM | energía mid
merry-go-round | Merry Go Round | yt=eJXL4-4m5nY | https://www.youtube.com/watch?v=eJXL4-4m5nY | duración: mídela | ~105 BPM | energía mid
swim-performance | SWIM (Performance Video) | yt=h-Y97xErGL8 | https://www.youtube.com/watch?v=h-Y97xErGL8 | duración: mídela | ~100 BPM | energía mid
two-point-o-dance-practice | 2.0 (Dance Practice) | yt=A1nu9jg6ciY | https://www.youtube.com/watch?v=A1nu9jg6ciY | duración: mídela | ~110 BPM | energía high | RAP
hooligan-dance-practice | Hooligan (Dance Practice) | yt=qWDNVP1pb48 | https://www.youtube.com/watch?v=qWDNVP1pb48 | duración: mídela | ~120 BPM | energía high | RAP
swim-dance-practice | SWIM (Dance Practice) | yt=uYcNZLJ3KmU | https://www.youtube.com/watch?v=uYcNZLJ3KmU | duración: mídela | ~100 BPM | energía mid
swim-jin-remix | SWIM with Jin (Alternative Rock Remix) (Visualizer) | yt=o7V0iD8cAaI | https://www.youtube.com/watch?v=o7V0iD8cAaI | duración: mídela | ~100 BPM | energía mid
swim-jhope-remix | SWIM with j-hope (Afrobeat Remix) (Visualizer) | yt=OzMc0PAA5HQ | https://www.youtube.com/watch?v=OzMc0PAA5HQ | duración: mídela | ~105 BPM | energía high
swim-jimin-remix | SWIM with Jimin (Slow Jam R&B Remix) (Visualizer) | yt=DfnDEzl2APE | https://www.youtube.com/watch?v=DfnDEzl2APE | duración: mídela | ~90 BPM | energía ballad