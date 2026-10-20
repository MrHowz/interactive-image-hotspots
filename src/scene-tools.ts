import { type Item, type Path, type Vector2 } from "@owlbear-rodeo/sdk";
import {
  OBR,
  icon,
  guard,
  sceneId,
  areaItem,
  openAreaEditor,
  openViewer,
} from "./sdk";
import {
  NS,
  SCENE_KEY,
  TOOL,
  VIEW,
  DONE,
  CANCEL,
  data,
  allowed,
  hit,
  hotspots,
} from "./model";
import {
  areaCommands,
  shapeArea,
  cellArea,
  kinds,
  type AreaDraft,
} from "./areas";
import { CHANNEL, modeId, type ToolStatus } from "./tool-state";
const PREVIEW = `${NS}/local-preview`,
  OUTLINE = `${NS}/outline/`;
export function installTools() {
  let revision = 0;
  let live = true,
    scene = "",
    gm = false,
    epoch = 0,
    mode = "",
    items: Item[] = [],
    connection = "";
  let start: Vector2 | undefined,
    points: Vector2[] = [],
    centers: Vector2[] = [],
    size = 100,
    pending: AreaDraft | undefined;
  let previewTimer: ReturnType<typeof setTimeout> | undefined,
    outlineTimer: ReturnType<typeof setTimeout> | undefined;
  let previewTail = Promise.resolve(),
    outlineTail = Promise.resolve(),
    gridTail = Promise.resolve(),
    lastOpened = 0;
  let opening = false,
    previewExists = false;
  const stops: (() => void)[] = [];
  const report = (error: unknown) => {
    if (live)
      void OBR.notification.show(
        error instanceof Error ? error.message : "Unable to use image tools.",
        "ERROR",
      );
  };
  const status = (message = "") => {
    const state: ToolStatus = { mode, count: centers.length, message };
    return OBR.broadcast.sendMessage(
      CHANNEL,
      { state },
      { destination: "LOCAL" },
    );
  };
  function preview() {
    if (previewTimer) return;
    previewTimer = setTimeout(() => {
      previewTimer = undefined;
      previewTail = previewTail
        .then(async () => {
          if (!live) return;
          if (!pending) {
            if (previewExists) await OBR.scene.local.deleteItems([PREVIEW]);
            previewExists = false;
            return;
          }
          const p = areaItem(pending);
          const item = {
            ...p,
            id: PREVIEW,
            layer: "POINTER" as const,
            style: {
              ...p.style,
              fillColor: "#b6edcf",
              fillOpacity: 0.18,
              strokeColor: "#b6edcf",
              strokeOpacity: 1,
              strokeWidth: 2,
            },
          };
          if (previewExists)
            await OBR.scene.local.updateItems([PREVIEW], (drafts) => {
              for (const d of drafts) Object.assign(d, item);
            });
          else {
            await OBR.scene.local.addItems([item]);
            previewExists = true;
          }
        })
        .catch(report);
    }, 70);
  }
  function clear() {
    revision++;
    start = undefined;
    points = [];
    centers = [];
    pending = undefined;
    preview();
    void status();
  }
  function outlines() {
    if (outlineTimer) return;
    outlineTimer = setTimeout(() => {
      outlineTimer = undefined;
      outlineTail = outlineTail
        .then(async () => {
          if (!live) return;
          const renderEpoch = epoch;
          const desired = items.flatMap((i) => {
            const d = data(i);
            if (
              d?.version !== 4 ||
              !i.visible ||
              !(gm ? d.gmMarks : d.playerMarks) ||
              !allowed(i, gm)
            )
              return [];
            const p = i as Path;
            return [
              {
                ...p,
                id: OUTLINE + i.id,
                metadata: {},
                layer: "POINTER" as const,
                disableHit: true,
                locked: true,
                commands: areaCommands(d.area),
                style: {
                  ...p.style,
                  fillColor: "#b6edcf",
                  fillOpacity: 0.07,
                  strokeColor: "#83d9b0",
                  strokeOpacity: 0.85,
                  strokeWidth: 2,
                  strokeDash: d.enabled ? [] : [6, 6],
                },
              },
            ];
          });
          const existing = await OBR.scene.local.getItems((i) =>
            i.id.startsWith(OUTLINE),
          );
          if (!live || renderEpoch !== epoch) return;
          const remove = existing.filter(
            (i) => !desired.some((d) => d.id === i.id),
          );
          if (remove.length)
            await OBR.scene.local.deleteItems(remove.map((i) => i.id));
          const add = desired.filter(
            (i) => !existing.some((d) => d.id === i.id),
          );
          if (add.length) await OBR.scene.local.addItems(add);
          const updates = desired.filter((i) =>
            existing.some(
              (e) => e.id === i.id && JSON.stringify(e) !== JSON.stringify(i),
            ),
          );
          if (updates.length)
            await OBR.scene.local.updateItems(
              updates.map((i) => i.id),
              (drafts) => {
                for (const d of drafts) {
                  const next = updates.find((i) => i.id === d.id);
                  if (next) Object.assign(d, next);
                }
              },
            );
        })
        .catch(report);
    }, 100);
  }
  async function refresh() {
    const e = ++epoch;
    clear();
    scene = "";
    items = [];
    outlines();
    const ready = await OBR.scene.isReady();
    const role = await OBR.player.getRole();
    if (!live || e !== epoch) return;
    gm = role === "GM";
    if (!ready) return;
    const [id, snapshot] = await Promise.all([
      sceneId(),
      OBR.scene.items.getItems(),
    ]);
    if (!live || e !== epoch) return;
    scene = id ?? "";
    items = snapshot;
    outlines();
  }
  function drawingAllowed() {
    if (!gm || !scene) {
      report(new Error("Open a scene as GM to draw an image area."));
      return false;
    }
    return true;
  }
  async function finish() {
    if (opening) return;
    const draft = pending,
      currentScene = scene,
      currentRevision = revision;
    if (!draft) {
      report(new Error("Draw an area or select at least one grid cell first."));
      return;
    }
    opening = true;
    try {
      await guard(currentScene);
      if (currentRevision !== revision) return;
      await openAreaEditor(currentScene, draft);
      clear();
      await OBR.tool.activateMode(TOOL, VIEW);
    } finally {
      opening = false;
    }
  }
  async function explore(target: Item | undefined, position: Vector2) {
    if (opening || Date.now() - lastOpened < 500 || !scene) return;
    opening = true;
    try {
      const currentScene = scene;
      const snapshot = await OBR.scene.items.getItems();
      const role = await OBR.player.getRole();
      if (currentScene !== scene) return;
      const linked =
        target &&
        snapshot.find(
          (i) =>
            i.id === target.id &&
            data(i) &&
            allowed(i, role === "GM") &&
            data(i)!.enabled,
        );
      const item = linked || hit(hotspots(snapshot), position, role === "GM");
      if (item) {
        lastOpened = Date.now();
        await openViewer(item.id, currentScene);
      }
    } finally {
      opening = false;
    }
  }
  async function gridClick(
    p: Vector2,
    expectedEpoch: number,
    expectedRevision: number,
  ) {
    if (
      expectedRevision !== revision ||
      expectedEpoch !== epoch ||
      mode !== modeId("cells")
    )
      return;
    const e = epoch,
      currentMode = mode;
    if (!drawingAllowed()) return;
    if ((await OBR.scene.grid.getType()) !== "SQUARE")
      throw new Error(
        "Cell selection requires a square grid. Use shapes or freehand on other grids.",
      );
    const dpi = await OBR.scene.grid.getDpi();
    const snapped = await OBR.scene.grid.snapPosition(p, 1, false, true);
    if (expectedRevision !== revision || e !== epoch || mode !== currentMode)
      return;
    if (centers.length && size !== dpi) {
      clear();
      throw new Error("Grid size changed. Select the cells again.");
    }
    size = dpi;
    const index = centers.findIndex(
      (c) =>
        Math.abs(c.x - snapped.x) < 0.01 && Math.abs(c.y - snapped.y) < 0.01,
    );
    if (index >= 0) centers.splice(index, 1);
    else {
      if (centers.length >= 256)
        throw new Error("Choose at most 256 cells per image.");
      centers.push(snapped);
    }
    pending = centers.length ? cellArea(centers, size) : undefined;
    preview();
    await status();
  }
  async function register() {
    connection = await OBR.player.getConnectionId();
    await OBR.tool.create({
      id: TOOL,
      icons: [{ icon, label: "Image areas" }],
      defaultMode: VIEW,
    });
    await OBR.tool.createMode({
      id: VIEW,
      icons: [
        {
          icon,
          label: "Explore · click to open image",
          filter: { activeTools: [TOOL] },
        },
      ],
      preventDrag: {},
      onToolClick: (_, e) => {
        void explore(e.target, e.pointerPosition).catch(report);
      },
      onActivate: () => {
        mode = VIEW;
        clear();
      },
      onKeyDown: (_, e) => {
        if (e.key === "Escape") clear();
      },
    });
    for (const kind of kinds) {
      await OBR.tool.createMode({
        id: modeId(kind),
        icons: [
          {
            icon: new URL(`${kind}.svg`, icon).href,
            label:
              kind === "freehand"
                ? "Freehand area"
                : kind === "cells"
                  ? "Select cells"
                  : kind,
            filter: { activeTools: [TOOL], roles: ["GM"] },
          },
        ],
        disabled: { roles: ["PLAYER"] },
        cursors: [{ cursor: "crosshair" }],
        onActivate: () => {
          mode = modeId(kind);
          clear();
          void status();
        },
        onDeactivate: () => clear(),
        onToolClick: (_, e) => {
          mode = modeId(kind);
          if (kind === "cells") {
            const eventEpoch = epoch,
              eventRevision = revision;
            gridTail = gridTail
              .then(() =>
                gridClick(e.pointerPosition, eventEpoch, eventRevision),
              )
              .catch(report);
            return;
          }
          if (kind === "point" && drawingAllowed()) {
            pending = shapeArea(kind, e.pointerPosition, e.pointerPosition);
            void finish().catch(report);
          }
        },
        onToolDragStart: (_, e) => {
          if (kind === "cells" || kind === "point" || !drawingAllowed()) return;
          mode = modeId(kind);
          start = e.pointerPosition;
          points = [e.pointerPosition];
        },
        onToolDragMove: (_, e) => {
          if (!start) return;
          try {
            if (kind === "freehand") {
              const last = points.at(-1)!;
              if (
                Math.hypot(
                  e.pointerPosition.x - last.x,
                  e.pointerPosition.y - last.y,
                ) > 4
              ) {
                if (points.length >= 255)
                  points = points.filter((_, i) => i % 2 === 0);
                points.push(e.pointerPosition);
              }
            }
            pending = shapeArea(kind, start, e.pointerPosition, points);
            preview();
          } catch {
            /* A partial stroke can be too small; validate it when released. */
          }
        },
        onToolDragEnd: (_, e) => {
          if (!start) return;
          try {
            if (kind === "freehand" && points.length < 256)
              points.push(e.pointerPosition);
            pending = shapeArea(kind, start, e.pointerPosition, points);
            start = undefined;
            void finish().catch(report);
          } catch (err) {
            clear();
            report(err);
          }
        },
        onToolDragCancel: () => clear(),
        onKeyDown: (_, e) => {
          if (e.key === "Escape") clear();
          if (e.key === "Enter" && kind === "cells")
            void gridTail.then(finish).catch(report);
        },
      });
    }
    await OBR.tool.createAction({
      id: DONE,
      icons: [
        {
          icon: new URL("check.svg", icon).href,
          label: "Done · choose image",
          filter: {
            activeTools: [TOOL],
            activeModes: [modeId("cells")],
            roles: ["GM"],
          },
        },
      ],
      onClick: () => void gridTail.then(finish).catch(report),
    });
    await OBR.tool.createAction({
      id: CANCEL,
      icons: [
        {
          icon: new URL("cancel.svg", icon).href,
          label: "Cancel drawing",
          filter: { activeTools: [TOOL], roles: ["GM"] },
        },
      ],
      onClick: () => clear(),
    });
    if (!live) return;
    stops.push(
      OBR.scene.onReadyChange(() => void refresh().catch(report)),
      OBR.scene.items.onChange((snapshot) => {
        items = snapshot;
        outlines();
      }),
      OBR.scene.onMetadataChange((m) => {
        if (m[SCENE_KEY] !== scene) void refresh().catch(report);
      }),
      OBR.player.onChange((p) => {
        const next = p.role === "GM";
        if (next !== gm) {
          gm = next;
          clear();
          outlines();
        }
      }),
      OBR.tool.onToolModeChange((next) => {
        mode = next ?? "";
        clear();
      }),
      OBR.broadcast.onMessage(CHANNEL, (e) => {
        if (e.connectionId !== connection) return;
        const d = e.data as { action?: string };
        if (d.action === "status") void status();
        if (d.action === "cancel") clear();
        if (d.action === "finish" && gm)
          void gridTail.then(finish).catch(report);
      }),
    );
    await refresh();
    await status();
  }
  void register().catch(report);
  return () => {
    live = false;
    epoch++;
    stops.forEach((s) => s());
    clearTimeout(previewTimer);
    clearTimeout(outlineTimer);
    void OBR.scene.local
      .getItems((i) => i.id === PREVIEW || i.id.startsWith(OUTLINE))
      .then((items) => OBR.scene.local.deleteItems(items.map((i) => i.id)))
      .catch(() => {});
    void OBR.tool.remove(TOOL);
    for (const id of [VIEW, ...kinds.map(modeId)]) void OBR.tool.removeMode(id);
    void OBR.tool.removeAction(DONE);
    void OBR.tool.removeAction(CANCEL);
  };
}
