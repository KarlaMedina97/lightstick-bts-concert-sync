// Conexión Web Bluetooth con lightsticks compatibles.
// Protocolo documentado en docs/protocolo-ble.md (investigación de interoperabilidad).

const V4_BASE = "-0000-1000-8000-00805f9800c4";
const SE_SERVICE = "00010203-0405-0607-0809-0a0b0c0d1911";
const SE_CHAR = "00010203-0405-0607-0809-0a0b0c0d2b19";
const DEVICE_INFO = "0000180a-0000-1000-8000-00805f9b34fb";
const BATTERY = "0000180f-0000-1000-8000-00805f9b34fb";
const BATTERY_LEVEL = "00002a19-0000-1000-8000-00805f9b34fb";
// Device Information (estándar): modelo, firmware y fabricante.
const DIS_CHARS = { model: "00002a24-0000-1000-8000-00805f9b34fb", firmware: "00002a26-0000-1000-8000-00805f9b34fb", maker: "00002a29-0000-1000-8000-00805f9b34fb" };
// V4: la identidad (con la MAC en los 6 primeros bytes, invertidos) está en ff05 del servicio fe03 (docs/protocolo-ble.md).
const V4_ID_SERVICE = `0001fe03${V4_BASE}`;
const V4_ID_CHAR = `0001ff05${V4_BASE}`;
export const LOW_BATTERY = 10; // % o menos: avisar que cambien las baterías
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

/** Brave trae Web Bluetooth apagado por defecto (se activa en brave://flags). */
export const isBrave = () => typeof navigator !== "undefined" && Boolean(navigator.brave);

/**
 * Qué significa un error de requestDevice(). Varios navegadores responden "NotFoundError" tanto si la persona cerró
 * la lista como si el Bluetooth está apagado o desactivado: se distinguen por el mensaje.
 * @returns {"cancelled" | "disabled" | "adapter-off" | "denied" | "no-chooser" | "other"}
 */
export function classifyBtError(e) {
  const msg = String(e?.message ?? "");
  if (/globally disabled|api is disabled|not enabled|flag|blocklist|not available in this|not supported/i.test(msg)) return "disabled";
  if (/adapter (is )?not available|adapter.*off|bluetooth.*(off|unavailable)|no bluetooth adapter/i.test(msg)) return "adapter-off";
  if (e?.name === "SecurityError" || e?.name === "NotAllowedError" || /permission|denied/i.test(msg)) return "denied";
  if (e?.name === "ChooserTimeout") return "no-chooser";
  if (e?.name === "NotFoundError") return "cancelled";
  return "other";
}

/**
 * Navegador según su identificación. Los de fabricantes Android (Samsung, Xiaomi, Huawei, Oppo…) y otros traen
 * `navigator.bluetooth` pero a veces la lista de dispositivos nunca se abre y la promesa no responde.
 */
