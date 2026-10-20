import { OBR, icon, openEditor, openViewer, sceneId } from "./sdk";
import { NS, SCENE_KEY } from "./model";
const edit = `${NS}/link-object`,
  view = `${NS}/open-object`;
let epoch = 0;
let lastRole: string | undefined;
async function identity() {
  const e = ++epoch;
  if (
    (await OBR.scene.isReady()) &&
    !(await sceneId()) &&
    (await OBR.player.getRole()) === "GM" &&
    e === epoch
  )
    await OBR.scene.setMetadata({ [SCENE_KEY]: crypto.randomUUID() });
}
async function run(action: () => Promise<void>) {
  try {
    await action();
  } catch (e) {
    await OBR.notification.show(
      e instanceof Error ? e.message : "Unable to open image link.",
      "ERROR",
    );
  }
}
const stops: (() => void)[] = [];
OBR.onReady(() => {
  void run(identity);
  stops.push(
    OBR.scene.onReadyChange(() => void run(identity)),
    OBR.player.onChange((p) => {
      if (p.role !== lastRole) {
        lastRole = p.role;
        if (p.role === "GM") void run(identity);
      }
    }),
  );
  void OBR.contextMenu.create({
    id: edit,
    icons: [
      {
        icon,
        label: "Link / edit image",
        filter: { min: 1, max: 1, roles: ["GM"] },
      },
    ],
    onClick: (context) => {
      if (context.items.length === 1)
        void run(async () => {
          const scene = await sceneId();
          if (scene) await openEditor(scene, context.items[0].id);
        });
    },
  });
  void OBR.contextMenu.create({
    id: view,
    icons: [
      {
        icon,
        label: "Open linked image",
        filter: {
          min: 1,
          max: 1,
          every: [{ key: ["metadata", NS], value: undefined, operator: "!=" }],
        },
      },
    ],
    onClick: (context) => {
      if (context.items.length === 1)
        void run(async () => {
          const scene = await sceneId();
          if (scene) await openViewer(context.items[0].id, scene);
        });
    },
  });
});
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    stops.forEach((stop) => stop());
    void OBR.contextMenu.remove(edit);
    void OBR.contextMenu.remove(view);
  });
