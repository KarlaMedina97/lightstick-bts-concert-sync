// Service worker: guarda la app para abrirla sin conexión (los videos sí necesitan internet).
// Solo guarda archivos propios del sitio; nunca respuestas de terceros ni con errores.
const CACHE = "pws-v68";
const SHELL = [
  "./",
  "index.html",
  "app.html",
  "player/",
  "player/index.html",
  "privacy/",
  "privacy/index.html",
  "privacidad.html",
  "src/redirect.js",
  "src/favorites.js",
  "src/tour.js",
  "src/camera.js",
  "src/mobile-nav.js",
  "src/i18n.js",
  "src/doc.js",
  "src/announce.js",
  "src/nav-menu.js",
  "src/videopalette.js",
  "src/inapp.js",
  "src/carousel.js",
  "src/fireworks.js",
  "src/analytics.js",
  "src/earcons.js",
  "src/i18n/en-landing.js",
  "src/i18n/en-player.js",
  "src/i18n/en-app.js",
  "src/i18n/pt-landing.js",
  "src/i18n/pt-player.js",
  "src/i18n/pt-app.js",
  "src/i18n/id-landing.js",
  "src/i18n/id-player.js",
  "src/i18n/id-app.js",
  "src/i18n/ko-landing.js",
  "src/i18n/ko-player.js",
  "src/i18n/ko-app.js",
  "src/stick3d.js",
  "src/models/shared.js",
  "src/models/armybomb-v4.js",
  "src/models/armybomb-v3.js",
  "src/models/armybomb-se.js",
  "src/models/armybomb-v1.js",
  "src/models/armybomb-v2.js",
  "tour.css",
  "fonts/fonts.css",
  "fonts/unbounded-latin-wght-normal.woff2",
  "fonts/plus-jakarta-sans-latin-wght-normal.woff2",
  "vendor/gsap/ScrollTrigger.min.js",
  "landing.css",
  "styles.css",
  "manifest.webmanifest",
  "icons/icon.svg",
  "assets/grain.svg",
  "assets/empty-stage.svg",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/logo-mark.svg",
  "src/app.js",
  "src/ble.js",
  "src/catalog.js",
  "src/config.js",
  "src/crowd.js",
  "src/suggest.js",
  "src/palette.js",
  "src/queue.js",
  "src/tooltip.js",
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
  "vendor/three/build/three.module.min.js",
  "vendor/three/examples/jsm/postprocessing/EffectComposer.js",
  "vendor/three/examples/jsm/postprocessing/RenderPass.js",
  "vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js",
  "vendor/three/examples/jsm/postprocessing/ShaderPass.js",
  "vendor/three/examples/jsm/postprocessing/MaskPass.js",
  "vendor/three/examples/jsm/postprocessing/Pass.js",
  "vendor/three/examples/jsm/shaders/CopyShader.js",
  "vendor/three/examples/jsm/shaders/LuminosityHighPassShader.js",
  "vendor/three/examples/jsm/utils/BufferGeometryUtils.js",
  "vendor/three/examples/jsm/environments/RoomEnvironment.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// Librerías (three.js, GSAP) y fuentes: primero la copia guardada. Pesan mucho y solo cambian con una versión nueva
// de CACHE, que las vuelve a bajar al instalar; así la segunda visita en una red lenta no las espera.
const IMMUTABLE = /\/(vendor|fonts)\//;
const fetchAndKeep = (req) => fetch(req).then((res) => {
  if (res.ok && res.type === "basic") {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
});

// Red primero para el resto de archivos propios; si no hay conexión, usa la copia guardada.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (IMMUTABLE.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then((hit) => hit ?? fetchAndKeep(e.request)));
    return;
  }
  e.respondWith(
    fetchAndKeep(e.request)
      .catch(async () => (await caches.match(e.request, { ignoreSearch: true }))
        // Sin conexión, una canción (/player/dynamite) abre el reproductor guardado.
        ?? (e.request.mode === "navigate" && /\/player\/[a-z0-9-]+$/.test(url.pathname) ? caches.match(new URL("player/", self.registration.scope)) : undefined)),
  );
});