export function browserInfo(ua = typeof navigator === "undefined" ? "" : navigator.userAgent || "") {
  const has = (re) => re.test(ua);
  let name = "Otro", flaky = false;
  if (has(/SamsungBrowser/i)) { name = "Samsung Internet"; flaky = true; }
  else if (has(/MiuiBrowser|XiaoMi/i)) { name = "Navegador de Xiaomi"; flaky = true; }
  else if (has(/HuaweiBrowser|HMSCore/i)) { name = "Navegador de Huawei"; flaky = true; }
  else if (has(/HeyTapBrowser|OppoBrowser/i)) { name = "Navegador de Oppo"; flaky = true; }
  else if (has(/UCBrowser/i)) { name = "UC Browser"; flaky = true; }
  else if (has(/YaBrowser/i)) { name = "Yandex"; flaky = true; }
  else if (has(/Vivaldi/i)) { name = "Vivaldi"; flaky = true; }
  else if (has(/Firefox|FxiOS/i)) name = "Firefox";
  else if (has(/Edg\//i)) name = "Edge";
  else if (has(/OPR\//i)) name = "Opera";
  else if (has(/CriOS/i)) name = "Chrome (iPhone)";
  else if (has(/Chrome\//i)) name = "Chrome";
  else if (has(/Safari/i)) name = "Safari";
  if (typeof navigator !== "undefined" && navigator.brave) { name = "Brave"; flaky = false; }
  return { name, flaky, android: has(/Android/i), ios: has(/iPhone|iPad|iPod/i) };
}

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

/** Batería estándar (0x180F). Devuelve la característica para poder escuchar cambios, o null si no existe. */
async function batteryChar(server) {
  try {
    const svc = await server.getPrimaryService(BATTERY);
    return await svc.getCharacteristic(BATTERY_LEVEL);
  } catch {
    return null;
  }
}
async function readLevel(ch) {
  try {
    const v = (await ch.readValue()).getUint8(0);
    return v >= 0 && v <= 100 ? v : null;
  } catch {
    return null;
  }
}

const decoder = new TextDecoder();
async function readText(svc, uuid) {
  try {
    const ch = await svc.getCharacteristic(uuid);
    const t = decoder.decode(await ch.readValue()).replace(/\0+$/, "").trim();
    return t || null;
  } catch {
    return null;
  }
}

/** MAC a partir de bytes (los 6 primeros, en orden inverso): "A4:C1:38:…". */
export function macFromBytes(bytes) {
  if (!bytes || bytes.length < 6) return null;
  const six = [...bytes.slice(0, 6)].reverse();
  if (six.every((b) => b === 0) || six.every((b) => b === 255)) return null;
  return six.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
}

/** Versión legible del ARMY Bomb según la familia y el nombre que anuncia. */
export function versionLabel(family, name = "") {
  if (family === "v4") return "Ver. 4";
  if (/LIGHTSTICK_SE/.test(name)) return "Special Edition";
  if (/LIGHTSTICK3/.test(name)) return "Ver. 3";
  return "Ver. 3 o Special Edition";
}

/**
 * Datos del dispositivo. Solo se muestra lo que el ARMY Bomb realmente entrega: si algo no se puede leer,
 * queda en null con el motivo (nunca se inventan datos).
 */
async function readInfo(server, family) {
  const info = { model: null, firmware: null, maker: null, mac: null, macReason: null };
  try {
    const dis = await server.getPrimaryService(DEVICE_INFO);
    info.model = await readText(dis, DIS_CHARS.model);
    info.firmware = await readText(dis, DIS_CHARS.firmware);
    info.maker = await readText(dis, DIS_CHARS.maker);
  } catch {}
  if (family === "v4") {
    try {
      const svc = await server.getPrimaryService(V4_ID_SERVICE);
      const ch = await svc.getCharacteristic(V4_ID_CHAR);
      const v = await ch.readValue();
      info.mac = macFromBytes(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
    } catch {}
    if (!info.mac) info.macReason = "device";
  } else {
    // Web Bluetooth oculta la dirección MAC a propósito (privacidad); este modelo tampoco la envía por otro lado.
    info.macReason = "browser";
  }
  return info;
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
export async function requestStick({ showAll = false, watchdogMs = browserInfo().flaky ? 8000 : 0 } = {}) {
  const req = navigator.bluetooth.requestDevice(
    showAll ? { acceptAllDevices: true, optionalServices: OPTIONAL_SERVICES } : { filters: FILTERS, optionalServices: OPTIONAL_SERVICES },
  );
  // En navegadores que a veces no abren la lista (Samsung Internet…), si no se abrió en unos segundos se deja de
  // esperar: antes el botón se quedaba "Conectando…" para siempre. Si la lista sí se abrió (la página pierde el
  // foco), se espera a que la persona elija, sin apuro.
  let device;
  if (watchdogMs > 0) {
    let opened = false;
    const mark = () => { opened = true; };
    addEventListener("blur", mark, { once: true });
    document.addEventListener("visibilitychange", mark, { once: true });
    const watchdog = new Promise((_, reject) => setTimeout(() => {
      if (!opened) reject(Object.assign(new Error("El navegador no abrió la lista de dispositivos"), { name: "ChooserTimeout" }));
    }, watchdogMs));
    try { device = await Promise.race([req, watchdog]); }
    finally { removeEventListener("blur", mark); document.removeEventListener("visibilitychange", mark); }
  } else device = await req;
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
  const battCh = await batteryChar(server);
  const battery = battCh ? await readLevel(battCh) : null;
  const info = await readInfo(server, family);
  const stick = new Stick(device, characteristic, family, battery, info);
  stick.watchBattery(battCh);
  return stick;
}

const MIN_INTERVAL = 20; // ms entre escrituras
const BACKOFF_INTERVAL = 120;

export class Stick {
  constructor(device, characteristic, family, battery, info = {}) {
    this.device = device;
    this.characteristic = characteristic;
    this.family = family;
    this.battery = battery; // % o null si el ARMY Bomb no lo informa
    this.info = info;
    this.id = device.id;
    this.name = device.name ?? "Lightstick";
    this.version = versionLabel(family, this.name);
    this.onBattery = null; // (nivel) => void
    this.batteryTimer = 0;
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

  /** Escucha la batería: notificaciones si el ARMY Bomb las da; si no, vuelve a leer cada 2 minutos. */
  async watchBattery(ch) {
    if (!ch) return;
    const update = (v) => {
      if (v == null || v === this.battery) return;
      this.battery = v;
      this.onBattery?.(v);
    };
    if (ch.properties.notify) {
      try {
        ch.addEventListener("characteristicvaluechanged", (e) => update(e.target.value.getUint8(0)));
        await ch.startNotifications();
        return;
      } catch {}
    }
    this.batteryTimer = setInterval(async () => {
      if (!this.connected) return clearInterval(this.batteryTimer);
      // Entre colores: no compite con el envío (el lector de batería es una petición corta).
      if (!this.busy) update(await readLevel(ch));
    }, 120000);
  }

  get lowBattery() { return this.battery != null && this.battery <= LOW_BATTERY; }

  disconnect() {
    clearInterval(this.batteryTimer);
    try { this.device.gatt.disconnect(); } catch {}
  }
}
