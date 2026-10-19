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
import {
  CONTROL,
  type ControlRequest,
  type ControlState,
} from "./controlProtocol";
let epoch = 0,
  lastRole: string | undefined,
  previewId: string | undefined,
  selection: Selection | undefined,
  selecting = false;
let tail: Promise<unknown> = Promise.resolve();
function enqueue<T>(action: () => Promise<T>): Promise<T> {
  const task = tail.then(action);
  tail = task.catch(() => {});
  return task;
}
async function report(error: unknown) {
  try {
    await OBR.notification.show(
      error instanceof Error ? error.message : "Hotspot operation failed.",
      "ERROR",
    );
  } catch {
    /* A disconnected host cannot display notifications. */
  }
}
const state = (): ControlState => ({
  active: selecting,
  count: selection?.cells.length ?? 0,
  ...(selection ? { scene: selection.scene } : {}),
});
const send = (data: unknown) =>
  OBR.broadcast.sendMessage(CONTROL, data, { destination: "LOCAL" });
async function publish() {
  await send({ kind: "state", state: state() });
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
async function preview(s: Selection) {
  if (!s.cells.length) {
    await clearPreview();
    return;
  }
  const shape = buildPath()
    .commands(regionCommands(s))
    .position({ x: s.x!, y: s.y! })
    .fillColor("#b6edcf")
    .fillOpacity(0.25)
    .strokeColor("#b6edcf")
    .strokeWidth(3)
    .layer("POINTER")
    .locked(true)
    .disableHit(true)
    .build();
  if (previewId)
    await OBR.scene.local.updateItems<Path>(
      (i): i is Path => i.id === previewId,
      (items) => {
        for (const item of items) {
          item.commands = shape.commands;
          item.position = shape.position;
        }
      },
    );
  else {
    previewId = shape.id;
    await OBR.scene.local.addItems([shape]);
  }
}
async function ensureSelection() {
  const scene = await sceneId();
  if (!scene) throw new Error("Wait for a scene and GM connection.");
  await guard(scene);
  const [type, dpi] = await Promise.all([
    OBR.scene.grid.getType(),
    OBR.scene.grid.getDpi(),
  ]);
  if (type !== "SQUARE")
    throw new Error("Cell selection requires a square scene grid.");
  if (!Number.isFinite(dpi) || dpi < 12 || dpi > 2000)
    throw new Error("Use a grid size between 12 and 2000 pixels.");
  if (!selection || selection.scene !== scene)
    selection = { scene, cellSize: dpi, cells: [] };
  if (selection.cellSize !== dpi)
    throw new Error(
      "The scene grid changed. Cancel and start cell selection again.",
    );
  return selection;
}
async function start(s: Selection) {
  const e = epoch;
  await guard(s.scene);
  const [type, dpi] = await Promise.all([
    OBR.scene.grid.getType(),
    OBR.scene.grid.getDpi(),
  ]);
  if (type !== "SQUARE" || dpi !== s.cellSize)
    throw new Error("The scene grid changed. Start selection again.");
  if (e !== epoch) throw new Error("The scene changed. Start selection again.");
  await clearPreview();
  selection = structuredClone(s);
  selecting = true;
  await OBR.tool.activateMode(TOOL, PLACE);
  if (e !== epoch) throw new Error("The scene changed. Start selection again.");
  selecting = true;
  await preview(selection);
  await publish();
}
async function leave() {
  selection = undefined;
  selecting = false;
  await clearPreview();
  await OBR.tool.activateMode(TOOL, VIEW);
  await publish();
}
async function finish() {
  const e = epoch,
    s = await ensureSelection();
  if (!s.cells.length || !connected(s.cells))
    throw new Error(
      "Select at least one cell. All cells must connect along an edge.",
    );
  const copy = structuredClone(s);
  await leave();
  if (e !== epoch) throw new Error("The scene changed. Start selection again.");
  await openEditor(copy.scene, copy.id, copy.x!, copy.y!, copy);
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
        const e = epoch;
        await enqueue(async () => {
          if (e !== epoch) return;
          const scene = await sceneId();
          const item = hit(
            hotspots(await OBR.scene.items.getItems()),
            event.pointerPosition,
            (await OBR.player.getRole()) === "GM",
          );
          if (item && scene && e === epoch) await openViewer(item.id, scene);
        }).catch(report);
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
        const e = epoch;
        void enqueue(async () => {
          if (e !== epoch) return;
          const s = await ensureSelection();
          selecting = true;
          await preview(s);
          await publish();
        }).catch(report);
      },
      onDeactivate: () => {
        selecting = false;
        void enqueue(async () => {
          await clearPreview();
          await publish();
        }).catch(report);
      },
      onKeyDown: (_, event) => {
        if (event.key === "Escape") void enqueue(leave).catch(report);
      },
      onToolClick: async (_, event) => {
        const e = epoch;
        await enqueue(async () => {
          if (e !== epoch) return;
          // Initialization also happens here: a host need not deliver onActivate
          // before the first click, and no cross-frame Tool Metadata is required.
          const s = await ensureSelection();
          selecting = true;
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
          if (cell.some((n) => !Number.isSafeInteger(n) || Math.abs(n) > 10000))
            throw new Error(
              "Choose cells closer to this selection, or start a new region.",
            );
          const cells = toggleCell(s.cells, cell);
          if (cells.length > MAX_CELLS)
            throw new Error(`Choose at most ${MAX_CELLS} cells per image.`);
          if (e !== epoch) return;
          s.cells = cells;
          await preview(s);
          if (e === epoch) await publish();
        }).catch(report);
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
        void enqueue(finish).catch(report);
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
        void enqueue(leave).catch(report);
      },
    });
    await identity();
    const ownConnection = await OBR.player.getConnectionId();
    const stopControl = OBR.broadcast.onMessage(CONTROL, (event) => {
      if (
        event.connectionId !== ownConnection ||
        !event.data ||
        typeof event.data !== "object"
      )
        return;
      const request = event.data as ControlRequest;
      if (request.kind !== "request" || typeof request.requestId !== "string")
        return;
      const acceptedEpoch = epoch;
      void enqueue(async () => {
        try {
          if (request.command !== "status" && acceptedEpoch !== epoch)
            throw new Error("The scene changed. Start selection again.");
          if (request.command === "start") {
            const s = selectionData(request.selection);
            if (!s) throw new Error("Invalid cell selection.");
            await start(s);
          } else if (request.command === "finish") {
            await finish();
          } else if (
            request.command === "cancel" ||
            request.command === "explore"
          ) {
            await leave();
          } else if (request.command !== "status")
            throw new Error("Unknown hotspot command.");
          await send({
            kind: "reply",
            requestId: request.requestId,
            ok: true,
            state: state(),
          });
        } catch (error) {
          await send({
            kind: "reply",
            requestId: request.requestId,
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Hotspot command failed.",
          });
        }
      }).catch(report);
    });
    const stopScene = OBR.scene.onReadyChange(() => {
      selection = undefined;
      selecting = false;
      previewId = undefined;
      void identity().catch(report);
      void publish().catch(report);
    });
    lastRole = await OBR.player.getRole();
    const stopPlayer = OBR.player.onChange((p) => {
      if (p.role !== lastRole) {
        lastRole = p.role;
        void identity().catch(report);
        if (p.role !== "GM") {
          selection = undefined;
          selecting = false;
          void enqueue(async () => {
            await clearPreview();
            await publish();
          }).catch(report);
        }
      }
    });
    import.meta.hot?.dispose(() => {
      stopControl();
      stopScene();
      stopPlayer();
      void clearPreview().catch(() => {});
      for (const id of [DONE, CANCEL])
        void OBR.tool.removeAction(id).catch(() => {});
      for (const id of [PLACE, VIEW])
        void OBR.tool.removeMode(id).catch(() => {});
      void OBR.tool.remove(TOOL).catch(() => {});
    });
  } catch (error) {
    await report(error);
  }
});
