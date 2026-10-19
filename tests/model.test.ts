import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NS,
  allowed,
  data,
  hit,
  hotspots,
  imageUrl,
  validate,
  validateFile,
  type Draft,
  type Hotspot,
} from "../src/model.ts";
const draft: Draft = {
  name: "Shrine",
  url: "https://example.com/shrine.webp",
  x: 100,
  y: 200,
  radius: 40,
  enabled: true,
  visible: true,
  players: true,
};
function item(overrides: Partial<Hotspot> = {}): Hotspot {
  return {
    id: "a",
    type: "SHAPE",
    shapeType: "CIRCLE",
    name: "Shrine",
    width: 80,
    height: 80,
    position: { x: 100, y: 200 },
    rotation: 0,
    scale: { x: 1, y: 1 },
    visible: true,
    zIndex: 1,
    metadata: {
      [NS]: { version: 1, url: draft.url, enabled: true, players: true },
    },
    ...overrides,
  } as Hotspot;
}
test("URL validation allows public HTTPS and rejects unsafe or ephemeral schemes", () => {
  assert.equal(
    imageUrl(" https://example.com/a?q=1 "),
    "https://example.com/a?q=1",
  );
  for (const value of [
    "http://a.com",
    "javascript:alert(1)",
    "data:image/png;base64,a",
    "blob:https://a.com/id",
    "https://user:pass@a.com",
    "not a URL",
  ])
    assert.throws(() => imageUrl(value));
});
test("draft validates names, dimensions and finite coordinates", () => {
  assert.equal(validate({ ...draft, name: " Shrine " }).name, "Shrine");
  for (const invalid of [
    { name: "" },
    { radius: 0 },
    { radius: 1001 },
    { x: NaN },
    { y: Infinity },
    { name: "x".repeat(101) },
  ])
    assert.throws(() => validate({ ...draft, ...invalid }));
});
test("upload validation covers supported formats, empty and large files", () => {
  for (const type of ["image/png", "image/jpeg", "image/webp", "image/gif"])
    assert.doesNotThrow(() => validateFile({ type, size: 100 }));
  for (const value of [
    { type: "image/svg+xml", size: 10 },
    { type: "image/png", size: 0 },
    { type: "image/png", size: 21 * 1024 * 1024 },
  ])
    assert.throws(() => validateFile(value));
});
test("only versioned valid hotspot metadata is read", () => {
  assert.ok(data(item()));
  assert.equal(data(item({ metadata: { [NS]: { version: 99 } } })), undefined);
  assert.equal(hotspots([item(), item({ metadata: {} })]).length, 1);
});
test("coordinates and boundary clicks use scene units and item scale", () => {
  assert.equal(hit([item()], { x: 140, y: 200 }, false)?.id, "a");
  assert.equal(hit([item()], { x: 141, y: 200 }, false), undefined);
  assert.equal(
    hit([item({ scale: { x: 2, y: 2 } })], { x: 180, y: 200 }, false)?.id,
    "a",
  );
  assert.equal(hit([item()], { x: 140, y: 240 }, false), undefined);
});
test("hidden, disabled and GM-only points cannot open for players", () => {
  const hidden = item({ visible: false });
  const disabled = item({
    metadata: { [NS]: { ...data(item()), enabled: false } },
  });
  const gmOnly = item({
    metadata: { [NS]: { ...data(item()), players: false } },
  });
  for (const i of [hidden, disabled, gmOnly]) {
    assert.equal(allowed(i, false), false);
    assert.equal(hit([i], i.position, false), undefined);
    assert.equal(allowed(i, true), true);
  }
  assert.equal(hit([hidden, disabled], { x: 100, y: 200 }, true), undefined);
});
test("overlap resolves deterministically by z-index", () => {
  assert.equal(
    hit([item(), item({ id: "b", zIndex: 2 })], draft, false)?.id,
    "b",
  );
});
test("serialization survives reload without binary or blob data", () => {
  const i = item();
  assert.deepEqual(data(JSON.parse(JSON.stringify(i))), data(i));
  assert.ok(JSON.stringify(i.metadata).length < 512);
});
test("rotated scaled markers use the same elliptical scene hit area", () => {
  const i = item({ width: 160, height: 40, rotation: 90 });
  assert.equal(hit([i], { x: 100, y: 275 }, false)?.id, "a");
  assert.equal(hit([i], { x: 125, y: 200 }, false), undefined);
});
