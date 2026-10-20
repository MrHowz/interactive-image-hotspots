import { test } from "node:test";
import assert from "node:assert/strict";
import type { Item } from "@owlbear-rodeo/sdk";
import { NS, attach, detach, data, allowed, linkTitle } from "../src/model.ts";
const draft = {
  name: "  Portrait  ",
  url: "https://example.com/portrait.png",
  enabled: true,
  players: true,
};
for (const type of ["IMAGE", "SHAPE", "PATH", "CURVE", "TEXT", "LINE"]) {
  test(`${type}: attach, edit and unlink preserve original object fields`, () => {
    const item = {
      id: "a",
      type,
      name: "Original",
      position: { x: 20, y: 30 },
      rotation: 17,
      visible: true,
      scale: { x: 2, y: 3 },
      layer: "DRAWING",
      locked: false,
      disableHit: false,
      metadata: { other: { keep: 42 } },
      style: { strokeWidth: 3 },
    } as unknown as Item;
    const original = structuredClone(item);
    attach(item, draft);
    assert.equal(data(item)?.version, 3);
    assert.equal(linkTitle(item), "Portrait");
    attach(item, { ...draft, name: "Updated" });
    assert.equal(linkTitle(item), "Updated");
    detach(item);
    assert.deepEqual(item, original);
  });
}
test("link follows object movement, survives serialization, and respects player access", () => {
  const item = {
    id: "a",
    type: "IMAGE",
    visible: true,
    name: "Token",
    position: { x: 0, y: 0 },
    metadata: {},
  } as Item;
  attach(item, draft);
  item.position = { x: 100, y: 200 };
  const restored = JSON.parse(JSON.stringify(item));
  assert.equal(data(restored)?.url, draft.url);
  assert.equal(allowed(restored, false), true);
  restored.visible = false;
  assert.equal(allowed(restored, false), false);
  assert.equal(allowed(restored, true), true);
  restored.visible = true;
  attach(restored, { ...draft, enabled: false });
  assert.equal(allowed(restored, false), false);
  attach(restored, { ...draft, players: false });
  assert.equal(allowed(restored, false), false);
});
test("invalid links fail before mutation; unrelated metadata survives", () => {
  const item = { type: "IMAGE", metadata: { other: 1 } } as unknown as Item;
  assert.throws(() => attach(item, { ...draft, url: "javascript:alert(1)" }));
  assert.deepEqual(item.metadata, { other: 1 });
  assert.throws(() => attach(item, { ...draft, name: " " }));
  attach(item, draft);
  ((item as Item).metadata[NS] as Record<string, unknown>).title = 42;
  assert.equal(data(item), undefined);
});
