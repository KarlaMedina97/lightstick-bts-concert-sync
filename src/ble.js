// Conexión Web Bluetooth con lightsticks compatibles.
// Protocolo documentado en docs/protocolo-ble.md (investigación de interoperabilidad).

const V4_BASE = "-0000-1000-8000-00805f9800c4";
const SE_SERVICE = "00010203-0405-0607-0809-0a0b0c0d1911";
const SE_CHAR = "00010203-0405-0607-0809-0a0b0c0d2b19";
const DEVICE_INFO = "0000180a-0000-1000-8000-00805f9b34fb";
const BATTERY = "0000180f-0000-1000-8000-00805f9b34fb";
const BATTERY_LEVEL = "00002a19-0000-1000-8000-00805f9b34fb";
const V4_SERVICES = ["fe01", "fe02", "fe03", "fe04", "fe06"].map((s) => `0001${s}${V4_BASE}`);
const V4_CHARS = ["ff01", "ff02", "ff04", "ff05", "ff06", "ff13"].map((c) => `0001${c}${V4_BASE}`);

const OPTIONAL_SERVICES = [SE_SERVICE, DEVICE_INFO, BATTERY, ...V4_SERVICES];
const FILTERS = [
  { name: "BTS LIGHTSTICK_SE" },
  { name: "multiM" },
  { name: "BTS LIGHTSTICK3" },
  { name: "BTS_V4 LS" },
  { namePrefix: "BBOMB-" },
];

export function bluetoothSupport() {
  if (!("bluetooth" in navigator)) {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    return { ok: false, reason: ios ? "ios" : "browser" };
  }
  if (!window.isSecureContext) return { ok: false, reason: "insecure" };
  return { ok: true };
}

function familyFromName(name = "") {
  if (name.startsWith("BBOMB-") || name.includes("BTS_V4")) return "v4";
  if (name.includes("multiM") || name.includes("LIGHTSTICK3") || name.includes("LIGHTSTICK_SE")) return "se";
  return null;
}

async function tryService(server, uuid) {
  try {
    return await server.getPrimaryService(uuid);
  } catch {
    return null;
  }
}

async function connectGatt(device, attempts = 3) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await device.gatt.connect();
    } catch (e) {
      lastError = e;
      try { device.gatt.disconnect(); } catch {}
      await new Promise((r) => setTimeout(r, 400 * i));
    }
  }
  throw lastError;
}

async function findV4Characteristic(server) {
  const writable = [];
  for (const uuid of V4_SERVICES) {
    const svc = await tryService(server, uuid);
    if (!svc) continue;
    const chars = await svc.getCharacteristics();
    writable.push(...chars.filter((c) => c.properties.write || c.properties.writeWithoutResponse));
  }
  for (const uuid of V4_CHARS) {
    const hit = writable.find((c) => c.uuid.toLowerCase() === uuid && c.properties.write);
    if (hit) return hit;
  }
  return writable.find((c) => c.properties.write) ?? null;
}

async function readBattery(server) {
  try {
    const svc = await server.getPrimaryService(BATTERY);
    const ch = await svc.getCharacteristic(BATTERY_LEVEL);
    return (await ch.readValue()).getUint8(0);
  } catch {
    return null;
  }
}

/** Construye el paquete de color según la familia del lightstick. */
export function buildPacket(family, [r, g, b], mode = 1) {
  if (family === "v4") return new Uint8Array([r, g, b, mode]);
  const bytes = [1, 1, 11, 0, 0, r, g, b, 0, 0];
  const sum = bytes.reduce((a, v) => a + v, 0);
  bytes.push((sum - 2) & 0xff);
  return new Uint8Array(bytes);
}

/**
 * Pide al usuario elegir una lightstick y la conecta.
 * @param {{showAll?: boolean}} opts showAll muestra cualquier dispositivo BLE.
 */
export async function requestStick({ showAll = false } = {}) {
  const device = await navigator.bluetooth.requestDevice(
    showAll ? { acceptAllDevices: true, optionalServices: OPTIONAL_SERVICES } : { filters: FILTERS, optionalServices: OPTIONAL_SERVICES },
  );
  return connectStick(device);
}

export async function connectStick(device) {
  const server = await connectGatt(device);
  let family = familyFromName(device.name);
  if (!family) {
    for (const uuid of V4_SERVICES) if (await tryService(server, uuid)) { family = "v4"; break; }
    if (!family && (await tryService(server, SE_SERVICE))) family = "se";
  }
  if (!family) {
    device.gatt.disconnect();
    throw new Error(`${device.name ?? "El dispositivo"} no parece ser una lightstick compatible.`);
  }
  const characteristic =
    family === "v4"
      ? await findV4Characteristic(server)
      : await (await server.getPrimaryService(SE_SERVICE)).getCharacteristic(SE_CHAR);
  if (!characteristic) throw new Error("No se encontró una característica de escritura.");
  const battery = await readBattery(server);
  return new Stick(device, characteristic, family, battery);
}

const MIN_INTERVAL = 20; // ms entre escrituras
const BACKOFF_INTERVAL = 120;

export class Stick {
  constructor(device, characteristic, family, battery) {
    this.device = device;
    this.characteristic = characteristic;
    this.family = family;
    this.battery = battery;
    this.id = device.id;
    this.name = device.name ?? "Lightstick";
    this.interval = MIN_INTERVAL;
    this.okWrites = 0;
    this.lastWrite = 0;
    this.pending = null;
    this.lastSent = null;
    this.busy = false;
  }

  get connected() {
    return this.device.gatt?.connected ?? false;
  }

  /** Envía el color más reciente; descarta los intermedios para no acumular retraso. */
  setColor(rgb) {
    const c = rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))));
    if (this.lastSent && c.every((v, i) => v === this.lastSent[i]) && !this.pending) return;
    this.pending = c;
    if (!this.busy) this.#pump();
  }

  async #pump() {
    this.busy = true;
    try {
      while (this.pending && this.connected) {
        const c = this.pending;
        this.pending = null;
        const wait = this.lastWrite + this.interval - performance.now();
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        const packet = buildPacket(this.family, c);
        try {
          if (this.family === "v4") await this.characteristic.writeValueWithResponse(packet);
          else await this.characteristic.writeValueWithoutResponse(packet);
          this.lastSent = c;
          this.lastWrite = performance.now();
          if (this.interval > MIN_INTERVAL && ++this.okWrites >= 8) {
            this.interval = Math.max(MIN_INTERVAL, this.interval - 15);
            this.okWrites = 0;
          }
        } catch {
          this.okWrites = 0;
          this.interval = BACKOFF_INTERVAL;
          this.lastWrite = performance.now();
        }
      }
    } finally {
      this.busy = false;
    }
  }

  disconnect() {
    try { this.device.gatt.disconnect(); } catch {}
  }
}
