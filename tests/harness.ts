// Development-only host emulator. This file is not an input to the production build.
import type { Item, Metadata, Shape } from "@owlbear-rodeo/sdk";
import {
  NS,
  SCENE_KEY,
  TOOL,
  VIEW,
  PLACE,
  DONE,
  CANCEL,
  data as hotspotData,
  hit,
  hotspots,
  selectionData,
} from "../src/model";
const panel = document.querySelector<HTMLIFrameElement>("#panel")!;
const modal = document.querySelector<HTMLIFrameElement>("#modal")!;
const background = document.createElement("iframe");
background.id = "background";
background.title = "Hotspot background";
document.body.append(background);
const frames = [panel, modal, background];
let toolMetadata: Record<string, unknown> = {},
  activeMode = VIEW,
  localItems: Item[] = [],
  sharedWrites = 0;
const context = () => ({
  activeTool: TOOL,
  activeMode,
  metadata: toolMetadata,
});
const map = document.createElement("section");
map.setAttribute("aria-label", "Simulated map");
map.style.cssText =
  "position:absolute;left:470px;top:90px;padding:20px;background:#152126;border-radius:10px";
map.innerHTML =
  '<h2>Simulated square map · 100 px cells</h2><p>Choose Select cells in the extension, click squares, then Done.</p><div id="map-cells" style="display:grid;grid-template-columns:repeat(6,64px);gap:3px"></div><p id="map-status"></p><p id="message" role="status"></p>';
document.body.append(map);
for (const [label, action] of [
  ["Done cells", DONE],
  ["Cancel cells", CANCEL],
]) {
  const button = document.createElement("button");
  button.textContent = label;
  button.addEventListener("click", () =>
    event("OBR_TOOL_ACTION_EVENT_CLICK", { id: action, context: context() }),
  );
  document.querySelector("nav")!.append(button);
}
for (let y = 0; y < 4; y++)
  for (let x = 0; x < 6; x++) {
    const button = document.createElement("button");
    button.textContent = `${x}, ${y}`;
    button.setAttribute("aria-label", `Map cell ${x}, ${y}`);
    button.dataset.x = String(x);
    button.dataset.y = String(y);
    button.style.height = "64px";
    button.addEventListener("click", () =>
      event("OBR_TOOL_MODE_EVENT_TOOL_CLICK", {
        id: activeMode,
        context: context(),
        event: {
          pointerPosition: { x: x * 100 + 50, y: y * 100 + 50 },
          altKey: false,
          shiftKey: false,
          ctrlKey: false,
          metaKey: false,
        },
      }),
    );
    document.querySelector("#map-cells")!.append(button);
  }
let role = "GM",
  scene = "test-a",
  mode = "DARK";
const seed = {
  id: "sample",
  createdUserId: "gm-test",
  lastModified: "2026-10-20",
  lastModifiedUserId: "gm-test",
  type: "SHAPE",
  shapeType: "CIRCLE",
  name: "The hidden garden",
  width: 80,
  height: 80,
  position: { x: 320, y: 240 },
  rotation: 0,
  scale: { x: 1, y: 1 },
  visible: true,
  locked: true,
  layer: "MAP",
  zIndex: 1,
  style: {
    fillColor: "#7dd3fc",
    fillOpacity: 0.14,
    strokeColor: "#38bdf8",
    strokeOpacity: 1,
    strokeWidth: 3,
    strokeDash: [],
  },
  metadata: {
    [NS]: {
      version: 1,
      url: "https://placehold.co/1200x800/png",
      enabled: true,
      players: true,
    },
  },
} as Shape;
const scenes: Record<string, { items: Item[]; metadata: Metadata }> =
  JSON.parse(localStorage.getItem("hotspot-test-harness") || "null") || {
    "test-a": { items: [seed], metadata: { [SCENE_KEY]: "test-a" } },
    "test-b": { items: [], metadata: { [SCENE_KEY]: "test-b" } },
  };
