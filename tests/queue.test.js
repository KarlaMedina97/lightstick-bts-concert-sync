import { test } from "node:test";
import assert from "node:assert/strict";
import { PlayQueue, seededShuffle } from "../src/queue.js";

const ids = (list) => list.map((e) => e.id);
const fresh = () => {
  const q = new PlayQueue();
  q.start("a", { context: ["b", "c", "d"], label: "Álbum" });
  return q;
};

test("la cola manual suena antes que el contexto y en orden", () => {
  const q = fresh();
  q.add("x");
  q.add("y");
  q.playNext("z");
  assert.deepEqual(ids(q.userQueue), ["z", "x", "y"]);
  assert.equal(q.next(), "z");
  assert.equal(q.next(), "x");
  assert.equal(q.next(), "y");
  assert.equal(q.next(), "b");
  assert.deepEqual(q.history, ["a", "z", "x", "y"]);
});

test("mover, quitar y mover entre cola y contexto", () => {
  const q = fresh();
  const x = q.add("x");
  const y = q.add("y");
  assert.ok(q.move(y.uid, "userQueue", 0));
  assert.deepEqual(ids(q.userQueue), ["y", "x"]);
  const c = q.context[1]; // "c"
  assert.ok(q.move(c.uid, "userQueue", 1));
  assert.deepEqual(ids(q.userQueue), ["y", "c", "x"]);
  assert.deepEqual(ids(q.context), ["b", "d"]);
  assert.ok(q.move(x.uid, "context", 0));
  assert.deepEqual(ids(q.context), ["x", "b", "d"]);
  assert.equal(q.remove(y.uid).entry.id, "y");
  assert.deepEqual(ids(q.userQueue), ["c"]);
  assert.equal(q.remove(9999), null);
});

test("saltar a una entrada manda lo intermedio al historial", () => {
  const q = fresh();
  const d = q.context[2];
  assert.equal(q.jump(d.uid), "d");
  assert.equal(q.nowPlaying, "d");
  assert.deepEqual(q.history, ["a", "b", "c"]);
  assert.deepEqual(ids(q.context), []);
});

test("anterior: reinicia después de 5 s, si no vuelve al historial", () => {
  const q = fresh();
  q.next(); // b
  assert.equal(q.prev(12), "restart");
  assert.equal(q.prev(2), "a");
  assert.equal(q.nowPlaying, "a");
  assert.equal(q.next(), "b"); // la que sonaba vuelve a quedar adelante
});

test("aleatorio respeta la cola manual, es estable y se puede deshacer", () => {
  const q = new PlayQueue();
  q.start("a", { context: ["b", "c", "d", "e", "f", "g"] });
  q.add("x");
  q.setShuffle(true, 42);
  assert.deepEqual(ids(q.userQueue), ["x"]);
  const shuffled = ids(q.context);
  assert.deepEqual([...shuffled].sort(), ["b", "c", "d", "e", "f", "g"]);
  assert.deepEqual(shuffled, seededShuffle(["b", "c", "d", "e", "f", "g"], 42));
  q.setShuffle(false);
  assert.deepEqual(ids(q.context), ["b", "c", "d", "e", "f", "g"]);
});

test("repetir una y repetir todo", () => {
  const q = new PlayQueue();
  q.start("a", { context: ["b"] });
  assert.equal(q.cycleRepeat(), "all");
  assert.equal(q.next({ auto: true }), "b");
  assert.equal(q.next({ auto: true }), "a"); // vuelve a empezar la lista
  assert.equal(q.cycleRepeat(), "one");
  assert.equal(q.next({ auto: true }), "a");
  assert.equal(q.next({ auto: false }), "b"); // "Siguiente" a mano sí avanza
  assert.equal(q.cycleRepeat(), "off");
});

test("al acabar el contexto pide el siguiente (sugerencias) o se detiene", () => {
  let calls = 0;
  const q = new PlayQueue({ onContextEnd: (_q, { auto }) => (++calls && auto ? null : { ids: ["s1", "s2"], label: "Sugerencias" }) });
  q.start("a", { context: [] });
  assert.equal(q.next({ auto: true }), null);
  assert.equal(q.next(), "s1");
  assert.equal(q.contextLabel, "Sugerencias");
  assert.equal(q.peek(), "s2");
  assert.ok(calls >= 2);
});

test("se guarda y se restaura igual (y limpia datos inválidos)", () => {
  const q = fresh();
  q.add("x");
  q.next();
  q.setShuffle(true, 7);
  q.cycleRepeat();
  const json = JSON.parse(JSON.stringify(q.toJSON()));
  const r = PlayQueue.from(json);
  assert.equal(r.nowPlaying, q.nowPlaying);
  assert.deepEqual(ids(r.userQueue), ids(q.userQueue));
  assert.deepEqual(ids(r.context), ids(q.context));
  assert.deepEqual(r.history, q.history);
  assert.equal(r.shuffle, true);
  assert.equal(r.repeat, "all");
  const bad = PlayQueue.from({ v: 1, nowPlaying: "<script>", userQueue: ["ok-id", "../x", 5], repeat: "nope" }, { valid: (id) => id !== "gone" });
  assert.equal(bad.nowPlaying, null);
  assert.deepEqual(ids(bad.userQueue), ["ok-id"]);
  assert.equal(bad.repeat, "off");
  assert.equal(PlayQueue.from(null).nowPlaying, null);
});
