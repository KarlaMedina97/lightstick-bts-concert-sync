# Añadido para Gemini: cada sonido fuerte debe resplandecer en el ARMY Bomb

Pégalo en la misma sesión de Gemini, después del prompt completo (o antes de pedir la siguiente parte).

---

A partir de ahora, además de todas las reglas anteriores, diseña cada secuencia **escuchando el sonido con atención**: el ARMY Bomb tiene que hacer sentir la canción, no solo acompañarla.

## 1. Cada sonido fuerte resplandece
- **Golpes de bombo, bajos que retumban, caídas de beat, golpes de caja, palmas, remates y explosiones** son momentos de luz: anótalos en `acentos` con su segundo exacto (un decimal) y que la luz **resplandezca** ahí: brillo al máximo de golpe (ataque instantáneo) y caída suave después.
- Entre golpe y golpe la luz **no queda plana**: baja a una brasa del mismo color para que el siguiente golpe se note.
- Si los golpes son muy seguidos (más de 3 por segundo), elige los más fuertes: máximo 3 destellos por segundo, siempre.
- Los **retumbones de bajo** (808, sub-bass) piden color pleno y saturado; los **agudos brillantes** (platillos, sintetizadores, voces altas) piden un toque de blanco encima del color.
- Un **silencio o corte seco** de la música = apagón breve (`blackout`) justo ahí; el golpe que vuelve después entra al máximo.

## 2. La tonalidad del sonido elige el color y el brillo
- **Sonidos graves, oscuros o agresivos** (bajo distorsionado, guitarra pesada, rap duro): colores intensos y profundos (rojo, carmesí, naranja fuego, morado oscuro), brillo alto, golpes marcados (`hit`, `flame`, `pulse`).
- **Sonidos brillantes, alegres o de fiesta** (sintes, metales, coros): colores vivos y cálidos (amarillo, rosa, celeste), cambios al ritmo (`disco`, `duo`, `wave`, `sparkle`).
- **Sonidos suaves, emotivos o etéreos** (piano, cuerdas, voces dulces): colores fríos o pastel (celeste, lila, blanco tibio), brillo bajo y fundidos largos (`breathe`, `aurora`, `hold`).
- **Tensión que sube** (redobles, risers, voces que crecen): `rise` con brillo que crece de verdad tramo a tramo hasta el golpe del coro.

## 3. El aura de cada canción manda
Antes de diseñar, define en una frase el **aura** de la canción (ponla en `verificacion.imagen`) y haz que toda la secuencia la transmita:
- **Fuerza y poder** (p. ej. *We Are Bulletproof Pt.2*: mucha fuerza, rap, sonidos fuertes y retumbones): base oscura con golpes rojos y blancos que estallan en cada bombo y en cada remate del rap; los versos de rap a brillo ≥ 0,85 con `hit` en cada tiempo fuerte; el coro como una explosión continua de golpes (sin pasar de 3 por segundo); casi nunca luz quieta.
- **Fiesta y alegría** (p. ej. *Dynamite*): colores que cambian al compás, brillo alto y sostenido, chispas en los remates.
- **Melancolía o emoción** (p. ej. *Spring Day*, *I NEED U*): respiración lenta, colores fríos, el clímax crece con fundidos largos en vez de destellos.
- **Oscuridad o drama** (p. ej. *Blood Sweat & Tears*, *FAKE LOVE*): colores profundos, pausas con apagón, golpes solo en los acentos dramáticos.

## 4. Cómo se nota en el JSON
- Cada tramo con golpes fuertes tiene `acentos` con **todos** los golpes importantes (no 2 o 3 de muestra): en un coro de rap de 30 s puede haber 20 a 40 acentos.
- `sigue` dice qué sonido sigue la luz (p. ej. «bombo en 1 y 3; caja en 2 y 4; remate del rap al final de cada frase»).
- `evidencia` dice qué **sonido** arranca el tramo (p. ej. «entra el bajo distorsionado y un golpe de bombo doble»), además de lo que se ve.
- `brillo`/`brilloFin` reflejan la fuerza real del sonido: un tramo de rap con retumbones no puede tener brillo 0,5.
