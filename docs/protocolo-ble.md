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
- **V4:** `[R, G, B, fundido]` (4 bytes). El 4.º byte es la **duración del fundido** que hace el propio ARMY Bomb
  hacia el color nuevo, ≈ 50 ms por unidad: 0 = instantáneo, 1 ≈ 50 ms, 5 ≈ 0,4 s, 20 ≈ 1 s, 50 ≈ 2,4 s, 255 ≈ 12 s
  (medido grabando un Ver.4 a 30 fps, 2026-11-06). Con un color fijo no se nota (no hay nada que fundir).
- **SE/V3:** `[1, 1, 11, 0, 0, R, G, B, 0, 0, checksum]` con `checksum = (suma de los 10 bytes − 2) & 0xFF`

## Ritmo de escritura (regla propia de `src/ble.js`)
- Una escritura cada ≥ 20 ms; tras un error sube a 120 ms y vuelve a bajar poco a poco con escrituras correctas.
- Solo se envía el **último** color pendiente (descarta los intermedios) → evita colas y desfase.
- Los fundidos se hacen en la app enviando colores intermedios.

## Ver.4: otras características (medido con un Ver.4 real, firmware 1.1, 2026-11-06)
- Dispositivo: «BTS OFFICIAL LIGHT STICK VER.4», fabricante «Elcomtec», modelo `BTSNN26JOS900NN0`.
- `fe01/ff01` [lectura, escritura con respuesta]: el color actual `[R, G, B, fundido]`.
- `fe01/ff02` [lectura, escritura]: estado. Se lee `03 00 00 00` (encendido normal). `00`, `01`, `02` y `04` lo
  apagan; `05`–`09` no cambian nada visible. Tras volver a `03` hay que reenviar el color en `ff01`.
  Para apagar en un *blackout*, escribe negro en `ff01`; no uses `ff02`.
- `fe02/ff04` (2 bytes), `fe04/ff06` (2 bytes, solo lectura), `fe06/ff13` (1 byte): sin documentar. **No escribir**
  en `ff04` ni `ff13` (riesgo de dejarlo en un estado raro; en otros chips hay comandos de actualización de firmware).
- **Paquetes de más de 4 bytes en `ff01`: no.** Con 8 bytes usa solo el primer color; con 12 dejó el ARMY Bomb fijo en
  rojo y sin responder hasta sacar las pilas. Por Bluetooth no hay control por pétalo: un solo color para todo el globo.
- Los 8 modos del botón ② (Slow, Normal, Fast, Rotate, Rising, Lightning, Wave, Steady On), el cambio de color (①) y
  Color Shaking corren en el propio ARMY Bomb y no se ven ni se activan por Bluetooth. Algunos usan zonas del globo
  (se vio un degradado rojo arriba y amarillo abajo), pero eso solo lo controla el firmware o el modo concierto.

## Cómo lo usa `src/ble.js`
- `v4Fade()`: si el brillo sube de golpe (golpe, destello), fundido 0 para que el ataque sea nítido; si baja o cambia
  de tono, el ARMY Bomb funde durante el hueco hasta la próxima escritura (1–4 pasos). Así no se ven escalones aunque
  el Bluetooth vaya lento.
- `setColor(rgb, fadeMs)` permite pedir un fundido largo puntual (p. ej. el latido de prueba de la guía).
