import { installTools } from "./scene-tools";
import { OBR, icon, openEditor, sceneId } from "./sdk";
import { NS, SCENE_KEY } from "./model";
const edit = `${NS}/link-object`;
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
  void run(async () => {
    await identity();
    stops.push(installTools());
  });
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
});
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    stops.forEach((stop) => stop());
    void OBR.contextMenu.remove(edit);
  });
