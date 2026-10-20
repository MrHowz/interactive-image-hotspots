import { areaCommands, validArea, type AreaDraft } from "./areas";
import OBR, { buildPath } from "@owlbear-rodeo/sdk";
import {
  NS,
  SCENE_KEY,
  allowed,
  data,
  attach,
  detach,
  type LinkDraft,
} from "./model";
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
  if (!scene || !(await OBR.scene.isReady()) || (await sceneId()) !== scene)
    throw new Error("The scene changed. Reopen the image link editor.");
  if ((await OBR.player.getRole()) !== "GM")
    throw new Error("Only the GM can change image links.");
}
export type AreaTransform = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
};
export function areaItem(pending: AreaDraft) {
  return buildPath()
    .fillRule("evenodd")
    .commands(areaCommands(pending.area))
    .position(pending.position)
    .name("Image area")
    .layer("MAP")
    .locked(true)
    .disableHit(true)
    .visible(true)
    .fillOpacity(0)
    .strokeOpacity(0)
    .build();
}
export async function save(
  scene: string,
  draft: LinkDraft,
  id: string,
  pending?: AreaDraft,
  transform?: AreaTransform,
) {
  await guard(scene);
  if (
    transform &&
    (![transform.x, transform.y, transform.scaleX, transform.scaleY].every(
      Number.isFinite,
    ) ||
      Math.abs(transform.x) > 1e7 ||
      Math.abs(transform.y) > 1e7 ||
      transform.scaleX < 0.01 ||
      transform.scaleY < 0.01 ||
      transform.scaleX > 100 ||
      transform.scaleY > 100)
  )
    throw new Error("Use valid position and scale (0.01–100).");
  if (!id) {
    if (!pending || !validArea(pending.area))
      throw new Error("Draw an area first.");
    const item = areaItem(pending);
    attach(item, draft);
    item.name = draft.name.trim();
    item.metadata[NS] = {
      ...(item.metadata[NS] as object),
      version: 4,
      area: pending.area,
      gmMarks: draft.gmMarks ?? true,
      playerMarks: draft.playerMarks ?? false,
    };
    if (transform) {
      item.position = { x: transform.x, y: transform.y };
      item.scale = { x: transform.scaleX, y: transform.scaleY };
    }
    await guard(scene);
    await OBR.scene.items.addItems([item]);
    return;
  }
  await OBR.scene.items.updateItems([id], (items) => {
    if (items.length !== 1)
      throw new Error("This object was deleted. Select another object.");
    attach(items[0], draft);
    if (data(items[0])?.version === 4 && transform) {
      items[0].position = { x: transform.x, y: transform.y };
      items[0].scale = { x: transform.scaleX, y: transform.scaleY };
    }
  });
}
export async function remove(scene: string, id: string) {
  await guard(scene);
  await OBR.scene.items.updateItems([id], (items) => items.forEach(detach));
}
export async function openViewer(id: string, scene: string) {
  if (!(await OBR.scene.isReady()) || (await sceneId()) !== scene)
    throw new Error("The scene changed.");
  const [item] = await OBR.scene.items.getItems([id]);
  if (
    !item ||
    !data(item) ||
    !allowed(item, (await OBR.player.getRole()) === "GM")
  )
    throw new Error("This image is unavailable or restricted by the GM.");
  await OBR.modal.open({
    id: `${NS}/viewer`,
    url: page({ view: "viewer", id, scene }),
    fullScreen: true,
  });
}
export async function openEditor(scene: string, id: string) {
  await guard(scene);
  const items = await OBR.scene.items.getItems([id]);
  if (!items.length) throw new Error("Select an existing object first.");
  await OBR.modal.open({
    id: `${NS}/editor`,
    url: page({ view: "editor", scene, id }),
    width: 480,
    height: 760,
  });
}

export async function openAreaEditor(scene: string, pending: AreaDraft) {
  await guard(scene);
  await OBR.modal.open({
    id: `${NS}/editor`,
    url: page({ view: "editor", scene, area: JSON.stringify(pending) }),
    width: 480,
    height: 760,
  });
}
export async function deleteArea(scene: string, id: string) {
  await guard(scene);
  const [item] = await OBR.scene.items.getItems([id]);
  if (!item || data(item)?.version !== 4)
    throw new Error("Only extension-created areas can be deleted here.");
  await guard(scene);
  await OBR.scene.items.deleteItems([id]);
}
