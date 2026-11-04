# Notas: protocolo BLE del Army Bomb (observado en bora-waves.com, 2026-11-04)

Notas de interoperabilidad escritas a mano (sin copiar código del sitio).

## Descubrimiento (Web Bluetooth `requestDevice`)
Filtros por nombre: `BTS LIGHTSTICK_SE`, `multiM`, `BTS LIGHTSTICK3`, `BTS_V4 LS`, prefijo `BBOMB-`.

Familias:
- **SE / multiM / LIGHTSTICK3** (Ver. 2–3 / SE)
  - Servicio: `00010203-0405-0607-0809-0a0b0c0d1911`
  - Característica de escritura: `00010203-0405-0607-0809-0a0b0c0d2b19` (write **without** response)
- **V4** (`BTS_V4 LS`, `BBOMB-*`)
  - Servicios: `0001fe01..fe04`, `0001fe06` con base `-0000-1000-8000-00805f9800c4`
  - Característica preferida (en orden): `0001ff01`, `ff02`, `ff04`, `ff05`, `ff06`, `ff13` (misma base) — write **with** response
  - Identidad: leer `0001ff05` en servicio `0001fe03` → primeros 6 bytes invertidos = MAC
  - Estándar: Device Info `180a` (firmware `2a26`), Battery `180f` (`2a19`)

## Paquete de color
- **V4:** `[R, G, B, modo]` (4 bytes, modo 1 = sólido)
- **SE/V3:** `[1, 1, 11, 0, 0, R, G, B, 0, 0, checksum]` con `checksum = (suma de los 10 bytes − 2) & 0xFF`

## Ritmo de escritura (V4)
- Intervalo base 20 ms; tras error sube a 120 ms y baja 15 ms cada 8 escrituras OK.
- Solo se envía el **último** color pendiente (descarta los intermedios) → evita colas y desfase.

## Secuencias
- Datos renderizados en servidor (React Router loader).
- Cue: `{ id, start (s), duration (s), color "#rrggbb", mode: {type: "fade", direction: "in"|"out"}, trackId }`.
- Reloj de sincronía: `getCurrentTime()` del reproductor de YouTube embebido.
- Fades se emulan en el navegador enviando colores intermedios.
