import OBR, { buildShape, type Shape } from "@owlbear-rodeo/sdk";
import { NS, SCENE_KEY, data, validate, type Draft } from "./model";
export { OBR };
export const page = (query: Record<string, string>) =>
  new URL(`index.html?${new URLSearchParams(query)}`, location.href).href;
export const icon = new URL(
  "icon.svg",
  new URL(import.meta.env.BASE_URL, location.href),
).href;
export async function sceneId() {
  return (await OBR.scene.getMetadata())[SCENE_KEY] as string | undefined;
}
export async function guard(scene: string) {
  if (!(await OBR.scene.isReady()) || (await sceneId()) !== scene)
    throw new Error("The scene changed. Reopen the hotspot editor.");
  if ((await OBR.player.getRole()) !== "GM")
    throw new Error("Only the GM can change hotspots.");
}
export async function save(scene: string, draft: Draft, id?: string) {
  const d = validate(draft);
  await guard(scene);
  const metadata = {
    version: 1,
    url: d.url,
    enabled: d.enabled,
    players: d.players,
  };
  if (id) {
    let found = false;
    await OBR.scene.items.updateItems<Shape>(
      (item): item is Shape => item.id === id && !!data(item),
      (items) => {
        for (const item of items) {
          if (item.type !== "SHAPE") continue;
          found = true;
          Object.assign(item, {
            name: d.name,
            position: { x: d.x, y: d.y },
            width: d.radius * 2,
            height: d.radius * 2,
            scale: { x: 1, y: 1 },
            rotation: 0,
            visible: d.visible,
            locked: true,
          });
          item.metadata[NS] = metadata;
          item.style.strokeDash = d.enabled ? [] : [6, 6];
        }
      },
    );
    if (!found) throw new Error("This hotspot was deleted.");
  } else {
    const item = buildShape()
      .shapeType("CIRCLE")
      .width(d.radius * 2)
      .height(d.radius * 2)
      .position({ x: d.x, y: d.y })
      .name(d.name)
      .layer("MAP")
      .locked(true)
      .disableHit(true)
      .visible(d.visible)
      .fillColor("#7dd3fc")
      .fillOpacity(0.14)
      .strokeColor("#38bdf8")
      .strokeWidth(3)
      .strokeDash(d.enabled ? [] : [6, 6])
      .metadata({ [NS]: metadata })
      .build();
    await OBR.scene.items.addItems([item]);
  }
}
export async function openViewer(id: string, scene: string) {
  await OBR.modal.open({
    id: `${NS}/viewer`,
    url: page({ view: "viewer", id, scene }),
    fullScreen: true,
  });
}
export async function openEditor(scene: string, id?: string, x = 0, y = 0) {
  await OBR.modal.open({
    id: `${NS}/editor`,
    url: page({
      view: "editor",
      scene,
      ...(id ? { id } : {}),
      x: String(x),
      y: String(y),
    }),
    width: 440,
    height: 760,
  });
}
export async function remove(scene: string, id: string) {
  await guard(scene);
  await OBR.scene.items.deleteItems([id]);
}
