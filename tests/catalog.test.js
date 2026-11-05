import { test } from "node:test";
import assert from "node:assert/strict";
import { ALBUMS } from "../src/catalog.js";

const songs = ALBUMS.flatMap((a) => a.songs);
const YT = /^[\w-]{11}$/;
const HEX = /^#[0-9a-f]{6}$/i;

test("ids de canciones únicos", () => {
  const ids = songs.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("ids de álbum únicos", () => {
  const ids = ALBUMS.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("ids de YouTube únicos y con formato válido", () => {
  const yts = songs.map((s) => s.yt);
  for (const yt of yts) assert.match(yt, YT);
  assert.equal(new Set(yts).size, yts.length);
});


test("officialCaptions (si existe) es booleano", () => {
  for (const s of songs) if ("officialCaptions" in s) assert.equal(typeof s.officialCaptions, "boolean", s.id);
});

test("paletas con al menos 3 colores hex", () => {
  for (const a of ALBUMS) {
    assert.ok(Array.isArray(a.palette) && a.palette.length >= 3, a.id);
    for (const c of a.palette) assert.match(c, HEX, a.id);
  }
});

test("energy y kind dentro de los valores permitidos; bpm razonable", () => {
  for (const s of songs) {
    assert.ok(["high", "mid", "ballad"].includes(s.energy), s.id);
    if ("kind" in s) assert.ok(["concert", "cover"].includes(s.kind), s.id);
    assert.ok(Number.isFinite(s.bpm) && s.bpm >= 40 && s.bpm <= 220, s.id);
    assert.ok(typeof s.title === "string" && s.title.length > 0, s.id);
  }
});

test("álbumes en orden cronológico (no estricto)", () => {
  for (let i = 1; i < ALBUMS.length; i++) assert.ok(ALBUMS[i].year >= ALBUMS[i - 1].year, ALBUMS[i].id);
});

const ARTISTS = ["BTS", "RM", "Jin", "SUGA", "j-hope", "Jimin", "V", "Jung Kook"];

test("cada álbum tiene un artist permitido", () => {
  for (const a of ALBUMS) assert.ok(ARTISTS.includes(a.artist), `${a.id}: ${a.artist}`);
});

test("covers: álbum de covers por integrante (o covers oficiales del grupo) y título con el artista original", () => {
  for (const a of ALBUMS) for (const s of a.songs) {
    if (s.kind !== "cover") continue;
    // Solo el álbum "covers-bts" (presentaciones oficiales del grupo) puede tener artist "BTS".
    assert.ok(a.artist !== "BTS" || a.id === "covers-bts", `${a.id}/${s.id}`);
    assert.ok(a.id.startsWith("covers-"), `${a.id}/${s.id}`);
    assert.match(s.title, /\(cover de .+\)/, s.id);
  }
  for (const a of ALBUMS) if (a.id.startsWith("covers-")) for (const s of a.songs) assert.equal(s.kind, "cover", s.id);
});

test("años no decrecientes dentro de cada artista", () => {
  const last = {};
  for (const a of ALBUMS) {
    assert.ok(a.year >= (last[a.artist] ?? 0), `${a.artist}: ${a.id}`);
    last[a.artist] = a.year;
  }
});
