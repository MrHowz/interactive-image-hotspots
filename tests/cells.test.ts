import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NS,
  MAX_CELLS,
  data,
  allowed,
  hit,
  validate,
  connected,
  toggleCell,
  validRegion,
  regionCommands,
  selectionData,
  selectionParam,
  type Cell,
  type Draft,
  type Hotspot,
  type HotspotData,
} from "../src/model.ts";
const region = {
  cellSize: 100,
  cells: [
    [0, 0],
    [1, 0],
    [2, 0],
  ] as Cell[],
};
function item(overrides: Partial<HotspotData> = {}): Hotspot {
  return {
    id: "cells",
    name: "Three cells",
    type: "PATH",
    fillRule: "nonzero",
    locked: true,
    createdUserId: "gm",
    lastModified: "2026-10-20",
    lastModifiedUserId: "gm",
    layer: "MAP",
    style: {
      fillColor: "#7dd3fc",
      fillOpacity: 0.14,
      strokeColor: "#38bdf8",
      strokeOpacity: 1,
      strokeWidth: 2,
      strokeDash: [],
    },
    commands: regionCommands(region),
    position: { x: 200, y: 300 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    visible: true,
    zIndex: 2,
    metadata: {
      [NS]: {
        version: 2,
        url: "https://example.com/a.png",
        enabled: true,
        players: true,
        marks: true,
        ...region,
        ...overrides,
      },
    },
  } as Hotspot;
}
const draft: Draft = {
  name: "Cells",
  url: "https://example.com/a.png",
  x: 200,
  y: 300,
  radius: 40,
  enabled: true,
  players: true,
  visible: true,
  marks: true,
  region,
};
test("three adjacent squares open the same image including their corners", () => {
  const i = item();
  for (const p of [
    { x: 201, y: 301 },
    { x: 350, y: 350 },
    { x: 499, y: 399 },
  ])
    assert.equal(hit([i], p, false)?.id, "cells");
  assert.equal(hit([i], { x: 500, y: 350 }, false), undefined);
  assert.equal(hit([i], { x: 300, y: 400 }, false), undefined);
});
test("invisible fill and border remain clickable and available to players", () => {
  const hidden = item({ marks: false });
  assert.equal(allowed(hidden, false), true);
  assert.equal(hit([hidden], { x: 250, y: 350 }, false)?.id, "cells");
  assert.equal(
    hit([item({ marks: false, enabled: false })], { x: 250, y: 350 }, false),
    undefined,
  );
  assert.equal(allowed(item({ marks: false, players: false }), false), false);
});
test("L-shaped selection does not include its unselected bounding-box gap", () => {
  const i = item({
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
  });
  assert.equal(hit([i], { x: 250, y: 450 }, false)?.id, "cells");
  assert.equal(hit([i], { x: 350, y: 450 }, false), undefined);
});
test("negative relative cells and rotated scaled regions retain scene hit geometry", () => {
  const i = item({
    cells: [
      [-1, 0],
      [0, 0],
    ],
  });
  assert.equal(hit([i], { x: 150, y: 350 }, false)?.id, "cells");
  i.rotation = 90;
  i.scale = { x: 2, y: 2 };
  assert.equal(hit([i], { x: 100, y: 200 }, false)?.id, "cells");
});
test("cells toggle without duplicates and may be deselected", () => {
  const cells = toggleCell(region.cells, [1, 0]);
  assert.equal(cells.length, 2);
  assert.equal(connected(cells), false);
  assert.deepEqual(
    toggleCell(cells, [1, 0]).sort(),
    region.cells.slice().sort(),
  );
});
test("only edge-connected nonempty unique regions can be saved", () => {
  assert.doesNotThrow(() => validate(draft));
  assert.equal(
    connected([
      [0, 0],
      [1, 0],
      [1, 1],
    ]),
    true,
  );
  for (const cells of [
    [],
    [
      [0, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [0, 0],
    ],
  ] as Cell[][])
    assert.throws(() => validate({ ...draft, region: { ...region, cells } }));
});
test("region size is bounded and malformed metadata is rejected", () => {
  const cells = Array.from({ length: MAX_CELLS }, (_, i) => [i, 0] as Cell);
  assert.equal(validRegion({ cellSize: 100, cells }), true);
  assert.equal(
    validRegion({ cellSize: 100, cells: [...cells, [MAX_CELLS, 0]] }),
    false,
  );
  assert.equal(data(item({ cellSize: NaN })), undefined);
  assert.equal(data(item({ cells: [[0.5, 0]] })), undefined);
  assert.equal(data(item({ cells: [] })), undefined);
});
test("each cell renders one closed square and saved geometry survives reload", () => {
  const commands = regionCommands(region);
  assert.equal(commands.length, 15);
  assert.deepEqual(commands.slice(0, 5), [
    [0, 0, 0],
    [1, 100, 0],
    [1, 100, 100],
    [1, 0, 100],
    [5],
  ]);
  assert.deepEqual(
    data(JSON.parse(JSON.stringify(item({ marks: false })))),
    data(item({ marks: false })),
  );
});
test("temporary selection parsing accepts empty drafts but rejects malformed values", () => {
  assert.ok(selectionData({ scene: "a", cellSize: 100, cells: [] }));
  assert.equal(selectionParam("{broken"), undefined);
  assert.equal(
    selectionData({ scene: "a", cellSize: -1, cells: [] }),
    undefined,
  );
  assert.equal(
    selectionData({
      scene: "a",
      cellSize: 100,
      cells: [[0, 0]],
      x: Infinity,
      y: 0,
    }),
    undefined,
  );
});
