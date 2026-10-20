import { test } from "node:test";
import assert from "node:assert/strict";
import type { Item } from "@owlbear-rodeo/sdk";
import {
  shapeArea,
  cellArea,
  areaContains,
  polygonContains,
  validArea,
  parseArea,
  areaCommands,
} from "../src/areas.ts";
import { NS, attach, data, hit, allowed, type Hotspot } from "../src/model.ts";
const rectangle = shapeArea(
  "rectangle",
  { x: 100, y: 200 },
  { x: 200, y: 300 },
);
const item = {
  id: "area",
  name: "Test area",
  locked: true,
  createdUserId: "gm",
  lastModified: "2026-10-20",
  lastModifiedUserId: "gm",
  layer: "MAP",
  type: "PATH",
  position: rectangle.position,
  rotation: 0,
  scale: { x: 1, y: 1 },
  visible: true,
  zIndex: 1,
  metadata: {
    [NS]: {
      version: 4,
      title: "Test",
      url: "https://example.com/image.png",
      enabled: true,
      players: true,
      area: rectangle.area,
      gmMarks: false,
      playerMarks: false,
    },
  },
} as Item;
test("area boundaries and outside points", () => {
  assert.equal(areaContains(item, rectangle.area, { x: 150, y: 250 }), true);
  assert.equal(areaContains(item, rectangle.area, { x: 100, y: 200 }), true);
  assert.equal(areaContains(item, rectangle.area, { x: 99, y: 250 }), false);
});
test("ellipse hit uses outline rather than bounding rectangle", () => {
  const d = shapeArea("ellipse", { x: 0, y: 0 }, { x: 100, y: 50 });
  const i = { ...item, position: d.position };
  assert.equal(areaContains(i, d.area, { x: 50, y: 25 }), true);
  assert.equal(areaContains(i, d.area, { x: 1, y: 1 }), false);
});
test("freehand interior is filled and concave cutouts stay outside", () => {
  const p = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 30 },
    { x: 30, y: 30 },
    { x: 30, y: 100 },
    { x: 0, y: 100 },
  ];
  assert.equal(polygonContains(p, { x: 15, y: 90 }), true);
  assert.equal(polygonContains(p, { x: 70, y: 70 }), false);
  const d = shapeArea("freehand", p[0], p.at(-1)!, p);
  assert.equal(areaCommands(d.area).at(-1)![0], 5);
});
test("cell union includes all selected squares but not a gap", () => {
  const d = cellArea(
    [
      { x: 25, y: 25 },
      { x: 75, y: 25 },
      { x: 175, y: 25 },
    ],
    50,
  );
  const i = { ...item, position: d.position };
  assert.equal(areaContains(i, d.area, { x: 75, y: 30 }), true);
  assert.equal(areaContains(i, d.area, { x: 125, y: 30 }), false);
  assert.equal(areaContains(i, d.area, { x: 175, y: 30 }), true);
});
test("rotation, signed scaling and translation retain local hit geometry", () => {
  const i = { ...item, rotation: 90, scale: { x: 2, y: -1 } };
  assert.equal(areaContains(i, rectangle.area, { x: 150, y: 300 }), true);
  assert.equal(areaContains(i, rectangle.area, { x: 50, y: 300 }), false);
  assert.equal(
    areaContains({ ...i, scale: { x: 0, y: 1 } }, rectangle.area, {
      x: 100,
      y: 200,
    }),
    false,
  );
});
test("invisible role borders remain clickable; disabled and restricted areas do not", () => {
  assert.ok(data(item));
  assert.equal(allowed(item, false), true);
  assert.equal(hit([item as Hotspot], { x: 150, y: 250 }, false)?.id, "area");
  const restricted = structuredClone(item);
  attach(restricted, {
    name: "GM only",
    url: "https://example.com/x.png",
    enabled: true,
    players: false,
  });
  assert.equal(
    hit([restricted as Hotspot], { x: 150, y: 250 }, false),
    undefined,
  );
  assert.equal(
    hit([restricted as Hotspot], { x: 150, y: 250 }, true)?.id,
    "area",
  );
  attach(restricted, {
    name: "Disabled",
    url: "https://example.com/x.png",
    enabled: false,
    players: true,
  });
  assert.equal(
    hit([restricted as Hotspot], { x: 150, y: 250 }, true),
    undefined,
  );
});
test("edits preserve area geometry and independent border switches", () => {
  const edited = structuredClone(item);
  attach(edited, {
    name: "Updated",
    url: "https://example.com/x.png",
    enabled: true,
    players: true,
    gmMarks: false,
    playerMarks: true,
  });
  const d = data(edited);
  assert.equal(d?.version, 4);
  if (d?.version !== 4) throw Error("wrong version");
  assert.deepEqual(d.area, rectangle.area);
  assert.equal(d.gmMarks, false);
  assert.equal(d.playerMarks, true);
});
test("malformed and oversized area payloads are rejected", () => {
  for (const raw of [
    null,
    "{}",
    "not JSON",
    JSON.stringify({ area: rectangle.area, position: { x: null, y: 0 } }),
  ])
    assert.equal(parseArea(raw), undefined);
  assert.ok(parseArea(JSON.stringify(rectangle)));
  assert.equal(
    validArea({
      ...rectangle.area,
      polygons: [
        [
          { x: NaN, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 0 },
        ],
      ],
    }),
    false,
  );
  assert.throws(() =>
    cellArea(
      Array.from({ length: 257 }, (_, n) => ({ x: n * 50, y: 0 })),
      50,
    ),
  );
  assert.throws(() =>
    shapeArea("freehand", { x: 0, y: 0 }, { x: 1, y: 1 }, [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]),
  );
});
