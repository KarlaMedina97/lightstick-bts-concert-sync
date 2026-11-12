// Navegadores dentro de apps (TikTok, Instagram, Facebook, Messenger, Snapchat, LINE, X…).
// Ahí funcionan los videos y las luces en pantalla, pero NO Web Bluetooth (ni en Android ni en iPhone): para
// conectar el ARMY Bomb hay que abrir la página en el navegador. En Android, Chrome se puede abrir con un enlace
// "intent://"; en iPhone ninguna app lo permite, así que se ofrece copiar el enlace con instrucciones.

const UA = typeof navigator === "undefined" ? "" : navigator.userAgent || "";

/** @returns {null | "tiktok" | "instagram" | "facebook" | "snapchat" | "line" | "x" | "otra"} */
export function inAppBrowser(ua = UA) {
  if (/musical_ly|BytedanceWebview|TikTok|trill/i.test(ua)) return "tiktok";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(ua)) return "facebook";
  if (/Snapchat/i.test(ua)) return "snapchat";
  if (/\bLine\//i.test(ua)) return "line";
  if (/Twitter|TwitterAndroid/i.test(ua)) return "x";
  // WebView genérico de Android ("; wv)") que no es el navegador.
  if (/Android.*; wv\)/i.test(ua)) return "otra";
  return null;
}
export const isAndroid = (ua = UA) => /Android/i.test(ua);
export const isIOS = (ua = UA) => /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document);

/**
 * Botones de "Conectar" dentro de una app: en Android abren Chrome directamente; en iPhone copian el enlace
 * (ahí la conexión no es posible y la guía solo llevaría a un botón desactivado).
 * @param {Iterable<HTMLElement>} els
 */
export function redirectConnectButtons(els) {
  if (!inAppBrowser()) return;
  for (const el of els) {
    if (isAndroid()) {
      const go = () => { location.href = chromeIntent((location.pathname.includes("/player") ? location.href.replace(/[?#].*$/, "") + "?guide=1" : `${location.origin}/player/?guide=1`)); };
      if (el.tagName === "A") el.setAttribute("href", chromeIntent(new URL(el.getAttribute("href"), location.href).href));
      else el.onclick = go;
    } else {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        navigator.clipboard?.writeText(location.href.replace(/[?#].*$/, "")).catch(() => {});
        document.getElementById("inapp-note")?.scrollIntoView?.({ block: "nearest" });
        document.querySelector("#inapp-note .inapp-btn")?.focus();
      }, true);
    }
  }
}

/** Enlace que abre esta misma página en Chrome (Android). */
export function chromeIntent(href) {
  const u = new URL(href);
  return `intent://${u.host}${u.pathname}${u.search}${u.hash}#Intent;scheme=${u.protocol.replace(":", "")};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`;
}

const APP_NAME = { tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook", snapchat: "Snapchat", line: "LINE", x: "X" };

/**
 * Aviso fijo y discreto arriba de la página. No bloquea nada: los videos y las luces en pantalla funcionan.
 * @param {{ mount?: HTMLElement }} [o]
 */
export function showInAppNotice({ mount = document.body } = {}) {
  const app = inAppBrowser();
  if (!app || document.getElementById("inapp-note")) return null;
  const el = document.createElement("div");
  el.id = "inapp-note";
  el.className = "inapp-note";
  el.setAttribute("role", "note");
  const txt = document.createElement("p");
  const name = APP_NAME[app];
  // Textos en español: la capa de idioma (src/i18n.js) los traduce y los restaura al cambiar de idioma.
  txt.textContent = name
    ? `Estás en el navegador de ${name}: aquí no se puede conectar el ARMY Bomb (los videos y tu pantalla sí funcionan).`
    : "Estás en el navegador de una app: aquí no se puede conectar el ARMY Bomb (los videos y tu pantalla sí funcionan).";
  const how = document.createElement("p");
  how.className = "inapp-how";
  how.textContent = isIOS()
    ? "Para conectarlo: toca ⋯ y elige «Abrir en el navegador», o copia el enlace y ábrelo en la app Bluefy."
    : "Para conectarlo, ábrela en Chrome:";
  const actions = document.createElement("div");
  actions.className = "inapp-actions";
  if (isAndroid()) {
    const a = document.createElement("a");
    a.className = "inapp-btn primary";
    a.href = chromeIntent(location.href);
    a.textContent = "Abrir en Chrome";
    actions.append(a);
  }
  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "inapp-btn";
  copy.textContent = "Copiar enlace";
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      copy.textContent = "Enlace copiado ✓";
    } catch {
      // Sin portapapeles (algunas apps lo bloquean): el enlace aparece seleccionado para copiarlo a mano.
      let field = el.querySelector(".inapp-url");
      if (!field) {
        field = document.createElement("input");
        field.className = "inapp-url";
        field.readOnly = true;
        field.value = location.href;
        field.setAttribute("aria-label", "Enlace de esta página");
        actions.append(field);
      }
      field.focus();
      field.select();
      try { document.execCommand("copy"); copy.textContent = "Enlace copiado ✓"; } catch {}
    }
  };
  const close = document.createElement("button");
  close.type = "button";
  close.className = "inapp-close";
  close.setAttribute("aria-label", "Cerrar aviso");
  close.textContent = "×";
  close.onclick = () => el.remove();
  actions.append(copy);
  el.append(txt, how, actions, close);
  mount.prepend(el);
  return el;
}
