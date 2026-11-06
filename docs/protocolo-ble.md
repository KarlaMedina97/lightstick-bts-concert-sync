# Notas de interoperabilidad (verificadas con hardware propio)

Notas escritas a mano para que la app hable con el ARMY Bomb (interoperabilidad). La implementación de `src/ble.js` es propia.

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

## Ritmo de escritura (regla propia de `src/ble.js`)
- Una escritura cada ≥ 20 ms; tras un error sube a 120 ms y vuelve a bajar poco a poco con escrituras correctas.
- Solo se envía el **último** color pendiente (descarta los intermedios) → evita colas y desfase.
- Los fundidos se hacen en la app enviando colores intermedios.
