import OBR, {
  buildShape,
  buildPath,
  type Shape,
  type Path,
} from "@owlbear-rodeo/sdk";
import {
  NS,
  SCENE_KEY,
  data,
  validate,
  regionCommands,
  type Draft,
  type Selection,
  type Hotspot,
} from "./model";
import { control } from "./control";
export { OBR };
export const page = (query: Record<string, string>) =>
  new URL(`index.html?${new URLSearchParams(query)}`, location.href).href;
export const icon = new URL(
  "icon.svg",
  new URL(import.meta.env.BASE_URL, location.href),
).href;
export const toolIcon = (file: string) =>
  new URL(file, new URL(import.meta.env.BASE_URL, location.href)).href;
export async function sceneId() {
  return (await OBR.scene.getMetadata())[SCENE_KEY] as string | undefined;
}
export async function guard(scene: string) {
  if (!(await OBR.scene.isReady()) || (await sceneId()) !== scene)
    throw new Error("The scene changed. Reopen the hotspot editor.");
  if ((await OBR.player.getRole()) !== "GM")
    throw new Error("Only the GM can change hotspots.");
}
export function makeItem(draft: Draft): Hotspot {
  const d = validate(draft),
    marks = d.marks !== false;
  const metadata = {
    url: d.url,
    enabled: d.enabled,
    players: d.players,
    marks,
    ...(d.region ? { version: 2, ...d.region } : { version: 1 }),
  };
  const builder = d.region
    ? buildPath().commands(regionCommands(d.region))
    : buildShape()
        .shapeType("CIRCLE")
        .width(d.radius * 2)
        .height(d.radius * 2);
  return builder
    .position({ x: d.x, y: d.y })
    .name(d.name)
    .layer("MAP")
    .locked(true)
    .disableHit(true)
    .visible(d.region ? true : d.visible)
    .fillColor("#7dd3fc")
    .fillOpacity(marks ? 0.14 : 0)
    .strokeColor("#38bdf8")
    .strokeOpacity(marks ? 1 : 0)
    .strokeWidth(2)
    .strokeDash(d.enabled ? [] : [6, 6])
    .metadata({ [NS]: metadata })
    .build();
}
export async function save(scene: string, draft: Draft, id?: string) {
  const next = makeItem(draft);
  await guard(scene);
  if (!id) {
    await OBR.scene.items.addItems([next]);
    return;
  }
  const [previous] = await OBR.scene.items.getItems(
    (i) => i.id === id && !!data(i),
  );
  if (!previous) throw new Error("This hotspot was deleted.");
  await guard(scene);
  if (previous.type !== next.type) {
    // Save the replacement before deleting a legacy circle, avoiding data loss.
    await OBR.scene.items.addItems([next]);
    await guard(scene);
    await OBR.scene.items.deleteItems([id]);
    return;
  }
  await OBR.scene.items.updateItems<Shape | Path>(
    (i): i is Shape | Path => i.id === id && !!data(i),
    (items) => {
      for (const item of items) {
        Object.assign(item, {
          name: next.name,
          position: next.position,
          rotation: 0,
          scale: { x: 1, y: 1 },
          visible: next.visible,
          locked: true,
          disableHit: true,
        });
        item.metadata[NS] = next.metadata[NS];
        item.style = next.style;
        if (item.type === "PATH" && next.type === "PATH")
          item.commands = next.commands;
        if (item.type === "SHAPE" && next.type === "SHAPE") {
          item.width = next.width;
          item.height = next.height;
        }
      }
    },
  );
}
export async function setMarks(scene: string, ids: string[], show: boolean) {
  await guard(scene);
  await OBR.scene.items.updateItems<Shape | Path>(
    (i): i is Shape | Path => ids.includes(i.id) && !!data(i),
    (items) => {
      for (const item of items) {
        const d = data(item)!;
        item.metadata[NS] = { ...d, marks: show };
        item.style.fillOpacity = show ? 0.14 : 0;
        item.style.strokeOpacity = show ? 1 : 0;
      }
    },
  );
}
export async function openViewer(id: string, scene: string) {
  await OBR.modal.open({
    id: `${NS}/viewer`,
    url: page({ view: "viewer", id, scene }),
    fullScreen: true,
  });
}
export async function openEditor(
  scene: string,
  id?: string,
  x = 0,
  y = 0,
  selection?: Selection,
) {
  await OBR.modal.open({
    id: `${NS}/editor`,
    url: page({
      view: "editor",
      scene,
      ...(id ? { id } : {}),
      x: String(x),
      y: String(y),
      ...(selection ? { selection: JSON.stringify(selection) } : {}),
    }),
    width: 480,
    height: 820,
  });
}
export async function remove(scene: string, id: string) {
  await guard(scene);
  await OBR.scene.items.deleteItems([id]);
}
export async function beginSelection(scene: string, id?: string) {
  await guard(scene);
  const [gridType, cellSize] = await Promise.all([
    OBR.scene.grid.getType(),
    OBR.scene.grid.getDpi(),
  ]);
  if (gridType !== "SQUARE")
    throw new Error("Cell selection currently requires a square scene grid.");
  if (!Number.isFinite(cellSize) || cellSize < 12 || cellSize > 2000)
    throw new Error("Use a scene grid size between 12 and 2000 pixels.");
  let selection: Selection = {
    scene,
    ...(id ? { id } : {}),
    cellSize,
    cells: [],
  };
  if (id) {
    const [item] = await OBR.scene.items.getItems(
      (i) => i.id === id && !!data(i),
    );
    if (!item) throw new Error("This hotspot was deleted.");
    const d = data(item)!;
    if (d.version === 2) {
      if (
        d.cellSize !== cellSize ||
        item.rotation !== 0 ||
        item.scale.x !== 1 ||
        item.scale.y !== 1
      )
        throw new Error(
          "The grid size or item transform changed. Edit the existing region in its editor, or create a new region on the current grid.",
        );
      selection = {
        ...selection,
        x: item.position.x,
        y: item.position.y,
        cells: d.cells,
        marks: d.marks !== false,
      };
    }
  }
  await guard(scene);
  await control("start", selection);
}
