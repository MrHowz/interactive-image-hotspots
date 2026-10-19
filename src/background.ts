import { OBR, icon, openEditor, openViewer, sceneId } from "./sdk";
import { SCENE_KEY, TOOL, VIEW, PLACE, hotspots, hit } from "./model";
let busy = false;
let epoch = 0;
let lastRole: string | undefined;
async function report(error: unknown) {
  await OBR.notification.show(
    error instanceof Error ? error.message : "Hotspot operation failed.",
    "ERROR",
  );
}
async function identity() {
  const e = ++epoch;
  if (!(await OBR.scene.isReady())) return;
  const id = await sceneId();
  if (!id && (await OBR.player.getRole()) === "GM" && e === epoch)
    await OBR.scene.setMetadata({ [SCENE_KEY]: crypto.randomUUID() });
}
OBR.onReady(async () => {
  try {
    await OBR.tool.create({
      id: TOOL,
      icons: [{ icon, label: "Image Hotspots" }],
      defaultMode: VIEW,
    });
    await OBR.tool.createMode({
      id: VIEW,
      icons: [{ icon, label: "Open image", filter: { activeTools: [TOOL] } }],
      cursors: [{ cursor: "pointer" }],
      onToolClick: async (_, event) => {
        if (busy) return;
        busy = true;
        const e = epoch;
        try {
          const scene = await sceneId();
          const item = hit(
            hotspots(await OBR.scene.items.getItems()),
            event.pointerPosition,
            (await OBR.player.getRole()) === "GM",
          );
          if (item && scene && e === epoch) await openViewer(item.id, scene);
        } catch (error) {
          await report(error);
        } finally {
          busy = false;
        }
      },
    });
    await OBR.tool.createMode({
      id: PLACE,
      icons: [
        {
          icon,
          label: "Place hotspot",
          filter: { activeTools: [TOOL], roles: ["GM"] },
        },
      ],
      cursors: [{ cursor: "crosshair" }],
      onToolClick: async (_, event) => {
        if (busy) return;
        busy = true;
        const e = epoch;
        try {
          if ((await OBR.player.getRole()) !== "GM") return;
          const scene = await sceneId();
          await OBR.tool.activateMode(TOOL, VIEW);
          if (scene && e === epoch)
            await openEditor(
              scene,
              undefined,
              event.pointerPosition.x,
              event.pointerPosition.y,
            );
        } catch (error) {
          await report(error);
        } finally {
          busy = false;
        }
      },
    });
    const stopScene = OBR.scene.onReadyChange(() => {
      void identity().catch(report);
    });
    lastRole = await OBR.player.getRole();
    const stopPlayer = OBR.player.onChange((player) => {
      if (player.role !== lastRole) {
        lastRole = player.role;
        void identity().catch(report);
      }
    });
    import.meta.hot?.dispose(() => {
      stopScene();
      stopPlayer();
      void OBR.tool.removeMode(PLACE).catch(() => {});
      void OBR.tool.removeMode(VIEW).catch(() => {});
      void OBR.tool.remove(TOOL).catch(() => {});
    });
    await identity();
  } catch (error) {
    await report(error);
  }
});
