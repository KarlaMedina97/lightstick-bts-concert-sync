# Prompt para Gemini: secuencia de luces del ARMY Bomb por marcas de tiempo

Cópialo en Gemini (app o AI Studio) junto con el enlace del video. Gemini ve el video y oye el audio; LumiParty no
puede oír el reproductor de YouTube, por eso el análisis de audio se hace allí. El resultado se valida con
`npm run check:sequence -- <archivo.json>` antes de usarlo.

Para otra canción cambia el bloque **Canción** (id, enlace, BPM del catálogo y colores medidos con
`npm run analyze:video`).

---

Eres diseñador o diseñadora de iluminación de conciertos. Vas a diseñar la secuencia de luz de **un lightstick**
(ARMY Bomb Ver.4) para una canción, mirando y escuchando su video musical oficial completo.

## Canción

- id: `dynamite`
- Video oficial: https://www.youtube.com/watch?v=gdZLi9oWNZg (BTS «Dynamite» Official MV)
- BPM aproximado en nuestro catálogo: 114 (verifícalo; si oyes otro, usa el tuyo y dilo).
- Colores que medimos en el video, cuadro a cuadro, por tramos aproximados de la duración (solo como pista visual; las secciones reales las decides tú):
  - primer 30 %: amarillo cálido `#ffc13f` y naranja `#ff802c`
  - 43–55 %: amarillo `#ffd851` y celeste `#65d2ff`
  - 55–68 %: celeste `#3accff`, coral `#ff733a`, azul `#639fff`
  - 68–80 %: azules `#4772ff`, `#2dbcff`, violeta `#684dff`
  - 80–95 %: amarillo `#ffd64a`, naranja `#ff8339`, lima `#d9ff63`
  - final: aguamarina `#66ffd1`
- Concepto curado (propuesta del proyecto): disco, arcoíris en el clímax; paleta rosa `#ff4fa3`, amarillo `#ffd23f`, celeste `#3ec1ff`, verde `#7cff6b`.

## Qué es el lightstick (límites reales)

- Muestra **un solo color RGB a la vez** para todo el globo (no hay pétalos o zonas controlables).
- Puede hacer **fundidos propios** entre colores (hasta ~12 s); los cortes secos también funcionan.
- Lo ve una **multitud**: tiene que ser legible y agradable, nunca caótico.
- **Seguridad (obligatorio):** máximo **3 destellos por segundo** en cualquier momento (WCAG 2.3.1), mejor ≤ 2,5. Nada de destellos rápidos continuos. Un destello rojo saturado cuenta doble: evítalo en ráfagas.

## Cómo analizar

1. Escucha el audio completo e identifica: tempo (BPM), el segundo exacto del **primer tiempo fuerte** (downbeat), pulsos, **acentos** (golpes, remates, entradas), **pausas** o cortes de la música, cambios de intensidad y las secciones: intro, verso, pre-coro, coro, verso 2, coro 2, puente, coro final, final (usa las que existan de verdad).
2. Mira la imagen: vestuario, escenario y luces de cada parte, para elegir colores que evoquen el ambiente y que **evolucionen** con la canción.
3. **No transcribas ni cites la letra.** No la necesitas: trabaja con el sonido y la imagen.

## Cómo diseñar

- Pulsos sincronizados con el ritmo; **reserva los destellos rápidos para acentos importantes** (lístalos en `acentos`).
- La luz **crece gradualmente** cuando sube la tensión (pre-coro, puente) y llega a su **máximo en los clímax** (coros, coro final).
- Partes suaves: brillo bajo, transiciones lentas o luz sostenida.
- **Pausas:** una atenuación breve o un apagón corto (efecto `blackout`), no destellos.
- Variaciones **reconocibles** entre secciones: que el coro 2 no sea igual al coro 1, que el final cierre el arco.
- Ataque nítido y caída suave: los golpes entran de golpe y se apagan con fundido.

## Qué entregar

1. **Primero, un JSON válido** (sin comentarios ni texto alrededor) con este formato exacto:

```json
{
  "formato": 1,
  "song": "dynamite",
  "yt": "gdZLi9oWNZg",
  "duracion": 0,
  "bpm": 0,
  "primerTiempo": 0,
  "verificacion": { "audio": "", "imagen": "", "confianza": "alta | media | baja", "dudas": [] },
  "paleta": [{ "nombre": "", "hex": "#rrggbb", "de": "" }],
  "tramos": [
    {
      "inicio": 0, "fin": 0,
      "seccion": "intro | verso | pre-coro | coro | verso 2 | coro 2 | puente | coro final | final | pausa",
      "sigue": "qué pulso o acento sigue la luz",
      "color": "#rrggbb", "color2": "#rrggbb o null",
      "brillo": 0.0, "brilloFin": 0.0,
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
- Tiempos en **segundos con un decimal**, medidos en el video oficial (0 = inicio del video). Los tramos van en orden, **sin huecos ni superposiciones**, desde 0 hasta `duracion`.
- `brillo` y `brilloFin` de 0 a 1 (inicio y fin del tramo; distintos si sube o baja).
- `cadaTiempos`: cada cuántos tiempos late la luz (1, 2, 4…; 0 si es sostenida).
- `destellosPorSeg` ≤ 3 siempre; `acentos` = segundos exactos de los golpes que merecen destello.
- Colores en hex de 6 dígitos, vivos (un LED apagado o gris se ve blanco o sucio).
- **No inventes marcas de tiempo.** Si no pudiste confirmar un tramo o un acento, ponlo en `verificacion.dudas` y baja `confianza`. No digas que está sincronizado si no lo comprobaste escuchando.

2. **Después del JSON**, una tabla legible para personas: tiempo, sección, pulso/acento, color, brillo, transición y efecto.