const current = () => scenes[scene];
function persist() {
  localStorage.setItem("hotspot-test-harness", JSON.stringify(scenes));
}
function url(view: string, extra: Record<string, string> = {}) {
  return `/index.html?${new URLSearchParams({ view, scene, obrref: btoa(`${location.origin} test-room`), ...extra })}`;
}
function ready(frame: HTMLIFrameElement) {
  frame.onload = () =>
    frame.contentWindow?.postMessage(
      { id: "OBR_READY", data: { ref: "test", userId: "gm-test" } },
      location.origin,
    );
}
frames.forEach(ready);
panel.src = url("");
background.src = `/background.html?obrref=${encodeURIComponent(btoa(`${location.origin} test-room`))}`;
function event(id: string, data: unknown) {
  for (const frame of frames)
    frame.contentWindow?.postMessage({ id, data }, location.origin);
}
function status() {
  document.querySelector("#status")!.textContent =
    `${role} · ${scene} · ${current().items.length} items`;
  const s = selectionData(toolMetadata.selection);
  document.querySelector("#map-status")!.textContent =
    `${activeMode === PLACE ? "Selecting" : "Explore"} · ${s?.cells.length ?? 0} selected · ${localItems.length} local previews · ${sharedWrites} shared writes`;
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "#map-cells button",
  )) {
    const x = Number(button.dataset.x) * 100 + 50,
      y = Number(button.dataset.y) * 100 + 50;
    const selected =
      activeMode === PLACE &&
      s?.x !== undefined &&
      s.cells.some(
        (c) =>
          Math.floor((x - s.x!) / s.cellSize) === c[0] &&
          Math.floor((y - s.y!) / s.cellSize) === c[1],
      );
    const item = hit(hotspots(current().items), { x, y }, true),
      d = item ? hotspotData(item) : undefined;
    button.style.background = selected
      ? "#b6edcf"
      : d?.marks !== false && d
        ? "#7dd3fc"
        : "#344851";
    button.style.color =
      selected || (d?.marks !== false && d) ? "#102020" : "white";
  }
}
window.addEventListener("message", (e) => {
  if (
    e.origin !== location.origin ||
    !frames.map((f) => f.contentWindow).includes(e.source as Window)
  )
    return;
  const { id, data, nonce } = e.data;
  if (!nonce) return;
  let response: unknown = {};
  switch (id) {
    case "OBR_TOOL_SET_METADATA":
      toolMetadata = { ...toolMetadata, ...data.update };
      break;
    case "OBR_TOOL_GET_METADATA":
      response = { metadata: toolMetadata };
      break;
    case "OBR_TOOL_MODE_ACTIVATE":
      event("OBR_TOOL_MODE_EVENT_DEACTIVATE", {
        id: activeMode,
        context: context(),
      });
      activeMode = data.modeId;
      event("OBR_TOOL_MODE_EVENT_ACTIVATE", {
        id: activeMode,
        context: context(),
      });
      event("OBR_TOOL_MODE_ACTIVE_EVENT_CHANGE", { id: activeMode });
      break;
    case "OBR_TOOL_MODE_GET_ACTIVE":
      response = { id: activeMode };
      break;
    case "OBR_SCENE_GRID_GET_DPI":
      response = { dpi: 100 };
      break;
    case "OBR_SCENE_GRID_GET_TYPE":
      response = { type: "SQUARE" };
      break;
    case "OBR_SCENE_GRID_SNAP_POSITION":
      response = {
        position: {
          x: Math.floor(data.position.x / 100) * 100 + 50,
          y: Math.floor(data.position.y / 100) * 100 + 50,
        },
      };
      break;
    case "OBR_SCENE_LOCAL_GET_ALL_ITEMS":
      response = { items: localItems };
      break;
    case "OBR_SCENE_LOCAL_ADD_ITEMS":
      localItems.push(...data.items);
      break;
    case "OBR_SCENE_LOCAL_UPDATE_ITEMS":
      for (const update of data.updates) {
        const i = localItems.find((i) => i.id === update.id);
        if (i) Object.assign(i, update);
      }
      break;
    case "OBR_SCENE_LOCAL_DELETE_ITEMS":
      localItems = localItems.filter((i) => !data.ids.includes(i.id));
      break;
    case "OBR_NOTIFICATION_SHOW":
      document.querySelector("#message")!.textContent = data.message;
      response = { id: "notice" };
      break;
    case "OBR_SCENE_IS_READY":
      response = { ready: true };
      break;
    case "OBR_PLAYER_GET_ROLE":
      response = { role };
      break;
    case "OBR_THEME_GET_THEME":
      response = { theme: { mode } };
      break;
    case "OBR_SCENE_GET_METADATA":
      response = { metadata: current().metadata };
      break;
    case "OBR_SCENE_ITEMS_GET_ALL_ITEMS":
      response = { items: current().items };
      break;
    case "OBR_SCENE_ITEMS_GET_ITEMS":
      response = {
        items: current().items.filter((i) => data.ids.includes(i.id)),
      };
      break;
    case "OBR_SCENE_ITEMS_ADD_ITEMS":
      sharedWrites++;
      current().items.push(...data.items);
      persist();
      event("OBR_SCENE_ITEMS_EVENT_CHANGE", { items: current().items });
      break;
    case "OBR_SCENE_ITEMS_UPDATE_ITEMS":
      sharedWrites++;
      for (const update of data.updates) {
        const item = current().items.find((i) => i.id === update.id);
        if (item) Object.assign(item, update);
      }
      persist();
      event("OBR_SCENE_ITEMS_EVENT_CHANGE", { items: current().items });
      break;
    case "OBR_SCENE_ITEMS_DELETE_ITEMS":
      sharedWrites++;
      current().items = current().items.filter((i) => !data.ids.includes(i.id));
      persist();
      event("OBR_SCENE_ITEMS_EVENT_CHANGE", { items: current().items });
      break;
    case "OBR_MODAL_OPEN":
      modal.hidden = false;
      modal.src =
        new URL(data.url).pathname +
        new URL(data.url).search +
        `&obrref=${encodeURIComponent(btoa(`${location.origin} test-room`))}`;
      break;
    case "OBR_MODAL_CLOSE":
      modal.hidden = true;
      modal.src = "about:blank";
      break;
  }
  (e.source as Window)?.postMessage(
    { id: `${id}_RESPONSE${nonce}`, data: response },
    location.origin,
  );
  status();
});
document.querySelector("#create")!.addEventListener("click", () => {
  modal.hidden = false;
  modal.src = url("editor", { x: "320", y: "240" });
});
document.querySelector("#role")!.addEventListener("click", () => {
  role = role === "GM" ? "PLAYER" : "GM";
  event("OBR_PLAYER_EVENT_CHANGE", { player: { role } });
  status();
});
document.querySelector("#scene")!.addEventListener("click", () => {
  scene = scene === "test-a" ? "test-b" : "test-a";
  localItems = [];
  event("OBR_SCENE_EVENT_READY_CHANGE", { ready: false });
  event("OBR_SCENE_EVENT_READY_CHANGE", { ready: true });
  status();
});
document.querySelector("#theme")!.addEventListener("click", () => {
  mode = mode === "DARK" ? "LIGHT" : "DARK";
  event("OBR_THEME_EVENT_CHANGE", { theme: { mode } });
});
status();
