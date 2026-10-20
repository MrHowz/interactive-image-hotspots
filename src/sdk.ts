import OBR from "@owlbear-rodeo/sdk";
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
export async function save(scene: string, draft: LinkDraft, id: string) {
  await guard(scene);
  await OBR.scene.items.updateItems([id], (items) => {
    if (items.length !== 1)
      throw new Error("This object was deleted. Select another object.");
    attach(items[0], draft);
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
