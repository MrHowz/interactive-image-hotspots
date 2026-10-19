import { buildPath, type Path } from "@owlbear-rodeo/sdk";
import {
  OBR,
  icon,
  toolIcon,
  guard,
  openEditor,
  openViewer,
  sceneId,
} from "./sdk";
import {
  SCENE_KEY,
  TOOL,
  VIEW,
  PLACE,
  DONE,
  CANCEL,
  MAX_CELLS,
  hotspots,
  hit,
  connected,
  regionCommands,
  selectionData,
  toggleCell,
  type Selection,
  type Cell,
} from "./model";
let busy = false,
  epoch = 0,
  lastRole: string | undefined,
  previewId: string | undefined;
async function report(error: unknown) {
  try {
    await OBR.notification.show(
      error instanceof Error ? error.message : "Hotspot operation failed.",
      "ERROR",
    );
  } catch {
    /* Disconnected hosts cannot show notifications. */
  }
}
async function identity() {
  const e = ++epoch;
  if (!(await OBR.scene.isReady())) return;
  const id = await sceneId();
  if (!id && (await OBR.player.getRole()) === "GM" && e === epoch)
    await OBR.scene.setMetadata({ [SCENE_KEY]: crypto.randomUUID() });
}
async function clearPreview() {
  const id = previewId;
  previewId = undefined;
  if (id && (await OBR.scene.isReady()))
    await OBR.scene.local.deleteItems([id]);
}
async function preview(selection: Selection) {
  if (!selection.cells.length) {
    await clearPreview();
    return;
  }
  const shape = buildPath()
    .commands(regionCommands(selection))
    .position({ x: selection.x!, y: selection.y! })
    .fillColor("#b6edcf")
    .fillOpacity(0.25)
    .strokeColor("#b6edcf")
    .strokeWidth(3)
    .layer("POINTER")
    .locked(true)
    .disableHit(true)
    .build();
  if (previewId) {
    await OBR.scene.local.updateItems<Path>(
      (i): i is Path => i.id === previewId,
      (items) => {
        for (const item of items) {
          item.commands = shape.commands;
          item.position = shape.position;
        }
      },
    );
  } else {
    previewId = shape.id;
    await OBR.scene.local.addItems([shape]);
  }
}
async function getSelection() {
  const selection = selectionData(
    (await OBR.tool.getMetadata(TOOL))?.selection,
  );
  if (!selection)
    throw new Error("Select cells from the Hotspots panel to start.");
  await guard(selection.scene);
  if (
    (await OBR.scene.grid.getType()) !== "SQUARE" ||
    (await OBR.scene.grid.getDpi()) !== selection.cellSize
  )
    throw new Error(
      "The scene grid changed. Cancel and start cell selection again.",
    );
  return selection;
}
async function work(action: () => Promise<void>) {
  if (busy) return;
  busy = true;
  try {
    await action();
  } catch (e) {
    await report(e);
  } finally {
    busy = false;
  }
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
        await work(async () => {
          const e = epoch,
            scene = await sceneId();
          const item = hit(
            hotspots(await OBR.scene.items.getItems()),
            event.pointerPosition,
            (await OBR.player.getRole()) === "GM",
          );
          if (item && scene && e === epoch) await openViewer(item.id, scene);
        });
      },
    });
    await OBR.tool.createMode({
      id: PLACE,
      icons: [
        {
          icon: toolIcon("cells.svg"),
          label: "Select cells",
          filter: { activeTools: [TOOL], roles: ["GM"] },
        },
      ],
      cursors: [{ cursor: "crosshair" }],
      onActivate: () => {
        void work(async () => {
          let s = selectionData((await OBR.tool.getMetadata(TOOL))?.selection);
          const scene = await sceneId();
          if (!scene) throw new Error("Wait for a scene and GM connection.");
          await guard(scene);
          if (!s || s.scene !== scene) {
            const cellSize = await OBR.scene.grid.getDpi();
            if ((await OBR.scene.grid.getType()) !== "SQUARE")
              throw new Error("Cell selection requires a square scene grid.");
            s = { scene, cellSize, cells: [] };
            await OBR.tool.setMetadata(TOOL, { selection: s });
          }
          await clearPreview();
          await preview(s);
        });
      },
      onDeactivate: () => {
        void clearPreview().catch(report);
      },
      onKeyDown: (_, event) => {
        if (event.key === "Escape")
          void work(async () => {
            await OBR.tool.setMetadata(TOOL, { selection: null });
            await OBR.tool.activateMode(TOOL, VIEW);
          });
      },
      onToolClick: async (_, event) => {
        await work(async () => {
          const e = epoch,
            s = await getSelection();
          if (s.x === undefined) {
            const center = await OBR.scene.grid.snapPosition(
              event.pointerPosition,
              1,
              false,
              true,
            );
            s.x = center.x - s.cellSize / 2;
            s.y = center.y - s.cellSize / 2;
          }
          const cell: Cell = [
            Math.floor((event.pointerPosition.x - s.x) / s.cellSize),
            Math.floor((event.pointerPosition.y - s.y!) / s.cellSize),
          ];
          const cells = toggleCell(s.cells, cell);
          if (cells.length > MAX_CELLS)
            throw new Error(`Choose at most ${MAX_CELLS} cells per image.`);
          if (e !== epoch) return;
          s.cells = cells;
          await OBR.tool.setMetadata(TOOL, { selection: s });
          if (e === epoch) await preview(s);
        });
      },
    });
    const filter = {
      activeTools: [TOOL],
      activeModes: [PLACE],
      roles: ["GM"] as ("GM" | "PLAYER")[],
    };
    await OBR.tool.createAction({
      id: DONE,
      icons: [
        { icon: toolIcon("check.svg"), label: "Done · choose image", filter },
      ],
      onClick: () => {
        void work(async () => {
          const e = epoch,
            s = await getSelection();
          if (!s.cells.length || !connected(s.cells))
            throw new Error(
              "Select at least one cell. All cells must connect along an edge.",
            );
          await OBR.tool.activateMode(TOOL, VIEW);
          await clearPreview();
          await OBR.tool.setMetadata(TOOL, { selection: null });
          if (e === epoch) await openEditor(s.scene, s.id, s.x!, s.y!, s);
        });
      },
    });
    await OBR.tool.createAction({
      id: CANCEL,
      icons: [
        {
          icon: toolIcon("cancel.svg"),
          label: "Cancel cell selection",
          filter,
        },
      ],
      onClick: () => {
        void work(async () => {
          await OBR.tool.setMetadata(TOOL, { selection: null });
          await OBR.tool.activateMode(TOOL, VIEW);
          await clearPreview();
        });
      },
    });
    const stopScene = OBR.scene.onReadyChange(() => {
      previewId = undefined;
      void identity().catch(report);
      void OBR.tool.setMetadata(TOOL, { selection: null }).catch(report);
    });
    lastRole = await OBR.player.getRole();
    const stopPlayer = OBR.player.onChange((p) => {
      if (p.role !== lastRole) {
        lastRole = p.role;
        void identity().catch(report);
        if (p.role !== "GM") void clearPreview().catch(report);
      }
    });
    import.meta.hot?.dispose(() => {
      stopScene();
      stopPlayer();
      void clearPreview().catch(() => {});
      for (const id of [DONE, CANCEL])
        void OBR.tool.removeAction(id).catch(() => {});
      for (const id of [PLACE, VIEW])
        void OBR.tool.removeMode(id).catch(() => {});
      void OBR.tool.remove(TOOL).catch(() => {});
    });
    await identity();
  } catch (e) {
    await report(e);
  }
});
