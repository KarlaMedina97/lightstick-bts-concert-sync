import { test } from "node:test";
import assert from "node:assert/strict";
import { ALBUMS, flatQueue } from "../src/catalog.js";
import { shelves, upNext, STARTERS } from "../src/suggest.js";
import { songTheme, contrast, THEME_SURFACE, THEME_INK } from "../src/palette.js";

const queue = flatQueue();

test("los estantes de inicio existen y usan canciones del catálogo", () => {
  const s = shelves(queue);
  const ids = s.map((x) => x.id);
  assert.ok(ids.includes("start") && ids.includes("solo") && ids.includes("hype"));
  const start = s.find((x) => x.id === "start").items.map((i) => queue[i].song.id);
  assert.deepEqual(start, STARTERS.filter((id) => queue.some((q) => q.song.id === id)));
  for (const shelf of s) for (const i of shelf.items) assert.ok(queue[i]);
});

test("solistas: una canción por integrante, sin el grupo", () => {
  const solo = shelves(queue).find((x) => x.id === "solo").items.map((i) => queue[i].album.artist);
  assert.equal(new Set(solo).size, solo.length);
  assert.ok(!solo.includes("BTS"));
});

test("Me gusta aparece primero cuando hay favoritas", () => {
  const s = shelves(queue, { likes: ["dynamite", "no-existe"] });
  assert.equal(s[0].id, "likes");
  assert.deepEqual(s[0].items.map((i) => queue[i].song.id), ["dynamite"]);
});

test("A continuación prioriza Me gusta y salta lo escuchado", () => {
  const cur = queue.findIndex((q) => q.song.id === "dynamite");
  const likedIdx = queue.findIndex((q) => q.song.id === "spring-day");
  const next = upNext(queue, cur, { likes: ["spring-day"], played: ["life-goes-on"] });
  assert.equal(next[0], likedIdx);
  assert.ok(!next.includes(cur));
  assert.ok(!next.map((i) => queue[i].song.id).includes("life-goes-on"));
  assert.ok(!next.map((i) => queue[i].song.title).some((t) => /^Dynamite/.test(t)));
});

test("el tema de cada álbum tiene contraste AA", () => {
  for (const a of ALBUMS) {
    const t = songTheme(a.palette);
    assert.ok(contrast(t["--song-accent"], THEME_SURFACE) >= 4.5, `${a.id} acento`);
    assert.ok(contrast(t["--song-accent-2"], THEME_SURFACE) >= 4.5, `${a.id} acento 2`);
    assert.ok(contrast(THEME_INK, t["--song-accent"]) >= 4.5, `${a.id} tinta`);
  }
});

test("Mis álbumes: guardados primero; si no hay, los de tus Me gusta; si no, vacío", async () => {
  const { myAlbums } = await import("../src/suggest.js");
  assert.deepEqual(myAlbums(queue, { saved: ["be", "no-existe", "butter"] }), { ids: ["butter", "be"], derived: false });
  const d = myAlbums(queue, { likes: ["dynamite", "spring-day"] });
  assert.equal(d.derived, true);
  assert.deepEqual(d.ids, [queue.find((q) => q.song.id === "spring-day").album.id, "be"]);
  assert.deepEqual(myAlbums(queue), { ids: [], derived: false });
});

test("el tema claro también tiene acentos AA sobre blanco", () => {
  for (const a of ALBUMS) {
    const t = songTheme(a.palette);
    assert.ok(contrast(t["--song-accent-l"], "#ffffff") >= 4.5, `${a.id} acento claro`);
    assert.ok(contrast(t["--song-accent-l2"], "#ffffff") >= 4.5, `${a.id} acento claro 2`);
  }
});
