// Service worker: guarda la app para abrirla sin conexión (los videos sí necesitan internet).
// Solo guarda archivos propios del sitio; nunca respuestas de terceros ni con errores.
const CACHE = "pws-v5";
const SHELL = [
  "./",
  "index.html",
  "app.html",
  "privacidad.html",
  "landing.css",
  "styles.css",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/apple-touch-icon.png",
  "src/app.js",
  "src/ble.js",
  "src/catalog.js",
  "src/config.js",
  "src/crowd.js",
  "src/fanchant.js",
  "src/feedback.js",
  "src/guide.js",
  "src/landing.js",
  "src/leaderboard.js",
  "src/mic.js",
  "src/patterns.js",
  "src/player.js",
  "src/rhythm.js",
  "src/youtube.js",
  "vendor/gsap/gsap.min.js",
  "vendor/three/build/three.module.js",
  "vendor/three/examples/jsm/postprocessing/EffectComposer.js",
  "vendor/three/examples/jsm/postprocessing/RenderPass.js",
  "vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js",
  "vendor/three/examples/jsm/postprocessing/ShaderPass.js",
  "vendor/three/examples/jsm/postprocessing/MaskPass.js",
  "vendor/three/examples/jsm/postprocessing/Pass.js",
  "vendor/three/examples/jsm/shaders/CopyShader.js",
  "vendor/three/examples/jsm/shaders/LuminosityHighPassShader.js",
  "vendor/three/examples/jsm/utils/BufferGeometryUtils.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// Red primero para archivos propios; si no hay conexión, usa la copia guardada.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
